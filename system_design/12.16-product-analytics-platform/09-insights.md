# Insights — Product Analytics Platform

## Insight 1: Funnel Computation Is a Set Algebra Problem, Not a Join Problem

**Category:** Data Structures

**One-liner:** Representing funnel steps as ordered bitmaps transforms an O(n²) correlated join into an O(n/64) vectorized intersection.

**Why it matters:**
The instinctive approach to funnel computation is a series of SQL joins: find users who did step A, join with users who later did step B, join with users who later did step C, and so on. This produces correct results for small datasets but is catastrophically slow at scale: each join produces an intermediate result set as large as the previous, and the correlated join on (user_id, timestamp ordering) requires a sort on every step. For a 5-step funnel over 500 million events, this is O(events × steps²)—measured in minutes, not seconds.

The correct abstraction is set algebra over user bitmaps. Each funnel step is represented as a sorted set of user IDs who completed that step (with their earliest qualifying timestamp stored separately). Step conversion is computed by intersecting consecutive step sets after applying the time-window constraint. Roaring bitmaps implement this intersection in O(n/64) using SIMD instructions to process 64 user IDs per CPU cycle. The breakthrough insight is that funnel steps must be evaluated sequentially (step 2 requires knowing step 1 completers) but the per-step scans that build each bitmap are fully parallel. For 50 million users over 5 steps, the total work is 5 parallel scans plus 4 sequential O(50M/64) intersections—completing in under 500ms on modern hardware.

This insight generalizes: any "find users who did sequence X then Y within window W" problem benefits from bitmap-based set operations. Behavioral cohort evaluation, A/B test assignment checking, and audience segmentation all follow the same pattern. The bitmap abstraction is the universal data structure for user-group computations in analytics systems.

---

## Insight 2: Schema-on-Read Enables Retroactive Analysis — But Requires Governance to Stay Useful

**Category:** System Modeling

**One-liner:** Storing events with flexible schemas unlocks retroactive analysis, but without a governance layer, the event taxonomy decays into an unreadable swamp within months.

**Why it matters:**
Schema-on-read is the key architectural decision that separates a product analytics platform from a traditional data warehouse. In a warehouse, a new property requires a schema migration before data can be collected. In an analytics platform, raw events are stored with whatever properties the SDK sends, and the query engine infers types at query time. This means a product team can decide today to analyze a property they started tracking six months ago—and retroactively apply that analysis to historical data with no backfill.

The cost is event taxonomy decay. Without constraints, different teams send the same concept under different names: `plan_type`, `subscription_plan`, `user_plan`, `planType`. Properties start as strings then get booleans inconsistently. Events named `button_click` become meaningless because every team uses them differently. Within 12 months, a typical analytics implementation has hundreds of poorly documented event types, making self-serve analysis nearly impossible.

The resolution is a governance layer that does not block ingestion but does impose accountability: a data contract registry where teams register event schemas, required properties, and ownership; a quality score per event type updated daily based on schema adherence; and automatic notification to the owning team when schema violations appear. This is the "paved road" model—good instrumentation is easy, bad instrumentation is surfaced and shameful. The governance layer's existence makes schema-on-read a durable architectural choice rather than a technical debt accumulator.

---

## Insight 3: Point-in-Time User Property Correctness Is the Silent Accuracy Killer

**Category:** Consistency

**One-liner:** Denormalizing current user properties onto historical events produces wrong breakdown results whenever users change plans, countries, or segments over time.

**Why it matters:**
The most common simplification in analytics system design is to store user properties on the event at ingestion time ("what is the user's plan right now?") or to join the event table against a current-snapshot user table at query time. Both approaches produce incorrect results for any analysis that spans a period during which users changed their properties.

Consider a cohort analysis question: "what is the 30-day retention for users who signed up on the free plan?" If user properties are stored as current values, any user who has since upgraded to Pro is classified as Pro in historical analysis—completely inverting the cohort's meaning. The correct answer requires knowing the user's plan at the time of signup, not today.

