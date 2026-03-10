# 05 — Scalability & Reliability: A/B Testing Platform

## Assignment at the Edge

### Edge Evaluation Model

The most impactful scalability decision in an A/B testing platform is eliminating the assignment round-trip. At 500K assignments/second, even a 2 ms assignment service call adds 1 million CPU-milliseconds per second of latency overhead, and a single service failure pauses every product surface simultaneously.

The edge evaluation model solves this by shipping the experiment ruleset to the point of computation:

**Client SDKs (mobile/web):** The SDK downloads the compiled ruleset JSON on app/page load, caches it in memory, and refreshes it every 30–60 seconds with a randomized jitter (preventing thundering herds at the refresh interval). Assignment is a pure function evaluated in-process — zero latency, zero availability dependency.

**Server SDKs (backend services):** Same model. The ruleset is downloaded on service startup and refreshed via a background goroutine/thread. Assignment is local. Server SDKs do not contact the assignment service on the hot path.

**Edge nodes (CDN/reverse proxy workers):** For use cases where experiment assignment must happen before any backend request (e.g., serving different static assets to different variants, A/B testing a CDN caching strategy, or personalizing responses from an edge function), the ruleset is deployed to edge worker instances. Edge workers evaluate targeting rules using request attributes (headers, geolocation, cookies, user ID from a JWT) and add variant identifiers to request headers before forwarding to origin. The edge assignment path achieves < 0.5 ms latency from the user's perspective.

### Ruleset Size Budget

With 10,000 active experiments and an average of 5 variants per experiment:
- Each experiment configuration: ~500 bytes (ID, salt, traffic fraction, targeting predicates, variant definitions)
- Total ruleset: ~5 MB uncompressed, ~800 KB gzip-compressed

This fits comfortably in SDK memory and is delivered efficiently over CDN. The budget is enforced by platform policy limits:
- Maximum active experiments: 10,000
- Maximum targeting rule complexity: 10 predicates per rule, max 3 nesting levels
- Maximum flag override payload per variant: 2 KB
- Maximum variants per experiment: 5

When the budget limit approaches, the platform alerts platform administrators and suggests archiving stale experiments.

### Ruleset Versioning and Delta Sync

Shipping a full 800 KB ruleset on every refresh is wasteful when only one experiment changed. The platform supports **delta sync**:

1. SDK sends its current ruleset version hash in the `If-None-Match` request header
2. If unchanged, server returns 304 Not Modified (zero bandwidth)
3. If changed by ≤ 10 experiments, server returns a compact JSON Patch document listing only the changed experiments
4. If changed by > 10 experiments (e.g., mass experiment start at the beginning of a sprint), server returns the full ruleset

For a typical ruleset where < 5% of experiments change per refresh interval, delta sync reduces average bandwidth to < 50 KB per SDK refresh, a 16× reduction from full ruleset delivery.

### Multi-Region Assignment Availability

The ruleset is served from object storage via a global CDN. SDK refreshes that fail (network error, CDN outage) do not cause assignment failures — the SDK serves from its stale in-memory copy for up to the TTL (default: 1 hour). This means the assignment service has no single-region dependency for the hot path.

Assignment service instances in each geographic region serve the server-side fallback path. They are stateless (no assignment state stored) and horizontally scalable. Regional instances read the ruleset from regional caches, not a global database.

---

## Event Ingest Scaling

### Horizontal Sharding

At 1,000,000 events/second peak, no single server can handle ingest. The Event Gateway tier is horizontally sharded behind a load balancer with consistent hashing on `entity_id`. This ensures all events from a given user go to the same shard and can be processed with local deduplication state, reducing cross-shard coordination to near zero.

```
Event Gateway shard topology:
- 50 gateway nodes, each handling ~20K events/sec
- Consistent hash ring: entity_id → shard index
- New shards added by expanding the hash ring (virtual nodes prevent hot-spot rebalancing)
- Health checks: load balancer removes failed shards within 5 seconds
- Shard overflow: if a shard exceeds 30K events/sec for > 30s, ring splits the hot range
```

