# Key Architectural Insights

## 1. GDS as External Authoritative System: Circuit Breaker Pattern

**Category:** Resilience
**One-liner:** When your inventory truth lives in an external system you cannot control, circuit breakers become the most critical architectural pattern.

**Why it matters:**
Unlike most systems where the platform owns its data, flight booking depends on GDS systems (Amadeus, Sabre, Travelport) that are external, charge per API call, and have unpredictable latency (500ms-2s). This external dependency shapes every architectural decision: caching strategy, failover design, and reliability model. The circuit breaker pattern isolates failures per GDS provider, enabling graceful degradation (serve results from healthy providers + cache) rather than cascading failure. Any system integrating with external authoritative data sources—payment gateways, government APIs, third-party inventory—faces this same pattern: you must design for the reality that your most important data source can be slow, expensive, or unavailable at any moment.

---

## 2. Two-Phase Seat Hold with TTL Expiry

**Category:** Contention
**One-liner:** Lease-based concurrency control with external authority eliminates distributed locking while preventing inventory deadlocks.

**Why it matters:**
The aviation industry solved the concurrent booking problem decades ago with a two-phase pattern: hold (create PNR, block seat, start 15-minute TTL) then ticket (charge payment, issue e-ticket). The TTL ensures that held-but-unpaid seats automatically return to inventory, preventing permanent inventory lockup from abandoned carts. This is fundamentally a **lease-based concurrency control** mechanism—the GDS grants a time-limited lease on a seat, and the OTA must complete the transaction within that lease. This pattern applies broadly: any system with scarce inventory (event tickets, limited-quantity product drops, appointment slots) can use TTL-based holds to balance reservation guarantees with inventory utilization. The key insight is that the authoritative system (GDS) manages the lease, not the consumer (OTA).

---

## 3. Aggressive Search Result Caching with Stale Re-Verification

**Category:** Caching
**One-liner:** Cache aggressively for search (3-min TTL, 80% hit rate) but always re-verify before committing to a transaction.

**Why it matters:**
The economics of flight search make caching mandatory: at $0.50-2.00 per GDS API call and 100M daily searches, uncached search would cost hundreds of millions per day. But flight fares change every few minutes, creating a tension between cache freshness and cost. The resolution is a two-layer strategy: (1) cache search results aggressively (3-min TTL) to serve the 99% of users who are just browsing, and (2) re-verify the specific fare with the GDS when a user commits to booking. If the price changed, show a "price changed" modal. This pattern—"cache broadly, verify narrowly"—applies to any system where data freshness matters for transactions but not for browsing: financial quotes, hotel rates, product availability displays.

---

## 4. Saga Pattern for Multi-Step Booking with Compensating Transactions

**Category:** Resilience
**One-liner:** When a transaction spans multiple external systems that cannot participate in a single ACID transaction, saga orchestration with compensating actions is the only viable pattern.

**Why it matters:**
A flight booking crosses at least four systems: GDS (seat hold), local database (booking record), payment gateway (charge), and GDS again (ticket issuance). No distributed transaction coordinator can span all of these. The saga pattern decomposes the booking into steps, each with a defined compensating action: if payment fails after hold, cancel the GDS PNR; if ticketing fails after payment, retry before refunding. The most dangerous failure—payment captured but ticket not issued—requires an outbox pattern to ensure ticketing always completes. This saga architecture is the standard approach for any multi-system transaction: e-commerce order fulfillment, financial transfers, multi-party approval workflows. The insight is that compensating transactions are not just "rollback"—they are domain-specific actions that undo the business effect of a prior step.

---

## 5. Fare Rules as a Domain-Specific Rule Engine

**Category:** Data Modeling
**One-liner:** Aviation fare rules (31 categories, thousands of combinations) require a dedicated rule engine—not generic pricing logic.

