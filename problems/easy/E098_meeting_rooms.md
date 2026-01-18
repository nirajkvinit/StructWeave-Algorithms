---
id: E098
old_id: I052
slug: meeting-rooms
title: Meeting Rooms
difficulty: easy
category: easy
topics: ["array", "sorting"]
patterns: ["sorting"]
estimated_time_minutes: 15
frequency: high
related_problems: ["M056", "M253", "H759"]
prerequisites: ["sorting", "intervals"]
strategy_ref: ../strategies/patterns/intervals.md
---
# Meeting Rooms

## Problem

You have a list of meeting time intervals, where each interval is represented as a pair [start, end]. A person needs to attend all these meetings, but can only be in one meeting at a time. Determine whether it's possible to attend all meetings without any scheduling conflicts.

Two meetings conflict if they overlap in time. For example, a meeting from 0 to 30 conflicts with a meeting from 5 to 10 because they share the time period from 5 to 10. However, a meeting ending at 5 and another starting at 5 do not conflict - you can finish one meeting and immediately start the next.

The key insight is that if you process meetings in chronological order (sorted by start time), you only need to check whether each meeting starts before the previous one ends. If meetings are sorted, any overlap will appear as consecutive intervals in the sorted list. This reduces what could be an O(n²) problem of checking all pairs to an O(n) scan after sorting.

An important edge case: adjacent meetings (where one ends exactly when another begins) are allowed. A person can finish a meeting at time 5 and start another at time 5. Make sure your overlap check uses strict inequality, not less-than-or-equal.

## Why This Matters

Interval scheduling is a fundamental problem in computer science with applications throughout software systems. Calendar applications need to detect scheduling conflicts, operating systems must allocate CPU time slots without overlaps, and meeting room management systems solve this exact problem at scale.

This problem teaches the power of preprocessing with sorting. Many interval problems become dramatically simpler once intervals are sorted. The pattern of "sort then scan" appears in merge intervals, insert intervals, and interval partitioning problems. Understanding when and how to sort is crucial for algorithm design.

The problem also demonstrates how the right data representation matters. By representing meetings as intervals and recognizing that overlap detection simplifies after sorting, you transform a complex problem into a straightforward one. This insight extends to computational geometry, range queries, and timeline-based algorithms.

This is a high-frequency interview question, often used as a warmup before harder interval problems like "Meeting Rooms II" (find minimum rooms needed) or "Merge Intervals." It's also a practical problem you might encounter in real systems: scheduling engines, resource allocation systems, and calendar APIs all solve variations of this problem.

## Examples

**Example 1:**
- Input: `intervals = [[0,30],[5,10],[15,20]]`
- Output: `false`

**Example 2:**
- Input: `intervals = [[7,10],[2,4]]`
- Output: `true`

## Constraints

- 0 <= intervals.length <= 10⁴
- intervals[i].length == 2
- 0 <= starti < endi <= 10⁶

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Visualize the Timeline</summary>

Imagine plotting all intervals on a timeline. Two meetings conflict if one starts before another ends. The key insight: if we process meetings in chronological order (sorted by start time), we only need to check if each meeting starts before the previous one ends.

</details>

<details>
<summary>🎯 Hint 2: Sort by Start Time</summary>

Sort the intervals by their start times. Once sorted, you only need to compare consecutive intervals. If interval[i].start < interval[i-1].end, there's an overlap. This reduces the problem from O(n²) comparisons to O(n) comparisons after O(n log n) sorting.

</details>

<details>
<summary>📝 Hint 3: Linear Scan After Sorting</summary>

Pseudocode approach:
1. Sort intervals by start time
2. For i from 1 to n-1:
   - If intervals[i].start < intervals[i-1].end:
     - Return false (overlap detected)
3. Return true (no overlaps)

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Check All Pairs) | O(n²) | O(1) | Compare every interval with every other |
| **Optimal (Sort + Scan)** | **O(n log n)** | **O(1)** | Sorting dominates; in-place possible |
| With Extra Space | O(n log n) | O(n) | If creating sorted copy |

## Common Mistakes

### Mistake 1: Checking Wrong Boundary Condition

```python
# WRONG: Using <= instead of < for overlap check
def canAttendMeetings(intervals):
    intervals.sort()
    for i in range(1, len(intervals)):
        if intervals[i][0] <= intervals[i-1][1]:  # Bug: adjacent meetings OK
            return False
    return True
# [[0,5],[5,10]] returns False, should be True (no overlap at boundary)
```

```python
# CORRECT: Meetings can be adjacent (end time = next start time)
def canAttendMeetings(intervals):
    intervals.sort()
    for i in range(1, len(intervals)):
        if intervals[i][0] < intervals[i-1][1]:  # Strict overlap only
            return False
    return True
# [[0,5],[5,10]] correctly returns True
```

### Mistake 2: Forgetting to Sort

```python
# WRONG: Checking consecutive elements without sorting
def canAttendMeetings(intervals):
    for i in range(1, len(intervals)):
        if intervals[i][0] < intervals[i-1][1]:
            return False
    return True
# [[7,10],[2,4]] incorrectly returns True (didn't detect overlap)
```

```python
# CORRECT: Sort first, then check
def canAttendMeetings(intervals):
    intervals.sort()  # Critical step
    for i in range(1, len(intervals)):
        if intervals[i][0] < intervals[i-1][1]:
            return False
    return True
# [[7,10],[2,4]] correctly returns True after sorting to [[2,4],[7,10]]
```

### Mistake 3: Empty Array Edge Case

```python
# WRONG: Not handling empty input
def canAttendMeetings(intervals):
    intervals.sort()
    for i in range(1, len(intervals)):  # Works but inefficient for empty
        if intervals[i][0] < intervals[i-1][1]:
            return False
    return True
```

```python
# CORRECT: Early return for trivial cases
def canAttendMeetings(intervals):
    if len(intervals) <= 1:
        return True  # 0 or 1 meeting always works
    intervals.sort()
    for i in range(1, len(intervals)):
        if intervals[i][0] < intervals[i-1][1]:
            return False
    return True
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Meeting Rooms II | Medium | Find minimum number of rooms needed |
| Merge Intervals | Medium | Combine overlapping intervals |
| Non-overlapping Intervals | Medium | Remove minimum intervals to avoid overlap |
| Employee Free Time | Hard | Find common free time across schedules |

## Practice Checklist

- [ ] Day 1: Solve with sorting (15 min)
- [ ] Day 2: Handle edge cases (empty, single interval) (10 min)
- [ ] Day 7: Solve again, optimize in-place (10 min)
- [ ] Day 14: Explain why sorting works (5 min)
- [ ] Day 30: Code from memory (5 min)

**Strategy**: See [Intervals Pattern](../strategies/patterns/intervals.md)
