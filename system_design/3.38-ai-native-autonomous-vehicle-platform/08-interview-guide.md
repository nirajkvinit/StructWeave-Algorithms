# Interview Guide

## Interview Pacing (45 Minutes)

| Time | Phase | Focus | Key Activities |
|------|-------|-------|----------------|
| **0-5 min** | Clarify | Scope & requirements | Ask clarifying questions, establish ODD, SAE level |
| **5-15 min** | High-Level | Architecture overview | Draw sensor → perception → prediction → planning → control |
| **15-30 min** | Deep Dive | 1-2 critical components | Sensor fusion, prediction, or safety architecture |
| **30-40 min** | Scale & Trade-offs | Reliability & safety | Fail-operational, redundancy, simulation |
| **40-45 min** | Wrap Up | Summary & questions | Address follow-ups, clarify trade-offs |

---

## Phase 1: Clarifying Questions (0-5 min)

### Must-Ask Questions

| Question | Why It Matters | Good Answer Indicators |
|----------|----------------|----------------------|
| **"What SAE level are we targeting—L2 supervised, L3 conditional, or L4 fully driverless?"** | Determines redundancy requirements, human-in-loop | Candidate asks before designing |
| **"What's the Operational Design Domain? Highway only, urban, or all conditions?"** | Affects sensor suite, planning complexity | Understands ODD concept |
| **"Sensor configuration—vision-only like Tesla, or multi-sensor like Waymo?"** | Major architectural decision | Discusses trade-offs |
| **"What's the fleet scale? Prototype, pilot (100s), or production (10,000s)?"** | Affects fleet ops, cloud infrastructure | Considers scalability |
| **"Which regulatory framework? US (NHTSA), EU (UNECE), or both?"** | Compliance requirements | Knows regulatory landscape |

### Additional Scoping Questions

- "What's the target latency budget—100ms standard or tighter?"
- "Is this a new vehicle platform or retrofit?"
- "Are we designing the full stack or specific components?"
- "What's the compute budget (power/thermal constraints)?"

---

## Phase 2: High-Level Design (5-15 min)

### Architecture to Draw

