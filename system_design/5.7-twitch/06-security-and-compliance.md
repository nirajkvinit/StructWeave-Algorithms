# Security & Compliance

## 1. Authentication & Authorization

### 1.1 Authentication (AuthN)

| Flow | Mechanism | Details |
|------|-----------|---------|
| **Viewer login** | OAuth 2.0 (Authorization Code + PKCE) | Login via Twitch account or Amazon account |
| **Streamer ingest auth** | Stream key (pre-shared secret) | Unique key per channel; embedded in RTMP URL |
| **API (3rd-party apps)** | OAuth 2.0 (Client Credentials / Auth Code) | Scoped access tokens; 25K+ registered apps |
| **Chat connection** | OAuth 2.0 bearer token | Token passed as IRC PASS command |
| **Internal service-to-service** | mTLS + service identity | Certificate-based with short-lived tokens |

**Stream Key Security:**
```
Stream Key Lifecycle:
  1. Generated per channel (cryptographically random, 40+ chars)
  2. Stored hashed (bcrypt) in database
  3. Transmitted only over TLS (RTMP over TLS / RTMPS)
  4. Can be reset by channel owner at any time
  5. Validated at PoP media proxy before forwarding

Risk: Stream key leaked → unauthorized broadcasting
Mitigation: One-click reset; rate-limited auth attempts;
            anomaly detection on IP/geo changes
```

### 1.2 Authorization (AuthZ)

**Role-Based Access Control:**

| Role | Permissions |
|------|------------|
| **Viewer** | Watch streams, send chat messages, follow channels, purchase bits |
| **Subscriber** | All viewer + custom emotes, ad-free viewing, sub badge |
| **VIP** | All subscriber + bypass slow mode, highlighted messages |
| **Moderator** | All VIP + ban/timeout users, delete messages, toggle chat modes |
| **Editor** | Manage channel metadata, create clips, manage VODs |
| **Broadcaster** | Full channel control, stream key access, revenue dashboard |
| **Admin (Twitch Staff)** | Platform-wide moderation, ToS enforcement, channel suspension |

**API Scopes (OAuth):**

```
Scope Examples:
  chat:read           - Read chat messages
  chat:edit           - Send chat messages
  channel:manage:broadcast - Update stream title/category
  channel:read:subscriptions - View subscriber list
  bits:read           - View Bits transactions
  moderation:read     - View ban/timeout lists
  user:read:email     - Access user email (requires explicit consent)
  clips:edit          - Create clips

Principle of Least Privilege:
  - Apps request only needed scopes
  - Users approve each scope individually
  - Tokens can be revoked per-app
```

### 1.3 Token Management

| Token Type | Lifetime | Storage | Refresh |
|-----------|----------|---------|---------|
| Access Token | 4 hours | Client memory | Via refresh token |
| Refresh Token | 30 days | Secure client storage | On use (rotation) |
| Stream Key | Until reset | Server (hashed) | Manual reset by broadcaster |
| API App Token | 60 days | Server-side (encrypted) | Via client credentials flow |
| Internal Service Token | 1 hour | In-memory | Auto-rotation via identity service |

---

## 2. Data Security

### 2.1 Encryption at Rest

| Data | Encryption | Key Management |
|------|-----------|----------------|
| User PII (email, payment info) | AES-256-GCM | Cloud KMS with automatic rotation (90 days) |
| Stream keys | bcrypt hash (not encrypted — one-way) | N/A — hashed, not reversible |
| VOD/Clip storage | Server-side encryption (SSE) | Cloud-managed keys |
| Database (PostgreSQL) | TDE (Transparent Data Encryption) | Cloud KMS |
| Redis cache | At-rest encryption enabled | Cloud-managed keys |
| Backup data | AES-256 | Separate encryption key per backup set |

### 2.2 Encryption in Transit

| Path | Protocol | Details |
|------|----------|---------|
| Streamer → PoP | RTMPS (RTMP over TLS 1.3) | Certificate pinning optional |
| PoP → Origin | TLS 1.3 over private backbone | L3 DiffServ prioritization |
| Edge → Viewer | HTTPS (TLS 1.3) | HLS over HTTPS |
| Chat (WebSocket) | WSS (WebSocket over TLS 1.3) | Certificate validation |
| API calls | HTTPS only | HSTS enforced; no HTTP fallback |
| Service-to-service | mTLS | Short-lived certificates via PKI |
| Database connections | TLS 1.3 | Certificate-based authentication |

### 2.3 PII Handling

| Data Category | Classification | Handling |
|---------------|---------------|----------|
| Email address | PII | Encrypted at rest; never exposed in API without scope |
| Payment details | PCI | Tokenized; never stored raw; delegated to payment processor |
| IP address (streamer) | PII | Not exposed to viewers; logged for abuse investigation (90-day retention) |
| Chat messages | User-generated content | Retained per policy; deletable on request |
| Watch history | Behavioral data | Used for recommendations; anonymized for analytics after 90 days |
| Location (approximate) | PII | Derived from IP for content delivery; not stored long-term |

### 2.4 Data Masking / Anonymization

```
Analytics Pipeline:
  Raw events (user_id, IP, action, timestamp)
      ↓ (within 24 hours)
  Pseudonymized (hashed_user_id, geo_region, action, timestamp)
      ↓ (after 90 days)
  Aggregated (geo_region, action_count, date)

ML Training Data:
  - User IDs replaced with synthetic IDs
  - Chat messages: PII redacted (emails, phone numbers)
  - Watch patterns: k-anonymity (k=50) applied
```

---

## 3. Threat Model

### 3.1 Top Attack Vectors

