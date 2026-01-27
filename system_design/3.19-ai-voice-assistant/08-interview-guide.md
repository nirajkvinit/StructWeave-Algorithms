# Interview Guide

## Interview Pacing (45 Minutes)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    45-Minute Interview Timeline                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TIME        PHASE                 FOCUS                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  0-5 min     CLARIFICATION         • Scope: Multi-device or single?        │
│              (5 min)               • Scale: Millions of devices?            │
│                                    • Priorities: Latency vs accuracy?       │
│                                    • Features: LLM integration?             │
│                                                                              │
│  5-18 min    HIGH-LEVEL DESIGN     • Draw 6-stage pipeline                 │
│              (13 min)              • On-device vs cloud decisions           │
│                                    • Key data flows                         │
│                                    • Core components                        │
│                                                                              │
│  18-35 min   DEEP DIVE             • Pick 1-2 components to detail         │
│              (17 min)              • Algorithms and data structures        │
│                                    • Trade-offs and alternatives           │
│                                    • Bottleneck analysis                   │
│                                                                              │
│  35-42 min   SCALABILITY           • Multi-region strategy                 │
│              (7 min)               • Failure scenarios                     │
│                                    • Graceful degradation                  │
│                                                                              │
│  42-45 min   WRAP-UP               • Key monitoring metrics                │
│              (3 min)               • Security considerations               │
│                                    • Future improvements                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Clarification Questions

### Questions to Ask the Interviewer

| Question | Why It Matters | Possible Answers |
|----------|----------------|------------------|
| "What device types should I design for?" | Determines complexity | Smart speaker only = simpler; Multi-device (phone, car, wearable) = complex |
| "What's the scale we're targeting?" | Drives infrastructure decisions | 10K devices = startup; 500M devices = FAANG-scale |
| "What's the primary latency requirement?" | Affects architecture choices | <1s typical; <500ms aggressive (needs edge) |
| "Is privacy a top concern?" | Determines on-device vs cloud | Privacy-first (Apple-style) vs accuracy-first (Google-style) |
| "Do we need third-party skill support?" | Affects NLU complexity | No skills = simple intents; 100K skills = hierarchical NLU |
| "Should I consider LLM integration?" | Modern vs traditional approach | Traditional = deterministic; LLM = flexible, costly |
| "What languages need to be supported?" | Model and data requirements | English only = simpler; 20+ languages = complex |
| "Do I need to consider offline mode?" | Device capability requirements | Always online = simpler; Offline support = on-device models |

### Sample Opening Dialogue

> **Interviewer**: "Design a voice assistant like Alexa."
>
> **You**: "Great question! Before I dive in, I'd like to clarify a few things:
> 1. Should I focus on smart speakers only, or should I consider phones, cars, and wearables too?
> 2. What scale are we designing for - thousands of devices or hundreds of millions?
> 3. Is privacy a top priority, which would push toward more on-device processing, or is accuracy the main concern?
> 4. Do we need to support third-party developer skills?"
>
> **Interviewer**: "Let's design for smart speakers at Alexa scale - 500 million devices. Privacy is important but accuracy is the priority. Yes, include third-party skills."

---

## Architecture to Draw

