# Low-Level Design

## Data Models

### Product (Catalog DB)

```
Product {
    product_id:         UUID                -- primary key
    title:              string              -- "Sony WH-1000XM5 Wireless Headphones"
    slug:               string              -- "sony-wh-1000xm5-wireless-headphones"
    brand_id:           UUID                -- FK to Brand
    category_id:        UUID                -- FK to leaf category (e.g., "Over-Ear Headphones")
    category_path:      string[]            -- ["Electronics", "Audio", "Headphones", "Over-Ear"]
    description:        text                -- rich HTML description
    bullet_points:      string[]            -- key features list (max 5)
    attributes:         map<string, string> -- {"color": "Black", "connectivity": "Bluetooth 5.2"}
    variation_group_id: UUID                -- groups variations (e.g., all colors of same model)
    variation_dims:     map<string, string> -- {"color": "Black", "size": null}
    images:             ImageRef[]          -- [{url, alt_text, position, is_primary}]
    status:             enum                -- ACTIVE, INACTIVE, SUPPRESSED, UNDER_REVIEW
    created_at:         timestamp
    updated_at:         timestamp
}

-- Index: (category_id, status), (brand_id), (variation_group_id)
```

### Seller Offer (Links Seller to Product)

```
SellerOffer {
    offer_id:           UUID                -- primary key
    product_id:         UUID                -- FK to Product
    seller_id:          UUID                -- FK to Seller
    price:              decimal             -- current price (seller-set)
    list_price:         decimal             -- MSRP for strikethrough display
    currency:           string              -- "USD"
    condition:          enum                -- NEW, REFURBISHED, USED_LIKE_NEW, USED_GOOD
    fulfillment_type:   enum                -- PLATFORM_FULFILLED, SELLER_FULFILLED
    shipping_template:  UUID                -- seller's shipping rate card
    handling_time_days: int                 -- days before seller ships (seller-fulfilled)
    quantity_available: int                 -- seller's total stock
    is_buy_box_winner:  boolean             -- current buy box status (cached, recomputed)
    buy_box_score:      float               -- last computed buy box score
    status:             enum                -- ACTIVE, OUT_OF_STOCK, SUPPRESSED
    created_at:         timestamp
    updated_at:         timestamp
}

-- Index: (product_id, status), (seller_id), (product_id, is_buy_box_winner)
-- Unique: (product_id, seller_id, condition)
```

### Seller

```
Seller {
    seller_id:          UUID
    business_name:      string
    display_name:       string
    email:              string
    verification_status: enum               -- PENDING, VERIFIED, SUSPENDED
    performance_score:  float               -- 0-100, composite metric
    order_defect_rate:  float               -- % of orders with issues
    late_shipment_rate: float               -- % shipped late
    cancellation_rate:  float               -- % seller-cancelled
    fulfillment_type:   enum                -- PLATFORM_FULFILLED, SELLER_FULFILLED, BOTH
    tax_info:           encrypted_blob      -- tax ID, business registration
    bank_account:       encrypted_blob      -- payout account
    created_at:         timestamp
}
```

### Shopping Cart

```
Cart {
    cart_id:            UUID                -- primary key
    user_id:            UUID                -- null for guest carts
    session_id:         string              -- for guest identification
    items:              CartItem[]
    coupon_codes:       string[]            -- applied coupons
    updated_at:         timestamp
    expires_at:         timestamp           -- guest carts expire after 30 days
}

CartItem {
    item_id:            UUID
    product_id:         UUID
    offer_id:           UUID                -- specific seller offer
    quantity:           int
    price_at_add:       decimal             -- price when added (for change detection)
    current_price:      decimal             -- recalculated on cart view
    saved_for_later:    boolean
    added_at:           timestamp
}
```

### Order

