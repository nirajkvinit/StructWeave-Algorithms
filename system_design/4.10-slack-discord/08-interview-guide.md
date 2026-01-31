# Interview Guide

## 45-Minute Interview Pacing

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify | Scope the problem | Ask about scale, features, constraints |
| **5-15 min** | High-Level | Core architecture | Draw WebSocket layer, channel routing |
| **15-30 min** | Deep Dive | 1-2 critical components | Pick fanout, presence, or threading |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, decisions | Discuss Slack vs Discord approaches |
| **40-45 min** | Wrap Up | Summary, extensions | Voice, search, compliance |

---

## Opening Questions to Ask

Before diving into design, clarify requirements:

| Question | Why It Matters |
|----------|----------------|
| "What's the expected scale - DAU, concurrent users?" | Determines architecture complexity |
| "Is this enterprise-focused or consumer/gaming?" | Slack vs Discord patterns |
| "Do we need voice channels?" | Significantly changes architecture |
| "What's the consistency requirement for messages?" | Eventual vs strong consistency |
| "Are there compliance requirements (HIPAA, GDPR)?" | Affects data handling |
| "Threading - first-class like Slack or simple replies?" | Impacts data model |

---

## Recommended Approach

### Step 1: Start with the Core (5 min)

Draw the basic architecture:

```
Client → Load Balancer → Gateway Servers → Channel/Guild Servers → Database
```

**Explain:**
- "I'll start with a channel-based messaging system where users connect via WebSockets"
- "Gateway Servers manage connections, Channel Servers handle message routing"

### Step 2: Expand Key Components (10 min)

**For Messaging:**
- "Messages sent via HTTP POST for reliability, delivered via WebSocket push"
- "Channel Server maintains subscriber list, fans out to Gateway Servers"

**For Presence:**
- "Separate Presence Servers track online/idle/DnD status"
- "Users hashed to specific Presence Servers for consistency"

### Step 3: Deep Dive (15 min)

Pick one area based on interviewer interest:

**Option A: Message Fanout**
- Consistent hashing for channel routing
- Large channel handling (relay system)
- Online vs offline delivery

**Option B: Presence System**
- Status aggregation across devices
- Typing indicators
- Subscription optimization

**Option C: Threading (Slack)**
- Parent-child relationships
- Notification routing
- "Also send to channel" complexity

### Step 4: Scale & Trade-offs (10 min)

Discuss specific decisions:
- "Why HTTP POST for sending vs WebSocket?"
- "How do we handle hot channels?"
- "Database choice: SQL (Vitess) vs NoSQL (ScyllaDB)"

---

## Trap Questions & Answers

### Trap 1: "Why not use WebSocket for sending messages?"

**What They're Testing:** Understanding of reliability vs convenience

**Bad Answer:** "WebSocket is faster, we should use it for everything"

**Good Answer:**
> "Slack actually moved away from WebSocket for message sending. HTTP POST provides:
> 1. **Crash safety** - If the server crashes mid-send, the client knows it failed
> 2. **Clear semantics** - 200 means persisted, 4xx/5xx means failed
> 3. **Mobile-friendly** - Works with background fetch, no persistent connection needed
> 4. **Decoupling** - Persistence can happen independently of real-time fanout
>
> WebSocket is still used for receiving messages where eventual delivery is fine."

---

### Trap 2: "How does Discord handle 15 million users in one server?"

**What They're Testing:** Understanding of extreme scale, not just generic scaling

**Bad Answer:** "Just add more servers"

**Good Answer:**
> "Discord uses a hierarchical fanout with their Relay system:
> 1. **Guild Process** - One Elixir GenServer per guild, but bottlenecks at scale
> 2. **Relay System** - Partitions users into groups of 15,000 per relay
> 3. **Fan-out hierarchy** - Guild → Relays → Sessions
>
> For a 15M user guild: 1,000 relays, each handling 15K users.
>
> Additionally, they use:
> - **Rust Data Services** for request coalescing
> - **Lazy loading** - Not all 15M are online simultaneously
> - **Rate limiting** - Message limits prevent overwhelming the system"

---

