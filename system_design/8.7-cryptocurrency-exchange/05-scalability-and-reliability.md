# Scalability and Reliability

## Scaling Strategy Overview

```mermaid
flowchart LR
    subgraph Horizontal["Horizontally Scaled"]
        A[API Gateway]
        B[WebSocket Servers]
        C[Settlement Workers]
        D[Blockchain Monitors]
        E[Market Data Relays]
    end

    subgraph Partitioned["Partitioned by Trading Pair"]
        F[Matching Engine<br/>BTC/USDT]
        G[Matching Engine<br/>ETH/USDT]
        H[Matching Engine<br/>SOL/USDT]
        I["... 500+ pairs"]
    end

    subgraph Sharded["Sharded by User"]
        J[Balance DB<br/>Shard 1]
        K[Balance DB<br/>Shard 2]
        L[Balance DB<br/>Shard N]
    end

    subgraph Replicated["Read Replicas"]
        M[Order History<br/>Replicas]
        N[Market Data<br/>Time-Series]
    end

    A --> F & G & H
    B --> E
    F & G & H --> C
    C --> J & K & L
    J & K & L --> M

    classDef horizontal fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef partitioned fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef sharded fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef replicated fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class A,B,C,D,E horizontal
    class F,G,H,I partitioned
    class J,K,L sharded
    class M,N replicated
```

---

## Matching Engine Scaling

### One Engine Per Pair (Horizontal Partitioning)

Each trading pair runs its own matching engine instance. This is the fundamental scaling unit:

| Pair Category | Count | Engine Sizing |
|---------------|-------|---------------|
| Top-tier (BTC/USDT, ETH/USDT) | 5-10 | Dedicated bare-metal, 500K orders/sec |
| Mid-tier (popular alts) | 50-100 | Shared high-performance VMs, 100K orders/sec |
| Long-tail (low volume) | 400+ | Multiplexed on shared instances, 10K orders/sec |

### Failover Architecture

Each matching engine has a **hot standby** replica that consumes the same input event stream:

```
PRIMARY ENGINE:
    input_queue → [Match] → output_queue → event_log
                                              │
                                    (replicated)
                                              │
STANDBY ENGINE:                               ▼
    input_queue → [Match] → output_queue (discarded)
                     │
              Verifies output matches
              primary's event log
```

**Failover process**:
1. Health monitor detects primary failure (missed heartbeat for 500ms)
2. Standby is already caught up (processing same input stream)
3. Standby promoted to primary (< 1 second)
4. Input queue drains to new primary
5. Zero order loss because the input queue is durable (message broker)

**Key invariant**: The standby must produce identical output for the same input sequence. If outputs diverge, it indicates a non-determinism bug and triggers an alert (do NOT failover to a divergent standby).

---

## Balance Database Scaling

### Sharding Strategy

Balances are sharded by `user_id` (consistent hashing). This ensures:
- All balances for a single user are on the same shard (single-shard transactions for internal transfers)
- Trade settlement between users on different shards uses optimistic batching

```
SHARD ASSIGNMENT:
    shard_id = consistent_hash(user_id) % NUM_SHARDS

    Shard 1: users A-F  (balance reads/writes for these users)
    Shard 2: users G-L
    ...
    Shard N: users U-Z

TRADE SETTLEMENT (cross-shard):
    // Buyer on Shard 1, Seller on Shard 3
    // Option A: Two-phase with timeout (simple, rare conflicts)
    // Option B: Batch net settlement (preferred at scale)

BATCH NET SETTLEMENT:
    // Every 100ms, aggregate fills per user per asset
    net_changes = {}
    FOR EACH trade IN batch:
        net_changes[buyer][base_asset] += quantity
        net_changes[buyer][quote_asset] -= cost + fee
        net_changes[seller][base_asset] -= quantity
        net_changes[seller][quote_asset] += cost - fee

    // Apply net changes per shard in parallel
    FOR EACH shard IN affected_shards:
        users_on_shard = filter(net_changes, shard)
        APPLY batch_update(users_on_shard)  // single transaction per shard
```

### Read Scaling

