# 12.20 AI-Native Recruitment Platform — Security & Compliance

## Regulatory Landscape

The AI-native recruitment platform operates in one of the most heavily regulated intersections of AI law: automated decision-making that affects employment. Multiple legal frameworks impose overlapping obligations.

### NYC Local Law 144 (Automated Employment Decision Tools)

Enacted 2021, enforcement since July 2023. Applies to employers and employment agencies that use an "automated employment decision tool" (AEDT) for candidates or employees based in New York City.

**System obligations:**

| Requirement | Implementation |
|---|---|
| Independent bias audit annually | The platform generates a per-employer bias audit report covering each AEDT deployed, covering all stages where AI makes or substantially assists a decision. Published in machine-readable format. |
| Publish audit results before use | Audit results for the current year are published on a public URL before the AEDT is activated for NYC-located candidates. The compliance reporter generates the required LL144-format JSON report. |
| Candidate notice ≥ 10 business days before AEDT use | The consent_record on each candidate_profile tracks aedt_notice_sent_at. The matching pipeline checks this timestamp before ranking NYC candidates; a candidate who received notice < 10 business days ago is excluded from AI ranking (manual recruiter review only). |
| Alternative assessment option | Candidates who opt out of AEDT are routed to a human recruiter review workflow; this is a first-class pipeline branch, not a tacked-on exception. |
| Audit scope: sex, race/ethnicity, intersectional categories | The bias_monitoring_batch covers gender, race/ethnicity, and intersectional combinations as required by LL144 and EEOC EEO-1 categories. |

**Audit data pipeline:**

```
LL144 Audit Generation Process:
  1. Compliance reporter reads all candidate_stage_events for the audit period
  2. Joins with demographic_store (restricted read; separate audit trail for this join)
  3. Computes selection rates by LL144-specified categories per AEDT stage
  4. Computes impact ratios per category vs. reference group
  5. Generates audit report in LL144 JSON schema with:
     - AEDT description and model version history
     - Audit period (calendar year)
     - Selection rates per category per stage
     - Impact ratios
     - Auditor attestation fields
  6. Report archived for minimum 3 years
  7. Public-facing URL updated with new report before AEDT activation for next year
```

### EU AI Act — High-Risk AI System in Employment

The EU AI Act classifies AI systems used for recruitment, promotion, or employment as high-risk. Obligations effective by August 2026 for new systems.

**System obligations:**

| Requirement | Implementation |
|---|---|
| Registration in EU AI database | Platform is registered in the EU AI Act public database with technical documentation describing training data, accuracy metrics, bias testing, and intended use |
| Technical documentation | Maintained in a version-controlled documentation system; updated with each major model version change |
| Quality management system | ISO-aligned quality management system covering data management, model validation, bias testing, and incident response |
| Human oversight mechanism | Every AI-driven ranking and assessment decision has a human review pathway; no AI decision results in an irreversible rejection without human review option |
| Logging for traceability | All AI decisions logged with model version, inputs (as feature hash), outputs, and timestamps; retained minimum 6 months; available to national market surveillance authorities |
| Transparency to candidates | Candidates informed that AI is used; informed of logic, significance, and envisaged consequences of any AI decision that substantially affects them |
| Fundamental rights impact assessment | Conducted at system deployment and on material model changes |

### EEOC and Adverse Impact Law (US Federal)

The US Equal Employment Opportunity Commission applies the Uniform Guidelines on Employee Selection Procedures (UGESP), including the 4/5ths (80%) rule for adverse impact detection.

- The platform's bias_monitoring_batch implements the 4/5ths rule computation continuously per decision stage
- Selection rates are computed for sex and racial/ethnic categories as required by EEOC EEO-1 Component 1 categories
- Adverse impact analysis results are available for EEOC inquiry or litigation defense as structured data from the audit log

### GDPR and Candidate Data Rights

GDPR applies to candidates located in the EU; analogous obligations apply under CCPA for California candidates.

| Right | Platform Implementation |
|---|---|
| Right to access | Candidates can request a structured export of all personal data held; generated within 30 days by the GDPR pipeline; includes profile record, stage events, conversation logs, assessment scores, interview reports |
| Right to erasure | Erasure request triggers: (1) soft-delete of profile record, (2) removal from ANN vector index, (3) removal from model training datasets (anonymization, not deletion, for model integrity), (4) deletion of video files, transcripts, and reports; completed within 30 days |
| Right to object to automated decisions | Candidates may request human review of any AI-driven stage decision; implemented as the "alternative assessment pathway" in the pipeline |
| Data minimization | Demographic data collected only for bias monitoring; not used as model features; stored in isolated store with restricted access |
| Lawful basis for data processing | Application = legitimate interest for processing; sourced candidates = legitimate interest with opt-out obligation; consent required for AEDT processing in some EU member states |

---

## Demographic Data Architecture

### Isolation Design

