# Requirements & Estimations — AI-Native Core Banking Platform

## 1. Functional Requirements

### 1.1 Account Lifecycle Management

| Capability | Description |
|---|---|
| **Account Opening** | Digital onboarding with eKYC, biometric verification, document validation |
| **Account Types** | Savings, current, fixed deposit, recurring deposit, loan, credit line, nostro/vostro, GL |
| **Account Hierarchy** | Customer → relationship → account → sub-account with linked structures |
| **Multi-Entity** | Single customer visible across multiple legal entities with entity-specific accounts |
| **Account Dormancy** | Automated dormancy detection, reactivation workflows, escheatment processing |
| **Account Closure** | Balance sweep, pending transaction settlement, regulatory hold checks |

**Key Operations:**
- Create, modify, freeze, unfreeze, close accounts
- Link accounts (sweep, pool, zero-balance structures)
- Transfer account ownership between entities
- Account number generation with check-digit validation (IBAN, BBAN formats)

### 1.2 Transaction Processing Engine

| Capability | Description |
|---|---|
| **Real-Time Posting** | Synchronous double-entry posting with sub-100ms latency |
| **Transaction Types** | Credits, debits, transfers, holds, reversals, adjustments, fee assessments |
| **Batch Processing** | End-of-day interest accrual, fee calculation, statement generation |
| **Payment Initiation** | Domestic (ACH, RTGS, faster payments) and cross-border (SWIFT, SEPA) |
| **Standing Instructions** | Scheduled transfers, recurring payments, sweep arrangements |
| **Transaction Limits** | Per-transaction, daily, entity-level, and customer-level limit enforcement |

**Critical Guarantees:**
- Every transaction produces exactly two entries (debit + credit) that sum to zero
- No partial postings: both legs commit or neither commits
- Idempotent transaction processing to handle retries safely
- Strict ordering within an account to prevent balance inconsistency

### 1.3 Multi-Entity Multi-Currency Processing

| Capability | Description |
|---|---|
| **Entity Management** | Independent legal entities with separate chart of accounts and regulatory profiles |
| **Currency Support** | 150+ ISO 4217 currencies with configurable decimal precision |
| **FX Rate Management** | Real-time rate feeds, spread configuration, rate locking for transactions |
| **Inter-Entity Transfers** | Cross-entity movement with automatic inter-company GL entries |
| **Position Management** | Real-time currency position tracking per entity and consolidated |
| **Revaluation** | Automated periodic revaluation of foreign currency positions |

**Multi-Currency Transaction Flow:**
1. Receive transaction in source currency
2. Determine applicable exchange rate (spot, forward, negotiated)
3. Calculate equivalent in booking currency with rounding rules
4. Post both currency amounts in double-entry format
5. Update currency position and generate FX P&L entries
6. Record rate metadata for audit and revaluation

### 1.4 Lending and Credit

| Capability | Description |
|---|---|
| **Loan Origination** | Application intake, AI-powered credit scoring, approval workflow |
| **Product Configuration** | Interest methods (simple, compound, rule-of-78), amortization schedules |
| **Disbursement** | Single, multiple, revolving disbursement with condition precedent checks |
| **Repayment Processing** | Principal, interest, fee allocation with configurable waterfall rules |
| **Collateral Management** | Collateral registration, valuation, lien management, margin calls |
| **NPL Management** | Delinquency tracking, provisioning (IFRS 9/CECL), write-off workflows |

### 1.5 Deposit Products

| Capability | Description |
|---|---|
| **Term Deposits** | Fixed-rate, floating-rate, with auto-renewal and partial withdrawal |
| **Savings Products** | Tiered interest, minimum balance, sweep-in/sweep-out configurations |
| **Interest Calculation** | Day-count conventions (ACT/360, ACT/365, 30/360), compounding frequency |
| **Tax Withholding** | Jurisdiction-specific TDS/withholding tax calculation and reporting |
| **Deposit Insurance** | Automated coverage calculation per depositor per entity |

### 1.6 Regulatory Compliance Engine

| Capability | Description |
|---|---|
| **AML/CFT Screening** | Real-time transaction screening against sanctions lists (OFAC, EU, UN) |
| **KYC/CDD** | Risk-based customer due diligence with periodic review scheduling |
| **Suspicious Activity** | ML-powered unusual activity detection with automated STR/SAR filing |
| **Basel III/IV** | Capital adequacy, liquidity coverage, leverage ratio calculations |
| **Regulatory Reporting** | Automated generation of CCAR, DFAST, COREP, FINREP, call reports |
| **Data Lineage** | Full traceability from source transaction to regulatory report field |

