-- Re-engagement sequences for cold leads
-- RS-015: Re-engage leads who haven't responded in 30+ days

-- Fight Flow Cold Lead Re-engagement (SMS)
DO $$
DECLARE
  ff_seq_id uuid;
  sw_seq_id uuid;
BEGIN
  -- Fight Flow Cold Lead Re-engagement
  INSERT INTO follow_up_sequences (name, description, trigger_type, business_id, is_active)
  VALUES (
    'cold_lead_reengagement',
    'Re-engage leads who haven''t responded in 30+ days',
    'cold_lead',
    '456dc53b-d9d9-41b0-bc33-4f4c4a791eff',
    true
  )
  RETURNING id INTO ff_seq_id;

  -- Fight Flow Steps
  INSERT INTO follow_up_steps (sequence_id, step_order, delay_hours, channel, message_template)
  VALUES 
    (ff_seq_id, 1, 0, 'sms', 'Hey {{first_name}}, we noticed you were interested in training at Fight Flow. Are you still looking to start your martial arts journey?'),
    (ff_seq_id, 2, 72, 'sms', '{{first_name}}, just checking in. We have a free intro class available if you''d like to try us out.'),
    (ff_seq_id, 3, 168, 'sms', 'Last chance! We''re offering you a special deal: your first week free. Reply YES to claim it.');

  -- Sparkwave Cold Lead Re-engagement (Email)
  INSERT INTO follow_up_sequences (name, description, trigger_type, business_id, is_active)
  VALUES (
    'cold_lead_reengagement',
    'Re-engage leads who haven''t responded in 30+ days',
    'cold_lead',
    '5a9bbfcf-fae5-4063-9780-bcbe366bae88',
    true
  )
  RETURNING id INTO sw_seq_id;

  -- Sparkwave Steps
  INSERT INTO follow_up_steps (sequence_id, step_order, delay_hours, channel, message_template, subject_template)
  VALUES 
    (sw_seq_id, 1, 0, 'email', 
     E'Hi {{first_name}},\n\nI wanted to check in — a while back you showed interest in Sparkwave for automating your business workflows.\n\nSince then, we''ve helped local businesses like Fight Flow Academy achieve some impressive results:\n- 40% increase in lead response rates\n- 3x faster follow-up times\n- Zero missed customer inquiries\n\nAre you still exploring AI automation for your business? I''d love to show you what''s possible.\n\nNo pressure — just reply if you''d like to chat.\n\nBest,\nThe Sparkwave Team',
     'Quick question about your AI automation goals'),
    (sw_seq_id, 2, 96, 'email',
     E'Hi {{first_name}},\n\nI know timing is everything in business. If now isn''t the right time for AI automation, I totally understand.\n\nBut if you''re curious, I''d be happy to put together a quick personalized demo showing exactly how Sparkwave could work for your specific business.\n\nTakes 15 minutes, and you''ll walk away with actionable insights either way.\n\nWorth a look?\n\nBest,\nThe Sparkwave Team',
     'A personalized demo, if you''re interested'),
    (sw_seq_id, 3, 240, 'email',
     E'Hi {{first_name}},\n\nI''ve reached out a couple times and haven''t heard back — totally fine! I don''t want to clutter your inbox.\n\nI''ll step back for now. But if your needs change and you want to explore AI automation for your business, we''ll be here.\n\nWishing you the best,\nThe Sparkwave Team\n\nP.S. You can always reach us at hello@sparkwaveai.com when you''re ready.',
     'No hard feelings 👋');

  RAISE NOTICE 'Created Fight Flow cold_lead_reengagement sequence: %', ff_seq_id;
  RAISE NOTICE 'Created Sparkwave cold_lead_reengagement sequence: %', sw_seq_id;
END $$;

-- Note: PersonaAI sequences will be added when PersonaAI is integrated into Sparkwave system
-- For now, PersonaAI uses its own Supabase project
