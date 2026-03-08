# Observability

## Key Metrics

### Business Metrics (Customer-Facing)

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **Ticket Resolution Time (p50/p95/p99)** | Time from ticket creation to solved status (business hours) | p50 <4h, p95 <24h, p99 <48h | p50 >6h sustained for 30 min |
| **First Response Time (p50/p95/p99)** | Time from ticket creation to first agent reply (business hours) | p50 <1h, p95 <4h | p50 >2h sustained for 15 min |
| **SLA Breach Rate** | Percentage of tickets that breach SLA targets | <5% | >8% over rolling 1 hour |
| **SLA Near-Miss Rate** | Percentage of tickets within 10% of breach threshold | <15% | >25% (indicates systemic capacity issue) |
| **Agent Utilization** | Active tickets per agent / max capacity | 60-80% | <40% (overstaffed) or >90% (overloaded) |
| **Chat Wait Time (p50/p95)** | Time customer waits in queue before agent accepts | p50 <30s, p95 <2 min | p50 >1 min |
| **CSAT Score** | Average customer satisfaction (1-5 scale) | >4.0 | <3.5 rolling 24h |
| **Knowledge Base Deflection Rate** | Tickets avoided because customer found KB answer | >15% | <10% (KB quality issue) |
| **AI Routing Accuracy** | Tickets not manually reassigned within 1 hour | >85% | <75% |
| **Chat CSAT** | Satisfaction score specifically for chat interactions | >4.2 | <3.8 rolling 24h |

### System Metrics (Infrastructure)

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **API Latency (p50/p95/p99)** | Server-side response time for ticket API | p50 <100ms, p99 <800ms | p99 >1s for 5 min |
| **Chat Message Delivery Latency** | Time from send to delivery | p50 <80ms, p99 <300ms | p99 >500ms for 3 min |
| **WebSocket Connection Count** | Total active WebSocket connections | N/A (monitoring) | >90% capacity on any gateway node |
| **WebSocket Reconnection Rate** | Reconnections per minute | <100/min | >500/min (gateway instability) |
| **Ticket Write QPS** | Ticket creation + update operations per second | N/A | >80% of provisioned capacity |
| **Chat Message QPS** | Messages processed per second | N/A | >80% of provisioned capacity |
| **Search Query Latency** | Knowledge base search response time | p50 <200ms, p99 <1s | p99 >2s for 5 min |
| **Search Index Freshness** | Lag between article update and searchability | <30 seconds | >2 min |
| **SLA Timer Drift** | Accuracy of timer computations | <1 second per 24h | >5 seconds drift detected |
| **Queue Consumer Lag** | Messages waiting to be processed | <1000 per topic | >10,000 per topic |
| **Error Rate** | 5xx responses / total requests | <0.1% | >0.5% for 5 min |
| **Database Replication Lag** | Time behind primary for read replicas | <2 seconds | >10 seconds |
| **Cache Hit Rate** | Cache hits / (hits + misses) | >95% | <85% |

### Per-Tenant Metrics

| Metric | Description | Use |
|--------|-------------|-----|
| **Tenant Ticket Volume** | Tickets per hour per tenant | Noisy neighbor detection |
| **Tenant API QPS** | API requests per second per tenant | Rate limiting enforcement |
| **Tenant SLA Compliance** | Per-tenant SLA breach rate | Tenant health assessment |
| **Tenant Chat Concurrency** | Active chat sessions per tenant | Capacity planning |
| **Tenant Storage Usage** | Storage consumed per tenant | Billing, quota enforcement |

---

## Structured Logging

### Log Schema

