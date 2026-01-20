# Requirements & Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features (Must Have)

| Requirement | Description |
|-------------|-------------|
| **Traffic Distribution** | Distribute incoming requests across healthy backend servers |
| **Health Monitoring** | Detect unhealthy backends and remove them from rotation |
| **Multiple Algorithms** | Support various load balancing algorithms (RR, WRR, LC, etc.) |
| **Session Persistence** | Maintain client-server affinity when required |
| **Graceful Degradation** | Continue operating with reduced backend pool |

### Secondary Features (Should Have)

| Requirement | Description |
|-------------|-------------|
| **TLS Termination** | Offload SSL/TLS processing from backends (L7) |
| **Connection Draining** | Gracefully remove backends without dropping connections |
| **Dynamic Configuration** | Update backend pools without restart |
| **Weighted Distribution** | Assign different weights to backends based on capacity |
| **Health Check Customization** | Configure check intervals, thresholds, endpoints |

### Out of Scope

| Excluded | Reason |
|----------|--------|
| Application-level caching | Separate CDN/cache system |
| Request transformation | API Gateway responsibility |
| Authentication/Authorization | Handled by auth service |
| Rate limiting logic | Separate rate limiter service |
| Service discovery | External system (Consul, K8s, etc.) |

---

## Non-Functional Requirements

### CAP Theorem Choice

**AP (Availability + Partition Tolerance)**

**Justification:**
- Load balancer must remain available even during network partitions
- Stale health data (eventual consistency) is acceptable
- A temporarily unhealthy backend receiving traffic is better than total unavailability
- Health state synchronization can lag by seconds

### Consistency Model

| Aspect | Model | Rationale |
|--------|-------|-----------|
| **Health State** | Eventual Consistency | Health checks run independently per LB node |
| **Configuration** | Strong Consistency | Config changes must propagate reliably |
| **Connection State** | Local (per-node) | Connection tracking is node-local |
| **Statistics** | Eventual Consistency | Metrics can aggregate asynchronously |

### Availability Target

| Tier | Target | Downtime/Year | Use Case |
|------|--------|---------------|----------|
| Standard | 99.9% | ~8.76 hours | Internal services |
| High | 99.99% | ~52.6 minutes | Customer-facing APIs |
| **Critical** | **99.999%** | **~5.26 minutes** | **Payment, core infra** |

**Design for 99.99%** with capability to reach 99.999% through:
- Multi-zone deployment
- Active-active configuration
- Sub-second failover

### Latency Targets

| Layer | Metric | Target | Notes |
|-------|--------|--------|-------|
| **L4** | p50 | < 100 µs | Packet forwarding only |
| **L4** | p99 | < 500 µs | Connection establishment |
| **L7** | p50 | < 1 ms | With TLS session reuse |
| **L7** | p99 | < 5 ms | Including TLS handshake (cold) |
| **L7** | p99.9 | < 20 ms | Worst case (full TLS, no reuse) |

### Durability & Data Guarantees

| Data Type | Durability | Storage |
|-----------|------------|---------|
| Configuration | Durable | Persisted config store |
| Health State | Ephemeral | In-memory, reconstructed |
| Connection Table | Ephemeral | Per-node memory |
| Metrics/Logs | Durable | External telemetry system |

---

## Capacity Estimations

### Scenario: Large-Scale Web Platform

**Assumptions:**
- 100 million DAU
- Average 50 requests/user/day
- Peak is 5x average
- Average request size: 2 KB
- Average response size: 20 KB

### Traffic Calculations

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Daily Requests** | 100M × 50 | 5 billion |
| **Average QPS** | 5B / 86,400 | ~58,000 QPS |
| **Peak QPS** | 58K × 5 | **~290,000 QPS** |
| **Requests/sec/LB** (10 LBs) | 290K / 10 | ~29,000 QPS per LB |

### Connection Calculations

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Concurrent Users (peak)** | 100M × 5% | 5 million |
| **Connections per User** | ~2 (HTTP/2 multiplex) | - |
| **Total Connections** | 5M × 2 | **10 million** |
| **Connections/LB** (10 LBs) | 10M / 10 | 1 million per LB |

### Bandwidth Calculations

