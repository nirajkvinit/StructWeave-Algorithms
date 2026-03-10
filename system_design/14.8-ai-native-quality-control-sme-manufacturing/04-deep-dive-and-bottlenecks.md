# 14.8 AI-Native Quality Control for SME Manufacturing — Deep Dives & Bottlenecks

## Deep Dive 1: Edge Inference Optimization — Fitting a Neural Network on a $35 Computer

### The Challenge

The system must run a CNN-based defect detection model in under 100 ms on edge devices with 2-8 TOPS of INT8 compute (versus 300+ TOPS on a modern GPU server). This is not merely a "use a smaller model" problem—it requires co-optimizing the model architecture, numerical precision, memory layout, and hardware-specific instruction scheduling to extract maximum performance from constrained silicon.

### Memory Budget Analysis

```
Typical edge device: 4 GB RAM total
  - OS + system services: 400 MB
  - Edge runtime + libraries: 200 MB
  - Camera frame buffers (double-buffered, 2048x1536 RGB): 2 × 9.4 MB = 18.8 MB
  - Model weights (INT8 quantized, 5M params): 5 MB
  - Model activations (peak intermediate tensor): 20-80 MB (depends on architecture)
  - Local SQLite DB: 50 MB
  - Working memory for preprocessing: 30 MB
  ─────────────────────────────────────
  Total: ~800 MB
  Available headroom: ~3.2 GB

  Key constraint: NOT total memory, but peak activation memory during inference.
  MobileNetV3 peak activation at 224×224 input: ~25 MB
  EfficientNet-Lite0 peak activation at 320×320 input: ~45 MB
  EfficientDet-Lite1 peak activation at 384×384 input: ~80 MB

  If input resolution must be 640×480 (for small defect detection):
  Activation memory scales ~quadratically: 45 MB × (640×480)/(320×320) ≈ 135 MB
  This forces architecture choices: use a smaller backbone OR reduce resolution
  OR use tiled inference (process overlapping crops at native resolution).
```

### Tiled Inference for High-Resolution Defect Detection

When defects are small relative to the full image (e.g., a 0.5mm scratch on a 100mm part captured in a 4096×3072 image), the model needs high-resolution input to detect them. But running inference on a 4096×3072 image requires ~2 GB of activation memory—impossible on edge hardware.

```
FUNCTION TiledInference(full_image, model, tile_size, overlap):
    // Break image into overlapping tiles that fit in memory
    tiles = GenerateTileGrid(full_image, tile_size, overlap)
    // Example: 4096×3072 image with 640×480 tiles and 20% overlap
    //          → 8 × 8 = 64 tiles (but many may be background-only)

    all_detections = []
    FOR EACH tile IN tiles:
        // Skip tiles that are entirely background (fast check)
        IF ComputeVariance(tile) < background_threshold:
            CONTINUE  // Uniform background, no possible defect

        detections = model.Infer(tile)

        // Map tile-local coordinates back to full-image coordinates
        FOR EACH d IN detections:
            d.bbox = TranslateToFullImage(d.bbox, tile.origin)
            all_detections.APPEND(d)

    // Merge detections from overlapping regions
    merged = NonMaxSuppression(all_detections, iou_threshold=0.5)
    RETURN merged
```

**Trade-off**: Tiled inference increases total compute by (1 + overlap_ratio)^2 (about 1.44x with 20% overlap) but keeps peak memory within budget. The background skip optimization typically eliminates 30-60% of tiles, partially offsetting the compute overhead.

### NPU-Specific Optimization Techniques

1. **Operator fusion**: The compilation toolchain fuses sequences of operations (Conv → BatchNorm → ReLU) into single kernel calls, eliminating intermediate memory writes. This alone provides 1.3-1.8x speedup.

2. **Channel-last memory layout**: Many NPUs are optimized for NHWC (channels-last) tensor layout rather than NCHW (channels-first) used during training. The compilation step transposes weights to match the NPU's preferred layout, avoiding runtime transpose overhead.

3. **Depthwise separable convolution**: MobileNet architectures use depthwise separable convolutions that decompose a standard convolution into a depthwise convolution (spatial filtering) and a pointwise convolution (channel mixing). This reduces compute by 8-9x versus standard convolutions while losing only 1-2% accuracy.

