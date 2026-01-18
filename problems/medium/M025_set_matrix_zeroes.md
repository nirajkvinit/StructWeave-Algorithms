---
id: M025
old_id: F073
slug: set-matrix-zeroes
title: Set Matrix Zeroes
difficulty: medium
category: medium
topics: ["matrix", "array"]
patterns: ["in-place-modification", "space-optimization"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M048", "M054", "E118"]
prerequisites: ["2d-array-basics", "in-place-algorithms"]
strategy_ref: ../strategies/data-structures/matrices.md
---
# Set Matrix Zeroes

## Problem

Given an m x n matrix of integers, modify the matrix in-place such that if any cell contains the value zero, its entire row and column are set to zero. The challenge is to accomplish this using constant extra space.

The straightforward approach would be to first scan the matrix and record which rows and columns contain zeros, then make a second pass to update the matrix. However, this requires O(m + n) extra space. The optimal solution uses the matrix itself as storage by designating the first row and first column as markers, reducing space complexity to O(1) at the cost of added complexity.

You must be careful not to set zeros prematurely. If you modify cells while scanning, you'll lose track of which zeros were original versus which were added by your algorithm. The key insight is to use a two-pass approach: first mark which rows and columns need zeroing, then perform the actual zeroing in a second pass.

**Diagram:**

Example 1: Input and Output

```
Input:                    Output:
[1, 1, 1]                 [1, 0, 1]
[1, 0, 1]  ← zero here    [0, 0, 0]  ← entire row becomes 0
[1, 1, 1]                 [1, 0, 1]
    ↑                         ↑
  column                   entire column
becomes 0                  becomes 0
```

Example 2: Multiple zeros

```
Input:                    Output:
[0, 1, 2, 0]              [0, 0, 0, 0]
[3, 4, 5, 2]              [0, 4, 5, 0]
[1, 3, 1, 5]              [0, 3, 1, 0]
↑        ↑                ↑        ↑
zeros affect              rows and columns
entire rows & cols        set to zero
```


## Why This Matters

This problem demonstrates advanced space optimization techniques essential for memory-constrained systems. In image processing applications that apply filters or transformations, matrices can be enormous (millions of pixels), making O(m × n) auxiliary space prohibitively expensive. Graphics processors and embedded systems frequently require in-place matrix modifications. The technique of using the first row and column as metadata storage is a clever example of repurposing existing data structures rather than allocating new ones. This pattern appears in systems programming, where you might need to manipulate large data structures without allocating additional memory. Interview panels use this problem to assess your understanding of space-time tradeoffs and your ability to develop progressively optimized solutions, from the O(m + n) space version to the O(1) space version that requires careful handling of the first row and column.

## Constraints

- m == matrix.length
- n == matrix[0].length
- 1 <= m, n <= 200
- -2³¹ <= matrix[i][j] <= 2³¹ - 1

## Think About

1. If you mark a cell as zero immediately, how do you know if it was originally zero?
2. What extra space could track which rows and columns need zeroing?
3. Can you reduce space by using the matrix itself for tracking?
4. What's special about the first row and column?

---

## Approach Hints

<details>
<summary>💡 Hint 1: The tracking problem</summary>

The core challenge: You need to know which rows and columns to zero, but you can't modify the matrix while scanning because you'll lose information.

**Naive approach:** Copy the matrix
- Scan original, mark zeros
- Update copy based on marks
- Space: O(m × n)

**Better approach:** Track just rows and columns
- Use two arrays: `zero_rows[]` and `zero_cols[]`
- First pass: Mark which rows/cols have zeros
- Second pass: Zero out marked rows/cols
- Space: O(m + n)

**Think about:**
- Do you really need separate arrays?
- Can the matrix itself store this information?

</details>

<details>
<summary>🎯 Hint 2: Using the matrix as storage</summary>

Key insight: Use the first row and first column as markers!

```
Original:
[1, 1, 1]     If matrix[1][1] = 0, mark:
[1, 0, 1]     - First row: matrix[0][1] = 0
[1, 1, 1]     - First column: matrix[1][0] = 0

Markers:
[1, 0, 1]     ← Marks that column 1 needs zeroing
[0, 0, 1]     ← 0 in position [1][0] marks row 1
[1, 1, 1]
↑
Marks that column 0 needs zeroing (none in this case)
```

**The problem:** What if the first row or column originally had zeros?
- Solution: Use separate flags for them!

**Algorithm outline:**
1. Check if first row/column have zeros (save in flags)
2. Use first row/column to mark other rows/columns
3. Zero out cells based on markers
4. Handle first row/column based on flags

</details>

<details>
<summary>📝 Hint 3: Complete O(1) space algorithm</summary>

```python
def setZeroes(matrix):
    m, n = len(matrix), len(matrix[0])

    # Step 1: Check if first row/column need zeroing
    first_row_zero = any(matrix[0][j] == 0 for j in range(n))
    first_col_zero = any(matrix[i][0] == 0 for i in range(m))

    # Step 2: Use first row/col as markers for other cells
    for i in range(1, m):
        for j in range(1, n):
            if matrix[i][j] == 0:
                matrix[i][0] = 0  # Mark row
                matrix[0][j] = 0  # Mark column

    # Step 3: Zero out cells based on markers
    for i in range(1, m):
        for j in range(1, n):
            if matrix[i][0] == 0 or matrix[0][j] == 0:
                matrix[i][j] = 0

    # Step 4: Handle first row and column
    if first_row_zero:
        for j in range(n):
            matrix[0][j] = 0

    if first_col_zero:
        for i in range(m):
            matrix[i][0] = 0
```

**Why it works:**
- First row/col store markers for all other cells
- Separate flags prevent overwriting original first row/col information
- Process from inside out, handling first row/col last

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Copy entire matrix | O(m×n) | O(m×n) | Simple but wastes space |
| Track rows and columns | O(m×n) | O(m+n) | Good balance |
| **Use first row/col as markers** | **O(m×n)** | **O(1)** | Optimal space, more complex |
| Set while scanning (wrong!) | O(m×n) | O(1) | Doesn't work - loses information |

**Where m = rows, n = columns**

**Why O(1) space approach wins:**
- Same O(m×n) time as other correct solutions
- Only uses 2 boolean variables (first_row_zero, first_col_zero)
- In-place modification preferred in interviews
- Demonstrates deep understanding of space optimization

**Time breakdown:**
- First pass (mark): O(m×n)
- Second pass (zero): O(m×n)
- First row/col handling: O(m+n)
- Total: O(m×n)

**Space breakdown:**
- Two boolean flags: O(1)
- No auxiliary arrays needed

---

## Common Mistakes

### 1. Setting zeros while scanning (loses information)
```python
# WRONG: Immediately zeros, can't tell original from new zeros
for i in range(m):
    for j in range(n):
        if matrix[i][j] == 0:
            # This zeros cells we haven't scanned yet!
            for k in range(n):
                matrix[i][k] = 0
            for k in range(m):
                matrix[k][j] = 0

# CORRECT: Two-pass approach with markers
# (See hint 3 above)
```

### 2. Not handling first row/column separately
```python
# WRONG: Overwrites first row/col before checking them
for i in range(m):
    for j in range(n):
        if matrix[i][j] == 0:
            matrix[i][0] = 0
            matrix[0][j] = 0

# Now we can't tell if first row/col were originally zero!

# CORRECT: Save first row/col state first
first_row_zero = any(matrix[0][j] == 0 for j in range(n))
first_col_zero = any(matrix[i][0] == 0 for i in range(m))
# Then use them as markers
```

### 3. Wrong loop bounds
```python
# WRONG: Overwrites markers in first row/col
for i in range(m):  # Should be range(1, m)
    for j in range(n):  # Should be range(1, n)
        if matrix[i][0] == 0 or matrix[0][j] == 0:
            matrix[i][j] = 0

# CORRECT: Skip first row/col during marker processing
for i in range(1, m):
    for j in range(1, n):
        if matrix[i][0] == 0 or matrix[0][j] == 0:
            matrix[i][j] = 0
```

### 4. Processing first row/col too early
```python
# WRONG: Zeros first row/col before using them as markers
if first_row_zero:
    for j in range(n):
        matrix[0][j] = 0

# Now matrix[0][j] can't mark column j!

for i in range(1, m):
    for j in range(1, n):
        if matrix[0][j] == 0:  # Wrong info!
            matrix[i][j] = 0

# CORRECT: Process first row/col LAST
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Set to specific value** | Set to X instead of 0 | Same markers, different value in step 3 |
| **Set only rows** | Don't zero columns | Only track rows, ignore columns |
| **Set only columns** | Don't zero rows | Only track columns, ignore rows |
| **Return new matrix** | Don't modify in-place | Can use O(m+n) space freely |
| **Count zero regions** | Count connected components | Use BFS/DFS on zeros |

**Set to specific value variation:**
```python
def setValueInZeroRowsCols(matrix, value):
    """Set entire row/col to 'value' if it contains a zero"""
    m, n = len(matrix), len(matrix[0])

    first_row_zero = any(matrix[0][j] == 0 for j in range(n))
    first_col_zero = any(matrix[i][0] == 0 for i in range(m))

    # Use same marking strategy
    for i in range(1, m):
        for j in range(1, n):
            if matrix[i][j] == 0:
                matrix[i][0] = 0
                matrix[0][j] = 0

    # Set to 'value' instead of 0
    for i in range(1, m):
        for j in range(1, n):
            if matrix[i][0] == 0 or matrix[0][j] == 0:
                matrix[i][j] = value

    if first_row_zero:
        for j in range(n):
            matrix[0][j] = value

    if first_col_zero:
        for i in range(m):
            matrix[i][0] = value
```

---

## Visual Walkthrough

```
Input:
[1, 1, 1]
[1, 0, 1]
[1, 1, 1]

Step 1: Check first row/col for zeros
  First row: [1, 1, 1] → No zeros, first_row_zero = False
  First col: [1, 1, 1] → No zeros, first_col_zero = False

Step 2: Mark using first row/col
  Found zero at matrix[1][1]
  → Set matrix[1][0] = 0 (mark row 1)
  → Set matrix[0][1] = 0 (mark column 1)

  After marking:
  [1, 0, 1]  ← Marks column 1
  [0, 0, 1]  ← [1][0]=0 marks row 1, [1][1]=0 was original
  [1, 1, 1]
   ↑
  Marks row 1 (none)

Step 3: Zero based on markers (skip first row/col)
  For i=1, j=1: matrix[1][0]=0 OR matrix[0][1]=0 → Set matrix[1][1]=0 ✓
  For i=1, j=2: matrix[1][0]=0 OR matrix[0][2]=1 → Set matrix[1][2]=0
  For i=2, j=1: matrix[2][0]=1 OR matrix[0][1]=0 → Set matrix[2][1]=0
  For i=2, j=2: matrix[2][0]=1 OR matrix[0][2]=1 → Keep matrix[2][2]=1

  After step 3:
  [1, 0, 1]
  [0, 0, 0]  ← Row 1 zeroed
  [1, 0, 1]  ← Column 1 zeroed
       ↑

Step 4: Handle first row/col
  first_row_zero = False → Skip
  first_col_zero = False → Skip

Final:
[1, 0, 1]
[0, 0, 0]
[1, 0, 1]
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles matrix with no zeros
- [ ] Handles matrix with zeros in middle
- [ ] Handles zeros in first row
- [ ] Handles zeros in first column
- [ ] Handles zeros in both first row and column
- [ ] Handles all zeros
- [ ] Handles single row/column matrix

**Code Quality:**
- [ ] O(1) space solution
- [ ] Correct loop bounds (starting from 1)
- [ ] Processes first row/col last
- [ ] Clean variable naming

**Interview Readiness:**
- [ ] Can explain O(m+n) space approach in 2 minutes
- [ ] Can explain O(1) space optimization in 3 minutes
- [ ] Can code O(1) solution in 12 minutes
- [ ] Can discuss why first row/col need special handling
- [ ] Can handle variations (set to different value)

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve (O(m+n) space)
- [ ] Day 3: Solve O(1) space version without hints
- [ ] Day 7: Solve "set to value X" variation
- [ ] Day 14: Explain both approaches to someone
- [ ] Day 30: Quick review and edge case testing

---

**Strategy**: See [Matrix Pattern](../../strategies/data-structures/matrices.md)
