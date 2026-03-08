# Amazon E-Commerce Platform Design

## System Overview

An Amazon-scale e-commerce platform orchestrates product catalog management (500M+ SKUs), real-time search and discovery, shopping cart operations, checkout with payment processing, inventory management across hundreds of fulfillment centers, order lifecycle management, and a third-party marketplace hosting millions of sellers. Amazon processes over 1.6 billion page views per day, handles 66,000+ orders per hour during normal operations (scaling to 300,000+ per hour during Prime Day), and maintains a catalog spanning 350+ million products from both first-party (1P) and third-party (3P) sellers. The core engineering challenges are: **catalog scale** (500M+ SKUs with hierarchical categories, product variations, and seller-specific listings that must be searchable in sub-200ms), **inventory distribution** (stock spread across 200+ fulfillment centers requiring real-time availability checks and optimal warehouse selection), **cart-to-checkout conversion** (maintaining cart state across sessions, merging guest and authenticated carts, real-time pricing recalculation, and handling flash sale contention), **order orchestration** (multi-step fulfillment pipeline from placement through picking, packing, shipping, and delivery with partial shipment support), and **marketplace integration** (seller onboarding, catalog integration, buy box algorithm, and seller fulfillment coordination). Unlike simpler e-commerce systems, this platform must handle extreme traffic spikes (Prime Day sees 10-15× normal traffic), support both 1P and 3P inventory in a unified shopping experience, and maintain sub-second latency across all customer-facing surfaces.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Extremely read-heavy: 1000:1 browse-to-buy ratio; product pages served from cache, search queries at 50K+ QPS |
| **Latency Sensitivity** | High—product page p99 < 200ms, search p99 < 300ms, add-to-cart p99 < 150ms, checkout p99 < 2s |
| **Consistency Model** | Strong consistency for inventory reservation and order placement; eventual consistency for catalog updates, search index, reviews, and recommendations |
| **Data Volume** | Very High—500M+ SKUs, 200M+ customer accounts, 2B+ daily page views, 10M+ orders/day |
| **Architecture Model** | Microservices with cell-based deployment; event-driven for order lifecycle; CQRS for catalog (read-optimized search index, write-optimized catalog DB) |
| **Marketplace Complexity** | High—3P sellers contribute 60%+ of GMV; buy box algorithm, seller rating, fulfillment routing add layers |
| **Complexity Rating** | **Very High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Inventory contention, cart merge, search ranking, flash sales, buy box |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Cell-based architecture, caching, Prime Day scaling, multi-region |
| [06 - Security & Compliance](./06-security-and-compliance.md) | PCI-DSS, fraud detection, bot protection, GDPR, seller verification |
| [07 - Observability](./07-observability.md) | Metrics, logging, distributed tracing, business dashboards |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trade-offs, trap questions |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Amazon E-Commerce (This) | Flight Booking (7.6) | Food Delivery (7.4) | Ride-Hailing (7.1) |
|--------|--------------------------|----------------------|---------------------|---------------------|
| **Inventory Source** | Internal (distributed across warehouses + 3P seller inventory) | External (GDS is authoritative) | Internal (restaurant menus, limited) | Internal (driver availability) |
| **Catalog Scale** | 500M+ SKUs with hierarchical categories, variations, attributes | ~100K flights/day with 26 fare classes | ~50K restaurants with ~100 items each | No catalog (real-time driver pool) |
| **Pricing Model** | Seller competition (buy box), dynamic repricing, promotions, coupons | 26 fare classes, load-factor pricing | Menu prices + delivery fees + surge | Surge pricing (real-time) |
| **Search Complexity** | Full-text + faceted + ML ranking + sponsored results over 500M items | Fan-out to 5+ external GDS APIs | Geographic + cuisine + rating filters | Geospatial matching (nearest drivers) |
| **Cart Pattern** | Persistent cart, guest-to-auth merge, multi-seller, days/weeks lifetime | No cart (single booking flow) | Single-restaurant cart, 30-min lifetime | No cart (instant match) |
| **Order Lifecycle** | Placed → Confirmed → Picking → Packed → Shipped → Delivered → Returned | Hold → Pay → Ticket → Check-in | Placed → Preparing → Picked up → Delivered | Request → Match → Pickup → Drop-off |
| **Fulfillment** | Multi-warehouse selection, split shipments, carrier optimization | Airline operates flight | Restaurant prepares, driver delivers | Driver drives passenger |
| **Traffic Spikes** | Prime Day: 10-15× normal for 48 hours | Holiday travel: 3-5× normal | Meal times: 3× normal daily | Rush hour: 2-3× normal daily |