### Essential Diagram (Draw First)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Voice Assistant - Core Architecture                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐                                                              │
│   │  User    │                                                              │
│   │ "Alexa,  │                                                              │
│   │ play     │                                                              │
│   │ jazz"    │                                                              │
│   └────┬─────┘                                                              │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │                    DEVICE (On-Device)                        │           │
│   │   ┌──────────┐    ┌──────────┐    ┌──────────┐             │           │
│   │   │  Wake    │───▶│   VAD    │───▶│  Audio   │             │           │
│   │   │  Word    │    │          │    │ Encoder  │             │           │
│   │   │  (CNN)   │    │          │    │ (Opus)   │             │           │
│   │   └──────────┘    └──────────┘    └────┬─────┘             │           │
│   └────────────────────────────────────────│─────────────────────┘           │
│                                            │                                 │
│                          Encrypted Audio Stream                             │
│                                            │                                 │
│                                            ▼                                 │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │                    CLOUD SERVICES                            │           │
│   │                                                              │           │
│   │   ┌──────────┐    ┌──────────┐    ┌──────────┐             │           │
│   │   │   ASR    │───▶│   NLU    │───▶│ Dialogue │             │           │
│   │   │Conformer │    │JointBERT │    │ Manager  │             │           │
│   │   │+ RNN-T   │    │          │    │          │             │           │
│   │   └──────────┘    └──────────┘    └────┬─────┘             │           │
│   │                                        │                    │           │
│   │   "play jazz"     Intent: PlayMusic    │                    │           │
│   │                   Slot: genre=jazz     │                    │           │
│   │                                        ▼                    │           │
│   │                              ┌──────────────────┐           │           │
│   │                              │  Skill Router    │           │           │
│   │                              └────────┬─────────┘           │           │
│   │                    ┌─────────────────┼─────────────────┐    │           │
│   │                    ▼                 ▼                 ▼    │           │
│   │              ┌──────────┐     ┌──────────┐     ┌──────────┐│           │
│   │              │ 1P Skills│     │ 3P Skills│     │   LLM    ││           │
│   │              │ (Weather,│     │ (Lambda) │     │ (Alexa+) ││           │
│   │              │  Music)  │     │          │     │          ││           │
│   │              └────┬─────┘     └────┬─────┘     └────┬─────┘│           │
│   │                   └────────────────┴────────────────┘      │           │
│   │                                    │                        │           │
│   │                                    ▼                        │           │
│   │                         ┌──────────────────┐               │           │
│   │                         │    TTS (VITS)    │               │           │
│   │                         │  "Playing jazz"  │               │           │
│   │                         └────────┬─────────┘               │           │
│   └──────────────────────────────────│──────────────────────────┘           │
│                                      │                                      │
│                            Audio Stream                                     │
│                                      │                                      │
│                                      ▼                                      │
│                              ┌──────────────┐                               │
│                              │   Speaker    │                               │
│                              └──────────────┘                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Points to Mention While Drawing

1. **Wake Word is ON-DEVICE**: "Wake word detection must be on-device for privacy - we never send audio until the wake word is detected."

2. **Streaming ASR**: "ASR uses streaming architecture (RNN-T) so we can start processing as the user speaks, not wait until they finish."

3. **Joint NLU**: "NLU uses a joint model (JointBERT) that does intent classification and slot extraction in a single pass."

4. **Skill Routing**: "The dialogue manager routes to traditional skills for high-confidence intents, but can route to LLM for complex queries."

5. **Streaming TTS**: "TTS streams audio back so we can start playing before the full response is generated."

---

## Deep Dive Options

### Option A: Wake Word Detection

**When to choose**: Interviewer asks about on-device processing, privacy, or embedded systems.

**Key points to cover**:
```
1. ARCHITECTURE
   • Always-on processing (DSP/NPU)
   • 2-second rolling audio buffer
   • MFCC feature extraction
   • Small CNN (14KB quantized)

2. ALGORITHM
   • 20ms audio frames
   • 13 MFCC coefficients + deltas
   • Binary classification (wake word vs not)
   • Confidence threshold (0.95)
   • Debounce (2 second minimum between triggers)

3. KEY TRADE-OFFS
   • False accept vs false reject
   • Accuracy vs power consumption
   • On-device vs cloud verification

4. ATTACKS TO MENTION
   • Ultrasonic attacks (DolphinAttack)
   • Replay attacks
   • Near-miss words
```

### Option B: Streaming ASR

**When to choose**: Interviewer asks about latency, ML models, or speech processing.

**Key points to cover**:
```
1. ARCHITECTURE
   • Conformer encoder (self-attention + convolution)
   • RNN-T decoder (streaming output)
   • Language model rescoring

2. LATENCY BREAKDOWN
   • Audio capture: 20ms frames
   • Feature extraction: 5ms
   • Encoder forward: 50ms per frame
   • Decoder: 10ms
   • Total: ~150ms to first partial

3. KEY OPTIMIZATIONS
   • Streaming attention (limited context)
   • INT8 quantization
   • Contextual biasing (user contacts, music)
   • Edge deployment for common queries

4. ACCURACY METRICS
   • Word Error Rate (WER) < 5%
   • Sentence Error Rate < 15%
```

### Option C: NLU + Dialogue Management

**When to choose**: Interviewer asks about intent handling, multi-turn conversations, or LLM integration.

**Key points to cover**:
```
1. NLU ARCHITECTURE
   • JointBERT for intent + slot
   • Hierarchical classification (domain → intent)
   • BIO tagging for slot extraction

2. DIALOGUE STATE TRACKING
   • Belief state maintenance
   • Slot carryover across turns
   • Follow-up mode (8 second window)

3. LLM ROUTING
   • Confidence threshold (0.8)
   • Route to LLM for low-confidence intents
   • Function calling for skill execution

4. MULTI-TURN EXAMPLE
   • User: "Play music"
   • System: "What kind?" (missing slot)
   • User: "Jazz"
   • System: Carries over intent, fills slot
```

