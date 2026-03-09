# Insights — RTB System

## Insight 1: The 100ms Deadline Inverts Normal Distributed Systems Thinking

**Category:** System Modeling

**One-liner:** Unlike most distributed systems where you optimize for throughput and tolerate latency spikes, RTB enforces an absolute latency ceiling where exceeding it by even 1 millisecond means the entire request's revenue is zero—no retry, no queue, no second chance.

**Why it matters:**

In a typical microservices architecture, a slow request is a degraded request—the user waits a bit longer, but the request eventually completes. In RTB, a slow request is a dead request. The exchange discards any bid response that arrives after the 100ms timeout, and the DSP earns $0 for that impression. There is no retry mechanism, no dead letter queue, no exponential backoff. The impression is gone.

This hard deadline fundamentally changes how you architect every layer. Feature lookups that would normally go to a distributed store must be pre-cached in memory—not for performance optimization, but for correctness. ML inference that might take 50ms in a recommendation system must be distilled to 15ms models—not for cost savings, but because the business literally cannot function otherwise. The cascading fallback strategy (personalized → contextual → rule-based → no-bid) isn't a resilience pattern; it's the primary operational mode. On any given second, some percentage of bids are taking each fallback path, and the system's revenue is the weighted sum across these paths.

The p99 latency matters more than the average because a 1% timeout rate at 1M QPS means 10,000 lost impressions per second. At $5 CPM, that's $50/second or $4.3M/day in lost revenue. This makes tail latency elimination a direct revenue optimization—every millisecond shaved from p99 translates to measurable dollars.

---

## Insight 2: Budget Pacing Is a Control Theory Problem, Not a Database Problem

**Category:** System Modeling

**One-liner:** Distributing an advertising budget evenly across a day is mathematically equivalent to a feedback control problem—the same PID controller that governs thermostats and cruise control is the optimal solution for ad spend pacing.

**Why it matters:**

The naive approach to budget pacing is a database counter: check remaining budget, decide whether to bid. This fails in two ways. First, checking a central counter on every bid adds 10-20ms of latency—unacceptable in RTB. Second, a simple threshold ("stop when budget is 0") causes bursty spending patterns: the campaign spends aggressively in the morning when competition is low, exhausts its budget by 2 PM, and misses high-value evening traffic entirely.

The PID controller reframes the problem: the "process variable" is actual spend, the "setpoint" is the planned spend curve (typically linear: 1/24th of budget per hour), and the "control output" is a bid multiplier (0.0 to 2.0) that scales all bid prices. When the campaign is underspending (error > 0), the multiplier increases, bidding more aggressively. When overspending (error < 0), the multiplier decreases. The integral term corrects accumulated drift. The derivative term dampens oscillation.

The deeper insight is that the distributed nature of bidding (80 nodes bidding for one campaign) makes this a distributed control problem. Each node runs its own PID instance with a local budget lease, creating a multi-agent control system where the agents must collectively converge on the global spend target without explicit coordination. The lease mechanism is the key—it bounds the divergence between nodes by limiting how much each can spend independently before synchronizing.

---

## Insight 3: Bid Shading Transforms Auction Theory into an ML Problem

**Category:** Cost Optimization

**One-liner:** The industry's transition from second-price to first-price auctions created an entirely new ML problem—estimating what you *would have paid* in a second-price auction and bidding just above that, rather than bidding your true value.

**Why it matters:**

In a second-price auction, the dominant strategy is truthful bidding: bid your true value, and you'll pay the second-highest price. This is elegant because it requires no sophistication—bid honestly and the mechanism handles efficiency. When the industry shifted to first-price auctions (driven by header bidding transparency), this property vanished. Now, bidding your true value means overpaying on every impression you win.

Bid shading solves this by estimating the "market clearing price"—what the second-highest bid would be—and bidding just above it. This is fundamentally an ML problem: given features (publisher, format, geo, time-of-day, device), predict the win price distribution. The model trains on historical win/loss data where the DSP knows its own bid and the auction outcome. For wins, the DSP knows it bid above the clearing price. For losses, it knows it bid below. From these censored observations, the model estimates the full clearing price distribution.

The trade-off is between savings and win rate. Aggressive shading (bidding close to estimated clearing price) saves money but risks losing to slight estimation errors. Conservative shading (bidding close to true value) wins more but overpays. The optimal shading strategy depends on the campaign objective: awareness campaigns can shade aggressively (losing some impressions is fine), while retargeting campaigns targeting specific users should shade conservatively (each impression opportunity is rare and valuable).

---

## Insight 4: The Feature Store Is the True Bottleneck, Not the ML Model

**Category:** Caching

**One-liner:** In an RTB bidder, the ML model inference (5-15ms) gets all the attention, but the feature store lookup (5-10ms) is the harder problem because it involves a network hop to a distributed store holding 4 TB of user profiles that cannot fit in any single node's memory.

