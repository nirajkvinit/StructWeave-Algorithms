# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Clarify** | Scope the problem | Which subsystems? Git hosting + PR + CI + Search? Scale? |
| 5-10 min | **Requirements** | Core features, non-functionals | Git operations, PRs, Actions, Search; 99.99% availability, durability |
| 10-20 min | **High-Level Design** | Architecture, data flow | Git object store, metadata DB, event-driven async, runner pools |
| 20-35 min | **Deep Dive** | 1-2 critical components | Fork COW, merge algorithms, Actions orchestration, OR search |
| 35-42 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios | Hot repos, fork GC, runner scaling, search freshness |
| 42-45 min | **Wrap Up** | Summary, extensions | What would change at 10x scale? Security considerations |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **Git protocol is the API**: Unlike most web services where you design the API from scratch, a large part of GitHub's traffic uses the Git wire protocol---a binary, stateful, streaming protocol. You must support unmodified Git clients.

2. **Content-addressable store constrains the architecture**: Git's Merkle DAG provides integrity and deduplication for free, but you can't query it like a database. You must maintain metadata indexes as derived views of the git data.

3. **Fork COW creates cross-repository dependencies**: Forks share objects with their parent, creating a web of dependencies that complicates garbage collection, storage rebalancing, and access control.

4. **Five very different subsystems**: Git hosting, pull requests, CI/CD, code search, and webhooks each have distinct architectural patterns, scaling challenges, and consistency requirements. The system is essentially five different distributed systems sharing a platform.

5. **Event-driven fan-out is massive**: A single `git push` can trigger 50,000+ webhook deliveries (popular repos), multiple CI workflows, search index updates, notifications, and statistics updates---all asynchronously.

### Where to Spend Most Time

In a 45-minute interview, spend **60% of deep dive time on the git data model and fork architecture**. This is where the non-obvious design challenges live:

- How does the content-addressable store work?
- Why is fork COW critical for storage efficiency?
- How do you handle garbage collection across fork networks?
- How does compare-and-swap ensure safe concurrent pushes?

If the interviewer steers toward CI/CD, pivot to the Actions orchestration model: event-driven DAG execution on ephemeral runners.

### How to Approach This Specific Problem

1. **Start with Git internals**: "Git stores data as four types of content-addressed objects: blobs, trees, commits, and tags. This Merkle DAG is the foundation."
2. **Separate content from metadata**: "Git objects live on the filesystem; all queryable metadata (PRs, users, issues) lives in a relational database."
3. **Introduce fork COW early**: "Forks share the parent's object store. This saves petabytes of storage."
4. **Show event-driven architecture**: "A push updates refs and emits an event. All downstream processing---webhooks, CI, search, notifications---is async."
5. **Discuss merge strategies**: Show you understand the algorithmic differences between merge commit, squash, and rebase.

---

## Trade-offs Discussion

### Trade-off 1: Content-Addressable Store vs Custom Object Store

| Decision | Git-Native Object Store (Chosen) | Custom Object Store |
|----------|----------------------------------|---------------------|
| | **Pros**: Client compatibility; free deduplication; integrity guarantees; distributed protocol | **Pros**: Custom query support; flexible schema; easier horizontal scaling |
| | **Cons**: No direct querying; filesystem-bound; complex pack management | **Cons**: Must reimplement integrity; client translation layer; no existing ecosystem |
| **Recommendation** | Use Git-native store for code; build metadata indexes in relational DB on top |

### Trade-off 2: Shared Object Store (COW) vs Full Copy per Fork

| Decision | Shared Objects (COW) (Chosen) | Full Copy per Fork |
|----------|------------------------------|-------------------|
| | **Pros**: Petabytes of storage saved; instant fork creation; cross-fork PRs trivial | **Pros**: Simple GC; independent scaling; no cross-repo dependencies |
| | **Cons**: Complex GC across fork network; root deletion is hard; storage co-location constraint | **Cons**: Linux kernel × 50K forks = 200TB instead of 4.5TB |
| **Recommendation** | COW is essential at scale; the GC complexity is manageable |

### Trade-off 3: SQL vs NoSQL for Metadata

| Decision | Relational Database (Chosen) | Document Store |
|----------|-------------------------------|---------------|
| | **Pros**: ACID for ref updates; complex queries (PR filters, issue search); proven at scale | **Pros**: Schema flexibility; horizontal scaling; simpler sharding |
| | **Cons**: Sharding complexity; schema migrations at scale | **Cons**: No complex joins; weak consistency; harder to enforce constraints |
| **Recommendation** | Relational for core metadata (repos, PRs, users); document store for flexible schemas (workflow logs, audit data) |