```
PSEUDOCODE: Structured Log Format

STRUCTURE LogEntry:
    timestamp: iso8601         // "2026-03-08T14:30:00.123Z"
    level: string              // "info", "warn", "error", "debug"
    service: string            // "ticket-service", "chat-service", "sla-engine"
    instance_id: string        // "ticket-svc-pod-3a7b"
    trace_id: string           // Distributed trace ID
    span_id: string            // Current span ID
    tenant_id: string          // Tenant context (ALWAYS present)
    actor_id: string           // Agent or customer ID
    actor_type: string         // "agent", "customer", "system"
    event: string              // Machine-readable event name
    message: string            // Human-readable description
    data: jsonb                // Event-specific structured data
    duration_ms: int           // Operation duration (if applicable)
    error: jsonb               // Error details (if applicable)

// Example log entries:

// Ticket creation
{
    "timestamp": "2026-03-08T14:30:00.123Z",
    "level": "info",
    "service": "ticket-service",
    "trace_id": "abc123",
    "tenant_id": "tnt_xyz",
    "actor_id": "cust_456",
    "actor_type": "customer",
    "event": "ticket.created",
    "message": "Ticket created via web channel",
    "data": {
        "ticket_id": "tkt_789",
        "ticket_number": 4521,
        "channel": "web",
        "priority": "high",
        "intent": "billing_access_issue",
        "intent_confidence": 0.91
    },
    "duration_ms": 45
}

// SLA breach
{
    "timestamp": "2026-03-08T18:30:00.456Z",
    "level": "warn",
    "service": "sla-engine",
    "trace_id": "def456",
    "tenant_id": "tnt_xyz",
    "actor_id": "system",
    "actor_type": "system",
    "event": "sla.breached",
    "message": "First response SLA breached for ticket #4521",
    "data": {
        "ticket_id": "tkt_789",
        "timer_type": "first_response",
        "target_at": "2026-03-08T17:00:00Z",
        "breached_at": "2026-03-08T18:30:00Z",
        "elapsed_business_minutes": 270,
        "sla_target_minutes": 240,
        "policy_id": "pol_abc",
        "assignee_id": "agt_42"
    }
}

// AI routing decision
{
    "timestamp": "2026-03-08T14:30:01.789Z",
    "level": "info",
    "service": "routing-service",
    "trace_id": "abc123",
    "tenant_id": "tnt_xyz",
    "event": "ticket.routed",
    "message": "Ticket routed to agent via AI",
    "data": {
        "ticket_id": "tkt_789",
        "routing_method": "ai",
        "assigned_agent_id": "agt_42",
        "intent": "billing_access_issue",
        "intent_confidence": 0.91,
        "agent_score": 0.87,
        "score_breakdown": {
            "skill_match": 0.95,
            "availability": 0.80,
            "affinity": 0.30,
            "load_balance": 0.70
        },
        "candidates_evaluated": 8
    },
    "duration_ms": 120
}

// Chat message delivery
{
    "timestamp": "2026-03-08T14:31:00.012Z",
    "level": "info",
    "service": "chat-service",
    "trace_id": "ghi789",
    "tenant_id": "tnt_xyz",
    "event": "chat.message.delivered",
    "data": {
        "conversation_id": "conv_abc",
        "message_id": "msg_def",
        "sender_type": "agent",
        "delivery_latency_ms": 67,
        "gateway_node": "ws-gw-3"
    },
    "duration_ms": 67
}

// Error: webhook delivery failure
{
    "timestamp": "2026-03-08T14:35:00.345Z",
    "level": "error",
    "service": "notification-service",
    "trace_id": "jkl012",
    "tenant_id": "tnt_xyz",
    "event": "webhook.delivery.failed",
    "message": "Webhook delivery failed after 3 attempts",
    "data": {
        "webhook_id": "wh_abc",
        "target_url": "https://tenant-app.example.com/webhooks",
        "event_type": "ticket.created",
        "attempt": 3,
        "consecutive_failures": 7
    },
    "error": {
        "type": "ConnectionTimeout",
        "message": "Connection timed out after 10s",
        "http_status": null
    }
}
```

### Log Level Strategy

