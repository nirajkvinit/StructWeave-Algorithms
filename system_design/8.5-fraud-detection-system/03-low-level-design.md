# Low-Level Design

## Data Models

### Transaction Event

```
TransactionEvent {
    transaction_id    : UUID (PK)           -- Idempotency key from payment service
    timestamp         : TIMESTAMP           -- Event time (ISO 8601)
    amount            : DECIMAL(15,2)       -- Transaction amount
    currency          : CHAR(3)             -- ISO 4217 currency code
    transaction_type  : ENUM                -- card_present, card_not_present, ach, wire, p2p

    -- Payer Info
    user_id           : UUID                -- Authenticated user
    card_id           : UUID (nullable)     -- Card instrument used
    account_id        : UUID                -- Source account

    -- Payee Info
    merchant_id       : UUID (nullable)     -- For merchant payments
    recipient_id      : UUID (nullable)     -- For P2P transfers
    mcc               : CHAR(4)             -- Merchant category code

    -- Context
    device_id         : VARCHAR(128)        -- Device fingerprint hash
    ip_address        : VARCHAR(45)         -- IPv4/IPv6
    geo_lat           : DECIMAL(9,6)        -- Geolocation latitude
    geo_lon           : DECIMAL(9,6)        -- Geolocation longitude
    session_id        : UUID                -- Browser/app session
    channel           : ENUM                -- web, mobile_app, api, pos

    -- Metadata
    billing_country   : CHAR(2)             -- ISO 3166-1
    shipping_country  : CHAR(2) (nullable)  -- For e-commerce
    is_recurring      : BOOLEAN             -- Subscription payment
    risk_metadata     : JSONB               -- Extensible context fields
}
```

### Scoring Result

```
ScoringResult {
    scoring_id         : UUID (PK)
    transaction_id     : UUID (FK → TransactionEvent)
    timestamp          : TIMESTAMP

    -- Scores
    ml_score           : FLOAT              -- 0.0 to 1.0 (ML model output)
    rule_score         : FLOAT              -- 0.0 to 1.0 (normalized rule score)
    combined_score     : FLOAT              -- Weighted combination

    -- Decision
    decision           : ENUM               -- allow, block, review, challenge
    decision_reason    : VARCHAR(256)       -- Human-readable reason

    -- Model Info
    model_version      : VARCHAR(64)        -- Model ensemble version
    model_scores       : JSONB              -- Per-model breakdown {gbt: 0.7, dnn: 0.85, anomaly: 0.4}

    -- Explainability
    top_features       : JSONB              -- Top-5 contributing features with SHAP values
    rules_triggered    : JSONB              -- List of rule IDs that fired

    -- Performance
    latency_ms         : INT                -- Total scoring latency
    feature_fetch_ms   : INT                -- Feature assembly time
    model_inference_ms : INT                -- Model prediction time

    INDEX idx_txn_id ON (transaction_id)
    INDEX idx_decision ON (decision, timestamp)
    INDEX idx_score ON (combined_score, timestamp)
}
```

### Feature Store Schema

