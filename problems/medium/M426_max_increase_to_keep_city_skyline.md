---
id: M426
old_id: A274
slug: max-increase-to-keep-city-skyline
title: Max Increase to Keep City Skyline
difficulty: medium
category: medium
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Max Increase to Keep City Skyline

## Problem

Imagine a city where buildings are arranged in an `n x n` grid. You're given a 2D integer matrix `grid` where `grid[r][c]` represents the height of the building at position (r, c) when viewing the city from above.

The **skyline** of a city is what you see when looking at it from a particular direction. When viewing from the east or west, the skyline for each row is determined by the tallest building in that row. When viewing from the north or south, the skyline for each column is determined by the tallest building in that column. These skylines are iconic features that define the city's profile from each cardinal direction.

You have permission to increase the height of any building by any amount (even buildings that currently don't exist, represented by height 0). However, there's a critical constraint: after all your modifications, the skyline as seen from each of the four cardinal directions (north, south, east, west) must remain exactly the same as the original.

For any building at position (r, c), its maximum possible height is limited by two factors: it can't exceed the maximum height in its row (which determines the east/west skyline), and it can't exceed the maximum height in its column (which determines the north/south skyline). The actual maximum is the minimum of these two constraints.

Calculate the maximum total increase in building heights across the entire grid while preserving all four directional skylines.


**Diagram:**

```
Example: City Grid (viewed from above)

Initial grid:
    Col0 Col1 Col2 Col3
Row0  3    0    8    4
Row1  2    4    5    7
Row2  9    2    6    3
Row3  0    3    1    0

Skyline constraints:
- East/West (row maxes):  [8, 7, 9, 3]
- North/South (col maxes): [9, 4, 8, 7]

For each building at (r,c):
- Max height = min(rowMax[r], colMax[c])

After maximizing heights:
    Col0 Col1 Col2 Col3
Row0  8    4    8    7     (limited by row max = 8)
Row1  7    4    7    7     (limited by row max = 7)
Row2  9    4    8    7     (limited by row max = 9)
Row3  3    3    3    3     (limited by row max = 3)

Total increase = sum of (new - old) for all buildings
```


## Why This Matters

This problem demonstrates the principle of constraint satisfaction through precomputation. The technique of computing row and column maximums is fundamental to many matrix optimization problems and appears in image processing (finding peaks), data analysis (finding top performers in multiple dimensions), and game development (visibility and line-of-sight calculations). The pattern of determining maximum values based on multiple independent constraints is also valuable in resource allocation problems, scheduling, and operations research. Understanding how to efficiently precompute and combine constraints saves computational resources in real-world applications.

## Examples

**Example 1:**
- Input: `grid = [[0,0,0],[0,0,0],[0,0,0]]`
- Output: `0`
- Explanation: Any height increase would alter at least one directional skyline.

## Constraints

- n == grid.length
- n == grid[r].length
- 2 <= n <= 50
- 0 <= grid[r][c] <= 100

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
The maximum height of building at position (r, c) is limited by both the row's maximum and the column's maximum. Specifically, it can't exceed min(max_row[r], max_col[c]), because exceeding either would change the skyline from that direction. The increase for each building is the difference between this maximum allowed height and its current height.
</details>

<details>
<summary>Main Approach</summary>
First, compute two arrays: max_row[i] = maximum height in row i, and max_col[j] = maximum height in column j. Then, for each building at (r, c), calculate the maximum allowed height as min(max_row[r], max_col[c]). The increase for this building is max(0, max_allowed - grid[r][c]). Sum all increases to get the total.
</details>

<details>
<summary>Optimization Tip</summary>
You can compute max_row and max_col in a single pass through the grid. For max_row, take the max of each row during the first iteration. For max_col, track column maxes as you go through rows. Alternatively, use numpy-style operations if available: max_row = grid.max(axis=1) and max_col = grid.max(axis=0).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n³) | O(1) | Recalculate row/col max for each building |
| Optimal | O(n²) | O(n) | Precompute row and column maxes once |

## Common Mistakes

1. **Not taking minimum of row and column max**
   ```python
   # Wrong: Using row max only or col max only
   max_height = max_row[r]  # Ignores column constraint

   # Correct: Must satisfy both constraints
   max_height = min(max_row[r], max_col[c])
   ```

2. **Allowing negative increases**
   ```python
   # Wrong: Not handling cases where building is already at max
   increase = max_allowed - grid[r][c]
   total += increase

   # Correct: Use max to avoid negative increases (though shouldn't happen)
   increase = max(0, max_allowed - grid[r][c])
   total += increase
   ```

3. **Modifying the original grid**
   ```python
   # Wrong: Changing grid values during calculation
   grid[r][c] = min(max_row[r], max_col[c])

   # Correct: Only calculate the increase, don't modify
   max_allowed = min(max_row[r], max_col[c])
   total += max_allowed - grid[r][c]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Pour Water | Medium | Simulate water flow based on terrain heights |
| Trapping Rain Water 2D | Hard | Calculate water trapped between buildings |
| Maximal Rectangle | Hard | Find largest rectangle of 1s in binary matrix |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Array Processing](../../strategies/data-structures/arrays.md)
