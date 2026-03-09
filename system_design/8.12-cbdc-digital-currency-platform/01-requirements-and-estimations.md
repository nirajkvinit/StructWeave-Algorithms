# Requirements & Estimations

## Functional Requirements

### Core Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Token Minting & Destruction** | Central bank mints new CBDC tokens into circulation through authorized monetary operations and destroys (burns) tokens upon redemption, maintaining total supply invariant with the central bank's balance sheet |
| F2 | **Two-Tier Distribution** | Central bank distributes tokens to licensed intermediaries (commercial banks, authorized payment providers) who in turn distribute to retail and merchant wallets; intermediaries maintain reserve accounts at the central bank |
| F3 | **Wallet Provisioning (Tiered KYC)** | Create wallets at three tiers: anonymous (phone-only, low limits), semi-identified (basic ID, medium limits), fully identified (full KYC, unlimited); enforce tier-specific transaction and balance limits in real time |
| F4 | **P2P Transfers** | Person-to-person CBDC transfers with immediate settlement finality; support both online (ledger-verified) and offline (NFC-based) transfer modes |
| F5 | **P2M Payments** | Person-to-merchant payments via QR code scan, NFC tap, or in-app payment; merchant receives settlement confirmation within 200ms for online transactions |
| F6 | **M2M / B2B Transfers** | Business-to-business CBDC transfers for supply chain payments, trade settlement, and interbank obligations; support bulk transfers and scheduled payments |
| F7 | **Offline NFC Payments** | Execute transactions between two devices with no internet connectivity using secure hardware elements; enforce local spending limits, maintain transaction counter, and queue for deferred reconciliation upon reconnection |
| F8 | **Programmable Conditions** | Attach executable conditions to tokens: expiration dates (stimulus expires in 90 days), purpose-binding (spendable only at specific merchant categories), geo-fencing (valid only within a region), and time-locks (released on a future date) |
| F9 | **Cross-Border Settlement** | Multi-CBDC atomic settlement with foreign central banks via interoperability protocols (mBridge model); include FX conversion, compliance checks, and settlement finality across independent ledgers |
| F10 | **RTGS Integration** | Seamless interoperability with the existing Real-Time Gross Settlement system; allow commercial banks to convert between CBDC and commercial bank money (reserves) in real time |
| F11 | **Merchant Payment Acceptance** | Merchant onboarding with payment terminal integration, QR code generation, settlement to merchant CBDC or bank account, and transaction reporting |
| F12 | **Bulk Disbursement** | Government-to-person (G2P) mass disbursements: direct benefit transfers, tax refunds, emergency relief payments; support millions of simultaneous credits with programmable conditions |
| F13 | **Token Denomination Management** | Manage digital denominations mirroring physical currency structure; handle token splitting (breaking a large token into smaller ones) and merging (combining tokens to reduce UTXO set bloat) |
| F14 | **Audit Trail & Regulatory Reporting** | Immutable, tamper-evident log of every token lifecycle event (mint, transfer, redeem, condition evaluation); generate regulatory reports for AML/CFT, monetary supply, velocity, and geographic distribution |
| F15 | **Interest Rate Application** | Central bank ability to apply positive, zero, or negative interest rates to CBDC holdings; enable differentiated rates by wallet tier, balance thresholds, or holding duration as a monetary policy tool |

### User Roles

