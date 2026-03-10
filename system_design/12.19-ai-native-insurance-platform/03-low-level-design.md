# 12.19 AI-Native Insurance Platform — Low-Level Design

## Data Models

### risk_score_record

Immutable snapshot of every feature and model output at the moment a binding underwriting decision is made. This record is the actuarial audit trail.

```
risk_score_record {
  record_id:           UUID            -- globally unique; never mutated
  policy_id:           UUID            -- FK → policy; null for pre-bind quotes
  quote_id:            UUID            -- FK → quote session
  decision_type:       enum            -- NEW_POLICY | RENEWAL | ENDORSEMENT | CANCELLATION
  decision_at:         timestamp       -- UTC; moment of model inference
  state_code:          string          -- ISO 3166-2 US state (e.g. "US-CA")
  line_of_business:    enum            -- AUTO | HOME | RENTERS | LIFE | PET
  approved_algo_version: string        -- semver; matches filed rate algorithm
  model_version:       string          -- semver; ML model artifact version
  feature_snapshot:    map<string, any>  -- all features passed to model; encrypted
  prohibited_features: list<string>    -- features excluded for this state (audit)
  model_scores: {
    glm_score:         float           -- GLM base risk score 0.0–1.0
    gbm_score:         float           -- Gradient boosting model score 0.0–1.0
    telematics_score:  float           -- Telematics NN score; null if not enrolled
    composite_score:   float           -- Weighted ensemble output
  }
  shap_attribution:    map<string, float>  -- SHAP values per feature; async computed
  premium_computed:    decimal         -- Annual premium at time of scoring
  coverage_tier:       enum            -- STANDARD | PREFERRED | HIGH_RISK | DECLINED
  adverse_action_triggered: boolean    -- true if adverse action notice required
  adverse_action_reason_codes: list<string>  -- FCRA reason codes
  data_sources:        list<string>    -- external bureaus consulted (MVR, CLUE, etc.)
  bureau_response_ids: map<string, UUID>  -- request IDs per bureau for audit
}
```

### policy

Event-sourced policy record. Current state derived from event log; never updated in place.

```
policy {
  policy_id:           UUID
  external_policy_number: string       -- human-readable; state-formatted
  state_code:          string
  line_of_business:    enum
  policyholder_id:     UUID            -- FK → account
  named_insureds:      list<insured>
  insured_assets:      list<insured_asset>  -- vehicles, properties
  effective_date:      date
  expiration_date:     date
  status:              enum            -- QUOTED | BOUND | ACTIVE | CANCELLED | LAPSED
  current_premium:     decimal         -- Annual; updated on endorsement/renewal
  risk_score_record_id: UUID           -- FK → risk_score_record at last binding
  coverage_terms:      map<string, coverage_detail>  -- per coverage type
  telematics_enrolled: boolean
  billing_schedule:    enum            -- MONTHLY | SEMI_ANNUAL | ANNUAL
  created_at:          timestamp
  last_event_at:       timestamp
  event_log:           list<policy_event>  -- append-only; full audit trail
    -- each: {event_id, event_type, event_at, actor_id, payload, reason_code}
}
```

### claim

```
claim {
  claim_id:            UUID
  claim_number:        string          -- external; state-formatted
  policy_id:           UUID
  claimant_id:         UUID            -- may differ from policyholder (third-party)
  fnol_at:             timestamp       -- first notice of loss UTC
  loss_date:           date
  loss_type:           enum            -- COLLISION | COMPREHENSIVE | LIABILITY |
                                       --  WIND | WATER | THEFT | FIRE | MEDICAL
  loss_description:    string          -- extracted from conversational intake; encrypted
  loss_location:       {lat, lon, address}
  status:              enum            -- FNOL | UNDER_REVIEW | APPROVED | PAID |
                                       --  DENIED | SIU_INVESTIGATION | CLOSED
  fraud_score:         float           -- 0.0–1.0; from real-time GNN scorer
  fraud_risk_tier:     enum            -- LOW | MEDIUM | HIGH | CRITICAL
  fraud_signals:       list<fraud_signal>  -- attributed contributing features
  damage_assessment_id: UUID           -- FK → damage_assessment
  assigned_adjuster_id: UUID           -- null for straight-through claims
  payment_amount:      decimal
  payment_initiated_at: timestamp
  documents:           list<document_ref>  -- photos, police reports, estimates
  conversation_log_id: UUID            -- FK → claims conversation transcript
  resolution_code:     enum
  closed_at:           timestamp
}
```

