# Deep Dive & Bottlenecks

## 1. Inventory Reservation Race Conditions

### The Problem

When multiple users attempt to purchase the last unit of a product simultaneously, the system faces a classic race condition. Consider:

```
Initial state: Product X, Warehouse A, available_quantity = 1

Time T1: User A reads available_quantity = 1 → proceeds to reserve
Time T2: User B reads available_quantity = 1 → proceeds to reserve
Time T3: User A writes reserved_quantity += 1 → available = 0 ✓
Time T4: User B writes reserved_quantity += 1 → available = -1 ✗ (OVERSOLD)
```

### Solution: Optimistic Locking with Version Counter

```
-- Each inventory row has a version column
-- UPDATE only succeeds if version matches (no concurrent modification)

UPDATE Inventory
SET reserved_quantity = reserved_quantity + 1,
    version = version + 1
WHERE product_id = 'X'
  AND warehouse_id = 'A'
  AND version = 42                              -- optimistic lock
  AND (total_quantity - reserved_quantity) >= 1  -- availability guard
```

If two concurrent updates target the same row, only one succeeds (the first to commit increments the version). The other gets 0 rows affected and must retry or try a different warehouse.

### Why Not Pessimistic Locking?

Pessimistic locks (SELECT FOR UPDATE) serialize all reservation requests for the same SKU-warehouse pair. At 1,150 orders/sec peak (each potentially touching multiple inventory rows), lock contention would create unacceptable latency. Optimistic locking allows parallel reads and only serializes at write time, with conflicts being rare (< 1% of cases for most products).

### Multi-Warehouse Fallback

When reservation fails at the primary warehouse, the system cascades to the next-best warehouse:

```
Warehouse selection priority:
1. Closest warehouse with stock        → best delivery speed
2. Second-closest warehouse             → slightly slower delivery
3. Any warehouse with stock             → update delivery estimate
4. No warehouse has stock               → "Out of Stock" to user
```

The delivery estimate is recalculated each time the warehouse assignment changes, and the user sees the updated estimate before confirming.

---

## 2. Shopping Cart: Distributed State and Merge Complexity

### Cart Architecture Challenges

The shopping cart is deceptively complex because it must:

1. **Persist across sessions**: A customer adds items on mobile, continues on desktop hours later
2. **Survive outages**: Cart data must be durable—losing a cart loses a potential sale
3. **Handle guest-to-auth merge**: Guest user adds 3 items, logs in with existing cart of 2 items
4. **Show real-time pricing**: Prices may change between cart-add and checkout
5. **Reflect availability**: Items may go out of stock while sitting in a cart

### Storage Model

Cart data lives in a distributed key-value store (inspired by Dynamo-style architecture):

```
Key:    "cart:{user_id}" or "cart:guest:{session_id}"
Value:  serialized cart object (items, quantities, metadata)
Config: replication_factor=3, read_quorum=2, write_quorum=2
```

This provides:
- **High availability**: Any 2 of 3 replicas can serve reads/writes
- **Low latency**: Key-value lookup is O(1), sub-5ms at p99
- **Conflict resolution**: Vector clocks detect concurrent modifications; last-write-wins for quantity, union for item additions

### Cart Merge Strategy

When a guest logs in and has both a guest cart and an authenticated cart:

| Scenario | Resolution |
|----------|------------|
| Same product in both carts | Take maximum quantity |
| Product only in guest cart | Add to authenticated cart |
| Product only in auth cart | Keep as-is |
| Price changed since guest added | Show price-change indicator |
| Guest item now out of stock | Move to "Save for Later" with notification |

### Cart Abandonment Recovery

70% of carts are abandoned. Recovery mechanisms:

1. **Persistent storage**: Cart survives for 30 days (guest) or indefinitely (authenticated)
2. **Abandonment email**: Triggered 2 hours after last cart activity if items still in stock
3. **Price drop notification**: If an item in cart drops in price, send push notification
4. **One-click reorder**: Previous orders can be re-added to cart with a single action

---

## 3. Search Ranking at Scale

### The Challenge

Searching 500M+ products for "wireless headphones" must return relevant, high-quality results in < 300ms. This requires a multi-stage pipeline.

### Search Pipeline

