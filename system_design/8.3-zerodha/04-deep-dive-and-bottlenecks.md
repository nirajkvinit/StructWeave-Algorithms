# Deep Dive & Bottlenecks

## Deep Dive 1: Exchange Order Matching Engine Internals

### How the Exchange Matching Engine Works

The exchange (NSE/BSE) operates the matching engine—not the broker. Understanding how it works is critical because the broker's order routing strategy must be optimized for how the exchange processes orders.

### Order Book Data Structure

```
The order book maintains two sides:

BUY side (bids):   Sorted by price DESCENDING, then by time ASCENDING
SELL side (asks):   Sorted by price ASCENDING, then by time ASCENDING

Data Structure: Balanced binary tree (red-black tree) of price levels
Each price level: Doubly-linked list of orders at that price (FIFO queue)

BUY Side (Bids)                    SELL Side (Asks)
Price    | Orders (FIFO)           Price    | Orders (FIFO)
₹2,452   | [100@T1, 50@T2]        ₹2,453   | [200@T3, 75@T4]
₹2,451   | [300@T5]               ₹2,454   | [150@T6, 100@T7, 50@T8]
₹2,450   | [500@T9, 200@T10]      ₹2,455   | [400@T11]
  ↓ more price levels                ↓ more price levels
```

### Price-Time Priority (FIFO) Matching Algorithm

```
FUNCTION matchOrder(incoming_order):
    IF incoming_order.side == BUY:
        opposite_book = ask_book  -- Match against sell side
        WHILE incoming_order.remaining_qty > 0
              AND opposite_book IS NOT EMPTY:
            best_ask = opposite_book.getMin()  -- Lowest ask price

            -- For limit order: only match if price is acceptable
            IF incoming_order.type == LIMIT AND incoming_order.price < best_ask.price:
                BREAK  -- No match possible; add to bid book

            -- For market order: always match at best available
            price_level = opposite_book.getPriceLevel(best_ask.price)

            FOR each resting_order IN price_level (FIFO order):
                fill_qty = MIN(incoming_order.remaining_qty, resting_order.remaining_qty)
                fill_price = resting_order.price  -- Resting order's price

                -- Generate trade
                createTrade(incoming_order, resting_order, fill_qty, fill_price)

                incoming_order.remaining_qty -= fill_qty
                resting_order.remaining_qty -= fill_qty

                IF resting_order.remaining_qty == 0:
                    price_level.remove(resting_order)

                IF incoming_order.remaining_qty == 0:
                    BREAK

            IF price_level IS EMPTY:
                opposite_book.removePriceLevel(best_ask.price)

        -- If remaining quantity, add to order book
        IF incoming_order.remaining_qty > 0 AND incoming_order.type == LIMIT:
            bid_book.addOrder(incoming_order)
        -- Market order remainder: cancelled (no resting market orders)

Performance:
    - Add order: O(log M) where M = number of price levels
    - Cancel order: O(1) with order ID → node pointer map
    - Match at best price: O(1) amortized
    - Total throughput: millions of orders/second (NSE handles 100K+ orders/sec)
```

### Why This Matters for Broker Architecture

The broker does **not** run a matching engine. The broker's role is:
1. **Accept** orders from users
2. **Validate** (risk checks)
3. **Route** to the exchange via FIX protocol as fast as possible
4. **Process** execution reports from the exchange
5. **Update** positions and notify users

The faster the broker routes, the better the fill—especially for market orders, where every microsecond of delay means a potentially worse price.

---

## Deep Dive 2: Market Data Fan-Out at Scale

### The Problem

The exchange produces ~2M ticks/second across all instruments. The broker must deliver relevant ticks to 500K+ concurrent WebSocket connections, each subscribed to 20-50 instruments. Naive fan-out would require 75M+ message deliveries per second.

### Architecture: Three-Tier Fan-Out

