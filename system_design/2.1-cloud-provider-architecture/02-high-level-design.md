# High-Level Design

[← Back to Index](./00-index.md) | [← Requirements](./01-requirements-and-estimations.md)

---

## Overview

This document presents the high-level architecture of a cloud provider platform, covering the global infrastructure layout, control plane and data plane separation, key component responsibilities, and the flow of resource operations.

---

## Global Architecture

```mermaid
flowchart TB
    subgraph Internet["Internet / Customers"]
        USER[Customer Applications]
        CONSOLE[Cloud Console]
        CLI[CLI / SDK]
    end

    subgraph GlobalLayer["Global Layer"]
        GEODNS[GeoDNS / Anycast]
        GSLB[Global Server Load Balancer]
        GLOBAL_CP[Global Control Plane<br/>Identity, Billing, Global Services]
    end

    subgraph Region1["Region A (Primary)"]
        subgraph RegCP1["Regional Control Plane"]
            API1[API Gateway]
            RM1[Resource Manager]
            META1[(Metadata Store)]
            SCHED1[Scheduler]
        end

        subgraph AZ1A["Availability Zone 1"]
            CELL1A[Cell A-1]
            CELL2A[Cell A-2]
        end

        subgraph AZ1B["Availability Zone 2"]
            CELL1B[Cell B-1]
            CELL2B[Cell B-2]
        end

        subgraph AZ1C["Availability Zone 3"]
            CELL1C[Cell C-1]
            CELL2C[Cell C-2]
        end
    end

    subgraph Region2["Region B (Secondary)"]
        subgraph RegCP2["Regional Control Plane"]
            API2[API Gateway]
            RM2[Resource Manager]
        end
        AZ2A["Availability Zone 1"]
        AZ2B["Availability Zone 2"]
    end

    USER --> GEODNS
    CONSOLE --> GEODNS
    CLI --> GEODNS

    GEODNS --> GSLB
    GSLB --> API1
    GSLB --> API2

    GLOBAL_CP <--> RegCP1
    GLOBAL_CP <--> RegCP2

    API1 --> RM1
    RM1 --> META1
    RM1 --> SCHED1
    SCHED1 --> CELL1A
    SCHED1 --> CELL2A
    SCHED1 --> CELL1B
```

---

## Infrastructure Hierarchy Detail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE HIERARCHY                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GLOBAL                                                                      │
│  ├── Global Control Plane                                                    │
│  │   ├── Identity & Access Management (IAM)                                 │
│  │   ├── Billing & Cost Management                                          │
│  │   ├── Global Service Catalog                                             │
│  │   └── Cross-Region Replication Coordination                              │
│  │                                                                           │
│  ├── GeoDNS / Global Load Balancing                                         │
│  │   ├── Anycast IP addresses                                               │
│  │   ├── Latency-based routing                                              │
│  │   └── Health-based failover                                              │
│  │                                                                           │
│  └── REGION (e.g., us-east-1)                                               │
│      ├── Regional Control Plane                                              │
│      │   ├── API Gateway (rate limiting, auth)                              │
│      │   ├── Resource Manager (CRUD orchestration)                          │
│      │   ├── Metadata Store (resource state)                                │
│      │   ├── Scheduler / Placement Service                                   │
│      │   └── Network Controller (SDN control plane)                         │
│      │                                                                       │
│      └── AVAILABILITY ZONE (e.g., us-east-1a)                               │
│          ├── Zone Controller                                                 │
│          ├── Storage Subsystem                                               │
│          │                                                                   │
│          └── CELL (e.g., cell-001)                                          │
│              ├── Cell Controller                                             │
│              ├── Local Placement Service                                     │
│              ├── Network Virtualization (SDN data plane)                    │
│              │                                                               │
│              └── RACK (e.g., rack-a01)                                      │
│                  ├── Top-of-Rack Switch                                      │
│                  │                                                           │
│                  └── HOST (physical server)                                  │
│                      ├── Hypervisor / Host Agent                            │
│                      ├── Network Agent                                       │
│                      └── VM Instances (tenant workloads)                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Control Plane vs Data Plane Architecture