| Level | When to Use | Examples |
|-------|------------|---------|
| **ERROR** | Unrecoverable failure requiring immediate attention | Database connection failure, SLA timer computation error, authentication service down |
| **WARN** | Degraded functionality but system continues operating | SLA breach, webhook delivery failure (will retry), cache miss spike, AI model confidence below threshold |
| **INFO** | Normal business events worth recording | Ticket created, agent assigned, chat started, SLA fulfilled, article published |
| **DEBUG** | Detailed operational data for troubleshooting | Query execution times, cache hit/miss details, routing score breakdown, WebSocket frame details |

---

## Distributed Tracing

### Trace Propagation

```
PSEUDOCODE: Trace Context Flow

// A single ticket creation generates a trace spanning multiple services:

TRACE: "Ticket Creation" (trace_id: abc123)
├── SPAN: API Gateway (5ms)
│   └── Auth validation, tenant resolution, rate limit check
├── SPAN: Ticket Service - Create (45ms)
│   ├── SPAN: Database Write (12ms)
│   └── SPAN: Event Publish (3ms)
├── SPAN: AI/ML Service - Classify (85ms)  [async, child of event]
│   ├── SPAN: Intent Classification (42ms)
│   ├── SPAN: Priority Prediction (28ms)
│   └── SPAN: Sentiment Analysis (15ms)
├── SPAN: Routing Service - Route (120ms)  [async, child of classify]
│   ├── SPAN: Rule Evaluation (18ms)
│   ├── SPAN: Agent Query (35ms)
│   └── SPAN: Score Computation (22ms)
├── SPAN: SLA Engine - Create Timers (30ms)  [async, child of route]
│   ├── SPAN: Load Policy (5ms)
│   ├── SPAN: Compute Target Time (15ms)
│   └── SPAN: Schedule Timer (10ms)
├── SPAN: Automation Service - Evaluate (55ms)  [async, child of event]
│   ├── SPAN: Load Rules (8ms)
│   └── SPAN: Rule Execution (47ms)
└── SPAN: Notification Service - Notify (200ms)  [async, child of route]
    ├── SPAN: Agent Push Notification (45ms)
    ├── SPAN: Customer Email (150ms)
    └── SPAN: Webhook Delivery (180ms)

// Trace context propagated via:
// - HTTP headers: X-Trace-ID, X-Span-ID, X-Parent-Span-ID
// - Message queue headers: trace_id, span_id in event envelope
// - WebSocket frames: trace_id in message metadata
```

### Key Spans to Instrument

| Service | Critical Spans | Why |
|---------|---------------|-----|
| **API Gateway** | Auth, rate limit, routing | Baseline latency; identify slow auth |
| **Ticket Service** | DB read/write, event publish | Core write path performance |
| **Chat Service** | Message persist, message deliver | Real-time latency tracking |
| **AI/ML Service** | Model inference, feature extraction | ML pipeline latency breakdown |
| **Routing Service** | Rule eval, agent query, scoring | Routing decision latency |
| **SLA Engine** | Timer compute, business hour calc | Timer accuracy verification |
| **Search** | Query parse, index search, permission filter | Search latency breakdown |
| **Notification** | Per-channel delivery (email, push, webhook) | Delivery pipeline health |

---

## Alerting Rules

### Critical Alerts (Page-Worthy)

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| **API Error Rate Spike** | 5xx rate >1% for 3 min | P1 | Page on-call; check database and service health |
| **Chat Delivery Failure** | Message delivery failure >5% for 2 min | P1 | Page on-call; check WebSocket Gateway health |
| **SLA Timer Worker Down** | No timer checks for 60 seconds | P1 | Page on-call; SLA breaches will be missed |
| **Database Primary Unavailable** | Primary unreachable for 30 seconds | P1 | Auto-failover initiated; page on-call to verify |
| **Cross-Tenant Data Leak** | Audit log shows tenant_id mismatch in data access | P0 | Immediate page; security incident response |
| **Authentication Service Down** | Auth failures >50% for 2 min | P1 | Page on-call; agents cannot log in |

