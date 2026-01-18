---
id: H097
old_id: A216
slug: contain-virus
title: Contain Virus
difficulty: hard
category: hard
topics: []
patterns: ["dp-2d"]
estimated_time_minutes: 45
---
# Contain Virus

## Problem

An infection is propagating through a grid, and you must contain it by constructing barriers.

The environment is represented as an `m x n` binary matrix `isInfected`. Cells with value `0` are healthy, while cells with value `1` are infected. Barriers can be placed along the edges between orthogonally adjacent cells (up, down, left, right).

Each night cycle, the infection expands to all adjacent uninfected cells in the four cardinal directions, unless a barrier blocks the spread. Due to limited resources, you can only quarantine one connected infected region per day. You must choose the region that poses the greatest threat, defined as the region that would infect the most healthy cells in the next cycle. The problem guarantees no ties will occur.

Calculate the total number of barriers required to successfully contain all infected regions. If complete containment is impossible, return the number of barriers placed before the grid becomes fully infected.


**Diagram:**

Virus containment simulation (1=infected, 0=healthy, |/- =walls):
```
Day 0 (Initial):
1 1 1 0 0 0 0 0 0
1 0 1 0 1 1 1 1 1
1 1 1 0 0 0 0 0 0

Day 1 (Build walls around right region - 10 walls):
1 1 1 0|0 0 0 0 0|
1 0 1 0|1 1 1 1 1|
1 1 1 0|0 0 0 0 0|
Left region spreads to adjacent cells

Day 2 (Build 3 more walls):
Contain remaining infected cells

Total walls needed: 13
```


## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Examples

**Example 1:**
- Input: `isInfected = [[1,1,1,0,0,0,0,0,0],[1,0,1,0,1,1,1,1,1],[1,1,1,0,0,0,0,0,0]]`
- Output: `13`
- Explanation: The region on the left only builds two new walls.

## Constraints

- m == isInfected.length
- n == isInfected[i].length
- 1 <= m, n <= 50
- isInfected[i][j] is either 0 or 1.
- There is always a contiguous viral region throughout the described process that will **infect strictly more uncontaminated squares** in the next round.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a simulation problem requiring region identification and prioritization. Each day, find all infected regions via DFS/BFS, count threatened cells for each region, quarantine the most dangerous region, then spread remaining regions. Count walls needed around quarantined region's perimeter.
</details>

<details>
<summary>🎯 Main Approach</summary>
Simulate day by day: (1) Use DFS to identify all connected infected regions, (2) For each region, track infected cells, threatened healthy cells, and wall count needed, (3) Select region with most threatened cells and quarantine it (mark as contained), (4) Spread all non-quarantined regions to adjacent healthy cells, (5) Repeat until no active regions remain.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
During DFS for each region, maintain three sets: infected cells, threatened neighbors, and wall positions. Wall count equals the number of edges between infected and healthy cells. After quarantining, mark those cells with a special value (-1) to exclude from future searches. Use visited set to avoid reprocessing cells.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Simulation with DFS | O(m²n² · days) | O(mn) | Worst case all cells get infected |
| Optimized Simulation | O(mn · regions · days) | O(mn) | Typical case with fewer regions |
| Optimal | O(mn · regions · days) | O(mn) | Cannot avoid simulation |

## Common Mistakes

1. **Not counting walls correctly**
   ```python
   # Wrong: Counting cells instead of walls
   walls = len(infected_cells)  # Each cell ≠ one wall

   # Correct: Count edges between infected and healthy
   walls = 0
   for r, c in infected_cells:
       for dr, dc in [(0,1), (1,0), (0,-1), (-1,0)]:
           nr, nc = r + dr, c + dc
           if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 0:
               walls += 1  # Each exposed edge needs a wall
   ```

2. **Spreading quarantined regions**
   ```python
   # Wrong: Continuing to spread quarantined region
   for region in regions:
       for cell in region:
           spread_infection(cell)

   # Correct: Only spread non-quarantined regions
   quarantined_region = find_most_dangerous(regions)
   mark_as_contained(quarantined_region)
   for region in regions:
       if region != quarantined_region:
           spread_infection(region)
   ```

3. **Not using visited set for region identification**
   ```python
   # Wrong: Revisiting cells in DFS
   def find_regions():
       regions = []
       for i in range(m):
           for j in range(n):
               if grid[i][j] == 1:
                   region = dfs(i, j)  # May revisit cells

   # Correct: Track visited cells globally
   def find_regions():
       regions = []
       visited = set()
       for i in range(m):
           for j in range(n):
               if grid[i][j] == 1 and (i,j) not in visited:
                   region = dfs(i, j, visited)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Rotting Oranges | Medium | Simpler: all infected spread simultaneously |
| Walls and Gates | Medium | Distance calculation instead of containment |
| Number of Islands | Easy | Static region identification, no spreading |
| Pacific Atlantic Water Flow | Medium | Flow in opposite direction |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (wall counting, quarantine marking)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Graph Traversal](../../strategies/patterns/graph-traversal.md) | [Simulation](../../strategies/patterns/simulation.md)
