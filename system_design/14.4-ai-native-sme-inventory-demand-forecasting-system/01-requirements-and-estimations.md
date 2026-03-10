# 14.4 AI-Native SME Inventory & Demand Forecasting System — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **Multi-channel sales ingestion** — Ingest real-time sales data from connected commerce channels (online storefronts, marketplaces, physical POS terminals, social commerce, B2B order portals) via webhooks and API polling; normalize order data into a unified schema with SKU mapping, quantity, price, channel, location, and timestamp | Support 15+ channel integrations; handle channel-specific SKU identifiers via configurable mapping rules; deduplicate orders across channels where a single order may trigger multiple webhook events; process order amendments (quantity changes, cancellations) as correction events |
| FR-02 | **Probabilistic demand forecasting** — Generate demand forecasts as probability distributions (not point estimates) at the SKU-location-day granularity; automatically select optimal forecasting model per SKU from ensemble (exponential smoothing, Croston/SBA for intermittent demand, hierarchical Bayesian for sparse data, gradient-boosted trees for promotion-sensitive items); incorporate external signals (promotions, seasonality, weather, events) | Forecast horizon: 1–90 days; update daily with latest sales; WAPE ≤ 25% for A-class SKUs, ≤ 35% for B-class, ≤ 50% for C-class long-tail; cold-start forecasting for new SKUs using attribute-based transfer learning; support for promotional demand uplift modeling |
| FR-03 | **Automated reorder optimization** — Compute optimal reorder point (R) and order quantity (Q) per SKU-location using stochastic optimization; account for probabilistic demand, stochastic lead times, holding costs, ordering costs, stockout costs, supplier MOQs, volume discounts, shelf life constraints, and cash flow limitations; generate purchase order recommendations with one-tap approval | Reorder recommendations refreshed daily; support configurable service levels per SKU class (99%/95%/90%); batch multiple SKUs per supplier into consolidated POs; respect supplier order windows and delivery schedules |
| FR-04 | **Real-time inventory synchronization** — Maintain unified inventory position across all connected channels; propagate stock changes within 10 seconds of any sales, receipt, adjustment, or transfer event; handle channel-specific API constraints (rate limits, batch update requirements, eventual consistency); prevent overselling through available-to-promise calculation | Sub-10-second sync for primary channels; automatic oversell detection and resolution; channel-specific safety buffers configurable per SKU-channel; full reconciliation sweep every 4 hours to detect and correct drift |
| FR-05 | **Batch and expiry management** — Track inventory at the batch/lot level with manufacturing date, expiry date, and batch identifier; enforce FEFO (First Expiry First Out) allocation for outbound orders; generate proactive alerts for approaching expiry (configurable thresholds: 30/15/7 days); recommend markdown pricing for near-expiry items; support batch recall with affected-order tracing | Support food, pharmaceutical, and cosmetics batch tracking; calculate shelf-life-adjusted reorder quantities; FEFO compliance audit trail for regulatory requirements; markdown recommendation based on remaining-shelf-life-to-demand-velocity ratio |
| FR-06 | **Multi-location inventory management** — Track inventory across multiple warehouse, store, and fulfillment locations; support inter-location transfers with in-transit tracking; optimize fulfillment routing (which location fulfills which order) based on proximity, stock levels, expiry dates, and shipping cost; maintain location-specific reorder policies | Support 1–50 locations per tenant; transfer order workflow with ship-confirm-receive states; location-level safety stock computation; automatic rebalancing recommendations when stock is misallocated across locations |
| FR-07 | **Supplier management and intelligence** — Maintain supplier catalog with product mappings, pricing tiers, MOQs, lead times, and order windows; track actual vs. promised lead times to build probabilistic lead time distributions; generate supplier performance scorecards; detect lead time deterioration trends; support multiple suppliers per SKU with preference ranking | Track lead time distributions per supplier-SKU combination; automatic reorder point adjustment when supplier performance degrades; supplier comparison for cost-lead time trade-offs; PO status tracking (submitted, confirmed, shipped, received) |
| FR-08 | **Promotion and event demand planning** — Allow merchants to register upcoming promotions, events, and campaigns; model expected demand uplift based on historical promotion response, promotion type, discount depth, and channel; adjust forecasts and reorder recommendations proactively before promotion start; detect unplanned demand spikes and attribute them to external events | Support promotion templates (BOGO, percentage off, bundle deals); cannibalization modeling (promotion on SKU-A reduces demand for SKU-B); post-promotion demand dip modeling; integration with channel promotion calendars |
| FR-09 | **ABC/XYZ classification and portfolio analytics** — Automatically classify SKUs into ABC categories (revenue contribution) and XYZ categories (demand variability); combine into a 9-cell matrix (AX, AY, AZ, BX, BY, BZ, CX, CY, CZ) with differentiated stocking policies; surface portfolio health metrics (inventory turnover, days of supply, dead stock percentage, stockout frequency) | Reclassification frequency: monthly with trend detection; configurable classification thresholds; dead stock identification (zero sales in 90+ days with positive on-hand); portfolio summary dashboard with drill-down to SKU level |
| FR-10 | **Purchase order workflow** — Generate draft purchase orders from reorder recommendations; support approval workflow (auto-approve below threshold, manual approval above); transmit POs to suppliers via email, API, or marketplace procurement channels; track PO lifecycle (draft, submitted, confirmed, partially received, fully received, cancelled); manage partial receipts and discrepancy resolution | PO consolidation across SKUs per supplier to optimize shipping; support for blanket POs with scheduled releases; goods receipt with barcode/QR scanning; discrepancy handling (short shipment, wrong item, damaged goods) |
| FR-11 | **Inventory adjustment and audit** — Support manual inventory adjustments (damage, theft, found stock, sampling) with reason codes; periodic stock count workflow with variance reporting; cycle count scheduling based on ABC classification (A items counted monthly, C items quarterly); adjustment approval workflow with configurable thresholds | Adjustment audit trail for all stock changes; variance threshold alerting; blind count support (counter doesn't see system quantity); rolling cycle count calendar generation |
| FR-12 | **Natural language insights and alerts** — Generate human-readable explanations for forecast outputs, reorder recommendations, and anomaly detections; deliver proactive alerts via in-app notification, email, SMS, and WhatsApp for stockout risks, overstock situations, expiring inventory, unusual demand patterns, and supplier delays; support conversational query interface ("when will I run out of SKU-123?") | Alert priority scoring to prevent notification fatigue; configurable alert channels and quiet hours; weekly digest with key metrics and recommended actions; plain-language trend explanations grounded in the merchant's own data |
| FR-13 | **Returns and reverse logistics** — Process returned items with reason coding (defective, wrong item, customer change of mind, expired); route returned stock to appropriate destination (restock, quarantine, dispose) based on condition and remaining shelf life; update inventory positions and demand signals (returns indicate demand quality, not just demand volume); adjust forecasts for SKUs with high return rates | Return rate tracking per SKU-channel; restockable vs. non-restockable classification; return-adjusted demand calculation (gross demand minus expected returns); quarantine management for items requiring inspection |
| FR-14 | **Data export and integration** — Provide API and CSV export for all inventory, sales, forecast, and PO data; support integration with accounting systems for cost-of-goods-sold calculation, tax reporting, and financial reconciliation; webhook-based event stream for downstream systems; scheduled report generation for business reviews | RESTful API with pagination and filtering; bulk export for historical data; real-time event stream for inventory movements; accounting integration for landed cost calculation |

---

## Out of Scope

- **Manufacturing and production planning** — Platform manages finished goods inventory only; no bill-of-materials explosion, production scheduling, or work-in-process tracking
- **Last-mile delivery logistics** — Fulfillment routing recommends which location ships, but does not manage carrier selection, route optimization, or delivery tracking
- **Marketplace seller analytics** — No competitive pricing intelligence, listing optimization, or advertising spend management; focused purely on inventory and demand
- **Custom hardware (IoT sensors, RFID)** — Platform integrates with existing POS and warehouse systems via software APIs; does not require proprietary hardware deployment
- **Financial lending or working capital** — No embedded financing, invoice factoring, or purchase order financing; purely inventory intelligence

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Channel sync propagation (p95) | ≤ 10 s | Overselling risk increases linearly with sync delay; 10 seconds is the threshold where multi-channel overselling becomes statistically significant for high-velocity SKUs |
| Forecast generation (p95) | ≤ 30 min for full tenant catalog | Nightly batch forecast must complete before merchant's business day begins; 5,000-SKU tenant with 5 locations = 25,000 SKU-location combinations |
| Reorder recommendation refresh (p95) | ≤ 15 min after forecast completion | Merchants need fresh recommendations available by morning; compute-bound on stochastic optimization per SKU |
| API response (p99) | ≤ 200 ms for inventory queries | Real-time inventory lookups from POS and channel integrations must not introduce checkout latency |
| Purchase order generation (p99) | ≤ 3 s | One-tap PO approval must feel instantaneous; includes SKU consolidation and supplier template rendering |
| Webhook processing (p99) | ≤ 2 s from receipt to inventory update | Channel webhooks must be acknowledged quickly to avoid retry storms; inventory position must reflect the change within this window |
| Search and filter (p99) | ≤ 500 ms for SKU catalog queries | Merchants searching 5,000-SKU catalogs expect instant results with faceted filtering |
| Batch/expiry alert evaluation (p95) | ≤ 5 min | Daily batch job evaluating expiry thresholds across all SKUs-batches; must complete within alerting SLA |

### Reliability & Availability

| Metric | Target |
|---|---|
| Core platform availability | 99.95% (≤ 4.4 hours downtime/year) |
| Channel sync service availability | 99.99% — sync downtime directly causes overselling and revenue loss |
| Inventory query API availability | 99.99% — POS systems depend on real-time inventory lookups; downtime blocks sales |
| Forecast service availability | 99.9% — batch process; can tolerate brief outages if recovery happens before next business day |
| Data durability for inventory records | 99.999999999% (11 nines) — inventory movements are financial records required for tax and audit |
| Webhook delivery guarantee | At-least-once delivery with idempotent processing — lost webhooks cause inventory drift |
| Event ordering guarantee | Per-SKU-location causal ordering for all inventory mutations — out-of-order processing causes phantom stock |

### Scalability

| Metric | Target |
|---|---|
| Tenants (SME merchants) | 100,000 active tenants |
| SKUs per tenant | Up to 50,000 (median: 2,000; p95: 15,000) |
| Total SKU-location combinations | 500M across all tenants (100K tenants × avg 5,000 SKU-locations) |
| Orders processed per day | 50M across all tenants (avg 500 orders/tenant/day) |
| Inventory sync events per day | 200M (orders + receipts + adjustments + transfers + channel syncs) |
| Forecast computations per day | 500M SKU-location-day forecasts (nightly batch) |
| Concurrent channel API connections | 500K (100K tenants × avg 5 channels) |
| Peak order throughput (flash sale) | 10x normal for individual tenant; 3x normal platform-wide |

### Security & Compliance

| Requirement | Specification |
|---|---|
| Multi-tenant data isolation | Strict tenant isolation at application and database levels; no cross-tenant data leakage; tenant data deletion within 30 days of account termination |
| Channel API credential security | OAuth tokens and API keys encrypted at rest with tenant-specific encryption keys; credentials never logged or exposed in error messages; automatic token refresh |
| PII protection | Customer data from orders (names, addresses, emails) encrypted at rest; PII minimization in analytics pipelines; GDPR/CCPA-compliant data handling |
| Food safety compliance | Batch/expiry tracking meets food safety traceability requirements (one-step-forward, one-step-back traceability); audit trail for FEFO compliance; recall workflow with affected-customer notification |
| Pharmaceutical batch tracking | Serialization support for regulated products; batch recall with full distribution chain traceability; temperature excursion logging integration; regulatory report generation |
| Audit trail | Immutable logging of every inventory mutation (sale, receipt, adjustment, transfer, sync correction) with actor, timestamp, reason, and before/after quantities; 7-year retention for tax compliance |

---

## Capacity Estimations

### Order Processing Volume

**Assumptions:**
- 100,000 active tenants
- Average 500 orders/day per tenant (range: 10–10,000)
- Each order averages 3 line items (SKU-quantity pairs)
- Peak: 3x platform average during festival seasons; 10x for individual tenants during flash sales

```
Order throughput:
  Baseline: 50,000,000 orders/day = 578 orders/sec
  Peak hour (6 PM - 10 PM): 4x concentration = 2,315 orders/sec
  Flash sale burst (single tenant): 10x normal = 5,000 orders/hour = 1.4 orders/sec per tenant
  Platform-wide festival peak: 150,000,000 orders/day = 1,736 orders/sec

Line item throughput:
  Baseline: 150,000,000 line items/day = 1,736/sec
  Peak: 450,000,000 line items/day = 5,208/sec
```

### Inventory Sync Volume

**Assumptions:**
- Each order triggers inventory sync to avg 5 channels
- Additional sync events: receipts (5% of order volume), adjustments (1%), transfers (0.5%)
- Full reconciliation sweep: 4x/day per channel per tenant

```
Sync events:
  Order-triggered syncs: 50M orders × 5 channels = 250M sync events/day
  Receipts: 2.5M/day
  Adjustments: 500K/day
  Transfers: 250K/day
  Reconciliation: 100K tenants × 5 channels × 4 sweeps = 2M reconciliation operations/day
  Total: ~255M sync events/day = 2,951/sec
  Peak: ~765M sync events/day = 8,854/sec
```

### Forecast Computation

**Assumptions:**
- 100K tenants × avg 5,000 SKU-location combinations = 500M forecasts
- Each forecast: 90-day horizon with daily granularity
- Model selection: evaluate 4 models per SKU, select best
- Nightly batch window: 6 hours (midnight to 6 AM per timezone)

```
Forecast computations:
  SKU-location forecasts: 500M per night
  Model evaluations: 500M × 4 models = 2B model evaluations/night
  Batch window: 6 hours = 21,600 seconds
  Throughput: 500M / 21,600 = 23,148 forecasts/sec
  With model selection: 2B / 21,600 = 92,593 model evaluations/sec
```

### Storage

```
Inventory position data:
  Per SKU-location record: ~500 bytes (quantities, thresholds, batch info)
  Total: 500M × 500 B = 250 GB
  With batch/expiry detail: 250 GB × 3 (avg 3 batches per SKU-location) = 750 GB

Sales history:
  Per order line item: ~200 bytes
  Daily: 150M × 200 B = 30 GB/day
  Annual: 30 GB × 365 = 10.95 TB/year

Forecast data:
  Per SKU-location-day (distribution summary): ~100 bytes (mean, std, percentiles)
  Total: 500M × 90 days × 100 B = 4.5 TB (rolling window)

Time-series feature store:
  Per SKU-location: 365 days × 50 features × 8 bytes = 146 KB
  Total: 500M × 146 KB = 73 TB

Channel sync log:
  Per event: ~300 bytes
  Daily: 255M × 300 B = 76.5 GB/day
  Retention (90 days): 6.9 TB

Total storage:
  Hot tier (current state + recent history): ~5 TB
  Warm tier (feature store + forecast data): ~78 TB
  Cold tier (historical data + audit trail): ~15 TB/year
  Approximate total: ~100 TB active
```

### Bandwidth

```
Inbound:
  Order webhooks: 50M × 2 KB avg = 100 GB/day
  Channel API polling: 2M reconciliation × 10 KB = 20 GB/day
  Supplier data: 500K updates × 1 KB = 500 MB/day
  Total inbound: ~121 GB/day = 11.2 Mbps sustained

Outbound:
  Channel inventory updates: 250M × 500 B = 125 GB/day
  API responses: 100M queries × 1 KB = 100 GB/day
  Alerts and notifications: 10M × 500 B = 5 GB/day
  Total outbound: ~230 GB/day = 21.3 Mbps sustained
  Peak (4x): ~85 Mbps
```

### Compute

```
Forecasting cluster:
  500M forecasts in 6 hours
  ~23K forecasts/sec
  Each forecast: ~5ms CPU time (lightweight models, pre-computed features)
  CPU requirement: 23K × 5ms = 115 CPU-cores sustained
  With overhead (model selection, I/O): 200 CPU-cores for 6 hours

Sync processing:
  255M events/day = 2,951/sec
  Each event: ~2ms processing + API call
  CPU requirement: ~6 CPU-cores + network I/O
  API call parallelism: 500K concurrent connections (connection pooling)

Optimization engine:
  500M (Q,R) computations in 6 hours
  Each computation: ~10ms (stochastic simulation with 1000 samples)
  CPU requirement: 500M × 10ms / 21,600s = 231 CPU-cores sustained

Total compute:
  Peak compute during batch window: ~450 CPU-cores
  Steady-state (sync, API serving): ~50 CPU-cores
  GPU for ML model training (weekly): 8 GPUs for 4 hours
```
