# Requirements & Estimations — Incident Management System

## 1. Functional Requirements

### 1.1 Alert Ingestion & Deduplication

- Accept alerts from heterogeneous sources (monitoring systems, APM, custom integrations) via REST API, email, and webhooks
- Deduplicate alerts using configurable deduplication keys (source + alert class + service)
- Group correlated alerts into a single incident (e.g., 500 "database connection timeout" alerts → 1 incident)
- Support suppression rules and maintenance windows to mute expected noise

### 1.2 On-Call Scheduling & Rotation

- Define rotation schedules with configurable rotation periods (daily, weekly, custom)
- Support multiple schedule layers (primary, secondary, manager) that overlay into a final schedule
- Handle overrides (vacation swaps, ad-hoc coverage changes) with time-bounded entries
- Implement follow-the-sun scheduling for globally distributed teams
- Track on-call burden metrics per engineer for fair distribution

### 1.3 Escalation Policies

- Define multi-level escalation chains (L1 on-call → L2 team lead → L3 engineering manager → L4 VP)
- Configurable escalation timeouts per level (e.g., L1 has 5 minutes to acknowledge before L2 is paged)
- Support both linear and round-robin escalation within a level
- Allow re-escalation on severity change
- Repeat policies for unacknowledged incidents

### 1.4 Multi-Channel Notification

- Deliver notifications via phone call (TTS), SMS, push notification, email, Slack, and Microsoft Teams
- Configurable notification rules per user (e.g., "phone call for P1, push for P2, email for P3")
- Retry logic with channel failover (push fails → SMS → phone call)
- Delivery confirmation and read receipts where channel supports it
- Quiet hours with override for critical severity

### 1.5 Incident Lifecycle Management

- State machine: `triggered` → `acknowledged` → `investigating` → `mitigating` → `resolved`
- Support for merging duplicate incidents and splitting compound incidents
- Incident roles (commander, communication lead, subject-matter expert)
- Real-time collaboration (Slack/Teams channel auto-creation, war room)
- Timeline auto-capture (every state change, notification, action logged with timestamp)

### 1.6 Runbook Automation

- Attach runbooks (diagnostic or remediation) to services or alert types
- Support manual trigger, semi-automatic (suggest + confirm), and fully automatic execution modes
- Capture runbook execution output as incident context
- Parameterized runbooks with input from alert payload
- Approval gates for destructive remediation actions

### 1.7 Post-Incident Reviews

- Auto-generate draft postmortem from incident timeline, chat transcripts, and actions taken
- Structured templates (summary, impact, root cause, contributing factors, action items)
- Action item tracking with owners and due dates
- Trend analysis across incidents (recurring root causes, repeat offenders)

### 1.8 Analytics & Reporting

- Track MTTA (Mean Time to Acknowledge), MTTR (Mean Time to Resolve), MTTD (Mean Time to Detect)
- Incident frequency by service, severity, team
- On-call burden analysis (pages per engineer, after-hours pages, sleep interruptions)
- SLA compliance reporting

---

## 2. Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Availability** | 99.99% (52 min downtime/year) | This is a critical-path system; downtime means incidents go undetected |
| **Alert-to-notification latency** | p99 < 30 seconds | Human response time starts only after notification; every second of platform latency adds to MTTR |
| **Notification delivery rate** | > 99.9% within 60 seconds | Failed notification = missed incident = potential outage extension |
| **Alert ingestion throughput** | 100K alerts/minute sustained, 1M/minute burst | Alert storms during major incidents can generate 10-100x normal volume |
| **Deduplication accuracy** | False positive < 0.1%, false negative < 1% | False positive (over-grouping) hides separate incidents; false negative (under-grouping) creates noise |
| **Data durability** | Zero alert loss | Every alert must be persisted before acknowledgment; no fire-and-forget |
| **Escalation timer accuracy** | ±5 seconds | Escalation timers must fire reliably even under load; late escalation defeats the purpose |
| **Multi-region** | Active-active across ≥2 regions | Single-region failure must not prevent incident notification |

---

## 3. Capacity Estimations

### 3.1 Alert Volume

