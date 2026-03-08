# Interview Guide

## 45-Minute Pacing

### Minutes 0-5: Clarify Scope

**Key clarifying questions to ask (or expect):**

| Question | Why It Matters |
|----------|---------------|
| "Are we designing an OTA aggregator (like Kayak/Expedia) or an airline's direct booking system?" | Aggregator requires GDS integration + multi-provider fan-out; airline direct is simpler but needs NDC |
| "Do we need to support multi-city and connecting flights, or just point-to-point?" | Connection validation, itinerary graph, interline agreements add significant complexity |
| "How many searches/bookings per day?" | Drives caching strategy and infrastructure sizing |
| "Do we own inventory, or does it live in an external system?" | This is THE defining question—external GDS dependency shapes the entire architecture |

**Recommended scope for 45 minutes:**
- OTA aggregator (Expedia-style) with GDS integration
- Search + booking + payment + ticketing + PNR management
- Discuss but do not fully design: check-in, ancillaries, price alerts

---

### Minutes 5-15: High-Level Architecture

Draw the architecture with these components:
1. **Client layer** → API Gateway → BFF
2. **Search path**: Search Aggregation → fan-out to GDS/NDC APIs → cache layer
3. **Booking path**: Booking Orchestrator → Inventory + Payment + GDS ticketing
4. **Data stores**: PostgreSQL (bookings, PNRs), Redis (search cache, seat holds), Kafka (events)

**Key points to make:**
- "The fundamental constraint is that inventory lives outside our system—in the GDS"
- "The search-to-book ratio is 100:1, so we must optimize aggressively for search"
- "GDS API calls cost $0.50-2.00 each, making caching an economic necessity, not just a performance optimization"
- "The booking flow is a saga: hold seat → charge payment → issue ticket"

---

### Minutes 15-28: Deep Dive — GDS Integration + Seat Hold

This is where you differentiate. Focus on:

**1. GDS as External Dependency**
- GDS (Amadeus, Sabre, Travelport) controls 97% of the flight distribution market
- 500ms-2s latency per API call, variable and unpredictable
- Per-call cost model drives aggressive caching
- Circuit breaker per provider: if one GDS fails, serve results from others + cache

**2. Fan-Out Search Pattern**
- Single search → 5 parallel GDS/NDC calls with independent timeouts
- Aggregate results, deduplicate by flight key (airline + number + time)
- Same flight can appear from multiple providers at different prices
- Cache results with 3-min TTL; re-verify at booking time

**3. Seat Hold Race Condition**
- Two users see "3 seats available" (from same cached search result)
- Both click "Book" simultaneously
- GDS resolves: first hold wins, second gets SOLD_OUT or gets next available
- OTA's role: show optimistic availability, let GDS arbitrate, handle rejection gracefully

**4. Two-Phase Booking**
- Phase 1 (Hold): GDS creates PNR, blocks seat, 15-min TTL
- Phase 2 (Ticket): Payment succeeds → GDS issues e-ticket
- If hold expires: seat automatically released by GDS
- Critical failure: payment captured but ticket not issued → must recover (outbox pattern)

---

### Minutes 28-38: Search at Scale + Caching

**Search architecture:**
- 100M searches/day = ~1,160/sec average, ~11,600/sec peak
- Each search fans out to 5+ providers → 58,000 external calls/sec at peak
- Two-tier cache: L1 in-process (60s), L2 Redis (3 min)
- Cache key: hash(origin, destination, date, passengers, cabin)
- Filters applied post-cache (not part of cache key) to maximize hit rate
- Cache stampede prevention: lock-based refresh (one request refreshes, others wait)

**Fare freshness problem:**
- Fares change every few minutes
- Cached results are "suggestions" — must re-verify before committing to a hold
- If price changed: show user a "price changed" modal with new price
- If sold out: suggest alternatives

---

### Minutes 38-43: PNR Lifecycle, Payment, Reliability

**PNR lifecycle:**
- Created at hold time with 5 mandatory fields (PRINT: Phone, Received-from, Itinerary, Name, Ticketing)
- Shared across GDS, airline CRS, and OTA's database (different record locators possible)
- Status transitions: ON_HOLD → TICKETED → CHECKED_IN → COMPLETED

