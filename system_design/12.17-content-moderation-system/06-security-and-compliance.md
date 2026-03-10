# 12.17 Content Moderation System — Security & Compliance

## Reviewer Safety and Wellness Architecture

### The Psychological Burden Problem

Content moderators—particularly those reviewing CSAM, graphic violence, and terrorism content—experience well-documented psychological harm including secondary traumatic stress, vicarious trauma, and burnout. Platform operators have both a moral obligation and an operational incentive (turnover is extremely costly in terms of training, certification, and quality ramp-up) to protect reviewer wellness. The system embeds wellness constraints directly into the moderation infrastructure rather than treating them as HR policies enforced manually.

### Exposure Caps and Category-Based Controls

The reviewer data model carries per-reviewer, per-category daily caps that are enforced at the assignment layer:

```
CSAM exposure limits:
  Daily cap: 20 confirmed CSAM items maximum per reviewer
  Consecutive cap: 5 CSAM items without a mandatory 15-minute break
  Weekly cap: 80 CSAM items; above this threshold reviewer is placed on rest rotation

Graphic violence:
  Daily cap: 50 items; consecutive cap: 10 items

General harmful content (hate speech, self-harm):
  No hard cap; monitored via wellness check-in responses

All limits are configurable per-reviewer (some reviewers have clinical training
and voluntarily accept higher limits with appropriate support structures).
```

When a reviewer reaches their daily cap for a category, the reviewer assignment algorithm marks that category as unavailable for that reviewer for the remainder of their shift. The system automatically routes that reviewer to lower-harm categories.

### Graduated Content Presentation

Harmful content is never presented to reviewers at full resolution without explicit action:

| Content Category | Default Presentation | Reviewer Action to Reveal |
|---|---|---|
| CSAM | Maximum blur (pixelated beyond recognition) | Supervisor-approved reveal with logged justification |
| Graphic violence | Moderate blur | Single click to de-blur; logged |
| NSFW (adult) | Low blur | Hover to reveal; not logged |
| Text (hate speech, threats) | Full text displayed | N/A |

CSAM images are never stored in human-readable form on the moderation platform. The system stores only the perceptual hash and a reference to the forensic archive. When a reviewer must view CSAM to make a determination (rare; typically only for novel content not matching known hashes), access requires multi-party authorization (reviewer + supervisor both authenticated), is logged in the audit trail with timestamp, reviewer ID, and business justification, and is reviewed by the wellness program within 24 hours.

### Wellness Monitoring and Intervention System

The wellness monitoring component runs continuous passive and active monitoring:

**Passive signals:**
- Review speed changes (unusual slowing may indicate distress; unusual speeding may indicate inattention)
- Decision pattern shifts (unusual increase in reversals may indicate decision fatigue)
- Intra-shift break patterns (skipping breaks is an early stress indicator)

**Active check-ins:**
- Automated wellness check-in prompts after every 30 consecutive harmful items
- Mandatory check-in at shift midpoint for CSAM-category reviewers
- Daily end-of-shift wellness questionnaire (brief; 3 questions; responses trigger support referral if thresholds exceeded)

**Intervention triggers:**
- `CHECK_IN_NEEDED`: Prompt appears in workstation; reviewer responds before next item loads
- `MANDATORY_BREAK`: Workstation locks for 15 minutes; reviewer cannot review items
- `REFERRED`: Wellness flag escalated to supervisor; reviewer moved to administrative tasks; EAP referral initiated

All wellness data is stored separately from moderation decision data with restricted access (HR and wellness program only; not accessible to quality assurance or legal teams without explicit consent).

---

## Adversarial Content Detection

### Taxonomy of Adversarial Techniques

Sophisticated bad actors employ a range of techniques to evade content moderation:

**Text obfuscation:**
- *Leetspeak and symbol substitution*: h@te, h4te, h8e
- *Unicode homoglyphs*: Using Cyrillic, Greek, or other character sets that look visually identical to Latin characters
- *Zero-width character injection*: Inserting invisible characters to break keyword matching
- *Intentional misspellings*: "t3rrorist", "kiddie p0rn"
- *Language mixing*: Switching between languages mid-sentence to confuse monolingual models
- *Euphemism and dog whistles*: Community-specific coded language that is opaque to classifiers without cultural context

