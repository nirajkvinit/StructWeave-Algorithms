# 12.20 AI-Native Recruitment Platform — Low-Level Design

## Data Models

### candidate_profile

The canonical, continuously enriched record for a single candidate across all sources and interactions.

```
candidate_profile {
  candidate_id:          UUID              -- globally unique, immutable
  source_type:           enum              -- APPLIED | SOURCED | REFERRED | INTERNAL
  source_refs:           list<source_ref>  -- deduplication anchors: {source_id, external_url, crawled_at}
  contact:               contact_info      -- email, phone; encrypted at rest
  geo_location:          string            -- city/region; not IP-derived
  skills_explicit:       list<skill_tag>   -- declared skills {skill_id, proficiency, is_verified}
  skills_inferred:       list<skill_tag>   -- extracted from resume/profile text by NLP
  experience_records:    list<experience>  -- {company, title, start, end, description_embedding}
  education_records:     list<education>   -- {institution, degree, field, grad_year}
  profile_embedding:     bytes             -- float32 or int8 vector; dimension=1536
  embedding_model_ver:   string            -- model version that produced the embedding
  embedding_computed_at: timestamp
  assessment_scores:     list<assessment_result>  -- FK → assessment_session
  interview_reports:     list<interview_report_ref>
  conversation_signals:  map<string, string>  -- structured slots extracted from conversations
  consent_record:        consent_info      -- {aedt_notice_sent_at, opted_out, opted_out_at, channel}
  do_not_contact:        boolean
  opt_out_at:            timestamp | null
  data_retention_until:  timestamp         -- computed from legal basis at creation; recalculated on re-engagement
  created_at:            timestamp
  last_enriched_at:      timestamp
  profile_version:       integer           -- increment on each structural update
}
```

### job_requisition

A job opening posted by a hiring team, with structured requirements driving matching.

```
job_requisition {
  req_id:                UUID
  employer_id:           UUID
  title:                 string
  description_text:      string
  req_embedding:         bytes             -- vector representation of role requirements
  embedding_model_ver:   string
  required_skills:       list<skill_tag>   -- {skill_id, importance_weight}
  preferred_skills:      list<skill_tag>
  seniority_level:       enum              -- ENTRY | MID | SENIOR | STAFF | PRINCIPAL
  location_policy:       enum              -- ONSITE | HYBRID | REMOTE
  geo_scope:             string            -- city/region or "remote"
  team_calibration:      model_calibration -- recent hiring manager feedback adjustments to weights
  aedt_notice_mode:      enum              -- BATCH_NOTICE | REALTIME_NOTICE
  open_at:              timestamp
  closed_at:             timestamp | null
  status:                enum              -- OPEN | PAUSED | FILLED | CANCELLED
  hiring_manager_id:     UUID
  created_by:            string            -- recruiter ID
}
```

### candidate_stage_event

Immutable record of every pipeline stage transition for a candidate on a requisition.

```
candidate_stage_event {
  event_id:              UUID              -- immutable
  candidate_id:          UUID
  req_id:                UUID
  stage_from:            enum              -- SOURCED | APPLIED | SCREENED | ASSESSED | INTERVIEWED | OFFERED | HIRED | REJECTED
  stage_to:              enum
  decision_type:         enum              -- AI_RANKING | AI_ASSESSMENT | HUMAN_RECRUITER | HUMAN_HIRING_MGR
  decided_by:            string            -- model_version string OR user_id
  model_version:         string
  match_score:           float             -- 0.0–1.0; null if human decision
  feature_attribution:   map<string, float> -- top contributing features for AI decisions
  policy_version:        string
  transition_at:         timestamp
  rejection_reason_code: string | null     -- standardized code; used for EEOC/LL144 reporting
  bias_batch_id:         UUID              -- FK → bias_monitoring_batch this event belongs to
}
```

### bias_monitoring_batch

