# Requirements & Estimations

[Back to Index](./00-index.md)

---

## Functional Requirements

### Core POS Operations

| Requirement | Description | Offline Support |
|-------------|-------------|-----------------|
| **FR-1: Transaction Processing** | Process sales transactions including cart, discounts, taxes | Full offline |
| **FR-2: Payment Handling** | Accept cash, card (offline auth), and digital payments | Partial (offline limits) |
| **FR-3: Inventory Management** | Track stock levels, receive goods, adjust quantities | Full offline |
| **FR-4: Product Catalog** | Browse products, search by barcode/name/image | Full offline (cached) |
| **FR-5: Customer Management** | Lookup customers, loyalty points, purchase history | Full offline (cached) |
| **FR-6: Receipt Generation** | Print/email receipts with transaction details | Full offline |

### Multi-Terminal Coordination

| Requirement | Description | Offline Support |
|-------------|-------------|-----------------|
| **FR-7: Terminal Discovery** | Auto-discover other terminals on local network | Full offline (LAN) |
| **FR-8: Leader Election** | Elect sync coordinator terminal automatically | Full offline (LAN) |
| **FR-9: Real-Time Sync** | Sync inventory/transactions across terminals in-store | Full offline (LAN) |
| **FR-10: Conflict Resolution** | Handle concurrent modifications automatically | Full offline |

### AI-Native Features

| Requirement | Description | Offline Support |
|-------------|-------------|-----------------|
| **FR-11: Product Recognition** | Identify products via camera (barcode, image) | Full offline (edge AI) |
| **FR-12: Fraud Detection** | Score transactions for fraud risk in real-time | Full offline (edge AI) |
| **FR-13: Voice Commands** | Process voice input for hands-free operation | Full offline (edge AI) |
| **FR-14: Demand Prediction** | Suggest reorder quantities based on patterns | Partial (needs history) |

### Cloud Synchronization

| Requirement | Description | Offline Support |
|-------------|-------------|-----------------|
| **FR-15: Cloud Sync** | Sync all data with central mother server | When online |
| **FR-16: Multi-Store Aggregation** | Aggregate data across all store locations | Cloud only |
| **FR-17: Model Updates** | Receive AI model updates from cloud | When online |
| **FR-18: Remote Configuration** | Update terminal settings remotely | When online |

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-currency support | Adds complexity, can be phase 2 |
| Restaurant table management | Vertical-specific |
| Appointment scheduling | Different use case |
| Complex promotions engine | Separate service |
| Real-time cross-store inventory | Requires always-online |
| Advanced BI/reporting | Cloud-side feature |

---

## Non-Functional Requirements

### CAP Theorem Position

```
                    Consistency
                         △
                        /|\
                       / | \
                      /  |  \
                     /   |   \
                    /    |    \
                   /     |     \
                  /      |      \
                 /   [CHOSEN]   \
                /    AP with     \
               /      SEC         \
              ────────────────────
        Availability          Partition Tolerance
```

**Choice: AP with Strong Eventual Consistency (SEC)**

**Justification:**
- Offline-first requires availability during network partitions
- CRDTs guarantee convergence without coordination
- POS cannot stop processing sales due to network issues
- Eventual consistency acceptable for inventory (seconds to minutes)
- Financial transactions use idempotency for correctness

### Consistency Model

| Data Type | Consistency | CRDT Type | Rationale |
|-----------|-------------|-----------|-----------|
| **Transactions** | Strong Eventual | OR-Set | Cannot lose sales |
| **Inventory Counts** | Strong Eventual | PN-Counter | Concurrent updates common |
| **Product Catalog** | Eventual | LWW-Register | Last update wins |
| **Customer Data** | Eventual | LWW-Map | Infrequent conflicts |
| **Configuration** | Strong (from cloud) | N/A | Single source of truth |

### Availability Targets

| Component | Target | Measurement | Justification |
|-----------|--------|-------------|---------------|
| **Local Operations** | 100% | Uptime when powered | Offline-first design |
| **In-Store Sync** | 99.9% | LAN availability | Leader failover |
| **Cloud Sync** | 99.5% | Sync success rate | Network dependent |
| **AI Inference** | 99.9% | Model availability | Local models |

