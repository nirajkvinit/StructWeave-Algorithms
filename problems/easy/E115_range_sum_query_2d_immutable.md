---
id: E115
old_id: I103
slug: range-sum-query-2d-immutable
title: Range Sum Query 2D - Immutable
difficulty: easy
category: easy
topics: ["matrix", "prefix-sum"]
patterns: ["dp-2d", "prefix-sum"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E114", "M304", "M308"]
prerequisites: ["prefix-sum", "2d-array", "inclusion-exclusion-principle"]
strategy_ref: ../strategies/patterns/prefix-sum.md
---
# Range Sum Query 2D - Immutable

## Problem

Design a data structure that efficiently answers rectangular region sum queries on a 2D integer matrix. The matrix is provided once during initialization and remains unchanged (immutable), but you need to handle many queries asking for the sum of all elements within different rectangular regions.

Build a `NumMatrix` class with a constructor `NumMatrix(int[][] matrix)` that accepts a 2D array, and a method `int sumRegion(int row1, int col1, int row2, int col2)` that computes the sum of all elements in the rectangle from top-left corner (row1, col1) to bottom-right corner (row2, col2), inclusive.

The crucial requirement is O(1) constant-time queries. With up to 10,000 queries, repeatedly summing elements in potentially large rectangles would be far too slow. This extends the 1D prefix sum concept from the previous problem into two dimensions.

The breakthrough insight involves the inclusion-exclusion principle from combinatorics. Build a 2D prefix sum matrix where `prefix[i][j]` stores the sum of all elements in the rectangle from (0, 0) to (i-1, j-1). To query a rectangle, you add the total for the larger region, subtract the regions outside your target rectangle, and then add back the overlap that you subtracted twice. Visualizing this with a diagram makes it much clearer.

The indexing can be tricky. Most implementations create a prefix matrix that's one larger in each dimension (adding a row and column of zeros at the edges) to eliminate special cases for rectangles touching the edges.

## Why This Matters

2D prefix sums are fundamental in image processing for computing integral images, which enable constant-time rectangular feature detection. Computer vision systems use this exact technique for face detection (Viola-Jones algorithm), texture analysis, and fast correlation filters.

Geographic information systems (GIS) use 2D range queries to compute statistics over map regions: population density in an area, total rainfall across counties, or aggregate sales across territories. The technique extends to weather modeling, satellite image analysis, and computational geometry.

The inclusion-exclusion principle you apply here is a cornerstone of combinatorics and probability theory. It appears in solving counting problems, database query optimization (filtering with multiple criteria), and set operations. Understanding this principle transfers to Venn diagram calculations, Bonferroni inequalities, and advanced probability.

This problem teaches you to extend 1D algorithmic patterns into higher dimensions, a crucial skill for tackling multidimensional dynamic programming, spatial data structures, and tensor operations in machine learning frameworks.

## Constraints

- m == matrix.length
- n == matrix[i].length
- 1 <= m, n <= 200
- -10⁴ <= matrix[i][j] <= 10⁴
- 0 <= row1 <= row2 < m
- 0 <= col1 <= col2 < n
- At most 10⁴ calls will be made to sumRegion.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Extend 1D Prefix Sum to 2D</summary>

The 1D prefix sum problem (E114) can be extended to 2D. Instead of a 1D prefix array, create a 2D prefix sum matrix where prefix[i][j] represents the sum of all elements in the rectangle from (0,0) to (i-1,j-1). This allows you to compute any rectangular region sum using inclusion-exclusion principle.

</details>

<details>
<summary>🎯 Hint 2: Inclusion-Exclusion Principle</summary>

To find the sum of rectangle (row1, col1) to (row2, col2), use the formula:
```
sum = prefix[row2+1][col2+1]
      - prefix[row1][col2+1]
      - prefix[row2+1][col1]
      + prefix[row1][col1]
```

The addition at the end is needed because we subtracted the overlapping region twice. Draw a diagram to visualize why this works.

</details>

<details>
<summary>📝 Hint 3: Building the Prefix Sum Matrix</summary>

Pseudocode:
```
class NumMatrix:
    prefix = [][]

    constructor(matrix):
        m = len(matrix), n = len(matrix[0])
        // Create (m+1) × (n+1) prefix sum matrix
        prefix = [[0] * (n + 1) for _ in range(m + 1)]

        for i from 1 to m:
            for j from 1 to n:
                prefix[i][j] = matrix[i-1][j-1]
                             + prefix[i-1][j]      // Top
                             + prefix[i][j-1]      // Left
                             - prefix[i-1][j-1]    // Remove overlap

    sumRegion(row1, col1, row2, col2):
        return prefix[row2+1][col2+1]
             - prefix[row1][col2+1]
             - prefix[row2+1][col1]
             + prefix[row1][col1]
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| No Preprocessing | O(m * n) per query | O(1) | Sum all cells in rectangle each time |
| Row-wise Prefix Sum | O(n) per query | O(m * n) | Prefix sum for each row, sum across rows |
| **2D Prefix Sum** | **O(1) per query** | **O(m * n)** | Optimal: O(m*n) preprocessing, constant time queries |

Constructor: O(m * n) for 2D prefix sum. SumRegion: O(1).

## Common Mistakes

### Mistake 1: Computing Sum Without Preprocessing

**Wrong:**
```python
class NumMatrix:
    def __init__(self, matrix):
        self.matrix = matrix

    def sumRegion(self, row1, col1, row2, col2):
        total = 0
        for i in range(row1, row2 + 1):
            for j in range(col1, col2 + 1):
                total += self.matrix[i][j]
        return total
        # O(m * n) per query - too slow
```

**Correct:**
```python
class NumMatrix:
    def __init__(self, matrix):
        if not matrix or not matrix[0]:
            return
        m, n = len(matrix), len(matrix[0])
        self.prefix = [[0] * (n + 1) for _ in range(m + 1)]

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                self.prefix[i][j] = (matrix[i-1][j-1] +
                                     self.prefix[i-1][j] +
                                     self.prefix[i][j-1] -
                                     self.prefix[i-1][j-1])

    def sumRegion(self, row1, col1, row2, col2):
        return (self.prefix[row2+1][col2+1] -
                self.prefix[row1][col2+1] -
                self.prefix[row2+1][col1] +
                self.prefix[row1][col1])
```

Preprocessing is essential for O(1) query time.

### Mistake 2: Forgetting Inclusion-Exclusion

**Wrong:**
```python
def sumRegion(self, row1, col1, row2, col2):
    return (self.prefix[row2+1][col2+1] -
            self.prefix[row1][col2+1] -
            self.prefix[row2+1][col1])
    # Missing: + self.prefix[row1][col1]
    # Top-left region subtracted twice, need to add back once
```

**Correct:**
```python
def sumRegion(self, row1, col1, row2, col2):
    return (self.prefix[row2+1][col2+1] -
            self.prefix[row1][col2+1] -
            self.prefix[row2+1][col1] +
            self.prefix[row1][col1])
```

The overlapping top-left region must be added back.

### Mistake 3: Incorrect Prefix Sum Construction

**Wrong:**
```python
def __init__(self, matrix):
    m, n = len(matrix), len(matrix[0])
    self.prefix = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            # Missing the subtraction of overlap!
            self.prefix[i][j] = (matrix[i-1][j-1] +
                                 self.prefix[i-1][j] +
                                 self.prefix[i][j-1])
```

**Correct:**
```python
def __init__(self, matrix):
    m, n = len(matrix), len(matrix[0])
    self.prefix = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            self.prefix[i][j] = (matrix[i-1][j-1] +
                                 self.prefix[i-1][j] +
                                 self.prefix[i][j-1] -
                                 self.prefix[i-1][j-1])  # Remove overlap
```

When building prefix sum, must subtract the overlapping region.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Range Sum Query 2D Mutable | Support update operations on matrix | Hard |
| Range Sum Query 3D | Extend to 3D matrices | Medium |
| Maximum Sum Rectangle | Find rectangle with maximum sum | Hard |
| Count Submatrices | Count submatrices meeting certain criteria | Medium |
| Range Product Query 2D | Product instead of sum | Medium |

## Practice Checklist

- [ ] Implement 2D prefix sum array (15 min)
- [ ] Draw diagram to understand inclusion-exclusion (10 min)
- [ ] Handle edge cases: single row/column matrix (5 min)
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Compare with 1D version (E114) to see pattern

**Strategy**: See [Prefix Sum Pattern](../strategies/patterns/prefix-sum.md)


**Diagram:**

Example: Range sum query on 2D matrix
```
Input matrix:
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

Query: sumRegion(2, 1, 4, 3)
Sum elements in rectangle from (2,1) to (4,3):
┌────┬────┬────┬────┬────┐
│  3 │  0 │  1 │  4 │  2 │
├────┼────┼────┼────┼────┤
│  5 │  6 │  3 │  2 │  1 │
├────┼════╬════╬════╗────┤
│  1 ║  2 ║  0 ║  1 ║  5 │ ← row 2
├────╫────╫────╫────╫────┤
│  4 ║  1 ║  0 ║  1 ║  7 │ ← row 3
├────╫────╫────╫────╫────┤
│  1 ║  0 ║  3 ║  0 ║  5 │ ← row 4
└────╚════╩════╩════╝────┘
      col1  col2  col3

Sum = 2 + 0 + 1 + 1 + 0 + 1 + 0 + 3 + 0 = 8
```
