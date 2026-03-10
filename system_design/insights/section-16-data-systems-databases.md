# Section 16: Data Systems & Databases

> Part of the [System Design Insights Index](../insights-index.md). For cross-cutting patterns, see [Insights by Category](./by-category.md).

---

### 16.1 Web Crawlers [View](../16.1-web-crawlers/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | The URL Frontier Is Not a Queue — It Is a Two-Dimensional Scheduler Solving Priority and Politeness Simultaneously | Data Structures |
| 2 | Politeness Is the Defining Constraint — Not a Feature — And It Inverts the Normal Scaling Paradigm | Scaling |
| 3 | Coverage, Freshness, and Politeness Form an Impossible Triangle — And the Crawler's Job Is to Navigate the Trade-off, Not Solve It | Contention |
| 4 | URL Normalization Is Deceptively Hard — And Getting It Wrong Means Either Wasting 30% of Your Crawl Budget or Missing Pages Entirely | Data Structures |
| 5 | Bloom Filters Trade a Small False Positive Rate for Massive Memory Savings — But "Small" at 10 Billion URLs Means 100 Million Missed Pages | System Modeling |
| 6 | DNS Resolution Is the Hidden Bottleneck — Every Fetch Requires It, Upstream Resolvers Have Rate Limits, and Cache Misses Add 50-500ms of Latency | Performance |
| 7 | Spider Traps Are Not Just Malicious — Most Are Accidental — And the Crawler Must Distinguish Infinite URL Spaces from Legitimately Large Sites | Resilience |
| 8 | Robots.txt Is Both a Contract and a Vulnerability — Treating a 5xx Response as "Allow Everything" Can Get the Crawler Permanently Blocked | Security |
| 9 | Recrawl Scheduling Is a Multi-Armed Bandit Problem — Not a Simple Timer — Because the Crawler Learns Page Change Frequency from Its Own Observations | Performance |
| 10 | The Fetcher's Connection Pool Is a Distributed Resource That Must Be Managed Like Database Connections — Per-Host Limits, Idle Timeouts, and the Thundering Herd Problem | Performance |
| 11 | Content-Addressed Storage Turns Deduplication From a Pre-Write Check Into a Free Property of the Storage Layer | Consistency |

---

### 16.2 Time-Series Database [View](../16.2-time-series-database/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | Time-Based Partitioning Is the Single Architectural Decision That Makes Every Core Operation Cheap | Partitioning |
| 2 | Gorilla Compression Is a Bet on Data Regularity That Fails Gracefully but Expensively | Data Structures |
| 3 | The Inverted Index Is a Search Engine, Not a Database Index — and This Changes the Scaling Model | Data Structures |
| 4 | Out-of-Order Ingestion Is Not an Edge Case — It Is the Default for Push-Based Architectures | Consistency |
| 5 | Downsampling Must Store Four Aggregations Per Interval Because No Single Aggregation Preserves the Original Signal | Cost Optimization |
| 6 | The Head Block Double-Buffer Swap Eliminates Write-Path Locks at the Cost of Temporary Memory Duplication | Contention |
| 7 | Compaction Is Not Just Optimization — It Is the Mechanism That Resolves Out-of-Order Data, Enforces Deletions, and Bounds Query Complexity | System Modeling |
| 8 | Cardinality Is an Adversarial Scaling Problem Because It Grows Combinatorially, Not Linearly | Scaling |
| 9 | The Columnar Revolution in TSDBs Is Not About Compression — It Is About Decoupling the Write Format from the Read Format | Architecture |
| 10 | The WAL Is Not Just a Crash Recovery Mechanism — Its Operational Characteristics Directly Determine Recovery Time, Replication Lag, and Write Latency Distribution | Resilience |

---

### 16.3 Text Search Engine [View](../16.3-text-search-engine/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | The Inverted Index Is Not a Data Structure — It Is a Co-Located Family of Six Specialized Structures That Must Be Consistent Within a Segment | Data Structures |
| 2 | BM25's IDF Creates a Distributed Coordination Problem That Most Systems Solve by Accepting Inaccuracy | Consistency |
| 3 | The Separation of Durability (Translog) from Searchability (Refresh) Is the Architectural Innovation That Enables Near-Real-Time Search | Resilience |
| 4 | The Segment Merge Tax Is the Fundamental I/O Budget That Determines the System's Throughput Ceiling | Contention |
| 5 | The Two-Phase Query-Then-Fetch Pattern Saves 95% of Network Bandwidth by Deferring Document Retrieval | Scaling |
| 6 | The Finite State Transducer Is the Memory-Efficiency Innovation That Makes Billion-Term Dictionaries Feasible | Data Structures |
| 7 | Hybrid Lexical-Vector Search with Reciprocal Rank Fusion Outperforms Either Approach Alone by 15-30% on Recall | Search |
| 8 | Dynamic Field Mapping Is a Ticking Time Bomb That Creates Cluster State Bloat and Eventual Cluster Instability | Resilience |
| 9 | Adaptive Replica Selection Transforms Shard Routing from a Load Balancing Problem into a Latency Optimization Problem | Scaling |
| 10 | Delete-by-ID in a Search Engine Does Not Free Space Until Merge — and GDPR Erasure Requires Force-Merge to Guarantee Physical Removal | Security |

---

### 16.4 Graph Database [View](../16.4-graph-database/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | Index-Free Adjacency Is Not an Optimization — It Is the Architectural Decision That Defines Whether You Have a Graph Database or a Graph API on a Relational Store | Data Structures |
| 2 | The Supernode Problem Is Not a Bug in Your Data Model — It Is a Fundamental Property of Real-World Graphs That Must Be Designed for at the Storage Engine Level | System Modeling |
| 3 | Graph Partitioning Is NP-Hard, and the Consequence Is That Every Distributed Graph Database Makes a Lossy Approximation Whose Error Directly Determines Traversal Performance | Partitioning |
| 4 | The Query Planner's Starting Node Selection Can Change Query Cost by Six Orders of Magnitude — Making It the Single Most Important Optimization in the System | Cost Optimization |
| 5 | The Doubly-Linked Relationship Chain Is the Most Elegant and Most Dangerous Data Structure in the System — Elegant Because It Enables Bidirectional Traversal Without Indexes, Dangerous Because Every Mutation Requires Six Coordinated Pointer Updates | Data Structures |
| 6 | Traversal Escalation Is a Graph-Specific Security Threat That Has No Equivalent in Relational Databases — An Authorized Starting Point Can Reach Unauthorized Data Through Structural Connectivity | Security |
| 7 | Property Sharding Separates What Changes Together From What Is Traversed Together — a Decomposition That Preserves Graph Locality While Enabling Horizontal Storage Scaling | Scaling |
| 8 | The Buffer Cache Hit Ratio Is the Single Number That Predicts Whether Your Graph Database Will Meet Its SLOs — Because Index-Free Adjacency's O(1) Guarantee Assumes Memory, Not Disk | Caching |
| 9 | The Wait-For Graph Used for Deadlock Detection Is Itself a Graph — Making Graph Databases One of the Rare Systems Where the Core Data Structure Appears in Its Own Operational Infrastructure | System Modeling |
| 10 | A Graph Database's Competitive Moat Is Not the Query Language — It Is the Physical Storage Layout That Makes Multi-Hop Traversals Independent of Data Size | Architecture |

---
