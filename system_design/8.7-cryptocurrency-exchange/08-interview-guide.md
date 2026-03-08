# Interview Guide

## 45-Minute Pacing

### Minutes 0-5: Clarify Scope

**Key clarifying questions to ask (or expect):**

| Question | Why It Matters |
|----------|---------------|
| "Are we designing a spot exchange, derivatives exchange, or both?" | Derivatives add perpetual futures, funding rates, and a much more complex liquidation engine; spot is the core |
| "How many trading pairs? Are we supporting fiat on/off ramp?" | Drives matching engine scaling (1 engine per pair); fiat adds banking integration complexity |
| "What is the expected order throughput? Are we serving HFT market makers?" | Determines whether sub-millisecond latency is required; shapes matching engine architecture |
| "Do we need to support margin trading and liquidations?" | Adds an entire risk management subsystem; changes balance management significantly |
| "Is custody in scope---do we manage our own wallets?" | Most differentiation comes from custody architecture; critical for security discussion |
| "Which blockchains do we need to support?" | Each chain family requires different deposit/withdrawal logic |

**Recommended scope for 45 minutes:**
- Centralized spot exchange with 500+ trading pairs
- Full custody (hot/warm/cold wallet architecture)
- Deposits and withdrawals across multiple blockchain families
- Focus on: matching engine design, order book, custody security, deposit/withdrawal pipeline
- Discuss but do not fully design: margin trading, derivatives, fiat on-ramp

---

### Minutes 5-15: High-Level Architecture

Draw the architecture with these components:
1. **Client layer** → API Gateway → WebSocket Gateway
2. **Trading core**: Order Management Service → Pre-Trade Risk Check → Matching Engine (per pair)
3. **Balance layer**: Balance Service, Settlement Service, Ledger (double-entry)
4. **Custody layer**: Hot Wallet, Warm Wallet, Cold Wallet, MPC/HSM Signing
5. **Blockchain layer**: Deposit Monitor, Withdrawal Broadcaster, Blockchain Nodes
6. **Market data**: Order Book Aggregator, Candlestick Generator → WebSocket fan-out
7. **Data stores**: Relational DB (balances, orders), Time-series DB (market data), Event Log (matching engine), Redis (caching, rate limiting)

**Key points to make:**
- "The matching engine is single-threaded and deterministic per trading pair. This guarantees that given the same input sequence, it produces the exact same output---enabling audit, replay, and recovery."
- "We use event sourcing: the matching engine's event log is the source of truth. All downstream systems---balances, market data, analytics---consume events from this log."
- "Custody follows a hot/warm/cold architecture. Hot wallet holds 2-5% of assets for automated withdrawals. Cold wallet holds 90%+ in air-gapped HSMs. MPC threshold signatures mean no single key can move funds."
- "Balance operations use optimistic concurrency control to prevent double-spend across concurrent order placement and withdrawal."

---

### Minutes 15-28: Deep Dive --- Matching Engine + Order Book

This is where you differentiate. Focus on:

**1. Price-Time Priority Matching**
- The order book is two red-black trees (bids sorted descending, asks sorted ascending)
- Each price level holds a FIFO queue of orders
- Incoming order matches against the best opposite price first, then walks the book
- Maker's price is the fill price (the resting order determines the price)
- Self-trade prevention: detect when maker and taker are the same user

**2. Order Types and Their Matching Behavior**
- **Limit (GTC)**: Match what you can, rest the remainder on the book
- **Market**: Match immediately at best available prices; unfilled remainder is cancelled
- **IOC (Immediate or Cancel)**: Like market but with a price limit; unfilled remainder cancelled
- **FOK (Fill or Kill)**: Either fill the entire quantity or reject entirely (atomic)
- **Stop-Limit**: Dormant until trigger price is hit; then converted to limit order
- **Post-Only**: Reject if it would immediately match (maker-only for fee optimization)

**3. Determinism and Event Sourcing**
- Single-threaded = no race conditions, no lock contention, deterministic
- Every order and cancel is written to an append-only event log before processing
- Periodic snapshots (every 60s) for fast recovery: load snapshot + replay events since
- Standby engine consumes the same input stream; can take over in < 1 second

