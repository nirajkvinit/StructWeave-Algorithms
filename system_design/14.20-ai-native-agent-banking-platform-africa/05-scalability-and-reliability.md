# Scalability & Reliability — AI-Native Agent Banking Platform for Africa

## Scaling for 600,000+ Agents with Varying Connectivity

### Challenge Dimensions

| Dimension | Scale | Constraint |
|---|---|---|
| Concurrent agents | 420,000 active at peak | Each maintains persistent session or polls frequently |
| Transaction throughput | 3,000 TPS sustained, 5,000+ burst | Financial atomicity required on every transaction |
| Biometric verifications | 28 million/day | CPU-intensive template matching |
| Float balance queries | 2 million/hour | Sub-200ms latency requirement |
| Offline sync bursts | 15,000 agents syncing simultaneously | Morning sync wave 07:00-09:00 |
| Geographic distribution | 15+ countries, 200+ regions | Latency-sensitive across unreliable networks |

### Horizontal Scaling Strategy

```mermaid
---
config:
  theme: neutral
  look: neo
---
flowchart TB
    subgraph Edge["Edge Tier (Per-Region)"]
        LB1[Regional Load Balancer]
        RP1[Regional Processing Node 1]
        RP2[Regional Processing Node 2]
        RC1[(Regional Cache)]
    end

    subgraph Central["Central Tier"]
        GLB[Global Load Balancer]
        TXN1[Transaction Cluster 1<br/>Partition: Agents A-M]
        TXN2[Transaction Cluster 2<br/>Partition: Agents N-Z]
        LED[Ledger Service<br/>Sharded by Account]
    end

    subgraph Data["Data Tier"]
        DB1[(Primary DB<br/>Region 1)]
        DB2[(Primary DB<br/>Region 2)]
        DB3[(Read Replicas)]
        STREAM[Event Stream]
    end

    LB1 --> RP1 & RP2
    RP1 & RP2 --> RC1
    RP1 & RP2 --> GLB
    GLB --> TXN1 & TXN2
    TXN1 & TXN2 --> LED
    LED --> DB1 & DB2
    DB1 & DB2 --> DB3
    LED --> STREAM

    classDef edge fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef central fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class LB1,RP1,RP2,RC1 edge
    class GLB,TXN1,TXN2,LED central
    class DB1,DB2,DB3,STREAM data
```

### Partitioning Strategy

| Data Type | Partition Key | Rationale |
|---|---|---|
| **Transactions** | agent_id (hash) | Co-locates agent's transactions for float calculation; avoids hot spots from high-volume agents via consistent hashing |
| **Ledger entries** | account_id (hash) | Ensures all entries for an account are on the same partition for balance consistency |
| **Agent profiles** | region_code + agent_id | Regional locality for regulatory compliance and regional processing node affinity |
| **Biometric templates** | customer_id (hash) | 1:1 verification needs fast lookup by customer; 1:N dedup uses separate LSH index |
| **Float predictions** | agent_id (hash) | Same partition as agent profile for co-located reads |

### Auto-Scaling Triggers

| Metric | Scale-Up Trigger | Scale-Down Trigger | Component |
|---|---|---|---|
| Transaction queue depth | > 500 pending | < 50 pending for 10 min | Transaction processing pods |
| Sync batch queue depth | > 2,000 pending batches | < 100 pending for 15 min | Sync processing pods |
| Biometric match latency | p99 > 3s | p99 < 1s for 15 min | Biometric matching pods |
| CPU utilization | > 70% for 3 min | < 30% for 10 min | All compute pods |
| Fraud scoring latency | p99 > 500ms | p99 < 100ms for 10 min | Fraud engine pods |

---

## Offline-First Architecture

### Design Philosophy

The system is designed assuming connectivity is unreliable, not assuming it is present and handling the exception. This inverts the typical architecture:

| Traditional Approach | Offline-First Approach |
|---|---|
| Online is default; offline is error state | Offline is expected; online is enhancement |
| Transaction requires server round-trip | Transaction completes locally; server sync is background |
| Balance is authoritative from server | Balance is locally authoritative with periodic reconciliation |
| Failure mode: "Network error, try again" | Failure mode: "Transaction queued, will sync when online" |

### Local State Management

Each agent device maintains:

```
DeviceLocalState {
    agent_e_float:          Decimal         // Last known + local adjustments
    customer_balances:      Map<ID, Decimal> // Cached balances for frequent customers
    transaction_queue:      List<SignedTxn>  // Pending sync
    sequence_counter:       AtomicInteger    // Monotonic for ordering
    biometric_cache:        Map<ID, Template>// Frequently verified customers
    offline_risk_rules:     RuleSet          // Downloaded rule configuration
    last_sync_timestamp:    Timestamp
    device_keys:            KeyPair          // For signing offline transactions
    sync_state:             ENUM             // SYNCED | PARTIAL | STALE
}
```

