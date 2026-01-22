# Service Mesh Design - Requirements & Estimations

[Back to Index](./00-index.md) | [Next: High-Level Design](./02-high-level-design.md)

---

## Functional Requirements

### Core Features (Must Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Traffic Routing** | Route requests based on headers, paths, weights | P0 |
| **Load Balancing** | Distribute traffic across service instances | P0 |
| **Mutual TLS (mTLS)** | Automatic encryption and authentication between services | P0 |
| **Service Discovery** | Dynamically discover service endpoints | P0 |
| **Health Checking** | Detect and remove unhealthy endpoints | P0 |
| **Observability** | Metrics, distributed tracing, access logs | P0 |
| **Circuit Breaking** | Prevent cascading failures | P1 |
| **Retries & Timeouts** | Handle transient failures | P1 |
| **Rate Limiting** | Protect services from overload | P1 |
| **Traffic Mirroring** | Shadow traffic for testing | P2 |
| **Fault Injection** | Test resilience via controlled failures | P2 |

### Traffic Management Capabilities

```
┌─────────────────────────────────────────────────────────────────┐
│                    Traffic Management                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Routing        │  Resilience     │  Traffic Shaping            │
├─────────────────┼─────────────────┼─────────────────────────────┤
│  Path-based     │  Circuit Break  │  Rate Limiting              │
│  Header-based   │  Retries        │  Connection Pooling         │
│  Weight-based   │  Timeouts       │  Traffic Mirroring          │
│  Canary         │  Outlier Detect │  Fault Injection            │
│  A/B Testing    │  Failover       │  Request Hedging            │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### Detailed Feature Requirements

#### 1. Traffic Routing
- Route based on HTTP headers, paths, query parameters
- Weighted traffic splitting (e.g., 90% v1, 10% v2)
- Header-based routing for canary deployments
- Request matching with regex support
- Rewrite paths and headers during routing

#### 2. mTLS Security
- Automatic certificate generation for workloads
- Certificate rotation without downtime
- SPIFFE-compliant workload identities
- Permissive mode for gradual migration
- Strict mode for zero-trust enforcement

#### 3. Observability
- Automatic metrics for all service traffic (latency, errors, throughput)
- Distributed tracing with automatic span injection
- Structured access logs with configurable formats
- Integration with standard observability backends

#### 4. Resilience
- Circuit breaker with configurable thresholds
- Retry with exponential backoff and jitter
- Request timeouts per route/service
- Outlier detection and ejection
- Connection pool management

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Latency Overhead (p50)** | < 3ms | Acceptable for most workloads |
| **Latency Overhead (p99)** | < 10ms | Must not impact user experience |
| **Throughput** | > 50,000 RPS per proxy | Handle high-traffic services |
| **Connection Handling** | > 10,000 concurrent connections | Support connection pooling |
| **CPU Overhead** | < 0.5 vCPU per 1000 RPS | Resource efficiency |
| **Memory Overhead** | < 100MB per sidecar | Reasonable per-pod cost |

### Availability Requirements

| Component | Target | Justification |
|-----------|--------|---------------|
| **Data Plane** | 99.99% | Critical path for all traffic |
| **Control Plane** | 99.9% | Proxies cache config; brief outages tolerable |
| **Certificate Authority** | 99.99% | mTLS depends on cert availability |

### CAP Theorem Analysis

```
┌─────────────────────────────────────────────────────────────┐
│                    CAP Trade-offs                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Data Plane: Availability + Partition Tolerance (AP)        │
│  ───────────────────────────────────────────────────────    │
│  • Must continue routing even if control plane unreachable  │
│  • Uses cached configuration                                 │
│  • Eventually consistent with control plane                  │
│                                                              │
│  Control Plane: Consistency + Partition Tolerance (CP)       │
│  ───────────────────────────────────────────────────────    │
│  • Configuration must be consistent across replicas          │
│  • Uses Raft/etcd for consensus                             │
│  • May be temporarily unavailable during partition           │
│                                                              │
│  Certificate Authority: Availability + Consistency (CA)      │
│  ───────────────────────────────────────────────────────    │
│  • Must always issue valid certificates                      │
│  • Short-lived certs reduce compromise window                │
│  • Multiple replicas with leader election                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Consistency Models