**Why it matters:**
Fare rules are among the most complex pricing structures in any industry. A single fare can have advance purchase requirements (book 14 days ahead), minimum stay rules (must include Saturday night), change fees ($200), cancellation penalties, blackout dates, combinability constraints, and eligibility restrictions—all evaluated at different points in the booking lifecycle (search display, hold validation, change/refund calculation). This complexity demands a dedicated rule engine that can evaluate structured rule sets against booking context, not ad-hoc conditionals scattered across services. The broader lesson: when domain rules are complex enough to have their own specification language (ATPCO's 31 categories), they deserve first-class architectural treatment as a rule engine, not buried logic.

---

## 6. Fan-Out Search Aggregation with Timeout Isolation

**Category:** Scaling
**One-liner:** Parallel fan-out to multiple providers with per-provider timeouts prevents slow sources from penalizing the entire search.

**Why it matters:**
A single flight search fans out to 5+ providers (Amadeus, Sabre, Travelport, airline NDC, LCC portals), each with different latency profiles (500ms-2s). Without timeout isolation, the slowest provider determines the overall response time. The solution: launch all provider calls in parallel, each with an independent timeout (2-3s), and aggregate whatever results return before the deadline. If a provider is consistently slow, the circuit breaker opens and that provider is skipped entirely. This fan-out pattern with timeout isolation is essential for any aggregation system: meta-search engines, price comparison sites, API gateways that call multiple microservices. The key design decision is the timeout budget: too short misses valid results, too long degrades user experience.

---

## 7. NDC vs. GDS: Direct vs. Intermediary Trade-off

**Category:** Integration
**One-liner:** The aviation industry is mid-transition from centralized intermediaries (GDS) to direct airline connections (NDC), and production systems must support both.

**Why it matters:**
GDS systems have dominated flight distribution for 40 years, providing a single integration point for 400+ airlines. NDC (New Distribution Capability) is IATA's XML-based standard that lets airlines distribute offers directly, offering richer content, dynamic pricing, and lower distribution costs. But NDC adoption is uneven: only 70+ airlines are NDC-certified, each with different implementation quality. Production architecture must be hybrid: GDS for breadth and reliability, NDC for rich content and better pricing from major carriers. This trade-off—centralized intermediary vs. direct integration—appears across many domains: payment processors vs. direct bank integration, cloud APIs vs. vendor-specific SDKs, aggregated data feeds vs. direct source connections. The lesson is that disintermediation is never all-or-nothing; transitional architectures that support both channels are typically necessary for years.

---

## 8. Inventory Race Condition: Optimistic Display + Authoritative Resolution

**Category:** Contention
**One-liner:** Show optimistic availability from cache for search (speed), but let the authoritative system (GDS) resolve conflicts at booking time (correctness).

**Why it matters:**
When two users see "3 seats available" from a cached search result and both click "Book," the system faces a classic race condition. The resolution is architectural separation of concerns: the search path optimizes for speed using cached data (eventual consistency is acceptable for display), while the booking path optimizes for correctness by deferring to the GDS (strong consistency for transactions). The OTA never tries to be the arbiter of seat availability—it delegates that to the GDS, which processes hold requests serially. This pattern—"optimistic reads, authoritative writes"—applies broadly: showing estimated stock counts on e-commerce product pages while verifying at checkout, displaying approximate appointment availability while confirming at booking time.

---

## 9. PNR as Universal Aviation Record

**Category:** Data Modeling
**One-liner:** The PNR is not a local database row—it is a distributed, synchronized record shared across GDS, airlines, and travel agents.

**Why it matters:**
A PNR (Passenger Name Record) exists simultaneously in the GDS, operating airline's CRS, codeshare partner's CRS, and the OTA's database—each potentially with different record locators for the same booking. Changes must propagate across all systems via EDIFACT messages. This is a real-world example of distributed data ownership with eventual consistency and a coordination hub (the GDS). The mandatory PRINT fields (Phone, Received-from, Itinerary, Name, Ticketing) ensure data consistency across systems. Understanding PNR architecture reveals how an industry standardized distributed record management long before modern distributed systems theory—and the trade-offs (eventual consistency, message-based sync, multiple identifiers for the same entity) remain relevant for any cross-organization data sharing pattern.

---

## 10. Revenue Management: Load Factor + Time-to-Departure Pricing

**Category:** Pricing
**One-liner:** Dynamic pricing in aviation uses two primary signals—remaining capacity (load factor) and time-to-departure—to maximize revenue per flight.

**Why it matters:**
Airline seats are the ultimate perishable inventory: an unsold seat on a departed flight has zero value. Revenue management systems dynamically adjust pricing using load factor (seats sold / total seats—prices increase exponentially as the flight fills) and time-to-departure (prices generally increase as departure approaches, with early-bird discounts). Additional signals include competitor pricing, day-of-week patterns, and event-driven demand. Traditional systems manage this by adjusting fare class availability (opening/closing booking classes) rather than changing prices directly. Modern NDC-enabled systems can offer continuous pricing without discrete fare classes. This revenue management pattern applies to any capacity-constrained, time-sensitive resource: hotel rooms, event tickets, cloud compute spot pricing, ride-hailing surge pricing.

---

## 11. APIS Compliance: Pre-Departure Passenger Data Reporting

**Category:** Compliance
**One-liner:** Government-mandated pre-departure passenger data transmission (APIS) adds hard requirements to data collection, validation, and system integration timelines.

**Why it matters:**
Airlines must transmit passenger passport data to destination country authorities before departure—72 hours in advance for US-bound flights (Secure Flight), at check-in for most other countries. This creates non-negotiable requirements: (1) mandatory data collection fields at booking time (full name as on passport, DOB, gender, passport number, nationality), (2) data validation against ICAO Machine Readable Travel Document (MRTD) format, (3) integration with the airline's Departure Control System (DCS) for transmission. Failure to comply means passengers cannot board. This illustrates how regulatory compliance creates hard architectural constraints that cannot be deferred or approximated. Any system operating across jurisdictions (financial services, healthcare, cross-border logistics) faces similar mandatory data collection and reporting requirements that must be designed in from the start.

---

## 12. Cache Stampede Prevention for Popular Routes

**Category:** Caching
**One-liner:** When cache expires for a popular route, lock-based refresh prevents hundreds of redundant GDS calls and cost explosions.

**Why it matters:**
When the cache entry for JFK→LHR expires, 500 concurrent searches all miss cache simultaneously, triggering 500 × 5 = 2,500 GDS API calls for identical data. At $0.75 per call, that is $1,875 wasted in seconds. Cache stampede prevention uses a lock-based refresh pattern: one request acquires a refresh lock and performs the GDS fan-out, while other requests either wait briefly for the fresh result or serve slightly stale data. Combined with jittered TTLs (3 min ± 30s random offset) and proactive cache warming for popular routes, this reduces stampede GDS calls by 99%. This pattern is critical for any system where cache misses trigger expensive backend operations: CDN origin fetches, database query caches, API gateway response caches.

---

## 13. Interline Agreement Graph for Connection Validation

**Category:** Data Modeling
**One-liner:** Connecting flight validation requires a graph of airline partnership agreements, not just schedule data.

**Why it matters:**
A valid connecting itinerary requires more than just matching airport codes and departure times. It requires: (1) minimum connection time validation per airport terminal pair, (2) interline agreement verification (can airline A's ticket include airline B's segment?), (3) fare combinability check (can two different fare types be combined in one itinerary?). Airlines form partnerships through alliances (Star Alliance, oneworld, SkyTeam) and bilateral interline agreements. This partnership graph must be pre-computed and maintained: a flight connection that is technically possible (same airport, sufficient time) may not be bookable if the airlines have no interline agreement. This graph-based validation pattern applies to any multi-vendor service composition: insurance product bundling, telecoms roaming agreements, supply chain partner validation.

---

## Cross-Cutting Themes

| Theme | Insights | Key Takeaway |
|-------|----------|-------------|
| **External system dependency** | #1, #2, #6, #7, #8 | When you don't own your critical data, every pattern must account for latency, cost, and unavailability of external sources |
| **Economic-driven architecture** | #3, #6, #12 | GDS cost-per-call makes caching an economic decision, not just a performance one; architecture follows the money |
| **Domain complexity** | #5, #9, #10, #13 | Aviation has 40+ years of accumulated domain complexity (fare rules, PNR standards, interline agreements) that cannot be simplified—it must be modeled faithfully |
| **Optimistic-then-verify** | #3, #8 | Show fast approximations for browsing; verify at commitment time; never let cached data drive irreversible actions |
| **Regulatory constraints** | #11 | Compliance requirements create hard architectural constraints that trump performance and cost optimization |
