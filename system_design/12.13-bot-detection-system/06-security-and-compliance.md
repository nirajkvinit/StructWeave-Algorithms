# 06 — Security & Compliance: Bot Detection System

## Adversarial ML Defense

### The Model Inversion Problem

Bot detection ML models face a unique adversarial threat: sophisticated bot operators can probe the system systematically to reverse-engineer the model's decision boundary. By sending thousands of crafted requests with slightly varied signals and observing whether each receives a challenge or passes, an attacker can reconstruct the feature weights that matter most, then specifically optimize their bot to score favorably on those features.

Defenses against model inversion attacks:

**1. Response opacity:** Never return the raw risk score to the client. Return only a binary challenge-or-not decision. Even challenge timing can leak information (responding faster when confident), so deliberate jitter is added to challenge response times.

**2. Score noise injection:** Add calibrated Gaussian noise to internal scores before thresholding. The noise is large enough to make per-request inference by the attacker noisy (± 0.05 score units), but small enough not to materially affect legitimate traffic. Over hundreds of probes, the attacker cannot recover precise feature weights.

**3. Model rotation:** Periodically (every 2–4 weeks) deploy a model with different feature weightings, even if accuracy is similar. An attacker who has reverse-engineered Model A will find their optimized bot suddenly detectable again when Model B is deployed, requiring them to restart the reconnaissance process.

**4. Canary features:** Deliberately include a small set of features that carry zero predictive weight in the real model but are observable by an attacker. If these features are over-represented in a session (suggesting the attacker is optimizing for them), it reveals that the session is conducting model probing, which is itself a strong bot signal.

### Honeypot Signal Injection

Honeypot signals are invisible traps embedded in application responses that legitimate users never trigger but automated scrapers reliably do:

**Honeypot links:** Hidden `<a>` tags in page HTML, styled with `display:none` and `visibility:hidden`. Search engine crawlers with JavaScript disabled will follow them; sophisticated scrapers that parse raw HTML without rendering it will also follow them. A session that requests the honeypot URL is flagged with near-certainty as a bot.

**CSS honeypot forms:** A form field hidden via CSS with `display:none`. Browsers don't autofill hidden fields, and humans don't see them. Bots that programmatically fill all form fields on a page will populate the honeypot field, which when submitted is a reliable bot signal.

**Timing traps:** A deliberately slow endpoint (500ms response delay injected server-side) that humans wouldn't notice but automated scrapers will avoid by timing out prematurely, revealing their timeout configuration.

**Honeypot API paths:** Fake API endpoints documented in a `robots.txt` disallow comment that only a bot reading the file carefully would discover. Any request to these paths is bot behavior.

### Feature Obfuscation

The JavaScript challenge script is obfuscated to prevent reverse engineering of the signal collection logic:

```
Obfuscation layers applied to challenge JS:
1. Variable and function name mangling (random identifiers)
2. Control flow obfuscation (insert dead branches, flatten loops)
3. String encryption (all literal strings encoded, decoded at runtime)
4. Anti-debugging detection:
   - Measure time to execute a code block; > 1000ms indicates DevTools paused execution
   - Check for debugger statement breakpoints
   - Detect unusual call stack depths (debugger-injected frames)
5. Dynamic code generation: some probe logic assembled from fragments at runtime
6. Integrity self-check: hash the script body at runtime; deviation indicates tampering

Important: Obfuscation is defense-in-depth, not a primary control. Determined attackers
will deobfuscate the script. Its value is raising the cost and time required.
```

### Anti-Replay Protections for Challenge Tokens

Challenge tokens are designed to be single-use, time-limited, and session-bound:

```
Token properties:
  - Single-use: verified via atomic compare-and-swap in token store (solved: false → true)
  - Time-limited: 5-minute TTL; expired tokens rejected even if unsolved
  - Session-bound: HMAC includes session_id; token cannot be transferred to another session
  - IP-bound (optional, configurable): HMAC includes client IP; token invalid from different IP
  - Request-bound (for high-security endpoints): HMAC includes specific request URL; token
    cannot be used for a different endpoint than the one that issued it

Replay attack scenario:
  1. Bot captures a valid challenge token from one session
  2. Attempts to use it in a different session
  Result: session_id mismatch → token rejected + session flagged as bot (token theft signal)
```

