# Interview Guide: Enterprise Knowledge Management System

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Clarify** | Scope the problem | Wiki/KMS like Confluence? Scale? Which features: hierarchy, search, permissions, templates? |
| 5-15 min | **High-Level Design** | Architecture, data flow | Page service, permission engine, search cluster, block-based content model |
| 15-25 min | **Deep Dive** | 1-2 critical components | Hierarchy storage (closure table), permission inheritance, or search at scale |
| 25-35 min | **Scalability & Trade-offs** | Bottlenecks, failure scenarios | 500M pages, permission cache invalidation, search freshness, notification fan-out |
| 35-45 min | **Wrap-up & Follow-ups** | Summary, extensions | 10x scale discussion, AI features, compliance requirements |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **Page hierarchy is deceptively simple**: Storing a tree of pages is straightforward, but querying ancestors for permission inheritance, generating breadcrumbs, moving subtrees, and detecting cycles requires careful data structure selection (closure table vs materialized path vs adjacency list).

2. **Permission inheritance crosses every read path**: Unlike document editors where permissions are per-document, a KMS inherits permissions down a tree with overrides at any level. Every page load, every search result, and every API call must evaluate effective permissions---making the permission engine the most performance-critical component.

3. **Search is the primary navigation mechanism**: Users find pages through search, not by browsing the tree. This means search quality (freshness, relevance, recall) directly determines the product's usability, and the search pipeline must be treated as a first-class architectural concern.

4. **Read-to-write ratio shapes every decision**: At 10:1 or higher, the architecture must aggressively optimize for reads---CDN-served rendered pages, cached permission results, read replicas, pre-computed breadcrumbs---while accepting async propagation for writes.

5. **Block-based content model enables features that raw HTML cannot**: Version diffing at block granularity, collaborative cursors per block, structured search extraction, fine-grained permissions on sections, and API-first content access all depend on treating content as typed blocks rather than opaque markup.

### Where to Spend Most Time

In a 45-minute interview, spend **60% of deep dive time on permission inheritance and the closure table**. This is the non-obvious design challenge:

- How does the closure table enable O(1) ancestor queries?
- How do you compute effective permissions when a page at depth 8 has overrides at depth 3 and depth 6?
- How do you cache permission results and invalidate them correctly?

If the interviewer steers toward search, pivot to the post-filtering permission model and near-real-time indexing via CDC.

### How to Approach This Specific Problem

1. **Start with the page tree**: "A KMS organizes content in a space > page tree hierarchy. The core data challenge is representing this tree for efficient ancestor/descendant queries."
2. **Introduce the closure table early**: "We use a closure table alongside adjacency list to get O(1) ancestor lookups, which powers permission inheritance and breadcrumbs."
3. **Show permission inheritance**: "Permissions cascade from space to page tree. Each page load requires computing effective permissions by walking ancestors---the closure table makes this a single query."
4. **Explain block-based content**: "Pages are stored as ordered arrays of typed blocks (paragraph, heading, table, code). This enables block-level versioning, structured search indexing, and future collaborative editing."
5. **Discuss search architecture**: "Search is post-filtered by permissions. We over-fetch 3x from the search index, batch-check permissions via cache, and return the top N accessible results."

---

## Trade-offs Discussion

### Trade-off 1: Page Hierarchy Storage --- Adjacency List vs Closure Table vs Materialized Path

| Decision | Adjacency List | Materialized Path | Closure Table (Chosen) |
|----------|---------------|-------------------|----------------------|
| | **Pros**: Simple; O(1) insert; O(1) parent update | **Pros**: O(1) subtree query via LIKE; simple schema | **Pros**: O(1) ancestor/descendant queries; depth info available; clean SQL |
| | **Cons**: O(depth) recursive queries for ancestors; no subtree query without CTE | **Cons**: Path strings grow with depth; move requires updating all descendant paths | **Cons**: O(depth) rows per insert; move requires delete + reinsert closure entries |
| **Recommendation** | Closure table + adjacency list hybrid. Closure table for ancestor/descendant queries (permissions, breadcrumbs). Adjacency list (`parent_id`) for direct parent-child rendering. The write overhead is acceptable given the 10:1+ read-to-write ratio. |

