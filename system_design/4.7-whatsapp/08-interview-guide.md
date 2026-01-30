# WhatsApp: Interview Guide

## Table of Contents
- [Interview Pacing](#interview-pacing)
- [Phase-by-Phase Guide](#phase-by-phase-guide)
- [Trap Questions & Answers](#trap-questions--answers)
- [Common Mistakes to Avoid](#common-mistakes-to-avoid)
- [Trade-offs Discussion](#trade-offs-discussion)
- [Capacity Estimation Cheat Sheet](#capacity-estimation-cheat-sheet)
- [Quick Reference Card](#quick-reference-card)

---

## Interview Pacing

### 45-Minute Format

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify | Requirements, scope, constraints | Ask about E2EE requirement, scale |
| **5-15 min** | High-Level | Architecture, components, data flow | Draw connection → gateway → router flow |
| **15-30 min** | Deep Dive | Pick 1-2: E2EE, delivery pipeline, media | Signal Protocol is unique differentiator |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failures, decisions | Discuss Erlang choice, E2EE trade-offs |
| **40-45 min** | Wrap Up | Summary, improvements, questions | Mention MLS for future group E2EE |

### 60-Minute Format

| Time | Phase | Focus |
|------|-------|-------|
| **0-8 min** | Clarify | Deep requirements gathering |
| **8-20 min** | High-Level | Complete architecture with diagrams |
| **20-40 min** | Deep Dive | E2EE + delivery pipeline (both) |
| **40-52 min** | Scale & Trade-offs | Multi-region, disaster recovery |
| **52-60 min** | Wrap Up | Future improvements, questions |

---

## Phase-by-Phase Guide

### Phase 1: Clarification (0-5 min)

**Questions to Ask:**

| Question | Why Ask | Expected Answer |
|----------|---------|-----------------|
| "Is end-to-end encryption a hard requirement?" | Core differentiator | Yes, always |
| "What scale are we targeting? Millions or billions?" | Capacity planning | 2B users |
| "Are voice/video calls in scope?" | Scope definition | Probably yes |
| "Group messaging requirements?" | Complexity | Up to 1000 members |
| "Multi-device support needed?" | Architecture complexity | Yes, 4 devices |
| "Is this for a regulated industry?" | Compliance needs | Consumer app |

**Sample Opening:**

> "Let me make sure I understand the requirements. We're designing a messaging system like WhatsApp with end-to-end encryption, supporting billions of users, with features like 1:1 and group messaging, media sharing, and voice/video calls. Is that correct? Are there any specific aspects you'd like me to focus on?"

### Phase 2: High-Level Design (5-15 min)

**Key Points to Cover:**

1. **Draw the Architecture:**
   - Client → Load Balancer → Connection Gateway (ejabberd)
   - Gateway → Message Router
   - Router → Presence Service (check if online)
   - Router → Offline Queue (Mnesia) if offline
   - Router → Notification Service (push)

2. **Explain Data Flow:**
   > "When Alice sends a message, her app encrypts it with Bob's session key using the Signal Protocol. The encrypted message goes to our gateway, which routes it to Bob if online, or queues it in Mnesia if offline."

3. **Mention Key Decisions:**
   - Erlang for connections (2KB per process)
   - Store-and-forward (not long-term storage)
   - Signal Protocol for E2EE

### Phase 3: Deep Dive (15-30 min)

**Choose 1-2 Topics (interviewer may specify):**

#### Option A: End-to-End Encryption

> "WhatsApp uses the Signal Protocol, which has two main components:
>
> 1. **X3DH (Extended Triple Diffie-Hellman)** for initial key agreement. When Alice wants to message Bob for the first time, she fetches Bob's prekey bundle from the server and performs 4 DH operations to derive a shared secret. This works even if Bob is offline because we use prekeys.
>
> 2. **Double Ratchet** for ongoing messages. Each message gets a unique key through two ratcheting mechanisms: a DH ratchet for forward secrecy and a symmetric ratchet for per-message keys."

**Draw the Double Ratchet chain** if asked.

#### Option B: Message Delivery Pipeline

> "Our delivery pipeline has two paths:
>
> 1. **Online Delivery**: Gateway checks presence, finds Bob online, delivers immediately. Bob's app sends delivery ACK, we update status to 'delivered' (double tick).
>
> 2. **Offline Delivery**: If Bob is offline, we queue the message in Mnesia and send a push notification. When Bob reconnects, we replay all queued messages and delete them from the queue."

**Explain the tick system**: single tick (server received), double tick (delivered), blue tick (read).

#### Option C: Media Handling

> "For media, we use client-side encryption with a separate random key per file. The flow is:
> 1. Client generates 256-bit media key
> 2. Encrypts media with AES-256-CBC
> 3. Uploads encrypted blob via HTTP
> 4. Sends message with blob URL and media key (encrypted in the message itself)
>
> The server never sees the media content, only encrypted bytes."

### Phase 4: Scale & Trade-offs (30-40 min)

**Key Topics:**

1. **Why Erlang?**
   > "Erlang gives us 2KB per connection instead of megabytes for threads. A single server handles 2 million connections. The 'let it crash' philosophy with supervisors provides fault tolerance. Hot code swapping allows zero-downtime deployments."

2. **Multi-Region Strategy**
   > "Users are assigned to home regions based on phone number prefix or registration location. Cross-region messages route through a global message router. Offline queues are regional - no cross-region replication of E2EE messages."

3. **Failure Scenarios**
   > "If a gateway node crashes, clients auto-reconnect to another node. If a region fails, DNS failover redirects to secondary. Messages in the offline queue are E2EE, so we can only deliver ciphertext - we can't recover content even if we wanted to."

### Phase 5: Wrap Up (40-45 min)

**Summary:**
> "To summarize, we designed a messaging system with always-on E2EE using the Signal Protocol, Erlang for efficient connection handling, store-and-forward architecture for reliability, and multi-region deployment for low latency."

**Future Improvements:**
- MLS protocol for more efficient group encryption
- On-device ML for spam detection (privacy-preserving)
- Better offline sync for multi-device

---

## Trap Questions & Answers

### Encryption & Security

| Trap Question | What They Want | Good Answer |
|---------------|----------------|-------------|
| "Why not just use HTTPS for encryption?" | Understand E2EE vs transport | "HTTPS encrypts in transit but the server can read plaintext. E2EE means the server only sees ciphertext. Even if our servers are compromised, messages remain private." |
| "How do you search messages if they're encrypted?" | E2EE limitations | "We can't server-side search E2EE messages. Search happens on-device only. This is a trade-off for privacy. Some services offer 'searchable encryption' but it weakens the security model." |
| "What if law enforcement requests message content?" | Legal/ethical | "We can only provide metadata (who messaged whom, when). We cannot provide message content because we don't have the keys. This has been tested in court cases." |
| "Doesn't E2EE enable bad actors?" | Nuance | "E2EE protects everyone's privacy. We use metadata analysis, user reports, and account-level signals for abuse detection. We can ban accounts but can't read messages." |

### Architecture

| Trap Question | What They Want | Good Answer |
|---------------|----------------|-------------|
| "Why Erlang? Why not Go or Java?" | Understand tech choices | "Erlang processes are 2KB vs megabytes for threads. BEAM was designed for telecom - exactly our use case. Hot code swapping means zero-downtime deploys. The trade-off is a smaller talent pool." |
| "Why store-and-forward? Why not keep messages on server?" | Privacy-first thinking | "Store-and-forward minimizes data retention. Messages are deleted after delivery. This reduces storage costs and limits breach impact. Users can backup to their own cloud if they want history." |
| "How does multi-device work with E2EE?" | Technical depth | "Each device has its own identity key and sessions. When Alice sends to Bob, she actually sends to all of Bob's devices separately. Each uses its own Double Ratchet session." |

### Scale & Reliability

| Trap Question | What They Want | Good Answer |
|---------------|----------------|-------------|
| "What happens if someone loses their phone?" | Edge cases | "Pending messages in the offline queue are encrypted and will fail to deliver. If they have a backup (with their password), they can restore on a new device. Messages in flight are lost - this is a privacy feature." |
| "How do group messages work at scale?" | Group complexity | "We use Sender Keys: each member has the sender's chain key. One encryption serves all members. The problem is member removal - everyone must rotate keys. That's why groups are limited to 1024 members." |
| "What if your servers are fully compromised?" | Threat model | "Attackers get metadata only. They can't read messages or forge them. They could attempt MITM on new sessions, but safety numbers would detect this. Past messages remain protected." |

### Operations

| Trap Question | What They Want | Good Answer |
|---------------|----------------|-------------|
| "How do you deploy without downtime?" | Ops understanding | "Erlang supports hot code swapping. We load new code while old code runs. Processes transition on their next external call. No connections dropped." |
| "What if the offline queue grows too large?" | Capacity planning | "We set TTLs (30 days max). We use Mnesia with disk spillover. We alert on queue growth. Ultimately, if a user is offline for months, old messages expire." |

---

## Common Mistakes to Avoid

### Architecture Mistakes

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Ignoring E2EE | Core differentiator | Lead with Signal Protocol |
| Server-side message storage | Violates E2EE philosophy | Store-and-forward only |
| Single point of failure | Reliability concern | Discuss supervisor trees, failover |
| Polling instead of push | Inefficient | Persistent connections + push |

### Estimation Mistakes

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Underestimating connections | Core challenge | 500M concurrent, 2KB each |
| Ignoring offline users | Significant traffic | 10% offline = 120M queued |
| Missing E2EE overhead | Adds latency | X3DH takes ~500ms first message |

### Interview Mistakes

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Jumping to solution | Misses requirements | Ask clarifying questions first |
| Over-engineering | Interview time limit | Focus on core requirements |
| No trade-off discussion | Seems shallow | Always discuss alternatives |
| Ignoring failure modes | Incomplete design | Discuss what breaks and how |

---

## Trade-offs Discussion

### Key Trade-offs Table

| Decision | Option A | Option B | WhatsApp's Choice | Rationale |
|----------|----------|----------|-------------------|-----------|
| **Server-side search** | Yes (convenient) | No (private) | **No** | E2EE prevents it; privacy first |
| **Message retention** | Long-term | Store-and-forward | **Store-and-forward** | Minimize data retention |
| **Backend language** | Go/Java (talent pool) | Erlang (efficiency) | **Erlang** | 2KB processes, fault tolerance |
| **Group encryption** | Individual encryption | Sender keys | **Sender keys** | Efficient for groups |
| **Presence data** | High precision | Privacy-preserving | **Privacy-preserving** | User controls visibility |
| **Backup encryption** | Server-controlled | User password | **User password** | We can't access backups |

### Trade-off Discussion Template

> "For [DECISION], we have two main options:
>
> **Option A: [OPTION]**
> - Pros: [benefits]
> - Cons: [drawbacks]
>
> **Option B: [OPTION]**
> - Pros: [benefits]
> - Cons: [drawbacks]
>
> I would choose [OPTION] because [REASON], accepting the trade-off of [DOWNSIDE]."

---

## Capacity Estimation Cheat Sheet

### Quick Reference Numbers

```
┌─────────────────────────────────────────────────────────────┐
│  WHATSAPP SCALE NUMBERS                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  USERS                                                      │
│  MAU: 2B    DAU: 1.2B (60%)    Concurrent: 500M (peak)     │
│                                                             │
│  MESSAGES                                                   │
│  Daily: 140B    Per user/day: ~117    Per second: 1.6M     │
│  Peak: 5M/sec (3x average)                                  │
│                                                             │
│  CONNECTIONS                                                │
│  Memory per connection: 2KB                                 │
│  Total memory: 1TB (500M × 2KB)                            │
│  Connections per server: 2M                                 │
│  Servers needed: 250-500                                    │
│                                                             │
│  STORAGE                                                    │
│  Message metadata: 28TB/day                                 │
│  Offline queue: ~200TB (7-day TTL)                         │
│  Media: 5-10 PB/day                                        │
│                                                             │
│  LATENCY                                                    │
│  Message (online): <200ms p99                              │
│  Message (offline): <30s after reconnect                   │
│  E2EE setup (X3DH): <1s                                    │
│  Media upload: <5s p95                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Back-of-Envelope Calculations

**Messages per second:**
```
140B messages/day ÷ 86,400 sec/day = 1.62M messages/sec
Peak (3x): ~5M messages/sec
```

**Storage for offline queue:**
```
Offline users: 10% of DAU = 120M users
Messages per offline user: 50 (1-day average)
Message size: 500 bytes
Queue size: 120M × 50 × 500B = 3TB
```

**Connection servers needed:**
```
Peak concurrent: 500M connections
Per server capacity: 2M connections
Servers: 500M ÷ 2M = 250 servers
With 2x buffer: 500 servers
```

---

## Quick Reference Card

### WhatsApp's Unique Challenges

| Challenge | Why It's Hard | Solution |
|-----------|---------------|----------|
| E2EE at 2B scale | Key management, prekeys | Signal Protocol + prekey pools |
| 140B messages/day | Throughput | Erlang processes, horizontal scale |
| Offline delivery | Guaranteed delivery | Mnesia queue, push notifications |
| Group E2EE | N×N encryption | Sender keys protocol |
| Multi-device sync | Session per device | Separate identity keys |
| Server blindness | Can't debug content | Metadata-only observability |

### Key Differentiators from Other Messaging

| Aspect | WhatsApp | Telegram | Slack |
|--------|----------|----------|-------|
| E2EE | Always on | Optional | None (enterprise) |
| Architecture | Store-and-forward | Server storage | Server storage |
| Backend | Erlang | C++ | Various |
| Search | On-device only | Server-side | Server-side |
| Groups | 1024 members | 200K members | Unlimited |

### Questions to Ask Interviewer

1. "Is E2EE a hard requirement, or is transport encryption sufficient?"
2. "What's the expected scale - are we designing for millions or billions?"
3. "Should I focus on any particular aspect - messaging, calls, or groups?"
4. "Are there regulatory requirements like GDPR data residency?"
5. "Is this a greenfield design or integrating with existing systems?"

### Closing Statement Template

> "To summarize, we designed a messaging system with:
>
> - **Signal Protocol** for end-to-end encryption with forward and backward secrecy
> - **Erlang/BEAM** for efficient connection handling at scale
> - **Store-and-forward architecture** for reliable delivery with privacy
> - **Multi-region deployment** for low latency globally
>
> Key trade-offs include accepting limited server-side features (no search, no content moderation) in exchange for true privacy. Future improvements could include MLS for more efficient group encryption and on-device ML for privacy-preserving spam detection."
