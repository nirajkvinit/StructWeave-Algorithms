# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture

### Control Plane vs Data Plane Overview

```mermaid
flowchart TB
    subgraph Users["Users & External Systems"]
        kubectl[kubectl CLI]
        CI[CI/CD Pipelines]
        UI[Dashboard/UI]
    end

    subgraph ControlPlane["Control Plane"]
        LB[Load Balancer]

        subgraph APIServers["API Server Pool"]
            API1[API Server 1]
            API2[API Server 2]
            API3[API Server 3]
        end

        subgraph etcdCluster["etcd Cluster"]
            ETCD1[(etcd 1<br/>Leader)]
            ETCD2[(etcd 2)]
            ETCD3[(etcd 3)]
        end

        subgraph Controllers["Controller Manager"]
            CM[Controller<br/>Manager]
            DC[Deployment<br/>Controller]
            RSC[ReplicaSet<br/>Controller]
            NC[Node<br/>Controller]
        end

        SCH[Scheduler]
        CCM[Cloud Controller<br/>Manager]
    end

    subgraph DataPlane["Data Plane (Worker Nodes)"]
        subgraph Node1["Node 1"]
            K1[kubelet]
            KP1[kube-proxy]
            CR1[Container Runtime]
            P1[Pod A]
            P2[Pod B]
        end

        subgraph Node2["Node 2"]
            K2[kubelet]
            KP2[kube-proxy]
            CR2[Container Runtime]
            P3[Pod C]
            P4[Pod D]
        end

        subgraph NodeN["Node N"]
            KN[kubelet]
            KPN[kube-proxy]
            CRN[Container Runtime]
            PN1[Pod...]
        end
    end

    kubectl & CI & UI --> LB
    LB --> API1 & API2 & API3

    API1 & API2 & API3 <--> ETCD1 & ETCD2 & ETCD3
    ETCD1 <-.-> ETCD2 <-.-> ETCD3

    CM --> API1
    SCH --> API1
    CCM --> API1

    K1 & K2 & KN --> LB
    KP1 & KP2 & KPN --> LB
```

### Component Responsibilities

| Component | Layer | Responsibility |
|-----------|-------|---------------|
| **API Server** | Control | RESTful API gateway, authentication, authorization, admission control, watch notifications |
| **etcd** | Control | Persistent storage of all cluster state using Raft consensus |
| **Scheduler** | Control | Watch unscheduled pods, assign to nodes based on constraints and scoring |
| **Controller Manager** | Control | Run reconciliation loops for core resources (Deployment, ReplicaSet, Node, etc.) |
| **Cloud Controller Manager** | Control | Integrate with cloud provider APIs (load balancers, volumes, routes) |
| **kubelet** | Data | Node agent: pod lifecycle, container runtime, health checks, resource monitoring |
| **kube-proxy** | Data | Network proxy implementing Service abstraction via iptables/IPVS rules |
| **Container Runtime** | Data | Execute containers (containerd, CRI-O) via Container Runtime Interface (CRI) |

---

## Data Flow

### Pod Creation Flow

```mermaid
sequenceDiagram
    participant User as User/CI
    participant API as API Server
    participant ETCD as etcd
    participant SCH as Scheduler
    participant CM as Controller Manager
    participant KL as kubelet
    participant CR as Container Runtime

    User->>API: POST /apis/apps/v1/deployments
    API->>API: Authenticate & Authorize
    API->>API: Admission Control (Mutating)
    API->>API: Admission Control (Validating)
    API->>ETCD: Persist Deployment
    ETCD-->>API: Ack
    API-->>User: Deployment created

    Note over CM: Controller watches Deployments
    CM->>API: Watch Deployments
    API-->>CM: New Deployment event
    CM->>CM: Reconcile: Create ReplicaSet
    CM->>API: POST ReplicaSet
    API->>ETCD: Persist ReplicaSet

    Note over CM: ReplicaSet controller watches
    CM->>API: Watch ReplicaSets
    API-->>CM: New ReplicaSet event
    CM->>CM: Reconcile: Create Pods
    CM->>API: POST Pod (spec.nodeName = "")
    API->>ETCD: Persist Pod (Pending)

    Note over SCH: Scheduler watches unscheduled Pods
    SCH->>API: Watch Pods (nodeName="")
    API-->>SCH: Unscheduled Pod event
    SCH->>SCH: Filter nodes (predicates)
    SCH->>SCH: Score nodes (priorities)
    SCH->>SCH: Select best node
    SCH->>API: PATCH Pod (spec.nodeName = "node-1")
    API->>ETCD: Update Pod

    Note over KL: kubelet watches Pods for its node
    KL->>API: Watch Pods (nodeName="node-1")
    API-->>KL: Pod assigned to this node
    KL->>CR: Pull image (if needed)
    CR-->>KL: Image ready
    KL->>CR: Create container
    CR-->>KL: Container started
    KL->>API: PATCH Pod status (Running)
    API->>ETCD: Update Pod status
```

