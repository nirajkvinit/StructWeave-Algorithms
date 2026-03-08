# Key Architectural Insights

## Insight 1: Page Hierarchy --- A Solved Storage Problem with an Unsolved Permission Problem

**Category**: Data Modeling & Access Control

**One-liner**: The closure table elegantly solves hierarchy storage and querying, but permission inheritance across that same hierarchy is a fundamentally harder problem that the storage model alone cannot solve.

**Why it matters**: Representing a page tree in a database is a well-studied problem with clear solutions. The closure table stores all ancestor-descendant pairs explicitly, enabling O(1) subtree queries, O(1) ancestor lookups, and O(1) depth calculations. Move operations, while expensive (O(subtree_size * depth) closure row updates), are infrequent and can be executed transactionally. The storage problem is solved---any competent team can implement it in a week.

The permission problem layered on top of the same hierarchy is categorically different. Computing effective permissions for a page at depth 8 requires: (1) querying all 8 ancestors via the closure table, (2) checking for explicit permission entries at each ancestor for the requesting user and all their groups, (3) applying inheritance rules (nearest override wins, deny-takes-precedence at the same level), and (4) handling edge cases like space admin bypass and anonymous access. This computation touches the closure table, the permission entries table, the group membership table, and potentially the space settings table---four joins or lookups per page load.

The closure table gives you the ancestor list in one query, but it does not tell you which ancestor has a permission override, whether the user's group membership has changed since the last check, or whether a space admin just added a new restriction. The real engineering challenge is the caching layer: a multi-tier cache with event-driven invalidation that must be both fast (sub-10ms) and correct (no stale grants after a permission change). Getting this wrong means either security holes (stale grants allowing unauthorized access) or performance collapse (cache misses causing 10ms+ permission checks on every page load). The hierarchy storage is the foundation, but the permission engine built on top of it is where the architectural complexity lives.

---

## Insight 2: The 10:1 Read-Write Ratio Shapes Everything

**Category**: Architecture Strategy

**One-liner**: Knowledge bases are read far more than written, and this single ratio justifies aggressive read optimization, async write propagation, and eventual consistency for non-critical data paths.

**Why it matters**: A KMS with 50 million users has perhaps 5 million who create or edit content in any given month. The rest are consumers: reading pages, searching for information, browsing the page tree. This 10:1 (or higher) read-to-write ratio is not a minor detail---it is the architectural North Star that should guide every design decision.

On the read path, this ratio justifies: CDN-served rendered page HTML for public or widely-accessed pages, a distributed cache layer for hot page content and permission results, read replicas for database query offload, pre-computed breadcrumbs cached with short TTLs, and search result caching for popular queries. Each of these adds complexity, but the payoff is enormous when 90%+ of traffic is reads that can be served from cache.

On the write path, the ratio permits async propagation for almost everything except the page save itself. When a user saves a page, the only synchronous operation is writing the new content and version to the primary database. Everything else---search index update, notification delivery to watchers, audit log recording, analytics event, backlink index update---happens asynchronously via a message queue. The search index can lag by 5-30 seconds. Notifications can be batched. Analytics can be aggregated hourly. This async-by-default architecture keeps page saves fast (<500ms) while ensuring all derived data eventually converges. The key insight is that eventual consistency is perfectly acceptable for these derived views because the primary source of truth (the page content in the database) is always strongly consistent, and users rarely notice a 10-second delay in search results reflecting their latest edit.

---

## Insight 3: Block-Based Content Storage as the Generational Shift

**Category**: Content Architecture

**One-liner**: The move from flat HTML/Markdown to block-based content storage is not a cosmetic change but a fundamental architectural shift that enables an entirely new class of features.

**Why it matters**: Early wiki systems stored page content as a single blob---either wiki markup that rendered to HTML, or raw HTML from a WYSIWYG editor. This worked for simple pages but created cascading problems at scale. Version diffs were character-level on HTML, producing unreadable changes like `<p class="modified">` → `<p class="modified" style="color:red">`. Search indexing required stripping HTML tags, losing the distinction between a heading match and a body match. Collaborative editing required diffing the entire document, making conflict resolution nearly impossible for large pages.

