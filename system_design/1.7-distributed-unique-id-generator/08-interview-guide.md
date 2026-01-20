# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45 minutes)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    45-MINUTE INTERVIEW PACING                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Time      │ Phase           │ Focus                                  │   │
│  ├───────────┼─────────────────┼────────────────────────────────────────┤   │
│  │ 0-5 min   │ Clarify         │ Requirements, scale, constraints       │   │
│  │ 5-15 min  │ High-Level      │ Approach comparison, choose solution   │   │
│  │ 15-30 min │ Deep Dive       │ Bit layout, pseudocode, clock handling │   │
│  │ 30-40 min │ Scale & Failure │ Multi-region, clock drift, overflow    │   │
│  │ 40-45 min │ Wrap Up         │ Trade-offs summary, questions          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Clarification (0-5 min)

### Key Questions to Ask

| Question | Why It Matters | Common Answer |
|----------|----------------|---------------|
| What's the expected scale? (IDs/sec) | Determines if simple approach works | 10K-1M/sec |
| Should IDs be sortable by time? | UUID v4 vs Snowflake decision | Usually yes |
| What size constraints? (64-bit vs 128-bit) | Affects DB performance | Prefer 64-bit |
| Can we coordinate for machine IDs? | Pure random vs Snowflake | Usually yes |
| Multi-region requirements? | ID allocation strategy | Usually yes |
| Latency requirements? | Library vs service | <1ms typical |

### Example Clarification Dialogue

```
Interviewer: "Design a unique ID generator for a large-scale system."

You: "Before diving in, let me clarify a few requirements:
      1. What scale are we targeting? Thousands or millions of IDs per second?
      2. Do IDs need to be sortable by creation time?
      3. Are there size constraints - can we use 128-bit, or prefer 64-bit?
      4. Is multi-region deployment a requirement?
      5. What's the latency budget for generating an ID?"

Interviewer: "Let's say millions per second, time-sortable, 64-bit preferred,
             multi-region, and sub-millisecond latency."

You: "Great, those requirements point toward a Snowflake-style approach.
      Let me walk you through the design..."
```

---

## Phase 2: High-Level Design (5-15 min)

### Approach Comparison Framework

Present this comparison to show you understand the trade-offs:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    APPROACH COMPARISON (Show This)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  "Let me compare the main approaches:"                                       │
│                                                                              │
│  1. Auto-Increment                                                           │
│     • Pros: Simple, ordered                                                  │
│     • Cons: Single point of failure, doesn't scale                         │
│     • Verdict: Not suitable for our scale                                   │
│                                                                              │
│  2. UUID v4                                                                  │
│     • Pros: No coordination, universally unique                            │
│     • Cons: Not sortable, 128-bit, poor DB index performance               │
│     • Verdict: Doesn't meet time-ordering requirement                       │
│                                                                              │
│  3. Snowflake (Recommended)                                                  │
│     • Pros: 64-bit, time-ordered, high throughput, proven at scale         │
│     • Cons: Requires machine ID coordination (one-time setup)              │
│     • Verdict: Best fit for our requirements                                │
│                                                                              │
│  4. UUID v7 (Alternative)                                                    │
│     • Pros: Time-ordered, zero coordination, new standard                  │
│     • Cons: 128-bit                                                         │
│     • Verdict: Good if we can accept 128-bit                               │
│                                                                              │
│  "Given 64-bit preference and scale requirements, I'll go with Snowflake."  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Quick Architecture Sketch

Draw this on the whiteboard:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE SKETCH (Draw This)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Services                    ID Generators                                  │
│   ┌────────┐                 ┌────────────────────┐                        │
│   │Order   │──────┐          │ Generator 1 (M=1)  │                        │
│   │Service │      │          │ Generator 2 (M=2)  │                        │
│   └────────┘      │          │ Generator 3 (M=3)  │                        │
│   ┌────────┐      └─────────►│        ...         │                        │
│   │User    │─────────────────│ Generator N (M=N)  │                        │
│   │Service │                 └────────────────────┘                        │
│   └────────┘                         │                                      │
│                                      │                                      │
│   "Each generator has unique        ◄┘                                      │
│    machine ID, generates IDs     ┌────────────┐                            │
│    independently"                │ ZooKeeper  │ (machine ID registry)      │
│                                  │ (optional) │                            │
│                                  └────────────┘                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 3: Deep Dive (15-30 min)

