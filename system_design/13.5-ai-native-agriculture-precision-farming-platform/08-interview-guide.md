# 13.5 AI-Native Agriculture & Precision Farming Platform — Interview Guide

## Interview Context

This system design covers an AI-native precision agriculture platform—a domain that combines real-time edge computing, satellite and drone imagery processing, IoT sensor networks, and ML-driven agronomic decision-making. The system spans from embedded controllers on spray booms (microsecond latency requirements) to cloud-scale satellite processing (petabyte storage). Strong candidates will demonstrate ability to reason about edge-cloud hybrid architectures, multi-resolution geospatial data fusion, and the unique constraints of connectivity-hostile rural environments.

---

## 45-Minute Interview Pacing

### Phase 1: Requirements Gathering (8 minutes)

**Suggested opening prompt:**
> "Design an AI-powered precision farming platform that helps large-scale row-crop farmers optimize their operations. The platform should use satellite imagery, drones, soil sensors, and on-equipment cameras to help with crop monitoring, yield prediction, and targeted spraying."

**What to listen for in candidate's clarifying questions:**

| Strong Signal | Weak Signal |
|---|---|
| Asks about scale: how many acres, how many fields, how many sensors | Jumps directly to technology choices |
| Asks about connectivity constraints in rural environments | Assumes reliable internet everywhere |
| Asks about latency requirements for different subsystems (spray vs. monitoring) | Treats all subsystems as having the same latency requirements |
| Asks about data ownership and who controls the platform | Ignores farmer data rights |
| Asks about seasonal variation in workload | Designs for constant load |
| Asks about the spray boom's physical constraints (speed, nozzle spacing) | Treats spraying as a generic ML inference problem |

**Guide the candidate toward:**
- 200M acres under management, 500K fields, 10M soil sensors
- Edge spray control with 15 ms camera-to-nozzle budget
- LoRaWAN sensor networks with intermittent cellular backhaul
- Seasonal workload variation (10x between summer peak and winter)

### Phase 2: High-Level Design (12 minutes)

**Candidate should identify these major components:**

1. **Satellite imagery pipeline** — ingestion, atmospheric correction, cloud masking, vegetation index computation
2. **Drone analytics engine** — ortho-mosaic stitching, plant-level detection
3. **Precision spray controller (edge)** — real-time weed detection and nozzle actuation
4. **Soil sensor network** — LoRaWAN ingestion, calibration, prescription generation
5. **Yield prediction service** — hybrid physics + ML model
6. **Irrigation optimizer** — evapotranspiration modeling, automated scheduling
7. **Field digital twin** — unified geospatial state representation

**Key design decisions to probe:**

| Decision | Follow-Up Question |
|---|---|
| Edge vs. cloud for spray decisions | "What happens if the cellular connection drops mid-field? Can the sprayer keep working?" |
| Sensor connectivity technology | "Why LoRaWAN instead of cellular for soil sensors? What are the trade-offs?" |
| Yield prediction approach | "How does your yield model handle a drought year that's worse than anything in the training data?" |
| Data fusion strategy | "How do you combine 10-meter satellite pixels with centimeter-resolution drone images and point-measurement soil sensors into a coherent field view?" |

### Phase 3: Deep Dive (15 minutes)

Choose one of these deep-dive paths based on the candidate's strengths:

#### Path A: Edge Computing & Precision Spraying (Systems / Embedded Focus)

**Key questions:**
1. "Walk me through the latency budget from camera capture to nozzle actuation. Where is each millisecond spent?"
2. "The spray boom is bouncing on rough terrain. How do you maintain detection accuracy under vibration?"
3. "How do you update the ML model on 50,000 spray rigs deployed across the country? What's your rollout strategy?"
4. "If the edge GPU overheats and inference slows to 20 ms, what happens?"

**Expected strong answer on latency:**
- Candidate breaks down the 15 ms budget: image capture (1.5 ms), preprocessing (1 ms), inference (7 ms), nozzle mapping (2 ms), solenoid actuation (2.5 ms), buffer (1 ms)
- Mentions INT8 quantization, hardware-triggered capture, pre-computed homography
- Explains temporal redundancy (multiple frames per weed = second chances)
- Explains fail-safe: solenoid defaults to open (spray) on controller failure

#### Path B: Satellite & Geospatial Pipeline (Data Engineering Focus)

