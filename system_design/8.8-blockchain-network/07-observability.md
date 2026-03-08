# Observability

## Metrics Framework

### Consensus Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `consensus.slot.missed` | Counter | Number of slots without a block | > 5 consecutive missed slots |
| `consensus.epoch.finalized` | Gauge | Latest finalized epoch number | Gap > 2 epochs from head |
| `consensus.attestation.inclusion_delay` | Histogram | Slots between attestation creation and inclusion | p95 > 2 slots |
| `consensus.attestation.participation_rate` | Gauge | Percentage of validators attesting per epoch | < 90% |
| `consensus.fork.reorg_depth` | Histogram | Depth of chain reorganizations | Any reorg > 3 blocks |
| `consensus.validator.balance` | Gauge | Individual validator effective balance | < 31.75 ETH (below effective threshold) |
| `consensus.validator.slashing_count` | Counter | Number of slashing events detected | Any occurrence |
| `consensus.finality.delay_epochs` | Gauge | Epochs since last finalization | > 4 (inactivity leak threshold) |

### Execution Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `execution.block.gas_used` | Gauge | Gas consumed per block | Sustained > 95% of gas limit |
| `execution.block.gas_used_ratio` | Gauge | Ratio of gas used to gas limit (target: 0.5) | > 0.9 sustained |
| `execution.block.processing_time_ms` | Histogram | Time to execute all transactions in a block | p99 > 4000ms |
| `execution.tx.count_per_block` | Histogram | Number of transactions per block | N/A (informational) |
| `execution.base_fee.gwei` | Gauge | Current EIP-1559 base fee | > 100 gwei (congestion alert) |
| `execution.state.trie_nodes` | Gauge | Total trie nodes in state database | Growth > 5%/month |
| `execution.state.disk_usage_gb` | Gauge | State database size on disk | > 80% of available storage |
| `execution.evm.revert_rate` | Gauge | Percentage of transactions that revert | > 20% (contract bug indicator) |

### Mempool Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `mempool.size` | Gauge | Total transactions in mempool | > 50,000 (congestion) |
| `mempool.pending_count` | Gauge | Executable transactions (correct nonce) | N/A |
| `mempool.queued_count` | Gauge | Non-executable transactions (future nonce) | > 10,000 |
| `mempool.tx.time_to_inclusion_s` | Histogram | Time from mempool entry to block inclusion | p95 > 60s |
| `mempool.tx.replacement_rate` | Gauge | Transactions replaced via fee bump (per minute) | > 100/min (spam indicator) |
| `mempool.tx.eviction_rate` | Counter | Transactions evicted due to mempool limits | > 1000/hour |
| `mempool.gas_price.min_gwei` | Gauge | Minimum gas price in mempool | N/A (fee market indicator) |

### Network Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `p2p.peers.connected` | Gauge | Number of connected peers | < 10 or > 100 |
| `p2p.peers.inbound` | Gauge | Inbound peer connections | 0 (may indicate NAT/firewall issue) |
| `p2p.block.propagation_ms` | Histogram | Time for block to reach this node from proposal | p95 > 4000ms |
| `p2p.tx.propagation_ms` | Histogram | Time for transaction to reach this node | p95 > 3000ms |
| `p2p.bandwidth.inbound_mbps` | Gauge | Inbound network bandwidth | > 100 Mbps sustained |
| `p2p.bandwidth.outbound_mbps` | Gauge | Outbound network bandwidth | > 100 Mbps sustained |
| `p2p.gossipsub.score_below_zero` | Gauge | Peers with negative GossipSub score | > 20% of peers |
| `p2p.discovery.dht_lookup_ms` | Histogram | Kademlia DHT lookup latency | p99 > 5000ms |

---

## Logging Strategy

### Log Levels and Categories

```
CRITICAL:
  - Consensus fork detected (reorg depth > 1)
  - Slashing event observed
  - Finality stalled (> 4 epochs)
  - State root mismatch after block execution
  - Database corruption detected

ERROR:
  - Block validation failure (invalid state root, bad signature)
  - Peer protocol violation (banned peer)
  - EVM execution panic (should never happen in production)
  - Sync stalled (no progress for > 5 minutes)

WARNING:
  - Block arrived late (after attestation deadline)
  - Mempool approaching capacity
  - Peer score below threshold
  - Disk usage above 80%
  - Attestation missed (for validator operators)

INFO:
  - New block imported (number, hash, tx count, gas used)
  - Epoch finalized (epoch number, participation rate)
  - New peer connected/disconnected
  - Sync progress updates
  - Validator duties (propose, attest)

DEBUG:
  - Individual transaction validation details
  - Trie node cache hit/miss ratios
  - GossipSub mesh topology changes
  - Fork choice score calculations
  - EVM opcode execution traces
```

### Structured Log Format

