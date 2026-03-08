# Google Photos — Interview Guide

## Interview Pacing (45-min format)

| Time | Phase | Focus | Key Deliverables |
|------|-------|-------|-----------------|
| 0-5 min | **Clarify** | Ask scope questions; confirm features in/out | Written scope on whiteboard |
| 5-15 min | **High-Level Design** | Upload flow, storage, CDN, sync | Architecture diagram with data flow |
| 15-30 min | **Deep Dive** | Pick 1-2: Face clustering, Search, Upload pipeline | Detailed component design with algorithms |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios, scaling | Trade-off table, failure handling |
| 40-45 min | **Wrap Up** | Summarize, handle follow-ups | Clean diagram, key numbers |

---

## Meta-Commentary

### What Makes Google Photos Unique as an Interview Question

Google Photos is a **deceptively complex** system. On the surface, it looks like "just file storage + search," but it touches:

1. **Blob storage at extreme scale** (exabytes, trillions of objects)
2. **ML-intensive workloads** (10+ models per photo, billions of inferences/day)
3. **Real-time face clustering** (unsupervised learning at scale)
4. **Multi-modal search** (combining visual, temporal, spatial, and face signals)
5. **Multi-device sync** with conflict resolution
6. **Privacy-sensitive data** (biometric data, personal photos)

### Where to Spend Most Time

| If interviewer focuses on... | Deep dive into... | Why |
|------------------------------|-------------------|-----|
| **Storage** | Upload pipeline, dedup, tiered storage, erasure coding | Core infra challenge at Google's scale |
| **ML/AI** | Face clustering (FaceNet), search embeddings, multi-signal fusion | Google's actual differentiator |
| **Scale** | Capacity estimations, caching layers, CDN strategy | Tests back-of-envelope math |
| **Reliability** | Multi-region, resumable uploads, data integrity | Shows production thinking |
| **API Design** | REST API, image serving URLs, pagination | Tests API design skills |

### Common Mistake: Treating It as Simple File Storage

Many candidates jump straight to "just use S3 + a database." The interviewer wants to see you recognize:
- Photos need **processing** (thumbnails, format conversion, ML labeling)
- **Search** is the killer feature, not just storage
- **Face clustering** is a hard ML+systems problem
- **Sync** across devices requires careful consistency design

---

## How to Approach This Problem

### Step 1: Clarify Scope (2-3 minutes)

Ask these questions to show structured thinking:

```
"Before I start, let me clarify scope:
1. Are we designing the full Google Photos, or a specific feature?
2. What's our target scale? Millions or billions of users?
3. Which features are in scope?
   - Upload & backup
   - Search (visual/text)?
   - Face grouping?
   - Sharing?
   - AI editing (Magic Eraser)?
4. Do we need to support video or just photos?
5. Any specific non-functional requirements? (latency, consistency)
6. Is multi-region a requirement?"
```

### Step 2: Establish Scale (2 minutes)

Quick back-of-envelope:
```
Users: 1B MAU, 500M DAU
Uploads: ~2B/day → ~20K/s → 60K/s peak
Average photo: 5 MB
Daily ingress: 10 PB/day
Read:Write: 10:1 → 200K reads/s
Storage: 6 trillion photos × 3 MB avg = ~18 EB
ML: 10 models/photo × 2B = 20B inferences/day
```

### Step 3: Draw Architecture (8-10 minutes)

Start with the data flow:
```
Upload path: Client → GFE → Upload Service → Colossus + Spanner
                                    ↓ (async)
                              Pub/Sub → ML Pipeline + Thumbnail Generator

Read path: Client → CDN → Thumbnail/Serving Store → Colossus (rare)

Search path: Client → Search Service → [Vector Index + Inverted Index + Face Index]
                                              → Spanner (metadata) → Client
```

### Step 4: Deep Dive (15 minutes)

Pick the component the interviewer is most interested in and go deep:

**If Face Clustering**: FaceNet embeddings → incremental assignment → periodic HAC re-clustering

**If Search**: Query parsing → multi-signal retrieval (labels, embeddings, faces, time, location) → RRF fusion → re-ranking

**If Upload Pipeline**: Resumable protocol → chunked upload → dedup → async processing

---

