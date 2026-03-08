# Deep Dive & Bottlenecks

## 1. Consensus Mechanism Deep Dive

### Gasper: Two Protocols in One

Gasper combines two distinct consensus protocols that operate at different time scales:

**LMD-GHOST (Latest Message Driven - Greedy Heaviest Observed SubTree)**
- Operates at **slot granularity** (every 12 seconds)
- Each validator's latest attestation counts as a "vote" for a block
- Fork choice follows the branch with the most accumulated attestation weight
- Provides **liveness**: the chain always progresses, even under high latency

**Casper FFG (Friendly Finality Gadget)**
- Operates at **epoch granularity** (every 32 slots = 6.4 minutes)
- Checkpoints are the first block of each epoch
- A checkpoint becomes **justified** when 2/3 of validators attest to it
- A checkpoint becomes **finalized** when the next checkpoint is also justified
- Provides **safety**: finalized blocks are economically irreversible

### The Tension Between Liveness and Safety

```
SCENARIO: Network partition lasting > 1 epoch

Phase 1 (partition active):
  - LMD-GHOST continues proposing blocks on both sides (liveness preserved)
  - Casper FFG cannot reach 2/3 supermajority (finality stalls)
  - Inactivity leak begins: non-participating validators lose stake gradually

Phase 2 (partition heals):
  - LMD-GHOST picks the heavier fork (causes reorganization on lighter side)
  - Casper FFG resumes finalization once 2/3 attesting again
  - Slashing detects any validators who attested to conflicting forks

Design choice: Favor liveness (chain keeps moving) over safety (finality pauses)
during partitions. This is the opposite of traditional BFT (Tendermint),
which halts rather than risk conflicting finalization.
```

### Slashing Conditions

Two provable offenses trigger slashing (loss of staked funds):

```
1. Double Voting:
   Validator signs two different attestations for the same target epoch.

   DETECT: attestation_1.target.epoch == attestation_2.target.epoch
           AND attestation_1.data != attestation_2.data

   PENALTY: Minimum 1/32 of stake immediately + correlation penalty
            (up to full stake if many validators slash simultaneously)

2. Surround Voting:
   Validator's attestation "surrounds" or is "surrounded by" a previous one.

   DETECT: attestation_1.source.epoch < attestation_2.source.epoch
           AND attestation_2.target.epoch < attestation_1.target.epoch

   This prevents validators from secretly supporting two different
   chains and then trying to finalize both.
```

---

## 2. State Explosion Problem

### The Core Challenge

Every full node must store the **entire world state**: all account balances, nonces, contract code, and contract storage slots. As the network grows, this state grows monotonically---there is no natural garbage collection because any account or storage slot might be referenced in the future.

```
State Growth Trajectory:
  2020: ~35 GB (Ethereum mainnet)
  2022: ~100 GB
  2024: ~180 GB
  2025: ~200 GB+ (and accelerating)

Problem: State must fit in fast storage (SSD) for acceptable
block processing times. Read amplification in the Merkle Patricia
Trie means each state access requires 6-8 random disk reads
(branch → extension → leaf, repeated for each trie level).
```

### Mitigation Strategies

```
1. State Pruning:
   - Keep only the latest N state versions
   - Discard intermediate trie nodes no longer reachable from recent roots
   - Reduces storage from ~15 TB (archive) to ~200 GB (pruned)
   - Trade-off: Cannot serve historical state queries

2. Snap Sync:
   - Download the state trie as a flat snapshot, not block-by-block replay
   - Verify snapshot against a known state root
   - Reduces sync time from weeks (full sync) to hours
   - Trade-off: Requires trusting the state root from peers until verified

3. State Expiry (proposed):
   - State untouched for N epochs becomes "expired"
   - Expired state is evicted from active trie
   - To access expired state, submit a witness (Merkle proof)
   - Trade-off: Increases transaction complexity; users must maintain proofs

4. Verkle Trees (2025-2026):
   - Replace Merkle Patricia Trie with Verkle commitments
   - Proof size: ~3 KB (Merkle) → ~200 bytes (Verkle)
   - Enables stateless clients: verify blocks using witnesses only
   - Key enabler for state expiry and stateless validation
```

---

## 3. Mempool Management and MEV

### Mempool as a Competitive Arena

The mempool is not just a waiting room---it is a transparent, adversarial environment where sophisticated actors compete for transaction ordering advantages.