| Data Type | Consistency | Propagation | Rationale |
|-----------|-------------|-------------|-----------|
| **Routing Rules** | Eventual | 1-30 seconds | Traffic shifts can tolerate brief inconsistency |
| **Certificates** | Strong | Immediate | Security-critical, must be valid |
| **mTLS Policies** | Eventual | < 60 seconds | Permissive mode during transition |
| **Rate Limits** | Eventual | Per-proxy local | Distributed counting acceptable |
| **Endpoint Lists** | Eventual | < 10 seconds | Service discovery updates |

---

## Capacity Estimations

### Scenario: Large-Scale Deployment

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Total Services** | 1,000 | Microservices in the mesh |
| **Pods per Service** | 10 (avg) | 10,000 total pods |
| **Requests per Second** | 1,000,000 | Total mesh traffic |
| **Avg Request Size** | 1 KB | Typical API payload |
| **Avg Response Size** | 5 KB | Including headers |

### Data Plane Calculations

```
Sidecar Resources (per pod):
─────────────────────────────────────────────────────────
Memory per sidecar:           60 MB (Istio), 10 MB (Linkerd)
CPU per sidecar (idle):       0.01 vCPU
CPU per 1000 RPS:             0.2 vCPU (Istio), 0.05 vCPU (Linkerd)

Total for 10,000 pods (Istio):
  Memory:  60 MB × 10,000 = 600 GB total sidecar memory
  CPU:     0.01 × 10,000 + (1M RPS / 1000) × 0.2 = 300 vCPU

Total for 10,000 pods (Linkerd):
  Memory:  10 MB × 10,000 = 100 GB total sidecar memory
  CPU:     0.01 × 10,000 + (1M RPS / 1000) × 0.05 = 150 vCPU
```

### Control Plane Calculations

```
Configuration Size:
─────────────────────────────────────────────────────────
Services:           1,000 × 2 KB = 2 MB
Endpoints:          10,000 × 0.5 KB = 5 MB
Virtual Services:   500 × 3 KB = 1.5 MB
Destination Rules:  500 × 2 KB = 1 MB
Policies:           200 × 1 KB = 0.2 MB
─────────────────────────────────────────────────────────
Total Config Size:  ~10 MB (uncompressed)

xDS Connections:    10,000 (one per sidecar)
Config Push Rate:   ~10 updates/minute
xDS Bandwidth:      10 MB × 10 updates/min = 100 MB/min (delta updates ~10%)
                    Actual: ~10 MB/min with delta xDS
```

### Certificate Authority Calculations

```
Certificate Operations:
─────────────────────────────────────────────────────────
Pods:                         10,000
Certificate Lifetime:         24 hours (recommended)
Renewal Window:               Before 50% lifetime
Renewals per Hour:            10,000 / 24 × 2 = ~833/hour
Peak Renewals (rotation):     ~1,000/hour

CSR Processing:               < 10ms per request
CA CPU:                       ~0.1 vCPU for 1000 renewals/hour
CA Memory:                    ~256 MB
```

### Storage Requirements

| Data | Size | Storage Type | Retention |
|------|------|--------------|-----------|
| **Config (etcd)** | 100 MB | SSD | Persistent |
| **Certificates** | 50 MB | Memory/SSD | Short-lived |
| **Access Logs** | 1 TB/day | Object Storage | 30 days |
| **Metrics** | 100 GB/day | Time-series DB | 15 days |
| **Traces** | 50 GB/day | Trace backend | 7 days |

### Bandwidth Estimation

