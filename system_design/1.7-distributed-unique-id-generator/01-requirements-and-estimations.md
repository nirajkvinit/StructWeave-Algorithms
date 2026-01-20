# Requirements & Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Requirements

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Unique IDs** | Generate globally unique identifiers across all nodes | Must Have |
| **Time-Ordered** | IDs should be roughly sortable by creation time (k-sortable) | Must Have |
| **No Coordination** | ID generation should not require synchronous communication between nodes | Must Have |
| **High Throughput** | Support 10,000+ IDs per second per node | Must Have |
| **Compact Size** | IDs should be 64-bit (preferred) or 128-bit maximum | Should Have |
| **Timestamp Extraction** | Ability to extract approximate creation time from ID | Nice to Have |

### Detailed Functional Specifications

1. **Generate Unique ID**
   - Input: None (or optional metadata like ID type)
   - Output: Unique identifier (integer or string)
   - Guarantee: No two calls across any node will ever return the same ID

2. **Batch ID Generation**
   - Input: Count of IDs needed
   - Output: Array of unique IDs
   - Use case: Pre-allocating IDs for bulk inserts

3. **ID Parsing (Optional)**
   - Input: Generated ID
   - Output: Embedded components (timestamp, machine ID, sequence)
   - Use case: Debugging, analytics, audit trails

### Out of Scope

| Feature | Reason |
|---------|--------|
| Sequential IDs | Would require coordination, defeats the purpose |
| Cryptographically secure IDs | Different use case (use UUID v4 or secrets) |
| Human-memorable IDs | Trade-off with uniqueness space |
| ID reservation | Adds state and complexity |
| ID validation service | IDs are self-validating by format |

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Latency (p50)** | <100 μs | In-memory operation, no I/O |
| **Latency (p99)** | <1 ms | Account for sequence overflow wait |
| **Latency (p999)** | <5 ms | Rare clock drift scenarios |
| **Throughput per node** | >10,000 IDs/sec | Typical service requirement |
| **Max throughput per node** | 4,096,000 IDs/sec | Theoretical Snowflake limit |

### Availability Requirements

| Metric | Target | Justification |
|--------|--------|---------------|
| **Availability** | 99.999% | Core infrastructure, no SPOF |
| **Recovery Time** | <1 second | Stateless service, instant restart |
| **Degradation Mode** | Refuse generation | Better than duplicate IDs |

### Consistency & Uniqueness

| Requirement | Guarantee | Implementation |
|-------------|-----------|----------------|
| **Uniqueness** | 100% (no duplicates ever) | Machine ID + timestamp + sequence |
| **Ordering** | K-sorted (within same ms, order varies) | Timestamp-first bit layout |
| **Monotonicity** | Per-machine guarantee | Sequence increments within ms |

### CAP Theorem Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAP THEOREM ANALYSIS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  For Unique ID Generation:                                       │
│                                                                  │
│  • Consistency: IDs must be unique (non-negotiable)             │
│  • Availability: System must always generate IDs                │
│  • Partition Tolerance: Must work during network partitions     │
│                                                                  │
│  Choice: CA with built-in P handling                            │
│                                                                  │
│  How we achieve all three:                                       │
│  1. No coordination needed = Partition tolerant by design       │
│  2. Each node generates independently = Always available        │
│  3. Machine ID ensures uniqueness = Consistent                  │
│                                                                  │
│  The "trick": We trade coordination for machine ID assignment   │
│  which is a one-time setup, not runtime coordination.           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Capacity Estimations

### Reference Scale: Large Social Platform

**Assumptions:**
- 500 million DAU
- 10 actions per user per day requiring new IDs (posts, comments, likes, etc.)
- 3x peak to average ratio
- Multiple ID types (user IDs, post IDs, media IDs, etc.)

### Back-of-Envelope Calculations

