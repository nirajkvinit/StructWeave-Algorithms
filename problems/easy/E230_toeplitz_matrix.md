---
id: E230
old_id: A233
slug: toeplitz-matrix
title: Toeplitz Matrix
difficulty: easy
category: easy
topics: ["matrix", "array"]
patterns: ["matrix-traversal"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["2d-array", "matrix-navigation"]
related_problems: ["E054", "E048", "M073"]
strategy_ref: ../strategies/data-structures/matrix.md
---
# Toeplitz Matrix

## Problem

A **Toeplitz matrix** has a special property: every diagonal running from the top-left toward the bottom-right contains identical values. Given a rectangular matrix with `m` rows and `n` columns, determine whether it satisfies this property.

To understand what "diagonal" means here, consider the matrix as a grid where each diagonal starts from either the first row or the first column and proceeds down-right. For example, in a 3x4 matrix, one diagonal might be positions (0,0), (1,1), (2,2), while another is (0,1), (1,2), (2,3). All elements along each of these diagonals must be the same for the matrix to be Toeplitz.

The key insight is that two cells are on the same diagonal if the difference between their row and column indices is constant. Cell (i, j) and cell (i+1, j+1) are on the same diagonal. This means you can verify the property efficiently by comparing each cell with its upper-left neighbor, rather than tracking entire diagonals separately.

The matrix doesn't have to be square, so you'll have diagonals of different lengths. Edge cells in the first row and first column don't have an upper-left neighbor, so they automatically satisfy the property.


**Diagram:**

```
Example 1: Toeplitz matrix (returns true)
[
  [1, 2, 3, 4],
  [5, 1, 2, 3],
  [9, 5, 1, 2]
]

Diagonals (each diagonal has same values):
  1 2 3 4
  5 1 2 3
  9 5 1 2

  ╲ ╲ ╲ ╲
   ╲ ╲ ╲
    ╲ ╲

Diagonal 1: [1, 1, 1] ✓
Diagonal 2: [2, 2, 2] ✓
Diagonal 3: [3, 3] ✓
Diagonal 4: [4] ✓
Diagonal 5: [5, 5] ✓
Diagonal 6: [9] ✓

Example 2: Not Toeplitz (returns false)
[
  [1, 2],
  [2, 2]
]

Diagonal starting at [0,0]: [1, 2] - not all same ✗
```


## Why This Matters

Toeplitz matrices appear in signal processing, time series analysis, and solving linear systems of equations. They have special mathematical properties that allow for faster algorithms. For example, multiplying a Toeplitz matrix by a vector can be optimized using FFT (Fast Fourier Transform), reducing complexity from O(n²) to O(n log n).

This problem teaches you to recognize mathematical patterns in 2D structures and find efficient ways to verify properties. The technique of comparing each element with a specific neighbor (rather than collecting all elements in a category) is a common optimization pattern that reduces space complexity from O(n) to O(1).

Matrix traversal and index manipulation are fundamental skills for working with images, grids in games, spreadsheet data, and scientific computing. Understanding diagonal relationships helps with problems involving chess boards, image rotation, and dynamic programming on grids.

## Constraints

- m == matrix.length
- n == matrix[i].length
- 1 <= m, n <= 20
- 0 <= matrix[i][j] <= 99

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Understanding Diagonals
A Toeplitz matrix has the property that every diagonal from top-left to bottom-right contains the same values. How can you check if two cells are on the same diagonal? What relationship exists between their row and column indices?

### Tier 2: Efficient Comparison
Instead of tracking all diagonals separately, can you check the property while iterating through the matrix? For each cell at position (i, j), which other cell must it equal for the Toeplitz property to hold? Think about the cell that's one row up and one column to the left.

### Tier 3: Boundary Handling
When checking if matrix[i][j] equals matrix[i-1][j-1], you need to make sure i-1 and j-1 are valid indices. Which rows and columns don't have a cell to compare with in the upper-left direction? Can you skip checking the first row and first column?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Diagonal Tracking | O(m × n) | O(m + n) | Store values for each of m+n-1 diagonals |
| Cell-by-Cell Comparison | O(m × n) | O(1) | Compare each cell with its upper-left neighbor |
| Diagonal Extraction | O(m × n) | O(max(m,n)) | Extract and validate each diagonal separately |

Where m = number of rows, n = number of columns

## Common Mistakes

### Mistake 1: Wrong Diagonal Relationship
```python
# Wrong: Checks wrong direction or wrong neighbor
def isToeplitzMatrix(matrix):
    for i in range(len(matrix)):
        for j in range(len(matrix[0])):
            if i > 0 and j > 0:
                if matrix[i][j] != matrix[i][j-1]:  # Wrong: checking left, not upper-left
                    return False
    return True

# Correct: Check upper-left diagonal neighbor
if matrix[i][j] != matrix[i-1][j-1]:
    return False
```

### Mistake 2: Not Handling First Row/Column
```python
# Wrong: Tries to access invalid indices
def isToeplitzMatrix(matrix):
    for i in range(len(matrix)):
        for j in range(len(matrix[0])):
            if matrix[i][j] != matrix[i-1][j-1]:  # Fails when i=0 or j=0
                return False
    return True

# Correct: Skip first row and column
for i in range(1, len(matrix)):
    for j in range(1, len(matrix[0])):
        if matrix[i][j] != matrix[i-1][j-1]:
            return False
```

### Mistake 3: Overcomplicated Diagonal Storage
```python
# Wrong: Unnecessary complexity and space usage
def isToeplitzMatrix(matrix):
    diagonals = {}
    for i in range(len(matrix)):
        for j in range(len(matrix[0])):
            key = i - j  # Diagonal identifier
            if key not in diagonals:
                diagonals[key] = matrix[i][j]
            elif diagonals[key] != matrix[i][j]:
                return False
    return True

# Correct: Simple comparison without extra storage
# See Mistake 2 for cleaner approach
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Anti-Toeplitz Matrix | Easy | Check if diagonals from top-right to bottom-left are constant. |
| Toeplitz Submatrix | Medium | Find largest Toeplitz submatrix within a given matrix. |
| Make Toeplitz | Medium | Minimum changes needed to make matrix Toeplitz. |
| Generalized Diagonal | Medium | Check if matrix satisfies property for k-offset diagonals. |
| Circular Toeplitz | Hard | Matrix where diagonals wrap around edges (torus topology). |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Solved with O(1) space approach
- [ ] Handled edge case: 1x1 matrix
- [ ] Handled edge case: single row matrix
- [ ] Handled edge case: single column matrix
- [ ] Handled edge case: all elements are the same
- [ ] Tested with non-square matrix
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Can explain approach to someone else

**Strategy**: See [Matrix Traversal Patterns](../strategies/data-structures/matrix.md)