Aggregates all stage decisions in a single batch; used for adverse impact analysis.

```
bias_monitoring_batch {
  batch_id:              UUID
  req_id:                UUID
  stage:                 enum              -- which stage transition this batch covers
  closed_at:             timestamp         -- when the batch window closed
  decision_count:        integer
  demographic_breakdown: map<string, group_stats>
    -- key: demographic_category (e.g., "gender:female", "race:black", "intersect:black_female")
    -- value: {selected_count, total_count, selection_rate, impact_ratio_vs_reference_group}
  reference_group:       string            -- the most-selected group; denominator for impact ratios
  violation_detected:    boolean           -- true if any impact_ratio < 0.80 (4/5ths rule) at p<0.05
  violation_categories:  list<string>      -- which demographic categories triggered violation
  status:                enum              -- COMPUTING | CLEAR | FLAGGED | REVIEWED | RELEASED
  reviewed_by:           string | null     -- compliance officer who cleared a FLAGGED batch
  released_at:           timestamp | null
}
```

### assessment_session

One adaptive assessment administered to one candidate for one requisition.

```
assessment_session {
  session_id:            UUID
  candidate_id:          UUID
  req_id:                UUID
  assessment_type:       enum              -- TECHNICAL | BEHAVIORAL | SITUATIONAL | CODING
  started_at:            timestamp
  completed_at:          timestamp | null
  status:                enum              -- IN_PROGRESS | COMPLETED | ABANDONED | INVALIDATED
  items_administered:    list<item_result>
    -- each: {item_id, difficulty_param, discrimination_param, response, score, response_time_ms}
  theta_estimate:        float             -- IRT latent ability estimate; updated after each item
  theta_se:              float             -- standard error of theta; stopping criterion
  final_scaled_score:    float             -- normalized to 0–100 for report display
  percentile_for_role:   float             -- percentile vs. norming group for this role type
  proctoring_flags:      list<string>      -- anomaly signals from proctoring (empty if no proctoring)
  model_version:         string            -- IRT model version used for calibration
}
```

### interview_analysis_report

Structured output of the video/audio interview analysis pipeline.

```
interview_analysis_report {
  report_id:             UUID
  candidate_id:          UUID
  req_id:                UUID
  submission_id:         UUID              -- FK → video submission in object storage
  submitted_at:          timestamp
  processed_at:          timestamp
  status:                enum              -- QUEUED | PROCESSING | COMPLETE | FAILED
  questions_analyzed:    list<question_analysis>
    -- each: {
    --   question_id,
    --   transcript: string,
    --   asr_confidence: float,
    --   coherence_score: float,        -- 0.0–1.0; NLP structural coherence
    --   vocabulary_coverage: float,    -- fraction of domain terms present vs. expected for role
    --   answer_completeness: float,    -- rubric-anchored coverage of expected content points
    --   response_duration_sec: integer,
    --   competency_scores: map<string, float>  -- e.g., {"problem_solving": 0.72, "communication": 0.81}
    -- }
  overall_competency_scores: map<string, float>
  asr_model_version:     string
  nlp_model_version:     string
  report_expiry_at:      timestamp         -- data retention deadline
}
```

### dialogue_session

State of one conversational interaction thread with a candidate.

```
dialogue_session {
  session_id:            UUID
  candidate_id:          UUID
  channel:               enum              -- WEB_CHAT | SMS | EMAIL | WHATSAPP | VOICE
  channel_thread_id:     string            -- external channel message thread ID
  req_ids_discussed:     list<UUID>        -- requisitions in scope for this session
  current_intent:        string            -- last classified intent
  slots:                 map<string, slot_value>  -- filled slot state
    -- slot_value: {value, confidence, filled_at, source: "candidate" | "inferred"}
  turn_history:          list<turn>
    -- each: {role: "candidate"|"system", text, intent, timestamp, channel}
  scheduling_state:      scheduling_context | null
  active:                boolean
  last_activity_at:      timestamp
  session_expires_at:    timestamp         -- session state GC deadline
  language_code:         string            -- BCP-47 detected candidate language
  consent_state:         enum              -- PENDING | GIVEN | DECLINED
}
```

