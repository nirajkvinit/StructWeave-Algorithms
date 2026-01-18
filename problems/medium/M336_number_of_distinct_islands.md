---
id: M336
old_id: A161
slug: number-of-distinct-islands
title: Number of Distinct Islands
difficulty: medium
category: medium
topics: ["matrix"]
patterns: ["dp-2d", "dfs"]
estimated_time_minutes: 30
frequency: medium
related_problems:
  - id: M337
    title: Max Area of Island
    difficulty: medium
  - id: E200
    title: Number of Islands
    difficulty: easy
prerequisites:
  - DFS/BFS on grids
  - Hash set usage
  - Path encoding/normalization
---
# Number of Distinct Islands

## Problem

Given a binary 2D grid where each cell contains either `0` (representing water) or `1` (representing land), find how many distinct island shapes exist in the grid.

An island is formed by connecting adjacent land cells (`1`s) horizontally or vertically (the four cardinal directions: up, down, left, right). Diagonal connections don't count. You can assume all four edges of the grid are surrounded by water.

Here's the key challenge: two islands are considered the same shape if one can be translated (shifted up/down or left/right) to perfectly match the other. However, rotations and reflections are NOT allowed. For example:

```
Shape A:    Shape B:    Shape C:
  1 1         1           1 1
  1           1 1         1 1

Shape A and C are the same (both are 2x2 squares).
Shape B is different (L-shape).
Even if you rotate Shape B, it doesn't become Shape A - rotations don't count as "same."
```

Your task is to count how many unique shapes appear in the grid, where "unique" means they can't be made identical through translation alone.

**Diagram:**

Example 1: Grid with 1 distinct island shape (appears twice)
```
1 1 0 0 0
1 1 0 0 0
0 0 0 1 1
0 0 0 1 1

Shape 1: 2x2 square (appears at top-left and bottom-right)
```

Example 2: Grid with 3 distinct island shapes
```
1 1 0 1 1
1 0 0 0 0
0 0 0 0 1
1 1 0 1 0

Shape 1: L-shape at top-left
Shape 2: horizontal pair at top-right
Shape 3: single cell shapes
```


## Why This Matters

Shape recognition and normalization is fundamental to computer vision, pattern matching in genomics (finding recurring DNA motifs), and deduplication in spatial databases. This problem teaches you how to canonicalize shapes - converting different instances of the same pattern into identical representations, a technique used in image fingerprinting, gesture recognition, and molecule matching in chemistry. The coordinate normalization approach you'll develop here extends to clustering algorithms and finding isomorphic subgraphs in network analysis.

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
<summary>Hint 1: Island Traversal and Shape Encoding</summary>

The key challenge is representing island shapes in a way that makes identical shapes have the same representation, regardless of their position in the grid.

When you find an island (a cell with value 1), perform a DFS/BFS to explore all connected land cells. During traversal, record the shape by encoding the path you take. For example, you might record directions as:
- 'D' for down
- 'R' for right
- 'U' for up
- 'L' for left

The sequence of moves creates a unique signature for the island's shape.

</details>

<details>
<summary>Hint 2: Normalizing Island Coordinates</summary>

A more robust approach is to collect all coordinates that belong to an island during DFS, then normalize them by subtracting the minimum row and column values:

```
Island at positions: [(1,1), (1,2), (2,1)]
Normalize by subtracting min row (1) and min col (1):
Result: [(0,0), (0,1), (1,0)]
```

Convert this normalized coordinate list to a tuple or string and add it to a set. The set automatically handles duplicates, so its final size is the number of distinct shapes.

Important: Sort the coordinates before converting to tuple to ensure consistent representation.

</details>

<details>
<summary>Hint 3: Path Encoding with Backtracking Markers</summary>

Another elegant approach is to encode the DFS path, including backtracking:

```
def dfs(r, c, path, direction):
    if out of bounds or grid[r][c] == 0:
        return

    grid[r][c] = 0  # mark visited
    path.append(direction)

    dfs(r+1, c, path, 'D')
    dfs(r-1, c, path, 'U')
    dfs(r, c+1, path, 'R')
    dfs(r, c-1, path, 'L')

    path.append('B')  # backtrack marker

# For each island, start with path = ['O'] (origin)
```

