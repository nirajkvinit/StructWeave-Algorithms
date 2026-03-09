# Security & Compliance — URL Shortener

## 1. Authentication & Authorization

### 1.1 API Authentication

| Method | Use Case | Implementation |
|---|---|---|
| **API Key** | Programmatic access (server-to-server) | SHA-256 hashed key stored in database; transmitted via `Authorization: Bearer <key>` header |
| **OAuth 2.0** | Web/mobile app access | Authorization code flow for web; PKCE for mobile; tokens with 1-hour expiry |
| **Anonymous** | Public URL creation (free tier, rate-limited) | No authentication; IP-based rate limiting (10 URLs/hour per IP) |

### 1.2 Authorization Model

```
PERMISSION MODEL:

  Role: Anonymous
    - Create short URL (rate-limited: 10/hour)
    - Redirect (unlimited)

  Role: Free User
    - Create short URL (rate-limited: 100/day)
    - View own URL analytics (last 30 days)
    - Delete own URLs

  Role: Pro User
    - Create short URL (rate-limited: 10,000/day)
    - Custom aliases
    - Full analytics (1 year retention)
    - Bulk URL creation
    - Link expiration control

  Role: Enterprise Admin
    - All Pro features
    - Vanity domain management
    - Workspace/team management
    - API key management
    - Advanced analytics export
    - Unlimited retention

  Role: Platform Admin
    - Disable/enable any URL
    - View abuse reports
    - Manage URL reputation database
    - System configuration
```

### 1.3 API Key Management

```
ALGORITHM GenerateAPIKey()
  // Generate a cryptographically random API key
  raw_key ← CRYPTO_RANDOM_BYTES(32)   // 256 bits of entropy

  // Prefix for identification (not security)
  prefix ← "sk_live_"     // "sk_test_" for test keys

  // Display key: shown to user once at creation
  display_key ← prefix + BASE64_URL_ENCODE(raw_key)

  // Storage: only store the hash
  key_hash ← SHA256(raw_key)

  DB.INSERT("api_keys", {
    key_hash: key_hash,
    user_id: current_user.id,
    name: user_provided_name,
    rate_limit: plan_rate_limit,
    created_at: NOW(),
    last_used_at: NULL,
    is_active: TRUE
  })

  RETURN display_key   // Shown once, never stored in plaintext

VALIDATION on each request:
  raw_key ← EXTRACT_FROM_HEADER(request)
  key_hash ← SHA256(raw_key)
  api_key_record ← DB.GET("api_keys", key_hash)
  IF api_key_record == NULL OR NOT api_key_record.is_active
    RETURN 401 Unauthorized
  END IF
  UPDATE api_key_record.last_used_at = NOW()
```

---

## 2. Data Security

### 2.1 Encryption

| Layer | Method | Details |
|---|---|---|
| **In Transit** | TLS 1.3 | All external communication; HSTS with 1-year max-age; HSTS preload list |
| **At Rest (URL store)** | AES-256 | Transparent database encryption; keys rotated quarterly |
| **At Rest (analytics)** | AES-256 | Columnar store encryption; partition-level key management |
| **At Rest (backups)** | AES-256-GCM | Encrypted before upload to object storage; separate key from primary |
| **API Keys** | SHA-256 hash | Only hash stored; raw key shown once at creation |
| **IP Addresses** | SHA-256 hash | IP addresses hashed before storage in click events (privacy-preserving) |

### 2.2 PII Handling

```
PII CLASSIFICATION:

  Direct PII (stored):
    - User email address (encrypted at rest, used for authentication)
    - API key hash (not reversible)

  Indirect PII (hashed before storage):
    - IP addresses → SHA-256 hash (enables dedup without storing raw IP)
    - Full URL (may contain PII in query params) → stored as-is
      WARNING: Long URLs may contain email addresses, names, or tokens
      in query parameters. We do NOT strip these—it would break functionality.
      Users are warned in ToS that destination URLs are stored as submitted.

  Derived data (aggregated, not PII):
    - Country/city from IP lookup (performed at event processing time;
      raw IP is never persisted)
    - Device type, browser, OS from User-Agent parsing

  NOT stored:
    - Raw IP addresses (only hashed)
    - Cookies or session identifiers
    - User content or browsing history beyond the redirect
```

