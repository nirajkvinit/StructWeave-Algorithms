# 12.20 AI-Native Recruitment Platform — Scalability & Reliability

## Horizontal Scaling Architecture

### Stateless Services and Their Scaling Axes

The platform is designed around the principle that compute is horizontally scalable; data is the hard part. Each service is stateless with respect to individual requests; all durable state is pushed to dedicated data stores:

| Service | Scaling Axis | State Location |
|---|---|---|
| Candidate API Gateway | Replica count (CPU-bound) | No local state; session state in distributed store |
| Dialogue Manager | Replica count (CPU-bound) | Dialogue session state in distributed key-value store |
| Embedding Service | GPU replica count | No local state; model loaded at startup |
| ANN Vector Index | Sharded by candidate_id hash | HNSW index shards; 1 shard = ~50M vectors |
| Compatibility Model | GPU/CPU replica count | Model artifact loaded from object storage |
| Assessment Engine | Replica count (CPU-bound) | Session state in distributed store; item bank in memory |
| Interview Analysis | Worker pool (GPU-bound for ASR/NLP) | Job queue; results written to profile service |
| Bias Monitor | Single instance per batch (CPU-bound) | Reads from demographic store; writes to batch record |

### Vector Index Sharding

At 500M candidate profiles, a single ANN index is too large to fit in memory on a single node (~4.25 TB). The index is sharded horizontally by candidate_id hash modulo shard_count:

```
Index sharding design:
  Shard count: 10 shards (expandable via consistent hashing)
  Per shard:   50M candidates × ~1.5 KB index overhead = ~75 GB per shard
  RAM per node: 128 GB → 1–2 shards per node with headroom
  Total nodes: 10–20 index nodes

Query fan-out:
  A single matching query searches ALL shards in parallel (broadcast query)
  Each shard returns its top-K candidates by similarity score
  A merge node aggregates and re-ranks across shards
  Total latency: max(shard latency) + merge time ≈ 50 ms + 5 ms = 55 ms

Rebalancing:
  Adding a new shard: consistent hashing minimizes data movement
  Only ~1/N candidates need to be moved to the new shard
  During rebalancing: both old and new shards serve queries for migrated candidates
  Migration validated before old shard references are removed
```

### Matching Pipeline Scaling Under Requisition Volume

100,000 active requisitions × 100 new applications/day = 10M match operations/day. Each match operation fans out to all 10 index shards. Total shard queries: 100M/day = ~1,157 queries/second to the index tier. Each shard handles ~116 queries/second, well within typical ANN index throughput of ~1,000–10,000 queries/second per node.

**Burst scenario:** Job fair or university recruiting season where a single employer posts 500 roles and receives 1,000 applications per role in 24 hours (500,000 applications in one day). Matching throughput spikes 5x:
- Index tier absorbs spike via horizontal auto-scaling of query replicas
- Compatibility model inference queue absorbs burst with auto-scaled inference workers
- Bias monitoring batch windows dynamically adjust to maintain ≤ 5-minute cycle time

---

## Sourcing Crawler Reliability

### Crawler Architecture

The sourcing crawler runs as a horizontally scalable worker pool with per-source rate limiting enforced at the crawler coordinator:

```
Crawler design:
  Sources: 20+ professional networks and public data sources
  Per-source rate: configured in crawler policy store (e.g., 10 requests/sec)
  Worker pool: 200 crawler workers; work distributed via job queue
  Fetch → Parse → Dedup → Enrich → Queue pipeline
  Dedup: SHA-256 hash of (name, email, current_employer, current_title) → idempotent profile ID

Resilience:
  Retry with exponential backoff (max 3 retries) on 5xx from source
  Circuit breaker per source: 5 consecutive failures → open circuit for 10 min
  Poisoned URL handling: URLs that consistently fail to parse are quarantined
  Dead letter queue: failed enrichment jobs persisted for manual review
```

### Opt-Out Enforcement

The opt-out manager maintains a blocklist keyed by {email, phone, external_profile_url}. All crawler-discovered profiles are checked against the blocklist before queuing for enrichment. Opt-out requests from candidates are propagated to the opt-out store within 1 hour. Existing profile records for opted-out candidates are soft-deleted within 24 hours and hard-deleted within 30 days (GDPR timeline).

**Enforcement gap risk:** A candidate who opts out but whose profile is already in the index could still appear in matching results during the 24-hour soft-delete window. Mitigation: The compatibility model filters out opted-out candidate IDs at query time using a real-time opt-out membership check against a bloom filter that is updated immediately on opt-out receipt.

---

## Interview Analysis Pipeline Reliability

### At-Least-Once Processing for Video Submissions

Video submissions are stored in object storage at upload time before any analysis begins. The analysis pipeline reads from object storage, not from the upload stream, ensuring that a worker crash never loses a submission. The job queue tracks processing state:

