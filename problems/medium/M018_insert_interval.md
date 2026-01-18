---
id: M018
old_id: F057
slug: insert-interval
title: Insert Interval
difficulty: medium
category: medium
topics: ["array", "interval"]
patterns: ["merge-intervals"]
estimated_time_minutes: 30
frequency: very-high
related_problems: ["M017", "M113", "E088"]
prerequisites: ["array-basics", "merge-intervals"]
strategy_ref: ../strategies/patterns/merge-intervals.md
---
# Insert Interval

## Problem

You have a sorted list of non-overlapping intervals, and you need to insert a new interval while maintaining the sorted, non-overlapping property. If the new interval overlaps with existing ones, merge them into a single consolidated interval.

The crucial advantage here is that the input is already sorted and non-overlapping, unlike the general merge intervals problem. This means you can solve it in one linear pass without any sorting. The key insight is recognizing three distinct phases: intervals that come entirely before the new one (copy them as-is), intervals that overlap with the new one (merge them all together), and intervals that come entirely after (copy them as-is).

For example, inserting [4,8] into [[1,2], [3,5], [6,7], [8,10], [12,16]] would merge [3,5], [6,7], and [8,10] into [3,10], leaving [[1,2], [3,10], [12,16]].

The overlapping check is simple: an interval overlaps with the new interval if its start is less than or equal to the new interval's end. Once you stop finding overlaps, you're done merging—no need to check further intervals.

```
Example visualization:
Existing: [1,2]    [3,5]       [6,7]   [8,10]     [12,16]
New:                  [4,8]
Result:   [1,2]    [3,10]               [12,16]
                   (merged 3 intervals)
```

## Why This Matters

This problem demonstrates the value of exploiting sorted input. While general interval merging requires O(n log n) time due to sorting, this variant achieves O(n) because sorting is already done. It's a lesson in recognizing when problem constraints enable simpler algorithms.

**Real-world applications:**
- **Calendar scheduling**: Inserting a new meeting into a sorted schedule and auto-merging conflicts
- **Database indexing**: Adding a new key range to a B-tree node and merging adjacent ranges
- **Memory allocators**: Inserting a freed memory block and coalescing with adjacent free blocks
- **File systems**: Merging contiguous disk block allocations for defragmentation
- **Network packet scheduling**: Inserting a new transmission window into a priority queue
- **Time-series databases**: Adding new data ranges and consolidating overlapping time windows
- **Version control systems**: Inserting new code change ranges into conflict detection

Interviewers use this to see if you can recognize problem structure (the three-phase pattern), avoid unnecessary work (no need to sort!), and handle edge cases (new interval before all, after all, or covering all existing intervals). The comparison to the general merge problem tests whether you adapt your approach based on constraints.

## Examples

**Example 1:**
- Input: `intervals = [[1,3],[6,9]], newInterval = [2,5]`
- Output: `[[1,5],[6,9]]`

**Example 2:**
- Input: `intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]`
- Output: `[[1,2],[3,10],[12,16]]`
- Explanation: Because the new interval [4,8] overlaps with [3,5],[6,7],[8,10].

## Constraints

- 0 <= intervals.length <= 10⁴
- intervals[i].length == 2
- 0 <= starti <= endi <= 10⁵
- intervals is sorted by starti in **ascending** order.
- newInterval.length == 2
- 0 <= start <= end <= 10⁵

## Think About

1. Since intervals are already sorted and non-overlapping, can you process them in a single pass?
2. What are the three distinct phases when inserting an interval?
3. How do you know when the new interval has been fully merged?
4. Can you solve this without sorting (unlike M017)?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Exploit the sorted property</summary>

Unlike general interval merging, the input is **already sorted and non-overlapping**. This is a huge advantage!

**Think about:**
```
Existing: [1,2]    [3,5]    [6,7]    [8,10]    [12,16]
New:                          [4,8]
```

When processing left-to-right:
- Some intervals come **completely before** the new one: [1,2]
- Some intervals **overlap/merge** with the new one: [3,5], [6,7], [8,10]
- Some intervals come **completely after** the new one: [12,16]

**Key insight:** You can identify these three groups in a single left-to-right scan!

**Questions to consider:**
- How do you determine if an interval is "before" the new interval?
- How do you know when to stop merging?
- Do you need to sort anything?

</details>

<details>
<summary>🎯 Hint 2: Three-phase algorithm</summary>

The algorithm has three distinct phases:

**Phase 1: Add intervals that come before**
```
Condition: interval.end < newInterval.start
Action: Copy interval to result as-is
```

