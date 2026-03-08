# Hotel Booking System Design

## System Overview

A hotel booking system---exemplified by Booking.com, Expedia Hotels, and Agoda---orchestrates property search, room availability management, rate calculation, reservation processing, and guest lifecycle management across a fragmented ecosystem of properties, channel managers, and Online Travel Agencies (OTAs). Booking.com lists over 28 million accommodation options and processes 1.5 million+ bookings per day. The core engineering challenge is the intersection of **availability management** (maintaining a real-time availability matrix of property × room_type × date → inventory across thousands of properties with concurrent modifications), **rate complexity** (BAR pricing, negotiated rates, length-of-stay pricing, seasonal adjustments, and rate parity enforcement across distribution channels), **overbooking strategy** (statistical models based on historical no-show rates that intentionally sell beyond physical capacity to maximize revenue), **channel synchronization** (real-time two-way sync of availability and rates across 400+ OTAs via channel managers), and **booking contention** (hundreds of users viewing the same "last room available" while only one can book it). Unlike flight booking, which depends on external GDS systems for inventory truth, hotel booking platforms typically own or directly manage the inventory data---making the platform itself the authoritative system for availability, with all the consistency and concurrency challenges that entails.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Extremely read-heavy: 50:1 search-to-book ratio; searches query availability matrix across date ranges and filters |
| **Latency Sensitivity** | High---search p99 < 2s with complex filtering; booking confirmation p99 < 3s |
| **Consistency Model** | Strong consistency for inventory and reservations (platform is authoritative); eventual consistency for search results and reviews |
| **Data Volume** | High---50M+ searches/day, 1.5M+ bookings/day, 28M+ property listings, 365-day availability calendars per property |
| **Architecture Model** | Search-index-first for discovery; event-driven for availability propagation; saga-based for booking with payment |
| **Rate Complexity** | High---BAR rates, negotiated corporate rates, package rates, LOS pricing, seasonal adjustments, promotional rates, rate parity rules |
| **Complexity Rating** | **High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Availability race conditions, overbooking, search ranking, channel sync |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Horizontal scaling, caching, multi-region, circuit breakers |
| [06 - Security & Compliance](./06-security-and-compliance.md) | PCI-DSS, GDPR, threat model, fraud detection |
| [07 - Observability](./07-observability.md) | Metrics, alerting, distributed tracing, booking funnel analytics |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trade-offs, trap questions |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Hotel Booking (This) | Flight Booking (7.6) | E-Commerce | Ride-Hailing (7.1) |
|--------|---------------------|---------------------|------------|---------------------|
| **Inventory Source** | Internal (platform is authoritative for availability) | External (GDS/CRS is authoritative) | Internal (warehouse/catalog) | Internal (driver availability) |
| **Inventory Model** | Calendar matrix: property × room_type × date → count | Fare-class buckets per flight | SKU quantities | Real-time driver pool |
| **Pricing Model** | Yield management: BAR, LOS pricing, seasonal rates, negotiated rates | Dynamic: 26 fare classes, load factor, time-to-departure | Fixed catalog pricing | Surge pricing (real-time) |
| **Hold Pattern** | Soft hold (10-30 min) managed by platform | Hard hold (15 min) managed by GDS | Cart with timeout | No hold (instant match) |
| **Overbooking** | Intentional---statistical models based on no-show history | Managed by airline, not OTA | None (exact inventory) | N/A |
| **Distribution** | Multi-channel via channel managers (400+ OTAs) | GDS distributes to all OTAs | Direct or marketplace | Direct platform only |
| **Stay Duration** | Multi-night (date range reservation) | Point-to-point (fixed schedule) | One-time purchase | Single trip |
| **Review System** | Critical for trust---verified-stay reviews | Less critical (airline is the brand) | Product reviews | Driver/rider ratings |

---

## What Makes This System Unique

