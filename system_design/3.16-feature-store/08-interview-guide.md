# Interview Guide

[← Back to Index](./00-index.md)

---

## 45-Minute Interview Pacing

```
Recommended Time Allocation:
─────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────┐
│  0-5 min   │ CLARIFY REQUIREMENTS                       │
│            │ • What's the primary use case?             │
│            │ • What freshness requirements?             │
│            │ • Scale: entities, features, QPS?          │
│            │ • Train-serve consistency requirement?     │
├────────────┼───────────────────────────────────────────┤
│  5-15 min  │ HIGH-LEVEL DESIGN                          │
│            │ • Draw dual-store architecture             │
│            │ • Explain offline vs online stores         │
│            │ • Show materialization flow                │
│            │ • Mention feature registry                 │
├────────────┼───────────────────────────────────────────┤
│  15-30 min │ DEEP DIVE (Pick 1-2)                       │
│            │ • Point-in-time joins (if training focus)  │
│            │ • Online serving (if inference focus)      │
│            │ • Materialization pipeline                 │
│            │ • Data model and APIs                      │
├────────────┼───────────────────────────────────────────┤
│  30-40 min │ SCALE & BOTTLENECKS                        │
│            │ • Online store scaling                     │
│            │ • Freshness vs cost trade-offs             │
│            │ • Hot entity handling                      │
│            │ • Failure scenarios                        │
├────────────┼───────────────────────────────────────────┤
│  40-45 min │ WRAP UP                                    │
│            │ • Summarize key decisions                  │
│            │ • Mention what you'd add with more time    │
│            │ • Ask clarifying questions if needed       │
└────────────┴───────────────────────────────────────────┘
```

---

## Requirements Clarification

### Questions to Ask

```
Essential Questions:
─────────────────────────────────────────────────────────

1. USE CASE
   "What's the primary use case - is this for model training,
   real-time inference, or both?"

   Why: Determines if you need both stores or just one

2. SCALE
   "How many unique entities are we serving? How many features
   per entity? What's the expected QPS for online serving?"

   Why: Determines storage and compute requirements

3. FRESHNESS
   "What's the acceptable freshness for features? Real-time
   (<1 min), near-real-time (<15 min), or batch (<24 hours)?"

   Why: Determines materialization strategy

4. CONSISTENCY
   "Is train-serve consistency critical? Do we need point-in-time
   correctness for training data?"

   Why: Affects architecture complexity significantly

5. EXISTING INFRASTRUCTURE
   "What data infrastructure exists? Data warehouse, streaming
   platform, existing ML platforms?"

   Why: Determines integration points and technology choices
```

### Clarification Scenarios

```
Scenario Responses:
─────────────────────────────────────────────────────────

IF asked about "real-time recommendations":
  Focus on: Online store latency, streaming materialization,
            hot entity handling, caching strategies

IF asked about "fraud detection":
  Focus on: Sub-10ms latency, streaming features,
            high availability, graceful degradation

IF asked about "ML platform":
  Focus on: Registry/discovery, PIT correctness,
            train-serve consistency, multi-tenant

IF asked about "feature reuse across teams":
  Focus on: Registry, discovery, access control,
            standardization, documentation
```

---

## Trap Questions and Answers

### Trap 1: "Why not just use a data warehouse?"

```
Expected Trap:
"Our data warehouse can serve features. Why do we need
a separate feature store?"

─────────────────────────────────────────────────────────

Strong Answer:

"Data warehouses are excellent for analytics but have
key limitations for ML features:

1. LATENCY: Warehouses are optimized for throughput,
   not latency. They typically can't serve features in
   <10ms needed for real-time inference.

2. POINT-IN-TIME: Warehouses don't natively support
   temporal joins needed to prevent data leakage in
   training data.

3. FRESHNESS: Feature stores can support streaming
   updates for real-time features, while warehouses
   are typically batch-oriented.

4. SERVING PATTERN: Warehouses are optimized for
   aggregations over many rows. Feature serving needs
   fast point lookups for individual entities.

That said, for batch-only ML with relaxed latency,
using a warehouse as the offline store makes sense."
```

