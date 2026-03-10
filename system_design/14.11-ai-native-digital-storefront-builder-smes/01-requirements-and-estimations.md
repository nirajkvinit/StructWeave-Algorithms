# 14.11 AI-Native Digital Storefront Builder for SMEs — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **Zero-code store creation** — Accept product photos, business name, category, and brief description; AI generates a complete storefront with theme, layout, product pages, navigation, and essential pages (about, contact, return policy) ready for publishing | Store generation latency ≤ 3 minutes for up to 20 products; support 50+ product categories; theme selection based on visual analysis of product images; mobile-first responsive output |
| FR-02 | **AI product content generation** — Automatically generate SEO-optimized product titles, descriptions, tags, and meta descriptions from product images and minimal merchant input; support multilingual generation in 10+ Indian and international languages | Description quality score ≥ 85/100 on readability and SEO metrics; multilingual generation with cultural localization (not literal translation); keyword density 1-3% for target terms; A/B variant generation for testing |
| FR-03 | **Visual theme intelligence** — Analyze product images to determine color palette, style aesthetic, and brand personality; auto-select and customize storefront theme (typography, spacing, layout grid, hero sections) that visually complements the product catalog | Support 100+ base themes across product categories; automatic color palette extraction from product images; font pairing recommendations; layout optimization based on product count and image quality |
| FR-04 | **Dynamic pricing engine** — Provide AI-driven pricing recommendations based on competitor price monitoring, demand signals, margin targets, and seasonal patterns; support one-tap price acceptance, bulk pricing updates, and A/B price testing | Competitor price refresh every 4 hours; demand signal analysis from platform-wide search and click data; configurable margin floor (minimum acceptable margin); price change history with rollback capability |
| FR-05 | **Multi-channel catalog sync** — Synchronize product catalog (listings, prices, inventory, images) across merchant's website, WhatsApp Business Catalog, Instagram Shop, and connected marketplaces in real-time | Sync latency ≤ 30 seconds for inventory updates; ≤ 5 minutes for catalog changes; per-channel schema transformation; conflict resolution for channel-specific constraints; drift detection and auto-correction |
| FR-06 | **Unified inventory management** — Maintain a single source of truth for inventory across all channels; support reservation-based stock management during checkout; automatic safety buffer per channel; low-stock and stockout alerts with auto-actions | Real-time inventory accuracy ≥ 99.5%; overselling rate < 0.1%; configurable safety buffer per channel (default 10%); automatic channel delisting at stockout; restock notification to merchant |
| FR-07 | **Payment orchestration** — Integrate with multiple payment gateways supporting UPI (collect and intent), mobile wallets, net banking, cards, COD, and EMI; intelligent routing for lowest transaction cost; automatic reconciliation | Payment success rate ≥ 96%; settlement reconciliation accuracy 100%; multi-gateway failover within 2 seconds; split settlement support for marketplace orders; COD verification via automated calls |
| FR-08 | **Order management** — Unified order processing across all channels; order status tracking; automated notifications (order confirmation, shipping update, delivery); return and refund management with configurable policies | Order visibility across all channels in single dashboard; automated status update propagation to customers via WhatsApp/SMS; return initiation via customer-facing portal; refund processing within 48 hours |
| FR-09 | **Storefront analytics and AI insights** — Provide actionable business intelligence: daily revenue summary, conversion funnel analysis, top products, traffic sources, competitor price movements, AI-generated action recommendations | Daily AI-generated business briefing via WhatsApp; per-channel performance attribution; conversion funnel analysis with drop-off identification; anomaly detection for traffic and revenue |
| FR-10 | **Custom domain and branding** — Support custom domain mapping, SSL certificate provisioning, logo placement, brand color customization, and social media link integration for professional brand presence | Automated DNS verification and SSL provisioning; custom domain propagation ≤ 24 hours; brand kit storage (logo, colors, fonts) with consistent application across channels |
| FR-11 | **Customer relationship management** — Capture and manage customer data across channels; segment customers by purchase behavior, channel preference, and engagement; support targeted promotions and loyalty programs | Unified customer profile across channels; automated segmentation based on RFM (recency, frequency, monetary) analysis; WhatsApp broadcast for promotions with opt-in management |
| FR-12 | **SEO and discoverability** — Auto-generate sitemaps, structured data (JSON-LD), meta tags, and Open Graph tags; optimize page load performance for Core Web Vitals; submit to search engine indexes automatically | Automated sitemap generation and submission; JSON-LD product markup for rich search results; page speed optimization targeting LCP < 2.5s, FID < 100ms, CLS < 0.1 |

