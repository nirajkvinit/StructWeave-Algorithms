# Low-Level Design

## Data Models

### Order

```
Order {
    order_id:           UUID            -- Primary key, generated at acceptance
    exchange_order_id:  STRING          -- Assigned by exchange upon acceptance
    user_id:            UUID            -- FK to User
    instrument_token:   INTEGER         -- Exchange-assigned instrument identifier
    exchange:           ENUM            -- NSE | BSE | MCX
    segment:            ENUM            -- EQUITY | FNO | COMMODITY | CURRENCY
    order_type:         ENUM            -- MARKET | LIMIT | SL | SL_M
    product_type:       ENUM            -- CNC (delivery) | MIS (intraday) | NRML (F&O)
    side:               ENUM            -- BUY | SELL
    quantity:           INTEGER         -- Ordered quantity
    filled_quantity:    INTEGER         -- Quantity filled so far
    pending_quantity:   INTEGER         -- quantity - filled_quantity
    price:              DECIMAL(12,2)   -- Limit price (0 for market orders)
    trigger_price:      DECIMAL(12,2)   -- For SL/SL-M orders
    average_fill_price: DECIMAL(12,2)   -- Volume-weighted average of fills
    status:             ENUM            -- VALIDATION_PENDING | OPEN | PENDING |
                                        -- PARTIALLY_FILLED | EXECUTED | CANCELLED |
                                        -- REJECTED | AMO_QUEUED | TRIGGER_PENDING
    validity:           ENUM            -- DAY | IOC (Immediate or Cancel)
    disclosed_quantity: INTEGER         -- Visible quantity in order book (iceberg)
    tag:                STRING          -- User-defined tag for algo identification
    parent_order_id:    UUID            -- For bracket/cover order legs
    placed_at:          TIMESTAMP_US    -- Microsecond precision
    exchange_timestamp: TIMESTAMP_US    -- Exchange acknowledgment time
    updated_at:         TIMESTAMP_US    -- Last status change
    source:             ENUM            -- WEB | MOBILE | API
    client_ip:          STRING          -- For audit trail
    device_fingerprint: STRING          -- For audit trail
}

Indexes:
    - PRIMARY KEY (order_id)
    - INDEX (user_id, placed_at DESC)           -- User's order history
    - INDEX (status, exchange) WHERE status IN ('OPEN', 'PENDING', 'PARTIALLY_FILLED')
                                                -- Active orders for monitoring
    - INDEX (exchange_order_id)                 -- Exchange response correlation
    - INDEX (instrument_token, placed_at DESC)  -- Orders per instrument
```

### Trade (Execution)

```
Trade {
    trade_id:           UUID            -- Primary key
    order_id:           UUID            -- FK to Order
    exchange_trade_id:  STRING          -- Exchange-assigned trade ID
    user_id:            UUID            -- FK to User (denormalized for queries)
    instrument_token:   INTEGER         -- Exchange instrument identifier
    exchange:           ENUM            -- NSE | BSE | MCX
    side:               ENUM            -- BUY | SELL
    quantity:           INTEGER         -- Filled quantity in this execution
    price:              DECIMAL(12,2)   -- Fill price
    product_type:       ENUM            -- CNC | MIS | NRML
    executed_at:        TIMESTAMP_US    -- Exchange execution timestamp
    settlement_id:      STRING          -- Settlement number assigned by exchange
    is_settled:         BOOLEAN         -- Whether T+1 settlement is complete
    settled_at:         TIMESTAMP       -- Settlement completion timestamp
}

Indexes:
    - PRIMARY KEY (trade_id)
    - INDEX (order_id)                          -- Fills for an order
    - INDEX (user_id, executed_at DESC)         -- User's trade history
    - INDEX (settlement_id) WHERE NOT is_settled -- Pending settlements
    - INDEX (instrument_token, executed_at DESC) -- Trades per instrument
```

### Position

