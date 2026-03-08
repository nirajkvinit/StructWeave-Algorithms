# Interview Guide

## 1. Interview Pacing (45-min Format)

| Time | Phase | Focus | Key Actions |
|------|-------|-------|-------------|
| 0-5 min | **Clarify** | Scope the problem; ask smart questions | Establish scale, features, constraints |
| 5-15 min | **High-Level** | Architecture, components, data flow | Draw the upload/download/sync flows |
| 15-30 min | **Deep Dive** | Sync engine OR dedup + chunking | Show depth on 1-2 critical components |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failures, disaster recovery | Discuss what breaks at 100x scale |
| 40-45 min | **Wrap Up** | Summary, open questions, extensions | Show you can think beyond the prompt |

---

## 2. Meta-Commentary

### What Makes This System Unique

1. **Bidirectional sync is the core challenge**: Unlike most distributed systems (which have one-directional replication), file storage requires N-way sync across devices with offline support. This is fundamentally harder.

2. **Content-addressable storage changes everything**: Once you realize blocks are identified by their content hash, deduplication becomes natural, and the system shifts from "storing files" to "storing unique blocks + metadata that describes how to assemble them."

3. **Metadata is harder than blob storage**: At scale, the metadata layer (file trees, permissions, versions, sync cursors) is the bottleneck --- not the blob storage. Dropbox's Edgestore/Panda stack is more complex than Magic Pocket.

4. **The system has two very different write paths**: Small file edits (delta sync) vs large file uploads require completely different optimization strategies.

### Where to Spend Most Time

- **Sync engine** (three-tree model, conflict resolution): This is what separates a good answer from a great one
- **Chunking + dedup**: Explain why content-defined chunking beats fixed-size
- **Data model**: Show you understand the relationship between files, versions, blocks, and references

### How to Approach

1. Start with the **simple case**: single user, single device, upload/download
2. Add **multi-device sync**: introduce the sync engine
3. Add **sharing**: introduce permission model
4. Add **scale**: introduce sharding, caching, CDN
5. Add **reliability**: introduce erasure coding, failover

---

## 3. Questions to Ask the Interviewer

| Question | Why It Matters |
|----------|---------------|
| "What's the expected scale --- millions or billions of users?" | Determines sharding strategy and infrastructure choices |
| "What's the average file size? Mostly documents or media?" | Affects chunking size, dedup ratio, bandwidth planning |
| "Do we need real-time collaborative editing (like Google Docs)?" | OT/CRDT is a completely separate system --- clarify scope |
| "What are the latency requirements for sync?" | Determines push vs pull, WebSocket vs polling |
| "Is offline access required?" | Adds significant complexity (local-first, conflict resolution) |
| "What consistency model does the interviewer expect?" | Shapes the entire architecture |
| "Is this a consumer product or enterprise?" | Enterprise needs audit logging, admin controls, compliance |
| "Do we need end-to-end encryption?" | Impacts dedup strategy and search capability |

---

## 4. Trade-offs Discussion

### Trade-off 1: Fixed-Size vs Content-Defined Chunking

| | Fixed-Size Chunks (4 MB) | Content-Defined Chunks (FastCDC) |
|--|--------------------------|----------------------------------|
| **Pros** | Simple implementation; predictable block sizes; easy parallel processing | Shift-resistant boundaries; much better dedup ratio; handles insertions gracefully |
| **Cons** | Poor dedup on edits (boundary shift problem); wastes bandwidth on small changes | Variable block sizes complicate storage; more CPU for chunking |
| **Recommendation** | **Content-defined chunking** --- the dedup improvement (50-70% savings) far outweighs the computational cost, especially with FastCDC being 3-12x faster than Rabin |

### Trade-off 2: Conflict Resolution Strategy

| | Conflicted Copies (Dropbox) | Last-Write-Wins | Auto-Merge (CRDT) |
|--|----------------------------|-----------------|-------------------|
| **Pros** | No data loss; both versions preserved; simple to implement | Simplest; no user intervention needed | Automatic resolution; best UX for concurrent editing |
| **Cons** | Requires manual resolution; clutters file system | Silently loses one version; data loss risk | Complex to implement; only works for certain data types; high overhead |
| **Recommendation** | **Conflicted copies** for file storage (Dropbox approach) --- files are opaque binary blobs that can't be auto-merged. CRDTs are better suited for collaborative document editing (separate system) |