```
Order {
    order_id:           UUID                -- primary key (also display ID: "ORD-XXX-XXXXXXX")
    user_id:            UUID
    status:             enum                -- PLACED, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, RETURNED
    items:              OrderItem[]
    shipping_address:   Address
    billing_address:    Address
    payment_method_id:  UUID                -- tokenized reference
    payment_status:     enum                -- AUTHORIZED, CAPTURED, REFUNDED, PARTIALLY_REFUNDED
    subtotal:           decimal
    shipping_cost:      decimal
    tax:                decimal
    discount:           decimal
    total:              decimal
    currency:           string
    placed_at:          timestamp
    estimated_delivery: timestamp
    idempotency_key:    string              -- prevents duplicate order placement
    version:            int                 -- optimistic locking
}

OrderItem {
    order_item_id:      UUID
    order_id:           UUID
    product_id:         UUID
    seller_id:          UUID
    offer_id:           UUID
    quantity:           int
    unit_price:         decimal
    total_price:        decimal
    status:             enum                -- CONFIRMED, PICKING, PACKED, SHIPPED, DELIVERED, RETURNED
    shipment_id:        UUID                -- FK to Shipment (may differ per item)
    warehouse_id:       UUID                -- assigned fulfillment center
    tracking_number:    string
}

-- Index: (user_id, placed_at DESC), (status), (idempotency_key UNIQUE)
```

### Inventory

```
Inventory {
    sku_warehouse_id:   UUID                -- primary key
    product_id:         UUID
    warehouse_id:       UUID
    total_quantity:     int                 -- physical stock on hand
    reserved_quantity:  int                 -- hard-reserved for confirmed orders
    available_quantity: int                 -- computed: total - reserved
    reorder_point:      int                 -- trigger restock when available <= this
    version:            int                 -- optimistic locking for concurrent updates
    updated_at:         timestamp
}

InventoryReservation {
    reservation_id:     UUID
    product_id:         UUID
    warehouse_id:       UUID
    order_id:           UUID
    quantity:           int
    status:             enum                -- PENDING, CONFIRMED, RELEASED, EXPIRED
    expires_at:         timestamp           -- auto-release if not confirmed within 10 min
    created_at:         timestamp
}

-- Index: (product_id, warehouse_id) UNIQUE on Inventory
-- Index: (order_id), (status, expires_at) on InventoryReservation
```

### Review

```
Review {
    review_id:          UUID
    product_id:         UUID
    user_id:            UUID
    order_id:           UUID                -- null if not verified purchase
    rating:             int                 -- 1-5
    title:              string
    body:               text
    images:             string[]            -- image URLs
    is_verified:        boolean             -- purchased this product
    helpful_votes:      int
    status:             enum                -- PENDING, PUBLISHED, REJECTED, FLAGGED
    created_at:         timestamp
}

ProductRatingAggregate {
    product_id:         UUID
    average_rating:     float               -- pre-computed, weighted
    total_reviews:      int
    rating_histogram:   map<int, int>       -- {5: 1200, 4: 800, 3: 300, 2: 100, 1: 50}
    updated_at:         timestamp
}
```

---

## API Design

### Product Discovery

```
GET /v1/search?q={query}&category={id}&brand={id}&price_min={n}&price_max={n}
    &rating={n}&prime_only={bool}&sort={relevance|price_asc|price_desc|rating|newest}
    &page={n}&page_size={20}
Response: {
    results: [{ product_id, title, image_url, price, list_price, rating,
                review_count, prime_eligible, delivery_estimate, seller_name }],
    facets: { categories: [...], brands: [...], price_ranges: [...], ratings: [...] },
    total_results: int,
    sponsored: [{ product_id, ... , ad_id }],
    page_info: { page, page_size, total_pages }
}

GET /v1/products/{product_id}
Response: {
    product: { id, title, description, bullet_points, images, attributes,
               category_path, variations },
    buy_box: { offer_id, seller_id, seller_name, price, fulfillment_type,
               delivery_estimate, prime_eligible },
    other_offers: [{ offer_id, seller_id, price, condition, delivery_estimate }],
    rating: { average, total_reviews, histogram },
    top_reviews: [{ review_id, rating, title, body, author, date, helpful_votes }]
}

GET /v1/products/{product_id}/variations
Response: {
    variation_group_id: UUID,
    dimensions: ["color", "size"],
    variations: [{ product_id, attributes: {"color": "Black", "size": "One Size"},
                   price, image_url, availability }]
}
```

### Shopping Cart