```
Position {
    position_id:        UUID            -- Primary key
    user_id:            UUID            -- FK to User
    instrument_token:   INTEGER         -- Exchange instrument identifier
    exchange:           ENUM            -- NSE | BSE | MCX
    product_type:       ENUM            -- MIS | NRML | CNC
    side:               ENUM            -- NET_LONG | NET_SHORT | FLAT
    quantity:           INTEGER         -- Net open quantity (positive = long, negative = short)
    buy_quantity:       INTEGER         -- Total bought today
    sell_quantity:       INTEGER         -- Total sold today
    buy_average_price:  DECIMAL(12,2)   -- Average buy price
    sell_average_price: DECIMAL(12,2)   -- Average sell price
    last_traded_price:  DECIMAL(12,2)   -- Latest LTP (for unrealized P&L)
    unrealized_pnl:     DECIMAL(14,2)   -- (LTP - avg_price) × quantity
    realized_pnl:       DECIMAL(14,2)   -- Booked P&L from squared-off positions
    multiplier:         INTEGER         -- Lot size (1 for equity, varies for F&O)
    day:                DATE            -- Trading date
    updated_at:         TIMESTAMP_US    -- Last update

    -- Stored in Redis for real-time access, flushed to PostgreSQL end-of-day
}

Redis Key Pattern:
    pos:{user_id}:{instrument_token}:{product_type}:{date}
```

### Holdings (Delivery Portfolio)

```
Holding {
    holding_id:         UUID            -- Primary key
    user_id:            UUID            -- FK to User
    instrument_token:   INTEGER         -- ISIN-mapped
    isin:               STRING          -- Securities identifier (e.g., INE002A01018)
    quantity:           INTEGER         -- Shares held
    average_price:      DECIMAL(12,2)   -- Volume-weighted average buy price
    last_price:         DECIMAL(12,2)   -- Latest LTP
    day_change:         DECIMAL(12,2)   -- Today's price change
    day_change_pct:     DECIMAL(6,2)    -- Today's change percentage
    pnl:                DECIMAL(14,2)   -- Unrealized P&L
    collateral_qty:     INTEGER         -- Shares pledged as margin collateral
    t1_quantity:        INTEGER         -- Shares in T+1 settlement (not yet delivered)
    updated_at:         TIMESTAMP       -- Last update
}

Indexes:
    - PRIMARY KEY (holding_id)
    - UNIQUE INDEX (user_id, instrument_token)
    - INDEX (user_id)
```

### Instrument (Master Data)

```
Instrument {
    instrument_token:   INTEGER         -- Exchange-assigned numeric token
    exchange:           ENUM            -- NSE | BSE | MCX
    tradingsymbol:      STRING          -- Human-readable symbol (e.g., "RELIANCE")
    name:               STRING          -- Full company name
    isin:               STRING          -- International Securities Identification Number
    instrument_type:    ENUM            -- EQ | FUT | CE | PE | COM
    segment:            ENUM            -- EQUITY | FNO | COMMODITY | CURRENCY
    lot_size:           INTEGER         -- Minimum tradeable quantity
    tick_size:          DECIMAL(6,4)    -- Minimum price movement (e.g., 0.05)
    expiry:             DATE            -- For derivatives (NULL for equity)
    strike:             DECIMAL(12,2)   -- For options (NULL for equity/futures)
    circuit_limit_up:   DECIMAL(12,2)   -- Upper circuit price
    circuit_limit_down: DECIMAL(12,2)   -- Lower circuit price
    is_tradeable:       BOOLEAN         -- Whether instrument is currently tradeable
    last_updated:       TIMESTAMP       -- Master data refresh timestamp
}

Indexes:
    - PRIMARY KEY (instrument_token, exchange)
    - UNIQUE INDEX (tradingsymbol, exchange, expiry)  -- Symbol lookup
    - INDEX (segment, instrument_type)                 -- Segment filtering
```

### MarketDataTick (Time-Series)

```
MarketDataTick {
    instrument_token:   INTEGER         -- FK to Instrument
    timestamp:          TIMESTAMP_US    -- Tick timestamp (microsecond)
    last_price:         DECIMAL(12,2)   -- Last traded price
    last_quantity:      INTEGER         -- Last traded quantity
    total_buy_qty:      BIGINT          -- Total buy-side depth quantity
    total_sell_qty:     BIGINT          -- Total sell-side depth quantity
    volume:             BIGINT          -- Total traded volume today
    open_interest:      BIGINT          -- For derivatives
    best_bid_price:     DECIMAL(12,2)   -- Best bid
    best_bid_qty:       INTEGER         -- Best bid quantity
    best_ask_price:     DECIMAL(12,2)   -- Best ask
    best_ask_qty:       INTEGER         -- Best ask quantity
    open:               DECIMAL(12,2)   -- Day open
    high:               DECIMAL(12,2)   -- Day high
    low:                DECIMAL(12,2)   -- Day low
    close:              DECIMAL(12,2)   -- Previous close
}

Storage: Time-series DB, partitioned by date, sorted by (instrument_token, timestamp)
Retention: 90 days tick-level, then aggregated to 1-min candles for long-term
```