### telematics_trip

```
telematics_trip {
  trip_id:             UUID
  driver_id:           UUID            -- FK → account / insured
  vehicle_id:          UUID            -- FK → insured_asset
  device_type:         enum            -- MOBILE_SDK | OBD2_DEVICE
  started_at:          timestamp       -- UTC
  ended_at:            timestamp
  distance_km:         float
  duration_minutes:    float
  raw_event_count:     integer
  features: {
    hard_braking_events:   integer     -- deceleration > 8 m/s²
    hard_acceleration_events: integer  -- acceleration > 4.5 m/s²
    speeding_percentage:   float       -- % time above posted speed limit
    sharp_cornering_events: integer    -- lateral g > 0.5g
    phone_use_detected:    float       -- % trip with phone motion while driving
    night_driving_pct:     float       -- % miles between 10pm–6am
    highway_pct:           float       -- % miles on limited-access roads
    urban_pct:             float       -- % miles in urban zone
  }
  trip_score:          float           -- 0.0–100.0; higher is safer
  behavioral_score_delta: float        -- rolling score change this trip
  anomaly_flags:       list<string>    -- unusual patterns flagged for review
}
```

### fraud_graph entities

```
fraud_entity {
  entity_id:           UUID
  entity_type:         enum            -- CLAIMANT | VEHICLE | PROVIDER | LOCATION |
                                       --  ACCIDENT | ATTORNEY | BODY_SHOP
  external_ref:        string          -- SSN hash / VIN / NPI / address hash
  first_seen_at:       timestamp
  last_seen_at:        timestamp
  claim_count:         integer         -- total claims involving this entity
  fraud_history_flags: list<string>
  risk_score:          float           -- entity-level accumulated fraud risk
  embedding:           vector[128]     -- GNN-computed entity embedding
}

fraud_relationship {
  rel_id:              UUID
  source_entity_id:    UUID
  target_entity_id:    UUID
  relationship_type:   enum            -- INSURED_IN | TREATED_BY | REPAIRED_AT |
                                       --  CO_CLAIMANT | SAME_ACCIDENT | REFERRED_BY
  claim_id:            UUID            -- claim that created this relationship
  created_at:          timestamp
  weight:              float           -- relationship strength / recency
}
```

### rate_algorithm

Approved rating algorithm configuration per state × line of business × version.

```
rate_algorithm {
  algo_id:             UUID
  state_code:          string
  line_of_business:    enum
  version:             string          -- semver
  effective_date:      date
  expiration_date:     date            -- null = current
  status:              enum            -- DRAFT | FILED | APPROVED | SUPERSEDED
  feature_set:         list<feature_definition>
    -- each: {feature_name, source, transform, included: boolean}
  prohibited_features: list<string>    -- state-specific exclusions
  model_artifact_ref:  string          -- pointer to model registry
  weight_overrides:    map<string, float>  -- per-feature weight adjustments
  filing_ref:          string          -- SERFF filing number
  regulator_approval_at: timestamp
  effective_premium_tables: object     -- actuarial rate tables for base premium
}
```

---

## API Design

### Quote API

```
POST /v1/quotes
  Request:
    applicant: {
      state_code: string
      date_of_birth: date        -- encrypted in transit
      address: {street, city, state, zip}
    }
    line_of_business: enum
    assets: list<{type, details}>  -- vehicle VIN or property address
    telematics_consent: boolean
    discounts_requested: list<string>
  Response:
    {
      quote_id: UUID,
      status: "SCORING" | "READY" | "DECLINED",
      estimated_completion_ms: integer,
      webhook_url: string        -- for async completion notification
    }

GET /v1/quotes/{quote_id}
  Response:
    {
      quote_id, status,
      offer: {
        annual_premium: decimal,
        monthly_premium: decimal,
        coverage_tiers: list<{tier, premium, coverage_detail}>,
        valid_until: timestamp,
        telematics_discount_available: boolean
      },
      adverse_action: {triggered: boolean, reason_codes: list<string>} | null
    }

POST /v1/quotes/{quote_id}/bind
  Request:
    selected_coverage_tier: enum
    payment_method: {type, token}
    signature: {consent_text, signed_at, ip_address}
  Response:
    {policy_id: UUID, policy_number: string, effective_date: date, documents: list<url>}
```

### Claims API

