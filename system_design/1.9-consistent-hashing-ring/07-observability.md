# Observability

[← Back to Index](./00-index.md)

---

## Overview

Observability for consistent hashing focuses on distribution quality, lookup performance, and membership health. Unlike full systems, the primary concerns are algorithmic correctness and operational efficiency.

---

## Key Metrics

### Distribution Metrics

| Metric | Description | Healthy Range | Alert Threshold |
|--------|-------------|---------------|-----------------|
| **keys_per_node** | Keys assigned to each node | Within 10% of average | > 20% deviation |
| **load_variance** | Standard deviation of key counts | < 5% of mean | > 15% |
| **max_load_ratio** | max(keys) / average(keys) | < 1.1 | > 1.25 |
| **min_load_ratio** | min(keys) / average(keys) | > 0.9 | < 0.75 |
| **vnode_distribution** | VNodes per physical node | Uniform | Any node with 0 |

### Performance Metrics

| Metric | Description | Healthy Range | Alert Threshold |
|--------|-------------|---------------|-----------------|
| **lookup_latency_p50** | Median lookup time | < 100 ns | > 500 ns |
| **lookup_latency_p99** | 99th percentile | < 1 μs | > 10 μs |
| **hash_computation_time** | Time to hash a key | < 50 ns | > 200 ns |
| **ring_size** | Total positions in ring | N × V | Unexpected change |

### Membership Metrics

| Metric | Description | Healthy Range | Alert Threshold |
|--------|-------------|---------------|-----------------|
| **node_count** | Number of active nodes | Expected count | Unexpected change |
| **membership_changes_rate** | Changes per minute | < 1 | > 5 |
| **gossip_convergence_time** | Time for update to spread | < 10s | > 30s |
| **pending_nodes** | Nodes joining/leaving | 0-1 | > 3 |

### Migration Metrics

| Metric | Description | Healthy Range | Alert Threshold |
|--------|-------------|---------------|-----------------|
| **keys_migrating** | Keys currently being moved | During changes only | Stuck > 10 min |
| **migration_throughput** | Keys moved per second | > 10,000 | < 1,000 |
| **migration_queue_depth** | Pending migrations | 0 when stable | Growing continuously |

---

## Metric Collection

### Distribution Monitoring

```
ALGORITHM CollectDistributionMetrics() → Metrics:

    keyCountPerNode = {}
    totalKeys = 0

    FOR EACH node IN Ring.GetAllNodes():
        count = node.GetKeyCount()
        keyCountPerNode[node.id] = count
        totalKeys += count

    // Calculate statistics
    avgKeys = totalKeys / nodeCount
    variance = Sum((count - avgKeys)² for count in keyCountPerNode) / nodeCount
    stdDev = Sqrt(variance)
    coefficientOfVariation = stdDev / avgKeys

    maxLoad = Max(keyCountPerNode.values())
    minLoad = Min(keyCountPerNode.values())

    RETURN {
        total_keys: totalKeys,
        node_count: nodeCount,
        avg_keys_per_node: avgKeys,
        std_dev: stdDev,
        cv_percent: coefficientOfVariation * 100,
        max_load_ratio: maxLoad / avgKeys,
        min_load_ratio: minLoad / avgKeys,
        per_node_counts: keyCountPerNode
    }

    // Emit metrics
    Metrics.Gauge("ring.total_keys", totalKeys)
    Metrics.Gauge("ring.cv_percent", coefficientOfVariation * 100)
    Metrics.Gauge("ring.max_load_ratio", maxLoad / avgKeys)

    FOR EACH node, count IN keyCountPerNode:
        Metrics.Gauge("ring.node_keys", count, tags={node: node})
```

### Lookup Performance Monitoring

```
ALGORITHM InstrumentedLookup(key: String) → Node:

    startTime = HighResolutionClock.Now()

    // Hash timing
    hashStart = HighResolutionClock.Now()
    position = Hash(key)
    hashTime = HighResolutionClock.Now() - hashStart

    // Search timing
    searchStart = HighResolutionClock.Now()
    index = BinarySearchCeiling(ring, position)
    searchTime = HighResolutionClock.Now() - searchStart

    node = nodeMap[ring[index].nodeId]

    totalTime = HighResolutionClock.Now() - startTime

    // Record metrics
    Metrics.Histogram("ring.lookup_latency_ns", totalTime)
    Metrics.Histogram("ring.hash_time_ns", hashTime)
    Metrics.Histogram("ring.search_time_ns", searchTime)

    RETURN node
```

---

## Dashboard Design

