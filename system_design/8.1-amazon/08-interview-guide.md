# Interview Guide

## 45-Minute Pacing

### Minutes 0-5: Clarify Scope

**Key clarifying questions to ask (or expect):**

| Question | Why It Matters |
|----------|---------------|
| "Are we designing the full platform (catalog + search + cart + checkout + fulfillment) or a specific subsystem?" | Full platform is 45 minutes of breadth; a subsystem (e.g., just checkout) is a depth exercise |
| "Is this a single-seller or marketplace model?" | Marketplace adds buy box, seller management, and fulfillment routing complexity |
| "What's the catalog scale? Thousands or hundreds of millions of products?" | Drives search architecture decisions—simple DB query vs. dedicated search index |
| "Do we need to handle flash sales / extreme traffic spikes?" | Drives capacity planning and inventory contention strategy |
| "Who owns fulfillment—us or the sellers?" | Platform-fulfilled (like FBA) vs. seller-fulfilled changes the entire order pipeline |

**Recommended scope for 45 minutes:**
- Marketplace model (1P + 3P sellers)
- Product catalog + search + cart + checkout + inventory + orders
- Discuss but do not fully design: reviews, recommendations, returns, seller portal
- Flash sale scenario as a scaling deep dive

---

### Minutes 5-15: High-Level Architecture

Draw the architecture with these components:
1. **Client layer** → API Gateway → BFF
2. **Discovery path**: Search Service → Search Index (500M products), Catalog Service → Product DB
3. **Commerce path**: Cart Service → Cart Store, Checkout Orchestrator → Inventory + Payment + Order
4. **Marketplace**: Buy Box Engine, Seller Listing Service
5. **Fulfillment**: Order Service → Fulfillment Router → Shipping/Tracking
6. **Data stores**: Product Catalog DB, Search Index, Cart Store (key-value), Order DB (relational, sharded), Inventory DB (relational, sharded), Event Bus, CDN

**Key points to make:**
- "The catalog is read-heavy at 1000:1 browse-to-buy, so I'll use CQRS: write to a catalog DB, async-index to a search index optimized for reads"
- "Cart is a distributed key-value store, not relational—it needs sub-50ms writes and must survive node failures"
- "Checkout is a saga: reserve inventory → authorize payment → create order. Any step can fail, so each step has a compensating action"
- "Inventory is the consistency bottleneck—I'll use optimistic locking to prevent overselling without creating lock contention"

---

### Minutes 15-28: Deep Dive — Inventory + Checkout

This is where you differentiate. Focus on:

**1. Distributed Inventory**
- Inventory spread across 200+ warehouses; not a single number per product
- `available = total - reserved` per SKU per warehouse
- Soft check at add-to-cart (non-blocking); hard reservation at checkout (blocking, with TTL)
- Optimistic locking (version column) prevents concurrent overselling
- If reservation fails at primary warehouse → try next-closest warehouse → update delivery estimate

**2. Checkout Saga**
- Step 1: Validate cart (re-check prices, re-check availability)
- Step 2: Reserve inventory (hard reserve, 10-min TTL)
- Step 3: Authorize payment (card hold, no capture yet)
- Step 4: Create order record (with idempotency key)
- Step 5: Capture payment
- Step 6: Confirm reservation, clear cart
- If Step 3 fails: release reservation (compensating action)
- If Step 4 fails: void payment auth + release reservation

**3. Idempotency**
- Client sends idempotency key with every checkout request
- Server checks: "have I seen this key before?" → yes → return existing order
- Prevents duplicate orders from network retries or double-clicks

**4. Fulfillment Routing**
- After order is placed, router selects warehouse(s) per item
- Factors: proximity (speed), stock depth, shipping cost, warehouse load
- May split order across warehouses → multiple shipments with independent tracking

---

### Minutes 28-38: Search + Marketplace

**Search architecture:**
- 500M products in a distributed search index
- Multi-stage pipeline: query understanding → retrieval (BM25) → ML reranking → business rules
- Faceted search (brand, price range, rating) with pre-aggregated counts for popular categories
- 58K QPS peak; each query must return in < 300ms
- Sponsored products injected at specific positions

**Marketplace and buy box:**
- Multiple sellers can offer the same product
- Buy box algorithm determines which offer gets the "Add to Cart" button
- Factors: landed price (35%), fulfillment quality (25%), seller performance (20%), stock reliability (10%), delivery speed (10%)
- Buy box drives ~80% of sales → the single most important algorithm
- Recomputed on price changes (event-driven) + every 15 minutes (periodic)

---

### Minutes 38-43: Flash Sales + Caching + Reliability

**Flash sale inventory contention:**
- Problem: 50K+ requests/sec competing for 10K units of one product
- Solution: pre-shard inventory into 64 atomic counters (hash(user_id) % 64)
- Each shard is an independent decrement operation—no cross-shard coordination
- When a shard runs out → try stealing from adjacent shards
- Virtual queue for overflow: user gets a position, granted access token when it's their turn

