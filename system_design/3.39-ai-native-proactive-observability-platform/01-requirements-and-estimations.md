[← Back to Index](./00-index.md)

# Requirements & Estimations

## Functional Requirements

### Core Telemetry Collection

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **FR-1** | Ingest metrics, logs, and traces via OpenTelemetry Protocol (OTLP) | P0 |
| **FR-2** | Support auto-instrumentation for major languages (Java, Python, Node.js, Go, .NET) | P0 |
| **FR-3** | Accept high-cardinality events with arbitrary dimensions (100+ dimensions per event) | P0 |
| **FR-4** | Propagate trace context (TraceID, SpanID) across service boundaries | P0 |
| **FR-5** | Correlate metrics, logs, and traces via shared context (trace_id, span_id) | P0 |
| **FR-6** | Support eBPF-based zero-code instrumentation for infrastructure | P1 |

### AI-Powered Detection

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **FR-7** | Automatically learn baseline behavior per service/endpoint/dimension | P0 |
| **FR-8** | Detect anomalies without manual threshold configuration | P0 |
| **FR-9** | Predict SLO breaches before they occur (15-30 min advance warning) | P0 |
| **FR-10** | Identify error rate spikes and latency degradation automatically | P0 |
| **FR-11** | Support seasonality and trend detection (hourly, daily, weekly patterns) | P1 |
| **FR-12** | Reduce false positives through multi-signal correlation | P1 |

### Autonomous Investigation

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **FR-13** | Automatically perform root cause analysis when anomaly detected | P0 |
| **FR-14** | Trace dependencies across services to identify failure origin | P0 |
| **FR-15** | Correlate logs, metrics, and traces for unified investigation | P0 |
| **FR-16** | Surface "BubbleUp" style dimension analysis (which dimensions explain the anomaly) | P0 |
| **FR-17** | Support natural language queries ("Why is checkout slow?") | P1 |
| **FR-18** | Link anomalies to recent deployments, config changes, or infrastructure events | P1 |

### Autonomous Remediation

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **FR-19** | Propose remediation actions based on investigation findings | P0 |
| **FR-20** | Require human approval before executing remediation | P0 |
| **FR-21** | Support tiered approval levels based on action risk | P0 |
| **FR-22** | Execute approved runbooks automatically | P1 |
| **FR-23** | Trigger auto-scaling, rollbacks, and config changes | P1 |
| **FR-24** | Maintain audit trail of all proposed and executed actions | P0 |

### Human Interface

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **FR-25** | Provide dashboards for service health, SLOs, and AI activity | P0 |
| **FR-26** | Support ad-hoc query interface for data exploration | P0 |
| **FR-27** | Expose MCP server for IDE integration (Claude Code, Cursor) | P1 |
| **FR-28** | Send alerts via multiple channels (Slack, PagerDuty, email, webhook) | P0 |
| **FR-29** | Allow human feedback on AI decisions for continuous learning | P1 |

### Out of Scope

| Item | Reason |
|------|--------|
| Full APM suite (profiling, code-level debugging) | Covered by 15.2 Distributed Tracing |
| LLM/AI model observability | Covered by 3.25 LLMOps Platform |
| Security event monitoring (SIEM) | Covered by 15.7 AI-Native Cybersecurity |
| Synthetic monitoring | Separate concern |
| Browser/mobile RUM | Separate concern |

---

## Non-Functional Requirements

### Performance

| Metric | Target | Notes |
|--------|--------|-------|
| **Ingestion Latency** | P99 < 5s | End-to-end from SDK to queryable |
| **Query Latency (Hot)** | P99 < 500ms | Data < 1 hour old |
| **Query Latency (Warm)** | P99 < 5s | Data 1-7 days old |
| **Query Latency (Cold)** | P99 < 30s | Data > 7 days old |
| **Anomaly Detection Latency** | < 60s | From event to anomaly alert |
| **AI Investigation Completion** | P95 < 5 min | Full root cause analysis |
| **SDK Overhead** | < 3% CPU | Instrumentation impact on application |

### Scale

| Metric | Target | Notes |
|--------|--------|-------|
| **Event Ingestion Rate** | 10M events/sec | Platform-wide |
| **Unique Time Series** | 1B+ | High-cardinality support |
| **Concurrent Traces** | 100M+ | Including long-running workflows |
| **Cardinality per Event** | 500+ dimensions | Arbitrary key-value pairs |
| **Query Concurrency** | 10K queries/sec | Dashboard + API + AI |
| **Retention (Hot)** | 7 days | Full resolution |
| **Retention (Warm)** | 90 days | Downsampled/aggregated |
| **Retention (Cold)** | 2 years | Archived, queryable |