### OHLCV Candle (Aggregated)

```
OHLCVCandle {
    instrument_token:   INTEGER         -- FK to Instrument
    interval:           ENUM            -- 1M | 5M | 15M | 30M | 1H | 1D
    timestamp:          TIMESTAMP       -- Candle open time
    open:               DECIMAL(12,2)
    high:               DECIMAL(12,2)
    low:                DECIMAL(12,2)
    close:              DECIMAL(12,2)
    volume:             BIGINT
    open_interest:      BIGINT          -- For derivatives
}

Storage: Time-series DB, partitioned by (interval, date)
Indexes:
    - PRIMARY KEY (instrument_token, interval, timestamp)
Retention: 10+ years for daily candles; 2 years for intraday candles
```

---

## API Design

### REST APIs — Order Management

```
POST   /api/v1/orders
  Body: { instrument_token, exchange, side, order_type, product_type,
          quantity, price?, trigger_price?, validity, disclosed_quantity?, tag? }
  Response: { order_id, status }
  Headers: Authorization: token {api_key}:{access_token}

PUT    /api/v1/orders/{order_id}
  Body: { quantity?, price?, trigger_price?, order_type?, validity? }
  Response: { order_id, status }
  Note: Only modifiable fields for OPEN/PENDING orders

DELETE /api/v1/orders/{order_id}
  Response: { order_id, status: "CANCELLED" }
  Note: Only cancellable for OPEN/PENDING/TRIGGER_PENDING orders

GET    /api/v1/orders
  Query: ?status=OPEN&segment=FNO
  Response: [ { order_id, instrument, side, qty, price, status, placed_at, ... } ]

GET    /api/v1/orders/{order_id}
  Response: { order_id, ..., status_history: [ { status, timestamp } ] }

GET    /api/v1/orders/{order_id}/trades
  Response: [ { trade_id, price, quantity, executed_at } ]
```

### REST APIs — Portfolio & Positions

```
GET    /api/v1/portfolio/positions
  Response: {
    net: [ { instrument, qty, avg_price, ltp, pnl, ... } ],
    day: [ { instrument, buy_qty, sell_qty, buy_avg, sell_avg, pnl, ... } ]
  }

GET    /api/v1/portfolio/holdings
  Response: [ { instrument, isin, qty, avg_price, ltp, pnl, day_change, ... } ]

PUT    /api/v1/portfolio/positions
  Body: { instrument_token, old_product, new_product, quantity }
  Note: Convert position (e.g., MIS → CNC for carry-forward)
```

### REST APIs — Market Data

```
GET    /api/v1/instruments
  Query: ?exchange=NSE&segment=EQUITY
  Response: CSV dump of all instruments (refreshed daily)

GET    /api/v1/quote
  Query: ?instruments=NSE:RELIANCE,NSE:INFY,NSE:TCS
  Response: { "NSE:RELIANCE": { ltp, volume, ohlc, depth, ... }, ... }

GET    /api/v1/historical/{instrument_token}
  Query: ?interval=5minute&from=2025-01-01&to=2025-01-31
  Response: { candles: [ [timestamp, O, H, L, C, volume], ... ] }

GET    /api/v1/instruments/margins/{segment}
  Response: [ { instrument, margin_pct, span, exposure, ... } ]
```

### WebSocket API — Real-Time Market Data (Ticker)

```
Connection:
  WSS wss://ws.broker.in?api_key={key}&access_token={token}

Subscribe (client → server):
  { "a": "subscribe", "v": [instrument_token_1, instrument_token_2, ...] }

Set Mode (client → server):
  { "a": "mode", "v": ["full", [instrument_token_1, instrument_token_2]] }
  Modes:
    - "ltp":  4 bytes per instrument (just LTP)
    - "quote": 44 bytes per instrument (LTP + OHLC + volume + bid/ask)
    - "full":  184 bytes per instrument (quote + 5-level depth)

Server → Client (binary frame):
  [num_packets(2B)] [packet_length(2B)] [instrument_token(4B)] [LTP(4B)]
  [volume(4B)] [OHLC(16B)] [bid_prices(20B)] [bid_qtys(20B)]
  [ask_prices(20B)] [ask_qtys(20B)] ...

Unsubscribe (client → server):
  { "a": "unsubscribe", "v": [instrument_token_1] }

Heartbeat: server sends ping every 5 seconds; client must respond with pong
Reconnect: client should implement exponential backoff on disconnect
Max subscriptions: 3,000 instrument tokens per connection
```