The path encoding captures the shape uniquely. For example:
- Square island: ['O','D','R','B','L','B','U','B','B']
- Different shape produces different encoding

Add each path to a set (convert to tuple first). The set size is the answer.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Coordinate Normalization | O(m × n) | O(m × n) | Visit each cell once, store coordinates |
| Path Encoding (DFS) | O(m × n) | O(m × n) | Same visit pattern, store paths |
| Path Encoding (BFS) | O(m × n) | O(m × n) | Alternative traversal, same complexity |

All approaches have the same asymptotic complexity, differing mainly in implementation style.

## Common Mistakes

### Mistake 1: Not Normalizing Coordinates
```python
# WRONG: Using absolute coordinates without normalization
def numDistinctIslands(grid):
    islands = set()

    def dfs(r, c, coords):
        if r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]) or grid[r][c] == 0:
            return
        grid[r][c] = 0
        coords.append((r, c))  # Bug: absolute coordinates, not normalized

        dfs(r+1, c, coords)
        dfs(r-1, c, coords)
        dfs(r, c+1, coords)
        dfs(r, c-1, coords)

    for i in range(len(grid)):
        for j in range(len(grid[0])):
            if grid[i][j] == 1:
                coords = []
                dfs(i, j, coords)
                islands.add(tuple(coords))  # Wrong: each island has unique absolute coords

    return len(islands)
```

**Why it's wrong**: Absolute coordinates make every island unique, even if they have the same shape. You must normalize coordinates relative to the island's top-left corner (min row and column).

### Mistake 2: Incorrect Path Encoding
```python
# WRONG: Not including backtracking markers in path
def numDistinctIslands(grid):
    islands = set()

    def dfs(r, c, path, direction):
        if r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]) or grid[r][c] == 0:
            return
        grid[r][c] = 0
        path.append(direction)

        # Missing backtrack markers
        dfs(r+1, c, path, 'D')
        dfs(r-1, c, path, 'U')
        dfs(r, c+1, path, 'R')
        dfs(r, c-1, path, 'L')

    # ... rest of code
```

**Why it's wrong**: Without backtracking markers, different island shapes can produce the same path encoding. For example, an L-shape and a straight line might both produce "DR" if you don't mark when you backtrack from a dead end.

### Mistake 3: Not Marking Cells as Visited
```python
# WRONG: Not marking visited cells, leading to infinite loops
def numDistinctIslands(grid):
    islands = set()
    visited = set()

    def dfs(r, c, coords):
        if r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]):
            return
        if grid[r][c] == 0:
            return
        # Missing: check if already visited and mark as visited

        coords.append((r, c))

        dfs(r+1, c, coords)
        dfs(r-1, c, coords)
        dfs(r, c+1, coords)
        dfs(r, c-1, coords)
```

**Why it's wrong**: Without marking cells as visited (either by modifying the grid or using a visited set), DFS will revisit the same cells infinitely. Always mark cells as visited before recursing.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Distinct Islands II | Hard | Count distinct shapes including rotations and reflections |
| Largest Distinct Island | Medium | Find the size of the largest unique island shape |
| Island Perimeter Grouping | Medium | Group islands by their perimeter length |
| 8-Directional Islands | Medium | Include diagonal connections |

## Practice Checklist

- [ ] **First attempt**: Solve independently (45 min time limit)
- [ ] **Implement DFS**: Code island traversal with coordinate collection
- [ ] **Normalize coordinates**: Subtract min row/col to make shapes comparable
- [ ] **Try path encoding**: Implement alternative approach with direction markers
- [ ] **Spaced repetition**: Revisit after 3 days
- [ ] **Interview practice**: Explain shape normalization clearly
- [ ] **Variations**: Solve Number of Islands and Max Area of Island
- [ ] **Final review**: Solve again after 1 week without hints

**Strategy**: See [Grid DFS Pattern](../strategies/patterns/grid-traversal.md)