### Availability & Reliability

| Metric | Target | Notes |
|--------|--------|-------|
| **Platform Availability** | 99.95% | Monthly uptime |
| **Data Durability** | 99.999999999% | 11 nines |
| **Ingestion Availability** | 99.99% | Never lose telemetry |
| **Query Availability** | 99.9% | Dashboards/queries |
| **RTO (Recovery Time)** | < 1 hour | Full platform recovery |
| **RPO (Recovery Point)** | < 1 minute | Maximum data loss |

### Security & Compliance

| Requirement | Target |
|-------------|--------|
| **Encryption in Transit** | TLS 1.3 mandatory |
| **Encryption at Rest** | AES-256 |
| **PII Handling** | Automatic detection and redaction option |
| **Access Control** | RBAC with team-level isolation |
| **Audit Logging** | All queries, AI actions, and remediations logged |
| **Compliance** | SOC2 Type II, GDPR, HIPAA-ready |

---

## Capacity Estimations

### Assumptions

| Parameter | Value | Notes |
|-----------|-------|-------|
| Number of instrumented services | 10,000 | Across all customers |
| Average events per service per second | 1,000 | Spans + logs + metrics |
| Average event size | 2 KB | Including all attributes |
| Cardinality per event | 50 dimensions | Average, up to 500 max |
| Trace span count per request | 20 | Average depth |
| Query rate per customer | 100/min | Dashboard + API |
| Active customers | 1,000 | Enterprise accounts |

### Ingestion Calculations

```
Events per second:
  10,000 services × 1,000 events/service/sec = 10M events/sec

Daily event volume:
  10M events/sec × 86,400 sec/day = 864B events/day

Raw data volume per day:
  864B events × 2 KB/event = 1.73 PB/day (raw)

Compressed data volume per day:
  1.73 PB / 10 (compression ratio) = 173 TB/day
```

### Storage Calculations

| Tier | Retention | Daily Volume | Total Storage |
|------|-----------|--------------|---------------|
| **Hot (SSD)** | 7 days | 173 TB | 1.2 PB |
| **Warm (HDD)** | 90 days | 173 TB (downsampled 10x) | 1.6 PB |
| **Cold (Object)** | 2 years | 173 TB (downsampled 100x) | 1.3 PB |
| **Total** | - | - | **4.1 PB** |

### Query Load Calculations

```
Dashboard queries:
  1,000 customers × 100 queries/min = 100K queries/min = 1,667 QPS

AI investigation queries (internal):
  ~500 QPS (anomaly analysis, correlation)

Total query load:
  ~2,200 QPS
```

### AI Inference Calculations

```
Anomaly detection:
  10M events/sec × 1% sampling = 100K events/sec to ML models

Investigation agents:
  ~1,000 anomalies/hour × 50 queries/investigation = 50K queries/hour

Remediation proposals:
  ~100 proposals/hour
```

---

## Cardinality Challenge

### The High-Cardinality Problem

Traditional metrics systems (Prometheus, InfluxDB) struggle with high cardinality because they pre-aggregate data into time series. Each unique combination of labels creates a new time series:

```
# Low cardinality (acceptable)
http_requests_total{service="api", status="200"}

# High cardinality (problematic)
http_requests_total{service="api", status="200", user_id="u123", request_id="req456", trace_id="abc789"}
```

With 1M users and 1M requests, this creates **1 trillion potential time series** - impossible to store and query efficiently.

### Event-Based Solution

AI-native platforms like Honeycomb solve this by storing **wide events** instead of pre-aggregated metrics:

```json
{
  "timestamp": "2026-01-15T10:30:00Z",
  "service": "checkout",
  "endpoint": "/api/checkout",
  "duration_ms": 250,
  "status_code": 200,
  "user_id": "u123",
  "request_id": "req456",
  "trace_id": "abc789",
  "span_id": "span123",
  "region": "us-west-2",
  "deployment_version": "v2.3.1",
  "feature_flags": ["new_checkout", "dark_mode"],
  "cart_size": 5,
  "payment_method": "credit_card",
  ... // 50+ dimensions
}
```

**Advantages:**
- Query any dimension without pre-defining it
- No cardinality explosion - just add columns
- BubbleUp analysis across arbitrary dimensions

**Trade-offs:**
- Higher storage costs (store individual events)
- Requires columnar storage (ClickHouse, not Prometheus)
- Aggregation computed at query time

### Cardinality Budget

