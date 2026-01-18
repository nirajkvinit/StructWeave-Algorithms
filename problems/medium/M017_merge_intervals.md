---
id: M017
old_id: F056
slug: merge-intervals
title: Merge Intervals
difficulty: medium
category: medium
topics: ["array", "interval"]
patterns: ["merge-intervals"]
estimated_time_minutes: 30
frequency: very-high
related_problems: ["M018", "M113", "E088"]
prerequisites: ["array-basics", "sorting"]
strategy_ref: ../strategies/patterns/merge-intervals.md
---
# Merge Intervals

## Problem

Given a list of intervals (each represented as [start, end]), merge any overlapping intervals and return the consolidated list. Two intervals overlap if they share any point in common. Importantly, intervals that "touch" (like [1,4] and [4,5]) are also considered overlapping and should be merged into [1,5].

The input arrives unsorted, which is a critical detail: intervals like [[8,10], [1,3], [2,6]] are jumbled. The first key insight is recognizing that sorting by start time makes the problem dramatically easier. Once sorted, you only need to compare each interval with the most recently merged one (not all previous intervals), enabling a single-pass greedy algorithm.

The merging decision is simple: if the current interval's start is less than or equal to the last merged interval's end, they overlap. Extend the merged interval's end to cover both. If there's no overlap, the current interval starts a new merged interval.

```
Visual example:
[1,3] and [2,6]:
|------|         [1,3]
    |---------|  [2,6]
|-----------|    merged: [1,6]

[1,4] and [4,5]:
|--------|       [1,4]
        |---|    [4,5]
|-----------|    merged: [1,5] (touching counts as overlapping)
```

## Why This Matters

Interval problems are ubiquitous in systems programming, scheduling, and data processing. This specific pattern (sort + greedy merge) appears so frequently that recognizing it immediately is a valuable skill. The sorting step is counterintuitive to beginners who try to merge on-the-fly, leading to O(n²) comparisons.

**Real-world applications:**
- **Calendar systems**: Finding free time slots by merging all busy periods (Google Calendar, Outlook)
- **Database query optimization**: Merging index range scans to reduce disk seeks
- **Resource allocation**: Consolidating overlapping room/equipment reservations
- **Version control**: Merging overlapping code change ranges in diff algorithms
- **Genomic sequencing**: Identifying overlapping DNA sequence fragments for assembly
- **Network monitoring**: Aggregating overlapping time windows of high traffic
- **Video processing**: Merging overlapping clip timestamps in editing software
- **Financial analysis**: Consolidating overlapping trading windows for compliance

This problem is interview gold because it tests multiple skills: recognizing that sorting simplifies the problem, implementing a greedy algorithm correctly, handling edge cases (touching intervals, nested intervals, empty input), and achieving optimal O(n log n) time complexity. It's also a gateway to harder variants like inserting an interval into a sorted list.

## Examples

**Example 1:**
- Input: `intervals = [[1,3],[2,6],[8,10],[15,18]]`
- Output: `[[1,6],[8,10],[15,18]]`
- Explanation: Since intervals [1,3] and [2,6] overlap, merge them into [1,6].

**Example 2:**
- Input: `intervals = [[1,4],[4,5]]`
- Output: `[[1,5]]`
- Explanation: Intervals [1,4] and [4,5] are considered overlapping.

## Constraints

- 1 <= intervals.length <= 10⁴
- intervals[i].length == 2
- 0 <= starti <= endi <= 10⁴

## Think About

1. What happens to the problem if intervals are sorted by start time?
2. How do you determine if two intervals overlap?
3. When should you start a new merged interval vs. extending the current one?
4. What edge cases exist (empty array, single interval, all overlapping, none overlapping)?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Why sorting matters</summary>

Imagine trying to merge intervals without any order:
```
[[8,10], [1,3], [15,18], [2,6]]
```

You'd need to compare each interval with every other one - O(n²) comparisons!

**Key insight:** What if you sorted by start time first?
```
[[1,3], [2,6], [8,10], [15,18]]
```

**Think about:**
- If intervals are sorted by start time, can an interval at index `i` ever overlap with an interval at index `j` where `j < i-1`?
- Once you've processed intervals 0 to i, do you need to look back at them again?
- What invariant does sorting give you?

</details>

<details>
<summary>🎯 Hint 2: The greedy merge strategy</summary>

After sorting, you can use a **greedy single-pass algorithm**.

