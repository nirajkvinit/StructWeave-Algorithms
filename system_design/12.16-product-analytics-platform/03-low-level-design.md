# 12.16 Product Analytics Platform — Low-Level Design

## Data Models

### 1. Core Event Record

The immutable event record is the fundamental unit of storage. All analytical computations derive from these records.

```
Table: events
Partitioned by: (project_id, event_date)
Sorted by: (project_id, event_date, user_id, server_received_at)
Stored as: Parquet with Zstd compression, row groups of 128MB

Columns:
  -- Envelope (typed, never null)
  event_id          STRING        -- UUID v4, globally unique, used for dedup
  project_id        STRING        -- Tenant identifier
  event_name        STRING        -- e.g. "page_viewed", "checkout_started"
  user_id           STRING        -- Stable user identifier (post-identify)
  anonymous_id      STRING        -- Pre-identify device/session identifier
  session_id        STRING        -- Session grouping key (30-min idle timeout)
  client_timestamp  TIMESTAMP     -- Client-reported event time (UTC)
  server_received_at TIMESTAMP    -- Server-assigned ingestion time (UTC)
  event_date        DATE          -- Partition key derived from client_timestamp
  sdk_version       STRING        -- SDK version for compatibility tracking
  platform          STRING        -- "web" | "ios" | "android" | "server"
  ip_address        STRING        -- Pseudonymized: last octet zeroed for GDPR
  country           STRING        -- Derived from IP via MaxMind GeoIP
  device_type       STRING        -- "desktop" | "mobile" | "tablet"
  os_name           STRING        -- e.g. "macOS", "Android"
  browser_name      STRING        -- e.g. "Chrome" (null for server-side)
  app_version       STRING        -- Mobile app version or server release

  -- Dynamic Properties (schema-on-read)
  properties        MAP<STRING,STRING>  -- Serialized as packed dict-encoded columns
                                        -- Common properties promoted to native columns
                                        -- during warm-store compaction

  -- System Metadata
  ingest_partition  INT           -- Queue partition that received this event
  governance_flags  ARRAY<STRING> -- Schema violations, PII detections
  replay_session_id STRING        -- Link to session replay recording (nullable)
```

**Storage optimizations:**
- `event_name` dictionary-encoded globally per project (typically <10K distinct values)
- `user_id` and `anonymous_id` dictionary-encoded per partition
- `properties` map stored as two parallel arrays (keys array, values array) with key dictionary shared across all rows in a row group
- Row groups sorted by `user_id` within partition to enable efficient per-user scans

---

### 2. User Properties (SCD Type 2)

User properties change over time (plan upgrades, name changes). Point-in-time correctness requires storing the full history.

```
Table: user_properties
Partitioned by: (project_id)
Sorted by: (project_id, user_id, valid_from)

Columns:
  project_id        STRING
  user_id           STRING
  property_key      STRING        -- e.g. "plan", "country", "email"
  property_value    STRING        -- Always stored as string; cast at query time
  valid_from        TIMESTAMP     -- When this value became effective
  valid_to          TIMESTAMP     -- NULL means currently active
  is_current        BOOLEAN       -- Shortcut for valid_to IS NULL
  set_by_event_id   STRING        -- Which identify() call set this value
```

**Point-in-time query pattern:**
```
FUNCTION lookup_user_property(user_id, property_key, as_of_timestamp):
  RETURN SELECT property_value
         FROM user_properties
         WHERE user_id = user_id
           AND property_key = property_key
           AND valid_from <= as_of_timestamp
           AND (valid_to IS NULL OR valid_to > as_of_timestamp)
         ORDER BY valid_from DESC
         LIMIT 1
```

---

### 3. Funnel Definition

```
Table: funnel_definitions
Stored in: OLTP metadata store (row-oriented)

Columns:
  funnel_id         UUID          -- PK
  project_id        STRING        -- FK → project
  name              STRING        -- Human-readable name
  created_by        STRING        -- User ID of creator
  created_at        TIMESTAMP
  steps             JSONB         -- Array of step definitions (ordered)
  conversion_window INTERVAL      -- Max time from step 1 to final step
  counting_method   STRING        -- "unique_users" | "unique_sessions" | "event_totals"
  global_filters    JSONB         -- Filters applied to all steps (e.g. platform=web)
  is_archived       BOOLEAN

Step definition (within steps JSONB array):
  {
    "step_index": 0,             -- 0-based ordering
    "event_name": "signup_clicked",
    "filters": [                 -- Property filters for this step
      {"property": "button_color", "operator": "eq", "value": "blue"}
    ],
    "is_exclusion_step": false,  -- If true: users who hit this step are EXCLUDED
    "label": "Clicked Sign Up"
  }
```

