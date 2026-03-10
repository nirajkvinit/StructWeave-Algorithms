# 13.7 AI-Native Construction & Engineering Platform — Interview Guide

## 45-Minute Interview Pacing

| Phase | Duration | Focus | What to Evaluate |
|---|---|---|---|
| **Phase 1: Problem Framing** | 5 min | Clarify scope: which construction AI capabilities to focus on (progress tracking? safety? all?) | Does the candidate ask clarifying questions about site scale, real-time vs. batch, edge vs. cloud? |
| **Phase 2: Requirements** | 5 min | Define functional requirements and key SLOs (safety latency, progress accuracy, data volumes) | Can they estimate data volumes? Do they recognize the edge-cloud tension? |
| **Phase 3: High-Level Design** | 10 min | System architecture: edge layer, ingestion, processing pipelines, core services, storage | Do they separate safety (real-time edge) from analytics (batch cloud)? Do they address BIM as central data model? |
| **Phase 4: Deep Dive** | 15 min | Pick 1-2 areas: safety CV pipeline, progress tracking photogrammetry, BIM clash detection, cost estimation | Can they discuss CV inference at the edge, point cloud registration, spatial indexing, probabilistic estimation? |
| **Phase 5: Scaling & Reliability** | 5 min | Multi-site scaling, edge resilience, storage tiering for petabyte imagery | Do they address edge autonomous operation? Storage lifecycle for regulatory retention? |
| **Phase 6: Trade-offs & Extensions** | 5 min | Alternative approaches, what they would change, future extensions | Can they articulate trade-offs between real-time and batch processing? Quality vs. coverage? |

---

## Opening Question

> "Design an AI-native platform for managing construction projects. The platform should use computer vision to monitor safety and track progress, use BIM intelligence for coordination, and predict project risks. How would you architect this system?"

### Strong Opening Signals

- Immediately asks about site scale (single site vs. hundreds), project types (residential vs. mega-projects), and which capabilities are highest priority
- Recognizes the edge-cloud split: safety must be real-time on-site, progress tracking can be batched
- Asks about connectivity constraints and harsh environment requirements
- Identifies BIM as the central data model that links all capabilities

### Weak Opening Signals

- Jumps to a generic microservices architecture without addressing construction-specific constraints
- Treats all processing as cloud-based without considering edge requirements
- Does not ask about data volumes (images per day, model sizes)
- Misses the distinction between real-time safety and batch analytics

---

## Key Discussion Points by Phase

### Phase 3: High-Level Design — Must-Cover Topics

**Edge-cloud architecture:**
- Safety CV runs on edge GPUs with <500 ms latency
- Progress tracking batched to cloud for overnight processing
- Edge must operate autonomously for 24+ hours during connectivity loss
- Only structured events (not raw video) transmitted to cloud

**Data flow architecture:**
- Separate ingestion paths for streaming (safety cameras) vs. batch (360-degree captures, drone surveys)
- BIM as central linking schema — all data references IFC element GUIDs
- Event-driven architecture for safety alerts; batch pipeline for progress and analytics

**Storage strategy:**
- Object storage for imagery and point clouds (petabyte-scale)
- Graph database for BIM element relationships
- Time-series database for IoT sensor data and progress tracking
- Separate hot/warm/cold tiers with automated lifecycle policies

### Phase 4: Deep Dive Options

#### Option A: Safety CV Pipeline (Recommended for CV-experienced candidates)

**Questions to probe:**
1. "Walk me through the latency budget from camera frame to safety alert."
2. "How do you handle false positives without creating alert fatigue?"
3. "What happens when the safety system detects a life-threatening hazard? Walk me through the full alert path."
4. "How do you update CV models on edge devices without interrupting safety monitoring?"

**Expected strong answers:**
- Latency budget breakdown: frame capture (10 ms) → detection (80 ms) → tracking (15 ms) → PPE check (25 ms) → dispatch (20 ms) = ~200 ms with margin
- Multi-layer deduplication: temporal (same worker within 5 min), confidence threshold (>0.85), contextual filtering (break areas exempt), temporal persistence (3+ frames)
- Blue-green model deployment on edge: new model validated on standby GPU before traffic switch
- Edge-local alert dispatch (siren, local Wi-Fi push) independent of cloud connectivity

