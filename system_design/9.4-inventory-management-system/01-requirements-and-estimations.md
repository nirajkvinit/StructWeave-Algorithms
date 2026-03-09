# Requirements & Estimations

## Functional Requirements

### Core Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **SKU & Product Master Management** | Maintain a centralized product catalog with attributes including dimensions, weight, hazmat classification, storage requirements (temperature, humidity), shelf life, and product hierarchy (category, subcategory, brand). Support product variants, kitting/bundling definitions, and cross-reference mappings to supplier part numbers and UPC/EAN barcodes. |
| F2 | **Multi-Warehouse Location Management** | Model warehouse topology as a hierarchy: warehouse > zone > aisle > rack > shelf > bin. Each location carries attributes for capacity (weight, volume, unit count), storage type (ambient, refrigerated, frozen, hazmat), pick priority, and replenishment thresholds. Support virtual locations for quality hold, damage, returns, and cross-dock staging. |
| F3 | **Inbound Processing (Receiving & Putaway)** | Receive goods against purchase orders or blind receipts with quantity verification, quality inspection gates, and barcode/RFID scanning. Generate putaway tasks with directed bin assignments based on product velocity (ABC classification), weight constraints, zone compatibility, and bin fill optimization. Support ASN (Advance Shipping Notice) pre-receipt for accelerated dock-to-stock. |
| F4 | **Inventory Costing Engine** | Calculate and maintain unit costs using configurable costing methods: FIFO (First-In, First-Out), LIFO (Last-In, First-Out), FEFO (First-Expired, First-Out), weighted average cost, and standard cost with variance tracking. Every inventory movement (receipt, pick, transfer, adjustment) must generate a costing transaction with the correct valuation for downstream financial posting. |
| F5 | **Stock Level Tracking & Real-Time Visibility** | Maintain real-time stock quantities at bin level with breakdowns: on-hand, reserved (soft and hard), in-transit, on-order, quarantined, damaged, and available. Provide aggregated views at SKU-warehouse, SKU-zone, and SKU-global levels. Push stock change events to downstream consumers within 500ms of the physical movement confirmation. |
| F6 | **Inventory Reservation Engine** | Process soft reservations (time-bounded holds against available stock for shopping carts and order capture) and hard reservations (committed allocations for confirmed orders). Handle reservation conflicts with configurable priority rules, timeout-based auto-release for expired soft reservations, and split-fulfillment across warehouses when single-warehouse stock is insufficient. |
| F7 | **Batch/Lot Tracking & Serial Number Management** | Track inventory at batch/lot granularity with attributes: manufacturing date, expiration date, supplier lot number, country of origin, and custom attributes. Support serial number tracking for individual unit provenance. Enable forward tracing (lot to all downstream shipments) and backward tracing (shipment to all source lots) for recall management. |
| F8 | **Pick-Pack-Ship Workflow & Wave Planning** | Group orders into pick waves based on carrier cutoff times, priority levels, and zone clustering. Generate optimized pick lists with travel-minimized sequencing. Support pick strategies: discrete (single-order), batch (multi-order), zone (area-based), and cluster (cart-based) picking. Pack verification via scan confirmation. Carrier label generation and manifest creation. |
| F9 | **Cycle Counting & Physical Inventory** | Execute continuous cycle counts using ABC classification frequency (A items daily, B weekly, C monthly). Support directed counts (system-triggered on discrepancy suspicion), random sampling, and full wall-to-wall physical inventory. Reconcile count variances with tolerance thresholds, generate adjustment transactions, and produce audit-ready variance reports. |
| F10 | **Reorder Point & Safety Stock Management** | Calculate reorder points dynamically based on average daily demand, supplier lead time, lead time variability, and target service level. Compute safety stock using statistical models (normal distribution, Poisson) accounting for demand variability and lead time uncertainty. Generate purchase requisitions automatically when available stock drops below reorder point. |
| F11 | **Transfer Orders & Cross-Docking** | Create and execute inter-warehouse transfer orders with in-transit tracking, receiving confirmation, and automatic stock rebalancing. Support cross-docking workflows where inbound goods are routed directly to outbound staging without putaway, reducing handling time for pre-allocated or flow-through merchandise. |
| F12 | **Omnichannel Available-to-Promise (ATP)** | Compute real-time ATP by aggregating: on-hand minus reserved minus safety stock plus inbound pipeline (scheduled receipts) minus outbound commitments. Support ATP by warehouse, by region, and globally. Provide promising rules engine that selects optimal fulfillment location based on proximity, stock availability, shipping cost, and delivery SLA. |
| F13 | **Demand Forecasting Integration** | Consume demand forecast signals from external forecasting engines. Use forecast data to adjust safety stock levels, trigger pre-positioning of inventory to regional warehouses, and feed reorder point calculations. Publish historical consumption data as training inputs for forecast models. |
| F14 | **Returns Processing (Reverse Logistics)** | Receive returned goods with disposition workflows: restock (return to available), refurbish, quarantine for inspection, or scrap/write-off. Update stock levels and costing based on disposition. Track return reasons for quality analytics. Support vendor return authorization (RMA) for defective batch returns to suppliers. |
| F15 | **Inventory Adjustment & Write-Offs** | Process manual and system-generated adjustments for damage, shrinkage, expiration, and reclassification. Require multi-level approval workflows for adjustments above configurable thresholds. Generate financial adjustment entries with reason codes for audit compliance. Track adjustment trends for loss prevention analytics. |
| F16 | **Reporting & Analytics Dashboard** | Provide operational dashboards: stock levels by warehouse/zone, aging analysis, fill rate, order cycle time, pick productivity, and dock-to-stock time. Financial reports: inventory valuation by costing method, COGS reconciliation, shrinkage trends, and carrying cost analysis. Support ad-hoc query capability and scheduled report generation. |

