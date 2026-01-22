# Requirements and Estimations

[Back to Index](./00-index.md)

---

## Functional Requirements

### P0 - Must Have (Core)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| **Status Display** | Show current status of all components | Page loads in < 200ms globally, shows real-time status |
| **Incident Management** | Create, update, resolve incidents with timeline | Full CRUD via API, timeline of updates, status transitions |
| **Component Tracking** | Track multiple service components with status levels | Hierarchical components, group support, individual status |
| **Subscriber Notifications** | Notify subscribers via multiple channels | Email, SMS, webhook delivery with confirmation |
| **Maintenance Windows** | Schedule and display planned maintenance | Start/end times, affected components, auto-start/end |
| **Historical Uptime** | Display uptime history and metrics | Daily/monthly/yearly uptime %, incident history |
| **API Access** | Programmatic status updates | RESTful API with API key authentication |

### P1 - Should Have

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| **Real-time Updates** | Live status changes without refresh | SSE connection, < 5 second propagation |
| **Embedded Widgets** | Third-party site integration | JavaScript widget, Shadow DOM isolation |
| **Monitoring Integration** | Receive alerts from monitoring tools | Webhook endpoints for Datadog, PagerDuty, etc. |
| **Custom Domains** | White-label status pages | CNAME support, SSL certificates |
| **Metrics Display** | Response time and performance graphs | Time-series visualization, configurable periods |
| **Multi-language** | Internationalization support | Template translations, subscriber locale |

### P2 - Nice to Have

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| **AI-assisted Updates** | Auto-generate incident summaries | LLM-based summary from timeline |
| **Chat Integration** | Slack/Teams slash commands | Create/update incidents from chat |
| **Post-incident Reports** | Automated timeline generation | PDF/HTML export, template-based |
| **Public Metrics API** | External uptime badge generation | JSON API for uptime percentages |

---

## Out of Scope

| Feature | Reason | Alternative |
|---------|--------|-------------|
| Full monitoring solution | Separate concern, many specialized tools exist | Integrate with Datadog, PagerDuty, etc. |
| Root cause analysis | Requires deep application instrumentation | Leave to observability platforms |
| SLA billing integration | Business logic varies greatly | Export data for external billing systems |
| On-call scheduling | Complex domain, dedicated tools exist | Integrate with PagerDuty, Opsgenie |
| Internal dashboards | Different audience, different requirements | Use Grafana, Datadog for internal |

---

## Non-Functional Requirements

### Performance

| Metric | Target | Measurement | Notes |
|--------|--------|-------------|-------|
| **Status page TTFB (p50)** | < 50ms | Synthetic monitoring from 10+ locations | Edge-cached |
| **Status page TTFB (p99)** | < 200ms | Synthetic monitoring | Includes edge compute |
| **Status update propagation** | < 30s | Time from API call to global availability | To all edge locations |
| **Real-time update latency** | < 5s | Time from change to SSE notification | For connected clients |
| **Notification delivery (email, p95)** | < 2 min | End-to-end from trigger to inbox | Provider-dependent |
| **Notification delivery (SMS, p95)** | < 1 min | End-to-end from trigger to device | Priority channel |
| **Notification delivery (webhook, p95)** | < 30s | Including retries | With exponential backoff |
| **API response time (p99)** | < 500ms | For incident CRUD operations | Write path |

### Availability

| Metric | Target | Measurement | Notes |
|--------|--------|-------------|-------|
| **Status page availability** | 99.99% | Synthetic checks from multiple providers | 52 min/year downtime max |
| **API availability** | 99.9% | Health check endpoints | 8.7 hours/year downtime max |
| **Independence guarantee** | 100% | Status page up when primary infra down | Critical requirement |
| **Notification delivery rate** | 99.5% | Successfully delivered / attempted | Per channel |

### Scalability

