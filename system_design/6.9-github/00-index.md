# GitHub --- Git Hosting, Pull Requests, Actions, Code Search

## System Overview

GitHub is a developer platform built around Git version control that provides collaborative code hosting, pull request-based code review, CI/CD automation (Actions), and large-scale code search. At its core, GitHub wraps the Git content-addressable object store with web-based collaboration primitives---pull requests, issues, projects---and extends it with a distributed task execution system (Actions) and a code search engine indexing 200M+ repositories. The system must handle bursty git operations (pushes, clones, fetches) with sub-second latency, orchestrate millions of concurrent CI/CD workflow runs, and serve code search across petabytes of source code while maintaining strong durability guarantees for git data (every commit is sacred) and eventual consistency for derived data (search indexes, CI status).

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Read-heavy for fetches/clones (10:1 read:write); write-heavy for CI/CD event processing |
| **Latency Sensitivity** | High for git operations (<500ms push, <2s clone start); moderate for search (<200ms); tolerant for CI/CD (seconds) |
| **Consistency Model** | Strong consistency for git refs (linearizable ref updates); eventual consistency for search indexes, CI status |
| **Concurrency Level** | Thousands of concurrent pushes per second; millions of concurrent workflow runs |
| **Data Volume** | 500M+ repositories, 3B+ git objects/day created, 100PB+ total storage |
| **Architecture Model** | Service-oriented with Git object store as the foundational data layer |
| **Offline Support** | Git is inherently offline-first; server is the coordination point for collaboration features |
| **Complexity Rating** | **Very High (9/10)** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Git object model, data schemas, API design, merge algorithms |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Pack files, monorepos, fork graphs, Actions lifecycle, search at scale |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Sharding, replication, autoscaling, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Auth, secret scanning, dependency scanning, supply chain security |
| [07 - Observability](./07-observability.md) | Metrics, tracing, logging, alerting, dashboards |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs, whiteboard diagrams |
| [09 - Insights](./09-insights.md) | Key architectural insights and non-obvious lessons |

---

## What Makes This System Unique

1. **Git as the Foundation**: Unlike most web applications that design their data model from scratch, GitHub builds on top of Git's content-addressable object store---a Merkle DAG of blobs, trees, and commits. This immutable, content-addressed foundation provides natural deduplication, integrity verification, and a distributed replication model, but imposes constraints on how data is accessed and indexed.

2. **Fork Graph and Copy-on-Write Semantics**: Forks don't copy repository data. A fork shares the same object store as its upstream repository, with new objects added only when the fork diverges. This copy-on-write model saves petabytes of storage but creates complex object ownership, garbage collection, and access control challenges.

3. **Actions as a Distributed Task Execution System**: CI/CD workflows are event-driven, heterogeneous task graphs executed on ephemeral runners. The system must schedule millions of concurrent jobs across different operating systems, architectures, and security contexts while providing deterministic caching and artifact management.

4. **Code Search Across 200M+ Repositories**: Searching all public code requires a custom search engine with trigram indexing, incremental index updates, and ranking algorithms that balance code relevance with repository signals (stars, recency, language).

5. **Git Protocol as an API**: Unlike typical REST/GraphQL APIs, a significant portion of traffic uses the Git smart HTTP and SSH protocols---binary, stateful, streaming protocols that require specialized handling at the load balancer and application layers.

---

## Algorithm & Approach Comparison

| Problem | Approach A | Approach B | GitHub's Approach |
|---------|-----------|-----------|-------------------|
| **Object storage** | One file per object (loose) | Pack files with delta compression | Hybrid: loose objects for recent writes, periodic packing |
| **Merge strategy** | 3-way merge | Recursive merge with rename detection | Recursive merge (default), squash, rebase options |
| **Search indexing** | Inverted index (token-based) | Trigram index (substring matching) | Trigram index with symbol extraction and ranking |
| **Ref updates** | Optimistic locking (CAS) | Pessimistic locking | Compare-and-swap on ref values |
| **CI/CD orchestration** | Centralized scheduler | Distributed worker pools | Event-driven with distributed runner pools and job queuing |
| **Fork storage** | Full copy per fork | Shared object store (COW) | Shared object store with alternates |

---

## Key Technology References

| Component | Real-World Example |
|-----------|-------------------|
| Git object store | Content-addressable Merkle DAG (SHA-256 transition) |
| Pack file format | Git pack-objects, delta compression, multi-pack indexes |
| Merge algorithms | 3-way merge, recursive merge, patience diff |
| Code search | Trigram indexing (inspired by Zoekt/Sourcegraph), semantic search |
| CI/CD orchestration | Event-driven DAG execution, ephemeral containers |
| API layer | REST v3, GraphQL v4, Git smart HTTP/SSH protocols |
| Webhook delivery | At-least-once delivery with exponential backoff |

---

## Prerequisites & Related Designs

| Related Design | Relationship |
|---------------|-------------|
| Distributed File System | Git object storage shares content-addressable design principles |
| Task Queue / Job Scheduler | Actions builds on distributed task execution patterns |
| Search Engine | Code search is a specialized search engine problem |
| CDN / Edge Caching | Release assets, clone caching, and static content delivery |
| Event-Driven Architecture | Webhooks, Actions triggers, and notification fan-out |

---

## Sources

- Git Internals documentation (git-scm.com)
- GitHub Engineering Blog --- scaling git infrastructure, Actions architecture, code search
- GitHub Code Search technical deep-dive (2023)
- Git protocol specification (pack protocol, smart HTTP, SSH)
- GitHub API documentation (REST v3, GraphQL v4)
- Industry statistics: 100M+ developers, 400M+ repositories (2024-2025)
- Open-source search engines: Zoekt (trigram-based code search)
- Git hash function transition plan (SHA-1 to SHA-256)
- Distributed systems papers on content-addressable storage and Merkle trees
