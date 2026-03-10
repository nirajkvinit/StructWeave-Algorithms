# Insights — Bot Detection System

## Insight 1: Behavioral Biometrics are the Last Line of Defense in the Arms Race

**Category:** Security

**One-liner:** Mouse dynamics, keystroke timing, and scroll entropy are the signals that bot operators find most expensive to synthesize convincingly.

**Why it matters:** IP reputation, device fingerprinting, and even JavaScript environment probes have all been commoditized by the anti-detect browser industry—a bot operator can purchase a service that spoofs canvas hashes, WebGL renderer strings, and navigator properties with plausible values in minutes. Behavioral biometrics, however, require generating synthetic human-like interaction that passes statistical scrutiny at a per-session level while remaining economically feasible to produce at scale.

Generating convincing synthesized mouse trajectories requires training neural networks on large corpuses of real human interaction data, then running those models for every session in real time. At 1,000 concurrent bot sessions, this neural behavioral synthesis consumes significant compute. More critically, the synthesized behaviors still leave second-order artifacts: the variance of curvature in synthesized paths is slightly too low (generative models optimize for plausibility, not natural randomness); the timing correlation between mouse movement and on-page content changes is absent (real humans pause when reading, bots don't); and across a bot farm's session population, the trajectories show anomalously low statistical diversity (they all come from the same generative model).

This means behavioral signals must be evaluated not just at the session level but at the population level: detecting that a cluster of sessions from different IPs all share statistically similar behavioral signatures is a far stronger bot signal than any individual session's trajectory. The behavioral analysis engine's most important capability is cross-session clustering, not per-session scoring.

---

## Insight 2: The Risk Score Must Be Calibrated, Not Just Accurate

**Category:** System Modeling

**One-liner:** An AUC of 0.96 means nothing if the score of 0.6 doesn't reliably mean "60% bot probability"—calibration is what makes the score actionable.

**Why it matters:** ML classification models are typically optimized for ranking accuracy (AUC-ROC) rather than calibration—the degree to which predicted probabilities match actual frequencies. A model with 0.96 AUC might predict scores of 0.7 for sessions that are actually 30% bots and 70% humans. If the challenge threshold is set at 0.5, this leads to mass false positives.

For a risk scoring system, calibration is as important as discrimination. The score must behave like a probability: sessions with score 0.7 should actually be bots about 70% of the time, so that setting a threshold of 0.6 produces approximately a 60% bot detection rate with a predictable false positive rate. Calibration enables customers to tune challenge thresholds based on their FPR/FNR tradeoff; without calibration, threshold tuning is guesswork.

Achieving calibration requires a post-processing step after model training: isotonic regression (a non-parametric monotone function fitted to map raw model outputs to calibrated probabilities) is applied to the model's output on a held-out calibration set. This calibration must be re-run every time the model is retrained, because the raw score distribution changes with each model version. Calibration drift—when the calibration degrades on production data over time—is a subtle failure mode that appears as an increase in the false positive rate without any obvious change in AUC.

---

## Insight 3: Edge-First Architecture Is Forced by Latency Physics, Not Engineering Preference

**Category:** Edge Computing

**One-liner:** At 5M req/sec with a 5ms latency budget, the speed of light prevents centralized scoring—physics dictates edge deployment.

**Why it matters:** A naïve approach to bot detection places an ML scoring API call in the request path between the client and origin. At 5M req/sec globally, this centralized API must be enormous—and even then, a request arriving at a CDN edge in São Paulo that must route to a scoring cluster in Northern Virginia adds 100–150ms of round-trip latency before the origin ever sees the request. This is unacceptable for any latency-sensitive application.

The resolution is not to make the central API faster—it is to eliminate the round-trip for the vast majority of traffic. By loading a small (~5MB) gradient-boosted tree model directly into the memory of each CDN edge node and serving inference in-process, 80% of traffic can be evaluated in 1–2ms with zero network calls. The model is small enough to be refreshed across 5,000+ global edge nodes in under 5 minutes using hierarchical distribution. Only the ambiguous 20% of traffic, which genuinely requires more features and deeper model capacity, is escalated to a cloud ML cluster—and even that escalation happens asynchronously for low-priority signals, allowing the edge to make an immediate provisional decision.

This architecture imposes a hard constraint on edge model complexity: the model must be small enough to fit in edge node memory, fast enough for single-digit-millisecond inference, and simple enough to update without downtime. These constraints favor gradient-boosted trees over deep neural networks at the edge tier—not because GBTs are more accurate, but because they satisfy the operational constraints that the architecture demands.

---

## Insight 4: Session Reputation Changes the Detection Paradigm from Static to Temporal

**Category:** Consistency

**One-liner:** Evaluating each request independently is fundamentally insufficient; bots reveal themselves through sequence patterns that only emerge across multiple requests.

**Why it matters:** Many bot behaviors are undetectable at the single-request level. A credential stuffing bot that sends one login attempt every 30 seconds from a fresh residential IP with a clean fingerprint and a synthesized behavioral payload looks, in isolation, indistinguishable from a legitimate user. Only when viewed across time—20 failed login attempts in 10 minutes from different IPs but the same fingerprint, or 1,000 product page visits from sessions that never add to cart—does the pattern emerge.

Session reputation modeling addresses this by maintaining a dynamic trust score for each session that evolves as evidence accumulates. Each request updates the score using a Bayesian-style weighted update: strong signals (honeypot trigger, failed CAPTCHA) produce large updates; weak signals (slightly unusual mouse velocity) produce small updates. The score also decays toward a neutral prior during idle periods, preventing a bot that earned a good reputation in the morning from using it indefinitely.

The critical architectural challenge is that session state must be readable from every CDN edge PoP with sub-millisecond latency—for a globally distributed system, this is non-trivial. The solution is a three-tier session store: in-process LRU cache at each edge node for recently seen sessions (85% hit rate), a regional distributed cache for sessions seen in the past 24 hours (95% hit rate), and a globally replicated store for historical sessions (accessed rarely). This hierarchy ensures that the cost of maintaining session state does not negate the latency benefits of edge evaluation.

---

## Insight 5: The Challenge System Is a Safety Valve, Not a Detection Mechanism

**Category:** Resilience

**One-liner:** Challenges exist to handle model uncertainty gracefully—they are not an admission of model failure but a deliberate design for borderline cases.

**Why it matters:** A common misunderstanding in bot detection design is treating the challenge system as a fallback for when the model fails. In reality, a well-designed detection system issues challenges *by design* for borderline risk scores (0.3–0.7), not only when the model is uncertain. This is because the model has irreducible uncertainty in this range: with the available signals, the probability that a session in this range is a bot is genuinely between 30% and 70%, and the challenge response (how the user responds) is itself a high-quality signal for disambiguation.

The progressive challenge ladder (invisible JS probe → proof-of-work → interactive CAPTCHA → block) is designed so that each tier resolves the uncertainty that the previous tier left. An invisible JS probe asks: does this browser execute JavaScript normally and return expected environment signals? If yes, the uncertainty reduces. Proof-of-work asks: is this entity willing and able to spend CPU cycles? Most large-scale bots are not willing to spend 200ms per session. Interactive CAPTCHA asks: can this entity reason visually and interact with fine motor control? Most automated systems cannot do this reliably at < $0.01/solve cost.

The design requirement that "challenges must be solvable by humans > 99% of the time" constrains challenge difficulty just as much as "challenges must resist bots." This accessibility constraint is non-negotiable in a consumer-facing system and drives the design toward audio alternatives for image CAPTCHAs, keyboard-navigable alternatives for mouse-dependent tasks, and proof-of-work as the primary second-tier challenge (since PoW is CPU-based and accessible to all devices).

---

## Insight 6: Canary Features Are the Defense Against Model Inversion

**Category:** Security

**One-liner:** Including zero-weight "bait" features in the model's feature set catches attackers who probe to reverse-engineer the decision boundary.

**Why it matters:** Bot operators who invest in defeating a detection system can treat it as a black box and probe it systematically: send requests with precisely varied signals, observe whether each receives a challenge, and deduce which signals matter and by how much. Given enough probes (typically 10,000–100,000 requests), a skilled attacker can reconstruct enough of the model's decision surface to optimize their bot's signals specifically for passing the model.

Canary features are the counter-measure: they are features that the scoring service computes and includes in the feature vector sent to the ML model, but which carry zero weight in the actual model. To the attacker probing the system, these features appear to matter (they can observe the signal being collected via the JavaScript challenge), and an attacker who optimizes heavily for these features wastes effort on signals that have no effect on the score.

More importantly: the very act of optimizing for canary features reveals the attacker. The canary features are chosen to be observable only by entities that are specifically studying the detection system—not features that legitimate user behavior would naturally exhibit. A session whose signal profile shows systematic optimization for canary features is, by that fact alone, conducting adversarial probing and can be escalated to hard blocking. This transforms a passive defense (making the model harder to reverse-engineer) into an active detection signal (identifying entities attempting to reverse-engineer).

---

## Insight 7: Fail-Open Is the Only Correct Failure Mode

**Category:** Resilience

**One-liner:** When the scoring system fails, allowing all traffic through is always better than blocking all traffic, even at the cost of temporary detection blind spots.

**Why it matters:** Bot detection lives in the critical request path of every protected endpoint. If the system fails closed—blocking all traffic when the scoring service is unavailable—it causes an outage indistinguishable from a total application failure. The revenue impact of a 5-minute site-wide outage typically far exceeds the value of the bot traffic that slips through during a 5-minute scoring system degradation.

Fail-open is not just a practical choice—it reflects the correct threat model. Bot operators benefit from the detection system being degraded, so they have incentive to DDoS the scoring service itself as an evasion technique. If the scoring service failing causes it to block all traffic, then DDoS-ing the scorer is a viable attack vector. Fail-open removes this attack surface: DDoS-ing the scorer still degrades detection, but it does not cause the underlying application to fail, removing the attacker's leverage.

The fail-open design requires defense-in-depth to remain acceptable: WAF rules, rate limiters, and hard-coded IP blocklists must operate independently of the ML scoring system, providing a minimum protection baseline even when scoring is unavailable. The scoring system adds intelligence and precision to this baseline; it does not replace the baseline.

---

## Insight 8: Privacy-Preserving Fingerprinting Requires Architecture-Level Commitments, Not Afterthoughts

**Category:** Security

**One-liner:** Hashing signals before storage and aggregating behavioral data in-browser are architectural patterns that satisfy GDPR minimization principles without reducing detection capability.

**Why it matters:** Device fingerprinting is inherently privacy-sensitive: it allows re-identification of users across sessions without their knowledge or consent, which under GDPR constitutes processing of personal data. Many bot detection systems address this through legal disclosures (privacy policy mentions) rather than technical minimization, creating regulatory risk.

Privacy-preserving fingerprinting addresses the problem at the architecture level. The most impactful technique is one-way hashing of raw signals before they ever leave the browser or are stored server-side. Canvas pixel arrays, WebGL parameter sets, and AudioContext oscillator outputs are hashed in-browser; only the 32-byte SHA-256 digest is transmitted. This is sufficient for fingerprint matching (two visits from the same device produce the same hash) and for anomaly detection (consistency checks across hash values) without storing any recoverable representation of the user's hardware.

Similarly, mouse trajectories and keystroke timing are aggregated into statistical features (mean, variance, skewness) within the JavaScript challenge code running in the browser. Raw (x, y, t) sequences are processed locally and discarded after feature extraction; only the aggregate statistics—which carry no possibility of behavioral re-identification—are transmitted to the server. This approach satisfies data minimization (Article 5(1)(c) GDPR) in a technically rigorous way and is defensible in regulatory audits because the architecture makes it technically impossible to store the raw data, not merely unlikely. The privacy property is enforced by the system design, not by policy compliance alone.
