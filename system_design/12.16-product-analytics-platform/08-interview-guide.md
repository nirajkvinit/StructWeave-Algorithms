# 12.16 Product Analytics Platform — Interview Guide

## System Overview for Interviewers

A product analytics platform interview tests a candidate's ability to reason about write-heavy event systems with strict read-latency requirements. It combines distributed streaming pipelines, columnar storage design, complex query algorithms (funnel, retention, path), and multi-tenancy. Strong candidates demonstrate they understand the domain deeply: not just "store events and query them" but the specific computational challenges of ordered multi-step funnel matching, point-in-time user property resolution, and behavioral cohort set algebra at billion-event scale. This is also a strong test of trade-off reasoning: schema-on-read vs. schema-on-write, exact counts vs. probabilistic sketches, pre-aggregation vs. ad hoc query.

---

## 45-Minute Interview Pacing

### Phase 1: Requirements & Scoping (8 minutes)

**Objective:** Ensure candidate narrows scope and identifies the analytically interesting sub-problems.

**Opening prompt:**
> "Design a product analytics platform like Amplitude or Mixpanel — a system where companies can track user events in their applications and analyze user behavior through funnels, retention charts, and user journey flows."

**Strong candidates will immediately ask:**
- What scale? (daily active users, events/day, number of tenants)
- What query types are in scope? (funnel? retention? path? ad hoc SQL?)
- What's the freshness requirement? (real-time dashboards vs. next-day batch?)
- How long is data retained? (cost and query architecture depend heavily on this)
- Multi-tenant? (isolation requirements affect storage design)

**Weak candidate signal:** Jumps to "I'll use Kafka and Spark" without scoping. Treat this as a negative signal — redirect with "Before jumping to implementation, what are the key requirements we need to nail down?"

**Key numbers to establish by end of Phase 1:**
- 1 billion events/day
- Sub-second query latency for common queries
- 30-second freshness for dashboards
- Multi-tenant (50,000 projects)
- 2-year event retention

---

### Phase 2: High-Level Architecture (12 minutes)

**Objective:** Candidate should produce a coherent layered architecture with clear rationale for each layer.

**Expected components:**
1. SDK clients sending events via HTTP
2. Collector tier (stateless, dedup, validation)
3. Message queue (partitioned by project\_id)
4. Stream processor (enrichment, writes to storage)
5. Storage tiers (hot/warm/cold)
6. Query engine (funnel/retention/path engines)
7. API layer + dashboard

**Probing questions:**

*On storage:*
> "You've proposed storing events. What format would you use, and why? How does that affect query performance?"

Strong answer: Columnar (Parquet/ORC), partitioned by project+date+event\_name. Explain predicate pushdown, dictionary encoding, compression ratios. Mention sort order within partitions for user-level access patterns.

*On deduplication:*
> "SDKs retry on network failure. How do you prevent duplicate events from corrupting your funnel counts?"

Strong answer: event\_id assigned client-side; bloom filter at collector tier; idempotent writes downstream. Discuss false positive trade-off.

*On freshness:*
> "Your funnel dashboard needs data within 30 seconds of the event. How does that change your architecture?"

Strong answer: Separate hot store tier; streaming rollup for key metrics; canary monitoring for freshness SLO.

---

### Phase 3: Deep Dive — Funnel Engine (10 minutes)

**This is the highest-signal section.** The funnel computation problem is the most technically interesting aspect of the system.

**Prompt:**
> "Let's go deep on funnel analysis. A funnel has 4 ordered steps: SignupClicked → FormSubmitted → EmailVerified → FirstPurchase. A user must complete all 4 steps within 7 days of step 1. How do you compute the conversion count at each step, efficiently, for a project with 50 million users and 500 million events over the 30-day query window?"

**What you're testing:**
- Does the candidate understand why naive SQL (correlated subqueries) is slow?
- Do they propose bitmap-based step matching?
- Do they handle the ordering constraint and time window correctly?
- Do they consider property-based breakdown?

