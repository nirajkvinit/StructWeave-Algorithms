---
id: M186
old_id: I226
slug: construct-quad-tree
title: Construct Quad Tree
difficulty: medium
category: medium
topics: ["tree", "matrix", "bfs", "divide-and-conquer"]
patterns: ["level-order", "dp-2d", "divide-and-conquer"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M427", "M558", "E104"]
prerequisites: ["recursion", "divide-and-conquer", "tree-construction"]
strategy_ref: ../strategies/data-structures/trees.md
---
# Construct Quad Tree

## Problem

You're given a square matrix `grid` of dimensions `n × n` containing only binary values (0 or 1), and your task is to construct a Quad-Tree representation that compresses this matrix. A Quad-Tree is a hierarchical data structure used for spatial partitioning where each internal node has exactly four children, representing the four quadrants of a 2D region. Think of it like recursively dividing an image into quarters until you find uniform regions. Each node has two properties: `val` (a boolean indicating if the region is all 1s or all 0s) and `isLeaf` (true if this region is uniform and doesn't need further subdivision). For example, if your entire grid is filled with 1s, the quad-tree is just a single leaf node with `val=True` and `isLeaf=True`. The interesting cases arise when you have mixed values. The construction algorithm follows divide-and-conquer: examine the current region, and if all cells have the same value, create a leaf node and stop. Otherwise, create an internal node with four children by splitting the region into top-left, top-right, bottom-left, and bottom-right quadrants, each exactly half the size. Recursively construct quad-trees for each quadrant. The matrix dimensions are guaranteed to be a power of 2 (like 4, 8, 16, 32, 64), ensuring you can always divide evenly. Edge cases include a completely uniform grid (one leaf node), a checkerboard pattern (maximum subdivision down to individual cells), and grids where some quadrants are uniform while others require further subdivision. The efficiency comes from checking if a region is uniform before subdividing, potentially saving massive amounts of recursion.

## Why This Matters

Quad-trees are fundamental to image compression, geospatial indexing, collision detection in games, and hierarchical spatial data storage. In image processing, quad-tree compression reduces storage for images with large uniform regions (like satellite imagery, floor plans, or simple graphics) by representing entire areas with a single node instead of thousands of pixels. Geographic Information Systems (GIS) use quad-trees to index spatial data like maps, enabling fast location queries by partitioning the earth's surface hierarchically. Video game engines employ quad-trees and their 3D cousin (octrees) for efficient collision detection, view frustum culling, and level-of-detail rendering, subdividing the game world so only nearby objects are checked for interactions. Database systems use similar spatial indexing for range queries (finding all points within a boundary). The divide-and-conquer recursion pattern you'll master here extends beyond quad-trees to parallel processing (dividing computational work across cores), computational geometry (closest pair problems, range searching), and even machine learning (decision tree construction). Understanding how to identify uniform regions and exploit spatial locality strengthens your ability to design efficient hierarchical algorithms, a skill valued in graphics programming, scientific computing, and any domain dealing with multi-dimensional data. This problem appears frequently in technical interviews for companies building mapping services, game engines, or image processing tools.

**Diagram:**

```
Input Grid:
1 1 1 1 0 0 0 0
1 1 1 1 0 0 0 0
1 1 1 1 1 1 1 1
1 1 1 1 1 1 1 1
1 1 1 1 0 0 0 0
1 1 1 1 0 0 0 0
1 1 1 1 0 0 0 0
1 1 1 1 0 0 0 0

Quad-Tree Structure:
        Root
       /  |  \  \
      TL  TR  BL BR
     (subdivide further if mixed values)

TL = Top-Left quadrant
TR = Top-Right quadrant (leaf: all 0s)
BL = Bottom-Left quadrant (subdivide)
BR = Bottom-Right quadrant (leaf: all 0s)
```

For additional information about Quad-Trees, consult the <a href="https://en.wikipedia.org/wiki/Quadtree">wiki.

**Quad-Tree format:**

This section describes the output serialization format and is not required for solving the problem. The output uses a level order traversal serialization of the Quad-Tree, where `null` indicates the end of a branch path.

The serialization follows the same approach as binary tree serialization, except each node is encoded as a two-element list `[isLeaf, val]`.

