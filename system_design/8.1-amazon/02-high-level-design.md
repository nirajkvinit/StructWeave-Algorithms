# High-Level Design

## Architecture Overview

The Amazon-scale e-commerce platform follows a **CQRS pattern** for the catalog (write-optimized catalog store + read-optimized search index), an **event-driven pattern** for order lifecycle, and a **cell-based deployment** model for blast-radius isolation. The architecture is shaped by three realities: (1) the catalog is massive (500M+ SKUs) and continuously updated by millions of sellers; (2) inventory is distributed across 200+ fulfillment centers; (3) traffic spikes 10-15× during flash sales.

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WEB[Web App]
        MOB[Mobile App]
        SELL[Seller Portal]
    end

    subgraph Gateway["API Layer"]
        GW[API Gateway]
        BFF[BFF Service]
    end

    subgraph Discovery["Discovery Services"]
        SRCH[Search Service]
        CAT[Catalog Service]
        REC[Recommendation<br/>Service]
        BROWSE[Browse &<br/>Category Service]
    end

    subgraph Commerce["Commerce Services"]
        CART[Cart Service]
        CHECKOUT[Checkout<br/>Orchestrator]
        PRICE[Pricing &<br/>Promotions Engine]
        INV[Inventory<br/>Service]
        PAY[Payment<br/>Service]
    end

    subgraph Marketplace["Marketplace Services"]
        BUYBOX[Buy Box<br/>Engine]
        SLRMGMT[Seller Management<br/>Service]
        LISTING[Listing<br/>Service]
    end

    subgraph Fulfillment["Fulfillment Services"]
        ORD[Order<br/>Service]
        FULFILL[Fulfillment<br/>Router]
        SHIP[Shipping &<br/>Tracking Service]
        RET[Returns<br/>Service]
    end

    subgraph Data["Data Layer"]
        CATDB[(Catalog DB<br/>Product Master)]
        SEARCHIDX[(Search Index<br/>500M Products)]
        CARTSTORE[(Cart Store<br/>Key-Value)]
        ORDERDB[(Order DB<br/>Orders · Payments)]
        INVDB[(Inventory DB<br/>SKU × Warehouse)]
        KAFKA[Event Bus<br/>Order · Inventory Events]
        CACHE[(Distributed Cache<br/>Product · Price · Session)]
        OBJ[(Object Storage<br/>Images · Invoices)]
        CDN[CDN<br/>Static Assets · Images]
    end

    WEB & MOB --> CDN
    WEB & MOB & SELL --> GW --> BFF

    BFF --> SRCH & CAT & CART & CHECKOUT & ORD & BROWSE
    SRCH --> SEARCHIDX & CACHE
    CAT --> CATDB & CACHE
    REC --> CACHE
    BROWSE --> SEARCHIDX

    CART --> CARTSTORE & PRICE
    CART --> INV

    CHECKOUT --> INV & PAY & ORD & PRICE
    INV --> INVDB & CACHE
    PAY --> ORDERDB

    CAT --> BUYBOX
    BUYBOX --> CACHE
    LISTING --> CATDB
    SLRMGMT --> CATDB

    ORD --> ORDERDB & KAFKA
    KAFKA --> FULFILL & SHIP & RET
    FULFILL --> INVDB
    SHIP --> KAFKA

    CAT --> OBJ
    OBJ --> CDN

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef marketplace fill:#fce4ec,stroke:#b71c1c,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class WEB,MOB,SELL client
    class GW,BFF gateway
    class SRCH,CAT,REC,BROWSE,CART,CHECKOUT,PRICE,INV,PAY,ORD,FULFILL,SHIP,RET service
    class BUYBOX,SLRMGMT,LISTING marketplace
    class CATDB,ORDERDB,INVDB,OBJ data
    class KAFKA queue
    class CACHE,SEARCHIDX,CARTSTORE,CDN cache
