# Security & Compliance

## PCI-DSS Compliance

### Scope Minimization

The hotel booking system processes payment card data and must comply with PCI-DSS. The primary strategy is **scope minimization**: reduce the number of system components that touch cardholder data.

```
PCI-DSS scope strategy:

  In scope (must be PCI-compliant):
    - Payment Service
    - Payment Gateway integration layer
    - Network segment hosting payment components

  Out of scope (never sees card data):
    - Search Service
    - Availability Service
    - Booking Orchestrator (receives payment tokens, not card numbers)
    - Property Service
    - Review Service
    - All other services

  Mechanism: client-side tokenization
    1. Guest enters card details in browser/app
    2. Client-side SDK sends card data directly to payment gateway
    3. Payment gateway returns a one-time token (e.g., "tok_visa_1234")
    4. Token is sent to our backend (never the card number)
    5. Payment Service uses token to pre-authorize/capture via gateway API
    6. We store: last four digits, card brand, token reference
    7. We NEVER store: full card number, CVV, magnetic stripe data
```

### PCI-DSS Requirements Mapping

| PCI-DSS Requirement | Implementation |
|---------------------|----------------|
| **Req 1**: Firewall configuration | Payment Service in isolated network segment with strict ingress/egress rules |
| **Req 2**: No vendor defaults | All payment infrastructure uses custom credentials, no default passwords |
| **Req 3**: Protect stored data | No full card numbers stored; tokens only; encrypted at rest |
| **Req 4**: Encrypt transmission | TLS 1.3 for all payment API calls; certificate pinning for gateway communication |
| **Req 6**: Secure development | Payment Service code reviews, static analysis, penetration testing quarterly |
| **Req 7**: Restrict access | Payment Service accessible only by Booking Orchestrator; no direct access from other services |
| **Req 8**: Unique IDs | Individual credentials for all payment system access; no shared accounts |
| **Req 10**: Track access | Full audit log of all payment operations; immutable log storage |
| **Req 11**: Regular testing | Quarterly vulnerability scans; annual penetration test; PCI ASV scans |
| **Req 12**: Security policy | Documented payment security policy; annual staff training |

---

## GDPR Compliance

### Data Classification

| Data Category | Examples | Legal Basis | Retention |
|--------------|---------|-------------|-----------|
| **Guest PII** | Name, email, phone, nationality | Contract performance (booking) | Duration of account + 30 days post-deletion request |
| **Payment Data** | Last four digits, card brand, transaction records | Contract performance + legal obligation | 7 years (financial regulations) |
| **Booking History** | Reservation records, stay dates, properties visited | Contract performance | Active account lifetime; anonymized on deletion |
| **Location Data** | Search history, saved destinations | Legitimate interest (with opt-out) | 90 days |
| **Review Content** | Review text, scores | Consent (guest submits voluntarily) | Indefinite (can be anonymized on account deletion) |
| **Behavioral Data** | Click patterns, search-to-book conversion | Legitimate interest (with opt-out) | 90 days |

### Data Subject Rights Implementation

```
Right to Access (Article 15):
  - Self-service data export from account settings
  - API: GET /api/v1/guests/me/data-export
  - Returns: all personal data in machine-readable format (JSON)
  - Fulfillment: within 72 hours

Right to Erasure (Article 17):
  - Guest requests account deletion
  - Process:
    1. Cancel all future reservations (with notification to properties)
    2. Delete PII from guest record (name, email, phone)
    3. Retain anonymized booking records (for analytics and financial compliance)
    4. Anonymize reviews (show as "Former Guest")
    5. Delete search history and behavioral data
    6. Delete from all caches and search indexes
    7. Request deletion from payment gateway (tokenized data)
  - Payment records retained (anonymized) for 7 years per financial regulations
  - Fulfillment: within 30 days

Right to Rectification (Article 16):
  - Guest can update personal details via account settings
  - Propagate changes to all active reservations
  - Update search index and caches

Data Portability (Article 20):
  - Export in JSON and CSV formats
  - Includes: bookings, reviews, preferences, loyalty points
```

### PII Encryption

```
Encryption strategy:
  At rest:
    - Guest PII fields encrypted using envelope encryption
    - Encryption key per guest (wrapped by master key in key management service)
    - Encrypted fields: first_name, last_name, email, phone
    - email_hash stored separately for lookups without decryption
    - Master key rotation: annually

  In transit:
    - TLS 1.3 for all API communication
    - mTLS between internal services
    - Certificate rotation: 90 days

  Key management:
    - Master keys stored in hardware security module (HSM)
    - Data encryption keys (DEKs) wrapped by master key
    - Key access audit logged
```

---

## Threat Model

### Threat Categories