Boolean True values are encoded as **1** and False values are encoded as **0** in the `[isLeaf, val]` representation.

## Why This Matters

Tree problems develop recursive thinking and hierarchical data navigation. Mastering tree traversals unlocks graph algorithms.

## Constraints

- n == grid.length == grid[i].length
- n == 2x where 0 <= x <= 6

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Use divide and conquer recursively</summary>

The key is to divide the grid into four equal quadrants and recursively build quad-trees for each quadrant. If all values in a region are the same, create a leaf node. Otherwise, create an internal node with four children representing the four quadrants.
</details>

<details>
<summary>🎯 Hint 2: Check if region is uniform before subdividing</summary>

Before subdividing a region, check if all cells have the same value. You can do this by iterating through the region or by building the four sub-trees first and checking if all four are leaves with the same value (they can be merged).
</details>

<details>
<summary>📝 Hint 3: Recursive construction algorithm</summary>

```
def construct(grid, row, col, size):
    # Base case: check if all cells are same
    if all_same(grid, row, col, size):
        return Node(val=grid[row][col], isLeaf=True)

    # Recursive case: divide into 4 quadrants
    half = size // 2
    topLeft = construct(grid, row, col, half)
    topRight = construct(grid, row, col + half, half)
    bottomLeft = construct(grid, row + half, col, half)
    bottomRight = construct(grid, row + half, col + half, half)

    return Node(
        val=True,  # Can be any value for internal node
        isLeaf=False,
        topLeft=topLeft,
        topRight=topRight,
        bottomLeft=bottomLeft,
        bottomRight=bottomRight
    )

Time: O(n² log n), Space: O(log n) for recursion
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Divide and Conquer | O(n² log n) | O(log n) | Recursion depth log(n), checking each cell |
| Optimized (merge leaves) | O(n²) | O(log n) | Build then merge identical leaf children |
| Prefix Sum Optimization | O(n²) | O(n²) | Precompute sums for O(1) uniformity check |

## Common Mistakes

### Mistake 1: Not properly checking if region is uniform

```python
# Wrong: Only checking corners or edges
def is_same_wrong(grid, row, col, size):
    val = grid[row][col]
    return (grid[row][col] == grid[row+size-1][col] ==
            grid[row][col+size-1] == grid[row+size-1][col+size-1])
```

```python
# Correct: Check all cells in the region
def is_same_correct(grid, row, col, size):
    val = grid[row][col]
    for i in range(row, row + size):
        for j in range(col, col + size):
            if grid[i][j] != val:
                return False
    return True
```

### Mistake 2: Incorrect quadrant boundaries

```python
# Wrong: Off-by-one errors in quadrant calculation
def construct_wrong(grid, row, col, size):
    half = size // 2
    # Wrong: overlapping or gaps in quadrants
    topLeft = construct(grid, row, col, half + 1)
    topRight = construct(grid, row, col + half - 1, half)
```

```python
# Correct: Proper quadrant division
def construct_correct(grid, row, col, size):
    # Check if uniform
    if is_same(grid, row, col, size):
        return Node(grid[row][col] == 1, True)

    half = size // 2
    node = Node(True, False)
    node.topLeft = construct(grid, row, col, half)
    node.topRight = construct(grid, row, col + half, half)
    node.bottomLeft = construct(grid, row + half, col, half)
    node.bottomRight = construct(grid, row + half, col + half, half)
    return node
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Quad Tree Intersection | Medium | Compute intersection of two quad-trees - M558 |
| Image Compression | Medium | Use quad-tree for lossy image compression |
| Region Quad Tree | Hard | Support updates and range queries |
| K-d Tree Construction | Hard | Generalize to k-dimensional space partitioning |

## Practice Checklist

- [ ] Day 1: Solve using basic divide and conquer (30-40 min)
- [ ] Day 2: Implement with leaf merging optimization (35 min)
- [ ] Day 7: Re-solve with prefix sum for faster uniformity check (30 min)
- [ ] Day 14: Solve Quad Tree Intersection problem (M558) (40 min)
- [ ] Day 30: Explain when quad-trees are useful in practice (10 min)

**Strategy**: See [Tree Pattern](../strategies/data-structures/trees.md)
