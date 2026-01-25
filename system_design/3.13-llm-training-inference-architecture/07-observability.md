# Observability

## Training Observability

### Key Metrics

#### Compute Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **MFU** | Model FLOPS Utilization | >50% | <40% |
| **GPU Utilization** | SM active time | >80% | <60% |
| **GPU Memory Used** | Memory consumption | <95% | >95% |
| **GPU Temperature** | Thermal monitoring | <80°C | >85°C |
| **GPU Power** | Power consumption | Baseline | >10% deviation |

#### Training Progress Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **Loss** | Training loss value | Decreasing | Spike >2x, NaN |
| **Learning Rate** | Current LR | As scheduled | Off schedule |
| **Gradient Norm** | L2 norm of gradients | Stable | >10 or NaN |
| **Throughput** | Samples/tokens per second | Stable | <80% baseline |
| **Step Time** | Time per training step | Stable | >20% variance |

#### Communication Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **AllReduce Time** | Gradient sync duration | <30% of step | >40% of step |
| **P2P Latency** | Pipeline activation transfer | <1ms | >10ms |
| **NCCL Errors** | Communication failures | 0 | >0 |
| **Network Bandwidth** | InfiniBand utilization | <80% | >90% |

#### Checkpoint Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **Checkpoint Duration** | Time to save | <10 min | >30 min |
| **Checkpoint Size** | Bytes written | Expected | >20% deviation |
| **Checkpoint Success** | Save success rate | 100% | <99% |
| **Recovery Time** | Time to resume | <10 min | >30 min |

### Training Dashboard Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TRAINING JOB: llama-70b-v2                            │
│  Status: RUNNING | Step: 145,234 / 500,000 | ETA: 14d 3h               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │      Training Loss          │  │         Learning Rate           │  │
│  │  Loss ▼                     │  │  LR ▼                           │  │
│  │   2.5│╲                     │  │  1e-4│────────╲                 │  │
│  │   2.0│ ╲                    │  │  5e-5│          ╲               │  │
│  │   1.5│  ╲___                │  │  1e-5│            ╲____         │  │
│  │   1.0│      ╲___            │  │      └──────────────────────    │  │
│  │      └────────────────      │  │       0     250K   500K steps   │  │
│  │       0    50K  100K  150K  │  │                                 │  │
│  └─────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │     GPU Utilization         │  │      Step Time Breakdown        │  │
│  │  Util%                      │  │                                 │  │
│  │   100│████████████████      │  │  Forward:    ████████  40%      │  │
│  │    75│████████████████      │  │  Backward:   ██████████ 45%     │  │
│  │    50│████████████████      │  │  AllReduce:  ███ 12%            │  │
│  │    25│████████████████      │  │  Data Load:  █ 3%               │  │
│  │      └──GPU 0─63───────     │  │                                 │  │
│  └─────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Memory Usage by GPU                          │   │
│  │  80GB │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│   │
│  │       │ GPU 0   GPU 1   GPU 2  ...  GPU 62  GPU 63          │   │
│  │       │ 72GB    71GB    73GB   ...  72GB    71GB            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Recent Events:                                                         │
│  [14:32:15] Checkpoint saved: step_145000 (2.3 min, 284 GB)            │
│  [14:28:02] GPU 47 temp warning: 83°C                                  │
│  [12:15:00] Training resumed from step_140000                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Inference Observability

### Key Metrics

#### Latency Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **TTFT** | Time to first token | <200ms p99 | >500ms p99 |
| **TPS** | Tokens per second (generation) | >50 | <30 |
| **E2E Latency** | Total request time | <5s p99 | >10s p99 |
| **Queue Time** | Time waiting in queue | <100ms p99 | >500ms p99 |
| **Prefill Time** | Prompt processing time | <500ms | >2s |

#### Throughput Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **QPS** | Requests per second | Capacity | >80% capacity |
| **Tokens/sec** | Total token throughput | Capacity | <50% capacity |
| **Active Requests** | Concurrent requests | <max_batch | >90% max |
| **Queue Depth** | Pending requests | <100 | >500 |

#### Resource Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **GPU Utilization** | Compute usage | >60% | <30% (underutilized) |
| **GPU Memory** | Memory usage | <90% | >95% |
| **KV Cache Usage** | Cache memory | <85% | >90% |
| **Preemption Rate** | Request preemptions | <1% | >5% |

