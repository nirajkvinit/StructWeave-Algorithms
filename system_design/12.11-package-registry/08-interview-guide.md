# Interview Guide — Package Registry

## 1. Interview Pacing (45-Minute Format)

| Phase | Duration | Focus | Deliverables |
|---|---|---|---|
| **Requirements** | 5 min | Clarify scope: single ecosystem or multi? Scale? Security posture? | FR list, NFR priorities, scale numbers |
| **High-Level Design** | 10 min | Metadata-artifact split, CDN-first architecture, publish/install flows | Architecture diagram, data flow |
| **Deep Dive: Immutability & Storage** | 8 min | Content-addressable blob storage, version uniqueness, CDN caching strategy | Storage architecture, caching model |
| **Deep Dive: Security Pipeline** | 8 min | Scan pipeline, typosquatting detection, provenance, dependency confusion | Security architecture, threat model |
| **Dependency Resolution** | 7 min | NP-completeness, SAT solving / PubGrub, resolution performance | Algorithm sketch, complexity discussion |
| **Scale & Reliability** | 5 min | CDN economics, hot package mitigation, origin failover | Scaling strategy, failure modes |
| **Wrap-Up** | 2 min | Trade-offs summary, questions for interviewer | Clear articulation of design decisions |

### Phase-by-Phase Strategy

**Requirements phase (5 min):** Open by establishing the two fundamental properties that define a package registry: **immutability** (published versions never change) and **supply chain trust** (the registry is the root of trust for all downstream software). Then ask clarifying questions:

- Single ecosystem (npm-style) or multi-ecosystem (supporting multiple languages)?
- What's the expected scale? Millions of packages? Billions of downloads/month?
- Is this a public open registry or a private enterprise registry?
- How critical is security scanning? Just malware, or also supply chain provenance?
- Do we need dependency resolution on the server side, or is that client-side?

Establish scale: 3M packages, 50M versions, 200B downloads/month, 50K publishes/day.

**High-level design (10 min):** Draw the metadata-artifact split architecture immediately—this is the single most important architectural decision. Name the key components:

1. **CDN / Edge Layer** — serves 98%+ of download traffic, global PoPs
2. **Download API** — metadata and artifact serving (CDN origin)
3. **Publish API** — authenticated write path with validation pipeline
4. **Blob Storage** — content-addressed, immutable artifact storage
5. **Metadata Store** — packages, versions, dependencies, users (relational DB)
6. **Security Pipeline** — async scanning: malware, typosquatting, provenance verification
7. **Search Service** — full-text search with popularity-weighted ranking
8. **Transparency Log** — append-only cryptographic log of all publish events

Show both flows: **Publish** (author → auth → validate → store blob → write metadata → enqueue scan → respond) and **Install** (client → CDN → metadata fetch → resolve deps → download artifacts → verify integrity).

**Deep dive: Immutability & Storage (8 min):** This is where you demonstrate systems depth. Explain:

- **Content-addressable storage**: artifacts keyed by SHA-512 hash, enabling deduplication, tamper detection, and infinite CDN TTL
- **Version uniqueness**: database-level unique constraint on `(package_name, version)`, enforced transactionally
- **Unpublish policy**: time-bounded window (≤72h, zero dependents), never allowed for adopted packages — explain why
- **CDN caching model**: artifacts get `Cache-Control: immutable` (infinite TTL), metadata gets 5-minute TTL with `stale-while-revalidate`
- **Integrity verification**: every client verifies SHA-512 hash against lockfile/metadata on every install

**Deep dive: Security Pipeline (8 min):** Supply chain security is the differentiating concern. Cover:

- **Async scanning**: non-blocking publish → scan → quarantine-on-detection
- **Typosquatting detection**: edit distance, keyboard adjacency, homoglyph comparison against top 50K packages
- **Dependency confusion**: scoped namespaces prevent public/private name collision
- **Sigstore/provenance**: keyless signing via OIDC, transparency log, SLSA attestation
- **Malware scanning**: install script analysis, behavioral sandbox, YARA signatures

**Dependency resolution (7 min):** Show you understand this is an NP-complete problem:

- The problem is reducible to 3-SAT (proven in 2005)
- Production resolvers use CDCL (conflict-driven clause learning) or PubGrub
- PubGrub advantage: human-readable error messages when resolution fails
- Real-world optimization: version ordering heuristics, metadata prefetching, partial solution caching
- Lockfiles bypass resolution entirely (just verify + download)

