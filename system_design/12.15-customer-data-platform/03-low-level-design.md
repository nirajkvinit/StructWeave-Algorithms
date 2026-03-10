# 03 — Low-Level Design: Customer Data Platform

## Data Models

### Event (Raw Ingest)

```
EventRecord {
  event_id:          UUID (generated at edge, idempotency key)
  workspace_id:      UUID
  write_key:         String (source identifier, hashed)
  event_name:        String (e.g., "Product Viewed", "Order Completed")
  event_type:        Enum { track | page | screen | identify | group }
  anonymous_id:      String (device/browser-scoped anonymous identifier)
  user_id:           String? (authenticated user identifier, optional)
  group_id:          String? (B2B account identifier, optional)
  timestamp:         ISO8601 (client-reported time)
  received_at:       ISO8601 (server-assigned ingestion time)
  context: {
    ip:              String (client IP, used for geo enrichment)
    user_agent:      String
    locale:          String
    page: { url, referrer, title }?
    app: { name, version, build }?
    device: { id, type, manufacturer, model, os }?
    campaign: { source, medium, name, term, content }?
  }
  properties:        Map<String, Any> (event-specific payload, schema-validated)
  integrations:      Map<String, Bool> (per-destination opt-in/out overrides)
  sent_at:           ISO8601 (timestamp when SDK sent the event)
}
```

**Indexes**: `(workspace_id, anonymous_id, received_at)`, `(workspace_id, user_id, received_at)`, `event_id` (unique, for deduplication)

**Partitioning**: By `workspace_id` hash, then by `received_at` date range for time-based queries and TTL expiry.

---

### Unified Profile

```
Profile {
  profile_id:        UUID (canonical stable identifier, system-generated)
  workspace_id:      UUID

  identifiers: {
    email_hash:      String? (SHA-256 of lowercase normalized email)
    phone_hash:      String? (SHA-256 of E.164 normalized phone)
    user_id:         String? (first-party authenticated ID)
    anonymous_ids:   Set<String> (all known anon IDs linked to this profile)
    device_ids:      Set<String>
    external_ids:    Map<String, String> (namespace -> ID, e.g., "salesforce" -> "sf_001")
  }

  traits: {
    first_name:      String?
    last_name:       String?
    email:           String? (stored encrypted; email_hash is used for matching)
    phone:           String? (stored encrypted)
    created_at:      ISO8601
    updated_at:      ISO8601
    [custom_traits]: Map<String, Any> (schema-governed custom traits)
  }

  computed_traits: {
    [trait_name]:    Any (computed from event history, per trait definition)
    _computed_at:    Map<String, ISO8601> (per-trait last computation time)
  }

  audience_memberships: {
    [audience_id]:   AudienceMembershipEntry {
      entered_at:    ISO8601
      last_evaluated_at: ISO8601
      match_reason:  String (debug: which rule triggered entry)
    }
  }

  consent: {
    [purpose]:       ConsentEntry {
      status:        Enum { granted | denied | unknown }
      updated_at:    ISO8601
      source:        String (how consent was obtained)
      legal_basis:   String? (GDPR: consent | legitimate_interest | contract)
    }
  }

  metadata: {
    created_at:      ISO8601
    updated_at:      ISO8601
    merge_history:   List<MergeEvent> (audit of profile merges)
    erasure_status:  Enum { active | erasure_requested | erased }
    data_residency:  String (region code)
  }
}
```

**Indexes**: `profile_id` (primary), `(workspace_id, identifiers.email_hash)`, `(workspace_id, identifiers.user_id)`, `(workspace_id, identifiers.anonymous_ids[*])` (multi-value index)

---

### Identity Graph Node and Edge