```mermaid
flowchart TB
    subgraph ControlPlane["CONTROL PLANE"]
        direction TB
        CP_API[API Gateway]
        CP_RM[Resource Manager]
        CP_META[(Metadata Store)]
        CP_SCHED[Scheduler]
        CP_IAM[IAM Service]

        CP_API --> CP_RM
        CP_RM --> CP_META
        CP_RM --> CP_SCHED
        CP_RM --> CP_IAM
    end

    subgraph DataPlane["DATA PLANE"]
        direction TB
        DP_HOST[Hypervisor / Host Agent]
        DP_NET[Network Data Plane<br/>Packet Forwarding]
        DP_STOR[Storage Data Plane<br/>I/O Operations]
        DP_LB[Load Balancer<br/>Traffic Forwarding]
    end

    subgraph ConfigSync["Configuration Sync"]
        CACHE[Local Config Cache]
        SYNC[Async Config Push]
    end

    CP_SCHED -->|"Placement Decision<br/>(one-time)"| DP_HOST
    CP_META -->|"Config Replication<br/>(async)"| SYNC
    SYNC --> CACHE
    CACHE -->|"Cached Config<br/>(static stability)"| DP_NET
    CACHE --> DP_STOR
    CACHE --> DP_LB

    style ControlPlane fill:#e1f5fe
    style DataPlane fill:#e8f5e9
    style ConfigSync fill:#fff3e0
```

### Separation Principles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CONTROL PLANE vs DATA PLANE SEPARATION                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CONTROL PLANE                          DATA PLANE                           │
│  ─────────────────────────────────────  ─────────────────────────────────   │
│                                                                              │
│  Responsibilities:                      Responsibilities:                    │
│  • Create/Update/Delete resources       • Execute compute workloads          │
│  • Authenticate/Authorize requests      • Forward network packets            │
│  • Placement decisions                  • Serve storage I/O                  │
│  • Configuration management             • Route load balancer traffic        │
│  • Billing/Metering                     • Resolve DNS queries                │
│                                                                              │
│  Characteristics:                       Characteristics:                     │
│  • Strongly consistent                  • Eventually consistent config       │
│  • Can tolerate higher latency          • Low latency critical               │
│  • Lower availability OK (99.9%)        • High availability required (99.99%)│
│  • Stateful operations                  • Stateless (cached state)           │
│  • Centralized per region               • Distributed across all hosts       │
│                                                                              │
│  Failure Impact:                        Failure Impact:                      │
│  • Cannot create new resources          • Existing resources fail            │
│  • Cannot modify configuration          • Customer workloads impacted        │
│  • Users retry later                    • Immediate business impact          │
│                                                                              │
│  KEY INSIGHT: Data plane must operate WITHOUT control plane (static          │
│  stability). All configuration is pre-pushed and cached locally.             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Layer | Responsibilities | Availability Target |
|-----------|-------|------------------|---------------------|
| **GeoDNS / GSLB** | Global | Route users to nearest region, failover | 100% (anycast) |
| **Global Control Plane** | Global | IAM, billing, cross-region coordination | 99.9% |
| **API Gateway** | Regional | Auth, rate limiting, request routing | 99.9% |
| **Resource Manager** | Regional | Orchestrate CRUD operations | 99.9% |
| **Metadata Store** | Regional | Store resource state, strongly consistent | 99.99% |
| **Scheduler** | Regional | Placement decisions, bin packing | 99.9% |
| **Cell Controller** | Cell | Manage hosts in cell, local placement | 99.9% |
| **Hypervisor** | Host | VM isolation, resource allocation | 99.99% |
| **SDN Controller** | Regional | Network policy, flow programming | 99.9% |
| **SDN Data Plane** | Host | Packet forwarding, encapsulation | 99.99% |
| **Storage Controller** | Zone | Volume management, replication | 99.9% |
| **Storage Data Plane** | Host | I/O operations, caching | 99.99% |

