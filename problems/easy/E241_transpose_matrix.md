---
id: E241
old_id: A334
slug: transpose-matrix
title: Transpose Matrix
difficulty: easy
category: easy
topics: ["array", "matrix"]
patterns: ["matrix-manipulation"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["2d-arrays", "matrix-basics"]
related_problems: ["E048", "M054", "M048"]
strategy_ref: ../strategies/data-structures/arrays.md
---
# Transpose Matrix

## Problem

You are given a 2D integer array called `matrix`, and your task is to compute its transpose. Transposing a matrix is a fundamental linear algebra operation where you reflect the matrix across its main diagonal (the diagonal running from the top-left to bottom-right). This operation effectively swaps the rows and columns: the first row becomes the first column, the second row becomes the second column, and so on.

More precisely, if the original matrix has an element at position `(i, j)` (row `i`, column `j`), that element moves to position `(j, i)` in the transposed matrix. For example, in a 3×3 matrix, the element at position (0, 2) — first row, third column — moves to position (2, 0) — third row, first column.

Here's an important dimension consideration: if your input matrix is `m × n` (m rows and n columns), the transposed matrix will be `n × m` (n rows and m columns). The dimensions swap along with the data. This means you'll need to create a new matrix with swapped dimensions to hold the result. For a 2×3 matrix, you'll create a 3×2 result matrix.

Let's visualize this with a simple example:
```
Original (2×3):        Transposed (3×2):
[1  2  3]              [1  4]
[4  5  6]      =>      [2  5]
                       [3  6]
```

Notice how the first row `[1, 2, 3]` becomes the first column, and the second row `[4, 5, 6]` becomes the second column. Each element's row index becomes its column index and vice versa.

One special case worth noting: if you have a square matrix (same number of rows and columns), the transpose can potentially be done in-place by swapping elements across the diagonal. However, for non-square matrices, you must create a new matrix with different dimensions, making in-place transposition impossible without complex cycle-following algorithms.

## Why This Matters

Matrix transposition is one of the most fundamental operations in linear algebra and appears throughout computer science, mathematics, and engineering. Understanding how to manipulate matrix dimensions and indices is essential for anyone working with multi-dimensional data.

In machine learning and data science, transposition is ubiquitous. Neural networks constantly transpose weight matrices during forward and backward propagation. When you multiply matrices, you often need to transpose one of them to make the dimensions compatible. Libraries like NumPy, TensorFlow, and PyTorch all provide efficient transpose operations because they're so frequently needed. Understanding the index transformations helps you debug dimension mismatch errors and optimize memory access patterns.

Computer graphics and game engines use matrix transposition for coordinate system transformations. When converting between row-major and column-major matrix representations, or when applying certain geometric transformations, transposition is a core operation. The GPU programming model often requires understanding how matrix layouts affect memory access patterns and performance.

In database systems and data analysis, transposing data (also called "pivoting") converts row-oriented data to column-oriented format and vice versa. This operation appears when reshaping data for different analyses, converting between wide and long data formats, and optimizing query performance. Spreadsheet operations like "paste transpose" implement this exact algorithm.

Image processing uses matrix transposition for rotating images and applying filters. When you rotate an image 90 degrees, you're essentially transposing the pixel matrix and potentially reversing rows or columns. Understanding the index mapping helps you implement efficient image transformations.

From an algorithmic perspective, this problem teaches you essential skills in multi-dimensional array manipulation: correctly managing nested loops, handling index transformations, and understanding how array dimensions affect algorithm design. These skills transfer to numerous problems involving 2D arrays, dynamic programming tables, and grid-based algorithms.

## Examples

**Example 1:**
- Input: `matrix = [[1,2,3],[4,5,6],[7,8,9]]`
- Output: `[[1,4,7],[2,5,8],[3,6,9]]`

**Example 2:**
- Input: `matrix = [[1,2,3],[4,5,6]]`
- Output: `[[1,4],[2,5],[3,6]]`

## Constraints

- m == matrix.length
- n == matrix[i].length
- 1 <= m, n <= 1000
- 1 <= m * n <= 10⁵
- -10⁹ <= matrix[i][j] <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1 - Conceptual Foundation
Think about the dimensions of the result. If the input matrix is m x n (m rows, n columns), what are the dimensions of the transposed matrix? For each element at position (i, j) in the original matrix, where does it go in the transposed matrix?

### Hint 2 - Construction Strategy
Create a new matrix with swapped dimensions. The first row of the original matrix becomes the first column of the transposed matrix. The second row becomes the second column, and so on. Can you express this relationship using nested loops?

### Hint 3 - Implementation Strategy
Initialize a result matrix with dimensions n x m (swapped). Use two nested loops: the outer loop iterates through rows of the original matrix (0 to m-1), the inner loop through columns (0 to n-1). For each position (i, j), place matrix[i][j] at position (j, i) in the result.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Create New Matrix | O(m * n) | O(m * n) | Visit each element once, create new matrix |
| In-Place (Square Matrix) | O(n²) | O(1) | Only works for square matrices, swap along diagonal |
| In-Place (General) | O(m * n) | O(1) | Complex, uses cycle-following algorithm |

## Common Mistakes

### Mistake 1: Wrong Result Dimensions
```python
# INCORRECT: Creates result with same dimensions as input
def transpose(matrix):
    m, n = len(matrix), len(matrix[0])
    result = [[0] * n for _ in range(m)]  # Wrong: should be n rows, m columns

    for i in range(m):
        for j in range(n):
            result[i][j] = matrix[j][i]  # IndexError when m != n
    return result
```
**Why it's wrong:** The transposed matrix has dimensions n x m, not m x n. Using the original dimensions causes index errors for non-square matrices.

**Correct approach:**
```python
# CORRECT: Swap dimensions for result matrix
def transpose(matrix):
    m, n = len(matrix), len(matrix[0])
    result = [[0] * m for _ in range(n)]  # Correct: n rows, m columns

    for i in range(m):
        for j in range(n):
            result[j][i] = matrix[i][j]  # Correct index swap
    return result
```

### Mistake 2: Trying In-Place for Non-Square Matrix
```python
# INCORRECT: Cannot transpose non-square matrix in-place with simple swaps
def transpose(matrix):
    m, n = len(matrix), len(matrix[0])
    # Try to swap elements along diagonal
    for i in range(m):
        for j in range(i + 1, n):  # Error: assumes square matrix
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    return matrix
```
**Why it's wrong:** In-place transposition with simple swaps only works for square matrices. Non-square matrices change dimensions when transposed, requiring a different structure.

**Correct approach:**
```python
# CORRECT: Use separate result matrix for general case
def transpose(matrix):
    return [[matrix[i][j] for i in range(len(matrix))]
            for j in range(len(matrix[0]))]
```

### Mistake 3: Index Confusion
```python
# INCORRECT: Swapping indices in the wrong place
def transpose(matrix):
    m, n = len(matrix), len(matrix[0])
    result = [[0] * m for _ in range(n)]

    for i in range(m):
        for j in range(n):
            result[i][j] = matrix[j][i]  # Wrong: i and j not swapped properly
    return result
```
**Why it's wrong:** When i goes from 0 to m-1 and result has n rows, accessing result[i] when i >= n causes an error. The assignment position should be [j][i], not [i][j].

## Problem Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Rotate Image 90 Degrees | Medium | Transpose then reverse each row |
| Rotate Matrix In-Place | Medium | Perform rotation without extra space |
| Diagonal Traverse | Medium | Traverse matrix diagonally |
| Spiral Matrix | Medium | Traverse matrix in spiral order |
| Set Matrix Zeroes | Medium | Mark rows/columns to zero based on conditions |

## Practice Checklist

- [ ] First solve: Implement with new matrix correctly
- [ ] Handle edge cases: Single row, single column, square matrix
- [ ] Optimize: Use list comprehension for cleaner code
- [ ] Review after 1 day: Explain dimension transformation clearly
- [ ] Review after 1 week: Implement in-place version for square matrix
- [ ] Interview ready: Extend to rotation and other matrix transformations

## Strategy

**Pattern**: Matrix Manipulation
- Master index transformations in 2D arrays
- Understand row-column relationships
- Learn dimension analysis for matrix operations

See [Arrays Strategy](../strategies/data-structures/arrays.md) for the complete strategy guide.
