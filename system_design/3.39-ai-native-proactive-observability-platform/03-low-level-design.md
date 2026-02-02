[← Back to Index](./00-index.md)

# Low-Level Design

## Data Models

### 1. Event Model (Wide Event)

The core data model is a **wide event** - a single record with arbitrary dimensions rather than pre-aggregated metrics.

```json
{
  "timestamp": "2026-01-15T10:30:00.123456789Z",
  "trace_id": "abc123def456789",
  "span_id": "span_001",
  "parent_span_id": null,
  "span_kind": "SERVER",

  "resource": {
    "service.name": "checkout-service",
    "service.version": "2.3.1",
    "service.instance.id": "checkout-7b8f9c-abc12",
    "deployment.environment": "production",
    "host.name": "node-42",
    "k8s.pod.name": "checkout-7b8f9c-abc12",
    "k8s.namespace.name": "production",
    "cloud.provider": "aws",
    "cloud.region": "us-west-2",
    "cloud.availability_zone": "us-west-2a"
  },

  "attributes": {
    "http.method": "POST",
    "http.url": "/api/v1/checkout",
    "http.status_code": 200,
    "http.response_content_length": 1234,
    "user.id": "user_42",
    "user.tier": "premium",
    "session.id": "sess_789",
    "cart.item_count": 5,
    "cart.total_usd": 149.99,
    "payment.method": "credit_card",
    "payment.provider": "stripe",
    "feature_flags": ["new_checkout_flow", "dark_mode"],
    "build.commit_sha": "a1b2c3d4",
    "experiment.variant": "treatment_a"
  },

  "metrics": {
    "duration_ms": 245.67,
    "db_query_count": 3,
    "cache_hit_ratio": 0.85,
    "queue_depth": 12
  },

  "events": [
    {
      "name": "cache_lookup",
      "timestamp": "2026-01-15T10:30:00.100Z",
      "attributes": {"cache": "redis", "hit": true}
    },
    {
      "name": "db_query",
      "timestamp": "2026-01-15T10:30:00.150Z",
      "attributes": {"query": "SELECT * FROM orders", "duration_ms": 45}
    }
  ],

  "status": {
    "code": "OK",
    "message": null
  }
}
```

### 2. Anomaly Model

```json
{
  "anomaly_id": "anom_20260115_001",
  "detected_at": "2026-01-15T10:35:00Z",
  "severity": "high",
  "confidence": 0.92,

  "signal": {
    "type": "latency_spike",
    "metric": "p99_duration_ms",
    "service": "checkout-service",
    "endpoint": "/api/v1/checkout",
    "baseline_value": 200,
    "observed_value": 2100,
    "deviation_factor": 10.5
  },

  "detection_method": "isolation_forest",
  "baseline_window": "7d",

  "impact": {
    "affected_users_estimate": 15000,
    "error_rate_increase": 0.05,
    "revenue_impact_usd_estimate": 25000
  },

  "correlations": [
    {
      "dimension": "payment.provider",
      "value": "stripe",
      "correlation_strength": 0.87,
      "explanation": "87% of slow requests use Stripe payment"
    },
    {
      "dimension": "deployment.version",
      "value": "2.3.1",
      "correlation_strength": 0.95,
      "explanation": "Anomaly started with deployment v2.3.1"
    }
  ],

  "investigation_id": "inv_20260115_001",
  "status": "investigating"
}
```

### 3. Investigation Model

```json
{
  "investigation_id": "inv_20260115_001",
  "anomaly_id": "anom_20260115_001",
  "created_at": "2026-01-15T10:35:05Z",
  "completed_at": "2026-01-15T10:37:30Z",
  "duration_seconds": 145,

  "root_cause": {
    "type": "deployment",
    "confidence": 0.93,
    "summary": "Deployment v2.3.1 introduced Stripe SDK v3 with connection pooling bug",
    "evidence": [
      "Anomaly start time matches deployment time (10:28 AM)",
      "87% correlation with payment.provider=stripe",
      "Stripe SDK v3 connection exhaustion in logs",
      "No infrastructure changes detected"
    ]
  },

  "dependency_trace": [
    {
      "service": "checkout-service",
      "status": "degraded",
      "metrics": {"p99_latency_ms": 2100, "error_rate": 0.05}
    },
    {
      "service": "payment-service",
      "status": "healthy",
      "metrics": {"p99_latency_ms": 150, "error_rate": 0.001}
    },
    {
      "service": "stripe-api",
      "status": "external",
      "metrics": {"p99_latency_ms": 1800, "timeout_rate": 0.03}
    }
  ],

  "bubbleup_analysis": {
    "top_dimensions": [
      {"dimension": "payment.provider", "value": "stripe", "lift": 8.7},
      {"dimension": "deployment.version", "value": "2.3.1", "lift": 9.5},
      {"dimension": "user.tier", "value": "premium", "lift": 2.1}
    ],
    "excluded_dimensions": [
      {"dimension": "cloud.region", "reason": "uniform distribution"},
      {"dimension": "http.method", "reason": "uniform distribution"}
    ]
  },

  "sample_traces": [
    "trace_abc123",
    "trace_def456",
    "trace_ghi789"
  ],

  "proposed_actions": [
    {
      "action_id": "action_001",
      "type": "rollback",
      "target": "checkout-service",
      "from_version": "2.3.1",
      "to_version": "2.3.0",
      "risk_level": "medium",
      "estimated_resolution_time_minutes": 5
    }
  ]
}
```

