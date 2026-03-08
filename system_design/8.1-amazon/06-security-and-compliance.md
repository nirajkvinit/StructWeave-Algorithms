# Security & Compliance

## Threat Model

### Key Attack Surfaces

| Attack Surface | Threat | Risk Level |
|---------------|--------|------------|
| **Checkout / Payment** | Credit card theft, payment fraud | Critical |
| **User Accounts** | Credential stuffing, account takeover | Critical |
| **Product Listings** | Counterfeit products, listing manipulation | High |
| **Reviews** | Fake reviews, review bombing, incentivized reviews | High |
| **Shopping Cart / Deals** | Bot-driven inventory hoarding, deal abuse | High |
| **Seller Accounts** | Fraudulent sellers, account hijacking | High |
| **Search / Pricing** | Price manipulation, SEO spam, keyword stuffing | Medium |
| **APIs** | DDoS, scraping, rate limit bypass | Medium |

---

## PCI-DSS Compliance

### Scope Minimization

The platform never stores, processes, or transmits raw card numbers. All payment data flows through a PCI-DSS Level 1 compliant payment gateway.

```
Customer enters card details:
1. Card form is an iframe served by payment gateway (not our domain)
2. Card data goes directly to payment gateway → never touches our servers
3. Payment gateway returns a token: "tok_abc123"
4. Our system stores only the token + last 4 digits + card brand
5. Charges are made via: chargeToken("tok_abc123", $247.50)

Our PCI-DSS scope: SAQ A (minimal) — we handle tokens, not card data
```

### Payment Data Handling

| Data | Storage | Encryption | Access |
|------|---------|------------|--------|
| Card numbers | Never stored (tokenized at gateway) | N/A | N/A |
| Payment tokens | Encrypted at rest in Order DB | Field-level encryption | Payment Service only |
| Last 4 digits | Order DB (for display) | Standard encryption | Customer-facing services |
| Billing address | Order DB | Standard encryption | Checkout, Order services |
| Transaction logs | Append-only audit log | Encrypted at rest | Auditors, fraud team |

---

## Fraud Detection

### Order Fraud Signals

```
FUNCTION evaluateFraudRisk(order, user):
    signals = []
    risk_score = 0

    -- Address mismatch
    IF order.shipping_address != user.billing_address:
        risk_score += 15
        signals.append("SHIPPING_BILLING_MISMATCH")

    -- New account with high-value order
    IF user.account_age < 7 DAYS AND order.total > $500:
        risk_score += 25
        signals.append("NEW_ACCOUNT_HIGH_VALUE")

    -- Unusual shipping destination
    IF order.shipping_address.country != user.usual_country:
        risk_score += 20
        signals.append("UNUSUAL_DESTINATION")

    -- Velocity check
    IF user.orders_last_24h > 5:
        risk_score += 30
        signals.append("HIGH_ORDER_VELOCITY")

    -- Device fingerprint mismatch
    IF order.device_fingerprint NOT IN user.known_devices:
        risk_score += 15
        signals.append("UNKNOWN_DEVICE")

    -- Multiple failed payment attempts
    IF user.failed_payments_last_hour > 3:
        risk_score += 35
        signals.append("MULTIPLE_PAYMENT_FAILURES")

    -- ML model score (trained on historical fraud patterns)
    ml_score = fraudModel.predict(order, user)
    risk_score += ml_score * 40  -- ML contributes up to 40 points

    RETURN {
        risk_score: risk_score,       -- 0-100
        signals: signals,
        action: CASE
            WHEN risk_score < 30 THEN "APPROVE"
            WHEN risk_score < 60 THEN "ADDITIONAL_VERIFICATION"  -- step-up auth
            WHEN risk_score < 80 THEN "MANUAL_REVIEW"
            ELSE "BLOCK"
    }
```

### Account Takeover Prevention

| Defense Layer | Mechanism |
|--------------|-----------|
| **Login** | Rate limiting (5 attempts/10 min), CAPTCHA after 3 failures |
| **Password** | Bcrypt hashing, minimum 8 chars, breach password database check |
| **MFA** | TOTP or SMS-based second factor for account changes and high-value orders |
| **Session** | Short-lived JWTs (15 min), refresh token rotation, device binding |
| **Anomaly Detection** | Alert on: login from new country, password change + address change in same session, bulk order pattern |
| **Recovery** | Identity verification required for password reset (email + phone or ID verification) |

---

## Bot Protection

### Attack Vectors

| Bot Type | Goal | Impact |
|----------|------|--------|
| **Inventory hoarding** | Hold flash deal items without purchasing | Denies inventory to real customers |
| **Price scraping** | Extract pricing data for competitor intelligence | Increased infrastructure cost, data leakage |
| **Account creation** | Create fake accounts for fraud or review manipulation | Pollutes platform, enables fraud |
| **Credential stuffing** | Test stolen credentials against accounts | Account takeover |
| **Scalping** | Buy limited-quantity items for resale | Customer dissatisfaction |

### Multi-Layer Bot Defense

```
Layer 1: Network (before reaching application)
├── Rate limiting: per IP, per user, per session
├── IP reputation: block known bot networks, VPN/proxy detection
└── TLS fingerprinting: detect non-browser TLS stacks

Layer 2: Application (request analysis)
├── Device fingerprinting: canvas, WebGL, fonts, timezone
├── Behavioral analysis: mouse movements, scroll patterns, keystroke dynamics
├── CAPTCHA: invisible for low-risk, visible for medium-risk
└── JavaScript challenge: require JS execution (blocks simple HTTP bots)

Layer 3: Business Logic (activity patterns)
├── Cart velocity: max 5 items/minute per session
├── Flash deal limits: 1 claim per user per deal, max 3 active deal holds
├── Search velocity: max 60 searches/minute per user
└── Account creation: max 2 accounts per device fingerprint
```