**Caching strategy:**
- Multi-layer: CDN (images, 95% hit) → distributed cache (product data, 95% hit) → DB
- Product page: cache with 5-min TTL, event-driven invalidation on seller price changes
- Search: result cache with 3-min TTL, facet cache hourly
- Cart: key-value store IS the primary store (not a cache)

**Cell-based reliability:**
- Platform partitioned into cells (each cell serves a subset of users)
- Bad deployment affects one cell, not the entire platform
- Catalog and search index are globally replicated; orders and carts are cell-local

---

### Minutes 43-45: Trade-offs + Summary

Summarize 2-3 key trade-offs and why you chose as you did.

---

## What Makes Amazon E-Commerce Uniquely Hard

| Challenge | Why It Is Unique | How It Shapes Architecture |
|-----------|-----------------|--------------------------|
| **Catalog scale** | 500M+ SKUs, 40K categories, millions of seller updates/day | CQRS with dedicated search index; async catalog-to-index pipeline |
| **Distributed inventory** | Stock across 200+ warehouses; "available" is a multi-warehouse aggregation | Sharded inventory DB; optimistic locking; fulfillment routing algorithm |
| **Buy box algorithm** | Single algorithm drives 80% of sales; fairness and accuracy are critical | ML-based scoring; event-driven recomputation; anti-gaming monitoring |
| **Flash sale contention** | 50K+ req/sec on limited inventory | Pre-sharded counters; virtual queue; progressive load shedding |
| **Cart complexity** | Guest/auth merge, multi-seller, weeks-long persistence, real-time pricing | Distributed key-value store; vector clock conflict resolution |
| **Order splitting** | One order → multiple warehouses → multiple shipments | Sub-order model; independent lifecycle per shipment; composite status |
| **Prime Day (10-15× traffic)** | 48-hour sustained spike, not a brief burst | Cell-based architecture; pre-provisioning; progressive degradation |

---

## Key Trade-Offs Table

| Decision | Option A | Option B | Recommendation | Rationale |
|----------|----------|----------|----------------|-----------|
| **Catalog storage** | Single relational DB | CQRS (write DB + search index) | CQRS | Relational DB cannot serve 58K search QPS with ML ranking; separate read-optimized index required |
| **Cart storage** | Relational DB | Distributed key-value store | Key-value | Cart is simple key-value access pattern; relational overhead (joins, schemas) adds latency for no benefit |
| **Inventory lock type** | Pessimistic (SELECT FOR UPDATE) | Optimistic (version column) | Optimistic | Pessimistic serializes all writes to a SKU → unacceptable latency at 50K updates/sec; optimistic allows parallelism with rare retries |
| **Checkout pattern** | Synchronous distributed transaction | Saga with compensation | Saga | No 2PC coordinator spans inventory DB + payment gateway + order DB; saga handles partial failures gracefully |
| **Flash sale inventory** | Single atomic counter | Pre-sharded counters | Pre-sharded | Single counter = 50K writes/sec on one key → bottleneck; 64 shards = 800 writes/sec per shard |
| **Search ranking** | BM25 only | BM25 + ML reranking | BM25 + ML | BM25 alone doesn't optimize for conversion; ML model incorporates behavioral signals, personalization |
| **Buy box refresh** | Real-time (every request) | Event-driven + periodic | Event-driven + periodic | Real-time is too expensive at 230K page views/sec; event-driven catches price changes; periodic catches edge cases |
| **Order data model** | Single order record | Order + sub-orders (shipments) | Order + sub-orders | Multi-warehouse fulfillment requires independent tracking per shipment; single record cannot model this |
| **Multi-region writes** | Active-active | Active-passive (per region) | Active-passive | Active-active for orders creates reconciliation nightmares; active-passive with fast failover is simpler and safer |
| **Catalog replication** | Synchronous cross-region | Async with eventual consistency | Async | Synchronous cross-region adds 200ms+ to every catalog write; catalog freshness of <5 min is acceptable |

---

## Trap Questions & Strong Answers

### "How do you prevent overselling?"

**Weak answer:** "We check inventory before placing the order."

**Strong answer:** "Checking inventory is necessary but not sufficient—two concurrent checkouts can both read 'available=1' and both proceed. I use optimistic locking: the inventory reservation is an atomic UPDATE with a version check: `SET reserved += 1, version += 1 WHERE version = X AND available >= quantity`. Only one concurrent update succeeds; the other gets 0 rows affected and retries at a different warehouse. For flash sales, I pre-shard inventory into 64 atomic counters to distribute contention. The key insight: checking availability is a soft read; reserving inventory is a hard write with conflict detection."

### "How does the shopping cart work at scale?"

**Weak answer:** "We store it in a relational database."

