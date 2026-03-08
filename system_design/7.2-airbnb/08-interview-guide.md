# Interview Guide

## 1. 45-Minute Interview Pacing

### 1.1 Recommended Timeline

```
Minutes 0-5:   Clarify Scope & Requirements
Minutes 5-15:  High-Level Architecture
Minutes 15-30: Deep Dive (Availability + Distributed Locking)
Minutes 30-40: Scale, Fault Tolerance, Payment Architecture
Minutes 40-45: Trade-offs Summary & Discussion
```

### 1.2 Detailed Breakdown

#### Minutes 0-5: Clarify Scope (Critical)

**Ask the interviewer:**

1. "Should I focus on the full platform (search + booking + payments) or a specific subsystem?"
   - Full platform → cover breadth, go deep on availability
   - Booking subsystem → focus on calendar locking, payment hold, state machine
   - Search subsystem → focus on Elasticsearch, ML ranking, geo-queries

2. "Should I design for Instant Book only, or both Instant Book and Request-to-Book?"
   - Both → shows understanding of the two-sided marketplace dynamics
   - Instant Book only → simpler, allows deeper dive into locking

3. "What scale should I target? Airbnb-scale (~7M listings, ~1.5M bookings/day) or a startup MVP?"
   - Airbnb-scale → distributed locking, sharding, multi-region become central
   - MVP → simpler: single DB, optimistic locking, basic search

**What to establish early:**
- Two-sided marketplace: hosts and guests have different flows
- Calendar is per-listing, per-date (not room inventory like hotels)
- Payment is authorize-then-capture (not charge immediately)
- Search must combine geo + dates + availability + ML ranking

#### Minutes 5-15: High-Level Architecture

**Draw the architecture diagram with these components:**

```
1. Client Layer: Web + Mobile
2. API Gateway: Auth, rate limiting, routing
3. Core Services:
   - Search Service → Elasticsearch
   - Listing Service → PostgreSQL
   - Availability Service → Redis (locks) + PostgreSQL (calendar)
   - Booking Service → PostgreSQL
   - Payment Service → External Payment Gateway
4. Event Stream: Cross-service communication
5. Supporting Services: Notification, Review, Pricing, Trust
```

**Key points to make:**
- "Availability is the hardest part---I'll use Redis distributed locks to prevent double-booking"
- "Search uses Elasticsearch for geo-queries and ML ranking; it's eventually consistent"
- "Payment uses authorize-then-capture: hold at booking, charge at check-in"
- "Cross-service communication uses an event stream for loose coupling"

**Data flow to walk through:**
1. Search flow: query → Elasticsearch (geo + filters) → ML ranking → results
2. Booking flow: check availability (lock) → authorize payment → create booking → notify

#### Minutes 15-30: Deep Dive on Availability & Distributed Locking

**This is the core differentiator. Spend 15 minutes here.**

**Calendar data model:**
```
Table: listing_calendar (listing_id, date, status, price_override)
Primary key: (listing_id, date)
Statuses: AVAILABLE, BLOCKED, RESERVED, BOOKED
```

**The double-booking problem:**
- "A popular listing may receive 50+ concurrent booking attempts for the same dates"
- "I need to ensure exactly one succeeds and others fail cleanly"

**Solution: Redis distributed lock + database reservation**

```
1. ACQUIRE Redis lock on listing_id (SET NX EX 10s)
2. If acquired: read calendar dates, verify all AVAILABLE
3. UPDATE calendar SET status = RESERVED
4. RELEASE lock
5. Proceed to payment authorization
6. If payment succeeds: create booking (status = CONFIRMED)
7. If payment fails: revert calendar to AVAILABLE
```

**Explain why pessimistic over optimistic:**
- "With optimistic locking, all concurrent attempts would proceed through payment auth (1-2s), then fail at the write stage. That wastes payment gateway calls and creates bad UX."
- "Pessimistic locking fails losers in <100ms, before any payment processing."

**Explain lock granularity:**
- "Per-listing, not per-date. Locking individual dates risks deadlocks."
- "Different listings are fully parallel---no global lock."

