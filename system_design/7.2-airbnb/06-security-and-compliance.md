# Security & Compliance

## 1. Authentication & Authorization

### 1.1 Authentication Architecture

```
Authentication flow:

1. Email/password login:
   Client → API Gateway → Auth Service
   → Validate credentials against hashed password (bcrypt, cost=12)
   → Issue JWT access token (15 min TTL) + refresh token (30 day TTL)
   → Store refresh token hash in database (revocable)

2. Social login (OAuth2/OIDC):
   Client → OAuth2 provider (Google, Facebook, Apple)
   → Provider returns authorization code
   → Auth Service exchanges code for provider tokens
   → Auth Service creates/links local user account
   → Issue JWT access token + refresh token (same as above)

3. Token refresh:
   Client → API Gateway → Auth Service
   → Validate refresh token (hash match + not revoked + not expired)
   → Issue new access token + rotate refresh token
   → Old refresh token invalidated (one-time use)

JWT access token claims:
{
  "sub": "user-uuid",
  "roles": ["guest", "host"],
  "identity_verified": true,
  "iat": 1720000000,
  "exp": 1720000900,    // 15 min TTL
  "iss": "auth.platform.internal"
}
```

### 1.2 Authorization Model

```
Role-Based Access Control (RBAC):

Roles:
  guest:    Search, book, review, message hosts
  host:     All guest permissions + list properties, manage calendar, manage payouts
  co-host:  Manage specific listings (subset of host permissions per listing)
  admin:    Platform administration, dispute resolution, content moderation
  support:  Read-only access to booking/payment details for customer support

Resource-level authorization (listing ACLs):
  Listing X:
    owner: user-A (full control)
    co-host: user-B (manage calendar, respond to messages)
    co-host: user-C (view bookings only)

Authorization check:
  FUNCTION authorize(userId, action, resource):
    // 1. Check role-based permissions
    userRoles = getUserRoles(userId)
    IF NOT rolePermits(userRoles, action):
      RETURN DENIED

    // 2. Check resource-level permissions (if applicable)
    IF resource.type == "listing":
      IF resource.owner_id == userId:
        RETURN ALLOWED
      coHostPerms = getCoHostPermissions(userId, resource.id)
      IF coHostPerms.permits(action):
        RETURN ALLOWED
      RETURN DENIED

    // 3. Check booking-level permissions
    IF resource.type == "booking":
      booking = getBooking(resource.id)
      IF booking.guest_id == userId OR booking.host_id == userId:
        RETURN ALLOWED
      RETURN DENIED

    RETURN DENIED
```

### 1.3 API Security

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| Transport | TLS 1.3 (minimum TLS 1.2) | Encryption in transit |
| Authentication | JWT Bearer tokens | Identity verification |
| Rate limiting | Token bucket per user + IP | Abuse prevention |
| Input validation | Schema validation at gateway | Injection prevention |
| CORS | Allowlisted origins only | Cross-origin protection |
| CSRF | Double-submit cookie pattern | Cross-site request forgery prevention |
| Content-Type | Strict enforcement | Content type confusion prevention |

---

## 2. Payment Security (PCI-DSS Compliance)

### 2.1 Cardholder Data Environment (CDE) Isolation

```
PCI-DSS scope minimization strategy:

  Client-side tokenization:
    1. Guest enters card details in client-side form (hosted by payment processor)
    2. Card data sent directly to payment processor (never touches platform servers)
    3. Processor returns a payment token (one-time-use reference)
    4. Platform stores only the token, never the raw card number

  Server-side:
    → Payment Service never sees raw card numbers (PAN)
    → Only stores: payment token, last 4 digits, card brand, expiry month/year
    → Reduces PCI scope from SAQ D (full assessment) to SAQ A (minimal)

  Database:
    → No raw card data stored anywhere in platform databases
    → Payment tokens are processor-specific and non-reversible
    → Even in a database breach, card data is not exposed
```

### 2.2 Payment Transaction Security

```
Security controls for payment operations:

  1. Idempotency keys: Every payment operation has a unique idempotency key
     → Prevents duplicate charges from network retries
     → Key stored with transaction record; duplicate requests return cached result

  2. Amount verification: Before capture, verify amount matches original authorization
     → Prevents tampering between auth and capture

  3. Currency verification: Charge currency matches booking currency
     → Prevents currency manipulation attacks

  4. Webhook verification: Payment processor webhooks validated via signature
     → HMAC-SHA256 signature verification on all incoming webhooks
     → Prevents spoofed payment confirmations

  5. Reconciliation: Daily automated reconciliation between platform records and processor
     → Detects discrepancies, missing transactions, phantom charges
     → Alerts if discrepancy exceeds $100 per day
```

