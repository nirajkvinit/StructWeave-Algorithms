---
id: M220
old_id: I289
slug: the-maze
title: The Maze
difficulty: medium
category: medium
topics: []
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M219", "M223", "E087"]
prerequisites: ["bfs", "dfs", "graph-traversal"]
---
# The Maze

## Problem

A ball sits in a maze represented as an `m x n` grid where `0` indicates empty space and `1` indicates a wall. The ball can roll in one of four cardinal directions (up, down, left, right), but here's the critical constraint: once you choose a direction, the ball rolls continuously until it hits a wall - it cannot stop mid-roll.

Given the maze grid, the ball's starting position `start = [startRow, startCol]`, and a target position `destination = [destRow, destCol]`, determine whether the ball can reach and stop exactly at the destination.

This is NOT a standard pathfinding problem. In typical maze problems, you can stop at every cell. Here, the valid "states" are only positions where the ball comes to rest (cells immediately before walls). For example, if the ball is at position (2,1) and you roll it right, it might slide through (2,2), (2,3), and (2,4) before stopping at (2,5) when it hits a wall at (2,6). The intermediate cells don't count as stopping positions.

Your exploration algorithm (BFS or DFS) must simulate the rolling physics: for each position, try rolling in all four directions, calculate where the ball stops in each direction, and track which stopping positions you've visited. The challenge is efficiently simulating the continuous roll and avoiding infinite loops when multiple paths lead to the same stopping positions.

Important details: all maze edges are surrounded by walls (preventing out-of-bounds rolls), both start and destination are in empty spaces, the maze contains at least 2 empty spaces, and dimensions can be up to 100×100, requiring an efficient solution.

## Why This Matters

This problem models physics-based navigation where objects have momentum and can't stop instantly - think marble mazes, ice sliding puzzles in games, or simulating objects on frictionless surfaces. It teaches you to distinguish between intermediate states (cells the ball passes through) and terminal states (cells where the ball can actually stop), a crucial concept in state-space search problems. The rolling simulation technique applies to game development, physics engines, and any scenario with continuous motion constrained by discrete obstacles. Additionally, this problem demonstrates how small constraint changes (can't stop mid-motion) fundamentally alter the solution approach - it's a valuable lesson in careful problem reading and adapting standard algorithms to modified conditions.

## Examples

**Example 1:**
- Input: `maze = [[0,0,0,0,0],[1,1,0,0,1],[0,0,0,0,0],[0,1,0,0,1],[0,1,0,0,0]], start = [4,3], destination = [0,1]`
- Output: `false`

## Constraints

- m == maze.length
- n == maze[i].length
- 1 <= m, n <= 100
- maze[i][j] is 0 or 1.
- start.length == 2
- destination.length == 2
- 0 <= startrow, destinationrow <= m
- 0 <= startcol, destinationcol <= n
- Both the ball and the destination exist in an empty space, and they will not be in the same position initially.
- The maze contains **at least 2 empty spaces**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual Understanding</summary>

This is not a simple path-finding problem. The ball doesn't stop at every cell - it rolls continuously until hitting a wall. This means your valid "states" are only the positions where the ball can stop (right before walls). You need to find if there's a sequence of rolls that leads from the start to the destination.

</details>

<details>
<summary>🎯 Hint 2: Optimal Approach</summary>

Use BFS or DFS to explore all reachable stopping positions. For each position, simulate the ball rolling in all four directions until it hits a wall. The position just before the wall is the next valid state. Mark visited positions to avoid cycles. Check if you can reach the destination position.

</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>

1. Initialize a queue with the start position and a visited set
2. For each position in the queue:
   - For each of 4 directions:
     - Roll the ball continuously until hitting a wall
     - Record the stopping position (one cell before wall)
     - If stopping position equals destination, return true
     - If stopping position not visited, add to queue
3. If queue is empty and destination not reached, return false

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| BFS | O(m * n) | O(m * n) | Visit each cell at most once as a stopping point |
| DFS | O(m * n) | O(m * n) | Same as BFS but uses recursion stack |
| Dijkstra's (overkill) | O(m * n * log(m * n)) | O(m * n) | Unnecessary since all edges have weight 1 |

