import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Type,
  Image,
  MousePointer,
  Minus,
  Space,
  Columns,
  Share2,
  Video,
  Plus,
} from 'lucide-react';
import { BlockType } from './types';

interface BlockPaletteProps {
  onAddBlock: (type: BlockType) => void;
}

interface BlockDefinition {
  type: BlockType;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'content' | 'layout' | 'media';
}

const BLOCK_DEFINITIONS: BlockDefinition[] = [
  // Content Blocks
  {
    type: 'text',
    name: 'Text',
    description: 'Rich text with formatting',
    icon: <Type className="h-5 w-5" />,
    category: 'content',
  },
  {
    type: 'button',
    name: 'Button',
    description: 'Call-to-action button',
    icon: <MousePointer className="h-5 w-5" />,
    category: 'content',
  },
  
  // Layout Blocks
  {
    type: 'columns',
    name: 'Columns',
    description: 'Multi-column layout',
    icon: <Columns className="h-5 w-5" />,
    category: 'layout',
  },
  {
    type: 'divider',
    name: 'Divider',
    description: 'Horizontal line separator',
    icon: <Minus className="h-5 w-5" />,
    category: 'layout',
  },
  {
    type: 'spacer',
    name: 'Spacer',
    description: 'Vertical spacing',
    icon: <Space className="h-5 w-5" />,
    category: 'layout',
  },
  
  // Media Blocks
  {
    type: 'image',
    name: 'Image',
    description: 'Single image with link',
    icon: <Image className="h-5 w-5" />,
    category: 'media',
  },
  {
    type: 'video',
    name: 'Video',
    description: 'Video thumbnail with link',
    icon: <Video className="h-5 w-5" />,
    category: 'media',
  },
  {
    type: 'social',
    name: 'Social Icons',
    description: 'Social media links',
    icon: <Share2 className="h-5 w-5" />,
    category: 'media',
  },
];

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  const contentBlocks = BLOCK_DEFINITIONS.filter(b => b.category === 'content');
  const layoutBlocks = BLOCK_DEFINITIONS.filter(b => b.category === 'layout');
  const mediaBlocks = BLOCK_DEFINITIONS.filter(b => b.category === 'media');

  const renderBlockButton = (block: BlockDefinition) => (
    <Button
      key={block.type}
      variant="ghost"
      className="w-full h-auto p-3 flex flex-col items-center gap-2 text-left hover:bg-accent"
      onClick={() => onAddBlock(block.type)}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
        {block.icon}
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium">{block.name}</div>
        <div className="text-xs text-muted-foreground leading-relaxed">
          {block.description}
        </div>
      </div>
    </Button>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Email Blocks
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Click to add blocks to your email
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Content Section */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
            Content
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {contentBlocks.map(renderBlockButton)}
          </div>
        </div>

        <Separator />

        {/* Layout Section */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
            Layout
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {layoutBlocks.map(renderBlockButton)}
          </div>
        </div>

        <Separator />

        {/* Media Section */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
            Media
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {mediaBlocks.map(renderBlockButton)}
          </div>
        </div>

        <Separator />

        {/* Advanced Blocks (Coming Soon) */}
        <div className="opacity-50">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
            Advanced
          </h4>
          <div className="space-y-2">
            <div className="p-3 border border-dashed rounded-lg text-center">
              <div className="text-xs text-muted-foreground">
                Product Cards
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Coming Soon
              </div>
            </div>
            <div className="p-3 border border-dashed rounded-lg text-center">
              <div className="text-xs text-muted-foreground">
                Countdown Timer
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Coming Soon
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}