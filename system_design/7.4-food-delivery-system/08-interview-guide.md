# Interview Guide

## 1. 45-Minute Pacing

| Time | Phase | Focus | Key Deliverables |
|------|-------|-------|-----------------|
| **0-5 min** | Clarify & Scope | Ask questions, define scope, identify which of the three actors to focus on | Agreed scope (recommend: all 3 actors + dispatch deep dive) |
| **5-15 min** | High-Level Architecture | Three-sided marketplace, core services, data stores, event flow | Architecture diagram with 8-10 services, data stores, client types |
| **15-28 min** | Deep Dive: Dispatch + Driver Matching | Geo-indexing, scoring algorithm, batching, acceptance flow, ETA coordination | Dispatch flow diagram, scoring pseudocode, race condition handling |
| **28-38 min** | Deep Dive: Real-Time Tracking + ETA | Location pipeline, WebSocket tracking, multi-stage ETA, ML correction loop | Location pipeline diagram, ETA formula, continuous improvement loop |
| **38-43 min** | Scale, Surge, & Failure Scenarios | Geo-sharding, surge pricing, circuit breakers, graceful degradation | Scale numbers, surge algorithm, failure handling table |
| **43-45 min** | Trade-offs & Summary | Key decisions and their rationale | Trade-off matrix |

---

## 2. Clarifying Questions to Ask

Before diving in, ask 2-3 of these to show you think before designing:

| Question | Why It Matters | Default Assumption |
|----------|---------------|-------------------|
| "Are we designing all three actors (customer, restaurant, driver) or focusing on a subset?" | Scopes the problem; some interviewers want only the customer+dispatch side | Design all three; deep dive on dispatch |
| "What scale are we targeting---single city or global?" | Affects sharding, multi-region, and data sovereignty decisions | Global: 5M orders/day, 1M drivers, 800K restaurants |
| "Is scheduled ordering in scope, or only on-demand?" | Scheduled orders change the dispatch timing significantly | On-demand primary; mention scheduled as extension |
| "How important is order batching (one driver, multiple orders)?" | Batching is architecturally complex; good to confirm it's in scope | In scope; discuss trade-offs |
| "Do we need to handle grocery/retail delivery, or just restaurant food?" | Grocery has different prep times and item picking workflows | Restaurant food only; mention extensibility |

---

## 3. What Makes Food Delivery Uniquely Hard

Use these points to demonstrate deep understanding:

### 3.1 Three-Sided Marketplace

Unlike ride-hailing (two-sided: rider + driver) or e-commerce (two-sided: buyer + seller with async fulfillment), food delivery coordinates **three independent actors in real-time**:

- **Customer** wants: accurate ETA, real-time visibility, hot food
- **Restaurant** wants: orders spaced to not overwhelm kitchen, driver arriving when food is ready
- **Driver** wants: short wait at restaurant, short drive, fair pay

The system must simultaneously satisfy all three, and optimizing for one often hurts another (e.g., dispatching a driver early reduces customer wait but increases driver idle time at the restaurant).

### 3.2 Sub-30-Second Assignment Under Contention

At peak, 580+ orders/sec all compete for the same pool of drivers. The dispatch system must:
- Query a geo index for nearby drivers (< 10ms)
- Score 10-20 candidates with ML predictions (< 50ms)
- Acquire an atomic lock on the best driver (< 5ms)
- Handle the case where the driver was already claimed by a concurrent dispatch

This is a high-throughput, low-latency optimization problem with race conditions.

### 3.3 Multi-Stage ETA with Compounding Uncertainty

Total delivery ETA = max(prep_time, driver_to_restaurant) + restaurant_to_customer + handoff_buffer

Each stage has different uncertainty profiles. Prep time depends on kitchen load (hard to observe from outside). Traffic conditions change dynamically. Errors compound: a 5-minute underestimate in prep time means a 5-minute late delivery, period.

### 3.4 Physical World Constraints

