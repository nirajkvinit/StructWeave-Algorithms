# Key Insights: AI-Native Document Processing Platform

## Insight 1: Hybrid Model Strategy with Confidence-Based Fallback
**Category:** Cost Optimization
**One-liner:** Route the easy 90% through cheap specialized models and reserve expensive foundation models for the hard 10%.
**Why it matters:** LayoutLMv3 processes a page in 50ms at zero marginal cost, while GPT-4V takes 2-3 seconds at $0.01/image. The hybrid extraction pipeline first attempts specialized extraction, then selectively sends only low-confidence fields to foundation models. This achieves 10x faster throughput and 100x lower cost on the common path while preserving quality on edge cases. The key architectural decision is per-field fallback rather than per-document, which avoids re-processing high-confidence fields through expensive models.

---

## Insight 2: Isotonic Regression for Confidence Calibration
**Category:** System Modeling
**One-liner:** Raw model confidence scores are systematically miscalibrated, so a learned calibration layer is essential for correct routing decisions.
**Why it matters:** A model reporting 95% confidence may only be correct 80% of the time. Without calibration, the confidence-based routing that underpins the entire pipeline (auto-approve vs. HITL) makes systematically wrong decisions. The system trains isotonic regression models per (model, field_type) pair using HITL feedback data, updated weekly. Additional adjustments for document quality and field-specific signals (e.g., presence of currency symbols) further refine scores. This is a non-obvious requirement that many IDP implementations overlook, leading to either excessive human review or silently bad extractions.

---

## Insight 3: Dynamic Confidence Thresholds Based on Queue Pressure
**Category:** Traffic Shaping
**One-liner:** When the human review queue is overwhelmed, automatically relax thresholds to reduce load; when idle, tighten them to improve quality.
**Why it matters:** Fixed confidence thresholds ignore operational reality. The dynamic threshold algorithm monitors queue depth, average review time, and reviewer capacity to compute an estimated clear time. When this exceeds 4 hours, thresholds drop by up to 0.05 (lowering standards slightly), and when the queue clears in under 30 minutes, thresholds rise by 0.02 (raising standards). Critically, the algorithm clamps thresholds within safe bounds (never below 0.80 for classification, 0.75 for extraction) to prevent quality collapse. This creates a self-regulating system that adapts to business-hour fluctuations and spike events.

---

## Insight 4: Event-Driven Architecture with Checkpoints for Agentic Pipelines
**Category:** Resilience
**One-liner:** Use Kafka-based event sourcing with per-stage checkpoints to make multi-agent document processing recoverable from any failure point.
**Why it matters:** The multi-agent pipeline (Parser, Classifier, Extractor, Validator, Exception Handler) introduces coordination complexity including race conditions, cascading failures, variable HITL latency, and resource contention. The event-driven pattern with checkpoints solves this by persisting state atomically at each stage boundary. On failure, the system loads the last checkpoint and resumes from the next stage rather than reprocessing from scratch. This is especially critical because HITL introduces minutes-to-hours delays, and losing that work to a downstream failure would be unacceptable.

---

## Insight 5: OCR Engine Routing Based on Document Characteristics
**Category:** Data Structures
**One-liner:** A decision tree routes documents to the optimal OCR engine based on detected characteristics (tables, handwriting, layout complexity, cost sensitivity).
**Why it matters:** No single OCR engine dominates across all document types. Tesseract is free but poor at handwriting (60%); Amazon Textract excels at tables and handwriting but costs $1.50/1K pages; DocTR handles complex layouts well. The routing strategy analyzes document characteristics before OCR begins and selects the engine accordingly. This avoids the common mistake of using a single engine for all content, which either wastes money on simple documents or produces poor results on complex ones. The pre-processing pipeline (deskew, denoise, binarize, DPI normalization) adds 5-10% accuracy improvement that compounds through the entire downstream pipeline.

---

## Insight 6: Optimistic Locking to Prevent Concurrent Document Corruption
**Category:** Contention
**One-liner:** Multiple agents updating the same document must use version-based optimistic locking to prevent silent data corruption.
**Why it matters:** In a multi-agent system, race conditions are pervasive: two agents may update shared document state simultaneously, model versions may change mid-processing, HITL feedback may arrive after auto-completion, and duplicate documents may be submitted. The system uses optimistic locking with a version field for all document updates, ensuring that conflicting writes are detected and retried rather than silently overwriting each other. Additional protections include pinning model versions per job, idempotency keys for deduplication, and snapshotting configuration per batch to prevent threshold changes from causing inconsistent routing within a single batch.

---

## Insight 7: Weighted Multi-Factor HITL Queue Prioritization
**Category:** Scaling
**One-liner:** Prioritize human review items using a weighted scoring function over SLA deadline, document value, field importance, confidence gap, age, and reviewer expertise.
**Why it matters:** Not all review items are equal. The system assigns weights ranging from 1.1x (age, to prevent starvation) to 3.0x (SLA deadline, to prevent breach penalties). The reviewer assignment algorithm further scores qualified reviewers across four dimensions: expertise match (0.3), current load (0.3), historical accuracy (0.25), and availability (0.15). This dual optimization ensures that the right reviewer handles the right document at the right time, which is critical because reviewer accuracy varies significantly by document type and experience level.

---

## Insight 8: GPU Batch Optimization with Model-Aware Scheduling
**Category:** Scaling
**One-liner:** Group pending inference requests by model type and compute optimal batch sizes based on available GPU memory, then prioritize by SLA urgency.
**Why it matters:** GPU saturation is the highest-severity bottleneck in the system. The optimization algorithm groups requests by model type (each model has a fixed memory footprint), calculates the maximum batch size that fits in remaining GPU memory, caps at 32 to balance latency and throughput, and then sorts batches by the most urgent SLA deadline. This avoids the common pattern of FIFO processing that can cause SLA breaches for urgent documents while GPUs process large batches of low-priority ones.
