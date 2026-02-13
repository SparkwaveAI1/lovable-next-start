import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ImageIcon, Link, Upload } from 'lucide-react';
import { EmailBlock, GlobalStyles } from './types';
import { cn } from '@/lib/utils';

interface BlockRendererProps {
  block: EmailBlock;
  globalStyles: GlobalStyles;
  isEditing?: boolean;
  onChange?: (updates: Partial<EmailBlock>) => void;
}

export function BlockRenderer({ block, globalStyles, isEditing, onChange }: BlockRendererProps) {
  const { type, content, styles } = block;

  const updateContent = (newContent: any) => {
    onChange?.({ content: newContent });
  };

  const updateStyles = (newStyles: any) => {
    onChange?.({ styles: { ...styles, ...newStyles } });
  };

  switch (type) {
    case 'text':
      return (
        <TextBlockRenderer
          content={content}
          styles={styles}
          globalStyles={globalStyles}
          isEditing={isEditing}
          onContentChange={updateContent}
          onStylesChange={updateStyles}
        />
      );

    case 'image':
      return (
        <ImageBlockRenderer
          content={content}
          styles={styles}
          globalStyles={globalStyles}
          isEditing={isEditing}
          onContentChange={updateContent}
          onStylesChange={updateStyles}
        />
      );

    case 'button':
      return (
        <ButtonBlockRenderer
          content={content}
          styles={styles}
          globalStyles={globalStyles}
          isEditing={isEditing}
          onContentChange={updateContent}
          onStylesChange={updateStyles}
        />
      );

    case 'divider':
      return (
        <DividerBlockRenderer
          content={content}
          styles={styles}
          globalStyles={globalStyles}
          isEditing={isEditing}
          onContentChange={updateContent}
          onStylesChange={updateStyles}
        />
      );

    case 'spacer':
      return (
        <SpacerBlockRenderer
          content={content}
          styles={styles}
          globalStyles={globalStyles}
          isEditing={isEditing}
          onContentChange={updateContent}
          onStylesChange={updateStyles}
        />
      );

    case 'columns':
      return (
        <ColumnsBlockRenderer
          content={content}
          styles={styles}
          globalStyles={globalStyles}
          isEditing={isEditing}
          onContentChange={updateContent}
          onStylesChange={updateStyles}
        />
      );

    case 'social':
      return (
        <SocialBlockRenderer
          content={content}
          styles={styles}
          globalStyles={globalStyles}
          isEditing={isEditing}
          onContentChange={updateContent}
          onStylesChange={updateStyles}
        />
      );

    case 'video':
      return (
        <VideoBlockRenderer
          content={content}
          styles={styles}
          globalStyles={globalStyles}
          isEditing={isEditing}
          onContentChange={updateContent}
          onStylesChange={updateStyles}
        />
      );

    default:
      return (
        <div className="p-4 border border-dashed border-muted text-muted-foreground text-center">
          Unknown block type: {type}
        </div>
      );
  }
}