---

## Out of Scope

- **Custom code injection** — No merchant-written HTML/CSS/JavaScript; the platform is exclusively zero-code with AI-managed customization
- **B2B wholesale features** — No bulk pricing tiers, quote-request workflows, or multi-buyer account management
- **Full logistics management** — No fleet management, route optimization, or last-mile delivery orchestration; integration with third-party logistics providers via API
- **Financial lending** — No working capital loans, BNPL for merchants, or credit assessment; limited to payment processing for transactions
- **Physical POS integration** — No in-store hardware integration, barcode scanning, or offline-first POS; the platform is digital-channel-only

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Store creation latency (p95) | ≤ 3 minutes (20 products) | Merchant expectation is near-instant; exceeding 5 minutes causes abandonment |
| Storefront page load — TTFB (p95) | ≤ 200 ms | SEO ranking factor; user abandonment increases 32% per second of load time |
| Storefront page load — LCP (p95) | ≤ 2.5 s | Core Web Vital threshold for "good" rating by search engines |
| Product description generation (p95) | ≤ 8 s per product | Must feel responsive during store creation flow |
| Multi-channel sync — inventory (p95) | ≤ 30 s | Prevent overselling during flash sales or viral product moments |
| Multi-channel sync — catalog (p95) | ≤ 5 min | Channel API rate limits constrain faster sync for large catalogs |
| Payment processing (p95) | ≤ 3 s (redirect to payment gateway) | Payment UX must not add friction to checkout |
| Dynamic pricing refresh (p95) | ≤ 4 hours | Competitor prices change infrequently; 4-hour cycle balances freshness vs. scraping cost |
| API response time (p95) | ≤ 150 ms | Merchant dashboard interactions must feel instantaneous |

### Reliability & Availability

| Metric | Target |
|---|---|
| Storefront availability | 99.99% (≤ 52.6 minutes downtime/year) — storefront downtime directly costs merchants revenue |
| Payment processing availability | 99.99% — payment failures are the highest-friction merchant churn driver |
| Multi-channel sync availability | 99.9% — brief sync delays are tolerable; data loss is not |
| Store builder availability | 99.9% — creation is a one-time flow; brief outages acceptable with retry |
| Merchant dashboard availability | 99.9% — merchants check dashboards intermittently |
| Content generation pipeline | 99.5% — async pipeline with retry; merchant doesn't block on this |
| Data durability (product/order data) | 99.999999999% (11 nines) |

---

## Capacity Estimations

### User and Store Scale

| Parameter | Value | Basis |
|---|---|---|
| Total registered merchants | 5 million | Indian SME digital adoption trajectory (Dukaan: 7M+, Bikayi: 10M+) |
| Monthly active merchants | 2 million (40%) | Industry standard for freemium SaaS platforms |
| Active storefronts (published) | 3 million | Some merchants have multiple stores (wholesale + retail) |
| Average products per store | 50 | SME catalog size; ranges from 5 (food) to 500 (fashion) |
| Total products across platform | 150 million | 3M stores × 50 products |
| New stores created daily | 8,000 | Growth phase assumption |
| Product listings added daily | 200,000 | New stores + existing store expansion |