| Role | Capabilities |
|------|-------------|
| **Central Bank Operator** | Mint/destroy tokens, set monetary policy parameters (interest rates, supply caps), configure programmable conditions, authorize intermediaries, monitor system-wide metrics |
| **Intermediary (Commercial Bank)** | Distribute tokens to retail users, manage customer wallets, perform KYC, maintain reserve accounts, reconcile offline transactions, submit regulatory reports |
| **Retail User** | Hold CBDC in wallet, send/receive transfers, make merchant payments, use offline NFC, view balance and history, upgrade wallet tier |
| **Merchant** | Accept CBDC payments, generate QR codes, manage settlement preferences, view transaction reports, integrate with POS terminals |
| **Government Agency** | Initiate bulk disbursements with programmable conditions, monitor fund utilization, configure subsidy parameters |
| **Regulator / Auditor** | Query transaction patterns (without deanonymizing low-tier wallets), run AML analytics, audit token supply, verify system integrity |

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Token Ledger Consistency** | Strong (CP) | Double-spending must be impossible; every token transfer must be serialized and verified before confirmation |
| **Analytics Consistency** | Eventual (AP) | Reporting dashboards, monetary velocity analytics, and geographic distribution can tolerate seconds of staleness |
| **Core Ledger Availability** | 99.999% (< 5.26 min downtime/year) | National payment infrastructure; unavailability impacts economic activity and public trust |
| **Online Transfer Latency** | p50 < 100ms, p99 < 200ms | Must match or exceed existing digital payment speed (UPI, card networks) |
| **Offline NFC Latency** | p99 < 500ms | Must feel instantaneous---comparable to tapping a transit card |
| **Token Durability** | 100% (zero token loss) | Tokens are central bank liabilities; losing tokens is equivalent to losing sovereign money |
| **Minting Throughput** | 100K tokens/batch | Accommodate monetary operations, seasonal currency demand, and emergency issuance |
| **Peak Transaction Throughput** | 50,000 TPS | Handle national-scale peak events (salary days, holidays, festivals) |
| **Offline Reconciliation Window** | < 24 hours | Devices must sync and reconcile offline transactions within one business day of reconnection |
| **Privacy Compliance** | Tiered anonymity | Anonymous wallets must have no linkable identity at the central bank level; identified wallets subject to full AML |
| **Cross-Border Settlement Finality** | < 30 seconds | mBridge-style atomic settlement must achieve finality faster than SWIFT (which takes 2--5 days) |
| **Data Retention** | 10+ years | Monetary audit trail retention per central bank mandate; immutable and tamper-evident |

---

## Out of Scope

| Item | Reason |
|------|--------|
| Cryptocurrency trading or exchange | CBDC is sovereign money, not a speculative asset; exchange between CBDC and crypto is a separate regulatory domain |
| Lending and credit products | CBDC is a payment instrument; credit creation remains the domain of commercial banks in the two-tier model |
| Investment products or yield farming | CBDC may bear interest as monetary policy but does not offer investment products |
| Commercial bank core banking replacement | CBDC operates alongside existing banking infrastructure, not as a replacement |
| Physical cash management (printing/distribution) | CBDC complements physical cash; physical currency logistics are a separate system |

---

## Capacity Estimations

### Traffic

```
Target wallets (national scale):     500,000,000 (500M)
Monthly active wallets:              200,000,000 (200M)
Daily active wallets:                50,000,000 (50M DAU)

Daily transactions:                  200,000,000 (200M)
  P2P transfers:                     60M (30%)
  P2M payments:                      100M (50%)
  M2M / B2B:                         20M (10%)
  G2P disbursements:                 10M (5%)
  Cross-border:                      10M (5%)

Average TPS:                         200M / 86,400 ≈ 2,315 TPS
Peak TPS:                            2,315 × 20 = ~50,000 TPS
  (Peaks during salary days, festival seasons, government disbursement days)

Read:Write ratio:                    3:1
  Reads: balance queries, history, merchant lookups
  Writes: transfers, minting, condition evaluation

Offline transactions (daily):        ~10M (5% of total)
  Average offline queue per device:  5--20 transactions before sync
```

### Token & Wallet Volume

```
Total tokens in circulation:         Variable (central bank monetary policy)
  Benchmark: e-CNY cumulative 7.3T yuan across 4 years
  Steady-state circulation:          ~$50B equivalent

Wallet distribution:
  Anonymous (Tier 1):                300M wallets (60%)
  Semi-identified (Tier 2):          150M wallets (30%)
  Fully identified (Tier 3):         50M wallets (10%)

Token model:
  Account-based (primary):           Balance per wallet in ledger
  Token-based (offline):             UTXO-style tokens in secure element
  Average UTXO per offline wallet:   10--50 tokens (different denominations)

Programmable token conditions:
  Active conditional tokens:         ~50M (government subsidies, expiring stimulus)
  Condition evaluations per day:     ~20M (at transaction time)
```

### Storage

