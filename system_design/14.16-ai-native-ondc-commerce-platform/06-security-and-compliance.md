# 14.16 AI-Native ONDC Commerce Platform — Security & Compliance

## Security Architecture Overview

The ONDC platform operates in a federated trust model where no single entity is inherently trusted. Security must be enforced at the protocol level (digital signatures, non-repudiation), the network level (NP authentication, message integrity), and the data level (tenant isolation, PII protection, consent management). The India Stack integration adds regulatory requirements around Aadhaar data handling, UPI transaction security, and Account Aggregator consent frameworks.

---

## Digital Signature and Non-Repudiation

### Beckn Protocol Signing

Every Beckn protocol message is digitally signed to ensure authenticity, integrity, and non-repudiation.

```
DigitalSignatureScheme:

  Algorithm: Ed25519 (used by ONDC registry for NP key registration)

  Key Management:
    - Each NP registers a public key with the ONDC registry during onboarding
    - Private key stored in hardware security module (HSM) or managed key vault
    - Key rotation: Every 90 days; old keys retained for verification of historical messages
    - Key revocation: Immediate via ONDC registry update; all NPs refresh key cache within 1 hour

  Signing Process (Outbound):
    1. Construct the Beckn message body
    2. Canonicalize: Sort JSON keys alphabetically, remove whitespace, UTF-8 encode
    3. Compute Blake2b-512 digest of canonical body
    4. Sign digest with NP's Ed25519 private key (via HSM API call)
    5. Base64-encode the signature
    6. Add Authorization header:
       Signature keyId="{subscriber_id}|{unique_key_id}|ed25519",
       algorithm="ed25519", created="{unix_timestamp}",
       expires="{unix_timestamp + ttl}", headers="(created) (expires) digest",
       signature="{base64_signature}"

  Verification Process (Inbound):
    1. Extract Authorization header fields
    2. Check expiry: reject if current_time > expires
    3. Lookup sender's public key from ONDC registry (cached, TTL=1 hour)
    4. Recompute Blake2b-512 digest of received message body
    5. Verify Ed25519 signature using sender's public key
    6. Accept if valid; NACK with error code AUTHENTICATION_FAILURE if invalid
    7. Log verification result (success/failure) for compliance audit

  Non-Repudiation Guarantee:
    - Every signed message is stored immutably in the protocol message log
    - The message log is the source of truth for dispute resolution
    - Since only the sender possesses the private key, a valid signature proves
      the sender authored the message at the stated time
    - Neither party can deny sending a message once it's in the signed log
```

### Dispute Evidence Chain

```
DisputeEvidenceChain:

  When a dispute arises (e.g., buyer claims non-delivery, seller claims delivery):

  evidence_collection:
    1. on_confirm message (signed by seller NP):
       Proves seller acknowledged the order with specific items and delivery promise

    2. on_status messages (signed by logistics NP):
       Proves logistics partner's tracking events: picked_up, in_transit, out_for_delivery
       Each status update is independently signed by the logistics NP

    3. on_status with fulfillment_state=DELIVERED (signed by logistics NP):
       Proves logistics partner claims delivery occurred at specific timestamp

    4. Delivery proof (if available):
       OTP verification or electronic signature at delivery

    5. Buyer's issue message (signed by buyer NP):
       Proves buyer raised a complaint at specific timestamp

  resolution_logic:
    if delivery_proof exists AND on_status(DELIVERED) exists:
      resolution = FAVOR_SELLER (delivery confirmed by logistics + proof)
    elif on_status(DELIVERED) exists BUT no delivery_proof:
      resolution = INVESTIGATE (logistics claims delivery but no proof)
    elif no on_status(DELIVERED):
      resolution = FAVOR_BUYER (no evidence of delivery)

  # All evidence is cryptographically signed and independently verifiable
  # No party can forge evidence from another party
```

---

## Data Protection in the Federated Model

### Data Minimization by Design

```
DataMinimizationPolicy:

  Principle: Each NP should only receive the minimum data necessary for their role.

  buyer_np_receives:
    - Buyer's personal data (name, address, phone) — owns this
    - Seller's business data (name, location, catalog) — from protocol
    - Order details and status — from protocol
    - Does NOT receive: Seller's bank details, logistics partner's internal operations

  seller_np_receives:
    - Buyer's delivery address and phone (for fulfillment)
    - Order items and quantities
    - Payment confirmation (amount and status, not payment instrument details)
    - Does NOT receive: Buyer's full profile, browsing history, other orders

  logistics_np_receives:
    - Pickup address (seller location)
    - Delivery address (buyer address)
    - Package dimensions and weight
    - Does NOT receive: Order items, prices, buyer/seller identity beyond delivery context

  ondc_gateway_receives:
    - Message headers (routing information)
    - Does NOT receive or store message bodies (pass-through routing)
```

