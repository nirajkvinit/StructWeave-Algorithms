# Interview Guide

## 1. Interview Pacing (45-min Format)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| 0-5 min | **Clarify** | Scope the problem; ask questions | Confirm: are we designing the full platform or just the on-sale booking flow? |
| 5-12 min | **High-Level** | Core components, data flow | Draw the queue → inventory → booking → payment pipeline |
| 12-25 min | **Deep Dive** | Seat contention + virtual queue | This is where 60% of the points are -- nail the Redis SETNX pattern and leaky bucket |
| 25-35 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios | Discuss the Taylor Swift problem, payment cascade, graceful degradation |
| 35-42 min | **Extensions** | Bot detection, dynamic pricing, resale | Show breadth; mention security and compliance |
| 42-45 min | **Wrap Up** | Summary, handle follow-ups | Revisit trade-offs; mention what you'd do differently at 10x scale |

## 2. Meta-Commentary

### What Makes This System Unique/Challenging

1. **It's not a classic booking system** -- the defining challenge isn't CRUD, it's extreme write contention on finite, non-fungible inventory under massive spike loads
2. **Fairness is a first-class requirement** -- unlike e-commerce where first-come-first-served at the API level is fine, ticketing requires visible, equitable queuing
3. **The traffic pattern is adversarial** -- not just high load but also bots actively trying to subvert the system
4. **Inventory is truly finite** -- unlike most systems where you can "add more servers", there are exactly N seats and each is unique

### Where to Spend Most Time

| Component | % of Interview | Why |
|-----------|----------------|-----|
| **Seat contention (Redis SETNX)** | 30% | This is THE core problem -- demonstrate you understand distributed locking under contention |
| **Virtual queue (leaky bucket)** | 20% | This is what differentiates Ticketmaster from a basic booking system |
| **Checkout atomicity (hold → payment → sold)** | 15% | Shows understanding of distributed transactions and failure recovery |
| **Scaling for spikes** | 15% | The 1000x spike problem; pre-scaling, CDN, graceful degradation |
| **Architecture overview** | 10% | Quick walkthrough to set context |
| **Extensions (bots, pricing)** | 10% | Shows breadth |

### How to Approach This Problem

1. **Start with the constraint**: "The defining challenge is that millions of users compete for thousands of unique seats simultaneously. This is a distributed locking problem with extreme contention."

2. **Separate the hot path from the cold path**: On-sale booking (hot, Redis-backed) vs. event management (cold, DB-backed). Don't waste time on CRUD.

3. **Work backwards from the invariant**: "A seat must never be double-sold" → strong consistency for seat state → Redis SETNX with TTL → all-or-nothing holds.

4. **Address the thundering herd early**: "14M users can't all hit the booking page. We need a queue." → leaky bucket → protected zone capacity.

---

## 3. Trade-offs Discussion

### Trade-off 1: Optimistic vs. Pessimistic Locking for Seats

| Aspect | Optimistic (Version-based CAS) | Pessimistic (Redis SETNX) |
|--------|-------------------------------|---------------------------|
| **How** | Read seat, attempt UPDATE with WHERE version = N | SETNX key with TTL |
| **Pros** | No separate lock store; works with any SQL DB | Sub-ms latency; handles extreme contention; auto-release via TTL |
| **Cons** | High contention → most transactions abort → "retry storm" | Requires Redis; adds infrastructure; ephemeral (data can be lost) |
| **Best for** | Low-to-medium contention (hotel booking) | Extreme contention (concert tickets) |
| **Recommendation** | **Use Redis SETNX** -- at 100K+ concurrent attempts on popular seats, OCC's retry rate would exceed 99%, making it effectively useless |

### Trade-off 2: WebSocket vs. Long-Polling for Queue Updates

| Aspect | WebSocket | Long-Polling |
|--------|-----------|--------------|
| **Pros** | Real-time updates; lower total request count; bidirectional | Simpler infrastructure; works through all proxies; stateless |
| **Cons** | Stateful connections; 100K connections per server; complex failover | Higher latency (seconds); more HTTP overhead; CDN-unfriendly |
| **Recommendation** | **WebSocket primary with long-polling fallback** -- WebSocket for the interactive on-sale experience; degrade to long-polling if WS infrastructure is overwhelmed |

### Trade-off 3: Specific Seat Selection vs. Best Available

