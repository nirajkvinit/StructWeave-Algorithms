# Deep Dive & Bottlenecks

## 1. Critical Component: Sync Engine

### Why This Is Critical

The sync engine is the **heart** of a cloud file storage system. It must maintain consistency across N devices, handle offline edits, detect conflicts, and minimize bandwidth --- all while feeling instantaneous to users. Dropbox rewrote their entire sync engine from Python to Rust over 4 years (project "Nucleus") because the original couldn't handle the complexity at scale.

### How It Works Internally

The sync engine maintains a **three-tree model** (pioneered by Dropbox Nucleus):

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Remote Tree   │  │    Sync Tree    │  │   Local Tree    │
│  (Server state) │  │ (Last synced    │  │ (Filesystem     │
│                 │  │  agreed state)  │  │  current state) │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         │   Diff(Remote,     │   Diff(Local,      │
         │   Sync) = remote   │   Sync) = local    │
         │   changes          │   changes          │
         └────────┬───────────┘────────┬───────────┘
                  │                    │
                  ▼                    ▼
         ┌─────────────────────────────────┐
         │       Merge Algorithm           │
         │  Detect conflicts, compute ops  │
         └─────────────┬───────────────────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
      Upload to server    Apply to filesystem
      (remote changes)    (local changes)
```

**Three-Tree Merge Algorithm:**

```
ALGORITHM ThreeTreeMerge(remote_tree, sync_tree, local_tree)
  remote_changes ← DIFF(remote_tree, sync_tree)
  local_changes ← DIFF(local_tree, sync_tree)

  FOR EACH path IN UNION(remote_changes.keys, local_changes.keys):
    remote_op ← remote_changes.get(path)
    local_op ← local_changes.get(path)

    IF remote_op AND NOT local_op:
      // Server-only change: apply locally
      APPLY_LOCAL(remote_op)
      UPDATE sync_tree(path, remote_tree[path])

    ELSE IF local_op AND NOT remote_op:
      // Local-only change: upload to server
      UPLOAD(local_op)
      UPDATE sync_tree(path, local_tree[path])

    ELSE IF remote_op AND local_op:
      // Both changed: conflict resolution
      IF remote_op.type == "modify" AND local_op.type == "modify":
        IF remote_op.content_hash == local_op.content_hash:
          // Same edit on both sides: no conflict
          UPDATE sync_tree(path, local_tree[path])
        ELSE:
          // True conflict: create conflicted copy
          CREATE_CONFLICTED_COPY(path, local_op)
          APPLY_LOCAL(remote_op)  // server version wins for canonical path
          UPDATE sync_tree(path, remote_tree[path])

      ELSE IF remote_op.type == "delete" AND local_op.type == "modify":
        // Server deleted, local modified: resurrect with local version
        UPLOAD(local_op)
        UPDATE sync_tree(path, local_tree[path])

      ELSE IF remote_op.type == "modify" AND local_op.type == "delete":
        // Server modified, local deleted: server wins, re-download
        APPLY_LOCAL(remote_op)
        UPDATE sync_tree(path, remote_tree[path])
