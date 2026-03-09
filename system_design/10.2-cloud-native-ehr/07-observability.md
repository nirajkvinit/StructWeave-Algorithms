# Observability — Cloud-Native EHR Platform

## 1. Observability Strategy

EHR observability serves three masters: **clinical operations** (keep the system responsive for patient care), **regulatory compliance** (prove every PHI access was authorized), and **data quality** (ensure clinical data is complete and correct). Every metric, log, and trace must be designed with all three purposes in mind.

### 1.1 Observability Pillars

| Pillar | Purpose | Retention | Access Control |
|---|---|---|---|
| **Metrics** | Real-time system health, capacity planning, SLO tracking | 2 years (aggregated: 5 years) | Operations + engineering |
| **Logs** | Event-level debugging, security forensics | 90 days hot, 7 years archived | Tiered access by sensitivity |
| **Traces** | Request-level latency analysis, dependency mapping | 30 days (sampled), full for flagged requests | Engineering |
| **PHI Audit Trail** | Regulatory proof of every PHI access and modification | 7-10 years (immutable, WORM) | Compliance + regulators (read-only) |
| **Clinical Data Quality** | Completeness, coding accuracy, documentation compliance | 5 years | Quality + clinical informatics |

---

## 2. Metrics

### 2.1 Golden Signals by Service

| Service | Latency | Traffic | Errors | Saturation |
|---|---|---|---|---|
| **FHIR Server** | Read/write/search latency p50/p95/p99 | RPS by operation type (GET/POST/search) | 4xx/5xx by resource type | Connection pool utilization, query queue depth |
| **Patient Service / MPI** | Match latency p50/p99 | Matches/min, registrations/min | Match failures, duplicate detections | MPI index size, candidate set size |
| **Order Entry** | Order round-trip p50/p99 | Orders/min by type (med, lab, rad) | Order validation failures | CDS timeout rate, order queue depth |
| **CDS Engine** | Hook response time p50/p99 | Hooks invoked/min by type | CDS errors, circuit breaker trips | Rule evaluation count, knowledge base freshness |
| **Imaging Gateway** | DICOMweb response time p50/p99 | Studies retrieved/min, bytes served | DICOM fetch failures | Storage I/O utilization, network bandwidth |
| **Audit Service** | Audit write latency p50/p99 | Audit events/sec | Audit write failures, buffer overflow | Audit queue depth, storage utilization |

### 2.2 Clinical Operations Metrics

```
Patient Care Metrics:
  ehr.encounters.active                    {facility, type}
  ehr.encounters.started                   {facility, type}      [counter]
  ehr.encounters.discharged                {facility, disposition} [counter]
  ehr.chart_load.latency                   {facility}            [histogram]
  ehr.chart_load.cache_hit_rate            {facility}

Order Metrics:
  ehr.orders.placed                        {type, facility, status}  [counter]
  ehr.orders.cds_alerts_fired              {alert_type, severity}    [counter]
  ehr.orders.cds_override_rate             {alert_type}
  ehr.orders.turnaround_time               {type}                   [histogram]
  ehr.orders.medication.interactions_found  {severity}               [counter]

Results Metrics:
  ehr.results.received                     {type, facility}         [counter]
  ehr.results.critical_values              {type, facility}         [counter]
  ehr.results.acknowledgment_time          {type}                   [histogram]
  ehr.results.auto_filed                   {type}                   [counter]

MPI Metrics:
  ehr.mpi.matches.total                    {result: certain|probable|possible|none}
  ehr.mpi.matches.auto_linked              {facility}               [counter]
  ehr.mpi.matches.manual_review_queued     {facility}               [counter]
  ehr.mpi.duplicates.detected              {facility}               [counter]
  ehr.mpi.match_latency                    {facility}               [histogram]

Interoperability Metrics:
  ehr.hie.queries_received                 {source}                 [counter]
  ehr.hie.queries_responded                {source, result}         [counter]
  ehr.hie.documents_exchanged              {direction, format}      [counter]
  ehr.hie.tefca_exchange_volume            {qhin}                   [counter]
```