**Strong answer:** "The cart is a distributed key-value store, inspired by Dynamo-style architecture. Key = user_id, value = serialized cart. Three replicas with quorum reads and writes (R=2, W=2) give us high availability and durability. The cart persists across sessions and devices. The hardest problem is guest-to-authenticated cart merge: when a guest user logs in and has items in both guest and authenticated carts, we merge using a max-quantity strategy for duplicates and union for distinct items, then recalculate all prices (which may have changed). Cart storage is surprisingly small—100M carts × 500 bytes = 50 GB."

### "What's the buy box and why does it matter?"

**Weak answer:** "It picks the cheapest seller."

**Strong answer:** "The buy box determines which seller's offer appears as the default 'Add to Cart' option when multiple sellers offer the same product. It drives ~80% of purchases, making it the single most important algorithm on the platform. It's NOT just cheapest-price-wins—the algorithm scores offers on: landed price (35%), fulfillment quality (25%, platform-fulfilled gets a boost), seller performance metrics (20%, order defect rate, late shipment rate), stock reliability (10%), and delivery speed (10%). It's recomputed on price change events and every 15 minutes periodically. Getting this algorithm wrong either unfairly disadvantages good sellers or gives customers bad experiences with unreliable sellers."

### "How do you handle Prime Day traffic?"

**Weak answer:** "We auto-scale our servers."

**Strong answer:** "Auto-scaling alone can't handle 10-15× traffic spikes—you can't provision new instances fast enough. We use a multi-layered strategy: (1) Pre-provisioning: add 8-10× capacity weeks before, load-test at 15× to find bottlenecks. (2) Cell-based isolation: partition customers across cells so a failure in one cell affects only ~10% of users. (3) Pre-sharded deal inventory: flash deal stock is split across 64 atomic counters to distribute contention. (4) Progressive load shedding: as load increases, disable non-critical features (recommendations at 5×, reviews at 10×, everything except checkout at 15×). (5) Virtual queue for high-demand deals: rather than rejecting users, queue them and grant access tokens. The principle: protect the purchase path at all costs."

### "What if a product page shows 'In Stock' but checkout says 'Out of Stock'?"

**Weak answer:** "We show real-time inventory."

**Strong answer:** "This is expected and by design. Product pages show a soft availability check from a cached inventory snapshot—this is eventually consistent and optimized for speed. The checkout path performs a hard reservation with optimistic locking—this is strongly consistent and guarantees correctness. The gap between display and reality is typically seconds to minutes. When a user reaches checkout and inventory is gone, we: (1) show a clear 'no longer available' message, (2) suggest alternatives (same product from a different seller, similar products), (3) offer to notify when back in stock. The key insight is that 1000:1 browse-to-buy ratio means optimizing display for speed (eventual consistency) while protecting the purchase path (strong consistency) is the right trade-off."

---

## Follow-Up Deep Dives

If the interviewer wants to go deeper, be prepared for:

| Topic | Key Points |
|-------|-----------|
| **Recommendation engine** | Collaborative filtering ("customers who bought X also bought Y"), content-based (attribute similarity), session-based (real-time clickstream), matrix factorization for cold-start |
| **Search autocomplete** | Trie-based prefix matching, query frequency weighting, personalized completions, category suggestions, spelling correction |
| **Returns and refunds** | Return authorization, refund calculation (partial refund if promotion threshold broken), restocking to inventory, seller-fulfilled return logistics |
| **Seller payment settlement** | Hold period (14 days new sellers, 3 days established), commission deduction, cross-border currency conversion, disbursement scheduling |
| **Product catalog taxonomy** | Hierarchical category tree, attribute inheritance, product type templates, catalog matching and deduplication, category prediction ML |
| **Delivery estimation** | Warehouse proximity, carrier capacity, historical delivery times by zip code, cut-off times for same-day/next-day, weather/event adjustments |

---

## Red Flags to Avoid

| Red Flag | Why It Is Wrong | Correct Approach |
|----------|----------------|------------------|
| "We use a single database for everything" | 500M products + 10M orders/day + 50K inventory updates/sec in one DB = impossibly hot | CQRS for catalog, sharded order DB, sharded inventory DB, key-value for cart |
| "We lock inventory rows during the entire checkout" | Pessimistic locking at 50K updates/sec → serialization and timeouts | Optimistic locking with version column; retry on conflict |
| "Cart is just a database table" | Relational overhead for a simple key-value access pattern; schema rigidity for a volatile object | Distributed key-value store with replication |
| "Buy box just picks the cheapest offer" | Cheapest price without quality factors leads to race-to-bottom pricing and unreliable sellers | Multi-factor scoring: price + fulfillment + seller quality + reliability |
| "We handle Prime Day with auto-scaling" | Auto-scaling is too slow for 10× spike in seconds | Pre-provisioning + cell-based isolation + progressive load shedding |
| "One order = one shipment" | Multi-warehouse fulfillment splits orders | Order + sub-order model with independent shipment tracking |
| "We store credit card numbers" | PCI-DSS violation; massive breach risk | Tokenize via payment gateway; never store raw card data |
| "Inventory is one number per product" | Ignores multi-warehouse reality | Per-SKU per-warehouse inventory with aggregation |
