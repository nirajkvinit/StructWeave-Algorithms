# Requirements & Estimations

## Functional Requirements

### Primary (Must-Have)

1. **Ticket Lifecycle Management**: Create, assign, update, resolve, and close support tickets with full audit trail. Support statuses: New, Open, Pending, On-Hold, Solved, Closed. Tickets can be created via email, chat, API, web form, or social media.

2. **Live Chat**: Real-time bidirectional messaging between customers and agents via WebSocket. Support typing indicators, read receipts, file attachments, and emoji reactions. Agent-side features: canned responses, internal notes, conversation transfer.

3. **Knowledge Base**: Self-service portal with articles organized in categories and sections. Full-text search with relevance ranking. Article versioning, access control (public vs. internal), and feedback collection (helpful/not helpful).

4. **AI-Powered Routing**: Automatically classify incoming tickets by intent (billing, technical, account, etc.), predict priority (low/normal/high/urgent), and route to the best-matched agent based on skills, availability, and current workload. Confidence-based fallback to manual triage.

5. **SLA Management**: Define SLA policies with response and resolution time targets per priority level. Track SLA timers accounting for business hours, timezone, holidays, and paused states. Trigger escalation workflows on breach or near-breach.

6. **Omnichannel Threading**: Unify conversations across email, chat, phone, social media, and API into a single ticket thread. Preserve full context when a conversation transitions between channels.

7. **Agent Workspace**: Unified agent dashboard showing assigned tickets, active chats, SLA status, customer context (previous tickets, account info), and suggested knowledge base articles. Support for agent collision detection (two agents working the same ticket).

### Secondary (Should-Have)

8. **Automation Rules (Triggers & Automations)**: Event-driven rules that execute actions on tickets (auto-tag, auto-assign, auto-close stale tickets, send notifications). Triggers fire on ticket events; automations fire on time-based conditions.

9. **Reporting & Analytics**: Real-time dashboards for ticket volume, SLA compliance, agent performance (handle time, CSAT scores), knowledge base effectiveness (deflection rate, article views). Historical trend analysis.

10. **Customer Satisfaction (CSAT) Surveys**: Automatically send satisfaction surveys after ticket resolution. Aggregate scores per agent, team, and organization.

11. **Integrations**: Webhook-based integrations with CRM, e-commerce, and internal tools. REST API for ticket creation, updates, and querying. SSO for agent authentication.

12. **Multilingual Support**: Automatic language detection for incoming tickets. Machine translation for agents who do not speak the customer's language. Knowledge base article translation management.

### Out of Scope

- Phone/voice call infrastructure (IVR, call recording)---assume integration with third-party telephony
- Full CRM functionality (pipeline management, lead scoring)
- Marketing automation (campaigns, drip sequences)
- Social media monitoring (brand mentions, sentiment analysis beyond support tickets)

---

## Non-Functional Requirements

| Requirement | Target | Justification |
|-------------|--------|---------------|
| **Availability** | 99.95% (26 min downtime/month) | Support is business-critical; extended outages mean missed SLAs |
| **Chat Message Latency** | p50 <100ms, p99 <300ms | Real-time chat requires near-instant delivery |
| **Ticket API Latency** | p50 <200ms, p99 <800ms | Agents interact with tickets continuously; slow responses degrade productivity |
| **Search Latency** | p50 <300ms, p99 <1s | Knowledge base search must feel instant for deflection to work |
| **SLA Timer Accuracy** | Within 1 second of actual business time | SLA breaches have contractual and financial implications |
| **Consistency** | Strong for ticket state, SLA timers | A ticket must never show conflicting states to two agents |
| **Durability** | Zero ticket data loss | Every customer interaction is a contractual record |
| **Throughput** | 50K tickets/min peak across all tenants | Black Friday, product outages cause 10-20x spikes |
| **Multi-tenancy** | 100K+ tenant organizations | Shared infrastructure with strict data isolation |
| **Data Retention** | Configurable per tenant (90 days to 7 years) | Compliance requirements vary by industry |

---

## Scale Assumptions

