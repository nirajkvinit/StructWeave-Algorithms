# 14.5 AI-Native B2B Supplier Discovery & Procurement Marketplace — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **Semantic supplier search and discovery** — Enable buyers to search for suppliers and products using natural language queries, uploaded product images, specification PDFs, or engineering drawings; perform hybrid retrieval combining keyword matching with dense vector similarity search; return ranked results incorporating relevance, supplier trust score, price competitiveness, and delivery capability | Sub-500ms search latency at p95; support 50M+ product listings; handle multimodal query inputs (text, image, PDF); query understanding must resolve unit conversions, standard equivalences, and specification aliases |
| FR-02 | **AI-driven specification matching** — Parse buyer specifications (material, dimensions, tolerances, certifications, standards compliance) from natural language or structured input; match against supplier product attributes with tolerance-aware compatibility scoring; normalize units across imperial, metric, and nominal systems; map equivalences across standards frameworks (ASTM, DIN, JIS, IS) | Specification extraction accuracy >90% for structured PDFs; unit normalization covers 200+ unit types; standards equivalence knowledge graph covers 15,000+ cross-references |
| FR-03 | **Supplier onboarding and verification** — Onboard suppliers with business registration validation (GSTIN, PAN, business incorporation), catalog upload (bulk CSV/Excel, API, manual entry), certification document verification, and optional factory audit scheduling; assign verification tiers (unverified, basic, verified, premium) based on completed verification steps | Onboarding completion <48 hours for basic tier; document verification via OCR + cross-validation against government registries; support 10,000+ new supplier onboardings per month |
| FR-04 | **Catalog management and normalization** — Ingest supplier product catalogs in multiple formats (CSV, Excel, API feed, manual entry); normalize product listings using AI-driven attribute extraction, category classification, and entity resolution; detect and merge duplicate listings; enforce data quality standards (image resolution, description completeness, price currency) | Catalog ingestion supports 500,000 new SKU listings per day; entity resolution precision >95% (avoid merging distinct products); automated category classification accuracy >88% across 5,000+ leaf categories |
| FR-05 | **Supplier trust scoring** — Compute and maintain a real-time supplier trust index combining verification status, transaction performance metrics (order fulfillment rate, quality rejection rate, on-time delivery, response time), financial health indicators, buyer review sentiment, and behavioral signals; apply exponential decay weighting to prioritize recent performance; detect and penalize trust manipulation (fake reviews, inflated metrics) | Trust score updated within 5 minutes of new signal; decay half-life of 90 days for transaction metrics; manipulation detection precision >85% |
| FR-06 | **RFQ lifecycle management** — Enable buyers to create RFQs from natural language descriptions or structured specifications; automatically identify and rank qualified suppliers via capability matching; distribute RFQs to top-N suppliers; collect, normalize, and compare bids on total-cost-of-ownership basis; recommend award with justification; generate purchase orders on acceptance | RFQ-to-first-bid p50 <4 hours; bid normalization handles different currencies, units, MOQs, and incoterms; support 50,000+ active RFQs concurrently |
| FR-07 | **Price intelligence and benchmarking** — Maintain historical transaction price database indexed by product category, specification, quantity, and geography; provide real-time price benchmarking for buyer queries and RFQ bids; detect price anomalies (suspiciously low or high quotations); generate price trend reports and commodity price correlation analysis | Price benchmark available for 80%+ of product categories with sufficient transaction history; anomaly detection precision >80%; price index updated daily |
| FR-08 | **Order lifecycle management** — Orchestrate the complete order lifecycle from purchase order generation through production milestone tracking, quality inspection, shipment, delivery, and payment settlement; integrate with logistics providers for shipment tracking; manage partial deliveries, returns, and replacements; capture performance data for trust scoring | PO-to-acknowledgment p50 <2 hours; shipment tracking updates every 6 hours; support 200,000+ active orders concurrently |
| FR-09 | **Payment and escrow services** — Provide escrow-based payment protection for B2B transactions; hold buyer payment until delivery confirmation and quality acceptance; support multiple payment methods (bank transfer, trade credit, letter of credit for international); manage milestone-based payment release for large orders; handle refunds and dispute-driven payment adjustments | Escrow settlement within 24 hours of delivery confirmation; support payment hold periods up to 30 days for quality inspection; dispute-triggered hold extension up to 60 days |
| FR-10 | **Buyer procurement analytics** — Provide buyers with spend analytics (category-wise spending, supplier concentration, price trends), supplier performance dashboards (delivery scores, quality scores, response metrics), procurement efficiency metrics (time-to-procure, cost savings vs. benchmark), and AI-driven recommendations for supplier consolidation and alternative sourcing | Dashboard refresh <15 minutes; cost savings calculation based on price benchmark comparison; supplier consolidation recommendations when >3 suppliers serve overlapping categories |
| FR-11 | **Supplier storefront and catalog API** — Enable suppliers to maintain branded storefronts with product catalogs, company profiles, certifications, and factory virtual tours; provide catalog synchronization APIs for ERP/inventory system integration; support real-time inventory and pricing updates; enable supplier-side analytics (inquiry sources, conversion rates, competitor benchmarking) | Storefront load time <2 seconds; catalog API supports real-time inventory sync with <5 minute propagation delay; support 100,000+ concurrent supplier storefronts |
| FR-12 | **Cross-border trade support** — Handle international procurement workflows including multi-currency pricing with real-time exchange rates, HS code classification for customs, export control and sanctions screening, trade compliance document generation (commercial invoice, packing list, certificate of origin), customs duty estimation, and international logistics coordination | Sanctions screening against OFAC, EU, and UN lists with <500ms latency; HS code classification accuracy >85% for mapped categories; duty estimation accuracy within 5% of actual |
| FR-13 | **Conversational procurement assistant** — Provide an AI-powered conversational interface for buyers to describe procurement needs, get product recommendations, compare suppliers, track orders, and resolve issues through natural language interaction across web chat, WhatsApp, and mobile app; support multi-turn conversations with context retention | Response latency <3 seconds; intent classification accuracy >92%; support 10 languages including Hindi, Tamil, Bengali, and Gujarati |
| FR-14 | **Supplier recommendation engine** — Proactively recommend suppliers to buyers based on procurement history, industry patterns, seasonal demand forecasts, and similar-buyer purchase behavior; recommend alternative products when primary specifications are unavailable; suggest supplier diversification to reduce single-source risk | Recommendation click-through rate >15%; alternative product suggestions available for 70%+ of queries with zero results; diversification alerts when >60% of category spend is with a single supplier |

