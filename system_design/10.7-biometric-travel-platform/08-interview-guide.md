# Interview Guide — Biometric Travel Platform

## 1. 45-Minute Pacing Guide

### Phase 1: Requirements Clarification (5 minutes)

**What to establish upfront:**

| Question | Why It Matters |
|---|---|
| "Domestic-only or international flights?" | International adds DTC, immigration e-gates, cross-border credential trust |
| "How many airports and daily passengers?" | 1 airport vs. 50+ airports changes from single-site to federated architecture |
| "Is biometric opt-in or mandatory?" | Opt-in requires parallel manual processing path at every touchpoint |
| "Which touchpoints need biometric support?" | Check-in only vs. full journey (enrollment through boarding) changes scope significantly |
| "What are the regulatory jurisdictions?" | GDPR, India DPDP Act, or both — fundamentally shapes data storage decisions |
| "Is there an existing identity system to integrate with?" | Aadhaar integration, airline DCS, and CUPPS/CUSS compatibility |

**Clarifying questions that impress interviewers:**
- "Should the system support 1:N identification at boarding gates, or is 1:1 verification at every touchpoint sufficient?"
- "Do passengers provide their own device (wallet app) or do we capture everything at airport kiosks?"
- "How do we handle connecting passengers who enrolled at a different airport?"
- "What's the tolerance for false rejects? Is 3% fallback to manual processing acceptable?"
- "Should liveness detection include active challenges, or only passive anti-spoofing?"

### Phase 2: High-Level Architecture (10 minutes)

**Draw these components on the whiteboard:**

1. **Passenger Layer** — Wallet app with secure enclave for biometric template and verifiable credentials
2. **Touchpoint Layer** — Camera + edge compute at each checkpoint (check-in, bag drop, security, immigration, boarding)
3. **Edge Computing Layer** — Local face detection, template extraction, 1:1 matching, liveness detection on dedicated NPU
4. **Core Services** — Organized by domain:
   - Identity domain (matching engine, credential verifier, identity broker)
   - Journey domain (orchestrator, gallery manager, queue manager)
   - Enrollment domain (enrollment service, consent manager, template manager)
   - Integration domain (CUPPS adapter, AODB connector, border control interface)
5. **Trust Layer** — DID resolver, VC verifier, permissioned blockchain for credential anchoring
6. **Data Layer** — Encrypted biometric store (TTL-based), journey event store, consent audit log

**Key narrative:** "The defining architectural decision is where biometric templates live. Unlike traditional centralized biometric databases, this system stores templates on the passenger's device—not in a central database. This is driven by GDPR's special category data requirements and the EDPB's 2024 opinion that only on-device storage is compliant. The consequence is that we need per-flight galleries pre-staged at boarding gates for 1:N matching, an edge-first processing model where matching runs locally at each touchpoint, and a decentralized credential system (W3C Verifiable Credentials) that enables cross-party trust without a central authority."

### Phase 3: Deep Dive (20 minutes)

The interviewer will likely ask you to dive into one of these areas. Be prepared for all:

**Option A: Biometric Matching Pipeline**
- Facial recognition model architecture (ResNet backbone, 512-dim embeddings, L2-normalized)
- Template extraction on edge NPU (~40ms inference)
- 1:1 matching via cosine similarity (threshold tuning: FAR vs. FRR trade-off)
- 1:N gallery matching with uniqueness verification (score gap check)
- Liveness detection: passive multi-modal (texture, depth, moire, reflection, skin color)
- Camera pipeline integrity (PRNU fingerprint, hardware signing) for deepfake defense

**Option B: Decentralized Identity and Credential Verification**
- W3C Verifiable Credentials structure (issuer, subject, proof, revocation)
- DID resolution with multi-level caching (edge cache, airport cache, blockchain resolution)
- Revocation registry design (StatusList2021 bitstring, polled every 30 seconds)
- Selective disclosure via BBS+ signatures (reveal nationality to immigration only)
- Blockchain design: permissioned PBFT, credential hashes only (no PII on-chain)
- Cross-airport credential recognition via federated trust

**Option C: Gallery Management and Touchpoint Orchestration**
- Gallery construction from airline DCS manifest + enrollment database
- Gallery distribution to boarding gate edge nodes (encrypted, pre-staged 90 minutes before departure)
- Incremental gallery updates for late enrollments
- Copy-on-write gallery buffer for concurrent matching + updates
- Journey state machine with valid transition enforcement
- Race conditions: duplicate gallery match, concurrent consent revocation

**Option D: Privacy-by-Design Architecture**
- On-device template storage (EDPB compliance)
- Template lifecycle: creation → encryption → wallet → touchpoint (ephemeral) → deletion
- Consent management with granular per-touchpoint permissions
- Auto-deletion within 24 hours with cryptographic proof
- Audit trail: append-only, hash-chained, HSM-signed, blockchain-anchored
- GDPR data subject rights implementation (access, erasure, portability)

