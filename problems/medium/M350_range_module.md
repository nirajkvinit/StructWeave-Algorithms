---
id: M350
old_id: A182
slug: range-module
title: Range Module
difficulty: medium
category: medium
topics: ["design", "segment-tree", "ordered-map"]
patterns: ["interval-merge"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M056", "M057", "M715"]
prerequisites: ["intervals", "binary-search", "data-structures"]
---
# Range Module

## Problem

Design a data structure that efficiently tracks which numbers are "active" in a large range, supporting dynamic additions, removals, and queries of number ranges.

The structure works with half-open intervals, denoted `[left, right)`. A half-open interval includes all numbers `x` where `left <= x < right`. This means `left` is included but `right` is excluded. For example, `[3, 7)` contains 3, 4, 5, and 6, but not 7. This convention simplifies interval arithmetic and is commonly used in programming (like Python's range function).

Implement the `RangeModule` class with these operations:

- `RangeModule()` - Initializes an empty range tracker
- `void addRange(int left, int right)` - Adds the interval `[left, right)` to the tracked set. If this overlaps with or is adjacent to existing ranges, merge them into a single continuous range
- `boolean queryRange(int left, int right)` - Returns `true` if every number in `[left, right)` is currently tracked, `false` otherwise
- `void removeRange(int left, int right)` - Removes all numbers in `[left, right)` from the tracked set, potentially splitting existing ranges

The challenge is handling overlapping intervals efficiently. When you add `[2, 5)` and then `[4, 8)`, they should merge into `[2, 8)`. When you remove `[3, 6)` from `[2, 8)`, you should split it into `[2, 3)` and `[6, 8)`.

With ranges up to 1 billion and 10,000 operations, you need a solution better than tracking each individual number. Consider using a sorted data structure to store disjoint intervals.

## Why This Matters

Range tracking appears in many real-world systems: calendar applications tracking busy time slots, IP address allocation in network management, memory allocators in operating systems, and reservation systems for hotels or meeting rooms. This problem teaches you interval manipulation techniques that are fundamental to computational geometry, database query optimization (range indexes), and scheduling algorithms. The pattern of maintaining sorted, non-overlapping intervals while supporting dynamic updates is a cornerstone technique in system design interviews, particularly for problems involving resource allocation and availability tracking.

## Constraints

- 1 <= left < right <= 10⁹
- At most 10⁴ calls will be made to addRange, queryRange, and removeRange.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Choosing the Right Data Structure</summary>

You need to efficiently track multiple disjoint intervals. What data structure allows you to:
1. Find overlapping intervals quickly
2. Merge intervals efficiently
3. Split intervals when needed

Consider using a sorted map/dictionary where keys represent interval starts. A TreeMap in Java, or SortedDict in Python (via sortedcontainers), or even a simple sorted list of intervals could work.

The key insight: keep intervals sorted and non-overlapping. After each operation, merge adjacent/overlapping intervals to maintain this invariant.
</details>

<details>
<summary>Hint 2: Implementing addRange</summary>

To add `[left, right)`:
1. Find all intervals that overlap with or are adjacent to `[left, right)`. An interval `[a, b)` overlaps if `a < right` and `b > left`.
2. Merge all overlapping intervals with `[left, right)`. The merged interval starts at `min(left, earliest overlap start)` and ends at `max(right, latest overlap end)`.
3. Remove all the old overlapping intervals and insert the merged one.

Edge cases to consider:
- No overlapping intervals: simply insert the new range
- Multiple overlapping intervals: merge them all into one
- New range completely contains existing ranges: absorb them
</details>

<details>
<summary>Hint 3: Implementing removeRange and queryRange</summary>

For `removeRange(left, right)`:
1. Find all intervals that overlap with `[left, right)`
2. For each overlapping interval `[a, b)`:
   - If `a < left < b <= right`: keep `[a, left)`, remove rest
   - If `left <= a < b <= right`: remove entire interval
   - If `left <= a < right < b`: keep `[right, b)`, remove rest
   - If `a < left < right < b`: split into `[a, left)` and `[right, b)`

For `queryRange(left, right)`:
1. Find the interval that should contain `left`
2. Check if this single interval fully contains `[left, right)`
3. Return true only if one interval covers the entire query range

Implementation tip: Use binary search or TreeMap floor/ceiling operations to efficiently find overlapping intervals.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Array of booleans | O(max_value) | O(max_value) | Impractical with right up to 10⁹ |
| Sorted list of intervals | O(n) per operation | O(n) | n = number of disjoint intervals |
| TreeMap/Balanced BST | O(log n + k) | O(n) | k = number of overlapping intervals to process |
| Segment Tree | O(log n) | O(n) | More complex implementation |

## Common Mistakes

**Mistake 1: Not handling half-open interval semantics correctly**
```python
# Wrong - treats as closed intervals [left, right]
class RangeModule:
    def addRange(self, left, right):
        # Incorrectly includes 'right' in the range
        self.intervals.append([left, right])  # Should be exclusive of right

    def queryRange(self, left, right):
        # Wrong comparison for half-open intervals
        for l, r in self.intervals:
            if l <= left and r >= right:  # Should be r >= right (not >)
                return True
        return False
```

**Mistake 2: Not merging overlapping intervals after insertion**
```python
# Wrong - keeps overlapping intervals separate
class RangeModule:
    def __init__(self):
        self.intervals = []

    def addRange(self, left, right):
        self.intervals.append([left, right])  # Just adds without merging
        # Results in overlapping intervals like [[1,5), [3,7)]
        # Should merge to [[1,7)]
```

**Mistake 3: Inefficient queryRange implementation**
```python
# Wrong - checks if entire range covered by any single interval
class RangeModule:
    def queryRange(self, left, right):
        # Wrong: doesn't check if multiple intervals together cover the range
        for l, r in self.intervals:
            if l <= left and r >= right:
                return True
        return False
        # If intervals are [[1,3), [3,5)] and query is [1,5),
        # should return True but this returns False
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Merge Intervals (static) | Medium | One-time merge, no dynamic updates |
| Insert Interval | Medium | Single insertion into sorted intervals |
| Range Sum Query - Mutable | Medium | Track sums instead of presence, support updates |
| My Calendar I/II/III | Medium/Hard | Track booking conflicts, different query types |
| Count integers in intervals | Hard | Count unique integers across all intervals |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Practiced again (1 day later)
- [ ] Practiced again (3 days later)
- [ ] Practiced again (1 week later)
- [ ] Can solve in under 30 minutes
- [ ] Can explain solution clearly
- [ ] Implemented with TreeMap/sorted structure
- [ ] Handled all interval boundary cases
- [ ] Tested half-open interval semantics thoroughly

**Strategy**: See [Interval Patterns](../strategies/patterns/intervals.md)
