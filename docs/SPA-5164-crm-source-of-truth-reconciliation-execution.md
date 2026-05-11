# SPA-5164 CRM Source-of-Truth Reconciliation Execution

Issue: SPA-5164
Owner: Walter
Status: implemented in repository; no deploy/publish performed
Last updated: 2026-05-11

## Scope executed

SPA-5164 asked to verify, dedupe, and rebuild `/crm` around Contacts + Communications after the CRM source-of-truth unblock.

The implemented repository state does that without production data mutation:

- `/crm` is now a control-plane surface backed by the canonical `contacts` table.
- `/crm` no longer uses `sales_prospects` as the primary CRM source.
- CRM queries are scoped by `contacts.business_id` from the selected business context.
- CRM shows selected-business contact metrics, pipeline contact counts, recent activity coverage, reachable-record counts, and source attribution from `contacts.source`.
- CRM routes operators to `/contacts` for canonical record management and `/communications` for activity review.
- CRM row actions open the exact canonical contact via `/contacts?contact=<id>`.
- Legacy `/crm/:id` routes redirect to `/contacts?contact=:id` instead of trying to load stale/empty CRM account data.
- `/contacts` supports `?contact=<id>` deep links and opens the contact detail drawer for the requested canonical contact.

## Dedupe/source-of-truth decision applied

Repository/reference evidence used:

- `docs/SPA-5134-crm-source-of-truth-reconciliation.md`
- `docs/SPA-5029-contacts-crm-reconciliation-reference-model.md`
- `docs/contacts-crm-reconciliation-reference-model.md`

Applied decision:

- Canonical person records live in `contacts`.
- Communications/activity review lives in `/communications`.
- Legacy outbound/prospect data (`sales_prospects`) is not the primary CRM source.
- Empty CRM account/deal/interactions/documents paths are not used as the canonical source of truth.
- No duplicate production rows were merged or deleted in this execution.

## Files changed

- `src/pages/CRM.tsx`
  - Rebuilt CRM from legacy prospect CRUD into a canonical contacts control plane.
  - Added Contacts, Communications, Email Marketing, and Sales handoff actions.
  - Added source-of-truth notice and operational metrics.
  - Fixed reachable-record metric to count the email-or-phone union, not the max of two separate counts.

- `src/pages/Contacts.tsx`
  - Added `/contacts?contact=<id>` deep-link support.
  - Fetches deep-linked contacts by selected `business_id` + contact `id` even when not visible on the current page.
  - Opens the contact drawer for the deep-linked contact and clears the query param when closed.

- `src/pages/AccountDetailPage.tsx`
  - Redirects stale `/crm/:id` account-detail requests to the canonical contact detail route.

## Guardrails followed

- No production deploy.
- No publish.
- No destructive database changes.
- No contact deletion/merge mutation.
- No migrations.
- No external/client messages.

## Verification

Completed locally:

- ESLint passed for touched TSX files:
  - `src/pages/CRM.tsx`
  - `src/pages/Contacts.tsx`
  - `src/pages/AccountDetailPage.tsx`
- Static route existence checked for `/contacts`, `/communications`, `/email-marketing`, `/sales`, `/crm`, and `/crm/:id` in `src/App.tsx`.

Build note:

- `npm run build` was attempted but timed out in this environment during repository-wide Vite/TypeScript processing before producing a SPA-5164-specific code error.
- File-scoped ESLint passed after the final CRM metric fix.

## Commits

- `d1524e8` — Rebuild CRM around canonical contacts (`src/pages/CRM.tsx`)
- `b61b9bf` — Rebuild CRM around canonical contacts (`src/pages/Contacts.tsx`, `src/pages/AccountDetailPage.tsx`)
- `394cd6e` — Fix CRM reachable metric (`src/pages/CRM.tsx`)