```

---

## Service Responsibilities

| Service | Responsibility | Key Characteristics |
|---------|---------------|---------------------|
| **Search Service** | Full-text search, autocomplete, faceted filtering, ML ranking, sponsored results | Stateless; reads from search index; high QPS (58K peak) |
| **Catalog Service** | Product CRUD, variation management, attribute normalization, image pipeline | Write-optimized; publishes change events to index |
| **Recommendation Service** | Collaborative filtering, "frequently bought together," personalized suggestions | ML model serving; precomputed + real-time signals |
| **Browse & Category Service** | Category tree navigation, filtered browse pages, best-seller lists | Cached category hierarchy; pre-aggregated rankings |
| **Cart Service** | Add/remove/update cart items, persist across sessions, guest-to-auth merge | Key-value store; high write rate; session-aware |
| **Checkout Orchestrator** | Coordinate inventory reservation → pricing → payment → order creation | Saga coordinator; idempotent; compensating transactions |
| **Pricing & Promotions Engine** | Calculate final price (base + promotions + coupons + shipping), validate deals | Stateless rule engine; high call rate from cart and search |
| **Inventory Service** | Track stock per SKU per warehouse, soft/hard reservation, restock events | Strongly consistent for reservations; sharded by SKU |
| **Payment Service** | Tokenized card processing, wallet, gift cards, refunds | PCI-DSS scoped; idempotent charge operations |
| **Buy Box Engine** | Determine which seller offer wins the default purchase button | ML model: price, fulfillment speed, seller score, stock reliability |
| **Seller Management** | Seller onboarding, verification, performance tracking, account management | Moderate write rate; compliance workflows |
| **Listing Service** | Seller product listing, bulk upload, catalog matching, variation mapping | High write rate from sellers; feeds into Catalog Service |
| **Order Service** | Order creation, status tracking, modification, cancellation | Event sourced; publishes to fulfillment pipeline |
| **Fulfillment Router** | Select optimal warehouse(s) per order based on proximity, stock, cost | Optimization algorithm; may split orders across warehouses |
| **Shipping & Tracking** | Carrier selection, label generation, real-time tracking updates | Integrates with carrier APIs; event-driven status updates |
| **Returns Service** | Return authorization, refund calculation, restocking workflow | Reverse logistics; feeds back into inventory |

---

## Data Flow 1: Browse-to-Buy Journey

```
Customer searches: "wireless noise cancelling headphones"

1. API Gateway → BFF → Search Service
2. Search Service queries search index:
   - Full-text match: "wireless" AND "noise cancelling" AND "headphones"
   - Faceted filters: category=Electronics>Audio>Headphones
   - ML ranking: relevance × conversion probability × personalization
   - Sponsored results: inject 2-3 sponsored products at positions 1, 4, 8
   - Result: 50 products with buy box winner per product
3. BFF enriches: add pricing (from cache), delivery estimates, Prime badges
4. Return search results page to customer

--- Customer clicks product ---

5. BFF → Catalog Service: getProduct(productId)
6. Catalog Service:
   - Product data from cache (95% hit rate) or Catalog DB
   - Buy Box Engine: determine winning seller offer
   - Pricing Engine: calculate final price with active promotions
   - Inventory Service: check availability + delivery estimate
   - Reviews: aggregate rating + top 5 reviews
7. Return product detail page

--- Customer adds to cart ---

8. BFF → Cart Service: addItem(userId, productId, sellerId, quantity)
9. Cart Service:
   - Inventory Service: verify availability (soft check, not reservation)
   - Pricing Engine: get current price (cart always shows real-time prices)
   - Write to cart store (key-value)
   - Return updated cart with price totals

--- Customer proceeds to checkout ---

10. BFF → Checkout Orchestrator: initiateCheckout(userId, cartId)
11. Checkout Orchestrator (saga):
    Step 1: Validate cart items (re-check prices and availability)
    Step 2: Calculate shipping options per item (Fulfillment Router)
    Step 3: Customer selects shipping + enters payment
    Step 4: Hard inventory reservation (Inventory Service)
    Step 5: Payment authorization (Payment Service)
    Step 6: Create order (Order Service)
    Step 7: Publish OrderPlaced event to Event Bus
12. If Step 4 fails (out of stock): notify customer, suggest alternatives
13. If Step 5 fails (payment declined): release inventory reservation, notify
14. On success: return order confirmation with estimated delivery dates

--- Post-order ---

15. Event Bus → Fulfillment Router: select warehouse(s), create shipment(s)
16. Event Bus → Shipping Service: generate labels, schedule carrier pickup
17. Event Bus → Notification Service: send order confirmation email
18. Warehouse picks, packs, ships → tracking updates flow back through Event Bus
```

---

## Data Flow 2: Checkout Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant BFF as BFF Service
    participant CO as Checkout Orchestrator
    participant Cart as Cart Service
    participant Price as Pricing Engine
    participant Inv as Inventory Service
    participant FR as Fulfillment Router
    participant Pay as Payment Service
    participant Ord as Order Service
    participant Bus as Event Bus

    User->>BFF: Proceed to checkout
    BFF->>CO: initiateCheckout(userId, cartId)
    CO->>Cart: getCartItems(cartId)
    Cart-->>CO: cart items (3 items, 2 sellers)

    CO->>Price: calculatePrices(items)
    Price-->>CO: verified prices + promotions

    CO->>Inv: checkAvailability(items)
    Inv-->>CO: all available

    CO->>FR: getShippingOptions(items, address)
    FR-->>CO: options per item (warehouse assignments)
    CO-->>BFF: shipping options
    BFF-->>User: Select shipping + enter payment

    User->>BFF: Confirm order (payment token)
    BFF->>CO: placeOrder(cartId, shippingChoice, paymentToken)

    CO->>Inv: reserveInventory(items)
    Inv-->>CO: reserved (hold 10 min)

    CO->>Pay: authorizePayment($247.50, token)
    Pay-->>CO: authorized (auth_ref PAY-789)

    CO->>Ord: createOrder(items, payment, shipping)
    Ord-->>CO: order_id ORD-12345

    CO->>Pay: capturePayment(PAY-789)
    Pay-->>CO: captured

    CO->>Inv: confirmReservation(items)
    CO->>Cart: clearCart(cartId)

    Ord->>Bus: OrderPlaced event
    CO-->>BFF: orderConfirmed(ORD-12345)
    BFF-->>User: Order confirmed! Delivery by Dec 18

    Bus-->>FR: Route to warehouse(s)
    Bus-->>User: Order confirmation email
```

