# 14.11 AI-Native Digital Storefront Builder for SMEs — Security & Compliance

## Authentication and Authorization

### Merchant Authentication

**Multi-factor authentication flow:**

1. **Primary authentication:** Phone number + OTP (primary for Indian SME users who may not have email-based habits) or email + password with bcrypt hashing (cost factor 12)
2. **Session management:** JWT tokens with 24-hour expiry for active sessions; refresh tokens with 30-day expiry stored as HTTP-only secure cookies
3. **MFA enforcement:** Required for sensitive operations (payment settings, domain changes, API key management); optional for daily operations (product edits, order management)
4. **Device fingerprinting:** Trusted device registry; login from new device triggers OTP verification even within an active session

### Authorization Model

**Role-based access control (RBAC) with store-level isolation:**

| Role | Scope | Permissions |
|---|---|---|
| Owner | Full store access | All operations including deletion, payment config, team management |
| Manager | Store operations | Product management, order processing, analytics; no payment config or deletion |
| Staff | Limited operations | Order fulfillment, inventory updates; no product creation or pricing changes |
| API Client | Programmatic access | Scoped by API key permissions; rate-limited per key |

**Tenant isolation enforcement:**

Every API request passes through a tenant context middleware that:
1. Extracts `store_id` from the authenticated session
2. Injects `store_id` as a mandatory filter on all database queries
3. Validates that the requested resource belongs to the authenticated tenant
4. Logs access attempts that cross tenant boundaries (security incident)

```
FUNCTION tenantMiddleware(request, next):
    authenticatedStoreId = request.session.storeId
    requestedResource = extractResourceId(request)

    IF requestedResource.storeId != authenticatedStoreId:
        logSecurityEvent("CROSS_TENANT_ACCESS_ATTEMPT", {
            authenticatedStore: authenticatedStoreId,
            requestedStore: requestedResource.storeId,
            endpoint: request.path,
            ip: request.ip
        })
        RETURN 403 Forbidden

    request.context.tenantFilter = {store_id: authenticatedStoreId}
    RETURN next(request)
```

**Database-level enforcement:**
- Row-level security policies on all tables: `WHERE store_id = current_tenant_id()`
- Prevents SQL injection or ORM bugs from leaking data across tenants
- Database connection pool sets `tenant_id` context variable per connection

### Customer-Facing Storefront Authentication

- **Guest checkout:** Allowed with phone number for order tracking
- **Customer accounts:** Optional; phone + OTP authentication
- **No password storage for customers:** OTP-only auth eliminates password-related vulnerabilities

---

## Data Security

### Data Classification

| Classification | Examples | Encryption | Retention | Access |
|---|---|---|---|---|
| **Critical** | Payment credentials, gateway API keys, bank details | Encrypted at rest (envelope encryption); encrypted in transit (TLS 1.3) | As needed; deleted on account closure | Owner only; no support staff access |
| **Sensitive** | Customer PII (name, phone, address), order details | Encrypted at rest; encrypted in transit | 7 years (tax compliance) | Owner + authorized staff |
| **Internal** | Product data, inventory, analytics | Encrypted at rest | Duration of account + 90 days | All store roles |
| **Public** | Published storefront content, public product images | Transit encryption only | As long as store is active | Everyone |

### Payment Data Security

**PCI DSS compliance strategy:** The platform does NOT store, process, or transmit card data directly. All card payments are handled by PCI-compliant payment gateways via:

1. **Tokenization:** Card details entered directly on the gateway's hosted payment page or iframe. The platform receives only a payment token.
2. **Server-side payment initiation:** For UPI and wallet payments, the platform initiates the payment via gateway API and receives callback with transaction status.
3. **No card data in logs:** Log sanitization middleware strips any pattern matching card numbers (16-digit sequences), CVVs (3-4 digit sequences after card context), or full bank account numbers.

**Gateway credentials storage:**
- API keys and secrets stored in a secrets management service (not in application config or database)
- Rotated every 90 days; automated rotation pipeline with zero-downtime key swap
- Access logged and alerted for any out-of-band access

### Image and Content Security

- **Product images:** Scanned for malware on upload; EXIF metadata stripped (prevents location leakage from phone photos)
- **User-generated content:** Sanitized for XSS on input; CSP headers on storefront pages prevent injection
- **AI-generated content:** Filtered for harmful, offensive, or trademark-infringing text before publishing

---

## Threat Model

### Threat 1: Cross-Tenant Data Leakage

**Attack vector:** SQL injection, ORM misconfiguration, or application bug allows one merchant to access another merchant's product catalog, customer data, or orders.

**Impact:** Critical — privacy breach, loss of merchant trust, regulatory penalties.

**Mitigations:**
1. Row-level security at database layer (defense in depth beyond application-level filtering)
2. Parameterized queries exclusively; no dynamic SQL construction
3. Tenant isolation integration tests: automated tests that attempt cross-tenant access and verify rejection
4. Quarterly penetration testing focused on multi-tenant isolation
5. Bug bounty program with bonus for tenant isolation bypasses

