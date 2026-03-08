# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        direction LR
        WA[Web Application<br/>Document Browser & Editor]
        DA[Desktop Client<br/>Sync & Office Integration]
        MA[Mobile App<br/>View & Approve]
        API_C[API Clients<br/>Automation & Integration]
    end

    subgraph Edge["Edge & Gateway Layer"]
        direction LR
        CDN[CDN<br/>Thumbnails & Previews]
        LB[Load Balancer<br/>L7 Routing]
        AG[API Gateway<br/>Auth, Rate Limit, Routing]
    end

    subgraph Core["Core Services"]
        direction LR
        DS[Document Service<br/>CRUD & Lifecycle]
        VCS[Version Control<br/>Service<br/>Check-in/Check-out]
        MDS[Metadata Service<br/>Properties & Tags]
        ACS[Access Control<br/>Service<br/>ACL & RBAC]
    end

    subgraph Processing["Processing Services"]
        direction LR
        SE[Search Engine<br/>Full-text & Faceted]
        WFE[Workflow Engine<br/>Approvals & Routing]
        PTS[Preview & Thumbnail<br/>Service]
        OCR[OCR Pipeline<br/>Text Extraction]
    end

    subgraph Support["Support Services"]
        direction LR
        NS[Notification Service<br/>Email, Push, In-app]
        ALS[Audit Log Service<br/>Immutable Event Log]
        RPS[Retention Policy<br/>Service<br/>Hold & Dispose]
        SHS[Sharing Service<br/>Internal & External]
    end

    subgraph Data["Data Layer"]
        direction LR
        OBS[(Object Storage<br/>Document Content)]
        MDB[(Metadata DB<br/>Relational, Sharded)]
        SIX[(Search Index<br/>Inverted Index)]
        Cache[(Cache Cluster<br/>Metadata & Permissions)]
        MQ[Message Queue<br/>Async Processing]
        AuditDB[(Audit Log Store<br/>Append-only)]
        LockStore[(Lock Store<br/>Distributed Locks)]
    end

    WA & DA & MA & API_C --> CDN
    WA & DA & MA & API_C --> LB
    LB --> AG
    AG --> DS & VCS & MDS & ACS & SE & WFE & SHS
    DS --> OBS & MDB & MQ
    VCS --> OBS & MDB & LockStore
    MDS --> MDB & SIX
    ACS --> MDB & Cache
    SE --> SIX
    WFE --> MDB & MQ & NS
    PTS --> OBS & CDN & MQ
    OCR --> OBS & SIX & MQ
    NS --> MQ
    ALS --> AuditDB
    RPS --> MDB & OBS
    SHS --> MDB & NS
    MQ --> PTS & OCR & NS & ALS & SE

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef core fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef processing fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef support fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class WA,DA,MA,API_C client
    class CDN,LB,AG edge
    class DS,VCS,MDS,ACS core
    class SE,WFE,PTS,OCR processing
    class NS,ALS,RPS,SHS support
    class OBS,MDB,SIX,Cache,MQ,AuditDB,LockStore data
```

---

## Key Architectural Decisions

### 1. Blob Storage for Content, Relational DB for Metadata

**Decision: Separate content from metadata storage**

| Factor | Combined (Content in DB) | Separated (Chosen) |
|--------|--------------------------|---------------------|
| Storage cost | Extremely expensive at PB scale | Object storage is 10-50x cheaper than DB storage |
| Query performance | Bloated tables degrade query performance | Metadata queries stay fast on smaller dataset |
| Backup/restore | Full backups include multi-PB content | Metadata backups are small; content has built-in durability |
| Scalability | DB scaling for PB is impractical | Object storage scales to exabytes natively |
| Content processing | Must stream from DB for thumbnails/OCR | Direct object storage access for processing pipelines |

**Rationale**: Document content (PDFs, Office docs, images) is write-once, read-sometimes data that maps perfectly to object storage's cost model. Metadata (names, properties, permissions, versions) is small, frequently queried, and requires ACID transactions --- ideal for a relational database. The content-metadata separation allows each to scale independently.

### 2. Pessimistic Locking as Default, Optimistic as Option

**Decision: Hybrid lock model with pessimistic default**

```
User A checks out document → Lock acquired (pessimistic)
├── Other users see "Checked out by User A"
├── Other users can still read the document
├── Lock has configurable TTL (default: 8 hours)
├── Admin can break lock if user is unavailable
└── User A checks in → New version created, lock released

