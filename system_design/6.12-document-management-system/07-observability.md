# Observability

## Key Metrics

### Performance Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `document.upload.latency` | Histogram | End-to-end upload time (request to 201 response) | p99 > 5s |
| `document.download.latency` | Histogram | End-to-end download time (request to last byte) | p99 > 3s |
| `document.checkout.latency` | Histogram | Lock acquisition time | p99 > 500ms |
| `document.checkin.latency` | Histogram | Version creation + lock release time | p99 > 2s |
| `search.query.latency` | Histogram | Search query execution time | p99 > 500ms |
| `search.query.latency_by_type` | Histogram | Broken down: simple, faceted, wildcard, phrase | p99 > 1s (wildcard) |
| `permission.evaluation.latency` | Histogram | Time to compute effective permissions | p99 > 50ms |
| `metadata.update.latency` | Histogram | Metadata write latency | p99 > 200ms |
| `preview.generation.latency` | Histogram | Thumbnail/preview creation time | p99 > 30s |
| `ocr.processing.latency` | Histogram | Per-page OCR processing time | p99 > 120s |
| `workflow.step.latency` | Histogram | Time from step activation to completion | p99 > varies by step type |
| `version.reconstruction.latency` | Histogram | Time to reconstruct version from deltas | p99 > 1s |

### Throughput Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `document.upload.rate` | Counter | Documents uploaded per second | Spike > 5x average |
| `document.download.rate` | Counter | Documents downloaded per second | Spike > 10x average |
| `search.query.rate` | Counter | Search queries per second | > 2000 qps |
| `lock.acquire.rate` | Counter | Lock acquisitions per second | > 500/s |
| `lock.release.rate` | Counter | Lock releases per second | Diverges from acquire rate |
| `version.create.rate` | Counter | New versions created per second | > 1000/s |
| `api.request.rate` | Counter | Total API requests per second by endpoint | > 50K total |
| `notification.send.rate` | Counter | Notifications dispatched per second | Queue backup > 10K |

### Resource Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `storage.total.bytes` | Gauge | Total document content storage used | > 90% capacity |
| `storage.growth.rate` | Counter | Storage growth per day/week/month | Exceeds projection by > 20% |
| `storage.tier.distribution` | Gauge | Bytes per storage tier (hot/warm/cold) | Cold tier < 30% of total |
| `search.index.size` | Gauge | Total search index size across all shards | > 80% allocated capacity |
| `search.index.doc_count` | Gauge | Total documents in search index | Diverges from metadata DB count |
| `metadata.db.size` | Gauge | Metadata database size per shard | > 70% disk capacity |
| `cache.hit_rate` | Gauge | Cache hit rate by cache type | < 80% (metadata), < 60% (search) |
| `cache.eviction_rate` | Counter | Cache evictions per second | > 100/s (indicates undersized cache) |
| `lock.active_count` | Gauge | Currently held locks | > 10K concurrent locks |
| `queue.depth` | Gauge | Message queue depth by queue type | OCR > 1000, thumbnail > 5000 |

---

## Business Metrics

### Document Lifecycle Metrics

| Metric | Description | Reporting Frequency |
|--------|-------------|-------------------|
| `documents.total` | Total documents across all tenants | Real-time |
| `documents.active` | Documents accessed in last 30 days | Daily |
| `documents.created.daily` | New documents created per day | Daily |
| `documents.versions.avg` | Average versions per document | Weekly |
| `documents.size.distribution` | Document size distribution by bucket | Weekly |
| `documents.type.distribution` | Document count by content type | Daily |
| `documents.age.distribution` | Document age distribution | Weekly |

### Collaboration Metrics

| Metric | Description | Reporting Frequency |
|--------|-------------|-------------------|
| `collaboration.checkouts.daily` | Check-out operations per day | Daily |
| `collaboration.concurrent_editors` | Peak concurrent document editors | Real-time |
| `collaboration.avg_checkout_duration` | Average time documents are checked out | Daily |
| `collaboration.lock_conflicts.daily` | Check-out attempts blocked by existing lock | Daily |
| `collaboration.shares.active` | Active internal and external share links | Real-time |
| `collaboration.external_shares.access` | External share link accesses per day | Daily |

### Workflow Metrics

| Metric | Description | Reporting Frequency |
|--------|-------------|-------------------|
| `workflow.instances.active` | Currently active workflow instances | Real-time |
| `workflow.completion_rate` | Percentage of workflows completed successfully | Weekly |
| `workflow.avg_completion_time` | Average time from start to completion | Weekly |
| `workflow.escalation_rate` | Percentage of steps requiring escalation | Weekly |
| `workflow.timeout_rate` | Percentage of steps that time out | Daily |
| `workflow.pending_actions` | Actions awaiting user response | Real-time |

### Compliance Metrics

