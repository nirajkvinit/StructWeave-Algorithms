# Deep Dive & Bottlenecks — Biometric Travel Platform

## 1. Biometric Matching Engine Deep Dive

### 1.1 Facial Recognition Model Architecture

The biometric matching engine is the core computational component, responsible for converting raw facial images into compact feature vectors and comparing them with high accuracy and low latency.

**Model Pipeline:**

```
Input Image (112x112 RGB)
    |
    v
+-----------------------------------+
| Backbone Network                   |
| (Modified ResNet-100 or ArcFace)  |
| - Conv layers with residual blocks |
| - Batch normalization              |
| - PReLU activation                 |
| Output: 25088-dim feature map      |
+-----------------------------------+
    |
    v
+-----------------------------------+
| Embedding Layer                    |
| - Fully connected: 25088 -> 512   |
| - Batch normalization              |
| - L2 normalization                 |
| Output: 512-dim unit vector        |
+-----------------------------------+
    |
    v
+-----------------------------------+
| Template (512-dim float32 vector)  |
| Size: 512 x 4 bytes = 2,048 bytes |
| + metadata = ~2.5 KB per template  |
+-----------------------------------+
```

**Model Selection Criteria:**

| Criterion | Requirement | Impact |
|---|---|---|
| **Accuracy (TAR @ FAR=0.001%)** | > 99.5% on NIST FRVT benchmark | Determines operational false reject rate |
| **Inference latency** | < 40ms on edge NPU | Touchpoint responsiveness |
| **Model size** | < 250 MB | Edge node storage and OTA update constraints |
| **Demographic equity** | < 2% TAR variance across groups | Regulatory and ethical requirement |
| **Template size** | < 5 KB | Gallery distribution bandwidth |
| **Template interoperability** | Vendor-agnostic comparison possible | Avoid vendor lock-in |

**Template Comparison Mathematics:**

```
Given two templates T1, T2 (512-dim L2-normalized vectors):

Cosine Similarity:
  score = dot(T1, T2) / (||T1|| * ||T2||)
  Since templates are L2-normalized: score = dot(T1, T2)
  Range: [-1.0, 1.0]  (in practice [0.0, 1.0] for face templates)

Threshold Selection:
  1:1 Verification threshold: 0.68 (tuned for FAR < 0.001%)
  1:N Identification threshold: 0.60 (lower due to gallery size risk)
  Score gap minimum (1:N): 0.05 (top match must exceed second by this margin)

Threshold Tuning Trade-offs:
  Higher threshold -> Lower FAR, Higher FRR (more manual fallbacks)
  Lower threshold  -> Higher FAR, Lower FRR (more false accepts)

  At threshold = 0.68:  TAR = 99.5%, FAR = 0.001%, FRR = 0.5%
  At threshold = 0.72:  TAR = 98.8%, FAR = 0.0001%, FRR = 1.2%
  At threshold = 0.62:  TAR = 99.9%, FAR = 0.01%, FRR = 0.1%
```

### 1.2 1:N Gallery Matching Optimization

For boarding gates, the system performs 1:N matching against a flight gallery of 250-5,000 passengers. Naive linear search is O(N) but can be optimized.

**Optimization Strategies:**

```
Strategy 1: Brute-Force Batch Comparison (Baseline)
  FOR each template in gallery:
    score = dot(probe, template)
  Time: O(N * D) where D = 512 dimensions
  At N=5000: 5000 * 512 multiplications = 2.56M FLOPs
  On edge NPU: ~0.5ms (well within budget)
  Verdict: Brute force is sufficient for N < 10,000

Strategy 2: Quantized Templates (Memory Optimization)
  Quantize float32 templates to int8 (4x memory reduction)
  Gallery memory: 5000 * 512 bytes = 2.5 MB (vs 10 MB float32)
  Accuracy loss: < 0.1% TAR degradation
  Use for memory-constrained edge nodes

Strategy 3: Hierarchical Matching (For N > 10,000)
  Cluster gallery into K groups using K-means on templates
  First: Compare probe against K cluster centroids
  Then: Brute-force search within top-3 clusters
  Time: O(K + 3 * N/K) — significant speedup for large galleries
  Not needed for typical flight galleries but useful for airport-wide search
```

**Gallery Match Decision Logic:**

