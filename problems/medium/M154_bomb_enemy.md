---
id: M154
old_id: I160
slug: bomb-enemy
title: Bomb Enemy
difficulty: medium
category: medium
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M156", "E001", "M020"]
prerequisites: ["2d-array", "dynamic-programming", "prefix-sum"]
---
# Bomb Enemy

## Problem

Picture yourself playing a strategic grid-based game where you need to maximize damage with a single bomb. You have an `m x n` grid representing a battlefield where each cell contains one of three things: `'W'` for walls (indestructible barriers), `'E'` for enemies, or `'0'` for empty spaces where you could potentially place your bomb. The rules are straightforward but require careful thinking: you can place exactly one bomb in any empty cell, and when it explodes, it sends shockwaves in all four directions (up, down, left, right) along its row and column. The blast eliminates all enemies it encounters until it hits a wall, which stops the explosion in that direction. Walls are indestructible and act as barriers - they protect enemies on the other side. Your goal is to find the optimal placement that maximizes the total number of enemies destroyed. For example, if you place a bomb that can hit 2 enemies horizontally and 1 enemy vertically, that's 3 total kills. The challenge is that checking every possible empty cell by scanning all four directions would be extremely slow for large grids - you need a smarter approach that avoids recounting enemies repeatedly. Edge cases include grids where all walls block every path (making some positions useless), grids with no enemies (answer is 0), and grids where enemies are clustered in ways that favor certain positions.

**Diagram:**

Example 1: Input `[["0","E","0","0"],["E","0","W","E"],["0","E","0","0"]]`, Output: `3`
```
Grid:           Bomb at (0,1):      Bomb at (1,1):
+---+---+---+---+   +---+---+---+---+   +---+---+---+---+
| 0 | E | 0 | 0 |   | 0 | B | 0 | 0 |   | 0 | E | 0 | 0 |
+---+---+---+---+   +---+---+---+---+   +---+---+---+---+
| E | 0 | W | E |   | X | X | W | E |   | E | B | W | E |
+---+---+---+---+   +---+---+---+---+   +---+---+---+---+
| 0 | E | 0 | 0 |   | 0 | X | 0 | 0 |   | 0 | X | 0 | 0 |
+---+---+---+---+   +---+---+---+---+   +---+---+---+---+
                    Kills: 3 enemies    Kills: 2 enemies

B = Bomb placement, X = Destroyed enemy, W = Wall (blocks blast)
```

Example 2: Input `[["W","W","W"],["0","0","0"],["E","E","E"]]`, Output: `1`
```
Grid:
+---+---+---+
| W | W | W |   Walls in top row block vertical blasts
+---+---+---+
| 0 | 0 | 0 |   Bomb here can only hit enemies in same row
+---+---+---+
| E | E | E |   Can't reach these enemies (blocked by walls)
+---+---+---+

Maximum: 1 enemy (bomb at row 1 hits only horizontal enemies)
```


## Why This Matters

This problem directly models mechanics in strategy games like Bomberman, Minesweeper variants, and tactical tower defense games where you need to optimize placement of area-of-effect weapons. The technique you'll learn - precomputing directional impacts to avoid redundant calculations - is fundamental in game development for rendering line-of-sight (what can a character see without obstacles blocking the view), in robotics for laser scanning and obstacle detection, and in computer vision for calculating projections and shadows. It also appears in network security for analyzing blast radius of attacks (if one server is compromised, which others can be reached), in urban planning for fire station placement (coverage areas until blocked by rivers or highways), and in warehouse optimization where robots need to navigate grid-based storage facilities with blocked aisles. The dynamic programming technique of caching partial results to avoid recalculating is a pattern you'll use constantly in performance-critical applications.

## Constraints

- m == grid.length
- n == grid[i].length
- 1 <= m, n <= 500
- grid[i][j] is either 'W', 'E', or '0'.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Avoid Recalculating</summary>
The brute force approach places a bomb at each empty cell and counts enemies in all four directions, taking O(mn) time per cell for O(m²n²) total. Can you precompute information to avoid recounting enemies for every position?
</details>

<details>
<summary>🎯 Hint 2: Precompute Directional Counts</summary>
For each cell, precompute how many enemies can be hit in each direction (up, down, left, right) until hitting a wall. Use dynamic programming:
- Row hits: Count enemies from last wall to current position
- Column hits: Count enemies from last wall to current position

