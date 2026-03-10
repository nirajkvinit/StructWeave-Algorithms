# 12.18 Marketplace Platform — Security & Compliance

## Payment Security: PCI-DSS

The marketplace handles card payments at scale, making PCI-DSS compliance a structural design requirement, not an afterthought.

### Cardholder Data Isolation

The fundamental PCI-DSS strategy is to minimize cardholder data (CHD) scope—ideally, raw card numbers never touch the marketplace's servers:

```
Tokenization flow:
  1. Buyer enters card details in checkout UI
  2. JavaScript SDK from the payment processor transmits card data
     DIRECTLY to the processor's servers (never to marketplace servers)
  3. Processor returns a token (e.g., "tok_abc123") to the marketplace
  4. Marketplace stores the token, not the card number
  5. Subsequent charges use the token; only the processor knows the
     actual card number

Scope reduction:
  Without tokenization: marketplace servers, databases, and network
     are ALL in PCI scope
  With tokenization: only the checkout page UI rendering is in scope
     (SAQ-A or SAQ-A-EP, not full SAQ-D)
```

### PCI Control Implementation

| PCI Requirement | Implementation |
|---|---|
| Encrypted transmission | TLS 1.3 for all payment data in transit; HSTS enforced |
| Access control | Role-based access; engineers cannot access payment token database without approval workflow |
| Audit logging | All access to payment records logged and retained 12 months |
| Vulnerability management | Quarterly penetration testing of payment flows; continuous DAST scanning |
| Network segmentation | Payment processing services in isolated network segment; no direct internet exposure |
| Key management | Encryption keys managed in hardware security module (HSM); key rotation every 12 months |

---

## Seller Identity Verification: KYC/KYB

### Tiered Verification Model

Not all sellers require the same level of verification. Applying full KYC to a casual seller listing a few used items creates unnecessary friction. The platform uses a risk-based tiered model:

| Tier | Trigger | Verification Required | Rationale |
|---|---|---|---|
| **Tier 1 — Casual** | < $500/year GMV | Email + phone number | Minimal friction for small sellers |
| **Tier 2 — Active** | $500–$20,000/year GMV | Government ID scan + selfie match | Regulatory threshold in most jurisdictions; payout velocity check |
| **Tier 3 — Business** | > $20,000/year GMV | Business registration + beneficial owner (KYB) + tax ID | IRS 1099-K reporting threshold; marketplace facilitator obligations |
| **Tier 4 — High Risk** | Certain categories (electronics, luxury goods, pharmaceuticals) | Enhanced due diligence; category permit verification | Counterfeit and safety risk |

**KYC provider integration:** Identity verification is outsourced to a regulated KYC provider (document scanning, liveness detection, sanctions screening). The marketplace stores verification status and expiry, not raw identity documents.

### AML Transaction Monitoring

Large-volume sellers processing high GMV trigger AML (anti-money laundering) monitoring:

- **Structuring detection:** Flagging patterns where a seller splits transactions to stay below reporting thresholds
- **Velocity anomalies:** A seller's monthly GMV suddenly increasing 10× without corresponding listing or review growth
- **Geographic anomalies:** Seller's registered location inconsistent with shipping origin or payout destination
- **Sanctions screening:** Seller name and business entities screened against OFAC SDN list at onboarding and on periodic refresh

---

## Buyer Data Protection: GDPR and CCPA

### Data Minimization

The marketplace collects only the data required for the transaction:

- **Payment data:** Tokenized; raw card data never stored
- **Address data:** Stored for order fulfillment; deleted or anonymized 180 days after last order
- **Browse data:** Search and view history used for personalization; retention limited to 12 months; anonymized for analytics after 90 days
- **Communication data:** Buyer-seller messages retained for 2 years (dispute resolution requirement); access restricted to trust & safety team

### Right-to-Deletion Workflow

When a buyer requests data deletion under GDPR/CCPA:

```
Deletion request received:
  1. Immediate: anonymize buyer profile (replace name/email with hashed pseudonym)
  2. Within 30 days: delete browse history, search history, personalization data
  3. EXCEPTION: Order records retained for 7 years (tax/financial regulation)
  4. EXCEPTION: Dispute records retained for 3 years after resolution (legal claim window)
  5. EXCEPTION: Fraud signals retained in anonymized form for model training
  6. Confirmation sent to buyer with deletion certificate
```

