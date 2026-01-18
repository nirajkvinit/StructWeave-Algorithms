---
id: M555
old_id: A447
slug: unique-paths-iii
title: Unique Paths III
difficulty: medium
category: medium
topics: ["array", "matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Unique Paths III

## Problem

Imagine you're programming a robot to navigate a warehouse floor represented by an `m x n` grid. The robot starts at one position, needs to reach a destination, and must visit every walkable floor tile exactly once for inspection. Think of it as solving a maze with a strict visiting requirement.

Each cell in the grid contains one of four values:

- `1`: Your starting position (appears exactly once in the grid)
- `2`: The destination/ending position (appears exactly once)
- `0`: Empty walkable cells that must be visited during your path
- `-1`: Obstacles or walls that cannot be entered

The robot can move in four cardinal directions: up, down, left, and right (no diagonal movement).

Your challenge: Count how many different valid paths exist from start to destination that step on every single walkable cell (including start and destination) exactly once. Each empty cell marked with `0` must be visited.

For example, in a grid like:
```
[1, 0, 0, 0]
[0, 0, 0, 0]
[0, 0, 2,-1]
```
You must visit all 10 walkable cells (1 start + 8 zeros + 1 end) in your path to the destination.

## Why This Matters

This Hamiltonian path problem appears in manufacturing robotics where machines must inspect every point on a circuit board or production line exactly once for quality control. Warehouse automation systems plan routes for inventory-scanning robots that must visit every shelf location. Laser cutting and 3D printing systems optimize tool paths to cover every required point without backtracking, minimizing production time. Delivery drones plan efficient routes visiting all drop-off locations exactly once. Game level design uses these algorithms for puzzle mechanics requiring complete coverage. DNA sequencing assembles genetic fragments by finding paths through all sequence segments. The constraint of visiting every location exactly once makes this computationally challenging but practically important for any system requiring exhaustive coverage with minimal redundancy.

## Constraints

- m == grid.length
- n == grid[i].length
- 1 <= m, n <= 20
- 1 <= m * n <= 20
- -1 <= grid[i][j] <= 2
- There is exactly one starting cell and one ending cell.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a backtracking problem with a constraint: you must visit every non-obstacle cell exactly once. Count the walkable cells first (all 0's plus start and end), then use DFS to explore paths that visit exactly this many cells.
</details>

<details>
<summary>Main Approach</summary>
Use backtracking/DFS from the starting position. Track visited cells in a set or by marking the grid. At each step, try moving in all 4 directions. When you reach the destination, check if the number of visited cells equals the total walkable cells. Backtrack by unmarking cells after exploring each path.
</details>

<details>
<summary>Optimization Tip</summary>
Mark cells as visited by modifying the grid in-place (changing to -1) rather than using an extra visited set. This saves space. Remember to restore the cell value when backtracking. Early termination: if you reach the end but haven't visited all cells, don't count it as valid.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Backtracking (DFS) | O(4^(m*n)) | O(m*n) | Worst case: explore all possible 4-directional paths; space for recursion stack |
| Optimal | O(4^k) | O(k) | Where k is the number of walkable cells (k ≤ m*n ≤ 20, so manageable) |

## Common Mistakes

1. **Forgetting to count walkable cells**
   ```python
   # Wrong: Not tracking how many cells must be visited
   def uniquePathsIII(grid):
       # DFS without knowing target count
       return dfs(start_row, start_col, 0)

   # Correct: Count empty cells + start + end first
   def uniquePathsIII(grid):
       walkable = sum(row.count(0) for row in grid) + 1  # +1 for start
       return dfs(start_row, start_col, walkable)
   ```

2. **Not restoring grid state during backtracking**
   ```python
   # Wrong: Forgetting to unmark cells
   def dfs(r, c, remaining):
       grid[r][c] = -1  # Mark visited
       # ... explore neighbors ...
       # Missing: grid[r][c] = 0  # Restore!

   # Correct: Always restore state
   def dfs(r, c, remaining):
       original = grid[r][c]
       grid[r][c] = -1
       # ... explore neighbors ...
       grid[r][c] = original  # Restore
   ```

3. **Checking destination condition incorrectly**
   ```python
   # Wrong: Counting paths that reach end but don't visit all cells
   if r == end_r and c == end_c:
       return 1

   # Correct: Only count if all cells visited
   if r == end_r and c == end_c:
       return 1 if remaining == 0 else 0
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Unique Paths I | Easy | Simple DP, no obstacles or visit-all constraint |
| Unique Paths II | Medium | DP with obstacles, no visit-all constraint |
| Word Search | Medium | Backtracking to find word in grid |
| Hamiltonian Path | Hard | Graph version: visit all vertices exactly once |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Backtracking](../../strategies/patterns/backtracking.md)