### REST APIs — GTT (Good Till Triggered)

```
POST   /api/v1/gtt/triggers
  Body: {
    instrument_token, exchange, trigger_type: "single" | "two-leg",
    condition: { trigger_values: [price], last_price },
    orders: [ { side, product, quantity, price, order_type } ]
  }
  Response: { trigger_id }

GET    /api/v1/gtt/triggers
  Response: [ { trigger_id, instrument, condition, status, ... } ]

DELETE /api/v1/gtt/triggers/{trigger_id}
  Response: { trigger_id, status: "DELETED" }
```

---

## Key Algorithms

### Algorithm 1: Pre-Trade Risk Check

```
FUNCTION preTradeRiskCheck(order, user_state):
    -- Step 1: Instrument validation
    instrument = InstrumentCache.get(order.instrument_token)
    IF instrument IS NULL OR NOT instrument.is_tradeable:
        RETURN REJECTED("Instrument not tradeable")

    -- Step 2: Circuit breaker check
    IF order.order_type == LIMIT:
        IF order.price > instrument.circuit_limit_up
           OR order.price < instrument.circuit_limit_down:
            RETURN REJECTED("Price outside circuit limits")

    -- Step 3: Estimate order value
    IF order.order_type == MARKET:
        estimated_price = MarketDataCache.get(order.instrument_token).last_price
    ELSE:
        estimated_price = order.price

    order_value = estimated_price × order.quantity × instrument.lot_size

    -- Step 4: Calculate required margin
    IF order.product_type == CNC:  -- Delivery
        required_margin = order_value  -- Full amount for delivery
    ELSE IF order.product_type == MIS:  -- Intraday
        required_margin = order_value × instrument.mis_margin_pct  -- e.g., 20%
    ELSE IF order.product_type == NRML:  -- F&O
        required_margin = SPANMargin(instrument) + ExposureMargin(instrument)
        required_margin = required_margin × order.quantity / instrument.lot_size

    -- Step 5: Check available margin
    available = user_state.available_margin
    IF required_margin > available:
        RETURN REJECTED("Insufficient margin. Required: " + required_margin
                        + ", Available: " + available)

    -- Step 6: Position limit check
    current_position = PositionCache.get(user_state.user_id, order.instrument_token)
    new_net_qty = current_position.quantity + (order.side == BUY ? order.quantity : -order.quantity)
    IF ABS(new_net_qty) > instrument.max_position_limit:
        RETURN REJECTED("Position limit exceeded")

    -- Step 7: Order value limit
    IF order_value > user_state.max_order_value:
        RETURN REJECTED("Order value exceeds limit")

    -- Step 8: Block margin
    user_state.available_margin -= required_margin
    user_state.blocked_margin += required_margin
    MarginLedger.append(user_state.user_id, -required_margin, "ORDER_BLOCK", order.order_id)

    RETURN APPROVED(required_margin)
```

### Algorithm 2: Position Update on Trade Execution

```
FUNCTION updatePositionOnFill(trade):
    key = positionKey(trade.user_id, trade.instrument_token, trade.product_type, today())
    position = Redis.GET(key)  -- Atomic read

    IF position IS NULL:
        position = new Position(trade.user_id, trade.instrument_token, trade.product_type)

    IF trade.side == BUY:
        -- Update buy-side averages
        total_buy_value = position.buy_average_price × position.buy_quantity
                        + trade.price × trade.quantity
        position.buy_quantity += trade.quantity
        position.buy_average_price = total_buy_value / position.buy_quantity
        position.quantity += trade.quantity  -- Net position increases
    ELSE:  -- SELL
        total_sell_value = position.sell_average_price × position.sell_quantity
                         + trade.price × trade.quantity
        position.sell_quantity += trade.quantity
        position.sell_average_price = total_sell_value / position.sell_quantity
        position.quantity -= trade.quantity  -- Net position decreases

    -- Calculate P&L
    IF position.quantity == 0:  -- Fully squared off
        position.realized_pnl = (position.sell_average_price - position.buy_average_price)
                                × MIN(position.buy_quantity, position.sell_quantity)
                                × instrument.lot_size
        position.unrealized_pnl = 0
    ELSE:
        ltp = MarketDataCache.get(trade.instrument_token).last_price
        IF position.quantity > 0:  -- Net long
            position.unrealized_pnl = (ltp - position.buy_average_price)
                                      × position.quantity × instrument.lot_size
        ELSE:  -- Net short
            position.unrealized_pnl = (position.sell_average_price - ltp)
                                      × ABS(position.quantity) × instrument.lot_size

    -- Release excess margin if position reduced
    IF ABS(position.quantity) < previous_abs_qty:
        released_margin = calculateMarginRelease(position, trade)
        UserMargin.release(trade.user_id, released_margin)

    Redis.SET(key, position)  -- Atomic write
    EventBus.publish("PositionUpdated", position)

    RETURN position
```