Start with this high-level flow and add detail as time permits:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SENSOR SUITE                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Cameras │ │  LiDAR  │ │  Radar  │ │  USS    │ │GNSS/IMU │           │
│  │   (8)   │ │  (1-3)  │ │   (5)   │ │  (12)   │ │         │           │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
└───────┼──────────┼──────────┼──────────┼──────────┼────────────────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PERCEPTION (<50ms)                                  │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │ Sensor Fusion    │───▶│ Object Detection │───▶│ Lane Detection   │   │
│  │ (BEV Transform)  │    │ Segmentation     │    │ Road Topology    │   │
│  └──────────────────┘    │ Occupancy        │    └──────────────────┘   │
│                          └──────────────────┘                            │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PREDICTION (<20ms)                                  │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │ Multi-Object     │───▶│ Trajectory       │───▶│ Intent           │   │
│  │ Tracking         │    │ Prediction (K=6) │    │ Classification   │   │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘   │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PLANNING (<30ms)                                    │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │ Behavior         │───▶│ Motion           │───▶│ Trajectory       │   │
│  │ Planning         │    │ Planning         │    │ Optimization     │   │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘   │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│ SAFETY MONITOR│──────▶│   CONTROL     │──────▶│   ACTUATORS   │
│ (ASIL-D)      │       │   (MPC 50Hz)  │       │ Steer, Brake  │
└───────────────┘       └───────────────┘       └───────────────┘
```

### Key Points to Mention

1. **End-to-end latency**: < 100ms from sensor to actuation
2. **Real-time constraints**: Deterministic execution, watchdogs
3. **Redundancy**: Dual compute for fail-operational (L4)
4. **Safety architecture**: Independent safety monitor validates all commands

---

## Phase 3: Deep Dive Options (15-30 min)

Pick 1-2 based on interviewer interest or your strengths:

### Option A: Sensor Fusion Deep Dive

**Key Concepts**:
- BEV (Bird's Eye View) representation
- Lift-splat-shoot for camera to 3D
- PointPillars for LiDAR
- Temporal synchronization
- Online calibration refinement

**Draw**: Multi-modal fusion architecture showing camera → BEV lift → fusion with LiDAR pillars → unified representation

**Discuss**:
- "Camera features are lifted to 3D using predicted depth distributions, then splatted onto a BEV grid"
- "LiDAR provides geometric ground truth; radar provides velocity; fusion combines strengths"
- "Calibration drift is detected via cross-modal consistency and refined online"

### Option B: Trajectory Prediction Deep Dive

**Key Concepts**:
- Transformer-based architecture (Wayformer)
- Agent history encoding
- Map context encoding
- Social attention (agent-to-agent)
- Multi-modal output (K trajectories)

**Draw**: Attention-based architecture with agent encoder, map encoder, social attention, and decoder

**Discuss**:
- "We encode each agent's history with a temporal transformer"
- "Cross-attention between agents and lane graph captures route intent"
- "Agent-to-agent attention captures social interactions (yielding)"
- "Output is K=6 diverse trajectory modes with probabilities"

### Option C: Safety Architecture Deep Dive

**Key Concepts**:
- ASIL-D requirements
- Independent safety monitor
- Safety envelope checking
- Fallback controller
- Fail-operational vs fail-safe

**Draw**: Dual-channel architecture showing primary pipeline and independent safety system converging at command arbiter

**Discuss**:
- "Safety monitor runs on separate SoC with independent sensor input"
- "Every trajectory is checked against safety envelope (TTC, kinematic limits)"
- "If check fails, fallback controller generates safe stop trajectory"
- "Command arbiter selects valid commands—safety always wins"

---

## Phase 4: Scale & Trade-offs (30-40 min)

### Scaling Questions

| Question | Good Answer |
|----------|-------------|
| "How does the system scale to 100,000 vehicles?" | "In-vehicle compute is fixed; fleet ops scales horizontally (Kafka, cloud)" |
| "How do you handle model updates across the fleet?" | "OTA updates with A/B partition, canary rollout, rollback capability" |
| "How do you validate safety at scale?" | "Simulation (billions of miles), shadow mode, continuous monitoring" |

### Reliability Questions

| Question | Good Answer |
|----------|-------------|
| "What happens if the primary compute fails?" | "Hot standby switches over in <100ms; safety SoC can bring vehicle to safe stop" |
| "What if all cameras fail?" | "Graceful degradation to LiDAR + radar mode, reduced ODD, slower speed" |
| "How do you achieve 99.99% availability?" | "Redundant sensors, dual compute, fail-operational design" |

### Trade-off Discussions

| Trade-off | Option A | Option B | Recommendation |
|-----------|----------|----------|----------------|
| **Sensor Suite** | Vision-only (Tesla) | Multi-sensor (Waymo) | Multi-sensor for L4; vision-primary for L2 |
| **Architecture** | End-to-end neural | Modular pipeline | Hybrid with learned components |
| **Planning** | Classical optimization | Learned (diffusion) | Hybrid: classical structure + learned costs |
| **Mapping** | HD map dependent | Mapless | Mapless primary with HD enhancement |

---

## Trap Questions and How to Handle

### Trap 1: "Why not just use Tesla's approach?"

**What They Want**: Understand trade-offs, not blind following

**Good Answer**:
> "Tesla's vision-only approach is impressive and cost-effective for L2 ADAS with driver supervision. However, for L4 robotaxi where there's no human backup:
>
> 1. **Redundancy**: Single modality means single failure mode. Multi-sensor provides diverse physics (cameras for semantics, LiDAR for geometry, radar for velocity/weather).
> 2. **Night/Weather**: Vision struggles in low light and heavy rain. LiDAR works in darkness; radar sees through precipitation.
> 3. **Depth Precision**: Monocular depth estimation has ~5% error; LiDAR gives centimeter accuracy critical for tight maneuvers.
>
> For cost-sensitive L2, vision-primary with radar backup makes sense. For L4, multi-sensor redundancy is justified."

### Trap 2: "How do you prove the system is safe?"

**What They Want**: Realistic view of safety validation

**Good Answer**:
> "Safety isn't proven by a single method—it requires a layered approach:
>
> 1. **Simulation**: Billions of miles covering systematic scenario exploration and generated edge cases. But simulation can't capture everything.
> 2. **Closed-Course Testing**: Repeatable execution of specific scenarios (AEB, cut-ins) with known ground truth.
> 3. **Public Road Testing**: Millions of miles of naturalistic driving to find unknown scenarios. Shadow mode compares system decisions to human driver.
> 4. **Statistical Argument**: Demonstrate collision rate significantly below human baseline (~1.5 per million miles).
> 5. **Continuous Monitoring**: Post-deployment fleet telemetry to detect emerging issues.
>
> The goal is enough evidence to claim the system is safer than the alternative (human driving), not absolute proof of safety."

### Trap 3: "What if the AI makes a mistake?"

**What They Want**: Defense-in-depth thinking

**Good Answer**:
> "AI will make mistakes—the system is designed assuming this:
>
> 1. **Safety Monitor**: Independent system validates every command against physics-based safety envelope. Can't command impossible or dangerous actions.
> 2. **Fallback Controller**: If primary plan fails safety checks, fallback generates conservative trajectory (slow down, maintain lane).
> 3. **AEB (ASIL-D)**: Last line of defense operates independently with simple logic—if collision imminent, brake hard.
> 4. **Minimal Risk Condition**: If system cannot operate safely, it achieves controlled stop (pull over, hazards on).
>
> The goal is fail-operational: even with AI mistakes, the vehicle remains safe."

### Trap 4: "Simulation can't capture the real world"

**What They Want**: Acknowledge limitations, show pragmatism

**Good Answer**:
> "You're right—simulation has fundamental limitations:
>
> 1. **Sensor Fidelity**: Simulated cameras/LiDAR don't perfectly match real sensors, especially for edge cases like glare or sensor degradation.
> 2. **Behavioral Realism**: Other road users are unpredictable in ways hard to model. Pedestrian behavior varies by culture.
> 3. **Long-Tail**: By definition, we can't simulate scenarios we haven't encountered.
>
> That's why simulation is one layer:
> - **Simulation**: Systematic exploration, regression testing, rapid iteration
> - **Closed-Course**: Known scenarios with real sensors
> - **Public Road**: Naturalistic exposure to find unknowns
> - **Fleet Learning**: Deployed vehicles continuously collecting edge cases
>
> It's an iterative loop—real-world data improves simulation realism, better simulation improves the model, safer model collects more edge cases."

### Trap 5: "What about edge cases you can't anticipate?"

**What They Want**: Uncertainty handling, ODD thinking

**Good Answer**:
> "Unknown unknowns are the hardest challenge. Our approach:
>
> 1. **ODD Boundaries**: Clearly define where the system operates. Outside ODD, don't attempt automation.
> 2. **Uncertainty Quantification**: Perception and prediction output confidence. Low confidence → conservative behavior.
> 3. **OOD Detection**: Detect when inputs look different from training data. Flag for human review.
> 4. **Defensive Planning**: Plan against worst-case predictions, not just most likely.
> 5. **Minimal Risk Condition**: If uncertain, slow down and stop safely.
>
> We can't anticipate everything, but we can detect uncertainty and respond conservatively."

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| **Jumping to design without clarifying** | Might solve wrong problem | Ask 3-5 questions first |
| **Ignoring latency constraints** | AV is hard real-time system | State latency budget early (100ms) |
| **Single compute design for L4** | ASIL-D requires redundancy | Always mention dual compute |
| **No safety architecture** | Critical for automotive | Include safety monitor, fallback |
| **Over-relying on ML** | Hard to validate/certify | Hybrid approach, explicit constraints |
| **Ignoring regulations** | Can't deploy without compliance | Reference ISO 26262, SOTIF |
| **"Just add more servers"** | In-vehicle compute is fixed | Discuss model optimization instead |
| **No failure mode discussion** | Real systems fail | Address graceful degradation |

---

## Quick Reference Card

### Architecture Summary

```
Sensors (8 cam, LiDAR, 5 radar, 12 USS, GNSS/IMU)
    ↓ 5ms (sync)