**Image and video evasion:**
- *Minor perturbations*: Small pixel-level changes that exploit model decision boundaries (adversarial examples)
- *Steganographic embedding*: Hiding harmful content within seemingly benign carrier images
- *Color space manipulation*: Transforming images to non-standard color spaces that confuse perceptual hash algorithms
- *Composite overlays*: Overlaying CSAM thumbnails within complex scenes that hide from frame-level classifiers

**Coordinated inauthentic behavior:**
- *Report bombing*: Coordinated false user reports targeting legitimate content
- *Engagement manipulation*: Using bots to amplify borderline content before moderation catches it
- *Account cycling*: Creating new accounts to evade account-level suspensions

### Defense Mechanisms

**Text normalization pipeline** (described in deep-dive): Applied before every classifier invocation; continuously updated with new obfuscation patterns identified by the adversarial signal team.

**Ensemble model robustness**: Using an ensemble of diverse model architectures (transformer + gradient boosting + LLM) reduces the effectiveness of adversarial examples designed to fool a single model architecture. Gradient-based adversarial examples that fool BERT may not fool XGBoost features.

**Perceptual hash robustness**: PhotoDNA and PDQ are specifically designed to resist common image transformations. Robustness testing (published 2024-2025) shows these algorithms maintain high true positive rates against crop, resize, recompress, and moderate color manipulation. Severely perturbed images that evade hash matching are typically caught by ML image classifiers.

**Coordinated behavior detection**: The account trust scoring system (external to the moderation pipeline but informing it) uses graph analysis to detect accounts with unusual amplification patterns, coordinated posting times, and shared infrastructure signals. High coordinated-behavior-risk accounts receive lower trust scores, which increases their content's priority in the review queue.

**Cross-platform signal sharing**: The system consumes adversarial signal feeds from the Global Internet Forum to Counter Terrorism (GIFCT) and the Technology Coalition, which aggregate adversarial technique reports from multiple platforms. New evasion patterns identified on one platform are shared as hash updates and policy rule updates that apply across member platforms within hours.

---

## DSA Compliance Architecture

### Transparency Database Integration

The EU Digital Services Act Transparency Database requires platforms to submit a *statement of reasons* for every content removal. As of the July 2025 implementing regulation, submissions must use standardized machine-readable templates covering:

- Content category and subcategory (standardized taxonomy)
- Legal ground for removal (specific DSA article or national law)
- Territorial scope of removal (geo-restricted vs. global)
- Date and time of detection and removal
- Whether the decision was automated, human, or hybrid
- Whether the account received prior warning

The system generates DSA submission records automatically for every enforcement action tagged with a DSA-applicable policy rule. These records are batched and submitted to the DSA Transparency Database via its regulatory API within 24 hours of the enforcement action.

### Transparency Reports

Public quarterly transparency reports aggregate moderation activity across all DSA-regulated surfaces. The system's reporting module generates these reports from the audit log, covering:

- Total content items actioned by category
- Automation rate (automated vs. human decisions)
- Appeals received, resolved by tier, overturned rate
- Reviewer headcount and throughput
- False positive rate estimates (derived from appeals outcomes and calibration audits)
- SLA compliance rates

Reports are published in both human-readable PDF format and machine-readable JSON format. The JSON schema is versioned to allow external researchers and civil society organizations to process reports programmatically.

### NetzDG 24-Hour Removal SLA

German law requires removal of clearly illegal content within 24 hours of receiving a valid complaint. The system implements NetzDG compliance through:

