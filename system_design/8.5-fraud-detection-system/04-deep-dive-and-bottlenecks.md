# Deep Dive & Bottlenecks

## 1. Feature Store Latency: The 100ms Budget Breakdown

The scoring latency budget is the tightest constraint in the system. Every millisecond matters because scoring sits on the payment critical path.

### Latency Budget Allocation

| Stage | Budget | What Happens |
|-------|--------|-------------|
| Network (payment service → scoring service) | 10ms | TCP round-trip, TLS handshake (amortized via connection pool) |
| Rules Engine (fast rules) | 5ms | Blocklist lookups, simple threshold checks |
| Feature Assembly | 30ms | Parallel fetch from RT + Batch feature stores |
| Model Inference | 30ms | Ensemble prediction (GBT + DNN + anomaly) |
| Decision Logic | 5ms | Score combination, threshold evaluation, response building |
| Headroom | 20ms | Network jitter, GC pauses, cache misses |
| **Total** | **100ms** | End-to-end p99 target |

### Feature Store Design Deep Dive

The feature store is the most latency-sensitive component. A cache miss that requires a database roundtrip (5-10ms) can cascade when multiplied across 5 entity lookups.

```
Architecture:
┌─────────────────────────────────────────────────┐
│ Feature Assembly Service                        │
│  ├── L1: In-Process Cache (10K hottest entities)│
│  │   └── Hit rate: ~30% | Latency: < 0.1ms     │
│  ├── L2: Distributed Cache Cluster              │
│  │   └── Hit rate: ~65% | Latency: 1-3ms       │
│  └── L3: Persistent Feature Store               │
│      └── Hit rate: ~5%  | Latency: 5-15ms      │
└─────────────────────────────────────────────────┘
```

**Key optimization**: Multi-get with parallel entity lookups. Instead of sequential `get(user_id)` → `get(device_id)` → `get(merchant_id)`, issue all lookups in a single batched multi-get. This reduces 3 sequential round-trips (9ms) to 1 parallel round-trip (3ms).

**Failure mode**: When the distributed cache cluster is degraded, L3 latency (5-15ms) per lookup can push total feature assembly over 50ms. Mitigation: serve stale features from L1 in-process cache with a configurable staleness threshold (default: 60 seconds). Stale features are better than no features.

---

## 2. Model Serving: Cold Starts and Tail Latency

### Inference Latency Deep Dive

| Model | Feature Count | Inference p50 | Inference p99 | Memory per Instance |
|-------|--------------|--------------|--------------|-------------------|
| GBT Ensemble (500 trees, depth 8) | 200 | 3ms | 8ms | ~200 MB |
| DNN (3 hidden layers, 256/128/64) | 200 | 5ms | 12ms | ~50 MB |
| Isolation Forest | 50 | 1ms | 3ms | ~30 MB |
| Ensemble Aggregation | 3 scores | < 1ms | < 1ms | Negligible |

### Cold Start Problem

When a new model version is deployed or a scoring pod scales up, the first inference request experiences:

1. **Model loading**: Reading model artifact from object storage (500ms - 2s)
2. **Model compilation**: JIT compilation of decision trees or neural network graph (200-500ms)
3. **Feature schema validation**: Verifying feature store schema compatibility (50ms)
4. **Warmup inference**: First prediction triggers lazy initialization (100-200ms)

**Total cold start**: 1-3 seconds — unacceptable for the first transactions hitting a new pod.

**Solution**: Pre-warming pipeline.

```
FUNCTION pre_warm_scoring_pod(pod):
    // Step 1: Pre-load all active model versions before accepting traffic
    FOR model IN active_model_versions:
        model_artifact = OBJECT_STORE.download(model.artifact_path)
        compiled_model = COMPILE(model_artifact)
        MODEL_CACHE.put(model.version, compiled_model)

    // Step 2: Run synthetic warmup predictions
    warmup_vectors = GENERATE_SYNTHETIC_FEATURE_VECTORS(count=100)
    FOR vector IN warmup_vectors:
        _ = predict_ensemble(vector)    // Triggers JIT, memory allocation

    // Step 3: Only then register pod as healthy in load balancer
    HEALTH_CHECK.set_ready(true)
```

### Tail Latency Sources

