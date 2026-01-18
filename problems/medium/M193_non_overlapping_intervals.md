---
id: M193
old_id: I234
slug: non-overlapping-intervals
title: Non-overlapping Intervals
difficulty: medium
category: medium
topics: ["array", "interval"]
patterns: ["merge-intervals"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M056", "M252", "M435"]
prerequisites: ["sorting", "greedy-algorithm", "interval-problems"]
---
# Non-overlapping Intervals

## Problem

You have a collection of time intervals represented as `intervals` where each `intervals[i] = [starti, endi]` denotes a time period from `starti` to `endi`. Think of these as meeting bookings, server reservation windows, or task schedules. Your goal is to determine the smallest number of intervals that must be removed so that none of the remaining intervals overlap with each other.

Two intervals overlap if they share any moment in time, meaning one starts before the other ends. For instance, `[1,3]` and `[2,4]` overlap because they both include the time period from 2 to 3. However, intervals that touch at exactly one point like `[1,2]` and `[2,3]` are considered non-overlapping since they share only a boundary. Edge cases to consider include completely identical intervals (which definitely overlap), nested intervals where one fully contains another, and intervals that are already non-overlapping requiring zero removals.

## Why This Matters

This problem models the classic activity selection problem used in conference room scheduling, job scheduling on machines, and task prioritization in operating systems. When Google Calendar or Outlook detects scheduling conflicts, it uses algorithms similar to this to suggest which meetings to reschedule. Manufacturing plants use this technique to schedule production runs on shared equipment, minimizing downtime by carefully selecting which jobs to delay. The greedy strategy you'll develop always keeping the interval that ends earliest maximizes space for future activities is foundational to optimization theory and proves why certain local decisions lead to globally optimal solutions. Streaming services like Netflix use interval scheduling to allocate server capacity for different shows, data backup systems use it to schedule non-overlapping backup windows across time zones, and network routers apply it to packet scheduling. Understanding when greedy algorithms work (and proving correctness) versus when you need dynamic programming is a crucial skill for system design interviews and real-world resource allocation problems.

## Examples

**Example 1:**
- Input: `intervals = [[1,2],[2,3],[3,4],[1,3]]`
- Output: `1`
- Explanation: Removing [1,3] leaves all remaining intervals non-overlapping.

**Example 2:**
- Input: `intervals = [[1,2],[1,2],[1,2]]`
- Output: `2`
- Explanation: Two [1,2] intervals must be deleted to eliminate all overlaps.

**Example 3:**
- Input: `intervals = [[1,2],[2,3]]`
- Output: `0`
- Explanation: No removals are necessary as the intervals already don't overlap.

## Constraints

- 1 <= intervals.length <= 10⁵
- intervals[i].length == 2
- -5 * 10⁴ <= starti < endi <= 5 * 10⁴

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual Understanding</summary>
This is a greedy algorithm problem. The key insight is that if you always keep the interval that ends earliest, you maximize the space for future intervals. Think of it as the "activity selection" problem - you want to fit as many non-overlapping intervals as possible, then the answer is total intervals minus maximum non-overlapping.
</details>

<details>
<summary>🎯 Hint 2: Sorting Strategy</summary>
Sort intervals by their end times. Then iterate through sorted intervals, keeping track of the last interval that was kept. If the current interval's start is >= last kept interval's end, it doesn't overlap - keep it. Otherwise, skip it (count as removed). This greedy choice guarantees the minimum removals.
</details>

<details>
<summary>📝 Hint 3: Greedy Algorithm</summary>
```
1. Sort intervals by end time (ascending)
2. Initialize: removed_count = 0, last_end = intervals[0].end
3. For each interval from index 1 to n-1:
   - If interval.start >= last_end:
     - No overlap, update last_end = interval.end
   - Else:
     - Overlap detected, increment removed_count
4. Return removed_count
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy (sort by end) | O(n log n) | O(1) or O(n) | Sorting dominates, space for sort |
| Greedy (sort by start) | O(n²) worst case | O(1) | Wrong approach, may need backtracking |
| DP with sorting | O(n²) | O(n) | Overkill, finds max non-overlapping set |
| Brute force | O(2^n) | O(n) | Try all subsets, infeasible |

**Recommended approach**: Greedy with sort by end time.

## Common Mistakes

**Mistake 1: Sorting by start time instead of end time**
```python
# Wrong: Sorting by start doesn't guarantee optimal solution
def eraseOverlapIntervals(intervals):
    intervals.sort(key=lambda x: x[0])  # Sort by start
    removed = 0
    last_end = intervals[0][1]

    for i in range(1, len(intervals)):
        if intervals[i][0] < last_end:
            removed += 1
            # Which one to remove? No clear greedy choice
            last_end = min(last_end, intervals[i][1])
        else:
            last_end = intervals[i][1]

    return removed
```

```python
# Correct: Sort by end time for greedy optimality
def eraseOverlapIntervals(intervals):
    intervals.sort(key=lambda x: x[1])  # Sort by end
    removed = 0
    last_end = intervals[0][1]

    for i in range(1, len(intervals)):
        if intervals[i][0] < last_end:  # Overlap
            removed += 1
        else:  # No overlap
            last_end = intervals[i][1]

    return removed
```

**Mistake 2: Wrong overlap condition**
```python
# Wrong: Considers touching intervals as overlapping
def eraseOverlapIntervals(intervals):
    intervals.sort(key=lambda x: x[1])
    removed = 0
    last_end = intervals[0][1]

    for i in range(1, len(intervals)):
        if intervals[i][0] <= last_end:  # Wrong: allows [1,2],[2,3]
            removed += 1
        else:
            last_end = intervals[i][1]

    return removed
```

```python
# Correct: Intervals touching at boundary are non-overlapping
def eraseOverlapIntervals(intervals):
    intervals.sort(key=lambda x: x[1])
    removed = 0
    last_end = intervals[0][1]

    for i in range(1, len(intervals)):
        if intervals[i][0] < last_end:  # Strict inequality
            removed += 1
        else:
            last_end = intervals[i][1]

    return removed
```

**Mistake 3: Not updating last_end when keeping interval**
```python
# Wrong: Keeps comparing against first interval's end
def eraseOverlapIntervals(intervals):
    intervals.sort(key=lambda x: x[1])
    removed = 0
    last_end = intervals[0][1]

    for i in range(1, len(intervals)):
        if intervals[i][0] < last_end:
            removed += 1
        # Missing: else: last_end = intervals[i][1]

    return removed
```

```python
# Correct: Updates last_end when interval is kept
def eraseOverlapIntervals(intervals):
    intervals.sort(key=lambda x: x[1])
    removed = 0
    last_end = intervals[0][1]

    for i in range(1, len(intervals)):
        if intervals[i][0] < last_end:
            removed += 1
        else:
            last_end = intervals[i][1]  # Update for next comparison

    return removed
```

## Variations

| Variation | Difference | Key Insight |
|-----------|-----------|-------------|
| Merge Intervals | Combine overlapping intervals | Sort by start, merge consecutive overlaps |
| Meeting Rooms II | Minimum rooms needed | Count max overlaps at any point (sweep line) |
| Maximum Non-overlapping | Return max count, not removals | Same algorithm, return n - removed |
| Weighted Intervals | Each has a value/weight | DP approach, can't use greedy |
| Circular Intervals | Intervals can wrap around | Handle wrap-around cases separately |

## Practice Checklist

Use spaced repetition to master this problem:

- [ ] Day 1: Solve using greedy approach with end time sort
- [ ] Day 2: Solve related problem (Meeting Rooms II)
- [ ] Day 4: Implement without looking at notes
- [ ] Day 7: Solve and explain why greedy works (proof)
- [ ] Day 14: Solve variations (weighted intervals with DP)
- [ ] Day 30: Speed test - solve in under 8 minutes