```
Stage 1: Query Understanding (5ms)
├── Spell correction: "wireles headfones" → "wireless headphones"
├── Synonym expansion: "headphones" → "headphones OR earphones OR headset"
├── Category prediction: P(Electronics > Audio > Headphones) = 0.95
└── Intent classification: PRODUCT_SEARCH (vs. brand search, info search)

Stage 2: Retrieval (20ms)
├── Inverted index lookup: ~50,000 candidate products
├── Category filter: narrow to Audio > Headphones: ~8,000
└── Availability filter: in-stock only: ~6,000

Stage 3: Scoring (30ms)
├── Text relevance: BM25 + field boosting (title 3×, brand 2×, description 1×)
├── Behavioral signals: click-through rate, add-to-cart rate, conversion rate
├── Quality signals: review rating, review count, return rate
└── Freshness: recently listed products get mild boost

Stage 4: ML Reranking (15ms)
├── Neural model reranks top 200 candidates
├── Features: text relevance, behavioral, quality, personalization
├── Output: reranked top 200 with calibrated scores
└── Personalization: user's category affinity, brand preference, price sensitivity

Stage 5: Business Rules (5ms)
├── Inject sponsored results at positions 0, 3, 7
├── Boost Prime-eligible products for Prime members
├── Suppress low-quality sellers (order defect rate > 5%)
└── Apply diversity rules (no more than 3 results from same brand)

Stage 6: Response Assembly (10ms)
├── Fetch buy box winner per product (from cache)
├── Attach pricing, delivery estimates, Prime badges
├── Build facet counts (category, brand, price range, rating)
└── Return top 48 results (paginated)

Total: ~85ms average, <300ms at p99
```

### Faceted Search Optimization

Facets (filter counts like "Brand: Sony (42), Bose (38)") are expensive to compute over millions of documents. Optimization:

1. **Pre-aggregated facets**: For popular categories, facet counts are pre-computed hourly
2. **Approximate counts**: For long-tail queries, use probabilistic counting (HyperLogLog)
3. **Post-filter facets**: Apply user's filters, then compute remaining facet counts only for the filtered set

---

## 4. Flash Sale Inventory Contention (Prime Day)

### The Scale Problem

During Prime Day 2025, a single popular deal (e.g., 50% off a popular TV) might see:

```
Deal inventory:        10,000 units
Users watching:        5,000,000
Add-to-cart attempts:  500,000 in first 10 seconds = 50,000/sec
```

A single inventory counter would create a serialization bottleneck where all 50,000 requests/sec contend for one row.

### Solution: Pre-Sharded Inventory Counters

Before the deal goes live, the inventory is distributed across N shards:

```
Total deal inventory: 10,000 units
Shard count: 64

Shard 0:  156 units    (10,000 / 64 = 156.25, round down)
Shard 1:  156 units
...
Shard 63: 160 units    (absorb remainder)

Each shard is an independent atomic counter in a distributed cache.
```

User requests are routed to shards by `hash(user_id) % 64`, distributing contention across 64 independent counters. Each atomic decrement is O(1) with no cross-shard coordination.

### Shard Exhaustion and Stealing

When a shard runs out:

```
Shard 12 has 0 units remaining.
User routed to shard 12 → decrement fails.
System tries adjacent shards: 13, 14, 11, 10, ...
Shard 14 has 23 units → decrement succeeds.
```

### Deal Status Broadcasting

As inventory depletes, the system broadcasts progress:

```
100% remaining → "Deal of the Day"
50% remaining  → "50% claimed"
20% remaining  → "Almost gone! 80% claimed"
5% remaining   → "Only X left at this price"
0% remaining   → "Deal is sold out"
```

These percentages are computed by summing all shard counters every 2 seconds (eventual consistency is acceptable for display).

### Queue-Based Overflow

When demand vastly exceeds supply (10× or more), the system adds a virtual queue:

1. User clicks "Add to Cart" for a flash deal
2. If real-time inventory is available → immediate add
3. If uncertain (high contention) → user enters a queue: "You're in line! Estimated wait: 2 minutes"
4. Queue processes FIFO, granting inventory access tokens
5. Token holder has 15 minutes to complete checkout

This prevents the thundering herd from overwhelming the inventory service.

---

## 5. Order State Machine and Split Fulfillment

### Order Splitting

A single order with 3 items might ship from 2 warehouses:

```
Order ORD-12345:
├── Shipment SHP-001 (Warehouse: Dallas)
│   ├── Item 1: Wireless Headphones (1 unit)
│   └── Item 2: Phone Case (1 unit)
└── Shipment SHP-002 (Warehouse: Seattle)
    └── Item 3: Laptop Stand (1 unit)
```

Each shipment has an independent lifecycle (tracking number, carrier, delivery date). The order status is the aggregate:
- Order is "SHIPPED" only when ALL shipments are shipped
- Order is "DELIVERED" only when ALL shipments are delivered
- Order is "PARTIALLY_SHIPPED" when some shipments are shipped and others are still processing

### Fulfillment Router Decision Matrix

```
FUNCTION routeOrderToWarehouses(order):
    assignments = []

    FOR each item IN order.items:
        candidates = findWarehousesWithStock(item.product_id)

        FOR each warehouse IN candidates:
            warehouse.score = calculateScore(warehouse, order.shipping_address, item)
                -- proximity:        40% weight (delivery speed)
                -- stock depth:      20% weight (prefer warehouses with ample stock)
                -- shipping cost:    25% weight (carrier rates vary by origin-dest)
                -- warehouse load:   15% weight (spread load evenly)

        best_warehouse = candidates.maxBy(score)
        assignments.append({ item, warehouse: best_warehouse })

    -- Consolidation pass: if two items are assigned to nearby warehouses,
    -- consider moving one to reduce shipment count (saves shipping cost)
    assignments = consolidateShipments(assignments)

    RETURN assignments
```

