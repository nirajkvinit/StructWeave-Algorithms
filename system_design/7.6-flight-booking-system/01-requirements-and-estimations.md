# Requirements & Estimations

## Functional Requirements

### Core Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Flight Search** | Search by origin, destination, dates (one-way, round-trip, multi-city), passenger count, cabin class; filter by non-stop, airline, departure time, price range |
| F2 | **Fare Comparison** | Display multiple fare options per flight with fare family details (Basic Economy, Main Cabin, Flexible), restrictions, and total price including taxes |
| F3 | **Seat Selection** | Display interactive seat map by aircraft type; allow seat selection with pricing for premium seats |
| F4 | **Booking Hold** | Temporarily hold a selected seat/fare for 15 minutes during checkout; release on expiry |
| F5 | **Payment & Ticketing** | Process payment; on success, issue e-ticket via GDS; generate e-ticket confirmation |
| F6 | **PNR Management** | Create, retrieve, modify, and cancel bookings via PNR code; support itinerary changes with fare difference calculation |
| F7 | **Itinerary Management** | Support multi-city and connecting flights; validate minimum connection times and interline agreements |
| F8 | **Web Check-in** | Enable online check-in 24-48 hours before departure; generate boarding pass (PDF/mobile) |
| F9 | **Ancillary Services** | Upsell baggage, meals, seat upgrades, travel insurance, lounge access during and after booking |
| F10 | **Refunds & Cancellations** | Calculate refund amount based on fare rules (refundable vs. non-refundable, change fees, tax refunds); process refund to original payment method |
| F11 | **Price Alerts** | Notify users when fare drops below target price for a specific route and date range |
| F12 | **Multi-Passenger Booking** | Support mixed passenger types (adult, child, infant) with different fare calculations per type |

### User Roles

| Role | Capabilities |
|------|-------------|
| **Traveler** | Search, book, manage bookings, check-in, set price alerts |
| **Travel Agent** | All traveler capabilities + bulk booking, commission tracking, PNR queue management |
| **Airline Admin** | Inventory management, fare filing, schedule updates, flight status |
| **Platform Admin** | System configuration, GDS connection management, analytics, fraud review |

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Search Latency** | p50 < 1.5s, p99 < 3s | Aggregating from 5+ GDS/NDC sources with variable latency |
| **Booking Completion** | p99 < 5s | Hold + payment + ticketing pipeline |
| **Search Availability** | 99.9% | Degraded mode acceptable (cached results, fewer providers) |
| **Booking Availability** | 99.99% | Revenue-critical path; downtime = lost bookings |
| **Seat Hold Duration** | 15 minutes | Industry standard; GDS-enforced |
| **Seat Hold Guarantee** | Strongly consistent | GDS is authoritative; local state must not conflict |
| **Data Durability** | 99.9999% | PNR and payment records must never be lost |
| **Fare Freshness** | < 5 minutes stale | Fares change frequently; cached results re-verified at booking |
| **Concurrent Searches** | 11,600/s at peak | 10× average load |
| **Concurrent Bookings** | 110/s at peak | 10× average load |

---

## Capacity Estimations

### Traffic

```
Daily searches:        100,000,000 (100M)
Search-to-book ratio:  100:1
Daily bookings:        1,000,000 (1M)

Average searches/sec:  100M / 86,400 ≈ 1,160 searches/sec
Peak searches/sec:     1,160 × 10 = 11,600 searches/sec

Average bookings/sec:  1M / 86,400 ≈ 11.6 bookings/sec
Peak bookings/sec:     11.6 × 10 = 116 bookings/sec
```

### External API Fan-Out

```
GDS/NDC providers per search:  5 (Amadeus, Sabre, Travelport, airline NDC, LCC portal)
External API calls at peak:    11,600 × 5 = 58,000 calls/sec

GDS API latency:              500ms - 2,000ms (provider-dependent)
GDS cost per API call:         $0.50 - $2.00 (varies by contract)
Daily GDS API cost:            100M × 5 × $0.75 avg = $375M (drives aggressive caching)
With 80% cache hit rate:       100M × 0.2 × 5 × $0.75 = $75M/day
```

