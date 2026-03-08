# Low-Level Design

## Data Models

### User and Account

```
User {
    user_id:            UUID (primary key)
    email:              VARCHAR(255) UNIQUE
    phone_hash:         VARCHAR(64)
    kyc_tier:           ENUM(NONE, BASIC, INTERMEDIATE, ADVANCED)
    kyc_verified_at:    TIMESTAMP
    account_status:     ENUM(ACTIVE, SUSPENDED, FROZEN, CLOSED)
    fee_tier:           ENUM(REGULAR, VIP1, VIP2, VIP3, VIP4, MARKET_MAKER)
    two_factor_enabled: BOOLEAN
    created_at:         TIMESTAMP
    updated_at:         TIMESTAMP
}

SubAccount {
    sub_account_id:     UUID (primary key)
    parent_user_id:     UUID (FK → User)
    label:              VARCHAR(100)
    account_type:       ENUM(SPOT, MARGIN, FUNDING)
    is_default:         BOOLEAN
    created_at:         TIMESTAMP
}

APIKey {
    key_id:             UUID (primary key)
    user_id:            UUID (FK → User)
    public_key:         VARCHAR(64) UNIQUE
    secret_hash:        VARCHAR(128)
    permissions:        JSONB {read, trade, withdraw}
    ip_whitelist:       INET[]
    rate_limit_tier:    INTEGER
    expires_at:         TIMESTAMP
    created_at:         TIMESTAMP
}
```

### Balance and Ledger

```
Balance {
    balance_id:         UUID (primary key)
    user_id:            UUID (FK → User)
    sub_account_id:     UUID (FK → SubAccount)
    asset:              VARCHAR(20)  -- e.g., BTC, ETH, USDT
    available:          DECIMAL(36,18)
    locked:             DECIMAL(36,18)  -- in open orders
    frozen:             DECIMAL(36,18)  -- compliance hold
    version:            BIGINT  -- optimistic concurrency
    updated_at:         TIMESTAMP

    UNIQUE(user_id, sub_account_id, asset)
}

LedgerEntry {
    entry_id:           BIGINT (auto-increment, primary key)
    user_id:            UUID
    asset:              VARCHAR(20)
    entry_type:         ENUM(DEBIT, CREDIT)
    amount:             DECIMAL(36,18)
    balance_after:      DECIMAL(36,18)
    reference_type:     ENUM(TRADE, DEPOSIT, WITHDRAWAL, FEE, TRANSFER, MARGIN_LOAN, LIQUIDATION)
    reference_id:       UUID
    description:        VARCHAR(255)
    created_at:         TIMESTAMP

    INDEX(user_id, asset, created_at)
    INDEX(reference_type, reference_id)
}
```

### Order and Trade

```
Order {
    order_id:           UUID (primary key)
    client_order_id:    VARCHAR(64) UNIQUE  -- idempotency key
    user_id:            UUID (FK → User)
    pair:               VARCHAR(20)  -- e.g., BTC_USDT
    side:               ENUM(BUY, SELL)
    order_type:         ENUM(LIMIT, MARKET, STOP_LIMIT, OCO, POST_ONLY, IOC, FOK)
    price:              DECIMAL(36,18) NULLABLE  -- NULL for market orders
    stop_price:         DECIMAL(36,18) NULLABLE  -- trigger price for stop orders
    quantity:           DECIMAL(36,18)
    filled_quantity:    DECIMAL(36,18) DEFAULT 0
    remaining_quantity: DECIMAL(36,18)
    avg_fill_price:     DECIMAL(36,18) DEFAULT 0
    status:             ENUM(NEW, PARTIALLY_FILLED, FILLED, CANCELLED, EXPIRED, REJECTED)
    time_in_force:      ENUM(GTC, IOC, FOK, GTD)
    self_trade_prevention: ENUM(CANCEL_OLDEST, CANCEL_NEWEST, CANCEL_BOTH)
    created_at:         TIMESTAMP
    updated_at:         TIMESTAMP

    INDEX(user_id, pair, status, created_at)
    INDEX(pair, status)
}

Trade {
    trade_id:           BIGINT (auto-increment, primary key)
    pair:               VARCHAR(20)
    price:              DECIMAL(36,18)
    quantity:           DECIMAL(36,18)
    quote_quantity:     DECIMAL(36,18)  -- price × quantity
    maker_order_id:     UUID (FK → Order)
    taker_order_id:     UUID (FK → Order)
    maker_user_id:      UUID
    taker_user_id:      UUID
    maker_fee:          DECIMAL(36,18)
    taker_fee:          DECIMAL(36,18)
    maker_fee_asset:    VARCHAR(20)
    taker_fee_asset:    VARCHAR(20)
    is_buyer_maker:     BOOLEAN
    trade_time:         TIMESTAMP (microsecond precision)
    sequence_number:    BIGINT  -- monotonic per pair

    INDEX(pair, trade_time)
    INDEX(maker_user_id, trade_time)
    INDEX(taker_user_id, trade_time)
}
```