The solution is an SCD Type 2 (Slowly Changing Dimension Type 2) user\_properties table that stores property values as time-series: each row has a valid\_from and valid\_to timestamp, enabling point-in-time lookups. The cost is query complexity (as-of joins are harder to write and slower to execute than simple lookups) and storage growth (every property change creates a new row). The benefit is historical correctness that compounds over time: the longer the platform has been running, the more meaningful historical analysis becomes, and that value depends entirely on the correctness of point-in-time property resolution. Systems that skip this optimization quietly produce wrong answers that product teams never notice—they assume the analytics are correct and make decisions on corrupted data.

---

## Insight 4: Three-Tier Storage Is Not a Caching Strategy — It's a Latency vs. Cost Trade-off at Each Time Horizon

**Category:** Cost Optimization

**One-liner:** Hot/warm/cold storage tiers exist because query latency requirements and data access frequency both decay exponentially with event age.

**Why it matters:**
Naive analytics architectures store all events in a single tier: either everything in a fast (expensive) store, leading to unsustainable storage costs, or everything in a cheap (slow) store, leading to unacceptable query latency. The three-tier architecture exploits a fundamental truth about analytics workloads: 80% of queries are over the last 7 days of data, 15% over the last 30 days, and 5% over historical data. This distribution means the storage footprint that must be fast is a small fraction of total data.

The hot tier (in-memory NVMe, last 24 hours) serves dashboard queries with sub-50ms latency. It holds roughly 670GB of new data per day—the exact amount that must always be fresh. The warm tier (compressed columnar on network SSD, last 90 days) serves the majority of ad hoc analytical queries where 200ms latency is acceptable. The cold tier (compressed Parquet on object storage, 2+ years) serves historical queries that users understand will take 2–5 seconds. The storage cost ratio across tiers is roughly 50:10:1 (NVMe:SSD:Object), meaning cold storage is 50× cheaper than hot per GB. Tiering correctly allocates 90-day costs to the medium tier and long-term costs to the cheap tier.

The critical enabler is the query router that transparently selects the appropriate tier based on the query's date range and freshness requirements. Users never explicitly choose a tier—they write a query, and the router dispatches to the optimal combination of tiers and merges results. This abstraction means the tiering optimization is invisible to users but captures most of its cost benefits automatically.

---

## Insight 5: Bloom Filters at the Collector Tier Are Worth Their Complexity Because Downstream Deduplication Is 100× More Expensive

**Category:** Data Structures

**One-liner:** Catching duplicate events before they enter the storage layer is orders of magnitude cheaper than identifying and removing them after aggregation.

**Why it matters:**
SDK clients retry events on any network failure, meaning every event may arrive 1–5 times during normal operation. The seemingly easy fix—just deduplicate in the database with a UNIQUE constraint on event\_id—works at small scale but collapses under high ingestion rates: maintaining a 10-billion-row unique index against which every new event must be checked is a database-killing operation. The less obvious fix—deduplicate in the stream processor before writing to storage—is better but still requires a deduplication store that must handle the full event ingestion rate.

The insight is that most duplicates are temporally local: an SDK retry happens within seconds or minutes of the original send. A bloom filter keyed on event\_id, maintained per project in the collector tier with a 72-hour lookback window, catches 99.9%+ of practical duplicates before they reach the queue. A bloom filter is O(1) for both insert and membership check, requires roughly 12 bits per element (for 0.01% false positive rate), and fits entirely in memory: 1 billion events × 12 bits = 1.5GB per project—manageable for a rotating 72-hour window. The false positive cost (incorrectly dropping a unique event) is 0.01% of events—an acceptable loss given the alternative of duplicate inflation that corrupts all downstream metrics. The bloom filter is a precision/recall trade-off applied to exactly the right layer.

---

## Insight 6: Behavioral Cohorts Require Set Algebra, Not SQL Subqueries, to Scale

**Category:** Partitioning

**One-liner:** Dynamic behavioral cohorts ("users who bought twice in 30 days") are set membership problems solvable by bitmap intersection, but SQL subqueries for the same question require full table scans for each predicate.