```
IdentityNode {
  node_id:           UUID
  workspace_id:      UUID
  identifier_type:   Enum { email_hash | phone_hash | user_id | anonymous_id | device_id | external_id }
  identifier_value:  String
  profile_id:        UUID (canonical profile this identifier belongs to)
  confidence:        Float [0.0, 1.0] (1.0 for deterministic, < 1.0 for probabilistic)
  created_at:        ISO8601
  last_seen_at:      ISO8601
}

IdentityEdge {
  edge_id:           UUID
  workspace_id:      UUID
  from_node_id:      UUID
  to_node_id:        UUID
  edge_type:         Enum { same_session | same_device | authenticated_link | probabilistic_match }
  weight:            Float (co-occurrence / match confidence)
  evidence_count:    Int (number of times co-observed)
  first_seen_at:     ISO8601
  last_seen_at:      ISO8601
}
```

---

### Audience Segment Definition

```
AudienceSegment {
  segment_id:        UUID
  workspace_id:      UUID
  name:              String
  description:       String?
  evaluation_mode:   Enum { streaming | batch | dual }

  definition: {
    mode:            Enum { rule_builder | sql }

    // Rule builder mode
    root_condition:  ConditionGroup {
      operator:      Enum { AND | OR | NOT }
      conditions:    List<Condition | ConditionGroup>
    }

    // SQL mode
    sql_query:       String? (SELECT user_id FROM ... WHERE ...)

    // Compiled streaming representation (generated at save time)
    streaming_ast:   JSON? (null if not streamable)
  }

  refresh_schedule:  CronExpression? (for batch segments)

  destinations: List<{
    destination_id:  UUID
    sync_mode:       Enum { realtime | scheduled }
    mapping:         Map<String, String> (CDP field -> destination field)
  }>

  metadata: {
    created_by:      UUID (user ID)
    created_at:      ISO8601
    updated_at:      ISO8601
    member_count:    Int (approximation, updated periodically)
    last_evaluated_at: ISO8601
  }
}
```

---

### Destination Configuration

```
Destination {
  destination_id:    UUID
  workspace_id:      UUID
  name:              String
  destination_type:  String (e.g., "webhook", "ad_platform_crm", "warehouse_bigquery")

  connection_config: {
    endpoint:        String? (for webhooks)
    credentials:     EncryptedBlob (stored in managed KMS; decrypted only at delivery)
    region:          String?
    format:          Enum { json | csv | avro | ndjson }
  }

  delivery_config: {
    mode:            Enum { realtime | batch | scheduled }
    batch_size:      Int? (for batch mode)
    batch_interval:  Duration? (for scheduled mode)
    retry_policy: {
      max_attempts:  Int (default: 5)
      backoff_base:  Duration (default: 30s)
      backoff_max:   Duration (default: 1h)
    }
    rate_limit:      Int? (max requests/sec)
  }

  schema_mapping:    Map<String, TransformRule> (CDP event/profile field -> destination field)

  filter_rules: {
    event_types:     List<String>? (whitelist of event names to forward)
    audience_ids:    List<UUID>? (only deliver when user is in these audiences)
  }

  consent_purposes: List<String> (required user consent purposes for delivery)

  health: {
    status:          Enum { healthy | degraded | down | paused }
    last_success_at: ISO8601?
    consecutive_failures: Int
    circuit_state:   Enum { closed | open | half_open }
  }
}
```

---

## API Design

### Event Ingestion API

```
POST /v1/t
Authorization: Bearer {write_key}
Content-Type: application/json

Request:
{
  "type":         "track",
  "event":        "Product Viewed",
  "anonymousId":  "anon_abc123",
  "userId":       "user_xyz",           // optional
  "timestamp":    "2026-03-10T12:00:00Z",
  "properties": {
    "product_id":   "prod_001",
    "category":     "Electronics",
    "price":        99.99
  },
  "context": {
    "ip":       "203.0.113.45",
    "locale":   "en-US"
  }
}

Response 200:
{ "status": "queued", "event_id": "evt_550e8400..." }

Response 400 (schema violation):
{ "error": "SCHEMA_VIOLATION", "message": "property 'price' must be number", "event_id": null }

Response 401:
{ "error": "INVALID_WRITE_KEY" }

Response 429:
{ "error": "RATE_LIMIT_EXCEEDED", "retry_after_ms": 1000 }
```

