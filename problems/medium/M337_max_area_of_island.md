---
id: M337
old_id: A162
slug: max-area-of-island
title: Max Area of Island
difficulty: medium
category: medium
topics: ["matrix"]
patterns: ["dp-2d", "dfs"]
estimated_time_minutes: 30
frequency: high
related_problems:
  - id: M336
    title: Number of Distinct Islands
    difficulty: medium
  - id: E200
    title: Number of Islands
    difficulty: easy
prerequisites:
  - DFS/BFS on grids
  - Grid traversal
  - Connected components
---
# Max Area of Island

## Problem

You're given a 2D grid with `m` rows and `n` columns. Each cell contains either `0` (water) or `1` (land). An island is a group of connected land cells, where "connected" means adjacent horizontally or vertically (not diagonally). The entire grid is surrounded by water on all sides.

The area of an island is simply the count of land cells (`1`s) that belong to it. For example, an island made up of 6 connected cells has an area of 6.

Find the maximum area among all islands in the grid. If there are no islands at all (the entire grid is water), return `0`.

Think of this as finding the largest connected region of land in an aerial map - similar to how you might analyze satellite imagery to find the biggest continuous forest or identify the largest landmass in an archipelago.

**Diagram:**

Example: Grid with islands of different areas
```
0 0 1 0 0 0 0 1 0 0 0 0 0
0 0 0 0 0 0 0 1 1 1 0 0 0
0 1 1 0 1 0 0 0 0 0 0 0 0
0 1 0 0 1 1 0 0 1 0 1 0 0
0 1 0 0 1 1 0 0 1 1 1 0 0
0 0 0 0 0 0 0 0 0 0 1 0 0
0 0 0 0 0 0 0 1 1 1 0 0 0
0 0 0 0 0 0 0 1 1 0 0 0 0

Largest island has area 6 (connected 1s in middle-right section)
```


## Why This Matters

Connected component analysis is everywhere: image segmentation in medical imaging (finding tumor boundaries), terrain analysis in GIS systems, social network clustering (finding communities), and circuit board testing (detecting disconnected traces). This problem teaches the foundational skill of exploring connected regions in 2D space, which extends to 3D voxel analysis in medical scans, flood fill algorithms in graphics editors, and region-growing in computer vision. The pattern of "find all reachable nodes and count them" is one of the most versatile in computer science.

## Examples

**Example 1:**
- Input: `grid = [[0,0,0,0,0,0,0,0]]`
- Output: `0`

## Constraints

- m == grid.length
- n == grid[i].length
- 1 <= m, n <= 50
- grid[i][j] is either 0 or 1.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: DFS Island Exploration</summary>

For each unvisited land cell (value 1), start a depth-first search to explore the entire island. Count the number of cells in this connected component.

The DFS traversal:
1. Check if current position is valid and contains land (1)
2. Mark the current cell as visited (set to 0 or use a visited set)
3. Recursively explore all 4 adjacent cells (up, down, left, right)
4. Return the total count of cells in this island

Keep track of the maximum area found across all islands.

</details>

<details>
<summary>Hint 2: Iterative Approach</summary>

The DFS approach can be implemented recursively or iteratively:

**Recursive DFS:**
```
def dfs(r, c):
    if r < 0 or r >= m or c < 0 or c >= n or grid[r][c] == 0:
        return 0

    grid[r][c] = 0  # mark visited
    area = 1

    area += dfs(r+1, c)
    area += dfs(r-1, c)
    area += dfs(r, c+1)
    area += dfs(r, c-1)

    return area
```

**Iterative DFS (using stack):**
```
def dfs_iterative(start_r, start_c):
    stack = [(start_r, start_c)]
    area = 0

    while stack:
        r, c = stack.pop()
        if r < 0 or r >= m or c < 0 or c >= n or grid[r][c] == 0:
            continue

        grid[r][c] = 0
        area += 1

        stack.extend([(r+1, c), (r-1, c), (r, c+1), (r, c-1)])

    return area
```

Both approaches work equally well. Recursive is cleaner; iterative avoids potential stack overflow.