**Scale & reliability (5 min):** Focus on CDN economics:

- 30 PB/month bandwidth cannot be served from origin
- CDN absorbs 98%+ of traffic; origin handles only 600 TB/month
- Origin shield pattern prevents cache stampede
- Hot package preloading (top 300 packages pushed to all PoPs)
- CDN-as-bunker: during origin outage, CDN serves cached content with stale headers

---

## 2. Meta-Commentary

### What Makes This System Unique in Interviews

**1. Immutability is the architectural foundation, not an afterthought.** Most systems use mutable data as the default. A package registry inverts this: published artifact bytes are permanently immutable. This single property enables content-addressable storage, infinite CDN TTL, lockfile reproducibility, and supply chain integrity. When the interviewer asks about updates, the answer is "you don't update; you publish a new version."

**2. The security model protects the ecosystem, not just the system.** Unlike most systems where security protects the system from users, a package registry must protect all users from each other. A single malicious package can compromise millions of downstream applications. This makes supply chain security (typosquatting, dependency confusion, provenance) a first-order architectural concern, not a feature.

**3. Download scale dwarfs most systems candidates have encountered.** 200B downloads/month puts this in the top tier of internet-scale systems. The interviewer wants to see that you recognize CDN is not optional—it's the primary serving infrastructure. Origin servers are just the "system of record" that CDN falls back to.

**4. Dependency resolution is a genuine computer science problem.** Most system design interviews focus on distributed systems. This question uniquely tests algorithmic knowledge: NP-completeness, SAT solving, constraint satisfaction. Candidates who can discuss PubGrub, CDCL, and version constraint algebra stand out.

---

## 3. Trade-offs Discussion

| Trade-off | Option A | Option B | Discussion Points |
|---|---|---|---|
| **Immutability vs Unpublish** | Never allow unpublish (Maven model) | Time-bounded unpublish (npm model) | Maven prioritizes ecosystem stability; npm balances with author control. Discuss the `left-pad` incident (2016): single unpublish broke thousands of builds. |
| **Blocking vs Async Scan** | Block publish until scan completes | Publish immediately, scan async | Blocking adds 30s-5min latency to every publish. Async has a ~10min malware exposure window. Which risk is worse? |
| **Client-side vs Server-side Resolution** | Resolver runs in client (npm, cargo) | Resolver runs on server | Client-side: no server compute cost, works offline. Server-side: can cache resolution results, ensures reproducibility across clients. |
| **Flat vs Scoped Namespaces** | Flat namespace (`lodash`) | Scoped (`@org/lodash`) | Flat: simpler, short names, but enables dependency confusion. Scoped: verbose, but prevents namespace attacks. npm uses both. |
| **CDN Freshness vs Latency** | Short TTL (1 min) — always fresh | Long TTL (1 hour) — always fast | Artifacts are immutable → infinite TTL. Metadata needs balance: 5-min TTL + stale-while-revalidate is the standard approach. |
| **Per-version vs Per-package Security** | Scan every version independently | Scan package holistically (diff-based) | Per-version is thorough but expensive. Diff-based is faster for patch releases but might miss cross-version attacks. |

---

## 4. Trap Questions

| Trap | Why It's a Trap | Strong Answer |
|---|---|---|
| **"How would you handle a package update?"** | There are no updates. Artifacts are immutable. | "Published versions are immutable. To change code, you publish a new version. The old version remains available forever. This is a fundamental design constraint, not a limitation—it enables content-addressable storage, CDN caching, and lockfile reproducibility." |
| **"Can't you just use a relational database for everything?"** | Conflates metadata (relational) with artifacts (blob storage) | "Metadata (packages, versions, dependencies) goes in a relational DB for transactional integrity. Artifacts (tarballs) go in content-addressed blob storage for immutability and deduplication. Serving 200B downloads/month requires CDN, not database queries." |
| **"Just use greedy resolution—pick the latest version"** | Ignores that dependency resolution is NP-complete | "Greedy resolution fails on diamond dependency conflicts where two packages require incompatible versions of a shared dependency. Real resolvers use SAT-solving techniques (PubGrub, CDCL) with backtracking and conflict learning." |
| **"Why not scan before publishing?"** | Sounds safer but has massive UX cost | "Blocking scans add 30s-5min to every publish. 99.9%+ of publishes are legitimate. The async approach limits malware exposure to ~10 minutes while keeping publish instant. Critical-path scanning would slow the entire ecosystem." |
| **"How would you delete a malicious package?"** | Tests understanding of immutability trade-offs | "We quarantine, not delete. The version is marked as quarantined in metadata, removed from resolution candidates, and CDN cache is purged. The artifact blob may be retained for forensic analysis. Dependents are notified. We never silently delete—that breaks lockfiles." |
| **"Why not store everything in the CDN?"** | CDN is a cache, not a database | "CDN caches content but doesn't guarantee persistence. CDN PoPs evict content under storage pressure. The blob storage is the source of truth with multi-region replication and 11-nines durability. CDN is a serving optimization, not a storage solution." |
| **"How do you handle circular dependencies?"** | Tests understanding of dependency graph constraints | "Most ecosystems explicitly forbid circular dependencies (directed acyclic graph requirement). The publish validator rejects packages that would create cycles. In ecosystems that allow them (rare), the resolver must detect cycles and either break them deterministically or report an error." |

