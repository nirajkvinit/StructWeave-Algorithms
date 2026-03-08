# Key Insights: Telegram

## Insight 1: Pointer-Based Fanout for 43M-Subscriber Channels

**Category:** Scaling
**One-liner:** Store the channel message once and fan out lightweight pointers (message IDs) to subscriber shards, avoiding 43 million copies of the message body.

**Why it matters:** When a channel with 43 million subscribers publishes a message, naive fanout would write 43 million copies of the message content. Instead, the message is stored once in the message store, and the fanout engine distributes only the message reference (a few bytes) to each subscriber's inbox pointer. Subscribers fetch the actual content on demand. This reduces write amplification from O(N * message_size) to O(N * pointer_size), which at 43M subscribers is the difference between terabytes and megabytes of write IO per post. Combined with the delivery classification step (10% online = direct push, 90% offline = push notification queue), the system avoids wasting resources delivering to users who will not read the message for hours. This pointer-based fanout pattern is the only viable approach for any broadcast system at millions-of-subscribers scale.

---

## Insight 2: PTS/QTS/SEQ State Model for Multi-Device Sync

**Category:** Replication
**One-liner:** Each user's state is tracked by a monotonically increasing counter (PTS), allowing any device to sync by requesting "all updates since my last known PTS value."

**Why it matters:** With unlimited devices per account, Telegram cannot assume any single device is the source of truth. The PTS (points) counter acts as a per-user event log sequence number -- every state change (message received, message edited, participant added) increments PTS by one. When a device reconnects, it sends its last known PTS, and the server returns all updates since that point. For small gaps (less than 1000 updates), individual updates are returned. For large gaps (more than 1000 or more than 24 hours), the server returns a "TOO_LONG" signal and the client performs a full state refresh instead. This variable-cost sync strategy avoids the expense of transmitting thousands of individual updates when a bulk refresh is cheaper. The PTS model is essentially a simplified event-sourcing pattern, and the same approach works for any multi-device application: note-taking apps, project management tools, or collaborative editors.

---

## Insight 3: Deterministic Tiebreaker for Simultaneous Secret Chat Initiation

**Category:** Consensus
**One-liner:** When two users simultaneously initiate a secret chat, the lower user_id deterministically wins as the initiator, converting the other request into an accept.

**Why it matters:** Secret chats use Diffie-Hellman key exchange, which requires exactly one initiator and one acceptor. If both parties simultaneously send initiation requests, the server faces two pending chat setups for the same pair. Without a resolution mechanism, this could create duplicate secret chats with different keys, or deadlock waiting for the other side to accept. The deterministic tiebreaker (lower user_id = initiator) resolves this without any coordination: the server simply converts the "losing" request from an initiation into an acceptance. This guarantees exactly one secret chat is established, with one consistent shared secret. The same deterministic-tiebreaker pattern applies to any pairwise negotiation: two nodes electing a leader, two services claiming a distributed lock, or two users simultaneously sending friend requests.

---

## Insight 4: MTProto Binary Protocol for 58% Bandwidth Reduction

**Category:** Cost Optimization
**One-liner:** Telegram's custom binary protocol (MTProto) encodes messages in ~50 bytes versus ~120 bytes for equivalent JSON, reducing mobile bandwidth consumption by 58%.

**Why it matters:** For a messaging platform serving 1 billion users -- many on metered mobile connections in developing countries -- bandwidth is a direct product concern. MTProto's TL (Type Language) schema uses binary encoding with type IDs, fixed-width integers, and length-prefixed strings, eliminating the overhead of field names, quotes, colons, and braces that JSON requires. Beyond raw encoding, MTProto supports delta compression for updates: instead of sending a full message object, an edit update sends only the new message ID, letting the client reconstruct the rest locally. Combined with multi-transport support (TCP, HTTP, WebSocket), MTProto adapts to whatever connectivity is available. The trade-off is ecosystem friction -- custom binary protocols require custom client implementations and custom debugging tools. This is viable when you control all clients (Telegram publishes its own apps) but would be a poor choice for an open API platform.

