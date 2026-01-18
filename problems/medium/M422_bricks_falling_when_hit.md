---
id: M422
old_id: A270
slug: bricks-falling-when-hit
title: Bricks Falling When Hit
difficulty: medium
category: medium
topics: ["array", "matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Bricks Falling When Hit

## Problem

Imagine a grid representing a brick wall, where `1` represents a brick and `0` represents empty space. The wall is `m` rows tall and `n` columns wide. Bricks remain stable under two conditions: either they're directly connected to the top row of the grid, or they're adjacent (up, down, left, right) to at least one other stable brick.

You're given an array `hits` that specifies a sequence of positions where bricks will be destroyed. Each hit is represented as `hits[i] = (row, col)`. When you remove a brick at a particular position, it may cause other bricks to become unstable and fall. A brick falls when it loses all connections to the top row, either directly or through a chain of stable bricks. Falling bricks are immediately removed from the grid and don't provide support to other bricks.

The key challenge is that removals cascade: removing one brick might disconnect an entire cluster of bricks from the top, causing them all to fall at once. For each hit in the sequence, you need to count how many bricks fall as a result of that specific removal. If a hit targets an already-empty position, zero bricks fall.

Return an array where `result[i]` indicates the number of bricks that fall due to the `i`-th hit. Note that hits are applied in the order given, so later hits see the grid state after earlier hits have been applied.

## Why This Matters

This problem demonstrates the power of reverse thinking in algorithm design. Many cascade or propagation problems become significantly easier when solved backwards. The Union-Find data structure used here is essential for managing dynamic connectivity problems, appearing in network connectivity analysis, image segmentation, and social network friend groups. Understanding when to reverse a problem's direction is a valuable problem-solving technique that applies beyond coding interviews to system design scenarios like analyzing system failures or dependency chains.

## Examples

**Example 1:**
- Input: `grid = [[1,0,0,0],[1,1,1,0]], hits = [[1,0]]`
- Output: `[2]`
- Explanation: Initial configuration:
[[1,0,0,0],
 [1,1,1,0]]
Removing the brick at (1,0) produces:
[[1,0,0,0],
 [0,1,1,0]]
The two remaining bricks in the bottom row lose stability (no connection to the top or stable adjacent bricks) and fall:
[[1,0,0,0],
 [0,0,0,0]]
Therefore, 2 bricks fall.

**Example 2:**
- Input: `grid = [[1,0,0,0],[1,1,0,0]], hits = [[1,1],[1,0]]`
- Output: `[0,0]`
- Explanation: Starting state:
[[1,0,0,0],
 [1,1,0,0]]
First elimination at (1,1):
[[1,0,0,0],
 [1,0,0,0]]
All remaining bricks maintain stability, so no bricks fall.
Second elimination at (1,0):
[[1,0,0,0],
 [0,0,0,0]]
The remaining bricks are still stable, resulting in no falling bricks.
The result is [0,0].

## Constraints

- m == grid.length
- n == grid[i].length
- 1 <= m, n <= 200
- grid[i][j] is 0 or 1.
- 1 <= hits.length <= 4 * 10⁴
- hits[i].length == 2
- 0 <= xi <= m - 1
- 0 <= yi <= n - 1
- All (xi, yi) are unique.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Work backwards! Instead of removing bricks and watching them fall, start with the final state (all hits applied) and add bricks back one by one in reverse order. When you add a brick back, use Union-Find to count how many bricks become connected to the top row through this addition. This reverse approach avoids the complexity of tracking cascading failures.
</details>

<details>
<summary>Main Approach</summary>
First, apply all hits to create the final grid state. Then, use Union-Find to connect all stable bricks (those connected to the top row). Process hits in reverse order: when adding a brick back at position (r, c), count the size of components that weren't previously connected to the top but become connected through this brick. The difference in the size of the top-connected component minus 1 (the brick itself) gives you the number of bricks that fall when this brick is removed.
</details>

<details>
<summary>Optimization Tip</summary>
Use Union-Find with path compression and union by rank for near O(1) operations. Create a virtual "ceiling" node connected to all bricks in the top row to simplify checking if bricks are stable. When adding a brick back, only check its four neighbors and the ceiling (if it's in the top row) to determine connectivity.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Forward Simulation | O(H × M × N) | O(M × N) | H = hits, requires BFS/DFS for each hit |
| Optimal (Reverse Union-Find) | O(H × α(M×N)) | O(M × N) | α is inverse Ackermann (nearly constant) |

## Common Mistakes

1. **Processing hits in forward order**
   ```python
   # Wrong: Forward processing requires complex cascade tracking
   for hit in hits:
       remove_brick(hit)
       # Now need to find all disconnected bricks - expensive!
       count_falling_bricks()

   # Correct: Process in reverse, add bricks back
   apply_all_hits()
   for hit in reversed(hits):
       count = add_brick_back(hit)
       result.append(count)
   result.reverse()
   ```

2. **Not handling hits on empty cells**
   ```python
   # Wrong: Assuming all hits remove bricks
   grid[r][c] = 0
   count_falling()

   # Correct: Check if brick existed before hit
   if original_grid[r][c] == 0:
       result.append(0)
       continue
   ```

3. **Counting the restored brick itself**
   ```python
   # Wrong: Including the brick being added in the fall count
   new_size = union_find.get_size(ceiling)
   result.append(new_size - old_size)

   # Correct: Subtract 1 for the brick itself
   result.append(max(0, new_size - old_size - 1))
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Number of Islands II | Hard | Add islands, count connected components |
| Remove Stones Same Row/Column | Medium | Remove stones while maintaining connectivity |
| Redundant Connection | Medium | Find edge that creates cycle in undirected graph |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Union-Find](../../strategies/data-structures/union-find.md)
