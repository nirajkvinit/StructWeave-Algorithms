# Requirements & Capacity Estimations

## Functional Requirements

### Core Features (In Scope)

1. **Demand Forecasting Engine**
   - Generate demand forecasts at SKU × location × time-period granularity
   - Support multiple forecasting methods: statistical (ARIMA, Holt-Winters, Croston for intermittent demand), ML-based (Prophet, DeepAR, gradient-boosted trees), and ensemble approaches
   - Automatic model selection per SKU-location based on backtesting accuracy
   - Demand sensing: incorporate real-time signals (POS data, web traffic, weather, promotions) to adjust short-term forecasts
   - Forecast accuracy tracking with bias detection and automatic model retraining triggers
   - Collaborative forecasting: allow planners to override/adjust statistical forecasts with market intelligence
   - Promotion and new product launch forecasting with causal factor modeling

2. **Order Management System (OMS)**
   - Capture orders from multiple channels (B2B EDI, B2C web/mobile, marketplace APIs, phone/email)
   - Order lifecycle management: created → validated → allocated → released → shipped → delivered → closed
   - Available-to-Promise (ATP) and Capable-to-Promise (CTP) inventory checks
   - Intelligent order routing: select optimal fulfillment node based on inventory position, proximity to customer, shipping cost, and capacity
   - Split shipment and backorder management with configurable policies
   - Order modification and cancellation with downstream impact propagation
   - Returns and exchange processing (RMA initiation, return tracking, disposition)

3. **Warehouse Management System (WMS)**
   - Inbound operations: receiving, putaway optimization, cross-docking
   - Outbound operations: wave planning, pick path optimization, packing, staging, shipping
   - Inventory management: cycle counting, lot/serial tracking, expiry management (FEFO), zone management
   - Labor management: task assignment, productivity tracking, workforce planning
   - Yard management: dock scheduling, trailer tracking, gate management
   - Support for multiple warehouse types: distribution centers, fulfillment centers, stores-as-fulfillment, cross-dock facilities

4. **Transportation Management System (TMS)**
   - Carrier selection and rate management (contract rates, spot market, rate shopping)
   - Route optimization: multi-stop routing, consolidation, milk-run planning
   - Load building and optimization (weight, volume, axle weight constraints)
   - Shipment execution: tender, accept/reject, track, proof-of-delivery
   - Freight audit and payment: rate validation, accessorial charge management, dispute resolution
   - Multi-modal support: FTL, LTL, parcel, ocean (FCL/LCL), air freight, rail, intermodal

5. **Supply Planning and MRP**
   - Material Requirements Planning (MRP): explode BOM, net requirements, generate planned orders
   - Distribution Requirements Planning (DRP): propagate demand through the distribution network
   - Safety stock optimization based on demand variability, lead time variability, and target service levels
   - Supplier allocation and split-sourcing optimization
   - Capacity-constrained planning (finite vs. infinite capacity modes)
   - What-if scenario planning and simulation

6. **Supplier Collaboration**
   - Supplier portal for PO acknowledgment, ASN creation, and invoice submission
   - Vendor Managed Inventory (VMI): supplier has visibility into inventory levels and replenishes autonomously
   - Collaborative Planning, Forecasting, and Replenishment (CPFR) workflows
   - Supplier performance scorecards (on-time delivery, quality, responsiveness, compliance)
   - EDI integration (X12/EDIFACT) for automated document exchange (850, 856, 810, 997)

7. **Supply Chain Control Tower**
   - End-to-end visibility across orders, shipments, inventory, and suppliers
   - Exception-based alerting with configurable thresholds and escalation rules
   - Prescriptive analytics: automated recommendations for disruption response
   - What-if simulation for scenario planning (supplier failure, demand surge, port closure)
   - Real-time KPI dashboards with drill-down capability

8. **Returns and Reverse Logistics**
   - Return Merchandise Authorization (RMA) workflow
   - Return shipment tracking and receiving
   - Inspection and grading workflows (A-stock, B-stock, defective, scrap)
   - Disposition management: restock, refurbish, liquidate, recycle, dispose
   - Refund/credit processing integration with financial systems
   - Warranty tracking and claims management

9. **Shipment Tracking and Visibility**
   - Real-time tracking across all transport modes (GPS, AIS for ocean, ADS-B for air)
   - IoT sensor integration: temperature, humidity, shock, light exposure for sensitive cargo
   - Predictive ETA computation based on historical transit times, current conditions, and carrier patterns
   - Milestone tracking: pickup, in-transit, customs clearance, out-for-delivery, delivered
   - Proactive exception notification to stakeholders (delay, damage, temperature excursion)

10. **Sustainability and Compliance**
    - Carbon footprint tracking per shipment, order, and product
    - Trade compliance: export controls, denied party screening, HS code classification
    - Food safety traceability (lot-level track and trace, one-up/one-down)
    - Hazardous materials compliance (DOT/IATA/IMDG classification and documentation)
    - ESG reporting: Scope 1/2/3 emissions, ethical sourcing metrics

