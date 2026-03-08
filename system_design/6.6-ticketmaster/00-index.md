# Ticketmaster System Design

## Overview

Ticketmaster is the world's largest ticket marketplace, processing ticket sales for concerts, sports, theater, and live events. The system's defining challenge is **extreme write contention** -- millions of users competing simultaneously for a limited inventory of thousands of seats during high-demand on-sales, while guaranteeing no double-selling and maintaining fairness through virtual queuing. Part of Live Nation Entertainment, Ticketmaster handles over 500 million tickets annually across 30+ countries with an Inventory Core written in C++ for microsecond-level seat locking.

## Key Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Traffic Pattern** | Extreme spiky (thundering herd during on-sales, low baseline otherwise) |
| **Read:Write Ratio** | 100:1 during browsing; inverts to ~1:1 during active on-sales |
| **Consistency Model** | Strong consistency for seat inventory (no double-selling) |
| **Latency Sensitivity** | Critical -- sub-second seat holds, real-time queue updates |
| **Contention Level** | Extremely high -- millions competing for thousands of seats |
| **Data Sensitivity** | PCI-DSS for payments, PII for user profiles |

## Complexity Rating

**Very High** -- Combines real-time inventory management with extreme contention, virtual queuing fairness guarantees, bot detection, dynamic pricing, and payment processing under massive spike loads.

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning |
| [02 - High-Level Design](./02-high-level-design.md) | System architecture, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, core algorithms |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Seat contention, virtual queue, payment flow |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, DR |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Bot detection, fraud, PCI-DSS, threat model |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |

## What Makes This System Unique

1. **Thundering Herd Problem**: Traffic can spike 1000x in seconds when a popular event goes on sale (e.g., Taylor Swift Eras Tour: 3.5 billion requests, 14M users for 2.4M tickets)
2. **Inventory is Finite and Non-Fungible**: Each seat is unique -- Section 101, Row A, Seat 5 is different from Seat 6. No "just add more inventory"
3. **Fairness vs. Performance Trade-off**: Virtual waiting rooms must balance queue fairness with system throughput
4. **Two-Phase Commit Problem**: Seat hold + payment must be atomic across distributed services
5. **Bot Arms Race**: 8.7 billion bot attempts blocked monthly; scalpers use residential proxies and antidetect browsers

## Real-World Scale (Ticketmaster/Live Nation)

| Metric | Value |
|--------|-------|
| Annual tickets sold | 500M+ |
| Countries | 30+ |
| Monthly bot attempts blocked | 8.7 billion |
| Peak requests (single on-sale) | 3.5 billion (Eras Tour) |
| Codebase | 4.5M+ lines across 13 platforms |
| CDN provider | Fastly (16 business units) |
| Inventory Core | C++ with assembly for critical sections |
| Protocol Buffers | Google Protobuf for inter-service communication |

## Sources

- Ticketmaster Engineering Blog (tech.ticketmaster.com)
- SeatGeek Virtual Waiting Room Architecture (AWS Architecture Blog)
- Taylor Swift/Ticketmaster Meltdown Analysis (CockroachDB, Educative)
- Queue-it Virtual Waiting Room Documentation
- Ticketmaster Developer Portal (developer.ticketmaster.com)
- Fastly Customer Case Study: Ticketmaster
