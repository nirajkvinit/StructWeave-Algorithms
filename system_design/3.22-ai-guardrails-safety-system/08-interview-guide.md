# Interview Guide

## Interview Pacing (45 Minutes)

| Time | Phase | Focus | Key Deliverables |
|------|-------|-------|------------------|
| **0-5 min** | Clarify | Requirements, threat model, scale | Written requirements |
| **5-15 min** | High-Level | Multi-layer architecture | Architecture diagram |
| **15-30 min** | Deep Dive | 1-2 critical components | Detailed algorithms |
| **30-40 min** | Trade-offs | Latency vs safety, scaling | Decision matrix |
| **40-45 min** | Wrap Up | Summary, extensions | Clear articulation |

---

## Phase 1: Clarification (0-5 min)

### Must-Ask Questions

| Question | Why It Matters | Effect on Design |
|----------|----------------|------------------|
| "What attack vectors are highest priority?" | Focus detection efforts | Which detectors to emphasize |
| "What's the latency budget for guardrails?" | Performance constraints | Multi-stage vs single-pass |
| "What's the acceptable false positive rate?" | User experience vs safety | Threshold tuning strategy |
| "Where does this integrate - gateway, SDK, or agent?" | Integration architecture | API design, sync vs async |
| "Is real-time blocking required or can we review async?" | Processing model | Pipeline design |
| "What content types - text only or multimodal?" | Detection scope | Model selection |
| "Any compliance requirements (HIPAA, GDPR, SOC 2)?" | Compliance constraints | Audit logging, PII handling |
| "What scale - requests per second, number of tenants?" | Capacity planning | Scaling architecture |

### Sample Clarification Dialog

> **Candidate**: "Before I dive in, let me clarify a few requirements. What attack vectors are you most concerned about?"
>
> **Interviewer**: "Primarily prompt injection and jailbreaks, but we also need PII protection."
>
> **Candidate**: "Got it. What's the latency budget for the guardrails themselves?"
>
> **Interviewer**: "We need to keep it under 50ms in the hot path. Users shouldn't notice significant delay."
>
> **Candidate**: "And what false positive rate is acceptable?"
>
> **Interviewer**: "Under 1% - we can't block legitimate users frequently."
>
> **Candidate**: "Perfect. Based on this, I'll design a multi-stage pipeline that uses fast regex for obvious cases and ML classifiers for nuanced detection, keeping LLM-based analysis only for borderline cases to stay within latency budget."

---

## Phase 2: High-Level Design (5-15 min)

### Architecture to Draw

