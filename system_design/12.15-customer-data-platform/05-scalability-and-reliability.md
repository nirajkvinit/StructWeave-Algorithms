# 05 — Scalability and Reliability: Customer Data Platform

## Horizontal Scaling Strategy

### Ingest Layer Scaling

The edge collector fleet is stateless and scales horizontally behind a global load balancer with anycast routing. Each collector instance handles ~50,000 events/sec; at peak 2M events/sec, approximately 40 instances run in parallel. Auto-scaling is event-rate driven, with scale-up triggered at 70% capacity and scale-down after a 10-minute cooldown.

The ingest queue is the primary buffer between the stateless collector tier and the stateful processing tier. The queue scales independently by adding partitions. Each workspace is assigned to a set of partitions at workspace creation; hot workspaces are re-assigned to dedicated partitions if their event rate exceeds a threshold.

### Event Processing Pipeline Partitioning

The event pipeline (identity resolution, profile writing, segment evaluation) is the stateful core. Partitioning strategy:

```
Partitioning key: workspace_id + murmur3(anonymous_id OR user_id)

This ensures:
  - All events for the same user land on the same partition
  - Per-user ordering is preserved within the partition
  - Workspaces are spread across partitions (no hot workspace concentrating on one node)
  - Re-partitioning is possible by adding partitions and migrating at workspace granularity
```

Each partition is processed by a single pipeline worker. The pipeline worker is a micro-batch processor: it pulls a batch of 500–1000 events from its partition, runs identity resolution and profile updates for the batch, then commits progress. Micro-batching amortizes the overhead of distributed locks and database round-trips.

### Profile Store Sharding

The profile store uses consistent hashing on `profile_id` to distribute load across shards. Each shard handles ~100M profiles. Shard topology:

| Tier | Shards | Replica Factor | Purpose |
|---|---|---|---|
| Hot tier | 20 shards | 3 replicas each | Most-recently-updated profiles (updated in last 7 days) |
| Warm tier | 50 shards | 2 replicas each | Active but less frequent profiles |
| Cold tier | Object storage | N/A | Inactive profiles, compressed and archived |

Profiles are promoted/demoted between tiers based on last-activity timestamp. Cold profiles are rehydrated to the hot tier on event arrival (first-time active session cost: ~100ms for rehydration).

### Identity Graph Sharding

The identity graph is sharded by `workspace_id + cluster_id`. All nodes in the same identity cluster (connected component) must be on the same shard to allow atomic cluster operations without cross-shard coordination. When a merge operation would combine nodes from different shards, a two-phase merge protocol is used:

1. **Phase 1**: Lock all affected shards, validate that both clusters still exist in their expected states
2. **Phase 2**: Write the merged cluster to the target shard, mark the source shard's nodes as redirects
3. **Phase 3**: Asynchronously clean up redirect nodes after all readers have updated their caches

The key insight: identity merges that cross shard boundaries are rare (< 0.1% of merges), so the two-phase protocol cost is acceptable.

### Audience Engine Scaling

The streaming CEP evaluator is the highest fan-out component — it evaluates every event against potentially thousands of segment rules. Scaling strategy:

**Vertical fan-out**: Each CEP worker instance maintains a complete in-memory copy of the streaming segment rule set for its assigned workspace set. Rule evaluation is CPU-bound and memory-local, making vertical scaling (larger instances with more cores) effective up to ~50,000 streaming rules per instance.

**Horizontal fan-out**: Multiple CEP worker instances per workspace partition. Each instance processes all events on its partition independently — segment evaluation is idempotent so duplicate membership-change events are fine (the downstream membership writer deduplicates on `profile_id + segment_id + direction`).

---

## Event Pipeline Reliability

### At-Least-Once Delivery Guarantees

The ingest queue uses acknowledgment-based consumption: events are not removed from the queue until the consumer explicitly acknowledges successful processing. If a pipeline worker crashes mid-batch, the unacknowledged events are redelivered to another worker after a timeout (default: 30 seconds).

This means each event may be processed more than once. The pipeline must be idempotent:

