# 12.16 Product Analytics Platform — Security & Compliance

## Threat Model

A product analytics platform sits at the intersection of three sensitive data categories: user behavioral data (what users do inside products), user identity data (who those users are), and business intelligence (conversion rates, revenue funnel performance). Threats arise from three directions: external attackers seeking bulk behavioral data for competitive intelligence or user profiling; compromised customer credentials enabling cross-tenant data access; and the platform operator itself, which holds sensitive behavioral data and must demonstrate it does not misuse or over-retain it.

---

## PII in Events: Detection and Handling

### The PII Problem in Analytics

Unlike structured databases where PII fields are known at schema design time, analytics events contain arbitrary key-value properties. A developer may inadvertently log `user.email` as an event property, a mobile SDK may capture clipboard contents, or a server-side event may include a full JWT with embedded user data. PII in the event stream is the most common compliance risk for analytics customers.

### Detection Pipeline

The governance scorer performs PII scanning on every incoming event's property values using a multi-signal approach:

**Signal 1: Pattern matching**
```
PII_PATTERNS = {
  "email":       REGEX r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
  "phone_us":    REGEX r"(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}",
  "ssn":         REGEX r"\b\d{3}-\d{2}-\d{4}\b",
  "credit_card": REGEX r"\b(?:\d[ -]*?){13,16}\b",  // Luhn-validated
  "ipv4":        REGEX r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
  "passport":    REGEX r"[A-Z]{1,2}\d{6,9}"
}
```

**Signal 2: Property key heuristics**
Property keys named `email`, `phone`, `ssn`, `password`, `token`, `auth`, `credit_card`, `card_number` are flagged regardless of value, as they are likely to contain PII even if current values are synthetic.

**Signal 3: Entropy analysis**
High-entropy strings (Shannon entropy > 4.5 bits/char) in string properties may be tokens or hashed identifiers. Flagged for human review, not automated blocking.

### PII Handling Actions

| Detection Level | Action |
|---|---|
| Confirmed PII (email, SSN, credit card) | Mask before storage: replace with `[REDACTED:email]`; fire governance alert to project owner |
| Suspected PII (high-entropy, known-key heuristic) | Store with flag `pii_suspected=true`; surface in Governance UI for owner review |
| IP address (always present) | Pseudonymize: zero last octet before storage (IPv4: X.X.X.0; IPv6: zero last 80 bits) |
| User-agent (always present) | Parse to device/OS/browser components; discard raw string after parsing |

PII masking happens in the stream processor before any write to storage. The raw unmasked event is never persisted beyond the collector's in-flight buffer.

---

## Data Anonymization

### User Identification Pseudonymization

The platform does not store raw user email addresses or names. The `user_id` field is a stable opaque identifier provided by the customer's application (typically a hashed or UUID-based internal ID, never raw PII). The platform treats `user_id` as an opaque string.

**Customer responsibility boundary:** Customers are responsible for ensuring their `user_id` values do not contain PII. The platform's PII scanner checks for email patterns in user\_id values and flags violations.

### K-Anonymity for Exported Data

When event data is exported to a customer's data warehouse, the export service applies k-anonymity filtering:
- Any breakdown group (e.g., funnel users with property combination X) with fewer than k=5 users is suppressed (count reported as `< 5` rather than the exact value)
- This prevents re-identification of individuals in small cohorts from exported analytical results
- K-threshold is configurable per project; minimum enforced value is 3

---

## Access Control

### Multi-Level Permission Model

```
Permission levels (hierarchical):

  Organization Admin
  └── Can manage billing, create/delete projects, add members

  Project Admin
  └── Can manage project settings, event schemas, API keys
  └── Can view all data including user-level event lookup

  Project Analyst
  └── Can view aggregated analytics (funnels, retention, cohorts)
  └── Cannot view individual user event history
  └── Cannot export raw events

  Project Viewer
  └── Read-only access to saved dashboards and saved queries
  └── Cannot run ad hoc queries
  └── Cannot view user-level data

  Export Service Account
  └── Write-only API key for event ingestion (cannot read data)
  └── Time-limited API key (rotated every 90 days)
```

**Capability enforcement:** Each API request carries a project-scoped API key or user OAuth token. The API gateway resolves the principal's role and attaches capability tags to the request. The query layer enforces capability checks: user-lookup queries require `USER_LEVEL_ACCESS` capability; raw export requires `DATA_EXPORT` capability.