### 2.3 Append-Only Ledger

```
All financial transactions recorded in an append-only ledger:
  → No UPDATE or DELETE operations on payment/payout tables
  → State changes recorded as new rows (status transitions)
  → Full audit trail: who, what, when, why for every financial event
  → Tamper-evident: hash chain linking sequential entries

Ledger entry structure:
  entry_id:        sequential UUID
  transaction_id:  reference to payment/payout
  event_type:      AUTHORIZED | CAPTURED | REFUNDED | VOIDED | PAID_OUT
  amount:          decimal
  currency:        string
  previous_hash:   hash of previous entry (tamper detection)
  created_at:      timestamp
  created_by:      service identity (not user)
```

---

## 3. PII & Data Privacy (GDPR Compliance)

### 3.1 Data Classification

| Category | Examples | Storage | Retention | Access Control |
|----------|----------|---------|-----------|---------------|
| **Sensitive PII** | Government ID photos, SSN/tax ID | Encrypted object storage | Deleted after verification (or regulatory minimum) | Trust & Safety team only |
| **Standard PII** | Name, email, phone, address | Encrypted at rest (AES-256) | Account lifetime + 5 years post-deletion | Account owner + authorized support |
| **Financial PII** | Bank account details, payout history | PCI-compliant encrypted storage | 7 years (tax/regulatory requirement) | Payment team only |
| **Behavioral data** | Search history, click patterns, booking history | Pseudonymized in analytics DB | 2 years | Analytics team (pseudonymized) |
| **Public data** | Reviews, listing descriptions, profile photos | Standard storage | Account lifetime | Public |

### 3.2 GDPR Rights Implementation

```
Right to Access (Article 15):
  → User requests data export via account settings
  → System compiles: profile, bookings, messages, reviews, search history
  → Delivered as downloadable archive within 30 days
  → Excludes: internal fraud scores, moderation decisions

Right to Erasure (Article 17):
  → User requests account deletion
  → Process:
    1. Cancel all future bookings (with appropriate refunds)
    2. Delete PII: name, email, phone, address, ID documents
    3. Pseudonymize: replace user ID in historical records with hash
    4. Retain: anonymized booking/payment records (legal/tax requirement)
    5. Reviews: author name replaced with "Former User"
    6. Completion: within 30 days of verified request

Right to Portability (Article 20):
  → Export data in machine-readable format (JSON)
  → Includes: profile, listings, bookings, reviews, messages

Data Minimization:
  → Identity verification photos deleted after verification completes
  → Search history auto-purged after 2 years
  → Message content encrypted; platform cannot read for analytics
```

### 3.3 Encryption Strategy

```
Encryption at rest:
  → Database: Transparent Data Encryption (TDE) with AES-256
  → Object storage: Server-side encryption with platform-managed keys
  → Backups: Encrypted with separate key (key rotation every 90 days)
  → Redis: Not encrypted at rest (ephemeral data; acceptable risk)

Encryption in transit:
  → External: TLS 1.3 for all client connections
  → Internal: mTLS between all services (service mesh managed)
  → Database connections: TLS required (reject plaintext)

Key management:
  → Hardware Security Module (HSM) for master key storage
  → Envelope encryption: data keys encrypted by master key
  → Key rotation: master keys rotated annually; data keys rotated quarterly
  → Key access logged and audited
```

---

## 4. Threat Model & Mitigations

### 4.1 Threat Matrix

