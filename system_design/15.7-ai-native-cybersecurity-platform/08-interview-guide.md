# Interview Guide — AI-Native Cybersecurity Platform

## 45-Minute Interview Pacing

| Phase | Time | Focus | Key Activities |
|-------|------|-------|----------------|
| **Clarification** | 0-5 min | Scope & constraints | Clarify: which sub-system? (EDR, SIEM, SOAR, full platform). Scale: how many endpoints? Confirm: is ML detection in scope? |
| **Requirements** | 5-10 min | Functional & non-functional | Core features, latency targets (detection <1s), false positive constraints, multi-tenancy needs |
| **High-Level Design** | 10-22 min | Architecture & data flow | Draw: collection → ingestion → detection → correlation → response pipeline. Discuss: edge-cloud split, streaming vs. batch, unified schema |
| **Deep Dive** | 22-35 min | Critical component | Pick one: ML detection cascade, behavioral analysis engine, SOAR playbook executor, or alert correlation. Discuss algorithms, trade-offs, failure modes |
| **Scaling & Reliability** | 35-42 min | Production readiness | Scaling ingestion to millions of events/sec, multi-tenant isolation, disaster recovery, detection during cloud outages |
| **Wrap-Up** | 42-45 min | Trade-offs & extensions | Summarize key decisions, discuss what you'd add with more time (threat hunting, compliance, vulnerability management) |

---

## Opening Clarification Questions

Strong candidates ask clarifying questions before designing. Here are the most impactful ones:

| Question | Why It Matters | Expected Insight |
|----------|---------------|------------------|
| "Are we designing the full platform or one sub-system (EDR, SIEM, or SOAR)?" | Scoping prevents a shallow design of everything | Interviewer usually wants the full platform at high level + deep dive on one area |
| "What's the scale — number of endpoints, users, and tenants?" | Determines architectural complexity | Single enterprise vs. MSSP (multi-tenant) have fundamentally different designs |
| "Is AI/ML detection in scope, or signature-based only?" | ML adds significant complexity | If ML is in scope, candidate must discuss model cascade, drift, and false positive management |
| "What detection latency is acceptable for critical threats?" | Drives streaming vs. batch architecture | <1 second mandates streaming; <1 hour allows batch |
| "Should the system work when the endpoint is offline?" | Drives the edge-cloud split decision | Yes → agent must have local detection capabilities |
| "Are automated response actions (isolate, block) in scope?" | Response actions have blast radius concerns | Yes → must discuss approval gates, rollback, and blast-radius control |

---

## Common Approaches and How to Evaluate Them

### Approach 1: "Just Use a SIEM"

**What candidates say:** "We'll collect all logs into a centralized SIEM and write correlation rules."

**Why it's incomplete:**
- SIEM alone cannot perform real-time endpoint detection (it only sees logs, not live processes)
- Rule-based detection cannot catch novel attacks
- No automated response capability
- Query performance degrades dramatically at TB/day scale without careful tiered storage

**Better answer:** SIEM is the log aggregation and correlation layer. It's necessary but not sufficient. The full platform also needs: endpoint agents for real-time telemetry, ML models for novel threat detection, and SOAR for automated response.

### Approach 2: "ML Will Detect Everything"

**What candidates say:** "We'll train a deep learning model on all events and it will detect all threats."

**Why it's dangerous:**
- ML models have false positives — at 0.01% FP rate on 190B events/day, that's 19M false alerts
- ML models are black boxes — analysts cannot understand why an alert fired, eroding trust
- ML models are evadable — attackers who understand the model can craft evasion techniques
- ML models require labeled training data — security labels are expensive and sparse

**Better answer:** Layered detection: rules for known threats (deterministic, explainable), ML for novel threats (probabilistic, higher FP rate), behavioral analysis for insider threats (statistical baseline). Each engine's strengths compensate for the others' weaknesses.

### Approach 3: "Automate Everything with SOAR"

**What candidates say:** "Every alert triggers an automated playbook that remediates immediately."

**Why it's risky:**
- Automated response to false positives causes outages (isolating a production server because of a false alarm)
- Blast radius of automated actions must be controlled
- Attackers can weaponize automated response (trigger the playbook to isolate their target for them)

**Better answer:** Tiered response: high-confidence detections (>0.95) get automated response with blast-radius limits. Medium-confidence detections get automated enrichment + human approval gate. Low-confidence detections get logged for threat hunting.

---

## Trap Questions and Trade-Offs

### Trap 1: "How do you achieve zero false positives?"

**The trap:** Zero false positives is mathematically impossible at scale with probabilistic detection. Any candidate who claims they can achieve it doesn't understand the statistics.

**Expected answer:** "Zero false positives would require only detecting threats with 100% certainty, which means relying only on exact signature matches. This would miss all novel threats. Instead, we manage false positives through: (1) tiered confidence thresholds — only high-confidence alerts trigger automated response; (2) multi-signal corroboration — requiring multiple independent detectors to agree; (3) continuous feedback loop — analyst resolutions feed back into model retraining; (4) alert clustering — reducing 1,000 related alerts to 1 incident."

### Trap 2: "Should detection happen at the edge or in the cloud?"

**The trap:** This is not an either/or choice. A candidate who picks only one has a gap.

**Expected answer:** "Both, with different detection tiers. Edge (agent) provides: local protection during cloud outages, sub-100ms response for critical threats, reduced bandwidth by only forwarding interesting events. Cloud provides: full ML model inference, cross-endpoint correlation, threat intelligence enrichment, behavioral baselines. The split is: known threats at the edge, novel threats in the cloud."

