# Cryptocurrency Exchange System Design

## System Overview

A cryptocurrency exchange---exemplified by Coinbase, Binance, Kraken, and OKX---provides a centralized marketplace where users trade digital assets (Bitcoin, Ethereum, stablecoins, and hundreds of altcoins) against each other or against fiat currencies. Binance processes over 1.4 million orders per second; Coinbase handles 500,000+ orders per second with sub-5ms matching latency. The core engineering challenge is the intersection of **matching engine determinism** (every order must be matched strictly by price-time priority with zero tolerance for out-of-order execution or phantom fills), **custodial wallet security** (the exchange holds billions in user assets across hot/warm/cold wallets, where a single private key compromise can result in catastrophic loss), **order book consistency** (the real-time order book visible to all users must reflect the true state of the matching engine, with L2/L3 market data distributed to millions of WebSocket subscribers within microseconds of a trade), and **multi-chain asset management** (supporting deposits and withdrawals across 50+ blockchain networks, each with different confirmation times, address formats, fee models, and finality guarantees). Unlike a traditional stock exchange that operates during fixed market hours with a single clearing house, a cryptocurrency exchange runs 24/7/365 with no circuit breakers, must manage its own custody (acting as its own custodian and clearinghouse), and faces unique challenges like blockchain reorganizations, cross-chain bridging, flash loan attacks, and rapidly evolving regulatory frameworks across hundreds of jurisdictions.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Mixed: extremely write-heavy on the matching engine (order placement, cancellation, fills); extremely read-heavy on market data (order book snapshots, trade streams, candlestick data) |
| **Latency Sensitivity** | Ultra-high---matching engine targets sub-millisecond order processing; market data must propagate within 1-5ms; deposit confirmation depends on blockchain (10min BTC, 12s ETH) |
| **Consistency Model** | Strong consistency for matching engine and balance operations (no double-spend, no phantom fills); eventual consistency for market data distribution and analytics |
| **Financial Integrity** | Zero tolerance---user asset balances must match on-chain reserves (proof of reserves); no order can be filled without sufficient balance; no withdrawal without valid signatures |
| **Data Volume** | Very High---1M+ orders/sec peak, 100K+ trades/sec, 50M+ WebSocket messages/sec for market data, petabytes of historical tick data |
| **Architecture Model** | Event-sourced matching engine as the single source of truth; CQRS for read-heavy market data; event-driven for settlement, notifications, and risk management |
| **Regulatory Burden** | Very High---KYC/AML in 99+ jurisdictions, FATF travel rule, proof of reserves, money transmitter licenses, MiCA (EU), varying per-jurisdiction requirements |
| **Complexity Rating** | **Extreme** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Matching engine internals, order book structure, wallet security, race conditions |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Horizontal scaling, fault tolerance, disaster recovery, multi-region |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Custody security, KYC/AML, travel rule, proof of reserves, threat model |
| [07 - Observability](./07-observability.md) | Matching latency, order book health, wallet monitoring, SLI/SLO dashboards |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs, scoring rubric |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Cryptocurrency Exchange (This) | Stock Exchange (Traditional) | Digital Wallet (8.4) | Payment Gateway (8.2) |
|--------|-------------------------------|-----------------------------|--------------------|---------------------|
| **Trading Hours** | 24/7/365, no halts | Fixed market hours with circuit breakers | N/A (not a trading system) | N/A |
| **Settlement** | Near-instant (T+0 on-exchange); blockchain-dependent for withdrawals | T+1 or T+2 via clearinghouse | Instant (same-ledger) | T+0 to T+2 via bank rails |
| **Custody Model** | Exchange is its own custodian (hot/warm/cold wallets, HSM, MPC) | Separate custodian/depository (DTCC) | Escrow at partner bank | No custody (pass-through) |
| **Asset Type** | Digital tokens on 50+ blockchains | Equities, bonds (single clearing system) | Fiat currency in internal ledger | Fiat via card/bank networks |
| **Order Types** | Limit, market, stop-limit, OCO, iceberg, post-only | Limit, market, stop, MOC, LOC | N/A | N/A |
| **Matching Engine** | In-house, deterministic, event-sourced | Provided by exchange operator (NASDAQ OMX, etc.) | N/A | N/A |
| **Regulatory Model** | VASP/MSB license, KYC/AML, FATF travel rule, MiCA | SEC/FINRA regulated, established framework | Money transmitter license | Payment processor license |
| **Unique Risks** | Blockchain reorgs, 51% attacks, smart contract exploits, flash crashes | Market manipulation, insider trading | Double-spend on internal ledger | Chargeback fraud |

---

## What Makes This System Unique

1. **Deterministic Matching Engine as Event-Sourced Core**: The matching engine is the heart of the exchange---a single-threaded, deterministic state machine that processes orders in strict sequence. Every input (new order, cancel, amend) produces a deterministic sequence of output events (fills, partial fills, rejections). This event-sourced design means the entire exchange state can be reconstructed by replaying the event log, enabling audit, debugging, and disaster recovery. The matching engine must never lose an order, never produce a phantom fill, and never match orders out of price-time priority.

