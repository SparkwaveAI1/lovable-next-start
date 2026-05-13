# SPA-5912 — Demo-Safe Content/SEO Preview Module Recommendations

Date: 2026-05-13
Owner: SEO Specialist
Repo: /root/repos/lovable-next-start
Scope: recommendation artifact only; no code, publishing, tracking, Postiz, live outreach, or production-data actions.

## Recommendation

Build the Content/SEO preview as the smallest possible expansion-layer card inside the AI Growth Hub. It should prove that the Growth Hub can turn lead/customer questions into useful content ideas after the speed-to-lead system is understood.

Do not position this module as the main demo promise. The demo should still open on missed leads, faster response, follow-up visibility, and the Business Brain. Content/SEO is the “what we can add next once lead leakage is handled” surface.

## Recommended buyer-facing labels

Primary module label:
- Content Ideas

Secondary label variants by context:
- Local SEO Topics
- Customer Question Content
- Search & Content Ideas
- Content Expansion Preview

Avoid:
- Content OS
- SEO automation engine
- Programmatic SEO system
- Ranking machine
- Any label that implies publishing, rankings, or live campaign execution without approval

## Route placement

Recommended route relationship:
- Primary demo shell: /growth-hub
- Preview destination: /content-strategy
- Optional supporting/internal destinations: /content-hub, /content-review, /media-library

Placement in demo sequence:
1. /growth-hub opens the buyer story.
2. /crm shows lead visibility.
3. /fight-flow shows speed-to-lead/follow-up automation.
4. /analytics shows Business Brain recommendations.
5. /mission-control shows Ask Your Growth Agent.
6. /content-strategy appears as the final small expansion preview.

UI placement recommendation:
- Add or keep a single small “Content Ideas” card in /growth-hub under an “Expansion layer” or “Once follow-up is working” section.
- The card should link to /content-strategy and show 3-5 demo-safe bullets, not a full editorial calendar.
- If client-demo mode is implemented, keep Content/SEO below Lead Engine and Business Brain navigation.

## Minimal module shape

Card title:
- Content Ideas

Card subtitle:
- Turn common lead and customer questions into useful content topics.

Card proof points:
- Based on inquiries, follow-up gaps, and recurring questions.
- Helps plan education, FAQs, local SEO pages, and nurture topics.
- Requires approval before anything is published or scheduled.

Recommended CTA:
- Show content ideas from this week’s questions

Compliance/approval note:
- Demo-only ideas. Publishing, Postiz scheduling, website edits, tracking changes, customer-data imports, and public performance claims require explicit approval.

## Minimal preview item data shape

Each preview item should stay lightweight and approval-gated:
- Topic / content idea.
- Source signal: inquiry theme, recurring customer question, service area, seasonality, or Business Brain note.
- Suggested format: FAQ, blog post, local service page, email/social prompt, checklist, or nurture support asset.
- Approval needed: claim review, compliance review, location/service validation, offer/pricing approval, product availability confirmation, or no-live-send approval.
- Next action: draft brief, ask Growth Agent, add to backlog, or route to content review.

Keep the preview static/demo-safe until live client sources and approvals are connected.

## Recommended safety copy

Demo-safe examples only. Requires approved inputs before drafts, publishing, social scheduling, tracking changes, or performance claims.

## Vertical example bullets

### Med spa / aesthetic clinic

Recommended label:
- Before/After Content Ideas or Treatment Education Topics

Five demo-safe bullets:
- “What to expect before your first Botox consultation” from repeated consult-prep questions.
- “Laser hair removal safety FAQs” from common price, timing, and side-effect inquiries.
- “How to choose between facial treatments” for leads comparing options but not yet booked.
- “Seasonal skin care checklist for summer/winter” as a local nurture and SEO topic.
- “Consultation reminder + aftercare explainer” as a follow-up-support asset after booking.

### Home services

Recommended label:
- Local Service Content Ideas or Service Area SEO Topics

Five demo-safe bullets:
- “How fast should you respond to a roof leak?” from urgent estimate and missed-call inquiries.
- “HVAC replacement vs repair: questions to ask before booking an estimate.”
- “Service area page idea: [City] emergency roofing/repair checklist” for local SEO expansion.
- “What happens after you request an estimate?” to reduce no-shows and quote confusion.
- “Seasonal maintenance reminders” based on weather, demand spikes, and open quote patterns.

### Organic farm / Hood River Organic-style producer

Recommended label:
- Recipe & Education Ideas or Local Farm Content Ideas

Five demo-safe bullets:
- “What is in this week’s CSA box?” as a recurring customer education and nurture topic.
- “How to store seasonal produce so it lasts longer” from repeated customer questions.
- “Farm stand update: what is fresh this weekend” as a lightweight local search/social topic.
- “Wholesale buyer FAQ: availability, ordering, and pickup windows” from wholesale inquiries.
- “Recipe idea: simple seasonal dish using current harvest items” tied to product availability.

## Implementation guardrails

- Use demo-safe/static sample data unless a client explicitly approves live inputs.
- Do not imply rankings, revenue lift, booked appointments, or guaranteed content performance.
- Do not publish, schedule through Postiz, connect CMS, change metadata, or alter tracking as part of this slice.
- Keep the module smaller than the lead response and Business Brain surfaces.
- Make the copy sound like buyer outcomes, not internal architecture.

## Acceptance checklist

- Recommended labels are defined.
- Route placement is defined with /growth-hub as the shell and /content-strategy as the preview destination.
- Five example bullets are included for med spa, home services, and organic farm.
- Content/SEO is explicitly framed as expansion-layer only after speed-to-lead.
- No live publishing, tracking, Postiz, customer-data, or claims action is recommended.
