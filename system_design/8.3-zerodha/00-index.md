# Zerodha — Stock Trading Platform Design

## System Overview

A stock trading platform—exemplified by Zerodha Kite, Interactive Brokers, Robinhood, and Fidelity—enables retail and institutional investors to place buy/sell orders on stock exchanges, receive real-time market data, manage portfolios, and track positions across equities, derivatives, commodities, and currencies. Zerodha processes over 10 million orders daily across 12+ million active users, contributing approximately 15–18% of India's retail trading volume. The core engineering challenge is the intersection of **ultra-low-latency order routing** (orders must reach the exchange matching engine within microseconds via co-located infrastructure and FIX protocol), **real-time market data fan-out** (streaming millions of tick-by-tick quotes per second to hundreds of thousands of concurrent WebSocket connections), **pre-trade risk management** (validating margin sufficiency, position limits, and circuit breaker checks before every order reaches the exchange), and **market-open thundering herd** (handling 10–15× normal load in the first 5 minutes of trading at 9:15 AM when millions of users simultaneously place queued orders). Unlike general web applications, stock trading platforms operate under strict regulatory oversight (SEBI/SEC), where every order, modification, and cancellation must be audit-logged, settlement follows T+1 cycles through clearing corporations, and system downtime during market hours directly translates to regulatory penalties and financial loss.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Write-heavy during market hours (order placement/modification); read-heavy for market data streaming and portfolio views |
| **Latency Sensitivity** | Extreme—order-to-exchange latency target < 1ms via co-location; market data propagation < 5ms to end users |
| **Consistency Model** | Strong consistency for order state and positions; eventual consistency for portfolio P&L and historical data |
| **Data Volume** | Very High—10M+ orders/day, millions of market data ticks/second across 5,000+ tradeable instruments |
| **Throughput Spikes** | 10–15× load at market open (9:15 AM); 3–5× at market close (3:30 PM); event-driven spikes on volatile days |
| **Architecture Model** | Event-driven order pipeline; binary WebSocket streaming for market data; co-located exchange gateway |
| **Regulatory Burden** | Very High—SEBI mandated audit trails, margin rules, circuit breakers, settlement obligations, KYC/AML |
| **Financial Criticality** | Extreme—incorrect order execution, double-fills, or position miscalculation directly causes monetary loss |
| **Complexity Rating** | **Very High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Order matching internals, market data fan-out, market open thundering herd |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Horizontal scaling, exchange failover, market hours reliability |
| [06 - Security & Compliance](./06-security-and-compliance.md) | SEBI compliance, 2FA, audit trails, insider trading detection |
| [07 - Observability](./07-observability.md) | Order latency metrics, market data lag, financial reconciliation |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Stock Trading (This) | Payment Gateway (5.5) | E-Commerce (8.1) | Crypto Exchange |
|--------|---------------------|----------------------|-------------------|-----------------|
| **Order Lifecycle** | Place → validate → route to exchange → match → fill → settle (T+1) | Initiate → authorize → capture → settle | Cart → pay → fulfill → ship | Place → match → fill → settle (instant) |
| **Latency Requirement** | Sub-millisecond to exchange; < 5ms market data to user | < 2s payment processing | < 500ms page load | < 10ms order matching |
| **Matching Engine** | Exchange-operated (NSE/BSE); broker routes orders | No matching—payment processor handles | No matching—inventory reservation | Self-operated matching engine |
| **Regulatory Oversight** | SEBI/SEC—every order audit-logged, margin rules, circuit breakers | PCI-DSS, RBI guidelines | Consumer protection, tax | Evolving (less regulated) |
| **Market Data** | Tick-by-tick streaming via exchange multicast feed | No real-time data streaming | Product catalog (static) | Order book streaming |
| **Settlement** | T+1 via clearing corporation (NSCCL/ICCL) | T+1 to T+3 via payment network | Instant digital / days for shipping | Instant (on-chain or custodial) |
| **Peak Pattern** | Predictable daily spikes: market open (9:15 AM), close (3:30 PM) | Unpredictable (sale events) | Unpredictable (flash sales) | 24/7, event-driven spikes |
| **Risk Management** | Pre-trade: margin check, position limits, circuit breakers | Fraud detection, velocity checks | Inventory reservation | Liquidation engine, margin calls |

---

## What Makes This System Unique