```
GET /v1/cart
Response: {
    cart_id, items: [{ item_id, product_id, title, image_url, quantity,
                       price, price_changed: bool, available: bool,
                       delivery_estimate, seller_name }],
    subtotal, item_count, savings
}

POST /v1/cart/items
Body: { product_id, offer_id, quantity }
Response: { cart_id, item_id, cart_summary: { item_count, subtotal } }

PUT /v1/cart/items/{item_id}
Body: { quantity }

DELETE /v1/cart/items/{item_id}

POST /v1/cart/merge
-- Called after guest login; merges guest cart into authenticated cart
Body: { guest_session_id }
Response: { merged_items: int, conflicts: [{ product_id, guest_qty, auth_qty, resolved_qty }] }

POST /v1/cart/items/{item_id}/save-for-later
POST /v1/cart/items/{item_id}/move-to-cart
```

### Checkout

```
POST /v1/checkout/initiate
Body: { cart_id }
Response: {
    checkout_session_id,
    items: [{ product_id, quantity, price, availability_confirmed: bool }],
    shipping_options: [{ method, cost, estimated_delivery, carrier }],
    price_changes: [{ product_id, old_price, new_price }],  -- if any prices changed since cart
    unavailable_items: [{ product_id, reason }]
}

PUT /v1/checkout/{session_id}/shipping
Body: { address_id, shipping_selections: [{ item_id, shipping_method }] }

PUT /v1/checkout/{session_id}/payment
Body: { payment_method_id }

POST /v1/checkout/{session_id}/place-order
Headers: { Idempotency-Key: "uuid" }
Body: { final_confirmation: true }
Response: {
    order_id, status: "PLACED",
    items: [{ product_id, quantity, price }],
    total, estimated_delivery,
    payment_status: "CAPTURED"
}
```

### Orders

```
GET /v1/orders?status={filter}&page={n}
Response: { orders: [{ order_id, placed_at, status, total, item_count, items_summary }] }

GET /v1/orders/{order_id}
Response: {
    order: { order_id, status, items, shipping_address, payment_summary,
             subtotal, tax, shipping, discount, total },
    shipments: [{ shipment_id, items, tracking_number, carrier, status,
                  shipped_at, estimated_delivery }],
    timeline: [{ event, timestamp, description }]
}

POST /v1/orders/{order_id}/cancel
Body: { reason, item_ids: [] }  -- empty = cancel entire order

POST /v1/orders/{order_id}/return
Body: { items: [{ order_item_id, quantity, reason }] }
Response: { return_id, return_label_url, refund_estimate }
```

### Seller / Marketplace

```
POST /v1/sellers/listings
Body: { product_id, price, condition, quantity, fulfillment_type, handling_time }

PUT /v1/sellers/listings/{offer_id}
Body: { price?, quantity?, status? }

GET /v1/sellers/dashboard
Response: { total_orders, revenue, performance_metrics, buy_box_win_rate, alerts }

POST /v1/sellers/listings/bulk
Body: { listings: [{ ... }] }  -- up to 10,000 per batch
```

---

## Core Algorithms (Pseudocode)

### Search Ranking Algorithm

```
FUNCTION rankSearchResults(query, products, user_context):
    scored_results = []

    FOR each product IN products:
        -- Stage 1: Text relevance (BM25 + semantic similarity)
        text_score = BM25(query, product.title, product.description, product.attributes)
        semantic_score = cosineSimilarity(embed(query), product.embedding)
        relevance = 0.6 * text_score + 0.4 * semantic_score

        -- Stage 2: Business signals
        conversion_score = product.historical_conversion_rate
        review_score = normalize(product.avg_rating * log(product.review_count + 1))
        freshness_score = IF product.is_new THEN 1.1 ELSE 1.0

        -- Stage 3: Personalization
        user_affinity = getUserCategoryAffinity(user_context, product.category)
        brand_preference = getUserBrandPreference(user_context, product.brand)
        personalization = 0.5 * user_affinity + 0.5 * brand_preference

        -- Stage 4: Availability and fulfillment
        availability_boost = IF product.in_stock THEN 1.0 ELSE 0.3
        prime_boost = IF product.prime_eligible AND user_context.is_prime THEN 1.15 ELSE 1.0

        -- Combined score
        final_score = relevance * 0.40
                    + conversion_score * 0.25
                    + review_score * 0.15
                    + personalization * 0.10
                    + freshness_score * 0.05
                    + availability_boost * prime_boost * 0.05

        scored_results.append({product, final_score})

    -- Sort by score descending
    scored_results.sortBy(final_score, DESC)

    -- Inject sponsored results at predefined positions
    scored_results = injectSponsoredResults(scored_results, query, positions=[0, 3, 7])

    RETURN scored_results
```

