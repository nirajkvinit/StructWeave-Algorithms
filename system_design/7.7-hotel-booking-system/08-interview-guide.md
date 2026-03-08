# Interview Guide

## 45-Minute Pacing

### Minutes 0-5: Clarify Scope

**Key clarifying questions to ask (or expect):**

| Question | Why It Matters |
|----------|---------------|
| "Are we designing an OTA like Booking.com, or a single hotel's reservation system?" | OTA manages millions of properties with channel distribution; single-hotel is simpler but deeper on operations |
| "Should we support both search and booking, or focus on one?" | For 45 min, scope to search + booking; mention but don't deeply design reviews, extranet, loyalty |
| "Do we need to handle overbooking?" | Overbooking adds significant complexity (statistical models, walk policies); important differentiator from generic e-commerce |
| "How many properties and bookings per day?" | Drives sharding, caching, and consistency decisions |
| "Do we need multi-channel distribution (channel managers)?" | Channel sync adds real-time consistency challenges across external systems |

**Recommended scope for 45 minutes:**
- OTA-style platform (Booking.com-like) with millions of properties
- Search with filters + booking with payment + availability management
- Discuss but do not fully design: reviews, extranet, loyalty, channel sync
- Focus deep dive on: availability race conditions and overbooking

---

### Minutes 5-15: High-Level Architecture

Draw the architecture with these components:
1. **Client layer** → API Gateway → BFF
2. **Search path**: Search & Discovery → search index (geo + filters) → Availability Service → Rate Service
3. **Booking path**: Booking Orchestrator → Availability Service (hold) → Payment Service → confirmation
4. **Data stores**: PostgreSQL (reservations), Availability Store (sharded, room-date matrix), Redis (cache, holds), Search Index, Event Bus
5. **Channel Manager**: subscribes to availability events, pushes to external OTA channels

**Key points to make:**

- "Unlike flight booking, WE own the inventory. The platform is the authoritative system for room availability. This means we must solve consistency and race conditions directly---there is no external GDS to delegate to."
- "Availability is a calendar matrix: property × room_type × date → available_count. A 3-night booking must atomically decrement 3 rows."
- "The search-to-book ratio is ~50:1, so we optimize heavily for search performance with search indexes and caching."
- "The booking flow is a saga: hold inventory → pre-authorize payment → confirm → capture."

---

### Minutes 15-30: Deep Dive — Availability & Overbooking

This is where you differentiate. Focus on:

**1. Availability as a Calendar Matrix**
- Data model: `RoomDateInventory(property_id, room_type_id, date, total_inventory, booked_count, held_count, overbooking_limit)`
- Sellable count: `total_inventory + overbooking_limit - booked_count - held_count`
- Multi-date atomicity: a 3-night stay must check AND decrement all 3 dates in one transaction
- Sharded by `property_id` so concurrent bookings for different hotels never contend

**2. Last-Room Race Condition**
- Two users see "1 room left" from search (cached/eventual consistency)
- Both click "Book" simultaneously
- Resolution: atomic conditional update in the database

```
UPDATE room_date_inventory
SET held_count = held_count + 1, version = version + 1
WHERE property_id = ? AND room_type_id = ? AND date = ?
  AND (total_inventory + overbooking_limit - booked_count - held_count) > 0
```

- The WHERE clause is the guard: first update wins; second fails because sellable = 0
- No distributed locks needed---the database's row-level locking is sufficient
- For multi-night stays: use SERIALIZABLE isolation to prevent phantoms across dates

**3. Overbooking Strategy**
- Hotels intentionally sell beyond physical capacity (5-10% typically)
- Based on historical no-show rates (5-8%) and late cancellation rates (3-5%)
- Walk policy when overbooked: lowest-tier guest relocated to partner hotel, compensated
- The system manages overbooking tolerance per property via configurable `overbooking_pct`

