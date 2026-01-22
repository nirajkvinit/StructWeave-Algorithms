# Interview Guide

[Back to Index](./00-index.md) | [Previous: Observability](./07-observability.md)

---

## Interview Pacing (45 Minutes)

| Time | Phase | Focus | Key Activities |
|------|-------|-------|----------------|
| **0-5 min** | Clarify | Scope the problem | Ask clarifying questions, establish constraints |
| **5-15 min** | High-Level | Architecture | Draw component diagram, explain data flow |
| **15-30 min** | Deep Dive | Critical components | Buffer, windowing, sync—pick 1-2 to detail |
| **30-40 min** | Scale & Trade-offs | Production concerns | Bottlenecks, failures, consistency choices |
| **40-45 min** | Wrap Up | Summary | Recap decisions, handle follow-up questions |

---

## Phase 1: Clarifying Questions (0-5 min)

### Must-Ask Questions

| Question | Why It Matters | Likely Answer |
|----------|----------------|---------------|
| "What types of devices are generating data?" | Determines protocols, data formats | Sensors, PLCs, cameras, mobile |
| "What's the expected event rate per edge node?" | Sizes buffer, processing capacity | 1K-100K events/sec |
| "How long should the system work offline?" | Sizes local storage | Hours to days |
| "What latency is acceptable for local processing?" | Stream vs batch decision | Sub-100ms for real-time |
| "What consistency guarantees are needed?" | Eventual vs strong | Usually eventual is fine |
| "What's the network bandwidth between edge and cloud?" | Determines sync strategy | 1-100 Mbps, variable |

### Good Follow-up Questions

- "Are there regulatory requirements for data residency?"
- "Is there existing infrastructure (message queue, database) I should integrate with?"
- "What's the criticality of the data—can we sample or drop some events?"
- "Are there multiple types of streams with different priorities?"

### Red Flag: Skipping Requirements

**Bad approach:** Immediately jumping into "We'll use Kafka..."

**Better approach:** "Before I design the system, let me understand the scale and constraints. What's the expected event rate and how long should the edge operate without cloud connectivity?"

---

## Phase 2: High-Level Design (5-15 min)

### Diagram to Draw

```
┌─────────────────────────────────────────────────────────────┐
│                      EDGE NODE                               │
│  ┌─────────┐    ┌───────────┐    ┌──────────┐              │
│  │ Protocol│───▶│ Stream    │───▶│ Windowing│              │
│  │ Adapter │    │ Router    │    │ Engine   │              │
│  └─────────┘    └─────┬─────┘    └────┬─────┘              │
│                       │               │                     │
│                       ▼               ▼                     │
│               ┌───────────────────────────┐                │
│               │   Store-and-Forward       │                │
│               │   Buffer (Persistent)     │                │
│               └───────────┬───────────────┘                │
│                           │                                 │
│                           ▼                                 │
│               ┌───────────────────────────┐                │
│               │      Sync Manager         │                │
│               └───────────┬───────────────┘                │
└───────────────────────────┼─────────────────────────────────┘
                            │
                   (Network - may be intermittent)
                            │
                            ▼
                    ┌───────────────┐
                    │     Cloud     │
                    │   (Ingest +   │
                    │    Storage)   │
                    └───────────────┘
```

### Key Points to Verbalize

1. **"I'll design this as a local-first system"** — Edge processes and stores locally; cloud sync is async
2. **"The buffer is the critical component"** — It ensures no data loss during outages
3. **"Processing happens before buffering"** — We aggregate to reduce what we need to sync
4. **"The sync manager handles retries"** — With exponential backoff and batching

### Data Flow Explanation

> "An event comes in from a device via MQTT or HTTP. The protocol adapter normalizes it into our internal format. The stream router sends it both to the buffer for durability and to the windowing engine for real-time aggregation. The windowing engine maintains in-memory state and emits aggregates when windows close. The sync manager periodically batches pending events and aggregates, compresses them, and uploads to cloud. If sync fails, events stay in the buffer until successful."

---

## Phase 3: Deep Dive (15-30 min)

### Deep Dive Option 1: Store-and-Forward Buffer

**What to explain:**

1. **Why it's critical:** "The buffer is our safety net. If the network goes down for hours, we don't lose data."

2. **How it works:**
   - "We use SQLite in WAL mode for durability—every write is fsync'd"
   - "Events have three states: pending, syncing, synced"
   - "We scan for pending events, mark them syncing, upload, then mark synced on ACK"
   - "Synced events are eventually evicted to make room"

3. **Failure handling:**
   - "If the node crashes, we recover from the last checkpoint"
   - "If buffer fills, we prioritize: evict synced first, then downsample old pending"
   - "We never lose recent data—we'd rather lose old data"

4. **Draw the state machine:**
   ```
   PENDING ──(batch selected)──▶ SYNCING
      ▲                             │
      │                             │
      └──(sync failed)──────────────┘
                                    │
                           (sync succeeded)
                                    ▼
                                 SYNCED ──(eviction)──▶ DELETED
   ```

