# AI-Native Revenue Intelligence Platform --- Interview Guide

## 1. The 45-Minute Interview Pacing

### Phase 1: Requirements Gathering (8 minutes)

**Goal**: Demonstrate structured thinking about a complex AI-driven platform by identifying the right scope and constraints.

**Opening prompt**: "Design a system like Gong or Clari that captures sales conversations, analyzes them with AI, and predicts revenue outcomes."

**Key questions to ask the interviewer**:

| Question | Why It Matters |
|----------|---------------|
| "Which interaction channels? Just calls, or also emails, video, chat?" | Scopes the ingestion pipeline complexity; audio processing is fundamentally different from text processing |
| "What's the scale? How many reps and calls per day?" | Drives GPU provisioning, storage estimates, and event stream sizing |
| "Is real-time coaching during calls in scope, or just post-call analysis?" | Real-time ASR is a completely different latency regime from batch transcription |
| "How does the system integrate with CRM---read-only or bi-directional sync?" | Bi-directional sync adds conflict resolution, rate limiting, and data ownership challenges |
| "Are there specific compliance requirements---call recording consent laws, data residency?" | Shows awareness that this is not just a technical problem but a legal one |
| "What level of forecast accuracy is expected?" | Sets the bar for the ML component; 85%+ requires sophisticated feature engineering |

**What strong candidates do**:
- Identify that this is both a real-time streaming system (audio processing) AND a batch analytics system (forecasting)
- Recognize the consent/compliance dimension without being prompted
- Scope the system into clear subsystems: ingestion, processing, intelligence, serving

**Red flag**: Jumping straight to "we'll use a transformer model" without understanding the data flow and system constraints.

### Phase 2: High-Level Design (12 minutes)

**Goal**: Lay out the system architecture showing data flow from call capture to CRM insight.

**What to draw**:

1. **Ingestion layer**: Telephony connectors, email/calendar connectors, consent engine
2. **Event streaming backbone**: Decouples all processing stages
3. **Processing layer**: ASR cluster (real-time + batch), NLP model router + model ensemble, LLM for summarization
4. **Intelligence layer**: Deal scoring engine, forecast engine, coaching engine
5. **Data layer**: Object storage (audio), graph store (revenue graph), time-series (scores), search index (transcripts)
6. **Serving layer**: API gateway, dashboards, CRM sync engine

**Key architectural decisions to articulate**:

| Decision | Justification |
|----------|--------------|
| Event-driven pipeline (not request-response) | Decoupled scaling; natural backpressure; replay capability for model improvements |
| Specialized small model ensemble (not single LLM) | 100--1000× cheaper per inference; higher accuracy for structured tasks; ~40 models at 60B inferences/day makes cost critical |
| Hybrid storage (graph + relational + time-series) | Different query patterns require different storage engines; no single store handles all access patterns well |
| Bayesian signal fusion for deal scoring | Principled framework for combining heterogeneous signals with different reliabilities and update frequencies |

**Scoring rubric**:
- **Strong**: Identifies the event-driven architecture, separates real-time from batch processing paths, shows the multi-model NLP pipeline, includes the revenue graph concept
- **Average**: Gets the basic pipeline right but treats NLP as a black box; misses the revenue graph
- **Weak**: Designs a request-response system; treats it as a simple CRUD application with an ML model bolted on

### Phase 3: Deep Dive (15 minutes)

**Goal**: Demonstrate depth in 1--2 critical components. Let the interviewer choose, but be prepared for any of these:

#### Deep Dive Option A: Real-Time Conversation Processing Pipeline

**Key points to cover**:
- Streaming ASR vs. batch ASR: different models, different latency targets, different accuracy profiles
- Speaker diarization and its downstream impact on all metrics
- NLP model router: content-based routing, priority scheduling, result merging with conflict resolution
- LLM summarization as the expensive tail of the pipeline
- Backpressure management: priority queues, graceful degradation, overflow handling

**Impressive details**:
- Mention that diarization errors propagate to every downstream metric
- Discuss the partial hypothesis management challenge in streaming ASR
- Explain why the model ensemble approach beats a single large model at this scale (cost × volume)

#### Deep Dive Option B: Pipeline Forecasting Engine

**Key points to cover**:
- Feature engineering is the differentiator, not the algorithm: interaction signals, sentiment, engagement, CRM, competitive, temporal, rep-specific features
- Model ensemble: gradient boosted trees + LSTM + survival analysis
- Calibration as a critical but often overlooked system: Platt scaling, per-segment adjustment, temporal recalibration
- Uncertainty propagation via Monte Carlo simulation (deals are not independent)
- AI vs. rep forecast reconciliation

**Impressive details**:
- Explain why naive probability summation hides uncertainty
- Discuss correlation modeling (rep-level, account-level, market-level)
- Mention the cold-start problem for new tenants and the hierarchical model solution (global + per-tenant fine-tuning)

