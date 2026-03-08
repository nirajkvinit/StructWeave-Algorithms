# Deep Dive & Bottlenecks

## Deep Dive 1: Recurring Event Storage — Rule vs. Expansion

### The Problem

A recurring event like "Daily standup at 9 AM, Monday through Friday, no end date" conceptually generates infinite instances. The system must decide: store the rule and expand on demand, or pre-materialize instances?

### Why This Is Architecturally Critical

40% of all events in enterprise calendars are recurring. A single weekly meeting with 10 attendees running for 2 years generates 104 instances, each with 10 attendee records and 2 reminder records. Naively materializing every recurring event would explode storage by 50-100x.

### RRULE RFC 5545 Complexity

The recurrence rule specification is deceptively complex:

```
// Simple: every weekday at 9 AM
RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR

// Complex: second Tuesday of every other month, 10 occurrences
RRULE:FREQ=MONTHLY;INTERVAL=2;BYDAY=TU;BYSETPOS=2;COUNT=10

// Edge case: last day of every month
RRULE:FREQ=MONTHLY;BYMONTHDAY=-1

// Pathological: every year on February 29
RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29
```

The last example only generates instances on leap years---the expansion engine must correctly skip non-leap years.

### Exception Handling

Exceptions layer on top of the rule:

| Exception Type | iCalendar Term | Example | Storage Impact |
|---------------|----------------|---------|----------------|
| **Delete one instance** | EXDATE | "Skip standup on Dec 25" | Store date in exdates array |
| **Modify one instance** | Modified VEVENT with RECURRENCE-ID | "Move this Tuesday's meeting to 10 AM" | Store full instance override |
| **Delete this and following** | RRULE UNTIL modification | "Cancel all meetings after March 31" | Modify master's UNTIL |
| **Change this and following** | Series split | "Move all future meetings to 3 PM" | Split into two master events |

### Chosen Architecture: Hybrid Approach

```
PSEUDOCODE: Materialization Window Strategy

CONSTANT WINDOW_FORWARD = 180 DAYS    // 6 months
CONSTANT WINDOW_BACKWARD = 30 DAYS    // 1 month lookback

FUNCTION materialize_recurring_event(master_event):
    window_start = now() - WINDOW_BACKWARD
    window_end = now() + WINDOW_FORWARD

    instances = expand_rrule(master_event, window_start, window_end)

    // Batch upsert instances
    FOR instance IN instances:
        UPSERT INTO event_instances (
            master_event_id, original_start, start_time, end_time,
            is_modified, is_cancelled
        ) VALUES (
            master_event.id, instance.original_start,
            instance.start_time, instance.end_time,
            false, false
        )

    // Schedule re-materialization at window boundary
    schedule_job(
        "rematerialize",
        master_event_id = master_event.id,
        run_at = now() + WINDOW_FORWARD - 30 DAYS  // Re-expand 30 days before window ends
    )


FUNCTION query_events_in_range(calendar_id, range_start, range_end):
    // For most queries (within materialized window): direct DB query
    IF range_end <= now() + WINDOW_FORWARD:
        RETURN query_materialized_instances(calendar_id, range_start, range_end)

    // For queries beyond window: on-demand expansion
    ELSE:
        materialized = query_materialized_instances(calendar_id, range_start, now() + WINDOW_FORWARD)
        masters = get_recurring_masters(calendar_id)
        FOR master IN masters:
            expanded = expand_rrule(master, now() + WINDOW_FORWARD, range_end)
            materialized.extend(expanded)
        RETURN materialized
```

### Trade-off Analysis

| Aspect | Rule-Only | Full Materialization | Hybrid (Chosen) |
|--------|-----------|---------------------|------------------|
| Storage per series | O(1) | O(n) instances | O(window) instances |
| Calendar view query | O(k) expansion | O(1) lookup | O(1) for common case |
| Series update (change all) | O(1) rule change | O(n) cascade update | O(window) re-expand |
| Single instance modify | Must store override | Direct update | Direct update in window |
| Free-busy accuracy | Must expand on query | Pre-computed | Pre-computed in window |
| Infinite series | Native | Requires artificial bound | Window-bounded |

---

## Deep Dive 2: Free-Busy Query at Scale

### The Problem

"Find a time when Alice, Bob, Carol, and Room 4A are all free for a 1-hour meeting next week" requires aggregating events from 4+ calendars (each user may have 3+ calendars), expanding recurring events, applying visibility rules, and intersecting availability---all within 100ms.

### Multi-Calendar Aggregation Challenge

