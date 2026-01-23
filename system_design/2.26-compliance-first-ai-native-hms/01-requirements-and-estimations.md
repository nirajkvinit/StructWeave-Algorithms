# Requirements and Estimations

[Back to Index](./00-index.md)

---

## Functional Requirements

### Core HMS Functions (P0 - Must Have)

| Function | Description | Key Operations |
|----------|-------------|----------------|
| **Patient Registration** | EMPI-based patient identity management | Search, create, merge, link identities |
| **Bed Management** | Real-time bed occupancy and allocation | Query availability, assign, transfer, release |
| **ADT Processing** | Admission, Discharge, Transfer workflows | Initiate admission, process discharge, coordinate transfer |
| **OR Scheduling** | Operating theater scheduling and management | Schedule cases, allocate resources, track utilization |
| **Appointment Scheduling** | OPD clinic appointment management | Book, reschedule, cancel, waitlist |
| **Revenue Cycle** | Billing, charge capture, claims | Capture charges, generate claims, manage denials |

### Operational Functions (P1 - Should Have)

| Function | Description | Integration Points |
|----------|-------------|-------------------|
| **ED Management** | Emergency department patient tracking | Triage, bed assignment, disposition |
| **Housekeeping** | Room turnover and cleaning coordination | Bed release triggers, cleaning status |
| **Patient Transport** | Internal transport request management | Source/destination, equipment needs |
| **Dietary Management** | Patient meal orders and restrictions | Diet orders, meal delivery tracking |
| **Blood Bank** | Blood product inventory and requests | Cross-match requests, transfusion records |

### AI-Native Functions (P1/P2)

| Function | Description | Model Type | Priority |
|----------|-------------|------------|----------|
| **Bed Demand Prediction** | Forecast bed occupancy 24-72h ahead | XGBoost + Prophet ensemble | P1 |
| **OR Case Duration Prediction** | Estimate surgical case duration | Gradient Boosting (surgeon-specific) | P1 |
| **Length of Stay Prediction** | Predict patient LOS at admission | XGBoost/Random Forest | P1 |
| **AI-Assisted Medical Coding** | Suggest ICD-10, CPT, DRG codes | BioBERT + Rules engine | P1 |
| **Readmission Risk Scoring** | 30-day readmission prediction | Gradient Boosting | P2 |
| **Staff Scheduling Optimization** | Nurse shift optimization | Constraint programming + ML | P2 |

### Integration Functions (P0)

| Integration | Protocol | Direction | Messages/Day |
|-------------|----------|-----------|--------------|
| **EMR (2.23)** | FHIR R4, CDS Hooks | Bidirectional | 100,000 |
| **CDS (2.24)** | CDS Hooks | Inbound (alerts) | 20,000 |
| **Pharmacy (2.25)** | FHIR R4 | Bidirectional | 50,000 |
| **LIS (Laboratory)** | HL7v2 ORM/ORU | Bidirectional | 80,000 |
| **RIS (Radiology)** | HL7v2 ORM/ORU | Bidirectional | 30,000 |
| **PACS** | DICOM, FHIR ImagingStudy | Inbound | 10,000 |
| **Payers** | X12 837/835, FHIR Claim | Outbound | 5,000 |

---

## Out of Scope

The following functions are explicitly **NOT** part of the HMS and are handled by related systems:

| Function | Handled By | Integration |
|----------|------------|-------------|
| Clinical documentation (progress notes, H&P) | EMR (2.23) | FHIR Encounter, DocumentReference |
| Drug interaction checking | CDS (2.24) | CDS Hooks alerts |
| Medication dispensing | Pharmacy (2.25) | FHIR MedicationDispense |
| Laboratory test processing | LIS | HL7v2 ORU results |
| Medical image interpretation | PACS/RIS | FHIR DiagnosticReport |
| Clinical order entry | EMR (2.23) | FHIR ServiceRequest |

---

## Non-Functional Requirements

### CAP Theorem Choice: CP (Consistency + Partition Tolerance)

**Justification:**
- Bed assignments must be strongly consistent—cannot double-book beds
- Patient location tracking is safety-critical
- OR schedule conflicts could endanger patients
- Trade-off: Slightly higher latency during network partitions

