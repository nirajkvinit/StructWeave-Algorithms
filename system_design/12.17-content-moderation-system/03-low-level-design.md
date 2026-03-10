# 12.17 Content Moderation System — Low-Level Design

## Data Models

### content_item

The canonical record for a single piece of user-generated content entering the moderation pipeline.

```
content_item {
  item_id:           UUID            -- globally unique, immutable
  platform_id:       string          -- originating platform or surface
  content_type:      enum            -- TEXT | IMAGE | VIDEO | AUDIO | DOCUMENT
  author_account_id: UUID            -- references account trust store
  created_at:        timestamp       -- content creation time (UTC)
  ingested_at:       timestamp       -- moderation pipeline entry time (UTC)
  raw_content_ref:   string          -- pointer to object storage (never stored inline)
  content_hash:      bytes[32]       -- SHA-256 of raw bytes (exact dedup)
  perceptual_hashes: map<string, bytes> -- keyed by algorithm (phash, pdq, photodna)
  text_extracted:    string          -- OCR/transcript for image/video/audio items
  language_code:     string          -- BCP-47 detected language
  geo_context:       string          -- ISO-3166 country code for policy routing
  account_trust_score: float         -- 0.0–1.0; sourced from trust store at ingest
  pre_publication:   boolean         -- true if in synchronous upload gate
  metadata:          map<string, string> -- extensible attributes (surface, client_version, etc.)
}
```

### moderation_decision

Immutable record produced whenever the system makes or updates a moderation determination. Multiple decisions can exist per content_item (initial, re-review, appeal outcomes).

```
moderation_decision {
  decision_id:       UUID            -- immutable
  item_id:           UUID            -- FK → content_item
  decision_type:     enum            -- AUTOMATED | HUMAN_REVIEW | APPEAL_AUTO |
                                     --   APPEAL_SENIOR | APPEAL_PANEL
  decision_at:       timestamp       -- UTC
  decided_by:        string          -- model_version string OR reviewer_id
  model_scores:      map<string, float>  -- category → confidence (0.0–1.0)
  hash_matches:      list<hash_match_result>
  composite_score:   float           -- aggregated severity (0.0–1.0)
  policy_version:    string          -- semver of policy rules applied
  geo_policy:        string          -- ISO-3166 policy variant applied
  routing_zone:      enum            -- ZONE_A | ZONE_B | ZONE_C
  action_taken:      enum            -- ALLOW | SOFT_LABEL | AGE_GATE | RESTRICT |
                                     --   REMOVE | ACCOUNT_WARN | ACCOUNT_SUSPEND | ACCOUNT_TERMINATE
  action_reason_code: string         -- policy rule ID that triggered action
  reviewer_notes:    string          -- free-text (human decisions only); encrypted at rest
  confidence_override: boolean       -- true if human overrode model recommendation
  is_superseded:     boolean         -- true if a subsequent decision replaces this one
}
```

### review_task

Work item in the human review queue. Tracks assignment, SLA, and completion.

```
review_task {
  task_id:           UUID
  item_id:           UUID            -- FK → content_item
  decision_id:       UUID            -- FK → the automated decision that triggered routing
  priority_score:    float           -- computed priority; higher = reviewed first
  severity_tier:     enum            -- CRITICAL | HIGH | MEDIUM | LOW
  content_type:      enum            -- mirrors content_item.content_type
  required_skills:   list<string>    -- e.g. ["german_language", "csam_cleared", "video"]
  sla_deadline:      timestamp       -- computed from severity_tier + regulatory rules
  assigned_to:       UUID            -- reviewer_id; null if unassigned
  assigned_at:       timestamp
  status:            enum            -- QUEUED | ASSIGNED | IN_PROGRESS | COMPLETED | EXPIRED
  completed_at:      timestamp
  review_duration_ms: integer        -- wall-clock time from open to submit
  geo_context:       string          -- for geo-specific policy display in workstation
}
```

### appeal

Tracks an appellant's challenge to a moderation decision.

