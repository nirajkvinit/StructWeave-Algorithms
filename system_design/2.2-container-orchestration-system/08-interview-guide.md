# Interview Guide

[← Back to Index](./00-index.md)

---

## 45-Minute Interview Pacing

### Timeline

| Time | Phase | Focus | Key Actions |
|------|-------|-------|-------------|
| 0-5 min | **Requirements** | Clarify scope | Ask about scale, consistency needs, multi-tenancy |
| 5-15 min | **High-Level Design** | Architecture | Draw control/data plane, explain key components |
| 15-30 min | **Deep Dive** | Core component | Scheduler OR etcd OR Controller pattern |
| 30-40 min | **Scalability & Reliability** | HA, failure modes | Multi-master, static stability, disaster recovery |
| 40-45 min | **Wrap-up** | Security, observability | Quick touch on RBAC, metrics, monitoring |

### Phase Details

#### Phase 1: Requirements (0-5 min)

**Questions to ask:**

1. "What scale are we designing for? How many nodes and pods?"
2. "Is this a single-tenant or multi-tenant cluster?"
3. "What are the availability requirements for control plane vs workloads?"
4. "Any specific compliance requirements (SOC2, HIPAA)?"
5. "Is this on-premise, cloud, or hybrid?"

**Calibrate your design:**

| Scale | Design Focus |
|-------|--------------|
| Small (< 100 nodes) | Simplicity, single control plane OK |
| Medium (100-1,000 nodes) | HA control plane, basic scaling |
| Large (1,000-5,000 nodes) | Performance tuning, external etcd |
| Hyperscale (5,000+ nodes) | Cell architecture, custom scheduling |

#### Phase 2: High-Level Design (5-15 min)

**Must cover:**
1. Control plane vs data plane separation
2. Core components: API Server, etcd, Scheduler, Controller Manager, kubelet
3. Data flow: Pod creation sequence
4. Key architectural decisions: Declarative model, watch-based sync

**Whiteboard structure:**

```
┌─────────────────────────────────────────────────────┐
│                   Control Plane                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │   API   │  │  etcd   │  │Scheduler│  │  CM    │ │
│  │ Server  │  │         │  │         │  │        │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └───┬────┘ │
└───────┼────────────┼────────────┼───────────┼──────┘
        │            │            │           │
        ▼            ▼            ▼           ▼
┌─────────────────────────────────────────────────────┐
│                    Data Plane                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Node 1     │  │   Node 2     │  │  Node N   │ │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │┌────────┐ │ │
│  │ │ kubelet  │ │  │ │ kubelet  │ │  ││kubelet │ │ │
│  │ │ kube-prx │ │  │ │ kube-prx │ │  ││kube-prx│ │ │
│  │ │ [pods]   │ │  │ │ [pods]   │ │  ││[pods]  │ │ │
│  │ └──────────┘ │  │ └──────────┘ │  │└────────┘ │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
```

#### Phase 3: Deep Dive (15-30 min)

**Option A: Scheduler Deep Dive**
- Two-phase algorithm: filtering → scoring
- Plugin architecture
- Preemption logic
- Performance optimizations (parallelism, sampling)

**Option B: etcd Deep Dive**
- Raft consensus: leader election, log replication
- Watch mechanism: resourceVersion, bookmarks
- Performance: fsync latency, compaction
- Quorum requirements

**Option C: Controller Pattern**
- Reconciliation loop
- Work queue with rate limiting
- Optimistic concurrency
- Level-triggered vs edge-triggered

#### Phase 4: Scalability & Reliability (30-40 min)

**Must cover:**
1. HA topology: Stacked vs external etcd
2. Multi-zone distribution
3. Static stability concept
4. Failure scenarios: etcd quorum loss, API server outage
5. Autoscaling: HPA, VPA, Cluster Autoscaler

#### Phase 5: Wrap-up (40-45 min)

**Quick touch on:**
- Security: RBAC, Pod Security Admission, Network Policies
- Observability: Key metrics to monitor
- Upgrades: Rolling control plane updates

---

## Trade-off Discussions

### Centralized vs Distributed Scheduling

