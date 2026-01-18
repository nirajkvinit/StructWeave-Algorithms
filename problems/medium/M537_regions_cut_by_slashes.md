---
id: M537
old_id: A426
slug: regions-cut-by-slashes
title: Regions Cut By Slashes
difficulty: medium
category: medium
topics: ["string", "matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Regions Cut By Slashes

## Problem

Imagine taking a square grid and drawing diagonal lines through some cells - like tic-tac-toe boards with slashes. These slashes divide the grid into separate regions. How many distinct regions do you end up with?

You have an `n x n` grid where each `1 x 1` cell contains one of three characters: `'/'`, `'\'`, or a blank space `' '`. These characters partition each cell into separate regions.

For example:
- A `'/'` slash divides a cell diagonally from bottom-left to top-right
- A `'\'` slash divides it from top-left to bottom-right
- A space `' '` keeps the cell as one region

Given the grid as a string array, calculate the total number of distinct regions formed.

Note: Backslashes are escaped in strings, so `'\'` appears as `'\\'` in code.


**Diagram:**

```
Example 1: grid = [" /", "/ "]
┌───┬───┐
│ / │   │  → 2 regions
├───┼───┤
│ / │   │
└───┴───┘

Example 2: grid = [" /", "  "]
┌───┬───┐
│ / │   │  → 1 region (all connected)
├───┼───┤
│   │   │
└───┴───┘

Example 3: grid = ["/\\", "\\/"]
┌───┬───┐
│ /\│   │  → 5 regions (4 small triangles + 1 center)
├───┼───┤
│ \/│   │
└───┴───┘

Each slash divides cells into regions.
Count total distinct regions formed.
```


## Why This Matters

Dividing space into regions and counting connected components appears in computer graphics (flood fill tools in paint programs), image segmentation (identifying separate objects in photos), geographical information systems (counting land parcels), and circuit board design (identifying isolated electrical regions). This problem teaches you to transform a visual/geometric problem into a graph connectivity problem. The key insight - treating each cell as multiple sub-regions connected by the slashes - is a powerful technique that applies to any problem involving spatial partitioning or boundary detection.

## Constraints

- n == grid.length == grid[i].length
- 1 <= n <= 30
- grid[i][j] is either '/', '\', or ' '.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Think of this as a graph connectivity problem. Each cell can be divided into 4 triangular regions (top, right, bottom, left). The slashes connect these triangular regions in different ways. The problem becomes finding connected components in a graph where nodes are these triangular regions.
</details>

<details>
<summary>Main Approach</summary>
Scale up the grid by treating each 1x1 cell as a 3x3 mini-grid. A '/' slash fills specific cells diagonally, and a '\' fills the opposite diagonal. Convert the slashes to a larger matrix representation, then use Union-Find (Disjoint Set Union) or DFS/BFS to count connected regions of empty space.
</details>

<details>
<summary>Optimization Tip</summary>
Instead of creating a 3n x 3n grid, you can use Union-Find directly on the 4 triangular regions per cell. Connect regions based on slash types: '/' connects top-left and bottom-right pairs, '\' connects top-right and bottom-left pairs, and ' ' connects all four regions. Adjacent cells share edges, so connect their touching regions.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Grid Expansion + DFS/BFS | O(n²) | O(n²) | Expand to 3n x 3n grid, then flood fill |
| Union-Find (4 regions per cell) | O(n² × α(n)) | O(n²) | α(n) is inverse Ackermann, nearly constant |
| Optimal (Union-Find) | O(n² × α(n)) | O(n²) | Most efficient approach |

## Common Mistakes

1. **Treating cells as single units**
   ```python
   # Wrong: Each cell is one region
   regions = n * n  # Ignores slash partitioning

   # Correct: Each cell can be divided into parts
   # Use 3x3 expansion or 4 triangular regions per cell
   ```

2. **Incorrect slash direction in grid expansion**
   ```python
   # Wrong: Confusing '/' and '\' directions
   if grid[i][j] == '/':
       matrix[3*i][3*j] = 1  # Wrong diagonal

   # Correct: Map slashes to proper diagonals
   if grid[i][j] == '/':
       matrix[3*i][3*j+2] = 1
       matrix[3*i+1][3*j+1] = 1
       matrix[3*i+2][3*j] = 1
   ```

3. **Forgetting to connect adjacent cells**
   ```python
   # Wrong: Only processing slashes within cells
   for cell in grid:
       process_slash(cell)
   # Missing: connections between neighboring cells

   # Correct: Connect regions across cell boundaries
   # Right side of cell (i,j) connects to left side of (i,j+1)
   # Bottom of (i,j) connects to top of (i+1,j)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Number of Islands | Medium | Standard connected components, no slash complexity |
| Surrounded Regions | Medium | Specific region identification and modification |
| Making A Large Island | Hard | Dynamic connectivity with modification |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Union-Find](../../strategies/patterns/union-find.md)
