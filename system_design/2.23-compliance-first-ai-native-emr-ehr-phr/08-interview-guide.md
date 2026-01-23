# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Clarify** | Scope, requirements, constraints | EMR vs EHR vs PHR, compliance requirements, scale |
| 5-15 min | **High-Level** | Architecture, core components | Consent enforcement, FHIR, multi-region |
| 15-30 min | **Deep Dive** | 1-2 critical components | Consent engine OR AI pipeline OR FHIR server |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failures, scaling | Multi-region, data residency, federated learning |
| 40-45 min | **Wrap Up** | Summary, questions, extensions | Security, compliance, future enhancements |

---

## Phase 1: Clarifying Questions (0-5 min)

### Questions to Ask the Interviewer

**Scope Questions:**
- "What type of health record system are we designing - EMR (single organization), EHR (cross-organization), or PHR (patient-controlled), or all three?"
- "Which compliance frameworks are in scope - just HIPAA, or also GDPR, ABDM, NHS Digital?"
- "Are we designing this as a greenfield system or migrating from existing EHR vendors like Epic or Cerner?"

**Scale Questions:**
- "What's the expected patient population - thousands, millions, or tens of millions?"
- "How many healthcare providers will use the system concurrently?"
- "What geographic regions need to be supported?"

**Feature Questions:**
- "Is AI-assisted clinical documentation (ambient intelligence) a requirement, or nice-to-have?"
- "Do we need real-time clinical decision support for drug interactions?"
- "Is interoperability with external health information exchanges required?"

**Constraints:**
- "Are there specific latency requirements for clinical workflows?"
- "Is there a budget constraint for infrastructure costs?"
- "Are there existing systems we must integrate with?"

### Key Constraints to Confirm

| Constraint | Typical Answer | Impact on Design |
|------------|----------------|------------------|
| Compliance | HIPAA + GDPR + Others | Multi-framework policy engine |
| Data Residency | Per jurisdiction | Multi-region deployment |
| Availability | 99.99% | Redundancy, failover |
| Latency | < 200ms reads | Caching, optimization |
| Patient Safety | Critical | Strong consistency, audit |

---

## Phase 2: High-Level Design (5-15 min)

### Opening Statement

*"I'll design a cloud-native EMR/EHR/PHR platform built on three pillars: Compliance First, Consent First, and AI Native. Let me walk through the core architecture."*

### Key Points to Cover

1. **Architecture Overview**
   - Microservices architecture with domain-driven design
   - FHIR R4 as canonical data model
   - Event-driven for real-time clinical workflows

2. **Consent-First Architecture**
   - FHIR Consent resources with granular provisions
   - Consent Enforcement Point at gateway level
   - Every data access requires consent verification

3. **Multi-Region Deployment**
   - Data residency routing based on patient location
   - Regional databases with cross-region replication (where allowed)
   - Compliance engine evaluates per-jurisdiction rules

4. **Key Components**
   - API Gateway with SMART on FHIR authorization
   - Clinical Services (Patient, Encounter, Order, Results, Medication)
   - Consent Management Service
   - FHIR Server with HL7v2/CDA adapters
   - AI Platform (CDS, Coding, Ambient Documentation)

### Diagram to Draw