| Aspect | Specific Seat Selection | Best Available |
|--------|------------------------|----------------|
| **Pros** | Better user experience; users get exactly what they want | Distributes contention; reduces hot keys; faster checkout |
| **Cons** | Hot key problem (everyone wants front row center); more SETNX failures | Users can't pick exact seat; may feel unfair |
| **Recommendation** | **Offer both** -- specific selection for normal events; auto-switch to "best available" when contention exceeds threshold (adaptive) |

### Trade-off 4: Strong Consistency Everywhere vs. Eventual for Reads

| Aspect | Strong Consistency | Eventual for Seat Map Reads |
|--------|-------------------|----------------------------|
| **Pros** | Seat map always accurate; no "phantom availability" | 10x higher read throughput; Redis replicas absorb load |
| **Cons** | Single Redis primary bottleneck for reads | Users might select a just-held seat (gets rejected at SETNX) |
| **Recommendation** | **Eventual consistency for reads, strong for writes** -- seat map can be ~1s stale; the SETNX write is always strongly consistent. Brief "someone just grabbed that seat" errors are acceptable UX |

### Trade-off 5: Hold Duration (Short vs. Long TTL)

| Aspect | Short TTL (2-3 min) | Long TTL (10-15 min) |
|--------|---------------------|----------------------|
| **Pros** | Faster seat recycling; less inventory locked | Users have time to enter payment details calmly |
| **Cons** | Payment processor latency (3-5s) eats into time; user stress | Popular seats locked for long periods; fewer fans get a chance |
| **Recommendation** | **10 minutes** -- accounts for payment latency, card entry, and accessibility needs. For mega events, reduce to 7 min to improve throughput. ADA users get extended holds |

---

## 4. Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just use a database for seat holds?" | Understand why Redis is needed | "At 100K+ SETNX/sec, a database would either: (1) use row locks that queue threads and cause timeouts, or (2) use OCC that fails >99% of transactions. Redis gives sub-ms atomic holds with TTL auto-release. The database is the source of truth for confirmed sales, but Redis absorbs the contention." |
| "What if Redis goes down during an on-sale?" | Test failure thinking | "Redis holds are ephemeral by design. If Redis primary fails: (1) Sentinel promotes replica in <30s, (2) any lost holds simply mean those seats become available again -- nobody is charged without a hold, (3) checkout verification against DB prevents double-selling. The worst case is temporary 'try again' errors, not data loss." |
| "How do you prevent double-selling?" | Core invariant understanding | "Three layers: (1) Redis SETNX is atomic -- only one user can hold a seat, (2) checkout verifies the hold still exists before charging, (3) DB has a unique constraint on (event_id, seat_id, status=SOLD). Even if Redis has a bug, the DB constraint is the ultimate safety net." |
| "What happens when 14M users all join the queue?" | Scale thinking | "The queue join page is a static HTML page on CDN -- costs zero origin compute. The only dynamic operation is inserting a queue entry (one write per user). With a NoSQL store (DynamoDB-style), that's well within capacity. The leaky bucket then controls flow into the booking page at a manageable rate (e.g., 2000 concurrent users)." |
| "Why not just use first-come-first-served without a queue?" | Fairness understanding | "Without a queue, bots win every time -- they're faster than any human. The waiting room equalizes access: (1) randomized positions during the join window prevent speed-based advantage, (2) bot detection screens during the wait, (3) controlled admission prevents system overload. Without it, the Eras Tour crash repeats every time." |
| "Can you make this system globally distributed (active-active)?" | Understand consistency limits | "For event browsing, yes -- read replicas in every region. But for seat inventory, active-active across regions means distributed consensus for every SETNX, adding 50-200ms cross-region latency to a sub-ms operation. Since all seats for one event are at one venue, there's no geographic need for active-active inventory. We use active-passive: primary region handles all booking writes." |
| "How would you handle 100x scale?" | Forward thinking beyond 'more servers' | "At 100x: (1) partition events across dedicated clusters -- each mega event gets its own Redis cluster + app server pool (event-level isolation), (2) move queue to edge -- CDN workers validate tokens without hitting origin, (3) pre-compute best-available seat assignments instead of user-selected seats, (4) implement lottery for extreme demand instead of FIFO queue." |

---