Alternative: Optimistic mode (configurable per library)
├── Multiple users can edit simultaneously
├── Last save creates a new version
├── Conflict detection at check-in time
└── User chooses: overwrite, save-as, or merge
```

**Rationale**: Enterprise document management prioritizes preventing conflicts over enabling concurrent editing. Legal, financial, and compliance documents cannot have conflicting versions. Pessimistic locking is the industry standard (SharePoint, Box) for formal document workflows. Optimistic locking is available for collaborative workspaces where speed matters more than formal control.

### 3. Inverted Index for Search with Format-Specific Extractors

**Decision: Dedicated search cluster with content extraction pipeline**

```
Document Upload → Message Queue → Content Extractor
                                   ├── PDF Extractor (embedded text + OCR fallback)
                                   ├── Office Extractor (XML parsing for DOCX/XLSX/PPTX)
                                   ├── Image Extractor (OCR pipeline)
                                   ├── Email Extractor (headers + body + attachments)
                                   └── Plain Text (direct indexing)
                                        │
                                        ▼
                                   Search Index
                                   ├── Full-text inverted index (document content)
                                   ├── Metadata index (properties, tags, dates)
                                   └── Faceted index (type, author, date ranges)
```

**Rationale**: Relational DB full-text search cannot scale to billions of documents or handle binary format extraction. A dedicated search cluster provides inverted index performance, relevance ranking, faceted navigation, and horizontal scaling. The extraction pipeline is async --- documents are available immediately but become searchable within minutes.

### 4. Event-Driven Processing for Async Operations

**Decision: Message queue for all non-blocking operations**

| Operation | Sync (in request) | Async (via queue) |
|-----------|-------------------|-------------------|
| Document metadata save | Yes | |
| Lock acquire/release | Yes | |
| Permission check | Yes | |
| Content storage | Yes | |
| Thumbnail generation | | Yes |
| OCR processing | | Yes |
| Search indexing | | Yes |
| Notification dispatch | | Yes |
| Audit log writing | | Yes |
| Workflow step execution | | Yes |
| Retention policy evaluation | | Yes |

**Rationale**: Async processing keeps upload/checkin latency low (<2s) by deferring heavy operations. The message queue provides durability (no lost events), retry logic, and backpressure. Processing workers scale independently based on queue depth.

### 5. Distributed Lock Service for Check-Out

**Decision: Dedicated lock service with consensus protocol**

| Factor | DB-Based Locks | Dedicated Lock Service (Chosen) |
|--------|---------------|---------------------------------|
| Latency | 10-50ms (DB round-trip) | 1-5ms (in-memory) |
| Availability | Tied to DB availability | Independent, highly available |
| TTL management | Requires sweeper process | Built-in TTL with automatic expiry |
| Fencing tokens | Manual implementation | Native support |
| Scalability | Limited by DB connections | Horizontally scalable |

**Rationale**: Check-out locks are on the critical path for every document edit. A dedicated lock service (built on a consensus protocol like Raft) provides sub-5ms lock acquisition, automatic TTL-based expiry, and fencing tokens to prevent stale lock holders from writing. The lock service is small (millions of active locks fit in memory) but must be highly available.

### 6. ACL Inheritance with Permission Cache

**Decision: Database-stored ACLs with in-memory permission graph cache**

```
Folder A (ACL: Team=Read, Admin=Full)
├── Folder B (inherits from A)
│   ├── Doc 1 (inherits from B → effective: Team=Read, Admin=Full)
│   └── Doc 2 (explicit: User X=Full, breaks inheritance for User X only)
└── Folder C (breaks inheritance, own ACL: Team=None, Dept Y=Read)
    └── Doc 3 (inherits from C → effective: Dept Y=Read only)
```

**Rationale**: Permission evaluation happens on every single API call (500M+/day). Computing effective permissions by traversing the folder hierarchy on each request is too slow. Instead, we maintain an in-memory permission cache that pre-computes effective permissions for hot documents/folders. The cache is invalidated on ACL changes and rebuilt lazily. For cache misses, we walk the hierarchy and cache the result.

---

## Data Flow

### Flow 1: Upload Document

```mermaid
sequenceDiagram
    participant U as User
    participant AG as API Gateway
    participant DS as Document Service
    participant OBS as Object Storage
    participant MDB as Metadata DB
    participant MQ as Message Queue
    participant SE as Search Engine
    participant PTS as Preview Service
    participant ALS as Audit Service

    U->>AG: POST /documents (file + metadata)
    AG->>AG: Authenticate & authorize
    AG->>DS: Forward upload request
    DS->>OBS: Store document content (chunked upload)
    OBS-->>DS: Content hash & storage key
    DS->>MDB: Create document record + version 1
    MDB-->>DS: Document ID
    DS-->>U: 201 Created (document ID, metadata)

    DS->>MQ: Emit DocumentCreated event
    MQ->>SE: Index document content & metadata
    MQ->>PTS: Generate thumbnails & preview
    MQ->>ALS: Log document creation event

    Note over SE: Document becomes searchable<br/>within 1-5 minutes
    Note over PTS: Thumbnails available<br/>within 10-30 seconds