### Phase 4: Trade-offs and Extensions (10 minutes)

**Key trade-offs to discuss proactively:**

| Trade-off | Option A | Option B | Your Recommendation |
|---|---|---|---|
| **Template storage** | Centralized DB (simpler, faster 1:N) | On-device (GDPR compliant, no central target) | On-device with pre-staged flight galleries for 1:N |
| **Matching location** | Cloud GPU cluster (flexible, scalable) | Edge NPU (low latency, offline capable) | Edge-first with cloud fallback; edge handles 95%+ |
| **Credential model** | Centralized identity DB (simpler) | Decentralized VC (multi-party trust) | Decentralized VC; centralized DB doesn't scale to multi-airline |
| **Liveness detection** | Passive only (fast, seamless) | Active + passive (more secure, slower) | Passive for most touchpoints; active for security/immigration |
| **Gallery scope** | Airport-wide gallery (universal 1:N) | Per-flight gallery (bounded 1:N) | Per-flight; airport-wide is too large for edge matching with acceptable FAR |
| **Blockchain** | No blockchain (centralized registry) | Permissioned blockchain (multi-party trust) | Permissioned blockchain for credential anchoring; not needed for templates |
| **Consent model** | All-or-nothing | Per-touchpoint granular | Per-touchpoint; regulatory requirement and better passenger control |

---

## 2. Common Interview Questions

### 2.1 System Design Questions

**Q: "How do you handle a passenger whose face doesn't match at the boarding gate?"**

**Strong answer:**
"The system follows a cascading fallback: First, it re-captures with better quality guidance (different angle, better lighting)—about 30% of failures succeed on retry. If the second attempt fails, it falls back to 1:1 mode: the passenger scans their boarding pass to identify themselves, and the system performs a 1:1 match against their enrolled template from the wallet. If that also fails, the passenger is routed to a manual lane where an agent checks their physical document. Every step is logged with match scores and failure reasons for audit. The key architectural principle is that the manual fallback must be a first-class processing path, not an afterthought—it handles 3-5% of passengers even in a healthy system."

**Q: "How do you build and distribute the gallery for boarding gates?"**

**Strong answer:**
"The Gallery Manager constructs per-flight galleries 90 minutes before departure. It queries the airline DCS for the passenger manifest, resolves which passengers are biometrically enrolled, checks their consent for boarding verification, fetches their encrypted templates, and builds a gallery structure. This gallery is encrypted with the target edge node's transport key and distributed over the airport LAN. At 250 passengers with 5 KB templates, a gallery is about 1.25 MB—trivially small for network transfer.

The critical design decisions are: (1) incremental updates for late enrollments push delta changes to edge nodes instead of full gallery rebuilds, (2) edge nodes use a copy-on-write double buffer so gallery updates don't interfere with active matching, and (3) galleries are auto-purged 30 minutes after departure with cryptographic proof of deletion. If gallery distribution fails, the gate falls back to 1:1 mode—passenger scans boarding pass, then face is matched against their wallet template."

### 2.2 Scale Questions

**Q: "How do you handle 200,000 passengers per day at a major hub?"**

**Strong answer:**
"The key insight is that biometric processing is embarrassingly parallel at the touchpoint level. Each edge node independently handles its own passengers—there's no central bottleneck in the matching pipeline. At 200,000 passengers/day with 70% biometric adoption and 6 touchpoints each, that's 840,000 verifications per day, peaking at about 35/second. With 400+ edge nodes, each handles less than 1 verification every 10 seconds on average.

The cloud services handle lower-volume operations: enrollment (42,000/day kiosk + 98,000/day mobile), gallery management (600 galleries/day), and journey orchestration (140,000 journeys/day). These are stateless services that scale horizontally. The bottleneck, if any, is gallery distribution during flight banks—40 flights departing in 2 hours means 40 galleries built and distributed in rapid succession. I'd stagger gallery builds starting 90 minutes before departure, which naturally spreads the load across the 2-hour window."

**Q: "What happens when an airport loses cloud connectivity?"**

**Strong answer:**
"Edge nodes are designed for autonomous operation. During a cloud outage:

1. **1:1 matching continues** — the template comes from the passenger's wallet via BLE, and matching runs locally on the edge NPU. No cloud dependency.
2. **1:N matching continues** — the gallery was pre-staged on the edge node and persists in local memory. Boarding gates function normally for all flights whose galleries were already distributed.
3. **Credential verification continues** — issuer DID documents and revocation status are cached locally (1-hour and 30-second TTL respectively). During outage, the cache serves stale-but-valid data.
4. **New enrollments pause** — cannot anchor credentials to blockchain. Enrollment requests are queued locally and processed on reconnection.
5. **Journey orchestration runs locally** — events are buffered and replayed when cloud reconnects.

