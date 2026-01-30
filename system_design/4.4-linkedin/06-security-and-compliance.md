# LinkedIn: Security & Compliance

[← Back to Index](./00-index.md)

---

## Authentication & Authorization

### OAuth2 Implementation

```
LINKEDIN OAUTH2 FLOW:

1. AUTHORIZATION CODE FLOW (Web Apps):

   User → LinkedIn Auth Server:
       GET /oauth/v2/authorization
       ?response_type=code
       &client_id={app_id}
       &redirect_uri={callback}
       &scope=r_liteprofile r_emailaddress w_member_social
       &state={csrf_token}

   LinkedIn → User → App:
       GET {callback}?code={auth_code}&state={csrf_token}

   App → LinkedIn Token Server:
       POST /oauth/v2/accessToken
       Content-Type: application/x-www-form-urlencoded

       grant_type=authorization_code
       &code={auth_code}
       &client_id={app_id}
       &client_secret={app_secret}
       &redirect_uri={callback}

   Response:
       {
           "access_token": "AQV...",
           "expires_in": 5184000,  // 60 days
           "refresh_token": "AQX...",
           "refresh_token_expires_in": 31536000  // 1 year
       }

2. SCOPES:

   BASIC:
       r_liteprofile       Read basic profile (name, photo, headline)
       r_emailaddress      Read primary email

   PROFESSIONAL:
       r_fullprofile       Read full profile (positions, education)
       w_member_social     Post, comment, react

   ENTERPRISE (Recruiter/Sales Nav):
       r_organization_social   Read company posts
       w_organization_social   Post as company
       r_ads                   Read ad campaigns
       r_1st_connections       Read 1st degree connections

3. TOKEN MANAGEMENT:
   - Access tokens: 60 days validity
   - Refresh tokens: 1 year validity
   - Rotation on refresh (old refresh token invalidated)
   - Revocation endpoint for logout
```

### Enterprise SSO (SAML)

```
ENTERPRISE SSO FLOW:

1. User accesses LinkedIn via enterprise portal
2. LinkedIn redirects to customer's IdP (Okta, Azure AD)
3. User authenticates with corporate credentials
4. IdP sends SAML assertion to LinkedIn
5. LinkedIn validates assertion, creates session

SAML CONFIGURATION:
    Entity ID: urn:linkedin:saml
    ACS URL: https://www.linkedin.com/saml/acs
    SLO URL: https://www.linkedin.com/saml/logout

    Required Attributes:
        - email (primary identifier)
        - firstName
        - lastName

    Optional Attributes:
        - employeeId
        - department
        - title

JIT PROVISIONING:
    - Auto-create LinkedIn account on first SSO login
    - Link to existing account by email match
    - Sync profile updates from IdP

SCIM PROVISIONING (Enterprise):
    - Automated user lifecycle management
    - Create/update/deactivate users
    - Group membership sync
```

### B2B Token Isolation

```
ENTERPRISE PRODUCT ISOLATION:

1. RECRUITER TOKEN SCOPE:
    Token: recruiter_access_token
    Permissions:
        - Search all LinkedIn members
        - View full profiles (within contract)
        - Send InMails
        - Access talent pipeline
        - ATS integrations

    Restrictions:
        - Cannot access Sales Navigator data
        - Cannot post as company
        - Rate limited per seat

2. SALES NAVIGATOR TOKEN SCOPE:
    Token: sales_nav_access_token
    Permissions:
        - Search all members
        - View profiles (limited vs Recruiter)
        - Lead and account lists
        - CRM sync

    Restrictions:
        - Cannot send InMails (unless purchased)
        - Cannot access recruiting features

3. MARKETING SOLUTIONS TOKEN SCOPE:
    Token: marketing_access_token
    Permissions:
        - Ad campaign management
        - Audience targeting
        - Conversion tracking

    Restrictions:
        - No profile access
        - No messaging

TOKEN STRUCTURE:
    {
        "sub": "urn:li:member:123456",
        "aud": "recruiter_api",
        "scope": ["r_fullprofile", "w_inmail", "r_search"],
        "org_id": "urn:li:organization:789",
        "seat_type": "recruiter_lite",
        "exp": 1706745600
    }
```

---

## Data Security

### Encryption at Rest