| Metric | Description | Reporting Frequency |
|--------|-------------|-------------------|
| `compliance.legal_holds.active` | Active legal hold matters | Real-time |
| `compliance.held_documents` | Total documents under legal hold | Real-time |
| `compliance.retention.deletions` | Documents deleted by retention policy | Daily |
| `compliance.retention.overdue` | Documents past retention with active hold | Daily |
| `compliance.audit_events.daily` | Audit events generated per day | Daily |
| `compliance.dlp.blocks` | DLP-blocked operations per day | Daily |
| `compliance.ediscovery.searches` | eDiscovery searches performed | Weekly |

### Search Quality Metrics

| Metric | Description | Reporting Frequency |
|--------|-------------|-------------------|
| `search.zero_result_rate` | Percentage of searches returning 0 results | Daily |
| `search.avg_results_count` | Average number of results per query | Daily |
| `search.click_through_rate` | Users clicking on a search result | Daily |
| `search.refinement_rate` | Users modifying search query | Daily |
| `search.index_coverage` | Percentage of documents indexed for search | Real-time |
| `search.index_freshness` | Average time from upload to searchable | Hourly |

---

## Alerting

### Critical Alerts (Page On-Call)

| Alert | Condition | Impact | Response |
|-------|-----------|--------|----------|
| **Lock Service Down** | Lock service health check fails for > 30s | No document check-out/check-in | Failover to standby, investigate consensus quorum |
| **Search Cluster Degraded** | Search p99 > 2s for > 5 min | Users cannot find documents | Scale search replicas, check index health |
| **Object Storage Errors** | Upload/download error rate > 1% for > 2 min | Documents inaccessible | Switch to backup storage path, check provider status |
| **Metadata DB Primary Down** | Primary shard unreachable for > 30s | All writes fail for affected tenants | Promote replica to primary, investigate root cause |
| **Permission Cache Poisoning** | Permission cache inconsistency detected | Users may access unauthorized documents | Flush cache, rebuild from DB, audit recent access |
| **Audit Log Write Failure** | Audit events failing to persist for > 1 min | Compliance violation: events being lost | Buffer events, alert compliance team, fix storage |

### Warning Alerts (Business Hours)

| Alert | Condition | Impact | Response |
|-------|-----------|--------|----------|
| **Checkout Lock Storm** | > 100 lock conflicts in 5 minutes | Many users blocked from editing | Identify hot documents, suggest optimistic mode |
| **Search Degradation** | Search p99 > 1s for > 10 min | Slower search experience | Check index segments, trigger force-merge |
| **OCR Queue Backup** | OCR queue depth > 5000 items | Documents not searchable for hours | Scale up OCR workers, check for stuck jobs |
| **Storage Quota Warning** | Tenant at > 80% storage quota | Approaching upload block | Notify tenant admin, suggest cleanup or quota increase |
| **Thumbnail Queue Backup** | Preview queue > 10000 items | New documents show placeholder | Scale thumbnail workers |
| **Workflow Escalation Spike** | > 10 workflow escalations in 1 hour | Approval processes stalling | Notify team managers, check for absent approvers |
| **Delta Chain Too Long** | Version delta chain > 15 without snapshot | Slow version reconstruction | Trigger background re-snapshot |
| **Cache Hit Rate Drop** | Cache hit rate < 50% for > 15 min | Increased DB load, slower responses | Investigate cache eviction, consider scaling cache |

### Informational Alerts (Dashboard Only)

| Alert | Condition | Purpose |
|-------|-----------|---------|
| **Storage Growth Rate** | Growth exceeds monthly projection by > 20% | Capacity planning adjustment |
| **New Tenant Onboarded** | New tenant with > 1000 users provisioned | Infrastructure capacity check |
| **Search Index Rebuild** | Full index rebuild initiated | Track progress, estimate completion |
| **Retention Sweep Complete** | Daily retention sweep finished | Verify sweep health, check deletion counts |
| **Key Rotation Due** | Encryption key approaching rotation deadline | Schedule key rotation maintenance |

---

## Audit Log Streaming to SIEM

### Integration Architecture

```
Audit Events Flow:

DMS Services → Audit Log Service → Append-only Store
                    │
                    ├── Real-time stream to SIEM
                    │   ├── Security events (auth, permission changes)
                    │   ├── Compliance events (legal hold, retention)
                    │   └── Anomaly events (DLP, suspicious access)
                    │
                    ├── Batch export to Data Lake
                    │   ├── All events (hourly batches)
                    │   ├── Compressed, encrypted
                    │   └── Queryable for analytics
                    │
                    └── Real-time dashboard
                        ├── Active users
                        ├── Document activity
                        └── Security events
```

### SIEM Event Format

