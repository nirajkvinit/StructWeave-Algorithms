# Blockchain Network System Design

## System Overview

A blockchain network---exemplified by Bitcoin, Ethereum, and next-generation chains like Avalanche and Aptos---is a decentralized, append-only ledger maintained by thousands of independent nodes that reach agreement on state transitions without any central authority. Ethereum processes approximately 1.2 million transactions per day across 10,000+ globally distributed nodes; Bitcoin secures over $1 trillion in value with a network of 50,000+ reachable nodes. The core engineering challenge lies at the intersection of **consensus without trust** (thousands of anonymous participants must agree on a single canonical chain despite Byzantine actors, network partitions, and variable latency---the fundamental problem formalized by the Byzantine Generals' Problem), **deterministic execution** (every node must independently execute the same smart contract code and arrive at identical state---a single bit of divergence causes a chain fork), **cryptographic state integrity** (the entire world state of millions of accounts and storage slots must be committed to a single 32-byte root hash via Merkle Patricia Tries, enabling any node to prove any fact about the state without downloading the full database), and **economic security** (the cost of attacking the network must exceed the potential profit---enforced through proof-of-work energy expenditure, proof-of-stake slashing conditions, or a combination thereof). Unlike traditional distributed databases that trust all participants and optimize for throughput, a blockchain network operates in an adversarial environment where any participant may be malicious, making safety guarantees the primary design constraint above all else.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Append-only writes (blocks are never modified); reads are state lookups against the latest or historical Merkle root |
| **Latency Sensitivity** | Moderate---block times range from 1s (L2/fast L1) to 600s (Bitcoin); finality ranges from seconds (BFT) to minutes (Nakamoto) |
| **Consistency Model** | Probabilistic finality (Nakamoto consensus) or deterministic finality (BFT variants); eventual consistency across all nodes |
| **Trust Model** | Zero trust---every node independently validates every block; no trusted third party |
| **Data Volume** | Very High---Ethereum full state exceeds 200 GB; Bitcoin chain exceeds 600 GB; archive nodes store petabytes |
| **Architecture Model** | P2P gossip network with layered consensus (block proposal + finality gadget); deterministic VM for smart contract execution |
| **Economic Security** | Proof-of-Stake requires 32 ETH per validator (~$80K); attacking finality requires controlling 1/3 of total stake (~$15B) |
| **Complexity Rating** | **Extreme** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key design decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Consensus deep dive, state explosion, MEV, fork management |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Layer 2 rollups, sharding, state pruning, light clients |
| [06 - Security & Compliance](./06-security-and-compliance.md) | 51% attacks, Eclipse attacks, smart contract vulnerabilities, slashing |
| [07 - Observability](./07-observability.md) | Chain metrics, peer health, mempool monitoring, consensus dashboards |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trade-offs, trap questions |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Blockchain Network (This) | Distributed Database | Payment Processing (5.5) | Digital Wallet (8.4) |
|--------|--------------------------|---------------------|-------------------------|---------------------|
| **Trust Model** | Zero trust---every node validates independently; Byzantine fault tolerant | Trusted nodes within a private network; crash fault tolerant | Trusted parties with contractual agreements | Centralized trust in the platform operator |
| **Consensus** | Proof-of-Stake/Work across 10K+ anonymous nodes | Raft/Paxos across 3-7 known nodes | No consensus---central authority decides | Single-writer per ledger partition |
| **Data Model** | Append-only chain of cryptographically linked blocks | Mutable rows/documents with MVCC | Mutable transaction records | Double-entry ledger with mutable balances |
| **Finality** | Probabilistic (minutes) or deterministic (seconds with BFT) | Immediate after commit | Immediate after authorization | Immediate within the platform |
| **Throughput** | 15-100 TPS (L1); 2,000-15,000 TPS (L2) | 100K-1M+ TPS | 65,000+ TPS (card networks) | 23,000+ TPS |
| **State Verification** | Any node can prove any fact via Merkle proof | Trust the database server | Trust the payment processor | Trust the wallet provider |
| **Failure Mode** | Network degrades but never halts (liveness over safety in Nakamoto) | Unavailable if quorum lost | Unavailable if central system fails | Unavailable if platform fails |

---

## What Makes This System Unique

1. **Consensus Without Central Authority**: The fundamental innovation is achieving agreement among thousands of untrusted, anonymous participants. Nakamoto consensus (longest-chain rule with proof-of-work) solved this by making block production expensive---an attacker must outspend the entire honest network. Modern proof-of-stake (Gasper = Casper FFG + LMD-GHOST) achieves finality through economic bonds: validators stake capital that gets slashed for equivocation, making attacks financially devastating rather than computationally expensive.

2. **Deterministic State Machine Replication**: Every node executes every transaction independently and must arrive at the exact same state. The Ethereum Virtual Machine (EVM) is a stack-based, Turing-complete execution environment where every opcode has a fixed gas cost. Gas metering serves dual purposes: it prevents infinite loops (halting problem) and creates a fee market that prices computational resources. A single non-deterministic instruction (floating point, system time, random number) would cause chain splits.

3. **Cryptographic State Commitment via Merkle Tries**: The entire world state---every account balance, every smart contract storage slot---is organized into a Modified Merkle Patricia Trie that reduces to a single 32-byte state root in each block header. This enables light clients to verify any claim about the state without downloading the full database, using compact Merkle proofs of O(log n) size. Verkle trees (expected 2025-2026) will reduce proof sizes from ~3 KB to ~200 bytes per access.

4. **Economic Security and Incentive Alignment**: Security is not enforced by firewalls or access control but by economic incentives. Block proposers earn rewards for honest behavior (block rewards + transaction fees) and face penalties for misbehavior (slashing of staked capital). The cost to attack Ethereum's finality requires controlling $15B+ in stake---and the attack itself would destroy the value of the attacker's holdings.

5. **Transaction Lifecycle with Fee Markets**: Transactions traverse a complex lifecycle: creation with cryptographic signature, propagation via gossip protocol, mempool admission with fee-based prioritization (EIP-1559 base fee + priority fee), block inclusion by a proposer, execution in the EVM, and finally confirmation through successive block attestations. The fee market dynamically adjusts to congestion, burning the base fee to create deflationary pressure.

6. **Layer 2 Scaling as an Architectural Pattern**: Rather than scaling the base layer (which would compromise decentralization), the ecosystem has converged on rollups---separate execution environments that post compressed transaction data to the base layer for data availability while inheriting its security. Optimistic rollups assume validity with fraud proofs; ZK rollups provide cryptographic validity proofs. This architectural separation of execution from consensus is a paradigm shift in distributed systems design.

---

## Quick Reference: Scale Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Global node count | 10,000-50,000+ | Full nodes across the network |
| Active validators (PoS) | ~1,000,000 | Ethereum validator set |
| Transactions per day (L1) | ~1.2M | Ethereum mainnet |
| Transactions per second (L1 peak) | ~100 | Gas limit dependent |
| Transactions per second (L2 peak) | 2,000-15,000 | Per rollup; combined exceeds 50K TPS |
| Block time | 12s (Ethereum), 10min (Bitcoin) | Slot time for block proposal |
| Time to finality | ~13 min (Ethereum), ~60 min (Bitcoin) | 2 epochs (Ethereum), 6 blocks (Bitcoin) |
| Full chain size | 600 GB+ (Bitcoin), 200 GB+ (Ethereum) | Pruned state; archive nodes far larger |
| State trie size | ~200 GB | Ethereum world state |
| Mempool size | 10,000-100,000 txns | Varies with congestion |
| Block gas limit | 30M gas | Ethereum target |
| Minimum stake | 32 ETH (~$80K) | Per validator in Ethereum PoS |
| Slashing penalty | Up to full stake | For finality-violating behavior |
| Base fee adjustment | +/-12.5% per block | EIP-1559 dynamic pricing |
| Merkle proof size | ~3 KB (current), ~200B (Verkle) | Per account access |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [1.5 - Distributed Log-Based Broker](../1.5-distributed-log-based-broker/) | Append-only log patterns, consensus protocols (Raft), replication |
| [5.5 - Payment Processing System](../5.5-payment-processing-system/) | Transaction processing, finality, idempotency patterns |
| [8.2 - Stripe/Razorpay](../8.2-stripe-razorpay/) | Fee market design, settlement patterns |
| [8.4 - Digital Wallet](../8.4-digital-wallet/) | Ledger consistency, double-spend prevention, balance management |
| [2.1 - Content Delivery Network](../2.1-content-delivery-network/) | Peer-to-peer distribution, gossip propagation, caching layers |

---

## Sources

- Ethereum Foundation --- Gasper Consensus Protocol Documentation
- Ethereum Foundation --- Merkle Patricia Trie Specification
- Ethereum Foundation --- Verkle Trees Roadmap
- Ethereum Foundation --- EIP-1559: Fee Market Change for ETH 1.0 Chain
- Vitalik Buterin --- Casper FFG and LMD-GHOST Fork Choice Design Notes
- Bitcoin Core --- P2P Network Protocol Documentation
- libp2p Project --- GossipSub Protocol Specification
- Kademlia --- A Peer-to-Peer Information System Based on the XOR Metric (Maymounkov & Mazières)
- Sei Labs --- Scaling the EVM from First Principles
- IACR ePrint --- Measuring and Attacking the Ethereum Global Network (2025)
