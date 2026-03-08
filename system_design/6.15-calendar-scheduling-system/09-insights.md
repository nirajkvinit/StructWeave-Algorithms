# Key Architectural Insights

## Insight 1: RRULE Expansion — Why Storing the Rule Is Correct and Full Materialization Is an Antipattern

**Category**: Data Modeling

**One-liner**: A recurring event is a generative rule, not a collection of instances, and treating it as the latter creates an explosion of storage, update cost, and conceptual incoherence.

**Why it matters**: The naive approach to recurring events—create a separate database row for each occurrence of "Daily standup at 9 AM"—appears simple until you confront three realities. First, many recurring events have no end date. A "FREQ=DAILY" rule without COUNT or UNTIL is semantically infinite. The system cannot materialize infinity, so it must choose an arbitrary horizon (1 year? 5 years?), creating an artificial boundary that users will eventually hit and perceive as a bug ("Why does my recurring event stop showing after December?").

Second, the update cost is catastrophic. When an organizer changes the meeting from 9 AM to 10 AM "for all events," a fully materialized series with 260 instances (weekly for 5 years) requires 260 database updates, 260 reminder re-schedules, and 260 free-busy cache invalidations—multiplied by the number of attendees. With the rule-based approach, a single update to the master event's properties achieves the same result, and only the materialized window (6 months, ~26 instances) needs re-expansion.

Third, the conceptual model breaks. When a user says "delete all future occurrences," they expect to modify the rule (add an UNTIL date), not individually cancel hundreds of instances. The rule-based model naturally supports this operation, while the materialized model requires scanning and soft-deleting a potentially unbounded number of rows.

The correct architecture is hybrid: store the RRULE as the source of truth and materialize instances within a rolling window for query performance. This gives O(1) reads for the common case (this week/month), O(1) series modifications (update the rule), and bounded storage regardless of series length. The materialization window should be tuned to the application—6 months covers 99% of calendar views, with on-demand expansion for the rare long-range query.

---

## Insight 2: Timezone Semantics — Wall-Clock Time vs. UTC and the Ghost Meeting Problem

**Category**: Correctness

**One-liner**: Storing recurring events in UTC without preserving the original timezone creates "ghost meetings" during DST transitions—events that silently shift by an hour and cause users to miss meetings.

**Why it matters**: Consider a "9 AM America/New_York daily standup" created in January (EST, UTC-5). If the system stores this as "14:00 UTC daily," everything works correctly through winter. On the second Sunday of March, the US transitions to EDT (UTC-4). Now, 14:00 UTC is 10:00 AM Eastern, not 9:00 AM. The meeting silently shifted by an hour. No notification was sent. No calendar UI showed a change. The 9 AM standup now appears at 10 AM, and three attendees miss the first 15 minutes before someone notices.

This is the "ghost meeting" problem, and it is the single most common architectural mistake in calendar system design. The root cause is conflating the storage format (UTC, which is excellent for range queries and cross-timezone comparison) with the semantic intent ("9 AM in New York," which is a wall-clock time that should be preserved regardless of DST state).

The correct approach is to store both: the UTC timestamp (for indexing, sorting, and range queries) AND the original IANA timezone (for recurrence expansion). When expanding the RRULE, the engine generates each instance in the original timezone's local time first ("9:00 AM on March 15 in America/New_York"), then converts to UTC using the timezone rules for that specific date (UTC-4 for EDT). This produces 13:00 UTC for the March 15 instance and 14:00 UTC for the January 15 instance—different UTC times, same wall-clock time. Both are correct.

The subtlety deepens when the IANA timezone database itself is updated. Countries change DST rules (Turkey abolished DST in 2016, Morocco has modified its rules multiple times). When a timezone update is published, every recurring event using the affected timezone must be re-expanded with the new rules, and any instances whose UTC times changed must have their reminders re-scheduled and attendees notified. This is a batch operation that can affect millions of events and must be handled within hours of the timezone database update to prevent incorrect reminder delivery.

---

## Insight 3: Free-Busy as a Separate Service — Why Availability Must Be Architecturally Isolated

**Category**: Architecture

**One-liner**: Free-busy computation aggregates data from multiple calendars, applies privacy filters, expands recurring events, and serves at 10x the QPS of event reads—making it a fundamentally different workload that must be separated from the event storage path.

**Why it matters**: A free-busy query—"Is Alice available from 2 PM to 3 PM on Tuesday?"—appears trivially simple. Scan Alice's events in that time range, check for conflicts, return busy or free. In reality, the query must: (1) enumerate all of Alice's calendars (primary, work, personal—typically 3-5), (2) for each calendar, query events in the time range including expanded recurring event instances, (3) filter out events Alice has declined, (4) filter out events marked as "transparent" (does not block availability), (5) apply privacy rules (a reader should see "busy" but not the event details; a freeBusyReader should see only busy/free intervals with no event metadata), and (6) merge overlapping busy intervals to prevent information leakage.

