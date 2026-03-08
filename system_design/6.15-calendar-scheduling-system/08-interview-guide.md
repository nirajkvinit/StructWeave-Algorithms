# Interview Guide

## 45-Minute Pacing Guide

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Clarify** | Scope and constraints | Ask about scale (enterprise vs consumer), recurring events, booking feature, timezone requirements |
| 5-10 min | **Data Model** | Core entities | Event (with RRULE), Calendar, Attendee, Reminder; explain timezone storage choice |
| 10-20 min | **High-Level Design** | Architecture | Draw services: Calendar, Event, Free-Busy, Notification, Booking; explain data flow for event creation |
| 20-30 min | **Deep Dive** | 1-2 critical components | Choose: recurring event storage OR free-busy at scale OR booking double-booking prevention |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failure modes | Reminder delivery at scale, timezone DB updates, cache invalidation storms |
| 40-45 min | **Wrap Up** | Summary and extensions | Mention CalDAV sync, resource management, or AI scheduling as extensions |

---

## "Start Here" Talking Points

When the interviewer says "Design a Calendar System like Google Calendar," start with:

1. **Frame the problem**: "This is fundamentally a time-management system with three hard problems: recurring event representation, timezone-correct scheduling, and real-time availability aggregation."

2. **Establish scale**: "Google Calendar has 500M+ users. At that scale, the read traffic is dominated by calendar view rendering and free-busy queries—20:1 read-to-write ratio."

3. **Clarify scope**: "Should I include Calendly-style external booking? How deep should I go on CalDAV/iCal interoperability? Is resource/room management in scope?"

4. **Name the unique challenge**: "The most architecturally interesting aspect is that a single recurring event is not N copies—it's a rule that generates instances on demand, and each instance can be independently modified, creating a complex exception tree."

---

## 10 Likely Interview Questions

### 1. How do you store recurring events?

**Best answer**: Store the RRULE (RFC 5545) as a property of the master event, and materialize instances within a rolling window (6 months forward). This gives you O(1) reads for common queries (this week/month) while keeping storage manageable for infinite series. Modifications to individual instances are stored as overrides linked to the master via `original_start` (the occurrence time the instance would have had per the rule).

**Key detail**: "This and following" changes split the series—add UNTIL to the original master and create a new master for the remainder.

### 2. How do you handle timezones for recurring events?

**Best answer**: Store events as "UTC timestamp + IANA timezone." The UTC is for range queries and sorting. The timezone is for recurrence expansion. When expanding "daily at 9 AM America/New_York," each instance must be generated in local time first, then converted to UTC using that date's timezone rules. This correctly handles DST transitions where the UTC offset changes.

**Key trap to avoid**: Don't say "just store everything in UTC." That breaks recurring events across DST boundaries.

### 3. How do you handle free-busy queries at scale?

**Best answer**: Dedicated Free-Busy Service with pre-computed bitmaps (15-minute granularity, 2-week window) cached in distributed cache. Each user's bitmap is ~168 bytes. On event changes, invalidate the affected user's bitmap asynchronously. For multi-user intersection, fetch bitmaps in parallel and perform bitwise OR.

**Numbers to cite**: 2B free-busy queries/day, 84 GB total bitmap storage for 500M users, sub-10ms query time from cache.

### 4. How do you prevent double-booking in a Calendly-style booking system?

**Best answer**: Distributed lock on the host's time slot (keyed by `host_id:slot_start`). Inside the lock: re-verify the slot is still free via fresh free-busy query, create the event, invalidate the free-busy cache, then release the lock. Use idempotency keys (hash of booking_link + slot + guest_email) to handle retries safely.

**Key insight**: Optimistic locking alone isn't enough because the "check availability" and "create event" steps are not atomic in the same database transaction when free-busy is a separate service.

### 5. How do you deliver 1.5 billion reminders per day on time?

**Best answer**: Distributed timer store partitioned by fire_time (minute-level buckets). Workers claim buckets as their time arrives. For a typical hour, there are 62.5M reminders; at peak (9 AM), 190M. Workers process each reminder by verifying the event still exists, then dispatching to the notification channel.

**Key optimization**: For large meetings (50K attendees), use fan-out-on-fire: store one group reminder entry instead of 50K individual entries, and expand at fire time.

### 6. What happens when a country changes its DST rules?

**Best answer**: The IANA timezone database is updated. The system loads the new rules and triggers re-expansion of all recurring events that use the affected timezones. For each instance whose UTC time changed, the system updates the materialized instance, re-schedules its reminders, and optionally notifies attendees of the time shift.

**Proactive insight**: This is why storing the original timezone is critical—without it, you can't re-expand the series correctly.

### 7. How do you shard calendar data?

**Best answer**: User-based sharding (consistent hashing on user_id). All of a user's calendars, events, and free-busy data live on the same shard. This ensures calendar view queries (the most common operation) hit a single shard.

**Cross-shard challenge**: Event invitations cross shard boundaries. The organizer's shard has the master event; attendees' shards have reference records. Invitation delivery and RSVP updates happen asynchronously across shards.

### 8. How do you handle "this occurrence only" vs "all events" modifications?