### Row-Level Project Isolation

Storage layer access is enforced by project\_id scoping at the query planner level, not at the application layer. The query planner injects a mandatory `WHERE project_id = {requesting_project_id}` predicate into every query plan. This predicate cannot be overridden by API parameters and is enforced even for internal system queries.

**Verification:** Integration tests continuously run cross-project query attempts and assert they return zero results, serving as a security regression suite.

---

## GDPR and Right-to-Erasure

### Erasure Process

GDPR Article 17 requires personal data erasure within 30 days of a valid request. The platform implements erasure via a multi-phase process:

**Phase 1 — Soft deletion (immediate, < 1 hour):**
1. The user\_id is added to a per-project erasure list stored in the identity resolution service
2. The identity resolution service stops resolving this user\_id in new queries
3. The user's entry in the user\_properties SCD table is deleted
4. Session replay recordings linked to this user\_id are flagged for deletion
5. API responses for analytics queries automatically exclude events by this user\_id (runtime filter)

**Phase 2 — Hard deletion (compaction, < 30 days):**
1. A background erasure job scans all Parquet partitions for events with the target user\_id
2. For each matching event: rewrite the Parquet file with that row omitted (tombstone approach is not used—Parquet files are immutable; deletion requires file rewrite)
3. After rewrite, the old file is marked for garbage collection
4. The queue is scanned for any in-flight events by this user\_id (evicted if found)
5. The bloom filter entries for event\_ids from this user are cleaned up

**Verification:** After Phase 2 completes, the erasure job runs a verification scan across all tiers for the target user\_id and asserts zero matches. The verified erasure is logged to an immutable audit trail (separate append-only log store).

### Data Retention Policies

```
Retention policy configuration (per project):

  hot_store_retention:      24 hours (fixed)
  warm_store_retention:     90 days (default, configurable 30–180 days)
  cold_store_retention:     730 days (default, configurable 365–3650 days)
  user_properties_retention: follows cold_store_retention

  After cold_store_retention:
    Events are permanently deleted via compaction (not archived)
    Rollup tables retain pre-aggregated data without user_id linkage (anonymized)
```

---

## Encryption

### Encryption at Rest

All storage tiers encrypt data at rest using AES-256:
- Hot store (in-memory): data is encrypted before eviction to NVMe; in-memory data not encrypted (within process boundary)
- Warm store (NVMe/SSD): filesystem-level encryption using managed key material
- Cold store (object storage): server-side encryption with per-project key isolation; customer-managed key (CMK) option available for Enterprise plans

**Key rotation:** Encryption keys are rotated annually. Old keys are retained for the duration of data encrypted under them, then destroyed. Key material is managed via a managed KMS service external to the analytics platform.

### Encryption in Transit

All SDK-to-collector communication is encrypted with TLS 1.3 minimum. Internal service-to-service communication within the platform uses mTLS for mutual authentication. Message queue connections use TLS with certificate pinning.

### Tokenization of Sensitive Properties

For projects that must pass sensitive properties (e.g., order amounts, subscription tier changes) through the analytics pipeline without risk of PII exposure, the platform offers a client-side tokenization SDK:
- Sensitive values are tokenized before SDK transmission: a stable token replaces the raw value
- The tokenization key is held by the customer, never by the analytics platform
- Analytics queries work on tokens; to dereference, the customer joins the exported data with their tokenization table externally

---

## Audit Logging

All data access operations are written to an append-only audit log stored separately from the analytics data store:

| Event Type | Logged Fields |
|---|---|
| Query executed | principal, project\_id, query\_type, query\_hash, date\_range, execution\_time\_ms, result\_row\_count |
| User-level lookup | principal, project\_id, target\_user\_id, accessed\_at |
| Data export initiated | principal, project\_id, export\_destination, record\_count, initiated\_at |
| API key created/rotated | principal, project\_id, key\_type, created\_at |
| Erasure request | requesting\_principal, project\_id, target\_user\_id, phases\_completed, verified\_at |
| Permission change | acting\_principal, target\_principal, old\_role, new\_role |

Audit logs are retained for 7 years to satisfy regulatory requirements. They are stored in a write-once append-only system where even platform administrators cannot modify or delete entries.