**Key insight:** Once sorted by start time, you only need to compare each interval with the **last merged interval**.

Two cases when comparing `current_interval` with `last_merged`:
1. **No overlap**: `current.start > last_merged.end`
   - Add current to result as-is
2. **Overlap or touch**: `current.start <= last_merged.end`
   - Extend `last_merged.end` to `max(last_merged.end, current.end)`

**Why this works:**
- Sorting ensures you process intervals left-to-right
- You can't "miss" an overlap with earlier intervals
- Greedy choice (always merge when possible) is optimal

**Example:**
```
After sorting: [[1,3], [2,6], [8,10]]
Start: merged = [[1,3]]

Process [2,6]:
  2 <= 3? YES → overlap
  merged = [[1, max(3,6)]] = [[1,6]]

Process [8,10]:
  8 <= 6? NO → no overlap
  merged = [[1,6], [8,10]]
```

</details>

<details>
<summary>📝 Hint 3: Detailed algorithm</summary>

```
function mergeIntervals(intervals):
    if intervals is empty:
        return []

    # Step 1: Sort by start time
    sort intervals by interval[0]

    # Step 2: Initialize result with first interval
    merged = [intervals[0]]

    # Step 3: Process remaining intervals
    for i from 1 to intervals.length - 1:
        current = intervals[i]
        last_merged = merged[last index]

        if current.start <= last_merged.end:
            # Overlapping or touching - merge
            last_merged.end = max(last_merged.end, current.end)
        else:
            # No overlap - add as new interval
            merged.append(current)

    return merged
```

**Implementation details:**
- You can modify the last interval in-place: `merged[-1][1] = max(...)`
- Or use a separate variable to track the current interval being built
- Don't forget: `[1,4]` and `[4,5]` should merge (touching counts as overlap)

**Edge cases to handle:**
- Empty input: return `[]`
- Single interval: return as-is
- All intervals overlap: return single merged interval
- No intervals overlap: return sorted intervals

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **Sort + single pass** | **O(n log n)** | **O(n)** | Optimal for general case |
| Brute force (compare all pairs) | O(n²) | O(n) | Too slow, no benefits |
| Graph-based (intervals as nodes) | O(n² + E) | O(n²) | Overcomplicated |

**Why sort + greedy wins:**
- Sorting dominates time: O(n log n)
- Single pass merge: O(n)
- Total: O(n log n + n) = O(n log n)

**Space breakdown:**
- Sorting: O(n) or O(log n) depending on algorithm
- Result array: O(n) in worst case (no overlaps)
- Total: O(n)

**Can we do better than O(n log n)?**
- Not in general case (sorting lower bound)
- If intervals are already sorted: O(n) time
- If intervals have limited range: could use counting sort

---

## Common Mistakes

### 1. Forgetting to sort first
```python
# WRONG: Processing unsorted intervals
def merge(intervals):
    merged = [intervals[0]]
    for i in range(1, len(intervals)):
        # This fails when intervals are out of order!
        if intervals[i][0] <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], intervals[i][1])
        else:
            merged.append(intervals[i])
    return merged

# Input: [[2,6], [1,3], [8,10]]
# Wrong output: [[2,6], [8,10]]  (missed [1,3])
# Correct: [[1,6], [8,10]]
```

### 2. Wrong overlap condition
```python
# WRONG: Missing touching intervals
if current[0] < last[1]:  # Should be <=
    merge()

# Example: [[1,4], [4,5]]
# Wrong: [[1,4], [4,5]]  (not merged)
# Correct: [[1,5]]

# WRONG: Using wrong end comparison
if current[0] <= last[0]:  # Should compare with last[1]
    merge()
```

### 3. Not updating end correctly
```python
# WRONG: Only extends to current end
last[1] = current[1]

# Example: [[1,5], [2,3]] → [[1,3]] (shrinks!)
# Correct: last[1] = max(last[1], current[1]) → [[1,5]]
```

### 4. Modifying input during iteration
```python
# DANGEROUS: Modifying list while iterating
for interval in intervals:
    if overlaps:
        intervals.remove(interval)  # Iterator breaks!

# CORRECT: Build new result list
merged = []
for interval in intervals:
    # ... build merged list separately
```

### 5. Edge case failures
```python
# WRONG: Crashes on empty input
merged = [intervals[0]]  # IndexError if intervals = []

# WRONG: Doesn't handle single interval
if len(intervals) < 2:
    return intervals  # Good practice!

# WRONG: Assumes intervals are well-formed
# What if interval[0] > interval[1]? Validate first!
```