**Phase 2: Merge overlapping intervals**
```
Condition: interval.start <= newInterval.end
Action: Expand newInterval to cover this interval
  newInterval.start = min(newInterval.start, interval.start)
  newInterval.end = max(newInterval.end, interval.end)
Continue until no more overlaps
```

**Phase 3: Add remaining intervals**
```
Condition: interval.start > newInterval.end
Action: Add merged newInterval to result (once!)
        Copy remaining intervals to result
```

**Critical detail:** The merged interval is added exactly once, at the boundary between phase 2 and phase 3.

**Example trace:**
```
intervals = [[1,2], [3,5], [6,7], [8,10], [12,16]]
newInterval = [4,8]

Phase 1: [1,2] → 2 < 4 ✓ add to result
         [3,5] → 5 < 4? NO, move to phase 2

Phase 2: [3,5] → 3 <= 8 ✓ merge: new = [3,8]
         [6,7] → 6 <= 8 ✓ merge: new = [3,8]
         [8,10] → 8 <= 8 ✓ merge: new = [3,10]
         [12,16] → 12 <= 10? NO, move to phase 3

Phase 3: Add [3,10] to result
         Add [12,16] to result

Result: [[1,2], [3,10], [12,16]]
```

</details>

<details>
<summary>📝 Hint 3: Clean implementation</summary>

```
function insert(intervals, newInterval):
    result = []
    i = 0
    n = intervals.length

    # Phase 1: Add all intervals ending before newInterval starts
    while i < n and intervals[i].end < newInterval.start:
        result.append(intervals[i])
        i += 1

    # Phase 2: Merge all overlapping intervals
    while i < n and intervals[i].start <= newInterval.end:
        # Expand newInterval to cover current interval
        newInterval.start = min(newInterval.start, intervals[i].start)
        newInterval.end = max(newInterval.end, intervals[i].end)
        i += 1

    # Add the merged interval
    result.append(newInterval)

    # Phase 3: Add remaining intervals
    while i < n:
        result.append(intervals[i])
        i += 1

    return result
```

**Why this works:**
- Single pass: O(n) time
- No sorting needed (already sorted)
- Each interval processed exactly once
- Clear phase transitions

**Edge cases handled:**
- Empty input: goes straight to phase 3, returns [newInterval]
- No overlaps: phase 2 skips, newInterval inserted in correct position
- newInterval covers all: phases 1 and 3 might be empty
- newInterval is smallest: phase 1 empty
- newInterval is largest: phase 3 empty

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **Three-phase scan** | **O(n)** | **O(n)** | Optimal, linear time |
| Insert + re-merge all | O(n log n) | O(n) | Wastes sorted property |
| Binary search + merge | O(n) | O(n) | Same complexity, more complex |

**Why three-phase wins:**
- Leverages sorted input: no sorting needed
- Single pass: each interval examined once
- Simple logic: three clear phases

**Space breakdown:**
- Result array: O(n) worst case (no merges)
- Variables: O(1)
- Total: O(n)

**Could we do it in-place?**
- Theoretically yes, but complex due to merging
- Would need to shift elements, potentially O(n²)
- Better to use O(n) space for clean O(n) time

---

## Common Mistakes

### 1. Sorting the input
```python
# WRONG: Unnecessary and destroys O(n) time
intervals.sort()  # Already sorted! Don't do this
intervals.append(newInterval)
intervals.sort()  # Now O(n log n)
```

### 2. Wrong overlap condition
```python
# WRONG: Misses edge-touching intervals
while i < n and intervals[i].start < newInterval.end:  # Should be <=
    merge()

# Example: [[1,5]], newInterval=[5,6]
# Wrong: [[1,5], [5,6]]  (not merged)
# Correct: [[1,6]]
```

### 3. Adding merged interval multiple times
```python
# WRONG: Adds newInterval inside loop
while i < n and intervals[i].start <= newInterval.end:
    merge()
    result.append(newInterval)  # Wrong! Adds multiple times
    i += 1

# CORRECT: Add once after loop
while i < n and intervals[i].start <= newInterval.end:
    merge()
    i += 1
result.append(newInterval)  # Once only
```

### 4. Wrong merge logic
```python
# WRONG: Overwrites instead of expanding
newInterval = intervals[i]  # Loses original newInterval!

# CORRECT: Expand to cover both
newInterval.start = min(newInterval.start, intervals[i].start)
newInterval.end = max(newInterval.end, intervals[i].end)
```

### 5. Not handling empty intervals
```python
# WRONG: Assumes non-empty
result.append(intervals[0])  # Crashes if empty

# CORRECT: Handle empty input
if not intervals:
    return [newInterval]
```