4. **Static memory planning**: The compiler analyzes the model's computation graph and pre-allocates a fixed memory buffer, reusing memory for tensors whose lifetimes don't overlap. This eliminates dynamic allocation during inference.

5. **Pipeline parallelism**: While the NPU infers on frame N, the CPU preprocesses frame N+1, and the camera captures frame N+2. This three-stage pipeline hides latency and keeps the NPU fully utilized.

### Bottleneck: Thermal Throttling Under Sustained Load

Edge devices operating at maximum throughput (120 inferences/minute) generate sustained heat. When the CPU/NPU die temperature exceeds the thermal limit (typically 85-95C), the device throttles clock speeds to prevent damage, increasing inference latency by 30-100%.

```
Impact analysis:
  - Normal inference latency: 60 ms
  - Throttled inference latency: 80-120 ms
  - If latency exceeds 100 ms budget: inspection decisions delayed
  - If latency exceeds 500 ms (full cycle time): parts pass uninspected

Mitigation strategies:
  1. Passive cooling design: Aluminum heatsink sized for sustained power draw
     - Cost: $5-$15 per station
     - Effectiveness: handles 80% of factory environments

  2. Active cooling: small fan for high-temperature environments (foundries, bakeries)
     - Cost: $10-$20, adds a reliability concern (fan failure)

  3. Thermal-aware inference: if temperature exceeds soft limit (80C),
     reduce preprocessing (skip augmentation-time-test), switch to
     smaller model variant (lower accuracy but within thermal budget)

  4. Duty cycle management: if line speed allows, skip inference on
     alternating parts during thermal events (50% inspection rate
     is better than 0% when device is fully throttled)
```

---

## Deep Dive 2: No-Code Training — Making ML Accessible to Factory Operators

### The Abstraction Challenge

The training pipeline must make hundreds of decisions that ML engineers normally make manually—architecture selection, learning rate schedule, augmentation strategy, regularization strength, early stopping criteria, quantization method—while exposing only the decisions that factory operators are qualified to make: what is a defect, what severity levels exist, and what is an acceptable error rate.

### Decision Automation Framework

```
FUNCTION AutoSelectTrainingConfig(dataset, target_hardware, operator_prefs):
    // 1. Analyze dataset characteristics
    num_classes = CountUniqueLabels(dataset)
    min_class_count = MIN(CountPerClass(dataset))
    image_resolution = MedianResolution(dataset)
    defect_size_ratio = EstimateDefectSizeRatio(dataset)  // % of image area

    // 2. Select task type
    IF operator_prefs.needs_localization:
        task = "detection"  // Bounding box output
    ELSE IF defect_size_ratio > 0.3:
        task = "classification"  // Defect fills most of the image
    ELSE:
        task = "detection"  // Small defects need localization

    // 3. Select input resolution
    IF defect_size_ratio < 0.01:
        // Very small defects: need high resolution
        input_size = 640  // Or use tiled inference
    ELSE IF defect_size_ratio < 0.05:
        input_size = 416
    ELSE:
        input_size = 224  // Standard classification resolution

    // 4. Select architecture based on hardware + task
    available_architectures = GetArchitecturesForHardware(target_hardware)

    IF task == "classification":
        IF target_hardware.tops < 2:
            arch = "MobileNetV3-Small"  // Minimum viable for < 2 TOPS
        ELSE:
            arch = "EfficientNet-Lite0"  // Best accuracy/compute
    ELSE:  // detection
        IF target_hardware.tops < 4:
            arch = "SSD-MobileNetV3"  // Lightweight detection
        ELSE:
            arch = "EfficientDet-Lite0"  // Better detection accuracy

    // 5. Select augmentation intensity based on dataset size
    IF min_class_count < 30:
        augmentation = "aggressive"
        // Use synthetic defect generation, heavy geometric + photometric aug
    ELSE IF min_class_count < 100:
        augmentation = "standard"
    ELSE:
        augmentation = "light"

    // 6. Select regularization based on dataset size
    IF TOTAL_IMAGES(dataset) < 500:
        dropout_rate = 0.5
        weight_decay = 0.01
        early_stopping_patience = 5
    ELSE IF TOTAL_IMAGES(dataset) < 2000:
        dropout_rate = 0.3
        weight_decay = 0.001
        early_stopping_patience = 10
    ELSE:
        dropout_rate = 0.2
        weight_decay = 0.0001
        early_stopping_patience = 15

    // 7. Select learning rate based on pre-training
    IF using_domain_pretrained_backbone:
        head_lr = 0.001
        backbone_lr = 0.0001  // 10x lower to avoid catastrophic forgetting
    ELSE:
        head_lr = 0.001
        backbone_lr = 0.0005

    RETURN TrainingConfig(task, input_size, arch, augmentation, ...)
```

