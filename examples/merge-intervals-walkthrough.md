---
title: Merge Intervals - Complete Walkthrough
type: worked-example
problem_id: M017
patterns: ["merge-intervals", "sorting"]
estimated_time: 30
difficulty: medium
topics: ["array", "interval", "sorting"]
---

# Merge Intervals - Complete Walkthrough

## Overview

This walkthrough demonstrates how to solve the Merge Intervals problem using sorting and a greedy approach. This is a fundamental pattern that appears in scheduling, calendar systems, and resource management.

**Problem Statement:** Given a collection of intervals, merge all overlapping intervals and return an array of non-overlapping intervals that cover all the original intervals.

**Learning Goals:**
- Understand when sorting simplifies a problem
- Master the interval merging pattern
- Learn greedy algorithms
- Develop intuition for overlap detection
- Handle edge cases systematically

---

## Understanding the Problem

### What Does "Merge" Mean?

Two intervals overlap if they share any common point. When they overlap, we combine them into a single larger interval.

**Visual examples:**

```
Overlapping intervals:
[1,3] and [2,6]
|------|         [1,3]
    |---------|  [2,6]
|-----------|    merged: [1,6]

Touching intervals (still merge):
[1,4] and [4,5]
|--------|       [1,4]
        |---|    [4,5]
|-----------|    merged: [1,5]

Non-overlapping (don't merge):
[1,3] and [5,7]
|---|            [1,3]
        |---|    [5,7]
|---|   |---|    separate: [1,3], [5,7]
```

### Key Observations

**Observation 1:** Two intervals [a,b] and [c,d] overlap if:
- `c <= b` (second start is before or at first end)
- Assuming a <= c (sorted by start time)

**Observation 2:** When merging [a,b] and [c,d]:
- New start: `min(a, c)` (if sorted, just `a`)
- New end: `max(b, d)` (take the farther endpoint)

**Observation 3:** Multiple intervals can merge into one:
```
[1,3], [2,5], [4,8]
All overlap → merge into [1,8]
```

---

## Initial Thinking Process

### Brute Force Approach

**Idea:** Compare every interval with every other interval

```
Algorithm:
1. For each interval i:
2.   For each interval j:
3.     If i and j overlap:
4.       Merge them
5.       Remove both, add merged
6.       Repeat from start

Problems:
- Time: O(n²) comparisons minimum
- Modifying list while iterating is complex
- Need to keep checking until no more merges
- Could be O(n³) with re-checking
```

**Example showing complexity:**
```
[1,3], [2,5], [4,7], [6,9]

Round 1: Merge [1,3] and [2,5] → [1,5]
  Now: [1,5], [4,7], [6,9]

Round 2: Merge [1,5] and [4,7] → [1,7]
  Now: [1,7], [6,9]

Round 3: Merge [1,7] and [6,9] → [1,9]
  Now: [1,9]

Needed 3 passes! Very inefficient.
```

### The Sorting Insight

**Question:** What if we sort intervals first?

**Key insight:**
```
Unsorted: [8,10], [1,3], [15,18], [2,6]
- Must compare [1,3] with [8,10] (far apart)
- Must compare [2,6] with [15,18] (far apart)
- Many useless comparisons

Sorted: [1,3], [2,6], [8,10], [15,18]
- Only need to compare adjacent or nearby intervals
- Once we pass an interval, we never look back
- Can process in single pass!
```

**Why this works:**

After sorting by start time:
- If interval `i` overlaps with interval `j` (where j > i), then `i` might also overlap with `i+1, i+2, ..., j-1`
- We can greedily merge as we go
- Never need to look backwards

---

## The Optimal Algorithm

### High-Level Strategy

```
1. Sort intervals by start time
2. Initialize result with first interval
3. For each remaining interval:
   - If it overlaps with last merged interval:
     * Extend the last merged interval's end
   - Else:
     * Add it as a new separate interval
4. Return result
```

### Overlap Detection

Given sorted intervals where `current.start >= last.start`:

```python
# Two cases:

# Case 1: Overlap or touching
if current.start <= last.end:
    # Example: last=[1,5], current=[3,7]
    # 3 <= 5 → overlap
    # Merge: [1, max(5,7)] = [1,7]

# Case 2: No overlap
else:
    # Example: last=[1,5], current=[7,10]
    # 7 > 5 → gap between them
    # Keep separate: [1,5] and [7,10]
```

**Why `<=` not `<`?**
```
Touching intervals should merge:
last=[1,4], current=[4,5]
4 <= 4 → True → merge to [1,5] ✓

If we used <:
4 < 4 → False → keep separate ✗ WRONG
```

### Merging Logic

When intervals overlap:
```python
# DON'T do this:
last.end = current.end  # WRONG: might shrink interval

# Example showing problem:
last = [1,10], current = [2,5]
last.end = 5  # Shrunk from [1,10] to [1,5]!

# CORRECT:
last.end = max(last.end, current.end)
# max(10, 5) = 10 → stays [1,10] ✓
```

---

## Complete Implementation

### Code with Detailed Comments

```python
def merge(intervals):
    """
    Merge overlapping intervals

    Time: O(n log n) - dominated by sorting
    Space: O(n) - result array
    """
    # Edge case: empty input
    if not intervals:
        return []

    # Step 1: Sort by start time
    # This is the key optimization!
    intervals.sort(key=lambda x: x[0])

    # Step 2: Initialize result with first interval
    merged = [intervals[0]]

    # Step 3: Process remaining intervals
    for current in intervals[1:]:
        last = merged[-1]  # Last merged interval

        # Check for overlap
        if current[0] <= last[1]:
            # Overlapping: extend the end time
            last[1] = max(last[1], current[1])
        else:
            # Non-overlapping: add as new interval
            merged.append(current)

    return merged
```

### Line-by-Line Explanation

```python
if not intervals:
    return []
```
- Handle empty input edge case
- Return empty list immediately
- Prevents errors in subsequent code

```python
intervals.sort(key=lambda x: x[0])
```
- Sort by start time (first element of each interval)
- Python's sort is stable and O(n log n)
- This is the crucial step that enables single-pass merging
- Example: `[[8,10], [1,3], [2,6]]` → `[[1,3], [2,6], [8,10]]`

```python
merged = [intervals[0]]
```
- Initialize result list with first interval
- We'll compare all others against this
- First interval can't overlap with anything before it (nothing exists)

```python
for current in intervals[1:]:
```
- Iterate through intervals starting from second one
- `intervals[1:]` skips first interval (already in merged)
- Process each interval exactly once

```python
last = merged[-1]
```
- Get the last interval in merged list
- `merged[-1]` is Python syntax for last element
- This is the interval we'll compare against

```python
if current[0] <= last[1]:
```
- Check if current interval's start <= last interval's end
- If true: they overlap or touch
- Example: current=[3,7], last=[1,5]: 3 <= 5 → True

```python
last[1] = max(last[1], current[1])
```
- Extend last interval to cover current interval
- Use max() to handle nested intervals
- Modifies last interval in-place
- Example: last=[1,5], current=[3,7]: end becomes max(5,7)=7

```python
else:
    merged.append(current)
```
- No overlap: current is a separate interval
- Add it to result list
- It becomes the new "last" for future comparisons

```python
return merged
```
- Return list of merged intervals
- Contains only non-overlapping intervals

---

## Detailed Trace Through Examples

### Example 1: Basic Overlapping

**Input:** `intervals = [[1,3], [2,6], [8,10], [15,18]]`

**Step 0: Sort** (already sorted)
```
[[1,3], [2,6], [8,10], [15,18]]
```

**Step 1: Initialize**
```
merged = [[1,3]]

Timeline:
|---|              [1,3]
```

**Step 2: Process [2,6]**
```
current = [2,6]
last = [1,3]

Check: 2 <= 3? YES → overlap
Action: last[1] = max(3, 6) = 6

merged = [[1,6]]

Timeline:
|---------|        [1,6]
```