| Source | Impact | Mitigation |
|--------|--------|-----------|
| Garbage collection pauses | 10-50ms spikes | Use off-heap memory for model data; tune GC for low-latency |
| Feature cache miss (L2 → L3 fallback) | +5-10ms | Proactive cache warming on entity access patterns |
| Model version mismatch during canary | +2ms (routing overhead) | Sticky routing: same entity always hits same model version |
| CPU throttling under load | +20-40ms | Reserved CPU allocation; no overcommit on scoring pods |

---

## 3. Real-Time Feature Computation: Race Conditions and Ordering

### The Velocity Counter Race Condition

Velocity features (e.g., "transactions in last 5 minutes") use sliding window counters. A race condition occurs when two transactions from the same user arrive within milliseconds:

```
Timeline:
T=0ms:  Transaction A arrives, reads txn_count_5m = 4
T=1ms:  Transaction B arrives, reads txn_count_5m = 4
T=5ms:  Transaction A writes txn_count_5m = 5
T=6ms:  Transaction B writes txn_count_5m = 5  // Should be 6!
```

Both transactions see count=4 and increment to 5, missing one count. If the velocity rule triggers at count=5, Transaction B escapes detection.

**Solution**: Atomic increment operations in the feature store.

```
FUNCTION update_velocity_counter(user_id, window_key):
    // Use atomic increment — no read-modify-write race
    new_count = RT_STORE.atomic_increment("user:" + user_id + ":" + window_key)

    // The scoring service reads the POST-increment value
    // Both A and B see the correct count because increment is atomic
    RETURN new_count
```

