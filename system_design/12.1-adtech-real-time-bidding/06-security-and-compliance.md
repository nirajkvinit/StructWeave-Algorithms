# Security & Compliance — RTB System

## 1. Ad Fraud Prevention

### 1.1 Invalid Traffic (IVT) Classification

The Media Rating Council (MRC) and IAB Tech Lab define two categories of invalid traffic:

| Category | Description | Examples | Detection Complexity |
|---|---|---|---|
| **GIVT** (General IVT) | Non-human traffic identifiable via simple filtering | Known bots (Googlebot, Bingbot), data center IPs, declared crawlers, prefetch/prerender | Low — static lists and pattern matching |
| **SIVT** (Sophisticated IVT) | Invalid traffic requiring advanced analysis | Bot networks mimicking humans, click farms, ad injection malware, domain spoofing, cookie stuffing | High — requires ML models and behavioral analysis |

### 1.2 Pre-Bid Fraud Prevention

Pre-bid detection operates within the <5ms budget on the bid request critical path:

```
Pre-Bid Filtering Pipeline:
  1. IP Reputation Check (<1ms)
     → Compare against known data center IP ranges (>500K IPs)
     → Check against real-time fraud IP blocklist (updated every 5 min)
     → Result: BLOCK, SUSPICIOUS, or CLEAN

  2. Device Signal Validation (<1ms)
     → Verify user-agent is well-formed and consistent with device type
     → Check for headless browser indicators
     → Validate device fingerprint consistency

  3. Supply Chain Verification (<1ms)
     → Verify publisher is in ads.txt for the selling SSP
     → Validate SupplyChain object nodes against sellers.json
     → Flag requests with incomplete or invalid supply chains

  4. Traffic Pattern Check (<2ms)
     → Lookup request frequency per IP (rolling 1-hour counter)
     → Flag if >100 requests/min from single IP (bot-like frequency)
     → Check geographic consistency (IP geo vs timezone)

  Decision:
    IF any check returns BLOCK → Do not bid (save money)
    IF SUSPICIOUS score > threshold → Bid at reduced price (discount risk)
    IF CLEAN → Proceed to normal bid evaluation
```

### 1.3 Post-Bid Fraud Analysis

Post-bid analysis runs asynchronously on impression and click events:

```
Post-Bid Signals:
  Click Timing Analysis:
    - Time from impression to click <200ms → likely bot (humans need >500ms)
    - Clicks at exact intervals (every 3.0 seconds) → bot pattern
    - Click coordinates always at same position → automated clicking

  Session Behavior:
    - Single-page sessions with ad click → suspicious (incentivized traffic)
    - Zero scroll depth with ad interaction → likely not genuine engagement
    - No mouse movement before click → non-human

  Conversion Path Analysis:
    - Click-to-conversion time <1 second → attribution fraud
    - Organic install preceded by click within 5 seconds → click injection
    - Same device ID across many advertiser accounts → device farm

  Publisher-Level Analysis:
    - Publisher CTR >5x category average → click fraud risk
    - Publisher IVT rate consistently >20% → downgrade quality score
    - Sudden traffic spike without corresponding content change → bought traffic
```

### 1.4 Fraud Mitigation Actions

| Severity | Action | Timing |
|---|---|---|
| **Confirmed GIVT** | Block immediately; exclude from billing | Pre-bid (real-time) |
| **Suspected SIVT** | Reduce bid by 50-80%; flag for investigation | Pre-bid (real-time) |
| **Post-bid confirmed fraud** | Claw back spend from publisher; add to blocklist | Batch (hourly) |
| **Publisher-level fraud** | Suspend publisher; require remediation | Manual review (daily) |
| **Attribution fraud** | Invalidate conversions; adjust advertiser billing | Batch (daily) |

---

## 2. Privacy Regulations

### 2.1 Regulatory Framework