---

## Order Lifecycle State Diagram

```mermaid
stateDiagram-v2
    [*] --> CART: Items in cart
    CART --> CHECKOUT: Proceed to checkout
    CHECKOUT --> PLACED: Payment captured
    CHECKOUT --> ABANDONED: Timeout / user leaves
    ABANDONED --> CART: Cart recovery email
    PLACED --> CONFIRMED: Inventory allocated to warehouse
    CONFIRMED --> PROCESSING: Warehouse begins picking
    PROCESSING --> PACKED: Items picked and packed
    PACKED --> SHIPPED: Handed to carrier
    SHIPPED --> OUT_FOR_DELIVERY: Last-mile delivery
    OUT_FOR_DELIVERY --> DELIVERED: Customer received
    DELIVERED --> RETURN_REQUESTED: Customer initiates return
    RETURN_REQUESTED --> RETURN_APPROVED: Return authorized
    RETURN_APPROVED --> RETURN_SHIPPED: Customer ships back
    RETURN_SHIPPED --> RETURN_RECEIVED: Warehouse receives
    RETURN_RECEIVED --> REFUNDED: Refund processed
    REFUNDED --> [*]: Complete

    PLACED --> CANCELLED: Customer cancels (before picking)
    CANCELLED --> REFUNDED: Payment reversed
    SHIPPED --> DELIVERY_FAILED: Address issue / not home
    DELIVERY_FAILED --> OUT_FOR_DELIVERY: Re-attempt delivery
    DELIVERY_FAILED --> RETURNED_TO_SENDER: Max attempts exceeded
```

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Catalog architecture** | CQRS — write to Catalog DB, async index to Search Index | 500M products with continuous seller updates; search index is read-optimized, catalog DB is write-optimized |
| **Cart storage** | Distributed key-value store with replication | High write rate (580/sec), low latency (<50ms), must survive node failures; relational DB is overkill |
| **Checkout pattern** | Saga with compensating transactions | Inventory reservation + payment + order creation spans multiple services; any step can fail |
| **Inventory reservation** | Two-phase: soft check at cart, hard reserve at checkout | Soft check prevents bad UX (adding OOS item); hard reserve prevents overselling |
| **Search ranking** | Inverted index + ML reranking | Inverted index for fast retrieval; ML model for relevance × conversion × personalization |
| **Buy box** | ML model with price, fulfillment, seller score | Single algorithm drives 80% of sales; must be fair, transparent, and resistant to gaming |
| **Event streaming** | Event bus for order lifecycle | Decouples order placement from fulfillment, shipping, notifications; enables async processing |
| **Cell-based deployment** | Independent cells per region/shard | Blast-radius isolation: failure in one cell does not cascade to others; critical for Prime Day |
| **Image delivery** | Object storage + CDN | 2 PB of images; CDN serves 95%+ of image requests; origin bandwidth would be prohibitive |
| **Fulfillment routing** | Optimization algorithm per order | Multi-factor: proximity (speed), stock (availability), cost (shipping), load (warehouse capacity) |

---

## Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Catalog DB** | Distributed document store | Flexible schema for 500M products with varying attributes per category |
| **Search Index** | Inverted index cluster | Full-text search + faceted filtering + real-time updates at 58K QPS |
| **Cart Store** | Distributed key-value store | Sub-ms reads/writes, high availability, auto-partitioning |
| **Order DB** | Relational DB (sharded) | ACID for orders and payments; strong consistency required |
| **Inventory DB** | Relational DB (sharded by SKU) | Strong consistency for reservation; optimistic locking for concurrent updates |
| **Event Bus** | Distributed log broker | Durable, ordered event streaming for order lifecycle; replay capability |
| **Cache** | Distributed in-memory cache | Product data, pricing, session data; sub-ms reads, 95%+ hit rate |
| **Object Storage** | Cloud object storage | Product images, invoices; 2 PB+, cost-effective |
| **CDN** | Global CDN | Static assets, product images; reduces origin load by 95% |
| **API Gateway** | Rate limiting, auth, routing | Protect backend from abuse; support 230K+ req/sec peak |
