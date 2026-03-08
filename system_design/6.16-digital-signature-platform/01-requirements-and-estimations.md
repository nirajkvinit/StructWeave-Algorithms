# Requirements & Estimations

## Functional Requirements

### Core Features (In Scope)

1. **Envelope & Document Management**
   - Upload one or more documents (PDF, Word, images) into an envelope
   - Convert non-PDF documents to PDF for standardized processing
   - Support envelope templates for reusable document + field configurations

2. **Signer Invitation & Sequencing**
   - Add multiple signers with defined roles (signer, carbon copy, in-person signer, witness)
   - Define signing order: sequential, parallel, or hybrid (groups that sign in parallel, groups that are sequential)
   - Support conditional routing (if Signer A declines, route to Signer B)

3. **Field Placement**
   - Place signature fields at precise PDF coordinates (signature, initials, date signed, text input, checkbox, dropdown)
   - Assign fields to specific signers
   - Support required and optional fields
   - Auto-place fields using anchor text detection ("Sign Here: _____")

4. **Electronic Signature Capture**
   - Click-to-sign (type name, apply as signature)
   - Draw signature (touch/mouse)
   - Upload signature image
   - Typed signature with font selection
   - Saved signature reuse across sessions

5. **Digital Signatures (PKI-Based)**
   - Certificate-based signatures using X.509 certificates
   - HSM-backed signing for Advanced and Qualified Electronic Signatures
   - Support for third-party certificate providers (Qualified Trust Service Providers)

6. **Notifications**
   - Email notification to signers when it is their turn to sign
   - Completion notification to all parties when envelope is fully signed
   - Reminder emails for pending signatures (configurable intervals)
   - Decline/void notifications

7. **Tamper-Evident Audit Trail**
   - Record every action: envelope created, sent, viewed, signed, declined, voided
   - Capture IP address, timestamp, user agent, geolocation for every event
   - Hash-chain all events for tamper detection
   - Generate downloadable audit certificate