| Regulation | Jurisdiction | Key Requirements for RTB |
|---|---|---|
| **GDPR** | EU/EEA | Consent required for personal data processing; right to erasure; data minimization; legitimate interest basis requires balancing test |
| **CCPA/CPRA** | California, US | Right to opt-out of "sale" of personal information; do-not-sell signal; data deletion requests |
| **ePrivacy** | EU | Cookie consent required; Transparency and Consent Framework (TCF) compliance |
| **COPPA** | US (children) | No behavioral targeting for children under 13; verified parental consent |
| **LGPD** | Brazil | Similar to GDPR; consent or legitimate interest basis; data protection officer required |
| **PIPL** | China | Separate consent for each data processing purpose; data localization requirements |

### 2.2 Consent Signal Processing

```
Consent Flow in OpenRTB:

BidRequest.regs.gdpr = 1          // GDPR applies
BidRequest.user.consent = "..."    // TCF 2.0 consent string

DSP Consent Processing:
  1. Parse TCF consent string
  2. Check if DSP has consent for:
     → Purpose 1: Store/access information on device
     → Purpose 2: Select basic ads
     → Purpose 3: Create a personalized ads profile
     → Purpose 4: Select personalized ads
     → Purpose 7: Measure ad performance

  3. Based on consent grants:
     IF Purpose 1+2 only (no personalization consent):
       → Contextual bidding only (no user features)
       → Do not read or write user cookies
       → Do not look up user profile in feature store

     IF Purpose 1+2+3+4 (full consent):
       → Full personalized bidding allowed
       → User profile lookup permitted
       → Frequency capping with user ID

     IF No consent / consent withdrawn:
       → Do not bid on this impression
       → Delete any stored user data upon request

  4. Log consent basis for every impression (audit trail)
```

### 2.3 Privacy-Preserving Bidding Approaches

The industry is transitioning to privacy-preserving alternatives as third-party cookies are deprecated:

| Approach | Mechanism | Targeting Quality | Privacy Level |
|---|---|---|---|
| **Contextual targeting** | Bid based on page content, not user identity | Medium (60-70% of cookie-based) | High — no user data needed |
| **Topics API** | Browser provides top-5 interest categories per user | Medium (similar to contextual) | High — coarse-grained, on-device |
| **Protected Audience API** | On-device auction for remarketing; no user data leaves browser | Good for retargeting | Very high — all computation on-device |
| **Publisher first-party data** | Publisher shares authenticated user data (with consent) | High | Medium — requires user consent per publisher |
| **Data clean rooms** | Secure multi-party computation to match advertiser and publisher data | High | High — no raw data exchange |
| **Cohort-based targeting** | Group users into privacy-safe cohorts (k-anonymity) | Medium | High — individual identity protected |

### 2.4 Data Subject Rights Implementation

```
Right to Erasure (GDPR Art. 17 / CCPA):

  1. User submits deletion request via publisher or directly
  2. DSP receives request (via API or automated data subject request portal)
  3. Deletion pipeline:
     a. Feature store: DELETE user profile by user_id
     b. Frequency counters: DELETE all counters for user_id
     c. Impression logs: Mark records for user_id as "redacted"
        (Cannot delete from immutable event log — mark for exclusion)
     d. Data lake: Schedule redaction job (batch, within 30 days)
     e. Model training: Exclude redacted records from next training cycle
     f. Backup systems: Redact within 90 days
  4. Confirm deletion to user within 30 days
  5. Maintain deletion log (without PII) for compliance audit

  Challenges:
    - Immutable event logs cannot be modified → redaction via exclusion markers
    - ML models trained on deleted user's data → retrain without (acceptable delay)
    - Cross-party deletion → cascade to downstream partners
```

---

## 3. Supply Chain Integrity

### 3.1 ads.txt / app-ads.txt

ads.txt (Authorized Digital Sellers) is a publisher-hosted file that lists SSPs/exchanges authorized to sell their inventory.