When you encounter a wall, reset the count. When at an empty cell, sum the four directional counts.
</details>

<details>
<summary>📝 Hint 3: One-Pass Algorithm</summary>
Algorithm:
1. Traverse row by row, left to right
2. Track row_hits: enemies in current row segment (between walls)
3. For each column, track col_hits[j]: enemies in column segment
4. At each empty cell (i, j):
   - If start of new row segment, recount row_hits
   - If start of new column segment, recount col_hits[j]
   - max_kills = max(max_kills, row_hits + col_hits[j])

Key: Reset counts when encountering walls, avoiding redundant computation.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(m²n²) | O(1) | Try each cell, scan all 4 directions |
| **DP with Precomputation** | **O(mn)** | **O(n)** | One pass, track row/col counts |
| Four Arrays | O(mn) | O(mn) | Store counts for all 4 directions per cell |

## Common Mistakes

**Mistake 1: Brute Force for Every Cell**
```python
# Wrong: O(m²n²) - scans all directions for each empty cell
def maxKilledEnemies(grid):
    def count_kills(i, j):
        kills = 0
        # Count in 4 directions
        for di, dj in [(0,1), (0,-1), (1,0), (-1,0)]:
            ni, nj = i + di, j + dj
            while 0 <= ni < len(grid) and 0 <= nj < len(grid[0]):
                if grid[ni][nj] == 'W':
                    break
                if grid[ni][nj] == 'E':
                    kills += 1
                ni += di
                nj += dj
        return kills

    max_kills = 0
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            if grid[i][j] == '0':
                max_kills = max(max_kills, count_kills(i, j))
    return max_kills
```

**Correct Approach:**
```python
# Correct: O(mn) with precomputation
def maxKilledEnemies(grid):
    if not grid:
        return 0

    m, n = len(grid), len(grid[0])
    max_kills = 0
    row_hits = 0
    col_hits = [0] * n

    for i in range(m):
        for j in range(n):
            # Recompute row hits at start or after wall
            if j == 0 or grid[i][j-1] == 'W':
                row_hits = 0
                for k in range(j, n):
                    if grid[i][k] == 'W':
                        break
                    if grid[i][k] == 'E':
                        row_hits += 1

            # Recompute column hits at start or after wall
            if i == 0 or grid[i-1][j] == 'W':
                col_hits[j] = 0
                for k in range(i, m):
                    if grid[k][j] == 'W':
                        break
                    if grid[k][j] == 'E':
                        col_hits[j] += 1

            # Update max if this is empty cell
            if grid[i][j] == '0':
                max_kills = max(max_kills, row_hits + col_hits[j])

    return max_kills
```

**Mistake 2: Not Resetting Counts at Walls**
```python
# Wrong: Doesn't reset counts when hitting walls
def maxKilledEnemies(grid):
    m, n = len(grid), len(grid[0])
    row_hits = 0
    col_hits = [0] * n

    for i in range(m):
        for j in range(n):
            # Wrong: Counts continue through walls
            if grid[i][j] == 'E':
                row_hits += 1
            # Missing: Reset when grid[i][j] == 'W'
```

**Mistake 3: Double Counting Enemies**
```python
# Wrong: Counts enemies at bomb position
def maxKilledEnemies(grid):
    # ... setup ...
    for i in range(m):
        for j in range(n):
            if grid[i][j] == '0':
                kills = row_hits + col_hits[j]
                # Wrong if counting the bomb cell itself
                if grid[i][j] == 'E':  # Never true for '0'
                    kills -= 1
            # ...
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| Multiple Bombs | Place k bombs for maximum kills | DP on state (bombs_left, cells_considered) |
| Directional Bombs | Bomb only hits in 2 directions (e.g., left-right) | Simpler counting, only 2 directions |
| Weighted Enemies | Different enemies have different values | Track sum of values instead of count |
| Diagonal Bombs | Bomb also hits diagonals | Add 4 more directions to track |
| Obstacles with HP | Walls have hit points, reduce by 1 | More complex state tracking |

## Practice Checklist

- [ ] Day 1: Implement O(mn) DP solution
- [ ] Day 2: Optimize space to O(n)
- [ ] Day 7: Solve multiple bombs variation
- [ ] Day 14: Solve with diagonal blasts
- [ ] Day 30: Solve without looking at hints

**Strategy**: See [2D Dynamic Programming](../strategies/patterns/dp-2d.md)
