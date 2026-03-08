# Calendar & Scheduling System Design

## System Overview

A Calendar & Scheduling System---exemplified by Google Calendar (500M+ users), Outlook Calendar (400M+ users), and Calendly (20M+ users)---provides users with the ability to create, manage, and share time-based events across timezones, devices, and organizational boundaries. Unlike simple to-do lists or task managers, a calendar system is built around **recurring event rules** (RFC 5545 RRULE expansion with exceptions), **timezone-aware storage** (UTC normalization with display timezone preservation), **free-busy aggregation** (real-time availability across multiple calendars), **invitation and RSVP workflows** (multi-party event coordination), **reminder scheduling** (distributed timer queues firing at precise wall-clock times), **external booking** (Calendly-style public availability pages with double-booking prevention), and **cross-platform sync** (CalDAV/iCal interoperability). At scale, this means serving billions of free-busy queries daily, expanding millions of recurring event rules into concrete instances, and delivering tens of millions of reminders within seconds of their target time---all while correctly handling the 500+ timezone rules and their DST transitions.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Read-dominant (20:1 to 50:1); most traffic is calendar views and free-busy queries, not event creation |
| **Latency Sensitivity** | High for calendar rendering (<200ms) and free-busy queries (<100ms); medium for event creation (<500ms) |
| **Consistency Model** | Strong consistency for event writes and booking (no double-booking); eventual consistency for free-busy caches and search |
| **Concurrency Level** | Low per event (1-5 editors); high for popular booking pages (thousands of simultaneous slot requests) |
| **Data Volume** | Very High---billions of events, each recurring event potentially generating thousands of instances |
| **Architecture Model** | Read-heavy, timezone-aware, notification-intensive with distributed timer scheduling |
| **Offline Support** | Required---mobile clients must show cached calendar views and queue event changes for sync |
| **Complexity Rating** | **High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Recurring events, free-busy, timezone, notifications, booking |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Access control, encryption, compliance, audit |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Task Manager | Notification System | Booking Platform (Hotel) | Calendar & Scheduling (This) |
|--------|-------------|---------------------|--------------------------|------------------------------|
| **Primary Unit** | Task with due date | Message/alert | Reservation with inventory | Event with time range, recurrence, and attendees |
| **Time Model** | Deadline (single point) | Fire time (single point) | Check-in/check-out (date range) | Start/end with timezone, recurrence rules, exceptions |
| **Recurrence** | Repeat task (simple) | Scheduled delivery | N/A | RFC 5545 RRULE (complex: weekly, monthly by day, yearly, with exceptions) |
| **Timezone** | Minimal (user-local) | UTC fire time | Property-local | Per-event timezone with DST-aware expansion |
| **Multi-Party** | Assignee | Recipient | Guest count | Attendees with RSVP, organizer, optional/required |
| **Availability** | N/A | N/A | Room inventory | Free-busy aggregation across multiple calendars |
| **External Booking** | N/A | N/A | Availability search | Public booking page with slot selection and confirmation |
| **Sync Protocol** | Proprietary | Push channels | Proprietary | CalDAV, iCal (RFC 5545), Exchange ActiveSync |

---

## What Makes This System Unique

1. **Recurring Event Complexity**: A recurring event is not N copies of an event---it is a single rule (RRULE) that generates instances on demand. Modifications to individual instances (changing the time of "this occurrence only"), deletions of specific occurrences (EXDATE), and changes to the series ("move all future meetings to 3 PM") create a tree of exceptions layered on top of the rule. The expansion algorithm must correctly handle monthly-by-day rules on months with fewer days, yearly rules on leap day, and weekly rules that span DST boundaries.

2. **Timezone as a First-Class Concept**: A "9 AM daily standup" must occur at 9 AM wall-clock time in the organizer's timezone, regardless of DST. This means the UTC offset changes twice a year. For a recurring event, each instance may have a different UTC time. For attendees in different timezones, the same event appears at different local times. Storing events as "UTC + original timezone" rather than just UTC is architecturally mandatory.

3. **Free-Busy as a Derived View**: Answering "when is this person available?" requires aggregating events across their primary calendar, shared calendars, and external calendars---applying visibility rules (private events show as "busy" but without details), filtering declined events, and expanding recurring events within the query window. This must resolve in <100ms for scheduling assistants and booking pages.

4. **Meeting Room and Resource Management**: Resources (conference rooms, projectors, vehicles) have their own calendars with capacity constraints. Booking a room is a contended write operation where multiple organizers may attempt to reserve the same room for overlapping times, requiring atomic check-and-reserve semantics.

5. **External Booking (Calendly-Style)**: A public booking link exposes availability windows computed from the host's calendar, availability rules (buffer time, daily limits, working hours), and existing bookings. When a guest selects a slot, the system must atomically verify the slot is still available, create the event, and send confirmations---preventing double-booking under concurrent requests.

---

## Quick Reference: Core Data Structure Options

### Recurring Event Storage

| Approach | Storage | Query Cost | Modification | Best For |
|----------|---------|-----------|--------------|----------|
| **Store rule only** (expand on read) | O(1) per series | O(k) expansion per query window | O(1) rule update | Write-light, read-heavy with narrow query windows |
| **Materialize all instances** | O(n) per series | O(1) per instance lookup | O(n) cascade update | Read-heavy with wide query windows, simple queries |
| **Hybrid** (rule + materialized window) | O(1) + O(w) for window | O(1) for cached window | O(w) re-expand window | Production systems: fast reads, manageable writes |

**Recommendation**: Hybrid approach. Store the RRULE and materialize instances within a rolling window (e.g., 6 months forward). Expand on demand beyond the window. Cache expanded instances aggressively.

### Free-Busy Index

| Approach | Query Speed | Update Cost | Storage | Best For |
|----------|------------|-------------|---------|----------|
| **Compute on demand** | O(n) scan all events | O(1) no index | None | Small calendars, low QPS |
| **Pre-computed bitmap** | O(1) range check | O(1) flip bits | O(slots) per user | High QPS, 15-min granularity |
| **Interval tree** | O(log n + k) overlap query | O(log n) insert | O(n) per user | Variable-length events, flexible granularity |

**Recommendation**: Pre-computed bitmap for the common case (15-minute slots, 2-week lookahead = 1,344 bits per user) with on-demand expansion for longer ranges.

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [2.6 - Distributed Job Scheduler](../2.6-distributed-job-scheduler/) | Timer queue for reminders, scheduled notification delivery |
| [6.6 - Ticketmaster](../6.6-ticketmaster/) | High-contention booking, double-booking prevention |
| [6.7 - Google Meet / Zoom](../6.7-google-meet-zoom/) | Meeting creation from calendar events, video conferencing integration |
| [11.3 - Push Notification System](../11.3-push-notification-system/) | Reminder delivery across mobile and web |
| [6.14 - Customer Support Platform](../6.14-customer-support-platform/) | Scheduling workflows, SLA-based time management |

---

## Sources

- Google Calendar API Documentation --- Recurring Events, Timezone Handling
- Nylas Engineering Blog --- "The Deceptively Complex World of Calendar Events and RRULEs"
- RFC 5545 (iCalendar) --- Recurrence Rule Specification
- CalDAV (RFC 4791) --- Calendar Synchronization Protocol
- Calendly Engineering --- Availability Engine and Booking Architecture
- Industry Statistics: Google Calendar 500M+ users, Microsoft Outlook 400M+ users, Calendly 20M+ users (2025)
- IANA Time Zone Database (tzdata) --- Timezone Rule Management
