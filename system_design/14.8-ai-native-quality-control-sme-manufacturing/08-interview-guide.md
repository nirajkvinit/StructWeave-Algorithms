# 14.8 AI-Native Quality Control for SME Manufacturing — Interview Guide

## 45-Minute Interview Pacing

```
0:00 - 0:05  Problem Framing & Requirements (5 min)
0:05 - 0:15  High-Level Architecture (10 min)
0:15 - 0:30  Deep Dive: Core Components (15 min)
0:30 - 0:40  Scalability, Reliability, and Trade-offs (10 min)
0:40 - 0:45  Extensions and Wrap-up (5 min)
```

---

## Phase 1: Problem Framing (0:00 - 0:05)

### What the Interviewer Wants to Hear

The candidate should immediately identify the key tension: this is a **real-time ML inference system running on severely constrained hardware** in an **uncontrolled physical environment**, serving **non-technical operators** who need **production-grade accuracy** with **minimal training data**.

### Strong Opening (2-3 minutes)

A strong candidate frames the problem along these axes:

1. **Real-time constraint**: Parts move at 10-120/minute; the entire capture-infer-decide pipeline must complete within one cycle time (500 ms at 120/min), with inference typically budgeted at 50-100 ms.

2. **Edge inference constraint**: Models must run on $35-$150 devices with 2-8 TOPS, not cloud GPUs with 300+ TOPS. This limits model complexity to ~5-10M parameters at INT8 precision.

3. **Data scarcity**: Factory may have 20-50 defect examples (defects are rare); the system must reach >95% recall from this tiny dataset through transfer learning, augmentation, and synthetic generation.

4. **Environmental hostility**: Factory floor conditions (dust, vibration, temperature, variable lighting) destroy assumptions that work in lab settings.

5. **Operator accessibility**: Quality managers, not ML engineers, must train and manage models—requiring a no-code interface that hides all ML complexity.

### Weak Opening (Red Flags)

- Immediately jumping to "use a cloud GPU and upload images via WiFi" (ignores latency and reliability)
- Treating this as a standard image classification problem without discussing the edge inference constraints
- Not mentioning the few-shot learning challenge
- Ignoring the physical environment (lighting, triggering, camera selection)

### Key Questions to Establish Requirements

| Question | What It Reveals |
|---|---|
| "What's the line speed?" | Determines the latency budget; candidate who asks this understands the physical constraint |
| "What types of defects?" | Surface vs. structural vs. dimensional; determines model architecture (classification vs. detection vs. segmentation) |
| "How many defect examples are available?" | Few-shot learning awareness; candidate should be concerned about 20-50 examples |
| "What edge hardware is the target?" | Shows understanding that model architecture must match hardware capabilities |
| "Does the line stop if inspection is down?" | Reliability requirement; shapes fault tolerance design |

---

## Phase 2: High-Level Architecture (0:05 - 0:15)

### Expected Architecture

The candidate should propose a **hub-and-spoke edge-cloud hybrid**:

```
Edge (Spoke): Camera → Edge Device → [Capture → Preprocess → Infer → Decide → Actuate]
                                                    ↕ (async)
Cloud (Hub):  Training Pipeline ← Image Upload ← Factory Gateway → Analytics Dashboard
              Model Registry → Deployment Orchestrator → Factory Gateway → Edge Devices
```

### Critical Design Decisions