### Deposit and Withdrawal

```
DepositAddress {
    address_id:         UUID (primary key)
    user_id:            UUID (FK → User)
    chain:              VARCHAR(20)  -- e.g., ETHEREUM, BITCOIN, SOLANA
    address:            VARCHAR(256)
    memo_tag:           VARCHAR(64) NULLABLE  -- for chains like XRP, COSMOS
    derivation_path:    VARCHAR(64)
    is_active:          BOOLEAN
    created_at:         TIMESTAMP

    UNIQUE(chain, address)
}

Deposit {
    deposit_id:         UUID (primary key)
    user_id:            UUID (FK → User)
    chain:              VARCHAR(20)
    asset:              VARCHAR(20)
    amount:             DECIMAL(36,18)
    tx_hash:            VARCHAR(128)
    from_address:       VARCHAR(256)
    to_address:         VARCHAR(256)
    confirmations:      INTEGER
    required_confirmations: INTEGER
    status:             ENUM(DETECTED, CONFIRMING, CREDITED, FAILED, REORGED)
    block_number:       BIGINT
    block_hash:         VARCHAR(128)
    credited_at:        TIMESTAMP
    detected_at:        TIMESTAMP

    UNIQUE(chain, tx_hash, to_address)
    INDEX(user_id, status)
}

Withdrawal {
    withdrawal_id:      UUID (primary key)
    user_id:            UUID (FK → User)
    chain:              VARCHAR(20)
    asset:              VARCHAR(20)
    amount:             DECIMAL(36,18)
    fee:                DECIMAL(36,18)
    to_address:         VARCHAR(256)
    memo_tag:           VARCHAR(64) NULLABLE
    tx_hash:            VARCHAR(128) NULLABLE
    status:             ENUM(PENDING, RISK_REVIEW, APPROVED, SIGNING, BROADCAST, CONFIRMING, COMPLETED, REJECTED, FAILED)
    risk_score:         INTEGER
    approved_by:        VARCHAR(64) NULLABLE  -- system or reviewer ID
    created_at:         TIMESTAMP
    completed_at:       TIMESTAMP

    INDEX(user_id, status, created_at)
    INDEX(status, created_at)
}
```

### Margin Position

```
MarginPosition {
    position_id:        UUID (primary key)
    user_id:            UUID (FK → User)
    pair:               VARCHAR(20)
    side:               ENUM(LONG, SHORT)
    margin_type:        ENUM(CROSS, ISOLATED)
    entry_price:        DECIMAL(36,18)
    quantity:           DECIMAL(36,18)
    leverage:           DECIMAL(6,2)
    collateral:         DECIMAL(36,18)
    borrowed:           DECIMAL(36,18)
    interest_accrued:   DECIMAL(36,18)
    liquidation_price:  DECIMAL(36,18)
    margin_ratio:       DECIMAL(10,6)
    status:             ENUM(OPEN, LIQUIDATING, LIQUIDATED, CLOSED)
    opened_at:          TIMESTAMP
    updated_at:         TIMESTAMP

    INDEX(status, margin_ratio)  -- for liquidation scanning
    INDEX(user_id, pair)
}
```

---

## API Design

### Order APIs

