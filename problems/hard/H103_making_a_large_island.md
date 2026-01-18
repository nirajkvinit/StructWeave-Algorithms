---
id: H103
old_id: A294
slug: making-a-large-island
title: Making A Large Island
difficulty: hard
category: hard
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 45
---
# Making A Large Island

## Problem

Given an `n x n` binary matrix `grid` containing only `0`s and `1`s, you may flip at most one cell containing `0` to become `1`.

Determine the maximum possible size of an island after performing this optional flip operation.

An island is defined as a group of `1`s connected through their four adjacent neighbors (up, down, left, right).

## Why This Matters

2D arrays model grids, images, and spatial data. This problem develops your ability to navigate multi-dimensional structures.

## Examples

**Example 1:**
- Input: `grid = [[1,0],[0,1]]`
- Output: `3`
- Explanation: Change one 0 to 1 and connect two 1s, then we get an island with area = 3.

**Example 2:**
- Input: `grid = [[1,1],[1,0]]`
- Output: `4`
- Explanation: Change the 0 to 1 and make the island bigger, only one island with area = 4.

**Example 3:**
- Input: `grid = [[1,1],[1,1]]`
- Output: `4`
- Explanation: Can't change any 0 to 1, only one island with area = 4.

## Constraints

- n == grid.length
- n == grid[i].length
- 1 <= n <= 500
- grid[i][j] is either 0 or 1.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

First, identify and label all existing islands with unique IDs, storing each island's size. Then for each 0 cell, check its four neighbors - if they belong to different islands, flipping this 0 would connect those islands. Sum the sizes of unique neighboring islands plus 1 for the flipped cell to get the potential island size.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use DFS/BFS to identify all islands, assigning each a unique ID (starting from 2 to distinguish from 0 and 1). Store island sizes in a map. Then iterate through all 0 cells, collecting unique island IDs from the four neighboring cells. For each 0, calculate potential island size as 1 + sum of unique neighbor island sizes. Track the maximum across all 0 cells. Handle the edge case where there are no 0 cells (return total grid size).

</details>

<details>
<summary>⚡ Optimization Tip</summary>

When checking neighbors of a 0 cell, use a set to track unique island IDs to avoid counting the same island multiple times. Also handle the all-1s grid edge case early by checking if any 0 exists before iterating. This avoids unnecessary computation and incorrect results.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n^4) | O(n^2) | Try flipping each 0, run DFS each time |
| Optimal with Island Labeling | O(n^2) | O(n^2) | Two passes: label islands, check each 0 |

## Common Mistakes

1. **Counting the same island multiple times**
   ```python
   # Wrong: Summing neighbor sizes without deduplication
   for dr, dc in [(0,1), (0,-1), (1,0), (-1,0)]:
       nr, nc = r + dr, c + dc
       if grid[nr][nc] > 0:
           size += island_size[grid[nr][nc]]  # May count same island twice

   # Correct: Use set to track unique islands
   neighbor_islands = set()
   for dr, dc in [(0,1), (0,-1), (1,0), (-1,0)]:
       nr, nc = r + dr, c + dc
       if grid[nr][nc] > 0:
           neighbor_islands.add(grid[nr][nc])
   size = 1 + sum(island_size[iid] for iid in neighbor_islands)
   ```

2. **Not handling the all-1s grid case**
   ```python
   # Wrong: Assumes there's always a 0 to flip
   max_size = 0
   for r in range(n):
       for c in range(n):
           if grid[r][c] == 0:
               max_size = max(max_size, calculate_size(r, c))
   return max_size  # Returns 0 if no 0s exist!

   # Correct: Handle all-1s case
   max_size = max(island_size.values()) if island_size else 0
   for r in range(n):
       for c in range(n):
           if grid[r][c] == 0:
               max_size = max(max_size, calculate_size(r, c))
   return max_size if max_size > 0 else n * n
   ```

3. **Modifying original grid without preserving structure**
   ```python
   # Wrong: Overwriting 1s with island IDs without tracking sizes
   def dfs(r, c, island_id):
       grid[r][c] = island_id  # Lost the size information
       for nr, nc in neighbors:
           dfs(nr, nc, island_id)

   # Correct: Track island size during labeling
   def dfs(r, c, island_id):
       grid[r][c] = island_id
       size = 1
       for nr, nc in neighbors:
           if grid[nr][nc] == 1:
               size += dfs(nr, nc, island_id)
       return size
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Making a Large Island II | Hard | Can flip k cells instead of just 1 |
| Maximum Island Perimeter | Medium | Maximize perimeter instead of area |
| Connect All Islands | Hard | Minimum flips to connect all islands |
| Island with Obstacles | Medium | Some cells cannot be flipped |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (all 1s, all 0s, single cell)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [DFS/BFS Pattern](../../strategies/patterns/depth-first-search.md)
