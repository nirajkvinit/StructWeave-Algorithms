---
id: M208
old_id: I262
slug: island-perimeter
title: Island Perimeter
difficulty: medium
category: medium
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E200", "M695", "M733"]
prerequisites: ["2d-arrays", "grid-traversal", "counting"]
---
# Island Perimeter

## Problem

Given a 2D grid representing a map where `grid[i][j] = 1` is land and `grid[i][j] = 0` is water, calculate the perimeter of the single island in the grid. The island is formed by connected land cells (horizontally or vertically adjacent, not diagonally). The grid is completely surrounded by water, and the island has no internal lakes.

Think of each cell as a unit square with sides of length 1. The perimeter is the total length of the island's boundary—the number of cell edges that touch water or the grid boundary. A single isolated land cell has a perimeter of 4. When two land cells are adjacent, they share an edge, so their combined perimeter is 6 (not 8).

The challenge is efficiently counting exposed edges without double-counting or missing any. A naive approach might check all four directions for each land cell, but there's a more elegant pattern. Consider that each land cell starts with 4 potential perimeter edges, but each time it neighbors another land cell, both cells lose one exposed edge (the shared boundary). This insight leads to a single-pass solution that's both simple and efficient.


**Diagram:**

```
Example grid with island:
  0 1 2 3
0 0 1 0 0
1 1 1 1 0
2 1 1 0 0
3 1 1 0 0

Legend: 0 = water, 1 = land
Perimeter = 16 (count exposed edges of land cells)
```


## Why This Matters

Grid-based perimeter calculation appears in image processing (contour detection), geographic information systems (boundary measurement), and game development (collision detection). The pattern of counting cell edges based on neighbor relationships is foundational for understanding more complex grid algorithms like flood fill, connected component labeling, and region growing. This problem teaches an important optimization principle: instead of checking all possibilities (4 directions per cell), check only what's necessary (2 directions) to avoid redundant work. The ability to work with 2D arrays and reason about spatial relationships is essential for computer graphics, pathfinding, and grid-based simulations.

## Examples

**Example 1:**
- Input: `grid = [[1]]`
- Output: `4`

**Example 2:**
- Input: `grid = [[1,0]]`
- Output: `4`

## Constraints

- row == grid.length
- col == grid[i].length
- 1 <= row, col <= 100
- grid[i][j] is 0 or 1.
- There is exactly one island in grid.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Count Contributions</summary>

Each land cell can contribute 0-4 edges to the perimeter depending on its neighbors. Think about when an edge is exposed: it's exposed when it faces water or the grid boundary. Instead of tracking the perimeter directly, count how many exposed edges each land cell has.

</details>

<details>
<summary>🎯 Hint 2: Edge Reduction Pattern</summary>

Start by assuming each land cell contributes 4 edges. Then, for each pair of adjacent land cells, subtract 2 from the total (one edge from each cell is shared). This transforms the problem from "count exposed edges" to "count total edges minus shared edges."

</details>

<details>
<summary>📝 Hint 3: Single Pass Algorithm</summary>

```
perimeter = 0
for each cell (i, j):
    if grid[i][j] == 1:
        perimeter += 4
        if i > 0 and grid[i-1][j] == 1:
            perimeter -= 2  # shared top edge
        if j > 0 and grid[i][j-1] == 1:
            perimeter -= 2  # shared left edge
return perimeter
```

Only check top and left neighbors to avoid double-counting shared edges.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Check All 4 Directions) | O(rows × cols) | O(1) | Check each cell and count exposed edges in all 4 directions |
| Optimized (Check 2 Directions) | O(rows × cols) | O(1) | Check only top and left to avoid double-counting |
| Mathematical (Count Land - Shared) | O(rows × cols) | O(1) | Same time, cleaner logic |

## Common Mistakes

**Mistake 1: Double-Counting Shared Edges**

```python
# Wrong: Checks all 4 directions and double-counts
def island_perimeter(grid):
    perimeter = 0
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            if grid[i][j] == 1:
                for di, dj in [(0,1), (0,-1), (1,0), (-1,0)]:
                    ni, nj = i + di, j + dj
                    if ni < 0 or ni >= len(grid) or nj < 0 or nj >= len(grid[0]) or grid[ni][nj] == 0:
                        perimeter += 1
    return perimeter
```

```python
# Correct: Start with 4, subtract shared edges
def island_perimeter(grid):
    perimeter = 0
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            if grid[i][j] == 1:
                perimeter += 4
                # Only check top and left to avoid double-counting
                if i > 0 and grid[i-1][j] == 1:
                    perimeter -= 2
                if j > 0 and grid[i][j-1] == 1:
                    perimeter -= 2
    return perimeter
```

**Mistake 2: Forgetting Grid Boundaries**

```python
# Wrong: Doesn't handle boundaries properly
def island_perimeter(grid):
    count = 0
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            if grid[i][j] == 1:
                # This will crash at boundaries
                if grid[i-1][j] == 0:
                    count += 1
```

```python
# Correct: Check boundaries first
def island_perimeter(grid):
    count = 0
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            if grid[i][j] == 1:
                if i == 0 or grid[i-1][j] == 0:
                    count += 1
```

**Mistake 3: Inefficient DFS/BFS When Not Needed**

```python
# Wrong: Unnecessary complexity using DFS
def island_perimeter(grid):
    visited = set()
    def dfs(i, j):
        # Complex DFS logic...
        pass
    # This problem doesn't need DFS at all!
```

```python
# Correct: Simple iteration is sufficient
def island_perimeter(grid):
    perimeter = 0
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            if grid[i][j] == 1:
                perimeter += 4
                if i > 0 and grid[i-1][j] == 1:
                    perimeter -= 2
                if j > 0 and grid[i][j-1] == 1:
                    perimeter -= 2
    return perimeter
```

## Variations

| Variation | Difference | Approach Change |
|-----------|-----------|-----------------|
| Multiple Islands | Count perimeter of largest island | Add DFS/BFS to identify islands first |
| Internal Lakes | Water cells surrounded by land contribute to perimeter | Track outer vs inner water separately |
| 3D Island | Cube grid instead of 2D | Extend to 6 directions, same logic |
| Diagonal Connections | Cells connect diagonally | Check 8 neighbors instead of 4 |
| Weighted Edges | Different edge types have different values | Multiply contribution by edge weight |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Reviewed solution
- [ ] Implemented without hints (Day 1)
- [ ] Solved again (Day 3)
- [ ] Solved again (Day 7)
- [ ] Solved again (Day 14)
- [ ] Attempted all variations above

**Strategy**: See [2D Dynamic Programming](../strategies/patterns/dp-2d.md)
