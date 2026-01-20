# Requirements & Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Requirements

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-1 | Service Registration | P0 | Services can register themselves with the registry |
| FR-2 | Service Deregistration | P0 | Services can deregister on graceful shutdown |
| FR-3 | Service Discovery/Lookup | P0 | Clients can query for available instances of a service |
| FR-4 | Health Checking | P0 | Registry monitors service health and removes unhealthy instances |
| FR-5 | Metadata Support | P1 | Services can register with key-value metadata (version, zone, etc.) |
| FR-6 | Filtering/Query | P1 | Clients can filter instances by metadata (version, zone, tags) |
| FR-7 | Watch/Subscribe | P1 | Clients can subscribe to service changes (push notifications) |

### Extended Requirements

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-8 | Multi-Datacenter | P2 | Discovery across datacenters with locality preference |
| FR-9 | DNS Interface | P2 | DNS-based lookup for legacy/universal compatibility |
| FR-10 | Service Namespacing | P2 | Logical isolation of services (tenants, environments) |
| FR-11 | Bulk Operations | P2 | Register/query multiple services in single request |
| FR-12 | Historical Data | P3 | View past service states for debugging |

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Requirement | Rationale |
|--------|-------------|-----------|
| **Registration Latency** | < 100ms (p99) | Services should be discoverable quickly after startup |
| **Lookup Latency (uncached)** | < 10ms (p99) | Direct registry queries |
| **Lookup Latency (cached)** | < 1ms (p99) | Client-side cached lookups |
| **Watch Notification Latency** | < 1 second | Push updates for changes |
| **Health Check Frequency** | Configurable 5-60 seconds | Balance freshness vs. overhead |
| **Throughput (Lookups)** | > 100,000 QPS | Discovery is on critical path |
| **Throughput (Registrations)** | > 1,000 QPS | Handles deployment bursts |

### Reliability Requirements

| Metric | Target | Description |
|--------|--------|-------------|
| **Registry Availability** | 99.99% | < 52 minutes downtime/year |
| **Data Durability** | Tolerate N-1 node failures | For N-node cluster |
| **Consistency** | Eventual (< 5 seconds) for reads | Strong for writes within datacenter |
| **Split-Brain Protection** | Quorum-based | Prevent data divergence |

### Scalability Requirements

| Metric | Target | Description |
|--------|--------|-------------|
| **Services** | > 10,000 unique services | Service type count |
| **Instances** | > 100,000 total instances | Total registered instances |
| **Clients** | > 50,000 concurrent | Services querying the registry |
| **Datacenters** | > 5 regions | Multi-region deployment |
| **Metadata per Instance** | Up to 10 KB | Labels, tags, endpoints |

---

## Use Cases

### Primary Use Cases

#### 1. Microservices Communication

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Service-to-Service Communication                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Scenario:                                                           │
│  - Order Service needs to call Payment Service                       │
│  - Payment Service has 20 instances across 3 zones                   │
│  - Instances scale up/down based on load                            │
│                                                                      │
│  Flow:                                                               │
│  1. Payment Service instances register on startup:                   │
│     {"service": "payment", "host": "10.0.1.x", "port": 8080}       │
│                                                                      │
│  2. Order Service discovers Payment Service:                         │
│     GET /services/payment → [list of healthy instances]             │
│                                                                      │
│  3. Order Service picks instance (round-robin, least-conn, etc.)    │
│                                                                      │
│  4. Registry continuously health checks Payment instances            │
│     - Removes unhealthy instances from responses                     │
│     - Order Service only sees healthy instances                      │
│                                                                      │
│  Benefits:                                                           │
│  - Zero manual configuration                                         │
│  - Automatic scaling support                                         │
│  - Failure isolation                                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2. Blue-Green / Canary Deployments

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Canary Deployment with Metadata Routing                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Scenario:                                                           │
│  - Deploying payment-service v2.1 alongside v2.0                    │
│  - Route 5% of traffic to v2.1 (canary)                             │
│                                                                      │
│  Instance Registration:                                              │
│  payment-v2.0-instance-1:                                           │
│    {"service": "payment", "version": "2.0", "weight": 95}           │
│  payment-v2.1-instance-1:                                           │
│    {"service": "payment", "version": "2.1", "weight": 5}            │
│                                                                      │
│  Client Query:                                                       │
│  GET /services/payment?include_metadata=true                        │
│                                                                      │
│  Response:                                                           │
│  [                                                                   │
│    {"host": "10.0.1.1", "version": "2.0", "weight": 95},            │
│    {"host": "10.0.1.2", "version": "2.0", "weight": 95},            │
│    {"host": "10.0.2.1", "version": "2.1", "weight": 5}              │
│  ]                                                                   │
│                                                                      │
│  Client-side routing:                                                │
│  - Use weighted random selection                                     │
│  - 5% of requests go to v2.1                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3. Zone-Aware Routing

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Locality-Aware Discovery                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Scenario:                                                           │
│  - Services deployed across us-east-1a, us-east-1b, us-east-1c     │
│  - Prefer same-zone instances to minimize latency                   │
│                                                                      │
│  Instance Registration:                                              │
│  payment-instance-1:                                                │
│    {"service": "payment", "zone": "us-east-1a", "host": "..."}     │
│  payment-instance-2:                                                │
│    {"service": "payment", "zone": "us-east-1b", "host": "..."}     │
│                                                                      │
│  Client Query (from us-east-1a):                                    │
│  GET /services/payment?prefer_zone=us-east-1a                       │
│                                                                      │
│  Response (ordered by preference):                                   │
│  [                                                                   │
│    {"host": "...", "zone": "us-east-1a"},  // Same zone first       │
│    {"host": "...", "zone": "us-east-1b"},  // Fallback              │
│    {"host": "...", "zone": "us-east-1c"}   // Fallback              │
│  ]                                                                   │
│                                                                      │
│  Benefits:                                                           │
│  - Lower latency (same-zone calls < 1ms vs cross-zone ~2-5ms)      │
│  - Lower cost (same-zone traffic often free)                        │
│  - Graceful degradation if zone has issues                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Secondary Use Cases

