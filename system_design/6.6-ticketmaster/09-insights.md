# Key Insights: Ticketmaster

## Insight 1: Redis SETNX as the Contention Absorber

**Category:** Contention
**One-liner:** Move the contention hot spot from a disk-based database to an in-memory store using atomic SETNX with TTL.

**Why it matters:** At 100K+ concurrent attempts on a single seat, database-level locking (optimistic or pessimistic) collapses. Optimistic locking's retry rate exceeds 99%, effectively making the system useless. Pessimistic locking queues threads, causing cascading timeouts. Redis SETNX resolves contention in <1ms with a binary outcome -- one winner, everyone else gets an instant rejection. No blocking, no retries, no queuing. The database only gets written to after payment succeeds, when contention has already been resolved. This two-tier pattern (Redis for contention, DB for durability) is the foundational architecture for any high-contention booking system.

---

## Insight 2: Virtual Waiting Room with Leaky Bucket Admission

**Category:** Traffic Shaping
**One-liner:** Use a CDN-served static waiting room + leaky bucket controller to transform a thundering herd into a manageable, fair stream.

**Why it matters:** When 14M users try to access a booking page simultaneously, no backend can survive -- nor should it try. The virtual waiting room solves three problems at once: (1) the static HTML page on CDN costs zero origin compute regardless of how many users are waiting, (2) randomized positions during the join window prevent bots from winning through speed, and (3) the leaky bucket controls admission at a rate the booking system can actually handle (e.g., 2,000 concurrent users). This pattern -- absorbing the thundering herd at the edge and metering flow into the origin -- applies broadly to any flash-sale, launch-day, or registration system.

---

## Insight 3: The Taylor Swift Lesson -- Reject with Intent

**Category:** Resilience
**One-liner:** Every error response must tell the client whether to retry, and the system must have hard caps to prevent unbounded growth.

**Why it matters:** During the Eras Tour meltdown (3.5B requests, 14M users), the system failed to reject new requests once capacity was exceeded. Users who got errors kept retrying, multiplying request volume exponentially -- a death spiral called "retry hell." The fix is deceptively simple: every response includes `retry: false` when the system is saturated, and hard caps on queue size prevent unbounded growth. This is a universal distributed systems principle -- a system that fails to shed load gracefully will amplify its own failure. Graceful degradation ladders (normal -> reduced features -> best-available only -> pause queue -> static page) are essential.

---

## Insight 4: All-or-Nothing Multi-Seat Holds

**Category:** Atomicity
**One-liner:** Multi-seat bookings must be all-or-nothing -- partial holds create orphaned inventory that's held but unbookable.

**Why it matters:** When a user selects 4 seats together, acquiring 3 and failing on the 4th leaves 3 seats held by a user who can't complete the booking (they wanted 4 together). These seats are locked for the full TTL duration, wasting prime inventory during the highest-demand window. The solution uses a Redis pipeline to attempt all SETNXs atomically, checks all results, and rolls back any successful holds if any single one failed. The rollback uses a Lua script for atomic compare-and-delete (only delete if we own the key). This all-or-nothing pattern applies to any system where resources must be reserved as a group.

---

## Insight 5: Idempotent Payments with Outbox Pattern

**Category:** Distributed Transactions
**One-liner:** The gap between "payment charged" and "seat marked as sold" is the most dangerous window in the system -- bridge it with idempotent payments + transactional outbox.

**Why it matters:** If the app crashes after the payment gateway charges the customer but before the seat state transitions from HELD to SOLD, you have a charged customer without tickets. The payment gateway's idempotency key (using order_id) ensures safe retries without double-charging. The transactional outbox pattern writes the ORDER_CONFIRMED event to an outbox table in the same database transaction as the order status update, guaranteeing that a reconciliation worker will eventually complete any orphaned payments. This pattern is critical in any system where an external side-effect (payment, email, API call) must be coupled with a local state change.

---

## Insight 6: Finite, Non-Fungible Inventory Changes Everything

**Category:** System Modeling
**One-liner:** Unlike most systems where you can "add more servers" or "add more inventory," each seat is unique and the supply is fixed -- this fundamentally constrains the architecture.

