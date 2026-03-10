# Deep Dives & Bottlenecks — Digital Document Vault Platform

## Deep Dive 1: PKI Verification at Scale

### The Challenge

Every document retrieval requires verifying the digital signature against the issuer's PKI certificate, checking the certificate chain up to the root CA, and querying the Certificate Revocation List (CRL) or Online Certificate Status Protocol (OCSP) responder. At 45 million daily retrievals (1,500 peak QPS), the PKI verification pipeline must handle cryptographic operations at a scale that most PKI systems were never designed for.

### Verification Pipeline

The full verification sequence for a single document:

1. **Signature verification**: Extract the digital signature from the document, decode the issuer's public key from their certificate, and verify that the signature matches the document hash. This is a CPU-intensive RSA-2048 operation (~0.5ms per verification on modern hardware).

2. **Certificate chain validation**: Walk the certificate chain from the issuer's signing certificate → intermediate CA → root CA. Each step requires another signature verification. Typical chains are 2-3 levels deep, so this triples the cryptographic work.

3. **Revocation checking**: Query whether any certificate in the chain has been revoked. Two approaches:
   - **CRL**: Download the complete Certificate Revocation List from the CA and check if the certificate serial number is listed. CRLs can be large (10MB+ for government CAs with millions of certificates) and are updated every 1-24 hours.
   - **OCSP**: Query an OCSP responder with the specific certificate serial number for a real-time revocation status. Faster and more precise, but adds a network round-trip (50-200ms latency to the OCSP responder).

### Production Optimizations

**Verification Result Caching**: Cache the complete verification result (signature valid, chain valid, not revoked) with a TTL tied to the CRL update frequency. If the CA publishes CRLs every 6 hours, the verification cache TTL is 6 hours. This reduces PKI operations by 95%+ since most documents are accessed multiple times within a CRL period.

**CRL Pre-Fetching and Local Caching**: Instead of checking CRL/OCSP on every verification, periodically download CRLs from all relevant CAs (there are ~20 CAs in the government PKI hierarchy). Store CRLs in a local database indexed by certificate serial number. CRL checks become local database lookups (sub-millisecond) instead of network calls.

**Certificate Chain Pre-Validation**: For each active issuer, pre-validate the full certificate chain once when the issuer onboards and whenever their certificate is renewed. Store the pre-validated chain status. During document verification, only verify the document's signature against the (already-validated) issuer certificate, skipping the chain walk.

**Hardware Security Modules (HSMs)**: For the platform's own signing operations (signing verification reports, consent tokens), use HSMs for key protection and accelerated cryptographic operations.

### Bottleneck: CRL Size Growth

As the platform scales to thousands of issuers, the aggregate CRL data grows. With 1,900+ issuers, if each CA has a 5MB CRL updated every 6 hours, the platform must download ~50MB of CRL data every 6 hours. This is manageable, but the real bottleneck is the lookup time: a linear scan through a 500,000-entry CRL is slow. Mitigation: index CRLs by certificate serial number in a B-tree structure for O(log n) lookup.

---

## Deep Dive 2: Consent Engine and Concurrent Access

### The Challenge

The consent engine must handle a complex multi-party flow with strict correctness guarantees:
- A consent record is a legal artifact under the DPDP Act; it must never be lost, corrupted, or fabricated
- Multiple requesters may request consent for the same document simultaneously
- A subscriber might revoke consent while a requester is mid-access
- Access count limits must be enforced atomically even under concurrent access

### Concurrency Scenarios

**Race Condition 1: Concurrent access count increment.** A consent grants 3 accesses. Two requester threads hit the API simultaneously when `access_count_used = 2`. Both read count=2, both compute 2 < 3 (limit), both increment to 3. Result: 4 accesses granted instead of 3.

**Mitigation**: Use atomic compare-and-swap for access count updates. The increment operation specifies the expected current value; if another thread has already incremented it, the CAS fails and the request is rejected or retried.

```
FUNCTION atomic_increment_access_count(consent_id, expected_count):
    result = db.execute(
        "UPDATE consent_records
         SET access_count_used = access_count_used + 1
         WHERE consent_id = ? AND access_count_used = ?",
        consent_id, expected_count
    )
    RETURN result.rows_affected == 1  // False if concurrent modification
```

**Race Condition 2: Revocation during access.** Subscriber revokes consent at timestamp T. Requester's access request arrives at T-100ms, passes validation at T-50ms, but the actual document fetch happens at T+200ms (after revocation).

**Mitigation**: Re-validate consent immediately before returning the document, not just at request validation time. The consent check is a two-phase operation:
1. **Pre-check**: Validate consent at request entry (fast path, allows early rejection)
2. **Final-check**: Validate consent again just before returning the document (correctness guarantee)

**Race Condition 3: Duplicate consent requests.** A requester's system has a retry bug, sending the same consent request 5 times. Without deduplication, the subscriber receives 5 notification popups.

**Mitigation**: Idempotency key based on (requester_id, subscriber_id, document_types, purpose_code). Subsequent requests within a deduplication window (e.g., 5 minutes) return the existing consent request ID.

