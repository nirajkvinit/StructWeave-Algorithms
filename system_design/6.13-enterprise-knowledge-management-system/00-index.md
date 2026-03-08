# Enterprise Knowledge Management System Design

## System Overview

An Enterprise Knowledge Management System (KMS)---exemplified by Confluence, Notion wikis, SharePoint Wiki, and BookStack---provides organizations with a structured platform for creating, organizing, searching, and governing knowledge at scale. Unlike general-purpose document editors, a KMS is built around **page hierarchies** (tree-structured content organized into spaces), **cross-page linking** (bidirectional references forming a knowledge graph), **full-text search** with faceted filtering, **space-level permissions** with page-level overrides, **templates** for standardized content creation, **version history** for every page edit, and a comprehensive **audit trail** for compliance. The system serves as the organizational single source of truth---where onboarding guides, architecture decisions, runbooks, policies, and tribal knowledge live. At enterprise scale, this means managing 500M+ pages across 50M+ users, with the core challenge being the intersection of hierarchical data modeling, permission inheritance across deep trees, and search relevance across a massive heterogeneous corpus.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Heavily read-dominant (10:1 to 50:1 read-to-write ratio); most users consume, few create |
| **Latency Sensitivity** | Medium---page load <200ms, search results <1s; not keystroke-level like collaborative editors |
| **Consistency Model** | Strong consistency for permissions; eventual consistency acceptable for search index and analytics |
| **Concurrency Level** | Low per page (1-5 simultaneous editors); high per space (thousands of concurrent readers) |
| **Data Volume** | Very High---500M+ pages, 10TB+ content, version history multiplier of 5-20x |
| **Architecture Model** | Read-heavy, cache-friendly, search-driven with hierarchical permission enforcement |
| **Offline Support** | Limited---primarily online with optional offline read cache |
| **Complexity Rating** | **High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Hierarchy operations, permission computation, search at scale |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Access control, encryption, compliance, audit |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Document Editor (6.2/6.8) | Document Management (6.12) | Knowledge Management (This) |
|--------|---------------------------|----------------------------|----------------------------|
| **Primary Unit** | Document (flat or block-based) | File (any format) | Page (structured, linked, hierarchical) |
| **Organization** | Folders or flat lists | Folder hierarchy with metadata | Space > Page Tree with cross-links |
| **Editing Model** | Real-time collaborative (CRDT/OT) | Check-out/check-in or upload | Wiki-style edit-save with optional co-editing |
| **Search** | Within document | Metadata + file content extraction | Full-text across all pages with facets, boosting, and semantic search |
| **Relationships** | None or minimal | Tags, categories | Bidirectional cross-page links, @mentions, labels |
| **Permissions** | Per-document | Per-folder/file | Space-level + page tree inheritance + overrides |
| **Templates** | Document templates | Metadata templates | Page blueprints with variable substitution and block inheritance |
| **Version Model** | Continuous (every keystroke) | File versions (upload-based) | Page versions (edit sessions) |
| **Content Model** | Rich text / blocks | Opaque files | Structured blocks with macros, tables, embeds |

---

## What Makes This System Unique

1. **Hierarchical Permission Inheritance**: Pages inherit permissions from parent pages and spaces, but any page can override with restrictions or grants. Computing effective permissions across a 10-level deep tree with group memberships, anonymous access toggles, and admin bypasses is a combinatorial problem that must resolve in <10ms per page load.

2. **Bidirectional Cross-Page Link Graph**: Unlike file systems, KMS pages reference each other extensively. Maintaining a forward link index and backlink index---and keeping them consistent when pages are moved, renamed, or deleted---creates a graph maintenance problem atop a tree structure.

3. **Search Across Heterogeneous Content**: Pages contain rich text, tables, code blocks, embedded macros, attached files, and comments. The search engine must index all of these, boost by recency, popularity, and user's space memberships, and return relevant snippets---not just matches.

4. **Template and Macro System**: Pages are not static content---they contain dynamic macros (table of contents, include-page, Jira tickets, status badges) that must render at view time while remaining searchable and exportable.

5. **Read-Dominant Architecture**: With a 10:1 or higher read-to-write ratio, every architectural decision must optimize for read performance. This means aggressive caching, pre-computed breadcrumbs, CDN-served rendered pages, and denormalized data for common read paths.

---

## Quick Reference: Core Data Structure Options

### Page Hierarchy Representation

| Approach | Reads | Writes | Move Subtree | Depth Query | Best For |
|----------|-------|--------|-------------|-------------|----------|
| **Adjacency List** | O(n) for full tree | O(1) insert | O(n) update | Recursive query | Small trees, simple queries |
| **Materialized Path** | O(1) subtree via LIKE | O(1) insert | O(n) update all paths | String prefix match | Read-heavy, moderate writes |
| **Closure Table** | O(1) any ancestor/descendant query | O(depth) insert | O(n) for subtree | Direct query | Complex queries, moderate writes |
| **Nested Sets** | O(1) subtree range query | O(n) for any insert | O(n) renumber | Range query | Read-only or rarely modified trees |

