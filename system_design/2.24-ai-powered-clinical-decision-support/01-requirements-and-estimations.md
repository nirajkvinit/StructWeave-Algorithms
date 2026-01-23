# Requirements & Capacity Estimations

## Functional Requirements

### Core Features (In Scope)

#### 1. Drug Interaction Detection

| Feature | Description | Priority |
|---------|-------------|----------|
| **Real-time DDI Check** | Check drug-drug interactions at medication order entry within 200ms | P0 |
| **Multi-drug Analysis** | Detect interactions across 3+ concurrent medications | P0 |
| **Drug-Condition Check** | Flag contraindications based on patient conditions (ICD-10) | P0 |
| **Drug-Allergy Check** | Cross-reference with documented allergies (SNOMED CT) | P0 |
| **Severity Classification** | Classify as Critical/High/Moderate/Low with evidence | P0 |
| **Patient-Context Adjustment** | Modify severity based on age, renal/hepatic function, pregnancy | P1 |
| **Alternative Suggestions** | Recommend safer alternatives when interaction detected | P1 |
| **Duplicate Therapy Detection** | Flag therapeutic duplications | P1 |

#### 2. Diagnosis Suggestion Engine

| Feature | Description | Priority |
|---------|-------------|----------|
| **Symptom-to-Diagnosis** | Suggest diagnoses based on presented symptoms | P0 |
| **Vital Signs Analysis** | Incorporate BP, HR, SpO2, temperature patterns | P0 |
| **Confidence Scoring** | Provide confidence percentage for each suggestion | P0 |
| **Differential Ranking** | Rank possible diagnoses by likelihood | P0 |
| **Rare Disease Flagging** | Alert for potential rare/orphan diseases | P1 |
| **Explainability** | Show contributing factors via SHAP/LIME | P0 |
| **Lab Result Integration** | Factor in available lab values | P1 |
| **Chief Complaint Mapping** | Map free-text complaints to structured symptoms | P2 |

#### 3. Clinical Guideline Recommendations

| Feature | Description | Priority |
|---------|-------------|----------|
| **Guideline Matching** | Match patient profile to applicable guidelines | P0 |
| **ADA Diabetes Standards** | Glycemic targets, medication algorithms | P0 |
| **WHO Protocols** | Global health treatment recommendations | P0 |
| **ICMR Guidelines** | India-specific treatment protocols | P1 |
| **ESC Cardiovascular** | Heart failure, arrhythmia management | P1 |
| **CQL Execution** | Execute Clinical Quality Language rules | P0 |
| **Gap Analysis** | Identify care gaps vs. guideline recommendations | P1 |
| **Preventive Care Reminders** | Screening, vaccination recommendations | P2 |

#### 4. Predictive Risk Scoring

| Feature | Description | Priority |
|---------|-------------|----------|
| **CV Risk (PREVENT)** | 10-year cardiovascular event risk | P0 |
| **CV Risk (QRISK3)** | UK/EU-validated CV risk score | P1 |
| **Diabetes Risk** | Pre-diabetes and T2DM risk prediction | P0 |
| **Hypertension Risk** | Blood pressure trajectory prediction | P1 |
| **CKD Progression** | Chronic kidney disease staging risk | P1 |
| **Readmission Risk** | 30-day hospital readmission probability | P2 |
| **Risk Trend Analysis** | Track risk score changes over time | P2 |

#### 5. Alert Management

| Feature | Description | Priority |
|---------|-------------|----------|
| **Override Workflow** | Capture clinical justification for overrides | P0 |
| **Alert Tiering** | Separate critical from informational alerts | P0 |
| **Fatigue Mitigation** | Suppress duplicate/low-value alerts | P0 |
| **Audit Trail** | Complete logging of alerts shown/acknowledged/overridden | P0 |
| **Feedback Loop** | Clinician feedback for model improvement | P1 |
| **Alert Analytics** | Override patterns, effectiveness metrics | P1 |

---

### Out of Scope