- **Identity resolution**: Graph node creation is idempotent (upsert by identifier value); merge operations use the distributed lock to prevent duplicate merges
- **Profile updates**: Trait upserts are idempotent (last-write-wins per key, using the event's `timestamp` for ordering)
- **Segment evaluation**: Membership entry/exit events are idempotent at the membership writer (upsert by `profile_id + segment_id`)
- **Destination delivery**: Each delivery attempt uses a stable `delivery_id`; see deduplication in section 04

### Dead Letter Queue Handling

Events that fail processing after N retries (default: 3) are moved to a dead letter queue (DLQ). The DLQ is organized by failure reason:

| DLQ Category | Contents | Handling |
|---|---|---|
| `schema_violation` | Events failing schema validation | Review and update schema; replay if schema was wrong |
| `identity_error` | Events where identity resolution threw an unhandled error | Alert on-call; fix bug; replay |
| `profile_write_error` | Transient write failures | Automatic replay after 5-min cooldown |
| `processing_poison_pill` | Events that crash the worker repeatably | Quarantine and manual investigation |

DLQ replay is a standard operational procedure — events are re-enqueued with the same `event_id` (deduplication prevents double-processing of events that partially succeeded).

---

## Multi-Region Architecture

### Region Topology

The CDP operates in a minimum of 3 geographic regions to provide both low-latency ingest globally and regulatory data residency compliance:

```
Region 1 (us-east):   Primary region; full stack; workspace default
Region 2 (eu-west):   Full stack; EU-resident workspaces processed and stored here
Region 3 (ap-south):  Full stack; APAC-resident workspaces
```

Each region is fully capable of handling all CDP operations independently. Cross-region traffic occurs only for:
- **Global identity matching** (optional, for cross-region user stitching with explicit consent)
- **Replication** of workspace metadata (destination configs, schema registry) for reference
- **DR failover** traffic if a region is unavailable

### Workspace Data Residency

A workspace has a configured home region. All event data, profile data, and identity graph data for that workspace is stored and processed in the home region only. No PII leaves the home region. Workspace metadata (non-PII configuration) is replicated to all regions for low-latency management API access.

### Active-Active Ingest

Edge collectors in all regions accept events for any workspace. Events received in a non-home-region collector are forwarded to the home region's ingest queue via an encrypted tunnel with minimal latency overhead (~30–50ms for cross-region hop). This allows global SDK deployment without requiring clients to route to a specific region.

An alternative (for workspaces with strict data residency requirements) is **home-region-only ingest**: the SDK endpoint resolves via GeoDNS to the home region, ensuring events never leave the home region even in transit.

---

## Disaster Recovery

### Recovery Time and Point Objectives

| Component | RTO | RPO | Recovery Strategy |
|---|---|---|---|
| Ingest queue | 1 minute | 0 (no data loss) | Multi-AZ with automatic failover |
| Profile store | 5 minutes | 5 minutes | Active-passive replication; promote replica on primary failure |
| Identity graph | 10 minutes | 5 minutes | Active-passive replication; rebuild from event log if needed |
| Audience membership cache | 15 minutes | Acceptable loss (re-evaluatable) | Rebuild from profile store + segment definitions |
| Destination queues | 5 minutes | 0 (persisted to durable store) | Multi-AZ; resume from last checkpoint |
| Audit log | 0 (not in critical path) | 0 | Multi-AZ append-only log with synchronous replication |

### Event Replay for Recovery

The raw event store (the append-only log of all ingested events) is the system of truth. If any downstream state (profile store, identity graph, audience memberships) is corrupted or lost, it can be reconstructed by replaying events from the beginning or from a checkpoint. This property is the foundation of the CDP's disaster recovery strategy.

The replay pipeline:
1. Restore profile store from latest snapshot (5-min RPO)
2. Replay all events received after the snapshot timestamp from the event log
3. Identity resolution and profile updates are re-applied
4. Segment memberships are re-evaluated
5. Destination queues are re-populated for events within the retry window

Full replay from scratch for 1B profiles takes approximately 4–8 hours. Partial replay (from a recent checkpoint) typically takes < 30 minutes.

---

## Load Shedding

When the system approaches capacity limits, it applies ordered load shedding to preserve core functionality:

| Priority | Component | Action Under Overload |
|---|---|---|
| 1 (Preserve) | Event ingest | Never shed; queue buffers absorb bursts |
| 2 (Preserve) | Identity resolution | Slow path: batch processing instead of real-time |
| 3 (Degrade gracefully) | Streaming segment evaluation | Skip low-priority segments; flag for batch catch-up |
| 4 (Degrade gracefully) | Destination delivery | Increase delivery batch size; accept higher latency |
| 5 (Acceptable shed) | Computed trait recomputation | Defer recomputation; serve stale computed traits |
| 6 (Acceptable shed) | Batch segment refresh | Skip refresh cycle; serve stale memberships |

This ordered shedding ensures that event collection (the most critical function — prevents data loss) is protected at all costs, while less critical derived functions degrade gracefully under load.