#### Deep Dive Option C: Deal Scoring with Bayesian Signal Fusion

**Key points to cover**:
- Multi-dimensional signal categories with different weights, reliabilities, and update frequencies
- Bayesian framework: prior from historical base rate, likelihood ratios for each signal, continuous updating
- Calibration: predicted probabilities must match observed close rates
- Explainability: signal contribution breakdown for each score
- Risk detection: multi-dimensional anomaly detection against "normal" engagement patterns

**Impressive details**:
- Discuss the "ghost deal" problem and how to detect it
- Explain why the score must be calibrated per segment (enterprise vs. mid-market vs. SMB)
- Mention the scoring lock to handle concurrent signal updates

### Phase 4: Scalability & Trade-offs (7 minutes)

**Key trade-offs to discuss**:

| Trade-Off | Options | Analysis |
|-----------|---------|----------|
| Transcription accuracy vs. latency | Real-time (fast, lower accuracy) vs. batch (slow, higher accuracy) | Use both: real-time for coaching, batch for analysis. Dual processing costs more but serves both use cases |
| Global model vs. per-tenant model | Global has more training data; per-tenant is personalized | Hierarchical: global base + per-tenant fine-tuning. New tenants get reasonable baseline; mature tenants get personalized accuracy |
| GPU cost vs. model quality | Cheaper models are less accurate; better models cost more at scale | Distillation, quantization, batching, caching all reduce cost. LLM reserved for open-ended tasks; specialized models for structured extraction |
| Real-time scoring vs. batch scoring | Real-time is complex but timely; batch is simpler but stale | Near-real-time with event-driven updates. Score refreshes within 5 min of new signal. Batch recalibration nightly |
| Audio retention vs. storage cost | Keeping all audio enables re-analysis; deleting saves storage | Tiered retention: hot 30d, warm 1y, cold 7y+. Cold storage is cheap; re-analysis value is high |

### Phase 5: Wrap-Up (3 minutes)

**Topics to mention if not already covered**:
- Consent law compliance as a first-class architectural concern
- Multi-tenancy: data isolation, compute isolation, noisy neighbor prevention
- Observability: AI-specific monitoring (model accuracy drift, calibration degradation)
- Security: audio recordings are highly sensitive; per-tenant encryption, signed URLs, access logging

---

## 2. Common Trap Questions and How to Handle Them

### Trap 1: "Why not just use a single large language model for everything?"

**The trap**: This tests whether you understand the cost and performance implications at scale.

**Strong answer**: "At 60 billion inferences per day, even a small difference in per-inference cost is enormous. A specialized sentiment model costs ~$0.00001 per inference; an LLM costs ~$0.01. That's a 1000× cost difference. For structured extraction tasks (sentiment, objection detection, competitor mentions), specialized models are also more accurate because they're fine-tuned on exactly that task. We use the LLM only for open-ended tasks like summarization and conversational QA where a specialized model can't match its flexibility."

### Trap 2: "How do you handle the cold-start problem for new tenants?"

**The trap**: Tests whether you've thought about the bootstrapping challenge.

**Strong answer**: "New tenants get the global model trained on anonymized, aggregated data from all tenants. This provides reasonable (but not personalized) predictions from day one. As the tenant accumulates data (typically 2 quarters of deal outcomes), we fine-tune a per-tenant model using transfer learning from the global model. This gives us the best of both worlds: no cold-start gap, and increasingly personalized predictions over time. For deal scoring specifically, the prior probability comes from the tenant's industry segment base rate until enough tenant-specific data is available."

### Trap 3: "What happens when the AI score disagrees with the rep's judgment?"

**The trap**: Tests whether you understand the human-AI interaction model.

**Strong answer**: "The system never overrides the rep. AI scores and rep-submitted forecasts coexist side by side. When they diverge significantly (>15%), the system flags the discrepancy to the manager with evidence from both sides. Over time, we track which source (AI or rep) was more accurate, which builds trust. The key insight is that the AI often sees signals the rep doesn't report (declining sentiment, lack of stakeholder breadth), while the rep may know things the AI can't see (verbal commitment in a hallway conversation, relationship history). The system surfaces its evidence transparently so the human can make the final call."

### Trap 4: "How do you handle call recording consent across different jurisdictions?"

**The trap**: Tests awareness of legal/compliance requirements that are non-negotiable.

**Strong answer**: "This is a first-class system requirement, not an afterthought. A consent engine determines the jurisdiction for each call based on participant locations, applies the strictest rule across all jurisdictions involved, and enforces the appropriate consent workflow before recording begins. Two-party consent states require explicit opt-in from all participants. If consent cannot be obtained, the system does not record---this is a hard constraint, not a soft one. Every recording has an immutable consent audit trail linking to the jurisdiction determination, consent type, and per-participant consent status."

