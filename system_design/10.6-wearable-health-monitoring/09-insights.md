# Insights — Wearable Health Monitoring Platform

## Insight 1: Battery Is the Architect, Not a Constraint

**Category:** Architecture

**One-liner:** In wearable health platforms, battery life isn't a non-functional requirement to satisfy—it's the supreme architectural force that dictates every design decision from sensor sampling to communication protocol to ML model selection.

**Why it matters:**

Most system designs treat hardware constraints as afterthoughts—you design the ideal system, then optimize. Wearable health monitoring inverts this hierarchy. A 300 mAh battery powering a device that must last 7–14 days leaves approximately 1–2 mW of average power budget for all sensing, processing, storage, and communication. Every architectural choice must pass through this energy filter first.

This manifests in decisions that would seem bizarre in any other system design. BLE is chosen over Wi-Fi not because it's better at data transfer (it's not—100 KB/s vs. 50 MB/s), but because it consumes 10–50x less power. Data is batched for minutes before transmission, not because latency is unimportant, but because the BLE radio startup cost (~3 mW for ~5ms) is amortized across more data per session. On-device ML models are quantized to INT8 (losing ~2% accuracy) because INT8 inference uses 4x less energy than float32. Sensors aren't sampled at their maximum capability because a 512 Hz PPG signal consumes 8x more power than a 25 Hz signal that provides 95% of the clinical value.

The architectural insight is that battery creates a **design cascade**: battery budget → power budget per subsystem → sensor sampling rate → data volume → BLE transfer duration → sync frequency → cloud ingestion pattern → storage volume → cost structure. Changing any early parameter in this cascade reshapes everything downstream. The best wearable platform architects design backward from battery life to feature set, rather than forward from feature wishlist to battery impact.

The adaptive duty cycling algorithm embodies this principle: the system continuously reallocates its power budget based on current state (sleeping user needs less HR sampling, exercising user needs more), battery level (below 20% triggers feature shedding), and clinical priority (RPM patients override power optimization). This isn't an optimization—it's the core architectural pattern.

---

## Insight 2: The Phone-as-Gateway Pattern Creates a Unique Three-Tier Processing Hierarchy

**Category:** Architecture

**One-liner:** The smartphone isn't just a relay between wearable and cloud—it's an intelligent middleware layer that fundamentally changes the system's processing model, fault tolerance, and data flow architecture.

**Why it matters:**

In conventional IoT architectures, edge devices send data directly to the cloud. Wearable health platforms insert a third tier—the user's smartphone—that serves as gateway, aggregator, processor, and integration broker. This three-tier hierarchy (wearable → phone → cloud) isn't a compromise; it's architecturally superior to both direct-to-cloud and device-only approaches.