### Deep Dive Option 2: Windowing Engine

**What to explain:**

1. **Why it's critical:** "Windowing lets us do real-time aggregation—instead of syncing millions of raw events, we sync thousands of aggregates."

2. **Window types:**
   - "Tumbling windows for regular metrics (every 5 minutes)"
   - "Sliding windows for moving averages (1-minute slide over 5-minute window)"
   - "Session windows for activity grouping (close after 30 seconds idle)"

3. **Watermark mechanism:**
   - "Watermarks track event-time progress"
   - "Window closes when watermark passes window end"
   - "We allow some lateness (e.g., 30 seconds) for out-of-order events"

4. **Incremental aggregation:**
   - "We don't store all events—we maintain running aggregates"
   - "For avg: store sum and count, compute avg at emit time"
   - "This keeps memory bounded regardless of event volume"

### Deep Dive Option 3: Sync Protocol

**What to explain:**

1. **Batching strategy:**
   - "We batch by count (1000 events) or time (30 seconds)"
   - "Batches are compressed with zstd before transmission"
   - "Each batch has an idempotency key for exactly-once delivery"

2. **Failure handling:**
   - "On failure, we retry with exponential backoff"
   - "After 3 failures, we move to next batch (don't block on one bad batch)"
   - "Circuit breaker opens after sustained failures"

3. **Priority sync:**
   - "After long outage, we prioritize: alerts first, then aggregates, then raw events"
   - "This ensures cloud visibility quickly even if full sync takes hours"

---

## Phase 4: Scale & Trade-offs (30-40 min)

### Key Trade-offs to Discuss

| Trade-off | Option A | Option B | My Recommendation |
|-----------|----------|----------|-------------------|
| **Latency vs Cost** | Process at edge (fast, expensive hardware) | Process in cloud (slow, cheap hardware) | Edge for real-time, cloud for analytics |
| **Consistency vs Availability** | Strong consistency (unavailable offline) | Eventual consistency (always available) | Eventual—we must work offline |
| **Freshness vs Bandwidth** | Stream everything (fresh, high bandwidth) | Aggregate first (delayed, low bandwidth) | Aggregate—bandwidth is precious at edge |
| **Durability vs Performance** | Sync every write (durable, slow) | Batch writes (fast, small loss window) | Batch with fsync—good balance |

### Scaling Discussion

> "For horizontal scaling, we partition devices across multiple edge nodes—typically by geographic zone. Each edge node handles its local devices independently. There's no cross-edge coordination needed because each device's data is self-contained."

> "For vertical scaling, we have hardware tiers: Raspberry Pi for small deployments (1K events/sec), industrial PCs for medium (10-50K), and edge servers for large (100K+)."

### Failure Scenarios

**Interviewer:** "What if the edge node loses power?"

> "The buffer is on persistent storage with WAL, so committed events survive. On restart, we load the last checkpoint, restore window states, and resume. Any events received but not checkpointed are replayed from the buffer."

**Interviewer:** "What if the buffer fills up during a long outage?"

> "We have a multi-level response:
> 1. At 70%: Alert, increase sync frequency
> 2. At 85%: Start evicting synced entries
> 3. At 95%: Downsample older events
> 4. At 100%: Drop lowest-priority streams
> We never silently lose data—we alert if we have to drop anything."

---

## Phase 5: Wrap Up (40-45 min)

### Summary Template

> "To summarize: I've designed an edge data processing system that:
>
> 1. **Ingests** events from multiple protocols and normalizes them
> 2. **Buffers** durably using SQLite with WAL for offline resilience
> 3. **Processes** in real-time using tumbling windows for aggregation
> 4. **Syncs** to cloud in priority-ordered batches with retry handling
>
> Key design decisions:
> - Eventual consistency to support offline operation
> - Local-first architecture with cloud as backup
> - Incremental aggregation to bound memory usage
>
> The system handles 10-100K events/sec per node and survives 24+ hour outages."

---

## Common Interview Questions

### Conceptual Questions

| Question | Key Points to Cover |
|----------|---------------------|
| "Why not just stream everything to the cloud?" | Bandwidth cost, latency, offline requirements |
| "How do you handle exactly-once processing?" | Idempotent producers, deduplication, checkpointing |
| "What happens with clock skew between devices?" | NTP/PTP sync, watermarks, allowed lateness |
| "How do you ensure no data loss?" | WAL, checkpoints, sync acknowledgments |
| "How do you handle late-arriving events?" | Allowed lateness window, side outputs, corrections |

### Estimation Questions

| Question | Approach |
|----------|----------|
| "Size the buffer for 24-hour offline" | Events/sec × 86,400 × event_size × compression |
| "Estimate memory for windowing" | Windows × keys × state_size |
| "Calculate sync bandwidth needed" | Data_volume / sync_interval |

### Deep Technical Questions

