# AI Agents

Agents are the heart of Sparkwave. They're intelligent automations that handle specific business tasks, making decisions and taking actions on your behalf.

## What Are Agents?

Think of agents as tireless digital employees. Each agent has a specific job:

- **One focus** — Each agent handles one type of task really well
- **Always on** — They work 24/7, including nights and weekends
- **Context-aware** — They understand your business and adapt accordingly
- **Self-healing** — If something breaks, they retry or escalate

## How Agents Work

### The Agent Lifecycle

```
Trigger → Evaluate → Decide → Act → Report
```

1. **Trigger** — Something happens (new lead, missed payment, appointment booked)
2. **Evaluate** — Agent checks the context (who, what, when, history)
3. **Decide** — Based on rules and AI, determines the best action
4. **Act** — Executes the action (send message, update record, alert human)
5. **Report** — Logs the activity for your review

### Example: Lead Follow-up Agent

When a new lead comes in:

1. **Trigger**: New contact added with "Lead" tag
2. **Evaluate**: Check if contact has phone/email, prior interactions
3. **Decide**: Determine best outreach method and timing
4. **Act**: Send personalized SMS introducing your services
5. **Report**: Log activity, track if they respond

## Available Agents

### Lead Follow-up Agent
**Purpose:** Convert leads into customers through timely outreach

- Sends welcome message within minutes of signup
- Follows up if no response after 24-48 hours
- Escalates hot leads to human for personal touch
- Tracks conversion through the funnel

### Booking Reminder Agent
**Purpose:** Reduce no-shows with smart reminders

- Sends reminder 24 hours before appointment
- Follow-up reminder 2 hours before (SMS)
- Allows easy confirmation/reschedule via reply
- Notifies staff of cancellations instantly

### Review Request Agent
**Purpose:** Build social proof with happy customer reviews

- Detects positive interactions (completed service, positive feedback)
- Sends review request at optimal timing
- Links to your preferred review platforms
- Avoids asking unhappy customers

### Reactivation Agent
**Purpose:** Win back dormant customers

- Identifies customers who haven't visited in X days
- Sends personalized "we miss you" outreach
- Can include special offers or incentives
- Tracks who comes back

### Payment Follow-up Agent
**Purpose:** Reduce failed payments and churn

- Detects failed subscription payments
- Sends friendly payment update reminders
- Escalates persistent failures to human
- Tracks payment recovery rate

## Configuring Agents

### Activation

Each agent can be:
- **Active** — Running and processing events
- **Paused** — Stops processing but keeps configuration
- **Disabled** — Completely off

### Timing Settings

Control when agents operate:

```
Operating Hours: 9 AM - 8 PM
Time Zone: America/New_York
Weekends: Active / Paused
Holidays: Respect / Ignore
```

### Message Templates

Customize what agents say:

```
Hi {first_name}! 👋

Thanks for your interest in {business_name}. 
I'd love to tell you more about our {service}.

Would you prefer a quick call or text chat?

- {sender_name}
```

**Variables available:**
- `{first_name}`, `{last_name}`, `{full_name}`
- `{business_name}`, `{sender_name}`
- `{service}`, `{appointment_time}`, `{amount_due}`

### Escalation Rules

Define when humans should step in:

- Customer asks complex question
- Negative sentiment detected
- VIP customer identified
- After X failed attempts

## Monitoring Agents

### Health Status

Each agent shows real-time status:

| Status | Meaning |
|--------|---------|
| 🟢 Healthy | Operating normally |
| 🟡 Warning | Minor issues, still functional |
| 🔴 Critical | Needs attention, may be stopped |

### Activity Metrics

Track agent performance:

- **Processed** — Total events handled
- **Success Rate** — % completed successfully
- **Avg Response Time** — How fast they act
- **Escalation Rate** — % sent to humans

## Best Practices

### Start Small
Activate one agent at a time. Get comfortable before adding more.

### Test First
Use test contacts before going live. Verify messages look right.

### Review Regularly
Check the activity feed weekly. Look for patterns and opportunities.

### Customize Messages
Generic messages feel... generic. Add your personality.

### Trust but Verify
Agents are smart but not perfect. Spot-check their work periodically.

## Troubleshooting

### Agent Not Processing

1. Check if agent is Active (not Paused/Disabled)
2. Verify the trigger conditions are being met
3. Check Health Monitoring for errors
4. Review integration connections

### Messages Not Sending

1. Verify communication channel is connected
2. Check contact has valid phone/email
3. Review message template for errors
4. Check sending limits haven't been exceeded

### Wrong Actions Taken

1. Review agent configuration
2. Check if rules need adjustment
3. Look at the specific event in Activity feed
4. Adjust and test with a new trigger