```
Tier 1: Exchange Colo (Feed Handler)
    - Receives binary multicast feed from exchange
    - Runs in exchange co-location facility
    - Parses binary frames: instrument_token(4B) + fields
    - Filters: only instruments with active subscribers
    - Compresses: delta encoding (send only changed fields)
    - Transmits to broker data center via dedicated leased line
    - Latency: < 100μs

Tier 2: Broker Data Center (Market Data Service)
    - Receives compressed stream from colo
    - Decompresses and normalizes
    - Maintains in-memory latest-quote cache (hash map: token → quote)
    - Fans out to internal consumers:
        a. Ticker servers (for WebSocket streaming)
        b. Candle aggregator (for OHLCV)
        c. GTT trigger scanner
        d. Risk engine (for LTP-dependent margin)
    - Latency: < 500μs

Tier 3: Ticker Servers (WebSocket Fan-Out)
    - Each ticker server handles ~50K concurrent connections
    - 10 ticker servers for 500K connections
    - Subscription routing: hash map of instrument_token → [connection_ids]
    - Batching: accumulate updates in 100ms windows
    - Serialization: binary frames (not JSON)
    - Per-connection: only send instruments the user has subscribed to
    - Latency: < 2ms
```

### Optimization: Subscription-Based Filtering

```
Problem: 5,000 instruments × 500K connections = impossible to broadcast all

Solution: Subscription routing table

SubscriptionTable:
    instrument_token → Set<connection_id>

    RELIANCE (token 256265):  {conn_1, conn_4, conn_7, ..., conn_180000}
    INFY (token 408065):      {conn_2, conn_3, conn_5, ..., conn_95000}
    NIFTY50 (token 260105):   {conn_1, conn_2, conn_3, ..., conn_450000}  -- Very popular

On tick arrival for instrument X:
    connections = SubscriptionTable.get(X.instrument_token)
    FOR each batch of connections (batch_size = 1000):
        serialize tick data as binary frame
        batch_send(connections_batch, binary_frame)

Hot instruments (NIFTY50, BANKNIFTY): precompute binary frame once, multicast
Cold instruments: serialize on demand
```

### Bandwidth Optimization

```
JSON quote (full):    ~500 bytes per instrument
Binary frame (full):  ~184 bytes per instrument  (63% reduction)
Binary frame (LTP):   ~8 bytes per instrument    (98% reduction)

Mode-based streaming saves 60-90% bandwidth:
    - "ltp" mode: traders on watchlist (just need price)
    - "quote" mode: active traders (need OHLCV + depth)
    - "full" mode: algo traders (need full 5-level depth)

With batching (100ms window):
    Instead of 30 individual messages → 1 batched message per connection
    Reduces syscalls by 30× and TCP overhead significantly
```

---

## Deep Dive 3: Market Open Thundering Herd (9:15 AM Problem)

### The Problem

Indian equity markets open at 9:15 AM IST. In the first 60 seconds:
- Millions of After-Market Orders (AMO) queued overnight must be validated and sent
- Users rush to place orders based on pre-market analysis
- WebSocket connections spike as apps auto-connect
- Market data starts flowing after 6-hour gap

This creates a **predictable but extreme** 10-15× traffic spike.

### Quantifying the Spike

```
Normal mid-day:         ~500 orders/sec
Market open (first 60s): ~50,000 orders/sec  (100× spike)
Market open (first 5m):  ~10,000 orders/sec  (20× sustained)

WebSocket connections:
    Pre-market:          ~50K (checking pre-market data)
    9:14 AM:             ~200K (apps start connecting)
    9:15 AM:             ~450K (spike within 60 seconds)
    9:16 AM:             ~500K (steady state)

Market data:
    Pre-market:          Limited (auction data only)
    9:15:00 AM:          Full flood: 2M+ ticks/sec instantly
```

### Solution: Staged Warm-Up Architecture

