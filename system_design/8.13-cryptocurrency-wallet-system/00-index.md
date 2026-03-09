# Cryptocurrency Wallet System Design

## System Overview

A cryptocurrency wallet system---exemplified by Fireblocks, Privy, Safe, ZeroDev, and Turnkey---manages the generation, storage, and operational use of cryptographic keys that control digital assets on blockchain networks. Unlike traditional wallets that "hold" money, crypto wallets hold the *keys* that prove ownership of on-chain assets. The core engineering challenge spans **key management architecture** (custodial vs. non-custodial vs. hybrid models, each with fundamentally different trust assumptions), **MPC-based threshold signatures** (splitting private keys into shares so no single party ever holds the complete key, using distributed key generation and threshold signing protocols), **Account Abstraction via ERC-4337** (replacing EOA-based accounts with smart contract wallets that support programmable authentication, gas sponsorship via Paymasters, batched transactions, and social recovery), **TEE/HSM secure enclaves** (hardware-isolated key operations using SGX, TrustZone, and FIPS 140-2 Level 3 HSMs that ensure key material never exists in plaintext outside tamper-proof boundaries), and **multi-chain orchestration** (unified key management across EVM chains, Bitcoin UTXO model, Solana, and Cosmos with chain-specific signing schemes, nonce management, and fee estimation). The system must serve both retail users (who expect Web2-level simplicity with passkey authentication and gasless transactions) and institutional clients (who require policy engines, multi-approval workflows, and regulatory compliance for custody of billions in digital assets).

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Write-heavy for signing operations; read-heavy for balance queries and transaction history |
| **Latency Sensitivity** | High---transaction signing must complete in < 500ms for DeFi interactions; MPC ceremonies in < 2s |
| **Consistency Model** | Strong consistency for key state and nonce management; eventual consistency for balance aggregation |
| **Security Model** | Zero-trust key management; no single point of compromise; defense-in-depth with TEE + MPC + policy layers |
| **Data Volume** | 100M+ wallet addresses, 500M+ daily balance queries, 10M+ daily signing operations |
| **Architecture Model** | Microservices with hardware-backed signing enclaves; event-driven policy enforcement; multi-chain adapter pattern |
| **Regulatory Burden** | High---Travel Rule compliance, custody licensing (BitLicense, MiCA, VARA), AML/KYC, SOC 2 Type II |
| **Complexity Rating** | **Very High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | MPC signing ceremony, DKG protocol, nonce management deep dives |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Threat model, key security, custody compliance, Travel Rule |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trade-offs, trap questions, scoring rubric |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Crypto Wallet (This) | Digital Wallet (Fiat) | Cryptocurrency Exchange | Payment Gateway | Password Manager |
|--------|----------------------|-----------------------|-------------------------|-----------------|------------------|
| **Key Management** | MPC/TSS key sharding, DKG, no single key materialization | PIN/biometric for account access; keys managed by issuer | Hot/cold wallet split; exchange controls keys | Token vault for card data; PCI-DSS scoped | Zero-knowledge encryption; master password derives vault key |
| **Trust Model** | Configurable: custodial, non-custodial, or hybrid MPC | Fully custodial; provider holds funds | Custodial by default; withdrawal to personal wallet | Pass-through; no custody of funds | Zero-knowledge; provider cannot access secrets |
| **Transaction Model** | On-chain signing with nonce management; irreversible once confirmed | Off-chain ledger entries; reversible via chargebacks | Internal ledger for trades; on-chain for withdrawals | Authorization-capture-settlement cycle | No transactions; read/write to encrypted vault |
| **Recovery** | Social recovery via guardians, MPC key refresh, seed phrases | Customer support resets credentials | KYC-based account recovery | Card reissuance by issuer | Recovery kit or emergency access contacts |
| **Multi-Chain** | Core requirement: EVM, Bitcoin, Solana, Cosmos, etc. | Not applicable; single fiat currency system | Multi-chain support for listed assets | Multi-network (Visa, Mastercard) | Not applicable |
| **Gas/Fee Model** | Gas sponsorship via Paymasters; EIP-1559 fee estimation | No gas; transaction fees absorbed by provider | Maker/taker fees; withdrawal fees | Merchant discount rate + interchange | No transaction fees |
| **Regulatory** | Custody licensing, Travel Rule, MiCA, BitLicense | Money transmitter license, PSD2 | Exchange license, securities laws | Payment processor registration | Data protection (GDPR), no financial regulation |

---

## What Makes This System Unique

1. **No Single Key Materialization**: Unlike any other system where secrets exist somewhere in plaintext (even momentarily), MPC wallets generate, store, and use private keys in a distributed manner where the complete key never exists in any single location. The DKG protocol creates key shares across multiple parties, and threshold signing produces valid signatures without reconstruction. A breach of any single component---server, device, or enclave---yields zero usable key material.