### Batch Event Ingestion

```
POST /v1/batch
Authorization: Bearer {write_key}
Content-Type: application/json

Request:
{
  "batch": [ ...array of event objects (max 500 per batch)... ],
  "sent_at": "2026-03-10T12:00:00Z"
}

Response 200:
{
  "successes": 498,
  "failures": [
    { "index": 3, "event_id": "evt_...", "error": "SCHEMA_VIOLATION", "message": "..." },
    { "index": 47, "event_id": "evt_...", "error": "UNKNOWN_EVENT_TYPE" }
  ]
}
```

### Profile Lookup API

```
GET /v1/profiles/{identifier_type}/{identifier_value}
Authorization: Bearer {access_token}
Accept: application/json

Path params:
  identifier_type:   email | phone | user_id | anonymous_id | external_id:{namespace}
  identifier_value:  URL-encoded value

Query params:
  include:           traits,computed_traits,audiences,consent (comma-separated, default: traits)

Response 200:
{
  "profile_id":  "prof_...",
  "traits": { ... },
  "computed_traits": { ... },
  "audiences": [
    { "id": "seg_...", "name": "High Value Customers", "entered_at": "2026-01-15T..." }
  ],
  "updated_at": "2026-03-10T12:00:00Z"
}

Response 404:
{ "error": "PROFILE_NOT_FOUND" }
```

### Audience API

```
POST /v1/audiences
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "name":        "Abandoned Cart — High Intent",
  "definition": {
    "mode": "rule_builder",
    "root_condition": {
      "operator": "AND",
      "conditions": [
        { "type": "event", "event": "Cart Viewed", "within": "7d", "count": { "gte": 1 } },
        { "type": "event", "event": "Order Completed", "within": "7d", "count": { "eq": 0 } },
        { "type": "trait", "trait": "total_spend_lifetime", "operator": "gte", "value": 100 }
      ]
    }
  },
  "evaluation_mode": "streaming"
}

Response 201:
{
  "segment_id":      "seg_...",
  "evaluation_mode": "streaming",   // confirmed mode after compilation check
  "estimated_size":  null,          // computed async
  "status":          "building"
}
```

### Erasure Request API

```
POST /v1/privacy/erasure-requests
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "identifier_type":  "email",
  "identifier_value": "user@example.com",
  "regulation":       "gdpr",    // or "ccpa"
  "requester_ref":    "ticket_12345"
}

Response 202:
{
  "request_id":        "era_...",
  "status":            "received",
  "estimated_completion": "2026-04-09T...",  // 30 days
  "tracking_url":      "/v1/privacy/erasure-requests/era_..."
}

GET /v1/privacy/erasure-requests/{request_id}
Response 200:
{
  "request_id":  "era_...",
  "status":      "in_progress",
  "stages": [
    { "stage": "profile_store",     "status": "completed", "completed_at": "..." },
    { "stage": "event_store",       "status": "in_progress" },
    { "stage": "identity_graph",    "status": "pending" },
    { "stage": "destination_queues","status": "pending" },
    { "stage": "warehouse_export",  "status": "pending" }
  ]
}
```

---

## Core Algorithms

### Algorithm: Identity Resolution

