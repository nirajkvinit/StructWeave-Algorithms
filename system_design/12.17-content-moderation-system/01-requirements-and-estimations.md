# 12.17 Content Moderation System — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **Multi-modal ingestion** — Accept content items of type text, image, video, and audio from platform APIs, internal services, and user-report pipelines | Single unified ingest interface with content-type routing |
| FR-02 | **Pre-publication screening** — For designated high-risk content categories (CSAM, terrorist content), screen content before it is visible to any user | Hard requirement; synchronous block on upload for flagged categories |
| FR-03 | **Automated classification** — Score ingested content against an ensemble of specialized models for toxicity, hate speech, NSFW, violence, spam, PII, and copyright | Produce per-category confidence scores and a composite severity score |
| FR-04 | **Perceptual hash matching** — Match images and videos against known-bad hash databases (CSAM, terrorist imagery, copyright) using perceptual similarity | Support pHash, PDQ, and PhotoDNA; must tolerate crop/resize/recompress |
| FR-05 | **Policy engine evaluation** — Apply configurable geo-specific and account-trust-aware policy rules to determine enforcement action (allow, soft-label, restrict, remove, escalate) | Hot-reloadable rules without model retraining |
| FR-06 | **Human review queue** — Route near-threshold and high-severity-but-unconfident items to human reviewers with priority weighting, skill-based assignment, and SLA timers | Queue must be drainable within regulatory SLA windows |
| FR-07 | **Reviewer interface** — Provide a moderation workstation UI with graduated content blurring, one-click policy decisions, audit logging, and wellness check-in integration | Interface performance is a reviewer throughput constraint |
| FR-08 | **Appeals workflow** — Allow content creators to appeal moderation decisions through a structured multi-tier process (automated re-review → senior reviewer → expert panel) | Track SLA, outcome, and DSA reporting fields for every appeal |
| FR-09 | **User reporting** — Accept user-submitted reports for content that escaped initial moderation; route to reactive review queue with expedited priority | Aggregate report volume is a signal for viral bad-content detection |
| FR-10 | **Enforcement actions** — Execute a range of enforcement actions: content removal, shadow restriction, age-gating, account warning, account suspension, account termination | All actions must be reversible pending appeals |
| FR-11 | **Transparency reporting** — Generate structured reports (DSA-compliant, machine-readable) on takedown volumes, appeal outcomes, false positive rates, and reviewer throughput | Submitted to DSA Transparency Database on a regulatory schedule |
| FR-12 | **NCMEC reporting** — Automatically file CyberTipline reports for confirmed CSAM content with required metadata (hash, context, user data) | Legal obligation in applicable jurisdictions; time-bound |
| FR-13 | **Adversarial signal ingestion** — Consume cross-platform hash updates and adversarial pattern alerts from industry coalitions (Technology Coalition, GIFCT) | Near-real-time; updates policy engine and hash databases without downtime |
| FR-14 | **Audit trail** — Maintain an immutable, tamper-evident log of every classification, human decision, enforcement action, and appeal adjudication | Required for legal discovery and regulatory audits |

---

## Out of Scope

- **Generative AI output filtering** — Filtering AI-generated content at inference time (separate guardrails system)
- **Spam/fraud at account creation** — Account-level trust scoring and fraud detection (separate trust & safety subsystem)
- **Advertiser brand safety** — Contextual adjacency checks for ad placement (separate ad safety system)
- **Copyright dispute resolution** — DMCA counter-notice legal workflows (separate legal operations system)
- **Physical safety response** — Coordination with law enforcement beyond mandatory NCMEC reporting

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Pre-publication screening latency (p99) | ≤ 500 ms | Upload must not feel blocked to users |
| Post-publication proactive scan latency | ≤ 5 minutes | Viral content window mitigation |
| Reactive (user-reported) review SLA | ≤ 24 hours for standard; ≤ 1 hour for CSAM/terrorism | DSA illegal content SLA + NCMEC obligation |
| Appeals first response SLA | ≤ 72 hours for automated re-review | DSA compliance |
| Hash matching throughput | ≥ 500,000 items/minute | Peak ingest headroom |
| Model inference freshness | New models deployed within 4 hours of approval | Adversarial response window |

### Reliability & Availability

| Metric | Target |
|---|---|
| System availability | 99.95% (≤ 26 minutes downtime/month) |
| Hash DB consistency | 99.999% read consistency; updates propagated within 60 seconds |
| Decision log durability | 99.9999999% (9 nines); replicated across ≥ 3 geographic regions |
| Graceful degradation | During ML inference outage, queue for human review rather than block or auto-allow |

### Scalability

| Metric | Target |
|---|---|
| Content ingest throughput | 10M items/hour baseline; 50M items/hour during peak events |
| Human review queue depth | Support 5M queued items without throughput degradation |
| Reviewer concurrent sessions | Up to 50,000 simultaneous reviewer workstations globally |
| Model serving | Auto-scale GPU inference fleet to meet latency SLO under 5x traffic spikes |

### Security & Compliance

