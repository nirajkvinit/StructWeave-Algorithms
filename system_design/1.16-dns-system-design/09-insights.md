# Key Insights: DNS System Design

[← Back to Index](./00-index.md)

---

## Insight 1: Tiered Caching Eliminates Lock Contention at Scale
**Category:** Caching
**One-liner:** A three-tier cache (per-thread L1, shared L2, regional L3) transforms DNS resolver throughput by trading memory duplication for lock elimination.
**Why it matters:** At 1M+ QPS, a single shared cache with locks becomes the bottleneck -- not the network, not disk. Per-thread L1 caches (100K entries, ~10MB) serve hot entries without any locking, while a lock-free hash map at L2 (10M entries) handles the shared tier. This design insight applies broadly: whenever you have an extremely read-heavy workload (99.99:1 ratio), duplicating hot data across threads is cheaper than synchronizing access. The memory overhead is negligible compared to the throughput gain.

---

## Insight 2: Negative Caching Is a Security Mechanism, Not Just an Optimization
**Category:** Traffic Shaping
**One-liner:** Caching NXDOMAIN responses with capped TTLs prevents random-subdomain DDoS attacks from overwhelming authoritative servers.
**Why it matters:** Attackers exploit the asymmetry between cheap query generation and expensive authoritative lookups by querying millions of non-existent subdomains. Without negative caching, every random query (e.g., `xyz123.example.com`) triggers a full resolution chain. By caching NXDOMAIN responses -- bounded between a 30-second floor and 1-hour ceiling regardless of the SOA minimum -- the resolver absorbs the attack locally. This dual-purpose pattern (performance optimization that doubles as attack mitigation) is a recurring theme in infrastructure design.

---

## Insight 3: Anycast BGP Withdrawal Requires Graceful Traffic Draining
**Category:** Resilience
**One-liner:** Abruptly withdrawing a BGP route causes packet loss during reconvergence; prepending the AS path first shifts traffic gradually before full withdrawal.
**Why it matters:** The naive approach to failing over an Anycast PoP is to withdraw the BGP announcement immediately. But BGP reconvergence takes 10-90 seconds, during which in-flight queries are lost. The two-step withdrawal -- first prepending the AS path (making the route less preferred, causing gradual traffic shift over ~30 seconds), then fully withdrawing -- mirrors the drain-then-remove pattern seen in load balancers. Combined with BFD (Bidirectional Forwarding Detection) for sub-second failure detection, this reduces failover impact from minutes to single-digit seconds.

---

## Insight 4: Request Coalescing Prevents Thundering Herd on Cache Miss
**Category:** Contention
**One-liner:** When multiple concurrent queries miss the cache for the same domain, only one upstream resolution should execute while others await the shared future.
**Why it matters:** Without coalescing, a cache miss for a popular domain under high concurrency triggers N identical upstream resolutions -- wasting bandwidth, overloading authoritative servers, and multiplying latency. The request coalescer maps in-flight queries to shared futures: the first thread resolves upstream while subsequent threads for the same (qname, qtype) key simply await the result. This pattern is the DNS-specific instantiation of the "singleflight" concept, and its absence is a common cause of cascading failures when cache entries expire for high-traffic domains.

---

## Insight 5: Copy-on-Write Zone Updates Guarantee Query Consistency Without Read Locks
**Category:** Consistency
**One-liner:** Zone updates create an entirely new immutable zone object and swap it atomically, so concurrent queries always see a consistent snapshot.
**Why it matters:** DNS zones can contain millions of records, and updates (via AXFR/IXFR) must not produce partial views where a query sees some old and some new records. Rather than using read-write locks (which would serialize queries during updates), the copy-on-write approach creates a new zone object with changes applied and performs an atomic reference swap. Queries in progress continue reading the old snapshot. This is the same principle behind persistent data structures and MVCC -- it trades memory for lock-free consistency.

---