```
Maximal Extractable Value (MEV):
  - Block proposers can reorder, insert, or censor transactions
  - Common MEV strategies:
    a. Front-running: See a large trade, place own trade before it
    b. Back-running: Place trade immediately after a large trade
    c. Sandwich attack: Front-run + back-run a victim transaction
    d. Liquidation: Race to liquidate undercollateralized positions
    e. Arbitrage: Exploit price differences across decentralized exchanges

  - MEV extraction distorts fee markets: searchers bid up priority fees
  - Estimated MEV extracted: >$600M annually on Ethereum alone
```

### Proposer-Builder Separation (PBS)

```
Problem: Validators who extract MEV have an advantage over honest validators,
         leading to centralization pressure.

Solution: Separate block building from block proposing.

  Builder:   Specialized entity that constructs optimal blocks (MEV extraction)
  Proposer:  Validator that selects the highest-bid block from builders
  Relay:     Trusted intermediary that prevents proposers from stealing MEV

Flow:
  1. Builders construct blocks and bid for inclusion
  2. Relay validates blocks and forwards bids to proposer
  3. Proposer selects highest bid (without seeing block contents)
  4. Proposer signs the block header (committing to builder's block)
  5. Relay reveals full block to the network

Trade-off: Introduces trusted relays; builders may centralize.
           Active research into enshrined PBS (protocol-level) and
           encrypted mempools to reduce trust assumptions.
```

### Transaction Replacement Race Conditions

```
SCENARIO: User submits tx_A (nonce=5, priority_fee=2 gwei)
          Then submits tx_B (nonce=5, priority_fee=3 gwei) to replace

Race condition:
  - Node_1 receives tx_A first, tx_B second → replaces (fee bump > 10%)
  - Node_2 receives tx_B first, tx_A second → rejects tx_A (lower fee)
  - Node_3 receives only tx_A (gossip delay) → includes tx_A in block

Result: Non-deterministic behavior across the network. The block proposer's
        local mempool view determines which version gets included.

Mitigation:
  - Require minimum 10% fee bump for replacement (prevents spam)
  - Proposers typically see both and select higher-fee version
  - No formal guarantee until transaction is included in a block
```

---

## 4. Fork Management and Chain Reorganization

### Types of Forks

```
1. Temporary Forks (Reorgs):
   - Two proposers create blocks at similar times
   - Network sees competing chain tips
   - LMD-GHOST resolves by selecting heaviest subtree
   - Typical depth: 1-2 blocks; deeper reorgs are rare and concerning

2. Soft Forks (Backward Compatible):
   - Tighten validation rules (transactions previously valid become invalid)
   - Non-upgraded nodes still accept new blocks (but may accept invalid txns)
   - Example: Activation of new opcodes, fee market changes

3. Hard Forks (Non-Backward Compatible):
   - Change validation rules in ways old nodes reject
   - Requires all nodes to upgrade before activation
   - Example: The Merge (PoW → PoS), EIP-4844 (blob transactions)
   - Scheduled via epoch-based activation (e.g., "activate at epoch 194048")
```

### Reorg Detection and Response

```
FUNCTION handleNewBlock(block):
    parentKnown = store.hasBlock(block.parentHash)
    IF NOT parentKnown:
        requestBlock(block.parentHash)  // Trigger sync
        RETURN

    IF block.parentHash == store.head:
        // Normal case: extends current chain
        executeAndAppend(block)
    ELSE:
        // Fork detected: compare weights
        currentWeight = getSubtreeWeight(store.head)
        newWeight = getSubtreeWeight(block)

        IF newWeight > currentWeight:
            // Reorg required
            commonAncestor = findCommonAncestor(store.head, block)
            revertDepth = store.head.number - commonAncestor.number

            LOG "Reorg detected: depth={revertDepth}"
            ALERT_IF revertDepth > 3  // Deep reorg is suspicious

            // Revert state to common ancestor
            revertStateTo(commonAncestor)

            // Re-execute new fork's blocks
            newBlocks = getBlocksFromTo(commonAncestor, block)
            FOR b IN newBlocks:
                executeAndAppend(b)

            // Return reverted transactions to mempool
            revertedTxs = getTransactions(commonAncestor, store.oldHead)
            includedTxs = getTransactions(commonAncestor, block)
            FOR tx IN revertedTxs:
                IF tx NOT IN includedTxs:
                    mempool.insert(tx)
```

