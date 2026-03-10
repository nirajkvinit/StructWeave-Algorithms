# 04 — Deep Dives and Bottlenecks: Customer Data Platform

## Deep Dive 1: Identity Resolution Engine

### The Core Problem

Identity resolution is the hardest correctness problem in a CDP. A single user might appear as dozens of distinct records — an anonymous browser session, a mobile app user, an email newsletter subscriber, a CRM contact — before ever authenticating. When they log in, the CDP must stitch all of these fragments into one coherent profile. The challenge is that this stitching must happen in milliseconds, under concurrent load, in a distributed environment where the same user may be generating events on multiple devices simultaneously.

### Identity Cluster Structure

The identity graph maintains connected components (clusters) of identifier nodes. Every node has a `profile_id` pointing to the canonical unified profile for that cluster. A cluster might look like:

```
anonymous_id: "anon_abc" ── [session_link] ── user_id: "user_xyz"
                                                     │
device_id: "dev_001" ─── [device_link] ──────────────┘
                                                     │
email_hash: "sha256_..." ─── [auth_link] ────────────┘
```

All four nodes point to the same `profile_id`. The BFS traversal to find all nodes in a cluster is O(k) where k is the cluster size — typically 2–10 nodes for consumer CDPs, up to 50 for B2B accounts with many device sharing.

### Merge Conflicts Under Concurrency

The most dangerous scenario is a **concurrent merge**. Consider two streams arriving simultaneously:

- Stream A: Event with `anon_id: X` + `user_id: U1` → links X to profile P1
- Stream B: Event with `anon_id: X` + `user_id: U2` → links X to profile P2

Without coordination, both writes succeed, and `anon_id: X` ends up pointing to two different profiles. The resolution is to acquire a distributed lock keyed on a deterministic hash of the sorted identifier set before any merge. This serializes concurrent merges on overlapping clusters. Locks are short-lived (held for < 100ms) and implemented with a compare-and-swap operation in the identity graph's backing store.

### Survivorship Rules

When merging N profiles into one survivor, trait values must be reconciled. The platform applies configurable survivorship rules:

| Trait Type | Default Survivorship Rule |
|---|---|
| PII traits (email, phone, name) | Most recently updated value wins |
| Account traits (plan, tier) | Highest-authority source wins (priority-ranked sources) |
| Behavioral computed traits | Re-computed from merged event history |
| Audience memberships | Union of all memberships from all merging profiles |
| Consent state | Most restrictive consent wins (can only escalate, not relax) |

### Profile Fragmentation and the Split Problem

The inverse of merge is **split** — when two profiles that were merged are found to be distinct individuals (e.g., a shared device). Splits are rare but catastrophic if handled incorrectly. A naive split is impossible if downstream systems have already ingested the merged profile. The production approach is **soft split**: create a new profile for the newly-distinguished individual, migrate only clearly-owned identifiers to the new profile, and retain a "split-from" link for audit. Any events received before the split timestamp remain attributed to the original profile.

### Identity Resolution Accuracy Metrics

```
Precision = True Merges / (True Merges + False Merges)
Recall    = True Merges / (True Merges + Missed Merges)

For deterministic matching:  Precision ~99.9%, Recall limited by data completeness
For probabilistic matching:   Precision ~85–95% (tunable via confidence threshold)
```

A false merge (two distinct people merged into one profile) is far more harmful than a missed merge (two records for the same person remaining separate), because it contaminates profile data for both individuals and can cause incorrect personalization or consent violations. Production CDPs default to conservative merge thresholds for probabilistic matching.

---

## Deep Dive 2: Real-Time Audience Engine

### Streaming CEP Architecture

The streaming segment evaluator processes every event that enters the CDP and checks whether it causes any profile to enter or exit an audience. The key data structure is a **segment index** — a pre-compiled, inverted index from event names and trait names to the set of segment IDs that contain rules referencing them.

```
segment_index["Product Viewed"] = { seg_001, seg_042, seg_117, ... }
segment_index["trait:total_spend"] = { seg_003, seg_089, ... }
```

When an event arrives, the evaluator does an O(1) lookup in this index to find the relevant segments, then evaluates only those segments — not all 50,000. This brings per-event evaluation cost from O(S) to O(k) where k is the average number of segments referencing a given event type, typically 5–50.

### Stateful Event Count Tracking