Sensor Fusion (BEV transform)
    ↓ 15ms
Perception (Detection, Segmentation, Occupancy, Lanes)
    ↓ 30ms cumulative
Prediction (Tracking, Trajectory forecast K=6, Intent)
    ↓ 20ms
Planning (Behavior, Motion planning, Optimization)
    ↓ 25ms
Control (MPC @ 50Hz)
    ↓ 10ms
Actuators (Steering, Throttle, Brake)

Safety Monitor ─────────────────────────────────▶ Command Arbiter
(Independent SoC, validates all, triggers fallback)

Total: < 100ms E2E
```

### Key Numbers

| Metric | Value |
|--------|-------|
| E2E latency | < 100ms |
| Perception | < 50ms |
| Prediction | < 20ms |
| Planning rate | 10 Hz |
| Control rate | 50 Hz |
| Detection mAP | > 70% |
| Prediction ADE @3s | < 1.5m |
| Disengagement rate | < 0.1/1000 mi |
| Compute | 200-300 TOPS |
| Sensor data | ~1.6 GB/s |

### Safety Standards

| Standard | Focus |
|----------|-------|
| **ISO 26262** | Functional safety (ASIL A-D) |
| **ISO 21448 (SOTIF)** | Intended functionality safety |
| **ISO/PAS 8800** | AI safety in vehicles |
| **UNECE R157** | ALKS type approval (L3) |
| **UL 4600** | Safety case methodology |

### SAE Levels

| Level | Description | Example |
|-------|-------------|---------|
| L2 | Hands on, eyes on | Tesla Autopilot |
| L3 | Eyes off, ready to intervene | Honda Sensing Elite |
| L4 | No intervention (in ODD) | Waymo robotaxi |
| L5 | No intervention (anywhere) | Not yet achieved |

---

## Questions to Ask the Interviewer

1. "What's the target market—passenger vehicles, robotaxis, or trucking?"
2. "Is there an existing platform we're building on or greenfield?"
3. "What's the timeline—prototype, pilot, or production?"
4. "Are there specific regulatory markets we need to prioritize?"
5. "What's the relationship between safety and feature velocity?"
