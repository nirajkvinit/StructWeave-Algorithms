---
id: M487
old_id: A359
slug: surface-area-of-3d-shapes
title: Surface Area of 3D Shapes
difficulty: medium
category: medium
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Surface Area of 3D Shapes

## Problem

Imagine you're creating a 3D modeling program where users build structures by stacking unit cubes (each measuring `1 x 1 x 1`) on a grid. You have an `n x n` grid where users can place vertical stacks of cubes at different positions.

The grid is represented as a 2D array where `grid[i][j]` tells you the height of the cube tower at position `(i, j)`. A value of 0 means no cubes at that position, while a value of 3 means three cubes stacked vertically.

When cubes touch each other, they're automatically fused together to form a connected 3D shape. Cubes within the same tower share top/bottom faces, and adjacent towers share side faces where they touch.

Your task is to calculate the total surface area of the resulting 3D structure. This includes all exposed faces: the sides, the top surfaces of all towers, and importantly, the bottom face of each tower where it touches the ground (these bottom faces count as part of the surface area).

**Diagram:**

Example 1: Single cube stack (grid = [[1]])
```
Side view:        Top view:
   ┌─┐              ┌─┐
   │ │              │1│
   └─┘              └─┘
Surface area = 6 (all 6 faces exposed)
```

Example 2: Two cubes in a row (grid = [[1,2]])
```
Side view:        Top view:
   ┌─┐              ┌─┬─┐
   │ │┌─┐           │1│2│
   └─┘└─┘           └─┴─┘
    1  2
Surface area = 16
- Tower 1: 5 exposed faces (1 face shared with tower 2)
- Tower 2: 11 exposed faces (1 face shared with tower 1)
```

Example 3: 2x2 grid with varying heights (grid = [[1,1],[1,1]])
```
Top view:         3D view (each cell has 1 cube):
┌─┬─┐               ┌─┬─┐
│1│1│               │ │ │
├─┼─┤               ├─┼─┤
│1│1│               │ │ │
└─┴─┘               └─┴─┘

Surface area = 16
- Top and bottom: 4 + 4 = 8
- All four towers share sides with neighbors
- Outer perimeter contributes remaining faces
```


## Why This Matters

This problem simulates real-world 3D modeling and geometric computation challenges. Understanding surface area calculation appears in computer graphics (rendering optimization), 3D printing (material estimation), architectural design (exterior surface calculations for painting or cladding), and game development (collision detection and rendering). The technique of counting visible faces while subtracting shared/hidden faces is fundamental to computational geometry. You'll develop skills in spatial reasoning, boundary detection, and working with grid-based 3D representations. Similar concepts apply to voxel-based terrain generation in games, medical imaging analysis of 3D scans, and volume rendering systems. The problem also teaches you to handle neighbor relationships in grids and efficiently count geometric properties without explicitly building complex 3D data structures.

## Constraints

- n == grid.length == grid[i].length
- 1 <= n <= 50
- 0 <= grid[i][j] <= 50

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Each cube has 6 faces. Start with total = sum(grid[i][j]) * 6 * n * n. Then subtract hidden faces: for each stack, subtract 2*(height-1) for internal cube connections (top/bottom). For adjacent stacks, subtract 2*min(height1, height2) faces where they touch. Also handle the special case where height is 0 (no cubes).
</details>

<details>
<summary>🎯 Main Approach</summary>
Iterate through each cell (i, j). For each tower with height h: add 2 (top and bottom faces) if h > 0. Add 4*h (four sides) initially. Then subtract overlaps: for vertical stacks, subtract 2*(h-1). For each neighbor (up, down, left, right), subtract 2*min(h, neighbor_height) to account for shared faces. Sum all visible faces.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Simpler formula: surface_area = 0. For each cell with height h > 0: add 2 (top/bottom). Add 4*h (perimeter). Subtract 2*(h-1) (internal connections). For each of 4 neighbors, subtract min(h, neighbor_h). This avoids double-counting shared faces by only counting from one direction. Time: O(n²), Space: O(1).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Count All Then Subtract | O(n²) | O(1) | Start with 6 faces per cube, subtract hidden |
| Optimal (Direct Count) | O(n²) | O(1) | Calculate visible faces directly |

## Common Mistakes

1. **Double-counting shared faces**
   ```python
   # Wrong: Counting each shared face from both cells
   for i in range(n):
       for j in range(n):
           for di, dj in [(0,1), (1,0), (0,-1), (-1,0)]:
               ni, nj = i+di, j+dj
               if 0 <= ni < n and 0 <= nj < n:
                   area -= 2 * min(grid[i][j], grid[ni][nj])

   # Correct: Only subtract once per shared edge
   for i in range(n):
       for j in range(n):
           if j < n-1:  # Only check right neighbor
               area -= 2 * min(grid[i][j], grid[i][j+1])
           if i < n-1:  # Only check bottom neighbor
               area -= 2 * min(grid[i][j], grid[i+1][j])
   ```

2. **Forgetting top and bottom faces**
   ```python
   # Wrong: Only counting side faces
   if grid[i][j] > 0:
       area += 4 * grid[i][j]

   # Correct: Add top and bottom for non-zero towers
   if grid[i][j] > 0:
       area += 2  # top and bottom
       area += 4 * grid[i][j]  # four sides
   ```

3. **Not handling internal cube connections**
   ```python
   # Wrong: Forgetting cubes in same tower share faces
   area = grid[i][j] * 6

   # Correct: Subtract internal connections in same tower
   if grid[i][j] > 0:
       area += 2  # top and bottom of tower
       area += 4 * grid[i][j]  # perimeter
       area -= 2 * (grid[i][j] - 1)  # internal connections
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Projection Area of 3D Shapes | Easy | Calculate projected area instead of surface area |
| Volume of 3D Shapes | Easy | Calculate volume instead of surface area |
| Island Perimeter | Easy | 2D version counting perimeter of islands |
| Pour Water | Medium | Simulation of water flow on 3D terrain |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Matrix Patterns](../../strategies/patterns/matrix-patterns.md)
