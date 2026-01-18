---
id: M568
old_id: A461
slug: rotting-oranges
title: Rotting Oranges
difficulty: medium
category: medium
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Rotting Oranges

## Problem

Imagine you have a crate of oranges arranged in a grid. Some oranges are already rotten, and every minute, the rot spreads to any fresh orange directly adjacent (up, down, left, or right) to a rotten one. You need to figure out how long it takes for all oranges to rot, or determine if some oranges will stay fresh forever.

You're given an `m x n` grid where each cell contains one of three values:
- `0` represents an empty cell (no orange)
- `1` represents a fresh orange
- `2` represents a rotten orange

The rot spreads simultaneously from all rotten oranges each minute. Every minute, any fresh orange that is adjacent (in the 4 cardinal directions: up, down, left, right) to a rotten orange becomes rotten.

Calculate the minimum number of minutes that must pass until no cell has a fresh orange. If it's impossible for all oranges to rot (some fresh oranges are isolated from all rotten ones), return `-1`.


**Diagram:**

```
Example: grid = [[2,1,1],[1,1,0],[0,1,1]]

Minute 0:       Minute 1:       Minute 2:       Minute 3:       Minute 4:
[2, 1, 1]       [2, 2, 1]       [2, 2, 2]       [2, 2, 2]       [2, 2, 2]
[1, 1, 0]  →    [2, 1, 0]  →    [2, 2, 0]  →    [2, 2, 0]  →    [2, 2, 0]
[0, 1, 1]       [0, 1, 1]       [0, 2, 1]       [0, 2, 2]       [0, 2, 2]

Output: 4 minutes (all fresh oranges become rotten)

Legend: 0=empty, 1=fresh, 2=rotten
Rot spreads to adjacent cells (up/down/left/right) each minute
```


## Why This Matters

This spread simulation problem models real-world phenomena across many domains. It's the exact algorithm used in epidemiology to model disease spread through populations, in network security to track malware propagation, in wildfire management systems to predict fire spread patterns, and in image processing for flood-fill operations. The multi-source BFS technique you'll learn here is fundamental to understanding how simultaneous events propagate through a grid, which applies to game development (area-of-effect mechanics), urban planning (pollution dispersion modeling), and computer graphics (texture blending and region growing). This pattern appears whenever you need to simulate something spreading from multiple origins at the same rate.

## Examples

**Example 1:**
- Input: `grid = [[2,1,1],[0,1,1],[1,0,1]]`
- Output: `-1`
- Explanation: The orange in the bottom left corner (row 2, column 0) is never rotten, because rotting only happens 4-directionally.

**Example 2:**
- Input: `grid = [[0,2]]`
- Output: `0`
- Explanation: Since there are already no fresh oranges at minute 0, the answer is just 0.

## Constraints

- m == grid.length
- n == grid[i].length
- 1 <= m, n <= 10
- grid[i][j] is 0, 1, or 2.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a multi-source BFS problem. All initially rotten oranges spread rot simultaneously, not one at a time. Think of it as a wave of rot expanding from multiple starting points each minute.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use BFS with a queue. First, add all initially rotten oranges to the queue and count fresh oranges. Process the queue level by level (each level = 1 minute). For each rotten orange, rot its 4 adjacent fresh oranges and add them to the queue. Track the number of minutes and fresh oranges remaining.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a delimiter (like None) or track queue size per level to know when a minute has passed. Count fresh oranges at the start - if any remain after BFS completes, return -1. This avoids re-scanning the entire grid.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS Multi-Source | O(M * N) | O(M * N) | Visit each cell at most once |
| Optimal | O(M * N) | O(M * N) | Queue can hold all cells in worst case |

## Common Mistakes

1. **Processing Rotten Oranges Sequentially**
   ```python
   # Wrong: Processing one rotten orange completely before others
   for rotten in initial_rotten:
       queue = [rotten]
       while queue:
           # This processes each rotten orange separately

   # Correct: Process all rotten oranges simultaneously
   queue = collections.deque(initial_rotten)  # All rotten start together
   while queue:
       for _ in range(len(queue)):  # Process current level
           # Spread rot to adjacent cells
   ```

2. **Not Tracking Minutes Correctly**
   ```python
   # Wrong: Incrementing for each cell
   while queue:
       row, col = queue.popleft()
       minutes += 1  # Wrong - increments per cell!

   # Correct: Increment per level (minute)
   minutes = 0
   while queue:
       for _ in range(len(queue)):  # Process entire level
           row, col = queue.popleft()
           # Process cell
       minutes += 1
   return minutes - 1  # Subtract final empty iteration
   ```

3. **Not Checking for Unreachable Fresh Oranges**
   ```python
   # Wrong: Not verifying all fresh oranges were reached
   while queue:
       # Process BFS
   return minutes

   # Correct: Check if fresh oranges remain
   fresh_count = sum(row.count(1) for row in grid)
   # ... BFS processing, decrement fresh_count when rotting
   if fresh_count > 0:
       return -1
   return minutes
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Walls and Gates | Medium | Fill distances to nearest gate instead of spreading rot |
| 01 Matrix | Medium | Find distance to nearest 0 for each cell |
| Shortest Path in Binary Matrix | Medium | Find shortest path from corner to corner |
| Surrounded Regions | Medium | Capture regions instead of spreading values |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [BFS/Multi-Source BFS](../../strategies/patterns/bfs.md)