Block-based storage treats each content element---paragraph, heading, table, code block, image, macro---as an independent typed JSON object with a unique ID, type-specific attributes, and ordered children. This structure enables: block-level version diffs that show "heading 3 was modified" rather than a sea of HTML changes; search indexing that can boost heading matches 2x and title matches 3x because the structure is explicit; conflict resolution at block granularity (if two users edit different blocks, the merge is trivial); fine-grained permissions where certain blocks can be restricted to specific groups; and an API-first content model where external integrations can read, create, and modify individual blocks without parsing HTML.

The migration cost from flat content to blocks is significant---Confluence's migration from wiki markup to ADF (Atlassian Document Format) took years and required maintaining dual rendering paths during the transition. But every modern KMS has made this shift because the feature ceiling of flat content storage is too low for enterprise requirements. The block model is not just a storage format; it is the foundation on which versioning, search, collaboration, permissions, and API access are built. Choosing flat content in a greenfield KMS design signals a fundamental misunderstanding of the domain.

---

## Insight 4: Notification Fan-Out at Wiki Scale

**Category**: Event Processing

**One-liner**: A popular company-wide page watched by 50,000 users generates 50,000 notifications on every minor edit, creating a fan-out problem that naive message queue architectures cannot handle.

**Why it matters**: Notification fan-out in a KMS is qualitatively different from social media fan-out. In social media, a post goes to followers who chose to follow---the fan-out ratio is bounded by the user's popularity and grows gradually. In a KMS, a single company-wide page (the engineering handbook, the HR policy page, the incident response runbook) can be watched by the entire organization. When someone fixes a typo on that page, 50,000 notification events flood the queue.

A naive implementation---one message per (user, notification) pair enqueued synchronously during page save---would add seconds of latency to the save operation and create a thundering herd on the notification delivery system. The solution is tiered fan-out: for pages with fewer than 100 watchers, deliver notifications immediately via individual messages. For pages with 100-1,000 watchers, batch notifications into groups of 50 and process them with a slight delay (30 seconds). For pages with 1,000+ watchers, switch to digest mode: record the change event once, and include it in a periodic digest (hourly or daily) rather than individual real-time notifications.

This tiered approach also enables smart filtering: if the same page is edited 5 times in 10 minutes, collapse those into a single notification ("Page X was updated 5 times by Alice and Bob") rather than sending 5 separate notifications to 50,000 users (250,000 notifications). The notification system must also respect muting: a user who has muted a page should not consume any resources in the fan-out path, not even a filtered-out message. This means the watch subscription table must be queried efficiently, with muted subscriptions excluded at the database level rather than the application level. At scale, the notification system becomes one of the most resource-intensive components despite being "just" a side effect of the core page editing flow.

---

## Insight 5: Backlink Graph --- The Hidden Scaling Challenge

**Category**: Data Consistency

**One-liner**: Every `[[page-link]]` and `@mention` creates a bidirectional reference that must be maintained consistently across millions of pages, and the backlink index becomes a surprisingly complex distributed data problem.

**Why it matters**: A KMS is not just a tree of pages---it is a graph. Pages link to each other extensively: "See the API Design page for details," "As described in the Architecture Decision Record," "Related: Deployment Runbook." Each link creates two index entries: a forward link (page A links to page B) and a backlink (page B is referenced by page A). The backlink index powers a critical feature: when viewing a page, users see "Referenced by: Page X, Page Y, Page Z," which helps them understand the page's importance and context.

Maintaining this bidirectional index consistently is harder than it appears. When a page is saved, the system must diff the old and new link sets, insert new forward/backward entries, and delete removed entries---all while the target pages may be on different database shards. When a page is deleted, all inbound links become broken: the system must update potentially thousands of backlink entries and optionally notify the authors of linking pages. When a page is moved to a different space, links that used page IDs (not slugs) remain valid, but links that used URL paths break and require redirect entries.