**Naive approach (should be rejected):**
```
// Correlated subquery approach - O(n^steps) - reject this
SELECT COUNT(DISTINCT s1.user_id)
FROM events s1
JOIN events s2 ON s1.user_id = s2.user_id AND s2.timestamp > s1.timestamp
JOIN events s3 ON s2.user_id = s3.user_id AND s3.timestamp > s2.timestamp
WHERE s1.event_name = 'SignupClicked'
  AND s2.event_name = 'FormSubmitted'
  AND s3.timestamp - s1.timestamp < 7 days
```

**Strong approach (expected):**
- Parallel per-step columnar scans → one sorted (user\_id, timestamp) list per step
- Build bitmap of users who completed each step
- Ordered intersection with time-window constraint
- O(n × steps) with good constant factors; vectorizable

**Follow-up:**
> "How do you add a property breakdown — show me conversion by platform AND plan tier?"

Strong answer: After step bitmaps are built, for each combination of (platform, plan\_tier) values, filter the step bitmaps to users with those properties and count cardinality. Pre-computed group-by cubes for common breakdown dimensions. Discuss cardinality explosion risk for high-cardinality breakdown dimensions.

---

### Phase 4: Deep Dive — Retention or Path (8 minutes)

**Choose one based on remaining time and candidate engagement.**

**Option A: Retention Deep Dive**

> "How does your system compute an N-day retention chart: for each weekly cohort of new users, what % came back on week 1, 2, 3, ... 12?"

Strong answer: Cohort matrix: 2D array indexed by (cohort\_week, return\_week). Pre-computed incrementally as return events arrive. Each return event updates the matrix cell for the user's cohort membership. Query is then O(cohort\_periods × return\_periods) not O(events).

Follow-up: "What's the difference between N-day retention and unbounded retention, and how does that change your data model?"

**Option B: Path Analysis Deep Dive**

> "A user clicks 'View Pricing' — what do they do next most commonly? How do you compute a Sankey diagram showing the top 20 paths after this anchor event?"

Strong answer: Session index (session\_id → ordered event list). Scan sessions containing anchor event; for each session, extract next N events; count edge frequencies (A→B transitions); prune to top-N edges; aggregate small-frequency paths into "(other)" node.

Follow-up: "How do you define session boundaries? What if a user leaves and comes back 45 minutes later?"

---

### Phase 5: Scalability & Extensions (7 minutes)

**Probing questions for breadth:**

*On multi-tenancy:*
> "You have 50,000 projects. Some are tiny (1,000 events/day). One is enormous (5 billion events/day). How does your storage and query architecture handle both?"

Strong answer: Partition-level storage; large tenants get dedicated storage nodes and sub-sharding; small tenants share pooled storage with fair-scheduling at query time. Quota enforcement per project.

*On late-arriving events:*
> "A mobile SDK sends events collected offline when the user reconnects, 48 hours later. How does this affect your funnel results and how do you handle it?"

Strong answer: Ingest into the correct date partition based on client\_timestamp; accept up to 72h late; mark affected rollups as needing recomputation; add staleness flag to query results for affected date ranges.

*On schema evolution:*
> "A developer adds a new property 'referrer_campaign' to all events going forward. But they want to query it as a funnel breakdown for the past 6 months too. How does your system handle this?"

Strong answer: Schema-on-read — property was stored in the JSON blob even before the developer registered it. The query engine discovers the property at query time. If the property didn't exist before a certain date, those rows simply have null values for the breakdown dimension.

---

## Trap Questions

### Trap 1: "Just use a database"
> "Why not store events in PostgreSQL and query with SQL? It handles joins and GROUP BY."

**What weak candidates do:** Agree or vaguely say "it won't scale."

**Strong response:** Row-oriented databases are slow for analytics: full-table scans to compute COUNT DISTINCT over 500M events; no columnar compression; no predicate pushdown on event properties. Funnel queries with correlated joins are O(n²). The funnel algorithm is not expressible as a single SQL query without window functions that still require a full sort. At 10B events, even a trivial GROUP BY takes minutes in PostgreSQL.

### Trap 2: "Use Spark for everything"
> "Can you just run a Spark job every hour to recompute all the analytics?"

**What weak candidates do:** Say yes, this is fine.