```
Purpose: Prevent domain spoofing
  Without ads.txt:
    Fraudster creates bid requests claiming domain = "premium-news.com"
    DSP bids high CPMs thinking it's premium inventory
    Fraudster collects revenue for fake impressions

  With ads.txt:
    DSP checks premium-news.com/ads.txt
    Verifies that the SSP in the bid request is listed as authorized
    If not listed → Do not bid (unauthorized seller)

Validation Flow (DSP side):
  1. Cache ads.txt files for all known publishers (refresh daily)
  2. On each bid request:
     a. Extract publisher domain from BidRequest.site.domain
     b. Look up ads.txt for that domain
     c. Verify BidRequest.source.schain nodes match ads.txt entries
     d. If mismatch → Skip bid or heavily discount
```

### 3.2 sellers.json

sellers.json is an exchange-hosted file listing all sellers (publishers or intermediaries) on their platform.

```
Exchange publishes: exchange.com/sellers.json
{
  "sellers": [
    {
      "seller_id": "pub_12345",
      "name": "Premium News Network",
      "domain": "premium-news.com",
      "seller_type": "PUBLISHER",       // Direct seller
      "is_confidential": false
    },
    {
      "seller_id": "reseller_678",
      "name": "Ad Network Inc",
      "seller_type": "INTERMEDIARY",     // Reseller
      "domain": "adnetwork.com"
    }
  ]
}

DSP Verification:
  1. Parse SupplyChain object from bid request
  2. For each node in chain, verify against corresponding sellers.json
  3. Prefer shorter supply chains (fewer intermediaries = less fraud risk)
  4. Flag requests with INTERMEDIARY-only chains (no direct publisher)
```

### 3.3 SupplyChain Object

The SupplyChain object in OpenRTB provides full transparency of every entity involved in selling the impression:

```
BidRequest.source.schain:
  complete: 1           // 1 = full chain; 0 = partial
  nodes:
    - asi: "ssp1.com"   // Exchange domain
      sid: "pub_123"    // Seller ID on this exchange
      rid: "req_abc"    // Request ID at this hop
      hp: 1             // Payment flows through this node

    - asi: "reseller.com"
      sid: "res_456"
      hp: 1

DSP Trust Scoring:
  chain_length = 1 → High trust (direct path)
  chain_length = 2 → Medium trust (one intermediary)
  chain_length = 3+ → Low trust (multiple resellers; higher fraud risk)
  complete = 0 → Very low trust (chain cannot be fully verified)
```

---

## 4. Brand Safety & Content Verification

### 4.1 Brand Safety Categories

Advertisers specify categories of content where their ads must NOT appear:

| Category | Examples | Risk |
|---|---|---|
| **Adult content** | Explicit material, dating sites | Brand association damage |
| **Violence/gore** | Graphic violence, weapons | Brand association damage |
| **Controversial news** | Political extremism, misinformation | Polarization association |
| **Piracy/malware** | Torrent sites, malware distribution | Legal liability |
| **Illegal content** | Drug markets, counterfeit goods | Legal liability |
| **Negative sentiment** | Disaster coverage, tragedy reporting | Insensitive ad placement |
| **User-generated content** | Unmoderated forums, comment sections | Unpredictable context |

### 4.2 Content Verification Pipeline

```
Verification approaches:

Pre-Bid Verification (< 5ms):
  1. Page URL categorization via cached taxonomy
     → Maintain URL → category mapping for top 10M pages
     → Cache hit rate: ~80% of bid requests
  2. Domain-level blocklist check
     → Advertiser-specific blocked domains
  3. IAB content category from bid request
     → BidRequest.site.cat field
     → Trust but verify (cross-reference with own classification)

Post-Bid Verification (async):
  1. Crawl winning page after impression served
  2. NLP classification of page content
  3. Image/video analysis for brand safety
  4. Compare actual content vs pre-bid classification
  5. If mismatch → Add to domain downgrade list; refund advertiser
```

