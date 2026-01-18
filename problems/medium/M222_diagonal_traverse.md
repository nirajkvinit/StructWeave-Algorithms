---
id: M222
old_id: I297
slug: diagonal-traverse
title: Diagonal Traverse
difficulty: medium
category: medium
topics: ["array"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E050", "M048", "M054"]
prerequisites: ["2d-array", "matrix-traversal", "direction-control"]
---
# Diagonal Traverse

## Problem

Given an `m x n` matrix, traverse it diagonally and return all elements in a single array. The traversal alternates direction: first diagonal goes up-right, second goes down-left, third goes up-right, and so on.

Think of it like reading text in a zigzag pattern. In a matrix, elements on the same diagonal share the property that their row + column sum is constant. For example, in a 3×3 matrix, elements at positions (0,2), (1,1), and (2,0) all have row+col = 2.

Here's how the traversal works visually:

```
Matrix:           Diagonal path:
1  2  3           1 → 2 ↙ 4 ↗ 3 ↙ 5 ↙ 6
4  5  6
```

The tricky part is handling the direction changes when you hit the boundaries. When moving up-right and you hit the top edge or right edge, you need to change direction and adjust your position. Similarly, when moving down-left and you hit the bottom edge or left edge, you change direction. The corner cases are particularly subtle: when you're at position (0, n-1) (top-right corner), you must move down, not right.

Return an array containing all matrix elements traversed in this diagonal zigzag order.


**Diagram:**

```
Example matrix traversal:
  0 1 2
0 1 2 3
1 4 5 6
2 7 8 9

Diagonal order: [1, 2, 4, 7, 5, 3, 6, 8, 9]

Traverse diagonals alternating up-right and down-left:
  ↗ ↙ ↗ ↙ ↗
```


## Why This Matters

Matrix traversal patterns are fundamental in image processing algorithms, where pixels need to be scanned in specific orders for compression (like JPEG encoding), filtering, or transformation. This diagonal pattern specifically appears in zigzag scanning used in video codecs and discrete cosine transforms. The problem builds essential skills in managing state (tracking position and direction), handling boundary conditions gracefully, and thinking about 2D coordinates systematically. These skills transfer directly to navigating grids in pathfinding algorithms, game development, and robotics navigation. Understanding how to control iteration order in multi-dimensional data also helps when optimizing cache performance in scientific computing.

## Examples

**Example 1:**
- Input: `mat = [[1,2],[3,4]]`
- Output: `[1,2,3,4]`

## Constraints

- m == mat.length
- n == mat[i].length
- 1 <= m, n <= 10⁴
- 1 <= m * n <= 10⁴
- -10⁵ <= mat[i][j] <= 10⁵

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual Understanding</summary>

Notice that diagonal traversal alternates directions: first diagonal goes up-right, second goes down-left, third up-right, and so on. Each diagonal has a pattern - elements on the same diagonal have the property that row + col = constant. The key is handling direction changes and boundary conditions when you hit the edges.

</details>

<details>
<summary>🎯 Hint 2: Optimal Approach</summary>

Use a single pass through the matrix by tracking current position and direction. When going up-right, decrement row and increment col. When going down-left, increment row and decrement col. When you hit a boundary, change direction and adjust position according to specific rules (if at top/right edge vs if at bottom/left edge).

</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>

1. Initialize result array, starting position (0,0), and direction flag
2. While elements remain:
   - Add current element to result
   - If going up-right:
     - If at top row or right column, change direction and move appropriately
     - Otherwise move up-right (row-1, col+1)
   - If going down-left:
     - If at left column or bottom row, change direction and move appropriately
     - Otherwise move down-left (row+1, col-1)
3. Return result array

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Simulation | O(m * n) | O(1) | Visit each cell once, output array doesn't count |
| Group by Diagonal | O(m * n) | O(m * n) | Store elements by diagonal sum, then reverse alternating |
| Recursive | O(m * n) | O(m * n) | Recursion stack depth can be m*n in worst case |

## Common Mistakes

### Mistake 1: Incorrect boundary handling
```python
# Wrong: Doesn't handle all boundary cases correctly
def findDiagonalOrder(mat):
    m, n = len(mat), len(mat[0])
    result = []
    row = col = 0
    going_up = True

    for _ in range(m * n):
        result.append(mat[row][col])

        if going_up:
            # Wrong: missing edge cases
            if row == 0:
                col += 1
                going_up = False
            else:
                row -= 1
                col += 1
```

```python
# Correct: Handle all boundary cases
def findDiagonalOrder(mat):
    m, n = len(mat), len(mat[0])
    result = []
    row = col = 0
    going_up = True

    for _ in range(m * n):
        result.append(mat[row][col])

        if going_up:
            if row == 0 and col < n - 1:  # Top edge
                col += 1
                going_up = False
            elif col == n - 1:  # Right edge
                row += 1
                going_up = False
            else:  # Continue up-right
                row -= 1
                col += 1
        else:
            if col == 0 and row < m - 1:  # Left edge
                row += 1
                going_up = True
            elif row == m - 1:  # Bottom edge
                col += 1
                going_up = True
            else:  # Continue down-left
                row += 1
                col -= 1

    return result
```

### Mistake 2: Not alternating direction properly
```python
# Wrong: Direction changes every iteration instead of at boundaries
def findDiagonalOrder(mat):
    m, n = len(mat), len(mat[0])
    result = []
    row = col = 0
    going_up = True

    for _ in range(m * n):
        result.append(mat[row][col])
        going_up = not going_up  # Wrong: flips every time
        # Movement logic...
```

```python
# Correct: Direction changes only at boundaries
def findDiagonalOrder(mat):
    m, n = len(mat), len(mat[0])
    result = []
    row = col = 0
    going_up = True

    for _ in range(m * n):
        result.append(mat[row][col])

        if going_up:
            if row == 0 and col < n - 1:
                col += 1
                going_up = False  # Change only at boundary
            elif col == n - 1:
                row += 1
                going_up = False  # Change only at boundary
            else:
                row -= 1
                col += 1
        # Similar for going_down...
```

### Mistake 3: Wrong priority when at corner
```python
# Wrong: At corner (0, n-1), could move right (out of bounds) or down
def findDiagonalOrder(mat):
    # When at top-right corner
    if going_up:
        if col == n - 1:  # Check column first
            row += 1  # Correct
        elif row == 0:  # Then check row
            col += 1  # Would go out of bounds!
```

```python
# Correct: Check row boundary before column at top
def findDiagonalOrder(mat):
    if going_up:
        if row == 0 and col < n - 1:  # Top edge takes priority
            col += 1
            going_up = False
        elif col == n - 1:  # Then right edge
            row += 1
            going_up = False
        else:
            row -= 1
            col += 1
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Spiral Matrix | Medium | Traverse matrix in spiral order |
| Spiral Matrix II | Medium | Generate n×n matrix in spiral order |
| Rotate Image | Medium | Rotate matrix 90 degrees in-place |
| Set Matrix Zeroes | Medium | Set entire row/col to 0 if element is 0 |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] After 1 day (spaced repetition)
- [ ] After 3 days (spaced repetition)
- [ ] After 1 week (spaced repetition)
- [ ] Before interview (final review)

**Completion Status**: ⬜ Not Started | 🟨 In Progress | ✅ Mastered

**Strategy**: See [Matrix Traversal Pattern](../strategies/patterns/matrix-traversal.md)