- **Balance reads**: Served from primary (strong consistency required for available balance)
- **Order history**: Served from read replicas (1-2 second lag acceptable)
- **Trade history**: Served from time-series database (optimized for range queries)

---

## Market Data Scaling

### Hierarchical Fan-Out

```mermaid
flowchart TB
    ME[Matching Engines] --> MDP[Market Data<br/>Processor]
    MDP --> R1[Regional Relay<br/>Americas]
    MDP --> R2[Regional Relay<br/>Europe]
    MDP --> R3[Regional Relay<br/>Asia]

    R1 --> E1[Edge WS<br/>Server 1]
    R1 --> E2[Edge WS<br/>Server 2]
    R1 --> E3[Edge WS<br/>Server N]

    R2 --> E4[Edge WS<br/>Server 1]
    R2 --> E5[Edge WS<br/>Server N]

    R3 --> E6[Edge WS<br/>Server 1]
    R3 --> E7[Edge WS<br/>Server N]

    E1 --> U1["10K connections"]
    E2 --> U2["10K connections"]
    E3 --> U3["10K connections"]

    classDef engine fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef relay fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef edge fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef users fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class ME,MDP engine
    class R1,R2,R3 relay
    class E1,E2,E3,E4,E5,E6,E7 edge
    class U1,U2,U3 users
```

**Scaling math**:
- 2M concurrent WebSocket connections
- Each edge server handles ~10K connections (kernel-level epoll/kqueue)
- 200 edge servers required
- Each regional relay fans out to ~70 edge servers
- Market data processor is a single pipeline (per pair) that formats engine events

### Conflation for Bandwidth Control

```
CONFLATION STRATEGY:

High-frequency traders (L3 feed):
    - No conflation, every individual event
    - Rate: ~10K msg/sec/pair
    - Requires co-location or fast connection

Standard traders (L2 feed):
    - 100ms conflation: batch all changes in 100ms window into single update
    - Rate: ~10 msg/sec/pair
    - Includes aggregated depth snapshot

Casual users (L1 feed):
    - 1 second conflation: best bid/ask + last price
    - Rate: ~1 msg/sec/pair
```

---

## Blockchain Layer Scaling

### Multi-Chain Architecture

```
FOR EACH blockchain_family:
    ┌────────────────────────────────────┐
    │      Blockchain Gateway Service     │
    │  (normalizes chain-specific logic)  │
    ├────────────────────────────────────┤
    │  Deposit Monitor (3+ instances)    │
    │  Withdrawal Broadcaster            │
    │  Address Generator                  │
    │  Confirmation Tracker              │
    ├────────────────────────────────────┤
    │  Node Pool (3+ nodes per chain)    │
    │  - Self-hosted full nodes          │
    │  - Commercial RPC (backup)         │
    │  - Archive node (historical)       │
    └────────────────────────────────────┘
```

**Chain families and their quirks**:

| Chain Family | Examples | Model | Deposit Detection | Confirmation Time |
|-------------|----------|-------|-------------------|-------------------|
| EVM | Ethereum, Polygon, BSC | Account-based | Event log scanning | 12s - 5min |
| UTXO | Bitcoin, Litecoin | UTXO | UTXO monitoring | 10-60 min |
| Solana | Solana, SPL tokens | Account + slots | Transaction parsing | ~0.4s |
| Cosmos | ATOM, OSMO | Account + IBC | Event subscription | ~6s |
| Move-based | Aptos, Sui | Object-based | Event subscription | ~1s |

---

## Reliability and Fault Tolerance

### Failure Modes and Recovery