Food quality degrades with time. A driver waiting at a restaurant is wasted capacity. Parking at the customer's apartment building adds unpredictable minutes. These physical constraints cannot be solved with software---only anticipated and optimized around.

---

## 4. Key Trade-offs Table

| Decision | Option A | Option B | Recommendation | Why |
|----------|----------|----------|----------------|-----|
| **Driver location protocol** | WebSocket (bidirectional, persistent) | HTTP polling (simple, stateless) | **WebSocket** | 5s update interval makes polling expensive; WebSocket also delivers offers to driver |
| **Dispatch timing** | Eager (assign driver at order placement) | Lazy (assign when food is almost ready) | **Lazy with ML-predicted timing** | Minimizes driver wait at restaurant; requires accurate prep time prediction |
| **ETA model** | Simple distance/speed formula | ML model (gradient boosting + transformer) | **ML with distance-based fallback** | ML improves accuracy by 15-20%; fallback ensures availability if model is down |
| **Order tracking** | WebSocket (real-time push) | Polling every 10s | **WebSocket primary, polling fallback** | Better UX with smooth tracking; polling as universal fallback |
| **Surge pricing** | Fixed tier thresholds (1x, 1.5x, 2x) | Dynamic continuous with EWMA smoothing | **Dynamic with smoothing** | Prevents surge oscillation; responds to actual supply/demand ratio |
| **Driver geo index** | Redis GEORADIUS (built-in, operational simplicity) | H3 hexagonal grid (uniform cells) | **Redis GEORADIUS** | Sufficient for food delivery's wider matching radius (3-8 km); simpler ops than maintaining H3 grid |
| **Order state persistence** | Synchronous write to DB before ACK | Async write, ACK from memory | **Synchronous** | Zero order loss guarantee worth the ~10ms latency cost |
| **Batching strategy** | Always batch if possible (maximize efficiency) | Only batch if both orders meet SLA | **SLA-constrained batching** | First customer's SLA is non-negotiable; batch only if delay < threshold |
| **Menu data architecture** | Single source PostgreSQL + cache | Dedicated menu microservice with ES | **Menu service with multi-layer cache** | CDN + Redis + ES provides the 14,000:1 read:write ratio handling |
| **Cross-service communication** | Synchronous REST/gRPC | Async events via Kafka | **Event-driven (Kafka) for non-blocking flows; sync for blocking flows** | Order creation is sync (customer waits); dispatch, notifications, analytics are async |

---

## 5. Common Trap Questions

### Trap 1: "What if no drivers are available?"

**Bad answer**: "Just keep trying until one becomes available."

**Good answer**: A graduated response:
1. **Immediate**: Expand search radius from 5 km → 8 km → 12 km
2. **Within 30 seconds**: Trigger surge pricing increase in the zone (attracts nearby drivers)
3. **Within 1 minute**: Send "bonus zone" push notification to idle drivers in adjacent areas
4. **Within 2 minutes**: Update customer with honest wait estimate; offer option to cancel for full refund
5. **Within 5 minutes**: If still no driver, proactively offer cancellation with compensation (credit)
6. **Systemic**: If this happens frequently in a zone, operations team reviews driver onboarding and incentive structure for that area

### Trap 2: "How do you prevent GPS spoofing?"

**Bad answer**: "Trust the client GPS data."

**Good answer**: Server-side trajectory validation:
- **Speed check**: If a driver's location changed 10 km in 5 seconds (7,200 kph), that is physically impossible → flag and reject
- **Route plausibility**: After pickup, compare driver's actual trajectory against expected route. Large deviations (e.g., driving away from delivery address) trigger alerts
- **Delivery proximity check**: At delivery confirmation, driver must be within 200m of the delivery address
- **Device integrity**: Check for known GPS spoofing apps at driver app startup; detect rooted/jailbroken devices
- **Cross-reference with cell tower triangulation**: If available, compare GPS coordinates with cell tower-based location estimate

### Trap 3: "How do you handle a restaurant that's consistently slow?"