**Why it matters:**

ML model inference is embarrassingly parallelizable and increasingly optimized—model distillation, quantization, and in-process serving have made even complex models serviceable in 10-15ms. The feature store, by contrast, is a fundamentally distributed data access problem. Two billion user profiles at 2 KB each equals 4 TB—far too large for a single machine's memory. The data must be sharded across hundreds of nodes, meaning every lookup involves a network round-trip.

The tiered caching strategy (L1 in-process → L2 local SSD → L3 distributed store) is elegant because it exploits the power-law distribution of web traffic. A small fraction of users (heavy browsers, logged-in users) generate a disproportionate share of bid requests. The top 1 million users by request frequency fit in ~2 GB of RAM (L1) and cover ~30% of requests. The top 100 million users fit on local SSD (L2) and cover ~60% of requests. Only the long tail of infrequent users requires the full network round-trip to L3.

The architectural insight is that cache miss handling is more important than cache hit optimization. When L3 is slow or unavailable, the system must seamlessly degrade to contextual-only features—still bidding, but without personalization. This graceful degradation means the feature store's failure mode is reduced revenue quality, not a system outage. The bid still happens; it's just less optimized. This design principle—separate the data that enables optimization from the data that enables operation—is broadly applicable.

---

## Insight 5: Frequency Capping Reveals the Impossibility of Strong Consistency in Time-Critical Systems

**Category:** Consistency

**One-liner:** Frequency capping (limiting ad exposure per user) requires counting impressions across geographically distributed bidder nodes in real-time, which makes it a perfect case study for why eventual consistency with bounded error is the only viable approach when latency constraints are absolute.

**Why it matters:**

The requirement seems simple: "Show this user the ad at most 3 times per day." The implementation is anything but. When a user in New York loads a page, a bidder node in US-East checks the frequency count and decides to bid. Simultaneously, the same user's request (or a different user who shares a household) triggers a bidder node in US-West. Both nodes see count=2, both decide the user is eligible, both win auctions, and the user sees the ad 4 times instead of the capped 3.

The "correct" solution—a distributed lock or strongly consistent counter—would require a cross-region synchronous call adding 50-100ms of latency. This is physically impossible within the 100ms bid deadline. Even within a single region, a strongly consistent counter (like a linearizable read-modify-write) adds 2-5ms per check and creates a serialization bottleneck at the counter for popular users.

The practical solution accepts approximate counting: each node maintains local counters with periodic cross-node reconciliation every 60 seconds. The maximum over-delivery is bounded: at most one extra impression per node per reconciliation period. For a cap of 3 with 4 active regions, the worst case is 7 impressions instead of 3—unpleasant but not catastrophic. The system can tighten this by reserving the last cap slot (only bid if count ≤ 1 instead of count ≤ 2), reducing the error bound at the cost of slightly earlier cap-out.

---

## Insight 6: The Multi-Party Trust Problem Requires Supply Chain Cryptography

**Category:** Security

**One-liner:** Unlike most systems where you control both endpoints, RTB operates across organizational trust boundaries (SSPs, exchanges, DSPs, publishers) where any party could misrepresent data, making supply chain verification (ads.txt, sellers.json, SupplyChain object) a cryptographic trust problem embedded in every bid request.

**Why it matters:**

In most system design problems, you implicitly trust your own services. A payment service trusts its own order service. In RTB, the bid request claiming to be from "premium-news.com" might actually be from a fraud network spoofing that domain to attract premium CPMs. The SSP claiming to have 1 million impressions might be inflating counts by 20%. The exchange reporting a win at $5 CPM might have actually cleared at $3 CPM and pocketed the difference.

The industry solved this with a layered verification system. ads.txt lets publishers declare which SSPs are authorized to sell their inventory—the DSP can verify this by fetching the publisher's ads.txt file. sellers.json lets exchanges declare which sellers operate on their platform—the DSP can verify seller identity. The SupplyChain object in each bid request creates an auditable chain of custody from publisher to the final exchange, similar to a blockchain of ownership.

The architectural implication is that every bidder node must maintain a cache of ads.txt files for hundreds of thousands of publisher domains, sellers.json files for every exchange, and the logic to validate SupplyChain objects in real-time during the <5ms pre-bid phase. This verification cache must be refreshed daily (ads.txt files change) and cross-referenced on every bid. The cost of not doing this: industry estimates suggest 20-30% of programmatic spend is wasted on fraudulent or misrepresented inventory.

---

## Insight 7: Impression Tracking Creates an Unavoidable Revenue Reconciliation Problem

**Category:** Consistency

**One-liner:** Because SSPs and DSPs independently count impressions using different tracking mechanisms (server-side auction wins vs client-side pixel fires), every RTB system must solve a permanent ~5-15% discrepancy that represents real money and cannot be eliminated—only managed.