**Address failure modes:**
- Lock TTL expiry: "If the holder crashes, lock auto-releases in 10s"
- Lock-then-crash after reservation: "Scheduled job finds RESERVED dates without booking records and releases them"
- Payment failure after reservation: "Booking Service reverts calendar to AVAILABLE"

#### Minutes 30-40: Scale, Payments, Fault Tolerance

**Scaling:**
- Calendar DB: Sharded by listing_id (all dates for a listing on same shard)
- Search: Elasticsearch cluster with replicas for read scaling
- Caching: Redis for availability cache (95% of calendar reads served from cache)

**Payment architecture:**
- "Authorize at booking, capture at check-in, payout T+24h"
- "Idempotency keys on all payment operations to prevent duplicate charges"
- "Split payouts for co-hosting (configurable percentages)"
- "Circuit breaker to backup payment processor on primary failure"

**Fault tolerance:**
- "Circuit breakers between all services"
- "If search is slow: serve cached results"
- "If payment is slow: queue booking, process async"
- "If notification fails: never block booking flow"

#### Minutes 40-45: Trade-offs & Wrap-up

**Summarize key trade-offs made** (see section 3 below).

**Mention things you deliberately left out:**
- "I didn't detail the ML ranking model internals---I'd use a two-tower architecture for embedding-based retrieval"
- "I didn't cover iCal sync deeply---it's a polling-based system with inherent lag"
- "I didn't discuss multi-region in detail---writes go to primary region, reads are regional"

---

## 2. What Makes Airbnb Uniquely Hard

### 2.1 The Five Hard Problems

| Problem | Why It Is Hard | What Most Candidates Miss |
|---------|---------------|--------------------------|
| **Calendar availability is per-listing, per-date** | 7M listings × 365 dates = 2.5B cells of state. Not like hotel rooms where you track count per room type. Each date is independent and must be individually checked and locked. | Treating it like a hotel system with room inventory counts |
| **Strong consistency for booking + eventual consistency for search** | Search must be fast (eventual consistency OK), but bookings must prevent double-booking (strong consistency required). The boundary between these two consistency models is the hardest design decision. | Applying the same consistency model to all components |
| **Two-sided marketplace dynamics** | Hosts and guests have asymmetric needs. Instant Book vs. Request-to-Book. Hosts control calendar and pricing. Guests want fast, guaranteed bookings. Platform must balance both sides. | Designing only from the guest perspective |
| **Authorize-then-capture payment model** | Hold funds at booking (days/weeks before check-in). Holds expire (7-day card network limits). Must re-authorize for far-future bookings. Capture at check-in. Payout 24h after check-in. | Using simple "charge at booking" model |
| **Trust at scale without central authority** | Neither host nor guest is inherently trusted. Identity verification, fraud detection, review integrity, damage claims---all must be handled by the platform in real-time without blocking the booking flow. | Ignoring trust or treating it as an afterthought |

### 2.2 What Sets Apart Senior/Staff Answers

```
Junior answer:
  "I'll use a SQL database for everything and check availability before booking."

Senior answer:
  "I'll use a distributed lock per listing to serialize booking attempts.
   Pessimistic over optimistic because payment auth is expensive.
   Calendar DB sharded by listing_id. Redis for locks and availability cache.
   Search uses Elasticsearch with event-driven index updates."

Staff answer:
  "The core tension is the consistency boundary. Bookings need linearizable reads
   (can't show a date as available if it's reserved). Search can tolerate 5-minute
   staleness. I'll bridge this with a Redis availability cache that's updated
   synchronously on writes but read asynchronously by search. The distributed lock
   has a 10s TTL---if it leaks, the DB-level reservation status prevents double-booking
   as a second barrier. For payment, I'll use authorize-then-capture with a
   re-authorization job for far-future bookings. The lock scope is per-listing, not
   per-date, to avoid deadlocks on overlapping date ranges."
```

---

## 3. Key Trade-offs Table