### 6. Wrong phase 1 condition
```python
# WRONG: Misses intervals ending exactly at newInterval.start
while i < n and intervals[i].end <= newInterval.start:
    result.append(intervals[i])
    i += 1

# Example: [[1,3]], newInterval=[3,5]
# This would merge (correct: [[1,5]])
# But [1,2], [3,5] should NOT merge

# CORRECT: Use < not <=
while i < n and intervals[i].end < newInterval.start:
    result.append(intervals[i])
    i += 1
```

---

## Visual Walkthrough

```
Input: intervals = [[1,2], [3,5], [6,7], [8,10], [12,16]]
       newInterval = [4,8]

Initial state:
Existing: |--|    |---|    |---|    |---|    |----|
          [1,2]   [3,5]   [6,7]   [8,10]  [12,16]
New:                 [4,8]


Phase 1: Process intervals ending before newInterval
i=0: [1,2].end=2 < 4? YES → add to result
result = [[1,2]]
i=1

|--|
[1,2]


i=1: [3,5].end=5 < 4? NO → end phase 1


Phase 2: Merge overlapping intervals
i=1: [3,5].start=3 <= 8? YES → merge
  newInterval = [min(4,3), max(8,5)] = [3,8]
  i=2

i=2: [6,7].start=6 <= 8? YES → merge
  newInterval = [min(3,6), max(8,7)] = [3,8]
  i=3

i=3: [8,10].start=8 <= 8? YES → merge
  newInterval = [min(3,8), max(8,10)] = [3,10]
  i=4

i=4: [12,16].start=12 <= 10? NO → end phase 2

Merged interval: [3,10]
        |--------|
        [3,10]


Phase 2 complete: Add merged interval
result = [[1,2], [3,10]]


Phase 3: Add remaining intervals
i=4: [12,16] → add to result
result = [[1,2], [3,10], [12,16]]
i=5

Final:
|--|    |--------|         |----|
[1,2]   [3,10]            [12,16]
```

**Edge case: newInterval covers all**
```
Input: intervals = [[2,3], [4,5], [6,7]]
       newInterval = [1,10]

Phase 1: [2,3].end=3 < 1? NO → skip phase 1

Phase 2:
  [2,3]: merge → [1,10]
  [4,5]: merge → [1,10]
  [6,7]: merge → [1,10]

Phase 3: No remaining intervals

Result: [[1,10]]
```

**Edge case: No overlaps**
```
Input: intervals = [[1,2], [6,7]]
       newInterval = [3,5]

Phase 1: [1,2].end=2 < 3? YES → add
result = [[1,2]]

Phase 2: [6,7].start=6 <= 5? NO → skip

Add newInterval: result = [[1,2], [3,5]]

Phase 3: [6,7] → add
result = [[1,2], [3,5], [6,7]]
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Merge intervals (M017)** | No pre-sorted input | Sort first, then merge |
| **Remove interval** | Delete interval instead of insert | Track gaps created |
| **Insert multiple intervals** | Insert array of intervals | Process each with three-phase |
| **Count overlaps at point** | Find how many intervals cover x | Sort endpoints, sweep line |
| **Find max concurrent** | Max overlapping intervals | Sort by start, use heap |
| **Interval intersection** | Find common parts of intervals | Two-pointer merge |

**Remove interval variation:**
```python
def removeInterval(intervals, toRemove):
    result = []
    for interval in intervals:
        # No overlap: keep interval
        if interval.end <= toRemove.start or interval.start >= toRemove.end:
            result.append(interval)
        else:
            # Partial overlap: keep non-overlapping parts
            if interval.start < toRemove.start:
                result.append([interval.start, toRemove.start])
            if interval.end > toRemove.end:
                result.append([toRemove.end, interval.end])
    return result
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles empty intervals array
- [ ] Handles newInterval with no overlaps
- [ ] Handles newInterval covering all intervals
- [ ] Handles newInterval completely before all
- [ ] Handles newInterval completely after all
- [ ] Handles touching intervals (e.g., [1,3] and [3,5])
- [ ] Handles partial overlaps

**Code Quality:**
- [ ] Uses three clear phases
- [ ] Single pass (no sorting)
- [ ] Correct overlap conditions (<=)
- [ ] Expands newInterval with min/max
- [ ] Adds merged interval exactly once
- [ ] Clean variable names

**Interview Readiness:**
- [ ] Can explain three-phase approach (2 minutes)
- [ ] Can code solution in 8-10 minutes
- [ ] Can trace through edge cases
- [ ] Can explain why no sorting needed
- [ ] Can compare to M017 merge intervals

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve merge intervals (M017) for comparison
- [ ] Day 14: Implement remove interval variation
- [ ] Day 30: Quick review + explain difference from M017

---

**Strategy**: See [Merge Intervals Pattern](../../strategies/patterns/merge-intervals.md)
