# Interview Guide

## 45-Minute Interview Pacing

| Phase | Duration | Focus Area |
|-------|----------|------------|
| **Problem Scoping** | 5 min | Clarify requirements: public vs private chain, PoW vs PoS, smart contracts, scale |
| **High-Level Architecture** | 10 min | Node layers (P2P, consensus, execution, storage), block structure, data flow |
| **Consensus Deep Dive** | 10 min | PoS mechanics (Casper FFG + LMD-GHOST), finality, slashing, fork choice |
| **Execution & State** | 8 min | EVM, gas metering, Merkle Patricia Trie, state management |
| **Scaling & Security** | 8 min | L2 rollups, MEV, eclipse attacks, state pruning |
| **Trade-offs & Extensions** | 4 min | Design trade-offs, future directions (Verkle, sharding, single-slot finality) |

---

## Phase 1: Problem Scoping (5 min)

### Key Clarification Questions

**The candidate should ask:**

1. "Are we designing a public permissionless chain or a private/consortium chain?"
   - **Why it matters**: Public chains must handle Byzantine actors and require economic security (PoW/PoS); private chains can use simpler BFT consensus
   - **Good answer**: "I will focus on public permissionless, as it is the harder problem and subsumes private chain design"

2. "Should the chain support smart contracts (Turing-complete execution) or only value transfers?"
   - **Why it matters**: Smart contracts require a VM (EVM), gas metering, and state management (storage tries per contract)
   - **Good answer**: "Smart contracts, since they require deterministic execution and create the state explosion challenge"

3. "What consensus mechanism: PoW, PoS, or BFT?"
   - **Why it matters**: Fundamentally different security models, finality guarantees, and hardware requirements
   - **Good answer**: "PoS with a finality gadget (like Casper FFG), as it provides economic finality and energy efficiency"

4. "What is the target throughput and finality time?"
   - **Expected**: 15-100 TPS L1, seconds to minutes for finality, L2 for scaling beyond

5. "How many nodes should the network support?"
   - **Expected**: 10,000+ full nodes for meaningful decentralization

### Red Flags in Scoping

| Red Flag | Why It's Concerning |
|----------|-------------------|
| Immediately jumps to implementation without asking about chain type | Misses fundamental architectural choice |
| Treats it like a distributed database | Ignores the zero-trust, adversarial environment |
| Doesn't mention consensus at all | Missing the core challenge of blockchain design |
| Assumes centralized components (load balancer, primary database) | Fundamentally misunderstands decentralization |

---

## Phase 2: High-Level Architecture (10 min)

### Expected Architecture Components

The candidate should identify these layers:

```
1. P2P Networking Layer:
   - Gossip protocol for block/tx propagation
   - Peer discovery via DHT
   - 25-50 peer connections per node

2. Consensus Layer:
   - Block proposal mechanism
   - Fork choice rule (LMD-GHOST or longest chain)
   - Finality gadget (Casper FFG or BFT)

3. Execution Layer:
   - Transaction validation
   - VM execution (EVM or equivalent)
   - Gas metering / resource pricing

4. Storage Layer:
   - Block chain (append-only block history)
   - State trie (world state: accounts + storage)
   - Index layer (receipts, logs, bloom filters)

5. API Layer:
   - JSON-RPC for external clients
   - Engine API for CL↔EL communication
```

### Scoring Criteria

| Level | Expected Response |
|-------|-------------------|
| **Junior** | Mentions blocks linked by hashes, nodes store data, transactions are signed |
| **Mid** | Identifies gossip networking, fork choice, state trie, separates consensus from execution |
| **Senior** | Draws CL/EL separation, explains Engine API, discusses client diversity, mentions P2P topology trade-offs |
| **Staff** | Explains why CL/EL separation enables independent upgrades, discusses gossip mesh parameters, identifies attestation timing constraints within slot |

---

## Phase 3: Consensus Deep Dive (10 min)

### Core Questions

**Q1: "How does the network agree on which blocks are canonical when two valid blocks are proposed at the same time?"**

| Level | Expected Answer |
|-------|----------------|
| **Acceptable** | "Longest chain wins" (PoW) or "Most attestations wins" (PoS) |
| **Good** | Explains LMD-GHOST: each validator's latest message is a weighted vote; follow the heaviest subtree from the latest justified checkpoint |
| **Excellent** | Explains the interplay between LMD-GHOST (slot-level liveness) and Casper FFG (epoch-level finality); how justified/finalized checkpoints anchor the fork choice; why this hybrid design exists |

**Q2: "What happens if 40% of validators go offline?"**

