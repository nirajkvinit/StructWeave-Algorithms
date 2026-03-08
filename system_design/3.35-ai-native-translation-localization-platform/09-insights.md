# Key Insights: AI-Native Translation & Localization Platform

## Insight 1: Neural Quality Estimation as the Routing Linchpin
**Category:** System Modeling
**One-liner:** The COMET-based QE model is the single most critical component because it determines which translations are auto-approved, lightly edited, or fully reworked by humans.
**Why it matters:** A miscalibrated QE model either over-approves (bad translations reach customers, damaging brand trust) or under-approves (excessive human review costs, defeating the purpose of MT). The QE pipeline uses XLM-RoBERTa to produce cross-lingual embeddings, extracts cosine similarity, element-wise product, and absolute difference features, then passes them through a regression head with Platt scaling calibration. Critically, the raw score undergoes per-language-pair offset correction (e.g., en-zh gets -0.05) and per-domain scaling (medical gets 0.95 multiplier) because QE models trained primarily on en-de systematically misjudge other pairs. Without this calibration layer, the same threshold produces wildly different quality outcomes across languages.

---

## Insight 2: NMT vs. LLM Engine Routing by Content Type
**Category:** Cost Optimization
**One-liner:** Route technical, repetitive content to fast NMT engines (<200ms, low cost) and creative, context-heavy content to LLM translation (500ms-2s, higher quality).
**Why it matters:** Using LLM for all content wastes 5-10x the cost on UI strings and technical documentation where NMT performs equally well. Using NMT for marketing copy and legal text loses nuance that only document-level LLM context windows can capture. The engine router analyzes content type, complexity score, glossary term presence, segment length, and language pair through a rule-based engine enhanced by an ML router with A/B test selection and cost optimization. The cost optimizer computes a quality-per-dollar score for each eligible engine and selects the best that fits within the budget constraint. This yields a content-aware cost structure where the average cost per word reflects the actual difficulty of the content.

---

## Insight 3: Two-Stage TM Fuzzy Matching with Hash Fast Path
**Category:** Caching
**One-liner:** Check an O(1) hash index for exact matches first, then fall back to ANN vector search with detailed reranking for fuzzy matches, achieving sub-50ms lookups across 500M+ segments.
**Why it matters:** TM lookup is on the critical path for every translation request. A 40% TM hit rate means 40% of translations are essentially free. The two-stage approach exploits the fact that exact matches (which are common in technical content with repeated phrases) can be resolved in <1ms via hash lookup, avoiding the 5-20ms cost of ANN search entirely. For fuzzy matches, HNSW retrieves top-50 candidates, which are then reranked using a weighted combination of Levenshtein distance, word overlap, and number/placeholder match. The reranking stage is critical because high vector similarity does not always correlate with high text similarity -- catching these false positives prevents poor fuzzy suggestions from wasting human editor time.

---

## Insight 4: Vector Quantization for TM Memory Management
**Category:** Scaling
**One-liner:** Product Quantization reduces the TM vector index from 1.5TB to 128GB, cutting required nodes from 8+ to 1-2 while preserving fuzzy match quality.
**Why it matters:** 500 million TM segments at 768 dimensions and 4 bytes per float require 1.5TB of raw vectors, plus HNSW index overhead totaling approximately 2TB. With 256GB per node, this requires 8+ nodes for redundancy. Product Quantization (PQ) with 256 subvectors compresses each segment's index entry to 256 bytes, reducing total size to 128GB and fitting on 1-2 nodes. This is not just a cost optimization but an operational simplification that reduces failure domains, replication complexity, and query fan-out. The accuracy trade-off is acceptable because the detailed reranking stage (Levenshtein + word overlap) catches any recall degradation from approximate search.

---

