# Requirements & Capacity Estimations

## 1. Functional Requirements

### Core Features (In Scope)

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Event Discovery** | Search and browse events by artist, venue, location, date, genre |
| F2 | **Interactive Seat Map** | Real-time venue map showing available/held/sold seats with pricing |
| F3 | **Virtual Waiting Room** | Fair queuing system for high-demand on-sales with bot detection |
| F4 | **Seat Selection & Hold** | Temporarily reserve seats (5-10 min TTL) while user completes checkout |
| F5 | **Checkout & Payment** | Complete purchase with payment processing, order confirmation |
| F6 | **Ticket Delivery** | Digital tickets with rotating barcodes, mobile-first delivery |
| F7 | **Event Management** | Venue configuration, pricing tiers, sale windows, inventory allocation |
| F8 | **Resale Marketplace** | Fan-to-fan ticket resale with price caps and verification |

### Out of Scope

- Artist/promoter relationship management (CRM)
- Venue physical operations (entry scanning hardware)
- Marketing campaign management
- Financial settlement/reconciliation with venues
- Social features (reviews, fan communities)

---

## 2. Non-Functional Requirements

### CAP Theorem Choice

**CP (Consistency + Partition Tolerance)** for seat inventory -- a seat must never be double-sold, even if it means temporarily rejecting requests during network partitions. For read-heavy paths (event browsing, search), eventual consistency is acceptable.

### Consistency Model

| Component | Consistency Model | Justification |
|-----------|-------------------|---------------|
| Seat Inventory | **Strong (Linearizable)** | No double-selling; seat state must be authoritative |
| Queue Position | **Strong** | Fairness requires accurate ordering |
| Event Catalog | **Eventual** | Brief staleness acceptable for search results |
| User Profiles | **Eventual** | Not time-critical |
| Pricing | **Read-your-writes** | Prices must reflect current state during checkout |

### Availability Targets

| Component | Target | Justification |
|-----------|--------|---------------|
| Event browsing/search | 99.99% | Revenue-critical, always-on |
| On-sale checkout | 99.9% | Acceptable brief degradation under extreme load |
| Seat map rendering | 99.95% | Can degrade to list view |
| Payment processing | 99.95% | Depends on external payment processors |
| Virtual queue | 99.99% | Queue failure = complete on-sale failure |

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Event search | 100ms | 250ms | 500ms |
| Seat map load | 200ms | 500ms | 1s |
| Seat hold (SETNX) | 5ms | 15ms | 50ms |
| Queue position update | 100ms | 300ms | 500ms |
| Checkout completion | 1s | 3s | 5s |
| Ticket delivery | 2s | 5s | 10s |

### Durability Guarantees

- **Completed orders**: 99.999999999% (11 nines) -- replicated across 3+ zones
- **Payment records**: Immutable audit trail, 7-year retention
- **Seat holds**: Ephemeral (Redis with TTL), acceptable loss on failure (auto-releases)
- **Queue state**: Durable during on-sale window, can be rebuilt from checkpoints

---

## 3. Capacity Estimations (Back-of-Envelope)

### Assumptions

- 80M monthly active users (MAU) globally
- 20M daily active users (DAU) on average
- 500M tickets sold annually
- Average event: 10,000 seats
- High-demand events: 50,000-80,000 seats (stadiums)
- Mega on-sales: up to 14M concurrent users for a single event
- Average user browses 5 events, views 2 seat maps per session

### Traffic Estimations

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| DAU | 20M | 80M MAU x 0.25 daily ratio |
| Read QPS (avg) | ~12,000 | 20M users x 50 reads / 86,400s |
| Read QPS (peak) | ~120,000 | 10x average during evenings |
| Write QPS (avg) | ~120 | 500M tickets / 365 days / 86,400s |
| Write QPS (peak on-sale) | ~500,000 | 14M users x 3 attempts / 85s burst window |
| Seat hold QPS (mega event) | ~1,000,000 | Millions of concurrent SETNX attempts |
| Queue join QPS (mega event) | ~2,000,000 | 14M users joining in 10-minute window |

### Storage Estimations

| Data Type | Size per Record | Annual Volume | Annual Storage |
|-----------|-----------------|---------------|----------------|
| Events | ~2 KB | 500K events | ~1 GB |
| Venues + Seat Maps | ~500 KB/venue | 50K venues | ~25 GB |
| Tickets | ~200 bytes | 500M | ~100 GB |
| Orders | ~500 bytes | 200M orders | ~100 GB |
| User Profiles | ~1 KB | 80M users | ~80 GB |
| User Activity Logs | ~200 bytes | 10B events/year | ~2 TB |
| Payment Records | ~1 KB | 200M | ~200 GB |
| **Total (Year 1)** | | | **~2.5 TB** |
| **Total (Year 5)** | | | **~12 TB** |

### Bandwidth Estimations

| Scenario | Calculation | Bandwidth |
|----------|-------------|-----------|
| Normal browsing | 120K QPS x 5 KB avg response | ~600 MB/s |
| Seat map rendering | 50K QPS x 50 KB (SVG + data) | ~2.5 GB/s |
| Mega on-sale (inbound) | 2M QPS x 1 KB request | ~2 GB/s |
| Mega on-sale (outbound) | 2M QPS x 2 KB response | ~4 GB/s |
| CDN-served (static) | 90% cache hit ratio | Offloaded to CDN edge |

### Cache Estimations

| Cache Layer | Purpose | Size |
|-------------|---------|------|
| CDN Edge | Static assets, event pages, venue maps | ~500 GB globally |
| Application Cache (Redis) | Active seat maps, holds, session state | ~50 GB per region |
| Queue State (Redis/DynamoDB) | Active queue positions, tokens | ~10 GB per mega on-sale |
| Search Index | Event catalog, full-text search | ~20 GB |

---

## 4. SLOs / SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability (browsing) | 99.99% | Synthetic monitors, real-user monitoring |
| Availability (on-sale) | 99.9% | Success rate of checkout completions |
| Seat hold latency (p99) | < 50ms | Redis SETNX operation timing |
| Checkout completion (p99) | < 5s | End-to-end from cart to confirmation |
| Queue fairness | 99.5% FIFO ordering | Position inversions < 0.5% |
| Double-sell rate | 0.000% | Zero tolerance -- strong consistency |
| Bot detection rate | > 99% | Blocked vs. total bot attempts |
| Ticket delivery (p99) | < 10s | Time from payment to ticket in app |
| Error rate (on-sale) | < 1% | HTTP 5xx / total requests |
| Queue throughput | 5,000 users/min into protected zone | Leaky bucket drain rate per event |

---

## 5. Key Design Constraints

| Constraint | Impact |
|------------|--------|
| **Finite inventory** | Cannot "add more" -- each seat is unique and non-fungible |
| **Time-bounded sales** | On-sales have precise start times creating instant traffic spikes |
| **Fairness requirements** | Users expect FIFO ordering; perceived unfairness causes brand damage |
| **Payment processor latency** | External dependency (3-5s) during highest-contention window |
| **Regulatory compliance** | BOTS Act (US), consumer protection laws, ADA accessibility |
| **Multi-tenant venues** | Same venue hosts different events with different configurations |
| **Legacy systems** | 4.5M+ lines across 13 platforms; C++ Inventory Core with assembly |
