# 12.11 Package Registry

## System Overview

A Package Registry is a centralized artifact repository that enables software developers to publish, discover, install, and manage reusable code packages—functioning as the backbone of modern software supply chains across ecosystems like JavaScript, Python, Java, Rust, and Go. Production registries serving millions of packages and hundreds of billions of monthly downloads must guarantee immutability of published versions, sub-100ms metadata resolution, globally distributed artifact delivery through CDN, real-time security scanning for malware and vulnerabilities, cryptographic provenance verification, and dependency resolution for graphs containing millions of transitive relationships—all while defending against supply chain attacks including typosquatting, dependency confusion, account takeover, and malicious package injection that could compromise millions of downstream applications with a single poisoned release.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Architecture Style** | Metadata-artifact split architecture with immutable blob storage, global CDN edge distribution, and event-driven security scanning pipeline |
| **Core Abstraction** | Versioned package—an immutable, content-addressed archive (tarball) paired with mutable metadata (download counts, deprecation flags, security advisories) and a dependency specification |
| **Processing Model** | Synchronous publish with async security scanning; read-heavy install path served from CDN edge with registry fallback; background indexing for search and dependency graph analysis |
| **Immutability Model** | Append-only versioning—once published, a version's artifact bytes are permanently immutable; metadata (deprecation, security advisories) is mutable; unpublish is time-bounded (≤72 hours for npm-style, never for Maven-style) |
| **Security Posture** | Supply chain security by default—package signing, provenance attestation (SLSA), automated malware scanning, typosquatting detection, two-factor enforcement for critical packages, and transparency log for all publish events |
| **Data Consistency** | Strong consistency for publish operations (version uniqueness guarantee); eventual consistency for download counts, search index, and CDN propagation; causal consistency for dependency resolution metadata |
| **Availability Target** | 99.99% for package downloads (CDN-served); 99.9% for publish API; 99.5% for search and discovery |
| **Latency Targets** | < 50ms metadata fetch (CDN hit); < 200ms metadata fetch (origin); < 500ms publish acknowledgment; < 2s full dependency tree resolution for typical projects |
| **Scalability Model** | CDN-first read path scales to petabytes of monthly transfer; horizontally scaled stateless API tier for writes; partitioned metadata store by package namespace; blob storage with content-addressable deduplication |

---

## Quick Navigation

| Document | Focus Area |
|---|---|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning at npm-scale, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, publish/install data flow, key design decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API contracts, dependency resolution algorithm, version constraint solving |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Dependency resolution engine, security scanning pipeline, CDN serving at scale |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | CDN economics at 200B+ downloads/month, hot package mitigation, immutability during failures |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Supply chain security, Sigstore integration, typosquatting detection, dependency confusion prevention |
| [07 - Observability](./07-observability.md) | Download analytics, security alert pipeline, publish audit trail, ecosystem health metrics |
| [08 - Interview Guide](./08-interview-guide.md) | 45-minute pacing, trap questions, trade-offs, common mistakes |
| [09 - Insights](./09-insights.md) | Key architectural insights and cross-cutting patterns |

---

## What Differentiates This System

| Dimension | Naive Package Host | Production Package Registry |
|---|---|---|
| **Storage** | Store tarballs on a file server with version directories | Content-addressed immutable blob storage with integrity verification, deduplication, and multi-region replication |
| **Downloads** | Serve files directly from origin servers | CDN-first architecture with edge caching, stale-while-revalidate, and regional failover serving 200B+ downloads/month |
| **Versioning** | Allow overwriting published versions | Strict immutability—once published, artifact bytes never change; version can only be deprecated or yanked, never modified |
| **Security** | Scan packages on complaint | Automated pipeline: static analysis, malware detection, typosquatting scoring, provenance verification, and SBOM generation on every publish within minutes |
| **Dependency Resolution** | Resolve greedily with latest versions | SAT-solver-based resolution with conflict-driven clause learning, backtracking across version constraints, and lockfile reproducibility |
| **Authentication** | Username/password for publish | Scoped API tokens with IP allowlisting, mandatory 2FA for high-impact packages, OIDC-based keyless signing for CI/CD |
| **Search** | SQL LIKE queries on package names | Full-text search with relevance ranking, download-weighted scoring, quality signals, maintenance metrics, and ecosystem categorization |
| **Availability** | Single server, single point of failure | Multi-region active-active for reads, single-leader for writes with automated failover, CDN absorbs 99%+ of read traffic |

---

## What Makes This System Unique

### 1. Immutability as Architectural Foundation

Unlike most systems where data is routinely updated, a package registry's core invariant is that published artifact bytes are permanently immutable. This isn't just a policy—it's an architectural commitment that enables content-addressable storage, CDN caching without invalidation complexity, lockfile reproducibility, and supply chain integrity verification. The entire trust model of downstream software depends on the guarantee that `package@1.2.3` today contains exactly the same bytes as `package@1.2.3` yesterday. Violating this invariant doesn't just cause bugs—it undermines the security of every application that depends on the package.

### 2. Dependency Resolution Is NP-Complete

Package dependency resolution—finding a compatible set of versions satisfying all constraints across a transitive dependency graph—is provably NP-complete (reducible to 3-SAT). Real-world dependency graphs with millions of packages and complex version constraints (ranges, exclusions, optional dependencies, peer dependencies) cannot be solved by simple greedy algorithms. Production resolvers use techniques from SAT solver research: conflict-driven clause learning (CDCL), unit propagation, backjumping, and heuristic variable ordering. The PubGrub algorithm (used by Dart and Rust) provides human-readable error messages when resolution fails—a crucial UX consideration when version conflicts arise.

