# Key Architectural Insights

## 1. No Single Key Materialization: The MPC-TSS Paradigm Shift

**Category:** Security
**One-liner:** In a well-designed MPC wallet, the complete private key never exists in any single location---not during generation, not during signing, not during backup---eliminating the fundamental single-point-of-compromise vulnerability that plagues all other key management approaches.

**Why it matters:**
Traditional key management (even with HSMs) has an irreducible vulnerability: somewhere, at some point, the complete key must exist to produce a signature. MPC-TSS changes this mathematical reality. Distributed Key Generation (DKG) creates key shares such that the complete key is never computed; threshold signing produces valid ECDSA/Schnorr signatures from partial signatures without reconstruction. This is not defense-in-depth (layered security around a central secret)---it is the elimination of the central secret entirely. The architectural consequence is profound: a complete breach of any single component (server, device, enclave, backup) yields zero usable key material. Attackers must simultaneously compromise t-of-n geographically and organizationally separated systems, which fundamentally changes the threat model from "protect one thing very well" to "distribute trust so that no one thing matters."

---

## 2. Pre-Signing Triples: Decoupling Computation from Latency

**Category:** Contention
**One-liner:** MPC-CMP's pre-signing phase moves 80% of the interactive cryptographic computation offline, transforming a 2-second multi-round ceremony into a 200ms single-round signature---the difference between a usable wallet and an unusable one.

**Why it matters:**
Interactive MPC protocols require multiple rounds of communication between signer nodes. With nodes in different regions (required for security), each round adds 50--100ms of network latency. A 4-round protocol means 200--400ms of pure network travel, before any computation. Pre-signing exploits a crucial mathematical property: most of the MPC computation is message-independent. "Triples" (pre-computed shares of the nonce and multiplication values) can be generated in batch during off-peak hours. When a real signing request arrives, each party combines their pre-signed triple with the message hash in a single round. This pattern---pre-computing expensive, message-independent work and applying cheap, message-dependent work at request time---appears in many latency-sensitive systems (TLS session tickets, compiled query plans, pre-warmed ML models), but in MPC wallets, it is the difference between sub-second signing and multi-second signing, directly impacting whether DeFi interactions feel responsive or broken.

---

## 3. Nonce as a Serialization Bottleneck: The Single-Writer Pattern for Correctness

**Category:** Consistency
**One-liner:** On account-based blockchains, the sequential nonce requirement forces a single-writer architecture per address---a fundamental correctness constraint that cannot be parallelized away, only partitioned across addresses.

**Why it matters:**
Ethereum's account model requires strictly sequential nonces. Nonce 42 must be confirmed before nonce 43 can be included in a block. A gap (nonce 42 missing, nonce 43 submitted) blocks all subsequent transactions indefinitely. A duplicate (two transactions with nonce 42) causes one to be replaced by the other. For a wallet system processing millions of transactions across thousands of addresses, this creates a serialization bottleneck: for each (chain, address) pair, nonce assignment must be serialized. The single-writer pattern---one nonce manager instance per (chain, address), achieved via consistent hashing---is not an optimization choice but a correctness requirement. The system scales by parallelism across addresses (thousands of wallets signing concurrently) but cannot parallelize within a single address. This is why exchanges use hundreds of hot wallet addresses and rotate among them: not for security (which MPC handles), but for nonce parallelism. The pattern teaches a broader lesson: when a correctness constraint imposes serialization, the architecture should partition the serialized resource into independent lanes, not fight the serialization.

---

## 4. Account Abstraction as the UX/Security Unification Layer

**Category:** System Modeling
**One-liner:** ERC-4337 smart accounts transform wallets from simple key-pair wrappers into programmable authorization systems where authentication method, gas payment, transaction batching, and recovery logic are all configurable on-chain---unifying UX improvements with security guarantees.