```
appeal {
  appeal_id:         UUID
  item_id:           UUID            -- FK → content_item
  original_decision_id: UUID         -- FK → moderation_decision being challenged
  appellant_account_id: UUID
  submitted_at:      timestamp
  appellant_statement: string        -- encrypted at rest
  current_tier:      enum            -- AUTO_REVIEW | SENIOR_REVIEW | EXPERT_PANEL | CLOSED
  current_sla_deadline: timestamp
  tier_history:      list<appeal_tier_event>
    -- each: {tier, assigned_to, started_at, decided_at, outcome, notes}
  final_outcome:     enum            -- OVERTURNED | UPHELD | WITHDRAWN | null
  final_outcome_at:  timestamp
  dsa_reported:      boolean         -- true once submitted to DSA Transparency DB
  dsa_submission_id: string
}
```

### policy_rule

A single configurable enforcement rule evaluated by the policy engine.

```
policy_rule {
  rule_id:           string          -- human-readable, e.g. "HATE_SPEECH_REMOVE_DE"
  version:           string          -- semver
  content_types:     list<enum>      -- applicable content types
  category:          string          -- e.g. "hate_speech", "csam", "spam"
  condition:         rule_condition  -- threshold, account_trust_range, geo_list, etc.
  action:            enum            -- enforcement action
  severity_tier:     enum            -- for queue priority calculation
  geo_scope:         list<string>    -- ISO-3166 country codes; empty = global
  effective_from:    timestamp
  effective_until:   timestamp       -- null = indefinite
  is_active:         boolean
  created_by:        string          -- policy team member ID
  approval_chain:    list<string>    -- approval workflow artifact IDs
}
```

### reviewer

Profile and operational state of a human reviewer.

```
reviewer {
  reviewer_id:       UUID
  display_name:      string          -- anonymized for CSAM-category reviewers
  skill_tags:        list<string>    -- languages, content specializations, clearance levels
  active_geo_queues: list<string>    -- ISO-3166 queues this reviewer serves
  csam_cleared:      boolean         -- additional background-check gate
  daily_csam_reviewed: integer       -- reset midnight UTC; enforces daily exposure cap
  csam_daily_cap:    integer         -- per-reviewer policy limit (e.g., 20/day)
  wellness_status:   enum            -- OK | CHECK_IN_NEEDED | ON_BREAK | REFERRED
  last_wellness_check: timestamp
  consecutive_harmful_reviewed: integer  -- counter triggering mandatory break
  shift_start:       timestamp
  shift_end:         timestamp
  items_reviewed_today: integer
  avg_review_duration_ms: integer    -- rolling 7-day average
  inter_rater_kappa: float           -- Cohen's kappa vs. calibration set; rolling 30-day
}
```

---

## API Design

### Ingest API

```
POST /v1/content/submit
  Request:
    content_type: enum
    raw_content: multipart/form-data OR {url: string} for large items
    platform_context: {surface, session_id, geo_ip}
  Response (pre-publication path):
    {
      item_id: UUID,
      status: "PENDING_REVIEW" | "APPROVED" | "REJECTED",
      rejection_reason: string | null,
      estimated_review_ms: integer | null
    }
  Response (async path):
    {
      item_id: UUID,
      status: "ACCEPTED",
      scan_job_id: UUID
    }
  Errors:
    400 Bad Request: malformed payload
    413 Payload Too Large: exceeds content size limits
    429 Too Many Requests: rate limit exceeded
```

### User Report API

```
POST /v1/reports
  Request:
    item_id: UUID
    report_category: enum  -- SPAM | HATE_SPEECH | CSAM | VIOLENCE | OTHER
    reporter_statement: string (optional, max 500 chars)
  Response:
    {report_id: UUID, status: "RECEIVED"}

GET /v1/reports/{report_id}
  Response:
    {report_id, status: "PENDING" | "REVIEWED" | "ACTION_TAKEN" | "NO_ACTION", updated_at}
```

### Appeals API

