---
id: M263
old_id: A058
slug: longest-line-of-consecutive-one-in-matrix
title: Longest Line of Consecutive One in Matrix
difficulty: medium
category: medium
topics: ["array", "matrix", "dynamic-programming"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M695_max_area_of_island", "M200_number_of_islands", "E035_search_insert_position"]
prerequisites: ["2d-array", "dynamic-programming", "matrix-traversal"]
---
# Longest Line of Consecutive One in Matrix

## Problem

Given a binary matrix `mat` (containing only 0s and 1s) with dimensions `m x n`, find the length of the longest consecutive sequence of 1s. Unlike typical "connected component" problems, the 1s must form a straight line in one of four specific orientations: horizontal (left to right), vertical (top to bottom), diagonal (top-left to bottom-right), or anti-diagonal (top-right to bottom-left).

For example, in a horizontal line, you'd have `1 1 1` in the same row. In a diagonal line, you'd move down-right with each step. The key challenge is efficiently checking all four directions for every cell without redundant work. A naive approach would check each starting position and extend in all directions, but dynamic programming can solve this in a single pass through the matrix.

Important edge cases to consider: the matrix might be entirely 0s (answer is 0), entirely 1s (answer depends on dimensions), or have a single row or column where only some directions apply.

**Diagram:**

```
Example 1:
Input: mat = [[0,1,1,0],
              [0,1,1,0],
              [0,0,0,1]]

    0  1  1  0
    0  1  1  0
    0  0  0  1

Output: 3
Explanation: The longest line has 3 consecutive 1's (vertical line in column 1)
```

```
Example 2:
Input: mat = [[1,1,1,1],
              [0,1,1,0],
              [0,0,0,1]]

    1  1  1  1
    0  1  1  0
    0  0  0  1

Output: 4
Explanation: The longest line has 4 consecutive 1's (horizontal line in row 0)
```


## Why This Matters

Matrix traversal problems with directional constraints appear frequently in image processing (detecting edges or lines in photos), game development (checking win conditions like Connect Four or Gomoku), and computer vision (identifying patterns in pixel data). This problem teaches you how to track multiple states simultaneously using 3D dynamic programming, where each cell maintains information for different directions. The pattern of extending consecutive sequences from previous cells is fundamental to many DP problems, from longest increasing subsequences to string matching algorithms.

## Constraints

- m == mat.length
- n == mat[i].length
- 1 <= m, n <= 10⁴
- 1 <= m * n <= 10⁴
- mat[i][j] is either 0 or 1.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Dynamic Programming with 4 Directions</summary>

The key insight is to track the length of consecutive 1's ending at each position for all four directions: horizontal, vertical, diagonal, and anti-diagonal.

Create a 3D DP array `dp[i][j][d]` where:
- `i, j` are matrix coordinates
- `d` is direction: 0=horizontal, 1=vertical, 2=diagonal, 3=anti-diagonal

For each cell with value 1, extend the consecutive count from the previous cell in each direction.
</details>

<details>
<summary>Hint 2: Direction Vectors</summary>

Define the four directions and their reverse movements:
```
Horizontal: (0, -1) - check left cell
Vertical: (-1, 0) - check top cell
Diagonal: (-1, -1) - check top-left cell
Anti-diagonal: (-1, 1) - check top-right cell
```

For each cell `mat[i][j] == 1`, calculate:
```
dp[i][j][d] = dp[i+dx][j+dy][d] + 1 if within bounds
            = 1 otherwise (start of new line)
```

Track the maximum value across all dp entries.
</details>

<details>
<summary>Hint 3: Space Optimization</summary>

Instead of a 3D array, you can use a 2D array where each cell stores 4 values (one for each direction) as a tuple or list.

```python
# Pseudocode:
max_length = 0
dp = [[[0]*4 for _ in range(n)] for _ in range(m)]
directions = [(0,-1), (-1,0), (-1,-1), (-1,1)]

for i in range(m):
    for j in range(n):
        if mat[i][j] == 1:
            for d, (dx, dy) in enumerate(directions):
                prev_i, prev_j = i + dx, j + dy
                if 0 <= prev_i < m and 0 <= prev_j < n:
                    dp[i][j][d] = dp[prev_i][prev_j][d] + 1
                else:
                    dp[i][j][d] = 1
                max_length = max(max_length, dp[i][j][d])

return max_length
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| 3D DP (Optimal) | O(m * n) | O(m * n) | Track 4 directions for each cell |
| Brute Force | O(m² * n²) | O(1) | Check all starting positions and directions |
| DFS for Each Cell | O(m * n * max(m,n)) | O(m * n) | Inefficient due to repeated work |

## Common Mistakes

1. **Not checking all four directions**
```python
# Wrong: Only checking horizontal and vertical
for i in range(m):
    for j in range(n):
        if mat[i][j] == 1:
            # Missing diagonal and anti-diagonal
            dp[i][j][0] = dp[i][j-1][0] + 1  # horizontal
            dp[i][j][1] = dp[i-1][j][1] + 1  # vertical

# Correct: Check all 4 directions
directions = [(0,-1), (-1,0), (-1,-1), (-1,1)]
for d, (dx, dy) in enumerate(directions):
    # ... check each direction
```

2. **Incorrect boundary checking for anti-diagonal**
```python
# Wrong: Anti-diagonal goes up-right, may go out of bounds on right
prev_j = j + 1
if prev_i >= 0 and prev_j < n:  # Need both checks
    dp[i][j][3] = dp[prev_i][prev_j][3] + 1

# Correct: Check both i and j bounds
prev_i, prev_j = i - 1, j + 1
if 0 <= prev_i < m and 0 <= prev_j < n:
    dp[i][j][3] = dp[prev_i][prev_j][3] + 1
```

3. **Forgetting to handle zeros**
```python
# Wrong: Initializing DP for all cells
for i in range(m):
    for j in range(n):
        dp[i][j][d] = dp[prev_i][prev_j][d] + 1  # Wrong for 0 cells

# Correct: Only process cells with 1
if mat[i][j] == 1:
    dp[i][j][d] = dp[prev_i][prev_j][d] + 1
else:
    dp[i][j][d] = 0  # Reset for zeros
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Longest Line of K | Medium | Find longest line with at least k consecutive 1's |
| Count All Lines | Medium | Count total number of lines (not just longest) |
| Multiple Matrices | Hard | Find longest line across multiple aligned matrices |
| 3D Matrix | Hard | Extend to 3D with 13 possible directions |

## Practice Checklist

- [ ] Solve using 3D DP approach
- [ ] Handle edge case: all zeros
- [ ] Handle edge case: all ones
- [ ] Handle edge case: single row or column
- [ ] **Day 3**: Solve again without hints
- [ ] **Week 1**: Optimize space to O(n) using rolling arrays
- [ ] **Week 2**: Solve from memory in under 25 minutes

**Strategy**: See [2D Dynamic Programming](../strategies/patterns/dynamic-programming.md)
