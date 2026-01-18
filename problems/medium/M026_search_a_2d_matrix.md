---
id: M026
old_id: F074
slug: search-a-2d-matrix
title: Search a 2D Matrix
difficulty: medium
category: medium
topics: ["matrix", "binary-search"]
patterns: ["binary-search", "matrix-flattening"]
estimated_time_minutes: 25
frequency: high
related_problems: ["M240", "E704", "M033"]
prerequisites: ["binary-search", "2d-array-basics"]
strategy_ref: ../strategies/patterns/binary-search.md
---
# Search a 2D Matrix

## Problem

Write an efficient algorithm to search for a target value in an m x n matrix of integers. The matrix has two special properties that enable fast searching. First, each row is sorted in ascending order from left to right. Second, the first integer of each row is greater than the last integer of the previous row. These two properties combined mean that if you were to concatenate all rows together, you would have one fully sorted sequence.

For example, the matrix [[1,3,5,7],[10,11,16,20],[23,30,34,60]] behaves like the sorted array [1,3,5,7,10,11,16,20,23,30,34,60]. Your algorithm should determine whether the target exists in the matrix, returning true if found and false otherwise.

The key insight is recognizing that you can apply binary search on this matrix by treating it as a virtual 1D array. Using index arithmetic, you can convert between 1D indices and 2D coordinates: for a matrix with n columns, the 1D index i maps to row i / n and column i % n. This allows you to perform binary search in O(log(m × n)) time without actually flattening the matrix.

**Diagram:**

Example 1: Search for target = 3

```
Matrix (sorted rows, first element of each row > last element of previous row):
[ 1,  3,  5,  7]
[10, 11, 16, 20]
[23, 30, 34, 60]
     ↑
   target found at position (0,1)
```

Example 2: Search for target = 13

```
Matrix:
[ 1,  3,  5,  7]
[10, 11, 16, 20]
[23, 30, 34, 60]

Target 13 is not in the matrix → return false
```

Properties: Each row is sorted, and the first integer of each row is greater than the last integer of the previous row.


## Why This Matters

This problem teaches you to recognize when a 2D structure can be treated as 1D, enabling more efficient algorithms. Database query optimizers use similar techniques when searching sorted multi-dimensional indexes. In large-scale data systems, matrices representing time-series data, image pixel values, or numerical simulations often have sorted properties that enable logarithmic search instead of linear scans. The index mapping technique (converting between 1D and 2D coordinates) is fundamental in computer graphics, where texture coordinates must be converted to linear memory addresses. This problem frequently appears in interviews because it tests your ability to apply binary search creatively, recognize problem structure, and handle coordinate transformations correctly. Understanding this pattern prepares you for more complex problems involving row-wise and column-wise sorted matrices where different search strategies apply.

## Constraints

- m == matrix.length
- n == matrix[i].length
- 1 <= m, n <= 100
- -10⁴ <= matrix[i][j], target <= 10⁴

## Think About

1. What property makes this matrix special for searching?
2. How can you think of this 2D matrix as a 1D sorted array?
3. If you know an index in a flattened array, how do you find (row, col)?
4. Can binary search work here?

---

## Approach Hints

<details>
<summary>💡 Hint 1: The key property</summary>

This isn't just any 2D matrix - it has a special property:

**Each row is sorted AND the first element of each row > last element of previous row**

```
[ 1,  3,  5,  7]  ← sorted, max = 7
[10, 11, 16, 20]  ← sorted, min (10) > previous max (7)
[23, 30, 34, 60]  ← sorted, min (23) > previous max (20)
```

**What this means:** If you "flatten" this matrix, it becomes a single sorted array!

```
[1, 3, 5, 7, 10, 11, 16, 20, 23, 30, 34, 60]
```

**Think about:**
- Can you do binary search on this flattened view?
- How do you map a 1D index to (row, col)?

</details>

<details>
<summary>🎯 Hint 2: Index mapping</summary>

You can perform binary search on a "virtual" 1D array without actually creating it!