### Trade-off 2: Page Content Storage --- Block-Based vs Rich-Text HTML vs Markdown

| Decision | Block-Based JSON (Chosen) | Raw HTML | Markdown |
|----------|--------------------------|----------|----------|
| | **Pros**: Structured versioning (block-level diff); search extraction per block type; extensible with macros; collaborative editing ready | **Pros**: Direct browser rendering; compact; WYSIWYG editors available | **Pros**: Human-readable source; smallest storage; great for developer-oriented wikis |
| | **Cons**: Requires custom editor; rendering overhead; larger than Markdown | **Cons**: Noisy diffs; no structured extraction; XSS risks with inline scripts | **Cons**: Limited formatting; no tables/macros; not suitable for non-technical users |
| **Recommendation** | Block-based storage wins for enterprise KMS. It enables block-level versioning, structured search indexing, fine-grained permissions, and a path to real-time collaboration. All modern KMS tools (Confluence Cloud, Notion) have migrated to block-based models for these reasons. |

### Trade-off 3: Versioning --- Full-Copy vs Diff-Based with Snapshots

| Decision | Full Copy per Version | Diff-Based with Periodic Snapshots (Chosen) |
|----------|----------------------|----------------------------------------------|
| | **Pros**: O(1) restore; simple implementation; no reconstruction needed | **Pros**: 80-90% storage reduction; block-level diffs show semantic changes; snapshots every N versions bound reconstruction cost |
| | **Cons**: 20KB per version x 100 versions = 2MB per page; scales poorly | **Cons**: Reconstruction requires replaying diffs from nearest snapshot; more complex implementation |
| **Recommendation** | Diff-based with snapshots every 10 versions. Average page has 50+ versions; diff-based reduces storage from 1MB to ~100KB per page while keeping restoration to O(k) where k <= 10 diff applications. |

### Trade-off 4: Permission Model --- Inherit-Down vs Explicit-Per-Page

| Decision | Inherit-Down with Overrides (Chosen) | Explicit Per Page |
|----------|--------------------------------------|-------------------|
| | **Pros**: Minimal configuration (set once at space, inherit everywhere); matches organizational hierarchies; override-capable for sensitive pages | **Pros**: No inheritance walk needed; O(1) permission check; simple model |
| | **Cons**: Permission computation requires ancestor walk; cache invalidation on override change cascades to descendants | **Cons**: Admin must set permissions on every page individually; new pages have no default permissions; painful at 10K+ pages |
| **Recommendation** | Inherit-down is essential for enterprise adoption. No admin will manually permission 10,000 pages. The computational cost of inheritance is solved by caching with event-driven invalidation. |

### Trade-off 5: Search --- Dedicated Search Engine vs Database Full-Text

