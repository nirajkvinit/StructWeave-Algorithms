# High-Level Design — Package Registry

## 1. System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        CLI["Package Manager CLI<br/>(npm, pip, cargo)"]
        WEB["Web Interface"]
        CICD["CI/CD Pipelines"]
        MIRROR["Registry Mirrors"]
    end

    subgraph Edge["CDN / Edge Layer"]
        CDN["Global CDN<br/>(200+ PoPs)"]
        EDGE_CACHE["Edge Cache<br/>(artifacts + metadata)"]
    end

    subgraph Gateway["API Gateway Layer"]
        LB["Load Balancer"]
        AUTH["Auth Service<br/>(tokens, 2FA, OIDC)"]
        RATE["Rate Limiter"]
        DOWNLOAD_API["Download API"]
        PUBLISH_API["Publish API"]
        SEARCH_API["Search API"]
        METADATA_API["Metadata API"]
    end

    subgraph Core["Core Services"]
        PUBLISH_SVC["Publish Service"]
        RESOLVE_SVC["Resolution Service"]
        REGISTRY_SVC["Registry Service"]
        SEARCH_SVC["Search Service"]
        WEBHOOK_SVC["Webhook Service"]
    end

    subgraph Security["Security Pipeline"]
        SCAN_QUEUE["Scan Queue"]
        MALWARE["Malware Scanner"]
        VULN["Vulnerability Analyzer"]
        TYPO["Typosquatting Detector"]
        PROVENANCE["Provenance Verifier"]
        SBOM_GEN["SBOM Generator"]
    end

    subgraph Storage["Storage Layer"]
        META_DB[("Metadata DB<br/>(packages, versions, users)")]
        BLOB[("Artifact Blob Store<br/>(content-addressed)")]
        SEARCH_IDX[("Search Index")]
        CACHE["Metadata Cache"]
        AUDIT_LOG[("Audit Log<br/>(append-only)")]
        TRANSPARENCY[("Transparency Log<br/>(Merkle tree)")]
    end

    CLI --> CDN
    WEB --> CDN
    CICD --> CDN
    MIRROR --> CDN

    CDN --> EDGE_CACHE
    CDN -->|cache miss| LB

    LB --> AUTH
    AUTH --> RATE
    RATE --> DOWNLOAD_API
    RATE --> PUBLISH_API
    RATE --> SEARCH_API
    RATE --> METADATA_API

    DOWNLOAD_API --> REGISTRY_SVC
    PUBLISH_API --> PUBLISH_SVC
    SEARCH_API --> SEARCH_SVC
    METADATA_API --> REGISTRY_SVC

    PUBLISH_SVC --> META_DB
    PUBLISH_SVC --> BLOB
    PUBLISH_SVC --> SCAN_QUEUE
    PUBLISH_SVC --> AUDIT_LOG
    PUBLISH_SVC --> TRANSPARENCY

    REGISTRY_SVC --> META_DB
    REGISTRY_SVC --> CACHE
    REGISTRY_SVC --> BLOB

    SEARCH_SVC --> SEARCH_IDX

    SCAN_QUEUE --> MALWARE
    SCAN_QUEUE --> VULN
    SCAN_QUEUE --> TYPO
    SCAN_QUEUE --> PROVENANCE
    SCAN_QUEUE --> SBOM_GEN

    MALWARE --> META_DB
    VULN --> META_DB
    TYPO --> META_DB

    WEBHOOK_SVC --> META_DB

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef security fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class CLI,WEB,CICD,MIRROR client
    class CDN,EDGE_CACHE edge
    class LB,AUTH,RATE,DOWNLOAD_API,PUBLISH_API,SEARCH_API,METADATA_API gateway
    class PUBLISH_SVC,RESOLVE_SVC,REGISTRY_SVC,SEARCH_SVC,WEBHOOK_SVC service
    class SCAN_QUEUE,MALWARE,VULN,TYPO,PROVENANCE,SBOM_GEN security
    class META_DB,BLOB,SEARCH_IDX,CACHE,AUDIT_LOG,TRANSPARENCY storage
```

---

## 2. Data Flow — Publish Path

```mermaid
flowchart LR
    subgraph Author["Package Author"]
        A1["1. Build package archive"]
        A2["2. Sign with Sigstore<br/>(keyless OIDC)"]
        A3["3. npm publish / twine upload"]
    end

    subgraph Registry["Registry Publish Pipeline"]
        B1["4. Authenticate<br/>(token + 2FA)"]
        B2["5. Validate manifest<br/>(name, version, deps)"]
        B3["6. Check version<br/>uniqueness"]
        B4["7. Compute content hash<br/>(SHA-512)"]
        B5["8. Store artifact<br/>(content-addressed blob)"]
        B6["9. Write version metadata<br/>(transactional)"]
        B7["10. Record in<br/>transparency log"]
        B8["11. Enqueue security scans"]
        B9["12. Invalidate CDN<br/>metadata cache"]
        B10["13. Return publish<br/>confirmation + integrity hash"]
    end

    subgraph Async["Async Security Pipeline"]
        C1["14. Malware scan"]
        C2["15. Vulnerability check"]
        C3["16. Typosquatting score"]
        C4["17. Provenance verify"]
        C5["18. Generate SBOM"]
        C6["19. Update scan status<br/>(pass/quarantine)"]
    end

    A1 --> A2 --> A3
    A3 --> B1 --> B2 --> B3 --> B4 --> B5 --> B6 --> B7 --> B8 --> B9 --> B10

    B8 --> C1
    B8 --> C2
    B8 --> C3
    B8 --> C4
    B8 --> C5
    C1 --> C6
    C2 --> C6
    C3 --> C6
    C4 --> C6
    C5 --> C6

    classDef author fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef registry fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef async fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class A1,A2,A3 author
    class B1,B2,B3,B4,B5,B6,B7,B8,B9,B10 registry
    class C1,C2,C3,C4,C5,C6 async