**Index conversion formulas:**
- Matrix: `m` rows, `n` columns
- 1D index: `i` (from 0 to m×n - 1)

```
1D index → 2D coordinates:
  row = i // n
  col = i % n

Example: m=3, n=4 (12 elements total)
  Index 5 → row = 5 // 4 = 1, col = 5 % 4 = 1
  matrix[1][1]

2D coordinates → 1D index:
  i = row × n + col

Example: (1, 1) → i = 1 × 4 + 1 = 5
```

**Application to binary search:**
```
left = 0
right = m × n - 1

while left <= right:
    mid = (left + right) // 2
    mid_value = matrix[mid // n][mid % n]

    if mid_value == target:
        return True
    elif mid_value < target:
        left = mid + 1
    else:
        right = mid - 1

return False
```

</details>

<details>
<summary>📝 Hint 3: Complete binary search solution</summary>

```python
def searchMatrix(matrix, target):
    if not matrix or not matrix[0]:
        return False

    m, n = len(matrix), len(matrix[0])
    left, right = 0, m * n - 1

    while left <= right:
        mid = (left + right) // 2
        # Convert 1D index to 2D coordinates
        row = mid // n
        col = mid % n
        mid_value = matrix[row][col]

        if mid_value == target:
            return True
        elif mid_value < target:
            left = mid + 1
        else:
            right = mid - 1

    return False
```

**Time complexity:** O(log(m × n))
**Space complexity:** O(1)

**Why it works:**
- The sorted property allows binary search
- Index mapping provides O(1) access to any element
- No need to actually flatten the matrix

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Linear scan | O(m×n) | O(1) | Simple but ignores sorted property |
| Binary search on each row | O(m log n) | O(1) | Better, but still doesn't fully utilize structure |
| **Binary search (treat as 1D)** | **O(log(m×n))** | **O(1)** | Optimal - fully exploits sorted property |
| Flatten then search | O(m×n) | O(m×n) | Same result but wastes time and space |

**Where m = rows, n = columns**

**Why 1D binary search wins:**
- O(log(m×n)) time: Logarithmic in total elements
- O(1) space: No auxiliary data structures
- Fully utilizes the sorted property
- Single pass through virtual array

**Time comparison example (100×100 matrix):**
- Linear scan: 10,000 comparisons worst case
- Binary search per row: 100 × log(100) ≈ 664 comparisons
- 1D binary search: log(10,000) ≈ 13 comparisons

**Space breakdown:**
- Index variables: O(1)
- No array creation needed

---

## Common Mistakes

### 1. Not utilizing the sorted property
```python
# WRONG: Linear scan ignores that matrix is sorted
def searchMatrix(matrix, target):
    for row in matrix:
        for val in row:
            if val == target:
                return True
    return False
# O(m×n) time - ignores sorted property!

# CORRECT: Use binary search (see hint 3)
```

### 2. Incorrect index conversion
```python
# WRONG: Swapped row/col calculation
row = mid % n  # Should be mid // n
col = mid // n  # Should be mid % n

# CORRECT:
row = mid // n  # Integer division gives row
col = mid % n   # Remainder gives column
```

### 3. Off-by-one in search range
```python
# WRONG: Right index too large
right = m * n  # Should be m * n - 1

# Matrix has m*n elements (0 to m*n-1)
# Setting right = m*n causes index out of bounds

# CORRECT:
right = m * n - 1
```

### 4. Not handling empty matrix
```python
# WRONG: Crashes on empty matrix
m, n = len(matrix), len(matrix[0])  # matrix[0] fails if matrix is empty!

# CORRECT: Check first
if not matrix or not matrix[0]:
    return False
m, n = len(matrix), len(matrix[0])
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Matrix not fully sorted** | Rows sorted, but not across rows | Binary search to find row, then search in row |
| **Search in row/col sorted matrix** | Each row sorted, each col sorted | Start top-right or bottom-left, move strategically |
| **Return position instead of bool** | Return (row, col) or -1 | Same algo, return (row, col) when found |
| **Find closest value** | Find value nearest to target | Track best match during binary search |
| **Count occurrences** | Matrix may have duplicates | Find first and last occurrence |

**Search in row/col sorted matrix (M240):**
```python
def searchMatrix240(matrix, target):
    """
    Each row sorted left to right.
    Each column sorted top to bottom.
    BUT first of row may not be > last of previous row.
    """
    if not matrix or not matrix[0]:
        return False

    m, n = len(matrix), len(matrix[0])
    # Start from top-right corner
    row, col = 0, n - 1

    while row < m and col >= 0:
        if matrix[row][col] == target:
            return True
        elif matrix[row][col] > target:
            col -= 1  # Move left
        else:
            row += 1  # Move down

    return False

