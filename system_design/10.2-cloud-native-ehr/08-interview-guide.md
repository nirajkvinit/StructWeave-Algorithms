# Interview Guide — Cloud-Native EHR Platform

## 1. 45-Minute Pacing Guide

### Phase 1: Requirements Clarification (5 minutes)

**What to establish upfront:**

| Question | Why It Matters |
|---|---|
| "Is this a greenfield cloud-native EHR or modernizing a legacy system?" | Determines whether you need HL7v2 backward compatibility and migration strategy |
| "What's the scale — number of patients, facilities, concurrent clinicians?" | Drives partitioning strategy, cache sizing, and infrastructure decisions |
| "Is interoperability a primary requirement (TEFCA, HIE, SMART on FHIR)?" | Determines FHIR-native vs. FHIR facade architectural decision |
| "What clinical specialties must be supported day one?" | Scope: ambulatory, inpatient, ED, specialty, all determine document and workflow complexity |
| "What compliance regime — US (HIPAA), EU (GDPR), or global?" | Drives consent model, audit requirements, and data residency decisions |
| "Is the goal a multi-tenant platform serving many health systems?" | Multi-tenancy adds isolation, billing, and configuration complexity |

**Clarifying questions that impress interviewers:**
- "Should the MPI support cross-organizational patient matching, or is it single-organization?"
- "Do we need real-time CDS (CDS Hooks) or is batch-based quality reporting sufficient?"
- "What's the imaging volume? PACS integration is a separate concern from the clinical EHR."

### Phase 2: High-Level Architecture (10 minutes)

**Draw these components on the whiteboard:**

1. **API Gateway** — FHIR-aware gateway with SMART on FHIR auth
2. **Clinical Services** — Organized by bounded context:
   - Patient domain (patient service, MPI, consent)
   - Encounter domain (encounter, documentation, notes)
   - Order domain (CPOE, results, medications)
   - Care coordination (care plans, referrals, scheduling)
3. **FHIR Server** — Standards-compliant R4/R5, the interoperability backbone
4. **Clinical Intelligence** — CDS Hooks (inline), NLP (async), predictive models
5. **Data Layer** — Clinical data repository (FHIR-native), document/image store, cache
6. **Event Backbone** — Clinical event streaming for CQRS and cross-service communication
7. **Audit Service** — Immutable PHI access logging

**Key narrative:** "The core architectural insight is making FHIR the native storage format, not just an API translation layer. When clinical data is stored as FHIR resources from the ground up, interoperability becomes a property of the system rather than an integration project. Every resource is inherently exchangeable via standard APIs without translation."

### Phase 3: Deep Dive (20 minutes)

The interviewer will likely ask you to dive into one of these areas. Be prepared for all four:

**Option A: Patient Identity / MPI**
- Blocking strategy for candidate generation (DOB + name prefix, phonetic, phone suffix)
- Probabilistic scoring (Jaro-Winkler, phonetic matching, field weights)
- Match classification (certain > 0.92, probable > 0.80, possible > 0.65)
- Auto-link vs. manual review vs. new record decision
- Duplicate detection and merge workflow
- Cross-organization matching challenges (different MRN schemes, name changes)

**Option B: Clinical Decision Support**
- CDS Hooks architecture (hook types: order-select, patient-view, encounter-start)
- Drug interaction checking pipeline (knowledge base + active med list + draft order)
- Alert fatigue mitigation (severity-based, context-aware, override learning)
- CDS response time budget (< 500ms for inline hooks)
- Circuit breaker pattern for CDS (orders proceed without alerts if CDS is down)

**Option C: FHIR Server and Data Model**
- FHIR-native storage vs. proprietary schema + FHIR facade
- Search parameter indexing strategy (token, date, reference, string, composite)
- Patient-based partitioning for chart assembly optimization
- Version history and document versioning (amendments, addenda, corrections)
- FHIR $everything operation for complete patient chart

**Option D: Security and HIPAA Compliance**
- PHI audit trail architecture (every access logged with who, what, when, why)
- Break-the-glass emergency access workflow
- Consent management with 42 CFR Part 2 segmentation
- Role-based access with care team context
- Minimum necessary enforcement for non-treatment access