#### Option B: Progress Tracking Pipeline (Recommended for 3D vision candidates)

**Questions to probe:**
1. "How do you compare what a 360-degree camera sees against what the BIM model says should be there?"
2. "Construction elements look different during installation vs. the final design. How do you handle this?"
3. "What does your point cloud registration pipeline look like, and what accuracy do you need?"
4. "Why batch processing instead of real-time for progress tracking?"

**Expected strong answers:**
- SfM + MVS photogrammetry pipeline producing dense point clouds; ICP registration against BIM geometry
- Construction stage taxonomy: recognizes intermediate states (rebar cage, formwork, concrete pour, stripped, finished) and maps to completion percentage
- Registration accuracy <2 cm required for element-level matching; hierarchical registration using known reference geometry
- Batch because construction progress is measured in hours/days, not seconds; real-time processing would consume 20x GPU compute with negligible incremental insight

#### Option C: BIM Clash Detection (Recommended for algorithm-focused candidates)

**Questions to probe:**
1. "A BIM model has 500,000 elements. How do you find the clashes without checking every pair?"
2. "A typical clash report has 50,000 raw clashes. How do you filter to the 1,000 that matter?"
3. "How do you handle incremental clash detection when only 1,000 elements change?"
4. "What makes a clash 'relevant' vs. 'irrelevant'?"

**Expected strong answers:**
- Spatial indexing (R-tree/octree) for broad-phase filtering reduces O(n²) to O(n log n); narrow-phase geometry intersection on candidate pairs
- ML relevance classifier trained on historical coordinator decisions; features include element types, intersection volume, discipline pair, construction sequence
- Incremental: query spatial index for neighbors of changed elements only; retest those pairs
- Relevance depends on: tolerance standards (soft vs. hard clash), construction sequence (will one element be removed before the other is installed?), maintenance access requirements, and firm-specific standards

#### Option D: Probabilistic Cost Estimation (Recommended for data/ML candidates)

**Questions to probe:**
1. "Why probability distributions instead of single-point cost estimates?"
2. "How do you handle cost items with very few historical data points?"
3. "When a design change modifies one element, how do you update the project cost estimate?"
4. "How do you model the fact that cost overruns tend to cluster — when steel prices rise, all steel elements are affected?"

**Expected strong answers:**
- Single-point estimates create false precision and anchoring bias; distributions communicate uncertainty and enable risk-informed decisions
- Hierarchical Bayesian estimation: sparse items borrowing strength from broader category distributions
- Change impact propagation through BIM relationship graph; recompute costs for affected elements + their dependent elements
- Correlated sampling in Monte Carlo: sample cost drivers (material prices, labor rates) from joint distribution first, then compute element costs conditional on drivers — captures "everything goes wrong at once" tail risk

---

## Trap Questions and Differentiators

### Trap 1: "Why not process every camera frame in real-time for progress tracking?"

**What it tests:** Understanding of cost-benefit analysis in system design.

**Weak answer:** "We should process everything in real-time for maximum accuracy" or "Real-time is always better."

**Strong answer:** "Construction progress changes over hours and days, not seconds. Processing 60,000 images per site in real-time would consume 20x more GPU compute while providing zero incremental insight — a wall does not become 'more installed' between two 30-second frames. Daily batch processing captures all meaningful changes at a fraction of the cost. The exception is triggered on-demand processing for critical events like post-pour inspections."

### Trap 2: "Can you use facial recognition to track individual worker productivity?"

**What it tests:** Ethical reasoning and regulatory awareness.

**Weak answer:** "Yes, we can identify workers and track their output per hour."

**Strong answer:** "No, and we deliberately should not. Facial recognition for productivity tracking raises serious privacy concerns under GDPR and labor laws, creates adversarial relationships with workers, and is ethically problematic. The platform tracks zone-level and crew-level productivity (aggregate output per zone per day) rather than individual worker metrics. Safety monitoring uses body-based detection (clothing, height, PPE) without facial recognition. Worker privacy is essential for platform adoption and regulatory compliance."

### Trap 3: "Your point cloud shows an element that isn't in the BIM model. Is it an error?"

**What it tests:** Understanding of construction reality vs. design idealization.

**Weak answer:** "Flag it as an error in the point cloud processing."

