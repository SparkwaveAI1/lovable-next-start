# Customize Agent Behavior

Fine-tune how your AI agents respond and act to match your business needs.

## Overview

Sparkwave's AI agents are highly configurable. You can adjust their personality, communication style, and behavior to align with your brand and customer expectations.

## Accessing Agent Settings

1. Navigate to **Agents** in the sidebar
2. Select the agent you want to customize
3. Click **Settings** or the gear icon

## Customization Options

### Personality & Tone

Define how your agent communicates:

| Setting | Options | Best For |
|---------|---------|----------|
| **Formality** | Casual, Professional, Formal | Match your brand voice |
| **Verbosity** | Concise, Balanced, Detailed | Control response length |
| **Warmth** | Friendly, Neutral, Direct | Set emotional tone |

### Response Templates

Create templates for common scenarios:

1. Go to **Agent Settings > Templates**
2. Click **Add Template**
3. Define the trigger condition
4. Write the response template
5. Use variables like `{{customer_name}}` for personalization

### Business Hours

Configure when agents are active:

```
Monday-Friday: 9:00 AM - 6:00 PM
Saturday: 10:00 AM - 2:00 PM
Sunday: Closed
```

Outside business hours, agents can:
- Send acknowledgment messages
- Collect contact information
- Queue requests for follow-up

### Escalation Rules

Define when to involve a human:

- **Sentiment detection** - Escalate frustrated customers
- **Keyword triggers** - Flag specific topics (refund, complaint, urgent)
- **Complexity threshold** - Hand off complex requests
- **Customer VIP status** - Prioritize high-value customers

## Advanced Configuration

### Context Window

Control how much conversation history the agent considers:

- **Short (5 messages)** - Quick, focused responses
- **Medium (15 messages)** - Balanced context
- **Long (30 messages)** - Full conversation awareness

### Knowledge Base

Add custom knowledge your agent can reference:

1. Go to **Agent Settings > Knowledge**
2. Upload documents (PDF, TXT, Markdown)
3. Or paste frequently asked questions
4. The agent will reference this in responses

### Action Permissions

Control what the agent can do autonomously:

- ✅ Send email responses
- ✅ Schedule appointments
- ✅ Update contact records
- ⚠️ Process refunds (requires approval)
- ⚠️ Delete records (requires approval)

## Testing Your Configuration

### Preview Mode

1. Click **Preview** in agent settings
2. Simulate conversations
3. Verify responses match expectations

### A/B Testing

Test different configurations:

1. Create two agent variants
2. Split traffic between them
3. Compare performance metrics
4. Deploy the winner

## Best Practices

1. **Start conservative** - Begin with more human oversight, then relax as confidence grows
2. **Review regularly** - Check conversation logs weekly
3. **Iterate based on feedback** - Use customer feedback to refine behavior
4. **Document your configuration** - Keep notes on why settings were chosen

## Common Configurations

### Customer Support Agent
- Formality: Professional
- Verbosity: Balanced
- Escalation: On negative sentiment or refund mentions
- Actions: Email, schedule, update contacts

### Sales Assistant
- Formality: Casual
- Verbosity: Concise
- Escalation: On high-value leads
- Actions: Email, schedule demos, qualify leads

### Appointment Scheduler
- Formality: Professional
- Verbosity: Concise
- Escalation: Rarely (handles most cases)
- Actions: Schedule, reschedule, send reminders

## Need Help?

- Ask [Rico](/docs/features/rico-chat) for configuration suggestions
- Review [Agent documentation](/docs/features/agents)
- Check [Common Issues](/docs/troubleshooting/common-issues)