### Consistency Model by Data Type

| Data Category | Model | Rationale | Technology |
|--------------|-------|-----------|------------|
| **Bed Assignments** | Strong | Cannot double-book beds | PostgreSQL with exclusion constraints |
| **Patient Location** | Strong | Safety-critical tracking | Redis + PostgreSQL sync write |
| **OR Schedule** | Strong | Resource conflicts are dangerous | Optimistic locking with retries |
| **EMPI Golden Record** | Strong | Identity must be authoritative | PostgreSQL with advisory locks |
| **ADT Events** | Strong (within saga) | Workflow integrity | Kafka with exactly-once semantics |
| **Audit Logs** | Eventual | Append-only, immutable | Kafka → TimescaleDB |
| **AI Predictions** | Eventual | Advisory, not authoritative | Redis cache with TTL |
| **Analytics/Reports** | Eventual | Batch processing acceptable | Data warehouse sync |

### Availability Targets

| Tier | Target | Downtime/Year | Components |
|------|--------|---------------|------------|
| **Tier 1** | 99.99% | 52 minutes | ADT processing, Bed management, ED tracking |
| **Tier 2** | 99.95% | 4.4 hours | OR scheduling, Billing, EMPI |
| **Tier 3** | 99.9% | 8.8 hours | AI predictions, Reports, Analytics |

### Latency Targets

| Operation | p50 | p95 | p99 | Notes |
|-----------|-----|-----|-----|-------|
| Bed availability query | 20ms | 50ms | 100ms | Redis-cached |
| Bed assignment (write) | 100ms | 200ms | 500ms | PostgreSQL + Redis |
| ADT event processing | 100ms | 200ms | 500ms | Saga step |
| EMPI patient lookup | 30ms | 80ms | 150ms | Cached matches |
| EMPI patient match (new) | 200ms | 500ms | 1s | Probabilistic matching |
| OR schedule update | 200ms | 500ms | 1s | Conflict check |
| AI bed prediction | 100ms | 300ms | 500ms | Pre-computed |
| AI coding suggestion | 500ms | 1s | 2s | Model inference |
| Charge capture | 50ms | 150ms | 300ms | Batch aggregation |
| Claim generation | 1s | 3s | 5s | Complex validation |

### Durability Guarantees

| Data Type | Durability | Backup Strategy |
|-----------|------------|-----------------|
| Patient records (EMPI) | 99.999999999% (11 nines) | Synchronous replication + daily backups |
| ADT events | 99.99999% (7 nines) | Kafka replication + archival |
| Financial data | 99.999999% (8 nines) | Synchronous replication + PITR |
| Audit logs | 99.999999999% (11 nines) | Immutable storage + cross-region |

---

## Capacity Estimations

### Scale Parameters (2000-bed Hospital Network)

| Metric | Value | Calculation/Notes |
|--------|-------|-------------------|
| **Total Beds** | 2,000 | Single large hospital or 5×400-bed network |
| **Annual Inpatient Admissions** | 50,000 | 2000 beds × 80% occupancy × 365 ÷ 5.8 ALOS |
| **Annual Outpatient Visits** | 1,000,000 | ~50 clinics × 80 patients/day × 250 days |
| **Annual ED Visits** | 150,000 | Level 1 trauma center estimate |
| **Daily OR Cases** | 60 | 20 ORs × 3 cases/OR/day |
| **Annual OR Cases** | 15,000 | 60 × 250 working days |
| **Registered Staff** | 8,000 | 4:1 staff-to-bed ratio |
| **Concurrent Users (Peak)** | 2,000 | 25% of staff during shift overlap |

### Transaction Volume Estimates

| Metric | Daily Volume | QPS (Avg) | QPS (Peak) | Peak Window |
|--------|--------------|-----------|------------|-------------|
| **ADT Events** | 500 | 0.006 | 5 | 7-9 AM, 3-5 PM |
| **Bed Queries** | 50,000 | 0.6 | 30 | Throughout day |
| **Bed Assignments** | 600 | 0.007 | 3 | Morning admissions |
| **EMPI Lookups** | 100,000 | 1.2 | 10 | Registration hours |
| **OR Schedule Updates** | 200 | 0.002 | 1 | Planning hours |
| **Charge Captures** | 200,000 | 2.3 | 20 | End of shift |
| **HL7/FHIR Messages** | 300,000 | 3.5 | 30 | Continuous |

