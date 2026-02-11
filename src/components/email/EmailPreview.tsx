import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface EmailPreviewProps {
  subject: string;
  content: string;
  senderName: string;
  senderEmail: string;
  mode: 'desktop' | 'mobile';
}

export function EmailPreview({ subject, content, senderName, senderEmail, mode }: EmailPreviewProps) {
  // Replace personalization tokens with preview values
  const previewContent = content
    .replace(/{first_name}/g, 'John')
    .replace(/{last_name}/g, 'Doe')
    .replace(/{email}/g, 'john.doe@example.com')
    .replace(/{company}/g, 'Example Inc');

  const previewSubject = subject
    .replace(/{first_name}/g, 'John')
    .replace(/{last_name}/g, 'Doe')
    .replace(/{email}/g, 'john.doe@example.com')
    .replace(/{company}/g, 'Example Inc');

  const containerClass = mode === 'mobile' 
    ? 'max-w-sm mx-auto' 
    : 'max-w-2xl mx-auto';

  return (
    <div className={`${containerClass} space-y-4`}>
      {/* Preview Mode Badge */}
      <div className="flex justify-center">
        <Badge variant="outline" className="capitalize">
          {mode} Preview
        </Badge>
      </div>

      {/* Email Client Header Simulation */}
      <Card className="p-4 bg-slate-50 border-slate-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Mail className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-slate-900">
                {senderName}
              </span>
              <span className="text-xs text-slate-500">
                &lt;{senderEmail}&gt;
              </span>
            </div>
            <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(), 'MMM d, yyyy \'at\' h:mm a')}
            </div>
            <div className="font-medium text-slate-900">
              {previewSubject || 'Subject line will appear here'}
            </div>
          </div>
        </div>
      </Card>

      {/* Email Content */}
      <Card className="overflow-hidden">
        <div className="bg-white">
          {/* Email Body */}
          <div className={`p-6 ${mode === 'mobile' ? 'p-4' : 'p-6'}`}>
            {previewContent ? (
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewContent }}
                style={{
                  fontSize: mode === 'mobile' ? '14px' : '16px',
                  lineHeight: '1.6'
                }}
              />
            ) : (
              <div className="text-slate-400 italic text-center py-8">
                Email content will appear here when you start writing
              </div>
            )}
          </div>

          {/* Unsubscribe Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t">
            <div className={`text-xs text-slate-500 text-center ${mode === 'mobile' ? 'px-2' : ''}`}>
              <p>
                This email was sent to john.doe@example.com because you signed up for updates.
              </p>
              <p className="mt-1">
                <a href="#" className="text-blue-600 underline">Unsubscribe</a> | <a href="#" className="text-blue-600 underline">Update preferences</a>
              </p>
              <p className="mt-2 text-slate-400">
                Example Company • 123 Main St, Anytown, ST 12345
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Preview Notes */}
      <div className="text-xs text-slate-500 text-center space-y-1">
        <p>
          This is a preview of how your email will appear to recipients.
        </p>
        <p>
          Personalization tokens (like {'{first_name}'}) are replaced with sample data.
        </p>
      </div>
    </div>
  );
}