```
-- Real-Time Features (in-memory data grid, keyed by entity)

UserRealTimeFeatures {
    user_id                    : UUID (PK)
    txn_count_1m               : INT         -- Transactions in last 1 minute
    txn_count_5m               : INT         -- Transactions in last 5 minutes
    txn_count_1h               : INT         -- Transactions in last 1 hour
    txn_amount_sum_1h          : DECIMAL     -- Total amount in last 1 hour
    txn_amount_sum_24h         : DECIMAL     -- Total amount in last 24 hours
    distinct_merchants_1h      : INT         -- Unique merchants in last 1 hour
    distinct_devices_24h       : INT         -- Unique devices in last 24 hours
    distinct_countries_24h     : INT         -- Unique billing countries in 24 hours
    last_txn_timestamp         : TIMESTAMP   -- Time of most recent transaction
    last_txn_amount            : DECIMAL     -- Amount of most recent transaction
    session_txn_count          : INT         -- Transactions in current session
    current_device_id          : VARCHAR     -- Current device fingerprint
    device_age_seconds         : INT         -- Time since first seen on this device
    updated_at                 : TIMESTAMP   -- Feature freshness marker
}

DeviceRealTimeFeatures {
    device_id                  : VARCHAR (PK)
    distinct_users_1h          : INT         -- Unique users from this device in 1 hour
    distinct_users_24h         : INT         -- Unique users from this device in 24 hours
    distinct_cards_1h          : INT         -- Unique cards from this device in 1 hour
    txn_count_1h               : INT
    txn_amount_sum_1h          : DECIMAL
    first_seen_timestamp       : TIMESTAMP   -- When device was first observed
    is_known_emulator          : BOOLEAN     -- Device identified as emulator/VM
    fingerprint_consistency    : FLOAT       -- 0.0-1.0 consistency with historical fingerprints
}

-- Batch Features (key-value store, updated hourly/daily)

UserBatchFeatures {
    user_id                    : UUID (PK)
    account_age_days           : INT
    total_txn_count_30d        : INT
    total_txn_amount_30d       : DECIMAL
    avg_txn_amount_30d         : DECIMAL
    stddev_txn_amount_30d      : DECIMAL
    chargeback_count_90d       : INT
    chargeback_rate_90d        : FLOAT
    distinct_merchants_30d     : INT
    preferred_mcc_codes        : ARRAY[CHAR(4)]  -- Top-5 merchant categories
    typical_txn_hour_mean      : FLOAT           -- Mean transaction hour (0-23)
    typical_txn_hour_stddev    : FLOAT
    typical_geo_centroid_lat   : DECIMAL
    typical_geo_centroid_lon   : DECIMAL
    typical_geo_radius_km      : FLOAT           -- 95th percentile distance from centroid
    kyc_verification_level     : INT             -- 1=basic, 2=standard, 3=full
    graph_risk_score           : FLOAT           -- From graph engine analysis
    fraud_ring_membership      : BOOLEAN         -- Connected to known fraud cluster
    risk_segment               : ENUM            -- low, medium, high, very_high
}

MerchantBatchFeatures {
    merchant_id                : UUID (PK)
    merchant_age_days          : INT
    mcc                        : CHAR(4)
    avg_txn_amount_30d         : DECIMAL
    chargeback_rate_90d        : FLOAT
    fraud_rate_90d             : FLOAT
    total_txn_volume_30d       : INT
    risk_tier                  : ENUM            -- low, medium, high
    industry_fraud_baseline    : FLOAT           -- Average fraud rate for this MCC
}
```

### Case Management

```
FraudCase {
    case_id            : UUID (PK)
    transaction_id     : UUID (FK)
    created_at         : TIMESTAMP
    updated_at         : TIMESTAMP

    -- Assignment
    status             : ENUM               -- open, assigned, investigating, resolved, escalated
    priority           : ENUM               -- critical, high, medium, low
    assigned_analyst   : UUID (nullable)
    assigned_at        : TIMESTAMP (nullable)

    -- Scoring Context
    combined_score     : FLOAT
    ml_score           : FLOAT
    rules_triggered    : JSONB
    top_features       : JSONB

    -- Enrichment
    user_profile       : JSONB              -- Historical risk profile snapshot
    graph_context      : JSONB              -- Related entities, fraud ring info
    device_intelligence: JSONB              -- Device details, emulator detection
    transaction_history: JSONB              -- Recent transactions from same user/device

    -- Resolution
    disposition        : ENUM (nullable)    -- confirmed_fraud, false_positive, suspicious, escalated
    disposition_reason : TEXT (nullable)
    disposition_at     : TIMESTAMP (nullable)

    -- Regulatory
    sar_required       : BOOLEAN DEFAULT false
    sar_filing_id      : UUID (nullable)

    INDEX idx_status_priority ON (status, priority)
    INDEX idx_analyst ON (assigned_analyst, status)
    INDEX idx_created ON (created_at)
}

SARFiling {
    filing_id          : UUID (PK)
    case_ids           : ARRAY[UUID]        -- Linked cases
    filing_type        : ENUM               -- sar, str, ctr
    status             : ENUM               -- draft, review, submitted, acknowledged

    -- Content
    narrative          : TEXT               -- Auto-generated, analyst-reviewed
    subject_info       : JSONB              -- Subject identification details
    suspicious_activity: JSONB              -- Activity description
    amount_involved    : DECIMAL
    date_range         : DATERANGE

    -- Filing Metadata
    created_at         : TIMESTAMP
    submitted_at       : TIMESTAMP (nullable)
    regulatory_deadline: DATE
    filed_by           : UUID               -- Compliance officer

    INDEX idx_status ON (status)
    INDEX idx_deadline ON (regulatory_deadline)
}
```

