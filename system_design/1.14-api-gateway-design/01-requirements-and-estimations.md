# Requirements and Estimations

## Table of Contents
- [Functional Requirements](#functional-requirements)
- [Non-Functional Requirements](#non-functional-requirements)
- [Capacity Estimations](#capacity-estimations)
- [Service Level Objectives](#service-level-objectives)
- [Out of Scope](#out-of-scope)

---

## Functional Requirements

### Core Gateway Features

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Request Routing** | Route requests based on path, host, headers, method | P0 |
| **Authentication** | Validate JWT, OAuth2 tokens, API keys, mTLS | P0 |
| **Rate Limiting** | Enforce request quotas per client/API | P0 |
| **Load Balancing** | Distribute requests across upstream instances | P0 |
| **Health Checking** | Monitor upstream availability | P0 |
| **TLS Termination** | Handle HTTPS connections from clients | P0 |

### Authentication Methods

| Method | Description | Priority |
|--------|-------------|----------|
| **JWT Validation** | Verify token signature, claims, expiration | P0 |
| **OAuth2/OIDC** | Integration with identity providers | P0 |
| **API Key** | Simple key-based authentication | P0 |
| **mTLS** | Mutual TLS for service-to-service | P1 |
| **Basic Auth** | Username/password (legacy support) | P2 |
| **HMAC Signatures** | Request signing for partners | P2 |

### Request/Response Transformation

| Feature | Description | Priority |
|---------|-------------|----------|
| **Header Manipulation** | Add, remove, modify headers | P0 |
| **URL Rewriting** | Transform request paths | P1 |
| **Request Body Transform** | Modify request payloads | P1 |
| **Response Body Transform** | Modify response payloads | P1 |
| **Protocol Translation** | REST ↔ gRPC, HTTP ↔ WebSocket | P1 |
| **Request Aggregation** | Combine multiple upstream calls | P2 |

### Protocol Support

| Protocol | Requirement | Priority |
|----------|-------------|----------|
| **HTTP/1.1** | Full support with keep-alive | P0 |
| **HTTP/2** | Multiplexing, header compression | P0 |
| **HTTPS** | TLS 1.2, 1.3 | P0 |
| **WebSocket** | Bidirectional upgrade | P1 |
| **gRPC** | HTTP/2-based RPC | P1 |
| **GraphQL** | Query routing, introspection protection | P2 |
| **HTTP/3 (QUIC)** | UDP-based transport | P2 |

### Traffic Management

| Feature | Description | Priority |
|---------|-------------|----------|
| **Circuit Breaker** | Prevent cascade failures | P0 |
| **Retry Policies** | Automatic retries with backoff | P1 |
| **Timeout Management** | Request/upstream timeouts | P0 |
| **Request Mirroring** | Shadow traffic to test clusters | P2 |
| **Canary Routing** | Percentage-based traffic splitting | P1 |
| **A/B Testing Support** | Header/cookie-based routing | P2 |

### Caching

| Feature | Description | Priority |
|---------|-------------|----------|
| **Response Caching** | Cache upstream responses | P1 |
| **Cache Invalidation** | Purge by key, pattern, tag | P1 |
| **Cache-Control Headers** | Honor HTTP caching directives | P1 |
| **Request Deduplication** | Collapse identical in-flight requests | P2 |

### Configuration & Management

| Feature | Description | Priority |
|---------|-------------|----------|
| **Declarative Config** | YAML/JSON configuration files | P0 |
| **Admin API** | REST API for runtime management | P0 |
| **Hot Reload** | Apply config without restart | P0 |
| **Config Validation** | Syntax and semantic checking | P0 |
| **Version Control** | Config versioning, rollback | P1 |

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Gateway Latency (p50)** | < 5ms | Minimal overhead on hot path |
| **Gateway Latency (p99)** | < 20ms | Acceptable tail latency |
| **Gateway Latency (p99.9)** | < 50ms | Rare worst-case |
| **Requests per Second** | 100K+ per node | High-throughput requirement |
| **Peak RPS** | 1M+ (cluster) | Handle traffic spikes |
| **Connection Acceptance** | 10K new conn/sec/node | Fast client onboarding |

### Resource Efficiency

| Resource | Target | Rationale |
|----------|--------|-----------|
| **Memory per Connection** | < 20KB | Support 50K+ connections per node |
| **CPU per Request** | < 500μs (with auth) | Sustained throughput |
| **Plugin Chain Overhead** | < 2ms for 5 plugins | Plugin latency budget |

### Availability Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| **Uptime** | 99.99% (52 min/year downtime) | Critical path component |
| **Graceful Degradation** | Auth/rate limit bypass on failure | Fail-open vs fail-closed option |
| **Failover Time** | < 5 seconds | Health check detection |
| **Zero-Downtime Deploys** | Required | Connection draining |

### Scalability Requirements

| Dimension | Target |
|-----------|--------|
| **Horizontal** | Linear scaling with nodes |
| **Routes** | 10,000+ route definitions |
| **Plugins** | 50+ plugins per route |
| **Upstreams** | 1,000+ upstream services |
| **Consumers** | 100,000+ API consumers |

---

## Capacity Estimations

### Scenario: High-Scale Consumer API Platform

**Assumptions:**
- 100 million Daily Active Users (DAU)
- 50 API calls per user per day average
- Peak traffic: 3x average (during events)
- 500 backend microservices
- 10,000 route definitions

#### Request Volume Calculations

```
Daily requests = 100M DAU × 50 calls/user = 5B requests/day

Average RPS = 5B / 86,400 sec = ~58K RPS
Peak RPS = 58K × 3 = ~175K RPS

Sustained target: 200K RPS (with headroom)
Burst target: 500K RPS (30 seconds)
```

#### Gateway Node Sizing

```
Per-node capacity: 50K RPS
Nodes for average load: 58K / 50K = 2 nodes (minimum)
Nodes for peak load: 175K / 50K = 4 nodes
Nodes with redundancy: 6 nodes (N+2)

Geographic distribution:
- 3 regions × 2 nodes = 6 nodes minimum
- With regional redundancy: 3 regions × 3 nodes = 9 nodes
```

#### Memory Requirements

```
Per gateway node:
- Connection state: 50K connections × 20KB = 1GB
- Route table: 10K routes × 1KB = 10MB
- Plugin configs: 10K routes × 50 plugins × 100B = 50MB
- Rate limit state: 1M consumers × 100B = 100MB (local cache)
- Buffer pools: 500MB
- Runtime overhead: 500MB

Total per node: ~2.5GB
Recommended: 8GB (with headroom)
```

#### Rate Limiter Backend (Redis)

```
Unique rate limit keys:
- Per consumer: 100K consumers
- Per API: 1K APIs
- Per consumer-API: 100K × 1K = 100M combinations (worst case)

Realistic active keys: 10M (90-day sliding window)
Memory per key: 50 bytes
Redis memory: 10M × 50B = 500MB

Operations:
- 200K RPS × 2 ops/request (GET + INCR) = 400K ops/sec
- Redis cluster: 3 nodes (primary + replicas)
```

### Scenario: Internal Microservices Gateway

**Assumptions:**
- 500 microservices
- 2M internal API calls per second
- Service mesh integration (mTLS)
- Lower authentication overhead (service-to-service trust)

#### Calculations

```
Internal RPS: 2M RPS (steady state)

Gateway approach options:
1. Centralized: Dedicated gateway cluster
   - Nodes needed: 2M / 100K = 20 nodes
   - Latency concern: Extra hop

2. Sidecar (preferred for internal):
   - Envoy sidecars per service
   - No centralized gateway for internal
   - Gateway only for ingress (external)

Hybrid recommendation:
- External traffic → Central gateway
- Internal traffic → Service mesh (sidecar)
```

### Bandwidth Calculations

| Traffic Type | RPS | Avg Request | Avg Response | Ingress | Egress |
|--------------|-----|-------------|--------------|---------|--------|
| REST API | 100K | 1KB | 5KB | 800 Mbps | 4 Gbps |
| GraphQL | 50K | 2KB | 10KB | 800 Mbps | 4 Gbps |
| gRPC | 50K | 500B | 2KB | 200 Mbps | 800 Mbps |
| **Total** | 200K | - | - | 1.8 Gbps | 8.8 Gbps |

### Authentication Cost Analysis

```
JWT validation per request:
- Parse token: 50μs
- Signature verification (RS256): 200μs
- Claims validation: 10μs
- Total: ~260μs

At 200K RPS:
- CPU time: 200K × 260μs = 52 CPU-seconds per second
- CPU cores needed: ~52 cores just for JWT
- Optimization: JWK caching, ECDSA (P-256) faster than RSA

With ES256 (recommended):
- Signature verification: 50μs
- Total: ~110μs per request
- CPU time: 200K × 110μs = 22 CPU-seconds
- CPU cores: ~22 cores for JWT
```

---

## Service Level Objectives (SLOs)

### Availability SLO

| Tier | Availability | Monthly Downtime | Use Case |
|------|-------------|------------------|----------|
| Tier 1 | 99.99% | 4.3 minutes | Production APIs |
| Tier 2 | 99.9% | 43 minutes | Internal APIs |
| Tier 3 | 99.5% | 3.6 hours | Development/staging |

### Latency SLO (Gateway Overhead Only)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **p50** | < 5ms | Request in → Upstream request sent |
| **p95** | < 10ms | Same |
| **p99** | < 20ms | Same |
| **p99.9** | < 50ms | Same |

**Note:** These exclude upstream response time. Total client latency = gateway overhead + upstream latency.

### Throughput SLO

| Metric | Target |
|--------|--------|
| **Sustained RPS** | 50K per node |
| **Burst RPS** | 100K per node (30 seconds) |
| **Max concurrent connections** | 50K per node |

### Error Budget

```
Monthly error budget at 99.99% SLO:
- Total requests: 200K RPS × 86,400 × 30 = 518.4B requests
- Error budget: 0.01% = 51.84M errors allowed

Weekly budget: ~12M errors
Daily budget: ~1.7M errors

Burn rate alerting:
- 1-hour burn rate > 100x → Critical (page)
- 6-hour burn rate > 10x → Warning
- 24-hour burn rate > 2x → Notice
```

---

## Out of Scope

| Feature | Reason | Alternative |
|---------|--------|-------------|
| **Full WAF** | Specialized security concern | Use dedicated WAF (Cloudflare, AWS WAF) |
| **Static Content Serving** | CDN responsibility | Front with CDN |
| **Long-running Requests** | > 30 second requests | Use async patterns, webhooks |
| **File Uploads** | > 10MB payloads | Direct upload to storage |
| **Business Logic** | Gateway should be thin | Keep in backend services |
| **Data Storage** | Beyond caching | Use external databases |
| **Message Queuing** | Async processing | Use message broker |

---

## Constraints

### Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **Single point of failure** | Gateway outage affects all APIs | Multi-zone deployment, failover |
| **Plugin chain latency** | Each plugin adds overhead | Limit plugins, optimize critical path |
| **JWT validation CPU** | Cryptographic operations expensive | Use ECDSA, cache JWKs |
| **Rate limit consistency** | Distributed state synchronization | Accept slight over-limit (eventual consistency) |
| **Configuration propagation** | Changes need time to sync | Canary config deployments |

### Operational Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **No downtime for config changes** | Business continuity | Hot reload, blue-green |
| **Certificate rotation** | TLS cert expiry | Automated rotation |
| **Log volume** | Storage and processing costs | Sampling, aggregation |
| **Multi-tenant isolation** | Noisy neighbor issues | Per-tenant rate limits |

---

## Capacity Planning Summary

### Per-Node Requirements

| Resource | Minimum | Recommended | High Performance |
|----------|---------|-------------|------------------|
| **CPU Cores** | 4 | 8 | 16+ |
| **Memory** | 4GB | 8GB | 16GB |
| **Network** | 1 Gbps | 10 Gbps | 25 Gbps |
| **Storage** | 20GB SSD | 50GB SSD | 100GB NVMe |

### Scaling Guidelines

| RPS | Nodes | Configuration |
|-----|-------|---------------|
| 50K | 2 | Single zone, hot standby |
| 200K | 4-6 | Multi-zone |
| 500K | 10-15 | Multi-region |
| 1M+ | 20+ | Global edge deployment |

### Supporting Infrastructure

| Component | Sizing | Purpose |
|-----------|--------|---------|
| **Redis (Rate Limiting)** | 3-node cluster, 2GB each | Distributed rate limit state |
| **PostgreSQL (Config)** | Primary + read replica | Route/plugin configuration |
| **Service Discovery** | 3-5 node Consul/etcd | Upstream resolution |
| **Log Aggregation** | 100GB/day capacity | Access logs, audit trail |
