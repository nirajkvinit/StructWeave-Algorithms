# Customer Support Platform Design

## System Overview

A Customer Support Platform---exemplified by Zendesk, Intercom, Freshdesk, and ServiceNow CSM---provides organizations with a unified system for managing customer interactions across multiple channels (email, live chat, social media, phone) through a ticketing engine, real-time chat infrastructure, a self-service knowledge base, AI-powered routing, and SLA enforcement. Unlike simple helpdesk tools, an enterprise support platform must handle **multi-tenant isolation** (each customer organization has its own agents, queues, and SLA policies), **omnichannel conversation threading** (a single customer issue may span email, chat, and phone), **AI-driven ticket classification and routing** (automatically categorizing tickets and assigning them to the best-skilled agent), **SLA timer management** (tracking response and resolution deadlines across business hours and timezones), and **knowledge base deflection** (suggesting articles before a ticket is created to reduce support volume). At scale, this means managing 500M+ tickets per year across 100K+ tenant organizations, with the core challenge being the intersection of real-time chat delivery, stateful SLA timer computation, and intelligent routing across a multi-tenant shared infrastructure.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Write-heavy for ticket events and chat messages; read-heavy for knowledge base and reporting |
| **Latency Sensitivity** | High for live chat (<200ms message delivery); medium for ticket operations (<500ms); low for analytics |
| **Consistency Model** | Strong consistency for ticket state and SLA timers; eventual consistency for search, analytics, and knowledge base |
| **Concurrency Level** | High---thousands of concurrent chat sessions per tenant; moderate ticket updates with optimistic concurrency |
| **Data Volume** | Very High---500M+ tickets/year, 5B+ messages/year, 10M+ knowledge base articles across all tenants |
| **Architecture Model** | Event-driven, multi-tenant SaaS with real-time (WebSocket) and request-response (REST) hybrid |
| **Offline Support** | Limited---agents work online; mobile apps may cache recent tickets for offline viewing |
| **Complexity Rating** | **High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | AI routing, SLA engine, chat infrastructure, knowledge deflection |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Multi-tenancy, encryption, compliance, audit |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | CRM System (9.9) | Email System (11.4) | Chat Platform (4.10) | Customer Support (This) |
|--------|-------------------|---------------------|----------------------|------------------------|
| **Primary Unit** | Lead/Opportunity/Contact | Email message | Channel message | Ticket (multi-message, multi-channel thread) |
| **Lifecycle** | Sales pipeline stages | Sent/Received/Archived | Sent/Read | Open > Pending > Solved > Closed with SLA tracking |
| **Routing** | Manual assignment or round-robin | Inbox rules | Channel membership | AI classification + skill-based routing + SLA priority |
| **Time Sensitivity** | Days/weeks (sales cycle) | Hours (response expectation) | Seconds (real-time) | Minutes to hours with contractual SLA deadlines |
| **AI Role** | Lead scoring, forecasting | Spam filtering | None or minimal | Intent classification, priority prediction, article suggestion, auto-response |
| **Multi-channel** | Phone + email | Email only | Chat only | Email + chat + social + phone + API (unified thread) |
| **Knowledge Base** | Not core | Not applicable | Not applicable | Integrated self-service portal with deflection metrics |
| **Compliance** | CRM-specific (data retention) | Email retention | Minimal | SLA compliance, GDPR data deletion, SOC 2 audit trails |
| **Tenancy** | Per-org | Per-user | Per-workspace | Per-organization with plan-based feature gating |

---

## What Makes This System Unique

