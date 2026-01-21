# Interview Guide

[← Back to Index](./00-index.md) | [← Observability](./07-observability.md)

---

## Overview

This guide provides a structured approach to discussing Cloud Provider Architecture in a 45-minute system design interview. This is an advanced topic typically asked at senior/staff level for infrastructure-focused roles.

---

## 45-Minute Interview Pacing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ INTERVIEW PACING GUIDE                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  0:00 - 0:05  REQUIREMENTS CLARIFICATION (5 min)                            │
│  ───────────────────────────────────────────────────────────────────────    │
│  • Clarify scope: "Are we designing the full cloud or specific component?" │
│  • Understand constraints: Scale, geographic regions, compliance           │
│  • Identify focus areas: Control plane, data plane, or both?               │
│                                                                              │
│  0:05 - 0:10  HIGH-LEVEL DESIGN (5 min)                                     │
│  ───────────────────────────────────────────────────────────────────────    │
│  • Draw infrastructure hierarchy (Region → AZ → Cell → Host)               │
│  • Explain control plane vs data plane separation                          │
│  • Identify key components (API Gateway, Scheduler, Hypervisor)            │
│                                                                              │
│  0:10 - 0:25  CORE DESIGN DEEP DIVE (15 min)                                │
│  ───────────────────────────────────────────────────────────────────────    │
│  • Cell-based architecture and blast radius                                │
│  • Static stability principle                                              │
│  • Resource scheduling (bin packing)                                        │
│  • Multi-tenant isolation                                                   │
│                                                                              │
│  0:25 - 0:35  SCALABILITY & RELIABILITY (10 min)                            │
│  ───────────────────────────────────────────────────────────────────────    │
│  • Scaling strategies for control and data plane                           │
│  • Failure scenarios and recovery                                           │
│  • Deployment safety (cell-by-cell rollout)                                │
│                                                                              │
│  0:35 - 0:42  ADVANCED TOPICS (7 min)                                       │
│  ───────────────────────────────────────────────────────────────────────    │
│  • Security and isolation                                                   │
│  • Network virtualization (SDN)                                             │
│  • Observability                                                            │
│                                                                              │
│  0:42 - 0:45  WRAP-UP & QUESTIONS (3 min)                                   │
│  ───────────────────────────────────────────────────────────────────────    │
│  • Summarize key design decisions                                           │
│  • Discuss trade-offs made                                                  │
│  • Address any remaining questions                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase-by-Phase Walkthrough

### Phase 1: Requirements Clarification

**Questions to Ask:**

1. "What's the scale we're designing for? A single region or global infrastructure?"
2. "Should I focus on the control plane (API, scheduling) or data plane (compute, network)?"
3. "Are there specific compliance requirements (government, regulated industries)?"
4. "What availability targets are we aiming for?"

**Key Requirements to Establish:**

| Aspect | Typical Answer |
|--------|----------------|
| Scale | 30+ regions, millions of VMs |
| Availability | 99.99% data plane, 99.9% control plane |
| Isolation | Complete tenant isolation required |
| Consistency | Strong for control plane, eventual for data plane |

### Phase 2: High-Level Design

**Draw This Diagram First:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ KEY DIAGRAM: Infrastructure Hierarchy                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GLOBAL                                                                      │
│  ├── GeoDNS / Global Load Balancer                                          │
│  └── REGION (us-east-1)                                                     │
│      ├── Regional Control Plane                                              │
│      │   ├── API Gateway                                                     │
│      │   ├── Resource Manager                                                │
│      │   ├── Metadata Store                                                  │
│      │   └── Scheduler                                                       │
│      │                                                                       │
│      └── AVAILABILITY ZONE (us-east-1a)                                     │
│          └── CELL (cell-042)    ← Blast radius boundary                     │
│              ├── Cell Controller                                             │
│              ├── Cell Scheduler                                              │
│              └── HOSTS (10K-50K)                                            │
│                  └── VMs (tenant workloads)                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Explain Control Plane vs Data Plane:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ KEY DIAGRAM: Control Plane vs Data Plane                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Control Plane (CRUD operations)     Data Plane (Runtime operations)        │
│  ┌────────────────────────────┐     ┌────────────────────────────┐         │
│  │ • Create/Delete VMs        │     │ • VM execution             │         │
│  │ • Configure networks       │     │ • Packet forwarding        │         │
│  │ • Manage storage           │     │ • Storage I/O              │         │
│  │ • 99.9% availability       │     │ • 99.99% availability      │         │
│  │ • Strong consistency       │     │ • Eventually consistent    │         │
│  └────────────────────────────┘     └────────────────────────────┘         │
│                                                                              │
│  KEY INSIGHT: Data plane continues when control plane is down              │
│  (Static Stability)                                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 3: Core Design Deep Dive

