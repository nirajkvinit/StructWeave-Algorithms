# Key Insights: Blob Storage System

[← Back to Index](./00-index.md)

---

## Insight 1: Erasure Coding Achieves Higher Durability with Lower Storage Overhead Than Replication

**Category:** Data Structures
**One-liner:** Reed-Solomon RS(14,10) delivers 11-nines durability at 1.4x storage overhead, while 3x replication only achieves ~8-nines at 3x overhead.
**Why it matters:** The mathematics are counterintuitive: erasure coding tolerates 4 simultaneous shard losses (any 10 of 14 shards suffice for reconstruction), yet uses less than half the storage of triple replication. The key enabler is Galois Field arithmetic (GF(2^8)), where addition is XOR and every non-zero element has a multiplicative inverse, allowing the Vandermonde encoding matrix to be inverted from any K-subset of rows. This tradeoff between mathematical complexity and storage efficiency is why every major cloud storage system uses erasure coding for cold/warm data, reserving replication only for hot data where single-copy read latency matters.

---

## Insight 2: The Metadata Service Is the True Bottleneck, Not the Storage Layer

**Category:** Scaling
**One-liner:** At 500 trillion objects, metadata operations (LIST, PUT lookup, bucket scanning) become the dominant performance bottleneck, not data I/O.
**Why it matters:** Blob storage architectures separate metadata from data for a reason: they scale independently and hit different limits. A LIST operation on a prefix in a billion-object bucket requires scanning a massive index with deep pagination. The solution stack -- sharding metadata by bucket+key prefix hash, using virtual partitions that auto-split on hot access patterns (the S3 approach), and separating the list index from point-lookup metadata -- reflects that metadata management at this scale is essentially a distributed database problem layered on top of a storage problem. Treating metadata as trivial is the most common design mistake in blob storage interviews.

---

## Insight 3: CRDTs Enable Strong Consistency Without Coordination Overhead on Reads

**Category:** Consistency
**One-liner:** S3 achieved strong read-after-write consistency at exabyte scale by using CRDTs for metadata and a lightweight witness quorum, adding only 5-10ms to writes with zero read latency impact.
**Why it matters:** Before 2020, S3 was eventually consistent, and the industry accepted this as a necessary tradeoff at scale. The breakthrough was recognizing that object metadata (version vectors, timestamps) naturally forms a CRDT where concurrent writes resolve via last-writer-wins, and a witness quorum of 2-of-3 lightweight nodes can track the latest committed version without being in the data path for reads. This design means reads simply check the witness for the latest version number (a fast operation) rather than performing a full consensus round, delivering strong consistency with negligible latency penalty.

---

## Insight 4: Reference Counting Prevents the Delete-During-Read Race Condition

**Category:** Atomicity
**One-liner:** When a client streams a 10 GB object and another client deletes it mid-stream, reference counting on object versions ensures the read completes while new reads get 404.
**Why it matters:** The naive approach of immediately deleting data on a DELETE request breaks in-flight reads. The solution is a multi-phase deletion: soft-delete marks the object as deleted in metadata (new reads get 404 immediately), reference counting tracks active readers, and garbage collection only removes data when active_read_count = 0 AND deleted_at < now - grace_period. This pattern -- separating logical deletion from physical deletion -- is fundamental to any storage system that supports concurrent reads and deletes, and the grace period (typically 24 hours) provides a safety net against reference counting bugs.

---

## Insight 5: Write Quorum for Erasure Coding Is Not Simply "Majority"

**Category:** Replication
**One-liner:** For RS(14,10), the write quorum is ceil((N+K)/2) = 12, not the simple majority of 8, because the system must guarantee any reader can find K valid shards.
**Why it matters:** The write quorum formula ensures that the set of nodes that acknowledged a write and the set of nodes a reader contacts always overlap by at least K shards, guaranteeing reconstruction. Writing to only a simple majority (8 of 14) could result in a scenario where a reader contacts 10 nodes and fewer than 10 have the latest version. This quorum intersection property is the mathematical foundation of read-after-write consistency in erasure-coded systems, and getting it wrong silently produces stale reads rather than obvious failures.

---

## Insight 6: Repair Prioritization Must Be Exponential, Not Linear

**Category:** Resilience
**One-liner:** The repair priority for a chunk with 3 lost shards should be 4x higher than one with 2 lost shards, because each additional loss moves exponentially closer to data loss.
**Why it matters:** In RS(14,10), losing 4 shards means the chunk is at its durability limit -- one more failure causes permanent data loss. Linear prioritization (priority proportional to lost shards) underestimates the urgency of chunks near the failure threshold. Exponential prioritization (doubling per lost shard) combined with additional factors like node failure correlation (same rack = higher priority) and access frequency (hot objects first) ensures that repair bandwidth is allocated where it prevents the most data loss risk. The repair system must also respect bandwidth budgets to avoid competing with client traffic, creating a classic resource allocation problem.

---

## Insight 7: Log-Structured Storage Reduces Small Object Reads from O(n) Seeks to O(1)

**Category:** Data Structures
**One-liner:** The Haystack pattern aggregates millions of small objects into large append-only volume files with an in-memory index, achieving one disk seek per read regardless of object count.
**Why it matters:** Traditional file systems store each object as a separate file, requiring directory traversal and at least one disk seek per read. At 260 billion photos (Facebook's scale), this is catastrophically slow on HDDs (~8ms per seek = ~150 IOPS for random reads). Log-structured storage packs many "needles" into large "haystack" volume files and maintains an in-memory offset index, converting random reads into a single seek to a known offset. The tradeoff is that deletes leave holes requiring periodic compaction, and the in-memory index must be sized for the total object count. This pattern is the foundation of high-throughput photo and media serving systems.

---

## Insight 8: Multipart Upload Assembly Requires Atomic Metadata Transition

**Category:** Atomicity
**One-liner:** The completion of a multipart upload must atomically transition from a pending upload record to a visible object pointing at the uploaded chunks, while handling concurrent completions, part overwrites, and abandoned uploads.
**Why it matters:** Multipart uploads introduce a complex state machine: parts can be uploaded in parallel, overwritten, and the completion request must validate all parts exist with matching ETags before making the object visible. The edge cases are numerous -- concurrent complete requests (only first wins via database transaction), abandoned uploads (background cleanup after 7 days), and part size violations (parts 1 to N-1 must be >= 5 MB). The composite ETag calculation (MD5 of concatenated part MD5s, suffixed with part count) is a non-obvious design choice that allows clients to verify upload integrity without the server storing per-part checksums permanently.
