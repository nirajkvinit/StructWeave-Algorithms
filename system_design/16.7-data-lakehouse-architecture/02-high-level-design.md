# High-Level Design — Data Lakehouse Architecture

## System Architecture

```mermaid
%%{init: {'theme': 'base', 'look': 'neo', 'themeVariables': {'primaryColor': '#e8f5e9', 'lineColor': '#555'}}}%%
flowchart TB
    subgraph Clients["Client Layer"]
        BI[BI Dashboard]
        NB[Notebook / ML]
        APP[Application]
    end

    subgraph Gateway["Access Layer"]
        QE1[Query Engine A<br/>e.g. distributed SQL]
        QE2[Query Engine B<br/>e.g. batch processor]
        QE3[Query Engine C<br/>e.g. embedded engine]
    end

    subgraph Catalog["Catalog Layer"]
        CAT[(Table Catalog)]
        GOV[Governance & ACL]
    end

    subgraph TableFormat["Table Format Layer"]
        META[Metadata Manager<br/>snapshots, manifests]
        SCHEMA[Schema Registry]
        STATS[Statistics Collector]
    end

    subgraph Compute["Compute Layer"]
        INGEST[Ingestion Service<br/>batch + streaming]
        COMPACT[Compaction Service]
        VACUUM[Snapshot Expiration]
    end

    subgraph Storage["Storage Layer"]
        OBJ[(Object Storage<br/>Parquet / ORC files)]
        METASTORE[(Metadata Files<br/>manifests, snapshots)]
    end

    BI --> QE1
    NB --> QE2
    APP --> QE3

    QE1 --> CAT
    QE2 --> CAT
    QE3 --> CAT
    CAT --- GOV

    CAT --> META
    META --- SCHEMA
    META --- STATS

    INGEST --> META
    COMPACT --> META
    VACUUM --> META

    META --> METASTORE
    INGEST --> OBJ
    COMPACT --> OBJ
    VACUUM --> OBJ

    QE1 --> OBJ
    QE2 --> OBJ
    QE3 --> OBJ

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef catalog fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef tableformat fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef compute fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class BI,NB,APP client
    class QE1,QE2,QE3 gateway
    class CAT,GOV catalog
    class META,SCHEMA,STATS tableformat
    class INGEST,COMPACT,VACUUM compute
    class OBJ,METASTORE storage
```

## Component Descriptions

### Catalog Layer

The catalog is the **single source of truth** for table identity. It maps a table name to the location of its current metadata file (the latest snapshot pointer). All commits go through the catalog to guarantee atomicity — a compare-and-swap on the metadata pointer ensures only one writer wins per commit cycle.

- **Table Catalog**: Stores table name -> current metadata location mapping. Implements atomic pointer updates via CAS or sequential log append.
- **Governance & ACL**: Enforces role-based access control, column-level masking, and credential vending so query engines receive scoped, short-lived tokens for object storage access.

### Table Format Layer

This layer sits logically between the catalog and the raw data files. It owns the metadata hierarchy that makes ACID possible on immutable object storage.

- **Metadata Manager**: Maintains the chain of snapshots -> manifest lists -> manifest files -> data file references. Each commit produces a new immutable snapshot.
- **Schema Registry**: Tracks column IDs, types, nullability, and evolution history. Column-ID-based tracking (rather than name or position) ensures correctness across renames and reorders.
- **Statistics Collector**: Gathers per-file and per-column statistics (min, max, null count, value count) and writes them into manifest entries for data-skipping decisions.

### Compute Layer

- **Ingestion Service**: Accepts batch loads and streaming micro-batches; writes Parquet files to object storage and commits new file references atomically.
- **Compaction Service**: Reads small files, rewrites them into optimally-sized files (128 – 256 MB), applies Z-ordering or sort-based clustering, and commits a replacement snapshot.
- **Snapshot Expiration (Vacuum)**: Removes data files that are no longer referenced by any live snapshot after a configurable retention period.

### Storage Layer

- **Object Storage**: Holds the actual data files (Parquet, ORC, or Avro). Provides virtually infinite capacity, high durability (11 nines), and pay-per-use economics.
- **Metadata Files**: Stores manifests, manifest lists, and snapshot metadata as small Avro or JSON files alongside data files. The table format layer reads these to reconstruct table state.

## Data Flow

### Write Path (ACID Commit)

