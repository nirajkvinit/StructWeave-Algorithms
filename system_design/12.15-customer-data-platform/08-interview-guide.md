# 08 — Interview Guide: Customer Data Platform

## Overview

A CDP system design interview tests whether a candidate understands the intersection of **distributed event pipelines**, **identity graph systems**, **real-time computation**, and **privacy architecture**. Unlike pure infrastructure problems (design a message queue) or pure product problems (design a recommendation system), a CDP interview probes all of these simultaneously. The most common failure mode is treating it as a simple "collect-and-store user data" problem, missing the hard technical challenges entirely.

**Difficulty**: Staff/Senior Staff SDE equivalent. Often appears in infra-platform or data platform rounds at companies building marketing technology, analytics infrastructure, or data activation platforms.

**Time**: 45 minutes

---

## 45-Minute Pacing Guide

### Phase 1: Opening and Requirements (0–8 min)

**Goal**: Establish scope and expose constraints that will drive design decisions.

**Key questions to ask**:
1. "What scale should I design for — how many events per day, and how many unified profiles?"
2. "Is real-time segment evaluation required, or is batch sufficient?"
3. "How many downstream destinations should I support, and what's their variety?"
4. "Do we need to support GDPR/CCPA compliance from day one?"
5. "Is this a warehouse-native (composable) CDP, or a traditional all-in-one CDP?"

**Why these matter**:
- Event scale determines whether you need a distributed queue or a simple database write
- Real-time requirement determines whether you need a streaming CEP or just nightly SQL
- Destination variety determines whether you need per-destination delivery isolation or a single delivery mechanism
- Privacy requirements determine whether erasure and consent are first-class architectural concerns

**Good candidate behavior**: Asks all 5 questions, notes that real-time + erasure + scale all conflict with naive approaches, frames the core challenges before designing.

**Weak candidate behavior**: Jumps immediately to "users table + events table + cron job to build audiences."

---

### Phase 2: High-Level Architecture (8–20 min)

**Goal**: Sketch the major components and justify each.

**Expected components**:
- Edge collectors / ingest API
- Schema validation layer
- Ingest queue (partitioned)
- Identity resolution engine + identity graph
- Profile store (document store)
- Segment evaluation engine (streaming + batch)
- Destination fan-out system with per-destination queues
- Consent enforcement layer

**Key decisions to articulate**:

1. **Why a queue between ingest and processing?**
   Strong answer: Decouples ingest availability from processing speed. If identity resolution backs up, events buffer in the queue without dropping. Allows replay. Enables batch micro-processing.

2. **Why a dedicated identity graph vs. relational joins?**
   Strong answer: Identity resolution requires traversing connected components (BFS). Relational self-joins for transitive closure are O(n²) and don't scale. A graph DB handles this natively.

3. **Why per-destination queues instead of a shared delivery queue?**
   Strong answer: A single destination going offline fills a shared queue and starves healthy destinations. Per-destination isolation prevents head-of-line blocking.

**Mermaid diagram tip**: Draw the architecture as a left-to-right flow: Sources → Ingest → Queue → Processing (identity + profile) → Audience Engine → Fan-out → Destinations. Add the Consent Enforcement as a cross-cutting layer.

---

### Phase 3: Deep Dives (20–38 min)

Interviewers will pick 2–3 of the following deep dives. Be ready for all of them.

#### Deep Dive A: Identity Resolution

**Opening question**: "Walk me through how you resolve a user who visits anonymously, adds to cart, then logs in — all in one session."

**Strong answer path**:
1. Anonymous event arrives → look up `anonymous_id` in identity graph → no match → create anonymous profile, create graph node
2. Identify event arrives (`user_id` present) → look up `user_id` in identity graph → no match → create authenticated profile, create graph node → create edge between `anonymous_id` node and `user_id` node → merge the two profiles
3. Explain survivorship rules: for trait conflict, most-recently-updated wins; for consent, most restrictive wins
4. Mention the distributed lock on merge operations to prevent concurrent merge conflicts

**Probing follow-up**: "What if two people share a device — same `device_id` but different user IDs?"
Strong answer: Device IDs are lower-confidence identifiers. The system creates an edge with a lower weight. A deterministic link (email, phone) from user_id_A to device_id and a deterministic link from user_id_B to device_id creates a tension — the resolver applies a **split** heuristic: if a device has > N authenticated users in < T time, the device edge weight is lowered to below the merge threshold, preventing incorrect merges.

