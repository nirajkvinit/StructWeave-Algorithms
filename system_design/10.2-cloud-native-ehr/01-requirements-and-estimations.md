# Requirements & Estimations — Cloud-Native EHR Platform

## 1. Functional Requirements

### 1.1 Patient Identity Management

| Capability | Description |
|---|---|
| **Patient Registration** | Digital patient intake with demographics, insurance verification, consent capture |
| **Master Patient Index** | Probabilistic + referential patient matching across facilities and health systems |
| **Patient Linking** | Merge duplicate records, link related patients (family, guarantor) |
| **Patient Search** | Multi-parameter search (name, DOB, MRN, SSN-last4, phone, address) |
| **Identity Verification** | Photo ID matching, biometric options, knowledge-based verification |
| **Record Portability** | Patient-directed data sharing via FHIR APIs (ONC Cures Act compliance) |

**Key Operations:**
- Create, update, merge, unmerge patient records
- Cross-reference identifiers across facilities (MRN, enterprise ID, national ID)
- Manage patient demographic corrections with audit trail
- Generate and validate Medical Record Numbers per facility

### 1.2 Clinical Documentation

| Capability | Description |
|---|---|
| **Encounter Management** | Create, update, close encounters (ambulatory, inpatient, emergency, telehealth) |
| **Progress Notes** | Structured and free-text clinical notes with templates per specialty |
| **Problem List** | Active/resolved conditions using SNOMED CT or ICD-10-CM coding |
| **Vital Signs** | Structured observations (BP, HR, temp, SpO2, BMI) mapped to LOINC codes |
| **History of Present Illness** | Structured HPI capture with symptom onset, severity, associated factors |
| **Procedure Documentation** | Operative notes, procedure reports with CPT/HCPCS coding |

**Critical Guarantees:**
- Every clinical document captures authoring provider, timestamp, and attestation status
- Document versioning preserves all prior versions with amendment tracking
- Late entries and addenda are timestamped separately from original documentation
- Digital signatures for legally binding clinical documents

### 1.3 Computerized Provider Order Entry (CPOE)

| Capability | Description |
|---|---|
| **Medication Orders** | Prescribe, modify, discontinue medications with dosage, route, frequency |
| **Laboratory Orders** | Order panels and individual tests with clinical indication |
| **Radiology Orders** | Imaging study requests with clinical history and indication |
| **Referral Orders** | Specialist referrals with clinical summary and relevant records |
| **Order Sets** | Pre-built order bundles per diagnosis/procedure with evidence-based defaults |
| **Order Verification** | Pharmacist review, nursing verification, cosignature workflows |

**Clinical Safety Requirements:**
- Drug-drug interaction checking at order entry (synchronous, < 500ms)
- Drug-allergy cross-referencing with severity-graded alerts
- Duplicate order detection within configurable time windows
- Dose range checking with weight-based calculations for pediatrics
- Clinical decision support alerts integrated via CDS Hooks

### 1.4 Results Management

| Capability | Description |
|---|---|
| **Lab Results** | Structured results with reference ranges, abnormal flags, critical value alerts |
| **Radiology Reports** | Dictated reports with structured findings, impression, follow-up recommendations |
| **Pathology Reports** | Structured synoptic reports with CAP protocol compliance |
| **Result Routing** | Auto-routing to ordering provider, care team, patient portal |
| **Critical Results** | Escalation workflow for critical/panic values with acknowledgment tracking |
| **Trending** | Time-series visualization of serial results (labs, vitals) |

### 1.5 Medication Management

| Capability | Description |
|---|---|
| **Medication Reconciliation** | Compare/reconcile medication lists across care transitions |
| **eRx (Electronic Prescribing)** | NCPDP SCRIPT standard integration with pharmacies |
| **Formulary Checking** | Real-time insurance formulary verification with alternatives |
| **Medication Administration** | Barcode-verified MAR (Medication Administration Record) |
| **Controlled Substances** | EPCS (Electronic Prescribing for Controlled Substances) with PDMP check |
| **Medication History** | Import from pharmacy benefit managers, Surescripts network |

