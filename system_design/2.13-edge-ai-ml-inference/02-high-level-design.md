# High-Level Design

[← Previous: Requirements](./01-requirements-and-estimations.md) | [Next: Low-Level Design →](./03-low-level-design.md)

---

## System Architecture

```mermaid
flowchart TB
    subgraph Cloud["Cloud Control Plane"]
        subgraph Training["Training Pipeline"]
            TC["Training Cluster<br/>(GPU/TPU)"]
            QS["Quantization<br/>Service"]
            VS["Validation<br/>Service"]
        end

        subgraph Management["Model Management"]
            MR["Model Registry"]
            MC["Model Catalog"]
            VM["Version Manager"]
        end

        subgraph Distribution["Distribution Layer"]
            DS["Distribution<br/>Service"]
            CDN["CDN Edge<br/>Caches"]
            RM["Rollout<br/>Manager"]
        end

        subgraph FLServer["Federated Learning"]
            FLC["FL Coordinator"]
            SA["Secure<br/>Aggregator"]
            PS["Participant<br/>Selector"]
        end

        subgraph Analytics["Analytics"]
            TS["Telemetry<br/>Service"]
            AM["Accuracy<br/>Monitor"]
            AB["A/B Testing"]
        end
    end

    subgraph Edge["Edge Devices (Millions)"]
        subgraph Device["Device N"]
            App["Application"]
            SDK["ML SDK"]
            RT["Runtime<br/>(LiteRT/CoreML)"]
            Cache["Model Cache"]
            HAL["Hardware<br/>Abstraction"]
            HW["NPU/GPU/CPU"]
            FLClient["FL Client"]
            TelClient["Telemetry<br/>Agent"]
        end
    end

    TC --> QS --> VS --> MR
    MR --> DS --> CDN
    CDN --> Cache
    RM --> DS

    App --> SDK --> RT --> HAL --> HW
    Cache --> RT

    FLClient --> SA
    SA --> FLC
    PS --> FLClient

    TelClient --> TS
    AM --> TS
    AB --> RM
```

---

## Core Components

### Cloud Components

| Component | Responsibility | Key Technologies |
|-----------|---------------|------------------|
| **Training Cluster** | Train base models on large datasets | GPU/TPU clusters, distributed training |
| **Quantization Service** | Convert FP32 → INT8/FP16, calibrate | TF Model Optimization Toolkit, ONNX Quantization |
| **Validation Service** | Test quantized models, measure accuracy loss | Automated test suites, benchmark datasets |
| **Model Registry** | Store versioned models with metadata | Object storage, metadata DB |
| **Distribution Service** | Orchestrate model delivery to devices | CDN integration, staged rollouts |
| **FL Coordinator** | Manage federated learning rounds | Task scheduling, round orchestration |
| **Secure Aggregator** | Privacy-preserving gradient aggregation | Secure aggregation protocol, DP |
| **Telemetry Service** | Collect and analyze inference metrics | Time-series DB, streaming analytics |

### Edge Components

| Component | Responsibility | Key Technologies |
|-----------|---------------|------------------|
| **ML SDK** | High-level API for applications | Platform-specific SDKs |
| **Runtime** | Execute model inference | LiteRT, Core ML, ONNX Runtime |
| **Model Cache** | Store and manage local models | Local storage, LRU eviction |
| **Hardware Abstraction** | Map operations to hardware | Delegates, execution providers |
| **FL Client** | Local training and gradient computation | On-device training, DP noise |
| **Telemetry Agent** | Sample and report metrics | Batched upload, privacy filtering |

---

## Data Flow Diagrams