| Threat | Attack Vector | Impact | Likelihood | Mitigation |
|--------|--------------|--------|------------|------------|
| **Fake listings** | Scam hosts create listings for properties they do not own | Guest arrives to non-existent property; financial fraud | Medium | Photo verification, address validation, ML detection, new host review queue |
| **Payment fraud** | Stolen credit cards used for bookings | Chargebacks, financial loss | High | 3DS verification, risk scoring, velocity checks, device fingerprinting |
| **Account takeover** | Credential stuffing, phishing, SIM swapping | Unauthorized bookings, payout redirection | Medium | MFA enforcement, login anomaly detection, payout change verification |
| **Review manipulation** | Fake reviews (positive for own listings, negative for competitors) | Undermined trust, unfair ranking | Medium | Booking-verified reviews only, NLP detection, rate limiting |
| **Off-platform booking** | Hosts/guests exchange contact info to avoid platform fees | Revenue loss, safety risk (no platform protection) | High | Message content scanning, contact info detection (phone, email patterns) |
| **Price manipulation** | Listing at low price to rank high, then changing price before stay | Guest pays more than expected | Low | Price locked at booking time; changes require guest approval |
| **SSRF via photos** | Malicious URLs in photo upload that trigger server-side requests | Internal network access, data exfiltration | Low | URL validation, allowlisted image hosts, fetch in isolated sandbox |
| **DDoS on booking** | Automated booking attempts to block competitor listings | Listings unavailable due to fake reservations | Medium | Rate limiting, CAPTCHA for rapid booking attempts, identity verification requirement |

### 4.2 Identity Verification Flow

```
FUNCTION verifyIdentity(userId, documentImage, selfieImage):
  // 1. Document processing
  documentData = ocrService.extractDocument(documentImage)
  // Returns: name, date of birth, document number, expiry, issuing country

  // 2. Document validation
  IF documentData.expiry < today():
    RETURN { status: "FAILED", reason: "Document expired" }
  IF NOT validateDocumentFormat(documentData):
    RETURN { status: "FAILED", reason: "Invalid document format" }

  // 3. Selfie-to-document matching
  documentFace = faceExtraction.extract(documentImage)
  selfieFace = faceExtraction.extract(selfieImage)
  similarityScore = faceMatch.compare(documentFace, selfieFace)

  IF similarityScore < 0.85:
    RETURN { status: "FAILED", reason: "Face does not match document" }

  // 4. Liveness detection (prevent photo-of-photo attacks)
  livenessScore = livenessDetection.assess(selfieImage)
  IF livenessScore < 0.90:
    RETURN { status: "MANUAL_REVIEW", reason: "Liveness check inconclusive" }

  // 5. Sanctions and watchlist check
  watchlistResult = complianceService.checkWatchlists(documentData.name, documentData.dob)
  IF watchlistResult.isMatch:
    RETURN { status: "BLOCKED", reason: "Compliance check failed" }

  // 6. Store verification result (NOT the document itself)
  DB.INSERT("identity_verifications", {
    user_id: userId,
    verification_type: "GOVERNMENT_ID",
    status: "VERIFIED",
    document_type: documentData.type,
    confidence_score: similarityScore,
    verified_at: NOW(),
    expires_at: documentData.expiry
  })

  // 7. Delete document images (data minimization)
  objectStorage.delete(documentImage.storageKey)
  objectStorage.delete(selfieImage.storageKey)

  RETURN { status: "VERIFIED" }
```

### 4.3 Fraud Detection at Booking Time

```
Real-time fraud signals evaluated at booking creation:

  Account signals:
    - Account age < 24 hours                     → +30 risk points
    - No identity verification                    → +20 risk points
    - No previous completed bookings              → +15 risk points
    - Multiple failed booking attempts today      → +25 risk points

  Payment signals:
    - Payment method added < 1 hour ago           → +20 risk points
    - Card issuing country ≠ user profile country → +15 risk points
    - Multiple cards tried and failed              → +35 risk points
    - BIN (card prefix) matches known fraud BINs  → +40 risk points

  Behavioral signals:
    - Booking high-value listing as first booking  → +15 risk points
    - Unusual booking pattern (check-in same day)  → +10 risk points
    - IP geolocation ≠ card country ≠ profile country → +25 risk points
    - Known Tor/VPN exit node                      → +15 risk points
    - Device fingerprint matches previous fraud     → +50 risk points

  Thresholds:
    0-30 points:   ALLOW (proceed normally)
    31-60 points:  VERIFY (require identity verification before proceeding)
    61-80 points:  REVIEW (hold booking for manual review, notify guest)
    81+ points:    BLOCK (reject booking, flag account)
```

---

## 5. Damage Claims & Dispute Resolution

### 5.1 AirCover Claim Workflow

