# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Approach

### 45-Minute Pacing Guide

```
┌────────────────────────────────────────────────────────────────────┐
│ BLOB STORAGE SYSTEM DESIGN - 45 MINUTE INTERVIEW                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ [0-5 min] REQUIREMENTS CLARIFICATION                               │
│ ────────────────────────────────────                               │
│ • What scale? (objects, storage size, requests/sec)               │
│ • What object sizes? (KB to TB range)                             │
│ • Durability target? (11 nines typical)                           │
│ • Consistency model? (strong read-after-write)                    │
│ • Multi-region required?                                          │
│                                                                     │
│ Good Answer: "Let me design for 1PB storage, 10B objects,         │
│ 100K RPS, 11 nines durability, strong consistency in region"      │
│                                                                     │
│ [5-15 min] HIGH-LEVEL ARCHITECTURE                                 │
│ ─────────────────────────────────                                  │
│ • Draw two-tier architecture: Metadata + Data                     │
│ • Explain API Gateway → Metadata Service → Storage Nodes          │
│ • Mention key decision: separate metadata from data               │
│ • Data flow: PUT/GET object                                       │
│                                                                     │
│ Key Components to Draw:                                            │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐                 │
│   │   API    │────▶│ Metadata │────▶│ Storage  │                 │
│   │ Gateway  │     │ Service  │     │  Nodes   │                 │
│   └──────────┘     └──────────┘     └──────────┘                 │
│                                                                     │
│ [15-25 min] DEEP DIVE: DURABILITY                                  │
│ ────────────────────────────────                                   │
│ • Explain erasure coding vs replication trade-off                 │
│ • RS(10,4): 10 data + 4 parity, 40% overhead vs 200%             │
│ • Durability math: probability of losing >4 chunks                │
│ • Repair process: detect failure, decode, write new shard         │
│                                                                     │
│ [25-35 min] DEEP DIVE: CONSISTENCY + SCALING                       │
│ ───────────────────────────────────────────                        │
│ • Strong consistency: witness quorum or distributed txn           │
│ • Metadata scaling: sharding by bucket/key                        │
│ • Storage scaling: consistent hashing, add nodes                  │
│                                                                     │
│ [35-40 min] OPERATIONAL CONCERNS                                   │
│ ───────────────────────────────                                    │
│ • Multipart upload for large files                                │
│ • Storage tiering: hot → cold lifecycle                          │
│ • Cross-region replication for DR                                 │
│                                                                     │
│ [40-45 min] WRAP-UP                                                │
│ ──────────────────                                                 │
│ • Summarize key trade-offs made                                   │
│ • Mention what you'd add with more time                           │
│ • Answer follow-up questions                                       │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Whiteboard Strategy

```
┌────────────────────────────────────────────────────────────────────┐
│ WHITEBOARD LAYOUT                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ LEFT SIDE: Architecture Diagram                              │  │
│  │                                                               │  │
│  │  ┌────────┐                                                  │  │
│  │  │ Client │                                                  │  │
│  │  └───┬────┘                                                  │  │
│  │      │                                                        │  │
│  │  ┌───▼────┐    ┌──────────┐    ┌──────────────┐             │  │
│  │  │  API   │───▶│ Metadata │───▶│   Storage    │             │  │
│  │  │Gateway │    │ Service  │    │   Cluster    │             │  │
│  │  └────────┘    └──────────┘    │ ┌──┐┌──┐┌──┐ │             │  │
│  │                                │ │N1││N2││N3│ │             │  │
│  │                                │ └──┘└──┘└──┘ │             │  │
│  │                                └──────────────┘             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ RIGHT SIDE: Key Numbers & Formulas                           │  │
│  │                                                               │  │
│  │  Scale:                                                       │  │
│  │  • 1 PB storage                                              │  │
│  │  • 10B objects                                                │  │
│  │  • 100K RPS                                                   │  │
│  │                                                               │  │
│  │  Durability (RS 10,4):                                       │  │
│  │  • 40% overhead vs 200% for 3x                               │  │
│  │  • Need 10 of 14 to recover                                  │  │
│  │  • P(loss) ≈ 10^-11 (11 nines)                              │  │
│  │                                                               │  │
│  │  Latency Targets:                                            │  │
│  │  • First byte: < 100ms p99                                   │  │
│  │  • PUT complete: < 200ms p99                                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Key Talking Points

### Must-Mention Concepts

| Topic | What to Say | Why It Matters |
|-------|-------------|----------------|
| **Metadata/Data Separation** | "Separate metadata service from storage nodes for independent scaling" | Core architectural decision |
| **Erasure Coding** | "RS(10,4) gives 11 nines durability with only 40% overhead vs 200% for 3x replication" | Shows you understand storage efficiency |
| **Strong Consistency** | "S3 moved to strong consistency in 2020 using CRDTs/witnesses" | Shows awareness of modern requirements |
| **Chunking** | "Split large files into 64MB chunks for parallel upload/download" | Addresses large file handling |
| **Multipart Upload** | "For files > 5GB, use multipart: initiate, upload parts in parallel, complete" | Real-world API design |
| **Storage Tiering** | "Hot/Warm/Cold tiers with lifecycle policies to optimize cost" | Cost awareness |