### Algorithm 3: OHLCV Candle Aggregation

```
FUNCTION aggregateTickToCandle(tick, interval):
    candle_start = truncateToInterval(tick.timestamp, interval)
    -- e.g., for 5-min: 09:15:00, 09:20:00, 09:25:00, ...

    key = candleKey(tick.instrument_token, interval, candle_start)
    candle = CandleBuffer.get(key)

    IF candle IS NULL:
        -- First tick of this candle
        candle = new OHLCVCandle {
            instrument_token: tick.instrument_token,
            interval: interval,
            timestamp: candle_start,
            open:   tick.last_price,
            high:   tick.last_price,
            low:    tick.last_price,
            close:  tick.last_price,
            volume: tick.last_quantity,
            open_interest: tick.open_interest
        }
    ELSE:
        -- Update existing candle
        candle.high  = MAX(candle.high, tick.last_price)
        candle.low   = MIN(candle.low, tick.last_price)
        candle.close = tick.last_price
        candle.volume += tick.last_quantity
        candle.open_interest = tick.open_interest  -- Latest OI

    CandleBuffer.put(key, candle)

    -- Flush completed candles to time-series DB
    IF currentTime() >= candle_start + interval:
        TimeSeriesDB.upsert(candle)
        CandleBuffer.remove(key)

    RETURN candle
```

### Algorithm 4: Margin Calculation (SPAN + Exposure)

```
FUNCTION calculateFnOMargin(instrument, order):
    -- SPAN margin: covers potential loss from adverse price movement
    -- Based on exchange-published SPAN parameters (updated daily)

    span_params = ExchangeParams.getSPAN(instrument.instrument_token)

    IF instrument.instrument_type == FUT:
        span_margin = span_params.initial_margin_pct × order.price × order.quantity
        exposure_margin = span_params.exposure_margin_pct × order.price × order.quantity
    ELSE IF instrument.instrument_type IN (CE, PE):  -- Options
        -- Option buying: only premium
        IF order.side == BUY:
            RETURN order.price × order.quantity × instrument.lot_size  -- Premium only
        -- Option selling: SPAN + premium received as offset
        span_margin = span_params.option_span × order.quantity
        exposure_margin = span_params.option_exposure × order.quantity
        premium_received = order.price × order.quantity × instrument.lot_size
        -- Premium partially offsets margin requirement
        span_margin = MAX(span_margin - premium_received × 0.3, span_margin × 0.5)

    total_margin = span_margin + exposure_margin

    -- Apply hedging benefit if opposing position exists
    opposing = PositionCache.getOpposing(order.user_id, instrument)
    IF opposing IS NOT NULL:
        hedge_benefit = calculateHedgeBenefit(instrument, order, opposing)
        total_margin = total_margin × (1 - hedge_benefit)

    RETURN total_margin
```

---

## Database Schema Notes

### Partitioning Strategy

```
Orders table:     Range partition by placed_at (monthly)
                  -- Current month: hot, indexed; older months: archived
Trades table:     Range partition by executed_at (monthly)
MarketDataTick:   Range partition by date (daily)
                  -- Only 90 days retained; older data aggregated
OHLCVCandle:      Range partition by (interval, timestamp)
                  -- Daily candles: 10+ year retention
                  -- Minute candles: 2 year retention
```

### Read Replicas

```
Primary (write):   Orders, Trades, Positions (during market hours)
Replica 1 (read):  Portfolio views, Holdings, Historical queries
Replica 2 (read):  Reporting, Compliance, Analytics
Replica 3 (read):  API read traffic (order history, trade history)
```
