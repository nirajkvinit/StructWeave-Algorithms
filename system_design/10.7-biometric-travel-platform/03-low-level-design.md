# Low-Level Design — Biometric Travel Platform

## 1. Data Models

### 1.1 Passenger Identity

```
PassengerIdentity:
  passenger_did: string         # W3C Decentralized Identifier (did:key:z6Mk...)
  enrollment_id: UUID           # Internal enrollment reference
  enrollment_method: enum       # KIOSK | MOBILE | COUNTER | AADHAAR_EKYC
  document_type: enum           # PASSPORT | NATIONAL_ID | AADHAAR
  document_hash: string         # SHA-256 of document MRZ data (no PII stored)
  nationality_code: string      # ISO 3166-1 alpha-3
  template_reference: string    # Pointer to encrypted template in biometric store
  template_algorithm: string    # Algorithm version (e.g., "facenet_v3.2")
  template_quality_score: float # ISO 29794-5 quality score (0-100)
  enrollment_timestamp: datetime
  enrollment_airport: string    # IATA airport code
  enrollment_touchpoint_id: string
  credential_id: string         # W3C VC identifier
  credential_expiry: datetime
  status: enum                  # ACTIVE | REVOKED | EXPIRED | SUSPENDED
  created_at: datetime
  updated_at: datetime

  Indexes:
    PRIMARY KEY (enrollment_id)
    UNIQUE INDEX (passenger_did)
    INDEX (enrollment_airport, enrollment_timestamp)
    INDEX (status, credential_expiry)
```

### 1.2 Verifiable Credential

```
VerifiableCredential:
  credential_id: string         # Unique VC identifier (URN)
  issuer_did: string            # DID of enrollment authority
  subject_did: string           # DID of passenger wallet
  issuance_date: datetime
  expiration_date: datetime
  credential_type: array        # ["VerifiableCredential", "BiometricTravelCredential"]

  credential_subject:
    template_hash: string       # SHA-256 of biometric template
    document_type: string       # Type of verified document
    document_issuer_country: string
    enrollment_method: string
    enrollment_authority: string
    # Selective disclosure fields (revealed only with ZKP):
    nationality: string         # Only revealed to immigration
    date_of_birth: string       # Only revealed when age verification needed
    gender: string              # Only revealed when required by destination

  proof:
    type: string                # "Ed25519Signature2020"
    created: datetime
    verification_method: string # DID URL of signing key
    proof_purpose: string       # "assertionMethod"
    proof_value: string         # Base64-encoded signature

  blockchain_anchor:
    chain_id: string
    transaction_hash: string
    block_number: integer
    anchor_timestamp: datetime

  revocation_status:
    revocation_registry: string # URI of revocation registry
    credential_index: integer   # Index in revocation bitstring
    is_revoked: boolean
```

### 1.3 Consent Record

```
ConsentRecord:
  consent_id: UUID
  passenger_did: string
  enrollment_id: UUID
  consent_version: string       # Consent policy version accepted
  granted_at: datetime
  revoked_at: datetime          # NULL if still active
  revocation_reason: string     # NULL if still active

  permissions:
    enrollment: boolean         # Allow initial biometric capture
    checkin_verification: boolean
    bagdrop_verification: boolean
    security_verification: boolean
    immigration_verification: boolean
    boarding_verification: boolean
    analytics_aggregated: boolean  # Allow anonymized flow analytics

  legal_basis: enum             # EXPLICIT_CONSENT (GDPR Art 9.2a)
  data_controller: string       # Airport/airline entity
  retention_period: string      # "24h_after_flight" or "immediate_on_revocation"

  audit_chain:
    previous_consent_hash: string  # Hash chain for tamper evidence
    consent_hash: string           # SHA-256 of this record

  Indexes:
    PRIMARY KEY (consent_id)
    INDEX (passenger_did, granted_at)
    INDEX (enrollment_id)
    INDEX (revoked_at) WHERE revoked_at IS NULL  # Active consents
```

### 1.4 Journey Record

