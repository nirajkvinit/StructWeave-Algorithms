# 06 — Security and Compliance: Customer Data Platform

## Threat Model

### Assets Under Protection

| Asset | Sensitivity | Threat |
|---|---|---|
| Customer PII (email, phone, name) | Critical | Unauthorized read/exfil, cross-tenant access |
| Behavioral event history | High | Unauthorized read, profiling misuse |
| Identity graph | High | Linkage attack to re-identify anonymous users |
| Destination credentials | Critical | Credential theft enabling data exfil to attacker-controlled systems |
| Consent records | Critical | Tampering to bypass consent enforcement |
| Audit log | High | Tampering to hide unauthorized access |

### Threat Actors and Attack Vectors

| Actor | Vector | Mitigation |
|---|---|---|
| External attacker | Compromised write key → data injection | Write key rotation; rate limiting; schema validation blocks unexpected payloads |
| External attacker | API enumeration of profile data | Profile lookup requires access token (not write key); rate limiting; no bulk enumeration API |
| Malicious insider | Direct database access to read PII | Database access via service accounts only; PII encrypted at rest; access logged in audit trail |
| Compromised destination | Destination credentials used to exfil data | Credentials stored in managed KMS; only decrypted by delivery worker; never returned via API |
| Cross-tenant data leak | Tenant isolation failure in multi-tenant query | Strict `workspace_id` predicate on every query; enforced at ORM/query-builder layer |
| Supply chain attack | Malicious SDK | SDK binary signing and integrity verification; CSP headers for web SDK |
| SDK code injection | Malicious events crafted to trigger SSRF via destination webhooks | Destination URL validation (allowlist of valid schemes/domains); SSRF protection in HTTP client |

---

## PII Handling

### PII Classification

All event properties and profile traits are classified at schema registration time. PII classification levels:

| Level | Examples | Storage Treatment |
|---|---|---|
| Level 0 (Public) | Product ID, page URL, event name | Stored and forwarded as-is |
| Level 1 (Sensitive) | First name, last name, user agent | Encrypted at rest; may be forwarded if destination allows |
| Level 2 (Highly Sensitive) | Email, phone, IP address | Encrypted at rest; hashed before cross-system forwarding by default |
| Level 3 (Regulated) | Health data, financial data, biometrics | Encrypted at rest with separate key; forwarded only with explicit per-destination configuration and enhanced consent |

### Email and Phone Handling

Email and phone are stored in two forms in the profile:
- **Encrypted plaintext**: stored encrypted with workspace-specific key in the profile store (for display in management UI, right-to-access response)
- **Normalized hash**: SHA-256 of the lowercase, E.164-normalized value (for identity matching and forwarding to destinations that accept hashed PII)

Plaintext email/phone never appear in event payloads forwarded to destinations. Destinations that need plaintext PII must be explicitly configured and require Level 3 consent from the user.

### IP Address Treatment

IP addresses received at the edge are used for geo-enrichment (country, region, city, ISP) and then either:
- Dropped entirely (most privacy-conscious configuration)
- Truncated to /24 (IPv4) or /48 (IPv6) before storage
- Stored encrypted with 90-day TTL

Full IP addresses are never forwarded to destinations.

### Data Minimization

The schema registry enforces data minimization rules:
- Properties marked as "ephemeral" are used for real-time enrichment only and dropped after processing
- Properties marked as "transform: hash" are hashed before storage
- Properties marked as "transform: drop_before_destination" are stripped from delivery payloads

---

## Consent Management Architecture

### Consent Data Model

```
ConsentRecord {
  profile_id:       UUID
  workspace_id:     UUID
  purpose:          String (e.g., "marketing", "analytics", "personalization", "sale_of_data")
  status:           Enum { granted | denied | unknown }
  legal_basis:      Enum { consent | legitimate_interest | contract | legal_obligation }
  jurisdiction:     String (e.g., "EU", "CA", "global")
  granted_at:       ISO8601?
  revoked_at:       ISO8601?
  source:           String (e.g., "cookie_banner", "preference_center", "import")
  consent_string:   String? (IAB TCF consent string for EU cookie consent)
  version:          Int (incremented on every change; used for conflict resolution)
}
```

### Consent Propagation

Consent changes are propagated through the system via a dedicated consent event stream. When a user updates consent in the preference center:

1. ConsentRecord updated in the profile store (ACID write)
2. Consent change event emitted to the consent event stream
3. Consent enforcement layer reads the stream and updates its in-memory consent cache (serving consent checks at ingest and fan-out)
4. Ongoing fan-out workers re-check consent against the updated cache on next dequeue cycle
5. Destinations configured to receive consent change events are notified (for downstream consent propagation)

The consent cache is a read-through cache with a short TTL (30 seconds). This means a consent revocation takes effect within 30 seconds in the delivery path — acceptable for most regulatory requirements.

### Purpose-Based Routing

Each destination is configured with a set of required consent purposes. The fan-out router enforces:

```
FUNCTION profileConsentedForDestination(profile, destination) -> Bool:
  FOR each required_purpose in destination.consent_purposes:
    consent = profile.consent[required_purpose]
    IF consent IS NULL OR consent.status != "granted":
      RETURN false
  RETURN true
```