### 4. Remediation Action Model

```json
{
  "action_id": "action_001",
  "investigation_id": "inv_20260115_001",
  "created_at": "2026-01-15T10:37:30Z",

  "action_type": "rollback",
  "target": {
    "resource_type": "deployment",
    "namespace": "production",
    "name": "checkout-service",
    "cluster": "prod-us-west-2"
  },

  "parameters": {
    "from_version": "2.3.1",
    "to_version": "2.3.0",
    "strategy": "rolling",
    "max_unavailable": "25%"
  },

  "risk_assessment": {
    "level": "medium",
    "factors": [
      "Service handles 5000 RPS",
      "Rolling deployment minimizes downtime",
      "Previous version known stable"
    ],
    "blast_radius": {
      "affected_services": ["checkout-service"],
      "affected_users_during_rollout": 1250
    }
  },

  "approval": {
    "required_approvers": 1,
    "approver_roles": ["team_lead", "sre"],
    "timeout_minutes": 30,
    "escalation_policy": "escalate_to_manager"
  },

  "status": "pending_approval",
  "approval_history": [],

  "execution": null
}
```

### 5. Approval Model

```json
{
  "approval_id": "approval_001",
  "action_id": "action_001",
  "created_at": "2026-01-15T10:37:35Z",

  "request": {
    "channel": "slack",
    "channel_id": "C123ABC",
    "message_ts": "1705315055.123456",
    "message_text": "🚨 Approval Required: Rollback checkout-service from v2.3.1 to v2.3.0"
  },

  "decision": {
    "status": "approved",
    "decided_by": "alice@company.com",
    "decided_at": "2026-01-15T10:40:12Z",
    "decision_method": "slack_button",
    "modifications": null,
    "reason": "Confirmed high customer impact, rollback approved"
  },

  "execution": {
    "started_at": "2026-01-15T10:40:15Z",
    "completed_at": "2026-01-15T10:42:30Z",
    "status": "success",
    "logs_url": "https://observability.company.com/executions/exec_001"
  },

  "feedback": {
    "resolution_confirmed": true,
    "post_action_metrics": {
      "p99_latency_ms": 210,
      "error_rate": 0.001
    },
    "engineer_rating": "helpful",
    "comments": "Fast and accurate detection"
  }
}
```

---

## Database Schemas

### ClickHouse: Events Table

```sql
CREATE TABLE events
(
    -- Timestamp and identifiers
    timestamp DateTime64(9, 'UTC'),
    trace_id FixedString(32),
    span_id FixedString(16),
    parent_span_id Nullable(FixedString(16)),
    span_kind LowCardinality(String),

    -- Resource attributes (low cardinality)
    service_name LowCardinality(String),
    service_version LowCardinality(String),
    deployment_environment LowCardinality(String),
    host_name LowCardinality(String),
    cloud_region LowCardinality(String),

    -- Span attributes (high cardinality - stored as maps)
    attributes_string Map(LowCardinality(String), String),
    attributes_int Map(LowCardinality(String), Int64),
    attributes_float Map(LowCardinality(String), Float64),
    attributes_bool Map(LowCardinality(String), UInt8),

    -- Metrics
    duration_ns UInt64,
    status_code LowCardinality(String),

    -- Correlation
    correlation_id Nullable(String),

    -- Nested events within span
    events Nested(
        name LowCardinality(String),
        timestamp DateTime64(9, 'UTC'),
        attributes Map(LowCardinality(String), String)
    ),

    -- Materialized columns for common queries
    http_method LowCardinality(String) MATERIALIZED attributes_string['http.method'],
    http_status_code UInt16 MATERIALIZED toUInt16OrZero(attributes_string['http.status_code']),
    user_id String MATERIALIZED attributes_string['user.id'],

    -- Indexes
    INDEX idx_trace_id trace_id TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_user_id user_id TYPE bloom_filter(0.01) GRANULARITY 4,
    INDEX idx_http_status http_status_code TYPE set(0) GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (service_name, toStartOfHour(timestamp), trace_id)
TTL toDateTime(timestamp) + INTERVAL 7 DAY TO DISK 'warm',
    toDateTime(timestamp) + INTERVAL 90 DAY TO DISK 'cold'
SETTINGS index_granularity = 8192,
         min_bytes_for_wide_part = 10485760;
```