```
JourneyRecord:
  journey_id: UUID
  passenger_did: string
  flight_number: string
  flight_date: date
  departure_airport: string     # IATA code
  arrival_airport: string
  journey_start: datetime
  journey_end: datetime
  journey_status: enum          # IN_PROGRESS | COMPLETED | ABANDONED | MANUAL_FALLBACK
  biometric_enabled: boolean

  touchpoint_events: array of TouchpointEvent

TouchpointEvent:
  event_id: UUID
  journey_id: UUID
  touchpoint_type: enum         # ENROLLMENT | CHECKIN | BAGDROP | SECURITY | IMMIGRATION | BOARDING
  touchpoint_id: string         # Physical device identifier
  timestamp: datetime
  verification_method: enum     # BIOMETRIC_1_1 | BIOMETRIC_1_N | MANUAL | BYPASSED
  match_score: float            # Biometric confidence (0.0-1.0), NULL for manual
  match_decision: enum          # ACCEPT | REJECT | MANUAL_REVIEW
  liveness_score: float         # Anti-spoofing confidence
  processing_time_ms: integer   # Total touchpoint processing time
  edge_node_id: string          # Which edge node processed this
  attestation_signature: string # HSM-signed result attestation
  fallback_reason: string       # NULL unless manual fallback

  Indexes:
    PRIMARY KEY (event_id)
    INDEX (journey_id, timestamp)
    INDEX (touchpoint_id, timestamp)
    INDEX (flight_number, flight_date)
```

### 1.5 Flight Gallery

```
FlightGallery:
  gallery_id: UUID
  flight_number: string
  flight_date: date
  departure_airport: string
  gate_assignment: string
  gallery_status: enum          # BUILDING | ACTIVE | UPDATING | PURGING | PURGED
  created_at: datetime
  activated_at: datetime
  purged_at: datetime

  templates: array of GalleryEntry

GalleryEntry:
  enrollment_id: UUID
  template_encrypted: bytes     # AES-256-GCM encrypted template
  template_hash: string         # For integrity verification
  passenger_name_hash: string   # For display on gate (hashed, decrypted at edge)
  seat_assignment: string
  boarding_group: string
  added_at: datetime

  gallery_metadata:
    total_passengers: integer
    enrolled_count: integer     # How many have biometric enrollment
    coverage_percentage: float  # enrolled / total
    gallery_size_bytes: integer
    last_update: datetime
    distributed_to: array of string  # Edge node IDs that have this gallery

  Indexes:
    PRIMARY KEY (gallery_id)
    INDEX (flight_number, flight_date)
    INDEX (gallery_status)
    INDEX (gate_assignment, departure_airport)
```

### 1.6 Touchpoint Edge Node

```
EdgeNodeRegistry:
  node_id: string               # Unique hardware identifier
  airport_code: string
  terminal: string
  zone: enum                    # LANDSIDE | SECURITY | AIRSIDE
  touchpoint_type: enum
  gate_or_lane: string          # Physical location identifier
  hardware_model: string
  inference_accelerator: string # NPU/TPU model
  camera_model: string
  model_version: string         # Currently deployed ML model version
  certificate_thumbprint: string
  last_heartbeat: datetime
  status: enum                  # ONLINE | OFFLINE | MAINTENANCE | DEGRADED
  active_gallery_ids: array     # Currently loaded galleries
  gpu_utilization: float
  match_count_today: integer
  error_count_today: integer

  Indexes:
    PRIMARY KEY (node_id)
    INDEX (airport_code, terminal, touchpoint_type)
    INDEX (status)
```

---

## 2. API Contracts

### 2.1 Enrollment API

