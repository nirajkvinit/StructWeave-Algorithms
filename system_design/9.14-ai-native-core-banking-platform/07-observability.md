# Observability — AI-Native Core Banking Platform

## 1. Observability Strategy

Banking observability serves two masters: **operational excellence** (keep the system running) and **regulatory compliance** (prove the system behaved correctly). Every metric, log, and trace must be designed with both purposes in mind.

### 1.1 Observability Pillars

| Pillar | Purpose | Retention | Access Control |
|---|---|---|---|
| **Metrics** | Real-time system health, capacity planning, SLO tracking | 2 years (aggregated: 5 years) | Operations + engineering |
| **Logs** | Event-level debugging, security forensics | 90 days hot, 7 years archived | Tiered access by sensitivity |
| **Traces** | Request-level latency analysis, dependency mapping | 30 days (sampled), full for flagged transactions | Engineering |
| **Audit Trail** | Regulatory proof of all state changes | 7-10 years (immutable) | Compliance + regulators (read-only) |
| **Business Events** | Transaction analytics, fraud pattern analysis | 5 years | Business + compliance |

---

## 2. Metrics

### 2.1 Golden Signals by Service

| Service | Latency | Traffic | Errors | Saturation |
|---|---|---|---|---|
| **Transaction Engine** | Posting latency p50/p95/p99 | TPS by type (debit, credit, transfer) | Failed postings, balance check failures | Partition queue depth, lock contention rate |
| **Payment Service** | End-to-end payment time | Payments/min by type and corridor | Rejected payments, timeout rate | Payment queue depth |
| **Balance Service** | Query latency p50/p99 | Balance queries/sec | Cache miss rate, stale reads | Cache hit ratio, memory utilization |
| **Fraud Engine** | Scoring latency p50/p99 | Scores/sec | Model errors, circuit breaker trips | GPU utilization, feature store freshness |
| **Compliance Engine** | Screening latency p50/p99 | Screenings/sec | False positives, missed screening | Alert queue depth, analyst workload |
| **Open Banking APIs** | Response time p95 | Requests/sec by TPP | 4xx/5xx by endpoint | Rate limit utilization per TPP |

### 2.2 Business Metrics

```
Transaction Metrics:
  banking.transactions.total          {type, currency, entity, channel}
  banking.transactions.amount         {type, currency, entity}  [histogram]
  banking.transactions.success_rate   {type, entity}
  banking.transactions.reversal_rate  {type, entity}

Account Metrics:
  banking.accounts.active             {type, entity, currency}
  banking.accounts.opened             {entity, product}    [counter]
  banking.accounts.closed             {entity, reason}     [counter]
  banking.accounts.dormant            {entity}

Payment Metrics:
  banking.payments.initiated          {type, corridor, currency}
  banking.payments.settled            {type, corridor}
  banking.payments.stp_rate           {type, corridor}  // Straight-through processing
  banking.payments.return_rate        {type, corridor}

Compliance Metrics:
  banking.compliance.screenings       {type, result}
  banking.compliance.alerts           {severity, type}
  banking.compliance.false_positive_rate {type}
  banking.compliance.investigation_time  {severity}  [histogram]

FX Metrics:
  banking.fx.conversions              {currency_pair, entity}
  banking.fx.spread_revenue           {currency_pair, entity}
  banking.fx.position_utilization     {currency, entity}
```

### 2.3 Infrastructure Metrics

```
Event Store Metrics:
  eventstore.write_latency            {partition}  [histogram]
  eventstore.events_written           {partition}  [counter]
  eventstore.replication_lag          {follower}   [gauge]
  eventstore.partition_size           {partition}  [gauge]
  eventstore.checksum_violations      {partition}  [counter]

Service Mesh Metrics:
  mesh.request_duration               {source, destination}  [histogram]
  mesh.circuit_breaker_state          {service}  [gauge: 0=closed, 1=open]
  mesh.mtls_handshake_failures        {service_pair}  [counter]
  mesh.retry_count                    {source, destination}  [counter]

HSM Metrics:
  hsm.operations_per_second           {operation_type}
  hsm.latency                         {operation_type}  [histogram]
  hsm.key_usage                       {key_id}  [counter]
  hsm.available_sessions              {hsm_cluster}  [gauge]
```

---

## 3. Logging

### 3.1 Log Classification

