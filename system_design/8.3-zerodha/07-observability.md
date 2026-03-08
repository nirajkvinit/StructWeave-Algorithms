# Observability

## Metrics Taxonomy

### Order Pipeline Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `order.placement.rate` | Counter | Orders placed per second | > 60K/sec (capacity warning) |
| `order.placement.latency.p50` | Histogram | API to order acceptance (p50) | > 100ms |
| `order.placement.latency.p99` | Histogram | API to order acceptance (p99) | > 500ms |
| `order.to_exchange.latency.p50` | Histogram | OMS to exchange gateway (p50) | > 1ms |
| `order.to_exchange.latency.p99` | Histogram | OMS to exchange gateway (p99) | > 5ms |
| `order.fill.latency.p50` | Histogram | Order sent to fill received (p50) | > 10ms |
| `order.rejection.rate` | Counter | Orders rejected by risk engine | > 5% of total (unusual) |
| `order.exchange_rejection.rate` | Counter | Orders rejected by exchange | > 1% (investigate) |
| `order.modification.rate` | Counter | Order modifications per second | Informational |
| `order.cancellation.rate` | Counter | Order cancellations per second | Informational |
| `order.queue.depth` | Gauge | Pending orders in queue | > 5,000 (backpressure active) |
| `order.queue.wait_time` | Histogram | Time order spends in queue | > 2s (degradation) |

### Market Data Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `marketdata.ticks.rate` | Counter | Ticks received per second from exchange | < 500K (feed issue) |
| `marketdata.latency.exchange_to_colo` | Histogram | Exchange → co-located feed handler | > 200μs |
| `marketdata.latency.colo_to_dc` | Histogram | Colo → broker data center | > 1ms |
| `marketdata.latency.dc_to_user` | Histogram | Data center → user WebSocket | > 5ms |
| `marketdata.latency.end_to_end` | Histogram | Exchange tick → user's screen | > 10ms |
| `marketdata.feed.gap_count` | Counter | Sequence gaps detected in exchange feed | > 0 (alert immediately) |
| `marketdata.candle.aggregation_lag` | Gauge | Time since last candle flush to DB | > 120s |
| `marketdata.instruments.active` | Gauge | Instruments with active subscriptions | Informational |

### WebSocket / Ticker Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `ticker.connections.active` | Gauge | Active WebSocket connections | > 500K (near capacity) |
| `ticker.connections.rate` | Counter | New connections per second | > 15K/sec (connection storm) |
| `ticker.connections.errors` | Counter | Failed connection attempts | > 1% error rate |
| `ticker.messages.outbound.rate` | Counter | Messages sent per second (across all connections) | Informational |
| `ticker.bandwidth.outbound` | Gauge | Outbound bandwidth (MB/s) | > 2 GB/s (near saturation) |
| `ticker.message.drop.rate` | Counter | Messages dropped (slow consumers) | > 0 (alert) |
| `ticker.per_server.connections` | Gauge | Connections per ticker server | > 55K (rebalance needed) |
| `ticker.heartbeat.timeout.rate` | Counter | Connections timed out on heartbeat | Informational |

### Risk Engine Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `risk.check.latency.p50` | Histogram | Pre-trade risk check time (p50) | > 50μs |
| `risk.check.latency.p99` | Histogram | Pre-trade risk check time (p99) | > 200μs |
| `risk.margin.shortfall.count` | Counter | Orders rejected for insufficient margin | Informational (but trend) |
| `risk.margin.utilization.pct` | Gauge | Aggregate margin utilization % | > 90% (funding alert) |
| `risk.position.limit.breaches` | Counter | Position limit violations attempted | > 0 (compliance flag) |
| `risk.circuit_breaker.events` | Counter | Circuit breaker activations | Informational |
| `risk.state.recovery.time` | Histogram | Time to rebuild risk state from event log | > 120s |

### Position & Portfolio Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `position.update.latency` | Histogram | Trade execution → position updated | > 500ms |
| `position.cache.hit_rate` | Gauge | Redis cache hit rate for positions | < 99% |
| `position.pnl.calculation.time` | Histogram | P&L recalculation time | > 10ms |
| `portfolio.api.latency.p99` | Histogram | Portfolio/holdings API response time | > 500ms |
| `holdings.count` | Gauge | Total holdings records across all users | Informational |

### Settlement & Reconciliation Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `settlement.reconciliation.match_rate` | Gauge | % of trades matched with exchange | < 100% (critical alert) |
| `settlement.reconciliation.mismatches` | Counter | Trades not matching exchange file | > 0 (escalation) |
| `settlement.obligations.pending` | Gauge | Pending settlement obligations | Informational |
| `settlement.contract_notes.generated` | Counter | Contract notes generated | Should equal unique trading clients |
| `settlement.fund_transfer.latency` | Histogram | Time to process fund transfers | > 1 hour |

---

## Key Dashboards