### User Roles

| Role | Capabilities |
|------|-------------|
| **Warehouse Operator** | Scan receipts, execute putaway tasks, perform picks, confirm pack/ship, execute cycle counts, report damaged goods, process returns at dock |
| **Warehouse Manager** | Plan waves, assign work zones, manage dock door scheduling, approve adjustments below threshold, monitor real-time warehouse productivity, manage labor allocation |
| **Inventory Planner** | Configure reorder points and safety stock, analyze demand patterns, manage ABC classification, execute inter-warehouse transfers, monitor stock aging and expiration |
| **Procurement Manager** | View stock levels and reorder recommendations, approve purchase requisitions, manage supplier lead time data, coordinate ASN receipt schedules |
| **Finance / Accounting** | Run inventory valuation reports, review costing transactions, approve write-offs and high-value adjustments, reconcile physical-to-book variances, generate period-end inventory reports |
| **System Admin** | Configure warehouse topology, manage user permissions and role assignments, define business rules (reservation timeouts, approval thresholds), maintain integration configurations |

### Out of Scope

| Exclusion | Rationale |
|-----------|-----------|
| **Full ERP Functionality** | General ledger, accounts payable/receivable, and HR modules are separate systems; this design covers only the inventory and warehouse management domain |
| **Transportation Management** | Carrier selection, route optimization, freight audit, and last-mile delivery are handled by a dedicated TMS; this system generates shipment manifests as output |
| **Procurement & Purchase Order Creation** | PO creation, supplier negotiation, and contract management belong to the procurement system; this system receives POs as input and triggers purchase requisitions as output |
| **E-Commerce Storefront** | Product display, shopping cart, checkout, and payment processing are separate; this system provides ATP data and reservation APIs consumed by the storefront |
| **Manufacturing & BOM Management** | Bill of materials, production scheduling, and shop floor execution are manufacturing domain; this system manages raw material and finished goods inventory, not production processes |

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **ATP Query Latency** | p50 < 10ms, p99 < 50ms | E-commerce product pages query ATP on every view; latency directly impacts conversion rate and page load time |
| **Reservation Processing** | p50 < 20ms, p99 < 100ms | Checkout flow blocks on reservation; every 100ms of latency reduces conversion by ~1% at scale |
| **Inventory Movement Write** | p50 < 30ms, p99 < 200ms | Warehouse operators wait for scan confirmation; latency above 200ms disrupts pick productivity and causes double-scans |
| **System Availability** | 99.99% (52.6 min downtime/year) | Warehouse operations run 20+ hours/day; system downtime halts all inbound/outbound activity and idles hundreds of workers |
| **Stock Accuracy** | > 99.9% | Inventory discrepancies below 0.1% are the benchmark for world-class warehouse operations; below this threshold, financial reporting and order promising become unreliable |
| **Data Durability** | Zero movement loss | Every inventory movement represents a physical action that has already occurred; losing the record creates phantom inventory and financial discrepancies |
| **CAP Trade-off** | CP for stock mutations and reservations; AP for analytics, dashboards, and forecast inputs | Overselling a unit has real-world consequences (expedited shipping, customer disappointment); stale dashboards are tolerable |
| **Throughput** | 6,000 movements/sec sustained; 50K reservations/sec burst | Normal operations generate ~500M movements/day; flash sales create reservation bursts an order of magnitude above baseline |
| **Recovery Time Objective** | < 60s for write path; < 5 min for analytics | Movement recording must recover near-instantly to avoid warehouse operator idle time; analytics can tolerate brief staleness |
| **Recovery Point Objective** | Zero for inventory movements; < 1 min for analytics | Synchronous replication for movement writes; async replication acceptable for read replicas and analytics stores |
| **Idempotency** | All movement and reservation APIs idempotent | RF scanners retry on timeout; duplicate movements create phantom stock or double-deductions that are extremely difficult to detect |
| **Audit Trail** | Immutable, append-only event log for all stock changes | SOX compliance requires full traceability of every inventory change with timestamp, actor, reason, and before/after quantities |
| **Batch Traceability** | Forward and backward trace in < 5s for any lot | FDA recall timelines require rapid identification of all affected downstream recipients; slow tracing delays consumer protection |