### 1.7 Open Banking APIs

| Capability | Description |
|---|---|
| **Account Information** | PSD2/PSD3 AISP API for authorized third-party account access |
| **Payment Initiation** | PISP API for third-party payment initiation with SCA |
| **Consent Management** | Granular consent capture, storage, revocation with audit trail |
| **Developer Portal** | Self-service API documentation, sandbox, API key management |
| **Webhook Notifications** | Event-driven notifications for account changes, payment status |
| **Rate Limiting** | Per-TPP, per-API, per-customer rate limiting with quota management |

### 1.8 ISO 20022 Messaging

| Capability | Description |
|---|---|
| **Message Types** | pain (initiation), pacs (clearing/settlement), camt (cash management) |
| **Format Translation** | Bidirectional conversion between ISO 20022, MT (SWIFT), and proprietary formats |
| **Enrichment** | Structured remittance data, LEI, purpose codes, regulatory references |
| **Validation** | Schema validation, business rule validation, sanctions screening integration |
| **Routing** | Intelligent message routing based on payment type, corridor, urgency |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| Metric | Target | Rationale |
|---|---|---|
| **Transaction Latency (p50)** | < 50ms | Real-time balance updates for customer-facing channels |
| **Transaction Latency (p99)** | < 200ms | Consistent experience even under load |
| **Batch Processing Window** | < 2 hours | End-of-day processing for interest, fees, statements |
| **Open Banking API (p95)** | < 300ms | PSD2 mandates reasonable response times |
| **Query Latency (balance)** | < 10ms | Sub-second response for balance inquiries |
| **Throughput** | 100,000 TPS | Peak processing during salary runs and payment deadlines |

### 2.2 Availability and Reliability

| Metric | Target | Rationale |
|---|---|---|
| **Availability** | 99.999% | Banking is critical infrastructure; 5.26 min/year downtime max |
| **RPO** | 0 (zero data loss) | Financial data is irreplaceable; synchronous replication required |
| **RTO** | < 60 seconds | Automated failover with pre-warmed standby |
| **Error Rate** | < 0.001% | Financial accuracy demands near-zero error rates |
| **Transaction Integrity** | 100% | No partial postings, no lost transactions, no double-processing |

### 2.3 Consistency and Correctness

| Requirement | Description |
|---|---|
| **ACID Compliance** | All transaction postings must be fully ACID-compliant |
| **Serializable Isolation** | Account-level serializable isolation to prevent balance anomalies |
| **Idempotency** | Every transaction operation must be safely retryable |
| **Reconciliation** | Automated intra-day reconciliation between ledger and GL |
| **Audit Trail** | Complete, immutable, tamper-evident audit log for all state changes |

### 2.4 Scalability

| Dimension | Requirement |
|---|---|
| **Horizontal Scaling** | Stateless services auto-scale independently based on load |
| **Data Partitioning** | Account-based sharding with locality-aware routing |
| **Multi-Region** | Active-active deployment across 2+ geographic regions |
| **Storage Growth** | Linear storage scaling; 5+ years of online transaction history |
| **Tenant Isolation** | Logical isolation per entity with independent resource quotas |

### 2.5 Security

| Requirement | Standard |
|---|---|
| **Encryption at Rest** | AES-256 for all stored data including backups |
| **Encryption in Transit** | TLS 1.3 for external, mTLS for internal service communication |
| **Authentication** | Multi-factor, Strong Customer Authentication (SCA) for PSD2 |
| **Authorization** | Attribute-based access control (ABAC) with entity/branch scoping |
| **Key Management** | HSM-backed key management with automated rotation |
| **Data Masking** | PII masking in non-production environments and logs |

---

## 3. Capacity Estimations

### 3.1 Transaction Volume

```
Assumptions:
- 100 million active accounts
- Average 5 transactions per account per day
- Peak multiplier: 10x average (salary days, month-end)

Daily transactions = 100M × 5 = 500M transactions/day
Average TPS = 500M / 86,400 = ~5,800 TPS
Peak TPS = 5,800 × 10 = ~58,000 TPS
Design target = 100,000 TPS (headroom for growth + burst)
```

### 3.2 Storage Estimation

