# Requirements & Estimations

## Functional Requirements

### Core Features (MVP)

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Transaction Submission** | Users create, sign, and submit transactions (value transfers, contract calls) to the network |
| F2 | **Transaction Propagation** | Nodes gossip pending transactions to peers; mempool admits valid transactions |
| F3 | **Block Production** | Proposers assemble transactions into blocks respecting gas limits and ordering rules |
| F4 | **Consensus & Finality** | Validators attest to blocks; finality gadget finalizes checkpoint epochs |
| F5 | **State Execution** | Deterministic VM executes transactions, updating world state (account balances, contract storage) |
| F6 | **State Verification** | Any node can verify any state claim via Merkle proof against the state root |
| F7 | **Peer Discovery** | New nodes discover and connect to peers via bootstrap nodes and Kademlia DHT |
| F8 | **Chain Synchronization** | New or recovering nodes download and verify the chain from genesis or a trusted checkpoint |
| F9 | **Account Management** | Externally Owned Accounts (EOAs) and contract accounts with nonce, balance, code, and storage |
| F10 | **Fee Market** | Dynamic base fee adjustment (EIP-1559 style) with priority fee tips to block proposers |

### Extended Features

| # | Feature | Description |
|---|---------|-------------|
| F11 | **Smart Contract Deployment** | Users deploy bytecode to the network; contracts get deterministic addresses |
| F12 | **Event Logging** | Contracts emit indexed events (logs) queryable by external applications |
| F13 | **Light Client Support** | Header-only clients verify state via Merkle/Verkle proofs without full chain |
| F14 | **Validator Lifecycle** | Stake deposit, activation queue, exit queue, withdrawal of staked funds |
| F15 | **Slashing & Penalties** | Detect and penalize validator misbehavior (double-voting, surround-voting) |
| F16 | **Fork Choice** | LMD-GHOST algorithm selects the canonical chain head from competing forks |
| F17 | **Layer 2 Data Availability** | Accept and store rollup transaction data (calldata/blobs) for L2 verification |
| F18 | **Historical State Queries** | Archive nodes serve queries against any historical block's state |

---

## Non-Functional Requirements

### Performance

| Metric | Target | Rationale |
|--------|--------|-----------|
| Block production time | 12 seconds (1 slot) | Consistent slot cadence for attestation timing |
| Transaction propagation (p95) | < 3 seconds | Reach 95% of network before next slot |
| Block propagation (p95) | < 4 seconds | Must arrive within attestation deadline (4s into slot) |
| State transition execution | < 2 seconds per block | Must complete within slot to allow attestation |
| Finality latency | 2 epochs (~13 minutes) | Casper FFG checkpoint finality |
| Mempool insertion latency | < 50 ms | Local validation + admission |
| Merkle proof generation | < 10 ms | For serving light client queries |
| JSON-RPC response time (p99) | < 200 ms | For eth_getBalance, eth_call type queries |

### Reliability

| Metric | Target | Rationale |
|--------|--------|-----------|
| Network uptime | 99.99% | Chain must never halt; individual nodes may fail |
| Finality guarantee | No finalized block ever reverted | Casper FFG economic finality |
| Fork recovery | < 1 epoch | Reorganization resolves within attestation cycle |
| Data durability | 100% for finalized blocks | Replicated across thousands of nodes |
| Peer connectivity | 25-50 peers per node | Sufficient for gossip propagation |

### Scalability

| Metric | Target | Rationale |
|--------|--------|-----------|
| Node count | 10,000+ full nodes | Decentralization requirement |
| Validator set | 1,000,000+ validators | Open participation, permissionless |
| L1 throughput | 30M gas/block (~100 TPS) | Current Ethereum gas limit |
| L2 throughput (per rollup) | 2,000-15,000 TPS | Execution scaling via rollups |
| State size growth | < 50 GB/year | With state pruning and expiry |
| Block size | < 2 MB (execution) + 1 MB (blobs) | Network bandwidth constraint |

---

## Capacity Planning

### Transaction Volume

```
Daily transactions (L1):          1,200,000
Average transactions per block:   ~150
Blocks per day:                   7,200 (1 block per 12s)
Peak transactions per block:      ~500 (during congestion)
Gas per transaction (avg):        ~100,000 gas
Block gas limit:                  30,000,000 gas

L2 daily transactions (all rollups combined):  ~50,000,000
L2 data posted to L1 per day:                  ~500 MB (calldata + blobs)
```

### Storage

```
Block header size:        ~508 bytes
Block body size (avg):    ~100 KB (transactions + receipts)
Daily chain growth:       ~720 MB (L1 blocks)
Annual chain growth:      ~260 GB
State trie size:          ~200 GB (full), ~80 GB (pruned)
Receipt trie per block:   ~50 KB
Archive node total:       ~15 TB (full history with state at every block)

Blob data per block:      ~128 KB (EIP-4844)
Daily blob data:          ~900 MB
```

### Network Bandwidth

```
Block gossip:             ~100 KB per block × 7,200 blocks/day = ~720 MB/day
Transaction gossip:       ~250 bytes/tx × 1.2M tx/day = ~300 MB/day
Attestation gossip:       ~200 bytes × 1M validators × 7,200 slots = ~1.4 TB/day (aggregated)
State sync bandwidth:     ~200 GB (initial full sync)
Peer connections:         25-50 TCP connections per node
Bandwidth per node:       ~10-50 Mbps sustained
```

### Compute

```
Signature verification:   ~1ms per ECDSA verify; ~150 per block = ~150ms
State transition:         ~500ms-2s per block (EVM execution)
Merkle root computation:  ~200ms per block (state trie update)
BLS aggregation:          ~5ms per aggregate signature verification
Validator attestation:    ~1ms per attestation creation
```

---

## SLO Summary

| SLO | Target | Error Budget |
|-----|--------|-------------|
| Block production rate | 99.5% of slots have a block | 36 missed slots/day |
| Finality rate | 99.9% of epochs finalize | ~1 missed finality/week |
| Transaction inclusion (adequate fee) | 99% within 3 blocks | 1% delayed beyond 36s |
| Peer discovery success | 99% within 60s of startup | 1% require manual bootstrap |
| State sync completion | 100% within 24h (snap sync) | 0% tolerance for incomplete sync |
| JSON-RPC availability | 99.9% uptime | ~8.7 hours downtime/year per node |

---

## Key Assumptions

1. Network operates in a partially synchronous model: messages are delivered within a bounded (but unknown) delay
2. At least 2/3 of staked capital is controlled by honest validators (Byzantine fault tolerance threshold)
3. Nodes have broadband internet (minimum 25 Mbps upload/download)
4. Storage uses commodity SSDs (minimum 2 TB for full nodes, 16+ TB for archive nodes)
5. Client diversity: at least 3-4 independent client implementations to prevent correlated bugs
6. Fee market follows EIP-1559 dynamics: base fee adjusts algorithmically, tips are market-driven
7. Layer 2 rollups post data to L1 for data availability; L1 does not execute L2 transactions