## Trade-offs Discussion

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Face processing location** | Cloud-based | On-device only | **Cloud-based** (better accuracy from full library context), but with strong privacy controls and opt-in |
| | Pros: Better clustering, cross-device consistency | Pros: Better privacy, no data leaves device | |
| | Cons: Privacy concerns, needs consent | Cons: Device limitations, inconsistent across devices | |
| **Search architecture** | Keyword tags only | Embedding-based (semantic) | **Hybrid** (keyword + semantic): fast for exact matches, good for fuzzy queries |
| | Pros: Simple, fast, explainable | Pros: Natural language, semantic understanding | |
| | Cons: Can't handle "photos of my dog playing" | Cons: Complex, embedding storage cost | |
| **Storage model** | All original quality | Tiered (original + compressed) | **Tiered**: Storage Saver for cost control, Original for paying users |
| | Pros: No quality loss | Pros: 40-60% storage savings | |
| | Cons: Unsustainable cost at scale | Cons: Irreversible compression | |
| **Sync consistency** | Strong consistency (sync reads) | Eventual consistency (async) | **Causal consistency** with sync tokens: ordered view per device, eventual across devices |
| | Pros: Always consistent view | Pros: Lower latency, better availability | |
| | Cons: Higher latency, cross-region penalty | Cons: Stale reads, conflicts | |
| **ML pipeline** | Synchronous (block upload) | Asynchronous (post-upload) | **Async**: Upload confirms immediately; ML runs in background within minutes |
| | Pros: Photos immediately searchable | Pros: Faster upload UX | |
| | Cons: 5-10s added latency per upload | Cons: Temporary window where photo isn't searchable | |
| **Thumbnail format** | JPEG | WebP | **WebP**: 25-35% smaller at same quality; supported on all modern browsers/apps |
| | Pros: Universal compatibility | Pros: Better compression, transparency support | |
| | Cons: Larger file sizes | Cons: Slight CPU cost for encoding | |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just use object storage and a simple database?" | Understand the ML + search complexity | "Object storage handles the blob, but the real challenge is making photos *searchable*. We need an ML pipeline for labels, face embeddings, and visual embeddings — plus a multi-signal search engine to combine them. A simple database can't do ANN search across 512-dim vectors." |
| "How would you handle face recognition without violating privacy?" | Privacy-by-design thinking | "Face grouping should be opt-in, not opt-out. Embeddings are per-user isolated, never shared across users. We use crypto-shredding on deletion. In jurisdictions like EU/Illinois, face grouping is disabled by default. The system works fully without it — search still works via labels and visual embeddings." |
| "What if a user uploads 50,000 photos at once?" | Handle extreme upload scenarios | "The upload queue is priority-sorted — older photos (by capture time) get lower priority. We rate-limit ML processing but never block uploads. Thumbnails are generated first (seconds) while ML runs in background (minutes). The user sees their photos quickly even if search isn't ready yet." |
| "How do you handle search across trillions of photos?" | Per-user scoping | "Search is per-user scoped — each user's library is 1K-100K photos, not trillions. We maintain per-user inverted and vector indices. The global scale is managed by sharding users across machines. Each individual search is fast because the search space is bounded by the user's library." |
| "What happens if Spanner goes down?" | Test failure thinking | "Spanner is designed for 5-nines availability with Paxos replication. In the extremely unlikely event of a partition, read traffic can use stale reads from replicas. Uploads would be queued client-side with the resumable protocol. We'd degrade to read-only mode rather than go fully offline." |
| "How do you ensure no photos are ever lost?" | Data durability thinking | "Multiple layers: (1) Erasure coding (Reed-Solomon 10,4) tolerates 4 chunk failures, (2) Geo-replication across 3+ regions, (3) Spanner metadata has 5+ Paxos replicas, (4) Background integrity checks verify blob-metadata consistency, (5) Crypto-shredding ensures deletion is irreversible but nothing is accidentally deleted." |
| "How would you scale this to 100x?" | Forward architecture thinking | "At 100x (100B MAU scale — theoretical), the per-user architecture is already right. We'd need: (1) More storage regions and PoPs, (2) Better ML model compression for throughput, (3) Tiered index architecture (hot users in memory, cold users on disk), (4) More aggressive caching and CDN coverage. The key insight is that each user's data is independent, so we scale horizontally by adding more user shards." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Do Instead |
|---------|---------------|-------------------|
| **Skipping ML pipeline** | Search and face grouping are core features | Explain async ML processing as a key system component |
| **Treating all photos equally** | Hot vs cold data has huge cost implications | Discuss tiered storage (SSD → HDD → archive) |
| **Ignoring upload reliability** | Users lose original photos if backup fails | Design resumable upload protocol with idempotency |
| **Single-region design** | Google serves 200+ countries | Discuss multi-region with Spanner + Colossus replication |
| **Forgetting privacy/consent** | Face data is biometric — heavily regulated | Discuss opt-in, GDPR, BIPA, data deletion |
| **Over-engineering day 1** | Building for 1B users from scratch | Start with core (upload + store + browse) then add ML features |
| **Using a single search signal** | Label-only search misses semantic queries | Explain multi-signal search with fusion |
| **Blocking upload on ML** | Users don't want to wait 10s per photo | Always make ML async; upload confirms immediately |

---

## Questions to Ask Interviewer