#### Deep Dive B: Real-Time Segment Evaluation

**Opening question**: "How do you evaluate 50,000 segment definitions against 2M events/second?"

**Strong answer path**:
1. Don't evaluate all 50,000 against every event. Build an inverted index: event_name → list of segment IDs with rules referencing that event name.
2. Per event, O(1) lookup to find relevant segments (typically 5–50, not 50,000).
3. Compile segment rules to a streaming AST at segment creation time. Segments requiring historical aggregations or SQL joins are flagged as batch-only.
4. Maintain per-profile event count windows on the profile document for common time windows (7d, 30d) to enable streaming evaluation of count-based rules.
5. Batch path handles complex segments on a 15-minute cycle using incremental evaluation on dirty profiles only.

**Probing follow-up**: "How do you keep batch and streaming segments consistent?"
Strong answer: The two paths can produce different results for the same profile if a batch rule references the same data as a streaming rule. Solution: treat streaming as the authoritative real-time path; batch runs a reconciliation pass after each refresh cycle and writes the authoritative result. Streaming results are marked as "provisional" until batch reconciliation confirms them.

#### Deep Dive C: Destination Fan-out Reliability

**Opening question**: "How do you guarantee reliable delivery to 500 destinations when one destination goes down?"

**Strong answer path**:
1. Per-destination isolated queues prevent a failing destination from affecting others
2. Circuit breaker per destination: after 5 consecutive failures, stop attempting delivery (circuit opens). Half-open probe after cooldown period.
3. Exponential backoff with jitter for retries
4. 72-hour retry window with TTL expiry → dead letter queue
5. At-least-once delivery: retry until success; idempotency key (`delivery_id`) in request header for destinations that support it; deduplication bloom filter as fallback
6. Spillover to object storage when queue depth exceeds threshold

**Probing follow-up**: "A destination comes back online after 24 hours. How do you handle 24 hours of backlog?"
Strong answer: Gradually drain the backlog at an elevated rate (configurable "catch-up rate"), but respect the destination's rate limit. Apply a priority ordering: more recent events first if ordering doesn't matter to the destination. Alert the operator on estimated catch-up time.

#### Deep Dive D: Privacy and Erasure

**Opening question**: "A user submits a GDPR erasure request. Walk me through what happens."

**Strong answer path**:
1. Locate profile by identifier → mark profile as `erasure_requested` in fast-path lookup (immediately blocks future event processing for this profile)
2. Delete from live stores: profile document, identity graph nodes, audience membership cache, pending delivery queues
3. Handle immutable event log: crypto-shredding (delete profile-specific encryption key) → all events become unreadable without the key
4. For data warehouse exports: issue deletion SQL or suppression list
5. For backup/archive tiers: mark for overwrite at next archive rotation
6. Issue cryptographically signed erasure certificate within 30 days

**Probing follow-up**: "What if a new event arrives for this user after the erasure request but before the profile is fully deleted?"
Strong answer: The fast-path erasure flag (set in stage 1) is checked at event processing. Events for a profile with an erasure flag are dropped and logged in the audit trail. This prevents any new data from being associated with the profile during the deletion window.

---

### Phase 4: Extensions and Trade-offs (38–45 min)

**Common extension questions**:

1. **"How would you design the warehouse-native (composable) variant?"**
   Answer: Instead of the CDP maintaining its own event and profile stores, use the customer's existing data warehouse. The CDP SDK still collects events but writes them directly to the warehouse (via streaming connector). The CDP reads unified profiles via SQL queries against warehouse tables. Audience definitions are executed as SQL in the warehouse. Activation (destination delivery) still handled by CDP fan-out layer. Trade-off: lower cost, but latency is higher (warehouse query latency vs. profile store read latency), and real-time < 1s segments are harder.

2. **"How would you handle B2B use cases with account hierarchies?"**
   Answer: The identity model extends to a three-tier hierarchy: individual profiles → account (group) profiles → parent account profiles. Events carry a `group_id` in addition to `user_id`. Group profiles aggregate computed traits from all member profiles. Audience segmentation can target at the account level (e.g., "accounts where at least 3 users viewed pricing page in last 7 days").