| Aspect | Centralized | Distributed |
|--------|-------------|-------------|
| **Placement quality** | Optimal (global view) | Suboptimal (local view) |
| **Scale** | ~5,000 nodes | 100,000+ nodes |
| **Latency** | Higher (single scheduler) | Lower (local decisions) |
| **Complexity** | Simpler | Complex coordination |

**When to choose:**
- Centralized: Default for most Kubernetes deployments
- Distributed: Google Borg/Omega scale, cell architecture

### Strong vs Eventual Consistency

| Aspect | Strong (etcd) | Eventual |
|--------|---------------|----------|
| **Use case** | Scheduling decisions | Endpoint propagation |
| **Availability** | Lower during partition | Higher |
| **Latency** | Higher (consensus) | Lower |

**Design insight:** Kubernetes uses strong consistency for control plane (etcd) but eventual consistency for data plane (endpoints, DNS).

### Watch vs Polling

| Aspect | Watch | Polling |
|--------|-------|---------|
| **Latency** | Real-time | Periodic delay |
| **Bandwidth** | Efficient | Wasteful |
| **Complexity** | Connection management | Simple |
| **Failure handling** | Reconnection logic | Natural retry |

**Design insight:** Kubernetes uses watch with resourceVersion for efficient incremental updates.

---

## Trap Questions & Answers

### Q: "Why not just use a database instead of etcd?"

**Bad answer:** "etcd is optimized for this use case."

**Good answer:**
- etcd provides native watch support critical for controller pattern
- Kubernetes requires consistent ordering of events (resourceVersion)
- Raft consensus provides exactly the consistency model needed
- Alternatives like PostgreSQL need a custom watch layer
- Some distributions (K3s) do support SQLite/PostgreSQL via Kine adapter

### Q: "What happens if etcd fails?"

**Bad answer:** "The cluster goes down."

**Good answer:**
- **Single node failure:** If minority, cluster continues (quorum maintained)
- **Quorum loss:** Control plane unavailable, cannot process mutations
- **Static stability:** Data plane continues! Running pods keep running
- **Recovery:** Restore from backup, or rebuild cluster
- **Prevention:** 3-5 node cluster across availability zones

### Q: "How would you handle 100,000 nodes?"

**Bad answer:** "Just add more etcd nodes and API servers."

**Good answer:**
- Standard Kubernetes scales to ~5,000 nodes
- For hyperscale, consider:
  1. **Cell architecture:** Multiple independent clusters (1,000-5,000 each)
  2. **Global scheduler:** Federate across cells (Karmada, Admiralty)
  3. **Custom storage:** Replace etcd (Google uses Spanner internally)
  4. **Scheduler optimization:** Gang scheduling, custom scoring
- Reference: Google GKE supports 65,000 nodes with custom control plane

### Q: "Why is the scheduler centralized? Isn't that a bottleneck?"

**Good answer:**
- Centralized provides global view for optimal placement
- Sufficient for tested scale (~5,000 nodes, 100+ pods/sec)
- Bottleneck mitigations:
  1. Parallelized scoring
  2. Node sampling
  3. Equivalence classes (cache for similar pods)
- For higher scale: Multiple schedulers with affinity, or cell architecture
- Borg used distributed scheduling; Omega used optimistic concurrency

### Q: "How do you prevent pod scheduling conflicts?"

**Good answer:**
- Single active scheduler via leader election
- If custom schedulers: Use pod affinity to partition workloads
- Optimistic concurrency: resourceVersion on bind
- Preemption: Scheduler coordinates victim selection
- Admission control: Final validation before etcd write

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Correct Approach |
|---------|----------------|------------------|
| Treating control plane as single component | Components have different HA models | Explain each component's failure mode |
| Ignoring static stability | Data plane resilience is key feature | Emphasize pods continue running |
| Over-complicating etcd | 3-5 nodes is sufficient | Don't propose exotic consensus mechanisms |
| Forgetting watch mechanism | Core to controller pattern | Explain resourceVersion and informers |
| Ignoring multi-tenancy | Common in real deployments | Discuss namespaces, RBAC, quotas |
| Proposing synchronous scheduling | Would block API server | Explain async reconciliation |