```
FUNCTION resolveIdentity(event: EventRecord) -> ProfileID:

  // Step 1: Collect identifiers present in this event
  identifiers = []
  IF event.user_id IS NOT NULL:
    identifiers.append({ type: "user_id", value: event.user_id, confidence: 1.0 })
  IF event.anonymous_id IS NOT NULL:
    identifiers.append({ type: "anonymous_id", value: event.anonymous_id, confidence: 1.0 })
  IF event.context.device.id IS NOT NULL:
    identifiers.append({ type: "device_id", value: event.context.device.id, confidence: 0.9 })

  // Step 2: Look up each identifier in the identity graph
  existing_profiles = SET()
  FOR each identifier in identifiers:
    node = identityGraph.findNode(workspace_id, identifier.type, identifier.value)
    IF node EXISTS:
      existing_profiles.add(node.profile_id)

  // Step 3: Determine merge outcome
  IF existing_profiles.size() == 0:
    // No existing profile — create new
    new_profile_id = createProfile(event)
    FOR each identifier in identifiers:
      identityGraph.createNode(workspace_id, identifier, new_profile_id)
    RETURN new_profile_id

  ELIF existing_profiles.size() == 1:
    // One existing profile — attach new identifiers
    target_profile_id = existing_profiles.first()
    FOR each identifier in identifiers:
      IF NOT identityGraph.nodeExists(workspace_id, identifier):
        identityGraph.createNode(workspace_id, identifier, target_profile_id)
    RETURN target_profile_id

  ELSE:
    // Multiple profiles — merge required
    // Acquire distributed lock on sorted(existing_profiles) to prevent concurrent merge conflicts
    LOCK(sorted(existing_profiles))
    TRY:
      surviving_profile_id = applyMergePolicy(existing_profiles)
      merged_profile = mergeProfiles(existing_profiles, surviving_profile_id)

      // Reassign all identity nodes to surviving profile
      FOR each profile_id in existing_profiles WHERE profile_id != surviving_profile_id:
        identityGraph.reassignNodes(profile_id, surviving_profile_id)
        markProfileAsMerged(profile_id, surviving_profile_id)

      // Record merge in audit log
      auditLog.record(MergeEvent { profiles: existing_profiles, survivor: surviving_profile_id })

      RETURN surviving_profile_id
    FINALLY:
      RELEASE_LOCK()


FUNCTION applyMergePolicy(profile_ids: Set<ProfileID>) -> ProfileID:
  // Survivorship: prefer oldest authenticated profile
  profiles = fetchProfiles(profile_ids)
  authenticated = profiles.filter(p => p.identifiers.user_id IS NOT NULL)
  IF authenticated.size() > 0:
    RETURN authenticated.sortBy(created_at ASC).first().profile_id
  RETURN profiles.sortBy(created_at ASC).first().profile_id
```

---

### Algorithm: Streaming Segment Evaluation

```
// At segment creation time, compile to a CEP rule
FUNCTION compileSegmentToStreamingRule(segment: AudienceSegment) -> StreamingRule | NULL:
  IF segment.definition.mode == "sql":
    RETURN NULL  // route to batch path

  ast = parseConditionTree(segment.definition.root_condition)

  IF containsHistoricalAggregation(ast):
    // e.g., "total_spend_30d" requires scanning event history
    RETURN NULL  // route to batch path

  IF containsComplexJoin(ast):
    RETURN NULL

  RETURN compileToStreamingAST(ast)


// At event processing time
FUNCTION evaluateStreamingSegments(event: EventRecord, profile: Profile):

  affected_segments = segmentIndex.getSegmentsMatchingEventType(
    workspace_id = event.workspace_id,
    event_name = event.event_name
  )

  FOR each segment in affected_segments:
    rule = segment.streaming_ast

    // Evaluate rule against updated profile state
    was_member = profile.audience_memberships.contains(segment.segment_id)
    is_member = evaluateRule(rule, profile, event)

    IF is_member AND NOT was_member:
      // Audience entered
      profile.audience_memberships.set(segment.segment_id, {
        entered_at: now(),
        last_evaluated_at: now()
      })
      publish(MembershipEvent { type: "entered", profile_id, segment_id, timestamp: now() })

    ELIF NOT is_member AND was_member:
      // Audience exited
      profile.audience_memberships.remove(segment.segment_id)
      publish(MembershipEvent { type: "exited", profile_id, segment_id, timestamp: now() })


FUNCTION evaluateRule(rule: StreamingAST, profile: Profile, event: EventRecord) -> Bool:
  MATCH rule.type:
    CASE "AND": RETURN ALL(evaluateRule(child, profile, event) FOR child in rule.children)
    CASE "OR":  RETURN ANY(evaluateRule(child, profile, event) FOR child in rule.children)
    CASE "NOT": RETURN NOT evaluateRule(rule.child, profile, event)
    CASE "trait_filter":
      val = profile.traits.get(rule.trait_name) ?? profile.computed_traits.get(rule.trait_name)
      RETURN applyOperator(val, rule.operator, rule.value)
    CASE "event_occurrence":
      // Check from in-memory event count cache on profile
      count = profile.event_counts.get(rule.event_name, rule.within_window)
      RETURN applyOperator(count, rule.operator, rule.count)
```

