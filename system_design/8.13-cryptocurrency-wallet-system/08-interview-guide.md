# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0--5 min | **Clarify** | Scope the problem | Custodial vs. non-custodial? Retail vs. institutional? Which chains? What scale? |
| 5--15 min | **High-Level** | Core architecture | MPC key management, signing flow, multi-chain adapter pattern, policy engine |
| 15--30 min | **Deep Dive** | 1--2 critical components | MPC signing ceremony OR Account Abstraction pipeline OR nonce management |
| 30--40 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios | HSM throughput, pre-signing optimization, key recovery, multi-region signing |
| 40--45 min | **Wrap Up** | Security, compliance, summary | Travel Rule, custody licensing, audit trail, key lifecycle |

---

## Meta-Commentary

### How to Approach This Problem

1. **Start with trust model, not architecture**: The first decision is who controls the keys. This single choice (custodial vs. non-custodial vs. MPC hybrid) determines the entire security architecture, recovery model, and regulatory posture. Make this explicit.

2. **Distinguish wallet from account**: A wallet manages keys; an account is an address on a blockchain. One wallet can derive many accounts across many chains. Do not conflate key management with balance tracking.

3. **MPC is the core novelty**: If the interviewer asks about a crypto wallet, they likely want to hear about MPC/TSS, not just "store private key in HSM." Show understanding of threshold cryptography, DKG, and why key shares never reconstruct.

4. **Account Abstraction is the modern layer**: Show awareness of ERC-4337 (smart contract wallets, Paymasters, Bundlers) as the UX evolution beyond EOA-based wallets. This demonstrates current knowledge.

5. **Multi-chain is not optional**: A wallet that only supports Ethereum is a toy. Address the challenge of heterogeneous signing algorithms, different nonce models, and chain-specific fee estimation.

### What Makes This System Unique/Challenging

- **Key material is the product**: Unlike most systems where data can be re-generated or restored from backups, losing a private key means permanent, irrecoverable loss of assets. The durability requirement for key material is higher than any other system.
- **Cryptographic protocol correctness**: A bug in MPC implementation is not just a software bug---it is a potential theft vector. The signing protocol must be formally verified or at minimum extensively audited.
- **Heterogeneous blockchain support**: Each chain has different transaction models (account vs. UTXO), signing algorithms, fee mechanisms, and finality guarantees. The system must abstract these differences while preserving chain-specific optimizations.
- **Regulatory asymmetry**: The same wallet system may be custodial (regulated as a financial institution) in one jurisdiction and non-custodial (unregulated) in another. Architecture must support both modes simultaneously.

### Where to Spend Most Time

| If Interviewer Focuses On... | Deep Dive Into... |
|------------------------------|-------------------|
| Security | MPC protocol, key share isolation, TEE/HSM, attack trees |
| Scalability | Pre-signing optimization, HSM throughput, nonce management, multi-chain scaling |
| UX/Product | Account Abstraction, gas sponsorship, passkey auth, social recovery |
| Distributed Systems | MPC ceremony coordination, nonce consensus, key refresh protocol |
| Compliance | Travel Rule, custody licensing, audit trail, KYC/AML integration |

---

## Trade-offs Discussion

### Trade-off 1: MPC vs. Multi-Signature

| Factor | MPC-TSS | On-Chain Multi-Sig |
|--------|---------|-------------------|
| **Pros** | Single on-chain address (privacy); no multi-sig contract deployment cost; works on any chain (protocol-level, not smart-contract-level); threshold change doesn't require on-chain tx | Simpler cryptography; on-chain transparency; battle-tested (Safe has $100B+ secured) |
| **Cons** | Complex cryptography; interactive protocol (latency); pre-signing overhead; harder to audit | Requires smart contract per chain; gas cost for multi-party approval; on-chain visibility of signers |
| **Recommendation** | Use MPC-TSS for multi-chain key management (works universally); use on-chain multi-sig as an additional policy layer for high-value operations on smart contract chains |

### Trade-off 2: TEE vs. HSM for Key Operations