```
POST /api/v1/orders
Request:
{
    "pair": "BTC_USDT",
    "side": "BUY",
    "type": "LIMIT",
    "price": "60000.00",
    "quantity": "0.5",
    "time_in_force": "GTC",
    "client_order_id": "my-order-001"
}
Response: 201 Created
{
    "order_id": "uuid-...",
    "client_order_id": "my-order-001",
    "status": "NEW",
    "pair": "BTC_USDT",
    "side": "BUY",
    "type": "LIMIT",
    "price": "60000.00",
    "quantity": "0.5",
    "filled_quantity": "0",
    "created_at": "2026-03-09T10:30:00Z"
}

DELETE /api/v1/orders/{order_id}
Response: 200 OK
{
    "order_id": "uuid-...",
    "status": "CANCELLED",
    "filled_quantity": "0.2",
    "cancelled_quantity": "0.3"
}

GET /api/v1/orders?pair=BTC_USDT&status=OPEN&limit=100
Response: 200 OK
{
    "orders": [...],
    "next_cursor": "eyJ..."
}

DELETE /api/v1/orders?pair=BTC_USDT
Response: 200 OK  (bulk cancel all open orders for pair)
{
    "cancelled_count": 15
}
```

### Market Data APIs

```
GET /api/v1/depth?pair=BTC_USDT&limit=20
Response: 200 OK
{
    "pair": "BTC_USDT",
    "bids": [["59990.00", "2.5"], ["59985.00", "1.8"], ...],
    "asks": [["60000.00", "1.2"], ["60005.00", "3.1"], ...],
    "sequence": 1234567890,
    "timestamp": "2026-03-09T10:30:00.123Z"
}

GET /api/v1/trades?pair=BTC_USDT&limit=50
Response: 200 OK
{
    "trades": [
        {"id": 98765, "price": "60000.00", "quantity": "0.1",
         "is_buyer_maker": true, "time": "2026-03-09T10:30:00.123Z"},
        ...
    ]
}

GET /api/v1/klines?pair=BTC_USDT&interval=1h&limit=500
Response: 200 OK
{
    "klines": [
        [1709971200000, "59800.00", "60100.00", "59750.00", "60050.00", "1234.5"],
        ...
    ]
}
```

### WebSocket Streams

```
// Subscribe to order book updates
SEND: {"method": "SUBSCRIBE", "params": ["BTC_USDT@depth@100ms"]}

// Order book update (L2 delta)
RECV: {
    "e": "depthUpdate",
    "s": "BTC_USDT",
    "U": 1234567890,   // first update ID
    "u": 1234567895,   // last update ID
    "b": [["59990.00", "2.5"], ["59985.00", "0"]],  // 0 = remove level
    "a": [["60000.00", "1.2"]]
}

// Subscribe to trade stream
SEND: {"method": "SUBSCRIBE", "params": ["BTC_USDT@trades"]}

// Trade event
RECV: {
    "e": "trade",
    "s": "BTC_USDT",
    "t": 98765,
    "p": "60000.00",
    "q": "0.1",
    "m": true,
    "T": 1709971200123
}

// User order updates (authenticated)
SEND: {"method": "SUBSCRIBE", "params": ["account@orders"]}
RECV: {
    "e": "orderUpdate",
    "o": {
        "order_id": "uuid-...",
        "status": "PARTIALLY_FILLED",
        "filled_quantity": "0.3",
        "last_fill_price": "60000.00",
        "last_fill_quantity": "0.1"
    }
}
```

### Deposit/Withdrawal APIs

```
GET /api/v1/deposit/address?chain=ETHEREUM&asset=ETH
Response: 200 OK
{
    "chain": "ETHEREUM",
    "address": "0x1234...abcd",
    "memo": null
}

POST /api/v1/withdrawals
Request:
{
    "asset": "BTC",
    "chain": "BITCOIN",
    "address": "bc1q...",
    "amount": "0.5",
    "idempotency_key": "withdraw-001"
}
Response: 201 Created
{
    "withdrawal_id": "uuid-...",
    "status": "PENDING",
    "amount": "0.5",
    "fee": "0.0001",
    "estimated_completion": "2026-03-09T11:00:00Z"
}
```

---

## Core Algorithms

### Price-Time Priority Matching