**4. Soft Hold with TTL**
- 10-minute hold on inventory during checkout
- Auto-release prevents inventory lockup from abandoned carts
- Background job scans for expired holds every 30 seconds
- Redis TTL keys provide secondary safety net for cleanup

---

### Minutes 30-40: Search Architecture & Scaling

**Search architecture:**
- 50M searches/day = ~580/s average, ~5,800/s peak
- Search index handles: geo queries (bounding box/radius), property type, star rating, amenities
- After search index returns candidates: batch availability check (the expensive step)
- Rate computation for available properties
- Ranking by composite score (price 30%, quality 25%, conversion 20%, commission 15%, freshness 10%)

**Key optimizations:**
- Bloom filter of sold-out properties eliminates ~30% of candidates before availability check
- Availability sharded by property_id: each shard serves ~62K properties with hot data in memory
- Search result cache: 60s TTL for paginated results
- Proactive cache warming for top destinations

**Scaling:**
- Search Service: stateless, horizontal scaling
- Availability Service: sharded by property_id (32-128 shards)
- Search Index: geo-partitioned, replicated for read throughput
- All stateless services scale independently behind load balancers

---

### Minutes 40-43: Channel Sync, Payment & Reliability

**Channel synchronization:**
- BookingConfirmed events published to event bus
- Channel Manager Service pushes availability updates to all mapped OTA channels
- Target: < 5s from booking to all-channel update
- Circuit breaker per channel: if one OTA API is down, others still receive updates

**Payment:**
- Pre-authorization at hold time → capture at confirmation
- Client-side tokenization: our system never sees card numbers (PCI scope minimization)
- Dangerous failure: payment captured but reservation not created → outbox pattern
- Multi-gateway failover: if primary payment gateway fails, route to secondary

**Reliability:**
- Booking: 99.99% availability (revenue-critical)
- Search: 99.9% (degraded mode with cached results acceptable)
- Graceful degradation under load: extend cache TTLs, reduce result counts

---

### Minutes 43-45: Trade-offs + Discussion

Summarize 2-3 key trade-offs you made and why.

---

## What Makes Hotel Booking Uniquely Hard

| Challenge | Why It Is Unique | How It Shapes Architecture |
|-----------|-----------------|--------------------------|
| **Platform-owned inventory** | No external authority to delegate concurrency to | Atomic conditional updates; SERIALIZABLE isolation; sharding for write isolation |
| **Calendar matrix** | Multi-dimensional availability (property × room × date) | Sharded availability store; multi-row atomic transactions; bloom filters |
| **Intentional overbooking** | Revenue optimization through statistical over-selling | Configurable overbooking limits; walk policies; no-show prediction models |
| **Multi-channel distribution** | Same room sold on multiple platforms simultaneously | Event-driven channel sync; circuit breakers; rate parity enforcement |
| **Date-range contention** | N-night booking contends with any overlapping stay | SERIALIZABLE transactions; fragmentation management; LOS pricing |
| **Rate complexity** | BAR, seasonal, LOS, corporate, promotional rates | Rule engine; date-specific overrides; rate parity enforcement |

---

## Key Trade-Offs Table