### 1.6 Health Information Exchange

| Capability | Description |
|---|---|
| **TEFCA Participation** | Query-based and document-based exchange via TEFCA framework |
| **FHIR API Exchange** | Patient Access API, Provider Directory API, Payer-to-Payer exchange |
| **Direct Messaging** | Secure clinical messaging via Direct protocol (phased out for FHIR) |
| **C-CDA Generation** | Generate/consume Consolidated CDA documents for transitions of care |
| **ADT Notifications** | Real-time admission/discharge/transfer notifications to care teams |
| **Public Health Reporting** | Electronic case reporting (eCR), immunization registry, syndromic surveillance |

### 1.7 Clinical Decision Support

| Capability | Description |
|---|---|
| **CDS Hooks Integration** | External CDS services at order-select, patient-view, encounter-start hooks |
| **Drug Interaction Alerts** | Multi-level severity alerts with override documentation |
| **Care Gap Identification** | Preventive care reminders (screenings, immunizations, chronic disease management) |
| **Sepsis Screening** | Real-time sepsis risk scoring from vital signs + lab trends |
| **Clinical Pathways** | Evidence-based order sets and care plans per diagnosis |
| **Best Practice Alerts** | Configurable rules engine for institutional clinical policies |

### 1.8 Patient Engagement

| Capability | Description |
|---|---|
| **Patient Portal** | View records, request appointments, send messages, pay bills |
| **FHIR Patient Access API** | ONC Cures Act compliant data sharing with patient-authorized apps |
| **Secure Messaging** | Bidirectional messaging between patients and care teams |
| **Appointment Scheduling** | Self-scheduling with provider availability, insurance verification |
| **Consent Management** | Granular consent directives for data sharing, research participation |
| **Remote Monitoring** | Integration with patient devices (glucometers, BP cuffs, wearables) |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| Metric | Target | Rationale |
|---|---|---|
| **Patient chart load (p50)** | < 1.5s | Clinicians cannot wait for chart data during patient encounters |
| **Patient chart load (p99)** | < 4s | Even worst-case must be usable during high-acuity situations |
| **FHIR API response (p95)** | < 500ms | Third-party apps depend on responsive API performance |
| **Order entry round-trip** | < 2s | CPOE must feel responsive to maintain clinician adoption |
| **CDS alert response** | < 500ms | Alerts must appear before the provider clicks "sign order" |
| **Patient search** | < 500ms | Registration staff handle high patient volumes at check-in |
| **Bulk FHIR export** | 1M resources/hour | Population health and research require timely data extraction |

### 2.2 Availability and Reliability

| Metric | Target | Rationale |
|---|---|---|
| **Availability** | 99.99% | Clinical systems are patient-safety critical; 52.6 min/year max |
| **RPO** | < 1 minute | Recent clinical data loss could impact patient safety |
| **RTO** | < 5 minutes | Clinicians need systems restored quickly; paper downtime is unsafe |
| **Error Rate** | < 0.01% | Clinical data errors directly impact patient safety |
| **Data Integrity** | 100% | No silent data corruption; every write acknowledged or failed |

### 2.3 Interoperability

| Requirement | Description |
|---|---|
| **FHIR Conformance** | Full FHIR R4 compliance, US Core Implementation Guide support |
| **USCDI Support** | United States Core Data for Interoperability v3+ data elements |
| **SMART on FHIR** | Launch framework for third-party clinical apps within EHR |
| **CDS Hooks** | Standard hooks for clinical decision support integration |
| **Bulk FHIR** | Async export for population health, quality measurement, research |
| **TEFCA Connectivity** | Query and document exchange via Qualified Health Information Networks |

### 2.4 Scalability

| Dimension | Requirement |
|---|---|
| **Horizontal Scaling** | FHIR server and clinical services auto-scale independently |
| **Data Partitioning** | Patient-based partitioning with facility-aware routing |
| **Multi-Region** | Active-passive with regional data residency for patient data |
| **Storage Growth** | Linear storage scaling; 7+ years of clinical data online |
| **Tenant Isolation** | Per-facility data isolation with configurable sharing policies |