```
POST /api/v1/enrollment/initiate
  Request:
    document_type: string       # "PASSPORT" | "NATIONAL_ID" | "AADHAAR"
    document_data:
      mrz_data: string          # Machine-readable zone content
      nfc_chip_data: bytes      # e-Passport chip data (optional)
      document_photo: bytes     # Photo extracted from document
    live_capture:
      image: bytes              # Live facial image (JPEG, min 640x480)
      capture_metadata:
        camera_id: string
        illumination_type: string
        capture_timestamp: datetime
    consent:
      permissions: object       # Per-touchpoint consent flags
      policy_version: string
    wallet_did: string          # Passenger's decentralized identifier

  Response (201 Created):
    enrollment_id: UUID
    credential:                 # W3C Verifiable Credential (JSON-LD)
      @context: array
      type: array
      issuer: string
      issuanceDate: string
      credentialSubject: object
      proof: object
    template_encrypted: bytes   # For wallet secure enclave storage
    template_encryption_key: bytes  # Wrapped with wallet public key
    match_result:
      score: float
      decision: string
      liveness_score: float
    consent_id: UUID

  Error Responses:
    400: Invalid document data or image quality too low
    409: Passenger already enrolled (re-enrollment required)
    422: Liveness detection failed (suspected presentation attack)
    503: Enrollment service temporarily unavailable
```

### 2.2 Verification API (Edge-to-Cloud Fallback)

```
POST /api/v1/verify/biometric
  Request:
    touchpoint_id: string
    verification_type: string   # "ONE_TO_ONE" | "ONE_TO_N"
    live_template: bytes        # Extracted template (encrypted in transit)
    credential_presentation:    # W3C Verifiable Presentation
      verifiable_credential: object
      proof: object
    gallery_id: UUID            # Required for 1:N, optional for 1:1
    session_id: UUID            # Journey session identifier

  Response (200 OK):
    verification_id: UUID
    decision: string            # "ACCEPT" | "REJECT" | "MANUAL_REVIEW"
    match_result:
      score: float              # Cosine similarity (0.0-1.0)
      rank: integer             # Position in gallery (1:N only)
      gallery_size: integer     # Gallery size at time of match
      second_best_score: float  # For uniqueness verification
    liveness_result:
      score: float
      attacks_detected: array   # Empty if none
    credential_result:
      valid: boolean
      issuer: string
      expiry: datetime
      revocation_checked: boolean
    processing_time_ms: integer
    attestation: string         # Signed result for downstream touchpoints

  Error Responses:
    401: Touchpoint not authenticated
    404: Gallery not found (1:N mode)
    408: Verification timeout
    422: Image quality insufficient
```

### 2.3 Gallery Management API

```
POST /api/v1/galleries
  Request:
    flight_number: string
    flight_date: date
    gate_assignment: string
    departure_time: datetime
    target_edge_nodes: array    # Edge node IDs for distribution

  Response (202 Accepted):
    gallery_id: UUID
    status: "BUILDING"
    estimated_completion: datetime

GET /api/v1/galleries/{gallery_id}
  Response (200 OK):
    gallery_id: UUID
    status: string
    total_passengers: integer
    enrolled_count: integer
    coverage_percentage: float
    distributed_to: array
    last_update: datetime

POST /api/v1/galleries/{gallery_id}/distribute
  Request:
    target_edge_nodes: array
  Response (202 Accepted):
    distribution_status: "IN_PROGRESS"
    estimated_completion: datetime

DELETE /api/v1/galleries/{gallery_id}
  Response (202 Accepted):
    purge_status: "INITIATED"
    # Gallery data securely deleted from all edge nodes
```

### 2.4 Consent Management API

```
POST /api/v1/consent
  Request:
    passenger_did: string
    enrollment_id: UUID
    permissions: object         # Per-touchpoint flags
    policy_version: string

  Response (201 Created):
    consent_id: UUID
    granted_at: datetime

DELETE /api/v1/consent/{consent_id}
  Request:
    passenger_did: string       # Must match consent owner
    revocation_reason: string
    signature: string           # Signed by passenger DID key

  Response (200 OK):
    revoked_at: datetime
    template_deletion_status: "INITIATED"
    gallery_removal_status: "INITIATED"
    propagation_eta: datetime   # When all touchpoints will be updated

GET /api/v1/consent/{passenger_did}/status
  Response (200 OK):
    consents: array
      - consent_id: UUID
        status: string          # "ACTIVE" | "REVOKED"
        permissions: object
        granted_at: datetime
        data_locations: array   # Where biometric data currently exists
        deletion_schedule: datetime  # When data will be auto-deleted
```

