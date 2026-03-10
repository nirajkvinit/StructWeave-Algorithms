# 13.2 AI-Native Logistics & Supply Chain Platform — Security & Compliance

## Regulatory Landscape

The logistics and supply chain platform operates at the intersection of international trade compliance, food safety regulation, driver privacy law, and supply chain security programs. Multiple regulatory frameworks impose overlapping obligations across different geographies and cargo types.

### Supply Chain Security Programs

#### CTPAT (Customs-Trade Partnership Against Terrorism) — US

CTPAT is a voluntary US Customs and Border Protection program that provides expedited customs processing for certified importers, carriers, and logistics providers in exchange for demonstrating supply chain security best practices.

**System obligations:**

| Requirement | Implementation |
|---|---|
| Cargo tracking and visibility | End-to-end shipment tracking with tamper-evident seal verification at each handoff point; audit trail of all custody transfers |
| Access control for shipment data | Role-based access control ensuring that only authorized personnel can view or modify shipment records; per-tenant data isolation |
| Physical security documentation | Integration with facility security systems for dock door access logs, surveillance footage timestamps linked to shipment events |
| Container inspection records | Structured recording of container inspection results (7-point inspection) with photo evidence stored in tamper-evident object storage |
| Incident reporting | Automated alert pipeline for security anomalies (unexpected route deviations, seal breaks, unauthorized access attempts) |

#### AEO (Authorized Economic Operator) — EU

The EU AEO program provides customs simplifications for certified traders. Requirements align with CTPAT but include additional data handling and risk assessment obligations.

| Requirement | Implementation |
|---|---|
| Risk assessment documentation | Automated risk scoring for each shipment based on origin, commodity type, carrier history, and route |
| Self-assessment questionnaire | System generates pre-filled AEO Self-Assessment Questionnaire from platform data (shipment volumes, carrier certifications, security measures) |
| Continuous monitoring | Real-time compliance monitoring dashboard showing AEO-relevant metrics; alert on deviations from certified practices |

### Cold Chain Compliance

#### FDA FSMA (Food Safety Modernization Act) — US

The FSMA Sanitary Transportation rule requires temperature-controlled transportation of food to maintain safe conditions throughout the supply chain.

**System obligations:**

| Requirement | Implementation |
|---|---|
| Continuous temperature monitoring | IoT sensor readings every 60 seconds; readings stored with tamper-evident timestamps |
| Temperature excursion documentation | Automated detection when temperature exits the defined range; excursion report with duration, max deviation, and corrective action taken |
| Shipper-carrier agreement documentation | Structured records of agreed temperature specifications per shipment type |
| Vehicle pre-cooling verification | Sensor-confirmed pre-cooling completion before cargo loading; pre-cool certificate generated automatically |
| Audit trail retention | 2-year retention of all temperature records, excursion reports, and corrective actions in immutable storage |

#### EU GDP (Good Distribution Practice) — EU

EU GDP governs the distribution of medicinal products and requires documented temperature control throughout the supply chain.

| Requirement | Implementation |
|---|---|
| Qualification of transport equipment | Vehicle and container qualification records linked to shipment assignments; alerts if unqualified vehicle assigned to GDP shipment |
| Deviation management | Temperature excursions generate deviation records requiring disposition decision (release, quarantine, reject) with documented rationale |
| Annual GDP audit support | System generates audit-ready reports: temperature compliance rates, deviation summaries, vehicle qualification status |

### HACCP (Hazard Analysis Critical Control Points)

HACCP requires identification and monitoring of critical control points in the food supply chain.

| Requirement | Implementation |
|---|---|
| Critical control point monitoring | Temperature checkpoints at pickup, each transfer point, and delivery; automated compliance verification at each CCP |
| Corrective action records | When a CCP limit is exceeded, the system records the corrective action taken and who authorized the disposition decision |
| Verification records | Periodic verification that monitoring equipment (sensors) is calibrated; calibration certificates linked to sensor IDs |

---

## Driver Privacy and Telematics Data

### GDPR Compliance for Driver Telematics (EU)

Driver location tracking via telematics is classified as personal data processing under GDPR. The platform must balance operational requirements (fleet visibility, route compliance, safety monitoring) with driver privacy rights.

| Obligation | Implementation |
|---|---|
| Lawful basis for processing | Legitimate interest for fleet management; explicit consent for driving behavior scoring used in performance evaluation |
| Purpose limitation | Telematics data collected for operational purposes (route tracking, safety, maintenance) may not be repurposed for surveillance or disciplinary action without separate consent |
| Data minimization | Location precision reduced after delivery completion (exact GPS → city-level); historical routes retained at reduced resolution |
| Driver access rights | Drivers can request export of their telematics data through a self-service portal; fulfilled within 30 days |
| Off-duty privacy | Telematics collection paused or anonymized during off-duty hours; driver mobile app allows explicit clock-out that stops location reporting |
| Data retention | Operational telematics retained for 90 days at full resolution; aggregated to daily summaries after 90 days; summaries retained for 3 years for safety compliance; then purged |

### ELD (Electronic Logging Device) Compliance — US

US FMCSA requires electronic logging of driver hours of service (HOS). The platform's fleet management module integrates ELD data.

| Requirement | Implementation |
|---|---|
| Tamper-resistant logging | HOS records written to append-only store; driver cannot edit after 24-hour certification window |
| Roadside inspection access | ELD data exportable in standard format for DOT roadside inspections via Bluetooth or USB |
| Data retention | 6 months of ELD records retained per FMCSA requirement; archived in immutable storage |