```
ENCRYPTION LAYERS:

1. DATABASE LEVEL:
    Technology: AES-256-GCM
    Key Management: HSM-backed KMS
    Key Rotation: Quarterly (automatic)

    Encrypted Fields:
        - Email addresses
        - Phone numbers
        - Messages (InMail)
        - Resume uploads
        - Payment information

2. FILE/BLOB STORAGE:
    Technology: AES-256
    Mode: Server-side encryption with customer-managed keys
    Scope: All media uploads

3. BACKUP ENCRYPTION:
    Technology: AES-256
    Key: Separate from production keys
    Access: Break-glass procedure required

KEY HIERARCHY:
    Root Key (HSM)
        └── Data Encryption Key (per shard)
                └── Field Encryption Key (per sensitive field)

    // Example: Message encryption
    FUNCTION EncryptMessage(plaintext):
        dek = KMS.GetDataKey(shard_id)
        fek = DeriveFieldKey(dek, "message_body")
        ciphertext = AES_GCM_Encrypt(plaintext, fek)
        RETURN ciphertext
```

### Encryption in Transit

```
TLS CONFIGURATION:

EXTERNAL (Client → LinkedIn):
    Protocol: TLS 1.3 (TLS 1.2 fallback)
    Cipher Suites:
        - TLS_AES_256_GCM_SHA384
        - TLS_CHACHA20_POLY1305_SHA256
    Certificate: Extended Validation (EV)
    HSTS: max-age=31536000; includeSubDomains; preload

INTERNAL (Service → Service):
    Protocol: mTLS (mutual TLS)
    Certificate Authority: Internal CA
    Certificate Rotation: Automatic (daily)
    Identity: Service mesh (Envoy)

API SECURITY:
    - All endpoints HTTPS only
    - HTTP requests redirected (301)
    - Certificate pinning for mobile apps
    - CORS: Strict origin validation

CERTIFICATE MANAGEMENT:
    External:
        Provider: DigiCert / Let's Encrypt
        Renewal: Automatic (30 days before expiry)

    Internal:
        CA: Vault PKI
        Validity: 24 hours (auto-rotate)
        Distribution: Service mesh sidecar
```

### PII Handling

```
PII CLASSIFICATION:

TIER 1 - HIGHLY SENSITIVE:
    - Email (primary identifier)
    - Phone number
    - Government ID (when collected)
    - Payment card data

    Handling:
        - Encrypted at rest (field-level)
        - Masked in logs (last 4 only)
        - Access logged and audited
        - Retention: Minimum necessary

TIER 2 - SENSITIVE:
    - Full name
    - Profile photo
    - Work history
    - Education
    - Messages

    Handling:
        - Encrypted at rest (database-level)
        - Pseudonymized in analytics
        - User-controlled visibility

TIER 3 - INTERNAL:
    - IP addresses
    - Device identifiers
    - Session data
    - Activity logs

    Handling:
        - Encrypted at rest
        - Retained for security (90 days)
        - Anonymized for analytics

DATA MASKING:
    FUNCTION MaskForLogs(data):
        IF data.type == "email":
            RETURN MaskEmail(data)  // j***@example.com

        IF data.type == "phone":
            RETURN MaskPhone(data)  // ***-***-1234

        IF data.type == "name":
            RETURN "REDACTED"

        RETURN data
```

---

## Privacy Controls

### Profile Visibility Settings

```
VISIBILITY OPTIONS:

PROFILE VISIBILITY:
    1. PUBLIC (Default):
        - Anyone can view profile
        - Indexed by search engines
        - Full profile visible to all LinkedIn members

    2. CONNECTIONS ONLY:
        - Only 1st-degree connections see full profile
        - Others see limited profile (name, headline)
        - Not indexed by external search

    3. PRIVATE MODE:
        - Browse profiles anonymously
        - Others see "LinkedIn Member" viewed their profile
        - Reciprocal: Cannot see who viewed yours

ACTIVITY VISIBILITY:
    - Posts: PUBLIC | CONNECTIONS | PRIVATE
    - Likes/Comments: ON | OFF
    - Profile changes: VISIBLE | HIDDEN
    - Job seeking: RECRUITERS ONLY | ALL | OFF

NAME DISPLAY:
    - Full name (default)
    - First name + last initial
    - Anonymous (for sensitive searches)

IMPLEMENTATION:
    FUNCTION GetProfile(viewer_id, target_id):
        visibility = GetVisibilitySetting(target_id)
        relationship = GetRelationship(viewer_id, target_id)

        IF visibility == PUBLIC:
            RETURN FullProfile(target_id)

        IF visibility == CONNECTIONS_ONLY:
            IF relationship == 1ST_DEGREE:
                RETURN FullProfile(target_id)
            ELSE:
                RETURN LimitedProfile(target_id)

        IF visibility == PRIVATE:
            IF viewer_id == target_id:
                RETURN FullProfile(target_id)
            ELSE:
                RETURN MinimalProfile(target_id)
```