### ClickHouse: Anomalies Table

```sql
CREATE TABLE anomalies
(
    anomaly_id String,
    detected_at DateTime64(3, 'UTC'),
    severity LowCardinality(String),
    confidence Float32,

    -- Signal information
    signal_type LowCardinality(String),
    signal_metric String,
    signal_service LowCardinality(String),
    signal_endpoint String,
    baseline_value Float64,
    observed_value Float64,
    deviation_factor Float32,

    detection_method LowCardinality(String),

    -- Impact assessment
    affected_users_estimate UInt64,
    error_rate_increase Float32,
    revenue_impact_estimate Float64,

    -- Correlations stored as JSON
    correlations String, -- JSON array

    investigation_id Nullable(String),
    status LowCardinality(String),

    INDEX idx_service signal_service TYPE set(100) GRANULARITY 1,
    INDEX idx_severity severity TYPE set(10) GRANULARITY 1
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(detected_at)
ORDER BY (detected_at, anomaly_id)
TTL toDateTime(detected_at) + INTERVAL 1 YEAR;
```

### ClickHouse: Investigations Table

```sql
CREATE TABLE investigations
(
    investigation_id String,
    anomaly_id String,
    created_at DateTime64(3, 'UTC'),
    completed_at Nullable(DateTime64(3, 'UTC')),
    duration_seconds Nullable(UInt32),

    -- Root cause
    root_cause_type LowCardinality(String),
    root_cause_confidence Float32,
    root_cause_summary String,
    root_cause_evidence Array(String),

    -- Dependency trace (JSON)
    dependency_trace String,

    -- BubbleUp analysis (JSON)
    bubbleup_analysis String,

    -- Sample traces
    sample_trace_ids Array(FixedString(32)),

    -- Proposed actions (JSON array)
    proposed_actions String,

    status LowCardinality(String),

    INDEX idx_anomaly anomaly_id TYPE bloom_filter GRANULARITY 1
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, investigation_id);
```

### PostgreSQL: Actions & Approvals (Transactional)

```sql
-- Remediation actions require strong consistency
CREATE TABLE remediation_actions (
    action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    action_type VARCHAR(50) NOT NULL,
    target_resource JSONB NOT NULL,
    parameters JSONB NOT NULL,

    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('info', 'low', 'medium', 'high', 'critical')),
    risk_assessment JSONB NOT NULL,

    required_approvers INT NOT NULL DEFAULT 1,
    approver_roles VARCHAR(50)[] NOT NULL,
    timeout_minutes INT NOT NULL DEFAULT 30,

    status VARCHAR(20) NOT NULL DEFAULT 'pending_approval'
        CHECK (status IN ('pending_approval', 'approved', 'rejected', 'executing', 'completed', 'failed', 'cancelled', 'timeout')),

    created_by VARCHAR(255),

    CONSTRAINT fk_investigation FOREIGN KEY (investigation_id)
        REFERENCES investigations(investigation_id)
);

CREATE INDEX idx_actions_status ON remediation_actions(status);
CREATE INDEX idx_actions_created ON remediation_actions(created_at);

-- Approval decisions
CREATE TABLE approvals (
    approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES remediation_actions(action_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Request details
    notification_channel VARCHAR(50) NOT NULL,
    notification_id VARCHAR(255),

    -- Decision
    decision VARCHAR(20) CHECK (decision IN ('approved', 'rejected', 'timeout')),
    decided_by VARCHAR(255),
    decided_at TIMESTAMPTZ,
    decision_method VARCHAR(50),
    modifications JSONB,
    reason TEXT,

    CONSTRAINT unique_action_approval UNIQUE (action_id)
);

-- Execution logs
CREATE TABLE action_executions (
    execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES remediation_actions(action_id),
    approval_id UUID REFERENCES approvals(approval_id),

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    status VARCHAR(20) NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'success', 'failed', 'rolled_back')),

    execution_log JSONB,
    error_message TEXT,

    -- Post-execution metrics
    post_execution_metrics JSONB,
    resolution_confirmed BOOLEAN
);

-- Audit trail
CREATE TABLE audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor VARCHAR(255) NOT NULL, -- 'system', 'ai_agent', or user email
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
```

