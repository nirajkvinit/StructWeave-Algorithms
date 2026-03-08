# Flight Booking System Design

## System Overview

A flight booking system---exemplified by Expedia, Kayak, Google Flights, and airline direct channels---orchestrates real-time flight search, fare comparison, seat inventory management, and ticket issuance across a fragmented ecosystem of Global Distribution Systems (GDS), airline-direct NDC APIs, and low-cost carrier portals. Kayak processes over 1 billion search queries per year; Expedia handles 750M+ annual searches. The core engineering challenge is the intersection of **GDS aggregation** (fan-out search across Amadeus, Sabre, Travelport, and airline-direct APIs with 500ms-2s latency per call), **inventory consistency** (ensuring the seat a user selects is still available when they pay, despite 100:1 search-to-book ratios), **fare complexity** (thousands of fare rules, 26 booking classes, dynamic pricing based on load factor and time-to-departure), and **regulatory compliance** (APIS reporting, PCI-DSS for payments, fare advertising rules, GDPR for passenger data). Unlike simpler e-commerce systems, flight booking depends on external authoritative systems (GDS/CRS) that control inventory, impose per-API-call costs, and introduce latency and reliability concerns that the OTA cannot fully control.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Extremely read-heavy: 100:1 search-to-book ratio; searches fan out to 5+ external APIs per request |
| **Latency Sensitivity** | High---search p99 < 3s (aggregating multiple GDS sources); booking completion p99 < 5s |
| **Consistency Model** | Strong consistency for inventory and booking (GDS is authoritative); eventual consistency for search cache and price alerts |
| **External Dependency** | Very High---GDS systems (Amadeus, Sabre, Travelport) are external, expensive, and latency-variable |
| **Data Volume** | High---100M+ searches/day, 1M+ bookings/day, 365M+ PNRs/year |
| **Architecture Model** | Cache-first aggregation for search; saga-based orchestration for booking; event-driven for notifications and price alerts |
| **Fare Complexity** | Very High---26 fare classes, fare families, restrictions (refundability, change fees, min stay, advance purchase) |
| **Complexity Rating** | **Very High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | GDS integration, seat hold race conditions, fare rules engine, search caching |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Horizontal scaling, circuit breakers, multi-region, saga patterns |
| [06 - Security & Compliance](./06-security-and-compliance.md) | PCI-DSS, GDPR, APIS compliance, fare advertising, threat model |
| [07 - Observability](./07-observability.md) | Metrics, alerting, distributed tracing, booking funnel analytics |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trade-offs, trap questions |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Flight Booking (This) | Hotel Booking | E-Commerce | Ride-Hailing (7.1) |
|--------|----------------------|---------------|------------|---------------------|
| **Inventory Source** | External (GDS/CRS is authoritative) | Internal (hotel owns inventory) | Internal (warehouse/catalog) | Internal (driver availability) |
| **Search Complexity** | Fan-out to 5+ external APIs per query | Single internal DB query | Single catalog query | Real-time geospatial index |
| **Pricing Model** | Dynamic: 26 fare classes, load factor, time-to-departure, competitor signals | Yield management (simpler) | Fixed catalog pricing | Surge pricing (real-time) |
| **Hold Pattern** | GDS seat hold with 15-min TTL, then ticket issuance | Soft hold, simpler confirmation | Cart with inventory reservation | No hold (instant match) |
| **Regulatory Burden** | Very High (APIS, fare rules, BSP/ARC, consumer protection) | Medium (local tax, cancellation policies) | Medium (consumer protection) | High (driver regulations) |
| **Booking Lifecycle** | Multi-step: search → hold → pay → ticket → PNR → check-in | Simple: search → book → confirm | Simple: cart → pay → ship | Real-time: request → match → trip |
| **Data Record** | PNR (shared across airlines, GDS, agents) | Reservation record (single hotel) | Order record | Trip record |

---

## What Makes This System Unique

1. **External Authoritative Inventory**: Unlike most systems where the platform owns inventory, flight booking depends on GDS/CRS systems (Amadeus, Sabre, Travelport) that are external, charge per API call, have variable latency (500ms-2s), and are the single source of truth for seat availability. Every architectural decision must account for this external dependency.

2. **Fan-Out Search Aggregation at Scale**: A single user search triggers parallel requests to 5+ GDS and airline-direct APIs, each with different response formats, latencies, and reliability characteristics. The system must aggregate, deduplicate, normalize, and rank results---all within a 3-second latency budget.

3. **Two-Phase Booking with TTL-Based Seat Hold**: The booking process is inherently two-phase: first hold a seat in the GDS (creating a PNR), then complete payment and issue a ticket. The hold has a strict 15-minute TTL---if payment is not completed, the seat is released back to inventory. This creates a distributed state management challenge across GDS, local database, and payment processor.

4. **Fare Complexity as a Domain-Specific Rule Engine**: Aviation fare rules are among the most complex pricing structures in any industry. A single flight can have 26 fare classes, each with different prices, refund policies, change fees, minimum stay requirements, and advance purchase restrictions. The system must evaluate these rules at search time (for display), hold time (for validation), and post-booking (for changes/refunds).

5. **PNR as a Cross-System Shared Record**: The Passenger Name Record is not just a local database row---it is a shared record that exists simultaneously in the GDS, airline CRS, travel agent system, and potentially multiple airlines for multi-carrier itineraries. Changes must synchronize across all systems, and each system may assign its own record locator.

---

## Quick Reference: Scale Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Searches per day | ~100M | ~1,160/s average, ~11,600/s at peak |
| Bookings per day | ~1M | 100:1 search-to-book ratio |
| External API calls/sec (peak) | ~58,000 | 11,600 searches × 5 GDS/API providers |
| Seat inventory records | ~520M | 100K flights × 200 seats × 26 fare classes |
| PNRs per year | ~365M | 1M bookings/day × 365 days |
| GDS API latency | 500ms-2s | Variable, provider-dependent |
| Seat hold TTL | 15 minutes | GDS-enforced, non-negotiable |
| Fare classes per flight | Up to 26 | Y, B, M, Q, K, etc. |
| Search result cache TTL | 3-5 minutes | Fares change frequently |
| GDS market share | ~97% | Amadeus + Sabre + Travelport combined |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [7.1 - Uber/Lyft Ride-Hailing](../7.1-uber-lyft/) | Dynamic pricing, real-time matching, saga patterns |
| [7.4 - Food Delivery System](../7.4-food-delivery-system/) | Multi-party coordination, order lifecycle |
| [1.5 - Distributed Log-Based Broker](../1.5-distributed-log-based-broker/) | Event streaming for booking events, price changes |
| [2.3 - Elasticsearch Cluster](../2.3-elasticsearch-cluster/) | Flight search indexing and full-text search |
| [5.5 - Payment Processing System](../5.5-payment-processing-system/) | PCI-DSS compliance, payment orchestration |

---

## Sources

- AltexSoft --- Flight Booking Process: Structure, Steps, and Key Systems
- AltexSoft --- PNR Explained: What's in a Passenger Name Record
- IATA --- New Distribution Capability (NDC) Standard
- Amadeus --- Global Distribution System Architecture
- Expedia Engineering --- Micro Frontend Architecture and Flight Search Optimization
- Kayak/Aerospike --- Travel Search Caching at Scale (1B+ queries/year)
- Fetcherr --- Dynamic Pricing in Aviation: AI-Driven Revenue Management
- ICAO Doc 9944 --- Guidelines on Passenger Name Record Data
- ATPCO --- Fare Filing and Distribution Standards
- Industry Statistics: Expedia Group 2024, Booking Holdings 2024