Demographic data (gender, race/ethnicity) collected for bias monitoring must be:
1. **Isolated** from the matching features fed to the compatibility model (to prevent the model from using demographic attributes as proxy features)
2. **Access-restricted** to the bias monitoring service and compliance reporter only
3. **Audit-logged** every time it is read, including which service read it and why

```
Demographic data architecture:
  Storage:          Separate encrypted datastore from candidate_profile main store
  Schema:           {candidate_id (pseudonymized), gender_category, race_ethnicity_category,
                     intersectional_category, self_reported: boolean, collected_at, retention_until}
  Access control:   Only bias_monitor service account and compliance_reporter service account
                    can read; no direct human access except compliance officers via audited UI
  Audit log:        Every read appended to compliance audit log with {accessor, timestamp, purpose}
  Retention:        Retained for bias audit cycle (1 year) + 3-year legal hold; then purged
  Erasure:          Included in GDPR erasure pipeline; purged within 30 days of erasure request

  CRITICAL RULE: Demographic fields are NEVER passed to the embedding service, ANN index,
  or compatibility model. The matching pipeline has a feature-level assertion that verifies
  no demographic attributes are present in the feature vector before model inference.
```

---

## Audit Log Design

### Structure and Tamper Evidence

```
audit_log_entry {
  entry_id:        UUID
  timestamp:       timestamp (RFC 3339, from trusted time source)
  prev_entry_hash: bytes[32]      // SHA-256 of previous entry's content
  event_type:      enum           // MATCH_DECISION | STAGE_DECISION | BIAS_ALERT |
                                  // ASSESSMENT_SCORED | VIDEO_ANALYZED | DATA_ACCESS |
                                  // ERASURE_EXECUTED | AEDT_NOTICE_SENT
  entity_ids:      {candidate_id, req_id, batch_id, ...}
  actor:           string         // model_version OR user_id OR service_account
  decision_inputs: bytes[32]      // SHA-256 hash of input feature vector (not the features themselves)
  decision_output: string         // structured JSON of decision outputs
  model_version:   string
  policy_version:  string
  entry_hmac:      bytes          // HMAC-SHA256 of entry content; key in managed HSM
}
```

The audit log is append-only. There is no delete path. Every 24 hours, a chain integrity validator re-computes the hash chain from the last verified checkpoint and alerts if any entry has been tampered with.

---

## Access Control

### Role-Based Access Matrix

| Role | Can Access | Cannot Access |
|---|---|---|
| Recruiter | Candidate shortlists, match explanations, assessment summaries, interview reports | Raw model scores, feature vectors, demographic data |
| Hiring Manager | Shortlist for their requisitions, interview reports for their candidates | Other requisitions' data, demographic data |
| Compliance Officer | Bias audit reports, EEOC reports, audit log (read-only) | Individual candidate matching features, raw video |
| Data Privacy Officer | Erasure pipeline, GDPR request status, data subject export | Model internals, compatibility model parameters |
| ML Engineer | Model artifacts, training dataset metadata (anonymized), embedding service logs | Individual candidate data, demographic store |
| Platform Administrator | System configuration, rate limits, circuit breakers | Candidate data, demographic store |

### Model Artifact Access Control

Compatibility model weights and training datasets (even anonymized) are treated as high-sensitivity artifacts:
- Model artifacts stored in access-controlled object storage with versioned locking
- Training data access requires dual-approval (ML engineer + privacy officer)
- Model training runs executed in isolated compute environments with no internet access
- Model outputs (predictions) are logged; model weights are not logged

---

## Security Controls

### Candidate Data Encryption

| Data Category | At Rest | In Transit | Key Management |
|---|---|---|---|
| Candidate profile (contact info) | AES-256, field-level | TLS 1.3 | Per-customer key in managed KMS |
| Demographic data | AES-256, dedicated key | TLS 1.3 | Separate key hierarchy from profile data |
| Assessment responses | AES-256 | TLS 1.3 | Per-customer key |
| Video submissions | AES-256 (server-side) | TLS 1.3 + chunked upload | Per-customer key; auto-deleted after retention |
| Interview transcripts | AES-256 | TLS 1.3 | Per-customer key |
| Audit log | AES-256 + HMAC | TLS 1.3 | HSM-backed key |

### Threat Model

| Threat | Mitigation |
|---|---|
| Model inversion via matching API (inferring training data from model outputs) | Rate limiting on matching API; outputs are rankings, not raw embeddings; feature attributions show skill-level explanations, not raw feature values |
| Bias monitor bypass (submitting decisions without triggering batch) | Bias monitoring reads directly from audit log event stream, not from service API; cannot be bypassed by API layer |
| Demographic data exfiltration | Network-level isolation of demographic store; all access goes through bias_monitor service with audit logging; no direct query path |
| Profile enumeration via candidate_id | UUIDs are randomly generated; API requires authentication; candidates can only access their own profile |
| Video analysis result tampering | Interview reports are written to audit log at generation time; subsequent edits to reports are detected by audit log chain verification |
| GDPR erasure bypass | Erasure pipeline writes completion record to audit log before marking erasure complete; incomplete erasure (missing subsystem) detected by completeness check |