---

## What Makes This System Unique

1. **Catalog at Planetary Scale**: 500M+ products with hierarchical categories (40K+ leaf categories), product variations (size, color, material—up to 50 variation dimensions), 2B+ product-attribute pairs, and seller-specific listings. The catalog must support real-time updates from millions of sellers while maintaining a consistent, searchable index.

2. **Buy Box as Marketplace Arbitration**: When multiple sellers offer the same product, the buy box algorithm determines which seller's offer appears as the default purchase option. This single algorithmic decision drives ~80% of sales on the platform—it considers price, fulfillment method, seller rating, shipping speed, and stock reliability.

3. **Distributed Inventory Across 200+ Fulfillment Centers**: Unlike single-warehouse e-commerce, inventory is spread geographically. Adding an item to cart requires real-time aggregation of available stock across warehouses, and checkout must select the optimal fulfillment center based on proximity, stock levels, and shipping cost.

4. **Cart as a Long-Lived Distributed Object**: Carts persist for weeks, survive session changes, and must merge when a guest user logs in. With multi-seller carts, each line item may ship from a different warehouse and have independent availability, pricing, and delivery estimates.

5. **Flash Sale Inventory Contention**: During Prime Day, tens of thousands of deals launch simultaneously, with millions of users competing for limited-quantity items. The system must handle 100K+ add-to-cart requests per second for a single popular deal without overselling or degrading the experience for the rest of the platform.

6. **Order Splitting and Fulfillment Optimization**: A single order may be fulfilled from multiple warehouses, creating sub-orders with independent tracking. The fulfillment routing algorithm optimizes across delivery speed, shipping cost, warehouse load, and carrier capacity.

---

## Quick Reference: Scale Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Daily page views | ~2B | ~23,000/s average, ~230,000/s peak |
| Daily orders | ~10M | ~115/s average, ~3,500/s peak (Prime Day) |
| Product catalog size | ~500M SKUs | Including 3P seller listings |
| Active sellers | ~2M+ | Third-party marketplace |
| Search queries/sec (peak) | ~50,000 | Full-text + faceted + ML ranking |
| Add-to-cart/sec (peak) | ~15,000 | 10× during flash sales |
| Fulfillment centers | ~200+ | Global distribution |
| Cart abandonment rate | ~70% | Industry standard; cart recovery is critical |
| Browse-to-buy ratio | ~1000:1 | Drives read-heavy architecture |
| Prime Day traffic multiplier | 10-15× | 48-hour sustained spike |
| Buy box win rate impact | ~80% of sales | Dominant purchase path |
| Average items per order | ~3.5 | Multi-item, potentially multi-warehouse |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [5.5 - Payment Processing System](../5.5-payment-processing-system/) | PCI-DSS compliance, payment orchestration for checkout |
| [2.3 - Elasticsearch Cluster](../2.3-elasticsearch-cluster/) | Product search indexing, full-text and faceted search |
| [1.5 - Distributed Log-Based Broker](../1.5-distributed-log-based-broker/) | Event streaming for order lifecycle, inventory updates |
| [7.4 - Food Delivery System](../7.4-food-delivery-system/) | Order lifecycle management, multi-party coordination |
| [7.6 - Flight Booking System](../7.6-flight-booking-system/) | Inventory reservation patterns, saga-based booking |

---

## Sources

- Amazon Engineering Blog — Microservices Architecture and Cell-Based Deployment
- Amazon Shareholder Letters — Scale metrics and marketplace statistics
- System Design One — How Amazon Scaled Shopping Cart with Dynamo Architecture
- Industry Analysis — E-commerce Architecture Patterns at Scale
- Analytics India Mag — The Complex Tech Architecture Behind Prime Day
- CNCF Case Studies — Large-Scale E-Commerce Platform Patterns
