import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  Mail,
  Clock,
  Eye,
  Save,
  Send,
  ArrowRight,
  ChevronDown,
  MoreVertical,
  Copy,
  MoveUp,
  MoveDown,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmailPreviewModal } from './EmailPreviewModal';
import { AudienceSelector, AudienceSelection, DEFAULT_AUDIENCE_SELECTION } from './AudienceSelector';

interface EmailCampaignSequenceBuilderProps {
  businessId: string;
  sequenceId?: string;
  onSave?: (sequenceId: string) => void;
  onCancel?: () => void;
}

interface SequenceStep {
  id?: string;
  step_order: number;
  name: string;
  subject: string;
  preview_text: string;
  content_html: string;
  delay_value: number;
  delay_unit: 'minutes' | 'hours' | 'days' | 'weeks';
  delay_from: 'enrollment' | 'previous';
  skip_weekends: boolean;
  is_active: boolean;
  isNew?: boolean;
}

interface VerifiedSender {
  id: string;
  email: string;
  name: string;
  is_default: boolean;
}

const DEFAULT_STEP: SequenceStep = {
  step_order: 1,
  name: '',
  subject: '',
  preview_text: '',
  content_html: '',
  delay_value: 0,
  delay_unit: 'days',
  delay_from: 'previous',
  skip_weekends: false,
  is_active: true,
  isNew: true,
};

const DELAY_PRESETS = [
  { label: 'Immediately', value: 0, unit: 'minutes' as const },
  { label: '1 hour', value: 1, unit: 'hours' as const },
  { label: '4 hours', value: 4, unit: 'hours' as const },
  { label: '1 day', value: 1, unit: 'days' as const },
  { label: '2 days', value: 2, unit: 'days' as const },
  { label: '3 days', value: 3, unit: 'days' as const },
  { label: '1 week', value: 1, unit: 'weeks' as const },
];

