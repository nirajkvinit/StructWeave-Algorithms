# Interview Guide

## Interview Pacing (45-minute format)

| Time | Phase | Focus | What to Cover |
|------|-------|-------|---------------|
| 0-5 min | **Clarify** | Scope the problem | Scale, content types, quality requirements, human involvement |
| 5-15 min | **High-Level** | Architecture overview | Engine orchestration, TM, QE, human workflow |
| 15-30 min | **Deep Dive** | Pick 1-2 critical components | QE pipeline OR TM fuzzy matching OR engine routing |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failures | LLM latency, TM scaling, human queue management |
| 40-45 min | **Wrap Up** | Summary, extensions | Future improvements, alternative approaches |

---

## Phase-by-Phase Guide

### Phase 1: Clarification (0-5 min)

**Questions to Ask:**

1. **Scale:**
   - "How many words per day are we targeting? Enterprise scale (millions) or startup (thousands)?"
   - "How many language pairs need support? Just major languages or long-tail too?"

2. **Content Types:**
   - "What types of content? Technical docs, marketing, legal, user-generated?"
   - "Is real-time translation needed or batch processing acceptable?"

3. **Quality Requirements:**
   - "What's the acceptable error rate? Is human review always required?"
   - "Are there specific industries with compliance needs (medical, legal)?"

4. **Human Involvement:**
   - "Is this fully automated MT or human-in-the-loop?"
   - "Do we have access to professional translators or crowdsourced editors?"

5. **Existing Assets:**
   - "Is there existing Translation Memory to leverage?"
   - "Are there glossaries or style guides to enforce?"

**Sample Clarification Summary:**
> "So we're building an enterprise translation platform handling 50M words/day across 150+ language pairs. Content is mixed technical and marketing. We need <35% human edit rate with COMET scores >0.80. We have existing TM and glossaries to leverage. The goal is intelligent engine routing between NMT and LLM with quality-based human routing."

---

### Phase 2: High-Level Design (5-15 min)

**Key Components to Draw:**

```
1. Content Ingestion
   └─ File parsing, segmentation, string extraction

2. Translation Memory
   └─ Exact match, fuzzy match, TM updates

3. Engine Layer
   ├─ Engine Router (NMT vs LLM decision)
   ├─ NMT Engine Pool (DeepL, Google, Language Weaver)
   └─ LLM Translation Service (GPT-4, Claude)

4. Quality Estimation
   └─ COMET/neural scoring, threshold-based routing

5. Human Workflow
   ├─ MTPE Queue (prioritized by QE score)
   ├─ Editor Workbench
   └─ Review/Approval

6. Adaptive Learning
   └─ Human corrections → model fine-tuning, TM updates

7. Delivery
   └─ Webhooks, API responses, file export
```

**Data Flow to Explain:**

1. Content arrives → Parse → Segment
2. Each segment → TM lookup
3. TM miss → Engine router decides NMT or LLM
4. MT output → QE scoring
5. High QE → auto-approve → delivery
6. Low QE → human queue → MTPE → review → delivery
7. Human edits → feed back to TM and model training

---

### Phase 3: Deep Dive (15-30 min)

**Option A: Quality Estimation Pipeline**

Cover:
- Neural QE architecture (COMET)
- Cross-lingual encoder (XLM-RoBERTa)
- Feature extraction (cosine similarity, element-wise product)
- Regression head for score prediction
- Calibration (per language pair, per domain)
- Threshold tuning (auto-approve vs human review)
- Failure modes (score collapse, adversarial inputs)

**Option B: Translation Memory Fuzzy Matching**

Cover:
- Two-stage lookup (exact hash → vector similarity)
- Embedding model for semantic matching
- ANN search (HNSW/IVF) configuration
- Reranking with Levenshtein distance
- Penalty/bonus scoring (numbers, placeholders)
- Scaling challenges (500M+ segments)
- Cache strategy (exact match cache, fuzzy result cache)

**Option C: Engine Routing Logic**

Cover:
- Content classification (technical, creative, legal)
- Routing rules matrix
- Cost optimization (quality per dollar)
- A/B testing framework for engine comparison
- Fallback logic (LLM timeout → NMT fallback)
- Thompson sampling for exploration

---

### Phase 4: Scale & Trade-offs (30-40 min)

**Bottlenecks to Discuss:**

| Bottleneck | Root Cause | Mitigation |
|------------|------------|------------|
| LLM latency | API calls 500ms-2s | Batch segments, cache responses, NMT fallback |
| TM memory | 500M segments × 768-dim vectors | Vector quantization, tiered storage |
| Human queue | Editor availability | Dynamic QE threshold, external pool |
| GPU saturation | NMT/QE inference load | Auto-scaling, batching optimization |

**Trade-off Discussions:**

