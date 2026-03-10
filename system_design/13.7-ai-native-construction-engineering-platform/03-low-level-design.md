# 13.7 AI-Native Construction & Engineering Platform — Low-Level Design

## Data Models

### Site State Tensor

The site state tensor is the core abstraction—a 4D representation linking every BIM element to its planned state, observed state, and temporal progression across the project lifecycle.

```
SiteStateTensor:
  project_id:          string          # unique project identifier
  site_id:             string          # physical site identifier
  snapshot_date:       date            # daily snapshot date
  bim_model_version:   string          # IFC model version hash
  elements:            [ElementState]  # one per BIM element
  zones:               [ZoneState]     # spatial zone summaries
  overall_progress:    float64         # weighted completion percentage
  confidence_score:    float64         # data freshness and coverage quality

ElementState:
  element_guid:        string          # IFC GlobalId (GUID)
  ifc_type:            string          # e.g., IfcWall, IfcBeam, IfcDuct
  discipline:          enum[STRUCTURAL, ARCHITECTURAL, MECHANICAL, ELECTRICAL, PLUMBING, FIRE_PROTECTION]
  floor_id:            string          # building floor / level
  zone_id:             string          # spatial zone within floor
  planned_start:       date
  planned_finish:      date
  actual_start:        date | null
  actual_finish:       date | null
  completion_pct:      float64         # 0.0 to 1.0
  status:              enum[NOT_STARTED, IN_PROGRESS, COMPLETE, DEFICIENT, REWORK]
  detection_confidence: float64        # CV model confidence for status
  last_observed:       datetime        # timestamp of last visual confirmation
  cost_allocated:      decimal         # budgeted cost for this element
  cost_actual:         decimal | null  # actual cost if tracked
  responsible_trade:   string          # subcontractor ID
  inspection_status:   enum[NOT_REQUIRED, PENDING, SCHEDULED, PASSED, FAILED]
  clash_count:         int             # active unresolved clashes
  geometry_bbox:       BoundingBox3D   # axis-aligned bounding box in project coords

ZoneState:
  zone_id:             string
  floor_id:            string
  zone_name:           string          # e.g., "Floor 12 - East Wing"
  planned_pct:         float64         # expected completion by snapshot_date
  actual_pct:          float64         # observed completion
  variance:            float64         # actual - planned (negative = behind)
  active_trades:       [string]        # trade IDs currently working in zone
  safety_score:        float64         # rolling 7-day safety rating
  capture_coverage:    float64         # % of zone area with recent imagery
  point_cloud_age_hrs: float64         # hours since last point cloud update

BoundingBox3D:
  min_x:               float64
  min_y:               float64
  min_z:               float64
  max_x:               float64
  max_y:               float64
  max_z:               float64
```

### BIM Element Model

```
BIMElement:
  guid:                string          # IFC GlobalId
  model_version:       string          # model version this element belongs to
  ifc_class:           string          # IfcWall, IfcColumn, IfcBeam, etc.
  name:                string          # element name from BIM
  description:         string
  discipline:          enum[...]
  containing_floor:    string          # IfcBuildingStorey reference
  containing_space:    string | null   # IfcSpace reference
  material:            string          # primary material specification
  geometry:            GeometryData
  properties:          map[string, any] # IFC property sets
  quantity_takeoffs:   [QuantityItem]
  relationships:       [ElementRelation]
  version_history:     [VersionDelta]

GeometryData:
  representation_type: enum[BREP, EXTRUSION, MESH, CSG]
  bounding_box:        BoundingBox3D
  volume_m3:           float64
  surface_area_m2:     float64
  length_m:            float64 | null  # for linear elements (beams, pipes)
  centroid:            Point3D
  orientation:         Quaternion       # rotation in project coordinates
  mesh_vertex_count:   int             # tessellated mesh complexity

QuantityItem:
  quantity_type:       enum[VOLUME, AREA, LENGTH, COUNT, WEIGHT]
  value:               float64
  unit:                string          # m3, m2, m, kg, ea
  derived_from:        enum[GEOMETRY, MANUAL, COMPUTED]

ElementRelation:
  relation_type:       enum[CONTAINS, CONNECTS, FILLS, VOIDS, AGGREGATES, CLASHES_WITH]
  target_guid:         string
  metadata:            map[string, any]

VersionDelta:
  from_version:        string
  to_version:          string
  change_type:         enum[ADDED, MODIFIED, DELETED]
  changed_properties:  [string]        # which properties changed
  timestamp:           datetime
```

