---
id: M178
old_id: I206
slug: trapping-rain-water-ii
title: Trapping Rain Water II
difficulty: medium
category: medium
topics: ["heap", "priority-queue", "matrix", "bfs"]
patterns: ["priority-queue", "boundary-traversal"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E042", "M407", "M130"]
prerequisites: ["priority-queue", "bfs", "min-heap"]
---
# Trapping Rain Water II

## Problem

Picture a 3D terrain represented by a 2D grid called `heightMap`, where each cell contains an integer representing the elevation of that location. After a rainstorm, water collects in the valleys and depressions of this landscape, held in place by surrounding higher terrain. Your challenge is to calculate exactly how much water can be trapped across the entire terrain, measured in unit cubes (where each cell can hold some number of units of water above its base elevation).

The key concept is that water at any interior cell is constrained by the minimum height of the "walls" that surround it. Water will fill up to the level of the lowest barrier that would allow it to escape. Think of it like a container: water can only be held as high as the lowest point in the container's rim. In 2D, this means water at any cell settles at a height determined by the minimum elevation along any path to the boundary.

Let's visualize an example. Consider this 3x6 grid:
```
heightMap = [[1,4,3,1,3,2],
             [3,2,1,3,2,4],
             [2,3,3,2,3,1]]
```
Looking at the cell with elevation 1 in the middle row (position [1,2]), it's surrounded by higher terrain on most sides. Water can accumulate here up to a certain level before it would overflow at the weakest boundary point. After calculating all such trapped water across the grid, the total is 4 units.

Here's another example that's easier to visualize: a 5x5 grid where the outer ring has elevation 3, the next ring inward has elevation 2, and the very center has elevation 1:
```
heightMap = [[3,3,3,3,3],
             [3,2,2,2,3],
             [3,2,1,2,3],
             [3,2,2,2,3],
             [3,3,3,3,3]]
```
The center cell (elevation 1) can fill up to level 2 (contributing 1 unit of water). The four cells around the center (elevation 2) can fill up to level 3 (contributing 1 unit each, for 4 units). Then the eight cells in the next ring (also elevation 2) can similarly fill to level 3 (contributing 8 more units). But wait, the actual answer is 10 units total. The water forms a "pool" where the center depression fills first, and the surrounding cells at elevation 2 trap water up to the level dictated by the outer wall at elevation 3. Important constraints: cells on the boundary of the grid cannot trap water (they're open to the outside), the grid dimensions can be up to 200x200, and elevations can range from 0 to 20,000.

## Why This Matters

This problem models real-world challenges in hydrology, terrain analysis, and civil engineering. Urban planners use similar algorithms to predict where rainwater will pool on city streets, helping design drainage systems to prevent flooding. Agricultural engineers analyze field topography to optimize irrigation and prevent erosion. Video game engines calculate water physics for realistic environmental simulations. Mining operations predict where hazardous liquids might accumulate in excavated areas. The algorithmic insight here is crucial: instead of trying to calculate water levels from the inside out (which is complex because interior cells depend on each other), you work from the boundaries inward. Water levels are determined by the minimum "barrier height" encountered along any escape path to the boundary. By processing cells in order of increasing boundary height using a min-heap (priority queue), you ensure that when you process a cell, you already know the water level it must reach. This "process in sorted order" pattern appears in many graph algorithms (Dijkstra's shortest path, Prim's minimum spanning tree) and demonstrates how the right processing order transforms a seemingly complex dependency problem into a straightforward greedy algorithm. The combination of BFS-style exploration with priority-based ordering is a powerful technique applicable far beyond this specific problem.

## Constraints

- m == heightMap.length
- n == heightMap[i].length
- 1 <= m, n <= 200
- 0 <= heightMap[i][j] <= 2 * 10⁴

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Start from the boundaries</summary>

Water can only be trapped if it's surrounded by higher terrain. The key insight is that water at any cell is determined by the minimum height of the boundary that encloses it. Start from the outer boundaries and work inward, as cells on the edge cannot trap water themselves.
</details>

<details>
<summary>🎯 Hint 2: Use a min-heap for processing order</summary>

Use a priority queue (min-heap) to always process the cell with the minimum height among all boundary cells. This ensures you're always filling from the lowest point, similar to how water would naturally flow. Add all boundary cells to the heap initially, then process neighbors of visited cells.
</details>

<details>
<summary>📝 Hint 3: Track the water level</summary>

```
1. Initialize heap with all boundary cells
2. Track visited cells to avoid reprocessing
3. For each cell popped from heap:
   - If current height < max_height seen so far:
     water += max_height - current_height
   - Update max_height = max(max_height, current_height)
   - Add unvisited neighbors to heap
4. Return total water accumulated
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Min-Heap + BFS | O(m × n × log(m × n)) | O(m × n) | Heap operations for all cells |
| Brute Force (DFS from each cell) | O((m × n)²) | O(m × n) | Too slow for large grids |

## Common Mistakes

### Mistake 1: Not tracking the maximum height boundary

```python
# Wrong: Comparing only with immediate neighbors
def trap_water_wrong(heightMap):
    water = 0
    for i in range(1, len(heightMap) - 1):
        for j in range(1, len(heightMap[0]) - 1):
            min_neighbor = min(heightMap[i-1][j], heightMap[i+1][j],
                              heightMap[i][j-1], heightMap[i][j+1])
            if min_neighbor > heightMap[i][j]:
                water += min_neighbor - heightMap[i][j]  # Incorrect!
    return water
```

```python
# Correct: Track the global boundary height
def trap_water_correct(heightMap):
    if not heightMap or not heightMap[0]:
        return 0

    m, n = len(heightMap), len(heightMap[0])
    heap = []
    visited = set()

    # Add all boundary cells
    for i in range(m):
        for j in range(n):
            if i == 0 or i == m-1 or j == 0 or j == n-1:
                heapq.heappush(heap, (heightMap[i][j], i, j))
                visited.add((i, j))

    water = 0
    max_height = 0

    while heap:
        height, x, y = heapq.heappop(heap)
        max_height = max(max_height, height)

        for dx, dy in [(0,1), (1,0), (0,-1), (-1,0)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < m and 0 <= ny < n and (nx, ny) not in visited:
                water += max(0, max_height - heightMap[nx][ny])
                heapq.heappush(heap, (heightMap[nx][ny], nx, ny))
                visited.add((nx, ny))

    return water
```

### Mistake 2: Processing cells in wrong order

```python
# Wrong: BFS without priority ordering
def trap_water_wrong(heightMap):
    queue = deque()  # Regular queue doesn't ensure correct fill order
    # Water level can be violated if we don't process from lowest boundary
```

```python
# Correct: Use min-heap to always process lowest boundary first
import heapq
heap = []  # Min-heap ensures correct water filling order
heapq.heappush(heap, (height, x, y))
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Trapping Rain Water (1D) | Easy | Single row version - E042 |
| Pour Water | Medium | Simulate water drops falling from specific positions |
| Rain Water Trapping with Obstacles | Hard | Some cells are blocked and cannot hold water |
| 3D Water Trapping | Hard | Extend to 3-dimensional grid |

## Practice Checklist

- [ ] Day 1: Solve using min-heap approach (30-45 min)
- [ ] Day 2: Implement without looking at hints (25 min)
- [ ] Day 7: Re-solve and optimize space if possible (20 min)
- [ ] Day 14: Compare with 1D trapping rain water problem (15 min)
- [ ] Day 30: Explain the boundary-inward approach to someone (10 min)

**Strategy**: See [Priority Queue Pattern](../prerequisites/heaps.md)