---

## Capacity Estimations

### Reference Scale

A large multi-channel retailer operating a global network of warehouses and fulfillment centers:

```
Warehouses / distribution centers:     500
Active SKUs:                           5,000,000  (5M)
Bin locations (total across all WH):   50,000,000 (50M)
Lot/batch records (active):            100,000,000 (100M)
Serial numbers tracked:                500,000,000 (500M)

Daily inventory movements:             500,000,000 (500M)
  Picks:                               250M (50%)
  Putaways:                            80M  (16%)
  Receipts:                            50M  (10%)
  Transfers:                           50M  (10%)
  Adjustments:                         20M  (4%)
  Cycle count confirmations:           50M  (10%)

Daily ATP queries:                     10,000,000,000 (10B)
  Product page views:                  8B   (80%)
  Cart / checkout:                     1.5B (15%)
  Internal planning tools:             500M (5%)

Peak reservations per second:          50,000 (flash sales)
Average reservation rate:              ~5,000/sec
Reservation timeout (soft):            15 minutes
Reservation conversion rate:           ~70% (soft to hard)

Inbound shipments per day:             2,000,000  (2M PO lines)
Outbound shipments per day:            5,000,000  (5M parcels)
Returns processed per day:             500,000    (500K)
Cycle counts performed per day:        500,000    (500K count tasks)
```

### Storage Estimates

```
--- SKU Master Records ---
Record size:               ~2 KB (attributes, dimensions, classification, cross-refs)
Total SKU storage:         5M x 2 KB = 10 GB
With indexes:              ~30 GB

--- Bin Location Records ---
Record size:               ~500 bytes (warehouse, zone, aisle, rack, shelf, bin, capacity, type, status)
Total bin storage:         50M x 500 B = 25 GB
With indexes:              ~75 GB

--- Inventory Position Records ---
  (Current stock by SKU + bin + lot + status)
Record size:               ~300 bytes (SKU ID, bin ID, lot ID, quantity, status, cost, timestamps)
Active positions:          ~200M (many bins hold multiple SKUs/lots)
Position storage:          200M x 300 B = 60 GB
With indexes:              ~180 GB

--- Lot/Batch Records ---
Record size:               ~500 bytes (lot number, mfg date, expiry, supplier, origin, attributes)
Active lots:               100M
Lot storage:               100M x 500 B = 50 GB

--- Serial Number Records ---
Record size:               ~200 bytes (serial, SKU, lot, current location, status)
Active serials:            500M
Serial storage:            500M x 200 B = 100 GB

--- Movement Transaction Records (Event Store) ---
Record size:               ~1 KB (movement type, SKU, from/to location, quantity, lot, serial,
                            cost, actor, timestamp, reason code, idempotency key)
Daily growth:              500M x 1 KB = 500 GB/day
Annual growth:             ~182 TB/year
Retention:                 7 years (SOX audit requirement)

--- Reservation Records ---
Record size:               ~400 bytes (reservation ID, SKU, warehouse, quantity, type,
                            status, order ref, created/expires timestamps)
Active reservations:       ~20M at any time (soft + hard)
Reservation storage:       20M x 400 B = 8 GB
Historical (annual):       ~2B reservations/year x 400 B = 800 GB/year

--- ATP Snapshot Cache ---
Record size:               ~200 bytes (SKU, warehouse, on-hand, reserved, in-transit, available)
Total entries:             5M SKUs x 500 warehouses = 2.5B (but sparse: ~100M active combos)
Cache storage:             100M x 200 B = 20 GB

--- Costing Layer Records ---
Record size:               ~300 bytes (SKU, warehouse, cost layer, quantity remaining, unit cost, receipt ref)
Active cost layers:        ~50M (FIFO queues across all SKU-warehouse combos)
Cost layer storage:        50M x 300 B = 15 GB

--- Aggregate Storage Summary ---
Hot data (current state):          ~500 GB (positions, active lots, serials, reservations, cache)
Warm data (recent movements):      ~500 GB/day → ~15 TB rolling 30-day window
Cold data (historical):            ~182 TB/year, ~1.3 PB over 7-year retention
With 3x replication:               ~4 PB total across retention window
```