### 2.5 Journey Orchestration API

```
POST /api/v1/journeys
  Request:
    passenger_did: string
    flight_number: string
    flight_date: date
    biometric_enabled: boolean

  Response (201 Created):
    journey_id: UUID
    touchpoint_sequence: array  # Expected touchpoint order
    biometric_status: string    # "ENROLLED" | "NOT_ENROLLED"

GET /api/v1/journeys/{journey_id}/status
  Response (200 OK):
    journey_id: UUID
    current_stage: string       # Last cleared touchpoint
    next_expected: string       # Next touchpoint in sequence
    cleared_touchpoints: array
    pending_touchpoints: array
    dwell_time: object          # Time between touchpoints
    alerts: array               # "LAST_CALL", "GATE_CHANGE", etc.

POST /api/v1/journeys/{journey_id}/events
  Request:
    touchpoint_type: string
    touchpoint_id: string
    verification_result: object
    timestamp: datetime

  Response (200 OK):
    journey_status: string
    next_action: string         # "PROCEED" | "MANUAL_REVIEW" | "HOLD"
```

---

## 3. Core Algorithms

### 3.1 Facial Recognition Pipeline

```
ALGORITHM FacialRecognitionPipeline(camera_frame, mode, gallery=None):
    // Step 1: Face Detection (MTCNN or RetinaFace)
    faces = DetectFaces(camera_frame)
    IF faces.count == 0:
        RETURN Error("NO_FACE_DETECTED")
    IF faces.count > 1:
        face = SelectLargestFace(faces)  // Closest to camera
    ELSE:
        face = faces[0]

    // Step 2: Quality Assessment (ISO 29794-5)
    quality = AssessQuality(face)
    IF quality.overall_score < QUALITY_THRESHOLD:
        hints = GenerateQualityHints(quality)
        // hints: "move_closer", "face_camera", "remove_glasses", "improve_lighting"
        RETURN Error("LOW_QUALITY", hints)

    // Step 3: Face Alignment
    landmarks = DetectLandmarks(face)  // 68-point or 5-point
    aligned_face = AffineTransform(face, landmarks, TARGET_SIZE=112x112)

    // Step 4: Liveness Detection (parallel with template extraction)
    liveness_future = ASYNC LivenessDetection(camera_frame, face)

    // Step 5: Template Extraction (deep neural network)
    // Input: 112x112 aligned face image
    // Output: 512-dimensional L2-normalized feature vector
    template = FaceNet_Forward(aligned_face)
    template = L2Normalize(template)

    // Step 6: Wait for liveness result
    liveness_result = AWAIT liveness_future
    IF liveness_result.score < LIVENESS_THRESHOLD:
        LogSecurityEvent("PRESENTATION_ATTACK", liveness_result.attack_type)
        RETURN Error("LIVENESS_FAILED", liveness_result.attack_type)

    // Step 7: Matching
    IF mode == "ONE_TO_ONE":
        enrolled_template = DecryptTemplate(credential.template_encrypted)
        score = CosineSimilarity(template, enrolled_template)
        decision = score >= MATCH_THRESHOLD_1_1  // Typically 0.65-0.75
        RETURN MatchResult(score, decision, liveness_result.score)

    ELSE IF mode == "ONE_TO_N":
        // Batch comparison against flight gallery
        scores = BatchCosineSimilarity(template, gallery.templates)
        ranked = SortDescending(scores)

        top_score = ranked[0].score
        second_score = ranked[1].score IF ranked.length > 1 ELSE 0

        // Uniqueness check: top match must be significantly better than second
        score_gap = top_score - second_score
        decision = (top_score >= MATCH_THRESHOLD_1_N) AND (score_gap >= MIN_SCORE_GAP)

        RETURN GalleryMatchResult(
            matched_enrollment_id = ranked[0].enrollment_id,
            score = top_score,
            rank = 1,
            score_gap = score_gap,
            decision = decision,
            gallery_size = gallery.templates.length
        )
```