Many segment rules reference event counts within a time window: "User viewed product at least 3 times in the last 7 days". This requires maintaining per-user event count state. Two approaches:

**Approach A: In-profile event counts** — Store a sliding window count map on the profile document: `{ "Product Viewed:7d": 12, "Order Completed:30d": 3 }`. Updated atomically on each event. Fast to read, but requires careful TTL management and increases profile document size.

**Approach B: Separate time-series store** — Maintain event counts in a separate key-value store (profile_id + event_name + window → count). Decoupled from profile writes but requires an extra read hop during segment evaluation.

Production CDPs use Approach A for hot windows (≤ 30 days) and Approach B or batch recomputation for longer windows.

### Batch Path for Complex Segments

Segments that cannot be expressed as streaming rules (because they require historical aggregations, full-table scans, or SQL window functions) are evaluated on a batch schedule:

1. **Segment scheduler** triggers batch refresh based on configured cron or on profile-dirty events
2. **Query compiler** translates the segment SQL into an optimized query against the event store + profile store
3. **Incremental evaluator** identifies profiles that had relevant events since the last refresh (the "dirty set") and evaluates only those profiles
4. **Membership writer** upserts audience membership for all profiles in the dirty set

The incremental approach reduces batch refresh cost dramatically: instead of scanning all 1B profiles every 15 minutes, only the ~1-5% of profiles that received events since the last refresh are re-evaluated.

### Consistency Between Streaming and Batch Paths

A profile's segment membership may be partially evaluated by the streaming path and partially by the batch path. For segments with dual evaluation (streaming for some rules, batch for others), a reconciliation pass runs after each batch refresh to ensure the final membership state is consistent with both evaluation results.

---

## Deep Dive 3: Destination Fan-out System

### Fan-out Topology

At 43B events/day fanning out to an average of 5 destinations each, the delivery subsystem processes ~215B deliveries/day — about 2.5M per second at peak. The fan-out topology is:

```
Profile Update Event
        │
        ▼
Fan-out Router (determines relevant destinations based on filters + consent)
        │
        ├──► Destination Queue A (CRM connector — real-time webhook)
        ├──► Destination Queue B (Ad platform — batch every 6h)
        ├──► Destination Queue C (Email platform — real-time webhook)
        └──► Destination Queue D (Warehouse sync — continuous streaming)
```

Each destination queue is an independent durable queue (backed by the same streaming infrastructure as the ingest queue). The fan-out router is a stateless service that reads from the profile update event stream and writes to per-destination queues. It applies:

1. **Destination filter matching**: does this event type match the destination's event filter?
2. **Audience filter matching**: is the user in the required audience for this destination?
3. **Consent check**: does the user have the required consent purposes for this destination?
4. **Schema transformation**: map CDP event/profile fields to destination-specific payload structure

### Rate Limiting and Backpressure

Different destination APIs have wildly different rate limits — a webhook destination might accept 10K/sec; an email platform might accept 100/sec. The delivery worker for each destination enforces its configured rate limit using a token bucket algorithm. When the bucket is exhausted, the worker pauses dequeuing and waits for the bucket to refill.

This backpressure naturally causes the destination's queue to grow. The system monitors queue depth per destination:

- **Warning threshold** (e.g., 1M messages): alert but continue
- **Critical threshold** (e.g., 10M messages): pause new fan-out for this destination, prioritize draining
- **Overflow threshold** (e.g., 100M messages): activate queue overflow to object storage (spillover), alert on-call

### Idempotent Delivery

Because the delivery system guarantees at-least-once delivery, it must handle the case where a delivery succeeds at the destination but the acknowledgment is lost (causing a retry). Each delivery record contains a `delivery_id` (stable UUID computed from the trigger event ID + destination ID). Destinations that support idempotency keys receive this ID in a request header. For destinations that do not support idempotency, the delivery worker uses a short-lived deduplication bloom filter (TTL: 72 hours) to detect recently-delivered IDs and skip re-delivery.

### Circuit Breaker Per Destination

Each destination's delivery worker maintains an independent circuit breaker with three states:

- **Closed** (normal): all deliveries attempted
- **Open** (failing): deliveries not attempted, error returned immediately; re-attempts scheduled at half-open intervals
- **Half-open**: one test delivery attempted; if successful, circuit closes; if failed, circuit stays open

Opening the circuit prevents cascading load on a struggling destination. It also prevents queue buildup — messages accumulate at a controlled rate with a clear TTL rather than indefinitely.

