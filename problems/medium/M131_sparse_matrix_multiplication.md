---
id: M131
old_id: I110
slug: sparse-matrix-multiplication
title: Sparse Matrix Multiplication
difficulty: medium
category: medium
topics: []
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E235", "M086", "M131"]
prerequisites: ["matrix-multiplication", "sparse-structures", "optimization"]
---
# Sparse Matrix Multiplication

## Problem

You are provided with two sparse matrices that need to be multiplied together. A sparse matrix is one where most elements are zero, which creates interesting optimization opportunities. You'll receive `mat1` with dimensions `m x k` and `mat2` with dimensions `k x n`, and your task is to compute and return their product `mat1 x mat2`.

Let's break down what makes this problem interesting. In standard matrix multiplication, to compute each element in the result matrix, you multiply corresponding elements from a row of the first matrix with a column of the second matrix, then sum those products. For example, `result[i][j] = mat1[i][0] * mat2[0][j] + mat1[i][1] * mat2[1][j] + ... + mat1[i][k-1] * mat2[k-1][j]`. The naive approach would perform all these multiplications regardless of whether elements are zero, but here's the key insight: when you multiply any number by zero, the result is zero, so those operations don't contribute to the final sum. In a sparse matrix where zeros dominate, you're potentially wasting enormous amounts of computation on meaningless operations. Your challenge is to recognize and skip these zero-multiplication operations to achieve better performance. The multiplication follows standard rules and is guaranteed to be valid based on the matrix dimensions.


**Diagram:**

```
Example: mat1 (2x3) × mat2 (3x2) = result (2x2)

mat1:                mat2:                result:
┌────┬────┬────┐    ┌────┬────┐        ┌────┬────┐
│  1 │  0 │  0 │    │  7 │  0 │        │  7 │  0 │
├────┼────┼────┤  × ├────┼────┤  =     ├────┼────┤
│ -1 │  0 │  3 │    │  0 │  0 │        │  6 │  0 │
└────┴────┴────┘    ├────┼────┤        └────┴────┘
                    │  0 │  0 │
                    └────┴────┘

Sparse optimization: Skip multiplications when element is 0
  - mat1[0][0]=1, mat2[0][0]=7 → result[0][0] += 1*7 = 7
  - mat1[1][0]=-1, mat2[0][0]=7 → result[1][0] += -1*7 = -1
  - mat1[1][2]=3, mat2[2][0]=0 → skip (0 detected)
  - Final: result[1][0] = -1 + 3*2 = 6 (if mat2[2][0]=2)
```


## Why This Matters

Sparse matrix multiplication is fundamental to numerous real-world applications where data is inherently sparse. In machine learning, recommendation systems use sparse matrices to represent user-item interactions where most users haven't interacted with most items. Graph algorithms represent social networks or web link structures as sparse adjacency matrices where each person connects to only a tiny fraction of all users. Scientific computing simulations often involve sparse matrices representing physical systems, and efficient multiplication is critical for performance in finite element analysis or computational fluid dynamics. Understanding how to optimize for sparsity teaches you to recognize data patterns and avoid unnecessary computation, a skill that transfers to many optimization problems. This isn't just about matrix math, it's about learning to exploit problem structure for dramatic performance gains.

## Examples

**Example 1:**
- Input: `mat1 = [[0]], mat2 = [[0]]`
- Output: `[[0]]`

## Constraints

- m == mat1.length
- k == mat1[i].length == mat2.length
- n == mat2[i].length
- 1 <= m, n, k <= 100
- -100 <= mat1[i][j], mat2[i][j] <= 100

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding Sparsity</summary>

A sparse matrix contains mostly zeros. The naive O(m × n × k) multiplication wastes time multiplying zeros. For each multiplication result[i][j] = sum(mat1[i][x] × mat2[x][j]), many terms are zero. Skip iterations where mat1[i][x] == 0 to avoid unnecessary multiplications.
</details>

<details>
<summary>🎯 Hint 2: Early Termination Strategy</summary>

Reorder the loops to check mat1[i][k] first. Standard order is: for i, for j, for k. Better order: for i, for k, for j. This allows checking if mat1[i][k] == 0 before the inner loop, skipping entire columns of mat2 when possible.
</details>

<details>
<summary>📝 Hint 3: Optimized Algorithm</summary>

Pseudocode:
```
result = m × n matrix of zeros
for i in range(m):
    for k in range(k):
        if mat1[i][k] != 0:  # Early check
            for j in range(n):
                if mat2[k][j] != 0:  # Secondary check
                    result[i][j] += mat1[i][k] * mat2[k][j]
```