| Decision | Dedicated Search Engine (Chosen) | Database Full-Text Search |
|----------|----------------------------------|--------------------------|
| | **Pros**: Inverted index with BM25 scoring; faceted search; near-real-time via async indexing; vector embeddings for semantic search | **Pros**: No additional infrastructure; transactionally consistent; simpler operations |
| | **Cons**: Index lag (5-30s); additional infrastructure cost; dual-write complexity | **Cons**: Cannot scale beyond ~1M pages; no facets; no relevance tuning; no semantic search |
| **Recommendation** | Dedicated search engine at enterprise scale. Database full-text works for small installations (<100K pages) but cannot deliver the relevance scoring, faceted filtering, and semantic search that enterprise users expect. |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "How do you store a page tree with 10 levels of nesting?" | Test hierarchy data model knowledge | "Closure table alongside adjacency list. The closure table stores all ancestor-descendant pairs with depth, enabling O(1) subtree and ancestor queries. For a 10-level tree, each page has at most 10 closure entries---trivial storage. Recursive SQL CTEs work for small trees but don't scale: they execute O(depth) queries sequentially. The closure table answers 'all ancestors of page X' in a single indexed query." |
| "How do you compute permissions for a page 8 levels deep in 10ms?" | Test caching and invalidation strategy | "Multi-tier cache: L1 request-scoped in-memory map, L2 distributed cache keyed by (user_id, page_id) with 5-minute TTL, L3 pre-computed permission sets per (user, space). On cache miss, a single closure table query returns all 8 ancestors, and we check permission entries at each level---nearest override wins. Event-driven invalidation on permission changes targets specific cache entries rather than flushing everything. The 5-minute TTL is a safety net for missed invalidations." |
| "How would you design search across 500M pages?" | Test search architecture at scale | "Dedicated search cluster with inverted index sharded by space_id. Near-real-time indexing via CDC from the primary database (5-30s lag). Post-filter search results by permissions using a batch permission check with cached results. Over-fetch 3x to account for filtered-out pages. For semantic search, store 768-dimension embeddings alongside the keyword index and use reciprocal rank fusion to combine keyword and vector results. Total index size: ~17TB across 12+ shards." |
| "500 users all editing the same popular page simultaneously---what happens?" | Test concurrent editing understanding | "Wiki pages rarely have true simultaneous editing---it's not a real-time collaborative editor. We use optimistic concurrency: each save includes a base_version. If the version has changed since the user started editing, we attempt a three-way block-level merge (base vs theirs vs ours). If the same block was modified by both, we show a conflict UI with merge options. For pages with consistently high edit concurrency (meeting notes, incident response), we can upgrade to CRDT-based real-time co-editing as a premium feature." |
| "How do you handle a user deleting a page that 1,000 pages link to?" | Test graph consistency thinking | "Soft delete: mark the page as deleted but retain it in the database. Update the backlink index to mark all 1,000 inbound links as broken. A background job notifies authors of linking pages about the broken reference. The deleted page shows a tombstone with redirect options. A periodic broken-link scan catches any links missed by the real-time path. We never hard-delete pages with active backlinks---compliance requirements often mandate retaining the content anyway." |
| "How do you make page export to PDF work for a 500-page space?" | Test async processing design | "Async export pipeline: user submits export request, which creates a queued job. A worker traverses the page tree, renders each page (resolving macros), generates per-page PDFs, then merges them with a table of contents. Progress is streamed to the user via server-sent events. The final PDF is uploaded to object storage with a time-limited download link. For frequently exported spaces, we cache the PDF and invalidate on page changes. Rate limit: 10 exports per user per hour to prevent abuse." |
| "What if a page at depth 5 has a permission restriction, but its child at depth 6 grants access back?" | Test permission inheritance nuance | "Nearest-ancestor override wins. If depth 5 sets NONE for a group but depth 6 explicitly grants VIEW to the same group, the depth 6 grant takes effect for that page and its children. However, we use deny-takes-precedence at the same level: if multiple groups at the same page grant different roles and one is NONE, NONE wins. This gives admins the ability to both restrict and re-grant at any level of the tree." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Using recursive SQL queries for hierarchy | O(depth) sequential queries; fails at scale | Closure table for O(1) ancestor/descendant queries |
| Ignoring permission inheritance | Makes every page load a security hole or a UX nightmare | Build the permission engine as a core service with caching |
| Making search synchronous with writes | Blocks page saves for index updates | Async indexing via message queue with near-real-time target |
| Storing page content as raw HTML | Cannot diff semantically, cannot extract structured data for search | Block-based JSON with typed blocks |
| Synchronous notification fan-out | A page watched by 5,000 users blocks the save for 5,000 notifications | Queue-based async fan-out with batching for large watch lists |
| Pre-filtering search results by permission | Requires per-user search indexes; stale on permission changes | Post-filter with cached batch permission checks |
| Designing for real-time collaboration first | Massive complexity (CRDT/OT) for a use case with low per-page concurrency | Start with optimistic locking + conflict merge; add co-editing later if needed |