### VictoriaMetrics: Metrics Schema

Metrics use OpenTelemetry/Prometheus naming conventions:

```
# Counter: Total requests
service_requests_total{service="checkout", method="POST", status="200"} 1234567

# Histogram: Request duration
service_request_duration_seconds_bucket{service="checkout", le="0.1"} 50000
service_request_duration_seconds_bucket{service="checkout", le="0.5"} 95000
service_request_duration_seconds_bucket{service="checkout", le="1.0"} 99000
service_request_duration_seconds_sum{service="checkout"} 45678.9
service_request_duration_seconds_count{service="checkout"} 100000

# Gauge: Current connections
service_active_connections{service="checkout", instance="pod-1"} 42

# Summary: Percentiles (pre-calculated)
service_request_duration_seconds{service="checkout", quantile="0.5"} 0.045
service_request_duration_seconds{service="checkout", quantile="0.95"} 0.234
service_request_duration_seconds{service="checkout", quantile="0.99"} 0.567
```

---

## API Specifications

### GraphQL Query API

```graphql
type Query {
  # Event queries
  events(
    filter: EventFilter!
    timeRange: TimeRange!
    limit: Int = 100
    offset: Int = 0
  ): EventConnection!

  # Trace queries
  trace(traceId: ID!): Trace
  traces(
    filter: TraceFilter!
    timeRange: TimeRange!
    limit: Int = 50
  ): TraceConnection!

  # Anomaly queries
  anomalies(
    filter: AnomalyFilter
    timeRange: TimeRange!
    limit: Int = 50
  ): AnomalyConnection!

  anomaly(anomalyId: ID!): Anomaly

  # Investigation queries
  investigation(investigationId: ID!): Investigation
  investigations(
    status: InvestigationStatus
    timeRange: TimeRange!
  ): InvestigationConnection!

  # BubbleUp analysis
  bubbleUp(
    baselineFilter: EventFilter!
    comparisonFilter: EventFilter!
    timeRange: TimeRange!
    dimensions: [String!]
  ): BubbleUpResult!

  # Natural language query
  naturalLanguageQuery(query: String!): NLQueryResult!

  # Metrics
  metrics(
    query: String! # PromQL
    timeRange: TimeRange!
    step: Duration!
  ): MetricsResult!

  # Service topology
  serviceTopology(timeRange: TimeRange!): ServiceGraph!
}

type Mutation {
  # Action approval
  approveAction(
    actionId: ID!
    modifications: ActionModifications
    reason: String
  ): ApprovalResult!

  rejectAction(
    actionId: ID!
    reason: String!
  ): ApprovalResult!

  # Manual investigation trigger
  triggerInvestigation(
    anomalyId: ID
    service: String
    timeRange: TimeRange
  ): Investigation!

  # Feedback
  submitFeedback(
    investigationId: ID!
    rating: FeedbackRating!
    comments: String
  ): FeedbackResult!
}

type Subscription {
  # Real-time anomaly alerts
  anomalyDetected(
    services: [String!]
    severities: [Severity!]
  ): Anomaly!

  # Investigation updates
  investigationUpdated(investigationId: ID!): Investigation!

  # Action status changes
  actionStatusChanged(actionId: ID): RemediationAction!
}

# Input types
input EventFilter {
  services: [String!]
  operations: [String!]
  statusCodes: [Int!]
  minDuration: Duration
  maxDuration: Duration
  traceId: ID
  attributes: [AttributeFilter!]
}

input AttributeFilter {
  key: String!
  operator: FilterOperator!
  value: String!
}

enum FilterOperator {
  EQUALS
  NOT_EQUALS
  CONTAINS
  STARTS_WITH
  GREATER_THAN
  LESS_THAN
  IN
  NOT_IN
  EXISTS
}

input TimeRange {
  start: DateTime!
  end: DateTime!
}

# Output types
type Event {
  timestamp: DateTime!
  traceId: ID!
  spanId: ID!
  parentSpanId: ID
  service: String!
  operation: String!
  duration: Duration!
  statusCode: Int
  attributes: JSON!
  events: [SpanEvent!]!
}

type Anomaly {
  id: ID!
  detectedAt: DateTime!
  severity: Severity!
  confidence: Float!
  signal: AnomalySignal!
  impact: ImpactAssessment!
  correlations: [Correlation!]!
  investigation: Investigation
  status: AnomalyStatus!
}

type Investigation {
  id: ID!
  anomaly: Anomaly!
  createdAt: DateTime!
  completedAt: DateTime
  duration: Duration
  rootCause: RootCause
  dependencyTrace: [ServiceStatus!]!
  bubbleUpAnalysis: BubbleUpResult
  sampleTraces: [Trace!]!
  proposedActions: [RemediationAction!]!
  status: InvestigationStatus!
}

type BubbleUpResult {
  topDimensions: [DimensionLift!]!
  excludedDimensions: [ExcludedDimension!]!
  baselineCount: Int!
  comparisonCount: Int!
}

type DimensionLift {
  dimension: String!
  value: String!
  lift: Float!
  baselinePercentage: Float!
  comparisonPercentage: Float!
}
```

