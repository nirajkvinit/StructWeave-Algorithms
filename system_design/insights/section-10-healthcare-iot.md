# Section 10: Healthcare & IoT

> Part of the [System Design Insights Index](../insights-index.md). For cross-cutting patterns, see [Insights by Category](./by-category.md).

---

### 10.1 Telemedicine Platform [View](../10.1-telemedicine-platform/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | SFU Over MCU Preserves End-to-End Encryption Without Sacrificing Scale | Streaming |
| 2 | Scheduling Requires Serializable Isolation Despite Low Average Throughput | Consistency |
| 3 | PHI Segmentation Transforms Breach Impact From Catastrophic to Contained | Security |
| 4 | No-Show Prediction Converts a Revenue Problem Into a Capacity Optimization Lever | Scaling |
| 5 | Event-Driven Audit Trails Decouple Compliance From Performance | Consistency |
| 6 | Simulcast Enables Clinical-Grade Quality Adaptation Without Server-Side Transcoding | Streaming |
| 7 | Cascading SFU Architecture Enables Global Video Routing Without Centralized Bottlenecks | Scaling |
| 8 | Consent as a Runtime Enforcement Primitive, Not a Paper Exercise | Security |
| 9 | Polyglot Persistence Maps Healthcare Data Heterogeneity to Optimal Storage Engines | Data Structures |
| 10 | Graceful Degradation Hierarchy Preserves Clinical Utility During Partial Failures | Resilience |

---

### 10.2 Cloud-Native EHR Platform [View](../10.2-cloud-native-ehr/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | FHIR-Native Storage Eliminates the Interoperability Translation Tax | Data Structures |
| 2 | The Master Patient Index Is the Most Safety-Critical Component in the Entire Platform | Consistency |
| 3 | Consent-at-the-Data-Layer Is the Only Architecturally Sound Approach to Patient Privacy | Security |
| 4 | CDS Alert Fatigue Is an Architecture Problem, Not a Clinical Education Problem | System Modeling |
| 5 | Patient-Based Partitioning Is Uniquely Well-Suited to Clinical Data Because of the "Chart" Access Pattern | Partitioning |
| 6 | The Audit Trail Is Not a Logging Feature — It Is a Regulatory Data Store with Stricter Requirements Than Clinical Data | Security |
| 7 | Break-the-Glass Is a Patient Safety Feature, Not a Security Bypass | Security |
| 8 | FHIR Subscriptions Transform the EHR from a Record System into an Event Platform | Streaming |
| 9 | Clinical Downtime Procedures Are an Architectural Requirement, Not an Operational Afterthought | Resilience |
| 10 | Terminology Binding Is the Hidden Foundation of Clinical Data Quality and Interoperability | Data Structures |

---

### 10.3 Smart Home Platform [View](../10.3-smart-home-platform/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | The Device Shadow Is Not a Cache — It's a Coordination Primitive | Data Structures |
| 2 | The Edge-Cloud Split Is Not About Performance — It's About Availability | Resilience |
| 3 | Capability Abstraction Is the Key to Surviving Protocol Wars | System Modeling |
| 4 | Automation Conflict Resolution Is the Hidden Complexity Monster | Consistency |
| 5 | MQTT Broker Scaling Requires Home-Affinity Routing | Partitioning |
| 6 | The Thundering Herd Is the Scariest Failure Mode — And the Easiest to Prevent | Traffic Shaping |
| 7 | Camera Data Requires a Fundamentally Different Architecture Than Other Devices | Security |
| 8 | The Hub Is a Distributed System's Weakest Link and Strongest Resilience Layer | Resilience |
| 9 | Matter Doesn't Eliminate Protocol Complexity — It Adds Another Layer | System Modeling |
| 10 | Smart Home Scale Is Unique Because Growth Is Per-Home, Not Per-User | Scaling |

---

### 10.4 Fleet Management System [View](../10.4-fleet-management-system/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | The Dual-Timescale Architecture Is the Defining Constraint | System Modeling |
| 2 | Geospatial Indexing Must Be a First-Class Architectural Primitive | Data Structures |
| 3 | The Edge-Cloud Continuum Is Non-Negotiable, Not an Optimization | Resilience |
| 4 | VRPTW Is NP-Hard, and Your Architecture Must Embrace This | System Modeling |
| 5 | Time-Series Data Demands a Purpose-Built Storage Strategy | Cost Optimization |
| 6 | Adaptive Telemetry Frequency Is a Hidden Bandwidth Multiplier | Cost Optimization |
| 7 | GPS Noise Filtering Determines System Trustworthiness | Consistency |
| 8 | Multi-Level Geofence State Management Is a Hidden Distributed Systems Problem | Consistency |
| 9 | Compliance Data and Operational Data Require Different Consistency Guarantees | Consistency |
| 10 | Predictive Maintenance ROI Depends More on Feature Engineering Than Model Sophistication | System Modeling |

---

### 10.5 Industrial IoT Platform [View](../10.5-industrial-iot-platform/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | The OT/IT Protocol Boundary Is the System's Most Consequential Architectural Decision | System Modeling |
| 2 | Report-by-Exception Fundamentally Changes the Data Economics of Scale | Data Structures |
| 3 | Edge Autonomy Is a Safety Requirement That Shapes the Entire Architecture | Resilience |
| 4 | Alarm Correlation Is the Bridge Between Raw Data and Operator Action | System Modeling |
| 5 | Time-Series Compression and Tiered Retention Are Existential for Long-Term Viability | Cost Optimization |

---

### 10.6 Wearable Health Monitoring [View](../10.6-wearable-health-monitoring/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | Battery Is the Architect, Not a Constraint | System Modeling |
| 2 | The Phone-as-Gateway Pattern Creates a Unique Three-Tier Processing Hierarchy | System Modeling |
| 3 | Motion Artifacts Make Signal Quality a First-Class Architectural Concern | Consistency |
| 4 | The Regulatory Gradient Forces Architectural Bifurcation That Defines the Platform's Velocity | Security |
| 5 | Personalized Baselines Transform Anomaly Detection from Population Statistics to Individual Medicine | Scaling |

---

### 10.7 Biometric Travel Platform [View](../10.7-biometric-travel-platform/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | On-Device Biometric Storage Is a Regulatory Mandate, Not a Design Choice | Security |
| 2 | The Gallery Lifecycle Is the Hidden Complexity Center | Contention |
| 3 | The Asymmetric Cost of Errors Demands Per-Touchpoint Threshold Tuning | Security |
| 4 | Edge-First Processing Creates a Novel Trust Architecture | System Modeling |
| 5 | Consent-Driven Architecture Is a Distributed State Machine, Not a Checkbox | Consistency |