### Traffic and Transaction Scale

| Parameter | Value | Calculation |
|---|---|---|
| Daily storefront page views | 300 million | 3M stores × 100 avg daily views (power-law distribution) |
| Peak page views per second | 15,000 | 2× average with 10× peak multiplier for festive sales |
| Daily orders across platform | 2 million | 2% average conversion on 100M shopping sessions |
| Peak orders per second | 500 | Festive season: 10× daily average compressed into peak hours |
| Average order value | ₹800 ($10) | SME price points; ranges from ₹200 to ₹5,000 |
| Daily GMV | ₹1.6 billion ($20M) | 2M orders × ₹800 AOV |
| Payment transactions daily | 1.4 million | 70% prepaid (UPI/wallet/card); 30% COD |

### Storage Estimations

| Data Type | Size Estimate | Calculation |
|---|---|---|
| Product catalog (metadata) | 30 TB | 150M products × 200 KB (attributes, descriptions, multilingual content) |
| Product images (original) | 150 TB | 150M products × 5 images × 200 KB avg |
| Product images (variants, CDN) | 600 TB | 6 size variants × WebP + AVIF + JPEG per original |
| Generated storefront assets | 15 TB | 3M stores × 5 MB (CSS, JS bundles, theme assets) |
| Order data | 5 TB/year | 730M orders/year × 7 KB per order record |
| Analytics events | 20 TB/year | 300M page views/day × 200 bytes × 365 |
| Total active storage | ~820 TB | Sum of above |

### Compute Estimations

| Component | Scale | Notes |
|---|---|---|
| Storefront CDN bandwidth | 50 TB/day | 300M page views × 170 KB average page weight |
| AI content generation (GPU) | 200,000 inferences/day | New products + regeneration requests; batch processing |
| Dynamic pricing compute | 150M price evaluations/day | 150M products checked against pricing rules; most are no-ops |
| Multi-channel sync events | 5 million events/day | Product updates + inventory changes + price adjustments |
| Image processing pipeline | 200,000 images/day | New uploads: resize, optimize, generate variants |

### Cost Drivers

| Component | Monthly Estimate | Notes |
|---|---|---|
| CDN and bandwidth | $150,000 | 50 TB/day × $0.10/GB at scale |
| Compute (API, rendering) | $200,000 | Stateless services across multiple regions |
| GPU (AI content + pricing) | $80,000 | Batch processing; not real-time inference |
| Storage (object + database) | $100,000 | Tiered storage with hot/warm/cold lifecycle |
| Payment gateway fees | Pass-through | 1.5-2% per transaction; charged to merchant or customer |
| Third-party APIs (scraping, channel) | $30,000 | Competitor price data feeds; channel API costs |
| **Total infrastructure** | **~$560,000/month** | Before payment gateway pass-through |
| **Per-active-merchant cost** | **~$0.28/month** | $560K / 2M active merchants |

---

## SLO Summary Dashboard

| Category | Metric | SLO | Error Budget (monthly) |
|---|---|---|---|
| **Availability** | Storefront uptime | 99.99% | 4.3 minutes |
| **Availability** | Payment uptime | 99.99% | 4.3 minutes |
| **Latency** | Storefront TTFB (p95) | ≤ 200 ms | 5% of requests can exceed |
| **Latency** | API response (p95) | ≤ 150 ms | 5% of requests can exceed |
| **Correctness** | Inventory sync accuracy | ≥ 99.5% | 0.5% discrepancy tolerance |
| **Correctness** | Payment reconciliation | 100% | Zero tolerance for mismatches |
| **Freshness** | Channel catalog sync | ≤ 5 minutes | 95% of updates propagated within SLO |
| **Freshness** | Competitor price data | ≤ 4 hours | 95% of products have prices refreshed within SLO |
| **Throughput** | Store creation | ≤ 3 min for 95% | 5% may take up to 5 minutes during peak load |
