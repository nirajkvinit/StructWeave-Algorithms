# Key Architectural Insights

## Insight 1: Hash-Chained Audit Logs --- Why a Simple Audit Table Is Legally Insufficient

**Category**: Data Integrity & Compliance

**One-liner**: A database audit table with auto-increment IDs and timestamps is trivially modifiable by anyone with database access, making it legally useless for non-repudiation; a hash chain makes tampering mathematically detectable.

**Why it matters**:

The audit trail is the single most important component of a digital signature
platform, yet it is the most frequently under-designed in system design
discussions. In legal proceedings, the question is not "do you have a log that
says this person signed?" but "can you prove this log has not been modified
since the signing occurred?"

A standard audit table fails this test:

```
-- Trivially modifiable by anyone with database access:
id SERIAL, event TEXT, timestamp TIMESTAMPTZ, user_id UUID
```

A database administrator, a compromised application, or an insider threat
actor can insert rows, delete rows, modify timestamps, or reorder events.
There is no mathematical way to detect these changes after the fact. The
log says what someone with write access wants it to say.

A hash-chained audit log computes each event's hash over the event data
concatenated with the previous event's hash:

```
event_hash_N = SHA256(event_data_N + event_hash_N-1)
```

This creates a chain where any modification to any event causes a cascade
of hash mismatches that is computationally infeasible to repair. Modifying
Event 5 requires recomputing Event 5's hash. But Event 6 includes Event
5's original hash in its computation, so Event 6 must also be recomputed,
and so on through the entire chain.

**Defeating the full-chain recomputation attack**: An attacker who controls
the database can recompute the entire chain from the modification point
forward. This is defeated by periodic anchoring to a public RFC 3161 Time
Stamping Authority---an external, independent party that attests to the
chain head hash at a specific point in real-world time.

The TSA's timestamp proves that the chain state existed at that moment.
Any subsequent recomputation would produce a different chain head hash
that does not match the TSA's attestation.

**Per-envelope vs. global chains**: Hash chains must be per-envelope, not
global. A global chain creates a serialization bottleneck where every audit
event across the entire platform must be written sequentially---a
catastrophic constraint at 5 million envelopes per day.

Per-envelope chains allow fully parallel writes across different envelopes
while maintaining integrity within each envelope's lifecycle. Since the
signing ceremony for one envelope is legally independent of another, this
is the natural boundary.

| Attack Vector | Hash Chain Detection | Plain Audit Table Detection |
|--------------|---------------------|---------------------------|
| Modify event data | Hash mismatch at modified event | Undetectable |
| Delete an event | Next event's `previous_hash` points to missing event | Undetectable (gaps in auto-increment IDs are normal) |
| Insert fake event | Sequence gap or hash chain break | Undetectable (inserts are normal) |
| Reorder events | Both sequence numbers and hash chain detect | Undetectable (unless strict timestamp ordering enforced) |
| Recompute entire chain | TSA anchor mismatch | N/A (no external anchor) |

The cost per event is modest: one lock acquisition, one SHA-256 computation
(microseconds), one previous-hash read, and 64 bytes of additional storage.
Within an envelope, events are infrequent (10-20 over hours or days), so
the sequential dependency is negligible.

The alternative---an immutable append-only log service---provides tamper
resistance but not tamper evidence. The hash chain provides both: tamper
resistance (from the storage layer) and tamper evidence (from the
mathematical chain that any party can independently verify).

---

## Insight 2: eIDAS Qualification Levels --- Architecturally Different Systems, Not UI Toggles

**Category**: Compliance Architecture

**One-liner**: A Simple Electronic Signature (click-to-sign) and a Qualified Electronic Signature (HSM + identity-verified certificate) are not different UX flows on the same backend---they are fundamentally different cryptographic subsystems with different infrastructure requirements.

**Why it matters**:

A common mistake in designing a digital signature platform is treating
eIDAS's three signature levels (Simple, Advanced, Qualified) as a
configuration parameter---as if the same code path handles all three
with a flag that says "add more security." In reality, each level
requires different infrastructure, different external integrations,
and different trust relationships.

### Simple Electronic Signature (SES)

SES requires only that the signer performs an action (clicking, typing,
drawing) that the platform records. There is no cryptographic signing of
the document hash by the signer. The platform's audit trail is the sole
evidence that signing occurred.