### Safety Event Model

```
SafetyEvent:
  event_id:            string          # unique event ID
  site_id:             string
  camera_id:           string
  timestamp:           datetime        # frame timestamp
  event_type:          enum[PPE_VIOLATION, ZONE_VIOLATION, NEAR_MISS, STRUCK_BY_RISK, FALL_RISK, HOUSEKEEPING]
  severity:            enum[CRITICAL, WARNING, INFORMATIONAL]
  confidence:          float64         # model confidence score
  location:            SiteLocation
  worker_region:       BoundingBox2D   # detection region in frame
  worker_track_id:     string          # multi-object tracker ID (not facial recognition)
  violation_details:   ViolationDetail
  video_clip_ref:      string          # object store reference to 5-sec clip
  keyframe_ref:        string          # object store reference to annotated frame
  response_status:     enum[PENDING, ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE]
  response_by:         string | null   # supervisor ID
  response_at:         datetime | null

SiteLocation:
  floor_id:            string
  zone_id:             string
  coordinates_2d:      Point2D         # site plan coordinates
  geo_coordinates:     LatLng | null   # GPS if available
  nearest_bim_element: string | null   # closest BIM element GUID

ViolationDetail:
  ppe_missing:         [enum[HARD_HAT, VEST, HARNESS, GLOVES, EYE_PROTECTION, STEEL_TOES]] | null
  zone_name:           string | null   # exclusion zone name
  hazard_type:         string | null   # for near-miss: falling object, equipment proximity, etc.
  trajectory_risk:     float64 | null  # predicted collision probability for near-miss

BoundingBox2D:
  x_min:               float64
  y_min:               float64
  x_max:               float64
  y_max:               float64
  frame_width:         int
  frame_height:        int
```

### Cost Estimate Model

```
CostEstimate:
  estimate_id:         string
  project_id:          string
  bim_model_version:   string          # BIM version this estimate is based on
  estimate_date:       datetime
  estimate_stage:      enum[CONCEPTUAL, SCHEMATIC, DESIGN_DEVELOPMENT, CONSTRUCTION_DOCUMENTS, BID]
  currency:            string
  total_p10:           decimal         # 10th percentile (optimistic)
  total_p50:           decimal         # median estimate
  total_p90:           decimal         # 90th percentile (conservative)
  contingency_pct:     float64
  escalation_rate:     float64         # annual cost escalation applied
  divisions:           [CostDivision]  # CSI MasterFormat divisions
  element_costs:       [ElementCost]   # per-BIM-element costs
  risk_factors:        [CostRiskFactor]

CostDivision:
  division_code:       string          # CSI division (e.g., "03" = Concrete)
  division_name:       string
  subtotal_p50:        decimal
  subtotal_p10:        decimal
  subtotal_p90:        decimal
  labor_pct:           float64
  material_pct:        float64
  equipment_pct:       float64
  line_items:          [CostLineItem]

CostLineItem:
  item_id:             string
  description:         string
  unit:                string          # m3, m2, kg, ea, hr
  quantity:            float64         # extracted from BIM
  unit_rate_p50:       decimal
  unit_rate_distribution: Distribution # log-normal parameters
  total_p50:           decimal
  bim_elements:        [string]        # linked BIM element GUIDs
  data_source:         enum[HISTORICAL_DB, MARKET_FEED, MANUAL, SUBCONTRACTOR_BID]

ElementCost:
  element_guid:        string
  cost_p50:            decimal
  cost_distribution:   Distribution
  cost_breakdown:      map[string, decimal]  # labor, material, equipment

CostRiskFactor:
  factor_name:         string          # e.g., "steel_price_volatility"
  impact_p50:          decimal
  probability:         float64
  correlation_group:   string          # factors that move together

Distribution:
  type:                enum[LOG_NORMAL, NORMAL, TRIANGULAR, PERT]
  parameters:          map[string, float64]  # mu, sigma, min, mode, max as applicable
```