### PII Handling

```
PIIProtectionFramework:

  Classification:
    SENSITIVE:   Aadhaar number, bank account details, UPI VPA
    PERSONAL:    Name, phone, email, delivery address
    BUSINESS:    GST number, FSSAI license, business address
    TRANSACTIONAL: Order details, payment amounts, delivery status

  Storage Rules:
    SENSITIVE:
      - Encrypted at rest with AES-256 (separate encryption key per tenant)
      - Never stored in logs, analytics, or search indices
      - Aadhaar data: Tokenized immediately after e-KYC; raw Aadhaar number deleted
      - Access: Only identity verification service; not exposed to other services

    PERSONAL:
      - Encrypted at rest
      - Masked in logs (phone: "98XXXX4321", email: "r***@gmail.com")
      - Retention: Active account + 180 days post-account-deletion
      - Right to erasure: Delete within 30 days of verified request

    BUSINESS:
      - Encrypted at rest
      - Accessible to compliance and onboarding services
      - Retention: Duration of active NP registration + 7 years (regulatory)

    TRANSACTIONAL:
      - Encrypted at rest
      - Retained for 7 years (income tax, GST audit requirements)
      - Anonymized for analytics after 2 years (remove PII, retain aggregate patterns)

  Cross-NP Data Sharing:
    - PII shared via protocol messages is ephemeral: receiver must not persist
      buyer PII beyond the transaction lifecycle + dispute resolution window
    - Seller NP must delete buyer's phone and address within 30 days of order completion
      (unless active dispute)
    - Enforced via: Periodic audit of NP data retention policies; compliance scoring
```

### Aadhaar Data Protection (UIDAI Compliance)

```
AadhaarComplianceFramework:

  Regulatory Requirement: UIDAI regulations mandate that Aadhaar data must not be stored
  beyond the duration of the authentication transaction.

  Implementation:
    1. Seller initiates e-KYC via platform
    2. Platform redirects to UIDAI-authorized ASA (Authentication Service Agency)
    3. ASA performs biometric/OTP verification with UIDAI
    4. ASA returns: { verified: true, name: "...", address: "...", vid: "virtual_id" }
    5. Platform stores: { seller_id, kyc_status: "verified", kyc_timestamp, vid_hash }
    6. Platform does NOT store: Raw Aadhaar number, biometric data, full KYC response
    7. For re-verification: Trigger fresh e-KYC flow (never replay stored data)

  Audit Trail:
    - Log: { event: "ekyc_initiated", seller_id, timestamp, asa_id }
    - Log: { event: "ekyc_completed", seller_id, timestamp, result: "success|failure" }
    - Do NOT log: Aadhaar number, name, address, or any PII from the KYC response
```

---

## Network Security

### NP Authentication and Authorization

```
NPAuthenticationScheme:

  Registration:
    1. NP registers with ONDC by submitting: legal entity details, domain, subscriber_id,
       subscriber_url, public signing key, supported protocol versions
    2. ONDC verifies the NP's legal entity (GSTIN, PAN, incorporation certificate)
    3. ONDC issues a unique subscriber_id and adds the NP's public key to the registry
    4. NP receives a registry entry that other NPs can look up for verification

  Per-Request Authentication:
    - Every Beckn message includes the Authorization header with the sender's digital signature
    - Receiver verifies signature using the sender's public key from the ONDC registry
    - This is mutual authentication: both request and callback are signed

  Authorization:
    - NPs can only interact within their registered domain (grocery NP can't send fashion messages)
    - NPs can only invoke actions appropriate to their role (buyer NP can't send on_search)
    - Role enforcement is part of schema validation (wrong role → NACK)

  Rate Limiting:
    per_np_limits:
      search:   100 requests/second (search is the most expensive operation)
      select:   200 requests/second
      confirm:  500 requests/second
      status:   1000 requests/second (high-frequency polling for tracking)
    burst_allowance: 2× sustained rate for 30 seconds
    action_on_exceed: HTTP 429 with Retry-After header
```

### Protocol-Level Security