```
POST /v1/appeals
  Request:
    item_id: UUID
    decision_id: UUID
    appellant_statement: string (max 2000 chars)
  Response:
    {appeal_id: UUID, tier: "AUTO_REVIEW", sla_deadline: timestamp}

GET /v1/appeals/{appeal_id}
  Response:
    {appeal_id, current_tier, status, tier_history[], sla_deadline}

POST /v1/appeals/{appeal_id}/escalate
  -- User explicitly escalates to next tier (where allowed)
  Response:
    {appeal_id, new_tier, new_sla_deadline}
```

### Internal Review Queue API

```
GET /internal/review/tasks/next
  Request (query params):
    reviewer_id: UUID
    max_items: integer (default 1)
  Response:
    list<{task_id, item_id, content_type, priority_score, severity_tier, sla_deadline,
          pre_rendered_content_url, model_scores, policy_match_context, geo_policy_text}>

POST /internal/review/tasks/{task_id}/decision
  Request:
    action: enum
    reason_code: string
    notes: string (optional)
    confidence_level: enum -- CERTAIN | LIKELY | MARGINAL
  Response:
    {task_id, decision_id, action_applied}

POST /internal/review/wellness/check-in
  Request: {reviewer_id, status: enum, notes: string}
  Response: {next_check_in: timestamp, recommended_break: boolean}
```

### Transparency Reporting API

```
GET /internal/reporting/dsa/snapshot
  Request (query params): period_start, period_end, geo_scope
  Response:
    {
      period: {start, end},
      takedowns_by_category: map<string, integer>,
      appeals_received: integer,
      appeals_overturned: integer,
      appeals_upheld: integer,
      false_positive_rate_estimate: float,
      reviewer_throughput: integer,
      automated_action_rate: float
    }
```

---

## Core Algorithms

### Algorithm 1: Multi-Modal Classification Pipeline

```
FUNCTION classify_content_item(item: content_item) -> classification_result:

  // Step 1: Hash matching (fast path, runs first)
  hash_signals = []
  FOR algo IN [PHASH, PDQ, PHOTODNA]:
    IF item.perceptual_hashes[algo] EXISTS:
      match = hash_index.lookup(item.perceptual_hashes[algo], threshold=algo.default_threshold)
      IF match.found:
        hash_signals.append({algo, match.category, match.database, match.distance})

  // Early exit: definite CSAM hash match
  IF any hash_signals has category == CSAM:
    RETURN classification_result{
      routing_zone: ZONE_A,
      action: REMOVE,
      confidence: 1.0,
      reason: "CSAM_HASH_MATCH",
      hash_matches: hash_signals
    }

  // Step 2: Parallel model inference
  model_futures = []
  IF item.content_type IN [TEXT, DOCUMENT]:
    model_futures.append(async text_classifier.infer(item.text_extracted))
    model_futures.append(async llm_contextual.infer(item.text_extracted, item.language_code))
  IF item.content_type IN [IMAGE, VIDEO]:
    model_futures.append(async image_classifier.infer(item.raw_content_ref))
    model_futures.append(async nsfw_detector.infer(item.raw_content_ref))
  IF item.content_type == VIDEO:
    frames = video_sampler.extract_keyframes(item.raw_content_ref, fps=2)
    model_futures.append(async temporal_classifier.infer(frames))
  IF item.content_type == AUDIO:
    transcript = stt_service.transcribe(item.raw_content_ref)
    model_futures.append(async text_classifier.infer(transcript))
    model_futures.append(async audio_classifier.infer(item.raw_content_ref))

  model_scores = await_all(model_futures)  // parallel execution

  // Step 3: Score ensemble aggregation
  aggregated = {}
  FOR category IN all_violation_categories:
    scores_for_category = [s[category] for s in model_scores if s[category] EXISTS]
    IF scores_for_category is EMPTY: continue
    // Weighted max: take max score, weighted by model reliability
    aggregated[category] = weighted_max(scores_for_category, weights=model_weights[category])

  composite_score = max(aggregated.values()) * account_trust_penalty(item.account_trust_score)

  // Step 4: Confidence-zone routing
  thresholds = policy_engine.get_thresholds(item.geo_context, item.content_type)

  IF composite_score >= thresholds.zone_a:
    routing_zone = ZONE_A
  ELSE IF composite_score >= thresholds.zone_b:
    routing_zone = ZONE_B
  ELSE:
    routing_zone = ZONE_C

  RETURN classification_result{
    routing_zone,
    model_scores: aggregated,
    composite_score,
    hash_matches: hash_signals,
    top_category: argmax(aggregated)
  }
```