This skips O(n) operations for each zero in mat1, dramatically improving performance for sparse matrices.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Naive Triple Loop | O(m × n × k) | O(m × n) | No optimization |
| **Reordered with Early Exit** | **O(m × k × n)** | **O(m × n)** | **Skips zeros in mat1** |
| Compressed Sparse Row (CSR) | O(nnz1 × n) | O(nnz1 + nnz2 + m×n) | nnz = non-zero count |
| Hash Map Storage | O(nnz1 × avg_col) | O(nnz1 + nnz2 + nnz_result) | Best for very sparse |

## Common Mistakes

### Mistake 1: Not Exploiting Sparsity

```python
# WRONG: Treats sparse matrix like dense matrix
def multiply(mat1, mat2):
    m, k, n = len(mat1), len(mat1[0]), len(mat2[0])
    result = [[0] * n for _ in range(m)]

    for i in range(m):
        for j in range(n):
            for x in range(k):
                result[i][j] += mat1[i][x] * mat2[x][j]  # No zero check!

    return result
```

```python
# CORRECT: Skip zeros in mat1
def multiply(mat1, mat2):
    m, k, n = len(mat1), len(mat1[0]), len(mat2[0])
    result = [[0] * n for _ in range(m)]

    for i in range(m):
        for x in range(k):
            if mat1[i][x] != 0:  # Early termination
                for j in range(n):
                    if mat2[x][j] != 0:  # Secondary check
                        result[i][j] += mat1[i][x] * mat2[x][j]

    return result
```

### Mistake 2: Inefficient Sparse Representation

```python
# WRONG: Using list of coordinates (slow lookup)
def multiply(mat1, mat2):
    # Convert to sparse format inefficiently
    sparse1 = [(i, j, mat1[i][j]) for i in range(len(mat1))
               for j in range(len(mat1[0])) if mat1[i][j] != 0]

    # Now have to search through list for each multiplication
    for i, k, val1 in sparse1:
        for x in range(len(mat2)):
            for j in range(len(mat2[0])):
                if x == k and mat2[x][j] != 0:  # Linear search!
                    # ...
```

```python
# CORRECT: Use dictionary for O(1) lookup
def multiply(mat1, mat2):
    m, k, n = len(mat1), len(mat1[0]), len(mat2[0])

    # Store non-zero elements in dict: {(row, col): value}
    sparse2 = {}
    for i in range(k):
        for j in range(n):
            if mat2[i][j] != 0:
                sparse2[(i, j)] = mat2[i][j]

    result = [[0] * n for _ in range(m)]
    for i in range(m):
        for x in range(k):
            if mat1[i][x] != 0:
                for j in range(n):
                    if (x, j) in sparse2:
                        result[i][j] += mat1[i][x] * sparse2[(x, j)]

    return result
```

### Mistake 3: Not Initializing Result Matrix Properly

```python
# WRONG: Accumulating into undefined matrix
def multiply(mat1, mat2):
    m, n = len(mat1), len(mat2[0])
    result = []  # Wrong initialization

    for i in range(m):
        for j in range(n):
            result[i][j] += mat1[i][j] * mat2[i][j]  # IndexError!
```

```python
# CORRECT: Initialize with zeros
def multiply(mat1, mat2):
    m, k, n = len(mat1), len(mat1[0]), len(mat2[0])
    result = [[0] * n for _ in range(m)]  # Proper initialization

    for i in range(m):
        for x in range(k):
            if mat1[i][x] != 0:
                for j in range(n):
                    if mat2[x][j] != 0:
                        result[i][j] += mat1[i][x] * mat2[x][j]

    return result
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| Dense Matrix Multiplication | No sparse optimization | Standard triple loop O(m×k×n) |
| Strassen's Algorithm | Faster for large dense matrices | O(n^2.807) divide-and-conquer |
| Compressed Sparse Format | Use CSR/CSC representation | More complex but faster for very sparse |
| Boolean Matrix Multiplication | Entries are 0 or 1 | Can use bitwise operations |
| Matrix Chain Multiplication | Multiply sequence of matrices | Dynamic programming for ordering |
| Parallel Matrix Multiplication | Use multiple threads/GPUs | Partition work across processors |

## Practice Checklist

- [ ] Day 1: Implement with early termination optimization
- [ ] Day 2: Implement using dictionary for mat2
- [ ] Day 3: Solve without hints
- [ ] Day 7: Compare performance: sparse vs dense
- [ ] Day 14: Speed test - solve in 15 minutes
- [ ] Day 30: Implement CSR format solution

**Strategy**: See [Matrix Patterns](../strategies/patterns/dp-2d.md)