### Inference Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant SDK as ML SDK
    participant RT as Runtime
    participant Cache as Model Cache
    participant HAL as HW Abstraction
    participant NPU as NPU/GPU

    App->>SDK: inference(model_id, input)
    SDK->>Cache: get_model(model_id)

    alt Model Not Cached
        Cache->>Cache: download_from_cdn()
        Cache->>Cache: validate_checksum()
    end

    Cache->>SDK: model_handle
    SDK->>RT: load_model(handle)
    RT->>HAL: select_delegate()

    alt NPU Available
        HAL->>NPU: execute(tensor)
        NPU->>HAL: output_tensor
    else Fallback to CPU
        HAL->>HAL: execute_cpu(tensor)
    end

    HAL->>RT: output_tensor
    RT->>SDK: post_process(output)
    SDK->>App: InferenceResult

    Note over SDK: Log latency metric (sampled)
```

### Model Distribution Flow

```mermaid
sequenceDiagram
    participant Reg as Model Registry
    participant RM as Rollout Manager
    participant CDN as CDN
    participant Device as Device

    Note over Reg: New model version v2.0 published

    Reg->>RM: notify_new_version(model_id, v2.0)
    RM->>RM: create_rollout_plan(staged)

    Note over RM: Stage 1: 1% of fleet

    RM->>CDN: publish_model(v2.0)
    CDN->>CDN: replicate_to_edges()

    loop For Each Device in Stage
        Device->>Device: check_conditions(wifi, charging, idle)

        alt Conditions Met
            Device->>CDN: check_for_updates()
            CDN->>Device: new_version_available(v2.0)
            Device->>CDN: download_model(v2.0, delta)
            CDN->>Device: model_delta_chunks
            Device->>Device: validate_checksum()
            Device->>Device: apply_delta()
            Device->>Device: atomic_swap(v1.0, v2.0)
            Device->>Reg: report_success(device_id, v2.0)
        end
    end

    Note over RM: Monitor metrics, proceed to Stage 2 (10%)

    RM->>RM: evaluate_stage_health()

    alt Metrics Healthy
        RM->>RM: advance_to_next_stage()
    else Metrics Degraded
        RM->>RM: rollback_stage()
        RM->>CDN: promote_version(v1.0)
    end
```

### Federated Learning Flow

```mermaid
sequenceDiagram
    participant Coord as FL Coordinator
    participant Sel as Participant Selector
    participant Agg as Secure Aggregator
    participant D1 as Device 1
    participant D2 as Device 2
    participant DN as Device N

    Note over Coord: Initialize FL Round R

    Coord->>Sel: select_participants(criteria)
    Sel->>Sel: filter(wifi, charging, data_available)
    Sel->>Coord: selected_devices[D1, D2, ..., DN]

    par Push Global Model
        Coord->>D1: send_model(global_weights, round_id)
        Coord->>D2: send_model(global_weights, round_id)
        Coord->>DN: send_model(global_weights, round_id)
    end

    Note over D1,DN: Local Training Phase

    par Local Training
        D1->>D1: train_local(epochs=5, local_data)
        D2->>D2: train_local(epochs=5, local_data)
        DN->>DN: train_local(epochs=5, local_data)
    end

    Note over D1,DN: Compute & Mask Gradients

    par Gradient Preparation
        D1->>D1: gradient = compute_update()
        D1->>D1: add_dp_noise(gradient, epsilon)
        D1->>D1: mask = generate_pairwise_masks()
        D1->>Agg: send(masked_gradient)

        D2->>D2: gradient = compute_update()
        D2->>D2: add_dp_noise(gradient, epsilon)
        D2->>D2: mask = generate_pairwise_masks()
        D2->>Agg: send(masked_gradient)

        DN->>DN: gradient = compute_update()
        DN->>DN: add_dp_noise(gradient, epsilon)
        DN->>DN: mask = generate_pairwise_masks()
        DN->>Agg: send(masked_gradient)
    end

    Note over Agg: Masks cancel during aggregation

    Agg->>Agg: aggregate(masked_gradients)
    Agg->>Coord: aggregated_update

    Coord->>Coord: global_weights += learning_rate * aggregated_update
    Coord->>Coord: increment_round()

    Note over Coord: Distribute updated model