**Why it matters:** In e-commerce, if demand exceeds supply, you can restock. In cloud services, you can provision more. In ticketing, Section 101 Row A Seat 5 is physically different from Seat 6, and there's exactly one of each. This non-fungibility means: (1) you can't shard inventory by "any available" -- users want specific seats, creating hot keys, (2) the "best available" algorithm exists specifically to distribute contention when specific selection becomes a bottleneck, (3) "sold out" is a hard boundary, not a scaling problem. Any system with finite, non-fungible resources (hotel rooms, appointment slots, domain names) shares these constraints.

---

## Insight 7: Pre-Scaling for Known Spikes

**Category:** Scaling
**One-liner:** When you know exactly when the thundering herd arrives (published on-sale time), pre-scale proactively instead of relying on reactive auto-scaling.

**Why it matters:** Reactive auto-scaling has a fatal flaw for ticketing: by the time metrics trigger scaling (30-60 seconds), the spike has already crashed the system. Ticketmaster knows on-sale times days in advance. Pre-scaling 60 minutes before (Redis nodes, app servers, WebSocket gateways) + cache warming (seat maps, pricing, CDN edges) 30 minutes before transforms an unpredictable spike into a planned capacity expansion. This pattern applies to any system with predictable spikes: Black Friday sales, game launches, exam result announcements, live sports events.

---

## Insight 8: Edge-Side Token Validation

**Category:** Edge Computing
**One-liner:** Validate queue access tokens at the CDN edge (not the origin) so that bot traffic and invalid requests never reach your backend.

**Why it matters:** During a mega on-sale, the vast majority of requests are either bots or users with expired/invalid tokens. If every request hits the origin for validation, the backend drowns in auth checks. By deploying a lightweight JWT validation function at the CDN edge (verifying signature + expiry + event_id), invalid requests are rejected in <1ms at the edge with zero origin cost. The origin only sees requests from legitimately admitted users. This is a specific application of the broader principle: push validation and rejection as close to the client as possible.

---

## Insight 9: Seat State Bitmaps for O(1) Availability

**Category:** Data Structures
**One-liner:** Represent seat availability as a bitmap (1 bit per seat) in Redis for O(1) single-seat checks and O(N/8) memory for entire sections.

**Why it matters:** An 80,000-seat stadium represented as individual Redis keys would require 80K separate GET operations to render a seat map. A bitmap per section (e.g., 500 seats = 63 bytes) allows: (1) GETBIT for O(1) individual seat availability, (2) BITCOUNT for instant section-level availability counts, (3) entire venue availability in a single bulk read of ~160 bitmaps. This reduces seat map rendering from thousands of Redis operations to dozens, and memory from megabytes to kilobytes. Bitmaps are an underused data structure for any boolean-state-per-entity scenario at scale.

---

## Insight 10: Bulkhead Isolation for On-Sale vs. Browsing

**Category:** Resilience
**One-liner:** Isolate on-sale booking traffic into dedicated resource pools so that a mega on-sale never starves normal event browsing or admin operations.

**Why it matters:** Without bulkheads, a Taylor Swift on-sale consuming all database connections means nobody can even browse other events or manage upcoming shows. By dedicating separate connection pools, Redis clusters, and thread pools to on-sale traffic vs. general browsing vs. admin operations, a spike in one lane cannot consume resources from another. The leaky bucket queue naturally limits how many users enter the booking pool, making the resource requirements predictable. This is the bulkhead pattern from ship design -- a hull breach in one compartment doesn't sink the entire ship.

---

## Insight 11: Payment Gateway as the True Bottleneck

**Category:** External Dependencies
**One-liner:** The external payment gateway (100-500 TPS limit) is the real throughput ceiling during checkout, not your own infrastructure.

**Why it matters:** You can scale Redis to millions of ops/sec, but if your payment gateway allows only 300 TPS, that's your maximum checkout throughput. During the Eras Tour, cascading payment timeouts amplified the meltdown. Mitigations: (1) multi-gateway routing distributes load across 3-4 providers, (2) circuit breakers per gateway fail-fast and reroute, (3) the queue's drain rate should be calibrated to total payment gateway capacity, not internal system capacity. This is a general principle: identify external dependencies on the critical path and design your throughput around their limits, not yours.