---

## Fingerprint Privacy and GDPR Compliance

### What Is Collected and Why

Device fingerprinting involves collecting technical characteristics of a browser and device that, when combined, can uniquely identify a device. This is privacy-sensitive data under GDPR (Article 4, definition of "personal data" includes online identifiers that relate to an identifiable natural person).

**Legal basis options:**
1. **Legitimate interests (Article 6(1)(f)):** Fraud prevention and security are recognized legitimate interests under GDPR recital 47. The key test is that the legitimate interest is not overridden by the data subject's fundamental rights—security and fraud prevention typically pass this test.
2. **Consent (Article 6(1)(a)):** For non-essential cookies and tracking, explicit consent via cookie banner is required. Fingerprinting for bot detection (security purpose) can be distinguished from fingerprinting for advertising (commercial purpose).

### Data Minimization Implementation

The system applies data minimization throughout:

**Hashing before storage:** Raw canvas pixel arrays, WebGL parameter sets, and audio buffers are never stored. Only their SHA-256 hashes are stored. The hash enables consistent re-identification without storing recoverable behavioral data.

**Signal aggregation before transmission:** Mouse trajectories are aggregated into statistical features (mean velocity, variance) before transmission to the server. Raw (x, y, t) sequences are processed in-browser and immediately discarded after feature extraction.

**Short retention periods:** Session state: 30-minute TTL. Fingerprint records: 1-year TTL (required for long-term bot pattern analysis) with anonymization after 90 days (IP addresses redacted). Raw behavioral event streams: 90-day retention for model training, then deleted.

**Pseudonymization:** Session IDs and fingerprint hashes are secondary identifiers, not directly linked to user accounts unless the user authenticates. Unauthenticated bot detection data is pseudonymous.

### Privacy Impact Assessment Dimensions

| Signal | Privacy Sensitivity | Retention | Minimization Applied |
|---|---|---|---|
| Canvas hash | High (device-unique) | 1 year | Stored as hash only, never raw pixels |
| WebGL renderer string | Medium (GPU-unique) | 1 year | Aggregated with other hardware signals |
| IP address | High (location-sensitive) | 90 days | Redacted from fingerprint record after 90 days |
| Mouse trajectory | High (behavioral biometric) | 30 days | Aggregated to statistics in-browser |
| Keystroke timing | High (biometric) | 30 days | Only inter-key timing, never key identities |
| User-agent string | Low | 30 days | Stored for analysis, no minimization needed |
| TLS fingerprint | Low | 30 days | Technical signal, not user-specific |

### Right to Access and Erasure

GDPR Articles 15 and 17 require providing access to and erasure of personal data:

**Access:** Users can request a report of what fingerprint data is associated with their account (if authenticated). The report includes the fingerprint hash, session count, first/last seen dates, and any bot flags. Raw signals are not stored, so raw data cannot be provided.

**Erasure:** On erasure request, the fingerprint record is deleted from the database and the hash is added to an erasure blocklist. Any future request from a device producing this fingerprint hash will not restore the record; the session starts fresh with no prior history.

**Limitation:** Fingerprint records are not linked to user accounts for unauthenticated sessions. Erasure of unauthenticated fingerprint records requires device-side proof (submitting the fingerprint payload from the device in question), preventing third-party erasure of other users' records.

---

## False Positive Management

### The Cost of False Positives

Every incorrectly challenged or blocked legitimate user represents measurable harm:
- **E-commerce conversion loss:** A challenged user at checkout has a 35-60% abandonment rate
- **Accessibility harm:** Users with disabilities using assistive technology (screen readers, eye-tracking, switch access) produce behavioral signals that can superficially resemble bots
- **Legitimate automation harm:** Test automation, monitoring scripts, and performance testing tools need to operate without triggering bot detection

### Allowlisting Framework

**Tier 1 – Verified Search Engine Crawlers:**
Major search engine crawlers publish signed IP ranges and unique TLS fingerprints. The system maintains a continuously updated allowlist from these published sources and verifies:
1. Request IP matches published crawler IP range
2. User-agent string matches expected crawler UA
3. TLS fingerprint matches known crawler fingerprint
4. DNS reverse lookup of IP matches crawler hostname pattern

All four checks must pass; any mismatch indicates a bot impersonating a crawler.