### Dashboard 1: Market Hours Command Center

```
┌────────────────────────────────────────────────────────────┐
│ MARKET HOURS COMMAND CENTER             Status: ● NORMAL    │
├────────────────┬───────────────────┬───────────────────────┤
│ Orders/sec     │ Market Data Lag   │ WebSocket Connections │
│ ██████ 2,450   │ ▁▂▁▁▂▁▁ 1.8ms   │ ████████ 487,200     │
│ Peak: 48,200   │ p99: 4.2ms       │ Capacity: 600K       │
├────────────────┼───────────────────┼───────────────────────┤
│ Fill Rate      │ Rejection Rate    │ Risk Engine p99      │
│ 99.2%          │ 0.3% (risk)      │ 85μs                 │
│                │ 0.1% (exchange)   │ Budget: 200μs        │
├────────────────┴───────────────────┴───────────────────────┤
│ FIX Sessions    NSE: ●●●●● (5/5)   BSE: ●●● (3/3)       │
│                 MCX: ●● (2/2)       Latency: 0.3ms avg    │
├────────────────────────────────────────────────────────────┤
│ Order Volume Today     │  5,847,230 / ~10M expected       │
│ Trades Today           │  4,923,100                        │
│ AMO Orders Processed   │  1,245,000 (all cleared by 9:16) │
│ Active GTT Triggers    │  3,200,000                        │
└────────────────────────────────────────────────────────────┘
```

### Dashboard 2: Market Open Spike Monitor

```
┌────────────────────────────────────────────────────────────┐
│ MARKET OPEN MONITOR (9:15 - 9:20 AM)                       │
├────────────────────────────────────────────────────────────┤
│ Order Rate (orders/sec) - last 5 minutes                   │
│                                                             │
│ 50K ┤                                                       │
│     │    ╭──╮                                               │
│ 40K ┤    │  │                                               │
│     │   ╭╯  ╰╮                                              │
│ 30K ┤   │    ╰╮                                             │
│     │  ╭╯     ╰─╮                                           │
│ 20K ┤  │        ╰──╮                                        │
│     │ ╭╯            ╰───╮                                   │
│ 10K ┤╭╯                 ╰─────────                          │
│     ╭╯                                                      │
│   0 ┤                                                       │
│     9:14:50  9:15:00  9:15:30  9:16:00  9:17:00  9:20:00   │
├────────────────────────────────────────────────────────────┤
│ AMO Queue:  0 remaining (✓ cleared at 9:15:48)             │
│ Queue Depth: 0 (peak was 12,400 at 9:15:03)               │
│ Backpressure: INACTIVE (was active 9:15:00-9:15:22)       │
│ WebSocket Storm: 412K connections (peak rate: 8,200/sec)   │
└────────────────────────────────────────────────────────────┘
```

### Dashboard 3: Financial Reconciliation

```
┌────────────────────────────────────────────────────────────┐
│ SETTLEMENT & RECONCILIATION (T+1)                          │
├───────────────────────┬────────────────────────────────────┤
│ Today's Trades        │ 8,245,000                          │
│ Exchange Trade File   │ 8,245,000  ✓ 100% match           │
│ Mismatches            │ 0          ✓                       │
├───────────────────────┼────────────────────────────────────┤
│ Settlement Obligations│                                    │
│   Securities Deliver  │ ₹12,450 Cr                        │
│   Securities Receive  │ ₹11,890 Cr                        │
│   Net Fund Obligation │ ₹560 Cr (pay to clearing corp)    │
├───────────────────────┼────────────────────────────────────┤
│ Contract Notes        │ 2,450,000 generated (100%)        │
│ Email Delivery        │ 2,448,500 delivered (99.94%)      │
│ Failed Delivery       │ 1,500 (retry queue)               │
├───────────────────────┼────────────────────────────────────┤
│ Client Fund Balance   │ ₹45,200 Cr                        │
│ Margin Utilized       │ ₹32,100 Cr (71%)                  │
│ Margin Shortfall      │ 0 clients   ✓                     │
└────────────────────────────────────────────────────────────┘
```

---

## Distributed Tracing

### Order Lifecycle Trace

