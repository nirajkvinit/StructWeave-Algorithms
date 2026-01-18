---
id: M519
old_id: A401
slug: shortest-bridge
title: Shortest Bridge
difficulty: medium
category: medium
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Shortest Bridge

## Problem

Imagine you're a civil engineer planning to build a bridge between two islands. You have a map showing landmasses in a grid format, and you need to determine the shortest possible bridge to connect the two islands. Building over water costs resources, so minimizing the bridge length is crucial.

Given a square binary matrix `grid` of size `n x n`, where:
- `1` represents land
- `0` represents water

An island is a group of `1`s (land cells) connected horizontally or vertically (in the four cardinal directions: up, down, left, right). The matrix is guaranteed to contain exactly two distinct islands.

Your task: determine the minimum number of water cells (`0`s) that must be converted to land (`1`s) to create a continuous bridge connecting both islands into a single landmass.

Think of it as finding the shortest water path between the two islands—that's where you'd build your bridge.

Visualization:
```
Grid:              Islands marked:     Bridge (answer = 1):
[[0,1],            [[0,A],             [[0,1],
 [1,0]]             [B,0]]              [1,1]]

Two islands (A and B) are separated by water.
Flipping one water cell creates connection.
```

## Why This Matters

This problem combines graph traversal techniques (DFS and BFS) to solve a practical pathfinding challenge. Similar algorithms are used in network routing to find optimal paths between network segments, in urban planning for infrastructure design (roads, utilities), and in robotics for navigation planning. Game development uses these techniques for AI pathfinding between safe zones. Geographic Information Systems (GIS) apply similar logic for analyzing terrain connectivity. The two-phase approach—first identifying one island completely (DFS), then expanding outward layer by layer (multi-source BFS)—teaches you to combine different graph algorithms strategically. This pattern appears frequently in real systems: virus spread modeling, flood-fill algorithms in image editing, and network vulnerability analysis all use variations of this technique.

## Examples

**Example 1:**
- Input: `grid = [[0,1],[1,0]]`
- Output: `1`

**Example 2:**
- Input: `grid = [[0,1,0],[0,0,0],[0,0,1]]`
- Output: `2`

**Example 3:**
- Input: `grid = [[1,1,1,1,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,0,1],[1,1,1,1,1]]`
- Output: `1`

## Constraints

- n == grid.length == grid[i].length
- 2 <= n <= 100
- grid[i][j] is either 0 or 1.
- There are exactly two islands in grid.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
The problem has two distinct phases: (1) identify one complete island, and (2) expand from that island until reaching the other. This is a combination of DFS/BFS techniques applied sequentially.
</details>

<details>
<summary>Main Approach</summary>
Two-phase algorithm:
1. Use DFS to find and mark all cells of the first island, adding them to a queue
2. Use BFS (multi-source) from all cells of the first island simultaneously, expanding layer by layer through water until hitting land (the second island)
3. The BFS level/distance when you first hit the second island is the answer
</details>

<details>
<summary>Optimization Tip</summary>
Mark visited cells during BFS to avoid revisiting. Use the grid itself for marking (change 1s to 2s for first island, or use a visited set). The multi-source BFS ensures you find the shortest bridge from any point on island 1 to island 2.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n⁴) | O(n²) | Try all pairs of cells from both islands |
| Optimal (DFS + BFS) | O(n²) | O(n²) | Visit each cell at most twice |

## Common Mistakes

1. **Using single-source BFS instead of multi-source**
   ```python
   # Wrong: Start BFS from single cell of first island
   queue = deque([(first_cell_x, first_cell_y, 0)])
   # This may not give shortest bridge

   # Correct: Start BFS from ALL cells of first island
   queue = deque()
   for cell in first_island:
       queue.append((cell[0], cell[1], 0))
   ```

2. **Not properly distinguishing between islands**
   ```python
   # Wrong: Can't tell which island is which
   if grid[nx][ny] == 1:
       return distance

   # Correct: Mark first island differently (e.g., as 2)
   # During DFS: grid[x][y] = 2
   # During BFS: if grid[nx][ny] == 1, found second island
   ```

3. **Off-by-one error in distance counting**
   ```python
   # Wrong: Count island cells as part of bridge
   return distance

   # Correct: Don't count starting island, only water cells
   if grid[nx][ny] == 1:
       return distance  # distance is water cells only
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Number of Islands | Medium | Count islands instead of connecting them |
| Max Area of Island | Medium | Find largest island area |
| Making A Large Island | Hard | Can flip one 0 to maximize island size |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [BFS Pattern](../../strategies/patterns/bfs.md)