### Consent Record Storage Design

Consent records use an append-only data model: no record is ever updated in place. State transitions create new entries:

```
consent_events table:
    event_id        UUID
    consent_id      UUID
    event_type      ENUM (REQUESTED, APPROVED, DENIED, ACCESSED, REVOKED, EXPIRED)
    actor           STRING
    timestamp       TIMESTAMP
    details         JSON
    signature       STRING (HMAC for tamper detection)
```

The current state of any consent is derived by replaying the event log for that consent_id. This provides a complete audit trail and makes it impossible to "rewrite history" by modifying a consent record.

---

## Deep Dive 3: URI Resolution and Issuer Availability

### The Challenge

The URI reference model's Achilles heel is issuer availability. If the Ministry of Transport's API is down, no citizen can access their driving license through the vault. With 1,900+ issuers of wildly varying technical capability (from well-funded central government departments with professional IT teams to small state agencies running on legacy systems), issuer availability is unpredictable.

### Issuer Health Monitoring

```
FUNCTION monitor_issuer_health(issuer_id):
    // Synthetic health check every 30 seconds
    EVERY 30 seconds:
        response = http_client.get(issuer.health_endpoint, timeout=3000ms)
        IF response.status == 200 AND response.latency < issuer.sla_latency_ms:
            health_tracker.record(issuer_id, HEALTHY, response.latency)
        ELSE IF response.status == 200:
            health_tracker.record(issuer_id, DEGRADED, response.latency)
        ELSE:
            health_tracker.record(issuer_id, DOWN, -1)

    // Compute rolling health score (last 5 minutes)
    health_events = health_tracker.get_recent(issuer_id, window=5min)
    success_rate = count(HEALTHY events) / total events

    IF success_rate >= 0.95:
        SET issuer.health_status = HEALTHY
    ELSE IF success_rate >= 0.50:
        SET issuer.health_status = DEGRADED
    ELSE:
        SET issuer.health_status = DOWN
        circuit_breaker.open(issuer_id)
```

### Cascading Cache Strategy

The platform uses a three-tier cache for URI-resolved documents:

1. **L1 - In-Memory Cache (per node)**: Most frequently accessed documents per node. TTL: 5 minutes. Size: 2 GB per node. Hit rate: ~40%.

2. **L2 - Distributed Cache**: Shared across all nodes. TTL: configurable per issuer (1 hour to 24 hours). Size: 500 GB. Hit rate: ~35% (of L1 misses).

3. **L3 - Persistent Cache (Object Storage)**: Long-term cached copies of documents. TTL: 7 days. Used when issuer is DOWN. Documents stored with last-verified timestamp and verification status.

**Cache invalidation**: Issuers can push invalidation events via API Setu when a document is updated or revoked. The platform also revalidates cached documents on a schedule based on document type volatility (identity documents: daily, tax returns: monthly).

### Graceful Degradation Strategy

When an issuer is DOWN:
1. Serve L3 cached version with `status: CACHED_PENDING_VERIFICATION`
2. Include `last_verified_at` timestamp so the requester can assess staleness
3. Queue a background verification job for when the issuer recovers
4. Send the subscriber a notification: "Your [document type] was served from cache. Verification will be completed when [issuer name] is available."
5. After issuer recovers, retroactively verify and update the document status

---

## Deep Dive 4: AI Document Processing Pipeline

### OCR Challenges at National Scale

India's documents present unique OCR challenges:
- **Multi-script support**: Documents in Devanagari, Tamil, Telugu, Kannada, Bengali, Gujarati, Malayalam, and 15+ other scripts, often with mixed-script content (English headers with vernacular body text)
- **Variable document quality**: Government documents range from laser-printed certificates to hand-written, stamp-affixed forms to 20-year-old faded photocopies
- **Non-standard layouts**: Unlike standardized bank statements, government documents from different states have wildly different layouts for the same document type (e.g., driving licenses from Delhi vs. Tamil Nadu look completely different)

### Processing Pipeline Architecture

```
                ┌─────────────┐
                │  Upload      │
                │  Received    │
                └──────┬──────┘
                       │
                ┌──────▼──────┐
                │  Image Pre-  │
                │  Processing  │ (deskew, denoise, contrast enhance)
                └──────┬──────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
    ┌─────▼────┐ ┌─────▼────┐ ┌────▼─────┐
    │  Script   │ │  Layout   │ │ Metadata │
    │  Detect   │ │  Analysis │ │ Extract  │
    └─────┬────┘ └─────┬────┘ └────┬─────┘
          │            │            │
          └────────────┼────────────┘
                       │
                ┌──────▼──────┐
                │  OCR Engine  │ (script-specific models)
                │  Text Extract│
                └──────┬──────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
    ┌─────▼────┐ ┌─────▼────┐ ┌────▼─────┐
    │  Field    │ │  Doc Type │ │  Fraud   │
    │  Extract  │ │  Classify │ │  Detect  │
    └─────┬────┘ └─────┬────┘ └────┬─────┘
          │            │            │
          └────────────┼────────────┘
                       │
                ┌──────▼──────┐
                │  Results     │
                │  Aggregation │
                └─────────────┘
```