| Metric | Target | Notes |
|--------|--------|-------|
| **Concurrent page viewers** | 1M+ | During major incident |
| **Subscribers per status page** | 1M+ | Mix of email/SMS/webhook |
| **Components per page** | 500+ | Enterprise scale |
| **Incidents per page (active)** | 50+ | Concurrent incidents |
| **Status pages (multi-tenant)** | 100K+ | SaaS platform scale |
| **Notification throughput** | 10M/hour | Peak during major incident |

### Data

| Metric | Target | Notes |
|--------|--------|-------|
| **Incident retention** | 5 years | For compliance and SLA tracking |
| **Uptime metrics retention** | 2 years | Aggregated time-series |
| **Subscriber data retention** | Until unsubscribe + 30 days | GDPR compliance |
| **Audit log retention** | 1 year | Security and compliance |

---

## Capacity Estimations

### Assumptions

| Parameter | Value | Notes |
|-----------|-------|-------|
| Status pages (tenants) | 100,000 | Multi-tenant SaaS platform |
| Average components per page | 20 | Services/components tracked |
| Average subscribers per page | 5,000 | Mix of email/SMS/webhook |
| Incidents per page per month | 5 | Average incident count |
| Updates per incident | 4 | Investigating → Identified → Monitoring → Resolved |
| Page views (normal) | 1,000/day per page | Routine status checks |
| Page views (incident spike) | 100,000/hour per affected page | Major incident |
| SSE connections (normal) | 100 per page | Always-connected clients |
| SSE connections (incident) | 10,000 per page | Spike during incidents |

### Traffic Calculations

#### Normal Operations

| Metric | Calculation | Result |
|--------|-------------|--------|
| Daily page views | 100K pages × 1K views/day | 100M views/day |
| Peak page views/second | 100M / 86400 × 2 (peak factor) | ~2,300 RPS |
| API requests/day | 100K pages × 100 requests/day | 10M requests/day |
| SSE connections | 100K pages × 100 connections | 10M concurrent |

#### During Major Incident (single tenant)

| Metric | Calculation | Result |
|--------|-------------|--------|
| Page views/hour | 100,000 | 28 RPS for single page |
| SSE connections | 10,000 | Per affected page |
| Notifications triggered | 5,000 subscribers × 4 updates | 20,000 notifications |

#### Platform-Wide Incident (affecting platform itself)

| Metric | Calculation | Result |
|--------|-------------|--------|
| Page views/hour | 10M (all tenants checking) | 2,800 RPS |
| SSE connection storm | 1M new connections | Must be absorbed by edge |
| Notification volume | 500M subscribers notified | Over 24 hours |

### Storage Calculations

| Data Type | Calculation | Year 1 | Year 5 |
|-----------|-------------|--------|--------|
| **Incident data** | 100K pages × 60 incidents/year × 5KB | 30GB | 150GB |
| **Incident updates** | 100K × 60 × 4 updates × 1KB | 24GB | 120GB |
| **Component config** | 100K pages × 20 components × 1KB | 2GB | 2GB |
| **Subscriber data** | 100K × 5K subscribers × 500B | 250GB | 250GB |
| **Uptime metrics** | 100K × 20 components × 365 × 200B | 146GB | 730GB |
| **Audit logs** | 100M events/year × 500B | 50GB | 50GB (rolling) |
| **Total** | | ~500GB | ~1.3TB |

### Bandwidth Calculations

| Traffic Type | Calculation | Result |
|--------------|-------------|--------|
| **Page delivery (normal)** | 100M views × 50KB avg | 5TB/day |
| **Page delivery (incident spike)** | 10M views × 50KB | 500GB/hour |
| **SSE data** | 10M connections × 1KB/min | 600GB/hour |
| **Notification payloads** | 10M/hour × 2KB | 20GB/hour |
| **API traffic** | 10M requests × 5KB | 50GB/day |

---

## SLO/SLA Definitions

### Service Level Objectives (Internal)