### Trap 3: "Why did Discord migrate from Cassandra to ScyllaDB?"

**What They're Testing:** Database trade-offs, real-world experience

**Bad Answer:** "ScyllaDB is just better"

**Good Answer:**
> "The core issue was **hot partitions and GC pauses**:
>
> 1. **Hot Partition Problem** - Popular channels/guilds created uneven load
> 2. **GC Pauses** - Cassandra's JVM garbage collector caused unpredictable latency
> 3. **Operational Overhead** - 177 nodes required constant firefighting
>
> **ScyllaDB Benefits:**
> - Written in C++, no GC pauses
> - Shard-per-core architecture for isolation
> - Same CQL interface (easy migration)
>
> **Results:**
> - 177 → 72 nodes
> - p99 read: 40-125ms → 15ms
> - p99 write: 5-70ms → 5ms
>
> They also added a **Rust Data Services layer** for request coalescing, which further reduced hot partition impact."

---

### Trap 4: "How do you handle presence for millions of users?"

**What They're Testing:** Efficiency, not just correctness

**Bad Answer:** "Push every status change to everyone"

**Good Answer:**
> "Presence at scale requires several optimizations:
>
> 1. **Selective Subscription** - Only subscribe to visible users (limit ~500)
> 2. **Lazy Loading** - Fetch presence on-demand when user becomes visible
> 3. **Debouncing** - Don't propagate rapid status changes (wait 3 seconds)
> 4. **Batching** - Aggregate updates over 1-second windows
> 5. **TTL-Based** - Status expires if no heartbeat (handles ghost 'online')
>
> **Architecture:**
> - Presence Servers are in-memory, users hashed for consistency
> - Gateway Servers proxy presence queries
> - Redis as backup/cache for cross-region
>
> **Status Resolution:**
> - If any device is ACTIVE → ONLINE
> - If all devices IDLE for 5 min → IDLE
> - Manual overrides (DND, Invisible) take precedence"

---

### Trap 5: "Isn't eventual consistency a problem for messages?"

**What They're Testing:** CAP theorem understanding, practical trade-offs

**Bad Answer:** "Yes, we need strong consistency"

**Good Answer:**
> "For team messaging, eventual consistency is actually the right choice:
>
> 1. **What matters:** Users see messages in the same order
> 2. **What doesn't:** Microsecond-level synchronization
>
> **How we achieve ordering:**
> - Messages get server-assigned timestamps (Snowflake IDs)
> - Clients sort by ID, not local clock
> - Within a channel, messages are totally ordered
>
> **Where we use stronger consistency:**
> - Permission changes (immediate effect)
> - Channel membership (prevent race conditions)
> - Delete operations (prevent reading deleted messages)
>
> **Trade-off:** We choose availability (users can always send) over perfect consistency (brief message order differences across clients)."

---

### Trap 6: "How would you add E2E encryption like WhatsApp?"

**What They're Testing:** Understanding business constraints, not just technical

**Bad Answer:** "Implement Signal Protocol, encrypt everything"

**Good Answer:**
> "Adding E2E encryption would fundamentally change the product:
>
> **Why Slack/Discord don't use E2EE:**
> 1. **Search** - Can't search encrypted messages server-side
> 2. **Compliance** - Enterprise customers need eDiscovery, audit logs
> 3. **Moderation** - Discord needs to detect ToS violations
> 4. **Sync** - New devices can't access history (would need key backup)
> 5. **Bots** - Can't process encrypted messages
>
> **If required (and we accept the trade-offs):**
> - Group key management (Sender Keys like WhatsApp)
> - Key rotation on membership changes
> - Client-side search index
> - Device-linked keys with backup option
>
> **Alternative for enterprises:**
> - Slack offers Enterprise Key Management (EKM)
> - Customer holds the encryption keys
> - Revocation possible, but not true E2EE"

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| **Starting with database design** | Misses the unique real-time challenges | Start with WebSocket architecture |
| **Ignoring fanout complexity** | Core of the system | Discuss large channel handling early |
| **Generic "add more servers"** | Doesn't show understanding | Be specific: hash rings, relay systems |
| **Treating all messages equally** | Missing optimization opportunity | Separate online vs offline handling |
| **Forgetting presence** | Major user-facing feature | Design presence early |
| **Overcomplicating threading** | Slack learned this lesson | Single-level threads are simpler |
| **Ignoring mobile** | Major user base | Design for intermittent connections |