```
POST /v1/claims/fnol
  Request:
    policy_id: UUID
    channel: enum  -- CHAT | VOICE | WEB | MOBILE
    initial_message: string     -- first customer message (conversational path)
  Response:
    {
      claim_id: UUID,
      claim_number: string,
      conversation_session_id: UUID,
      status: "INTAKE_IN_PROGRESS"
    }

POST /v1/claims/{claim_id}/messages
  Request:
    session_id: UUID
    message: string
    attachments: list<{type, data_url}>
  Response:
    {
      reply: string,             -- conversational AI response
      collected_fields: map<string, any>,  -- structured fields extracted so far
      next_required_field: string | null,
      intake_complete: boolean
    }

POST /v1/claims/{claim_id}/documents
  Request: multipart/form-data
    file: binary
    document_type: enum  -- PHOTO | VIDEO | POLICE_REPORT | ESTIMATE | OTHER
  Response:
    {document_id: UUID, status: "QUEUED_FOR_ASSESSMENT"}

GET /v1/claims/{claim_id}
  Response:
    {claim_id, claim_number, status, fraud_risk_tier,
     damage_assessment: {severity, estimated_range: {min, max}},
     assigned_adjuster: {name, phone} | null,
     payment: {amount, initiated_at} | null}
```

### Telematics API (Mobile SDK)

```
POST /v1/telematics/trips
  Request:
    device_id: UUID
    driver_id: UUID
    trip: {
      started_at: timestamp,
      ended_at: timestamp,
      events: list<{ts: timestamp, lat, lon, speed_mps, accel_xyz, gyro_xyz}>
      -- compressed; average 6000 events per 10-min trip
    }
  Response:
    {trip_id: UUID, score: float | null, status: "PROCESSING" | "SCORED"}

GET /v1/telematics/drivers/{driver_id}/score
  Response:
    {
      driver_id,
      rolling_score: float,          -- 0–100; higher is safer
      score_as_of: timestamp,
      trip_count_30d: integer,
      estimated_discount_pct: float, -- based on current score
      top_improvement_areas: list<string>
    }
```

### Internal Fraud Scoring API

```
POST /internal/fraud/score
  Request:
    claim_id: UUID
    claimant_id: UUID
    loss_type: enum
    loss_amount: decimal
    involved_entities: list<{entity_type, external_ref}>
  Response:
    {
      claim_id,
      fraud_score: float,
      fraud_risk_tier: enum,
      signals: list<{feature, contribution, description}>,
      recommended_action: enum  -- AUTO_APPROVE | ADJUSTER_REVIEW | SIU_ESCALATE
    }
  SLO: p99 ≤ 3 seconds
```

---

## Core Algorithms

### Algorithm 1: Multi-Model Underwriting Ensemble

```
FUNCTION score_applicant(request: quote_request, state: string) -> risk_score_result:

  // Step 1: Load approved algorithm for this state × LOB
  algo = rate_algorithm_store.get(state, request.line_of_business, version="current")

  // Step 2: Build feature vector (state-parameterized)
  raw_features = {}
  FOR feature_def IN algo.feature_set WHERE feature_def.included:
    IF feature_def.source == "APPLICATION":
      raw_features[feature_def.name] = extract(request, feature_def)
    ELSE IF feature_def.source == "BUREAU_MVR":
      raw_features[feature_def.name] = bureau_cache.get_mvr(request.applicant_id, feature_def)
    ELSE IF feature_def.source == "BUREAU_CLUE":
      raw_features[feature_def.name] = bureau_cache.get_clue(request.applicant_id, feature_def)
    ELSE IF feature_def.source == "TELEMATICS":
      raw_features[feature_def.name] = telematics_score_store.get(request.driver_id, feature_def)

  // Step 3: Enforce prohibited factor exclusion
  prohibited = algo.prohibited_features
  model_features = {k: v FOR k, v IN raw_features WHERE k NOT IN prohibited}

  // Step 4: Parallel model inference
  glm_future  = async glm_model.score(model_features, algo.model_artifact_ref + "/glm")
  gbm_future  = async gbm_model.score(model_features, algo.model_artifact_ref + "/gbm")
  telem_score = telematics_score_store.get_rolling(request.driver_id)  // pre-computed

  glm_score, gbm_score = await(glm_future, gbm_future)

  // Step 5: Ensemble aggregation (weights from approved algorithm)
  weights = algo.weight_overrides OR {glm: 0.30, gbm: 0.50, telematics: 0.20}
  composite = glm_score * weights.glm + gbm_score * weights.gbm
  IF telem_score IS NOT NULL AND request.telematics_consent:
    composite += telem_score * weights.telematics
  ELSE:
    composite = composite / (1 - weights.telematics)  // re-normalize without telematics

  // Step 6: Map to coverage tier
  tier = map_score_to_tier(composite, algo.tier_thresholds[state])

  // Step 7: Write immutable risk score record (before returning)
  record = risk_score_record{
    decision_at: now(),
    state_code: state,
    approved_algo_version: algo.version,
    model_version: algo.model_artifact_ref,
    feature_snapshot: encrypt(raw_features),      // including prohibited for audit
    prohibited_features: prohibited,               // what was excluded
    model_scores: {glm_score, gbm_score, telem_score, composite},
    coverage_tier: tier
  }
  record_id = score_record_store.append(record)   // immutable write

  // Step 8: Async compute SHAP attribution (does not block quote response)
  async schedule_shap_computation(record_id, model_features, algo.model_artifact_ref)

  RETURN risk_score_result{record_id, composite, tier, adverse_action: tier == DECLINED}
```