**Subtlety**: The scoring request reads features BEFORE the current transaction updates them (because the transaction hasn't been processed yet). This means the velocity counter reflects state as of the previous transaction, not including the current one. This is correct and consistent, as long as it matches training data behavior.

### Event Ordering in Stream Processing

The stream processor computes features from transaction events. Out-of-order events can corrupt features:

```
Event stream reality:
  [txn_001 @ T=100] → [txn_003 @ T=300] → [txn_002 @ T=200]  // Out of order!

If processed naively:
  After txn_003: last_txn_timestamp = T=300
  After txn_002: last_txn_timestamp = T=200  // Rolled backward!
```

**Solution**: Watermark-based event-time processing with max-timestamp tracking.

```
FUNCTION process_transaction_event(event, current_state):
    // Only update if event is newer than current state
    IF event.timestamp > current_state.last_txn_timestamp:
        current_state.last_txn_timestamp = event.timestamp
        current_state.last_txn_amount = event.amount

    // Velocity counters use event time, not processing time
    window_key = FLOOR(event.timestamp / WINDOW_SIZE)
    current_state.window_counts[window_key] += 1

    // Expire old windows
    cutoff = event.timestamp - MAX_WINDOW_DURATION
    REMOVE_KEYS_BEFORE(current_state.window_counts, cutoff)
```

---

## 4. Graph Analysis Bottlenecks

### Graph Traversal Cost

Entity resolution graphs at scale (100M nodes, 1B edges) create significant query challenges:

| Query Type | Complexity | Typical Latency | Use Case |
|-----------|-----------|-----------------|----------|
| 1-hop neighbors | O(degree) | 1-5ms | Direct connections |
| 2-hop neighbors | O(degree²) | 10-100ms | Extended network |
| 3-hop neighbors | O(degree³) | 100ms-10s | Fraud ring boundary |
| Community detection | O(V + E) | Minutes-hours | Batch clustering |
| Shortest path | O(V + E) | 10-500ms | Relationship analysis |

**The "supernode" problem**: Some entities have extremely high degree. A shared IP address at a corporate VPN might connect 50,000 users. A 2-hop query from this node explodes to 50,000² = 2.5 billion potential paths.

**Solution**: Degree-capped traversal with early termination.

```
FUNCTION safe_graph_query(start_node, max_hops, max_neighbors_per_hop):
    visited = SET()
    current_frontier = {start_node}

    FOR hop IN 1..max_hops:
        next_frontier = SET()
        FOR node IN current_frontier:
            neighbors = GRAPH.get_neighbors(node)

            // Cap expansion at supernodes
            IF LEN(neighbors) > max_neighbors_per_hop:
                // Prioritize neighbors with highest risk scores
                neighbors = TOP_K(neighbors, BY risk_score, K=max_neighbors_per_hop)

            FOR neighbor IN neighbors:
                IF neighbor NOT IN visited:
                    visited.add(neighbor)
                    next_frontier.add(neighbor)

        current_frontier = next_frontier

        IF LEN(visited) > MAX_TOTAL_NODES:
            BREAK   // Safety valve

    RETURN visited
```

### Graph Staleness vs. Freshness Trade-off

Graph risk scores are batch-computed (hourly), but new fraud confirmations should propagate quickly.

**Hybrid approach**:
1. **Batch**: Full community detection and risk propagation runs hourly
2. **Near-real-time**: When an analyst confirms fraud, a targeted 2-hop risk update propagates within seconds

```
FUNCTION on_fraud_confirmation(confirmed_node):
    // Immediate: boost risk for direct neighbors
    FOR neighbor IN GRAPH.get_neighbors(confirmed_node, hops=2):
        edge_weight = EDGE_WEIGHT(confirmed_node, neighbor)
        risk_boost = BASE_BOOST * edge_weight * DECAY(hops)

        current_risk = BATCH_STORE.get("user:" + neighbor.user_id).graph_risk_score
        updated_risk = MIN(current_risk + risk_boost, 1.0)
        BATCH_STORE.put("user:" + neighbor.user_id, {graph_risk_score: updated_risk})

    // Queue full recomputation for next batch cycle
    QUEUE_PRIORITY_RECOMPUTE(confirmed_node.community_id)
```

---

## 5. Model Drift and Adversarial Adaptation

### Types of Drift

| Drift Type | Description | Detection Method | Response Time |
|-----------|-------------|------------------|---------------|
| **Data Drift** | Input feature distributions shift (e.g., average transaction size increases) | KL divergence on feature distributions | Days |
| **Concept Drift** | Relationship between features and fraud changes (e.g., new payment channel) | Model accuracy degradation on recent data | Weeks |
| **Adversarial Drift** | Fraudsters deliberately change tactics to evade detection | New fraud patterns not covered by existing features | Hours to days |
| **Label Drift** | Ground-truth labels arrive slower or with different bias | Chargeback rate deviation from predictions | Weeks |

### Adversarial Drift: The Core Challenge

Unlike natural data drift, adversarial drift is intentional. When the system blocks a fraud pattern, fraudsters observe the rejection and modify their approach:

```
Cycle:
1. Fraudsters use stolen cards with high-value purchases → Model catches "high amount anomaly"
2. Fraudsters shift to many small purchases → Model catches "high velocity"
3. Fraudsters slow down velocity, use multiple cards → Model catches "device reuse"
4. Fraudsters use device farms → Model catches "device age" pattern
5. Fraudsters pre-age devices with legitimate activity → ...
```

**Detection approach**: Monitor feature importance shifts over time. If a feature that was the #1 predictor drops to #10, fraudsters may have found a way to blend in on that dimension.

```
FUNCTION detect_adversarial_drift(model, current_week, previous_week):
    current_importance = SHAP_FEATURE_IMPORTANCE(model, current_week.data)
    previous_importance = SHAP_FEATURE_IMPORTANCE(model, previous_week.data)

    drift_score = 0
    FOR feature IN ALL_FEATURES:
        rank_change = ABS(current_importance.rank(feature) - previous_importance.rank(feature))
        IF rank_change > RANK_CHANGE_THRESHOLD:
            drift_score += rank_change * previous_importance.value(feature)
            ALERT("Feature importance shift: " + feature)

    IF drift_score > DRIFT_ALARM_THRESHOLD:
        TRIGGER_EMERGENCY_RETRAIN()
        TIGHTEN_RULES_TEMPORARILY()
```

---

## 6. False Positive Optimization

### The Cost Asymmetry

| Outcome | Description | Cost |
|---------|-------------|------|
| **True Positive** | Fraud caught | Saves fraud amount + chargeback fees |
| **True Negative** | Legitimate allowed | Zero cost (normal operation) |
| **False Positive** | Legitimate blocked | Lost transaction revenue + customer churn risk + support cost |
| **False Negative** | Fraud missed | Fraud amount + chargeback fees + regulatory risk |

A 1% false positive rate on 15M transactions/day = 150,000 legitimate transactions blocked daily. At an average transaction value of $80, that's $12M in blocked legitimate revenue per day.

### Segment-Specific Thresholds

One-size-fits-all thresholds are suboptimal. Different segments have different false positive tolerance:

```
FUNCTION get_dynamic_threshold(transaction, user_profile):
    base_block = 0.90
    base_review = 0.60

    // High-value transactions: lower threshold (more conservative)
    IF transaction.amount > 5000:
        base_block -= 0.10
        base_review -= 0.15

    // Trusted long-term customers: higher threshold (less friction)
    IF user_profile.account_age > 730 AND user_profile.chargeback_rate < 0.0005:
        base_block += 0.08
        base_review += 0.08

    // New accounts: lower threshold
    IF user_profile.account_age < 30:
        base_block -= 0.05
        base_review -= 0.10

    // High-risk merchant categories (gambling, crypto, adult)
    IF transaction.mcc IN HIGH_RISK_MCC:
        base_block -= 0.05

    RETURN {block: base_block, review: base_review}
```

### Step-Up Authentication as a Middle Ground

Instead of binary block/allow for gray-zone transactions (score between review and block thresholds), challenge the user:

| Challenge Type | Friction Level | Fraud Prevention | Use When |
|---------------|---------------|-----------------|----------|
| SMS OTP | Medium | High for account takeover | Score 0.6-0.75, known phone |
| Biometric (fingerprint/face) | Low | High for device-present fraud | Mobile app, score 0.5-0.65 |
| 3D Secure | Medium-High | High for card-not-present | Web payments, score 0.65-0.80 |
| Transaction PIN | Low | Medium | Low-value, score 0.5-0.6 |

---

## 7. Label Quality and Feedback Loop Integrity

### Label Sources and Their Properties

| Label Source | Latency | Accuracy | Volume | Bias |
|-------------|---------|----------|--------|------|
| **Chargebacks** | 30-90 days | High (ground truth) | Low (~0.1% of txns) | Only reported fraud |
| **Analyst Dispositions** | Hours-days | Medium (subjective) | Medium (~0.3% of txns) | Selection bias (only reviews flagged cases) |
| **Customer Reports** | Hours-weeks | Medium | Low | Friendly fraud contamination |
| **3D Secure Failures** | Immediate | Low-Medium | Medium | Not all failures are fraud |
| **Account Takeover Signals** | Minutes | High | Low | Only detected takeovers |

### Selection Bias Problem

The model only generates labels for transactions it flags for review. Transactions it allows pass through without label verification. This creates a feedback loop where the model only learns from the slice of data it already suspects:

```
Problem:
  Model flags Transaction A (score 0.7) → Analyst confirms fraud → Model learns
  Model allows Transaction B (score 0.2) → No review → If it was fraud, model never learns

Result: Model becomes increasingly confident in its existing patterns
        but blind to fraud patterns it has never flagged.
```

**Solution**: Random sampling for ground-truth verification.

```
FUNCTION should_sample_for_review(transaction, score):
    // Always review high-score transactions
    IF score >= REVIEW_THRESHOLD:
        RETURN true

    // Random sample 0.1% of allowed transactions for ground-truth verification
    IF RANDOM() < 0.001:
        RETURN true, label_as="random_sample"

    // Stratified sampling: higher rate for underrepresented segments
    IF transaction.channel IN UNDERSAMPLED_CHANNELS:
        IF RANDOM() < 0.005:
            RETURN true, label_as="stratified_sample"

    RETURN false
```

### Point-in-Time Feature Consistency

A critical correctness requirement for model training: the features used to train the model must match the features that were available at scoring time. If training uses features computed after the transaction, the model learns from "future information" that won't be available during inference.

```
WRONG: Train on features as of today for a transaction from 30 days ago
       (includes 30 days of future data in velocity counters)

RIGHT: Train on features as they existed at the exact moment of scoring
       (point-in-time join with feature store snapshots)
```

**Implementation**: The feature store maintains versioned snapshots keyed by timestamp. Training pipeline joins transactions with the feature snapshot closest to (but not after) the transaction timestamp.