**Tier 2 – API Key Bypass:**
Customers can provision API keys for their legitimate automation (testing, monitoring). Requests bearing a valid API key in the `X-Bot-Bypass-Key` header bypass all scoring. Keys are:
- Per-customer, per-environment (separate keys for staging vs production)
- Rate-limited to prevent abuse as a bypass mechanism
- Logged for audit purposes
- Rotatable at any time

**Tier 3 – IP Range Allowlisting:**
Customers can allowlist their own monitoring and testing IP ranges. Requests from these ranges are scored but with a strong negative prior (starting score of 0.1 rather than 0.5).

**Tier 4 – Challenge Success Bypass:**
Users who have recently (within last 24 hours) successfully solved a CAPTCHA are issued a long-lived cookie that reduces their starting score to 0.15, ensuring they are not challenged again in the same browsing session.

### Accessibility Accommodations

Assistive technology users produce behavioral signals that can trigger false positives:
- Screen reader users make no mouse movements at all (zero behavioral data → slight bot lean)
- Switch access users make extremely slow, deliberate clicks (could look like bot timing)
- Voice control users produce unusual text entry patterns (dictation speed vs. typing speed)

Accommodations:
1. **Accessibility-first scoring:** Sessions where behavioral data is entirely absent get a lower default bot lean (0.35 instead of 0.40), acknowledging that no-mouse-movement is consistent with assistive technology use
2. **Accessibility mode cookie:** Websites can set an `Accessibility-Mode: 1` cookie or header that reduces behavioral signal weight to near-zero for that session
3. **CAPTCHA accessibility:** Interactive CAPTCHAs must include audio alternatives and must not rely solely on mouse interaction; keyboard-navigable alternatives are required

### False Positive Feedback Loop

```
False Positive Escalation Path:
    User challenged incorrectly
         │
         ↓
    User clicks "I'm not a robot" / appeal link
         │
         ↓
    Appeal Flow:
    1. Present email verification or SMS OTP
    2. If verified: issue human_verified token, unblock session immediately
    3. Record as confirmed false positive: (session_id, fingerprint_hash, timestamp)
         │
         ↓
    Model Retraining Feedback:
    - Confirmed FP sessions added to "human" label set with weight 0.95
    - Features of FP sessions analyzed: which features led to miscalssification?
    - If FP clusters around specific feature: reduce that feature's weight in next training
         │
         ↓
    Threshold Adjustment:
    - If FP rate exceeds SLO (> 0.1% of human traffic): automatically raise
      challenge threshold by 0.05 until FP rate returns to target
    - Alert fires to operations team with FP rate trend data
```

---

## Bot Operator Arms Race Management

### Threat Intelligence Sharing

The detection system integrates external threat intelligence to gain early warning of new bot tooling and attack campaigns:

**IP Reputation Feeds:** Multiple commercial and open-source feeds provide lists of known-malicious IPs, datacenter IP ranges, Tor exit nodes, VPN exit nodes, and residential proxy pools. Feeds are ingested every 15 minutes and merged via union policy (any feed flagging an IP causes action).

**Bot Signature Database:** Crowdsourced database of known bot identifiers: headless browser UA patterns, CDP API signatures, automation framework fingerprints. New signatures are added by participating vendors and deployed within 15 minutes.

**Dark Web Monitoring:** Continuous monitoring of bot-as-a-service marketplaces for new tools claiming to bypass the detection system. When a new tool is announced, it is purchased and analyzed in a sandbox environment, and detection rules for its specific fingerprint are added before it gains wide adoption.

### Adversarial Model Red Teaming

Quarterly red team exercises use commercial bot-as-a-service platforms to attempt to bypass detection:

```
Red Team Protocol:
1. Purchase current top-5 bot services (residential proxy + headless browser farms)
2. Attempt to:
   a. Browse protected endpoints without triggering challenges
   b. Solve CAPTCHAs at scale using human CAPTCHA farms and vision models
   c. Simulate human behavior to evade behavioral analysis
   d. Clone known-good fingerprints to evade fingerprint detection
3. Measure bypass rate: % of bot sessions that complete a target action
   without being challenged
4. Target bypass rate for high-security endpoints: < 2%
5. Document which signals successfully identified the bots
6. Identify any gaps and add new detection signals before next red team
```
