# Requirements and Estimations

[Back to Index](./00-index.md)

---

## Functional Requirements

### Priority 0 (Must Have - Day 1)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| **Inventory Tracking** | Track drug inventory with batch, lot, and expiry at SKU level | FIFO/FEFO enforcement, real-time stock visibility |
| **Prescription Dispensing** | Process new and refill prescriptions with pharmacist verification | Rx intake to pickup workflow, signature capture |
| **Controlled Substance Logging** | Maintain perpetual inventory of Schedule II-V drugs | Real-time reconciliation, discrepancy alerts |
| **OTC Point of Sale** | Process over-the-counter sales with payment and tax | Multiple payment methods, receipt generation |
| **Patient Management** | Maintain patient profiles with allergies, medications, insurance | PHI protection, allergy alerts |
| **Insurance Claims** | Submit and adjudicate pharmacy claims in real-time | NCPDP D.0/F6 compliance, rejection handling |
| **Drug-Drug Interaction (DDI)** | Alert on potential drug interactions at fill time | Severity classification, override with reason |
| **Regulatory Licensing** | Track pharmacy and staff licenses with expiry alerts | DEA, state, CDSCO license validation |

### Priority 1 (Should Have - Quarter 1)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| **Medication Substitution** | Suggest generic alternatives based on therapeutic equivalence | Orange Book TE codes, cost savings display |
| **Demand Forecasting** | Predict drug demand for inventory optimization | 7/14/30 day forecasts, reorder suggestions |
| **Supplier Management** | Manage purchase orders, vendors, and receiving | PO creation, vendor scoring, returns |
| **Expiry Optimization** | Identify at-risk inventory and recommend actions | Transfer, markdown, return suggestions |
| **Sales Analytics** | Track sales performance, margins, and trends | ABC analysis, slow mover identification |
| **Multi-Terminal Sync** | Synchronize inventory across terminals in a pharmacy | CRDT-based conflict resolution |
| **PMP Integration** | Query state prescription monitoring programs | Real-time patient history check |
| **E-Prescribing** | Receive electronic prescriptions (EPCS for controlled) | SCRIPT 10.6+, DEA EPCS compliance |

### Priority 2 (Nice to Have - Quarter 2+)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| **Predictive Compliance** | AI-powered compliance risk scoring | Violation prediction, audit preparation |
| **Natural Language Analytics** | Query sales data using natural language | "Show me slow movers this month" |
| **Medication Adherence** | Track patient adherence and intervene | Refill reminders, MTM support |
| **Telepharmacy** | Remote pharmacist verification for rural locations | Video consult, remote Rx approval |
| **340B Compliance** | Track 340B eligible prescriptions for hospitals | Accumulator, split billing |
| **Compounding Module** | Track compounded medication preparation | Formula management, beyond-use dating |

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Drug Manufacturing | Different regulatory domain (GMP) |
| Clinical Trials | Requires separate trial management system |
| Wholesale Distribution | Different license type (3PL) |
| Medical Device Dispensing | Separate regulatory framework |
| Cannabis Dispensing | Specialized state-by-state regulations |

---

## Non-Functional Requirements

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Dispensing Transaction Latency** | p50 < 300ms, p99 < 500ms | Time from submit to confirmation |
| **Substitution Lookup** | p50 < 1s, p99 < 2s | Time to return alternatives |
| **DDI Check** | p50 < 200ms, p99 < 500ms | Inline with dispensing |
| **Insurance Adjudication** | p99 < 5s | Includes external API call |
| **Inventory Sync (Terminal)** | < 100ms local, < 5s cloud | CRDT delta sync |
| **Report Generation** | < 30s for daily, < 5min for monthly | Pre-aggregated where possible |

### Availability

| Component | Target | Justification |
|-----------|--------|---------------|
| **Dispensing Service** | 99.99% (52 min/year downtime) | Revenue-critical, patient safety |
| **Controlled Substance Tracking** | 99.99% | Regulatory requirement |
| **AI Features (Substitution, Forecasting)** | 99.9% | Graceful degradation acceptable |
| **Analytics** | 99.5% | Non-critical path |
| **Offline Terminal** | 100% local | 24+ hour offline capability |

### Consistency

| Operation | Model | Justification |
|-----------|-------|---------------|
| Controlled Substance Inventory | Strong (ACID) | DEA reconciliation requirements |
| Financial Transactions | Strong (ACID) | Accounting accuracy |
| General Inventory | Eventually Consistent | Multi-terminal sync via CRDT |
| Analytics/Reporting | Eventually Consistent | Delay acceptable (< 5 min) |
| Drug Knowledge Base | Read-heavy, cache | Infrequent updates |

### Durability

| Data Type | Durability | Retention |
|-----------|------------|-----------|
| Controlled Substance Logs | 99.9999999% (11 nines) | 7 years (DEA: 2 years minimum) |
| Patient Records | 99.9999999% | State-dependent (typically 7-10 years) |
| Financial Transactions | 99.9999999% | 7 years (tax/audit) |
| Prescription Records | 99.9999999% | 10 years (varies by state) |
| Analytics Data | 99.99% | 3 years hot, 7 years cold |