### Storage Estimations

| Data Type | Size/Unit | Volume/Year | Storage/Year | Retention |
|-----------|-----------|-------------|--------------|-----------|
| **EMPI Records** | 10 KB | 100K new patients | 1 GB | Permanent |
| **EMPI Identifiers** | 500 B | 500K identifiers | 250 MB | Permanent |
| **ADT Events** | 5 KB | 10M events | 50 GB | 7 years |
| **Bed Assignments** | 2 KB | 5M assignments | 10 GB | 7 years |
| **OR Cases** | 10 KB | 15K cases | 150 MB | 7 years |
| **Appointments** | 2 KB | 1.2M appointments | 2.4 GB | 3 years |
| **Charges/Claims** | 20 KB | 2M claims | 40 GB | 10 years |
| **Audit Logs** | 1 KB | 500M entries | 500 GB | 6 years (HIPAA) |
| **AI Model Artifacts** | - | - | 200 GB | Rolling |
| **Analytics (Aggregated)** | - | - | 100 GB | 5 years |

**Total Storage (Year 1):** ~1 TB
**Total Storage (Year 5):** ~5 TB (excluding DICOM, which stays in PACS)

### Network Bandwidth

| Flow | Volume/Day | Bandwidth (Avg) | Bandwidth (Peak) |
|------|------------|-----------------|------------------|
| **HL7/FHIR Integration** | 300K msgs × 5KB | 1.5 GB | 10 Mbps |
| **Client API Traffic** | 500K requests × 10KB | 5 GB | 50 Mbps |
| **Database Replication** | Continuous | 20 Mbps | 100 Mbps |
| **AI Model Inference** | 100K predictions × 1KB | 100 MB | 5 Mbps |

---

## SLOs (Service Level Objectives)

### Availability SLOs

| Service | SLO | Error Budget/Month | Measurement |
|---------|-----|-------------------|-------------|
| ADT API | 99.99% | 4.3 minutes | Successful responses / Total requests |
| Bed Management API | 99.99% | 4.3 minutes | Successful responses / Total requests |
| EMPI API | 99.95% | 21.6 minutes | Successful responses / Total requests |
| OR Scheduling API | 99.95% | 21.6 minutes | Successful responses / Total requests |
| Revenue Cycle API | 99.9% | 43.2 minutes | Successful responses / Total requests |
| AI Prediction API | 99.9% | 43.2 minutes | Successful responses / Total requests |

### Latency SLOs

| Service | p50 SLO | p99 SLO | Measurement |
|---------|---------|---------|-------------|
| Bed Availability Query | < 30ms | < 100ms | Time from request to response |
| ADT Event Processing | < 150ms | < 500ms | Time from event to acknowledgment |
| EMPI Patient Match | < 100ms | < 500ms | Time for match result |
| OR Schedule Query | < 200ms | < 1s | Time from request to response |
| Claim Generation | < 2s | < 5s | Time from trigger to claim ready |

### Data Quality SLOs

| Metric | SLO | Measurement |
|--------|-----|-------------|
| EMPI Duplicate Rate | < 1% | Duplicates found / Total patients |
| EMPI False Merge Rate | < 0.01% | Incorrect merges / Total merges |
| Bed State Accuracy | 100% | Physical audit vs. system state |
| Charge Capture Rate | > 98% | Captured charges / Billable services |
| Claim First-Pass Rate | > 85% | Clean claims / Total claims |

### Compliance SLOs

| Requirement | SLO | Measurement |
|-------------|-----|-------------|
| Audit Log Completeness | 100% | PHI accesses logged / Total accesses |
| Access Log Retention | 6 years | Oldest available log date |
| Breach Detection Time | < 24 hours | Time from breach to detection |
| HIPAA Training | 100% | Staff trained / Total staff |

---

## SLA Tiers by Customer