### Phase 4: Scalability, Reliability, and Trade-offs (8 minutes)

**Must cover:**
- Patient-based partitioning with consistent hashing
- CDR replication strategy (synchronous within region, async to DR)
- Tiered storage lifecycle for FHIR resources and imaging (hot → warm → cold → archive)
- Clinical downtime procedures (paper backup when system is unavailable)
- Graceful degradation modes (degraded CDS, read-only, full downtime)

**Key trade-off discussions:**
- FHIR-native storage vs. proprietary schema + FHIR API facade
- Strong consistency for clinical writes vs. eventual consistency for reads
- Synchronous CDS (latency cost) vs. async CDS (missed safety alerts)
- Comprehensive audit logging throughput vs. clinical system performance

### Phase 5: Wrap-Up (2 minutes)

Touch on:
- Security (HIPAA compliance, break-the-glass, consent management)
- Observability (PHI audit trail as first-class HIPAA requirement)
- One unique insight (FHIR-native storage, MPI referential matching, consent-at-data-layer)

---

## 2. Key Trade-offs to Discuss

### 2.1 FHIR-Native Storage vs. FHIR Facade

| Aspect | FHIR-Native | FHIR Facade |
|---|---|---|
| **Interoperability** | Built-in; every resource is natively exchangeable | Translation required; mapping bugs are common |
| **Query flexibility** | Full FHIR search specification supported natively | Limited to what the translation layer exposes |
| **Storage efficiency** | FHIR JSON has overhead vs. normalized tables | Proprietary schema more compact, optimized |
| **Custom workflows** | Must use FHIR extensions for non-standard data | Full flexibility with proprietary schema |
| **Schema evolution** | Tied to FHIR spec releases | Independent evolution |
| **Developer experience** | FHIR tooling ecosystem directly usable | Proprietary tooling needed for internal model |

**Interview answer:** "For a cloud-native, compliance-first EHR, FHIR-native storage is the right choice. The interoperability requirements from ONC Cures Act and TEFCA mean that every clinical data element must be expressible as FHIR resources anyway. Storing natively avoids a translation layer that introduces bugs and inconsistencies. We handle performance concerns with specialized FHIR search indexes and a cache tier for patient context assembly. FHIR extensions address custom data needs."

### 2.2 Patient-Based vs. Facility-Based Partitioning

| Aspect | Patient-Based | Facility-Based |
|---|---|---|
| **Chart assembly** | Single-partition (optimal) | Multi-partition for patients visiting multiple facilities |
| **Facility dashboards** | Cross-partition scatter-gather | Single-partition (optimal) |
| **Data residency** | Patient data may span regions | Facility data stays in one region |
| **Load distribution** | Even (patients are granular) | Uneven (large hospitals vs. small clinics) |
| **Cross-facility patients** | Naturally unified | Requires cross-partition join |

**Interview answer:** "Patient-based partitioning is preferred because the dominant access pattern is 'load all clinical data for patient X.' If a patient visits multiple facilities, all their data is co-located on one partition, making chart assembly a single-partition operation. Facility-level dashboards are handled by an analytics projection in a data warehouse, which is updated asynchronously. Data residency concerns are addressed by ensuring the patient's partition maps to a region within the appropriate jurisdiction."

### 2.3 Synchronous CDS vs. Asynchronous CDS

| Aspect | Synchronous (CDS Hooks) | Asynchronous (Batch) |
|---|---|---|
| **Latency impact** | +100-500ms per order entry | Zero impact on order entry workflow |
| **Patient safety** | Alerts prevent harmful orders at point-of-entry | Issues discovered after the fact (retraction needed) |
| **Alert fatigue** | Real-time alerts contribute to fatigue | Batch reviews handled by pharmacy, less fatigue |
| **CDS failure** | Orders blocked if CDS is down (needs circuit breaker) | Batch processing retries; no workflow impact |
| **Coverage** | Point-of-care decisions only | Can analyze patterns across multiple orders/encounters |

**Interview answer:** "We use a hybrid approach. Drug interaction checks and allergy cross-references must be synchronous — a clinician must see the interaction alert BEFORE signing the order, not after the medication has been dispensed. However, population-level CDS (care gap identification, chronic disease management reminders) is better suited for asynchronous batch analysis. The circuit breaker pattern ensures that CDS failures don't block clinical workflow — orders proceed with a warning that CDS was temporarily unavailable."