---

## Questions to Ask Interviewer

| Question | Why It Matters |
|----------|---------------|
| "What's the expected scale---number of pages, users, spaces?" | Determines whether database full-text search suffices or a dedicated search cluster is needed |
| "Should we support real-time collaborative editing or wiki-style edit-save?" | CRDT/OT adds massive complexity; wiki-style is far simpler and sufficient for most KMS |
| "What's the expected page tree depth?" | Affects closure table size and permission computation cost |
| "Are there compliance requirements (immutable audit trail, legal hold)?" | Fundamentally changes deletion strategy from soft-delete to nothing-ever-deleted |
| "Should search include attachments and embedded content?" | Adds OCR and document parsing to the indexing pipeline |
| "Is the permission model space-level only, or do we need page-level overrides?" | Page-level overrides add the inheritance computation problem |
| "Do we need to support cross-space page linking?" | Affects the backlink index scope and permission model for linked content |

---

## What to Draw on the Whiteboard

Draw a simplified architecture with five key components and their connections:

1. **API Gateway** at the top --- authentication, rate limiting, routing
2. **Page Service** in the center --- CRUD operations, hierarchy management via closure table, block-based content storage
3. **Permission Engine** to the side of Page Service --- evaluates ACLs by walking ancestors via closure table, backed by a multi-tier cache (request-scoped, distributed cache, pre-computed sets)
4. **Search Cluster** --- inverted index + vector embeddings, fed by async indexing pipeline from page change events, results post-filtered by permission engine
5. **Data Layer** at the bottom --- primary database (pages, permissions, closure table), cache cluster (permissions, page content, breadcrumbs), search index, object storage (attachments), message queue (async events)

Show two data flows: (1) page read --- API gateway → permission check (cached) → page service → cache/DB → render with breadcrumbs from closure table, and (2) page save --- API gateway → permission check → page service → DB write → emit event → async consumers (search indexer, notification service, audit log).

---

## Follow-up Deep Dives

| Area | One-Sentence Answer |
|------|---------------------|
| **Macro rendering at scale** | Macros are evaluated lazily at view time with per-macro caching; expensive macros (include-page, external data) have dedicated cache TTLs and circuit breakers. |
| **Cross-space page moves** | Moving a page between spaces requires updating space_id for the entire subtree, re-evaluating permissions under the new space defaults, re-indexing all pages, and invalidating all caches---executed as a transactional move with async side effects. |
| **Template system architecture** | Templates are stored as block arrays with variable placeholders; instantiation deep-clones blocks, substitutes variables, regenerates block IDs, and creates a new page linked to the source template. |
| **AI-powered features** | Semantic search via embedding-based vector similarity combined with keyword search using reciprocal rank fusion; page summarization via LLM with structure-aware truncation; related page recommendations via nearest-neighbor embedding search with permission filtering. |
| **Multi-tenancy isolation** | Each organization gets isolated spaces with separate permission boundaries; search indexes are scoped by organization; data residency requirements may require region-specific storage shards. |

---

## Signals of a Strong vs Weak Answer

| Dimension | Weak Answer | Strong Answer |
|-----------|-------------|---------------|
| **Hierarchy storage** | "Just use parent_id and recursive queries" | "Closure table + adjacency list hybrid. Closure table for O(1) ancestor lookups; adjacency for direct children. Recursive CTEs don't scale." |
| **Permission model** | "Check permissions on every request against the DB" | "Multi-tier cache with event-driven invalidation. L1 request-scoped, L2 distributed (user, page), L3 pre-computed (user, space). 5-min TTL safety net." |
| **Search** | "Use the database's built-in full-text search" | "Dedicated search cluster, async indexing via CDC, post-filtered by permission cache. BM25 + recency + popularity + semantic embeddings." |
| **Content model** | "Store page content as HTML in a text column" | "Block-based JSON: each paragraph, heading, table is a typed block. Enables block-level diffs, structured search, and future collaborative editing." |
| **Concurrency** | "Lock the page while someone is editing" | "Optimistic concurrency with version-based conflict detection and three-way block-level merge. Upgrade to CRDT only if conflict rate exceeds 5%." |
| **Notifications** | "Send a notification to each watcher synchronously" | "Tiered fan-out: direct delivery for small watch lists, batched for medium, digest for large (1,000+ watchers). Collapse multiple edits within a window." |

