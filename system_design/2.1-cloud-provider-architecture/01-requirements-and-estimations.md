# Requirements and Estimations

[← Back to Index](./00-index.md)

---

## Overview

This document defines the functional and non-functional requirements for a cloud provider architecture, along with capacity estimations and SLO definitions. The requirements are based on patterns observed in major cloud platforms.

---

## Functional Requirements

### FR1: Geographic Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR1.1 | Support multiple geographic regions (30+) | P0 |
| FR1.2 | Support multiple availability zones per region (3-6) | P0 |
| FR1.3 | Support cells within availability zones for blast radius control | P0 |
| FR1.4 | Support edge locations for low-latency access | P1 |
| FR1.5 | Support local zones near population centers | P2 |

### FR2: Control Plane Operations

| ID | Requirement | Priority |
|----|-------------|----------|
| FR2.1 | Create, Read, Update, Delete resources via API | P0 |
| FR2.2 | List and filter resources with pagination | P0 |
| FR2.3 | Tag resources with user-defined metadata | P0 |
| FR2.4 | Support asynchronous resource provisioning with status tracking | P0 |
| FR2.5 | Provide resource quotas and limits per tenant | P0 |
| FR2.6 | Support resource dependencies and ordering | P1 |
| FR2.7 | Enable infrastructure-as-code through declarative APIs | P1 |

### FR3: Data Plane Operations

| ID | Requirement | Priority |
|----|-------------|----------|
| FR3.1 | Execute compute workloads (VMs, containers) | P0 |
| FR3.2 | Provide network connectivity between resources | P0 |
| FR3.3 | Deliver storage I/O operations | P0 |
| FR3.4 | Forward load balancer traffic | P0 |
| FR3.5 | Resolve DNS queries | P0 |
| FR3.6 | Continue operations when control plane is impaired (static stability) | P0 |

### FR4: Resource Scheduling

| ID | Requirement | Priority |
|----|-------------|----------|
| FR4.1 | Place resources based on availability, capacity, and constraints | P0 |
| FR4.2 | Support placement constraints (zone, cell, rack diversity) | P0 |
| FR4.3 | Honor resource affinity and anti-affinity rules | P1 |
| FR4.4 | Support spot/preemptible instance scheduling | P1 |
| FR4.5 | Enable resource reservation (capacity reservations) | P1 |
| FR4.6 | Optimize bin packing for resource utilization | P1 |

### FR5: Multi-tenant Isolation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR5.1 | Isolate compute resources between tenants (no data leakage) | P0 |
| FR5.2 | Isolate network traffic between tenants | P0 |
| FR5.3 | Isolate storage between tenants | P0 |
| FR5.4 | Prevent noisy neighbor effects | P1 |
| FR5.5 | Support dedicated/isolated tenancy options | P1 |

### FR6: Identity and Access

| ID | Requirement | Priority |
|----|-------------|----------|
| FR6.1 | Authenticate API requests | P0 |
| FR6.2 | Authorize operations based on IAM policies | P0 |
| FR6.3 | Support service-to-service authentication | P0 |
| FR6.4 | Provide resource-level permissions | P0 |
| FR6.5 | Support cross-account resource access | P1 |

---

## Non-Functional Requirements

### NFR1: Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR1.1 | Data plane availability per region | 99.99% |
| NFR1.2 | Control plane availability per region | 99.9% |
| NFR1.3 | Global control plane availability | 99.9% |
| NFR1.4 | Single AZ availability | 99.95% |
| NFR1.5 | Multi-AZ deployment availability | 99.99% |

### NFR2: Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR2.1 | API response time (p50) | < 100ms |
| NFR2.2 | API response time (p99) | < 500ms |
| NFR2.3 | VM provisioning time (p50) | < 60s |
| NFR2.4 | VM provisioning time (p95) | < 120s |
| NFR2.5 | Network packet latency (intra-AZ) | < 1ms |
| NFR2.6 | Network packet latency (cross-AZ, same region) | < 2ms |
| NFR2.7 | Storage I/O latency (block storage, p99) | < 10ms |