---

## API Design

### Candidate-Facing API

```
POST /v1/candidates/apply
  Request:
    req_id: UUID
    resume: multipart/form-data OR {url: string}
    contact: {email, phone}
    consent_aedt: boolean          -- explicit AEDT consent flag
  Response:
    {candidate_id, session_id, status: "RECEIVED" | "PENDING_NOTICE" | "PROCESSING"}

GET /v1/candidates/{candidate_id}/status
  Response:
    {candidate_id, active_applications: list<{req_id, stage, last_updated}>}

POST /v1/candidates/{candidate_id}/data-request
  -- GDPR / CCPA data access or erasure request
  Request:
    request_type: enum  -- ACCESS | ERASURE | PORTABILITY
    identity_verification_token: string
  Response:
    {request_id, estimated_completion: timestamp}

POST /v1/interviews/submit
  Request:
    session_id: UUID
    req_id: UUID
    video_parts: list<multipart_chunk>  -- chunked upload
  Response:
    {submission_id, status: "RECEIVED", estimated_analysis_completion: timestamp}
```

### Recruiter-Facing API

```
GET /v1/requisitions/{req_id}/shortlist
  Request (query params):
    min_score: float (default 0.5)
    limit: integer (default 50)
    stage: enum
  Response:
    {req_id, candidates: list<{
      candidate_id, match_score, rank,
      top_skills: list<skill_tag>,
      feature_attribution: map<string, float>,
      stage, last_activity_at
    }>}

GET /v1/candidates/{candidate_id}/assessment-summary
  Response:
    {candidate_id, assessments: list<{session_id, type, final_scaled_score, percentile_for_role, completed_at}>}

GET /v1/candidates/{candidate_id}/interview-report/{report_id}
  Response:
    {report_id, questions_analyzed: [...], overall_competency_scores: map<string, float>}

POST /v1/requisitions/{req_id}/stage-decision
  Request:
    candidate_id: UUID
    decision: enum  -- ADVANCE | REJECT | HOLD
    reason_code: string
    notes: string (optional)
  Response:
    {event_id, bias_batch_id, status: "RECORDED" | "PENDING_BIAS_CHECK"}

GET /v1/requisitions/{req_id}/bias-report
  Response:
    {req_id, batches: list<{batch_id, stage, violation_detected, demographic_breakdown}>}
```

### Internal / Service APIs

```
POST /internal/matching/rank
  Request:
    req_id: UUID
    candidate_ids: list<UUID>  -- or empty to search all profiles
    top_k: integer (default 100)
  Response:
    {ranked_candidates: list<{candidate_id, match_score, feature_attribution}>}

POST /internal/bias/analyze-batch
  Request:
    batch_id: UUID
    decision_events: list<{candidate_id, outcome, stage}>
  Response:
    {batch_id, status, violation_detected, demographic_breakdown}

POST /internal/embeddings/generate
  Request:
    text: string
    entity_type: enum  -- CANDIDATE_PROFILE | JOB_REQUISITION | SKILL_QUERY
  Response:
    {embedding: list<float>, model_version: string, computed_at: timestamp}
```

---

## Core Algorithms

### Algorithm 1: Skills-Graph-Enhanced Candidate Embedding

