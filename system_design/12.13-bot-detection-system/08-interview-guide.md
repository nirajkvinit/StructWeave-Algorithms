# 08 — Interview Guide: Bot Detection System

## Overview

Bot detection is a rich system design topic that tests candidates on ML system integration, adversarial thinking, real-time processing at scale, and the tension between security and user experience. It is well-suited for senior and staff-level interviews because it has no single "correct" answer—the tradeoffs are real, multi-dimensional, and require synthesis of multiple systems concerns simultaneously.

**Suitable interview tier:** Senior SDE (L5) / Staff SDE (L6)
**Suggested duration:** 45 minutes
**Difficulty:** Hard — requires synthesis of ML systems, distributed systems, and security domain knowledge

---

## 45-Minute Interview Pacing

### Phase 1: Requirements & Scoping (0–8 min)

The interviewer should let the candidate drive requirements gathering. Strong candidates will ask clarifying questions that reveal they understand the key tensions:

**Listen for candidates who ask:**
- "What types of bots are we trying to detect?" (shows understanding of bot taxonomy)
- "What's our false positive tolerance?" (shows awareness of the security-UX tradeoff)
- "Is this for the CDN/edge or origin?" (shows awareness of latency constraints)
- "Do we need to protect against sophisticated residential-proxy bots or mainly simple scripts?" (shows understanding of the adversarial landscape)
- "What's the challenge mechanism when we detect a bot?" (shows they know detection must lead to action)

**Red flags in scoping:**
- Jumping straight to "we'll use IP blocking" without asking about requirements
- Not asking about false positives at all
- Treating this as a pure ML problem without asking about serving architecture

**Candidate prompt if stuck:** "Walk me through what happens from the moment a request arrives at our servers to when you decide it's a bot."

---

### Phase 2: High-Level Design (8–22 min)

Strong candidates will propose a layered architecture without being prompted. Key elements to look for:

**Must include (strong candidate):**
1. Edge evaluation layer — candidates who immediately jump to centralized ML are missing the latency constraint
2. Multiple signal types — behavioral, fingerprint, AND network (not just one)
3. Risk score rather than binary verdict — shows probabilistic thinking
4. Some form of challenge system — shows they understand detection must lead to action
5. Session continuity — shows they understand request-level evaluation is insufficient

**Good but not required (excellent candidate):**
- Two-tier ML architecture (edge + cloud)
- Behavioral signal collection via JavaScript injection
- Session reputation with temporal decay
- Model A/B testing and canary deployment
- Allowlisting for legitimate crawlers

**Interviewer probes during this phase:**

*"Your design checks IP reputation and user-agent. A sophisticated bot can fake both easily. What's your defense?"*
Expected: Candidate moves to fingerprinting, behavioral analysis, JavaScript challenges. Weak candidates will not have a good answer.

*"How do you handle 5 million requests per second?"*
Expected: Candidate recognizes that a centralized ML service cannot serve this without unacceptable latency. Should propose edge evaluation. If candidate proposed centralized scoring, this is the moment to test if they can recognize and correct the problem.

*"What's the latency budget for your detection decision?"*
Expected: < 10ms for most decisions, ideally < 5ms at edge. Candidates should distinguish between the edge decision (must be fast) and the signal collection (can be async).

---

### Phase 3: Deep Dives (22–38 min)

**Choose 2–3 of the following based on candidate strength and role focus:**

#### Deep Dive A: Behavioral Analysis
*"Walk me through exactly how you would detect a bot using mouse movement data."*

Strong answer includes:
- Specific features: velocity distribution, curvature variance, micro-jitter, timing regularity
- Statistical comparison to human population baselines
- Awareness that sophisticated bots now synthesize plausible mouse paths
- Second-order detection: what artifacts remain even in synthesized paths? (too smooth, no timing correlation with page events, no reaction time latency floor)

Weak answer: "Humans move their mouse randomly and bots move straight." (too vague, no actionable features)

#### Deep Dive B: ML Pipeline and Model Management
*"How do you keep your model effective as bots get smarter?"*

Strong answer includes:
- Continuous retraining pipeline (daily or more frequent)
- Label quality challenges: CAPTCHA farms, noisy honeypot signals
- Model rotation to defeat reverse-engineering
- Shadow scoring before production deployment
- Feature drift detection and alerting
- Emergency model rollback capability