### Ring Overview Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONSISTENT HASH RING - OVERVIEW                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Cluster Health: ● HEALTHY                                          │
│  Nodes: 50 active | 0 pending | 0 failed                            │
│  Total Keys: 12,345,678                                              │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  KEY DISTRIBUTION                                            │    │
│  │                                                              │    │
│  │  ████████████████████  Node-01: 248,234 (100.5%)            │    │
│  │  ███████████████████   Node-02: 243,891 (98.7%)             │    │
│  │  ████████████████████  Node-03: 251,002 (101.6%)            │    │
│  │  ███████████████████   Node-04: 244,567 (98.9%)             │    │
│  │  █████████████████████ Node-05: 256,123 (103.6%)  ⚠️        │    │
│  │  ...                                                         │    │
│  │                                                              │    │
│  │  Coefficient of Variation: 3.2% ✓                           │    │
│  │  Max Load Ratio: 1.04 ✓                                     │    │
│  │  Min Load Ratio: 0.96 ✓                                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  LOOKUP LATENCY                                              │    │
│  │                                                              │    │
│  │  p50: 85 ns    p95: 120 ns    p99: 180 ns    p99.9: 450 ns │    │
│  │                                                              │    │
│  │      │                                                       │    │
│  │  500 │                                             *         │    │
│  │  400 │                                       *               │    │
│  │  300 │                                 *                     │    │
│  │  200 │                           *                           │    │
│  │  100 │   *     *     *     *                                 │    │
│  │      └───────────────────────────────────────────────────    │    │
│  │        p50   p75   p90   p95   p99  p99.9                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Ring Visualization Panel

```
┌─────────────────────────────────────────────────────────────────────┐
│  RING VISUALIZATION                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                              0°                                      │
│                               │                                      │
│                          ┌────┴────┐                                │
│                     ────/   [A A]   \────                           │
│                   / [D]              [B] \                          │
│                 /                          \                        │
│            [D]/    Ring Positions           \[B]                    │
│              │     (colored by node)         │                      │
│        270°──│                               │──90°                  │
│              │     ● Node A (green)          │                      │
│            [C]\    ● Node B (blue)          /[B]                    │
│                 \  ● Node C (orange)      /                        │
│                   \● Node D (purple)   /                           │
│                     ────\   [C C]  /────                            │
│                          └────┬────┘                                │
│                               │                                      │
│                             180°                                     │
│                                                                      │
│  Legend: Each colored segment represents a vnode                    │
│  Hover for: position, node, key count                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Membership Timeline

```
┌─────────────────────────────────────────────────────────────────────┐
│  MEMBERSHIP CHANGES (Last 24 Hours)                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Timeline:                                                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 00:00                   12:00                   24:00        │   │
│  │   │                       │                       │          │   │
│  │   ▲                       ▲                       │          │   │
│  │   │ Node-42 joined        │ Node-15 left         │          │   │
│  │   │ 50K keys migrated     │ (planned maint)      │          │   │
│  │   │ Duration: 45s         │ 48K keys moved       │          │   │
│  │   │                       │ Duration: 30s        │          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Summary:                                                            │
│  - Joins: 2                                                         │
│  - Leaves: 1                                                        │
│  - Total keys migrated: 148,234                                     │
│  - Avg migration duration: 37s                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Logging Strategy

### Log Levels

| Level | What to Log | Example |
|-------|-------------|---------|
| **ERROR** | Failures affecting correctness | "Node lookup failed: ring empty" |
| **WARN** | Distribution problems | "Node-05 at 125% of avg load" |
| **INFO** | Membership changes | "Node-42 joined, 50K keys migrating" |
| **DEBUG** | Detailed operations | "Lookup key=abc123 → Node-07, 85ns" |

### Structured Log Format

```
{
    "timestamp": "2025-01-20T10:30:45.123Z",
    "level": "INFO",
    "event": "membership_change",
    "action": "node_joined",
    "node_id": "node-42",
    "node_address": "10.0.1.42:6379",
    "vnodes_added": 150,
    "keys_to_migrate": 52341,
    "migration_sources": ["node-01", "node-15", "node-23"],
    "ring_size_before": 7350,
    "ring_size_after": 7500
}

{
    "timestamp": "2025-01-20T10:31:30.456Z",
    "level": "INFO",
    "event": "migration_complete",
    "node_id": "node-42",
    "keys_migrated": 52341,
    "duration_seconds": 45.3,
    "throughput_keys_per_sec": 1155
}

{
    "timestamp": "2025-01-20T10:35:00.789Z",
    "level": "WARN",
    "event": "distribution_imbalance",
    "node_id": "node-05",
    "keys": 312456,
    "avg_keys": 246913,
    "load_ratio": 1.27,
    "threshold": 1.20,
    "recommendation": "Consider adding nodes or adjusting vnodes"
}
```

---

## Alerting Rules

### Critical Alerts (Page)

| Alert | Condition | Action |
|-------|-----------|--------|
| **Ring Empty** | node_count = 0 | Immediate investigation |
| **All Nodes Down** | healthy_nodes = 0 | Emergency response |
| **Severe Imbalance** | max_load_ratio > 2.0 | Node may crash |

### Warning Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| **High Imbalance** | max_load_ratio > 1.25 for 5 min | Review distribution |
| **Rapid Membership Churn** | changes > 10/min | Investigate cause |
| **Slow Migration** | migration_duration > 10 min | Check network/load |
| **Gossip Delay** | convergence_time > 60s | Network issue |
| **Lookup Latency** | p99 > 10 μs for 5 min | Performance degradation |

