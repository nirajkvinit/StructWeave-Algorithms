# 14.5 AI-Native B2B Supplier Discovery & Procurement Marketplace — Observability

## Key Metrics

### Search and Discovery Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **Search query latency p95** | Time from query receipt to result delivery | ≤ 500 ms | > 750 ms for 5 minutes |
| **Search query latency p99** | Worst-case query performance | ≤ 1.5 s | > 2.5 s for 5 minutes |
| **Search result click-through rate** | % of search result pages where buyer clicks at least one result | > 35% | < 25% for 1 hour |
| **Zero-result query rate** | % of queries returning no results | < 5% | > 10% for 1 hour |
| **Search-to-inquiry conversion** | % of search sessions that generate a supplier inquiry or RFQ | > 8% | < 5% for 24 hours |
| **Specification match accuracy** | % of specification-based matches rated as relevant by buyer feedback | > 90% | < 80% for 1 week |
| **Vector index recall@100** | Recall of ground-truth relevant items in top-100 ANN results | > 95% | < 90% (measured weekly) |
| **Query understanding accuracy** | % of extracted entities (material, dimension, standard) correct per audit | > 92% | < 85% (measured weekly) |

### RFQ Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **RFQ distribution latency p95** | Time from RFQ creation to delivery to suppliers | ≤ 30 s | > 60 s for 5 minutes |
| **RFQ-to-first-bid p50** | Median time from RFQ distribution to first bid received | ≤ 4 hours | > 8 hours for 24 hours |
| **Average bids per RFQ** | Mean number of bids received per distributed RFQ | ≥ 3.0 | < 2.0 for 24 hours |
| **Supplier response rate** | % of distributed RFQs that receive at least one bid | > 60% | < 45% for 24 hours |
| **RFQ conversion rate** | % of RFQs that result in an awarded purchase order | > 25% | < 15% for 7 days |
| **Award-to-PO time** | Time from bid award to purchase order generation | ≤ 2 hours | > 24 hours (stuck orders) |
| **Supplier fatigue index** | Average daily RFQ load per active supplier / response rate trend | Stable | Response rate declining >5%/week |

### Supplier Trust and Quality Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **Trust score update latency p95** | Time from new signal to trust score update | ≤ 5 s | > 30 s for 5 minutes |
| **Supplier verification backlog** | New suppliers awaiting verification completion | < 500 | > 2,000 |
| **Average verification completion time** | Days from registration to basic verification tier | ≤ 2 days | > 5 days for new cohort |
| **Manipulation detection precision** | % of flagged manipulation cases confirmed as true positive | > 85% | < 70% for monthly review |
| **Fake supplier detection rate** | % of fraudulent accounts caught before first transaction | > 90% | < 80% for monthly review |
| **Trust-performance correlation** | Spearman correlation between trust score and actual fulfillment rate | > 0.7 | < 0.5 (trust model losing predictive power) |

### Order and GMV Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **Daily GMV** | Gross merchandise value of orders placed per day | Trending upward | > 20% day-over-day decline |
| **Order completion rate** | % of placed orders reaching COMPLETED status | > 92% | < 85% for 7 days |
| **On-time delivery rate** | % of orders delivered by promised date | > 85% | < 75% for 7 days |
| **Quality acceptance rate** | % of deliveries accepted without quality disputes | > 90% | < 80% for 7 days |
| **Escrow settlement time** | Time from buyer acceptance to supplier payment release | ≤ 24 hours | > 48 hours for any transaction |
| **Dispute rate** | % of orders resulting in buyer dispute | < 5% | > 8% for 7 days |
| **Dispute resolution time p50** | Median time from dispute filing to resolution | ≤ 7 days | > 14 days |
| **Buyer repeat purchase rate** | % of buyers placing >1 order in 90 days | > 40% | < 30% for monthly cohort |

### Catalog Quality Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **Catalog ingestion throughput** | SKUs processed per day through normalization pipeline | ≥ 500K/day capacity | Pipeline backlog > 1M SKUs |
| **Attribute extraction accuracy** | % of auto-extracted attributes correct per audit sample | > 88% | < 80% for weekly audit |
| **Category classification accuracy** | % of auto-classified categories correct per audit | > 88% | < 80% for weekly audit |
| **Entity resolution precision** | % of merged duplicates that are true duplicates | > 95% | < 90% (false merges = critical) |
| **Listing quality score distribution** | Median listing quality score across active catalog | > 0.7 | < 0.6 (catalog quality degrading) |
| **Price staleness rate** | % of active listings with prices older than 30 days | < 15% | > 25% |
| **Stale embedding rate** | % of listings where embedding is older than content | < 5% | > 10% |