```

### Publish Path Details

**Step 3-4: Authentication.** The CLI sends the package archive along with an authentication token. The auth service validates the token, checks 2FA if required (mandatory for packages with >1M weekly downloads), and verifies the user has publish permissions for the package scope.

**Step 5-6: Validation and Uniqueness.** The manifest is validated for required fields (name, version, dependency specifications). Version uniqueness is checked with a database-level unique constraint on `(package_name, version)`. If the version already exists, the publish is rejected with a 409 Conflict—no overwrites, no exceptions.

**Step 7-8: Content-Addressed Storage.** A SHA-512 hash of the artifact bytes is computed. The artifact is stored in blob storage keyed by this hash. If the same content already exists (rare but possible with republish of yanked version), the existing blob is referenced without re-upload—content-addressable deduplication.

**Step 9: Transactional Metadata Write.** The version record (version string, content hash, dependency list, dist-tags, publish timestamp, publisher identity) is written to the metadata database in a single transaction. This is the linearization point—after this commit, the version exists.

**Step 10-11: Transparency and Scanning.** The publish event is recorded in an append-only transparency log (Merkle tree). Security scan jobs are enqueued for async processing. The package is immediately available for download—security scanning is non-blocking.

**Step 12-13: Cache Invalidation and Response.** CDN metadata cache for this package is purged (artifact cache doesn't need purging since new version = new URL). The client receives a confirmation with the integrity hash for lockfile recording.

---

## 3. Data Flow — Install Path

```mermaid
flowchart TB
    subgraph Client["Developer Machine / CI"]
        D1["1. Parse lockfile<br/>(if exists)"]
        D2["2. Read dependency<br/>specifications"]
        D3["3. Resolve dependency tree"]
        D4["4. Fetch metadata for<br/>each package"]
        D5["5. Download artifacts<br/>(parallel, CDN)"]
        D6["6. Verify integrity<br/>(SHA-512 check)"]
        D7["7. Extract to<br/>node_modules / site-packages"]
    end

    subgraph CDNLayer["CDN Edge"]
        E1{"Cache hit?"}
        E2["Serve from edge<br/>(< 20ms)"]
        E3["Forward to origin"]
    end

    subgraph Origin["Registry Origin"]
        F1["Serve metadata<br/>(version list + deps)"]
        F2["Serve artifact<br/>(redirect to blob CDN)"]
    end

    D4 --> E1
    E1 -->|hit| E2
    E1 -->|miss| E3 --> F1

    D5 --> E1
    E1 -->|hit| E2
    E1 -->|miss| E3 --> F2

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef cdn fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef origin fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class D1,D2,D3,D4,D5,D6,D7 client
    class E1,E2,E3 cdn
    class F1,F2 origin