### Out of Scope

- Manufacturing execution systems (MES) and shop floor control
- Detailed warehouse automation control (robotics, conveyor PLC programming)
- Financial accounting and general ledger (handled by Accounting/GL)
- Customer-facing e-commerce storefront (handled by commerce platform)
- Procurement negotiation, RFQ, and strategic sourcing (handled by Procurement System)
- Last-mile delivery fleet management (GPS dispatch for individual drivers)

---

## Non-Functional Requirements

### CAP Theorem and Consistency

| Aspect | Choice | Justification |
|--------|--------|---------------|
| **CAP Preference** | CP for inventory/orders; AP for analytics/tracking | Inventory allocation must not double-commit (strong consistency); tracking dashboards and forecast displays can tolerate seconds of staleness |
| **Consistency Model** | Strong for order state and inventory; eventual for forecasts, KPIs, and tracking | An order allocated to a warehouse must decrement available inventory atomically; forecast model updates propagate eventually |
| **Availability Target** | 99.95% for order capture; 99.9% for planning; 99.99% for tracking ingestion | Order capture is revenue-critical; planning can tolerate brief maintenance windows; tracking must always accept IoT events |
| **Durability** | Zero data loss for orders and inventory transactions | Every order state change and inventory movement must be durably persisted before acknowledgment |

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Order creation | 150ms | 400ms | 800ms |
| ATP/inventory check | 50ms | 150ms | 300ms |
| Order routing decision | 200ms | 500ms | 1s |
| Shipment tracking query | 100ms | 300ms | 600ms |
| Control tower dashboard load | 1s | 3s | 5s |
| Demand forecast query (single SKU) | 200ms | 500ms | 1s |
| Route optimization (single shipment) | 500ms | 2s | 5s |
| Carrier rate shopping | 1s | 3s | 8s |
| Warehouse pick task assignment | 100ms | 300ms | 500ms |
| IoT event ingestion (per event) | 10ms | 50ms | 100ms |

---

## Capacity Estimations (Back-of-Envelope)

### Assumptions
- Multi-tenant SaaS serving ~3,000 enterprise customers
- ~1.5M total users (planners, warehouse staff, drivers, suppliers, analysts)
- ~300K daily active users (20% of total)
- Mix of 24/7 operations (warehouses, tracking) and business-hours planning
- Global deployment with regional data residency requirements

### Core Estimations

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| **DAU / MAU** | 300K / 1.2M | 20% daily; 80% monthly (warehouse staff are daily users) |
| **Read:Write Ratio** | 8:1 | Heavy dashboard usage, tracking queries, and forecast lookups vs. order creation and shipment updates |
| **Orders per day** | 2M | 500M/year ÷ 250 working days (B2B); continuous for B2C channels |
| **Shipment events per day** | 50M | 1B shipments/year × 50 status events per shipment ÷ 365 |
| **IoT events per day** | 5B | ~5M active sensors × 1 reading/minute average |
| **Inventory transactions per day** | 50M | Receipts, picks, adjustments, cycle counts across all warehouses |
| **Demand forecasts per cycle** | 500M | 200K SKUs × 2,500 locations (representative per tenant) × weekly |
| **Route optimization requests per day** | 2M | 50K shipments/day × 40 candidate routes evaluated each |
| **EDI messages per day** | 10M | ASN, PO ack, invoice, status across all supplier connections |
| **QPS (average)** | ~80K | Dominated by IoT ingestion: 5B/86400 ≈ 58K; plus 20K transactional |
| **QPS (peak)** | ~200K | Holiday season 2.5× multiplier on order volume; IoT steady |
| **Concurrent WebSocket connections** | ~100K | Control tower dashboards, warehouse floor tablets, driver apps |

### Storage Estimations

| Data Type | Size per Record | Annual Volume | Year 1 Storage | Year 5 Storage |
|-----------|----------------|---------------|----------------|----------------|
| Orders (header + lines) | ~4 KB | 500M | 2 TB | 10 TB |
| Shipment records | ~3 KB | 1B | 3 TB | 15 TB |
| Shipment tracking events | ~500 bytes | 50B | 25 TB | 125 TB |
| IoT sensor readings | ~200 bytes | 1.8T | 360 TB | 1.8 PB |
| Inventory transactions | ~500 bytes | 18B | 9 TB | 45 TB |
| Demand forecasts (results) | ~200 bytes | 25B/year | 5 TB | 25 TB |
| Supplier EDI messages | ~2 KB | 3.6B | 7.2 TB | 36 TB |
| Route optimization results | ~5 KB | 730M | 3.6 TB | 18 TB |
| Audit logs | ~1 KB | 10B | 10 TB | 50 TB |
| ML model artifacts | ~50 MB each | 100K models | 5 TB | 10 TB |
| **Total (structured)** | | | ~65 TB | ~330 TB |
| **Total (with IoT raw)** | | | ~430 TB | ~2.2 PB |