1. **Complaint intake tagging**: All user reports originating from German users (or reports explicitly tagged as NetzDG complaints) receive a geo-scope tag in the report record
2. **SLA calculation**: NetzDG-tagged items have their SLA deadline set to 24 hours from complaint receipt
3. **Priority boosting**: NetzDG items receive an automatic priority boost in the review queue proportional to elapsed SLA fraction
4. **SLA breach prevention**: When NetzDG items reach 80% of their SLA window unresolved, an escalation alert fires; reviewer managers are notified and emergency assignment occurs
5. **Compliance logging**: Every NetzDG-relevant decision is logged with complaint receipt timestamp, decision timestamp, and delta for audit purposes

---

## NCMEC Reporting Architecture

### Mandatory CyberTipline Reporting

Platforms in applicable jurisdictions are legally required to report confirmed CSAM to the National Center for Missing and Exploited Children (NCMEC) via the CyberTipline API within 24 hours of detection. The system automates this process:

```
CSAM confirmed detection flow:
  1. Hash match against NCMEC or Technology Coalition hash DB → CSAM_CONFIRMED signal
  2. Action Executor: REMOVE content immediately (does not wait for human review)
  3. NCMEC Filer service queued with:
     - Platform content identifier
     - User account identifier (encrypted)
     - Detection timestamp
     - Perceptual hash(es) matched
     - Hash database source
     - Content type metadata
     - IP address and device metadata (if available and legally permissible)
  4. NCMEC API submission within 60 seconds of detection
  5. CyberTipline report ID stored in moderation_decision record
  6. Content preserved in forensic archive (not deleted until NCMEC/law enforcement
     confirms it is no longer needed as evidence)
```

### Forensic Preservation vs. Data Minimization Tension

A critical design tension: GDPR and similar privacy regulations require data minimization—platforms should not retain user data longer than necessary. But NCMEC reporting and law enforcement investigations require preservation of evidence for potentially months or years. The system resolves this tension through a forensic hold mechanism:

- When NCMEC-reportable content is detected, a forensic hold is placed on all associated data (content, metadata, account data)
- The hold prevents normal data deletion routines from operating on this data
- Holds are reviewed quarterly; data is released when the investigation is closed or the hold period expires under applicable law
- All holds are logged in the audit trail with legal basis, expiry date, and any law enforcement requests

---

## Access Control and Data Security

### Role-Based Access Control

| Role | Access Level | Restrictions |
|---|---|---|
| Standard Reviewer | Can view assigned content items; submit decisions | Cannot view CSAM unblurred; cannot access other reviewers' items |
| CSAM-Cleared Reviewer | Can view CSAM (blurred by default); submit CSAM decisions | Subject to exposure caps; access logged |
| Senior Reviewer | Can view any content item; access appeals queue | Cannot modify audit log |
| Reviewer Manager | Access to reviewer performance data; queue management | Cannot view reviewer wellness data |
| Policy Administrator | Can create and modify policy rules | Changes require dual approval; logged |
| Compliance Officer | Read access to transparency reports and audit log | Cannot trigger enforcement actions |
| Forensic Investigator | Access to forensic archive under multi-party authorization | Every access logged with justification |

### Audit Log Integrity

The audit log uses cryptographic chaining to provide tamper evidence. Each log entry contains:
- SHA-256 hash of the previous entry's content
- Entry content (decision details, action details)
- Timestamp (from a trusted time source)
- Entry-level HMAC signed with a hardware security module (managed HSM)

To verify log integrity, auditors run a chain verification tool that re-computes hashes from entry N onward and compares to stored values. Any modification of a historical entry breaks the chain at that point.

### Encryption Strategy

| Data | At Rest | In Transit |
|---|---|---|
| Content items | AES-256 via object storage server-side encryption | TLS 1.3 |
| Perceptual hashes (sensitive) | AES-256; key managed by managed KMS with HSM backing | TLS 1.3 |
| Reviewer notes | AES-256 with reviewer-specific key derivation | TLS 1.3 |
| Wellness data | AES-256; separate key hierarchy from moderation data | TLS 1.3 |
| Audit log | AES-256; HMAC-signed entries | TLS 1.3 |
| Forensic archive | AES-256; keys escrowed with legal team | TLS 1.3; SFTP for law enforcement transfers |