Weak answer: "We retrain periodically with new data." (no specifics on label acquisition, deployment safety, or adversarial awareness)

#### Deep Dive C: False Positive Management
*"Your boss tells you that a major enterprise customer called to complain that their employees can't access the checkout page because they're being blocked as bots. Their office uses a single corporate NAT IP. What's your diagnosis and solution?"*

Strong answer:
- Correctly identifies the problem: many sessions from one IP → IP reputation signal fires; no behavioral data yet because sessions are new → neutral prior; fingerprints possibly sparse due to corporate browser management
- Short-term: allowlist the corporate IP range via API key or IP allowlist
- Long-term: reduce weight of IP-based signals for enterprise traffic; improve fingerprint recognition for corporate-managed browsers; add exemption for sessions with valid HTTPS client certificates

Weak answer: Just allowlist the IP. (Correct but incomplete; doesn't address root cause or provide systematic solution)

#### Deep Dive D: Challenge System Design
*"Design the proof-of-work challenge system. What difficulty level do you set, and how do you adjust it dynamically?"*

Strong answer:
- PoW puzzle definition: find nonce such that hash(nonce || seed) has N leading zeros
- Difficulty selection: exponential cost scaling (each extra bit doubles computation)
- At difficulty 18: ~200ms on laptop, 262K hashes → negligible user impact, meaningful bot cost
- Dynamic difficulty: raise difficulty during attack campaigns; lower during normal traffic to preserve UX
- Cost analysis: 1,000 bot sessions at difficulty 18 = 200 core-seconds/sec = sustained cost that makes botting economically unattractive
- Accessibility: PoW is CPU-only so it's accessible to all devices (unlike image CAPTCHAs)

#### Deep Dive E: Fingerprint Evasion and Counter-Detection
*"A bot operator buys an anti-detect browser that spoofs canvas and WebGL fingerprints perfectly. How do you still detect them?"*

Strong answer:
- Timing analysis: software-rendered canvas is either faster (pre-computed) or slower (software renderer) than hardware; measure render time and compare to GPU-specific baseline
- Internal consistency: a "GTX 1080" that renders WebGL at software-renderer speed reveals itself
- WebGPU escalation: real hardware has detailed WebGPU adapter info; anti-detect browsers struggle to fake this consistently
- Cross-session correlation: even perfect per-session fingerprint randomization leaves statistical artifacts across a bot farm's sessions (same generation model → similar trajectory statistics across different IPs)
- Behavioral signals remain: no canvas spoofing defeats the mouse trajectory analysis

---

### Phase 4: Extensions & Edge Cases (38–45 min)

**Pick one or two based on remaining time:**

*"How would you handle a CAPTCHA farm (humans paid to solve CAPTCHAs)?"*
Expected: Behavioral analysis during CAPTCHA solve itself; reaction time to page elements; post-CAPTCHA behavioral signals; economic analysis (CAPTCHA farms cost $1-3/hour of human labor vs. bot value); making CAPTCHAs resistant to being screenshotted-and-outsourced by requiring real-time interaction.

*"How do you detect bot activity on a mobile app, not a website?"*
Expected: No JavaScript injection possible; must rely on SDK integration; mobile-specific signals: accelerometer/gyroscope patterns (real human holding phone vibrates), touch pressure variance, gesture patterns; device attestation (platform-signed certificates asserting unmodified OS); network signals still apply.

*"A competitor is scraping your prices every 5 minutes from different residential IPs with real Chromium browsers. Detect it."*
Expected: This is extremely hard. Session-level patterns within IP: each IP only makes 1-2 requests. But temporal pattern across IPs: requests arrive every 5 minutes on a regular schedule. Cross-IP clustering: all visits go to the same set of product pages. Anomaly: 0 cart additions across thousands of sessions visiting product pages. "Fingerprint" of the scraper visible in HTTP/2 settings or TLS order despite residential IP. This is a population-level signal, not a session-level signal.

---

## Trap Questions and Common Mistakes

### Trap Question 1: "Just use IP blocking"
**Trap:** Candidate relies entirely on IP reputation and blocking as the primary defense.

**Why it's wrong:** Residential proxy networks rotate through millions of legitimate home IP addresses. Blocking by IP has a massive false positive problem (blocking legitimate users sharing an IP with a bot) and zero effectiveness against residential proxy botnets.

**Good candidate response:** IP reputation is one of 100+ signals; it has low weight for residential IPs and higher weight for datacenter IPs. Never used as sole signal.

### Trap Question 2: "Block all headless browsers"
**Trap:** Candidate proposes blocking all requests from headless or automated browsers.

**Why it's wrong:** Legitimate use cases—monitoring tools, search engine crawlers, automated testing, accessibility tools—all use headless or automated browsers. Blanket headless browser blocking is a massive false positive factory.

**Good candidate response:** Headless browser signals are weighted but not deterministic; a headless browser with a valid API key bypass and expected request patterns should not be blocked.

### Trap Question 3: "Use a single centralized ML model"
**Trap:** Candidate proposes one ML model accessed via API call for every request.

**Why it's wrong:** At 5M req/sec, a round-trip to a central API adds 10–50ms per request, which is unacceptable for high-traffic endpoints. The system must be edge-first.

**Good candidate response:** Two-tier model: edge model (in-process at CDN, < 2ms) handles 80% of traffic; cloud deep model handles borderline 20%.

### Trap Question 4: Ignoring False Positives
**Trap:** Candidate designs a system that maximizes bot detection recall without discussing false positive rate.

**Why it's wrong:** Every false positive is a legitimate user blocked, directly costing revenue. A system with 99% recall but 5% false positive rate is unusable for e-commerce.

**Good candidate response:** Model must be calibrated to a specific operating point on the ROC curve; false positive rate SLO (< 0.1% of human traffic) is a hard constraint; challenge system exists as a safety valve.

### Trap Question 5: Static Model
**Trap:** Candidate doesn't discuss how the model evolves as bot operators adapt.

**Why it's wrong:** A static model becomes useless within weeks as bot operators reverse-engineer its signals and adapt. The arms race requires continuous adaptation.

**Good candidate response:** Daily retraining, model rotation, canary features, red team testing, dark web monitoring.

---

## Scoring Rubric

### Strong Hire (L6 Staff)
- [ ] Immediately frames problem as probabilistic scoring, not binary classification
- [ ] Proposes edge-first architecture without prompting
- [ ] Identifies at least 3 signal categories (behavioral, fingerprint, network)
- [ ] Discusses false positive tradeoffs proactively
- [ ] Addresses adversarial adaptation (bot operators evolving to evade detection)
- [ ] Designs a complete ML pipeline: training data, labels, features, serving, monitoring
- [ ] Correctly handles legitimate automation use cases (allowlisting)
- [ ] Proposes meaningful monitoring metrics (FPR, model drift, detection rate by bot type)
- [ ] Can discuss GDPR implications of fingerprinting when asked

### Hire (L5 Senior)
- [ ] Arrives at multi-signal scoring with some prompting
- [ ] Recognizes latency constraint requires edge evaluation (may need a hint)
- [ ] Discusses false positives when prompted
- [ ] Has coherent ML serving design (may miss the two-tier optimization)
- [ ] Can reason through at least one deep dive area with depth
- [ ] Demonstrates adversarial thinking when prompted

### No Hire (L5)
- [ ] Relies primarily on IP blocking or user-agent matching
- [ ] Proposes centralized ML without recognizing latency problem
- [ ] Does not discuss false positives at all
- [ ] Cannot reason about how bots would evade their proposed system
- [ ] Treats it as a pure ML feature engineering problem, ignoring system architecture
- [ ] No discussion of model lifecycle, retraining, or drift

---

## Interviewer Testing Signals

**To test depth on ML serving:**
"Your cloud ML model cluster is at 95% GPU utilization and requests are queuing. What do you do in the next 5 minutes, the next hour, and the next week?"

**To test adversarial thinking:**
"I'm a sophisticated bot operator. I've just bought your challenge-bypass service and I know your system uses behavioral biometrics. How do I beat you, and how do you counter?"

**To test system design fundamentals:**
"Your session store falls over. Walk me through exactly what happens to your system, how you detect it, and what state you're in after recovery."

**To test product thinking:**
"The head of checkout tells you that your bot detection system is costing the company $2M/month in false-positive abandoned carts. What do you do?"

**To test operational maturity:**
"You've just deployed a new model and your on-call alert fires: challenge rate jumped from 2% to 15% in 3 minutes. How do you diagnose and respond?"