2. **Programmable Account Logic via Account Abstraction**: ERC-4337 transforms wallets from simple key-pairs into programmable smart contracts. Authentication can use passkeys (P256 curves) instead of secp256k1, transactions can be batched and sponsored by third parties, spending limits and time-locks are enforced on-chain, and account recovery bypasses seed phrases entirely through guardian-based social recovery. This is not just a UX improvement---it changes the security model fundamentally.

3. **Multi-Chain Key Derivation with Heterogeneous Signing**: A single wallet must support ECDSA (secp256k1) for EVM chains, Schnorr/Taproot for Bitcoin, Ed25519 for Solana, and BLS for Cosmos---each with different signing algorithms, address derivation, fee models, and nonce management. The MPC protocol must be algorithm-agnostic, and the key hierarchy must support HD derivation paths across all chains from a single root.

4. **Policy Engine as the Authorization Layer**: Between the user's intent and the actual signing operation sits a programmable policy engine that evaluates transaction context: amount thresholds, destination whitelist/blacklist, velocity limits, time-of-day restrictions, multi-approval quorums, and chain-specific rules. This policy layer is what makes institutional custody viable and differentiates a wallet platform from a raw key management tool.

5. **Gas Abstraction and Meta-Transactions**: Users should never need to hold ETH (or any native gas token) to interact with a blockchain. The Paymaster contract in ERC-4337 enables gas sponsorship (dApp pays), ERC-20 gas payment (user pays in stablecoins), and cross-chain gas abstraction (pay on one chain, execute on another). This requires real-time gas price oracles, fee estimation across chains, and refund mechanisms for overestimated gas.

6. **Key Lifecycle Spans Years with Zero Downtime**: Unlike session tokens or API keys that can be rotated freely, a wallet's key controls irreversible on-chain assets. Key refresh (proactive secret sharing) must rotate MPC shares without changing the derived public key or requiring on-chain transactions. Key migration across custody models (e.g., custodial to self-custody) must preserve address continuity. A key management failure is not a service outage---it is a permanent loss of assets.

---

## Quick Reference: Scale Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Total wallet addresses managed | ~100M | Across all chains and custody models |
| Monthly active wallets | ~25M | Wallets with at least one signing operation |
| Daily signing operations | ~10M | Transaction signing, message signing, typed data signing |
| MPC signing ceremony latency (p99) | < 2s | 2-of-3 threshold signing with distributed parties |
| Daily balance queries | ~500M | Multi-chain balance aggregation with caching |
| Supported blockchain networks | 50+ | EVM, Bitcoin, Solana, Cosmos, Tron, Aptos, etc. |
| Key shares per wallet | 3--5 | Typical 2-of-3 or 3-of-5 threshold configuration |
| Gas sponsorship budget per day | ~$2M | Across all sponsored transactions |
| Policy evaluations per day | ~15M | Every signing request passes through policy engine |
| Key refresh operations per month | ~5M | Proactive share rotation for active wallets |
| Assets under management | $50B+ | Institutional + retail custody combined |
| Uptime target | 99.99% | Signing service availability (four nines) |
| Mean time to signing | < 500ms | From API request to signed transaction broadcast |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [8.7 - Cryptocurrency Exchange](../8.7-cryptocurrency-exchange/) | Hot/cold wallet architecture, withdrawal flows, matching engine integration |
| [8.8 - Blockchain Network](../8.8-blockchain-network/) | Consensus mechanisms, transaction propagation, smart contract execution |
| [8.4 - Digital Wallet](../8.4-digital-wallet/) | Ledger patterns, P2P transfers, balance management |
| [8.5 - Fraud Detection System](../8.5-fraud-detection-system/) | Real-time risk scoring for transaction approval |
| [2.16 - Secret Management System](../2.16-secret-management-system/) | HSM integration, key rotation, audit trails |
| [2.5 - Identity & Access Management](../2.5-identity-access-management/) | OAuth2/OIDC, RBAC/ABAC, MFA patterns |
| [1.8 - Distributed Lock Manager](../1.8-distributed-lock-manager/) | Distributed coordination for MPC ceremonies |

---

## Sources

- Fireblocks --- MPC-CMP: Next Generation MPC Wallet Architecture
- Privy --- Embedded Wallet Security Model: TEE + Shamir Secret Sharing
- ZeroDev --- Kernel: Minimal and Extensible Smart Contract Account for ERC-4337
- Safe --- Multi-Signature and Modular Account Architecture
- Turnkey --- Secure Enclave-Based Wallet Infrastructure
- ERC-4337 Specification --- Account Abstraction Using Alt Mempool
- EIP-7702 --- Set EOA Account Code (Pectra Upgrade, May 2025)
- Vitalik Buterin --- The Road to Account Abstraction
- Particle Network --- Chain Abstraction and Universal Accounts
- NIST SP 800-57 --- Recommendation for Key Management
- FATF --- Updated Guidance on Virtual Assets and Travel Rule (2025)
- MiCA Regulation --- EU Markets in Crypto-Assets Framework (2024)