### Trap 2: "How do you ensure train-serve consistency?"

```
Expected Trap:
"What guarantees that features used in training are the
same as features used in production inference?"

─────────────────────────────────────────────────────────

Strong Answer:

"Train-serve consistency is achieved through three mechanisms:

1. SINGLE SOURCE OF TRUTH: Both training and serving read
   from the same feature store. Training uses the offline
   store with PIT joins, serving uses online store - but
   both are materialized from the same definitions.

2. FEATURE VERSIONING: Feature views are versioned. When
   a model is trained, we record which feature view versions
   were used. Inference must use the same versions.

3. TRANSFORMATION PARITY: Feature transformations are defined
   once in the feature view definition, not duplicated in
   training and serving code.

The key is that the materialization pipeline applies the
same transformations whether writing to offline or online
store. The only difference is timing - offline has history,
online has latest."
```

### Trap 3: "What if a feature needs both batch and streaming?"

```
Expected Trap:
"Some features are computed daily but need updates within
minutes. How do you handle this?"

─────────────────────────────────────────────────────────

Strong Answer:

"This is the 'lambda architecture' problem for features.
Several approaches:

1. LAYERED FRESHNESS: Store both batch-computed and
   streaming-computed values. At serving time, combine:
   - Batch: user_purchases_30d (updated daily)
   - Streaming: user_purchases_today (real-time)
   - Combined at read: 30d + today

2. STREAMING WITH PERIODIC CORRECTION: Run streaming
   continuously for freshness, but periodically reconcile
   with a batch job to fix any streaming errors.

3. FEATURE VIEW COMPOSITION: Define two feature views:
   - user_purchases_batch (daily, full history)
   - user_purchases_stream (hourly, recent)
   Inference service queries both and combines.

The right approach depends on accuracy requirements.
For most cases, streaming with periodic batch correction
provides the best balance."
```

### Trap 4: "How do you handle schema evolution?"

```
Expected Trap:
"What happens when you need to add a new feature or
change a feature's data type?"

─────────────────────────────────────────────────────────

Strong Answer:

"Schema evolution is one of the trickiest parts of
feature stores. We handle it through:

1. BACKWARD COMPATIBLE CHANGES (Easy):
   - Adding new features: Just add, old consumers ignore
   - Adding nullable fields: Safe, defaults to null

2. BREAKING CHANGES (Require Migration):
   - Changing data types: Create new feature view version
   - Renaming features: Create alias, deprecate old name
   - Removing features: 90-day deprecation notice

3. MIGRATION PROCESS:
   - Create new feature view version (v2)
   - Backfill historical data for v2
   - Run both versions in parallel
   - Migrate consumers to v2
   - Deprecate v1 after migration complete

4. SAFETY MEASURES:
   - Schema validation on registration
   - Compatibility checker before deployment
   - Canary rollouts for schema changes

The key is treating feature schemas like API contracts
with versioning and deprecation policies."
```

### Trap 5: "What about on-demand features?"

```
Expected Trap:
"Some features depend on request context (e.g., distance
to restaurant). These can't be pre-computed."

─────────────────────────────────────────────────────────

Strong Answer:

"On-demand features are computed at request time using
request context. They complement pre-computed features:

1. ARCHITECTURE:
   Pre-computed: user_preferences, restaurant_rating
   On-demand: distance_to_user, time_since_last_order

   At inference:
   - Fetch pre-computed from online store (fast)
   - Compute on-demand in request path
   - Combine and send to model

2. IMPLEMENTATION:
   - Define on-demand features as functions
   - Functions receive request context + entity features
   - Feature store SDK orchestrates combination

3. CONSIDERATIONS:
   - On-demand adds latency (computation in request path)
   - Keep on-demand computation simple (<5ms)
   - Complex on-demand → consider pre-computing approximations

4. EXAMPLES:
   - Distance calculations
   - Time-based features (hours since X)
   - Request-specific context (device type)

The feature store should support both patterns and make
it easy to combine them in a feature service."
```