**Step 3: Process [8,10]**
```
current = [8,10]
last = [1,6]

Check: 8 <= 6? NO → no overlap
Action: append [8,10]

merged = [[1,6], [8,10]]

Timeline:
|---------|  |---|
   [1,6]    [8,10]
```

**Step 4: Process [15,18]**
```
current = [15,18]
last = [8,10]

Check: 15 <= 10? NO → no overlap
Action: append [15,18]

merged = [[1,6], [8,10], [15,18]]

Timeline:
|---------|  |---|    |-----|
   [1,6]    [8,10]    [15,18]

Final result: [[1,6], [8,10], [15,18]]
```

### Example 2: Touching Intervals

**Input:** `intervals = [[1,4], [4,5]]`

**After sort:** `[[1,4], [4,5]]` (already sorted)

```
Step 1: merged = [[1,4]]

Step 2: Process [4,5]
  current = [4,5]
  last = [1,4]

  Check: 4 <= 4? YES → touching counts as overlap!
  Action: last[1] = max(4, 5) = 5

  merged = [[1,5]]

Timeline:
|--------|       [1,4]
        |---|    [4,5]
|-----------|    merged: [1,5]

Final result: [[1,5]]
```

### Example 3: Nested Intervals

**Input:** `intervals = [[1,10], [2,3], [4,5], [6,7]]`

**After sort:** (already sorted)

```
Step 1: merged = [[1,10]]

Step 2: Process [2,3]
  current = [2,3]
  last = [1,10]

  Check: 2 <= 10? YES → overlap (nested inside)
  Action: last[1] = max(10, 3) = 10 (no change!)

  merged = [[1,10]]

Step 3: Process [4,5]
  current = [4,5]
  last = [1,10]

  Check: 4 <= 10? YES → overlap (nested inside)
  Action: last[1] = max(10, 5) = 10 (no change!)

  merged = [[1,10]]

Step 4: Process [6,7]
  current = [6,7]
  last = [1,10]

  Check: 6 <= 10? YES → overlap (nested inside)
  Action: last[1] = max(10, 7) = 10 (no change!)

  merged = [[1,10]]

Timeline:
|------------------|    [1,10]
  |---|                [2,3] - nested
      |---|            [4,5] - nested
          |---|        [6,7] - nested

Final result: [[1,10]]
All smaller intervals absorbed into larger one!
```

### Example 4: Unsorted Input

**Input:** `intervals = [[2,6], [15,18], [1,3], [8,10]]`

**Step 0: Sort**
```
Before: [[2,6], [15,18], [1,3], [8,10]]
After:  [[1,3], [2,6], [8,10], [15,18]]

This is why sorting is crucial!
```

**Then proceed as in Example 1:**
```
merged = [[1,3]]
Process [2,6]: merge → [[1,6]]
Process [8,10]: append → [[1,6], [8,10]]
Process [15,18]: append → [[1,6], [8,10], [15,18]]

Final result: [[1,6], [8,10], [15,18]]
```

### Example 5: All Overlapping

**Input:** `intervals = [[1,3], [2,4], [3,5], [4,6]]`

**After sort:** (already sorted)

```
Step 1: merged = [[1,3]]

Step 2: Process [2,4]
  2 <= 3? YES → last[1] = max(3,4) = 4
  merged = [[1,4]]

Step 3: Process [3,5]
  3 <= 4? YES → last[1] = max(4,5) = 5
  merged = [[1,5]]

Step 4: Process [4,6]
  4 <= 5? YES → last[1] = max(5,6) = 6
  merged = [[1,6]]

Timeline:
|---|              [1,3]
  |---|            [2,4]
    |---|          [3,5]
      |---|        [4,6]
|---------|        merged: [1,6]

Final result: [[1,6]]
Chain of overlaps merges into single interval!
```

---

## Edge Cases and Common Mistakes

### Edge Case 1: Empty Array

```python
intervals = []

Result: []

# Our code handles this:
if not intervals:
    return []  # Returns immediately
```

### Edge Case 2: Single Interval

```python
intervals = [[1,5]]

After sort: [[1,5]]
merged = [[1,5]]
Loop doesn't execute (no more intervals)

Result: [[1,5]]
```