### 3.2 Liveness Detection (Anti-Spoofing)

```
ALGORITHM LivenessDetection(frame, face_region):
    results = {}

    // Passive Liveness Checks (run in parallel)
    // Check 1: Texture analysis (detect printed photos, screens)
    texture_score = TextureCNN_Forward(face_region)
    // Printed photos have different micro-texture patterns than real skin
    results["texture"] = texture_score

    // Check 2: Depth estimation (detect flat surfaces)
    depth_map = MonocularDepthEstimation(face_region)
    depth_variance = ComputeDepthVariance(depth_map, face_landmarks)
    // Real faces have 3D depth variation; photos/screens are flat
    results["depth"] = NormalizeScore(depth_variance)

    // Check 3: Reflection analysis (detect screen replay)
    specular_patterns = DetectSpecularReflection(face_region)
    // Screens produce uniform specular reflections; real skin does not
    results["reflection"] = 1.0 - specular_patterns.screen_probability

    // Check 4: Moire pattern detection (detect screen display)
    moire_score = DetectMoirePattern(frame, face_region)
    results["moire"] = 1.0 - moire_score

    // Check 5: Color space analysis
    // Real skin has specific chromatic distribution in YCbCr space
    skin_score = SkinChrominanceAnalysis(face_region)
    results["skin_color"] = skin_score

    // Ensemble scoring
    weights = {texture: 0.30, depth: 0.25, reflection: 0.20, moire: 0.15, skin_color: 0.10}
    final_score = WeightedSum(results, weights)

    // Determine attack type if score is low
    attack_type = None
    IF final_score < LIVENESS_THRESHOLD:
        IF results["moire"] < 0.3:
            attack_type = "SCREEN_REPLAY"
        ELSE IF results["depth"] < 0.3:
            attack_type = "PRINTED_PHOTO"
        ELSE IF results["texture"] < 0.3:
            attack_type = "3D_MASK"
        ELSE:
            attack_type = "UNKNOWN"

    RETURN LivenessResult(
        score = final_score,
        is_live = final_score >= LIVENESS_THRESHOLD,
        component_scores = results,
        attack_type = attack_type
    )
```

### 3.3 Gallery Construction and Distribution

```
ALGORITHM BuildFlightGallery(flight_number, flight_date, gate_assignment):
    // Step 1: Get passenger manifest from airline DCS
    manifest = QueryDCS(flight_number, flight_date)
    passengers = manifest.passengers  // List of PNR references

    // Step 2: Resolve enrolled passengers
    gallery_entries = []
    FOR passenger IN passengers:
        enrollment = LookupEnrollment(passenger.document_hash)
        IF enrollment IS NOT None AND enrollment.status == ACTIVE:
            consent = CheckConsent(enrollment.enrollment_id, "boarding_verification")
            IF consent.granted:
                entry = GalleryEntry(
                    enrollment_id = enrollment.enrollment_id,
                    template_encrypted = FetchEncryptedTemplate(enrollment.template_reference),
                    template_hash = enrollment.template_hash,
                    passenger_name_hash = Hash(passenger.name),
                    seat_assignment = passenger.seat,
                    boarding_group = passenger.boarding_group
                )
                gallery_entries.APPEND(entry)

    // Step 3: Create gallery record
    gallery = FlightGallery(
        gallery_id = GenerateUUID(),
        flight_number = flight_number,
        flight_date = flight_date,
        gate_assignment = gate_assignment,
        templates = gallery_entries,
        gallery_status = BUILDING
    )

    // Step 4: Determine target edge nodes
    target_nodes = GetEdgeNodesForGate(gate_assignment)

    // Step 5: Distribute to edge nodes
    FOR node IN target_nodes:
        // Encrypt gallery with node-specific transport key
        encrypted_gallery = EncryptForNode(gallery.templates, node.transport_key)
        success = DistributeToNode(node.node_id, encrypted_gallery)
        IF success:
            gallery.distributed_to.APPEND(node.node_id)

    gallery.gallery_status = ACTIVE
    gallery.activated_at = NOW()
    SaveGallery(gallery)

    // Step 6: Schedule auto-purge
    purge_time = manifest.departure_time + 30_MINUTES
    ScheduleTask("PurgeGallery", gallery.gallery_id, purge_time)

    RETURN gallery

ALGORITHM IncrementalGalleryUpdate(gallery_id, new_enrollment):
    gallery = LoadGallery(gallery_id)
    IF gallery.gallery_status != ACTIVE:
        RETURN Error("GALLERY_NOT_ACTIVE")

    entry = CreateGalleryEntry(new_enrollment)
    gallery.templates.APPEND(entry)
    gallery.last_update = NOW()

    // Push incremental update to distributed nodes
    FOR node_id IN gallery.distributed_to:
        PushIncrementalUpdate(node_id, gallery_id, entry)

    SaveGallery(gallery)
```