The critical gap is revocation freshness: if someone's credential is revoked during the outage, edge nodes won't learn about it until connectivity restores. For short outages (< 1 hour), the 30-minute polling window means the stale cache is acceptable. For longer outages, I'd log a 'stale_revocation_check' flag on all verifications during the outage period for post-hoc audit."

### 2.3 Trade-off Questions

**Q: "Why not store biometric templates in a centralized database? It would make 1:N matching simpler."**

**Strong answer:**
"A centralized biometric database creates three fundamental problems: (1) It's a honeypot—a single breach exposes millions of irrevocable biometric templates. Unlike passwords, you can't reset someone's face. (2) GDPR's EDPB Opinion 11/2024 explicitly states that centralized storage without passenger-held encryption keys is non-compliant for airport biometrics. (3) It creates a single point of failure—if the central DB is down, no biometric processing works.

On-device storage eliminates the honeypot (no central target), satisfies GDPR by design (data in passenger's hands), and enables edge processing (no DB dependency). The trade-off is that 1:N matching requires pre-staged flight galleries instead of a simple gallery lookup. But since flight galleries are small (250-5,000 templates, 1.25-25 MB), distributing them to edge nodes is trivially easy compared to the architectural and regulatory risks of a centralized database."

**Q: "How do you handle the FAR vs. FRR trade-off in threshold selection?"**

**Strong answer:**
"This is an asymmetric risk problem. A false accept (wrong person passes through) is a security catastrophe—it could mean unauthorized boarding. A false reject (right person rejected) is an inconvenience—the passenger falls back to manual processing with a 30-second delay.

I tune the threshold to make false accepts astronomically rare: at our 0.68 threshold, FAR is 0.001% (1 in 100,000). This means FRR is about 0.5%—roughly 1 in 200 legitimate passengers gets rejected and falls back to manual. At 140,000 biometric passengers/day, that's 700 manual fallbacks per day, or about 1 per 2 minutes per airport—easily absorbed by staffed manual lanes.

The threshold is not static—it can be adjusted per touchpoint. Security checkpoints use a higher threshold (more conservative) because false accepts there are most dangerous. Check-in and bag drop can use a slightly lower threshold because the security consequence of a false accept at check-in is lower."

---

## 3. Trap Questions and Common Mistakes

### 3.1 Trap Questions

**Trap: "Can we use a centralized biometric database and just encrypt it?"**

**Why it's a trap:** Tests understanding of GDPR special category data and the EDPB opinion.

**Correct response:** "Encryption alone doesn't satisfy GDPR for biometric data. The EDPB's 2024 opinion specifically addresses this: a centralized database encrypted with keys held by the airport operator is non-compliant because the operator can decrypt at will. Only two architectures are compliant: (1) on-device storage, or (2) centralized storage where the encryption key is solely in the passenger's hands. We use option (1) because it's simpler—the passenger's wallet secure enclave stores the template, and no centralized database exists to breach."

**Trap: "Why not just use fingerprints instead of facial recognition?"**

**Why it's a trap:** Tests understanding of contactless processing and touchpoint design constraints.

**Correct response:** "Facial recognition has three advantages for airport touchpoints: (1) It's contactless—critical for throughput (no touching a scanner) and hygiene. (2) It enables passive identification at boarding gates—the camera identifies the passenger as they walk up, without requiring them to actively present a biometric. Fingerprint requires conscious interaction. (3) It matches the enrollment photo already available from passports (ICAO 9303 mandates a facial image). The trade-off is that facial recognition is more affected by environmental conditions (lighting, pose) and has higher demographic bias risk than fingerprint. For high-security touchpoints (immigration), multi-modal (face + fingerprint) provides the best accuracy."

**Trap: "Why not use a public blockchain for credential anchoring?"**

**Why it's a trap:** Tests understanding of blockchain trade-offs and regulatory constraints.

**Correct response:** "Public blockchains have three disqualifying characteristics: (1) Latency: public chain confirmation takes minutes to hours; we need < 2 seconds for real-time credential issuance. (2) Privacy: even with only hashes on-chain, transaction metadata on public chains can be correlated with passenger travel patterns. (3) Governance: airport and airline regulators need control over who participates as validators. A permissioned PBFT blockchain with 7 trusted validators gives us sub-second finality, controlled participation, and no public exposure of transaction patterns."

**Trap: "Can we just use the airline's existing passenger database instead of verifiable credentials?"**

**Why it's a trap:** Tests understanding of multi-party trust in aviation.

**Correct response:** "The airline database only works within that airline's ecosystem. A connecting passenger going from Airline A to Airline B would need to re-enroll because Airline B doesn't trust Airline A's database. With verifiable credentials, the enrollment authority signs a credential that any verifier can independently validate using the issuer's public key—no database access needed, no airline-to-airline trust required. This is the core value of decentralized identity: it creates trust between parties that don't have a direct relationship."

### 3.2 Common Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Centralized biometric database | GDPR non-compliant; honeypot target | On-device storage with pre-staged flight galleries |
| Ignoring manual fallback | Regulatory requirement; 3-5% of passengers need it | Design manual path as first-class with equal operational support |
| Airport-wide 1:N gallery | 100K+ gallery destroys FAR performance | Per-flight galleries (250-5K) keep FAR within acceptable bounds |
| Cloud-only matching | Adds 100-200ms latency; fails during cloud outage | Edge-first matching with cloud fallback |
| Ignoring liveness detection | Presentation attacks are the primary threat | Multi-modal passive liveness at every touchpoint |
| Storing images instead of templates | Massive storage; privacy violation; not needed for matching | Extract and store 512-dim template only; discard image after extraction |
| Single match threshold for all touchpoints | Different touchpoints have different security requirements | Per-touchpoint threshold tuning (higher for security, standard for check-in) |
| Ignoring template deletion | Compliance violation; templates are the most sensitive data | Auto-deletion with TTL indexes and cryptographic deletion proofs |
| No demographic bias monitoring | Legal and ethical liability | Continuous demographic equity monitoring with < 2% variance target |
| Treating blockchain as biometric storage | PII on blockchain violates right-to-erasure | Only credential hashes on-chain; no PII |

---

## 4. Interview Scoring Rubric

### 4.1 What Strong Candidates Demonstrate

| Signal | Evidence | Level |
|---|---|---|
| **Privacy-by-design thinking** | Immediately identifies biometric data sensitivity; proposes on-device storage | Staff |
| **Decentralized identity knowledge** | Discusses W3C VCs, DIDs, selective disclosure without prompting | Staff |
| **Edge computing architecture** | Designs for local processing at touchpoints; considers offline operation | Senior+ |
| **Biometric accuracy metrics** | Uses TAR, FAR, FRR correctly; understands threshold trade-offs | Senior+ |
| **GDPR biometric data awareness** | Mentions Article 9, EDPB opinion, special category data requirements | Staff |
| **Anti-spoofing awareness** | Discusses presentation attacks, liveness detection, deepfake threats | Senior+ |
| **Scale reasoning** | Back-of-envelope: 200K passengers x 6 touchpoints = 1.2M verifications/day | Senior |
| **Gallery management** | Designs per-flight gallery lifecycle (build, distribute, update, purge) | Senior+ |
| **Consent-driven architecture** | Recognizes opt-in requirement; designs parallel biometric + manual paths | Senior |
| **Asymmetric error analysis** | Correctly prioritizes FAR << FRR due to security implications | Senior |

### 4.2 Red Flags

| Red Flag | What It Suggests |
|---|---|
| "Store all biometric data in a central database" | Doesn't understand biometric data sensitivity or GDPR |
| "Use cloud GPUs for all matching" | Ignoring latency requirements and offline operation needs |
| "Airport-wide gallery for 1:N matching" | Doesn't understand FAR scaling with gallery size |
| "No need for liveness detection" | Missing the primary threat vector for biometric systems |
| "Same threshold everywhere" | Doesn't understand per-touchpoint security requirements |
| "Blockchain for biometric storage" | Confusing credential anchoring with data storage |
| "Skip the manual fallback" | Ignoring regulatory requirements and edge cases |
| No mention of data deletion or retention | Missing privacy and compliance fundamentals |
| No mention of false accept/reject rates | Missing the core biometric system trade-off |

---

## 5. Extension Scenarios

If time permits or the interviewer asks for extensions:

### 5.1 International Travel with DTC

- ICAO Digital Travel Credential for cross-border identity
- Pre-clearance with destination country immigration
- Cross-border credential trust (bilateral agreements)
- Data residency: templates never leave country of enrollment
- Immigration e-gates with multi-modal biometric (face + fingerprint + iris)

### 5.2 Multi-Modal Transportation

- Extend biometric identity to train stations, ferry terminals
- Unified credential across air, rail, and maritime
- Intermodal transfer verification at hub stations
- Different throughput requirements (train: 2,000 passengers in 5 minutes vs. flight: 250 in 30 minutes)

### 5.3 Retail and Lounge Integration

- Biometric payment at airport retail (face-as-payment)
- Lounge access verification via biometric
- Duty-free purchase authorization (international departure verified biometrically)
- Requires additional consent scope and separate credential for payment

### 5.4 Post-Pandemic Health Credential Integration

- Vaccination status as verifiable credential
- Health declaration binding to biometric identity
- Selective disclosure: "vaccinated: yes" without revealing vaccine type or date
- Integration with destination country health requirements

---

*Next: [Insights ->](./09-insights.md)*