```
ALGORITHM GalleryMatchDecision(scores, gallery):
    sorted_scores = SortDescending(scores)

    top_match = sorted_scores[0]
    second_match = sorted_scores[1] IF len(sorted_scores) > 1

    // Decision criteria
    IF top_match.score < GALLERY_THRESHOLD:
        RETURN Decision(REJECT, reason="NO_MATCH_ABOVE_THRESHOLD")

    IF second_match IS NOT None:
        score_gap = top_match.score - second_match.score
        IF score_gap < MIN_SCORE_GAP:
            // Two passengers look too similar - cannot safely identify
            RETURN Decision(MANUAL_REVIEW, reason="AMBIGUOUS_MATCH",
                            candidates=[top_match, second_match])

    // Additional safety check for very large galleries
    IF gallery.size > 2000:
        // Higher threshold for larger galleries (more false positive risk)
        adjusted_threshold = GALLERY_THRESHOLD + LOG10(gallery.size / 1000) * 0.02
        IF top_match.score < adjusted_threshold:
            RETURN Decision(MANUAL_REVIEW, reason="MARGINAL_MATCH_LARGE_GALLERY")

    RETURN Decision(ACCEPT, matched_passenger=top_match.enrollment_id,
                    confidence=top_match.score)
```

### 1.3 Template Extraction Consistency

A critical but often overlooked challenge: the same person photographed at different times and conditions must produce similar templates. Template consistency across enrollment and verification is the foundation of system reliability.

**Factors Affecting Template Consistency:**

| Factor | Impact on Score | Mitigation |
|---|---|---|
| **Lighting change** | -0.05 to -0.15 | IR illumination at kiosks; lighting normalization in preprocessing |
| **Pose variation** | -0.03 per degree (beyond +-5 degrees) | Multi-angle enrollment; pose estimation with re-capture prompt |
| **Expression** | -0.02 to -0.08 | Neutral expression guidance at enrollment |
| **Aging (1+ years)** | -0.03 to -0.10 | Template refresh enrollment; age-adaptive threshold |
| **Glasses on/off** | -0.05 to -0.12 | Periocular matching as fallback; enroll with and without |
| **Mask (surgical)** | -0.15 to -0.30 | Periocular-only model; prompt mask removal where permitted |
| **Camera quality** | -0.05 to -0.20 | Standardized camera specs; quality-gated capture |

---

## 2. Liveness Detection Deep Dive

### 2.1 Presentation Attack Taxonomy

The liveness detection system must defend against increasingly sophisticated spoofing attacks:

**Attack Categories and Detection:**