### Throughput Estimates

```
--- Write Path (Movements) ---
Average movement rate:     500M / 86,400 sec ≈ 5,800 movements/sec
Peak movement rate:        ~3x average ≈ 17,400 movements/sec
  (Peak during morning receiving + afternoon shipping overlap)

--- Write Path (Reservations) ---
Average reservation rate:  ~5,000/sec (create + release + convert + expire)
Peak reservation rate:     ~50,000/sec (flash sale events)
Reservation lock duration: avg ~8 min for soft, indefinite for hard

--- Read Path (ATP Queries) ---
Average ATP query rate:    10B / 86,400 ≈ 115,000 queries/sec
Peak ATP query rate:       ~4x average ≈ 460,000 queries/sec
  (Promotional events driving e-commerce traffic spikes)
Cache hit ratio target:    > 99% (cold queries fall through to materialized view)

--- Read Path (Warehouse Operations) ---
Pick task queries:         ~50,000/sec (warehouse operators polling for next task)
Putaway suggestions:       ~3,000/sec (directed putaway bin recommendations)
Bin lookup queries:        ~20,000/sec (scan-and-verify operations)

--- Event Processing ---
Movement events published: 5,800 events/sec average
Event consumers:           8+ downstream services (costing, audit, ATP updater,
                            reorder monitor, analytics, forecasting, notification, integration)
Total event fanout:        5,800 x 8 ≈ 46,400 event deliveries/sec
```

### Bandwidth Estimates

```
--- API Traffic (External) ---
ATP query request:          ~200 bytes (SKU ID, warehouse filter, channel)
ATP query response:         ~500 bytes (availability breakdown, fulfillment options)
ATP bandwidth (peak):       460,000 req/sec x 700 B avg ≈ 322 MB/s ≈ 2.6 Gbps

Movement API request:       ~800 bytes (movement details, scan data, operator context)
Movement API response:      ~400 bytes (confirmation, updated quantities)
Movement bandwidth (peak):  17,400 req/sec x 1.2 KB avg ≈ 20.9 MB/s

Reservation API request:    ~500 bytes (SKU, quantity, warehouse, timeout, order ref)
Reservation API response:   ~300 bytes (reservation ID, status, expiry)
Reservation bandwidth:      50,000 req/sec x 800 B avg ≈ 40 MB/s

--- Internal Traffic ---
Event bus throughput:        46,400 events/sec x 1.2 KB avg ≈ 55.7 MB/s
Database replication:        500 GB/day x 3 replicas = 1.5 TB/day ≈ 17.4 MB/s sustained
Cache synchronization:       ~50 MB/s (ATP cache updates across nodes)

--- Total Network ---
Peak external bandwidth:     ~3 Gbps
Peak internal bandwidth:     ~2 Gbps
Total peak:                  ~5 Gbps
```

---

## Capacity Summary

| Metric | Estimation | Calculation |
|--------|-----------|-------------|
| **Active Warehouses** | 500 | Multi-tier network: mega-DCs, regional FCs, urban micro-FCs |
| **Active SKUs** | 5M | Across all categories, warehouses, and channels |
| **Bin Locations** | 50M | ~100K bins per warehouse average |
| **Movements/Day** | 500M | Picks (50%) + putaways (16%) + receipts (10%) + transfers + adjustments + counts |
| **Average Movement TPS** | ~5,800 | 500M / 86,400 seconds |
| **Peak Movement TPS** | ~17,400 | 3x average during receiving-shipping overlap windows |
| **ATP Queries/Day** | 10B | E-commerce page views + cart checks + internal planning |
| **Peak ATP QPS** | ~460K | 4x average during promotional events |
| **Peak Reservation TPS** | 50K | Flash sale scenarios with high-demand limited-stock SKUs |
| **Hot Storage** | ~500 GB | Current positions, active lots, reservations, ATP cache |
| **Daily Storage Growth** | ~500 GB | Movement transaction records (event store) |
| **Annual Storage Growth** | ~182 TB | Movement history; 1.3 PB over 7-year retention |
| **Total Storage (with replicas)** | ~4 PB | 7-year retention with 3x replication |
| **Peak Bandwidth** | ~5 Gbps | ATP queries dominate external; replication dominates internal |

