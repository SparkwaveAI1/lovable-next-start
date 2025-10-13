import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, RotateCcw, Loader2 } from 'lucide-react';

export function AgentPromptEditor() {
  const { selectedBusiness } = useBusinessContext();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [originalKnowledge, setOriginalKnowledge] = useState('');

  // Load config when business changes
  useEffect(() => {
    if (selectedBusiness) {
      loadConfig();
    }
  }, [selectedBusiness]);

  const loadConfig = async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agent_configurations')
        .select('system_prompt, knowledge_base')
        .eq('business_id', selectedBusiness.id)
        .single();

      if (error) {
        console.error('Failed to load config:', error);
        toast({
          title: 'Error',
          description: 'Failed to load agent configuration',
          variant: 'destructive',
        });
        return;
      }

      if (data) {
        setSystemPrompt(data.system_prompt || '');
        setKnowledgeBase(data.knowledge_base || '');
        setOriginalPrompt(data.system_prompt || '');
        setOriginalKnowledge(data.knowledge_base || '');
      }
    } catch (error) {
      console.error('Load config error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load configuration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedBusiness) return;

    if (!systemPrompt.trim()) {
      toast({
        title: 'Validation Error',
        description: 'System prompt cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('agent_configurations')
        .update({
          system_prompt: systemPrompt,
          knowledge_base: knowledgeBase || null,
        })
        .eq('business_id', selectedBusiness.id);

      if (error) {
        console.error('Save error:', error);
        toast({
          title: 'Error',
          description: 'Failed to save configuration',
          variant: 'destructive',
        });
        return;
      }

      setOriginalPrompt(systemPrompt);
      setOriginalKnowledge(knowledgeBase);
      
      toast({
        title: 'Success',
        description: 'Agent configuration saved successfully',
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSystemPrompt(originalPrompt);
    setKnowledgeBase(originalKnowledge);
    toast({
      title: 'Reset',
      description: 'Changes discarded',
    });
  };

  const hasChanges = systemPrompt !== originalPrompt || knowledgeBase !== originalKnowledge;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!selectedBusiness) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Business Selected</CardTitle>
          <CardDescription>Please select a business to edit its agent configuration</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Configuration for {selectedBusiness.name}</CardTitle>
        <CardDescription>
          Edit the system prompt and knowledge base to control how the AI generates content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="system-prompt">System Prompt</Label>
          <Textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={20}
            className="font-mono text-sm"
            placeholder="Enter the system prompt that guides AI behavior..."
          />
          <p className="text-xs text-muted-foreground">
            {systemPrompt.length} characters - This is the core instruction set for content generation
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="knowledge-base">Knowledge Base (Optional)</Label>
          <Textarea
            id="knowledge-base"
            value={knowledgeBase}
            onChange={(e) => setKnowledgeBase(e.target.value)}
            rows={8}
            className="font-mono text-sm"
            placeholder="Additional context, facts, or guidelines..."
          />
          <p className="text-xs text-muted-foreground">
            {knowledgeBase.length} characters - Extra context added to each content generation request
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasChanges} 
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
          <Button 
            onClick={handleReset} 
            variant="outline" 
            className="gap-2"
            disabled={!hasChanges}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        {hasChanges && (
          <p className="text-sm text-amber-600">
            ⚠️ You have unsaved changes
          </p>
        )}
      </CardContent>
    </Card>
  );
}