```
--- Wallet Records ---
Wallet record size:                  ~1 KB (tier, balance, limits, linked identity hash)
Total wallet storage:                500M × 1 KB = 500 GB

--- Transaction Ledger ---
Transaction record size:             ~500 bytes (from, to, amount, timestamp, type, conditions, signature)
Daily growth:                        200M × 500 B = 100 GB/day
Annual growth:                       ~36.5 TB/year
Retention:                           10+ years (regulatory mandate)

--- Token Lifecycle Audit Log ---
Event record size:                   ~300 bytes (token_id, event_type, timestamp, actor, metadata)
Events per token per year:           ~10 (mint, transfer(s), merge/split, redeem)
Daily audit events:                  ~250M × 300 B = 75 GB/day
Annual growth:                       ~27 TB/year

--- Offline Transaction Queue ---
Queued transaction size:             ~800 bytes (includes cryptographic proofs)
Peak queued transactions:            10M × 800 B = 8 GB (burst during network outages)

--- Programmable Conditions ---
Condition record size:               ~200 bytes (type, parameters, expiry, merchant whitelist hash)
Active conditions:                   50M × 200 B = 10 GB

--- KYC & Identity Store ---
KYC record (Tier 2/3 only):         ~5 KB (hashed identity, verification status, documents)
Total KYC storage:                   200M × 5 KB = 1 TB

--- Year 1 Total Storage ---
Transaction ledger:                  ~36.5 TB
Audit log:                           ~27 TB
Wallets + KYC + conditions:          ~1.5 TB
Indexes and replicas (3x):           ~195 TB
Total Year 1:                        ~50 TB primary, ~200 TB with replication
```

### Bandwidth

```
Online transfer request:             ~500 bytes (sender, receiver, amount, conditions)
Online transfer response:            ~300 bytes (confirmation, new balance, receipt)
Peak transfer bandwidth:             50,000 TPS × 800 B = ~40 MB/s

Bulk disbursement batch:             10M × 500 B = 5 GB per batch
  Typical batch window:              1--2 hours
  Sustained bandwidth:               ~1 MB/s per batch

Offline sync payload:                20 transactions × 800 B = 16 KB per device
Offline sync peak:                   1M devices syncing/hour × 16 KB = ~4.4 GB/hour

Cross-border settlement messages:    ~2 KB per settlement (includes FX, compliance attestation)
Cross-border bandwidth:              10M/day × 2 KB = ~20 GB/day

Monitoring and telemetry:            ~500 MB/hour (system metrics, alerts, dashboards)
```

---

## SLO / SLA Table

| Service | Metric | SLO | SLA | Measurement |
|---------|--------|-----|-----|-------------|
| Core Token Ledger | Availability | 99.999% | 99.99% | Uptime of mint/transfer/redeem operations |
| Online Transfer | Latency p50 | < 100ms | < 150ms | Request received to settlement confirmation |
| Online Transfer | Latency p99 | < 200ms | < 500ms | Including condition evaluation and ledger commit |
| Offline NFC Payment | Latency p99 | < 500ms | < 1s | NFC tap to payment confirmation on device |
| Token Minting | Throughput | 100K/batch | 50K/batch | Central bank batch minting operations |
| Bulk Disbursement | Completion time | < 2 hours for 10M | < 4 hours | Government-to-person mass credit |
| Cross-Border Settlement | Finality | < 30s | < 60s | Atomic swap completion across CBDC ledgers |
| Wallet Balance Query | Latency p99 | < 50ms | < 100ms | Cached balance read from nearest replica |
| Programmable Condition Eval | Latency p99 | < 20ms | < 50ms | Condition check added to transfer latency budget |
| Offline Reconciliation | Completion | < 1 hour post-sync | < 4 hours | Time from device reconnection to full reconciliation |
| Audit Log Durability | Data loss | 0% | 0% | Every token event must be persisted immutably |
| Error Rate | Transfer failures | < 0.001% | < 0.01% | Excluding user errors (insufficient balance, etc.) |
| KYC Verification | Completion time | < 5 min (automated) | < 24 hours | Tier upgrade from anonymous to identified |

---

## Back-of-Envelope Calculations

### 1. Peak TPS Capacity Planning

```
Daily transactions:                  200M
Seconds in a day:                    86,400
Average TPS:                         200M / 86,400 ≈ 2,315 TPS

Peak multiplier:                     20x (salary + festival + disbursement convergence)
Peak TPS required:                   2,315 × 20 ≈ 50,000 TPS

Ledger write per transaction:        1 debit + 1 credit = 2 ledger writes
Peak ledger writes:                  50,000 × 2 = 100,000 writes/sec

With 10 shards (partitioned by wallet_id hash):
  Per-shard write rate:              10,000 writes/sec
  Each shard: write-ahead log + B-tree index commit < 0.1ms per write
  Headroom: 10,000 / 50,000 capacity = 20% utilization → safe margin
```

### 2. Offline Transaction Reconciliation Load

