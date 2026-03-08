# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Clarify** | Scope the problem | Enterprise or consumer? Compliance requirements? Scale? |
| 5-10 min | **Requirements** | Core features, non-functionals | Versioning, check-in/check-out, search, ACL, workflows |
| 10-20 min | **High-Level Design** | Architecture, data flow | Content vs metadata separation, service decomposition, async processing |
| 20-35 min | **Deep Dive** | 1-2 critical components | Version control + locking, OR search across binary formats, OR ACL inheritance |
| 35-42 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios | Lock service availability, search indexing latency, permission evaluation |
| 42-45 min | **Wrap Up** | Summary, extensions | Legal hold, eDiscovery, OCR pipeline, geo-replication |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **It's file storage PLUS governance**: Unlike Dropbox or Google Drive, a DMS adds formal version control, compliance, workflows, and granular access control on top of file storage. The governance layer is architecturally as complex as the storage layer.

2. **Check-in/check-out is distributed coordination**: The pessimistic locking model requires a distributed lock service with strong consistency guarantees. Lock expiry, fencing tokens, and stale lock recovery are subtle distributed systems problems.

3. **Search across binary formats is an extraction problem**: Full-text search requires extracting text from PDFs, DOCX, XLSX, images (OCR), and dozens of other formats. Each format needs a specialized extractor, and the extraction pipeline must be async, fault-tolerant, and scalable.

4. **ACL inheritance on deep hierarchies is a tree problem**: Permission inheritance down folder hierarchies with break-inheritance points and explicit deny rules makes every permission check an O(d) operation (where d is depth). Caching is essential but invalidation is complex.

5. **Compliance drives architecture, not the other way around**: Legal hold immutability, retention policy enforcement, eDiscovery search, and audit trail requirements fundamentally shape the data model and deletion architecture. You cannot bolt compliance onto a system designed without it.

### Where to Spend Most Time

In the 45-minute interview, spend **60% of deep dive time on versioning + locking**. This is where the real system design thinking happens:

- How does check-out locking work in a distributed system?
- What prevents stale writes after lock expiry? (fencing tokens)
- How do you store versions efficiently? (delta compression)
- What happens when someone forgets to check in?

The secondary deep dive (if time permits) should be **search across binary formats** or **ACL inheritance**.

### How to Approach This Specific Problem

1. **Start with content vs metadata separation**: "Document content goes to object storage; metadata goes to a relational database." This single decision shapes the entire architecture.
2. **Establish the lock model**: "Pessimistic locking with TTL and fencing tokens for formal workflows."
3. **Draw the async processing pipeline**: Show how upload triggers thumbnail, OCR, and search indexing asynchronously.
4. **Show the folder hierarchy and permission model**: Demonstrate ACL inheritance with break-inheritance points.
5. **Discuss compliance as a first-class concern**: Legal hold, retention, audit trail.

---

## Trade-offs Discussion

### Trade-off 1: Full-Copy vs Delta Versioning

| Decision | Full-Copy | Delta/Patch (Recommended) |
|----------|-----------|---------------------------|
| | **Pros**: Simplest; instant access to any version; no reconstruction latency; no corruption chain risk | **Pros**: 80-95% storage savings; economically viable for 10PB+ scale |
| | **Cons**: Storage cost scales linearly with version count; prohibitive at scale | **Cons**: Reconstruction latency for old versions; delta chain corruption risk; more complex implementation |
| **Recommendation** | Use full-copy for small documents (<1MB); delta with periodic re-snapshots for larger documents |

### Trade-off 2: Pessimistic vs Optimistic Locking

| Decision | Pessimistic (Exclusive Lock) | Optimistic (Last-Write-Wins) |
|----------|------------------------------|------------------------------|
| | **Pros**: Prevents all conflicts; clear ownership; required for compliance workflows | **Pros**: No blocking; enables concurrent work; lower coordination overhead |
| | **Cons**: Blocks concurrent editing; risk of abandoned locks; requires lock service infrastructure | **Cons**: Conflicts detected at save time; user must resolve manually; risk of lost work |
| **Recommendation** | Pessimistic as default for enterprise DMS (compliance requirement); optimistic as configurable option for collaborative workspaces |

### Trade-off 3: SQL vs NoSQL for Metadata