| Use Case | Description | Example |
|----------|-------------|---------|
| Database Replica Discovery | Find read replicas for read scaling | App → discover postgres-read instances |
| Cache Cluster Discovery | Find cache nodes for distributed cache | App → discover redis-cluster instances |
| Job Worker Discovery | Find available workers for task distribution | Scheduler → discover workers |
| API Gateway Backends | Gateway discovers upstream services | Gateway → discover user-service, order-service |
| External Service Integration | Register external endpoints | Register SaaS webhooks, partner APIs |

---

## Capacity Estimations

### Reference Architecture: 10,000 Instances

```
┌─────────────────────────────────────────────────────────────────────┐
│  REFERENCE SCENARIO                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Scale:                                                              │
│    - 500 unique services                                            │
│    - 10,000 service instances (20 instances per service avg)        │
│    - 50,000 client connections                                      │
│    - 3 datacenters                                                  │
│                                                                      │
│  Traffic Patterns:                                                   │
│    - 100,000 lookups/second (peak)                                  │
│    - 1,000 registrations/second (during deployments)                │
│    - 500 health checks/second (10K instances × 30s interval)        │
│    - 5,000 watch subscribers                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Storage Requirements

```
Instance Record Size:
┌────────────────────────────────────────────────────────────┐
│ Field              │ Size    │ Notes                       │
├────────────────────┼─────────┼─────────────────────────────┤
│ service_name       │ 64 B    │ "payment-service"           │
│ instance_id        │ 64 B    │ UUID                        │
│ host               │ 64 B    │ IP or hostname              │
│ port               │ 4 B     │ uint16 + padding            │
│ health_status      │ 4 B     │ enum                        │
│ last_heartbeat     │ 8 B     │ timestamp                   │
│ registered_at      │ 8 B     │ timestamp                   │
│ metadata           │ 2 KB    │ JSON labels/tags            │
│ health_check_url   │ 256 B   │ "/health" endpoint          │
└────────────────────┴─────────┴─────────────────────────────┘
Total per instance: ~2.5 KB

Storage for 10,000 instances:
  - Instance data: 10,000 × 2.5 KB = 25 MB
  - Index overhead: ~5 MB (service → instances index)
  - Total in-memory: ~30 MB

Storage for 100,000 instances:
  - Instance data: 100,000 × 2.5 KB = 250 MB
  - Index overhead: ~50 MB
  - Total in-memory: ~300 MB

