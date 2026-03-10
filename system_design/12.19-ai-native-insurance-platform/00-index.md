# 12.19 AI-Native Insurance Platform

## System Overview

An AI-native insurance platform is a full-stack insurtech system that replaces legacy actuarial batch processes with real-time ML pipelines spanning underwriting, pricing, claims, and fraud detection—operating across the entire policy lifecycle from quote to renewal. Unlike traditional insurers that apply statistics to historical loss tables, an AI-native platform collects behavioral signals at quote time (telematics, smartphone accelerometer data, home IoT sensors), scores risk in real time through a multi-model ensemble, issues a binding quote in under 90 seconds, and initiates a claims conversation through a natural language interface that can close straightforward claims autonomously in under three minutes. The central engineering challenge is the intersection of regulated financial data (PII, PHI, underwriting variables), strict actuarial fairness requirements (state-by-state prohibited rating factors), hard real-time latency constraints (customers abandon quote flows after 90 seconds), and adversarial fraud rings that operate at scale across claimant networks. The system must simultaneously serve a consumer-facing quote API at sub-200ms p99, run a continuous telematics ingestion pipeline processing millions of driving events per minute, maintain a fraud graph that links claims, claimants, and third-party participants, file rate changes across 50 state regulatory jurisdictions, and retrain risk models on a weekly cadence while preserving the regulatory traceability that actuarial rate filings require. Every model decision that touches a pricing or coverage outcome must be explainable in plain language to satisfy state insurance commissioner audits and adverse action notice requirements under the Fair Credit Reporting Act (FCRA) and state analog laws.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Architecture Style** | Event-driven multi-pipeline: real-time scoring API, streaming telematics ingest, async claims workflow, batch model retraining, and regulatory reporting jobs |
| **Core Abstraction** | The *risk score record*: immutable snapshot of all features and model outputs at the moment a binding quote or renewal decision is made—required for regulatory audit traceability |
| **Underwriting Pipeline** | Real-time multi-model ensemble (GLM baseline + gradient boosting + telematics neural net) producing a coverage offer in ≤90 seconds from quote request |
| **Claims Workflow** | Conversational AI intake → automated damage assessment (photo/video) → fraud scoring → straight-through payment or adjuster escalation |
| **Telematics Ingestion** | Continuous smartphone/OBD-II event stream (GPS, accelerometer, gyroscope) processed at ≥50k events/sec; aggregated into behavioral driving scores |
| **Fraud Detection** | Graph neural network across claimant-provider-accident relationship graph; real-time scoring at claims submission, batch ring detection on weekly cadence |
| **Pricing Engine** | Usage-based insurance (UBI) with dynamic premium adjustment; behavioral score updates trigger re-rating within one billing cycle |
| **Regulatory Compliance** | 50-state rate filing system; per-state prohibited factor enforcement; FCRA adverse action notice generation; NAIC Data Security Model Law compliance |
| **Explainability** | SHAP-based feature attribution for every underwriting decision; consumer-facing plain-language explanation generator; regulatory audit export format |
| **Data Sensitivity** | PII, driving behavior, home sensor data, health signals (life/health lines)—tiered encryption, strict data minimization, consumer access/deletion rights |

---

## Quick Navigation