8. **Document Sealing & Certificate of Completion**
   - Embed cryptographic signatures into completed PDF (PKCS#7/CAdES format)
   - Generate certificate of completion as a standalone document
   - Ensure any post-signing modification is detectable

9. **Template Management**
   - Create reusable templates with pre-placed fields and default routing
   - Template versioning
   - Bulk send: one template → thousands of recipients with per-recipient customization

10. **Bulk Send**
    - Send a single template to 1,000-50,000 recipients in one operation
    - Per-recipient field customization (name, email, custom fields)
    - Progress tracking for bulk operations
    - Throttled delivery to avoid email provider rate limits

### Out of Scope

- Real-time collaborative document editing (see 6.2/6.8)
- Contract lifecycle management (CLM) beyond signature
- AI-powered contract analysis or clause extraction
- Payment collection integrated with signing
- Notarization (requires separate video/identity verification flow)

---

## Non-Functional Requirements

### Consistency & Availability

| Requirement | Target | Justification |
|------------|--------|---------------|
| **Consistency Model** | Strong consistency for signature records and audit trail; eventual consistency for notifications and search | A signed document must never lose a signature record---this is a legal requirement |
| **Availability** | 99.99% (52 minutes downtime/year) | Business-critical; delayed signatures can block multi-million-dollar transactions |
| **Durability** | 99.999999999% (11 nines) for completed envelopes | Signed documents are legal records; loss is unacceptable |
| **CAP Choice** | CP for signature records; AP for notifications | Signature integrity cannot be sacrificed for availability |

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Envelope creation | 200ms | 500ms | 1s |
| Document upload (10MB) | 1s | 3s | 5s |
| Signature capture (click-to-sign) | 100ms | 300ms | 500ms |
| PDF rendering for signing view | 500ms | 1.5s | 3s |
| Document sealing (all signatures embedded) | 1s | 3s | 5s |
| Audit trail retrieval | 200ms | 500ms | 1s |
| HSM signing operation | 50ms | 100ms | 200ms |
| Signer email delivery | 5s | 30s | 60s |

### Immutability Requirements

| Data Type | Mutability | Retention |
|-----------|-----------|-----------|
| Completed envelope (sealed PDF) | **Immutable** --- no modification after sealing | 7-10 years minimum; configurable per org |
| Audit trail events | **Append-only** --- no updates, no deletes | Same as envelope retention |
| Signature records | **Immutable** --- cryptographically sealed | Same as envelope retention |
| Draft envelopes | Mutable until sent | 30 days if unsent |
| Templates | Versioned --- edits create new versions | Indefinite |

---

## Scale Estimations

### Assumptions

| Parameter | Value | Source |
|-----------|-------|--------|
| Total organizations | 1,000,000 | DocuSign-scale platform |
| Active organizations (monthly) | 400,000 (40%) | Enterprise + SMB mix |
| Envelopes per active org per month | 50 (average) | Mix of low-volume SMB and high-volume enterprise |
| Envelopes per day | 5,000,000 / 30 ≈ 670,000 | 20M envelopes/month |
| Peak multiplier | 3x average | Month-end / quarter-end spikes |
| Documents per envelope | 2.5 (average) | Typical contract packages |
| Signers per envelope | 2.3 (average) | Sender + 1-2 additional signers |
| Average document size | 2MB (PDF) | Standard contracts with images |
| Audit events per envelope lifecycle | 15 (average) | Create, send, view×2, sign×2, complete, seal, download×2, etc. |

### Capacity Calculations

#### Throughput

```
Daily envelopes:        670,000
Peak daily envelopes:   670,000 × 3 = 2,010,000
Envelopes per second:   670,000 / 86,400 ≈ 8 eps (average)
Peak eps:               2,010,000 / 86,400 ≈ 23 eps
Signature operations:   670,000 × 2.3 = 1,541,000 signatures/day
Peak signatures/sec:    1,541,000 × 3 / 86,400 ≈ 54 sps

Bulk send operations:   1,000/day (average)
Bulk send fan-out:      1,000 × 5,000 avg recipients = 5,000,000 envelopes/day from bulk alone
Total daily envelopes (with bulk): 670,000 + 5,000,000 = 5,670,000
```

#### Storage

```
Document storage:
  Daily:    5,670,000 envelopes × 2.5 docs × 2MB = 28.4 TB/day
  Monthly:  28.4 TB × 30 = 852 TB/month
  Yearly:   852 TB × 12 = 10.2 PB/year
  5-Year:   ~51 PB (with deduplication: ~35 PB)

Audit trail storage:
  Daily events:  5,670,000 × 15 events = 85,050,000 events/day
  Event size:    ~500 bytes (JSON with hash chain)
  Daily:         85M × 500B = 42.5 GB/day
  Yearly:        42.5 GB × 365 = 15.5 TB/year
  5-Year:        ~78 TB

Metadata storage (envelope state, signer records, field data):
  Per envelope:  ~5KB metadata
  Daily:         5,670,000 × 5KB = 28 GB/day
  Yearly:        ~10 TB/year

Total storage (Year 1):  ~10.2 PB (documents) + 15.5 TB (audit) + 10 TB (metadata) ≈ 10.2 PB
Total storage (Year 5):  ~51 PB documents + 78 TB audit + 50 TB metadata ≈ 51 PB
```

#### Bandwidth

```
Upload bandwidth:
  28.4 TB/day = 28,400 GB / 86,400s ≈ 329 MB/s average
  Peak: 329 MB/s × 3 ≈ 987 MB/s ≈ 8 Gbps

Download bandwidth (signed documents retrieved):
  Assume 30% of completed envelopes downloaded within 24h:
  5,670,000 × 0.3 × 2.5 docs × 2MB = 8.5 TB/day
  Peak download: ~3 Gbps

Notification bandwidth:
  5,670,000 envelopes × 2.3 signers × 3 emails avg = 39M emails/day
```

#### HSM Capacity

```
HSM signing operations:
  Signature captures requiring HSM:  ~20% of total (AES/QES level)
  HSM ops/day:  5,670,000 × 2.3 × 0.20 = 2,608,200
  HSM ops/sec (average): 30
  HSM ops/sec (peak):    90
  HSM throughput needed:  ~100 signing operations/second per HSM cluster
```

---

## SLOs / SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.99% | Measured at API gateway; excludes planned maintenance windows |
| **Envelope creation latency (p99)** | < 1s | Time from API call to envelope ID returned |
| **Signature capture latency (p99)** | < 500ms | Time from signature submission to confirmation |
| **Document sealing latency (p99)** | < 5s | Time from last signature to sealed PDF available |
| **Audit trail integrity** | 100% | Zero audit events lost or tampered; verified by hash chain |
| **Email delivery (p95)** | < 30s | Time from trigger to email sent to provider |
| **Error rate** | < 0.1% | Failed API calls / total API calls |
| **Document durability** | 99.999999999% | Zero document loss over platform lifetime |
| **HSM availability** | 99.999% | HSM cluster uptime; signature operations must not be blocked |
| **Bulk send throughput** | 10,000 envelopes/minute | Maximum sustained rate for bulk operations |

---

## Growth Projections

| Metric | Year 1 | Year 3 | Year 5 |
|--------|--------|--------|--------|
| Daily envelopes | 5.7M | 12M | 20M |
| Document storage | 10 PB | 30 PB | 51 PB |
| Audit events/day | 85M | 180M | 300M |
| HSM operations/day | 2.6M | 6M | 10M |
| Concurrent signing sessions | 100K | 250K | 500K |
