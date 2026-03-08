# Requirements & Estimations

## Functional Requirements

### Core Features (In Scope)

1. **Event CRUD with Recurrence**: Create, read, update, and delete events with support for RFC 5545 recurrence rules (daily, weekly, monthly, yearly with complex patterns like "second Tuesday of every month"). Support single-instance modifications (EXDATE, RDATE) and "this and following" changes.

2. **Availability & Free-Busy Queries**: Query a user's availability across all their calendars. Return busy/free/tentative slots for a given time range. Support multi-user availability intersection ("find a time when Alice, Bob, and Carol are all free").

3. **Real-Time Invitations & RSVP**: Send event invitations to attendees. Track RSVP status (accepted, declined, tentative, no response). Notify organizer of RSVP changes. Support optional vs. required attendees.

4. **Reminders & Notifications**: Per-event configurable reminders (e.g., 15 minutes before, 1 hour before). Multi-channel delivery: push notification, email, SMS. Recurring event reminders fire for each instance.

5. **External Booking (Calendly-Style)**: Public booking links with configurable availability rules. Buffer time between meetings, daily/weekly booking limits. Guest self-service: select slot, provide details, confirm. Automatic event creation and calendar blocking.

6. **Calendar Sharing & Permissions**: Share calendars with specific users or groups. Permission levels: free-busy only, read details, edit, manage. Organizational default sharing (e.g., all employees see each other's free-busy).

7. **Meeting Room & Resource Management**: Resources (rooms, equipment) with their own calendars. Capacity constraints (room seats 10 people). Auto-accept or require approval for resource booking. Conflict detection across resource bookings.

### Out of Scope

- Video conferencing (handled by Meet/Zoom integration)
- Task/to-do management (separate system)
- Project management timelines (Gantt charts)
- Email client functionality
- Social event discovery/public event listings

---

## Non-Functional Requirements

| Requirement | Target | Justification |
|------------|--------|---------------|
| **Availability** | 99.99% (52 min downtime/year) | Calendar is mission-critical for scheduling; downtime causes missed meetings |
| **Consistency** | Strong for event writes; eventual for free-busy cache | Double-booking prevention requires strong consistency; free-busy can lag 5-10s |
| **Latency (p50)** | Calendar view: <100ms, Event create: <200ms, Free-busy query: <50ms | Users expect instant calendar rendering |
| **Latency (p99)** | Calendar view: <500ms, Event create: <1s, Free-busy query: <200ms | Even tail latency must feel responsive |
| **Durability** | 99.999999999% (11 nines) | Events must never be lost; users depend on calendar as source of truth |
| **Offline Support** | Read cached calendar; queue writes for sync | Mobile users need calendar access without connectivity |
| **Multi-Region** | Active-active in 3+ regions | Global user base requires low-latency access worldwide |
| **Sync Interop** | CalDAV, iCal export/import, Exchange sync | Users connect Google, Outlook, Apple calendars simultaneously |

### CAP Theorem Position

**CP for event writes, AP for reads.** Event creation and modification must be strongly consistent to prevent double-booking of resources and conflicting attendee schedules. Calendar view reads and free-busy queries can tolerate eventual consistency (5-10 second lag) to achieve higher availability and lower latency through caching and read replicas.

---

## Scale Assumptions

| Metric | Value | Basis |
|--------|-------|-------|
| Total registered users | 500M | Google Calendar scale |
| Daily Active Users (DAU) | 150M (30% of registered) | Enterprise + consumer usage |
| Monthly Active Users (MAU) | 300M (60% of registered) | Includes monthly-only users |
| Average calendars per user | 3 (primary + 2 shared/subscribed) | Work, personal, team calendars |
| Average events per user per day | 5 (mix of single + recurring instances) | Enterprise users: 8-12; consumers: 2-3 |
| New events created per day | 200M | 150M DAU * 1.3 new events/day average |
| Recurring event percentage | 40% of all events | Standups, weeklies, 1:1s dominate enterprise calendars |
| Free-busy queries per day | 2B | Scheduling assistants, booking pages, calendar views |
| Reminders fired per day | 1.5B | 150M DAU * 5 events * 2 reminders avg |
| Peak multiplier | 5x average (Monday 8-10 AM per timezone) | Morning spike as users check calendars and schedule |
| External booking events per day | 50M | Calendly-style bookings across all users |

---

## Capacity Estimations

### Event Storage

```
Average event size:
  - Event metadata (title, description, location): ~500 bytes
  - Recurrence rule (RRULE + exceptions): ~200 bytes
  - Attendee list (avg 5 attendees * 100 bytes): ~500 bytes
  - Reminders, permissions, metadata: ~300 bytes
  Total per event: ~1.5 KB

Total events in system:
  - 500M users * 3 calendars * ~200 active events per calendar = 300B event records
  - But recurring events stored as rules: ~50B stored records (recurring compressed)
  - Storage: 50B * 1.5 KB = 75 TB raw event data
  - With indexes and versions: ~150 TB total

Daily event writes:
  - 200M new events/day * 1.5 KB = 300 GB/day new data
  - Annual growth: ~110 TB/year
```

### Free-Busy Index

```
Bitmap approach (15-min slots, 2-week lookahead):
  - Slots: 14 days * 96 slots/day = 1,344 bits = 168 bytes per user
  - 500M users * 168 bytes = 84 GB total free-busy index
  - Fits entirely in distributed cache

On-demand expansion:
  - Free-busy query processes avg 30 events per user per 2-week window
  - 2B queries/day * 30 events * 0.1ms per event = 6M CPU-seconds/day
```

### Notification Throughput

```
Reminders per day: 1.5B
  - Average delivery: 2 channels (push + email) = 3B deliveries/day
  - Peak QPS: 3B / 86,400 * 5x peak = ~175K deliveries/second at peak
  - Notification payload: ~500 bytes
  - Peak bandwidth: 175K * 500 bytes = 87.5 MB/s
```

### Write QPS

```
Average:
  - Event creates: 200M / 86,400 = ~2,300 writes/second
  - RSVP updates: ~500M / 86,400 = ~5,800 writes/second
  - Total write QPS: ~8,100

Peak (5x):
  - ~40,500 writes/second
```

### Read QPS

```
Average:
  - Calendar view renders: 150M DAU * 10 views/day = 1.5B / 86,400 = ~17,400 reads/second
  - Free-busy queries: 2B / 86,400 = ~23,150 queries/second
  - Total read QPS: ~40,550

Peak (5x):
  - ~200K reads/second
```

---

## SLO Targets

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| **Availability** | 99.99% | Synthetic probes from 5+ regions, measured monthly |
| **Calendar View Latency (p99)** | <500ms | End-to-end from API request to response, sampled at edge |
| **Event Create Latency (p99)** | <1s | Including attendee notification dispatch |
| **Free-Busy Query Latency (p99)** | <200ms | Multi-calendar aggregation with cache hit |
| **Reminder Delivery Accuracy** | 99.9% within 60s of target time | Timer queue fire time vs. actual delivery timestamp |
| **Booking Slot Accuracy** | 100% no double-booking | Zero tolerance for resource/slot double-booking |
| **Sync Latency (CalDAV)** | <30s from event change to sync delivery | Measured at sync client poll interval |
| **Error Rate** | <0.1% of all API calls | 5xx responses / total responses |
| **Data Durability** | 99.999999999% | Replicated across 3+ availability zones |

---

## Bandwidth Estimation

```
Inbound (writes):
  - Event creates: 300 GB/day = 3.5 MB/s average, 17.5 MB/s peak
  - RSVP updates: ~100 GB/day = 1.2 MB/s average

Outbound (reads):
  - Calendar view responses: 1.5B * 5 KB avg = 7.5 TB/day = 87 MB/s avg, 435 MB/s peak
  - Free-busy responses: 2B * 1 KB avg = 2 TB/day = 23 MB/s avg
  - Total outbound: ~110 MB/s average, ~550 MB/s peak

Notification outbound:
  - 3B deliveries * 500 bytes = 1.5 TB/day = 17 MB/s average
```

---

## Storage Summary (Year 1 vs Year 5)

| Component | Year 1 | Year 5 |
|-----------|--------|--------|
| Event data (primary) | 150 TB | 700 TB |
| Free-busy index (cache) | 84 GB | 150 GB |
| Reminder queue (active) | 50 GB | 100 GB |
| Notification logs | 20 TB | 100 TB |
| Audit/sync logs | 10 TB | 50 TB |
| Search index | 30 TB | 150 TB |
| **Total** | **~210 TB** | **~1.1 PB** |
