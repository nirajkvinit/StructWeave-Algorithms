---
id: E197
old_id: A062
slug: reshape-the-matrix
title: Reshape the Matrix
difficulty: easy
category: easy
topics: ["array", "matrix", "simulation"]
patterns: ["matrix-traversal", "index-mapping"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E118", "M045", "M133"]
prerequisites: ["2d-arrays", "index-arithmetic", "row-major-order"]
strategy_ref: ../strategies/data-structures/arrays.md
---
# Reshape the Matrix

## Problem

You have a 2D matrix with dimensions `m × n`, and you need to reshape it into a new matrix with dimensions `r × c` while preserving all elements in their row-major order. Row-major order means you read elements left-to-right across each row, then move to the next row below, treating the 2D matrix like a flattened 1D array.

For example, a 2×2 matrix `[[1,2], [3,4]]` in row-major order is the sequence [1,2,3,4]. If you reshape this to 1×4, you get `[[1,2,3,4]]`. If you reshape to 4×1, you get `[[1],[2],[3],[4]]`.

The transformation is only valid if the total number of elements remains the same: `m × n` must equal `r × c`. If this condition isn't met (for instance, trying to reshape a 2×2 matrix into 2×3), return the original matrix unchanged.

The core challenge is mapping from old coordinates to new coordinates. You can either flatten the matrix into a 1D array and rebuild, or use index arithmetic to directly compute where each element should go in the new matrix. The latter approach is more space-efficient.

**Diagram:**

```
Example 1:
Input: mat = [[1,2],
              [3,4]], r = 1, c = 4

Original (2x2):        Reshaped (1x4):
  1  2                   1  2  3  4
  3  4

Output: [[1,2,3,4]]
```

```
Example 2:
Input: mat = [[1,2],
              [3,4]], r = 2, c = 4

Original (2x2):
  1  2
  3  4

Cannot reshape to (2x4) because 2*2 ≠ 2*4
Output: [[1,2],[3,4]] (original matrix unchanged)
```


## Why This Matters

Matrix reshaping is fundamental in machine learning frameworks like NumPy, TensorFlow, and PyTorch, where you constantly transform data between different dimensional representations for neural network layers. The index arithmetic you practice here (converting between 1D and 2D coordinates) appears in image processing, graphics rendering, and memory layout optimization. Understanding row-major vs. column-major ordering is crucial when interfacing with different systems or optimizing cache performance. This problem teaches you how to manipulate multi-dimensional data structures efficiently, a skill essential for data engineering, scientific computing, and computer vision. Companies building analytics platforms, recommendation systems, or computational tools rely heavily on efficient matrix operations. The pattern also generalizes to higher dimensions, appearing in tensor manipulation and database query result transformations.

## Constraints

- m == mat.length
- n == mat[i].length
- 1 <= m, n <= 100
- -1000 <= mat[i][j] <= 1000
- 1 <= r, c <= 300

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Validating the Transformation
Before attempting to reshape, verify if the transformation is possible:
- What condition must be satisfied for reshaping to work?
- How do you compare the total number of elements in both matrices?

If m × n ≠ r × c, what should you return?

### Hint 2: Mapping Elements with Index Arithmetic
Think about converting between 2D coordinates and linear positions:
- In row-major order, element at position (i, j) in an m×n matrix has linear index: ?
- Given a linear index k, how do you find the (row, col) in an r×c matrix?

Can you iterate through the original matrix linearly and place elements in the new matrix using index calculations?

### Hint 3: Optimal Single-Pass Solution
Consider processing elements in order:
- Maintain a counter for the current position in the flattened array
- Use division and modulo to convert linear index to 2D coordinates
- Fill the new matrix row by row

Can you avoid creating an intermediate 1D array and directly map elements from old to new matrix?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Flatten and Rebuild | O(m × n) | O(m × n) | Create intermediate 1D array, then rebuild |
| Direct Index Mapping | O(m × n) | O(r × c) | Map directly using arithmetic, output space only |
| Queue/Deque | O(m × n) | O(m × n) | Use queue to transfer elements |

## Common Mistakes

### Mistake 1: Forgetting Validation Check
```python
# Wrong: Attempts reshape without checking if possible
def matrixReshape(mat, r, c):
    result = [[0] * c for _ in range(r)]
    # Directly fills without validation
    # May cause index out of bounds
```
**Why it's wrong:** If m×n ≠ r×c, attempting to fill the new matrix will fail or produce incorrect results.

**Correct approach:** Check if `len(mat) * len(mat[0]) == r * c` before reshaping. Return original matrix if check fails.

### Mistake 2: Incorrect Index Mapping
```python
# Wrong: Incorrect formula for converting linear to 2D index
def matrixReshape(mat, r, c):
    # ... validation ...
    for i in range(len(mat)):
        for j in range(len(mat[0])):
            linear_idx = i + j  # Wrong calculation!
            new_row = linear_idx // r  # Wrong dimension!
            new_col = linear_idx % r
```
**Why it's wrong:** Linear index should be `i * n + j` where n is the number of columns. Also using wrong dimension for modulo.

**Correct approach:** `linear_idx = i * cols + j`, then `new_row = linear_idx // c` and `new_col = linear_idx % c`.

### Mistake 3: Creating Unnecessary Intermediate Structure
```python
# Wrong: Creates extra array, wastes space
def matrixReshape(mat, r, c):
    flat = []
    for row in mat:
        for val in row:
            flat.append(val)
    # Then rebuild from flat array
```
**Why it's wrong:** While this works, it uses extra O(m×n) space unnecessarily.

**Correct approach:** Use index arithmetic to map directly from old to new matrix positions without intermediate storage.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Reshape with column-major order | Fill new matrix column-by-column instead of row-by-row | Easy |
| Reshape 1D to 2D | Given 1D array and dimensions, create 2D matrix | Easy |
| Transpose matrix | Special case where r=n and c=m | Easy |
| Reshape with rotation | Reshape and rotate 90 degrees simultaneously | Medium |
| Multi-dimensional reshape | Reshape 3D array to different dimensions | Medium |

## Practice Checklist

Practice this problem until you can confidently complete these tasks:

- [ ] Day 1: Solve with flatten-and-rebuild approach (20 min)
- [ ] Day 3: Implement direct index mapping without intermediate array (15 min)
- [ ] Day 7: Solve without looking at notes, handle edge cases (10 min)
- [ ] Day 14: Explain the index arithmetic formula to someone else
- [ ] Day 30: Solve a variation (column-major order reshape)

**Strategy**: See [Array Fundamentals](../strategies/data-structures/arrays.md)