// Text Block Renderer
function TextBlockRenderer({ content, styles, globalStyles, isEditing, onContentChange, onStylesChange }: any) {
  const [isEditing2, setIsEditing2] = useState(false);
  const [editContent, setEditContent] = useState(content);

  const handleSave = () => {
    onContentChange(editContent);
    setIsEditing2(false);
  };

  const blockStyles = {
    fontSize: styles.fontSize || '16px',
    lineHeight: styles.lineHeight || '1.6',
    color: styles.color || globalStyles.textColor,
    textAlign: styles.textAlign || 'left',
    fontWeight: styles.fontWeight || 'normal',
    padding: `${styles.paddingTop || '12px'} ${styles.paddingRight || '0px'} ${styles.paddingBottom || '12px'} ${styles.paddingLeft || '0px'}`,
  };

  if (isEditing && isEditing2) {
    return (
      <div className="space-y-2">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full min-h-[100px] p-2 border rounded resize-none"
          placeholder="Enter your text here..."
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>Save</Button>
          <Button size="sm" variant="outline" onClick={() => setIsEditing2(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={blockStyles}
      className={cn(
        "min-h-[40px] relative group cursor-pointer",
        isEditing && "ring-2 ring-primary/20 rounded"
      )}
      onClick={() => isEditing && setIsEditing2(true)}
      dangerouslySetInnerHTML={{ __html: content || '<p>Click to edit text...</p>' }}
    />
  );
}

// Image Block Renderer
function ImageBlockRenderer({ content, styles, globalStyles, isEditing, onContentChange, onStylesChange }: any) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editContent, setEditContent] = useState(content);

  const handleSave = () => {
    onContentChange(editContent);
    setIsEditModalOpen(false);
  };

  const blockStyles = {
    textAlign: styles.textAlign || 'center',
    padding: `${styles.paddingTop || '12px'} ${styles.paddingRight || '0px'} ${styles.paddingBottom || '12px'} ${styles.paddingLeft || '0px'}`,
  };

  const imageElement = (
    <div style={blockStyles}>
      {content.src ? (
        <img
          src={content.src}
          alt={content.alt || ''}
          style={{
            maxWidth: '100%',
            height: 'auto',
            width: content.width || 'auto',
            display: 'block',
            margin: '0 auto',
          }}
        />
      ) : (
        <div className="border border-dashed border-muted-foreground/50 p-8 text-center bg-muted/20 rounded">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {isEditing ? 'Click to add image' : 'Image placeholder'}
          </p>
        </div>
      )}
    </div>
  );

  if (!isEditing) {
    return content.href ? (
      <a href={content.href} target="_blank" rel="noopener noreferrer">
        {imageElement}
      </a>
    ) : (
      imageElement
    );
  }

  return (
    <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
      <DialogTrigger asChild>
        <div className="cursor-pointer hover:ring-2 hover:ring-primary/20 rounded">
          {imageElement}
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="image-src">Image URL</Label>
            <Input
              id="image-src"
              value={editContent.src || ''}
              onChange={(e) => setEditContent({ ...editContent, src: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div>
            <Label htmlFor="image-alt">Alt Text</Label>
            <Input
              id="image-alt"
              value={editContent.alt || ''}
              onChange={(e) => setEditContent({ ...editContent, alt: e.target.value })}
              placeholder="Describe the image"
            />
          </div>
          <div>
            <Label htmlFor="image-link">Link URL (optional)</Label>
            <Input
              id="image-link"
              value={editContent.href || ''}
              onChange={(e) => setEditContent({ ...editContent, href: e.target.value })}
              placeholder="https://example.com"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave}>Save</Button>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Button Block Renderer
function ButtonBlockRenderer({ content, styles, globalStyles, isEditing, onContentChange, onStylesChange }: any) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editContent, setEditContent] = useState(content);

  const handleSave = () => {
    onContentChange(editContent);
    setIsEditModalOpen(false);
  };

  const buttonStyles = {
    display: 'inline-block',
    padding: styles.padding || '12px 24px',
    backgroundColor: getButtonColor(content.style, globalStyles),
    color: getButtonTextColor(content.style, globalStyles),
    borderRadius: styles.borderRadius || '6px',
    textDecoration: 'none',
    fontWeight: '600',
    border: content.style === 'outline' ? `2px solid ${globalStyles.primaryColor}` : 'none',
  };

  const containerStyles = {
    textAlign: styles.textAlign || 'center',
    padding: `${styles.paddingTop || '12px'} ${styles.paddingRight || '0px'} ${styles.paddingBottom || '12px'} ${styles.paddingLeft || '0px'}`,
  };

  const buttonElement = (
    <div style={containerStyles}>
      <a href={content.href || '#'} style={buttonStyles}>
        {content.text || 'Button Text'}
      </a>
    </div>
  );

  if (!isEditing) {
    return buttonElement;
  }

  return (
    <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
      <DialogTrigger asChild>
        <div className="cursor-pointer hover:ring-2 hover:ring-primary/20 rounded">
          {buttonElement}
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Button</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="button-text">Button Text</Label>
            <Input
              id="button-text"
              value={editContent.text || ''}
              onChange={(e) => setEditContent({ ...editContent, text: e.target.value })}
              placeholder="Click here"
            />
          </div>
          <div>
            <Label htmlFor="button-href">Link URL</Label>
            <Input
              id="button-href"
              value={editContent.href || ''}
              onChange={(e) => setEditContent({ ...editContent, href: e.target.value })}
              placeholder="https://example.com"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave}>Save</Button>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Divider Block Renderer
function DividerBlockRenderer({ content, styles, globalStyles, isEditing, onContentChange }: any) {
  const dividerStyles = {
    borderTop: `${content.thickness || 1}px ${content.style || 'solid'} ${content.color || '#e5e7eb'}`,
    margin: `${styles.paddingTop || '20px'} 0 ${styles.paddingBottom || '20px'} 0`,
  };

  return <hr style={dividerStyles} />;
}

// Spacer Block Renderer
function SpacerBlockRenderer({ content, styles, globalStyles }: any) {
  const spacerStyles = {
    height: `${content.height || 20}px`,
    fontSize: '1px',
    lineHeight: '1px',
  };

  return <div style={spacerStyles}>&nbsp;</div>;
}

// Columns Block Renderer (simplified)
function ColumnsBlockRenderer({ content, styles, globalStyles, isEditing, onContentChange }: any) {
  const columnCount = content.layout === '2-column' ? 2 : content.layout === '3-column' ? 3 : 4;
  const columnWidth = `${100 / columnCount}%`;

  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      {content.columns?.map((column: any, index: number) => (
        <div key={index} style={{ width: columnWidth, minHeight: '60px' }}>
          <div
            dangerouslySetInnerHTML={{ __html: column.content || `<p>Column ${index + 1} content</p>` }}
            className="p-2 border border-dashed border-muted-foreground/30 rounded"
          />
        </div>
      ))}
    </div>
  );
}

// Social Block Renderer (simplified)
function SocialBlockRenderer({ content, styles, globalStyles }: any) {
  const containerStyles = {
    textAlign: styles.textAlign || 'center',
    padding: `${styles.paddingTop || '12px'} ${styles.paddingRight || '0px'} ${styles.paddingBottom || '12px'} ${styles.paddingLeft || '0px'}`,
  };

  return (
    <div style={containerStyles}>
      <div style={{ display: 'inline-flex', gap: '12px' }}>
        {content.platforms?.map((platform: any, index: number) => (
          platform.url ? (
            <a key={index} href={platform.url} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  width: `${content.iconSize || 32}px`,
                  height: `${content.iconSize || 32}px`,
                  backgroundColor: '#6b7280',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                }}
              >
                {platform.name.charAt(0).toUpperCase()}
              </div>
            </a>
          ) : null
        ))}
      </div>
    </div>
  );
}

// Video Block Renderer (simplified)
function VideoBlockRenderer({ content, styles, globalStyles, isEditing, onContentChange }: any) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editContent, setEditContent] = useState(content);

  const handleSave = () => {
    onContentChange(editContent);
    setIsEditModalOpen(false);
  };

  const containerStyles = {
    textAlign: styles.textAlign || 'center',
    padding: `${styles.paddingTop || '12px'} ${styles.paddingRight || '0px'} ${styles.paddingBottom || '12px'} ${styles.paddingLeft || '0px'}`,
  };

  const videoElement = (
    <div style={containerStyles}>
      {content.thumbnailUrl ? (
        <div>
          <img
            src={content.thumbnailUrl}
            alt={content.title || 'Video thumbnail'}
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
          />
          <div style={{ marginTop: '8px', fontSize: '16px', fontWeight: '600' }}>
            {content.title || 'Video Title'}
          </div>
          {content.description && (
            <div style={{ marginTop: '4px', fontSize: '14px', color: '#6b7280' }}>
              {content.description}
            </div>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-muted-foreground/50 p-8 text-center bg-muted/20 rounded">
          <div className="text-muted-foreground mb-2">🎬</div>
          <p className="text-sm text-muted-foreground">
            {isEditing ? 'Click to add video' : 'Video placeholder'}
          </p>
        </div>
      )}
    </div>
  );

  if (!isEditing) {
    return content.videoUrl ? (
      <a href={content.videoUrl} target="_blank" rel="noopener noreferrer">
        {videoElement}
      </a>
    ) : (
      videoElement
    );
  }

  return (
    <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
      <DialogTrigger asChild>
        <div className="cursor-pointer hover:ring-2 hover:ring-primary/20 rounded">
          {videoElement}
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="video-url">Video URL</Label>
            <Input
              id="video-url"
              value={editContent.videoUrl || ''}
              onChange={(e) => setEditContent({ ...editContent, videoUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
          <div>
            <Label htmlFor="video-thumbnail">Thumbnail URL</Label>
            <Input
              id="video-thumbnail"
              value={editContent.thumbnailUrl || ''}
              onChange={(e) => setEditContent({ ...editContent, thumbnailUrl: e.target.value })}
              placeholder="https://example.com/thumbnail.jpg"
            />
          </div>
          <div>
            <Label htmlFor="video-title">Title</Label>
            <Input
              id="video-title"
              value={editContent.title || ''}
              onChange={(e) => setEditContent({ ...editContent, title: e.target.value })}
              placeholder="Video Title"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave}>Save</Button>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function getButtonColor(style: string, globalStyles: GlobalStyles): string {
  switch (style) {
    case 'primary':
      return globalStyles.primaryColor;
    case 'secondary':
      return '#6b7280';
    case 'outline':
      return 'transparent';
    default:
      return globalStyles.primaryColor;
  }
}

function getButtonTextColor(style: string, globalStyles: GlobalStyles): string {
  switch (style) {
    case 'primary':
    case 'secondary':
      return '#ffffff';
    case 'outline':
      return globalStyles.primaryColor;
    default:
      return '#ffffff';
  }
}