| Question | Answer Approach |
|----------|-----------------|
| "Explain watermarks" | Track event-time progress; windows close when watermark passes end; allows bounded wait for late events |
| "Explain CRDTs for sync" | Conflict-free merge; G-Counter for counts, LWW-Register for values; enables offline writes |
| "Explain backpressure" | Signal to slow producers; queue depth or CPU threshold; prevents cascade failures |

---

## Trap Questions and Best Answers

### Trap 1: "Why not use a simple queue?"

**What interviewer wants:** Understanding of durability and ordering guarantees

**Bad answer:** "Queues are simple and work fine."

**Good answer:** "A simple in-memory queue would lose data on restart. I need a persistent, ordered log—essentially Kafka's design but embedded. SQLite with WAL gives me durability with good write performance. The key insight is that I need both the queue semantics AND the ability to query by time range for the windowing engine."

### Trap 2: "What if events arrive out of order?"

**What interviewer wants:** Understanding of event-time vs processing-time

**Bad answer:** "We process in order of arrival."

**Good answer:** "This is where event-time processing matters. I use the event's timestamp, not arrival time, for windowing. Watermarks track progress in event-time. I configure an 'allowed lateness' period—say, 30 seconds—during which late events can still update closed windows. After that, they're either dropped or sent to a side output for later reconciliation."

### Trap 3: "How do you scale to millions of devices?"

**What interviewer wants:** Understanding of horizontal scaling

**Bad answer:** "We add more powerful hardware."

**Good answer:** "Vertically scaling a single edge is limited. Instead, I partition devices across multiple edge nodes—typically geographically. A retail chain with 10,000 stores might have one edge node per store. Each processes independently. At the cloud level, we aggregate across all edges. The key is that each device belongs to exactly one edge, so there's no coordination overhead."

### Trap 4: "What if the edge and cloud have conflicting data?"

**What interviewer wants:** Understanding of conflict resolution

**Bad answer:** "The cloud is the source of truth."

**Good answer:** "With eventual consistency, conflicts can occur. I use CRDTs where possible—they merge automatically. For non-CRDT data, I use last-write-wins with logical timestamps. For critical operations like configuration changes, I use cloud as authoritative—edge pulls config, never pushes. The key is being explicit about conflict resolution strategy per data type."

---

## Red Flags to Avoid

| Red Flag | Why It's Bad | Better Approach |
|----------|--------------|-----------------|
| Assuming always-connected network | Edge's whole point is offline resilience | "Network may be down for hours—we design for that" |
| Ignoring time synchronization | Window boundaries become inconsistent | "We need NTP at minimum, PTP for industrial" |
| Unbounded state | Memory exhaustion on edge | "We bound state with incremental aggregation" |
| Single point of failure | No resilience | "Buffer is on disk, checkpoints for recovery" |
| Ignoring security | Edge is physical attack surface | "mTLS for devices, encryption at rest" |
| Over-engineering day 1 | Unnecessary complexity | "Start with SQLite, upgrade to RocksDB if needed" |

---

## Quick Reference Card

### Must-Know Concepts

| Concept | One-Line Definition |
|---------|---------------------|
| **Store-and-Forward** | Buffer locally, forward when connected |
| **Watermark** | Event-time progress indicator for windowing |
| **Tumbling Window** | Fixed-size, non-overlapping time window |
| **Eventual Consistency** | All nodes converge to same state eventually |
| **Backpressure** | Signal to slow down when overwhelmed |
| **Checkpoint** | Snapshot of processing state for recovery |
| **CRDT** | Data structure that merges without conflicts |
| **Idempotency** | Same operation can be applied multiple times safely |

### Key Numbers to Remember

| Metric | Typical Value |
|--------|---------------|
| Event rate per edge | 1K-100K/sec |
| Buffer retention | 24-72 hours |
| Sync batch size | 1000 events or 30 seconds |
| Allowed lateness | 30-60 seconds |
| Checkpoint interval | 30 seconds |
| Network outage tolerance | 24+ hours |

### Architecture Buzzwords

- "Local-first architecture"
- "Event-driven processing"
- "Eventual consistency with causal ordering"
- "Store-and-forward pattern"
- "Watermark-based windowing"
- "Incremental aggregation"

---

## Additional Resources

### Related Designs in This Repository

- [1.5 - Distributed Log-Based Broker](../1.5-distributed-log-based-broker/00-index.md) - Kafka internals
- [2.8 - Edge Computing Platform](../2.8-edge-computing-platform/00-index.md) - Edge runtime concepts
- [2.12 - Edge-Native Application Platform](../2.12-edge-native-application-platform/00-index.md) - Edge database patterns

### Real-World References

- Chick-fil-A edge architecture (Kubernetes at restaurant scale)
- Confluent's Kafka at the edge
- AWS IoT Greengrass architecture
- Apache Flink windowing documentation

---

[Back to Index](./00-index.md) | [Previous: Observability](./07-observability.md)