### Fraud Detection Deep Dive

The fraud detector operates at four levels:

**Level 1 - Metadata Forensics** (cheap, fast, catches obvious fraud):
- File creation timestamp vs. purported document date
- Editing software signatures in EXIF data
- Compression artifacts indicating re-saving
- GPS location in EXIF vs. subscriber's known locations

**Level 2 - Visual Forensics** (moderate cost, catches sophisticated fraud):
- Error Level Analysis (ELA): recompressing the image and comparing error levels reveals regions that were edited (edited regions show different error levels than original regions)
- Font consistency analysis: detecting multiple fonts in a region that should use one font
- Alignment analysis: detecting micro-misalignments from copy-paste operations
- Background pattern continuity: checking for discontinuities in security patterns or watermarks

**Level 3 - Content Cross-Validation** (high value, catches identity fraud):
- OCR-extracted name vs. subscriber's verified name from eKYC
- OCR-extracted ID number vs. known ID numbers from issuer-pushed documents
- Date of birth consistency across multiple uploaded documents
- Address consistency check across documents

**Level 4 - Issuer Registry Check** (highest value, definitive fraud detection):
- If the uploaded document claims to be from a known issuer, query the issuer's Pull URI to check if the document exists in their registry
- If the document number is not found in the issuer's system, it's either forged or from a different issuer version

---

## Deep Dive 5: Offline Mode and Edge Caching

### The Offline Availability Problem

Legal equivalence means citizens should be able to present documents even without internet connectivity. The December 2024 outage proved this isn't hypothetical—citizens were locked out of their documents for two days.

### Offline Architecture

The mobile app implements a selective pre-caching strategy:

1. **Critical Document Set**: The subscriber designates up to 10 "critical documents" (typically: national ID, driving license, PAN card, insurance card). These are cached on-device with full content and verification metadata.

2. **Offline Verification**: Each cached document includes:
   - The document content (PDF/image)
   - The issuer's digital signature
   - The issuer's PKI certificate (public key)
   - A pre-computed verification result with timestamp
   - A platform-signed "offline verification bundle" that attests the document was verified at time T

3. **Offline Presentation**: When presenting a document offline, the app displays:
   - The document content
   - A QR code encoding: document URI + platform signature + verification timestamp
   - The requester can scan the QR code later (when online) to verify authenticity retroactively

### Limitations and Risks

- **Stale documents**: A cached document might have been revoked by the issuer after caching. The offline bundle shows the last verification time; requesters must decide if the staleness is acceptable.
- **Device theft**: A stolen phone with cached documents exposes the subscriber's identity documents. Mitigation: app-level encryption with biometric unlock, remote wipe capability, and cached documents auto-expire after 72 hours without re-authentication.
- **CRL staleness**: Offline verification cannot check if the issuer's certificate was revoked since the last online verification. This is an inherent limitation of offline PKI verification.

---

## Bottleneck Analysis

### Bottleneck 1: Exam Result Days

When a national examination body publishes results (e.g., board exams affecting 30 million students), millions of students attempt to access their result documents simultaneously. This creates a thundering herd on both the vault platform and the specific issuer's API.

**Characteristics:**
- 10-20× normal traffic in a 2-hour window
- All requests target a single issuer's documents
- URI resolution fans out to one issuer, creating a hotspot

**Mitigation:**
- Pre-push: Coordinate with issuers to push result documents to subscriber vaults before the announcement, avoiding the thundering herd on Pull URI resolution
- Request coalescing: If 1,000 requests arrive for the same issuer within 100ms, make only one API call and serve all 1,000 from the response
- Issuer-specific rate limiting with backpressure: Queue excess requests rather than overwhelming the issuer's API
- Progressive rollout: Notify students in batches rather than all at once

### Bottleneck 2: Consent Flow Latency Under Load

The consent flow involves multiple round-trips: requester → platform → subscriber's device → subscriber auth → platform → token generation → requester callback. End-to-end latency depends on the slowest hop: the subscriber's device response time (they might take 30 seconds to authenticate and approve).

**Mitigation:**
- Separate the consent *request* (async, subscriber may approve later) from the *access* (sync, must be fast once consent exists)
- Pre-approved consent templates: For recurring requester-document pairs (e.g., employer verifying employment certificate annually), allow subscribers to set standing consent rules
- Consent request batching: When a loan application requires 5 documents, present one consent screen for all 5 rather than 5 separate consent flows

### Bottleneck 3: Search Index Freshness

When a new document is issued (Push API) or uploaded (self-upload), there's a delay before it appears in search results (index update latency). If a subscriber receives a push notification "Your degree certificate is now available" and immediately searches for it, the document might not appear in search results yet.

**Mitigation:**
- Dual-path search: First check the real-time metadata DB for recent documents (last 5 minutes), then merge with search index results
- Push notification deep-links directly to the document (bypassing search)
- Near-real-time index updates using a change data capture pipeline from Metadata DB to Search Index (target: < 2 second propagation delay)
