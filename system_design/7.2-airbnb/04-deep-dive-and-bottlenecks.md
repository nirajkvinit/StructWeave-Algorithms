# Deep Dive & Bottlenecks

## Deep Dive 1: Distributed Availability Management

### The Double-Booking Problem

The core challenge: Airbnb has 7M+ listings, each with 365 calendar dates. When two guests attempt to book the same listing for overlapping dates simultaneously, exactly one must succeed and the other must fail. This sounds simple, but at scale it becomes one of the hardest distributed systems problems in the marketplace domain.

**Why it is hard:**

1. **Per-date granularity**: A listing's availability is not a single counter (like "3 rooms remaining")---it is a set of individual dates, each with independent status. A booking for July 15-20 must check and reserve 5 separate dates atomically. If dates July 15-18 are available but July 19 is blocked, the entire booking must fail.

2. **Fan-out of state**: With 7M listings × 365 dates = 2.5B+ calendar cells, the state space is enormous. Each cell can be independently modified by the host (block/unblock), by a booking (reserve/book), or by an external calendar sync (iCal import).

3. **Concurrent access patterns**: A popular beachfront listing in summer may receive 50-100 booking attempts per hour for overlapping date ranges. A host may be manually blocking dates at the same time a guest is booking. An iCal sync may be importing external reservations while a local booking is in progress.

4. **Cross-service coordination**: A booking involves at least three services: Availability Service (check and reserve dates), Payment Service (authorize funds), and Booking Service (create record). Failure at any stage must cleanly roll back the others.

### Distributed Locking with Redis

The system uses Redis-based distributed locking with a per-listing lock granularity:

```
Lock key:    "availability_lock:{listing_id}"
Lock value:  {booking_attempt_id}  (unique per attempt, for safe release)
TTL:         10 seconds
```