```
{
  "timestamp": "2025-09-15T14:30:22.456Z",
  "level": "INFO",
  "component": "consensus",
  "event": "block_imported",
  "block_number": 18500000,
  "block_hash": "0xabc...def",
  "parent_hash": "0x123...456",
  "tx_count": 185,
  "gas_used": 29500000,
  "gas_limit": 30000000,
  "base_fee_gwei": 25.4,
  "processing_time_ms": 890,
  "state_root": "0x789...012",
  "proposer_index": 42567
}
```

---

## Tracing

### Transaction Lifecycle Trace

```
Trace: Transaction 0xabc...def lifecycle

Span 1: tx_submission (12ms)
  ├── rpc_receive: 2ms
  ├── signature_verify: 3ms
  ├── nonce_check: 1ms
  ├── balance_check: 1ms
  └── mempool_insert: 5ms

Span 2: tx_propagation (2,400ms)
  ├── gossip_to_peers: 50ms (initial broadcast)
  └── network_spread: 2,350ms (reach 95% of network)

Span 3: tx_inclusion (wait for block proposal)
  ├── mempool_residence: 24,000ms (2 blocks waited)
  └── block_selection: included in block #18500001

Span 4: tx_execution (1.2ms)
  ├── evm_setup: 0.1ms
  ├── opcode_execution: 0.8ms (47 opcodes, 65,000 gas)
  ├── state_writes: 0.2ms (2 storage slots updated)
  └── receipt_creation: 0.1ms

Span 5: tx_confirmation
  ├── slot_attestations: 12s (next slot attestors vote)
  ├── epoch_justification: 6.4min (epoch justified)
  └── finalization: 12.8min (next epoch justified → finalized)
```

### Block Processing Trace

```
Trace: Block #18500001 processing

Span 1: block_receive (45ms)
  ├── p2p_deserialize: 5ms
  ├── header_verify: 10ms (parent hash, timestamp, gas limit)
  ├── signature_verify: 15ms (proposer BLS signature)
  └── consensus_checks: 15ms (slot, randao, deposits)

Span 2: block_execution (890ms)
  ├── tx_0: 2.1ms (simple transfer, 21,000 gas)
  ├── tx_1: 15.3ms (contract call, 200,000 gas)
  ├── tx_2: 0.8ms (transfer, 21,000 gas)
  ├── ...
  ├── tx_184: 8.2ms (contract deploy, 500,000 gas)
  ├── state_root_compute: 180ms (trie hash recomputation)
  └── receipt_root_compute: 45ms

Span 3: block_commit (35ms)
  ├── trie_commit: 20ms (write dirty nodes to DB)
  ├── block_store: 10ms (write block to chain DB)
  └── index_update: 5ms (update bloom filter index)

Span 4: block_announce (50ms)
  └── gossip_broadcast: 50ms (forward to mesh peers)
```

---

## Dashboards

