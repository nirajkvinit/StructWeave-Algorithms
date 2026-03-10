# Low-Level Design — Data Lakehouse Architecture

## Data Model

### Metadata Hierarchy

The lakehouse's metadata forms a tree rooted at the catalog pointer. Each level adds specificity, enabling progressive pruning during query planning.

```
Catalog Pointer
  └── metadata.json  (table schema, partition spec, sort order, snapshot list)
        └── Snapshot S43
              └── manifest-list-S43.avro  (list of manifest files + partition summaries)
                    ├── manifest-001.avro  (file entries + per-file column stats)
                    │     ├── data-file-aaa.parquet
                    │     ├── data-file-aab.parquet
                    │     └── data-file-aac.parquet
                    ├── manifest-002.avro
                    │     ├── data-file-bba.parquet
                    │     └── delete-file-bb1.parquet  (MoR: position deletes)
                    └── manifest-003.avro
                          └── data-file-cca.parquet
```

### Snapshot Structure

```
Snapshot {
    snapshot_id        : int64        // unique, monotonically increasing
    parent_id          : int64        // previous snapshot (null for first)
    timestamp_ms       : int64        // commit wall-clock time
    operation          : enum         // append | overwrite | replace | delete
    manifest_list      : string       // path to manifest-list Avro file
    summary            : map<string, string>  // added-files, deleted-files, total-rows, etc.
    schema_id          : int32        // schema version in effect
    partition_spec_id  : int32        // partition spec in effect
}
```

### Manifest Entry (per data file)

```
ManifestEntry {
    status             : enum         // 0 = existing, 1 = added, 2 = deleted
    file_path          : string       // object-storage path to Parquet/ORC file
    file_format        : enum         // PARQUET | ORC | AVRO
    partition_values   : map<int, bytes>  // partition field ID → value
    record_count       : int64
    file_size_bytes    : int64
    column_sizes       : map<int, int64>  // column ID → size in bytes
    value_counts       : map<int, int64>  // column ID → non-null count
    null_counts        : map<int, int64>
    lower_bounds       : map<int, bytes>  // column ID → min value (serialized)
    upper_bounds       : map<int, bytes>  // column ID → max value (serialized)
    sort_order_id      : int32
}
```

### Delete File Entry (Merge-on-Read)

```
DeleteFile {
    file_path          : string
    delete_type        : enum         // POSITION_DELETE | EQUALITY_DELETE
    // Position delete: Parquet file with (file_path, row_position) pairs
    // Equality delete: Parquet file with column values that identify deleted rows
    record_count       : int64
    referenced_file    : string       // data file this delete applies to (optional)
}
```

### Physical File Layout (Parquet)

```
data-file-aaa.parquet
├── Row Group 0  (typically 64–256 MB uncompressed)
│     ├── Column Chunk: event_time   (SNAPPY compressed)
│     ├── Column Chunk: user_id      (ZSTD compressed)
│     ├── Column Chunk: event_type   (DICT + RLE encoded)
│     └── Column Chunk: payload      (SNAPPY compressed)
├── Row Group 1
│     └── ...
├── Footer
│     ├── Schema
│     ├── Row group metadata (offsets, sizes, encodings)
│     └── Column statistics (min, max, null_count per chunk)
└── Footer length (4 bytes) + magic bytes
```

## API Design

### Catalog API (REST Protocol)

| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/v1/namespaces/{ns}/tables/{table}` | Load table metadata (schema, partition spec, current snapshot) |
| POST | `/v1/namespaces/{ns}/tables` | Create table with schema and partition spec |
| POST | `/v1/namespaces/{ns}/tables/{table}/commits` | Atomic commit: new snapshot with list of added/deleted files |
| GET | `/v1/namespaces/{ns}/tables/{table}/snapshots` | List snapshots for time-travel queries |
| POST | `/v1/namespaces/{ns}/tables/{table}/snapshots/{id}/cherrypick` | Cherry-pick a snapshot for WAP workflow |
| DELETE | `/v1/namespaces/{ns}/tables/{table}/snapshots` | Expire snapshots older than retention |
| POST | `/v1/namespaces/{ns}/tables/{table}/metrics` | Report scan metrics (files scanned, rows read, skipped) |
| GET | `/v1/config` | Retrieve catalog configuration and credential vending endpoints |

### Commit Request Structure

```
CommitRequest {
    table_id           : string
    base_snapshot_id   : int64        // snapshot the writer started from
    new_snapshot       : Snapshot     // proposed new snapshot
    added_files        : list<ManifestEntry>
    deleted_files      : list<ManifestEntry>
    schema_update      : SchemaUpdate   // optional: column adds/drops/renames
    partition_update   : PartitionUpdate // optional: partition spec change
    idempotency_key    : string         // prevents duplicate commits on retry
}
```

### Rate Limiting & Versioning

- API versioned via URL prefix (`/v1/`, `/v2/`).
- Commits rate-limited per table: 100 commits/min default (tunable).
- Read endpoints rate-limited per client: 1 000 requests/min.
- Idempotency key on commits prevents duplicate writes during retry.

## Core Algorithms

### Algorithm 1: Optimistic Concurrency Control for ACID Commits

**Purpose**: Guarantee atomic, serializable writes on object storage that has no native locking.

```
FUNCTION commit_transaction(catalog, table_id, base_snapshot, changes):
    // Phase 1: Write data files to object storage
    new_files = []
    FOR EACH batch IN changes.data_batches:
        file_path = generate_unique_path(table_id, batch.partition)
        write_parquet(object_storage, file_path, batch.data)
        stats = collect_column_statistics(batch.data)
        new_files.APPEND(ManifestEntry(file_path, stats, ADDED))

    // Phase 2: Build new metadata
    new_manifest = create_manifest(new_files + changes.deleted_files)
    write_avro(object_storage, new_manifest.path, new_manifest)

    new_manifest_list = create_manifest_list(
        base_snapshot.surviving_manifests + [new_manifest]
    )
    write_avro(object_storage, new_manifest_list.path, new_manifest_list)

    new_snapshot = Snapshot(
        id = base_snapshot.id + 1,
        parent = base_snapshot.id,
        manifest_list = new_manifest_list.path,
        operation = changes.operation_type
    )
    write_json(object_storage, new_snapshot.path, new_snapshot)

    // Phase 3: Atomic compare-and-swap
    success = catalog.compare_and_swap(
        table_id,
        expected = base_snapshot.id,
        desired  = new_snapshot
    )

    IF NOT success:
        // Conflict: another writer committed first
        latest_snapshot = catalog.load_current_snapshot(table_id)
        IF can_rebase(changes, base_snapshot, latest_snapshot):
            RETURN commit_transaction(catalog, table_id, latest_snapshot, changes)
        ELSE:
            cleanup_orphan_files(new_files)
            RAISE ConflictException("Unresolvable conflict")

    RETURN new_snapshot
```

**Complexity**: O(F) where F = number of new files for manifest construction; CAS is O(1). Retry adds another full pass. **Space**: O(F) for manifest entries.

**Conflict resolution**: Two commits conflict if they both delete the same file or if schema changes are incompatible. Non-overlapping appends to different partitions can be automatically rebased.

### Algorithm 2: Snapshot Isolation via Manifest Tracking

**Purpose**: Enable readers to see a consistent view of the table regardless of concurrent writes.

```
FUNCTION read_table(catalog, table_id, query, snapshot_id=null):
    // Step 1: Pin snapshot
    IF snapshot_id IS NOT null:
        snapshot = catalog.load_snapshot(table_id, snapshot_id)  // time travel
    ELSE:
        snapshot = catalog.load_current_snapshot(table_id)

    // Step 2: Load manifest list (partition-level summaries)
    manifest_list = load_avro(snapshot.manifest_list)

    // Step 3: Partition pruning
    surviving_manifests = []
    FOR EACH manifest_ref IN manifest_list.entries:
        IF partition_overlaps(manifest_ref.partition_bounds, query.predicates):
            surviving_manifests.APPEND(manifest_ref)

    // Step 4: File-level data skipping
    scan_files = []
    delete_files = []
    FOR EACH manifest_ref IN surviving_manifests:
        manifest = load_avro(manifest_ref.path)
        FOR EACH entry IN manifest.entries:
            IF entry.status == DELETED:
                CONTINUE  // skip tombstoned files
            IF entry.is_delete_file:
                delete_files.APPEND(entry)
                CONTINUE
            IF column_stats_overlap(entry.lower_bounds, entry.upper_bounds,
                                     query.predicates):
                scan_files.APPEND(entry)

    // Step 5: Apply delete files (MoR)
    FOR EACH data_file IN scan_files:
        applicable_deletes = find_deletes_for(data_file, delete_files)
        data_file.pending_deletes = applicable_deletes

    RETURN ScanPlan(files=scan_files, projection=query.columns)