**Payment + ticketing saga:**
- Saga orchestrator coordinates multi-step process
- Most dangerous failure: payment captured but ticket not issued
- Solution: outbox pattern—persist payment success before attempting ticketing
- On recovery: query outbox for un-ticketed payments, complete ticketing

**Reliability:**
- Search: 99.9% (degraded mode OK—serve cached results)
- Booking: 99.99% (revenue-critical)
- Multi-region: active-passive for bookings (strong consistency), active-active for search

---

### Minutes 43-45: Trade-offs + Discussion

Summarize 2-3 key trade-offs you made and why.

---

## What Makes Flight Booking Uniquely Hard

| Challenge | Why It Is Unique | How It Shapes Architecture |
|-----------|-----------------|--------------------------|
| **External inventory** | GDS/CRS owns the seats, not the OTA | Cache-first search, re-verify at booking, circuit breakers |
| **Fare complexity** | 26 fare classes, 31 rule categories per fare | Domain-specific rule engine, fare family abstraction |
| **Cost per API call** | $0.50-2.00 per GDS query | Aggressive caching is economic necessity, not optional |
| **Search:book ratio** | 100:1 or higher | Optimize 99% for search performance |
| **Regulatory burden** | APIS, fare advertising, PCI-DSS, GDPR, BSP | Compliance baked into every layer |
| **Two-phase booking** | Hold + ticket with TTL | Saga pattern, compensating transactions |
| **PNR cross-system sync** | Same booking record across 3-5 systems | Eventual consistency with GDS as hub |

---

## Key Trade-Offs Table

| Decision | Option A | Option B | Recommendation | Rationale |
|----------|----------|----------|----------------|-----------|
| **Inventory source** | GDS only | GDS + NDC direct | Hybrid | GDS for breadth (400+ airlines); NDC for richer content and better pricing from major carriers |
| **Search cache TTL** | Short (1 min) | Longer (5 min) | 3 min with stale re-verify | 1 min = too many GDS calls ($$$); 5 min = too stale; 3 min is the sweet spot with re-verification at booking |
| **Seat hold authority** | Local DB only | GDS hold + local mirror | GDS hold (authoritative) | GDS is the only system that can actually block a seat; local-only hold leads to overselling |
| **Booking flow** | Synchronous | Saga (async orchestration) | Saga | Components can fail independently; compensating transactions enable graceful rollback |
| **Fare pricing** | Published fares (ATPCO) | Dynamic (NDC offers) | Dynamic with published fallback | Dynamic pricing for revenue optimization; published fares as fallback when NDC unavailable |
| **Cache key design** | Include all filters | Exclude filters, apply post-cache | Exclude filters | Including filters fragments cache (100× more entries, much lower hit rate) |
| **Multi-region write** | Single primary | Multi-primary | Single primary (bookings) | Strong consistency for booking/payment; multi-primary creates reconciliation nightmares for financial data |
| **Search result ranking** | Price only | Multi-factor weighted | Multi-factor | Price-only penalizes convenient flights; multi-factor (price 40%, duration 25%, stops 20%, airline 15%) balances value and convenience |
| **GDS connection model** | Shared pool | Per-request connection | Persistent pool | GDS connections are expensive to establish; persistent pools with keep-alive reduce latency by 200-400ms |

---

## Trap Questions & Strong Answers

### "What if two users try to book the last seat?"

**Weak answer:** "We use distributed locks in our database."

**Strong answer:** "The GDS is the authoritative inventory system. When two users try to hold the last seat, both requests go to the GDS. The GDS processes them serially—first hold wins, second gets a 'UC' (Unable to Confirm) response. Our role is to: (1) show optimistic availability from cache, (2) let the GDS arbitrate, (3) handle rejection gracefully by suggesting alternatives or waitlisting. We do NOT try to build our own distributed lock for seat availability—that would create a split-brain with the GDS."

### "How do you handle mid-booking price changes?"

**Weak answer:** "We cache the price and honor it."