### Price Intelligence Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **Benchmark coverage** | % of product categories with sufficient data for benchmarking | > 80% | < 70% |
| **Benchmark confidence** | Average confidence score across published benchmarks | > 0.7 | < 0.5 |
| **Price anomaly detection precision** | % of flagged price anomalies confirmed as genuine anomalies | > 80% | < 65% for monthly review |
| **Commodity correlation freshness** | Lag between commodity price update and benchmark adjustment | ≤ 24 hours | > 72 hours |

---

## Logging Strategy

### Structured Log Categories

```
Log categories and retention:

  Search logs (search_query.*):
    Fields: query_id, buyer_id, raw_query, parsed_query, extracted_entities,
            result_count, top_10_listing_ids, latency_ms, retrieval_method,
            filters_applied, sort_order
    Volume: ~10M entries/day
    Retention: 90 days (hot), 1 year (cold archive)
    Purpose: search quality analysis, query understanding improvement, A/B testing

  RFQ lifecycle logs (rfq.*):
    Fields: rfq_id, buyer_id, event_type (created, distributed, bid_received,
            awarded, cancelled), supplier_ids, specifications, bid_details,
            routing_decision, match_scores
    Volume: ~500K entries/day
    Retention: 3 years (compliance and analytics)
    Purpose: RFQ funnel analysis, supplier matching quality, conversion optimization

  Trust signal logs (trust.*):
    Fields: supplier_id, signal_category, signal_type, signal_value,
            trust_score_before, trust_score_after, decay_applied,
            manipulation_check_result
    Volume: ~5M entries/day
    Retention: 3 years (trust model training and audit)
    Purpose: trust score debugging, manipulation investigation, model training

  Order lifecycle logs (order.*):
    Fields: order_id, buyer_id, supplier_id, event_type (created, acknowledged,
            shipped, delivered, accepted, disputed), milestone_details,
            escrow_state, quality_inspection_result
    Volume: ~500K entries/day
    Retention: 8 years (financial compliance)
    Purpose: order tracking, dispute evidence, performance analysis

  Catalog ingestion logs (catalog.*):
    Fields: supplier_id, batch_id, listings_count, stage (validation, extraction,
            classification, entity_resolution, embedding), errors,
            processing_time_ms, quality_scores
    Volume: ~2M entries/day
    Retention: 1 year
    Purpose: ingestion pipeline monitoring, quality tracking, error diagnosis

  Fraud detection logs (fraud.*):
    Fields: entity_id, entity_type (supplier, buyer, listing, review),
            fraud_type, detection_method, confidence_score, disposition,
            evidence_summary
    Volume: ~100K entries/day
    Retention: 7 years (legal compliance)
    Purpose: fraud investigation, pattern analysis, model improvement

  Compliance logs (compliance.*):
    Fields: transaction_id, screening_type (sanctions, export_control, hs_code),
            entities_screened, lists_checked, list_versions, match_results,
            disposition, reviewer_id
    Volume: ~50K entries/day
    Retention: 7 years (regulatory requirement)
    Purpose: regulatory audit, compliance reporting

  Payment and escrow logs (payment.*):
    Fields: escrow_id, order_id, operation_type (deposit, hold, release, refund),
            amount, currency, bank_reference, status, reconciliation_status
    Volume: ~80K entries/day
    Retention: 10 years (financial audit)
    Purpose: financial reconciliation, audit trail, dispute evidence
```

### Log Sanitization

```
PII and sensitive data handling in logs:
  Buyer personal information: email → hashed, phone → masked (last 4 digits),
    name → present (needed for dispute resolution)
  Supplier business information: GSTIN → present (business identifier, not personal),
    bank account → masked (last 4 digits), PAN → masked
  Pricing data: individual prices → present in order logs (needed for audit),
    anonymized in analytics logs (no supplier-price linkage)
  Payment data: bank account numbers → masked, UPI VPAs → masked,
    transaction amounts → present (financial audit)
  Search queries: retained as-is (not PII; needed for search quality analysis)
  Communication content: retained but encrypted at rest; access requires
    justification and audit logging
```

---

## Distributed Tracing

### Trace Architecture