### Trade-off 3: Global vs Scoped Deduplication

| | Global Dedup (all users) | Scoped Dedup (per user/org) |
|--|--------------------------|----------------------------|
| **Pros** | Maximum storage savings; one copy of each unique block | No information leakage; simpler security model |
| **Cons** | Security risk (hash-based existence probing); complex GC | Higher storage cost; misses cross-user dedup opportunities |
| **Recommendation** | **Scoped dedup** (per-organization for enterprise, per-user for consumer) --- the security risk of cross-user dedup outweighs the storage savings for most use cases |

### Trade-off 4: Push vs Pull for Sync Notifications

| | Push (WebSocket/SSE) | Pull (Long-poll / Periodic polling) |
|--|---------------------|--------------------------------------|
| **Pros** | Instant notification; lower total requests | Simpler infrastructure; works through all proxies/firewalls |
| **Cons** | Stateful connections; harder to scale; firewall issues | Higher latency; wasted requests when no changes |
| **Recommendation** | **Long-poll as primary** with WebSocket upgrade where supported --- long-poll is more reliable across network environments while still achieving <5s sync latency. Dropbox uses this approach |

### Trade-off 5: Own Infrastructure vs Cloud Provider

| | Own Datacenters (Dropbox post-2016) | Cloud Provider (pre-2016 Dropbox) |
|--|-------------------------------------|-----------------------------------|
| **Pros** | $75M+ savings in 2 years; custom hardware optimization (SMR drives); full control | Faster to start; elastic scaling; no hardware management |
| **Cons** | High capex; ~18 month lead time for expansion; need hardware expertise | Higher unit cost at scale; less optimization potential; vendor lock-in |
| **Recommendation** | **Start on cloud**, migrate to own infrastructure at exabyte scale --- Dropbox's transition saved $75M but only made sense at their scale (3+ EB) |

---

## 5. Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just store the whole file on every change?" | Test understanding of delta sync and bandwidth optimization | "At scale, a 100 MB file with a 1 KB edit would waste 99.99% of bandwidth. Content-defined chunking + dedup means we only transfer the ~4 MB chunk that changed --- a 96% bandwidth savings." |
| "Why not use a simple SQL database for everything?" | Test understanding of polyglot persistence | "Metadata needs strong consistency (SQL fits), but blob storage needs different optimization: immutable blocks, erasure coding, tiered storage. Using SQL for petabytes of binary data would be prohibitively expensive and slow." |
| "What happens if SHA-256 produces a collision?" | Test security awareness and practical engineering | "SHA-256 collision probability is 2^-128 --- astronomically unlikely. But as defense-in-depth, we verify the hash on upload and could add a secondary hash or content comparison for critical operations. This is a theoretical concern, not a practical one at any realistic scale." |
| "Can't you just use rsync?" | Test knowledge of sync algorithms at scale | "Rsync works for 2-party sync but doesn't handle N-device scenarios, conflict resolution, or offline operation. Our sync engine needs a three-tree model (local, remote, last-synced) with causally ordered change propagation. Rsync also doesn't support content-defined chunking or dedup." |
| "What if the metadata database goes down?" | Test failure thinking and graceful degradation | "Cached metadata continues serving reads. Existing sync connections and block downloads continue. New file operations queue locally on clients (offline mode). Automated failover promotes a replica within 30 seconds. Worst case: 5-second RPO on metadata." |
| "How do you handle a user with 10 million files?" | Test understanding of hot spots and scaling limits | "That's a hot shard. We handle it with: (1) aggressive caching of the file tree, (2) pagination for directory listings, (3) incremental sync using cursors (never fetch full tree), (4) shard splitting if needed. The sync cursor model means we only ever exchange deltas, not full state." |
| "Why not use CRDTs for conflict resolution?" | Test depth on consistency models | "CRDTs are excellent for structured data (documents, counters, sets) but files are opaque binary blobs --- there's no semantic merge operation. A CRDT for a PDF would need to understand PDF structure. The practical solution is conflicted copies: preserve both versions and let the user decide." |

---

