# Requirements & Capacity Estimations

## Functional Requirements

### Core Features (Must Have)

1. **Wallet Creation & Key Generation**
   - Generate wallet addresses across multiple blockchain networks (EVM, Bitcoin, Solana, Cosmos)
   - Support custodial, non-custodial, and hybrid (MPC) wallet models
   - HD wallet derivation (BIP-32/44/84) for deterministic address generation
   - Distributed Key Generation (DKG) for MPC wallets with configurable thresholds (2-of-3, 3-of-5)

2. **Transaction Signing**
   - Sign transactions using MPC threshold signature scheme (TSS) without key reconstruction
   - Support ECDSA (secp256k1), EdDSA (Ed25519), Schnorr, and BLS signature algorithms
   - Nonce management with on-chain state tracking and pending transaction awareness
   - Transaction batching for ERC-4337 UserOperations

3. **Policy Engine & Authorization**
   - Programmable transaction approval rules (amount limits, whitelist/blacklist, velocity)
   - Multi-approval workflows with configurable quorum requirements
   - Time-based restrictions (trading hours, cool-down periods)
   - Role-based access control for organizational wallet hierarchies

4. **Account Abstraction (ERC-4337)**
   - Smart account deployment and management
   - Paymaster integration for gas sponsorship and ERC-20 gas payment
   - Session keys for delegated signing with scoped permissions
   - Social recovery with guardian-based key rotation

5. **Multi-Chain Support**
   - Unified balance view across all supported chains
   - Chain-specific transaction construction (EVM call data, Bitcoin UTXO selection, Solana instruction building)
   - Cross-chain address derivation from a single key hierarchy
   - Gas/fee estimation per chain with dynamic adjustment

6. **Key Lifecycle Management**
   - Proactive key share refresh (rotation without changing public key)
   - Key backup and recovery (encrypted share export, social recovery)
   - Custody model migration (custodial to non-custodial and vice versa)
   - Key deactivation and archival with audit trail

### Out of Scope

- Decentralized exchange (DEX) aggregation and trade execution
- NFT marketplace functionality (minting, listing, bidding)
- DeFi protocol integration (lending, staking, yield farming)
- Fiat on-ramp/off-ramp (bank transfers, card purchases)
- Block explorer or chain indexing infrastructure
- Token price feeds and portfolio valuation

---

## Non-Functional Requirements

### CAP Theorem Analysis

| Property | Decision | Justification |
|----------|----------|---------------|
| **Consistency** | Strong for key state | Key shares, nonce counters, and policy state must never diverge---a stale nonce causes stuck transactions, a stale policy allows unauthorized signing |
| **Availability** | High for signing | Signing must be available 99.99%; degraded mode allows cached policy evaluation but never skips MPC ceremony |
| **Partition Tolerance** | Required | MPC parties may span regions; network partitions between key share holders must not corrupt key state |

**Choice: CP for key management, AP for balance queries**

Key state (shares, nonces, policies) requires strong consistency---an inconsistent nonce leads to transaction replay or stuck funds. Balance queries and transaction history tolerate eventual consistency with a 5-second staleness window since they are read from blockchain indexers.

### Consistency Model

| Component | Model | Justification |
|-----------|-------|---------------|
| Key share state | Strong (linearizable) | MPC ceremony correctness requires all parties agree on current share version |
| Nonce counter | Serializable | Duplicate nonces cause transaction replacement or rejection on-chain |
| Policy rules | Sequential | Policy changes must be visible to all signing requests after acknowledgment |
| Balance data | Eventual (5s) | Sourced from blockchain nodes; inherently eventual due to block confirmation times |
| Transaction history | Eventual (30s) | Indexed from chain events; batched updates acceptable |

### Availability Targets

| Component | Target | Justification |
|-----------|--------|---------------|
| Signing service | 99.99% (52 min/year downtime) | Signing unavailability = user cannot access or move their assets |
| Policy engine | 99.99% | Policy bypass is not an option; must be co-available with signing |
| Balance API | 99.9% | Degraded balance display is tolerable; stale cache can serve |
| Key generation (DKG) | 99.9% | Wallet creation is less latency-sensitive; can queue and retry |
| Admin/Dashboard | 99.5% | Operational tools; not user-critical path |

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| MPC signing ceremony (2-of-3) | 200ms | 500ms | 2s |
| Policy evaluation | 10ms | 30ms | 50ms |
| Balance query (cached) | 5ms | 15ms | 50ms |
| Balance query (uncached, multi-chain) | 200ms | 800ms | 2s |
| DKG key generation | 1s | 3s | 5s |
| Transaction broadcast to chain | 100ms | 500ms | 2s |
| ERC-4337 UserOp submission to bundler | 200ms | 1s | 3s |

### Durability Guarantees

