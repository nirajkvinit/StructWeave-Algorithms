# Requirements and Estimations

## Functional Requirements

### Core Clinical Functions

| Function | Description | Priority |
|----------|-------------|----------|
| **Patient Registration** | Demographics, identifiers, MPI matching | P0 |
| **Encounter Management** | Visits, admissions, transfers, discharges | P0 |
| **Clinical Documentation** | SOAP notes, assessments, progress notes | P0 |
| **Order Management** | Lab orders, imaging orders, referrals | P0 |
| **Results Management** | Lab results, radiology reports, pathology | P0 |
| **Medication Management** | Prescriptions, administration, reconciliation | P0 |
| **Allergy/Problem Lists** | Active conditions, allergies, adverse reactions | P0 |
| **Immunization Records** | Vaccine history, due dates, forecasting | P1 |
| **Care Plans** | Treatment plans, goals, interventions | P1 |
| **Clinical Messaging** | Secure messaging between care team | P1 |

### Consent Management Functions

| Function | Description | Priority |
|----------|-------------|----------|
| **Consent Capture** | Record patient consent decisions | P0 |
| **Granular Consent** | Purpose, data-type, recipient-based permissions | P0 |
| **Consent Enforcement** | Real-time access control based on consent | P0 |
| **Consent Revocation** | Immediate effect on future access | P0 |
| **Break-the-Glass** | Emergency access with mandatory review | P0 |
| **Consent History** | Full audit trail of consent changes | P0 |
| **Consent Delegation** | Caregiver/guardian consent management | P1 |

### AI-Native Functions

| Function | Description | Priority |
|----------|-------------|----------|
| **Ambient Clinical Intelligence** | Speech-to-text clinical documentation | P1 |
| **AI-Assisted Coding** | ICD-10, CPT, SNOMED-CT suggestions | P1 |
| **Drug Interaction Alerts** | Real-time DDI detection | P0 |
| **Clinical Guidelines** | Evidence-based recommendations | P1 |
| **Predictive Risk Scoring** | Readmission, deterioration prediction | P2 |
| **Clinical Summarization** | AI-generated patient summaries | P2 |

### Interoperability Functions

| Function | Description | Priority |
|----------|-------------|----------|
| **FHIR R4 API** | Full FHIR resource support | P0 |
| **SMART on FHIR Apps** | Third-party app integration | P1 |
| **HL7 v2 Integration** | Legacy system connectivity | P0 |
| **C-CDA Exchange** | Document-based interoperability | P1 |
| **DICOM Integration** | Medical imaging workflows | P1 |
| **National HIE Connectivity** | ABDM, NHS Spine, My Health Record | P1 |

---

## Out of Scope

| Function | Reason |
|----------|--------|
| Revenue Cycle Management | Separate billing system integration |
| Practice Management | Scheduling handled by specialty systems |
| Claims Processing | Insurance payer system responsibility |
| Pharmacy Dispensing | Pharmacy management system scope |
| Medical Device Integration | IoT platform integration layer |
| Telemedicine Video | Video platform integration only |

---

## Non-Functional Requirements

### CAP Theorem Choice

**CP (Consistency + Partition Tolerance)**

**Justification**: Clinical data requires strong consistency to prevent medical errors. A patient's allergy list, medication orders, and critical results must be consistent across all reads. Partition tolerance is essential for multi-region deployments. Availability is achieved through redundancy rather than relaxed consistency.

### Consistency Model

| Data Category | Consistency Model | Rationale |
|--------------|-------------------|-----------|
| Clinical Data (orders, results, meds) | Strong Consistency | Patient safety - incorrect data can cause harm |
| Consent Decisions | Strong Consistency | Access control must be immediately accurate |
| Audit Logs | Eventual Consistency | Append-only, order within partition matters |
| AI Suggestions | Eventual Consistency | Non-critical, advisory only |
| Analytics/Aggregations | Eventual Consistency | Batch processing acceptable |