# Time: O(m + n), Space: O(1)
```

**Return position variation:**
```python
def searchMatrixPosition(matrix, target):
    """Returns (row, col) if found, else (-1, -1)"""
    if not matrix or not matrix[0]:
        return (-1, -1)

    m, n = len(matrix), len(matrix[0])
    left, right = 0, m * n - 1

    while left <= right:
        mid = (left + right) // 2
        row, col = mid // n, mid % n
        mid_value = matrix[row][col]

        if mid_value == target:
            return (row, col)  # Found!
        elif mid_value < target:
            left = mid + 1
        else:
            right = mid - 1

    return (-1, -1)  # Not found
```

---

## Visual Walkthrough

```
Matrix (3×4):
[ 1,  3,  5,  7]
[10, 11, 16, 20]
[23, 30, 34, 60]

Target: 16

Flattened view (conceptual):
Index: 0  1  2  3  4  5  6  7  8  9  10 11
Value: 1  3  5  7 10 11 16 20 23 30 34 60

Binary search:
Initial: left=0, right=11

Iteration 1:
  mid = (0 + 11) // 2 = 5
  row = 5 // 4 = 1, col = 5 % 4 = 1
  matrix[1][1] = 11
  11 < 16, so left = mid + 1 = 6

Iteration 2:
  mid = (6 + 11) // 2 = 8
  row = 8 // 4 = 2, col = 8 % 4 = 0
  matrix[2][0] = 23
  23 > 16, so right = mid - 1 = 7

Iteration 3:
  mid = (6 + 7) // 2 = 6
  row = 6 // 4 = 1, col = 6 % 4 = 2
  matrix[1][2] = 16
  Found! Return True
```

**Mapping visualization:**
```
1D index → 2D coordinates (for 3×4 matrix):

Index 0  → 0//4=0, 0%4=0 → (0,0) → 1
Index 1  → 1//4=0, 1%4=1 → (0,1) → 3
Index 2  → 2//4=0, 2%4=2 → (0,2) → 5
Index 3  → 3//4=0, 3%4=3 → (0,3) → 7
Index 4  → 4//4=1, 4%4=0 → (1,0) → 10
Index 5  → 5//4=1, 5%4=1 → (1,1) → 11
Index 6  → 6//4=1, 6%4=2 → (1,2) → 16  ← Found here!
...
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles target in matrix
- [ ] Handles target not in matrix
- [ ] Handles target smaller than all elements
- [ ] Handles target larger than all elements
- [ ] Handles empty matrix
- [ ] Handles single-element matrix
- [ ] Handles single-row matrix
- [ ] Handles single-column matrix

**Code Quality:**
- [ ] Correct index conversion (row = mid // n, col = mid % n)
- [ ] Proper bounds (right = m × n - 1)
- [ ] Empty matrix check
- [ ] Clean binary search logic

**Interview Readiness:**
- [ ] Can explain why matrix can be treated as 1D array
- [ ] Can derive index conversion formulas
- [ ] Can code solution in 8 minutes
- [ ] Can discuss time complexity (log(m×n) vs m log n)
- [ ] Can handle M240 variation (row/col sorted)

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve M240 variation (row/col sorted)
- [ ] Day 14: Explain index mapping to someone
- [ ] Day 30: Quick review and complexity analysis

---

**Strategy**: See [Binary Search Pattern](../../strategies/patterns/binary-search.md)