```
┌─────────────────────────────────────────────────────────────────┐
│              CAPACITY ESTIMATION (Large Scale)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Daily ID Generation:                                            │
│  ─────────────────────                                          │
│  DAU × Actions/user = Total IDs/day                             │
│  500M × 10 = 5 billion IDs/day                                  │
│                                                                  │
│  QPS Calculations:                                               │
│  ─────────────────                                              │
│  Average QPS = 5B / 86,400 sec ≈ 57,870 IDs/sec                │
│  Peak QPS = 57,870 × 3 ≈ 174,000 IDs/sec                       │
│                                                                  │
│  Nodes Required (Snowflake):                                     │
│  ─────────────────────────────                                  │
│  Each node: 4,096,000 IDs/sec theoretical                       │
│  Practical limit: ~100,000 IDs/sec (with headroom)              │
│  Nodes needed: 174,000 / 100,000 ≈ 2 nodes minimum              │
│  With redundancy: 4-6 nodes recommended                         │
│                                                                  │
│  Storage per Year:                                               │
│  ────────────────                                               │
│  IDs/year = 5B × 365 = 1.825 trillion IDs                       │
│  64-bit storage = 1.825T × 8 bytes = 14.6 TB (IDs only)         │
│  128-bit storage = 1.825T × 16 bytes = 29.2 TB (IDs only)       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Capacity Estimation Table

| Metric | Calculation | Result |
|--------|-------------|--------|
| **DAU** | Given | 500 million |
| **Actions per user** | Given | 10 |
| **IDs per day** | 500M × 10 | 5 billion |
| **Average QPS** | 5B ÷ 86,400 | ~57,870 |
| **Peak QPS** | 57,870 × 3 | ~174,000 |
| **IDs per year** | 5B × 365 | 1.825 trillion |
| **Storage (64-bit)** | 1.825T × 8B | 14.6 TB/year |
| **Storage (128-bit)** | 1.825T × 16B | 29.2 TB/year |

### Snowflake Capacity Limits

```
┌─────────────────────────────────────────────────────────────────┐
│              SNOWFLAKE THEORETICAL LIMITS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Per Generator Limits:                                           │
│  ─────────────────────                                          │
│  Sequence bits: 12 → 2^12 = 4,096 IDs per millisecond           │
│  Per second: 4,096 × 1,000 = 4,096,000 IDs                      │
│  Per minute: 4,096,000 × 60 = 245,760,000 IDs                   │
│  Per hour: ~14.7 billion IDs                                    │
│                                                                  │
│  System-Wide Limits:                                             │
│  ──────────────────                                             │
│  Machine ID bits: 10 → 2^10 = 1,024 generators max              │
│  Total throughput: 4,096,000 × 1,024 = 4.19 billion IDs/sec     │
│                                                                  │
│  Lifetime:                                                       │
│  ────────                                                       │
│  Timestamp bits: 41 → 2^41 = 2,199,023,255,552 milliseconds     │
│  In years: 2^41 ms ÷ (1000 × 60 × 60 × 24 × 365) ≈ 69.7 years  │
│                                                                  │
│  With custom epoch (e.g., Jan 1, 2020):                         │
│  System lifetime: 2020 + 69.7 = until ~2090                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Alternative Format Capacities

| Format | Bits | IDs/ms/node | Max Nodes | Lifetime | Total IDs |
|--------|------|-------------|-----------|----------|-----------|
| **Snowflake** | 64 | 4,096 | 1,024 | 69.7 years | 2^63 |
| **Sonyflake** | 64 | 256 (per 10ms) | 65,536 | 174 years | 2^63 |
| **UUID v7** | 128 | ~2^74 | Unlimited | 8,919 years | 2^128 |
| **ULID** | 128 | ~2^80 | Unlimited | 281 trillion years | 2^128 |
| **ObjectID** | 96 | 16.7M | ~16M | 136 years | 2^96 |

---

## SLOs / SLAs

### Service Level Objectives

| SLO | Target | Measurement Method |
|-----|--------|-------------------|
| **Availability** | 99.999% (5 nines) | Generator uptime over 30-day rolling window |
| **Latency (p99)** | <1 ms | ID generation time, measured at generator |
| **Uniqueness** | 100% | Zero duplicate IDs ever (monitored via sampling) |
| **Throughput** | >10,000 IDs/sec/node | Sustained generation rate |
| **Clock Sync** | <100 ms drift | NTP offset monitoring |

### SLO Budget Calculation

