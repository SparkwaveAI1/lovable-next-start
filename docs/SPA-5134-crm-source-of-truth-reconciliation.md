# SPA-5134 CRM Source-of-Truth Reconciliation

Issue: SPA-5134
Owner: Walter
Status: implemented in repository; no deploy/publish performed
Last updated: 2026-05-11

## Source-of-truth decision

SPA-4957 is complete. Its verified decision is that `/contacts` is the canonical current CRM surface.

Evidence from SPA-4957 comments:

- `contacts` has live, recent operational records across businesses: Fight Flow, PersonaAI, and Sparkwave.
- `sales_prospects` has 49,447 Sparkwave-only legacy/outbound rows.
- `crm_accounts`, `crm_deals`, `crm_interactions`, and `crm_documents` were verified empty.
- `/communications` remains the live activity/communication layer.

Decision applied for SPA-5134:

- CRM must not use `sales_prospects` as the primary contact source.
- CRM reads `contacts` scoped by `business_id`.
- CRM routes operators to `/contacts` for canonical record management and `/communications` for activity review.
- Legacy `/crm/:id` detail links no longer attempt to load `crm_accounts`; they redirect to `/contacts?contact=:id`.

## Repository changes

Changed files:

- `src/pages/CRM.tsx`
  - Replaced the legacy sales-prospect CRM implementation with a CRM control plane backed by `contacts`.
  - Added metrics over the selected business's canonical contacts.
  - Added source attribution summary from contact `source` values.
  - Added source-of-truth notice explaining SPA-4957 decision.
  - Added operational links to Contacts, Communications, Email Marketing, and Sales.
  - Contact row action now opens the exact canonical contact via `/contacts?contact=<id>`.

- `src/pages/Contacts.tsx`
  - Added deep-link support for `/contacts?contact=<id>`.
  - Fetches the requested contact by `business_id` + `id` even if it is not on the current paginated list.
  - Opens `ContactDetailDrawer` for the deep-linked contact.
  - Removes the `contact` query param when the drawer closes.

- `src/pages/AccountDetailPage.tsx`
  - Removed stale `crm_accounts` detail loading path.
  - Redirects `/crm/:id` to `/contacts?contact=:id`.
  - Redirects missing id back to `/crm`.

## Guardrails followed

- No production deploy.
- No publish.
- No destructive database changes.
- No client contact.
- No migrations.

## Verification

Completed:

- TypeScript syntax transpilation check passed for:
  - `src/pages/CRM.tsx`
  - `src/pages/Contacts.tsx`
  - `src/pages/AccountDetailPage.tsx`
- Static internal route/link scan passed:
  - 60 app routes detected
  - 35 internal static links/navigations checked
  - 0 missing routes found

Build note:

- `npm run build` was attempted twice and timed out during Vite transform after 600+ seconds.
- The build timeout occurred during repository-wide Vite transform, before any specific SPA-5134 code error was reported.

## Result

SPA-5134 target state is satisfied in code:

- Canonical source selected: `contacts`.
- CRM no longer depends on legacy `sales_prospects` for the primary CRM surface.
- CRM uses selected-business scoping via `contacts.business_id`.
- Stale `/crm/:id` account-detail route now resolves to the canonical contact route.
- Internal nav href scan found no broken app routes.