**Best answer**: Three modification scopes:
- **This occurrence**: Store an instance override with `is_modified = true` and the changed fields. The original occurrence time (`original_start`) links it to its position in the series.
- **All events**: Update the master event's RRULE and properties, then re-expand the materialization window.
- **This and following**: Split the series. Add `UNTIL` to the original master (truncating it at the current instance), create a new master event with the modified properties starting from the current instance.

### 9. How do you handle offline calendar access?

**Best answer**: Mobile clients cache the materialized event list for the current ± 2 weeks. Offline event creates/updates are queued locally with unique client-generated event IDs. When connectivity returns, the sync engine pushes queued changes and pulls remote changes. Conflicts (same event modified both locally and remotely) are resolved by last-writer-wins for simple fields, or by preserving both changes and asking the user to resolve for complex conflicts.

### 10. How does CalDAV sync work at scale?

**Best answer**: Each calendar maintains a change log with monotonically increasing sequence numbers. CalDAV clients provide a sync token (their last seen sequence number). The sync service returns all changes since that token as a delta. This avoids full calendar downloads on every sync. For real-time capable clients, WebSocket push notifies them of changes immediately, reducing polling frequency.

---

## Proactive Trade-offs to Raise

| Trade-off | Option A | Option B | Recommendation |
|-----------|----------|----------|----------------|
| **Recurring event storage** | Store rule only (expand on read) | Materialize all instances | Hybrid: rule + rolling window |
| **Free-busy freshness vs performance** | Real-time computation (always fresh) | Cached bitmaps (5-10s stale) | Cached bitmaps with event-driven invalidation |
| **Reminder precision vs scale** | Per-second precision | Per-minute bucket precision | Per-minute buckets with ±30s jitter |
| **Booking consistency** | Optimistic (check-then-create with retry) | Pessimistic (distributed lock) | Distributed lock with 10s TTL for correctness |
| **Cross-region sync** | Synchronous replication (strong consistency) | Async replication (eventual, lower latency) | Async with <3s lag; strong for local writes |

---

## Trap Questions to Avoid

| Trap Question | What Interviewer Wants | Best Response |
|---------------|------------------------|---------------|
| "Can't you just store all events in UTC?" | Test timezone understanding | "UTC storage works for one-off events, but breaks recurring events across DST. A daily 9 AM meeting would shift by an hour twice a year. We must store the original timezone and re-expand." |
| "Why not just create a copy of the event for each recurrence?" | Test storage/scalability awareness | "An infinite daily event would create unlimited rows. Even bounded series—a weekly meeting for 5 years—creates 260 instances per attendee. At 500M users, this explodes storage. Store the rule, materialize a window." |
| "Just use a cron job for reminders." | Test distributed systems understanding | "Cron is single-machine. At 1.5B reminders/day, we need a distributed timer store with partitioned buckets. Cron also has polling overhead and can't guarantee sub-minute precision for millions of concurrent timers." |
| "What if two people book the same slot simultaneously?" | Test concurrency control | "This is a classic write contention problem. We use a distributed lock keyed on host+slot. The first to acquire the lock proceeds; the second gets a 409 Conflict. Idempotency keys handle safe retries." |
| "How do you handle a meeting with 50,000 attendees?" | Test fan-out awareness | "The event itself is fine—one record. The challenge is notification fan-out: 50K reminders per occurrence, 50K RSVP tracking records. We use fan-out-on-fire for reminders and batch processing for RSVP aggregation." |

---

## Key Numbers to Memorize

| Metric | Value |
|--------|-------|
| Google Calendar DAU | ~150M |
| Events per user per day | ~5 (enterprise avg) |
| Free-busy queries per day | ~2B |
| Reminders per day | ~1.5B |
| Free-busy bitmap per user (2-week window) | 168 bytes |
| Total free-busy index (500M users) | ~84 GB |
| Event record size | ~1.5 KB |
| Peak reminder QPS | ~175K/s |
| Read:Write ratio | 20:1 to 50:1 |
| Materialization window | 6 months forward |

---

## What Makes This System Unique vs Other Calendar Questions

1. **It's not a booking system** (like hotel/ticket): The primary user is the calendar owner, not the booker. Events have attendees with RSVP, not just a reservation.

2. **It's not a notification system** (like push notifications): Reminders are derived from events and must fire at timezone-aware wall-clock times, not just UTC timestamps.

3. **It's not a scheduling optimizer** (like workforce scheduling): The system manages time commitments, not resource allocation. The optimization problem is "find a free slot," not "minimize cost of coverage."

4. **The core challenge is the intersection of time, timezone, and recurrence**—three dimensions that compound in complexity when combined. Getting any one of them wrong produces subtle bugs that users experience as "my meeting disappeared" or "my reminder came an hour late."

---

## Complexity Scorecard

| Component | Complexity | Why |
|-----------|-----------|-----|
| Data model | Medium | RRULE + exceptions add depth, but the entity model is straightforward |
| Timezone handling | **Very High** | DST transitions, IANA DB updates, cross-timezone attendees |
| Free-busy aggregation | High | Multi-calendar, multi-user intersection with caching |
| Reminder scheduling | High | Distributed timer at scale with precision guarantees |
| Booking (Calendly) | Medium-High | Double-booking prevention under concurrent writes |
| CalDAV sync | Medium | Standard protocol, but edge cases in conflict resolution |
| Sharing/permissions | Medium | ACL model is simpler than hierarchical (compared to KMS) |