## 5. Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| **Using DB transactions for seat holds** | Queue times at 100K+ concurrency; timeouts cascade | Redis SETNX with TTL for holds; DB only for confirmed sales |
| **Polling for queue position** | 14M users x 1 req/sec = 14M QPS of useless reads | WebSocket push for position updates |
| **No hold expiry mechanism** | Abandoned carts lock seats forever | TTL on Redis keys; auto-release worker |
| **Designing for average load** | System works at 12K QPS but fails at 2M QPS | Design for spike; use virtual queue to smooth demand |
| **Ignoring bot traffic** | Bots can be 50%+ of traffic during on-sales | Multi-layer bot detection as a core design component |
| **Single payment gateway** | Creates single point of failure during peak | Multi-gateway with circuit breakers |
| **Ignoring the hold-to-sold transition** | Crash between payment and confirmation = charged but no ticket | Idempotent payments + outbox pattern + reconciliation |
| **Treating this as a CRUD problem** | Missing the core challenge (contention) | Lead with "this is a distributed locking problem" |

---

## 6. Questions to Ask the Interviewer

| Question | Purpose |
|----------|---------|
| "What's the expected scale? A single-venue on-sale or a global platform?" | Scope: simple booking vs. full Ticketmaster |
| "Are we focusing on the on-sale booking flow or the full platform (search, management, etc.)?" | Avoid wasting time on CRUD |
| "What level of contention? A 500-seat theater or an 80,000-seat stadium?" | Determines if Redis is needed or if DB locking suffices |
| "Is fairness (queueing) a requirement, or is first-come-first-served acceptable?" | Determines if virtual queue is in scope |
| "Do we need to handle bot traffic, or can we assume all traffic is legitimate?" | Determines if bot detection is in scope |
| "Do we need resale/transfer functionality?" | Secondary marketplace significantly changes the design |

---

## 7. Quick Reference Card

### The 3 Core Problems

```
1. CONTENTION  → Redis SETNX with TTL (all-or-nothing holds)
2. FAIRNESS    → Virtual queue with leaky bucket admission control
3. ATOMICITY   → Idempotent payment + outbox pattern (hold → paid → sold)
```

### The 5-Sentence Summary

> We use a **virtual waiting room** served from CDN to absorb the thundering herd and fairly order users via a leaky bucket. When a user enters the protected zone, they see a **real-time seat map** backed by Redis bitmaps. Seat holds use **Redis SETNX with 10-min TTL** for atomic, contention-free locking that auto-releases. Checkout uses **idempotent payments with an outbox pattern** to ensure atomicity between payment and seat state transition. The system **pre-scales** based on known on-sale times and uses **multi-layer bot detection** to ensure fairness.

### Key Numbers to Remember

| Metric | Value |
|--------|-------|
| Redis SETNX latency | <1ms |
| Seat hold TTL | 10 min (600s) |
| Protected zone capacity | ~2,000 concurrent users |
| Leaky bucket drain rate | ~50 users/sec |
| Payment gateway roundtrip | 3-5 seconds |
| Eras Tour peak requests | 3.5 billion |
| Monthly bot attempts blocked | 8.7 billion |
| Traffic spike factor | 1000x baseline |

---

## 8. Extension Topics (If Time Permits)

### Extension 1: Lottery System for Extreme Demand

When demand exceeds capacity by 100x+ (e.g., 14M fans for 80K seats), even a queue doesn't make sense -- users would wait 40+ hours. Alternative: **lottery**.

```
Flow:
1. Registration window opens (48 hours)
2. All registered fans entered into lottery
3. At deadline, randomly select N winners (e.g., 200K for 80K seats)
4. Winners get exclusive booking window (staggered by random order)
5. Unsold seats released to general sale
```

### Extension 2: Pod Seating

Sell seats in groups ("pods") to maintain integrity:

```
Pod: [A1, A2, A3, A4] - must be purchased together
If user wants 2 seats: must buy full pod of 4
Prevents: A1 and A4 sold to different people, leaving A2-A3 unusable
```

### Extension 3: Rotating Barcodes

```
Barcode changes every 15 seconds, making screenshots useless:
- Barcode = TOTP(ticket_secret, floor(time/15))
- Gate scanner verifies against server-generated current barcode
- Offline fallback: generate next 5 barcodes client-side
```

### Extension 4: Transfer & Resale

```
Transfer: Original ticket invalidated, new ticket issued to recipient
Resale: Listed on marketplace → buyer pays → original ticket invalidated →
        new ticket issued → original seller paid (minus platform fee)
Price cap: Resale price <= 120% of face value (platform-enforced)
```
