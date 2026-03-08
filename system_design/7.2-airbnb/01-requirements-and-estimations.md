# Requirements & Estimations

## 1. Functional Requirements

### 1.1 Core Features

#### Search & Discovery
- **Location-based search**: Search by city, neighborhood, map bounds, or landmark with configurable radius
- **Date-range filtering**: Available listings for specific check-in/check-out dates
- **Guest capacity filtering**: Match listings to party size (adults, children, infants, pets)
- **Advanced filters**: Price range, property type, amenities, instant book, superhost, accessibility
- **Map view**: Interactive map with listing pins, zoom-responsive re-query, and cluster aggregation
- **Saved searches & wishlists**: Users can save searches and bookmark listings

#### Listing Management (Host)
- **Create/edit listing**: Title, description, photos, amenities, house rules, location, capacity
- **Calendar management**: Block/unblock dates, set per-date pricing overrides, minimum stay rules
- **Booking preferences**: Instant book or request-to-book mode, cancellation policy selection
- **iCal sync**: Import/export calendar via iCal feed for cross-platform synchronization
- **Co-hosting**: Invite co-hosts with configurable permissions and payout splits

#### Booking Flow
- **Search → Select → Reserve**: Browse results, view listing detail, select dates, confirm
- **Instant Book**: Immediate confirmation without host approval (if enabled)
- **Request to Book**: Guest sends request → host approves/declines within 24 hours
- **Payment hold**: Authorize guest payment at booking creation (do not capture yet)
- **Booking modification**: Change dates or guest count (subject to availability and repricing)
- **Cancellation**: Guest cancels (refund per policy), host cancels (penalties apply)

#### Payment & Payouts
- **Guest payment**: Authorize at booking, capture at check-in (T-0)
- **Host payout**: Disburse 24 hours after guest check-in
- **Split payouts**: Configurable percentage split between host and co-hosts
- **Service fees**: Guest service fee (~14%) + host service fee (~3%) deducted by platform
- **Multi-currency**: Support 40+ currencies, automatic conversion at booking time
- **Refunds**: Policy-based automatic refunds for eligible cancellations

#### Reviews & Ratings
- **Dual review**: Guest reviews listing; host reviews guest (revealed simultaneously after both submit or 14-day deadline)
- **Rating dimensions**: Overall rating, cleanliness, accuracy, check-in, communication, location, value
- **Review eligibility**: Only guests with completed stays can review (booking-verified)
- **Response**: Hosts can post a public response to reviews

#### Messaging
- **Host-guest messaging**: Real-time chat within booking context
- **Pre-booking inquiries**: Guests can message hosts before booking
- **Automated messages**: Host-configured auto-replies for common questions
- **Content moderation**: Detect and filter contact info exchange to prevent off-platform booking

#### Trust & Safety
- **Identity verification**: Government ID + selfie match for guests and hosts
- **Background checks**: Host screening in applicable jurisdictions
- **Fraud detection**: ML-based scoring at booking time (fake listings, stolen cards, account takeover)
- **Damage claims**: Security deposit or AirCover claim workflow (evidence submission, mediation)
- **Emergency support**: 24/7 safety hotline with trip context

#### Dynamic Pricing
- **Smart Pricing**: ML-based price suggestions for hosts based on demand, seasonality, local events, comparable listings
- **Price tips**: Visual indicators showing when host price is above/below market rate
- **Minimum/maximum price bounds**: Host-configured guardrails for smart pricing

### 1.2 Out of Scope
- Airbnb Experiences (activity bookings)
- Long-term stay management (30+ days)
- Property management software features
- Host insurance underwriting details
- Regulatory compliance per jurisdiction (short-term rental laws)

---

## 2. Non-Functional Requirements

