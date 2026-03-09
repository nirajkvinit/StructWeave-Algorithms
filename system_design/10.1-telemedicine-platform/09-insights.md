# Architectural Insights — Telemedicine Platform

---

## Insight 1: SFU Over MCU Preserves End-to-End Encryption Without Sacrificing Scale

**Category:** Streaming

**One-liner:** The SFU architecture forwards encrypted media packets without decryption, uniquely satisfying HIPAA's transmission security requirement while enabling horizontal scaling.

**Why it matters:**

The choice between SFU (Selective Forwarding Unit) and MCU (Multipoint Control Unit) appears to be a standard WebRTC topology decision, but in healthcare it becomes a compliance-defining architectural choice. An MCU decodes incoming streams, composites them into a single mixed output, and re-encodes for each receiver. This decode-encode cycle means the MCU possesses the media in plaintext — it can see and hear the patient's consultation. Under HIPAA, this makes the MCU a system that processes ePHI, requiring additional encryption layers, access controls, and audit mechanisms for the media processing pipeline itself.

An SFU, by contrast, receives encrypted DTLS-SRTP packets and forwards them without decryption. The media content never exists in plaintext on the server. This is a fundamental architectural simplification: the SFU handles encrypted byte streams, not patient health information. While the SFU still requires HIPAA safeguards (it processes session metadata), the PHI exposure surface is dramatically reduced.

The scale implications compound the advantage. An MCU performing decode-encode cycles consumes 10-20x more CPU per session than an SFU doing packet forwarding. At 25,000 concurrent sessions, an MCU architecture would require thousands of high-CPU servers for transcoding, while an SFU architecture needs ~50 mid-tier servers. The cost difference is an order of magnitude.

The one trade-off: in multi-party sessions (3+ participants), each client must decode N-1 streams rather than a single mixed stream. For telemedicine, this is acceptable — sessions rarely exceed 4 participants (patient, provider, specialist, interpreter), and modern devices easily handle 3 decode streams. The SFU architecture is one of those rare cases where the compliance-optimal choice also happens to be the performance-optimal and cost-optimal choice.

---

## Insight 2: Scheduling Requires Serializable Isolation Despite Low Average Throughput

**Category:** Consistency

**One-liner:** The low average booking rate (12/second) disguises extreme temporal concentration that demands database-level serializability to prevent patient-impacting double-bookings.

**Why it matters:**

A naive analysis of 1M appointments per day yields ~12 bookings per second average — a load any database handles trivially. This leads many candidates to dismiss concurrency as a non-issue and implement optimistic locking or even no locking at all. The critical insight is that booking traffic exhibits extreme temporal skew: popular providers in popular time zones receive burst booking requests during a narrow window (8-10 AM), and highly desirable slots (Monday 9 AM with a top-rated specialist) may receive 5-10 simultaneous booking attempts.

The consequence of a double-booking in healthcare is qualitatively different from, say, an e-commerce oversell. A double-booked patient shows up expecting a medical consultation and doesn't receive one. This can delay diagnosis, interrupt treatment plans, and erode trust in the platform. There is no "compensate with a coupon" equivalent. The correctness requirement is absolute.

Serializable isolation on the booking transaction path — achieved through `SELECT FOR UPDATE` with a version column — eliminates the race condition entirely. The first transaction to acquire the row lock wins; all concurrent attempts see the slot as booked and receive a conflict response with alternative suggestions. The latency overhead of row-level locking (typically 5-20ms additional) is invisible to the user compared to the 300ms+ UI interaction time.

The read path (availability queries) is a different story entirely. At 500 queries/second, hitting the database directly would overwhelm the booking transactions through lock contention. The cache-aside pattern with 30-second TTL decouples reads from writes: patients see availability that's at most 30 seconds stale, but the booking transaction still validates atomically. The staleness means a patient might occasionally click a slot that's been booked 20 seconds ago and see a "slot taken" message — a minor UX friction that's vastly preferable to a double-booking.

---

## Insight 3: PHI Segmentation Transforms Breach Impact From Catastrophic to Contained

**Category:** Security

**One-liner:** Separating identity, clinical, and operational data into distinct stores with separate encryption keys ensures that compromising any single system cannot expose complete patient records.