### Snowflake Bit Layout (Must Explain)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BIT LAYOUT (Draw This)                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  64-bit Snowflake ID:                                                        │
│  ┌──────┬─────────────────────────────┬───────────┬────────────┐           │
│  │ 1 bit│        41 bits              │  10 bits  │  12 bits   │           │
│  │unused│       Timestamp             │ Machine ID│  Sequence  │           │
│  └──────┴─────────────────────────────┴───────────┴────────────┘           │
│                                                                              │
│  "Let me explain each component:"                                            │
│                                                                              │
│  • Sign bit (1): Always 0 for positive number                               │
│  • Timestamp (41): Milliseconds since custom epoch                          │
│    - 2^41 ms = 69.7 years of IDs                                           │
│  • Machine ID (10): 5 bits datacenter + 5 bits worker                       │
│    - Supports 32 DCs × 32 workers = 1024 machines                          │
│  • Sequence (12): Counter within same millisecond                           │
│    - 4096 IDs per millisecond per machine                                  │
│                                                                              │
│  "Total capacity: 4096 × 1024 machines = 4.2 billion IDs/second"            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pseudocode (Be Ready to Write)

```
FUNCTION generate_id():
    current_ts = get_time_ms() - EPOCH

    IF current_ts < last_ts THEN
        // Clock moved backward - REFUSE
        THROW ClockError

    IF current_ts == last_ts THEN
        sequence = (sequence + 1) AND 0xFFF  // 12-bit mask
        IF sequence == 0 THEN
            // Overflow - wait for next ms
            current_ts = wait_for_next_ms()
    ELSE
        sequence = 0

    last_ts = current_ts

    // Combine: timestamp | machine_id | sequence
    RETURN (current_ts << 22) | (machine_id << 12) | sequence
```

---

## Phase 4: Scale & Failure (30-40 min)

### Clock Drift Handling (Critical Topic)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLOCK DRIFT (Explain This)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  "Clock drift is the most challenging aspect. Here's how I'd handle it:"    │
│                                                                              │
│  Problem: NTP can make clock jump backward                                   │
│  ─────────────────────────────────────────                                  │
│  • If we generate with old timestamp → duplicate IDs possible!              │
│                                                                              │
│  Solution: Refuse and wait                                                   │
│  ─────────────────────────────                                              │
│  IF current_ts < last_ts THEN                                               │
│      IF diff < 5ms THEN                                                     │
│          SLEEP(diff)  // Small drift, wait it out                           │
│      ELSE                                                                    │
│          THROW Error  // Large drift, refuse generation                     │
│                                                                              │
│  "We accept brief unavailability over duplicate IDs."                       │
│                                                                              │
│  Prevention:                                                                 │
│  ───────────                                                                │
│  • Use multiple NTP servers                                                 │
│  • Configure NTP for slew mode (gradual adjustment)                        │
│  • Monitor clock offset, alert if > 50ms                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Multi-Region Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-REGION (Explain This)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  "For multi-region, I'd partition machine IDs by datacenter:"               │
│                                                                              │
│  Machine ID (10 bits) = Datacenter (5 bits) + Worker (5 bits)               │
│                                                                              │
│  Region A (US):   DC IDs 0-7    (256 workers)                               │
│  Region B (EU):   DC IDs 8-15   (256 workers)                               │
│  Region C (APAC): DC IDs 16-23  (256 workers)                               │
│  Reserved:        DC IDs 24-31  (future expansion)                          │
│                                                                              │
│  "Each region generates independently - no cross-region coordination!"      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Trap Questions & Best Answers

