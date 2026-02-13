import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Trash2, Palette, Settings, Type, Layout, Spacing } from 'lucide-react';
import { EmailBlock, GlobalStyles } from './types';
import { cn } from '@/lib/utils';

interface BlockSettingsProps {
  block: EmailBlock;
  globalStyles: GlobalStyles;
  onChange: (updates: Partial<EmailBlock>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

export function BlockSettings({ block, globalStyles, onChange, onRemove, onDuplicate }: BlockSettingsProps) {
  const updateContent = (newContent: any) => {
    onChange({ content: newContent });
  };

  const updateStyles = (newStyles: any) => {
    onChange({ styles: { ...block.styles, ...newStyles } });
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            {block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onDuplicate} className="h-8 w-8">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Content Settings */}
        <ContentSettings
          blockType={block.type}
          content={block.content}
          onChange={updateContent}
        />

        <Separator />

        {/* Style Settings */}
        <StyleSettings
          blockType={block.type}
          styles={block.styles}
          globalStyles={globalStyles}
          onChange={updateStyles}
        />

        <Separator />

        {/* Layout Settings */}
        <LayoutSettings
          styles={block.styles}
          onChange={updateStyles}
        />
      </div>
    </div>
  );
}

function ContentSettings({ blockType, content, onChange }: any) {
  switch (blockType) {
    case 'text':
      return (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Type className="h-4 w-4" />
              Text Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="text-content">Content</Label>
              <Textarea
                id="text-content"
                value={content}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter your text here..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use HTML for formatting: {'<b>bold</b>, <i>italic</i>, <a href="...">link</a>'}
              </p>
            </div>
          </CardContent>
        </Card>
      );

    case 'image':
      return (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Image Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="image-src">Image URL</Label>
              <Input
                id="image-src"
                value={content.src || ''}
                onChange={(e) => onChange({ ...content, src: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label htmlFor="image-alt">Alt Text</Label>
              <Input
                id="image-alt"
                value={content.alt || ''}
                onChange={(e) => onChange({ ...content, alt: e.target.value })}
                placeholder="Describe the image"
              />
            </div>
            <div>
              <Label htmlFor="image-link">Link URL (optional)</Label>
              <Input
                id="image-link"
                value={content.href || ''}
                onChange={(e) => onChange({ ...content, href: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="image-width">Width</Label>
                <Input
                  id="image-width"
                  value={content.width || ''}
                  onChange={(e) => onChange({ ...content, width: e.target.value })}
                  placeholder="auto"
                />
              </div>
              <div>
                <Label htmlFor="image-height">Height</Label>
                <Input
                  id="image-height"
                  value={content.height || ''}
                  onChange={(e) => onChange({ ...content, height: e.target.value })}
                  placeholder="auto"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      );

    case 'button':
      return (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Button Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="button-text">Button Text</Label>
              <Input
                id="button-text"
                value={content.text || ''}
                onChange={(e) => onChange({ ...content, text: e.target.value })}
                placeholder="Click here"
              />
            </div>
            <div>
              <Label htmlFor="button-href">Link URL</Label>
              <Input
                id="button-href"
                value={content.href || ''}
                onChange={(e) => onChange({ ...content, href: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label>Button Style</Label>
              <Select
                value={content.style || 'primary'}
                onValueChange={(value) => onChange({ ...content, style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      );

    case 'divider':
      return (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Divider Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="divider-color">Color</Label>
              <Input
                id="divider-color"
                type="color"
                value={content.color || '#e5e7eb'}
                onChange={(e) => onChange({ ...content, color: e.target.value })}
              />
            </div>
            <div>
              <Label>Thickness: {content.thickness || 1}px</Label>
              <Slider
                value={[content.thickness || 1]}
                onValueChange={(value) => onChange({ ...content, thickness: value[0] })}
                max={10}
                min={1}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Style</Label>
              <Select
                value={content.style || 'solid'}
                onValueChange={(value) => onChange({ ...content, style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      );

    case 'spacer':
      return (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Spacing className="h-4 w-4" />
              Spacer Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Height: {content.height || 20}px</Label>
              <Slider
                value={[content.height || 20]}
                onValueChange={(value) => onChange({ height: value[0] })}
                max={200}
                min={10}
                step={5}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>
      );

    case 'columns':
      return (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Columns Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Layout</Label>
              <Select
                value={content.layout || '2-column'}
                onValueChange={(value) => {
                  const columnCount = value === '2-column' ? 2 : value === '3-column' ? 3 : 4;
                  const newColumns = Array.from({ length: columnCount }, (_, i) => ({
                    content: content.columns?.[i]?.content || `<p>Column ${i + 1} content</p>`,
                  }));
                  onChange({ ...content, layout: value, columns: newColumns });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2-column">2 Columns</SelectItem>
                  <SelectItem value="3-column">3 Columns</SelectItem>
                  <SelectItem value="4-column">4 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {content.columns?.map((column: any, index: number) => (
              <div key={index}>
                <Label htmlFor={`column-${index}`}>Column {index + 1}</Label>
                <Textarea
                  id={`column-${index}`}
                  value={column.content}
                  onChange={(e) => {
                    const newColumns = [...content.columns];
                    newColumns[index] = { ...newColumns[index], content: e.target.value };
                    onChange({ ...content, columns: newColumns });
                  }}
                  rows={2}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
}

function StyleSettings({ blockType, styles, globalStyles, onChange }: any) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Styling
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Text Alignment */}
        {['text', 'image', 'button'].includes(blockType) && (
          <div>
            <Label>Alignment</Label>
            <Select
              value={styles.textAlign || 'left'}
              onValueChange={(value) => onChange({ textAlign: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Text-specific styles */}
        {blockType === 'text' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Font Size</Label>
                <Select
                  value={styles.fontSize || '16px'}
                  onValueChange={(value) => onChange({ fontSize: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12px">12px</SelectItem>
                    <SelectItem value="14px">14px</SelectItem>
                    <SelectItem value="16px">16px</SelectItem>
                    <SelectItem value="18px">18px</SelectItem>
                    <SelectItem value="20px">20px</SelectItem>
                    <SelectItem value="24px">24px</SelectItem>
                    <SelectItem value="32px">32px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Font Weight</Label>
                <Select
                  value={styles.fontWeight || 'normal'}
                  onValueChange={(value) => onChange({ fontWeight: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="600">Semibold</SelectItem>
                    <SelectItem value="700">Bold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="text-color">Text Color</Label>
              <Input
                id="text-color"
                type="color"
                value={styles.color || globalStyles.textColor}
                onChange={(e) => onChange({ color: e.target.value })}
              />
            </div>
          </>
        )}

        {/* Button-specific styles */}
        {blockType === 'button' && (
          <>
            <div>
              <Label htmlFor="button-bg-color">Background Color</Label>
              <Input
                id="button-bg-color"
                type="color"
                value={styles.backgroundColor || globalStyles.primaryColor}
                onChange={(e) => onChange({ backgroundColor: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="button-text-color">Text Color</Label>
              <Input
                id="button-text-color"
                type="color"
                value={styles.color || '#ffffff'}
                onChange={(e) => onChange({ color: e.target.value })}
              />
            </div>
            <div>
              <Label>Border Radius: {styles.borderRadius || '6px'}</Label>
              <Slider
                value={[parseInt(styles.borderRadius?.replace('px', '') || '6')]}
                onValueChange={(value) => onChange({ borderRadius: `${value[0]}px` })}
                max={50}
                min={0}
                step={2}
                className="mt-2"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LayoutSettings({ styles, onChange }: any) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Spacing className="h-4 w-4" />
          Spacing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Top: {styles.paddingTop || '12px'}</Label>
            <Slider
              value={[parseInt(styles.paddingTop?.replace('px', '') || '12')]}
              onValueChange={(value) => onChange({ paddingTop: `${value[0]}px` })}
              max={80}
              min={0}
              step={4}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Bottom: {styles.paddingBottom || '12px'}</Label>
            <Slider
              value={[parseInt(styles.paddingBottom?.replace('px', '') || '12')]}
              onValueChange={(value) => onChange({ paddingBottom: `${value[0]}px` })}
              max={80}
              min={0}
              step={4}
              className="mt-2"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Left: {styles.paddingLeft || '0px'}</Label>
            <Slider
              value={[parseInt(styles.paddingLeft?.replace('px', '') || '0')]}
              onValueChange={(value) => onChange({ paddingLeft: `${value[0]}px` })}
              max={80}
              min={0}
              step={4}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Right: {styles.paddingRight || '0px'}</Label>
            <Slider
              value={[parseInt(styles.paddingRight?.replace('px', '') || '0')]}
              onValueChange={(value) => onChange({ paddingRight: `${value[0]}px` })}
              max={80}
              min={0}
              step={4}
              className="mt-2"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}