# Speed-to-Lead Framework — Fight Flow Lead Responder
**Ticket:** SPA-847 | **Implemented:** 2026-03-19

## Overview
Upgrading the Fight Flow AI lead responder to the Speed-to-Lead Framework. Responding within 5 minutes yields 100× contact rate vs. 30-minute wait.

## Files Changed
- `supabase/functions/ai-response/index.ts` — full rewrite
- `supabase/functions/fightflow-reengagement/index.ts` — new re-engagement processor
- `supabase/migrations/20260319000001_fightflow_reengagement_queue.sql` — new table

## 7 Components

### 1. Persona
- Brief, competent rep — not a chatbot
- Sounds like a human who knows the gym
- Never robotic openers ("Great!", "Awesome!")

### 2. Hard Limits
- Max 2 sentences per reply
- Max 160 characters
- Zero filler words
- Never echo lead details back to them
- Answer before asking
- One purpose per message

### 3. Urgency Scale (0–10)
| Score | Behavior |
|-------|----------|
| 9–10  | Emergency: 1 question → transfer immediately |
| 6–8   | Fast-track: skip small talk, move to booking |
| 3–5   | Standard: 2–3 qualifying questions |
| 0–2   | Patient: natural conversation |

Scoring factors: intent (BUYING +4), time signals (+2), deep conversation (+3).

### 4. Intent Detection
| Intent | Path |
|--------|------|
| BUYING | Remove friction, one clear next step |
| INFO_SEEKING | Answer first, advance toward trial |
| PROBLEM | Empathize, connect with Scott immediately |
| ROUTINE | Natural qualifying, no pressure |
| REJECTION | One graceful sentence, stop |
| ESCALATION | Acknowledge, say Scott will reach out, stop |

### 5. Qualifying Logic
- Message 1: Discovery question
- Messages 2–3: Class type + schedule
- Message 4: Trial offer or human handoff
- Hard ceiling: 4 inbound messages → always hand off

### 6. Tone Rules
- Match lead energy
- Answer before asking
- One purpose per message
- Never repeat their words back

### 7. Transfer Rule
- Natural close: "Want to pop in for a free trial?" or "I can grab you a time with Scott."
- Default next step: book a trial OR quick call with Scott
- When transferring: "I'll let Scott know to reach out shortly."

## Tiered Model Routing

| Tier | Model | When |
|------|-------|------|
| T1 | claude-haiku-3-5 | Standard qualifying (urgency <8, msg count <4) |
| T2 | claude-sonnet-4-5 | Complex/transfers (urgency ≥8, msg count ≥4, PROBLEM, ESCALATION) |

## Quality Gate
Sonnet reviews Haiku output before sending (fires for T1 only).
- Checks: ≤2 sentences, ≤160 chars, no filler, answers intent, doesn't echo, one purpose
- On failure: returns corrected version
- ~26% expected catch rate on T1 responses

## Re-Engagement

### No Reply
- Attempt 1: T+20 minutes
- Attempt 2: T+2 hours
- Max: 2 attempts

### Mid-Convo Drop
- Attempt 1: T+15 minutes
- Max: 1 attempt

### Rules
- Quiet hours (8 PM–8 AM ET): skip, reschedule to 8 AM next window
- If lead replies after scheduling: cancel all remaining attempts
- Re-engagement processor: `fightflow-reengagement` edge function (call every 5 min)

## Human Handoff SMS
Triggered when: 4+ messages OR ESCALATION intent.

**Payload sent to Scott (+1 919 532 4050):**
```
🚨 Fight Flow Lead Handoff
Name: [name]
Phone: [phone]
Interest: [service type]
Urgency: [score]/10
Transcript: [last 8 messages summary]
```

## Metrics Targets
| Metric | Target |
|--------|--------|
| Response time | < 60 seconds |
| Transfer rate | 80%+ of engaged leads |
| Cost per lead | < $0.15 |

## DB Table: fightflow_reengagement_queue
```sql
id, thread_id, business_id, type, attempt, max_attempts,
fire_at, status (pending|sent|cancelled|skipped_quiet),
sent_at, created_at
```
