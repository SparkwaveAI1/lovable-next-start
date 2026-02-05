import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { docCategories, getDocByPath, type DocCategory, type DocPage } from "@/docs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  BookOpen, 
  Rocket, 
  Zap, 
  FileText, 
  HelpCircle, 
  Wrench,
  ChevronRight,
  ChevronDown,
  Search,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// Icon mapping for categories
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Rocket,
  Zap,
  FileText,
  HelpCircle,
  Wrench,
};

// Markdown content loader - imports raw markdown files
const markdownModules = import.meta.glob('/src/docs/**/*.md', { query: '?raw', import: 'default', eager: true });

function getMarkdownContent(path: string): string {
  // Try different path variations
  const variations = [
    `/src/docs/${path}.md`,
    `/src/docs/${path}/index.md`,
  ];
  
  for (const variation of variations) {
    if (markdownModules[variation]) {
      return markdownModules[variation] as string;
    }
  }
  
  return `# Page Not Found\n\nThe documentation for "${path}" could not be found.`;
}

interface DocsSidebarProps {
  categories: DocCategory[];
  currentPath: string | undefined;
  onNavigate: (path: string) => void;
  collapsed?: boolean;
}

function DocsSidebar({ categories, currentPath, onNavigate, collapsed }: DocsSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map(c => c.id))
  );
  const [searchQuery, setSearchQuery] = useState("");

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Filter pages by search query
  const filteredCategories = categories.map(category => ({
    ...category,
    pages: category.pages.filter(page =>
      searchQuery === "" ||
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.pages.length > 0);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
      {/* Search */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white dark:bg-slate-800"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        {filteredCategories.map((category) => {
          const Icon = iconMap[category.icon] || FileText;
          const isExpanded = expandedCategories.has(category.id);

          return (
            <div key={category.id} className="mb-4">
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <Icon className="h-4 w-4 text-indigo-500" />
                <span className="flex-1 text-left">{category.title}</span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </button>

              {isExpanded && (
                <ul className="mt-1 ml-6 space-y-1">
                  {category.pages.map((page) => {
                    const isActive = currentPath === page.path;
                    return (
                      <li key={page.id}>
                        <button
                          onClick={() => onNavigate(page.path)}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors",
                            isActive
                              ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                          )}
                        >
                          {page.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

interface DocContentProps {
  docPage: DocPage | undefined;
  content: string;
}

function DocContent({ docPage, content }: DocContentProps) {
  return (
    <div className="max-w-4xl mx-auto">
      {docPage && (
        <div className="mb-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Last updated: {docPage.lastUpdated}
          </p>
        </div>
      )}
      
      <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 dark:prose-pre:bg-slate-950">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}

export default function Docs() {
  const { "*": docPath } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<string>("");
  
  // Default to first doc if no path specified
  const currentPath = docPath || "overview/what-is-sparkwave";
  const currentDoc = getDocByPath(currentPath);

  useEffect(() => {
    const markdown = getMarkdownContent(currentPath);
    setContent(markdown);
  }, [currentPath]);

  const handleNavigate = (path: string) => {
    navigate(`/docs/${path}`);
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 hidden lg:block">
          <DocsSidebar
            categories={docCategories}
            currentPath={currentPath}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <PageContent>
            {/* Mobile back button */}
            <div className="lg:hidden mb-4">
              <Link
                to="/docs"
                className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to docs
              </Link>
            </div>

            <DocContent docPage={currentDoc} content={content} />
          </PageContent>
        </div>
      </div>
    </DashboardLayout>
  );
}