**Recommendation for KMS**: Closure Table + adjacency list hybrid. Closure table for ancestor/descendant queries (permission inheritance, breadcrumbs). Adjacency list (`parent_id`) for direct parent-child relationships. See [03 - Low-Level Design](./03-low-level-design.md) for detailed analysis.

### Search Architecture Options

| Approach | Index Size | Query Latency | Real-time Updates | Best For |
|----------|-----------|---------------|-------------------|----------|
| **Database Full-Text** | Compact | 100ms-1s | Immediate | <1M pages, simple search |
| **Dedicated Search Engine** | 2-5x content size | 10-100ms | Near-real-time (seconds) | 1M-1B pages, faceted search |
| **Hybrid (DB + Search Engine)** | Moderate | 50-200ms | Tunable | Enterprise with varied query patterns |
| **Vector + Keyword Hybrid** | Large (embeddings) | 50-500ms | Batch | Semantic search, AI features |

**Recommendation for KMS**: Dedicated search engine with vector embedding sidecar for semantic search.

---

## Algorithm Comparison: Hierarchy Representations

### Materialized Path

```
Page: "Engineering/Backend/API Design/REST Conventions"
Path: "/space-1/page-1/page-5/page-23/page-47"

-- Find all ancestors of page-47:
SELECT * FROM pages
WHERE '/space-1/page-1/page-5/page-23/page-47' LIKE path || '%'

-- Find all descendants of page-5:
SELECT * FROM pages
WHERE path LIKE '/space-1/page-1/page-5/%'
```

**Pros**: Simple, fast subtree queries with index on path.
**Cons**: Move operations require updating all descendant paths. Path length grows with depth.

### Closure Table

```
-- Closure table stores all ancestor-descendant pairs:
| ancestor_id | descendant_id | depth |
|------------|--------------|-------|
| page-1     | page-1       | 0     |
| page-1     | page-5       | 1     |
| page-1     | page-23      | 2     |
| page-1     | page-47      | 3     |
| page-5     | page-5       | 0     |
| page-5     | page-23      | 1     |
| page-5     | page-47      | 2     |
| page-23    | page-23      | 0     |
| page-23    | page-47      | 1     |
| page-47    | page-47      | 0     |

-- Find all ancestors of page-47:
SELECT ancestor_id FROM page_closure WHERE descendant_id = 'page-47'

-- Find all descendants of page-5:
SELECT descendant_id FROM page_closure WHERE ancestor_id = 'page-5'

-- Find depth of page-47 from root:
SELECT depth FROM page_closure
WHERE ancestor_id = 'page-1' AND descendant_id = 'page-47'
```

**Pros**: O(1) ancestor/descendant queries. Depth information readily available.
**Cons**: O(depth) rows per insert. Move requires deleting and reinserting closure entries for entire subtree.

### Nested Sets

```
-- Each node has left and right values:
| page_id | lft | rgt |
|---------|-----|-----|
| page-1  | 1   | 10  |
| page-5  | 2   | 7   |
| page-23 | 3   | 6   |
| page-47 | 4   | 5   |
| page-8  | 8   | 9   |

-- Find all descendants of page-5: lft BETWEEN 2 AND 7
-- Find all ancestors of page-47: lft < 4 AND rgt > 5
```

**Pros**: Single range query for subtrees.
**Cons**: Any insert/move requires renumbering potentially the entire tree---terrible for write-heavy workloads.

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [6.2 - Collaborative Document Editor](../6.2-collaborative-document-editor/) | Real-time editing and version control |
| [6.8 - Real-Time Collaborative Editor](../6.8-real-time-collaborative-editor/) | Block-based content model, CRDT architecture |
| [6.12 - Document Management System](../6.12-document-management-system/) | File versioning, metadata, permissions |
| [3.32 - AI Knowledge Graph](../3.32-ai-knowledge-graph/) | Entity linking, semantic search, graph traversal |
| [4.1 - Search Engine](../4.1-search-engine/) | Full-text indexing, ranking, relevance |

---

## Sources

- Atlassian Engineering Blog --- Confluence Cloud Architecture, Search Infrastructure
- Notion Engineering Blog --- Block Model, Permissions at Scale
- Microsoft SharePoint Architecture Documentation
- BookStack Open-Source Wiki Architecture
- XWiki Architecture Documentation
- Elasticsearch/OpenSearch --- Full-Text Search at Scale
- Research: Materialized Path vs Closure Table Performance (Bill Karwin, SQL Antipatterns)
- Research: Permission Inheritance in Hierarchical Systems (RBAC/ABAC Literature)
- Industry Statistics: Confluence 75K+ enterprise customers, Notion 100M+ users (2025)
- Apache Lucene/Solr --- Inverted Index Internals
