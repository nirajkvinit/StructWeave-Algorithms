# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WEB[Web App]
        MOB[Mobile App]
        SDK[Wallet SDK]
        API_EXT[External API]
    end

    subgraph Gateway["API Gateway Layer"]
        GW[API Gateway]
        AUTH[Auth Service]
        RL[Rate Limiter]
    end

    subgraph Core["Core Services"]
        WS[Wallet Service]
        SIGN[Signing Orchestrator]
        POL[Policy Engine]
        AA[Account Abstraction Service]
        CHAIN[Chain Adapter Service]
        BAL[Balance Aggregator]
        NONCE[Nonce Manager]
    end

    subgraph MPC["MPC Signing Layer"]
        DKG_SVC[DKG Service]
        TSS1[TSS Signer Node 1]
        TSS2[TSS Signer Node 2]
        TSS3[TSS Signer Node 3]
    end

    subgraph Secure["Secure Enclave Layer"]
        HSM1[HSM Cluster - Region A]
        HSM2[HSM Cluster - Region B]
        TEE[TEE Enclave Pool]
    end

    subgraph Data["Data Layer"]
        PGDB[(Wallet DB - PostgreSQL)]
        KSDB[(Key Share Store - Encrypted)]
        CACHE[(Cache Cluster)]
        AUDIT[(Audit Log - Append Only)]
        QUEUE[Event Queue]
    end

    subgraph Blockchain["Blockchain Layer"]
        ETH_NODE[EVM Nodes]
        BTC_NODE[Bitcoin Nodes]
        SOL_NODE[Solana Nodes]
        BUNDLER[ERC-4337 Bundler]
        INDEXER[Chain Indexer]
    end

    WEB & MOB & SDK & API_EXT --> GW
    GW --> AUTH & RL
    GW --> WS & SIGN & BAL & AA

    WS --> DKG_SVC
    WS --> PGDB
    SIGN --> POL
    SIGN --> NONCE
    SIGN --> TSS1 & TSS2 & TSS3
    TSS1 & TSS2 & TSS3 --> HSM1 & HSM2
    TSS1 & TSS2 & TSS3 --> TEE

    AA --> BUNDLER
    AA --> SIGN

    CHAIN --> ETH_NODE & BTC_NODE & SOL_NODE
    BAL --> INDEXER & CACHE
    NONCE --> CACHE & CHAIN

    DKG_SVC --> KSDB & HSM1 & HSM2
    SIGN --> AUDIT
    POL --> CACHE & PGDB
    CHAIN --> QUEUE

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef mpc fill:#fce4ec,stroke:#c62828,stroke-width:2px
    classDef secure fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef blockchain fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class WEB,MOB,SDK,API_EXT client
    class GW,AUTH,RL gateway
    class WS,SIGN,POL,AA,CHAIN,BAL,NONCE service
    class DKG_SVC,TSS1,TSS2,TSS3 mpc
    class HSM1,HSM2,TEE secure
    class PGDB,KSDB,CACHE,AUDIT,QUEUE data
    class ETH_NODE,BTC_NODE,SOL_NODE,BUNDLER,INDEXER blockchain
```

---

## Data Flow: Transaction Signing (MPC Path)

```mermaid
sequenceDiagram
    participant User
    participant API as API Gateway
    participant Sign as Signing Orchestrator
    participant Policy as Policy Engine
    participant Nonce as Nonce Manager
    participant TSS1 as Signer Node 1
    participant TSS2 as Signer Node 2
    participant TSS3 as Signer Node 3
    participant Chain as Chain Adapter
    participant Audit as Audit Log

    User->>API: POST /sign-transaction (walletId, txParams)
    API->>API: Authenticate (JWT/API Key)
    API->>Sign: Forward signing request

    Sign->>Policy: Evaluate transaction against policies
    Policy-->>Sign: APPROVED (policy_id, conditions)

    Sign->>Nonce: Acquire nonce for chain + address
    Nonce-->>Sign: nonce = 42

    Sign->>Sign: Construct unsigned transaction (chain-specific)

    par MPC Threshold Signing (2-of-3)
        Sign->>TSS1: InitSign(tx_hash, share_1)
        Sign->>TSS2: InitSign(tx_hash, share_2)
        Sign->>TSS3: InitSign(tx_hash, share_3)
    end

    Note over TSS1,TSS3: Round 1: Commitment exchange
    TSS1-->>TSS2: commitment_1
    TSS2-->>TSS1: commitment_2

    Note over TSS1,TSS3: Round 2: Partial signature exchange
    TSS1-->>Sign: partial_sig_1
    TSS2-->>Sign: partial_sig_2

    Sign->>Sign: Combine partial signatures into full signature
    Sign->>Sign: Verify signature against public key

    Sign->>Chain: Broadcast signed transaction
    Chain-->>Sign: tx_hash = 0xabc...

    Sign->>Nonce: Confirm nonce consumed
    Sign->>Audit: Log signing event (immutable)
    Sign-->>API: { tx_hash, status: "broadcast" }
    API-->>User: 200 OK { tx_hash }