### Schedule Activity Model

```
ScheduleActivity:
  activity_id:         string
  project_id:          string
  wbs_code:            string          # work breakdown structure
  activity_name:       string
  description:         string
  trade:               string          # responsible trade/subcontractor
  floor_id:            string
  zone_id:             string
  planned_start:       date
  planned_finish:      date
  planned_duration_days: int
  actual_start:        date | null
  actual_finish:       date | null
  pct_complete:        float64         # from progress tracking
  status:              enum[NOT_STARTED, IN_PROGRESS, COMPLETE, DELAYED, SUSPENDED]
  predecessors:        [Dependency]
  successors:          [Dependency]
  bim_elements:        [string]        # linked BIM element GUIDs
  resource_assignments: [ResourceAssignment]
  delay_risk_score:    float64         # 0.0 to 1.0
  delay_risk_factors:  [RiskFactor]
  float_days:          int             # total float
  is_critical:         boolean         # on critical path
  earned_value:        EarnedValueData

Dependency:
  predecessor_id:      string
  dependency_type:     enum[FINISH_TO_START, START_TO_START, FINISH_TO_FINISH, START_TO_FINISH]
  lag_days:            int
  dependency_nature:   enum[LOGICAL, PHYSICAL, REGULATORY, SPATIAL, WEATHER]

ResourceAssignment:
  resource_type:       enum[LABOR_CREW, EQUIPMENT, MATERIAL]
  resource_id:         string
  quantity:            float64
  unit:                string          # workers, hours, units
  planned_start:       date
  planned_finish:      date

RiskFactor:
  factor_type:         enum[WEATHER, PREDECESSOR_DELAY, SUBCONTRACTOR, MATERIAL_DELIVERY, PERMIT, INSPECTION, LABOR_SHORTAGE]
  severity:            float64         # contribution to delay probability
  description:         string
  mitigation:          string | null

EarnedValueData:
  bcws:                decimal         # budgeted cost of work scheduled (PV)
  bcwp:                decimal         # budgeted cost of work performed (EV)
  acwp:                decimal         # actual cost of work performed (AC)
  cpi:                 float64         # cost performance index
  spi:                 float64         # schedule performance index
```

---

## API Contracts

### Progress Tracking API

```
POST /api/v1/progress/capture-batch
  Request:
    site_id:           string
    capture_date:      date
    camera_captures:   [CameraCapture]
      camera_id:       string
      floor_id:        string
      zone_id:         string
      image_refs:      [string]        # object store references
      capture_times:   [datetime]
    processing_mode:   enum[STANDARD, RAPID]  # rapid = priority processing
  Response:
    batch_id:          string
    estimated_completion: datetime
    image_count:       int
    status:            "QUEUED"

GET /api/v1/progress/site/{site_id}/snapshot/{date}
  Response:
    site_state:        SiteStateTensor
    zones:             [ZoneState]
    deviation_alerts:  [DeviationAlert]
      zone_id:         string
      planned_pct:     float64
      actual_pct:      float64
      variance:        float64
      severity:        enum[ON_TRACK, MINOR_DELAY, MAJOR_DELAY, CRITICAL]
    processing_status: enum[COMPLETE, PARTIAL, PROCESSING]

GET /api/v1/progress/element/{element_guid}/history
  Query params:
    from_date:         date
    to_date:           date
  Response:
    element_guid:      string
    ifc_type:          string
    observations:      [ElementObservation]
      date:            date
      status:          enum[NOT_STARTED, IN_PROGRESS, COMPLETE, DEFICIENT]
      completion_pct:  float64
      confidence:      float64
      evidence_refs:   [string]        # image crops showing element
```

### BIM Intelligence API