### Algorithm 2: Real-Time Fraud Scoring via GNN

```
FUNCTION score_claim_fraud(fnol: claim_fnol) -> fraud_score_result:

  // Step 1: Resolve entities involved in this claim
  entities = []
  entities.append(resolve_or_create_entity(CLAIMANT, fnol.claimant_id))
  entities.append(resolve_or_create_entity(VEHICLE, fnol.vehicle_vin))
  entities.append(resolve_or_create_entity(LOCATION, fnol.loss_location.cluster_id))
  IF fnol.provider_npi:
    entities.append(resolve_or_create_entity(PROVIDER, fnol.provider_npi))

  // Step 2: Retrieve 2-hop subgraph centered on each new entity
  subgraph_nodes = {}
  subgraph_edges = []
  FOR entity IN entities:
    neighbors = fraud_graph.get_2hop_neighbors(entity.entity_id)
    subgraph_nodes.update(neighbors.nodes)
    subgraph_edges.extend(neighbors.edges)
  subgraph_nodes.update({e.entity_id: e FOR e IN entities})

  // Step 3: Build GNN input feature matrix
  node_features = []
  FOR node IN subgraph_nodes.values():
    node_features.append([
      node.claim_count,
      node.fraud_history_flags.length,
      node.risk_score,
      days_since(node.first_seen_at),
      days_since(node.last_seen_at),
      // ... additional node features
    ])
  edge_index = build_adjacency(subgraph_edges)

  // Step 4: GNN forward pass
  // 3-layer GraphSAGE; aggregates neighbor information
  gnn_embeddings = gnn_model.forward(node_features, edge_index)

  // Score for target nodes (the new claim's entities)
  fraud_scores = []
  FOR entity IN entities:
    node_idx = subgraph_nodes.index(entity.entity_id)
    fraud_scores.append(gnn_fraud_classifier.score(gnn_embeddings[node_idx]))

  // Step 5: Aggregate entity-level scores into claim-level score
  claim_fraud_score = max(fraud_scores) * 0.6 + mean(fraud_scores) * 0.4

  // Step 6: Apply claim-level features
  AMOUNT_WEIGHT = 0.15
  claim_amount_signal = sigmoid((fnol.estimated_amount - median_amount) / stddev_amount)
  POLICY_AGE_WEIGHT = 0.10
  policy_age_signal = 1.0 - min(days_since(fnol.policy.effective_date) / 90, 1.0)
  final_score = claim_fraud_score * 0.75 + claim_amount_signal * AMOUNT_WEIGHT +
                policy_age_signal * POLICY_AGE_WEIGHT

  // Step 7: Write new entities and relationships to fraud graph
  async write_claim_entities_to_graph(fnol, entities, claim_fraud_score)

  RETURN fraud_score_result{
    fraud_score: final_score,
    fraud_risk_tier: map_to_tier(final_score),
    signals: compute_attributions(gnn_embeddings, entities)
  }
```

### Algorithm 3: Trip Behavioral Scoring

