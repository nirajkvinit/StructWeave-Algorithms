# 12.17 Content Moderation System — Interview Guide

## Overview

Designing a content moderation system is a senior/staff-level system design question that tests breadth across ML systems, distributed queuing, human-in-the-loop design, regulatory compliance, and adversarial thinking. It is rarely purely a throughput or latency question—interviewers are looking for candidates who understand that the hardest problems are definitional (what counts as a violation?) and operational (how do you manage human reviewer throughput and wellness at scale?), not just architectural.

**Typical time allocation:** 45–55 minutes

---

## 45-Minute Interview Pacing

| Phase | Time | Focus |
|---|---|---|
| Requirements clarification | 5–7 min | Modalities, scale, pre-pub vs. post-pub, jurisdictions |
| Back-of-envelope estimation | 5–7 min | Items/sec, GPU fleet, reviewer headcount, storage |
| High-level architecture | 8–10 min | Ingest → classify → policy → review → enforce → appeals |
| Deep dive (interviewer-directed) | 12–15 min | ML pipeline OR review queue OR compliance |
| Extensions and trade-offs | 5–7 min | Adversarial robustness, LLM moderation, DSA compliance |
| Wrap-up and questions | 2–3 min | |

---

## Opening Phase: Requirements Clarification

### Questions the Candidate Should Ask

**Scope and modalities:**
- "Which content types are in scope? Text only, or also image, video, and audio?"
- "Is this pre-publication screening (blocking before content goes live) or post-publication scanning, or both?"

**Scale:**
- "What's the expected content volume? Daily active users and average content creation rate?"
- "What's the peak-to-average ratio? Is there event-driven spikiness?"

**Regulatory context:**
- "Are we building for a specific jurisdiction, or globally? Are EU DSA and NetzDG compliance requirements in scope?"
- "Do we need NCMEC CSAM reporting integration?"

**Human review:**
- "Is there a human review component, or is this purely automated?"
- "What's the acceptable false positive rate? Is the cost of over-moderation or under-moderation more tolerable?"

**Appeals:**
- "Should the system include a user-facing appeals mechanism?"

### Strong Candidate Signal
A strong candidate immediately asks about the false positive / false negative trade-off and frames it as a core architectural constraint, not an afterthought. They recognize that this trade-off is different for different categories (CSAM: near-zero false negatives tolerated; spam: higher false positives tolerable).

---

## Deep Dive Phase: Common Interviewer Probes

### Deep Dive 1: ML Classification Architecture

**Interviewer prompt:** "Walk me through how you'd design the ML classification pipeline for a video containing both audio and visual content."

**Strong response covers:**
- Parallel, asynchronous extraction: frame sampling for visual, STT for audio, OCR for any text overlays
- Ensemble of specialized models per modality rather than a single general model
- Early-exit on hash match (avoids expensive inference for known-bad content)
- Score aggregation with calibrated confidence, not raw logit averaging
- Confidence-zone routing: auto-action, human review, or allow-with-audit
- LLM-based contextual classification for edge cases (policy-as-prompt)
- Adversarial normalization before text passes to classifiers

**Trap question:** "Why not just use one big multimodal LLM for everything?"

**Expected answer:** Latency, cost, and recall. A single LLM call for a 10-minute video would be extremely slow and expensive. Specialized models are faster and often more accurate within their domain. The LLM is valuable as a fallback for contextually ambiguous text, not as the primary classifier for all modalities.

### Deep Dive 2: Human Review Queue Design

**Interviewer prompt:** "How do you ensure that the most harmful content gets reviewed first, while still respecting reviewer wellness constraints?"

**Strong response covers:**
- Priority scoring function: composite model score × tier weight × viral velocity × SLA urgency
- Queue partitioning: by content type, by severity tier, by geo/language shard
- Skill-based reviewer assignment (language certification, CSAM clearance, specialization)
- SLA deadline tracking and burn-rate alerting
- Wellness constraints embedded in the assignment algorithm (exposure caps, consecutive harmful items cap)
- Mandatory break enforcement: workstation-level lock, not just policy
- Inter-rater reliability monitoring via calibration item injection

**Trap question:** "Can't you just pay more reviewers and throw headcount at the problem?"

**Expected answer:** Headcount is necessary but insufficient. Reviewer quality degrades under fatigue and under-calibration. Hiring more reviewers without inter-rater reliability monitoring just produces noisier, lower-quality decisions at higher cost. The queue design must match the right reviewer to the right task at the right load level—headcount is a capacity lever, not a quality lever.

### Deep Dive 3: Compliance and Appeals

**Interviewer prompt:** "How would you architect the system to comply with the EU Digital Services Act, specifically the transparency reporting and appeals requirements?"

**Strong response covers:**
- DSA Transparency Database: every content removal generates a machine-readable statement of reasons; submitted within 24 hours
- Transparency reports: quarterly, aggregated statistics by category, automation rate, appeal outcomes
- Internal complaint mechanism: multi-tier appeals (automated re-review → senior reviewer → expert panel)
- Out-of-court dispute settlement: system must track and report on OCSDS referrals
- Immutable audit log as the source of truth for all appeal adjudication
- NetzDG 24-hour SLA for German illegal content: priority-boosted queue routing
- Geo-specific policy engine variants for different regulatory jurisdictions

**Trap question:** "The DSA requires 24-hour removal for illegal content. What if the ML model isn't confident? Do you remove first and review later, or review first and risk missing the SLA?"

