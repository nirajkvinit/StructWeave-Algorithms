# Requirements & Estimations — AI-Native Agent Banking Platform for Africa

## Functional Requirements

| ID | Requirement | Description |
|---|---|---|
| FR-01 | **Agent Onboarding & Lifecycle** | Register new agents with document verification, background screening, device provisioning, training assessment, and graduated activation; manage agent tiers (basic, standard, premium, super-agent) with tier-specific capabilities and limits |
| FR-02 | **Cash-In (Deposit)** | Accept customer cash deposits: verify customer identity (biometric or ID-based), validate against transaction limits, debit agent e-float, credit customer account, generate signed receipt; support both banked and unbanked customer flows |
| FR-03 | **Cash-Out (Withdrawal)** | Process customer cash withdrawals: authenticate customer via biometric/PIN, validate balance and limits, debit customer account, credit agent e-float, agent dispenses physical cash, generate receipt; apply velocity checks and risk scoring |
| FR-04 | **Fund Transfers** | Enable person-to-person transfers initiated at agent locations: sender authentication, recipient validation (phone number, account number, or agent code), real-time crediting for on-network transfers, queuing for cross-network transfers |
| FR-05 | **Bill Payments & Airtime** | Process utility bill payments (electricity, water, DSTV), airtime purchases, and government fee payments through agent terminals; integrate with 50+ biller APIs; reconcile payments in real-time |
| FR-06 | **Float Management** | Track agent cash and e-float balances in real-time; AI-driven predictive rebalancing recommendations; super-agent float distribution; automated alerts when float levels breach thresholds; float top-up via bank transfer or super-agent visit |
| FR-07 | **Biometric KYC** | Capture, validate, and store biometric data (fingerprint, facial) for customer identity verification; on-device quality assessment; offline template matching; server-side deduplication against national databases; tiered KYC (basic with phone number, standard with biometrics, full with government ID) |
| FR-08 | **Offline Transaction Processing** | Process transactions when device has no network connectivity; apply local risk rules; store transactions with cryptographic signatures; sync and reconcile when connectivity resumes; handle conflicts from concurrent offline operations |
| FR-09 | **Fraud Detection & Prevention** | Real-time transaction risk scoring; detect phantom transactions, float diversion, collusion rings, unauthorized fee charging; automated case management; agent risk scoring with dynamic limit adjustment |
| FR-10 | **Account Opening** | Open basic bank accounts or mobile wallets at agent locations; tiered KYC capture; instant account activation for basic tier; compliance verification for higher tiers; link to national identity databases |
| FR-11 | **Agent Performance Management** | Track agent performance metrics (transaction volume, uptime, customer satisfaction, compliance score); AI-generated performance scores; automated tier promotion/demotion; commission calculation and disbursement |
| FR-12 | **Regulatory Reporting** | Generate jurisdiction-specific regulatory reports; real-time suspicious transaction reporting (STR); daily/monthly aggregate reporting; automated compliance checks against configurable rule sets |

---

## Out of Scope

- **Lending and credit products**: Agent-originated loan applications and disbursements (covered by dedicated lending platforms)
- **Merchant acquiring**: POS card payment processing and merchant settlement (adjacent but distinct from CICO agent banking)
- **Insurance products**: Agent-sold micro-insurance policies and claims processing
- **Cryptocurrency**: Digital currency exchange or trading through agent network
- **Core banking system**: The underlying ledger and account management system (platform integrates with existing core banking via APIs)

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Transaction processing latency (online) | p50 < 800ms, p99 < 3s | Agent and customer waiting at point of sale; slower than this causes abandonment |
| Transaction processing latency (offline sync) | < 30s per batch of 50 transactions | Agents accumulate transactions offline; sync must complete quickly when connectivity returns |
| Biometric matching latency (on-device) | < 2s for 1:1 verification | Customer waiting at agent location; must feel instant |
| Biometric deduplication (server-side) | < 10s for 1:N search against 50M+ templates | Background process during KYC enrollment; not blocking transaction |
| Float balance query | p99 < 200ms | Agents check float balance frequently; must be instant |
| API availability | 99.95% monthly (excluding planned maintenance) | Financial service; downtime directly prevents transactions |
| Offline transaction success rate | > 99.5% reconciliation without manual intervention | Most offline transactions should auto-reconcile when synced |
| Fraud detection alert latency | < 5 minutes for critical alerts | Must catch fraud while agent is still operating |

