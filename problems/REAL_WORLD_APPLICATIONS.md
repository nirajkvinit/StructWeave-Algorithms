# Real-World Applications Index

> **Reverse mapping from industry domains to algorithmic problems**

This guide maps real-world engineering domains to the algorithmic problems that teach relevant concepts. Use it to:
- Connect your career interests to practice problems
- Understand *why* specific algorithms matter in production systems
- Prepare for domain-specific technical interviews

---

## Quick Navigation

| Domain | Key Concepts |
|--------|--------------|
| [Database Internals](#database-internals) | B-trees, LSM trees, indexing, query optimization |
| [Web Development](#web-development--backend-systems) | Caching, rate limiting, session management |
| [Operating Systems](#operating-systems--system-programming) | Scheduling, memory management, process coordination |
| [Distributed Systems](#distributed-systems) | Consensus, load balancing, partitioning |
| [Machine Learning](#machine-learning--data-science) | Optimization, clustering, similarity |
| [Computer Graphics](#computer-graphics--game-development) | Geometry, pathfinding, collision detection |
| [Networking](#networking--security) | Routing, packet processing, encryption |
| [Finance & Trading](#finance--trading) | Real-time processing, time series, risk analysis |
| [Healthcare & Bioinformatics](#healthcare--bioinformatics) | Sequence alignment, pattern matching |
| [DevOps & Infrastructure](#devops--infrastructure) | Resource allocation, monitoring, deployment |

---

## Database Internals

*For those building: database engines, storage systems, query planners*

### Indexing & Data Structures

| Problem | Why It Matters |
|---------|----------------|
| [E001 Two Sum](easy/E001_two_sum.md) | Hash table fundamentals → index lookups, join algorithms |
| [M008 Search in Rotated Sorted Array](medium/M008_search_in_rotated_sorted_array.md) | Binary search variants → B-tree traversal |
| [M556 Time Based Key-Value Store](medium/M556_time_based_key_value_store.md) | Temporal queries → MVCC, time-travel queries |
| [M015 Maximum Subarray](medium/M015_maximum_subarray.md) | Range queries → aggregate indexes |

### Sorting & Merging (LSM Trees, Compaction)

| Problem | Why It Matters |
|---------|----------------|
| [E088 Merge Sorted Array](easy/E088_merge_sorted_array.md) | Sorted merge → LSM tree compaction |
| [E021 Merge Two Sorted Lists](easy/E021_merge_two_sorted_lists.md) | Merge operations → k-way merge in databases |
| [H023 Merge K Sorted Lists](hard/H023_merge_k_sorted_lists.md) | K-way merge → external sorting, SSTable merging |

### Query Optimization

| Problem | Why It Matters |
|---------|----------------|
| [M565 Satisfiability of Equality Equations](medium/M565_satisfiability_of_equality_equations.md) | Constraint solving → query optimizer, join ordering |
| [H114 Subarrays with K Different Integers](hard/H114_subarrays_with_k_different_integers.md) | Sliding window → query window functions |

---

## Web Development & Backend Systems

*For those building: web services, APIs, caching layers*

### Caching & Rate Limiting

| Problem | Why It Matters |
|---------|----------------|
| [M556 Time Based Key-Value Store](medium/M556_time_based_key_value_store.md) | Time-based storage → Redis TTL, cache expiration |
| [E001 Two Sum](easy/E001_two_sum.md) | Hash lookups → cache hits, session stores |
| [M015 Maximum Subarray](medium/M015_maximum_subarray.md) | Streaming max → rate limit windows |

### Request Processing & Load Balancing

| Problem | Why It Matters |
|---------|----------------|
| [H009 Trapping Rain Water](hard/H009_trapping_rain_water.md) | Capacity analysis → buffer management |
| [M512 Minimize Malware Spread](medium/M512_minimize_malware_spread.md) | Network analysis → load distribution |

### URL & String Processing

| Problem | Why It Matters |
|---------|----------------|
| [M002 Longest Substring Without Repeating](medium/M002_longest_substring_without_repeating_characters.md) | Sliding window → URL parsing, text processing |
| [M003 Longest Palindromic Substring](medium/M003_longest_palindromic_substring.md) | String DP → slug generation, validation |

---

## Operating Systems & System Programming

*For those building: kernels, schedulers, memory managers*

### Process Scheduling

| Problem | Why It Matters |
|---------|----------------|
| [M088 Course Schedule](medium/M088_course_schedule.md) | Topological sort → dependency resolution, build systems |
| [M015 Maximum Subarray](medium/M015_maximum_subarray.md) | Local vs global optima → scheduling decisions |

### Memory Management

| Problem | Why It Matters |
|---------|----------------|
| [H009 Trapping Rain Water](hard/H009_trapping_rain_water.md) | Boundary tracking → memory pools, fragmentation |
| [M556 Time Based Key-Value Store](medium/M556_time_based_key_value_store.md) | Versioned storage → copy-on-write memory |

### Resource Allocation

| Problem | Why It Matters |
|---------|----------------|
| [H113 Binary Tree Cameras](hard/H113_binary_tree_cameras.md) | Minimum coverage → resource placement |
| [M512 Minimize Malware Spread](medium/M512_minimize_malware_spread.md) | Component analysis → process isolation |

---

## Distributed Systems

*For those building: microservices, consensus protocols, cloud infrastructure*

### Network Partitioning & Connectivity

| Problem | Why It Matters |
|---------|----------------|
| [M565 Satisfiability of Equality Equations](medium/M565_satisfiability_of_equality_equations.md) | Union-Find → network connectivity, cluster discovery |
| [M512 Minimize Malware Spread](medium/M512_minimize_malware_spread.md) | Connected components → failure domains, blast radius |

### Consensus & Coordination

| Problem | Why It Matters |
|---------|----------------|
| [H115 Number of Squareful Arrays](hard/H115_number_of_squareful_arrays.md) | Permutation constraints → configuration validation |
| [H116 Maximum Binary Tree II](hard/H116_maximum_binary_tree_ii.md) | Tree modification → distributed data structure updates |

### Load Distribution

| Problem | Why It Matters |
|---------|----------------|
| [H009 Trapping Rain Water](hard/H009_trapping_rain_water.md) | Capacity calculation → queue depth management |
| [M015 Maximum Subarray](medium/M015_maximum_subarray.md) | Peak detection → auto-scaling triggers |

---

## Machine Learning & Data Science

*For those building: ML pipelines, recommendation systems, analytics*

### Optimization

| Problem | Why It Matters |
|---------|----------------|
| [M015 Maximum Subarray](medium/M015_maximum_subarray.md) | Local/global optima → gradient descent concepts |
| [H009 Trapping Rain Water](hard/H009_trapping_rain_water.md) | Valley detection → anomaly detection in time series |

### Similarity & Clustering

| Problem | Why It Matters |
|---------|----------------|
| [E001 Two Sum](easy/E001_two_sum.md) | Complement search → nearest neighbor, similarity matching |
| [M565 Satisfiability of Equality Equations](medium/M565_satisfiability_of_equality_equations.md) | Grouping → clustering, community detection |

### Feature Engineering

| Problem | Why It Matters |
|---------|----------------|
| [M015 Maximum Subarray](medium/M015_maximum_subarray.md) | Window features → rolling aggregations |
| [H114 Subarrays with K Different Integers](hard/H114_subarrays_with_k_different_integers.md) | Counting patterns → cardinality estimation |

---

## Computer Graphics & Game Development

*For those building: game engines, rendering systems, simulations*

### Physics Simulation

| Problem | Why It Matters |
|---------|----------------|
| [H009 Trapping Rain Water](hard/H009_trapping_rain_water.md) | Water simulation → fluid dynamics approximation |
| [M015 Maximum Subarray](medium/M015_maximum_subarray.md) | Force accumulation → physics calculations |

### Pathfinding & Navigation

| Problem | Why It Matters |
|---------|----------------|
| [M512 Minimize Malware Spread](medium/M512_minimize_malware_spread.md) | Graph traversal → navigation meshes |
| [M088 Course Schedule](medium/M088_course_schedule.md) | Dependency graphs → quest/achievement systems |

### Collision Detection

| Problem | Why It Matters |
|---------|----------------|
| [E001 Two Sum](easy/E001_two_sum.md) | Spatial hashing → broad-phase collision |
| [H009 Trapping Rain Water](hard/H009_trapping_rain_water.md) | Boundary analysis → terrain collision |

---

## Networking & Security

*For those building: network protocols, security tools, firewalls*

### Packet Processing

| Problem | Why It Matters |
|---------|----------------|
| [M556 Time Based Key-Value Store](medium/M556_time_based_key_value_store.md) | Temporal lookup → packet timestamping, flow tracking |
| [M002 Longest Substring Without Repeating](medium/M002_longest_substring_without_repeating_characters.md) | Sliding window → packet window management |

### Network Analysis

| Problem | Why It Matters |
|---------|----------------|
| [M512 Minimize Malware Spread](medium/M512_minimize_malware_spread.md) | Infection propagation → vulnerability assessment |
| [M565 Satisfiability of Equality Equations](medium/M565_satisfiability_of_equality_equations.md) | Constraint validation → firewall rule checking |

### Cryptography Fundamentals

| Problem | Why It Matters |
|---------|----------------|
| [E001 Two Sum](easy/E001_two_sum.md) | Hash functions → cryptographic primitives |
| [H115 Number of Squareful Arrays](hard/H115_number_of_squareful_arrays.md) | Combinatorial enumeration → key generation |

---

## Finance & Trading

*For those building: trading systems, risk management, fintech*

### Real-Time Analysis

| Problem | Why It Matters |
|---------|----------------|
| [M015 Maximum Subarray](medium/M015_maximum_subarray.md) | Profit windows → best trading intervals |
| [H009 Trapping Rain Water](hard/H009_trapping_rain_water.md) | Valley detection → market dip analysis |

### Time Series Processing

| Problem | Why It Matters |
|---------|----------------|
| [M556 Time Based Key-Value Store](medium/M556_time_based_key_value_store.md) | Historical queries → audit trails, compliance |
| [H114 Subarrays with K Different Integers](hard/H114_subarrays_with_k_different_integers.md) | Pattern counting → diversity metrics |

### Matching Engines

| Problem | Why It Matters |
|---------|----------------|
| [E001 Two Sum](easy/E001_two_sum.md) | Complement matching → order book matching |
| [H023 Merge K Sorted Lists](hard/H023_merge_k_sorted_lists.md) | Priority merging → order queue processing |

---

## Healthcare & Bioinformatics

*For those building: genomics tools, clinical systems, health analytics*

### Sequence Alignment

| Problem | Why It Matters |
|---------|----------------|
| [M003 Longest Palindromic Substring](medium/M003_longest_palindromic_substring.md) | Sequence matching → DNA/RNA pattern finding |
| [M002 Longest Substring Without Repeating](medium/M002_longest_substring_without_repeating_characters.md) | Unique sequences → gene identification |

### Signal Processing

| Problem | Why It Matters |
|---------|----------------|
| [M015 Maximum Subarray](medium/M015_maximum_subarray.md) | Peak detection → EKG analysis, anomaly detection |
| [H009 Trapping Rain Water](hard/H009_trapping_rain_water.md) | Boundary analysis → medical imaging |

### Clinical Workflows

| Problem | Why It Matters |
|---------|----------------|
| [M088 Course Schedule](medium/M088_course_schedule.md) | Dependency ordering → treatment protocols |
| [H113 Binary Tree Cameras](hard/H113_binary_tree_cameras.md) | Coverage optimization → sensor placement |

---

## DevOps & Infrastructure

*For those building: CI/CD pipelines, monitoring systems, cloud tools*

### Build Systems & Dependencies

| Problem | Why It Matters |
|---------|----------------|
| [M088 Course Schedule](medium/M088_course_schedule.md) | Topological sort → build order, package resolution |
| [M565 Satisfiability of Equality Equations](medium/M565_satisfiability_of_equality_equations.md) | Constraint checking → version compatibility |

### Monitoring & Alerting

| Problem | Why It Matters |
|---------|----------------|
| [M015 Maximum Subarray](medium/M015_maximum_subarray.md) | Peak detection → alert thresholds |
| [H009 Trapping Rain Water](hard/H009_trapping_rain_water.md) | Capacity analysis → queue depth monitoring |
| [M556 Time Based Key-Value Store](medium/M556_time_based_key_value_store.md) | Historical metrics → time-series databases |

### Incident Response

| Problem | Why It Matters |
|---------|----------------|
| [M512 Minimize Malware Spread](medium/M512_minimize_malware_spread.md) | Blast radius analysis → incident containment |
| [H113 Binary Tree Cameras](hard/H113_binary_tree_cameras.md) | Minimum coverage → monitoring agent placement |

---

## Civil Engineering & Urban Planning

*For those working with: infrastructure design, resource management*

### Drainage & Water Systems

| Problem | Why It Matters |
|---------|----------------|
| [H009 Trapping Rain Water](hard/H009_trapping_rain_water.md) | Reservoir capacity → stormwater drainage design |

### Network Design

| Problem | Why It Matters |
|---------|----------------|
| [H113 Binary Tree Cameras](hard/H113_binary_tree_cameras.md) | Coverage optimization → surveillance placement |
| [M512 Minimize Malware Spread](medium/M512_minimize_malware_spread.md) | Connectivity analysis → utility network design |

---

## Cross-Domain Patterns

These patterns appear across multiple domains:

### Hash Tables (O(1) Lookup)
- **Database**: Index lookups, join hash tables
- **Web**: Cache hits, session stores
- **Finance**: Order matching, symbol lookup
- **Networking**: Flow tables, connection tracking

**Key Problems**: [E001 Two Sum](easy/E001_two_sum.md), [M556 Time Based Key-Value Store](medium/M556_time_based_key_value_store.md)

### Graph Connectivity (Union-Find)
- **Distributed Systems**: Cluster discovery, partition detection
- **Networking**: Network segmentation, routing
- **Security**: Vulnerability propagation
- **DevOps**: Service dependencies

**Key Problems**: [M565 Satisfiability of Equality Equations](medium/M565_satisfiability_of_equality_equations.md), [M512 Minimize Malware Spread](medium/M512_minimize_malware_spread.md)

### Sliding Window
- **Web**: Rate limiting, session windows
- **Finance**: Trading windows, rolling metrics
- **Networking**: Packet windows, flow control
- **ML**: Feature windows, streaming aggregations

**Key Problems**: [M002 Longest Substring Without Repeating](medium/M002_longest_substring_without_repeating_characters.md), [H114 Subarrays with K Different Integers](hard/H114_subarrays_with_k_different_integers.md)

### Greedy/DP Optimization
- **All domains**: Resource allocation, scheduling, capacity planning

**Key Problems**: [M015 Maximum Subarray](medium/M015_maximum_subarray.md), [H009 Trapping Rain Water](hard/H009_trapping_rain_water.md), [H113 Binary Tree Cameras](hard/H113_binary_tree_cameras.md)

---

## How to Use This Guide

### Interview Preparation
1. Identify your target company's domain (e.g., "database company")
2. Find the relevant section above
3. Prioritize problems mapped to that domain
4. Practice explaining the real-world connection

### Learning Path by Domain
1. **Database Engineer Track**: E001 → M008 → M556 → H023
2. **Backend Engineer Track**: E001 → M002 → M556 → M088
3. **ML Engineer Track**: E001 → M015 → M565 → H114
4. **Security Engineer Track**: E001 → M512 → M565 → H115

### When Stuck
If a problem feels abstract, find it in this index and read the real-world context. Understanding *why* an algorithm matters often makes the *how* clearer.

---

**Navigation**: [Main Index](README.md) | [Easy Problems](easy/README.md) | [Medium Problems](medium/README.md) | [Hard Problems](hard/README.md)