### 3.4 Credential Verification Pipeline

```
ALGORITHM VerifyCredential(verifiable_presentation):
    // Step 1: Parse and validate structure
    vp = ParseVerifiablePresentation(verifiable_presentation)
    vc = vp.verifiable_credential

    // Step 2: Check credential type
    IF "BiometricTravelCredential" NOT IN vc.type:
        RETURN Error("INVALID_CREDENTIAL_TYPE")

    // Step 3: Check expiration
    IF vc.expiration_date < NOW():
        RETURN CredentialResult(valid=False, reason="EXPIRED")

    // Step 4: Resolve issuer DID and get public key
    issuer_did_document = ResolveDID(vc.issuer)
    // Cache DID documents for 1 hour to reduce resolution latency
    IF issuer_did_document IS None:
        // Try cached version for offline resilience
        issuer_did_document = GetCachedDIDDocument(vc.issuer)
        IF issuer_did_document IS None:
            RETURN Error("ISSUER_DID_UNRESOLVABLE")

    // Step 5: Verify issuer is trusted
    IF vc.issuer NOT IN TRUSTED_ISSUER_REGISTRY:
        RETURN CredentialResult(valid=False, reason="UNTRUSTED_ISSUER")

    // Step 6: Verify credential signature
    verification_key = ExtractVerificationKey(issuer_did_document, vc.proof.verification_method)
    signature_valid = VerifySignature(
        payload = Canonicalize(vc),  // JSON-LD canonicalization
        signature = vc.proof.proof_value,
        public_key = verification_key
    )
    IF NOT signature_valid:
        RETURN CredentialResult(valid=False, reason="INVALID_SIGNATURE")

    // Step 7: Verify presentation proof (holder binding)
    holder_key = ExtractVerificationKey(
        ResolveDID(vp.holder),
        vp.proof.verification_method
    )
    presentation_valid = VerifySignature(
        payload = Canonicalize(vp),
        signature = vp.proof.proof_value,
        public_key = holder_key
    )
    IF NOT presentation_valid:
        RETURN CredentialResult(valid=False, reason="HOLDER_BINDING_FAILED")

    // Step 8: Check revocation status
    revocation_status = CheckRevocationRegistry(
        vc.revocation_status.revocation_registry,
        vc.revocation_status.credential_index
    )
    IF revocation_status.is_revoked:
        RETURN CredentialResult(valid=False, reason="REVOKED")

    // Step 9: Verify template hash binding
    // This ensures the credential is bound to a specific biometric template
    template_hash_valid = (vc.credential_subject.template_hash IS NOT None)

    RETURN CredentialResult(
        valid = True,
        issuer = vc.issuer,
        subject_did = vc.credential_subject.id,
        template_hash = vc.credential_subject.template_hash,
        expiry = vc.expiration_date,
        selective_disclosure_available = HasSelectiveDisclosureClaims(vc)
    )
```