```

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **Sync engine crash mid-operation** | Partial sync state, inconsistent trees | WAL (write-ahead log) for all tree mutations; replay on restart |
| **Network partition during upload** | Blocks uploaded but version not committed | Retry commit with same idempotency key; orphaned blocks cleaned by GC |
| **Filesystem event flood** (many files changed) | CPU/memory spike, sync queue backlog | Debounce filesystem events (200ms window); prioritize small files |
| **Clock skew between devices** | Incorrect conflict resolution with timestamp-based ordering | Use server-assigned sequence numbers, not client timestamps |
| **Rename detection failure** | Same file uploaded twice under different names | Content hash comparison detects moves vs copy+delete |

### How Failures Are Handled

1. **WAL-based recovery**: Every state transition is logged before execution. On crash, replay the WAL to reach consistent state.
2. **Deterministic testing**: Dropbox's "Trinity" framework uses an adversarial scheduler to deterministically verify invariants across complex execution interleavings.
3. **Rust type system**: Nucleus uses Rust's ownership and type system to "design away invalid system states" --- many concurrency bugs become compile-time errors.

---

## 2. Critical Component: Content-Addressable Block Storage

### Why This Is Critical

Block storage is the **largest infrastructure cost** and the system's durability guarantee. Dropbox's Magic Pocket manages 3+ exabytes across multiple datacenters. A single bit flip or lost block means permanent data loss for users.

### How It Works Internally

```mermaid
flowchart TB
    subgraph Ingress["Block Ingestion"]
        Upload["Block Upload<br/>PUT /blocks/{hash}"]
        Verify["Hash Verification<br/>SHA-256(data) == hash?"]
        Compress["Compression<br/>(Broccoli/Brotli)"]
    end

    subgraph Encoding["Erasure Coding"]
        Split["Split Block<br/>into 6 Data Fragments"]
        Parity["Compute 3 Parity<br/>Fragments (Reed-Solomon)"]
    end

    subgraph Storage["Multi-Zone Storage"]
        Z1["Zone A<br/>Fragments 1,4,7"]
        Z2["Zone B<br/>Fragments 2,5,8"]
        Z3["Zone C<br/>Fragments 3,6,9"]
    end

    subgraph Index["Block Index"]
        Registry["Block Registry<br/>(hash → fragment locations)"]
    end

    Upload --> Verify
    Verify -->|Valid| Compress
    Verify -->|Invalid| Reject["Reject Upload<br/>400 Bad Request"]
    Compress --> Split
    Split --> Parity
    Parity --> Z1 & Z2 & Z3
    Z1 & Z2 & Z3 --> Registry

    classDef ingress fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef encode fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef index fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class Upload,Verify,Compress ingress
    class Split,Parity encode
    class Z1,Z2,Z3 storage
    class Registry index
```

**Erasure Coding (6+3 Reed-Solomon):**

- Block split into 6 data fragments + 3 parity fragments = 9 total
- Can tolerate loss of **any 3 fragments** and still reconstruct the block
- Storage overhead: 1.5x (vs 3x for triple replication)
- Fragments distributed across 3+ availability zones

**Tiered Storage:**

| Tier | Access Pattern | Storage Medium | Redundancy | Cost |
|------|---------------|----------------|------------|------|
| **Hot** | Accessed within last 7 days | SSD / fast HDD | N-way replication | $$$ |
| **Warm** | Accessed 7-30 days ago | High-capacity HDD | Erasure coding (6+3) | $$ |
| **Cold** | Not accessed for 30+ days | SMR HDD / Archival | Cross-region erasure coding | $ |

Dropbox's SMR (Shingled Magnetic Recording) drives achieve 20% more capacity than traditional drives and operate at ~0.30 W/TB idle.

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **Single disk failure** | Fragment loss | Erasure coding tolerates up to 3 fragment losses; auto-repair rebuilds fragment on healthy disk |
| **Zone failure** | Multiple fragment losses | Fragments spread across 3+ zones; 6+3 scheme survives complete zone loss |
| **Silent data corruption (bit rot)** | Undetected data corruption | Periodic background scrubbing: re-hash stored blocks, compare to registry |
| **Hash collision (SHA-256)** | Two different blocks share same hash | Probability: 2^-128 for collision; server-side verification on upload; defense-in-depth with content comparison for critical operations |
| **Storage node overload** | Increased latency, timeouts | Consistent hashing with virtual nodes for even distribution; backpressure mechanisms |

### Compression: Broccoli

Dropbox's custom compression format (modified Brotli):

- Enables **multi-core compression**: chunks compressed in parallel, then concatenated
- Standard Brotli cannot concatenate compressed streams --- Broccoli solves this
- **3x compression rate improvement** over standard Brotli
- Reduces median latency and data transfer by **>30%**
- Applied before erasure coding to minimize stored bytes

---

## 3. Critical Component: Metadata Service (Edgestore)

### Why This Is Critical

Every file operation --- listing directories, checking permissions, resolving paths, computing sync deltas --- hits the metadata layer. Dropbox's Edgestore serves **millions of queries per second** across **trillions of entries** with 5-nines availability. Metadata is often the harder scaling challenge compared to blob storage.

### How It Works Internally

```mermaid
flowchart TB
    subgraph Clients["Service Clients"]
        Sync["Sync Service"]
        Share["Sharing Service"]
        Search["Search Service"]
    end

    subgraph Edgestore["Metadata Service (Edgestore)"]
        Core["Stateless Routing<br/>Cores"]
        Chrono["Consistent Cache<br/>(Chrono)"]
        Engine["Data Mastering<br/>Engines"]
    end

    subgraph Storage["Storage Layer"]
        Panda["Key-Value Store<br/>(Panda)"]
        MySQL["Sharded MySQL<br/>(Source of Truth)"]
    end

    subgraph Cold["Cold Metadata"]
        Alki["LSM-Tree Store<br/>(Alki)"]
        ColdHot["Hot: Wide-Column<br/>Store"]
        ColdCold["Cold: Object<br/>Storage"]
    end

    Sync & Share & Search --> Core
    Core --> Chrono
    Chrono -->|Cache miss| Engine
    Engine --> Panda
    Panda --> MySQL
    Engine -->|Cold data| Alki
    Alki --> ColdHot
    Alki --> ColdCold

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cold fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class Sync,Share,Search client
    class Core,Chrono,Engine edge
    class Panda,MySQL storage
    class Alki,ColdHot,ColdCold cold
