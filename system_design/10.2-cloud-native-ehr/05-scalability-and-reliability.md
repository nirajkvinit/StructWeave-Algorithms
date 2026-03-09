# Scalability & Reliability — Cloud-Native EHR Platform

## 1. Scaling Strategy

### 1.1 Scaling Dimensions

| Dimension | Approach | Trigger |
|---|---|---|
| **FHIR API throughput** | Horizontal scaling of stateless FHIR server pods | RPS exceeds 70% of pod capacity |
| **Patient volume** | Re-partitioning with consistent hashing; add partitions as patients grow | Partition size exceeds 2M patients |
| **Read query volume** | Add read replicas; expand cache tier for patient context | Read latency p99 exceeds SLO |
| **Document storage** | Tiered object storage with automated lifecycle (hot → warm → archive) | Hot storage exceeds 80% capacity |
| **Medical imaging** | Dedicated imaging storage cluster with independent scaling | Daily study volume exceeds ingest capacity |
| **Facility onboarding** | Logical tenant provisioning within shared infrastructure | New facility integration |

### 1.2 Partitioning Strategy

**Primary partitioning: Patient-based consistent hashing**

```
Partition Assignment:
  partition_id = HASH(patient_id) MOD num_partitions

Properties:
  - All FHIR resources for a patient co-located on same partition
  - Patient chart retrieval is single-partition (no cross-partition joins)
  - Partition count: start at 128, expand to 512, 2048 as needed
  - Virtual nodes allow adding capacity without full reshuffle

Partition Sizing Target:
  - Max 500K patients per partition
  - Max 2,000 FHIR writes/sec per partition
  - Max 200 GB FHIR resource data per partition

Cross-Patient Queries:
  - Population health queries use analytics projection (data warehouse)
  - Facility-level dashboards use pre-aggregated materialized views
  - Bulk FHIR $export reads from analytics replica, not primary
```

**Secondary indexes for cross-patient queries:**
- Practitioner → patients mapping (for provider-level dashboards)
- Facility → patients mapping (for facility-level reporting)
- Condition code → patients mapping (for disease registries)

### 1.3 Service-Level Scaling

| Service | Scaling Pattern | Min Instances | Auto-Scale Trigger |
|---|---|---|---|
| **FHIR API Gateway** | Horizontal, stateless | 6 (3 per AZ) | RPS > 80% capacity or CPU > 60% |
| **FHIR Server** | Horizontal, stateless | 8 minimum | FHIR request latency p99 > 2s |
| **Patient Service / MPI** | Horizontal with cache affinity | 4 minimum | Match request latency > 200ms |
| **Order Entry Service** | Horizontal, stateless | 4 minimum | Order queue depth > 500 |
| **CDS Engine** | Horizontal, stateless | 6 minimum | CDS response time p99 > 400ms |
| **Document Service** | Horizontal, stateless | 4 minimum | Document retrieval latency > 3s |
| **Imaging Gateway** | Horizontal with storage affinity | 4 minimum | DICOMweb request queue > 100 |
| **Audit Service** | Horizontal stream processors | 6 minimum | Audit event processing lag > 5s |

### 1.4 Data Tier Scaling

**Clinical Data Repository (Write Path):**
- Partitioned across multiple nodes with patient-affinity
- Each partition: leader + 2 replicas (quorum writes for clinical data)
- Write-ahead log with group commit for throughput
- Automatic compaction and FHIR resource version management

**Read Replicas (Query Path):**
- Multiple read replicas per region, asynchronously updated
- Specialized indexes per query pattern:
  - Patient chart view: indexed by patient_id (sub-second lookups)
  - Encounter view: indexed by patient_id + date (range scans)
  - Order view: indexed by patient_id + status (active orders)
  - Provider view: indexed by practitioner_id + date (daily schedule)

**Cache Tier:**
- Distributed cache for hot data:
  - Patient context (active problems, meds, allergies): TTL 30s, write-through
  - Terminology codes (SNOMED, LOINC, RxNorm): TTL 24h, event-invalidated on version update
  - CDS drug interaction results: TTL 1h, invalidated on knowledge base update
  - Practitioner directory: TTL 5 min

### 1.5 Tiered Storage Lifecycle

