# Health Monitoring

Health Monitoring gives you real-time visibility into your automation systems. Know instantly when something needs attention—before your customers notice.

## Overview

The Health Monitoring dashboard shows:

- **Agent Status** — Is each agent running normally?
- **Integration Health** — Are connections to external services working?
- **Error Tracking** — What's failing and why?
- **Performance Metrics** — Is everything running efficiently?

## Health Indicators

### Status Levels

| Level | Icon | Meaning |
|-------|------|---------|
| Healthy | 🟢 | Everything working as expected |
| Warning | 🟡 | Minor issues, still operational |
| Critical | 🔴 | Needs immediate attention |
| Unknown | ⚪ | Status cannot be determined |

### What Triggers Each Level

**Healthy:**
- All systems responding normally
- Error rate below 1%
- No failed jobs in last hour

**Warning:**
- Error rate between 1-5%
- Slow response times detected
- Some retries happening
- Integration connection unstable

**Critical:**
- Error rate above 5%
- Integration disconnected
- Agent stopped processing
- Multiple consecutive failures

## Dashboard Components

### Agent Health Panel

Shows status for each active agent:

```
┌─────────────────────────────────┐
│ 🟢 Lead Follow-up        98.5% │
│ 🟢 Booking Reminder      99.2% │
│ 🟡 Review Request        94.1% │
│ 🟢 Payment Follow-up     97.8% │
└─────────────────────────────────┘
```

Click any agent to see:
- Recent activity
- Error details
- Performance trends

### Integration Status

Real-time connection status:

```
┌─────────────────────────────────┐
│ Wix            🟢 Connected    │
│ Stripe         🟢 Connected    │
│ SMS Provider   🟡 Rate Limited │
│ Email          🟢 Connected    │
└─────────────────────────────────┘
```

### Error Feed

Live stream of issues:

```
10:23 AM - Booking Reminder: Failed to send SMS (invalid number)
10:15 AM - Lead Follow-up: Contact missing email, skipped email step
09:58 AM - Wix Sync: Connection timeout, retrying...
```

### Metrics Overview

Key performance indicators:

- **Uptime** — % time all systems operational (target: 99.5%+)
- **Success Rate** — % of tasks completed successfully
- **Avg Latency** — Time from trigger to action
- **Queue Depth** — Pending tasks waiting to process

## Setting Up Alerts

### Alert Channels

Configure where to receive alerts:

- **In-App** — Notifications in Sparkwave dashboard
- **Email** — Alerts to your inbox
- **SMS** — Text for critical issues
- **Rico Chat** — Proactive notifications from your AI assistant

### Alert Thresholds

Customize when you get notified:

| Setting | Default | Recommended Range |
|---------|---------|-------------------|
| Error Rate Alert | > 5% | 3-10% |
| Latency Alert | > 30s | 15-60s |
| Queue Depth Alert | > 100 | 50-200 |
| Downtime Alert | > 5 min | 2-10 min |

### Alert Frequency

Prevent alert fatigue:

- **Immediate** — Every occurrence (for critical only)
- **Batched** — Summary every 15 minutes
- **Daily Digest** — Once per day summary
- **Smart** — AI determines urgency

## Understanding Metrics

### Success Rate Calculation

```
Success Rate = (Completed Tasks / Total Tasks) × 100
```

A task is "completed" when it achieves its goal (message sent, record updated, etc.). Failed tasks include:
- Errors during execution
- Validation failures
- Timeout exceeded

### What Affects Latency

Common causes of slow processing:

1. **External APIs** — Third-party services responding slowly
2. **Rate Limits** — Hitting sending limits
3. **Queue Backlog** — Too many tasks waiting
4. **Complex Logic** — Agent decisions taking time

## Troubleshooting Common Issues

### "Integration Disconnected"

**Symptoms:** Integration shows 🔴 status, sync not happening

**Solutions:**
1. Go to Settings → Integrations
2. Click "Reconnect" for the affected service
3. Re-authenticate if prompted
4. Check if your credentials expired

### "High Error Rate"

**Symptoms:** Agent showing 🟡 or 🔴, many failed tasks

**Solutions:**
1. Check Error Feed for specific errors
2. Common causes:
   - Invalid contact data (bad emails/phones)
   - Rate limits exceeded
   - Template variables missing
3. Fix the root cause, errors will resolve

### "Slow Processing"

**Symptoms:** Long latency, tasks delayed

**Solutions:**
1. Check queue depth—backlog building?
2. Review external service status
3. Consider spreading load across hours
4. Contact support if persistent

### "Agent Stopped"

**Symptoms:** Agent shows inactive, no processing

**Solutions:**
1. Check if manually paused
2. Review for critical errors that triggered auto-pause
3. Verify required integrations connected
4. Reactivate and monitor

## Best Practices

### Daily Habits

- **Morning glance** — Check dashboard for overnight issues
- **Review errors** — Address recurring problems
- **Monitor trends** — Catch degradation early

### Weekly Review

- **Success rate trends** — Improving or declining?
- **Top errors** — What's failing most often?
- **Performance** — Any latency creep?

### Monthly Analysis

- **Overall uptime** — Meeting your targets?
- **Error patterns** — Systemic issues to address?
- **Capacity planning** — Need to scale?

## Need Help?

If health issues persist:

1. **Ask Rico** — "Why is my booking agent showing warning?"
2. **Check Status** — status.sparkwaveai.app for platform issues
3. **Contact Support** — support@sparkwaveai.app