**Key questions:**
1. "40–60% of satellite passes have cloud contamination. How do you handle this?"
2. "How do you fuse data from 5 different spatial resolutions (10m satellite to sub-cm on-boom cameras)?"
3. "Your NDVI anomaly detector flags a zone as stressed. How do you determine if it's drought, disease, or sensor error?"
4. "How much storage do you need for 3 years of imagery across 200M acres?"

**Expected strong answer on cloud masking:**
- Ensemble of multiple cloud detection algorithms (not single threshold)
- Per-pixel confidence scores instead of binary mask
- Gap-filling strategies: SAR fusion, spatial interpolation, growth model interpolation
- Quantifies impact: cloud masking errors propagate to incorrect anomaly detection

#### Path C: IoT & Connectivity Architecture (Infrastructure Focus)

**Key questions:**
1. "How does a soil sensor reading go from the field to an actionable irrigation recommendation?"
2. "You have 10M sensors deployed. How do you detect and correct calibration drift without physically visiting each sensor?"
3. "What happens when a LoRaWAN gateway fails? How long until you notice, and how do nearby sensors cope?"
4. "A farmer buys 200 new sensors. Walk me through the provisioning process."

**Expected strong answer on drift detection:**
- Cross-sensor validation using spatial neighbors
- Sentinel sensor strategy (5% ground-truthed annually, calibration applied to neighbors)
- Yield map feedback loop (post-harvest actual yield validates sensor accuracy)
- Quantifies drift magnitude: 15–25% moisture error over 5 years without correction

### Phase 4: Bottlenecks & Trade-offs (7 minutes)

**Cross-cutting questions for any deep-dive path:**

1. "What's the biggest scalability bottleneck during peak spray season?"
   - Strong: spray log aggregation (130 TB/day from 50K rigs with limited bandwidth)
   - Also strong: drone processing queue (40 TB/day imagery, GPU-constrained)

2. "How do you handle the extreme seasonality—10x load variation between summer and winter?"
   - Strong: counter-seasonal resource allocation (GPU fleet serves inference in summer, model training in winter)
   - Also strong: aggressive auto-scaling with spot instances for drone processing

3. "A farmer switches platforms and requests all their data. How do you handle data portability?"
   - Strong: ADAPT framework compliance, standardized export formats, 72-hour SLO
   - Weak: "We don't support that" or "They'd lose the ML-derived insights"

### Phase 5: Wrap-Up (3 minutes)

**Final synthesis question:**
> "If you had to pick the single hardest engineering problem in this entire system, what would it be and why?"

**Strong answers identify a genuine tension:**
- "Multi-resolution geospatial fusion—because getting it wrong means every downstream prescription is based on inconsistent data"
- "Edge model deployment at scale—because a bad model update applied to 50K rigs during peak spray season could cause massive crop damage"
- "Maintaining accuracy under out-of-distribution conditions—because the ML components are trained on historical data but agriculture constantly encounters novel weather"

**Weak answers pick surface-level complexity:**
- "Scaling the database" (generic, not domain-specific)
- "Building the UI" (not a system design concern at this level)

---

## Scoring Rubric

### Requirements & Scope (20%)

| Score | Criteria |
|---|---|
| **5** | Identifies edge vs. cloud split as a first-order requirement; asks about connectivity constraints, seasonal variation, and farmer data ownership; quantifies key parameters (acreage, sensor count, spray speed) |
| **3** | Covers basic requirements but misses connectivity challenges or seasonality; treats all components as cloud-based |
| **1** | Lists generic requirements without domain understanding; does not differentiate from a standard SaaS platform |

### Architecture Quality (25%)

| Score | Criteria |
|---|---|
| **5** | Clean edge-cloud hybrid with appropriate subsystem boundaries; field digital twin as central abstraction; explicit connectivity and sync strategy; identifies ISOBUS for equipment interoperability |
| **3** | Reasonable component separation but blurs edge and cloud responsibilities; uses generic data lake instead of geospatially indexed twin; hand-waves connectivity |
| **1** | Monolithic cloud architecture; no edge processing; no consideration for rural connectivity |

### Technical Depth (25%)

| Score | Criteria |
|---|---|
| **5** | Can detail the 15 ms spray latency budget; explains cloud masking ensemble approach; describes hybrid yield model rationale; understands LoRaWAN characteristics (range, bandwidth, power); explains sensor calibration drift |
| **3** | Understands one subsystem well but others are vague; mentions edge processing but cannot detail the latency budget; knows satellite imagery is involved but cannot explain the processing pipeline |
| **1** | Cannot explain how any subsystem works at a detailed level; generic ML references without domain grounding |

