# Interview Guide

## 45-Minute Pacing Guide

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Clarify & Scope** | Ask questions, define boundaries | Clarify: SES vs AES vs QES? One jurisdiction or global? Bulk send in scope? What scale (envelopes/day)? |
| 5-10 min | **Core Concepts** | Establish the envelope model and signing lifecycle | Envelope = documents + signers + fields + routing. Lifecycle: DRAFT → SENT → SIGNING → COMPLETED → SEALED |
| 10-20 min | **High-Level Architecture** | Draw the system diagram | Core services, HSM, audit trail, object storage. Emphasize: audit trail is not optional, it is the legal foundation |
| 20-35 min | **Deep Dive** | Pick 1-2 critical components | Best choices: tamper-evident audit trail OR document sealing OR multi-party routing. Show hash chaining or PDF signature embedding |
| 35-42 min | **Scale & Trade-offs** | Address bottlenecks, failure modes | HSM throughput limits, PDF processing pipeline, bulk send fan-out. Discuss eIDAS levels as architectural differences |
| 42-45 min | **Wrap Up** | Summary, handle follow-ups | Reiterate: this is a legal/compliance system first, a software system second |

---

## Opening Talking Points

### Lead with Legal Non-Repudiation

**Do NOT** start with "it's a document upload and signing service." Instead:

> "A digital signature platform is fundamentally a **legal evidence generation system** that happens to have a document workflow attached to it. The core architectural challenge is not moving documents around---it's generating **mathematically provable evidence** that a specific person signed a specific document at a specific time, and that this evidence has not been tampered with after the fact. Every design decision---from the audit trail to the HSM to the PDF sealing---flows from this requirement."

### Establish the Envelope as the Core Abstraction

> "The central entity is the **envelope**, which bundles one or more documents with a set of signers, a routing order, and placed fields. The envelope is the atomic unit of a signing transaction---it has a clear lifecycle from draft to sealed, and all data (documents, signers, fields, signatures, audit events) is scoped to a single envelope. This makes it the natural sharding key."

### Highlight What Makes This Different from File Storage

> "This is **not** a document management system with a signing feature bolted on. The key differences are: (1) immutability after completion---signed documents are cryptographically sealed and cannot be modified, (2) a hash-chained audit trail that is tamper-evident, not just tamper-resistant, (3) HSM-based cryptographic operations for legally binding signatures, and (4) multi-party routing with sequential, parallel, and hybrid ordering."

---

## 10 Likely Interview Questions

### Q1: How do you ensure the audit trail is tamper-evident?

**Key answer**: Hash-chain every event within an envelope. Each event's hash is computed over the event data + the previous event's hash. Any modification (insert, delete, reorder, alter) breaks the chain and is mathematically detectable. Supplement with periodic anchoring to a public RFC 3161 Time Stamping Authority for temporal proof.

**Why interviewers ask**: Tests whether you understand the difference between "logging" and "legal evidence." A simple audit table with auto-increment IDs is trivially modifiable by anyone with database access.

### Q2: How does multi-party signing order work?

**Key answer**: Routing groups define the signing order. Groups execute sequentially; signers within a group execute in parallel. A state machine tracks which group is active and advances when the group's completion condition is met (all sign, any one signs, or minimum N sign). Race conditions in parallel groups are handled via optimistic concurrency on the routing step.

### Q3: What's the difference between SES, AES, and QES?

**Key answer**: These are not UI toggles---they are architecturally different systems.
- **SES**: Click-to-sign, platform records the action. No cryptographic signing of the document hash.
- **AES**: Certificate-based signature. HSM signs the document hash with a key uniquely linked to the signer, activated by MFA.
- **QES**: AES + identity verified by a Qualified Trust Service Provider + key stored on a certified QSCD (HSM meeting FIPS 140-2 L3). Legally equivalent to a handwritten signature in the EU.

### Q4: How do you handle signer authentication?

