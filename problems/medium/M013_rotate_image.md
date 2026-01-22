---
id: M013
old_id: F048
slug: rotate-image
title: Rotate Image
difficulty: medium
category: medium
topics: ["matrix", "array-manipulation", "in-place-algorithm"]
patterns: ["matrix-transformation", "layer-by-layer"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M016", "E050", "M054"]
prerequisites: ["2d-array-basics", "in-place-algorithms"]
strategy_ref: ../prerequisites/arrays.md
---

# Rotate Image

## Problem

You have a square matrix (n×n grid of numbers) representing an image, and you need to rotate it 90 degrees clockwise without creating a new matrix. The constraint "in-place" means you can only use a constant amount of extra memory (a few variables, not another n×n array).

Think of rotating a physical photograph clockwise by 90 degrees: what was the top-left corner becomes the top-right corner, the top-right becomes bottom-right, and so on. The challenge is doing this transformation by swapping elements directly in the original matrix rather than copying to a rotated version.

There are multiple approaches: you can rotate elements in cycles (moving four elements at a time around a square), or you can decompose the rotation into two simpler operations: transpose the matrix (flip across the diagonal), then reverse each row. Both work, but the transpose-then-reverse approach is typically cleaner and easier to implement correctly.

**Diagram:**

Example 1: 3×3 matrix rotation
```
Before (90° clockwise rotation):
┌───┬───┬───┐
│ 1 │ 2 │ 3 │
├───┼───┼───┤
│ 4 │ 5 │ 6 │
├───┼───┼───┤
│ 7 │ 8 │ 9 │
└───┴───┴───┘

After:
┌───┬───┬───┐
│ 7 │ 4 │ 1 │
├───┼───┼───┤
│ 8 │ 5 │ 2 │
├───┼───┼───┤
│ 9 │ 6 │ 3 │
└───┴───┴───┘
```

## Why This Matters

This problem tests whether you can recognize that complex transformations can be decomposed into simpler operations. The insight that "rotation = transpose + reverse" is a classic example of mathematical thinking applied to programming. It's also a litmus test for understanding in-place algorithms, where space efficiency matters.

**Real-world applications:**
- **Image processing libraries**: JPEG rotation, thumbnail generation, photo editing apps
- **Display systems**: Handling device orientation changes (portrait/landscape) in mobile OS
- **Computer graphics**: Texture rotation in game engines, sprite transformation
- **Document rendering**: PDF rotation, printing in different orientations
- **Medical imaging**: Rotating CT scans or MRI slices for different viewing angles
- **Robotics**: Transforming sensor data between coordinate frames

This appears in interviews because it's surprisingly easy to get wrong (common mistakes include swapping the entire matrix instead of the upper triangle, or reversing columns instead of rows). Companies want to see if you can derive the transformation formula, handle edge cases (single element, even vs odd dimensions), and choose the cleanest implementation strategy.

## Examples

**Example 1:**
- Input: `matrix = [[1,2,3],[4,5,6],[7,8,9]]`
- Output: `[[7,4,1],[8,5,2],[9,6,3]]`
- Explanation: Rotated 90° clockwise

**Example 2:**
- Input: `matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]`
- Output: `[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]`
- Explanation: Rotated 90° clockwise

**Example 3:**
- Input: `matrix = [[1]]`
- Output: `[[1]]`
- Explanation: Single element unchanged

## Constraints

- n == matrix.length == matrix[i].length
- 1 <= n <= 20
- -1000 <= matrix[i][j] <= 1000

## Think About

1. Where does each element move when you rotate 90° clockwise?
2. Can you express the new position as a function of the old position?
3. If you swap elements in a cycle, how many elements are in each cycle?
4. Is there a way to decompose the rotation into simpler operations?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Where do elements go?</summary>

Track what happens to a few specific elements during a 90° clockwise rotation:

```
Before (positions):        After (positions):
[0,0] [0,1] [0,2]         [2,0] [1,0] [0,0]
[1,0] [1,1] [1,2]   →     [2,1] [1,1] [0,1]
[2,0] [2,1] [2,2]         [2,2] [1,2] [0,2]
```

**Socratic questions:**
- Where does the element at [0,0] end up? (Answer: [0,2])
- Where does [0,1] go? (Answer: [1,2])
- Where does [0,2] go? (Answer: [2,2])
- Can you find a pattern: `[row, col] → [?, ?]`

**Pattern:** `[i, j] → [j, n-1-i]` where n is the matrix size!

</details>

<details>
<summary>🎯 Hint 2: Two key insights</summary>

**Insight 1: Rotation = Transpose + Reverse**

A 90° clockwise rotation can be decomposed into two simpler operations:
1. **Transpose** the matrix (swap across diagonal)
2. **Reverse** each row

```
Original:        Transpose:       Reverse rows:
1 2 3            1 4 7            7 4 1
4 5 6     →      2 5 8     →      8 5 2
7 8 9            3 6 9            9 6 3
```

**Insight 2: Layer-by-layer rotation**

Process the matrix in concentric layers (like an onion):
- Outer layer first
- Then inner layers
- For each layer, rotate groups of 4 elements in cycles

```
Layer 0 (outer):     Layer 1 (inner):
→ → → →
↓     ↓                  5
↓     ↓
← ← ← ↑
```

</details>

<details>
<summary>📝 Hint 3: Algorithm choices</summary>

**Approach 1: Transpose + Reverse (cleaner)**
```
# Step 1: Transpose (swap across main diagonal)
for i in range(n):
    for j in range(i+1, n):
        matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]

# Step 2: Reverse each row
for i in range(n):
    matrix[i].reverse()
    # Or: matrix[i] = matrix[i][::-1]
```

**Approach 2: Layer-by-layer rotation**
```
n = len(matrix)
layers = n // 2  # Number of concentric layers

for layer in range(layers):
    first = layer
    last = n - 1 - layer

    for i in range(first, last):
        offset = i - first

        # Save top element
        top = matrix[first][i]

        # Move left to top
        matrix[first][i] = matrix[last-offset][first]

        # Move bottom to left
        matrix[last-offset][first] = matrix[last][last-offset]

        # Move right to bottom
        matrix[last][last-offset] = matrix[i][last]

        # Move saved top to right
        matrix[i][last] = top
```

**Approach 3: Direct coordinate mapping (uses O(n²) space - not in-place)**
```
result = [[0] * n for _ in range(n)]
for i in range(n):
    for j in range(n):
        result[j][n-1-i] = matrix[i][j]
# Then copy back to matrix
```

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **Transpose + Reverse** | **O(n²)** | **O(1)** | Clean, easy to understand |
| Layer-by-layer | O(n²) | O(1) | Complex, true in-place rotation |
| Direct mapping (copy) | O(n²) | O(n²) | Violates in-place requirement |
| Using rotation matrix | O(n²) | O(n²) | Not applicable for discrete grid |

**Why Transpose + Reverse wins:**
- Simple to understand and implement
- Two clear, separate steps
- Each step is a common matrix operation
- Easy to verify correctness

**Time breakdown:**
- Transpose: Visit upper triangle: O(n²/2) = O(n²)
- Reverse: n rows, each O(n) = O(n²)
- Total: O(n²)

**Space breakdown:**
- No auxiliary matrix needed
- Only constant extra variables for swapping
- True in-place algorithm

---

## Common Mistakes

### 1. Swapping the entire matrix instead of upper triangle
```python
# WRONG: Double-swaps everything, undoing the transpose
for i in range(n):
    for j in range(n):
        matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
# Result: no change!

# CORRECT: Only swap upper triangle
for i in range(n):
    for j in range(i+1, n):  # Start j at i+1
        matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
```

### 2. Using extra space
```python
# WRONG: Creates new matrix (violates in-place requirement)
rotated = [[matrix[n-1-j][i] for j in range(n)] for i in range(n)]
return rotated

# CORRECT: Modify original matrix
# Use transpose + reverse or layer-by-layer approach
```

### 3. Wrong reversal direction
```python
# WRONG: Reverses columns instead of rows (90° counter-clockwise)
for i in range(n):
    for j in range(n):
        matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
for j in range(n):
    for i in range(n//2):
        matrix[i][j], matrix[n-1-i][j] = matrix[n-1-i][j], matrix[i][j]

# CORRECT: Transpose then reverse ROWS
# (Transpose + reverse columns = 90° counter-clockwise)
# (Transpose + reverse rows = 90° clockwise)
```

### 4. Off-by-one errors in layer rotation
```python
# WRONG: Incorrect range for layer elements
for i in range(first, last+1):  # Goes too far
    offset = i - first
    # ... rotation logic ...

# CORRECT: Range is [first, last)
for i in range(first, last):
    offset = i - first
    # ... rotation logic ...
```

---

## Visual Walkthrough

```
Example: 3×3 matrix rotation using Transpose + Reverse

Original matrix:
┌───┬───┬───┐
│ 1 │ 2 │ 3 │
├───┼───┼───┤
│ 4 │ 5 │ 6 │
├───┼───┼───┤
│ 7 │ 8 │ 9 │
└───┴───┴───┘

Step 1: Transpose (swap across main diagonal)
Swap matrix[0][1] ↔ matrix[1][0]: 2 ↔ 4
┌───┬───┬───┐
│ 1 │ 4 │ 3 │
├───┼───┼───┤
│ 2 │ 5 │ 6 │
├───┼───┼───┤
│ 7 │ 8 │ 9 │
└───┴───┴───┘

Swap matrix[0][2] ↔ matrix[2][0]: 3 ↔ 7
┌───┬───┬───┐
│ 1 │ 4 │ 7 │
├───┼───┼───┤
│ 2 │ 5 │ 8 │
├───┼───┼───┤
│ 3 │ 6 │ 9 │
└───┴───┴───┘

Swap matrix[1][2] ↔ matrix[2][1]: 8 ↔ 6
┌───┬───┬───┐
│ 1 │ 4 │ 7 │  ← After transpose
├───┼───┼───┤
│ 2 │ 5 │ 8 │
├───┼───┼───┤
│ 3 │ 6 │ 9 │
└───┴───┴───┘

Step 2: Reverse each row
Row 0: [1, 4, 7] → [7, 4, 1]
Row 1: [2, 5, 8] → [8, 5, 2]
Row 2: [3, 6, 9] → [9, 6, 3]

Final result (90° clockwise):
┌───┬───┬───┐
│ 7 │ 4 │ 1 │
├───┼───┼───┤
│ 8 │ 5 │ 2 │
├───┼───┼───┤
│ 9 │ 6 │ 3 │
└───┴───┴───┘

Verification:
- Top-left (1) → Top-right (1) ✓
- Top-right (3) → Bottom-right (3) ✓
- Bottom-right (9) → Bottom-left (9) ✓
- Bottom-left (7) → Top-left (7) ✓
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **90° counter-clockwise** | Rotate left | Transpose + reverse columns (or reverse rows + transpose) |
| **180° rotation** | Rotate twice | Apply 90° rotation twice, or reverse all elements |
| **270° rotation** | Rotate right 3 times | Same as 90° counter-clockwise |
| **Non-square matrix** | m×n where m≠n | Can't rotate in-place, need new matrix |
| **Rotate specific layer** | Only outer/inner ring | Apply rotation to specific layer only |
| **Diagonal flip** | Flip across anti-diagonal | Reverse rows + transpose |

**90° counter-clockwise:**
```python
def rotateCounterClockwise(matrix):
    n = len(matrix)

    # Transpose
    for i in range(n):
        for j in range(i+1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]

    # Reverse columns (not rows!)
    for j in range(n):
        for i in range(n//2):
            matrix[i][j], matrix[n-1-i][j] = matrix[n-1-i][j], matrix[i][j]
```

**180° rotation:**
```python
def rotate180(matrix):
    n = len(matrix)

    # Method 1: Apply 90° rotation twice
    rotate(matrix)
    rotate(matrix)

    # Method 2: Reverse order of all elements
    matrix.reverse()
    for row in matrix:
        row.reverse()
```

**Non-square matrix rotation (m×n):**
```python
def rotateNonSquare(matrix):
    """
    Rotating m×n matrix results in n×m matrix
    Cannot be done in-place!
    """
    m, n = len(matrix), len(matrix[0])
    result = [[0] * m for _ in range(n)]

    for i in range(m):
        for j in range(n):
            result[j][m-1-i] = matrix[i][j]

    return result
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles 1×1 matrix
- [ ] Handles even-sized matrices (2×2, 4×4)
- [ ] Handles odd-sized matrices (3×3, 5×5)
- [ ] Truly in-place (O(1) extra space)
- [ ] Correct 90° clockwise rotation

**Code Quality:**
- [ ] Clean variable names
- [ ] No unnecessary complexity
- [ ] Proper loop bounds
- [ ] Comments explaining approach

**Edge Cases:**
- [ ] Minimum size (n=1)
- [ ] Small matrices (n=2, n=3)
- [ ] Maximum size constraints
- [ ] Negative numbers in matrix
- [ ] All same values

**Interview Readiness:**
- [ ] Can explain transpose + reverse approach in 2 minutes
- [ ] Can code solution in 10 minutes
- [ ] Can derive coordinate transformation formula
- [ ] Can implement counter-clockwise rotation
- [ ] Can explain why in-place is possible for square but not rectangular

**Spaced Repetition Tracker:**
- [ ] Day 1: Solve with transpose + reverse
- [ ] Day 3: Implement layer-by-layer approach
- [ ] Day 7: Implement counter-clockwise rotation
- [ ] Day 14: Solve non-square matrix variation
- [ ] Day 30: Explain all rotation types (90°, 180°, 270°)

---

**Strategy**: See [Matrix Manipulation Patterns](../../prerequisites/arrays.md)