### Latency Targets

| Operation | p50 | p95 | p99 | Notes |
|-----------|-----|-----|-----|-------|
| **Transaction Save** | 10ms | 50ms | 100ms | Local SQLite |
| **Product Lookup** | 20ms | 80ms | 150ms | Indexed search |
| **AI Inference** | 50ms | 150ms | 300ms | Edge model |
| **In-Store Sync** | 100ms | 500ms | 1s | LAN round-trip |
| **Cloud Sync Batch** | 2s | 5s | 10s | Delta upload |

### Durability Guarantees

| Guarantee | Target | Implementation |
|-----------|--------|----------------|
| **Zero data loss** | 100% of committed transactions | WAL + fsync |
| **Offline duration** | 24+ hours | Local storage capacity |
| **Sync recovery** | All pending syncs complete | Queue persistence |
| **Conflict resolution** | <1% manual intervention | CRDTs + AI resolution |

---

## Capacity Estimations

### Scale Assumptions

| Parameter | Conservative | Target | Aggressive |
|-----------|--------------|--------|------------|
| **Total Stores** | 10,000 | 50,000 | 100,000 |
| **Terminals per Store** | 3 | 5 | 15 |
| **Transactions per Terminal/Day** | 50 | 150 | 500 |
| **Products per Store** | 1,000 | 10,000 | 100,000 |
| **Customers per Store** | 500 | 5,000 | 50,000 |

### Transaction Volume

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Daily Transactions (Target)** | 50K stores × 5 terminals × 150 txn | 37.5M txn/day |
| **Peak TPS (per store)** | 5 terminals × 1 txn/10s | 0.5 TPS/store |
| **Peak TPS (global cloud)** | 37.5M ÷ 43,200s (12hr) × 3 (peak) | ~2,600 TPS |
| **Sync Events/Day** | 50K stores × 96 (every 15 min) | 4.8M syncs/day |

### Storage Requirements

#### Per Terminal

| Data Type | Size per Record | Records | Total | Notes |
|-----------|-----------------|---------|-------|-------|
| **Transactions** | 2 KB | 10,000 (30 days) | 20 MB | Pruned after sync |
| **Product Catalog** | 5 KB | 10,000 | 50 MB | Images cached separately |
| **Product Images** | 100 KB | 10,000 | 1 GB | Compressed thumbnails |
| **Customer Data** | 1 KB | 5,000 | 5 MB | Cached subset |
| **AI Models** | N/A | 3-5 models | 200 MB | Quantized models |
| **Event Log (CRDT)** | 500 B | 50,000 | 25 MB | Compacted periodically |
| **Total per Terminal** | - | - | **~1.3 GB** | With 50% headroom: 2 GB |

#### Cloud (Mother Server)

| Data Type | Size per Record | Records | Total | Notes |
|-----------|-----------------|---------|-------|-------|
| **Transactions (1 year)** | 2 KB | 13.7B | 27 TB | Partitioned by store |
| **Product Catalog** | 5 KB | 500M (global) | 2.5 TB | Multi-tenant |
| **Customer Data** | 2 KB | 250M | 500 GB | GDPR compliant |
| **Event Log** | 500 B | 100B | 50 TB | Time-partitioned |
| **Analytics Aggregates** | N/A | N/A | 10 TB | Pre-computed |
| **Total Cloud Storage** | - | - | **~90 TB** | Year 1 |

### Bandwidth Requirements

#### Per Store (Sync)

| Sync Type | Frequency | Size | Daily Bandwidth |
|-----------|-----------|------|-----------------|
| **Transaction Delta** | 15 min | 50 KB | 4.8 MB |
| **Inventory Updates** | 15 min | 10 KB | 960 KB |
| **Product Catalog Sync** | Daily | 1 MB | 1 MB |
| **Model Updates** | Weekly | 50 MB | 7 MB/day avg |
| **Total per Store** | - | - | **~14 MB/day** |

#### Global Cloud Ingestion

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Daily Ingestion** | 50K stores × 14 MB | 700 GB/day |
| **Peak Ingestion Rate** | 700 GB ÷ 12 hr × 3 | ~50 MB/s |

