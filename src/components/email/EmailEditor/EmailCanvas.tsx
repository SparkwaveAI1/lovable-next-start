import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Copy,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { EmailBlock, GlobalStyles, PreviewMode } from './types';
import { BlockRenderer } from './BlockRenderer';
import { cn } from '@/lib/utils';

interface EmailCanvasProps {
  blocks: EmailBlock[];
  globalStyles: GlobalStyles;
  selectedBlockId: string | null;
  previewMode: PreviewMode;
  onBlockSelect: (blockId: string) => void;
  onBlockUpdate: (blockId: string, updates: Partial<EmailBlock>) => void;
  onBlockRemove: (blockId: string) => void;
  onBlockDuplicate: (blockId: string) => void;
}

interface SortableBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  globalStyles: GlobalStyles;
  onSelect: () => void;
  onUpdate: (updates: Partial<EmailBlock>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

function SortableBlock({
  block,
  isSelected,
  globalStyles,
  onSelect,
  onUpdate,
  onRemove,
  onDuplicate,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative",
        isDragging && "opacity-50 z-50"
      )}
    >
      {/* Block Wrapper with Selection and Hover States */}
      <div
        className={cn(
          "relative border-2 border-transparent rounded-lg transition-all duration-200",
          isSelected && "border-primary bg-primary/5",
          "hover:border-primary/50 hover:shadow-sm cursor-pointer"
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelect();
        }}
      >
        {/* Drag Handle and Actions */}
        <div className={cn(
          "absolute -left-12 top-0 flex flex-col gap-1 opacity-0 transition-opacity",
          "group-hover:opacity-100",
          isSelected && "opacity-100"
        )}>
          {/* Drag Handle */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 cursor-grab active:cursor-grabbing bg-background"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>

          {/* Block Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-background"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Block Content */}
        <div className="p-2">
          <BlockRenderer
            block={block}
            globalStyles={globalStyles}
            isEditing={isSelected}
            onChange={onUpdate}
          />
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute -top-6 left-0">
            <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md font-medium">
              {block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block
            </div>
          </div>
        )}
      </div>

      {/* Drop Indicator */}
      <div className="h-2 flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity">
        <div className="w-full h-px bg-primary/30"></div>
        <div className="absolute bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
          Drop here
        </div>
      </div>
    </div>
  );
}

export function EmailCanvas({
  blocks,
  globalStyles,
  selectedBlockId,
  previewMode,
  onBlockSelect,
  onBlockUpdate,
  onBlockRemove,
  onBlockDuplicate,
}: EmailCanvasProps) {
  const canvasMaxWidth = previewMode === 'mobile' ? '375px' : globalStyles.maxWidth;

  return (
    <div className="flex-1 overflow-y-auto bg-muted/30 p-8">
      {/* Email Preview Container */}
      <div className="mx-auto transition-all duration-300" style={{ maxWidth: canvasMaxWidth }}>
        <Card className="bg-background shadow-lg">
          {/* Email Header */}
          <div className="border-b bg-muted/50 p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>Email Preview</div>
              <div className="flex items-center gap-2">
                {previewMode === 'mobile' ? (
                  <Smartphone className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
                {previewMode.charAt(0).toUpperCase() + previewMode.slice(1)}
              </div>
            </div>
          </div>

          {/* Email Content Area */}
          <div 
            className="relative"
            style={{
              backgroundColor: globalStyles.backgroundColor,
              fontFamily: globalStyles.fontFamily,
              color: globalStyles.textColor,
              padding: globalStyles.padding,
            }}
            onClick={(e) => {
              // Deselect blocks when clicking empty area
              if (e.target === e.currentTarget) {
                onBlockSelect('');
              }
            }}
          >
            {blocks.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <Eye className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-2">Start Building Your Email</h3>
                    <p className="text-sm max-w-md mx-auto">
                      Select blocks from the palette on the left to start designing your email campaign.
                      Click on any block to customize its content and styling.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    globalStyles={globalStyles}
                    onSelect={() => onBlockSelect(block.id)}
                    onUpdate={(updates) => onBlockUpdate(block.id, updates)}
                    onRemove={() => onBlockRemove(block.id)}
                    onDuplicate={() => onBlockDuplicate(block.id)}
                  />
                ))}
              </div>
            )}

            {/* Add Block Drop Zone at Bottom */}
            {blocks.length > 0 && (
              <div className="mt-8 pt-4 border-t border-dashed border-muted-foreground/30">
                <div className="text-center text-sm text-muted-foreground py-4">
                  Drag blocks here to add them to the end of your email
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Email Footer Preview */}
        <div className="mt-4 text-xs text-muted-foreground text-center space-y-1">
          <div>This email was sent by Your Business Name</div>
          <div>
            <a href="#" className="underline">Unsubscribe</a> | 
            <a href="#" className="underline ml-1">Update Preferences</a>
          </div>
        </div>
      </div>

      {/* Canvas Controls */}
      <div className="fixed bottom-6 right-6 flex items-center gap-2">
        <Card className="p-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div>Zoom:</div>
            <Button variant="ghost" size="sm">
              100%
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}