### Threat 2: Account Takeover of Merchant Account

**Attack vector:** SIM swapping (common in India) to intercept OTP; phishing for email credentials; session hijacking.

**Impact:** High — attacker gains full access to store, can modify products, redirect payment settlements, access customer data.

**Mitigations:**
1. **SIM swap detection:** If OTP delivery fails after successful previous deliveries from the same number, trigger additional verification (email confirmation, security questions)
2. **Session binding:** Session tokens bound to device fingerprint; new device requires re-authentication
3. **Critical action re-authentication:** Payment configuration changes require fresh OTP within 5 minutes
4. **Login anomaly detection:** Alert on login from new geography, unusual time, or rapid successive login attempts
5. **Payment settlement freeze:** Changes to bank account or settlement config require 48-hour cooling period with merchant notification

### Threat 3: Competitor Price Scraping of Merchant Storefronts

**Attack vector:** Competitors or aggregators systematically scrape product prices and catalog from merchant storefronts.

**Impact:** Medium — merchants lose competitive advantage; platform's pricing intelligence becomes available to non-users.

**Mitigations:**
1. **Rate limiting per IP:** Progressive throttling for rapid page requests (> 100 pages/minute from single IP)
2. **Bot detection:** JavaScript challenge for suspicious request patterns (no cookie support, sequential URL access, headless browser fingerprints)
3. **Price obfuscation for bots:** Render prices via client-side JavaScript for detected bots (not in initial HTML)
4. **Robots.txt and meta tags:** Signal to well-behaved crawlers which pages are indexable

### Threat 4: Payment Fraud (Fake Orders / Refund Abuse)

**Attack vector:** Fraudulent orders placed with stolen UPI credentials; systematic refund requests for delivered goods.

**Impact:** High — direct financial loss to merchants; chargeback fees.

**Mitigations:**
1. **Order velocity checks:** Flag accounts placing > 5 orders in 1 hour or > 20 orders/day
2. **Device fingerprinting:** Link orders to device; flag new devices with high-value orders
3. **COD verification:** Automated pre-delivery calls (described in deep-dive section)
4. **Refund pattern analysis:** Track refund rate per customer; auto-flag customers with > 30% refund rate
5. **Address verification:** Cross-reference delivery address with phone number registration area

### Threat 5: AI Content Manipulation

**Attack vector:** Adversarial product images designed to make the AI generate misleading or offensive descriptions; prompt injection via product name or description fields.

**Impact:** Medium — merchant reputation damage; potential regulatory issues for misleading product claims.

**Mitigations:**
1. **Content safety filter:** AI-generated descriptions pass through a safety classifier before publishing
2. **Input sanitization:** Product names and merchant descriptions are sanitized before being included in LLM prompts; injection patterns detected and blocked
3. **Trademark detection:** Generated descriptions scanned against trademark database; trademarked terms flagged for review
4. **Merchant review gate:** First 5 products require explicit merchant approval before auto-publish is enabled

---

## Compliance

### Data Protection

| Regulation | Applicability | Compliance Measures |
|---|---|---|
| **IT Act (India)** | All operations | Reasonable security practices; data breach notification within 72 hours; appointed Grievance Officer |
| **DPDP Act (India)** | Personal data processing | Consent collection for data processing; data principal rights (access, correction, deletion); data fiduciary obligations |
| **PCI DSS** | Payment processing | No direct card data handling (via tokenized gateway); annual SAQ-A self-assessment |
| **GST Compliance** | Merchant tax obligations | GST-compliant invoice generation; HSN code mapping for products; GSTN integration for filing support |
| **Consumer Protection Act** | E-commerce operations | Mandatory return policy display; grievance redressal mechanism; product origin disclosure |

### Data Residency

- All merchant and customer data stored within India (compliance with data localization requirements)
- CDN edge caches may store storefront content globally (public data only; no PII cached at edge)
- Payment data processed exclusively through India-registered payment gateways
- Backup and DR region: secondary region within India

### Right to Deletion

**Merchant account closure flow:**
1. Merchant requests account deletion
2. System verifies no pending orders or unsettled payments
3. **Immediate:** Store delisted; storefront returns 404; channel listings removed
4. **Within 30 days:** All merchant-identifiable data anonymized or deleted
5. **Retained (anonymized):** Aggregated analytics data; transaction records (7-year tax requirement, with PII removed)
6. **Retained (as-is):** Customer order records (customer's data, retained per customer's relationship with the platform)

### Audit Trail

All sensitive operations are logged with:
- Who (merchant ID, user role, IP address, device fingerprint)
- What (operation type, affected resource IDs)
- When (timestamp with timezone)
- From where (IP geolocation, device type)
- Outcome (success/failure, error codes)

Audit logs are append-only, stored in a separate database with restricted access. Retention: 3 years. Integrity: cryptographic hash chain prevents tampering.