**Why it matters:**

The SSP counts an impression when it returns ad markup to the publisher page (server-side event). The DSP counts an impression when its tracking pixel fires from the user's browser (client-side event). These are fundamentally different measurement points with different failure modes. The pixel might not fire if: the user navigates away before the ad loads, the ad is below the fold and never rendered, an ad blocker intercepts the pixel, or a network error drops the request.

This isn't a bug—it's an inherent property of client-side measurement. The gap between "ad markup delivered" and "ad actually rendered and pixel fired" is structural. Desktop ad blocker penetration of 25-30% alone accounts for a large chunk of the discrepancy on some publishers. Add rendering failures, navigation timing, and network drops, and the 5-15% gap is explained.

The reconciliation system must handle this permanently. Both parties agree on which count to use for billing (typically the DSP's pixel-based count, since it's closer to "the ad was actually seen"). Monthly reconciliation reports compare counts, identify anomalous discrepancies (>15% suggests a tracking integration issue rather than normal variance), and trigger investigations. The discrepancy rate per publisher becomes a quality signal—consistently high discrepancy publishers might have broken integrations, aggressive ad blocking audiences, or worse, fraudulent traffic where "impressions" never actually render.

---

## Insight 8: Edge Deployment Transforms a Latency Problem into a Data Replication Problem

**Category:** Scaling

**One-liner:** Deploying bidder nodes close to exchange data centers eliminates network latency but creates a distributed data synchronization challenge where user profiles, campaign states, and budget leases must be replicated across continents with bounded staleness.

**Why it matters:**

Network round-trip time between US-East and EU-West is ~80ms. With a 100ms auction deadline, a centralized DSP in US-East simply cannot bid on EU inventory—the network alone consumes 80% of the budget. Edge deployment (bidder nodes in EU-West) reduces this to <5ms, recovering 75ms for actual computation.

But edge deployment shifts the problem from networking to data. The feature store holding 4 TB of user profiles cannot be fully replicated to every region (cost prohibitive). Instead, each region holds a shard of users typically seen in that geo, with a read-through cache for cross-region users. This means a European user visiting a US publisher's site might not have their profile available in the US-East feature store—requiring contextual-only bidding for that impression.

Campaign metadata (5 GB) can be fully replicated, but budget state cannot—budget leasing must still coordinate with a central budget service. The cross-region RPC for lease renewal adds 80-100ms, which is why leases are issued for 60-second periods rather than per-bid. ML models (20 GB) are synced on deployment, meaning a model update reaches all regions within minutes, not seconds.

The fundamental insight is that edge deployment is a spectrum. Each data type has a different replication strategy based on its size, staleness tolerance, and criticality. Campaign metadata (small, moderate staleness OK) is fully replicated. User profiles (huge, moderate staleness OK) are sharded by geo affinity. Budget state (small, low staleness tolerance) uses a lease protocol. Fraud blocklists (moderate size, low staleness tolerance) are pushed on a 5-minute cycle. The architect's job is to classify each data type and choose the right replication strategy.

---

## Insight 9: Load Shedding in RTB Is Revenue Optimization, Not Damage Control

**Category:** Traffic Shaping

**One-liner:** When an RTB bidder is overloaded, intelligently choosing which bid requests to drop (low-floor, unknown publishers) while preserving high-value requests (premium deals, high-floor publishers) actually increases revenue compared to processing everything slowly and timing out randomly.

**Why it matters:**

In most systems, load shedding is a last resort—you're accepting data loss or degraded service to prevent total failure. In RTB, load shedding is an optimization opportunity because not all bid requests are equal. A request from a premium news publisher with a $10 floor price is worth 100x more than a request from an unknown app with a $0.10 floor. If the bidder can only handle 80% of incoming traffic, it should drop the bottom 20% by expected value, not randomly.

The priority scoring function (floor price + deal type + publisher quality + format) transforms load shedding from a binary "process or drop" into a continuous prioritization. Under moderate load (80-90% capacity), the system sheds only its lowest-value optimization steps (bid shading refinement, creative optimization) while preserving the core bid pipeline. Under heavy load (90-95%), it sheds feature lookups and falls back to contextual bidding—faster processing means more requests served. Under extreme load (>95%), it drops requests below a value threshold.

The counter-intuitive result: a bidder processing 800K QPS with intelligent shedding can generate more revenue than the same bidder processing 1M QPS with random timeouts, because the former ensures every processed request is high-value while the latter wastes computation on low-value requests that happen to arrive first.

---

## Insight 10: The Cookieless Transition Is Forcing an Architectural Shift from Lookup to Computation

**Category:** Architecture