**4. Sequence Numbers and Gap Detection**
- Every output event gets a monotonic sequence number
- Market data clients track sequence numbers; any gap triggers a full snapshot re-sync
- This guarantees eventual consistency of the distributed order book view

---

### Minutes 28-38: Deep Dive --- Custody and Deposit/Withdrawal

**Hot/Warm/Cold Architecture:**
- Cold (90-95%): Air-gapped, HSM-stored key shares, 3-of-5 ceremony to move funds, 4-24h processing
- Warm (3-8%): Online with MPC (2-of-3 threshold), rate-limited, automated rebalancing to hot
- Hot (2-5%): Fully automated MPC signing, per-transaction amount limits, anomaly detection on every withdrawal

**MPC vs Multi-Sig:**
- "We use MPC rather than multi-sig because MPC is chain-agnostic (works for any blockchain, even those without native multi-sig), the full private key never exists anywhere, and on-chain the transaction looks like a normal single-signature transaction (lower fees, better privacy)."

**Deposit Pipeline:**
1. Generate unique address per user per chain (HD wallet derivation, BIP-44)
2. Monitor blockchain nodes for incoming transactions to our addresses
3. Track confirmations (6 for BTC, 64 for ETH---to protect against reorgs)
4. After sufficient confirmations, credit user balance via ledger entry
5. Reorg protection: continue monitoring credited deposits; reverse if block hash changes

**Withdrawal Pipeline:**
1. User requests withdrawal → lock balance → fraud/risk check
2. Address screening (sanctions, known-bad addresses)
3. Small amounts: auto-approve → MPC sign from hot wallet → broadcast
4. Large amounts: queue for manual compliance review → sign from warm/cold wallet
5. Track confirmation until finalized; notify user

**Hot Wallet Rebalancing:**
- Model predicted withdrawal demand (rolling 4h window)
- If hot wallet < 50% of target: trigger warm → hot sweep
- If hot wallet > 200% of target: sweep excess to warm
- Never exceed absolute cap per asset (limits blast radius of compromise)

---

### Minutes 38-43: Market Data + Scaling

**Market Data Distribution:**
- Matching engine emits events → Market Data Processor → Regional Relays → Edge WebSocket Servers → Users
- Hierarchical fan-out handles 50M+ messages/sec
- L2 (aggregated depth) for most users; L3 (individual orders) for market makers
- Conflation: batch updates in 100ms windows for standard subscribers; zero conflation for HFT

**Matching Engine Scaling:**
- One engine per pair (horizontal partitioning by pair)
- Hot standby per engine (zero-loss failover in < 1 second)
- Engine runs on bare metal with CPU pinning, kernel bypass networking, pre-allocated memory pools

**Balance Database Scaling:**
- Sharded by user_id (consistent hashing)
- Trade settlement batched: accumulate 100ms of fills, apply net changes per shard
- Read replicas for order history and account queries

---

### Minutes 43-45: Trade-offs + Discussion

Summarize 2-3 key trade-offs:
1. **Single-threaded matching vs. parallelism**: Single-threaded guarantees determinism (essential for audit/replay) but limits per-pair throughput. Acceptable because one thread can handle 500K orders/sec, and pairs are independent.
2. **Hot wallet size vs. security**: Larger hot wallet = faster withdrawals but higher risk. Smaller = safer but slower. Dynamic rebalancing based on predicted demand is the middle ground.
3. **Confirmation requirements vs. user experience**: More confirmations = safer from reorgs but slower deposits. Dynamic thresholds based on deposit amount (small deposits = fewer confirmations).

---

## What Makes Cryptocurrency Exchange Uniquely Hard