| Failure | Impact | Detection | Recovery | RTO |
|---------|--------|-----------|----------|-----|
| Matching engine crash | Trading halted for affected pair | Heartbeat miss (500ms) | Hot standby promotion | < 1s |
| Balance DB shard failure | Users on that shard cannot trade | Replication lag monitor | Promote replica to primary | < 30s |
| WebSocket server crash | Connected users lose real-time feed | Connection drop | Client auto-reconnect to another server; re-sync snapshot | < 5s |
| Blockchain node failure | Deposits/withdrawals delayed for that chain | Block height stall | Failover to backup node | < 1 min |
| Hot wallet compromise | Potential asset theft (2-5% exposure) | Anomaly detection on withdrawal patterns | Freeze hot wallet; rotate keys; switch to warm wallet | < 5 min |
| Event log corruption | Cannot replay matching engine state | Checksum validation | Restore from snapshot + replay from backup log | < 10 min |
| Full data center outage | All services in that region down | Multi-region health check | DNS failover to standby region | < 5 min |

### Data Durability

```
DURABILITY LAYERS:

1. Matching Engine Event Log
   - Synchronously written to local NVMe + replicated to remote storage
   - WAL (write-ahead log) ensures no event loss
   - Snapshots every 60 seconds for fast replay

2. Balance Database
   - Synchronous replication (primary → standby)
   - Asynchronous replication to read replicas
   - Point-in-time recovery capability (WAL archival)
   - Daily full backup to object storage

3. Blockchain Transaction Records
   - Stored in primary DB + replicated to analytics DB
   - Blockchain itself is the ultimate source of truth for on-chain data
   - Cross-reference with blockchain during reconciliation

4. Trade and Order History
   - Written to primary DB and streaming to time-series store
   - Immutable (append-only, no updates or deletes)
   - Retained indefinitely (regulatory requirement)
```

---

## Disaster Recovery

### Multi-Region Architecture

```
ACTIVE-PASSIVE with Hot Standby:

PRIMARY REGION (Active):
    - All matching engines (primary)
    - Balance DB primaries
    - Hot/warm wallets (signing authority)
    - API gateway (serves traffic)

STANDBY REGION (Hot Standby):
    - Matching engine standbys (consuming event stream)
    - Balance DB replicas (async replication, < 1s lag)
    - Read-only API (serves market data, account queries)
    - No signing authority (prevents split-brain withdrawals)

FAILOVER DECISION:
    - Automated for stateless services (API, WebSocket, market data)
    - MANUAL for matching engine (prevents split-brain trading)
    - MANUAL for custody (prevents double-spend across regions)

WHY NOT ACTIVE-ACTIVE:
    - Matching engine must be single-threaded per pair → cannot run in two regions
    - Balance updates require strong consistency → async replication lag breaks invariants
    - Custody signing must have single authority → split-brain = potential double-withdrawal
```

### RPO and RTO Targets

| Component | RPO (data loss) | RTO (recovery time) | Strategy |
|-----------|----------------|---------------------|----------|
| Matching engine | 0 (zero loss) | < 1s | Hot standby with event replay |
| Balance DB | 0 (zero loss) | < 30s | Synchronous replication |
| Market data | < 1s | < 5s | Rebuilt from event log |
| Trade history | 0 | < 1 min | Replicated to multiple stores |
| Blockchain state | N/A (blockchain is external) | < 5 min | Node failover |

---

## Capacity Planning

### Growth Triggers

| Metric | Current | Threshold | Scaling Action |
|--------|---------|-----------|----------------|
| Orders/sec per pair | 200K | > 80% engine capacity | Optimize engine; consider pair split |
| WebSocket connections | 2M | > 70% edge capacity | Add edge servers |
| Balance DB shard load | 10K TPS | > 70% shard capacity | Add shard (re-hash) |
| Hot wallet utilization | 60% of target | > 90% of target sustained 1h | Increase warm → hot sweep frequency |
| Settlement lag | 50ms | > 500ms | Add settlement workers |
| Blockchain node sync lag | < 2 blocks | > 10 blocks | Add nodes; investigate provider issues |

### Load Testing Strategy

- **Synthetic order generation**: Replay anonymized production order flow at 2x-5x volume
- **Flash crash simulation**: Generate 10x normal order rate for 60 seconds with extreme price moves
- **Withdrawal storm**: Simulate bank-run scenario with 10x normal withdrawal requests
- **Blockchain fork simulation**: Inject synthetic reorg events to test deposit reversal logic
- **Chaos engineering**: Random failure injection (kill matching engine, corrupt event log, network partition)