| Tier | Availability | Support | RPO | RTO | Price Factor |
|------|--------------|---------|-----|-----|--------------|
| **Enterprise** | 99.99% | 24/7, 15-min response | 1 min | 15 min | 3x |
| **Professional** | 99.95% | 24/7, 1-hour response | 5 min | 1 hour | 2x |
| **Standard** | 99.9% | Business hours | 1 hour | 4 hours | 1x |

---

## Capacity Planning Formulas

### Bed Query QPS Calculation

```
Peak Users = 2,000 concurrent
Queries per User per Hour = 10 (nurses checking availability)
Peak QPS = (2,000 × 10) / 3,600 = 5.5 QPS average
Burst Factor = 5x (shift change)
Design for = 30 QPS peak
```

### EMPI Storage Calculation

```
Patients per Year = 100,000 new
Record Size = 10 KB (golden record + history)
Identifier Records = 5 per patient × 500 B = 2.5 KB
Link Records = 0.5 per patient × 1 KB = 0.5 KB
Total per Patient = 13 KB
Annual Growth = 100,000 × 13 KB = 1.3 GB/year
5-Year Storage = 6.5 GB (excluding indexes)
```

### ADT Event Throughput

```
Daily Admissions = 140 (50K/year ÷ 365)
Daily Discharges = 140
Daily Transfers = 200 (intra-hospital)
Daily ADT Events = 500
Peak Hour Factor = 10x (7-9 AM)
Peak ADT/Hour = 500 × 0.2 × 10 = 1,000/hour
Peak QPS = 1,000 / 3,600 = 0.3 QPS
Design for = 5 QPS (burst handling)
```

### OR Scheduling Compute

```
Daily Cases = 60
Scheduling Optimization Runs = 3/day (6 AM, 12 PM, 3 PM)
Optimization Time Budget = 5 minutes per run
Constraint Variables = 60 cases × 20 ORs × 50 surgeons
Design for = 60,000 constraint evaluations in 5 minutes
```

---

## Infrastructure Sizing

### Compute Requirements

| Service | Instances (Min) | Instance Type | CPU | Memory | Notes |
|---------|-----------------|---------------|-----|--------|-------|
| API Gateway | 3 | Medium | 4 vCPU | 8 GB | Stateless, auto-scale |
| EMPI Service | 3 | Large | 8 vCPU | 32 GB | Matching computation |
| Bed Management | 3 | Medium | 4 vCPU | 16 GB | Redis client |
| ADT Service | 3 | Medium | 4 vCPU | 16 GB | Saga orchestration |
| OR Scheduling | 2 | XLarge | 16 vCPU | 64 GB | Optimization compute |
| Revenue Cycle | 3 | Medium | 4 vCPU | 16 GB | Claims processing |
| AI Inference | 2 | GPU | 8 vCPU + GPU | 32 GB | Model serving |
| Integration Engine | 3 | Large | 8 vCPU | 32 GB | HL7 processing |

### Database Requirements

| Database | Type | Size | IOPS | Replicas |
|----------|------|------|------|----------|
| PostgreSQL (Primary) | Multi-AZ | 1 TB | 10,000 | 2 read replicas |
| Redis Cluster | 6-node | 50 GB | - | 3 primary + 3 replica |
| Kafka | 3-broker | 500 GB | - | Replication factor 3 |
| TimescaleDB | Single | 500 GB | 5,000 | 1 read replica |

---

## Cost Estimation (Monthly)

| Component | Quantity | Unit Cost | Monthly Cost |
|-----------|----------|-----------|--------------|
| Compute (API/Services) | 25 instances | $200/instance | $5,000 |
| PostgreSQL (Multi-AZ) | 1 TB, high IOPS | $2,000 | $2,000 |
| Redis Cluster | 50 GB | $500 | $500 |
| Kafka | 500 GB | $800 | $800 |
| GPU Inference | 2 instances | $1,500/instance | $3,000 |
| Storage (S3/Blob) | 2 TB | $50/TB | $100 |
| Network Egress | 500 GB | $0.09/GB | $45 |
| Monitoring/Logging | - | - | $500 |
| **Total** | | | **~$12,000/month** |

**Cost per Bed:** ~$6/bed/month at 2000-bed scale
