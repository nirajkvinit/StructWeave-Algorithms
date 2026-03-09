# Security & Compliance — Pastebin

## 1. Authentication & Authorization

### 1.1 User Tiers

| Tier | Authentication | Capabilities | Rate Limits |
|---|---|---|---|
| **Anonymous** | None (IP-based tracking) | Create public/unlisted pastes, max 10 KB, limited expiration options | 10 pastes/hour, 50 reads/minute |
| **Registered** | Email + password, API key | All visibility options, up to 512 KB, paste history, delete own pastes | 60 pastes/hour, 300 reads/minute |
| **API User** | API key (Bearer token) | Programmatic access, all features, webhook notifications | 120 pastes/hour, 1,000 reads/minute |
| **Admin** | MFA-enforced, session-based | Content moderation, user management, system configuration | Unrestricted |

### 1.2 Paste Visibility Model

```
Visibility Levels:

Public:
├── Discoverable via "recent pastes" listing and public API
├── Indexed by search engines (if SEO enabled)
├── Accessible by anyone with or without the URL
└── Use case: Sharing code snippets publicly, documentation

Unlisted:
├── NOT listed in recent pastes or search results
├── NOT indexed by search engines (noindex meta tag)
├── Accessible by anyone who has the URL
├── Security: URL slug acts as a capability token
│   8-char Base62 = 218 trillion possibilities = infeasible to brute-force
└── Use case: Sharing with specific people via link (default visibility)

Private:
├── Requires authentication to access
├── Only the paste creator can view (or explicitly shared users)
├── Returns 401 for unauthenticated requests, 403 for unauthorized users
└── Use case: Personal notes, sensitive snippets

Password-Protected:
├── Accessible to anyone with the URL AND the correct password
├── Password verified server-side (bcrypt hash comparison)
├── Content can optionally be encrypted client-side (E2E encryption)
├── Password never stored in plaintext; only bcrypt hash
└── Use case: Sharing sensitive content with a known group
```

### 1.3 API Authentication

```
Authentication Flow:

1. API Key Authentication (Primary):
   ├── User generates API key from account settings
   ├── Key format: 40-character random hex string (160 bits of entropy)
   ├── Storage: SHA-256 hash of key stored in DB (never store raw key)
   ├── Transmission: Authorization: Bearer {api_key}
   ├── Rotation: Users can regenerate key (old key immediately invalidated)
   └── Rate limiting: Keyed on API key identity

2. Session-Based Authentication (Web UI):
   ├── Login: POST /auth/login with email + password
   ├── Session: HTTP-only, secure, SameSite=Strict cookie
   ├── Session duration: 7 days (sliding expiration)
   ├── CSRF protection: Double-submit cookie pattern
   └── Logout: POST /auth/logout (server-side session invalidation)

3. Anonymous Access:
   ├── No authentication required for public/unlisted paste reads
   ├── No authentication required for anonymous paste creation
   ├── Identity for rate limiting: IP address + fingerprint
   └── Captcha triggered after rate limit threshold
```

---

## 2. Data Security

### 2.1 Encryption

```
Encryption Layers:

In Transit:
├── TLS 1.3 for all client-server communication
├── TLS for inter-service communication (service mesh or mutual TLS)
├── HSTS header enforced (Strict-Transport-Security: max-age=31536000)
└── Certificate pinning for API clients (optional)

At Rest:
├── Object storage: Server-side encryption (platform-managed keys)
├── Metadata DB: Transparent data encryption (TDE)
├── Cache: Not encrypted (ephemeral, in-memory only)
├── Backups: Encrypted with separate key from primary storage
└── Key management: Centralized key management service with rotation

End-to-End Encryption (Optional):
├── Client encrypts paste content before sending to server
├── Encryption key derived from user-provided password
├── Server stores only ciphertext — cannot read content
├── Decryption happens client-side when recipient provides password
├── Key derivation: PBKDF2 with 100,000 iterations or Argon2id
├── Encryption algorithm: AES-256-GCM
└── Trade-off: Server cannot scan encrypted content for abuse
```

### 2.2 PII and Sensitive Data Detection

```
Content Scanning Pipeline:

Stage 1: Pattern-Based Detection (Regex)
├── Credit card numbers: Luhn-validated 13-19 digit sequences
├── Social Security Numbers: NNN-NN-NNNN pattern
├── API keys: Known patterns for major services (40-char hex, "sk_live_", etc.)
├── Private keys: "-----BEGIN RSA PRIVATE KEY-----"
├── Email addresses: Standard email regex
├── Phone numbers: International format patterns
└── Passwords in config files: "password=", "secret=", "token="

Stage 2: ML-Based Classification (Async)
├── Trained on labeled dataset of sensitive vs non-sensitive pastes
├── Features: Token frequency, entropy analysis, structural patterns
├── Categories: Code, config, log, credentials, personal data, malware
├── Confidence threshold: >0.85 for automatic flagging
└── Below threshold: Queue for human review

Response Actions:
├── High confidence sensitive data: Block paste, return 422 with guidance
├── Medium confidence: Create paste but flag for review, notify user
├── Low confidence: Create paste, log for analytics
└── User appeal: Flagged pastes can be appealed via support ticket
```

