CREATE TABLE sales_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id),
  stage text DEFAULT 'new',
  last_touch timestamp DEFAULT now(),
  next_action text,
  pain_points text,
  current_tools text,
  budget_signals text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