### Option D: Scalability

**When to choose**: Interviewer asks about handling millions of devices.

**Key points to cover**:
```
1. CONNECTION MANAGEMENT
   • 500M concurrent WebSocket connections
   • Regional gateways (100+ PoPs)
   • ~50K connections per gateway instance

2. GPU CLUSTER SCALING
   • ASR: 5,000 H100 GPUs at peak
   • TTS: 2,500 A100 GPUs at peak
   • Auto-scaling based on queue depth

3. MULTI-REGION
   • Process in user's region for latency
   • User data replicated async
   • Session data is region-local

4. GRACEFUL DEGRADATION
   • Cloud down → Edge ASR fallback
   • NLU down → Pattern matching
   • Internet down → Offline mode (timers, alarms)
```

---

## Trade-off Discussions

### Trade-off 1: Latency vs Accuracy

| Choice | Latency | Accuracy | When to Choose |
|--------|---------|----------|----------------|
| On-device ASR | Best (~100ms) | Lower (8% WER) | Privacy mode, offline |
| Edge ASR | Good (~200ms) | Good (5% WER) | Low-latency regions |
| Cloud ASR (full) | Acceptable (~400ms) | Best (3% WER) | Accuracy critical |

**Talking point**: "The right choice depends on the use case. For simple commands like 'set timer 5 minutes', on-device is fine. For complex queries, we want cloud accuracy. A hybrid approach routes based on expected complexity."

### Trade-off 2: Privacy vs Features

| Approach | Privacy | Features | Trade-off |
|----------|---------|----------|-----------|
| Fully on-device | Highest | Basic only | Limited vocabulary, no 3P skills |
| Local wake word + cloud | High | Full | Good balance for most users |
| Full cloud | Lower | Best | Highest accuracy, more data exposure |

**Talking point**: "Apple prioritizes privacy with on-device processing, while Google prioritizes accuracy with cloud. We can offer user choice - a privacy mode that uses more on-device processing with reduced accuracy."

### Trade-off 3: Traditional Skills vs LLM

| Approach | Cost | Reliability | Flexibility |
|----------|------|-------------|-------------|
| Traditional only | Very low | Very high | Limited (fixed intents) |
| Hybrid (route to LLM) | Medium | High | Best of both |
| Full LLM | Very high | Medium | Highest (open-ended) |

**Talking point**: "LLMs are expensive ($0.01+ per query) and can hallucinate. Traditional skills are deterministic and fast. The modern approach (Alexa+, Gemini) uses routing - deterministic skills for timers and smart home, LLM for complex questions."

---

## Trap Questions and Answers

### Trap 1: "Why not just use ChatGPT for everything?"

**Bad answer**: "That's a great idea, LLMs can handle any query."

**Good answer**:
> "While LLMs are powerful, there are several reasons voice assistants don't rely solely on them:
> 1. **Latency**: LLM inference takes 1-5 seconds; users expect <1s response
> 2. **Cost**: At 10B queries/day, $0.01 per LLM call = $100M/day
> 3. **Reliability**: LLMs hallucinate; 'turn off the lights' must be deterministic
> 4. **Predictability**: For purchases and smart home, we need exact execution
>
> The best approach is hybrid routing - deterministic skills for commands, LLM for open-ended questions."

### Trap 2: "How do you handle privacy with always-on microphones?"

**Bad answer**: "We encrypt everything and users trust us."

**Good answer**:
> "Privacy is critical because the microphone is always listening. Our approach:
> 1. **On-device wake word**: Pre-wake-word audio NEVER leaves the device
> 2. **Hardware mute**: Physical button that electrically disconnects the mic
> 3. **User control**: Dashboard to view/delete history, opt-out of retention
> 4. **Data minimization**: Audio deleted after processing by default
> 5. **Transparency**: Activity cards show exactly what was captured
>
> The key principle is that audio only transmits AFTER wake word is detected on-device."

### Trap 3: "What if ASR makes a mistake?"

**Bad answer**: "We retry the request."

**Good answer**:
> "ASR errors are inevitable. We handle them at multiple levels:
> 1. **Confidence scores**: If ASR confidence is low, we might ask for clarification
> 2. **NLU robustness**: NLU is trained on ASR outputs, so it handles common errors
> 3. **Contextual biasing**: We boost probability of user's contacts, music
> 4. **Implicit feedback**: If user immediately rephrases, we learn from the correction
> 5. **Graceful recovery**: 'I didn't catch that, could you repeat?'
>
> The goal isn't perfect ASR - it's that the end-to-end system still does the right thing."