2. **Tri-Tier Custody Architecture (Hot/Warm/Cold)**: The exchange holds billions in user assets. Hot wallets (online, automated) handle real-time withdrawals but hold minimal funds (2-5% of reserves). Warm wallets (online but require multi-signature approval) act as a buffer. Cold wallets (air-gapped, HSM-protected) hold 90%+ of reserves. The challenge is balancing liquidity (enough in hot wallets for withdrawal demand) with security (minimizing online exposure). A single key compromise can drain hundreds of millions---making key management (MPC, threshold signatures, HSM) the most critical security decision.

3. **Multi-Chain Deposit and Withdrawal Pipeline**: Unlike traditional finance where money moves through a single rail (bank network), a crypto exchange must monitor 50+ blockchain networks simultaneously, each with different address generation schemes (ECDSA vs Ed25519), transaction formats (UTXO vs account model), confirmation requirements (6 blocks for BTC, 64 for ETH), and fee mechanisms (gas, priority fees, UTXO fees). The deposit pipeline must detect incoming transactions, wait for sufficient confirmations, credit user balances, and handle blockchain reorganizations that can reverse previously confirmed deposits.

4. **Real-Time Order Book Distribution at Scale**: Every trade, every order placement, and every cancellation changes the order book. This state must be distributed to millions of concurrent WebSocket subscribers (traders, market makers, aggregators) within milliseconds. The system produces L1 (best bid/ask), L2 (aggregated price levels), and L3 (individual orders) feeds, generating 50M+ messages per second during peak trading. This is a fan-out problem at extreme scale with strict ordering requirements.

5. **Margin Trading and Liquidation Engine**: Leveraged trading allows users to borrow funds to amplify positions (up to 125x on some exchanges). The liquidation engine must continuously monitor all leveraged positions, calculate unrealized PnL against real-time mark prices, and force-liquidate positions that breach maintenance margin before losses exceed collateral. In volatile markets, thousands of liquidations can cascade simultaneously, creating a feedback loop (liquidation → market impact → more liquidations). The engine must process these without crashing, without unfair execution, and without leaving bad debt.

6. **Proof of Reserves and Regulatory Compliance**: Post-FTX, exchanges must cryptographically prove that user deposits are fully backed by on-chain reserves. This involves Merkle tree proofs where each user can independently verify their balance is included in the total reserves, combined with on-chain attestation of wallet balances. Simultaneously, the exchange must comply with KYC/AML regulations in 99+ jurisdictions, implement the FATF travel rule for inter-VASP transfers, and maintain transaction monitoring for suspicious activity.

---

## Quick Reference: Scale Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Registered users | ~150M | Across global user base |
| Monthly active traders | ~20M | ~13% monthly active rate |
| Supported trading pairs | 500+ | BTC/USDT, ETH/BTC, etc. |
| Supported blockchains | 50+ | EVM, Bitcoin, Solana, Cosmos, etc. |
| Orders per second (peak) | ~1.4M | During flash crashes or major events |
| Trades per second (peak) | ~100K | Fills generated by matching engine |
| Matching latency (p99) | < 5ms | From order receipt to fill confirmation |
| Market data messages/sec | ~50M | WebSocket updates across all subscribers |
| Daily trading volume | ~$50B | Notional across all pairs |
| Hot wallet balance | 2-5% | Of total user deposits |
| Cold wallet balance | 90-95% | HSM/MPC protected, air-gapped |
| Deposit confirmation time | 10s-60min | Depends on blockchain (Solana: 0.4s, BTC: 60min) |
| Withdrawal processing time | < 30min | Automated for small amounts; manual review for large |
| Proof of reserves frequency | Monthly | Merkle tree + on-chain attestation |
| Uptime SLA | 99.99% | Critical during market volatility |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [8.3 - Zerodha](../8.3-zerodha/) | Order matching, financial ledger patterns, market data, regulatory compliance |
| [8.4 - Digital Wallet](../8.4-digital-wallet/) | Double-entry ledger, balance management, custodial responsibility, KYC tiers |
| [8.2 - Stripe/Razorpay](../8.2-stripe-razorpay/) | Payment processing, idempotency, settlement reconciliation |
| [1.5 - Distributed Log-Based Broker](../1.5-distributed-log-based-broker/) | Event streaming for trade events, order event sourcing, market data distribution |
| [4.1 - Notification System](../4.1-notification-system/) | Real-time trade notifications, price alerts, WebSocket infrastructure |
| [8.5 - Fraud Detection System](../8.5-fraud-detection-system/) | Transaction monitoring, anomaly detection, risk scoring |

---

## Sources

- Coinbase Engineering --- Matching Engine Architecture and Exchange Infrastructure
- Binance Engineering --- High-Performance Trading Engine Design
- Kraken --- Proof of Reserves Implementation and Custody Architecture
- FATF --- Updated Guidance for Virtual Asset Service Providers (Travel Rule)
- Cobo --- MPC Wallet Security and Institutional Custody Solutions
- MiCA (EU) --- Markets in Crypto-Assets Regulation Framework
- AlgoTeq --- Low-Latency Matching Engine Design for Electronic Trading
- Chainalysis --- Cryptocurrency Compliance and AML Monitoring
- FinCEN --- Virtual Currency Business Registration and Compliance Requirements
- CoinGecko --- Exchange Volume and Market Data Analytics