| Decision | Relational DB (Recommended) | Document Store (NoSQL) |
|----------|----------------------------|------------------------|
| | **Pros**: ACID for lock operations; rich querying; enforced schema; mature tooling | **Pros**: Flexible schema for custom metadata; easier horizontal scaling |
| | **Cons**: Horizontal scaling requires careful sharding; schema migrations | **Cons**: No ACID transactions (critical for locks); eventual consistency |
| **Recommendation** | Relational DB for core metadata (locks, permissions, versions need ACID); JSON columns for flexible custom metadata within the relational model |

### Trade-off 4: Dedicated Search Engine vs DB Full-Text

| Decision | Dedicated Search (Recommended) | DB Full-Text Search |
|----------|-------------------------------|---------------------|
| | **Pros**: Purpose-built inverted index; faceted search; relevance ranking; horizontal scaling | **Pros**: Simpler architecture; no sync lag; always consistent |
| | **Cons**: Eventual consistency (sync lag); additional infrastructure; data duplication | **Cons**: Cannot scale to billions of documents; no format extraction; limited query language |
| **Recommendation** | Dedicated search cluster for any system beyond 10M documents; DB full-text as supplementary for small-scale or real-time-critical queries |

### Trade-off 5: Materialized Path vs Closure Table for Folder Hierarchy

| Decision | Materialized Path (Recommended) | Closure Table |
|----------|--------------------------------|---------------|
| | **Pros**: Efficient subtree queries (LIKE prefix); path directly useful for breadcrumbs and ACL; simple model | **Pros**: O(1) ancestor/descendant queries via join; flexible traversal |
| | **Cons**: Move operations require updating all descendants; path length grows with depth | **Cons**: O(k^2) storage for k nodes; move requires updating many pairs; complex joins |
| **Recommendation** | Materialized path for DMS because folder moves are infrequent, subtree queries are frequent, and the path string is directly useful for display and permission evaluation |

### Trade-off 6: Synchronous vs Async Content Indexing

| Decision | Synchronous Indexing | Async/NRT Indexing (Recommended) |
|----------|---------------------|----------------------------------|
| | **Pros**: Document immediately searchable after upload | **Pros**: Lower upload latency; batched indexing more efficient; decoupled failure domains |
| | **Cons**: Upload latency increases 200-500ms; index write failures block upload; tight coupling | **Cons**: 1-5 minute delay before document is searchable |
| **Recommendation** | Async/NRT with clear UX messaging ("Document will be searchable in a few minutes"). Metadata can be indexed near-synchronously (fast), while content extraction (slow) is always async. |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Pessimistic or optimistic locking for documents?" | Test understanding of distributed coordination trade-offs | "Pessimistic is the default for enterprise DMS because compliance requires preventing conflicting versions. But we support optimistic as a configurable option. The key challenge with pessimistic locking is abandoned locks --- we use TTL-based expiry and fencing tokens to prevent stale writes after lock recovery." |
| "How do you handle 10PB of documents?" | Test storage architecture thinking | "Content goes to object storage (designed for exabyte scale). We use delta versioning with periodic re-snapshots to reduce version storage by 80-95%. Storage tiering (hot/warm/cold) moves old documents to cheaper tiers. The metadata DB is much smaller (terabytes) and is sharded by tenant_id." |
| "How does search work across Office documents?" | Test understanding of content extraction | "Office documents (DOCX, XLSX, PPTX) are ZIP archives containing XML. We unzip and parse the XML to extract text. For scanned PDFs and images, we use an async OCR pipeline. All extracted text is indexed in a distributed search cluster with an inverted index. The extraction is async --- documents are uploadable immediately but searchable within minutes." |
| "What if the lock service goes down?" | Test availability thinking | "The lock service uses a consensus protocol (Raft) with 3 or 5 nodes. Single-node failure doesn't affect availability (majority quorum still exists). If we lose quorum, document editing is blocked but all other operations (read, search, download) continue. We can manually break locks on recovery." |
| "How do you handle permission checks at 500M/day?" | Test caching and performance | "We cache effective permissions in-memory with a 5-minute TTL. Cache is invalidated on ACL changes. For search results, we batch permission checks --- group documents by folder and evaluate folder-level permission once, then apply to all documents in that folder. Cache hit rate should be >90% for active documents." |
| "How does legal hold work with retention policies?" | Test compliance understanding | "Legal hold always overrides retention. A held document cannot be deleted or archived regardless of retention policy. We mark held documents as immutable in an append-only table. When the hold is released, retention policies resume. If the retention period has already passed, the retention sweeper will dispose of the document on its next run." |
| "Can you just use a database for everything?" | Test understanding of separation of concerns | "A single database would work at small scale, but at 1B+ documents: (1) Object storage is 10-50x cheaper than DB storage for multi-PB content; (2) DB full-text search can't handle billions of documents with binary format extraction; (3) The lock service needs sub-5ms latency that a general-purpose DB can't guarantee; (4) The audit log needs append-only semantics for compliance." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Storing document content in the database | Prohibitively expensive at PB scale; bloats DB; kills query performance | Separate content (object storage) from metadata (relational DB) |
| Using DB row locks for check-out | DB locks have wrong semantics (session-scoped, not user-scoped); no TTL | Dedicated lock service with TTL, fencing tokens, and admin break-lock |
| Ignoring compliance requirements | Compliance drives architecture (legal hold, retention, audit); can't bolt on later | Design legal hold immutability and audit trail from day one |
| Synchronous content extraction | PDF/OCR/Office extraction is slow (seconds); blocks upload response | Async pipeline via message queue; document available immediately, searchable within minutes |
| Flat permission model (no inheritance) | Enterprise folder hierarchies require permission inheritance; flat is unmanageable at scale | ACL inheritance with break-inheritance points and explicit deny |
| Single-node lock service | Single point of failure for all document editing | Consensus-based (Raft) lock service with 3-5 nodes |
| Ignoring version storage cost | 50 versions of a 5MB document = 250MB without optimization | Delta compression with periodic re-snapshots; 80-95% savings |
| Using database full-text search at scale | Can't handle binary format extraction; poor relevance ranking; doesn't scale | Dedicated search cluster with format-specific extractors |
| Treating folder hierarchy as simple parent-child | Recursive queries for subtrees and ancestors are slow | Materialized paths for efficient prefix queries |
| Forgetting fencing tokens for locks | Stale lock holders can overwrite data after lock expiry and re-acquisition | Fencing tokens: monotonically increasing counter validates lock ownership |