| Decision | Option A | Option B | Recommendation | Rationale |
|----------|----------|----------|----------------|-----------|
| **Inventory authority** | External (channel manager as source) | Platform-owned (authoritative) | Platform-owned | Eliminates external dependency; enables strong consistency; the platform must arbitrate |
| **Availability concurrency** | Pessimistic locking (SELECT FOR UPDATE) | Atomic conditional update (WHERE guard) | Conditional update | Less lock contention; the WHERE clause acts as a lightweight optimistic lock |
| **Transaction isolation** | READ COMMITTED | SERIALIZABLE | SERIALIZABLE (booking path) | Multi-date bookings need phantom read protection; retry serialization failures |
| **Search result caching** | No cache (always fresh) | 60s TTL cache | 60s TTL | Fresh results are too expensive (availability checks for millions of properties); 60s staleness is acceptable for search browsing |
| **Hold duration** | Short (5 min) | Long (30 min) | 10 minutes | 5 min is not enough for guest checkout; 30 min locks inventory too long; 10 min balances UX and inventory utilization |
| **Overbooking** | No overbooking (exact inventory) | Statistical overbooking | Statistical with safety caps | No overbooking wastes 5-10% capacity; overbooking with walk policies maximizes revenue |
| **Payment timing** | Charge at booking | Pre-auth at booking, capture at check-in | Pre-auth (configurable) | Pre-auth reduces refund complexity for cancellable bookings; capture timing configurable per property |
| **Channel sync model** | Polling (channels pull availability) | Push (platform pushes updates) | Event-driven push | Polling adds latency (30s-5min); push delivers updates within 5s, reducing cross-channel overbooking |
| **Availability sharding** | By region | By property_id | By property_id | Region-based creates hotspots (all Paris hotels on one shard during peak); property_id distributes evenly |

---

## Trap Questions & Strong Answers

### "What if two users try to book the last room?"

**Weak answer:** "We use a distributed lock on the room."

**Strong answer:** "We use an atomic conditional update in the database. The UPDATE statement includes a WHERE clause that checks `total_inventory + overbooking_limit - booked_count - held_count > 0`. The first transaction to execute the UPDATE wins---the row-level lock ensures the second transaction sees the updated `held_count` and the WHERE clause fails, returning zero rows affected. We don't need a distributed lock because sharding by property_id ensures both requests go to the same database shard. For multi-night bookings, we use SERIALIZABLE isolation to prevent phantom reads across dates. If the transaction serialization fails (which is expected under contention), we retry up to 3 times with jittered backoff."

### "How do you handle overbooking?"

**Weak answer:** "We prevent overbooking by never selling more rooms than available."

**Strong answer:** "Hotels intentionally overbook. A 200-room hotel with a 6% no-show rate and 4% late-cancellation rate will, on average, have 20 empty rooms every night if it sells exactly 200. The system supports configurable overbooking per property: the availability calculation is `total_inventory + overbooking_limit - booked_count`. The overbooking limit is computed using historical no-show data, capped at 10% of total rooms as a safety measure. When overbooking results in all rooms being physically occupied, we execute a walk policy: relocate the lowest-tier guest to a comparable partner hotel, provide transport and compensation, and track the event to refine the overbooking model. The walk cost (~$300) is weighed against the revenue from the additional booking (~$200/night × avg 2.4 nights = $480), making overbooking net positive."

### "How do you keep availability in sync across channels?"

**Weak answer:** "We run a cron job every minute to update all channels."

**Strong answer:** "We use event-driven push. When a booking is confirmed (or cancelled), a BookingConfirmed (or BookingCancelled) event is published to our event bus. The Channel Manager Service consumes these events and immediately pushes availability updates to all mapped OTA channels. Target propagation is under 5 seconds. Each channel has an independent circuit breaker---if Expedia's API is down, Booking.com and Agoda still receive updates. Failed pushes are queued for retry with exponential backoff. When the circuit closes, we drain the queue in order, applying only the latest availability state per property (since intermediate states are superseded). We also have a reconciliation job that runs every 15 minutes to detect and correct any drift between our availability and what channels show."

### "What happens if payment succeeds but the booking isn't saved?"

**Weak answer:** "We refund the payment."

**Strong answer:** "We use the outbox pattern. Before capturing payment, we write a BookingIntent record to an outbox table in the same database transaction as the availability hold. After payment capture succeeds, we write a PaymentCaptured record to the outbox. A recovery worker scans the outbox every 30 seconds for PaymentCaptured records without a corresponding CONFIRMED reservation. When found, it retries reservation creation (idempotent via the booking's idempotency key). Only if reservation creation permanently fails (e.g., availability was rolled back by another process) do we refund the payment. The guest sees 'Booking is being processed' rather than 'Confirmed' until the reservation record is created, which typically takes < 1 second."