**Why it matters:**

HIPAA breach notification costs scale non-linearly with the completeness of exposed records. A breach exposing appointment timestamps (operational data) is annoying but not catastrophic — timestamps alone don't identify patients or reveal health conditions. A breach exposing names with diagnosis codes is significantly more damaging. A breach exposing names, SSNs, diagnoses, medications, and encounter notes together is a worst-case scenario requiring individual notification, media disclosure, and potential OCR investigation.

PHI segmentation ensures this worst case is architecturally impossible through a single point of failure. Identity data (names, SSNs, contact info) lives in one store encrypted with Key A. Clinical data (diagnoses, prescriptions, notes) lives in another store linked only by a pseudonymized patient token, encrypted with Key B. Operational data (appointment times, billing codes) lives in a third store linked by appointment IDs, encrypted with Key C.

A breach of the clinical store exposes diagnoses and medications linked to opaque tokens — concerning, but not individually identifiable without the identity store. A breach of the identity store exposes demographics without any clinical context. Only a simultaneous breach of both stores, plus knowledge of the token-to-identity mapping, yields complete records.

This segmentation also makes the HIPAA "minimum necessary" principle structurally enforceable rather than policy-dependent. The billing service can only access identity + operational stores (it needs patient name and CPT codes, not clinical notes). The RPM anomaly detection service accesses clinical data via tokens without ever seeing patient names. Each service's access scope is determined by which stores it can reach, not by application-level access control lists that might have bugs.

The cost is application-level joins. Queries that span identity and clinical data (e.g., "show me patient Jane Doe's medication list") require the application to first resolve the identity, retrieve the pseudonymized token, then query the clinical store. This adds 10-20ms of latency per cross-store join — invisible in user-facing workflows but a real consideration for batch analytics. For analytics, the platform provides a de-identified data warehouse where pre-joined, de-identified records are available without cross-store joins.

---

## Insight 4: No-Show Prediction Converts a Revenue Problem Into a Capacity Optimization Lever

**Category:** Scaling

**One-liner:** Predictive modeling of no-show probability enables intelligent overbooking that recovers 10-15% of provider capacity without degrading patient experience.

**Why it matters:**

Telemedicine no-show rates of 15-25% represent the single largest source of provider capacity waste. For a platform with 200K active providers averaging 15 appointments/day at $50/consult, a 20% no-show rate means $30M in lost revenue per day. This is not a scheduling bug — it's an inherent characteristic of appointment-based healthcare.