```

---

## Key Architectural Decisions

### Decision 1: ML Runtime Selection

| Option | Pros | Cons |
|--------|------|------|
| **LiteRT (TensorFlow Lite)** | Broad device support, mature ecosystem, Google backing | Larger SDK size, TF-centric |
| **ONNX Runtime** | Framework-agnostic, cross-platform | Less mobile-optimized than native |
| **Core ML** | Best Apple silicon optimization, OS integration | Apple-only |
| **Custom Runtime** | Full control, minimal size | Massive development effort |

**Recommendation:** Platform-specific approach
- **Android:** LiteRT with GPU/NNAPI delegates
- **iOS:** Core ML for Apple Neural Engine optimization
- **Cross-platform fallback:** ONNX Runtime

**Rationale:** Native runtimes leverage hardware-specific optimizations that generic runtimes cannot match. The 2-3x performance difference justifies maintaining platform-specific integrations.

### Decision 2: Quantization Strategy

| Option | Memory Reduction | Accuracy Impact | Complexity |
|--------|------------------|-----------------|------------|
| **Post-Training Quantization (PTQ)** | 75% (INT8) | 0.5-3% loss | Low |
| **Quantization-Aware Training (QAT)** | 75% (INT8) | < 0.5% loss | High |
| **Dynamic Quantization** | 50% (weights only) | Minimal | Low |
| **Mixed Precision** | 60% | Minimal | Medium |

**Recommendation:** QAT for production models, PTQ for rapid prototyping

**Rationale:** QAT requires retraining but achieves < 0.5% accuracy loss vs 2-3% for PTQ. For production models deployed to billions of devices, the additional training cost is justified.

### Decision 3: Federated Learning Algorithm

| Option | Convergence | Communication | Non-IID Handling |
|--------|-------------|---------------|------------------|
| **FedAvg** | Good | Low | Poor |
| **FedProx** | Good | Low | Better |
| **SCAFFOLD** | Better | Higher | Good |
| **FedAdam** | Fast | Medium | Good |

**Recommendation:** FedAvg with secure aggregation and differential privacy

**Rationale:** FedAvg is battle-tested at Google scale (Gboard). Non-IID issues addressed through client weighting and personalization layers rather than algorithm complexity.

### Decision 4: Model Distribution Strategy

| Option | Bandwidth | Complexity | Rollback Speed |
|--------|-----------|------------|----------------|
| **Full Model Push** | High | Low | Fast |
| **Delta Updates** | Low (80-90% savings) | High | Slower |
| **Pull on Demand** | Distributed over time | Low | Fast |
| **Hybrid (Pull + Delta)** | Low | Medium | Fast |

**Recommendation:** Pull-based with delta updates and push notifications

**Rationale:** Pull respects device conditions (WiFi, charging), delta updates reduce bandwidth 80-90%, push notifications trigger checks when new versions available.

### Decision 5: Hardware Fallback Strategy

| Option | Latency Impact | Reliability | Complexity |
|--------|----------------|-------------|------------|
| **Strict (Fail if NPU unavailable)** | None | Poor | Low |
| **Graceful (NPU → GPU → CPU)** | Variable | High | Medium |
| **Adaptive (Choose based on conditions)** | Optimized | High | High |

**Recommendation:** Graceful degradation with user notification

**Rationale:** Device heterogeneity is extreme. 20-30% of devices may lack NPU support. Graceful fallback ensures universal functionality while adaptive optimization handles varying conditions.

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async** | Async for model distribution, sync for inference | Distribution is background; inference is blocking |
| **Push vs Pull** | Pull-based distribution with push notifications | Device autonomy, bandwidth control |
| **Stateless vs Stateful** | Stateless runtime, stateful cache | Runtime can restart; cache persists models |
| **Read-heavy vs Write-heavy** | Read-heavy (inference >> training) | 1000:1 read:write ratio typical |
| **Real-time vs Batch** | Real-time inference, batch FL training | User-facing requires real-time |
| **Edge vs Cloud** | Edge for inference, cloud for training/aggregation | Latency and privacy requirements |

---

## Failure Modes & Mitigations

| Failure Mode | Impact | Detection | Mitigation |
|--------------|--------|-----------|------------|
| **Model Corruption** | Inference fails or produces garbage | Checksum mismatch | Re-download, fallback to previous version |
| **NPU Unavailable** | Slow inference | Hardware probe fails | Graceful fallback to GPU/CPU |
| **OOM During Inference** | App crash | Memory monitoring | Memory-mapped models, reduce batch size |
| **Model Download Fails** | Can't update | Retry count exceeded | CDN failover, resume download |
| **FL Client Dropout** | Incomplete round | Heartbeat timeout | Minimum participation threshold |
| **Gradient Poisoning** | Model degradation | Anomaly detection | Robust aggregation, outlier rejection |
| **Version Mismatch** | Feature incompatibility | Version check | Enforce minimum SDK version |

---

## Graceful Degradation Levels

```mermaid
flowchart TB
    L1["Level 1: Full Capability<br/>NPU inference, latest model, FL enabled"]
    L2["Level 2: Reduced Performance<br/>GPU/CPU fallback, latest model"]
    L3["Level 3: Stale Model<br/>Previous model version, full inference"]
    L4["Level 4: Cached Results<br/>Return cached inference for known inputs"]
    L5["Level 5: Feature Disabled<br/>ML feature unavailable, show fallback UI"]

    L1 -->|"NPU fails"| L2
    L2 -->|"Model download fails"| L3
    L3 -->|"Model load fails"| L4
    L4 -->|"No cached results"| L5