| Decision | Option A | Option B | Recommendation | Rationale |
|----------|----------|----------|----------------|-----------|
| **Calendar locking** | Distributed locks (Redis) | Optimistic concurrency (DB version check) | Distributed locks | Pessimistic locking fails fast (<100ms) before expensive payment auth. OCC would waste 1-2s on payment before failing at write. |
| **Search consistency** | Real-time index updates | Eventually consistent (event-driven) | Eventually consistent (<5 min lag) | Real-time indexing would create a synchronous dependency between calendar writes and search. The dual-read strategy (Redis cache + ES) provides near-real-time freshness. |
| **Booking mode** | Instant Book only | Request-to-Book only | Both, configurable per listing | Instant Book drives higher conversion (less friction). Request-to-Book gives hosts control. Offering both lets the market self-select. |
| **Payment capture timing** | At booking time | At check-in time | At check-in | Protects guests (not charged until stay begins). Handles cancellations cleanly (release hold vs. process refund). This is Airbnb's actual model. |
| **Calendar DB vs. Booking DB** | Single database for both | Separate databases | Separate databases | Different access patterns (calendar: range queries, high-frequency reads; bookings: point lookups, lower frequency). Separate scaling. |
| **Lock granularity** | Per-listing | Per-date | Per-listing | Per-date locking with multi-date bookings creates deadlock risk. Per-listing is coarser but safe and simple. Contention is low (most listings get <1 booking/hour). |
| **iCal sync** | Webhooks (push) | Polling (pull) | Polling with short intervals | Most external platforms only support iCal feeds (pull). Webhook support is rare. Polling every 15-30 min with shorter intervals for high-activity listings. |
| **Photo storage** | Platform-managed object storage | Third-party CDN-native storage | Platform object storage + CDN | Platform controls the photos (moderation, resizing, watermarking). CDN is a distribution layer, not the source of truth. |
| **Review reveal timing** | Immediate (first-in visible) | Simultaneous (both or deadline) | Simultaneous reveal | Prevents retaliation reviews. Both parties submit independently; revealed when both submit or 14-day deadline passes. |
| **Pricing model** | Platform sets prices | Host sets prices + platform suggests | Host sets + platform suggests | Hosts know their market best. Smart Pricing suggestions (ML-based) help hosts optimize, but hosts always have final control. |
| **Host payout timing** | Immediately at booking | 24h after check-in | 24h after check-in | Gives platform a window to handle no-shows, early check-out issues, or guest complaints. Balances host cash flow needs with platform risk management. |
| **Search ranking** | Rule-based scoring | ML-based ranking | ML-based with rule-based fallback | ML ranking provides 15-20% better booking conversion. Rule-based fallback ensures search works when ML service is down. |

---

## 4. Trap Questions & Strong Answers

### 4.1 "Why not just use a SQL database for everything?"

**Weak answer**: "SQL is too slow."

**Strong answer**: "SQL (PostgreSQL) is the right choice for bookings and calendar state---it gives us ACID transactions and strong consistency. But for search, we need geo-spatial queries combined with full-text search and ML scoring at 10K QPS. Elasticsearch is purpose-built for this: it has native geo_point indexing (BKD trees), inverted indices for text search, and function_score for custom ranking. Trying to do geo-distance + text + relevance scoring in PostgreSQL would require multiple joins, custom functions, and would not scale to 10K QPS across 7M listings."

### 4.2 "What if the distributed lock fails?"

**Weak answer**: "We use Redlock for safety."

**Strong answer**: "There are three failure modes. First, if the lock holder crashes, the 10-second TTL auto-releases the lock. Second, if Redis itself fails, the database-level `SELECT ... FOR UPDATE` provides a second barrier---no double-booking can occur because the calendar UPDATE checks the status column. Third, if the lock release fails (network issue), the lock auto-expires via TTL, and the next attempt must still check the RESERVED status in the database. The key insight is that the Redis lock is an optimization (fast failure for concurrent attempts), not the sole consistency mechanism. The database is the ultimate arbiter."