---

## SLO / SLA Table

| Service | Metric | SLO | SLA | Measurement |
|---------|--------|-----|-----|-------------|
| ATP Query | Latency p50 | < 10ms | < 25ms | Cache-served response including availability breakdown |
| ATP Query | Latency p99 | < 50ms | < 100ms | Including cache-miss fallback to materialized view |
| ATP Query | Availability | 99.99% | 99.95% | Successful responses / total requests |
| Reservation Create | Latency p50 | < 20ms | < 50ms | Soft reservation lock acquisition and confirmation |
| Reservation Create | Latency p99 | < 100ms | < 200ms | Including contention retry under peak load |
| Reservation Create | Success rate | > 99.9% | > 99.5% | Reservations fulfilled / reservations requested (excluding genuine stockouts) |
| Movement Write | Latency p50 | < 30ms | < 50ms | Scan confirmation returned to RF device |
| Movement Write | Latency p99 | < 200ms | < 500ms | Including synchronous replication and event publish |
| Movement Write | Durability | 100% | 100% | Zero acknowledged movements lost |
| Cycle Count | Variance detection | < 5s | < 15s | Time from count submission to variance flag |
| Batch Trace | Forward/backward trace | < 5s | < 15s | Complete trace for any lot across all movements |
| Reorder Alert | Trigger latency | < 5 min | < 15 min | Time from threshold breach to purchase requisition generation |
| Stock Accuracy | System vs physical | > 99.9% | > 99.5% | Measured by cycle count results across all warehouses |
| Putaway Direction | Suggestion latency | < 500ms | < 1s | Bin recommendation returned after receipt scan |
| Wave Planning | Plan generation | < 30s | < 60s | Wave plan computed for up to 10,000 orders |
| Event Propagation | Movement to ATP update | < 500ms | < 2s | Time from movement confirmation to ATP cache refresh |

---

## Key Estimation Insights

1. **ATP queries dominate all other traffic by two orders of magnitude**: At 10B daily queries versus 500M daily movements, the read-to-write ratio exceeds 20:1. This makes CQRS not just beneficial but essential --- the ATP read path must be served entirely from pre-computed caches and materialized views that are asynchronously updated by the write path. Any design that queries the transactional inventory database for ATP will collapse under load.

2. **The reservation engine is the concurrency bottleneck, not the inventory database**: While the inventory database handles ~5,800 writes/sec at steady state (manageable for a well-partitioned database), the reservation engine must handle 50,000 concurrent lock acquisitions per second during flash sales, many competing for the same SKU-warehouse combination. This requires specialized data structures --- distributed counters, optimistic locking with retry, or reservation queuing --- rather than traditional database transactions.

3. **Movement event fanout creates a hidden amplification factor**: Each of the 5,800 movements/sec triggers updates to 8+ downstream consumers (costing, audit, ATP, reorder, analytics, forecasting, notification, integration), creating ~46,400 event deliveries per second. The event bus must handle this fanout without back-pressure causing movement write latency to spike, making the messaging infrastructure a critical scaling concern.

4. **Storage is dominated by historical movement records, not current state**: Current inventory state (positions, reservations, lots) fits in ~500 GB --- easily memory-cacheable. But movement history grows at 500 GB/day, accumulating to 1.3 PB over the 7-year SOX retention window. This demands a tiered storage strategy: hot (recent 24h in fast storage), warm (30-day window for operational queries), cold (compressed archival for audit and compliance).

5. **Bin-level granularity creates a combinatorial explosion**: With 5M SKUs and 50M bins, the theoretical SKU-bin combination space is 250 trillion. The actual occupied space (~200M active positions) is a tiny fraction, but the system must still efficiently answer "what is in bin X" and "where is SKU Y" queries. This dual-key access pattern requires careful index design --- neither a SKU-partitioned nor a bin-partitioned schema alone is sufficient.