**Key answer**: Signers are not platform users. They authenticate via a time-limited, single-use token sent by email. Additional authentication (OTP, KBA, ID verification) is layered based on the configured security level. The token is bound to a specific envelope and signer. Token hash (not plaintext) is stored in the database.

### Q5: What happens when the HSM is unavailable?

**Key answer**: SES signatures (80% of volume) use a software path and are unaffected. AES/QES signatures fail gracefully: circuit breaker opens, signing requests are queued with user notification, and the system fails over to a secondary HSM cluster. If both clusters are down, AES/QES signing is temporarily unavailable while SES continues. This is an acceptable degradation because AES/QES is a minority of traffic.

### Q6: How do you seal a document after signing?

**Key answer**: Signatures are embedded into the PDF using PKCS#7/CAdES format via incremental saves. Each signer's signature covers all previous content (including previous signers' signatures). The platform adds a final seal with its own HSM key. The sealed PDF is self-verifying---any standard PDF reader can validate the signatures without platform involvement.

### Q7: How does bulk send work at scale (1 template → 10K recipients)?

**Key answer**: Fan-out architecture. The bulk send request is broken into chunks (e.g., 100 recipients per message) and enqueued. Worker processes create individual envelopes from the template with per-recipient customization. Idempotency keys prevent duplicate envelope creation on retries. Progress is tracked via atomic counters. Email delivery is throttled to avoid provider rate limits.

### Q8: How do you handle document integrity?

**Key answer**: Three layers: (1) SHA-256 hash of every document at upload time, (2) PKCS#7 signatures embed a signed hash that covers the document bytes, and (3) the certificate of completion records all document hashes. Any post-signing modification is detectable by recomputing the hash and comparing against the stored/signed hash. Content-addressed storage in object storage provides additional integrity.

### Q9: How do you comply with eIDAS across all three levels?

**Key answer**: The platform supports all three levels with different code paths:
- SES: Standard signing flow, platform audit trail provides evidence
- AES: Certificate-based signing through HSM, signer authenticated via MFA
- QES: Integration with Qualified Trust Service Providers for identity verification and qualified certificate issuance, signing on certified QSCDs
The choice of level is configured per signer in the envelope, not globally.

### Q10: How do you ensure data residency compliance?

**Key answer**: Organizations are assigned to a data region (US, EU, APAC) at creation. All data (documents, audit logs, encryption keys) stays within that region. The global routing layer directs API requests to the correct region. Cross-region envelopes (signer in a different region than the data) route the signer's signing session through the data region. HSM clusters are replicated per region.

---

## Proactive Trade-Offs to Raise

| Trade-Off | Option A | Option B | Recommendation |
|-----------|----------|----------|----------------|
| **Audit trail storage** | Global hash chain (single chain for all envelopes) | Per-envelope hash chains | **Per-envelope**: Enables parallel writes; global chain creates a serialization bottleneck |
| **Signature verification** | Verify on every download | Verify on demand (user requests verification) | **On demand**: Verification is CPU-intensive; most downloads trust the platform |
| **PDF rendering** | Server-side (platform renders, sends images) | Client-side (browser renders PDF) | **Server-side**: Prevents PDF injection attacks where displayed content differs from signed content |
| **Signer authentication** | Platform manages all identity verification | Delegate to external Identity Providers | **Hybrid**: Platform manages email/OTP; delegate ID verification and QES certificate issuance to QTSPs |
| **HSM key model** | Per-signer keys (each signer has unique key) | Per-org keys (org key signs on behalf of signers) | **Per-org for AES**: Simpler key management. **Per-signer for QES**: Required by eIDAS for unique linkage to signatory |
| **Bulk send concurrency** | Synchronous (create all envelopes before returning) | Asynchronous fan-out (return batch ID, process in background) | **Async**: Synchronous creation of 10K envelopes would time out any API call |

---

## Key Numbers to Memorize