---

## Seller Verification and Trust

### Seller Onboarding

```
Step 1: Identity Verification
├── Business registration documents
├── Government-issued ID for primary owner
├── Bank account verification (micro-deposit)
└── Tax ID validation

Step 2: Listing Quality Check
├── First 5 listings manually reviewed
├── Image quality automated check (resolution, background, watermarks)
├── Price reasonableness check (vs. market average)
└── Category accuracy validation

Step 3: Probation Period (90 days)
├── Enhanced monitoring of all orders
├── Extended payment hold (14 days vs. standard 3 days)
├── Lower buy box eligibility
└── Automatic suspension if defect rate > 3%

Step 4: Established Seller
├── Standard payment terms
├── Full buy box eligibility
├── Access to advertising tools
└── Quarterly performance review
```

### Counterfeit Detection

| Signal | Detection Method | Action |
|--------|-----------------|--------|
| Brand rights claim | Brand owner reports listing | Immediate removal, seller warning |
| Price anomaly | Item priced 70%+ below market average | Flag for review, suppress from search |
| Image duplication | Perceptual hash matches known counterfeit listings | Flag for review |
| Customer returns | High "not as described" or "counterfeit" return rate | Suspend listing, investigation |
| Serial number validation | Brand-authorized serial number verification | Verified authentic badge |

---

## Review Integrity

### Fake Review Detection

```
FUNCTION evaluateReviewAuthenticity(review, user, product):
    signals = []
    fraud_score = 0

    -- Verified purchase check
    IF NOT hasOrderForProduct(user, product):
        fraud_score += 30
        signals.append("UNVERIFIED_PURCHASE")

    -- Review velocity
    IF user.reviews_last_24h > 10:
        fraud_score += 40
        signals.append("HIGH_REVIEW_VELOCITY")

    -- Account age
    IF user.account_age < 30 DAYS:
        fraud_score += 15
        signals.append("NEW_ACCOUNT")

    -- Text analysis
    IF isGeneratedText(review.body):  -- AI-generated content detection
        fraud_score += 35
        signals.append("GENERATED_TEXT")

    -- Network analysis
    related_reviewers = findReviewersFromSameNetwork(user)
    IF related_reviewers.count > 5 AND
       related_reviewers.reviewed_same_products > 3:
        fraud_score += 50
        signals.append("REVIEW_RING")

    -- Incentivized review detection
    IF containsIncentiveLanguage(review.body):  -- "free product", "discount for review"
        fraud_score += 40
        signals.append("INCENTIVIZED")

    RETURN {
        fraud_score,
        signals,
        action: CASE
            WHEN fraud_score < 25 THEN "PUBLISH"
            WHEN fraud_score < 50 THEN "DELAYED_PUBLISH"  -- publish after 48h cooling
            WHEN fraud_score < 75 THEN "MANUAL_REVIEW"
            ELSE "REJECT"
    }
```

### Review Weighting

Not all reviews are weighted equally in the aggregate rating:

```
Review weight factors:
├── Verified purchase:    2.0× weight
├── Helpful votes > 10:  1.5× weight
├── Includes images:     1.3× weight
├── Recency (< 6 months): 1.2× weight
├── Reviewer reputation:  0.5× to 1.5× based on review history quality
└── Minimum threshold:    product needs 5+ reviews before aggregate is displayed
```

---

## GDPR Compliance

### Data Subject Rights

| Right | Implementation |
|-------|---------------|
| **Right to Access** | Self-service data export: orders, reviews, search history, cart, profile → downloadable archive |
| **Right to Erasure** | Delete account → anonymize personal data in orders (retain for financial/legal obligations), delete reviews, delete search history |
| **Right to Rectification** | Self-service profile editing; address, name, email changes with verification |
| **Right to Portability** | Machine-readable export (JSON/CSV) of all personal data within 30 days |
| **Right to Restriction** | Pause data processing for marketing; retain for order fulfillment obligations |
| **Consent Management** | Granular consent: marketing emails, personalized recommendations, cookies, third-party data sharing |

### Data Retention Policies

| Data Type | Retention Period | Rationale |
|-----------|-----------------|-----------|
| Order records | 7 years | Financial/tax compliance |
| Payment records | 7 years | Financial regulations |
| Customer profile | Until account deletion + 30 day grace period | User-controlled |
| Search history | 90 days | Personalization; auto-purge |
| Cart data | 30 days (guest), until deletion (authenticated) | Functional need |
| Reviews | Until deletion or product removal | Community content |
| Seller performance data | 3 years post-account closure | Marketplace integrity |
| Application logs | 90 days | Debugging and security |
| IP addresses in logs | 30 days then anonymized | Security, then privacy |

### EU Data Residency

EU customer data is stored in EU-region data centers:
- Orders, payments, profiles for EU customers → EU-West region
- Product catalog (non-personal) → globally replicated
- Cross-region analytics → data anonymized before export from EU

---

## API Security

| Control | Implementation |
|---------|---------------|
| **Authentication** | OAuth 2.0 with JWT; short-lived access tokens (15 min) + refresh tokens |
| **Rate Limiting** | Tiered: 100 req/min (anonymous), 1000 req/min (authenticated), 10000 req/min (seller API) |
| **Input Validation** | Server-side validation on all inputs; parameterized queries (no SQL injection); HTML sanitization for reviews/descriptions |
| **CORS** | Strict origin whitelist; no wildcard |
| **HTTPS** | TLS 1.3 only; HSTS with 1-year max-age |
| **API Versioning** | URL-based (/v1/, /v2/); 12-month deprecation notice |
| **Webhook Signatures** | HMAC-SHA256 on all outbound webhooks to sellers |