6. **FEFO costing under concurrent picks creates queue contention**: Under FEFO (First-Expired, First-Out) costing, multiple concurrent picks of the same SKU must all dequeue from the same expiration-ordered cost layer queue. Without careful concurrency control, two picks could both claim the "first expiring" layer, creating a costing error. This makes the costing engine's concurrency model as critical as the reservation engine's.

7. **Cycle count frequency is inversely proportional to stock value confidence**: A items (top 20% of SKUs by value, representing ~80% of inventory value) require daily counting, while C items may only need quarterly counts. At 500K count tasks per day across 500 warehouses, that is 1,000 count tasks per warehouse per day --- roughly one count every 70 seconds of a 20-hour operating day. The counting workload itself must be scheduled to avoid conflicting with peak pick activity.

8. **Peak-to-average ratios differ dramatically across operation types**: Movement TPS peaks at 3x average (predictable: receiving morning, shipping afternoon), but reservation TPS peaks at 10x average (unpredictable: flash sales). This asymmetry means the movement write path can be provisioned with modest headroom, while the reservation engine requires aggressive auto-scaling or pre-warmed capacity pools triggered by promotional event calendars.

---

## Failure Budget Analysis

| Service | Availability Target | Allowed Downtime/Year | Allowed Failures/Day | Impact of Breach |
|---------|---------------------|-----------------------|---------------------|-----------------|
| Inventory Movement Write | 99.99% | 52.6 min | 50,000 movements | Warehouse operators idle; inbound/outbound halted; revenue impact from delayed shipments |
| ATP Query | 99.99% | 52.6 min | 1,000,000 queries | E-commerce shows "out of stock" for available items or sells unavailable items; direct revenue loss |
| Reservation Engine | 99.95% | 4.38 hours | 25,000 reservations | Checkout failures during reservation outage; orders queue and retry; customer abandonment |
| Costing Engine | 99.9% | 8.76 hours | N/A (async) | Movement writes proceed but costing is deferred; financial reports temporarily stale; no operational impact |
| Wave Planning | 99.9% | 8.76 hours | N/A (batch) | Picks delayed until next wave; shipping SLAs at risk; manual wave override available |
| Cycle Counting | 99.5% | 43.8 hours | 2,500 counts | Counting tasks delayed; stock accuracy degrades gradually; no immediate operational impact |

### Failure Budget Allocation Strategy

- **60% reserved for planned maintenance**: Database schema migrations, index rebuilds, and storage tier rotations scheduled during minimum-activity windows (typically 2 AM -- 5 AM local warehouse time, staggered across time zones).
- **25% reserved for unplanned incidents**: Hardware failures, network partitions, and dependency outages. Active-passive failover for write path; active-active for read path (ATP) absorbs most failures transparently.
- **15% buffer for edge cases**: Inventory reconciliation anomalies, costing engine race conditions, and event processing backlogs that trigger circuit breakers.

---

## Seasonal and Event-Driven Scaling Considerations

| Event | Movement TPS Multiple | Reservation TPS Multiple | Duration | Key Bottleneck |
|-------|-----------------------|-------------------------|----------|---------------|
| Holiday peak (Nov-Dec) | 3x sustained | 5x sustained | 6 weeks | Warehouse labor capacity; putaway throughput for pre-positioned inventory |
| Flash sale / promotional event | 1.5x | 10x burst | 2-4 hours | Reservation engine concurrency; ATP cache freshness during rapid stock depletion |
| Season change (apparel) | 2x inbound | 1x | 2-3 weeks | Receiving dock throughput; putaway bin availability as old season stock occupies space |
| New product launch | 1.2x | 8x for specific SKUs | 24-48 hours | Hot-SKU reservation contention; ATP for single SKU queried millions of times |
| Year-end physical inventory | 2x count tasks | 0.5x (reduced orders) | 3-5 days | Cycle count processing; variance reconciliation backlog; costing adjustment volume |
| Returns surge (post-holiday) | 2x returns processing | N/A | 3-4 weeks | Returns inspection throughput; disposition decision backlog; restock putaway capacity |

Pre-scaling strategy: promotional event calendar integration triggers reservation engine scale-up 30 minutes before announced sale start times. Holiday peak preparation begins 2 weeks early with pre-warmed connection pools and expanded cache clusters. Warehouse topology changes (temporary overflow zones, additional staging areas) are modeled and provisioned in the system before physical setup begins.
