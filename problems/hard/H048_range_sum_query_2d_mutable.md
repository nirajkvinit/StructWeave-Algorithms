---
id: H048
old_id: I107
slug: range-sum-query-2d-mutable
title: Range Sum Query 2D - Mutable
difficulty: hard
category: hard
topics: ["matrix", "prefix-sum"]
patterns: ["dp-2d"]
estimated_time_minutes: 45
strategy_ref: ../strategies/patterns/prefix-sum.md
---
# Range Sum Query 2D - Mutable

## Problem

You receive a 2D matrix `matrix` and need to support the following query types:

	- **Modify** a cell's value within the `matrix`.
	- Compute the **sum** of all elements contained in a rectangular region bounded by the **top-left corner** `(row1, col1)` and **bottom-right corner** `(row2, col2)`.

Create a NumMatrix class with these methods:

	- `NumMatrix(int[][] matrix)` Constructor that accepts the 2D integer matrix `matrix` for initialization.
	- `void update(int row, int col, int val)` Changes the value at position `matrix[row][col]` to `val`.
	- `int sumRegion(int row1, int col1, int row2, int col2)` Computes and returns the **sum** of all matrix elements within the rectangular area bounded by **top-left corner** `(row1, col1)` and **bottom-right corner** `(row2, col2)`.


**Diagram:**

```
Example Matrix:
┌────┬────┬────┬────┬────┐
│  3 │  0 │  1 │  4 │  2 │
├────┼────┼────┼────┼────┤
│  5 │  6 │  3 │  2 │  1 │
├────┼────┼────┼────┼────┤
│  1 │  2 │  0 │  1 │  5 │
├────┼────┼────┼────┼────┤
│  4 │  1 │  0 │  1 │  7 │
├────┼────┼────┼────┼────┤
│  1 │  0 │  3 │  0 │  5 │
└────┴────┴────┴────┴────┘

sumRegion(2, 1, 4, 3) - Sum of shaded region:
┌────┬────┬────┬────┬────┐
│  3 │  0 │  1 │  4 │  2 │
├────┼────┼────┼────┼────┤
│  5 │  6 │  3 │  2 │  1 │
├────┼────╔════╦════╦════╗
│  1 │  2 ║  0 ║  1 ║  5 ║
├────┼────╬════╬════╬════╣
│  4 │  1 ║  0 ║  1 ║  7 ║
├────┼────╬════╬════╬════╣
│  1 │  0 ║  3 ║  0 ║  5 ║
└────┴────╚════╩════╩════╝
Sum = 2 + 0 + 1 + 1 + 0 + 1 + 0 + 3 + 0 = 8
```


## Why This Matters

Two-dimensional arrays are essential for representing grids, images, and spatial information. This challenge enhances your proficiency in working with multi-dimensional data structures.

## Constraints

- m == matrix.length
- n == matrix[i].length
- 1 <= m, n <= 200
- -1000 <= matrix[i][j] <= 1000
- 0 <= row < m
- 0 <= col < n
- -1000 <= val <= 1000
- 0 <= row1 <= row2 < m
- 0 <= col1 <= col2 < n
- At most 5000 calls will be made to sumRegion and update.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

**Strategy**: See [Matrix Pattern](../strategies/patterns/prefix-sum.md)

## Approach Hints

<details>
<summary>Key Insight</summary>
This problem requires a balance between fast updates and fast queries. A 2D Binary Indexed Tree (Fenwick Tree) provides O(log m × log n) time for both operations. The key is understanding that unlike prefix sums (fast query, slow update), a BIT maintains partial sums that can be efficiently updated and queried.
</details>

<details>
<summary>Main Approach</summary>
Implement a 2D Binary Indexed Tree (BIT). For update(row, col, val), calculate the delta (new value - old value), then update all affected cells in the BIT by traversing parent indices. For sumRegion, compute the sum using inclusion-exclusion principle on four corner points of the BIT, similar to 2D prefix sum but with BIT's query method.
</details>

<details>
<summary>Optimization Tip</summary>
Store the original matrix to calculate deltas during updates. When updating, only modify log(m) × log(n) cells in the BIT, not the entire tree. For sumRegion queries, use the formula: sum(row2, col2) - sum(row1-1, col2) - sum(row2, col1-1) + sum(row1-1, col1-1), where each sum is a BIT query.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | Update: O(1), Query: O(mn) | O(mn) | Direct matrix, scan region for query |
| 2D Prefix Sum | Update: O(mn), Query: O(1) | O(mn) | Rebuild prefix sum on each update |
| 2D Binary Indexed Tree | Update: O(log m × log n), Query: O(log m × log n) | O(mn) | Optimal for mutable case |
| 2D Segment Tree | Update: O(log m × log n), Query: O(log m × log n) | O(mn) | Alternative to BIT, more complex |

## Common Mistakes

1. **Forgetting to Calculate Delta**
   ```python
   # Wrong: Adds new value instead of difference
   def update(self, row, col, val):
       self._updateBIT(row + 1, col + 1, val)

   # Correct: Update with delta
   def update(self, row, col, val):
       delta = val - self.matrix[row][col]
       self.matrix[row][col] = val
       self._updateBIT(row + 1, col + 1, delta)
   ```

2. **Incorrect Index Calculation in BIT**
   ```python
   # Wrong: Uses 0-based indexing in BIT
   def _updateBIT(self, row, col, delta):
       i = row
       while i < len(self.bit):
           j = col
           while j < len(self.bit[0]):
               self.bit[i][j] += delta
               j += 1
           i += 1

   # Correct: Use proper BIT index calculation
   def _updateBIT(self, row, col, delta):
       i = row
       while i < len(self.bit):
           j = col
           while j < len(self.bit[0]):
               self.bit[i][j] += delta
               j += (j & -j)  # Move to next index
           i += (i & -i)  # Move to next index
   ```

3. **Wrong Inclusion-Exclusion Formula**
   ```python
   # Wrong: Incorrect boundary handling
   def sumRegion(self, row1, col1, row2, col2):
       return self._query(row2, col2) - self._query(row1, col2) - self._query(row2, col1)

   # Correct: Include all four corners
   def sumRegion(self, row1, col1, row2, col2):
       return (self._query(row2 + 1, col2 + 1)
               - self._query(row1, col2 + 1)
               - self._query(row2 + 1, col1)
               + self._query(row1, col1))
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Range Sum Query - Immutable | Easy | No updates needed, use simple prefix sum |
| Range Sum Query - Mutable (1D) | Medium | Single dimension, simpler BIT |
| Range Sum Query 2D - Immutable | Medium | No updates, 2D prefix sum sufficient |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Binary Indexed Tree](../../strategies/data-structures/advanced-trees.md)