---

## Out of Scope

- **Manufacturing execution** — The platform facilitates procurement, not manufacturing; no shop floor management, production scheduling, or quality management systems
- **Logistics fleet management** — Integration with logistics providers for tracking, but no fleet management, route optimization, or warehouse management
- **Trade financing origination** — Integration with trade finance providers but no direct lending, letter of credit issuance, or credit risk underwriting
- **Commodity trading and futures** — Price benchmarking uses commodity indices but no futures trading, hedging, or derivative instruments
- **Retail/B2C transactions** — Exclusively B2B; no consumer-facing marketplace features, consumer payment methods, or consumer protection workflows

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Search query latency (p95) | ≤ 500 ms | Buyer search experience must feel instant; includes hybrid retrieval + re-ranking |
| Search query latency (p99) | ≤ 1.5 s | Complex multi-attribute queries with specification matching may take longer |
| Specification matching latency (p95) | ≤ 2 s | Deep specification parsing and compatibility scoring for uploaded documents |
| RFQ distribution latency (p95) | ≤ 30 s | Time from RFQ submission to delivery to qualified suppliers |
| Supplier trust score computation (p95) | ≤ 5 s | Real-time trust score update after new signal ingestion |
| Catalog ingestion throughput | ≥ 500,000 SKUs/day | Support large supplier catalog bulk uploads during onboarding |
| Price benchmark query (p95) | ≤ 1 s | Real-time price comparison during RFQ evaluation |
| Order status API (p99) | ≤ 200 ms | High-frequency polling from buyer and supplier dashboards |
| Conversational assistant response (p95) | ≤ 3 s | Natural language query processing including intent detection and response generation |
| Sanctions screening (p99) | ≤ 500 ms | Must complete before RFQ distribution or order placement for cross-border transactions |

### Reliability & Availability

| Metric | Target |
|---|---|
| Core marketplace platform availability | 99.95% (≤ 4.4 hours downtime/year) |
| Search and discovery service availability | 99.99% — primary buyer-facing service; downtime = lost buyer engagement |
| RFQ service availability | 99.95% — time-sensitive but not real-time critical |
| Payment and escrow service availability | 99.99% — financial transactions must not fail silently |
| Catalog ingestion service availability | 99.9% — batch-tolerant; suppliers can retry uploads |
| Order management service availability | 99.95% — operational continuity for active orders |
| Data durability for transaction records | 99.999999999% (11 nines) — financial and compliance records |
| Event ordering guarantee | Per-order causal ordering for all state transitions |