---

## 3. Threat Model

### 3.1 Top Attack Vectors

| # | Attack Vector | Severity | Likelihood | Description |
|---|---|---|---|---|
| **1** | **Malware Hosting** | Critical | High | Attackers upload malicious executables, scripts, or payloads and share URLs via phishing emails |
| **2** | **Sensitive Data Exfiltration** | Critical | High | Malicious insiders paste credentials, API keys, database dumps, or proprietary code |
| **3** | **XSS via Paste Content** | High | Medium | Injecting JavaScript in paste content that executes when rendered in HTML view |
| **4** | **Brute-Force URL Enumeration** | Medium | Medium | Sequentially trying slug values to discover unlisted/private pastes |
| **5** | **Spam / SEO Spam** | Medium | High | Creating thousands of public pastes with spam content to exploit search indexing |
| **6** | **DDoS via Paste Creation** | Medium | Medium | Flooding the write path with large pastes to exhaust storage and processing |
| **7** | **Account Takeover** | High | Low | Credential stuffing or brute-force attacks against login endpoint |

### 3.2 Mitigation Strategies

```
1. Malware Hosting Prevention:
├── Hash content against known malware signature databases
├── Block pastes containing executable payloads (PE headers, ELF magic bytes)
├── Rate limit anonymous paste creation
├── Automated scanning of newly created public pastes
├── Abuse reporting mechanism (report button on paste view)
├── Takedown workflow: Flag → Review (4-hour SLA) → Remove → Notify reporter
└── Cooperation with threat intelligence feeds

2. Data Exfiltration Prevention:
├── PII scanning pipeline (see Section 2.2)
├── Entropy analysis: High-entropy strings often indicate credentials or keys
├── Warning banner for detected sensitive content (before publish)
├── Optional: DLP (Data Loss Prevention) integration for enterprise users
└── Audit log of all paste creations with user/IP for forensics

3. XSS Prevention:
├── Content-Security-Policy header: script-src 'self'; no inline scripts
├── All paste content rendered as text/plain or within sandboxed iframe
├── HTML entity encoding for all paste content in HTML views
├── X-Content-Type-Options: nosniff
├── Raw view served as text/plain (never text/html)
├── Embed view: sandboxed iframe with sandbox="allow-scripts" only for syntax highlighting library
└── Never interpret paste content as HTML in the main page context

4. URL Enumeration Prevention:
├── 8-character Base62 slugs = 218 trillion combinations
├── At 1,000 guesses/second: 6.9 million years to enumerate
├── Rate limiting on read path: 50 requests/minute per IP for 404 responses
├── Progressive delay on consecutive 404s from same IP
├── CAPTCHA after 10 consecutive 404s
└── Monitoring: Alert on IPs with >100 404s per hour

5. Spam Prevention:
├── CAPTCHA for anonymous paste creation after rate limit hit
├── Automated spam classifier (Bayesian + keyword blacklist)
├── Nofollow/noindex for newly created public pastes (earn indexing over time)
├── Rate limiting: 10 pastes/hour anonymous, 60/hour registered
├── Honeypot fields in web form (invisible to users, detected by bots)
└── IP reputation scoring: Known spam IPs get stricter limits

6. DDoS Prevention:
├── CDN-level DDoS protection (absorbs volumetric attacks)
├── API Gateway rate limiting (per IP, per API key)
├── Write path: Maximum paste size (512 KB) limits storage consumption
├── Connection limiting: Max 10 concurrent connections per IP
├── Adaptive rate limiting: Tighten limits during detected attack
└── Geographic rate limiting: Unusual traffic from unexpected regions

7. Account Security:
├── Password requirements: Minimum 8 characters, complexity check against common passwords
├── Login rate limiting: 5 attempts per 15 minutes per account
├── Account lockout after 10 failed attempts (30-minute lockout)
├── MFA support (TOTP-based) for registered users
├── Session management: Invalidate all sessions on password change
└── Credential stuffing protection: CAPTCHA after 3 failed login attempts
```

---

## 4. Compliance

### 4.1 GDPR Compliance