| Dimension Type | Cardinality | Storage Impact |
|----------------|-------------|----------------|
| **Fixed** (service, region, status) | < 1,000 | Minimal |
| **Medium** (endpoint, error_type) | < 100,000 | Moderate |
| **High** (user_id, session_id) | < 100M | High |
| **Unbounded** (request_id, trace_id) | Unlimited | Use content-addressing |

---

## SLO Definitions

### Platform SLOs

| SLO | SLI | Target | Error Budget (30d) |
|-----|-----|--------|-------------------|
| **Ingestion Availability** | Successful ingests / Total ingests | 99.99% | 4.3 minutes |
| **Query Availability** | Successful queries / Total queries | 99.9% | 43.2 minutes |
| **Ingestion Latency** | P99 ingest-to-query latency < 5s | 99% | - |
| **Query Latency** | P95 query latency < 500ms (hot data) | 95% | - |
| **Anomaly Detection** | Anomaly surfaced within 60s of occurrence | 99% | - |
| **False Positive Rate** | False alerts / Total alerts | < 5% | - |

### Customer-Facing SLOs

| SLO | Description | Target |
|-----|-------------|--------|
| **MTTR Reduction** | Mean time to resolution with AI assistance | 75% reduction vs manual |
| **Proactive Detection** | Issues detected before customer impact | > 80% |
| **Investigation Accuracy** | AI root cause matches actual root cause | > 90% |

---

## Cost Estimation

### Infrastructure Costs (Monthly)

| Component | Specs | Cost/Month |
|-----------|-------|------------|
| **Ingestion Cluster** | 100 × m6i.4xlarge (Kafka + Collectors) | $200,000 |
| **Hot Storage** | 1.2 PB SSD (ClickHouse) | $150,000 |
| **Warm Storage** | 1.6 PB HDD | $50,000 |
| **Cold Storage** | 1.3 PB S3 | $30,000 |
| **AI Inference** | 50 × g5.2xlarge (GPU) | $100,000 |
| **Query Cluster** | 50 × r6i.4xlarge | $80,000 |
| **Networking** | Data transfer, VPC | $100,000 |
| **Total** | - | **~$710,000/month** |

### Cost per Customer

```
With 1,000 customers:
  $710,000 / 1,000 = $710/customer/month (platform cost)

Plus margin for enterprise SaaS:
  ~$1,500-3,000/customer/month retail price
```

---

## CAP Theorem Analysis

### Trade-off Decision: **AP (Availability + Partition Tolerance)**

For an observability platform, **availability is paramount**. During a network partition or incident, engineers must be able to query data and see AI investigations. Missing some recent events temporarily is acceptable; being unable to debug during an outage is not.

| Scenario | Priority | Approach |
|----------|----------|----------|
| **Network Partition** | Keep ingestion + queries running | Accept eventual consistency |
| **Node Failure** | No data loss, minimal query impact | Replication factor 3 |
| **High Load** | Maintain query performance | Backpressure on ingestion |
| **AI Disagreement** | Multiple agents propose different causes | Human resolves conflicts |

### Consistency Model

| Data Type | Consistency | Rationale |
|-----------|-------------|-----------|
| **Telemetry Ingestion** | Eventually consistent | Slight delay acceptable for availability |
| **Query Results** | Read-your-writes | Users expect to see recently ingested data |
| **AI Investigation State** | Strongly consistent | Remediation decisions must be authoritative |
| **Approval Workflow** | Strongly consistent | Cannot have conflicting approvals |

---

## Traffic Patterns

### Steady State

```
         Events/sec
    10M ─┬──────────────────────────────
         │ ████████████████████████████
         │ ████████████████████████████
     5M ─┤ ████████████████████████████
         │ ████████████████████████████
         │ ████████████████████████████
      0 ─┴──────────────────────────────
         00:00  06:00  12:00  18:00  24:00
                                    (UTC)
```

### Incident Spike

During incidents, query load can spike 10-50x as engineers investigate:

```
         Queries/sec
   50K ─┬                    ▲
         │                   █│█
         │                  ██│██
   25K ─┤                 ███│███
         │               ████│████
         │ ████████████████████████████
      0 ─┴──────────────────────────────
                      ▲
                  Incident
```

### Seasonality

| Pattern | Impact | Handling |
|---------|--------|----------|
| **Business Hours** | 3-5x query load increase | Pre-warm query caches |
| **End of Month** | Finance apps spike | Auto-scale ingestion |
| **Black Friday** | E-commerce 10x | Reserved capacity |
| **Maintenance Windows** | Low load | Run batch analytics |
