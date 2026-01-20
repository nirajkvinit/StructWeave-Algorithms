# Distributed Unique ID Generator - System Design

## System Overview

A **Distributed Unique ID Generator** creates globally unique identifiers across multiple nodes without requiring coordination between them. This is a fundamental building block for distributed systems where traditional auto-incrementing database IDs don't scale and coordination-based approaches create bottlenecks. The system must generate IDs that are unique, roughly time-ordered (k-sortable), and efficient to store and index in databases.

Twitter's Snowflake (2010) pioneered the modern approach: a 64-bit ID combining timestamp, machine identifier, and sequence number. This pattern has been adopted by Discord, Instagram, and countless other high-scale systems, with variations like UUID v7 (RFC 9562, 2024) and ULID providing 128-bit alternatives.

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| Traffic Pattern | Write-only | Optimize for generation latency, no reads |
| Latency Sensitivity | Very high (<1ms) | In-memory generation, no disk/network I/O |
| Consistency Model | Eventual uniqueness | No global coordination required |
| Availability Target | 99.999% | Stateless design, no single point of failure |
| Data Model | Fixed-format integer/string | Predictable storage size, indexable |
| State | Minimal (machine ID, sequence counter) | Fast recovery, near-instant restart |
| Coordination | None or minimal | Machine ID assignment only |

---

## Complexity Rating

| Aspect | Rating | Justification |
|--------|--------|---------------|
| **Overall** | Medium | Well-understood problem with established patterns |
| ID Generation | Low | Simple bit manipulation and arithmetic |
| Clock Handling | Medium-High | NTP drift, backward clock, monotonicity |
| Machine ID Assignment | Medium | Static config vs dynamic registration |
| Scaling | Low | Inherently horizontal, stateless |
| Failure Handling | Medium | Clock drift scenarios require careful handling |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning |
| [02 - High-Level Design](./02-high-level-design.md) | Approaches comparison, architecture, data flow |
| [03 - Low-Level Design](./03-low-level-design.md) | Bit layouts, pseudocode, API design |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Clock sync, machine ID, sequence overflow |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling capacity, fault tolerance, multi-region |
| [06 - Security & Compliance](./06-security-and-compliance.md) | ID predictability, information leakage, threat model |
| [07 - Observability](./07-observability.md) | Metrics, logging, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing, trade-offs, trap questions |

---

## ID Format Comparison

| Format | Size | Sortable | Coordination | DB-Friendly | String Length | Example |
|--------|------|----------|--------------|-------------|---------------|---------|
| Auto-increment | 32-64 bit | Yes | Yes (single DB) | Best | 1-19 chars | `12345` |
| UUID v4 | 128 bit | No | None | Poor | 36 chars | `550e8400-e29b-41d4-a716-446655440000` |
| UUID v7 | 128 bit | Yes | None | Good | 36 chars | `018f6b7c-d8a2-7def-8c3a-9b2f4e7a1b3c` |
| Snowflake | 64 bit | Yes | Machine ID | Excellent | 19 chars | `1541815603606036480` |
| ULID | 128 bit | Yes | None | Good | 26 chars | `01ARZ3NDEKTSV4RRFFQ69G5FAV` |
| ObjectID | 96 bit | ~Yes | None | Good | 24 chars | `507f1f77bcf86cd799439011` |

**Recommendation:** Use **Snowflake** (64-bit) when database index performance matters and you can manage machine IDs. Use **UUID v7** when you need UUID compatibility or truly zero coordination. Use **ULID** when you need human-readable, URL-safe identifiers.

---

## Why Auto-Increment Fails at Scale

```
┌─────────────────────────────────────────────────────────────────┐
│            SINGLE DATABASE AUTO-INCREMENT (BOTTLENECK)          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│  │Service A│    │Service B│    │Service C│    │Service D│      │
│  └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘      │
│       │              │              │              │            │
│       └──────────────┴──────────────┴──────────────┘            │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │   Single DB     │ ← BOTTLENECK             │
│                    │  (auto-inc)     │                          │
│                    │                 │                          │
│                    │ • Single point  │                          │
│                    │   of failure    │                          │
│                    │ • Limited QPS   │                          │
│                    │ • Network hop   │                          │
│                    └─────────────────┘                          │
│                                                                  │
│  Problems:                                                       │
│  1. Single point of failure - DB down = no IDs                  │
│  2. Scalability ceiling - DB becomes bottleneck                 │
│  3. Network latency - every ID requires DB round-trip           │
│  4. Cross-region issues - which DB is the source of truth?      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Snowflake ID Structure (Preview)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SNOWFLAKE ID (64 bits)                       │
├───────┬────────────────────────────┬───────────┬────────────────┤
│ Sign  │        Timestamp           │ Machine   │   Sequence     │
│ 1 bit │        41 bits             │ 10 bits   │   12 bits      │
├───────┼────────────────────────────┼───────────┼────────────────┤
│   0   │ ms since custom epoch      │ DC + Node │ 0-4095         │
│       │ (69 years max)             │ (1024 max)│ per ms         │
└───────┴────────────────────────────┴───────────┴────────────────┘

Capacity:
• 4,096 IDs per millisecond per machine
• 4,096,000 IDs per second per machine
• 1,024 machines maximum
• 69.7 years lifetime from custom epoch
```

