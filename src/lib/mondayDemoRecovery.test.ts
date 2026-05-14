import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('Monday demo recovery artifacts', () => {
  it('ships lead dashboard demo seed data with required board stages', () => {
    const path = 'src/lib/lead-dashboard-demo-seed.ts';

    expect(existsSync(resolve(root, path))).toBe(true);
    const source = read(path);

    for (const label of ['New Leads', 'Stale Leads', 'Booked', 'Missed']) {
      expect(source).toContain(label);
    }
  });

  it('wires DealPipeline to the demo seed fallback for empty deal data', () => {
    const source = read('src/pages/DealPipeline.tsx');

    expect(source).toContain('getLeadDashboardDemoSeedDeals');
    expect(source).toContain('New Leads');
    expect(source).toContain('Stale Leads');
  });

  it('keeps speed-to-lead business context helper available for the Fight Flow view', () => {
    const path = 'src/lib/fight-flow-business-context.ts';

    expect(existsSync(resolve(root, path))).toBe(true);
    expect(read(path)).toContain('getFightFlowBusinessContext');
  });

  it('ships a selected-business Speed-to-Lead view and route', () => {
    const pagePath = 'src/pages/SpeedToLead.tsx';
    const app = read('src/App.tsx');
    const sidebar = read('src/components/Sidebar.tsx');

    expect(existsSync(resolve(root, pagePath))).toBe(true);
    expect(read(pagePath)).toContain('useBusinessContext');
    expect(read(pagePath)).toContain('Raw Lead');
    expect(read(pagePath)).toContain('Instant Reply Sent');
    expect(read(pagePath)).toContain('5-min Follow-Up');
    expect(read(pagePath)).toContain('Booked / Human Handoff');
    expect(app).toContain('path="/speed-to-lead"');
    expect(sidebar).toContain('href: "/speed-to-lead"');
  });

  it('supports both /growth-hub and /ai-growth-hub routes for the AI Growth Hub shell', () => {
    const app = read('src/App.tsx');
    const sidebar = read('src/components/Sidebar.tsx');

    expect(app).toContain('path="/ai-growth-hub"');
    expect(app).toContain('path="/growth-hub"');
    expect(sidebar).toContain('href: "/ai-growth-hub"');
  });
});