```
Trace ID: ord-7f3a2b4c-9e15-4d8a-b2c1-3f5e7a9b1d0c

Span 1: api_gateway.receive
    Duration: 1.2ms
    Tags: user_id=U123, source=MOBILE, ip=203.0.113.45

Span 2: oms.validate_request
    Duration: 0.3ms
    Tags: instrument=RELIANCE, side=BUY, qty=100, type=MARKET

Span 3: risk_engine.pre_trade_check
    Duration: 0.072ms (72μs)
    Tags: margin_required=₹245,050, margin_available=₹500,000
          checks=[margin:PASS, position_limit:PASS, circuit:PASS]

Span 4: oms.persist_order
    Duration: 2.1ms
    Tags: order_id=ORD-789, status=OPEN, db=postgresql

Span 5: order_gateway.send_fix
    Duration: 0.4ms
    Tags: fix_session=NSE-01, clord_id=ORD-789, msg_type=NewOrderSingle

Span 6: exchange.round_trip
    Duration: 3.8ms
    Tags: exchange=NSE, exchange_order_id=2025031200012345

Span 7: oms.process_fill
    Duration: 1.5ms
    Tags: fill_price=₹2,450.50, fill_qty=100, status=COMPLETE

Span 8: position_service.update
    Duration: 0.8ms
    Tags: new_position=+100, unrealized_pnl=₹0

Span 9: notification.send
    Duration: 45ms (async, non-blocking)
    Tags: channel=PUSH, delivered=true

Total Order Lifecycle: 10.1ms (API to user notification)
Critical Path: 8.1ms (API to fill confirmation)
```

---

## Alerting Strategy

### Severity Levels

```
P0 (Critical — immediate response, market hours):
    - Exchange FIX session down (any exchange)
    - Order processing stopped or > 5s queue wait time
    - Market data feed gap > 5 seconds
    - Settlement reconciliation mismatch detected
    - Database primary unavailable
    Action: page on-call, war room, potential regulatory notification

P1 (High — response within 5 minutes):
    - Order latency p99 > 500ms
    - Market data latency p99 > 10ms
    - Risk engine latency p99 > 200μs
    - WebSocket error rate > 1%
    - Redis failover triggered
    Action: page on-call engineer

P2 (Medium — response within 30 minutes):
    - Order rejection rate > 5% (unusual pattern)
    - WebSocket connections > 90% capacity
    - Database replica lag > 5 seconds
    - Contract note generation delay > 1 hour
    Action: alert on-call, investigate

P3 (Low — response within 4 hours):
    - Non-market-hours service degradation
    - Historical data API latency > 1s
    - GTT trigger processing delay > 30s
    - Backup job failure
    Action: ticket, next business day
```

### Market-Hours-Specific Alerts

```
These alerts are ONLY active during market hours (9:15 AM - 3:30 PM):

    - Any FIX session heartbeat missed → P0
    - Order throughput drops > 50% from rolling average → P0
    - Market data tick rate drops > 30% → P0 (exchange feed issue)
    - New WebSocket connection success rate < 95% → P1
    - API error rate > 0.5% → P1
    - Any risk engine state inconsistency detected → P0

These alerts are ONLY active outside market hours:

    - Settlement batch job not started by 16:30 → P1
    - Reconciliation not complete by 17:30 → P1
    - Next-day AMO count > 2× historical average → P2 (capacity planning)
```

---

## Financial Reconciliation Pipeline

### Daily Reconciliation Flow

```
16:00  Exchange publishes trade file (all trades for the day)
       ↓
16:05  Download trade file from exchange SFTP
       ↓
16:10  Parse exchange trade file into reconciliation database
       ↓
16:15  Run matching engine:
       FOR each trade in broker_trades:
           match = exchange_trades.find(
               exchange_trade_id = trade.exchange_trade_id
               AND instrument = trade.instrument
               AND qty = trade.quantity
               AND price = trade.price
           )
           IF match: mark RECONCILED
           ELSE: mark MISMATCH → alert
       ↓
16:30  Generate reconciliation report:
       - Total trades: 8,245,000
       - Matched: 8,245,000 (100%)
       - Mismatched: 0
       - Missing from exchange: 0
       - Extra in exchange: 0
       ↓
16:45  If mismatches > 0:
       - P0 alert to operations team
       - Individual mismatch investigation
       - Exchange support ticket if needed
       ↓
17:00  Compute settlement obligations per client
       ↓
17:30  Generate and email contract notes to clients
       ↓
18:00  Submit regulatory reports
```

---

## Logging Strategy

```
Log Levels by Service:

Order Path (OMS, Risk, Gateway):
    - INFO: every order placed, modified, cancelled, filled
    - WARN: risk check near-miss (margin < 110% of required)
    - ERROR: order processing failure, exchange rejection
    - No DEBUG in production (too verbose at 50K orders/sec)

Market Data (Feed Handler, Ticker):
    - INFO: feed connect/disconnect, sequence reset
    - WARN: sequence gap detected, feed latency spike
    - ERROR: feed parse error, connection failure
    - Tick data: NOT logged (too voluminous; stored in time-series DB)

Settlement:
    - INFO: every reconciliation step with counts
    - WARN: delayed processing, retry events
    - ERROR: reconciliation mismatch (always escalated)

Log Volume:
    Order logs: ~20M entries/day (~10 GB/day)
    Market data logs: ~1M entries/day (~500 MB/day)
    API access logs: ~100M entries/day (~50 GB/day)
    Total: ~60 GB/day, retained 90 days hot, 2 years cold
```