Note: Most registries keep data in memory for fast lookups
```

### Bandwidth Requirements

```
┌─────────────────────────────────────────────────────────────────────┐
│  BANDWIDTH ESTIMATION                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Lookup Traffic:                                                     │
│    - 100,000 requests/second                                        │
│    - Request size: ~100 bytes                                       │
│    - Response size: ~2 KB (average 10 instances × 200 bytes)        │
│    - Inbound: 100,000 × 100 B = 10 MB/s                            │
│    - Outbound: 100,000 × 2 KB = 200 MB/s                           │
│                                                                      │
│  Health Check Traffic:                                               │
│    - 500 checks/second (10K instances ÷ 20s interval)              │
│    - ~200 bytes per check (request + response)                      │
│    - Bandwidth: 500 × 200 B = 100 KB/s (negligible)                │
│                                                                      │
│  Watch/Push Notifications:                                           │
│    - 5,000 subscribers                                              │
│    - 100 changes/second (deployments, failures)                     │
│    - Notification size: ~500 bytes                                  │
│    - Outbound: 5,000 × 100 × 500 B = 250 MB/s (peak during deploy) │
│                                                                      │
│  Total Peak Bandwidth: ~450 MB/s outbound                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Registry Cluster Sizing

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLUSTER SIZING GUIDELINES                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Small (< 1,000 instances):                                         │
│    - 3 registry nodes                                               │
│    - 2 CPU, 4 GB RAM each                                          │
│    - Handles 10,000 QPS                                             │
│                                                                      │
│  Medium (1,000 - 10,000 instances):                                 │
│    - 5 registry nodes                                               │
│    - 4 CPU, 8 GB RAM each                                          │
│    - Handles 50,000 QPS                                             │
│                                                                      │
│  Large (10,000 - 100,000 instances):                                │
│    - 5-7 registry nodes                                             │
│    - 8 CPU, 16 GB RAM each                                         │
│    - Handles 100,000+ QPS                                           │
│    - Consider regional clusters                                      │
│                                                                      │
│  Very Large (100,000+ instances):                                   │
│    - Regional registry clusters (5-7 nodes per region)              │
│    - 16 CPU, 32 GB RAM each                                        │
│    - WAN federation between regions                                 │
│    - Client-side caching mandatory                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## SLOs / SLAs

### Service Level Objectives

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Lookup Availability** | 99.99% | Successful lookups / Total lookups |
| **Lookup Latency (p50)** | < 5ms | Histogram of lookup durations |
| **Lookup Latency (p99)** | < 20ms | Histogram of lookup durations |
| **Registration Latency (p99)** | < 100ms | Time from request to confirmation |
| **Stale Data Window** | < 30 seconds | Max time unhealthy instance served |
| **Watch Notification Delay** | < 2 seconds | Time from change to notification |

### Health Check SLOs

| Metric | Target | Description |
|--------|--------|-------------|
| **False Positive Rate** | < 0.1% | Healthy instances marked unhealthy |
| **False Negative Rate** | < 1% | Unhealthy instances marked healthy |
| **Detection Time** | < 60 seconds | Time to detect failed instance |
| **Recovery Time** | < 30 seconds | Time to restore recovered instance |

### Multi-Datacenter SLOs

| Metric | Target | Description |
|--------|--------|-------------|
| **Cross-DC Replication Lag** | < 5 seconds | Eventual consistency window |
| **Failover Time** | < 30 seconds | Time to redirect to another DC |
| **Local Lookup Preference** | > 99% | Lookups served by local registry |

---

## Constraints & Assumptions

### Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| Network Partitions | Registry must handle split-brain | Quorum-based decisions |
| Clock Skew | Instances/registry may have different times | Use TTL, not absolute time |
| NAT/Firewalls | Services may be behind NAT | Require explicit host/port |
| DNS Caching | Client DNS caches may be stale | DNS TTL must be low or use push |

### Assumptions

| Assumption | Rationale |
|------------|-----------|
| Services can reach registry | Network connectivity to registry cluster |
| Services can expose health endpoint | HTTP/gRPC health check endpoint available |
| Instance count per service < 1,000 | Reasonable for microservices |
| Metadata size < 10 KB per instance | Labels, tags, not large payloads |
| Service names are globally unique | Within namespace/tenant |

---

## Out of Scope

| Concern | Why Out of Scope | Handled By |
|---------|-----------------|------------|
| Load Balancing Algorithm | Discovery finds instances, doesn't balance | Client or load balancer |
| Request Routing | Discovery provides endpoints, not routing | Service mesh, API gateway |
| Circuit Breaking | Failure handling after discovery | Client library, service mesh |
| Rate Limiting | Throttling requests to services | API gateway, service |
| Authentication/Authorization | Service-to-service auth | mTLS, service mesh, auth service |
| Configuration Management | Config separate from discovery | Config service (etcd, Consul KV) |

---

## Requirements Traceability

| Requirement | Addressed In | Implementation |
|-------------|--------------|----------------|
| FR-1: Registration | 03-low-level-design | Register API + algorithm |
| FR-2: Deregistration | 03-low-level-design | Deregister API |
| FR-3: Discovery | 02-high-level-design, 03-low-level-design | Lookup flow + API |
| FR-4: Health Checking | 04-deep-dive | Health check algorithms |
| FR-5: Metadata | 03-low-level-design | Data model |
| FR-6: Filtering | 03-low-level-design | Query API |
| FR-7: Watch | 03-low-level-design | Subscription algorithm |
| FR-8: Multi-DC | 05-scalability | WAN federation |