```

**Architecture layers (Dropbox Edgestore):**

1. **Stateless Cores**: Handle routing, schema validation, request transformation
2. **Chrono (Consistent Cache)**: Provides linearizable reads by invalidating cache on writes; reduces load on backend by 10-100x
3. **Engines**: Data mastering layer --- owns consistency guarantees, handles cross-shard operations
4. **Panda (KV Store)**: Abstracts sharded MySQL; supports ACID transactions at petabyte scale, serves tens of millions of QPS at single-digit ms latency
5. **Alki (Cold Metadata)**: LSM-tree based store for infrequently accessed metadata; 5.5x cheaper per GB than Edgestore

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **MySQL shard failure** | Partition of metadata unavailable | Primary-replica with automatic failover; RPO < 1 second |
| **Cache inconsistency** | Stale metadata served (phantom files, wrong permissions) | Write-through invalidation; Chrono ensures linearizable reads |
| **Cross-shard transaction failure** | Partial move/rename across namespaces | Saga pattern with compensating transactions; Panda provides cross-shard ACID |
| **Hot shard** | Single namespace overwhelms one shard | Shard splitting; rate limiting per namespace; caching absorbs read amplification |
| **Schema migration** | Downtime during schema changes | Online DDL (pt-online-schema-change); backwards-compatible migrations |

---

## 4. Concurrency & Race Conditions

### 4.1 Concurrent File Commit Race

**Scenario**: Two devices edit the same file simultaneously.

```
Timeline:
  Device A reads file v3
  Device B reads file v3
  Device A uploads new blocks, commits v4 from base v3 → SUCCESS
  Device B uploads new blocks, commits v4 from base v3 → CONFLICT (409)
```

**Solution**: Optimistic concurrency control with version-based `If-Match` header.

```
COMMIT(node_id, base_version=3, new_blocks)
  BEGIN TRANSACTION
    current ← SELECT version FROM file_nodes WHERE node_id = ? FOR UPDATE
    IF current.version != 3:
      ROLLBACK
      RETURN 409 Conflict
    UPDATE file_nodes SET version = 4 WHERE node_id = ?
    INSERT file_versions(node_id, version=4, ...)
  COMMIT
