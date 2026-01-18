---
id: E199
old_id: A080
slug: range-addition-ii
title: Range Addition II
difficulty: easy
category: easy
topics: ["array", "math"]
patterns: ["range-query", "optimization"]
estimated_time_minutes: 15
frequency: low
related_problems: ["M154", "M155", "H156"]
prerequisites: ["2d-arrays", "range-operations", "min-max-concepts"]
strategy_ref: ../strategies/patterns/greedy.md
---
# Range Addition II

## Problem

Imagine starting with a rectangular grid (an `m x n` matrix) where every cell contains the value zero. You're then given a series of operations to perform on this grid. Each operation is represented as a pair of numbers `[a, b]`, which means "add 1 to all cells in the rectangular region from the top-left corner up to (but not including) position `[a, b]`". More precisely, for operation `[a, b]`, you increment every cell where the row index is less than `a` and the column index is less than `b`.

After carrying out all these operations in sequence, your goal is to count how many cells in the matrix contain the maximum value. Notice that since all operations start from the top-left corner `[0, 0]`, cells closer to this corner will be incremented more frequently. The key insight is determining which region gets affected by every single operation, as those cells will have the highest count.

The challenge here is recognizing that you don't need to actually build and update the matrix - that would be extremely slow for large dimensions. Instead, there's an elegant mathematical relationship between the operations that lets you determine the answer directly. Consider what happens when multiple rectangular regions (all starting from `[0, 0]`) overlap: their intersection is also a rectangle starting from `[0, 0]`, and its size is determined by the smallest dimensions across all operations.


**Diagram:**

```
Initial 3x3 matrix (all zeros):
0 0 0
0 0 0
0 0 0

After operation [2,2] (increment range 0<=x<2, 0<=y<2):
1 1 0
1 1 0
0 0 0

After operation [3,3] (increment range 0<=x<3, 0<=y<3):
2 2 1
2 2 1
1 1 1

Maximum value is 2, appearing in 4 cells (top-left 2x2 region)
```


## Why This Matters

This problem appears in scenarios involving overlapping range updates, such as image processing (applying filters to overlapping regions), database query optimization (finding records affected by all update operations), and resource allocation systems (identifying resources that meet all requirements). It teaches an important optimization principle: sometimes the best solution is to not perform the operations at all, but rather to reason mathematically about their collective effect.

The pattern of finding intersections among ranges appears frequently in computational geometry, calendar scheduling applications, and distributed systems where you need to find common availability windows. Mastering this optimization technique - replacing simulation with mathematical reasoning - is crucial for scaling algorithms to handle large datasets efficiently.

## Examples

**Example 1:**
- Input: `m = 3, n = 3, ops = [[2,2],[3,3],[3,3],[3,3],[2,2],[3,3],[3,3],[3,3],[2,2],[3,3],[3,3],[3,3]]`
- Output: `4`

**Example 2:**
- Input: `m = 3, n = 3, ops = []`
- Output: `9`

## Constraints

- 1 <= m, n <= 4 * 10⁴
- 0 <= ops.length <= 10⁴
- ops[i].length == 2
- 1 <= ai <= m
- 1 <= bi <= n

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Observing the Overlap Pattern
Each operation increments a rectangular region starting from [0,0]:
- Which cells get incremented by every operation?
- What region is common to all operations?

Think about which cells receive the maximum number of increments.

### Hint 2: Finding the Intersection
The maximum value appears in cells that are affected by ALL operations:
- If operation 1 affects [0,0] to [2,2] and operation 2 affects [0,0] to [3,3], which region gets both increments?
- What determines the intersection of multiple rectangular regions all starting at [0,0]?

The intersection is determined by the minimum dimensions across all operations.

### Hint 3: Mathematical Optimization
Instead of simulating the matrix:
- Find the minimum `a` value across all operations (min_row)
- Find the minimum `b` value across all operations (min_col)
- The answer is min_row × min_col

What if there are no operations at all?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Find Min Dimensions | O(k) | O(1) | k = number of operations; optimal solution |
| Simulate Matrix | O(m × n × k) | O(m × n) | Create and update actual matrix; very slow |
| Count Each Cell | O(k × max_area) | O(m × n) | Track count for each cell; inefficient |

## Common Mistakes

### Mistake 1: Actually Building the Matrix
```python
# Wrong: Simulates the entire matrix (too slow for large m, n)
def maxCount(m, n, ops):
    matrix = [[0] * n for _ in range(m)]
    for a, b in ops:
        for i in range(a):
            for j in range(b):
                matrix[i][j] += 1
    # Count cells with max value...
```
**Why it's wrong:** Time complexity is O(m × n × k), which is too slow when m, n can be up to 40,000.

**Correct approach:** Recognize that you only need the minimum dimensions, not the actual matrix values.

### Mistake 2: Forgetting Empty Operations Case
```python
# Wrong: Doesn't handle when ops is empty
def maxCount(m, n, ops):
    min_a = min(op[0] for op in ops)  # Crashes if ops is empty!
    min_b = min(op[1] for op in ops)
    return min_a * min_b
```
**Why it's wrong:** If there are no operations, all m×n cells have the same value (0), so all are maximum.

**Correct approach:** Check if ops is empty first and return m × n in that case.

### Mistake 3: Misunderstanding the Range
```python
# Wrong: Thinks operations are inclusive on both ends
def maxCount(m, n, ops):
    # Assumes [a, b] means up to and including a and b
    min_a = min(op[0] for op in ops) + 1  # Off by one!
    min_b = min(op[1] for op in ops) + 1
    return min_a * min_b
```
**Why it's wrong:** The operation `[a, b]` means `0 <= x < a` and `0 <= y < b`, so it's already exclusive of `a` and `b`.

**Correct approach:** Use the minimum values directly without adding 1.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Range addition with arbitrary start | Operations can start from any position, not just [0,0] | Medium |
| Range addition I (1D) | Same concept but with 1D array | Easy |
| Count cells above threshold | Find cells with count >= k instead of maximum | Medium |
| Weighted range addition | Each operation has a weight, maximize weighted sum | Medium |
| 3D range addition | Extend to 3-dimensional matrix | Medium |

## Practice Checklist

Practice this problem until you can confidently complete these tasks:

- [ ] Day 1: Solve with min dimension approach (15 min)
- [ ] Day 3: Implement without looking at notes (10 min)
- [ ] Day 7: Handle edge case (empty operations) correctly (5 min)
- [ ] Day 14: Explain why simulation is inefficient
- [ ] Day 30: Solve a variation (range addition with arbitrary start)

**Strategy**: See [Greedy Optimization](../strategies/patterns/greedy.md)