### Things to Avoid

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| Ignoring metadata | Metadata is often the bottleneck | Design metadata service explicitly |
| Just saying "replicate 3x" | Misses cost efficiency | Discuss erasure coding trade-offs |
| Assuming eventual consistency | Modern systems are strong | Mention S3's 2020 consistency change |
| Forgetting durability math | Can't justify 11 nines | Show calculation: P(5 failures) |
| Skipping multipart upload | Unrealistic for large files | Discuss chunk upload flow |

---

## Trap Questions & Answers

### Question: "Why not just replicate 3 times? Simpler, right?"

```
┌────────────────────────────────────────────────────────────────────┐
│ GOOD ANSWER                                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ "3x replication is simpler but significantly more expensive.       │
│                                                                     │
│ For 1 PB of data:                                                  │
│ • 3x replication: 3 PB raw storage (200% overhead)                │
│ • RS(10,4): 1.4 PB raw storage (40% overhead)                     │
│                                                                     │
│ At scale, this cost difference is massive:                         │
│ • 3x: $69,000/month                                                │
│ • RS: $32,000/month                                                │
│ • Savings: $37,000/month = $444,000/year                          │
│                                                                     │
│ The trade-off is:                                                  │
│ • Replication: Lower latency reads (any copy), simpler repair     │
│ • Erasure coding: Lower cost, needs K shards to read/repair       │
│                                                                     │
│ Hybrid approach: Use replication for hot/small files where        │
│ latency matters, erasure coding for cold/large data."             │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Question: "How do you handle a 5 TB file upload?"

```
┌────────────────────────────────────────────────────────────────────┐
│ GOOD ANSWER                                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ "A 5 TB file can't be uploaded in one HTTP request - too risky    │
│ for failures, timeouts, memory. Use multipart upload:             │
│                                                                     │
│ 1. Initiate: POST /bucket/key?uploads                             │
│    Returns upload_id                                               │
│                                                                     │
│ 2. Upload parts (64MB each, ~80,000 parts):                       │
│    PUT /bucket/key?partNumber=N&uploadId=...                      │
│    • Can upload in parallel (100 concurrent)                      │
│    • Each part returns ETag                                        │
│    • Can retry individual failed parts                            │
│                                                                     │
│ 3. Complete: POST /bucket/key?uploadId=...                        │
│    Body: list of (partNumber, ETag)                               │
│    • Server verifies all parts present                            │
│    • Creates final object pointing to all part chunks             │
│    • Computes composite ETag                                       │
│                                                                     │
│ Benefits:                                                          │
│ • Parallelism: 100 × 1 Gbps = 100 Gbps effective upload          │
│ • Resumability: restart from last successful part                 │
│ • No memory pressure: stream each part                            │
│                                                                     │
│ Edge case: If client abandons, lifecycle policy auto-aborts       │
│ incomplete uploads after 7 days."                                 │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Question: "What happens if a storage node fails during a read?"

```
┌────────────────────────────────────────────────────────────────────┐
│ GOOD ANSWER                                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ "With erasure coding RS(14,10), we have redundancy built in:      │
│                                                                     │
│ Scenario: Reading object, Node 5 fails mid-stream                 │
│                                                                     │
│ 1. Detect failure: Read timeout or connection reset               │
│                                                                     │
│ 2. Failover logic:                                                │
│    • We have 14 shards, need only 10                             │
│    • If we already got shard 5 before failure: continue          │
│    • If not: skip shard 5, read from remaining 13 nodes          │
│    • Still have 13 > 10 shards available                         │
│                                                                     │
│ 3. Erasure decode:                                                 │
│    • Collect any 10 shards                                        │
│    • Decode to reconstruct original data                          │
│    • Transparent to client - they get the full object            │
│                                                                     │
│ 4. Latency impact:                                                 │
│    • Minimal if shards read in parallel                          │
│    • Only wait for fastest 10 of 14                               │
│    • P99 might increase slightly (decode overhead)               │
│                                                                     │
│ 5. Background repair:                                              │
│    • Repair service notified of failed node                       │
│    • Queues affected chunks for repair                            │
│    • Rebuilds missing shard to new node"                          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Question: "How do you achieve strong consistency?"

```
┌────────────────────────────────────────────────────────────────────┐
│ GOOD ANSWER                                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ "S3 switched to strong consistency in 2020. Here's how:           │
│                                                                     │
│ Before 2020 (eventual consistency):                                │
│ • Write to primary, async replicate to replicas                   │
│ • Read might hit replica before replication complete              │
│ • PUT then GET could return 404 or old data                       │
│                                                                     │
│ After 2020 (strong consistency):                                   │
│ • Witness-based protocol:                                         │
│   1. Write: Commit to quorum of witnesses (fast metadata)         │
│   2. Read: Check witnesses for latest version                     │
│   3. Return latest confirmed version                              │
│                                                                     │
│ • Or CRDTs for metadata:                                          │
│   1. Metadata as conflict-free replicated data type               │
│   2. Concurrent writes merge deterministically                    │
│   3. Reads always see causally consistent state                   │
│                                                                     │
│ Trade-offs:                                                        │
│ • +5-10ms write latency (witness quorum)                         │
│ • No read latency impact (witness check fast)                    │
│ • Complexity in metadata layer                                    │
│                                                                     │
│ For cross-region: async replication still (can't have strong     │
│ consistency at WAN latency without major performance hit)."       │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Trade-off Discussions