### 3.5 Touchpoint Orchestration State Machine

```
ALGORITHM JourneyStateMachine(journey_id, event):
    journey = LoadJourney(journey_id)

    // State transition table
    VALID_TRANSITIONS = {
        CREATED:     [ENROLLED, CHECKED_IN],      // Can enroll or check in without biometric
        ENROLLED:    [CHECKED_IN],
        CHECKED_IN:  [BAG_DROPPED, SECURITY_CLEARED],  // Bag drop is optional
        BAG_DROPPED: [SECURITY_CLEARED],
        SECURITY_CLEARED: [IMMIGRATION_CLEARED, BOARDING_READY],  // Immigration for international
        IMMIGRATION_CLEARED: [BOARDING_READY],
        BOARDING_READY: [BOARDED],
        BOARDED:     [COMPLETED]                   // Flight departed
    }

    current_state = journey.current_stage
    target_state = MapEventToState(event.touchpoint_type, event.match_decision)

    // Validate transition
    IF target_state NOT IN VALID_TRANSITIONS[current_state]:
        // Check for out-of-order but acceptable transitions
        IF IsAcceptableSkip(current_state, target_state):
            LogWarning("TOUCHPOINT_SKIP", current_state, target_state)
        ELSE:
            LogAlert("INVALID_JOURNEY_TRANSITION", journey_id, current_state, target_state)
            RETURN JourneyAction(action="HOLD", reason="INVALID_SEQUENCE")

    // Apply state transition
    journey.current_stage = target_state
    journey.touchpoint_events.APPEND(event)
    journey.updated_at = NOW()
    SaveJourney(journey)

    // Trigger downstream actions
    SWITCH target_state:
        CASE ENROLLED:
            NotifyGalleryManager(journey.flight_number, journey.passenger_did)
        CASE SECURITY_CLEARED:
            NotifyImmigration(journey) IF journey.is_international
            UpdateAirlineDCS(journey, "SECURITY_CLEARED")
        CASE BOARDING_READY:
            UpdateAirlineDCS(journey, "READY_TO_BOARD")
        CASE BOARDED:
            ScheduleTemplateDeletion(journey.passenger_did, journey.flight_departure + 24_HOURS)
        CASE COMPLETED:
            EmitJourneyCompleted(journey)

    // Calculate dwell time alerts
    IF target_state IN [SECURITY_CLEARED, IMMIGRATION_CLEARED]:
        estimated_gate_time = EstimateWalkTime(event.touchpoint_id, journey.gate)
        IF (journey.flight_departure - NOW()) < estimated_gate_time + 15_MINUTES:
            EmitAlert("LAST_CALL", journey)

    RETURN JourneyAction(action="PROCEED", next_touchpoint=GetNextTouchpoint(journey))
```

---

## 4. Schema Design

### 4.1 Biometric Store Schema (Encrypted Document Store)

```
Collection: biometric_templates
{
  _id: enrollment_id,
  encrypted_template: BinData,     // AES-256-GCM encrypted
  encryption_key_id: string,        // Reference to key in passenger wallet
  algorithm_version: string,
  quality_score: float,
  created_at: ISODate,
  auto_delete_at: ISODate,          // TTL index for auto-deletion
  deletion_proof: {                  // Populated after deletion
    deleted_at: ISODate,
    deletion_hash: string,           // Proof that data existed and was deleted
    deleted_by: string               // "auto_ttl" | "consent_revocation" | "manual"
  }
}
TTL Index: auto_delete_at (auto-deletes documents when TTL expires)
```

### 4.2 Journey Events Schema (Time-Series Optimized)

