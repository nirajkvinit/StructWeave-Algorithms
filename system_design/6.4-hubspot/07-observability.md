# Observability

## Metrics (USE/RED)

### Infrastructure Metrics (USE — Utilization, Saturation, Errors)

| Component | Utilization | Saturation | Errors |
|---|---|---|---|
| **API Gateway** | Request rate, CPU % | Request queue depth, connection pool usage | 4xx rate, 5xx rate, timeout rate |
| **CRM Service** | Instance count, CPU/memory | HBase connection pool, thread pool queue | Read/write error rate, dedup service fallback rate |
| **Workflow Engine** | Active enrollments, actions/sec per swimlane | Kafka consumer lag (delta metric), timer queue depth | Action failure rate, timeout rate, dead letter queue size |
| **Email Service** | Emails/sec, rendering throughput | SMTP connection pool per ISP, queue depth | Bounce rate, render error rate, suppression rate |
| **HBase** | RegionServer CPU, request rate per region | Region count per server, compaction queue, memstore flush queue | Read/write errors, region splits, locality % |
| **Vitess/MySQL** | QPS per shard, connections per shard | Replication lag, lock wait time, query queue | Slow queries, deadlocks, replication errors |
| **Kafka** | Broker CPU, disk utilization | Consumer lag per partition, under-replicated partitions | Produce failures, consumer errors, ISR shrinkage |

### Application Metrics (RED — Rate, Errors, Duration)

| Service | Rate | Error Rate | Duration (p50/p95/p99) |
|---|---|---|---|
| CRM API | Requests/sec by endpoint and object type | % 4xx, % 5xx | 15ms / 50ms / 100ms |
| CRM Search | Queries/sec | % timeout, % empty results | 50ms / 200ms / 500ms |
| Workflow Execution | Actions/sec per swimlane | % failed actions | 100ms / 1s / 5s |
| Email Send | Emails queued/sec, delivered/sec | % bounce, % spam complaint | 500ms / 2s / 5s (queue to SMTP handoff) |
| Webhook Delivery | Webhooks/sec | % failed deliveries | 200ms / 1s / 5s |
| Lead Scoring | Score calculations/sec | % scoring errors | 20ms / 100ms / 500ms |

### Business Metrics

| Metric | Purpose | Alert Threshold |
|---|---|---|
| Workflow enrollment rate | Detect bulk enrollment spikes | > 10x normal rate for an account |
| Email deliverability rate | Monitor sending reputation | < 95% inbox placement |
| API rate limit hit rate | Detect integration issues | > 5% of requests hitting limits |
| CRM record creation rate | Capacity planning | > 80% of projected growth |
| Workflow completion rate | Product health | < 80% completion for active workflows |
| Active customers per Hublet | Load distribution | > 20% variance between Hublets |

### Key Dashboard Design

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
flowchart TB
    subgraph Dashboards["Operational Dashboards"]
        D1[Platform Overview<br/>Request rate, error rate, latency<br/>per Hublet]
        D2[Workflow Engine<br/>Actions/sec per swimlane<br/>Consumer lag, error rate]
        D3[Email Pipeline<br/>Queue depth, deliverability<br/>Bounce/complaint rates per ISP]
        D4[CRM Health<br/>HBase hotspots, dedup rate<br/>Query latency distribution]
        D5[Customer Impact<br/>Per-account error rates<br/>Rate limit hits, workflow failures]
    end

    subgraph DataSources["Data Sources"]
        SIGFX[SignalFX<br/>Real-time metrics]
        KAFKA_M[Kafka Consumer<br/>Lag metrics]
        HBASE_M[HBase JMX<br/>Region metrics]
        VITESS_M[Vitess vtgate<br/>Query stats]
    end

    DataSources --> Dashboards

    classDef dash fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef source fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class D1,D2,D3,D4,D5 dash
    class SIGFX,KAFKA_M,HBASE_M,VITESS_M source