1. **SLA Timers as Distributed Stateful Computation**: Unlike most systems where time tracking is a simple timestamp comparison, SLA timers must account for business hours (9am-5pm in the customer's timezone), holidays (per-organization calendar), paused states (waiting on customer), and escalation chains. A timer that fires at the wrong time---or fails to fire---results in a contractual SLA breach with financial penalties.

2. **AI Routing with Human Fallback**: The system must classify incoming tickets by intent, predict priority, match to agent skills, and balance load---all in under 500ms. But unlike pure ML systems, every AI decision must have a transparent fallback: if confidence is below threshold, route to a triage queue. Agents must be able to override any AI decision, and those overrides feed back into model retraining.

3. **Omnichannel Conversation Threading**: A customer may start on chat, continue via email, and call in---all about the same issue. The system must maintain a unified conversation thread across channels, preserving context so agents do not ask the customer to repeat information. This requires a channel-agnostic event model and real-time conversation merging.

4. **Knowledge Base as a Deflection Engine**: The knowledge base is not just a content repository---it is an active deflection mechanism. When a customer starts typing a ticket or enters a chat, the system proactively suggests relevant articles. Measuring deflection rate (tickets avoided because the customer found the answer) is a key business metric that directly reduces support costs.

5. **Multi-Tenant SLA Isolation**: Each tenant organization has its own SLA policies, business hours, escalation rules, and agent skill configurations. The system must enforce tenant-level isolation for SLA computation while sharing infrastructure across 100K+ tenants. A noisy tenant (one with a spike in ticket volume) must not affect SLA timer accuracy for other tenants.

---

## Core Domain Concepts

### Ticket Lifecycle

```
     +----------+      +---------+      +-----------+      +--------+
     |   New    |----->| Open    |----->| Pending   |----->| Solved |
     +----------+      +---------+      +-----------+      +--------+
          |                 |                 |                  |
          |                 |                 |                  v
          |                 |                 |             +--------+
          |                 +-------+---------+             | Closed |
          |                         |                       +--------+
          v                         v
     +-----------+          +------------+
     | Auto-     |          | Escalated  |
     | Deflected |          |            |
     +-----------+          +------------+
```

### SLA Timer Types

| Timer Type | Starts When | Pauses When | Breaches When |
|-----------|------------|-------------|---------------|
| **First Response** | Ticket created | N/A (must respond) | Agent has not replied within SLA window |
| **Next Reply** | Customer sends follow-up | Ticket status is "pending" (waiting on customer) | Agent has not replied within SLA window |
| **Resolution** | Ticket created | Status is "pending" or "on-hold" | Ticket not solved within SLA window |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [3.33 - AI-Native Customer Service Platform](../3.33-ai-native-customer-service-platform/) | AI-first approach to customer service with autonomous agents |
| [4.10 - Slack/Discord](../4.10-slack-discord/) | Real-time messaging, presence, WebSocket infrastructure |
| [6.13 - Enterprise Knowledge Management](../6.13-enterprise-knowledge-management-system/) | Knowledge base architecture, search, content management |
| [9.9 - CRM System Design](../9.9-crm-system-design/) | Contact management, pipeline stages, customer data model |
| [11.4 - Email Delivery System](../11.4-email-delivery-system/) | Email channel integration, deliverability |
| [2.6 - Distributed Job Scheduler](../2.6-distributed-job-scheduler/) | Timer management, scheduled job execution |

---

## Sources

- Zendesk Engineering Blog --- Multi-tenant Architecture, SLA Engine Design
- Intercom Engineering Blog --- Real-time Messaging, Bot Framework, Resolution Bot
- Freshworks Engineering --- AI Routing (Freddy AI), Omnichannel Architecture
- ServiceNow Technical Architecture Documentation
- Kustomer Engineering Blog --- Omnichannel Conversation Threading
- Help Scout Engineering --- Knowledge Base Search, Beacon Widget
- Research: SLA Management in Multi-tenant SaaS (IEEE Cloud Computing, 2024)
- Research: Intent Classification for Customer Support (ACL, 2023)
- Industry Statistics: Zendesk 170K+ customers, Intercom 25K+ customers (2025)
- Gartner Magic Quadrant for CRM Customer Engagement Center (2025)
