# Requirements & Estimations

## Functional Requirements

### Core Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Product Catalog** | Browse and manage 500M+ products with hierarchical categories, variations (size, color), rich attributes, images, and seller listings |
| F2 | **Product Search** | Full-text search with autocomplete, faceted filtering (price, brand, rating, category), ML-based ranking, and sponsored product placement |
| F3 | **Product Detail Page** | Display product info, variations, pricing from multiple sellers, buy box winner, reviews, Q&A, related products, delivery estimates |
| F4 | **Shopping Cart** | Add/remove/update items, persist across sessions, merge guest cart on login, real-time price and availability checks, save-for-later |
| F5 | **Checkout** | Multi-step flow: shipping address → delivery options → payment method → order review → place order; apply coupons/gift cards |
| F6 | **Inventory Management** | Track stock across 200+ fulfillment centers, real-time availability, soft reserve at cart, hard reserve at checkout, restock alerts |
| F7 | **Order Management** | Place, track, modify, and cancel orders; support partial fulfillment, split shipments, and order history |
| F8 | **Payment Processing** | Multiple payment methods (cards, wallets, gift cards, buy-now-pay-later), tokenized storage, PCI-DSS compliant |
| F9 | **Reviews & Ratings** | Submit, display, and moderate product reviews; verified purchase badges, helpful votes, image/video reviews |
| F10 | **Marketplace** | Seller onboarding, product listing, inventory sync, buy box competition, seller dashboard, fulfillment options (seller-fulfilled vs. platform-fulfilled) |
| F11 | **Promotions & Deals** | Lightning deals, coupons, Prime-exclusive pricing, quantity-limited deals with countdown timers |
| F12 | **Delivery Estimation** | Real-time delivery date calculation based on warehouse proximity, carrier capacity, and shipping method |

### User Roles

| Role | Capabilities |
|------|-------------|
| **Customer** | Browse, search, cart, checkout, order tracking, reviews, returns, wishlists |
| **Seller** | Product listing, inventory management, order fulfillment, pricing, analytics, promotions |
| **Warehouse Operator** | Receive shipments, pick/pack/ship orders, manage inventory locations, process returns |
| **Platform Admin** | Catalog governance, seller approval, fraud review, system configuration, analytics |
| **Customer Support** | Order lookup, refund processing, dispute resolution, account management |

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Product Page Latency** | p50 < 100ms, p99 < 200ms | Revenue-critical; every 100ms of latency costs ~1% in sales |
| **Search Latency** | p50 < 150ms, p99 < 300ms | Primary product discovery path; must feel instant |
| **Add-to-Cart Latency** | p99 < 150ms | High-frequency action during shopping; must be snappy |
| **Checkout Latency** | p99 < 2s | Includes inventory reservation + payment processing |
| **Search Availability** | 99.99% | Cannot afford search downtime; degraded results acceptable |
| **Checkout Availability** | 99.999% | Every second of checkout downtime = significant revenue loss |
| **Inventory Consistency** | Strongly consistent | Must not oversell; hard reservation at checkout is non-negotiable |
| **Catalog Freshness** | < 5 minutes | Seller price/stock updates reflected in search within 5 minutes |
| **Order Durability** | 99.9999% | Order records must never be lost |
| **Concurrent Users** | 500M+ monthly active | Support millions of concurrent sessions |

---

## Capacity Estimations

### Traffic

```
Daily page views:           2,000,000,000 (2B)
Daily unique visitors:      200,000,000 (200M)
Daily searches:             500,000,000 (500M)
Daily add-to-cart actions:  50,000,000 (50M)
Daily orders:               10,000,000 (10M)
Average items per order:    3.5

Page views/sec average:     2B / 86,400 ≈ 23,150/sec
Page views/sec peak:        23,150 × 10 = 231,500/sec

Searches/sec average:       500M / 86,400 ≈ 5,790/sec
Searches/sec peak:          5,790 × 10 ≈ 57,900/sec

Orders/sec average:         10M / 86,400 ≈ 115/sec
Orders/sec peak:            115 × 10 = 1,150/sec (normal day)
Orders/sec Prime Day peak:  115 × 30 = 3,450/sec
```

### Storage

