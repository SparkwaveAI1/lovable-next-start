import { ReactNode } from 'react';
import { BlogPostMeta } from '@/lib/blog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BlogLayoutProps {
  meta: BlogPostMeta;
  children: ReactNode;
}

export function BlogLayout({ meta, children }: BlogLayoutProps) {
  const formattedDate = new Date(meta.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link to="/blog">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Button>
        </Link>

        {/* Header */}
        <header className="mb-8">
          {meta.image && (
            <div className="aspect-video overflow-hidden rounded-lg mb-6">
              <img
                src={meta.image}
                alt={meta.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h1 className="text-4xl font-bold tracking-tight mb-4">{meta.title}</h1>
          <div className="flex items-center gap-4 text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {meta.author}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {meta.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </header>

        {/* Content */}
        <article className="prose prose-slate dark:prose-invert max-w-none">
          {children}
        </article>
      </div>
    </div>
  );
}