```
Per-Request Overhead:
─────────────────────────────────────────────────────────
mTLS Handshake (session resumption): ~500 bytes
Trace Headers:                        ~200 bytes
Metric Recording:                     ~100 bytes
─────────────────────────────────────────────────────────
Total Overhead:                       ~800 bytes/request

Bandwidth Impact:
  1M RPS × 800 bytes = 800 MB/s additional bandwidth
  Percentage of payload: 800 / (1000 + 5000) = ~13% overhead
```

---

## SLOs & SLAs

### Data Plane SLOs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.99% | Successful proxy responses / total requests |
| **Latency Overhead (p50)** | < 3ms | Proxy processing time |
| **Latency Overhead (p99)** | < 10ms | Proxy processing time |
| **Error Rate (mesh-induced)** | < 0.01% | Errors due to mesh, not application |
| **mTLS Success Rate** | 99.999% | Successful TLS handshakes |

### Control Plane SLOs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.9% | Control plane API responsiveness |
| **Config Propagation (p50)** | < 5 seconds | Time from update to proxy application |
| **Config Propagation (p99)** | < 30 seconds | Worst-case propagation time |
| **xDS Connection Success** | 99.9% | Successful proxy-to-control-plane connections |
| **Certificate Issuance (p99)** | < 1 second | Time to issue new certificate |

### SLA Definitions

```
Service Level Agreement (Production Grade):
═══════════════════════════════════════════════════════════════

1. AVAILABILITY
   ─────────────────────────────────────────────────────────────
   Data Plane:     99.99% monthly uptime (52.6 min downtime/year)
   Control Plane:  99.9% monthly uptime (8.76 hours downtime/year)

2. PERFORMANCE
   ─────────────────────────────────────────────────────────────
   Latency Impact: < 10ms p99 additional latency
   Throughput:     Support 50K RPS per proxy instance

3. SECURITY
   ─────────────────────────────────────────────────────────────
   Certificate Rotation: Every 24 hours (configurable)
   Encryption:           TLS 1.3, mTLS for all mesh traffic

4. RECOVERY
   ─────────────────────────────────────────────────────────────
   RTO (Control Plane): 15 minutes
   RPO (Configuration): 0 (synced to persistent storage)

5. SCALABILITY
   ─────────────────────────────────────────────────────────────
   Supported Pods:       Up to 25,000 per control plane
   Supported Services:   Up to 5,000 per mesh

═══════════════════════════════════════════════════════════════
```

---

## Capacity Planning Summary

| Deployment Size | Services | Pods | Control Plane | Sidecar Memory | Notes |
|-----------------|----------|------|---------------|----------------|-------|
| **Small** | < 50 | < 500 | 2 replicas, 2 vCPU, 4 GB | 30 GB | Single cluster |
| **Medium** | 50-500 | 500-5,000 | 3 replicas, 4 vCPU, 8 GB | 300 GB | Discovery selectors |
| **Large** | 500-2,000 | 5,000-20,000 | 5 replicas, 8 vCPU, 16 GB | 1.2 TB | Multi-cluster recommended |
| **Very Large** | > 2,000 | > 20,000 | Multi-cluster federation | 2+ TB | Sidecar-less consideration |

---

## Out of Scope

| Feature | Reason | Alternative |
|---------|--------|-------------|
| **North-South Traffic** | Different concern than service mesh | API Gateway (1.14) |
| **Application-Level Auth** | Business logic concern | Application code |
| **Data Transformation** | Not network infrastructure | API Gateway or application |
| **Long-Running Connections** | WebSocket/gRPC streaming has different patterns | Application-level handling |
| **Non-HTTP Protocols** | Focus on HTTP/gRPC | TCP proxy mode (limited features) |

---

## Assumptions

1. **Kubernetes Environment**: Service mesh deployed on Kubernetes cluster
2. **Container-Based**: Applications run in containers with sidecar support
3. **Network Policy**: Underlying network allows pod-to-pod communication
4. **DNS Resolution**: Kubernetes DNS available and functioning
5. **Control Plane Resources**: Dedicated nodes for control plane components
6. **Observability Backend**: Prometheus, Jaeger, or equivalent available

---

**Next: [02 - High-Level Design](./02-high-level-design.md)**