### Edge Case 3: No Overlaps

```python
intervals = [[1,2], [3,4], [5,6]]

merged = [[1,2]]
Process [3,4]: 3 > 2 → append → [[1,2], [3,4]]
Process [5,6]: 5 > 4 → append → [[1,2], [3,4], [5,6]]

Result: [[1,2], [3,4], [5,6]]
No merging occurs, just sorted
```

### Mistake 1: Forgetting to Sort

**Wrong code:**
```python
def merge(intervals):
    merged = [intervals[0]]
    for current in intervals[1:]:
        # Process without sorting first
        # ...
```

**Problem:**
```
Input: [[2,6], [1,3], [8,10]]

Without sorting:
merged = [[2,6]]
Process [1,3]: 1 <= 6? YES (but logically wrong!)
  Would try to merge [2,6] and [1,3]
  Result: [[1,6]]  (missed this earlier interval!)
Process [8,10]: 8 > 6? YES
  Result: [[1,6], [8,10]]

Looks correct by accident, but fails for:
[[3,5], [1,4]]

Without sorting:
merged = [[3,5]]
Process [1,4]: 1 <= 5? YES
  Merge: [min(3,1), max(5,4)] = [1,5]

Correct, but only by using min() which we don't in our algorithm!
With our algorithm (assumes sorted):
  merged = [[3,5]]
  Process [1,4]: 1 <= 5? YES
  last[1] = max(5,4) = 5
  Result: [[3,5]]  WRONG! Lost [1,4]'s earlier start!
```

**Fix:** Always sort first!

### Mistake 2: Wrong Overlap Condition

**Wrong code:**
```python
if current[0] < last[1]:  # Using < instead of <=
    merge()
```

**Problem:**
```
Input: [[1,4], [4,5]]

Check: 4 < 4? NO
Action: Don't merge
Result: [[1,4], [4,5]]

But touching intervals should merge!
Correct result: [[1,5]]
```

**Fix:** Use `<=` for overlap check

### Mistake 3: Not Using max() for End

**Wrong code:**
```python
if current[0] <= last[1]:
    last[1] = current[1]  # WRONG: doesn't use max()
```

**Problem:**
```
Input: [[1,10], [2,5]]

Process [2,5]:
  2 <= 10? YES
  last[1] = 5  # Shrinks interval!
  Result: [[1,5]]

Correct result: [[1,10]]
The bigger interval should absorb the smaller one!
```

**Fix:** Use `max(last[1], current[1])`

### Mistake 4: Modifying Input During Iteration

**Wrong code:**
```python
for i in range(len(intervals)):
    for j in range(i+1, len(intervals)):
        if overlap:
            intervals.remove(intervals[j])  # Modifying during iteration!
```

**Problem:**
- Removing elements while iterating breaks loop
- Indices become invalid
- Very hard to debug

**Fix:** Build new result list

### Mistake 5: Assuming Sorted Input

**Wrong assumption:**
```python
# Assuming input is already sorted
merged = [intervals[0]]
# ...
```

**Problem:** Problem statement doesn't guarantee sorted input!

**Fix:** Always sort, or explicitly check if it's already sorted

---

## Complexity Analysis

### Time Complexity: O(n log n)

**Breakdown:**
```
1. Sorting: O(n log n)
   - Python's Timsort
   - Dominant operation

2. Single pass merge: O(n)
   - Visit each interval once
   - Each comparison: O(1)
   - Each merge: O(1)

Total: O(n log n + n) = O(n log n)
```

**Can we do better?**
- Not in general case (comparison-based sorting lower bound)
- If intervals are already sorted: O(n)
- If limited range, could use counting sort: O(n + k)

### Space Complexity: O(n)

**Breakdown:**
```
1. Sorting space: O(log n) to O(n)
   - Depends on sorting algorithm
   - Timsort: O(n) worst case

2. Result array: O(n)
   - Worst case: no overlaps
   - All n intervals in result

3. Total: O(n)
```