```

| Level | Trigger | User Impact | Recovery |
|-------|---------|-------------|----------|
| **Level 1** | Normal operation | Full experience | N/A |
| **Level 2** | NPU unavailable | Slower inference (2-5x) | Retry NPU periodically |
| **Level 3** | Download failure | Older model accuracy | Background retry |
| **Level 4** | Model load failure | Limited to cached inputs | Full app restart |
| **Level 5** | Complete failure | Feature unavailable | Manual update |

---

## Technology Stack Summary

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Cloud Training** | TensorFlow/PyTorch on GPU/TPU clusters | Industry standard, scalable |
| **Quantization** | TF Model Optimization Toolkit, ONNX Quantization | Integrated pipelines |
| **Model Registry** | Object Storage (blob) + PostgreSQL (metadata) | Scalable, queryable |
| **CDN** | Multi-region CDN with edge caching | Low-latency distribution |
| **Android Runtime** | LiteRT with NNAPI delegate | Native optimization |
| **iOS Runtime** | Core ML with Neural Engine | Apple silicon optimized |
| **FL Server** | Custom coordinator + secure aggregation | Privacy requirements |
| **Telemetry** | Prometheus/InfluxDB | Time-series optimized |

---

## Interview Tips: High-Level Design Phase

### Key Points to Cover

1. **Start with inference flow** - Most common use case
2. **Highlight offline capability** - Critical differentiator from cloud ML
3. **Show hardware abstraction** - Demonstrates understanding of device heterogeneity
4. **Include FL if relevant** - Shows awareness of privacy-preserving ML
5. **Draw CDN for distribution** - Shows understanding of scale

### Common Follow-up Questions

| Question | Key Points to Address |
|----------|----------------------|
| "Why not just use cloud inference?" | Latency (< 10ms impossible), privacy, offline, cost |
| "How do you handle device heterogeneity?" | Hardware abstraction layer, graceful fallback |
| "What if model update fails?" | Atomic swap, version fallback, staged rollouts |
| "How do you ensure model quality?" | Validation pipeline, staged rollouts, A/B testing |

### Diagram Tips

- Show clear separation between cloud and edge
- Include CDN as intermediary for distribution
- Show FL as optional/parallel path
- Indicate async vs sync flows
- Label latency expectations on critical paths

---

[← Previous: Requirements](./01-requirements-and-estimations.md) | [Next: Low-Level Design →](./03-low-level-design.md)