### Sync Protocol

```
PROTOCOL DeviceSync
    // Phase 1: Handshake
    Device → Server: {device_id, last_sync_seq, pending_count, device_time}
    Server → Device: {server_time, clock_drift, ack}

    // Phase 2: Upload offline transactions (device → server)
    Device → Server: {signed_batch: [txn_1, txn_2, ..., txn_n]}
    Server: Validate signatures, check sequence continuity
    Server: Process each transaction against current server state
    Server → Device: {
        accepted: [txn_1, txn_3, txn_5],
        rejected: [
            {txn_2, reason: "INSUFFICIENT_BALANCE", compensation: {...}},
            {txn_4, reason: "CUSTOMER_BLOCKED"}
        ]
    }

    // Phase 3: Download server updates (server → device)
    Server → Device: {
        updated_balances: {agent_float: X, customers: [...]},
        updated_rules: {new_limits: [...], new_rules: [...]},
        updated_biometric_cache: [new_templates, revoked_templates],
        messages: [compliance_alerts, system_notices]
    }

    // Phase 4: Confirmation
    Device → Server: {sync_complete, new_last_sync_seq}
```

### Conflict Resolution Hierarchy

1. **Server-authoritative for balances**: If a balance conflict exists, the server's state wins because it has visibility into transactions from all channels (other agents, mobile banking, ATM)
2. **Device-authoritative for transaction records**: If the device claims a transaction happened (with valid signature and sequence number), the server trusts that it happened—it may need to generate compensating entries if the balance doesn't support it
3. **Time-based for ordering**: Server uses device timestamps (adjusted for measured clock drift) to establish transaction ordering
4. **Economic-loss assignment**: When an offline transaction causes a loss (e.g., insufficient balance), the loss is assigned to the agent, not the customer—this incentivizes agents to stay online when possible and apply conservative offline limits

---

## Disaster Recovery

### Failure Scenarios and Recovery

| Scenario | Impact | RTO | Recovery Strategy |
|---|---|---|---|
| **Single AZ failure** | 50% capacity in affected region | < 5 min | Automatic failover to surviving AZ; agent devices retry to alternate endpoint |
| **Full region failure** | All agents in region lose online capability | < 15 min | DNS-based failover to secondary region; agents continue in offline mode during transition |
| **Database primary failure** | No write capability | < 2 min | Synchronous replica promotion; zero data loss due to synchronous replication |
| **Ledger corruption** | Incorrect balances | < 4 hours | Event replay from transaction log to reconstruct ledger from last verified checkpoint |
| **Biometric database failure** | No identity verification | < 30 min | Read replica promotion; enrollment paused until primary restored; existing cached templates on devices continue to work |
| **Complete platform outage** | All online services down | < 30 min | All agents automatically switch to offline mode; can process transactions for up to 72 hours; sync backlog processed when platform recovers |

### Multi-Region Deployment

```
                    ┌──────────────────────┐
                    │   Global DNS +       │
                    │   Traffic Manager    │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
        ┌───────────┐  ┌───────────┐  ┌───────────┐
        │ Region:   │  │ Region:   │  │ Region:   │
        │ West      │  │ East      │  │ South     │
        │ Africa    │  │ Africa    │  │ Africa    │
        │           │  │           │  │           │
        │ Primary DB│  │ Primary DB│  │ Primary DB│
        │ for NG,GH │  │ for KE,TZ │  │ for ZA,MZ │
        │           │  │           │  │           │
        │ Read rep  │  │ Read rep  │  │ Read rep  │
        │ of all    │  │ of all    │  │ of all    │
        └───────────┘  └───────────┘  └───────────┘
              │                │              │
              └────────────────┼──────────────┘
                               │
                    ┌──────────┴───────────┐
                    │ Cross-Region Async   │
                    │ Replication (< 500ms)│
                    └──────────────────────┘
```

**Data sovereignty constraint**: Each country's transaction data must be primarily stored within a data center in that country or region (regulatory requirement in Nigeria, Kenya, and South Africa). Cross-region replication is for disaster recovery only—read replicas in other regions serve only failover scenarios, not normal traffic.

---

## Multi-Country Deployment Architecture

### Federated Platform Model