| Factor | TEE (SGX/TrustZone) | HSM (FIPS 140-2 L3) |
|--------|---------------------|---------------------|
| **Pros** | Software-scalable; lower cost; faster operations (10K+ ops/sec); programmable enclave logic | Hardware tamper-proof; FIPS certified; regulatory acceptance; physically isolated |
| **Cons** | Side-channel attacks (Spectre, Foreshadow); attestation complexity; Intel SGX deprecation concerns | Expensive ($50K+/module); limited throughput (1--5K ops/sec); vendor lock-in; cannot run arbitrary code |
| **Recommendation** | Hybrid: TEE for MPC computation and transient key share operations; HSM for root key storage and key share encryption/decryption. HSM provides the compliance stamp; TEE provides the performance |

### Trade-off 3: Custodial vs. Non-Custodial vs. Hybrid

| Factor | Custodial | Non-Custodial | Hybrid MPC |
|--------|-----------|---------------|-----------|
| **Pros** | Simplest UX; institutional compliance; account recovery by support team | Maximum security (user controls keys); no platform risk; censorship-resistant | Best of both: no single point of compromise OR loss; recovery possible; institutional-grade |
| **Cons** | Single point of failure (platform breach = all funds); regulatory burden; user trust required | Seed phrase management; no recovery if lost; poor UX for mainstream users | MPC complexity; latency overhead; protocol-level bugs are critical |
| **Recommendation** | Hybrid MPC as default for retail and institutional; custodial as a specific product for exchange-like use cases; non-custodial for hardware wallet integration |

### Trade-off 4: Pre-Signing vs. On-Demand Signing

| Factor | Pre-Signing (Offline Triples) | On-Demand (Full Ceremony) |
|--------|-------------------------------|--------------------------|
| **Pros** | < 200ms online signing; latency-predictable; better UX | Simpler architecture; no triple management; no stale-triple risk |
| **Cons** | Storage for triples; background pre-signing jobs; triple exhaustion risk; wasted triples for inactive wallets | 1--3s signing latency; interactive multi-round protocol on critical path |
| **Recommendation** | Pre-signing for high-volume wallets (exchanges, payment processors); on-demand for low-volume wallets (personal wallets with < 10 txns/day). Adaptive: auto-switch based on observed usage pattern |

### Trade-off 5: Single-Chain Nonce Manager vs. Global Nonce Service

| Factor | Per-Chain Nonce Manager | Global Nonce Service |
|--------|------------------------|---------------------|
| **Pros** | Simple; chain-specific logic isolated; failure blast radius limited to one chain | Unified nonce tracking; simpler operational model; single monitoring point |
| **Cons** | Multiple services to operate; inconsistent behavior across chains | Cross-chain coupling; single point of failure; harder to optimize per chain |
| **Recommendation** | Per-chain nonce management: Bitcoin UTXO selection is fundamentally different from EVM nonce increment and Solana blockhash. Forcing them into one service creates artificial coupling |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just store the private key encrypted in a database?" | Understand MPC value proposition | "That creates a single point of compromise. If the DB encryption key is leaked, all keys are exposed simultaneously. MPC distributes trust: even a complete server breach yields only one key share, which is useless alone." |
| "Can you just use a multi-sig smart contract instead of MPC?" | Understand MPC vs. multi-sig trade-offs | "Multi-sig works for smart-contract chains but not for Bitcoin or other non-smart-contract chains. MPC operates at the cryptographic protocol level, producing a standard single-sig transaction on any chain. Also, multi-sig reveals the governance structure on-chain." |
| "What happens if one MPC signer node is compromised?" | Test security depth | "With 2-of-3 threshold, one compromised node cannot sign alone. We immediately detect anomalous access, initiate key refresh to rotate all shares (invalidating the compromised share), and the new share distribution excludes the compromised node until it's re-provisioned." |
| "How do you handle a user who loses their device?" | Test recovery understanding | "In MPC 2-of-3: the platform server share + backup enclave share can initiate key refresh, generating a new user share on the user's new device. For AA wallets: social recovery via guardians can rotate the owner key on-chain. Neither path requires the original device." |
| "Why not use blockchain for everything—balances, history, etc.?" | Understand off-chain vs. on-chain trade-offs | "Blockchain is the source of truth, but querying it directly for every balance check is too slow (100--500ms per RPC call). We index chain data into an off-chain store with 5--10s TTL caching, serving 95%+ of reads from cache. The chain is the authoritative source, not the serving layer." |
| "How would you handle 100x the current signing volume?" | Forward thinking about scaling | "Three levers: (1) pre-signing triples eliminate interactive rounds, so online signing is mostly CPU-bound combination, (2) HSM pool expansion with TEE offloading for computation, and (3) parallel signing across wallet partitions since there's no cross-wallet coordination." |