---

## 3. Common Mistakes to Avoid

### 3.1 Data Model Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Treating FHIR as just an API layer | Misses interoperability by design; creates translation bugs | FHIR-native storage ensures every resource is inherently exchangeable |
| No version history for clinical documents | Legal requirement; amendments must preserve original | Full version chain with amendment/addendum/correction provenance |
| Storing patient identity in a single field | MPI requires multi-field probabilistic matching | Structured identity with normalized, phonetic, and hashed fields |
| No consent model from day one | Retrofitting consent is architecturally expensive | FHIR Consent resources with provision-based filtering from start |
| Ignoring terminology binding | Uncoded data is unsearchable and non-interoperable | Require SNOMED, LOINC, RxNorm coding with terminology validation |

### 3.2 Architecture Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Single database for clinical + audit data | Audit writes contend with clinical reads; different retention | Separate audit store (WORM) from clinical data repository |
| CDS as embedded rules in application code | Unupdatable, untestable, creates vendor lock-in | CDS Hooks with external service architecture; knowledge base decoupled |
| No patient-based partitioning | Chart assembly becomes cross-partition join | Partition by patient ID from day one; analytics in separate projection |
| Treating imaging like structured data | Imaging is 100-1000x larger; different access patterns | Separate imaging storage tier with DICOMweb gateway |
| No offline/degraded mode | Clinical systems cannot have hard downtime | Paper-based downtime procedures + progressive degradation modes |

### 3.3 Compliance Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Audit logging as an afterthought | HIPAA requires audit from day one; retrofitting is incomplete | PHI audit as interceptor in FHIR server pipeline; every access logged |
| No break-the-glass workflow | Blocking emergency access is unsafe; unlogged overrides are non-compliant | Formal break-the-glass with justification, time limit, mandatory review |
| Ignoring consent for internal sharing | 42 CFR Part 2, mental health, and HIV records have special protections | Consent-at-data-layer with security labels for sensitive data categories |
| PHI in application logs | Violates HIPAA minimum necessary | Strict log sanitization; PHI only in audit trail with controlled access |
| Same encryption key for all tenants | Key compromise exposes all tenants | Per-tenant encryption keys with HSM-backed key hierarchy |

---

## 4. Trap Questions and How to Handle Them

### 4.1 "How do you handle two providers editing the same patient chart simultaneously?"

**Trap:** Candidate says "use database locks on the patient record."

**Correct:** "FHIR resources are independent entities — a provider editing a progress note creates a new DocumentReference resource, while another provider ordering labs creates a new ServiceRequest resource. These are different resources and don't conflict. For the rare case of concurrent updates to the same resource (e.g., two nurses updating the same vital signs observation), FHIR uses optimistic concurrency with the If-Match header containing the resource's version ID. If a conflict occurs, the second writer gets a 409 and must re-read and resubmit. This is extremely rare in practice because clinical resources are typically authored by a single provider."

### 4.2 "Can you use eventual consistency for the medication list?"

**Trap:** Candidate says "yes, for better performance."

**Correct:** "Not for the active medication list that CDS evaluates for drug interactions. If a provider prescribes Drug A, and 500ms later another provider prescribes Drug B (which interacts with Drug A), the second provider MUST see Drug A in the active list for the interaction check to fire. The write path for MedicationRequest resources must be strongly consistent, and the CDS engine must read from the primary, not a replica. However, the medication history display (showing past medications) can be eventually consistent — slight lag in showing historical data is clinically acceptable."

### 4.3 "What if the CDS engine is down during a high-alert medication order?"

**Trap:** Candidate says "block all medication orders until CDS recovers."

**Correct:** "We use a circuit breaker pattern. If CDS is unavailable, medication orders proceed but with two safeguards: (1) a warning banner tells the clinician 'drug interaction checking is temporarily unavailable — use clinical judgment,' and (2) all orders placed during the CDS outage are queued for retrospective pharmacist review. Additionally, a simpler rule-based fallback can catch the most critical interactions (contraindicated drug combinations, known lethal interactions) from a static lookup table without the full CDS service. We accept reduced sensitivity temporarily in exchange for maintaining the clinical workflow."

