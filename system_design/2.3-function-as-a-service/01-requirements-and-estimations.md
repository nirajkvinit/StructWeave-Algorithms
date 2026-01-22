# Requirements & Capacity Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features (In Scope)

1. **Function Deployment & Versioning**
   - Deploy function code packages (ZIP, container image)
   - Support multiple runtimes (Node.js, Python, Go, Java, .NET, custom)
   - Version management with aliases (e.g., `$LATEST`, `prod`, `staging`)
   - Atomic deployments with instant rollback capability
   - Environment variable and configuration management

2. **Event-Triggered Invocation**
   - Synchronous invocation (HTTP/API Gateway)
   - Asynchronous invocation (queue-based with retry)
   - Event source mappings (storage events, queue messages, streams)
   - Scheduled invocation (cron expressions)
   - Direct invocation via SDK/API

3. **Automatic Scaling**
   - Scale from zero to thousands of concurrent instances
   - Burst scaling for sudden traffic spikes
   - Scale down to zero during idle periods
   - Configurable concurrency limits (per-function, per-account)
   - Reserved concurrency for guaranteed capacity

4. **Resource Configuration**
   - Configurable memory allocation (128 MB - 10 GB)
   - CPU allocation proportional to memory
   - Configurable timeout (1 second - 15 minutes)
   - Ephemeral storage allocation
   - VPC connectivity for private resource access

5. **Execution Environment**
   - Isolated execution sandbox per tenant
   - Stateless execution model
   - Temporary filesystem (ephemeral storage)
   - Support for layers/dependencies sharing
   - Container image support for custom runtimes

6. **Observability Integration**
   - Automatic logging to centralized log service
   - Built-in metrics (invocations, duration, errors, throttles)
   - Distributed tracing support (trace context propagation)
   - Custom metric publishing capability

### Out of Scope

- Long-running jobs (> 15 minutes) - use container orchestration
- Stateful workflows - use dedicated workflow engine (Step Functions, Temporal)
- GPU workloads - specialized compute service
- WebSocket connections - use dedicated real-time service
- Application-level caching - integrate with cache service

---

## Non-Functional Requirements

### CAP Theorem Choice

**Control Plane: CP (Consistency + Partition Tolerance)**

**Justification:**
- Function deployments must be atomic and consistent
- Scaling decisions require accurate state of running instances
- Configuration changes must propagate reliably

**Data Plane: AP (Availability + Partition Tolerance)**

**Justification:**
- Function invocations should succeed even during control plane issues
- Warm instances can continue serving requests
- Eventual consistency acceptable for metrics and logs

### Consistency Model

| Component | Consistency Requirement |
|-----------|------------------------|
| Function deployments | Strongly consistent |
| Configuration changes | Strongly consistent |
| Invocation routing | Eventually consistent (fast) |
| Scaling decisions | Eventually consistent |
| Metrics/Logs | Eventually consistent |
| Warm pool state | Eventually consistent |

**Acceptable Inconsistency Windows:**

| Scenario | Acceptable Delay |
|----------|------------------|
| New deployment visible | < 1 second |
| Configuration update | < 5 seconds |
| Scale-up decision | < 1 second |
| Metrics aggregation | < 60 seconds |
| Log delivery | < 5 seconds |

### Availability Targets

| Component | Target | Justification |
|-----------|--------|---------------|
| **Invocation endpoint** | 99.99% | Critical for user-facing applications |
| **Control plane (deployments)** | 99.9% | Less frequent operations |
| **Warm instance availability** | 99.95% | May require cold start fallback |
| **Event source integration** | 99.9% | Depends on source reliability |

**Regional HA Requirements:**
- Multi-AZ deployment for all control plane components
- Worker fleet distributed across availability zones
- Automatic failover within region
- Optional multi-region active-active for global applications

### Latency Targets

| Operation | Percentile | Target | Justification |
|-----------|------------|--------|---------------|
| Cold start (lightweight runtime) | p99 | < 500ms | User-perceived startup |
| Cold start (heavy runtime, JVM) | p99 | < 3s | Acceptable for batch |
| Warm invocation | p99 | < 10ms | Platform overhead only |
| Warm invocation | p50 | < 5ms | Typical case |
| Code download (cached) | p99 | < 50ms | Local/regional cache |
| Event delivery (async) | p99 | < 100ms | Queue to invocation |

### Durability

| Data Type | Durability Requirement |
|-----------|----------------------|
| Function code | Highly durable (replicated storage) |
| Function configuration | Highly durable |
| Invocation logs | Configurable retention (1 day - indefinite) |
| Metrics | Time-limited (15 months typical) |
| In-flight async requests | Durable until completion/DLQ |

### Throughput

| Operation | Target | Notes |
|-----------|--------|-------|
| Invocations (global) | 10M+ requests/second | Aggregate across all functions |
| Invocations (per function) | 10,000+ concurrent | With provisioned concurrency |
| Deployments | 1,000+ per minute | Global deployment rate |
| Event source polling | 1,000+ batches/second | Per event source |

---

## Capacity Estimations (Back-of-Envelope)

### Platform Scale Assumptions

| Metric | Value | Notes |
|--------|-------|-------|
| Active developers | 1M+ | Deploying and managing functions |
| Deployed functions | 10M+ | Across all accounts |
| Daily invocations | 100B+ | Global platform scale |
| Peak invocations/second | 10M+ | During global peak hours |
| Average function duration | 100ms | Highly variable by workload |
| Average memory allocation | 512 MB | Mix of lightweight and heavy |

### Worker Fleet Sizing