| Document | Focus |
|---|---|
| [01 — Requirements & Estimations](./01-requirements-and-estimations.md) | Functional requirements, capacity math, SLOs |
| [02 — High-Level Design](./02-high-level-design.md) | System architecture, data flows, key design decisions |
| [03 — Low-Level Design](./03-low-level-design.md) | Data models, API contracts, core algorithms |
| [04 — Deep Dives & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Underwriting pipeline, telematics, claims automation, fraud graph |
| [05 — Scalability & Reliability](./05-scalability-and-reliability.md) | Quote burst scaling, telematics ingest, model serving |
| [06 — Security & Compliance](./06-security-and-compliance.md) | Regulatory compliance, data protection, FCRA, NAIC |
| [07 — Observability](./07-observability.md) | Risk model monitoring, claims funnel metrics, fraud signal freshness |
| [08 — Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, scoring rubric |
| [09 — Insights](./09-insights.md) | 8 key architectural insights |

---

## What Differentiates Naive vs. Production

| Dimension | Naive Approach | Production Reality |
|---|---|---|
| **Underwriting** | Batch nightly actuarial scoring on application data | Real-time multi-model ensemble with sub-200ms inference; features pre-computed from external data bureaus and telematics; score record frozen at binding for regulatory traceability |
| **Pricing** | Annual rate table lookup by ZIP and demographic bucket | Continuous behavioral score updates from telematics; per-driver, per-vehicle dynamic base rate recalculated at each billing cycle; state-approved rating algorithm versioning |
| **Claims Intake** | Web form → adjuster phone call → email trail | Conversational AI bot with intent classification; multimodal damage assessment from uploaded photos; automated straight-through payment for small clear claims without adjuster |
| **Fraud Detection** | Rule-based red flags on individual claims | Graph neural network linking claimant ↔ provider ↔ accident location networks; detects organized ring fraud invisible to per-claim rules; real-time scoring at first notice of loss |
| **Telematics** | Optional plug-in device; data analyzed monthly | Continuous smartphone SDK collecting 10Hz accelerometer/GPS; edge preprocessing on device; server-side trip reconstruction; behavioral scores updated after every trip |
| **Regulatory Compliance** | Manual rate filing per state | Automated SERFF-format rate filing pipeline; per-state prohibited factor enforcement at scoring time; FCRA adverse action notice generation within 3 business days |
| **Explainability** | Model output score only | SHAP feature attribution for every decision; consumer-facing reason codes in plain language; actuarial report export for state regulator review |
| **Model Governance** | Ad-hoc model deployment | Formal model risk management (MRM) framework; challenger-champion A/B framework; statistical disparate impact testing before any production deployment |

---

## What Makes This System Unique

### The Regulatory Constraint Is a First-Class Architecture Driver

Insurance is among the most heavily regulated industries in the United States: each of the 50 states maintains its own insurance commissioner, rate approval process, and set of prohibited rating factors. A rating variable legal in one state (e.g., credit score for auto insurance) may be prohibited in another (California, Hawaii, Massachusetts ban it for auto). This means the underwriting and pricing pipeline cannot be a single model—it must be a parameterized system where the feature set, model weights, and approved algorithm version are selectable per state at inference time, and where every rating decision is reproducible for the actuarial rate filing that was in effect at the moment of binding.

### The Real-Time / Batch Duality at Every Layer

An AI-native insurance platform operates in two fundamentally different time regimes simultaneously: sub-second real-time scoring (quote, claims intake, fraud at FNOL) and long-horizon batch analytics (weekly model retraining on loss data with 12-month development lag, annual rate filings). These regimes share data but must be architecturally separated—real-time paths cannot depend on batch jobs, and batch jobs must not corrupt live model artifacts. The dual-write pattern (event stream for real-time; data warehouse for batch) is the central architectural seam.

### Fraud Rings Require Graph Intelligence, Not Individual Claim Scoring

Insurance fraud costs the US industry an estimated $80B annually. A significant fraction is organized ring fraud—networks of claimants, staged accident participants, and complicit medical providers submitting coordinated claims. Individual claim scoring misses this completely. Detecting ring fraud requires maintaining a live entity graph linking claimants, vehicles, accident locations, repair shops, and medical providers—and running graph neural network inference on subgraphs centered on each new claim. This graph must be queryable in real time at claims submission while also supporting weekly batch ring detection across millions of historical claims.

### Behavioral Data Creates a Virtuous Loop with Adverse Selection Defense

Traditional insurers suffer adverse selection: people who know they are higher risk are more likely to buy insurance. AI-native behavioral pricing partially inverts this: safe drivers who adopt telematics-based pricing are self-selected lower risks who benefit from it, while higher-risk drivers opt out. The telematics data also continuously updates the risk score, allowing the insurer to identify policyholders whose behavior has degraded since binding—enabling proactive renewal pricing rather than reacting to claims. The challenge is that this creates privacy and fairness concerns (continuous monitoring of a policyholder's daily movement) that must be addressed architecturally through explicit consent flows, data retention limits, and actuarial fairness audits.