### Warning Alerts

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| **SLA Breach Rate Elevated** | Breach rate >10% for rolling 1 hour | P2 | Notify support ops; investigate staffing/routing |
| **Chat Queue Overflow** | Customers waiting >5 min for agent | P2 | Notify supervisors; consider routing overflow to email |
| **AI Routing Accuracy Drop** | Reassignment rate >25% for 1 hour | P3 | Notify ML team; check model health |
| **Database Replication Lag** | Lag >10 seconds for 5 min | P2 | Investigate replication health; may affect read consistency |
| **Queue Consumer Lag** | >50,000 messages in backlog for 10 min | P2 | Scale consumers; check for processing errors |
| **Webhook Delivery Failures** | >10% delivery failure rate for 15 min | P3 | Check destination health; may need to circuit-break |
| **Cache Hit Rate Drop** | Cache hit rate <80% for 10 min | P3 | Investigate cache evictions; may need to increase cache size |
| **Hot Tenant Detected** | Single tenant >20% of total QPS for 10 min | P3 | Verify rate limits applied; consider throttling |
| **Search Index Lag** | Index freshness >5 min | P3 | Check indexing pipeline health |

### Informational Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| **Tenant Approaching Plan Limit** | Tenant at 80% of ticket/agent quota | Notify tenant admin |
| **Disk Usage Warning** | Database disk >70% | Plan capacity expansion |
| **Certificate Expiry** | TLS cert expires in <14 days | Renew certificate |
| **Model Retraining Completed** | AI model retrained successfully | Log; no action needed |

---

## Dashboards

### Operations Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    OPERATIONS OVERVIEW                          │
├─────────────────────┬───────────────────────────────────────────┤
│ Active Tickets      │ API Latency (p50/p95/p99)               │
│ ████████ 2.3M      │ ▁▂▃▂▁▂▃▅▃▂▁▁▂▃▂▁  p50: 85ms           │
│                     │                     p95: 320ms           │
│ New Today: 14.2M    │                     p99: 750ms           │
├─────────────────────┼───────────────────────────────────────────┤
│ Active Chats        │ Chat Delivery Latency                    │
│ ████ 487K           │ ▁▁▁▂▁▁▁▁▁▂▁▁▁▁▁▁  p50: 62ms           │
│                     │                     p99: 195ms           │
│ Agents Online: 1.8M │                                          │
├─────────────────────┼───────────────────────────────────────────┤
│ Error Rate          │ Queue Consumer Lag                       │
│ 0.04% ✓            │ ticket-events: 234 ✓                     │
│                     │ chat-events: 89 ✓                        │
│                     │ notification-jobs: 1,205 ⚠               │
│                     │ webhook-jobs: 3,412 ⚠                    │
├─────────────────────┼───────────────────────────────────────────┤
│ WebSocket Conns     │ Database Health                          │
│ 2.4M / 3.0M (80%)  │ Primary: ✓ healthy                      │
│                     │ Replicas: ✓ lag <1s                      │
│ Gateway Nodes: 28   │ Shard utilization: 62%                   │
└─────────────────────┴───────────────────────────────────────────┘
```

### SLA Compliance Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                   SLA COMPLIANCE (Last 24h)                     │
├─────────────────────┬───────────────────────────────────────────┤
│ Overall Compliance  │ Breach Distribution by Priority           │
│ ██████████ 96.2%    │ Urgent:  ▓▓▓▓░  12 breaches (2.1%)     │
│                     │ High:    ▓░░░░  45 breaches (3.8%)     │
│ Target: 95%    ✓    │ Normal:  ░░░░░  128 breaches (4.2%)    │
│                     │ Low:     ░░░░░  67 breaches (5.1%)     │
├─────────────────────┼───────────────────────────────────────────┤
│ First Response      │ Resolution Time                          │
│ p50: 42 min         │ p50: 3.2 hours                          │
│ p95: 3.1 hours      │ p95: 18.4 hours                         │
│ Breaches: 89 (1.2%) │ Breaches: 163 (2.8%)                    │
├─────────────────────┼───────────────────────────────────────────┤
│ Active SLA Timers   │ Top Breaching Tenants                    │
│ Total: 4.8M         │ 1. Acme Corp: 23 breaches               │
│ Warning: 12,400     │ 2. TechStart: 18 breaches               │
│ Near-breach: 3,200  │ 3. MegaCorp: 15 breaches                │
│ Breached today: 252 │ 4. DataFlow: 12 breaches                │
└─────────────────────┴───────────────────────────────────────────┘
```

