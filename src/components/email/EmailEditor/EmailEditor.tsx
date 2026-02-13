import React, { useState, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Monitor, Smartphone, Undo, Redo, Settings } from 'lucide-react';
import { BlockPalette } from './BlockPalette';
import { EmailCanvas } from './EmailCanvas';
import { BlockSettings } from './BlockSettings';
import { GlobalSettings } from './GlobalSettings';
import { EmailBlock, EmailEditorState, BlockType, GlobalStyles, PreviewMode } from './types';
import { generateBlockId, generateEmailHtml } from './utils';

interface EmailEditorProps {
  value: EmailEditorState;
  onChange: (state: EmailEditorState) => void;
  className?: string;
}

const DEFAULT_GLOBAL_STYLES: GlobalStyles = {
  fontFamily: 'Inter, sans-serif',
  backgroundColor: '#ffffff',
  primaryColor: '#2563eb',
  textColor: '#111827',
  linkColor: '#2563eb',
  maxWidth: '600px',
  padding: '20px',
};

export function EmailEditor({ value, onChange, className }: EmailEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [history, setHistory] = useState<EmailEditorState[]>([value]);

  const currentState = useMemo(() => value, [value]);

  // History management
  const saveToHistory = useCallback((newState: EmailEditorState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ ...newState });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const updateState = useCallback((updates: Partial<EmailEditorState>) => {
    const newState = { ...currentState, ...updates };
    onChange(newState);
    saveToHistory(newState);
  }, [currentState, onChange, saveToHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onChange(prevState);
    }
  }, [history, historyIndex, onChange]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onChange(nextState);
    }
  }, [history, historyIndex, onChange]);

  // Block management
  const addBlock = useCallback((type: BlockType, position?: number) => {
    const newBlock: EmailBlock = {
      id: generateBlockId(),
      type,
      content: getDefaultBlockContent(type),
      styles: getDefaultBlockStyles(type),
    };

    const insertPosition = position ?? currentState.blocks.length;
    const newBlocks = [...currentState.blocks];
    newBlocks.splice(insertPosition, 0, newBlock);

    updateState({ blocks: newBlocks });
    setSelectedBlockId(newBlock.id);
  }, [currentState.blocks, updateState]);

  const updateBlock = useCallback((id: string, updates: Partial<EmailBlock>) => {
    const newBlocks = currentState.blocks.map(block =>
      block.id === id ? { ...block, ...updates } : block
    );
    updateState({ blocks: newBlocks });
  }, [currentState.blocks, updateState]);

  const removeBlock = useCallback((id: string) => {
    const newBlocks = currentState.blocks.filter(block => block.id !== id);
    updateState({ blocks: newBlocks });
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  }, [currentState.blocks, updateState, selectedBlockId]);

  const duplicateBlock = useCallback((id: string) => {
    const blockToDuplicate = currentState.blocks.find(block => block.id === id);
    if (!blockToDuplicate) return;

    const duplicatedBlock: EmailBlock = {
      ...blockToDuplicate,
      id: generateBlockId(),
    };

    const originalIndex = currentState.blocks.findIndex(block => block.id === id);
    const newBlocks = [...currentState.blocks];
    newBlocks.splice(originalIndex + 1, 0, duplicatedBlock);

    updateState({ blocks: newBlocks });
    setSelectedBlockId(duplicatedBlock.id);
  }, [currentState.blocks, updateState]);

  const moveBlock = useCallback((id: string, newPosition: number) => {
    const oldIndex = currentState.blocks.findIndex(block => block.id === id);
    if (oldIndex === -1) return;

    const newBlocks = arrayMove(currentState.blocks, oldIndex, newPosition);
    updateState({ blocks: newBlocks });
  }, [currentState.blocks, updateState]);

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over logic if needed
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = currentState.blocks.findIndex(block => block.id === active.id);
      const newIndex = currentState.blocks.findIndex(block => block.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        moveBlock(active.id as string, newIndex);
      }
    }
  };

  const handleBlockSelect = useCallback((blockId: string) => {
    setSelectedBlockId(blockId);
  }, []);

  const handleGlobalStylesChange = useCallback((styles: Partial<GlobalStyles>) => {
    updateState({ 
      globalStyles: { 
        ...currentState.globalStyles, 
        ...styles 
      } 
    });
  }, [currentState.globalStyles, updateState]);

  const selectedBlock = currentState.blocks.find(block => block.id === selectedBlockId);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={historyIndex <= 0}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
          >
            <Redo className="h-4 w-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGlobalSettings(!showGlobalSettings)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Global Settings
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={previewMode === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPreviewMode('desktop')}
          >
            <Monitor className="h-4 w-4 mr-1" />
            Desktop
          </Button>
          <Button
            variant={previewMode === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPreviewMode('mobile')}
          >
            <Smartphone className="h-4 w-4 mr-1" />
            Mobile
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex min-h-0">
        {/* Block Palette */}
        <div className="w-64 border-r bg-muted/30 overflow-y-auto">
          <BlockPalette onAddBlock={addBlock} />
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={currentState.blocks.map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <EmailCanvas
                blocks={currentState.blocks}
                globalStyles={currentState.globalStyles}
                selectedBlockId={selectedBlockId}
                previewMode={previewMode}
                onBlockSelect={handleBlockSelect}
                onBlockUpdate={updateBlock}
                onBlockRemove={removeBlock}
                onBlockDuplicate={duplicateBlock}
              />
            </SortableContext>
          </DndContext>
        </div>

        {/* Settings Panel */}
        <div className="w-80 border-l bg-background overflow-y-auto">
          {showGlobalSettings ? (
            <GlobalSettings
              styles={currentState.globalStyles}
              onChange={handleGlobalStylesChange}
              onClose={() => setShowGlobalSettings(false)}
            />
          ) : selectedBlock ? (
            <BlockSettings
              block={selectedBlock}
              globalStyles={currentState.globalStyles}
              onChange={(updates) => updateBlock(selectedBlock.id, updates)}
              onRemove={() => removeBlock(selectedBlock.id)}
              onDuplicate={() => duplicateBlock(selectedBlock.id)}
            />
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <p>Select a block to edit its properties, or click Global Settings to customize the overall email design.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getDefaultBlockContent(type: BlockType): any {
  switch (type) {
    case 'text':
      return '<p>Add your text here...</p>';
    case 'image':
      return { src: '', alt: '', href: '' };
    case 'button':
      return { text: 'Click here', href: '#', style: 'primary' };
    case 'divider':
      return { color: '#e5e7eb', thickness: 1 };
    case 'spacer':
      return { height: 20 };
    case 'columns':
      return { 
        layout: '2-column', 
        columns: [
          { content: '<p>Column 1 content</p>' },
          { content: '<p>Column 2 content</p>' }
        ]
      };
    case 'social':
      return {
        platforms: [
          { name: 'facebook', url: '', icon: 'facebook' },
          { name: 'twitter', url: '', icon: 'twitter' },
          { name: 'instagram', url: '', icon: 'instagram' }
        ]
      };
    case 'video':
      return { 
        videoUrl: '', 
        thumbnailUrl: '', 
        title: 'Video Title' 
      };
    default:
      return '';
  }
}

function getDefaultBlockStyles(type: BlockType): any {
  const baseStyles = {
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: '20px',
    paddingRight: '20px',
  };

  switch (type) {
    case 'text':
      return {
        ...baseStyles,
        fontSize: '16px',
        lineHeight: '1.5',
        color: '#111827',
        textAlign: 'left',
      };
    case 'button':
      return {
        ...baseStyles,
        backgroundColor: '#2563eb',
        color: '#ffffff',
        borderRadius: '6px',
        padding: '12px 24px',
        textAlign: 'center',
      };
    default:
      return baseStyles;
  }
}