---

## 5. Common Mistakes

| Mistake | Why It's Wrong | What to Do Instead |
|---|---|---|
| **Ignoring CDN** | Origin cannot serve 200B downloads/month | Make CDN the primary serving layer from the start; design origin as fallback |
| **Mutable artifacts** | Breaks lockfile reproducibility, CDN caching, supply chain trust | Enforce immutability as a hard architectural constraint |
| **Skipping security scanning** | Supply chain security is THE differentiating concern for package registries | Discuss the async scan pipeline, typosquatting, dependency confusion, provenance |
| **Treating resolution as trivial** | Dependency resolution is NP-complete | Acknowledge the complexity; discuss SAT solving or PubGrub; cover error messages |
| **No content addressing** | Loses deduplication, tamper detection, and CDN optimization | Key artifacts by cryptographic hash (SHA-512) |
| **Synchronous download counting** | Can't do atomic increment at 150K RPS | Use in-memory batching with periodic flush to time-series store |
| **Flat namespace only** | Enables dependency confusion attacks | Support scoped namespaces (@org/pkg) for organizational ownership |
| **No transparency log** | No way to audit or detect unauthorized publishes | Append-only Merkle tree log for all publish events |

---

## 6. Questions to Ask the Interviewer

These questions demonstrate depth and clarify scope:

1. **"Should we support a single ecosystem (npm-style) or multiple package formats?"** — Determines data model complexity and whether the manifest schema is fixed or extensible.

2. **"Is server-side dependency resolution required, or do clients resolve locally?"** — Major architectural difference: server-side requires maintaining resolution state; client-side pushes compute to the edge.

3. **"What's the unpublish policy?"** — Tests whether the interviewer wants Maven-style (never unpublish) or npm-style (time-bounded window). Each has dramatically different implications for immutability guarantees.

4. **"Are we designing the public registry or also supporting private registries/mirrors?"** — If private registries are in scope, need to design a mirroring protocol and handle dependency confusion across public/private boundaries.

5. **"How important is provenance attestation? Is this a post-2024 security-conscious design?"** — Signals awareness of SLSA, Sigstore, and modern supply chain security practices.

6. **"Should we discuss the CDN contract details, or can we assume a CDN exists as a black box?"** — Clarifies whether the interviewer wants depth on CDN edge caching, origin shields, and cache invalidation.

---

## 7. Scoring Rubric (What Interviewers Look For)

| Signal | Junior | Mid-Level | Senior/Staff |
|---|---|---|---|
| **Architecture** | "Upload files and serve them" | Metadata-artifact split, basic CDN | Content-addressed storage, CDN tiers, origin shield, metadata materialization |
| **Immutability** | Not mentioned | "Versions can't be changed" | Explains why immutability enables CDN, lockfiles, integrity verification, and trust |
| **Security** | "We'll scan for viruses" | Discusses malware scanning | Full supply chain security: provenance, typosquatting, dependency confusion, Sigstore, transparency log |
| **Resolution** | "Pick the latest version" | Acknowledges version constraints | Discusses NP-completeness, PubGrub/CDCL, conflict-driven learning, error messages |
| **Scale** | Single server | "We need a CDN" | CDN economics (30 PB/month), hot package mitigation, origin shield, stale-while-revalidate, download counter batching |
| **Trade-offs** | No trade-off discussion | 1-2 trade-offs mentioned | Immutability vs unpublish, blocking vs async scan, client vs server resolution, flat vs scoped namespaces |