---

## SLOs / SLAs

### Service Level Objectives

| Metric | Objective | Measurement Window | Consequence of Breach |
|--------|-----------|-------------------|----------------------|
| **Local Availability** | 100% | Per terminal | Hardware replacement |
| **In-Store Sync Success** | 99.9% | Daily | Escalate to support |
| **Cloud Sync Lag** | <15 minutes | Per store | Alert + retry |
| **Transaction Latency (p99)** | <100ms | Hourly | Performance tuning |
| **AI Inference Latency (p99)** | <300ms | Hourly | Model optimization |
| **Conflict Rate** | <0.1% | Daily | Algorithm review |
| **Data Durability** | 99.999999% | Annual | Critical incident |

### SLA Tiers

| Tier | Cloud Sync SLA | Support Response | Use Case |
|------|---------------|------------------|----------|
| **Basic** | 99.0% | 24 hours | Small retail |
| **Standard** | 99.5% | 4 hours | Mid-size retail |
| **Premium** | 99.9% | 1 hour | Enterprise |
| **Enterprise** | 99.95% | 15 minutes | Mission-critical |

---

## Operational Scenarios

### Scenario 1: Complete Network Outage

```
Timeline:
├─ T+0: Internet disconnects
├─ T+0: Terminals continue local operations (no impact)
├─ T+0: In-store sync continues via LAN
├─ T+1hr: Offline transactions accumulate
├─ T+8hr: Shift end, all transactions local
├─ T+24hr: Maximum tested offline duration
├─ T+24hr+: Internet restored
├─ T+24hr+30s: Delta sync begins
└─ T+24hr+5min: All data synced to cloud
```

### Scenario 2: Leader Terminal Failure

```
Timeline:
├─ T+0: Leader terminal crashes
├─ T+0-2s: Other terminals detect leader heartbeat timeout
├─ T+2-5s: Raft election triggered
├─ T+5s: New leader elected
├─ T+5-10s: Pending sync queue transferred
├─ T+10s: Normal operations resume
└─ Total downtime: 0 (other terminals never stopped)
```

### Scenario 3: Concurrent Inventory Update (Conflict)

```
Timeline:
├─ T+0: Terminal A sells last item of SKU-123
├─ T+0: Terminal B sells last item of SKU-123 (same instant)
├─ T+0: Both record local inventory = 0
├─ T+100ms: Sync event between terminals
├─ T+100ms: CRDT merge (PN-Counter decrements combine)
├─ T+100ms: Inventory = -1 (oversold detected)
├─ T+100ms: Alert generated for stock discrepancy
└─ Resolution: One transaction flagged for review
```

---

## Constraints

### Technical Constraints

| Constraint | Limit | Mitigation |
|------------|-------|------------|
| **Terminal Storage** | 4-32 GB | Aggressive data pruning |
| **Terminal RAM** | 1-4 GB | Model quantization |
| **LAN Bandwidth** | 100 Mbps - 1 Gbps | Delta sync, compression |
| **Internet Bandwidth** | 10 Mbps - 100 Mbps | Batched sync |
| **AI Model Size** | <100 MB per model | INT8 quantization |

### Business Constraints

| Constraint | Requirement | Impact |
|------------|-------------|--------|
| **Payment Processing** | PCI-DSS compliance | Encrypted storage, tokenization |
| **Offline Payment Limit** | $500 per transaction | Fraud risk mitigation |
| **Data Retention** | 7 years for transactions | Cloud archival |
| **GDPR Right to Erasure** | 30-day deletion | Sync deletion propagation |

---

## Assumptions

1. Store LAN is functional even when internet is down
2. At least one terminal remains powered for leader role
3. Terminal hardware supports TensorFlow Lite inference
4. Store staff can troubleshoot basic terminal issues
5. Peak hours are predictable (10am-2pm, 5pm-8pm)
6. Product catalog changes are infrequent (<1% daily)
7. Customer data can be partially cached (recent customers)
8. 15-minute sync delay is acceptable for cloud aggregation
