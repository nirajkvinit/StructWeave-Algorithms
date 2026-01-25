# High-Level Design

## Training Architecture

### System Architecture Diagram

```mermaid
flowchart TB
    subgraph Orchestration["Training Orchestration Layer"]
        direction LR
        JobScheduler["Job Scheduler<br/>(Slurm/K8s)"]
        ClusterMgr["Cluster Manager"]
        HealthMonitor["Health Monitor"]
        MetricCollector["Metric Collector"]
    end

    subgraph DataPipeline["Data Pipeline"]
        direction LR
        DataStore[("Training Data<br/>Object Storage")]
        Tokenizer["Distributed<br/>Tokenizer"]
        DataLoader["Data Loader<br/>(WebDataset)"]
        Sampler["Distributed<br/>Sampler"]
    end

    subgraph ParallelismEngine["Parallelism Engine"]
        direction TB

        subgraph DP["Data Parallel Groups"]
            DP0["DP Rank 0"]
            DP1["DP Rank 1"]
            DPN["DP Rank N"]
        end

        subgraph PP["Pipeline Parallel Stages"]
            PP0["Stage 0<br/>(Embed + Layers 0-15)"]
            PP1["Stage 1<br/>(Layers 16-31)"]
            PPN["Stage N<br/>(Layers + Head)"]
        end

        subgraph TP["Tensor Parallel Shards"]
            TP0["TP Shard 0"]
            TP1["TP Shard 1"]
            TPN["TP Shard N"]
        end

        subgraph EP["Expert Parallel (MoE)"]
            Expert0["Expert 0-31"]
            Expert1["Expert 32-63"]
            ExpertN["Expert 64-127"]
        end
    end

    subgraph MemoryOpt["Memory Optimization"]
        ZeRO["ZeRO-3/FSDP<br/>Sharding"]
        GradCkpt["Gradient<br/>Checkpointing"]
        MixedPrec["Mixed Precision<br/>(BF16/FP8)"]
        Offload["CPU/NVMe<br/>Offload"]
    end

    subgraph Communication["Communication Layer"]
        NCCL["NCCL Backend"]
        AllReduce["AllReduce<br/>(Gradients)"]
        AllGather["AllGather<br/>(Params)"]
        P2P["P2P<br/>(Pipeline)"]
        AllToAll["All-to-All<br/>(Experts)"]
    end

    subgraph GPUCluster["GPU Cluster"]
        subgraph Node1["Node 1"]
            GPU1_0["GPU 0"]
            GPU1_1["GPU 1"]
            GPU1_7["GPU 7"]
        end
        subgraph Node2["Node 2"]
            GPU2_0["GPU 0"]
            GPU2_1["GPU 1"]
            GPU2_7["GPU 7"]
        end
        subgraph NodeN["Node N"]
            GPUN_0["GPU 0"]
            GPUN_1["GPU 1"]
            GPUN_7["GPU 7"]
        end
    end

    subgraph Storage["Persistent Storage"]
        CheckpointStore[("Checkpoint Store<br/>High-Speed NVMe")]
        ModelRegistry[("Model Registry")]
        MetricStore[("Metrics DB<br/>Time Series")]
    end

    JobScheduler --> ClusterMgr
    ClusterMgr --> GPUCluster
    HealthMonitor --> GPUCluster

    DataStore --> Tokenizer --> DataLoader --> Sampler
    Sampler --> ParallelismEngine

    ParallelismEngine --> MemoryOpt
    MemoryOpt --> Communication
    Communication --> GPUCluster

    GPUCluster --> CheckpointStore
    MetricCollector --> MetricStore
    CheckpointStore --> ModelRegistry

    classDef orchestration fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef data fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef parallel fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef memory fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef comm fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef compute fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef storage fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class JobScheduler,ClusterMgr,HealthMonitor,MetricCollector orchestration
    class DataStore,Tokenizer,DataLoader,Sampler data
    class DP0,DP1,DPN,PP0,PP1,PPN,TP0,TP1,TPN,Expert0,Expert1,ExpertN parallel
    class ZeRO,GradCkpt,MixedPrec,Offload memory
    class NCCL,AllReduce,AllGather,P2P,AllToAll comm
    class GPU1_0,GPU1_1,GPU1_7,GPU2_0,GPU2_1,GPU2_7,GPUN_0,GPUN_1,GPUN_7 compute
    class CheckpointStore,ModelRegistry,MetricStore storage
```

### Training Data Flow

