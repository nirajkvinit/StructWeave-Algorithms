# 13.6 AI-Native Media & Entertainment Platform — Interview Guide

## Interview Structure (45 Minutes)

| Phase | Duration | Focus |
|---|---|---|
| **Phase 1: Requirements Scoping** | 8 min | Clarify which media platform capabilities to design; establish scale and content types |
| **Phase 2: High-Level Architecture** | 12 min | Content generation pipeline, audience intelligence, ad platform, provenance tracking |
| **Phase 3: Deep Dive** | 15 min | Candidate-chosen area: GPU orchestration, dubbing pipeline, personalization, or ad optimization |
| **Phase 4: Reliability & Security** | 7 min | Content safety, rights management, provenance integrity, data privacy |
| **Phase 5: Trade-offs & Extensions** | 3 min | Cost optimization, multi-modal expansion, real-time generation |

---

## Phase 1: Requirements Scoping (8 min)

### Opening Prompt

*"Design an AI-native media and entertainment platform that handles content generation, audience personalization, ad optimization, dubbing/localization, and content provenance tracking."*

### Key Scoping Questions the Candidate Should Ask

| Question | Why It Matters | Strong Answer |
|---|---|---|
| "What content types are we generating — video, image, audio, or all three?" | GPU orchestration complexity varies dramatically by content type | "All three, with video as the most compute-intensive; we need multi-model orchestration with different latency and resource profiles" |
| "Is content generation interactive (creator waiting) or batch (campaign generation), or both?" | Scheduling strategy depends on latency requirements | "Both — interactive for creator workflows with ≤45s SLO, batch for ad campaigns with hours-level deadline; these require different GPU scheduling queues" |
| "What is the viewer scale — DAU, concurrent streams, ad-supported vs. subscription?" | Personalization and ad platform sizing depend on viewer volume | "50M DAU, 10M concurrent ad-supported streams; each stream requires per-viewer ad decisions and personalized content presentation" |
| "Are we dubbing into a few languages or many? With lip-sync or audio-only?" | Lip-sync adds 5–10× complexity over audio-only dubbing | "40+ languages with lip-sync — this is the hard version requiring phoneme-level alignment and face mesh transformation" |
| "What are the regulatory requirements for AI content disclosure?" | C2PA/provenance significantly impacts architecture | "EU AI Act compliance — all AI content must be disclosed with cryptographic provenance chains; this affects every processing step" |

### Red Flags in Requirements Phase

- Does not distinguish between interactive and batch generation workloads
- Ignores the lip-sync challenge and treats dubbing as simple text-to-speech
- Does not ask about content safety or provenance (critical for AI-generated media)
- Treats ad insertion as simple pre-roll placement without considering viewer retention impact
- Assumes homogeneous GPU requirements across all content types

---

## Phase 2: High-Level Architecture (12 min)

### What Strong Candidates Cover

1. **Multi-model orchestration**: Explicitly identify that video, image, and audio generation use different models with different GPU requirements. Describe the GPU scheduler that routes jobs to appropriate hardware and manages priority preemption.

2. **Content safety as a first-class architectural concern**: Not a bolt-on filter but a multi-stage pipeline (pre-generation, mid-generation, post-generation) that is on the critical path for every generated asset.

3. **Dual-speed data architecture**: Distinguish between the fast path (real-time viewer events → feature store → personalization API, 30-second freshness) and the slow path (daily batch retraining of recommendation models).

4. **Server-side ad insertion**: Explain why SSAI is preferred over client-side (ad blocker resistance, seamless viewer experience) and the architectural cost (per-viewer manifest generation at CDN edge).

5. **Provenance chain**: Describe how C2PA manifests flow through the pipeline—every transformation (generation, transcode, dub, crop, watermark, ad insertion) must append to the manifest without breaking the signature chain.

6. **Subsystem decomposition**: Content Generation Engine, Dubbing & Localization Service, Audience Intelligence Layer, Ad Optimization Platform, Rights & Provenance Service, Content Safety Pipeline.

