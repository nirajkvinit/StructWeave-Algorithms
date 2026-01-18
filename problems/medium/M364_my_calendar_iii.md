---
id: M364
old_id: A199
slug: my-calendar-iii
title: My Calendar III
difficulty: medium
category: medium
topics: ["design", "binary-search"]
patterns: ["sweep-line"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M361", "M363", "M253"]
prerequisites: ["interval-overlap", "sweep-line", "tree-map"]
---
# My Calendar III

## Problem

Build a calendar analytics system that tracks the peak number of simultaneous events. Instead of accepting or rejecting bookings, this system simply records events and reports the maximum overlap count.

A `k`-booking means that `k` events are all active simultaneously at some point in time. For instance, if you have events at `[10, 20)`, `[15, 25)`, and `[17, 30)`, there's a moment around time 17-20 when all three overlap, creating a 3-booking.

You'll receive events one by one as `[startTime, endTime)` intervals (half-open, so the start is included but the end is excluded). After adding each event, you need to report the highest level of overlap that now exists anywhere in your calendar.

Think of this like monitoring a conference center: as rooms get booked, you want to know "what's the maximum number of simultaneous events we'll have at any point?" This tells you how many staff members to schedule or how much capacity you need.

Implement the `MyCalendarThree` class:

- `MyCalendarThree()` - Constructor that initializes the tracking system
- `int book(int startTime, int endTime)` - Records a new event and returns the maximum `k` such that `k` events overlap at some point in time across your entire calendar history

For example, if you book `[10, 20)`, `[50, 60)`, `[10, 40)`, the third booking creates a 2-booking during `[10, 20)`, so you'd return 2. If you then book `[5, 15)`, you now have a 3-booking during `[10, 15)`, so you'd return 3.

## Why This Matters

This problem teaches the sweep line algorithm, a fundamental technique for interval problems. The sweep line pattern appears in computational geometry (finding intersecting line segments), event processing systems (detecting peak loads), and range query problems.

In practice, this exact problem models real scenarios like determining minimum meeting rooms needed for a conference, calculating peak server load to provision capacity, or analyzing concurrent user sessions to size infrastructure. Cloud platforms use similar algorithms to optimize resource allocation.

The sweep line approach you'll learn generalizes to many "at what point does X reach its maximum/minimum" questions. It's also the foundation for more advanced algorithms like plane sweep for geometric problems and timeline-based event processing in stream analytics.

## Constraints

- 0 <= startTime < endTime <= 10⁹
- At most 400 calls will be made to book.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Sweep Line Algorithm</summary>

Think of events as points on a timeline:
- When an event starts at time `t`, increment the active count
- When an event ends at time `t`, decrement the active count

Use a data structure (like a map/dictionary) to track changes:
- Key: time point
- Value: net change in active events (+1 for start, -1 for end)

After adding an event, sweep through all time points in order and track the maximum concurrent count.

</details>

<details>
<summary>Hint 2: Difference Array / Timeline Markers</summary>

Maintain a sorted map of time -> count deltas:
```
timeline = {}
For each event [start, end):
  timeline[start] += 1   # Event begins
  timeline[end] -= 1     # Event ends

To find max k:
  current_active = 0
  max_k = 0
  for time in sorted(timeline.keys()):
    current_active += timeline[time]
    max_k = max(max_k, current_active)
  return max_k
```

This is the classic sweep line algorithm.

</details>

<details>
<summary>Hint 3: Optimized with TreeMap</summary>

Use a balanced tree structure (TreeMap in Java, SortedDict in Python):
1. Store all boundary events (start/end) with their deltas
2. For each `book()` call:
   - Update timeline[start] += 1
   - Update timeline[end] -= 1
   - Sweep through timeline to compute current max k
3. Cache the max k value to avoid recomputation if possible

Time: O(n) per book due to sweep, where n is unique time points.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Sweep line with HashMap | O(n) per book | O(n) | Must sort keys each time; n = number of unique time points |
| Sweep line with TreeMap | O(n) per book | O(n) | Keys already sorted, but still need to sweep all points |
| Segment tree | O(log n) per book | O(n) | More complex but achieves better time complexity |
| Difference array with global max | O(n) per book | O(n) | Same as sweep line, easier to understand |

Where n is the number of unique time points (up to 2 * number of bookings).

## Common Mistakes

**Mistake 1: Not using difference array concept**
```python
# Wrong - tries to track all overlaps explicitly
def book(self, start, end):
    overlaps = []
    for s, e in self.events:
        if start < e and s < end:
            overlaps.append((s, e))
    # Now what? Hard to compute max k from this

# Correct - use sweep line with deltas
self.timeline[start] += 1
self.timeline[end] -= 1
# Then sweep to find max
```

**Mistake 2: Treating end time as inclusive**
```python
# Wrong - interval is half-open [start, end)
self.timeline[start] += 1
self.timeline[end] += 0  # Event is still active at 'end'!

# Correct - decrement at end since [start, end) excludes end
self.timeline[start] += 1
self.timeline[end] -= 1
```

**Mistake 3: Not sweeping through all time points**
```python
# Wrong - only checks the new event's times
max_k = max(self.timeline[start], self.timeline[end])
return max_k  # Doesn't account for cumulative count!

# Correct - sweep through all time points
active = 0
max_k = 0
for time in sorted(self.timeline.keys()):
    active += self.timeline[time]
    max_k = max(max_k, active)
return max_k
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| My Calendar I | Prevent any double booking (k >= 2) | Medium |
| My Calendar II | Prevent triple booking (k >= 3) | Medium |
| Meeting Rooms II | Find minimum rooms needed (same as max k) | Medium |
| Car Pooling | Track capacity constraints with weights | Medium |

## Practice Checklist

- [ ] Solve with sweep line algorithm using HashMap
- [ ] Test with overlapping events at same time point
- [ ] Implement with TreeMap for sorted keys
- [ ] Test edge cases: single event, all events overlap
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Understand why sweep line is optimal here
- [ ] Verify half-open interval handling [start, end)
- [ ] Explain difference between Calendar II and III