### Storage

```
--- Seat Inventory ---
Active flights (global):      100,000 flights/day
Seats per flight:             200 average
Fare classes per flight:       26 (Y, B, M, H, K, Q, etc.)
Inventory records:            100K × 26 = 2.6M fare-class records
Record size:                   ~500 bytes
Total inventory:              2.6M × 500B = 1.3 GB (fits in memory)

--- PNR Database ---
Bookings per day:             1,000,000
Average segments per booking:  2.5 (round-trip + connections)
PNR record size:              ~2 KB (all segments, passengers, payments)
Daily PNR growth:             1M × 2 KB = 2 GB/day
Annual PNR growth:            2 GB × 365 = 730 GB/year
5-year retention:             3.65 TB

--- Search Result Cache ---
Unique route-date combinations: ~500,000 popular routes
Cache entry size:              ~50 KB (top 100 results per route)
Total cache:                  500K × 50 KB = 25 GB (Redis cluster)
Cache TTL:                    3-5 minutes
Cache hit rate target:         80%+ for popular routes

--- Passenger Data ---
Passengers per booking:        1.8 average
Daily passenger records:       1.8M
Passenger record size:         ~1 KB
Annual passenger growth:       1.8M × 365 × 1 KB = 657 GB/year
```

### Bandwidth

```
Search response size:          ~100 KB (compressed, 50 results with fare details)
Peak search bandwidth:         11,600 × 100 KB = 1.16 GB/s outbound
Booking request size:          ~5 KB
Booking response size:         ~10 KB
Peak booking bandwidth:        116 × 15 KB = 1.74 MB/s (negligible)
```

---

## SLO / SLA Table

| Service | Metric | SLO | SLA | Measurement |
|---------|--------|-----|-----|-------------|
| Flight Search | Latency p50 | < 1.5s | < 2s | End-to-end including GDS fan-out |
| Flight Search | Latency p99 | < 3s | < 5s | Worst-case with timeout fallback |
| Flight Search | Availability | 99.9% | 99.5% | Degraded results acceptable |
| Flight Search | Cache hit rate | > 80% | > 70% | Popular routes should be cached |
| Booking Hold | Latency p99 | < 3s | < 5s | GDS PNR creation included |
| Booking Hold | Success rate | > 95% | > 90% | Sold-out and GDS errors expected |
| Payment & Ticketing | Latency p99 | < 5s | < 8s | Payment + GDS ticketing |
| Payment & Ticketing | Success rate | > 99% | > 97% | Payment gateway + GDS both must succeed |
| Booking Service | Availability | 99.99% | 99.95% | Revenue-critical |
| PNR Retrieval | Latency p99 | < 500ms | < 1s | Local DB lookup |
| Seat Map | Latency p99 | < 2s | < 3s | GDS seat map API call |
| Price Alerts | Delivery latency | < 30 min | < 1 hour | From price drop detection to notification |
| E-ticket Generation | Delivery | < 5 min | < 15 min | After payment confirmation |

---

## Key Estimation Insights

1. **GDS cost drives caching strategy**: At $0.75 per API call average, uncached search would cost $375M/day. An 80% cache hit rate reduces this to $75M/day---caching is not optional, it is an economic necessity.

2. **Fan-out amplification**: A single user search generates 5+ external API calls. At 11,600 peak searches/sec, this means 58,000 external calls/sec---circuit breakers and timeouts are critical.

3. **Inventory fits in memory**: 2.6M fare-class records at 500 bytes each = 1.3 GB. This can be held in memory for fast availability checks, with GDS as authoritative source for writes.

4. **Search bandwidth dominates**: At 1.16 GB/s peak outbound for search responses, CDN and compression are essential. Booking traffic is negligible in comparison.

5. **PNR storage is modest**: At 730 GB/year, PNR data is not a storage scaling challenge. The challenge is consistency and cross-system synchronization.