```
Phase 1: Pre-Provision (T-60 minutes, 8:15 AM)
    - Scale all services to peak capacity
    - Auto-scaling is TOO SLOW for a 60-second spike
    - Pre-warm connection pools, thread pools, GC
    - Load instrument master data into caches
    - Pre-compute SPAN margins for all instruments

Phase 2: AMO Queue Processing (T-15 minutes, 9:00 AM)
    - Begin validating AMO orders against risk rules
    - Reject invalid orders early (notify users)
    - Sort valid AMOs by priority (time-of-submission)
    - Pre-block margin for valid AMOs
    - Ready the FIX message queue

Phase 3: Controlled Release (T=0, 9:15 AM)
    - AMO orders released to exchange in batches
        - Not all at once—exchange has per-broker rate limits
        - Batch size: 1,000 orders per 100ms
        - Priority: earlier submissions first
    - New orders from users processed in parallel
    - Backpressure: if order queue depth > threshold,
      return "order queued" acknowledgment with position in queue
    - User sees: "Your order is #4,521 in queue, estimated 3 seconds"

Phase 4: Steady State (T+5 minutes, 9:20 AM)
    - Order rate drops to 2,000-3,000/sec
    - All queued orders processed
    - Normal operation resumes
```

### WebSocket Connection Storm

```
Problem: 400K WebSocket connections in 60 seconds = 6,667 new connections/sec

Solutions:
1. Staggered reconnection: mobile apps add random 0-30s jitter to reconnect
2. Connection rate limiting: max 10K new connections/sec per ticker server
3. Pre-authenticated sessions: validate auth tokens during pre-market
4. Connection pooling: API users reuse persistent connections

Failure mode: if ticker server rejects connection (overloaded),
    client retries with exponential backoff (1s, 2s, 4s, 8s max)
```

---

## Deep Dive 4: Order Book Depth and Level 3 Data

### What is Market Depth?

Market depth shows the full order book: all bid and ask quantities at each price level.

```
Level 1 (Best Bid/Ask):    Top 1 price level each side
Level 2 (5-deep):          Top 5 price levels each side (standard)
Level 3 (20-deep):         Top 20 price levels each side (premium)

Example: RELIANCE order book (Level 3 - 20 deep)

BID (Buy Orders)                    ASK (Sell Orders)
Price    | Qty    | Orders         Price    | Qty    | Orders
₹2,452.00| 12,450 | 234           ₹2,452.05| 8,300  | 178
₹2,451.95| 8,200  | 156           ₹2,452.10| 15,600 | 289
₹2,451.90| 22,100 | 412           ₹2,452.15| 5,200  | 95
₹2,451.85| 6,800  | 89            ₹2,452.20| 18,900 | 345
₹2,451.80| 31,500 | 567           ₹2,452.25| 9,400  | 201
  ... 15 more levels                 ... 15 more levels
```

### Data Size per Update

```
Level 2 (5-deep): 5 × (price + qty + orders) × 2 sides
    = 5 × (4B + 4B + 4B) × 2 = 120 bytes per update

Level 3 (20-deep): 20 × (price + qty + orders) × 2 sides
    = 20 × (4B + 4B + 4B) × 2 = 480 bytes per update

With 5,000 instruments updating 50-300 times/sec:
    Level 3 bandwidth = 5,000 × 100 × 480B = 240 MB/s (raw, before fan-out)
```

### Challenge: Incremental vs. Full Snapshot

```
Strategy: Send full snapshot on subscribe, then incremental deltas

Full snapshot: 480 bytes (sent once on subscription)
Delta update: ~24 bytes (changed price level + side + new qty + new orders)

Bandwidth savings: 95% reduction after initial snapshot

Edge case: if client misses a delta (WebSocket reconnect),
    server must detect sequence gap and resend full snapshot
    Sequence number per instrument per connection tracks this
```

---

## Deep Dive 5: T+1 Settlement Cycle

### Settlement Flow

```
Day T (Trade Day):
    09:15 - 15:30: Trades execute on exchange
    15:30: Market closes
    15:30 - 16:00: Exchange publishes final trade file
    16:00 - 17:00: Broker reconciles trades against exchange file

Day T+1 (Settlement Day):
    06:00: Clearing corporation (NSCCL/ICCL) computes net obligations
           - Per broker: net securities to deliver, net funds to pay/receive
    09:00: Broker delivers securities (from client demat accounts)
    10:00: Clearing corporation confirms settlement
    11:00: Funds credited/debited to broker's settlement account
    By EOD: Broker credits client accounts

Reconciliation:
    Broker's trade log must EXACTLY match exchange's trade file
    Any discrepancy: investigate immediately (possible missed fill, wrong qty)
    Zero-tolerance: 100% reconciliation accuracy required
```