```
Data Lifecycle:

Hot Tier (0-2 years):
  - Storage: NVMe SSD
  - Content: Active FHIR resources, recent encounters, recent imaging
  - Access: Sub-second for FHIR resources, streaming for images
  - Full FHIR search indexes maintained
  - Replicated across 3 nodes (synchronous within region)

Warm Tier (2-5 years):
  - Storage: SSD
  - Content: Historical encounters, older imaging studies
  - Access: < 5 seconds for FHIR, < 30 seconds for imaging
  - Reduced indexes (patient_id + date range + resource type)
  - Replicated across 2 nodes (asynchronous)

Cold Tier (5-10 years):
  - Storage: Object storage (compressed, encrypted)
  - Content: Archived clinical data, aged-off imaging
  - Access: < 30 seconds for metadata, minutes for full retrieval
  - Metadata index only; full FHIR search not supported
  - Geo-redundant storage

Archive Tier (10+ years):
  - Storage: Archive-class object storage
  - Content: Legally required retention (pediatric records to age 21+)
  - Access: Hours for retrieval (acceptable for legal/compliance requests)
  - Retained per jurisdictional medical record retention laws
```

---

## 2. Reliability Engineering

### 2.1 Availability Architecture

**Target: 99.99% availability (52.6 minutes/year)**

For clinical systems, downtime directly impacts patient safety. The architecture eliminates single points of failure and designs for automated recovery.

```
Reliability Layers:

Layer 1 - Component Redundancy:
  Every service has N+1 redundancy minimum
  Active-active where possible (FHIR server, API gateway)
  Active-passive for stateful components (CDR leader)

Layer 2 - Zone Redundancy:
  Services distributed across 3 availability zones
  Any single zone failure: no patient-facing impact

Layer 3 - Regional Redundancy:
  Active-passive across 2 regions (same regulatory jurisdiction)
  Asynchronous replication for CDR (RPO < 1 minute)
  Synchronous replication for audit logs (RPO = 0)

Layer 4 - Clinical Downtime Procedures:
  Paper-based backup procedures for full system outage
  Downtime patient summaries pre-generated every 4 hours
  Reconciliation workflows for post-downtime data entry
```

### 2.2 Replication Strategy

| Data Type | Replication Mode | Replicas | RPO |
|---|---|---|---|
| **Clinical FHIR resources** | Synchronous within region | 3 local | < 1 second |
| **Patient identity (MPI)** | Synchronous within region | 3 local | < 1 second |
| **Audit trail** | Synchronous (WORM) | 3 (write-once storage) | 0 |
| **Medical imaging** | Asynchronous | 2 per region | < 5 minutes |
| **Analytics projections** | Asynchronous | All regions | < 15 minutes |
| **Terminology caches** | Asynchronous | All serving nodes | < 1 hour |

### 2.3 Circuit Breaker Configuration

| Service | Failure Threshold | Recovery | Fallback |
|---|---|---|---|
| **CDS Engine** | 5 failures in 10s | Half-open after 30s | Orders proceed without CDS alerts; log gap |
| **MPI Service** | 3 failures in 5s | Half-open after 15s | Facility-local MRN lookup |
| **Terminology Service** | 10 failures in 30s | Half-open after 60s | Use cached terminology (< 24h old) |
| **Imaging Gateway** | 3 failures in 10s | Half-open after 120s | Display "study available in PACS" link |
| **HIE Gateway** | 3 failures in 30s | Half-open after 300s | Queue outbound HIE messages for retry |
| **Patient Portal** | 5 failures in 15s | Half-open after 45s | Static maintenance page |

### 2.4 Graceful Degradation Modes

```
Mode 1: NORMAL
  All services operational, full CDS, imaging, HIE connectivity
  → Standard clinical operations

Mode 2: DEGRADED_CDS
  CDS services unavailable; clinical safety alerts not firing
  → Banner warning: "Decision support temporarily unavailable"
  → Clinicians use standard references for drug interactions
  → Auto-triggered when CDS circuit breaker opens

Mode 3: DEGRADED_IMAGING
  Imaging gateway unavailable; DICOM retrieval impaired
  → FHIR resources (reports, metadata) still available
  → Radiologists use direct PACS connection
  → Non-urgent imaging reads deferred

Mode 4: DEGRADED_HIE
  Health information exchange unavailable
  → Local clinical data fully available
  → External records not retrievable
  → Outbound HIE messages queued for later delivery

Mode 5: READ_ONLY
  Write path impaired; clinical data viewable but not editable
  → Patient charts readable from replicas
  → New orders and notes on paper backup
  → Critical: MUST display prominent "read-only" indicator

Mode 6: FULL_DOWNTIME
  System unavailable
  → Downtime procedures activated (paper-based)
  → Pre-printed downtime reports distributed
  → Recovery: reconciliation workflow for data entered during downtime
```