The naive solution (don't allow booking too far in advance) conflicts with patient needs for planning and provider needs for schedule predictability. The intelligent solution is overbooking — selectively allowing more appointments than slots when the model predicts high no-show probability for specific bookings.

The no-show prediction model uses surprisingly simple features that yield strong predictive power: a patient's historical no-show rate (strongest signal), booking lead time (longer lead → higher no-show), reminder confirmation status (confirmed → much lower no-show), and recency of last visit (recent engagement → lower no-show). A logistic regression with these features achieves 0.75-0.80 AUC, sufficient for the binary overbooking decision.

The key architectural insight is that overbooking must be probabilistic, not deterministic. When the model predicts a 40% no-show probability, the expected number of patients showing up for two bookings in the same slot is 1.2 (0.6 + 0.6). The 20% chance that both show up is managed through the waiting room queue — the second patient waits 10-15 minutes. This is a strictly better outcome than the 40% chance of an empty slot with no overbooking.

The system must also handle the feedback loop: if overbooking causes wait times to increase, patient satisfaction drops, leading to more cancellations. The platform monitors overbooking-induced wait times and automatically reduces overbooking aggressiveness if average wait time exceeds a threshold (e.g., 10 minutes).

---

## Insight 5: Event-Driven Audit Trails Decouple Compliance From Performance

**Category:** Consistency

**One-liner:** Routing PHI access events through an asynchronous event backbone to an append-only store satisfies HIPAA audit requirements without adding latency to the clinical workflow hot path.

**Why it matters:**

HIPAA requires comprehensive audit trails of all PHI access — who accessed what data, when, why, and whether it was authorized. A large telemedicine platform generates 1B+ audit events per day (every API call touching PHI, every screen rendering patient data, every report generation). Synchronously writing each audit record to a durable store before responding to the API call would add 5-15ms of latency to every PHI-related operation, degrading the provider experience measurably.

The event-driven approach decouples audit logging from the hot path. Services emit audit events to the event backbone asynchronously. A dedicated audit consumer writes events to an append-only, immutable store. The provider experiences zero additional latency — the audit event is published after the API response is sent.

The trade-off is a brief window (typically < 1 second) where a PHI access has occurred but the audit record hasn't yet been persisted. This is acceptable for routine access (viewing patient records during a consultation). For high-sensitivity operations — bulk PHI export, record sharing with external parties, or administrative access — the platform switches to synchronous audit logging, where the API response is withheld until the audit record is durably written.

The immutable store adds tamper evidence through hash chaining. Each audit record includes a SHA-256 hash of the concatenation of the previous record's hash and the current record's content. Modifying any historical record breaks the chain at that point, immediately detectable during periodic verification. This hash chain satisfies HIPAA's integrity control requirement and provides forensic evidence admissible in breach investigations.

The append-only nature also simplifies storage. Audit records are never updated or deleted (7-year retention minimum). The store is optimized for sequential writes and range reads (by time, actor, or patient). Compression ratios of 10:1 are typical for structured audit events, keeping the 7-year storage cost manageable even at 1B events/day.

---

## Insight 6: Simulcast Enables Clinical-Grade Quality Adaptation Without Server-Side Transcoding

**Category:** Streaming

**One-liner:** Publishing three quality layers simultaneously allows the SFU to adapt video quality to receiver bandwidth instantly, maintaining clinical fidelity on good connections while gracefully degrading on poor ones.

**Why it matters:**

A dermatologist examining a skin lesion via telemedicine needs high-resolution, color-accurate video. A patient on a rural cellular connection might have only 500 Kbps available. The traditional solution — server-side transcoding — would require the SFU to decode the high-resolution stream and re-encode it at lower quality. This breaks E2E encryption, multiplies server CPU by 10-20x, and adds 50-100ms of transcoding latency.

Simulcast elegantly avoids all three problems. The sender simultaneously encodes and publishes three quality layers: full resolution (1080p, 2.5 Mbps), half resolution (540p, 500 Kbps), and quarter resolution (180p, 150 Kbps). The SFU, without decrypting any stream, simply selects which layer to forward to each receiver based on the receiver's reported available bandwidth.

Layer switching happens within one keyframe interval (~2 seconds). When the SFU's bandwidth estimator detects a receiver's available bandwidth dropping below the current layer's bitrate, it switches to a lower layer at the next keyframe. The transition is perceptually smooth — the user sees a brief resolution change rather than freezing or packet loss artifacts.

For telemedicine, the platform extends simulcast with visit-type-specific adaptation policies. A dermatology consult prioritizes resolution over frame rate — the SFU will maintain the 1080p layer at 15fps rather than switching to 540p at 30fps. A physical therapy consult prioritizes frame rate for smooth motion — the SFU favors 720p at 30fps over 1080p at 15fps. These clinical profiles are configured per visit type and applied automatically by the SFU's layer selection algorithm.

The bandwidth cost trade-off is that the sender uploads three layers simultaneously (~3.2 Mbps total vs. ~2.5 Mbps for single-layer). For providers on wired connections this is negligible. For patients on bandwidth-constrained connections, the client can disable simulcast and send a single layer — the SFU then forwards that single layer without quality adaptation options. This asymmetric approach (provider sends simulcast, patient sends single layer) works well because the provider's stream (showing lab results, imaging) benefits more from quality adaptation than the patient's stream.

---

## Insight 7: Cascading SFU Architecture Enables Global Video Routing Without Centralized Bottlenecks

**Category:** Scaling

**One-liner:** Connecting regional SFU clusters through server-to-server encrypted tunnels enables cross-region consultations while keeping media routing decentralized and independently scalable.

**Why it matters:**

A telemedicine platform with providers and patients across multiple continents faces a routing challenge: a patient in Tokyo consulting with a specialist in New York needs media to traverse ~200ms of network latency. Routing both through a single SFU cluster in either location means one participant has near-zero latency while the other has 400ms round-trip — unacceptable for clinical interaction.

The cascading SFU architecture places SFU clusters in each region and connects them with server-to-server DTLS-SRTP tunnels. The patient connects to SFU-Tokyo (low latency), the provider connects to SFU-NewYork (low latency), and the SFUs exchange media over the cascade link. Total added latency from cascading is 20-40ms per hop — bringing total end-to-end latency to ~240ms rather than ~400ms.

The architectural elegance is that each SFU cluster scales independently. SFU-Tokyo scales based on Asia-Pacific demand; SFU-NewYork scales based on US-East demand. A pandemic surge in one region doesn't consume capacity in another. Cross-region consultations are the minority (~15% of sessions), so cascade link bandwidth requirements are modest compared to total cluster capacity.

The routing algorithm considers three factors: participant proximity (connect each to nearest SFU), cluster load (avoid overloaded clusters), and cascade hop count (maximum 2 hops to keep latency bounded). For a patient in Germany consulting with a provider in Brazil, the algorithm might route through SFU-Frankfurt → SFU-SaoPaulo (1 hop) rather than SFU-Frankfurt → SFU-London → SFU-SaoPaulo (2 hops), unless SFU-SaoPaulo is overloaded.

The failure mode is also contained. If SFU-Frankfurt fails, only European sessions are disrupted. The signaling server detects the failure and redirects affected participants to SFU-London as a fallback, accepting slightly higher latency for European patients during recovery. Cross-region sessions cascade through SFU-London instead. This regional fault isolation is impossible with a centralized SFU architecture.

---

## Insight 8: Consent as a Runtime Enforcement Primitive, Not a Paper Exercise

**Category:** Security

**One-liner:** Encoding patient consent as a machine-readable, version-controlled object evaluated at every PHI access point transforms consent from a compliance checkbox into an architectural access control mechanism.

**Why it matters:**

Traditional consent management in healthcare is a paper form signed during intake and filed in the patient's chart. It's a legal artifact, not a technical control. If a provider who doesn't have consent queries the database, the database returns the data anyway — the consent form in the chart doesn't prevent the query.

A telemedicine platform processes PHI across dozens of services, any of which could access patient data. Relying on application-level access control lists alone means every service must independently check whether the requesting provider has consent. A single missed check — one service, one endpoint, one edge case — creates a HIPAA violation.

The insight is to make consent a data-layer primitive. The consent engine maintains machine-readable consent records: which patient granted consent, to which provider/entity, for which data categories, for what purpose, with what expiration. Every PHI query passes through a consent evaluator before the data layer returns results. If the requesting provider doesn't have active consent for the requested data categories, the query returns an authorization error — regardless of the provider's role or system permissions.

This creates defense-in-depth with RBAC. A provider may have the role permission to view patient records, but consent evaluation adds a second gate: does this specific patient consent to this specific provider accessing this specific data for this specific purpose? This granularity is impossible with role-based access alone.

Consent versioning handles the dynamic nature of patient preferences. A patient might initially consent to full data sharing, then narrow consent to exclude mental health records, then revoke consent entirely. Each change creates a new consent version. The audit trail records which consent version was active for each PHI access, providing a complete provenance chain for compliance audits.

The cost is query latency — adding a consent evaluation step to every PHI query adds 2-5ms. Caching active consent records (with write-through invalidation on consent changes) reduces this to < 1ms for the common case. The cache TTL must be short (60 seconds maximum) because a patient might revoke consent and expect it to take effect promptly.

---

## Insight 9: Polyglot Persistence Maps Healthcare Data Heterogeneity to Optimal Storage Engines

**Category:** Data

**One-liner:** Telemedicine data spans five fundamentally different access patterns — relational, time-series, document, binary, and append-only — and storing each in its purpose-built engine yields 10x better performance than a one-size-fits-all approach.

**Why it matters:**

A telemedicine platform's data landscape is uniquely heterogeneous. Patient demographics and appointments are relational (structured, transactional, joins). RPM vital signs are time-series (append-heavy, time-range queries, downsampling). Clinical documents are semi-structured (variable schema, full-text search). Video recordings are large binary objects (write-once, read-rarely, lifecycle management). Audit logs are append-only (never update, hash chain integrity, compliance retention).

Forcing all five data types into a single relational database creates crippling performance mismatches. A relational DB handling 500M RPM data points per day would require aggressive write optimization (partitioning, batch inserts, disabling indexes) that degrades its performance for the transactional scheduling queries running concurrently. A time-series database achieving 10x write throughput for RPM data would struggle with the complex joins needed for patient record queries.

Polyglot persistence assigns each data type to its natural engine:
- Relational DB for patient, appointment, encounter, prescription (ACID transactions, referential integrity)
- Time-series DB for vital signs and video quality metrics (optimized append, native downsampling, time-range indexing)
- Document store for clinical notes and consent records (flexible schema, full-text search)
- Object storage for recordings and medical images (cost-effective, lifecycle policies, encryption)
- Append-only store for audit logs (immutable writes, hash chain, compliance retention)

The architectural challenge is maintaining consistency across stores. An encounter completion event must write to the relational DB (encounter status), document store (clinical notes), and trigger an audit entry — atomically from a business perspective. The event backbone provides eventual consistency: the encounter service writes to the relational DB, emits an EncounterCompleted event, and consumers write to the document store and audit log. The event stream's at-least-once delivery guarantee ensures all stores eventually converge.

Cross-store queries (e.g., "show patient's complete record including vitals, documents, and encounters") are handled by the read model pattern. A materialized view, built from event stream consumption, aggregates data from all stores into a read-optimized projection. The patient timeline API reads from this projection rather than querying five stores in real-time, reducing a 5-store scatter-gather to a single query.

---

## Insight 10: Graceful Degradation Hierarchy Preserves Clinical Utility During Partial Failures

**Category:** Reliability

**One-liner:** A five-level degradation hierarchy — from full service through AI-degraded, external-degraded, video-only, and emergency modes — ensures the platform always provides the maximum clinical utility possible given current system health.

**Why it matters:**

A telemedicine platform's failure modes are more nuanced than "up" or "down." The AI services might be unhealthy while all other services are fine. External integrations (pharmacy network, EHR) might be down while internal services operate normally. The video infrastructure might be healthy while the scheduling system is degraded. Each partial failure state should reduce functionality to exactly the minimum needed — no more, no less.

The five-level hierarchy:
- **Level 0 (Normal)**: Full functionality.
- **Level 1 (AI-Degraded)**: Provider matching falls back to simple specialty + availability filter. No-show prediction disabled. RPM anomaly detection uses static thresholds. Patient experience: minimal impact.
- **Level 2 (External-Degraded)**: Prescriptions queued for later delivery. Insurance eligibility shown as "pending." EHR sync delayed. Patient experience: consultations continue; post-visit actions delayed.
- **Level 3 (Video-Only)**: Existing appointments can proceed with video. No new bookings. Documentation in offline mode. Patient experience: active care continues; new access unavailable.
- **Level 4 (Emergency)**: Read-only access to patient records. No new sessions. Emergency contact info accessible. Patient experience: redirect to phone-based care.

The critical insight is that each level preserves the previous level's capabilities. Level 2 includes Level 1's fallbacks. Level 3 includes Level 2's. This prevents "cliff edges" where a single additional failure causes a disproportionate capability loss.

The degradation decisions are automated through health scoring. Each service reports its health on a 0-1 scale. The orchestrator computes the platform's degradation level based on which services are below their health threshold. Transitions between levels are hysteretic — entering a degraded level requires the health score to drop below a lower threshold, while exiting requires it to rise above a higher threshold. This prevents rapid oscillation when a service is borderline healthy.

The non-obvious benefit is operational confidence. Operators and clinicians know that even during a partial outage, the platform follows a predictable degradation path. Clinical leadership can make informed decisions: "We're in Level 2 — consultations work, prescriptions are delayed. We should tell providers to call pharmacies directly for urgent prescriptions." This predictability transforms a stressful incident into a manageable operational mode.

---

*Previous: [Interview Guide ←](./08-interview-guide.md)*
