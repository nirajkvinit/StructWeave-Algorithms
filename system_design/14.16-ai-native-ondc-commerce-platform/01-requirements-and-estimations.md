# 14.16 AI-Native ONDC Commerce Platform — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **Beckn protocol compliance** — Implement the full Beckn transaction lifecycle (search, select, init, confirm, status, track, cancel, update, rating, support) with asynchronous request-callback communication, digital signature on every message, and schema validation against ONDC protocol specification v1.2.5+ | Support both buyer-side and seller-side protocol flows; handle protocol version negotiation between NPs running different versions; maintain backward compatibility with at least 2 prior major versions |
| FR-02 | **AI-powered seller onboarding** — Accept seller registration with Aadhaar e-KYC, GST verification via DigiLocker pull, FSSAI/drug license validation for applicable categories, and product catalog creation from photos and minimal metadata; AI auto-generates catalog entries, maps categories, validates HSN codes, and checks schema compliance | Target onboarding completion in ≤ 48 hours for standard sellers (vs. industry 3-4 weeks); support 50+ product categories with domain-specific schema validation; auto-correct 80%+ of common catalog errors without seller intervention |
| FR-03 | **Intelligent catalog management** — Maintain seller catalogs with AI-assisted product listing: auto-generate titles, descriptions, and tags from product images; map to ONDC taxonomy (5,000+ category nodes); validate completeness against domain-specific schemas; support bulk catalog operations and real-time inventory sync | Description generation in 10+ Indian languages; category mapping accuracy ≥ 92%; schema compliance validation with actionable error messages; support incremental catalog updates without full re-upload |
| FR-04 | **Cross-network federated search** — Broadcast buyer search intent via ONDC gateway to qualifying seller NPs; aggregate and rank heterogeneous on_search responses by composite relevance score (price, trust, delivery speed, catalog quality); support semantic search, category browsing, and filter/sort operations across the merged result set | Search response time ≤ 2 seconds (p95) including network fan-out and aggregation; handle 50+ concurrent on_search responses per query; cross-lingual search (query in Hindi matches catalog in English and vice versa); personalized ranking from buyer interaction history |
| FR-05 | **Order lifecycle management** — Manage the complete Beckn order lifecycle: cart construction (select/on_select), order initialization (init/on_init), confirmation (confirm/on_confirm), status tracking (status/on_status), updates (update/on_update), and cancellation (cancel/on_cancel); maintain order state machine with valid state transitions and timeout handling | Support concurrent orders across multiple seller NPs in a single buyer session; handle partial fulfillment (some items shipped, others cancelled); order state persistence with at-least-once delivery guarantees for protocol messages; automated timeout and retry for unresponsive NPs |
| FR-06 | **Multi-modal payment settlement** — Support UPI (collect and intent flows), net banking, wallets, cards, and COD via ONDC payment protocol; compute and execute multi-party settlement (buyer → buyer NP commission → ONDC fees → seller NP commission → seller payout) with automated TDS/TCS deduction and GST invoice reconciliation | Settlement accuracy 100%; reconciliation within T+1 for digital payments and T+3 for COD; support refund flows for returns and cancellations; escrow management for COD with release on delivery confirmation; withholding for dispute resolution |
| FR-07 | **Multi-LSP logistics integration** — Broadcast logistics search to ONDC logistics network (25+ LSPs); rank responses by serviceability, cost, speed, and reliability; support hyperlocal (< 3 km, immediate), slotted (same-day/next-day), and intercity delivery; real-time tracking via on_status and on_track callbacks; automatic LSP failover on SLA breach prediction | Logistics search response ≤ 3 seconds; delivery SLA adherence tracking per LSP; support weight-based, distance-based, and flat-rate shipping models; automatic LSP reassignment if pickup not completed within SLA window |
| FR-08 | **Grievance redressal and dispute resolution** — Implement ONDC's Issue and Grievance Management (IGM) framework: buyer raises issue via buyer NP → seller NP responds within SLA → escalation to ONDC if unresolved; AI-assisted issue categorization, automated resolution for common issues (refund for non-delivery, replacement for damaged item), and evidence chain construction from signed protocol messages | Issue resolution SLA: L1 (seller NP) within 24 hours, L2 (ONDC) within 48 hours; auto-resolution rate ≥ 40% for standard categories (non-delivery, damaged item, wrong item); audit trail from digital signatures for dispute evidence |
| FR-09 | **Network analytics and seller intelligence** — Provide sellers with AI-generated business insights: demand heatmaps by geography and category, pricing recommendations based on network-wide competitive analysis, catalog quality scores with improvement suggestions, channel performance (which buyer apps drive the most orders), and fulfillment cost optimization recommendations | Daily analytics refresh; demand forecasting with 7-day and 30-day horizons; pricing recommendations with margin impact simulation; catalog quality score benchmarked against category average |
| FR-10 | **India Stack integration** — Deep integration with Digital Public Infrastructure: Aadhaar e-KYC for seller identity verification (< 2 minutes), UPI Autopay for subscription billing and recurring payments, DigiLocker for document pull (GST, FSSAI, shop license), Account Aggregator for seller financial data (consent-based), and GSTN for real-time GST return validation | e-KYC success rate ≥ 95%; DigiLocker document pull ≤ 30 seconds; AA data fetch with explicit seller consent and purpose limitation; GSTN validation for active GST status |
| FR-11 | **WhatsApp conversational commerce** — Enable end-to-end commerce via WhatsApp: natural language product discovery (buyer describes need, AI maps to ONDC search), interactive catalog browsing with media cards, in-chat order placement flowing through Beckn protocol, UPI payment links, order tracking updates, and post-purchase support—all operating as a Beckn-compliant buyer app behind the WhatsApp interface | Support 22 Indian languages in conversational interface; product discovery accuracy ≥ 80% (buyer's natural language intent maps to correct category/product); order completion rate ≥ 60% for initiated conversations; seamless handoff to human support when AI confidence is low |
| FR-12 | **Network trust scoring** — Compute and maintain composite trust scores for all network participants based on: order fulfillment rate, delivery SLA adherence, return/refund rate, grievance resolution speed, protocol compliance score (schema adherence, response latency), catalog accuracy (gap between listing and actual product), and payment settlement reliability; expose trust scores to other NPs via standardized API for informed transaction decisions | Trust score update frequency: daily batch + real-time adjustment for critical events (order cancellation spike, payment failure surge); trust score decay for inactive NPs; separate dimension scores (fulfillment, quality, responsiveness) and composite score; anti-gaming measures (detect fake order inflation, review manipulation) |

---

## Out of Scope

- **Building the ONDC gateway itself** — The platform operates as a network participant (buyer NP, seller NP, or both), not as the ONDC registry or routing gateway
- **Proprietary payment processing** — No in-house payment gateway; integration with existing ONDC-compliant payment NPs
- **Fleet management for logistics** — No vehicle routing, driver management, or warehouse operations; integration with ONDC logistics NPs via protocol
- **Government policy engine** — No regulatory rule authoring or policy management; compliance with existing ONDC policies and government regulations
- **Cross-border commerce** — Focus on domestic Indian commerce; no customs, international shipping, or foreign exchange handling
- **Financial lending products** — No working capital loans, BNPL, or credit products; integration with Account Aggregator for creditworthiness signals only

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Federated search response (p95) | ≤ 2 s | Must match centralized marketplace UX despite network fan-out and aggregation across 50+ NPs |
| Protocol message processing (p95) | ≤ 200 ms | Beckn protocol callback latency directly impacts transaction flow; slow callbacks cause buyer drop-off |
| Catalog AI enrichment (p95) | ≤ 5 s per product | Seller onboarding flow must feel responsive; bulk operations run async |
| Order confirmation end-to-end (p95) | ≤ 4 s | Includes select → on_select → init → on_init → confirm → on_confirm round trips |
| Payment processing (p95) | ≤ 3 s to UPI intent generation | Payment friction is the primary cart abandonment driver |
| WhatsApp response latency (p95) | ≤ 3 s | Conversational UX breaks above 5 seconds; users expect chat-speed responses |
| Logistics search and selection (p95) | ≤ 3 s | Post-order logistics must not add perceived delay to order confirmation |
| Trust score computation (batch) | ≤ 30 min for full network | Daily batch processing for 600K+ sellers; real-time adjustments for critical events within 60 seconds |
| Seller onboarding — e-KYC (p95) | ≤ 2 min | Aadhaar-based verification should feel near-instant compared to manual document review |

### Reliability & Availability

| Metric | Target |
|---|---|
| Buyer app availability | 99.95% (≤ 4.4 hours downtime/year) — buyer-facing commerce must match platform marketplace reliability |
| Seller app availability | 99.9% — seller operations (catalog, orders) tolerate brief outages with retry |
| Protocol message delivery | 99.99% — lost protocol messages cause order failures and settlement discrepancies |
| Payment processing availability | 99.99% — payment failures directly cost GMV and merchant trust |
| Logistics integration availability | 99.9% — logistics selection can retry; delayed logistics doesn't block order confirmation |
| WhatsApp bot availability | 99.9% — WhatsApp is a convenience channel; brief outages redirect to app |
| AI pipeline availability | 99.5% — catalog enrichment and search ranking are async; degraded AI falls back to rule-based |
| Data durability (orders, settlements) | 99.999999999% (11 nines) — financial transaction records must never be lost |

---

## Capacity Estimations

### Baseline Assumptions (2026 Projections)

| Parameter | Value | Source/Rationale |
|---|---|---|
| Monthly orders | 50 M | ONDC at 16M in March 2025, growing 15% MoM; 50M projected by mid-2026 |
| Daily orders | ~1.7 M | 50M / 30 days |
| Peak daily orders | ~5 M | 3× average for festival/sale events (Diwali, Republic Day sale) |
| Active sellers | 1 M | ONDC target of 1M sellers by 2025; extending to active base by 2026 |
| Active buyer app users | 30 M monthly | Based on transaction-to-user ratio of ~1.7 orders/user/month |
| Average catalog size | 150 products/seller | SME-heavy network; ranges from 10 (kirana) to 5,000 (large retailer) |
| Total catalog items | 150 M | 1M sellers × 150 avg products |
| Buyer NPs (buyer apps) | 50 | Major buyer apps (Paytm, Magicpin, Mystore, etc.) + WhatsApp commerce |
| Seller NPs | 100 | Seller-side network participants aggregating seller catalogs |
| Logistics NPs | 25+ | LSPs connected to ONDC logistics network |
| Cities covered | 1,000+ | Expanding from 600 cities in 2025 |

### Throughput Calculations

| Component | Calculation | Result |
|---|---|---|
| **Search queries/sec (peak)** | 5M daily orders × 5 searches/order × 3× peak factor / 86,400 | ~870 QPS peak |
| **Beckn protocol messages/sec** | Each order generates ~20 protocol messages (search through fulfillment) × 5M peak daily / 86,400 | ~1,160 msg/sec peak |
| **Catalog update events/day** | 1M sellers × 5% daily update rate × 10 products/update | 500K events/day |
| **Payment transactions/sec (peak)** | 5M daily orders × 1.3 payment attempts/order / 86,400 × 3× peak | ~225 TPS peak |
| **WhatsApp messages/sec (peak)** | 30M users × 2% daily active on WhatsApp × 5 messages/session / 86,400 | ~35 msg/sec |
| **Logistics search/sec (peak)** | 5M daily orders × 0.8 requiring logistics / 86,400 × 3× peak | ~140 searches/sec |

### Storage Estimates

| Data Type | Calculation | Annual Volume |
|---|---|---|
| **Order records** | 50M orders/month × 12 × 5 KB/order | ~3.6 TB/year |
| **Protocol message logs** | 50M orders × 20 messages × 12 × 2 KB/message | ~24 TB/year |
| **Catalog data** | 150M products × 3 KB/product + images (150M × 500 KB avg) | ~450 GB structured + 75 TB images |
| **Trust score history** | 1M sellers × 365 days × 1 KB/day | ~365 GB/year |
| **Analytics/metrics** | Aggregated: ~10 TB/year | 10 TB/year |
| **Settlement records** | 50M orders/month × 12 × 2 KB/order | ~1.4 TB/year |

### Infrastructure Sizing

| Component | Sizing |
|---|---|
| **Protocol gateway (message routing)** | 20 nodes, 8 vCPU, 16 GB RAM each; horizontal auto-scaling for peak |
| **Search aggregation cluster** | 12 nodes, 16 vCPU, 64 GB RAM; holds catalog snapshots for approximate matching |
| **AI inference (catalog + search)** | 8 GPU nodes for catalog enrichment; 6 CPU nodes for search ranking |
| **Order state management** | 6-node distributed database cluster with cross-region replication |
| **Message queue (protocol messages)** | 10-node event streaming cluster; 3-day retention for replay |
| **Settlement engine** | 4 nodes with dedicated database; strict consistency requirements |
| **WhatsApp bot fleet** | 15 nodes; stateless; auto-scales with conversation volume |

---

## SLO Dashboard

```
╔══════════════════════════════════════════════════════════════╗
║              ONDC COMMERCE PLATFORM — SLO DASHBOARD         ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  SEARCH                           PROTOCOL                   ║
║  ├─ Federated search p95: ≤ 2 s   ├─ Message proc p95: ≤ 200ms║
║  ├─ Result relevance: ≥ 80%       ├─ Delivery guarantee: 99.99%║
║  └─ Cross-lingual accuracy: ≥ 75% └─ Schema compliance: ≥ 98% ║
║                                                              ║
║  ORDERS                           PAYMENTS                   ║
║  ├─ E2E confirmation: ≤ 4 s       ├─ Processing: ≤ 3 s       ║
║  ├─ State consistency: 100%       ├─ Success rate: ≥ 96%     ║
║  └─ Timeout handling: ≤ 30 s      └─ Settlement: T+1 accuracy ║
║                                                              ║
║  ONBOARDING                       LOGISTICS                  ║
║  ├─ e-KYC: ≤ 2 min               ├─ Search: ≤ 3 s           ║
║  ├─ Catalog gen: ≤ 5 s/product    ├─ Tracking: real-time     ║
║  └─ End-to-end: ≤ 48 hours        └─ SLA adherence: ≥ 90%    ║
║                                                              ║
║  TRUST                            WHATSAPP                   ║
║  ├─ Batch compute: ≤ 30 min       ├─ Response: ≤ 3 s         ║
║  ├─ Real-time adj: ≤ 60 s         ├─ Intent accuracy: ≥ 80%  ║
║  └─ Anti-gaming detection: ≤ 1 hr └─ Completion rate: ≥ 60%  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```