```
--- Product Catalog ---
Total SKUs:                 500,000,000
Average product record:     5 KB (attributes, descriptions, metadata)
Catalog data:               500M × 5 KB = 2.5 TB
Product images:             500M × 8 images avg × 500 KB = 2 PB (object storage + CDN)
Search index:               500M documents × 2 KB = 1 TB (inverted index)

--- Shopping Cart ---
Active carts:               100,000,000 (100M at any time)
Average cart size:          500 bytes (3 items × metadata)
Total cart storage:         100M × 500 B = 50 GB (key-value store)
Cart write rate:            50M actions/day ≈ 580/sec

--- Order Database ---
Orders per day:             10,000,000
Order record size:          2 KB (items, address, payment ref, status)
Order items per day:        35,000,000 (10M × 3.5 avg items)
Order item record size:     500 bytes
Daily order growth:         10M × 2 KB + 35M × 500 B = 37.5 GB/day
Annual order growth:        37.5 GB × 365 = 13.7 TB/year
5-year retention:           68.5 TB

--- Inventory ---
SKU-warehouse combinations: 500M SKUs × 5 avg warehouses = 2.5B records
Inventory record size:      100 bytes (sku_id, warehouse_id, quantity, reserved)
Total inventory data:       2.5B × 100 B = 250 GB
Inventory update rate:      ~50,000 updates/sec (orders + restocks + transfers)

--- Reviews ---
Total reviews:              1,000,000,000 (1B)
Average review size:        1 KB
Review storage:             1B × 1 KB = 1 TB
Daily new reviews:          5,000,000
```

### Bandwidth

```
Product page response:      200 KB compressed (HTML + data; images via CDN)
Peak page bandwidth:        231,500 × 200 KB = 46.3 GB/s outbound
CDN offload (95%):          46.3 × 0.05 = 2.3 GB/s from origin

Search response:            50 KB compressed (20 results with thumbnails via CDN)
Peak search bandwidth:      57,900 × 50 KB = 2.9 GB/s outbound

Image CDN bandwidth:        ~500 GB/s (dominated by product images)
```

---

## SLO / SLA Table

| Service | Metric | SLO | SLA | Measurement |
|---------|--------|-----|-----|-------------|
| Product Page | Latency p50 | < 100ms | < 200ms | Cache hit path (95% of requests) |
| Product Page | Latency p99 | < 200ms | < 500ms | Cache miss requires DB lookup |
| Product Search | Latency p50 | < 150ms | < 250ms | Search index query + ranking |
| Product Search | Latency p99 | < 300ms | < 500ms | Complex faceted query with ML reranking |
| Add to Cart | Latency p99 | < 150ms | < 300ms | Cart update + availability check |
| Checkout | Latency p99 | < 2s | < 5s | Inventory reservation + payment capture |
| Checkout | Success rate | > 99.5% | > 98% | Inventory available + payment succeeds |
| Search | Availability | 99.99% | 99.9% | Degraded results acceptable |
| Checkout | Availability | 99.999% | 99.99% | Revenue-critical path |
| Order Placement | Durability | 99.9999% | 99.999% | No placed order ever lost |
| Inventory Sync | Freshness | < 2s | < 10s | From warehouse event to availability update |
| Catalog Update | Freshness | < 5 min | < 15 min | Seller update to search index |
| Product Image | CDN hit rate | > 95% | > 90% | Cache coverage for product images |
| Review Display | Latency p99 | < 200ms | < 500ms | Aggregate rating + top reviews |

---

## Key Estimation Insights

1. **Read-to-write ratio is extreme**: At 2B page views vs. 10M orders, the ratio is 200:1 for pages and 1000:1 for browsing-to-buying. This demands aggressive caching (CDN, application cache, search index) and a CQRS architecture separating read and write paths.

2. **Image storage dominates**: At 2 PB for product images, this is the largest storage cost by far. CDN offload is mandatory—serving images from origin at 500 GB/s peak would be economically impossible.

3. **Inventory is the consistency bottleneck**: 2.5B SKU-warehouse records with 50K updates/sec requires careful sharding. Strong consistency is mandatory only for the reservation path (checkout); eventual consistency is acceptable for display availability.

4. **Cart storage is surprisingly small**: 100M active carts × 500 bytes = 50 GB—easily fits in a distributed key-value store. The challenge is not storage but durability, session merge, and multi-device sync.

5. **Prime Day requires 15-30× capacity headroom**: Normal peak is 10× average, but Prime Day adds another 3× on top. This drives pre-provisioning and auto-scaling strategies that most systems never face.

6. **Search index at 1 TB is manageable**: 500M products × 2 KB per document. The challenge is not size but query complexity (faceted search + ML ranking + personalization) at 58K QPS peak.
