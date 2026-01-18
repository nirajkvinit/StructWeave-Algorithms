---
id: M016
old_id: F054
slug: spiral-matrix
title: Spiral Matrix
difficulty: medium
category: medium
topics: ["matrix", "array-traversal", "simulation"]
patterns: ["boundary-tracking", "layer-by-layer", "direction-control"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M013", "M059", "E118"]
prerequisites: ["2d-array-basics", "boundary-tracking"]
strategy_ref: ../strategies/data-structures/arrays.md
---

# Spiral Matrix

## Problem

Given a 2D matrix (m rows by n columns), return all its elements in spiral order: start at the top-left, move right along the top row, then down the right column, then left along the bottom row, then up the left column, and repeat this pattern spiraling inward until all elements are visited.

For example, a 3×3 matrix is read: top row left-to-right → right column top-to-bottom → bottom row right-to-left → left column bottom-to-top → center element. This creates a clockwise spiral from outside to inside.

The challenge is managing four shrinking boundaries (top, bottom, left, right) as you complete each side of the spiral. After moving right across the top, you've "consumed" that row, so you increment the top boundary. After moving down the right side, you decrement the right boundary, and so on. Edge cases arise with single-row or single-column matrices where you might process the same elements twice if you're not careful.

Two common approaches: track boundaries explicitly (cleaner), or use direction vectors with a visited array (more general but uses extra space).

**Diagram:**

Example: For matrix `[[1,2,3],[4,5,6],[7,8,9]]`, the spiral order is:

```
1 → 2 → 3
        ↓
4 → 5   6
↑       ↓
7 ← 8 ← 9
```

Output: `[1,2,3,6,9,8,7,4,5]`

## Why This Matters

This problem tests your ability to manage state during iteration—specifically, how boundaries change as you progress through a systematic pattern. It's a classic "simulation" problem where careful bookkeeping matters more than algorithmic cleverness. Getting boundary updates wrong leads to off-by-one errors or processing elements twice.

**Real-world applications:**
- **Image processing**: Spiral sampling for image compression, feature detection in concentric regions
- **Printing systems**: Serpentine print head movement to minimize mechanical strain
- **Data compression**: Zigzag and spiral scanning patterns in JPEG/video encoding
- **Game development**: Spiral search patterns for AI (expanding search radius from center)
- **Memory management**: Cache-friendly traversal patterns for matrix operations
- **Geographic information systems**: Spiral outward searches from a point of interest
- **Scientific visualization**: Spiral layouts for displaying multi-dimensional data

Interviewers use this to see if you can handle phase transitions (changing direction), manage multiple variables that interact (the four boundaries), and recognize when to add conditional checks (single row/column edge cases). It's less about algorithm design and more about meticulous implementation.

## Examples

**Example 1:**
- Input: `matrix = [[1,2,3],[4,5,6],[7,8,9]]`
- Output: `[1,2,3,6,9,8,7,4,5]`
- Explanation: Spiral traversal clockwise

**Example 2:**
- Input: `matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12]]`
- Output: `[1,2,3,4,8,12,11,10,9,5,6,7]`
- Explanation:
```
1  →  2  →  3  →  4
                  ↓
5  →  6  →  7     8
↑                 ↓
9  ← 10 ← 11 ← 12
```

**Example 3:**
- Input: `matrix = [[1,2,3]]`
- Output: `[1,2,3]`
- Explanation: Single row, just traverse left to right

## Constraints

- m == matrix.length
- n == matrix[i].length
- 1 <= m, n <= 10
- -100 <= matrix[i][j] <= 100

## Think About

1. How many times do you change direction in a complete spiral?
2. What determines when to change direction?
3. How do boundaries shrink after each complete layer?
4. Can you traverse without marking visited cells?

---

## Approach Hints

<details>
<summary>💡 Hint 1: The spiral pattern</summary>

A spiral traversal moves in 4 distinct phases per layer:

```
Phase 1: Go RIGHT (→) along top row
Phase 2: Go DOWN (↓) along right column
Phase 3: Go LEFT (←) along bottom row
Phase 4: Go UP (↑) along left column

Then move to inner layer and repeat.
```

**Socratic questions:**
- After going right across the top, which boundary should you no longer visit?
- After going down the right side, which boundary is now exhausted?
- How many elements do you visit in each phase?
- When do you know the spiral is complete?

**Key insight:** Track four boundaries that shrink after each direction:
- `top`, `bottom`, `left`, `right`

</details>

<details>
<summary>🎯 Hint 2: Boundary management</summary>

Maintain four boundaries and shrink them after each phase:

```
Initial boundaries for 3×4 matrix:
top = 0
bottom = 2
left = 0
right = 3

Phase 1: Traverse row 'top' from left to right
         → top++  (we've finished this row)

Phase 2: Traverse column 'right' from top to bottom
         → right--  (we've finished this column)

Phase 3: Traverse row 'bottom' from right to left
         → bottom--  (we've finished this row)

Phase 4: Traverse column 'left' from bottom to top
         → left++  (we've finished this column)

Repeat until top > bottom or left > right
```

**Edge case to consider:**
What if there's only one row or one column left? You might traverse it twice if you're not careful!

</details>

<details>
<summary>📝 Hint 3: Implementation approaches</summary>

**Approach 1: Boundary tracking (cleaner)**
```
result = []
top, bottom = 0, len(matrix) - 1
left, right = 0, len(matrix[0]) - 1

while top <= bottom and left <= right:
    # Phase 1: Go right along top row
    for col in range(left, right + 1):
        result.append(matrix[top][col])
    top += 1

    # Phase 2: Go down along right column
    for row in range(top, bottom + 1):
        result.append(matrix[row][right])
    right -= 1

    # Phase 3: Go left along bottom row (if still valid)
    if top <= bottom:
        for col in range(right, left - 1, -1):
            result.append(matrix[bottom][col])
        bottom -= 1

    # Phase 4: Go up along left column (if still valid)
    if left <= right:
        for row in range(bottom, top - 1, -1):
            result.append(matrix[row][left])
        left += 1

return result
```

**Approach 2: Direction vectors**
```
result = []
m, n = len(matrix), len(matrix[0])
visited = [[False] * n for _ in range(m)]

# Directions: right, down, left, up
dr = [0, 1, 0, -1]
dc = [1, 0, -1, 0]
r = c = di = 0

for _ in range(m * n):
    result.append(matrix[r][c])
    visited[r][c] = True

    # Try to continue in current direction
    nr, nc = r + dr[di], c + dc[di]

    # Change direction if out of bounds or visited
    if not (0 <= nr < m and 0 <= nc < n and not visited[nr][nc]):
        di = (di + 1) % 4  # Turn clockwise
        nr, nc = r + dr[di], c + dc[di]

    r, c = nr, nc

return result
```

**Approach 3: Layer-by-layer (similar to boundary tracking)**
```
result = []
layers = (min(len(matrix), len(matrix[0])) + 1) // 2

for layer in range(layers):
    # Define boundaries for this layer
    # ... traverse this layer ...

return result
```

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **Boundary tracking** | **O(m×n)** | **O(1)** | Clean, no extra space |
| Direction vectors | O(m×n) | O(m×n) | Uses visited array |
| Layer-by-layer | O(m×n) | O(1) | Similar to boundary tracking |
| Recursive | O(m×n) | O(min(m,n)) | Call stack for layers |

**Why boundary tracking wins:**
- No extra space for visited tracking
- Clear four-phase structure
- Easy to understand and verify
- Handles edge cases naturally

**Time breakdown:**
- Visit each cell exactly once: O(m×n)
- Each cell processed in O(1)

**Space breakdown:**
- Result array: O(m×n) (required output)
- Boundary variables: O(1)
- Total auxiliary space: O(1)

---

## Common Mistakes

### 1. Double-visiting single row/column
```python
# WRONG: When only one row remains, both phase 1 and 3 traverse it
while top <= bottom and left <= right:
    # Phase 1: right
    for col in range(left, right + 1):
        result.append(matrix[top][col])
    top += 1

    # Phase 2: down
    for row in range(top, bottom + 1):
        result.append(matrix[row][right])
    right -= 1

    # Phase 3: left (NO CHECK!)
    for col in range(right, left - 1, -1):
        result.append(matrix[bottom][col])  # Might revisit row!
    bottom -= 1

# CORRECT: Check if row still exists
if top <= bottom:  # Add this check
    for col in range(right, left - 1, -1):
        result.append(matrix[bottom][col])
    bottom -= 1
```

### 2. Off-by-one errors in ranges
```python
# WRONG: Misses last element
for col in range(left, right):  # Should be right + 1
    result.append(matrix[top][col])

# WRONG: Starts at wrong position
for col in range(right, left, -1):  # Should be left - 1
    result.append(matrix[bottom][col])

# CORRECT: Inclusive ranges
for col in range(left, right + 1):
    result.append(matrix[top][col])
for col in range(right, left - 1, -1):
    result.append(matrix[bottom][col])
```

### 3. Wrong boundary updates
```python
# WRONG: Updates boundary before using it
top += 1
for col in range(left, right + 1):
    result.append(matrix[top][col])  # Using updated top!

# CORRECT: Use boundary first, then update
for col in range(left, right + 1):
    result.append(matrix[top][col])
top += 1  # Update after using
```

### 4. Not checking loop condition properly
```python
# WRONG: Only checks one dimension
while top <= bottom:  # What if left > right?
    # ... traverse ...

# CORRECT: Check both dimensions
while top <= bottom and left <= right:
    # ... traverse ...
```

---

## Visual Walkthrough

```
Example: 3×4 matrix

Matrix:
┌───┬───┬───┬───┐
│ 1 │ 2 │ 3 │ 4 │
├───┼───┼───┼───┤
│ 5 │ 6 │ 7 │ 8 │
├───┼───┼───┼───┤
│ 9 │10 │11 │12 │
└───┴───┴───┴───┘

Initial boundaries:
top=0, bottom=2, left=0, right=3

Step 1: Go RIGHT along top row (row 0, col 0→3)
Result: [1, 2, 3, 4]
top = 1 ✓
┌───┬───┬───┬───┐
│ ✓ │ ✓ │ ✓ │ ✓ │
├───┼───┼───┼───┤
│ 5 │ 6 │ 7 │ 8 │
├───┼───┼───┼───┤
│ 9 │10 │11 │12 │
└───┴───┴───┴───┘

Step 2: Go DOWN along right column (row 1→2, col 3)
Result: [1, 2, 3, 4, 8, 12]
right = 2 ✓
┌───┬───┬───┬───┐
│ ✓ │ ✓ │ ✓ │ ✓ │
├───┼───┼───┼───┤
│ 5 │ 6 │ 7 │ ✓ │
├───┼───┼───┼───┤
│ 9 │10 │11 │ ✓ │
└───┴───┴───┴───┘

Step 3: Go LEFT along bottom row (row 2, col 2→0)
Result: [1, 2, 3, 4, 8, 12, 11, 10, 9]
bottom = 1 ✓
┌───┬───┬───┬───┐
│ ✓ │ ✓ │ ✓ │ ✓ │
├───┼───┼───┼───┤
│ 5 │ 6 │ 7 │ ✓ │
├───┼───┼───┼───┤
│ ✓ │ ✓ │ ✓ │ ✓ │
└───┴───┴───┴───┘

Step 4: Go UP along left column (row 1→1, col 0)
Result: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5]
left = 1 ✓
┌───┬───┬───┬───┐
│ ✓ │ ✓ │ ✓ │ ✓ │
├───┼───┼───┼───┤
│ ✓ │ 6 │ 7 │ ✓ │
├───┼───┼───┼───┤
│ ✓ │ ✓ │ ✓ │ ✓ │
└───┴───┴───┴───┘

Current boundaries: top=1, bottom=1, left=1, right=2
Still valid: top <= bottom and left <= right ✓

Step 5: Go RIGHT along row 1 (row 1, col 1→2)
Result: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
top = 2 ✓
┌───┬───┬───┬───┐
│ ✓ │ ✓ │ ✓ │ ✓ │
├───┼───┼───┼───┤
│ ✓ │ ✓ │ ✓ │ ✓ │
├───┼───┼───┼───┤
│ ✓ │ ✓ │ ✓ │ ✓ │
└───┴───┴───┴───┘

Current boundaries: top=2, bottom=1
Condition: top > bottom ✗ → STOP

Final result: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Spiral Matrix II** | Generate n×n matrix with 1 to n² | Same spiral pattern, fill instead of read |
| **Spiral Matrix III** | Start from center, spiral outward | Reverse the direction, grow boundaries |
| **Counter-clockwise spiral** | Traverse left first | Change phase order: down→right→up→left |
| **Diagonal spiral** | Diagonal traversal pattern | Different direction vectors |
| **Snake/zigzag pattern** | Alternate row direction | Simpler: reverse every other row |
| **Anti-spiral** | Outside→in but different pattern | Modify traversal order |

**Spiral Matrix II (generate):**
```python
def generateMatrix(n):
    """Generate n×n matrix filled 1 to n² in spiral order"""
    matrix = [[0] * n for _ in range(n)]
    num = 1
    top, bottom = 0, n - 1
    left, right = 0, n - 1

    while top <= bottom and left <= right:
        # Right
        for col in range(left, right + 1):
            matrix[top][col] = num
            num += 1
        top += 1

        # Down
        for row in range(top, bottom + 1):
            matrix[row][right] = num
            num += 1
        right -= 1

        # Left
        if top <= bottom:
            for col in range(right, left - 1, -1):
                matrix[bottom][col] = num
                num += 1
            bottom -= 1

        # Up
        if left <= right:
            for row in range(bottom, top - 1, -1):
                matrix[row][left] = num
                num += 1
            left += 1

    return matrix
```

**Counter-clockwise spiral:**
```python
def spiralOrderCCW(matrix):
    """Traverse counter-clockwise: down→right→up→left"""
    result = []
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1

    while top <= bottom and left <= right:
        # Down
        for row in range(top, bottom + 1):
            result.append(matrix[row][left])
        left += 1

        # Right
        if left <= right:
            for col in range(left, right + 1):
                result.append(matrix[bottom][col])
            bottom -= 1

        # Up
        if top <= bottom:
            for row in range(bottom, top - 1, -1):
                result.append(matrix[row][right])
            right -= 1

        # Left
        if left <= right:
            for col in range(right, left - 1, -1):
                result.append(matrix[top][col])
            top += 1

    return result
```

**Zigzag pattern (simpler):**
```python
def zigzagOrder(matrix):
    """Alternate row directions: →, ←, →, ←, ..."""
    result = []
    for i, row in enumerate(matrix):
        if i % 2 == 0:
            result.extend(row)  # Left to right
        else:
            result.extend(reversed(row))  # Right to left
    return result
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles 1×1 matrix
- [ ] Handles single row matrix (1×n)
- [ ] Handles single column matrix (m×1)
- [ ] Handles square matrices
- [ ] Handles rectangular matrices (m≠n)
- [ ] No duplicate or missing elements

**Code Quality:**
- [ ] Clear variable names (top, bottom, left, right)
- [ ] Proper boundary checks
- [ ] No off-by-one errors
- [ ] Comments explaining phases

**Edge Cases:**
- [ ] Minimum size (1×1)
- [ ] Long row (1×10)
- [ ] Long column (10×1)
- [ ] Square (5×5)
- [ ] Small rectangle (2×3)

**Interview Readiness:**
- [ ] Can explain spiral pattern in 2 minutes
- [ ] Can code solution in 12 minutes
- [ ] Can trace through example step-by-step
- [ ] Can handle follow-up: generate spiral matrix
- [ ] Can explain why phase 3 and 4 need extra checks

**Spaced Repetition Tracker:**
- [ ] Day 1: Solve with boundary tracking
- [ ] Day 3: Solve Spiral Matrix II (generate)
- [ ] Day 7: Implement counter-clockwise variant
- [ ] Day 14: Implement direction vector approach
- [ ] Day 30: Compare all traversal patterns (spiral, zigzag, diagonal)

---

**Strategy**: See [Matrix Traversal Patterns](../../strategies/data-structures/arrays.md)
