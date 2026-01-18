---
id: M088
old_id: I021
slug: maximal-square
title: Maximal Square
difficulty: medium
category: medium
topics: ["matrix", "dynamic-programming"]
patterns: ["dynamic-programming"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M087", "E084", "M031"]
prerequisites: ["dynamic-programming", "2d-arrays", "matrix-traversal"]
---
# Maximal Square

## Problem

You are provided with a binary `matrix` of dimensions `m x n` where each cell contains either `'0'` or `'1'` (as characters, not integers). Your task is to locate the biggest square subregion where every cell is `'1'`, then calculate and return the total area of that square. A square subregion means all cells within a square boundary, like a 3x3 or 4x4 block, not a rectangle of different dimensions. For instance, in a matrix with a 3x3 region of all 1s, the maximal square has area 9. The challenge is doing this efficiently without checking every possible square starting position and size, which would be too slow. You'll need to build up knowledge about smaller squares to determine larger ones. Edge cases include matrices with no 1s at all (return 0), matrices that are entirely 1s (return m*n if m==n, otherwise the smaller dimension squared), single-row or single-column matrices, and matrices where multiple maximal squares of the same size exist.

**Diagram:**

```
Example 1:
  1  0  1  0  0
  1  0 [1][1][1]
  1  1 [1][1][1]
  1  0 [1][1][1]
  0  0  1  1  1

Maximal square (marked with []): 3×3 = 9

Example 2:
  0  1
  1  0

Maximal square: 1×1 = 1
```


## Why This Matters

Finding maximal squares in binary matrices is fundamental in image processing and computer vision, where you're identifying the largest uniform regions in bitmaps or binary feature maps. In floor plan analysis for architecture or robotics, finding the largest open square area helps determine furniture placement or navigation zones. Integrated circuit design uses similar algorithms to find the largest square area available for component placement on a chip layout. Geographic information systems apply this to satellite imagery to identify largest clear areas for landing zones or construction sites. In game development, procedural generation uses maximal square detection to place rooms or objects in grid-based maps. The dynamic programming technique you'll learn builds solutions to larger problems from solutions to smaller overlapping subproblems, a pattern that extends to many optimization problems on grids. This problem demonstrates how to transform a seemingly geometric question into an elegant DP solution that processes each cell once, achieving O(m*n) efficiency instead of the brute force O(m²*n²) approach.

## Examples

**Example 1:**
- Input: `matrix = [["0"]]`
- Output: `0`

## Constraints

- m == matrix.length
- n == matrix[i].length
- 1 <= m, n <= 300
- matrix[i][j] is '0' or '1'.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

Think about how a square is formed. If you're standing at position (i, j) and that cell is '1', what do you need to check to determine the largest square that has (i, j) as its bottom-right corner? Consider the cells directly above, to the left, and diagonally up-left.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use dynamic programming with a 2D table where dp[i][j] represents the side length of the largest square whose bottom-right corner is at position (i, j). The value depends on three neighboring cells: if all three neighbors can form squares, the current cell can extend the smallest of those squares by 1.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

```
For each cell (i, j):
  If matrix[i][j] == '1':
    If i == 0 or j == 0:
      dp[i][j] = 1
    Else:
      dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1
    maxSide = max(maxSide, dp[i][j])
Return maxSide * maxSide
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(m²n² × min(m,n)) | O(1) | Check every cell as top-left, validate all squares |
| DP (2D table) | O(mn) | O(mn) | Build table bottom-up |
| **DP (1D optimized)** | **O(mn)** | **O(n)** | Only need previous row, optimal solution |

## Common Mistakes

### Mistake 1: Forgetting to convert character to integer
```python
# Wrong - comparing characters directly
if matrix[i][j] == 1:  # matrix contains '0' or '1' as strings
    dp[i][j] = calculate_square()

# Correct
if matrix[i][j] == '1':  # compare with character
    dp[i][j] = calculate_square()
```

### Mistake 2: Not handling edge cases (first row/column)
```python
# Wrong - accessing out of bounds
dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1

# Correct
if i == 0 or j == 0:
    dp[i][j] = 1 if matrix[i][j] == '1' else 0
else:
    dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1
```

### Mistake 3: Returning side length instead of area
```python
# Wrong - returning the side length
return max_side

# Correct - return area (side squared)
return max_side * max_side
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Maximal Rectangle | Hard | Find largest rectangle (not just square) of 1s |
| Count Square Submatrices | Medium | Count all square submatrices with all 1s |
| Largest Plus Sign | Medium | Find largest plus sign of 1s |
| Maximal Square in Binary String | Medium | 1D version with sliding window |

## Practice Checklist

- [ ] Implement brute force solution
- [ ] Implement 2D DP solution
- [ ] Optimize to 1D DP (space optimization)
- [ ] Test with all zeros matrix
- [ ] Test with all ones matrix
- [ ] Test with single cell matrix
- [ ] Verify character vs integer handling

**Spaced Repetition Schedule:**
- Day 1: Initial attempt
- Day 3: Implement space-optimized version
- Day 7: Solve without looking at hints
- Day 14: Explain approach to someone else
- Day 30: Speed solve under 20 minutes

**Strategy**: See [Dynamic Programming](../strategies/patterns/dynamic-programming.md)
