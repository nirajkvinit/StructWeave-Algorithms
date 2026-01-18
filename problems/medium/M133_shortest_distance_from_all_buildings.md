---
id: M133
old_id: I116
slug: shortest-distance-from-all-buildings
title: Shortest Distance from All Buildings
difficulty: medium
category: medium
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M100", "M202", "E242"]
prerequisites: ["bfs", "grid-traversal", "multi-source-bfs"]
---
# Shortest Distance from All Buildings

## Problem

You're given an `m x n` grid representing a city layout where you need to find the optimal location to build a new house. The grid contains three types of cells: `0` represents vacant land where you can walk and potentially build, `1` represents an existing building that blocks passage, and `2` represents an obstacle (like a lake or park) that also blocks passage.

Your mission is to find which vacant land cell would minimize the total walking distance to all existing buildings in the city. Think of it as choosing where to build a house so that the sum of distances to all your destinations (the buildings) is as small as possible. You can only move in four cardinal directions: up, down, left, and right, no diagonal movement allowed. Distance is measured using Manhattan Distance (also called taxicab distance), which calculates how many steps you'd need to walk on a city grid: `distance(p1, p2) = |p2.x - p1.x| + |p2.y - p1.y|`. For instance, moving from position (0,0) to position (2,3) requires |2-0| + |3-0| = 5 steps. Your algorithm must return the minimum total walking distance achievable by choosing the optimal vacant land cell. An important edge case to consider: if there's no vacant land cell that can reach all buildings (perhaps some buildings are completely isolated by obstacles), you should return -1. The total walking distance means if there are three buildings and your chosen location is distance 3, 5, and 2 from them respectively, the total distance would be 3+5+2 = 10.


**Diagram:**

```
Example Grid (1 = building, 0 = empty land, 2 = obstacle):
┌───┬───┬───┬───┬───┐
│ 1 │ 0 │ 2 │ 0 │ 1 │
├───┼───┼───┼───┼───┤
│ 0 │ 0 │ 0 │ 0 │ 0 │
├───┼───┼───┼───┼───┤
│ 0 │ 0 │ 1 │ 0 │ 0 │
└───┴───┴───┴───┴───┘

Buildings at: (0,0), (0,4), (2,2)
Obstacle at: (0,2)

Distance calculation for position (1,2):
  - To building (0,0): |1-0| + |2-0| = 3
  - To building (0,4): |1-0| + |2-4| = 3
  - To building (2,2): |1-2| + |2-2| = 1
  - Total: 3 + 3 + 1 = 7

Optimal house location: (1,2) with minimum total distance 7
```


## Why This Matters

This problem directly models real-world facility location optimization, a critical problem in urban planning, logistics, and business strategy. Amazon uses similar algorithms to determine optimal warehouse locations that minimize shipping distances to customer clusters. City planners apply these techniques to decide where to build fire stations, hospitals, or schools to ensure quick access for all residents. Telecommunications companies position cell towers to provide coverage while minimizing total infrastructure cost. The algorithmic techniques you'll learn here, particularly multi-source BFS (breadth-first search), appear in many graph and grid problems. Understanding how to efficiently explore from multiple starting points simultaneously is crucial for network analysis, such as finding connected components or calculating influence spread in social networks. The challenge of tracking which vacant cells are reachable from all buildings teaches you important state management skills that apply to complex search problems in AI and robotics path planning.

## Examples

**Example 1:**
- Input: `grid = [[1,0]]`
- Output: `1`

**Example 2:**
- Input: `grid = [[1]]`
- Output: `-1`

## Constraints

- m == grid.length
- n == grid[i].length
- 1 <= m, n <= 50
- grid[i][j] is either 0, 1, or 2.
- There will be **at least one** building in the grid.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: BFS from Buildings</summary>

Instead of trying every empty land and calculating distances to all buildings (which would be inefficient), run BFS from each building to calculate distances to all reachable empty lands. For each empty cell, accumulate the distances from all buildings. This approach ensures you only visit each cell once per building.
</details>

<details>
<summary>🎯 Hint 2: Tracking Reachability</summary>

An empty land cell is only valid if ALL buildings can reach it. Maintain two matrices: one for total distance sum and one for counting how many buildings can reach each cell. A cell is valid only if its reach count equals the total number of buildings.
</details>

<details>
<summary>📝 Hint 3: Implementation Strategy</summary>

Algorithm:
1. Count total buildings in grid
2. Create distance matrix (sum of distances) and reach matrix (count of buildings)
3. For each building, run BFS:
   - Track distance from current building
   - For each empty land reached, add distance to distance matrix
   - Increment reach count in reach matrix
4. Find minimum distance among cells where reach == total buildings