```
ProtocolSecurityMeasures:

  Message Integrity:
    - Blake2b-512 digest in every message ensures body hasn't been tampered
    - Ed25519 signature ensures the message came from the claimed sender
    - Timestamp + TTL prevents replay attacks (reject messages with expired TTL)

  Replay Attack Prevention:
    - Each message has a unique message_id (UUID)
    - Receiver maintains a message_id deduplication window (TTL of message + 5 minutes)
    - Duplicate message_id within the window → reject as replay
    - Transaction_id scoping: message_id must be unique within a transaction_id

  Man-in-the-Middle Prevention:
    - All communication over TLS 1.3 (no fallback to TLS 1.2)
    - Certificate pinning for ONDC registry connections
    - Subscriber URLs validated against registry entries (prevent URL spoofing)

  Injection Prevention:
    - Schema validation rejects malformed payloads before processing
    - No dynamic code execution from message content
    - Catalog descriptions sanitized before rendering (HTML/script stripping)
    - SQL parameterization for all database queries derived from message content
```

---

## Compliance Framework

### Regulatory Compliance Matrix

| Regulation | Requirement | Implementation |
|---|---|---|
| **IT Act 2000** | Digital signature validity; electronic records as legal evidence | Ed25519 signatures on all messages; immutable protocol message log |
| **DPDP Act 2023** | Personal data protection; consent; data minimization; right to erasure | PII classification framework; consent-based data sharing; 30-day erasure SLA |
| **GST Act** | TCS collection on e-commerce; GST invoice generation; return filing | Automated TCS computation at 1%; GST-compliant invoice generation; GSTN integration |
| **UIDAI Regulations** | Aadhaar data handling; no storage beyond authentication | Tokenized storage; no raw Aadhaar persistence; ASA-mediated authentication |
| **RBI Guidelines** | UPI transaction limits; payment data localization | UPI integration via certified PSPs; all payment data stored in India |
| **Consumer Protection (E-Commerce) Rules 2020** | Seller information disclosure; grievance redressal; return policy | Mandatory seller details in on_search; IGM framework; configurable return windows |
| **ONDC Network Policies** | Protocol compliance; data sharing norms; settlement timelines | Compliance scoring engine; data minimization enforcement; settlement SLA monitoring |

### Audit and Compliance Monitoring

```
ComplianceMonitoringSystem:

  Automated Audits:
    - Daily: PII access log review (flag unusual access patterns)
    - Daily: Settlement reconciliation (flag discrepancies > ₹1)
    - Weekly: Data retention compliance (flag data exceeding retention windows)
    - Monthly: Protocol compliance score computation for all NPs
    - Quarterly: Full security audit (penetration testing, code review, infrastructure scan)

  Compliance Dashboard:
    - Real-time: Active NP compliance scores (schema, behavioral, security)
    - Real-time: Data breach indicators (unusual data access, bulk export attempts)
    - Daily: Settlement accuracy metrics (discrepancy rate, resolution time)
    - Monthly: Regulatory compliance status (DPDP, GST, UIDAI checklist)

  Incident Response:
    - Data breach: Notify affected users within 72 hours (DPDP Act requirement)
    - Protocol security vulnerability: Coordinate with ONDC for network-wide advisory
    - NP compromise: Revoke NP's registry entry; reject all messages from compromised NP
    - Settlement fraud: Freeze affected settlements; engage forensic investigation
```

---

## Threat Model

```
ThreatModel:

  Threat 1: Malicious NP (Seller NP sending fraudulent catalogs)
    Attack: NP lists products at attractive prices, collects payments, never fulfills
    Defense: Trust scoring system detects low fulfillment rate → reduces visibility →
             eventually suspends NP; escrow holds for new NPs with low trust scores

  Threat 2: Protocol Message Forgery
    Attack: Attacker intercepts and modifies a Beckn message in transit
    Defense: TLS encryption prevents interception; digital signatures detect modification;
             registry-based key verification prevents key substitution

  Threat 3: Catalog Data Poisoning
    Attack: NP injects malicious content in catalog descriptions (XSS, phishing links)
    Defense: Schema validation rejects non-conforming content; content sanitization
             strips HTML/scripts; URL allowlisting for image sources

  Threat 4: DDoS via Protocol Abuse
    Attack: Malicious NP floods the gateway with search requests
    Defense: Per-NP rate limiting; NP-level circuit breaker; anomaly detection
             flags NPs with sudden traffic spikes; ONDC registry suspension for abusive NPs

  Threat 5: Settlement Manipulation
    Attack: NP submits inflated settlement claims or duplicate settlement requests
    Defense: Settlement anchored to signed protocol messages (no claim without matching
             signed order); deduplication by order_id; daily reconciliation catches discrepancies

  Threat 6: Identity Theft for Seller Onboarding
    Attack: Bad actor uses stolen Aadhaar/GST to register as a seller
    Defense: Aadhaar e-KYC with biometric/OTP (proves liveness); GST certificate cross-check
             with GSTN active status; new seller probation period with order volume limits
```