```
FUNCTION processHostDamageClaim(hostId, bookingId, claimDetails):
  booking = DB.getBooking(bookingId)

  // 1. Eligibility check
  IF booking.status != 'COMPLETED':
    RETURN { error: "Can only claim for completed stays" }
  IF daysSince(booking.check_out) > 14:
    RETURN { error: "Claims must be filed within 14 days of checkout" }
  IF booking.host_id != hostId:
    RETURN { error: "Unauthorized" }

  // 2. Create claim
  claim = DB.INSERT("damage_claims", {
    booking_id: bookingId,
    host_id: hostId,
    guest_id: booking.guest_id,
    claimed_amount: claimDetails.amount,
    description: claimDetails.description,
    evidence_urls: claimDetails.photos,  // Before/after photos
    status: "PENDING_GUEST_RESPONSE"
  })

  // 3. Notify guest (72-hour response window)
  notificationService.notify(booking.guest_id, {
    type: "DAMAGE_CLAIM",
    claim_id: claim.id,
    amount: claimDetails.amount,
    deadline: NOW() + 72hours
  })

  // 4. Guest response handling
  //    Accept → charge guest (if payment method available)
  //    Dispute → escalate to mediation
  //    No response → escalate to mediation after 72 hours

  RETURN { claim_id: claim.id, status: "PENDING_GUEST_RESPONSE" }
```

---

## 6. Content Moderation

### 6.1 Multi-Layer Moderation Pipeline

```
Layer 1: Automated filters (real-time)
  → Listing descriptions: profanity filter, spam detection, PII detection
  → Photos: nudity detection, stock photo detection, duplicate detection
  → Messages: contact info extraction (phone, email, social media handles)
  → Reviews: sentiment analysis, fake review detection

Layer 2: ML-based classification (near-real-time)
  → New listing: scam probability score
  → Review: authenticity score
  → Message: off-platform booking intent score
  → Confidence > 95%: auto-action (block/flag)
  → Confidence 70-95%: queue for human review

Layer 3: Human review (asynchronous)
  → New host listings in high-risk categories (queue within 24 hours)
  → Flagged content from automated systems
  → User reports
  → SLA: 24-hour review turnaround for flagged content
```

### 6.2 Message Contact Info Detection

```
FUNCTION scanMessageForContactInfo(message):
  patterns = [
    PHONE_REGEX,           // Various international phone formats
    EMAIL_REGEX,           // Standard email patterns
    SOCIAL_MEDIA_HANDLES,  // @username patterns
    URL_PATTERNS,          // External links
    OBFUSCATED_PATTERNS    // "call me at six oh two..." number-word patterns
  ]

  FOR EACH pattern IN patterns:
    IF message.content MATCHES pattern:
      // Do not block the message; replace contact info with placeholder
      sanitizedContent = replace(message.content, pattern, "[contact info removed]")
      message.content = sanitizedContent
      message.flagged = true

      // Log for review
      moderationQueue.enqueue({
        type: "CONTACT_INFO_DETECTED",
        thread_id: message.thread_id,
        user_id: message.sender_id,
        original_content: message.content  // Stored for review only
      })

  RETURN message
```

---

## 7. Security Monitoring & Incident Response

### 7.1 Security Event Monitoring

| Event Category | Detection Method | Response Time | Action |
|---------------|-----------------|---------------|--------|
| Credential stuffing | Login failure rate > 100/min from same IP range | Real-time | Block IP range, enable CAPTCHA |
| Account takeover | Login from new device + password change + payout method change | Minutes | Lock account, notify user via verified channel |
| Mass scraping | Rate limit exceeded on search/listing APIs | Real-time | Progressive throttling → block |
| Payment fraud surge | Chargeback rate > 0.1% in 24h | Hourly | Increase risk scoring thresholds, enable 3DS for all transactions |
| Data exfiltration | Unusual data access volume by internal service | Minutes | Alert security team, revoke service credentials |

### 7.2 Incident Response Playbook

```
Security incident classification:

  P1 (Critical): Data breach, payment system compromise, account takeover at scale
    → Response time: 15 minutes
    → Actions: Isolate affected systems, notify CISO, engage forensics team
    → Communication: Affected users notified within 72 hours (GDPR requirement)

  P2 (High): Significant fraud campaign, DDoS affecting availability
    → Response time: 1 hour
    → Actions: Block attack vector, increase monitoring, deploy mitigations

  P3 (Medium): Isolated fraud incidents, vulnerability discovered
    → Response time: 4 hours
    → Actions: Investigate, patch if applicable, update fraud models

  P4 (Low): Minor policy violations, low-impact vulnerabilities
    → Response time: 24 hours
    → Actions: Document, schedule fix, monitor
```