### Trade-off 4: Trigram Index vs Full-Text Index for Code Search

| Decision | Trigram Index (Chosen) | Full-Text (Token-Based) Index |
|----------|----------------------|-------------------------------|
| | **Pros**: Substring matching; regex support; works for any code pattern | **Pros**: Faster for word queries; smaller index; established tools |
| | **Cons**: 5-10x index size; false positives need post-filtering | **Cons**: Cannot find substrings; tokenization varies by language; no regex |
| **Recommendation** | Trigram for code search (developers search for function names, partial strings, and patterns, not natural language words) |

### Trade-off 5: Hosted vs Self-Hosted Runners for Actions

| Decision | Hosted Runners | Self-Hosted Runners |
|----------|---------------|---------------------|
| | **Pros**: Zero setup; managed scaling; isolated environments; no maintenance | **Pros**: Custom hardware (GPU, ARM); faster for large repos (local cache); no minute limits |
| | **Cons**: Limited hardware options; cold cache on each run; per-minute billing | **Cons**: Customer manages security, updates, scaling; risk of environment contamination |
| **Recommendation** | Hosted for most workloads; self-hosted for specialized hardware or compliance requirements |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not use a database to store code instead of the filesystem?" | Understand Git's content-addressable model | "Git's Merkle DAG provides integrity verification (every object is validated by its hash), natural deduplication (identical content has identical hashes), and protocol compatibility with billions of existing Git clients. A database would require reimplementing all of this and breaking client compatibility." |
| "How do you handle a repository with 10 million files?" | Test knowledge of monorepo challenges | "Standard Git struggles at this scale. We use partial clones (skip blobs until needed), sparse checkout (only materialize relevant files), and shallow clones (limit commit history). Server-side, we optimize pack negotiation and maintain pre-computed pack files for common clone patterns." |
| "What happens if someone force-pushes to a branch with 100 open PRs?" | Test understanding of invalidation cascades | "All 100 PRs' mergeability caches are invalidated. We use lazy recalculation---only recompute when a PR is viewed or has auto-merge enabled. A priority queue ensures active PRs are recalculated first. We also batch-invalidate rather than triggering 100 individual recomputation jobs." |
| "How do you ensure a push and its webhook are delivered atomically?" | Test understanding of distributed transactions | "We don't---and shouldn't. The push is committed synchronously (update refs + store objects). The webhook is delivered asynchronously with at-least-once semantics and retries. We guarantee delivery but not atomicity. The alternative (making push wait for webhook delivery) would make pushes take seconds instead of milliseconds." |
| "Can you just use Elasticsearch for code search?" | Test understanding of code vs text search | "Full-text search engines are designed for natural language: they tokenize on word boundaries and use stemming. Code search needs substring matching ('handleReq' should match 'handleRequest'), regex support, and syntax-aware ranking. Trigram indexes solve this---they index every 3-character sequence, enabling arbitrary substring matching." |
| "What if an Actions workflow has an infinite loop?" | Test resource limit thinking | "Job timeout (default 6 hours, configurable). Step timeout. Compute budget per account. If a workflow forks a process that outlasts the step, the runner VM is destroyed entirely (ephemeral VMs ensure no runaway processes persist). We also monitor for recursive workflow triggers and circuit-break after 3 levels." |
| "How do you handle 50,000 forks of the same repository?" | Test fork graph understanding | "All forks share the root repository's object store via Git alternates. Fork creation is instant (just add a ref namespace). The challenge is GC: we can't delete objects in the root that any fork references. We use reference counting across the fork network and only GC objects unreachable from all forks' refs." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Treating GitHub as a simple CRUD app | Ignores Git protocol, content-addressable store, fork COW | Start with Git data model; build the architecture around it |
| Ignoring the Git wire protocol | 50%+ of traffic uses SSH/smart HTTP, not REST APIs | Discuss dual protocol handling and how pack negotiation works |
| Putting all data in a single database | Git objects don't belong in a database | Separate: filesystem for git objects, relational DB for metadata, search index for search |
| Making webhooks synchronous with pushes | Would add seconds of latency to every push | Event-driven: push returns immediately; webhooks are async with retry |
| Designing Actions as a monolithic CI server | Doesn't scale; contamination between builds | Ephemeral runners: fresh VM per job, DAG-based orchestration |
| Copying repository data for each fork | Wastes petabytes of storage | Fork COW with shared object store via Git alternates |
| Using word-based search for code | Misses substring and regex use cases | Trigram indexing for arbitrary substring matching |