```
GDPR Requirements and Implementation:

Right to Access (Article 15):
├── Users can export all their paste data via API or settings page
├── Export format: JSON archive with all paste metadata + content
├── Response time: Within 72 hours of request
└── Includes: Paste history, account data, access logs

Right to Erasure (Article 17):
├── Users can delete individual pastes or entire account
├── Account deletion removes:
│   All paste metadata (hard delete after 30-day grace period)
│   Content blobs with reference_count = 0
│   User profile data
│   API keys and sessions
├── Content shared by multiple users: Only user's reference removed
│   Content blob persists if other users reference it
└── Verification: User must confirm via email before account deletion

Data Minimization (Article 5):
├── Collect only necessary data for service operation
├── Anonymous pastes: No user data collected beyond IP (for rate limiting)
├── IP addresses: Hashed after 90 days, deleted after 1 year
├── Access logs: Retained for 90 days, then purged
└── Analytics: Aggregated, no individual user tracking

Data Processing Records (Article 30):
├── Document all data processing activities
├── Purpose of processing: Paste creation, abuse detection, analytics
├── Data categories: Paste content, metadata, user accounts, access logs
├── Retention periods: Vary by data type (see above)
└── Third-party processors: CDN provider, object storage provider (DPAs in place)

Breach Notification (Article 33):
├── Detection: Automated intrusion detection, anomaly alerts
├── Response time: Notify authorities within 72 hours
├── User notification: "Without undue delay" if high risk
├── Breach log: Maintained regardless of notification obligation
└── Response plan: Documented incident response playbook
```

### 4.2 DMCA Compliance

```
DMCA Takedown Workflow:

1. Receipt of Notice:
   ├── Accept DMCA takedown requests via dedicated email and web form
   ├── Required information: Copyrighted work, infringing paste URL,
   │   complainant identity, good faith statement
   └── Auto-acknowledge within 24 hours

2. Review:
   ├── Verify notice completeness (all required elements present)
   ├── Validate complainant identity
   ├── Review paste content against claim
   └── Timeline: 24-48 hours for review

3. Action:
   ├── Valid claim: Remove paste content, replace with DMCA notice
   ├── Notify paste creator (if registered) with counter-notice rights
   ├── Preserve metadata for legal record
   └── Log action in compliance database

4. Counter-Notice:
   ├── Creator can file counter-notice within 14 days
   ├── If counter-notice filed: Notify complainant
   ├── Restore content after 14 days unless complainant files lawsuit
   └── Document entire chain for legal records

5. Repeat Infringers:
   ├── Track DMCA strikes per user account
   ├── 3 strikes: Account suspension + review
   ├── Policy documented in Terms of Service
   └── Appeals process available
```

### 4.3 Content Retention and Legal Holds

```
Retention Policies:

Paste Content:
├── Active pastes: Retained until expiration or user deletion
├── Expired pastes: Content deleted within 24 hours of expiration
├── Deleted pastes: Content deleted immediately (if reference_count = 0)
│   Metadata soft-deleted, hard-deleted after 30 days
└── Legal hold: Content preserved indefinitely when flagged by legal team

User Data:
├── Active accounts: Retained while account active
├── Deleted accounts: Hard-deleted after 30-day grace period
├── Inactive accounts (no login for 2 years): Notification sent, then purged
└── Legal hold: Account data preserved indefinitely when flagged

Access Logs:
├── Full logs: 90 days
├── Aggregated logs: 1 year
├── Purged after retention period
└── Legal hold: Preserved indefinitely when flagged

Legal Hold Process:
├── Legal team flags specific pastes, users, or time ranges
├── Flagged data excluded from all deletion and cleanup processes
├── Hold persists until explicitly released by legal team
├── Audit trail of all holds (who, when, why, release date)
└── Compliance team reviews holds quarterly
```

---

## 5. Security Monitoring

### 5.1 Security Events to Monitor

```
Critical Events (Immediate Alert):
├── Spike in paste creation from single IP (>100/hour)
├── Multiple failed login attempts for same account (>5 in 15 min)
├── API key usage from unexpected geographic region
├── Malware signature detected in paste content
├── Private paste accessed by non-owner (authorization bypass attempt)
├── SQL injection or XSS patterns detected in input
└── Unusual bulk read pattern (potential data scraping)

Warning Events (5-Minute Alert):
├── Rate limit triggers increasing across multiple IPs (coordinated attack)
├── Elevated 404 rate for sequential slug patterns (enumeration attempt)
├── PII detected in public paste content
├── Abuse report volume spike
└── Certificate expiration within 14 days

Informational Events (Daily Digest):
├── New user registration volume trends
├── API key creation/rotation events
├── DMCA takedown actions
├── Content classification distribution (code vs text vs config)
└── Geographic access pattern changes
```

### 5.2 Incident Response

```
Incident Severity Levels:

SEV-1 (Critical): Active data breach or service exploitation
├── Response time: 15 minutes
├── Actions: Isolate affected systems, begin forensics, notify leadership
├── Communication: Status page update, user notification if data affected
└── Post-incident: Full RCA within 48 hours

SEV-2 (High): Detected attack in progress, no confirmed breach
├── Response time: 1 hour
├── Actions: Block attack vector, review logs, assess impact
├── Communication: Internal alert, status page if user-facing impact
└── Post-incident: RCA within 1 week

SEV-3 (Medium): Potential vulnerability discovered or policy violation
├── Response time: 4 hours
├── Actions: Assess risk, patch or mitigate, monitor for exploitation
├── Communication: Internal ticket, no external communication
└── Post-incident: Documented in security review
```
