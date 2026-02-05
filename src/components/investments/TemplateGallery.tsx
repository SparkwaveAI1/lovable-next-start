import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sunrise,
  Sunset,
  BookOpen,
  TrendingDown,
  Calendar,
  Zap,
  BarChart3,
  FileText,
  Clock,
  Mail,
  Bell,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { 
  WORKFLOW_TEMPLATES, 
  TEMPLATE_CATEGORIES,
  type WorkflowTemplate,
  type TemplateCategory,
} from '@/data/workflowTemplates';
import { cn } from '@/lib/utils';

// Map icon names to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  Sunrise,
  Sunset,
  BookOpen,
  TrendingDown,
  Calendar,
  Zap,
  BarChart3,
  FileText,
};

interface TemplateGalleryProps {
  onUseTemplate?: (template: WorkflowTemplate) => void;
}

function getDifficultyColor(difficulty: WorkflowTemplate['difficulty']) {
  switch (difficulty) {
    case 'beginner':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'advanced':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function getCategoryColor(category: TemplateCategory) {
  switch (category) {
    case 'alerts':
      return 'bg-blue-100 text-blue-700';
    case 'reports':
      return 'bg-green-100 text-green-700';
    case 'journaling':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getTriggerDescription(template: WorkflowTemplate): string {
  const { trigger } = template;
  if (trigger.type === 'schedule' && trigger.cron) {
    // Simple cron parsing
    if (trigger.cron.includes('* * 1-5')) return 'Weekdays';
    if (trigger.cron.includes('* * 0')) return 'Sundays';
    return 'Scheduled';
  }
  if (trigger.type === 'investment_alert') {
    return 'When alert triggers';
  }
  return 'Event-based';
}

function getActionIcons(template: WorkflowTemplate): React.ReactNode[] {
  const icons: React.ReactNode[] = [];
  template.actions.forEach((action, idx) => {
    if (action.type === 'send_email') {
      icons.push(<Mail key={`email-${idx}`} className="h-3 w-3" />);
    }
    if (action.type === 'send_notification') {
      icons.push(<Bell key={`bell-${idx}`} className="h-3 w-3" />);
    }
    if (action.type === 'log_to_journal') {
      icons.push(<FileText key={`file-${idx}`} className="h-3 w-3" />);
    }
  });
  return icons;
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: WorkflowTemplate;
  onSelect: () => void;
}) {
  const IconComponent = ICON_MAP[template.icon] || Zap;

  return (
    <Card className="group hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer" onClick={onSelect}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className={cn(
            "p-2 rounded-lg",
            getCategoryColor(template.category)
          )}>
            <IconComponent className="h-5 w-5" />
          </div>
          <Badge variant="outline" className={cn("text-xs", getDifficultyColor(template.difficulty))}>
            {template.difficulty}
          </Badge>
        </div>
        <CardTitle className="text-base mt-3 group-hover:text-indigo-600 transition-colors">
          {template.name}
        </CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{getTriggerDescription(template)}</span>
          </div>
          <div className="flex items-center gap-1">
            {getActionIcons(template)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
  onUse,
}: {
  template: WorkflowTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: () => void;
}) {
  if (!template) return null;

  const IconComponent = ICON_MAP[template.icon] || Zap;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-lg", getCategoryColor(template.category))}>
              <IconComponent className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle>{template.name}</DialogTitle>
              <DialogDescription>{template.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Trigger */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              Trigger
            </h4>
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              {template.trigger.type === 'schedule' && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Runs on schedule: <code className="bg-muted px-1 rounded">{template.trigger.cron}</code></span>
                </div>
              )}
              {template.trigger.type === 'investment_alert' && (
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span>
                    When {template.trigger.indicator} alert triggers
                    {template.trigger.operator && template.trigger.value !== undefined && (
                      <> ({template.trigger.operator} {template.trigger.value})</>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-green-600" />
              Actions
            </h4>
            <div className="space-y-2">
              {template.actions.map((action, index) => (
                <div key={index} className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>
                    {action.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    {action.template && <span className="text-muted-foreground"> ({action.template})</span>}
                    {action.list && <span className="text-muted-foreground"> → {action.list}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 pt-2">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onUse} className="bg-indigo-600 hover:bg-indigo-700">
            <Sparkles className="h-4 w-4 mr-2" />
            Use This Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TemplateGallery({ onUseTemplate }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | TemplateCategory>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const filteredTemplates = selectedCategory === 'all'
    ? WORKFLOW_TEMPLATES
    : WORKFLOW_TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate && onUseTemplate) {
      onUseTemplate(selectedTemplate);
    }
    setPreviewOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Workflow Templates</h2>
          <p className="text-sm text-muted-foreground">
            Pre-built automation templates for common investment workflows
          </p>
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as typeof selectedCategory)}>
        <TabsList>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          {Object.entries(TEMPLATE_CATEGORIES).map(([key, { label }]) => (
            <TabsTrigger key={key} value={key}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={() => handleSelectTemplate(template)}
          />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No templates found for this category.
        </div>
      )}

      <TemplatePreviewDialog
        template={selectedTemplate}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onUse={handleUseTemplate}
      />
    </div>
  );
}