| Decision | Option A | Option B | When to Choose A |
|----------|----------|----------|------------------|
| NMT vs LLM | Fast, cheap, consistent | Slow, expensive, contextual | Technical docs, high volume |
| QE Threshold | High (0.90) | Low (0.75) | Cost-sensitive, trusted engines |
| TM Scope | Per-customer | Global shared | Privacy requirements, domain-specific |
| Human Review | Full MTPE | Light review | High-stakes content, new domains |

**Failure Scenarios:**

1. "What if LLM provider has an outage?"
   - Circuit breaker pattern
   - Automatic fallback to NMT
   - Queue jobs for later LLM processing

2. "What if QE model drifts and starts over-approving bad translations?"
   - Monitor QE-human correlation
   - A/B test with human spot-checks
   - Automatic rollback on drift detection

3. "What if TM grows beyond memory capacity?"
   - Tiered storage (hot/cold TM)
   - Per-customer sharding
   - LRU eviction of unused segments

---

### Phase 5: Wrap Up (40-45 min)

**Summary Points:**
- Recap architecture: content → TM → engine routing → QE → human/auto → delivery
- Key design decisions: multi-engine orchestration, neural QE, adaptive learning
- Trade-offs made: quality vs cost, latency vs context, automation vs human control

**Future Extensions:**
- Multi-modal translation (image text, video subtitles)
- On-device translation for privacy-sensitive content
- Real-time streaming translation for chat/support

---

## Trade-offs Discussion

### Critical Trade-offs

| Decision | Option A | Option B | Factors to Consider |
|----------|----------|----------|---------------------|
| **NMT vs LLM for all content** | NMT everywhere | LLM everywhere | Cost (10x), latency (5x), quality (+5-10%), context handling |
| **QE model complexity** | Simple (fast, less accurate) | Complex (slow, more accurate) | Latency budget, routing accuracy, GPU cost |
| **TM matching strategy** | Exact only | Fuzzy with AI reranking | Development complexity, match rate, quality |
| **Human involvement** | Always review | QE-based routing | Cost, turnaround time, quality guarantee |
| **Adaptive learning** | Batch (daily) | Real-time | Infrastructure cost, learning speed, stability |
| **Engine selection** | Rules-based | ML-based | Explainability, maintenance, accuracy |

### Sample Trade-off Analysis

**Trade-off: Centralized vs Per-Customer TM**

| Aspect | Centralized TM | Per-Customer TM |
|--------|---------------|-----------------|
| **Pros** | Better fuzzy match for rare segments, shared learning | Privacy compliance, domain-specific accuracy |
| **Cons** | Privacy concerns, cross-contamination risk | Higher storage cost, less leverage |
| **Recommendation** | Per-customer TM with optional opt-in to anonymized shared pool |

---

## Trap Questions & Best Answers

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just use GPT-4 for everything?" | Understand cost/latency trade-offs | "GPT-4 is great for quality but costs ~10x NMT and is 5x slower. For high-volume technical content with terminology, NMT with glossary injection often matches LLM quality at fraction of cost. We use intelligent routing to get best of both." |
| "Why do you need QE? Just use BLEU." | Know QE limitations and reference-free evaluation | "BLEU requires reference translations we don't have in production. QE models like COMET predict quality without references and correlate better with human judgment. However, QE can be fooled, so we combine it with human spot-checks and calibration." |
| "100% TM hit rate would be ideal, right?" | Understand TM limitations | "Actually no—100% TM hit means stale content. Some new content is healthy. We target 40-50% TM hit rate. Too high suggests we're not translating new content; too low means we're not leveraging assets." |
| "Why not fine-tune a single model for all customers?" | Multi-tenancy and domain adaptation | "Different customers have different terminology and style. A legal firm and gaming company need different translations. We use customer-specific LoRA adapters or terminology injection rather than one-size-fits-all." |
| "What if humans disagree with QE scores?" | QE calibration and human feedback | "We continuously calibrate QE against human judgments. If humans consistently edit 'high QE' segments, we adjust thresholds. Human feedback also flows back to retrain QE models. QE is a guide, not ground truth." |
| "Can you guarantee no translation errors?" | Realistic quality expectations | "No translation system is 100% accurate—even humans disagree. We guarantee SLO (e.g., <35% human edit rate, COMET >0.80). For high-stakes content (legal, medical), we enforce human review regardless of QE score." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| **Designing single-engine system** | Different content needs different engines | Multi-engine with intelligent routing |
| **Ignoring TM completely** | Missing 40%+ cost savings | TM-first architecture, then MT for misses |
| **QE as binary pass/fail** | Quality is a spectrum | Tiered routing (auto-approve, light MTPE, full MTPE) |
| **No fallback for LLM failures** | LLM APIs are unreliable | Circuit breaker + NMT fallback |
| **Storing all content permanently** | Storage costs, compliance risks | Retention policies, data minimization |
| **Ignoring terminology consistency** | Brand damage, legal issues | Glossary enforcement, constrained decoding |
| **Monolithic architecture** | Can't scale components independently | Microservices for TM, MT, QE, workflow |
| **No human-in-the-loop design** | MT is not perfect | Design for MTPE workflow from start |

