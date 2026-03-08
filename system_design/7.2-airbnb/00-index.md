# Airbnb Marketplace Platform Design

## System Overview

Airbnb is a two-sided marketplace connecting hosts who list properties with guests seeking short-term accommodations, operating across 220+ countries with 7M+ active listings and 150M+ users. The core engineering challenge lies at the intersection of **calendar availability management** (preventing double-bookings across millions of per-date inventory slots using distributed locking), **geo-aware search and ML ranking** (combining geospatial filtering with personalized machine learning models across two distinct interfaces---list results and map pins), **split payment orchestration** (holding guest funds at booking, capturing at check-in, and splitting payouts to hosts with configurable fee structures across 40+ currencies), and **two-sided trust** (verifying identities, detecting fraudulent listings, and mediating disputes in a system where neither party has met before). Unlike traditional hotel booking systems with static room inventory and centralized management, Airbnb's inventory is distributed across millions of independent hosts, each managing their own calendars, pricing, and availability---making consistency, synchronization, and trust the defining architectural challenges.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Read-heavy for search (~50K QPS at peak); write-heavy for calendar updates and bookings (~5K booking writes/s at peak) |
| **Latency Sensitivity** | High---search must return in <800ms; booking confirmation in <500ms; calendar lock acquisition in <100ms |
| **Consistency Model** | Strong consistency for calendar/availability and bookings (CP); eventual consistency for search index, reviews, and pricing suggestions (AP) |
| **Concurrency Level** | Very High---millions of concurrent searches, thousands of simultaneous booking attempts, calendar updates across 7M+ listings |
| **Data Volume** | High---7M+ listings with 365 calendar slots each (~2.5B calendar rows), 2M+ bookings/day at peak, 500M+ reviews, petabytes of listing photos |
| **Architecture Model** | Service-oriented architecture with event-driven async propagation, distributed locking for availability, and ML inference pipelines for search and pricing |
| **Marketplace Dynamics** | Two-sided: host supply management (calendar, pricing) and guest demand matching (search, booking); platform mediates trust, payments, and disputes |
| **Complexity Rating** | **Very High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Availability locking, search ranking, payment orchestration |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Sharding, caching, multi-region, fault tolerance |
| [06 - Security & Compliance](./06-security-and-compliance.md) | PCI compliance, identity verification, fraud detection, GDPR |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Airbnb (This) | Hotel Booking (OTA) | Ride-Hailing (7.1) | Food Delivery (7.4) |
|--------|---------------|--------------------|--------------------|---------------------|
| **Inventory Type** | Per-date calendar slots per listing | Pre-allocated room blocks | Driver availability (real-time) | Restaurant menu items (real-time) |
| **Supply Control** | Distributed (individual hosts) | Centralized (hotel management) | Distributed (drivers go online/offline) | Semi-centralized (restaurant hours) |
| **Booking Horizon** | Days to months in advance | Days to months in advance | Seconds (on-demand) | Minutes (on-demand) |
| **Consistency Need** | Per-date availability (must prevent double-booking) | Room allocation (overbooking is common and managed) | Real-time location matching | Order availability (menu stock) |
| **Payment Model** | Authorize now, capture at check-in, split payout T+24h | Charge at booking or check-in | Charge after trip completion | Charge at order placement |
| **Trust Challenge** | Both sides unknown (host + guest) | One side known (hotel brand) | Driver verification + rider safety | Restaurant quality + delivery reliability |
| **Search Complexity** | Geo + dates + amenities + ML ranking | Geo + dates + star rating | Real-time geo proximity + ETA | Geo proximity + cuisine + rating |
| **Pricing Model** | Host-set base + dynamic pricing suggestions | Revenue management (yield pricing) | Dynamic surge pricing | Menu prices + delivery fee |

---

## Key Architectural Themes

1. **Calendar as the Core Data Structure**: Unlike hotel systems that manage room counts, Airbnb tracks availability per-listing, per-date---creating a massive state space (7M listings × 365 days = 2.5B+ cells) that must remain strongly consistent to prevent double-bookings.

2. **Distributed Lock Contention on Popular Listings**: A popular beachfront property during peak season may receive 100+ simultaneous booking attempts for the same dates, requiring pessimistic locking with careful TTL management and fairness guarantees.

3. **Dual Search Interfaces (List + Map)**: Airbnb's search serves two fundamentally different UIs---a ranked list and a geographic map---requiring different ranking models and attention distribution assumptions (sequential position bias vs. radial geographic attention decay).

4. **Authorize-Then-Capture Payment Model**: Unlike e-commerce (charge immediately), Airbnb authorizes the guest's payment at booking but captures funds only at check-in, with host payout occurring 24 hours after check-in. This creates a multi-day distributed transaction with complex failure modes.

5. **Two-Sided Trust at Scale**: Neither host nor guest has inherent credibility. The platform must verify identities, detect fake listings, prevent payment fraud, mediate damage claims, and enforce review integrity---all while maintaining a low-friction user experience.

6. **Event-Driven Consistency Bridge**: Strong consistency for bookings and calendar (transactional database with distributed locks) coexists with eventual consistency for search (Elasticsearch index updated via event stream), requiring careful handling of the consistency boundary.