1. **Availability as a Calendar Matrix Problem**: Unlike flight booking (seat counts per fare class on a single flight), hotel availability is a multi-dimensional matrix: property × room_type × date → available_count. A single booking for a 5-night stay must atomically decrement inventory across 5 different date entries, creating complex multi-row transactional requirements.

2. **Platform-Owned Inventory with Authoritative Responsibility**: The booking platform is the source of truth for availability---unlike flight booking where the GDS arbitrates. This means the platform must solve concurrency, consistency, and race conditions directly rather than delegating to an external system.

3. **Intentional Overbooking as a Revenue Strategy**: Hotels deliberately sell beyond physical capacity based on statistical no-show and cancellation predictions. A 200-room hotel might accept 210 reservations, expecting 5-8% no-shows. Managing overbooking requires probabilistic models, walk policies (relocating guests when overbooked), and compensation rules.

4. **Channel Manager Synchronization**: A single property's availability must be synchronized in real-time across Booking.com, Expedia, Agoda, the hotel's direct website, and potentially dozens of other OTAs. A booking on any channel must instantly reduce availability on all others. Stale availability across channels leads to overbooking beyond the hotel's overbooking tolerance.

5. **Rate Parity and Yield Management Complexity**: Hotels manage multiple rate types (BAR, corporate negotiated, package, promotional, length-of-stay), each with different visibility rules, booking conditions, and distribution restrictions. Rate parity clauses may require the same price across all OTA channels, while direct booking incentives push for lower direct prices---creating contractual tension that the system must enforce.

6. **Date-Range Contention and Fragmentation**: A 3-night booking (Dec 20-23) competes not just with other Dec 20-23 bookings but with any overlapping stay (Dec 19-21, Dec 22-25, etc.). This creates fragmentation problems where short gaps between reservations become unbookable, reducing overall occupancy.

---

## Quick Reference: Scale Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Searches per day | ~50M | ~580/s average, ~5,800/s at peak |
| Bookings per day | ~1.5M | 50:1 search-to-book ratio |
| Active property listings | ~28M | Hotels, apartments, vacation rentals |
| Room types per property | ~5 average | Standard, Deluxe, Suite, etc. |
| Availability calendar depth | 365 days | Rolling window per room type |
| Availability matrix size | ~51B cells | 28M × 5 × 365 (but only active subset queried) |
| Average stay duration | 2.4 nights | Varies by market segment |
| No-show rate | 5-10% | Varies by property and segment |
| Free cancellation rate | 35-40% | Pre-arrival cancellations |
| Channel manager sync latency | < 5 seconds | Availability update propagation |
| Review volume | ~250M total | Verified stay reviews |
| Commission rate | 15-25% | OTA commission on booking value |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [7.6 - Flight Booking System](../7.6-flight-booking-system/) | Booking lifecycle, saga patterns, search optimization |
| [7.2 - Airbnb](../7.2-airbnb/) | Property listing, search, review system, similar domain |
| [7.1 - Uber/Lyft Ride-Hailing](../7.1-uber-lyft/) | Real-time availability matching, dynamic pricing |
| [5.5 - Payment Processing System](../5.5-payment-processing-system/) | PCI-DSS compliance, payment orchestration |
| [2.3 - Elasticsearch Cluster](../2.3-elasticsearch-cluster/) | Property search indexing, full-text and geo search |
| [1.5 - Distributed Log-Based Broker](../1.5-distributed-log-based-broker/) | Event streaming for availability changes, booking events |

---

## Sources

- Booking.com Engineering Blog --- Scaling Accommodation Search and Availability
- SiteMinder --- Channel Manager Architecture and OTA Integration Patterns
- AltexSoft --- Hotel Revenue Management: Strategies, Tools, and Best Practices
- XOTELS --- Hotel Pricing Matrix and Rate Management Strategies
- Mews --- Types of Hotel Rates and Rate Management
- OTA Insight --- Rate Intelligence and Competitive Pricing
- AHLA --- PCI-DSS Compliance for Hospitality
- Industry Statistics: Booking Holdings 2025, Expedia Group 2025