| Metric | Value | Context |
|--------|-------|---------|
| DocuSign market share | ~67% | Dominant player; validates the problem space |
| DocuSign customers | ~1M organizations | Scale target for a mature platform |
| Envelopes per day (target) | 5-6M | Including bulk send |
| Documents per envelope (avg) | 2.5 | Typical contract packages |
| Signers per envelope (avg) | 2.3 | Sender + 1-2 counterparties |
| HSM signing latency | 50-200ms | Compared to <1ms for software signing |
| PDF size (average) | 2MB | Standard contracts with images |
| Audit events per envelope | ~15 | Create, send, view, sign, complete, seal, download |
| eIDAS signature levels | 3 | SES, AES, QES |
| US electronic signature laws | 2 | ESIGN Act (federal), UETA (state) |
| SHA-256 hash size | 32 bytes / 64 hex chars | Used for document hashing and audit chain |
| FIPS 140-2 Level 3 | HSM certification for QES | Tamper-resistant, key zeroization |

---

## "How Is This Different from File Storage with Access Control?"

This is the most common simplification trap. Here is the complete answer:

| Dimension | File Storage + Access Control | Digital Signature Platform |
|-----------|------------------------------|--------------------------|
| **Immutability** | Files can be overwritten; versions can be deleted | Signed documents are cryptographically sealed; modification is mathematically detectable |
| **Audit trail** | Access logs (who opened what) | Hash-chained event log proving who did what, when, with what IP, and that no record has been tampered with |
| **Non-repudiation** | None---a user can claim they didn't open a file | Mathematical proof: signer's key signed the document hash; the hash chain proves the signing event was not inserted after the fact |
| **Multi-party workflow** | No native concept of signing order | State machine with sequential/parallel/hybrid routing, decline handling, reminders, expiry |
| **Cryptographic operations** | Encryption at rest (optional) | Document hash signing (RSA/ECDSA), PKCS#7 embedding, certificate chain, HSM key management |
| **Legal compliance** | Data protection (GDPR, HIPAA) | Data protection + electronic signature law (ESIGN, eIDAS, UETA) + signature creation device certification (FIPS 140-2) |
| **Identity verification** | Username/password or SSO | Per-signer multi-factor authentication (email OTP, SMS OTP, KBA, government ID verification) |
| **Self-verifying documents** | No---rely on platform to confirm authenticity | Sealed PDFs are self-verifying by any PDF reader without platform involvement |
| **Certificate of completion** | No | Standalone PDF with signer details, document hashes, audit chain summary, platform seal |

---

## Common Anti-Patterns to Avoid

| Anti-Pattern | Why It's Wrong | Correct Approach |
|-------------|---------------|-----------------|
| "Just use a database audit table" | Trivially modifiable by DB admins; no legal non-repudiation | Hash-chained audit trail with external timestamping |
| "Store private keys in encrypted files" | Keys exist in plaintext in memory during signing; extractable | HSM for all digital signature operations |
| "Client-side PDF rendering" | Attacker can manipulate what the signer sees vs. what is signed | Server-side rendering; signer sees platform-generated images |
| "One global signing key" | Single point of failure; all signatures compromised if key leaks | Key hierarchy with per-org or per-signer keys |
| "Synchronous bulk send" | 10K envelope creation will timeout any API call | Async fan-out with progress tracking |
| "Same auth for sender and signer" | Signers are often not platform users | Separate token-based auth for signers with configurable MFA |
| "eIDAS levels are just UI toggles" | SES and QES have fundamentally different cryptographic requirements | Separate code paths for each signature level |
| "Strong consistency for everything" | Notifications and search don't need strong consistency | Strong for signatures and audit; eventual for notifications and search |

---

## Follow-Up Topics (If Time Permits)

1. **Long-term signature validation (LTV)**: How to verify a signature 10 years later when the certificate has expired and the CA no longer exists
2. **Regulatory arbitrage**: An envelope created in the US, signed by someone in Germany---which law applies?
3. **Mobile signing UX**: How to render PDF pages and capture signatures on small screens
4. **API-first signing**: Embedded signing iFrames and how to prevent clickjacking
5. **Signature appearance customization**: Company branding on signature images and certificate of completion
