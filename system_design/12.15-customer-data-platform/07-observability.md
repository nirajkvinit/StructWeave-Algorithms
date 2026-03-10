# 07 — Observability: Customer Data Platform

## Observability Philosophy

A CDP's observability stack must answer three distinct questions simultaneously: (1) **Is the pipeline healthy?** — are events flowing, profiles updating, and destinations delivering? (2) **Is the data correct?** — is identity resolution producing accurate merges, and are audiences computing expected memberships? (3) **Are we compliant?** — are consent rules being enforced, and are erasure requests completing on time? Standard infrastructure metrics answer the first question; the second and third require domain-specific data quality and compliance metrics that most platforms lack.

---

## Event Pipeline Metrics

### Ingest Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `ingest.events_received_rate` | Counter | Events received at edge per second | < 10% of expected baseline for > 5min |
| `ingest.events_queued_rate` | Counter | Events successfully enqueued per second | — |
| `ingest.schema_violation_rate` | Gauge | % of events failing schema validation | > 1% for any event type |
| `ingest.auth_failure_rate` | Gauge | % of requests with invalid write keys | > 0.1% (potential key compromise) |
| `ingest.dedup_rejection_rate` | Counter | Duplicate events rejected per second | Spike > 10x baseline (SDK retry storm) |
| `ingest.dead_letter_queue_depth` | Gauge | Current DLQ message count | > 10,000 (sustained > 15min) |
| `ingest.p99_latency_ms` | Histogram | p99 latency from receipt to queue confirmation | > 200ms |
| `ingest.p50_latency_ms` | Histogram | Median ingest latency | > 50ms |

### Processing Pipeline Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `pipeline.processing_lag_seconds` | Gauge | Age of oldest unprocessed event in queue | > 60s |
| `pipeline.identity_resolution_duration_ms` | Histogram | p99 time for identity resolution per event | > 500ms |
| `pipeline.profile_write_duration_ms` | Histogram | p99 time for profile store write | > 200ms |
| `pipeline.merge_rate` | Counter | Profile merges per minute | Spike > 5x baseline (bot traffic?) |
| `pipeline.processing_error_rate` | Gauge | % of events failing downstream processing | > 0.01% |
| `pipeline.retry_rate` | Counter | Events sent to retry queue per minute | Sustained > 1% of throughput |

---

## Identity Resolution Quality Metrics

Identity quality metrics are critical because silent errors (wrong merges, missed stitching) are invisible to infrastructure monitoring but cause incorrect behavior for downstream consumers.

| Metric | Type | Description | Target |
|---|---|---|---|
| `identity.merge_precision` | Gauge | % of merges confirmed correct by ground truth (sampled) | > 99.9% for deterministic |
| `identity.merge_recall` | Gauge | % of same-person records actually merged | > 85% overall |
| `identity.cluster_size_distribution` | Histogram | Distribution of identity cluster sizes | p99 < 20 nodes (p99 > 100 = anomaly) |
| `identity.merge_latency_p99_ms` | Histogram | p99 time to complete merge after trigger event | < 1,000ms |
| `identity.cross_device_stitch_rate` | Gauge | % of anonymous sessions stitched to authenticated profile within 7 days | Tracked as KPI |
| `identity.orphan_anonymous_profiles` | Gauge | Anonymous profiles older than 90 days with no authenticated link | < 20% of anonymous pool |
| `identity.false_merge_reported_count` | Counter | Manually reported false merges (user reports) | < 1 per million profiles per month |
| `identity.lock_contention_rate` | Gauge | % of merge attempts waiting > 100ms for distributed lock | < 0.1% |

### Identity Quality Dashboard

The identity quality dashboard runs a continuous sampling job that:
1. Samples 10,000 merged profile pairs per day
2. Checks each pair for consistency (shared email, shared purchase history, same device)
3. Flags suspected false merges for human review
4. Reports precision/recall metrics based on review outcomes

This provides an ongoing signal for the probabilistic matching threshold — if false merges increase, the confidence threshold is raised automatically.

---

## Audience Engine Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `audience.streaming_eval_latency_p99_ms` | Histogram | p99 time from event to membership delta published | > 1,000ms |
| `audience.streaming_eval_throughput` | Counter | Segment evaluations per second | < 80% of expected (CEP backlog forming) |
| `audience.batch_refresh_duration_minutes` | Gauge | Time to complete last batch segment refresh | > 30min for scheduled 15-min refresh |
| `audience.segment_dirty_ratio` | Gauge | % of profiles in dirty set at refresh time | Tracked as efficiency metric |
| `audience.membership_delta_rate` | Counter | Enter/exit events per minute | Spike > 100x baseline (runaway segment?) |
| `audience.stale_membership_ratio` | Gauge | % of batch-evaluated profiles with last eval > 2× refresh interval | > 5% |
| `audience.cep_rule_compile_failures` | Counter | Segment rule compilation failures per day | > 0 |

---

## Destination Health Monitoring

### Per-Destination Metrics

Each destination has its own metrics namespace: `destination.{destination_id}.*`