---

## Quick Reference Card

### Key Numbers

| Metric | Value |
|--------|-------|
| Nodes per cluster (tested) | 5,000 |
| Pods per cluster (tested) | 150,000 |
| Pods per node (default) | 110 |
| API latency SLO (mutating) | p99 < 1s |
| Pod startup latency SLO | p99 < 5s |
| etcd quorum (3 nodes) | 2 |
| etcd quorum (5 nodes) | 3 |
| Node heartbeat interval | 10s (lease) |
| Node not ready timeout | 40s |
| Pod eviction timeout | 5 min |

### Component Responsibilities

| Component | One-Line Summary |
|-----------|------------------|
| **API Server** | RESTful gateway with admission control |
| **etcd** | Raft-based consistent state store |
| **Scheduler** | Filter → Score → Bind pods to nodes |
| **Controller Manager** | Reconciliation loops for desired state |
| **kubelet** | Node agent, pod lifecycle management |
| **kube-proxy** | Service routing via iptables/IPVS |

### Key Algorithms

| Algorithm | Where Used |
|-----------|------------|
| **Raft consensus** | etcd leader election, replication |
| **Two-phase scheduling** | Scheduler filtering and scoring |
| **Reconciliation loop** | All controllers |
| **Optimistic concurrency** | resourceVersion conflict detection |
| **Leader election** | Scheduler, Controller Manager (lease-based) |

### Failure Modes Cheat Sheet

| Failure | Impact | Recovery |
|---------|--------|----------|
| API server down | No new operations | LB routes to healthy replica |
| etcd leader fails | Brief unavailability | New leader elected (~1s) |
| etcd quorum lost | Control plane down | Restore from backup |
| Scheduler down | Pods stuck pending | Leader election failover |
| Node fails | Pods evicted after 5 min | Rescheduled to healthy nodes |

---

## Suggested Follow-up Questions to Ask Interviewer

1. "Should I dive deeper into the scheduling algorithm or the controller reconciliation pattern?"
2. "Are there specific failure scenarios you'd like me to walk through?"
3. "Should I discuss how this integrates with a service mesh for advanced traffic management?"
4. "Would you like me to cover the security model in more detail?"
5. "Should I explain how custom resources and operators extend this system?"

---

## Sample Interview Dialogue

**Interviewer:** "Design a container orchestration system like Kubernetes."

**You:** "Before I dive in, let me clarify a few requirements. What scale should I design for - small startup clusters or hyperscale like a cloud provider?"

**Interviewer:** "Let's say a large enterprise, thousands of nodes."

**You:** "Great. And should I assume multi-tenant with different teams sharing the cluster?"

**Interviewer:** "Yes, that's a common scenario."

**You:** "Perfect. Let me start by sketching the high-level architecture. I'll separate this into control plane and data plane..."

*[Draw architecture, explain components]*

**You:** "The key insight is the declarative model with eventual consistency. Users specify desired state, controllers continuously reconcile actual state to match. This enables self-healing without manual intervention."

**Interviewer:** "How does scheduling work?"

**You:** "The scheduler uses a two-phase algorithm. First, filtering eliminates nodes that can't run the pod - checking resources, taints, affinity. Then, scoring ranks the remaining nodes based on factors like balanced utilization and image locality. Let me walk through the pseudocode..."

*[Explain algorithm]*

**Interviewer:** "What if the scheduler goes down?"

**You:** "The scheduler runs as multiple replicas with only one active via leader election using etcd leases. If the leader dies, a standby acquires the lease within about 15 seconds. During that window, new pods queue up in Pending state but existing workloads are unaffected - that's the static stability property."

**Interviewer:** "How would you scale this to 100,000 nodes?"

**You:** "Standard Kubernetes is tested to 5,000 nodes. For hyperscale, I'd recommend a cell architecture - multiple independent clusters of 1,000-5,000 nodes each, with a global scheduling layer above. Google internally uses a different storage backend than etcd for this scale. We could also optimize the scheduler with better parallelism and node sampling."