```mermaid
---
config:
  theme: neutral
  look: neo
---
flowchart TB
    subgraph Shared["Shared Platform Layer"]
        CORE[Core Transaction Engine]
        FRAUD[Fraud Detection Engine]
        FLOAT[Float Prediction Models]
        BIOM[Biometric Engine]
    end

    subgraph NG["Nigeria Instance"]
        NG_COMP[CBN Compliance Module]
        NG_KYC[NIN/BVN Integration]
        NG_PAY[NIP Integration]
        NG_RULES[₦ Limits + NGN Ledger]
    end

    subgraph KE["Kenya Instance"]
        KE_COMP[CBK Compliance Module]
        KE_KYC[Huduma Namba Integration]
        KE_PAY[PesaLink Integration]
        KE_RULES[KES Limits + KES Ledger]
    end

    subgraph TZ["Tanzania Instance"]
        TZ_COMP[BOT Compliance Module]
        TZ_KYC[NIDA Integration]
        TZ_PAY[TIPS Integration]
        TZ_RULES[TZS Limits + TZS Ledger]
    end

    CORE --> NG_COMP & KE_COMP & TZ_COMP
    FRAUD --> NG_COMP & KE_COMP & TZ_COMP
    FLOAT --> NG_RULES & KE_RULES & TZ_RULES
    BIOM --> NG_KYC & KE_KYC & TZ_KYC

    classDef shared fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef country fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class CORE,FRAUD,FLOAT,BIOM shared
    class NG_COMP,NG_KYC,NG_PAY,NG_RULES,KE_COMP,KE_KYC,KE_PAY,KE_RULES,TZ_COMP,TZ_KYC,TZ_PAY,TZ_RULES country
```

### Country-Specific Configuration

| Parameter | Nigeria | Kenya | Tanzania |
|---|---|---|---|
| Currency | NGN | KES | TZS |
| Agent exclusivity | Yes (from Apr 2026) | No | No |
| Geo-fencing required | Yes (CBN mandate) | Optional | No |
| Customer daily limit | ₦100,000 | KES 300,000 | TZS 3,000,000 |
| Agent daily cash-out limit | ₦1,200,000 | KES 5,000,000 | TZS 10,000,000 |
| KYC tiers | 3 tiers (BVN/NIN based) | 2 tiers (Huduma based) | 2 tiers (NIDA based) |
| Primary identity system | NIN (National ID Number) | Huduma Namba | NIDA |
| Inter-bank switch | NIP (NIBSS) | PesaLink | TIPS (Tanzania) |
| STR reporting | NFIU (real-time) | FRC | FIU Tanzania |
| Data residency | In-country required | In-country required | Regional (East Africa) |

### Cross-Border Transaction Handling

For corridor markets (e.g., Nigeria-Ghana, Kenya-Tanzania), the platform supports cross-border agent-to-agent transfers:

1. Sender agent in Country A initiates transfer
2. Platform converts amount using real-time exchange rate
3. Compliance check against both countries' regulations
4. AML screening against both countries' sanctions lists
5. Float deducted from sender agent in Currency A
6. Float credited to recipient agent in Currency B
7. Settlement processed through correspondent banking network

**Key constraint**: Cross-border transfers are limited to pre-approved corridors with bilateral agreements. The system cannot enable arbitrary cross-border transfers without regulatory approval per corridor.

---

## Capacity Planning for Growth

### Growth Projections

| Metric | Current (2026) | +1 Year | +3 Years |
|---|---|---|---|
| Active agents | 600,000 | 1,000,000 | 2,500,000 |
| Countries | 5 | 8 | 15 |
| Daily transactions | 35M | 70M | 200M |
| Peak TPS | 3,000 | 6,000 | 15,000 |
| Biometric templates | 50M | 120M | 400M |
| Storage (annual) | 55 TB | 120 TB | 400 TB |

### Scaling Bottlenecks and Mitigations

| Bottleneck | Trigger Point | Mitigation |
|---|---|---|
| **Ledger write throughput** | > 10,000 TPS | Shard ledger by account hash; each shard handles ~2,000 TPS independently |
| **Biometric dedup (1:N)** | > 200M templates | Hierarchical LSH with regional sharding; new enrollments search regional shard first (90% hit), global only if regional is clear |
| **Float prediction batch** | > 1M agents | Distributed prediction across regional nodes; each region runs prediction for its agents locally |
| **Sync processing** | > 50,000 concurrent syncs | Dedicated sync processing cluster with priority queuing; long-offline agents get priority |
| **Event stream throughput** | > 100K events/sec | Partition event stream by region; each region has independent stream with cross-region aggregation for global analytics |