```
User Alice's effective free-busy:
  = Events from Alice's primary calendar (show as busy)
  + Events from Alice's work calendar (show as busy)
  + Events from subscribed team calendar (only if RSVP accepted)
  - Events Alice has declined
  - Events marked as "free" (transparent)
  + Events from Alice's personal calendar (if org policy includes it)
```

Each user's free-busy is a function of 3-6 calendars, permission rules, and RSVP status. Computing this from raw events for 4 users touching 12-24 calendars would require dozens of database queries.

### Bitmap Cache Architecture

```
PSEUDOCODE: Free-Busy Cache Layer

STRUCTURE FreeBusyBitmap:
    user_id: UUID
    window_start: date       // e.g., 2026-03-01
    window_end: date         // e.g., 2026-03-15
    bitmap: BitArray         // 1,344 bits for 14 days at 15-min granularity
    version: int             // Monotonically increasing

FUNCTION invalidate_on_event_change(event):
    // Determine affected users
    affected_users = [event.organizer_id]
    FOR attendee IN event.attendees:
        affected_users.append(attendee.user_id)

    // Invalidate their cached bitmaps
    FOR user_id IN affected_users:
        cache.delete(f"freebusy:{user_id}")

    // For resource calendars, also invalidate
    IF event.calendar.type == "resource":
        cache.delete(f"freebusy:resource:{event.calendar.resource_id}")


FUNCTION warm_free_busy_cache(user_id):
    // Background job that pre-computes bitmaps for active users
    bitmap = compute_free_busy_bitmap(user_id, today(), today() + 14 DAYS)
    cache.set(f"freebusy:{user_id}", bitmap, ttl=600)  // 10-minute TTL
```

### Read Replica Strategy

For users whose bitmap is not cached (cache miss), the free-busy service queries a **read replica** rather than the primary database to avoid adding load to the write path. Since free-busy can tolerate 5-10 seconds of staleness, replica lag is acceptable.

### Optimization: Pre-Computing for Busy Users

Users with many meetings (executives, popular booking pages) generate disproportionate free-busy query load. The system identifies "hot" users (>100 free-busy queries/day on their calendar) and pre-computes their bitmaps eagerly on a 60-second refresh cycle, rather than waiting for cache invalidation.

### Bottleneck: Multi-User Intersection

Finding common free slots for a group of N users requires N bitmap fetches and a bitwise OR operation. For N=2-5, this is trivial. For N=50 (scheduling an all-hands), the system must:

1. Parallelize all N bitmap fetches (fan-out)
2. Stream the OR operation as bitmaps arrive (don't wait for all N)
3. Early-terminate if no free slots exist in the first few days
4. Suggest "best effort" slots (fewest conflicts) if no perfect slot exists

---

## Deep Dive 3: Timezone Complexity

### The Core Problem

A "9 AM daily standup in New York" is UTC-05:00 in winter (EST) and UTC-04:00 in summer (EDT). This means:

- January instance: 14:00 UTC
- July instance: 13:00 UTC
- The transition day (second Sunday in March): 14:00 UTC one day, 13:00 UTC the next

### Why UTC-Only Storage Fails

If the system stores "14:00 UTC daily," the summer instances appear at 10 AM Eastern instead of 9 AM. This is wrong. The event was created as "9 AM Eastern," and it must always appear at 9 AM Eastern regardless of DST.

### Correct Storage Model

```
Event stored as:
  start_time_utc: 2026-01-05T14:00:00Z    (for range queries, sorting)
  start_timezone: "America/New_York"        (for recurrence expansion)

Expansion logic:
  1. The RRULE says "FREQ=DAILY"
  2. Generate next occurrence in local time: Jan 5 → Jan 6 → Jan 7 → ...
  3. For each local date, combine with "09:00 America/New_York"
  4. Convert to UTC using the timezone rules for THAT date
  5. Jan 6 in EST → 14:00 UTC
  6. Mar 9 (post-DST) in EDT → 13:00 UTC
```

### DST Edge Cases

| Scenario | Problem | Resolution |
|----------|---------|------------|
| **Spring forward**: 2 AM → 3 AM | Event at 2:30 AM doesn't exist | Move to 3:00 AM (next valid time) |
| **Fall back**: 2 AM occurs twice | Event at 1:30 AM is ambiguous | Use the first occurrence (standard time) |
| **Cross-timezone attendees** | Alice (NYC) creates "9 AM", Bob (London) sees "2 PM" winter, "2 PM" summer (because both shift) | Each user's display converts from UTC to their timezone |
| **DST rules change** | A country abolishes DST (e.g., Turkey in 2016) | IANA tzdata update; re-expand all affected recurring events |
| **Recurring event spanning DST** | Weekly meeting every Sunday, DST transition on Sunday | The transition-day instance has a different UTC offset |

### IANA Timezone Database Updates

The system must handle timezone rule changes (countries modify DST rules periodically):

```
PSEUDOCODE: Timezone Database Update Handling

FUNCTION on_tzdata_update(affected_timezones):
    // Find all recurring events using affected timezones
    affected_masters = SELECT * FROM events
                       WHERE start_timezone IN (affected_timezones)
                         AND recurrence_rule IS NOT NULL

    // Re-expand materialized instances with new timezone rules
    FOR master IN affected_masters:
        old_instances = get_materialized_instances(master.id)
        new_instances = expand_rrule(master, window_start, window_end)

        // Compare and update changed instances
        FOR old, new IN zip(old_instances, new_instances):
            IF old.start_time_utc != new.start_time_utc:
                UPDATE event_instances
                SET start_time = new.start_time_utc,
                    end_time = new.end_time_utc
                WHERE id = old.id

                // Re-schedule reminders for changed instances
                reschedule_reminders(old.id, new.start_time_utc)

                // Notify attendees of time change
                notify_time_change(old.id, old.start_time_utc, new.start_time_utc)

        // Invalidate free-busy caches
        invalidate_free_busy_cache(master.organizer_id)
```

---

## Deep Dive 4: Notification Scheduling at Scale

### The Problem

1.5 billion reminders per day must fire at precise wall-clock times. A reminder for "15 minutes before a 9 AM meeting" must fire at 8:45 AM in the user's timezone, not at 8:45 UTC.

### Distributed Timer Queue Architecture

```
PSEUDOCODE: Reminder Timer Queue

// Reminders are partitioned by fire_time into minute-level buckets
STRUCTURE TimerBucket:
    bucket_key: string       // "2026-03-10T08:45" (minute-level)
    reminders: list[Reminder]
    status: "pending" | "claimed" | "processed"

FUNCTION schedule_reminder(event, user, minutes_before, method):
    // Compute fire time in UTC
    fire_time = event.start_time - minutes_before MINUTES

    reminder = Reminder(
        event_id = event.id,
        user_id = user.id,
        method = method,
        fire_time = fire_time,
        status = "pending"
    )

    // Insert into timer store, partitioned by minute
    bucket_key = fire_time.truncate_to_minute()
    timer_store.insert(bucket_key, reminder)


FUNCTION process_timer_buckets():
    // Worker loop: claim and process buckets whose time has arrived
    WHILE true:
        current_minute = now().truncate_to_minute()

        // Claim a bucket (atomic compare-and-swap)
        bucket = timer_store.claim_bucket(
            bucket_key = current_minute,
            worker_id = self.id,
            claim_ttl = 60s
        )

        IF bucket IS NULL:
            // No unclaimed buckets for this minute; check for past-due buckets
            bucket = timer_store.claim_overdue_bucket(worker_id = self.id)

        IF bucket:
            FOR reminder IN bucket.reminders:
                IF reminder.status != "pending":
                    CONTINUE

                // Verify event still exists and hasn't been cancelled
                event = get_event(reminder.event_id)
                IF event IS NULL OR event.status == "cancelled":
                    mark_reminder_skipped(reminder.id)
                    CONTINUE

                // Dispatch notification
                dispatch_notification(reminder)
                mark_reminder_fired(reminder.id)

            mark_bucket_processed(bucket.bucket_key)

        ELSE:
            sleep(1s)  // No work available


FUNCTION dispatch_notification(reminder):
    user_prefs = get_notification_preferences(reminder.user_id)

    SWITCH reminder.method:
        CASE "popup":
            push_to_websocket(reminder.user_id, format_reminder(reminder))
        CASE "email":
            enqueue_email(reminder.user_id, format_email_reminder(reminder))
        CASE "sms":
            enqueue_sms(reminder.user_id, format_sms_reminder(reminder))
```

### Scaling the Timer Queue

| Challenge | Solution |
|-----------|----------|
| 1.5B reminders/day = ~1M/minute at peak | Partition by minute; multiple workers per bucket |
| Clock skew across workers | NTP sync with <100ms tolerance; process buckets with 1s grace period |
| Worker failure mid-processing | Claim TTL expires; another worker re-claims the bucket |
| Event cancelled after reminder scheduled | Verify event status before dispatch (lazy validation) |
| Recurring event generates reminders for 6-month window | Batch-schedule reminders during materialization; re-schedule on event update |

### Fan-Out Problem: All-Hands Meetings

A single recurring all-hands meeting with 50,000 attendees generates:
- 50,000 reminders per occurrence (if each attendee has 1 reminder)
- With 2 reminders each: 100,000 timer entries per occurrence
- Weekly for 26 weeks: 2.6M timer entries from one event

**Mitigation**: For events with >1,000 attendees, use a **fan-out-on-fire** strategy. Store a single "group reminder" entry, and at fire time, query the attendee list and dispatch notifications in batches of 100.

---

## Deep Dive 5: External Booking System (Calendly-Style)

### The Problem

A public booking page must compute and display available slots based on the host's real-time calendar, availability rules, and existing bookings. When a guest selects a slot, the system must prevent double-booking even under concurrent requests.

### Race Condition Scenarios

```
Timeline:
  T=0:  Guest A views slots → sees 10:00 AM available
  T=1:  Guest B views slots → sees 10:00 AM available
  T=2:  Guest A clicks "Book 10:00 AM"
  T=3:  Guest B clicks "Book 10:00 AM"  (concurrent with A's request)

Without protection: Both bookings succeed → double-booked host

With distributed lock:
  T=2:  Guest A acquires lock("host:10:00")
  T=3:  Guest B waits for lock...
  T=4:  Guest A creates event, releases lock
  T=5:  Guest B acquires lock, re-checks availability → 10:00 busy → returns 409 Conflict
```

### Availability Rule Engine

```
PSEUDOCODE: Availability Rule Evaluation

STRUCTURE AvailabilityRules:
    working_hours: map[weekday → list[TimeRange]]
    // e.g., {MON: [{start: "09:00", end: "17:00"}], SAT: []}
    timezone: string
    buffer_before: int          // minutes gap before meetings
    buffer_after: int           // minutes gap after meetings
    min_notice_hours: int       // can't book less than N hours in advance
    max_future_days: int        // can't book more than N days ahead
    daily_limit: int            // max bookings per day
    weekly_limit: int           // max bookings per week
    blocked_dates: list[date]   // manually blocked dates (holidays)

FUNCTION evaluate_availability(rules, date):
    // Check if date is blocked
    IF date IN rules.blocked_dates:
        RETURN []

    // Check if date is within booking window
    IF date < today() + rules.min_notice_hours HOURS:
        RETURN []
    IF date > today() + rules.max_future_days DAYS:
        RETURN []

    // Get working hours for this weekday
    weekday = date.day_of_week()
    hours = rules.working_hours.get(weekday, [])

    // Convert to UTC ranges for comparison with free-busy
    utc_ranges = []
    FOR range IN hours:
        utc_start = to_utc(date + range.start, rules.timezone)
        utc_end = to_utc(date + range.end, rules.timezone)
        utc_ranges.append({start: utc_start, end: utc_end})

    RETURN utc_ranges
```

### Idempotent Booking Confirmation

Booking must be idempotent to handle retries safely:

```
PSEUDOCODE: Idempotent Booking

FUNCTION reserve_slot(booking_link_id, slot_start, guest_email):
    // Generate idempotency key from booking parameters
    idempotency_key = hash(booking_link_id + slot_start + guest_email)

    // Check for existing booking with same key
    existing = lookup_by_idempotency_key(idempotency_key)
    IF existing:
        RETURN existing  // Same response as original booking

    // Proceed with new booking (with distributed lock)
    ...
```

---

## Bottleneck Analysis

### Top 3 Bottlenecks

| Rank | Bottleneck | Impact | Mitigation |
|------|-----------|--------|------------|
| 1 | **Free-busy cache invalidation storm** | A single event change invalidates bitmaps for all attendees; popular event update invalidates thousands of caches | Batch invalidation with coalescing; 5-second debounce on re-computation; async rebuild |
| 2 | **Recurring event re-materialization** | Changing an RRULE triggers re-expansion and re-scheduling of all instances and reminders in the window | Background re-materialization job; serve stale instances during rebuild; version-gated reads |
| 3 | **Reminder fire-time hotspot** | Most reminders cluster around :45 and :00 of the hour (15 min and 0 min before meetings starting on the hour) | Pre-shard timer buckets; auto-scale workers based on bucket depth; jitter insertion (±30 seconds) |

### Additional Bottlenecks

| Bottleneck | Description | Mitigation |
|-----------|-------------|------------|
| **Monday morning spike** | 5x traffic surge as users check weekly calendars | Pre-warm caches Sunday night; auto-scale API servers on schedule |
| **CalDAV sync thundering herd** | Many CalDAV clients poll on fixed intervals (e.g., every 5 minutes), causing synchronized spikes | Add jitter to sync token expiry; support WebSocket push for modern clients |
| **Booking page hot host** | Popular hosts (sales teams, support) receive thousands of concurrent slot requests | Dedicated cache per booking link; rate limit per booking link; queue slot requests |