### Node Operator Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN NODE STATUS                        │
├─────────────────┬───────────────────────────────────────────────┤
│ Chain Head      │ #18,500,001 (0xabc...def)                     │
│ Finalized       │ #18,499,968 (epoch 578125)                    │
│ Sync Status     │ ✓ SYNCED (0 blocks behind)                    │
│ Peers           │ 42 connected (28 inbound, 14 outbound)        │
│ Uptime          │ 45d 12h 30m                                   │
├─────────────────┴───────────────────────────────────────────────┤
│                                                                  │
│ Block Processing Time (last 1h)     Gas Usage Ratio (last 1h)   │
│ ┌──────────────────────┐            ┌──────────────────────┐    │
│ │    ╱╲                │            │ ████████████░░░░     │    │
│ │╱╲╱  ╲╱╲   ╱╲       │            │ 78% of limit         │    │
│ │        ╲╱╱  ╲╱╲╱╲  │            │ Target: 50%          │    │
│ │ p50: 650ms          │            │                      │    │
│ │ p99: 1800ms         │            │ Base fee: 25.4 gwei  │    │
│ └──────────────────────┘            └──────────────────────┘    │
│                                                                  │
│ Mempool Status                      Peer Distribution            │
│ ┌──────────────────────┐            ┌──────────────────────┐    │
│ │ Pending: 4,521       │            │ Americas: 35%        │    │
│ │ Queued:  1,203       │            │ Europe:   40%        │    │
│ │ Min fee: 18 gwei     │            │ Asia:     20%        │    │
│ │ Max fee: 500 gwei    │            │ Other:    5%         │    │
│ └──────────────────────┘            └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Validator Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATOR PERFORMANCE                         │
├─────────────────┬───────────────────────────────────────────────┤
│ Validator Index │ #42567                                         │
│ Status          │ ✓ ACTIVE                                       │
│ Balance         │ 32.145 ETH (effective: 32 ETH)                 │
│ Activation      │ Epoch 450,000                                  │
├─────────────────┴───────────────────────────────────────────────┤
│                                                                  │
│ Attestation Performance (last 7d)                                │
│ ┌──────────────────────────────────────────┐                    │
│ │ ████████████████████████████████░        │ 97.3% included     │
│ │ Inclusion delay: 1.02 slots (avg)       │                    │
│ │ Missed: 18 / 672 attestations           │                    │
│ └──────────────────────────────────────────┘                    │
│                                                                  │
│ Proposals (last 30d)            Sync Committee (current)         │
│ ┌──────────────────────┐        ┌──────────────────────┐        │
│ │ Assigned: 3          │        │ Selected: No          │        │
│ │ Proposed: 3          │        │ Next possible:        │        │
│ │ Missed: 0            │        │ Epoch ~580,000        │        │
│ │ Rewards: 0.015 ETH   │        │                      │        │
│ └──────────────────────┘        └──────────────────────┘        │
│                                                                  │
│ Income Summary                                                   │
│ ┌──────────────────────────────────────────┐                    │
│ │ Attestation rewards:    +0.0032 ETH/day  │                    │
│ │ Proposal rewards:       +0.005 ETH/prop  │                    │
│ │ Sync committee:         +0.000 ETH/day   │                    │
│ │ Penalties:              -0.0001 ETH/day  │                    │
│ │ Net daily:              +0.0031 ETH/day  │                    │
│ └──────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### Network Health Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETWORK HEALTH OVERVIEW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Finality Status                    Participation Rate             │
│ ┌──────────────────────┐           ┌──────────────────────┐     │
│ │ ✓ Finalizing normally│           │ ███████████████████░ │     │
│ │ Last finalized:      │           │ 98.2%                │     │
│ │   12 min ago         │           │ Target: > 66.7%      │     │
│ │ Epochs behind: 0     │           │ (2/3 supermajority)  │     │
│ └──────────────────────┘           └──────────────────────┘     │
│                                                                  │
│ Block Production (last 1h)         Reorg Monitor (last 24h)     │
│ ┌──────────────────────┐           ┌──────────────────────┐     │
│ │ Slots: 300           │           │ Depth 1: 3 events    │     │
│ │ Blocks: 297          │           │ Depth 2: 0 events    │     │
│ │ Missed: 3 (1.0%)     │           │ Depth 3+: 0 events   │     │
│ │ Target: < 2%         │           │ Status: ✓ Normal     │     │
│ └──────────────────────┘           └──────────────────────┘     │
│                                                                  │
│ Client Diversity                                                 │
│ ┌──────────────────────────────────────────┐                    │
│ │ EL: Geth 42% | Nethermind 28% | Besu 18% | Erigon 12%  │    │
│ │ CL: Prysm 35% | Lighthouse 30% | Teku 20% | Nimbus 15% │    │
│ │ ⚠ Warning: No client should exceed 33%                   │    │
│ └──────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Alerting Rules

### Critical Alerts (Page Immediately)

| Alert | Condition | Impact |
|-------|-----------|--------|
| Finality stalled | No finalization for > 4 epochs | Inactivity leak begins; validator funds at risk |
| Deep reorg | Reorganization depth > 3 blocks | Possible consensus attack; exchange deposits may be reversed |
| Validator slashed | Own validator slashed event detected | Immediate fund loss; investigate key compromise |
| State root mismatch | Computed state root differs from block header | Client bug; consensus split risk |
| Disk full | Storage usage > 95% | Node will crash; blocks cannot be stored |

### Warning Alerts (Investigate Within 1 Hour)

| Alert | Condition | Impact |
|-------|-----------|--------|
| Missed attestation | Own validator missed > 3 consecutive attestations | Accumulating penalties; possible connectivity issue |
| Low peer count | Connected peers < 10 | Degraded block/tx propagation; eclipse attack risk |
| High block processing time | p99 > 4 seconds | Risk of missing attestation deadlines |
| Mempool congestion | Pending transactions > 50,000 | Fee spikes; user experience degradation |
| Sync falling behind | > 10 blocks behind chain head | Node serving stale data |

### Informational Alerts (Daily Review)

| Alert | Condition | Impact |
|-------|-----------|--------|
| Base fee trend | 7-day moving average change > 50% | Network congestion pattern change |
| State growth rate | Monthly growth > 5 GB | Storage planning needed |
| Peer churn rate | > 30% peer turnover per hour | Network instability or Sybil activity |
| Client update available | New client version released | Security patches may be included |

---

## SLI/SLO Framework

| Service Level Indicator | Target SLO | Measurement Window |
|------------------------|------------|-------------------|
| Block production rate | 99.5% of slots have blocks | Rolling 24 hours |
| Finalization rate | 99.9% of epochs finalize | Rolling 7 days |
| Attestation inclusion rate | 97% of attestations included within 2 slots | Rolling 24 hours |
| Transaction inclusion (adequate fee) | 99% included within 3 blocks | Rolling 24 hours |
| P2P message delivery | 95% of gossip messages within 3 seconds | Rolling 1 hour |
| JSON-RPC availability | 99.9% uptime | Rolling 30 days |
| State query latency | p99 < 200ms | Rolling 1 hour |
| Sync recovery time | < 1 hour to re-sync after restart | Per incident |