---

## Trade-offs Discussion

### Decision: Stateful vs Stateless Gateway

| Aspect | Stateful (Slack/Discord) | Stateless |
|--------|--------------------------|-----------|
| **Pros** | Low latency, efficient fanout, connection affinity | Easy scaling, simple failover |
| **Cons** | Complex failover, memory pressure | Higher latency, external state store |
| **Recommendation** | Stateful with session persistence in Redis for recovery |

### Decision: Database Choice

| Aspect | SQL (Vitess/MySQL) | NoSQL (ScyllaDB) |
|--------|-------------------|------------------|
| **Pros** | Familiar queries, ACID, schema | Scale, no GC, fast writes |
| **Cons** | Resharding complexity | Less flexible queries |
| **Use Case** | Enterprise, complex queries | High-volume, simple access patterns |
| **Recommendation** | Choose based on query patterns; both work |

### Decision: Thread Model

| Aspect | First-Class Threads (Slack) | Simple Replies (Discord) |
|--------|----------------------------|--------------------------|
| **Pros** | Organized discussions, focused notifications | Simple, low complexity |
| **Cons** | Complex UX, dual visibility | Less organized for long discussions |
| **Recommendation** | Slack-style for enterprise, Discord-style for casual |

### Decision: Voice Architecture

| Aspect | P2P | SFU (Discord) | MCU |
|--------|-----|---------------|-----|
| **Pros** | No server, low cost | Balance of quality/scale | Simple client |
| **Cons** | Doesn't scale | Server cost | High server cost |
| **Recommendation** | SFU for production systems |

---

## Extension Topics

If you finish early, discuss:

1. **Search Implementation**
   - Elasticsearch sharding by workspace
   - Index lag vs freshness trade-off
   - Hot index (90 days) + archive

2. **Voice Channels (Discord)**
   - WebRTC + SFU architecture
   - Opus codec, adaptive quality
   - Region-based routing

3. **Enterprise Compliance (Slack)**
   - EKM (customer-controlled keys)
   - DLP integration
   - eDiscovery and legal holds

4. **Bots and Integrations**
   - OAuth scopes
   - Event subscriptions
   - Rate limiting

5. **Mobile Optimization**
   - Push notifications for offline
   - Background fetch limits
   - Battery-efficient presence

---

## Quick Reference: Key Numbers

| Metric | Slack | Discord |
|--------|-------|---------|
| Concurrent WebSockets | 5M+ | 12M+ |
| Messages/day | Billions | Billions |
| WebSocket events/sec | Millions | 26M+ |
| Max channel/guild | Unlimited | 15M+ |
| Message delivery target | <500ms | <100ms |
| Database | Vitess (MySQL) | ScyllaDB |
| Backend | Java | Elixir + Rust |

---

## Sample 45-Minute Flow

**Minutes 0-3:** "Let me clarify - are we designing for enterprise like Slack or consumer/gaming like Discord? What's the expected scale?"

**Minutes 3-7:** "I'll start with the core architecture. Users connect via WebSocket to Gateway Servers. Messages route through Channel Servers using consistent hashing..."

**Minutes 7-15:** "For message delivery: HTTP POST for sending (crash safety), WebSocket for receiving. Channel Server maintains subscriber list, fans out to Gateway Servers..."

**Minutes 15-25:** "Let me deep dive into message fanout. For large channels, this is the bottleneck..." *[Draw relay system, discuss Discord's approach]*

**Minutes 25-35:** "For scale, Discord moved from Cassandra to ScyllaDB because..." *[Discuss trade-offs, hot partitions, request coalescing]*

**Minutes 35-40:** "Key trade-offs: Stateful gateways give us low latency but complex failover. We handle this with session persistence in Redis..."

**Minutes 40-45:** "To extend this: voice would use SFU architecture, search would use Elasticsearch sharded by workspace. Questions?"