**Topic 1: Cell Architecture**

```
"We divide each AZ into cells of 10K-50K hosts. Why?

1. Blast Radius: Cell failure affects only that cell, not entire AZ
2. Independent Operation: Each cell has its own controller, scheduler
3. Deployment Safety: Roll out changes cell-by-cell
4. Shuffle Sharding: Spread each customer across multiple cells

If a cell fails, it impacts a bounded set of resources. Other cells
continue operating independently."
```

**Topic 2: Static Stability**

```
"Static stability means the data plane operates without real-time
dependencies on the control plane.

Example: DNS Service
- Control Plane: Create/modify DNS records (single region)
- Data Plane: Resolve DNS queries (globally distributed, cached)

During control plane outage:
✗ Cannot create new records
✓ All existing DNS queries continue to resolve

We achieve this by pre-pushing all configuration to data plane
caches with infinite TTL."
```

**Topic 3: Resource Scheduling**

```
"Scheduling uses hierarchical bin packing:

1. Global Scheduler: Selects which cell (based on constraints, capacity)
2. Cell Scheduler: Selects which host (bin packing algorithm)

For bin packing, we use Best Fit Decreasing with multiple dimensions:
- CPU, Memory, Storage, Network, GPU

We score hosts by how well the VM 'fits' - minimizing wasted resources
while respecting placement constraints (AZ, spread, affinity)."
```

### Phase 4: Scalability & Reliability

**Key Points to Cover:**

1. **Horizontal Scaling**
   - API Gateway: Add instances (stateless)
   - Metadata Store: Shard by (region, account_id)
   - Compute: Add cells (not larger cells)

2. **AZ Independence**
   - No synchronous cross-AZ dependencies
   - Each AZ can survive alone
   - N+1 capacity planning

3. **Deployment Safety**
   - One-box → Canary cell → Production waves → Global
   - Automatic rollback on metric degradation
   - Cell-by-cell to limit blast radius

### Phase 5: Advanced Topics

**Security (if asked):**
- Hardware isolation (custom hypervisor, offload cards)
- VPC isolation (VXLAN with unique VNI per tenant)
- Defense in depth (7 layers)

**Network Virtualization (if asked):**
- Overlay network (VXLAN/Geneve on physical underlay)
- SDN controller programs flow tables
- Static stability: flows continue without controller

---

## Key Diagrams to Draw

### Diagram 1: Resource Creation Flow

```
User → API Gateway → Resource Manager → Scheduler → Cell Controller → Host
                          ↓
                    Metadata Store
```

### Diagram 2: Static Stability

```
Control Plane ──(push config)──> Config Cache ──> Data Plane

When control plane down:
Data Plane uses cached config → Traffic continues flowing
```

### Diagram 3: Cell Architecture

```
AZ
├── Cell 1 (10K-50K hosts) ← Independent unit
├── Cell 2 (10K-50K hosts) ← Failure here doesn't affect Cell 1
└── Cell 3 (10K-50K hosts)
```

---

## Trade-offs Discussion

### Trade-off 1: Consistency Model

| Option | Pros | Cons | When to Choose |
|--------|------|------|----------------|
| **Strong Consistency (CP)** | Simpler reasoning, no stale reads | Higher latency, lower availability | Control plane operations |
| **Eventual Consistency (AP)** | Higher availability, lower latency | Stale reads possible | Data plane, read-heavy |