---

## Visual Walkthrough

```
Input: [[1,3], [2,6], [8,10], [15,18]]

Step 0: Sort by start time (already sorted)
[[1,3], [2,6], [8,10], [15,18]]

Step 1: Initialize with first interval
merged = [[1,3]]

Visual:
|------|                    [1,3]


Step 2: Process [2,6]
current = [2,6]
last_merged = [1,3]

Check: 2 <= 3? YES → overlap
Merge: [1, max(3,6)] = [1,6]

merged = [[1,6]]

Visual:
|------------|              [1,6]


Step 3: Process [8,10]
current = [8,10]
last_merged = [1,6]

Check: 8 <= 6? NO → no overlap
Add new interval

merged = [[1,6], [8,10]]

Visual:
|------------|   |-----|    [1,6], [8,10]


Step 4: Process [15,18]
current = [15,18]
last_merged = [8,10]

Check: 15 <= 10? NO → no overlap
Add new interval

merged = [[1,6], [8,10], [15,18]]

Visual:
|------------|   |-----|        |-----|
     [1,6]        [8,10]        [15,18]

Final result: [[1,6], [8,10], [15,18]]
```

**Complex example with nested intervals:**
```
Input: [[1,10], [2,3], [4,5], [6,9], [11,15]]

After sort (already sorted):
[[1,10], [2,3], [4,5], [6,9], [11,15]]

Process:
1. merged = [[1,10]]
2. [2,3]: 2 <= 10? YES → [1, max(10,3)] = [1,10]
3. [4,5]: 4 <= 10? YES → [1, max(10,5)] = [1,10]
4. [6,9]: 6 <= 10? YES → [1, max(10,9)] = [1,10]
5. [11,15]: 11 <= 10? NO → add [11,15]

Result: [[1,10], [11,15]]

Visual:
|-------------------|          [1,10]
    |---|                      [2,3] merged
        |---|                  [4,5] merged
            |-----|            [6,9] merged
                       |-----|  [11,15] separate
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Insert interval** | Add one interval to sorted list | Three-phase: before, merge, after |
| **Count overlaps** | Return max simultaneous intervals | Sweep line algorithm |
| **Remove covered intervals** | Remove fully contained intervals | Track max_end during merge |
| **Interval list intersections** | Merge two sorted lists | Two-pointer technique |
| **Employee free time** | Find gaps in schedules | Merge all, then find gaps |
| **Meeting rooms II** | Min rooms needed | Sort by start, use heap |

**Insert interval example:**
```python
def insert(intervals, newInterval):
    result = []
    i = 0
    n = len(intervals)

    # Phase 1: Add all intervals before newInterval
    while i < n and intervals[i][1] < newInterval[0]:
        result.append(intervals[i])
        i += 1

    # Phase 2: Merge overlapping intervals
    while i < n and intervals[i][0] <= newInterval[1]:
        newInterval[0] = min(newInterval[0], intervals[i][0])
        newInterval[1] = max(newInterval[1], intervals[i][1])
        i += 1
    result.append(newInterval)

    # Phase 3: Add remaining intervals
    while i < n:
        result.append(intervals[i])
        i += 1

    return result
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles empty array
- [ ] Handles single interval
- [ ] Handles all overlapping intervals
- [ ] Handles no overlapping intervals
- [ ] Handles touching intervals (e.g., [1,2] and [2,3])
- [ ] Handles nested intervals (e.g., [1,10] contains [2,3])
- [ ] Handles unsorted input correctly

**Code Quality:**
- [ ] Sorts intervals first
- [ ] Correct overlap condition (<=, not <)
- [ ] Uses max() for end extension
- [ ] Handles edge cases explicitly
- [ ] Clean, readable variable names

**Interview Readiness:**
- [ ] Can explain why sorting is necessary (2 minutes)
- [ ] Can code solution in 8-10 minutes
- [ ] Can trace through complex example
- [ ] Can discuss time/space complexity
- [ ] Can handle insert interval variation

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve insert interval variation (M018)
- [ ] Day 14: Implement meeting rooms II variation
- [ ] Day 30: Quick review + explain to someone

---

**Strategy**: See [Merge Intervals Pattern](../../strategies/patterns/merge-intervals.md)