```
┌─────────────────────────────────────────────────────────────────┐
│                         GUARDRAILS SYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────┐     ┌─────────────────────────────────────────┐   │
│   │ Request │────▶│            RAIL ORCHESTRATOR            │   │
│   └─────────┘     └─────────────────────────────────────────┘   │
│                              │                                   │
│          ┌───────────────────┼───────────────────┐              │
│          ▼                   ▼                   ▼              │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │ INPUT RAILS │    │DIALOG RAILS │    │OUTPUT RAILS │        │
│   │ • Injection │    │ • Multi-turn│    │ • Response  │        │
│   │ • Jailbreak │    │ • Hierarchy │    │ • PII Redact│        │
│   │ • PII       │    └─────────────┘    └─────────────┘        │
│   │ • Toxicity  │                                               │
│   └─────────────┘                                               │
│          │                                                      │
│          ▼                                                      │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │              DETECTION SERVICES                          │  │
│   │  ┌───────┐  ┌───────────┐  ┌─────┐  ┌──────────────┐   │  │
│   │  │ Regex │─▶│ Classifier│─▶│ LLM │  │ Policy Engine│   │  │
│   │  │ <1ms  │  │  5-15ms   │  │Judge│  │              │   │  │
│   │  └───────┘  └───────────┘  └─────┘  └──────────────┘   │  │
│   └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Cache │  Audit Logs  │  ML Models  │  Pattern DB       │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Points to Cover

1. **Five Rail Types**: Input, Dialog, Retrieval, Execution, Output
2. **Multi-Stage Detection**: Regex → Classifier → LLM-judge
3. **Early Exit Pattern**: Block attacks at first detection, skip expensive checks
4. **Policy Engine**: Declarative rules for custom business logic
5. **Caching**: Embedding cache, detection result cache for repeated content

### What Interviewers Look For

| Signal | Good | Red Flag |
|--------|------|----------|
| **Layered defense** | Multiple detection stages | Single point of failure |
| **Latency awareness** | Fast path for common cases | Everything through ML |
| **Configurability** | Tenant-specific policies | Hardcoded rules |
| **Explainability** | Can explain why blocked | Black box decisions |

---

## Phase 3: Deep Dive (15-30 min)

### Option A: Prompt Injection Detection

**Key Points to Cover**:

1. **Attack Taxonomy**
   - Direct injection: "Ignore previous instructions"
   - Indirect injection: Malicious content in RAG documents
   - Obfuscation: Base64, Unicode, leetspeak

2. **Three-Stage Pipeline**
   ```
   Stage 1: Regex (<1ms)
   ├── Catches obvious patterns: "ignore previous", "system prompt:"
   ├── High precision, low recall
   └── Early exit for clear attacks

   Stage 2: Classifier (5-15ms)
   ├── PromptGuard-style model
   ├── Trained on adversarial examples
   └── Handles semantic attacks

   Stage 3: LLM-as-Judge (100-500ms)
   ├── Only for borderline cases (conf 0.3-0.8)
   ├── Structured output: is_injection, confidence, reasoning
   └── <5% of requests reach this stage
   ```

3. **Obfuscation Handling**
   - Normalize before detection (Unicode, encoding, whitespace)
   - Check multiple normalized variants

4. **Multi-Agent Defense**
   - Multiple detectors vote
   - Consensus required for pass
   - Achieves 0% ASR in benchmarks

### Option B: PII Detection at Scale

**Key Points to Cover**:

1. **Hybrid Detection**
   ```
   Regex Patterns (Fast Path)
   ├── Email: r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
   ├── SSN: r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b' + Luhn validation
   ├── Credit Card: Pattern + Luhn checksum
   └── Phone: Regional patterns + validation

   NER Model (ML Path)
   ├── Catches names, addresses, custom entities
   ├── Context-aware classification
   └── Handles unstructured PII
   ```

2. **Validation Layer**
   - Checksum validation (Luhn for credit cards)
   - Format validation (phone number length)
   - Context analysis (reduce false positives)

3. **Redaction Strategies**
   - Mask: `[EMAIL]`, `[SSN]`
   - Hash: Consistent pseudonymization
   - Fake: Replace with realistic fakes

4. **Performance Optimization**
   - Batch NER inference
   - Cache embeddings
   - Pre-compiled regex patterns

---

## Phase 4: Scale & Trade-offs (30-40 min)

### Common Trade-off Questions

| Question | Strong Answer Framework |
|----------|------------------------|
| "Latency vs Safety" | "Multi-stage pipeline: fast path handles 95% in <20ms, expensive LLM-judge only for borderline 5%. Configurable thresholds per use case." |
| "Accuracy vs False Positives" | "Confidence-based actions: block high-confidence (>0.9), warn medium (0.6-0.9), allow low (<0.6). Appeal workflow for blocked requests." |
| "Cost vs Coverage" | "LLM-as-judge is expensive. Use only for borderline cases. Estimated 5% of traffic = ~$0.001/req overhead." |
| "Real-time vs Thoroughness" | "Sync for blocking decisions, async for comprehensive analysis. Borderline cases get async deep review." |

### Scaling Discussion

**What to Cover**:
- Horizontal scaling of stateless API nodes
- GPU sharing for ML inference (batching)
- Cache strategy (L1 in-memory, L2 Redis)
- Database sharding by tenant

**Numbers to Know**:
- 10K req/sec per node is achievable
- Classifier inference: 5-15ms on GPU, 20-50ms on CPU
- Cache hit rates: 80%+ for embedding cache

### Reliability Discussion

**What to Cover**:
- Circuit breakers for external services
- Graceful degradation (disable non-critical detectors)
- Fail-closed vs fail-open (safety-first = fail-closed)
- Multi-region for disaster recovery

---

## Phase 5: Wrap Up (40-45 min)

### Strong Summary Template

> "To summarize, I've designed a multi-layer guardrails system with five rail types: input, dialog, retrieval, execution, and output. The key innovation is the three-stage detection pipeline that balances latency and accuracy - regex for obvious cases under 1ms, classifiers for most traffic in 5-15ms, and LLM-judge only for the 5% borderline cases.
>
> For the main requirements of prompt injection and PII protection, I've covered multi-stage injection detection with obfuscation handling, and hybrid PII detection combining regex patterns with NER models.
>
> Key trade-offs I made: prioritizing latency by using fast-path detection, accepting slightly lower recall for better false positive rates, and designing for horizontal scalability from the start.
>
> If I had more time, I'd dive deeper into the policy engine DSL and the continuous learning feedback loop for improving detection accuracy."

### Extension Questions to Prepare For

| Question | Brief Answer |
|----------|--------------|
| "How would you handle multimodal content?" | "Add image/audio moderation pipeline. Use vision models for image content, ASR for audio. Same rail architecture, different detectors." |
| "How do you handle attackers adapting?" | "Continuous red-teaming with STAR methodology, adversarial training, rapid pattern updates, ML model refresh." |
| "How would you add human review?" | "Appeal workflow: blocked requests go to queue, humans label, feedback improves models. Integrate with policy engine for escalation rules." |
| "How do you test this system?" | "Adversarial test suite with known attacks + variants, A/B testing for new models, shadow mode for policy changes." |

---

## Key Numbers to Remember

| Metric | Value | Context |
|--------|-------|---------|
| **Regex detection** | <1ms | Fast path for obvious attacks |
| **Classifier inference** | 5-15ms | GPU inference time |
| **LLM-as-judge** | 100-500ms | Only for borderline cases |
| **Target overall latency** | <50ms p50, <100ms p99 | Guardrail overhead budget |
| **Target accuracy** | >95% true positive rate | Catch most attacks |
| **Target false positive** | <1% | User experience |
| **PII precision** | ~94.7% | Industry benchmark |
| **PII recall** | ~89.4% | Industry benchmark |
| **Throughput** | 10K req/sec/node | Horizontal scaling unit |

---

## Trap Questions & Strong Answers

### Trap 1: "Why not just use a single LLM for everything?"

**What They're Testing**: Understanding of latency/cost trade-offs

**Strong Answer**:
> "A single LLM call would be 100-500ms, way over our 50ms latency budget. Plus, at $0.01-0.03 per call, it's expensive at scale. The multi-stage approach lets us catch 95% of cases with fast, cheap methods (regex + classifier), reserving expensive LLM analysis for only the 5% borderline cases. This gives us both performance and accuracy."

### Trap 2: "What if the guardrails themselves get attacked?"

**What They're Testing**: Security mindset, defense-in-depth

**Strong Answer**:
> "Great question - we need to protect the protector. Key mitigations:
> 1. Rate limiting on detection endpoints to prevent DoS
> 2. Pattern updates require code review and versioning
> 3. ML models are signed and integrity-verified on load
> 4. Audit logs are immutable and cryptographically signed
> 5. Multi-agent consensus so compromising one detector isn't enough
> 6. Regular adversarial testing of the guardrail system itself"

### Trap 3: "How do you handle false positives blocking legitimate users?"

**What They're Testing**: User experience awareness, practical thinking

**Strong Answer**:
> "False positives are critical for user experience. Our approach:
> 1. Confidence-based actions: only block high-confidence (>0.9), warn for medium
> 2. Graceful messaging: explain why blocked, suggest reformulation
> 3. Appeal workflow: users can request review, humans label for ML improvement
> 4. Per-use-case thresholds: stricter for high-risk, lenient for internal tools
> 5. Continuous feedback loop: track FP rate, retrain models with labeled data"

### Trap 4: "What happens when attackers adapt to your patterns?"

**What They're Testing**: Long-term thinking, continuous improvement

**Strong Answer**:
> "It's an arms race, so we need continuous improvement:
> 1. Red teaming: Regular adversarial testing with STAR methodology
> 2. Adversarial training: Train classifiers on new attack variants
> 3. Pattern updates: Security team pushes new patterns rapidly
> 4. Community intelligence: Share patterns with industry (similar to threat feeds)
> 5. Behavioral detection: Catch anomalies, not just known patterns
> 6. ML model refresh: Retrain periodically on new labeled data"

### Trap 5: "Why not just fine-tune the LLM to be safer?"

**What They're Testing**: Understanding of defense-in-depth

**Strong Answer**:
> "Fine-tuning helps but isn't sufficient alone:
> 1. Guardrails provide defense-in-depth - LLM safety + external validation
> 2. Guardrails are more flexible - update policies without retraining
> 3. Works with any LLM - not provider-specific
> 4. Explainable - we can show exactly why something was blocked
> 5. Auditable - complete log of all decisions for compliance
> 6. Even 'safe' LLMs can be jailbroken - external guardrails add another layer"

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| **Single-point detection** | Attackers can bypass one method | Multi-layer pipeline |
| **All traffic through LLM** | Too slow and expensive | Fast path for common cases |
| **Hardcoded rules only** | Can't handle novel attacks | ML + rules hybrid |
| **Ignoring false positives** | Blocks legitimate users | Confidence-based actions |
| **No feedback loop** | Detection degrades over time | Continuous learning |
| **Fail-open on errors** | Safety bypass during outages | Fail-closed for guardrails |
| **Blocking without explanation** | Poor UX, compliance issues | Explainable decisions |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI GUARDRAILS QUICK REFERENCE                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FIVE RAIL TYPES                                                │
│  ─────────────────                                              │
│  • Input Rails: Pre-LLM validation (injection, jailbreak, PII) │
│  • Dialog Rails: Conversation state, multi-turn attacks        │
│  • Retrieval Rails: RAG content validation                     │
│  • Execution Rails: Tool call authorization                    │
│  • Output Rails: Response moderation, PII redaction            │
│                                                                 │
│  THREE-STAGE DETECTION                                          │
│  ─────────────────────                                          │
│  1. Regex (<1ms) → 2. Classifier (5-15ms) → 3. LLM-Judge       │
│  • Early exit on high confidence                               │
│  • LLM-Judge only for borderline (~5%)                         │
│                                                                 │
│  KEY NUMBERS                                                    │
│  ───────────                                                    │
│  • Latency: <50ms p50, <100ms p99                              │
│  • Accuracy: >95% TPR, <1% FPR                                 │
│  • Throughput: 10K req/sec/node                                │
│  • PII: 94.7% precision, 89.4% recall                          │
│                                                                 │
│  KEY DECISIONS                                                  │
│  ─────────────                                                  │
│  • Multi-stage pipeline (not single model)                     │
│  • Declarative policy language (Colang-style)                  │
│  • Fail-closed on errors (safety-first)                        │
│  • Confidence-based actions (block/warn/allow)                 │
│                                                                 │
│  FRAMEWORKS                                                     │
│  ──────────                                                     │
│  • NeMo Guardrails: NVIDIA, open-source, Colang DSL            │
│  • Guardrails AI: OSS, validator hub, structured output        │
│  • Bedrock Guardrails: AWS managed, 6 safeguard policies       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