This means a destination configured for "marketing" purpose will only receive deliveries for users who have explicitly granted marketing consent. Users who have denied or not responded are automatically excluded, with the exclusion recorded in the audit log.

### GDPR vs. CCPA Model Differences

| Aspect | GDPR (EU) | CCPA/CPRA (California) |
|---|---|---|
| Default | No processing without lawful basis; consent is opt-in | Processing allowed by default; opt-out available |
| Consent model | Explicit granular consent per purpose | Right to opt out of "sale/sharing" of personal data |
| Implementation | Consent required before event is accepted | Events accepted; "do not sell" flag gates destinations marked as "data sale" |
| Right to erasure | Yes, mandatory within 30 days | Yes (right to delete), within 45 days |
| Data subject access | Right to access all data | Right to know categories and specific pieces |

The platform supports both models simultaneously. Each workspace is configured for its applicable jurisdictions. Profiles from EU users are subject to GDPR rules; profiles from California users are subject to CCPA rules. Profiles may be subject to both if the user is in both jurisdictions.

---

## Right-to-Erasure Pipeline

### Pipeline Stages

When an erasure request is received:

```
Stage 1: Validation (< 1 minute)
  - Verify requester identity and authorization
  - Locate profile by identifier
  - Mark profile as "erasure_requested" in fast-path lookup (immediately blocks new event processing)

Stage 2: Live Store Erasure (< 1 hour)
  - Delete profile document from profile store
  - Remove all identity graph nodes for this profile
  - Delete from audience membership cache
  - Purge pending delivery records from destination queues

Stage 3: Event Store Erasure (< 24 hours)
  - Identify all events in the append-only event store linked to this profile
  - For immutable log tiers: overwrite PII fields with null/tombstone markers
  - Update event store index to exclude this profile from future reads

Stage 4: Warehouse Export Erasure (< 7 days)
  - Issue deletion requests to customer-configured warehouse destinations
  - For warehouses that don't support point deletes: issue a suppression list that
    query layers must apply, or require customer to run DELETE SQL

Stage 5: Archive Erasure (< 30 days)
  - Identify backup and cold archive files containing this profile's events
  - Mark files for re-processing with PII stripping on next access
  - For tape/WORM storage: note in erasure record that archive data will be overwritten at next
    scheduled archive rotation

Stage 6: Confirmation (< 30 days)
  - Generate cryptographically signed erasure certificate listing all stages completed
  - Retain erasure record in audit log (non-PII: erasure_request_id, profile_id_hash, completion_timestamps)
```

### Erasure in Immutable Logs

The challenge of erasure in append-only event logs requires careful design. Three approaches:

1. **Crypto-shredding**: Each profile's events are encrypted with a profile-specific key. To erase, delete the key. Without the key, the ciphertext is effectively unreadable. Fast, scalable, but requires per-profile key management at scale.

2. **Compaction with PII stripping**: Mark events for erasure; during the next log compaction, strip PII fields. Slower (days to take effect) but simpler.

3. **Event suppression index**: Maintain a list of erased `profile_id` values. Query layers apply this suppression list before returning results. Data remains on disk but is invisible to all query paths.

Production CDPs often combine these: crypto-shredding for active data, compaction for archived data, suppression index as an interim measure.

---

## Audit Trail

The audit log records every significant action in the system:

| Event Category | Examples |
|---|---|
| Data access | Profile read via API; bulk export initiated |
| Profile mutations | Profile created, merged, split, trait updated |
| Consent changes | Consent granted, revoked, updated for a purpose |
| Identity resolution | Merge performed; split performed; identifier linked |
| Erasure | Request received, each stage completed, certificate issued |
| Destination activity | Destination created, credential updated, circuit opened |
| Administrative | Schema registered, workspace settings changed, user permissions changed |

The audit log is:
- **Append-only**: no record can be modified or deleted (enforced at the storage layer)
- **Cryptographically chained**: each record includes the hash of the previous record (Merkle-chain structure allows tamper detection)
- **Replicated**: synchronously written to at least two storage locations before acknowledgment
- **Retained** for 7 years (configurable per workspace to meet different regulatory retention requirements)

---

## SOC 2 Controls Summary

| SOC 2 Criterion | Implementation |
|---|---|
| CC6.1 (Logical access) | Role-based access control; principle of least privilege; MFA required for management UI |
| CC6.2 (New access provisioning) | Access granted via formal provisioning workflow; quarterly access review |
| CC6.3 (Access removal) | Automated de-provisioning on employee offboarding |
| CC6.6 (Transmission protection) | TLS 1.3 for all data in transit; certificate pinning for SDK |
| CC6.7 (Encryption at rest) | AES-256 for all storage tiers; per-workspace encryption keys |
| CC7.2 (Anomaly monitoring) | Real-time anomaly detection on data access patterns; alerting on off-hours bulk reads |
| CC9.2 (Vendor risk) | Destination credentials stored in managed KMS; vendor security questionnaires |
| A1.2 (Availability) | Multi-AZ deployment; automated failover; tested DR runbooks |
