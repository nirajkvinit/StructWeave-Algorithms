# Requirements & Capacity Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features (In Scope)

1. **Pod Scheduling & Lifecycle Management**
   - Schedule pods to appropriate nodes based on resource requests and constraints
   - Manage pod lifecycle: Pending → Running → Succeeded/Failed
   - Support pod eviction, preemption, and rescheduling
   - Handle init containers, sidecar containers, and multi-container pods

2. **Service Discovery & Load Balancing**
   - Abstract pod IPs behind stable service endpoints
   - DNS-based service discovery (e.g., `my-service.my-namespace.svc.cluster.local`)
   - Layer 4 (TCP/UDP) load balancing across healthy pod endpoints
   - Support for ClusterIP, NodePort, LoadBalancer, and ExternalName service types

3. **Storage Orchestration**
   - Dynamic provisioning of persistent volumes (PV/PVC)
   - Support for multiple storage backends via Container Storage Interface (CSI)
   - Volume lifecycle management (attach, mount, detach)
   - Storage classes for different performance tiers

4. **Self-Healing**
   - Automatic container restart on failure
   - Pod rescheduling when nodes become unhealthy
   - Liveness, readiness, and startup probes
   - Automatic endpoint removal for unhealthy pods

5. **Horizontal & Vertical Scaling**
   - Manual scaling via replica count changes
   - Horizontal Pod Autoscaler (HPA) based on CPU/memory/custom metrics
   - Vertical Pod Autoscaler (VPA) for resource recommendation and adjustment
   - Cluster autoscaling (add/remove nodes based on demand)

6. **Configuration & Secret Management**
   - ConfigMaps for non-sensitive configuration
   - Secrets for sensitive data (encrypted at rest)
   - Environment variable and volume-based injection
   - Dynamic configuration updates (with pod restart or rolling update)

7. **Deployment Strategies**
   - Rolling updates with configurable surge and unavailability
   - Rollback to previous revisions
   - Blue-green and canary deployments (via service mesh or native)
   - StatefulSet for stateful applications with stable identities

8. **Resource Management**
   - Resource requests (scheduling) and limits (enforcement)
   - Namespace-level ResourceQuotas
   - LimitRanges for default and maximum resource constraints
   - Priority classes and preemption

### Out of Scope

- Application-level traffic management (handled by service mesh)
- CI/CD pipeline integration (separate system)
- Multi-cluster federation management (Karmada, Admiralty)
- Serverless workloads (Knative, OpenFaaS)
- Machine learning workflows (Kubeflow)

---

## Non-Functional Requirements

### CAP Theorem Choice

**Control Plane: CP (Consistency + Partition Tolerance)**

**Justification:**
- Scheduling decisions require consistent view of cluster state
- Double-scheduling a pod to multiple nodes is worse than temporary unavailability
- etcd uses Raft consensus for strong consistency

**Data Plane: AP (Availability + Partition Tolerance)**

**Justification:**
- Running pods must continue executing during control plane outages
- kubelet operates autonomously once pod is scheduled
- Network connectivity between pods should survive control plane issues

### Consistency Model

| Component | Consistency Requirement |
|-----------|------------------------|
| etcd (cluster state) | Strongly consistent (linearizable) |
| API Server reads | Sequential consistency (may read slightly stale) |
| Controller decisions | Eventually consistent (reconciliation loops) |
| Service endpoints | Eventually consistent (propagation delay) |
| DNS records | Eventually consistent (TTL-based caching) |

**Acceptable Inconsistency Windows:**

| Scenario | Acceptable Delay |
|----------|------------------|
| Pod scheduling | Immediate (synchronous) |
| Endpoint updates | 1-5 seconds |
| DNS propagation | 5-30 seconds |
| Config/secret updates | Requires pod restart or controller support |

### Availability Targets

| Component | Target | Justification |
|-----------|--------|---------------|
| **Control Plane API** | 99.99% | Critical for deployments and scaling |
| **etcd Cluster** | 99.99% | Foundation of all cluster state |
| **Scheduler** | 99.9% | Degraded mode: pods queue up |
| **Data Plane (pods running)** | 99.999% | Once scheduled, should keep running |