```
POST /api/v1/bim/models
  Request:
    project_id:        string
    model_file:        binary (IFC)    # multipart upload
    model_name:        string
    discipline:        enum[ARCHITECTURAL, STRUCTURAL, MEP, COMBINED]
  Response:
    model_id:          string
    version:           string
    element_count:     int
    parse_status:      "PROCESSING"
    estimated_completion: datetime

GET /api/v1/bim/clashes/{model_id}
  Query params:
    severity:          enum[CRITICAL, MAJOR, MINOR] | null
    discipline_pair:   string | null   # e.g., "STRUCTURAL-MECHANICAL"
    status:            enum[OPEN, RESOLVED, ACCEPTED] | null
    page:              int
    page_size:         int
  Response:
    clashes:           [ClashResult]
      clash_id:        string
      element_a_guid:  string
      element_b_guid:  string
      clash_type:      enum[HARD, SOFT, CLEARANCE]
      severity:        enum[CRITICAL, MAJOR, MINOR]
      volume_m3:       float64         # intersection volume
      location:        Point3D
      floor_id:        string
      discipline_a:    string
      discipline_b:    string
      suggested_resolution: string | null
      status:          enum[OPEN, RESOLVED, ACCEPTED]
    total_count:       int
    page:              int
```

### Safety Monitoring API

```
GET /api/v1/safety/alerts/{site_id}
  Query params:
    from:              datetime
    to:                datetime
    severity:          enum[CRITICAL, WARNING, INFORMATIONAL] | null
    event_type:        enum[...] | null
    zone_id:           string | null
  Response:
    alerts:            [SafetyEvent]
    summary:
      total:           int
      by_severity:     map[string, int]
      by_type:         map[string, int]
      by_zone:         map[string, int]

POST /api/v1/safety/zones/{site_id}
  Request:
    zone_name:         string
    zone_type:         enum[EXCLUSION, RESTRICTED, HARD_HAT_REQUIRED, HARNESS_REQUIRED]
    boundary:          [Point2D]       # polygon vertices in site coordinates
    floor_id:          string
    active_hours:      TimeRange | null
    authorized_trades: [string] | null
  Response:
    zone_id:           string
    status:            "ACTIVE"

GET /api/v1/safety/analytics/{site_id}
  Query params:
    period:            enum[DAY, WEEK, MONTH]
  Response:
    leading_indicators:
      near_miss_rate:  float64         # per 1,000 worker-hours
      ppe_compliance:  float64         # percentage
      zone_violation_rate: float64
      housekeeping_score: float64
    trailing_indicators:
      incident_count:  int
      lost_time_incidents: int
      severity_rate:   float64
    trend:             enum[IMPROVING, STABLE, DETERIORATING]
    high_risk_zones:   [ZoneRiskScore]
```

### Cost Estimation API

```
POST /api/v1/cost/estimates
  Request:
    project_id:        string
    bim_model_version: string
    estimate_stage:    enum[...]
    market_region:     string          # for regional pricing
    project_type:      string          # commercial, residential, industrial, etc.
    target_date:       date            # for escalation calculation
  Response:
    estimate_id:       string
    status:            "PROCESSING"
    estimated_completion: datetime

GET /api/v1/cost/estimates/{estimate_id}
  Response:
    estimate:          CostEstimate
    comparison:        EstimateComparison | null  # vs previous version
      added_cost:      decimal
      removed_cost:    decimal
      changed_cost:    decimal
      net_change:      decimal
      changed_elements: [ElementCostChange]
```

---

## Core Algorithms

### Algorithm 1: BIM Clash Detection with ML Relevance Filtering

```
FUNCTION detect_clashes(model, changed_elements):
    # Phase 1: Spatial indexing
    IF changed_elements IS NOT NULL:
        # Incremental: only test changed elements against neighbors
        candidates = spatial_index.query_neighbors(changed_elements, buffer=0.1m)
    ELSE:
        # Full scan: rebuild spatial index
        spatial_index = build_rtree(model.elements)
        candidates = spatial_index.find_all_intersecting_pairs()

    # Phase 2: Geometric intersection testing
    raw_clashes = []
    FOR EACH (elem_a, elem_b) IN candidates:
        intersection = compute_boolean_intersection(elem_a.geometry, elem_b.geometry)
        IF intersection.volume > 0:
            raw_clashes.append(Clash(elem_a, elem_b, intersection))

    # Phase 3: ML relevance filtering
    filtered_clashes = []
    FOR EACH clash IN raw_clashes:
        features = extract_clash_features(clash):
            # Element types (wall-pipe vs beam-duct)
            # Intersection volume relative to element sizes
            # Discipline pair (structural-MEP, architectural-electrical)
            # Historical resolution patterns for similar clashes
            # Construction sequence (will clash exist during construction?)
            # Tolerance standards for this element pair

        relevance_score = clash_relevance_model.predict(features)

        IF relevance_score > RELEVANCE_THRESHOLD:
            clash.severity = classify_severity(clash, relevance_score)
            clash.suggested_resolution = generate_resolution(clash)
            filtered_clashes.append(clash)

    # Phase 4: Cluster related clashes
    clash_clusters = cluster_by_location_and_system(filtered_clashes)

    RETURN clash_clusters, filtering_stats
```