---

### 4. Cohort Definition

```
Table: cohort_definitions
Stored in: OLTP metadata store

Columns:
  cohort_id         UUID
  project_id        STRING
  name              STRING
  cohort_type       STRING        -- "behavioral" | "property" | "computed"
  definition        JSONB         -- Cohort criteria
  evaluation_mode   STRING        -- "dynamic" (recomputed per query) | "static" (snapshotted)
  snapshot_user_ids BINARY        -- Roaring bitmap of user IDs (for static cohorts)
  snapshot_at       TIMESTAMP     -- When static snapshot was taken
  size_estimate     BIGINT        -- HyperLogLog estimate of cohort size

Behavioral cohort definition example:
  {
    "type": "behavioral",
    "criteria": [
      {
        "event_name": "purchase_completed",
        "operator": "performed",      -- "performed" | "not_performed"
        "time_window": "last_30_days",
        "count_operator": ">=",
        "count_value": 2
      }
    ],
    "logical_operator": "AND"
  }
```

---

### 5. Retention Configuration

```
Table: retention_configs
Stored in: OLTP metadata store

Columns:
  config_id         UUID
  project_id        STRING
  name              STRING
  retention_type    STRING        -- "n_day" | "unbounded" | "bracket"
  cohort_event      STRING        -- Event that defines day 0 for a user
  return_event      STRING        -- Event that counts as a "return" (null = any event)
  cohort_granularity STRING       -- "daily" | "weekly" | "monthly"
  return_granularity STRING       -- "daily" | "weekly"
  max_periods       INT           -- How many periods to compute (e.g. 12 weeks)
  cohort_filter     JSONB         -- Optional filter on cohort event properties
  return_filter     JSONB         -- Optional filter on return event properties
  brackets          JSONB         -- For type="bracket": [{min:1,max:7},{min:8,max:30}]
```

---

## API Design

### Ingestion API

```
POST /v1/events
Content-Type: application/json
Authorization: Bearer {write_api_key}

Body:
{
  "batch": [
    {
      "event_id": "uuid-v4",          // Required for dedup
      "event_name": "page_viewed",
      "user_id": "user_123",          // Post-identify; nullable
      "anonymous_id": "anon_456",     // Always required; persists across identify()
      "timestamp": "2025-06-15T14:23:00Z",
      "properties": {
        "page_path": "/pricing",
        "referrer": "google.com",
        "plan": "free"
      },
      "context": {
        "sdk_version": "3.4.1",
        "platform": "web",
        "page": { "url": "https://example.com/pricing" },
        "user_agent": "Mozilla/5.0 ...",
        "ip": "203.0.113.42"
      }
    }
  ]
}

Response 202 Accepted:
{
  "received": 1,
  "deduplicated": 0,
  "errors": []
}

Response 400 Bad Request:
{
  "received": 0,
  "errors": [{"event_id": "uuid", "code": "MISSING_ANONYMOUS_ID", "message": "..."}]
}
```

### Funnel Query API

```
POST /v1/projects/{project_id}/queries/funnel
Authorization: Bearer {read_api_key}

Body:
{
  "funnel_id": "uuid",                // Use saved funnel definition
  // OR inline definition:
  "steps": [
    {"event_name": "signup_clicked", "filters": []},
    {"event_name": "signup_form_submitted", "filters": []},
    {"event_name": "email_verified", "filters": []}
  ],
  "conversion_window": "P7D",         // ISO 8601 duration
  "date_range": {
    "start": "2025-05-01",
    "end": "2025-05-31"
  },
  "breakdown": ["platform", "plan"],  // Property-based breakdown dimensions
  "cohort_id": "uuid",                // Optional: restrict to cohort
  "counting_method": "unique_users"
}

Response 200 OK:
{
  "query_id": "qry_abc123",
  "computed_at": "2025-06-15T14:23:10Z",
  "data_freshness": "2025-06-15T14:22:05Z",
  "steps": [
    {
      "step_index": 0,
      "event_name": "signup_clicked",
      "label": "Clicked Sign Up",
      "total_users": 45320,
      "breakdown": [
        {"values": {"platform": "web", "plan": "free"}, "users": 31200, "conversion_rate": 1.0},
        {"values": {"platform": "mobile", "plan": "free"}, "users": 14120, "conversion_rate": 1.0}
      ]
    },
    {
      "step_index": 1,
      "event_name": "signup_form_submitted",
      "total_users": 18934,
      "step_conversion_rate": 0.418,
      "overall_conversion_rate": 0.418,
      "median_time_to_convert_seconds": 47,
      "breakdown": [...]
    }
  ]
}
```