export function EmailCampaignSequenceBuilder({
  businessId,
  sequenceId,
  onSave,
  onCancel,
}: EmailCampaignSequenceBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sequence metadata
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState<AudienceSelection>(DEFAULT_AUDIENCE_SELECTION);
  const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null);

  // Steps
  const [steps, setSteps] = useState<SequenceStep[]>([{ ...DEFAULT_STEP }]);
  const [expandedSteps, setExpandedSteps] = useState<string[]>(['step-0']);

  // Preview
  const [previewStep, setPreviewStep] = useState<SequenceStep | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);

  // Fetch verified senders
  const { data: senders = [], isLoading: loadingSenders } = useQuery({
    queryKey: ['verified-senders', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verified_senders')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data as VerifiedSender[];
    },
    enabled: !!businessId,
  });

  // Set default sender
  useEffect(() => {
    if (senders.length > 0 && !selectedSenderId && !sequenceId) {
      const defaultSender = senders.find((s) => s.is_default) || senders[0];
      if (defaultSender) setSelectedSenderId(defaultSender.id);
    }
  }, [senders, selectedSenderId, sequenceId]);

  // Load existing sequence if editing
  useEffect(() => {
    if (sequenceId) {
      loadSequence(sequenceId);
    }
  }, [sequenceId]);

  const loadSequence = async (id: string) => {
    try {
      // Load sequence metadata
      const { data: sequence, error: seqError } = await supabase
        .from('email_campaign_sequences')
        .select('*')
        .eq('id', id)
        .single();

      if (seqError) throw seqError;

      if (sequence) {
        setName(sequence.name || '');
        setDescription(sequence.description || '');
        const targetType = sequence.target_type as string;
        setAudience({
          type: (targetType === 'all' || targetType === 'tags' || targetType === 'segment' || targetType === 'leads' || targetType === 'customers')
            ? targetType as AudienceSelection['type']
            : 'all',
          tags: sequence.target_tags || [],
          tagsMatch: 'any',
          segmentId: sequence.target_segment_id || null,
        });
      }

      // Load steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('email_campaign_sequence_steps')
        .select('*')
        .eq('sequence_id', id)
        .order('step_order');

      if (stepsError) throw stepsError;

      if (stepsData && stepsData.length > 0) {
        setSteps(
          stepsData.map((s) => ({
            id: s.id,
            step_order: s.step_order,
            name: s.name || '',
            subject: s.subject,
            preview_text: s.preview_text || '',
            content_html: s.content_html,
            delay_value: s.delay_value,
            delay_unit: s.delay_unit as 'minutes' | 'hours' | 'days' | 'weeks',
            delay_from: s.delay_from as 'enrollment' | 'previous',
            skip_weekends: s.skip_weekends,
            is_active: s.is_active,
          }))
        );
        setExpandedSteps([`step-0`]);
      }
    } catch (err) {
      console.error('Error loading sequence:', err);
      toast({
        title: 'Error',
        description: 'Failed to load sequence',
        variant: 'destructive',
      });
    }
  };

  // Add new step
  const addStep = () => {
    const newOrder = steps.length + 1;
    const newStep: SequenceStep = {
      ...DEFAULT_STEP,
      step_order: newOrder,
      delay_value: 1, // Default 1 day delay after first email
      delay_unit: 'days',
    };
    setSteps([...steps, newStep]);
    setExpandedSteps([`step-${steps.length}`]);
  };

  // Remove step
  const removeStep = (index: number) => {
    if (steps.length <= 1) {
      toast({
        title: 'Cannot Remove',
        description: 'Sequence must have at least one email',
        variant: 'destructive',
      });
      return;
    }
    const newSteps = steps.filter((_, i) => i !== index);
    // Reorder remaining steps
    newSteps.forEach((step, i) => {
      step.step_order = i + 1;
    });
    setSteps(newSteps);
  };

  // Duplicate step
  const duplicateStep = (index: number) => {
    const stepToCopy = steps[index];
    const newStep: SequenceStep = {
      ...stepToCopy,
      id: undefined,
      step_order: steps.length + 1,
      name: stepToCopy.name ? `${stepToCopy.name} (copy)` : '',
      isNew: true,
    };
    setSteps([...steps, newStep]);
    setExpandedSteps([`step-${steps.length}`]);
  };

  // Move step up/down
  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === steps.length - 1)
    ) {
      return;
    }
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    // Update step_order
    newSteps.forEach((step, i) => {
      step.step_order = i + 1;
    });
    setSteps(newSteps);
  };

  // Update step field
  const updateStep = (index: number, field: keyof SequenceStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  // Get formatted delay text
  const getDelayText = (step: SequenceStep, index: number) => {
    if (index === 0 && step.delay_value === 0) return 'Sent immediately';
    if (step.delay_value === 0) return 'Immediately after previous';

    const unit = step.delay_value === 1 ? step.delay_unit.slice(0, -1) : step.delay_unit;
    const fromText = step.delay_from === 'enrollment' ? 'after enrollment' : 'after previous email';
    return `${step.delay_value} ${unit} ${fromText}`;
  };

  // Calculate cumulative delay for timeline
  const getCumulativeDelay = (index: number): string => {
    if (index === 0) return 'Day 0';

    let totalMinutes = 0;
    for (let i = 0; i <= index; i++) {
      const step = steps[i];
      if (step.delay_from === 'previous' || i === 0) {
        switch (step.delay_unit) {
          case 'minutes':
            totalMinutes += step.delay_value;
            break;
          case 'hours':
            totalMinutes += step.delay_value * 60;
            break;
          case 'days':
            totalMinutes += step.delay_value * 60 * 24;
            break;
          case 'weeks':
            totalMinutes += step.delay_value * 60 * 24 * 7;
            break;
        }
      }
    }

    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);

    if (days === 0 && hours === 0) return 'Day 0';
    if (days === 0) return `${hours}h`;
    if (hours === 0) return `Day ${days}`;
    return `Day ${days}, ${hours}h`;
  };

  // Save sequence
  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Missing Name',
        description: 'Please enter a sequence name',
        variant: 'destructive',
      });
      return;
    }

    if (steps.some((s) => !s.subject.trim() || !s.content_html.trim())) {
      toast({
        title: 'Incomplete Emails',
        description: 'All emails must have a subject and content',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      let seqId = sequenceId;

      // Create or update sequence
      const sequenceData = {
        business_id: businessId,
        name,
        description,
        target_type: audience.type,
        target_tags: audience.type === 'tags' ? audience.tags : [],
        target_segment_id: audience.type === 'segment' ? audience.segmentId : null,
        status: 'draft',
      };

      if (seqId) {
        const { error } = await supabase
          .from('email_campaign_sequences')
          .update(sequenceData)
          .eq('id', seqId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('email_campaign_sequences')
          .insert(sequenceData)
          .select()
          .single();
        if (error) throw error;
        seqId = data.id;
      }

      // Delete existing steps and recreate (simpler than upsert for reordering)
      if (sequenceId) {
        await supabase
          .from('email_campaign_sequence_steps')
          .delete()
          .eq('sequence_id', sequenceId);
      }

      // Insert all steps
      const stepsToInsert = steps.map((step, index) => ({
        sequence_id: seqId,
        step_order: index + 1,
        name: step.name || null,
        subject: step.subject,
        preview_text: step.preview_text || null,
        content_html: step.content_html,
        delay_value: step.delay_value,
        delay_unit: step.delay_unit,
        delay_from: step.delay_from,
        skip_weekends: step.skip_weekends,
        is_active: step.is_active,
      }));

      const { error: stepsError } = await supabase
        .from('email_campaign_sequence_steps')
        .insert(stepsToInsert);

      if (stepsError) throw stepsError;

      toast({
        title: 'Sequence Saved',
        description: `${steps.length} email${steps.length > 1 ? 's' : ''} in sequence`,
      });

      queryClient.invalidateQueries({ queryKey: ['email-sequences'] });
      onSave?.(seqId!);
    } catch (err: any) {
      console.error('Error saving sequence:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to save sequence',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedSender = senders.find((s) => s.id === selectedSenderId);

  return (
    <div className="space-y-6">
      {/* Sequence Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Sequence Details
          </CardTitle>
          <CardDescription>Configure your email sequence settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seq-name">Sequence Name *</Label>
              <Input
                id="seq-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Welcome Series, Onboarding Drip"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender">Send From</Label>
              {loadingSenders ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading senders...</span>
                </div>
              ) : senders.length === 0 ? (
                <div className="flex items-center gap-2 p-3 border rounded-md bg-destructive/10">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">No verified senders configured</span>
                </div>
              ) : (
                <Select value={selectedSenderId || ''} onValueChange={setSelectedSenderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sender..." />
                  </SelectTrigger>
                  <SelectContent>
                    {senders.map((sender) => (
                      <SelectItem key={sender.id} value={sender.id}>
                        {sender.name} ({sender.email})
                        {sender.is_default && ' (Default)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this sequence..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Audience Selection */}
      <AudienceSelector
        businessId={businessId}
        value={audience}
        onChange={setAudience}
      />

      {/* Timeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Email Timeline
            </span>
            <Badge variant="outline">{steps.length} email{steps.length !== 1 ? 's' : ''}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {steps.map((step, index) => (
              <React.Fragment key={index}>
                <div
                  className={`flex-shrink-0 px-3 py-2 rounded-lg border ${
                    step.is_active
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-muted border-muted-foreground/20 opacity-50'
                  }`}
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    {getCumulativeDelay(index)}
                  </div>
                  <div className="text-sm font-medium truncate max-w-[120px]">
                    {step.name || step.subject || `Email ${index + 1}`}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
            <Button variant="outline" size="sm" onClick={addStep} className="flex-shrink-0">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Steps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Email Steps</h3>
          <Button onClick={addStep} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Email
          </Button>
        </div>

        <Accordion
          type="multiple"
          value={expandedSteps}
          onValueChange={setExpandedSteps}
          className="space-y-4"
        >
          {steps.map((step, index) => (
            <AccordionItem
              key={index}
              value={`step-${index}`}
              className="border rounded-lg bg-card"
            >
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3 w-full">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="secondary" className="w-8 justify-center">
                      {index + 1}
                    </Badge>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">
                      {step.name || step.subject || `Email ${index + 1}`}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {getDelayText(step, index)}
                      {!step.is_active && (
                        <Badge variant="outline" className="text-xs">
                          Disabled
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setPreviewStep(step); setIsPreviewOpen(true); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateStep(index)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      {index > 0 && (
                        <DropdownMenuItem onClick={() => moveStep(index, 'up')}>
                          <MoveUp className="h-4 w-4 mr-2" />
                          Move Up
                        </DropdownMenuItem>
                      )}
                      {index < steps.length - 1 && (
                        <DropdownMenuItem onClick={() => moveStep(index, 'down')}>
                          <MoveDown className="h-4 w-4 mr-2" />
                          Move Down
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => removeStep(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {/* Delay Settings */}
                  <div className="flex flex-wrap items-end gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-xs">Delay</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          value={step.delay_value}
                          onChange={(e) =>
                            updateStep(index, 'delay_value', parseInt(e.target.value) || 0)
                          }
                          className="w-20"
                        />
                        <Select
                          value={step.delay_unit}
                          onValueChange={(v) => updateStep(index, 'delay_unit', v)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Minutes</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                            <SelectItem value="weeks">Weeks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {index > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs">After</Label>
                        <Select
                          value={step.delay_from}
                          onValueChange={(v) => updateStep(index, 'delay_from', v)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="previous">Previous email</SelectItem>
                            <SelectItem value="enrollment">Enrollment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={step.skip_weekends}
                        onCheckedChange={(v) => updateStep(index, 'skip_weekends', v)}
                      />
                      <Label className="text-xs">Skip weekends</Label>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <Switch
                        checked={step.is_active}
                        onCheckedChange={(v) => updateStep(index, 'is_active', v)}
                      />
                      <Label className="text-xs">Active</Label>
                    </div>
                  </div>

                  {/* Quick Delay Presets */}
                  <div className="flex flex-wrap gap-2">
                    {DELAY_PRESETS.map((preset) => (
                      <Button
                        key={`${preset.value}-${preset.unit}`}
                        variant={
                          step.delay_value === preset.value && step.delay_unit === preset.unit
                            ? 'default'
                            : 'outline'
                        }
                        size="sm"
                        onClick={() => {
                          updateStep(index, 'delay_value', preset.value);
                          updateStep(index, 'delay_unit', preset.unit);
                        }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>

                  <Separator />

                  {/* Email Content */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Step Name (internal)</Label>
                      <Input
                        value={step.name}
                        onChange={(e) => updateStep(index, 'name', e.target.value)}
                        placeholder="e.g., Welcome email, Day 3 follow-up"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Preview Text</Label>
                      <Input
                        value={step.preview_text}
                        onChange={(e) => updateStep(index, 'preview_text', e.target.value)}
                        placeholder="Shown in email clients..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Subject Line *</Label>
                    <Input
                      value={step.subject}
                      onChange={(e) => updateStep(index, 'subject', e.target.value)}
                      placeholder="Email subject..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {'{{first_name}}'} for personalization
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Email Content *</Label>
                    <Textarea
                      value={step.content_html}
                      onChange={(e) => updateStep(index, 'content_html', e.target.value)}
                      placeholder="Write your email content (HTML supported)..."
                      rows={8}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Available tokens: {'{{first_name}}'}, {'{{last_name}}'}, {'{{email}}'}
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPreviewStep(step);
                        setIsPreviewOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Email
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={isSaving || !name.trim() || !selectedSenderId}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Sequence
            </>
          )}
        </Button>
      </div>

      {/* Preview Modal */}
      <EmailPreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        subject={previewStep?.subject || ''}
        content={previewStep?.content_html || ''}
        senderName={selectedSender?.name || 'Your Business'}
        senderEmail={selectedSender?.email || 'hello@example.com'}
      />
    </div>
  );
}