| Requirement | Specification |
|---|---|
| CSAM handling | Reviewer viewing of CSAM subject to daily exposure caps; content blurred by default; hash stored not image |
| Data sovereignty | User data processed in geographic region matching user's location where legally required |
| Audit log immutability | Append-only log with cryptographic chaining; no delete path |
| Access control | Role-based access; reviewers cannot access raw CSAM without supervisor approval and logged justification |

---

## Capacity Estimations

### Traffic Model

**Assumptions:**
- 500M daily active users (DAU)
- Each user generates ~2 content items/day on average (posts, comments, images, videos)
- 20% of content is image/video; 80% text
- Peak-to-average ratio: 3x (event-driven spikes around news events)

```
Daily content items:
  500M users × 2 items = 1B items/day

Per-second baseline:
  1B / 86,400 = ~11,600 items/sec (baseline)
  Peak:         11,600 × 3 = ~35,000 items/sec

Per-hour (peak):
  35,000 × 3,600 = 126M items/hour
  (Headroom sizing: 200M items/hour to handle event spikes)
```

### Classification Pipeline

```
Text classification (BERT-based):
  Throughput per GPU:    ~10,000 texts/sec (batch inference)
  GPUs needed (peak):   35,000 / 10,000 = 4 GPUs baseline
  With headroom (3x):   ~12 GPUs for text

Image classification (ViT/ResNet ensemble):
  Items/sec (image):    35,000 × 20% = 7,000 images/sec
  Throughput per GPU:   ~2,000 images/sec
  GPUs needed:          7,000 / 2,000 = 4 GPUs
  With headroom:        ~12 GPUs for image

Video (frame extraction + classification):
  Average video: 60 sec, sampled at 2 fps = 120 frames
  Video items/sec: 7,000 × 10% (of image/video) = 700 videos/sec
  Frame throughput: 700 × 120 = 84,000 frames/sec
  GPUs needed: 84,000 / 2,000 = 42 GPUs for video
  Total GPU fleet (with headroom + redundancy): ~200 GPUs
```

### Hash Matching

```
Hash database size:
  CSAM known hash DB:     ~2M hashes (NCMEC + Technology Coalition)
  Copyright DB:           ~500M audio fingerprints, ~100M image hashes
  Terrorist content DB:   ~300K hashes (GIFCT)

Hash computation throughput:
  pHash computation:      ~50,000 hashes/sec per CPU core
  Cores needed (peak):    7,000 images/sec / 50,000 = 0.14 cores → trivial
  Matching via LSH index: sub-millisecond per query

Hash DB storage:
  Each 1152-bit PhotoDNA hash: 144 bytes
  2M hashes: 288 MB → fits in memory on every hash-matching node
```

### Human Review Queue

```
Routing rate:
  Items requiring human review: ~2% of total content
  35,000/sec × 2% = 700 items/sec → 2.52M items/hour at peak

Reviewer throughput:
  Average review time: 30 seconds/item (text); 90 seconds/item (video)
  Reviewer capacity:   120 items/hour (text); 40 items/hour (video)
  Reviewers needed (peak, text): 2.52M × 80% / 120 = ~16,800 reviewers
  Reviewers needed (peak, video): 2.52M × 20% / 40 = ~12,600 reviewers
  Total reviewer headcount target: ~30,000 globally (with contractor pools)

Queue depth capacity:
  At 24-hour SLA with 30,000 reviewers:
    Capacity: 30,000 × 120 items/hour × 24 hours = 86.4M reviews/day
    Incoming (baseline): 700/sec × 86,400 = 60.5M items/day
  Queue is drainable at baseline; surge requires temporary contractor ramp-up
```

### Storage Estimations

```
Content metadata (per item):
  content_item record: ~500 bytes
  moderation_decision: ~300 bytes
  model scores JSON: ~200 bytes
  Total per item: ~1 KB

Daily storage:
  1B items/day × 1 KB = 1 TB/day metadata

Audit log:
  Every action appended: ~200 bytes/event
  ~5 events per item average: 1B × 5 × 200 bytes = 1 TB/day

Video frame storage (temporary, 7-day TTL):
  700 videos/sec × 120 frames × 100KB/frame = 8.4 TB/sec → NOT stored
  Only extracted features (embeddings) stored: ~4 KB/video
  Feature storage: 700 × 3600 × 24 × 4KB = ~242 GB/day

Total storage growth: ~2-3 TB/day metadata + audit; 10-year retention
  Year 1: ~1 PB
  Year 5: ~5 PB (with compression and tiering)
```

### SLO Summary

| SLO | Target | Measurement Window |
|---|---|---|
| Pre-publication p99 latency | 500 ms | Rolling 1-hour |
| Hash match p99 latency | 50 ms | Rolling 1-hour |
| Human review queue SLA compliance | 99% within defined SLA | Weekly |
| Model classification availability | 99.95% | Monthly |
| Appeals response SLA compliance | 95% within 72 hours | Monthly |
| NCMEC report submission latency | 100% within 24 hours of CSAM confirmation | Per-incident |
| Transparency report delivery | 100% on regulatory schedule | Quarterly |