---

## Questions to Ask Interviewer

| Question | Why It Matters |
|----------|---------------|
| "Is this enterprise or consumer-focused?" | Enterprise requires compliance (legal hold, retention, audit trail); consumer prioritizes simplicity |
| "What compliance standards must we support?" | HIPAA/SOX/GDPR each drive specific architectural requirements |
| "Is formal check-in/check-out required?" | Drives lock service design; some systems only need optimistic locking |
| "What document formats must we support?" | Determines content extraction pipeline complexity |
| "Do we need workflow automation?" | Adds workflow engine, state machine, escalation logic |
| "What's the scale? Documents, users, tenants?" | Shapes sharding strategy, search architecture, storage tiering |
| "Is OCR for scanned documents required?" | Adds GPU-accelerated processing pipeline |
| "Multi-region or single region?" | Multi-region adds geo-replication complexity, especially for locks |
| "Is external sharing required?" | Adds tokenized links, password protection, access monitoring |

---

## Quick Reference Card

### The 5-Sentence Architecture Summary

1. **Document content** is stored in object storage (cheap, durable, scalable); **metadata** (properties, versions, permissions) lives in a sharded relational database with ACID guarantees.
2. **Version control** uses pessimistic locking with a distributed lock service (TTL + fencing tokens) for check-in/check-out, storing versions as delta-compressed chains with periodic full snapshots.
3. **Full-text search** is powered by a dedicated search cluster with format-specific content extractors (PDF, Office, OCR) indexing documents asynchronously within minutes of upload.
4. **Access control** uses folder-level ACL inheritance with explicit deny rules, evaluated via an in-memory permission cache (5-min TTL) that handles 500M+ daily permission checks.
5. **Compliance** is built into the architecture: legal holds create immutable markers that override retention policies, audit events form a tamper-evident hash chain, and eDiscovery enables searching and exporting held content.

### Key Numbers to Remember

| Metric | Value |
|--------|-------|
| Total documents | 1B+ |
| Total storage | 7.5+ PB |
| Daily active users | 10M |
| Search query latency (p99) | <500ms |
| Document open latency (p99) | <2s |
| Check-out lock acquisition | <500ms |
| Permission evaluation (p99) | <50ms |
| Search index freshness | 1-5 minutes |
| OCR processing per page | <60s |
| Delta versioning savings | 80-95% |
| Permission cache hit rate | >90% |
| Concurrent users (peak) | 100K |