### 4.3 Creative Security

```
Creative Review Pipeline:
  1. Automated scanning (minutes):
     → Malware scanning of all URLs in creative markup
     → SSL verification (all resources must be HTTPS)
     → Size/format validation (no oversized creatives)
     → Click URL verification (no redirect chains to malicious sites)

  2. Policy compliance (minutes to hours):
     → Content classification (no prohibited content)
     → Landing page verification (accessible, non-deceptive)
     → Advertiser domain verification (matches declared adomain)

  3. Manual review (hours, for flagged creatives):
     → Human review for edge cases
     → Category-specific review (pharma, alcohol, gambling require extra checks)

  Creative Status: PENDING → APPROVED → SERVING
                              ↓
                          REJECTED (with reason)
```

---

## 5. Data Security

### 5.1 Data Classification

| Data Type | Classification | Encryption | Retention | Access |
|---|---|---|---|---|
| **User IDs (cookies)** | PII | Encrypted at rest, hashed in transit | Per consent; max 13 months (GDPR) | Bid serving only; no export |
| **IP addresses** | PII | Truncated to /24; encrypted at rest | 90 days raw; 1 year truncated | Fraud detection, geo targeting |
| **Bid prices** | Business confidential | Encrypted at rest | 30 days detailed; 1 year aggregated | Internal analytics only |
| **Campaign configurations** | Business confidential | Encrypted at rest | Campaign lifetime + 1 year | Advertiser + authorized staff |
| **Impression logs** | Operational | Encrypted at rest | 30 days detailed; 1 year aggregated | Analytics, billing |
| **Financial transactions** | Regulated | Encrypted at rest + in transit | 7 years (tax/audit) | Finance team, auditors |

### 5.2 Security Controls

```
API Security:
  - mTLS for all inter-service communication
  - API keys + IP allowlisting for exchange ↔ DSP connections
  - Rate limiting per DSP (prevent abuse of bid endpoint)
  - Request signing (HMAC) for win/loss notice callbacks

Data Protection:
  - Field-level encryption for PII (user IDs, IPs)
  - Key rotation every 90 days
  - Hardware security modules for encryption key storage
  - Database encryption at rest with tenant isolation

Network Security:
  - All external communication over TLS 1.3
  - DDoS protection at load balancer layer
  - Network segmentation: bid serving, analytics, and management in separate zones
  - No direct internet access for internal services

Operational Security:
  - Principle of least privilege for all service accounts
  - Audit logging for all campaign and budget changes
  - Automated credential rotation
  - Security scanning of creative assets before serving
```

---

## 6. Compliance Monitoring & Auditing

### 6.1 Compliance Dashboard

```
Real-Time Compliance Metrics:
  - Consent rate by region (% of impressions with valid consent)
  - IVT rate by publisher (% flagged as invalid)
  - Supply chain completeness (% with complete schain)
  - ads.txt match rate (% of impressions from authorized sellers)
  - COPPA compliance (% of child-directed inventory handled correctly)
  - Data subject request fulfillment rate and average time-to-completion

Alerting Thresholds:
  - IVT rate > 25% for any publisher → auto-pause + investigate
  - Consent rate drops below 60% in EU → potential TCF implementation issue
  - ads.txt mismatch rate > 10% → potential domain spoofing attack
  - Data subject request unfulfilled > 25 days → escalation to DPO
```

### 6.2 Audit Trail

```
Every bid decision records:
  - Consent basis (TCF string, CCPA opt-out status)
  - Data used (what user signals influenced the bid)
  - Supply chain (full schain from bid request)
  - Fraud assessment (pre-bid and post-bid scores)
  - Price and settlement details
  - Timestamp and bidder node identifier

Retention:
  - Detailed audit trail: 2 years (GDPR accountability)
  - Financial records: 7 years (tax compliance)
  - Consent records: lifetime of consent + 3 years after withdrawal
```