```
Offline transactions per day:        10M
Average offline queue per device:    10 transactions
Devices needing reconciliation:      10M / 10 = 1M devices/day

Reconciliation window:               8 hours (business hours)
Devices per second:                  1M / 28,800 ≈ 35 devices/sec
Transactions per second:             35 × 10 = 350 TPS (reconciliation)

Each reconciliation requires:
  1. Verify device signatures (crypto verification ~2ms each)
  2. Check for double-spend against ledger (~5ms)
  3. Apply transactions to ledger (~1ms)
  Total per transaction:             ~8ms

Reconciliation throughput:           1,000 / 8 = 125 TPS per worker
Workers needed:                      350 / 125 ≈ 3 workers (with 3x headroom = 9)
```

### 3. Storage Growth Projection (5 Years)

```
Year 1:  36.5 TB (transactions) + 27 TB (audit) = 63.5 TB
Year 2:  Growing 20% YoY adoption → 76 TB
Year 3:  91 TB
Year 4:  110 TB
Year 5:  132 TB

Cumulative (5 years):                ~473 TB primary data
With 3x replication:                 ~1.4 PB total storage

Hot storage (< 1 year):             ~132 TB (SSD-backed)
Warm storage (1--3 years):           ~277 TB (HDD-backed)
Cold storage (3--5+ years):          ~64 TB (archival object storage)
```

### 4. Programmable Condition Evaluation Overhead

```
Transactions with conditions:        20M/day (10% of 200M)
Condition types:
  Expiry check (timestamp compare):  ~0.01ms
  Merchant category check (set lookup): ~0.05ms
  Geo-fence check (polygon containment): ~0.1ms
  Time-lock check (timestamp compare): ~0.01ms

Average condition evaluation:        ~0.05ms per condition
Average conditions per token:        1.5
Overhead per conditioned transfer:   ~0.075ms

At peak TPS for conditioned:         5,000 TPS × 0.075ms = 0.375 core-seconds/sec
CPU cores needed for conditions:     < 1 core (negligible at system scale)
```

### 5. Cross-Border Settlement Throughput

```
Daily cross-border transactions:     10M
Settlement batch frequency:          Every 5 seconds (near-real-time)
Transactions per batch:              10M / 17,280 batches ≈ 580 per batch

Atomic swap per settlement:
  FX rate lookup:                    ~5ms
  Compliance check (sanctions):      ~10ms
  Cryptographic commitment:          ~15ms
  Cross-ledger atomic commit:        ~50ms (2-phase commit across CBDCs)
  Total per settlement:              ~80ms

Sequential settlements per second:   1,000 / 80 ≈ 12.5
With 50 parallel settlement channels: 625 settlements/sec
Peak requirement:                    580 / 5s = 116/sec → well within capacity
```

---

## Key Estimation Insights

1. **Peak TPS is the primary scaling challenge**: Average TPS of ~2,300 is modest, but 20x peak multipliers during salary-day-meets-festival scenarios push requirements to 50,000 TPS. Unlike commercial payment systems that can queue or rate-limit, a national currency system cannot reject valid transactions---requiring pre-provisioned capacity at peak levels with minimal auto-scaling reliance.

2. **Offline reconciliation is surprisingly lightweight**: Despite 10M offline transactions daily, the reconciliation workload translates to only ~350 TPS---manageable with fewer than 10 workers. The real complexity is not throughput but conflict resolution: detecting and resolving double-spends that occurred across offline devices spending the same token.

3. **Audit trail storage dominates**: Transaction data grows at 36.5 TB/year, but the audit trail (every token lifecycle event) adds another 27 TB/year. Over a 10-year regulatory retention period, audit storage alone exceeds 270 TB. A tiered storage strategy (hot/warm/cold) is essential, with cryptographic hash chains ensuring tamper-evidence for archived data.

4. **Programmable condition evaluation is negligible in latency**: At 0.075ms per conditioned transfer, the programmability engine adds less than 1% to the 200ms latency budget. The complexity is in the condition specification language, edge case handling (expired token mid-transfer), and ensuring conditions cannot be exploited for denial-of-service.

5. **Two-tier architecture splits the scaling problem**: The central bank core handles only inter-intermediary settlement and token minting (~10% of total traffic). Intermediaries absorb 90% of retail transaction load. This naturally partitions the system: the central bank needs ~5,000 TPS capacity while each of 100 intermediaries needs ~500 TPS---a dramatically simpler scaling problem than a monolithic 50,000 TPS system.