```

### Install Path Details

**Step 1-2: Lockfile Check.** If a lockfile exists (`package-lock.json`, `poetry.lock`, `Cargo.lock`), the client reads exact version pins and integrity hashes. No resolution needed—skip directly to download. If no lockfile, the client reads dependency specifications (version ranges) from the manifest.

**Step 3: Dependency Resolution.** The client (or server-side resolver) computes a compatible set of versions satisfying all constraints. This is the NP-complete step—the resolver uses SAT-solving techniques (PubGrub, CDCL) to find a valid solution or report an incompatibility. Resolution requires fetching metadata (version lists + dependency specs) for potentially hundreds of packages.

**Step 4-5: Metadata Fetch and Artifact Download.** For each resolved package, the client fetches the full version manifest (if not already cached locally) and downloads the artifact. Downloads are parallelized, CDN-served (98%+ hit rate), and use HTTP range requests for retry on partial failure.

**Step 6-7: Integrity Verification and Extraction.** Every downloaded artifact is verified against its SHA-512 integrity hash from the lockfile or metadata. If verification fails, the download is retried from a different CDN PoP. Verified artifacts are extracted into the project's dependency directory.

---

## 4. Key Architectural Decisions

### Decision 1: Metadata-Artifact Split

**Decision:** Separate metadata (package manifests, version lists, dependency specs) from artifacts (tarball bytes) into distinct storage and serving systems.

**Rationale:**
- Metadata is small (2-50 KB per package), frequently accessed, and must be fresh → served from fast, frequently-updated cache/CDN with short TTLs
- Artifacts are large (10 KB - 50 MB), immutable, and accessed less frequently per-version → served from blob storage via CDN with infinite TTL
- Different consistency requirements: metadata is eventually consistent (< 5 min); artifacts are immutable (no consistency issue)
- Enables independent scaling: metadata reads scale via cache replication; artifact reads scale via CDN and blob storage throughput

### Decision 2: Async Security Scanning (Non-Blocking Publish)

**Decision:** Return publish confirmation before security scanning completes. Scan asynchronously and quarantine retroactively if malware is detected.

**Rationale:**
- Blocking publish on scan completion adds 30s-5min latency to every publish—unacceptable developer experience
- Most published packages (>99.9%) are legitimate; blocking all publishes to catch <0.1% is disproportionate
- Quarantine-on-detection still limits exposure window to minutes, not hours
- Alternative (staging + promotion) adds complexity and delays legitimate package availability

**Trade-off:** A malicious package is downloadable for ~5-10 minutes before scan completes. Mitigation: popular packages are almost never malicious (attackers target new/obscure names); high-download packages trigger expedited scanning.

### Decision 3: CDN-First Architecture

**Decision:** Design the entire read path around CDN serving, treating origin servers as a fallback rather than the primary serving tier.

**Rationale:**
- 200B downloads/month generates ~30 PB bandwidth—no origin cluster can serve this economically
- CDN absorbs 98%+ of download traffic, reducing origin to ~600 TB/month
- Immutable artifacts are perfectly CDN-cacheable (content-addressed URLs, infinite TTL)
- CDN PoPs provide geographic proximity, reducing latency for global developer base
- CDN absorbs DDoS attacks before they reach origin infrastructure

### Decision 4: Content-Addressable Blob Storage

**Decision:** Key all artifacts by their cryptographic hash (SHA-512) rather than by package name + version.

**Rationale:**
- Enables deduplication: if two packages ship the same file, only one blob is stored
- Tamper detection: any modification to artifact bytes produces a different hash, breaking the reference
- Immutability enforcement: blobs are write-once, never updated (different content = different key)
- CDN-friendly: hash-based URLs are inherently cacheable with infinite TTL
- Simplifies integrity verification: the URL itself is the expected hash

### Decision 5: Scoped Namespaces

**Decision:** Support scoped package names (`@organization/package-name`) in addition to flat names.

**Rationale:**
- Prevents dependency confusion attacks: private `@myorg/utils` cannot be confused with public `utils`
- Enables organizational ownership: all packages under `@org/` are managed by the organization's access policies
- Reduces namespace pollution: common names like `config`, `utils`, `helpers` can exist in multiple scopes
- Aligns with how private registries work: organizations use scoped names for internal packages

### Decision 6: Transparency Log for Publish Events

**Decision:** Record every publish event in an append-only, cryptographically verifiable transparency log (Merkle tree structure).

**Rationale:**
- Enables third-party auditors to detect unauthorized publishes without trusting the registry operator
- Provides non-repudiation: a maintainer cannot deny publishing a version that appears in the log
- Supports incident response: after discovering a compromised account, auditors can identify all affected versions
- Aligns with Sigstore's transparency model (Rekor) and certificate transparency principles

---

## 5. Component Interaction Summary

```mermaid
flowchart LR
    subgraph Write["Write Path (Publish)"]
        direction TB
        W1["Auth + 2FA"] --> W2["Validate"]
        W2 --> W3["Store Blob"]
        W3 --> W4["Write Metadata<br/>(transactional)"]
        W4 --> W5["Log + Scan"]
    end

    subgraph Read["Read Path (Install)"]
        direction TB
        R1["CDN Edge"] --> R2{"Hit?"}
        R2 -->|yes| R3["Serve cached"]
        R2 -->|no| R4["Origin fetch"]
        R4 --> R5["Cache + serve"]
    end

    subgraph Scan["Security Path"]
        direction TB
        S1["Dequeue"] --> S2["Scan"]
        S2 --> S3{"Clean?"}
        S3 -->|yes| S4["Mark clean"]
        S3 -->|no| S5["Quarantine"]
    end

    classDef write fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef read fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef scan fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class W1,W2,W3,W4,W5 write
    class R1,R2,R3,R4,R5 read
    class S1,S2,S3,S4,S5 scan
```

| Path | Consistency | Latency Target | Availability Target |
|---|---|---|---|
| **Write (Publish)** | Strong (linearizable version uniqueness) | P99 < 10s | 99.9% |
| **Read (Download)** | Eventual (< 5 min CDN propagation) | P99 < 500ms (CDN) | 99.99% |
| **Security (Scan)** | Eventual (scan results propagate async) | P99 < 10 min | 99.5% |
| **Search** | Eventual (index lag < 60s) | P99 < 500ms | 99.5% |
