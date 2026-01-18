---
id: M363
old_id: A198
slug: my-calendar-ii
title: My Calendar II
difficulty: medium
category: medium
topics: ["design", "binary-search"]
patterns: ["interval-merge"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M361", "M364", "M056"]
prerequisites: ["interval-overlap", "sweep-line"]
---
# My Calendar II

## Problem

Design a more flexible calendar system that tolerates some overbooking. Unlike a strict calendar that prevents any conflicts, this system allows **double bookings** (two overlapping events) but must prevent **triple bookings** (three overlapping events).

Think of this like managing a restaurant reservation system that can handle some overbooking. Two parties can overlap in time if you have enough tables, but three simultaneous overlapping reservations would exceed capacity.

A **triple booking** happens when three events all share at least one common moment in time. For example, if you have events `[5, 10)`, `[7, 12)`, and `[8, 15)`, they all overlap during the time window `[8, 10)`, creating a triple booking.

Events use half-open intervals `[start, end)` where the start time is included but the end time is excluded. This means `[5, 10)` and `[10, 15)` don't conflict because they share no common moments.

Implement the `MyCalendarTwo` class:

- `MyCalendarTwo()` - Constructor that creates an empty calendar
- `boolean book(int start, int end)` - Attempts to book an event. Returns `true` if it can be added without creating a triple booking. Returns `false` if adding it would cause three events to overlap simultaneously (reject the booking in this case)

The key challenge is efficiently tracking which time periods are single-booked versus double-booked as you add events incrementally.

## Why This Matters

This problem extends basic interval management to handle capacity constraints, a common real-world requirement. Airlines overbook flights, restaurants accept more reservations than tables, and cloud platforms oversell resources, all betting that not everyone will show up simultaneously.

The pattern of tracking overlapping resource allocations appears in operating system scheduling, network bandwidth management, and inventory systems. It teaches you to maintain multiple levels of state (single bookings vs double bookings) and make decisions based on aggregate constraints.

This is also a stepping stone to the "k-booking" problem where you need to track the maximum number of simultaneous events, which models scenarios like finding peak server load or determining minimum conference rooms needed.

## Constraints

- 0 <= start < end <= 10⁹
- At most 1000 calls will be made to book.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Track Single and Double Bookings</summary>

Maintain two separate lists:
1. `bookings` - stores all single bookings (intervals that are booked at least once)
2. `double_bookings` - stores intervals where exactly two bookings overlap

For a new booking `[start, end)`:
- Check if it overlaps with any interval in `double_bookings`. If yes, return False (would create triple booking)
- If no triple booking, check overlaps with `bookings` and add the overlapping parts to `double_bookings`
- Add the new booking to `bookings`

</details>

<details>
<summary>Hint 2: Computing Interval Intersections</summary>

When two intervals `[s1, e1)` and `[s2, e2)` overlap, their intersection is:
- Start: `max(s1, s2)`
- End: `min(e1, e2)`

This intersection represents the time period where both events are active simultaneously.

Algorithm:
```
For new booking [start, end):
  1. For each existing double booking [ds, de):
       If overlaps, return False
  2. For each existing booking [bs, be):
       If overlaps:
         Add [max(start, bs), min(end, be)) to double_bookings
  3. Add [start, end) to bookings
  4. Return True
```

</details>

<details>
<summary>Hint 3: Sweep Line Alternative</summary>

Use a timeline approach with event markers:
1. Store all events as (time, delta) pairs where:
   - (start, +1) means an event starts
   - (end, -1) means an event ends
2. Sort all events by time
3. Sweep through timeline tracking active event count
4. If count ever reaches 3, reject the booking

This approach is more complex but generalizes to Calendar III.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Two lists (bookings + doubles) | O(n²) | O(n) | For each booking, check all previous bookings; doubles can grow |
| Sweep line | O(n log n) per book | O(n) | Sort events each time; better for multiple queries |
| Segment tree | O(log n) per book | O(n) | Overkill for this problem but achieves best time |

Where n is the number of successfully booked events.

## Common Mistakes

**Mistake 1: Not tracking double bookings separately**
```python
# Wrong - only tracks single bookings
def book(self, start, end):
    count = 0
    for s, e in self.bookings:
        if start < e and s < end:
            count += 1
            if count >= 2:  # Too late! Need to know before adding
                return False
    self.bookings.append((start, end))
    return True

# Correct - maintain separate double bookings list
# Check doubles first, then update both lists
```

**Mistake 2: Incorrect intersection calculation**
```python
# Wrong - doesn't compute intersection correctly
if start < e and s < end:
    self.doubles.append((start, end))  # Wrong boundaries!

# Correct - compute actual intersection
if start < e and s < end:
    overlap_start = max(start, s)
    overlap_end = min(end, e)
    self.doubles.append((overlap_start, overlap_end))
```

**Mistake 3: Adding to bookings before validating**
```python
# Wrong - modifies state before validation complete
self.bookings.append((start, end))
for s, e in self.bookings:
    if overlaps with double:
        return False  # Already added!

# Correct - validate first, then add
for ds, de in self.doubles:
    if start < de and ds < end:
        return False
# Only add after validation passes
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| My Calendar I | Prevent any double booking | Medium |
| My Calendar III | Track maximum k-booking (any overlap count) | Medium |
| Meeting Rooms II | Find minimum number of meeting rooms needed | Medium |
| Interval List Intersections | Find all intersections between two lists | Medium |

## Practice Checklist

- [ ] Solve with two-list approach (bookings + double bookings)
- [ ] Test edge cases: adjacent intervals, complete overlaps
- [ ] Implement intersection calculation correctly
- [ ] Test with sequence that creates many double bookings
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Implement sweep line approach for comparison
- [ ] Verify half-open interval semantics [start, end)
- [ ] Explain difference between Calendar I and Calendar II
