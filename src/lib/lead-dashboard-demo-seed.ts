export interface LeadDashboardDemoDeal {
  id: string;
  title: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  value: number | null;
  probability: number | null;
  expected_close_date: string | null;
  notes: string | null;
  account_id: string;
  created_at: string | null;
  updated_at: string | null;
}

const demoUpdatedAt = '2026-05-13T18:00:00.000Z';

export const leadDashboardDemoSeedStages = [
  { id: 'lead', label: 'New Leads' },
  { id: 'qualified', label: 'Stale Leads' },
  { id: 'closed_won', label: 'Booked' },
  { id: 'closed_lost', label: 'Missed' },
] as const;

export function getLeadDashboardDemoSeedDeals(accountId = 'demo-medspa-account'): LeadDashboardDemoDeal[] {
  return [
    {
      id: 'demo-new-botox-consult',
      title: 'Botox consultation inquiry — wants Friday appointment',
      stage: 'lead',
      value: 450,
      probability: 35,
      expected_close_date: '2026-05-16',
      notes: 'New Leads: replied to ad, needs first human follow-up within 5 minutes.',
      account_id: accountId,
      created_at: demoUpdatedAt,
      updated_at: demoUpdatedAt,
    },
    {
      id: 'demo-new-laser-hair-removal',
      title: 'Laser hair removal package question',
      stage: 'lead',
      value: 1200,
      probability: 30,
      expected_close_date: '2026-05-17',
      notes: 'New Leads: asked price and availability; AI drafted qualifying response.',
      account_id: accountId,
      created_at: demoUpdatedAt,
      updated_at: demoUpdatedAt,
    },
    {
      id: 'demo-new-skin-consult',
      title: 'Skin treatment consult from website form',
      stage: 'lead',
      value: 650,
      probability: 25,
      expected_close_date: '2026-05-18',
      notes: 'New Leads: form submit with phone; needs front desk call-back.',
      account_id: accountId,
      created_at: demoUpdatedAt,
      updated_at: demoUpdatedAt,
    },
    {
      id: 'demo-stale-body-contouring',
      title: 'Body contouring inquiry — no response after 2 days',
      stage: 'qualified',
      value: 2400,
      probability: 20,
      expected_close_date: '2026-05-20',
      notes: 'Stale Leads: needs re-engagement sequence before it becomes missed revenue.',
      account_id: accountId,
      created_at: demoUpdatedAt,
      updated_at: demoUpdatedAt,
    },
    {
      id: 'demo-stale-membership-upsell',
      title: 'Membership consult waiting on pricing answer',
      stage: 'qualified',
      value: 1800,
      probability: 40,
      expected_close_date: '2026-05-21',
      notes: 'Stale Leads: price objection unanswered; route to owner or front desk.',
      account_id: accountId,
      created_at: demoUpdatedAt,
      updated_at: demoUpdatedAt,
    },
    {
      id: 'demo-booked-filler-consult',
      title: 'Filler consult booked for Monday',
      stage: 'closed_won',
      value: 900,
      probability: 100,
      expected_close_date: '2026-05-19',
      notes: 'Booked: AI follow-up got the consult scheduled and confirmed.',
      account_id: accountId,
      created_at: demoUpdatedAt,
      updated_at: demoUpdatedAt,
    },
    {
      id: 'demo-missed-weekend-lead',
      title: 'Weekend lead missed after slow first response',
      stage: 'closed_lost',
      value: 750,
      probability: 0,
      expected_close_date: '2026-05-12',
      notes: 'Missed: first response happened next day; use as leakage proof in demo.',
      account_id: accountId,
      created_at: demoUpdatedAt,
      updated_at: demoUpdatedAt,
    },
  ];
}