### Architecture Diagram Expectations

Strong candidates draw:
- Clear separation between GPU-intensive services (generation, dubbing, safety classification) and latency-sensitive services (personalization, ad decisions, rights verification)
- Event bus connecting subsystems (generation → safety → provenance → asset store)
- CDN edge layer with personalization and ad decision capability
- Separate data stores for different access patterns (time-series for events, document store for assets, relational for rights)

### Red Flags in Architecture Phase

- Monolithic "AI service" that handles all generation types without model-specific routing
- No event bus or message broker — synchronous calls between all services
- Content safety as a post-publication manual review step
- No mention of CDN edge or multi-region deployment for viewer-facing services
- Rights management as an afterthought rather than integrated into the playback path

---

## Phase 3: Deep Dive (15 min)

### Option A: GPU Orchestration Deep Dive

**Key points a strong candidate covers:**
- Multi-tier scheduling (interactive, realtime, batch) with different SLOs
- Model-affinity scheduling to avoid 30–90s cold starts (keep popular models warm in GPU memory)
- Checkpoint-resume for preemptible long-running jobs (video generation checkpoints every 10s)
- GPU memory fragmentation as an operational concern (periodic compaction needed)
- Cost optimization: spot instances for batch work, reserved for interactive; mixed-precision (FP8) where quality is preserved
- Bin-packing across heterogeneous GPU hardware (different memory sizes, compute capabilities)

**Probe questions:**
- "A creator submits an interactive video generation request but all GPUs running that model are busy with batch jobs. What happens?" → Expects: preempt batch job at checkpoint, resume later
- "How do you handle a GPU that starts producing corrupt output (bit-flip in non-ECC memory)?" → Expects: quality score monitoring, automatic job migration, GPU quarantine
- "What happens when a spot instance is reclaimed mid-generation?" → Expects: checkpoint stored in durable storage, job re-queued on different instance, resume from checkpoint

### Option B: Dubbing Pipeline Deep Dive

**Key points a strong candidate covers:**
- Speaker diarization → voice embedding → per-language synthesis → lip-sync transformation pipeline
- Cross-language timing challenge: languages have different syllable rates, dubbed audio may be longer/shorter than source
- Phoneme-level lip-sync alignment (not just global audio-visual sync); varying tolerance by phoneme class
- Multi-speaker scene handling: per-speaker face tracking, independent lip-sync, occlusion management
- Quality assurance pipeline: automated scoring (sync score, voice similarity, emotion match, naturalness MOS) before human review
- Voice cloning consent management as a first-class concern

**Probe questions:**
- "A 5-second English sentence translates to 7 seconds in Japanese. How does the lip-sync pipeline handle this?" → Expects: pause compression, speaking rate adjustment, or video segment extension; discuss trade-offs of each
- "Two speakers are talking simultaneously in a split-screen scene. How does lip-sync work?" → Expects: independent face tracking and lip-sync per speaker, parallel processing
- "A performer revokes voice cloning consent. What happens to content already dubbed with their voice?" → Expects: re-dub with alternative voice within 90 days, automated pipeline to identify affected content

### Option C: Personalization Deep Dive

**Key points a strong candidate covers:**
- Real-time behavioral feature store with 30-second freshness (streaming computation from viewer events)
- Multi-stage recommendation ranking: candidate retrieval (ANN) → filtering → scoring → re-ranking
- Contextual bandit for thumbnail selection (Thompson Sampling with viewer features as context)
- Cold-start handling cascade: session signals → demographic priors → exploration boost
- Feature store scaling: sharding by viewer_id, read replicas, cross-region replication
- Experimentation platform: sequential hypothesis testing for early stopping, interaction detection between concurrent experiments

