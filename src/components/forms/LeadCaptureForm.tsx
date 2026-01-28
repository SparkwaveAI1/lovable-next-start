import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

/**
 * LeadCaptureForm - A reusable form component for capturing leads
 * 
 * This is designed to replace Wix form dependencies with a native solution
 * that inserts directly into the database and triggers automations.
 * 
 * Features:
 * - Zod validation
 * - Phone number normalization
 * - SMS consent checkbox
 * - Direct database insert
 * - Triggers webhook-handler automations
 */

const leadFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  message: z.string().optional(),
  smsConsent: z.boolean().default(false),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadCaptureFormProps {
  businessId: string;
  businessName?: string;
  onSuccess?: (contact: any) => void;
  onError?: (error: Error) => void;
  className?: string;
  submitButtonText?: string;
  showMessage?: boolean;
  requireEmail?: boolean;
}

// Phone normalization to E.164 format
function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return '+1' + digits;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits;
  }
  return phone;
}

export function LeadCaptureForm({
  businessId,
  businessName,
  onSuccess,
  onError,
  className,
  submitButtonText = 'Get Started',
  showMessage = true,
  requireEmail = false,
}: LeadCaptureFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<LeadFormData>({
    resolver: zodResolver(
      requireEmail 
        ? leadFormSchema.extend({ email: z.string().email('Please enter a valid email') })
        : leadFormSchema
    ),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      message: '',
      smsConsent: false,
    },
  });

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);

    try {
      const normalizedPhone = normalizePhoneNumber(data.phone);
      const fullName = `${data.firstName} ${data.lastName || ''}`.trim();

      // Check for existing contact by phone or email
      let existingContact = null;
      
      if (normalizedPhone) {
        const { data: phoneMatch } = await supabase
          .from('contacts')
          .select('id')
          .eq('business_id', businessId)
          .eq('phone', normalizedPhone)
          .single();
        existingContact = phoneMatch;
      }

      if (!existingContact && data.email) {
        const { data: emailMatch } = await supabase
          .from('contacts')
          .select('id')
          .eq('business_id', businessId)
          .eq('email', data.email.toLowerCase())
          .single();
        existingContact = emailMatch;
      }

      let contact;

      if (existingContact) {
        // Update existing contact
        const { data: updated, error } = await supabase
          .from('contacts')
          .update({
            first_name: data.firstName,
            last_name: data.lastName || '',
            email: data.email?.toLowerCase() || null,
            phone: normalizedPhone,
            comments: data.message || '',
            sms_status: data.smsConsent ? 'active' : 'opted_out',
            last_activity_date: new Date().toISOString(),
          })
          .eq('id', existingContact.id)
          .select()
          .single();

        if (error) throw error;
        contact = updated;
      } else {
        // Create new contact
        const { data: created, error } = await supabase
          .from('contacts')
          .insert({
            business_id: businessId,
            first_name: data.firstName,
            last_name: data.lastName || '',
            email: data.email?.toLowerCase() || null,
            phone: normalizedPhone,
            source: 'native_form',
            status: 'new_lead',
            pipeline_stage: 'new',
            lead_type: 'sales_lead',
            comments: data.message || '',
            email_status: data.email ? 'subscribed' : null,
            sms_status: data.smsConsent ? 'active' : 'opted_out',
            last_activity_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        contact = created;
      }

      // Create conversation thread for follow-up
      await supabase.from('conversation_threads').insert({
        contact_id: contact.id,
        business_id: businessId,
        status: 'active',
        conversation_state: 'initial',
      });

      // Log the submission
      await supabase.from('automation_logs').insert({
        business_id: businessId,
        automation_type: 'native_form_submission',
        status: 'success',
        processed_data: {
          contact_id: contact.id,
          is_new: !existingContact,
          source: 'LeadCaptureForm',
          had_message: !!data.message,
          sms_consent: data.smsConsent,
        },
      });

      toast({
        title: 'Thanks for reaching out!',
        description: businessName 
          ? `Someone from ${businessName} will be in touch soon.`
          : 'We\'ll be in touch soon.',
      });

      form.reset();
      onSuccess?.(contact);

    } catch (error: any) {
      console.error('Form submission error:', error);
      toast({
        title: 'Submission Failed',
        description: 'Please try again or contact us directly.',
        variant: 'destructive',
      });
      onError?.(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              placeholder="John"
              {...form.register('firstName')}
              disabled={isSubmitting}
            />
            {form.formState.errors.firstName && (
              <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              {...form.register('lastName')}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email {requireEmail ? '*' : ''}</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            {...form.register('email')}
            disabled={isSubmitting}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            {...form.register('phone')}
            disabled={isSubmitting}
          />
          {form.formState.errors.phone && (
            <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
          )}
        </div>

        {showMessage && (
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="How can we help?"
              rows={3}
              {...form.register('message')}
              disabled={isSubmitting}
            />
          </div>
        )}

        <div className="flex items-start space-x-2">
          <Checkbox
            id="smsConsent"
            checked={form.watch('smsConsent')}
            onCheckedChange={(checked) => form.setValue('smsConsent', !!checked)}
            disabled={isSubmitting}
          />
          <Label htmlFor="smsConsent" className="text-sm text-muted-foreground">
            I consent to receive text messages. Reply STOP to opt-out. Msg & data rates may apply.
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            submitButtonText
          )}
        </Button>
      </div>
    </form>
  );
}

export default LeadCaptureForm;