---

## Deep Dive 4: Event Pipeline and Schema Registry

### Schema Registry Architecture

The schema registry stores the canonical shape of every registered event type. At ingest, before an event enters the processing queue, it is validated against the schema for its event name. Invalid events go to a dead-letter queue with full metadata for debugging.

Schema evolution is a critical operational concern:

| Change Type | Classification | Handling |
|---|---|---|
| Add optional property | Additive (safe) | Allowed; old consumers ignore new field |
| Add required property | Breaking | Blocked or requires new schema version |
| Remove property | Breaking | Blocked; use deprecation flag then remove after migration |
| Change property type | Breaking | Blocked unless widening (e.g., int → float) |
| Rename property | Breaking | Blocked; add new + deprecate old |
| Change event name | Breaking | Blocked; alias old name to new with migration |

Schema versions are stored with their validity period. The registry supports both backward compatibility (new schema can read old data) and forward compatibility (old schema can read new data). The default mode is backward-compatible: consumers can handle events from older schema versions.

### Event Deduplication

SDKs implement retry logic, which means the platform must handle duplicate events. Deduplication is performed at the ingest edge using the event's `event_id` (UUID, client-generated):

```
FUNCTION deduplicateEvent(event: EventRecord) -> Bool:
  // Bloom filter for fast negative check (probabilistic, ~0.1% false positive rate)
  IF NOT deduplication_bloom_filter.mightContain(event.event_id):
    deduplication_bloom_filter.add(event.event_id)
    RETURN false  // not a duplicate

  // Bloom filter positive: confirm with exact lookup (last 24h window)
  IF exact_dedup_cache.exists(event.event_id):
    metrics.increment("event.duplicate_rejected")
    RETURN true  // confirmed duplicate

  exact_dedup_cache.set(event.event_id, TTL=24h)
  RETURN false  // false positive from bloom filter
```

The combination of a bloom filter (O(1) fast path) and exact cache (O(1) confirmation for bloom positives) keeps deduplication efficient even at millions of events per second.

---

## Race Conditions and Edge Cases

### Race Condition 1: Concurrent Profile Updates

Two events for the same user arrive simultaneously and both attempt to update the same profile. Without coordination, the second write may overwrite the first.

**Solution**: Profile writes use optimistic concurrency control — each write includes the current profile `version` field. If the version has changed since the read, the write fails and retries. Combined with CRDT-style merge semantics for the trait map (last-writer-wins per trait key), profile updates are safe under concurrent writes.

### Race Condition 2: Consent Change During Fan-out

A user revokes consent at the same moment a profile update is being fanned out to destinations.

**Solution**: The fan-out router re-checks consent at the time of dequeuing from the destination queue, not just at the time of enqueueing. This "consent at delivery" check ensures that consent changes take effect within one dequeue cycle (typically seconds). A small window of non-compliance is possible; logging captures any deliveries that occurred between consent revocation and the effective cutoff.

### Race Condition 3: Erasure During Active Processing

An erasure request arrives while events for the subject are still in the ingest queue.

**Solution**: The erasure pipeline first marks the profile as `erasure_requested` in a fast-path lookup table. The event processor checks this lookup before writing to the profile store. Events that arrive after the erasure flag is set are dropped (not processed). The erasure pipeline then proceeds to delete the profile from each storage tier in order of sensitivity (live stores first, archives last), issuing a signed deletion receipt for each.

### Bottleneck Analysis

| Bottleneck | Root Cause | Solution |
|---|---|---|
| **Identity graph hot partitions** | High-traffic profiles (e.g., bot traffic, test accounts) create hot nodes in the graph DB | Per-node write rate limiting; bot detection to filter noise before identity processing |
| **Profile write contention** | High-frequency event streams for a single user cause many concurrent profile updates | Event batching window (100ms) before profile write; CRDT merge at write |
| **Fan-out queue depth spike** | Viral campaign triggers massive audience entry event for millions of profiles simultaneously | Throttled fan-out with configurable emission rate per destination; spillover to object storage |
| **Batch segment refresh latency** | Full re-scan of 1B profiles is too slow for 15-min refresh cycle | Incremental evaluation on dirty profiles only; pre-aggregate event counts in materialized views |
| **Schema validation throughput** | Parsing and validating JSON schema for every event at 2M events/sec is CPU-intensive | Pre-compiled schema validators cached per event type; async validation for non-critical event types |