---

## 3. Threat Model

### 3.1 Top Attack Vectors

| # | Threat | Severity | Attack Vector | Mitigation |
|---|---|---|---|---|
| **1** | **Abuse / Spam** | Critical | Attackers use the service to create millions of short URLs pointing to spam, malware, or scam pages | URL reputation checking on creation; rate limiting; machine-learned abuse classifier |
| **2** | **Phishing** | Critical | Short URLs mask malicious destinations; users cannot see the real URL before clicking | Interstitial warning page for flagged URLs; integration with safe browsing databases; user reporting mechanism |
| **3** | **Enumeration** | High | Attacker iterates through short codes (a1B2c3, a1B2c4, ...) to discover all URLs | Non-sequential IDs (Snowflake-based); rate limiting on redirect endpoint per IP; CAPTCHA after suspicious access patterns |
| **4** | **Redirect Hijacking** | High | Attacker gains access to an account and redirects existing short URLs to malicious destinations | Two-factor authentication for URL updates; audit log for all URL modifications; email notification on destination change |
| **5** | **Analytics Fraud** | Medium | Click farms or bots inflate click counts to manipulate marketing metrics | Bot detection via User-Agent analysis; datacenter IP filtering; click velocity anomaly detection; CAPTCHA for suspicious traffic |

### 3.2 Detailed Mitigations

#### Threat 1: Abuse / Spam Prevention

```
ALGORITHM URLReputationCheck(long_url)
  // Performed synchronously during URL creation (< 100ms budget)

  score ← 0.0   // 0.0 = safe, 1.0 = definitely malicious

  // Check 1: Safe Browsing database lookup
  IF SAFE_BROWSING_DB.IS_LISTED(long_url)
    score ← 1.0
    RETURN BLOCK("URL is listed in safe browsing database")
  END IF

  // Check 2: Domain age and reputation
  domain ← EXTRACT_DOMAIN(long_url)
  domain_age ← WHOIS_CACHE.GET_AGE(domain)
  IF domain_age < 7 days
    score += 0.3   // New domains are higher risk
  END IF

  // Check 3: Known malicious URL patterns
  IF MATCHES_PATTERN(long_url, PHISHING_PATTERNS)
    score += 0.4
  END IF

  // Check 4: Machine-learned classifier (async, non-blocking)
  ML_QUEUE.SUBMIT(long_url)   // Results update reputation retroactively

  // Decision
  IF score >= 0.7
    RETURN BLOCK("URL flagged as potentially malicious")
  ELSE IF score >= 0.4
    RETURN WARN(set interstitial_warning = TRUE)
  ELSE
    RETURN ALLOW
  END IF

POST-CREATION MONITORING:
  // Background job re-scans existing URLs against updated threat databases
  EVERY 6 HOURS:
    FOR EACH url IN recently_created_urls(last 72 hours):
      new_score ← RecomputeReputationScore(url)
      IF new_score >= 0.7 AND url.is_active
        url.is_active ← FALSE
        url.disabled_reason ← "Flagged by reputation system"
        NOTIFY_OWNER(url.user_id, "Your URL has been disabled")
```

#### Threat 2: Phishing Mitigation

```
INTERSTITIAL WARNING PAGE:

  When a redirect is flagged (interstitial_warning = TRUE):

  1. Instead of HTTP 302, return HTTP 200 with a warning page:
     "You are about to visit: [destination domain]
      This link has been flagged for review.
      [Continue to destination] [Go back]"

  2. "Continue" link includes a signed token (HMAC with timestamp)
     that bypasses the interstitial for 1 hour

  3. Warning page is served from the platform's domain
     (not a redirect to an external page)

  Privacy consideration:
    - Interstitial does NOT reveal the full destination URL
    - Shows only the domain to prevent information leakage
    - No tracking on the interstitial page itself
```