---

## 3. Disaster Recovery

### 3.1 DR Architecture

```
Primary Region (Active)              DR Region (Warm Standby)
┌─────────────────────┐             ┌─────────────────────┐
│                     │             │                     │
│  FHIR API + Gateway │             │  FHIR API + Gateway │
│  (serving traffic)  │             │  (pre-warmed, idle) │
│                     │             │                     │
│  CDR (leader)       │──async────►│  CDR (follower)     │
│                     │  RPO<1min  │                     │
│                     │             │                     │
│  Audit Log          │──sync─────►│  Audit Log          │
│  (primary)          │  RPO=0     │  (replica)          │
│                     │             │                     │
│  Imaging Store      │──async────►│  Imaging Store      │
│  (primary)          │  RPO<5min  │  (replica)          │
│                     │             │                     │
└─────────────────────┘             └─────────────────────┘
```

### 3.2 Recovery Objectives

| Scenario | RPO | RTO | Recovery Procedure |
|---|---|---|---|
| **Single node failure** | 0 | < 30s | Automatic failover within cluster |
| **Availability zone failure** | 0 | < 60s | Traffic rerouted to surviving zones |
| **Region failure** | < 1 min | < 5 min | DNS failover to DR region; follower promotion |
| **Data corruption (logical)** | Point-in-time | < 30 min | Restore from last known good backup + replay |
| **Ransomware / total loss** | < 1 hour | < 4 hours | Restore from immutable backups |

### 3.3 Failover Procedure

```
PROCEDURE RegionFailover():
    // Semi-automated, requires on-call approval for clinical systems

    1. DETECT primary region failure
       - Health check failure from 3+ independent monitors
       - Network-level monitoring confirmation
       - Pager alert to on-call SRE + clinical informatics

    2. APPROVE failover
       - On-call SRE verifies not a transient issue (5 min max wait)
       - For > 5 min outage: initiate failover
       - Clinical informatics notified of potential data gap (RPO)

    3. PROMOTE DR CDR followers to leaders
       - Verify replication lag < RPO threshold
       - Enable write acceptance on promoted leaders
       - Fence old primary from accepting writes

    4. ACTIVATE DR services
       - Scale up pre-warmed service pods
       - Verify terminology cache and MPI index are current
       - Verify imaging gateway connectivity

    5. UPDATE DNS
       - Switch traffic to DR region endpoints
       - Low TTL (60 seconds) pre-configured

    6. VALIDATE
       - Automated smoke tests (patient lookup, chart load, FHIR CRUD)
       - Verify audit trail continuity
       - Confirm MPI matching operational

    7. NOTIFY
       - Clinical staff: "System restored; review recent entries"
       - Compliance team: log DR activation event
       - Quality team: flag encounter data for RPO gap review

    Total target: < 5 minutes from detection to traffic serving
```

### 3.4 Clinical Data Reconciliation After Failover

```
Post-Failover Reconciliation:

1. Identify gap window:
   - Last confirmed replicated event in DR
   - First new event accepted in DR after promotion
   - Gap = any clinical data in primary not yet replicated

2. Recover gap data (when primary is restored):
   - Extract unreplicated events from primary
   - Validate for conflicts with DR-written data
   - Merge non-conflicting events automatically
   - Flag conflicting events for clinical review

3. Clinical review of conflicts:
   - Pharmacist reviews conflicting medication orders
   - Provider reviews conflicting clinical notes
   - Registration reviews conflicting patient demographics
   - All conflict resolutions audited

4. Regulatory documentation:
   - Document the gap window, affected patients, resolution
   - File as significant system event per institutional policy
```

---

## 4. Capacity Planning