```
┌─────────────────────────────────────────────────────────────────┐
│              SLO BUDGET: 99.999% AVAILABILITY                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Allowed downtime per year:                                      │
│  100% - 99.999% = 0.001%                                        │
│  365 days × 24 hours × 60 minutes × 0.00001 = 5.26 minutes     │
│                                                                  │
│  Allowed downtime per month:                                     │
│  30 days × 24 hours × 60 minutes × 0.00001 = 0.43 minutes      │
│  = 26 seconds per month                                         │
│                                                                  │
│  This is achievable because:                                     │
│  • Generators are stateless (instant restart)                   │
│  • No coordination needed (no distributed consensus)            │
│  • In-memory only (no disk I/O failures)                        │
│  • Multiple generators provide redundancy                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Error Budget Policy

| Error Type | Impact | Action |
|------------|--------|--------|
| Clock drift >100ms | Potential ordering issues | Warning alert, investigate NTP |
| Clock moved backward | Generation paused | Critical alert, refuse IDs until caught up |
| Sequence overflow | Brief pause (<1ms) | Normal, wait for next millisecond |
| Machine ID conflict | Duplicate IDs possible | Critical, immediate shutdown and investigation |

---

## Latency Analysis

### Operation Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│              LATENCY BREAKDOWN (Snowflake ID Generation)         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Operation                           Time                        │
│  ─────────────────────────────────────────                      │
│  Get current timestamp               ~10-50 ns (system call)     │
│  Compare with last timestamp         ~1-5 ns                     │
│  Increment sequence (atomic)         ~10-50 ns                   │
│  Bit manipulation                    ~5-10 ns                    │
│  ─────────────────────────────────────────                      │
│  Total (happy path)                  ~30-120 ns                  │
│                                                                  │
│  Additional latency scenarios:                                   │
│  • Sequence overflow: Wait for next ms (~0-1ms)                 │
│  • Lock contention: Depends on implementation (~100-500ns)      │
│  • Clock backward: Refuse or wait (variable)                    │
│                                                                  │
│  Network latency (if centralized service):                       │
│  • Same datacenter: ~0.5-2 ms                                   │
│  • Cross-region: ~50-200 ms                                     │
│  → Recommendation: Embed generator as library, not service      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Latency Percentiles Target

| Percentile | Target | Typical Cause if Exceeded |
|------------|--------|---------------------------|
| p50 | <50 μs | Normal operation |
| p95 | <200 μs | Minor contention |
| p99 | <1 ms | Sequence overflow wait |
| p99.9 | <5 ms | Multiple overflow waits |
| p99.99 | <50 ms | Clock drift handling |

---

## Database Performance Impact

### B-tree Index Considerations

```
┌─────────────────────────────────────────────────────────────────┐
│              DATABASE INDEX PERFORMANCE BY ID TYPE               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Auto-Increment (Best):                                          │
│  ┌─────────────────────────────────────┐                        │
│  │ New IDs always append to right edge │ → Sequential writes    │
│  │ Page fills: ~94%                    │ → Optimal space usage  │
│  │ Page splits: Predictable            │ → Minimal I/O          │
│  └─────────────────────────────────────┘                        │
│                                                                  │
│  Snowflake/UUID v7 (Good):                                       │
│  ┌─────────────────────────────────────┐                        │
│  │ New IDs mostly append to right      │ → Near-sequential      │
│  │ Page fills: ~80-90%                 │ → Good space usage     │
│  │ Some mid-tree inserts (same ms)     │ → Minor fragmentation  │
│  └─────────────────────────────────────┘                        │
│                                                                  │
│  UUID v4 (Poor):                                                 │
│  ┌─────────────────────────────────────┐                        │
│  │ Random distribution across tree     │ → Random I/O           │
│  │ Page fills: ~50%                    │ → 2x storage           │
│  │ Constant page splits                │ → High write amp       │
│  └─────────────────────────────────────┘                        │
│                                                                  │
│  Measured Impact (PostgreSQL benchmarks):                        │
│  • UUID v4: 2-5x slower inserts than sequential                 │
│  • UUID v7: ~1.2x slower than sequential (acceptable)           │
│  • Snowflake: ~1.1x slower than sequential (excellent)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Storage Overhead Comparison

| ID Type | Size | Index Size (1B rows) | Overhead vs 64-bit |
|---------|------|---------------------|-------------------|
| BIGINT (auto-inc) | 8 bytes | ~8 GB | Baseline |
| Snowflake | 8 bytes | ~8 GB | 0% |
| ObjectID | 12 bytes | ~12 GB | +50% |
| UUID v4 | 16 bytes | ~16 GB | +100% |
| UUID v7 | 16 bytes | ~16 GB | +100% |
| ULID (string) | 26 bytes | ~26 GB | +225% |

---

## Summary: Requirements Checklist

### Must Have
- [ ] Generate globally unique IDs
- [ ] No runtime coordination between generators
- [ ] <1ms p99 latency
- [ ] >10,000 IDs/sec per node
- [ ] 99.999% availability

### Should Have
- [ ] 64-bit ID format (database-friendly)
- [ ] Time-ordered (k-sortable)
- [ ] Timestamp extraction capability
- [ ] Graceful clock drift handling

### Nice to Have
- [ ] Batch generation API
- [ ] Multiple ID format support
- [ ] Custom epoch configuration
- [ ] Machine ID auto-assignment