---

## "What Would You Do Differently at 10x Scale?"

| Current Scale | 10x Scale | Key Changes |
|--------------|-----------|------------|
| 500M pages | 5B pages | Shard search index into 50+ shards; tiered storage (hot/warm/cold pages by last access); archive spaces with no access in 12+ months |
| 50M users | 500M users | Permission cache hit rate drops as user diversity increases; pre-compute permission sets per (user, space) at login; regional cache clusters |
| 3,500 reads/sec peak | 35,000 reads/sec | CDN-serve rendered page HTML; edge caching for public spaces; read replicas per region |
| 350 writes/sec peak | 3,500 writes/sec | Shard primary DB by space_id; write-ahead queue for version creation; batch search index updates every 10s instead of 5s |
| 1,050 searches/sec peak | 10,500 searches/sec | Federated search across regional clusters; query result caching for popular queries; approximate nearest neighbor for semantic search |
| Notification fan-out | 10x watch list sizes | Digest-based notifications for large watch lists (>1,000 watchers); sampling for real-time delivery; daily/weekly digest for low-priority changes |

---

## Quick Reference Card

### The 5-Sentence Architecture Summary

1. Pages are organized in a space > page tree hierarchy, with the closure table providing O(1) ancestor/descendant queries for permission inheritance and breadcrumbs.
2. Content is stored as block-based JSON (typed blocks: paragraph, heading, table, code, macro), enabling semantic versioning, structured search indexing, and future collaborative editing.
3. Permissions inherit from space to page tree with page-level overrides; effective permission computation is cached in a multi-tier cache with event-driven invalidation.
4. Search uses a dedicated inverted index with post-filtered permission checks, near-real-time indexing via CDC, and optional semantic search via vector embeddings.
5. Side effects (search indexing, notifications, audit logging, export) are decoupled via an event-driven message queue, keeping page reads and saves fast.

### Quick Trade-off Reference

| Question | Answer |
|----------|--------|
| Page hierarchy storage | Closure table (O(1) subtree and ancestor queries) |
| Permission check latency | <10ms with multi-tier cache (event-driven invalidation) |
| Search freshness | Near-real-time via CDC (5-30s lag) |
| Content storage format | Block-based JSON (typed blocks, not raw HTML) |
| Versioning strategy | Diff-based for content, full snapshots every 10 versions |
| Concurrent edit handling | Optimistic locking + three-way block-level merge |
| Max nesting depth | 15 levels (hard limit; 8 levels soft warning) |
| Search index size (500M pages) | ~17TB (inverted index + vector embeddings) |
| Post-filter vs pre-filter search | Post-filter with batch permission cache (no per-user index) |
| Notification strategy | Tiered fan-out (direct / batched / digest by watch list size) |

### Key Numbers to Remember

| Metric | Value |
|--------|-------|
| Total pages | 500M+ |
| Active users | 50M+ |
| Read-to-write ratio | 10:1 to 50:1 |
| Page load latency (p50) | <200ms |
| Permission check latency | <10ms (cached) |
| Search latency (p50) | <500ms |
| Search index freshness | 5-30s (near-real-time via CDC) |
| Closure table rows (10K pages, depth 5) | ~50,000 rows (~2.5MB) |
| Search index size (500M pages) | ~17TB (inverted + vector) |
| Version storage reduction (diff-based) | 80-90% vs full-copy |
| Max practical nesting depth | 15 levels (hard limit) |
| Concurrent editors per page | 1-5 typical |