| Level | Expected Answer |
|-------|----------------|
| **Acceptable** | "The chain slows down or stops" |
| **Good** | "Chain continues producing blocks (60% > 50% for LMD-GHOST), but finality stalls (60% < 66.7% for Casper FFG). Inactivity leak begins draining offline validators' stake until remaining validators reach 2/3 supermajority." |
| **Excellent** | Explains the inactivity leak mechanism in detail: quadratic penalty growth, how it self-heals the network, the trade-off between liveness and validator welfare, and how this differs from Tendermint (which would halt entirely) |

**Q3: "How do you prevent a validator from voting for two different blocks at the same slot?"**

| Level | Expected Answer |
|-------|----------------|
| **Acceptable** | "Penalize them" |
| **Good** | "Slashing conditions: double-voting and surround-voting are provable on-chain. Any node can submit slashing evidence. The slashed validator loses a portion of their stake." |
| **Excellent** | Explains the correlation penalty (penalty scales with how many others are slashed simultaneously), the whistleblower incentive, and how this creates a Nash equilibrium where honest behavior is dominant |

---

## Phase 4: Execution & State (8 min)

### Core Questions

**Q4: "How does the EVM ensure deterministic execution across thousands of independent nodes?"**

| Level | Expected Answer |
|-------|----------------|
| **Acceptable** | "All nodes run the same bytecode" |
| **Good** | "Stack-based VM with fixed-cost opcodes; no floating point, no system calls, no randomness, no external I/O. Every opcode is fully specified so any correct implementation produces identical output. Gas metering also prevents infinite loops." |
| **Excellent** | Discusses the challenges: compiler differences can cause divergence, need for formal specification, how PREVRANDAO replaced DIFFICULTY for randomness (proposer-committed value), and why timestamp is constrained to ±15 seconds |

**Q5: "How is the entire world state committed to a single 32-byte hash?"**

| Level | Expected Answer |
|-------|----------------|
| **Acceptable** | "Using a Merkle tree" |
| **Good** | "Modified Merkle Patricia Trie: each account address is hashed to a 256-bit key, the trie maps this key to the account's (nonce, balance, storageRoot, codeHash). Each contract also has its own storage trie. The root hash of the world state trie goes into the block header." |
| **Excellent** | Explains the I/O amplification problem (~8 levels × 6000 accesses = 48K random reads per block), mitigation via flat state DB + in-memory cache, and the transition to Verkle trees for smaller proofs (~200 bytes vs ~3 KB) |

**Q6: "Why does gas exist, and how does the fee market work?"**

| Level | Expected Answer |
|-------|----------------|
| **Acceptable** | "To prevent abuse" |
| **Good** | "Gas solves the halting problem (bounded execution) and prices computational resources. EIP-1559 introduces an algorithmic base fee (burned) + user priority tip (to proposer). Base fee adjusts +/-12.5% per block to target 50% gas utilization." |
| **Excellent** | Discusses why burning the base fee prevents proposer manipulation, how elastic block sizes (target 15M, max 30M gas) absorb bursts, and why first-price auctions led to overpayment and poor UX |

---

## Phase 5: Scaling & Security (8 min)

### Core Questions

**Q7: "How do you scale a blockchain beyond ~100 TPS without sacrificing decentralization?"**

| Level | Expected Answer |
|-------|----------------|
| **Acceptable** | "Bigger blocks or faster blocks" (shows lack of understanding of decentralization trade-off) |
| **Good** | "Layer 2 rollups: move execution off-chain, post data to L1 for verification. Optimistic rollups use fraud proofs (7-day challenge window); ZK rollups use validity proofs (instant verification). L1 scales data availability (EIP-4844 blobs)." |
| **Excellent** | Explains the scalability trilemma, why rollup-centric scaling preserves L1 decentralization, the role of data availability sampling (DAS) in future Danksharding, and how shared sequencers could enable cross-rollup composability |

**Q8: "What is MEV and why is it a problem?"**

| Level | Expected Answer |
|-------|----------------|
| **Acceptable** | "Miners/validators can reorder transactions" |
| **Good** | "Maximal Extractable Value: block producers can reorder, insert, or censor transactions for profit (front-running, sandwich attacks, liquidations). This leads to builder centralization and unfair user outcomes. Proposer-Builder Separation (PBS) mitigates by separating building from proposing." |
| **Excellent** | Discusses the MEV supply chain (searchers → builders → relays → proposers), how encrypted mempools and inclusion lists could further reduce MEV, and the tension between MEV smoothing and validator revenue |

---

## Phase 6: Trade-offs & Extensions (4 min)

### Key Trade-offs to Discuss