### Connection Privacy

```
CONNECTION SETTINGS:

WHO CAN SEND CONNECTION REQUESTS:
    - Everyone (default)
    - Email required
    - Connections of connections only
    - No one (accept invitations only)

WHO CAN SEE CONNECTIONS:
    - Only you
    - Connections only
    - Everyone

CONNECTION REQUEST HANDLING:
    - Auto-decline from unknown industries
    - Auto-decline with no message
    - Require reason for connecting

BLOCKING:
    FUNCTION BlockMember(blocker_id, blocked_id):
        // Mutual blocking
        CreateBlock(blocker_id, blocked_id)

        // Remove existing connection if any
        RemoveConnection(blocker_id, blocked_id)

        // Hide from each other
        AddToHiddenList(blocker_id, blocked_id)
        AddToHiddenList(blocked_id, blocker_id)

        // Cannot find in search
        UpdateSearchIndex(blocked_id, exclude=[blocker_id])

        // Cannot view profile
        InvalidateProfileCache(blocked_id)
```

### InMail Filtering

```
INMAIL PRIVACY CONTROLS:

RECIPIENT SETTINGS:
    - Accept InMails from: Anyone | Connections | Premium only
    - Notification preferences: Instant | Daily digest | Off
    - Auto-archive promotional InMails

SENDER VERIFICATION:
    - Verified email required
    - Account age > 30 days
    - Profile completeness > 50%
    - No recent spam reports

CONTENT FILTERING:
    - ML spam detection
    - Keyword blocklist (user-defined)
    - URL scanning
    - Attachment scanning

RATE LIMITS:
    Free:           5 InMails/month
    Premium:        15 InMails/month
    Recruiter Lite: 30 InMails/month
    Recruiter:      150 InMails/month

RESPONSE TRACKING:
    - InMail credit refunded if no response in 90 days
    - Response rate shown to senders
    - Low response rate = warning to sender
```

---

## B2B Data Isolation

### Recruiter Data Access

```
RECRUITER ACCESS MODEL:

DATA ACCESS TIERS:

    TIER 1 - BASIC RECRUITER:
        Can Access:
            - Public profiles
            - 2nd/3rd degree profiles
            - InMail (with credits)
            - Basic search

        Cannot Access:
            - Competitor employee lists
            - Private profiles
            - Member activity data

    TIER 2 - RECRUITER LITE:
        Additional Access:
            - Enhanced search filters
            - Talent pool insights
            - Basic analytics

    TIER 3 - RECRUITER CORPORATE:
        Additional Access:
            - Full search (all members)
            - Talent pipeline management
            - ATS integration
            - Team collaboration

DATA BOUNDARIES:
    FUNCTION CheckRecruiterAccess(recruiter, target_member):
        // Check contract limits
        contract = GetContract(recruiter.org_id)

        IF target_member.visibility == PRIVATE:
            RETURN DENIED

        IF target_member IN contract.blocked_companies:
            RETURN DENIED  // Competitor protection

        IF recruiter.daily_views >= contract.daily_limit:
            RETURN RATE_LIMITED

        RETURN ALLOWED

AUDIT LOGGING:
    Every profile view by recruiter logged:
        {
            recruiter_id: "...",
            target_id: "...",
            org_id: "...",
            timestamp: "...",
            action: "PROFILE_VIEW",
            data_accessed: ["name", "headline", "experience"]
        }
```

### Sales Navigator Permissions

```
SALES NAVIGATOR ACCESS:

LEAD PERMISSIONS:
    - View profile (non-private)
    - Save to lead list
    - Add notes (org-private)
    - View connection path

ACCOUNT PERMISSIONS:
    - View company page
    - See employee count
    - View recent hires/departures
    - News alerts

CRM SYNC PERMISSIONS:
    - Export lead data (with limits)
    - Import from CRM
    - Bi-directional sync (enterprise)

DATA LIMITS:
    Professional:   10 profile exports/day
    Team:           25 profile exports/day
    Enterprise:     50 profile exports/day + API access

TEAMLINK:
    // See colleagues' connections to leads
    FUNCTION GetTeamConnections(sales_rep, target):
        team = GetTeam(sales_rep.org_id)

        team_connections = []
        FOR each colleague in team:
            path = GetConnectionPath(colleague, target)
            IF path.length <= 2:
                team_connections.append({
                    colleague: colleague,
                    path: path,
                    relationship_strength: CalculateStrength(colleague, target)
                })

        RETURN team_connections
```