```

---

## Data Flow: Account Abstraction (ERC-4337 Path)

```mermaid
sequenceDiagram
    participant User
    participant App as dApp / Wallet UI
    participant AA as AA Service
    participant Sign as Signing Orchestrator
    participant Bundler as ERC-4337 Bundler
    participant Entry as EntryPoint Contract
    participant PM as Paymaster Contract
    participant Account as Smart Account

    User->>App: Initiate action (e.g., swap tokens)
    App->>AA: Create UserOperation (sender, calldata, gas)
    AA->>AA: Estimate gas (verification + execution + calldata)
    AA->>AA: Attach Paymaster address for gas sponsorship

    AA->>Sign: Sign UserOp hash (owner key via MPC)
    Sign-->>AA: signature

    AA->>Bundler: Submit signed UserOp to alt mempool
    Bundler->>Bundler: Validate UserOp (simulate on-chain)
    Bundler->>Bundler: Bundle with other UserOps

    Bundler->>Entry: handleOps([userOp1, userOp2, ...])
    Entry->>PM: validatePaymasterUserOp()
    PM-->>Entry: validation success + gas deposit

    Entry->>Account: validateUserOp(userOp)
    Account->>Account: Verify signature (supports P256/passkey)
    Account-->>Entry: validation success

    Entry->>Account: Execute calldata
    Account->>Account: Perform token swap / transfer

    Entry->>PM: postOp() - finalize gas payment
    Entry-->>Bundler: Transaction receipt
    Bundler-->>AA: UserOp receipt + tx hash
    AA-->>App: Operation complete
    App-->>User: Success notification