### 4.4 "How do you handle a patient who has records at 5 different hospitals?"

**Trap:** Candidate says "copy all records into one system."

**Correct:** "This is the core MPI and interoperability challenge. The MPI maintains a golden record that links the patient's identifiers across all 5 hospitals. When a clinician opens this patient's chart, the system assembles data from the local CDR plus queries external systems via TEFCA/HIE for records not yet available locally. The key insight is that we don't centralize all data — we federate. Each hospital maintains its records, and the EHR queries on demand. This respects data governance, avoids synchronization problems, and complies with data residency requirements. For urgent scenarios, previously received external documents are cached locally with provenance indicating their source."

### 4.5 "How do you prevent a nurse from accessing a celebrity patient's record?"

**Trap:** Candidate says "just add a flag on the patient record."

**Correct:** "VIP/celebrity protection is a multi-layered approach: (1) Access control verifies the user is on the patient's active care team for the current or recent encounter. A nurse on 3 East cannot access a patient on 5 West without clinical justification. (2) VIP patient records are flagged with a security label that triggers additional scrutiny — every access to a flagged record is immediately logged and queued for privacy officer review. (3) Break-the-glass is the only override path, and it requires documented clinical justification, re-authentication, and generates a real-time alert to the privacy officer. (4) The audit trail makes snooping detectable after the fact, and institutions enforce disciplinary consequences. The deterrent effect of known monitoring is as important as the technical controls."

---

## 5. Scoring Rubric (What Interviewers Look For)

### 5.1 Senior Engineer Level

| Criterion | Expectation |
|---|---|
| **Requirements** | Identifies FHIR as the interoperability backbone; recognizes HIPAA audit as a first-class requirement |
| **Architecture** | Draws FHIR server with clinical services; identifies patient service, MPI, and CDS as key components |
| **Data Model** | Uses FHIR resource types correctly; understands Patient, Encounter, Observation, MedicationRequest |
| **Patient Matching** | Acknowledges MPI as critical; describes basic matching (exact + fuzzy) |
| **Compliance** | Discusses HIPAA audit logging and role-based access control |

### 5.2 Staff Engineer Level

| Criterion | Expectation |
|---|---|
| **All of Senior, plus:** | |
| **FHIR-Native** | Argues for FHIR-native storage over FHIR facade with specific trade-offs |
| **MPI Deep Dive** | Describes probabilistic matching, blocking strategies, referential matching |
| **CDS Architecture** | Uses CDS Hooks specification; addresses alert fatigue with specific mitigations |
| **Consent** | Models consent as data-layer enforcement, not application-layer |
| **Trade-offs** | Articulates FHIR-native vs. facade, sync vs. async CDS, strong vs. eventual consistency |
| **Imaging** | Discusses DICOMweb integration and tiered storage for DICOM studies |

### 5.3 Principal/Architect Level

| Criterion | Expectation |
|---|---|
| **All of Staff, plus:** | |
| **Ecosystem Design** | TEFCA participation, SMART on FHIR platform for third-party apps |
| **Regulatory Architecture** | ONC Cures Act anti-information-blocking, 42 CFR Part 2 segmentation |
| **Clinical Safety** | Downtime procedures, degraded modes, CDS circuit breaker impact on patient safety |
| **Scale Architecture** | Patient-based partitioning with analytics projection for cross-patient queries |
| **Cost Optimization** | Tiered storage lifecycle from hot NVMe to archive-class object storage |

---

## 6. Variation Questions

| Variation | Key Difference |
|---|---|
| "Design a patient portal" | Focus on patient-facing FHIR API, SMART on FHIR, self-service features, data access rights |
| "Design a health information exchange" | MPI across organizations, TEFCA QHIN, consent for cross-org sharing, document routing |
| "Design an ambulatory EHR" | Lighter: no inpatient, less imaging, more scheduling, focus on billing/coding |
| "Design a clinical data warehouse" | ETL from EHR, OMOP common data model, de-identification, research queries |
| "Design a medication management system" | eRx, formulary, PDMP, barcode-verified MAR, medication reconciliation |

---

*Next: [Insights ->](./09-insights.md)*