```
FUNCTION match_order(incoming_order, order_book):
    fills = []

    IF incoming_order.side == BUY:
        opposite_side = order_book.asks  // sorted ascending by price
    ELSE:
        opposite_side = order_book.bids  // sorted descending by price

    WHILE incoming_order.remaining_quantity > 0:
        best_order = opposite_side.peek()

        IF best_order IS NULL:
            BREAK  // no orders on opposite side

        // Price check
        IF incoming_order.type == LIMIT:
            IF incoming_order.side == BUY AND best_order.price > incoming_order.price:
                BREAK  // best ask above our bid
            IF incoming_order.side == SELL AND best_order.price < incoming_order.price:
                BREAK  // best bid below our ask

        // Self-trade prevention
        IF best_order.user_id == incoming_order.user_id:
            HANDLE self_trade_prevention(incoming_order, best_order)
            CONTINUE

        // Calculate fill quantity
        fill_qty = MIN(incoming_order.remaining_quantity, best_order.remaining_quantity)
        fill_price = best_order.price  // maker's price

        // Create fill
        fill = Trade{
            price: fill_price,
            quantity: fill_qty,
            maker_order: best_order,
            taker_order: incoming_order,
            timestamp: NOW()
        }
        fills.APPEND(fill)

        // Update quantities
        incoming_order.remaining_quantity -= fill_qty
        best_order.remaining_quantity -= fill_qty

        IF best_order.remaining_quantity == 0:
            opposite_side.remove(best_order)
            best_order.status = FILLED

    // Handle remaining quantity based on order type
    IF incoming_order.remaining_quantity > 0:
        IF incoming_order.type == LIMIT AND incoming_order.tif == GTC:
            order_book.add(incoming_order)  // rest on book
        ELSE IF incoming_order.type == MARKET:
            incoming_order.status = CANCELLED  // unfilled market order portion cancelled
        ELSE IF incoming_order.tif == IOC:
            incoming_order.status = CANCELLED  // immediate or cancel
        ELSE IF incoming_order.tif == FOK:
            ROLLBACK all fills  // fill or kill: all or nothing
            RETURN []
    ELSE:
        incoming_order.status = FILLED

    EMIT events for each fill
    RETURN fills
```

### Stop Order Trigger

```
FUNCTION process_stop_orders(last_trade_price, stop_order_book):
    // Stop orders are stored separately, indexed by trigger price

    // Check stop-buy orders (trigger when price >= stop_price)
    WHILE stop_order_book.buy_stops.has_orders_at_or_below(last_trade_price):
        stop_order = stop_order_book.buy_stops.pop_lowest()
        limit_order = convert_to_limit_order(stop_order)
        SUBMIT limit_order to matching engine

    // Check stop-sell orders (trigger when price <= stop_price)
    WHILE stop_order_book.sell_stops.has_orders_at_or_above(last_trade_price):
        stop_order = stop_order_book.sell_stops.pop_highest()
        limit_order = convert_to_limit_order(stop_order)
        SUBMIT limit_order to matching engine
```

### Balance Lock and Settlement

```
FUNCTION lock_balance_for_order(user_id, asset, amount, order_id):
    // Atomic operation with optimistic concurrency
    balance = SELECT * FROM Balance
              WHERE user_id = user_id AND asset = asset

    IF balance.available < amount:
        RETURN ERROR("Insufficient balance")

    rows_affected = UPDATE Balance
                    SET available = available - amount,
                        locked = locked + amount,
                        version = version + 1
                    WHERE balance_id = balance.balance_id
                      AND version = balance.version

    IF rows_affected == 0:
        RETRY  // concurrent modification, re-read and retry

    INSERT INTO LedgerEntry(user_id, asset, entry_type=DEBIT,
        amount, reference_type=ORDER_LOCK, reference_id=order_id)

    RETURN SUCCESS

FUNCTION settle_trade(trade):
    // Called after matching engine emits a fill event
    // Buyer pays quote asset, receives base asset
    // Seller pays base asset, receives quote asset

    BEGIN TRANSACTION

    // Buyer: unlock quote, debit quote, credit base
    UPDATE Balance SET locked = locked - trade.quote_quantity
        WHERE user_id = trade.buyer_id AND asset = trade.quote_asset
    UPDATE Balance SET available = available + trade.base_quantity - trade.buyer_fee
        WHERE user_id = trade.buyer_id AND asset = trade.base_asset

    // Seller: unlock base, debit base, credit quote
    UPDATE Balance SET locked = locked - trade.base_quantity
        WHERE user_id = trade.seller_id AND asset = trade.base_asset
    UPDATE Balance SET available = available + trade.quote_quantity - trade.seller_fee
        WHERE user_id = trade.seller_id AND asset = trade.quote_asset

    // Collect fees to platform account
    UPDATE Balance SET available = available + trade.buyer_fee + trade.seller_fee
        WHERE user_id = PLATFORM_FEE_ACCOUNT AND asset = trade.fee_asset

    // Double-entry ledger entries for audit
    INSERT INTO LedgerEntry [...] -- 6 entries (buyer debit/credit, seller debit/credit, fee entries)

    COMMIT TRANSACTION
```