| Metric | Value | Basis |
|--------|-------|-------|
| Total tenant organizations | 150,000 | Zendesk serves 170K+ customers |
| Total agents across all tenants | 5,000,000 | Average 33 agents per tenant |
| Daily Active Agents (DAA) | 2,000,000 | ~40% daily active rate |
| Tickets created per day | 15,000,000 | ~100 tickets/day per active tenant |
| Chat conversations per day | 5,000,000 | ~1/3 of ticket volume is chat |
| Chat messages per day | 100,000,000 | ~20 messages per chat conversation |
| Concurrent chat sessions | 500,000 | Peak concurrent at any moment |
| Knowledge base articles (total) | 50,000,000 | Average 333 articles per tenant |
| Knowledge base searches per day | 30,000,000 | 2x ticket volume (deflection attempts) |
| Automation rule evaluations per day | 500,000,000 | ~33 rule evaluations per ticket event |
| Webhook deliveries per day | 200,000,000 | ~13 webhooks per ticket lifecycle |

---

## Capacity Estimations

| Resource | Estimation | Calculation |
|----------|-----------|-------------|
| **Ticket storage (per year)** | ~55 TB | 15M tickets/day * 365 days * 10 KB avg ticket size |
| **Chat message storage (per year)** | ~37 TB | 100M messages/day * 365 days * 1 KB avg message |
| **Knowledge base storage** | ~25 TB | 50M articles * 500 KB avg (including images in object storage) |
| **SLA timer state** | ~15 GB active | 5M active tickets * 3 timers * 1 KB timer state |
| **Search index size** | ~5 TB | 50M articles + 500M recent tickets, indexed fields |
| **Ticket write QPS (avg)** | ~5,200 | 15M tickets * ~30 events/ticket / 86,400 seconds |
| **Ticket write QPS (peak)** | ~52,000 | 10x average during incident spikes |
| **Chat message QPS (avg)** | ~1,160 | 100M messages / 86,400 seconds |
| **Chat message QPS (peak)** | ~11,600 | 10x during business hours concentration |
| **WebSocket connections** | 2,500,000 | 2M agents + 500K concurrent customer chat sessions |
| **Bandwidth (inbound)** | ~5 Gbps | Ticket + chat + attachment uploads |
| **Bandwidth (outbound)** | ~15 Gbps | Agent workspace reads + knowledge base serves + webhooks |
| **Cache size** | ~500 GB | Hot tickets, agent sessions, SLA policies, routing rules |

---

## SLO Targets

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| **Platform Availability** | 99.95% | Uptime of core ticket and chat APIs |
| **Chat Message Delivery** | p99 <300ms | Timestamp delta: sender publish to receiver delivery |
| **Ticket API Response** | p99 <800ms | Server-side latency at API gateway |
| **Knowledge Base Search** | p99 <1s | End-to-end search including permission filtering |
| **SLA Timer Accuracy** | <1s drift per 24h | Comparison of computed business time vs wall clock reference |
| **Webhook Delivery** | 99.9% within 60s | First delivery attempt success rate |
| **Error Rate** | <0.1% of API requests | 5xx responses / total requests |
| **Data Durability** | 99.999999999% (11 nines) | No ticket or conversation data loss |
| **Tenant Isolation** | Zero cross-tenant data leaks | Automated isolation testing + audit |
| **AI Routing Accuracy** | >85% correct first assignment | Percentage of tickets not manually reassigned within 1 hour |

---

## Traffic Patterns

### Daily Pattern
- **Business hours concentration**: 70% of ticket volume arrives between 8am-6pm in each tenant's local timezone. Since tenants span all timezones, the global system sees a smoothed wave with peaks following the sun.
- **Chat peaks**: Chat volume is even more concentrated during business hours (80%) with sharp ramps at 9am and 1pm local time.

### Spike Scenarios
- **Product outage**: A major tenant's product goes down, generating 50-100x normal ticket volume for that tenant within minutes. Must handle gracefully without affecting other tenants.
- **Seasonal events**: Black Friday, end-of-quarter for B2B SaaS, tax season for financial services.
- **Feature launches**: New product releases by tenants' customers generate temporary support spikes.

### Implications
- Auto-scaling must respond within 2-3 minutes to absorb spikes
- Per-tenant rate limiting prevents one tenant's surge from degrading service for others
- SLA timers must continue ticking accurately even under load spikes