| Category | Content | Sensitivity | Retention |
|---|---|---|---|
| **Application logs** | Service operations, errors, debug info | Low-Medium | 90 days |
| **Transaction logs** | Financial operations with amounts and accounts | High | 7 years |
| **Security logs** | Auth events, access attempts, policy decisions | High | 7 years |
| **Audit logs** | All state changes, approvals, overrides | Critical | 10 years |
| **Compliance logs** | Screening results, alert dispositions, filings | Critical | 10 years |
| **API access logs** | All API calls with request/response metadata | Medium | 2 years |

### 3.2 Structured Log Format

```
Standard Log Entry:
{
  "timestamp": "2026-03-09T14:30:00.123Z",
  "level": "INFO",
  "service": "transaction-engine",
  "instance": "txn-engine-pod-7a3b",
  "trace_id": "abc123def456",
  "span_id": "span789",
  "correlation_id": "corr-uuid-001",
  "entity_id": "ENTITY_US",
  "event_type": "TRANSACTION_POSTED",
  "message": "Transaction posted successfully",
  "attributes": {
    "transaction_id": "txn-uuid",
    "account_id": "MASKED-****1234",
    "amount": "REDACTED",
    "currency": "USD",
    "transaction_type": "TRANSFER",
    "processing_time_ms": 42
  }
}
```

**Critical PII rules:**
- Account numbers: masked (show last 4 only)
- Customer names: never logged in application logs
- Amounts: logged in transaction logs (encrypted), redacted in application logs
- Full PII: only in audit logs (encrypted, restricted access)

### 3.3 Audit Trail Requirements

```
Audit Event Structure:
{
  "audit_id": "aud-uuid",
  "timestamp": "2026-03-09T14:30:00.123456Z",  // Microsecond precision
  "event_type": "STATE_CHANGE",
  "actor": {
    "type": "USER",               // USER, SYSTEM, TPP
    "id": "user-uuid",
    "role": "BRANCH_MANAGER",
    "entity": "ENTITY_US",
    "ip_address": "10.x.x.x",
    "session_id": "sess-uuid"
  },
  "resource": {
    "type": "ACCOUNT",
    "id": "acc-uuid",
    "entity": "ENTITY_US"
  },
  "action": "ACCOUNT_FREEZE",
  "previous_state": { "status": "ACTIVE" },
  "new_state": { "status": "FROZEN" },
  "reason": "Compliance hold - pending investigation",
  "authorization": {
    "approved_by": "compliance-officer-uuid",
    "approval_time": "2026-03-09T14:29:55Z",
    "four_eyes_verified": true
  },
  "integrity_hash": "sha256:abc123..."
}

Audit Trail Properties:
  1. Append-only — no updates or deletions
  2. Cryptographically chained — tamper detection
  3. Independently verifiable — separate from operational systems
  4. Time-stamped by trusted time source
  5. Accessible to regulators within 24 hours on request
```

---

## 4. Distributed Tracing

### 4.1 Trace Context Propagation

```
Every request carries trace context through all services:

Headers:
  X-Trace-ID: globally unique identifier for the request
  X-Span-ID: identifier for the current service span
  X-Parent-Span-ID: identifier for the calling service span
  X-Correlation-ID: business correlation (links related transactions)
  X-Entity-ID: legal entity context (for access control)

Propagation rules:
  - HTTP: W3C Trace Context headers
  - Event bus: trace context in event envelope metadata
  - Batch jobs: new trace per batch item, linked to triggering trace
```

### 4.2 Critical Path Tracing

For a real-time payment, the trace captures:

```
Payment Processing Trace (target: < 200ms total):

├─ API Gateway (3ms)
│  ├─ Token validation (1ms)
│  └─ Rate limit check (1ms)
│
├─ Payment Service (15ms)
│  ├─ Request validation (2ms)
│  ├─ Fraud scoring (18ms) ← critical dependency
│  └─ Payment routing decision (2ms)
│
├─ Transaction Engine (35ms)
│  ├─ Limit check (3ms)
│  ├─ Balance verification (5ms)
│  ├─ Entry generation (2ms)
│  └─ Atomic commit to event store (25ms) ← write latency
│
├─ Post-processing (async, not on critical path)
│  ├─ Balance projection update (5ms)
│  ├─ Event publication (2ms)
│  ├─ Compliance screening (45ms)
│  └─ ISO 20022 generation (30ms)
│
Total synchronous path: ~71ms (well within 200ms budget)
```