| Direction | Calculation | Result |
|-----------|-------------|--------|
| **Inbound (peak)** | 290K × 2 KB | ~580 MB/s = **4.6 Gbps** |
| **Outbound (peak)** | 290K × 20 KB | ~5.8 GB/s = **46 Gbps** |
| **Per LB Outbound** | 46 Gbps / 10 | ~4.6 Gbps per LB |

### Memory Requirements (per LB node)

| Component | Calculation | Memory |
|-----------|-------------|--------|
| **Connection Table** | 1M × 500 bytes | ~500 MB |
| **Health State** | 1000 backends × 1 KB | ~1 MB |
| **Configuration** | Rules, weights | ~10 MB |
| **TLS Session Cache** | 100K sessions × 2 KB | ~200 MB |
| **Buffers** | Request/response | ~1 GB |
| **Total** | Sum + overhead | **~2-4 GB** |

### Backend Pool Sizing

| Metric | Value |
|--------|-------|
| Backend servers (per service) | 10-1000 |
| Total backend instances | 5,000-10,000 |
| Health check frequency | Every 5 seconds |
| Health checks per second | 10K / 5 = 2,000 |

---

## Capacity Summary Table

| Metric | Average | Peak | Per LB Node |
|--------|---------|------|-------------|
| **QPS** | 58,000 | 290,000 | 29,000 |
| **Concurrent Connections** | 2M | 10M | 1M |
| **Inbound Bandwidth** | 1 Gbps | 4.6 Gbps | 460 Mbps |
| **Outbound Bandwidth** | 10 Gbps | 46 Gbps | 4.6 Gbps |
| **LB Nodes Required** | 5 | 10 | - |
| **Memory per Node** | - | - | 2-4 GB |

---

## SLOs / SLAs

### Service Level Objectives

| Metric | Objective | Measurement Window |
|--------|-----------|-------------------|
| **Availability** | 99.99% | Monthly |
| **Latency (L4 p99)** | < 500 µs | 5-minute rolling |
| **Latency (L7 p99)** | < 5 ms | 5-minute rolling |
| **Error Rate (LB-induced)** | < 0.01% | Hourly |
| **Failover Time** | < 3 seconds | Per incident |
| **Health Detection Time** | < 15 seconds | Per backend |
| **Config Propagation** | < 10 seconds | Per change |

### Error Budget (99.99% = 52.6 min/year)

| Allocation | Minutes/Year | Purpose |
|------------|--------------|---------|
| Planned maintenance | 20 | Upgrades, patches |
| Unplanned incidents | 25 | Failures, bugs |
| Buffer | 7.6 | Safety margin |

### SLA Tiers (Customer-Facing)

| Tier | Availability | Penalty |
|------|--------------|---------|
| Standard | 99.9% | None |
| Premium | 99.95% | 10% credit if missed |
| Enterprise | 99.99% | 25% credit if missed |

---

## Scaling Triggers

| Metric | Warning Threshold | Critical Threshold | Action |
|--------|-------------------|-------------------|--------|
| CPU Utilization | 60% | 80% | Add LB nodes |
| Memory Utilization | 70% | 85% | Add LB nodes |
| Connection Count | 70% of max | 85% of max | Add LB nodes |
| Latency p99 | 2x baseline | 5x baseline | Investigate/scale |
| Error Rate | 0.1% | 1% | Immediate investigation |
| Health Check Failures | 1 backend | 20% of pool | Alert on-call |

---

## Failure Budget Allocation

```
Monthly Error Budget: 4.38 minutes (99.99%)

Allocation:
├── LB Node Failures: 1.5 min (auto-failover expected)
├── Backend Pool Updates: 1.0 min (connection draining)
├── Config Deployments: 0.5 min (rolling updates)
├── Network Issues: 1.0 min (BGP convergence, etc.)
└── Buffer: 0.38 min
```

---

## Technology Constraints

### Hardware Requirements (per LB node)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 8 cores | 16+ cores |
| Memory | 8 GB | 32 GB |
| Network | 10 Gbps | 25-100 Gbps |
| Storage | 50 GB SSD | 100 GB NVMe |

### Software Requirements

| Component | Options |
|-----------|---------|
| OS | Linux (kernel 5.x+ for eBPF) |
| Packet Processing | DPDK, XDP, eBPF |
| Proxy Software | Envoy, HAProxy, Nginx |
| Config Store | etcd, Consul, ZooKeeper |
| Service Discovery | Consul, Kubernetes, DNS |