**Strong answer:** "Cached search results may be 3-5 minutes stale. When the user clicks 'Book,' we re-verify the fare with the GDS before creating a hold. If the price changed, we show a 'Price Changed' modal with the new amount and give the user 5 minutes to accept or decline. We never silently charge a different amount. If the fare is no longer available at all, we offer alternatives. This re-verification step adds 500ms-1s to the booking flow but prevents revenue leakage and customer trust issues."

### "What about multi-city / connecting flight bookings?"

**Weak answer:** "We just search each leg separately."

**Strong answer:** "Connecting flights require itinerary-level validation: (1) minimum connection time per airport (varies: 45 min domestic, 90 min international, terminal-dependent), (2) interline agreement check (can airline A's ticket include airline B's segment?), (3) fare combinability rules (can a discounted fare on leg 1 combine with a full fare on leg 2?). For the search, we use graph-based itinerary construction—the search service builds valid connection graphs using pre-computed airport connection data, then validates each candidate itinerary against these rules before ranking."

### "What happens if payment succeeds but ticketing fails?"

**Weak answer:** "We refund the payment."

**Strong answer:** "This is the most dangerous failure mode. We do NOT immediately refund, because the seat is still held in the GDS. Instead, we use an outbox pattern: payment success is persisted before ticketing is attempted. If ticketing fails, we retry 3 times with exponential backoff. If still failing (GDS outage), the booking enters a 'PAYMENT_CAPTURED_PENDING_TICKET' state and goes into a manual operations queue. The operations team can issue the ticket manually via GDS terminal. The user gets a notification: 'Booking confirmed, ticket being processed.' Only if the hold expires AND manual ticketing fails do we process a refund."

### "How do you prevent bots from holding all seats?"

**Weak answer:** "We add rate limiting."

**Strong answer:** "This is a 'denial of inventory' attack—bots hold seats without paying, blocking legitimate users. We use layered defense: (1) Hold limit: max 3 active holds per user/IP/session, (2) Progressive TTL: first hold = 15 min, subsequent holds from same source = 10 min then 5 min, (3) Behavioral analysis: detect bot patterns (no mouse movement, rapid sequential holds, headless browser fingerprints), (4) Invisible CAPTCHA on the hold step, escalating to visible challenge on suspicion, (5) Device fingerprinting across sessions to track repeat offenders."

---

## Follow-Up Deep Dives

If the interviewer wants to go deeper, be prepared for:

| Topic | Key Points |
|-------|-----------|
| **NDC architecture** | XML/JSON-based airline-direct API; richer content (images, bundles); airline controls pricing dynamically; per-airline integration effort vs. single GDS API |
| **Revenue management** | Load factor pricing, time-to-departure curves, competitor price signals, fare class yield management; airlines adjust fare class availability (not price) to manage revenue |
| **APIS compliance** | Pre-departure passenger data submission to government authorities; varies by country; Secure Flight (US) requires name, DOB, gender 72 hours before departure |
| **Check-in system** | Departure Control System (DCS) integration; seat assignment finalization; boarding pass generation; bag drop coordination |
| **Fare rules engine** | ATPCO 31 rule categories; combinability, advance purchase, minimum stay; how refund calculations work; fare-by-rule derivation |
| **Aggregator vs. direct** | Aggregators (Duffel, Kiwi) normalize GDS + NDC into unified API; reduce integration complexity; trade-off: additional intermediary cost + latency |

---

## Red Flags to Avoid

| Red Flag | Why It Is Wrong | Correct Approach |
|----------|----------------|------------------|
| "We store seat availability in our database" | You don't own the inventory—the GDS does | Use GDS as authoritative source; local DB is a cached mirror |
| "We use a distributed lock for seat booking" | Creates split-brain with GDS | Let GDS handle concurrency; it's the only system that can actually block a seat |
| "We cache search results for 30 minutes" | Fares change every few minutes; 30-min cache = booking failures | 3-min TTL with re-verification at booking time |
| "We handle payment and ticketing in one transaction" | They cross different systems (payment gateway + GDS) | Saga pattern with compensating transactions |
| "We sync inventory in real-time from all airlines" | 400+ airlines × 100K flights × 26 fare classes = impossible | Cache-first search; GDS is authoritative; sync only on demand |
| "We immediately refund if ticketing fails" | Seat is still held; refunding wastes the hold | Retry ticketing; manual queue; refund only as last resort |