### 4.3 Sampling Strategy

```
Sampling Rules:

1. Always trace (100%):
   - Failed transactions (any error)
   - High-value transactions (> threshold per entity)
   - Flagged by fraud engine (score > 50)
   - Compliance alerts generated
   - Cross-border payments
   - New account openings

2. Head-based sampling (10%):
   - Routine balance inquiries
   - Standard domestic transfers
   - Reference data lookups

3. Tail-based sampling:
   - Retain all traces with latency > p95
   - Retain all traces with errors in any span
   - Retain all traces touching degraded services

Storage:
   - Full traces: 30 days
   - Trace summaries: 1 year
   - Compliance-tagged traces: 7 years
```

---

## 5. Alerting Framework

### 5.1 Alert Tiers

| Tier | Condition | Response | Channel |
|---|---|---|---|
| **P1 - Page** | Transaction processing halted, data integrity breach | Immediate human response required | PagerDuty + phone call to on-call |
| **P2 - Urgent** | SLO burn rate critical, payment network disconnected | Response within 15 minutes | PagerDuty + chat |
| **P3 - Warning** | Elevated error rates, capacity approaching threshold | Response within 1 hour | Chat + email |
| **P4 - Info** | Trend changes, non-critical anomalies | Review in next business day | Dashboard + email |

### 5.2 Key Alert Definitions

```
Alert: Transaction Processing Failure Rate
  condition: error_rate(transaction_engine) > 0.1% for 2 minutes
  severity: P1
  action: Page on-call SRE + notify transaction operations

Alert: Event Store Replication Lag
  condition: replication_lag > 1 second for any follower
  severity: P1
  action: Page on-call SRE (risk of data loss on failover)

Alert: Balance Reconciliation Mismatch
  condition: reconciliation.discrepancies > 0
  severity: P1
  action: Page on-call SRE + notify finance operations

Alert: Fraud Engine Circuit Breaker Open
  condition: circuit_breaker_state(fraud_engine) = OPEN
  severity: P2
  action: Page ML on-call + notify fraud operations

Alert: SLO Burn Rate
  condition: error_budget_consumed > 50% in 1 hour
  severity: P2
  action: Page on-call SRE with burn rate details

Alert: Sanctions List Staleness
  condition: sanctions_list_age > 24 hours
  severity: P2
  action: Notify compliance team + security operations

Alert: HSM Capacity
  condition: hsm.available_sessions < 20%
  severity: P3
  action: Alert infrastructure team

Alert: Open Banking API SLA Risk
  condition: api_latency_p95(open_banking) > 250ms for 5 minutes
  severity: P3
  action: Alert API platform team
```

### 5.3 Regulatory Alert Requirements

```
Regulatory Monitoring Alerts:

Alert: Capital Adequacy Approaching Minimum
  condition: cet1_ratio < required_ratio + 1%
  action: Alert treasury + risk management + board notification

Alert: Large Exposure Limit Breach
  condition: exposure_to_single_counterparty > 25% of capital
  action: Alert risk management + regulatory reporting

Alert: Liquidity Coverage Ratio Below Threshold
  condition: lcr < 100%
  action: Alert treasury + trigger contingency funding plan

Alert: Suspicious Transaction Volume Spike
  condition: alerts_per_hour > 3 * rolling_average
  action: Alert AML team lead + increase screening sensitivity
```

---

## 6. Dashboards

### 6.1 Dashboard Hierarchy

```
Level 1: Executive Dashboard
  - System health (green/yellow/red)
  - Transaction volumes and trends
  - Revenue metrics (fees, FX spread)
  - Compliance alert summary

Level 2: Operations Dashboard
  - Real-time TPS and latency
  - Payment network status per corridor
  - Batch processing progress
  - Incident status and resolution

Level 3: Service Dashboard (per service)
  - Golden signals (latency, traffic, errors, saturation)
  - Dependency health
  - Resource utilization
  - Recent deployments and their impact

Level 4: Compliance Dashboard
  - Screening volumes and hit rates
  - Alert investigation queue depth
  - Regulatory report generation status
  - SAR/STR filing pipeline status
  - Capital adequacy ratios (real-time)

Level 5: Security Dashboard
  - Authentication failure patterns
  - API abuse detection
  - Certificate expiry timeline
  - Vulnerability scan results
```

---

*Next: [Interview Guide →](./08-interview-guide.md)*