```

---

## Logging

### What to Log

| Category | Log Events | Level |
|---|---|---|
| **API Requests** | Method, path, status code, latency, account_id, request_id | INFO |
| **CRM Mutations** | Object type, object_id, changed properties, actor | INFO |
| **Workflow Transitions** | Workflow ID, enrollment ID, node transition, action result | INFO |
| **Email Events** | Campaign ID, recipient, event type (send/bounce/open/click) | INFO |
| **Authentication** | Login attempts, OAuth token grants, scope changes | INFO |
| **Rate Limiting** | Account ID, endpoint, limit hit, current rate | WARN |
| **Errors** | Stack trace, service, account_id, request_id, error category | ERROR |
| **Security Events** | Failed auth, permission denied, unusual access patterns | WARN/ERROR |
| **HBase Operations** | Slow reads (>100ms), region splits, locality drops | WARN |
| **Kafka Operations** | Consumer lag spikes, rebalances, produce failures | WARN |

### Log Levels Strategy

| Level | Usage | Retention |
|---|---|---|
| **ERROR** | Unrecoverable failures, data corruption risk, security incidents | 90 days (full), 1 year (aggregated) |
| **WARN** | Degraded performance, rate limits hit, retry exhaustion | 30 days |
| **INFO** | Normal operations, state transitions, business events | 14 days |
| **DEBUG** | Detailed execution traces (enabled per-service on demand) | 24 hours |

### Structured Logging Format

```
{
  "timestamp": "2026-03-08T10:15:30.123Z",
  "level": "INFO",
  "service": "workflow-engine",
  "instance": "wf-worker-na1-7b4c9",
  "trace_id": "abc123def456",
  "span_id": "789ghi",
  "account_id": 12345,
  "message": "Workflow action executed",
  "context": {
    "workflow_id": 67890,
    "enrollment_id": "enr_abc",
    "node_id": "send-email-1",
    "action_type": "send_email",
    "swimlane": "fast-email",
    "duration_ms": 145,
    "result": "success"
  }
}
```

### Log Cost Optimization

HubSpot's published approach to saving millions annually on logging:

1. **JSON → ORC compaction**: Raw JSON logs in blob storage compacted to ORC format (columnar) — **~5% of original size**
2. **Selective retention**: High-cardinality fields (request bodies) retained for shorter periods
3. **Sampling**: Debug-level logs sampled at 1-10% in production; full logging on demand per service
4. **Cost result**: 55.7% cost reduction, seven-figure annual savings

---

## Distributed Tracing

### Trace Propagation Strategy

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant CRM as CRM Service
    participant K as Kafka
    participant WF as Workflow Engine
    participant EMAIL as Email Service

    Note over C,EMAIL: Trace ID: abc123def456

    C->>GW: Request (X-Request-ID: abc123)
    GW->>GW: Generate trace_id, root span
    GW->>CRM: Forward (trace_id in header)
    CRM->>CRM: Create child span "crm.update"
    CRM->>K: Produce event (trace_id in message header)
    CRM-->>GW: Response

    Note over K: trace_id preserved in Kafka message headers

    K->>WF: Consume event
    WF->>WF: Create child span "workflow.evaluate"
    WF->>EMAIL: Send email action
    EMAIL->>EMAIL: Create child span "email.render+send"
    EMAIL-->>WF: Queued

    Note over C,EMAIL: Full trace spans sync API + async Kafka pipeline
```

**Implementation details:**
- Trace context propagated via HTTP headers (W3C Trace Context format) for synchronous calls
- Kafka message headers carry trace_id and parent_span_id for asynchronous consumers
- Each Dropwizard service generates child spans via the Bootstrap library's built-in instrumentation
- Cross-Hublet traces (rare, for Kafka aggregation) include Hublet identifier in trace metadata

### Key Spans to Instrument

| Span | Service | Why |
|---|---|---|
| `api.request` | API Gateway | Entry point; captures total request latency |
| `auth.validate` | OAuth Server | Authentication/authorization overhead |
| `crm.read` / `crm.write` | CRM Service | Core data path; HBase latency visibility |
| `crm.dedup_check` | Dedup Service | Deduplication window check |
| `hbase.get` / `hbase.put` | HBase Client | Raw storage latency |
| `vitess.query` | Vitess Client | SQL query execution time |
| `workflow.evaluate_trigger` | Workflow Engine | Trigger matching overhead |
| `workflow.execute_action` | Workflow Worker | Individual action execution |
| `workflow.route_swimlane` | Swimlane Router | Routing decision overhead |
| `email.render` | Email Service | Template rendering time |
| `email.smtp_send` | Email Service | SMTP handoff latency |
| `kafka.produce` / `kafka.consume` | All services | Event bus latency |
| `search.query` | Search Service | Search index query time |
| `webhook.deliver` | Webhook Service | External HTTP call latency |

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Response |
|---|---|---|
| **CRM API error rate > 1%** | 5xx rate exceeds 1% for 5 minutes | Investigate HBase health, CRM service logs, recent deploys |
| **HBase RegionServer down** | RegionServer unreachable for 60s | Check host health, verify automatic failover, monitor region reassignment |
| **Kafka consumer lag > 1M** | Any workflow swimlane lag exceeds 1M messages | Scale consumer group, investigate slow consumers, check for stuck partitions |
| **Email bounce rate > 5%** | Hard bounce rate exceeds 5% for an IP | Check IP reputation, pause sending from affected IP, investigate root cause |
| **Vitess primary unreachable** | Any shard's primary unavailable for 30s | Verify automatic primary promotion, check network connectivity |
| **Cross-DC replication lag > 5min** | MySQL binary log apply delay > 5 minutes | Investigate S3 transfer, check EU apply process, consider read consistency impact |
| **Hublet health check failure** | Cloudflare Workers report Hublet unreachable | Verify AWS infrastructure, DNS, load balancer health |

