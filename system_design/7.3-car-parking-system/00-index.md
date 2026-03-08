# Car Parking System Design

## System Overview

A car parking system---spanning single-building garages, multi-level airport structures, and distributed urban lots managed by operators like ParkWhiz, SpotHero, and municipal authorities---orchestrates the real-time allocation of finite physical spaces to vehicles, combining IoT sensor networks, automated gate control, reservation management, and payment processing into a unified platform. A large airport operator manages 30,000+ spots across multiple structures, processing 50,000+ entry/exit events per day, while a city-wide smart parking network may coordinate 500+ lots with 200,000+ total spots. The core engineering challenge sits at the intersection of **hierarchical object modeling** (corporation → lot → floor → zone → spot), **real-time physical state tracking** (sensors detecting vehicle presence in individual bays), **strong consistency for slot allocation** (two drivers must never be directed to the same spot), **edge-first gate control** (physical barriers that must operate during network outages), and **flexible pricing engines** (hourly, daily, peak/off-peak, event-based surge). Unlike pure software systems where failures result in error messages, a parking gate failure physically blocks vehicles---making offline resilience and sub-second gate response non-negotiable architectural requirements.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Write-heavy for sensor updates and gate events; read-heavy for availability queries and display boards |
| **Latency Sensitivity** | High---gate open/close must complete in <2s; reservation confirmation <500ms |
| **Consistency Model** | Strong consistency for slot allocation and booking (no double-allocation); eventual consistency for analytics and display boards |
| **Concurrency Level** | Moderate per lot (hundreds of concurrent vehicles), high across multi-lot networks (thousands of gate events/min) |
| **Data Volume** | Moderate---~40M transactions/day across 10K lots; sensor telemetry at ~5K events/min per large lot |
| **Architecture Model** | IoT-edge hybrid with cloud orchestration; event-driven sensor pipeline; transactional booking service |
| **Real-time Requirements** | Hard real-time for gate control; soft real-time for availability display and pricing |
| **Complexity Rating** | **Medium** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Gate offline resilience, sensor pipeline, concurrent booking |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Lot-level sharding, availability bitmaps, multi-region |
| [06 - Security & Compliance](./06-security-and-compliance.md) | ANPR privacy, payment compliance, physical security |
| [07 - Observability](./07-observability.md) | Metrics, IoT telemetry, alerting, dashboards |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Car Parking (This) | Ride-Hailing (7.1) | Hotel Booking (7.7) | Event Ticketing |
|--------|-------------------|---------------------|---------------------|-----------------|
| **Primary Unit** | ParkingSpot (physical bay in a structure) | Trip (driver + rider + route) | Room (room + guest + dates) | Seat (section + row + seat) |
| **Physical Constraints** | Gates must work offline; sensors detect presence | Driver phones send GPS | None (pure software) | None (pure software) |
| **Allocation Granularity** | Individual bay with type (compact/EV/handicapped) | Driver-rider match | Room type + date range | Specific seat or general admission |
| **Pricing Model** | Time-based with type multipliers and daily caps | Dynamic surge pricing | Yield management per night | Fixed or tiered |
| **IoT Integration** | Heavy---sensors, gate controllers, display boards, ANPR cameras | Moderate---driver GPS only | None | Minimal |
| **Offline Requirement** | Critical---gates are physical barriers | Low---app-based | None | None |
| **State Tracking** | Sensor-driven (real-time bay occupancy) | GPS-driven (driver movement) | Reservation-driven | Ticket-driven |
| **Consistency Need** | Per-spot strong consistency | Per-trip strong consistency | Per-room-night strong consistency | Per-seat strong consistency |

---

## What Makes This System Unique

1. **Deep Hierarchical Object Model for Physical Infrastructure**: The data model must represent a multi-level physical hierarchy---corporation → parking lot → floor → zone → individual spot---where each spot has a physical type (compact, regular, handicapped, EV charging, motorcycle), a sensor binding, and independent state. This is one of the deepest object hierarchies in system design interviews and directly tests a candidate's ability to model physical systems in software.