```mermaid
sequenceDiagram
    autonumber
    participant Data as Data Loader
    participant Sampler as Distributed Sampler
    participant DP as Data Parallel
    participant PP as Pipeline Parallel
    participant TP as Tensor Parallel
    participant Opt as Optimizer
    participant Ckpt as Checkpoint

    Data->>Sampler: Load batch from storage
    Sampler->>DP: Shard batch across DP ranks

    loop For each micro-batch (1F1B Schedule)
        DP->>PP: Send micro-batch to Stage 0

        loop For each Pipeline Stage
            PP->>TP: Distribute activations
            TP->>TP: Tensor parallel matmul (AllReduce)
            TP->>PP: Gather activations
            PP->>PP: Forward to next stage (P2P)
        end

        PP->>PP: Compute loss at final stage

        loop Backward Pass (reverse order)
            PP->>TP: Distribute gradients
            TP->>TP: Tensor parallel backward
            TP->>PP: Gather gradients
            PP->>PP: Send gradients to prev stage
        end
    end

    DP->>DP: AllReduce gradients across DP ranks
    DP->>Opt: Apply optimizer step
    Opt->>Opt: Update weights (with ZeRO AllGather)

    alt Checkpoint interval
        Opt->>Ckpt: Save distributed checkpoint
        Ckpt->>Ckpt: Async write to storage
    end
```

---

## Inference Architecture

### System Architecture Diagram

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WebApp["Web App"]
        API["API Clients"]
        SDK["SDK Users"]
    end

    subgraph Gateway["Request Gateway"]
        LB["Load Balancer<br/>(L7)"]
        Auth["Auth & Rate Limit"]
        Router["Request Router"]
        Queue["Request Queue"]
    end

    subgraph Scheduler["Inference Scheduler"]
        ContBatch["Continuous Batching<br/>Controller"]
        PrefillMgr["Prefill Manager"]
        DecodeMgr["Decode Manager"]
        Preemption["Preemption<br/>Controller"]
    end

    subgraph KVCache["KV Cache Manager"]
        BlockTable["Block Table"]
        PagedAttn["PagedAttention<br/>Engine"]
        BlockAlloc["Block Allocator"]
        PrefixCache["Prefix Cache"]
    end

    subgraph InferEngine["Inference Engine"]
        FlashAttn["Flash Attention 4"]
        Quant["Quantized Kernels<br/>(INT8/FP8)"]
        SpecDec["Speculative<br/>Decoding"]
        DraftModel["Draft Model<br/>(7B)"]
    end

    subgraph ModelServing["Model Serving Pool"]
        subgraph Instance1["Instance 1 (TP=2)"]
            Inst1_GPU0["GPU 0<br/>Shard 0"]
            Inst1_GPU1["GPU 1<br/>Shard 1"]
        end
        subgraph Instance2["Instance 2 (TP=2)"]
            Inst2_GPU0["GPU 0<br/>Shard 0"]
            Inst2_GPU1["GPU 1<br/>Shard 1"]
        end
        subgraph InstanceN["Instance N (TP=2)"]
            InstN_GPU0["GPU 0<br/>Shard 0"]
            InstN_GPU1["GPU 1<br/>Shard 1"]
        end
    end

    subgraph Storage["Model Storage"]
        ModelStore[("Model Weights<br/>Object Storage")]
        WeightCache[("Weight Cache<br/>NVMe")]
    end

    subgraph Monitoring["Observability"]
        Metrics["Metrics<br/>(Prometheus)"]
        Traces["Traces<br/>(Jaeger)"]
        Logs["Logs<br/>(Loki)"]
    end

    Clients --> Gateway
    LB --> Auth --> Router --> Queue
    Queue --> Scheduler

    ContBatch --> PrefillMgr
    ContBatch --> DecodeMgr
    ContBatch --> Preemption

    Scheduler --> KVCache
    BlockTable --> PagedAttn
    PagedAttn --> BlockAlloc
    BlockAlloc --> PrefixCache

    KVCache --> InferEngine
    FlashAttn --> Quant
    Quant --> SpecDec
    SpecDec --> DraftModel

    InferEngine --> ModelServing

    ModelStore --> WeightCache --> ModelServing
    ModelServing --> Monitoring

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef scheduler fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef kv fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef engine fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef serving fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef storage fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef monitor fill:#f5f5f5,stroke:#616161,stroke-width:2px

    class WebApp,API,SDK client
    class LB,Auth,Router,Queue gateway
    class ContBatch,PrefillMgr,DecodeMgr,Preemption scheduler
    class BlockTable,PagedAttn,BlockAlloc,PrefixCache kv
    class FlashAttn,Quant,SpecDec,DraftModel engine
    class Inst1_GPU0,Inst1_GPU1,Inst2_GPU0,Inst2_GPU1,InstN_GPU0,InstN_GPU1 serving
    class ModelStore,WeightCache storage
    class Metrics,Traces,Logs monitor