## Insight 5: Adaptive Learning from Human Corrections with Incremental Fine-Tuning
**Category:** Replication
**One-liner:** Aggregate human post-edit corrections and incrementally fine-tune NMT models within 24 hours, creating a continuous improvement loop that reduces the human edit ratio over time.
**Why it matters:** Unlike static MT systems that degrade as language evolves, the adaptive learning pipeline captures every human correction as training signal. The edit aggregator collects high-edit segments (where the human changed >20% of the MT output), clusters similar corrections, and feeds them to incremental training jobs. ModernMT and Language Weaver support real-time adaptive NMT natively. The key constraint is staleness management: corrections must be aggregated with sufficient volume to avoid overfitting to individual editor preferences, but applied quickly enough to prevent recurring errors. The target of <24 hours from correction to model update balances these concerns.

---

## Insight 6: Dynamic QE Thresholds Based on Editor Queue Depth
**Category:** Traffic Shaping
**One-liner:** When the human editor queue backs up, automatically raise the auto-approve threshold to reduce MTPE volume; when editors are idle, lower it to improve quality.
**Why it matters:** Fixed QE thresholds ignore the operational reality that editor availability fluctuates by time zone, language pair, and season. When queue depth exceeds targets or wait time approaches SLA limits, the system raises the auto-approve threshold (from 0.85 to, say, 0.88), sending fewer segments to human review. When editors are underutilized, it lowers the threshold (to 0.82), routing more segments for quality improvement. This creates a self-regulating system. The overflow strategy is tiered: internal editors first, then external translator pools, then overflow queues with auto-escalation rules. Predictive editor scheduling based on historical job patterns further smooths demand.

---

## Insight 7: Segment Batching for LLM Translation Latency Reduction
**Category:** Scaling
**One-liner:** Batch multiple segments into a single LLM call to reduce total latency from 2550ms (3 serial calls) to 1200ms (1 batched call) while preserving document-level context.
**Why it matters:** Per-segment LLM calls at 800-900ms each create compounding latency that quickly exceeds SLA targets. Batching segments into a single prompt with document context achieves 50%+ latency reduction because LLM inference has high fixed overhead (model loading, KV cache warmup) but scales sublinearly with input length. This also provides a translation quality benefit: the LLM sees surrounding segments and can maintain terminological consistency, handle cross-sentence references, and preserve document tone. The speculative NMT execution strategy runs NMT in parallel while the LLM call is pending, using the NMT result as a fallback if the LLM times out.

---

## Insight 8: State Machine for Segment Lifecycle to Prevent Race Conditions
**Category:** Atomicity
**One-liner:** Enforce a strict state machine (pending, translated, scored, auto_approved/assigned, in_progress, edited, approved) to prevent invalid transitions like scoring a segment while it is being edited.
**Why it matters:** Three distinct race conditions threaten segment integrity: concurrent TM updates from parallel jobs (solved by UPSERT with conflict resolution), editor assignment collisions (solved by optimistic locking with version check), and QE scoring during active human editing (solved by the state machine). The state machine defines VALID_TRANSITIONS and rejects any attempt to move a segment to a state not reachable from its current state. This prevents the subtle bug where a QE rescore overwrites a human edit, or two workers assign the same segment to different editors. The terminal "approved" state has no outgoing transitions, ensuring finality.

---

## Insight 9: Constrained Decoding for Terminology Enforcement
**Category:** Consistency
**One-liner:** Inject glossary terms into the NMT/LLM decoding process using constrained beam search to guarantee that brand-specific terminology appears in the translation output.
**Why it matters:** Standard MT treats terminology glossaries as post-hoc corrections, which often produces awkward phrasing when a glossary term is force-inserted into a fluent but incorrect translation. Constrained decoding integrates glossary terms directly into the beam search, ensuring the model generates output that naturally incorporates required terminology. This adds approximately 50ms of latency per segment but eliminates the need for terminology-specific post-editing, which is more expensive and slower. For brand voice consistency across 150+ language pairs and millions of translated words, this architectural choice prevents the long tail of brand-damaging mistranslations that accumulate in systems relying on post-hoc term replacement.