**One-liner:** The deprecation of third-party cookies and rise of privacy APIs (Topics, Protected Audience) is fundamentally shifting RTB architecture from "look up user data and bid on it" to "receive privacy-preserving signals and compute bids without individual identity"—an architectural paradigm shift, not just a feature change.

**Why it matters:**

The traditional RTB architecture is built around user identity: receive bid request with user cookie → look up user profile in feature store → predict engagement using user-level ML model → bid accordingly. Remove the cookie, and this entire pipeline—the feature store, the user-level models, the frequency capping counters—becomes obsolete for a growing fraction of traffic.

The replacement architecture is fundamentally different. Topics API provides coarse-grained interest categories (5 topics per user, rotated weekly) directly in the bid request—no lookup needed. Protected Audience API moves the entire auction to the browser for remarketing use cases—the DSP submits bidding logic, not bid responses. Contextual targeting analyzes page content rather than user identity. First-party data arrives via publisher-provided signals, requiring integration with data clean rooms rather than cookie-sync pipelines.

Architecturally, this means the DSP must support two parallel bidding pipelines: the legacy identity-based pipeline (for traffic with valid consent and cookies) and the privacy-preserving pipeline (for cookieless traffic). Over time, the second pipeline grows and the first shrinks. The ML models shift from user-level prediction (predict CTR for this specific user) to cohort-level and contextual prediction (predict CTR for users interested in "sports" visiting a "news" page on a "mobile" device). The feature store shrinks; the contextual enrichment service grows. The frequency capping system shifts from user-level counters to cohort-level probabilistic estimates.

---

## Insight 11: First-Price Auctions Created a New Information Asymmetry That Drives System Complexity

**Category:** System Modeling

**One-liner:** In second-price auctions, the clearing price is transparent (it's the second-highest bid). In first-price auctions, the clearing price is hidden—creating an information asymmetry that spawned entirely new subsystems (win price models, bid landscape analysis, loss reason feedback) to recover the information that the auction mechanism removed.

**Why it matters:**

Second-price auctions had a beautiful property: the winner knew the clearing price because they paid it (second-highest bid + $0.01). This information was free—it arrived with every win notice. DSPs could easily track market prices per publisher, per format, per geo, and use this data directly in bidding strategy.

First-price auctions removed this transparency. The winner pays their own bid, not the clearing price. The DSP knows it won, but doesn't know by how much it overpaid. Was the second-highest bid $4.99 (close call) or $1.00 (massive overpayment)? Without this signal, the DSP can't optimize.

The industry response was multi-faceted and created significant system complexity. Loss notices (lurl) were standardized so losing DSPs learn why they lost (outbid, below floor, invalid creative). Win price estimation models were built to predict clearing prices from historical data. Bid landscape analysis systems aggregate win/loss data across millions of auctions to build price distribution curves per market segment. These are all entirely new subsystems that didn't exist in the second-price era.

The architectural takeaway: changes in auction mechanism—seemingly a protocol-level detail—cascaded into multiple new ML models, data pipelines, and feedback loops. Protocol design decisions have architectural implications far beyond their immediate scope.

---

## Insight 12: The RTB Event Stream Is Simultaneously a Billing Ledger, ML Training Set, and Operational Log

**Category:** Streaming

**One-liner:** The impression event stream serves three fundamentally different consumers—real-time billing (needs exactly-once, low-latency), ML model training (needs complete historical data, batch-friendly), and operational monitoring (needs real-time sampling, lossy is OK)—requiring a single stream with multiple consumer groups at different quality-of-service levels.

**Why it matters:**

Most event streaming architectures serve one primary use case. An e-commerce order stream primarily feeds order processing. A clickstream primarily feeds analytics. The RTB impression stream is unusual because it simultaneously serves three consumers with contradictory requirements.

The billing consumer needs exactly-once processing—a double-counted impression means the advertiser is charged twice, and a missed impression means lost revenue. This consumer uses offset-based checkpointing with deduplication and operates at full fidelity. The ML training consumer needs every event (no sampling) with complete feature snapshots for offline model training. It can tolerate hours of lag but cannot tolerate gaps—a missing event biases the training data. The operations consumer needs real-time visibility (seconds of lag) but can tolerate sampling (10% is sufficient for dashboards) and occasional losses.

Serving all three from a single stream requires priority partitioning. Billing events are published to high-retention, replicated partitions with strict ordering. Training events are written to a separate high-throughput topic optimized for batch consumption. Operations events are sampled and aggregated in-stream before delivery to dashboards. The stream processing framework must support independent consumer groups with different processing guarantees, lag tolerances, and scaling characteristics.

The deeper insight is that the event stream is the source of truth for the entire RTB platform. Billing, reporting, ML training, fraud detection, budget reconciliation, and discrepancy analysis all derive from the same stream. Getting the stream right—durability, ordering, partitioning, retention—is the single highest-leverage infrastructure investment in an RTB system.