```

### Inference Request Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Gateway as API Gateway
    participant Scheduler as Continuous Batching
    participant KV as KV Cache Manager
    participant Engine as Inference Engine
    participant GPU as GPU Worker

    Client->>Gateway: POST /generate {prompt, params}
    Gateway->>Gateway: Auth & Rate Limit
    Gateway->>Scheduler: Enqueue request

    Scheduler->>KV: Allocate KV blocks
    KV->>KV: Find/allocate blocks (PagedAttention)

    alt Prefix Cache Hit
        KV-->>Scheduler: Reuse cached prefix blocks
    else Cache Miss
        KV-->>Scheduler: Allocate new blocks
    end

    rect rgb(230, 245, 230)
        Note over Scheduler,GPU: Prefill Phase (Compute-Bound)
        Scheduler->>Engine: Batch prefill requests
        Engine->>GPU: Process full prompt (Flash Attention)
        GPU-->>KV: Store KV cache
        GPU-->>Client: Stream first token
    end

    rect rgb(230, 230, 245)
        Note over Scheduler,GPU: Decode Phase (Memory-Bound)
        loop Until EOS or max_tokens
            Scheduler->>Scheduler: Build decode batch (iteration-level)

            alt Speculative Decoding Enabled
                Scheduler->>Engine: Draft K tokens with small model
                Engine->>GPU: Verify K tokens in parallel
                GPU-->>Client: Stream accepted tokens (1-K)
            else Standard Decoding
                Engine->>GPU: Generate single token
                GPU-->>Client: Stream token
            end

            alt Memory Pressure
                Scheduler->>KV: Preempt lowest priority
                KV->>KV: Swap blocks to CPU
            end
        end
    end

    KV->>KV: Release blocks
    Gateway-->>Client: Complete response
```

---

## Key Architectural Decisions

### Decision 1: Parallelism Strategy Selection

| Factor | Data Parallel | Tensor Parallel | Pipeline Parallel | Expert Parallel |
|--------|---------------|-----------------|-------------------|-----------------|
| **Best For** | Scaling throughput | Reducing per-GPU memory | Very large models | MoE architectures |
| **Communication** | AllReduce (gradients) | AllReduce (activations) | P2P (sequential) | All-to-All |
| **Efficiency** | High (>90%) | Medium (70-80%) | Medium (60-70%) | Model-dependent |
| **Latency Impact** | None | Low | High (bubbles) | Medium |
| **Memory Scaling** | None | Linear | Linear | Experts distributed |

**Recommendation Matrix:**

| Model Size | GPU Count | Recommended Strategy |
|------------|-----------|---------------------|
| <7B | 1-8 | DP only |
| 7B-30B | 8-64 | TP=8, DP=N/8 |
| 30B-100B | 64-512 | TP=8, PP=2-4, DP=remaining |
| 100B-500B | 512-4096 | TP=8, PP=8-16, DP=remaining |
| MoE (any) | Varies | Add EP matching expert count |

### Decision 2: Memory Optimization Strategy

| Strategy | Memory Reduction | Compute Overhead | Communication Overhead |
|----------|------------------|------------------|------------------------|
| **ZeRO-1** (Optimizer) | 4x | None | Minimal |
| **ZeRO-2** (+Gradients) | 8x | None | Low |
| **ZeRO-3** (+Parameters) | Linear with N | Recompute | High (AllGather) |
| **Gradient Checkpointing** | 50-70% activation | 30% recompute | None |
| **CPU Offload** | Extends to CPU RAM | High latency | PCIe bound |
| **NVMe Offload** | Extends to SSD | Very high latency | SSD bound |

**Decision Tree:**

```
Model fits in GPU memory?
├── Yes → Use DP only, ZeRO-1
└── No → How much over?
    ├── 2-4x → ZeRO-2 + Gradient Checkpointing
    ├── 4-10x → ZeRO-3
    └── >10x → ZeRO-3 + Offload (or add more GPUs)
```

### Decision 3: Inference Batching Strategy