| # | Threat | Severity | Attack Vector | Mitigation |
|---|--------|----------|--------------|------------|
| 1 | **Stream Key Theft** | Critical | Phishing, malware, social engineering | One-click reset; RTMPS enforcement; anomaly detection on IP/geo change; 2FA for stream key access |
| 2 | **Chat Spam / Bot Armies** | High | Automated account creation; bot networks | CAPTCHA on registration; progressive rate limiting; ML-based bot detection; account age requirements |
| 3 | **DDoS on Ingest** | High | Volumetric attack on PoP infrastructure | Anycast IP absorption; cloud-based DDoS mitigation; traffic scrubbing at network edge |
| 4 | **Viewbotting** | High | Inflated viewer counts for monetization fraud | ML anomaly detection; viewer behavior analysis; human verification challenges |
| 5 | **Content Piracy / Re-streaming** | Medium | Capture and re-broadcast copyrighted content | DMCA takedown pipeline; watermarking; content fingerprinting |
| 6 | **Chat Harassment / Hate Raids** | High | Coordinated attack sending hateful messages | AutoMod ML filter; Shield Mode; follower/sub-only mode; account-age restrictions |
| 7 | **OAuth Token Theft** | Medium | XSS, insecure storage in 3rd-party apps | Short token lifetimes; token rotation; CSP headers; scope limitation |
| 8 | **Payment Fraud** | High | Stolen credit cards for Bits purchases | 3DS2 verification; velocity checks; chargeback monitoring |

### 3.2 Specific Mitigations

**Stream Key Protection:**
```
Defense in Depth:
  Layer 1: RTMPS enforcement (no plaintext RTMP)
  Layer 2: IP allowlist (optional for partners)
  Layer 3: Geo-fencing (alert on unexpected country)
  Layer 4: Rate limiting (max 5 auth attempts per minute)
  Layer 5: Anomaly detection (new device/IP triggers 2FA)
  Layer 6: One-click reset (instant invalidation)
```

**Hate Raid Protection (Shield Mode):**
```
When activated:
  1. Chat switches to followers-only (7+ day follow age)
  2. AutoMod sensitivity increased to maximum
  3. Non-follower messages auto-held for review
  4. Raid incoming disabled
  5. Account-age restriction enforced (30+ days)
  6. All suspicious accounts auto-banned (ML scoring)
```

### 3.3 Rate Limiting & DDoS Protection

| Layer | Protection | Implementation |
|-------|-----------|----------------|
| **Network (L3/L4)** | Volumetric DDoS mitigation | Cloud-based scrubbing; BGP Flowspec; anycast PoPs |
| **Transport (L4)** | SYN flood protection | SYN cookies; connection rate limiting per IP |
| **Application (L7)** | API rate limiting | Token bucket per OAuth token (800 req/min) |
| **Chat** | Message rate limiting | 20 msg/30s per user; 100 msg/30s for mods |
| **Ingest** | Auth attempt limiting | 5 attempts/min per stream key |
| **Commerce** | Transaction velocity | Max purchases per hour; fraud scoring |

---

## 4. Compliance

### 4.1 Regulatory Framework

| Regulation | Applicability | Key Requirements |
|------------|--------------|-----------------|
| **GDPR** | EU users | Data minimization, right to erasure, consent for processing, DPO appointment |
| **CCPA/CPRA** | California users | Right to know, right to delete, opt-out of sale, sensitive data controls |
| **COPPA** | Under-13 users | Age verification, parental consent, restricted data collection (Twitch requires 13+) |
| **PCI-DSS** | Payment processing | Tokenize card data, quarterly scans, encryption, access controls |
| **DMCA** | Content creators/viewers | Takedown procedures, repeat infringer policy, counter-notification process |
| **DSA** | EU platform regulation | Transparency reports, illegal content removal, algorithmic accountability |

### 4.2 GDPR Compliance

```
Data Subject Rights Implementation:

Right to Access (Article 15):
  - User can export all data via settings → "Privacy Center"
  - Includes: profile, chat history, watch history, subscriptions
  - Delivery: downloadable archive within 30 days

Right to Erasure (Article 17):
  - Account deletion: 30-day grace period, then permanent
  - Chat messages: anonymized (author set to "[deleted]")
  - VODs/Clips: deleted from storage
  - Analytics: pseudonymized, then aggregated
  - Financial records: retained for 7 years (legal obligation override)

Right to Portability (Article 20):
  - Data export in machine-readable format (JSON)
  - Includes profile, follows, subscriptions, chat settings

Data Processing Agreements:
  - DPA with all sub-processors (payment providers, CDN, analytics)
  - Standard Contractual Clauses for non-EU transfers
```

### 4.3 Content Moderation Compliance

| Requirement | Implementation |
|-------------|---------------|
| **Illegal content removal** | AutoMod + human review queue; < 24hr response for flagged content |
| **Transparency reports** | Biannual reports on content removal, account suspensions, law enforcement requests |
| **Appeals process** | Users can appeal bans/suspensions; human review within 72 hours |
| **DMCA process** | Automated content fingerprinting; manual DMCA claim filing; counter-notification support |
| **Minor safety** | Age verification (13+); restricted categories; dedicated trust & safety team |

### 4.4 Security Operations

```
Twitch manages 2,000+ cloud accounts across production, legacy,
and development services.

Security Architecture:
  - In-house security data lake for compliance campaigns
  - AWS Organizations StackSets for automated patching at scale
  - Centralized IAM policy management
  - Automated vulnerability scanning (continuous)
  - Bug bounty program (via HackerOne)
  - SOC2 Type II compliance
  - Annual penetration testing
  - Incident response team (24/7)
```
