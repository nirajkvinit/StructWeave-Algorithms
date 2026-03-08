# Key Insights: Slack/Discord

## Insight 1: Hierarchical Fanout for Large Channels

**Category:** Scaling
**One-liner:** When a single process cannot fan out to all recipients, insert a relay layer that partitions the audience into manageable sub-groups.

**Why it matters:** Discord's guild process can push directly to session processes when a server has fewer than 15,000 members, but beyond that threshold a relay hierarchy is introduced where each relay manages up to 15,000 users. Without this tiered approach, a single guild process becomes a CPU bottleneck, and message delivery latency spikes for the entire guild. This pattern applies to any pub-sub system where the number of subscribers per topic can vary by orders of magnitude -- live sports score updates, stock ticker feeds, or global status broadcasts.

---

## Insight 2: Consistent Hashing for Channel-to-Server Affinity

**Category:** Partitioning
**One-liner:** Hash channels to dedicated servers so that in-memory subscription state stays local and fanout avoids cross-cluster coordination.

**Why it matters:** Slack maps each channel to a specific Channel Server via consistent hashing with 150 virtual nodes per server. This ensures that all subscription metadata for a channel lives on one server, enabling fast parallel push to gateway servers without distributed lookups. If channels were randomly assigned, every message would require a scatter-gather across the cluster to find subscribers, adding latency and network overhead. The virtual nodes solve the load imbalance problem that naive consistent hashing creates with a small number of physical servers.

---

## Insight 3: Selective Presence Subscriptions

**Category:** Traffic Shaping
**One-liner:** Only subscribe to the presence of users currently visible on-screen, not every user in every channel.

**Why it matters:** If every user subscribed to every other user's presence, the system would face a quadratic explosion of status updates. By subscribing only to visible users (limited to ~500 active channel members plus DM partners), lazy-loading presence on demand, and unsubscribing when users scroll away, the presence system reduces its event volume by orders of magnitude. Combined with 1-second batch windows and 3-second debouncing, this keeps the presence infrastructure tractable even with millions of concurrent users.

---

## Insight 4: Presence Storm Mitigation Through Batching and Debouncing

**Category:** Traffic Shaping
**One-liner:** Aggregate rapid presence changes into batched updates with stable-state debouncing to absorb coordinated login storms.

**Why it matters:** The 9 AM login rush creates a presence update storm where millions of users transition to "online" within minutes. Without debouncing (wait 3 seconds for stable state) and batching (aggregate changes over 1-second windows), the presence servers would be overwhelmed, causing stale indicators and delayed typing notifications across the platform. TTL-based heartbeats (30 seconds) provide natural garbage collection for stale entries, and regional isolation processes presence locally before global propagation, staggering the load across timezones.

---

## Insight 5: Process-Per-Entity Concurrency Model

**Category:** System Modeling
**One-liner:** Assign one lightweight process per logical entity (guild, user session) to achieve natural isolation and fault containment.

**Why it matters:** Discord uses Elixir's BEAM VM to run a GenServer process per guild and per user session, leveraging the actor model for millions of concurrent entities. When a guild process crashes, the BEAM supervisor restarts it and clients resync via REST -- the failure is isolated to that one guild. This model avoids shared-state concurrency bugs and provides natural backpressure, but it requires a runtime (like BEAM) that efficiently supports millions of lightweight processes. Each relay also lives on a different BEAM node for fault isolation, so a relay crash affects only its 15K users.

---

## Insight 6: Request Coalescing to Eliminate Hot-Partition Amplification

**Category:** Contention
**One-liner:** Merge concurrent database queries for the same key into a single request, sharing the result across all waiters.

**Why it matters:** Discord's migration from Cassandra to ScyllaDB was paired with Rust-based data services that coalesce duplicate read requests. When a popular channel generates thousands of concurrent reads for the same data, the coalescer issues a single database query and fans the response out. This reduced their read p99 from 40-125ms to 15ms and cut their node count from 177 to 72. Without coalescing, hot partitions from popular channels cause cascading latency spikes. Request coalescing is an underused pattern that benefits any system with hot-key read amplification: CDN origin shields, API gateway caching, and database connection pools.

---

## Insight 7: Single-Level Threading as a Deliberate UX and Engineering Trade-off

**Category:** System Modeling
**One-liner:** Flat reply threads are simpler to implement, easier to navigate, and produce clearer notification semantics than nested hierarchies.