| Strategy | Throughput | Latency | Memory Efficiency | Implementation |
|----------|------------|---------|-------------------|----------------|
| **Static Batching** | Low | Predictable | Poor (padding) | Simple |
| **Dynamic Batching** | Medium | Variable | Medium | Moderate |
| **Continuous Batching** | High | Low TTFT | Good | Complex |
| **Chunked Prefill** | Very High | Lowest TTFT | Excellent | Most Complex |

**Recommendation:** Continuous batching with chunked prefill for production systems.

### Decision 4: Quantization Strategy

| Method | Bits | Speedup | Quality Loss | Memory Reduction | Use Case |
|--------|------|---------|--------------|------------------|----------|
| **FP16** | 16 | 1x | None | 2x vs FP32 | Training |
| **BF16** | 16 | 1x | None | 2x vs FP32 | Training (H100+) |
| **FP8** | 8 | 2x | <0.5% | 4x vs FP32 | Training/Inference |
| **INT8 (W8A8)** | 8 | 2x | <1% | 2x vs FP16 | Inference |
| **INT4 (W4A16)** | 4 | 3-4x | 1-3% | 4x vs FP16 | Inference |
| **GPTQ** | 4 | 3-4x | 1-2% | 4x vs FP16 | Inference |
| **AWQ** | 4 | 3-4x | <1% | 4x vs FP16 | Inference (best) |

**Recommendation:** AWQ for production inference, FP8 for latency-sensitive applications.

### Decision 5: KV Cache Strategy

| Strategy | Memory Efficiency | Implementation | Best For |
|----------|-------------------|----------------|----------|
| **Static Allocation** | Poor (50% waste) | Simple | Fixed-length only |
| **PagedAttention** | Excellent (<5% waste) | Complex | Variable-length |
| **Prefix Caching** | Excellent + reuse | Moderate | Repeated prompts |
| **Sliding Window** | Fixed memory | Simple | Very long contexts |
| **Quantized KV** | 2-4x reduction | Moderate | Memory-constrained |

**Recommendation:** PagedAttention with prefix caching for production.

---

## Architecture Pattern Checklist

### Training Checklist

- [ ] **Parallelism configured**: TP within nodes (NVLink), PP/DP across nodes
- [ ] **Memory optimization**: ZeRO stage selected based on model/GPU memory ratio
- [ ] **Gradient checkpointing**: Enabled for memory-constrained scenarios
- [ ] **Mixed precision**: BF16 on H100+, FP16 with loss scaling on older GPUs
- [ ] **Data loading**: Overlapped with compute, no GPU idle time
- [ ] **Checkpointing**: Async, distributed, with verification
- [ ] **Fault detection**: Heartbeat monitoring, automatic restart

### Inference Checklist

- [ ] **Continuous batching**: Iteration-level scheduling enabled
- [ ] **PagedAttention**: Block-based KV cache allocation
- [ ] **Prefix caching**: Enabled for repeated prompt patterns
- [ ] **Quantization**: AWQ/GPTQ for memory efficiency
- [ ] **Speculative decoding**: Enabled for latency-sensitive use cases
- [ ] **Tensor parallelism**: Configured for models > single GPU memory
- [ ] **Health checks**: Liveness and readiness probes configured

---

## Component Interaction Patterns

### Training: Gradient Synchronization

```mermaid
flowchart LR
    subgraph DP_Group["Data Parallel Group"]
        GPU0["GPU 0<br/>∇W₀"]
        GPU1["GPU 1<br/>∇W₁"]
        GPU2["GPU 2<br/>∇W₂"]
        GPUN["GPU N<br/>∇Wₙ"]
    end

    subgraph AllReduce["Ring AllReduce"]
        Step1["1. ReduceScatter"]
        Step2["2. AllGather"]
    end

    subgraph Result["Synchronized Gradients"]
        Sync0["GPU 0<br/>∇W_avg"]
        Sync1["GPU 1<br/>∇W_avg"]
        Sync2["GPU 2<br/>∇W_avg"]
        SyncN["GPU N<br/>∇W_avg"]
    end

    GPU0 --> Step1
    GPU1 --> Step1
    GPU2 --> Step1
    GPUN --> Step1

    Step1 --> Step2

    Step2 --> Sync0
    Step2 --> Sync1
    Step2 --> Sync2
    Step2 --> SyncN

    classDef gpu fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef op fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef result fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class GPU0,GPU1,GPU2,GPUN gpu
    class Step1,Step2 op
    class Sync0,Sync1,Sync2,SyncN result
```