```

### Flow 2: Check-Out, Edit, Check-In

```mermaid
sequenceDiagram
    participant U as User
    participant AG as API Gateway
    participant VCS as Version Control Service
    participant LS as Lock Store
    participant OBS as Object Storage
    participant MDB as Metadata DB
    participant MQ as Message Queue

    Note over U,MQ: Phase 1: Check-Out
    U->>AG: POST /documents/{id}/checkout
    AG->>VCS: Acquire lock
    VCS->>LS: TryAcquireLock(doc_id, user_id, TTL=8h)
    alt Lock available
        LS-->>VCS: Lock granted (fencing token: 42)
        VCS->>MDB: Update document status = CHECKED_OUT
        VCS-->>U: 200 OK (fencing_token: 42, download_url)
    else Lock held by another user
        LS-->>VCS: Lock denied (held by User B, expires in 3h)
        VCS-->>U: 409 Conflict (locked by User B)
    end

    Note over U,MQ: Phase 2: Edit Locally
    U->>OBS: Download current version
    U->>U: Edit document in desktop application

    Note over U,MQ: Phase 3: Check-In
    U->>AG: POST /documents/{id}/checkin (new content, fencing_token: 42)
    AG->>VCS: Create new version
    VCS->>LS: ValidateFencingToken(doc_id, token: 42)
    LS-->>VCS: Token valid
    VCS->>OBS: Store new version content
    VCS->>MDB: Create version record (v2), update document
    VCS->>LS: ReleaseLock(doc_id)
    VCS-->>U: 200 OK (version: 2)
    VCS->>MQ: Emit DocumentCheckedIn event
```

### Flow 3: Full-Text Search

```mermaid
sequenceDiagram
    participant U as User
    participant AG as API Gateway
    participant SE as Search Engine
    participant ACS as Access Control
    participant Cache as Permission Cache
    participant SIX as Search Index
    participant MDB as Metadata DB

    U->>AG: GET /search?q=quarterly+report&type=pdf&author=alice
    AG->>SE: Execute search query
    SE->>SIX: Query inverted index
    Note over SIX: 1. Full-text match: "quarterly report"<br/>2. Filter: type=pdf<br/>3. Filter: author=alice<br/>4. Return top 100 candidate doc IDs
    SIX-->>SE: Candidate document IDs (100)

    SE->>ACS: Filter by user permissions
    ACS->>Cache: Batch permission check (100 doc IDs)
    Note over Cache: Check effective permissions<br/>for requesting user on each doc
    Cache-->>ACS: Accessible doc IDs (67 of 100)
    ACS-->>SE: Filtered results

    SE->>MDB: Fetch metadata for top 20 results
    MDB-->>SE: Document metadata (title, author, modified, etc.)
    SE-->>U: Search results with snippets & highlights
```

### Flow 4: External Sharing

```mermaid
sequenceDiagram
    participant U as Internal User
    participant AG as API Gateway
    participant SHS as Sharing Service
    participant MDB as Metadata DB
    participant NS as Notification Service
    participant EU as External User
    participant ACS as Access Control

    U->>AG: POST /documents/{id}/share
    Note over U: {email: "ext@partner.com",<br/>permission: "view",<br/>expires: "2026-04-08",<br/>password: true,<br/>download: false}
    AG->>SHS: Create external share
    SHS->>ACS: Verify user can share (has Share permission)
    ACS-->>SHS: Authorized
    SHS->>MDB: Create share record with token
    Note over MDB: token: "abc123xyz"<br/>password_hash: bcrypt(...)<br/>expires: 2026-04-08<br/>permissions: view-only<br/>download_allowed: false
    SHS->>NS: Send invitation email
    NS-->>EU: Email with tokenized link

    EU->>AG: GET /shared/abc123xyz
    AG->>SHS: Validate share token
    SHS->>MDB: Look up share record
    SHS->>SHS: Check expiry, verify password
    SHS-->>EU: Document preview (no download button)