**Strong response:** Hourly batch is incompatible with the 30-second freshness requirement for dashboards. Recomputing all analytics hourly at 10B events/day requires significant compute, making it cost-prohibitive. And batch recomputation doesn't support ad hoc queries — users would have to wait for the next batch run. The correct architecture separates: streaming micro-aggregations for freshness, pre-computed materialized views for common queries, and on-demand columnar scans for ad hoc exploration.

### Trap 3: "Store user properties on the event"
> "Why not just denormalize user properties onto every event at write time? Then you don't need a separate user\_properties table."

**What weak candidates do:** Agree this is simpler.

**Strong response:** Point-in-time correctness breaks. If a user upgrades from Free to Pro and then queries their historical funnel analysis, denormalized events would show their current plan value (Pro) even for actions taken when they were on Free. This produces incorrect breakdown results. The SCD Type 2 user\_properties table with valid\_from/valid\_to timestamps enables correct as-of lookups: "what was this user's plan at the time they hit step 1 of this funnel?"

### Trap 4: "Exact counts are always required"
> "Users will complain that your distinct user counts are wrong if they use HyperLogLog approximations."

**What weak candidates do:** Agree and propose exact COUNT DISTINCT everywhere.

**Strong response:** For 100M+ users, exact COUNT DISTINCT requires either a sort (O(n log n)) or a hash set (O(n) memory — up to 800MB for 100M user\_ids). At P99 query latency < 2s, neither is feasible for on-demand queries. HyperLogLog provides ~0.8% relative error at 1KB per sketch. For product analytics (optimizing conversion rates, understanding retention), 0.8% error is invisible and irrelevant to the decision being made. Exact counts are provided for billing-critical metrics only, with an explicit latency trade-off surfaced to users.

---

## Common Mistakes

| Mistake | Impact | Correct Approach |
|---|---|---|
| No deduplication design | SDK retries inflate all counts | Bloom filter on event\_id at collector tier; idempotent upsert |
| Single storage tier | Cannot meet freshness + cost requirements simultaneously | Three-tier (hot/warm/cold) with query routing |
| No user property time-series | Historical breakdowns show current property values (wrong) | SCD Type 2 user\_properties with as-of query support |
| SQL correlated joins for funnels | O(n²) scaling; minutes for large tenants | Parallel per-step bitmaps with ordered intersection |
| No schema-on-read design | Requires schema registration before tracking; blocks iteration | JSON blob for properties; type inference at query time |
| No late event handling | Metrics wrong for up to 72h; no way to correct | Accept late events; mark affected rollups for recomputation |
| Ignoring multi-tenant isolation | Large tenant can starve small tenants; cross-project leakage | Storage partition-level isolation; query quota enforcement |
| Overlooking GDPR erasure | Re-identification risk; regulatory non-compliance | Two-phase erasure: soft delete + compaction rewrite |

---

## Scoring Rubric

### Entry-Level (L4): Passes if they...
- Correctly identify the need for a streaming ingestion pipeline
- Propose columnar or time-series storage (not raw relational)
- Describe funnel computation conceptually (ordered steps with time window)
- Identify basic deduplication need

### Mid-Level (L5): Passes if they...
- Design multi-tier storage with rationale
- Describe bitmap-based funnel computation
- Address multi-tenancy (partition isolation, quota)
- Discuss approximate counting with trade-offs
- Propose query caching strategy

### Senior (L6): Passes if they...
- Design full pipeline from SDK to query with failure modes
- Describe point-in-time user property resolution (SCD Type 2)
- Design retention pre-computation with incremental update
- Reason about hot-spot partitions and large tenant sharding
- Address GDPR erasure with correct complexity analysis
- Identify and resolve late-event consistency problem

### Staff (L7): Distinguished if they...
- Proactively discuss behavioral cohort set algebra and efficient evaluation
- Reason about schema governance and event taxonomy at scale
- Design identity stitching across anonymous-to-identified transitions
- Discuss cardinality management for breakdown dimensions (HLL, theta sketches)
- Propose circuit breaker pattern at SDK for resilience
- Identify P99 query latency bottleneck at each layer independently