### Reliability

| Dimension | Requirement |
|---|---|
| **Data Durability** | Zero transaction loss; every completed transaction must be persisted with at least 3 replicas across 2 availability zones |
| **Consistency Model** | Strong consistency for balance updates (double-entry ledger); eventual consistency acceptable for analytics, reporting, and agent performance scores (< 5 minute lag) |
| **Recovery Point Objective** | RPO < 1 minute for transaction data; RPO < 1 hour for analytics and reporting data |
| **Recovery Time Objective** | RTO < 15 minutes for transaction processing; RTO < 4 hours for analytics dashboards |
| **Offline Resilience** | Agent devices must support up to 72 hours of offline operation with local transaction capacity of 500 transactions before requiring sync |
| **Multi-Region** | Active-active deployment across at least 2 regions per country for disaster resilience |

---

## Capacity Estimations

### Traffic Estimates

| Parameter | Value | Derivation |
|---|---|---|
| Total registered agents | 600,000 | Moniepoint alone has 500K+; combined platform target |
| Active agents (daily) | 420,000 (70%) | Industry benchmark for daily active agent ratio |
| Transactions per agent per day | 85 | Based on Moniepoint's 1.67B monthly / ~600K agents |
| Daily transactions | ~35 million | 420,000 active agents × 85 txns/agent |
| Monthly transactions | ~1.05 billion | 35M × 30 days |
| Peak transactions per second | 1,200 TPS | 35M daily / 86,400 × 3x peak multiplier (midday surge) |
| Absolute peak TPS | 3,000 TPS | Salary day / month-end peaks (5-7x average) |
| Offline transactions (% of daily) | 15-25% | Varies by geography; rural areas up to 40% |
| Biometric verifications per day | ~28 million | ~80% of transactions require biometric auth |

### Storage Estimates

| Data Type | Per-Record Size | Daily Volume | Daily Storage | Annual Storage |
|---|---|---|---|---|
| Transaction records | ~2 KB | 35M | 70 GB | 25.5 TB |
| Biometric templates (fingerprint) | ~500 bytes (minutiae) | 50K new enrollments | 25 MB | 9.1 GB |
| Biometric templates (facial) | ~2 KB (embedding) | 50K new enrollments | 100 MB | 36.5 GB |
| Biometric raw captures (images) | ~200 KB | 50K enrollments | 10 GB | 3.65 TB |
| Agent profile data | ~10 KB | 1,000 new agents | 10 MB | 3.65 GB |
| Audit logs | ~500 bytes | 70M events | 35 GB | 12.8 TB |
| Fraud detection features | ~1 KB | 35M | 35 GB | 12.8 TB |
| **Total active storage** | | | **~150 GB/day** | **~55 TB/year** |

### Compute Estimates

| Component | Requirement | Notes |
|---|---|---|
| Transaction processing | 60 cores at peak | 3,000 TPS × 20ms CPU per transaction |
| Biometric matching (server) | 40 cores | 1:N deduplication is CPU-intensive; GPU acceleration for large databases |
| Fraud ML inference | 30 cores | Real-time scoring on every transaction |
| Float prediction | 20 cores | Batch prediction every 4 hours for 600K agents; real-time adjustment on demand |
| Offline sync processing | 25 cores at peak | Burst capacity for morning sync wave (agents coming online) |

### Network Estimates

| Flow | Bandwidth | Notes |
|---|---|---|
| Agent ↔ Platform (per agent) | 2-5 KB per transaction | Compressed payloads for low-bandwidth environments |
| Biometric upload (enrollment) | ~250 KB per customer | Fingerprint + facial images + metadata |
| Offline sync batch | 100-500 KB per sync | 50-200 queued transactions per batch |
| Platform ↔ Core banking | 500 Mbps sustained | Transaction posting, balance queries, settlement |
| Platform ↔ Identity services | 100 Mbps sustained | Biometric dedup, national ID verification |
| **Total egress** | ~2 TB/day | Dominated by biometric data and transaction responses |