```
FUNCTION generate_candidate_embedding(profile: candidate_profile) -> vector:

  // Step 1: Extract skill signals
  explicit_skill_ids = [s.skill_id for s in profile.skills_explicit]
  inferred_skill_ids = [s.skill_id for s in profile.skills_inferred]

  // Step 2: Expand skills via graph adjacency (query skills graph)
  expanded_skills = {}
  FOR skill_id IN explicit_skill_ids + inferred_skill_ids:
    neighbors = skills_graph.get_neighbors(skill_id, max_hops=2, min_edge_weight=0.5)
    FOR neighbor IN neighbors:
      decay = 0.8 ^ neighbor.hop_distance  // decay weight with graph distance
      expanded_skills[neighbor.id] = max(expanded_skills.get(neighbor.id, 0), decay)

  // Step 3: Encode experience text via transformer
  experience_texts = [concat(e.title, e.description) for e in profile.experience_records]
  experience_embeddings = [encoder.encode(t) for t in experience_texts]
  experience_vec = mean_pool(experience_embeddings, weights=[recency_weight(e) for e in profile.experience_records])

  // Step 4: Encode skills as weighted sum of skill embeddings
  skill_vecs = [skills_graph.get_embedding(sid) * weight for sid, weight in expanded_skills.items()]
  skill_vec = mean_pool(skill_vecs)

  // Step 5: Combine experience and skill representations
  combined = concat(experience_vec, skill_vec)  // e.g., 768 + 768 = 1536 dim
  normalized = l2_normalize(combined)

  RETURN normalized
```

### Algorithm 2: Two-Stage Candidate Matching

```
FUNCTION match_candidates_for_req(req: job_requisition, top_k: integer) -> ranked_list:

  // Stage 1: ANN Recall — find semantically similar candidate embeddings
  req_vec = embedding_service.generate(req.description_text, entity_type=JOB_REQUISITION)
  ann_candidates = vector_index.search(
    query_vector=req_vec,
    k=top_k * 10,    // over-fetch for re-ranking; retrieve 10x more than needed
    ef=200           // HNSW exploration factor; higher = better recall at latency cost
  )
  // ann_candidates: list of (candidate_id, cosine_similarity_score)

  // Stage 2: Compatibility Model Re-ranking
  features = []
  FOR cid, sim_score IN ann_candidates:
    profile = profile_store.get(cid)
    f = build_compatibility_features(profile, req, sim_score)
    features.append((cid, f))

  scores = compatibility_model.predict_batch(features)
  ranked = sort_by_score_desc(zip(ann_candidates_ids, scores))

  // Step 3: Feature attribution for explainability
  attributed = []
  FOR cid, score IN ranked[:top_k]:
    attribution = shap_explainer.explain(compatibility_model, features[cid], background_data=sample_set)
    attributed.append({candidate_id: cid, match_score: score, feature_attribution: attribution})

  RETURN attributed

FUNCTION build_compatibility_features(profile, req, embedding_sim) -> feature_vector:
  RETURN {
    embedding_similarity:      embedding_sim,
    skill_overlap_score:       jaccard(profile.skills, req.required_skills),
    skill_importance_weighted: dot(profile.skills_vector, req.importance_weights),
    seniority_match:           seniority_distance(profile.inferred_seniority, req.seniority_level),
    location_compatibility:    location_score(profile.geo_location, req.geo_scope, req.location_policy),
    recency_score:             recency_weight(profile.last_enriched_at),
    assessment_score_norm:     normalize(latest_assessment_score(profile, req.assessment_type)),
    team_calibration_delta:    req.team_calibration.weight_adjustments  // recruiter feedback
  }
```

### Algorithm 3: IRT-Adaptive Assessment Item Selection