1. **Exchange as External Matching Authority**: Unlike crypto exchanges that run their own matching engines, stock brokers route orders to regulated exchanges (NSE, BSE) via FIX protocol. The exchange's matching engine—not the broker—determines fill price and quantity using price-time priority. The broker's architecture must optimize for order routing speed while the exchange controls execution.

2. **Co-Location and Dedicated Leased Lines**: To minimize order-to-exchange latency, brokers deploy gateway servers in exchange co-location facilities connected via dedicated leased lines. Market data flows from exchange multicast feeds through co-located servers, gets compressed, and streams to the broker's data center—creating a two-tier latency architecture (microseconds at colo, milliseconds to end users).

3. **Market Open Thundering Herd (9:15 AM Problem)**: Indian equity markets open at 9:15 AM, and millions of users simultaneously place queued orders within the first 60 seconds. This creates a 10–15× traffic spike that must be absorbed without order loss or system degradation—a predictable but extreme scaling challenge.

4. **Pre-Trade Risk Checks at Wire Speed**: Every order must pass margin sufficiency, position limit, and circuit breaker validations before reaching the exchange. These checks must execute in microseconds to avoid adding latency to the order path—making the risk engine one of the most performance-critical components.

5. **Real-Time Market Data Fan-Out**: The exchange produces tick-by-tick data for 5,000+ instruments. The broker must consume this via binary multicast feeds, aggregate into OHLCV candles, compute technical indicators, and stream to hundreds of thousands of concurrent WebSocket connections—all with < 5ms end-to-end latency.

6. **T+1 Settlement and Position Tracking**: Trades executed today settle the next business day through clearing corporations. The broker must track intraday positions (for margin), end-of-day obligations (for settlement), and historical holdings—maintaining three distinct views of the same portfolio simultaneously.

7. **Regulatory Audit Trail for Every Action**: SEBI mandates that every order placement, modification, cancellation, and execution be logged with microsecond timestamps, client IP, and device fingerprint. These logs must be immutable, retained for years, and producible on regulatory demand—creating a write-heavy append-only audit system.

---

## Quick Reference: Scale Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Registered users | ~12M+ | India's largest retail broker |
| Active trading users | ~7M | Users who traded in last 30 days |
| Orders per day | ~10M | Average across equity + F&O + commodity |
| Peak orders/second | ~50,000 | Market open spike (first 5 minutes) |
| Steady-state orders/second | ~500 | Mid-day average |
| Market data ticks/second | ~2M+ | Across all instruments from exchange feed |
| Concurrent WebSocket connections | ~500K+ | Peak during market hours |
| Tradeable instruments | ~5,000+ | Equities, F&O, commodities, currencies |
| Order-to-exchange latency | < 1ms | Via co-located gateway |
| Market data end-to-end latency | < 5ms | Exchange feed → user's screen |
| Market hours | 9:15 AM – 3:30 PM IST | 6.25 hours/day, 5 days/week |
| Settlement cycle | T+1 | Next business day via NSCCL/ICCL |
| Database size | Multi-TB | Hundreds of billions of rows (PostgreSQL) |
| Daily market data volume | ~50 GB | Raw tick data across all instruments |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [5.5 - Payment Processing System](../5.5-payment-processing-system/) | Settlement processing, financial reconciliation, idempotent transactions |
| [1.5 - Distributed Log-Based Broker](../1.5-distributed-log-based-broker/) | Event streaming for order events, market data distribution |
| [8.1 - Amazon E-Commerce](../8.1-amazon/) | High-throughput order processing, inventory management patterns |
| [8.4 - Digital Wallet](../8.4-digital-wallet/) | Real-time balance tracking, financial audit trails |
| [4.2 - Real-Time Notification System](../4.2-real-time-notification-system/) | WebSocket fan-out, push notification patterns |

---

## Sources

- Zerodha Tech Blog — Scaling with Common Sense
- Zerodha Tech Blog — Being Future Ready with Common Sense
- Zerodha Tech — FOSS Stack and Open Source Projects
- NSE India — Real-Time Data Feed Specifications
- NSE IFSC — Tick by Tick Feed Specification (Binary Multicast Protocol)
- FIX Trading Community — FIX Protocol Implementation Guide
- SEBI — Stock Brokers Regulations 2025/2026
- WFE — World Federation of Exchanges: Market Microstructure Standards
- Industry: How to Build a Fast Limit Order Book (WK Selph)