---

## Cell Architecture Detail

```mermaid
flowchart TB
    subgraph Cell["Cell (10K-50K hosts)"]
        CC[Cell Controller]

        subgraph Services["Cell Services"]
            PS[Placement Service]
            HC[Health Checker]
            MC[Metrics Collector]
            LC[Local Config Store]
        end

        subgraph Network["Network Layer"]
            SDN[SDN Data Plane]
            TOR1[ToR Switch Rack 1]
            TOR2[ToR Switch Rack 2]
            TOR3[ToR Switch Rack N]
        end

        subgraph Compute["Compute Layer"]
            subgraph Rack1["Rack 1"]
                H1[Host 1]
                H2[Host 2]
                H3[Host N]
            end
            subgraph Rack2["Rack 2"]
                H4[Host 1]
                H5[Host 2]
            end
        end

        CC --> PS
        CC --> HC
        CC --> MC
        CC --> LC

        PS --> TOR1
        PS --> TOR2
        PS --> TOR3

        TOR1 --> H1
        TOR1 --> H2
        TOR1 --> H3
        TOR2 --> H4
        TOR2 --> H5

        SDN --> TOR1
        SDN --> TOR2
        SDN --> TOR3
    end

    REG_CP[Regional Control Plane] --> CC
    REG_CP --> SDN
```

---

## Host Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HOST ARCHITECTURE                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Physical Server                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │ Security Chip / Hardware Root of Trust                        │   │    │
│  │  │ (Secure boot, key storage, attestation)                      │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  │                                                                      │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │ Hypervisor / VMM                                              │   │    │
│  │  │ ┌────────────────────────────────────────────────────────┐   │   │    │
│  │  │ │ • VM Lifecycle Management                               │   │   │    │
│  │  │ │ • Memory Isolation (hardware-enforced)                  │   │   │    │
│  │  │ │ • CPU Scheduling                                        │   │   │    │
│  │  │ │ • Device Emulation / Paravirtualization                 │   │   │    │
│  │  │ └────────────────────────────────────────────────────────┘   │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  │                                                                      │    │
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐    │    │
│  │  │ Network Card     │ │ Storage Card     │ │ Security Card    │    │    │
│  │  │ (Offload NIC)    │ │ (NVMe/SSD)       │ │ (Encryption)     │    │    │
│  │  │ • VXLAN/Geneve   │ │ • Local NVMe     │ │ • AES-256        │    │    │
│  │  │ • Flow tables    │ │ • Remote attach  │ │ • Key management │    │    │
│  │  │ • Rate limiting  │ │ • Snapshots      │ │ • Attestation    │    │    │
│  │  └──────────────────┘ └──────────────────┘ └──────────────────┘    │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ Guest VMs (Tenant Workloads)                                 │    │    │
│  │  │                                                              │    │    │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │    │    │
│  │  │  │ VM 1    │  │ VM 2    │  │ VM 3    │  │ VM N    │        │    │    │
│  │  │  │Tenant A │  │Tenant B │  │Tenant A │  │Tenant C │        │    │    │
│  │  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │    │    │
│  │  │                                                              │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Resource Creation Flow

```mermaid
sequenceDiagram
    participant User
    participant API as API Gateway
    participant RM as Resource Manager
    participant IAM as IAM Service
    participant Meta as Metadata Store
    participant Sched as Scheduler
    participant Cell as Cell Controller
    participant Host as Hypervisor

    User->>API: CreateInstance(spec)
    API->>IAM: Authenticate & Authorize
    IAM-->>API: Authorized

    API->>RM: CreateInstance(spec)
    RM->>Meta: Check Quota
    Meta-->>RM: Quota OK

    RM->>Meta: Create Resource (PENDING)
    Meta-->>RM: Resource ID

    RM->>Sched: FindPlacement(requirements)
    Note over Sched: Bin packing algorithm<br/>considers: capacity, constraints,<br/>affinity, spread

    Sched-->>RM: Placement: Cell-X, Host-Y

    RM->>Cell: ProvisionInstance(spec, host)
    Cell->>Host: StartVM(spec)

    Note over Host: Hypervisor allocates<br/>CPU, memory, network

    Host-->>Cell: VM Started
    Cell-->>RM: Provisioning Complete

    RM->>Meta: Update Resource (RUNNING)

    RM-->>API: Instance Created
    API-->>User: 200 OK + Instance Details
```