### 2.1 Availability
| Component | Target | Rationale |
|-----------|--------|-----------|
| Booking Service | 99.99% (52 min/year downtime) | Revenue-critical; downtime = lost bookings |
| Search Service | 99.9% (8.7 hr/year downtime) | Degraded experience but not revenue loss |
| Payment Service | 99.99% | Financial transactions require highest reliability |
| Calendar Service | 99.99% | Availability data integrity is critical for preventing double-bookings |
| Messaging Service | 99.9% | Communication can tolerate brief outages |
| Review Service | 99.5% | Reviews are read-heavy and non-urgent |

### 2.2 Latency
| Operation | Target (p99) | Rationale |
|-----------|--------------|-----------|
| Search query (list view) | < 800ms | User engagement drops sharply beyond 1s |
| Search query (map view) | < 600ms | Map interaction requires near-instant feedback |
| Booking creation | < 500ms | Lock acquisition + payment auth must be fast |
| Calendar availability check | < 100ms | High-frequency check during search and booking |
| Listing page load | < 400ms | Mostly cached data + CDN-served photos |
| Payment authorization | < 2s | External gateway dependency |
| Review submission | < 300ms | Simple write operation |

### 2.3 Consistency
| Domain | Model | Rationale |
|--------|-------|-----------|
| Calendar/Availability | **Strong (CP)** | Double-booking is unacceptable; linearizable reads required |
| Bookings | **Strong (CP)** | Financial transactions require ACID guarantees |
| Payments | **Strong (CP)** | Money movement must be exactly-once |
| Search Index | **Eventual (AP)** | 1-5 minute lag is acceptable; availability refreshes matter but not real-time |
| Reviews | **Eventual (AP)** | Reviews are immutable once posted; delay is fine |
| Pricing Suggestions | **Eventual (AP)** | Pricing models update hourly/daily |
| Messaging | **Eventual (AP)** | Brief delivery delays are tolerable |

### 2.4 Durability & Data Integrity
- Zero booking data loss (RPO = 0 for booking and payment records)
- Calendar state must survive any single-node failure
- Photo storage with 99.999999999% durability (11 nines, object storage)
- Audit trail for all payment transactions (append-only log)

---

## 3. Capacity Estimations

### 3.1 User & Listing Scale

```
Total registered users:          150M
Monthly active users (MAU):      50M
Daily active users (DAU):        15M
Active listings:                 7M
Average photos per listing:      25
Average listing description:     2 KB text
```

### 3.2 Search Traffic

```
DAU searching:                   15M users
Average searches per user/day:   5
Total daily searches:            75M
Peak-to-average ratio:           3x
Peak daily searches:             225M

Peak search QPS:
  = 225M / 86,400s
  = ~2,600 searches/s (average during peak day)

  Peak hour (20% of daily traffic in 4 hours):
  = 225M × 0.20 / (4 × 3,600)
  = ~3,125 searches/s

  Burst peak (2x peak hour):
  ≈ 6,250 searches/s

  → Design for: ~10K search QPS (headroom)
```

### 3.3 Booking Traffic

```
Daily bookings:                  1.5M (average)
Peak season bookings/day:        2.5M
Peak-to-average ratio:           3x (holiday spikes)
Peak booking QPS:
  = 2.5M / 86,400
  = ~29 bookings/s (average peak day)

  Peak hour concentration (30% in 4 hours):
  = 2.5M × 0.30 / (4 × 3,600)
  = ~52 bookings/s

  With booking attempts (5x conversion):
  = 52 × 5
  = ~260 booking attempts/s

  → Design for: ~500 booking attempts/s (headroom)
```

### 3.4 Calendar Operations

```
Listings:                        7M
Days per listing calendar:       365
Total calendar cells:            7M × 365 = 2.555B

Calendar reads (search availability checks):
  Each search checks ~20 listings × date range
  At 10K search QPS: 10K × 20 = 200K calendar reads/s

Calendar writes:
  Host calendar updates:         ~100K/day (block/unblock/price changes)
  Booking-triggered updates:     ~2.5M/day (marking dates as booked)
  iCal sync updates:             ~500K/day
  Total:                         ~3.1M calendar writes/day
  Peak write QPS:                ~100 writes/s

  → Design for: 200K calendar reads/s, 200 calendar writes/s
```