### Service Endpoint Update Flow

```mermaid
sequenceDiagram
    participant KL as kubelet
    participant API as API Server
    participant EC as Endpoints Controller
    participant KP as kube-proxy
    participant DNS as CoreDNS

    Note over KL: Pod becomes Ready
    KL->>API: PATCH Pod status (Ready: true)

    Note over EC: Endpoints controller watches Pods and Services
    EC->>API: Watch Pods, Services
    API-->>EC: Pod Ready event
    EC->>EC: Find matching Service (selector)
    EC->>API: PATCH EndpointSlice (add pod IP)

    Note over KP: kube-proxy watches EndpointSlices
    KP->>API: Watch EndpointSlices
    API-->>KP: Updated EndpointSlice
    KP->>KP: Update iptables/IPVS rules

    Note over DNS: CoreDNS watches Services
    DNS->>API: Watch Services, EndpointSlices
    API-->>DNS: Service update
    DNS->>DNS: Update DNS records
```

---

## Key Architectural Decisions

### 1. Declarative vs Imperative Configuration

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Declarative** | Self-healing, idempotent, GitOps-friendly, audit trail | Learning curve, verbose specs | **Chosen** |
| **Imperative** | Simple for one-off tasks, familiar to operators | Not reproducible, no self-healing, drift | Limited use |

**Rationale:** Declarative configuration enables continuous reconciliation. Users specify desired state; the system converges to it. Imperative commands (`kubectl run`) are syntactic sugar that creates declarative specs.

### 2. Centralized vs Distributed Scheduling

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Centralized** | Global view, optimal placement, simpler conflict resolution | Scalability limits, single component | **Kubernetes default** |
| **Distributed (cell-based)** | Better scale, lower latency, fault isolation | Complex coordination, suboptimal global placement | Borg/Omega pattern |

**Rationale:** Centralized scheduling works well up to ~5,000 nodes. For larger scale, consider cell architecture or custom scheduling frameworks.

### 3. Watch-based vs Polling Synchronization

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Watch (long-poll)** | Real-time updates, efficient bandwidth | Connection management, reconnection logic | **Chosen** |
| **Polling** | Simpler, stateless | High latency, wasted bandwidth | Not used |

**Rationale:** Watch mechanism uses HTTP/2 streaming with `resourceVersion` for efficient incremental updates. Shared informers reduce API server load by multiplexing watches.

### 4. etcd vs Other Storage Backends

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **etcd** | Proven, watch support, strong consistency, Kubernetes-native | Memory-bound, scale limits | **Default** |
| **PostgreSQL/CockroachDB** | Better scale, familiar, SQL queries | No native watch, custom watch layer needed | Emerging (K3s, Kine) |
| **Spanner** | Global scale, strong consistency | Proprietary (Google) | GKE internal |

**Rationale:** etcd is purpose-built for Kubernetes with native watch support. Alternatives require a watch adapter layer.

### 5. Container Network Interface (CNI) Choice

| Option | Model | Pros | Cons |
|--------|-------|------|------|
| **Overlay (Flannel, Calico VXLAN)** | Encapsulation | Works anywhere, no infrastructure changes | Overhead, MTU reduction |
| **Native routing (Calico BGP)** | Direct | Better performance, no encapsulation | Requires network infrastructure support |
| **Cloud-native (AWS VPC CNI)** | Pod IPs from VPC | Native performance, no overlay | Cloud-specific, IP exhaustion risk |
| **eBPF (Cilium)** | Kernel-level | High performance, advanced observability | Complexity, kernel version requirements |

**Recommendation:** Match CNI to infrastructure. Cloud-native for cloud, Cilium for advanced use cases.

---

## Architecture Pattern Checklist

- [x] **Sync vs Async:** Async reconciliation via controllers; sync for critical API operations
- [x] **Event-driven vs Request-response:** Event-driven controllers watching for changes
- [x] **Push vs Pull:** Pull model (watch long-poll), push-like experience
- [x] **Stateless vs Stateful:** Stateless control plane components, state externalized to etcd
- [x] **Read-heavy vs Write-heavy:** Read-heavy (watches, status queries); moderate writes
- [x] **Real-time vs Batch:** Real-time scheduling and reconciliation
- [x] **Leader election:** Scheduler and Controller Manager use lease-based leader election

---

## Deployment Topologies

### Single Control Plane (Development)

```mermaid
flowchart TB
    subgraph CP["Control Plane (Single Node)"]
        API[API Server]
        ETCD[(etcd)]
        SCH[Scheduler]
        CM[Controller Manager]
    end

    subgraph Workers["Worker Nodes"]
        W1[Worker 1]
        W2[Worker 2]
        W3[Worker 3]
    end

    API --- ETCD
    SCH --> API
    CM --> API
    W1 & W2 & W3 --> API
```