```
FUNCTION select_next_item(session: assessment_session, item_bank: list<item>) -> item | null:

  // Stopping criterion: stop when standard error is low enough
  IF session.theta_se < 0.3 OR len(session.items_administered) >= MAX_ITEMS:
    RETURN null  // assessment complete

  administered_ids = {i.item_id for i in session.items_administered}
  candidates = [item for item in item_bank if item.item_id NOT IN administered_ids]

  // IRT Maximum Information criterion:
  // Select item that provides maximum information at current theta estimate
  best_item = null
  best_info = -INF

  FOR item IN candidates:
    // 3PL IRT model information function
    a = item.discrimination_param  // typically 0.5–2.5
    b = item.difficulty_param      // logit scale; difficulty level
    c = item.guessing_param        // lower asymptote; typically 0.0–0.25

    P = c + (1 - c) / (1 + exp(-a * (session.theta_estimate - b)))
    Q = 1 - P
    I = (a^2 * (P - c)^2 * Q) / ((1 - c)^2 * P)  // Fisher information

    IF I > best_info:
      best_info = I
      best_item = item

  RETURN best_item

FUNCTION update_theta(session: assessment_session, response: item_response) -> void:
  // EAP (Expected A Posteriori) estimation update after each response
  // Use numerical integration over prior distribution × likelihood

  prior = normal_distribution(mean=0.0, sd=1.0)  // population prior
  likelihood = compute_likelihood(session.items_administered, session.theta_estimate)
  posterior = prior * likelihood
  session.theta_estimate = expected_value(posterior)
  session.theta_se = sqrt(variance(posterior))
```

### Algorithm 4: Adverse Impact Analysis

```
FUNCTION analyze_adverse_impact(batch: bias_monitoring_batch,
                                 decisions: list<decision_event>,
                                 demographic_store: DemographicStore) -> batch_result:

  // Step 1: Join decisions with demographic data (read from isolated store)
  joined = []
  FOR decision IN decisions:
    demo = demographic_store.get(decision.candidate_id)  // restricted read
    IF demo is null: CONTINUE  // skip candidates who did not provide demographic data
    joined.append({decision, demo})

  // Step 2: Compute selection rates per demographic group
  group_stats = {}
  all_groups = extract_all_groups(joined)  // e.g., gender, race, intersectional combos

  FOR group IN all_groups:
    group_decisions = [d for d in joined if matches_group(d.demo, group)]
    selected = count(d for d in group_decisions if d.decision.outcome == ADVANCE)
    total = len(group_decisions)
    IF total < MIN_SAMPLE_SIZE:  // skip groups with too few members for statistical power
      CONTINUE
    group_stats[group] = {selected, total, selection_rate: selected/total}

  // Step 3: Find reference group (highest selection rate)
  reference_group = argmax(group_stats, key=lambda g: g.selection_rate)
  reference_rate = group_stats[reference_group].selection_rate

  // Step 4: Compute impact ratios and test significance
  violations = []
  FOR group, stats IN group_stats.items():
    impact_ratio = stats.selection_rate / reference_rate
    stats.impact_ratio_vs_reference_group = impact_ratio

    IF impact_ratio < 0.80:
      // Apply Fisher's exact test for statistical significance
      p_value = fishers_exact_test(
        selected_in_group=stats.selected,
        total_in_group=stats.total,
        selected_in_reference=group_stats[reference_group].selected,
        total_in_reference=group_stats[reference_group].total
      )
      IF p_value < 0.05:
        violations.append(group)

  batch.demographic_breakdown = group_stats
  batch.violation_detected = len(violations) > 0
  batch.violation_categories = violations
  batch.status = FLAGGED if violations else CLEAR

  RETURN batch
```

---

## Key Schema Relationships

```
candidate_profile
  │─── 1:N ──→ candidate_stage_event   (one per requisition per stage transition)
  │─── 1:N ──→ assessment_session      (one per assessment administered)
  │─── 1:N ──→ interview_analysis_report
  │─── 1:N ──→ dialogue_session        (one per conversational thread)
  └─── N:M ──→ job_requisition         (via candidate_stage_event)

job_requisition
  │─── 1:N ──→ candidate_stage_event
  └─── 1:N ──→ bias_monitoring_batch   (one per stage per batch window)

bias_monitoring_batch
  └─── 1:N ──→ candidate_stage_event   (events belonging to this batch)

assessment_session
  └─── 1:N ──→ item_result             (items administered in session)
```
