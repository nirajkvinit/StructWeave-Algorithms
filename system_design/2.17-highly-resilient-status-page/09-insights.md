# Key Insights: Highly Resilient Status Page

## Insight 1: Independence Architecture -- The Status Page Cannot Share Failure Domains

**Category:** Resilience
**One-liner:** The status page must remain operational when the entire primary infrastructure it monitors is completely down, requiring separate cloud providers, CDNs, DNS, and databases.

**Why it matters:** A status page that goes down alongside the service it reports on is worse than useless -- it leaves users with zero information during the most critical moments. This is not a theoretical concern: when AWS had a major outage, their own status page (hosted on AWS) was also unreachable. Independence architecture means: different DNS provider, different CDN provider, different cloud provider, different database infrastructure. Every shared dependency is a correlated failure mode. This constraint fundamentally shapes every design decision, from data synchronization (CRDTs over strong consistency because you cannot depend on a central coordinator) to notification delivery (multi-provider because any single provider might share infrastructure).

---

## Insight 2: CRDTs Make Multi-Region Writes Conflict-Free

**Category:** Consistency
**One-liner:** OR-Set for incident updates and LWW-Register for status fields allow concurrent writes from multiple regions without coordination, preserving every update without data loss.

**Why it matters:** During an incident, operators in different time zones and automated monitoring systems in different regions may update the same incident simultaneously. Traditional strong consistency requires cross-region coordination, which adds latency and creates a dependency on network connectivity between regions -- exactly the thing that might be broken during a major incident. CRDTs solve this mathematically: the OR-Set guarantees that all incident updates are preserved (add-wins semantics), while the LWW-Register with Hybrid Logical Clocks deterministically resolves concurrent status changes. The merge operation is commutative, associative, and idempotent, meaning replicas converge to the same state regardless of the order messages arrive. This trades the simplicity of strong consistency for the availability guarantee that the system keeps accepting writes even during network partitions.

---

## Insight 3: Four-Tier Edge Rendering for Graceful Degradation

**Category:** Resilience
**One-liner:** Pre-deploy four rendering tiers (Edge KV, origin API, stale CDN cache, static fallback HTML) so the status page degrades gracefully through each failure level instead of going dark.

**Why it matters:** Most systems have two states: working or broken. The four-tier rendering model creates a spectrum of degradation. Tier 1 (Edge KV) delivers dynamic, real-time data in <50ms. If Edge KV fails, Tier 2 fetches from the origin API with slightly stale data. If the origin is down, Tier 3 serves stale-while-revalidate content from the CDN cache. If the cache is expired, Tier 4 serves a pre-deployed static HTML page with a generic "we're investigating" message. The critical insight is that Tier 4 costs nothing and is always available because it is a static file deployed to CDN origins. The X-Render-Tier header in the response lets operators monitor which tier is active, turning degradation from an invisible failure into an observable metric.

---

## Insight 4: DNS-Based CDN Failover with the 25-85 Second Window

**Category:** Resilience
**One-liner:** DNS health checks detect CDN provider failures in 20 seconds, but client-side DNS TTL caching adds 0-60 seconds of delay, creating a 25-85 second failover window.

**Why it matters:** Multi-CDN failover via DNS is the standard approach, but the failover timing is constrained by physics: 10-second health check interval, 2 consecutive failures for threshold, 5 seconds for DNS propagation, and then 0-60 seconds waiting for client DNS caches to expire. This 25-85 second window is irreducible without changing the approach entirely. Anycast + BGP failover reduces this to 1-5 seconds (BGP reconvergence time) but requires ASN ownership and is operationally complex. For most organizations, the DNS approach with aggressive TTLs (60 seconds) is the pragmatic choice. The key design implication: the CDN cache itself must survive the failover window by serving stale content, so the real impact on users is the stale-while-revalidate duration, not the failover duration.

---

## Insight 5: Request Coalescing Turns a Million Requests into One

**Category:** Caching
**One-liner:** CDN request coalescing collapses 1000 simultaneous cache-miss requests into a single origin fetch, preventing cache stampedes during major incidents.

**Why it matters:** When a major incident occurs, traffic can spike 100-1000x. If the CDN cache TTL expires during this spike, all concurrent requests become cache misses and hammer the origin simultaneously -- a cache stampede. Request coalescing (also called request collapsing or origin shielding) ensures that when the CDN detects multiple concurrent requests for the same resource, it sends exactly one to the origin and serves the response to all waiting clients. Combined with stale-while-revalidate (serve stale content while fetching fresh in the background) and stale-if-error (serve stale content for up to 5 minutes if origin is down), this creates a cache strategy that absorbs traffic spikes without any origin impact. The configuration is deceptively simple: `Cache-Control: public, max-age=10, stale-while-revalidate=60, stale-if-error=300`.