#### Threat 3: Enumeration Prevention

```
ALGORITHM PreventEnumeration()

  DEFENSES:

  1. Non-sequential short codes
     - Snowflake IDs with Base62 encoding produce non-predictable sequences
     - Even counter-based codes are distributed across workers (non-contiguous)
     - Attacker cannot predict next code from previous code

  2. Rate limiting on redirect endpoint
     - Per-IP: 300 unique short codes/minute (normal users < 10)
     - Per-subnet (/24): 1000 unique short codes/minute
     - Per-ASN: 5000 unique short codes/minute

     Note: Rate limiting on redirects is tricky—you don't want to
     block legitimate users. These limits are for UNIQUE codes accessed,
     not total redirects (hitting the same code 1000x is fine).

  3. CAPTCHA escalation
     - After 50 unique codes from same IP in 10 minutes:
       return interstitial CAPTCHA before redirect
     - Legitimate users rarely trigger this (they click 1-2 links)

  4. Monitoring and alerting
     - Alert on IPs accessing > 100 unique codes/hour
     - Alert on 404 rate > 10% from any single IP (probing non-existent codes)
```

#### Threat 5: Click Fraud Detection

```
ALGORITHM DetectClickFraud(click_events_batch)
  // Runs in the analytics pipeline, not on the redirect hot path

  FOR EACH event IN click_events_batch:
    fraud_signals ← 0

    // Signal 1: Known bot User-Agent
    IF IS_KNOWN_BOT(event.user_agent)
      fraud_signals += 1
      event.is_bot ← TRUE
    END IF

    // Signal 2: Datacenter IP range
    IF IS_DATACENTER_IP(event.ip_hash)
      fraud_signals += 1
    END IF

    // Signal 3: Click velocity anomaly
    recent_clicks ← COUNT_CLICKS(event.short_code, last_60_seconds)
    baseline ← BASELINE_CLICKS(event.short_code)  // Historical average
    IF recent_clicks > baseline × 10
      fraud_signals += 1
    END IF

    // Signal 4: Geographic impossibility
    IF event.country != previous_click_country AND
       time_since_last_click < 30 seconds
      fraud_signals += 1   // Can't physically travel between countries in 30s
    END IF

    // Signal 5: Cookie/fingerprint absence
    IF NO_JAVASCRIPT_FINGERPRINT(event) AND NOT IS_KNOWN_CRAWLER(event)
      fraud_signals += 1   // Likely a simple HTTP client, not a real browser
    END IF

    // Decision
    IF fraud_signals >= 3
      event.is_fraudulent ← TRUE
      EXCLUDE from click counts (but still store for analysis)
    ELSE IF fraud_signals >= 2
      event.is_suspicious ← TRUE
      INCLUDE in counts but flag for review
    END IF
  END FOR

AGGREGATE FRAUD DETECTION:
  // Daily batch job looking at URL-level patterns
  EVERY 24 HOURS:
    FOR EACH short_code WITH suspicion_rate > 20%:
      ALERT("Potential click fraud campaign", short_code, details)
      IF suspicion_rate > 50%:
        QUARANTINE(short_code)   // Freeze analytics; notify owner
```

---

## 4. Compliance

### 4.1 GDPR Compliance