**Best case space:** O(1)
```
If we modify input in-place:
- Sort in-place
- Merge in-place
- Return view of input
But this is uncommon and destructive
```

**Worst case space:** O(n)
```
No overlaps, all intervals in result:
[[1,2], [3,4], [5,6], ..., [2n-1, 2n]]
Result has n intervals
```

---

## Variations and Extensions

### Variation 1: Insert Interval

**Problem:** Insert a new interval into sorted, non-overlapping intervals

```python
def insert(intervals, new_interval):
    """
    Insert new_interval into sorted intervals

    Example:
      intervals = [[1,3], [6,9]]
      new_interval = [2,5]
      Result: [[1,5], [6,9]]
    """
    result = []
    i = 0
    n = len(intervals)

    # Phase 1: Add all intervals before new_interval
    while i < n and intervals[i][1] < new_interval[0]:
        result.append(intervals[i])
        i += 1

    # Phase 2: Merge overlapping intervals
    while i < n and intervals[i][0] <= new_interval[1]:
        new_interval[0] = min(new_interval[0], intervals[i][0])
        new_interval[1] = max(new_interval[1], intervals[i][1])
        i += 1
    result.append(new_interval)

    # Phase 3: Add remaining intervals
    while i < n:
        result.append(intervals[i])
        i += 1

    return result
```

### Variation 2: Remove Covered Intervals

**Problem:** Remove intervals completely covered by others

```python
def remove_covered(intervals):
    """
    Remove intervals covered by others

    Example:
      [[1,10], [2,5], [6,8]]
      → [[1,10]]  (others covered by [1,10])
    """
    intervals.sort(key=lambda x: (x[0], -x[1]))
    result = []

    max_end = 0
    for interval in intervals:
        # If current end extends beyond max_end, it's not covered
        if interval[1] > max_end:
            result.append(interval)
            max_end = interval[1]

    return result
```

### Variation 3: Interval List Intersections

**Problem:** Find intersections of two interval lists

```python
def interval_intersection(list1, list2):
    """
    Find intersections of two sorted interval lists

    Example:
      list1 = [[0,2], [5,10]]
      list2 = [[1,5], [8,12]]
      Result: [[1,2], [5,5], [8,10]]
    """
    result = []
    i, j = 0, 0

    while i < len(list1) and j < len(list2):
        # Find intersection
        start = max(list1[i][0], list2[j][0])
        end = min(list1[i][1], list2[j][1])

        if start <= end:
            result.append([start, end])

        # Move pointer of interval that ends first
        if list1[i][1] < list2[j][1]:
            i += 1
        else:
            j += 1

    return result
```

### Variation 4: Count Overlapping Intervals

**Problem:** Find maximum number of overlapping intervals at any time

```python
def max_overlapping(intervals):
    """
    Find max simultaneous overlaps (meeting rooms needed)

    Example:
      [[0,30], [5,10], [15,20]]
      → 2 (at time 15-20, two meetings overlap)
    """
    events = []

    # Create events: (time, type)
    # Start: +1, End: -1
    for start, end in intervals:
        events.append((start, 1))   # Meeting starts
        events.append((end, -1))     # Meeting ends

    events.sort()

    max_overlap = 0
    current_overlap = 0

    for time, delta in events:
        current_overlap += delta
        max_overlap = max(max_overlap, current_overlap)

    return max_overlap
```

---

## Interview Talking Points

### How to Explain the Solution (2-minute version)

> "The key insight is to sort intervals by start time first. This transforms a complex problem into a simple one-pass solution.
>
> After sorting, I only need to compare each interval with the last merged interval. If they overlap - meaning the current start is less than or equal to the last end - I extend the last interval to cover both. Otherwise, I add the current interval as a new separate interval.
>
> The greedy approach works because sorting guarantees I process intervals left-to-right. I never need to look backwards - if current doesn't overlap with the last merged, it won't overlap with any earlier intervals either.
>
> Time complexity is O(n log n) from sorting, space is O(n) for the result array."

### Questions to Ask Before Coding