**Use:** Development, testing, small clusters
**Risk:** Single point of failure

### Stacked HA Control Plane

```mermaid
flowchart TB
    subgraph LB["Load Balancer"]
        HAProxy[HAProxy/Cloud LB]
    end

    subgraph CP1["Control Plane Node 1"]
        API1[API Server]
        ETCD1[(etcd)]
        SCH1[Scheduler]
        CM1[Controller Mgr]
    end

    subgraph CP2["Control Plane Node 2"]
        API2[API Server]
        ETCD2[(etcd)]
        SCH2[Scheduler]
        CM2[Controller Mgr]
    end

    subgraph CP3["Control Plane Node 3"]
        API3[API Server]
        ETCD3[(etcd)]
        SCH3[Scheduler]
        CM3[Controller Mgr]
    end

    HAProxy --> API1 & API2 & API3
    ETCD1 <-.-> ETCD2 <-.-> ETCD3

    Note1[etcd forms Raft cluster<br/>Scheduler/CM: only one active<br/>via leader election]
```

**Use:** Production clusters
**Pros:** Simple topology, easier to manage
**Cons:** etcd co-located risks, more resource usage per control plane node

### External etcd Cluster

```mermaid
flowchart TB
    subgraph LB["Load Balancer"]
        HAProxy[HAProxy/Cloud LB]
    end

    subgraph CPNodes["Control Plane Nodes"]
        CP1[API + Scheduler + CM]
        CP2[API + Scheduler + CM]
        CP3[API + Scheduler + CM]
    end

    subgraph etcdCluster["External etcd Cluster"]
        E1[(etcd 1)]
        E2[(etcd 2)]
        E3[(etcd 3)]
        E4[(etcd 4)]
        E5[(etcd 5)]
    end

    HAProxy --> CP1 & CP2 & CP3
    CP1 & CP2 & CP3 --> E1 & E2 & E3 & E4 & E5
    E1 <-.-> E2 <-.-> E3 <-.-> E4 <-.-> E5
```

**Use:** Large production clusters, managed Kubernetes
**Pros:** etcd scaled and managed independently, better resource isolation
**Cons:** More infrastructure, network latency between control plane and etcd

### Multi-Zone HA

```mermaid
flowchart TB
    subgraph Zone-A
        CP-A[Control Plane A]
        ETCD-A[(etcd A)]
        Workers-A[Workers A1, A2, ...]
    end

    subgraph Zone-B
        CP-B[Control Plane B]
        ETCD-B[(etcd B)]
        Workers-B[Workers B1, B2, ...]
    end

    subgraph Zone-C
        CP-C[Control Plane C]
        ETCD-C[(etcd C)]
        Workers-C[Workers C1, C2, ...]
    end

    GLB[Global Load Balancer] --> CP-A & CP-B & CP-C

    ETCD-A <-.-> ETCD-B <-.-> ETCD-C
```

**Use:** Regional resilience, zone failure tolerance
**Considerations:** etcd latency across zones, quorum requirements

---

## Integration Points

### Container Runtime Interface (CRI)

```
kubelet ←→ CRI ←→ Container Runtime
           ↓
    ┌──────┴──────┐
    ↓             ↓
containerd      CRI-O
    ↓             ↓
   runc          runc
```

### Container Network Interface (CNI)

```
Pod creation → kubelet → CNI plugin → Network configuration
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
               Calico/Cilium      AWS VPC CNI
                    ↓                   ↓
            Overlay/BGP routing   VPC ENI attachment
```

### Container Storage Interface (CSI)

```
PVC creation → Controller → CSI Driver → Storage Backend
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
               EBS CSI Driver         Ceph CSI Driver
                    ↓                       ↓
               AWS EBS API            Ceph RBD/CephFS
```

---

## Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **API Server down** | No new deployments, no kubectl access | Multi-replica with load balancer |
| **etcd quorum loss** | Control plane completely unavailable | 3-5 node cluster, multi-zone |
| **Scheduler down** | New pods stuck in Pending | Leader election, multiple replicas |
| **Controller Manager down** | No reconciliation, drift from desired state | Leader election, multiple replicas |
| **kubelet down** | Node's pods not managed, no health updates | Node controller marks NotReady, reschedules pods |
| **kube-proxy down** | Service routing broken on that node | DaemonSet ensures restart, Cilium alternative |
| **Network partition** | Split-brain, inconsistent state | etcd quorum prevents writes without majority |

**Static Stability:** Data plane continues running during control plane outage. kubelet uses cached pod specs, containers keep running, kube-proxy rules remain in place.