### 3. The Download Volume Dwarfs Most Internet Services

A top-tier package registry serves 200+ billion downloads per month—roughly 75,000 requests per second sustained, with peaks exceeding 150,000 RPS. This puts it in the same traffic tier as major CDN customers. The economics of serving this traffic are dominated by bandwidth costs, making CDN strategy, compression, content-addressable deduplication, and regional caching architecture first-order design concerns rather than afterthoughts.

### 4. Supply Chain Security Is an Existential Concern

A single malicious package version can compromise millions of downstream applications within hours of publication. Unlike traditional security where you protect your own system, a package registry must protect its entire ecosystem. This creates unique requirements: cryptographic provenance attestation, transparency logs for every publish event, automated malware scanning before availability, typosquatting detection using edit distance algorithms, dependency confusion prevention via namespace scoping, and coordinated vulnerability disclosure with CVE database integration.

---

## Complexity Rating

| Dimension | Rating | Notes |
|---|---|---|
| **Security** | ★★★★★ | Supply chain attacks, malware scanning, provenance verification, typosquatting, dependency confusion |
| **Scale** | ★★★★★ | 200B+ downloads/month, petabytes of bandwidth, millions of packages |
| **Data Modeling** | ★★★★☆ | Complex dependency graphs, version constraint algebra, metadata vs artifact separation |
| **Infrastructure** | ★★★★☆ | Global CDN, multi-region blob storage, content-addressable deduplication |
| **Algorithms** | ★★★★☆ | NP-complete dependency resolution, SAT solving, semver constraint satisfaction |
| **Domain Complexity** | ★★★★☆ | Multi-ecosystem semantics (npm, PyPI, Maven have different resolution rules), backward compatibility guarantees |

---

## Key Trade-offs at a Glance

| Trade-off | Dimension A | Dimension B | Typical Resolution |
|---|---|---|---|
| **Immutability vs Unpublish** | Permanent immutability (strongest guarantees) | Allow unpublish (author control) | Time-bounded unpublish window (≤72h) if no dependents; permanent after adoption; Maven model forbids unpublish entirely |
| **Sync vs Async Security Scanning** | Block publish until scan completes (safest) | Publish immediately, scan async (faster) | Publish immediately to staging; promote to public index after scan passes; quarantine on failure |
| **CDN Freshness vs Latency** | Aggressive caching (low latency, stale risk) | Short TTLs (fresh data, higher origin load) | Tiered TTLs: metadata 5-60min, artifacts infinite (immutable), stale-while-revalidate for metadata |
| **Flat vs Scoped Namespaces** | Flat namespace (simple, npm v1 style) | Scoped namespaces (@org/pkg) | Scoped namespaces prevent dependency confusion and enable organizational ownership |
| **Greedy vs Complete Resolution** | Greedy resolution (fast, may miss valid solutions) | SAT-based complete resolution (correct, slower) | SAT-based with heuristic ordering for common cases; timeout with greedy fallback for pathological graphs |
| **Central vs Federated Registry** | Single authoritative registry (consistency) | Federated mirrors (resilience, latency) | Central authority for publish; read-through caching proxies and CDN for downloads; mirror protocol for offline/private use |

---

## Scale Reference Points

| Metric | Small Registry | Medium Registry | Large Registry (npm-scale) |
|---|---|---|---|
| Total packages | 10K | 500K | 3M+ |
| Total versions | 100K | 5M | 50M+ |
| Monthly downloads | 10M | 5B | 200B+ |
| Peak download RPS | 50 | 5,000 | 150,000+ |
| Artifact storage | 100 GB | 10 TB | 500 TB+ |
| Avg package size | 50 KB | 100 KB | 150 KB |
| Daily publishes | 100 | 5,000 | 50,000+ |
| Avg dependency depth | 3 | 8 | 12+ |
| Unique daily installers | 1K | 500K | 20M+ |
| CDN bandwidth/month | 500 GB | 50 TB | 5 PB+ |

---

## Technology Landscape

| Component | Technology Options | Selection Criteria |
|---|---|---|
| **Artifact Storage** | Content-addressed blob storage, object storage with integrity checks | Immutability guarantees, deduplication ratio, multi-region replication |
| **Metadata Store** | Relational database (packages, versions, users), document store (package manifests) | Query patterns, transactional guarantees for publish, read scalability |
| **Search** | Full-text search engine with relevance ranking | Index size, query latency, faceted search support, real-time indexing |
| **CDN** | Global CDN with edge caching, stale-while-revalidate | PoP count, bandwidth pricing, purge latency, custom origin logic |
| **Security Scanning** | Static analysis engine, malware signature database, behavioral sandbox | Scan latency, false positive rate, language coverage |
| **Dependency Resolution** | PubGrub, CDCL SAT solver, backtracking with conflict learning | Resolution completeness, error message quality, performance on large graphs |
| **Package Signing** | Sigstore (keyless), PGP, TUF (The Update Framework) | Key management complexity, CI/CD integration, transparency log support |
| **Message Queue** | Distributed message broker for async scanning pipeline | Throughput, ordering guarantees, dead letter support |
| **Cache** | Distributed cache for metadata, local cache for hot packages | Hit rate, eviction policy, memory efficiency |
| **Transparency Log** | Append-only tamper-evident log (Merkle tree based) | Audit requirements, verification cost, storage growth |
