# Task Management

Tasks are the individual units of work that agents perform. The Task Management system lets you view, track, and manage all automated actions.

## Understanding Tasks

### What is a Task?

A task is a single action that an agent performs:
- Sending an SMS to a lead
- Emailing a booking reminder
- Updating a contact record
- Syncing data from an integration

### Task Lifecycle

```
Created → Queued → Processing → Completed/Failed
```

1. **Created** — Trigger event generates the task
2. **Queued** — Waiting for available capacity
3. **Processing** — Agent actively working on it
4. **Completed** — Successfully finished
5. **Failed** — Error occurred, may retry

## Viewing Tasks

### Task List

Navigate to Mission Control to see all tasks:

```
┌──────────────────────────────────────────────────────────────┐
│ Status   │ Agent          │ Action        │ Contact   │ Time │
├──────────────────────────────────────────────────────────────┤
│ ✓ Done   │ Lead Follow-up │ Send SMS      │ John D.   │ 2m   │
│ ✓ Done   │ Booking        │ Send Reminder │ Sarah M.  │ 5m   │
│ ⏳ Queue │ Review Request │ Send Email    │ Mike R.   │ 8m   │
│ ✗ Failed │ Payment        │ Charge Card   │ Lisa K.   │ 12m  │
└──────────────────────────────────────────────────────────────┘
```

### Filtering Tasks

Filter by:
- **Status** — Completed, Failed, Pending, All
- **Agent** — Specific agent or all agents
- **Date Range** — Today, this week, custom
- **Contact** — Search by name or ID

### Task Details

Click any task to see full details:

- **Trigger** — What initiated this task
- **Input Data** — Contact info, parameters
- **Execution Log** — Step-by-step what happened
- **Output** — Result of the action
- **Errors** — If failed, what went wrong

## Task Status Meanings

| Status | Icon | Description |
|--------|------|-------------|
| Queued | ⏳ | Waiting to be processed |
| Processing | 🔄 | Currently being executed |
| Completed | ✓ | Finished successfully |
| Failed | ✗ | Error occurred |
| Retry | 🔁 | Will retry automatically |
| Cancelled | 🚫 | Manually stopped |
| Skipped | ⏭️ | Conditions not met |

## Managing Tasks

### Manual Actions

Some tasks require human input. You'll see these in your action queue:

**Reasons for manual review:**
- AI confidence below threshold
- Customer requested human contact
- High-value decision needed
- Escalation triggered

**To handle manual tasks:**
1. Review the context and recommendation
2. Choose to Approve, Modify, or Reject
3. Add notes if desired
4. Submit decision

### Retry Failed Tasks

When a task fails:

1. Click on the failed task
2. Review the error details
3. Choose "Retry" to try again
4. Or "Cancel" if no longer needed

**Common retry scenarios:**
- Temporary network issue
- Rate limit that's now cleared
- Data issue that's been fixed

### Cancel Pending Tasks

To stop a task before it runs:

1. Find the task in Queued status
2. Click to open details
3. Select "Cancel Task"
4. Confirm cancellation

## Task History & Audit Trail

Every task creates a permanent record:

- **Who** triggered it (system, agent, human)
- **What** action was taken
- **When** it happened
- **Result** (success/failure)
- **Changes** made to records

### Exporting Task Data

For reporting or compliance:

1. Go to Tasks → Export
2. Select date range
3. Choose format (CSV, JSON)
4. Download file

## Best Practices

### Monitor Failed Tasks

- Check failed tasks daily
- Look for patterns (same error repeating?)
- Address root causes, not just symptoms

### Use Manual Review Wisely

- Don't require approval for everything
- Trust agents for routine decisions
- Reserve manual review for high-stakes actions

### Keep History Clean

- Cancelled tasks still appear in history
- Use filters to focus on what matters
- Export old data before archiving

## Troubleshooting

### Tasks Stuck in Queue

1. Check Health Monitoring for agent issues
2. Verify integration connections
3. Review if rate limits are hit
4. Contact support if backlog persists

### Tasks Failing Repeatedly

1. Click the task to see error details
2. Common causes:
   - Bad contact data (invalid phone/email)
   - Missing required fields
   - Integration permission issues
3. Fix the data or configuration
4. Retry the task

### Missing Tasks

If you expected a task but don't see it:

1. Check filter settings (right status selected?)
2. Verify the trigger conditions were met
3. Review agent configuration
4. Check if task was skipped (conditions not met)
