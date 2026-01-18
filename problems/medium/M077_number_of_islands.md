---
id: M077
old_id: F185
slug: number-of-islands
title: Number of Islands
difficulty: medium
category: medium
topics: ["matrix", "graph", "dfs", "bfs"]
patterns: ["dp-2d", "graph-traversal"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M076", "M072", "E001"]
prerequisites: ["dfs", "bfs", "graph-traversal", "connected-components"]
strategy_ref: ../strategies/patterns/graph-traversal.md
---
# Number of Islands

## Problem

Given a 2D grid representing a map where '1' represents land and '0' represents water, count the number of distinct islands. An island is formed by connecting adjacent land cells horizontally or vertically (not diagonally). For example, a cluster of connected '1's forms a single island, no matter how large or irregularly shaped. Think of this as a connected components problem - you need to identify separate groups of connected land cells. When you discover a land cell ('1'), you've potentially found a new island, but you need to mark all cells belonging to that island as visited to avoid counting it multiple times. Consider using depth-first search (DFS) or breadth-first search (BFS) to "flood fill" each island, marking all connected cells. Edge cases include grids with no land (0 islands), grids with all land (1 island), single-cell islands, and long snake-like islands that stretch across the grid.

## Why This Matters

Island counting is a foundational pattern in image processing, geographic information systems, and network analysis. Medical imaging software uses this algorithm to identify and count distinct tumors or lesions in MRI scans, where connected pixels above a threshold form separate regions of interest. Satellite image analysis employs this technique to count forest patches, detect urban sprawl, or identify distinct water bodies from aerial photography. Video game map generators use connected component analysis to ensure procedurally generated terrain has properly separated landmasses. Network security systems apply this pattern to identify isolated subnetworks or detect segmented groups of compromised machines. The flood-fill algorithm you learn here powers the paint bucket tool in graphics editors, circuit board testing (finding disconnected components), and maze solving algorithms. This problem teaches you graph traversal on implicit grids, a skill that extends to robot path planning, cellular automata simulations, and any domain where spatial connectivity matters.

## Examples

**Example 1:**
- Input: `grid = [
  ["1","1","1","1","0"],
  ["1","1","0","1","0"],
  ["1","1","0","0","0"],
  ["0","0","0","0","0"]
]`
- Output: `1`

**Example 2:**
- Input: `grid = [
  ["1","1","0","0","0"],
  ["1","1","0","0","0"],
  ["0","0","1","0","0"],
  ["0","0","0","1","1"]
]`
- Output: `3`

## Constraints

- m == grid.length
- n == grid[i].length
- 1 <= m, n <= 300
- grid[i][j] is '0' or '1'.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Connected Components</summary>

Each island is a connected component of 1s (connected horizontally or vertically, not diagonally). When you find a 1, you've found an island. How do you mark all connected 1s as visited so you don't count the same island multiple times?

</details>

<details>
<summary>🎯 Hint 2: DFS or BFS Traversal</summary>

Use DFS (depth-first search) or BFS (breadth-first search) to explore the entire island:
1. Iterate through the grid
2. When you find a '1', increment island count
3. Use DFS/BFS to mark all connected '1's as visited (change to '0' or use visited set)
4. Continue scanning for more islands

DFS is simpler to implement with recursion.

</details>

<details>
<summary>📝 Hint 3: DFS Implementation</summary>

```python
def numIslands(grid):
    if not grid:
        return 0

    count = 0
    rows, cols = len(grid), len(grid[0])

    def dfs(r, c):
        # Base cases: out of bounds or water
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == '0':
            return

        # Mark as visited
        grid[r][c] = '0'

        # Explore 4 directions
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                dfs(r, c)  # Sink the island

    return count
```

Time: O(m*n)
Space: O(m*n) worst case for recursion stack

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| DFS (Recursive) | O(m*n) | O(m*n) | Recursion stack in worst case |
| BFS (Queue) | O(m*n) | O(min(m,n)) | Queue size bounded by width |
| Union-Find | O(m*n*α(m*n)) | O(m*n) | α is inverse Ackermann (nearly constant) |
| **DFS/BFS both optimal** | **O(m*n)** | **Varies** | Visit each cell once |

## Common Mistakes

### 1. Not Marking Visited Cells

```python
# WRONG: Infinite recursion / double counting
def dfs(r, c):
    if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == '0':
        return
    # Missing: grid[r][c] = '0'
    dfs(r+1, c)
    # ... infinite loop!

# CORRECT: Mark as visited immediately
def dfs(r, c):
    if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == '0':
        return
    grid[r][c] = '0'  # Mark visited
    dfs(r+1, c)
```

### 2. Diagonal Connections

```python
# WRONG: Treats diagonal as connected
dfs(r+1, c+1)  # Not part of same island!

# CORRECT: Only 4 directions (up, down, left, right)
dfs(r+1, c)
dfs(r-1, c)
dfs(r, c+1)
dfs(r, c-1)
```

### 3. Modifying Input vs. Using Visited Set

```python
# WRONG: Creates visited set but doesn't use it
visited = set()
def dfs(r, c):
    if grid[r][c] == '0':
        return
    visited.add((r, c))
    # ... but doesn't check visited in base case

# CORRECT: Either modify grid OR use visited properly
def dfs(r, c):
    if (r, c) in visited or grid[r][c] == '0':
        return
    visited.add((r, c))
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Max Island Size | Find largest island area | Track size during DFS |
| Number of Distinct Islands | Count unique shapes | Normalize island coordinates |
| Surrounded Regions | Capture regions surrounded by 'X' | DFS from edges first |
| Island Perimeter | Calculate total perimeter | Count edges during traversal |
| Making A Large Island | Flip one 0 to 1, maximize island size | Union-Find with size tracking |

## Practice Checklist

- [ ] Handles empty/edge cases (empty grid, all 0s, all 1s)
- [ ] Can explain approach in 2 min (DFS/BFS to mark connected components)
- [ ] Can code solution in 15 min
- [ ] Can discuss time/space complexity (O(m*n) time)
- [ ] Can implement both DFS and BFS approaches

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Graph Traversal Pattern](../../strategies/patterns/graph-traversal.md)