---

## Key Trade-offs Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│               UNIQUE ID GENERATOR TRADE-OFFS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ID Size ◄──────────────────────────────────► Uniqueness Space  │
│       │                                              │           │
│  64-bit (Snowflake)                         128-bit (UUID/ULID) │
│  Better DB performance                      More unique bits    │
│  Smaller storage                            Longer lifetime     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Coordination ◄─────────────────────────────► Independence      │
│       │                                              │           │
│  Machine ID needed                          Pure random (UUID)  │
│  Guaranteed unique                          Probabilistic       │
│  Setup complexity                           Zero coordination   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Time-Ordered ◄─────────────────────────────► Random            │
│       │                                              │           │
│  Snowflake, UUID v7, ULID                   UUID v4             │
│  Great for DB indexes                       Poor B-tree locality│
│  Information leakage                        No timestamp exposed│
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Throughput ◄───────────────────────────────► Simplicity        │
│       │                                              │           │
│  Snowflake (4M/sec/machine)                 UUID v4 (slower)    │
│  Bit manipulation                           Crypto random gen   │
│  Clock-dependent                            Clock-independent   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Real-World Implementations

| System | Company | Format | Key Innovation | Scale | Year |
|--------|---------|--------|----------------|-------|------|
| **Snowflake** | Twitter/X | 64-bit | Original time-sorted distributed ID | ~300K IDs/sec | 2010 |
| **Sharded IDs** | Instagram | 64-bit | PostgreSQL PL/pgSQL + sharding | Billions/day | 2012 |
| **Sonyflake** | Sony | 64-bit | Longer lifetime (174 years), 16-bit machine ID | 25.6K IDs/sec | 2015 |
| **Leaf** | Meituan | 64-bit | Dual mode (segment + snowflake) | 50K QPS | 2017 |
| **ObjectID** | MongoDB | 96-bit | Embedded timestamp + machine + PID | Built-in | 2009 |
| **UUID v7** | IETF | 128-bit | Standardized time-ordered UUID (RFC 9562) | Library-based | 2024 |
| **ULID** | Community | 128-bit | Lexicographically sortable, Base32 | Library-based | 2016 |
| **TSID** | Community | 64-bit | Modern Snowflake with configurable bits | Library-based | 2022 |

---

## When to Use Each Approach

| Scenario | Recommended | Reason |
|----------|-------------|--------|
| High-scale social media (tweets, posts) | Snowflake | 64-bit, time-ordered, proven at Twitter scale |
| Database primary keys (write-heavy) | Snowflake / UUID v7 | B-tree friendly, time-ordered |
| Distributed logging / events | ULID | Lexicographically sortable, URL-safe |
| Offline-first applications | UUID v4 / v7 | No coordination needed |
| Need UUID compatibility | UUID v7 | Standard format, time-ordered |
| Simple, single-region app | Auto-increment | Keep it simple if you can |
| Document databases | ObjectID | Often built-in (MongoDB) |
| Enterprise with batching needs | Segment allocation (Leaf) | Batch ID allocation reduces coordination |

---

## Related Systems

- **[Distributed Lock Manager](../1.8-distributed-lock-manager/00-index.md)** - Often used for machine ID assignment
- **[Distributed Key-Value Store](../1.3-distributed-key-value-store/00-index.md)** - Stores data keyed by generated IDs
- **[Service Discovery](../1.10-service-discovery/00-index.md)** - Can provide machine ID registration

---

## References

### Engineering Blogs
- [Instagram Engineering: Sharding & IDs at Instagram](https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c) - PostgreSQL-based approach
- [Twitter Engineering: Announcing Snowflake](https://blog.twitter.com/engineering/en_us/a/2010/announcing-snowflake) - Original Snowflake announcement

### Technical Documentation
- [RFC 9562: Universally Unique Identifiers (UUIDs)](https://www.rfc-editor.org/rfc/rfc9562.html) - Official UUID v7 specification
- [ULID Specification](https://github.com/ulid/spec) - ULID format specification
- [Meituan Leaf GitHub](https://github.com/Meituan-Dianping/Leaf) - Production ID generator

### Performance Analysis
- [UUID Performance in PostgreSQL](https://dev.to/umangsinha12/postgresql-uuid-performance-benchmarking-random-v4-and-time-based-v7-uuids-n9b) - UUID v4 vs v7 benchmarks
- [Why Random UUIDs Kill Database Performance](https://thehellmaker.com/blog/random-uuid-damage-btree-performance/) - B-tree fragmentation analysis