### 2.3 Compliance Metrics

```
PHI Access Metrics:
  ehr.phi.access_events                    {purpose, role}          [counter]
  ehr.phi.break_the_glass_events           {facility}               [counter]
  ehr.phi.consent_denials                  {data_category}          [counter]
  ehr.phi.anomalous_access_alerts          {alert_type}             [counter]

Audit Metrics:
  ehr.audit.events_written                 {event_type}             [counter]
  ehr.audit.write_latency                  {}                       [histogram]
  ehr.audit.buffer_depth                   {}                       [gauge]
  ehr.audit.events_dropped                 {}                       [counter]  // MUST be 0

Data Quality Metrics:
  ehr.quality.fhir_validation_errors       {resource_type, profile} [counter]
  ehr.quality.terminology_invalid_codes    {code_system}            [counter]
  ehr.quality.incomplete_documents         {doc_type, facility}     [counter]
  ehr.quality.unsigned_orders              {order_type, age_hours}  [gauge]
```

### 2.4 Infrastructure Metrics

```
Clinical Data Repository:
  cdr.write_latency                        {partition}             [histogram]
  cdr.read_latency                         {partition}             [histogram]
  cdr.replication_lag                      {follower}              [gauge]
  cdr.partition_size                       {partition}             [gauge]
  cdr.resource_count                       {resource_type}         [gauge]

FHIR Server:
  fhir.search_latency                      {resource_type}        [histogram]
  fhir.search_result_count                 {resource_type}        [histogram]
  fhir.bundle_size                         {operation}            [histogram]
  fhir.validation_errors                   {resource_type}        [counter]

Cache:
  cache.hit_rate                           {cache_name}           [gauge]
  cache.eviction_rate                      {cache_name}           [counter]
  cache.memory_utilization                 {cache_name}           [gauge]
  cache.patient_context_freshness          {}                     [histogram]
```

---

## 3. Logging

### 3.1 Log Classification

| Category | Content | Sensitivity | Retention |
|---|---|---|---|
| **Application logs** | Service operations, errors, debug info | Low | 90 days |
| **FHIR request logs** | API calls with resource types and search params | Medium | 2 years |
| **PHI access logs** | Every access to patient data with context | Critical (PHI) | 7 years |
| **Security logs** | Auth events, access denials, anomaly alerts | High | 7 years |
| **Audit trail** | All state changes, clinical actions, overrides | Critical | 10 years |
| **Clinical event logs** | Order lifecycle, result delivery, CDS actions | High | 7 years |

### 3.2 Structured Log Format

```
Standard Clinical Log Entry:
{
  "timestamp": "2026-03-09T14:30:00.123Z",
  "level": "INFO",
  "service": "fhir-server",
  "instance": "fhir-pod-a3c7",
  "trace_id": "trace-abc123",
  "span_id": "span-789",
  "correlation_id": "corr-uuid-001",
  "facility_id": "mercy-general",
  "event_type": "FHIR_READ",
  "message": "Patient resource read successfully",
  "attributes": {
    "resource_type": "Patient",
    "resource_id": "MASKED-****uuid",
    "operation": "read",
    "response_time_ms": 12,
    "cache_hit": true,
    "user_role": "physician",
    "purpose": "treatment"
  }
}
```

**Critical PHI rules in logging:**
- Patient IDs: masked in application logs (show last 4 of UUID only)
- Patient names: NEVER logged in any application log
- Clinical data values (lab results, diagnoses): NEVER in application logs
- Full PHI context: only in audit trail (encrypted, restricted access)
- FHIR request bodies: logged only in audit trail, not application logs

### 3.3 PHI Audit Trail Structure