## 6. Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Do Instead |
|---------|---------------|-------------------|
| Ignoring the sync problem | Sync is the hardest part; upload/download is table stakes | Dedicate 40% of time to sync engine design |
| Using fixed-size chunks without discussion | Misses the boundary-shift problem entirely | Explain CDC and why it matters for dedup |
| Treating metadata as simple | At scale, metadata is harder than blob storage | Discuss sharding, caching, consistency for metadata |
| Not discussing offline mode | Offline access creates fundamental complexity | Show three-tree model and conflict resolution |
| "Just use S3 for storage" | Cloud agnostic; also doesn't explain the interesting parts | Design content-addressable block storage with erasure coding |
| Ignoring garbage collection | Blocks without references waste storage | Show ref_count mechanism with grace periods |
| Not calculating dedup savings | Missing a key insight of the system | Show how 3:1 dedup ratio reduces 1.25 EB to 420 PB |
| Skipping capacity estimation | Interviewer uses this to calibrate your engineering maturity | Show QPS, storage, bandwidth calculations |

---

## 7. Extension Topics (If Time Permits)

| Topic | Key Point |
|-------|-----------|
| **Streaming sync** | Files stream through servers between clients without waiting for full upload; 2x multi-client improvement |
| **LAN sync** | UDP broadcast peer discovery + direct HTTPS transfer; 100x faster than cloud roundtrip |
| **Smart sync / Virtual files** | Files appear in file explorer but don't consume local storage; downloaded on access |
| **Broccoli compression** | Dropbox's modified Brotli enabling multi-core compression; 30% bandwidth reduction |
| **SMR drives** | Shingled Magnetic Recording for cold storage; 20% more capacity than traditional HDD |
| **Cold metadata (Alki)** | LSM-tree on object storage; 5.5x cheaper per GB for infrequently accessed metadata |
| **AI-powered search** | Semantic search across file content using embeddings; natural language queries |
| **Post-quantum encryption** | Kyber 512 key exchange to protect against future quantum attacks |

---

## 8. Quick Reference Card

```
┌────────────────────────────────────────────────────────┐
│        CLOUD FILE STORAGE - QUICK REFERENCE             │
├────────────────────────────────────────────────────────┤
│                                                         │
│  CORE CHALLENGE: N-device bidirectional sync            │
│                                                         │
│  KEY INSIGHT: Content-addressable blocks + dedup        │
│  • Files → Chunks (FastCDC, ~4MB avg)                  │
│  • Chunks → SHA-256 hash (content address)             │
│  • Dedup: skip blocks already stored (3:1 ratio)       │
│  • Delta sync: transfer only changed chunks            │
│                                                         │
│  SYNC MODEL: Three-tree merge                           │
│  • Remote tree (server state)                           │
│  • Local tree (filesystem state)                        │
│  • Sync tree (last agreed state)                        │
│  • Diff remote-sync = server changes                    │
│  • Diff local-sync = local changes                      │
│  • Merge + detect conflicts                             │
│                                                         │
│  CONFLICT: Conflicted copies (preserve both)            │
│                                                         │
│  STORAGE:                                               │
│  • Erasure coding (6+3 Reed-Solomon)                    │
│  • 12 nines durability                                  │
│  • Tiered: hot (SSD) → warm (HDD) → cold (SMR/archive)│
│                                                         │
│  METADATA:                                              │
│  • Sharded SQL + consistent cache                       │
│  • Shard key: namespace_id                              │
│  • Trillions of entries, millions QPS                   │
│                                                         │
│  SCALE NUMBERS:                                         │
│  • 500M MAU, 100M DAU                                   │
│  • 290K peak QPS                                        │
│  • 1.25 EB logical → 630 PB physical (after dedup+EC)  │
│  • 5 trillion metadata entries                          │
│                                                         │
│  REAL-WORLD:                                            │
│  • Google Drive: 2B+ MAU, 5T+ files                    │
│  • Dropbox: 700M users, 3+ EB, 75B API calls/month    │
│  • Dropbox Nucleus: Sync engine rewritten in Rust      │
│  • Dropbox Magic Pocket: Custom blob store on SMR HDDs │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

## 9. Difficulty Calibration

| Level | Expected Depth |
|-------|---------------|
| **Junior** | Upload/download flow, basic chunking, simple metadata schema |
| **Mid-Level** | Delta sync, dedup, conflict resolution (conflicted copies), basic sharding |
| **Senior** | Three-tree sync model, content-defined chunking, erasure coding, metadata scaling, failure modes |
| **Staff+** | Streaming sync, cold metadata tiering, GC race conditions, cross-region consistency, cost optimization (own infra vs cloud) |