### Algorithm 2: Progress Detection via BIM-to-Reality Comparison

```
FUNCTION detect_progress(point_cloud, bim_model, previous_state):
    # Phase 1: Point cloud registration to BIM coordinates
    registered_cloud = register_to_bim(point_cloud, bim_model):
        # Coarse: GPS/reference point alignment
        # Fine: ICP against known structural elements
        # Validate: registration error < 2 cm RMS

    # Phase 2: Element-level comparison
    element_states = []
    FOR EACH element IN bim_model.elements:
        # Extract points within element bounding box (expanded by tolerance)
        local_points = registered_cloud.query_bbox(element.bbox, expand=0.05m)

        IF local_points.count < MIN_POINT_THRESHOLD:
            # Insufficient data — occlusion or element not visible
            state = previous_state.get(element.guid, NOT_STARTED)
            confidence = LOW
        ELSE:
            # Compute geometric similarity
            coverage = compute_surface_coverage(local_points, element.geometry)
            material_match = classify_material(local_points.colors, element.material)

            # Decision logic
            IF coverage > 0.8 AND material_match.confidence > 0.7:
                state = COMPLETE
                confidence = min(coverage, material_match.confidence)
            ELSE IF coverage > 0.3 OR material_match.confidence > 0.5:
                state = IN_PROGRESS
                completion_pct = estimate_completion(coverage, material_match)
                confidence = MEDIUM
            ELSE:
                state = NOT_STARTED
                confidence = HIGH if local_points.count > 100 else LOW

        element_states.append(ElementState(element.guid, state, confidence))

    # Phase 3: Temporal consistency check
    FOR EACH state IN element_states:
        prev = previous_state.get(state.guid)
        IF prev AND prev.status == COMPLETE AND state.status != COMPLETE:
            # Element was complete yesterday but not detected today
            # Likely occlusion (scaffolding, temporary cover), not demolition
            IF state.confidence == LOW:
                state.status = prev.status  # maintain previous status
                state.flag = OCCLUDED

    # Phase 4: Propagate to schedule
    update_schedule_from_progress(element_states)
    calculate_earned_value(element_states)

    RETURN SiteStateTensor(element_states)
```

### Algorithm 3: Risk-Based Delay Prediction