### Replication vs Erasure Coding

| Factor | Replication (3x) | Erasure Coding RS(10,4) |
|--------|------------------|-------------------------|
| Storage Overhead | 200% | 40% |
| Read Latency | Lower (any copy) | Higher (may need decode) |
| Write Latency | Lower (parallel copies) | Higher (encoding) |
| Repair Cost | Copy full object | Read K shards, decode |
| Complexity | Simple | Complex |
| **Best For** | Hot data, small files | Cold data, large files |

**Interview Answer:** "I'd use a hybrid: replication for frequently accessed hot data where latency matters, erasure coding for cold/archival data where cost efficiency is priority."

### Fixed vs Variable Chunking

| Factor | Fixed-Size (64MB) | Variable (CDC) |
|--------|-------------------|----------------|
| Implementation | Simple | Complex (rolling hash) |
| Deduplication | None | Excellent |
| Chunk Boundaries | Arbitrary | Content-based |
| Use Case | General storage | Backup, sync |

**Interview Answer:** "Fixed chunking is simpler and sufficient for most blob storage. Variable (content-defined) chunking shines in backup systems where deduplication across versions saves significant storage."

### Metadata: SQL vs NoSQL

| Factor | SQL (MySQL/PostgreSQL) | NoSQL (DynamoDB/Cassandra) |
|--------|------------------------|----------------------------|
| Consistency | Strong (ACID) | Tunable (often eventual) |
| Queries | Rich (joins, indexes) | Limited (key-value) |
| Scaling | Harder (sharding) | Easier (native distributed) |
| List Operations | Efficient | Potentially slow |

**Interview Answer:** "I'd lean toward a sharded SQL database (like CockroachDB or Vitess) for metadata. We need strong consistency for object visibility and efficient list operations with prefix filtering. NoSQL would struggle with LIST bucket operations."

---

## Common Mistakes

| Mistake | Impact | Correct Approach |
|---------|--------|------------------|
| Treating metadata as trivial | Metadata often bottleneck at scale | Design explicit metadata service with sharding strategy |
| Forgetting multipart upload | Can't handle large files | Always mention multipart for objects > 5GB |
| No consistency discussion | Missing key design point | Explain strong read-after-write consistency |
| Ignoring cost | Shows lack of practical awareness | Discuss storage tiering, erasure coding cost savings |
| Single region only | Incomplete for DR | Mention cross-region replication for disaster recovery |
| No durability math | Can't justify 11 nines claim | Calculate: P(losing >4 shards) for RS(14,10) |

---

## Follow-up Questions to Expect

1. **"How would you handle a bucket with 1 trillion objects?"**
   - Shard metadata by key prefix
   - Partition list index
   - Consider request throttling

2. **"What if a region goes down completely?"**
   - Cross-region replication
   - Failover to replica region
   - RPO/RTO trade-offs

3. **"How do you prevent a single client from abusing the system?"**
   - Per-account rate limiting
   - Per-bucket quotas
   - Throttling based on request patterns

4. **"How would you implement versioning?"**
   - Store version_id with each object
   - Current pointer to latest version
   - List versions API
   - Lifecycle policies for old versions

5. **"What metrics would you monitor?"**
   - Request latency (p50, p99)
   - Error rates (4xx, 5xx)
   - Storage utilization
   - Durability (degraded chunks)
   - Repair queue depth

---

## Quick Reference Card

```
┌────────────────────────────────────────────────────────────────────┐
│ BLOB STORAGE CHEAT SHEET                                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Architecture:                                                       │
│   Client → API Gateway → Metadata Service → Storage Nodes          │
│                                                                     │
│ Key Numbers:                                                        │
│   • 11 nines durability (99.999999999%)                           │
│   • < 100ms p99 first byte latency                                │
│   • 5 GB max single PUT (use multipart for larger)                │
│   • 5 TB max object size (with multipart)                         │
│   • 64 MB typical chunk size                                       │
│                                                                     │
│ Erasure Coding:                                                     │
│   RS(10,4) = 10 data + 4 parity                                   │
│   • 40% storage overhead                                           │
│   • Tolerate 4 failures                                            │
│   • Need any 10 to recover                                         │
│                                                                     │
│ Multipart Upload:                                                   │
│   1. POST ?uploads → get upload_id                                │
│   2. PUT ?partNumber=N&uploadId=X (parallel)                      │
│   3. POST ?uploadId=X with part list                              │
│                                                                     │
│ Storage Classes:                                                    │
│   Standard → IA (30d) → Glacier (90d) → Deep Archive (365d)      │
│                                                                     │
│ Consistency:                                                        │
│   Strong read-after-write (since S3 2020)                          │
│   Eventual for cross-region replication                            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```