Infrastructure needed:
- Web application
- Database
- Object store
- Notification service

This satisfies the ESIGN Act and eIDAS Article 25(1) for routine
commercial transactions. It is what most e-signature platforms offer by
default.

### Advanced Electronic Signature (AES)

eIDAS Article 26 requires that the signature is: (a) uniquely linked to
the signatory, (b) capable of identifying the signatory, (c) created
using data under the signatory's sole control, and (d) linked to the
data so that changes are detectable.

Meeting these requirements introduces:
- **HSMs**: Signing key must be under sole control and not extractable
- **X.509 certificates**: Key must be linked to signer identity
- **Multi-factor authentication**: Signer must authorize each key use
- **PKCS#7/CAdES generation**: Signature in standardized format

This is not a feature flag on SES---it is a parallel subsystem with its
own failure modes, scaling characteristics, and operational requirements.

### Qualified Electronic Signature (QES)

QES adds requirements that most platforms find hardest to implement:
- Signing device must be a **Qualified Signature Creation Device (QSCD)**
  certified by an EU supervisory body
- Certificate must be issued by a **Qualified Trust Service Provider (QTSP)**
  on a national Trusted List
- Signer identity verified against **government ID** by the QTSP

This introduces: QTSP integration (external APIs, SLAs, pricing),
identity verification workflows (ID upload, selfie matching, video
identification), certified HSMs (Common Criteria EAL4+ or FIPS 140-2 L3),
and CAdES-LTV signatures with long-term validation data.

### The Infrastructure Gap

| Component | SES | AES | QES |
|-----------|-----|-----|-----|
| Web application | Yes | Yes | Yes |
| Database | Yes | Yes | Yes |
| Object storage | Yes | Yes | Yes |
| HSM cluster | No | **Yes** | **Yes (certified QSCD)** |
| Certificate Authority | No | Yes (internal or external) | **QTSP only** |
| MFA service | No | **Yes** | **Yes** |
| Identity verification | No | No | **Yes (government ID)** |
| PKCS#7 generation | No | **Yes** | **Yes (CAdES-LTV)** |
| External trust service | No | No | **Yes (QTSP)** |

The architectural lesson: design these as separate, composable subsystems
from the start. SES is the base layer. AES adds a cryptographic signing
layer. QES adds identity verification and certification. Retrofitting AES
or QES onto an SES-only architecture requires changes to the data model,
API contracts, infrastructure, and legal framework---typically a 12-18
month effort costing more than building all three from the beginning.

---

## Insight 3: PDF Sealing Semantics --- Why Embedding a Signature Is Not the Same as Signing a Hash

**Category**: Cryptographic Design

**One-liner**: Embedding a signature image into a PDF is a visual action; signing a document hash and embedding the PKCS#7 block into the PDF's signature dictionary is a cryptographic action---and only the latter provides tamper detection that works without the originating platform.

**Why it matters**:

Two distinct operations are routinely conflated in system design discussions:

**Operation A: Visual signature embedding**
- Overlay an image (drawn signature, typed name) at PDF coordinates
- Provides visual evidence of signing intention
- Zero cryptographic integrity---any PDF editor can add/remove images
- No tamper detection

**Operation B: Cryptographic PDF signing**
- Compute SHA-256 hash over specific byte ranges of the PDF
- Sign the hash with a private key (RSA/ECDSA)
- Embed PKCS#7/CAdES signature block in PDF signature dictionary
- Any PDF reader can verify integrity without platform involvement

Only Operation B provides legally meaningful tamper detection.

### The ByteRange Mechanism

A PDF digital signature specifies a `/ByteRange` array:
`[start1, length1, start2, length2]`

These define two byte ranges covering the entire file except the signature
value itself (because signature bytes cannot be included in the data they
sign).

When verifying, a PDF reader:
1. Computes hash over the specified byte ranges
2. Compares to the hash in the PKCS#7 block
3. Any modification = different hash = signature invalid

### Multi-Signer Incremental Saves

PDF signatures use incremental saves---each signature appends to the file
without modifying existing bytes:

```
Original PDF:       [content bytes]
After Signer 1:     [content bytes][Sig1 incremental update]
After Signer 2:     [content bytes][Sig1 update][Sig2 incremental update]
After Signer 3:     [content bytes][Sig1 update][Sig2 update][Sig3 update]
```