### REST API for Integrations

```yaml
openapi: 3.0.3
info:
  title: AI-Native Observability Platform API
  version: 1.0.0

paths:
  /api/v1/ingest/otlp:
    post:
      summary: Ingest OTLP telemetry
      requestBody:
        content:
          application/x-protobuf:
            schema:
              type: string
              format: binary
      responses:
        '200':
          description: Telemetry accepted
        '429':
          description: Rate limited

  /api/v1/actions/{actionId}/approve:
    post:
      summary: Approve a remediation action
      parameters:
        - name: actionId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                reason:
                  type: string
                modifications:
                  type: object
      responses:
        '200':
          description: Action approved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApprovalResult'

  /api/v1/actions/{actionId}/reject:
    post:
      summary: Reject a remediation action
      parameters:
        - name: actionId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required:
                - reason
              properties:
                reason:
                  type: string
      responses:
        '200':
          description: Action rejected

  /api/v1/webhooks/slack/interactive:
    post:
      summary: Handle Slack interactive messages (approval buttons)
      requestBody:
        content:
          application/x-www-form-urlencoded:
            schema:
              type: object
              properties:
                payload:
                  type: string
      responses:
        '200':
          description: Interaction handled

components:
  schemas:
    ApprovalResult:
      type: object
      properties:
        actionId:
          type: string
        status:
          type: string
          enum: [approved, rejected, executing, completed, failed]
        executionId:
          type: string
        message:
          type: string
```

---

## Core Algorithms

### 1. Anomaly Detection: Isolation Forest + Baseline

```python
class AnomalyDetector:
    """
    Hybrid anomaly detection combining:
    1. Statistical baselines (Prophet for time series)
    2. Isolation Forest for multivariate anomalies
    3. Rule-based detectors for known patterns
    """

    def __init__(self, config: AnomalyConfig):
        self.baseline_window = config.baseline_window  # e.g., 7 days
        self.sensitivity = config.sensitivity  # 0.0-1.0
        self.min_data_points = config.min_data_points

    def detect(self, metric_stream: MetricStream) -> List[Anomaly]:
        anomalies = []

        # 1. Statistical baseline check
        baseline = self.get_baseline(metric_stream.service, metric_stream.metric)
        if baseline:
            for point in metric_stream.points:
                deviation = self.calculate_deviation(point, baseline)
                if deviation > self.get_threshold(baseline):
                    anomalies.append(Anomaly(
                        type="baseline_deviation",
                        confidence=self.deviation_to_confidence(deviation),
                        signal=point
                    ))

        # 2. Isolation Forest for multivariate
        if len(metric_stream.dimensions) > 1:
            forest_anomalies = self.isolation_forest_detect(metric_stream)
            anomalies.extend(forest_anomalies)

        # 3. Rule-based patterns
        rule_anomalies = self.apply_rules(metric_stream)
        anomalies.extend(rule_anomalies)

        # Deduplicate and merge
        return self.merge_anomalies(anomalies)

    def get_baseline(self, service: str, metric: str) -> Baseline:
        """
        Retrieve learned baseline for service/metric combination.
        Uses Prophet for time series forecasting with seasonality.
        """
        key = f"{service}:{metric}"
        if key not in self.baselines:
            historical_data = self.storage.query_historical(
                service=service,
                metric=metric,
                window=self.baseline_window
            )
            if len(historical_data) < self.min_data_points:
                return None

            # Train Prophet model
            model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=True,
                daily_seasonality=True
            )
            model.fit(historical_data)
            self.baselines[key] = Baseline(model=model, last_updated=now())

        return self.baselines[key]

    def calculate_deviation(self, point: DataPoint, baseline: Baseline) -> float:
        """
        Calculate normalized deviation from baseline.
        Returns number of standard deviations from expected value.
        """
        forecast = baseline.model.predict(point.timestamp)
        expected = forecast['yhat']
        std = forecast['yhat_std']

        if std == 0:
            return 0 if point.value == expected else float('inf')

        return abs(point.value - expected) / std

    def isolation_forest_detect(self, stream: MetricStream) -> List[Anomaly]:
        """
        Use Isolation Forest for detecting anomalies in high-dimensional data.
        Effective for finding outliers without assuming distribution.
        """
        # Convert to feature matrix
        features = self.extract_features(stream)

        # Fit or use pre-trained model
        model = IsolationForest(
            contamination=0.01,  # Expected 1% anomaly rate
            random_state=42
        )

        # -1 for anomalies, 1 for normal
        predictions = model.fit_predict(features)
        scores = model.score_samples(features)

        anomalies = []
        for i, (pred, score) in enumerate(zip(predictions, scores)):
            if pred == -1:
                anomalies.append(Anomaly(
                    type="multivariate_outlier",
                    confidence=self.score_to_confidence(score),
                    signal=stream.points[i],
                    detection_method="isolation_forest"
                ))

        return anomalies
```

