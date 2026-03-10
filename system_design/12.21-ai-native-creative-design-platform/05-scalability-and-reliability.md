# 12.21 AI-Native Creative Design Platform — Scalability & Reliability

## Horizontal Scaling Architecture

### Stateless Services and Their Scaling Axes

The platform separates compute-intensive AI inference from lightweight API serving and collaboration. Each service tier scales independently along its primary resource axis:

| Service | Scaling Axis | State Location |
|---|---|---|
| API Gateway | Replica count (CPU-bound) | No local state; auth tokens validated statelessly via JWT |
| Generation Orchestrator | Replica count (CPU-bound) | Job state in distributed job store; orchestrator is stateless |
| Prompt Interpreter | GPU replica count (small LLM) | Model loaded at startup; no request-local state |
| Layout Generator | GPU replica count (transformer) | Model loaded at startup; no request-local state |
| Image Generator | GPU replica count (diffusion model) | Model loaded at startup; result cache in distributed store |
| Text Generator | GPU replica count (LLM) | Model loaded at startup; no request-local state |
| Brand Enforcer | Replica count (CPU-bound) | Brand kit rules cached from database; refreshed on update |
| CRDT Engine | Replica count (memory-bound) | Session state in distributed memory store; sharded by document_id |
| Document Service | Replica count (I/O-bound) | Document store (distributed database) |
| Asset Pipeline | Worker pool (CPU + I/O bound) | Job queue; results in object storage |
| Export Renderer | Worker pool (CPU-bound) | Job queue; output in object storage |
| Content Safety Filter | GPU replica count (classifier) | Model loaded at startup; no request-local state |

### GPU Fleet Architecture

The GPU fleet is the most expensive and operationally complex tier. It is organized into three pools:

```
GPU pool architecture:
  Pool 1 — Image Generation (diffusion models):
    GPU type: High-memory GPUs (80 GB VRAM)
    Model: INT8-quantized diffusion model (~4 GB per instance)
    Instances per GPU: 4 concurrent inferences (via dynamic batching)
    Pool size: 1,800 GPUs (peak) / 600 GPUs (off-peak)
    Autoscaling: GPU utilization target 75%; scale-up latency ~5 min
      (GPU instances pre-warmed in standby pool with model pre-loaded)

  Pool 2 — Layout + Prompt + Text (transformer/LLM models):
    GPU type: Standard GPUs (40 GB VRAM)
    Models: Layout transformer (~2 GB) + Prompt interpreter (~4 GB) + Text generator (~4 GB)
    Instances per GPU: 8 concurrent inferences (smaller models, faster inference)
    Pool size: 400 GPUs (peak) / 150 GPUs (off-peak)

  Pool 3 — Content Safety + Segmentation:
    GPU type: Standard GPUs (40 GB VRAM)
    Models: Safety classifier (~1 GB) + Segmentation model (~2 GB)
    Instances per GPU: 16 concurrent inferences
    Pool size: 200 GPUs (peak) / 80 GPUs (off-peak)

  Total fleet: ~2,400 GPUs (peak) / ~830 GPUs (off-peak)
  Cost optimization: off-peak scaling saves ~65% GPU cost during low-traffic hours
```

### GPU Cost Optimization Strategies

```
1. Dynamic batching:
   Group generation requests arriving within a 50 ms window into a single batch inference
   Throughput gain: ~3x over sequential inference
   Latency cost: up to 50 ms added wait time (acceptable within 5s SLO)

2. INT8 quantization:
   Quantize diffusion model from FP32 to INT8
   Memory reduction: 4x (fit 4 instances per GPU instead of 1)
   Quality impact: <1% perceptual quality loss (validated by human evaluation)
   Throughput gain: ~2x

3. Progressive generation:
   Generate a 4-step preview image (400 ms) displayed immediately
   Complete the full 20-step generation (2,500 ms) in background
   User sees instant feedback; high-quality result replaces preview seamlessly
   Perceived latency reduction: ~2 seconds

4. Generation cache:
   Cache generated images by {prompt_hash, brand_kit_version, seed}
   Cache hit rate: ~12% (popular prompts like "abstract background", "gradient")
   Cache TTL: 7 days
   Storage: ~100 TB (LRU eviction)
   GPU cost savings: ~12% of image generation fleet

5. Model distillation:
   Distill 50-step teacher model to 8-step student model for common generation types
   Quality trade-off: acceptable for simple backgrounds and icons; not for complex scenes
   Used for: background generation, icon generation, simple illustrations
   Latency: ~500 ms instead of 2,500 ms
```

### Collaboration Service Scaling

```
CRDT engine scaling:
  Sharding: document_id consistent hashing across CRDT engine replicas
  Each replica manages ~50,000 concurrent sessions
  40 replicas for 2M concurrent sessions

  Memory per session: ~55 KB (scene graph + cursor state)
  Total memory: 2M × 55 KB = 110 GB → distributed across 40 replicas (~2.75 GB each)

  Operations throughput: 4M ops/sec → 100K ops/sec per replica
  Per-operation latency: ~1 ms CRDT merge + ~5 ms broadcast → well within capacity

  Session migration on replica failure:
    Sessions re-established on a different replica within 2 seconds
    Client reconnects via WebSocket; CRDT state rebuilt from last checkpoint
    No data loss: checkpoints persist to distributed store every 500 ms
```

---

## Fault Tolerance

### Generation Pipeline Resilience

The generation pipeline has multiple failure modes, each with a specific recovery strategy:

