---
id: M121
old_id: I085
slug: walls-and-gates
title: Walls and Gates
difficulty: medium
category: medium
topics: ["graph", "bfs", "matrix"]
patterns: ["dp-2d", "multi-source-bfs"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M127", "M122", "E258"]
prerequisites: ["bfs", "multi-source-bfs", "graph-traversal"]
---
# Walls and Gates

## Problem

Imagine you're designing a building evacuation system where you need to compute how far each room is from the nearest emergency exit. You have a two-dimensional matrix `rooms` with dimensions `m x n`, where each cell contains one of three values. A value of `-1` represents a wall or blocked cell that can't be traversed. A value of `0` represents a gate (an exit point where people can escape). The value `INF` (specifically, the large constant `2³¹ - 1 = 2147483647`) represents an accessible empty room that you can walk through.

Your task is to fill in each accessible empty space with its shortest distance to the nearest gate, measured in steps (where each step moves horizontally or vertically to an adjacent cell). Rooms that are completely blocked off from all exits should remain set to `INF`. Think of this as labeling each room with "how many steps to the nearest exit." For example, a room right next to a gate would be labeled `1`, while a room two steps away would be labeled `2`. The challenge is to compute all these distances efficiently, especially when you have multiple gates spread throughout the building. Edge cases to consider include grids with no gates at all, grids that are entirely walls, and isolated rooms that can never reach any exit.


**Diagram:**

Example grid before and after:
```
Before:                          After:
┌─────┬─────┬─────┬─────┐       ┌─────┬─────┬─────┬─────┐
│ INF │  -1 │  0  │ INF │       │  3  │  -1 │  0  │  1  │
├─────┼─────┼─────┼─────┤       ├─────┼─────┼─────┼─────┤
│ INF │ INF │ INF │  -1 │       │  2  │  2  │  1  │  -1 │
├─────┼─────┼─────┼─────┤       ├─────┼─────┼─────┼─────┤
│ INF │  -1 │ INF │  -1 │       │  1  │  -1 │  2  │  -1 │
├─────┼─────┼─────┼─────┤       ├─────┼─────┼─────┼─────┤
│  0  │  -1 │ INF │ INF │       │  0  │  -1 │  3  │  4  │
└─────┴─────┴─────┴─────┘       └─────┴─────┴─────┴─────┘

Legend:
  -1  = Wall (blocked)
   0  = Gate (exit point)
  INF = Empty room (2147483647)
  Numbers on right = Distance to nearest gate
```


## Why This Matters

This problem models real-world spatial optimization scenarios that appear frequently in system design and infrastructure planning. Building evacuation systems use exactly this logic to place exit signs and calculate safe evacuation times during emergencies. In robotics and warehouse automation, autonomous robots compute shortest paths to charging stations or loading docks using the same multi-source shortest path technique. Indoor navigation apps like those used in airports or shopping malls calculate walking distances from your current location to the nearest bathroom, restaurant, or information desk. Network engineers apply this pattern when optimizing server placement to minimize latency from multiple data centers to user locations. The core algorithmic insight here is multi-source breadth-first search, which efficiently computes distances from multiple starting points simultaneously rather than running separate searches from each destination.

## Examples

**Example 1:**
- Input: `rooms = [[-1]]`
- Output: `[[-1]]`

## Constraints

- m == rooms.length
- n == rooms[i].length
- 1 <= m, n <= 250
- rooms[i][j] is -1, 0, or 2³¹ - 1.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

Think of this as finding shortest paths from multiple sources (all gates) simultaneously. Rather than running BFS from each empty room to find the nearest gate, reverse the approach: start from all gates at once and expand outward, filling in distances as you go.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use multi-source BFS. Initialize a queue with all gate positions (cells with value 0). Then perform BFS level by level, where each level represents one unit of distance. For each cell, update its distance only if it's currently INF (unvisited). This guarantees shortest paths because BFS explores cells in order of increasing distance.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**Multi-Source BFS:**
```
1. Create queue and add all gate positions (value == 0)
2. Initialize distance to 0

3. While queue not empty:
   - For each cell (r, c) at current level:
     - For each 4-directional neighbor (nr, nc):
       - If neighbor is INF (unvisited room):
         - Set rooms[nr][nc] = rooms[r][c] + 1
         - Add (nr, nc) to queue

4. All reachable rooms now have minimum distances
```

Key insight: First visit = shortest distance in BFS.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS from Each Room | O(m²n² × g) | O(mn) | g = gates, very inefficient |
| **Multi-Source BFS** | **O(mn)** | **O(mn)** | Optimal, each cell visited once |
| DFS from Each Gate | O(mn × g) | O(mn) | Suboptimal, may revisit cells |
| Dijkstra's Algorithm | O(mn log(mn)) | O(mn) | Overkill for unweighted graph |

## Common Mistakes

### Mistake 1: Running BFS from each empty room

**Wrong:**
```python
def wallsAndGates(rooms):
    if not rooms:
        return

    m, n = len(rooms), len(rooms[0])
    INF = 2147483647

    # Wrong: BFS from each room to find nearest gate
    for i in range(m):
        for j in range(n):
            if rooms[i][j] == INF:
                # BFS to find nearest gate - O(mn) per room!
                min_dist = bfs_to_gate(rooms, i, j)
                rooms[i][j] = min_dist
    # Time: O(m²n²) - very slow
```

**Correct:**
```python
from collections import deque

def wallsAndGates(rooms):
    if not rooms:
        return

    m, n = len(rooms), len(rooms[0])
    INF = 2147483647
    queue = deque()

    # Multi-source BFS: start from all gates
    for i in range(m):
        for j in range(n):
            if rooms[i][j] == 0:
                queue.append((i, j))

    directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]

    while queue:
        r, c = queue.popleft()
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and rooms[nr][nc] == INF:
                rooms[nr][nc] = rooms[r][c] + 1
                queue.append((nr, nc))
```

### Mistake 2: Not checking if cell is already visited

**Wrong:**
```python
def wallsAndGates(rooms):
    # ... initialization code ...

    while queue:
        r, c = queue.popleft()
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and rooms[nr][nc] != -1:
                # Wrong: updates even if already has smaller distance
                rooms[nr][nc] = rooms[r][c] + 1
                queue.append((nr, nc))
    # Results in infinite loop and wrong distances!
```

**Correct:**
```python
def wallsAndGates(rooms):
    # ... initialization code ...

    while queue:
        r, c = queue.popleft()
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            # Only update if it's an unvisited room (INF)
            if 0 <= nr < m and 0 <= nc < n and rooms[nr][nc] == INF:
                rooms[nr][nc] = rooms[r][c] + 1
                queue.append((nr, nc))
```

### Mistake 3: Using DFS instead of BFS

**Wrong:**
```python
def wallsAndGates(rooms):
    m, n = len(rooms), len(rooms[0])
    INF = 2147483647

    def dfs(r, c, dist):
        if r < 0 or r >= m or c < 0 or c >= n:
            return
        if rooms[r][c] < dist:  # Wall or already better distance
            return

        rooms[r][c] = dist
        # DFS doesn't guarantee shortest path!
        dfs(r+1, c, dist+1)
        dfs(r-1, c, dist+1)
        dfs(r, c+1, dist+1)
        dfs(r, c-1, dist+1)

    # Start DFS from each gate
    for i in range(m):
        for j in range(n):
            if rooms[i][j] == 0:
                dfs(i, j, 0)
    # Wrong: DFS may not find shortest paths
```

**Correct:**
```python
from collections import deque

def wallsAndGates(rooms):
    if not rooms:
        return

    m, n = len(rooms), len(rooms[0])
    INF = 2147483647
    queue = deque()

    # BFS guarantees shortest path
    for i in range(m):
        for j in range(n):
            if rooms[i][j] == 0:
                queue.append((i, j))

    while queue:
        r, c = queue.popleft()
        for dr, dc in [(0,1), (1,0), (0,-1), (-1,0)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and rooms[nr][nc] == INF:
                rooms[nr][nc] = rooms[r][c] + 1
                queue.append((nr, nc))
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| 01 Matrix | Find distance to nearest 0 in binary matrix | Medium |
| Rotting Oranges | Multi-source BFS with time tracking | Medium |
| Shortest Distance from Guards | Multiple guards, find min distance | Medium |
| As Far as Possible | Find cell farthest from all gates | Medium |
| Maze with Keys | Add keys/locks to gates problem | Hard |

## Practice Checklist

- [ ] Implement multi-source BFS solution
- [ ] Handle edge cases (no gates, all walls, single cell)
- [ ] Verify in-place modification works correctly
- [ ] Explain why BFS guarantees shortest paths
- [ ] **Day 3**: Re-solve without looking at solution
- [ ] **Week 1**: Solve 01 Matrix variation
- [ ] **Week 2**: Explain multi-source BFS concept to someone
- [ ] **Month 1**: Solve Rotting Oranges problem

**Strategy**: See [Graph Traversal Patterns](../strategies/patterns/graph-traversal.md)