**Expected answer:** This is a genuine policy decision, not just an engineering one. The engineering system should support either approach based on policy configuration. For most categories, the right answer is: remove immediately if the ML score exceeds a lower threshold (not the standard auto-action threshold) and trigger expedited human review. If the human review reverses the removal, reinstate and log the reinstatement. The cost of a temporary false positive for 24 hours is lower than the cost of missing a CSAM or terrorism SLA.

---

## Extension Questions

### Extension 1: Adversarial Robustness

"How would you handle adversarial users who intentionally craft text to evade your classifiers?"

Good answer covers:
- Text normalization pipeline (Unicode, leetspeak, homoglyphs, invisible characters)
- Ensemble diversity (multiple architectures reduce adversarial transferability)
- Account trust scoring (repeated near-misses on the same account increase account risk score)
- Cross-platform signal sharing (GIFCT, Technology Coalition)
- Online model updates with short deployment cycles for adversarial patches
- LLM-based semantic classification as a hard-to-evade fallback (understands intent, not just token patterns)

### Extension 2: LLM-Based Moderation

"Could you replace your entire ensemble with a single large language model?"

Good answer covers:
- Latency: LLMs are 100-500ms per call; fine-tuned specialized models are 10-50ms; LLMs are viable for edge cases but not primary classification at scale
- Cost: LLM inference is 10-100× more expensive than specialized model inference
- Recall: LLMs can be distracted by well-crafted prompts (jailbreaking); specialized models are harder to prompt-inject
- Explainability: LLM decisions are harder to audit than specialized model decisions with score vectors
- Appropriate use: LLM as policy-as-prompt fallback for contextually ambiguous edge cases; not as primary classifier

### Extension 3: Cold Start for New Content Categories

"A new type of harmful content emerges (e.g., AI-generated deepfake impersonation). How do you handle a category the system has never seen before?"

Good answer covers:
- Bootstrap with LLM-based classification (no training data needed; uses natural language policy)
- Route all near-threshold items to human review initially (high human review rate until training data accumulates)
- Rapid labeling pipeline: human reviewer decisions become training data for specialized model
- Model trained on initial labels deployed as "v1" classifier with conservative thresholds
- Progressively shift from LLM fallback to specialized model as model confidence improves
- Adversarial testing of new model before full deployment

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---|---|---|
| Designing only for text content | Video is the dominant safety risk and the hardest engineering problem | Explicitly address multi-modal pipeline from the start |
| Treating human review as optional or secondary | Human review is a legal requirement in many jurisdictions and a quality gate for all systems | Design human review queue as a first-class infrastructure component |
| Not asking about false positive vs. false negative trade-off | Optimal thresholds differ dramatically by category | Ask the interviewer; state the trade-off explicitly |
| Ignoring regulatory requirements | DSA, NetzDG, NCMEC reporting are specific engineering constraints | Acknowledge these as shaping the design, not add-ons |
| Using a single global model for all languages and cultures | Models trained primarily on English data perform poorly on other languages | Multilingual models or per-language models; language-specific reviewer pools |
| Not addressing reviewer wellness | Platforms have faced lawsuits over reviewer harm | Wellness constraints must be embedded in the system architecture |
| Proposing LLM-only moderation | Latency and cost prohibitive at scale | LLM as contextual fallback, not primary classifier |
| No adversarial thinking | The system faces active, intelligent adversaries | Address obfuscation normalization, adversarial robustness, and cross-platform sharing |

---

## Scoring Rubric

### Basic (passing score)
- Identifies multi-modal content types and their different challenges
- Designs a basic pipeline: ingest → classify → action
- Proposes human review queue for uncertain items
- Mentions latency and throughput requirements

### Intermediate (strong hire)
- Designs ensemble classification with confidence-gated routing
- Addresses hash matching for known-bad content
- Designs priority-weighted review queue with SLA management
- Addresses appeals workflow at least at a high level
- Mentions regulatory compliance requirements

### Advanced (exceptional hire / staff)
- Policy engine as a hot-reloadable, separate layer from ML classification
- Inter-rater reliability monitoring and calibration injection for reviewer quality
- Reviewer wellness constraints embedded in assignment algorithm
- DSA compliance architecture with transparency database integration
- Adversarial normalization and cross-platform signal sharing
- Graceful degradation modes during ML outage or content surge
- LLM fallback with policy-as-prompt for contextual edge cases
- Predicts bottlenecks (video throughput, reviewer headcount elasticity) proactively

### Signals of Exceptional Depth
- Unprompted discussion of hash database sensitivity (hashes treated as sensitive material, not just content)
- Recognizes the GDPR vs. evidence preservation tension for CSAM forensic holds
- Frames the false positive / false negative trade-off as a policy decision with engineering support, not a purely technical question
- Proposes continuous precision/recall measurement via calibration item injection, not just post-hoc audit

---

## Interviewer Testing Signals

Use these prompts to test specific depth:

| Test | Prompt |
|---|---|
| Policy vs. model separation | "What happens when a new regulation requires you to change your hate speech policy?" |
| Reviewer wellness understanding | "What happens when a reviewer hits their daily CSAM exposure cap mid-shift?" |
| Adversarial awareness | "A bad actor copies the exact wording of an allowed academic article to disguise hate speech. How does your system catch this?" |
| Regulatory depth | "Walk me through what happens when a German user reports content as violating NetzDG." |
| Appeals design | "An automated decision is appealed. The model is run again and produces the same result. Should the appeal be upheld or overturned?" |
| Surge handling | "Your GPU inference fleet fails at peak traffic on New Year's Eve. What does the system do?" |
