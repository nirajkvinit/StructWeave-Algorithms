# Security and Compliance

## Table of Contents

1. [Authentication and Authorization](#authentication-and-authorization)
2. [Rate Limiting](#rate-limiting)
3. [Data Security](#data-security)
4. [Threat Model](#threat-model)
5. [Compliance](#compliance)
6. [Content Moderation](#content-moderation)

---

## Authentication and Authorization

### Authentication Mechanisms

| Mechanism | Use Case | Token Lifetime | Refresh |
|-----------|----------|----------------|---------|
| **OAuth 2.0 + PKCE** | Third-party apps | 2 hours | Yes (7 days) |
| **Session Token** | Web/mobile apps | 30 days | Sliding |
| **API Key** | Developer apps | Until revoked | N/A |
| **Bearer Token** | API access | 2 hours | Yes |
| **App-Only Auth** | Server-to-server | 24 hours | Automatic |

### OAuth 2.0 Implementation

```
OAUTH 2.0 FLOW (Authorization Code + PKCE):

1. CLIENT INITIATES
   GET /oauth2/authorize?
       response_type=code&
       client_id=CLIENT_ID&
       redirect_uri=CALLBACK_URL&
       scope=tweet.read users.read&
       state=STATE&
       code_challenge=CODE_CHALLENGE&
       code_challenge_method=S256

2. USER AUTHORIZES
   - User logs in (if not authenticated)
   - User reviews requested scopes
   - User approves or denies

3. AUTHORIZATION CODE RETURNED
   Redirect to: CALLBACK_URL?code=AUTH_CODE&state=STATE

4. TOKEN EXCHANGE
   POST /oauth2/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=authorization_code&
   code=AUTH_CODE&
   redirect_uri=CALLBACK_URL&
   code_verifier=CODE_VERIFIER&
   client_id=CLIENT_ID

5. ACCESS TOKEN RESPONSE
   {
     "token_type": "bearer",
     "access_token": "ACCESS_TOKEN",
     "refresh_token": "REFRESH_TOKEN",
     "expires_in": 7200,
     "scope": "tweet.read users.read"
   }

SCOPES:
  tweet.read      - Read tweets
  tweet.write     - Post/delete tweets
  users.read      - Read user profiles
  follows.read    - Read follow relationships
  follows.write   - Follow/unfollow users
  offline.access  - Refresh token access
  dm.read         - Read direct messages (restricted)
```

### Authorization Model

```
AUTHORIZATION ARCHITECTURE:

PERMISSION LEVELS:
┌────────────────────────────────────────────────────────┐
│ Level 1: Public Resources                              │
│   - Public tweets                                      │
│   - Public user profiles                               │
│   - Public engagement counts                           │
│   - Trends                                             │
│   Access: Any authenticated client                     │
├────────────────────────────────────────────────────────┤
│ Level 2: Own Resources                                 │
│   - Own tweets                                         │
│   - Own profile                                        │
│   - Own bookmarks                                      │
│   - Own lists                                          │
│   Access: Matching user_id in token                    │
├────────────────────────────────────────────────────────┤
│ Level 3: Authorized Resources                          │
│   - Tweets from followed protected accounts            │
│   - Circle tweets (if in circle)                       │
│   Access: Explicit permission check                    │
├────────────────────────────────────────────────────────┤
│ Level 4: Administrative                                │
│   - Suspend accounts                                   │
│   - Content moderation                                 │
│   - Trust & Safety tools                               │
│   Access: Internal employees with specific roles       │
└────────────────────────────────────────────────────────┘

AUTHORIZATION CHECK:

FUNCTION check_authorization(user, resource, action):
    // Public resources
    IF resource.is_public:
        RETURN ALLOW

    // Own resources
    IF resource.owner_id == user.id:
        RETURN ALLOW

    // Protected account content
    IF resource.type == TWEET AND resource.author.is_protected:
        IF user.follows(resource.author_id):
            RETURN ALLOW
        RETURN DENY

    // Circle/Close Friends content
    IF resource.audience == CIRCLE:
        IF user.id IN resource.author.circle_members:
            RETURN ALLOW
        RETURN DENY

    // Default deny
    RETURN DENY
```

### Multi-Factor Authentication

```
MFA OPTIONS:

1. SMS OTP
   - Legacy, being phased out for security
   - Still available for recovery

2. AUTHENTICATOR APP (Recommended)
   - TOTP-based (RFC 6238)
   - 30-second rotating codes
   - Backup codes provided

3. SECURITY KEY (Most Secure)
   - WebAuthn/FIDO2 support
   - Hardware keys (YubiKey, etc.)
   - Phishing resistant

4. PASSKEYS (New in 2024)
   - Device-bound credentials
   - Biometric authentication
   - Cross-device sync available

MFA ENFORCEMENT:
  - Required for Premium accounts
  - Required for verified organizations
  - Optional for regular accounts
  - Mandatory for admin access
```

---

## Rate Limiting

### API Rate Limits by Tier

| Tier | Monthly Cost | Tweet Read | Tweet Write | Follows | Search |
|------|-------------|------------|-------------|---------|--------|
| **Free** | $0 | 100/month | 50/month | 50/month | 100/month |
| **Basic** | $100 | 10,000/month | 3,000/month | 5,000/month | 10,000/month |
| **Pro** | $5,000 | 1,000,000/month | 300,000/month | 50,000/month | 100,000/month |
| **Enterprise** | Custom | Unlimited | Custom | Custom | Custom |

### Rate Limiting Implementation

```
RATE LIMITING ARCHITECTURE:

TOKEN BUCKET ALGORITHM:
┌────────────────────────────────────────────────────────┐
│ Parameters:                                            │
│   bucket_size: Maximum tokens (burst capacity)         │
│   refill_rate: Tokens added per second                 │
│   current_tokens: Current available tokens             │
│                                                        │
│ Example (Pro tier - Read):                             │
│   bucket_size: 300 (15-minute window)                  │
│   refill_rate: 0.38/second (1M/month = 0.38/sec)       │
└────────────────────────────────────────────────────────┘

FUNCTION check_rate_limit(client_id, endpoint, tier):
    key = "ratelimit:" + client_id + ":" + endpoint
    bucket = redis.get_bucket(key)

    IF bucket.tokens >= 1:
        bucket.tokens -= 1
        redis.set_bucket(key, bucket)
        RETURN ALLOW
    ELSE:
        RETURN {
            status: 429,
            headers: {
                "x-rate-limit-limit": bucket.max_tokens,
                "x-rate-limit-remaining": 0,
                "x-rate-limit-reset": bucket.reset_time
            }
        }

FUNCTION refill_bucket(bucket, tier_config):
    elapsed = now() - bucket.last_refill
    tokens_to_add = elapsed * tier_config.refill_rate
    bucket.tokens = min(bucket.tokens + tokens_to_add, tier_config.max_tokens)
    bucket.last_refill = now()
```

### Endpoint-Specific Limits

```
ENDPOINT RATE LIMITS (Pro Tier):

READ OPERATIONS:
  GET /2/tweets/:id               900/15min
  GET /2/users/:id                900/15min
  GET /2/users/me                 75/15min
  GET /2/timeline/home            180/15min
  GET /2/tweets/search/recent     450/15min
  GET /2/users/:id/followers      15/15min

WRITE OPERATIONS:
  POST /2/tweets                  100/24hr per user
  DELETE /2/tweets/:id            50/15min
  POST /2/users/:id/following     400/24hr
  DELETE /2/users/:id/following   500/15min
  POST /2/users/:id/likes         1000/24hr

SPECIAL LIMITS:
  Media upload                    615 images/24hr
  Streaming API                   1 connection per client
  Account creation               1 per phone number
```

---

## Data Security

### Encryption Strategy

```
ENCRYPTION ARCHITECTURE:

DATA AT REST:
┌────────────────────────────────────────────────────────┐
│ Component          │ Encryption    │ Key Management    │
├────────────────────┼───────────────┼───────────────────┤
│ MySQL              │ AES-256       │ HSM-backed KMS    │
│ Redis              │ Not encrypted │ Network isolation │
│ ElasticSearch      │ AES-256       │ Cluster-managed   │
│ Blob Storage       │ AES-256       │ Per-object keys   │
│ Kafka              │ AES-256       │ Broker-managed    │
│ Backups            │ AES-256       │ Separate key ring │
└────────────────────┴───────────────┴───────────────────┘

DATA IN TRANSIT:
┌────────────────────────────────────────────────────────┐
│ Connection Type    │ Protocol      │ Min Version       │
├────────────────────┼───────────────┼───────────────────┤
│ Client → API       │ TLS           │ 1.2 (1.3 preferred)│
│ Service → Service  │ mTLS          │ 1.3               │
│ Cross-region       │ IPsec + TLS   │ 1.3               │
│ Database           │ TLS           │ 1.2               │
└────────────────────┴───────────────┴───────────────────┘

KEY ROTATION:
  - Data encryption keys: 90 days
  - Master keys: 1 year
  - TLS certificates: 1 year (auto-renewed)
  - API keys: User-controlled
```

### PII Handling

```
PII DATA CLASSIFICATION:

HIGH SENSITIVITY (Encrypted + Access Logged):
  - Email address
  - Phone number
  - IP address
  - Device identifiers
  - Location data (precise)
  - Direct messages

MEDIUM SENSITIVITY (Encrypted):
  - Birth date
  - Profile bio with personal info
  - Location data (coarse)

LOW SENSITIVITY (Standard Protection):
  - Username
  - Display name
  - Public tweets
  - Follow relationships

DATA MINIMIZATION:
  - IP addresses: Retained 30 days, then hashed
  - Precise location: Opt-in only, 30 days retention
  - Device IDs: Linked to account, deleted on request
  - Search history: 18 months, anonymized after

DATA ACCESS CONTROLS:
  - PII access requires business justification
  - All PII access logged to audit trail
  - Quarterly access reviews
  - Automatic de-provisioning on role change
```

### Data Masking

```
DATA MASKING RULES:

FOR ANALYTICS/DEBUGGING:

Email: j***@example.com
Phone: +1-***-***-1234
IP: 192.168.***.*** or 192.168.0.0/24
Device ID: ab12****
Location: City-level only

FOR LOGS:

FUNCTION mask_pii_in_logs(log_entry):
    masked = log_entry

    // Email
    masked = regex_replace(
        masked,
        /\b[\w.]+@[\w.]+\.\w+\b/,
        "[EMAIL_REDACTED]"
    )

    // Phone
    masked = regex_replace(
        masked,
        /\+?\d{10,}/,
        "[PHONE_REDACTED]"
    )

    // Auth tokens
    masked = regex_replace(
        masked,
        /Bearer [A-Za-z0-9-_]+/,
        "Bearer [REDACTED]"
    )

    RETURN masked
```

---

## Threat Model

### Top Attack Vectors

| Attack Vector | Risk Level | Likelihood | Impact | Mitigation |
|---------------|------------|------------|--------|------------|
| **Bot Networks** | Critical | High | Trend manipulation, spam | ML detection, rate limits |
| **Credential Stuffing** | High | High | Account takeover | Rate limits, 2FA, CAPTCHA |
| **API Abuse** | High | High | Data scraping | Rate limits, auth controls |
| **XSS/Injection** | Medium | Medium | Data theft, defacement | CSP, input validation |
| **DDoS** | High | Medium | Service unavailability | CDN, rate limiting |
| **State Actors** | Critical | Low | Election interference | Content moderation, transparency |
| **Insider Threat** | High | Low | Data breach | Access controls, monitoring |

### Detailed Threat Analysis

```
THREAT: BOT NETWORKS

ATTACK PATTERNS:
  1. Coordinated amplification (artificial trending)
  2. Spam campaigns (crypto scams, malware)
  3. Astroturfing (fake grassroots movements)
  4. Reply spam (drowning out legitimate conversation)

DETECTION:
  - Behavioral analysis (posting patterns, sleep times)
  - Network analysis (coordinated activity)
  - Content similarity (copy-paste detection)
  - Account age + activity correlation

MITIGATION:
  ┌────────────────────────────────────────────────────┐
  │ Layer          │ Control                           │
  ├────────────────┼───────────────────────────────────┤
  │ Account        │ Phone verification, CAPTCHA       │
  │ Activity       │ Rate limiting, velocity checks    │
  │ Content        │ Duplicate detection, spam filters │
  │ Trend Calc     │ Account quality weighting         │
  │ Manual         │ Trust & Safety review queue       │
  └────────────────┴───────────────────────────────────┘


THREAT: CREDENTIAL STUFFING

ATTACK PATTERNS:
  1. Automated login attempts with leaked credentials
  2. Password spraying (common passwords)
  3. SIM swapping for 2FA bypass

DETECTION:
  - Failed login rate per IP
  - Failed login rate per account
  - Geographic anomalies
  - Device fingerprint changes

MITIGATION:
  ┌────────────────────────────────────────────────────┐
  │ Control           │ Implementation                 │
  ├───────────────────┼────────────────────────────────┤
  │ Rate limiting     │ 5 failed attempts → 15min lock │
  │ CAPTCHA           │ After 3 failed attempts        │
  │ 2FA               │ Encouraged, required for some  │
  │ Breach detection  │ Check against known breaches   │
  │ Notification      │ Alert on new device login      │
  └───────────────────┴────────────────────────────────┘


THREAT: API ABUSE / SCRAPING

ATTACK PATTERNS:
  1. Mass data collection (profiles, followers)
  2. Automated following/unfollowing
  3. Tweet deletion services
  4. Competitor intelligence gathering

DETECTION:
  - Unusual API patterns (sequential IDs)
  - High volume from single source
  - Pattern matching (scraping tools)

MITIGATION:
  ┌────────────────────────────────────────────────────┐
  │ Control           │ Implementation                 │
  ├───────────────────┼────────────────────────────────┤
  │ Rate limiting     │ Strict per-endpoint limits     │
  │ Authentication    │ OAuth required for all APIs    │
  │ Monitoring        │ Anomaly detection on usage     │
  │ Legal             │ Terms of Service enforcement   │
  │ Technical         │ Pagination limits, cursoring   │
  └───────────────────┴────────────────────────────────┘
```

### DDoS Protection

```
DDOS PROTECTION LAYERS:

LAYER 1: NETWORK (L3/L4)
  - Anycast routing (distribute across PoPs)
  - Blackhole routing for volumetric attacks
  - Rate limiting at edge
  - SYN flood protection

LAYER 2: CDN
  - Edge caching (absorbs read traffic)
  - Challenge pages for suspicious traffic
  - Geographic filtering during attacks
  - Bot detection

LAYER 3: APPLICATION (L7)
  - WAF rules (OWASP top 10)
  - Rate limiting per endpoint
  - Request inspection
  - Behavioral analysis

LAYER 4: ORIGIN
  - Origin shielding
  - Auto-scaling
  - Circuit breakers
  - Graceful degradation

MITIGATION PLAYBOOK:
  1. Detection: Automated anomaly detection
  2. Classification: Volumetric vs application-layer
  3. Mitigation: Apply appropriate filters
  4. Monitoring: Watch for bypass attempts
  5. Post-mortem: Update rules based on attack
```

---

## Compliance

### GDPR (EU)

```
GDPR COMPLIANCE:

DATA SUBJECT RIGHTS:
┌────────────────────────────────────────────────────────┐
│ Right                 │ Implementation                 │
├───────────────────────┼────────────────────────────────┤
│ Right to Access       │ Download Your Data feature     │
│ Right to Rectification│ Profile edit, support ticket   │
│ Right to Erasure      │ Deactivate + 30-day deletion   │
│ Right to Portability  │ JSON/CSV export                │
│ Right to Object       │ Opt-out of personalization     │
│ Right to Restriction  │ Account deactivation option    │
└───────────────────────┴────────────────────────────────┘

DATA RESIDENCY:
  - EU user data stored in EU-West region
  - No cross-border transfer without consent
  - Standard Contractual Clauses for vendors

DATA PROCESSING:
  - Lawful basis documented for each purpose
  - Consent obtained for marketing
  - Legitimate interest for core functionality
  - Privacy impact assessments for new features

BREACH NOTIFICATION:
  - Detection within 24 hours target
  - Notification to authority within 72 hours
  - User notification "without undue delay"
```

### DSA (Digital Services Act)

```
DSA COMPLIANCE (EU):

TRANSPARENCY REQUIREMENTS:
  - Algorithm explanation (how For You works)
  - Advertising transparency (why am I seeing this ad)
  - Content moderation reports (quarterly)
  - Researcher data access program

CONTENT MODERATION:
  - Clear community guidelines
  - Transparent enforcement
  - Appeals process (human review)
  - Statement of reasons for removal

ILLEGAL CONTENT:
  - Notice and action mechanism
  - Trusted flaggers program
  - Expedited handling for serious content
  - Regular reporting to authorities

SYSTEMIC RISK ASSESSMENT:
  - Annual risk assessment for Very Large Platforms
  - Mitigation measures documented
  - Independent audit
  - Crisis response protocols
```

### Other Compliance

| Regulation | Scope | Key Requirements |
|------------|-------|------------------|
| **CCPA/CPRA** | California | Do Not Sell, data access, deletion |
| **LGPD** | Brazil | Consent, data access, DPO requirement |
| **PIPL** | China | Localization, consent, cross-border rules |
| **COPPA** | US Children | Age verification, parental consent |
| **Section 230** | US | Platform immunity, good faith moderation |

---

## Content Moderation

### Content Policy Enforcement

```
CONTENT MODERATION PIPELINE:

      ┌─────────────────────────────────────┐
      │         Tweet Created               │
      └─────────────────┬───────────────────┘
                        ↓
      ┌─────────────────────────────────────┐
      │    Automated ML Screening           │
      │  (Spam, NSFW, Violence, Hate)       │
      └─────────────────┬───────────────────┘
                        ↓
          ┌─────────────┴─────────────┐
          ↓                           ↓
    ┌───────────┐               ┌───────────┐
    │   PASS    │               │   FLAG    │
    │  Publish  │               │  For Review│
    └───────────┘               └─────┬─────┘
                                      ↓
                              ┌───────────────┐
                              │ Human Review  │
                              │   Queue       │
                              └───────┬───────┘
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    ↓                 ↓                 ↓
              ┌─────────┐       ┌───────────┐    ┌───────────┐
              │ Approve │       │ Label/Warn│    │  Remove   │
              └─────────┘       └───────────┘    └─────┬─────┘
                                                      ↓
                                              ┌───────────────┐
                                              │ User Appeal   │
                                              │ (if requested)│
                                              └───────────────┘

ML DETECTION CATEGORIES:
  - Spam: 99% precision, automated action
  - NSFW: 95% precision, label and restrict
  - Violence: 90% precision, human review
  - Hate Speech: 85% precision, human review required
  - Misinformation: 80% precision, labels + context
```

### Trust & Safety Tools

```
TRUST & SAFETY CAPABILITIES:

AUTOMATED ACTIONS:
  - Spam removal (no human review)
  - NSFW labeling (automated)
  - Shadowban for suspicious activity
  - Rate limiting for aggressive behavior

HUMAN REVIEW ACTIONS:
  - Tweet removal with reason
  - Account warnings
  - Temporary suspension (12h, 7d)
  - Permanent suspension
  - Verified badge removal

APPEALS PROCESS:
  1. User receives notice of action
  2. User can submit appeal within 30 days
  3. Different reviewer examines appeal
  4. Decision within 7 days
  5. Final decision communicated

TRANSPARENCY REPORTING:
  - Quarterly reports on content removed
  - Government request disclosures
  - Copyright takedown statistics
  - Appeals outcomes
```

### Election Integrity

```
ELECTION INTEGRITY MEASURES:

CIVIC INTEGRITY POLICY:
  - No misleading info about voting
  - No suppression of voter turnout
  - No premature victory claims
  - Labels on election-related content

SPECIAL MEASURES DURING ELECTIONS:
  - Enhanced ML sensitivity
  - Expanded Trust & Safety team
  - Prebunking of expected narratives
  - Partnership with election officials
  - War room for rapid response

LABELED CONTENT:
  - "Official sources called this election differently"
  - "This claim about election fraud is disputed"
  - "Learn how to vote in your area"

POST-ELECTION:
  - Continued monitoring for 30 days
  - Report on enforcement actions
  - Lessons learned documentation
```
