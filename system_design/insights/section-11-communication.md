# Section 11: Communication Systems

> Part of the [System Design Insights Index](../insights-index.md). For cross-cutting patterns, see [Insights by Category](./by-category.md).

---

### 11.1 Online Learning Platform [View](../11.1-online-learning-platform/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | Progress Tracking Demands Financial-Grade Durability Despite Being an Educational Feature | Resilience |
| 2 | The CDN Is the Architecture—Everything Else Is a Control Plane | Scaling |
| 3 | Assessment Integrity Is an Adversarial Security Problem Disguised as a Product Feature | Security |
| 4 | The Content Graph's Hierarchical Dependencies Create a Hidden State Machine Problem | Data Structures |
| 5 | Multi-DRM Is a Necessary Tax Whose Latency Impact Must Be Architecturally Hidden | Caching |

---

### 11.2 Live Classroom System [View](../11.2-live-classroom-system/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | The Media Plane and Control Plane Must Be Architecturally Independent—They Fail Differently | System Modeling |
| 2 | Simulcast Layer Selection Is the Single Biggest Lever for Cost, Quality, and Scalability | Cost Optimization |
| 3 | Hour-Boundary Thundering Herds Are a Schedule-Driven Capacity Cliff That Traditional Auto-Scaling Cannot Handle | Scaling |
| 4 | CRDTs Solve Whiteboard Convergence but Create a Monotonically Growing State Problem That Requires Application-Level Garbage Collection | Data Structures |
| 5 | Breakout Rooms Are a Dynamic Topology Orchestration Problem Disguised as a Feature Toggle | System Modeling |
| 6 | SFU Failover Mid-Session Is a Hard Real-Time Problem Where "Eventually Consistent" Means "Visibly Broken" | Resilience |
| 7 | DTLS-SRTP Encryption Makes the SFU a Trusted Intermediary—and E2EE Fundamentally Changes What the SFU Can Do | Security |

---

### 11.3 Push Notification System [View](../11.3-push-notification-system/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | You Don't Own the Last Mile—And That Changes Everything | Architecture |
| 2 | Fan-Out Is Not Pub/Sub—It's 500 Million Individually-Addressed API Calls | Scaling |
| 3 | Provider Heterogeneity Makes the Adapter Layer a Leaky Abstraction by Necessity | Integration |
| 4 | Token Entropy Is a Silent Reliability Killer That Demands Active Management | Reliability |
| 5 | Priority Isolation Requires Physical Queue Separation, Not Logical Priority Fields | Contention |
| 6 | Timezone-Aware Delivery Creates a Rolling Global Peak That's More Manageable Than a Synchronized Spike | Traffic Shaping |
| 7 | Provider Feedback Is the Immune System—Without It, the System Silently Degrades | Resilience |

---

### 11.4 Email Delivery System [View](../11.4-email-delivery-system/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | Reputation Is the Product — Not Infrastructure, Not Software | Architecture |
| 2 | The Receiving Side Controls Everything — You Cannot Force Delivery | Constraints |
| 3 | The Multi-Stage Queue Is the Architecture's Defining Pattern | Data Structures |
| 4 | Suppression Lists Demand a Three-Layer Architecture for Sub-Microsecond Compliance Enforcement | Performance |
| 5 | Bot Detection Has Become the Central Accuracy Problem for Email Analytics | Analytics |
| 6 | IP Warming Is a Trust-Building Protocol That Cannot Be Shortcut | Scaling |
| 7 | Time-Sensitivity Spans Six Orders of Magnitude Within a Single System | Scheduling |

---

### 11.5 SMS Gateway [View](../11.5-sms-gateway/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | The Carrier Is the Bottleneck You Cannot Engineer Away | Scaling |
| 2 | Message State Is a Distributed Consensus Problem Across Trust Boundaries | Consistency |
| 3 | Regulatory Compliance Is Per-Message, Creating a Unique Runtime Evaluation Problem | Compliance |
| 4 | GSM-7 Encoding Is a Hidden Cost Multiplier That Shapes Product Decisions | Data Structures |
| 5 | Carrier-Partitioned Queues Are a Rate-Matching Architecture, Not Just a Routing Convenience | Architecture |
| 6 | SMPP's Asynchronous Window Protocol Creates a Natural Backpressure Mechanism | Resilience |
| 7 | Traffic Pumping Is an Economic Attack Exploiting the Billing Asymmetry Between Sender and Receiver | Security |
| 8 | The 10DLC Registration Pipeline Converts a Real-Time System Into a Days-Long Approval Workflow | Operations |