| Decision | Strong Answer | Weak Answer |
|---|---|---|
| Where does inference run? | On-edge, always. Zero cloud dependency for real-time inspection. Cloud is for training and analytics only. | "Upload images to cloud for inference" (fails on latency, reliability, bandwidth, cost) |
| How is the camera triggered? | Hardware trigger (photoelectric sensor/encoder) for deterministic timing. | "Software timer" or "analyze video stream" (non-deterministic, wastes compute) |
| How do models reach edge devices? | OTA via factory gateway with shadow mode validation before promotion. | "SSH into each device and copy the model" (doesn't scale, no safety net) |
| How to handle network outages? | Full offline operation; inspection never depends on connectivity. Local SQLite for logging, 48h buffer for images. | "Inspect only when connected" (unacceptable for manufacturing) |

### Architecture Depth Probes

**Probe**: "Why not run inference on the factory gateway instead of individual edge devices?"

**Strong answer**: Gateway-based inference introduces network hops in the critical path (camera → edge → gateway → edge → actuation), adding 5-20 ms of network latency plus contention when multiple stations infer simultaneously. Each station needs dedicated, deterministic compute. The gateway serves aggregation and routing, not inference.

**Probe**: "How do you handle a factory with 3 different product types on 3 different lines?"

**Strong answer**: Each line gets its own model (product-specific). When a line changes products, the edge device swaps to the appropriate model. Smart approach: keep 2-3 models in memory and pointer-swap; smarter: integrate with PLC/MES to auto-detect product changeover and preload the next model.

---

## Phase 3: Deep Dive (0:15 - 0:30)

The interviewer should pick 1-2 of these topics based on the role (ML infrastructure vs. systems vs. full-stack):

### Deep Dive Option A: Edge Inference Pipeline

**Probe**: "Walk me through exactly what happens from the moment a part enters the inspection zone to the moment it's rejected."

**Expected answer (with timing)**:
1. Photoelectric sensor breaks → hardware interrupt (< 1 ms)
2. Camera captures with controlled exposure (1-5 ms)
3. Frame transferred to device memory (5-10 ms)
4. Preprocessing: white balance, ROI crop, resize, normalize, quantize (5-10 ms)
5. NPU inference on INT8 model (30-80 ms)
6. Postprocessing: decode detections, NMS, apply thresholds (2-5 ms)
7. GPIO actuation for reject mechanism (1-5 ms)
8. Async: log to SQLite + save image (non-blocking)

Total: 50-115 ms within 150 ms budget.

**Follow-up probe**: "The defect is a 0.5 mm scratch on a 100 mm part. Your model input is 416×416. How do you detect it?"

**Strong answer**: At native camera resolution (2048×1536), the scratch is ~8 pixels wide. After resize to 416×416, it's ~1.7 pixels—below detection threshold. Solutions: (1) ROI cropping to just the relevant area before resize, (2) tiled inference (overlapping crops at native resolution, merged via NMS), (3) choosing camera optics that fill the frame with the part to maximize pixel density. Best approach depends on part size and positioning repeatability.

**Red flag**: Not recognizing the resolution problem or suggesting "just use a higher resolution model" without considering the memory/latency implications.

### Deep Dive Option B: No-Code Training Pipeline

**Probe**: "An operator has 50 good images and 25 scratch images. How do you train a model that achieves >95% recall?"

**Expected answer**:
1. Data augmentation: geometric (rotation, flip, scale) + photometric (brightness, contrast) → 10-20x expansion
2. Synthetic defect generation: extract scratch regions, paste onto different good backgrounds with Poisson blending → 5-10x more defect examples
3. Transfer learning from domain pre-trained backbone (not ImageNet—domain-specific surface inspection backbone)
4. Progressive training: freeze backbone, train head → unfreeze, fine-tune with lower LR
5. Focal loss to handle class imbalance
6. Per-class threshold tuning: set scratch reject threshold at 0.5 (lower than default) to maximize recall, accepting slightly higher FPR

**Follow-up probe**: "How does the operator know if the model is good enough?"

**Strong answer**: Show validation results in operator language: "This model catches 96 out of 100 scratches (96% catch rate). It incorrectly rejects 2 out of 100 good parts (2% false reject rate). Here are the 4 scratches it missed [show images]—are these acceptable misses?" NOT: "Precision: 0.97, Recall: 0.96, F1: 0.965, AUC-ROC: 0.992."

### Deep Dive Option C: Model Deployment Safety

**Probe**: "You've trained a new model. How do you deploy it without risking a quality incident?"

**Expected answer**:
1. Validation gate: model must pass accuracy threshold on held-out test set
2. Shadow deployment: new model runs in parallel on live production, logging predictions but not actuating. Production model continues making real decisions.
3. After N shadow inspections (e.g., 500), compare shadow vs. production performance
4. Auto-promote if shadow model is better; discard if not
5. Post-promotion monitoring: track defect rate, FPR, confidence distribution for regression
6. Instant rollback: previous model kept in memory for < 1 second swap
7. Factory-wide rollback if multiple stations degrade simultaneously

**Red flag**: "Just deploy it and monitor" without shadow mode or rollback capability.

---

## Phase 4: Scalability & Trade-offs (0:30 - 0:40)

### Scaling Questions

**Q**: "How does the system scale from 10 stations to 10,000 stations?"

**Expected**: Edge tier scales linearly (each station is independent). Cloud challenges are: training GPU contention (queue + priority scheduling + spot instances), image storage (tiered storage: hot/warm/cold), and analytics (time-series DB partitioned by tenant + time).

**Q**: "What happens when a tenant has 200 stations across 5 factories and wants one dashboard view?"

**Expected**: Factory gateways aggregate per-factory; cloud aggregates across factories. Dashboard queries are tenant-scoped. Time-series DB optimized for tenant + time range queries. Pre-computed aggregates for common views (daily summary, weekly trend).

### Trade-off Questions

**Q**: "You can improve defect recall from 95% to 98%, but it increases false positives from 2% to 5%. Should you?"

**Strong answer**: It depends on the defect type and industry. For safety-critical defects (structural cracks in automotive parts): absolutely yes—the cost of a missed defect (recall, liability, customer injury) far outweighs the cost of false rejects (material waste). For cosmetic defects (minor discoloration on packaging): probably no—5% false rejects means 5 out of 100 good parts are wasted, and the missed cosmetic defects don't cause safety issues. The system should support per-defect-class threshold tuning to make this trade-off explicit.

**Q**: "A customer wants to use a $15 Raspberry Pi Zero instead of a $100 edge AI module. Can you support it?"

**Strong answer**: The Pi Zero has no NPU and minimal CPU. Options: (1) very small classification model (MobileNetV3-Small at 224×224, running on CPU at ~200-500 ms—may be too slow for high-speed lines but works for manual inspection augmentation), (2) server-side inference for non-real-time use cases (batch inspection of photos taken manually), (3) simple classical CV (template matching, color thresholding) instead of deep learning—much less capable but runs fast on minimal hardware. Honest recommendation: the $100 device with NPU is a better investment—it's the difference between a viable product and a frustrating toy.

**Q**: "How do you prevent a customer from extracting your pre-trained backbone weights from the edge device?"

**Strong answer**: This is a real concern. The quantized model on the edge device contains platform IP (pre-trained backbone) + tenant IP (fine-tuned head). Mitigations: (1) model weights encrypted at rest on edge device, decrypted only into NPU secure memory, (2) secure boot prevents unauthorized software from reading NPU memory, (3) model obfuscation (not foolproof but raises the bar), (4) contractual protection (license terms prohibit reverse engineering). Realistic assessment: a sufficiently motivated attacker with physical device access can likely extract weights—the encryption raises the cost but doesn't make it impossible. Focus on making the backbone freely available only being useful with the platform's training infrastructure.

---

## Phase 5: Extensions (0:40 - 0:45)

### Extension Topics

Pick one if time permits:

1. **Video inspection** (continuous web like textiles/steel strip): line-scan camera, streaming inference, defect tracking across frames
2. **3D defect detection**: Structured light or stereo cameras for height/depth defects; point cloud processing on edge
3. **Predictive quality**: Correlating defect patterns with process parameters (temperature, speed, tool age) to predict quality issues before they produce defects
4. **Multi-factory model sharing**: Transfer learning across factories producing similar products; federated learning to improve backbone without sharing images
5. **AR-assisted operator review**: Overlay defect locations on live camera feed using AR headset for manual verification stations

---

## Trap Questions and Common Mistakes

### Trap 1: "Why not use a vision-language model (VLM) instead of a CNN?"

**Trap**: VLMs (GPT-4V, Gemini, etc.) can describe defects in natural language. Candidate might think this is the future of inspection.

**Correct answer**: VLMs are 10-100x too large for edge deployment (billions of parameters vs. millions), 100-1000x too slow for real-time inference (seconds vs. milliseconds), require cloud connectivity (incompatible with edge-first architecture), and are not designed for the binary pass/fail decision that manufacturing needs at line speed. VLMs could be useful for: (1) assisted labeling in the training pipeline (describe what defect is in an image), (2) root cause analysis on aggregated defect data (offline, in the cloud), but NOT for real-time inspection.

### Trap 2: "Can't you just use anomaly detection and skip the labeled training data?"

**Trap**: Unsupervised anomaly detection requires no defect labels—just "good" examples.

**Correct answer**: Anomaly detection works well for detecting THAT something is wrong, but not WHAT is wrong. It can't distinguish between a critical crack (must reject) and a cosmetic scratch (might accept). It also can't distinguish between a real defect and a normal variation the model hasn't seen (e.g., a new color variant of the same product). In practice, anomaly detection is useful as: (1) a cold-start solution when zero defect labels exist, (2) a first-stage filter in a two-stage cascade (anomaly → classification), but it should be replaced by or augmented with supervised classification once labeled examples are available.

### Trap 3: "How accurate should the model be?"

**Trap**: Candidate gives a single number (e.g., "99%").

**Correct answer**: "Accuracy" is meaningless without specifying recall vs. precision and per-class targets. The key metrics are:
- **Defect recall**: % of actual defects caught. Target: >95% for structural, >90% for cosmetic.
- **False positive rate**: % of good parts incorrectly rejected. Target: <3%.
- These are in tension: improving recall increases false positives.
- The right balance depends on the industry, defect type, and cost of each error type.

### Trap 4: "The factory floor has WiFi. Why not just use cloud inference?"

**Correct answer**: (1) Factory WiFi is unreliable (metal structures cause interference, dust and moisture degrade signals), (2) even reliable WiFi adds 10-50 ms round-trip latency, (3) WiFi doesn't guarantee bandwidth for simultaneous high-res image uploads from 20 stations, (4) a WiFi outage would stop all inspection—unacceptable for manufacturing, (5) cloud GPU costs at $1-3/hour per station are higher than a one-time $100 edge device.

---

## Scoring Rubric

### Junior / Mid-Level (Acceptable)

- Identifies the edge inference constraint and proposes a reasonable edge-cloud split
- Mentions transfer learning for data scarcity
- Discusses basic model deployment (but may not propose shadow mode)
- Understands the latency budget from line speed

### Senior (Good)

- Designs the full inspection pipeline with realistic timing breakdown
- Proposes hardware-triggered capture with controlled lighting
- Discusses INT8 quantization and its accuracy trade-offs
- Designs a no-code training interface with operator-friendly validation
- Proposes shadow mode deployment with automatic rollback
- Addresses offline operation and data synchronization

### Staff+ (Exceptional)

- Articulates the resolution-vs-compute trade-off (tiled inference, ROI optimization)
- Designs the synthetic defect generation pipeline for few-shot learning
- Discusses thermal throttling and its impact on production reliability
- Proposes the model drift problem (tooling wear) and its solution
- Addresses per-class threshold tuning based on defect severity economics
- Considers the factory PLC integration and deterministic actuation timing
- Discusses model IP protection on edge devices
- Proposes the two-stage cascade (anomaly → classification) for efficiency