</details>

<details>
<summary>Hint 3: Complete Solution Pattern</summary>

The overall algorithm:

```
max_area = 0

for i in range(m):
    for j in range(n):
        if grid[i][j] == 1:
            current_area = dfs(i, j)
            max_area = max(max_area, current_area)

return max_area
```

Key points:
- Iterate through every cell in the grid
- When you find an unvisited land cell, calculate its island's area
- Track the maximum area encountered
- Mark cells as visited to avoid counting them multiple times

Time complexity: O(m × n) since each cell is visited at most once
Space complexity: O(m × n) for the recursion stack in worst case (entire grid is one island)

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Recursive DFS | O(m × n) | O(m × n) | Recursion stack can be as deep as grid size |
| Iterative DFS | O(m × n) | O(m × n) | Explicit stack can grow to grid size |
| BFS | O(m × n) | O(m × n) | Queue can contain up to m × n elements |

All approaches have the same asymptotic complexity. The space is dominated by the visited tracking mechanism.

## Common Mistakes

### Mistake 1: Not Marking Cells as Visited
```python
# WRONG: Not marking cells as visited leads to infinite loops
def maxAreaOfIsland(grid):
    def dfs(r, c):
        if r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]):
            return 0
        if grid[r][c] == 0:
            return 0

        # Missing: mark grid[r][c] = 0 to prevent revisiting
        area = 1
        area += dfs(r+1, c)
        area += dfs(r-1, c)
        area += dfs(r, c+1)
        area += dfs(r, c-1)

        return area

    max_area = 0
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            if grid[i][j] == 1:
                max_area = max(max_area, dfs(i, j))
    return max_area
```

**Why it's wrong**: Without marking visited cells, the DFS will revisit the same cells repeatedly, causing infinite recursion. Always mark cells as visited (either modify the grid or use a separate visited set).

### Mistake 2: Incorrect Boundary Checking
```python
# WRONG: Checking boundaries after accessing the grid
def maxAreaOfIsland(grid):
    def dfs(r, c):
        if grid[r][c] == 0:  # Bug: accessing grid before checking bounds
            return 0
        if r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]):
            return 0

        # ... rest of code
```

**Why it's wrong**: You must check boundaries before accessing the grid. Otherwise, you'll get an index out of bounds error when r or c is negative or exceeds the grid dimensions.

### Mistake 3: Not Returning Area Correctly
```python
# WRONG: Not accumulating area from all directions
def maxAreaOfIsland(grid):
    def dfs(r, c):
        if r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]) or grid[r][c] == 0:
            return 0

        grid[r][c] = 0
        area = 1

        # Bug: not accumulating the area from recursive calls
        dfs(r+1, c)
        dfs(r-1, c)
        dfs(r, c+1)
        dfs(r, c-1)

        return area  # Returns 1 instead of total island area

    max_area = 0
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            if grid[i][j] == 1:
                max_area = max(max_area, dfs(i, j))
    return max_area
```

**Why it's wrong**: The DFS calls explore adjacent cells but don't add their areas to the total. You must accumulate: `area += dfs(r+1, c)` for each direction.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Island Perimeter | Easy | Calculate the perimeter of all islands |
| Number of Islands | Easy | Count total number of islands (not max area) |
| Number of Closed Islands | Medium | Count islands not touching the boundary |
| Making A Large Island | Hard | Maximum island size after changing one 0 to 1 |

## Practice Checklist

- [ ] **First attempt**: Solve independently (30 min time limit)
- [ ] **Implement DFS**: Code recursive depth-first search
- [ ] **Try iterative**: Implement stack-based DFS
- [ ] **Implement BFS**: Use queue-based approach for comparison
- [ ] **Spaced repetition**: Revisit after 3 days
- [ ] **Interview practice**: Explain DFS vs BFS trade-offs
- [ ] **Variations**: Solve Number of Islands and Island Perimeter
- [ ] **Final review**: Solve again after 1 week without hints

**Strategy**: See [Grid Traversal Pattern](../strategies/patterns/grid-traversal.md)
