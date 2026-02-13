import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { X, Palette, Type, Layout } from 'lucide-react';
import { GlobalStyles } from './types';

interface GlobalSettingsProps {
  styles: GlobalStyles;
  onChange: (updates: Partial<GlobalStyles>) => void;
  onClose: () => void;
}

const FONT_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Courier New", monospace', label: 'Courier New' },
  { value: '"Open Sans", sans-serif', label: 'Open Sans' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
];

const MAX_WIDTH_OPTIONS = [
  { value: '480px', label: '480px (Mobile)' },
  { value: '600px', label: '600px (Standard)' },
  { value: '720px', label: '720px (Wide)' },
  { value: '100%', label: '100% (Full Width)' },
];

const PADDING_OPTIONS = [
  { value: '16px', label: '16px (Compact)' },
  { value: '20px', label: '20px (Standard)' },
  { value: '24px', label: '24px (Spacious)' },
  { value: '32px', label: '32px (Very Spacious)' },
];

const COLOR_PRESETS = [
  { name: 'Blue Theme', colors: { primary: '#2563eb', background: '#ffffff', text: '#111827', link: '#2563eb' } },
  { name: 'Green Theme', colors: { primary: '#059669', background: '#ffffff', text: '#111827', link: '#059669' } },
  { name: 'Purple Theme', colors: { primary: '#7c3aed', background: '#ffffff', text: '#111827', link: '#7c3aed' } },
  { name: 'Orange Theme', colors: { primary: '#ea580c', background: '#ffffff', text: '#111827', link: '#ea580c' } },
  { name: 'Dark Theme', colors: { primary: '#3b82f6', background: '#1f2937', text: '#f9fafb', link: '#60a5fa' } },
];

export function GlobalSettings({ styles, onChange, onClose }: GlobalSettingsProps) {
  const applyColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    onChange({
      primaryColor: preset.colors.primary,
      backgroundColor: preset.colors.background,
      textColor: preset.colors.text,
      linkColor: preset.colors.link,
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Global Settings
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Configure global styles that apply to your entire email
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Typography Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Type className="h-4 w-4" />
              Typography
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="font-family">Font Family</Label>
              <Select
                value={styles.fontFamily}
                onValueChange={(value) => onChange({ fontFamily: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="text-color">Text Color</Label>
              <div className="flex gap-2">
                <Input
                  id="text-color"
                  type="color"
                  value={styles.textColor}
                  onChange={(e) => onChange({ textColor: e.target.value })}
                  className="w-16"
                />
                <Input
                  value={styles.textColor}
                  onChange={(e) => onChange({ textColor: e.target.value })}
                  placeholder="#111827"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="link-color">Link Color</Label>
              <div className="flex gap-2">
                <Input
                  id="link-color"
                  type="color"
                  value={styles.linkColor}
                  onChange={(e) => onChange({ linkColor: e.target.value })}
                  className="w-16"
                />
                <Input
                  value={styles.linkColor}
                  onChange={(e) => onChange({ linkColor: e.target.value })}
                  placeholder="#2563eb"
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Color Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Colors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={styles.primaryColor}
                  onChange={(e) => onChange({ primaryColor: e.target.value })}
                  className="w-16"
                />
                <Input
                  value={styles.primaryColor}
                  onChange={(e) => onChange({ primaryColor: e.target.value })}
                  placeholder="#2563eb"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="background-color">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  id="background-color"
                  type="color"
                  value={styles.backgroundColor}
                  onChange={(e) => onChange({ backgroundColor: e.target.value })}
                  className="w-16"
                />
                <Input
                  value={styles.backgroundColor}
                  onChange={(e) => onChange({ backgroundColor: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label>Color Presets</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {COLOR_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => applyColorPreset(preset)}
                    className="justify-between h-auto p-3"
                  >
                    <span className="text-xs font-medium">{preset.name}</span>
                    <div className="flex gap-1">
                      <div 
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: preset.colors.primary }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: preset.colors.background }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: preset.colors.text }}
                      />
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Layout Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Layout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Maximum Width</Label>
              <Select
                value={styles.maxWidth}
                onValueChange={(value) => onChange({ maxWidth: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAX_WIDTH_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum width of email content. 600px is recommended for best compatibility.
              </p>
            </div>

            <div>
              <Label>Container Padding</Label>
              <Select
                value={styles.padding}
                onValueChange={(value) => onChange({ padding: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PADDING_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Inner padding around the entire email content.
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="border rounded p-4 text-center"
              style={{
                backgroundColor: styles.backgroundColor,
                fontFamily: styles.fontFamily,
                color: styles.textColor,
              }}
            >
              <h3 style={{ color: styles.primaryColor, margin: '0 0 8px 0' }}>
                Sample Heading
              </h3>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                This is how your text will look with the current settings.
              </p>
              <a 
                href="#" 
                style={{ 
                  color: styles.linkColor,
                  textDecoration: 'underline',
                  fontSize: '14px'
                }}
              >
                Sample Link
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Reset Button */}
        <div className="pt-4">
          <Button
            variant="outline"
            onClick={() => {
              onChange({
                fontFamily: 'Inter, sans-serif',
                backgroundColor: '#ffffff',
                primaryColor: '#2563eb',
                textColor: '#111827',
                linkColor: '#2563eb',
                maxWidth: '600px',
                padding: '20px',
              });
            }}
            className="w-full"
          >
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}