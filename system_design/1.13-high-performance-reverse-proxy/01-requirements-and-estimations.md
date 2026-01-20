# Requirements and Estimations

## Table of Contents
- [Functional Requirements](#functional-requirements)
- [Non-Functional Requirements](#non-functional-requirements)
- [Capacity Estimations](#capacity-estimations)
- [Service Level Objectives](#service-level-objectives)
- [Out of Scope](#out-of-scope)

---

## Functional Requirements

### Core Proxying Features

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **HTTP/HTTPS Reverse Proxying** | Accept client requests and forward to upstream servers | P0 |
| **Load Balancing** | Distribute requests across multiple upstream servers | P0 |
| **SSL/TLS Termination** | Decrypt HTTPS traffic from clients | P0 |
| **Request Routing** | Route based on host, path, headers | P0 |
| **Health Checking** | Monitor upstream server availability | P0 |
| **Connection Pooling** | Reuse upstream connections | P0 |

### Protocol Support

| Protocol | Requirement | Priority |
|----------|-------------|----------|
| **HTTP/1.1** | Full support with keep-alive | P0 |
| **HTTP/2** | Multiplexed streams, header compression | P0 |
| **HTTP/3 (QUIC)** | UDP-based, 0-RTT resumption | P1 |
| **WebSocket** | Bidirectional upgrade handling | P1 |
| **gRPC** | HTTP/2-based RPC proxying | P1 |
| **TCP (L4)** | Raw TCP proxying without inspection | P2 |

### Request Processing

| Feature | Description | Priority |
|---------|-------------|----------|
| **URL Rewriting** | Modify request paths before forwarding | P1 |
| **Header Manipulation** | Add, remove, modify request/response headers | P1 |
| **Request/Response Buffering** | Store complete request before forwarding | P1 |
| **Compression** | Gzip/Brotli compression of responses | P1 |
| **Request Mirroring** | Shadow traffic to test clusters | P2 |

### Load Balancing Algorithms

| Algorithm | Use Case | Priority |
|-----------|----------|----------|
| **Round Robin** | Equal distribution | P0 |
| **Weighted Round Robin** | Capacity-aware distribution | P0 |
| **Least Connections** | Route to least loaded server | P0 |
| **Consistent Hashing** | Session affinity, caching | P1 |
| **Random** | Simple stateless balancing | P2 |

### Configuration Management

| Feature | Description | Priority |
|---------|-------------|----------|
| **Configuration File** | Static YAML/JSON configuration | P0 |
| **Hot Reload** | Apply config changes without restart | P0 |
| **Dynamic Configuration** | API-based runtime updates | P1 |
| **Configuration Validation** | Syntax and semantic checking | P0 |

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Concurrent Connections** | 100K+ per worker | Modern edge requirements |
| **Requests per Second** | 100K+ per node | High-traffic site needs |
| **Proxy Latency Overhead** | p50 < 1ms, p99 < 5ms | Must not add perceptible delay |
| **Connection Establishment** | < 1ms for accept | Fast client onboarding |
| **TLS Handshake** | < 50ms with session resumption | Acceptable for new connections |

### Resource Efficiency

| Resource | Target | Rationale |
|----------|--------|-----------|
| **Memory per Connection** | < 10KB idle state | 100K connections = 1GB RAM |
| **CPU per Request** | < 100μs (non-TLS) | High throughput requirement |
| **File Descriptors** | Support 1M+ open | Large connection counts |

### Availability Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| **Uptime** | 99.99% (52 min downtime/year) | Critical path component |
| **Graceful Restart** | Zero dropped connections | Config reload without drops |
| **Failover Time** | < 10 seconds | Health check detection |

### Protocol Requirements

| Protocol | Version Support |
|----------|-----------------|
| **TLS** | 1.2, 1.3 (1.0/1.1 deprecated) |
| **HTTP** | 1.1, 2, 3 |
| **ALPN** | h2, http/1.1, h3 |
| **SNI** | Multiple certificates per IP |

---

## Capacity Estimations

### Scenario: High-Traffic Web Platform

**Assumptions:**
- 1 million concurrent users
- Average 5 connections per user (HTTP/2 reduces this)
- Mix of long-lived and short-lived connections

#### Connection Math

```
Total concurrent connections = 1M users × 5 connections/user = 5M connections

With HTTP/2 multiplexing (reduces connection count by 80%):
Effective connections = 5M × 0.2 = 1M concurrent connections

Per proxy node (assuming 10 nodes):
Connections per node = 1M / 10 = 100K connections/node
```

#### Memory Requirements

```
Per-connection memory breakdown:
- Connection state machine: 200 bytes
- Read buffer: 4KB
- Write buffer: 4KB
- TLS state: 2KB (if TLS terminated)
- HTTP/2 stream state: 1KB × 100 streams = 100KB
- Total per connection: ~110KB (HTTP/2 with streams)
- Total per connection: ~10KB (HTTP/1.1 idle)

For 100K connections:
- HTTP/1.1 mostly idle: 100K × 10KB = 1GB
- HTTP/2 active: 100K × 110KB = 11GB

Buffer pool optimization reduces by 50%:
- Realistic memory: 5-6GB per node for connections
- Plus OS overhead, code, cache: 8GB total recommended
```

#### Throughput Estimation

```
Request rate assumptions:
- Average request size: 2KB
- Average response size: 10KB
- Requests per second per connection: 10 (active browsing)

Per node (100K connections):
- Active connections at any moment: 10% = 10K
- Requests per second: 10K × 10 = 100K RPS

Bandwidth per node:
- Ingress: 100K RPS × 2KB = 200 MB/s = 1.6 Gbps
- Egress: 100K RPS × 10KB = 1 GB/s = 8 Gbps
- Total bandwidth: ~10 Gbps per node
```

### Scenario: API Gateway

**Assumptions:**
- 50K RPS aggregate
- Average request: 500 bytes
- Average response: 2KB
- All requests TLS terminated

#### Calculations

```
Connection management:
- Connection reuse ratio: 95% (keep-alive)
- New connections per second: 50K × 0.05 = 2,500/sec
- TLS handshakes: 2,500/sec (expensive!)

CPU for TLS:
- TLS handshake: ~1ms CPU time
- 2,500 handshakes × 1ms = 2.5 CPU cores just for handshakes
- Plus request processing: 50K × 10μs = 0.5 CPU core
- Recommended: 4+ CPU cores

Memory:
- Connection pool size: 10K connections (for keep-alive)
- Per connection: 10KB
- Connection memory: 100MB
- Buffer pools, caches: 500MB
- Total: 1GB per node
```

### Bandwidth Planning

| Scenario | Requests/sec | Avg Request | Avg Response | Ingress | Egress |
|----------|-------------|-------------|--------------|---------|--------|
| Web Frontend | 100K | 2KB | 50KB | 1.6 Gbps | 40 Gbps |
| API Gateway | 50K | 500B | 2KB | 200 Mbps | 800 Mbps |
| Microservices | 200K | 1KB | 5KB | 1.6 Gbps | 8 Gbps |

### File Descriptor Requirements

```
Per proxy node:
- Client connections: 100,000
- Upstream connections: 10,000 (pooled)
- Logging/monitoring: 100
- Overhead: 1,000

Total file descriptors: ~111,000

Kernel setting:
- Soft limit: 200,000
- Hard limit: 500,000
```

---

## Service Level Objectives (SLOs)

### Availability SLO

| Tier | Availability | Monthly Downtime | Use Case |
|------|-------------|------------------|----------|
| Tier 1 | 99.99% | 4.3 minutes | Production traffic |
| Tier 2 | 99.9% | 43 minutes | Non-critical services |
| Tier 3 | 99.5% | 3.6 hours | Development/staging |

### Latency SLO

| Metric | Target | Measurement Point |
|--------|--------|-------------------|
| **p50 Proxy Overhead** | < 0.5ms | Request in → Request to upstream |
| **p95 Proxy Overhead** | < 2ms | Same |
| **p99 Proxy Overhead** | < 5ms | Same |
| **p99.9 Proxy Overhead** | < 20ms | Same |

### Throughput SLO

| Metric | Target |
|--------|--------|
| **Sustained RPS** | 100K per node |
| **Burst RPS** | 200K per node (30 seconds) |
| **Connection Accept Rate** | 10K new connections/second |

### Error Budget

```
Monthly error budget at 99.99% SLO:
- Total requests: 100K RPS × 86,400 sec × 30 days = 259.2B requests
- Error budget: 0.01% = 25.92M failed requests allowed

Weekly budget: ~6.5M failures
Daily budget: ~864K failures
```

---

## Out of Scope

| Feature | Reason | Alternative |
|---------|--------|-------------|
| **Static Content Serving** | Specialized CDN role | Use CDN or dedicated web server |
| **Application Logic** | Proxy should be thin | Handle in upstream services |
| **Long-term Caching** | Memory constraints | Use distributed cache |
| **Request Rate Limiting** | Covered in separate design | See 1.1 Rate Limiter |
| **Authentication/Authorization** | Covered in separate design | See 2.5 IAM System |
| **Service Discovery** | Covered in separate design | See 1.10 Service Discovery |

---

## Constraints

### Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **CPU bound by TLS** | Limits HTTPS throughput | TLS session resumption, async crypto |
| **Memory per connection** | Limits total connections | Minimize per-connection state |
| **File descriptor limits** | OS-level connection cap | Kernel tuning |
| **Single-process memory** | ~64GB practical limit | Multiple workers/processes |

### Operational Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **Config reload latency** | Temporary inconsistency | Atomic reload, canary |
| **Log volume** | Storage costs | Sampling, aggregation |
| **Certificate rotation** | Downtime risk | Automated rotation, OCSP |

---

## Capacity Planning Summary

### Per-Node Requirements

| Resource | Minimum | Recommended | High Performance |
|----------|---------|-------------|------------------|
| **CPU Cores** | 4 | 8 | 16+ |
| **Memory** | 4GB | 16GB | 64GB |
| **Network** | 1 Gbps | 10 Gbps | 25-100 Gbps |
| **Storage** | 50GB SSD | 100GB SSD | 200GB NVMe |

### Scaling Guidelines

| Connections | Nodes | Configuration |
|-------------|-------|---------------|
| 10K | 1 | Single node |
| 100K | 2-4 | Multiple workers |
| 1M | 10-20 | Distributed with anycast |
| 10M | 100+ | Global edge deployment |