---

## Static Stability Flow

```mermaid
sequenceDiagram
    participant CP as Control Plane
    participant Cache as Config Cache
    participant DP as Data Plane<br/>(Network/Storage)
    participant VM as Running VMs

    Note over CP,VM: Normal Operation

    CP->>Cache: Push configuration updates
    Cache->>DP: Apply new config
    DP->>VM: Serve traffic normally

    Note over CP,VM: Control Plane Outage

    CP-xCache: Connection lost

    Note over Cache: Config cache has<br/>last known good state

    Cache->>DP: Continue with cached config
    DP->>VM: Traffic continues flowing

    Note over VM: VMs continue running<br/>Network continues working<br/>Storage I/O continues

    Note over CP,VM: What DOESN'T Work

    Note over CP: • Cannot create new VMs<br/>• Cannot modify network rules<br/>• Cannot attach new storage

    Note over VM: • Existing VMs unaffected<br/>• Existing network flows work<br/>• Existing storage accessible
```

---

## Network Architecture

```mermaid
flowchart TB
    subgraph Internet["Internet"]
        INET[Internet Gateway]
    end

    subgraph Region["Region"]
        subgraph GlobalNet["Global Network Services"]
            LB[Global Load Balancer]
            NAT[NAT Gateway]
            VPN[VPN Gateway]
        end

        subgraph VPC1["VPC (Tenant A)"]
            subgraph Pub1["Public Subnet"]
                ELB[Elastic Load Balancer]
                WEB[Web Tier VMs]
            end
            subgraph Priv1["Private Subnet"]
                APP[App Tier VMs]
                DB[Database VMs]
            end
        end

        subgraph VPC2["VPC (Tenant B)"]
            VM_B[Tenant B VMs]
        end

        subgraph Underlay["Physical Network (Underlay)"]
            SPINE[Spine Switches]
            LEAF[Leaf/ToR Switches]
        end

        subgraph Overlay["Virtual Network (Overlay)"]
            SDN[SDN Controller]
            ENCAP[VXLAN/Geneve Encapsulation]
        end
    end

    INET --> LB
    LB --> ELB
    ELB --> WEB
    WEB --> APP
    APP --> DB

    VPC1 -.->|"Isolated"| VPC2

    SDN --> ENCAP
    ENCAP --> SPINE
    SPINE --> LEAF
```

### Network Virtualization Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NETWORK VIRTUALIZATION STACK                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Layer 7 (Application)                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Application Load Balancer, API Gateway, WAF                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 4 (Transport)                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Network Load Balancer, NAT Gateway, Security Groups                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 3 (Network - Overlay)                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ VPC Routing, Subnet Routing, VPC Peering, Transit Gateway            │    │
│  │ Virtual IP addresses, VXLAN/Geneve encapsulation                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  SDN Control Plane                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Flow programming, Policy distribution, Route calculation             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 2/3 (Physical - Underlay)                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Spine-Leaf topology, BGP/ECMP, Physical switches                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 1 (Physical)                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Fiber optics, 100G/400G links, Cross-connects                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Storage Architecture