### Scalability

| Metric | Target |
|---|---|
| Total product listings indexed | 50M+ SKUs across all suppliers |
| Active suppliers on platform | 500,000+ with verified catalogs |
| Active buyers on platform | 2M+ registered procurement professionals |
| Search queries per day | 10M (peak: 25M during procurement cycles) |
| RFQs created per day | 100,000 (peak: 300,000 during quarter-end procurement) |
| Orders processed per day | 50,000 (peak: 150,000) |
| Catalog updates per day | 2M price/inventory updates + 500,000 new SKU listings |
| Concurrent active RFQs | 50,000+ with bid collection in progress |
| Payment transactions per day | 40,000 escrow operations (deposits + releases + refunds) |
| Trust score computations per day | 5M (triggered by transactions, reviews, verifications, behavioral signals) |

### Security & Compliance

| Requirement | Specification |
|---|---|
| Business data privacy | Supplier pricing, customer lists, and order volumes are competitively sensitive; strict access controls prevent cross-supplier data leakage |
| Payment security | PCI-DSS compliance for payment processing; escrow funds held in regulated trust accounts; segregation of marketplace and escrow funds |
| Trade compliance | Real-time sanctions screening against OFAC, EU, and UN consolidated lists; export control classification for dual-use goods; record retention for customs audit |
| Anti-fraud | Fake supplier detection, review manipulation identification, bid rigging detection, catalog spam prevention, and price manipulation flagging |
| Data retention | Transaction records: 8 years (tax compliance); communication records: 5 years; catalog snapshots: 3 years; audit trails: 10 years |
| GDPR/data protection | User consent management; right to erasure (with regulatory retention exceptions); data processing agreements with third-party verification providers |

---

## Capacity Estimations

### Search and Discovery Volume

**Assumptions:**
- 10M search queries/day baseline (quarter-end peak: 25M)
- Average query complexity: 3.2 terms + 1.5 filter attributes
- 15% of queries include specification documents (PDF/image upload)
- Search result set: top 50 candidates retrieved, top 20 re-ranked, top 10 displayed

```
Search throughput:
  Baseline: 10M / 86,400 sec = ~116 queries/sec
  Quarter-end peak: 25M / 86,400 sec = ~290 queries/sec
  Peak hour (10 AM - 4 PM workday): 3x concentration = ~870 queries/sec

  Per query processing:
    Keyword retrieval from inverted index: ~20 ms
    Dense vector similarity search (ANN): ~30 ms
    Hybrid score fusion + re-ranking: ~50 ms
    Specification matching (when applicable): ~500 ms
    Trust score enrichment + result assembly: ~20 ms
    Total (text query): ~120 ms
    Total (spec document query): ~620 ms

  Multimodal queries (15% of total):
    Image embedding generation: ~200 ms
    PDF specification extraction: ~1.5 s
    Processed async; results cached for subsequent refinement queries
```

### Catalog and Index Size

```
Product catalog:
  50M active SKU listings
  Per listing: structured attributes (500 bytes) + description (2 KB) +
    specification vector (1.5 KB for 384-dim float32) + metadata (500 bytes)
  Total per listing: ~4.5 KB
  Total catalog: 50M × 4.5 KB = ~225 GB (structured data)

  Product images: 50M × 3 images × 500 KB avg = ~75 TB (object storage)
  Specification PDFs: 10M listings with PDFs × 2 MB avg = ~20 TB
  Total catalog storage: ~95 TB

Search index:
  Inverted index (keyword search): ~50 GB (compressed)
  Vector index (dense embeddings): 50M × 384 dims × 4 bytes = ~76.8 GB
    With HNSW graph overhead (~1.5x): ~115 GB
  Attribute filter index: ~20 GB
  Total search index: ~185 GB (fits in memory across 8 nodes with 32 GB each)

Catalog updates:
  2M price/inventory updates per day:
    2M / 86,400 = ~23 updates/sec
  500,000 new listings per day:
    500K / 86,400 = ~6 new listings/sec
  Index refresh latency: ≤ 5 minutes for price updates; ≤ 30 minutes for new listings
```

### Supplier Trust Scoring