### Retention Query API

```
POST /v1/projects/{project_id}/queries/retention
Body:
{
  "cohort_event": "account_created",
  "return_event": null,               // null = any event
  "retention_type": "n_day",
  "cohort_granularity": "weekly",
  "return_granularity": "weekly",
  "max_periods": 12,
  "date_range": {"start": "2025-01-01", "end": "2025-06-01"},
  "breakdown": "plan"
}

Response:
{
  "matrix": [
    {
      "cohort_period": "2025-W01",
      "cohort_size": 1240,
      "retention": [1.0, 0.62, 0.44, 0.38, 0.35, 0.33, 0.32, ...]
      // Index 0 = week 0 (always 100%), Index N = week N retention
    }
  ]
}
```

---

## Core Algorithms (Pseudocode)

### Algorithm 1: Funnel Step Matching with Time Window

```
FUNCTION compute_funnel(project_id, steps, conversion_window, date_range, breakdown):

  // Phase 1: Build step bitmaps
  step_bitmaps = []
  step_user_timestamps = []    // user_id → earliest qualifying timestamp per step

  FOR step_index, step IN steps:
    user_timestamps = MAP()    // user_id → earliest timestamp for this step

    FOR event IN scan_events(project_id, date_range,
                              event_name=step.event_name,
                              filters=step.filters):
      IF event.user_id NOT IN user_timestamps:
        user_timestamps[event.user_id] = event.timestamp
      ELSE:
        user_timestamps[event.user_id] = MIN(user_timestamps[event.user_id],
                                             event.timestamp)

    step_user_timestamps.APPEND(user_timestamps)
    bitmap = build_bitmap(user_timestamps.KEYS())
    step_bitmaps.APPEND(bitmap)

  // Phase 2: Enforce ordering and time window constraints
  qualified_users = step_bitmaps[0].COPY()    // All users who hit step 0

  FOR step_index FROM 1 TO LEN(steps)-1:
    prev_timestamps = step_user_timestamps[step_index - 1]
    curr_timestamps = step_user_timestamps[step_index]

    // A user qualifies for step N if they hit step N-1 first AND
    // step N within conversion_window of step N-1
    new_qualified = EMPTY_BITMAP()
    FOR user_id IN qualified_users:
      IF user_id IN curr_timestamps:
        time_diff = curr_timestamps[user_id] - prev_timestamps[user_id]
        IF time_diff >= 0 AND time_diff <= conversion_window:
          new_qualified.ADD(user_id)

    qualified_users = new_qualified
    step_bitmaps[step_index] = qualified_users.COPY()

  // Phase 3: Compute breakdown if requested
  IF breakdown:
    RETURN compute_breakdown(step_bitmaps, step_user_timestamps, breakdown, project_id)
  ELSE:
    RETURN [{"step": i, "users": bm.CARDINALITY()} FOR i, bm IN step_bitmaps]
```

### Algorithm 2: N-Day Retention Computation

```
FUNCTION compute_retention_matrix(project_id, cohort_event, return_event,
                                   cohort_granularity, max_periods, date_range):

  matrix = []

  // Identify cohort groups (e.g. weekly cohorts)
  cohort_periods = generate_periods(date_range, cohort_granularity)

  FOR cohort_period IN cohort_periods:
    // Step 1: Find users whose first occurrence of cohort_event falls in this period
    cohort_users = MAP()  // user_id → cohort_event timestamp (first occurrence)

    FOR event IN scan_events(project_id, cohort_period,
                              event_name=cohort_event):
      IF event.user_id NOT IN cohort_users:
        cohort_users[event.user_id] = event.timestamp

    cohort_bitmap = build_bitmap(cohort_users.KEYS())
    cohort_size = cohort_bitmap.CARDINALITY()

    // Step 2: For each subsequent return period, count returning users
    retention_row = [1.0]  // Period 0 = 100%

    FOR period_offset FROM 1 TO max_periods:
      return_period = cohort_period + period_offset * cohort_granularity

      returned_users = EMPTY_BITMAP()
      FOR event IN scan_events(project_id, return_period,
                                event_name=return_event,
                                user_filter=cohort_bitmap):
        returned_users.ADD(event.user_id)

      // Intersect with cohort to ensure we only count cohort members
      returning_cohort = returned_users.AND(cohort_bitmap)
      retention_rate = returning_cohort.CARDINALITY() / cohort_size

      retention_row.APPEND(retention_rate)

    matrix.APPEND({
      "cohort_period": cohort_period,
      "cohort_size": cohort_size,
      "retention": retention_row
    })

  RETURN matrix
```