```
FUNCTION score_trip(trip: telematics_trip) -> trip_score_result:

  // Normalize each driving behavior dimension to 0–100
  // Lower raw values = higher safety score on each dimension
  braking_score     = 100 - min(trip.features.hard_braking_events * 5, 100)
  accel_score       = 100 - min(trip.features.hard_acceleration_events * 4, 100)
  speed_score       = 100 - min(trip.features.speeding_percentage * 2, 100)
  cornering_score   = 100 - min(trip.features.sharp_cornering_events * 6, 100)
  distraction_score = 100 - min(trip.features.phone_use_detected * 1.5, 100)
  time_score        = 100 - (trip.features.night_driving_pct * 0.3)

  // Weighted composite (weights calibrated from actuarial loss data)
  trip_score = (
    braking_score     * 0.30 +
    accel_score       * 0.15 +
    speed_score       * 0.25 +
    cornering_score   * 0.10 +
    distraction_score * 0.15 +
    time_score        * 0.05
  )

  // Update rolling behavioral score (exponential moving average)
  ALPHA = 0.05   // smoothing factor; new trip contributes 5% weight
  current = behavioral_score_store.get(trip.driver_id)
  IF current IS NULL:
    new_rolling = trip_score
  ELSE:
    new_rolling = current.rolling_score * (1 - ALPHA) + trip_score * ALPHA

  // Check for significant score change (triggers re-rating evaluation)
  SIGNIFICANT_DELTA = 10.0   // 10-point change on 100-point scale
  delta = abs(new_rolling - (current.rolling_score IF current ELSE new_rolling))

  behavioral_score_store.update(trip.driver_id, {
    rolling_score: new_rolling,
    last_trip_score: trip_score,
    trip_count_30d: increment,
    re_rating_triggered: delta > SIGNIFICANT_DELTA
  })

  RETURN trip_score_result{trip_score, new_rolling, delta}
```

### Algorithm 4: Conversational Claims State Machine

```
FUNCTION process_claim_turn(session_id: UUID, customer_message: string) -> bot_response:

  session = session_store.get(session_id)

  // Step 1: Intent classification
  intent = intent_classifier.classify(customer_message)
  // intents: REPORT_LOSS | PROVIDE_FIELD | EXPRESS_DISTRESS | ASK_QUESTION | UNCLEAR

  // Step 2: Handle distress first
  IF intent == EXPRESS_DISTRESS OR sentiment_scorer.score(customer_message) < 0.3:
    empathy_response = empathy_generator.respond(customer_message)
    session.distress_count += 1
    IF session.distress_count >= 3:
      RETURN escalate_to_live_adjuster(session)
    RETURN bot_response{
      reply: empathy_response + "\n\n" + re_ask_current_field(session),
      collected_fields: session.collected_fields,
      intake_complete: false
    }

  // Step 3: Entity extraction for current required field
  required_field = get_next_required_field(session.collected_fields)
  IF required_field IS NOT NULL:
    extracted = entity_extractor.extract(customer_message, field_type=required_field.type)
    IF extracted.confidence >= 0.85:
      session.collected_fields[required_field.name] = extracted.value
    ELSE:
      // Low confidence: ask for clarification
      RETURN bot_response{
        reply: clarification_prompt(required_field, customer_message),
        collected_fields: session.collected_fields,
        intake_complete: false
      }

  // Step 4: Check if intake is complete
  remaining_fields = get_required_fields(session.loss_type) - session.collected_fields.keys()
  IF remaining_fields IS EMPTY:
    // Finalize FNOL
    fnol = build_fnol_record(session)
    claim = claim_service.submit_fnol(fnol)
    RETURN bot_response{
      reply: fnol_confirmation_message(claim),
      collected_fields: session.collected_fields,
      intake_complete: true,
      claim_id: claim.claim_id
    }

  // Step 5: Ask for next field
  next_field = remaining_fields[0]
  RETURN bot_response{
    reply: field_prompt(next_field, session.context),
    collected_fields: session.collected_fields,
    intake_complete: false
  }
```

---

## Key Schema Relationships

```
risk_score_record
  └─── 1:1 ──→ policy (at binding; policy.risk_score_record_id)
  └─── 1:N ──→ policy_events (renewal decisions)

policy
  └─── 1:N ──→ claim
  └─── 1:N ──→ telematics_trip (via insured drivers)
  └─── N:1 ──→ rate_algorithm (state × LOB × version)

claim
  └─── 1:1 ──→ damage_assessment
  └─── 1:N ──→ fraud_entity (via fraud_relationship)

telematics_trip
  └─── N:1 ──→ driver (account)
  └─── contributes to → behavioral_score (rolling aggregate)

fraud_entity
  └─── N:N ──→ fraud_entity (via fraud_relationship)
  └─── N:N ──→ claim (via involvement)
```