### Inventory Reservation Algorithm

```
FUNCTION reserveInventory(order_items, order_id):
    reservations = []
    failed_items = []

    FOR each item IN order_items:
        -- Select best warehouse for this item
        warehouse = selectWarehouse(item.product_id, item.shipping_address)
        IF warehouse IS NULL:
            failed_items.append(item)
            CONTINUE

        -- Attempt atomic reservation with optimistic locking
        success = FALSE
        retries = 3

        WHILE retries > 0 AND NOT success:
            inventory = getInventory(item.product_id, warehouse.id)

            IF inventory.available_quantity >= item.quantity:
                -- Optimistic lock: update only if version matches
                rows_updated = UPDATE Inventory
                    SET reserved_quantity = reserved_quantity + item.quantity,
                        version = version + 1
                    WHERE product_id = item.product_id
                      AND warehouse_id = warehouse.id
                      AND version = inventory.version
                      AND (total_quantity - reserved_quantity) >= item.quantity

                IF rows_updated == 1:
                    reservation = CREATE InventoryReservation {
                        product_id: item.product_id,
                        warehouse_id: warehouse.id,
                        order_id: order_id,
                        quantity: item.quantity,
                        status: PENDING,
                        expires_at: now() + 10 MINUTES
                    }
                    reservations.append(reservation)
                    success = TRUE
                ELSE:
                    retries = retries - 1  -- version conflict, retry
            ELSE:
                -- Try next closest warehouse
                warehouse = selectNextWarehouse(item.product_id, item.shipping_address, exclude=[warehouse.id])
                IF warehouse IS NULL:
                    failed_items.append(item)
                    BREAK

        IF NOT success AND item NOT IN failed_items:
            failed_items.append(item)

    -- If any item failed, release all reservations (compensating action)
    IF failed_items.length > 0:
        FOR each res IN reservations:
            releaseReservation(res.reservation_id)
        RETURN { success: FALSE, failed_items }

    RETURN { success: TRUE, reservations }


FUNCTION selectWarehouse(product_id, shipping_address):
    -- Find all warehouses with stock
    candidates = SELECT warehouse_id, available_quantity,
                        distance(warehouse.location, shipping_address) AS dist
                 FROM Inventory
                 WHERE product_id = product_id
                   AND (total_quantity - reserved_quantity) > 0
                 ORDER BY dist ASC

    -- Score by: proximity (60%), stock depth (20%), warehouse load (20%)
    FOR each wh IN candidates:
        wh.score = 0.60 * (1 / (1 + wh.dist))
                 + 0.20 * normalize(wh.available_quantity)
                 + 0.20 * (1 - wh.current_load_percent)

    RETURN candidates.maxBy(score)
```

### Cart Merge Algorithm (Guest → Authenticated)

```
FUNCTION mergeCarts(guest_cart, auth_cart):
    merged_items = []
    conflicts = []

    -- Index authenticated cart by product+offer
    auth_index = {}
    FOR each item IN auth_cart.items:
        key = item.product_id + ":" + item.offer_id
        auth_index[key] = item

    -- Process guest cart items
    FOR each guest_item IN guest_cart.items:
        key = guest_item.product_id + ":" + guest_item.offer_id

        IF key IN auth_index:
            auth_item = auth_index[key]
            -- Same product exists in both carts: take max quantity
            resolved_qty = MAX(guest_item.quantity, auth_item.quantity)
            auth_item.quantity = resolved_qty
            conflicts.append({
                product_id: guest_item.product_id,
                guest_qty: guest_item.quantity,
                auth_qty: auth_item.quantity,
                resolved_qty: resolved_qty
            })
        ELSE:
            -- Guest item not in auth cart: add it
            merged_items.append(guest_item)

    -- Add merged guest items to auth cart
    FOR each item IN merged_items:
        auth_cart.items.append(item)

    -- Recalculate prices for all items (prices may have changed)
    FOR each item IN auth_cart.items:
        item.current_price = PricingEngine.getCurrentPrice(item.product_id, item.offer_id)
        item.available = InventoryService.checkAvailability(item.product_id)

    -- Delete guest cart
    DELETE guest_cart

    RETURN { merged_cart: auth_cart, conflicts }
```