**Control Plane HA Requirements:**
- Multi-replica API servers behind load balancer
- etcd cluster with 3-5 nodes (tolerates 1-2 failures)
- Leader election for scheduler and controller manager
- Multi-AZ distribution for regional resilience

### Latency Targets

| Operation | Percentile | Target | Justification |
|-----------|------------|--------|---------------|
| API Server read | p99 | < 100ms | Frequent, latency-sensitive |
| API Server mutating | p99 | < 1s | Must persist to etcd |
| Pod scheduling (startup latency) | p99 | < 5s | From creation to Running |
| Pod scheduling (large cluster) | p99 | < 15s | 5,000+ nodes |
| Service endpoint update | p99 | < 5s | After pod becomes ready |

**Kubernetes SLOs (from Kubernetes scalability SIG):**
- 99th percentile API call latency ≤ 1s for mutating calls (single object)
- 99th percentile API call latency ≤ 30s for non-streaming read calls
- 99th percentile pod startup latency ≤ 5s (pod startup time from pod creation to when pod is in Running state)

### Durability

| Data Type | Durability Requirement |
|-----------|----------------------|
| Cluster state (etcd) | Strongly durable, replicated |
| Container logs | Ephemeral (node-local) or external log aggregation |
| Metrics | Time-limited (retention policy) |
| Secrets | Durable, encrypted at rest |

### Throughput

| Operation | Target | Notes |
|-----------|--------|-------|
| API Server QPS | 50-500 QPS (varies by cluster size) | Higher with caching |
| Pod creations | 100-500 pods/second sustained | Burst higher |
| Watch connections | 10,000+ concurrent | Efficient via shared informers |
| Scheduler throughput | 100+ pods/second | Parallelized scoring |

---

## Capacity Estimations (Back-of-Envelope)

### Cluster Size Tiers

| Tier | Nodes | Pods | Namespaces | Use Case |
|------|-------|------|------------|----------|
| **Small** | 10-100 | 1K-5K | 10-50 | Startups, dev/staging |
| **Medium** | 100-1,000 | 5K-30K | 50-200 | Mid-size production |
| **Large** | 1,000-5,000 | 30K-150K | 200-1,000 | Large enterprises |
| **Hyperscale** | 5,000-15,000+ | 150K-500K+ | 1,000+ | Cloud providers, tech giants |

### Large Cluster Assumptions (5,000 nodes)

- 5,000 worker nodes
- 150,000 pods (30 pods/node average)
- 10,000 services
- 1,000 namespaces
- 50,000 ConfigMaps/Secrets
- 20,000 persistent volume claims

### API Server Load Estimates

| Operation Type | QPS Estimate | Calculation |
|----------------|--------------|-------------|
| **Watch events** | Dominant | Controllers, kubelets watching |
| **Pod status updates** | 150,000 / 30s = 5,000 QPS | Each pod updates every 30s |
| **Node heartbeats** | 5,000 / 10s = 500 QPS | Node lease every 10s |
| **Controller reconciliation** | ~100-500 QPS | Varies by controller activity |
| **User/CI requests** | ~50-200 QPS | kubectl, deployments |
| **Total estimated** | **~6,000-8,000 QPS** | With efficient watch caching |

### etcd Storage Estimates