---

## Data Architecture and Tenant Isolation

### Multi-Tenant Shipment Data Isolation

Shipment data is competitively sensitive—a shipper's shipping volumes, carrier choices, and supply chain network structure are proprietary business intelligence.

```
Tenant isolation design:
  Storage:     All tables partitioned by tenant_id; queries include tenant_id filter
               enforced at the query layer (not just application logic)
  Encryption:  Per-tenant encryption keys in managed KMS; key rotation every 90 days
  Access:      API authentication yields tenant context; all downstream queries scoped
  Audit:       Every data access logged with {accessor, tenant_id, resource, timestamp}

  Cross-tenant data:
    Carrier performance data is aggregated ACROSS tenants (carrier scorecard)
    But: individual shipment details are NEVER visible across tenants
    Aggregation rule: carrier statistics computed from ≥ 50 shipments across ≥ 5 tenants
    to prevent reverse engineering of any single tenant's volume
```

### Carrier Data Handling

Carriers share data with the platform (tracking, capacity, rates) under contractual agreements that restrict redistribution. The platform must ensure:

- Carrier rate data is visible only to the tenant who received the rate quote; never exposed to other shippers or competing carriers
- Carrier capacity data (available trucks, available lanes) is anonymized when used for aggregate market intelligence
- Carrier performance scores are computed from multi-tenant data but presented without revealing which tenants contributed to the score

---

## API Security

### Carrier API Integration Security

The platform integrates with 80,000+ carriers, each with different API authentication mechanisms:

```
Integration security:
  Authentication:
    - OAuth 2.0 for modern carrier APIs
    - API key + HMAC for legacy carrier APIs
    - AS2 with digital certificates for EDI integrations
    - mTLS for high-security carrier connections

  Credential management:
    - All carrier credentials stored in managed secrets store (not in application config)
    - Per-carrier API key rotation policy (90-day default; 30-day for high-risk carriers)
    - Automated credential rotation with zero-downtime key swap

  Rate limiting:
    - Per-carrier rate limits enforced at connector hub level
    - Carrier API rate limit metadata stored per connector
    - Exponential backoff on 429 responses; circuit breaker after 5 consecutive failures

  Data validation:
    - All carrier API responses validated against expected schema before ingestion
    - Malformed responses logged and quarantined; not propagated to downstream services
    - Input sanitization on all carrier-provided text fields (shipment reference numbers,
      driver names) to prevent injection attacks
```

### Customer-Facing Tracking Page Security

The tracking page is publicly accessible (customers receive a tracking link without authentication). Security requirements:

| Threat | Mitigation |
|---|---|
| Shipment enumeration | Tracking IDs are cryptographically random UUIDs; no sequential or predictable pattern |
| Sensitive data exposure | Tracking page shows: status, ETA, city-level location. Does NOT show: exact GPS coordinates, cargo contents, shipper identity, carrier identity, pricing |
| Tracking link leakage | Tracking links expire 30 days after delivery; after expiry, page shows "delivered" status only |
| Bot scraping | Rate limiting per IP; CAPTCHA after 10 rapid tracking page requests from same IP |

---

## Audit Trail Design

### Cold Chain Audit Trail

Cold chain audit records must be tamper-evident, timestamped with trusted time sources, and retained for regulatory review:

```
cold_chain_audit_entry {
  entry_id:        UUID
  shipment_id:     UUID
  event_type:      enum  -- SENSOR_READING | EXCURSION_DETECTED | EXCURSION_RESOLVED |
                         -- PRE_COOL_VERIFIED | CCP_CHECK | DISPOSITION_DECISION
  timestamp:       timestamp (from trusted NTP source, not sensor clock)
  sensor_id:       string
  reading:         {temperature_c, humidity_pct, location}
  excursion_detail: {threshold_c, actual_c, deviation_c, duration_sec} | null
  actor:           string          -- sensor_id, system_id, or user_id
  disposition:     string | null   -- RELEASE | QUARANTINE | REJECT (for disposition decisions)
  rationale:       string | null   -- human-provided rationale for disposition
  prev_entry_hash: bytes[32]       -- SHA-256 of previous entry (hash chain)
  entry_hmac:      bytes           -- HMAC-SHA256 with HSM-backed key
}

Retention: 7 years for pharmaceutical (GDP); 2 years for food (FSMA)
Storage: append-only, write-once storage; no delete path
Verification: daily hash chain integrity check from last verified checkpoint
```

---

## Security Controls Summary

| Data Category | At Rest | In Transit | Key Management |
|---|---|---|---|
| Shipment records | AES-256, per-tenant key | TLS 1.3 | Per-tenant key in managed KMS |
| Driver telematics | AES-256, per-fleet key | TLS 1.3 | Separate key hierarchy from shipment data |
| Cold chain readings | AES-256, dedicated key | TLS 1.3 | Per-customer key; HSM-backed for audit trail |
| Carrier credentials | AES-256 in secrets store | TLS 1.3 + mTLS for AS2 | Managed secrets store with auto-rotation |
| Demand forecasts | AES-256, per-tenant key | TLS 1.3 | Per-tenant key (forecasts are competitively sensitive) |
| Customer tracking data | AES-256 | TLS 1.3 | Platform-wide key (no PII on tracking page) |