```mermaid
%%{init: {'theme': 'base', 'look': 'neo', 'themeVariables': {'primaryColor': '#e8f5e9', 'lineColor': '#555'}}}%%
sequenceDiagram
    participant W as Writer
    participant CAT as Catalog
    participant META as Metadata Manager
    participant OBJ as Object Storage

    W->>CAT: 1. Read current snapshot pointer
    CAT-->>W: snapshot_id = S42
    W->>META: 2. Load snapshot S42 manifests
    META-->>W: File list + schema + partition spec

    W->>OBJ: 3. Write new Parquet data files
    OBJ-->>W: file_paths confirmed

    W->>META: 4. Build new manifest entries<br/>(file paths, stats, partition values)
    W->>META: 5. Create new manifest list<br/>referencing updated manifests
    W->>META: 6. Create snapshot S43<br/>pointing to new manifest list

    W->>OBJ: 7. Write metadata files<br/>(manifest, manifest list, snapshot)

    W->>CAT: 8. Atomic CAS: update pointer<br/>S42 → S43
    alt CAS succeeds
        CAT-->>W: Commit successful
    else CAS fails (conflict)
        CAT-->>W: Conflict — retry from step 1
        W->>W: Re-read latest snapshot,<br/>rebase changes, retry
    end
```

**Key properties of the write path:**

1. **Optimistic concurrency** — writers proceed without locks; conflicts detected only at commit time (step 8).
2. **Immutable files** — new data files are written; existing files are never modified.
3. **Atomic visibility** — until the CAS succeeds, no reader sees the new files; after CAS, all readers see the complete set.
4. **Retry safety** — failed writers leave orphan data files that are cleaned up by the vacuum process.

### Read Path (Snapshot Isolation)

```mermaid
%%{init: {'theme': 'base', 'look': 'neo', 'themeVariables': {'primaryColor': '#e8f5e9', 'lineColor': '#555'}}}%%
sequenceDiagram
    participant R as Reader / Query Engine
    participant CAT as Catalog
    participant META as Metadata Manager
    participant OBJ as Object Storage

    R->>CAT: 1. Resolve table → current snapshot S43
    CAT-->>R: metadata file location

    R->>META: 2. Load snapshot S43 metadata
    META-->>R: Manifest list pointer

    R->>META: 3. Read manifest list
    META-->>R: List of manifest files + partition bounds

    R->>R: 4. Partition pruning<br/>(eliminate manifests by partition range)

    R->>META: 5. Read surviving manifest files
    META-->>R: Per-file min/max statistics

    R->>R: 6. Data skipping<br/>(eliminate files by column stats)

    R->>OBJ: 7. Read only surviving data files<br/>(column projection + predicate pushdown)
    OBJ-->>R: Columnar data pages

    R->>R: 8. Assemble result set
```

**Key properties of the read path:**

1. **Snapshot isolation** — the reader pins snapshot S43; concurrent writes creating S44 do not affect this query.
2. **Progressive pruning** — manifests are pruned first (partition-level), then files (column-stats-level), minimizing I/O.
3. **No listing** — the reader never lists object-storage directories; all file references come from manifests, avoiding eventual-consistency hazards.
4. **Merge-on-read** (if applicable) — for tables using the MoR strategy, the reader merges base data files with delete files or log files before returning results.

## Key Design Decisions

| Decision | Choice | Trade-off |
|:---|:---|:---|
| **File-level tracking vs. directory listing** | File-level tracking in manifests | Higher metadata overhead but eliminates eventual-consistency issues with directory listings |
| **Optimistic concurrency vs. pessimistic locking** | OCC with CAS at commit | Higher conflict rate under heavy contention but zero lock overhead for the common case |
| **Copy-on-Write vs. Merge-on-Read** | Configurable per table | CoW optimizes reads at cost of write amplification; MoR optimizes writes but adds read-time merge cost |
| **Columnar format (Parquet) vs. row-oriented** | Parquet as default | Best for analytical scans; row-oriented access requires full-row reconstruction |
| **Centralized catalog vs. storage-level metadata** | Centralized catalog (REST protocol) | Single authority for governance and multi-engine consistency; catalog becomes an availability dependency |
| **Hidden partitioning vs. explicit partitioning** | Hidden (partition transforms derived from source columns) | Users write queries on source columns; physical layout is transparent and evolvable |
| **Embedded statistics vs. external statistics store** | Embedded in manifest files | Co-located with file references for single-fetch planning; limits statistics richness |

## Architecture Pattern Checklist

| Pattern | Choice | Notes |
|:---|:---|:---|
| Synchronous / Asynchronous | Async writes, sync metadata commit | Data files written in parallel; single atomic commit |
| Event-driven | Yes | Commit events trigger compaction, cache invalidation, downstream consumers |
| Push / Pull | Pull for reads, push for ingest | Query engines pull data; ingestion pushes files to storage |
| Stateless / Stateful | Stateless compute, stateful catalog | Query engines are ephemeral; catalog and object storage hold state |
| Read-heavy / Write-heavy | Read-heavy (typical 10:1 – 100:1) | Optimized for analytical scan throughput |
| Real-time / Batch | Unified | Same table supports streaming micro-batch ingest and batch analytical queries |
| Edge / Origin | Origin (centralized storage) | Object storage in a single region; multi-region via replication |