1. "Can the input be empty?" → Yes, return empty array
2. "Are the intervals already sorted?" → No, assume unsorted
3. "Can I modify the input array?" → Usually yes, but ask
4. "Should touching intervals merge (e.g., [1,3] and [3,5])?" → Yes
5. "Can intervals have the same start time?" → Yes
6. "Are the intervals guaranteed to be valid (start <= end)?" → Usually yes

### Common Follow-Up Questions

**Q: Can you do it without sorting?**

A: "Theoretically yes, but it would be O(n²) - comparing every pair. Sorting at O(n log n) and single-pass merging at O(n) gives us O(n log n) total, which is optimal for comparison-based approaches."

**Q: What if intervals are already sorted?**

A: "Then we skip the sort step and have O(n) time complexity. We could add a check to see if the array is sorted, but that's O(n) anyway, so we might as well just sort."

**Q: How would you handle the 'insert interval' variation?**

A: "With sorted intervals, I'd use a three-phase approach: add all intervals before the new one, merge overlapping intervals with the new one, then add all intervals after. This is O(n) since no sorting is needed."

**Q: What if you need to merge millions of intervals?**

A: "For distributed systems, I'd partition by time ranges and merge each partition separately, then merge the partition results. For streaming data, I'd use a sweep line algorithm that processes events as they arrive."

---

## Practice Exercises

### Exercise 1: Code from Scratch
Close this walkthrough and implement merge intervals without looking. Time limit: 10 minutes.

### Exercise 2: Edge Cases
Test your solution with:
- `[]` (empty)
- `[[1,5]]` (single interval)
- `[[1,2], [3,4], [5,6]]` (no overlaps)
- `[[1,10], [2,3], [4,5]]` (nested)
- `[[1,4], [4,5]]` (touching)
- `[[2,6], [1,3]]` (unsorted)

### Exercise 3: Trace on Paper
Trace through `[[1,4], [2,5], [3,6], [8,10]]` step by step.

### Exercise 4: Implement Variations
Try implementing the "insert interval" variation without looking at the solution.

### Exercise 5: Related Problems
- Can you find intervals that DON'T overlap with any others?
- Can you merge three interval lists simultaneously?

---

## Summary

### Key Takeaways

1. **Sorting simplifies:** Many problems become trivial after sorting the input appropriately

2. **Greedy works:** With sorted intervals, greedy merging is optimal - never need to backtrack

3. **Use max() for merging:** When extending intervals, use max() to handle nested intervals correctly

4. **Touching counts as overlapping:** Use `<=` not `<` for overlap detection

5. **Single-pass after sort:** After sorting, one pass through the array suffices

### Algorithm Pattern

```
For interval merging problems:
1. Sort by start time (or relevant dimension)
2. Initialize with first element
3. For each remaining element:
   - If overlaps with last merged: extend
   - Else: add as new
4. Return result
```

### Complexity Reference

| Operation | Time | Space |
|-----------|------|-------|
| Sort intervals | O(n log n) | O(log n) to O(n) |
| Merge pass | O(n) | O(1) |
| Result array | - | O(n) |
| **Total** | **O(n log n)** | **O(n)** |

### Pattern Recognition

Use interval merging pattern when you see:
- Scheduling problems (merge meeting times)
- Calendar systems (find free time)
- Resource allocation (merge usage periods)
- Range queries (merge overlapping ranges)
- Timeline analysis (consolidate events)

### Real-World Applications

- **Calendar apps**: Merging overlapping meetings to show busy times
- **Video editing**: Merging overlapping clips
- **Network monitoring**: Consolidating activity periods
- **Database queries**: Optimizing range scans
- **Memory management**: Coalescing free memory blocks

### Next Steps

1. Solve M018 (Insert Interval) - no sorting needed
2. Solve M113 (Interval List Intersections) - two-pointer variation
3. Practice meeting rooms problems
4. Study sweep line algorithm for event-based problems

---

**Remember:** The interval merging pattern is fundamental in computer science. Mastering this problem gives you tools for scheduling, resource management, and timeline analysis - skills that apply far beyond coding interviews. The sort-then-merge pattern appears in databases, operating systems, and distributed systems everywhere.
