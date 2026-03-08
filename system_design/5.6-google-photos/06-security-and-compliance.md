# Google Photos — Security & Compliance

## Authentication & Authorization

### Authentication (AuthN)

| Mechanism | Use Case | Details |
|-----------|----------|---------|
| **OAuth 2.0 + OpenID Connect** | User authentication | Google Account SSO; supports MFA (FIDO2, TOTP, SMS) |
| **OAuth 2.0 Scopes** | Third-party API access | Scoped permissions for Photos API (`photoslibrary.readonly`, `photoslibrary.appendonly`, `photoslibrary.sharing`) |
| **Service Account (mTLS)** | Internal service-to-service | Mutual TLS between microservices via Google's ALTS (Application Layer Transport Security) |
| **API Keys** | Rate limiting / project identification | Identifies calling project; not used for authorization |
| **Device Tokens** | Mobile app background sync | Long-lived refresh tokens with device binding |

### Authorization (AuthZ)

**Model: Attribute-Based Access Control (ABAC) with Relationship-Based Elements**

```
Authorization Decision:
  ALLOW IF:
    (subject.userId == resource.ownerId)                    // Owner access
    OR (resource.shareToken IN subject.knownShareTokens)    // Share link access
    OR (resource.albumId IN sharedAlbums                    // Shared album member
        WHERE subject.userId IN album.members)
    OR (resource.ownerId IN partnerSharing                  // Partner sharing
        WHERE partner.userId == subject.userId
        AND partnerSharing.active == true
        AND matchesSharingScope(resource, partnerSharing.scope))
```

**Permission Matrix:**

| Actor | Own Photos | Shared Album (Viewer) | Shared Album (Contributor) | Partner-Shared | Public Link |
|-------|-----------|----------------------|---------------------------|---------------|-------------|
| View | Yes | Yes | Yes | Yes (scoped) | Yes |
| Download | Yes | Yes | Yes | Yes | Configurable |
| Add to album | Yes | No | Yes | No | No |
| Delete | Yes | No | Own contributions only | No | No |
| Edit (Magic Eraser) | Yes | No | No | No | No |
| Share | Yes | No | No | No | No |
| View EXIF/location | Yes | No | No | No | No |

### Token Management

| Token Type | Lifetime | Storage | Rotation |
|-----------|----------|---------|----------|
| Access Token | 1 hour | In-memory only | Auto-refresh via refresh token |
| Refresh Token | 6 months | Secure keystore (device) | Rotated on use (one-time use) |
| Upload Token | 7 days | Server-side session | Single-use; expires after finalization |
| Share Token | Indefinite (until revoked) | Spanner | Revoked on unshare |
| Sync Token | Rolling | Spanner | Updated on each sync |

---

## Data Security

### Encryption at Rest

| Data Type | Encryption | Key Management |
|-----------|-----------|----------------|
| Photo/Video blobs | AES-256-GCM | Google's default encryption with per-chunk keys |
| Metadata (Spanner) | AES-256 (Spanner built-in) | Automatic key rotation (90-day cycle) |
| ML Embeddings | AES-256 | Shared with metadata keys |
| Search Index | AES-256 | Index-specific keys |
| Backups | AES-256-GCM | Separate backup encryption keys |
| **Deleted data** | Crypto-shredding | Encryption key destroyed → data unreadable |

**Encryption Architecture:**
```
┌────────────────────────────────────────────────┐
│ Google's Encryption Hierarchy                  │
│                                                │
│   KMS Root Key                                 │
│       ↓                                        │
│   Key Encryption Key (KEK)                     │
│       ↓                                        │
│   Data Encryption Key (DEK) — per chunk/row    │
│       ↓                                        │
│   Encrypted Data                               │
│                                                │
│   DEK is stored encrypted by KEK               │
│   KEK is stored in hardware KMS (HSM-backed)   │
│   Root key never leaves HSM                    │
└────────────────────────────────────────────────┘
```

### Encryption in Transit

| Path | Protocol | Details |
|------|----------|---------|
| Client ↔ GFE | TLS 1.3 | Certificate pinning on mobile apps |
| GFE ↔ Backend | ALTS (Application Layer Transport Security) | Google's internal mTLS; identity-based |
| Service ↔ Service | ALTS | All internal traffic encrypted |
| Cross-Region Replication | ALTS over private fiber | Google's private network backbone |

### PII Handling

| PII Data | Location | Protection |
|----------|----------|------------|
| GPS coordinates (EXIF) | Metadata DB | Encrypted; stripped from shared/public URLs |
| Face embeddings | Bigtable | Per-user encryption; deleted on face grouping opt-out |
| User search queries | Logs (7-day retention) | Anonymized after 7 days; no long-term query logging |
| Photo content | Blob storage | Encrypted; access-controlled |
| Camera metadata | Metadata DB | Encrypted; not exposed in sharing views |
| Person names (face labels) | Metadata DB | Per-user; never shared or used for training |