| Threat | Attack Vector | Impact | Likelihood | Mitigation |
|--------|--------------|--------|------------|------------|
| **Fake Property Listings** | Fraudster creates fake hotel to collect payments | Financial loss, reputation damage | Medium | Property verification workflow; identity verification; address verification; test booking audit |
| **Review Fraud** | Fake accounts submit fake positive/negative reviews | Ranking manipulation; unfair competition | High | Verified-stay requirement; ML fraud detection; behavioral analysis; manual moderation |
| **Rate Scraping** | Competitors/aggregators scrape pricing data at scale | Loss of competitive advantage; infrastructure cost | High | Rate limiting; fingerprinting; CAPTCHA on suspicious patterns; legal (terms of service) |
| **Denial of Inventory** | Bots hold rooms without paying to block legitimate guests | Revenue loss; guest frustration | Medium | Hold limits per user/IP; progressive TTL; behavioral detection; invisible CAPTCHA |
| **Payment Fraud** | Stolen credit cards used for bookings | Chargebacks; financial loss | Medium | 3D Secure; AVS; velocity checks; fraud scoring; manual review for high-risk bookings |
| **Account Takeover** | Credential stuffing, phishing | Unauthorized bookings; loyalty point theft | Medium | MFA; breached password detection; login anomaly detection; session management |
| **Data Breach** | SQL injection, insider threat, infrastructure compromise | PII exposure; regulatory fines; reputation damage | Low | Input validation; parameterized queries; encryption at rest; access controls; monitoring |
| **Price Manipulation** | Property inflates price then offers "discount" | Guest deception; regulatory violation | Medium | Historical price tracking; mandatory rate display rules; automated compliance checks |

### Anti-Scraping Strategy

```
Defense layers:
  1. Rate limiting: 100 search requests per minute per IP/session
  2. Progressive CAPTCHA: invisible → checkbox → image challenge
  3. Device fingerprinting: detect headless browsers, automated tools
  4. API authentication: require session token for search API
  5. Response watermarking: embed unique identifiers in rate data
  6. Legal: terms of service prohibit automated scraping; DMCA takedowns

Detection signals:
  - Request velocity > 10 searches/sec from single source
  - No mouse/touch events between searches (headless browser)
  - Systematic exploration patterns (iterate through all cities)
  - Missing browser fingerprint signals (fonts, canvas, WebGL)
  - User agent anomalies
```

### Fake Listing Prevention

```
Property verification workflow:
  1. Identity verification: business license, government ID of owner
  2. Address verification: cross-reference with mapping data; require utility bill
  3. Photo verification: reverse image search to detect stock photos; require metadata
  4. Test booking: platform sends test booking; property must confirm
  5. Initial monitoring: first 30 days, manual review of all bookings
  6. Ongoing: anomaly detection for unusual booking patterns, complaint monitoring

Red flags:
  - New listing with unusually low prices
  - Property location in non-residential area
  - No online presence outside our platform
  - High rate of guest complaints about property not existing
```

---

## Authentication & Authorization

### Authentication

```
Guest authentication:
  - Email + password with bcrypt hashing (cost factor 12)
  - Social login (federated identity: Google, Apple, Facebook)
  - Magic link (passwordless email login)
  - MFA: TOTP or SMS for high-value accounts (loyalty platinum, business accounts)

Property manager authentication:
  - Email + password with mandatory MFA
  - IP allowlisting for extranet access (optional, per property)
  - Session timeout: 30 minutes of inactivity

API authentication:
  - Channel manager APIs: OAuth 2.0 client credentials grant
  - Rate-limited API keys with per-channel scopes
  - Webhook signature verification (HMAC-SHA256)
```

### Authorization Model

```
Role-based access control (RBAC):

Guest:
  - Search properties (public)
  - View property details (public)
  - Create booking (authenticated)
  - View/modify/cancel own bookings (authenticated, own resource)
  - Submit review (authenticated, post-stay)

Property Manager:
  - Manage own property: rooms, rates, availability, photos
  - View bookings for own property
  - Respond to reviews for own property
  - Cannot access other properties' data

Revenue Manager:
  - All Property Manager permissions
  - Configure overbooking settings
  - Access revenue analytics
  - Set promotional rates

Platform Admin:
  - Property verification and moderation
  - Review moderation
  - Fraud investigation
  - System configuration

Channel Manager (API):
  - Read availability for mapped properties
  - Create bookings for mapped properties
  - Update rate for mapped properties (if authorized)
  - Cannot access guest PII
```

---

## Secure Communication

```
External communication:
  - TLS 1.3 minimum for all client-facing APIs
  - HSTS headers with preload
  - Certificate transparency monitoring
  - Content Security Policy headers

Internal communication:
  - mTLS between all services (zero-trust network)
  - Service mesh for traffic encryption and authentication
  - No plain-text internal communication

Channel manager communication:
  - OAuth 2.0 for API authentication
  - HMAC-SHA256 for webhook signature verification
  - IP allowlisting for channel API endpoints
  - Encrypted payload for sensitive data (rates, availability)
```

---

## Audit Logging

```
Audit log events:
  - All booking operations (create, modify, cancel, refund)
  - All payment operations (pre-auth, capture, refund)
  - All availability changes (manual, booking-triggered, channel-sync)
  - All rate changes
  - All login events (success, failure, MFA challenge)
  - All PII access events
  - All admin actions (moderation, configuration changes)

Audit log properties:
  - Immutable (append-only, tamper-evident)
  - Retained for 7 years
  - Encrypted at rest
  - Indexed for rapid forensic investigation
  - GDPR-compliant (PII in audit logs subject to erasure rules)

Format:
  {
    timestamp, event_type, actor_id, actor_type,
    resource_type, resource_id, action, result,
    ip_address, user_agent, changes (before/after)
  }
```
