import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('Scott-visible app corrections', () => {
  it('Executive Control Agent Health uses current agents and excludes retired agents', () => {
    const agentHealth = source('src/components/mission-control/AgentHealthPanel.tsx');

    ['Abby', 'Arlo', 'Dev', 'Edna', 'Opal'].forEach((retiredAgent) => {
      expect(agentHealth).not.toContain(`name: "${retiredAgent}"`);
      expect(agentHealth).not.toContain(`label: "${retiredAgent}"`);
    });
    expect(agentHealth).not.toContain('iris:');

    [
      'Rico',
      'PM',
      'Researcher',
      'FightFlow Monitor',
      'Strategist',
      'Larry',
      'Email List Manager',
      'SEO Specialist',
      'Analytics RevOps',
      'Media Buyer',
      'Client Success',
      'Jerry',
    ].forEach((activeAgent) => {
      expect(agentHealth).toContain(`name: "${activeAgent}"`);
    });
  });

  it('CRM Prospect Pipeline is scoped to real FightFlow pipeline leads instead of all imported contacts', () => {
    const crm = source('src/pages/CRM.tsx');

    expect(crm).toContain('isActivePipelineProspect');
    expect(crm).toContain("const pipelineProspects = prospects.filter(isActivePipelineProspect);");
    expect(crm).toContain('FightFlow Academy');
    expect(crm).toContain('Other businesses do not have active leads yet');
    expect(crm).not.toContain('`${prospects.length.toLocaleString()} prospects across all brands`');
  });

  it('trial classes live in Bookings, not Executive Control', () => {
    const executiveControl = source('src/pages/ExecutiveControl.tsx');
    const bookings = source('src/pages/Bookings.tsx');

    expect(executiveControl).not.toContain("Today's Trial Classes");
    expect(bookings).toContain("Today's Trial Classes");
  });

  it('raw submissions are labeled review queue, not service requests', () => {
    const serviceRequests = source('src/pages/ServiceRequests.tsx');
    const sidebar = source('src/components/Sidebar.tsx');
    const header = source('src/components/DashboardHeader.tsx');
    const breadcrumbs = source('src/components/layout/Breadcrumbs.tsx');

    expect(serviceRequests).toContain('Submission Review Queue');
    expect(serviceRequests).toContain('Review intake submissions');
    expect(serviceRequests).not.toContain('Manage freeze and cancellation requests');
    expect(sidebar).toContain('Review Queue');
    expect(header).toContain('Review Queue');
    expect(breadcrumbs).toContain('Review Queue');
  });
});
