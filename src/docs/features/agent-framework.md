# Agent Framework Documentation

**Version:** 1.0  
**Purpose:** Define what it means to be an agent in our system

---

## What Is An Agent?

An agent is an **autonomous unit** with:
- A defined **mission** (why it exists)
- A **system prompt** (how it thinks/behaves)
- A **knowledge base** (what it knows)
- **Boundaries** (what it can/cannot do)
- **Inputs/Outputs** (how it interfaces with the world)

---

## Agent Documentation Standard

Every agent MUST have documentation covering:

### 1. Identity
- **Name:** Agent identifier (e.g., Rico-Sales)
- **Slug:** URL-safe identifier (e.g., rico-sales)
- **Type:** primary | subagent | builtin
- **Status:** active | paused | deprecated

### 2. Mission Statement
One paragraph: Why does this agent exist? What is its singular purpose?

### 3. System Prompt
The actual system prompt used when this agent operates. This defines:
- Personality/tone
- Core behaviors
- Decision-making principles
- What it prioritizes

### 4. Knowledge Base
What information does this agent have access to?
- Files it can read
- Databases it queries
- APIs it calls
- Context it receives

### 5. Boundaries
**CAN do:**
- List of permitted actions

**CANNOT do:**
- List of prohibited actions
- Escalation triggers (when to involve human)

### 6. Inputs
How does work come to this agent?
- Discord channel
- Direct messages
- Task queue
- Cron triggers
- Other agents

### 7. Outputs
What does this agent produce?
- Messages to channels
- Database updates
- Files created
- Actions taken

### 8. Metrics
How do we measure this agent's success?
- KPIs
- Quality metrics
- Activity metrics

### 9. Relationships
How does this agent relate to others?
- Reports to: (supervisor agent)
- Coordinates with: (peer agents)
- Delegates to: (subagents)

---

## Agent Registry

All agents are registered in the `agent_registry` table with:
- Core metadata (name, slug, description)
- Full documentation (markdown)
- Capabilities list
- Configuration JSON
- Status (active/paused/disabled)

Access agent documentation via the **Agent Registry** page in the app.

---

## Current Agents

| Agent | Type | Mission |
|-------|------|---------|
| **Rico-Main** | primary (coordinator) | User interface, coordination, planning |
| **Rico-Sales** | primary | Bring in profitable revenue |
| **Rico-Marketing** | primary | Visual content, social engagement |
| **Rico-Automation** | primary | Background processes, infrastructure |

---

## Agent Naming Convention

- `Rico-{Function}` for primary agents
- Function should be one word: Sales, Marketing, Automation, etc.
- Subagents: `{parent}-{task}` (e.g., `sales-outreach`)

---

## Creating a New Agent

1. Define mission (why does it exist?)
2. Write system prompt
3. Define boundaries
4. Create documentation per template
5. Register in `agent_registry` table
6. Create Discord channel (if needed)
7. Set up in OpenClaw config (if persistent session)
8. Add to app documentation

---

*This framework ensures we can scale to 100+ agents with consistent structure and documentation.*