```
                      ┌─────────────────┐
                      │   Clients       │
                      │ (Clinical, PHR) │
                      └────────┬────────┘
                               │
                      ┌────────▼────────┐
                      │   API Gateway   │
                      │ + SMART Auth    │
                      │ + Consent Check │
                      └────────┬────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼───────┐    ┌────────▼────────┐    ┌───────▼───────┐
│   Clinical    │    │    Consent &    │    │      AI       │
│   Services    │    │   Compliance    │    │   Platform    │
└───────┬───────┘    └────────┬────────┘    └───────┬───────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │    FHIR Server    │
                    │ + Interoperability│
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼───────┐    ┌───────▼───────┐    ┌───────▼───────┐
│   US Region   │    │   EU Region   │    │ India Region  │
│   Database    │    │   Database    │    │   Database    │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## Phase 3: Deep Dive (15-30 min)

### Option A: Consent Management Engine

**Why this is critical:**
- Every data access must pass through consent verification
- Regulatory requirement (HIPAA, GDPR, ABDM)
- Performance impact on every request

**Key design points:**

1. **FHIR Consent Resource Structure**
   - Granular provisions: purpose, actor, resource class, codes
   - Nested deny provisions for exceptions
   - Temporal validity (period, dataPeriod)

2. **Consent Decision Algorithm**
   ```
   1. Load active consents for patient
   2. Find most specific applicable consent
   3. Evaluate provision tree (permit/deny)
   4. Apply nested provisions for filtering
   5. Return decision: PERMIT | DENY | PERMIT_WITH_FILTER
   ```

3. **Performance Optimization**
   - Redis cache for consent decisions (5-min TTL)
   - Cache invalidation on consent change
   - Target: < 10ms cached, < 50ms uncached

4. **Break-the-Glass**
   - Emergency override with attestation
   - MFA re-authentication
   - Mandatory 48-hour review

### Option B: AI-Powered Clinical Decision Support

**Why this is critical:**
- Drug interactions cause 7,000+ deaths annually
- Real-time detection prevents medical errors
- Must balance accuracy with alert fatigue

**Key design points:**

1. **Drug Interaction Detection Flow**
   - Normalize medications to RxNorm concepts
   - Query knowledge graph for interaction pairs
   - Adjust severity based on patient factors
   - Generate prioritized alerts

2. **RAG for Clinical Guidelines**
   - Vector database with clinical guideline embeddings
   - Cross-encoder reranking for relevance
   - LLM generation with retrieved context
   - Human-in-the-loop validation

3. **Privacy-Preserving AI**
   - Federated learning for multi-site training
   - Differential privacy (ε=1.0, δ=10^-5)
   - On-premise deployment option

4. **Alert Fatigue Mitigation**
   - Track override patterns
   - Adjust thresholds based on historical data
   - ML-based relevance filtering

### Option C: FHIR Server with Consent Integration

**Why this is critical:**
- Single point of data access
- Interoperability gateway
- Consent must be enforced at query time

**Key design points:**

1. **Query Processing with Consent**
   - Pre-query consent verification
   - Query modification for filtering
   - Post-query response filtering
   - Audit logging of all access

2. **FHIR Subscription with Consent**
   - Consent verification at subscription creation
   - Re-verification at notification time
   - Automatic deactivation on consent revocation

3. **SMART on FHIR Authorization**
   - OAuth 2.0 + OIDC
   - Scope-based access control
   - Consent overlay on token validation

---

## Phase 4: Scale and Trade-offs (30-40 min)

### Scaling Discussion

**Database Scaling:**
- Vertical scaling for primary (strong consistency requirement)
- Read replicas per region
- Sharding by tenant_id for multi-tenant isolation

**AI Scaling:**
- GPU auto-scaling based on queue depth
- Model quantization for lower latency
- Batched inference for throughput

**Consent Service Scaling:**
- Horizontal scaling (stateless)
- Distributed cache with sharding
- Pre-computation of common decisions

### Trade-offs Discussion

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Consistency for Clinical Data** | Strong (ACID) | Eventual (BASE) | **Strong** - patient safety |
| **AI Deployment** | Cloud API | Self-hosted | **Self-hosted** - data sovereignty |
| **Consent Verification** | Synchronous | Async with eventual | **Synchronous** - compliance |
| **Data Residency** | Single region | Multi-region | **Multi-region** - compliance |
| **Audit Storage** | Relational | Append-only + Blockchain | **Hybrid** - immutability + queryability |

### Failure Scenarios

**"What if the consent service goes down?"**
- Fail closed (deny all access except BTG)
- Circuit breaker prevents cascade
- Alert and escalate immediately

**"What if an AI model makes incorrect recommendations?"**
- AI suggestions never auto-applied
- Human-in-the-loop for all clinical decisions
- Override logging and pattern analysis
- Model rollback capability

**"What if there's a cross-region data access?"**
- Data residency router checks permissions
- If transfer allowed: route with audit
- If not allowed: return error with explanation

---

## Phase 5: Wrap Up (40-45 min)

### Summary Points

*"To summarize, I've designed a compliance-first, consent-based, AI-native EHR platform with:*

1. *FHIR R4 as the canonical data model with SMART on FHIR authorization*
2. *Granular consent management with real-time enforcement*
3. *Multi-region deployment for data residency compliance*
4. *Privacy-preserving AI with federated learning*
5. *Comprehensive audit logging with blockchain anchoring"*

### Extensions to Mention

- Patient matching across organizations (MPI)
- Research data platform with de-identification
- Population health analytics
- Telemedicine integration
- Medical device data ingestion (IoT)

---

## Trap Questions and Best Answers

### Trap 1: "Why not just use a simple consent flag (yes/no)?"

**What Interviewer Wants:** Understanding of real-world consent complexity

**Best Answer:**
*"Binary consent is insufficient for healthcare. Patients need granular control:*
- *Purpose-based: Allow treatment but deny research*
- *Data-type based: Share medications but not mental health notes*
- *Recipient-based: Allow my PCP but not specialists*
- *Temporal: Consent valid only for this encounter*

*FHIR Consent R4 supports these through its provision tree structure. Regulations like GDPR Article 7 explicitly require granular consent for health data."*

### Trap 2: "How do you handle emergency access when the patient is unconscious?"

**What Interviewer Wants:** Understanding of break-the-glass protocols

**Best Answer:**
*"We implement Break-the-Glass (BTG) protocol:*

1. *Clinician declares emergency need*
2. *System captures attestation (reason, justification)*
3. *Enhanced MFA (biometric) required*
4. *Time-limited access token issued (4 hours max)*
5. *All access logged with BTG flag*
6. *Privacy Officer alerted within 1 hour*
7. *Mandatory review within 48 hours*

*This balances patient safety with privacy protection. BTG usage is audited and reported as a compliance metric."*

### Trap 3: "What if the AI makes a wrong diagnosis?"

**What Interviewer Wants:** Understanding of AI governance in healthcare

**Best Answer:**
*"Critical principle: AI suggestions are never automatically applied to the patient record.*

1. *All AI outputs are advisory only*
2. *Clinician must review and approve*
3. *Override and acceptance logged for ML feedback*
4. *Model confidence thresholds trigger mandatory review*
5. *Explainability required (why did AI suggest this?)*
6. *Rollback capability to previous model versions*

*The system is designed for augmentation, not replacement of clinical judgment. FDA guidance on clinical decision support (CDS) shapes our approach."*

### Trap 4: "How do you comply with both HIPAA and GDPR? Don't they conflict?"

**What Interviewer Wants:** Understanding of multi-framework compliance

**Best Answer:**
*"We use a 'most restrictive rule wins' approach:*

1. *Compliance engine evaluates request against all applicable frameworks*
2. *Return the most restrictive result*

*For example:*
- *HIPAA allows 60 days for breach notification, GDPR requires 72 hours*
- *We notify within 72 hours (satisfies both)*

*Data residency is handled by routing:*
- *EU patient data stays in EU (GDPR requirement)*
- *Cross-border transfer only with Standard Contractual Clauses or explicit consent*

*Tenant configuration specifies applicable frameworks, and the policy engine adapts automatically."*

### Trap 5: "Why not just use a blockchain for all data?"

**What Interviewer Wants:** Critical thinking about technology choices

**Best Answer:**
*"Blockchain has specific use cases in healthcare:*

**Where we use blockchain:**
- *Consent audit trail (immutability is critical)*
- *Periodic anchoring of audit log hashes*
- *Cross-organization consent verification*

**Where blockchain is NOT appropriate:**
- *Clinical data storage (too slow, doesn't scale)*
- *Real-time consent verification (latency requirements)*
- *Frequent updates (inefficient for mutable data)*

*We use a hybrid approach: PostgreSQL for clinical data with blockchain anchoring for audit integrity. This gives us the best of both worlds - performance and immutability where it matters."*

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Skipping consent entirely | Regulatory violation | Lead with consent architecture |
| Single region design | Violates data residency | Multi-region from start |
| Auto-applying AI suggestions | Patient safety risk | Human-in-the-loop always |
| Eventual consistency for clinical data | Medical errors possible | Strong consistency for PHI |
| Generic auth (just OAuth) | Misses SMART on FHIR | Healthcare-specific auth |
| Ignoring audit requirements | Compliance failure | Audit as core component |
| One-size-fits-all compliance | Different jurisdictions | Configurable policy engine |

---

## Questions for the Interviewer

1. "What specific compliance frameworks are most important for your organization?"
2. "Are you integrating with existing EHR vendors, or is this a replacement?"
3. "What's your current approach to AI in clinical workflows?"
4. "How do you handle cross-organization data sharing today?"
5. "What's your biggest pain point with your current health IT infrastructure?"

---

## Quick Reference Card

### Key Numbers to Remember

| Metric | Value | Source |
|--------|-------|--------|
| GDPR breach notification | 72 hours | Article 33 |
| HIPAA breach notification | 60 days | §164.404 |
| GDPR data access response | 30 days | Article 12 |
| HIPAA audit log retention | 6 years | §164.530(j) |
| NHS audit log retention | 8 years | NHS guidelines |
| DDI-related deaths (US) | 7,000+/year | FDA |
| Epic market share (US) | ~35% | Industry reports |
| FHIR R4 normative status | 2019 | HL7 |

### Key Acronyms

| Acronym | Full Form |
|---------|-----------|
| EMR | Electronic Medical Record |
| EHR | Electronic Health Record |
| PHR | Personal Health Record |
| FHIR | Fast Healthcare Interoperability Resources |
| SMART | Substitutable Medical Applications, Reusable Technologies |
| CDS | Clinical Decision Support |
| DDI | Drug-Drug Interaction |
| BTG | Break-the-Glass |
| MPI | Master Patient Index |
| HIE | Health Information Exchange |
| ABDM | Ayushman Bharat Digital Mission |
| DICOM | Digital Imaging and Communications in Medicine |
| HL7 | Health Level 7 |
| CDA | Clinical Document Architecture |
| SNOMED | Systematized Nomenclature of Medicine |
| LOINC | Logical Observation Identifiers Names and Codes |
| RxNorm | Normalized names for clinical drugs |

### FHIR Resources to Know

| Resource | Purpose |
|----------|---------|
| Patient | Demographics, identifiers |
| Encounter | Visit, admission |
| Observation | Vitals, labs, assessments |
| DiagnosticReport | Lab results, radiology |
| MedicationRequest | Prescriptions |
| Condition | Diagnoses, problems |
| AllergyIntolerance | Allergies, adverse reactions |
| Consent | Patient consent decisions |
| AuditEvent | Audit log entries |
| Bundle | Collection of resources |

---

## Complexity Considerations

### What Makes This System "Very High" Complexity

1. **Multi-Framework Compliance**: Conflicting regulations (HIPAA vs GDPR vs ABDM)
2. **Granular Consent**: Complex provision trees with real-time enforcement
3. **Data Residency**: Patient data must stay in correct jurisdiction
4. **AI Governance**: Privacy-preserving ML with clinical safety requirements
5. **Interoperability**: Multiple standards (FHIR, HL7v2, CDA, DICOM)
6. **Audit Requirements**: 6-8 year retention, immutability, hash chains
7. **Patient Safety**: Strong consistency, real-time alerting

### How to Scope Down in a 45-Minute Interview

**If time is short, focus on:**
1. Consent architecture (most differentiating)
2. High-level FHIR-based design
3. Multi-region for compliance
4. One deep dive (consent engine preferred)

**Defer to "future work":**
- Detailed AI architecture
- DICOM imaging workflows
- Federated learning details
- National HIE integrations (ABDM, NHS Spine)