## Insight 6: EDNS Client Subnet Scope Controls Cache Sharing Granularity
**Category:** Edge Computing
**One-liner:** The ECS scope prefix in DNS responses determines how broadly a geo-specific answer can be cached, creating a direct trade-off between cache hit rate and routing accuracy.
**Why it matters:** Without ECS, a recursive resolver in one city caches a response that may route all its clients to a distant datacenter. With ECS, authoritative servers see client subnet information and return geographically optimal answers. But the scope prefix is the subtle lever: a /24 scope means the answer is only valid for that /24 subnet (high accuracy, low cache sharing), while a /16 scope allows broader sharing (lower accuracy, higher cache hit rate). Getting this granularity wrong either wastes cache capacity or misroutes traffic, making it one of the most impactful tuning knobs in GSLB.

---

## Insight 7: Kernel Bypass (DPDK/XDP) Provides 20x Throughput for UDP-Heavy Workloads
**Category:** Scaling
**One-liner:** Standard UDP socket processing caps at ~100K QPS per server due to kernel softirq overhead; DPDK/XDP bypasses the kernel entirely for ~2M QPS.
**Why it matters:** DNS is unusual among modern services because it relies heavily on UDP, where the kernel's per-packet interrupt processing becomes the bottleneck rather than application logic. The progression from standard sockets (~100K QPS) to SO_REUSEPORT with 8 workers (~500K QPS) to DPDK/XDP (~2M QPS) represents fundamentally different architectural tiers. SO_REUSEPORT is a low-effort win (multiple sockets on the same port, kernel-level distribution), while DPDK/XDP requires rearchitecting the network stack but provides an order-of-magnitude leap. This insight generalizes: for any protocol where per-packet overhead dominates, moving processing closer to the NIC yields outsized gains.

---

## Insight 8: Trie-Based Zone Lookup with Reversed Labels Enables Efficient Wildcard Matching
**Category:** Data Structures
**One-liner:** Storing DNS names in a trie with reversed label order (e.g., `com.example.www`) turns suffix matching (wildcard `*.example.com`) into efficient prefix traversal.
**Why it matters:** DNS wildcard records like `*.example.com` require suffix matching against queried names, which is inherently expensive with hash-based lookups. By reversing the label order before inserting into a trie, wildcard matching becomes prefix matching -- a natural strength of trie data structures. For zones with millions of records, this transforms O(n) scanning into O(k) traversal where k is the label depth. The same reversed-key trick appears in other systems (e.g., HBase row key design for time-series data), making it a broadly applicable pattern for turning suffix problems into prefix problems.

---

## Insight 9: Zone Transfer Storms Require Staggered NOTIFY and Dedicated Transfer Infrastructure
**Category:** Resilience
**One-liner:** When a zone with 1000 secondaries is updated, simultaneous AXFR requests can generate 10GB of transfer traffic in seconds, overwhelming the primary.
**Why it matters:** The DNS zone transfer protocol was designed for small deployments. At scale, a single zone update triggers NOTIFY to all secondaries, which all request full zone transfers (AXFR) simultaneously. The mitigation stack is multi-layered: use IXFR (incremental transfers) to reduce transfer size by 99%+, stagger NOTIFY delivery to spread load temporally, deploy dedicated transfer servers separate from query infrastructure, and rate-limit concurrent transfers per zone. This is a general pattern in distributed systems: any broadcast-then-pull mechanism becomes a thundering herd at scale and requires deliberate traffic shaping.

---

## Insight 10: TTL Underflow Protection Prevents Zero-TTL Responses from Breaking Client Caching
**Category:** Consistency
**One-liner:** When a cached DNS record's TTL reaches zero, returning a minimum TTL of 1 second instead of 0 gives clients a brief usable window rather than an immediately-stale response.
**Why it matters:** The naive implementation of TTL countdown can produce responses with TTL=0, which many client resolvers interpret as "do not cache at all," triggering immediate re-resolution on every request. This creates a feedback loop: as records approach expiration, they generate exponentially more upstream queries. The 1-second floor is a small but critical guardrail. Combined with cache prefetching (proactively refreshing popular entries at 10% remaining TTL), this ensures that popular domains never experience a moment of uncached resolution -- a property that is invisible when working but catastrophic when absent.