```

### Flow 5: Workflow Execution (Approval)

```mermaid
sequenceDiagram
    participant U as Author
    participant AG as API Gateway
    participant WFE as Workflow Engine
    participant MDB as Metadata DB
    participant NS as Notification Service
    participant R1 as Reviewer 1
    participant R2 as Reviewer 2

    U->>AG: POST /documents/{id}/workflows/submit-for-approval
    AG->>WFE: Start workflow instance
    WFE->>MDB: Create workflow instance (state: PENDING_REVIEW)
    WFE->>MDB: Lock document (prevent edits during review)
    WFE->>NS: Notify reviewers

    NS-->>R1: "Document X needs your review"
    NS-->>R2: "Document X needs your review"

    R1->>AG: POST /workflows/{wf_id}/approve
    AG->>WFE: Record approval
    WFE->>MDB: Update step 1 = APPROVED

    R2->>AG: POST /workflows/{wf_id}/request-changes
    Note over R2: {comment: "Please update section 3"}
    AG->>WFE: Record change request
    WFE->>MDB: Update step 2 = CHANGES_REQUESTED
    WFE->>MDB: Update workflow state = CHANGES_REQUESTED
    WFE->>MDB: Unlock document for editing
    WFE->>NS: Notify author of required changes
    NS-->>U: "Reviewer 2 requested changes on Document X"
```

---

## Architecture Pattern Checklist

- [x] **Sync vs Async**: Sync for document CRUD, lock ops, permission checks; Async for indexing, OCR, thumbnails, notifications
- [x] **Event-driven vs Request-response**: Event-driven for processing pipelines; request-response for user-facing operations
- [x] **Push vs Pull**: Push for notifications and workflow alerts; pull for search and document listing
- [x] **Stateless vs Stateful**: All services stateless except lock service (stateful with consensus)
- [x] **Read-heavy vs Write-heavy**: Read-heavy (80/20); optimized with caching, CDN, and read replicas
- [x] **Real-time vs Batch**: Real-time for locks and permissions; near-real-time for search; batch for retention enforcement and analytics
- [x] **Edge vs Origin**: Edge for thumbnails and previews (CDN); origin for document content and metadata operations

---

## Component Responsibilities

| Component | Responsibility | Scaling Strategy |
|-----------|---------------|-----------------|
| **API Gateway** | Authentication, rate limiting, request routing | Horizontal, stateless |
| **Document Service** | Document CRUD, file upload/download coordination | Horizontal, stateless |
| **Version Control Service** | Check-in/check-out, version creation, lock management | Horizontal + dedicated lock service |
| **Metadata Service** | Custom properties, system metadata, tagging | Horizontal, stateless |
| **Access Control Service** | ACL evaluation, RBAC, permission inheritance | Horizontal + permission cache |
| **Search Engine** | Full-text search, faceted navigation, relevance ranking | Sharded search index, replicated |
| **Workflow Engine** | Approval flows, state machine execution, escalation | Horizontal, event-driven |
| **Preview/Thumbnail Service** | Document rendering, image conversion, CDN population | Auto-scaled workers by queue depth |
| **OCR Pipeline** | Text extraction from images/scanned PDFs | GPU-accelerated workers, auto-scaled |
| **Notification Service** | Email, push, in-app notifications | Horizontal, queue-based |
| **Audit Log Service** | Immutable event logging, compliance reporting | Append-only store, high write throughput |
| **Retention Policy Service** | Policy evaluation, legal hold enforcement, disposition | Background sweeper, periodic batch |
| **Sharing Service** | Internal/external sharing, tokenized links | Horizontal, stateless |

---

## Integration Points

### Office Application Integration

```
Desktop Office App (Word, Excel, etc.)
    │
    ├── WOPI Protocol (Web Application Open Platform Interface)
    │   ├── Lock: POST /wopi/files/{id}/lock
    │   ├── GetFile: GET /wopi/files/{id}/contents
    │   ├── PutFile: POST /wopi/files/{id}/contents
    │   └── Unlock: POST /wopi/files/{id}/unlock
    │
    └── WebDAV Protocol (fallback for older clients)
        ├── LOCK /webdav/files/{id}
        ├── GET /webdav/files/{id}
        ├── PUT /webdav/files/{id}
        └── UNLOCK /webdav/files/{id}
```

### Email Integration

```
Incoming Email with Attachments
    │
    ├── Email Connector Service
    │   ├── Parse MIME content
    │   ├── Extract attachments
    │   ├── Create documents in DMS
    │   └── Link back to email thread
    │
    └── Outbound: Share as Link
        ├── Generate tokenized link
        ├── Apply access permissions
        └── Embed in email body
```

### SSO / Identity Provider Integration

```
User Authentication Flow
    │
    ├── SAML 2.0 / OpenID Connect
    │   ├── Redirect to IdP
    │   ├── Receive assertion/token
    │   ├── Map groups to DMS roles
    │   └── Provision user on first login
    │
    └── SCIM 2.0 (User Provisioning)
        ├── Sync users from corporate directory
        ├── Sync groups/teams
        ├── Handle deprovisioning (disable account)
        └── Map organizational hierarchy
```