**Bad answer**: "Remove them from the platform."

**Good answer**: A data-driven approach:
1. **Detection**: ETA system tracks actual_prep_time vs. estimated_prep_time per restaurant. Restaurants with std deviation > 10 minutes are flagged
2. **Short-term**: Increase the prep time estimate for this restaurant in the ETA model (so customers see a more accurate ETA)
3. **Medium-term**: Proactively notify the customer if the restaurant is running late ("Your food is taking a bit longer than usual, updated ETA: +7 min")
4. **Long-term**: Share prep time analytics with the restaurant through their dashboard; suggest menu simplification if prep times are too variable
5. **Extreme case**: If prep time reliability is consistently poor, reduce the restaurant's search ranking (shown lower in results)

### Trap 4: "What if payment authorization fails after order is placed?"

**Bad answer**: "Cancel the order."

**Good answer**: It depends on the timing:
- **At order placement**: Payment authorization is part of the synchronous flow. If it fails, the order is not created. Customer sees "Payment failed, please try another method."
- **At capture (post-delivery)**: This is more nuanced. The customer already received their food. The platform cannot un-deliver food. Strategy: retry capture 3 times with exponential backoff. If still failing: flag the order for manual review, contact the payment processor, and attempt capture again within 24 hours. If ultimately uncollectable: absorb the loss (cost of doing business) and flag the customer's account for future risk scoring.

### Trap 5: "How does the system handle a sudden spike---like a major sporting event ending?"

**Bad answer**: "Auto-scale everything."

**Good answer**: Layered approach:
1. **Predictive**: ML model trained on event calendars forecasts demand spikes. Pre-scale services 30 minutes before predicted end time
2. **Reactive surge**: As orders spike, surge pricing activates within 60 seconds, pricing out marginal demand and attracting more drivers
3. **Rate limiting**: If order rate exceeds system capacity, queue orders with a "Your order is in queue, estimated wait: X minutes" message rather than dropping requests
4. **Restaurant throttling**: Automatically pause order acceptance for restaurants that are already at capacity (e.g., >10 active orders)
5. **Graceful degradation**: Non-critical features (promotions, recommendations, ratings) are shed to free compute for order processing and dispatch

---

## 6. Extension Topics (If Time Permits)

| Topic | Key Points |
|-------|-----------|
| **Scheduled orders** | Dispatch triggered at T_delivery - estimated_total_time; separate queue from on-demand; allows better driver scheduling |
| **Group ordering** | Multiple customers add to a shared cart; single payment or split; single delivery |
| **Subscription / DashPass** | Free delivery for subscribers; affects pricing service; changes driver incentive calculation |
| **Restaurant onboarding** | Tablet provisioning, menu digitization (photo → menu OCR), first-order support |
| **Driver incentive optimization** | Peak pay zones, completion bonuses, quest milestones---all balance supply/demand |
| **Grocery/retail delivery** | Longer prep (item picking), different packaging, heavier items, different vehicle requirements |

---

## 7. Architecture Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|----------------|
| Synchronous dispatch in the order placement API | Customer would wait 30+ seconds for response | Async: return order confirmation immediately; dispatch happens in background via Kafka event |
| Single global dispatch queue | Orders in different cities compete for the same workers; unnecessary contention | Geo-sharded dispatch: one optimizer per city/zone |
| Storing driver locations in PostgreSQL | 100K writes/sec with geo queries would overwhelm any RDBMS | Redis Geo for real-time; time-series DB for history |
| No compensation for cancelled orders to drivers | Driver wasted time traveling to restaurant | Saga pattern with compensation: partial payment to driver for cancelled-after-assigned orders |
| ETA as a static number | Customer sees "35 min" and it never updates, but delivery takes 50 min | Progressive ETA: update at each state transition and periodically during delivery |
| No circuit breaker on external dependencies | If payment processor is slow, all order placement backs up | Circuit breaker: fail fast, queue orders for retry; customer sees "processing" rather than timeout |