| Metric | Description | Alert Threshold |
|---|---|---|
| `destination.delivery_success_rate` | % of deliveries acknowledged successfully | < 95% over 15-min window |
| `destination.delivery_latency_p99_ms` | p99 time from dequeue to delivery acknowledgment | > 30,000ms (30s) |
| `destination.queue_depth` | Current undelivered message count | > 1M messages |
| `destination.queue_age_oldest_seconds` | Age of oldest message in queue | > 3,600s (1 hour) |
| `destination.retry_rate` | Delivery attempts that are retries (not first attempt) | > 10% of total attempts |
| `destination.dead_letter_rate` | Messages moved to DLQ per hour | > 100/hour |
| `destination.circuit_state` | Circuit breaker state (0=closed, 1=half_open, 2=open) | Alert when state = 2 (open) |
| `destination.consecutive_failures` | Consecutive failed deliveries | > 3 (warn), > 5 (critical) |

### Destination Fleet Overview Dashboard

Provides a heatmap of all destinations in a workspace, with rows representing destinations and columns representing 5-minute time buckets. Cell color:

- Green: > 99% success rate
- Yellow: 95–99% success rate
- Orange: 80–95% success rate
- Red: < 80% success rate or circuit open

This allows operators to immediately identify degraded destinations across a large fleet.

---

## SLO Dashboards

### SLO 1: Ingest Availability

```
SLO:    ≥ 99.99% of events accepted within 200ms p99
Window: Rolling 30 days

Indicators:
  Good event:    Received, schema-valid, enqueued within 200ms
  Bad event:     5xx error returned OR enqueue latency > 200ms

Error budget:    30 days × 1 minute/day × 0.01% = ~4.3 minutes/30days
Current burn:    Displayed as % of error budget consumed
Burn rate alert: Alert when 1-hour burn rate × 2 > daily budget
```

### SLO 2: Profile Update Propagation

```
SLO:    p99 event-to-profile-update < 500ms
Window: Rolling 1 hour

Measurement:
  - Each event tagged with received_at timestamp
  - Profile write completion event tagged with profile_updated_at
  - Propagation latency = profile_updated_at - received_at
  - Measured over 1% sampled events

Alert: p99 > 500ms for > 5 minutes
```

### SLO 3: Destination Delivery

```
SLO:    ≥ 99.9% of deliveries succeed within 72-hour retry window
Window: Rolling 24 hours

Indicators:
  Successful delivery:   HTTP 2xx received within retry window
  Failed delivery:       Moved to DLQ after max retries OR TTL expired

Alert: Success rate < 99.9% for > 30 minutes
```

### SLO 4: Erasure Completion

```
SLO:    100% of erasure requests completed within 30 days (GDPR)
Window: Per-request

Monitoring:
  - Each erasure request tracked by request_id
  - Age of oldest incomplete request tracked continuously
  - Alert when any in-progress request age > 25 days (5-day buffer)
  - Weekly compliance report: requests received, completed, pending
```

---

## Alerting Rules

### P0 (Page Immediately)

```
1. Ingest queue partition lag > 60 seconds (events not being processed)
2. Profile store cluster is unreachable (all replicas down for any shard)
3. Identity graph is unreachable
4. Any destination circuit breaker open AND queue age > 1 hour
5. Erasure request approaching deadline (age > 25 days)
6. Consent enforcement cache stale > 5 minutes (potential consent violation window)
```

### P1 (Page Within 15 Minutes)

```
1. Ingest p99 latency > 500ms sustained > 5 minutes
2. Schema violation rate > 5% for any event type (suggests SDK regression)
3. Merge rate spike > 10x baseline (potential bot or data quality issue)
4. Batch segment refresh > 30 minutes overdue
5. Dead letter queue depth > 100,000 messages
6. Any destination queue depth > 10M messages
```

### P2 (Ticket, Respond Within 4 Hours)

```
1. Identity merge precision metric drops below 99%
2. Orphan anonymous profile ratio > 25%
3. Streaming CEP evaluation lag > 5 seconds
4. Computed trait recomputation more than 2 refresh cycles behind
5. Audit log replication lag > 1 minute
```

---

## Distributed Tracing

Every event carries a trace context (trace ID propagated from SDK through the entire pipeline). Distributed traces are sampled at 1% for all events and 100% for events that trigger errors, DLQ routing, or identity merges.

A complete trace for a "Product Viewed" event includes spans for:
- Edge collector receipt
- Schema validation
- Ingest queue publish
- Identity resolution (with sub-spans for graph lookup, merge if applicable)
- Profile write
- Streaming segment evaluation (with sub-spans per evaluated segment)
- Fan-out routing
- Destination queue publish (per destination)

Average trace depth: 8–15 spans. Traces are retained for 7 days for debugging; summary statistics are retained for 90 days.

### Trace Sampling for Consent Debugging

A specialized 100% trace sampler is applied to events that interact with consent checks:
- Events dropped due to consent (to verify the consent check was correct)
- Events forwarded to destinations despite consent uncertainty

These traces are surfaced in a dedicated "consent compliance" dashboard and retained for 2 years for regulatory defense.