### The Synthetic Defect Generation Problem

When operators provide only 20-50 examples of a defect type, the model is prone to memorizing specific defect instances rather than learning the general pattern. Synthetic defect generation addresses this by creating plausible defect variations:

```
FUNCTION GenerateSyntheticDefects(defect_images, good_images, num_synthetic):
    // Strategy 1: Cut-and-paste with blending
    // Extract defect region from labeled image, paste onto random good background
    FOR i IN RANGE(num_synthetic / 3):
        defect_source = RandomChoice(defect_images)
        good_background = RandomChoice(good_images)

        defect_mask = SegmentDefectRegion(defect_source)
        defect_patch = ExtractPatch(defect_source, defect_mask)

        // Random transform the defect patch
        defect_patch = RandomRotate(defect_patch, -30, 30)
        defect_patch = RandomScale(defect_patch, 0.7, 1.3)
        defect_patch = RandomBrightness(defect_patch, 0.8, 1.2)

        // Random position on good background
        position = RandomPosition(good_background, defect_patch.size)

        // Blend (not hard paste) for realistic edges
        synthetic = PoissonBlend(good_background, defect_patch, position, defect_mask)
        YIELD (synthetic, defect_source.label)

    // Strategy 2: Parametric defect synthesis
    // For certain defect types (scratches, stains), generate from scratch
    FOR i IN RANGE(num_synthetic / 3):
        good_background = RandomChoice(good_images)

        // Learn defect appearance statistics from examples
        defect_stats = ComputeDefectStatistics(defect_images)
        // Stats: average color deviation, typical size range,
        //        orientation distribution, texture frequency

        synthetic_defect = GenerateParametricDefect(defect_stats)
        synthetic = OverlayDefect(good_background, synthetic_defect)
        YIELD (synthetic, defect_stats.class_label)

    // Strategy 3: Augmented real defects
    // Apply diverse transforms to real defect images
    FOR i IN RANGE(num_synthetic / 3):
        defect_source = RandomChoice(defect_images)
        augmented = ApplyChainedAugmentations(defect_source, [
            RandomCrop(0.8, 1.0),
            ElasticDeform(alpha=30, sigma=4),
            ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
            GaussianNoise(sigma=5),
            RandomGaussianBlur(kernel=3, prob=0.3)
        ])
        YIELD (augmented, defect_source.label)
```

### Bottleneck: The Cold-Start Problem for New Defect Types

When a factory encounters a new defect type (e.g., a supplier changes raw material, introducing a previously unseen surface pattern), the operator has zero training examples. The active learning pipeline must bootstrap from nothing:

1. **Anomaly detection mode**: Before labeled examples exist, run an unsupervised anomaly detection model that flags any image differing from the "good" distribution. This has high false positive rates (10-20%) but catches truly novel defects.

2. **Operator labeling burst**: Present the top 50 anomalous images to the operator for quick yes/no labeling. This typically yields 5-15 confirmed defect examples in 10 minutes.

3. **Few-shot rapid training**: Train a few-shot classifier on these 5-15 examples using metric learning (Siamese/Prototypical networks) rather than standard classification—which would overfit with so few examples. This reaches ~80% recall within hours.

4. **Progressive improvement**: Active learning continues flagging uncertain images, operator labels 20-50 per shift, and the model is retrained nightly, reaching >95% recall within 1-2 weeks.

---

## Deep Dive 3: Image Acquisition — The Most Underestimated Component

### Why Image Quality Dominates Model Quality

A poorly lit, blurry, or poorly framed image defeats even the best model. In production deployments, 60-70% of accuracy failures are traced back to image acquisition issues, not model issues. The acquisition system must solve:

1. **Motion blur**: Parts moving at 2 m/s need exposure times < 1 ms to freeze motion. With insufficient lighting, the camera must use longer exposures, introducing blur.