---

### Algorithm: Destination Fan-out with Backpressure

```
FUNCTION fanoutToDestinations(trigger: MembershipEvent | ProfileUpdateEvent):

  workspace = loadWorkspace(trigger.workspace_id)
  profile = loadProfile(trigger.profile_id)

  relevant_destinations = workspace.destinations.filter(dest =>
    dest.health.circuit_state != "open" AND
    eventMatchesDestinationFilter(trigger, dest) AND
    profileConsentedForDestination(profile, dest)
  )

  FOR each destination in relevant_destinations:
    // Transform event to destination schema
    payload = applySchemaMapping(trigger, profile, destination.schema_mapping)

    // Apply PII transformation rules (hash/mask/drop) per destination data classification
    payload = applyPIITransformation(payload, destination.pii_rules)

    // Enqueue to destination-specific queue with delivery metadata
    delivery_record = DeliveryRecord {
      delivery_id:    UUID
      destination_id: destination.destination_id
      payload:        payload
      attempt_count:  0
      next_attempt_at: now()
      expires_at:     now() + 72h  // max retry window
    }

    destinationQueue.enqueue(destination.destination_id, delivery_record)


// Delivery worker (one per destination)
FUNCTION deliveryWorker(destination_id: UUID):
  LOOP:
    record = destinationQueue.peek(destination_id)
    IF record IS NULL:
      SLEEP(1s)
      CONTINUE

    IF record.expires_at < now():
      destinationQueue.ack(record.delivery_id)
      deadLetterQueue.enqueue(record, reason="EXPIRED")
      metrics.increment("delivery.expired", destination_id)
      CONTINUE

    IF record.next_attempt_at > now():
      SLEEP(record.next_attempt_at - now())
      CONTINUE

    TRY:
      response = httpClient.post(
        destination.connection_config.endpoint,
        payload = record.payload,
        timeout = 30s
      )

      IF response.status in [200, 201, 202, 204]:
        destinationQueue.ack(record.delivery_id)
        metrics.increment("delivery.success", destination_id)
        destination.health.circuit_state = "closed"
        destination.health.consecutive_failures = 0

      ELSE:
        handleDeliveryFailure(record, destination, response.status)

    CATCH NetworkError, Timeout:
      handleDeliveryFailure(record, destination, error_code = "NETWORK")


FUNCTION handleDeliveryFailure(record, destination, error_code):
  record.attempt_count += 1

  IF record.attempt_count >= destination.delivery_config.retry_policy.max_attempts:
    destinationQueue.ack(record.delivery_id)
    deadLetterQueue.enqueue(record, reason="MAX_ATTEMPTS")
    RETURN

  // Exponential backoff with jitter
  backoff = min(
    destination.delivery_config.retry_policy.backoff_base * (2 ^ record.attempt_count),
    destination.delivery_config.retry_policy.backoff_max
  )
  jitter = random(0, backoff * 0.2)
  record.next_attempt_at = now() + backoff + jitter

  destinationQueue.update(record)

  // Update circuit breaker
  destination.health.consecutive_failures += 1
  IF destination.health.consecutive_failures >= CIRCUIT_OPEN_THRESHOLD (5):
    destination.health.circuit_state = "open"
    destination.health.circuit_opened_at = now()
    alerting.fire("destination_circuit_open", destination_id)
```