### Enterprise Tenancy

```
MULTI-TENANT ISOLATION:

TENANT BOUNDARIES:
    - Each enterprise customer is a tenant
    - Data never co-mingled
    - Separate encryption keys
    - Isolated compute (for enterprise tier)

DATA SEGREGATION:
    Shared Infrastructure:
        - Public LinkedIn data (profiles, posts)
        - Platform services (auth, messaging)

    Tenant-Specific:
        - Recruiter pipelines
        - Sales Navigator lists
        - Analytics data
        - Custom integrations

CROSS-TENANT PROTECTION:
    // Prevent data leakage between competing tenants

    FUNCTION ValidateTenantAccess(request):
        requesting_tenant = GetTenant(request.token)
        resource_tenant = GetResourceTenant(request.resource)

        IF resource_tenant != requesting_tenant:
            IF resource.type == "public_profile":
                RETURN ALLOWED  // Public data OK
            ELSE:
                RETURN DENIED   // Tenant-specific data blocked

        RETURN ALLOWED
```

---

## Compliance

### GDPR Requirements

```
GDPR COMPLIANCE IMPLEMENTATION:

1. RIGHT TO ACCESS (Article 15):
    Endpoint: GET /v2/gdpr/data-export
    Response Time: 30 days (usually 48 hours)
    Format: Machine-readable (JSON)

    Data Included:
        - Profile data
        - Connections
        - Messages
        - Posts and engagement
        - Search history
        - Login history

2. RIGHT TO ERASURE (Article 17):
    Endpoint: DELETE /v2/gdpr/account
    Process:
        1. Soft delete immediately
        2. 14-day grace period (can cancel)
        3. Hard delete after 14 days
        4. Propagate to all regions
        5. Remove from backups (within 90 days)

    Exceptions:
        - Legal hold
        - Contract obligations (Recruiter messages to applicants)

3. RIGHT TO RECTIFICATION (Article 16):
    - User can edit all personal data
    - Profile updates propagate within 24 hours
    - Historical posts retain original

4. DATA PORTABILITY (Article 20):
    Endpoint: GET /v2/gdpr/export
    Formats: JSON, CSV
    Included: All user-generated content

5. CONSENT MANAGEMENT:
    Granular consent for:
        - Marketing emails
        - Partner data sharing
        - Analytics cookies
        - Personalization

    Consent Records:
        {
            member_id: "...",
            consent_type: "marketing_email",
            granted: true,
            timestamp: "...",
            ip_address: "...",
            method: "settings_page"
        }

6. DATA PROCESSING AGREEMENTS:
    - DPA with all sub-processors
    - Standard Contractual Clauses for non-EU transfers
    - Annual review of processors
```

### CCPA Requirements

```
CCPA COMPLIANCE (California):

1. RIGHT TO KNOW:
    - Categories of data collected
    - Sources of data
    - Business purpose
    - Third parties shared with

    Disclosure: Privacy Policy + /privacy/data-categories

2. RIGHT TO DELETE:
    - Same as GDPR erasure
    - 45-day response window
    - Verification required

3. RIGHT TO OPT-OUT (Sale of Data):
    - LinkedIn does not "sell" data per CCPA
    - Advertising uses data for targeting (disclosed)
    - Opt-out of targeted advertising available

4. NON-DISCRIMINATION:
    - Cannot deny service for privacy choices
    - Premium features not affected by privacy settings

VERIFICATION:
    FUNCTION VerifyCCPARequest(request):
        // Verify identity before processing
        IF request.auth_method == "logged_in":
            RETURN VERIFIED

        IF request.email == account.email:
            SendVerificationEmail(request.email)
            RETURN PENDING_VERIFICATION

        RETURN DENIED
```

### SOC2 Compliance