```mermaid
flowchart TB
    subgraph ControlPlane["Storage Control Plane"]
        SC[Storage Controller]
        SM[(Storage Metadata)]
        REP[Replication Manager]
    end

    subgraph DataPlane["Storage Data Plane"]
        subgraph AZ1["AZ 1"]
            SN1[Storage Node 1]
            SN2[Storage Node 2]
        end
        subgraph AZ2["AZ 2"]
            SN3[Storage Node 3]
            SN4[Storage Node 4]
        end
        subgraph AZ3["AZ 3"]
            SN5[Storage Node 5]
            SN6[Storage Node 6]
        end
    end

    subgraph Clients["Compute Hosts"]
        VM1[VM with EBS]
        VM2[VM with EBS]
    end

    SC --> SM
    SC --> REP
    REP --> SN1
    REP --> SN3
    REP --> SN5

    VM1 -->|"iSCSI/NVMe-oF"| SN1
    VM1 -.->|"Sync Replica"| SN3
    VM2 --> SN2
```

---

## Key Architectural Decisions

| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| **Control/Data Separation** | Unified vs Separated | Separated | Static stability, independent scaling |
| **Cell Size** | Small (10K) vs Large (100K) | 10K-50K | Balance blast radius vs efficiency |
| **Metadata Store** | Single global vs Regional | Regional with global sync | Latency, data residency |
| **Scheduler Location** | Global vs Regional vs Cell | Hierarchical (Regional + Cell) | Latency for placement decisions |
| **Network Isolation** | VLAN vs Overlay (VXLAN) | Overlay | Scale, flexibility, multi-tenancy |
| **Hypervisor Type** | Type-1 vs Type-2 vs Custom | Custom hardware-backed | Security, performance |
| **Storage Replication** | Sync vs Async | Sync within AZ, async cross-AZ | Durability vs latency trade-off |

---

## Data Flow Patterns

### Pattern 1: API Request (Control Plane)

```
User → GeoDNS → Regional API GW → Resource Manager → Metadata Store
                                                   → Scheduler
                                                   → Cell Controller
```

### Pattern 2: VM Network Traffic (Data Plane)

```
VM-A → Virtual NIC → VXLAN Encap → ToR Switch → Spine → ToR → VXLAN Decap → VM-B
```

### Pattern 3: Configuration Update

```
Control Plane → Metadata Store → Config Pusher → Cell Config Cache → Host Agent
```

### Pattern 4: Storage I/O

```
VM → Virtual Block Device → Host Storage Agent → Network → Storage Node (Primary)
                                                        → Storage Node (Replica)
```

---

## Failure Domain Isolation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FAILURE DOMAIN HIERARCHY                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Failure Domain        Blast Radius              Recovery Strategy           │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Host                  10-100 VMs                Auto-migrate to other hosts│
│                                                                              │
│  Rack                  400-1000 VMs              Spread groups avoid racks  │
│                                                                              │
│  Cell                  100K-500K VMs             Cell isolation, shuffle    │
│                                                   sharding limits impact     │
│                                                                              │
│  Availability Zone     Millions of VMs           Multi-AZ deployment        │
│                                                   required for HA            │
│                                                                              │
│  Region                All resources in region   Multi-region for DR         │
│                                                                              │
│  DESIGN PRINCIPLE: Every layer has independent failure boundaries.          │
│  Failures don't cascade up. Resources can survive failures at any           │
│  single layer if properly distributed.                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

The high-level architecture of a cloud provider platform is characterized by:

1. **Strict Control/Data Plane Separation**: Enables static stability where data plane continues operating during control plane outages

2. **Hierarchical Organization**: Global → Region → AZ → Cell → Rack → Host provides multiple levels of isolation and scaling

3. **Cell-Based Architecture**: Cells (10K-50K hosts) provide blast radius containment and independent operation

4. **Overlay Networking**: Virtual networks (VXLAN/Geneve) on top of physical infrastructure enable multi-tenancy

5. **Hardware-Backed Isolation**: Custom hypervisors and security chips provide tenant isolation at the hardware level

6. **Regional Control Planes**: Each region operates independently with its own metadata store and scheduler

---

[Next: Low-Level Design →](./03-low-level-design.md)