### 2. BubbleUp Analysis

```python
class BubbleUpAnalyzer:
    """
    Identifies dimensions that explain the difference between
    a baseline population and a comparison population (e.g., slow requests).

    Inspired by Honeycomb's BubbleUp feature.
    """

    def analyze(
        self,
        baseline_filter: EventFilter,
        comparison_filter: EventFilter,
        time_range: TimeRange,
        dimensions: List[str] = None
    ) -> BubbleUpResult:
        # Query both populations
        baseline_events = self.storage.query_events(baseline_filter, time_range)
        comparison_events = self.storage.query_events(comparison_filter, time_range)

        if not dimensions:
            dimensions = self.discover_dimensions(baseline_events, comparison_events)

        results = []
        for dim in dimensions:
            lift = self.calculate_lift(dim, baseline_events, comparison_events)
            if lift.is_significant:
                results.append(lift)

        # Sort by absolute lift value
        results.sort(key=lambda x: abs(x.lift), reverse=True)

        return BubbleUpResult(
            top_dimensions=results[:10],
            excluded_dimensions=self.get_excluded(dimensions, results),
            baseline_count=len(baseline_events),
            comparison_count=len(comparison_events)
        )

    def calculate_lift(
        self,
        dimension: str,
        baseline: List[Event],
        comparison: List[Event]
    ) -> DimensionLift:
        """
        Calculate lift: how much more likely a dimension value appears
        in the comparison vs baseline population.

        Lift = (comparison_pct / baseline_pct)
        Lift > 1 means over-represented in comparison
        Lift < 1 means under-represented in comparison
        """
        baseline_dist = self.get_distribution(dimension, baseline)
        comparison_dist = self.get_distribution(dimension, comparison)

        lifts = []
        for value in set(baseline_dist.keys()) | set(comparison_dist.keys()):
            baseline_pct = baseline_dist.get(value, 0)
            comparison_pct = comparison_dist.get(value, 0)

            if baseline_pct > 0.001:  # Avoid division by very small numbers
                lift = comparison_pct / baseline_pct
            elif comparison_pct > 0.01:
                lift = float('inf')  # New in comparison
            else:
                continue

            # Statistical significance test (chi-squared)
            is_significant = self.chi_squared_test(
                baseline_pct, comparison_pct,
                len(baseline), len(comparison)
            )

            if is_significant and abs(lift - 1.0) > 0.5:  # >50% change
                lifts.append(DimensionLift(
                    dimension=dimension,
                    value=value,
                    lift=lift,
                    baseline_percentage=baseline_pct,
                    comparison_percentage=comparison_pct,
                    is_significant=True
                ))

        # Return the most significant lift for this dimension
        if lifts:
            return max(lifts, key=lambda x: abs(x.lift - 1.0))
        return DimensionLift(dimension=dimension, is_significant=False)

    def get_distribution(self, dimension: str, events: List[Event]) -> Dict[str, float]:
        """Calculate percentage distribution of dimension values."""
        counts = defaultdict(int)
        total = 0

        for event in events:
            value = event.attributes.get(dimension, "__null__")
            counts[value] += 1
            total += 1

        return {k: v / total for k, v in counts.items()} if total > 0 else {}
```

### 3. Root Cause Analysis