#### Quality Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **Error Rate** | Failed requests | <0.1% | >1% |
| **Timeout Rate** | Timed out requests | <0.1% | >0.5% |
| **Guardrail Triggers** | Safety blocks | Monitor | >10% |
| **Speculative Accept Rate** | Draft acceptance | >80% | <60% |

### Inference Dashboard Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INFERENCE SERVICE: claude-70b-prod                    │
│  Status: HEALTHY | Instances: 12/12 | QPS: 847 | Errors: 0.02%         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │      Latency (TTFT)         │  │        Throughput (QPS)         │  │
│  │  ms                         │  │  QPS                            │  │
│  │  500│         ╱╲            │  │  1000│    ╱────╲                │  │
│  │  300│p99─────╱  ╲───        │  │   750│───╱      ╲───────        │  │
│  │  150│p50────────────        │  │   500│                          │  │
│  │   50│p25────────────        │  │   250│                          │  │
│  │     └───────────────────    │  │      └────────────────────      │  │
│  │      -1h            now     │  │      -1h              now       │  │
│  └─────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │     GPU Utilization         │  │       KV Cache Usage            │  │
│  │  %                          │  │  %                              │  │
│  │  100│▓▓▓▓▓▓▓▓▓▓▓▓          │  │  100│                           │  │
│  │   75│▓▓▓▓▓▓▓▓▓▓▓▓          │  │   75│▓▓▓▓▓▓▓▓▓▓▓▓▓▓           │  │
│  │   50│▓▓▓▓▓▓▓▓▓▓▓▓          │  │   50│▓▓▓▓▓▓▓▓▓▓▓▓▓▓           │  │
│  │   25│▓▓▓▓▓▓▓▓▓▓▓▓          │  │   25│▓▓▓▓▓▓▓▓▓▓▓▓▓▓           │  │
│  │     └─Inst 1-12─────        │  │     └─Inst 1-12──────          │  │
│  └─────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Request Distribution                          │   │
│  │                                                                  │   │
│  │  Prompt Length:  <1K: ████████████ 60%   1K-4K: ██████ 30%      │   │
│  │                  4K-8K: ██ 8%             >8K: █ 2%              │   │
│  │                                                                  │   │
│  │  Output Length:  <100: ██████████ 50%    100-500: ██████ 30%    │   │
│  │                  500-1K: ███ 15%         >1K: █ 5%               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Active Alerts: None                                                    │
│  Recent Events:                                                         │
│  [14:32:15] Scaled up: 10 → 12 instances (high queue depth)            │
│  [14:15:02] Preemption spike: 3% (KV cache pressure)                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Logging Strategy

### Training Logs

```
LOG_LEVELS:

DEBUG:
    - Per-layer timing
    - Gradient statistics per parameter
    - Memory allocation details

INFO:
    - Step completion with metrics
    - Checkpoint events
    - Configuration changes

WARNING:
    - Gradient clipping activated
    - Memory pressure
    - Slow step time

ERROR:
    - NCCL errors
    - OOM events
    - Checkpoint failures

CRITICAL:
    - NaN loss
    - Job failure
    - Data corruption

LOG_FORMAT:

{
    "timestamp": "2024-01-15T14:32:15.123Z",
    "level": "INFO",
    "job_id": "job-123",
    "rank": 0,
    "world_size": 64,
    "step": 145234,
    "event": "step_complete",
    "metrics": {
        "loss": 1.234,
        "lr": 0.0001,
        "grad_norm": 0.5,
        "step_time_ms": 1234,
        "tokens_per_sec": 50000
    }
}
```

### Inference Logs

```
LOG_LEVELS:

DEBUG:
    - Block allocation details
    - Scheduling decisions
    - Speculative decoding accept/reject

INFO:
    - Request received/completed (sampled 10%)
    - Model load/unload
    - Scaling events

WARNING:
    - High latency requests
    - Preemption events
    - Near-capacity

ERROR:
    - Request timeout
    - Generation error
    - GPU error

CRITICAL:
    - Instance crash
    - All instances unhealthy

LOG_FORMAT (Request):

{
    "timestamp": "2024-01-15T14:32:15.123Z",
    "level": "INFO",
    "request_id": "req-abc123",
    "event": "request_complete",
    "model": "claude-70b",
    "metrics": {
        "prompt_tokens": 1024,
        "completion_tokens": 256,
        "ttft_ms": 142,
        "tps": 52.3,
        "e2e_ms": 5123
    },
    "status": "success"
    // NOTE: Do not log actual prompt/response content
}
```

