# Interview Guide

## Interview Pacing (45-minute format)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify | Understand requirements, scope | Ask about scale, document types, accuracy needs |
| **5-15 min** | High-Level Design | Core architecture, data flow | Draw pipeline, identify components |
| **15-30 min** | Deep Dive | 1-2 critical components | OCR strategy, extraction models, HITL |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failure scenarios | Discuss specific numbers and decisions |
| **40-45 min** | Wrap Up | Summary, handle follow-ups | Highlight key decisions and trade-offs |

---

## Phase 1: Clarifying Questions

### Questions to Ask the Interviewer

**Scale & Volume:**
- "What's the expected document volume - thousands or millions per day?"
- "What's the peak vs average ratio? Month-end spikes?"
- "How many pages per document on average?"

**Document Characteristics:**
- "What types of documents - invoices, contracts, forms, medical records?"
- "What's the quality distribution - clean digital vs poor scans vs handwritten?"
- "How many unique document types need to be supported?"

**Accuracy Requirements:**
- "What accuracy is acceptable - 90%, 95%, 99%?"
- "Is human review acceptable for low-confidence results?"
- "Which fields are most critical (e.g., amounts must be exact)?"

**Integration & Compliance:**
- "What downstream systems need the extracted data - ERP, CRM?"
- "Is this regulated data - HIPAA, PCI, GDPR?"
- "What's the retention requirement - 1 year, 7 years?"

**Latency:**
- "What's the acceptable processing time - seconds, minutes, hours?"
- "Is real-time needed or is batch overnight acceptable?"

### Scoping Statement

After clarifying, summarize:

> "Let me confirm: We're building an IDP platform to process 500K invoices per day, extracting 20 fields per document. We need 95% extraction accuracy with HITL for corrections, integrating with SAP via webhooks. The data contains financial PII, so GDPR compliance is required with 7-year retention. Processing should complete within 5 minutes per document. Does that match your expectations?"

---

## Phase 2: High-Level Design

### Key Points to Cover

#### 1. Multi-Stage Pipeline

> "Documents flow through distinct stages: ingestion, pre-processing, OCR, classification, extraction, validation, and export. Each stage has its own queue and can scale independently. This allows us to optimize each stage differently - OCR is GPU-bound while validation is CPU-bound."

#### 2. Hybrid AI Strategy

> "We use a two-tier model approach. Specialized models like LayoutLMv3 handle 80% of documents - they're fast (50ms), cheap (free/self-hosted), and can run on-prem. For the 20% where specialized models have low confidence, we fall back to foundation models like GPT-4V. This gives us speed and cost efficiency for common cases, while handling edge cases accurately."

#### 3. Confidence-Based Routing

> "Every extraction comes with a confidence score. Above 90%, we auto-approve. Between 70-90%, we route to HITL for review. Below 70%, we reject or escalate. These thresholds are configurable per field and document type - we might be stricter for 'total_amount' than 'vendor_address'."

#### 4. Human-in-the-Loop Integration

> "HITL isn't just error correction - it's a feedback loop. Corrections feed back into model training, improving accuracy over time. We use a priority queue so urgent documents and high-value fields get reviewed first. The goal is to progressively reduce HITL rate as the system learns."

### Architecture Sketch

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Ingestion  │────▶│ Pre-Process │────▶│    OCR      │
│  (Multi-    │     │  (Deskew,   │     │ (Tesseract/ │
│   channel)  │     │   enhance)  │     │  Textract)  │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Export    │◀────│  Validation │◀────│ Extraction  │
│  (Webhook,  │     │  (Rules +   │     │ (LayoutLM/  │
│   ERP)      │     │   Anomaly)  │     │   GPT-4V)   │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                   │                   │
       │            ┌──────┴──────┐            │
       │            ▼             ▼            │
       │     ┌───────────────────────────┐    │
       └─────│      HITL Queue           │◀───┘
             │  (Confidence < threshold) │
             └───────────────────────────┘