### SDK-Side Batching

SDKs do not send events individually — individual HTTP requests at 1M events/sec would require 1M connections per second. Instead, events are batched:
- **Batch size:** up to 100 events per request
- **Batch interval:** flush every 5 seconds, or when batch reaches 100 events, whichever comes first
- **On app background/close:** flush immediately (best-effort, 3-second timeout)
- **Gzip compression:** SDK compresses batches before sending, reducing payload by ~70%

With batching, ingest request rate drops from 1M/sec to ~10K/sec at peak — entirely manageable with the 50-node gateway tier.

### Message Queue Partitioning

The Event Gateway writes to a distributed message queue partitioned by `entity_id`. Partitioning by entity_id is critical: it ensures that all events for a given user arrive at the same downstream processor, enabling per-user aggregation without distributed joins.

```
Queue partition design:
- 500 partitions (tuned to expected throughput, not number of consumers)
- Partition assignment: murmur2_hash(entity_id) mod 500
- Replication factor: 3 (survives 2-node failure)
- Retention: 48 hours (event processors guaranteed to catch up within 2 hours)
- Consumer group: event_processor group with 500 consumers (one per partition)
- Offset commit: after every 1000 events or 5 seconds, whichever first
```

### Late Arrivals and Watermarking

Mobile clients in poor connectivity may buffer events for hours before uploading. The streaming aggregator uses a **watermark** mechanism to decide when a time window is "complete enough" to emit results:

```
Watermark advancement rule:
- Collect events with event_timestamp within a 1-minute tumbling window
- Advance watermark when:
  - 99th percentile of (server_received_at - event_timestamp) for recent events < 5 minutes
  - OR: 10 minutes have elapsed since the window's nominal end time
- Emit window results when watermark advances past the window end
- Late arrivals (after watermark): route to late-arrival topic for batch reprocessing
```

Empirically, 99% of events arrive within 5 minutes of occurrence. The batch aggregator (running every hour) picks up all late arrivals and produces authoritative metric values that supersede streaming estimates.

### Auto-Scaling Strategy

```
Event Gateway auto-scaling:
- Trigger: CPU utilization > 70% for 60 seconds → add 10 nodes
- Trigger: queue write latency p99 > 20 ms → add 5 nodes
- Scale-in: CPU < 30% for 10 minutes → remove nodes (minimum 10 nodes)

Event Processor auto-scaling:
- Trigger: consumer lag > 2 minutes for any partition → add consumers
- Trigger: consumer lag < 30 seconds → reduce consumers
- Scaling unit: one consumer per partition (max 500)

Stream Aggregator auto-scaling:
- Fixed at partition count (one aggregator per partition); scale by adding partitions
- Partition addition requires consumer rebalance; planned during low-traffic windows

Statistical Engine auto-scaling:
- Job queue depth > 500 pending jobs → double worker count
- Job queue depth < 50 pending jobs → halve worker count (minimum 10 workers)
- Scale-in cooldown: 5 minutes (prevents thrashing during uneven job distribution)
```

---

## Analysis Pipeline Parallelism

### Experiment-Level Isolation

Each experiment's metric computation is an independent job with no shared state across experiments. This makes the analysis pipeline embarrassingly parallel — the ideal scaling property for a workload with 10,000+ independent tasks.

```
Analysis pipeline parallelism model:
- Unit of parallelism: one job per (experiment × metric × time_window)
- Job dispatch: Scheduler reads job queue; workers pull next available job
- Job output: written to Results Store keyed by (experiment_id, metric_id, computed_at)
- Worker state: stateless; any job runs on any worker
- Job retry: automatic retry up to 3 times on failure; dead-letter queue after 3 failures
- Priority: recently-started experiments get priority (high analyst attention)
```

