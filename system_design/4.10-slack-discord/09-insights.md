# Key Insights: Slack/Discord

## Insight 1: Discord's Relay Hierarchy for 15M-Member Guild Fanout

**Category:** Scaling
**One-liner:** For guilds exceeding 15,000 members, insert a relay layer that partitions users into groups of 15K, turning one guild process's O(N) fanout into O(N/15K) relay messages plus parallel O(15K) relay-to-session fanout.

**Why it matters:** A single Elixir GenServer (guild process) can efficiently manage state and fan out messages to ~15,000 session processes directly. Beyond that, the guild process becomes a CPU bottleneck -- serializing 15M message sends through a single process mailbox creates unacceptable latency. The relay layer solves this by introducing a fan-out tree: the guild process sends to ~1,000 relay processes (each managing 15K users), and each relay fans out to its sessions in parallel. This transforms a serial O(15M) operation into a parallel O(1000) + parallel O(15K) operation. Relays also enforce permission checks locally, avoiding a round-trip to the guild process. Each relay lives on a different BEAM node for fault isolation -- if one relay crashes, only its 15K users are affected, and the supervisor restarts it immediately. This hierarchical fanout pattern applies to any system delivering events to massive subscriber sets: live sports score updates, stock ticker feeds, or global status broadcasts.

---

## Insight 2: Consistent Hashing with Virtual Nodes for Channel Server Assignment (Slack)

**Category:** Partitioning
**One-liner:** Hash each channel ID to a Channel Server using consistent hashing with 150 virtual nodes per server, ensuring that server additions/removals only redistribute ~1/N of channels.

**Why it matters:** Slack routes each channel to a specific Channel Server that maintains an in-memory subscriber list. Without consistent hashing, adding or removing a Channel Server would require reassigning all channels -- a massive disruption during scaling events. With consistent hashing and 150 virtual nodes per physical server, the hash ring is evenly populated, and adding a server only migrates ~1/N of channels. The Channel Server then maintains the mapping of which Gateway Servers have users subscribed to that channel, enabling efficient parallel push. The virtual nodes solve the load imbalance problem that naive consistent hashing creates with a small number of physical servers. This pattern is directly applicable to any stateful routing system: database connection routing, cache shard assignment, or session affinity in WebSocket systems.

---

## Insight 3: Request Coalescing in Rust Data Services (Discord's Cassandra-to-ScyllaDB Migration)

**Category:** Contention
**One-liner:** Multiple concurrent requests for the same channel's messages are coalesced into a single database query, with the response shared among all requesters -- reducing hot-partition load by orders of magnitude.

**Why it matters:** Popular Discord channels (10M+ member guilds) create hot partitions: thousands of users loading the same channel's message history simultaneously generate thousands of identical database queries. Discord's Rust data service layer detects these duplicate in-flight queries and coalesces them -- the first request goes to ScyllaDB, and all subsequent requests for the same data block until the first response arrives, then share it. Combined with the migration from Cassandra (JVM with GC pauses of 40-125ms p99) to ScyllaDB (C++ with 15ms p99), this reduced infrastructure from 177 nodes to 72 and eliminated the unpredictable latency spikes that plagued the Cassandra deployment. Request coalescing is an underused pattern that benefits any system with hot-key read amplification: CDN origin shields, API gateway caching, and database connection pools.

---

## Insight 4: Selective Presence Subscription with Debounced Propagation

**Category:** Traffic Shaping
**One-liner:** Subscribe to presence updates only for users currently visible on screen, debounce rapid state changes by 3 seconds, and batch updates into 1-second windows to prevent presence storms from overwhelming the system.

**Why it matters:** If every user subscribed to every other user's presence, a workspace with 100K users would generate O(N^2) update messages on every status change. The selective subscription model limits each client's presence scope to ~500 users (visible channel members + DM partners), reducing the fanout by 200x. Debouncing by 3 seconds filters out the noise from users toggling between windows or briefly losing focus. Batching over 1-second windows aggregates multiple status changes into a single network message. The TTL-based heartbeat (30 seconds) provides a natural garbage collection for stale presence entries -- if no heartbeat arrives, the user is assumed offline. This layered approach (selective subscription + debounce + batch + TTL) is the standard solution for any real-time status system where naive implementation would create quadratic messaging overhead: collaborative document presence, multiplayer game lobbies, or IoT device status dashboards.

---

## Insight 5: SFU over MCU for Scalable Voice Channels (Discord)

**Category:** Scaling
**One-liner:** Use Selective Forwarding Units (SFU) that route audio streams without mixing, shifting decode load to clients but dramatically reducing server CPU and latency compared to media mixing (MCU).