### Algorithm 2: Review Queue Priority Scoring

```
FUNCTION compute_priority_score(item: content_item, decision: moderation_decision) -> float:

  // Base score: composite model score (0.0–1.0)
  score = decision.composite_score * 100.0

  // Factor 1: Content severity tier weight
  tier_weights = {CRITICAL: 3.0, HIGH: 2.0, MEDIUM: 1.5, LOW: 1.0}
  score *= tier_weights[decision.severity_tier]

  // Factor 2: Viral velocity (views-per-minute on flagged content)
  velocity = content_velocity_store.get(item.item_id)  // updated every 30 sec
  IF velocity > 10000:   score *= 2.5
  ELSE IF velocity > 1000: score *= 1.5
  ELSE IF velocity > 100:  score *= 1.2

  // Factor 3: Account trust inversion (low trust = higher priority)
  trust_multiplier = 1.0 + (1.0 - item.account_trust_score) * 0.5
  score *= trust_multiplier

  // Factor 4: Regulatory SLA urgency
  sla_deadline = compute_sla_deadline(decision.action_reason_code, item.geo_context)
  time_remaining = sla_deadline - now()
  IF time_remaining < 1 hour:   score *= 5.0   // SLA breach imminent
  ELSE IF time_remaining < 4 hours: score *= 2.0
  ELSE IF time_remaining < 24 hours: score *= 1.3

  // Factor 5: Abuse pattern (multiple user reports)
  report_count = report_store.count(item.item_id)
  score += min(report_count * 2.0, 20.0)  // capped additive bonus

  RETURN score
```

### Algorithm 3: Skill-Based Reviewer Assignment

```
FUNCTION assign_reviewer(task: review_task) -> reviewer | null:

  // Get candidate reviewers who are active on shift and not at capacity
  candidates = reviewer_store.query(
    active=true,
    skills_superset=task.required_skills,
    has_capacity=true  // not at daily review cap
  )

  IF candidates is EMPTY: RETURN null  // task remains in QUEUED state

  // Score each candidate
  best = null
  best_score = -INF
  FOR reviewer IN candidates:
    score = 0.0

    // Prefer reviewers with matching language skills
    IF task.geo_context.language IN reviewer.skill_tags:
      score += 30.0

    // Prefer reviewers with higher inter-rater kappa (quality signal)
    score += reviewer.inter_rater_kappa * 20.0

    // Avoid overloading: penalize reviewers nearing shift capacity
    utilization = reviewer.items_reviewed_today / reviewer.daily_capacity
    score -= utilization * 15.0

    // Wellness penalty: avoid assigning harmful content to fatigued reviewers
    IF task.severity_tier == CRITICAL:
      IF reviewer.consecutive_harmful_reviewed > 10: score -= 50.0
      IF reviewer.wellness_status == CHECK_IN_NEEDED: score -= 100.0

    // CSAM-specific: enforce daily cap
    IF task.required_skills contains "csam_cleared":
      IF reviewer.daily_csam_reviewed >= reviewer.csam_daily_cap: CONTINUE  // skip

    IF score > best_score:
      best = reviewer
      best_score = score

  IF best is null: RETURN null

  // Optimistic lock: use CAS on reviewer.assigned_task_count
  IF reviewer_store.cas_assign(best.reviewer_id, task.task_id):
    RETURN best
  ELSE:
    // Concurrent assignment race lost; retry with updated candidate list
    RETURN assign_reviewer(task)  // bounded recursion with retry limit
```

### Algorithm 4: Appeal Adjudication Routing