**Why it matters:**
Before Account Abstraction, every UX improvement in crypto wallets was off-chain (and therefore trust-dependent): gas sponsorship required a centralized relayer, social recovery required a custodial backup, and transaction batching required a meta-transaction forwarder. ERC-4337 moves all of these to verifiable on-chain logic. The Paymaster contract sponsors gas with on-chain guarantees (the Paymaster's deposit in the EntryPoint is the budget). Social recovery is enforced by the smart account contract (guardians are on-chain, the time delay is on-chain, the owner rotation is on-chain). Passkey (P256) authentication happens via an on-chain signature verifier, not a centralized auth server. The architectural insight is that by making the account itself programmable, the wallet platform shifts from "we hold your key and do things on your behalf" to "the blockchain enforces your rules, and we provide the infrastructure to interact with it." This fundamentally changes the trust model: even if the wallet provider disappears, the user's smart account, its rules, and its guardians continue to function on-chain.

---

## 5. Key Lifecycle Outlives System Lifecycle: Irrecoverable Assets Demand 11-Nines Durability

**Category:** Resilience
**One-liner:** A wallet's key shares must survive hardware failures, software migrations, company acquisitions, and decades of storage---because unlike any other system data, losing a key means permanent, irrecoverable loss of assets with no backup, no support ticket, and no insurance claim.

**Why it matters:**
Most systems design durability for data that can, in extremis, be re-generated. User profiles can be re-created, transaction records can be reconstructed from logs, even financial ledgers have reconciliation processes. Crypto key shares have no such safety net. If all key shares are lost, the assets controlled by that key are permanently inaccessible---there is no blockchain support team, no admin override, no court order that can recover them. This demands durability engineering that goes beyond standard database replication: encrypted key shares in geo-distributed HSMs, air-gapped cold backups with documented recovery procedures, periodic backup verification (actually restore and test-sign, not just verify checksums), and operational procedures that survive employee turnover. The key refresh protocol (proactive secret sharing) adds another dimension: shares must be periodically rotated to defend against gradual compromise, but the rotation itself must be atomic---a half-completed refresh that deactivates old shares before new shares are confirmed creates the very loss scenario it's meant to prevent.

---

## 6. Chain Heterogeneity Makes Universal Abstraction Impossible: The Adapter Pattern Is the Only Honest Design

**Category:** System Modeling
**One-liner:** Bitcoin's UTXO model, Ethereum's account model, Solana's blockhash-based freshness, and Cosmos's sequence numbers are not superficial differences---they represent fundamentally different transaction models that demand chain-specific adapters behind a common interface, not a universal abstraction.

**Why it matters:**
The temptation in multi-chain wallet design is to create a universal transaction model that abstracts away chain differences. This fails for deep structural reasons: Bitcoin requires UTXO selection (choosing which unspent outputs to spend, with change address management), Ethereum requires sequential nonce tracking and EIP-1559 fee estimation, Solana requires a recent blockhash (valid for ~60 seconds) and computes fees from instruction complexity, and Cosmos uses a sequence number with separate gas simulation. Attempting to unify these into a single model either limits functionality (can't express chain-specific features) or leaks abstractions (the "universal" model requires chain-specific exceptions everywhere). The Strategy pattern with a common interface (`buildTransaction()`, `estimateGas()`, `broadcastTx()`) and chain-specific implementations is the only honest design. This is a recurring pattern in systems that integrate with heterogeneous external systems: the interface can be unified, but the implementation must be specific. Trying to force heterogeneous systems into a universal model creates an abstraction that is neither universal nor useful.

---

## 7. The Policy Engine Must Be Co-Available with Signing: Fail-Closed Is the Only Safe Default

**Category:** Resilience
**One-liner:** When the policy engine is unavailable, the signing service must refuse all requests (fail-closed), because the alternative---bypassing policy checks---turns every outage into a security vulnerability where unauthorized transactions can be signed without approval.

**Why it matters:**
In most microservice architectures, a degraded dependency triggers graceful degradation: cached data, default values, or reduced functionality. The policy engine in a wallet system is the exception. If a transaction requires 2-of-3 approval but the policy engine is down, the system cannot default to "approve" (security bypass) or "use cached policy" (stale policy may not reflect recent changes). The only safe default is fail-closed: refuse signing until the policy engine recovers. This creates a strict co-availability requirement---the policy engine must be as available as the signing service itself (99.99%). The architectural response is aggressive: in-memory policy caching with event-driven invalidation (not TTL-based), policy evaluation as an embedded library (not a remote call) for the most common rules, and a separate policy evaluation just before signature combination (not just at request entry) to catch policy changes during the MPC ceremony. The broader lesson: in security-critical systems, identify which dependencies are "fail-closed" (cannot be degraded) versus "fail-open" (can serve stale or default data), and engineer the fail-closed dependencies to match the availability target of the critical path.

---

## 8. Gas Sponsorship Is an Economic System, Not Just a Technical Feature

**Category:** Cost Optimization
**One-liner:** Paymaster-based gas sponsorship transforms user-facing gas costs into platform-side budget management---requiring per-user spending limits, fraud detection on sponsored transactions, and real-time budget tracking to prevent a single malicious user from draining the entire sponsorship pool.

**Why it matters:**
Gas sponsorship via ERC-4337 Paymasters appears simple: the platform deposits ETH in the EntryPoint contract, and UserOperations draw from that deposit. In practice, it creates an economic attack surface: a malicious user can submit thousands of sponsored transactions that consume gas without any genuine purpose, draining the Paymaster's deposit. The sponsorship system must enforce per-user daily limits, per-transaction gas caps, and allowlisted contract interactions (only sponsor gas for known dApps, not arbitrary contract calls). Real-time budget tracking must alert when daily spend exceeds thresholds. The Paymaster contract's `postOp()` function settles actual gas costs after execution---if the user's action consumed more gas than estimated, the platform absorbs the difference. Gas price volatility adds another dimension: a sponsorship budget of "$2M per day" translates to vastly different amounts of ETH depending on network congestion. The system needs dynamic sponsorship policies that tighten limits during gas price spikes and relax them during low-fee periods. This pattern---converting a per-transaction user cost into a platform-managed budget---appears in any "freemium" infrastructure product and always requires the same controls: per-user limits, abuse detection, and budget circuit breakers.

---

## Cross-Cutting Themes

| Theme | Insights | Key Takeaway |
|-------|----------|-------------|
| **Distributed trust as security primitive** | #1, #5 | The most powerful security architecture is not stronger walls around a central secret, but the elimination of the central secret through cryptographic distribution; MPC and threshold schemes embody this principle |
| **Correctness constraints that cannot be optimized away** | #3, #7 | Some architectural constraints (sequential nonces, fail-closed policy) exist for correctness, not performance. Recognize them early and design partitioning/availability strategies around them instead of trying to relax them |
| **On-chain vs. off-chain trust boundary** | #4, #6 | Account Abstraction moves trust from off-chain platforms to on-chain contracts; chain heterogeneity prevents universal on-chain abstraction. The system must carefully choose what logic lives on-chain (verifiable, censorship-resistant) vs. off-chain (performant, flexible) |
| **Pre-computation as a latency weapon** | #2, #8 | When real-time operations have strict latency budgets, move message-independent computation offline (pre-signing triples, pre-computed fee estimates, cached policies) and keep only message-dependent work on the hot path |