### Data Masking/Anonymization

```
FUNCTION prepareForSharing(mediaItem, sharingContext):
    sanitizedItem = COPY(mediaItem)

    // Strip sensitive EXIF
    IF sharingContext.type != OWNER_VIEW:
        REMOVE sanitizedItem.metadata.gpsCoordinates
        REMOVE sanitizedItem.metadata.cameraSerial
        REMOVE sanitizedItem.metadata.deviceId

    // Never expose face embeddings externally
    REMOVE sanitizedItem.faceEmbeddings

    // Sanitize serving URL (time-limited, scoped)
    sanitizedItem.url = generateTimeLimitedUrl(
        mediaItem.blob_ref,
        expiresIn = 1 hour,
        scope = sharingContext.shareToken
    )

    RETURN sanitizedItem
```

---

## Threat Model

### Top Attack Vectors

| # | Attack Vector | Severity | Likelihood | Mitigation |
|---|--------------|----------|------------|------------|
| 1 | **Account Takeover** | Critical | Medium | MFA enforcement; anomalous login detection; session binding |
| 2 | **Unauthorized Photo Access** | Critical | Medium | ABAC authorization; share token validation; no URL guessing |
| 3 | **Data Exfiltration (insider)** | Critical | Low | Access logging; least-privilege IAM; mandatory code review for data access |
| 4 | **CSAM / Illegal Content** | Critical | Medium | Content Safety API scanning; hash-based detection (PhotoDNA); reporting |
| 5 | **API Abuse (scraping)** | High | High | Rate limiting; OAuth scope restrictions; anomaly detection |
| 6 | **ML Model Poisoning** | Medium | Low | Training data validation; model monitoring; canary deployments |
| 7 | **DDoS on Upload** | High | Medium | Per-user rate limits; CDN absorption; adaptive throttling |
| 8 | **Privacy Violation (face data)** | High | Medium | Opt-in face grouping; GDPR data portability; right to erasure |

### Mitigation Details

#### 1. Account Takeover Protection

```
FUNCTION detectSuspiciousLogin(loginEvent):
    riskScore = 0

    // Geographic anomaly
    IF distance(loginEvent.location, user.lastKnownLocation) > 1000km
       AND timeSince(user.lastLogin) < 1 hour:
        riskScore += 40  // Impossible travel

    // Device anomaly
    IF loginEvent.deviceFingerprint NOT IN user.knownDevices:
        riskScore += 20

    // Behavioral anomaly
    IF loginEvent.hour NOT IN user.typicalLoginHours:
        riskScore += 10

    // IP reputation
    IF ipReputationService.score(loginEvent.ip) < 0.5:
        riskScore += 30

    IF riskScore >= 50:
        REQUIRE step-up authentication (MFA challenge)
    IF riskScore >= 80:
        BLOCK login; send security alert to user
```

#### 2. Share URL Security

```
Share URL Structure:
https://photos.google.com/share/{shareToken}

shareToken = BASE64URL(
    HMAC_SHA256(
        key = rotatingShareKey,
        data = albumId + creatorId + permissions + expiryTimestamp
    )
)

Properties:
- Token is opaque (cannot guess other tokens)
- Token is bound to specific album and permissions
- Token can be revoked instantly (database lookup)
- Optional: expiry timestamp for time-limited shares
- No sequential IDs or enumerable patterns
```

#### 4. Content Safety (CSAM Detection)

```
FUNCTION contentSafetyCheck(mediaItem):
    // Phase 1: Perceptual hash matching (pre-upload)
    photoHash = computePDQ(mediaItem.image)  // Facebook's PDQ hash
    ncmecMatch = LOOKUP ncmecHashDatabase WHERE hash = photoHash

    IF ncmecMatch:
        QUARANTINE mediaItem
        REPORT to NCMEC
        BLOCK user account for review
        RETURN BLOCKED

    // Phase 2: ML-based detection
    safetyScore = contentSafetyModel.predict(mediaItem.image)

    IF safetyScore.csam > 0.99:
        QUARANTINE mediaItem
        ESCALATE to human review team
        RETURN BLOCKED

    IF safetyScore.explicit > 0.95:
        FLAG mediaItem as sensitive
        RESTRICT from sharing/public
        RETURN FLAGGED

    RETURN ALLOWED
```

### Rate Limiting & DDoS Protection

| Layer | Mechanism | Limit |
|-------|-----------|-------|
| GFE (Edge) | Connection-level rate limiting | 1000 conn/IP |
| API Gateway | Token bucket per user | Varies by endpoint (see API section) |
| Upload | Per-user daily limit | 2000 uploads/day (API), unlimited (app) |
| Search | Per-user per-minute | 100 queries/min |
| Bandwidth | Per-user egress | Adaptive based on plan |
| Abuse detection | ML-based anomaly detection | Automatic escalation |