### Trap 4: "Just add more servers to scale."

**Bad answer**: "Yes, horizontal scaling solves everything."

**Good answer**:
> "Scaling isn't just about adding servers. For voice assistants:
> 1. **Connection management**: 500M persistent WebSockets require careful architecture
> 2. **GPU scarcity**: ASR needs thousands of GPUs - procurement is a bottleneck
> 3. **Latency**: Adding servers in one region doesn't help users in another
> 4. **State management**: Sessions need to be handled carefully during scale events
>
> We need multi-region deployment, auto-scaling with warm-up time for GPUs, and graceful degradation when capacity is limited."

### Trap 5: "How would you handle 100x traffic suddenly?"

**Bad answer**: "Auto-scaling handles it automatically."

**Good answer**:
> "100x is beyond normal auto-scaling. Here's the approach:
> 1. **Graceful degradation**: Drop to edge ASR (lower accuracy, handles more)
> 2. **Request shedding**: Prioritize returning users, shed new connections
> 3. **Feature reduction**: Disable LLM routing, non-essential skills
> 4. **Regional distribution**: Route to less-loaded regions if possible
>
> Realistically, 100x traffic (like a coordinated wake word attack) would require pre-planning. We'd have runbooks for major events like Super Bowl."

---

## Quick Reference Card

### Key Numbers to Remember

| Metric | Value | Context |
|--------|-------|---------|
| E2E Latency Target | <1s P99 | User expectation |
| Wake Word Latency | <200ms | Feel instant |
| ASR Latency | <300ms | Streaming helps |
| TTS Time-to-First-Audio | <50ms | Perceived speed |
| Wake Word False Accept | <1/week/device | Privacy requirement |
| ASR Word Error Rate | <5% | Production quality |
| NLU Intent Accuracy | >95% | Acceptable |
| Active Devices | 500M | Alexa scale |
| Daily Queries | 10B | Peak ~350K QPS |
| Skills Ecosystem | 100K+ | Third-party |

### Key Algorithms

| Algorithm | Where Used | Complexity |
|-----------|------------|------------|
| MFCC + CNN | Wake Word | O(T×F) per frame |
| Conformer + RNN-T | ASR | O(T×D²) |
| JointBERT | NLU | O(N²×D) |
| VITS | TTS | O(T×D) |
| Belief State Update | Dialogue | O(S×V) |

### Key Architecture Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Wake word location | On-device | Privacy, latency |
| ASR model | Conformer + RNN-T | Streaming, accuracy |
| NLU approach | Joint intent/slot | Single pass efficiency |
| Dialogue state | Redis | Fast, TTL support |
| TTS model | VITS | Quality/speed balance |
| LLM integration | Routing-based | Cost, reliability |

### Component Technologies

| Component | Technology | Notes |
|-----------|------------|-------|
| Wake Word | DSP + NPU, TF Lite | 14KB quantized |
| ASR | PyTorch, H100 GPUs | Conformer-XL |
| NLU | Transformers, ONNX | DistilBERT |
| TTS | PyTorch, A100 GPUs | VITS |
| Skills | Lambda, Containers | Serverless 3P |
| Session Store | Redis Cluster | TTL-based cleanup |
| Gateway | Go, Envoy | High concurrency |

---

## Common Mistakes to Avoid

1. **Jumping to solution without clarifying**: Always ask about scale, device types, and priorities first.

2. **Forgetting on-device processing**: Wake word MUST be on-device for privacy. Mention this explicitly.

3. **Ignoring streaming**: Voice needs streaming ASR and TTS. Don't design batch-only systems.

4. **Over-relying on LLMs**: Recognize cost, latency, and reliability trade-offs of LLM integration.

5. **Skipping multi-turn dialogue**: Real voice assistants handle context across turns. Include dialogue state.

6. **Ignoring failure modes**: Discuss what happens when cloud is down, skills timeout, or ASR fails.

7. **Not considering privacy**: Always mention data handling, retention policies, and user controls.

8. **Forgetting about scale**: 500M devices with 20 queries/day = 10B queries. Do the math.

---

## Interview Closing Checklist

Before wrapping up, ensure you've covered:

- [ ] 6-stage pipeline (wake word → ASR → NLU → dialogue → skill → TTS)
- [ ] On-device vs cloud trade-offs
- [ ] At least one deep dive (wake word, ASR, or NLU)
- [ ] Scalability approach (multi-region, GPU clusters)
- [ ] Failure handling (graceful degradation)
- [ ] Privacy considerations
- [ ] Key metrics (latency, accuracy targets)