```
DATA SUBJECT RIGHTS:

  Right to Access (Article 15):
    - User can request export of all their URLs and associated metadata
    - Export includes: URL mappings, creation dates, click counts (aggregated)
    - Does NOT include raw click events (those are pseudonymized via IP hashing)
    - Delivered as JSON/CSV within 30 days

  Right to Erasure (Article 17):
    - User can request deletion of their account and all associated data

    DELETION WORKFLOW:
      1. Soft-delete all user's URLs (immediately stop redirecting)
      2. Remove user account data (email, name, API keys)
      3. Purge raw click events associated with user's URLs (within 30 days)
      4. Retain aggregated analytics (non-PII, statistical data)
      5. Retain tombstones for short codes (prevent reassignment)

    What is NOT deleted:
      - Aggregated, anonymized analytics (country-level counts, etc.)
      - Tombstone entries (short_code → "deleted", no PII)

  Right to Rectification (Article 16):
    - User can update their email, name, and account details
    - URL content cannot be "rectified"—user can update destination or delete

  Data Portability (Article 20):
    - Export all URLs and metadata in machine-readable format (JSON)
    - Does not include click-level data (only aggregated analytics)

CLICK DATA ANONYMIZATION:
  - IP addresses are hashed (SHA-256) before storage → cannot be reversed
  - No cookies or persistent identifiers stored with click events
  - Geographic data derived from IP at processing time; raw IP discarded
  - This makes click events pseudonymized, not anonymized
  - For full anonymization: aggregate to daily/country-level granularity
```

### 4.2 CCPA Compliance

```
CCPA REQUIREMENTS:
  - Right to Know: Same as GDPR access (export user data)
  - Right to Delete: Same as GDPR erasure workflow
  - Right to Opt-Out: Do not "sell" click data to third parties
  - Non-Discrimination: Same service regardless of privacy choices

IMPLEMENTATION:
  - "Do Not Track" header respected for click event enrichment
  - Opt-out flag on user account disables detailed analytics capture
  - Opted-out clicks counted (aggregate only) but not enriched with geo/device
```

### 4.3 Content Moderation

```
CONTENT POLICY ENFORCEMENT:

  Prohibited content (URLs pointing to):
    - Malware or phishing pages
    - Child exploitation material
    - Terrorist content
    - Copyright-infringing material (upon DMCA notice)

  Enforcement levels:
    1. Pre-creation: URL reputation check (blocks known-bad URLs)
    2. Post-creation: Periodic re-scanning against updated databases
    3. User reports: Manual review queue for reported URLs
    4. Law enforcement: Dedicated legal team handles takedown requests

  Takedown workflow:
    1. URL flagged (automated or reported)
    2. Review within 24 hours (4 hours for CSAM)
    3. If confirmed: URL disabled, user notified, audit log entry
    4. If law enforcement request: preserve all associated data for disclosure
    5. Appeal process: User can contest within 30 days
```

---

## 5. Infrastructure Security

### 5.1 Network Security

| Control | Implementation |
|---|---|
| **DDoS Protection** | Edge-level DDoS mitigation (rate limiting, IP reputation, challenge pages) |
| **WAF** | Web Application Firewall at API Gateway; OWASP Top 10 rulesets |
| **Network Segmentation** | Private subnets for database and cache; public subnets for edge only |
| **mTLS** | Service-to-service communication encrypted with mutual TLS |
| **Egress Filtering** | Creation service can reach internet (URL validation); redirect service cannot |

### 5.2 Supply Chain Security

| Control | Implementation |
|---|---|
| **Dependency Scanning** | Automated CVE scanning on all dependencies; block known-vulnerable versions |
| **Container Scanning** | Image vulnerability scanning before deployment; no critical CVEs in production |
| **Secrets Management** | Centralized secrets vault; no secrets in code, config files, or environment variables |
| **Access Control** | Role-based access to infrastructure; MFA required for all admin access |
| **Audit Logging** | All administrative actions logged with actor, action, timestamp, and resource |

### 5.3 Redirect Security Headers

```
SECURITY HEADERS on redirect response:

  // Prevent the destination page from knowing the shortener's URL
  Referrer-Policy: no-referrer

  // For interstitial pages (not redirects)
  Content-Security-Policy: default-src 'self'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY

  // HSTS on the shortener domain
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

  NOTE: Setting Referrer-Policy on 301/302 responses is a deliberate
  security choice. Without it, the destination page receives the full
  short URL in the Referer header, which could leak the shortener's
  internal URL structure. For enterprise customers who WANT referrer
  attribution, this header is configurable per vanity domain.
```