---

## Capacity Estimations

### Assumptions (Large Pharmacy Chain)

| Parameter | Value | Source |
|-----------|-------|--------|
| Number of Pharmacies | 10,000 | Target scale |
| Prescriptions per Day (per pharmacy) | 300 | Industry average for retail |
| OTC Transactions per Day (per pharmacy) | 200 | Varies by location |
| Average SKUs per Pharmacy | 10,000 | Brand + generic + OTC |
| Unique Patients per Pharmacy | 5,000 | Active in last 12 months |
| Terminals per Pharmacy | 3-5 | Average |
| Average Line Items per Transaction | 2.5 | Rx + OTC bundling |

### Traffic Estimations

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Total Transactions/Day** | 10,000 pharmacies × 500 txn | **5,000,000** |
| **Peak Transactions/Hour** | 5M × 20% in peak 2 hours | **500,000** |
| **Transactions per Second (Peak)** | 500,000 / 3600 | **~140 TPS** |
| **Transactions per Second (Avg)** | 5M / 86400 | **~58 TPS** |
| **DDI Checks per Day** | 5M × 0.6 (Rx ratio) × 2.5 drugs | **7.5M** |
| **Insurance Claims per Day** | 5M × 0.6 × 0.8 (insured) | **2.4M** |
| **PMP Queries per Day** | 3M Rx × 0.3 (controlled) | **900,000** |

### Storage Estimations

| Data Type | Size per Record | Records (Year 1) | Total Storage |
|-----------|-----------------|------------------|---------------|
| **Transactions** | 2 KB | 1.8B (5M × 365) | **3.6 TB** |
| **Transaction Line Items** | 500 B | 4.5B | **2.25 TB** |
| **Controlled Substance Log** | 1 KB | 330M | **330 GB** |
| **Inventory Batches** | 500 B | 500M | **250 GB** |
| **Patient Records** | 5 KB | 50M | **250 GB** |
| **Prescription Records** | 2 KB | 1.1B | **2.2 TB** |
| **Audit Logs** | 500 B | 5B | **2.5 TB** |
| **Drug Knowledge Base** | 10 KB | 500K drugs | **5 GB** |
| **Total Year 1** | | | **~12 TB** |
| **Total Year 5** | 20% growth/year | | **~30 TB** |

### Bandwidth Estimations

| Flow | Calculation | Result |
|------|-------------|--------|
| **Terminal → Cloud (Peak)** | 140 TPS × 10 KB avg | **1.4 MB/s** |
| **Insurance API (Peak)** | 30 TPS × 5 KB | **150 KB/s** |
| **PMP API (Peak)** | 10 TPS × 2 KB | **20 KB/s** |
| **Drug DB Sync (Daily)** | 500K × 10 KB | **5 GB/day** |
| **Analytics Queries** | 1000/day × 1 MB avg | **1 GB/day** |

### Cache Sizing

| Cache | Size | TTL | Hit Rate Target |
|-------|------|-----|-----------------|
| **Drug Catalog** | 5 GB | 24 hours | 99% |
| **Formulary** | 1 GB per payer | 1 hour | 95% |
| **Orange Book TE Codes** | 100 MB | 24 hours | 99% |
| **Patient (Hot)** | 2 GB per pharmacy | 1 hour | 80% |
| **Session** | 10 MB per pharmacy | 8 hours | N/A |

---

## SLOs and SLAs

### Service Level Objectives (SLOs)

| Service | Metric | Target | Measurement Window |
|---------|--------|--------|-------------------|
| **Dispensing API** | Availability | 99.99% | Monthly |
| **Dispensing API** | p99 Latency | < 500ms | Daily |
| **Dispensing API** | Error Rate | < 0.1% | Daily |
| **Insurance Claims** | Success Rate | > 95% | Daily |
| **Insurance Claims** | p99 Latency | < 5s | Daily |
| **PMP Query** | Availability | 99.9% | Monthly |
| **Substitution Engine** | p99 Latency | < 2s | Daily |
| **Inventory Sync** | Sync Lag | < 5 min | Hourly |
| **Controlled Substance Reconciliation** | Accuracy | 100% | Daily |

### Service Level Agreements (SLAs) by Tier

| Tier | Monthly Uptime | Support Response | Credits |
|------|----------------|------------------|---------|
| **Enterprise** | 99.99% | 15 min (P1), 1 hr (P2) | 25% for < 99.9%, 50% for < 99.5% |
| **Professional** | 99.9% | 1 hr (P1), 4 hr (P2) | 10% for < 99.5% |
| **Starter** | 99.5% | 8 hr (P1), 24 hr (P2) | Best effort |

### Compliance SLOs

| Regulation | Requirement | SLO |
|------------|-------------|-----|
| **DEA** | Controlled substance log accuracy | 100% |
| **DEA** | ARCOS report timeliness | On-time 100% |
| **HIPAA** | Audit log completeness | 100% |
| **HIPAA** | Breach detection | < 24 hours |
| **State PMP** | Reporting timeliness | Per state requirement |
| **CDSCO** | Schedule H1 register accuracy | 100% |