**Probe questions:**
- "A viewer skips 3 action movies in a row. How quickly does the personalization adapt?" → Expects: real-time feature update within 30s; genre affinity decays; next page load reflects change
- "How do you avoid filter bubbles while still personalizing?" → Expects: diversity injection in re-ranking, serendipity slot in recommendations, diversity score monitoring
- "Two A/B experiments both affect thumbnail selection. How do you handle interaction effects?" → Expects: factorial experiment design or mutual exclusion; interaction detection in analysis

### Option D: Ad Optimization Deep Dive

**Key points a strong candidate covers:**
- 200ms latency budget breakdown (feature lookup, bid fan-out, evaluation, SSAI)
- Yield vs. retention trade-off: session-level ad load optimization, not per-break optimization
- SSAI manifest generation at CDN edge for per-viewer ad decisions
- Brand safety enforcement at ad decision time (not just content-level, but segment-level for long-form content)
- AI-generated creative variants: batch generation, variant selection at decision time
- Demand partner latency management: speculative bidding with early close, partner exclusion

**Probe questions:**
- "A demand partner's latency spikes from 50ms to 150ms during prime time. What happens?" → Expects: early close at 60ms proceeds without that partner; partner latency tracked and pre-excluded if p95 consistently > 90ms
- "How do you prevent the same viewer from seeing the same ad 10 times in one session?" → Expects: frequency capping in ad decision engine, per-viewer impression counter, competitive separation rules
- "An AI-generated ad creative accidentally contains a competitor's logo. How is this caught?" → Expects: trademark detection in creative safety pipeline, post-generation scanning, A/B test gate before broad deployment

---

## Phase 4: Reliability & Security (7 min)

### What Strong Candidates Cover

1. **Content safety reliability**: Safety pipeline fails closed (blocks publication, never fails open). Re-scan published content with updated classifiers to catch evolving violation patterns.

2. **Rights verification as a critical path**: Rights check at playback start, fail-closed design (block playback if rights cannot be verified). Synchronous replication for rights database (zero RPO).

3. **Provenance chain integrity**: Every pipeline component must be C2PA-aware. Manifest chain breaks are compliance violations, not just data quality issues. Immutable, append-only manifest storage.

4. **GPU cluster reliability**: 1–2 GPU failures per day expected in a 10,000 GPU cluster. Checkpoint-resume handles this transparently. Model version rollback if new model produces safety violations.

5. **Voice cloning consent and privacy**: Performer consent management, consent revocation triggers re-dubbing, voice embeddings are biometric data requiring special protection.

### Red Flags in Reliability Phase

- Safety pipeline that can be bypassed ("just skip the safety check for urgent content")
- Rights verification that fails open (serves content when rights service is unavailable)
- No mention of provenance chain integrity across transcoding and CDN delivery
- Ignores voice cloning consent as a privacy concern
- No discussion of GPU failure frequency at scale

---

## Phase 5: Trade-offs & Extensions (3 min)

### Extension Questions

| Question | What It Tests |
|---|---|
| "How would you add real-time interactive generation (viewer customizes content while watching)?" | Streaming generation architecture, latency requirements, GPU reservation vs. on-demand |
| "How would you handle a creator who uses the platform to mass-generate copyrighted character lookalikes?" | Copyright detection, usage policy enforcement, similarity thresholds, appeal process |
| "How would you expand to user-generated content where anyone can generate and publish?" | Safety scaling, abuse prevention, content moderation at scale, quality signal degradation |
| "How would you add AI-generated music scoring that matches the emotional arc of video content?" | Multi-modal alignment, temporal emotion analysis, music generation models |

---

## Scoring Rubric

### Requirements Phase (15 points)

| Criterion | Points | What Distinguishes Strong from Weak |
|---|---|---|
| Content type scoping | 3 | Identifies heterogeneous GPU requirements across video/image/audio vs. treating all generation as equivalent |
| Viewer scale awareness | 3 | Quantifies DAU, concurrent streams, and ad decision volume vs. vague "millions of users" |
| Safety and provenance awareness | 3 | Proactively identifies content safety and AI disclosure as architectural constraints vs. ignoring them |
| Dubbing complexity recognition | 3 | Asks about lip-sync and language count vs. assuming dubbing is simple TTS |
| Interactive vs. batch distinction | 3 | Recognizes different latency requirements and scheduling needs vs. single generation pipeline |