---

## Insight 5: Chunked Resumable Upload with SHA256 Deduplication for Large Files

**Category:** Resilience
**One-liner:** Split 2-4GB files into 512KB parts uploaded in parallel (8 concurrent), with per-part acknowledgment enabling resume from any interruption, and SHA256 deduplication saving 30-40% storage.

**Why it matters:** On mobile networks, a 2GB upload at typical speeds takes 30+ minutes. The probability of an interruption (network switch, app background, battery die) approaches certainty. Without resumability, users would need to restart the entire upload. Telegram's part-based protocol stores each 512KB chunk independently with a server-side acknowledgment. The client tracks which parts have been acknowledged locally, and on resume, it verifies against the server's record before continuing from the last acknowledged part. At completion, the server assembles all 4,096 parts, verifies the MD5 checksum, and performs SHA256 deduplication. Popular files shared across users (memes, viral videos) are stored only once, with references pointing to the same blob -- saving an estimated 30-40% of storage. This chunked-resumable-upload with content-addressed deduplication is the standard pattern for any large file system: cloud storage providers, video platforms, and backup services.

---

## Insight 6: Pre-Computed Subscriber Shards at Subscription Time

**Category:** Partitioning
**One-liner:** Assign each subscriber to a shard (hash(user_id) % 1000) at subscription time rather than at fanout time, making channel message delivery a parallel lookup across pre-indexed shards.

**Why it matters:** Querying 43 million subscriber records at fanout time would require a massive table scan, saturating the database during the most latency-sensitive operation. By pre-sharding at subscription time, the fanout coordinator knows exactly which shards to query and can execute 1,000 concurrent shard queries in parallel, each returning ~43,000 subscribers in about 100ms. Dedicated read replicas for fanout queries separate this read-heavy workload from subscription writes. Shard metadata (counts per shard per channel) is cached and invalidated only on subscription changes, avoiding expensive COUNT queries. This pattern -- pre-index at write time to optimize read-time fanout -- is the inverse of the common "read-optimized" vs. "write-optimized" trade-off. It works whenever the write event (subscription) is orders of magnitude less frequent than the read event (message delivery).

---

## Insight 7: Version Vector with Separate Edit Fanout for Channel Edits

**Category:** Consistency
**One-liner:** When an admin edits a channel message during active fanout, the edit creates a new version while the original fanout continues, and a separate edit-notification fanout ensures all subscribers eventually see the latest version.

**Why it matters:** Editing a message mid-fanout creates a split-world problem: subscribers who already received the message see version 1, while those who receive it later might see version 2 (or version 1 followed by the edit notification). Telegram's approach is pragmatic: let the original fanout complete undisturbed and trigger a parallel "updateEditMessage" fanout for version 2. All subscribers eventually receive both the original and the edit, and the client always displays the highest version. This eventual consistency approach is far simpler than trying to "catch up" the in-flight fanout with the new content, which would require maintaining complex per-subscriber delivery state. The version vector pattern applies to any system where content can be modified during distribution: email recall, document collaboration, or configuration propagation.

---

## Insight 8: Tiered Search Indexing with In-Memory Recent and Batch Historical

**Category:** Caching
**One-liner:** Index the last hour of messages synchronously into an in-memory index for instant search, while older messages are batch-indexed with a 5-minute delay into the persistent search cluster.

**Why it matters:** Users most frequently search for messages they sent or received in the last few minutes ("what was that link someone just shared?"). Making them wait for a 5-minute indexing pipeline to catch up degrades the experience for the most common search pattern. The tiered approach writes to a lightweight in-memory index on the message-send path (synchronous, <1ms overhead) and separately batch-processes older messages into Elasticsearch (asynchronous, 5-minute lag acceptable). Search queries hit both tiers and merge results, with deduplication by message_id. The in-memory index is partitioned by user_id so that searches never scan globally. This hot-tier + cold-tier indexing pattern applies to any search system where recency correlates with search frequency: email search, log analysis, or customer support ticket lookup.