```python
class RootCauseAnalyzer:
    """
    Orchestrates investigation by combining multiple analysis techniques:
    1. Temporal correlation (what changed around anomaly time)
    2. Dependency tracing (which upstream/downstream services involved)
    3. BubbleUp (which dimensions explain the anomaly)
    4. Log correlation (error messages)
    """

    async def investigate(self, anomaly: Anomaly) -> Investigation:
        investigation = Investigation(
            anomaly_id=anomaly.id,
            status="investigating"
        )

        # Run analyses in parallel
        results = await asyncio.gather(
            self.temporal_analysis(anomaly),
            self.dependency_analysis(anomaly),
            self.bubbleup_analysis(anomaly),
            self.log_correlation(anomaly),
            self.deployment_correlation(anomaly)
        )

        temporal, dependency, bubbleup, logs, deployments = results

        # Synthesize root cause
        root_cause = self.synthesize_root_cause(
            temporal, dependency, bubbleup, logs, deployments
        )

        investigation.root_cause = root_cause
        investigation.dependency_trace = dependency
        investigation.bubbleup_analysis = bubbleup
        investigation.sample_traces = await self.get_sample_traces(anomaly)
        investigation.proposed_actions = self.propose_actions(root_cause)
        investigation.status = "completed"

        return investigation

    def synthesize_root_cause(self, *analyses) -> RootCause:
        """
        Combine evidence from multiple analyses to determine most likely root cause.
        Uses weighted scoring based on correlation strength.
        """
        candidates = []

        # Check for deployment correlation
        temporal, dependency, bubbleup, logs, deployments = analyses

        if deployments.correlation_score > 0.8:
            candidates.append(RootCauseCandidate(
                type="deployment",
                confidence=deployments.correlation_score,
                summary=f"Deployment {deployments.version} at {deployments.time}",
                evidence=[
                    f"Anomaly started within 5 minutes of deployment",
                    f"Version {deployments.version} is the first affected version"
                ]
            ))

        # Check for infrastructure issues
        if dependency.has_unhealthy_dependency:
            candidates.append(RootCauseCandidate(
                type="dependency_failure",
                confidence=dependency.confidence,
                summary=f"Upstream service {dependency.unhealthy_service} degraded",
                evidence=dependency.evidence
            ))

        # Check for code/config issue based on BubbleUp
        if bubbleup.top_dimensions:
            top_dim = bubbleup.top_dimensions[0]
            if top_dim.lift > 5:  # Strong correlation
                candidates.append(RootCauseCandidate(
                    type="code_path",
                    confidence=min(0.9, top_dim.lift / 10),
                    summary=f"Issue isolated to {top_dim.dimension}={top_dim.value}",
                    evidence=[
                        f"{top_dim.lift:.1f}x more likely in affected requests",
                        f"Baseline: {top_dim.baseline_percentage:.1%}, Affected: {top_dim.comparison_percentage:.1%}"
                    ]
                ))

        # Return highest confidence candidate
        if candidates:
            return max(candidates, key=lambda c: c.confidence).to_root_cause()

        return RootCause(
            type="unknown",
            confidence=0.3,
            summary="Unable to determine root cause with high confidence",
            evidence=["Manual investigation recommended"]
        )

    def propose_actions(self, root_cause: RootCause) -> List[RemediationAction]:
        """Generate remediation actions based on root cause type."""
        actions = []

        if root_cause.type == "deployment":
            actions.append(RemediationAction(
                type="rollback",
                target=root_cause.affected_service,
                parameters={
                    "from_version": root_cause.version,
                    "to_version": root_cause.previous_version
                },
                risk_level="medium"
            ))

        elif root_cause.type == "dependency_failure":
            actions.append(RemediationAction(
                type="circuit_breaker",
                target=root_cause.affected_service,
                parameters={
                    "dependency": root_cause.unhealthy_dependency,
                    "fallback": "cached_response"
                },
                risk_level="low"
            ))

        elif root_cause.type == "capacity":
            actions.append(RemediationAction(
                type="scale_up",
                target=root_cause.affected_service,
                parameters={
                    "current_replicas": root_cause.current_replicas,
                    "target_replicas": root_cause.current_replicas * 2
                },
                risk_level="low"
            ))

        # Always add informational action
        actions.append(RemediationAction(
            type="create_ticket",
            target="jira",
            parameters={
                "summary": f"Investigate: {root_cause.summary}",
                "priority": self.severity_to_priority(root_cause.severity)
            },
            risk_level="info"
        ))

        return actions
```

### 4. Adaptive Sampling