| Question | Why It Matters |
|----------|----------------|
| "What's the expected scale — millions or billions of users?" | Determines multi-region need, caching strategy |
| "Is search a core requirement, or just basic browsing?" | Search is the hardest part — confirms scope |
| "Do we need face grouping, or just basic object labels?" | Face clustering is very complex — want to know if it's in scope |
| "What's more important — fast upload or fast searchability?" | Informs sync vs async ML pipeline decision |
| "Are we building this for a single region or globally?" | Drives database (Spanner vs PostgreSQL) and replication decisions |
| "What's the consistency requirement for multi-device sync?" | Strong vs eventual vs causal consistency |
| "Should we support video, or just photos?" | Video adds transcoding pipeline complexity |
| "Any specific compliance requirements (GDPR, HIPAA)?" | Drives privacy architecture |

---

## Quick Reference Card

### Key Numbers
```
Users:     1B MAU, 500M DAU
Uploads:   1.7B/day → 20K/s → 60K/s peak
Storage:   6T photos, ~18 EB raw, ~27 EB with erasure coding
ML:        10+ models/photo, 20B inferences/day
Search:    ~500M queries/day, 6K QPS
Read:Write: 10:1
Photo Size: 2-30 MB (original), 2 MB (serving copy)
```

### Architecture Summary
```
Upload:  Client → GFE → Upload Svc → Colossus + Spanner → Pub/Sub → ML + Thumb
Search:  Client → Search Svc → [Vector + Inverted + Face + Temporal + Geo] → Rank
Browse:  Client → CDN → Thumb Store → Colossus (rare)
Sync:    Client → Sync Svc → Spanner (sync tokens) → Change feed
```

### Key Technologies (Generic Names for Interview)
```
Blob Storage:     Distributed filesystem (Colossus → "distributed blob store")
Metadata:         Globally-consistent SQL (Spanner → "NewSQL database")
ML Features:      Wide-column store (Bigtable → "column-family store")
Cache:            Distributed in-memory cache (Memcache → "in-memory cache")
Event Bus:        Pub/Sub messaging (Cloud Pub/Sub → "message queue")
ML Framework:     Deep learning framework (TensorFlow → "DL framework")
ML Serving:       Hardware-accelerated inference (TPU → "ML accelerators")
Search:           Hybrid index (ScaNN → "ANN index" + inverted index)
```

---

## Deep Dive Scenarios

### Scenario 1: "Walk me through uploading a photo"

```
1. Client detects new photo in camera roll
2. Background service checks: Wi-Fi? Battery? Quota?
3. Client initiates resumable upload session (POST /upload)
4. Client sends chunks (1-8 MB adaptive based on network)
5. Server ACKs each chunk, tracks progress
6. On last chunk: verify SHA-256 hash integrity
7. Server deduplicates (check content hash)
8. Write blob to Colossus, metadata to Spanner
9. Return success to client (upload done!)
10. Emit "MediaUploaded" event to Pub/Sub
11. Async: Generate thumbnails (256, 512, 1024, 2048 px)
12. Async: Run ML pipeline (classification, faces, OCR, embeddings)
13. Async: Update search indices
14. Async: Update face clusters
15. Photo appears in search within ~5 minutes
```

### Scenario 2: "How does face search work?"

```
1. User types "photos of Mom" in search
2. Query parser identifies: person search → "Mom"
3. Lookup: person label "Mom" → face_cluster_id
4. Lookup: face_cluster → all media_ids with that face
5. Additionally: run semantic search for "mom" in labels
6. Merge results using RRF (face matches weighted higher)
7. Fetch metadata for top results from Spanner
8. Return results sorted by relevance (face confidence × recency)
9. Client loads thumbnails from CDN
```

### Scenario 3: "Design the Memories feature"

```
1. Nightly batch job per user:
   - Query photos from "this day" in past years
   - Filter: high quality, good faces, no duplicates
   - Score: face variety, location diversity, photo quality
   - Select top 10-20 photos for a "Memory"

2. Memory types:
   - "X years ago today" — temporal matching
   - "Best of [Location]" — geo-clustered highlights
   - "Best of [Person]" — face-cluster highlights
   - "Recent highlights" — last week's best photos

3. Presentation:
   - Auto-generated slideshow with transitions
   - Ken Burns effect on landscape photos
   - Background music selection (ML-based mood matching)
   - Shareable as video or album

4. ML scoring model:
   - Photo quality score (blur, exposure, composition)
   - Face quality score (smiling, eyes open)
   - Diversity score (avoid too-similar photos)
   - Emotional valence (happy moments preferred)
```

---

## Related Interview Questions

| Related Question | How Google Photos Knowledge Helps |
|-----------------|----------------------------------|
| "Design Instagram" | Similar upload + storage, but add social feed |
| "Design Dropbox" | Similar sync protocol, but file-type agnostic |
| "Design a search engine" | Similar multi-signal retrieval + ranking |
| "Design a recommendation system" | Similar ML pipeline for Memories/auto-curation |
| "Design an image CDN" | Thumbnail serving, dynamic resizing, caching |
| "Design a face recognition system" | Direct overlap with face clustering component |
