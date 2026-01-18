---
id: H059
old_id: I151
slug: data-stream-as-disjoint-intervals
title: Data Stream as Disjoint Intervals
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# Data Stream as Disjoint Intervals

## Problem

Create a data structure that processes a stream of non-negative integers and maintains a compressed representation using non-overlapping intervals.

Build the `SummaryRanges` class with these operations:

	- `SummaryRanges()` Creates a new instance with no values.
	- `void addNum(int value)` Inserts the integer `value` into the data structure.
	- `int[][] getIntervals()` Produces a list of non-overlapping intervals `[starti, endi]` that represent all values added so far, sorted in ascending order by start position.

## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Constraints

- 0 <= value <= 10⁴
- At most 3 * 10⁴ calls will be made to addNum and getIntervals.
- At most 10² calls will be made to getIntervals.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use a data structure that maintains sorted intervals. When adding a number, find where it fits: (1) extends an existing interval, (2) bridges two intervals, (3) creates a new interval, or (4) is already covered. A balanced BST or sorted list works well for finding neighbors.
</details>

<details>
<summary>🎯 Main Approach</summary>
Maintain intervals in a sorted map/list where key is interval start. For each addNum(x): find intervals that could merge with x (where x-1 or x or x+1 touches/overlaps). Merge these intervals into a single new interval. Use binary search to find the relevant intervals efficiently.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a TreeMap (Java) or SortedDict (Python sortedcontainers) to maintain O(log n) insertion and search. Alternatively, use a simple sorted list with binary search. When merging, check the interval before and after the insertion point to see if they can be combined. Handle duplicates by checking if the value is already covered.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (unsorted list) | O(n) addNum, O(n log n) getIntervals | O(n) | Sort on every getIntervals call |
| Sorted List + Binary Search | O(n) addNum, O(n) getIntervals | O(n) | Linear merge operations |
| TreeMap/BST | O(log n) addNum, O(n) getIntervals | O(n) | Optimal for frequent updates |

## Common Mistakes

1. **Not checking for duplicates**
   ```python
   # Wrong: Always creating new intervals
   def addNum(self, value):
       self.intervals.append([value, value])

   # Correct: Check if value already covered
   def addNum(self, value):
       # Find intervals that might contain value
       # Only add if not already in an interval
   ```

2. **Incorrect interval merging logic**
   ```python
   # Wrong: Not considering all merge cases
   if value == interval[1] + 1:
       interval[1] = value

   # Correct: Check both extension and bridging
   # Case 1: extends left interval
   # Case 2: extends right interval
   # Case 3: bridges two intervals
   # Case 4: new standalone interval
   ```

3. **Inefficient getIntervals implementation**
   ```python
   # Wrong: Rebuilding intervals every time
   def getIntervals(self):
       intervals = []
       for val in sorted(self.values):
           # Reconstruct intervals from scratch

   # Correct: Maintain intervals as you add
   def getIntervals(self):
       # Return already maintained interval list
       return list(self.intervals)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Merge Intervals | Medium | Static list instead of stream |
| Insert Interval | Medium | Insert one interval into sorted list |
| Range Module | Hard | Add/remove ranges with query support |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Intervals](../../strategies/patterns/intervals.md)