### Partial Cancellation Complexity

When a customer cancels one item from a multi-item order:
1. If the item hasn't been picked yet → cancel that item, adjust payment
2. If the item is already shipped → initiate return flow instead
3. If the cancelled item was in a multi-item shipment → remaining items still ship; partial refund for cancelled item
4. Recalculate order totals: some promotions (e.g., "10% off orders over $100") may no longer apply

---

## 6. Marketplace: Buy Box and Seller Integration

### Buy Box Competition

The buy box is the "Add to Cart" button on a product page. When multiple sellers offer the same product, the buy box algorithm selects the default seller. This drives ~80% of all purchases.

### Buy Box Recomputation Triggers

The buy box is not static—it is recomputed when:

| Trigger | Latency | Method |
|---------|---------|--------|
| Seller changes price | < 1 minute | Event-driven recomputation |
| Seller goes out of stock | < 30 seconds | Immediate demotion |
| Seller performance metric changes | Hourly | Batch recomputation |
| Periodic refresh | Every 15 minutes | Background job |

### Seller Catalog Integration Challenge

When a seller lists a product, the system must determine: does this product already exist in the catalog, or is it new?

```
Seller submits: "Sony WH-1000XM5 Wireless Headphones, Black"

1. Title matching: fuzzy match against existing catalog → 85% confidence match
2. UPC/EAN matching: if seller provides barcode → 99.9% confidence match
3. Attribute matching: brand + model + color → 95% confidence match
4. Image matching: perceptual hash comparison → additional confirmation

Result:
- High confidence match → link seller's offer to existing product
- Low confidence → create new product listing (pending catalog team review)
- Duplicate detection → reject if seller already has an active offer for this product
```

### Counterfeit and Quality Control

```
Seller listing quality score:
├── Product data completeness     (title, description, images, attributes)
├── Image quality                 (resolution, white background, no watermarks)
├── Price reasonableness          (not 90% below market average → suspicious)
├── Seller history                (new sellers get enhanced scrutiny)
└── Customer complaint rate       (high return rate or "not as described" flags)

Action thresholds:
├── Score > 80%  → auto-approved listing
├── Score 50-80% → queued for manual review
├── Score < 50%  → auto-rejected with feedback to seller
```

---

## 7. Checkout Idempotency

### The Problem

Network timeouts during checkout can cause duplicate order placement:

```
User clicks "Place Order"
→ Request reaches server, order is created, payment captured
→ Response lost due to network timeout
→ User sees spinner, clicks "Place Order" again
→ Second request creates ANOTHER order and charges payment AGAIN
```

### Solution: Idempotency Key

Every checkout request includes a client-generated idempotency key:

```
POST /v1/checkout/{session_id}/place-order
Headers: { Idempotency-Key: "550e8400-e29b-41d4-a716-446655440000" }

Server behavior:
1. Check if idempotency key exists in orders table
2. IF EXISTS → return the existing order (no new processing)
3. IF NOT EXISTS → process order, store idempotency key with order_id
4. The idempotency key has a UNIQUE constraint in the database
```

This ensures that retries from timeouts, network errors, or user double-clicks are harmless.

### Payment Authorization vs. Capture

The checkout uses a two-phase payment flow:

```
Phase 1 (Authorization): "Can you charge this card $247.50?"
→ Payment gateway places a hold on the card
→ No money moves yet
→ Authorization valid for 7 days

Phase 2 (Capture): "Actually charge the $247.50"
→ Money moves from customer to platform
→ Happens after inventory is confirmed reserved
```

If inventory reservation fails after authorization, the authorization is voided (hold released). The customer is never charged for items that cannot be fulfilled.

---

## Key Bottleneck Summary

| Bottleneck | Impact | Solution |
|------------|--------|----------|
| Inventory row contention (hot SKU) | Serialized updates → latency spike | Optimistic locking + multi-warehouse fallback |
| Flash sale thundering herd | 50K+ req/sec on single counter | Pre-sharded atomic counters + virtual queue |
| Search at 58K QPS | Index query + ML ranking under 300ms | Multi-stage pipeline, pre-computed facets, result caching |
| Cart merge conflicts | Data loss or duplicate items on login | Vector clocks + max-quantity merge strategy |
| Order split complexity | Multiple shipments, partial cancel, promo recalc | Sub-order model with independent lifecycles |
| Checkout double-submit | Duplicate orders and charges | Idempotency key with unique DB constraint |
| Buy box staleness | Wrong seller displayed → unfair marketplace | Event-driven recomputation + 15-min periodic refresh |
| Catalog matching at ingestion | Duplicate products in catalog | Multi-signal matching (UPC, title, attributes, images) |
