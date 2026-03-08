# Interview Guide

## 45-Minute Pacing

### Minutes 0-5: Clarify Scope

**Key clarifying questions to ask (or expect):**

| Question | Why It Matters |
|----------|---------------|
| "Are we designing a stock broker (routes to exchange) or a stock exchange (runs matching engine)?" | Broker = routing + risk + portfolio; Exchange = matching engine + order book + market data. Completely different systems. |
| "Which market segments? Equities only, or also derivatives (F&O), commodities, currencies?" | F&O adds SPAN margin complexity, lot sizes, expiry management; equities alone is simpler |
| "Do we need real-time market data streaming or just on-demand quotes?" | Streaming requires WebSocket infrastructure, binary protocols, fan-out architecture |
| "What's the expected order volume?" | Drives whether you need co-location, and how aggressively you optimize the order path |
| "Do we need to support algorithmic/API trading?" | Adds rate limiting, WebSocket API, higher throughput requirements |

**Recommended scope for 45 minutes:**
- Stock broker platform (not exchange)
- Equities + F&O segments
- Real-time market data streaming
- Order placement + portfolio + risk management
- Discuss but do not fully design: settlement, charting, GTT

---

### Minutes 5-15: High-Level Architecture

Draw the architecture with these components:
1. **Client layer** → API Gateway → OMS (Order Management System)
2. **Order path**: OMS → Risk Engine → Order Gateway (co-located) → Exchange (FIX)
3. **Market data path**: Exchange Feed → Feed Handler (colo) → Ticker (WebSocket) → Users
4. **Data stores**: PostgreSQL (orders/trades), Redis (positions/margins), Time-series DB (OHLCV)
5. **Event bus**: Order/trade events for position updates, notifications, settlement

**Key points to make:**
- "The broker does NOT run a matching engine—the exchange does. Our job is to route orders fast and manage risk."
- "Market data fan-out to 500K concurrent WebSocket connections is the bandwidth-dominant challenge."
- "The risk engine must run in-process with the OMS—sub-100μs budget for pre-trade checks."
- "Market open at 9:15 AM creates a 10-15× traffic spike in 60 seconds—this is the scaling-defining moment."

---

### Minutes 15-28: Deep Dive — Order Flow + Risk Engine

This is where you differentiate. Focus on:

**1. Order Lifecycle**
- User places order → OMS validates → Risk engine checks margin, position limits, circuit breakers
- Order routed to exchange via FIX protocol through co-located gateway
- Exchange matching engine fills order (price-time priority)
- Execution report flows back → positions updated → margin recalculated
- Key insight: risk check must happen BEFORE sending to exchange (pre-trade, not post-trade)

**2. Exchange Connectivity**
- FIX (Financial Information eXchange) protocol over persistent TCP sessions
- Co-located gateway servers in exchange data center for sub-millisecond latency
- Dedicated leased lines between colo and broker data center
- Limited FIX sessions per broker (exchange allocates 10-20 sessions)
- Session failover: hot standby FIX session with sequence number synchronization

**3. Pre-Trade Risk Engine**
- Must complete in < 100μs (no network calls allowed)
- Checks: margin sufficiency, position limits, circuit breaker, order value limits
- State kept in-process memory, event-sourced from order/trade events
- Recovery: replay events from last checkpoint on restart
- Why not a separate service: network round-trip alone would add 500μs+

**4. Order Types and Their Complexity**
- Market: execute at best available price (simplest)
- Limit: execute at specified price or better (rests in order book)
- Stop-Loss (SL): triggered when price hits trigger_price, then sent as limit
- Stop-Loss Market (SL-M): triggered at trigger_price, sent as market
- Bracket: three-leg order (entry + target + stop-loss) auto-linked
- Cover: entry + stop-loss (margin benefit for hedged position)

---

### Minutes 28-38: Market Data Streaming + Scaling

**Market data architecture:**
- Exchange produces ~2M ticks/sec across all instruments (binary multicast feed)
- Feed handler in exchange colo: parse binary, filter, compress, send to DC via leased line
- Ticker servers: each handles ~50K WebSocket connections
- Subscription routing: only send instruments the user has subscribed to
- Binary WebSocket frames (not JSON): 60-90% bandwidth savings
- Batching: accumulate updates in 100ms windows, send single batched message
- Mode-based streaming: LTP (8 bytes) vs. quote (44 bytes) vs. full depth (184 bytes)

**Market open thundering herd:**
- 50,000 orders/sec burst at 9:15 AM (vs. 500/sec steady state)
- Solution: pre-provision to peak capacity (auto-scaling too slow for 60-second spike)
- AMO (After-Market Orders) processed in staged batches, not all at once
- Backpressure: queue orders with position estimate shown to user
- WebSocket connection storm: staggered reconnection with random jitter

---

### Minutes 38-43: Positions, Settlement, Reliability

