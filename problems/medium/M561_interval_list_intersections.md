---
id: M561
old_id: A453
slug: interval-list-intersections
title: Interval List Intersections
difficulty: medium
category: medium
topics: ["sorting"]
patterns: []
estimated_time_minutes: 30
---
# Interval List Intersections

## Problem

Imagine you're building a meeting scheduler that needs to find time slots where two people are both available. You have two lists of time intervals, where each interval represents a period when someone is free. Your task is to find all the time slots where both people are available simultaneously.

Given two collections of closed intervals `firstList` and `secondList`, where each interval is represented as `[start, end]`. Within each list, the intervals don't overlap with each other and are already sorted in ascending order by their start times.

Return a list containing all the intersection intervals - the time periods that appear in both lists.

A closed interval `[a, b]` includes all values x where `a <= x <= b`. When two intervals overlap, their intersection is also a closed interval. For example, `[1, 3]` and `[2, 4]` intersect at `[2, 3]` because the period from time 2 to time 3 appears in both intervals.


**Diagram:**

```
firstList:  [0--3]       [5-----9]
secondList:    [1----5]     [8--10]
                ↓             ↓
Intersections: [1-3]         [8-9]

Example:
firstList  = [[0,2],[5,10],[13,23],[24,25]]
secondList = [[1,5],[8,12],[15,24],[25,26]]
Output     = [[1,2],[5,5],[8,10],[15,23],[24,24],[25,25]]
```


## Why This Matters

Interval intersection problems appear frequently in real-world scheduling systems. Whether you're building a calendar application that finds meeting times, a resource allocation system that identifies when equipment is available, or a video streaming platform that merges buffered segments, understanding how to efficiently find overlapping time periods is essential. This problem teaches you how to leverage sorted data to solve what would otherwise require comparing every possible pair of intervals - a technique that scales from coordinating a few meetings to managing millions of time-based events in distributed systems.

## Examples

**Example 1:**
- Input: `firstList = [[1,3],[5,9]], secondList = []`
- Output: `[]`
- Explanation: When one list is empty, no intersections are possible.

## Constraints

- 0 <= firstList.length, secondList.length <= 1000
- firstList.length + secondList.length >= 1
- 0 <= starti < endi <= 10⁹
- endi < starti₊₁
- 0 <= startj < endj <= 10⁹
- endj < startj₊₁

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use two pointers, one for each list. At each step, check if the current intervals from both lists intersect. The intersection exists if max(start1, start2) ≤ min(end1, end2). After processing, advance the pointer of the interval that ends earlier.
</details>

<details>
<summary>🎯 Main Approach</summary>
Initialize pointers i=0, j=0 for firstList and secondList. While both are valid: compute intersection using [max(start1, start2), min(end1, end2)]. If this forms a valid interval (start ≤ end), add it to results. Move the pointer whose interval ends earlier, since that interval can't intersect with future intervals in the other list.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The key to efficient pointer movement: if firstList[i] ends before secondList[j], increment i; otherwise increment j. This ensures O(m+n) time since each pointer moves forward at most m or n times respectively, and we never need to backtrack.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(m * n) | O(min(m,n)) | Check all pairs of intervals |
| Optimal (Two Pointers) | O(m + n) | O(min(m,n)) | Each interval examined once; space for output |

## Common Mistakes

1. **Incorrect intersection calculation**
   ```python
   # Wrong: Using wrong formula for intersection
   start = min(a[0], b[0])
   end = max(a[1], b[1])

   # Correct: Intersection is max of starts, min of ends
   start = max(a[0], b[0])
   end = min(a[1], b[1])
   if start <= end:  # Valid intersection
       result.append([start, end])
   ```

2. **Not advancing pointers correctly**
   ```python
   # Wrong: Always advancing both pointers
   i += 1
   j += 1

   # Correct: Advance only the pointer whose interval ends earlier
   if firstList[i][1] < secondList[j][1]:
       i += 1
   else:
       j += 1
   ```

3. **Missing intersection check**
   ```python
   # Wrong: Adding invalid intervals
   result.append([start, end])

   # Correct: Only add when start <= end (valid intersection)
   if start <= end:
       result.append([start, end])
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Merge Intervals | Medium | Merge overlapping intervals in single list |
| Insert Interval | Medium | Insert new interval and merge overlaps |
| Meeting Rooms II | Medium | Count maximum overlapping intervals |
| Employee Free Time | Hard | Find common free time across multiple schedules |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Two Pointers](../../strategies/patterns/two-pointers.md)