```
FUNCTION predict_delays(schedule, site_data, external_data):
    risk_scores = []

    FOR EACH activity IN schedule.activities:
        IF activity.status IN [COMPLETE, SUSPENDED]:
            CONTINUE

        # Feature extraction
        features = {}

        # Predecessor health
        features.predecessor_delay_avg = avg(
            (pred.actual_finish - pred.planned_finish).days
            FOR pred IN activity.predecessors
            IF pred.actual_finish IS NOT NULL
        )
        features.predecessor_completion_rate = count(
            pred FOR pred IN activity.predecessors
            IF pred.status == COMPLETE
        ) / count(activity.predecessors)

        # Subcontractor performance
        sub = subcontractor_db.get(activity.trade)
        features.sub_reliability_score = sub.historical_on_time_pct
        features.sub_current_workload = sub.active_projects_count
        features.sub_crew_availability = sub.available_crew_pct

        # Weather impact
        weather = weather_service.forecast(
            activity.site_location,
            activity.planned_start,
            activity.planned_finish
        )
        features.rain_days_pct = weather.rain_probability_days / activity.duration
        features.extreme_temp_days = weather.days_below_0C + weather.days_above_38C
        features.wind_days = weather.days_above_40kmh

        # Material readiness
        materials = material_tracker.get_for_activity(activity.id)
        features.materials_on_site_pct = count(
            m FOR m IN materials IF m.status == ON_SITE
        ) / count(materials)
        features.material_lead_time_risk = max(
            m.expected_delivery - activity.planned_start
            FOR m IN materials IF m.status != ON_SITE
        )

        # Inspection pipeline
        features.pending_inspections = count(
            insp FOR insp IN activity.required_inspections
            IF insp.status == PENDING
        )
        features.avg_inspection_wait_days = site_data.avg_inspection_turnaround

        # Historical patterns
        features.project_type = site_data.project_type
        features.activity_type = activity.wbs_category
        features.season = get_season(activity.planned_start)
        features.project_pct_complete = site_data.overall_progress

        # Predict delay probability
        delay_probability = delay_model.predict_probability(features)
        delay_duration_est = delay_model.predict_duration(features)

        # Critical path impact
        cp_impact = calculate_cp_impact(activity, delay_duration_est, schedule)

        risk_scores.append(ActivityRisk(
            activity_id=activity.id,
            delay_probability=delay_probability,
            estimated_delay_days=delay_duration_est,
            critical_path_impact_days=cp_impact,
            top_risk_factors=get_top_factors(features, delay_model),
            recommended_mitigations=generate_mitigations(features)
        ))

    # Sort by impact (probability × critical path impact)
    risk_scores.sort(key=lambda r: r.delay_probability * r.critical_path_impact_days, reverse=True)

    RETURN risk_scores
```

### Algorithm 4: Constraint-Based Crew Optimization

```
FUNCTION optimize_crew_assignments(activities, crews, constraints):
    # Mixed-integer programming formulation
    model = MIP_Model()

    # Decision variables: assign[crew_c, activity_a, day_d] ∈ {0, 1}
    FOR EACH crew IN crews:
        FOR EACH activity IN eligible_activities(crew):
            FOR EACH day IN planning_horizon:
                assign[crew, activity, day] = model.binary_var()

    # Objective: minimize total project duration + overtime cost
    model.minimize(
        weighted_sum(
            project_completion_day,
            total_overtime_hours * OVERTIME_COST_MULTIPLIER,
            total_mobilization_events * MOBILIZATION_COST
        )
    )

    # Constraint 1: Each activity gets required crew-days
    FOR EACH activity IN activities:
        model.add_constraint(
            sum(assign[crew, activity, day] FOR crew, day)
            >= activity.required_crew_days
        )

    # Constraint 2: Crew can only be in one place per day
    FOR EACH crew IN crews:
        FOR EACH day IN planning_horizon:
            model.add_constraint(
                sum(assign[crew, activity, day] FOR activity) <= 1
            )

    # Constraint 3: Predecessor completion required
    FOR EACH activity IN activities:
        FOR EACH pred IN activity.predecessors:
            model.add_constraint(
                activity.start_day >= pred.finish_day + pred.lag_days
            )

    # Constraint 4: Spatial deconfliction (max workers per zone)
    FOR EACH zone IN zones:
        FOR EACH day IN planning_horizon:
            model.add_constraint(
                sum(crew.size * assign[crew, activity, day]
                    FOR crew, activity
                    WHERE activity.zone == zone)
                <= zone.max_occupancy
            )

    # Constraint 5: Fatigue limits (max consecutive days)
    FOR EACH crew IN crews:
        FOR EACH day_window IN sliding_windows(planning_horizon, MAX_CONSECUTIVE_DAYS):
            model.add_constraint(
                sum(assign[crew, ANY, day] FOR day IN day_window)
                <= MAX_CONSECUTIVE_DAYS - REST_DAYS_REQUIRED
            )

    # Constraint 6: Certification requirements
    FOR EACH activity IN activities:
        FOR EACH crew IN crews:
            IF NOT crew.has_certifications(activity.required_certs):
                FOR EACH day IN planning_horizon:
                    model.add_constraint(assign[crew, activity, day] == 0)

    # Solve
    solution = model.solve(time_limit=300_seconds)

    RETURN extract_schedule(solution, assign)
```