**Recommended:** CP for control plane, AP for data plane

### Trade-off 2: Cell Size

| Option | Pros | Cons | When to Choose |
|--------|------|------|----------------|
| **Small Cells (10K)** | Lower blast radius, faster recovery | More cells to manage, less efficient | Higher SLA requirements |
| **Large Cells (100K)** | Better resource utilization, fewer cells | Larger blast radius | Cost optimization priority |

**Recommended:** 10K-50K hosts, balance blast radius and efficiency

### Trade-off 3: Isolation Level

| Option | Pros | Cons | When to Choose |
|--------|------|------|----------------|
| **Hardware Isolation** | Maximum security | Higher cost, lower density | High-security workloads |
| **Software Isolation** | Better density, lower cost | Potential side-channels | Standard workloads |

**Recommended:** Hardware isolation for hypervisor, software for network/storage

### Trade-off 4: Oversubscription

| Option | Pros | Cons | When to Choose |
|--------|------|------|----------------|
| **No Oversubscription** | Guaranteed performance | Lower utilization, higher cost | Latency-sensitive workloads |
| **Moderate (2-3x)** | Better economics | Occasional noisy neighbor | General purpose |
| **High (5x+)** | Maximum efficiency | Performance variability | Batch/spot workloads |

---

## Trap Questions and Ideal Answers

### Q1: "Why not just use one big scheduler for the whole region?"

**Bad Answer:** "For simplicity"

**Good Answer:**
```
"A single scheduler creates multiple problems:

1. Blast Radius: Scheduler failure affects entire region
2. Scalability: Can't scale to millions of placement decisions
3. Latency: Network latency to distant hosts in large regions
4. Complexity: State management becomes unwieldy

Instead, we use hierarchical scheduling:
- Global scheduler: Picks the cell (lightweight decision)
- Cell scheduler: Picks the host (detailed bin packing)

Each cell scheduler only manages 10K-50K hosts, making the problem
tractable while containing failures."
```

### Q2: "What happens if the control plane goes down?"

**Bad Answer:** "Everything stops working"

**Good Answer:**
```
"This is where static stability becomes critical.

During control plane outage:
- Running VMs continue running (hypervisor is local)
- Network traffic continues flowing (rules cached locally)
- Storage I/O continues (data plane independent)
- DNS queries resolve (data cached at resolvers)

What DOESN'T work:
- Cannot launch new VMs
- Cannot modify configurations
- Cannot create new resources

This is acceptable because:
1. Control plane outages are rare and short
2. Running workloads are more important than new ones
3. Customers can retry creation when CP recovers"
```

### Q3: "How do you handle AZ failure?"

**Bad Answer:** "We restore from backup"

**Good Answer:**
```
"AZs are designed to be independent failure domains:

1. Physical independence: Separate buildings, power, cooling
2. Logical independence: No synchronous cross-AZ dependencies
3. Data independence: Replication is async by default

When an AZ fails:
1. Load balancers detect via health checks (seconds)
2. Traffic shifts to healthy AZs automatically
3. Auto-scaling can launch replacements in other AZs
4. Customer data is safe if they used multi-AZ deployment

For customers using single AZ: They experience outage but data
is preserved (storage is durable within AZ).

For multi-AZ customers: Automatic failover with minimal impact."
```

### Q4: "How do you prevent one tenant from affecting another?"

**Bad Answer:** "We use VMs"

**Good Answer:**
```
"Multi-tenant isolation happens at multiple layers:

1. Hardware: Custom hypervisor with dedicated offload cards
   - Network, storage, security processing offloaded
   - Minimal shared code paths

2. Hypervisor: Hardware-enforced memory isolation
   - VT-x/AMD-V for CPU isolation
   - Nested page tables for memory
   - < 100K lines of code (minimal attack surface)

3. Network: VPC isolation with unique VXLAN VNI per tenant
   - No cross-tenant traffic by default
   - Security groups enforce per-VM rules

4. Storage: Per-tenant encryption keys, logical isolation

5. Resource limits: CPU, memory, IOPS limits prevent noisy neighbor

For highest security: Confidential computing (AMD SEV, Intel TDX)
encrypts VM memory from hypervisor itself."
```