### Buy Box Algorithm

```
FUNCTION computeBuyBox(product_id):
    offers = getActiveOffers(product_id)
    IF offers.length == 0:
        RETURN NULL  -- no buy box (product unavailable)

    IF offers.length == 1:
        RETURN offers[0]  -- single seller, auto-wins

    scored_offers = []
    FOR each offer IN offers:
        seller = getSeller(offer.seller_id)

        -- Price competitiveness (landed price = item price + shipping)
        landed_price = offer.price + calculateShipping(offer)
        min_landed = MIN(offers.map(o => o.price + calculateShipping(o)))
        price_score = min_landed / landed_price  -- 1.0 = cheapest, <1.0 = more expensive

        -- Fulfillment quality
        fulfillment_score = CASE offer.fulfillment_type:
            PLATFORM_FULFILLED: 1.0    -- fastest, most reliable
            SELLER_FULFILLED:   0.7    -- seller ships directly

        -- Seller performance
        seller_score = (1 - seller.order_defect_rate) * 0.4
                     + (1 - seller.late_shipment_rate) * 0.3
                     + (1 - seller.cancellation_rate) * 0.3

        -- Stock reliability (how often this seller is in stock)
        stock_score = offer.in_stock_rate_30d

        -- Delivery speed
        speed_score = 1.0 / (1 + offer.estimated_delivery_days)

        -- Weighted final score
        final_score = price_score * 0.35
                    + fulfillment_score * 0.25
                    + seller_score * 0.20
                    + stock_score * 0.10
                    + speed_score * 0.10

        scored_offers.append({ offer, final_score })

    winner = scored_offers.maxBy(final_score)

    -- Update buy box status
    UPDATE SellerOffer SET is_buy_box_winner = FALSE WHERE product_id = product_id
    UPDATE SellerOffer SET is_buy_box_winner = TRUE WHERE offer_id = winner.offer.offer_id

    -- Cache result (recompute every 15 minutes or on price change)
    cache.set("buybox:" + product_id, winner.offer.offer_id, TTL=15min)

    RETURN winner.offer
```

### Flash Sale Inventory Claim

```
FUNCTION claimFlashSaleDeal(deal_id, user_id, quantity):
    deal = getDeal(deal_id)

    -- Pre-check: is deal active and user eligible?
    IF deal.status != ACTIVE OR now() < deal.start_time OR now() > deal.end_time:
        RETURN { success: FALSE, reason: "DEAL_INACTIVE" }

    IF hasUserAlreadyClaimed(deal_id, user_id):
        RETURN { success: FALSE, reason: "ALREADY_CLAIMED" }

    IF quantity > deal.max_per_customer:
        RETURN { success: FALSE, reason: "EXCEEDS_LIMIT" }

    -- Atomic decrement using pre-sharded counter
    -- Deal inventory is partitioned into N shards (e.g., 64)
    shard_id = hash(user_id) MOD deal.shard_count

    remaining = ATOMIC_DECREMENT(
        key: "deal:" + deal_id + ":shard:" + shard_id,
        amount: quantity,
        min_value: 0
    )

    IF remaining < 0:
        -- This shard exhausted, try stealing from other shards
        FOR other_shard IN range(deal.shard_count):
            IF other_shard == shard_id: CONTINUE
            remaining = ATOMIC_DECREMENT(
                key: "deal:" + deal_id + ":shard:" + other_shard,
                amount: quantity,
                min_value: 0
            )
            IF remaining >= 0:
                BREAK

    IF remaining < 0:
        -- All shards exhausted
        markDealSoldOut(deal_id)
        RETURN { success: FALSE, reason: "SOLD_OUT" }

    -- Claim successful: create reservation with short TTL
    reservation = CREATE DealReservation {
        deal_id: deal_id,
        user_id: user_id,
        quantity: quantity,
        expires_at: now() + 15 MINUTES,
        status: RESERVED
    }

    -- Add to user's cart with deal pricing
    addToCart(user_id, deal.product_id, deal.deal_price, reservation.id)

    RETURN { success: TRUE, reservation_id: reservation.id, expires_at: reservation.expires_at }
```