**Position tracking:**
- Real-time: Redis (updated on every fill, sub-second latency)
- Persistent: PostgreSQL (end-of-day snapshot)
- Three views: intraday positions (MIS), delivery holdings (CNC), F&O positions (NRML)
- Position consistency is non-negotiable: stale positions → incorrect margin → unauthorized trades

**T+1 Settlement:**
- Trades today settle next business day via clearing corporation
- Broker reconciles trades against exchange file at 4 PM (100% match required)
- Net obligations computed: securities to deliver, funds to pay/receive
- Contract notes generated and emailed to clients

**Reliability:**
- Market hours availability: 99.99% (< 10 minutes downtime per year during trading)
- Zero order loss: WAL persistence before exchange submission
- FIX session failover: hot standby with < 5 second switchover
- Position recovery: event replay from Kafka checkpoint

---

### Minutes 43-45: Trade-offs + Discussion

Summarize 2-3 key trade-offs you made and why.

---

## What Makes Stock Trading Platform Uniquely Hard

| Challenge | Why It Is Unique | How It Shapes Architecture |
|-----------|-----------------|--------------------------|
| **Exchange as external matching authority** | Broker doesn't match orders—exchange does via FIX protocol | Co-located gateway, FIX session management, no local matching engine |
| **Market open thundering herd** | Predictable but extreme 15× spike every single day at 9:15 AM | Pre-provisioned capacity, AMO staging, backpressure queuing |
| **Sub-microsecond risk checks** | Every order must pass margin/limit checks before reaching exchange | In-process risk state, no network calls, lock-free data structures |
| **Real-time position consistency** | Stale position = incorrect margin = unauthorized trades | Redis for speed, event-sourced state, immediate fill processing |
| **Binary market data fan-out** | 2M ticks/sec → 500K connections, each subscribed to different instruments | Subscription routing, binary frames, mode-based streaming, batching |
| **Regulatory audit trail** | Every order/modify/cancel logged with microsecond precision for 7 years | Append-only log, tamper-evident hash chain, WORM storage |
| **T+1 settlement** | Trades and fund transfers don't settle instantly | Position vs. holdings distinction, clearing corp integration, reconciliation |

---

## Key Trade-Offs Table

| Decision | Option A | Option B | Recommendation | Rationale |
|----------|----------|----------|----------------|-----------|
| **Risk engine placement** | Separate microservice | In-process with OMS | In-process | Network round-trip (500μs+) unacceptable when budget is 100μs; accept tighter coupling |
| **Market data format** | JSON (readable) | Binary frames (compact) | Binary | 60-90% bandwidth savings at 500K connections; JSON is 1.5 GB/s vs. binary 600 MB/s |
| **Position storage** | PostgreSQL only | Redis + PostgreSQL | Redis + PostgreSQL | PostgreSQL write latency (2-5ms) too slow for real-time position updates; Redis for speed, PG for durability |
| **Market open strategy** | Auto-scale | Pre-provision | Pre-provision | Auto-scaling takes 2-3 minutes; spike lasts 60 seconds; pre-provision wastes resources but ensures availability |
| **Order queue at peak** | Reject excess | Queue with backpressure | Queue with backpressure | Rejecting orders at market open = lost revenue + angry traders; queuing with transparency is better UX |
| **WebSocket reconnection** | Immediate | Staggered with jitter | Staggered | Immediate reconnection from 400K clients = connection storm; 0-30s random jitter spreads the load |
| **Candle computation** | On-demand | Pre-aggregated | Pre-aggregated | Computing OHLCV from raw ticks on every chart request is too expensive; pre-aggregate and serve from cache |
| **Tick data retention** | Full history | 90-day rolling + aggregated | 90-day + aggregated | Raw ticks at 500 GB/day = 125 TB/year; keep 90 days raw, aggregate older to 1-min candles |
| **FIX session failover** | Cold standby | Hot standby | Hot standby | Cold standby requires session re-establishment (30s+); hot standby switches in < 5s |
| **Margin computation** | On-demand per order | Pre-computed + delta | Pre-computed + delta | Full SPAN recomputation per order too slow; maintain running margin and apply deltas on new orders |

---

## Trap Questions & Strong Answers

### "How do you handle two users buying the last share of a stock?"

**Weak answer:** "We use a distributed lock on the stock."

**Strong answer:** "The broker doesn't manage stock inventory—the exchange does. Both orders are routed to the exchange via FIX protocol. The exchange's matching engine processes them against the sell-side order book using price-time priority. If only one share is available at the best ask, the first order to arrive at the exchange gets filled; the second order either gets filled at a worse price (if more sellers exist at higher prices) or rests in the order book as an unfilled limit order. The broker's role is to route as fast as possible—not to arbitrate. We never build our own lock on stock availability."

### "What happens if your system crashes after sending an order to the exchange but before recording the fill?"