```
Trace propagation across key workflows:

  Search query trace:
    Span 1: API Gateway (auth, rate limiting)                     ~5 ms
    Span 2: Query Understanding (NER, unit normalization)         ~30 ms
    Span 3: Keyword Retrieval (inverted index query)              ~20 ms
    Span 4: Vector Retrieval (4 parallel ANN queries)             ~30 ms
      Span 4a: Material ANN search                                ~25 ms
      Span 4b: Dimension ANN search                               ~25 ms
      Span 4c: Certification ANN search                           ~20 ms
      Span 4d: General ANN search                                 ~28 ms
    Span 5: Score Fusion (reciprocal rank fusion)                 ~10 ms
    Span 6: Trust Score Enrichment (cache lookup)                 ~5 ms
    Span 7: Re-ranking Model Inference                            ~40 ms
    Span 8: Result Assembly + Price Benchmark                     ~20 ms
    Total: ~160 ms (text query, no specification document)

  RFQ lifecycle trace:
    Span 1: RFQ Creation + Specification Parsing                  ~2 s
    Span 2: Supplier Capability Matching                          ~500 ms
    Span 3: Engagement Prediction (per supplier)                  ~100 ms
    Span 4: Routing Optimization                                  ~200 ms
    Span 5: RFQ Distribution (to N suppliers)                     ~500 ms
    Span 6: [Async] Bid Collection Period                         hours-days
    Span 7: Bid Normalization (per bid)                           ~100 ms
    Span 8: Total Cost Comparison                                 ~200 ms
    Span 9: Award Recommendation                                  ~500 ms
    Total sync path: ~3.5 s (creation to distribution)

  Order with escrow trace:
    Span 1: PO Generation                                         ~500 ms
    Span 2: Sanctions Screening (cross-border)                    ~300 ms
    Span 3: Escrow Deposit Instruction                            ~200 ms
    Span 4: [Async] Payment Receipt Confirmation                  hours
    Span 5: Supplier Notification                                 ~100 ms
    Span 6: [Async] Order Lifecycle (production → delivery)       days-weeks
    Span 7: Delivery Confirmation                                 ~100 ms
    Span 8: Escrow Release                                        ~500 ms
    Span 9: Trust Signal Emission                                 ~50 ms
```

### Critical Path Identification

```
Search critical path:
  Bottleneck: Vector retrieval (Span 4) — 4 parallel ANN queries, latency = max(4 queries)
  Optimization: pre-computed common query results cache (cache hit → skip vector search)
  Cache hit rate: ~15% (B2B queries are more unique than B2C)

RFQ critical path:
  Bottleneck: Specification parsing (Span 1) — NLP extraction from uploaded documents
  Optimization: async spec parsing with progressive results (route to obvious
  category matches immediately, refine routing after full parsing completes)

Order critical path:
  Bottleneck: Sanctions screening (Span 2) — cannot proceed without clearance
  Optimization: pre-screen suppliers at onboarding; order-time screening is
  incremental (check if anything changed since last screen)
```

---

## Alerting Rules

### Severity Levels

```
P0 (Critical — immediate response):
  - Search service down (0 queries served for 2+ minutes)
  - Payment/escrow service unreachable for 1+ minute
  - Sanctions screening service down (cross-border orders blocked)
  - Data breach detected (unauthorized access to business data)
  - Escrow balance reconciliation mismatch > ₹1
  Response: page on-call engineer + engineering manager; 15-minute response SLA

P1 (High — response within 1 hour):
  - Search latency p95 > 1 second for 10+ minutes
  - RFQ distribution failing (error rate > 5%) for 5+ minutes
  - Trust score update pipeline backed up > 1 hour
  - Catalog ingestion pipeline stopped for 30+ minutes
  - Fraud detection service degraded (response time > 2 seconds)
  Response: page on-call engineer; 1-hour resolution SLA

P2 (Medium — response within 4 hours):
  - Search click-through rate drops below 25% for 2+ hours
  - RFQ response rate drops below 45% for 24 hours
  - Supplier verification backlog exceeds 2,000
  - Price benchmark staleness > 72 hours for major categories
  - Order dispute rate exceeds 8% for 7 days
  Response: notify team channel; next-business-day resolution

P3 (Low — response within 24 hours):
  - Catalog quality score trending downward for 7 days
  - Entity resolution precision below 90% in weekly audit
  - Recommendation engine CTR below target for 7 days
  - Stale embedding rate exceeds 10%
  Response: ticket creation; addressed in next sprint
```

### Business-Specific Alerts

```
Marketplace health alerts:
  - GMV: daily GMV drops >20% vs. 7-day moving average → P2 alert
  - Liquidity: any leaf category with <5 active suppliers and >10 buyer queries/day
    → P3 alert (category liquidity risk)
  - Supplier churn: >100 verified suppliers deactivating in a week → P2 alert
  - Buyer acquisition: new buyer signups drop >30% week-over-week → P3 alert

Trust and safety alerts:
  - Fraud burst: >10 fake supplier detections in 24 hours → P1 alert
    (possible organized fraud campaign)
  - Review manipulation: >50 suspicious reviews in 24 hours → P2 alert
  - Bid rigging: collusion pattern detected in >5 RFQs → P2 alert
  - Sanctions match: any confirmed sanctions match → P0 alert

Financial alerts:
  - Escrow: any deposit without matching order → P0 alert
  - Escrow: release without buyer acceptance → P0 alert
  - Refund: refund amount > deposit amount → P0 alert
  - Settlement: supplier payment delayed >48 hours post-acceptance → P1 alert
```