| Data | Durability | Strategy |
|------|------------|----------|
| Key shares | 99.999999999% (11 nines) | Encrypted at rest in HSM-backed storage; geo-replicated across 3 regions; offline backup to air-gapped HSM |
| Policy configuration | 99.999% | Replicated database with point-in-time recovery |
| Transaction audit log | 99.999999% | Append-only log with cryptographic hash chain; 7-year retention |
| Nonce state | 99.999% | Persisted before signing; recoverable from on-chain state |

---

## Capacity Estimations (Back-of-Envelope)

### User and Wallet Scale

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Total registered users | 30M | Based on top-5 wallet providers combined user base |
| Monthly active users (MAU) | 10M | ~33% of registered users |
| Daily active users (DAU) | 3M | ~30% of MAU |
| Wallets per user (average) | 3.5 | Multi-chain: 1 EVM + 1 Bitcoin + 1 Solana + 0.5 others |
| Total wallet addresses | 105M | 30M users x 3.5 wallets |
| Key shares stored | 315M | 105M wallets x 3 shares per wallet (2-of-3 MPC) |

### Transaction Volume

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Daily signing requests | 10M | 3M DAU x ~3.3 signing operations per active user |
| Peak signing requests/sec | 500 | 10M / 86,400 x 4 (peak factor) |
| Daily policy evaluations | 15M | 10M signing + 5M pre-checks and simulations |
| Daily balance queries | 500M | 10M DAU (app) x 50 queries/session (polling + refresh) |
| Balance query QPS (average) | 5,800 | 500M / 86,400 |
| Balance query QPS (peak) | 23,000 | 5,800 x 4 (peak factor) |
| Daily DKG ceremonies | 100K | New wallet creation rate |
| Daily key refresh operations | 170K | 5M/month / 30 days |

### Storage

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Key share storage | 315 GB | 315M shares x ~1 KB each (encrypted share + metadata) |
| Policy rules storage | 5 GB | 30M users x ~170 bytes average policy config |
| Transaction audit logs (Year 1) | 7.3 TB | 10M txns/day x 2 KB per audit entry x 365 days |
| Transaction audit logs (Year 5) | 36.5 TB | Linear growth assuming stable user base |
| Nonce state | 500 MB | 105M wallets x ~5 bytes (chain_id + nonce counter) |
| Total storage (Year 1) | ~10 TB | Key shares + policies + audit logs + metadata |
| Total storage (Year 5) | ~45 TB | Dominated by audit log growth |

### Bandwidth

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| MPC signing bandwidth | 200 MB/s peak | 500 req/s x 3 MPC rounds x ~130 KB per round |
| Balance API bandwidth | 230 MB/s peak | 23K req/s x ~10 KB response (multi-chain) |
| Blockchain node RPC | 500 MB/s | Balance queries + tx broadcast + fee estimation |
| Total bandwidth (peak) | ~1 GB/s | All API + MPC + blockchain node traffic combined |

### Cache Sizing

| Cache | Size | Strategy |
|-------|------|----------|
| Balance cache | 50 GB | 105M wallets x ~500 bytes (multi-chain balances) |
| Nonce cache | 1 GB | Hot wallets with pending transactions |
| Gas price cache | 100 MB | 50 chains x fee history + estimation models |
| Policy cache | 10 GB | Active user policies for fast evaluation |
| Total cache | ~62 GB | Distributed across cache cluster |

---

## SLOs / SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Signing availability | 99.99% | Percentage of successful signing requests (excluding invalid requests) |
| Signing latency (p99) | < 2s | Time from API request to signed transaction output |
| Policy evaluation latency (p99) | < 50ms | Time for policy engine to return allow/deny decision |
| Balance freshness | < 10s | Maximum staleness of cached balance vs. on-chain state |
| Key generation success rate | 99.9% | Percentage of DKG ceremonies completing without retry |
| Transaction broadcast success | 99.5% | Percentage of signed transactions accepted by blockchain nodes |
| Error rate (signing) | < 0.01% | Non-user-error failures in signing pipeline |
| Error rate (balance API) | < 0.1% | Timeouts or failures in balance aggregation |
| Audit log completeness | 100% | Every signing operation must have a corresponding audit entry |
| Key share durability | 99.999999999% | No key share loss across any failure scenario |

---

## Compliance-Driven Requirements

| Requirement | Standard | Impact on Architecture |
|------------|----------|----------------------|
| Travel Rule | FATF Recommendation 16 | Originator/beneficiary data exchange for transfers > $1,000; integration with TRISA/TRP protocols |
| Custody licensing | MiCA (EU), BitLicense (NY), VARA (Dubai) | Segregated custody, capital reserves, audit requirements |
| AML/KYC | 5AMLD/6AMLD, BSA | Identity verification before wallet creation; transaction monitoring |
| Data residency | GDPR, local regulations | Key shares may need to reside in specific jurisdictions |
| SOC 2 Type II | AICPA TSC | Annual audit of security controls, availability, processing integrity |
| PCI-DSS (if fiat bridge) | PCI SSC | Only if handling card data for fiat on-ramp; otherwise out of scope |