### 3.5 Storage Estimates

```
Listing metadata:
  7M listings × 5 KB each        = 35 GB
  (title, description, amenities, rules, location)

Calendar data:
  2.555B rows × 32 bytes each    = ~82 GB
  (listing_id, date, status, price_override)

Booking records:
  500M total bookings × 1 KB     = 500 GB
  Growing at 1.5M/day × 1 KB     = 1.5 GB/day

Payment records:
  500M bookings × 3 records × 512B = 750 GB
  (auth, capture, payout per booking)

Reviews:
  500M reviews × 2 KB each       = 1 TB

Messages:
  2B messages × 512 bytes        = 1 TB

Photos (references only, actual in object storage):
  7M × 25 photos × 256B ref      = 45 GB

Photos (object storage):
  7M × 25 photos × 2 MB avg      = 350 TB

Search index (Elasticsearch):
  7M listings × 10 KB indexed     = 70 GB

  → Total database storage: ~3.5 TB (excluding photos)
  → Object storage: ~350 TB (photos)
  → Search index: ~70 GB
```

### 3.6 Bandwidth

```
Search response payload:
  20 results × 2 KB each = 40 KB per search
  At 10K QPS: 10K × 40 KB = 400 MB/s outbound

Listing page load:
  Metadata: 5 KB + 25 photo thumbnails × 100 KB = 2.5 MB
  CDN handles 95% of photo traffic
  Origin: ~5% × listing page views

Photo uploads:
  New listings: ~10K/day × 25 photos × 5 MB = 1.25 TB/day upload
  Updated photos: ~50K/day × 5 photos × 5 MB = 1.25 TB/day upload
  Total: ~2.5 TB/day photo upload

  → CDN bandwidth: multi-TB/day for photo delivery
  → Origin bandwidth: ~500 MB/s peak
```

---

## 4. SLOs and SLAs

### 4.1 Service Level Objectives

| Service | SLO Metric | Target | Measurement Window |
|---------|-----------|--------|-------------------|
| Search | Availability | 99.9% | Rolling 30 days |
| Search | p99 latency | < 800ms | Rolling 1 hour |
| Search | Result relevance (booking rate) | > 2.5% | Rolling 7 days |
| Booking | Availability | 99.99% | Rolling 30 days |
| Booking | p99 latency | < 500ms | Rolling 1 hour |
| Booking | Double-booking rate | 0% | Rolling 30 days |
| Calendar | Availability | 99.99% | Rolling 30 days |
| Calendar | Lock acquisition p99 | < 100ms | Rolling 1 hour |
| Calendar | Sync lag to search index | < 5 min (p99) | Rolling 1 hour |
| Payment | Availability | 99.99% | Rolling 30 days |
| Payment | Auth success rate | > 98% | Rolling 24 hours |
| Payment | Payout accuracy | 100% | Rolling 30 days |
| Photo CDN | Cache hit ratio | > 95% | Rolling 24 hours |
| Photo CDN | p95 load time | < 500ms | Rolling 1 hour |

### 4.2 Error Budgets

| Service | SLO | Monthly Error Budget | Implication |
|---------|-----|---------------------|-------------|
| Booking | 99.99% | 4.3 minutes | Any incident consuming >2 min triggers post-mortem |
| Search | 99.9% | 43.8 minutes | Allows for rolling deployments and brief degradation |
| Payment | 99.99% | 4.3 minutes | Circuit breaker to payment gateway backup on failure |

### 4.3 Key SLA Commitments

| Commitment | Target | Penalty |
|-----------|--------|---------|
| Booking confirmation delivery | < 30 seconds | N/A (internal) |
| Host payout after check-in | Within 24 hours | Customer support escalation |
| Cancellation refund processing | Within 5 business days | Expedited processing |
| Photo processing (upload to CDN) | < 5 minutes | Retry with user notification |
| Identity verification | < 24 hours | Manual review escalation |