---

## Dashboard Design

### Executive Dashboard

```
Top-level marketplace health (real-time refresh every 5 minutes):
  Row 1: Key business metrics
    - Daily GMV (vs. target, vs. last week, vs. last quarter)
    - Active buyers (DAU, MAU, growth rate)
    - Active suppliers (verified, total, churn rate)
    - RFQs created today (vs. target, conversion funnel)

  Row 2: Marketplace quality
    - Average supplier trust score (distribution histogram)
    - Order completion rate (30-day rolling)
    - On-time delivery rate (30-day rolling)
    - Buyer satisfaction score (NPS proxy from reviews)

  Row 3: Platform performance
    - Search latency p95 (real-time)
    - RFQ distribution latency (real-time)
    - Payment settlement time (rolling average)
    - Platform availability (uptime % this month)
```

### Search Quality Dashboard

```
Search performance monitoring (hourly refresh):
  Panel 1: Latency distribution
    - p50, p95, p99 latency over time (24-hour view)
    - Breakdown by query type (text, spec document, image)
    - Latency by shard (identify slow shards)

  Panel 2: Search quality
    - Click-through rate over time
    - Zero-result rate by category
    - Search-to-inquiry conversion by category
    - Query understanding accuracy (sampled)

  Panel 3: Index health
    - Index size per shard (listing count, memory usage)
    - Replication lag per shard
    - Stale embedding count and rate
    - Price staleness distribution

  Panel 4: Top queries
    - Most popular search queries (last 24 hours)
    - Highest zero-result queries (opportunity identification)
    - Longest latency queries (performance debugging)
    - Most converted queries (success patterns)
```

### Trust and Safety Dashboard

```
Trust monitoring (15-minute refresh):
  Panel 1: Fraud detection pipeline
    - Fraud alerts by type (fake supplier, review manipulation, bid rigging, catalog spam)
    - Detection volume trend (7-day view)
    - False positive rate (from manual review outcomes)
    - Average time-to-detection by fraud type

  Panel 2: Supplier trust distribution
    - Trust score histogram (all active suppliers)
    - Trust score trend (average, p25, p75 over 90 days)
    - Newly verified suppliers (weekly cohort)
    - Suppliers with declining trust scores (watch list)

  Panel 3: Review quality
    - Review volume by verification status (verified purchase vs. unverified)
    - Manipulation flags per day
    - Average review sentiment by category
    - Reviewer credibility distribution

  Panel 4: Compliance
    - Sanctions screening volume and match rate
    - HS code classification confidence distribution
    - Compliance manual review backlog
    - Export control flags by product category
```

### RFQ Operations Dashboard

```
RFQ funnel monitoring (real-time refresh):
  Panel 1: RFQ volume and conversion
    - RFQs created per hour (vs. capacity)
    - RFQ funnel: created → distributed → bids received → awarded → PO generated
    - Conversion rate at each stage
    - Average bids per RFQ by category

  Panel 2: Supplier engagement
    - Supplier response rate by category
    - Average response time by category
    - Supplier fatigue indicators (response rate vs. RFQ load)
    - Top-performing suppliers by response quality

  Panel 3: Pricing intelligence
    - Price benchmark confidence by category
    - Bid price vs. benchmark distribution
    - Price anomalies detected (count, type, disposition)
    - Commodity price movements and impact on categories

  Panel 4: RFQ routing quality
    - Routing optimization score distribution
    - Supplier selection diversity (geographic, size tier)
    - New supplier inclusion rate in RFQ distribution
    - Predicted vs. actual bid counts (routing model accuracy)
```

### Order and Payment Dashboard

```
Order lifecycle monitoring (hourly refresh):
  Panel 1: Order pipeline
    - Orders by status (PO created, in production, dispatched, delivered, completed)
    - Order volume trend (7-day, 30-day)
    - Average order lifecycle duration by category
    - Stuck orders (no status update for >5 days)

  Panel 2: Delivery performance
    - On-time delivery rate by supplier tier
    - Late delivery distribution (1-3 days, 3-7 days, >7 days)
    - Quality acceptance rate
    - Dispute rate and resolution time

  Panel 3: Payment and escrow
    - Active escrow balance (total, by currency)
    - Escrow deposit-to-release time distribution
    - Failed payment attempts and retry success rate
    - Refund volume and reasons

  Panel 4: Financial reconciliation
    - Daily escrow balance vs. banking partner statement
    - Unmatched transactions (deposits without orders, releases without acceptance)
    - Revenue: marketplace fees collected vs. projected
    - Payment method distribution (escrow, bank transfer, trade credit)
```