```

---

## Phase 3: Deep Dive Options

### Option A: OCR Strategy Deep Dive

**If interviewer asks about OCR:**

> "OCR is foundational - errors here compound through the pipeline. We use a multi-engine approach:
>
> - **Tesseract** for clean, digital documents - it's fast and free
> - **Amazon Textract** for tables and forms - best-in-class for structured data
> - **Textract or specialized models** for handwriting
>
> We route based on document characteristics detected in pre-processing. Quality scores help us decide - a blurry fax gets different treatment than a digital PDF.
>
> Pre-processing is critical: deskewing can improve accuracy by 5-10%, and DPI normalization helps with low-quality scans. We also cache OCR results by content hash to avoid re-processing duplicate pages."

### Option B: Extraction Accuracy Deep Dive

**If interviewer asks about extraction:**

> "Extraction accuracy depends on matching the right model to the right task:
>
> - **LayoutLMv3** for structured fields like invoice numbers, dates, amounts - it understands text position
> - **Donut** for end-to-end extraction when layout varies
> - **GPT-4V** for complex or novel documents where specialized models fail
>
> Key insight: specialized models are 10x faster and 100x cheaper than foundation models. But they need training data. So we use foundation models as a fallback and to bootstrap training data for new document types.
>
> Confidence calibration is crucial - models often overestimate confidence. We use isotonic regression trained on HITL feedback to calibrate scores so a '90% confidence' actually means 90% correct."

### Option C: Agentic Workflow Deep Dive

**If interviewer asks about complex document handling:**

> "For complex documents, we use a multi-agent approach:
>
> - **Parser Agent** understands document structure - sections, tables, headers
> - **Classifier Agent** determines document type
> - **Extractor Agent** pulls specific fields based on schema
> - **Validator Agent** checks business rules
> - **Exception Agent** handles failures
>
> A coordinator orchestrates these agents, managing state and retries. This separation lets us:
> 1. Retry individual components without restarting
> 2. Add specialized agents for new capabilities
> 3. Scale different agents independently
>
> The key challenge is handling HITL latency - humans might take minutes or hours. We use async events and checkpointing so no document blocks others."

---

## Phase 4: Scale & Trade-offs

### Scaling Discussion

> "Let's think about bottlenecks at 1M documents/day:
>
> - **OCR is GPU-bound**: At 60 pages/second, we need ~30-40 GPUs. We batch for efficiency and use spot instances to reduce cost.
>
> - **Foundation model calls are expensive**: At $0.01/image and 20% fallback rate, that's 200K calls/day = $2K/day. We cache results and continuously train specialized models to reduce fallback rate.
>
> - **HITL can become a bottleneck**: If 20% need review, that's 200K items/day. At 2 minutes each, we need ~700 reviewer-hours. We use dynamic thresholds - if queue grows, we temporarily accept slightly lower accuracy to maintain throughput."

### Trade-off Discussion

| Decision | Option A | Option B | Our Choice |
|----------|----------|----------|------------|
| **Model Strategy** | Foundation only: flexible, expensive | Specialized only: fast, limited | **Hybrid**: Use specialized + foundation fallback |
| **Processing Mode** | Sync: simple, blocking | Async: scalable, complex | **Async**: Handle variable latency |
| **HITL Integration** | Strict (all uncertain) | Relaxed (high confidence only) | **Dynamic thresholds**: Adapt to queue |
| **Storage** | Single tier: simple | Multi-tier: cost-optimized | **Multi-tier**: 7-year retention requires cost optimization |

---

## Trap Questions and Responses

### Trap 1: "Why not just use GPT-4V for everything?"

**What interviewer wants:** Understanding of cost, latency, and privacy trade-offs.

**Response:**
> "GPT-4V is excellent but has limitations:
> 1. **Cost**: At $0.01/image, 1M documents × 5 pages = $50K/day. Specialized models are essentially free.
> 2. **Latency**: 2-3 seconds per page vs 50ms for specialized models.
> 3. **Privacy**: Some customers can't send documents to external APIs - HIPAA, financial data.
> 4. **Reliability**: External API dependency vs self-hosted models.
>
> We use GPT-4V as a fallback for edge cases, not as the primary engine. This hybrid approach gives us 80% cost savings with minimal accuracy loss."

### Trap 2: "How do you handle completely new document types?"

**What interviewer wants:** Adaptability, zero-shot learning understanding.

**Response:**
> "New document types are where foundation models shine. Our approach:
> 1. **Zero-shot classification**: CLIP/GPT-4V can classify without training
> 2. **Few-shot extraction**: Give GPT-4V a schema and examples in the prompt
> 3. **Active learning**: Flag low-confidence documents for human labeling
> 4. **Continuous training**: Once we have 50-100 labeled examples, train a specialized model
>
> The system automatically improves - we start with 70% accuracy on new types and improve to 95%+ as we collect training data."

### Trap 3: "What if the human reviewers are slow or unavailable?"

**What interviewer wants:** Graceful degradation, business continuity.

**Response:**
> "HITL unavailability is a real production concern. We handle it with:
> 1. **Dynamic thresholds**: If queue grows, we raise auto-approve thresholds slightly, accepting marginally lower accuracy for throughput
> 2. **Priority queues**: High-value documents get reviewed first
> 3. **SLA deadlines**: Items close to SLA breach get elevated
> 4. **Graceful degradation**: In extreme cases, auto-approve > 85% confidence and queue the rest
>
> We monitor touchless rate and HITL backlog as key metrics. If HITL queue exceeds 500 items, we alert and can temporarily adjust thresholds."

### Trap 4: "How do you ensure extraction quality doesn't degrade over time?"

**What interviewer wants:** Continuous monitoring, feedback loops.

**Response:**
> "Model drift is a real risk. We monitor and prevent it through:
> 1. **Confidence tracking**: If average confidence drops, something changed
> 2. **HITL correction rate**: Rising correction rate indicates model issues
> 3. **A/B testing**: New models run alongside old ones before full deployment
> 4. **Continuous calibration**: Calibrate confidence scores weekly using recent HITL data
> 5. **Periodic audits**: Sample 1% of auto-approved documents for manual verification
>
> We catch drift early - a 2% drop in accuracy triggers an alert before it compounds."

---

## Key Numbers to Know

| Metric | Value | Context |
|--------|-------|---------|
| **Touchless rate (good)** | 50-80% | Industry benchmark for mature IDP |
| **Classification accuracy** | 94-98% | With proper training |
| **Extraction accuracy (pre-HITL)** | 85-92% | Depends on document quality |
| **Extraction accuracy (post-HITL)** | 95%+ | With human corrections |
| **OCR cost (Textract)** | $1.50/1K pages | Cloud pricing |
| **GPT-4V cost** | $0.01/image | Per page |
| **LayoutLMv3 inference** | 50ms/page | On GPU |
| **Processing time reduction** | 50-80% | vs manual processing |
| **Typical HITL review time** | 30s - 3min | Per document |
| **Document processing latency** | 5-30s | Single page, end-to-end |

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| **No fallback for LLM** | Single point of failure | Hybrid with specialized models |
| **Fixed confidence thresholds** | Can't adapt to volume | Dynamic thresholds based on queue |
| **No feedback loop** | Model degrades over time | HITL corrections feed training |
| **Ignoring document quality** | OCR fails on poor scans | Pre-processing pipeline |
| **Monolithic pipeline** | Can't scale independently | Microservices with queues |
| **No caching** | Duplicate processing, cost | Cache OCR by content hash |
| **Sync processing** | Blocks on HITL | Async with checkpoints |
| **Ignoring compliance** | Legal issues | PII detection, audit trails |

---

## Quick Reference Card

```
+-------------------------------------------------------------------------+
|            AI-NATIVE IDP PLATFORM - QUICK REFERENCE                      |
+-------------------------------------------------------------------------+
|                                                                          |
|  PIPELINE STAGES                    MODEL STRATEGY                       |
|  ---------------                    --------------                       |
|  1. Ingestion (multi-channel)       Primary: LayoutLMv3, Donut          |
|  2. Pre-processing (deskew, etc)    Fallback: GPT-4V, Claude            |
|  3. OCR (Tesseract/Textract)        Selection: By confidence threshold  |
|  4. Classification                                                       |
|  5. Extraction                      CONFIDENCE ROUTING                   |
|  6. Validation                      -------------------                  |
|  7. HITL (if needed)                > 90%: Auto-approve                 |
|  8. Export                          70-90%: Review                       |
|                                     < 70%: Reject/Escalate              |
|                                                                          |
|  OCR ENGINE SELECTION               KEY METRICS                          |
|  --------------------               -----------                          |
|  Digital PDF: Tesseract             Touchless rate: 50-80%              |
|  Tables/Forms: Textract             Classification: 94-98%              |
|  Handwriting: Textract/Azure        Extraction: 95%+ (with HITL)        |
|  Complex: DocTR                     Processing: 50-80% time saved       |
|                                                                          |
|  SCALING BOTTLENECKS                TRADE-OFFS                           |
|  -------------------                ----------                           |
|  GPU saturation: Add GPUs           Cost vs Accuracy                    |
|  LLM rate limits: Caching, batch    Speed vs Accuracy                   |
|  HITL backlog: Dynamic thresholds   Privacy vs Capability               |
|  DB writes: Batch inserts           Sync vs Async                       |
|                                                                          |
|  COMPLIANCE                         COSTS (1M docs/day)                  |
|  ----------                         ------------------                   |
|  PII detection: NER + Regex         GPU (40 A10G): $43K/mo              |
|  Redaction: Configurable policy     Storage: $7K/mo                     |
|  Audit: Immutable logs, 7yr         LLM APIs: $2K/mo                    |
|  GDPR: Right to erasure             Total: ~$60K/mo                     |
|                                     Cost/doc: ~$0.07                     |
|                                                                          |
+-------------------------------------------------------------------------+
|  INTERVIEW KEYWORDS                                                      |
|  ------------------                                                      |
|  LayoutLMv3, Donut, Pix2Struct, OCR, confidence threshold, HITL,        |
|  agentic workflow, multi-agent, feedback loop, active learning,         |
|  touchless rate, extraction accuracy, confidence calibration,           |
|  dynamic thresholds, PII redaction, audit trail, GDPR, HIPAA            |
+-------------------------------------------------------------------------+
```

---

## Follow-up Questions You Might Get

| Question | Key Points to Cover |
|----------|---------------------|
| "How would you handle 10x scale?" | Horizontal scaling, GPU auto-scaling, caching, reduce foundation model usage |
| "What if a critical component fails?" | Circuit breakers, graceful degradation, fallback models |
| "How do you handle multi-language?" | Language detection, language-specific OCR, multilingual models |
| "What about document versioning?" | Store all versions, track changes, audit trail |
| "How do you onboard new customers?" | Schema definition, initial training, threshold tuning |
| "What's the cold start experience?" | Zero-shot for classification, few-shot for extraction, rapid improvement |

---

## Related Systems to Mention

If time permits or interviewer asks:

- **RAG System**: IDP feeds extracted content into RAG for document Q&A
- **Vector Database**: Store document embeddings for similarity search and deduplication
- **Feature Store**: Store extracted features for downstream ML models
- **Multi-Agent Platform**: IDP agents can be part of larger agentic workflows