Time: O(m×n × buildings), Space: O(m×n)
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS from Each Empty Land | O(m²×n²×b) | O(m×n) | b = buildings, very inefficient |
| **BFS from Each Building** | **O(b×m×n)** | **O(m×n)** | **Optimal approach** |
| Pruning with Markers | O(b×m×n) | O(m×n) | Optimization to skip unreachable cells |

## Common Mistakes

### Mistake 1: BFS from Empty Lands Instead of Buildings

```python
# WRONG: Inefficient to BFS from each empty land
def shortestDistance(grid):
    m, n = len(grid), len(grid[0])
    min_dist = float('inf')

    for i in range(m):
        for j in range(n):
            if grid[i][j] == 0:  # For each empty land
                # BFS to all buildings - very slow!
                total = bfs_to_buildings(grid, i, j)
                min_dist = min(min_dist, total)

    return min_dist if min_dist != float('inf') else -1
```

```python
# CORRECT: BFS from each building to all empty lands
from collections import deque

def shortestDistance(grid):
    m, n = len(grid), len(grid[0])
    buildings = sum(row.count(1) for row in grid)
    distances = [[0] * n for _ in range(m)]
    reach = [[0] * n for _ in range(m)]

    def bfs(start_i, start_j):
        queue = deque([(start_i, start_j, 0)])
        visited = set([(start_i, start_j)])

        while queue:
            i, j, dist = queue.popleft()

            for di, dj in [(0,1), (1,0), (0,-1), (-1,0)]:
                ni, nj = i + di, j + dj
                if 0 <= ni < m and 0 <= nj < n and (ni, nj) not in visited:
                    if grid[ni][nj] == 0:
                        visited.add((ni, nj))
                        distances[ni][nj] += dist + 1
                        reach[ni][nj] += 1
                        queue.append((ni, nj, dist + 1))

    # BFS from each building
    for i in range(m):
        for j in range(n):
            if grid[i][j] == 1:
                bfs(i, j)

    # Find minimum distance where all buildings are reachable
    result = float('inf')
    for i in range(m):
        for j in range(n):
            if grid[i][j] == 0 and reach[i][j] == buildings:
                result = min(result, distances[i][j])

    return result if result != float('inf') else -1
```

### Mistake 2: Not Checking if All Buildings Are Reachable

```python
# WRONG: Returns minimum without checking reachability
def shortestDistance(grid):
    distances = [[0] * n for _ in range(m)]

    # ... BFS from buildings ...

    # Wrong: doesn't check if all buildings can reach this cell
    return min(min(row) for row in distances)
```

```python
# CORRECT: Verify all buildings are reachable
def shortestDistance(grid):
    m, n = len(grid), len(grid[0])
    buildings = sum(row.count(1) for row in grid)
    distances = [[0] * n for _ in range(m)]
    reach = [[0] * n for _ in range(m)]

    # ... BFS from each building ...

    result = float('inf')
    for i in range(m):
        for j in range(n):
            if grid[i][j] == 0 and reach[i][j] == buildings:  # Check reach
                result = min(result, distances[i][j])

    return result if result != float('inf') else -1
```

### Mistake 3: Not Handling Obstacles Correctly

```python
# WRONG: Treating obstacles as empty land
def shortestDistance(grid):
    # ...
    for di, dj in [(0,1), (1,0), (0,-1), (-1,0)]:
        ni, nj = i + di, j + dj
        if 0 <= ni < m and 0 <= nj < n and grid[ni][nj] != 1:
            # This allows traversal through obstacles (2)!
            queue.append((ni, nj, dist + 1))
```

```python
# CORRECT: Only traverse empty land
def shortestDistance(grid):
    # ...
    for di, dj in [(0,1), (1,0), (0,-1), (-1,0)]:
        ni, nj = i + di, j + dj
        if 0 <= ni < m and 0 <= nj < n and (ni, nj) not in visited:
            if grid[ni][nj] == 0:  # Only empty land
                visited.add((ni, nj))
                distances[ni][nj] += dist + 1
                reach[ni][nj] += 1
                queue.append((ni, nj, dist + 1))
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| Weighted Buildings | Different buildings have different weights | Multiply distance by weight |
| K-Nearest Buildings | Find location minimizing distance to k nearest buildings | Track k smallest distances |
| Maximum Distance | Minimize maximum distance to any building | Use max instead of sum |
| 3D Grid | Buildings on multiple floors | Extend to 3D BFS |
| Dynamic Buildings | Buildings can be added/removed | Maintain incremental BFS results |
| Limited Budget | Total distance must be under budget | Early termination optimization |

## Practice Checklist

- [ ] Day 1: Implement BFS from buildings approach
- [ ] Day 2: Add reachability optimization
- [ ] Day 3: Solve without hints
- [ ] Day 7: Compare time complexity of both approaches
- [ ] Day 14: Speed test - solve in 25 minutes
- [ ] Day 30: Solve with pruning optimizations

**Strategy**: See [BFS Patterns](../strategies/patterns/dp-2d.md)