### Rule Definition

```
FraudRule {
    rule_id            : UUID (PK)
    rule_name          : VARCHAR(128)
    version            : INT
    is_active          : BOOLEAN

    -- Evaluation
    priority           : INT                -- Lower = evaluated first
    stage              : ENUM               -- pre_ml (fast rules), post_ml (ML-informed)
    condition          : JSONB              -- Rule condition DSL (see below)
    action             : ENUM               -- block, review, add_score, tag, challenge
    score_adjustment   : FLOAT (nullable)   -- Score delta when action is add_score

    -- Metadata
    category           : ENUM               -- blocklist, velocity, geo, amount, device, behavioral
    description        : TEXT
    created_by         : UUID
    created_at         : TIMESTAMP
    expires_at         : TIMESTAMP (nullable)

    -- Performance Tracking
    total_evaluations  : BIGINT
    total_triggers     : BIGINT
    false_positive_rate: FLOAT
}
```

---

## API Design

### Scoring API

```
POST /v1/transactions/score
Authorization: Bearer <service-token>
Idempotency-Key: <transaction_id>

Request:
{
    "transaction_id": "txn_abc123",
    "timestamp": "2026-03-09T14:32:00Z",
    "amount": 1250.00,
    "currency": "USD",
    "transaction_type": "card_not_present",
    "user_id": "usr_xyz789",
    "card_id": "card_def456",
    "merchant_id": "mch_ghi012",
    "mcc": "5411",
    "device": {
        "device_id": "dev_fingerprint_hash",
        "ip_address": "203.0.113.42",
        "user_agent": "Mozilla/5.0...",
        "screen_resolution": "1920x1080",
        "timezone_offset": -300
    },
    "geo": {
        "latitude": 37.7749,
        "longitude": -122.4194
    },
    "channel": "web",
    "metadata": {
        "is_recurring": false,
        "billing_country": "US",
        "shipping_country": "US"
    }
}

Response (< 100ms):
{
    "scoring_id": "scr_mno345",
    "decision": "review",
    "score": 0.78,
    "reasons": [
        {"feature": "geo_distance_from_typical", "impact": 0.25, "description": "Transaction 2,400 km from usual location"},
        {"feature": "device_age_seconds", "impact": 0.18, "description": "First transaction from this device"},
        {"feature": "amount_zscore_30d", "impact": 0.12, "description": "Amount is 3.2 standard deviations above 30-day average"}
    ],
    "rules_triggered": ["R042_new_device_high_amount", "R108_geo_anomaly"],
    "model_version": "ensemble_v23",
    "latency_ms": 67
}
```

### Rule Management API

```
POST /v1/rules
GET  /v1/rules
GET  /v1/rules/{rule_id}
PUT  /v1/rules/{rule_id}
DELETE /v1/rules/{rule_id}

POST /v1/rules (Create Rule):
{
    "rule_name": "high_velocity_new_device",
    "stage": "pre_ml",
    "priority": 50,
    "condition": {
        "and": [
            {"field": "rt.device_age_seconds", "op": "<", "value": 300},
            {"field": "rt.txn_count_5m", "op": ">", "value": 3},
            {"field": "txn.amount", "op": ">", "value": 500}
        ]
    },
    "action": "review",
    "category": "velocity",
    "description": "Flag high-velocity transactions from devices seen less than 5 minutes ago"
}
```