### Trap 3: "How do you handle a sophisticated attacker who controls an endpoint's agent?"

**The trap:** If the attacker controls the endpoint, the agent's telemetry is untrusted. This is a fundamental limitation of endpoint-based detection.

**Expected answer:** "Agent tampering is a meta-security problem. Defenses include: (1) kernel-level self-protection — agent runs as a protected kernel driver that resists user-space tampering; (2) heartbeat monitoring — cloud detects when agent telemetry drops unexpectedly; (3) cross-signal validation — if the endpoint agent reports nothing suspicious but network sensors see C2 traffic from that IP, the inconsistency is itself an alert; (4) attestation — periodic verification that the agent binary hasn't been modified. No defense is perfect — an attacker with full kernel control can eventually evade any agent. Network-level detection is the backstop."

### Trap 4: "How do you keep the ML model from being evaded?"

**The trap:** Any single model can be evaded once the attacker understands its decision boundary.

**Expected answer:** "Model evasion is an arms race. Strategies: (1) model diversity — use an ensemble of different model architectures (gradient boosted trees + neural network + anomaly detector) so evading one doesn't evade all; (2) adversarial training — regularly test models against known evasion techniques and retrain with adversarial examples; (3) feature robustness — prefer behavioral features (what the process does) over surface features (what it's called); (4) behavioral baseline as backstop — even if the ML model is evaded, anomalous behavior relative to the entity's baseline will eventually trigger UEBA; (5) defense in depth — ML is one layer; rules, IOCs, and network detection provide independent coverage."

### Trap 5: "Your SOAR playbook isolates an endpoint — but it's a false positive. The CFO is locked out of their laptop during a board meeting. What now?"

**The trap:** This tests whether the candidate has thought about the blast radius of automated response.

**Expected answer:** "This is why automated isolation requires confidence thresholds and approval gates for high-value assets. Mitigations: (1) asset criticality tags — VIP users (C-suite) require human approval for isolation regardless of confidence; (2) rollback capability — every isolation action records an undo action; the analyst can restore the endpoint in <2 minutes; (3) blast-radius limits — playbooks cap the number of endpoints isolated per incident (e.g., max 5 without manager approval); (4) notification — even automated actions notify the user and helpdesk immediately; (5) post-incident feedback — the false positive feeds back into model tuning to prevent recurrence."

---

## Evaluation Criteria

### Senior Engineer (L5/E5) — Expected

- [ ] Draws a clear pipeline: collection → ingestion → detection → correlation → response
- [ ] Understands the need for a common event schema for cross-domain correlation (XDR)
- [ ] Can explain the difference between rules, ML, and behavioral detection
- [ ] Addresses ingestion scalability with partitioned streaming
- [ ] Mentions false positive management as a key challenge
- [ ] Designs a reasonable SOAR playbook with enrichment and response steps

### Staff Engineer (L6/E6) — Expected (in addition to above)

- [ ] Designs the ML model cascade (bloom filter → fast classifier → deep model)
- [ ] Explains the edge-cloud detection split with clear reasoning for each tier
- [ ] Addresses the false positive / false negative trade-off quantitatively (back-of-envelope for FP rate impact)
- [ ] Designs graph-based alert correlation with kill-chain mapping
- [ ] Discusses model drift monitoring and retraining pipeline
- [ ] Addresses multi-tenancy isolation for MSSP deployment
- [ ] Considers the meta-security problem (securing the security platform)
- [ ] Discusses blast-radius control for automated response

### Principal Engineer (L7/E7) — Distinguishing

- [ ] Addresses the adversarial nature of security ML (evasion-aware feature design)
- [ ] Designs federated cross-region correlation for GDPR compliance
- [ ] Discusses seasonal adjustment in behavioral baselines
- [ ] Considers alert fatigue as a system design problem with quantitative analysis
- [ ] Addresses agent self-protection and attestation
- [ ] Designs the approval gate with escalation and timeout logic
- [ ] Considers the economics of detection (cost per alert, cost per false positive investigation)

---

## Interview Anti-Patterns (Red Flags)

| Anti-Pattern | Why It's a Problem |
|--------------|-------------------|
| "We'll just add more rules" | Rules cannot detect novel attacks; this shows a signature-only mindset |
| "ML will catch everything" | Over-reliance on ML ignores its limitations (black-box, evadable, high FP at scale) |
| "Store everything forever" | Ignores cost (TB/day × 365 days × 7 years = enormous), latency (searching years of data), and compliance (data minimization) |
| "Automate all responses" | Ignores blast radius of false positive automated responses |
| "The agent can't be compromised" | Fails to consider the meta-security problem |
| "One model for all event types" | Different event types (process, network, identity) require different models and features |
| "Real-time detection is always better" | Some attacks (slow-and-low APTs) are undetectable in real-time; batch behavioral analysis is necessary |
| "We don't need to worry about false positives at this scale" | Mathematically wrong — even tiny FP rates produce millions of false alerts at billion-event scale |

---

## Follow-Up Extensions

If time permits, interviewers may ask about:

1. **Threat hunting query language:** How do you design a KQL-like query language that's both powerful and fast over 30 days of data?
2. **Deception technology integration:** How would you integrate honeypots and decoy assets to create high-confidence, zero-false-positive detections?
3. **AI-generated attack narratives:** How would you use LLMs to auto-generate human-readable incident summaries?
4. **Red team simulation:** How would you design continuous automated red-team testing of the detection pipeline?
5. **Cost optimization:** How would you architect tiered storage to keep 7 years of data at <$X/TB/month?