---

## Compliance

### GDPR (EU)

| Requirement | Implementation |
|-------------|---------------|
| **Right to Access** | Google Takeout — export all photos/videos with metadata |
| **Right to Erasure** | Delete account → 60-day grace period → crypto-shredding all data |
| **Right to Portability** | Google Takeout exports in standard formats (JPEG, MP4) |
| **Data Minimization** | Face grouping opt-in (not default) in EU; minimal metadata retained |
| **Purpose Limitation** | Photos not used for ad targeting (Google's public commitment) |
| **Consent for Face Processing** | Explicit opt-in for face grouping; can be revoked |
| **Data Processing Agreement** | Google Cloud DPA available |
| **72-hour Breach Notification** | Automated incident response pipeline |

### CCPA (California)

| Requirement | Implementation |
|-------------|---------------|
| **Right to Know** | Privacy dashboard shows data categories |
| **Right to Delete** | Account deletion or individual photo deletion |
| **Right to Opt-Out** | No sale of personal data (Google's commitment) |
| **Non-Discrimination** | Same service regardless of privacy choices |

### COPPA (Children's Privacy)

| Requirement | Implementation |
|-------------|---------------|
| **Age Verification** | Google Account age requirements |
| **Parental Consent** | Family Link supervised accounts |
| **Data Restrictions** | No face grouping for supervised child accounts |
| **Content Controls** | Supervised access; restricted sharing |

### Biometric Privacy Laws (Illinois BIPA, Texas CUBI)

| Requirement | Implementation |
|-------------|---------------|
| **Written Consent** | Explicit opt-in for face grouping |
| **Data Retention Policy** | Face data deleted on opt-out; no indefinite retention |
| **No Sale/Disclosure** | Face embeddings never shared with third parties |
| **Secure Storage** | Encrypted, per-user isolation |

### Content Safety Compliance

| Regulation | Implementation |
|-----------|---------------|
| **CSAM Reporting (US 18 USC §2258A)** | Automated detection + NCMEC reporting |
| **EU Digital Services Act** | Transparent content moderation; appeals process |
| **Australian Online Safety Act** | Content removal within regulatory timeframes |

---

## Privacy-Preserving ML

### Face Grouping Privacy

```
Privacy Controls:
├── Opt-In Requirement
│   ├── Face grouping OFF by default in EU, Illinois, Texas
│   ├── Clear consent dialog before enabling
│   └── Can be disabled at any time
│
├── Data Isolation
│   ├── Face embeddings stored per-user (never shared across users)
│   ├── Face models trained on licensed datasets (not user photos)
│   └── No cross-user face matching (even in shared albums)
│
├── Deletion Guarantees
│   ├── Opt-out → all face embeddings deleted within 30 days
│   ├── Delete a person → all their embeddings deleted
│   └── Account deletion → all ML data crypto-shredded
│
└── Transparency
    ├── Users can see all face clusters
    ├── Users can correct misidentifications
    ├── Users can remove faces from grouping
    └── No facial recognition on shared/public content
```

### Photo Usage for Model Training

```
Google's Public Commitment:
├── User photos are NOT used to train ML models (since 2019 policy)
├── Models trained on licensed datasets + synthetic data
├── Federated learning for some on-device models:
│   ├── Model trained centrally on non-user data
│   ├── Fine-tuned locally on user's device
│   ├── Only model updates (gradients) sent to server
│   └── No raw photo data leaves device for training
└── Regular third-party audits of data handling practices
```

---

## Security Monitoring & Incident Response

### Security Event Logging

| Event | Log Level | Retention | Alert |
|-------|-----------|-----------|-------|
| Login attempt (success/failure) | INFO | 90 days | Failure pattern alert |
| Permission change | WARN | 2 years | Immediate notification |
| Sharing event | INFO | 1 year | Anomaly detection |
| Bulk download (>100 photos) | WARN | 1 year | Suspicious if new device |
| Account deletion request | CRITICAL | 5 years (audit) | Confirmation workflow |
| CSAM detection | CRITICAL | Indefinite (legal) | Immediate escalation |
| API key compromise | CRITICAL | Indefinite | Auto-revoke + alert |

### Incident Response Timeline

```
T+0s:   Automated detection (anomaly, threshold, correlation)
T+1m:   Auto-classification (severity P0-P4)
T+5m:   On-call SRE paged (P0/P1)
T+15m:  Incident commander assigned
T+30m:  Initial assessment and containment
T+1h:   Status update to leadership
T+4h:   Customer communication (if user-impacting)
T+24h:  Root cause identified
T+72h:  GDPR notification deadline (if data breach)
T+7d:   Post-incident review
T+30d:  Remediation items completed
```