```

### 4.2 Block Reference Count Race

**Scenario**: One process increments ref_count (new file uses block), another decrements (old version deleted) simultaneously.

```
Process A: ref_count = 5 → reads 5, adds 1 → writes 6
Process B: ref_count = 5 → reads 5, subtracts 1 → writes 4
Result: ref_count = 4 or 6 (lost update!)
```

**Solution**: Atomic increment/decrement operations.

```
-- Atomic increment (no read-then-write)
UPDATE blocks SET reference_count = reference_count + 1 WHERE block_hash = ?

-- Atomic decrement with floor
UPDATE blocks SET reference_count = GREATEST(reference_count - 1, 0) WHERE block_hash = ?
```

### 4.3 Move + Edit Race

**Scenario**: Device A moves file from `/docs/report.md` to `/archive/report.md`. Device B simultaneously edits `/docs/report.md`.

**Solution**: Operations use `node_id` (immutable), not paths. Move changes the parent pointer; edit changes the content. Both succeed without conflict because they modify orthogonal fields.

### 4.4 Share Revocation Race

**Scenario**: Admin revokes user's access while user is mid-download.

**Solution**:
- Metadata check at commit/download start (coarse-grained)
- Block download uses short-lived signed URLs (expire in 15 min)
- Access revocation takes effect on next metadata check, not mid-transfer

---

## 5. Bottleneck Analysis

### Bottleneck #1: Metadata Hot Spots

**Problem**: Popular shared folders (e.g., company-wide team folder) create hot shards --- one namespace receives disproportionate traffic.

**Metrics**:
- Normal shard: ~10K QPS
- Hot shard: 500K+ QPS (50x normal)

**Mitigation**:

| Strategy | Trade-off |
|----------|-----------|
| **Read replicas** | Increases read capacity but adds replication lag |
| **Aggressive caching (Chrono)** | Absorbs 90%+ of reads; invalidation must be correct |
| **Shard splitting** | Splits hot namespace across multiple shards; adds cross-shard query complexity |
| **Rate limiting per namespace** | Protects infrastructure but degrades user experience |
| **Request coalescing** | Multiple identical concurrent requests share one backend call |

### Bottleneck #2: Large File Upload Throughput

**Problem**: Users uploading multi-GB files (videos, backups) saturate network links and block storage write capacity.

**Metrics**:
- Single 10 GB file = 2,500 blocks at 4 MB each
- With 1 Gbps upload: ~80 seconds for content, plus overhead

**Mitigation**:

| Strategy | Effect |
|----------|--------|
| **Parallel block upload** (8-16 concurrent) | 8-16x throughput improvement |
| **Client-side dedup check** | Skip blocks already on server (50-70% savings) |
| **Compression (Broccoli)** | 30%+ reduction in bytes transferred |
| **Resumable uploads** | Don't restart on network interruption |
| **Regional upload endpoints** | Reduce latency to nearest datacenter |
| **Streaming sync** | Other devices start downloading before upload completes |

### Bottleneck #3: Notification Fan-out for Shared Content

**Problem**: A file in a shared folder with 10,000 members generates 10,000 notification deliveries on every save.

**Metrics**:
- Active team folder with 10K members
- 100 file changes/hour
- = 1M notifications/hour from one folder

**Mitigation**:

| Strategy | Effect |
|----------|--------|
| **Batch/debounce notifications** | Aggregate changes within 5s window; send one notification |
| **Hierarchical fan-out** | Notify team leaders → team leaders notify members |
| **Online-only delivery** | Only notify currently connected devices; others poll on next connect |
| **Priority tiers** | Direct shares: immediate; team folders: batched; public links: no notification |
| **Change feed with cursors** | Devices pull changes at their own pace vs being pushed |