```
Failure: GPU instance crash during diffusion inference
  Detection: health check timeout (10 seconds)
  Recovery: orchestrator detects subtask timeout; resubmits image generation to different GPU
  User impact: ~3-4 second additional latency; within SLO if original generation started early in budget
  Mitigation: GPU watchdog process restarts crashed instances; pre-warmed standby pool absorbs load

Failure: Layout transformer produces degenerate output (overlapping elements)
  Detection: post-generation overlap validator
  Recovery: retry with different random seed (up to 2 retries)
  User impact: ~1.2 second additional latency per retry
  Fallback: if 2 retries fail, serve template-based layout matching the intent

Failure: Brand enforcer detects unresolvable violation
  Detection: violation count exceeds threshold after 2 re-generation attempts
  Recovery: serve design with violations flagged in UI (yellow warning indicators)
  User impact: non-blocking; user sees design with highlighted issues; can manually fix

Failure: Content safety classifier unavailable
  Detection: health check failure on safety service
  Recovery: BLOCK all AI-generated images until safety service recovers
  User impact: generation requests return error; manual editing unaffected
  Rationale: never serve potentially unsafe content; safety is non-negotiable
```

### Design Document Durability

```
Document store replication:
  Write path: synchronous write to primary + 1 replica within same region
  Async replication: to 1 replica in a different availability zone
  RPO: 0 for single-AZ failures; < 500 ms for multi-AZ failures

  Checkpoint strategy:
    During active editing: checkpoint every 500 ms to document store
    On collaboration session close: immediate full checkpoint
    On version creation: snapshot stored as immutable version record

  Backup:
    Daily full backup of document store to separate object storage
    Point-in-time recovery window: 30 days
    Backup tested monthly via automated restore verification
```

### Collaboration Service Failover

```
CRDT engine failover:
  Active-passive within availability zone:
    Each session has a primary CRDT replica and a hot standby
    Primary and standby sync state every 100 ms
    On primary failure: standby promoted within 1 second
    Client WebSocket reconnects; detects new primary; replays buffered local ops

  Cross-AZ failover:
    If entire AZ fails: sessions migrate to replicas in surviving AZ
    RTO: 5 seconds (WebSocket reconnection + state rebuild from last checkpoint)
    RPO: < 500 ms (last checkpoint interval)
    User experience: brief "reconnecting" indicator; no data loss in practice
```

---

## Surge Handling

### Viral Template Events

When a design template goes viral (shared by an influencer, trending social event), the platform experiences sudden 10x spikes in generation requests as millions of users customize the same template. The spike pattern:

```
Viral template surge handling:
  Detection: template usage rate exceeds 10x normal within 15 minutes
  Response:
    1. Cache the template's base layout and pre-generated common variations
       (avoid re-running layout transformer for identical inputs)
    2. Pre-warm GPU pool: request additional GPU instances from standby pool
       (standby pool maintains 30% headroom for exactly this scenario)
    3. Rate limit per-user generation requests (max 5 concurrent per user)
       to prevent a single user from monopolizing GPU capacity
    4. Serve cached variations where prompt similarity > 0.9 (same template + minor text changes)
    5. If GPU capacity is exhausted: queue requests with estimated wait time shown to user;
       prioritize paying users over free-tier users

  Historical data: viral events typically peak within 2 hours and subside within 6 hours
```

### Seasonal Spikes

Predictable demand increases around holidays, marketing seasons, and social media events:

| Event | Spike Factor | Pre-scaling Strategy |
|---|---|---|
| End-of-year holidays | 3x | Scale GPU fleet 48h before; pre-cache holiday template variations |
| Back-to-school | 2x | Scale GPU fleet 24h before |
| Major social media trends | 5-10x (unpredictable) | Standby GPU pool + generation queue with backpressure |
| Product launch events (platform feature release) | 4x | Pre-scale all tiers; feature-flag gradual rollout |

### Bulkhead Isolation

```
Bulkhead design:
  1. AI generation pipeline has a dedicated GPU fleet separate from the export renderer
     A spike in generation does not starve export capacity

  2. Collaboration service has a dedicated connection pool and memory allocation
     A spike in concurrent editors does not affect API gateway capacity

  3. Free-tier and paid-tier users are served by separate GPU pools
     Free-tier GPU exhaustion does not degrade paid-tier generation latency

  4. Asset upload pipeline has a dedicated worker pool
     A burst of uploads does not consume generation orchestrator capacity

  5. Export renderer has a dedicated job queue with priority levels
     High-resolution print exports do not block quick social media exports
```

---

## Multi-Region Deployment

### Data Residency and Latency Optimization

```
Regional deployment:
  Regions: US-West, US-East, EU-West, EU-Central, APAC-East, APAC-South

  Data residency rules:
    User design documents stored in user's home region
    Assets stored in content-addressable global store with regional edge caches
    AI generation requests routed to nearest region with available GPU capacity

  Cross-region collaboration:
    When users in different regions collaborate on the same document:
    - CRDT session hosted in document's home region
    - Remote users connect via regional WebSocket relay
    - Relay adds ~50-100 ms latency for cross-region participants
    - Acceptable for collaboration; not acceptable for local canvas rendering (which is client-side)

  GPU fleet distribution:
    US-West: 40% of total GPU fleet (largest user base)
    EU-West: 25%
    APAC-East: 20%
    Other: 15%
    Overflow routing: if regional GPU capacity exhausted, route to nearest region with capacity
```

### RTO and RPO

| Subsystem | RTO Target | RPO Target |
|---|---|---|
| API Gateway | 1 min | 0 (multi-region active-active) |
| Collaboration Service | 5 sec | < 500 ms (session checkpoint interval) |
| Design Document Store | 5 min | 0 (synchronous intra-region replication) |
| AI Generation Pipeline | 2 min | N/A (stateless; retry on different GPU) |
| Asset Store | 10 min | 0 (multi-AZ object storage) |
| Export Renderer | 5 min | 0 (job queue is persistent; reprocessed on recovery) |