### NFR3: Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR3.1 | Regions supported | 30+ |
| NFR3.2 | VMs running concurrently (global) | 10M+ |
| NFR3.3 | API requests per second (global) | 500K+ |
| NFR3.4 | Tenants (accounts) | Millions |
| NFR3.5 | Resources per tenant | 100K+ |
| NFR3.6 | Hosts per cell | 10K-50K |
| NFR3.7 | VMs per host | 10-100 |

### NFR4: Durability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR4.1 | Control plane metadata durability | 99.999999% |
| NFR4.2 | Block storage durability | 99.999% annual |
| NFR4.3 | Object storage durability | 99.999999999% |

### NFR5: Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR5.1 | Encryption at rest for all data | Required |
| NFR5.2 | Encryption in transit (TLS 1.2+) | Required |
| NFR5.3 | Hardware-level isolation for compute | Required |
| NFR5.4 | Zero trust network model | Required |
| NFR5.5 | Compliance certifications | SOC 2, ISO 27001, PCI DSS, HIPAA |

---

## CAP Theorem Analysis

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CAP THEOREM POSITIONING                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Control Plane: CP (Consistency + Partition Tolerance)                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ • Prioritizes consistency for resource state                      │  │
│  │ • Uses strongly consistent metadata stores                        │  │
│  │ • Accepts higher latency during network partitions                │  │
│  │ • Prefers to reject requests rather than return stale data       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Data Plane: AP (Availability + Partition Tolerance)                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ • Prioritizes availability for runtime operations                 │  │
│  │ • Uses cached/replicated configuration                            │  │
│  │ • Continues operating with potentially stale config               │  │
│  │ • Prefers to serve traffic rather than reject requests           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Why This Split?                                                         │
│  • Control plane operations (create VM) can be retried                  │
│  • Data plane operations (VM running, packets forwarding) cannot fail   │
│  • Users tolerate "cannot create" better than "system down"             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Capacity Estimations

### Infrastructure Scale

```
┌─────────────────────────────────────────────────────────────────────────┐
│ GLOBAL INFRASTRUCTURE SCALE                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Regions:                    33                                          │
│  Availability Zones:         100+ (avg 3 per region)                    │
│  Cells per AZ:               20+ (varies by AZ size)                    │
│  Total Cells:                2,000+                                      │
│                                                                          │
│  Hosts per Cell:             30,000 (average)                           │
│  Total Hosts:                60,000,000                                  │
│                                                                          │
│  VMs per Host:               20 (average, varies by instance type)      │
│  Total VM Capacity:          1.2 billion VM slots                       │
│  Actual VMs Running:         10+ million (typical utilization)          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### API Traffic Estimation

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CONTROL PLANE API TRAFFIC                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Assumptions:                                                            │
│  • 1 million active tenants                                             │
│  • Each tenant makes 100 API calls/hour average                         │
│  • Peak is 5x average                                                    │
│                                                                          │
│  Calculations:                                                           │
│                                                                          │
│  Average API calls:                                                      │
│    1,000,000 tenants × 100 calls/hour = 100,000,000 calls/hour          │
│    = 27,777 calls/second (average)                                       │
│                                                                          │
│  Peak API calls:                                                         │
│    27,777 × 5 = 138,885 calls/second (peak)                             │
│                                                                          │
│  Per-region (assuming 33 regions, uneven distribution):                  │
│    Largest region: ~20% of traffic = 27,777 calls/second                │
│    Design target per region: 50,000 calls/second                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Metadata Storage Estimation

```
┌─────────────────────────────────────────────────────────────────────────┐
│ METADATA STORAGE REQUIREMENTS                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Resources per tenant:         10,000 (average)                         │
│  Tenants:                      1,000,000                                 │
│  Total resources:              10,000,000,000 (10 billion)              │
│                                                                          │
│  Resource record size:         10 KB (average, including history)       │
│  Total metadata size:          100 TB                                   │
│                                                                          │
│  Events/audit logs per resource: 1000/year                              │
│  Event size:                   1 KB                                      │
│  Annual event storage:         10 PB                                    │
│                                                                          │
│  Per-region metadata:          3-5 TB (varies by region size)           │
│  Replication factor:           3                                         │
│  Per-region storage needed:    10-15 TB                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Network Traffic Estimation

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DATA PLANE NETWORK TRAFFIC                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  VMs running:                  10,000,000                                │
│  Average bandwidth per VM:     100 Mbps                                  │
│  Total bandwidth capacity:     1,000 Tbps (1 Exabit/s)                  │
│                                                                          │
│  Cross-AZ traffic:             20% of total                              │
│  Cross-region traffic:         5% of total                               │
│  Internet egress:              10% of total                              │
│                                                                          │
│  Packets per second (global):  Trillions                                │
│  Flow table entries (per SDN controller): Millions                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Resource Provisioning Rate

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PROVISIONING THROUGHPUT                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  VM provisioning rate (global peak):                                     │
│    100,000 VMs/minute = 1,666 VMs/second                                │
│                                                                          │
│  Per-cell provisioning:                                                  │
│    With 2,000 cells: 50 VMs/minute/cell average                         │
│    Peak per cell: 500 VMs/minute                                        │
│                                                                          │
│  Placement decisions:                                                    │
│    Each VM requires placement decision                                   │
│    Must complete in < 1 second                                          │
│    Bin-packing across 30,000 hosts per cell                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## SLO Definitions