### Agent Performance Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                AGENT PERFORMANCE (Tenant: Acme Corp)            │
├─────────────────────┬───────────────────────────────────────────┤
│ Team Summary        │ Agent Leaderboard (CSAT)                  │
│ Agents Online: 45   │ 1. Alice S.    ★ 4.8  (142 tickets)    │
│ Avg Load: 72%       │ 2. Bob K.      ★ 4.7  (128 tickets)    │
│ Avg Handle Time:    │ 3. Carol M.    ★ 4.5  (155 tickets)    │
│   12.4 min          │ 4. Dave P.     ★ 4.3  (97 tickets)     │
├─────────────────────┼───────────────────────────────────────────┤
│ Tickets Today       │ Channel Distribution                     │
│ Created: 342        │ Email:  ██████████░░ 55%                │
│ Solved: 298         │ Chat:   █████░░░░░░░ 30%                │
│ Backlog: 127        │ Web:    ██░░░░░░░░░░ 10%                │
│                     │ API:    █░░░░░░░░░░░ 5%                 │
├─────────────────────┼───────────────────────────────────────────┤
│ AI Routing Accuracy │ KB Deflection                            │
│ 87% first-contact   │ Searches: 890                            │
│ resolution          │ Deflected: 134 (15%)                     │
│                     │ Top deflecting article:                   │
│ Reassigned: 13%     │ "Password Reset Guide" (42 deflections) │
└─────────────────────┴───────────────────────────────────────────┘
```

---

## Observability Best Practices

### Correlation IDs

Every request gets a unique `request_id` that flows through all services. Related requests (e.g., a ticket creation that triggers routing, SLA, and notifications) share a `trace_id`. This enables:

- End-to-end latency analysis for a single ticket creation
- Debugging cross-service failures by following the trace
- Understanding the full impact of a single customer action

### Cardinality Management

High-cardinality labels (like `ticket_id` or `customer_id`) should not be used as metric labels---they cause metric explosion. Instead:

- Use logs for per-ticket debugging (searchable by ticket_id)
- Use traces for per-request analysis (filterable by trace_id)
- Use metrics only with bounded cardinality: `tenant_id` (150K), `service` (10), `priority` (4), `channel` (5), `status` (6)

Exception: tenant_id as a metric label is acceptable because tenant-level metrics are essential for noisy neighbor detection. With 150K tenants, this is within acceptable cardinality for modern metrics systems.

### Health Checks

```
PSEUDOCODE: Service Health Check Hierarchy

FUNCTION health_check():
    checks = {
        "database": check_db_connectivity(),
        "cache": check_cache_connectivity(),
        "queue": check_queue_connectivity(),
        "search": check_search_connectivity(),
    }

    // Determine overall status
    IF all checks pass:
        RETURN {status: "healthy", checks: checks}
    ELSE IF critical checks pass (database, cache):
        RETURN {status: "degraded", checks: checks}
    ELSE:
        RETURN {status: "unhealthy", checks: checks}

// Liveness: "Is this process alive?" (simple, fast)
// Readiness: "Can this process handle requests?" (full dependency check)
// Startup: "Has this process finished initializing?" (model loading, cache warming)
```