### 4.3 "How do you prevent double bookings across time zones?"

**Weak answer**: "Convert dates to the same time zone."

**Strong answer**: "All calendar dates are stored as date values (not timestamps) in UTC context. The listing has a timezone metadata field. Check-in is always a date (e.g., July 15), not a datetime. A guest in Tokyo booking a listing in New York specifies July 15 as the check-in date---this is the same July 15 regardless of the guest's timezone. The listing's timezone only matters for determining the actual check-in time (e.g., 3 PM local time) and for triggering payment capture. The availability lock operates on date values, which are timezone-agnostic."

### 4.4 "What happens if a guest books but the host cancels?"

**Weak answer**: "Refund the guest."

**Strong answer**: "Host cancellations are treated much more severely than guest cancellations because they destroy trust in the platform. The flow: full refund to guest (always, regardless of policy), guest receives a rebooking coupon (10%), platform sends automated alternatives nearby. The host is penalized: $50-100 cancellation fee, calendar blocked for those dates (cannot re-list), listing search ranking demoted, and if cancellations exceed a threshold, Superhost status is revoked. This asymmetric penalty structure is critical for marketplace health---hosts must be reliable."

### 4.5 "How do you handle the case where payment authorization expires before check-in?"

**Weak answer**: "Just re-charge the card."

**Strong answer**: "Card authorization holds typically expire after 7 days (varies by card network and issuer). For bookings made more than 7 days before check-in, the system must re-authorize. A daily scheduled job identifies bookings where the authorization is expiring within 48 hours. It voids the old authorization and creates a new one. If re-authorization fails (card expired, insufficient funds), the guest is notified via email/push with 24 hours to update their payment method. If not resolved, the booking is cancelled with a 'payment failure' reason, and the dates are released. The host is notified but not penalized."

### 4.6 "Why not just use optimistic concurrency control?"

**Weak answer**: "Pessimistic is safer."

**Strong answer**: "Optimistic concurrency would work if the 'modify' step between read and write were cheap. But in Airbnb's booking flow, after reading availability, the system calls a payment gateway to authorize funds---a 1-2 second operation. With optimistic concurrency, all concurrent booking attempts would read availability (all see 'available'), all would proceed to payment authorization (wasting gateway capacity), and then all but one would fail at the write stage. That means 9 out of 10 concurrent attempts would waste 1-2 seconds of the user's time and one payment gateway call each, only to show 'dates no longer available.' With pessimistic locking, the 9 losers fail in <100ms, never touch the payment gateway, and get a clean message immediately."

### 4.7 "How does search handle stale availability data?"

**Weak answer**: "We update the search index in real-time."

**Strong answer**: "We don't. The Elasticsearch index is updated asynchronously via event stream, with a 30-60 second lag. This means search can show listings that were booked moments ago. We address this with a dual-read strategy: the Search Service checks a Redis availability cache (updated synchronously on writes, sub-second) before returning results. This filters out stale results at a cost of ~5ms per search. The key insight is that the search index optimizes for geo + relevance + ranking, while Redis handles the real-time availability filter. We tolerate the search index being slightly stale because the Redis layer catches it."

---

## 5. Common Mistakes

### 5.1 Design Mistakes