### Availability SLOs

| Service | SLO | Error Budget (Monthly) |
|---------|-----|------------------------|
| Compute Data Plane (VM uptime) | 99.99% | 4.3 minutes |
| Compute Control Plane (API) | 99.9% | 43.8 minutes |
| Network Data Plane (packet delivery) | 99.99% | 4.3 minutes |
| Storage Data Plane (I/O operations) | 99.99% | 4.3 minutes |
| Load Balancer Data Plane | 99.99% | 4.3 minutes |
| DNS Data Plane | 100% (statically stable) | 0 minutes |
| DNS Control Plane | 99.9% | 43.8 minutes |

### Latency SLOs

| Operation | P50 | P95 | P99 |
|-----------|-----|-----|-----|
| API request (control plane) | 50ms | 200ms | 500ms |
| VM provisioning | 30s | 60s | 120s |
| Network packet (intra-AZ) | 0.2ms | 0.5ms | 1ms |
| Network packet (cross-AZ) | 0.5ms | 1ms | 2ms |
| Block storage I/O | 1ms | 5ms | 10ms |
| DNS resolution | 5ms | 20ms | 50ms |

### Durability SLOs

| Data Type | Durability | RPO |
|-----------|------------|-----|
| Resource metadata | 99.9999999% | 0 (synchronous) |
| Block storage | 99.999% | 0 (synchronous within AZ) |
| Object storage | 99.999999999% | Minutes (async replication) |
| Audit logs | 99.999% | Minutes |

---

## Constraints and Assumptions

### Constraints

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SYSTEM CONSTRAINTS                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Physical Constraints:                                                   │
│  • Speed of light limits cross-region latency (1ms per 100km)          │
│  • Power and cooling limits per data center                             │
│  • Physical security requirements                                        │
│  • Real estate availability for expansion                                │
│                                                                          │
│  Operational Constraints:                                                │
│  • Cell size limited by blast radius tolerance (10K-50K hosts)          │
│  • Single-threaded metadata operations for consistency                   │
│  • Deployment rate limited by canary validation time                    │
│  • On-call response time bounds recovery time                           │
│                                                                          │
│  Economic Constraints:                                                   │
│  • Hardware depreciation cycles (3-5 years)                             │
│  • Power cost optimization                                               │
│  • Network transit costs                                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Assumptions

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DESIGN ASSUMPTIONS                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Traffic Patterns:                                                       │
│  • 80% of traffic stays within a single region                          │
│  • Peak traffic is 5x average                                           │
│  • Diurnal patterns with regional peaks                                  │
│                                                                          │
│  Failure Modes:                                                          │
│  • AZ failures are independent (no correlated failures)                 │
│  • Cell failures affect < 50K hosts                                     │
│  • Network partitions are temporary (< 1 hour typically)                │
│                                                                          │
│  Growth Assumptions:                                                     │
│  • 30-50% YoY growth in resource count                                  │
│  • New regions added 2-3 per year                                       │
│  • New services added continuously                                       │
│                                                                          │
│  Tenant Behavior:                                                        │
│  • Power law distribution (few large, many small tenants)               │
│  • Largest tenant < 5% of any cell's capacity                           │
│  • Most resources are long-lived (days to months)                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Capacity Planning Model