**Strong answer:** "Not necessarily. Construction sites contain many elements not in the BIM model: temporary works (scaffolding, formwork, shoring), construction equipment, material laydown, protective coverings, and safety barriers. The system must distinguish between temporary elements (expected, will be removed) and unauthorized permanent installations (actual errors requiring RFIs). The classification uses a combination of temporal persistence (temporary elements appear and disappear across daily snapshots) and semantic classification (recognizing scaffolding, formwork, etc. as construction-stage artifacts)."

### Trap 4: "The clash detection found 50,000 clashes. What do you tell the project team?"

**What it tests:** Understanding that raw technical output is not actionable.

**Weak answer:** "Send them the full clash report sorted by severity."

**Strong answer:** "50,000 raw clashes are useless — no coordinator can review that volume. The system must filter to the 500–1,000 actionable clashes using ML relevance classification, cluster related clashes (20 clashes between a duct run and a beam line are one coordination issue, not 20 separate problems), and prioritize by construction schedule urgency (a clash that must be resolved before next week's concrete pour is more urgent than one in a zone not scheduled for 6 months). The output is a prioritized punch list of ~50 coordination issues, each with responsible trade, resolution deadline, and suggested fix."

### Trap 5: "How do you handle a site where internet connectivity is completely unavailable?"

**What it tests:** Edge architecture and degradation strategy.

**Weak answer:** "The system can't function without cloud connectivity."

**Strong answer:** "The edge cluster handles all safety-critical functions locally — no cloud required. Safety monitoring, alerts, and zone enforcement continue via edge GPUs with local alert dispatch (sirens, Wi-Fi push to supervisors). Progress captures continue to local storage (10 TB buffer, sufficient for 10+ days). The field app accesses cached BIM models and the previous day's progress data from the edge node. When connectivity returns, buffered data uploads in priority order: safety events first, then progress imagery. The site loses only cloud-dependent functions: cost estimation, risk prediction, and multi-site analytics."

---

## Scoring Rubric

### Senior Engineer (L5) — Expected Competencies

| Area | Expectation | Score Weight |
|---|---|---|
| Edge-cloud split | Identifies that safety must be edge, analytics can be cloud | 20% |
| Data volume estimation | Reasonable estimates for imagery, point clouds, BIM sizes | 15% |
| BIM as central schema | Uses BIM elements as primary key linking all platform data | 15% |
| Pipeline design | Separates streaming (safety) from batch (progress) processing | 15% |
| Storage strategy | Object storage for imagery, tiered retention, regulatory compliance | 10% |
| Deep dive depth | Can discuss one area (CV, photogrammetry, or scheduling) in detail | 15% |
| Trade-off reasoning | Articulates cost-benefit of batch vs. real-time, accuracy vs. coverage | 10% |

### Staff Engineer (L6) — Additional Expectations

| Area | Expectation | Score Weight |
|---|---|---|
| Construction domain nuance | Understands construction stages, trade dependencies, temporal dependency types | 15% |
| ML model lifecycle | Addresses model drift, ground truth collection, edge model updates | 15% |
| Probabilistic thinking | Cost distributions, risk scores with calibration, confidence-aware decisions | 15% |
| Worker privacy | Proactively identifies privacy concerns without prompting | 10% |
| Multi-site scaling | Site-affinity processing, burst scaling, cross-site ML training | 15% |
| Edge resilience | Autonomous operation, degradation hierarchy, reconnection protocol | 15% |
| System-of-systems | How BIM intelligence feeds risk prediction, which feeds resource optimization, creating a closed-loop system | 15% |

---

## Follow-Up Questions for Strong Candidates

1. "How would you handle a scenario where the BIM model is updated mid-construction, changing elements that are already partially built? How does the progress tracking system handle the transition?"

2. "Your safety CV model performs well on one site but poorly when deployed to a different site with different lighting, camera angles, and construction type. How do you handle this domain shift?"

3. "A subcontractor disputes your AI-generated progress report, claiming their work is further along than the system shows. How do you design the system to handle this dispute?"

4. "How do you handle the 'last 10%' problem — progress tracking accuracy degrades in the final finishing stages when elements are small, numerous, and visually similar (outlet covers, switch plates, ceiling tiles)?"

5. "The risk prediction model says there's an 80% probability of a 3-week delay on the critical path. The project manager disagrees based on experience. How should the system present this information?"