```
FUNCTION process_appeal(appeal: appeal) -> appeal_tier_event:

  IF appeal.current_tier == AUTO_REVIEW:
    // Re-run classification with current (potentially updated) policy version
    item = content_store.get(appeal.item_id)
    new_decision = classify_content_item(item)
    new_decision.policy_version = policy_engine.current_version()

    // Compare new decision to original
    original = decision_store.get(appeal.original_decision_id)
    IF new_decision.action is LESS_SEVERE than original.action:
      // Policy or model has changed; overturn
      RETURN tier_event{
        tier: AUTO_REVIEW,
        outcome: OVERTURNED,
        reason: "policy_or_model_update",
        new_action: new_decision.action
      }
    ELSE:
      // Escalate to senior review
      senior_task = create_review_task(
        item, severity_tier=HIGH, required_skills=["senior_reviewer"],
        sla_deadline=appeal.sla_deadline
      )
      RETURN tier_event{tier: AUTO_REVIEW, outcome: ESCALATED, next_task_id: senior_task.task_id}

  IF appeal.current_tier == SENIOR_REVIEW:
    senior_decision = review_queue.await_decision(appeal.current_task_id)
    IF senior_decision.action is LESS_SEVERE than original.action:
      RETURN tier_event{tier: SENIOR_REVIEW, outcome: OVERTURNED, new_action: senior_decision.action}
    ELSE:
      // Inform appellant of right to expert panel
      notify_appellant(appeal.appellant_account_id, next_option=EXPERT_PANEL)
      RETURN tier_event{tier: SENIOR_REVIEW, outcome: UPHELD}

  IF appeal.current_tier == EXPERT_PANEL:
    // Convene 3-person panel; require majority (2/3) for overturn
    panel = select_expert_panel(appeal)  // 3 senior reviewers with no prior involvement
    panel_decisions = [await_panel_member_decision(m, appeal) for m in panel]
    overturn_votes = count(d for d in panel_decisions where d.vote == OVERTURN)
    IF overturn_votes >= 2:
      RETURN tier_event{tier: EXPERT_PANEL, outcome: OVERTURNED}
    ELSE:
      RETURN tier_event{tier: EXPERT_PANEL, outcome: UPHELD}
```

### Algorithm 5: Perceptual Hash Distance Matching

```
FUNCTION lookup_hash(query_hash: bytes, algorithm: string, threshold: float) -> hash_match | null:

  // Hash databases are loaded into memory as Locality-Sensitive Hashing (LSH) indexes
  index = hash_index_store[algorithm]

  // For PhotoDNA: 1152-bit hash; distance = normalized Hamming distance
  // For pHash: 64-bit hash; distance = bit flip count / 64
  // For PDQ: 256-bit hash; quality-weighted Hamming distance

  candidates = index.query_approximate_neighbors(query_hash, k=10)

  FOR candidate IN candidates:
    distance = compute_distance(query_hash, candidate.hash, algorithm)
    IF distance <= threshold:
      RETURN hash_match{
        matched_hash: candidate.hash,
        distance: distance,
        category: candidate.category,   // CSAM | TERRORIST | COPYRIGHT
        source_database: candidate.db,  // NCMEC | GIFCT | COPYRIGHT_ORG
        confidence: 1.0 - (distance / threshold)
      }

  RETURN null

// Note: Hash databases are synchronized via delta updates every 60 seconds.
// All nodes share the same in-memory snapshot to ensure consistency.
// The hashes themselves are treated as sensitive material:
// access is role-restricted and all lookups are audit-logged.
```

---

## Key Schema Relationships

```
content_item
  │─── 1:N ──→ moderation_decision
  │                 │─── 1:1 ──→ review_task (when routing_zone == ZONE_B)
  │─── 1:N ──→ appeal
  │                 │─── 1:N ──→ appeal_tier_event
  └─── N:1 ──→ account (via author_account_id → trust store)

policy_rule
  └─── evaluated by policy_engine per (content_item, moderation_decision)
       producing action written to moderation_decision.action_taken

reviewer
  └─── assigned to review_task (1:1 at a time)
       decisions written to moderation_decision (decision_type=HUMAN_REVIEW)
```
