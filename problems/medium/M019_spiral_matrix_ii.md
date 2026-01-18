---
id: M019
old_id: F059
slug: spiral-matrix-ii
title: Spiral Matrix II
difficulty: medium
category: medium
topics: ["array", "matrix", "simulation"]
patterns: ["matrix-traversal", "direction-simulation"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M013", "M015", "E186"]
prerequisites: ["2d-arrays", "boundary-tracking"]
strategy_ref: ../strategies/data-structures/arrays.md
---

# Spiral Matrix II

## Problem

Generate an n×n matrix (square grid) filled with consecutive integers from 1 to n² arranged in a clockwise spiral pattern starting from the top-left corner. Instead of reading an existing matrix in spiral order, you're creating one by filling cells in that pattern.

The spiral follows a "right, down, left, up" cycle that repeats while spiraling inward. For n=3, you fill positions: top row (1,2,3), right column (4,5), bottom row (6,7), left column (8), then the center (9).

The implementation challenge is identical to reading a spiral (Spiral Matrix I) but in reverse: instead of collecting values, you're placing them. You manage four boundaries (top, bottom, left, right) that shrink after completing each direction. After filling the top row, increment the top boundary; after filling the right column, decrement the right boundary, and so on.

Edge cases include odd vs. even dimensions (odd n has a center element; even n doesn't) and correctly handling the stopping condition when boundaries meet or cross.

```
Example visualization for n=3:

Filling order → → →
                  ↓
              ↑   ↓
              ↑ ← ←

Result matrix:
1 → 2 → 3
        ↓
8 → 9   4
↑       ↓
7 ← 6 ← 5

[[1, 2, 3],
 [8, 9, 4],
 [7, 6, 5]]
```

## Why This Matters

This is the "write" counterpart to the spiral matrix reading problem, testing whether you truly understand the boundary management pattern rather than just memorizing code. The fact that you're generating rather than reading forces you to think about the algorithm's structure more carefully.

**Real-world applications:**
- **Data visualization**: Generating spiral heatmaps or clock-like circular data displays
- **Image generation**: Creating procedural textures with spiral patterns for graphics
- **Memory layout optimization**: Organizing cache-friendly data access patterns
- **Printing algorithms**: Controlling print head movement to minimize mechanical wear
- **Game development**: Generating spiral level layouts or enemy spawn patterns
- **Scientific computing**: Creating spiral sampling grids for numerical simulations
- **Puzzle generation**: Creating number spiral puzzles like Ulam's prime spiral

Interviewers use this to verify you understand boundary tracking deeply enough to apply it in both directions (read vs. write). The subtle differences in loop ranges and boundary updates between reading and writing spirals reveal whether you're thinking or just pattern-matching. It's also a good follow-up question after Spiral Matrix I to see if you can adapt your solution.

## Examples

**Example 1:**
- Input: `n = 3`
- Output: `[[1,2,3],[8,9,4],[7,6,5]]`
- Explanation: Fill the 3×3 matrix in spiral order from 1 to 9.

**Example 2:**
- Input: `n = 1`
- Output: `[[1]]`
- Explanation: Single cell matrix.

**Example 3:**
- Input: `n = 4`
- Output:
```
[[ 1,  2,  3, 4],
 [12, 13, 14, 5],
 [11, 16, 15, 6],
 [10,  9,  8, 7]]
```

## Constraints

- 1 <= n <= 20

## Think About

1. How do you determine when to change direction?
2. What boundaries need to be updated after each direction?
3. Can you use a layer-by-layer approach instead?
4. How many elements should be filled in total?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Direction vectors and boundaries</summary>

Track four boundaries and move in a cyclic pattern: right → down → left → up.

```
Boundaries for n=4:
top = 0, bottom = 3
left = 0, right = 3

Direction cycle:
1. Right: (top row, left to right)
   Fill row `top`, increment `top`
2. Down: (right column, top to bottom)
   Fill column `right`, decrement `right`
3. Left: (bottom row, right to left)
   Fill row `bottom`, decrement `bottom`
4. Up: (left column, bottom to top)
   Fill column `left`, increment `left`
5. Repeat until all cells filled
```

**Key insight:** After each direction, shrink the corresponding boundary.

</details>

<details>
<summary>🎯 Hint 2: Layer-by-layer approach</summary>

Think of the matrix as concentric square layers. Fill each layer from outside to inside.

```
For n=4:

Layer 0 (outermost):
→ → → →
↓     ↓
↓     ↓
→ → → ↑

Layer 1 (inner):
    → →
    ↓ ↓
    → ↑

Number of layers = ⌈n/2⌉
```

For each layer at depth `layer`:
- Top row: `(layer, layer)` to `(layer, n-1-layer)`
- Right column: `(layer+1, n-1-layer)` to `(n-1-layer, n-1-layer)`
- Bottom row: `(n-1-layer, n-2-layer)` to `(n-1-layer, layer)`
- Left column: `(n-2-layer, layer)` to `(layer+1, layer)`

</details>

<details>
<summary>📝 Hint 3: Direction-based simulation</summary>

```
def generateMatrix(n):
    matrix = [[0] * n for _ in range(n)]

    top, bottom = 0, n - 1
    left, right = 0, n - 1
    num = 1

    while top <= bottom and left <= right:
        # Move right along top row
        for col in range(left, right + 1):
            matrix[top][col] = num
            num += 1
        top += 1

        # Move down along right column
        for row in range(top, bottom + 1):
            matrix[row][right] = num
            num += 1
        right -= 1

        # Move left along bottom row
        for col in range(right, left - 1, -1):
            matrix[bottom][col] = num
            num += 1
        bottom -= 1

        # Move up along left column
        for row in range(bottom, top - 1, -1):
            matrix[row][left] = num
            num += 1
        left += 1

    return matrix
```

**Key points:**
- Four separate loops for four directions
- Update boundaries after each direction
- `num` increments continuously from 1 to n²

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **Layer-by-layer traversal** | **O(n²)** | **O(n²)** | Clean, easy to understand |
| Direction simulation | O(n²) | O(n²) | Similar, slightly more complex |
| Recursive spiral fill | O(n²) | O(n² + n) | Extra recursion stack space |

**Why layer-by-layer wins:**
- Clear boundary management
- Easy to visualize and debug
- No complex direction logic

**Time breakdown:**
- Must fill n² cells
- Each cell visited exactly once
- Total: O(n²)

**Space breakdown:**
- Output matrix: O(n²)
- Boundary variables: O(1)
- No extra data structures

---

## Common Mistakes

### 1. Incorrect loop ranges
```python
# WRONG: Doesn't handle boundary correctly
for col in range(left, right):  # Misses last column
    matrix[top][col] = num

# CORRECT: Include right boundary
for col in range(left, right + 1):
    matrix[top][col] = num
```

### 2. Not updating boundaries
```python
# WRONG: Boundaries never shrink
for col in range(left, right + 1):
    matrix[top][col] = num
# Missing: top += 1

# CORRECT: Update after each direction
for col in range(left, right + 1):
    matrix[top][col] = num
top += 1  # Shrink boundary
```

### 3. Wrong loop direction
```python
# WRONG: Moving left should decrement
for col in range(right, left + 1):  # Ascending!
    matrix[bottom][col] = num

# CORRECT: Use descending range
for col in range(right, left - 1, -1):
    matrix[bottom][col] = num
```

### 4. Off-by-one in stopping condition
```python
# WRONG: Stops too early
while top < bottom and left < right:
    # ... fill ...

# CORRECT: Include equal case for odd n
while top <= bottom and left <= right:
    # ... fill ...
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Spiral Matrix I** | Read instead of write | Same traversal, collect values |
| **Spiral order (different start)** | Start from center | Reverse the spiral direction |
| **Rectangular matrix** | m × n matrix | Use separate m, n boundaries |
| **Diagonal traversal** | Zigzag pattern | Different direction logic |
| **Snake pattern** | Alternate row direction | Simpler: toggle direction per row |

**Reading spiral (Spiral Matrix I):**
```python
def spiralOrder(matrix):
    if not matrix:
        return []

    m, n = len(matrix), len(matrix[0])
    top, bottom = 0, m - 1
    left, right = 0, n - 1
    result = []

    while top <= bottom and left <= right:
        # Right
        for col in range(left, right + 1):
            result.append(matrix[top][col])
        top += 1

        # Down
        for row in range(top, bottom + 1):
            result.append(matrix[row][right])
        right -= 1

        # Left (check if row still exists)
        if top <= bottom:
            for col in range(right, left - 1, -1):
                result.append(matrix[bottom][col])
            bottom -= 1

        # Up (check if column still exists)
        if left <= right:
            for row in range(bottom, top - 1, -1):
                result.append(matrix[row][left])
            left += 1

    return result
```

---

## Visual Walkthrough

```
n = 3, generate 3×3 matrix

Initial state:
  matrix = [[0,0,0], [0,0,0], [0,0,0]]
  top=0, bottom=2, left=0, right=2, num=1

Iteration 1:
  Right: Fill row 0, cols 0→2
    matrix[0][0]=1, matrix[0][1]=2, matrix[0][2]=3
    num=4, top=1
    [[1,2,3], [0,0,0], [0,0,0]]

  Down: Fill col 2, rows 1→2
    matrix[1][2]=4, matrix[2][2]=5
    num=6, right=1
    [[1,2,3], [0,0,4], [0,0,5]]

  Left: Fill row 2, cols 1→0
    matrix[2][1]=6, matrix[2][0]=7
    num=8, bottom=1
    [[1,2,3], [0,0,4], [7,6,5]]

  Up: Fill col 0, rows 1→1
    matrix[1][0]=8
    num=9, left=1
    [[1,2,3], [8,0,4], [7,6,5]]

Iteration 2:
  Right: Fill row 1, cols 1→1
    matrix[1][1]=9
    num=10, top=2
    [[1,2,3], [8,9,4], [7,6,5]]

  Down: top(2) > bottom(1) → exit

Final matrix:
[[1,2,3],
 [8,9,4],
 [7,6,5]]
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles n=1 (single cell)
- [ ] Handles even n (no center cell)
- [ ] Handles odd n (center cell)
- [ ] All cells filled with correct values 1 to n²
- [ ] No cells overwritten

**Code Quality:**
- [ ] Correct loop ranges (includes boundaries)
- [ ] Updates all four boundaries
- [ ] Uses proper loop directions (ascending/descending)
- [ ] Clean variable names

**Interview Readiness:**
- [ ] Can explain layer-by-layer approach in 2 minutes
- [ ] Can draw spiral pattern for n=4
- [ ] Can code solution in 12 minutes
- [ ] Can handle rectangular matrix variation

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve with boundary tracking
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement Spiral Matrix I (reading)
- [ ] Day 14: Implement rectangular m×n variation
- [ ] Day 30: Compare with other traversal patterns

---

**Strategy**: See [Matrix Traversal Pattern](../../strategies/data-structures/arrays.md)