| Attack Type | Sophistication | Detection Method | Detection Rate |
|---|---|---|---|
| **Printed photo** | Low | Texture analysis, depth estimation, reflection detection | > 99.9% |
| **Screen replay (phone/tablet)** | Low-Medium | Moire pattern detection, screen reflection, color space analysis | > 99.8% |
| **High-resolution screen** | Medium | Sub-pixel moire analysis, infrared camera (screens don't emit IR) | > 99.5% |
| **Paper mask (cutout)** | Medium | Edge detection, 3D depth, eye region analysis | > 99.7% |
| **3D-printed mask** | High | Skin texture micro-analysis, thermal detection (if available), blink detection | > 98% |
| **Silicone mask** | Very High | NIR spectral analysis, skin micro-texture, pulse detection | > 95% |
| **Deepfake injection** | Very High | Camera pipeline integrity check, injection detection | > 97% |

**Deepfake Injection Attack:**

This is the most concerning emerging threat. The attacker bypasses the camera entirely and injects a synthetic video feed into the processing pipeline.

```
Defense: Camera Pipeline Integrity

ALGORITHM VerifyCameraPipelineIntegrity(frame, camera_id):
    // Step 1: Verify frame originated from registered camera
    camera_certificate = GetCameraCertificate(camera_id)
    frame_signature = frame.metadata.hardware_signature
    IF NOT VerifyHardwareSignature(frame, frame_signature, camera_certificate):
        RETURN IntegrityResult(compromised=True, reason="INVALID_HARDWARE_SIGNATURE")

    // Step 2: Check frame timing consistency
    expected_interval = 1000 / camera.fps  // e.g., 33ms for 30fps
    actual_interval = frame.timestamp - previous_frame.timestamp
    IF ABS(actual_interval - expected_interval) > TIMING_TOLERANCE:
        RETURN IntegrityResult(compromised=True, reason="FRAME_TIMING_ANOMALY")

    // Step 3: Sensor fingerprint verification
    // Each camera sensor has unique pattern noise (PRNU)
    prnu_match = VerifySensorFingerprint(frame, camera.prnu_reference)
    IF prnu_match < PRNU_THRESHOLD:
        RETURN IntegrityResult(compromised=True, reason="SENSOR_FINGERPRINT_MISMATCH")

    // Step 4: Check for compression artifacts indicating re-encoding
    artifact_score = DetectReEncodingArtifacts(frame)
    IF artifact_score > ARTIFACT_THRESHOLD:
        RETURN IntegrityResult(compromised=True, reason="RE_ENCODING_DETECTED")

    RETURN IntegrityResult(compromised=False)
```

### 2.2 Multi-Modal Liveness (Advanced Touchpoints)

High-security touchpoints (immigration, watchlist screening) may employ active liveness detection in addition to passive checks:

```
Active Liveness Challenges:
1. Random head pose request: "Please turn slightly to the left"
   - Verifies 3D face structure (photos and flat screens fail)
   - Adds 3-5 seconds to verification time

2. Gaze tracking: Follow a moving dot on screen
   - Verifies eye movement is physiologically natural
   - Detects video replay (pre-recorded eyes don't track)

3. Random illumination variation: Flash different colors
   - Measures skin reflectance response
   - Screens and prints have different reflectance profiles

Trade-off:
  Active liveness adds 3-8 seconds to verification
  Only justified at high-security touchpoints
  Standard touchpoints (check-in, bag drop, boarding) use passive only
```

---

## 3. Credential Verification Deep Dive

### 3.1 DID Resolution Performance

Resolving a Decentralized Identifier (DID) requires fetching the DID Document, which contains the public keys needed for signature verification. This can be a latency bottleneck.

**Resolution Architecture:**

```
DID Resolution Latency Budget: 200ms total

Approach: Multi-level caching

Level 1: Edge Node Cache (in-memory)
  - Cache trusted issuer DID documents
  - TTL: 1 hour (issuer keys change rarely)
  - Hit rate: > 99% (small number of trusted issuers)
  - Lookup: < 1ms

Level 2: Airport Cache (distributed cache)
  - Cache all recently resolved DID documents
  - TTL: 30 minutes
  - Hit rate: > 99.9%
  - Lookup: < 5ms

Level 3: Blockchain/Registry Resolution
  - Resolve DID document from permissioned ledger or universal resolver
  - Latency: 50-200ms
  - Used only on cache miss
  - Fallback: Return cached version if resolution fails (graceful degradation)

Key Rotation Handling:
  - Issuers publish key rotation events to event stream
  - Edge nodes invalidate cached DID documents on rotation event
  - Credentials signed with old keys remain valid until their expiry
  - Grace period: 24 hours after key rotation for old-key acceptance
```

### 3.2 Revocation Registry Design

The revocation registry must be queryable in near-real-time (30-second staleness) while supporting the volume of credentials issued across all airports.

```
Revocation Registry Architecture:

Option A: Bitstring-based (Chosen)
  - StatusList2021 (W3C standard)
  - Single bitstring where each credential has a fixed index
  - Bit = 0: not revoked, Bit = 1: revoked
  - Entire bitstring (~12.5 KB for 100K credentials) cached at edge nodes
  - Edge nodes poll for bitstring updates every 30 seconds
  - Revocation is O(1) lookup

Option B: Accumulator-based (Alternative)
  - Cryptographic accumulator with non-membership proofs
  - More privacy-preserving (verifier doesn't learn which credentials are revoked)
  - Higher computational cost per verification
  - Better for privacy-critical deployments

Revocation Flow:
  1. Issuer publishes revocation to blockchain (set bit in StatusList)
  2. Blockchain transaction confirms in < 2 seconds (PBFT consensus)
  3. Edge nodes poll StatusList every 30 seconds
  4. Maximum staleness: 30 seconds (acceptable for aviation)
  5. Critical revocations (security alerts): push notification to edge nodes
     bypassing poll interval, effective within 5 seconds
```

### 3.3 Selective Disclosure with Zero-Knowledge Proofs

For privacy-sensitive claims (nationality, age), the credential supports selective disclosure:

```
Selective Disclosure Example:

Immigration touchpoint needs: nationality + document validity
Boarding touchpoint needs: enrolled biometric + boarding authorization

Without selective disclosure:
  - Both touchpoints see ALL credential claims (unnecessary data exposure)

With selective disclosure (BBS+ signatures):
  - Credential contains claims: {name, nationality, DOB, document_type, template_hash, ...}
  - Immigration receives proof: "nationality = [revealed]" + "document valid = true"
    without learning template_hash or DOB
  - Boarding receives proof: "template_hash = [revealed]" + "boarding_authorized = true"
    without learning nationality or DOB

ZKP Performance:
  - Proof generation (wallet): ~100ms on modern smartphone
  - Proof verification (edge node): ~20ms
  - Total overhead vs. full disclosure: ~120ms (acceptable within budget)
```

---

## 4. Touchpoint Orchestration Deep Dive

### 4.1 Race Conditions in Multi-Touchpoint Processing

When a passenger is simultaneously present at multiple touchpoints (e.g., family members sharing a booking, or system lag), race conditions can occur:

**Race Condition 1: Duplicate Gallery Match**

```
Scenario: Two passengers approach the same boarding gate simultaneously.
Both match against the gallery, and both are identified as the same person.

Root Cause: Gallery match is stateless — it doesn't know the first match
already consumed that gallery entry.

Solution: Gallery Match Lock

ALGORITHM LockedGalleryMatch(probe_template, gallery_id, edge_node_id):
    // Acquire distributed lock on gallery for this match operation
    lock = AcquireLock("gallery_match:" + gallery_id, timeout=2s)

    scores = BatchCosineSimilarity(probe_template, gallery.templates)
    decision = GalleryMatchDecision(scores, gallery)

    IF decision.action == ACCEPT:
        // Mark this gallery entry as "matched" to prevent duplicate
        already_matched = IsGalleryEntryMatched(gallery_id, decision.enrollment_id)
        IF already_matched:
            // This person was already identified at this gate
            decision = Decision(MANUAL_REVIEW, reason="DUPLICATE_GALLERY_MATCH")
        ELSE:
            MarkGalleryEntryMatched(gallery_id, decision.enrollment_id, edge_node_id)

    ReleaseLock(lock)
    RETURN decision
```

**Race Condition 2: Concurrent Consent Revocation and Verification**

```
Scenario: Passenger revokes consent while simultaneously being verified
at a touchpoint.

Timeline:
  T=0: Passenger initiates consent revocation on wallet app
  T=1: Touchpoint captures face and starts verification
  T=2: Consent revocation event published to event stream
  T=3: Touchpoint completes verification (ACCEPT)
  T=4: Consent revocation propagates to touchpoint

Problem: Verification at T=3 used a template that should have been deleted.

Solution: Two-Phase Verification

ALGORITHM TwoPhaseVerification(touchpoint_id, enrollment_id, match_result):
    // Phase 1: Biometric match (already completed)
    IF match_result.decision != ACCEPT:
        RETURN match_result

    // Phase 2: Consent validity check (synchronous, after match)
    consent = CheckConsentValidity(enrollment_id, touchpoint_type)
    IF consent.status != ACTIVE:
        // Consent was revoked between match and check
        LogEvent("CONSENT_RACE_CONDITION", enrollment_id, touchpoint_id)
        RETURN Decision(REJECT, reason="CONSENT_REVOKED_DURING_VERIFICATION")

    // Phase 3: Journey state check
    journey = GetActiveJourney(enrollment_id)
    IF journey IS None OR journey.status == MANUAL_FALLBACK:
        RETURN Decision(REJECT, reason="JOURNEY_NOT_ACTIVE")

    RETURN match_result  // All checks passed
```

**Race Condition 3: Gallery Update During Active Matching**

```
Scenario: Gallery Manager pushes incremental gallery update while edge
node is performing 1:N matching against the current gallery.

Solution: Copy-on-Write Gallery

The edge node maintains two gallery buffers:
  - Active Gallery: Currently used for matching (read-only)
  - Staging Gallery: Receives incremental updates

On gallery update:
  1. Apply update to Staging Gallery
  2. Atomic pointer swap: Active <- Staging
  3. Next match uses updated gallery
  4. In-flight matches against old gallery complete normally

No lock contention. No inconsistent reads. Update visible within
one match cycle (~2 seconds worst case).
```

### 4.2 Touchpoint Failure Modes

Each touchpoint can fail in several ways, each requiring a specific recovery strategy:

| Failure Mode | Detection | Impact | Recovery |
|---|---|---|---|
| **Camera failure** | No frames / quality degradation | No biometric capture possible | Immediate fallback to manual; alert maintenance |
| **Edge NPU failure** | Inference timeout / error | Cannot run local matching | Route to cloud matching (adds 100-200ms latency) |
| **Network disconnection** | Heartbeat timeout | Cannot reach journey orchestrator | Edge operates autonomously using cached gallery and local decision; queue events for sync |
| **Gallery corruption** | Hash mismatch on gallery entries | Incorrect matches possible | Re-download gallery from cloud; use 1:1 mode until gallery restored |
| **HSM failure** | Signing timeout / error | Cannot attest results | Results accepted without attestation (flagged for audit); alert security |
| **Clock drift** | NTP sync failure | Event ordering issues | Edge nodes use GPS time as backup; events flagged with sync quality |
| **Power failure** | UPS monitoring | Complete touchpoint loss | Gate falls back to manual; UPS provides 15-minute battery backup |

### 4.3 Manual Fallback Orchestration

The manual fallback is not a degraded mode but an equally functional processing path:

```
ALGORITHM ManualFallbackHandler(touchpoint_id, failure_reason):
    // Step 1: Activate manual mode at touchpoint
    SetTouchpointMode(touchpoint_id, MANUAL)
    ActivateManualLaneSignage(touchpoint_id)

    // Step 2: Notify operations
    AlertOperations("BIOMETRIC_FALLBACK", touchpoint_id, failure_reason)
    RequestStaffAssignment(touchpoint_id)

    // Step 3: Configure fallback verification
    // Manual path uses: boarding pass scan + document check
    EnableBarcodeScan(touchpoint_id)
    EnableDocumentVerification(touchpoint_id)

    // Step 4: Update journey orchestrator
    // Passengers arriving at this touchpoint use manual path
    UpdateTouchpointRouting(touchpoint_id, routing=MANUAL_ONLY)

    // Step 5: Monitor for recovery
    WHILE touchpoint_mode == MANUAL:
        health = CheckTouchpointHealth(touchpoint_id)
        IF health.biometric_available AND health.confidence > 0.95:
            // Gradual return: run both paths in parallel for 5 minutes
            SetTouchpointMode(touchpoint_id, PARALLEL_VALIDATION)
            WAIT 5_MINUTES
            IF ParallelValidationSuccessRate() > 0.99:
                SetTouchpointMode(touchpoint_id, BIOMETRIC)
                DeactivateManualLaneSignage(touchpoint_id)
                BREAK
```

---

## 5. Bottleneck Analysis

### 5.1 Morning Flight Bank Peak

**The Problem:** Large airports have "flight banks" where 30-50 flights depart within a 2-hour window. This creates a surge where 20,000-40,000 passengers simultaneously move through touchpoints.

```
Morning Peak Analysis:
  Flights departing: 40 flights (6:00-8:00 AM)
  Passengers: 40 x 250 = 10,000 passengers
  + connecting passengers: +5,000
  Total peak window: 15,000 passengers in 2 hours

  Enrollment peak: 15,000 x 30% kiosk = 4,500 enrollments in 2 hours
  = 37.5 enrollments/minute (manageable with 50+ kiosks)

  Security peak: 15,000 passengers in 2 hours through 60 lanes
  = 125 passengers/lane/hour = ~2/minute/lane (manageable)

  Boarding peak: 40 flights boarding simultaneously
  = 40 active galleries, 40 gate edge nodes active
  = 250 passengers x 40 flights / 30 min boarding window
  = ~333 passengers/minute = ~5.5 verifications/sec (manageable)

Bottleneck: Gallery distribution
  40 galleries x 1.25 MB = 50 MB distributed to 40+ edge nodes
  All within 10-minute window = 200+ MB network transfer
  Solution: Stagger gallery distribution; start building galleries
  90 minutes before departure, prioritize by departure time
```

### 5.2 Credential Verification at Scale

**The Problem:** Every touchpoint interaction requires credential verification. At 200 verifications/second peak, the credential verification pipeline must be highly optimized.

```
Verification Latency Breakdown:
  DID resolution:           < 1ms   (L1 cache hit, 99%+ of the time)
  Signature verification:   ~5ms    (Ed25519, CPU-bound)
  Schema validation:        ~1ms    (pre-compiled schema)
  Revocation check:         < 1ms   (cached bitstring lookup)
  Template hash comparison: < 1ms   (simple hash equality)
  ──────────────────────────────────
  Total:                    ~8ms    (well within 200ms budget)

At 200 verifications/sec: 200 x 8ms = 1.6 CPU-seconds/sec
Requires ~2 CPU cores dedicated to credential verification
With 4x headroom: 8 CPU cores allocated (achievable)
```

### 5.3 Template Deletion Compliance

**The Problem:** All biometric templates must be deleted within 24 hours of flight departure. With 140,000 passengers/day, this is 140,000 deletion operations/day, and each deletion must be cryptographically proven.

```
Deletion Pipeline:
  1. Flight departs -> event triggers deletion scheduler
  2. Scheduler queries all enrollments for this flight
  3. For each enrollment:
     a. Delete encrypted template from biometric store
     b. Generate deletion proof (hash of deleted data + timestamp + delete authority)
     c. Update consent record with deletion proof
     d. Remove from any cached galleries (should already be purged)
     e. Notify passenger wallet (optional: confirm deletion)

  Volume: 140,000 deletions/day = ~1.6 deletions/sec (constant rate)
  Peak (after evening flight bank): 500 deletions in 30 minutes = ~0.3/sec

  TTL Index Optimization:
    Biometric store uses TTL index on auto_delete_at field
    Templates auto-deleted by database engine
    Deletion proof generated by background job that runs every 5 minutes
    No manual deletion required for normal flow
```

### 5.4 Edge Node Model Updates

**The Problem:** Facial recognition models are updated periodically (quarterly or semi-annually). Distributing a 250 MB model to 400+ edge nodes without disrupting operations is a deployment challenge.

```
Model Update Strategy:

Phase 1: Pre-distribution (off-peak hours, 2-5 AM)
  - Push new model to all edge nodes over airport LAN
  - Bandwidth: 400 nodes x 250 MB = 100 GB
  - At 1 Gbps internal LAN: ~800 seconds (13 minutes) total
  - Stagger to avoid network saturation: 50 nodes at a time = ~2 hours

Phase 2: Parallel Validation (next day, low-traffic period)
  - Run both old and new model on every verification
  - Compare results; flag discrepancies
  - If new model accuracy >= old model: proceed to cutover
  - If regression detected: abort and investigate

Phase 3: Rolling Cutover
  - Switch edge nodes one terminal at a time
  - Monitor accuracy metrics per terminal
  - Rollback individual nodes if issues detected
  - Full rollout over 2-4 hours

Template Compatibility:
  - If new model produces different templates (embedding change):
    Must re-enroll all passengers (templates from old model won't match new model)
  - Critical: Model updates should maintain backward-compatible templates
  - If backward-incompatible: coordinate with enrollment refresh campaign
```

---

## 6. Performance Critical Paths

### 6.1 End-to-End Touchpoint Latency Budget

```
1:1 Verification (check-in, bag drop):
  +----------------------------------+--------+
  | Step                             | Budget |
  +----------------------------------+--------+
  | BLE/QR credential presentation   |  200ms |
  | Camera capture + face detection  |  100ms |
  | Quality assessment               |   50ms |
  | Liveness detection               |  150ms |  (parallel with template extraction)
  | Template extraction              |  150ms |  (parallel with liveness)
  | Credential verification          |   50ms |  (parallel with liveness + extraction)
  | Template decryption              |   10ms |
  | 1:1 cosine similarity            |    5ms |
  | Result attestation (HSM sign)    |   10ms |
  | Journey orchestrator update      |   25ms |
  | Gate actuation                   |  100ms |
  +----------------------------------+--------+
  | Total (with parallelism)         | ~500ms |
  +----------------------------------+--------+

1:N Gallery Match (boarding gate):
  +----------------------------------+--------+
  | Step                             | Budget |
  +----------------------------------+--------+
  | Camera capture + face detection  |  200ms |
  | Quality assessment               |   50ms |
  | Liveness detection               |  200ms |  (parallel)
  | Template extraction              |  150ms |  (parallel)
  | Gallery search (5K templates)    |   50ms |
  | Match decision logic             |   10ms |
  | Result attestation               |   10ms |
  | Display passenger info           |   50ms |
  | DCS update                       |  100ms |  (async, non-blocking)
  +----------------------------------+--------+
  | Total (with parallelism)         | ~700ms |
  +----------------------------------+--------+
```

---

*Next: [Scalability & Reliability ->](./05-scalability-and-reliability.md)*