### Case Management API

```
GET  /v1/cases?status=open&priority=high&limit=50
GET  /v1/cases/{case_id}
POST /v1/cases/{case_id}/assign
POST /v1/cases/{case_id}/disposition

POST /v1/cases/{case_id}/disposition:
{
    "disposition": "confirmed_fraud",
    "reason": "Account takeover — device fingerprint mismatch, geo-anomaly, rapid high-value purchases",
    "sar_required": true,
    "actions": ["block_user", "block_device", "reverse_transaction"]
}

Response:
{
    "case_id": "case_pqr678",
    "status": "resolved",
    "disposition": "confirmed_fraud",
    "feedback_published": true,
    "sar_filing_initiated": true,
    "sar_filing_id": "sar_stu901"
}
```

### Model Management API

```
POST /v1/models/deploy
GET  /v1/models/active
GET  /v1/models/{model_id}/metrics
POST /v1/models/{model_id}/rollback

POST /v1/models/deploy:
{
    "model_id": "gbt_v24",
    "model_type": "gradient_boosted_trees",
    "artifact_path": "models/gbt_v24/model.bin",
    "feature_schema_version": "v12",
    "deployment_strategy": "canary",
    "canary_percentage": 5,
    "promotion_criteria": {
        "min_duration_hours": 24,
        "max_false_positive_increase": 0.5,
        "min_auc_roc": 0.98
    }
}
```

---

## Core Algorithms

### Feature Vector Assembly

```
FUNCTION assemble_feature_vector(transaction):
    // Parallel fetch from feature stores
    PARALLEL:
        rt_user    = RT_STORE.get("user:" + transaction.user_id)
        rt_device  = RT_STORE.get("device:" + transaction.device_id)
        batch_user = BATCH_STORE.get("user:" + transaction.user_id)
        batch_merch = BATCH_STORE.get("merchant:" + transaction.merchant_id)

    features = {}

    // Transaction-level features (computed inline)
    features.amount_log = LOG(transaction.amount + 1)
    features.is_round_amount = (transaction.amount % 100 == 0) ? 1 : 0
    features.hour_of_day = HOUR(transaction.timestamp)
    features.day_of_week = DAYOFWEEK(transaction.timestamp)
    features.is_weekend = features.day_of_week IN (6, 7) ? 1 : 0

    // Real-time velocity features
    features.txn_count_1m = rt_user.txn_count_1m ?? 0
    features.txn_count_5m = rt_user.txn_count_5m ?? 0
    features.txn_count_1h = rt_user.txn_count_1h ?? 0
    features.amount_sum_1h = rt_user.txn_amount_sum_1h ?? 0
    features.distinct_merchants_1h = rt_user.distinct_merchants_1h ?? 0
    features.time_since_last_txn = NOW() - rt_user.last_txn_timestamp ?? MAX_INT

    // Device features
    features.device_age_seconds = rt_device.first_seen_timestamp
        ? (NOW() - rt_device.first_seen_timestamp) : 0
    features.device_distinct_users_1h = rt_device.distinct_users_1h ?? 0
    features.device_distinct_cards_1h = rt_device.distinct_cards_1h ?? 0
    features.is_emulator = rt_device.is_known_emulator ?? false
    features.fingerprint_consistency = rt_device.fingerprint_consistency ?? 0.0

    // Behavioral anomaly features (derived)
    IF batch_user EXISTS:
        features.amount_zscore = (transaction.amount - batch_user.avg_txn_amount_30d)
            / MAX(batch_user.stddev_txn_amount_30d, 0.01)
        features.hour_deviation = ABS(features.hour_of_day - batch_user.typical_txn_hour_mean)
            / MAX(batch_user.typical_txn_hour_stddev, 0.01)
        features.geo_distance_km = HAVERSINE(
            transaction.geo_lat, transaction.geo_lon,
            batch_user.typical_geo_centroid_lat, batch_user.typical_geo_centroid_lon
        )
        features.geo_anomaly = features.geo_distance_km / MAX(batch_user.typical_geo_radius_km, 1.0)
        features.account_age_days = batch_user.account_age_days
        features.chargeback_rate_90d = batch_user.chargeback_rate_90d
        features.graph_risk_score = batch_user.graph_risk_score ?? 0.0
        features.fraud_ring_member = batch_user.fraud_ring_membership ? 1 : 0
    ELSE:
        // New user — apply conservative defaults
        features = APPLY_NEW_USER_DEFAULTS(features)

    // Merchant features
    features.merchant_fraud_rate = batch_merch.fraud_rate_90d ?? INDUSTRY_DEFAULT(transaction.mcc)
    features.merchant_risk_tier = ENCODE_ORDINAL(batch_merch.risk_tier ?? "medium")

    // Fill missing with trained defaults
    features = FILL_MISSING(features, MODEL_FEATURE_DEFAULTS)

    RETURN features
```