**Assumptions:**
- Average concurrent invocations at peak: 5M
- Average memory per invocation: 512 MB
- Worker instance size: 64 GB RAM (usable for functions)
- Target utilization: 70% (headroom for bursts)

**Calculation:**
```
Total memory needed = 5M concurrent × 512 MB = 2.5 PB
Workers needed = 2.5 PB / (64 GB × 0.7) ≈ 56,000 workers
```

With burst headroom: **~75,000 worker instances** globally

### Storage Estimates

| Storage Type | Size | Notes |
|--------------|------|-------|
| Function packages (unique) | 5 PB | Deduplicated, versioned |
| Function packages (with replication) | 15 PB | 3x replication |
| Cached packages (L2 regional) | 500 TB | Hot functions per region |
| Cached packages (L1 local) | 50 GB/worker | Per-worker cache |
| Metadata (function configs) | 100 GB | With replication |
| Invocation logs (daily) | 10 PB | Before compression |
| Metrics (raw, daily) | 1 PB | Before aggregation |

### Network Bandwidth Estimates

| Traffic Type | Estimate | Notes |
|--------------|----------|-------|
| Inbound invocations | 100+ Gbps | Global aggregate |
| Code downloads to workers | 10+ Gbps | During cold starts |
| Log egress | 50+ Gbps | To centralized logging |
| Inter-AZ control plane | 10+ Gbps | State synchronization |
| Event source traffic | 50+ Gbps | From queues, streams |

### Regional Deployment

| Component | Count per Region | Specification |
|-----------|------------------|---------------|
| API Gateway nodes | 50-100 | 16 CPU, 32 GB RAM |
| Worker Manager | 10-20 | 32 CPU, 64 GB RAM |
| Placement Service | 5-10 | 16 CPU, 32 GB RAM |
| Worker instances | 5,000-10,000 | Bare-metal, 128+ GB RAM |
| Code cache (L2) | 20-50 TB | SSD cluster |
| Metadata store | 3-5 nodes | Strong consistency |

---

## SLOs / SLAs

### Service Level Objectives (Internal)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Invocation Success Rate** | 99.99% | (Successful / Total) × 100, excluding user errors |
| **Cold Start Latency (Node.js)** | < 200ms p99 | Excluding user init code |
| **Cold Start Latency (Java)** | < 2s p99 | With SnapStart optimization |
| **Warm Invocation Overhead** | < 5ms p99 | Platform-added latency |
| **Deployment Latency** | < 30s p99 | From API call to available |
| **Event Delivery Latency** | < 100ms p99 | Source to function start |
| **Log Delivery** | < 5s p99 | Function to log service |

### Service Level Agreements (External)

| Metric | Commitment | Remedy |
|--------|------------|--------|
| Monthly Availability | 99.95% | Service credits |
| Invocation Error Rate | < 0.1% (platform errors) | Investigation commitment |
| Deployment Availability | 99.9% | Best effort |

### Error Budget

| Period | Allowed Downtime (99.99%) | Allowed Downtime (99.95%) |
|--------|---------------------------|---------------------------|
| Monthly | 4.32 minutes | 21.6 minutes |
| Quarterly | 13 minutes | 1.08 hours |
| Annually | 52.6 minutes | 4.38 hours |

---

## Constraints & Assumptions

### Technical Constraints

1. **Cold start floor** - MicroVM boot time (~125ms) sets minimum cold start
2. **Memory-CPU coupling** - CPU allocation tied to memory selection
3. **Execution timeout** - Maximum 15 minutes per invocation
4. **Payload limits** - Synchronous: 6 MB request/response; Async: 256 KB event
5. **Package size** - 50 MB (zipped), 250 MB (unzipped), 10 GB (container)
6. **Concurrent executions** - Default 1,000 per account, configurable
7. **VPC cold start penalty** - ENI attachment adds ~1s to cold start

### Platform Limits

| Resource | Limit |
|----------|-------|
| Functions per account | 10,000+ |
| Versions per function | 75+ |
| Concurrent executions | 1,000 default (can increase) |
| Burst concurrency | 500-3,000 (region dependent) |
| Provisioned concurrency | 500 per function |
| Memory range | 128 MB - 10 GB |
| Timeout | 1s - 15 min |
| Deployment package | 50 MB zipped, 250 MB unzipped |
| Container image | 10 GB |
| Environment variables | 4 KB total |
| Layers | 5 per function |

### Business Constraints

1. **Multi-tenancy** - Strong isolation between customer workloads
2. **Billing accuracy** - Millisecond-level duration tracking
3. **Compliance** - SOC2, HIPAA, PCI-DSS, FedRAMP support
4. **Data residency** - Functions execute in customer-selected region
5. **Vendor lock-in concerns** - Container image support for portability

### Assumptions

1. Function code is provided as deployable artifact (ZIP or container)
2. Functions are designed to be stateless and idempotent
3. Dependent services (databases, APIs) handle their own scaling
4. Network connectivity exists between function and required resources
5. Clock synchronization maintained across all platform components

---

## Success Criteria

| Criteria | Measurement | Target |
|----------|-------------|--------|
| Cold start rate | Cold starts / Total invocations | < 1% (for steady traffic) |
| Invocation success rate | Successful / Total | > 99.99% |
| Platform overhead (warm) | Measured invocation - user code time | < 5ms p99 |
| Deployment success rate | Successful / Attempted | > 99.9% |
| Time to first invocation | Deployment to first successful call | < 60s |
| Customer-visible errors | Platform errors / Total | < 0.01% |
| Worker utilization | Active time / Total time | > 60% |