**Why it matters:**
A behavioral cohort—"users who performed event X at least N times in the last 30 days but never performed event Y"—sounds like a simple SQL WHERE clause. In practice, it composes multiple correlated existence checks over a large event table, each of which requires a full scan or an expensive index lookup on (user\_id, event\_name, timestamp). For a project with 100 million users and 10 billion events over 30 days, each cohort criterion requires scanning hundreds of millions of rows and grouping by user\_id.

The bitmap approach evaluates cohort criteria in parallel: one scan per event\_name criterion produces a bitmap of qualifying user IDs, and the final cohort is computed by AND/OR/AND_NOT operations on these bitmaps. The critical optimization is that these per-criterion scans are independent and can run in parallel, with the merge being a near-instant bitmap operation. Furthermore, behavioral cohort bitmaps can be cached by criterion: the "performed purchase_completed >= 2 times in last 30 days" bitmap is computed once and reused across all analyses that reference it, regardless of what downstream analysis applies the cohort. This cache reuse means frequently-used cohorts pay the scan cost once but benefit all queries that reference them throughout the day.

---

## Insight 7: Identity Stitching Must Be Applied at Query Time, Not Ingestion Time, for Historical Correctness

**Category:** Consistency

**One-liner:** Linking anonymous pre-login events to authenticated user IDs after the fact is a query-time graph traversal problem, not a write-time data mutation problem.

**Why it matters:**
A user visits a website anonymously (anonymous\_id = A), clicks around for 10 minutes, then creates an account (user\_id = U). The identify() call links A to U going forward. But the 10 minutes of pre-registration events are already stored with anonymous\_id = A, not user\_id = U. A funnel that starts with "page\_viewed" (pre-registration) and ends with "purchase\_completed" (post-registration) needs to connect these two event streams to correctly attribute the full journey to user U.

The tempting solution is to retroactively update stored events to set user\_id = U wherever anonymous\_id = A appears. This is an expensive write operation that must rewrite potentially millions of events and invalidate all cached query results containing those events. It also creates a correctness problem for future identity merges: if later U identifies as having also been anonymous\_id B, another retroactive rewrite is needed.

The correct solution is an identity resolution graph maintained as a simple lookup table: anonymous\_id → canonical\_user\_id. Query time user\_id lookups expand through this graph: any query filtering on user\_id = U automatically includes all anonymous IDs that have been linked to U. This is O(1) per event in the query path, requires no storage rewrites, and handles multi-device and multi-session identity chains correctly regardless of when identification happens relative to the query. The cost is that every query must perform identity expansion—mitigated by caching the identity graph per project in query worker memory.

---

## Insight 8: Real-Time Freshness Is Best Measured by Canary Events, Not by Pipeline Lag Metrics

**Category:** Resilience

**One-liner:** Aggregate pipeline lag metrics miss per-project freshness failures; synthetic canary events measure the full end-to-end data path continuously.

**Why it matters:**
The standard approach to freshness monitoring is measuring queue consumer lag: if the stream processor is keeping up with the queue, freshness is good. This is necessary but insufficient. Queue lag measures the processing tier—it says nothing about whether processed events are actually visible in query results, whether the hot store write is completing, or whether a specific project's data is being dropped by a bug in the governance scorer. Many freshness incidents are not visible in aggregate queue lag: a per-project bug causes that project's events to be processed but not stored; aggregate lag looks fine; only that project's users experience stale data.

Canary events close this gap: a synthetic event emitted by the monitoring system every minute from a controlled source traverses the complete ingestion path—collector → dedup → queue → stream processor → hot store—and is then queried to verify end-to-end visibility. The canary query asks "did this specific event\_id appear in the last 90 seconds?" If not, freshness SLO is violated regardless of what aggregate queue metrics say. Per-project canaries (sampled across 1000 representative projects) detect isolation bugs that affect only specific tenants.

The deeper principle is that observability systems should measure outcomes (data is visible and correct) rather than only measuring process health (pipeline is running). Outcome-based measurement catches failure modes that look healthy from the inside—a fully processed event that gets written to the wrong partition, a correctly stored event that gets excluded by a buggy query predicate—and these are the failure modes that matter most to users.