The most insidious problem is broken link accumulation. Over time, as pages are deleted, restructured, or moved, broken links accumulate silently. A periodic broken-link scan must traverse the entire link graph, check each target's status, and report broken references. For a system with 500M pages and an average of 5 links per page, this is a graph of 2.5 billion edges---a non-trivial batch processing job. The scan must be incremental (only re-check links on recently modified pages) to be practical at scale. The backlink graph is rarely discussed in system design interviews, but it is one of the first things that breaks at scale if not designed as a first-class index with its own consistency guarantees.

---

## Insight 6: Search as the Primary Navigation Mechanism

**Category**: User Experience Architecture

**One-liner**: Enterprise KMS users navigate primarily through search rather than hierarchy browsing, which means search quality is the most user-visible metric and the search pipeline must be a first-class architectural citizen.

**Why it matters**: The mental model of a KMS as a "tree of pages you browse" is wrong for how the system is actually used. Studies of enterprise wiki usage consistently show that 60-70% of page views originate from search, not from tree navigation. Users do not remember that the deployment runbook is at Engineering > Backend > Infrastructure > Deployment > Runbook---they type "deployment runbook" into the search bar and expect the right page as the first result.

This means search quality---measured by freshness (how quickly edits appear in results), recall (finding the right page even with imprecise queries), and ranking (the right page is in the top 3 results)---is the most impactful metric for user satisfaction. A search that takes 30 seconds to reflect a newly published page feels broken. A search that returns 50 results but buries the relevant one at position 15 wastes the user's time. A search that cannot match "deploy guide" to a page titled "Production Deployment Runbook" fails at basic recall.

Architecturally, this elevates the search pipeline from "nice-to-have index" to a core system with its own SLAs. The indexing pipeline must be near-real-time (5-30 second lag via CDC or event-driven updates). The ranking model must combine text relevance (BM25 with title and heading boosts), recency (exponential decay favoring recently updated pages), popularity (logarithmic view count boost), and personalization (user's space affinity). Semantic search via embedding-based vector similarity dramatically improves recall for natural-language queries ("how do we handle customer escalations" matching a page titled "Customer Support Tier 2 Escalation Process"). The architecture must treat the search cluster as a first-class component with dedicated infrastructure, monitoring, and SLAs---not as an afterthought bolted onto the page database.

---

## Insight 7: Compliance Requirements Drive Immutability

**Category**: Regulatory Architecture

**One-liner**: In regulated industries, the requirement that nothing can ever be truly deleted transforms the entire architecture from "soft delete is a convenience" to "immutability is a structural constraint."

**Why it matters**: For a startup building an internal wiki, "delete" means remove from the database after 30 days in trash. For a financial services company, a pharmaceutical firm, or a legal department, "delete" means hide from the UI while retaining every version, every comment, every audit event---forever. Regulatory frameworks (SOX, HIPAA, GxP, legal hold obligations) require that page history cannot be altered, version history cannot be pruned, and deleted content must be recoverable by compliance officers. A subpoena can demand the complete edit history of a page, including who viewed it, when, and from which IP address.

These requirements fundamentally change the architecture in ways that are extremely expensive to retrofit. The version storage system must be append-only: no version can be deleted, even by administrators. The audit log must be written to an immutable store (append-only database or write-once object storage) that administrators cannot modify. "Delete" becomes a UI-level operation that sets a status flag but does not remove any data. Legal hold must be implementable: marking specific pages or spaces as "hold" prevents any modification or deletion of their content and history, even by space admins. Export must be able to produce a complete, tamper-evident record of a page's lifecycle for legal proceedings.

Building compliance-first versus adding it later are vastly different cost profiles. A system designed with mutable version history, hard deletes, and ephemeral audit logs requires a near-complete rewrite to meet compliance requirements. A system designed with append-only version storage, immutable audit logs, and soft-delete-only semantics from day one merely needs a UI layer for compliance officers to access retained data. The architectural lesson is that if your KMS will ever serve regulated industries, build the immutability constraints into the data model from the start---it is 10x cheaper than retrofitting.
