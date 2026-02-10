import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Monitor, Smartphone, Mail, User } from 'lucide-react';

interface EmailPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  content: string;
  previewText?: string;
  senderName: string;
  senderEmail: string;
  recipientName?: string;
  recipientEmail?: string;
}

// Sample personalization data
const SAMPLE_DATA = {
  first_name: 'Alex',
  last_name: 'Johnson',
  email: 'alex.johnson@example.com',
  name: 'Alex Johnson',
};

export function EmailPreviewModal({
  open,
  onOpenChange,
  subject,
  content,
  previewText,
  senderName,
  senderEmail,
  recipientName = 'Alex Johnson',
  recipientEmail = 'alex.johnson@example.com',
}: EmailPreviewModalProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Replace personalization tokens with sample data
  const personalizeContent = (text: string): string => {
    return text
      .replace(/\{\{first_name\}\}/gi, SAMPLE_DATA.first_name)
      .replace(/\{\{last_name\}\}/gi, SAMPLE_DATA.last_name)
      .replace(/\{\{email\}\}/gi, SAMPLE_DATA.email)
      .replace(/\{\{name\}\}/gi, SAMPLE_DATA.name);
  };

  const personalizedSubject = personalizeContent(subject);
  const personalizedContent = personalizeContent(content);

  // Wrap content in email styling
  const styledContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          padding: 32px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        p {
          margin: 0 0 16px 0;
        }
        a {
          color: #2563eb;
        }
        h1, h2, h3 {
          margin: 0 0 16px 0;
          color: #111;
        }
        img {
          max-width: 100%;
          height: auto;
        }
        .unsubscribe {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #e5e5e5;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        ${personalizedContent}
        <div class="unsubscribe">
          <p>You received this email because you subscribed to updates.</p>
          <a href="#">Unsubscribe</a>
        </div>
      </div>
    </body>
    </html>
  `;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Preview
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('desktop')}
              >
                <Monitor className="h-4 w-4 mr-1" />
                Desktop
              </Button>
              <Button
                variant={viewMode === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('mobile')}
              >
                <Smartphone className="h-4 w-4 mr-1" />
                Mobile
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="source">Source</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            {/* Email Header */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 p-4 border-b space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium w-16 text-muted-foreground">From:</span>
                  <span>
                    {senderName} &lt;{senderEmail}&gt;
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium w-16 text-muted-foreground">To:</span>
                  <span>
                    {recipientName} &lt;{recipientEmail}&gt;
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium w-16 text-muted-foreground">Subject:</span>
                  <span className="font-medium">{personalizedSubject}</span>
                </div>
                {previewText && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium w-16 text-muted-foreground">Preview:</span>
                    <span className="text-muted-foreground italic truncate">
                      {personalizeContent(previewText)}
                    </span>
                  </div>
                )}
              </div>

              {/* Email Body */}
              <div
                className={`mx-auto transition-all ${
                  viewMode === 'mobile' ? 'max-w-[375px] p-2' : 'w-full'
                }`}
              >
                <ScrollArea className="h-[400px]">
                  <iframe
                    srcDoc={styledContent}
                    className="w-full h-[800px] border-0"
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                </ScrollArea>
              </div>
            </div>

            {/* Personalization info */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Preview using sample data:</span>
                <Badge variant="secondary">{"{{first_name}}"} = {SAMPLE_DATA.first_name}</Badge>
                <Badge variant="secondary">{"{{last_name}}"} = {SAMPLE_DATA.last_name}</Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="source" className="mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <pre className="p-3 bg-muted rounded-lg text-sm overflow-x-auto">
                  {subject}
                </pre>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">HTML Content</label>
                <ScrollArea className="h-[400px]">
                  <pre className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap break-all">
                    {content}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