```
PHI Audit Event:
{
  "audit_id": "aud-uuid",
  "timestamp": "2026-03-09T14:30:00.123456Z",
  "event_type": "PHI_ACCESS",
  "actor": {
    "type": "PRACTITIONER",
    "id": "pract-uuid",
    "npi": "1234567890",
    "role": "ATTENDING_PHYSICIAN",
    "facility": "mercy-general",
    "department": "internal-medicine",
    "ip_address": "10.x.x.x",
    "workstation": "ws-nursing-3b",
    "session_id": "sess-uuid"
  },
  "patient": {
    "id": "pat-uuid",
    "mrn": "MRN-12345"
  },
  "access": {
    "resources_accessed": [
      {"type": "Patient", "id": "pat-uuid", "version": "5"},
      {"type": "Condition", "count": 8},
      {"type": "MedicationRequest", "count": 12},
      {"type": "Observation", "count": 45}
    ],
    "data_categories": ["demographics", "problems", "medications", "vitals"],
    "total_resources": 66
  },
  "context": {
    "purpose": "TREATMENT",
    "encounter_id": "enc-uuid",
    "care_team_member": true,
    "break_the_glass": false,
    "consent_evaluated": true,
    "consent_restrictions_applied": ["substance-abuse-redacted"]
  },
  "outcome": "SUCCESS",
  "integrity_hash": "sha256:abc123..."
}

Audit Trail Properties:
  1. Append-only — no updates or deletions permitted
  2. WORM storage — write once, read many
  3. Cryptographically chained — tamper detection via hash chain
  4. Time-stamped by trusted time source (NTP synchronized)
  5. Independently verifiable — separate from clinical systems
  6. Available to compliance within 1 hour on request
  7. Available to regulators within 24 hours on request
```

---

## 4. Distributed Tracing

### 4.1 Trace Context Propagation

```
Every clinical request carries trace context through all services:

Headers:
  X-Trace-ID: globally unique identifier for the request
  X-Span-ID: identifier for the current service span
  X-Parent-Span-ID: identifier for the calling service span
  X-Correlation-ID: clinical correlation (links related actions)
  X-Facility-ID: facility context
  X-User-Context: user role + purpose (for access control propagation)

Propagation rules:
  - HTTP/FHIR: W3C Trace Context headers
  - Event bus: trace context in event envelope metadata
  - CDS Hooks: trace context in hook request headers
  - Bulk FHIR: new trace per export chunk, linked to initiating trace
```

### 4.2 Critical Path Tracing

```
Patient Chart Load Trace (target: < 1.5s total):

├─ API Gateway (5ms)
│  ├─ SMART token validation (3ms)
│  └─ Rate limit check (1ms)
│
├─ Patient Service (50ms)
│  ├─ MPI identity resolution (20ms)
│  ├─ Consent evaluation (15ms)
│  └─ Cache check for patient context (10ms)
│
├─ FHIR Server — Parallel Resource Fetch (800ms max)
│  ├─ Patient demographics (15ms)
│  ├─ Active conditions (50ms) ← index scan
│  ├─ Active medications (80ms) ← includes _include:medication
│  ├─ Allergies (30ms)
│  ├─ Recent encounters (100ms) ← sorted, limited
│  ├─ Recent results (150ms) ← largest result set
│  ├─ Vitals (60ms)
│  └─ Care plans (40ms)
│
├─ Response Assembly (50ms)
│  ├─ Consent filtering (20ms)
│  ├─ FHIR Bundle construction (20ms)
│  └─ Response compression (10ms)
│
Total: ~905ms (within 1.5s target)

Optimization: Patient context cache reduces repeat chart loads to ~200ms
```

### 4.3 Sampling Strategy

```
Sampling Rules:

1. Always trace (100%):
   - Failed requests (any 4xx/5xx error)
   - Break-the-glass access events
   - CDS override events
   - Patient matching with low confidence scores
   - Cross-facility HIE queries
   - Bulk FHIR export operations
   - Any request touching restricted data categories

2. Head-based sampling (10%):
   - Routine chart loads for active encounters
   - Standard FHIR CRUD operations
   - Patient portal requests

3. Tail-based sampling:
   - Retain all traces with latency > p95
   - Retain all traces with errors in any span
   - Retain all traces touching degraded services

Storage:
  - Full traces: 30 days
  - Trace summaries: 1 year
  - Compliance-tagged traces: 7 years (linked to audit trail)
```