### 2.5 Security

| Requirement | Standard |
|---|---|
| **Encryption at Rest** | AES-256 for all PHI including backups |
| **Encryption in Transit** | TLS 1.3 for external, mTLS for internal service communication |
| **Authentication** | SMART on FHIR OAuth 2.0, SAML for enterprise SSO |
| **Authorization** | Role-based access control with clinical context (care team membership) |
| **PHI Audit** | Every PHI access logged with who, what, when, why, from-where |
| **Data Masking** | PHI de-identification in non-production environments (Safe Harbor / Expert Determination) |

---

## 3. Capacity Estimations

### 3.1 Patient Volume

```
Assumptions:
- 50 million active patients (large integrated health system)
- Average 4 encounters per patient per year
- 20% of patients active in any given month

Monthly active patients = 50M * 0.20 = 10M patients/month
Daily encounters = (50M * 4) / 365 = ~548,000 encounters/day
Peak encounter multiplier: 1.5x (Monday mornings, flu season)
Peak daily encounters = ~822,000/day
```

### 3.2 Clinical Document Volume

```
Documents per encounter:
- Progress note: 1 per encounter
- Orders (avg): 3 per encounter (labs, meds, imaging)
- Results: 2 per encounter
- Vitals observations: 4-8 per encounter (multiple vital signs)
- Assessment/diagnosis: 1-3 per encounter

Average FHIR resources created per encounter: ~15
Daily FHIR resources = 548,000 * 15 = ~8.2M resources/day
Peak: ~12.3M resources/day

Document sizes (average):
- Clinical note: 5-15 KB
- Lab result bundle: 2-5 KB
- Medication order: 1-3 KB
- Vital signs observation: 0.5-1 KB
- CDA document: 50-200 KB
```

### 3.3 FHIR API Traffic

```
API consumers:
- Clinical applications (EHR clients): 500,000 active users
- Patient portal: 5M active users
- Third-party SMART apps: 200 registered apps
- HIE/TEFCA queries: 100,000/day
- Public health reporting: 50,000/day

Average API calls per clinician session (8h shift): 2,000
Active concurrent clinicians at peak: 200,000
Peak FHIR API calls: 200,000 * (2,000/28,800) = ~14,000 RPS
Design target: 25,000 FHIR API RPS (headroom for growth + burst)

Breakdown by operation:
- Read (GET): 70% = 17,500 RPS
- Search: 20% = 5,000 RPS
- Write (POST/PUT): 8% = 2,000 RPS
- Delete: < 1% (soft deletes only)
- Operations ($everything, $match): 2% = 500 RPS
```

### 3.4 Storage Estimation

```
FHIR resource storage:
- Average resource size: 3 KB (JSON)
- Daily new resources: 8.2M
- Daily storage: 8.2M * 3 KB = ~24.6 GB/day
- Monthly: ~738 GB
- Yearly: ~9 TB
- 7-year retention: ~63 TB

Clinical document storage (C-CDA, PDFs, scanned docs):
- Average document: 100 KB
- Daily documents: 200,000
- Daily: 20 GB/day
- Yearly: ~7.3 TB
- 7-year: ~51 TB

Medical imaging (DICOM):
- Average study size: 200 MB (CT), 50 MB (X-ray), 500 MB (MRI)
- Daily studies: 50,000
- Average study: 150 MB
- Daily: 7.5 TB/day
- Yearly: ~2.7 PB
- 7-year: ~19 PB (tiered storage essential)

Audit log storage:
- Average audit entry: 500 bytes
- Daily entries: 500M (every PHI access logged)
- Daily: 250 GB/day
- Yearly: ~91 TB
- 7-year: ~637 TB

Total 7-year storage estimate:
- FHIR resources: ~63 TB
- Clinical documents: ~51 TB
- Medical imaging: ~19 PB
- Audit logs: ~637 TB
- Indexes/metadata (30%): ~225 TB
Total: ~20 PB (dominated by medical imaging)
```

### 3.5 Patient Matching Volume

