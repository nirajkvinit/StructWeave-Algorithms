# Interview Guide

## Table of Contents
- [Interview Pacing](#interview-pacing)
- [Clarifying Questions](#clarifying-questions)
- [Key Discussion Points](#key-discussion-points)
- [Deep Dive Areas](#deep-dive-areas)
- [Trap Questions](#trap-questions)
- [Common Mistakes](#common-mistakes)
- [Quick Reference](#quick-reference)

---

## Interview Pacing

### 45-Minute Structure

| Time | Phase | Activities |
|------|-------|------------|
| 0-5 min | **Clarify** | Ask questions, understand requirements |
| 5-15 min | **High-Level Design** | Draw architecture, explain data flow |
| 15-30 min | **Deep Dive** | Event loop, connection pooling, or TLS |
| 30-40 min | **Scalability & Trade-offs** | Scaling strategies, reliability |
| 40-45 min | **Wrap Up** | Address remaining concerns, questions |

### What to Cover

```
Minimum (must cover):
✓ Event-driven architecture explanation
✓ Master/worker process model
✓ Connection state management
✓ Upstream selection and health checking
✓ Basic scaling approach

Good (should cover):
✓ TLS termination overhead
✓ Connection pooling strategies
✓ Graceful reload mechanism
✓ Key metrics and monitoring

Excellent (if time permits):
✓ HTTP/2 multiplexing
✓ SO_REUSEPORT for scaling
✓ Buffer management details
✓ Specific attack mitigations
```

---

## Clarifying Questions

### Questions to Ask

**Scale Questions:**
- "What's the expected concurrent connection count?"
- "What's the target requests per second?"
- "What's the request/response size distribution?"

**Protocol Questions:**
- "Do we need to support HTTP/2 or HTTP/3?"
- "Is WebSocket support required?"
- "Will there be gRPC traffic?"

**TLS Questions:**
- "Is TLS termination required at the proxy?"
- "Do we need to support multiple certificates (SNI)?"
- "What's the TLS version requirement?"

**Upstream Questions:**
- "How many upstream servers are there?"
- "Are upstreams static or dynamically discovered?"
- "What's the network topology (same DC, cross-region)?"

**Reliability Questions:**
- "What's the availability SLA?"
- "Is zero-downtime deployment required?"
- "What's the failure domain (single node failure acceptable)?"

### Sample Interview Dialogue

```
Interviewer: "Design a high-performance reverse proxy"

You: "Before I start, I'd like to clarify a few things..."

"First, what scale are we targeting? I'm thinking in terms of
concurrent connections and requests per second."

Interviewer: "Let's say 100K concurrent connections and 50K RPS"

You: "Got it. And do we need TLS termination at the proxy,
or is that handled elsewhere?"

Interviewer: "Yes, TLS termination is needed"

You: "Okay, that's an important CPU consideration. One more -
is zero-downtime configuration reload a requirement?"

Interviewer: "Yes, we can't drop connections during config changes"
```

---

## Key Discussion Points

### 1. Why Event-Driven Architecture

```
"The key insight is that most connections are idle at any moment.
With thread-per-connection, 100K connections need 100K threads,
each with ~1MB stack = 100GB just for stacks!

With event-driven, one thread can handle all 100K connections:
- Each connection is ~10KB of state
- Total: 1GB instead of 100GB
- No context switching overhead between threads

The trade-off is programming complexity - we need state machines
instead of simple sequential code."
```

### 2. Master/Worker Process Model

```
"I'd use a master/worker architecture:

Master process:
- Binds to privileged ports (80, 443)
- Manages worker lifecycle
- Handles configuration reload signals

Worker processes (one per CPU core):
- Each runs an independent event loop
- Handles client connections and upstream communication
- No shared state between workers (isolation)

For distributing connections, we have options:
- Master accepts and passes FDs (traditional)
- SO_REUSEPORT (kernel distributes directly) - preferred"
```

### 3. Connection Pooling Strategy

```
"Connection pooling is critical for performance:

Without pooling:
- New TCP connection: ~1ms
- TLS handshake: ~50ms
- Per-request: 50ms overhead!

With pooling:
- Reuse existing connection: ~0ms
- Most requests have zero connection overhead

I'd implement per-worker pools to each upstream:
- Avoids cross-worker locking
- Each worker maintains N connections per upstream
- Pool size = expected_concurrent_requests / worker_count / upstream_count

For health checking, I'd use both:
- Active checks: Periodic health endpoint probes
- Passive checks: Track real request success/failure"
```

### 4. Graceful Configuration Reload

```
"Zero-downtime reload is achieved with graceful restart:

1. Admin sends SIGHUP to master
2. Master validates new configuration
3. Master forks new workers with new config
4. New workers start accepting connections
5. Master signals old workers to stop accepting
6. Old workers finish existing requests
7. Old workers exit when idle

Key: Connection draining - old workers complete in-flight
requests before exiting. Set a timeout (e.g., 30s) to avoid
indefinite waiting on slow clients."
```

---

## Deep Dive Areas

### Deep Dive 1: Event Loop Implementation

```
Interviewer: "Explain how the event loop works"

"The event loop uses epoll (Linux) or kqueue (BSD):

1. Register interest in file descriptor events
2. Call epoll_wait() - blocks until events ready
3. Process all returned events
4. Repeat

For each event:
- EPOLLIN on listen socket → accept new connection
- EPOLLIN on client socket → read data
- EPOLLOUT on client socket → write data ready
- EPOLLERR/EPOLLHUP → close connection

Non-blocking I/O is key:
- All sockets set to O_NONBLOCK
- Read/write returns immediately with data or EAGAIN
- EAGAIN means 'no data now, try later'

I'd use edge-triggered mode for efficiency:
- Events fire only on state change
- Must drain all data when notified
- Fewer syscalls than level-triggered"
```

### Deep Dive 2: TLS Performance

```
Interviewer: "How do you handle TLS at scale?"

"TLS is the most CPU-intensive operation:

Handshake types:
- Full handshake: ~2ms CPU (RSA) or ~0.5ms (ECDSA)
- Resumed (session tickets): ~0.1ms

Optimizations:
1. Session tickets - stateless resumption
   - Server encrypts session state
   - Client stores and presents on reconnection
   - No server-side session cache needed

2. ECDSA over RSA certificates
   - 4-10x faster signing
   - Smaller key sizes

3. TLS 1.3
   - 1-RTT handshake (vs 2-RTT for TLS 1.2)
   - 0-RTT resumption for repeat visitors

4. Hardware acceleration
   - AES-NI instructions for bulk encryption
   - Some systems have crypto offload

At 100K connections with 10% new connections/minute:
- 10K TLS handshakes/minute = 167/second
- At 0.5ms each = ~10% of one CPU core"
```

### Deep Dive 3: HTTP/2 Multiplexing

```
Interviewer: "How does HTTP/2 change the design?"

"HTTP/2 fundamentally changes connection dynamics:

HTTP/1.1:
- One request in flight per connection
- Need 6+ connections for parallelism
- Head-of-line blocking

HTTP/2:
- Multiple streams per connection
- One connection can handle 100+ concurrent requests
- No HTTP-level head-of-line blocking

Design implications:
- Fewer connections (10-100x fewer)
- More state per connection (stream tables)
- Flow control per stream
- Priority handling

Memory impact:
- HTTP/1.1: 10KB per connection, 100K connections = 1GB
- HTTP/2: 100KB per connection, 10K connections = 1GB

Similar total, but HTTP/2 connections are 'heavier'.
Need to handle stream state, HPACK compression tables,
flow control windows."
```

---

## Trap Questions

### Trap 1: "Why not use threads per connection?"

```
Bad answer: "Threads are slower"

Good answer:
"At high connection counts, threading doesn't scale:

Memory: 100K threads × 1MB stack = 100GB
Context switching: O(N) overhead with N threads
Cache: Each thread has different working set

But threading isn't universally bad:
- Easier to program (blocking I/O)
- Good for low connection counts
- Modern HAProxy uses multi-threading effectively

The choice depends on scale:
- <1K connections: Threading is fine
- >10K connections: Event-driven wins"
```

### Trap 2: "How do you handle slow clients?"

```
Bad answer: "Just use timeouts"

Good answer:
"Slow clients are a common attack vector (Slowloris):

Detection:
- Track time since request started
- Track data rate (bytes/second)
- Minimum throughput threshold (e.g., 100 B/s)

Mitigation:
- Request header timeout (30s)
- Request body timeout (120s)
- Minimum body throughput
- Connection limit per IP

Also, buffering mode matters:
- Buffering ON: Proxy absorbs slow client, protects upstream
- Buffering OFF: Upstream exposed to slow client

I'd default to buffering for small requests (<1MB)
and streaming for large uploads."
```

### Trap 3: "What happens during config reload?"

```
Bad answer: "We restart the proxy"

Good answer:
"Graceful reload maintains existing connections:

1. Master receives SIGHUP
2. Master loads and validates new config
3. If invalid: Log error, keep old config
4. If valid: Fork new workers with new config
5. New workers start accepting
6. Signal old workers: SIGQUIT (graceful stop)
7. Old workers stop accepting new connections
8. Old workers finish in-flight requests
9. Old workers exit when idle (or after timeout)

During transition:
- Both old and new workers run simultaneously
- Old workers serve existing connections
- New workers get all new connections
- Brief spike in resource usage

Zero connections dropped!"
```

### Trap 4: "How do you handle upstream failures?"

```
Bad answer: "Return 502 to client"

Good answer:
"Multiple strategies, layered:

1. Health checking (proactive)
   - Active: Periodic /health probes
   - Passive: Track real request results
   - Remove unhealthy servers from rotation

2. Retries (reactive)
   - Retry on connection failure
   - Retry on 502/503/504 (configurable)
   - Retry on different server (next upstream)
   - Limit retry count (prevent amplification)

3. Circuit breaker
   - Track failure rate per upstream
   - Open circuit after threshold (e.g., 5 failures)
   - Fast-fail during open state
   - Half-open: Periodically test recovery

4. Fallback
   - Serve stale cache if available
   - Return graceful degradation response
   - Redirect to status page"
```

---

## Common Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---------|----------------|------------------|
| Ignoring TLS overhead | TLS handshakes dominate CPU | Discuss session resumption, ECDSA |
| Thread-per-connection at scale | Memory and context switch overhead | Event-driven architecture |
| Forgetting graceful restart | Config changes drop connections | Describe worker replacement |
| No connection pooling | TCP/TLS overhead per request | Pool and reuse connections |
| Single server design | Single point of failure | Multiple nodes, anycast |
| Ignoring health checks | Route to dead servers | Active + passive checking |
| No timeout handling | Slow clients exhaust resources | Multiple timeout stages |
| Unbounded buffers | Memory exhaustion | Buffer limits, backpressure |

---

## Quick Reference

### Architecture Diagram (Draw This)

```
┌─────────────────────────────────────────────────────────┐
│                        Clients                          │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Master Process                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │   Worker    │ │   Worker    │ │   Worker    │       │
│  │  ┌───────┐  │ │  ┌───────┐  │ │  ┌───────┐  │       │
│  │  │ Event │  │ │  │ Event │  │ │  │ Event │  │       │
│  │  │ Loop  │  │ │  │ Loop  │  │ │  │ Loop  │  │       │
│  │  └───────┘  │ │  └───────┘  │ │  └───────┘  │       │
│  │  ┌───────┐  │ │  ┌───────┐  │ │  ┌───────┐  │       │
│  │  │Conn   │  │ │  │Conn   │  │ │  │Conn   │  │       │
│  │  │Pool   │  │ │  │Pool   │  │ │  │Pool   │  │       │
│  │  └───────┘  │ │  └───────┘  │ │  └───────┘  │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (pooled)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Upstream Servers                       │
│    ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐           │
│    │ US1 │    │ US2 │    │ US3 │    │ US4 │           │
│    └─────┘    └─────┘    └─────┘    └─────┘           │
└─────────────────────────────────────────────────────────┘
```

### Numbers to Remember

| Metric | Value | Context |
|--------|-------|---------|
| TCP handshake | ~1ms | 1 RTT |
| TLS 1.2 handshake | ~50ms | 2 RTT |
| TLS 1.3 handshake | ~30ms | 1 RTT |
| TLS session resume | ~1ms | 0-RTT possible with 1.3 |
| Memory per connection | 10-100KB | Depends on buffers, HTTP/2 |
| Thread stack size | 1MB | Default Linux |
| epoll_wait syscall | ~1μs | Fast |
| Context switch | ~1-10μs | Expensive at scale |
| File descriptors | 1M+ | Kernel tunable |

### Key Trade-offs

| Decision | Option A | Option B |
|----------|----------|----------|
| Threading | Thread-per-connection (simple) | Event-driven (scalable) |
| Buffering | Full buffer (protects upstream) | Stream (low latency) |
| Workers | Multi-process (isolation) | Multi-thread (efficiency) |
| Connection sharing | Master distributes (fair) | SO_REUSEPORT (fast) |
| Health checking | Active only (simple) | Active + passive (accurate) |
| TLS | Terminate at proxy (offload) | Pass-through (E2E) |

### Implementation Comparison

| Aspect | NGINX | HAProxy | Envoy | Pingora |
|--------|-------|---------|-------|---------|
| Model | Multi-process | Multi-thread | Multi-thread | Multi-thread |
| Language | C | C | C++ | Rust |
| Config | Static | Static + API | Dynamic (xDS) | Programmatic |
| HTTP/3 | Experimental | Experimental | Production | Production |
| Memory safety | Manual | Manual | Manual | Rust guarantees |

---

## Sample Follow-up Questions

**After presenting your design:**

1. "How would you handle a DDoS attack?"
2. "What metrics would you alert on?"
3. "How does HTTP/2 change your connection pooling?"
4. "How would you debug a latency spike?"
5. "What's your deployment strategy for updates?"

**Prepare concise answers for each!**