### Ensemble Scoring

```
FUNCTION score_transaction(feature_vector, model_config):
    scores = {}
    explanations = {}

    // Run each model in the ensemble
    FOR model IN model_config.active_models:
        scores[model.name] = model.predict(feature_vector)
        explanations[model.name] = model.explain(feature_vector)  // SHAP values

    // Weighted ensemble aggregation
    combined_score = 0.0
    FOR model_name, weight IN model_config.weights:
        combined_score += scores[model_name] * weight

    // Merge explanations — take top features by absolute SHAP impact
    merged_explanations = MERGE_AND_RANK_EXPLANATIONS(explanations, top_k=5)

    RETURN {
        combined_score: combined_score,
        per_model_scores: scores,
        explanations: merged_explanations
    }
```

### Decision Logic

```
FUNCTION make_decision(rule_result, ml_result, thresholds, transaction):
    // Hard block from rules (blocklists, sanctions)
    IF rule_result.hard_block:
        RETURN {decision: "block", reason: rule_result.block_reason}

    // Combine scores
    final_score = COMBINE(rule_result.score, ml_result.combined_score)

    // Dynamic thresholds based on transaction context
    block_threshold = thresholds.block_base
    review_threshold = thresholds.review_base

    // Adjust thresholds by transaction amount (higher amount = lower threshold)
    IF transaction.amount > thresholds.high_value_cutoff:
        block_threshold -= 0.10
        review_threshold -= 0.15

    // Adjust by merchant risk tier
    IF merchant_risk_tier == "high":
        block_threshold -= 0.05
        review_threshold -= 0.10

    // Adjust by user trust (long-tenured users get benefit of doubt)
    IF user_account_age > 365 AND user_chargeback_rate < 0.001:
        block_threshold += 0.05
        review_threshold += 0.05

    // Make decision
    IF final_score >= block_threshold:
        RETURN {decision: "block", reason: TOP_REASON(ml_result, rule_result)}
    ELSE IF final_score >= review_threshold:
        RETURN {decision: "review", reason: TOP_REASON(ml_result, rule_result)}
    ELSE IF NEEDS_STEP_UP(final_score, transaction):
        RETURN {decision: "challenge", reason: "Step-up authentication recommended"}
    ELSE:
        RETURN {decision: "allow", reason: null}
```

### Rule Engine Evaluation