| Trade-off | Option A | Option B |
|-----------|----------|----------|
| **Finality speed vs. decentralization** | Single-slot finality (requires committee rotation, possible centralization) | Multi-epoch finality (13 min, but supports 1M+ validators) |
| **State storage vs. node accessibility** | Full state (fast queries, large storage) | Stateless clients (small footprint, needs witnesses) |
| **L2 diversity vs. composability** | Many independent rollups (competition, innovation) | Shared sequencer (atomic cross-rollup txns, coordination) |
| **Privacy vs. compliance** | Fully private transactions (user autonomy) | Transparent ledger (regulatory compliance, auditability) |
| **Block size vs. decentralization** | Larger blocks (higher throughput) | Smaller blocks (lower hardware requirements, more nodes) |

### Extension Questions

| Extension | What to Look For |
|-----------|-----------------|
| "How would you add privacy?" | ZK proofs for confidential transactions, stealth addresses, compliance hooks |
| "How would cross-chain bridges work?" | Light client verification vs. multisig bridges; security trade-offs |
| "How would you implement governance?" | On-chain voting vs. off-chain signaling; time-locks, veto mechanisms |
| "How would you handle a critical client bug?" | Emergency coordination, client diversity as defense, weak subjectivity checkpoints |

---

## Trap Questions

### Trap 1: "Why not just increase the block size to get more throughput?"

**Trap**: Seems like an obvious solution, but ignores the decentralization trade-off.

**Good answer**: "Larger blocks require more bandwidth, storage, and compute from every full node. This raises the hardware bar for running a node, reducing the number of nodes, which reduces decentralization and censorship resistance. Instead, scale execution off-chain via rollups while keeping L1 block sizes manageable."

### Trap 2: "Can't we just use a database instead of a Merkle trie?"

**Trap**: Regular databases are faster, so why use tries?

**Good answer**: "A database gives you fast lookups but no ability to produce compact proofs. The Merkle trie enables any node to prove any fact about the state (this account has X balance) to a light client that only has the state root. This verifiability is what distinguishes a blockchain from a centralized database. You can (and should) maintain a flat DB alongside the trie for fast reads, but the trie is the source of truth for verification."

### Trap 3: "If 2/3 of validators are honest, isn't the system secure?"

**Trap**: Oversimplifies the security model.

**Good answer**: "2/3 honest stake is necessary but not sufficient. You also need: client diversity (a bug in a 70% client is a consensus failure), geographic diversity (regulatory pressure on one jurisdiction could take down validators), peer diversity (eclipse attacks don't require stake), and defense against MEV centralization (builder dominance undermines proposer independence). Security is multi-dimensional."

### Trap 4: "Why not use BFT (like Tendermint) instead of Nakamoto consensus?"

**Good answer**: "BFT provides instant finality but has trade-offs: (1) requires known, bounded validator set (scales to hundreds, not thousands), (2) halts if 1/3 goes offline (no liveness under partition), (3) requires all-to-all communication (O(n²) messages). Ethereum's hybrid approach (LMD-GHOST for liveness + Casper FFG for finality) gets liveness from Nakamoto-style fork choice and safety from BFT-style finality. Tendermint/CometBFT is excellent for application-specific chains with smaller validator sets."

---

## Scoring Rubric

| Dimension | Weight | Junior (1-2) | Mid (3-4) | Senior (5-6) | Staff (7-8) |
|-----------|--------|-------------|-----------|--------------|-------------|
| **Problem Scoping** | 10% | Skips requirements | Asks basic questions | Identifies key dimensions (trust, finality, throughput) | Drives scoping with trade-off awareness |
| **Architecture** | 20% | Flat "nodes store blocks" | Identifies layers | Draws CL/EL separation with clear interfaces | Explains why separation exists; discusses attestation timing budget |
| **Consensus** | 25% | "Longest chain" only | Explains PoS basics | Articulates Gasper hybrid; explains slashing | Discusses inactivity leak, correlation penalty, finality guarantees |
| **Execution/State** | 20% | "Runs code on chain" | Describes EVM + gas | Explains state trie, determinism requirements | Discusses I/O amplification, Verkle transition, gas metering overhead |
| **Scaling** | 15% | "Make blocks bigger" | Knows about rollups | Explains optimistic vs ZK, data availability | Discusses DAS, shared sequencers, cross-rollup composability |
| **Security** | 10% | "51% attack" only | Knows about slashing | Discusses eclipse, MEV, client diversity | Articulates multi-dimensional security model |

### Score Interpretation

| Total Score | Recommendation |
|-------------|---------------|
| 1-2 | Not ready for blockchain system design questions |
| 3-4 | Junior/mid-level: understands basics but lacks depth on consensus and state |
| 5-6 | Senior: strong understanding of architecture, consensus, and scaling trade-offs |
| 7-8 | Staff+: can discuss protocol design at the level of EIP proposals and research papers |
