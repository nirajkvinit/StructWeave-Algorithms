# Requirements & Estimations — Package Registry

## 1. Functional Requirements

### Core Features

| # | Requirement | Description |
|---|---|---|
| FR-1 | **Package Publishing** | Accept package archives (tarballs) with manifest metadata, validate structure and content, store immutably, and update the registry index |
| FR-2 | **Package Installation / Download** | Resolve requested package + version constraint to a specific version, return artifact bytes with integrity verification |
| FR-3 | **Version Management** | Enforce semantic versioning, support version ranges/constraints, prevent version overwrites, support deprecation and yanking |
| FR-4 | **Dependency Resolution** | Given a root package and its dependency tree, compute a complete, compatible set of package versions satisfying all constraints |
| FR-5 | **Search & Discovery** | Full-text search across package names, descriptions, keywords, and README content with relevance-ranked results |
| FR-6 | **Security Scanning** | Automatically scan every published version for malware, known vulnerabilities, typosquatting indicators, and license compliance |
| FR-7 | **User & Organization Management** | Support individual maintainers and organizational scopes with role-based access (owner, maintainer, read-only) |
| FR-8 | **Package Metadata API** | Serve package manifests including all published versions, dependency specifications, dist-tags (latest, next, beta), and integrity hashes |
| FR-9 | **Provenance & Signing** | Record and verify cryptographic provenance attestations linking published artifacts to their source repository and build system |
| FR-10 | **Audit Log** | Immutable log of all publish, deprecate, yank, ownership transfer, and access token events per package |
| FR-11 | **Webhooks & Notifications** | Notify downstream systems on new version publish, security advisory, or deprecation events |
| FR-12 | **Mirroring Protocol** | Enable read-only mirrors and private registry proxies to replicate package metadata and artifacts |

### Out of Scope

- Build system integration (CI/CD pipeline configuration)
- Package development tooling (linting, testing frameworks)
- Integrated development environment features
- Source code hosting and version control
- Package monetization or marketplace features
- Runtime dependency injection or module loading

---

## 2. Non-Functional Requirements

### Immutability & Integrity

| Requirement | Target | Rationale |
|---|---|---|
| **Version Immutability** | Published artifact bytes never change | Lockfile reproducibility, supply chain trust, CDN cacheability |
| **Content Addressing** | Every artifact identified by cryptographic hash (SHA-512) | Tamper detection, deduplication, integrity verification without trusting transport |
| **Unpublish Window** | ≤ 72 hours, only if zero dependents | Balances author control with ecosystem stability; after adoption, removal breaks builds |
| **Integrity Verification** | Client-side hash verification on every install | Detect tampering in transit or at CDN edge |

### Performance

| Requirement | Target | Rationale |
|---|---|---|
| **Metadata Fetch** | P50 < 20ms (CDN), P99 < 100ms (origin) | Dependency resolution requires fetching metadata for hundreds of packages |
| **Artifact Download** | P50 < 200ms for 100KB package (CDN) | Install speed directly impacts developer productivity and CI/CD pipeline duration |
| **Publish Latency** | P50 < 2s, P99 < 10s | Includes validation, virus scan initiation, storage, and index update |
| **Search Latency** | P50 < 100ms, P99 < 500ms | Interactive search in web UI and CLI autocomplete |
| **Dependency Resolution** | P50 < 1s, P99 < 5s for typical projects | Resolution of 500-1500 transitive dependencies with version constraints |
| **CDN Propagation** | < 5 minutes global | New version available at all edge PoPs within minutes of publish |

### Availability & Reliability

| Requirement | Target | Rationale |
|---|---|---|
| **Download Availability** | 99.99% (52.6 min downtime/year) | Registry downtime blocks every developer and CI/CD pipeline in the ecosystem |
| **Publish Availability** | 99.9% (8.76 hr downtime/year) | Publish is less frequent; brief outages are tolerable |
| **Search Availability** | 99.5% | Degraded search doesn't block installs |
| **Data Durability** | 99.999999999% (11 nines) | Losing a published package version is catastrophic—millions of lockfiles reference it |
| **RPO (Recovery Point)** | 0 (zero data loss for published artifacts) | Artifacts are immutable and must survive any failure |
| **RTO (Recovery Time)** | < 15 minutes for metadata; < 5 minutes for CDN failover | CDN continues serving cached artifacts during origin outages |

### Security

| Requirement | Target | Rationale |
|---|---|---|
| **Malware Detection** | < 10 min from publish to scan completion | Minimize window of exposure for malicious packages |
| **False Positive Rate** | < 0.1% for malware scans | Avoid blocking legitimate publishes |
| **2FA Enforcement** | Mandatory for packages with > 1M weekly downloads | Protect high-impact packages from account takeover |
| **Token Granularity** | Per-package, per-scope, time-limited, IP-restricted | Minimize blast radius of token compromise |

---

## 3. Capacity Estimations

### Traffic Model (Large Registry — npm-scale)

| Parameter | Value | Derivation |
|---|---|---|
| Total packages | 3,000,000 | Historical growth: ~500K new packages/year |
| Total versions | 50,000,000 | ~17 versions per package on average |
| Monthly downloads | 200,000,000,000 (200B) | npm reported 184B in late 2023, growing ~15%/year |
| Daily downloads | 6,700,000,000 | 200B / 30 |
| Peak download RPS | 150,000 | ~2× average (77,500 avg), peaks during US/EU business hours |
| Daily publishes | 50,000 | ~1,500 new packages + ~48,500 new versions per day |
| Peak publish RPS | 5 | Publishes are relatively rare and bursty |
| Unique daily users | 20,000,000 | Developers + CI/CD pipelines |

### Storage Estimates