The phone provides three capabilities that neither the wearable nor the cloud can efficiently deliver. First, **aggregation across wearables**: a user may wear a watch (HR, SpO2), a ring (temperature, HRV), and a chest strap (ECG). The phone fuses data from all three devices, resolves timestamp discrepancies, and presents a unified health stream to the cloud—eliminating the cloud's need to perform cross-device correlation for every user query. Second, **platform SDK integration**: HealthKit (iOS) and Health Connect (Android) are phone-side APIs. Writing health data to these platform stores happens during BLE sync, not during cloud upload, giving users immediate access to their data in native health apps regardless of cloud connectivity. Third, **store-and-forward buffering**: when the user's phone has no internet, it accumulates data from the wearable and uploads when connectivity returns. This second-layer buffer (in addition to the wearable's own buffer) means the cloud sees smooth data flow even when the user's connectivity is intermittent.

The failure mode implications are significant. When the phone is unavailable (left at home, battery dead), the wearable must operate independently—on-device ML handles critical detection, the local buffer stores data. When the cloud is unavailable, the phone+wearable subsystem continues to function: data collection, local processing, and even local notifications all work. This two-layer resilience (device-level + phone-level) before reaching the cloud is architecturally distinct from any other system design pattern commonly encountered in interviews.

The downside is complexity: three execution environments with different capabilities, power profiles, and failure modes. The sync protocol must handle BLE instability, phone OS background execution limits, and app lifecycle events. But this complexity is inherent to the domain—the phone-as-gateway isn't adding unnecessary complexity, it's managing essential complexity that direct-to-cloud architectures merely ignore (at the cost of battery life and user experience).

---

## Insight 3: Motion Artifacts Make Signal Quality a First-Class Architectural Concern

**Category:** Data Quality

**One-liner:** Wearable sensors operate on a moving human body, and the motion artifacts that corrupt physiological signals aren't noise to be filtered—they're a fundamental data quality dimension that must propagate through the entire system architecture.

**Why it matters:**

A PPG heart rate sensor produces clean, reliable readings when the user is sitting still. The same sensor produces garbage when the user is jogging—the rhythmic arm motion creates optical artifacts that can be larger than the cardiac pulse signal. This isn't an edge case; it's the norm. Users are physically active for significant portions of the day, and many of the most clinically interesting events (exercise-induced arrhythmia, exertional desaturation) occur precisely during high-motion periods.

The naive approach treats signal quality as a preprocessing step: filter the noise, extract the heart rate, store the number. The correct architecture treats quality as a **first-class data dimension** that accompanies every measurement through the pipeline. Each heart rate reading carries a confidence score (0.0–1.0) derived from the concurrent accelerometer signal, PPG signal morphology, and template matching against known-good waveforms. This confidence score affects every downstream operation.

In anomaly detection, a heart rate of 150 BPM with confidence 0.95 during resting is a genuine clinical alert. A heart rate of 150 BPM with confidence 0.3 during vigorous exercise is expected physiology with uncertain measurement—not an alert. The same raw value produces opposite clinical decisions based on confidence. Without per-reading quality scores, the anomaly detector either generates massive false positives (alerting on noisy readings) or requires such high thresholds that it misses real events.

In baseline computation, the personalized baseline for resting heart rate must use only high-confidence readings during confirmed resting periods. Including low-confidence readings during exercise would inflate the baseline and desensitize the system. The baseline algorithm filters by confidence > 0.8 AND motion_level < 0.3 AND context == "resting"—three quality dimensions, not just the raw value.

In trend analysis, comparing this week's average HR to last week's is meaningless without confidence-weighted averaging. If the user exercised more this week (more low-confidence readings mixed in), a naive average shifts upward even if resting physiology is unchanged. Confidence-weighted aggregation solves this automatically.

The lesson extends beyond wearables: any system ingesting data from noisy, real-world sensors should model data quality as a first-class dimension, not an afterthought.

---

## Insight 4: The Regulatory Gradient Forces Architectural Bifurcation That Defines the Platform's Velocity

**Category:** Compliance

**One-liner:** The coexistence of unregulated wellness features and FDA-regulated clinical features on the same platform creates a regulatory gradient that forces pipeline separation—and getting this separation wrong either cripples innovation speed or risks regulatory violation.

**Why it matters:**

A wearable health platform uniquely straddles two regulatory regimes. Step counting, sleep tracking, and calorie estimation are wellness features with no regulatory burden—they can be A/B tested, iterated weekly, and deployed via standard CI/CD. ECG recording with atrial fibrillation detection, SpO2 monitoring with clinical alerts, and fall detection with emergency calling are Software as Medical Device (SaMD) features requiring FDA 510(k) or De Novo classification, with ongoing post-market surveillance obligations.

The architectural mistake is treating these as a spectrum. They are a binary: either a feature is regulated or it isn't. And the regulatory requirements for the "is" category are structurally incompatible with fast iteration: IEC 62304 software lifecycle processes, ISO 14971 risk management, design history files, clinical validation with predefined acceptance criteria, change control boards that review every modification, traceability matrices linking requirements to code to tests. Applying these processes to step counting would make it impossible to ship improvements faster than quarterly. Not applying them to AFib detection would be a regulatory violation that could result in product recall.

The correct architecture cleanly bifurcates the processing pipeline into a wellness track and a clinical track. They share infrastructure (API gateway, authentication, storage encryption, device management) but diverge at the processing layer. Wellness services deploy continuously through standard CI/CD. Clinical services deploy through a validated pipeline with frozen code, regression testing against clinically validated datasets, and change control approval before production release.

The subtlety is at the boundary. Heart rate display is wellness (no clinical claim). Heart rate with "abnormally high heart rate" notification is likely SaMD (clinical decision support). The same data, processed by different pipelines, with different regulatory obligations. The architecture must route data to the appropriate pipeline based on the feature consuming it, not the data type itself. This routing logic—and its correctness—becomes a compliance-critical component in its own right.

This regulatory bifurcation also shapes the ML model lifecycle. Wellness ML models (activity classification, sleep staging) can be continuously retrained and deployed. Clinical ML models (AFib detection, SpO2 alerting) require clinical validation of each new version against a held-out dataset, with documented sensitivity/specificity meeting FDA-accepted performance thresholds, before deployment. The model versioning and deployment infrastructure must support both cadences.

---

## Insight 5: Personalized Baselines Transform Anomaly Detection from Population Statistics to Individual Medicine

**Category:** ML Architecture

**One-liner:** The difference between a wearable that generates alert fatigue and one that delivers clinically meaningful insights is whether anomaly detection uses population-level thresholds or individually learned baselines—and building those baselines requires solving a subtle cold-start and data quality problem.

**Why it matters:**

Population-level health thresholds are blunt instruments. A resting heart rate of 100 BPM triggers a tachycardia alert—but for a deconditioned sedentary user, 90 BPM may be their normal, while for a trained endurance athlete, 50 BPM is normal and 65 BPM would be a genuine concern. SpO2 of 94% generates an alert, but a user living at 3,000 meters altitude normally reads 93–95%. Using population thresholds, the athlete gets zero useful alerts while the altitude dweller gets daily false alarms. Both lose trust in the system.

Personalized baselines solve this by learning each user's individual normal ranges from their own historical data. The algorithm collects 14 days of quality-filtered resting measurements, computes a time-weighted average (recent data weighted more heavily), calculates the user's personal standard deviation, and sets alert thresholds at ±2σ from their personal baseline. The athlete's resting HR baseline becomes 48 BPM ± 4 BPM, so 60 BPM genuinely triggers investigation. The altitude user's SpO2 baseline becomes 94% ± 1%, so 91% triggers an appropriate alert.

The cold-start problem is architecturally significant. For the first 14 days of device usage, the system has no personal baseline. Using population defaults during this period generates the worst possible first impression—exactly the period when users form trust in the product. The solution is a graduated approach: start with population baselines adjusted for user-provided demographics (age, sex, fitness level), narrow the normal range progressively as personal data accumulates, and reach full personalization after 14+ days of quality data.

Baseline maintenance is equally challenging. Baselines must adapt to legitimate changes (user starts exercising regularly → resting HR drops over weeks) while detecting pathological changes (resting HR rises due to developing heart failure). The algorithm uses exponential time-weighting (recent data counts more) to track gradual legitimate shifts, while using change-point detection (CUSUM algorithm) to identify abrupt shifts that may warrant clinical attention. The difference between "your baseline is naturally shifting" and "something changed that needs investigation" is one of the most nuanced inference problems in the system.

The architecture must also handle baseline corruption: a week of illness (elevated HR, disrupted sleep) shouldn't permanently shift the baseline. Quality filtering helps—low-confidence readings during fever are excluded—but the system also needs explicit "illness mode" or "recovery mode" signals (potentially user-reported) to temporarily pause baseline updates during known transient states.

---

*Back to: [Index →](./00-index.md)*
