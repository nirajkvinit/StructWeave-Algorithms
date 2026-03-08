# Requirements & Estimations

## Functional Requirements

### Core Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Property Search** | Search by destination (city, region, map area), dates (check-in/check-out), guests (adults, children), rooms; filter by price, star rating, amenities, property type, review score, cancellation policy |
| F2 | **Room Availability** | Display real-time availability per room type for the requested date range; show remaining room count ("Only 2 rooms left!") to create urgency |
| F3 | **Rate Display** | Show applicable rate for each room type based on dates, guest count, rate plan (flexible, non-refundable, package); display total price with taxes and fees breakdown |
| F4 | **Booking Flow** | Select room type and rate plan → enter guest details → payment → confirmation; support guest checkout (no account required) |
| F5 | **Rate Management** | Property managers set BAR (Best Available Rate), seasonal rates, length-of-stay pricing, promotional rates, closed-to-arrival dates, minimum stay restrictions |
| F6 | **Channel Distribution** | Synchronize availability and rates across multiple OTA channels via channel manager integration; update all channels within seconds of a booking |
| F7 | **Review System** | Guests submit reviews after checkout; reviews are verified (must have completed a stay); display aggregate scores (cleanliness, location, value, etc.) |
| F8 | **Booking Management** | View, modify, or cancel reservations; handle free cancellation vs. penalty-based cancellation; process refunds |
| F9 | **Property Extranet** | Dashboard for property managers: manage rooms, rates, availability, photos, policies, view bookings and revenue analytics |
| F10 | **Notifications** | Booking confirmation, check-in reminders, review requests, rate change alerts, availability warnings |
| F11 | **Loyalty Program** | Tiered rewards (points per booking), member-only rates, free night certificates |
| F12 | **Guest Communication** | In-platform messaging between guest and property for pre-arrival requests |

### User Roles

| Role | Capabilities |
|------|-------------|
| **Guest** | Search, book, manage bookings, write reviews, loyalty program participation |
| **Property Manager** | Manage listings, set rates and availability, respond to reviews, view analytics, configure policies |
| **Revenue Manager** | Yield management, competitive rate analysis, overbooking configuration, channel distribution strategy |
| **Platform Admin** | Property verification, review moderation, fraud investigation, system configuration |
| **Channel Manager** | API-based availability and rate synchronization, booking notification relay |

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Search Latency** | p50 < 800ms, p99 < 2s | Complex geo + filter + availability queries across millions of properties |
| **Booking Completion** | p99 < 3s | Hold + payment + confirmation pipeline |
| **Search Availability** | 99.9% | Degraded mode acceptable (cached results, reduced filters) |
| **Booking Availability** | 99.99% | Revenue-critical path; downtime = lost bookings |
| **Inventory Consistency** | Strongly consistent | Platform is authoritative; overbooking beyond tolerance = guest walk-outs |
| **Channel Sync Latency** | < 5 seconds | Availability changes must propagate to all channels quickly to prevent cross-channel overbooking |
| **Data Durability** | 99.9999% | Reservation and payment records must never be lost |
| **Rate Freshness** | Real-time | Rate changes by property managers must be immediately visible to searchers |
| **Concurrent Searches** | 5,800/s at peak | 10× average load |
| **Concurrent Bookings** | 175/s at peak | 10× average load |

---

## Capacity Estimations

### Traffic

```
Daily searches:        50,000,000 (50M)
Search-to-book ratio:  ~50:1 (higher intent than flights; users search with specific dates)
Daily bookings:        1,500,000 (1.5M)

Average searches/sec:  50M / 86,400 ≈ 580 searches/sec
Peak searches/sec:     580 × 10 = 5,800 searches/sec

Average bookings/sec:  1.5M / 86,400 ≈ 17.4 bookings/sec
Peak bookings/sec:     17.4 × 10 = 174 bookings/sec
```

### Availability Updates

```
Active properties:             28,000,000 (28M)
Avg room types per property:   5
Properties updating per day:   2M (active properties adjusting rates/availability)
Avg updates per property/day:  10 (rate changes, manual adjustments, bookings)
Total availability updates/day: 2M × 10 = 20M updates/day
Channel sync events/day:       20M × 3 avg channels = 60M channel pushes/day
Channel sync events/sec:       60M / 86,400 ≈ 694/sec
```

### Storage