---

## Trade-offs Discussion

### Freshness vs Cost

```
Trade-off: Feature Freshness vs Infrastructure Cost
─────────────────────────────────────────────────────────

             FRESHNESS
                ▲
                │
   Streaming ───┼──────────── Highest
   (Kafka+Flink)│              $$$
                │
   Micro-batch ─┼──────────────────
   (5-15 min)   │                 $$
                │
   Batch ───────┼────────────────────── Lowest
   (hourly/daily)                        $
                │
                └─────────────────────────► COST

Discussion Points:
- Real-time streaming: Always-on compute, higher complexity
- Micro-batch: Good balance for most features
- Batch: Most cost-effective, but stale for dynamic features

Recommendation: Use tiered approach
- Real-time: Only for features that truly need it (fraud)
- Near-real-time: Activity features, inventory
- Batch: Profiles, historical aggregations
```

### Consistency vs Latency

```
Trade-off: Consistency vs Latency
─────────────────────────────────────────────────────────

Strong Consistency:
- Online store always has latest materialized values
- Requires sync writes, slower materialization
- Use for: Financial features, compliance-critical

Eventual Consistency:
- Online store may lag behind offline
- Async materialization, faster overall
- Use for: Most recommendation features

Read-after-write Consistency:
- Guarantee: After materialization, reads return new values
- Middle ground: Sync confirmation, async propagation

Discussion:
"For most ML use cases, eventual consistency is fine
because models are trained on slightly stale data anyway.
The key is bounding staleness - knowing features are at
most N minutes old. Strong consistency is only needed
for features where stale data causes immediate harm."
```

### Online Store: Managed vs Self-Hosted

```
Trade-off: Managed Service vs Self-Hosted
─────────────────────────────────────────────────────────

Managed (DynamoDB, Managed Redis):
  Pros:
  - Zero operational overhead
  - Auto-scaling built-in
  - High availability managed

  Cons:
  - Higher cost at scale
  - Less control over performance tuning
  - Vendor lock-in

Self-Hosted (Redis Cluster, Cassandra):
  Pros:
  - Lower cost at scale (10x+ savings possible)
  - Full control over tuning
  - No vendor lock-in

  Cons:
  - Operational burden (patching, scaling, monitoring)
  - Requires expertise
  - Failure risk if understaffed

Recommendation:
"Start with managed for simplicity. Once you hit scale
where cost becomes significant (>$50K/month) and have
dedicated infrastructure team, consider self-hosted."
```

---

## Common Mistakes to Avoid