```
SOC2 TYPE II CONTROLS:

TRUST SERVICE CRITERIA:

1. SECURITY:
    Controls:
        - Access management (IAM, SSO)
        - Network security (firewalls, WAF)
        - Endpoint protection (EDR)
        - Vulnerability management (scans, patches)

    Evidence:
        - Access review logs
        - Firewall rules
        - Patch compliance reports

2. AVAILABILITY:
    Controls:
        - SLA monitoring (99.9%+)
        - Disaster recovery testing
        - Capacity planning
        - Incident response

    Evidence:
        - Uptime reports
        - DR test results
        - Capacity plans

3. PROCESSING INTEGRITY:
    Controls:
        - Input validation
        - Output verification
        - Error handling
        - Change management

    Evidence:
        - Test results
        - Change logs
        - Error reports

4. CONFIDENTIALITY:
    Controls:
        - Encryption (at rest, in transit)
        - Access controls
        - Data classification
        - Secure disposal

    Evidence:
        - Encryption configurations
        - Access logs
        - Disposal certificates

5. PRIVACY:
    Controls:
        - Notice (privacy policy)
        - Choice (consent management)
        - Collection (data minimization)
        - Use, Retention, Disclosure

    Evidence:
        - Privacy policy versions
        - Consent records
        - Data inventory

ANNUAL AUDIT:
    - External auditor review
    - Control testing
    - Report issued to customers
```

---

## Threat Model

### Attack Vectors

| Attack | Risk | Mitigation |
|--------|------|------------|
| **Credential stuffing** | High | Rate limiting, MFA, breach detection |
| **Account takeover** | High | Anomaly detection, step-up auth |
| **Profile scraping** | High | Bot detection, rate limits, legal action |
| **InMail phishing** | Medium | ML detection, URL scanning, warnings |
| **API abuse** | Medium | OAuth scopes, rate limits, audit logs |
| **Data exfiltration** | Medium | DLP, access controls, monitoring |
| **XSS/CSRF** | Medium | CSP, CSRF tokens, input sanitization |
| **SQL injection** | Low | Parameterized queries, WAF |

### Scraping Prevention

```
ANTI-SCRAPING MEASURES:

1. RATE LIMITING:
    Anonymous:      10 profile views/hour
    Logged-in:      100 profile views/hour
    Premium:        500 profile views/hour
    API (approved): Contracted limits

2. BOT DETECTION:
    Signals:
        - Request patterns (too fast, too regular)
        - Browser fingerprint anomalies
        - Mouse/keyboard behavior (JS)
        - CAPTCHA challenge failure

    Response:
        - Soft block (CAPTCHA)
        - Hard block (IP block)
        - Legal notice

3. BEHAVIORAL ANALYSIS:
    FUNCTION DetectScraping(session):
        features = {
            profiles_viewed: CountProfileViews(session, 1_hour),
            view_pattern: AnalyzeViewPattern(session),
            search_ratio: searches / profile_views,
            export_attempts: CountExports(session),
            api_usage: CountAPIRequests(session)
        }

        risk_score = ScrapingModel.Predict(features)

        IF risk_score > 0.8:
            RETURN BLOCK
        IF risk_score > 0.5:
            RETURN CHALLENGE
        RETURN ALLOW

4. DATA PROTECTION:
    - Profile data not in HTML source
    - Dynamic obfuscation of selectors
    - Image-based text for sensitive data
    - Honeypot fields for detection
```

### Spam/Abuse Detection

```
SPAM DETECTION PIPELINE:

1. REAL-TIME CLASSIFICATION:
    FUNCTION ClassifyContent(content):
        features = ExtractFeatures(content)

        // Multi-model ensemble
        text_score = TextSpamModel.Predict(features.text)
        behavior_score = BehaviorModel.Predict(features.sender)
        network_score = NetworkModel.Predict(features.relationships)

        combined_score = WeightedAverage([
            (text_score, 0.4),
            (behavior_score, 0.3),
            (network_score, 0.3)
        ])

        RETURN combined_score

2. CONTENT SIGNALS:
    - URL reputation
    - Keyword patterns (urgency, money, jobs)
    - Message templates (high similarity to spam corpus)
    - Attachment types

3. BEHAVIORAL SIGNALS:
    - Account age
    - Profile completeness
    - Connection acceptance rate
    - Past spam reports
    - Message reply rate

4. NETWORK SIGNALS:
    - Sender reputation
    - Common connections
    - Message volume spikes
    - Geographic anomalies

5. ACTIONS:
    Score < 0.3:    Deliver normally
    Score 0.3-0.6:  Deliver to spam folder
    Score 0.6-0.8:  Block, review queue
    Score > 0.8:    Block, account review

6. FEEDBACK LOOP:
    - User reports (false positives/negatives)
    - Manual review outcomes
    - Retrain models weekly
```

---

*Previous: [← 05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Next: [07 - Observability →](./07-observability.md)*