### Log Aggregation Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Log Pipeline                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐       │
│  │Training │     │ Fluent  │     │  Kafka  │     │ Elastic │       │
│  │  Nodes  │────▶│   Bit   │────▶│         │────▶│ Search  │       │
│  └─────────┘     └─────────┘     └─────────┘     └─────────┘       │
│                                        │                            │
│  ┌─────────┐     ┌─────────┐          │          ┌─────────┐       │
│  │Inference│     │ Fluent  │          │          │  Loki   │       │
│  │ Servers │────▶│   Bit   │──────────┴─────────▶│         │       │
│  └─────────┘     └─────────┘                     └─────────┘       │
│                                                       │             │
│                                                       ▼             │
│                                                  ┌─────────┐       │
│                                                  │ Grafana │       │
│                                                  │Dashboard│       │
│                                                  └─────────┘       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Distributed Tracing

### Training Tracing

```
TRACE_SPANS:

Training Step:
├── data_loading (5ms)
│   ├── disk_read
│   └── preprocessing
├── forward_pass (400ms)
│   ├── layer_0 (5ms)
│   │   ├── all_gather_params
│   │   ├── attention
│   │   ├── mlp
│   │   └── free_params
│   ├── layer_1 (5ms)
│   └── ...
├── backward_pass (450ms)
│   └── [similar to forward]
├── gradient_sync (120ms)
│   ├── all_reduce_gradients
│   └── optimizer_step
└── checkpoint (0ms or 30s)

TRACE_ID_PROPAGATION:
- Inject trace_id into batch metadata
- Propagate across pipeline stages
- Correlate with checkpoint operations
```

### Inference Tracing

```
TRACE_SPANS:

Request Processing:
├── gateway (2ms)
│   ├── auth_check
│   ├── rate_limit_check
│   └── routing
├── scheduling (5ms)
│   ├── queue_wait
│   ├── block_allocation
│   └── batch_building
├── prefill (150ms)
│   ├── tokenization
│   ├── kv_cache_init
│   └── forward_pass
├── decode (4800ms)
│   ├── iteration_1 (18ms)
│   │   ├── attention
│   │   ├── sampling
│   │   └── kv_cache_append
│   ├── iteration_2 (18ms)
│   └── ... (256 iterations)
└── response (5ms)
    ├── detokenization
    └── streaming

TRACE_EXAMPLE:
{
    "trace_id": "abc123",
    "service": "inference",
    "operation": "generate",
    "duration_ms": 5100,
    "spans": [
        {"name": "gateway", "start": 0, "end": 2},
        {"name": "scheduling", "start": 2, "end": 7},
        {"name": "prefill", "start": 7, "end": 157},
        {"name": "decode", "start": 157, "end": 4957},
        {"name": "response", "start": 4957, "end": 4962}
    ]
}
```

---

## Alerting

### Training Alerts

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| **Training Stalled** | No step progress for 30 min | Critical | Page on-call, auto-restart |
| **NaN Loss** | loss == NaN | Critical | Stop training, investigate |
| **Low MFU** | MFU < 40% for 1 hour | Warning | Investigate bottleneck |
| **Checkpoint Failed** | Checkpoint save error | High | Retry, then page |
| **GPU Temperature** | Temp > 85°C | Warning | Throttle, check cooling |
| **Memory Pressure** | GPU memory > 95% | High | Reduce batch or enable checkpointing |
| **NCCL Timeout** | Communication timeout | High | Restart affected nodes |
| **Gradient Explosion** | grad_norm > 100 | Warning | Check LR, clip gradients |

### Inference Alerts

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| **High Latency** | TTFT p99 > 500ms for 5 min | Warning | Investigate, scale up |
| **Error Spike** | Error rate > 1% for 5 min | High | Investigate root cause |
| **Instance Down** | Health check fails | High | Replace instance |
| **All Instances Down** | No healthy instances | Critical | Page on-call immediately |
| **Queue Backup** | Queue depth > 1000 for 5 min | High | Scale up |
| **KV Cache Full** | KV usage > 95% | Warning | Increase preemption |
| **Preemption Storm** | Preemption rate > 10% | Warning | Reduce batch or add capacity |
| **Rate Limit Spike** | Rate limit hits > 10% | Info | Monitor, adjust limits |