| SLO | Target | Error Budget (monthly) | Measurement |
|-----|--------|------------------------|-------------|
| Status page availability | 99.99% | 4.3 minutes | Multi-region synthetic checks |
| Page load time (p99) | < 200ms | N/A | RUM + synthetic |
| Update propagation | < 30s (99th percentile) | N/A | Edge probe checks |
| Notification delivery (email) | 99.5% within 2 min | 0.5% failures | Delivery receipts |
| Notification delivery (SMS) | 99% within 1 min | 1% failures | Provider callbacks |
| Notification delivery (webhook) | 99% within 5 min | 1% failures | Including retries |

### Service Level Agreements (External)

| SLA Tier | Availability | Support Response | Price Point |
|----------|--------------|------------------|-------------|
| **Free** | 99.9% | Community | $0 |
| **Pro** | 99.95% | 24-hour | $$ |
| **Business** | 99.99% | 4-hour | $$$ |
| **Enterprise** | 99.99% + custom | 1-hour, dedicated | $$$$ |

### Error Budget Policy

| Error Budget Status | Action |
|--------------------|--------|
| > 50% remaining | Normal development velocity |
| 25-50% remaining | Increased reliability focus |
| < 25% remaining | Freeze non-critical changes |
| Exhausted | All hands on reliability |

---

## Constraints and Assumptions

### Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Multi-CDN complexity | Operational overhead | Managed multi-CDN services |
| CRDT eventual consistency | Users may see stale data briefly | Clear "last updated" timestamps |
| SMS delivery variability | Provider/carrier dependent | Multiple providers, fallback |
| Webhook reliability | Depends on subscriber endpoint | Retry with exponential backoff |

### Business Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Multi-cloud cost | Higher infrastructure cost | Essential for independence guarantee |
| Compliance requirements | GDPR/CCPA for subscriber data | Built-in consent management |
| Notification costs | SMS/email at scale expensive | Tiered pricing, rate limits |

### Assumptions

| Assumption | Risk if Wrong | Validation |
|------------|---------------|------------|
| 99.99% is sufficient | Reputation damage during outage | Customer research |
| 30s propagation acceptable | User frustration | A/B test with faster options |
| Email is primary channel | Low engagement | Channel usage analytics |
| Traffic spikes are 100x normal | Under-provisioning | Historical incident analysis |

---

## Capacity Planning Summary

### Initial Launch

| Resource | Specification | Justification |
|----------|---------------|---------------|
| **CDN** | Multi-CDN (2 providers minimum) | Independence requirement |
| **Edge compute** | Global deployment (50+ locations) | < 200ms latency globally |
| **Origin API servers** | 3 regions, 4 instances each | HA + capacity headroom |
| **Database** | Multi-region, 3 replicas per region | CRDT sync, HA |
| **Message queue** | Multi-region cluster | Notification delivery |
| **SSE servers** | 10 servers × 100K connections | 1M concurrent capacity |

### Growth Projections

| Metric | Year 1 | Year 3 | Year 5 |
|--------|--------|--------|--------|
| Status pages | 10K | 50K | 100K |
| Subscribers (total) | 50M | 250M | 500M |
| Storage | 100GB | 500GB | 1.3TB |
| Peak RPS | 5K | 25K | 50K |
| Notification volume/month | 100M | 500M | 1B |

---

## Cost Estimation (Order of Magnitude)

| Component | Monthly Cost (Year 1) | Notes |
|-----------|----------------------|-------|
| **Multi-CDN** | $10K-50K | Traffic-based pricing |
| **Edge compute** | $5K-20K | Request-based pricing |
| **Cloud infrastructure** | $20K-50K | Multi-region, HA |
| **Database** | $10K-30K | Multi-region, CRDT-enabled |
| **Email delivery** | $5K-20K | Volume-based |
| **SMS delivery** | $10K-50K | Per-message pricing |
| **Monitoring/Observability** | $5K-15K | Third-party tools |
| **Total** | $65K-235K/month | Scales with usage |

---

## Next Steps

- [High-Level Design](./02-high-level-design.md) - Architecture and component design
