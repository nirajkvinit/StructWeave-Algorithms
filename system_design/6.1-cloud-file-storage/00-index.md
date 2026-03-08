# Cloud File Storage System Design

## System Overview

A cloud file storage system (Google Drive, Dropbox, OneDrive) enables users to store, synchronize, and share files across multiple devices in real time. The system must handle block-level deduplication, delta synchronization, conflict resolution, and seamless offline-to-online transitions --- all while managing exabytes of data across globally distributed infrastructure. Google Drive serves over 2 billion MAU with 5+ trillion files; Dropbox manages 3+ exabytes across 700 million registered users processing 75 billion API calls per month.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Write-heavy during sync bursts; read-heavy for shared/collaborative files |
| **Latency Sensitivity** | High --- users expect sub-second sync notification, <200ms metadata operations |
| **Consistency Model** | Eventual consistency for file content; strong consistency for metadata |
| **Data Volume** | Exabyte-scale blob storage; petabyte-scale metadata |
| **Durability** | 11+ nines (99.9999999999%) for stored data |
| **Complexity Rating** | **Very High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data model, API design, sync algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Sync engine, deduplication, conflict resolution |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Encryption, access control, threat model |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |

---

## What Makes This System Unique

1. **The Sync Problem**: Bidirectional synchronization across N devices with offline support is fundamentally harder than unidirectional replication --- it requires conflict detection, resolution, and convergence guarantees
2. **Block-Level Deduplication**: Content-addressable storage with SHA-256 hashing enables order-of-magnitude storage savings but introduces complex garbage collection
3. **Delta Sync**: Transferring only changed bytes (not whole files) requires content-defined chunking algorithms like Rabin fingerprinting or FastCDC
4. **Metadata at Scale**: Dropbox's Edgestore serves millions of queries/second across trillions of entries with strong consistency --- metadata is often the harder scaling challenge
5. **Hybrid Infrastructure**: Dropbox migrated ~90% of data from cloud providers to own datacenters (saving $75M in two years) while keeping cloud for edge regions

---

## Key Technology References

| Component | Real-World Example |
|-----------|-------------------|
| Blob Storage | Dropbox Magic Pocket, Google Colossus |
| Metadata Store | Dropbox Edgestore/Panda (MySQL-backed), Google Spanner |
| Sync Engine | Dropbox Nucleus (Rust), Google Drive Differential Sync |
| Chunking | Rabin Fingerprinting, FastCDC |
| Compression | Dropbox Broccoli (modified Brotli) |
| Cold Storage | Dropbox Alki (LSM-tree on DynamoDB + Object Storage) |
| Conflict Resolution | Conflicted copies, vector clocks, last-write-wins |
| LAN Sync | UDP broadcast discovery, direct HTTPS peer-to-peer |

---

## Sources

- Dropbox Tech Blog --- Magic Pocket, Edgestore, Panda, Nucleus, Broccoli, Alki, SMR Storage
- Google Cloud Blog --- Colossus File System, Differential Sync
- Dropbox S-1 Filing --- Infrastructure cost savings
- FastCDC Paper (USENIX ATC'16)
- Industry statistics: SQ Magazine, Backlinko, ElectroIQ (2025-2026)
