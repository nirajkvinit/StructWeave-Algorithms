# 12.20 AI-Native Recruitment Platform — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **Multi-source candidate sourcing** — Crawl professional networks, open web, and internal ATS history to discover candidates; deduplicate across sources; respect opt-outs and do-not-contact flags | Produces enriched candidate profile records even before application |
| FR-02 | **Semantic candidate-job matching** — Rank candidates against job requisitions using skills-graph embedding similarity and a learned compatibility model | Match score computed at application and continuously re-ranked as new candidate signals arrive |
| FR-03 | **Conversational recruiting chatbot** — Engage candidates 24/7 over multiple channels (web chat, SMS, email, WhatsApp) for FAQ resolution, initial screening, and interview scheduling | Multi-turn dialogue state persisted across channel switches and time gaps |
| FR-04 | **Adaptive skills assessment** — Administer structured assessments (technical, behavioral, situational) with IRT-driven question difficulty adaptation | Assessment type and length configurable per role and seniority; proctoring integration optional |
| FR-05 | **Asynchronous video interview analysis** — Accept candidate-recorded video responses; extract ASR transcription, NLP coherence scores, domain vocabulary coverage, and speech fluency metrics | No facial expression or emotion scoring; structured competency signal output only |
| FR-06 | **Structured interview guide generation** — Generate role-specific, competency-anchored interview question sets with scoring rubrics for live human interviews | Questions generated from skills graph + role requirements; no direct resume copy |
| FR-07 | **Bias monitoring and adverse impact analysis** — Continuously compute selection rate ratios per demographic group per pipeline stage; alert on 4/5ths-rule violation; provide auditable bias report | Runs per decision batch; supports intersectional category analysis |
| FR-08 | **Candidate notice and consent management** — Provide candidates with pre-AEDT disclosure, opt-out mechanism, and alternative assessment pathway | NYC LL144 and GDPR/CCPA compliance |
| FR-09 | **Talent pool management** — Maintain candidate records across time; support re-engagement campaigns; track candidate opt-in and opt-out states; apply staleness decay to scores | Long-term talent relationship management |
| FR-10 | **Recruiter workflow dashboard** — Surface AI-ranked shortlists, candidate match explanations, assessment summaries, and interview analysis reports to recruiters | Explainability layer required; raw model scores surfaced alongside feature attribution |
| FR-11 | **Hiring manager collaboration** — Allow hiring managers to calibrate role requirements, provide feedback on shortlists, and submit structured interview ratings | Feedback ingested as training signal for compatibility model |
| FR-12 | **Compliance reporting** — Generate annual bias audit report (NYC LL144 format), EEOC EEO-1 selection rate report, and on-demand EU AI Act system documentation | Machine-readable export formats required |
| FR-13 | **Data subject rights fulfillment** — Support GDPR/CCPA right to access, right to erasure, and data portability requests within regulatory deadlines | Erasure must propagate to all subsystems including model training datasets |
| FR-14 | **ATS integration** — Bidirectional integration with external applicant tracking systems (Workday, Greenhouse, Lever, iCIMS) via standardized HR-XML / HRIS APIs | Requisition sync, candidate stage updates, and disposition codes pushed to ATS |

---

## Out of Scope

- **Compensation benchmarking** — Salary range analysis and offer generation (separate total rewards system)
- **Onboarding orchestration** — Post-hire onboarding workflows and document management
- **Background screening** — Third-party background check integration (separate vendor service)
- **Performance management** — Tracking employee performance post-hire (separate HRIS)
- **Internal mobility matching** — Lateral move recommendations for existing employees (separate internal mobility module, though shares skills graph)
- **Facial expression or emotion analysis** — Legally prohibited in growing number of jurisdictions; excluded entirely

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Candidate matching ranking latency (p99) | ≤ 2 s | Recruiter-facing shortlist must render quickly |
| Conversational AI response latency (p95) | ≤ 800 ms | Chatbot feels unresponsive beyond 1 second |
| Video interview analysis turnaround | ≤ 30 min from submission | Candidate expects feedback within hours |
| Assessment adaptive question selection | ≤ 200 ms per question | Live assessment experience |
| Bias monitoring batch cycle | ≤ 5 min from decision batch close | Alert must precede outreach trigger |
| Sourcing crawler enrichment latency | ≤ 24 h from crawl to indexed candidate | Acceptable for proactive sourcing use case |

### Reliability & Availability

| Metric | Target |
|---|---|
| Platform availability | 99.9% (≤ 43 min downtime/month) |
| Conversational AI availability | 99.95% (24/7 candidate-facing) |
| Video analysis pipeline durability | No submission loss; at-least-once processing |
| Audit log durability | 99.9999999% (9 nines); 7-year retention |

### Scalability

| Metric | Target |
|---|---|
| Active requisitions | 100,000 simultaneous across enterprise customers |
| Candidate profiles in graph | 500M unique profiles |
| Daily candidate matching operations | 10M match computations per day |
| Concurrent conversational sessions | 500,000 simultaneous dialogue sessions |
| Video submissions per day | 500,000 video interview submissions |
| Assessment sessions per day | 1M active assessment sessions |

### Security & Compliance