**Why it matters:** An MCU (Multipoint Control Unit) decodes all incoming audio streams, mixes them into a single stream, and re-encodes -- requiring O(N) decode operations and one encode per participant. An SFU simply forwards each speaker's compressed audio stream to all listeners without touching the codec, requiring zero transcoding. Discord's SFU approach reduces server CPU per voice channel by 10-100x, enabling 2.5M+ concurrent voice users with reasonable infrastructure. The trade-off is higher client CPU (each participant decodes N streams instead of 1), which Discord mitigates with Voice Activity Detection (only transmit the top 3 active speakers in channels with 25+ participants) and adaptive quality (reduce bitrate and enable Forward Error Correction when packet loss exceeds 5%). Geographic SFU placement (US-East, EU-West, Asia) minimizes latency by routing users to the nearest server. This SFU architecture is now standard for all large-scale voice platforms: Google Meet, Microsoft Teams, and Zoom all use SFU for most call types.

---

## Insight 6: Single-Level Threading as a Deliberate Complexity Constraint (Slack)

**Category:** System Modeling
**One-liner:** Slack rejected multi-level threading (like Reddit or email) in favor of flat parent-plus-replies, trading navigational depth for notification simplicity and data model clarity.

**Why it matters:** Multi-level threading creates exponential complexity: notifications must track read state per branch, UI must render collapsible tree hierarchies, and replies can become orphaned if parent threads are deleted or moved. Slack's single-level model (parent message + flat replies) keeps notification routing binary: you either receive thread updates or you do not. The "also send to channel" option creates dual visibility (message appears in both thread and channel) without nesting complexity. Thread subscription follows deterministic rules (auto-subscribe on create, reply, or mention). The data model is simple: each reply has a thread_ts pointing to the parent, with no recursive references. This constraint makes search, pagination, and caching straightforward. The lesson is broader: sometimes the architecturally elegant choice (deep threading) creates disproportionate complexity, and a simpler model with clear constraints produces a better overall system.

---

## Insight 7: Idempotency Keys with 24-Hour TTL for Message Deduplication

**Category:** Atomicity
**One-liner:** Every message POST carries a client-generated idempotency key cached in Redis for 24 hours, allowing safe retries without creating duplicate messages.

**Why it matters:** Network timeouts on message sends are common -- the client does not know whether the server processed the request. Without idempotency, retrying creates duplicate messages in the channel. The client generates a UUID as the idempotency key before the first attempt and includes it in all retries. The server checks Redis: if the key exists, it returns the cached response without processing again; if not, it processes the message, caches the result with a 24-hour TTL, and returns it. The 409 Conflict status code for duplicate keys lets the client know the message was already processed. This pattern is critical for any non-idempotent operation exposed over unreliable networks. The 24-hour TTL is a pragmatic choice -- long enough to cover extended retry scenarios, short enough to bound Redis memory usage.

---

## Insight 8: Snowflake IDs for Message Ordering Without Coordination

**Category:** Consistency
**One-liner:** Assign each message a Snowflake ID (timestamp-embedded, monotonically increasing) at the server so that message ordering is determined by ID comparison, not by unreliable client clocks or arrival order.

**Why it matters:** When User A sends message 1 and User B sends message 2, network latency may cause them to arrive at the server in reverse order. Client-side timestamps are unreliable (clock skew, timezone bugs). Server-side Snowflake IDs solve this by embedding the server timestamp into a monotonically increasing 64-bit ID at the moment the message is persisted. Clients display messages sorted by Snowflake ID, guaranteeing consistent ordering across all viewers. The Snowflake format also encodes the worker ID and sequence number, allowing multiple servers to generate IDs without coordination. This approach eliminates an entire class of ordering bugs and is why both Slack and Discord use Snowflake-style IDs. The pattern applies to any distributed system needing a globally consistent, roughly time-ordered identifier: event logs, transaction records, or audit trails.

---

## Insight 9: ScyllaDB Over Cassandra to Eliminate GC-Induced Latency Spikes

**Category:** Data Structures
**One-liner:** Discord migrated from Cassandra to ScyllaDB to eliminate JVM garbage collection pauses that caused p99 latencies of 40-125ms, achieving a consistent 15ms p99 with a C++ storage engine.

**Why it matters:** Cassandra's JVM-based architecture introduces stop-the-world garbage collection pauses that are unpredictable and correlated with load -- exactly when you need consistent latency the most. ScyllaDB reimplements the Cassandra data model in C++ with shard-per-core architecture, eliminating GC entirely. Discord's migration reduced their cluster from 177 Cassandra nodes to 72 ScyllaDB nodes while improving p99 read latency from 40-125ms (with occasional 200ms+ spikes) to a flat 15ms. The shard-per-core design also eliminates internal lock contention. This migration demonstrates that at sufficient scale, the JVM's memory management model becomes a liability for latency-sensitive workloads. The broader lesson: storage engine choice should be driven by tail-latency requirements, not just throughput benchmarks.