---

## Questions to Ask Interviewer

1. **Scale:** "What's the expected translation volume? Millions of words per day or smaller scale?"
2. **Content:** "What types of content? Technical documentation, marketing, user-generated?"
3. **Quality:** "What's the acceptable error rate? Is some automation acceptable or always human review?"
4. **Languages:** "How many language pairs? Just major European languages or including CJK, RTL?"
5. **Existing assets:** "Is there existing Translation Memory or glossaries to integrate?"
6. **Latency:** "Is real-time translation needed or batch acceptable?"
7. **Compliance:** "Any specific compliance requirements? GDPR, HIPAA, data residency?"
8. **Budget:** "Any constraints on LLM API costs or human translator budget?"

---

## Quick Reference Card

```
+------------------------------------------------------------------------+
|         AI-NATIVE TRANSLATION PLATFORM - INTERVIEW QUICK REF            |
+------------------------------------------------------------------------+
|                                                                         |
|  KEY COMPONENTS                                                         |
|  --------------                                                         |
|  1. Content Ingestion (parse, segment, extract)                        |
|  2. Translation Memory (exact + fuzzy match)                           |
|  3. Engine Router (NMT vs LLM selection)                               |
|  4. Quality Estimation (COMET scoring)                                 |
|  5. Human Workflow (MTPE, review, approval)                            |
|  6. Adaptive Learning (corrections → model updates)                    |
|                                                                         |
+------------------------------------------------------------------------+
|                                                                         |
|  CRITICAL NUMBERS                                                       |
|  ----------------                                                       |
|  Scale: 50M words/day, 150+ language pairs                             |
|  TM Hit Rate: 40% target                                               |
|  QE Score: >0.80 COMET average                                         |
|  Human Edit Rate: <35%                                                 |
|  Auto-Approve Threshold: >0.85 COMET                                   |
|                                                                         |
+------------------------------------------------------------------------+
|                                                                         |
|  LATENCY TARGETS                                                        |
|  ---------------                                                        |
|  TM Lookup: <50ms p95 (exact), <100ms p95 (fuzzy)                      |
|  NMT Translation: <500ms p95                                           |
|  LLM Translation: <3s p95                                              |
|  QE Scoring: <100ms p95                                                |
|                                                                         |
+------------------------------------------------------------------------+
|                                                                         |
|  ENGINE SELECTION RULES                                                 |
|  ----------------------                                                 |
|  Technical/UI strings → NMT (fast, consistent)                         |
|  Creative/Marketing → LLM (contextual, fluent)                         |
|  Legal/Medical → Specialized NMT + Human Review                        |
|  Unknown → A/B test, default to NMT                                    |
|                                                                         |
+------------------------------------------------------------------------+
|                                                                         |
|  QUALITY ROUTING                                                        |
|  ---------------                                                        |
|  QE > 0.85 → Auto-approve                                              |
|  QE 0.70-0.85 → Light MTPE                                             |
|  QE < 0.70 → Full MTPE                                                 |
|  QE < 0.50 → Re-translate with different engine                        |
|                                                                         |
+------------------------------------------------------------------------+
|                                                                         |
|  KEY ALGORITHMS                                                         |
|  --------------                                                         |
|  * Fuzzy Match: Levenshtein + vector similarity + reranking            |
|  * QE: Cross-lingual encoder → feature extraction → regression         |
|  * Engine Routing: Content classification + cost optimization          |
|  * Adaptive Learning: Edit aggregation → incremental fine-tuning       |
|                                                                         |
+------------------------------------------------------------------------+
|                                                                         |
|  INTERVIEW KEYWORDS                                                     |
|  ------------------                                                     |
|  NMT, LLM, COMET, CometKiwi, Quality Estimation, MTPE, Translation     |
|  Memory, fuzzy matching, ICE match, constrained decoding, terminology  |
|  injection, engine orchestration, adaptive MT, BLEU, TER, human-in-    |
|  the-loop, edit distance, LoRA fine-tuning                             |
|                                                                         |
+------------------------------------------------------------------------+
```

---

## Follow-up Deep Dive Topics

If time permits or for senior-level interviews:

### Advanced Topic 1: Adaptive Machine Translation
- How does real-time learning from corrections work?
- LoRA vs full fine-tuning trade-offs
- Preventing catastrophic forgetting
- Feedback loop latency (correction → improved model)

### Advanced Topic 2: LLM Prompt Engineering for Translation
- Structuring prompts for translation tasks
- Few-shot examples selection
- Terminology injection in prompts
- Handling prompt injection attacks

### Advanced Topic 3: Multi-Modal Translation
- Image text extraction (OCR) + translation
- Video subtitle translation with timing
- Document layout preservation
- Challenges with non-Latin scripts

### Advanced Topic 4: Privacy-Preserving Translation
- On-device translation models
- Federated learning for adaptation
- Differential privacy in TM
- Secure multi-party computation for sensitive content