**Cascading deletion complexity:** If a buyer deletes their account, their reviews of sellers must also be handled carefully. Reviews are public-facing content tied to seller quality scores. Policy options:
- Anonymize review author (show "verified buyer") but retain review content and score
- Delete review entirely (degrades seller quality score accuracy)

Production choice: anonymize author, retain content; inform user at deletion time.

---

## Marketplace Facilitator Tax Compliance

Marketplace facilitator laws in 45+ US states and EU VAT rules make the platform responsible for collecting and remitting sales tax on behalf of sellers—even if the seller is unaware of their state's nexus requirements.

### Tax Architecture

```
Tax calculation:
  At checkout:
    1. Determine buyer's shipping address (jurisdiction)
    2. Determine seller's nexus states (registered + economic nexus based on GMV)
    3. Query tax engine API (external provider) with:
         - item category (taxability varies by product type)
         - buyer zip code
         - seller nexus states
    4. Tax engine returns: applicable rate, tax amount, jurisdiction codes
    5. Tax amount added to buyer's total
    6. Tax funds flow into dedicated tax remittance account

Tax remittance:
  Monthly batch job:
    - Aggregate tax collected by state/jurisdiction
    - Generate filing summary
    - Initiate transfers to tax authority accounts (ACH or wire per state requirement)
    - Store filing record for audit trail

1099-K reporting (US):
  - For sellers above IRS reporting threshold ($600/year as of 2025 reporting)
  - Generate 1099-K form with platform EIN, seller SSN/EIN, gross payments
  - File electronically with IRS by January 31; deliver to seller by January 31
```

---

## Fraud and Abuse Prevention

### Defense-in-Depth Layers

| Layer | Mechanism | Latency Impact |
|---|---|---|
| **Network** | Rate limiting by IP/device fingerprint; DDoS protection at edge | None (pre-application) |
| **Authentication** | Credential stuffing detection; CAPTCHA on suspicious login; MFA for high-value actions | < 100ms |
| **Request** | Velocity checks; bot detection (headless browser signals, mouse movement entropy) | < 50ms |
| **Business logic** | Transaction fraud scoring (real-time ML model) before payment authorization | < 200ms inline |
| **Async** | Review fraud graph analysis; listing fraud deep scan; behavioral pattern analysis | Minutes (background) |
| **Manual** | Trust analyst review queue for flagged accounts and listings | Hours (human) |

### Fraud Model Architecture

Real-time transaction fraud scoring runs inline in the checkout path:

```
Input features (assembled at checkout):
  - Buyer account age, prior order count, prior dispute rate
  - Device fingerprint (new vs. known device)
  - Billing-shipping address distance
  - Order value vs. buyer's historical AOV (anomaly score)
  - Card velocity (orders on this card in last 1 hour / 24 hours)
  - IP geolocation vs. billing address (mismatch score)
  - Time-of-day (fraud peaks at unusual hours)
  - Item category risk score (electronics and gift cards are high risk)

Output:
  - Fraud probability score (0.0–1.0)
  - Risk tier: LOW / MEDIUM / HIGH / BLOCKED

Routing:
  LOW (< 0.3):    Proceed to checkout normally
  MEDIUM (0.3–0.7): 3D Secure authentication challenge required
  HIGH (0.7–0.9):  Manual review required before order completes
  BLOCKED (> 0.9): Order rejected; buyer sees generic payment failure message
```

---

## Security Incident Response

### Account Takeover Response Playbook

When ATO is detected (impossible travel, device fingerprint change, banking detail modification):

1. **Immediate:** Suspend active session; force re-authentication
2. **Immediate:** Freeze all pending payouts to unverified bank accounts
3. **Within 5 minutes:** Notify seller via all registered contact methods (email + SMS + push)
4. **Within 1 hour:** Trust analyst reviews account for scope of compromise
5. **Recovery:** Verified identity re-verification required before reinstating banking details; 72-hour hold on resumed payouts

### Seller Data Breach (Inventory/Pricing Scraping)

Bulk scraping of listing data (for competitive intelligence) is a lower-severity but common attack:

- **Detection:** Unusual request patterns (many listings/second from single IP or fingerprint)
- **Response:** Progressive rate limiting → CAPTCHA challenge → block
- **Legitimate scraping:** Public API with rate limits and terms of service for research and price comparison use cases