---

## 5. Alerting Framework

### 5.1 Alert Tiers

| Tier | Condition | Response | Channel |
|---|---|---|---|
| **P1 - Page** | Clinical data unavailable, PHI breach detected, audit pipeline failure | Immediate response required | PagerDuty + phone call |
| **P2 - Urgent** | SLO burn rate critical, CDS down, MPI degraded | Response within 15 minutes | PagerDuty + chat |
| **P3 - Warning** | Elevated latency, cache miss rate high, capacity approaching limits | Response within 1 hour | Chat + email |
| **P4 - Info** | Trend changes, non-critical anomalies, upcoming certificate expiry | Review next business day | Dashboard + email |

### 5.2 Key Alert Definitions

```
Alert: Patient Chart Load SLO Breach
  condition: chart_load_p99 > 4 seconds for 5 minutes
  severity: P1
  action: Page on-call SRE + notify clinical informatics

Alert: Audit Pipeline Failure
  condition: audit.events_dropped > 0 OR audit.buffer_depth > 90%
  severity: P1
  action: Page on-call SRE + notify compliance (HIPAA audit gap risk)

Alert: PHI Anomalous Access
  condition: phi.anomalous_access_alerts > 0
  severity: P2
  action: Notify privacy officer + page security on-call

Alert: CDS Engine Down
  condition: cds.circuit_breaker_state = OPEN for > 2 minutes
  severity: P2
  action: Page on-call SRE + banner to clinical users

Alert: MPI Match Quality Degradation
  condition: mpi.auto_link_rate drops > 20% from baseline
  severity: P2
  action: Alert MPI team + clinical informatics

Alert: FHIR Validation Error Spike
  condition: fhir.validation_errors rate > 5x baseline for 10 minutes
  severity: P3
  action: Alert integration team (possible upstream data issue)

Alert: CDR Replication Lag
  condition: cdr.replication_lag > 30 seconds for any follower
  severity: P2
  action: Page on-call SRE (DR readiness compromised)

Alert: Break-the-Glass Volume Spike
  condition: phi.break_the_glass_events > 3x daily average in 1 hour
  severity: P2
  action: Notify privacy officer (possible mass incident or misuse)
```

---

## 6. Dashboards

### 6.1 Dashboard Hierarchy

```
Level 1: Executive Dashboard
  - System health (green/yellow/red per facility)
  - Active encounters across all facilities
  - FHIR API availability and latency trends
  - PHI incident summary (break-the-glass, anomalies)

Level 2: Clinical Operations Dashboard
  - Real-time encounter volume by facility and type
  - Patient chart load times (p50, p99)
  - Order volume and CDS alert rates
  - Critical result acknowledgment pipeline
  - MPI matching activity and queue depth

Level 3: FHIR Service Dashboard
  - Golden signals per FHIR operation type
  - Search latency by resource type and complexity
  - Cache hit rates and invalidation patterns
  - FHIR validation error rates by source

Level 4: Compliance Dashboard
  - PHI access volume by purpose (treatment, payment, operations)
  - Break-the-glass events (count, review status, outcome)
  - Consent enforcement metrics (denials, restrictions applied)
  - Audit trail health (completeness, latency, storage)
  - User access review completion status

Level 5: Interoperability Dashboard
  - HIE exchange volumes (inbound/outbound)
  - TEFCA query response times and success rates
  - FHIR Subscription notification delivery rates
  - SMART app API usage by app and scope
  - Bulk FHIR export status and performance

Level 6: Security Dashboard
  - Authentication failure patterns by facility
  - API abuse detection alerts
  - Certificate expiry timeline
  - Anomalous access patterns heatmap
  - Terminated employee access attempts
```

---

*Next: [Interview Guide ->](./08-interview-guide.md)*