| Object Type | Count | Avg Size | Total |
|-------------|-------|----------|-------|
| Pods | 150,000 | 5 KB | 750 MB |
| Nodes | 5,000 | 10 KB | 50 MB |
| Services | 10,000 | 2 KB | 20 MB |
| Endpoints/EndpointSlices | 10,000 | 5 KB | 50 MB |
| ConfigMaps | 30,000 | 10 KB | 300 MB |
| Secrets | 20,000 | 5 KB | 100 MB |
| Deployments | 10,000 | 3 KB | 30 MB |
| ReplicaSets | 30,000 | 2 KB | 60 MB |
| PVs/PVCs | 40,000 | 2 KB | 80 MB |
| Events | 500,000 | 1 KB | 500 MB (TTL'd) |
| **Total** | | | **~2 GB active** |

**etcd recommendations:**
- Database size limit: 8 GB default (configurable)
- Compaction and defragmentation essential
- SSD storage required (fsync latency critical)
- 3-5 node cluster for HA

### Network Bandwidth Estimates

| Traffic Type | Estimate | Notes |
|--------------|----------|-------|
| API Server ↔ etcd | 50-100 Mbps | Watch updates, mutations |
| API Server ↔ kubelets | 100-500 Mbps | Pod specs, status updates |
| Pod-to-pod (data plane) | 10-100 Gbps | Application dependent |
| Control plane inter-node | 1-10 Gbps | Leader election, replication |

### Control Plane Infrastructure

| Component | Count | Specification (Large Cluster) |
|-----------|-------|-------------------------------|
| API Server | 3-5 | 16 CPU, 64 GB RAM |
| etcd | 3-5 | 8 CPU, 32 GB RAM, NVMe SSD |
| Scheduler | 3 (1 active) | 8 CPU, 16 GB RAM |
| Controller Manager | 3 (1 active) | 8 CPU, 32 GB RAM |
| Load Balancer | 2+ | For API server HA |

---

## SLOs / SLAs

### Service Level Objectives (Internal)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Availability** | 99.99% | (1 - 5xx responses / total requests) × 100 |
| **API Latency (read p99)** | < 100ms | End-to-end API call |
| **API Latency (mutate p99)** | < 1s | Including etcd persist |
| **Pod Startup Latency** | < 5s p99 | Creation to Running (image cached) |
| **Pod Startup (cold)** | < 60s p99 | Including image pull |
| **Scheduling Throughput** | > 100 pods/s | Sustained scheduling rate |
| **etcd Availability** | 99.99% | Quorum maintained |

### Service Level Agreements (Managed Service)

| Metric | Commitment | Remedy |
|--------|------------|--------|
| Control Plane Availability | 99.95% monthly | Service credits |
| API Latency | p99 < 2s | Investigation SLA |
| Cluster Upgrade | < 30 min control plane | Best effort |

### Error Budget

| Period | Allowed Downtime (99.99%) | Allowed Downtime (99.95%) |
|--------|---------------------------|---------------------------|
| Monthly | 4.32 minutes | 21.6 minutes |
| Quarterly | 13 minutes | 1 hour |

---

## Constraints & Assumptions

### Technical Constraints

1. **etcd performance** - Latency-sensitive; requires SSD with < 10ms fsync
2. **API Server memory** - Watch cache can consume significant RAM at scale
3. **Single cluster limits** - Kubernetes tested to ~5,000 nodes, ~150,000 pods
4. **Network latency** - Control plane components should be in same region
5. **Clock synchronization** - NTP required for certificate validation, lease expiry

### Kubernetes Tested Limits

| Resource | Limit |
|----------|-------|
| Nodes per cluster | 5,000 |
| Pods per cluster | 150,000 |
| Pods per node | 110 (default), configurable |
| Containers per pod | No hard limit (resource bound) |
| Services per cluster | 10,000 |
| Namespaces | 10,000 |
| Total API objects | ~500,000 |

### Business Constraints

1. **Multi-tenancy** - Namespace isolation must prevent cross-tenant access
2. **Compliance** - Audit logging required for all API operations
3. **Cost optimization** - Autoscaling should minimize over-provisioning
4. **Upgrade windows** - Control plane upgrades with minimal disruption

### Assumptions

1. Container images are available in registry accessible to all nodes
2. Network connectivity exists between all nodes (flat or overlay)
3. Persistent storage backends are provisioned and accessible
4. DNS resolution works within the cluster network
5. Time synchronization (NTP) is configured on all nodes

---

## Success Criteria

| Criteria | Measurement | Target |
|----------|-------------|--------|
| Pod scheduling success rate | Scheduled / requested | > 99.9% |
| Self-healing effectiveness | Auto-recovered / failures | > 99% |
| Resource utilization | Allocated / requested | > 70% |
| Upgrade success rate | Successful / attempted | > 99% |
| Incident response time | Detection to mitigation | < 15 min |
| Mean time to recovery (MTTR) | Incident duration | < 30 min |