### Cell Sizing Formula

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CELL CAPACITY PLANNING                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Cell Size Factors:                                                      │
│                                                                          │
│  MAX_CELL_SIZE = min(                                                    │
│      ACCEPTABLE_BLAST_RADIUS,           // 50,000 hosts typical         │
│      SCHEDULER_CAPACITY,                // Placement throughput limit   │
│      METADATA_STORE_LIMIT,              // Single-region DB capacity    │
│      OPERATIONAL_MANAGEABILITY          // Human factors                │
│  )                                                                       │
│                                                                          │
│  MIN_CELL_SIZE = max(                                                    │
│      EFFICIENT_BIN_PACKING_THRESHOLD,   // Need enough hosts for        │
│      REPLICATION_REQUIREMENTS,          // variety                      │
│      OPERATIONAL_OVERHEAD               // Fixed cost per cell          │
│  )                                                                       │
│                                                                          │
│  Typical Range: 10,000 - 50,000 hosts per cell                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Region Capacity Formula

```
┌─────────────────────────────────────────────────────────────────────────┐
│ REGION CAPACITY PLANNING                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Region Capacity = Σ(AZ Capacities)                                      │
│                                                                          │
│  AZ Capacity = Σ(Cell Capacities) × (1 - RESERVATION_HEADROOM)          │
│                                                                          │
│  RESERVATION_HEADROOM = 20% (for migrations, spikes, failures)          │
│                                                                          │
│  Example:                                                                │
│  • 3 AZs per region                                                      │
│  • 20 cells per AZ                                                       │
│  • 30,000 hosts per cell                                                 │
│  • 20 VMs per host average                                               │
│                                                                          │
│  Raw capacity = 3 × 20 × 30,000 × 20 = 36,000,000 VMs                   │
│  Usable capacity = 36M × 0.8 = 28,800,000 VMs                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Interview Estimation Practice

### Quick Mental Math

```
┌─────────────────────────────────────────────────────────────────────────┐
│ INTERVIEW ESTIMATION SHORTCUTS                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Major Cloud Provider Scale (order of magnitude):                        │
│  • Regions: ~30                                                          │
│  • AZs: ~100                                                             │
│  • Cells: ~2,000                                                         │
│  • Hosts: ~50 million                                                    │
│  • VMs: ~10 million active (1 billion capacity)                         │
│  • Tenants: ~1 million                                                   │
│                                                                          │
│  API Rates:                                                              │
│  • 1M tenants × 100 calls/hour = 30K calls/sec                          │
│  • Peak = 5× = 150K calls/sec global                                    │
│                                                                          │
│  Storage:                                                                │
│  • 10B resources × 10KB = 100 TB metadata                               │
│  • Per-region: 100TB / 30 = ~3TB (skewed, larger regions more)          │
│                                                                          │
│  Network:                                                                │
│  • 10M VMs × 100 Mbps = 1 Exabit/s capacity                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Aspect | Key Numbers |
|--------|-------------|
| **Regions** | 30+ globally |
| **Availability Zones** | 3-6 per region |
| **Cells** | 2,000+ globally, 10-50K hosts each |
| **Total Hosts** | 50+ million |
| **VM Capacity** | 1+ billion slots |
| **API Rate** | 100K+ requests/sec |
| **Data Plane Availability** | 99.99% |
| **Control Plane Availability** | 99.9% |
| **Provisioning Latency (p95)** | < 120 seconds |
| **Network Latency (intra-AZ)** | < 1ms |

---

[Next: High-Level Design →](./02-high-level-design.md)