### Margin Liquidation Check

```
FUNCTION check_liquidations(positions, mark_prices):
    // Runs every 100ms for all open margin positions
    liquidation_queue = []

    FOR EACH position IN positions WHERE status == OPEN:
        mark_price = mark_prices[position.pair]
        unrealized_pnl = calculate_pnl(position, mark_price)

        // margin_ratio = (collateral + unrealized_pnl) / position_value
        position_value = position.quantity * mark_price
        equity = position.collateral + unrealized_pnl
        margin_ratio = equity / position_value

        IF margin_ratio <= MAINTENANCE_MARGIN_RATIO:
            liquidation_queue.APPEND(position)
            position.status = LIQUIDATING

    // Process liquidations by urgency (lowest margin ratio first)
    SORT liquidation_queue BY margin_ratio ASC

    FOR EACH position IN liquidation_queue:
        // Place liquidation order at bankruptcy price
        bankruptcy_price = calculate_bankruptcy_price(position)
        liquidation_order = create_market_order(
            pair: position.pair,
            side: OPPOSITE(position.side),
            quantity: position.quantity,
            is_liquidation: TRUE
        )
        SUBMIT liquidation_order to matching engine

        // If liquidation generates profit beyond covering debt,
        // excess goes to insurance fund
```

### Deposit Confirmation with Reorg Protection

```
FUNCTION monitor_deposits(chain):
    latest_block = get_latest_block(chain)
    required_confirmations = get_required_confirmations(chain)

    FOR EACH pending_deposit IN get_pending_deposits(chain):
        current_confirmations = latest_block.number - pending_deposit.block_number

        // Reorg detection: verify the block hash still matches
        block = get_block_by_number(chain, pending_deposit.block_number)
        IF block.hash != pending_deposit.block_hash:
            // Blockchain reorganization detected
            pending_deposit.status = REORGED
            IF pending_deposit.was_credited:
                REVERSE balance credit (debit user)
                ALERT("Deposit reversed due to chain reorg", pending_deposit)
            CONTINUE

        IF current_confirmations >= required_confirmations:
            IF NOT pending_deposit.was_credited:
                credit_user_balance(pending_deposit.user_id,
                    pending_deposit.asset, pending_deposit.amount)
                pending_deposit.status = CREDITED
                pending_deposit.was_credited = TRUE
                NOTIFY user("Deposit confirmed")
```

---

## Order Book Data Structure

```
OrderBook {
    pair:       STRING
    bids:       RedBlackTree<PriceLevel>  // sorted DESC by price
    asks:       RedBlackTree<PriceLevel>  // sorted ASC by price
    sequence:   BIGINT  // monotonic sequence number

    PriceLevel {
        price:      DECIMAL
        orders:     DoublyLinkedList<Order>  // FIFO for time priority
        total_qty:  DECIMAL  // sum of all order quantities at this level
    }

    // Operations:
    // add_order(order):     O(log P) where P = number of price levels
    // cancel_order(order):  O(log P) to find level, O(1) to remove from list
    // match():              O(1) to peek best price, O(1) to dequeue first order
    // get_depth(n):         O(n) to traverse top N levels
}
```

---

## Fee Calculation

```
FUNCTION calculate_fee(user, pair, side, is_maker, quantity, price):
    base_rate = get_fee_rate(user.fee_tier, is_maker)
    // Maker: 0.02% to 0.10%  |  Taker: 0.04% to 0.10%

    // Native token discount (if user holds platform token)
    IF user.pays_fees_with_native_token:
        base_rate = base_rate * 0.75  // 25% discount

    notional_value = quantity * price
    fee_amount = notional_value * base_rate

    RETURN {
        fee_amount: fee_amount,
        fee_asset: quote_asset IF is_maker ELSE quote_asset,
        fee_rate: base_rate
    }

FEE_TIER_TABLE:
| Tier | 30d Volume (USDT) | Maker | Taker |
|------|-------------------|-------|-------|
| Regular | < 1M           | 0.10% | 0.10% |
| VIP 1  | 1M - 5M        | 0.08% | 0.09% |
| VIP 2  | 5M - 20M       | 0.06% | 0.08% |
| VIP 3  | 20M - 100M     | 0.04% | 0.06% |
| VIP 4  | > 100M         | 0.02% | 0.04% |
| Market Maker | Qualified | 0.00% | 0.03% |
```