Each signer's ByteRange covers all previous content and signatures:

- Signer 1's hash covers: original content
- Signer 2's hash covers: original content + Signer 1's signature
- Signer 3's hash covers: everything from Signers 1 and 2

The result is a chain where each later signature validates all earlier
content. Modifying any earlier content invalidates all subsequent signatures.

### The Platform Dependency Trap

A common architectural mistake: compute a PDF hash, sign it via HSM, and
store the signature in a database record instead of embedding it in the PDF.

This creates a fatal platform dependency. Without the platform's database,
the signature cannot be verified. If the platform goes offline, is acquired,
or is a party to the dispute, the document is no better than unsigned.

A properly sealed PDF with embedded PKCS#7 signatures is **self-verifying**.
Adobe Acrobat, Preview, or Foxit can validate signatures, verify the
certificate chain, and detect modifications without any network connection.

This self-verifying property is essential for legal proceedings where the
document may need to stand alone as evidence for years or decades after
the signing platform ceases to exist.

### Performance Benefit

Incremental saves are also efficient: sealing a 100-page PDF with 5 signers
does not rewrite the entire 2MB file five times. Each signer adds only a few
KB of incremental data (signature dictionary + PKCS#7 block). Original bytes
are never modified---preserving both performance and integrity.

---

## Insight 4: The Signer Session Design --- Short-Lived, Single-Use, Envelope-Bound

**Category**: Security Architecture

**One-liner**: Signer authentication must be short-lived, single-use, and tied to a specific envelope to prevent replay attacks, and the token must never be stored in plaintext because email is an inherently insecure transport channel.

**Why it matters**:

The signer authentication model is fundamentally different from standard
user authentication. Applying standard session management patterns to
signers creates security vulnerabilities.

| Property | Standard User Auth | Signer Auth |
|----------|-------------------|-------------|
| Account | Persistent, registered | Ephemeral, may never register |
| Credential delivery | User-chosen password or SSO | Platform-generated token via email |
| Session duration | Hours to days | Minutes to hours |
| Scope | All user resources | Single envelope, single signer |
| Transport security | User enters over HTTPS | Delivered via email (insecure) |
| Multi-use | Unlimited sessions | Single session per token |

Most signers are not platform users. They may be customers, vendors, or
counterparties who have never visited the platform before. This requires
purpose-built authentication.

### The Email Transport Problem

The signing token is a 256-bit cryptographically random value in the
signing URL sent via email. Email is fundamentally insecure:

- Not all MTA hops use TLS encryption
- Emails stored in plaintext on mail servers
- Email account compromise is a top attack vector

The token must be treated as potentially intercepted from the moment
it is sent.

### Defense-in-Depth Mitigations

1. **Hash-only storage**: Only SHA-256(token) is stored in the database.
   Database compromise does not reveal valid tokens. An attacker with
   read access cannot reconstruct signing URLs.

2. **Short expiry**: 24-72 hours (configurable per organization). Limits
   the window for an intercepted token to be replayed.

3. **Single-session binding**: Using the token creates a server-side
   session. The token cannot create additional sessions. Prevents
   concurrent use by legitimate signer and attacker.

4. **Layered MFA**: Optional additional authentication---email OTP,
   SMS OTP, knowledge-based authentication, or government ID
   verification. Intercepting the email alone is insufficient.

### The Single-Use Trade-Off

The single-session property creates a UX challenge. A signer who starts
filling fields, leaves for lunch, and returns to an expired session must
re-authenticate.

Mitigation: field values are auto-saved to the server every 30 seconds.
Re-authentication restores all progress. The session cannot be extended
indefinitely because a long-lived session increases the window for
session hijacking.

### Envelope Binding

A token for Envelope A cannot access Envelope B, even if both are sent
to the same signer's email. Enforced by including `envelope_id` in the
token validation query:

```
WHERE envelope_id = ? AND signing_token = SHA256(?)
```

Without this binding, an attacker who obtains a token for a low-value
document (meeting attendance) could access a high-value contract
involving the same signer.

### The Resend Race Condition

When a signer requests a "resend" (lost/expired email), the old token
must be invalidated **before** the new one is generated. Otherwise, two
valid tokens exist simultaneously.

The resend must be atomic:
1. Invalidate old token (set to NULL)
2. Generate new 256-bit random token
3. Store SHA-256(new_token) in database
4. Send new email with new signing URL

If these steps are not atomic, a brief window exists where both old
and new tokens are valid. The old token (potentially in a compromised
mailbox) remains usable.

---

## Insight 5: Template vs. Envelope Scaling --- Why Bulk Send Requires Fan-Out Architecture

**Category**: Scalability

**One-liner**: Bulk send (1 template → 10,000 envelopes) requires an asynchronous fan-out architecture with idempotent envelope generation, not synchronous API calls, because creating 10,000 envelopes in a single request would take minutes and timeout any HTTP connection.

**Why it matters**:

Templates and envelopes have a one-to-many relationship that creates a
scaling challenge unique to digital signature platforms.

A template is a blueprint: document + pre-placed fields + routing order.
When a sender initiates "send this NDA to all 10,000 new employees," the
platform must create 10,000 individual envelopes. Each is a legally
independent entity requiring:

- Its own signer record (name, email, auth level)
- Its own signing token (unique per signer)
- Its own audit trail hash chain (starting from genesis)
- Its own document metadata reference
- Its own lifecycle state machine

### Why Synchronous Fails

Creating one envelope requires:

| Operation | Count | Latency |
|-----------|-------|---------|
| Envelope insert | 1 | 1-2ms |
| Signer inserts | 1-3 | 1-3ms |
| Field inserts | 5-20 | 2-5ms |
| Audit event (with hash) | 1 | 1-2ms |
| Object storage reference | 1 | <1ms |
| Email notification | 1-3 | N/A (async) |
| **Total per envelope** | | **5-10ms** |

At 5-10ms per envelope, 10,000 envelopes = 50-100 seconds.

No HTTP connection survives that long. Most load balancers timeout at
30-60 seconds. No user tolerates a 2-minute loading spinner. A single
app instance holding a transaction open for 100 seconds is a resource
exhaustion risk.

### The Fan-Out Architecture

Decouples initiation from execution:

**Step 1: Accept and acknowledge (< 1 second)**
- Validate recipient data format
- Create `bulk_send` batch record
- Store recipient data in object storage
- Return batch ID immediately

**Step 2: Chunk and enqueue**
- Split recipients into groups of 100
- Enqueue each chunk to message queue
- N chunks = N messages

**Step 3: Process chunks (workers)**
- Stateless workers consume messages
- Create envelopes from template
- Per-recipient customization (name, email, custom fields)
- Immediately send each envelope

**Step 4: Track progress**
- Atomic counters: `envelopes_created`, `envelopes_failed`
- Queryable via `GET /bulk-send/{batch_id}`
- Webhook notification on batch completion

### Idempotency: The Critical Detail

In distributed systems with message queues, at-least-once delivery means
a chunk may be processed more than once. A worker crashes after creating
50 of 100 envelopes. The message is redelivered. Without idempotency,
50 duplicates are created.

A recipient receiving two signing requests for the same document is
confusing at best, legally problematic at worst (which signature is valid?).

**Implementation**: Each envelope creation includes an idempotency key
(`batch_id:recipient_email`), enforced by a unique database constraint:

```
UNIQUE (bulk_send_id, signer_email)
```

An insert violating this constraint is caught and skipped. The worker
continues to the next recipient without error.

### Email Throttling

Sending 10,000 emails in rapid succession triggers rate limits on email
providers and damages sending domain reputation. Spam filters detect
volume spikes from a single domain.

Mitigations:
- Throttle to 500-1,000 emails/minute per sending domain
- Distribute across multiple sending domains for large batches
- Email queue provides natural backpressure
- Envelope creation proceeds at full speed; notification is independently
  rate-limited

### Progress Tracking

Enterprise users sending 10,000+ envelopes need visibility:

| Metric | Source | Update Frequency |
|--------|--------|-----------------|
| Total recipients | Batch record | Set at creation |
| Envelopes created | Atomic counter | Per envelope |
| Envelopes sent | Notification service callback | Per email |
| Envelopes failed | Atomic counter + error log | Per failure |
| Envelopes completed | Envelope state change | Per signing completion |

The sender polls the batch status endpoint or receives a webhook when
the batch completes. A dashboard shows the funnel from queued → created →
sent → signed → completed, with drill-down into individual failures.

---