### Obligations Netting

```
Example: Broker's net obligation for RELIANCE on Day T

Client A: BUY 100 shares
Client B: BUY 200 shares
Client C: SELL 150 shares

Internal netting (same broker):
    Net buy: 300 - 150 = 150 shares to receive from clearing corp
    Internal: Client C's 150 shares delivered to Client A (100) + Client B (50)

Clearing corp obligation:
    Broker owes: funds for 150 shares (net buy)
    Broker receives: 150 RELIANCE shares

This netting reduces settlement volume significantly
```

---

## Deep Dive 6: Pre-Trade Risk Engine Performance

### Why Sub-100μs Matters

```
Order path latency budget (user API to exchange):
    API Gateway + auth:           5ms
    OMS processing:               2ms
    Risk check:                   0.1ms (100μs budget)
    FIX serialization + send:     0.5ms
    Network to colo:              0.5ms (leased line)
    Exchange FIX gateway:         0.1ms
    ─────────────────────────────────
    Total:                        ~8.2ms

If risk check took 1ms instead of 100μs:
    Total becomes 9.1ms — 900μs slower per order
    At 50,000 orders/sec peak: cumulative delay compounds
    Competitive disadvantage vs. brokers with faster risk engines
```

### In-Process Risk State

```
The risk engine CANNOT make network calls (even to Redis).
All risk state must be in the OMS process memory:

UserRiskState (per user, in-memory):
    available_margin:     DECIMAL     -- Updated on every order/fill
    blocked_margin:       DECIMAL     -- Margin reserved for open orders
    total_margin:         DECIMAL     -- Deposited funds + collateral
    positions:            MAP<instrument_token → Position>
    open_order_count:     INTEGER     -- For rate limiting
    max_order_value:      DECIMAL     -- Per-order limit
    max_position_limit:   MAP<segment → limit>

Updates:
    - On order acceptance: deduct from available_margin
    - On fill: recalculate position margin requirement
    - On cancel: release blocked margin
    - On margin deposit/withdrawal: update total_margin

Consistency:
    - Single-threaded per user (lock-free within user context)
    - Event-sourced: all state changes derived from order/trade events
    - Periodic snapshot to Redis for crash recovery
    - On restart: replay events from last snapshot
```

### Circuit Breaker Awareness

```
Exchange circuit breakers:
    - Index circuit: NIFTY moves ±10% / ±15% / ±20% → trading halt
    - Stock circuit: individual stock hits ±5% / ±10% / ±20% band

Broker must:
    1. Reject orders outside circuit limits (pre-trade)
    2. Cancel open orders if circuit triggered (mid-session)
    3. Prevent new orders during halt period

Implementation:
    CircuitBreaker cache updated in real-time from exchange broadcasts
    Risk engine checks: order.price BETWEEN circuit_low AND circuit_high
    On circuit trigger event: scan all open orders, cancel those affected
```

---

## Key Bottleneck Summary

| Bottleneck | Impact | Mitigation |
|------------|--------|------------|
| **Market open thundering herd** | 100× order spike in 60 seconds | Pre-provision, AMO queue staging, backpressure, rate limiting |
| **Market data fan-out** | 75M+ message deliveries/sec | Subscription routing, binary frames, batching, mode-based filtering |
| **Risk engine latency** | Each μs of delay compounds across 50K orders/sec | In-process memory, no network calls, lock-free per-user |
| **WebSocket connection storm** | 400K connections in 60 seconds at market open | Staggered reconnection, connection rate limiting, pre-auth |
| **Settlement reconciliation** | Must match 100% of trades with exchange | Automated reconciliation pipeline, zero-tolerance alerting |
| **Order book depth bandwidth** | Level 3 data = 480 bytes × 5K instruments × 100 updates/sec | Incremental deltas, sequence numbers, mode-based subscription |
| **FIX session failover** | Exchange FIX session drop = order routing failure | Hot standby FIX sessions, automatic sequence reset, circuit breaker |
| **Tick data storage** | 500 GB/day compressed | Time-series DB, daily partitioning, 90-day retention, aggregation |