2. **Specular reflection**: Shiny surfaces (polished metal, glossy plastic) create bright spots (specular highlights) that saturate camera pixels, hiding defects under the reflection.

3. **Ambient light contamination**: Factory overhead lighting creates uncontrolled illumination that changes with time of day (windows), shifts (different lights on/off), and season (sunrise/sunset angle). This changes the image appearance without any change in part quality.

4. **Positional variation**: If the part is not in exactly the same position and orientation for every capture, the model must learn to be position-invariant—wasting model capacity on a problem that should be solved mechanically.

### Controlled Lighting Design

```
Lighting selection matrix:

| Defect Type         | Lighting Technique          | Why                                                |
|---------------------|-----------------------------|----------------------------------------------------|
| Surface scratches   | Low-angle (grazing) light   | Scratches cast shadows at low angles, becoming visible |
| Surface stains      | Diffuse overhead light      | Even illumination reveals color differences         |
| Dimensional errors  | Backlight (silhouette)      | Part outline sharp against bright background        |
| Solder joint quality| Ring light (coaxial)        | Even illumination of 3D structures, reduces shadows |
| Transparent defects | Dark-field illumination     | Defects scatter light into camera; background stays dark |
| Surface texture     | Structured light (stripe)   | Phase shift reveals sub-pixel surface variation     |

Cost: Proper lighting setup adds $30-$80 to station cost but can improve
model accuracy by 10-30% compared to ambient-only lighting. This is the
highest ROI investment in the entire inspection station.
```

### Automatic Calibration and Drift Detection

Camera parameters drift over time: LED brightness degrades (10-20% per year), lens gets contaminated with factory dust, camera mount vibrates loose, and temperature changes cause focus shift.

```
FUNCTION PeriodicCalibrationCheck(station, reference_target):
    // Run every N inspections or every shift change

    // Step 1: Capture reference target (calibration checkerboard or gray card)
    ref_image = Camera.Capture(with_trigger=FALSE)  // Manual capture

    // Step 2: Check focus sharpness
    current_sharpness = ComputeSharpness(ref_image, region=calibration_zone)
    IF current_sharpness < 0.8 * station.baseline_sharpness:
        ALERT("Focus degradation detected — lens may need cleaning or refocusing")
        station.quality_flag = "degraded_focus"

    // Step 3: Check illumination uniformity
    intensity_map = ComputeIntensityMap(ref_image, grid=8x8)
    uniformity = MIN(intensity_map) / MAX(intensity_map)
    IF uniformity < 0.7:  // Should be > 0.85 for controlled lighting
        ALERT("Lighting non-uniformity detected — check LED array")

    // Step 4: Check color consistency (white balance drift)
    current_wb = MeasureWhiteBalance(ref_image, gray_patch_region)
    wb_drift = ColorDistance(current_wb, station.baseline_wb)
    IF wb_drift > threshold:
        // Auto-correct: update white balance coefficients
        station.wb_coefficients = ComputeNewWBCoefficients(current_wb)
        LOG("White balance auto-corrected: drift was {wb_drift}")

    // Step 5: Check geometric alignment
    current_corners = DetectCheckerboardCorners(ref_image)
    alignment_error = ComputeAlignmentError(current_corners, station.baseline_corners)
    IF alignment_error > 2_pixels:
        ALERT("Camera alignment drift detected — check mount tightness")
```

### Bottleneck: The Camera-Model Resolution Mismatch

The camera captures at its native resolution (e.g., 2048×1536). The model expects a fixed input size (e.g., 416×416). Naive resizing loses information about small defects:

```
Example: A 0.5mm scratch on a 100mm part
  - Camera resolution: 2048×1536, field of view: 120mm × 90mm
  - Scratch width in pixels: 0.5mm × (2048px / 120mm) ≈ 8.5 pixels wide
  - After resize to 416×416: scratch becomes 8.5 × (416/2048) ≈ 1.7 pixels wide
  - A 1.7-pixel-wide feature is below the reliable detection threshold for most CNNs

Solutions:
  1. ROI cropping: Crop to just the relevant inspection area before resize
     - If ROI is 500×500 pixels containing the scratch: 8.5 × (416/500) ≈ 7 pixels
     - Detectable, but requires mechanical precision in part positioning

  2. Tiled inference: Process full-resolution tiles (see Deep Dive 1)
     - Preserves 8.5-pixel width; reliable detection
     - Increases inference time by tile count

  3. Super-resolution preprocessing: Upscale ROI before inference
     - Computationally expensive on edge; rarely practical

  4. Higher-resolution model input: Use 640×640 input
     - Increases activation memory and inference time
     - Scratch becomes 8.5 × (640/2048) ≈ 2.6 pixels; marginal improvement

Best practice: Combine ROI cropping (reduce field of view to only
what's needed) with appropriate camera lens selection (choose focal
length that fills the frame with the part, maximizing pixel density
on the inspection target).
```