**Why it matters:** Slack explicitly rejected multi-level threading (like Reddit or email) in favor of a single parent with flat replies. This simplifies the data model (just a parent_id reference), makes notifications unambiguous (thread vs. channel), and avoids the deep-nesting navigation problems that plague tree-structured discussions. The "also send to channel" mechanism bridges threads and channels with a broadcast flag rather than complex tree traversal. Thread subscription follows deterministic rules (auto-subscribe on create, reply, or mention), making the notification system predictable.

---

## Insight 8: SFU Over MCU for Voice at Scale

**Category:** Scaling
**One-liner:** Selective Forwarding Units (SFUs) push routing responsibility to clients, trading client CPU for dramatically better server scalability and lower latency.

**Why it matters:** Discord chose SFU architecture over MCU (Multipoint Control Unit) for voice channels because SFUs forward streams without mixing, resulting in lower server load, lower latency, and better scalability. The trade-off is higher client load (decoding N audio streams), but with adaptive voice quality -- Voice Activity Detection limits transmission to 3 active speakers when participant count exceeds 25, and Forward Error Correction activates when packet loss exceeds 5%. Geographic SFU placement (US-East, EU-West, Asia) minimizes latency by routing users to the nearest server.

---

## Insight 9: Idempotency Keys for Message Deduplication

**Category:** Atomicity
**One-liner:** Client-generated idempotency keys with a 24-hour server-side cache prevent duplicate messages from retry storms.

**Why it matters:** Network timeouts cause clients to retry message sends, which without deduplication would produce duplicate messages in channels. By attaching a UUID idempotency key to each request and caching processed keys in Redis for 24 hours, the server can safely return cached responses for retries. The 409 Conflict status code lets the client know the message was already processed. This pattern is critical for any non-idempotent operation exposed over unreliable networks, and the 24-hour TTL balances memory usage against retry window coverage.

---

## Insight 10: Snowflake IDs for Distributed Message Ordering

**Category:** Consistency
**One-liner:** Monotonically increasing Snowflake IDs assigned server-side provide a total ordering of messages without requiring distributed consensus.

**Why it matters:** When User A and User B send messages that arrive out of order due to network variance, the server assigns each message a Snowflake ID that encodes a timestamp plus machine ID. Clients insert messages sorted by this ID, ensuring consistent ordering across all viewers. This avoids the complexity of vector clocks or Lamport timestamps while providing a practical total order. The Snowflake format also encodes worker ID and sequence number, allowing multiple servers to generate IDs without coordination.

---

## Insight 11: Optimistic Concurrency Control with Version Tracking

**Category:** Consistency
**One-liner:** Attaching version numbers to messages enables conflict detection for concurrent edits and deletes without locking.

**Why it matters:** When one user edits a message while another deletes it, last-write-wins without version tracking could silently lose the edit. By incrementing a version counter on each edit and requiring the client to submit the expected version, the server can detect conflicts and return 409 responses. This avoids distributed locking while giving clients the information they need to handle conflicts gracefully.

---

## Insight 12: GC-Free Databases for Predictable Tail Latency

**Category:** Data Structures
**One-liner:** Discord migrated from Cassandra (JVM, garbage collection pauses) to ScyllaDB (C++, no GC) to eliminate unpredictable p99 latency spikes.

**Why it matters:** Cassandra's JVM garbage collection caused read latencies to swing between 40ms and 125ms at p99, with occasional 200ms+ spikes correlated with load -- exactly when consistent latency matters most. ScyllaDB's C++ shard-per-core implementation eliminated GC pauses entirely, bringing p99 reads to a stable 15ms. For any latency-sensitive system, the choice of runtime and its memory management model directly impacts tail latency reliability. The broader lesson: storage engine choice should be driven by tail-latency requirements, not just throughput benchmarks.

---

## Insight 13: Search Scalability Through Workspace and Time-Based Sharding

**Category:** Search
**One-liner:** Shard search indices by workspace and partition by time to isolate hot tenants and keep the active index small.

**Why it matters:** Full-text search across billions of messages is expensive and can strain Elasticsearch clusters. Workspace-level sharding ensures that a heavy-use workspace does not degrade search performance for others. Time-based partitioning (hot index for last 90 days plus archive) keeps the working set small, reduces index lag, and allows caching of frequent queries. Without these strategies, search latency degrades past 5 seconds and index updates fall behind, making recent messages unsearchable.

---