```
Video submission lifecycle:
  UPLOADED → object storage written, job queued
  PROCESSING → worker claims job via distributed lock (30-min TTL)
  COMPLETE → report written to candidate profile; job marked done
  FAILED → retry after 5 min; max 3 retries; then dead letter queue

Idempotency:
  Each video analysis job has a unique submission_id
  If a worker crashes mid-analysis, the job is reclaimed by another worker after lock TTL
  The new worker re-analyzes the video from scratch (analysis is deterministic for same model version)
  Duplicate completion is prevented by check-and-set on job status in job store
```

### Graceful Degradation

If the NLP coherence model or domain vocabulary model is unavailable (transient GPU failure), the pipeline produces a partial report: ASR transcript is always available, and a reduced report with only raw transcript and speech metrics is returned to the recruiter with a "partial analysis" flag. This prevents the recruiter experience from blocking on a full analysis when a single model is down.

---

## Reliability Patterns

### Bias Monitoring Circuit Breaker

If the demographic data store is unavailable, the bias monitoring service cannot analyze adverse impact. Rather than blocking all stage decisions until the store recovers, the system uses a circuit breaker with a configurable fallback:

- **Closed (normal)**: Bias check runs synchronously; decisions released after clear/flagged
- **Open (degraded)**: Bias check is skipped; all stage decisions are held in a pending buffer; a compliance notification is sent to the platform owner
- **Half-open (recovering)**: Bias check resumes; buffered decisions are analyzed retroactively before any pending outreach is triggered

This ensures that decisions are never silently released without bias analysis—they are either analyzed in real time, or held until analysis is possible.

### Conversation Session Durability

Dialogue sessions are checkpointed to the distributed session store after every turn. If the dialogue manager instance serving a session crashes mid-turn, the next incoming message from the candidate re-establishes the session from the latest checkpoint. The candidate experiences at most one repeated prompt ("I didn't catch your last response—could you repeat?") rather than losing all session context.

### Model Version Pinning During Candidate Journey

A candidate who began their application journey with compatibility model v2.3 will continue to be ranked against that model throughout their journey for that requisition. Upgrading the compatibility model mid-journey could change a candidate's rank in ways that are not explained by any change in the candidate's qualifications. The system pins the model version per {candidate_id, req_id} at the time of first matching and does not upgrade mid-journey unless a major bias correction requires it (in which case, all candidates for the requisition are re-ranked simultaneously with a human review step).

---

## Surge Handling

### University Recruiting Season

In September–October (US fall recruiting season), platform load spikes 3–5x across the assessment, video, and matching subsystems simultaneously:

| Subsystem | Spike Behavior | Mitigation |
|---|---|---|
| Assessment Engine | 5x concurrent sessions | Pre-scale worker pool 48h before season start (calendar-driven predictive scaling) |
| Video Analysis | 4x daily submission volume | Prioritize recent submissions; schedule older-date submissions in off-peak hours |
| Matching Engine | 3x matching operations | ANN index query replicas auto-scale; compatibility model inference workers pre-scaled |
| Conversational AI | 5x concurrent sessions | LLM response time degrades under heavy load; queue LLM requests with 2-second timeout before falling back to template-based responses |

### Failure Isolation: Bulkhead Design

The platform uses bulkhead isolation between subsystems to prevent cascading failures:

- The video analysis pipeline has a dedicated thread pool separate from the matching engine; a video analysis backlog does not consume matching engine resources
- The bias monitoring service has a dedicated connection pool to the demographic store; a bias monitoring spike does not exhaust the connection pool for other services
- The conversational AI gateway is rate-limited per employer account to prevent a single high-volume customer from starving other customers

---

## Multi-Region Deployment

### Data Residency Requirements

EU-based candidates must have their profile data processed and stored in EU-region infrastructure (GDPR data residency). This requires:

- **Per-region profile stores**: Candidate profiles for EU, US, APAC stored in their respective regional clusters
- **Regional ANN indexes**: Each region maintains its own vector index for its candidate profiles; matching queries are regional by default
- **Cross-region matching**: If a job requisition in the US is open to remote candidates worldwide, matching spans regional indexes with a federated query fan-out
- **Model serving per region**: Embedding service and compatibility model served from regional inference clusters; no candidate data crosses regional boundaries for inference

### RTO and RPO

| Subsystem | RTO Target | RPO Target |
|---|---|---|
| Candidate API Gateway | 2 min | 0 (multi-region active-active) |
| Matching Engine | 5 min | 15 min (ANN index rebuild from profile store) |
| Conversational AI | 2 min | 30 sec (session state replicated across AZs) |
| Assessment Engine | 5 min | 0 (session state in replicated store) |
| Audit Log | 30 min | 0 (synchronous cross-AZ replication) |