---

## Cross-Cutting Bottlenecks

### Bottleneck: Model Drift from Tooling Wear

As manufacturing tooling wears (cutting tools dull, molds degrade, dies accumulate deposits), the "normal" appearance of parts gradually shifts. A model trained on parts from new tooling may start flagging parts from worn tooling as defective—even though they're within tolerance:

```
Impact timeline (example: injection molding):
  - Week 1 (new mold): 0.5% false positive rate
  - Week 4 (slight wear): 1.2% false positive rate
  - Week 8 (moderate wear): 3.5% false positive rate
  - Week 12 (worn): 8.0% false positive rate → operators override/ignore system

Mitigation:
  1. Periodic retraining: Include "good" images from recent production
     in the training set, capturing the current tooling state
  2. Rolling reference window: The "good" reference distribution is
     updated weekly with operator-verified good parts
  3. Tolerance bands: Instead of a binary threshold, use a graduated
     response: "within spec" → "approaching limit" → "out of spec"
  4. Tooling wear correlation: Track false positive rate trend;
     if it's linearly increasing, alert that tooling may need maintenance
```

### Bottleneck: Multi-Product Lines and Model Switching

Many SME factories produce multiple products on the same line, switching between products during the day. Each product requires a different inspection model (different defect types, different good-part appearance):

```
Challenge: Model loading time
  - Loading a new model from disk to NPU memory: 500 ms - 3 seconds
  - During this time, the inspection station cannot process parts
  - If the production line doesn't pause during changeover, parts pass uninspected

Solutions:
  1. Pre-loaded model pool: Keep the 2-3 most common models in memory
     simultaneously; switch between them in < 1 ms via pointer swap
     - Requires: 3 × 30 MB = 90 MB of model memory (feasible on 4 GB devices)

  2. Predictive model loading: Use production schedule to anticipate
     the next product changeover; start loading the next model while
     the current product is still running (in a background thread)

  3. Universal model: Train a single model that detects defects across
     multiple product types, using product-type as an input conditioning signal
     - Pro: No model switching needed
     - Con: Lower accuracy than product-specific models (model capacity
       is shared across product types)

  4. Line-stop integration: When the PLC signals a product changeover,
     the inspection station pauses, loads the new model, runs a
     calibration check, and signals ready—before the line restarts
```

### Bottleneck: Defect Class Imbalance

In manufacturing, defective parts are rare (0.1-5% of production). Within defective parts, some defect types are much rarer than others (e.g., cracks: 0.01%, scratches: 2%, color deviation: 0.5%). This extreme class imbalance causes models to:

- Predict "good" for everything and achieve 98% accuracy while missing all defects
- Overfit to the few defect examples and hallucinate defects on good parts

```
Mitigation stack:
  1. Focal loss: Down-weight easy negatives (good parts that are clearly good);
     up-weight hard examples (subtle defects, borderline good parts)

  2. Class-weighted sampling: During training, sample defect images 10-50x
     more frequently than their natural occurrence rate

  3. Synthetic augmentation: Generate 10-50x more defect images via
     augmentation and synthesis (see Deep Dive 2)

  4. Per-class threshold tuning: Instead of a single confidence threshold,
     tune per-class thresholds to achieve target recall per defect type
     - Critical defects (cracks): threshold = 0.3 (high recall, accept higher FPR)
     - Cosmetic defects (minor scratches): threshold = 0.7 (balanced)

  5. Two-stage cascade: Stage 1 anomaly detector (binary: normal vs. anomalous)
     with high recall, low precision → Stage 2 classifier (multi-class defect type)
     runs only on Stage 1 rejects → Reduces compute and improves precision
```