| Feature | Reason |
|---------|--------|
| **Autonomous Treatment Ordering** | Requires human-in-the-loop per regulatory requirements |
| **Direct Pharmacy Integration** | Handled by EHR; CDSS is advisory only |
| **Billing/Coding Assistance** | Separate system concern |
| **Patient-Facing Alerts** | Provider-focused system; PHR integration separate |
| **Radiology Image Analysis** | Specialized imaging CDSS required |
| **Genetic/Pharmacogenomic Analysis** | Future phase; requires separate certification |

---

## Non-Functional Requirements

### CAP Theorem Choice

**Choice: CP (Consistency + Partition Tolerance)**

| Rationale | Description |
|-----------|-------------|
| **Patient Safety** | Incorrect or stale interaction data could cause patient harm |
| **Regulatory Requirement** | FDA requires consistent, reproducible CDS behavior |
| **Audit Integrity** | Compliance requires exact record of what was shown when |
| **Override Accuracy** | Override decisions must reflect actual alert state |

**Availability Trade-off Mitigation:**
- Multi-region deployment with fast failover
- Graceful degradation to rule-based fallback
- Cached knowledge base for offline operation
- Circuit breakers to isolate failures

---

### Consistency Model

| Data Type | Consistency Model | Justification |
|-----------|-------------------|---------------|
| Drug Interaction Alerts | **Strong** | Patient safety; incorrect alert = potential harm |
| Diagnosis Suggestions | **Strong** | Clinical decision based on exact data state |
| Override Decisions | **Strong** | Audit and liability requirements |
| Risk Scores | **Eventual** (within 5 min) | Trending data; not real-time critical |
| Guideline Recommendations | **Strong** | Treatment decisions require accuracy |
| Analytics/Metrics | **Eventual** (within 1 hour) | Aggregate reporting; not time-sensitive |
| Model Updates | **Eventual** with versioning | Gradual rollout with validation |

---

### Availability Target

| Tier | Target | Downtime/Year | Justification |
|------|--------|---------------|---------------|
| **Drug Interaction Service** | 99.99% | 52 minutes | Patient safety critical |
| **Diagnosis Suggestion** | 99.95% | 4.4 hours | Important but not blocking |
| **Risk Scoring** | 99.9% | 8.7 hours | Advisory; can use cached scores |
| **Guideline Engine** | 99.9% | 8.7 hours | Advisory; can defer |
| **Overall Platform** | 99.99% | 52 minutes | Core DDI must remain available |

---

### Latency Targets

| Operation | p50 | p95 | p99 | Max | Context |
|-----------|-----|-----|-----|-----|---------|
| **DDI Check (single pair)** | 30ms | 80ms | 150ms | 500ms | Inline with prescribing |
| **DDI Check (full med list)** | 80ms | 150ms | 200ms | 800ms | Up to 20 medications |
| **Diagnosis Suggestion** | 500ms | 1.2s | 2s | 5s | ML inference + explanation |
| **Risk Score Calculation** | 100ms | 250ms | 400ms | 1s | Mathematical model |
| **Guideline Match** | 50ms | 120ms | 200ms | 500ms | CQL rule evaluation |
| **Alert Delivery** | 20ms | 50ms | 100ms | 200ms | After decision made |
| **Consent Verification** | 10ms | 25ms | 30ms | 100ms | Cached path |

---

### Durability Guarantees

| Data Type | Durability | Retention | Backup Strategy |
|-----------|------------|-----------|-----------------|
| **Alert Decisions** | 99.999999999% (11 9s) | 6 years (HIPAA) | Sync replication + daily snapshots |
| **Override Records** | 99.999999999% | 10 years | Immutable audit log + blockchain anchor |
| **Risk Score History** | 99.99999% (7 9s) | 3 years | Async replication + weekly backup |
| **Model Versions** | 99.99999% | Indefinite | Object storage with versioning |
| **Audit Logs** | 99.999999999% | Per jurisdiction | Write-ahead log + archival |

---

## Capacity Estimations

### Assumptions

| Parameter | Value | Source |
|-----------|-------|--------|
| Healthcare Organizations | 500 | Target customer base (hospitals + health systems) |
| Avg. Prescribers per Org | 200 | Mix of large hospitals and clinics |
| Prescriptions per Prescriber/Day | 50 | Industry average |
| Avg. Medications per Patient | 5 | Polypharmacy baseline |
| Diagnosis Queries per Encounter | 1.5 | Initial + follow-up |
| Encounters per Day (total) | 2M | Across all organizations |
| Risk Assessments per Patient/Year | 4 | Quarterly for chronic conditions |
| Peak-to-Average Ratio | 3x | Morning clinic hours spike |