### Algorithm 3: Session-Based Path Analysis

```
FUNCTION compute_paths(project_id, anchor_event, direction, depth, date_range):
  // direction = "forward" (after anchor) or "backward" (before anchor)

  // Step 1: Find all sessions containing anchor event
  anchor_sessions = MAP()  // session_id → anchor event timestamp

  FOR event IN scan_events(project_id, date_range, event_name=anchor_event):
    IF event.session_id NOT IN anchor_sessions:
      anchor_sessions[event.session_id] = event.timestamp

  // Step 2: Reconstruct session sequences around anchor
  edge_counts = MAP()   // (from_event, to_event) → count

  FOR session_id, anchor_ts IN anchor_sessions:
    session_events = scan_session(project_id, session_id,
                                   sort_by="timestamp")

    // Find anchor position in session
    anchor_pos = FIND_INDEX(session_events, anchor_ts)

    IF direction == "forward":
      sequence = session_events[anchor_pos : anchor_pos + depth + 1]
    ELSE:
      sequence = REVERSE(session_events[anchor_pos - depth : anchor_pos + 1])

    // Build edges from consecutive events in sequence
    FOR i FROM 0 TO LEN(sequence) - 2:
      from_event = sequence[i].event_name
      to_event = sequence[i+1].event_name

      // Normalize: collapse repeated identical events ("loop detection")
      IF from_event == to_event:
        CONTINUE

      edge_key = (from_event, to_event)
      edge_counts[edge_key] = edge_counts.GET(edge_key, 0) + 1

  // Step 3: Build Sankey-compatible node/edge structure
  nodes = COLLECT_UNIQUE_EVENTS(edge_counts)
  edges = SORTED_BY_COUNT(edge_counts, descending=True)[:top_n_edges]

  RETURN {
    "anchor_event": anchor_event,
    "total_sessions": LEN(anchor_sessions),
    "nodes": [{"id": n, "label": n} FOR n IN nodes],
    "edges": [{"from": k[0], "to": k[1], "weight": v} FOR k, v IN edges]
  }
```

### Algorithm 4: Dynamic Behavioral Cohort Evaluation

```
FUNCTION evaluate_behavioral_cohort(project_id, cohort_definition, as_of_date):
  // cohort_definition.criteria = list of behavioral predicates

  candidate_bitmap = NULL  // NULL means "all users"

  FOR criterion IN cohort_definition.criteria:
    window_start = as_of_date - criterion.time_window
    window_end = as_of_date

    IF criterion.operator == "performed":
      // Find users who performed event >= count_value times
      event_counts = MAP()  // user_id → count

      FOR event IN scan_events(project_id, (window_start, window_end),
                                event_name=criterion.event_name):
        event_counts[event.user_id] = event_counts.GET(event.user_id, 0) + 1

      qualifying_users = EMPTY_BITMAP()
      FOR user_id, count IN event_counts:
        IF compare(count, criterion.count_operator, criterion.count_value):
          qualifying_users.ADD(user_id)

    ELSE IF criterion.operator == "not_performed":
      // Find all users in project, then subtract performers
      all_users = get_all_active_users(project_id, window_end)
      performers = evaluate_behavioral_cohort_performed(project_id, criterion, window)
      qualifying_users = all_users.AND_NOT(performers)

    // Apply logical AND/OR across criteria
    IF cohort_definition.logical_operator == "AND":
      IF candidate_bitmap IS NULL:
        candidate_bitmap = qualifying_users
      ELSE:
        candidate_bitmap = candidate_bitmap.AND(qualifying_users)
    ELSE:  // OR
      IF candidate_bitmap IS NULL:
        candidate_bitmap = qualifying_users
      ELSE:
        candidate_bitmap = candidate_bitmap.OR(qualifying_users)

  RETURN candidate_bitmap
```