### 4.1 Growth Projections

| Metric | Year 1 | Year 3 | Year 5 |
|---|---|---|---|
| **Active patients** | 50M | 100M | 200M |
| **Daily encounters** | 550K | 1.2M | 2.5M |
| **Peak FHIR API RPS** | 15K | 40K | 100K |
| **FHIR resource store** | 9 TB | 30 TB | 80 TB |
| **Daily imaging volume** | 7.5 TB | 15 TB | 30 TB |
| **Active SMART apps** | 200 | 800 | 2,000 |
| **FHIR Subscription subscribers** | 500 | 2,000 | 10,000 |
| **Facilities** | 50 | 200 | 500 |

### 4.2 Scaling Milestones

```
Phase 1 (0-50M patients):
  - 128 CDR partitions
  - 3 availability zones, 1 DR region
  - 30 FHIR server pods
  - Moderate compute + storage allocation

Phase 2 (50M-150M patients):
  - 512 partitions (4x rebalance)
  - Consider second active region for geographic coverage
  - 80 FHIR server pods
  - Dedicated imaging storage cluster
  - Estimated: 2-3x Phase 1

Phase 3 (150M-200M+ patients):
  - 2048 partitions
  - Multi-region active-active (if regulatory allows)
  - 200+ FHIR server pods
  - Federated MPI across organizations
  - Estimated: 2x Phase 2
```

### 4.3 Load Testing Strategy

```
Load Test Profiles:

Profile 1: Morning Surge
  - Simulate 8 AM shift change: rapid chart opens
  - Ramp to 200% of average in 15 minutes
  - Verify chart load p99 < 4 seconds
  - Verify no CDS timeout failures

Profile 2: Flu Season Peak
  - Simulate 300% of normal encounter volume
  - Sustained for 8 hours
  - Verify auto-scaling responds within 3 minutes
  - Verify no clinical data loss

Profile 3: Bulk FHIR Export
  - Export 10M patient resources while under normal clinical load
  - Verify bulk export does not degrade clinical FHIR API
  - Validate resource isolation between bulk and interactive

Profile 4: HIE Flood
  - Simulate 10x normal HIE query volume
  - Verify HIE Gateway does not saturate clinical services
  - Validate rate limiting and backpressure

Profile 5: Failover Under Load
  - Run at 100% clinical load
  - Kill primary CDR leader
  - Verify failover < 30 seconds
  - Verify zero clinical data loss for acknowledged writes
```

---

## 5. Backpressure and Flow Control

### 5.1 Backpressure Mechanisms

```
Layer 1: API Gateway
  - Per-client rate limiting (SMART app quotas)
  - Per-user rate limiting (prevent runaway automations)
  - Priority lanes: clinical operations > patient portal > bulk export
  - Request queuing with bounded queue (503 when full)

Layer 2: FHIR Server
  - Per-operation admission control
  - Heavy searches ($everything, complex _include) queued separately
  - Write operations always prioritized over analytics reads

Layer 3: Clinical Data Repository
  - Write-ahead log bounded buffer
  - If buffer > 80%: slow down FHIR writes (add 50ms delay)
  - If buffer > 95%: reject non-critical writes, return 503
  - Clinical safety writes (medication orders) never rejected

Layer 4: Event Processing
  - Consumer lag monitoring per subscriber
  - If lag > threshold: scale up event consumers
  - Priority: audit events > CDS events > analytics events > HIE notifications
```

### 5.2 Multi-Tenant Fairness

```
Per-Facility Resource Allocation:
  - Each facility gets guaranteed minimum FHIR API quota
  - Burst capacity shared across facilities
  - No single facility can consume > 25% of total capacity
  - Emergency department operations always prioritized

Example:
  Large hospital: guaranteed 5,000 RPS, burst to 10,000
  Medium hospital: guaranteed 2,000 RPS, burst to 5,000
  Small clinic: guaranteed 200 RPS, burst to 1,000
  Patient portal: guaranteed 3,000 RPS, burst to 8,000
  SMART apps (all): guaranteed 2,000 RPS, burst to 5,000
  Reserve: 3,000 RPS for burst absorption
  Total capacity: 25,000 RPS
```

---

*Next: [Security & Compliance ->](./06-security-and-compliance.md)*