| Requirement | Specification |
|---|---|
| Demographic data handling | Collected only for bias monitoring; stored separately from matching features with restricted access |
| GDPR erasure | Data subject erasure request fulfilled within 30 days; propagates to model training sets via anonymization |
| NYC LL144 | Annual independent bias audit completed and published before AEDT is used in NYC; candidate notice ≥ 10 business days before AEDT application |
| EU AI Act | High-risk AI system registration; technical documentation; human oversight mechanism; quality management system |
| Model audit trail | Every model prediction logged with model version, input feature hash, and output score; retained 7 years |

---

## Capacity Estimations

### Candidate Profile Volume

**Assumptions:**
- 500M candidate profiles in the graph (combination of sourced and applied)
- 10M new or updated profiles per day (crawl updates + new applications)
- Each profile: ~5 KB structured record + ~2 KB embedding vector (1536-dimensional float32)

```
Profile store size:
  500M × (5 KB + 2 KB) = 3.5 TB structured data + embedding store

Embedding store:
  500M × 1536 × 4 bytes = ~3 TB float32 vectors
  Compressed (int8 quantization, 4x reduction): ~750 GB indexed in vector DB

Daily profile update throughput:
  10M updates/day = ~116 updates/sec (baseline)
  Peak (Monday morning hiring surge): 5x = ~580 updates/sec
```

### Matching Engine

```
Matching operations:
  100,000 active requisitions × 100 new applications/day = 10M match ops/day
  = ~116 match ops/sec baseline; ~580/sec peak

Per match operation:
  Embedding retrieval: ~1 ms (vector DB ANN lookup)
  Compatibility model inference: ~10 ms (dense layer on feature vector)
  Ranking sort (top-K): ~1 ms
  Total per match: ~12 ms → well within 2s p99 SLO at current scale

ANN index maintenance:
  10M profile updates/day → incremental HNSW index update: ~5 ms/update
  Total update throughput: 116 updates/sec × 5 ms = 580 ms/sec → single-threaded bottleneck
  Solution: Batched HNSW rebuild every 15 min; serve stale index during rebuild
```

### Conversational AI

```
500,000 concurrent sessions:
  Average session: 10 turns, 2 min/turn gap → 20 min total session duration
  Turns per second: 500,000 sessions / (2 × 60 sec) = ~4,167 turns/sec

LLM inference cost:
  Intent classification: ~5 ms (distilled model, on-device or small GPU)
  Response generation: ~300 ms (LLM API call)
  Slot filling + calendar lookup: ~200 ms
  Total: ~505 ms → within 800 ms p95 target

GPU fleet for conversational AI:
  4,167 turns/sec × 300 ms LLM latency = 1,250 concurrent LLM inferences
  Per GPU: ~50 concurrent inferences (batch inference)
  GPUs needed: 1,250 / 50 = 25 GPUs for conversational LLM
  With 2x headroom: 50 GPUs
```

### Video Interview Analysis

```
500,000 video submissions/day = ~5.8 videos/sec

Per video (average 10 min):
  ASR transcription: ~2 min processing time (2× faster than real time)
  NLP coherence scoring: ~30 sec (transformer inference on transcript)
  Domain vocabulary extraction: ~10 sec
  Report generation: ~5 sec
  Total: ~2 min 45 sec per video (well within 30-min SLO)

Parallelism needed:
  5.8 videos/sec × 165 sec processing = 957 videos being processed at once
  With 4x surge headroom: 4,000 concurrent video analysis workers

Storage:
  Each video: 200 MB (raw) → stored 90 days, then deleted
  Per day: 500,000 × 200 MB = 100 TB raw video storage (rolling 90-day window)
  Peak rolling window: 100 TB × 90 = 9 PB raw video (heavy lifecycle management needed)
  Transcripts + analysis reports: 500,000 × 50 KB = 25 GB/day → ~9 TB/year (permanent)
```

### Assessment Engine

```
1M active assessment sessions/day = ~11.6 sessions/sec

Per question selection:
  IRT scoring: ~5 ms (logistic model computation)
  Next-item selection (maximum information criterion): ~10 ms (iterate 50-item candidate pool)
  Total: ~15 ms per question → within 200 ms target

Question bank size:
  50,000 calibrated items across all domains and difficulty levels
  Item parameters: 50 bytes each → ~2.5 MB (fits entirely in memory)
```

### Storage Summary

```
Candidate profile store:    ~3.5 TB structured + ~750 GB embeddings → ~4.25 TB
Audit log (7-year):         10M decisions/day × 1 KB = 10 GB/day → ~26 TB/year → ~182 TB at 7 years
Video storage (90-day):     Rolling 9 PB (managed with tiered storage and lifecycle deletion)
Assessment results:         1M × 5 KB = 5 GB/day → ~1.8 TB/year
Conversation logs:          500K sessions × 10 KB = 5 GB/day → ~1.8 TB/year
```

---

## SLO Summary

| SLO | Target | Measurement Window |
|---|---|---|
| Matching ranking p99 | ≤ 2 s | Rolling 1-hour |
| Conversational AI response p95 | ≤ 800 ms | Rolling 1-hour |
| Video analysis turnaround p95 | ≤ 30 min | Daily |
| Bias monitoring cycle time | ≤ 5 min | Per decision batch |
| GDPR erasure fulfillment | 100% within 30 days | Per request |
| NYC LL144 candidate notice | 100% ≥ 10 business days before AEDT use | Per candidate |
| Platform availability | 99.9% | Monthly |
| Audit log durability | 99.9999999% | Continuous |