### Warning Alerts

| Alert | Condition | Response |
|---|---|---|
| **Workflow action failure rate > 2%** | Per-swimlane action failures exceed 2% | Review dead letter queue, check downstream service health |
| **HBase locality < 95%** | Data locality drops below 95% for a cluster | Trigger locality healing automation (3-minute recovery) |
| **Dedup service routing > 10%** | More than 10% of CRM reads routed to dedup service | Investigate hot objects, potential customer behavior change |
| **API rate limit hits > 5%** | More than 5% of requests from an app hitting limits | Notify customer's integration team; check for misconfigured polling |
| **Email complaint rate > 0.1%** | Spam complaints exceed 0.1% for a customer | Review customer's email content and list hygiene |
| **Timer queue depth > 100K** | Pending delayed workflow actions exceed 100K | Scale timer service instances, check for stuck enrollments |
| **Kafka ISR shrinkage** | In-sync replica count drops below replication factor | Check broker health, disk space, network partitions |

### Runbook References

| Alert Category | Runbook Contents |
|---|---|
| **HBase Incidents** | Region reassignment procedure, locality healing trigger, quota adjustment, hotspot investigation |
| **Kafka Incidents** | Consumer group rebalance, partition reassignment, broker recovery, topic retention adjustment |
| **Email Deliverability** | IP rotation procedure, ISP relationship contacts, reputation recovery steps, list hygiene audit |
| **Workflow Engine** | Swimlane capacity adjustment, dead letter queue replay, customer isolation procedure, timer service scaling |
| **Cross-DC Issues** | Replication lag investigation, S3 transfer debugging, VTicket range verification, Kafka aggregation health check |

---

## Monitoring Architecture

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
flowchart TB
    subgraph Sources["Metric Sources"]
        SVC[3,000+ Microservices<br/>Dropwizard Metrics]
        DB[HBase JMX + Vitess Stats]
        KAFKA_STATS[Kafka Broker Metrics]
        INFRA[Infrastructure<br/>CPU / Memory / Disk / Network]
    end

    subgraph Collection["Collection Layer"]
        AGENT[Metrics Agents<br/>Per-host collectors]
        KAFKA_METRICS[[Kafka<br/>Metrics Pipeline]]
    end

    subgraph Analysis["Analysis & Visualization"]
        SIGFX[SignalFX<br/>Real-time dashboards]
        PAGER[PagerDuty<br/>On-call alerting]
        OVERWATCH[Overwatch<br/>Service dependency tracking]
    end

    subgraph Storage2["Metrics Storage"]
        TSDB[(Time-Series Database<br/>Historical metrics)]
        BLOB_LOGS[Blob Storage<br/>Log archival in ORC format]
    end

    Sources --> Collection
    Collection --> Analysis
    Collection --> Storage2
    SIGFX --> PAGER

    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef collect fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef analyze fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef store fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class SVC,DB,KAFKA_STATS,INFRA source
    class AGENT,KAFKA_METRICS collect
    class SIGFX,PAGER,OVERWATCH analyze
    class TSDB,BLOB_LOGS store
```

**HubSpot's Overwatch system** provides a unique observability capability:
- Tracks metadata for all deployed services and their dependencies
- "Bad builds" feature prevents deployment of services using broken library versions
- Maps service-to-service, service-to-database, and service-to-Kafka dependencies
- Enables rapid blast radius assessment during incidents