---

### Traffic Estimations

| Metric | Calculation | Daily | QPS (Avg) | QPS (Peak) |
|--------|-------------|-------|-----------|------------|
| **Drug Interaction Checks** | 500 orgs × 200 prescribers × 50 Rx × 2 checks/Rx | 10M | 116 | 350 |
| **Multi-Drug Analysis** | 10M Rx × 0.3 (30% polypharmacy) | 3M | 35 | 105 |
| **Full Med List Scans** | 2M encounters × 1 scan | 2M | 23 | 70 |
| **Diagnosis Suggestions** | 2M encounters × 1.5 queries | 3M | 35 | 105 |
| **Risk Score Calculations** | 2M encounters × 0.25 (25% eligible) | 500K | 6 | 18 |
| **Guideline Matches** | 2M encounters × 0.5 (50% applicable) | 1M | 12 | 36 |
| **Alert Deliveries** | 10M × 0.15 (15% alert rate) | 1.5M | 17 | 51 |
| **Override Recordings** | 1.5M × 0.3 (30% override rate) | 450K | 5 | 15 |
| **Total API Calls** | Sum of above | ~21M | ~250 | ~750 |

**Including internal service calls:**
- Total QPS (external): ~250 avg, ~750 peak
- Total QPS (internal fan-out): ~1,500 avg, ~5,000 peak

---

### Storage Estimations

#### Knowledge Base Storage

| Component | Size Calculation | Total |
|-----------|------------------|-------|
| **Drug Database** | 14,000 drugs × 5KB avg metadata | 70 MB |
| **DDI Pairs** | 500K known interactions × 2KB | 1 GB |
| **Drug-Condition Matrix** | 14K drugs × 50K conditions × sparse | 500 MB |
| **Clinical Guidelines (CQL)** | 200 guidelines × 50KB | 10 MB |
| **Risk Model Artifacts** | 10 models × 500MB avg | 5 GB |
| **Diagnosis ML Models** | 5 models × 2GB avg | 10 GB |
| **SNOMED CT Terminology** | Full dataset | 2 GB |
| **RxNorm + ICD-10** | Combined | 500 MB |
| **Total Knowledge Base** | | ~20 GB |

#### Operational Storage (Per Year)

| Component | Size Calculation | Year 1 | Year 5 |
|-----------|------------------|--------|--------|
| **Alert Records** | 1.5M/day × 2KB × 365 | 1.1 TB | 5.5 TB |
| **Override Audit Logs** | 450K/day × 5KB × 365 | 820 GB | 4.1 TB |
| **Risk Score History** | 500K/day × 1KB × 365 | 180 GB | 900 GB |
| **Diagnosis Suggestions** | 3M/day × 3KB × 365 | 3.3 TB | 16.5 TB |
| **API Access Logs** | 21M/day × 500B × 365 | 3.8 TB | 19 TB |
| **Model Telemetry** | Aggregated metrics | 100 GB | 500 GB |
| **Total Operational** | | ~9.3 TB | ~46.5 TB |

---

### Bandwidth Estimations

| Traffic Type | Calculation | Bandwidth |
|--------------|-------------|-----------|
| **Inbound (CDS Hooks requests)** | 750 peak QPS × 5KB avg | 3.75 MB/s |
| **Outbound (Alert responses)** | 750 peak QPS × 3KB avg | 2.25 MB/s |
| **Knowledge Base Sync** | 20 GB / 500 regions × monthly | 40 MB/region/month |
| **Model Distribution** | 10 GB models × 500 regions × quarterly | 5 TB/quarter |
| **Inter-Service** | 5,000 internal QPS × 2KB | 10 MB/s |
| **Total Peak Bandwidth** | | ~20 MB/s per region |

---

### Cache Sizing