### Scalability & Reliability (15%)

| Score | Criteria |
|---|---|
| **5** | Addresses seasonal scaling with specific strategies; designs for edge reliability (fail-safe solenoids, dual-boot firmware); quantifies storage needs; explains counter-seasonal resource allocation |
| **3** | Mentions auto-scaling generically; acknowledges edge failure modes but does not design for them |
| **1** | No scaling strategy; ignores edge reliability; does not consider seasonal variation |

### Trade-off Analysis (15%)

| Score | Criteria |
|---|---|
| **5** | Explicitly identifies model accuracy vs. latency trade-off on edge; discusses data freshness vs. prescription quality; weighs physics model compute cost vs. prediction accuracy; understands edge connectivity trade-offs |
| **3** | Identifies one or two trade-offs but analysis is shallow |
| **1** | Makes choices without acknowledging trade-offs exist |

---

## Common Trap Questions and Expected Responses

### Trap 1: "Can't you just run the weed detection model in the cloud?"

**Expected response:** No—the latency budget is 15 ms. Even the fastest cellular round-trip exceeds 50 ms, and coverage is unreliable in the field. The model must run on-edge. Cloud's role is model training and post-session analytics, not real-time inference.

**Red flag:** Candidate suggests cloud inference with a CDN or edge cache, not understanding that model inference is compute-bound, not data-transfer-bound.

### Trap 2: "Why not use 5G for farm connectivity?"

**Expected response:** 5G covers less than 5% of US farmland. Even where available, 5G small cells have limited range unsuitable for agriculture. LoRaWAN's 10+ km range and 5-year battery life are specifically designed for sparse rural IoT. Cellular (NB-IoT) is a reasonable alternative in some regions but has higher power consumption.

**Red flag:** Candidate assumes 5G coverage is universal or imminent in rural areas.

### Trap 3: "Why not just use more satellite imagery instead of drones?"

**Expected response:** Satellites and drones serve different resolution and timing needs. The highest-resolution commercial satellites provide 3m pixels—sufficient for field-level analysis but not plant-level detection. Drones provide 1–5 cm resolution needed for stand counting, disease identification, and spray validation. Additionally, drone surveys can be triggered on-demand (within hours) while satellite revisits are fixed (daily at best). The optimal strategy uses satellites for broad monitoring and drones for targeted deep inspection.

### Trap 4: "How do you handle a bad ML model update that's already deployed to thousands of rigs?"

**Expected response:** Staged rollout (1% → 10% → 50% → 100%) with automated quality gates. Edge validation against reference dataset before activation. Every rig retains the previous model version and can auto-rollback. If the crop damage rate exceeds 3% on early-rollout rigs, the platform halts the rollout and initiates global rollback via LoRaWAN command (100-byte message fits in a single LoRaWAN uplink). The worst-case blast radius is limited by the staging percentages.

### Trap 5: "Why use a physics-based crop model? ML should be enough."

**Expected response:** ML models fail on out-of-distribution weather (e.g., unprecedented drought). The physics model encodes mechanistic plant biology (photosynthesis, water uptake, phenology) that holds even in novel conditions. The hybrid approach uses the physics model for biologically grounded baseline and ML for field-specific correction. Historical data shows 20–33% accuracy improvement from hybrid vs. pure ML, with the gap widening in extreme weather years.

---

## Candidate Red Flags

| Red Flag | Why It Matters |
|---|---|
| Designs everything as cloud-first with real-time API calls from equipment | Does not understand rural connectivity constraints or edge computing necessity |
| Ignores the physical constraints of spray equipment (speed, nozzle spacing, boom vibration) | Missing the domain-specific engineering that makes this system uniquely challenging |
| Proposes a single large ML model for all tasks (spraying, yield, pest detection) | Does not understand that different agricultural tasks have fundamentally different data modalities, latency requirements, and accuracy metrics |
| Does not ask about seasonal variation in workload | Will over-provision by 10x or under-design for peak, both expensive in agriculture |
| Treats satellite imagery as "just another API" without addressing cloud contamination, atmospheric correction, or resolution limitations | Missing the core challenge of the imagery pipeline |
| Ignores data ownership and portability | In agriculture, farmer data rights are a legal and business requirement, not optional |