### Inference: Continuous Batching Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Waiting: New request arrives

    Waiting --> Prefilling: Scheduler picks request
    Prefilling --> Decoding: First token generated

    Decoding --> Decoding: Generate token
    Decoding --> Preempted: Memory pressure
    Decoding --> Completed: EOS or max_tokens

    Preempted --> Waiting: Blocks swapped out
    Waiting --> Decoding: Blocks swapped in

    Completed --> [*]: Release blocks

    note right of Waiting
        Request in queue
        No KV blocks allocated
    end note

    note right of Prefilling
        Processing prompt
        Allocating KV blocks
        Compute-bound
    end note

    note right of Decoding
        Generating tokens
        Memory-bound
        In active batch
    end note

    note right of Preempted
        KV blocks swapped to CPU
        Can resume later
    end note
```

---

## Technology Stack

### Training Stack

| Layer | Options | Recommendation |
|-------|---------|----------------|
| **Framework** | PyTorch, JAX | PyTorch (ecosystem) |
| **Distributed** | DeepSpeed, FSDP, Megatron | Megatron-DeepSpeed |
| **Communication** | NCCL, Gloo | NCCL (NVIDIA GPUs) |
| **Data Loading** | WebDataset, Mosaic | WebDataset |
| **Checkpointing** | torch.save, distributed | Distributed async |
| **Orchestration** | Slurm, Kubernetes | Slurm (HPC), K8s (cloud) |
| **Monitoring** | W&B, TensorBoard | Weights & Biases |

### Inference Stack

| Layer | Options | Recommendation |
|-------|---------|----------------|
| **Framework** | vLLM, TensorRT-LLM, SGLang | vLLM (general), TRT-LLM (NVIDIA) |
| **Attention** | Flash Attention, xFormers | Flash Attention 3/4 |
| **Quantization** | GPTQ, AWQ, bitsandbytes | AWQ |
| **Load Balancing** | nginx, Envoy | Envoy (gRPC support) |
| **Orchestration** | Kubernetes, Ray | Ray Serve / Kubernetes |
| **Monitoring** | Prometheus + Grafana | Prometheus + Grafana |

---

## Deployment Topology

### Training Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                    Training Cluster                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   Head Node     │  │  Storage Nodes  │                   │
│  │  - Scheduler    │  │  - Checkpoint   │                   │
│  │  - Monitoring   │  │  - Data         │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                            │
│     ┌─────┴─────────────────────┴─────┐                     │
│     │         InfiniBand Fabric        │                     │
│     └─────┬─────────────────────┬─────┘                     │
│           │                     │                           │
│  ┌────────┴────────┐   ┌────────┴────────┐                  │
│  │   GPU Node 1    │   │   GPU Node N    │                  │
│  │  ┌───┬───┬───┬───┐  │  ┌───┬───┬───┬───┐                 │
│  │  │G0 │G1 │...│G7 │  │  │G0 │G1 │...│G7 │                 │
│  │  └─┬─┴─┬─┴───┴─┬─┘  │  └─┬─┴─┬─┴───┴─┬─┘                 │
│  │    └───┼───────┘    │    └───┼───────┘                   │
│  │      NVLink         │      NVLink                        │
│  └─────────────────────┘   └─────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Inference Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                   Inference Service                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐                                            │
│  │   Clients   │                                            │
│  └──────┬──────┘                                            │
│         │                                                   │
│  ┌──────▼──────┐                                            │
│  │ Load Balancer│ (Least connections, health-aware)         │
│  └──────┬──────┘                                            │
│         │                                                   │
│  ┌──────┴──────────────────────────────────────────┐        │
│  │              API Gateway Layer                   │        │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │        │
│  │  │ Gateway 1│ │ Gateway 2│ │ Gateway N│        │        │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘        │        │
│  └───────┼────────────┼────────────┼───────────────┘        │
│          │            │            │                        │
│  ┌───────┴────────────┴────────────┴───────────────┐        │
│  │           Model Serving Instances                │        │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │        │
│  │  │Instance 1  │  │Instance 2  │  │Instance N  │ │        │
│  │  │TP=2 (70B) │  │TP=2 (70B) │  │TP=2 (70B) │ │        │
│  │  │┌───┐┌───┐ │  │┌───┐┌───┐ │  │┌───┐┌───┐ │ │        │
│  │  ││G0 ││G1 │ │  ││G0 ││G1 │ │  ││G0 ││G1 │ │ │        │
│  │  │└───┘└───┘ │  │└───┘└───┘ │  │└───┘└───┘ │ │        │
│  │  └────────────┘  └────────────┘  └────────────┘ │        │
│  └──────────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