### Alert Routing

```
ROUTING_RULES:

Severity: CRITICAL
    → PagerDuty: Immediate page
    → Slack: #incidents channel
    → Email: oncall@company.com

Severity: HIGH
    → PagerDuty: 15-min delay page
    → Slack: #alerts channel
    → Email: team@company.com

Severity: WARNING
    → Slack: #alerts channel
    → Dashboard: Highlight

Severity: INFO
    → Dashboard: Log only

ESCALATION_POLICY:
    Level 1 (0-15 min): Primary on-call
    Level 2 (15-30 min): Secondary on-call
    Level 3 (30-60 min): Engineering manager
    Level 4 (>60 min): VP Engineering
```

---

## Runbooks

### Training Runbook: NaN Loss

```
RUNBOOK: nan_loss_training

SYMPTOMS:
- Loss value is NaN
- Training automatically stopped

DIAGNOSIS:
1. Check gradient norms in last 100 steps
   - Sudden spike → gradient explosion
   - Gradual increase → learning rate too high

2. Check for data issues
   - Look for NaN in input batch
   - Verify data loader functioning

3. Check for numerical instability
   - Review FP16 vs FP32 operations
   - Check loss scaling factor

RESOLUTION:
1. If gradient explosion:
   - Rollback to checkpoint -2 (before corruption)
   - Lower learning rate by 50%
   - Enable gradient clipping if not already

2. If data issue:
   - Identify and remove bad samples
   - Resume from last good checkpoint

3. If numerical instability:
   - Switch problematic ops to FP32
   - Increase loss scale factor
   - Resume training

POST-INCIDENT:
- Add monitoring for gradient norm trends
- Review data validation pipeline
```

### Inference Runbook: High Latency

```
RUNBOOK: high_latency_inference

SYMPTOMS:
- TTFT p99 > 500ms
- Users reporting slow responses

DIAGNOSIS:
1. Check queue depth
   - High queue → capacity issue
   - Normal queue → processing issue

2. Check GPU utilization
   - Low utilization → inefficient batching
   - High utilization → need more capacity

3. Check KV cache usage
   - High usage → memory pressure
   - Preemption rate → check eviction

4. Check network
   - Inter-GPU latency (for TP)
   - Load balancer health

RESOLUTION:
1. If capacity issue:
   - Scale up instances
   - Enable request prioritization
   - Temporarily reduce max context length

2. If batching issue:
   - Tune continuous batching parameters
   - Check for stragglers in batch

3. If memory pressure:
   - Increase preemption aggressiveness
   - Enable KV cache quantization
   - Reduce max concurrent requests

4. If network issue:
   - Check NVLink/InfiniBand health
   - Restart affected instances

POST-INCIDENT:
- Adjust auto-scaling thresholds
- Review capacity planning
```

---

## Metrics Export

### Prometheus Metrics Format

```
# Training Metrics
training_loss{job_id="job-123", step="145234"} 1.234
training_learning_rate{job_id="job-123"} 0.0001
training_gradient_norm{job_id="job-123"} 0.5
training_step_time_seconds{job_id="job-123"} 1.234
training_tokens_per_second{job_id="job-123"} 50000
training_mfu{job_id="job-123"} 0.52

# GPU Metrics (per GPU)
gpu_utilization_percent{node="node-1", gpu="0"} 85.2
gpu_memory_used_bytes{node="node-1", gpu="0"} 68719476736
gpu_temperature_celsius{node="node-1", gpu="0"} 72

# Inference Metrics
inference_ttft_seconds_bucket{model="claude-70b", le="0.1"} 1234
inference_ttft_seconds_bucket{model="claude-70b", le="0.2"} 5678
inference_ttft_seconds_bucket{model="claude-70b", le="0.5"} 9012
inference_ttft_seconds_sum{model="claude-70b"} 1234.5
inference_ttft_seconds_count{model="claude-70b"} 10000

inference_requests_total{model="claude-70b", status="success"} 99850
inference_requests_total{model="claude-70b", status="error"} 150

inference_queue_depth{model="claude-70b"} 42
inference_kv_cache_usage_percent{instance="inst-1"} 72.5
```