### Alert Configuration Example

```
ALERTING_RULES:

  - name: ring_severe_imbalance
    expr: ring_max_load_ratio > 2.0
    for: 1m
    severity: critical
    annotations:
      summary: "Ring has severe load imbalance"
      description: "Max load ratio is {{ value }}, indicating one node has 2x+ average keys"
      runbook: "https://wiki/ring-imbalance-runbook"

  - name: ring_node_count_changed
    expr: changes(ring_node_count[5m]) > 0
    severity: info
    annotations:
      summary: "Ring membership changed"
      description: "Node count changed from {{ previous }} to {{ current }}"

  - name: ring_lookup_latency_high
    expr: histogram_quantile(0.99, ring_lookup_latency_ns) > 10000
    for: 5m
    severity: warning
    annotations:
      summary: "Ring lookup latency elevated"
      description: "p99 lookup latency is {{ value }}ns (threshold: 10000ns)"

  - name: ring_migration_stuck
    expr: ring_keys_migrating > 0 AND ring_migration_progress_keys == 0
    for: 10m
    severity: warning
    annotations:
      summary: "Key migration appears stuck"
      description: "Keys migrating but no progress in 10 minutes"
```

---

## Health Checks

### Ring Health Check

```
ALGORITHM RingHealthCheck() → HealthStatus:

    checks = []

    // Check 1: Ring has nodes
    IF Ring.GetNodeCount() == 0:
        checks.append({name: "has_nodes", status: FAIL, message: "Ring is empty"})
    ELSE:
        checks.append({name: "has_nodes", status: PASS})

    // Check 2: Distribution quality
    metrics = CollectDistributionMetrics()
    IF metrics.max_load_ratio > 1.25:
        checks.append({name: "distribution", status: WARN,
            message: "Load imbalance: " + metrics.max_load_ratio})
    ELSE:
        checks.append({name: "distribution", status: PASS})

    // Check 3: No stuck migrations
    IF Ring.HasPendingMigrations() AND Ring.MigrationAge() > 10 minutes:
        checks.append({name: "migrations", status: WARN,
            message: "Migration stuck for " + Ring.MigrationAge()})
    ELSE:
        checks.append({name: "migrations", status: PASS})

    // Check 4: Gossip convergence
    IF Gossip.HasDivergentViews():
        checks.append({name: "gossip", status: WARN,
            message: "Inconsistent membership views"})
    ELSE:
        checks.append({name: "gossip", status: PASS})

    // Aggregate
    IF any check is FAIL:
        RETURN HealthStatus.UNHEALTHY
    ELSE IF any check is WARN:
        RETURN HealthStatus.DEGRADED
    ELSE:
        RETURN HealthStatus.HEALTHY
```

### Health Endpoint Response

```
GET /health/ring

{
    "status": "healthy",
    "timestamp": "2025-01-20T10:30:45Z",
    "checks": {
        "has_nodes": {"status": "pass", "node_count": 50},
        "distribution": {"status": "pass", "cv_percent": 3.2, "max_load_ratio": 1.04},
        "migrations": {"status": "pass", "pending": 0},
        "gossip": {"status": "pass", "convergence_time_ms": 2340}
    },
    "metrics": {
        "total_keys": 12345678,
        "lookup_latency_p99_ns": 180,
        "ring_size": 7500
    }
}
```

---

## Debugging Tools

### Key Location Lookup

```
Command: ring-debug locate <key>

Output:
Key: user:12345
Hash: 0x3A7B2C1D
Ring Position: 23.45%
Primary Node: node-07 (position: 24.01%)
Replicas: [node-23, node-41]
Distance to Primary: 0.56%
```

### Distribution Analysis

```
Command: ring-debug distribution

Output:
Node Distribution Analysis
==========================
Total Nodes: 50
Total VNodes: 7500
Total Keys: 12,345,678

Per-Node Statistics:
  Min Keys:  234,567 (node-33) - 95.0% of average
  Max Keys:  267,890 (node-05) - 108.5% of average
  Average:   246,913
  Std Dev:   7,891 (3.2%)

Distribution Quality: GOOD (CV < 5%)

VNode Gaps Analysis:
  Largest Gap: 0.23% (between node-12 and node-45)
  Average Gap: 0.013%
  Gap Variance: 0.0001%

Recommendations: None - distribution is healthy
```

### Ring Dump

```
Command: ring-debug dump --format=json

Output:
{
    "ring_version": 47,
    "last_updated": "2025-01-20T10:30:45Z",
    "positions": [
        {"position": "0x00012345", "node": "node-01", "vnode": 42},
        {"position": "0x00023456", "node": "node-33", "vnode": 17},
        ...
    ],
    "nodes": [
        {"id": "node-01", "address": "10.0.1.1:6379", "vnodes": 150, "zone": "us-east-1a"},
        ...
    ]
}
```