2. **Edge-First Gate Control with Offline Resilience**: Unlike pure cloud systems, parking gates are physical barriers that block vehicles. If the cloud backend is unreachable, the gate must still open for valid tickets and permits. This requires edge computing at the gate controller with locally cached booking data, permit lists, and offline decision-making---followed by reconciliation when connectivity resumes. This pattern of "decide locally, reconcile globally" is architecturally significant beyond parking.

3. **IoT Sensor Pipeline for Real-Time Occupancy**: Each parking bay has a sensor (ultrasonic, infrared, or magnetic) that detects vehicle presence. A 5,000-spot lot generates continuous sensor events that must flow through an IoT hub, be debounced (to filter false positives from passing pedestrians), update a real-time availability store, and push changes to display boards---all within 3 seconds end-to-end.

4. **Strong Consistency for Physical Slot Allocation**: Two vehicles directed to the same spot creates a real-world conflict (not just an error message). The booking system must use optimistic locking or distributed locks to ensure that concurrent reservation requests for overlapping time windows never allocate the same physical bay.

5. **Hybrid Entry Modes**: The system must handle three distinct entry flows---pre-booked reservations (QR code scan), walk-in arrivals (ticket dispensing), and permit holders (ANPR recognition)---all converging at the same physical gate with a sub-2-second response requirement.

---

## Quick Reference: Scale Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Lots managed | ~10,000 | Across a large multi-city operator network |
| Total spots | ~1,000,000 | Average 100 spots/lot |
| Daily entry/exit events | ~40M | 10K lots × 4K events/lot/day |
| Peak transactions/sec | ~2,300 | 5× average (~460 tx/sec) |
| Sensor events/min (large lot) | ~5,000 | 5K spots reporting occupancy changes |
| Gate response latency | <2s | Physical barrier---blocking vehicles |
| Reservation confirmation | <500ms | User-facing booking flow |
| Display board refresh | <3s | End-to-end from sensor to signage |

---

## System Variants

| Variant | Description | Key Differences |
|---------|-------------|-----------------|
| **Single-Lot Kiosk** | Small garage with entry/exit kiosks, no reservations | No booking service; ticket-based only; single-server deployment |
| **Multi-Lot SaaS Platform** | Operator managing 100+ lots across a city | Central management portal; cross-lot analytics; reservation system |
| **Airport Mega-Lot** | 30,000+ spots, multiple terminals, long-term/short-term zones | Shuttle integration; terminal-specific pricing; pre-booking mandatory |
| **Smart City Network** | Municipal parking across street meters + garages | Real-time city-wide availability map; mobile payment; enforcement integration |
| **Valet Parking System** | Attendant-managed with vehicle tracking | Vehicle handoff tracking; key management; damage inspection workflow |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [7.1 - Uber/Lyft Ride-Hailing](../7.1-uber-lyft/) | Real-time geospatial systems; IoT integration patterns |
| [1.8 - Distributed Lock Manager](../1.8-distributed-lock-manager/) | Optimistic/pessimistic locking for slot allocation |
| [1.5 - Distributed Log-Based Broker](../1.5-distributed-log-based-broker/) | Sensor event ingestion pipeline |
| [6.14 - Customer Support Platform](../6.14-customer-support-platform/) | Multi-tenant SaaS architecture patterns |
| [1.4 - Distributed LRU Cache](../1.4-distributed-lru-cache/) | Real-time availability caching with Redis |

---

## Sources

- Smart Parking IoT Architecture Research (IEEE, 2024)
- ANPR System Design for Parking Management (ScienceDirect, 2024)
- Microservices Architecture for Reservation-Based Parking (ResearchGate)
- IoT-Enabled Smart Car Parking System through Integrated Sensors (arXiv, 2024)
- Smart Parking Management Systems: Complete Guide (SpeedGatz, 2025)
- Industry Data: ParkWhiz/SpotHero Reservation Platform Architecture
- Parking Garage Database Schema Design (Vertabelo, Redgate)