---

## Questions to Ask Interviewer

| Question | Why It Matters |
|----------|---------------|
| "What's the primary focus---Git hosting, PRs, CI/CD, or search?" | Scopes the deep dive; all four together is too broad for 45 min |
| "What scale are we designing for?" | Determines sharding strategy, replication model |
| "Should we support Git protocol compatibility or can we use a custom protocol?" | Constrains the architecture significantly |
| "Is self-hosted runners in scope, or just hosted?" | Changes the Actions security and scaling model |
| "Do we need to support monorepos (millions of files)?" | Adds partial clone, sparse checkout complexity |
| "Is code search across all public repos, or within a single org?" | Fundamentally different index sizes (2PB vs 100GB) |
| "What's the fork ratio? How many forks per popular repo?" | Drives the COW architecture discussion |

---

## Whiteboard Diagram

The diagram you'd draw in an interview (simplified version of the full architecture):

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Git Client  │     │  Web/API     │     │  Mobile      │
│  (SSH/HTTP)  │     │  Client      │     │  App         │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                     │                     │
       ▼                     ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  SSH Proxy   │     │  API Gateway  │     │  CDN         │
│  (Auth+Route)│     │  (Auth+Rate)  │     │  (Static)    │
└──────┬───────┘     └──────┬───────┘     └──────────────┘
       │                     │
       ▼                     ▼
┌──────────────────────────────────────────────────────┐
│              Application Services                      │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐       │
│  │ Repo   │  │ PR &   │  │ Actions│  │ Search │       │
│  │ Service│  │ Review │  │ Orch.  │  │ Engine │       │
│  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘       │
└──────┼───────────┼───────────┼───────────┼─────────────┘
       │           │           │           │
       ▼           ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Git      │ │ Relational│ │ Message  │ │ Search   │
│ Object   │ │ Database  │ │ Queue    │ │ Index    │
│ Store    │ │ (Metadata)│ │ (Events) │ │ (Trigram)│
└──────────┘ └──────────┘ └──────────┘ └──────────┘

Push → Object Store + Ref Update → Event → { Webhooks, CI, Search, Notify }
```

---

## "What Would You Do Differently at 10x Scale?"

| Current Scale | 10x Scale | Key Changes |
|--------------|-----------|------------|
| 500M repos | 5B repos | More storage shards; tiered storage (hot/warm/cold repos); archive inactive repos automatically |
| 50M pushes/day | 500M pushes/day | Shard git backends by region; pre-computed pack files for popular repos; CDN-served clone caching |
| 30M workflow runs/day | 300M runs/day | Distributed scheduler across regions; spot instance runners; aggressive caching (dependency, Docker layers) |
| 50M search queries/day | 500M queries/day | More index shards; query result caching; federated search across regional indexes |
| 3B webhooks/day | 30B webhooks/day | Webhook batching; push-based to pull-based for high-volume subscribers; webhook streaming API |
| 100PB storage | 1EB (exabyte) | Tiered storage; deduplication across repos (not just within fork networks); compression improvements |

---

## Quick Reference Card

### The 5-Sentence Architecture Summary

1. Git stores code as content-addressed objects (blobs, trees, commits) in a Merkle DAG, providing integrity verification and deduplication by design.
2. Forks share the parent repository's object store via COW semantics (Git alternates), saving petabytes of storage across 200M+ forked repositories.
3. All queryable metadata (PRs, issues, users, permissions) lives in a sharded relational database that serves as a derived index over the git data.
4. A single push emits an event that asynchronously triggers webhooks, CI workflows, search indexing, and notifications---keeping the push fast while enabling rich automation.
5. Code search uses trigram indexing across 200M+ repositories to support substring and regex matching, with ranking based on repository signals and code relevance.

### Key Numbers to Remember

| Metric | Value |
|--------|-------|
| Total repositories | 500M+ |
| Active users | 100M+ monthly |
| Git pushes | ~50M/day (~580/sec) |
| Read:write ratio (Git) | 10:1 |
| Actions workflow runs | ~30M/day |
| Webhook deliveries | ~3B/day |
| Fork storage savings | ~90% (COW) |
| Total storage | 100PB+ |
| Push latency (p50) | < 200ms |
| Search latency (p50) | < 100ms |
| Clone time-to-first-byte | < 500ms |
| Actions queue time (p50) | < 30s |
