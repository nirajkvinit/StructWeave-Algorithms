---
id: E203
old_id: A093
slug: maximum-distance-in-arrays
title: Maximum Distance in Arrays
difficulty: easy
category: easy
topics: ["array", "greedy"]
patterns: ["greedy", "tracking-extremes"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E121", "M053", "M152"]
prerequisites: ["array-traversal", "min-max-tracking", "greedy-strategy"]
strategy_ref: ../strategies/patterns/greedy.md
---
# Maximum Distance in Arrays

## Problem

You're given multiple arrays, each sorted in ascending order. Your task is to find the maximum "distance" possible by selecting two numbers from different arrays. The distance between two numbers is their absolute difference.

The crucial constraint here is that the two numbers must come from different arrays - you can't pick both numbers from the same array. This constraint turns what would be a trivial problem (find global min and max) into an interesting algorithmic challenge.

Since each array is sorted in ascending order, you know that the smallest element is at the beginning (index 0) and the largest element is at the end (last index). This property is key to solving the problem efficiently. The maximum distance will be formed by taking the minimum value from one array and the maximum value from a different array.

The tricky part is ensuring the two values come from different arrays. If you simply find the global minimum and global maximum across all arrays, they might both be from the same array. Instead, you need to track extremes from previous arrays as you iterate, comparing each array's extremes against those you've seen before. This lets you guarantee that any maximum distance calculation uses values from different sources.

## Why This Matters

This problem teaches essential skills in tracking multiple extrema while maintaining constraints. The pattern appears in financial algorithms (finding maximum price spread across different markets), distributed systems (computing differences between metrics from different nodes), and optimization problems (maximizing differences subject to selection constraints).

The greedy approach demonstrated here - making local decisions while tracking global state - is fundamental to many efficient algorithms. You're learning to avoid naive global searches that violate constraints, instead building solutions that incrementally maintain valid states.

This problem also reinforces the importance of leveraging sorted data properties. Many interview problems give you sorted input, and recognizing when and how to exploit that ordering is crucial. The single-pass O(m) solution shows how proper state tracking can achieve optimal efficiency.

## Examples

**Example 1:**
- Input: `arrays = [[1,2,3],[4,5],[1,2,3]]`
- Output: `4`
- Explanation: The maximum distance of 4 can be obtained by selecting 1 from either the first or third array and selecting 5 from the second array.

**Example 2:**
- Input: `arrays = [[1],[1]]`
- Output: `0`

## Constraints

- m == arrays.length
- 2 <= m <= 10⁵
- 1 <= arrays[i].length <= 500
- -10⁴ <= arrays[i][j] <= 10⁴
- arrays[i] is sorted in **ascending order**.
- There will be at most 10⁵ integers in all the arrays.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Understanding the Constraint
The key constraint is that the two numbers must come from DIFFERENT arrays:
- Can you just find the global min and global max across all arrays?
- What if the global min and global max are from the same array?

Think about how to ensure the two selected numbers come from different sources.

### Hint 2: Leveraging Sorted Property
Since each array is sorted in ascending order:
- Where is the minimum element of each array?
- Where is the maximum element of each array?

The distance between arrays[i] and arrays[j] is maximized by taking extreme values.

### Hint 3: Single Pass Tracking
As you iterate through arrays:
- Track the minimum and maximum values seen so far
- For current array, compare its max with previous min, and its min with previous max
- Update the maximum distance and the running min/max

Can you solve this in O(m) time where m is the number of arrays?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Single Pass with Min/Max Tracking | O(m) | O(1) | m = number of arrays; optimal |
| Check All Pairs | O(m²) | O(1) | Compare every array with every other array |
| Flatten and Sort | O(n log n) | O(n) | n = total elements; loses array identity |

## Common Mistakes

### Mistake 1: Using Global Min/Max from Same Array
```python
# Wrong: Doesn't ensure different arrays
def maxDistance(arrays):
    global_min = min(arr[0] for arr in arrays)
    global_max = max(arr[-1] for arr in arrays)
    return global_max - global_min  # May be from same array!
```
**Why it's wrong:** If the smallest and largest values are both from the same array, this violates the constraint.

**Correct approach:** Track min/max from previous arrays separately and compare with current array's extremes.

### Mistake 2: Not Updating Min/Max Correctly
```python
# Wrong: Updates min/max before calculating distance
def maxDistance(arrays):
    min_val = arrays[0][0]
    max_val = arrays[0][-1]
    max_dist = 0
    for i in range(1, len(arrays)):
        min_val = min(min_val, arrays[i][0])  # Updates too early!
        max_val = max(max_val, arrays[i][-1])
        max_dist = max(max_dist, max_val - min_val)
```
**Why it's wrong:** Updates min/max before calculating distance, which could use values from the same array.

**Correct approach:** Calculate distance first using previous min/max, then update min/max with current array's values.

### Mistake 3: Only Checking One Distance Direction
```python
# Wrong: Only considers current_max - previous_min
def maxDistance(arrays):
    min_val = arrays[0][0]
    max_val = arrays[0][-1]
    max_dist = 0
    for i in range(1, len(arrays)):
        max_dist = max(max_dist, arrays[i][-1] - min_val)
        # Missing: max_val - arrays[i][0]
        min_val = min(min_val, arrays[i][0])
        max_val = max(max_val, arrays[i][-1])
```
**Why it's wrong:** Maximum distance could be either `current_max - previous_min` OR `previous_max - current_min`.

**Correct approach:** Check both: `max(arrays[i][-1] - min_val, max_val - arrays[i][0])`.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Minimum distance between arrays | Find minimum absolute difference from different arrays | Easy |
| Maximum distance with k arrays | Select numbers from k different arrays | Medium |
| Unsorted arrays | Arrays are not sorted | Medium |
| Maximum product instead of distance | Maximize product of two numbers from different arrays | Medium |
| Closest pair from different arrays | Find pair from different arrays with minimum distance | Medium |

## Practice Checklist

Practice this problem until you can confidently complete these tasks:

- [ ] Day 1: Solve with single pass approach (20 min)
- [ ] Day 3: Implement without looking at notes (15 min)
- [ ] Day 7: Handle edge cases correctly (10 min)
- [ ] Day 14: Explain why you need to check both distance directions
- [ ] Day 30: Solve a variation (unsorted arrays)

**Strategy**: See [Greedy Optimization](../strategies/patterns/greedy.md)
