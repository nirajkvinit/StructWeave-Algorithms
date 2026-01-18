---
id: M127
old_id: I104
slug: number-of-islands-ii
title: Number of Islands II
difficulty: medium
category: medium
topics: ["array", "matrix", "union-find"]
patterns: ["dp-2d", "union-find"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M121", "M122", "M126"]
prerequisites: ["union-find", "disjoint-set", "graph-connectivity"]
---
# Number of Islands II

## Problem

Imagine you're simulating land formation over time, perhaps modeling volcanic islands emerging from the ocean or tracking flooded areas as water recedes. You start with a 2D grid of dimensions `m x n` that's completely filled with water (every cell is `0`). In this grid, `0` represents water and `1` represents land. You then execute a series of land-addition operations, where each operation converts one specific water cell into land. The array `positions` contains the coordinates for these operations, where `positions[i] = [ri, ci]` tells you which cell turns into land during the ith operation.

An **island** is defined as a group of land cells that are connected horizontally or vertically (diagonals don't count), completely surrounded by water. Think of it like looking at a map from above - contiguous land masses form islands. Your task is to track how many distinct islands exist after each land-addition operation. For example, adding land at [0,0] creates one island. Adding land at [0,1] (adjacent to [0,0]) still gives you one island because they merge. But adding land at [1,2] (not adjacent to any existing land) creates a second island.

The challenge is that islands can merge when new land connects previously separate landmasses. You need to efficiently track these dynamic connections and return an array where `answer[i]` is the total island count after the ith operation. Edge cases include adding land to the same position multiple times (which shouldn't change the count), adding land that merges three or more separate islands into one, and grids where no land ever connects (each operation creates a new island). The naive approach of re-scanning the entire grid after each operation would be too slow for large grids with many operations.




**Diagram:**

```
Example: Adding land at positions [[0,0], [0,1], [1,2], [2,1]]

Step 0 (start):        Step 1 (add [0,0]):     Step 2 (add [0,1]):
┌─────┬─────┬─────┐   ┌─────┬─────┬─────┐    ┌─────┬─────┬─────┐
│  0  │  0  │  0  │   │  1  │  0  │  0  │    │  1  │  1  │  0  │
├─────┼─────┼─────┤   ├─────┼─────┼─────┤    ├─────┼─────┼─────┤
│  0  │  0  │  0  │   │  0  │  0  │  0  │    │  0  │  0  │  0  │
├─────┼─────┼─────┤   ├─────┼─────┼─────┤    ├─────┼─────┼─────┤
│  0  │  0  │  0  │   │  0  │  0  │  0  │    │  0  │  0  │  0  │
└─────┴─────┴─────┘   └─────┴─────┴─────┘    └─────┴─────┴─────┘
Islands: 0              Islands: 1              Islands: 1

Step 3 (add [1,2]):     Step 4 (add [2,1]):
┌─────┬─────┬─────┐    ┌─────┬─────┬─────┐
│  1  │  1  │  0  │    │  1  │  1  │  0  │
├─────┼─────┼─────┤    ├─────┼─────┼─────┤
│  0  │  0  │  1  │    │  0  │  0  │  1  │
├─────┼─────┼─────┤    ├─────┼─────┼─────┤
│  0  │  0  │  0  │    │  0  │  1  │  0  │
└─────┴─────┴─────┘    └─────┴─────┴─────┘
Islands: 2              Islands: 3
```


## Why This Matters

This problem teaches dynamic connectivity and Union-Find data structures, which are essential for real-time network and graph updates in distributed systems. Social network platforms use Union-Find to track connected components as friendships form, efficiently detecting when adding a connection merges two separate friend groups. Network monitoring systems track connected components in computer networks to detect when adding or removing links partitions the network or merges subnets. Image processing applications use connected component analysis for real-time object tracking as pixels change values, identifying and counting distinct objects in video streams. Geographic information systems track watershed regions and land formations as terrain data updates from satellite imagery or sensor networks. Multiplayer game servers manage player clusters and server sharding by tracking which players become connected through proximity or team assignments. The key algorithmic insight is Union-Find (Disjoint Set Union), which provides near-constant time operations for merging sets and checking connectivity through path compression and union by rank optimizations, turning what would be an O(k×mn) problem into an O(k×α(mn)) solution where α is the inverse Ackermann function, essentially constant in practice.

## Examples

**Example 1:**
- Input: `m = 1, n = 1, positions = [[0,0]]`
- Output: `[1]`

## Constraints

- 1 <= m, n, positions.length <= 10⁴
- 1 <= m * n <= 10⁴
- positions[i].length == 2
- 0 <= ri < m
- 0 <= ci < n

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

Each time you add land, you potentially create a new island or merge existing islands. Think about how to efficiently track which land cells belong to the same island and how to merge islands when adjacent land is added. This is a dynamic connectivity problem.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use Union-Find (Disjoint Set Union) data structure. When adding a new land cell, initially assume it creates a new island (count++). Then check all 4 adjacent cells - for each adjacent land cell that belongs to a different island, union them together and decrease count. Union-Find provides near-constant time operations for this.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**Union-Find Approach:**
```
1. Initialize Union-Find structure for m*n cells
2. Create set to track which cells are land
3. Initialize count = 0

4. For each position [r, c]:
   - If already land, append current count to result
   - Else:
     - Add to land set
     - count += 1 (assume new island)
     - For each 4-directional neighbor (nr, nc):
       - If neighbor is land:
         - If find(cell) != find(neighbor):
           - union(cell, neighbor)
           - count -= 1 (merged two islands)
     - Append count to result

5. Return result

Union-Find operations:
- find(x): Find root of x's component (with path compression)
- union(x, y): Merge components containing x and y (with rank)
```

Key: Each union reduces island count by 1.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS/DFS After Each Add | O(k × mn) | O(mn) | k operations, mn per BFS, very slow |
| **Union-Find** | **O(k × α(mn))** | **O(mn)** | α is inverse Ackermann, nearly O(1) |
| Union-Find Optimized | O(k) amortized | O(mn) | With path compression and union by rank |

## Common Mistakes

### Mistake 1: Running full island counting after each operation

**Wrong:**
```python
def numIslands2(m, n, positions):
    grid = [[0] * n for _ in range(m)]
    result = []

    for r, c in positions:
        grid[r][c] = 1
        # Wrong: runs full BFS/DFS on entire grid - O(mn) per operation
        count = count_islands(grid)
        result.append(count)

    return result
# Time: O(k × mn) - too slow for large inputs
```

**Correct:**
```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return False
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        return True

def numIslands2(m, n, positions):
    uf = UnionFind(m * n)
    land = set()
    result = []
    count = 0
    directions = [(0,1), (1,0), (0,-1), (-1,0)]

    for r, c in positions:
        pos = r * n + c
        if pos in land:
            result.append(count)
            continue

        land.add(pos)
        count += 1

        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n:
                npos = nr * n + nc
                if npos in land and uf.union(pos, npos):
                    count -= 1

        result.append(count)

    return result
```

### Mistake 2: Not handling duplicate positions

**Wrong:**
```python
def numIslands2(m, n, positions):
    # ... union-find setup ...

    for r, c in positions:
        pos = r * n + c
        land.add(pos)
        count += 1  # Wrong: doesn't check if already land

        # ... union logic ...

    return result
# Overcounts when same position added multiple times
```

**Correct:**
```python
def numIslands2(m, n, positions):
    # ... union-find setup ...

    for r, c in positions:
        pos = r * n + c

        # Check if already land
        if pos in land:
            result.append(count)
            continue

        land.add(pos)
        count += 1

        # ... union logic ...

    return result
```

### Mistake 3: Forgetting to check if components are already connected

**Wrong:**
```python
def numIslands2(m, n, positions):
    # ... setup ...

    for r, c in positions:
        # ... add land ...

        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n:
                npos = nr * n + nc
                if npos in land:
                    uf.union(pos, npos)
                    count -= 1  # Wrong: decrements even if already same island

        result.append(count)

    return result
```

**Correct:**
```python
def numIslands2(m, n, positions):
    # ... setup ...

    for r, c in positions:
        # ... add land ...

        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n:
                npos = nr * n + nc
                if npos in land:
                    # Only decrement if union actually merged different components
                    if uf.union(pos, npos):
                        count -= 1

        result.append(count)

    return result
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Number of Islands I | Static grid, count islands once | Medium |
| Number of Islands III | Support both add and remove operations | Hard |
| Max Area of Island | Track largest island area dynamically | Medium |
| Number of Distinct Islands | Count topologically distinct island shapes | Medium |
| Pacific Atlantic Water Flow | Water flow from islands to oceans | Medium |

## Practice Checklist

- [ ] Implement Union-Find data structure from scratch
- [ ] Add path compression optimization
- [ ] Add union by rank optimization
- [ ] Handle duplicate positions correctly
- [ ] **Day 3**: Re-solve without looking at solution
- [ ] **Week 1**: Solve Number of Islands I first
- [ ] **Week 2**: Explain Union-Find concept to someone
- [ ] **Month 1**: Solve Number of Islands III with deletions

**Strategy**: See [Union-Find Patterns](../strategies/data-structures/union-find.md)