```
Mistake 1: Ignoring Point-in-Time Correctness
─────────────────────────────────────────────────────────
Wrong: "We just join on entity_id between training data
       and feature table"

Right: "We join on entity_id WHERE feature_timestamp <=
       training_event_timestamp to prevent data leakage"

Impact: Models will perform worse in production than
        training if PIT is ignored

─────────────────────────────────────────────────────────

Mistake 2: Over-Engineering for Freshness
─────────────────────────────────────────────────────────
Wrong: "All features should be real-time for best results"

Right: "Most features can be batch. Reserve streaming for
       features where freshness directly impacts business
       outcomes (fraud, session-based recommendations)"

Impact: 10x cost difference between streaming and batch

─────────────────────────────────────────────────────────

Mistake 3: Forgetting About Hot Entities
─────────────────────────────────────────────────────────
Wrong: "Hash partitioning ensures even load"

Right: "Hot entities (popular users/items) need special
       handling: caching, read replicas, or key spreading"

Impact: P99 latency degradation, potential outages

─────────────────────────────────────────────────────────

Mistake 4: No Plan for Schema Evolution
─────────────────────────────────────────────────────────
Wrong: "We'll figure out schema changes when we need them"

Right: "Feature views are versioned, breaking changes
       require new versions with migration path"

Impact: Painful migrations, potential production issues

─────────────────────────────────────────────────────────

Mistake 5: Single Point of Failure
─────────────────────────────────────────────────────────
Wrong: "One Redis instance is enough for our scale"

Right: "Online store needs replication and failover.
       Consider graceful degradation with stale cache."

Impact: Inference service outage when feature store fails
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│              FEATURE STORE QUICK REFERENCE              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  DUAL-STORE ARCHITECTURE                                │
│  ─────────────────────────                              │
│  Offline Store: Training data (PIT joins, columnar)     │
│  Online Store: Inference (KV lookups, <10ms)            │
│  Materialization: Syncs offline → online                │
│                                                         │
│  KEY REQUIREMENTS                                       │
│  ────────────────                                       │
│  • Online latency: p99 <10ms                            │
│  • Offline: PIT correctness, no data leakage            │
│  • Freshness: Real-time / Near-RT / Batch tiers         │
│  • Scale: 100M+ entities, 100K+ QPS                     │
│                                                         │
│  STORE COMPARISON                                       │
│  ────────────────                                       │
│  │ Aspect    │ Offline       │ Online         │         │
│  ├───────────┼───────────────┼────────────────┤         │
│  │ Storage   │ Parquet/Delta │ Redis/DynamoDB │         │
│  │ Query     │ Spark SQL     │ Key-Value GET  │         │
│  │ Latency   │ Minutes       │ Milliseconds   │         │
│  │ Data      │ Historical    │ Latest only    │         │
│                                                         │
│  FRESHNESS TIERS                                        │
│  ───────────────                                        │
│  Real-time:      <1 min   (streaming)       $$$         │
│  Near-real-time: <15 min  (micro-batch)     $$          │
│  Batch:          <24 hours (scheduled)      $           │
│                                                         │
│  KEY ALGORITHMS                                         │
│  ──────────────                                         │
│  • PIT Join: feature_ts <= entity_event_ts              │
│  • Materialization: Dedupe, transform, upsert           │
│  • Online retrieval: Cache → Store → Default            │
│                                                         │
│  CRITICAL TRADE-OFFS                                    │
│  ───────────────────                                    │
│  Freshness vs Cost: Streaming $$$ > Batch $             │
│  Consistency vs Latency: Strong = slower                │
│  Managed vs Self-hosted: Simplicity vs control          │
│                                                         │
│  COMMON PITFALLS                                        │
│  ───────────────                                        │
│  ✗ Ignoring PIT correctness → data leakage              │
│  ✗ All features real-time → cost explosion              │
│  ✗ No hot entity handling → latency spikes              │
│  ✗ Single point of failure → outages                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Sample Interview Dialogue

```
Interviewer: "Design a feature store for a recommendation
             system that serves 100M users."

─────────────────────────────────────────────────────────

Candidate: "Before I dive in, let me clarify a few things:

1. Are we serving real-time recommendations, or is this
   batch? This affects our freshness requirements.

2. How many features per user? And what's the expected
   QPS for online serving?

3. Do we need point-in-time correctness for training data?"

─────────────────────────────────────────────────────────

Interviewer: "Real-time recommendations. About 500 features
             per user. 50K QPS. Yes, PIT correctness needed."

─────────────────────────────────────────────────────────

Candidate: "Great. Here's my high-level approach:

[Draws dual-store architecture on whiteboard]

We need two stores - an offline store for training data
generation with PIT correctness, and an online store for
low-latency serving during inference.

For offline, I'd use a data lake with Parquet or Delta Lake,
partitioned by date. This gives us efficient time-range
queries for PIT joins.

For online, with 100M users, 500 features each at ~8 bytes,
we're looking at ~400GB of data. With replication, maybe 1.2TB.
Redis Cluster can handle this well with sub-5ms latency.

The materialization pipeline syncs from offline to online.
For recommendations, most features can be batch (daily),
but session-based features might need streaming for
15-minute freshness.

Should I dive deeper into the PIT join implementation
or the online serving architecture?"

─────────────────────────────────────────────────────────

[Continue based on interviewer's interest...]
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01 | Initial interview guide |