---

## 5. EVM Execution Bottlenecks

### Sequential Execution Problem

```
Current model: Transactions execute strictly sequentially within a block.
Reason: Any transaction may read state modified by a prior transaction.

Throughput ceiling:
  - Block gas limit: 30M gas
  - Complex transaction: ~200K gas → ~150 transactions/block
  - Block time: 12 seconds → ~12.5 TPS effective

Why parallelization is hard:
  - Transaction N may read a storage slot written by Transaction N-1
  - Determining dependencies requires executing the transaction
  - Access lists (EIP-2930) hint at storage access but are not binding
```

### State Trie I/O Amplification

```
Problem: Each state access traverses the Merkle Patricia Trie.

Trie depth: ~8 levels for a 256-bit key path
Each level: 1 database read (random access to LevelDB/PebbleDB)
State access per block: ~6,000 unique accounts/slots

Total random reads: 6,000 × 8 = ~48,000 per block
At 0.1ms per SSD random read: 4.8 seconds (exceeds 2s execution budget)

Mitigations:
  1. In-memory trie cache: Keep hot trie nodes in RAM (~4-8 GB)
  2. Flat state database: Maintain a parallel key-value store
     (address → account) alongside the trie for fast reads
  3. Prefetching: Pre-load trie nodes during transaction validation
  4. Verkle trees: Reduce trie depth and proof computation
```

### Gas Metering Overhead

```
Problem: Every EVM opcode must check and deduct gas, adding overhead
to every single operation.

Cost per gas check: ~5 nanoseconds (compare + subtract + branch)
Opcodes per block: ~10M (at 30M gas with avg 3 gas/opcode)
Total overhead: ~50ms per block

This is acceptable today but limits future throughput scaling.
Optimizations:
  - JIT compilation: Compile hot contract bytecode to native code
  - Gas batching: Pre-compute gas for basic block sequences
  - WASM-based VMs: Replace stack-based EVM with register-based VM
```

---

## 6. Network Propagation Bottlenecks

### Block Propagation Latency Budget

```
Slot timeline (12 seconds):
  t=0s:   Proposer broadcasts block
  t=4s:   DEADLINE - Attestors must have received block to vote
  t=8s:   Attestation aggregation
  t=12s:  Next slot begins

If block arrives after t=4s:
  - Attestors vote for parent instead (proposer's block gets fewer votes)
  - Block may be orphaned if next proposer builds on parent

Block propagation budget breakdown:
  - Block creation/execution: ~500ms
  - Network propagation (p95): ~2-3 seconds
  - Attestor validation: ~500ms
  - Safety margin: ~500ms

Bottleneck: Large blocks (high gas usage) take longer to propagate
because peers must validate before forwarding.
```

### Eclipse Attack Vulnerability

```
Attack: Adversary controls all of a victim node's peer connections.

Method:
  1. Flood the victim's DHT routing table with attacker-controlled nodes
  2. Wait for victim to restart or rotate peers
  3. Victim connects only to attacker nodes
  4. Attacker can:
     - Delay block delivery (cause victim to attest to stale heads)
     - Filter transactions (censor specific senders)
     - Present a forked chain (double-spend against the victim)

Defense:
  - Maintain long-lived peer connections (resist churn)
  - Diverse peer selection across IP ranges and ASNs
  - Limit connections from single IP/subnet
  - Use multiple bootstrap mechanisms (DNS, hardcoded, DHT)
  - Peer scoring in GossipSub (penalize misbehaving peers)
```

---

## Bottleneck Summary

| Bottleneck | Severity | Impact | Mitigation |
|-----------|----------|--------|------------|
| Sequential EVM execution | High | Caps L1 at ~100 TPS | L2 rollups for execution scaling |
| State trie I/O amplification | High | Block processing time | Flat DB cache, Verkle trees |
| State growth | High | Increasing hardware requirements | State pruning, expiry, statelessness |
| Block propagation latency | Medium | Missed attestations, orphaned blocks | Block compression, blob separation |
| MEV centralization | Medium | Builder/proposer centralization | PBS, encrypted mempools |
| Mempool replacement races | Low | Non-deterministic tx inclusion | Fee bump minimums, private submission |
| Eclipse attacks | Medium | Node isolation, censorship | Peer diversity, GossipSub scoring |
| Finality latency (13 min) | Medium | Slow cross-chain bridges, UX | Single-slot finality research |