**Throughput calculation:**
- 10,000 experiments × 5 metrics each = 50,000 analysis jobs per hourly batch
- With CUPED pre-computation done incrementally in the batch aggregator, each stats job takes < 100ms
- 50,000 jobs × 0.1 sec / 200 workers = 25 seconds to complete the entire batch
- This comfortably fits within the 90-minute SLO with headroom for worker failures and retries

### Streaming Aggregator Design

The streaming aggregator maintains in-memory state for each (experiment × metric × variant × time_window) tuple. State is checkpointed to durable storage every 30 seconds to enable recovery without reprocessing the full queue.

```
Per-partition state:
- Key: (experiment_id, variant_id, metric_id, window_start)
- Value: { count, sum, sum_sq, min, max }  // sufficient statistics for t-test
- State backend: in-memory hash map + periodic checkpoint to object storage
- State size estimate: 10K experiments × 5 metrics × 3 variants × 100 bytes = 15 MB per partition
- Recovery: on restart, load checkpoint then replay queue from checkpoint offset
```

### Warehouse-Native Analysis Option

For experiments where data already lives in an analytical warehouse, the platform supports **warehouse-native computation**:

1. **Assignment sync:** Platform pushes experiment assignment records (entity_id → variant_id mapping) to the customer's warehouse table via a scheduled export.
2. **SQL template generation:** Platform generates parameterized SQL for metric computation, joinable against the assignment table.
3. **Compute delegation:** SQL is executed in the customer's warehouse; only aggregated sufficient statistics (count, sum, sum_sq per variant) are returned to the platform.
4. **Statistical analysis:** Platform runs the statistical test on the returned aggregates.

This pattern eliminates the cost and latency of exporting data from the warehouse to the platform's event log. For enterprise deployments with petabyte-scale data already in a warehouse, warehouse-native is the preferred architecture because it avoids data movement entirely and uses the customer's existing compute credits.

---

## Experiment Isolation

### Global Holdback

A **global holdback group** permanently excludes a fixed percentage (1–5%) of users from all experiments. These users always see the baseline product experience. The holdback enables:
- Measuring cumulative long-term effects of all experiments combined (the holdback users represent a "time capsule" of the product at the holdback group creation date)
- Detecting novelty effects: holdback users who have never experienced new features serve as a pure control when launching major changes
- Computing the "true cost" of running no experiments vs. running many
- Providing a sanity check on overall product health metrics

The global holdback is implemented as a special layer with 100% traffic and a single "holdback" variant. Assignment to this layer uses the same deterministic hash with a layer-specific salt. Users assigned to the holdback layer are excluded from all other layer assignments, enforced at ruleset evaluation time.

### Layer Capacity Management

Each layer has a finite traffic capacity: the total traffic fraction allocated across experiments in the layer cannot exceed 100%. The platform tracks layer utilization in real time and surfaces it in the experiment management UI.

```
Layer utilization management:
- Current utilization: sum of traffic_fraction for all running experiments in the layer
- Warning threshold: 80% utilization → notify layer owners
- Hard cap: platform refuses to start a new experiment if it would exceed 100%
- Recommended actions when near capacity:
  1. Stop completed experiments to free capacity
  2. Create a new layer for non-interfering experiments
  3. Reduce traffic allocation of lower-priority experiments temporarily
```

Layer design guidance embedded in the platform UI:
- "Same product surface → same layer" (ensures isolation between competing treatments)
- "Independent product surfaces → different layers" (maximizes total addressable traffic)
- "Revenue-impacting experiments → dedicated layer" (reduces interaction risk for high-stakes tests)

---

## Circuit Breakers and Failure Modes

### Assignment Service Failure

When the assignment service is unreachable (SDK cannot refresh ruleset):
1. SDK serves assignments from its cached (stale) ruleset — fully functional, no user impact
2. Staleness is bounded by the TTL on the cached ruleset (default: 1 hour hard TTL, 30-second soft TTL with background refresh)
3. After hard TTL expires with no successful refresh, SDK falls back to control variant (variant ordinal 0) for all experiments
4. Assignment fallback is logged locally and reported via a heartbeat when connectivity resumes
5. Affected assignments are flagged in the analysis pipeline using the assignment_source field