| Challenge | Why It Is Unique | How It Shapes Architecture |
|-----------|-----------------|--------------------------|
| **Deterministic matching** | Every trade must be reproducible for audit and regulatory review | Single-threaded event-sourced engine; no non-deterministic operations |
| **Self-custody of billions** | Exchange is its own custodian; no DTCC/clearinghouse safety net | Hot/warm/cold tiers; MPC signatures; air-gapped key storage |
| **Multi-chain complexity** | 50+ blockchains with different models (UTXO, account, slots) | Per-chain microservices; blockchain gateway abstraction |
| **24/7/365 operation** | No market close, no maintenance window, no circuit breaker | Hot standby failover; rolling upgrades; chaos engineering |
| **Regulatory fragmentation** | KYC/AML rules differ across 99+ jurisdictions | Modular compliance engine; per-jurisdiction rule configuration |
| **Proof of reserves** | Must cryptographically prove solvency (post-FTX era) | Merkle tree construction; on-chain attestation; public audits |
| **Liquidation cascades** | Leveraged positions liquidating can crash the market further | Incremental liquidation; insurance fund; ADL mechanism |

---

## Key Trade-Offs Table

| Decision | Option A | Option B | Recommendation | Rationale |
|----------|----------|----------|----------------|-----------|
| **Matching thread model** | Single-threaded per pair | Multi-threaded with locks | Single-threaded | Determinism > throughput; 500K orders/sec is sufficient per pair |
| **State persistence** | Write-ahead log + snapshots | In-memory only with replication | WAL + snapshots | Replication alone cannot guarantee zero loss during network partition |
| **Custody signing** | Multi-sig (on-chain) | MPC (off-chain threshold) | MPC | Chain-agnostic; no on-chain key structure exposure; lower gas costs |
| **Balance update timing** | Synchronous with matching | Asynchronous (event-driven) | Asynchronous | Matching engine must not block on DB writes; settlement is separate concern |
| **Market data distribution** | Direct from engine to clients | Via relay/fan-out layer | Relay layer | Decouples engine from subscriber count; enables conflation and regional distribution |
| **Confirmation threshold** | Fixed per chain | Dynamic (based on amount + chain state) | Dynamic | Small deposits can be credited faster; large deposits warrant extra caution |
| **Hot wallet sizing** | Static allocation | Dynamic based on demand prediction | Dynamic | Reduces exposure during low-demand periods; increases availability during spikes |
| **Liquidation approach** | Full position liquidation | Incremental (25% steps) | Incremental | Reduces market impact; gives users chance to add margin; fewer cascade effects |

---

## Trap Questions & Strong Answers

### "How does the matching engine ensure fairness?"

**Weak answer:** "We process orders in the order they arrive."

**Strong answer:** "The matching engine enforces strict price-time priority. Orders are matched first by price (best price first), then by time (earliest order at the same price level first). The engine is single-threaded and deterministic---there is no possibility of thread scheduling reordering inputs. The input queue is a FIFO. Every order gets a monotonic sequence number at the point of entry, and this sequence is preserved in the event log, allowing auditors to verify that no order was unfairly prioritized. We also implement self-trade prevention to ensure a user's own orders don't match against each other, which could be used for wash trading."

### "What happens if the matching engine crashes mid-trade?"

**Weak answer:** "We have a backup server."

**Strong answer:** "The matching engine writes every input to a durable event log before processing. On crash, the recovery process loads the last snapshot (taken every 60 seconds) and replays all events since that snapshot. Because the engine is deterministic, the replayed state is identical to the pre-crash state. Additionally, a hot standby engine continuously processes the same input stream in parallel. If the primary crashes, the standby can be promoted within 1 second. The key invariant we verify: the standby's output must match the primary's event log sequence. If they diverge, we do not promote the standby---instead, we replay from the primary's event log, because divergence indicates a non-determinism bug."

### "How do you prevent someone from withdrawing the same Bitcoin twice?"

**Weak answer:** "We check the balance before processing."

**Strong answer:** "We use optimistic concurrency control on the balance row. When a withdrawal request comes in, we read the balance and its version number, then attempt an UPDATE with a WHERE clause that includes the version. If another operation (a second withdrawal, an order placement, or a trade settlement) modified the balance between our read and write, the version won't match, the UPDATE affects 0 rows, and we retry with fresh data. This makes the balance-check-and-debit atomic without long-held locks. Additionally, every withdrawal request carries a client-generated idempotency key, so network retries don't create duplicate withdrawals. The balance has three components---available, locked, and frozen---and only the available portion can be withdrawn or used for orders."

### "How do you handle a blockchain reorganization after you've already credited a deposit?"

**Weak answer:** "We wait for enough confirmations."