---

## Insight 6: Notification Fanout with Pre-Sharded Queues and Priority Lanes

**Category:** Scaling
**One-liner:** Shard notification queues by subscriber hash (100 shards) with a separate priority lane for critical incidents, ensuring million-subscriber fanout completes within SLA.

**Why it matters:** A major incident affecting a status page with 1 million subscribers triggers a fanout from one event to 1 million notification tasks. A single queue becomes a bottleneck: enqueue time grows linearly, and a single consumer pool cannot drain fast enough. Pre-sharding the queue by subscriber_id hash distributes both enqueue and dequeue load across 100 independent shards, each with its own consumer pool. The priority lane ensures that critical incidents (service completely down) are delivered before degraded-performance notifications. Rate limiting per channel (1000 emails/sec, 100 SMS/sec) prevents provider throttling, and exponential backoff retry schedules (30s, 60s, 120s, 240s for webhooks) handle transient failures without overwhelming downstream providers.

---

## Insight 7: Deduplication Key Prevents Duplicate Incidents from Multiple Monitors

**Category:** Atomicity
**One-liner:** A database-level unique constraint on (status_page_id, dedup_key) combined with INSERT ON CONFLICT upsert ensures that multiple monitoring systems detecting the same issue create exactly one incident.

**Why it matters:** Status pages often have multiple monitoring sources: internal health checks, third-party monitoring services, automated alerts, and manual operator reports. When a real outage occurs, all of these fire simultaneously, potentially creating duplicate incidents. The deduplication key (e.g., "alert-123") combined with a Postgres unique index and ON CONFLICT upsert handles this at the database level, making it immune to application-level race conditions. The RETURNING clause with `(xmax = 0) AS inserted` tells the caller whether a new incident was created or an existing one was matched, enabling proper event routing without a second query.

---

## Insight 8: SSE at the Edge, Not the Origin

**Category:** Edge Computing
**One-liner:** Terminate Server-Sent Events connections at edge workers and use Pub/Sub to fan out updates, so the origin handles one message per update regardless of viewer count.

**Why it matters:** During a major incident, hundreds of thousands of users keep the status page open, each maintaining an SSE connection for real-time updates. If these connections terminate at the origin, 100K SSE connections consume massive server resources (memory, file descriptors, CPU for heartbeats). By terminating SSE at edge workers that subscribe to a Pub/Sub channel, the origin publishes one message per status update, and the edge fan-out happens at each PoP independently. Connection limits per edge location (100K per page) and per IP (10 to prevent abuse) provide protection, with a graceful fallback to polling when limits are reached. This transforms the real-time update problem from an O(N) origin problem to an O(1) origin + distributed O(N/PoPs) edge problem.

---

## Insight 9: Database Read Path with 99.9% Edge Cache Hit Rate

**Category:** Caching
**One-liner:** A four-level cache hierarchy (Edge KV, app cache, read replica, primary) ensures that 95% of reads never leave the edge and 99.9% never reach the primary database.

**Why it matters:** During an incident spike, database queries are the most likely bottleneck. The cache hierarchy is designed so that the most expensive resources are hit least frequently: Edge KV handles 95% of reads in <1ms, the application cache handles 4% in <5ms, read replicas handle 0.9% in <20ms, and the primary handles only 0.1% (writes). The write path flows in reverse: write to primary, replicate async to read replicas (<100ms), push to app cache, push to Edge KV. This means status updates propagate globally in under a second while reads are served from the nearest edge location. The asymmetry is deliberate: reads vastly outnumber writes (1000:1), so optimizing the read path at the expense of write complexity is the correct trade-off.

---

## Insight 10: Idempotent Subscriber Confirmation Prevents Race Conditions

**Category:** Atomicity
**One-liner:** The confirmation query updates only where `confirmed = false`, making double-clicks on confirmation links naturally idempotent without any locking.

**Why it matters:** This is a small but elegant example of using database semantics to eliminate race conditions. When a user rapidly clicks a confirmation link twice, both requests arrive concurrently. Instead of checking-then-updating (which requires a lock), the query `UPDATE subscribers SET confirmed = true WHERE confirmation_token = ? AND confirmed = false` atomically handles both cases: the first request sets confirmed = true and returns rows_affected = 1, the second request finds confirmed = true and returns rows_affected = 0. No lock, no retry, no application-level coordination. This pattern -- encoding the precondition into the WHERE clause -- applies to any idempotent state transition.

---