### Availability Target

| Tier | Target | Downtime/Year | Use Case |
|------|--------|---------------|----------|
| Tier 1 (Critical Clinical) | 99.99% | 52 minutes | Orders, results, medications |
| Tier 2 (Standard Clinical) | 99.95% | 4.4 hours | Documentation, scheduling |
| Tier 3 (AI/Analytics) | 99.9% | 8.8 hours | AI features, reporting |

### Latency Targets

| Operation | p50 | p95 | p99 | Notes |
|-----------|-----|-----|-----|-------|
| Clinical Data Read | 50ms | 100ms | 200ms | FHIR resource retrieval |
| Clinical Data Write | 100ms | 250ms | 500ms | With consent verification |
| Consent Verification | 5ms | 15ms | 30ms | Cached path |
| FHIR Search | 100ms | 300ms | 500ms | Complex queries |
| AI Inference (CDS) | 50ms | 100ms | 200ms | Drug interactions |
| AI Inference (Coding) | 200ms | 500ms | 1000ms | Code suggestions |
| Ambient Documentation | Real-time | - | 2s lag | Speech-to-text |

### Durability Guarantees

| Data Type | Durability | Retention | Backup Frequency |
|-----------|------------|-----------|------------------|
| Clinical Data | 99.999999999% (11 nines) | Permanent | Continuous |
| Audit Logs | 99.999999999% (11 nines) | 6-8 years (jurisdiction) | Continuous |
| Consent Records | 99.999999999% (11 nines) | 10 years post-relationship | Continuous |
| DICOM Images | 99.999999999% (11 nines) | 7-10 years | Daily |
| AI Model Artifacts | 99.99% | 3 years | Weekly |

---

## Capacity Estimations

### User Scale

| Metric | Value | Calculation |
|--------|-------|-------------|
| Total Patients | 10M | Target enterprise scale |
| Active Patients (monthly) | 2M | 20% monthly activity rate |
| Healthcare Providers | 50K | Physicians, nurses, staff |
| Concurrent Users (peak) | 25K | 50% of providers during day shift |
| Healthcare Organizations | 500 | Multi-tenant SaaS |

### Transaction Volume

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Daily Encounters | 500K | 2M active patients × 25% monthly visit × 1/30 days |
| Clinical Documents/Day | 2M | 4 documents per encounter average |
| Lab Results/Day | 1M | 2 results per encounter average |
| Medication Orders/Day | 800K | 1.6 per encounter |
| FHIR API Calls/Day | 50M | 100 calls per encounter average |

### QPS Calculations

| Metric | Calculation | Result |
|--------|-------------|--------|
| Average Read QPS | 50M reads/day ÷ 86400 sec | ~580 QPS |
| Peak Read QPS (3x) | 580 × 3 | ~1,740 QPS |
| Average Write QPS | 5M writes/day ÷ 86400 sec | ~58 QPS |
| Peak Write QPS (5x) | 58 × 5 | ~290 QPS |
| Consent Verification QPS | Equal to read QPS | ~1,740 QPS (peak) |

### Storage Estimations

| Data Type | Size/Unit | Volume/Year | Storage/Year |
|-----------|-----------|-------------|--------------|
| FHIR Resources | 10KB avg | 730M resources | 7.3 TB |
| Clinical Documents | 50KB avg | 730M documents | 36.5 TB |
| Audit Logs | 1KB avg | 18B entries | 18 TB |
| DICOM Images | 100MB avg | 50M studies | 5 PB |
| AI Model Cache | - | - | 500 GB |

| Timeframe | Clinical Data | Audit Logs | DICOM | Total |
|-----------|--------------|------------|-------|-------|
| Year 1 | 50 TB | 18 TB | 5 PB | ~5.1 PB |
| Year 3 | 150 TB | 54 TB | 15 PB | ~15.2 PB |
| Year 5 | 250 TB | 90 TB | 25 PB | ~25.4 PB |

