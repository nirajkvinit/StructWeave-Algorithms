---
id: E246
old_id: A350
slug: projection-area-of-3d-shapes
title: Projection Area of 3D Shapes
difficulty: easy
category: easy
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - E001_two_sum.md
  - E249_monotonic_array.md
prerequisites:
  - "2D array traversal"
  - "Basic geometry concepts"
  - "Max value finding"
strategy_ref: ../strategies/data-structures/arrays.md
---
# Projection Area of 3D Shapes

## Problem

Imagine an `n x n` grid where you can stack unit cubes (each measuring `1 x 1 x 1`) vertically at each grid position. The value `grid[i][j]` tells you how many cubes are stacked at position `(i, j)`. For example, if `grid[2][3] = 5`, there are 5 cubes stacked on top of each other at that location, forming a tower of height 5.

Your task is to calculate the total surface area of three orthogonal projections (shadows) of this 3D structure. Think of projections as the silhouettes you would see when shining a light from three perpendicular directions:

1. **Top projection (xy-plane)**: Looking down from above. This shows which grid positions have at least one cube (regardless of height). A position with 1 cube and a position with 10 cubes both contribute equally to this view - they both appear as a single filled square.

2. **Front projection (xz-plane)**: Looking from the front. For each row, you see the height of the tallest stack in that row. The projection area is the sum of these maximum heights across all rows.

3. **Side projection (yz-plane)**: Looking from the side. For each column, you see the height of the tallest stack in that column. The projection area is the sum of these maximum heights across all columns.

The challenge lies in correctly understanding what each projection represents. The top view counts occupied positions, while front and side views sum maximum heights. Also, remember that empty positions (`grid[i][j] = 0`) contribute nothing to any projection.

**Diagram:**

```
3D View (grid = [[1,2],[3,4]]):

     ┌─┐
     │4│
   ┌─┼─┤
   │3│4│
 ┌─┼─┼─┤
 │1│2│4│
 └─┴─┴─┘

Top view (xy-plane):     Front view (xz-plane):   Side view (yz-plane):
  ┌─┬─┐                      ┌─┬─┐                    ┌─┬─┐
  │1│2│                      │3│4│                    │2│4│
  ├─┼─┤                      └─┴─┘                    └─┴─┘
  │3│4│
  └─┴─┘

Area calculations:
- Top (xy): 4 cells (count non-zero)
- Front (xz): 3+4 = 7 (max height per row)
- Side (yz): 2+4 = 6 (max height per column)
Total area = 4 + 7 + 6 = 17
```


## Why This Matters

Understanding 2D array traversal and geometric projections is fundamental for computer graphics, image processing, and spatial data analysis. This problem teaches you to think about multi-dimensional data from different perspectives, a skill essential for 3D rendering engines (where objects must be projected onto a 2D screen), medical imaging (CT scans and MRIs create 2D slices of 3D anatomy), computer vision (cameras capture 2D projections of 3D scenes), geographic information systems (topographic maps show height data on a grid), and game development (height maps define terrain). The pattern of finding row and column maximums appears frequently in matrix algorithms, and learning to optimize by combining calculations in a single pass is a valuable technique. This problem also reinforces the important concept that different views of the same data can reveal different information.

## Examples

**Example 1:**
- Input: `grid = [[2]]`
- Output: `5`

**Example 2:**
- Input: `grid = [[1,0],[0,2]]`
- Output: `8`

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

### Tier 1 Hint - Problem Understanding
Think about what each projection represents:
- The top view (xy-plane) shows which cells have cubes (regardless of height)
- The front view (xz-plane) shows the maximum height visible from the front for each row
- The side view (yz-plane) shows the maximum height visible from the side for each column

How would you calculate each projection's area separately?

### Tier 2 Hint - Solution Strategy
For each projection:
1. Top view: Count cells where `grid[i][j] > 0`
2. Front view: For each row, find the maximum value
3. Side view: For each column, find the maximum value

Can you combine these three calculations in a single pass through the grid?

### Tier 3 Hint - Implementation Details
Use three accumulators:
- `top`: Count non-zero cells
- `front`: Sum of row maximums
- `side`: Sum of column maximums

For efficiency, compute row maximums during normal iteration and column maximums by tracking per-column max values as you go.

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Three-pass solution | O(n²) | O(1) | Separate iteration for each projection |
| Single-pass solution | O(n²) | O(n) | Track column maxes while iterating rows |
| Optimized single-pass | O(n²) | O(1) | Clever index management eliminates extra space |

## Common Mistakes

### Mistake 1: Forgetting to count zero cells in top projection
```python
# Wrong: Counts all cells
top_area = n * n

# Correct: Only count non-zero cells
top_area = sum(1 for i in range(n) for j in range(n) if grid[i][j] > 0)
```
**Why it's wrong**: Zero-height positions don't have cubes, so they shouldn't appear in the top projection.

### Mistake 2: Summing all values instead of max per row/column
```python
# Wrong: Sums all values in row
front_area += sum(grid[i])

# Correct: Takes maximum value in row
front_area += max(grid[i])
```
**Why it's wrong**: The projection shows the tallest stack in each row/column, not the sum of all heights.

### Mistake 3: Confusing row and column iterations
```python
# Wrong: Mixing up dimensions
for i in range(n):
    side_area += max(grid[i])  # This is front, not side

# Correct: Column-wise maximum for side view
for j in range(n):
    side_area += max(grid[i][j] for i in range(n))
```
**Why it's wrong**: Side projection requires column maximums, not row maximums.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Different shaped grids | Easy | Handle rectangular (non-square) grids |
| Custom projection angles | Medium | Calculate projections at arbitrary angles |
| Minimum material removal | Medium | Find minimum cubes to remove to achieve target projection |
| 3D object reconstruction | Hard | Reconstruct possible 3D shapes from given projections |
| Volume calculation | Easy | Calculate total volume of all cubes |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Reviewed solution and understood all approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 3 days
- [ ] Practiced again after 1 week
- [ ] Can explain the solution clearly to others
- [ ] Solved all variations above

**Strategy**: See [Array Fundamentals](../strategies/data-structures/arrays.md)