```

---

## Key Architectural Decisions

### 1. Wallet Custody Model Selection

| Model | How Keys Are Managed | Trust Assumption | Best For |
|-------|---------------------|------------------|----------|
| **Custodial** | Platform holds complete private keys in HSM | User trusts platform completely | Novice users, regulatory compliance, exchange wallets |
| **Non-Custodial** | User holds keys on device or hardware wallet | Platform has zero access to keys | Privacy-focused users, DeFi power users |
| **Hybrid MPC** | Key split into shares: user device + platform server + backup | No single party holds complete key | Enterprise custody, retail wallet apps, institutional |

**Decision: Hybrid MPC as the primary model** with support for custodial (institutional clients with regulatory requirements) and non-custodial (hardware wallet integration via WalletConnect).

**Justification:** MPC eliminates the single-point-of-compromise of custodial wallets and the single-point-of-loss of non-custodial wallets. A 2-of-3 threshold means: (a) if the user loses their device, the platform + backup share can recover, (b) if the platform is compromised, the attacker cannot sign without the user's share, (c) if the backup is compromised, signing still requires user + platform cooperation.

### 2. MPC Protocol Selection

| Protocol | Rounds | Key Gen | Signing | Security Assumption |
|----------|--------|---------|---------|---------------------|
| GG18 | 8 rounds | Interactive DKG | Interactive TSS | DDH in random oracle model |
| GG20 | 4 rounds | Interactive DKG | Interactive TSS | Strong RSA + DDH |
| **MPC-CMP (Canetti-Makriyannis-Peled)** | **4 rounds** | **Efficient DKG** | **Pre-signing + online** | **CDH in standard model** |
| FROST | 2 rounds | Trusted dealer or DKG | 2-round TSS | Schnorr assumption |

**Decision: MPC-CMP** for ECDSA (EVM, Bitcoin) and **FROST** for Schnorr/Ed25519 (Solana, Cosmos).

**Justification:** MPC-CMP (used by Fireblocks) offers a pre-signing phase that moves most computation offline, reducing online signing to a single round of communication. This achieves < 200ms signing latency. FROST provides native 2-round signing for Schnorr-compatible chains.

### 3. Database Strategy

| Component | Database | Justification |
|-----------|----------|---------------|
| Wallet metadata | PostgreSQL | Relational queries for user-wallet-policy relationships |
| Key shares | Encrypted blob store + HSM | Key material never in general-purpose DB; encrypted at rest with HSM-managed keys |
| Nonce state | Redis (primary) + PostgreSQL (durable) | Redis for low-latency atomic increment; PostgreSQL for crash recovery |
| Transaction history | Time-series store | Append-heavy, time-range queries, chain-specific indexing |
| Policy rules | PostgreSQL + in-memory cache | Complex rule evaluation; cached for sub-10ms policy checks |
| Audit logs | Append-only log store | Immutable, hash-chained entries; compliance-grade retention |
| Balance cache | Redis | Multi-chain balance aggregation with TTL-based invalidation |

### 4. Synchronous vs. Asynchronous Communication

| Flow | Pattern | Justification |
|------|---------|---------------|
| MPC signing ceremony | Synchronous (gRPC streaming) | Interactive protocol requires real-time round-trip between signer nodes |
| Policy evaluation | Synchronous | Must complete before signing proceeds |
| Transaction broadcast | Asynchronous (fire-and-forget with callback) | Blockchain confirmation is inherently async; webhook on confirmation |
| Balance aggregation | Asynchronous (polling + cache) | Multi-chain queries aggregated periodically |
| Key refresh | Asynchronous (scheduled batch) | Non-latency-sensitive; can run during off-peak hours |
| Audit logging | Asynchronous (buffered write) | Fire-and-forget from hot path; guaranteed delivery via queue |

### 5. Multi-Chain Adapter Pattern

```mermaid
flowchart LR
    subgraph Adapter["Chain Adapter Interface"]
        IF[/"IChainAdapter
        - buildTransaction()
        - estimateGas()
        - broadcastTx()
        - getBalance()
        - getNonce()"/]
    end

    subgraph Implementations["Chain-Specific Implementations"]
        EVM[EVM Adapter]
        BTC[Bitcoin Adapter]
        SOL[Solana Adapter]
        COSMOS[Cosmos Adapter]
    end

    subgraph Details["Implementation Details"]
        EVM_D["RLP encoding
        EIP-1559 fees
        Account nonce"]
        BTC_D["UTXO selection
        SegWit encoding
        Fee rate (sat/vbyte)"]
        SOL_D["Instruction building
        Recent blockhash
        Priority fees"]
        COSMOS_D["Amino/Protobuf encoding
        Gas simulation
        Sequence number"]
    end

    IF --> EVM & BTC & SOL & COSMOS
    EVM --- EVM_D
    BTC --- BTC_D
    SOL --- SOL_D
    COSMOS --- COSMOS_D

    classDef adapter fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef impl fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef detail fill:#fff3e0,stroke:#e65100,stroke-width:1px

    class IF adapter
    class EVM,BTC,SOL,COSMOS impl
    class EVM_D,BTC_D,SOL_D,COSMOS_D detail
```

**Decision: Strategy pattern** with a common interface and chain-specific adapters.

**Justification:** Each blockchain has fundamentally different transaction models (account-based vs. UTXO), fee mechanisms (EIP-1559 vs. fee rate), and encoding formats. A unified interface abstracts these differences from the signing orchestrator while allowing chain-specific optimizations (UTXO consolidation, gas price oracles, priority fee estimation).

---

## Architecture Pattern Checklist

- [x] **Sync vs Async**: MPC signing is synchronous (interactive protocol); transaction broadcast and balance updates are asynchronous
- [x] **Event-driven vs Request-response**: Request-response for signing; event-driven for balance updates, confirmations, and policy change propagation
- [x] **Push vs Pull**: Pull for balance (polling + cache); push for transaction confirmations (webhooks)
- [x] **Stateless vs Stateful**: API gateway and policy engine are stateless; MPC signer nodes are stateful during a signing session (ephemeral state)
- [x] **Read-heavy vs Write-heavy**: Balance queries are 50x more frequent than signing operations; separate read and write paths
- [x] **Real-time vs Batch**: Signing is real-time; key refresh, balance aggregation, and compliance reporting are batch
- [x] **Edge vs Origin**: Passkey verification can happen on-device (edge); MPC signing requires origin servers with HSM access

---

## Component Responsibilities

| Component | Responsibility | Scaling Strategy |
|-----------|---------------|-----------------|
| **API Gateway** | Authentication, rate limiting, request routing | Horizontal; stateless |
| **Wallet Service** | CRUD for wallets, user-wallet mapping, configuration | Horizontal; shard by user_id |
| **Signing Orchestrator** | Coordinate MPC ceremony, construct transactions, manage signing sessions | Horizontal; session affinity via consistent hashing |
| **Policy Engine** | Evaluate transaction approval rules, multi-sig quorum | Horizontal; in-memory policy cache per instance |
| **MPC Signer Nodes** | Hold key shares, participate in DKG and TSS protocols | Fixed topology (one node per share location); vertical scaling within each |
| **Nonce Manager** | Atomic nonce acquisition, pending transaction tracking, gap detection | Single-writer per chain+address (partitioned) |
| **Chain Adapter** | Transaction construction, gas estimation, broadcast, balance query | Horizontal per chain; separate node pools per chain |
| **Balance Aggregator** | Multi-chain balance polling, caching, push updates | Horizontal; shard by wallet_id |
| **AA Service** | UserOp construction, Paymaster selection, bundler submission | Horizontal; stateless |
| **Audit Logger** | Immutable event recording, hash chaining, compliance queries | Append-only; partition by time |