```
Table: journey_events
  Partitioned by: (airport_code, event_date)
  Sorted by: (journey_id, event_timestamp)

Columns:
  event_id          UUID            NOT NULL
  journey_id        UUID            NOT NULL
  airport_code      VARCHAR(3)      NOT NULL
  event_date        DATE            NOT NULL
  event_timestamp   TIMESTAMP       NOT NULL
  touchpoint_type   VARCHAR(20)     NOT NULL
  touchpoint_id     VARCHAR(50)     NOT NULL
  verification_method VARCHAR(20)
  match_score       DECIMAL(5,4)
  match_decision    VARCHAR(20)
  liveness_score    DECIMAL(5,4)
  processing_time_ms INTEGER
  edge_node_id      VARCHAR(50)
  attestation_sig   TEXT

Indexes:
  PRIMARY KEY (airport_code, event_date, event_id)
  INDEX idx_journey (journey_id, event_timestamp)
  INDEX idx_touchpoint (touchpoint_id, event_timestamp)
  INDEX idx_flight (flight_number, flight_date)
```

### 4.3 Consent Audit Store (Append-Only, Tamper-Evident)

```
Table: consent_audit_log
  Storage: Append-only (no updates or deletes)
  Retention: 7 years minimum

Columns:
  sequence_number   BIGSERIAL       PRIMARY KEY
  consent_id        UUID            NOT NULL
  passenger_did     VARCHAR(200)    NOT NULL
  action            VARCHAR(20)     NOT NULL  -- GRANT | REVOKE | MODIFY
  permissions       JSONB           NOT NULL
  action_timestamp  TIMESTAMP       NOT NULL
  action_source     VARCHAR(50)     -- "wallet_app" | "consent_dashboard" | "auto_expiry"
  previous_hash     VARCHAR(64)     -- SHA-256 of previous record (hash chain)
  record_hash       VARCHAR(64)     NOT NULL  -- SHA-256 of this record
  signature         TEXT            -- Signed by consent manager HSM

Indexes:
  INDEX idx_passenger (passenger_did, action_timestamp)
  INDEX idx_consent (consent_id, sequence_number)
```

---

## 5. Edge Node Communication Protocol

### 5.1 Edge-to-Cloud Protocol

```
Message Format (Protocol Buffers):

message VerificationEvent {
  string event_id = 1;
  string touchpoint_id = 2;
  string edge_node_id = 3;
  int64 timestamp_ms = 4;

  oneof verification {
    OneToOneResult one_to_one = 5;
    OneToNResult one_to_n = 6;
    ManualFallback manual = 7;
  }

  LivenessResult liveness = 8;
  bytes attestation_signature = 9;  // HSM-signed
  int32 processing_time_ms = 10;
}

message OneToOneResult {
  string enrollment_id = 1;
  float match_score = 2;
  bool decision = 3;
  string credential_id = 4;
}

message OneToNResult {
  string matched_enrollment_id = 1;
  float top_score = 2;
  float second_best_score = 3;
  int32 gallery_size = 4;
  string gallery_id = 5;
  bool decision = 6;
}

message GalleryDistribution {
  string gallery_id = 1;
  string flight_number = 2;
  int32 total_entries = 3;
  repeated GalleryEntryProto entries = 4;
  bytes gallery_encryption_key = 5;  // Encrypted with node transport key
  int64 purge_timestamp_ms = 6;
}
```

### 5.2 Heartbeat and Health Protocol

```
Edge nodes send heartbeat every 30 seconds:

message EdgeHeartbeat {
  string node_id = 1;
  int64 timestamp_ms = 2;
  NodeHealth health = 3;
}

message NodeHealth {
  float cpu_utilization = 1;
  float gpu_utilization = 2;
  float memory_utilization = 3;
  int32 active_gallery_count = 4;
  int32 verifications_last_minute = 5;
  int32 errors_last_minute = 6;
  float average_match_time_ms = 7;
  string model_version = 8;
  CameraStatus camera = 9;
}

message CameraStatus {
  bool operational = 1;
  float ambient_light_lux = 2;
  int32 faces_detected_last_minute = 3;
  float average_quality_score = 4;
}
```

---

*Next: [Deep Dive & Bottlenecks ->](./04-deep-dive-and-bottlenecks.md)*