### Whiteboard Diagram (Draw This)

```
[Clients] → [LB] → [API Gateway]
                         │
              ┌──────────┼──────────┐
              │          │          │
         [Doc Svc]  [Version Svc] [Search Svc]
              │          │          │
              │     [Lock Svc]     │
              │     (consensus)    │
              │          │         │
         [Object    [Metadata   [Search
          Storage]    DB]        Index]
                         │
                    [MQ] ────→ [OCR Workers]
                      │ ────→ [Thumbnail Workers]
                      │ ────→ [Audit Logger]
                      └ ────→ [Notification Svc]
```

---

## Deep Dive Preparation

### Deep Dive Option A: Versioning + Locking (Most Common)

**Time allocation**: 10-12 minutes

**Key points to cover**:
1. Draw the check-out → edit → check-in flow with fencing tokens
2. Explain delta compression: show full-copy vs delta storage savings
3. Discuss delta chain management: re-snapshot interval, chain length limits
4. Address lock failure scenarios: expiry, admin break, stale writes

**Talking points**:
- "The fencing token is a monotonically increasing counter. When a lock is broken and re-acquired, the new fencing token is higher. The old holder's check-in is rejected because their token is stale."
- "We re-snapshot every 10 versions to bound reconstruction latency. Without re-snapshots, accessing version 1 of a 100-version document would require downloading and applying 99 deltas."
- "For Office documents, we can do smarter delta compression by unpacking the ZIP archive and diffing individual XML files."

### Deep Dive Option B: Search Across Binary Formats

**Time allocation**: 10-12 minutes

**Key points to cover**:
1. Draw the content extraction pipeline (format detection → extractor → indexer)
2. Explain per-format extraction: Office XML parsing, PDF text extraction, OCR for scanned documents
3. Discuss index freshness vs query latency trade-off (NRT chosen)
4. Show post-query permission filtering for search results

**Talking points**:
- "Office documents are ZIP archives of XML files. A DOCX has a document.xml with all the text content. We parse that XML, not the binary ZIP."
- "For scanned PDFs, we first check if there's embedded text (text-based PDF). If the confidence is low or text is empty, we fall back to OCR. This avoids unnecessary OCR processing."
- "Search results are filtered by permissions after the query executes. We oversample (request 3x results) to account for documents the user can't see."

### Deep Dive Option C: ACL Inheritance and Permission Evaluation

**Time allocation**: 10-12 minutes

**Key points to cover**:
1. Draw a folder hierarchy with inherited, overridden, and broken-inheritance ACLs
2. Explain the evaluation algorithm: walk hierarchy, apply deny-overrides
3. Discuss permission cache: why it's needed (500M+ checks/day), TTL, invalidation
4. Show batch permission checking for search results

**Talking points**:
- "Explicit deny always overrides allow, regardless of where in the hierarchy it's set. This is essential for scenarios like 'Everyone can read Engineering, except interns.'"
- "Break-inheritance is a deliberate action that resets all inherited permissions. It's used for sensitive folders like Legal or HR where the parent's broad permissions shouldn't apply."
- "For search results, we batch permission checks by folder. If a user has READ on /Finance/, all documents in that folder are accessible without individual checks."

---

## "10x Scale: What Changes?"

**Current**: 1B documents, 50M users, 7.5 PB storage

**At 10x**: 10B documents, 500M users, 75 PB storage

| Component | What Changes |
|-----------|-------------|
| **Object Storage** | Move to multi-region, multi-provider strategy; negotiate exabyte-level contracts |
| **Metadata DB** | Re-shard from 4 to 40+ shards; consider distributed SQL (Spanner-like) |
| **Search Index** | Federated search across regional clusters; tiered index (hot for recent, cold for archive) |
| **Lock Service** | Regional lock services with global coordination for cross-region documents |
| **Permission Cache** | Distributed cache with pub/sub invalidation; pre-compute permissions for hot folders |
| **OCR Pipeline** | Dedicated GPU clusters per region; ML-based priority queue (important docs first) |
| **Audit Log** | Streaming pipeline instead of batch; separate store per tenant; federated query layer |
| **Storage Tiering** | Aggressive tiering: 70% cold, 20% warm, 10% hot; automated policy engine |
| **Architecture** | Cell-based architecture: each "cell" serves a subset of tenants independently |