```

**Complexity**: O(M + F) where M = manifests, F = file entries. With partition pruning, effective cost is O(M_surviving + F_surviving) which can be orders of magnitude smaller.

### Algorithm 3: Z-Order Clustering (Space-Filling Curve)

**Purpose**: Co-locate data across multiple sort dimensions so that multi-column predicates skip more files.

```
FUNCTION z_order_compact(table, partition, z_columns, target_file_size):
    // Step 1: Read all files in partition
    files = list_data_files(table, partition)
    all_rows = []
    FOR EACH file IN files:
        all_rows.EXTEND(read_parquet(file))

    // Step 2: Compute Z-value for each row
    FOR EACH row IN all_rows:
        z_bits = []
        FOR EACH col IN z_columns:
            normalized = normalize_to_range(row[col], col.min, col.max, bits=16)
            z_bits.APPEND(normalized)
        row.z_value = interleave_bits(z_bits)
        // interleave_bits: takes N bit-strings of length B,
        // produces one bit-string of length N*B by round-robin bit selection
        // e.g., A=0b1010, B=0b1100 → 0b11010100

    // Step 3: Sort by Z-value
    all_rows.SORT(key = row.z_value)

    // Step 4: Write new files at target size
    new_files = []
    current_batch = []
    current_size = 0
    FOR EACH row IN all_rows:
        current_batch.APPEND(row)
        current_size += estimate_size(row)
        IF current_size >= target_file_size:
            path = write_parquet(object_storage, current_batch)
            new_files.APPEND(ManifestEntry(path, collect_stats(current_batch)))
            current_batch = []
            current_size = 0
    IF current_batch IS NOT EMPTY:
        path = write_parquet(object_storage, current_batch)
        new_files.APPEND(ManifestEntry(path, collect_stats(current_batch)))

    // Step 5: Atomic commit replacing old files with new
    commit_replacement(table, partition, old_files=files, new_files=new_files)

    RETURN new_files
```

**Complexity**: O(N log N) for sorting N rows by Z-value. **Space**: O(N) — all rows must be in memory or spilled. **Benefit**: min-max ranges per file become tightly bounded, enabling 10x–100x fewer files scanned for multi-dimensional queries.

### Algorithm 4: Bin-Packing Compaction (Small File Merging)

**Purpose**: Merge many small files into fewer optimally-sized files to reduce metadata overhead and improve scan performance.

```
FUNCTION compact_partition(table, partition, target_size, min_files_to_compact):
    files = list_data_files(table, partition)

    // Step 1: Identify small files
    small_files = [f FOR f IN files IF f.file_size < target_size * 0.75]

    IF LENGTH(small_files) < min_files_to_compact:
        RETURN  // not enough small files to justify compaction

    // Step 2: Bin-packing — group small files into bins ≈ target_size
    bins = []
    current_bin = []
    current_bin_size = 0

    // Sort descending to improve packing efficiency (first-fit decreasing)
    small_files.SORT(key = file_size, descending = true)

    FOR EACH file IN small_files:
        IF current_bin_size + file.file_size > target_size * 1.1:
            bins.APPEND(current_bin)
            current_bin = [file]
            current_bin_size = file.file_size
        ELSE:
            current_bin.APPEND(file)
            current_bin_size += file.file_size

    IF current_bin IS NOT EMPTY:
        bins.APPEND(current_bin)

    // Step 3: Rewrite each bin as a single file
    new_files = []
    FOR EACH bin IN bins:
        combined_rows = []
        FOR EACH file IN bin:
            combined_rows.EXTEND(read_parquet(file))
            // Apply any pending delete files
            combined_rows = apply_deletes(combined_rows, file)

        IF table.sort_order IS NOT null:
            combined_rows.SORT(key = table.sort_order)

        path = write_parquet(object_storage, combined_rows)
        new_files.APPEND(ManifestEntry(path, collect_stats(combined_rows)))

    // Step 4: Atomic replacement commit
    old_files = FLATTEN(bins)
    commit_replacement(table, partition, old_files, new_files)

    RETURN CompactionResult(
        files_compacted = LENGTH(old_files),
        files_created   = LENGTH(new_files),
        bytes_rewritten = SUM(f.file_size FOR f IN old_files)
    )
```

**Complexity**: O(N log N) for sort-based bin packing; O(R) for reading R total rows. **Space**: O(R_bin) for the largest single bin's rows in memory.

## Partition Evolution

Unlike traditional Hive-style partitioning where the partition column and granularity are fixed at table creation, the lakehouse supports **hidden partitioning** with evolution.

```
FUNCTION evolve_partition(table, new_spec):
    // Metadata-only operation — no data rewrite
    current_spec = table.current_partition_spec

    // Validate: new spec must cover existing data
    new_spec.spec_id = current_spec.spec_id + 1

    // Update table metadata
    updated_metadata = table.metadata.copy()
    updated_metadata.partition_specs.APPEND(new_spec)
    updated_metadata.default_spec_id = new_spec.spec_id

    // Existing manifest entries retain their original spec_id
    // New writes use the new spec
    // Query engine resolves both specs during planning:
    //   - manifests with old spec: apply old transform to predicates
    //   - manifests with new spec: apply new transform to predicates

    catalog.commit_metadata_update(table, updated_metadata)
```

**Example**: Evolving from `partition_by(month(event_time))` to `partition_by(day(event_time))` requires zero data movement. Old files remain in monthly partitions; new files write to daily partitions. The query engine transparently handles both layouts.