### Trap 5: "Why not store everything in a single database?"

**The trap**: Tests understanding of polyglot persistence.

**Strong answer**: "The system has fundamentally different query patterns that no single database optimizes well. Audio files need blob/object storage with lifecycle management. Transcripts need full-text search with per-tenant isolation. The revenue graph needs relationship traversal across entities (graph database). Deal score histories need time-series queries (what was the score trajectory over the last 90 days?). CRM sync needs ACID transactions. Using a single database would mean poor performance for most query patterns and extreme operational complexity trying to tune one system for all workloads."

### Trap 6: "How do you ensure the forecast model doesn't just learn to predict the CRM stage?"

**The trap**: Tests ML engineering depth.

**Strong answer**: "If the model heavily weights the CRM stage, it's essentially recreating the traditional stage-based forecast with extra steps. We handle this through feature importance analysis and intentional feature engineering. The model's value comes from signals that CRM stage alone doesn't capture: interaction velocity, sentiment trajectories, stakeholder engagement breadth, competitor pressure. We regularly evaluate the model's feature importances and verify that non-CRM signals contribute meaningfully. If CRM stage dominates, it means our non-CRM features aren't informative enough---which is a data pipeline or feature engineering problem to fix, not a model problem."

---

## 3. Scoring Rubric

### Senior Engineer (L5/L6)

| Dimension | Expectations |
|-----------|-------------|
| Requirements | Identifies the dual nature (real-time + batch); scopes appropriately; asks about consent |
| Architecture | Clean event-driven pipeline; separates ASR/NLP/intelligence layers; identifies key data stores |
| Depth | Can go deep on at least one component (ASR pipeline OR forecasting OR deal scoring) |
| Scalability | Understands GPU scaling challenges; discusses cost optimization strategies |
| Trade-offs | Articulates 2--3 trade-offs with clear reasoning |

### Staff Engineer (L6+/L7)

All of the above, plus:

| Dimension | Expectations |
|-----------|-------------|
| System thinking | Sees the revenue graph as the unifying data model; understands cross-component dependencies |
| AI architecture | Explains the specialized model ensemble rationale; discusses calibration as a system, not a feature |
| Reliability | Discusses pipeline fault tolerance; understands the idempotency requirements of event-driven processing |
| Data governance | Proactively addresses consent, PII handling, data residency without being prompted |
| Operational excellence | Discusses model versioning, A/B testing for models, canary deployments for AI components |

---

## 4. Common Mistakes to Avoid

| Mistake | Why It's Problematic | Better Approach |
|---------|---------------------|-----------------|
| Treating it as a CRUD app with ML | Misses the streaming nature, the multi-model pipeline, and the event-driven architecture | Start with data flow: audio → transcript → annotations → signals → scores → forecasts |
| Focusing only on the ML model | The model is important but represents <20% of the engineering; the data pipeline and integrations dominate | Discuss the full pipeline: ingestion, processing, storage, serving, integration |
| Ignoring consent/compliance | Call recording without consent handling is illegal in many jurisdictions; shows lack of real-world awareness | Mention consent early and treat it as a hard constraint |
| Using a single model for all NLP | Doesn't scale economically at 60B inferences/day; also less accurate than specialized models | Explain the ensemble approach with cost/accuracy analysis |
| Forgetting the CRM integration complexity | The platform's value depends on insights appearing in the CRM where reps work; CRM sync is notoriously tricky | Discuss rate limits, conflict resolution, bi-directional sync challenges |
| Batch-only deal scoring | "Refresh scores nightly" means scores are stale by the time a manager reviews them | Near-real-time event-driven scoring with batch recalibration |
| Ignoring model calibration | Raw model probabilities are rarely calibrated; uncalibrated scores damage trust | Discuss Platt scaling, per-segment calibration, and continuous calibration monitoring |
| Over-engineering the first version | Trying to build the entire vision in V1 | Start with batch transcription + basic NLP + deal scoring; add real-time coaching and forecasting later |

---

## 5. Extension Topics (If Time Permits)

| Topic | Key Discussion Points |
|-------|---------------------|
| Multi-modal learning | Combining audio features (tone, pace, energy) with text features for richer sentiment analysis |
| Agentic AI for sales | AI agents that autonomously draft follow-up emails, update CRM, and prepare meeting briefs |
| Model Context Protocol (MCP) | Gong's approach to interoperability: exposing revenue intelligence to external AI systems |
| Federated learning | Training models across tenant data without centralizing sensitive data |
| Real-time coaching intervention | The UX challenge of surfacing coaching tips during a live call without being distracting |
| Revenue graph analytics | Graph neural networks for deal outcome prediction using relationship structure |
