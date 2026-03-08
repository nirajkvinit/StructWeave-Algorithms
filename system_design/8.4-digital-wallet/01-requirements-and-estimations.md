# Requirements & Estimations

## Functional Requirements

### Core Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Wallet Top-Up** | Load money into wallet via linked bank account, debit/credit card, or UPI; support auto-reload when balance drops below threshold |
| F2 | **P2P Transfer** | Send money to another wallet user by phone number, username, or QR code; instant delivery with real-time notification |
| F3 | **Merchant Payment** | Pay merchants via QR code scan (merchant-presented or user-presented), NFC tap, or in-app checkout SDK |
| F4 | **Bill Payments** | Pay utility bills, phone recharge, insurance premiums, subscriptions via wallet balance |
| F5 | **Transaction History** | View complete transaction history with filtering (date range, type, amount), downloadable statements |
| F6 | **Balance Inquiry** | Real-time wallet balance display; support multi-currency balances for international wallets |
| F7 | **Withdrawal** | Transfer wallet balance back to linked bank account; subject to KYC tier limits |
| F8 | **Refunds & Reversals** | Process refunds from failed merchant payments or disputed P2P transfers; credit back to wallet balance |
| F9 | **Cashback & Rewards** | Credit promotional cashback to a non-withdrawable promotional balance; track reward points |
| F10 | **Scheduled Payments** | Set up recurring payments for bills, subscriptions, or regular P2P transfers |
| F11 | **Split Bill** | Request money from multiple users for a shared expense; track pending collection |
| F12 | **Multi-Currency** | Hold balances in multiple currencies; convert between currencies at market rates with transparent markup |

### User Roles

| Role | Capabilities |
|------|-------------|
| **Consumer** | Top-up, P2P transfer, merchant payment, bill pay, transaction history, KYC upgrade |
| **Merchant** | Accept payments (QR/NFC/SDK), view settlement reports, request withdrawal, manage staff access |
| **KYC Agent** | Verify user identity documents, approve/reject KYC applications |
| **Operations** | Monitor transactions, handle disputes, manage refunds, view reconciliation reports |
| **Compliance Officer** | Review flagged transactions, file suspicious activity reports, manage KYC policies |
| **Platform Admin** | System configuration, partner bank management, fee schedule, limits management |

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **P2P Transfer Latency** | p50 < 500ms, p99 < 2s | Users expect instant money delivery; comparable to messaging speed |
| **QR/NFC Payment Latency** | p50 < 300ms, p99 < 1s | Point-of-sale experience requires tap-and-go speed |
| **Balance Query Latency** | p99 < 100ms | Balance must display instantly on app open |
| **Transaction Processing Availability** | 99.99% | Financial service; downtime means users cannot pay |
| **Ledger Consistency** | Zero imbalance | Sum of all debits must equal sum of all credits at all times |
| **Double-Spend Prevention** | 100% | Concurrent transfers must never exceed available balance |
| **Data Durability** | 99.9999% | Financial records must never be lost |
| **Transaction History Availability** | 99.9% | Read path can tolerate brief degradation |
| **Concurrent Wallets** | 500M registered, 200M MAU | Large-scale user base |
| **Regulatory Compliance** | Per jurisdiction | KYC/AML, money transmitter license, data localization |

---

## Capacity Estimations

### Traffic

```
Registered wallets:        500,000,000 (500M)
Monthly active wallets:    200,000,000 (200M)
Daily active wallets:      80,000,000 (80M)

Daily transactions:        200,000,000 (200M)
  P2P transfers:           60M (30%)
  Merchant payments:       80M (40%)
  Top-ups:                 30M (15%)
  Bill payments:           20M (10%)
  Withdrawals:             10M (5%)

Average transactions/sec:  200M / 86,400 ≈ 2,315 TPS
Peak transactions/sec:     2,315 × 10 = 23,150 TPS
  (Peaks during festivals, salary days, flash sales)

Balance queries/sec:       ~50,000 (app opens, pre-payment checks)
```

### Ledger Volume

