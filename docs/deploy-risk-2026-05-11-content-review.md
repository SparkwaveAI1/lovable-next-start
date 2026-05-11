# Deploy risk — 2026-05-11 content review slice

Scope:
- Content review approval path in `src/pages/ContentReviewPage.tsx`
- Top navigation route cleanup in `src/components/DashboardHeader.tsx`

Verification run:
- `npm test -- --run src/pages/ContentReviewPage.test.ts` — passed
- `npx eslint src/pages/ContentReviewPage.tsx src/pages/ContentReviewPage.test.ts src/components/DashboardHeader.tsx` — passed
- `npm run build` — passed

Known risk:
- Full `npm run lint` still fails on pre-existing repository-wide lint debt outside this slice. Do not treat full-lint failure as introduced by this change.
- Production bundle remains large (`index-*.js` > 500 kB). Vite build completes, but future code-splitting should be planned before using this as a deployment health signal.
- No deployment was performed. Review the diff and build output before promoting.

Operational guardrail:
- `/content-review` approval now updates `content_queue` only. It does not insert into `scheduled_content`, publish externally, schedule, send, or invoke edge functions.