### Architecture Phase (30 points)

| Criterion | Points | What Distinguishes Strong from Weak |
|---|---|---|
| Multi-model GPU orchestration | 6 | Dedicated scheduler with priority queues, model affinity, checkpoint-resume vs. simple job queue |
| Content safety pipeline | 6 | Multi-stage (pre + post generation), fail-closed, human escalation vs. single post-hoc filter |
| Personalization architecture | 6 | Real-time feature store + batch model + contextual bandit vs. batch-only collaborative filtering |
| Ad platform design | 6 | SSAI, latency budget breakdown, yield/retention trade-off vs. simple pre-roll ad server |
| Provenance integration | 6 | C2PA-aware pipeline, manifest chain across transformations vs. metadata tagging without cryptographic guarantees |

### Deep Dive Phase (35 points)

| Criterion | Points | What Distinguishes Strong from Weak |
|---|---|---|
| Technical depth | 10 | Specific algorithms, quantified trade-offs, implementation details vs. high-level hand-waving |
| Bottleneck identification | 10 | Identifies and mitigates non-obvious bottlenecks (GPU fragmentation, lip-sync timing, partner latency) vs. only addressing obvious issues |
| Production awareness | 10 | Addresses operational concerns (failure rates, cost optimization, monitoring) vs. only covering happy path |
| Trade-off articulation | 5 | Clearly states alternatives considered and why the chosen approach is preferred vs. presenting one option as obviously correct |

### Reliability & Security Phase (20 points)

| Criterion | Points | What Distinguishes Strong from Weak |
|---|---|---|
| Fail-closed safety and rights | 5 | Explicitly states fail-closed for safety and rights vs. fail-open or unspecified |
| GPU cluster reliability | 5 | Quantifies failure rates, describes checkpoint-resume, model rollback vs. "GPUs are reliable" |
| Privacy and consent | 5 | Voice cloning consent, viewer data minimization, right to erasure vs. ignoring privacy |
| Provenance durability | 5 | Immutable manifest storage, chain break detection, regulatory compliance awareness vs. treating provenance as optional metadata |

### Total: 100 points

| Score Range | Assessment |
|---|---|
| 85–100 | Strong hire — deep understanding of AI media systems, production awareness, excellent trade-off articulation |
| 70–84 | Hire — solid architecture with good depth in at least one area; minor gaps in production awareness |
| 55–69 | Borderline — reasonable high-level design but lacks depth in deep dive; misses key safety/provenance concerns |
| 40–54 | Lean no — incomplete architecture, does not address content safety or provenance adequately |
| < 40 | No — fundamental gaps in understanding GPU orchestration, personalization, or ad systems |

---

## Common Mistakes to Watch For

1. **Treating content generation as a simple API call**: Candidates who say "just call the generation model" without discussing GPU scheduling, model loading, checkpoint-resume, and cost optimization
2. **Ignoring the lip-sync perception challenge**: Treating dubbing as translate → TTS → overlay audio, missing the phoneme-level visual alignment requirement
3. **Optimizing ad revenue per impression instead of per session**: Missing the yield vs. retention trade-off where lighter ad load can increase total revenue through longer sessions
4. **Content safety as a bolt-on**: Designing the generation pipeline first, then adding safety "at the end" rather than integrating it as a first-class pipeline stage
5. **Ignoring provenance at scale**: Not considering that every transcoding, cropping, and CDN operation must update the C2PA manifest, and that legacy media tools strip metadata
6. **Assuming personalization is just collaborative filtering**: Missing the real-time feature store, contextual bandits for variants, cold-start problem, and filter bubble avoidance