```
Transaction record size:
- Transaction ID: 16 bytes (UUID)
- Account ID: 16 bytes
- Counterpart account: 16 bytes
- Amount: 16 bytes (decimal + currency)
- Timestamp: 8 bytes
- Type/status/flags: 8 bytes
- Reference data: 64 bytes
- Metadata/enrichment: 128 bytes
- Event payload: ~256 bytes
Total per entry: ~528 bytes
Double-entry = 2 entries per transaction: ~1,056 bytes

Daily storage:
- 500M transactions × 1,056 bytes = ~528 GB/day
- Monthly: ~16 TB
- Yearly: ~193 TB
- 5-year retention (online): ~965 TB ≈ 1 PB

Index overhead (30%): ~300 TB for 5 years
Audit log overhead (20%): ~200 TB for 5 years
Total 5-year storage: ~1.5 PB
```

### 3.3 Open Banking API Traffic

```
Third-party providers (TPPs): 500 registered TPPs
Average API calls per TPP per day: 50,000
Total daily API calls: 500 × 50,000 = 25M calls/day
Average API RPS: 25M / 86,400 = ~290 RPS
Peak API RPS (4x): ~1,160 RPS
Design target: 10,000 RPS (including direct channels)
```

### 3.4 Multi-Currency Processing

```
Active currencies: 50 primary, 150 total
FX rate updates: Every 5 seconds for major pairs = ~17,280 updates/pair/day
FX conversion transactions: 10% of total = 50M/day
FX rate feed storage: 50 pairs × 17,280 × 64 bytes = ~55 MB/day
Position recalculation: Real-time per transaction + hourly snapshots
```

### 3.5 Regulatory Processing

```
AML screening: 100% of transactions = 500M screenings/day
Sanctions list size: ~2M entities, ~5M aliases
Screening latency requirement: < 50ms (inline with transaction)
Regulatory report generation: 200+ report types × multiple entities
STR/SAR volume: ~0.01% flagged = 50,000 alerts/day
Alert investigation throughput: 5,000 cases/day with AI triage
```

---

## 4. Service Level Objectives (SLOs)

### 4.1 Tiered SLO Framework

| Tier | Service | Availability | Latency (p99) | Error Budget |
|---|---|---|---|---|
| **Tier 0** | Transaction posting, balance inquiry | 99.999% | 200ms | 5.26 min/year |
| **Tier 0** | Payment processing (real-time) | 99.999% | 500ms | 5.26 min/year |
| **Tier 1** | Account management, lending operations | 99.99% | 1s | 52.6 min/year |
| **Tier 1** | Open Banking APIs | 99.99% | 300ms | 52.6 min/year |
| **Tier 2** | Regulatory reporting, batch processing | 99.9% | N/A (batch) | 8.76 hrs/year |
| **Tier 2** | Developer portal, analytics dashboards | 99.9% | 2s | 8.76 hrs/year |

### 4.2 Data Integrity SLOs

| Metric | Target |
|---|---|
| **Transaction accuracy** | 100% (zero tolerance for financial errors) |
| **Ledger balance correctness** | Verified by continuous reconciliation — zero variance |
| **Audit completeness** | 100% of state changes captured with < 1s lag |
| **Regulatory report accuracy** | 100% validated against source data with full lineage |

### 4.3 SLA Commitments (Contractual)

| Commitment | Target | Penalty Trigger |
|---|---|---|
| **Core uptime** | 99.99% monthly | Credit 10% of monthly fees per 0.01% below |
| **Transaction processing** | < 500ms p99 | Credit 5% if monthly p99 exceeds target |
| **Scheduled maintenance** | < 4 hours/month | Must be during designated windows |
| **Incident response** | P1: 5 min, P2: 15 min | Escalation to executive team |
| **Data recovery** | RPO=0, RTO < 5 min | Regulatory notification if breached |

---

## 5. Constraint Analysis

### 5.1 Regulatory Constraints

| Constraint | Impact |
|---|---|
| **Data Residency** | Transaction data must remain within jurisdictional boundaries |
| **Retention Period** | 7–10 years for transaction records depending on jurisdiction |
| **Audit Access** | Regulators must have read-only access to audit systems within 24 hours |
| **Change Management** | All system changes require documented approval and rollback plans |
| **Outsourcing Rules** | Cloud deployments must comply with banking outsourcing regulations |

### 5.2 Technical Constraints

| Constraint | Impact |
|---|---|
| **Legacy Integration** | Must coexist with existing mainframe systems during migration |
| **Payment Network SLAs** | SWIFT, SEPA, and domestic payment networks impose message format and timing requirements |
| **HSM Dependency** | Cryptographic operations bound by HSM throughput (~10,000 ops/sec per HSM) |
| **Certificate Management** | PSD2 requires eIDAS certificates; certificate lifecycle management is critical |
| **Time Synchronization** | All nodes must maintain < 1ms clock drift for transaction ordering |

---

*Next: [High-Level Design →](./02-high-level-design.md)*