| Component | Calculation | Estimate |
|---|---|---|
| **Artifact Storage** | 50M versions × 150 KB avg = 7.5 TB raw | **~8 TB** (with overhead) |
| **Artifact Storage (deduplicated)** | ~40% deduplication ratio across versions | **~5 TB** effective |
| **Metadata (all versions)** | 50M versions × 2 KB manifest = 100 GB | **~100 GB** |
| **Package-level metadata** | 3M packages × 50 KB (all versions aggregated) = 150 GB | **~150 GB** |
| **Search index** | 3M packages × 5 KB indexed content = 15 GB | **~15 GB** |
| **Audit logs** | 50K events/day × 1 KB × 365 days × 5 years = 91 GB | **~100 GB** |
| **Security scan results** | 50M versions × 500 bytes = 25 GB | **~25 GB** |
| **Provenance attestations** | 50M versions × 2 KB = 100 GB | **~100 GB** |
| **Total storage** | Sum of above | **~8.5 TB** artifacts + **~500 GB** metadata |

### Bandwidth Estimates

| Component | Calculation | Estimate |
|---|---|---|
| **Monthly download bandwidth** | 200B downloads × 150 KB avg | **~30 PB/month** |
| **Daily download bandwidth** | 30 PB / 30 | **~1 PB/day** |
| **Peak bandwidth** | 150K RPS × 150 KB | **~22.5 GB/s** (~180 Gbps) |
| **CDN cache hit ratio** | Top 1% packages serve 80% of traffic | **>98% CDN hit rate** |
| **Origin bandwidth** | 2% of total | **~600 TB/month** |
| **Metadata bandwidth** | 200B × 2 KB metadata fetch overhead | **~400 TB/month** |

### Compute Estimates

| Component | Calculation | Estimate |
|---|---|---|
| **API servers (download)** | 150K RPS / 5K RPS per node | **~30 origin nodes** (CDN serves 98%) |
| **API servers (publish)** | 5 RPS peak, CPU-intensive validation | **~5 publish nodes** |
| **Security scanners** | 50K publishes/day, 30s avg scan = 17 scanner-hours/day | **~5 scanner nodes** |
| **Search indexing** | 50K index updates/day, near-real-time | **~3 search nodes** |
| **Dependency graph workers** | Continuous graph analysis and vulnerability propagation | **~3 graph nodes** |

---

## 4. SLOs and SLAs

### SLO Definitions

| SLO | Target | Measurement | Error Budget |
|---|---|---|---|
| **Download Success Rate** | 99.99% | Successful HTTP 200 responses / total download requests | 20K failures per 200M daily downloads |
| **Publish Success Rate** | 99.9% | Successful publishes / total publish attempts (excluding validation errors) | 50 failures per 50K daily publishes |
| **Metadata Freshness** | 99.9% of new versions queryable within 5 min | Time from publish acknowledgment to version appearing in metadata API | 50 delayed versions/day |
| **Download Latency (P99)** | < 500ms | Time from request to first byte (CDN-served) | 0.1% of downloads exceed 500ms |
| **Search Relevance** | Top result is correct package for exact-name queries 99% of the time | Manual + automated relevance evaluation | 1% misranked exact queries |
| **Security Scan Completion** | 99% of publishes scanned within 10 minutes | Time from publish to scan verdict available | 500 delayed scans/day |

### SLA Tiers

| Tier | Availability | Support | Use Case |
|---|---|---|---|
| **Public (Free)** | 99.9% monthly | Community forums, status page | Individual developers, open-source projects |
| **Pro** | 99.95% monthly | Email support, 24hr response | Small teams, startup CI/CD |
| **Enterprise** | 99.99% monthly | Dedicated support, 1hr response, private registry option | Large organizations, regulated industries |

---

## 5. CAP Theorem Positioning

### Write Path (Publish)

**CP — Consistency over Availability**

Publishing a package version must be strongly consistent: two concurrent publishes of the same version must result in exactly one success and one conflict error. Version uniqueness is a hard constraint—if two CI/CD pipelines race to publish `pkg@1.2.3`, exactly one must win. This requires linearizable writes to the version registry, typically achieved via a single-leader database with unique constraints.

### Read Path (Install/Download)

**AP — Availability over strict Consistency**

Package downloads prioritize availability. A brief window where a newly published version isn't yet visible at all CDN edges (eventual consistency, < 5 min) is far preferable to download failures. CDN edge caches may serve slightly stale metadata, but artifact bytes are immutable so cache coherence is trivially guaranteed for artifacts.

### Resolution

The metadata-artifact split enables different consistency models per path:
- **Artifact bytes**: Immutable → no consistency problem; cache forever
- **Version list**: Eventually consistent (< 5 min); CDN TTL controls freshness
- **Publish/unpublish**: Strongly consistent; single-leader writes
- **Download counts**: Eventually consistent; approximate aggregation is acceptable

---

## 6. Key Constraints and Assumptions

| Constraint | Impact |
|---|---|
| **Immutability is non-negotiable** | No update-in-place for artifacts; content-addressable storage; CDN can cache with infinite TTL |
| **Semver is the primary versioning scheme** | Version constraint algebra (^, ~, >=, <, ||) must be formally parsed and evaluated |
| **Package names are globally unique** | First-come-first-served within a namespace; scoped packages (@org/name) partition the namespace |
| **Ecosystem compatibility** | Must support existing package manager protocols (npm registry API, PyPI Simple API, Maven repository layout) |
| **Security scanning is non-blocking** | Publish completes before scan finishes; malicious packages are quarantined retroactively |
| **CDN is the primary serving layer** | Origin servers handle < 2% of download traffic; design for CDN-first |
| **Dependency graphs are acyclic** | Circular dependencies are rejected at publish time (enforced per-ecosystem) |
