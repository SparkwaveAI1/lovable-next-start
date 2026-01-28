# Sparkwave Automation

Central automation/CRM platform for managing multiple businesses.

## 🏢 Supported Businesses

- **Fight Flow Academy** — Martial arts gym
- **Sparkwave AI** — AI automation solutions
- **PersonaAI** — AI persona generation
- **CharX World** — Character creation platform

## 🚀 Features

### Content Management
- AI-powered content generation
- Multi-platform scheduling (Twitter, Instagram, TikTok, LinkedIn, Facebook)
- Media library with tagging
- Later.com (Late.dev) integration

### CRM & Contacts
- Lead capture and management
- Contact deduplication (HubSpot-style)
- Tag-based segmentation
- Pipeline stages

### Communications
- SMS (Twilio) with AI responses
- Email campaigns (Resend)
- Conversation threading
- Automated follow-ups

### Lead Capture
- Native form components (replacing Wix dependency)
- Webhook support for external forms
- SMS consent management

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Integrations**: Twilio, Resend, Late.dev

## 📁 Project Structure

```
src/
├── components/
│   ├── forms/           # Native form components
│   ├── email/           # Email campaign UI
│   ├── media/           # Media library components
│   └── ui/              # shadcn components
├── pages/
│   ├── ContentCenter    # Content generation/scheduling
│   ├── Contacts         # CRM
│   ├── EmailMarketing   # Campaigns
│   ├── MediaLibraryPage # Asset management
│   └── ...
├── hooks/               # Custom React hooks
├── contexts/            # React contexts
└── integrations/        # Supabase client

supabase/functions/
├── send-sms/           # Twilio SMS with retry
├── send-email/         # Resend email with retry
├── post-via-late/      # Social posting with retry
├── sms-webhook/        # Inbound SMS handling
├── webhook-handler/    # Form submission processing
├── ai-response/        # AI conversation responses
├── content-scheduler/  # Scheduled posting
└── _shared/            # Shared utilities (retry, crypto)
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Deploy edge functions
supabase functions deploy
```

## 📝 Recent Improvements (2026-01-28)

- Added retry logic with exponential backoff to SMS, email, and social posting
- Fixed conversation dropping issue (SMS responses now retry)
- Migrated from hardcoded businesses to dynamic database loading
- Created LeadCaptureForm component as foundation for Wix replacement

## 🔗 Links

- **Lovable Project**: https://lovable.dev/projects/f97adaaf-ee4f-485f-bffc-6f3affc80d54
- **Live App**: sparkwaveai.app