```
Patient matching operations:
- New patient registrations: 50,000/day
- Cross-facility lookups: 200,000/day
- HIE identity queries: 100,000/day
- Total matching operations: 350,000/day

Matching complexity:
- Active patient index: 50M records
- Average comparison per match: 500-2,000 candidate pairs
- Match algorithm latency target: < 200ms per operation
- Matching throughput: ~4 operations/second sustained, 20/sec peak
```

---

## 4. Service Level Objectives (SLOs)

### 4.1 Tiered SLO Framework

| Tier | Service | Availability | Latency (p99) | Error Budget |
|---|---|---|---|---|
| **Tier 0** | Patient chart retrieval, order entry | 99.99% | 4s | 52.6 min/year |
| **Tier 0** | Medication safety checks (drug interactions) | 99.99% | 500ms | 52.6 min/year |
| **Tier 1** | FHIR API (read operations) | 99.95% | 1s | 4.38 hrs/year |
| **Tier 1** | Patient search, registration | 99.95% | 500ms | 4.38 hrs/year |
| **Tier 2** | Clinical decision support alerts | 99.9% | 2s | 8.76 hrs/year |
| **Tier 2** | Health information exchange, Bulk FHIR | 99.9% | N/A (async) | 8.76 hrs/year |
| **Tier 3** | Patient portal, analytics dashboards | 99.5% | 3s | 43.8 hrs/year |
| **Tier 3** | Report generation, quality measures | 99.5% | N/A (batch) | 43.8 hrs/year |

### 4.2 Data Integrity SLOs

| Metric | Target |
|---|---|
| **Clinical data accuracy** | 100% (zero tolerance for silent data corruption) |
| **PHI audit completeness** | 100% of PHI access events captured with < 5s lag |
| **Patient matching precision** | > 99% (false positive rate < 1%) |
| **Patient matching recall** | > 95% (miss rate < 5%) |
| **Interoperability conformance** | 100% FHIR R4 validation pass rate for outbound resources |

### 4.3 Compliance SLOs

| Commitment | Target | Consequence |
|---|---|---|
| **PHI breach detection** | < 24 hours from occurrence | HIPAA breach notification triggered |
| **Audit log availability** | Retrievable within 1 hour | Regulatory response capability |
| **Access review completion** | 100% within 90 days of role change | HIPAA workforce security |
| **Patch deployment (critical)** | < 48 hours from vulnerability disclosure | Security management process |
| **Backup verification** | Weekly automated restore test | Contingency plan testing |

---

## 5. Constraint Analysis

### 5.1 Regulatory Constraints

| Constraint | Impact |
|---|---|
| **HIPAA Security Rule** | All PHI must be encrypted, access-controlled, and audited |
| **HIPAA Privacy Rule** | Minimum necessary standard for PHI disclosure |
| **HITECH Act** | Meaningful Use / Promoting Interoperability program requirements |
| **ONC Cures Act** | Information blocking prohibition; must provide patient access APIs |
| **21st Century Cures Act** | USCDI data set must be available via FHIR APIs |
| **State Privacy Laws** | Varying requirements (42 CFR Part 2 for substance abuse, state mental health protections) |
| **Data Retention** | Medical records: 7-10 years (adults), until age 21 (minors) by jurisdiction |

### 5.2 Technical Constraints

| Constraint | Impact |
|---|---|
| **FHIR Specification Limits** | FHIR Bundle size limits, search parameter limitations, operation definitions |
| **Legacy HL7v2 Integration** | Must maintain HL7v2 ADT/ORM/ORU interfaces for legacy systems |
| **DICOM Standards** | Medical imaging must comply with DICOM Part 18 (DICOMweb) |
| **Terminology Services** | Must support SNOMED CT, ICD-10, LOINC, RxNorm, CPT code systems |
| **Certificate Management** | SMART on FHIR requires PKI infrastructure for app registration |
| **Network Connectivity** | Clinical environments may have intermittent connectivity (ambulances, rural clinics) |

---

*Next: [High-Level Design ->](./02-high-level-design.md)*