```
--- Property Database ---
Properties:                    28,000,000
Property record size:          ~5 KB (name, address, description, policies, photos metadata)
Total property data:           28M × 5 KB = 140 GB

--- Availability Matrix ---
Active properties with inventory: 2,000,000 (actively bookable)
Room types per property:       5
Calendar depth:                365 days
Availability records:          2M × 5 × 365 = 3.65 billion records
Record size:                   ~100 bytes (date, room_type_id, total_inventory, booked, rate, restrictions)
Total availability data:       3.65B × 100B = 365 GB
Hot availability (next 90 days): ~90 GB (fits in memory with sharding)

--- Reservation Database ---
Bookings per day:              1,500,000
Average stay:                  2.4 nights
Reservation record size:       ~2 KB (guest info, room, dates, rate, payment, status)
RoomNight records per booking: 2.4
Daily reservation growth:      1.5M × 2 KB = 3 GB/day
Annual reservation growth:     3 GB × 365 = 1.1 TB/year
5-year retention:              5.5 TB

--- Review Database ---
Reviews per day:               ~500,000 (not all guests review)
Review record size:            ~1 KB (scores, text, metadata)
Annual review growth:          500K × 365 × 1 KB = 182 GB/year

--- Search Index ---
Indexed properties:            28M
Index entry size:              ~2 KB (location, amenities, scores, pricing summary)
Total index size:              28M × 2 KB = 56 GB

--- Photo Storage ---
Photos per property:           30 average
Photo size:                    500 KB average (compressed, multiple sizes)
Total photo storage:           28M × 30 × 500 KB = 420 TB
```

### Bandwidth

```
Search response size:          ~80 KB (compressed, 25 results with thumbnails and rates)
Peak search bandwidth:         5,800 × 80 KB = 464 MB/s outbound
Booking request size:          ~3 KB
Booking response size:         ~5 KB
Peak booking bandwidth:        174 × 8 KB = 1.4 MB/s (negligible)
Channel sync payload:          ~500 bytes per update
Peak channel bandwidth:        694 × 500B = 347 KB/s (negligible)
```

---

## SLO / SLA Table

| Service | Metric | SLO | SLA | Measurement |
|---------|--------|-----|-----|-------------|
| Property Search | Latency p50 | < 800ms | < 1.5s | End-to-end including availability check |
| Property Search | Latency p99 | < 2s | < 3s | Worst-case with complex filters |
| Property Search | Availability | 99.9% | 99.5% | Degraded results acceptable |
| Availability Check | Latency p99 | < 200ms | < 500ms | Per-property availability lookup |
| Booking Hold | Latency p99 | < 1s | < 2s | Inventory decrement + hold creation |
| Booking Hold | Success rate | > 97% | > 95% | Sold-out and concurrent booking failures expected |
| Payment & Confirm | Latency p99 | < 3s | < 5s | Payment gateway + confirmation |
| Payment & Confirm | Success rate | > 99% | > 97% | Payment gateway reliability |
| Booking Service | Availability | 99.99% | 99.95% | Revenue-critical |
| Channel Sync | Propagation latency | < 5s | < 15s | From booking to all-channel update |
| Channel Sync | Delivery rate | 99.9% | 99.5% | Retry on channel failure |
| Rate Update | Propagation latency | < 2s | < 5s | From manager change to search visibility |
| Review Submission | Latency p99 | < 1s | < 2s | Review write acknowledgment |
| Review Display | Freshness | < 5 min | < 15 min | Review visible after moderation |

---

## Key Estimation Insights

1. **Availability matrix fits in memory with sharding**: The hot 90-day availability window is ~90 GB. Sharded across 10 nodes, each node holds ~9 GB in memory---enabling sub-millisecond availability lookups. This is the single most important performance decision.

2. **Channel sync volume is manageable**: At ~694 events/sec, channel synchronization is not a throughput challenge. The challenge is latency and reliability---every update must reach every channel within seconds, with retry on failure.

3. **Photo storage dominates**: At 420 TB, property photos dwarf all other storage. A CDN with multiple resolution variants and lazy loading is essential.

4. **Search bandwidth is significant**: At 464 MB/s peak, search responses need compression, pagination, and CDN caching of static property data (photos, descriptions) to reduce origin bandwidth.

5. **Booking volume is modest per-second**: At 174 bookings/sec peak, the challenge is not throughput but contention---many bookings competing for the same room on the same dates.