3. **"How would you support real-time personalization at the edge?"**
   Answer: Deploy a lightweight profile cache at the CDN edge with hot profiles pre-populated (top 1% of profiles that generated activity in the last 24h). The Profile Lookup API can be served from the edge cache with < 10ms latency. Cache invalidation is event-driven: profile update events trigger edge cache eviction. For the 99% of profiles not in the edge cache, the central profile lookup API serves requests at < 50ms.

---

## Trap Questions and Common Mistakes

### Trap 1: "Just use a users table and events table in Postgres"

**Weak answer**: "I'd have a users table with a primary key on email, and an events table with a foreign key to users."

**Why it fails**: No identity resolution for anonymous users. No handling of users with multiple devices. No concept of probabilistic matching. Doesn't scale beyond millions of users.

**Strong answer**: Acknowledges the need for an identity graph to handle anonymous-to-authenticated stitching and cross-device identity. Explains why a simple foreign key relationship doesn't model the "same person, multiple identities" problem.

---

### Trap 2: Synchronous Fan-out to Destinations

**Weak answer**: "When an event arrives, I'll synchronously call each destination's API before returning 200 to the SDK."

**Why it fails**: Ties ingest latency to the slowest destination. A single slow destination blocks all events for that user. A destination outage causes ingest failures.

**Strong answer**: Ingest is fire-and-forget. Events are enqueued synchronously; all downstream processing (including destination delivery) is asynchronous. Destinations are decoupled from ingest entirely.

---

### Trap 3: Ignoring Consent at the Architecture Level

**Weak answer**: "We'd add an `opted_in` flag on the user record."

**Why it fails**: A single boolean doesn't model purpose-based consent (marketing vs. analytics vs. personalization). Doesn't explain how consent gates destination delivery. Doesn't address erasure.

**Strong answer**: Consent is a multi-purpose, multi-jurisdiction data model. It is checked at three points: event ingestion, profile enrichment, and destination delivery. Erasure is a pipeline, not a delete statement.

---

### Trap 4: Pure Streaming or Pure Batch for Segments

**Weak answer**: "I'd run a SQL query every night to compute all audience memberships."

**Why it fails**: 24-hour stale membership prevents real-time personalization. Doesn't scale to 1B profiles × 50K segments.

Alternative weak answer: "I'd evaluate every segment against every event in real-time."

**Why it also fails**: Evaluating 50,000 segments per event at 2M events/sec = 100B evaluations/sec. Infeasible without the inverted index optimization and dual-path routing.

**Strong answer**: Dual-path evaluation. Streaming path with inverted index for simple rules. Batch path with incremental dirty-profile evaluation for complex rules. Explain the segment compilation logic that routes to the right path.

---

## Scoring Rubric

| Dimension | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|---|---|---|---|
| **Problem framing** | Jumps to solution without clarifying scale/requirements | Asks basic scale questions | Identifies core tensions (real-time vs. batch, correctness vs. latency, privacy vs. data utility) |
| **Identity resolution** | Simple email match or ignores anon users | Mentions identity graph concept | Full identity graph design with merge/split, distributed lock, survivorship rules, probabilistic confidence |
| **Segment evaluation** | Nightly batch SQL only | Mentions streaming + batch | Dual-path with inverted index, dirty-profile incremental batch, streaming AST compilation |
| **Destination delivery** | Synchronous HTTP calls | Async queue with retries | Per-destination isolation, circuit breaker, backpressure, idempotent delivery |
| **Privacy / compliance** | Single opted-in flag | Mentions GDPR/consent model | Purpose-based consent as architectural invariant; erasure pipeline across all storage tiers; crypto-shredding |
| **Scalability reasoning** | "We can add more servers" | Identifies correct partitioning keys | Explicit sharding strategies per component; load shedding; multi-region isolation |
| **Trade-off articulation** | Defends single approach as "obviously correct" | Mentions alternatives | Proactively compares options with concrete trade-offs (e.g., composable vs. packaged CDP) |

---

## Common Interviewer Follow-up Questions

- "How does a merge affect in-flight destination deliveries that reference the old profile ID?"
- "How do you prevent a workspace with 100M events/day from starving other workspaces on shared infrastructure?"
- "If the identity graph goes down, what degrades and what stays available?"
- "How would you implement the 'do not sell' CCPA opt-out, and how is it different from GDPR erasure?"
- "Walk me through the data flow for a reverse ETL operation — warehouse computed trait back to a profile."
- "How do you handle a schema-breaking change when 50 downstream destinations depend on the current schema?"