**Why per-listing granularity (not per-date):**
- A booking spans multiple dates. Locking individual dates would require acquiring N locks atomically, introducing deadlock risk (Booking A locks July 15, Booking B locks July 16, both need the other's date).
- Per-listing locking serializes all booking attempts for the same listing but allows fully parallel bookings across different listings. Since the vast majority of listings receive fewer than 1 booking attempt per minute, contention is rare.

**Lock acquisition pattern:**

```
1. Guest initiates booking for Listing X, July 15-20
2. Booking Service calls Availability Service
3. Availability Service attempts: REDIS SET "availability_lock:X" "attempt-123" NX EX 10
   - NX: Only set if key does not exist (atomic test-and-set)
   - EX 10: Auto-expire after 10 seconds (safety net if holder crashes)
4. If SET returns OK → lock acquired, proceed with availability check
5. If SET returns nil → another attempt holds the lock
   → Return 409 CONFLICT to guest: "This listing is being booked, try again shortly"
```

**Lock release pattern (Lua script for atomicity):**

```
// Only release if we still own the lock
IF REDIS.GET("availability_lock:X") == "attempt-123":
    REDIS.DEL("availability_lock:X")
// Else: lock expired and another holder acquired it; do not delete their lock
```

### Why Not Redlock?

Redlock (acquiring locks on N/2+1 Redis nodes) provides stronger guarantees against Redis master failure during lock holding. However, for calendar availability:

- The 10-second TTL means even if a lock "leaks" due to Redis failover, it expires quickly
- The database-level `SELECT ... FOR UPDATE` provides a second layer of protection
- Redlock adds 3-5x latency (must contact N Redis nodes) and operational complexity
- The failure mode of a leaked lock (a booking attempt retries after 10s) is tolerable

**Decision**: Single-node Redis lock with short TTL + database-level row locking as a safety net. This provides sub-millisecond lock acquisition with acceptable failure modes.

### Optimistic vs. Pessimistic Concurrency

| Approach | How It Works | Pros | Cons |
|----------|-------------|------|------|
| **Pessimistic (chosen)** | Acquire lock before reading calendar; only one attempt proceeds at a time | Fast failure for losers (no wasted work); no payment auth wasted | Lock contention on hot listings |
| **Optimistic** | Read calendar, do payment auth, then try to write with version check | No locking overhead; higher throughput when contention is low | Losers waste 1-2s on payment auth only to fail at write; poor UX |

**Why pessimistic wins for Airbnb**: The payment authorization step takes 1-2 seconds (external gateway call). With optimistic concurrency, all concurrent booking attempts would proceed through payment auth before discovering the conflict at the database write. This wastes payment gateway capacity and creates a terrible user experience ("Your payment was processed but the dates are no longer available"). Pessimistic locking fails the losers in <100ms, before any payment processing.

### Calendar Storage Design

```
Table: listing_calendar
Primary Key: (listing_id, calendar_date)

Each row: 32 bytes
  listing_id:          16 bytes (UUID)
  calendar_date:       4 bytes (date)
  status:              1 byte (enum: AVAILABLE=0, BLOCKED=1, RESERVED=2, BOOKED=3)
  price_override:      4 bytes (nullable decimal)
  min_nights_override: 2 bytes (nullable smallint)
  source:              1 byte (enum)
  updated_at:          4 bytes (timestamp)

Total rows: 7M × 365 = 2.555B
Raw size: 2.555B × 32B = ~82 GB
With indexes: ~120 GB
```

**Range query optimization**: The composite primary key `(listing_id, calendar_date)` ensures all dates for a listing are physically adjacent on disk (clustered index). A range query `WHERE listing_id = X AND calendar_date BETWEEN '2025-07-15' AND '2025-07-20'` is a single sequential scan of 5 adjacent rows.

### iCal External Calendar Synchronization

Many hosts list on multiple platforms. Airbnb supports iCal (.ics) feed import/export to synchronize availability:

**Export**: Airbnb exposes a unique iCal feed URL per listing containing all booked/blocked dates. External platforms poll this URL periodically (typically every 15-60 minutes).

**Import**: Hosts provide external iCal feed URLs. Airbnb's iCal Sync Worker polls these feeds on a configurable interval:

```
FUNCTION syncExternalCalendar(listingId, icalUrl):
  // 1. Fetch external calendar
  icalData = HTTP.GET(icalUrl)
  externalEvents = parseICal(icalData)

  // 2. Get current sync-sourced blocks
  currentBlocks = DB.QUERY(
    "SELECT calendar_date FROM listing_calendar
     WHERE listing_id = $1 AND source = 'ICAL_SYNC' AND status = 'BLOCKED'",
    [listingId]
  )

  // 3. Diff: find dates to block and unblock
  externalDates = extractBlockedDates(externalEvents)
  datesToBlock = externalDates - currentBlocks   // New external bookings
  datesToUnblock = currentBlocks - externalDates  // Cancelled external bookings

  // 4. Apply changes (only for ICAL_SYNC sourced blocks)
  FOR EACH date IN datesToBlock:
    IF calendar[listingId][date].status == 'AVAILABLE':
      calendar[listingId][date] = { status: 'BLOCKED', source: 'ICAL_SYNC' }

  FOR EACH date IN datesToUnblock:
    IF calendar[listingId][date].source == 'ICAL_SYNC':
      calendar[listingId][date] = { status: 'AVAILABLE', source: 'ICAL_SYNC' }

  // 5. Publish calendar change events
  publishCalendarUpdateEvent(listingId, datesToBlock, datesToUnblock)
```

**The sync lag problem**: iCal polling has inherent latency (15-60 minutes between polls). During this window, a listing may appear available on Airbnb while it is booked on another platform. This can cause double-bookings.

**Mitigation strategies:**
- Shorter polling intervals for high-activity listings (every 5 minutes)
- Webhook-based sync for platforms that support it (real-time push instead of poll)
- "Buffer nights" around externally synced blocks (block 1 day before/after)
- Host education: recommend using Airbnb as the primary calendar and syncing outward

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Lock expires during slow payment auth | Lock released; another attempt may reserve the same dates | After payment auth, re-verify calendar status before creating booking |
| Redis node failure during lock hold | Lock state lost; another attempt may proceed | Database `FOR UPDATE` row lock as second barrier |
| Calendar DB write fails after lock acquired | Dates not reserved despite lock held | Catch exception, release lock, return error |
| Payment auth succeeds but calendar update fails | Guest charged but no booking created | Void the payment authorization; retry calendar update before voiding |
| Host blocks dates while booking is in progress | Conflict between manual block and booking reservation | Lock prevents concurrent modification; host block waits for lock release |

---

## Deep Dive 2: Search & Ranking at Scale

### Elasticsearch Index Architecture

```
Cluster: 3 master nodes + 12 data nodes + 3 coordinating nodes
Index: listings (7M documents)
Shards: 12 primary + 12 replica (1 replica per shard)
  → ~583K documents per shard
  → ~6 GB per shard (including inverted index + geo index)

Refresh interval: 30 seconds (near-real-time)
  → Calendar change events processed within 30-60s of occurrence
```

**Geo-point field**: Each listing document contains a `geo_point` field with latitude/longitude. Elasticsearch uses a BKD tree (Block K-Dimensional tree) to index geo-points, enabling efficient geo-distance and geo-bounding-box queries.

**Query execution flow:**

```
1. Coordinating node receives search request
2. Distributes query to all 12 primary shards (or replicas)
3. Each shard executes:
   a. geo_bounding_box filter → bitmap of matching documents
   b. Amenity/price/capacity filters → intersect bitmaps
   c. Score remaining documents using function_score
   d. Return top 200 by score
4. Coordinating node merges top 200 from each shard
5. Global top 200 forwarded to ML Ranking Service
6. ML Ranking re-scores and returns final top 20 (list) or all (map)
```

### ML Ranking: Two-Tower Architecture

Airbnb's search ranking uses a two-tower neural network for embedding-based retrieval:

```
Tower 1 (Query Tower):              Tower 2 (Listing Tower):
  Input features:                     Input features:
    - Search location                   - Listing location
    - Check-in/out dates                - Property type
    - Guest count                       - Amenities
    - User history embedding            - Review quality signals
    - Price preference                  - Photo quality score
    - Device type                       - Host response rate
                                        - Booking history

  ↓ Feed-forward layers               ↓ Feed-forward layers
  ↓ Output: query embedding (128-dim) ↓ Output: listing embedding (128-dim)

  Relevance = dot_product(query_embedding, listing_embedding)
```

**Inference pipeline:**
1. Listing embeddings are pre-computed and stored (updated daily)
2. Query embedding is computed at search time (~5ms)
3. Approximate nearest neighbor search finds top candidates (~10ms)
4. Full model scoring on candidates with additional features (~20ms)
5. Total ML inference overhead: ~35ms

### Index Freshness vs. Accuracy

**The problem**: When a listing is booked, the search index must be updated to remove it from available results. But with 30-second refresh intervals and event processing latency, there is a window where the index shows stale availability.

**Dual-read strategy:**

```
1. Elasticsearch returns candidate listings (may include stale results)
2. Search Service checks Redis availability cache for each candidate:
   - Redis key: "avail:{listing_id}:{date}" → status
   - Updated synchronously when calendar changes (sub-second)
3. Filter out candidates where Redis shows unavailable dates
4. Return only truly available listings to the client
```

**Cost**: The Redis availability check adds ~5ms per search (batch MGET for ~20 listings × date range). This is acceptable given the 800ms latency budget.

### Map vs. List Ranking Differences

**List results**: Traditional position-biased ranking. Users scan top-to-bottom; position 1 gets ~30% of clicks, position 10 gets ~3%. Ranking optimizes for NDCG (normalized discounted cumulative gain).

**Map results**: No sequential ordering. User attention distributes radially from map center with distance decay. Position in the list is irrelevant; geographic position is everything. Ranking optimizes for total booking probability across visible pins.

**Airbnb's key innovation (2024)**: The "Less Is More" principle for maps. Reducing the number of pins (by filtering out low-bookability listings) increases per-pin attention and overall booking rate. Their bookability filter reduced map pins by 39% while increasing bookings by 1.9%.

### Cache Strategy for Popular Searches

```
Cache hierarchy for search results:
  L1: Application-level LRU cache (in-process)
      - Key: hash(location, dates, guests, filters, page)
      - TTL: 60 seconds
      - Hit rate: ~15% (many unique queries)

  L2: Redis cache (shared across search service instances)
      - Key: "search:{normalized_query_hash}"
      - TTL: 5 minutes
      - Hit rate: ~25% (popular destinations + common date ranges)

  L3: Elasticsearch query cache (built-in)
      - Caches filter results at shard level
      - Hit rate: ~40% (geo filters and amenity filters are highly reusable)

  Combined cache hit rate: ~55-65%
```

---

## Deep Dive 3: Payment & Split Payout Architecture

### Payment Hold Pattern (Authorize-Then-Capture)

```
Timeline for a booking:

Day 0: Guest books for July 15-20
  → Payment Service creates authorization hold on guest's card
  → Hold amount: $942.38 (5 nights × $150 + $75 cleaning + $117.38 service fee)
  → Hold reference stored with booking record
  → Guest sees "pending charge" on bank statement

Days 1-6: Hold remains active
  → Card networks typically support 7-day holds
  → If booking is > 7 days out: re-authorization required

Day 7+ (if applicable): Re-authorization
  → Payment Service voids old hold, creates new authorization
  → Scheduled job runs daily for bookings with expiring holds
  → If re-auth fails: notify guest to update payment method (24h grace period)

July 15 (check-in day): Capture
  → Scheduled job identifies bookings with check_in = today
  → Payment Service calls gateway: capture(hold_ref, amount)
  → Converts hold to actual charge
  → Guest's "pending charge" becomes settled charge

July 16 (check-in + 24h): Host payout
  → Payout Service calculates host payout:
      Total charged: $942.38
      - Guest service fee: $117.38 (Airbnb keeps)
      - Host service fee: $22.50 (3% of $750 accommodation total)
      Host receives: $942.38 - $117.38 - $22.50 = $802.50
  → Payout initiated to host's bank account
  → Arrival: 1-5 business days depending on payment method
```

### Split Payout Architecture

For co-hosted listings, the payout must be split:

```
FUNCTION processSplitPayout(bookingId):
  booking = DB.getBooking(bookingId)
  hostPayoutAmount = booking.host_payout_amount  // $802.50

  // Get payout configuration for this listing
  payoutConfig = DB.QUERY(
    "SELECT user_id, split_percentage, payout_method_id
     FROM listing_payout_config
     WHERE listing_id = $1 ORDER BY split_percentage DESC",
    [booking.listing_id]
  )

  // Example: host gets 80%, co-host gets 20%
  FOR EACH config IN payoutConfig:
    payoutAmount = hostPayoutAmount * (config.split_percentage / 100)

    createPayout({
      booking_id: bookingId,
      host_id: config.user_id,
      amount: payoutAmount,
      currency: booking.currency,
      payout_method_id: config.payout_method_id,
      split_percentage: config.split_percentage,
      scheduled_at: booking.check_in + 24hours
    })
```

### Idempotency in Payment Operations

Every payment operation uses an idempotency key to prevent duplicate charges:

```
FUNCTION authorizePayment(bookingId, amount, paymentMethodId, idempotencyKey):
  // Check if this operation was already processed
  existing = DB.QUERY(
    "SELECT * FROM payments WHERE idempotency_key = $1", [idempotencyKey]
  )

  IF existing EXISTS:
    // Return cached result (same response as original call)
    RETURN existing.gateway_response

  // Process new authorization
  gatewayResponse = paymentGateway.authorize(amount, paymentMethodId)

  // Store result with idempotency key
  DB.INSERT("payments", {
    booking_id: bookingId,
    type: "AUTHORIZATION",
    amount: amount,
    status: gatewayResponse.success ? "AUTHORIZED" : "FAILED",
    gateway_ref: gatewayResponse.hold_ref,
    idempotency_key: idempotencyKey,
    gateway_response: gatewayResponse
  })

  RETURN gatewayResponse
```

### Refund Flows

```
Cancellation refund scenarios:

1. Guest cancels (within policy → full refund):
   → Void the authorization hold (if not yet captured)
   → No money was ever charged; hold simply disappears
   → Fastest refund: instant (hold release)

2. Guest cancels (outside policy → partial refund):
   → If hold not captured: void hold, create new auth for non-refundable portion, capture it
   → If already captured: issue partial refund to guest
   → Host payout adjusted to include their non-refundable portion

3. Host cancels:
   → Full refund to guest always
   → Host penalized: $50-$100 fee, calendar blocked, listing demoted in search
   → Guest receives 10% coupon for rebooking assistance

4. Dispute/damage claim:
   → Guest charged additional amount via stored payment method
   → Or deducted from security deposit hold (if applicable)
   → Mediation process if guest disputes charge
```

### Multi-Currency Handling

```
FUNCTION processBookingPayment(booking, guestPaymentMethod):
  listingCurrency = booking.currency          // Host's listing currency (e.g., EUR)
  guestCurrency = guestPaymentMethod.currency // Guest's card currency (e.g., USD)

  IF listingCurrency == guestCurrency:
    chargeAmount = booking.total_amount
    chargeCurrency = listingCurrency
  ELSE:
    // Convert at booking time, lock in exchange rate
    exchangeRate = fxService.getRate(listingCurrency, guestCurrency)
    chargeAmount = booking.total_amount * exchangeRate
    chargeCurrency = guestCurrency

    // Store exchange rate with booking for audit trail
    booking.exchange_rate = exchangeRate
    booking.guest_charge_amount = chargeAmount
    booking.guest_charge_currency = guestCurrency

  // Charge guest in their currency
  authorize(chargeAmount, chargeCurrency, guestPaymentMethod)

  // Payout host in listing currency (always)
  scheduleHostPayout(booking.host_payout_amount, listingCurrency)
```

---

## Deep Dive 4: Trust & Safety Architecture

### Risk Scoring Pipeline

Every booking attempt passes through a real-time risk scoring pipeline:

```
FUNCTION assessBookingRisk(guestId, listingId, bookingDetails):
  signals = collectSignals(guestId, listingId, bookingDetails)

  // Signal categories:
  // 1. Account signals
  accountAge = daysSince(guest.created_at)
  isVerified = guest.identity_verified
  previousBookings = guest.completed_booking_count
  previousCancellations = guest.cancellation_count
  averageRating = guest.avg_rating_as_guest

  // 2. Behavioral signals
  searchToBookRatio = guest.searches_today / max(guest.bookings_today, 1)
  messagePatterns = analyzeMessageContent(guest.recent_messages)
  ipReputation = ipReputationService.score(request.ip)
  deviceFingerprint = deviceService.getReputation(request.device_id)

  // 3. Payment signals
  paymentMethodAge = daysSince(guestPaymentMethod.added_at)
  paymentCountry = guestPaymentMethod.issuing_country
  billingAddressMatch = guestPaymentMethod.address_matches_profile

  // 4. Listing signals
  isHighValueListing = listing.base_price_per_night > percentile(90)
  listingFraudReports = listing.fraud_report_count

  // ML model scoring
  riskScore = riskModel.predict(signals)  // 0.0 (safe) to 1.0 (fraudulent)

  IF riskScore > 0.9:
    RETURN { action: "BLOCK", reason: "High fraud risk" }
  ELSE IF riskScore > 0.7:
    RETURN { action: "VERIFY", reason: "Additional verification required" }
  ELSE IF riskScore > 0.4:
    RETURN { action: "MONITOR", reason: "Elevated risk, proceed with monitoring" }
  ELSE:
    RETURN { action: "ALLOW" }
```

### Fake Listing Detection

```
Indicators of fraudulent listings:
1. Stock photos (reverse image search matching)
2. Pricing significantly below market rate (> 40% below comparables)
3. New host with no verification, listing in high-demand area
4. Description copy-pasted from other listings (similarity detection)
5. Multiple listings created rapidly from same account/device
6. Listing address does not correspond to a real property (geocoding validation)

Detection pipeline:
  New listing created
    → Photo analysis (stock image detection + duplicate check)
    → Text analysis (plagiarism detection + spam classifier)
    → Price anomaly detection (vs. comparable listings)
    → Geocoding validation (address → coordinates → satellite verification)
    → Account risk assessment (host history + verification status)
    → If flagged: queue for human review before publishing
```

---

## Bottleneck Analysis

### Hot Listing Problem

**Symptom**: A viral listing (featured in media, celebrity home, unique property) receives thousands of views and dozens of booking attempts per minute.

**Impact chain:**
1. Search: listing appears in thousands of search results → high read load
2. Listing page: thousands of concurrent page views → CDN handles photos, but metadata and reviews hit origin
3. Calendar check: every viewer checks availability → Redis availability cache absorbs this
4. Booking attempts: dozens of concurrent booking attempts → distributed lock serializes them
5. Lock contention: only 1 attempt proceeds at a time; others wait/fail

**Mitigations:**
- **Read path**: Cache listing metadata in Redis with 5-minute TTL; serve reviews from read replicas; CDN for photos
- **Calendar reads**: Redis availability cache absorbs 99% of reads; only booking attempts need the database
- **Booking writes**: Accept lock contention as correct behavior (only 1 booking can succeed). Implement a waiting queue for hot listings: instead of immediate 409 Conflict, offer "You're in line, estimated wait: 30 seconds"
- **Search index**: Do not update the search index more than once per 30 seconds per listing, even if multiple events arrive

### Peak Season Calendar Lock Contention

**Symptom**: During peak booking season (January for summer rentals), booking attempt volume spikes 3-5x. Lock contention on popular listings increases proportionally.

**Mitigations:**
- **Lock timeout tuning**: Reduce lock TTL from 10s to 5s during peak periods (faster lock release on abandoned attempts)
- **Early availability check**: Before acquiring the lock, do a quick Redis-cached availability check. If dates show as unavailable in cache, return immediately without attempting the lock
- **Batch booking windows**: For extremely hot listings (detected by booking attempt rate), implement a "lottery" system: collect booking requests for 60 seconds, then process the first valid one

### Elasticsearch Update Lag

**Symptom**: A listing is booked, but for 30-60 seconds it still appears as available in search results. Guests click through, attempt to book, and get a 409 Conflict.

**Mitigations:**
- **Dual-read strategy** (described in Search deep dive): Redis availability cache as a fast-path filter
- **Client-side booking attempt handling**: When 409 is returned, show "These dates were just booked. Here are similar listings nearby" instead of a generic error
- **Priority event processing**: Calendar change events for bookings are processed ahead of other events in the indexing pipeline

---

## Race Conditions & Concurrency Scenarios

### Scenario 1: Concurrent Booking Attempts for Same Dates

```
Guest A and Guest B both attempt to book Listing X for July 15-20:

T=0ms:  Guest A → Booking Service → Availability Service → ACQUIRE lock("avail:X")
T=5ms:  Lock acquired by Guest A
T=10ms: Guest B → Booking Service → Availability Service → ACQUIRE lock("avail:X")
T=11ms: Lock NOT acquired → Guest B receives 409 Conflict immediately

T=50ms:  Guest A → calendar check → all dates AVAILABLE
T=60ms:  Guest A → UPDATE calendar SET status='RESERVED'
T=70ms:  Guest A → RELEASE lock
T=80ms:  Guest A → Payment Service → authorize($942.38)
T=1500ms: Authorization successful
T=1510ms: Booking created, status=CONFIRMED

Guest B can retry after lock release (T=70ms):
T=100ms: Guest B retries → ACQUIRE lock("avail:X") → acquired
T=150ms: Guest B → calendar check → dates now RESERVED → 409 Conflict

Result: Guest A succeeds, Guest B fails cleanly. No double-booking possible.
```

### Scenario 2: Host Blocks Calendar While Guest Is Booking

```
T=0ms:   Guest → Availability Service → ACQUIRE lock("avail:X") → acquired
T=5ms:   Host → Calendar API → block July 17 → Availability Service → ACQUIRE lock("avail:X")
T=6ms:   Host's lock attempt fails → Host receives: "Calendar update in progress, try again"
T=50ms:  Guest's availability check succeeds → dates reserved
T=70ms:  Lock released
T=100ms: Host retries → lock acquired → UPDATE July 17 → but status is RESERVED not AVAILABLE
T=101ms: Host's block fails: "Date July 17 is currently reserved by a booking"

Result: Booking takes priority. Host can block after booking is cancelled (if it is).
```

### Scenario 3: Lock Expires During Slow Payment Authorization

```
T=0ms:    Guest → ACQUIRE lock("avail:X", TTL=10s) → acquired
T=50ms:   Calendar check → all dates AVAILABLE → UPDATE to RESERVED
T=70ms:   Lock released (dates are RESERVED in DB, lock is no longer needed)
T=80ms:   Payment authorization begins (slow gateway: 8 seconds)

T=5000ms: Another guest → ACQUIRE lock("avail:X") → acquired
T=5050ms: Calendar check → dates are RESERVED (not AVAILABLE)
T=5051ms: → 409 Conflict → lock released

T=8080ms: Original guest's payment auth returns SUCCESS
T=8100ms: Booking created → status CONFIRMED → calendar updated to BOOKED

Alternative: Payment auth FAILS at T=8080ms:
T=8100ms: Booking Service → release reservation → UPDATE calendar SET status='AVAILABLE'
T=8110ms: Publish calendar_dates_released event

Result: The DB reservation status (RESERVED) protects against the race even after the
lock expires. The lock is only needed during the check-and-reserve phase.
```

### Scenario 4: Partial Date Overlap Between Concurrent Bookings

```
Guest A books July 15-20, Guest B books July 18-25 (overlap: July 18-20):

T=0ms:  Guest A → ACQUIRE lock("avail:X") → acquired
T=5ms:  Guest B → ACQUIRE lock("avail:X") → fails → 409

T=50ms: Guest A checks July 15-20 → all AVAILABLE → reserves all 6 dates
T=70ms: Lock released

T=100ms: Guest B retries → ACQUIRE lock → acquired
T=150ms: Guest B checks July 18-25 → July 18-20 are RESERVED → 409 Conflict

Result: Even partial overlap is correctly detected. Guest B must find different dates.
```