### Bandwidth Estimations

| Direction | Calculation | Bandwidth |
|-----------|-------------|-----------|
| **Inbound (IoT)** | 5B events/day × 200 bytes = 1 TB/day | ~12 MB/s avg |
| **Inbound (transactional)** | 60M write ops/day × 3 KB avg = 180 GB/day | ~2 MB/s avg |
| **Inbound (EDI)** | 10M messages/day × 2 KB = 20 GB/day | ~230 KB/s avg |
| **Outbound (reads)** | 500M read ops/day × 5 KB avg = 2.5 TB/day | ~30 MB/s avg |
| **Peak bandwidth** | 3× average | ~130 MB/s |

### Cache Sizing

| Cache Layer | Data | Estimated Size |
|-------------|------|----------------|
| **Inventory position cache** | Current ATP by SKU-location | ~20 GB (2B SKU-locations × 10 bytes) |
| **Order status cache** | Active orders (last 30 days) | ~8 GB (60M orders × 128 bytes) |
| **Carrier rate cache** | Contracted rates by lane | ~5 GB |
| **Forecast cache** | Latest forecast per SKU-location | ~10 GB |
| **Tracking position cache** | Active shipment positions | ~3 GB (10M active × 300 bytes) |
| **Session/auth cache** | Active user sessions and permissions | ~3 GB |
| **Total cache** | | ~49 GB |

---

## SLOs / SLAs

| Metric | Target | Measurement | Escalation |
|--------|--------|-------------|------------|
| **Order capture availability** | 99.95% | Synthetic orders every 30s from each region | Page on-call if < 99.9% over 5-minute window |
| **Order-to-ship latency** | < 4 hours (same-day orders received before cutoff) | End-to-end trace from order capture to ship confirm | Alert if p95 > 6 hours |
| **ATP check latency** | < 150ms (p95) | Time from ATP request to response | Alert if p99 > 500ms |
| **Forecast accuracy (MAPE)** | < 25% for A-items, < 35% for B-items | Weighted Mean Absolute Percentage Error | Trigger model retraining if accuracy degrades > 5% over 4 weeks |
| **Tracking update freshness** | < 15 minutes from carrier scan to dashboard display | Carrier event timestamp vs. system display timestamp | Alert if lag > 30 minutes |
| **IoT ingestion throughput** | > 99.99% event acceptance rate | Accepted events ÷ received events | Scale streaming cluster if rejection rate > 0.01% |
| **Route optimization quality** | < 5% cost gap vs. optimal (offline solver benchmark) | Compare real-time solver result to overnight batch optimal | Review solver configuration if gap > 8% |
| **EDI processing** | 99.9% success rate, < 5 minute processing time | Failed ÷ total EDI messages; processing duration | Alert on > 1% failure rate; investigate partner connectivity |
| **Control tower dashboard** | < 3s full page load (p95) | Synthetic user monitoring from each region | Degrade to cached data if backend latency exceeds threshold |
| **Data durability** | Zero loss for orders and inventory | WAL verification, replication lag monitoring | Halt writes if replication lag > 10s |

---

## Tenant Isolation Model

| Tier | Isolation Level | Database | Compute | Use Case |
|------|----------------|----------|---------|----------|
| **Enterprise** | Dedicated schema, dedicated ML model training | Dedicated schema with row-level security; dedicated forecast model cluster | Dedicated compute pool for optimization solvers | Large manufacturers and retailers with custom model requirements |
| **Business** | Shared schema, tenant-partitioned data | Shared tables with mandatory tenant_id; shared model training with tenant-specific features | Shared compute with resource quotas | Mid-market distributors and manufacturers |
| **Standard** | Fully shared | Shared tables, shared indexes | Shared compute, best-effort | Small businesses and trial accounts |

---

## Traffic Patterns

```
Daily Traffic Profile (UTC, global operations mix):

Hour:  00  02  04  06  08  10  12  14  16  18  20  22
       |   |   |   |   |   |   |   |   |   |   |   |
IoT:   ████████████████████████████████████████████████  (steady 24/7)
Order: ██  █                                         ██
       ██  ██  █               ██                  █  ██
       ██  ██  ██  ██  █████████████  ███████████████  ██
WH:    ██  ████████████████████████████████████  ██  ██
Plan:              ██████████████          ████████████

Notes:
- IoT ingestion: constant 24/7 with minimal variation
- Order volume: follows business hours across time zones
- Warehouse operations: shift-based peaks (6AM-10PM local)
- Planning workloads: business-hours batch jobs + overnight batch runs
- Holiday season: 2-5x order volume spike (Black Friday through year-end)
- Promotional events: 3-10x spike for flash sales (unpredictable timing)
```
