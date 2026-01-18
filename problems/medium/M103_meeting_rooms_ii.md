---
id: M103
old_id: I053
slug: meeting-rooms-ii
title: Meeting Rooms II
difficulty: medium
category: medium
topics: ["array", "heap", "sorting"]
patterns: ["interval-scheduling", "greedy"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E252", "M056", "M253"]
prerequisites: ["sorting", "heap", "greedy-algorithms"]
---
# Meeting Rooms II

## Problem

Imagine you're managing a conference center where multiple meetings happen throughout the day. Each meeting has a start time and an end time, given as an array of intervals like `[[0,30],[5,10],[15,20]]`. Your job is to determine the minimum number of meeting rooms needed so that no two overlapping meetings are assigned to the same room. For instance, if one meeting runs from 0 to 30 and another from 5 to 10, they overlap, so you need at least 2 rooms. The tricky part is that you can't just count overlapping pairs because you might have three meetings all overlapping at once, requiring three rooms. You need to find the maximum number of simultaneous meetings happening at any point in time. Think about what happens at each start and end time, and how tracking these events chronologically could help. Edge cases include meetings that end exactly when another starts (which can share a room), single meetings (needing just one room), and clusters of heavily overlapping meetings.

## Why This Matters

This is the quintessential resource allocation problem used everywhere from cloud computing to real-world scheduling. AWS and Google Cloud use variants of this algorithm to determine how many virtual machine instances are needed to handle fluctuating workloads throughout the day. Hospital operating room schedulers employ this exact logic to minimize the number of rooms needed while maximizing utilization. Airport gate assignment systems use it to allocate gates to arriving and departing flights. Even your calendar application uses this concept to warn you about double-booking conflicts. The min-heap technique you'll learn here is fundamental to event-driven systems, job schedulers, and any scenario where you need to manage limited resources efficiently over time. Understanding interval scheduling problems is crucial for system design interviews and real-world capacity planning.

## Examples

**Example 1:**
- Input: `intervals = [[0,30],[5,10],[15,20]]`
- Output: `2`

**Example 2:**
- Input: `intervals = [[7,10],[2,4]]`
- Output: `1`

## Constraints

- 1 <= intervals.length <= 10⁴
- 0 <= starti < endi <= 10⁶

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Critical Time Points</summary>

Think about the problem from a time-based perspective. At any given moment, how many meetings are happening? The answer is the maximum number of concurrent meetings. What happens at meeting start times vs. end times?

</details>

<details>
<summary>🎯 Hint 2: Min-Heap for Tracking Rooms</summary>

Sort meetings by start time. As you process each meeting, track when currently occupied rooms become free using a min-heap of end times. If the earliest ending meeting finishes before the current meeting starts, you can reuse that room. Otherwise, allocate a new room.

</details>

<details>
<summary>📝 Hint 3: Algorithm Design</summary>

Pseudocode approach:
```
# Approach 1: Min-Heap
sort intervals by start time
min_heap = []  # stores end times of ongoing meetings

for meeting in intervals:
    # Check if earliest ending meeting is done
    if min_heap and min_heap[0] <= meeting.start:
        heappop(min_heap)  # Room becomes available

    heappush(min_heap, meeting.end)  # Occupy room

return len(min_heap)  # Max concurrent meetings

# Approach 2: Chronological Events
starts = sorted([interval[0] for interval in intervals])
ends = sorted([interval[1] for interval in intervals])

rooms = 0
max_rooms = 0
start_ptr = 0
end_ptr = 0

while start_ptr < len(starts):
    if starts[start_ptr] < ends[end_ptr]:
        rooms += 1
        max_rooms = max(max_rooms, rooms)
        start_ptr += 1
    else:
        rooms -= 1
        end_ptr += 1

return max_rooms
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check each pair for overlap |
| Chronological Events | O(n log n) | O(n) | Two sorted arrays, two pointers |
| **Min-Heap** | **O(n log n)** | **O(n)** | Sort + heap operations, cleaner logic |

Where n is the number of meetings.

## Common Mistakes

**Mistake 1: Not sorting intervals first**
```python
# Wrong: Processing intervals in arbitrary order
import heapq

def min_meeting_rooms(intervals):
    heap = []
    for start, end in intervals:
        if heap and heap[0] <= start:
            heapq.heappop(heap)
        heapq.heappush(heap, end)
    return len(heap)
```

```python
# Correct: Sort by start time first
import heapq

def min_meeting_rooms(intervals):
    intervals.sort(key=lambda x: x[0])  # Sort by start time
    heap = []
    for start, end in intervals:
        if heap and heap[0] <= start:
            heapq.heappop(heap)
        heapq.heappush(heap, end)
    return len(heap)
```

**Mistake 2: Comparing with wrong heap value**
```python
# Wrong: Compares start time with end time incorrectly
if heap and heap[0] < start:  # Should be <=
    heapq.heappop(heap)
```

```python
# Correct: A meeting ending at time T frees room for meeting starting at T
if heap and heap[0] <= start:
    heapq.heappop(heap)
```

**Mistake 3: Returning wrong value with chronological approach**
```python
# Wrong: Returns current rooms instead of maximum
def min_meeting_rooms(intervals):
    starts = sorted([i[0] for i in intervals])
    ends = sorted([i[1] for i in intervals])
    rooms = 0
    s, e = 0, 0

    while s < len(starts):
        if starts[s] < ends[e]:
            rooms += 1
            s += 1
        else:
            rooms -= 1
            e += 1

    return rooms  # Wrong! Should track maximum
```

```python
# Correct: Track and return maximum rooms needed
def min_meeting_rooms(intervals):
    starts = sorted([i[0] for i in intervals])
    ends = sorted([i[1] for i in intervals])
    rooms = 0
    max_rooms = 0
    s, e = 0, 0

    while s < len(starts):
        if starts[s] < ends[e]:
            rooms += 1
            max_rooms = max(max_rooms, rooms)
            s += 1
        else:
            rooms -= 1
            e += 1

    return max_rooms
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Meeting Rooms I | Check if person can attend all meetings | Easy |
| Merge Intervals | Merge overlapping intervals | Medium |
| Employee Free Time | Find common free time slots | Hard |
| My Calendar II | Allow at most k overlapping bookings | Medium |
| Maximum CPU Load | Find maximum simultaneous tasks | Medium |

## Practice Checklist

- [ ] Initial attempt (Day 0)
- [ ] Reviewed both approaches (heap and chronological) (Day 0)
- [ ] Implemented min-heap solution (Day 0)
- [ ] First spaced repetition (Day 1)
- [ ] Second spaced repetition (Day 3)
- [ ] Third spaced repetition (Day 7)
- [ ] Fourth spaced repetition (Day 14)
- [ ] Can explain why sorting is necessary (Day 14)
- [ ] Can code without references (Day 30)
- [ ] Interview-ready confidence (Day 30)

**Strategy**: Sort intervals by start time, then use min-heap to track room availability by monitoring earliest ending meetings.