### "Why not use a NoSQL database for availability?"

**Weak answer:** "Relational databases are more reliable."

**Strong answer:** "The availability matrix requires multi-row atomic transactions. A 3-night booking must atomically check and decrement availability across 3 date entries---if date 1 and 2 succeed but date 3 is sold out, all three must roll back. This requires ACID transactions with SERIALIZABLE isolation. NoSQL databases (document stores, wide-column stores) generally don't support multi-document ACID transactions with the isolation level we need, or they do so with significant performance penalties. We DO use Redis as a cache layer in front of the relational store for fast reads (cache the sellable count per property/room/date), but the source of truth for writes must be a database that supports proper transactions."

---

## Follow-Up Deep Dives

If the interviewer wants to go deeper, be prepared for:

| Topic | Key Points |
|-------|-----------|
| **Revenue management** | BAR pricing, yield management curves, demand forecasting, competitive rate intelligence; dynamic pricing based on occupancy, day-of-week, events, competitor rates |
| **Rate parity** | Contractual obligation to offer same rate on all OTA channels; tension with direct booking incentives; monitoring and enforcement mechanisms |
| **Channel manager architecture** | Two-way integration: push availability out, receive bookings in; handling different API formats per channel; reconciliation between channels |
| **Loyalty program** | Points accrual/redemption, tier calculation, member-only rates, partnership rewards; integration with booking flow for point payment |
| **Review authenticity** | Verified-stay enforcement, NLP-based fraud detection, review manipulation patterns (shill reviews, competitor sabotage), moderation workflows |
| **Multi-currency** | Display prices in user's currency, charge in property's currency, exchange rate management, settlement processes |
| **Date fragmentation** | Gap-fill pricing, minimum stay restrictions, CTA (closed-to-arrival) rules, LOS pricing incentives |

---

## Red Flags to Avoid

| Red Flag | Why It Is Wrong | Correct Approach |
|----------|----------------|------------------|
| "We use a distributed lock for room booking" | Over-engineered; database row-level locking suffices since we shard by property | Atomic conditional UPDATE with WHERE guard; SERIALIZABLE for multi-date |
| "We prevent all overbooking" | Ignores industry reality; hotels lose 5-10% revenue from no-shows | Support configurable overbooking with safety caps and walk policies |
| "We cache availability for 5 minutes" | 5-minute stale availability for booking is dangerous; the last room may be gone | Short cache (30s) for search display; always check fresh availability at hold time |
| "We sync channels every 5 minutes via cron" | 5-minute delay causes cross-channel overbooking | Event-driven push within 5 seconds of any availability change |
| "We store credit card numbers in our database" | PCI-DSS violation; massive liability | Client-side tokenization; never touch raw card data; use payment gateway tokens |
| "We use eventual consistency for bookings" | Can result in double-booking the same room | Strong consistency for inventory writes; eventual consistency only for search display |
| "The search index checks availability" | Mixing concerns; availability changes constantly, index doesn't refresh fast enough | Search index for discovery (geo, filters); separate availability service for real-time checks |

---

## Quick Reference Card

```
Scale:          50M searches/day, 1.5M bookings/day, 28M properties
Ratio:          50:1 search-to-book
Data model:     property × room_type × date → available_count (calendar matrix)
Consistency:    Strong for inventory; eventual for search
Hold duration:  10 minutes (platform-managed)
Overbooking:    5-10% configurable, safety-capped
Payment:        Pre-auth → capture (tokenized, PCI-compliant)
Channel sync:   Event-driven push, < 5s propagation
Search:         Search index (geo) + Availability Service + Rate Service
Booking:        Saga (hold → pre-auth → confirm → capture)
Sharding:       Availability by property_id (32-128 shards)
Key trade-off:  Platform owns inventory → must solve consistency directly
```
