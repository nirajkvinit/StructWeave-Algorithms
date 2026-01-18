---
id: E225
old_id: A200
slug: flood-fill
title: Flood Fill
difficulty: easy
category: easy
topics: ["array", "matrix", "dfs", "bfs"]
patterns: ["dfs", "bfs", "graph-traversal"]
estimated_time_minutes: 15
frequency: high
related_problems:
  - M200_number_of_islands
  - M695_max_area_of_island
  - M130_surrounded_regions
prerequisites:
  - Depth-first search (DFS)
  - Breadth-first search (BFS)
  - 2D array traversal
  - Recursion basics
strategy_ref: ../strategies/patterns/graph-traversal.md
---
# Flood Fill

## Problem

Given a 2D grid representing an image where each cell contains a color value (an integer), perform a **flood fill** operation starting from a specified position. You'll receive three parameters: `sr` (starting row), `sc` (starting column), and `color` (the new color to apply).

The flood fill algorithm works like the paint bucket tool in image editing software. Starting from the initial pixel at `image[sr][sc]`, you identify all pixels that are **connected** (via 4-directional adjacency: up, down, left, right) and share the same original color. Then change all those connected pixels to the new color value. The filling spreads outward to all reachable pixels with the matching original color, similar to water flooding connected regions.

A critical edge case that causes infinite loops: if the starting pixel already has the target color (original color equals new color), you should return the image unchanged. Without this check, you'd continuously revisit pixels since they'd always match the "new" color you're filling with. Also note that diagonal adjacency doesn't count; only the four cardinal directions (up, down, left, right) are considered connected.

The flood fill operation modifies the image in-place and returns the modified grid. All cells with the original color that are reachable from the starting position should be changed to the new color.

**Diagram:**

Flood fill example (sr=1, sc=1, color=2):
```
Before:              After:
1 1 1                2 2 2
1 1 0       →        2 2 0
1 0 1                2 0 1

Starting at (1,1), all connected cells
with value 1 are changed to 2.
```

## Why This Matters

Flood fill is a foundational graph traversal algorithm with applications far beyond image editing. It appears in geographic information systems (identifying connected land masses or water bodies), circuit board design (checking electrical connectivity), game development (determining valid move regions or fog-of-war visibility), and network analysis (finding all nodes reachable from a starting point in same-state groups).

The algorithmic pattern here is **connected component traversal**, where you explore all nodes reachable from a starting point that satisfy certain criteria (same color). This generalizes to problems like finding islands in a grid, determining if two points are connected in a maze, or identifying clusters in data. The choice between DFS (depth-first using recursion or stack) and BFS (breadth-first using queue) teaches important trade-offs: DFS is simpler to code recursively but can overflow the call stack; BFS uses more memory but explores level-by-level.

From an interview perspective, this is a high-frequency problem because it tests multiple skills: 2D array navigation, recursion (if using DFS), preventing infinite loops (checking bounds and previously visited cells), and understanding graph traversal fundamentals. It's a gateway to harder grid problems like number of islands, surrounded regions, and shortest path in a maze. The technique of "mark as visited while exploring" is crucial for many graph algorithms.

Many candidates fail this problem by not handling the same-color edge case, not properly checking bounds before accessing array elements, or marking cells as visited after changing color (causing revisits). Mastering flood fill gives you a mental template for all connected-component grid problems.

## Examples

**Example 1:**
- Input: `image = [[0,0,0],[0,0,0]], sr = 0, sc = 0, color = 0`
- Output: `[[0,0,0],[0,0,0]]`
- Explanation: Since the initial pixel already has the target color (0), the flood fill produces no modifications.

## Constraints

- m == image.length
- n == image[i].length
- 1 <= m, n <= 50
- 0 <= image[i][j], color < 2¹⁶
- 0 <= sr < m
- 0 <= sc < n

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Initial Direction
This is a graph traversal problem where each cell is a node connected to its 4 neighbors. You need to visit all cells with the original color that are reachable from the starting position. What traversal algorithms do you know that visit all reachable nodes?

### Tier 2 Hint - Key Insight
Use DFS (recursive) or BFS (iterative with queue) to explore connected cells. Record the original color first. If the original color equals the new color, return immediately to avoid infinite recursion. For each cell, change its color and recursively/iteratively process its 4 neighbors if they have the original color.

### Tier 3 Hint - Implementation Details
DFS approach: Save `original_color = image[sr][sc]`. If `original_color == color`, return unchanged image. Create a helper function `dfs(r, c)` that checks bounds, checks if `image[r][c] == original_color`, changes to new color, then calls dfs on 4 neighbors. Start with `dfs(sr, sc)`.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| DFS (recursive) | O(m * n) | O(m * n) | Call stack can be O(m*n) in worst case |
| BFS (iterative) | O(m * n) | O(m * n) | Queue can hold O(m*n) cells |
| DFS (iterative stack) | O(m * n) | O(m * n) | Explicit stack instead of recursion |

**Optimization notes:**
- Both DFS and BFS visit each cell at most once
- Space complexity depends on connectivity of same-colored region
- No asymptotic improvement possible beyond O(m*n)

## Common Mistakes

### Mistake 1: Not handling same-color case
```python
# Wrong - infinite recursion if original_color == color
def floodFill(image, sr, sc, color):
    original = image[sr][sc]
    dfs(sr, sc, original, color)  # Infinite loop!

# Correct - early return
def floodFill(image, sr, sc, color):
    original = image[sr][sc]
    if original == color:
        return image
    dfs(sr, sc, original, color)
```

### Mistake 2: Checking color after modification
```python
# Wrong - already changed, will revisit infinitely
def dfs(r, c, original, new_color):
    image[r][c] = new_color
    if image[r][c] == original:  # Already changed!
        # Recursively visit neighbors

# Correct - check before modification
def dfs(r, c, original, new_color):
    if image[r][c] != original:
        return
    image[r][c] = new_color
    # Recursively visit neighbors
```

### Mistake 3: Not checking bounds properly
```python
# Wrong - may access out of bounds
def dfs(r, c):
    if image[r][c] == original:  # Check bounds first!
        image[r][c] = color
        dfs(r+1, c)

# Correct - bounds check first
def dfs(r, c):
    if r < 0 or r >= m or c < 0 or c >= n:
        return
    if image[r][c] != original:
        return
    image[r][c] = color
    # Visit neighbors
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Count connected components | Easy | Count number of separate regions of same color |
| Max area of island | Medium | Find largest connected component of 1s |
| Surrounded regions | Medium | Flip regions that are not connected to boundary |
| 8-directional flood fill | Easy | Include diagonal neighbors (8 directions) |
| Multi-color flood fill | Medium | Fill with pattern or gradient instead of single color |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve independently without hints (30 min time limit)
- [ ] Implement DFS recursive solution
- [ ] Handle same-color edge case
- [ ] Test with fully connected and disconnected regions

**Spaced Repetition**
- [ ] Day 1: Solve again from scratch
- [ ] Day 3: Implement BFS iterative version
- [ ] Week 1: Solve number of islands variation
- [ ] Week 2: Solve max area of island variation

**Mastery Validation**
- [ ] Can explain DFS vs BFS trade-offs
- [ ] Can handle all edge cases correctly
- [ ] Solve in under 10 minutes
- [ ] Implement without referring to notes

**Strategy**: See [Graph Traversal Pattern](../strategies/patterns/graph-traversal.md)