### Trap 1: "Why not just use UUID?"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Question: "Why not just use UUID?"                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  What they're testing: Do you understand the trade-offs?                    │
│                                                                              │
│  BAD answer: "UUIDs are fine, we could use those."                          │
│                                                                              │
│  GOOD answer:                                                                │
│  "UUID v4 has several issues for our use case:                              │
│                                                                              │
│   1. SIZE: 128 bits vs 64 bits                                              │
│      - Doubles storage and index size                                       │
│      - Slower comparisons                                                   │
│                                                                              │
│   2. SORTABILITY: Random UUIDs aren't time-ordered                         │
│      - We'd need a separate created_at column                               │
│      - Can't do efficient range queries by creation time                   │
│                                                                              │
│   3. DB PERFORMANCE: Random IDs cause B-tree fragmentation                  │
│      - Page splits happen randomly throughout the tree                     │
│      - 2-5x slower inserts in benchmarks                                   │
│      - Higher write amplification                                           │
│                                                                              │
│   That said, UUID v7 (new 2024 standard) addresses sortability,            │
│   but is still 128 bits. I'd use it if UUID format is required."           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Trap 2: "What if the clock goes backward?"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Question: "What happens if the clock goes backward?"                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  What they're testing: Do you understand the hardest edge case?             │
│                                                                              │
│  BAD answer: "NTP keeps clocks synced, so this won't happen."               │
│                                                                              │
│  GOOD answer:                                                                │
│  "This is actually the trickiest scenario! Here's how I'd handle it:       │
│                                                                              │
│   1. DETECT: Compare current_ts with last_ts                                │
│      IF current_ts < last_ts → clock went backward                          │
│                                                                              │
│   2. HANDLE:                                                                 │
│      - Small drift (<5ms): Wait for clock to catch up                       │
│      - Large drift: Refuse to generate, throw error                         │
│      - NEVER generate with old timestamp → causes duplicates                │
│                                                                              │
│   3. PREVENT:                                                                │
│      - Configure NTP for slew mode (gradual adjustment)                     │
│      - Use multiple NTP sources                                             │
│      - Monitor clock offset continuously                                    │
│      - Alert if drift exceeds threshold                                     │
│                                                                              │
│   The key insight: We accept brief unavailability over duplicate IDs.      │
│   Uniqueness is non-negotiable."                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Trap 3: "What if you need more than 4096 IDs per millisecond?"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Question: "What if you need more than 4096 IDs in one millisecond?"        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  What they're testing: Edge case handling, scaling understanding            │
│                                                                              │
│  BAD answer: "That probably won't happen."                                  │
│                                                                              │
│  GOOD answer:                                                                │
│  "Sequence overflow is a real concern at high scale. Options:               │
│                                                                              │
│   1. WAIT FOR NEXT MS (Default)                                             │
│      - When sequence hits 4096, spin-wait for next millisecond              │
│      - Adds up to 1ms latency for overflowing requests                     │
│      - Simple and safe                                                       │
│                                                                              │
│   2. ADD MORE GENERATORS                                                    │
│      - Each generator has 4096 IDs/ms capacity                             │
│      - 10 generators = 40,960 IDs/ms                                        │
│      - Linear scaling up to 1024 machines                                   │
│                                                                              │
│   3. USE SONYFLAKE VARIANT                                                  │
│      - 16-bit machine ID instead of 10-bit                                  │
│      - 65,536 possible generators                                           │
│      - Lower per-generator throughput but more machines                    │
│                                                                              │
│   4. DIFFERENT BIT ALLOCATION                                               │
│      - Could use 14 bits for sequence (16,384/ms)                          │
│      - Trade-off: fewer machine ID bits                                     │
│                                                                              │
│   For most systems, approach 1+2 is sufficient."                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Trap 4: "How do you guarantee no duplicates?"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Question: "How do you guarantee no duplicate IDs ever?"                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  What they're testing: Deep understanding of uniqueness guarantees          │
│                                                                              │
│  GOOD answer:                                                                │
│  "Uniqueness comes from three non-overlapping components:                   │
│                                                                              │
│   1. TIMESTAMP (41 bits)                                                    │
│      - Different if requests are in different milliseconds                  │
│      - Guaranteed by monotonic check (refuse if clock backward)            │
│                                                                              │
│   2. MACHINE ID (10 bits)                                                   │
│      - Unique per generator                                                  │
│      - Enforced by ZooKeeper registration (or static config)               │
│      - No two generators share the same machine ID                         │
│                                                                              │
│   3. SEQUENCE (12 bits)                                                     │
│      - Unique within same millisecond on same machine                       │
│      - Increments atomically                                                │
│      - Never wraps within same millisecond (wait if overflow)              │
│                                                                              │
│   As long as machine IDs are unique and clocks don't go backward,          │
│   duplicates are mathematically impossible."                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Common Mistakes to Avoid

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMMON MISTAKES                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. JUMPING TO SOLUTION                                                      │
│     ✗ "Let's use Snowflake because Twitter uses it"                        │
│     ✓ "Let me understand requirements first, then compare approaches"       │
│                                                                              │
│  2. IGNORING CLOCK ISSUES                                                    │
│     ✗ "NTP handles time synchronization"                                    │
│     ✓ "Clock drift is critical - here's how I'd detect and handle it"      │
│                                                                              │
│  3. FORGETTING MACHINE ID ASSIGNMENT                                        │
│     ✗ "Each server gets a machine ID"                                       │
│     ✓ "Machine IDs need coordination - ZooKeeper or static config"          │
│                                                                              │
│  4. NOT DISCUSSING CAPACITY                                                  │
│     ✗ "Snowflake can handle the load"                                       │
│     ✓ "4096 IDs/ms × 1024 machines = 4.2 billion/sec, plenty of headroom"  │
│                                                                              │
│  5. OVER-ENGINEERING                                                         │
│     ✗ Designing for 1 trillion IDs/sec on day 1                             │
│     ✓ Design for 10x current needs, discuss how to scale further           │
│                                                                              │
│  6. IGNORING DB PERFORMANCE                                                  │
│     ✗ "IDs are just identifiers"                                            │
│     ✓ "Time-ordered IDs matter for B-tree index locality"                   │
│                                                                              │
│  7. NOT CONSIDERING SECURITY                                                 │
│     ✗ "IDs are unique, so they're secure"                                   │
│     ✓ "Snowflake IDs are predictable - always verify authorization"        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Trade-offs Summary Table

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **ID Size** | 64-bit (Snowflake) | 128-bit (UUID v7) | Snowflake if DB perf matters |
| **Coordination** | ZooKeeper for machine ID | Static config | ZK for dynamic environments |
| **Clock backward** | Refuse + wait | Borrow from future | Refuse + wait (safer) |
| **Deployment** | Embedded library | Centralized service | Library (lower latency) |
| **Overflow handling** | Wait for next ms | Return error | Wait (smoother experience) |
| **Machine ID bits** | 10 bits (1024 machines) | 16 bits (65K machines) | 10 bits unless you need more |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    QUICK REFERENCE CARD                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Snowflake Bit Layout:                                                       │
│  [1 sign][41 timestamp][5 DC][5 worker][12 sequence] = 64 bits              │
│                                                                              │
│  Capacity:                                                                   │
│  • Per generator: 4,096,000 IDs/sec                                         │
│  • Max generators: 1,024                                                     │
│  • Total: 4.2 billion IDs/sec                                               │
│  • Lifetime: 69.7 years                                                      │
│                                                                              │
│  Key Components:                                                             │
│  • Timestamp: ms since custom epoch                                          │
│  • Machine ID: datacenter + worker                                          │
│  • Sequence: 0-4095 per ms                                                   │
│                                                                              │
│  Critical Handling:                                                          │
│  • Clock backward: REFUSE, wait for catch-up                                │
│  • Sequence overflow: WAIT for next millisecond                             │
│  • Machine ID: Coordinate via ZK or static config                           │
│                                                                              │
│  Alternatives:                                                               │
│  • UUID v7: 128-bit, time-ordered, zero coordination                        │
│  • ULID: 128-bit, lexicographically sortable, URL-safe                     │
│  • Sonyflake: 64-bit, 174 year lifetime, 65K machines                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sample Questions from Interviewer

| Question | Category | Key Points to Cover |
|----------|----------|---------------------|
| "Design a unique ID generator" | Full design | Requirements, comparison, Snowflake, clock handling |
| "How would Twitter generate tweet IDs?" | Specific company | Mention Snowflake origin, scale considerations |
| "UUID vs auto-increment at scale" | Comparison | Size, sortability, B-tree performance, coordination |
| "How to handle 10M IDs per second?" | Scale | Multiple generators, Sonyflake variant, bit reallocation |
| "What if two services get same machine ID?" | Failure | ZK coordination, conflict detection, shutdown + investigate |
| "Make it work across 5 regions" | Multi-region | Partition DC IDs by region, no cross-region coordination |