### Q5: "How do you deploy changes safely?"

**Bad Answer:** "We deploy to all servers at once"

**Good Answer:**
```
"Deployment uses progressive rollout with automatic rollback:

1. One-Box: Single host, synthetic traffic only
2. Canary Cell: One cell with real traffic (5%)
3. Production Waves: 10% → 25% → 50% → 100% of cells
4. Regional: Complete region before starting next
5. Global: 1-2 weeks for full rollout

Automatic rollback triggers:
- Error rate increases > 0.1%
- Latency p99 increases > 20%
- Any customer-reported issues

The key insight: Cell-based deployment limits blast radius.
If a bad deploy causes issues, it only affects one cell.
Rollback is fast (single cell) rather than global."
```

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Ignoring static stability | Creates brittle system | Design data plane to operate independently |
| Single global scheduler | Doesn't scale, huge blast radius | Hierarchical scheduling by cell |
| Synchronous cross-AZ calls | AZ failure cascades | Async replication, local caches |
| Deploying everywhere at once | Maximum blast radius | Cell-by-cell progressive rollout |
| Software-only isolation | Security concerns | Hardware-backed isolation for hypervisor |
| Ignoring noisy neighbor | Poor customer experience | Resource limits at every layer |
| No shuffle sharding | Correlated failures | Spread customers across cells |

---

## Quick Reference Card

### Key Numbers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ QUICK REFERENCE: KEY NUMBERS                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCALE:                                                                      │
│  • Regions: ~30                                                              │
│  • AZs per region: 3-6                                                       │
│  • Cells per AZ: 10-50                                                       │
│  • Hosts per cell: 10K-50K                                                   │
│  • VMs per host: 10-100                                                      │
│                                                                              │
│  AVAILABILITY:                                                               │
│  • Data plane: 99.99% (4.3 min/month downtime)                              │
│  • Control plane: 99.9% (43.8 min/month downtime)                           │
│  • Multi-AZ: 99.99%+                                                        │
│                                                                              │
│  LATENCY:                                                                    │
│  • API p99: < 500ms                                                          │
│  • VM launch p95: < 120s                                                     │
│  • Intra-AZ network: < 1ms                                                  │
│  • Cross-AZ network: < 2ms                                                  │
│                                                                              │
│  ISOLATION:                                                                  │
│  • Hardware (hypervisor level)                                              │
│  • Network (VXLAN per VPC)                                                  │
│  • Storage (per-tenant keys)                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Concepts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ QUICK REFERENCE: KEY CONCEPTS                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STATIC STABILITY:                                                           │
│  Data plane operates without control plane (cached config)                  │
│                                                                              │
│  CELL ARCHITECTURE:                                                          │
│  Fixed-size units (10K-50K hosts) for blast radius containment             │
│                                                                              │
│  SHUFFLE SHARDING:                                                           │
│  Spread each customer across random subset of cells                         │
│                                                                              │
│  CONTROL/DATA PLANE SPLIT:                                                   │
│  Control = CRUD (99.9%), Data = runtime (99.99%)                           │
│                                                                              │
│  BIN PACKING:                                                                │
│  Multi-dimensional (CPU, mem, storage) Best Fit algorithm                  │
│                                                                              │
│  OVERLAY NETWORK:                                                            │
│  Virtual network (VXLAN) on physical underlay                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

This is an advanced topic requiring understanding of:

1. **Infrastructure hierarchy** - Regions, AZs, Cells, Hosts
2. **Control/Data plane separation** - Different consistency and availability
3. **Static stability** - Data plane independence
4. **Cell architecture** - Blast radius containment
5. **Multi-tenant isolation** - Hardware, network, storage layers
6. **Deployment safety** - Progressive rollout with automatic rollback

Focus on trade-offs and the "why" behind architectural decisions rather than memorizing specific implementations.

---

[← Back to Index](./00-index.md)