| Cache Layer | Content | Size Calculation | TTL |
|-------------|---------|------------------|-----|
| **L1 (In-Memory)** | Hot drug pairs (top 10K) | 10K × 2KB | 5 min |
| **L2 (Distributed)** | All DDI pairs | 500K × 2KB = 1GB | 1 hour |
| **Consent Cache** | Active patient consents | 100K × 1KB = 100MB | 5 min |
| **Session Cache** | Active prescriber sessions | 10K × 10KB = 100MB | 30 min |
| **Model Cache** | Loaded ML models | 10 GB | Until new version |
| **Guideline Cache** | Compiled CQL rules | 50 MB | 24 hours |
| **Total Cache Requirement** | | ~12 GB per region |

---

## SLOs and SLAs

### Service Level Objectives (SLOs)

| Metric | Target | Measurement | Burn Rate Alert |
|--------|--------|-------------|-----------------|
| **Availability** | 99.99% | Successful responses / Total requests | >1% error rate for 5 min |
| **DDI Latency (p99)** | < 200ms | Time from request to response | >200ms for 1 min |
| **Diagnosis Latency (p99)** | < 2s | ML inference + explanation time | >2s for 5 min |
| **Alert Delivery Success** | 99.95% | Alerts shown / Alerts generated | >0.1% failure for 10 min |
| **Override Capture** | 100% | Overrides recorded / Overrides performed | Any gap triggers alert |
| **Knowledge Base Freshness** | < 24 hours | Time since last sync | >24 hours triggers alert |
| **Model Accuracy (DDI)** | > 95% recall | Known interactions detected | <95% on daily sample |
| **Model Accuracy (Diagnosis)** | > 80% top-5 accuracy | Correct diagnosis in top 5 | <80% on weekly sample |

---

### Service Level Agreements (SLAs)

| Service Tier | Availability | Support Response | Penalty |
|--------------|--------------|------------------|---------|
| **Enterprise** | 99.99% | 15 min (critical) | 10% credit per 0.01% below |
| **Standard** | 99.9% | 1 hour (critical) | 5% credit per 0.1% below |
| **Regulatory Commitment** | Audit completeness 100% | N/A | Compliance escalation |

---

### Error Budget

| Period | Allowed Downtime (99.99%) | Error Budget |
|--------|---------------------------|--------------|
| Monthly | 4.3 minutes | 100% at month start |
| Quarterly | 13 minutes | Rolling calculation |
| Annual | 52 minutes | Tracked for SLA reporting |

**Error Budget Policy:**
- >50% consumed: Freeze non-critical changes
- >75% consumed: Freeze all changes except security
- >90% consumed: Incident review required for any deployment
- Budget exceeded: Post-mortem required, feature freeze

---

## Scalability Requirements

### Horizontal Scaling Triggers

| Component | Metric | Scale-Out Trigger | Scale-In Trigger |
|-----------|--------|-------------------|------------------|
| **API Gateway** | CPU utilization | >70% for 2 min | <30% for 10 min |
| **DDI Service** | Request latency p95 | >150ms for 2 min | <50ms for 10 min |
| **Diagnosis Service** | GPU utilization | >80% for 5 min | <40% for 15 min |
| **Risk Scoring** | Queue depth | >1000 pending | <100 pending |
| **Cache Cluster** | Memory utilization | >75% | <50% |

### Capacity Planning

| Year | Organizations | Daily Requests | Peak QPS | Required Nodes |
|------|---------------|----------------|----------|----------------|
| Year 1 | 500 | 21M | 750 | 20 |
| Year 2 | 1,000 | 42M | 1,500 | 40 |
| Year 3 | 2,000 | 84M | 3,000 | 80 |
| Year 5 | 5,000 | 210M | 7,500 | 200 |

---

## Compliance Requirements Summary

| Requirement | Specification | Validation |
|-------------|---------------|------------|
| **Audit Log Retention** | 6 years (HIPAA), 10 years (MDR) | Automated archival |
| **Breach Notification** | 72 hours (GDPR), 60 days (HIPAA) | Incident workflow |
| **Data Residency** | Per patient jurisdiction | Geographic routing |
| **Consent Verification** | Every data access | Inline check |
| **Model Traceability** | Full version history | Model registry |
| **Explainability** | All AI outputs | SHAP/LIME integration |
| **Override Documentation** | Clinical justification required | Structured capture |
| **PCCP Compliance** | Pre-approved change plans | Change management |