```
Ledger entries per transaction:  2.5 average
  P2P transfer: 2 entries (debit sender, credit receiver)
  Top-up: 2 entries (debit escrow, credit user)
  Merchant payment with fee: 3 entries (debit user, credit merchant, credit fee account)

Daily ledger entries:      200M × 2.5 = 500M entries/day
Peak ledger writes/sec:    500M / 86,400 × 10 = ~57,870 writes/sec

Ledger entry size:         ~200 bytes
Daily ledger growth:       500M × 200B = 100 GB/day
Annual ledger growth:      100 GB × 365 = 36.5 TB/year
7-year retention:          ~256 TB (regulatory requirement)
```

### Storage

```
--- Wallet Accounts ---
Wallet record size:        ~500 bytes (balance, KYC tier, linked instruments, metadata)
Total wallet storage:      500M × 500B = 250 GB
Active wallet index:       200M × 100B = 20 GB (fits in memory)

--- Ledger ---
Daily growth:              100 GB/day
Annual growth:             36.5 TB/year
Hot storage (90 days):     9 TB
Warm storage (1 year):     36.5 TB
Cold storage (7 years):    ~256 TB (compressed: ~85 TB)

--- Transaction Metadata ---
Transaction record size:   ~1 KB (includes metadata, device info, fraud score)
Daily growth:              200M × 1 KB = 200 GB/day
Annual:                    73 TB/year

--- User & KYC Data ---
User profile:              ~2 KB per user
KYC documents:             ~5 MB per user (ID images, address proof)
Total user data:           500M × 2 KB = 1 TB
KYC document storage:      200M verified × 5 MB = 1 PB (object storage)
```

### Bandwidth

```
Transaction request size:   ~2 KB (encrypted payload)
Transaction response size:  ~1 KB
Peak transaction bandwidth: 23,150 × 3 KB = ~70 MB/s

Balance query response:     ~500 bytes
Peak balance bandwidth:     50,000 × 500B = ~25 MB/s

Total peak bandwidth:       ~95 MB/s (modest for financial services)
```

---

## SLO / SLA Table

| Service | Metric | SLO | SLA | Measurement |
|---------|--------|-----|-----|-------------|
| P2P Transfer | Latency p50 | < 500ms | < 1s | End-to-end: initiation to receiver credit |
| P2P Transfer | Latency p99 | < 2s | < 3s | Including cross-shard saga |
| P2P Transfer | Success rate | > 99.9% | > 99.5% | Excluding insufficient balance |
| Merchant Payment | Latency p99 | < 1s | < 2s | QR scan to payment confirmation |
| Merchant Payment | Success rate | > 99.95% | > 99.9% | Revenue-critical for merchant adoption |
| Top-Up | Completion rate | > 99% | > 98% | Bank/card charge to wallet credit |
| Top-Up | Latency p99 | < 5s | < 10s | Includes external bank confirmation |
| Balance Query | Latency p99 | < 100ms | < 200ms | Cached balance read |
| Balance Query | Availability | 99.99% | 99.95% | Most frequently accessed endpoint |
| Withdrawal | Processing time | < 24h | < 48h | Bank transfer settlement |
| Ledger | Consistency | Zero imbalance | Zero imbalance | Continuous reconciliation |
| Ledger | Write durability | 99.9999% | 99.999% | Synchronous replication |
| Fraud Detection | Scoring latency | < 100ms | < 200ms | Real-time, inline with transaction |
| Transaction History | Query latency p99 | < 500ms | < 1s | Paginated, recent 90 days |

---

## Key Estimation Insights

1. **Ledger is the bottleneck**: At 57,870 peak writes/sec across ledger entries, the ledger database is the most write-intensive component. Sharding by wallet ID and using append-only ledger entries (never update, only insert) is essential.

2. **Balance reads dominate**: At 50,000 balance queries/sec versus 23,150 transaction/sec, balance reads outnumber writes 2:1. A materialized balance cache (updated on each ledger write) avoids expensive SUM queries over ledger history.

3. **Storage is dominated by ledger history**: At 36.5 TB/year, the ledger is the largest data store. Tiered storage (hot/warm/cold) with compression is necessary; only recent 90 days need fast query access.

4. **Peak-to-average ratio is extreme**: Festival periods and salary days create 10x spikes. The system must handle 23,150 TPS at peak while the average is only 2,315 TPS. Auto-scaling and pre-warming are critical.

5. **KYC document storage is massive but cold**: 1 PB of KYC documents in object storage is the largest single data store, but access patterns are infrequent (verification time only). Tiered object storage with lifecycle policies manages cost.