```
FUNCTION evaluate_rules(transaction, features, active_rules):
    triggered = []
    hard_block = false
    cumulative_score = 0.0

    // Rules sorted by priority (lower = first)
    sorted_rules = SORT(active_rules, BY priority ASC)

    FOR rule IN sorted_rules:
        // Skip if rule stage doesn't match current phase
        IF rule.stage == "post_ml" AND NOT ml_scores_available:
            CONTINUE

        match = EVALUATE_CONDITION(rule.condition, transaction, features)

        IF match:
            triggered.append({
                rule_id: rule.rule_id,
                rule_name: rule.rule_name,
                action: rule.action,
                category: rule.category
            })

            IF rule.action == "block":
                hard_block = true
                BREAK   // No need to evaluate further
            ELSE IF rule.action == "add_score":
                cumulative_score += rule.score_adjustment
            ELSE IF rule.action == "review":
                cumulative_score += 0.3   // Default review bump

    RETURN {
        hard_block: hard_block,
        score: MIN(cumulative_score, 1.0),
        triggered: triggered,
        evaluation_count: LEN(sorted_rules)
    }

FUNCTION EVALUATE_CONDITION(condition, transaction, features):
    // Recursive condition evaluator supporting AND, OR, NOT, and leaf predicates
    IF condition.has("and"):
        RETURN ALL(EVALUATE_CONDITION(c, transaction, features) FOR c IN condition.and)
    ELSE IF condition.has("or"):
        RETURN ANY(EVALUATE_CONDITION(c, transaction, features) FOR c IN condition.or)
    ELSE IF condition.has("not"):
        RETURN NOT EVALUATE_CONDITION(condition.not, transaction, features)
    ELSE:
        // Leaf predicate: {field, op, value}
        actual = RESOLVE_FIELD(condition.field, transaction, features)
        RETURN COMPARE(actual, condition.op, condition.value)
```

### Graph Risk Score Computation (Batch)

```
FUNCTION compute_graph_risk_scores(graph):
    // Step 1: Entity Resolution — merge nodes sharing identifiers
    resolved_graph = ENTITY_RESOLUTION(graph)

    // Step 2: Community Detection — find clusters
    communities = LOUVAIN_COMMUNITY_DETECTION(resolved_graph)

    // Step 3: Label Propagation — spread known fraud labels
    fraud_nodes = SELECT nodes WHERE disposition == "confirmed_fraud"

    FOR iteration IN 1..MAX_ITERATIONS:
        FOR node IN resolved_graph.nodes:
            IF node IN fraud_nodes:
                node.risk_score = 1.0
                CONTINUE

            // Risk from neighbors, decayed by distance
            neighbor_risk = 0.0
            neighbor_count = 0
            FOR neighbor IN node.neighbors():
                edge_weight = EDGE_WEIGHT(node, neighbor)  // Based on relationship type
                neighbor_risk += neighbor.risk_score * DECAY_FACTOR * edge_weight
                neighbor_count += 1

            IF neighbor_count > 0:
                node.risk_score = SIGMOID(neighbor_risk / neighbor_count)

    // Step 4: Flag fraud ring communities
    FOR community IN communities:
        fraud_ratio = COUNT(n IN community WHERE n.disposition == "confirmed_fraud") / LEN(community)
        IF fraud_ratio > RING_THRESHOLD:
            FOR node IN community:
                node.fraud_ring_membership = true
                node.risk_score = MAX(node.risk_score, RING_BASELINE_RISK)

    // Step 5: Write scores to Batch Feature Store
    FOR node IN resolved_graph.nodes:
        BATCH_STORE.put("user:" + node.user_id, {
            graph_risk_score: node.risk_score,
            fraud_ring_membership: node.fraud_ring_membership
        })
```

---

## Rule Condition DSL

The rules engine uses a JSON-based Domain Specific Language for conditions:

| Operator | Description | Example |
|----------|-------------|---------|
| `>`, `<`, `>=`, `<=` | Numeric comparison | `{"field": "txn.amount", "op": ">", "value": 5000}` |
| `==`, `!=` | Equality | `{"field": "txn.channel", "op": "==", "value": "web"}` |
| `in`, `not_in` | Set membership | `{"field": "txn.mcc", "op": "in", "value": ["7995", "5967"]}` |
| `between` | Range (inclusive) | `{"field": "rt.txn_count_1h", "op": "between", "value": [5, 20]}` |
| `regex` | Pattern match | `{"field": "txn.email", "op": "regex", "value": ".*@tempmail\\..*"}` |
| `and`, `or`, `not` | Logical combinators | `{"and": [cond1, cond2]}` |

Field prefixes: `txn.` = transaction fields, `rt.` = real-time features, `batch.` = batch features, `ml.` = ML model outputs.
