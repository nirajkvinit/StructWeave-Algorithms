# Document Management System --- SharePoint/Box Architecture

## System Overview

A Document Management System (DMS) enables organizations to store, version, search, share, and govern documents across their entire lifecycle. Unlike simple cloud file storage, a DMS adds enterprise-critical capabilities: formal version control with check-in/check-out locking, rich metadata management, full-text search across binary formats (PDF, DOCX, XLSX), granular access control with ACL inheritance, workflow automation for approvals and reviews, and compliance features like legal hold and retention policies. SharePoint serves 200M+ monthly active users across 400K+ organizations; Box manages 150B+ pieces of enterprise content with 100K+ business customers.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Read-heavy (80/20): most documents are read/searched far more than edited |
| **Latency Sensitivity** | Moderate --- <500ms for search, <2s for document open, <5s for large file upload initiation |
| **Consistency Model** | Strong consistency for check-out locks and permissions; eventual consistency for search index |
| **Data Volume** | Petabyte to exabyte-scale content storage; terabyte-scale metadata and search indices |
| **Durability** | 11+ nines (99.999999999%) for stored documents |
| **Compliance** | Must support HIPAA, SOX, GDPR, ISO 27001, and eDiscovery |
| **Complexity Rating** | **Very High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, core services, data flows |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, versioning strategies, lock protocols, search index design |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Delta versioning, concurrent edits, large documents, OCR pipeline |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Sharding, geo-replication, caching, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | ACL inheritance, encryption, DLP, eDiscovery, regulatory compliance |
| [07 - Observability](./07-observability.md) | Metrics, alerting, audit log streaming, capacity planning |
| [08 - Interview Guide](./08-interview-guide.md) | 45-minute pacing, trap questions, trade-offs, whiteboard strategy |
| [09 - Insights](./09-insights.md) | Key architectural insights and design principles |

---

## What Makes This System Unique

1. **Document Lifecycle, Not Just Storage**: Unlike cloud file storage (Dropbox, Google Drive), a DMS governs the entire document lifecycle --- creation from templates, collaborative editing with formal check-out, approval workflows, retention, legal hold, and eventual disposition. Each phase has distinct consistency, security, and auditability requirements.

2. **Check-in/Check-out as Distributed Coordination**: The pessimistic locking model (check-out a document, edit, check-in a new version) is a distributed coordination problem with lock expiry, stale lock recovery, and conflict resolution. It must be ACID-compliant while remaining responsive across global offices.

3. **Search Across Binary Formats**: Full-text search must index content extracted from PDF, DOCX, XLSX, PPTX, scanned images (via OCR), and dozens of other formats. Each format requires a specialized extraction pipeline, and the search index must handle billions of documents with sub-second query latency.

4. **Metadata Explosion**: Every document carries system metadata (size, type, dates, creator), user-defined metadata (project codes, department tags, custom fields), and content-extracted metadata (OCR text, language, detected entities). Managing, indexing, and searching across all three categories at scale is a significant data modeling challenge.

5. **Compliance Drives Architecture**: Legal hold must make documents immutable --- even administrators cannot delete them. Retention policies must automatically dispose of documents after a period, but legal holds override retention. eDiscovery must search across held content and export it for legal review. These compliance requirements fundamentally shape the storage and deletion architecture.

6. **ACL Inheritance on Deep Hierarchies**: Folder-level permissions inherit down arbitrarily deep hierarchies, with explicit deny rules and break-inheritance points. Evaluating effective permissions for a document 10 levels deep requires efficient tree traversal and permission caching.

---

## Quick Reference

### Versioning Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| **Full Copy** | Store complete file for each version | Small files, simplest implementation |
| **Delta/Patch** | Store binary diff between consecutive versions | Large files with small changes (Office docs) |
| **Chunked Dedup** | Content-defined chunking with deduplication across versions | Large files, many similar versions |

### Lock Models

| Model | Description | Trade-off |
|-------|-------------|-----------|
| **Pessimistic (Exclusive Lock)** | User checks out document; others read-only until check-in | Prevents conflicts; blocks concurrent work |
| **Optimistic (Last-Write-Wins)** | No locks; conflicts detected at save time | Enables concurrent work; risks overwriting |
| **Hybrid** | Auto-lock on edit; timeout-based expiry; break-lock for admins | Balances both; most enterprise DMS use this |

### Search Architecture Options

| Approach | Index Freshness | Query Latency | Complexity |
|----------|----------------|---------------|------------|
| **Real-time Indexing** | Seconds | Low | High (write amplification) |
| **Near-real-time (NRT)** | 1-5 minutes | Low | Medium |
| **Batch Indexing** | Hours | Low | Low |
| **Hybrid (NRT + Batch)** | Minutes for metadata, hours for content | Low | Medium-High |

---

## Related Designs

| System | Relationship |
|--------|-------------|
| [6.1 Cloud File Storage](../6.1-cloud-file-storage/00-index.md) | DMS builds on file storage but adds versioning, compliance, and workflow |
| [6.8 Real-Time Collaborative Editor](../6.8-real-time-collaborative-editor/00-index.md) | Collaborative editing within documents; DMS manages the document lifecycle around it |

---

## Key Technology References

| Component | Real-World Approach |
|-----------|---------------------|
| Content Storage | Object storage with tiered lifecycle (hot/warm/cold) |
| Metadata Store | Relational database with JSON extension columns |
| Version Store | Delta-compressed chains with periodic full snapshots |
| Search Engine | Distributed inverted index with format-specific extractors |
| Workflow Engine | Distributed state machine with event-driven transitions |
| OCR Pipeline | Async workers with GPU acceleration for image-heavy workloads |
| Lock Manager | Distributed lock service with TTL and fencing tokens |
| Permission Cache | In-memory permission graph with invalidation on ACL changes |
| Thumbnail/Preview | Format-specific renderers with CDN-cached output |

---

## Sources

- Microsoft SharePoint Architecture Documentation --- Multi-tenant architecture, search federation
- Box Platform Architecture Blog --- Content lifecycle management, metadata cascade
- Alfresco Content Services --- Open-source DMS architecture patterns
- Apache Solr/Tika --- Content extraction and full-text indexing at scale
- OASIS CMIS Standard --- Content Management Interoperability Services
- Industry statistics: Gartner Content Services Magic Quadrant, Forrester Wave