**Weak answer:** "We use a two-phase commit between our database and the exchange."

**Strong answer:** "Two-phase commit across the exchange boundary is impossible—FIX protocol doesn't support it. Instead, we use write-ahead logging: every order is persisted to our WAL before being sent to the exchange. On crash recovery, we: (1) replay WAL to identify orders sent but without recorded fills, (2) query the exchange for execution reports on those orders using FIX Order Status Request, (3) reconcile. Additionally, the exchange sends execution reports for all fills regardless of our state, so even if we crash, the fills are safe on the exchange side. The end-of-day trade file reconciliation serves as the final safety net—it catches any discrepancy."

### "Why not run your own matching engine instead of routing to the exchange?"

**Weak answer:** "It would be faster."

**Strong answer:** "Regulatory prohibition. In regulated markets (India, US, EU), only licensed exchanges can operate matching engines. Brokers are intermediaries—they route client orders to exchanges and manage risk. Operating an unlicensed matching engine is called 'internalization' and is either prohibited or heavily regulated (dark pools require separate licensing). Even if it were allowed, running our own matching engine would mean we control price discovery, which creates conflicts of interest (payment for order flow, front-running). The correct architecture is: broker validates + routes, exchange matches + reports."

### "How do you ensure positions are always accurate?"

**Weak answer:** "We update positions after each trade."

**Strong answer:** "Position accuracy requires event-sourced, single-writer architecture. Each user's position state is owned by exactly one process (single-writer per user via consistent hashing). Positions are derived from the trade event stream—never updated directly. On every fill event: (1) update buy/sell quantities and averages, (2) recalculate unrealized P&L using latest market price, (3) recalculate available margin. This happens in Redis for speed (< 1ms). The critical invariant is: sum of all trade fills must equal the current position. We verify this invariant on every update. If there's ever a mismatch, we halt trading for that user and alert operations—a position discrepancy means potential financial loss."

### "What if the risk engine has stale margin data and approves an order it shouldn't?"

**Weak answer:** "We use strong consistency everywhere."

**Strong answer:** "The risk engine uses event-sourced state: its margin data is derived from the definitive stream of order and trade events. It can never be 'stale' in the traditional sense—it processes events in order. The dangerous scenario is: (1) user places order A, (2) margin blocked for A, (3) order A fills, (4) user places order B before the fill event for A reaches the risk engine. In this case, the margin from A is still blocked, so it's actually more conservative, not less. The risk is in the opposite direction: fills that release margin may arrive late, causing the risk engine to reject orders it should accept. We handle this by processing fill events with highest priority. The real danger is a bug in margin calculation logic—which is why we run shadow-mode validation: every risk decision is asynchronously re-verified by an independent calculator, and mismatches trigger alerts."

---

## Follow-Up Deep Dives

If the interviewer wants to go deeper, be prepared for:

| Topic | Key Points |
|-------|-----------|
| **Algorithmic trading platform** | API rate limiting, strategy backtesting, co-location for algo users, latency-sensitive order types |
| **Options pricing** | Black-Scholes/binomial models, Greeks calculation (delta, gamma, theta, vega), implied volatility |
| **Market microstructure** | Bid-ask spread, market impact, slippage, order book dynamics, hidden orders |
| **Regulatory reporting** | SEBI reporting formats, XBRL submissions, annual system audits, cyber security compliance |
| **Corporate actions** | Dividends, stock splits, bonus issues, rights issues, mergers—how they affect holdings and positions |
| **Multi-exchange routing** | Smart order routing: choose NSE vs. BSE based on liquidity, price, latency; best execution obligation |

---

## Red Flags to Avoid

| Red Flag | Why It Is Wrong | Correct Approach |
|----------|----------------|------------------|
| "We run our own matching engine" | Illegal for brokers in regulated markets | Route to exchange via FIX; exchange runs matching engine |
| "Risk checks happen after the order is sent to exchange" | Unauthorized orders could execute before validation | Pre-trade risk checks BEFORE exchange submission |
| "We use JSON for market data streaming" | 2.5× bandwidth vs. binary at 500K connections | Binary WebSocket frames with mode-based streaming |
| "We store positions in PostgreSQL and query on every fill" | 2-5ms write latency unacceptable for position consistency | Redis for real-time, PostgreSQL for persistence |
| "We auto-scale at market open" | Auto-scaling takes minutes; spike lasts 60 seconds | Pre-provision to peak capacity before market open |
| "We can handle order spikes with a simple queue" | Queue without backpressure = unbounded memory growth | Queue with bounded depth + backpressure + position feedback |
| "We log orders in a regular relational table" | Regulatory audit trail must be immutable, tamper-evident | Append-only audit log with hash chain, WORM storage |
| "Positions update every 5 seconds" | 5-second stale position = incorrect margin for seconds | Event-driven update on every fill, sub-second latency |