| Metric | Value | Calculation |
|--------|-------|-------------|
| Monitored services | 50,000 | Large enterprise with microservice architecture |
| Avg alerts/service/day (normal) | 2 | Most services generate low-noise alerts |
| Daily alert volume (normal) | 100K | 50,000 × 2 |
| Alert storm multiplier | 50x | Major incident affects cascading services |
| Peak alert volume (storm) | 5M/day → ~58K/min | 100K × 50 concentrated in 90-min window |
| Post-dedup incident volume | 500-2,000/day | 100:1 to 50:1 deduplication ratio |

### 3.2 Notification Volume

| Metric | Value | Calculation |
|--------|-------|-------------|
| Incidents requiring notification/day | 1,000 | Post-dedup, after suppression and maintenance windows |
| Avg notifications per incident | 3 | Primary + backup channels + escalation |
| Daily notifications | 3,000 | 1,000 × 3 |
| Peak notifications (storm) | 15,000/hour | 5x normal during major incidents; must sustain telephony burst |
| Registered on-call users | 10,000 | Across all teams in a large org |

### 3.3 Storage

| Data Type | Size/Record | Retention | Daily Volume | Storage/Year |
|-----------|-------------|-----------|--------------|--------------|
| Raw alerts | 2 KB avg | 90 days | 200 MB | 18 GB (rolling) |
| Incidents | 10 KB avg | 3 years | 10 MB | 10.8 GB |
| Notification records | 1 KB avg | 1 year | 3 MB | 1.1 GB |
| On-call schedules | 500 B/entry | Indefinite | Negligible | < 1 GB |
| Runbook executions | 50 KB avg | 1 year | 50 MB | 18 GB |
| Postmortem documents | 100 KB avg | Indefinite | 5 MB | 1.8 GB |
| **Total** | | | | **~50 GB/year** |

### 3.4 Compute

| Component | Baseline | Storm Peak | Notes |
|-----------|----------|------------|-------|
| Alert ingestion | 4 pods | 40 pods | Stateless; auto-scales on queue depth |
| Deduplication engine | 8 pods | 20 pods | Requires hot state (recent alert fingerprints) |
| Escalation engine | 4 pods | 8 pods | Timer-driven; less bursty |
| Notification dispatcher | 6 pods | 30 pods | Bound by external channel rate limits |
| Runbook executor | 4 pods | 12 pods | Compute-heavy; isolated for security |

---

## 4. SLOs and SLAs

### 4.1 Internal SLOs

| SLO | Target | Measurement |
|-----|--------|-------------|
| Alert ingestion success rate | 99.99% | Alerts accepted / alerts received |
| Alert-to-notification p50 latency | < 10 seconds | From API receipt to first notification dispatch |
| Alert-to-notification p99 latency | < 30 seconds | Including dedup, routing, and channel dispatch |
| Escalation timer accuracy | 99.9% fire within ±5s | Timer fires compared to configured timeout |
| Notification delivery success (phone) | > 98% | Call connected / call attempted |
| Notification delivery success (push) | > 99.5% | Push delivered / push sent |
| Deduplication precision | > 99.9% | 1 − (false positives / total dedup decisions) |
| Platform availability | 99.99% | Measured across all regions combined |

### 4.2 External SLAs (to customers)

| SLA | Commitment | Penalty |
|-----|------------|---------|
| Web availability | 99.9% monthly | Service credits |
| API availability | 99.95% monthly | Service credits |
| Notification delivery | 99.9% within 60s | Service credits |
| Scheduled downtime | Zero | All maintenance performed via rolling deploys |

---

## 5. Key Constraints

1. **Telephony provider dependency** — Phone calls and SMS depend on external carriers with their own rate limits and outage profiles
2. **Global compliance** — Notification content may contain PII; must comply with GDPR, CCPA, and regional telecom regulations
3. **Channel heterogeneity** — Each notification channel (phone, SMS, push, Slack, Teams, email) has fundamentally different delivery semantics, latencies, and failure modes
4. **Clock sensitivity** — Escalation timers and on-call schedule evaluation depend on accurate, synchronized clocks across all nodes
5. **Alert format diversity** — Alerts arrive in hundreds of different schemas from different monitoring tools; normalization is essential