```
Trust score computation:
  5M trust signal events per day (transactions + reviews + verifications + behavioral)
  5M / 86,400 = ~58 events/sec

  Per trust score update:
    Retrieve current score and component weights: ~5 ms
    Apply exponential decay to historical signals: ~2 ms
    Incorporate new signal with category-specific weight: ~3 ms
    Manipulation detection check: ~20 ms
    Persist updated score + audit trail: ~10 ms
    Total: ~40 ms per update

  Trust score storage:
    500K suppliers × trust profile (2 KB score + 10 KB signal history) = ~6 GB
    Fits in a single in-memory store with replication

  Batch recalculation (daily):
    Full trust score recalculation for all 500K suppliers
    Including cross-supplier comparative ranking within categories
    Duration: ~2 hours on 20-worker cluster
```

### RFQ Processing Volume

```
RFQ lifecycle:
  100,000 RFQs/day baseline (quarter-end: 300,000)
  100K / 86,400 = ~1.2 RFQs/sec (peak: ~3.5 RFQs/sec)
  Peak hour concentration (3x): ~10.5 RFQs/sec

  Per RFQ processing:
    Specification parsing: ~2 s
    Supplier capability matching (search top-100 suppliers): ~500 ms
    Supplier qualification filtering (capacity, certifications, geography): ~100 ms
    Engagement probability scoring (will this supplier respond?): ~50 ms
    RFQ distribution to 5-15 selected suppliers: ~200 ms
    Total RFQ creation-to-distribution: ~3 s

  Bid collection:
    Average bids per RFQ: 4.2
    Bid normalization (currency, units, MOQ, shipping): ~100 ms per bid
    Total-cost-of-ownership comparison: ~200 ms
    Award recommendation generation: ~500 ms

  Active RFQ state:
    50,000 concurrent active RFQs × 3 KB state = ~150 MB
    Bid data: 50K × 4.2 bids × 5 KB = ~1 GB
```

### Order and Payment Volume

```
Order processing:
  50,000 orders/day baseline (peak: 150,000)
  50K / 86,400 = ~0.6 orders/sec

  Per order lifecycle:
    PO generation and validation: ~500 ms
    Payment escrow creation: ~2 s
    Average order lifecycle: 15 days (from PO to delivery confirmation)
    Average milestones per order: 6 (PO → acknowledgment → production →
      dispatch → in-transit → delivered)

  Active orders:
    50K/day × 15 days avg lifecycle = 750,000 concurrent active orders
    Order state: ~10 KB per order (including milestone history)
    Total: 750K × 10 KB = ~7.5 GB

Payment escrow:
  40,000 escrow operations/day
  Average escrow amount: ₹5,00,000 (~$6,000)
  Daily escrow volume: ₹2,000 crore (~$240M)
  Escrow hold period: 7-30 days
  Active escrow pool: ~₹30,000 crore (~$3.6B)
```

### Storage Summary

```
Product catalog (structured + text):          ~225 GB
Product images and media:                     ~75 TB (object storage)
Specification documents:                      ~20 TB (object storage)
Search indices (keyword + vector + filter):   ~185 GB (in-memory)
Supplier trust profiles (active):             ~6 GB (in-memory)
Transaction history (3-year):                 ~5 TB
RFQ archive (3-year):                         ~2 TB
Order lifecycle records (5-year):             ~8 TB
Payment and escrow audit trail (8-year):      ~3 TB
Communication logs (5-year):                  ~10 TB
Buyer analytics materialized views:           ~500 GB
Price benchmark database (5-year):            ~2 TB
Fraud detection signals and audit:            ~1 TB
```

---

## SLO Summary

| SLO | Target | Measurement Window |
|---|---|---|
| Search query latency (text) p95 | ≤ 500 ms | Rolling 1-hour |
| Search query latency (spec document) p95 | ≤ 2 s | Rolling 1-hour |
| RFQ distribution latency p95 | ≤ 30 s | Rolling 1-hour |
| RFQ-to-first-bid p50 | ≤ 4 hours | Rolling 24-hour |
| Trust score update latency p95 | ≤ 5 s | Rolling 1-hour |
| Catalog update propagation p95 | ≤ 5 min (price); ≤ 30 min (new listings) | Rolling 1-hour |
| Order status API p99 | ≤ 200 ms | Rolling 1-hour |
| Payment escrow settlement | ≤ 24 hours post-confirmation | Per transaction |
| Search service availability | 99.99% | Monthly |
| Payment service availability | 99.99% | Monthly |
| Core platform availability | 99.95% | Monthly |
| Transaction record durability | 99.999999999% | Annual |
| Specification matching accuracy | ≥ 90% | Weekly sample audit |
| Trust score manipulation detection precision | ≥ 85% | Monthly |