Control fallback is the safest choice: it means the product behaves as if no experiments are running, preserving the baseline user experience. A brief period of "everyone sees control" is far less harmful than incorrect or non-sticky assignments.

### Event Pipeline Failure

When the event pipeline experiences an outage:
1. SDKs buffer events in local memory (up to 10 MB per client, configurable)
2. Persistent retry queue: events that cannot be sent are written to local storage (mobile) or in-memory queue (server SDKs) with a 24-hour TTL
3. On pipeline recovery, SDKs drain the retry queue using exponential backoff with jitter (base: 1s, max: 60s, jitter: ±50%)
4. Pipeline operators can increase queue consumer capacity temporarily during recovery to drain the backlog faster

Events lost during a pipeline outage cannot be recovered if the client-side TTL expires. The 99.999% event durability SLO is measured against events that received an ingest ACK — events lost before ACK are not covered by the SLO.

### Statistical Engine Failure

Statistical engine failures (e.g., CUPED computation crashes on corrupt pre-experiment data, numerical overflow in variance computation) are isolated per-experiment by the job queue pattern. The engine:
1. Marks the affected experiment's results as stale with an error annotation
2. Emits a P2 alert to the experiment owner (not P0 — a single analysis failure is not an emergency)
3. Falls back to running the analysis without CUPED (raw metric values, wider confidence intervals)
4. Retries with full CUPED after the issue is resolved, overwriting the degraded results

The Results Store always contains the last successful computation, so dashboards show stale-but-valid data rather than errors during transient failures.

### Cascading Failure Prevention

The most dangerous failure scenario is a correlated failure across many experiments simultaneously — for example, a bug in a new targeting rule syntax that causes all experiments using it to assign users incorrectly. Prevention mechanisms:

```
Cascading failure prevention:
1. Staged ruleset rollout: new ruleset versions are served to 1% of SDK instances first;
   if SRM rates spike within 5 minutes, rollout is halted and previous version restored
2. Per-experiment circuit breaker: if a single experiment's SRM exceeds the severe threshold
   AND is more than 3 standard deviations from the historical SRM rate for experiments
   in the same layer, the entire layer is frozen pending investigation
3. Config change rate limiting: maximum 100 experiment configuration changes per minute;
   above this rate, changes are queued and applied with 5-second spacing
4. Blast radius analysis: before applying a targeting rule change affecting > 10% of
   experiments, the platform requires explicit confirmation from a layer administrator
```

---

## Reliability Patterns Summary

| Pattern | Application in A/B Platform | Implementation Detail |
|---|---|---|
| **Circuit Breaker** | Assignment service: break after 3 failures; serve stale cache | Break for 30s, half-open probe, close on success |
| **Bulkhead** | Statistical engine workers isolated per experiment | Job queue with per-experiment partitioning |
| **Retry with Jitter** | SDK event delivery: exponential backoff | Base 1s, max 60s, ±50% jitter, max 5 retries |
| **Idempotency** | Event dedup via event_id; analysis jobs rerunnable | 7-day dedup window; results store overwrite-safe |
| **Fallback** | Assignment: control variant; analysis: no-CUPED on failure | Lowest-risk default for each component |
| **Health Check** | Assignment liveness + event gateway depth check | /health endpoint + queue depth metric |
| **Load Shedding** | Event gateway rejects at queue_depth > 2× normal | Returns 429 with Retry-After header |
| **Graceful Degradation** | Streaming estimates shown when batch pending | Results labeled "preliminary" vs. "final" |
| **Staged Rollout** | New ruleset served to 1% of SDKs before full distribution | Canary via Content-MD5 header routing |
| **Timeout** | Remote assignment call: 3s timeout → cache fallback | Prevents tail latency from blocking product requests |