---

## Common Mistakes to Avoid

1. **Treating crypto wallets like traditional wallets**: A crypto wallet holds keys, not money. The "money" is always on the blockchain. This distinction matters for architecture: the wallet system needs zero custody of funds in the non-custodial model.

2. **Ignoring the MPC ceremony latency budget**: Interactive MPC protocols require multiple network round-trips between signer nodes. Placing nodes in different continents adds 200--400ms per round. Pre-signing is not optional for production latency targets.

3. **Conflating nonce management across chains**: Ethereum's sequential account nonce, Bitcoin's UTXO model, and Solana's blockhash-based freshness are fundamentally different. A single "nonce service" that treats them identically will fail.

4. **Underestimating key lifecycle complexity**: Key creation is the easy part. Key refresh (rotating shares without changing the public key), key recovery (guardian-based social recovery), and key migration (moving between custody models) are where the real complexity lives.

5. **Forgetting that transactions are irreversible**: Unlike traditional payment systems with chargeback mechanisms, blockchain transactions cannot be reversed. Every safety check (policy evaluation, address verification, simulation) must happen BEFORE signing, not after.

6. **Over-engineering multi-chain from day one**: Support 3--5 high-value chains well before attempting 50+. Each new chain adds a unique adapter, node infrastructure, fee model, and finality guarantee. Chain count scales linearly but operational complexity scales super-linearly.

7. **Ignoring gas economics**: Gas sponsorship via Paymasters is not free. A poorly designed sponsorship policy can drain the Paymaster contract in hours. Budget controls, per-user limits, and fraud detection on sponsored gas are essential.

---

## Questions to Ask Interviewer

| Question | Why It Matters |
|----------|---------------|
| "Is this for retail users or institutional custody?" | Determines whether MPC complexity is justified; institutional needs policy engines and multi-approval |
| "Which blockchains must be supported?" | Determines signing algorithm diversity and nonce management complexity |
| "What's the expected signing volume?" | Determines whether pre-signing optimization is necessary |
| "Is gas sponsorship required?" | If yes, must design Paymaster infrastructure and budget controls |
| "What custody regulations apply?" | Determines Travel Rule integration, SOC 2 requirements, segregation needs |
| "Should the wallet support account abstraction (ERC-4337)?" | Determines whether smart account infrastructure is in scope |
| "Is hardware wallet (Ledger/Trezor) integration required?" | Adds WalletConnect integration and device-specific signing flows |
| "What's the recovery model?" | Social recovery, backup shares, or support-assisted recovery change the architecture significantly |

---

## Scoring Rubric (What Interviewers Look For)

| Dimension | Junior (Misses) | Senior (Covers) | Staff+ (Excels) |
|-----------|-----------------|-----------------|------------------|
| **Key Management** | "Store encrypted private key in database" | Describes MPC-TSS, explains threshold signing | Discusses DKG protocol, pre-signing optimization, key refresh lifecycle |
| **Security Model** | Single key in HSM | MPC share distribution across trust domains | TEE + HSM layering, attack tree analysis, insider threat mitigation |
| **Multi-Chain** | Assumes all chains are EVM | Mentions Bitcoin UTXO vs. EVM account model | Designs chain adapter pattern; discusses signing algorithm differences (ECDSA vs. EdDSA vs. BLS) |
| **Account Abstraction** | Not mentioned | Describes ERC-4337 basics (UserOp, Bundler, Paymaster) | Designs gas sponsorship budget system; discusses passkey integration for P256 signatures |
| **Failure Handling** | "Retry on failure" | Describes nonce gap handling, MPC node failure recovery | Designs key recovery procedures, discusses chain reorg impact, policy-during-signing race condition |
| **Scale** | "Add more servers" | Discusses pre-signing, HSM pools, caching layers | Designs partitioned nonce manager, adaptive pre-signing pools, per-chain scaling strategy |