---

## AI-Specific Requirements

### Model Performance Targets

| Model | Metric | Target | Measurement |
|-------|--------|--------|-------------|
| **Demand Forecasting** | MAPE (Mean Absolute Percentage Error) | < 15% | Weekly on test set |
| **Substitution Ranking** | NDCG@5 | > 0.8 | Based on pharmacist selection |
| **Anomaly Detection** | Precision | > 90% | Monthly on labeled data |
| **Anomaly Detection** | Recall | > 80% | Critical for diversion |
| **Expiry Prediction** | Waste Reduction | > 20% vs baseline | Quarterly |

### AI Inference Latency

| Model | p50 | p99 | Batch Size |
|-------|-----|-----|------------|
| **Substitution Ranker** | < 200ms | < 500ms | 1 drug |
| **Demand Forecast** | < 500ms | < 1s | 100 SKUs |
| **Anomaly Scoring** | < 100ms | < 200ms | 1 transaction |
| **Expiry Risk** | < 1s | < 2s | 1000 batches |

### Data Freshness for AI

| Data Source | Freshness Requirement | Update Frequency |
|-------------|----------------------|------------------|
| FDA Orange Book | < 1 week | Weekly sync |
| RxNorm | < 1 month | Monthly sync |
| DrugBank | < 1 month | Monthly sync |
| Formulary | < 1 day | Daily sync |
| Historical Sales | < 1 day | Daily ETL |
| Pricing | Real-time | Event-driven |

---

## Compliance Requirements Summary

### United States

| Regulation | Key Requirements | System Impact |
|------------|------------------|---------------|
| **DEA (Controlled Substances Act)** | Schedule II-V tracking, ARCOS reporting, biennial inventory | Perpetual inventory, audit trail |
| **HIPAA** | PHI protection, minimum necessary, audit logs | Encryption, access control, logging |
| **State Pharmacy Boards** | License verification, compounding rules | Per-state configuration |
| **State PMP** | Report dispensing of controlled substances | Real-time/batch reporting integration |
| **EPCS (DEA)** | Two-factor auth for e-prescribing controlled | OIDC + MFA, identity proofing |
| **USP <795>/<797>** | Compounding standards | Beyond-use date calculation |

### India

| Regulation | Key Requirements | System Impact |
|------------|------------------|---------------|
| **Drugs and Cosmetics Act** | Drug license (Form 20/21), sale register | License verification, sales logging |
| **CDSCO** | Schedule H, H1, X drug handling | Separate registers, reporting |
| **Schedule H1** | Mandatory register with patient/prescriber details | Dedicated logging, 3-year retention |
| **Schedule X (Narcotics)** | Enhanced control, separate storage | Vault verification, daily reporting |
| **GST** | Tax compliance for drug sales | Tax calculation, return filing |

### Multi-Jurisdiction Matrix

| Requirement | US (DEA) | US (State) | India (CDSCO) | EU (GDP) |
|-------------|----------|------------|---------------|----------|
| Controlled Tracking | Schedule I-V | Varies | H, H1, X | Controlled |
| Audit Retention | 2 years | 3-7 years | 3 years | 5 years |
| Reporting Frequency | Annual (ARCOS) | Real-time (PMP) | Monthly | Annual |
| Prescription Validity | 90 days (C-II), 6mo (C-III-V) | Varies | Immediate (X), 6mo | 6 months |
| Pharmacist Verification | Required | Required | Required | Required |

---

## Integration Requirements

### External Systems

| System | Protocol | Latency Req | Availability Req |
|--------|----------|-------------|------------------|
| **State PMP** | HL7 / REST | < 5s | 99% |
| **Insurance Payers** | NCPDP D.0/F6 | < 5s | 99.9% |
| **Drug Wholesalers** | EDI 850/855 | < 30s | 99% |
| **FDA Orange Book** | REST/Bulk | N/A (daily sync) | N/A |
| **E-Prescribing Networks** | NCPDP SCRIPT | < 30s | 99.9% |
| **Payment Processors** | EMV/ISO 8583 | < 3s | 99.99% |

### Internal Systems

| System | Integration Pattern | Frequency |
|--------|---------------------|-----------|
| **EHR/EMR** | FHIR R4 | Real-time |
| **Accounting/GL** | Event-driven | Nightly batch |
| **HR/Payroll** | REST API | Daily sync |
| **Business Intelligence** | CDC (Change Data Capture) | Near real-time |

---

## Disaster Recovery Requirements

| Metric | Target | Justification |
|--------|--------|---------------|
| **RTO (Recovery Time Objective)** | 4 hours | Pharmacy can operate offline during recovery |
| **RPO (Recovery Point Objective)** | 15 minutes | Maximum data loss tolerance |
| **Backup Frequency** | Continuous WAL, hourly snapshots | Balance of cost and recovery granularity |
| **Backup Retention** | 30 days hot, 7 years cold | Regulatory requirements |
| **Multi-Region** | Active-passive (warm standby) | Cost-effective DR |
| **Failover Testing** | Quarterly | Validate DR procedures |