### Bandwidth Estimations

| Flow | Calculation | Bandwidth |
|------|-------------|-----------|
| API Ingress (peak) | 290 writes/s × 50KB | 14.5 MB/s |
| API Egress (peak) | 1740 reads/s × 10KB | 17.4 MB/s |
| DICOM Ingress | 50M studies/year × 100MB ÷ 31.5M sec | 159 MB/s |
| Inter-region Replication | 10% of writes | 1.5 MB/s |
| **Total Peak** | - | ~200 MB/s |

### Cache Sizing

| Cache Layer | Purpose | Size | Hit Rate Target |
|-------------|---------|------|-----------------|
| Consent Cache | Active patient consents | 50 GB | 95% |
| Session Cache | User sessions, tokens | 10 GB | 99% |
| FHIR Resource Cache | Frequently accessed resources | 200 GB | 80% |
| Search Result Cache | Common query patterns | 50 GB | 70% |
| AI Model Cache | Loaded model weights | 500 GB | 100% |

---

## SLOs and SLAs

### Service Level Objectives

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| Availability (Tier 1) | 99.99% | Monthly |
| Availability (Tier 2) | 99.95% | Monthly |
| Read Latency p99 | < 200ms | 5-minute rolling |
| Write Latency p99 | < 500ms | 5-minute rolling |
| Consent Verification p99 | < 30ms | 5-minute rolling |
| Error Rate (5xx) | < 0.1% | Hourly |
| Data Durability | 99.999999999% | Annual |
| Backup Recovery (RPO) | < 1 minute | Per incident |
| Failover Time (RTO) | < 15 minutes | Per incident |

### Compliance SLOs

| Metric | Target | Requirement Source |
|--------|--------|-------------------|
| Audit Log Completeness | 100% | HIPAA §164.312(b) |
| Consent Enforcement Accuracy | 100% | GDPR Article 7 |
| Breach Detection Time | < 24 hours | HIPAA §164.404 |
| Breach Notification (GDPR) | < 72 hours | GDPR Article 33 |
| Breach Notification (HIPAA) | < 60 days | HIPAA §164.404 |
| Data Subject Access Response | < 30 days | GDPR Article 12 |
| Break-the-Glass Review | < 48 hours | Best practice |

### AI-Specific SLOs

| Metric | Target | Notes |
|--------|--------|-------|
| Drug Interaction Detection Recall | > 95% | Critical safety feature |
| Drug Interaction Precision | > 90% | Minimize alert fatigue |
| Coding Suggestion Accuracy | > 85% | Human verification required |
| Ambient Documentation WER | < 10% | Word Error Rate |
| AI Feature Availability | 99.9% | Graceful degradation to manual |

---

## Regional Requirements Summary

| Region | Framework | Data Residency | Audit Retention | Breach Notification |
|--------|-----------|----------------|-----------------|---------------------|
| USA | HIPAA/HITECH | No mandate | 6 years | 60 days |
| EU | GDPR | Within EU | Per purpose | 72 hours |
| UK | UK GDPR + NHS | Within UK | 8 years | 72 hours |
| India | DPDP + ABDM | Within India | 3 years | 72 hours |
| Australia | Privacy Act + My Health Record | Preferred AU | 7 years | 30 days |
| Brazil | LGPD | Within Brazil | 5 years | 72 hours |

---

## Assumptions

1. **Network**: Inter-region latency < 100ms, intra-region < 10ms
2. **Storage**: Object storage for DICOM, relational for clinical data
3. **Compute**: GPU availability for AI inference in all regions
4. **Identity**: Federated identity with existing hospital IAM systems
5. **Existing Systems**: HL7v2 interfaces for legacy system integration
6. **Patient Population**: Primarily adult outpatient with 20% inpatient
7. **AI Models**: Pre-trained models fine-tuned on de-identified data