**Strong answer:** "We mitigate reorgs at two levels. First, prevention: we require conservative confirmation thresholds---6 for Bitcoin, 64 for Ethereum---which makes reorgs extremely unlikely. Second, detection: even after crediting a deposit, we continue monitoring the block hash. If a reorg removes the deposit transaction, we immediately flag the affected account. If the user still has sufficient balance, we reverse the credit. If the user has already traded or withdrawn those funds, the loss is absorbed by our insurance fund and the account is flagged for investigation. For very large deposits above a configurable threshold, we require additional confirmations beyond the standard requirement."

### "How do you scale the matching engine to handle 1M+ orders per second?"

**Weak answer:** "We use multiple threads and distributed processing."

**Strong answer:** "We don't scale a single matching engine---we scale by partitioning across trading pairs. Each pair has its own dedicated matching engine instance, single-threaded and deterministic. BTC/USDT runs on one core, ETH/USDT on another, and so on. A single thread on modern hardware can process 100K-500K orders per second, which is more than sufficient for any individual pair. For aggregate throughput of 1M+ orders/sec across 500+ pairs, we run hundreds of engine instances across multiple bare-metal servers. This is possible because orders for different pairs are completely independent---there is no shared state between the BTC/USDT and ETH/USDT order books."

### "Why not use a distributed database for the order book?"

**Weak answer:** "We need low latency."

**Strong answer:** "The order book must support three operations at extreme speed: insert an order (O(log P)), remove an order (O(log P) + O(1)), and match at the best price (O(1)). These operations happen hundreds of thousands of times per second. Any network hop---even within a data center---adds 100+ microseconds of latency, which is unacceptable when the matching loop itself takes < 1 microsecond. A distributed database would also introduce non-determinism (network ordering varies), breaking the auditability guarantee. The order book lives entirely in the matching engine's process memory as a red-black tree (per side), giving us O(log P) operations with zero I/O. The trade-off is that the order book for one pair must fit in memory---but even a pair with 10,000 price levels × 100 orders/level uses only ~100MB."

---

## Follow-Up Deep Dives

| Topic | Key Points |
|-------|-----------|
| **Perpetual futures** | Funding rate mechanism; mark price vs. index price; liquidation engine with insurance fund; auto-deleveraging |
| **Cross-chain bridging** | Lock-and-mint vs. burn-and-release; bridge security (multi-sig relayers); oracle validation |
| **MEV protection** | Front-running prevention on DEX aggregation; commit-reveal schemes; encrypted mempool |
| **Staking integration** | Liquid staking tokens; validator management; reward distribution; slashing risk |
| **Market making** | Dedicated low-latency feed; co-location; maker rebates; inventory management |
| **Regulatory reporting** | Automated SAR generation; CTR filing; tax reporting (1099-DA in US); travel rule compliance |

---

## Red Flags to Avoid

| Red Flag | Why It Is Wrong | Correct Approach |
|----------|----------------|------------------|
| "We use a distributed matching engine across nodes" | Introduces non-determinism; network latency ruins matching performance | Single-threaded per pair; partition by trading pair for horizontal scaling |
| "We store the order book in a database" | Database round-trip (ms) is 1000× too slow for matching (µs) | In-memory red-black tree; DB for persistence via event sourcing |
| "We use the same wallet for all blockchains" | Different chains have different address formats, signing algorithms, and finality models | Per-chain-family microservices with a normalizing gateway |
| "We keep all funds in hot wallets for fast withdrawals" | Single compromise drains everything | Hot (2-5%) / Warm (3-8%) / Cold (90%+) tiered custody |
| "We use 2PC for cross-shard balance settlement" | 2PC blocks all shards if coordinator fails | Batch net settlement or saga pattern |
| "We confirm deposits after 1 block" | 1-block confirmations are trivially reversible on most chains | Chain-specific confirmation requirements (6 BTC, 64 ETH) |
| "We use eventual consistency for balances" | Users could double-spend during the inconsistency window | Strong consistency for available balance; eventual for history/analytics |
| "We don't need proof of reserves because users trust us" | FTX proved this assumption catastrophically wrong | Merkle tree PoR with on-chain attestation; published regularly |