```python
class AdaptiveSampler:
    """
    Intelligent sampling that keeps:
    - 100% of errors and slow requests
    - 100% of traces with specific attributes (e.g., important users)
    - Sampled percentage of normal traffic (adaptive based on volume)
    """

    def __init__(self, config: SamplingConfig):
        self.base_rate = config.base_rate  # e.g., 0.01 (1%)
        self.error_rate = 1.0  # Keep all errors
        self.slow_threshold_ms = config.slow_threshold_ms
        self.important_attributes = config.important_attributes
        self.target_events_per_second = config.target_eps

    def should_sample(self, event: Event) -> Tuple[bool, str]:
        """
        Determine if event should be sampled.
        Returns (should_keep, reason).
        """
        # Always keep errors
        if event.status_code >= 400 or event.has_error:
            return True, "error"

        # Always keep slow requests
        if event.duration_ms > self.slow_threshold_ms:
            return True, "slow"

        # Keep requests with important attributes
        for attr, values in self.important_attributes.items():
            if event.attributes.get(attr) in values:
                return True, f"important_{attr}"

        # Adaptive sampling based on current throughput
        current_rate = self.calculate_adaptive_rate(event.service)
        if random.random() < current_rate:
            return True, "sampled"

        return False, "dropped"

    def calculate_adaptive_rate(self, service: str) -> float:
        """
        Adjust sampling rate based on current throughput to maintain
        target events per second while ensuring minimum representation.
        """
        current_eps = self.get_current_eps(service)

        if current_eps == 0:
            return self.base_rate

        # Target: target_events_per_second from this service
        desired_rate = self.target_events_per_second / current_eps

        # Clamp between min and max
        return max(0.001, min(1.0, desired_rate))

    def get_sampling_decision_head(self, trace_id: str) -> bool:
        """
        Head-based sampling: decide at trace start, propagate decision.
        Uses consistent hashing for deterministic decisions.
        """
        hash_value = hash(trace_id) % 10000
        threshold = int(self.base_rate * 10000)
        return hash_value < threshold
```

---

## State Machines

### Investigation State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                   INVESTIGATION STATE MACHINE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                        ┌──────────┐                             │
│                        │ CREATED  │                             │
│                        └────┬─────┘                             │
│                             │ start_investigation()             │
│                             ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    INVESTIGATING                           │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │ Temporal │  │ Dependency│  │ BubbleUp │  │   Logs   │  │ │
│  │  │ Analysis │  │  Tracing  │  │ Analysis │  │ Correlate│  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                             │                                   │
│              ┌──────────────┼──────────────┐                   │
│              │              │              │                    │
│              ▼              ▼              ▼                    │
│       ┌──────────┐   ┌──────────┐   ┌──────────┐              │
│       │ COMPLETED│   │  STALLED │   │  FAILED  │              │
│       │ (w/ root │   │ (needs   │   │ (error)  │              │
│       │  cause)  │   │  human)  │   │          │              │
│       └────┬─────┘   └────┬─────┘   └──────────┘              │
│            │              │                                    │
│            │              │ human_input()                      │
│            │              │                                    │
│            ▼              ▼                                    │
│       ┌──────────────────────┐                                │
│       │   ACTIONS_PROPOSED   │                                │
│       └──────────┬───────────┘                                │
│                  │                                             │
│                  ▼                                             │
│       ┌──────────────────────┐                                │
│       │       CLOSED         │                                │
│       │ (actions approved or │                                │
│       │  investigation aged) │                                │
│       └──────────────────────┘                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Remediation Action State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                 REMEDIATION ACTION STATE MACHINE                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     ┌──────────────────┐                       │
│                     │ PENDING_APPROVAL │                       │
│                     └────────┬─────────┘                       │
│                              │                                  │
│              ┌───────────────┼───────────────┐                 │
│              │               │               │                  │
│         approve()       reject()        timeout()              │
│              │               │               │                  │
│              ▼               ▼               ▼                  │
│       ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│       │ APPROVED │    │ REJECTED │    │ TIMEOUT  │            │
│       └────┬─────┘    └──────────┘    └────┬─────┘            │
│            │                               │                   │
│            │ execute()                     │ escalate()        │
│            ▼                               ▼                   │
│       ┌──────────┐                  ┌──────────────────┐      │
│       │EXECUTING │                  │ ESCALATED        │      │
│       └────┬─────┘                  │ (to next approver)│      │
│            │                        └──────────────────┘      │
│     ┌──────┴──────┐                                           │
│     │             │                                            │
│  success()     failure()                                       │
│     │             │                                            │
│     ▼             ▼                                            │
│ ┌──────────┐ ┌──────────┐                                     │
│ │COMPLETED │ │  FAILED  │──────┐                              │
│ └──────────┘ └──────────┘      │ retry()                      │
│                                │                               │
│                                ▼                               │
│                         ┌──────────────────┐                  │
│                         │ PENDING_APPROVAL │                  │
│                         │ (with retry flag)│                  │
│                         └──────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