```
CEF (Common Event Format) for SIEM Integration:

CEF:0|DMS|DocumentManagement|1.0|DOCUMENT_DOWNLOADED|Document Downloaded|3|
  src=10.0.1.42
  suser=alice@company.com
  duid=doc-uuid-123
  fname=Q3_Report.pdf
  fsize=524288
  msg=Document downloaded by user
  rt=2026-03-08T14:30:00.000Z
  cs1=tenant-uuid cs1Label=TenantId
  cs2=/Finance/Reports/ cs2Label=FolderPath
  cs3=version-4 cs3Label=Version
  outcome=Success

High-Priority SIEM Events:
├── AUTH_FAILURE (multiple failed logins)
├── PERMISSION_ESCALATION (user granted higher access)
├── BULK_DOWNLOAD (user downloading many documents)
├── EXTERNAL_SHARE_TO_COMPETITOR (domain-based detection)
├── LEGAL_HOLD_RELEASED (sensitive compliance action)
├── ADMIN_LOCK_BREAK (administrative override)
├── DLP_POLICY_VIOLATION (sensitive content detected)
└── SHARE_LINK_ABUSE (excessive access from share link)
```

---

## Capacity Planning Dashboards

### Storage Trajectory Dashboard

```
Dashboard: Storage Capacity Planning

┌──────────────────────────────────────────────────┐
│ Total Storage Usage: 7.5 PB / 10 PB (75%)       │
│ Projected Full: March 2027 at current growth     │
│                                                  │
│  10PB ┤                                    ···   │
│       │                              ·····       │
│  7.5PB├─────────────────────────●                │
│       │                   ·····                   │
│   5PB ┤             ·····                        │
│       │       ·····                               │
│  2.5PB┤ ·····                                    │
│       │                                          │
│    0  ┤──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──  │
│        Q1 Q2 Q3 Q4 Q1 Q2 Q3 Q4 Q1 Q2 Q3 Q4     │
│        ── 2025 ──  ── 2026 ──  ── 2027 ──       │
│                                                  │
│ Breakdown:                                       │
│   Content: 2.7 PB (36%)  │  Versions: 4 PB (53%)│
│   Index: 500 TB (7%)     │  Other: 300 TB (4%)   │
│                                                  │
│ Growth Rate: 250 TB/month (trending up)          │
│ Recommendation: Expand by 3 PB before Q3 2026   │
└──────────────────────────────────────────────────┘
```

### User Growth and Engagement Dashboard

```
Dashboard: User Activity

┌──────────────────────────────────────────────────┐
│ Active Users                                     │
│   Total Registered: 50M  │  DAU: 10M  │  MAU: 25M│
│                                                  │
│ Key Engagement Metrics (Last 30 Days):           │
│   Documents Created: 150M                        │
│   Versions Created: 450M                         │
│   Search Queries: 1.5B                           │
│   Workflow Completions: 2.5M                     │
│   External Shares: 500K                          │
│                                                  │
│ Top Tenants by Activity:                         │
│   1. Acme Corp: 2.1M DAU, 50M documents         │
│   2. GlobalBank: 1.8M DAU, 45M documents        │
│   3. HealthFirst: 1.2M DAU, 30M documents       │
│                                                  │
│ Alert: Tenant "MegaCo" approaching storage quota │
│        (92% used, 4.6TB / 5TB)                   │
└──────────────────────────────────────────────────┘
```

### Search Index Health Dashboard

```
Dashboard: Search Infrastructure

┌──────────────────────────────────────────────────┐
│ Search Cluster Health: HEALTHY                   │
│                                                  │
│ Index Stats:                                     │
│   Total Documents Indexed: 987M / 1B (98.7%)     │
│   Pending Indexing: 13M (backlog: ~4 min)        │
│   Index Size: 487 TB / 600 TB (81%)              │
│   Shard Count: 24 primary + 48 replica           │
│                                                  │
│ Query Performance:                               │
│   p50: 85ms  │  p95: 280ms  │  p99: 420ms       │
│   Zero-result rate: 8.2% (normal: <10%)          │
│   QPS: 580 (peak today: 1,720)                   │
│                                                  │
│ Index Freshness:                                 │
│   Metadata: 99.5% indexed within 30s             │
│   Content: 94.2% indexed within 5 min            │
│   OCR content: 89.1% indexed within 15 min       │
│                                                  │
│ Warnings:                                        │
│   Shard 7: segment count = 42 (merge recommended)│
│   OCR queue depth: 3,200 (scaling workers)       │
└──────────────────────────────────────────────────┘
```

---

## End-to-End Tracing

### Trace Architecture