This computation touches the event store (potentially across multiple shards if calendars span users), the recurrence expansion engine (for recurring events that haven't been materialized yet), the attendee store (to check RSVP status), and the permission model (to verify the requester has freeBusyReader access). If performed on every query, it would require 5-10 database queries per user per request. At 2 billion free-busy queries per day (23,000 QPS average, 115,000 QPS peak), this would overwhelm the event database.

The architectural solution is a dedicated Free-Busy Service that maintains pre-computed bitmaps in a distributed cache. Each user's availability is represented as a bit array where each bit represents a 15-minute slot (1 = busy, 0 = free). A 2-week window requires 1,344 bits (168 bytes) per user—trivially small. The entire index for 500 million users fits in 84 GB of cache memory. Free-busy queries resolve in sub-10ms by loading the bitmap from cache and checking bit ranges.

The cache is invalidated event-driven: when any event affecting a user is created, modified, or deleted, the Event Service publishes a domain event that the Free-Busy Service consumes to invalidate the affected user's bitmap. The next query triggers a re-computation from the read replica. This creates a 5-10 second staleness window, which is acceptable for scheduling purposes (a user who just created an event may see their availability update with a short delay).

---

## Insight 4: The External Booking Problem — Why Calendly-Style Booking Requires Distributed Locking

**Category**: Concurrency

**One-liner**: A Calendly-style booking page creates a read-then-write race condition where two guests can simultaneously see the same slot as available and both attempt to book it, requiring distributed locking with re-verification to prevent double-booking.

**Why it matters**: The booking flow has three steps: (1) display available slots (read), (2) guest selects a slot (client-side), (3) confirm the booking (write). Between steps 1 and 3, arbitrary time passes—seconds to minutes—during which another guest may have booked the same slot. This is a classic TOCTOU (time-of-check-time-of-use) problem, and it is not solvable with database-level constraints alone because the "check" (free-busy query) and the "use" (event creation) operate on different data stores.

The free-busy cache says the slot is free. The guest clicks "confirm." The booking service must now: verify the slot is still free (the cache may be stale), create the event, and update the free-busy cache—all atomically. But "atomically" across a cache, a database, and a separate free-busy service is not achievable through a single database transaction.

The solution is a distributed lock keyed on `host_id:slot_start_time`. The first booking request acquires the lock (with a 10-second TTL to prevent deadlocks). Inside the lock, the service performs a fresh free-busy check against the database (not cache), creates the event if the slot is truly free, invalidates the free-busy cache, and releases the lock. The second concurrent request either waits for the lock (if the implementation supports blocking) or immediately receives a "slot temporarily unavailable, please retry" response.

Idempotency is equally critical. If a guest's browser retries the booking request (due to a timeout or network issue), the system must not create a duplicate event. An idempotency key derived from the booking link ID, slot start time, and guest email ensures that repeated requests with the same parameters return the same response without side effects.

The lock-based approach introduces a bottleneck: popular hosts (sales representatives, customer success managers) may have dozens of concurrent booking attempts. The lock TTL must be short (10 seconds) to minimize wait time, and the in-lock operation must be fast (<1 second). For extremely popular booking pages, a queue-based approach (serialize booking requests per host) may provide better fairness than a lock-based approach, at the cost of slightly higher latency.

---

## Insight 5: Notification Fan-Out for All-Hands Meetings — When a Single Event Generates 50,000 Reminders

**Category**: Scalability

**One-liner**: A single recurring meeting with 50,000 attendees generates 50,000 reminder timer entries per occurrence—a fan-out that breaks naive per-attendee reminder scheduling and requires a deferred expansion strategy.

**Why it matters**: Most calendar events have 1-10 attendees. The system design for reminders—one timer entry per attendee per reminder per event instance—works fine at this scale. A weekly meeting with 5 attendees and 2 reminders each generates 10 timer entries per week: negligible.

An all-hands meeting with 50,000 attendees and 2 reminders each generates 100,000 timer entries per occurrence. If it is weekly for 26 weeks (the materialization window), that is 2.6 million timer entries from a single event. If the organization has 10 such recurring meetings (department all-hands, company-wide meetings, training sessions), that is 26 million timer entries dominating the timer store.

The architectural solution is **fan-out-on-fire**: for events with more than N attendees (e.g., N=1,000), store a single "group reminder" entry in the timer store instead of individual per-attendee entries. The group reminder contains the event ID and the reminder time. When the timer fires, the reminder worker queries the attendee list from the event store and dispatches notifications in batches of 100, spreading the fan-out over a few seconds rather than pre-loading millions of timer entries.

This creates a trade-off: group reminders add 2-5 seconds of delivery latency (the time to query attendees and batch-dispatch) compared to pre-materialized per-attendee entries (which fire instantly from the timer store). For a 15-minute-before reminder, this 2-5 second delay is imperceptible. For a 0-minute "at event start" reminder, it means some attendees receive the notification 5 seconds late—also acceptable.

The threshold for switching from individual to group reminders (N=1,000) should be configurable and informed by the timer store's capacity. If the timer store can comfortably hold 100 million active entries, the threshold can be higher. If capacity is constrained, lowering the threshold reduces storage pressure at the cost of slightly more work at fire time. The key insight is that pre-materialization is an optimization for small fan-out, not a requirement—and it becomes an antipattern at large fan-out where storage costs dominate.

---