| Mistake | Why It Is Wrong | Correct Approach |
|---------|----------------|-----------------|
| **Not distinguishing Instant Book vs. Request-to-Book** | These are fundamentally different flows. Instant Book confirms immediately; Request-to-Book requires host approval within 24h. | Design both flows. Show the state machine: PENDING_PAYMENT → CONFIRMED (instant) or PENDING_PAYMENT → PENDING_HOST_APPROVAL → CONFIRMED (request). |
| **Treating availability like hotel room counts** | Hotels have N rooms of type X. Airbnb has 1 listing with per-date availability. You cannot decrement a counter; you must check each date individually. | Model calendar as a table with one row per (listing_id, date) with status field. Range queries for date spans. |
| **Forgetting calendar → search index propagation** | When dates are booked, the search index must be updated. Without this, search shows booked listings. | Event-driven pipeline: calendar change → event stream → search indexing consumer. Dual-read with Redis for freshness. |
| **Missing the payment hold vs. capture distinction** | Charging at booking time means refunds for cancellations (slow, chargeback risk). Holding first, capturing later, is cleaner. | Authorize at booking → capture at check-in → payout at T+24h. Hold expiry management for far-future bookings. |
| **Not discussing host payout timing** | Host payout is not instant. It is 24 hours after check-in to allow for dispute/no-show handling. | Design the Payout Service with scheduled jobs, split payout logic, and multi-currency support. |
| **Using a single consistency model** | Applying strong consistency everywhere kills search performance. Applying eventual consistency to bookings enables double-bookings. | CP for availability + bookings + payments. AP for search + reviews + pricing. |
| **Ignoring the trust problem** | In a two-sided marketplace with strangers, trust is not optional. | Identity verification, fraud detection at booking time, review integrity, damage claims. At minimum mention the risk scoring pipeline. |
| **Locking at the wrong granularity** | Per-date locks with multi-date bookings create deadlock potential. | Per-listing locks. Simple, safe, low contention (most listings get <1 booking/hour). |

### 5.2 Estimation Mistakes

| Mistake | Reality |
|---------|---------|
| Assuming 100K bookings/second | Airbnb does ~1.5M bookings/day ≈ ~17/s average. Even at peak, booking QPS is in the hundreds, not thousands. |
| Ignoring calendar data volume | 7M listings × 365 dates = 2.5B rows. This is a significant data management challenge. |
| Forgetting photo storage | 7M listings × 25 photos × 2MB = 350TB. This dominates storage costs. |
| Underestimating search complexity | Search is not just "query a database." It involves geo-spatial filtering, ML ranking, availability checking, and personalization. |

---

## 6. Scope Variants

### 6.1 Narrow Scope: "Design the Booking System Only"

**Focus on:**
- Booking state machine (request → confirm → active → complete → review)
- Calendar availability check with distributed locking
- Payment authorization and capture lifecycle
- Cancellation and refund processing
- Skip: search ranking, listing management, messaging

### 6.2 Medium Scope: "Design Search + Booking"

**Focus on:**
- Search architecture (Elasticsearch, geo-queries, ML ranking)
- Availability management (calendar, distributed locking)
- Booking flow (instant book + request-to-book)
- Payment (authorize-then-capture)
- The consistency boundary between search (AP) and booking (CP)

### 6.3 Wide Scope: "Design Airbnb"

**Cover everything but at high level. Go deep on:**
- Availability locking (the hardest problem)
- Payment lifecycle (the most complex flow)
- Skim: messaging, reviews, trust (mention them, show in architecture, but do not deep-dive)

---

## 7. Follow-up Question Preparation

| Follow-up | Suggested Response |
|-----------|-------------------|
| "How would you handle listings with external calendar sync?" | "iCal polling every 15-30 minutes. Import blocked dates as BLOCKED with source=ICAL_SYNC. The inherent sync lag is the biggest risk for cross-platform double-booking." |
| "How would you design the notification system?" | "Event-driven: booking events → event stream → Notification Service. Multi-channel: email (transactional provider), push (platform push service), SMS (for critical: booking confirmation, host payout). Never block the booking flow for notifications." |
| "How would you handle pricing at scale?" | "Host sets base price. Smart Pricing (opt-in) uses ML: demand signals (search volume for area + dates), seasonality, local events, comparable listing prices. Updates daily, applies per-date. Host can set min/max bounds." |
| "What if you needed to add long-term stays (30+ days)?" | "Different payment model: monthly billing instead of upfront auth. Different availability model: month-level blocks instead of per-date. Different trust model: lease-like agreements, deposit handling. Likely a separate service with shared infrastructure." |
| "How would you prevent hosts from discriminating against guests?" | "Reduce information available to hosts in Request-to-Book: show guest rating and verification status but minimize profile details. Audit approval/decline patterns per host. Instant Book eliminates this entirely (no host approval step)." |