## Common Mistakes

### Mistake 1: Treating it as a regular grid traversal
```python
# Wrong: Checks every adjacent cell, not rolling until wall
def hasPath(maze, start, destination):
    queue = [start]
    visited = {tuple(start)}

    while queue:
        x, y = queue.pop(0)
        if [x, y] == destination:
            return True

        # Wrong: only moving one cell at a time
        for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < len(maze) and 0 <= ny < len(maze[0]):
                if maze[nx][ny] == 0 and (nx, ny) not in visited:
                    queue.append([nx, ny])
                    visited.add((nx, ny))
    return False
```

```python
# Correct: Roll until hitting wall
def hasPath(maze, start, destination):
    m, n = len(maze), len(maze[0])
    queue = [start]
    visited = {tuple(start)}

    while queue:
        x, y = queue.pop(0)
        if [x, y] == destination:
            return True

        for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
            nx, ny = x, y
            # Roll until hitting wall
            while 0 <= nx + dx < m and 0 <= ny + dy < n and maze[nx + dx][ny + dy] == 0:
                nx += dx
                ny += dy

            if (nx, ny) not in visited:
                queue.append([nx, ny])
                visited.add((nx, ny))
    return False
```

### Mistake 2: Checking destination during rolling instead of at stopping point
```python
# Wrong: Checking destination while rolling
def hasPath(maze, start, destination):
    m, n = len(maze), len(maze[0])
    queue = [start]
    visited = {tuple(start)}

    while queue:
        x, y = queue.pop(0)

        for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
            nx, ny = x, y
            while 0 <= nx + dx < m and 0 <= ny + dy < n and maze[nx + dx][ny + dy] == 0:
                nx += dx
                ny += dy
                # Wrong: checking destination mid-roll
                if [nx, ny] == destination:
                    return True
```

```python
# Correct: Check destination only at stopping points
def hasPath(maze, start, destination):
    m, n = len(maze), len(maze[0])
    queue = [start]
    visited = {tuple(start)}

    while queue:
        x, y = queue.pop(0)
        if [x, y] == destination:  # Check at stopping point
            return True

        for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
            nx, ny = x, y
            while 0 <= nx + dx < m and 0 <= ny + dy < n and maze[nx + dx][ny + dy] == 0:
                nx += dx
                ny += dy

            if (nx, ny) not in visited:
                queue.append([nx, ny])
                visited.add((nx, ny))
    return False
```

### Mistake 3: Not handling boundaries correctly
```python
# Wrong: Out of bounds check after updating position
def hasPath(maze, start, destination):
    while queue:
        x, y = queue.pop(0)
        for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
            nx, ny = x + dx, y + dy
            # Wrong: checking bounds after moving
            while 0 <= nx < m and 0 <= ny < n and maze[nx][ny] == 0:
                nx += dx
                ny += dy
```

```python
# Correct: Check bounds before updating position
def hasPath(maze, start, destination):
    m, n = len(maze), len(maze[0])
    while queue:
        x, y = queue.pop(0)
        for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
            nx, ny = x, y
            # Correct: checking next position before moving
            while 0 <= nx + dx < m and 0 <= ny + dy < n and maze[nx + dx][ny + dy] == 0:
                nx += dx
                ny += dy
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| The Maze II | Medium | Find shortest distance for ball to reach destination |
| The Maze III | Hard | Find lexicographically smallest shortest path to hole |
| Robot Room Cleaner | Hard | Clean all reachable cells with limited visibility |
| Shortest Path in Binary Matrix | Medium | Standard BFS pathfinding |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] After 1 day (spaced repetition)
- [ ] After 3 days (spaced repetition)
- [ ] After 1 week (spaced repetition)
- [ ] Before interview (final review)

**Completion Status**: ⬜ Not Started | 🟨 In Progress | ✅ Mastered

**Strategy**: See [Graph Traversal Pattern](../strategies/patterns/graph-traversal.md)