```
Request Trace for Document Upload:

Trace ID: abc-123-xyz

Span 1: API Gateway (5ms)
├── Auth token validation
├── Rate limit check
└── Route to Document Service

Span 2: Document Service (1200ms)
├── Span 2.1: Permission Check (12ms)
│   ├── Cache lookup (1ms, HIT)
│   └── Return: ALLOWED (WRITE permission)
│
├── Span 2.2: Object Storage Upload (1050ms)
│   ├── Chunk 1 upload (350ms)
│   ├── Chunk 2 upload (340ms)
│   └── Chunk 3 upload (360ms)
│
├── Span 2.3: Metadata DB Insert (45ms)
│   ├── Create document record (20ms)
│   └── Create version record (25ms)
│
├── Span 2.4: Emit Events (5ms)
│   ├── DocumentCreated → Message Queue
│   ├── VersionCreated → Message Queue
│   └── AuditEvent → Audit Service
│
└── Return 201 Created

[Async, not blocking response]
Span 3: Search Indexer (3500ms, started 200ms after upload)
├── Download content from object storage (800ms)
├── Extract text from DOCX (500ms)
├── Build search document (50ms)
└── Index to search cluster (2150ms)

Span 4: Thumbnail Generator (8000ms, started 200ms after upload)
├── Download content (800ms)
├── Convert DOCX to PDF (3000ms)
├── Rasterize first page (1200ms)
├── Resize to thumbnail (200ms)
├── Upload to CDN (800ms)
└── Update metadata (1000ms, includes invalidation)

Span 5: Audit Logger (50ms, started 5ms after upload)
├── Serialize event (5ms)
├── Compute hash chain (10ms)
└── Append to audit store (35ms)
```

### Trace Sampling Strategy

```
Sampling Rules:

All requests (100%): Error traces (any span with error)
All requests (100%): Slow traces (total duration > p99 threshold)
All requests (100%): Security events (permission denied, DLP block)

10% sampling: Normal document operations
5% sampling: Search queries (high volume)
1% sampling: Health checks, metadata reads

Priority boost:
├── Tenant with active incident: 100% sampling
├── New feature rollout: 50% sampling
├── Performance investigation: 100% for affected endpoint
└── eDiscovery operations: 100% (compliance requirement)
```

### Distributed Tracing Integration

```
PSEUDOCODE: Trace Context Propagation

FUNCTION handle_request(request):
    // Extract or create trace context
    trace_context = extract_trace_context(request.headers)
    IF trace_context IS NULL:
        trace_context = create_new_trace()

    // Create span for this service
    span = start_span(trace_context, service_name, operation_name)

    TRY:
        // Propagate trace context to downstream calls
        downstream_headers = inject_trace_context(trace_context)

        // Execute business logic with tracing
        result = process_request(request, span)

        span.set_status(OK)
        RETURN result

    CATCH error:
        span.set_status(ERROR)
        span.record_exception(error)
        span.set_attribute("error.type", error.type)
        RAISE error

    FINALLY:
        // Record key attributes for filtering/searching
        span.set_attribute("tenant_id", request.tenant_id)
        span.set_attribute("document_id", request.document_id)
        span.set_attribute("user_id", request.user_id)
        span.set_attribute("content_type", request.content_type)
        span.set_attribute("file_size_bytes", request.file_size)
        span.end()
```

---

## Operational Runbooks

### Runbook: Search Degradation

```
Trigger: search.query.latency p99 > 1s for 10 minutes

Step 1: Check search cluster health
  → Are all nodes healthy? Any node restarts?
  → Check: search cluster health API

Step 2: Check index metrics
  → Segment count per shard (>50 = needs force-merge)
  → Index size vs allocated capacity
  → Check: index stats API

Step 3: Check query patterns
  → Any wildcard-heavy queries? Leading wildcards?
  → Any single tenant generating excessive queries?
  → Check: slow query log

Step 4: Check resource utilization
  → CPU, memory, disk I/O on search nodes
  → JVM heap usage and GC pauses
  → Check: monitoring dashboard

Step 5: Mitigate
  → Scale search replicas if resource-bound
  → Force-merge segments if fragmented
  → Rate-limit problematic queries
  → Warm up cold index segments

Step 6: Communicate
  → Update status page if user-facing impact
  → Notify affected tenant admins if tenant-specific
```

### Runbook: Lock Service Recovery

```
Trigger: Lock service health check fails

Step 1: Check consensus quorum
  → How many nodes are healthy? (need majority: 2/3 or 3/5)
  → Is there a leader elected?
  → Check: cluster status API

Step 2: If quorum lost
  → Identify failed nodes
  → Restart failed nodes (one at a time)
  → Wait for leader election (typically <10s)
  → Verify lock operations resume

Step 3: If quorum maintained but leader failing
  → Force leader step-down
  → Wait for new leader election
  → Verify lock operations on new leader

Step 4: Verify data integrity
  → Check for orphaned locks (acquired but no active session)
  → Run lock reconciliation (compare locks vs active sessions)
  → Clean up expired locks

Step 5: Post-incident
  → Review why node(s) failed
  → Check capacity (memory, connections, disk)
  → Verify monitoring caught failure promptly
```
