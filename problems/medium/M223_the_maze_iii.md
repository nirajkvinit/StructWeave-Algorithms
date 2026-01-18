---
id: M223
old_id: I298
slug: the-maze-iii
title: The Maze III
difficulty: medium
category: medium
topics: ["string"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M220", "M219", "H034"]
prerequisites: ["dijkstra", "bfs", "priority-queue", "lexicographic-ordering"]
---
# The Maze III

## Problem

Imagine a maze where a ball doesn't just move one step at a time but rolls continuously until it hits a wall. Given an `m x n` maze with empty cells (marked as `0`) and walls (marked as `1`), along with a ball's starting position and a hole position, find the shortest path for the ball to reach the hole.

The ball moves by rolling in one of four directions: up, down, left, or right. Once you choose a direction, the ball keeps rolling until it encounters a wall or falls into the hole. After stopping, you can choose a new direction and roll again.

Here's the key constraint: you're optimizing for two criteria in order of priority:
1. Minimize the total distance (number of empty cells traveled)
2. Among paths with equal distance, choose the lexicographically smallest instruction sequence

The instructions use characters: 'd' (down), 'l' (left), 'r' (right), 'u' (up). Lexicographic order means 'd' < 'l' < 'r' < 'u', so "dlr" comes before "drl".

The distance counts empty cells the ball passes through from start (excluded) to hole (included). For example, if the ball rolls from (0,0) through (1,0), (2,0) and stops at (3,0), the distance is 3.

Return a string representing the move sequence for the shortest path, or "impossible" if no path exists. The maze perimeter is guaranteed to be walls.

**Important edge case**: The ball must check for the hole during rolling, not just at stopping positions, since it falls in immediately upon reaching the hole.


**Diagram:**

```
Example maze (0 = empty, 1 = wall):
  0 1 2 3 4 5 6
0 0 0 0 S 0 0 0
1 0 0 █ 0 0 █ 0
2 0 0 0 0 █ 0 0
3 0 0 0 0 0 H █

S = ball start, H = hole
Ball rolls until wall or hole
Find shortest path (by distance), lexicographically smallest if tied
Directions: u(p), d(own), l(eft), r(ight)
```


## Why This Matters

This problem combines multiple algorithmic concepts that appear in real-world navigation systems: shortest path algorithms (like those used in GPS routing), lexicographic ordering (used in dictionary implementations and database indexing), and state-space search with multiple optimization criteria. The rolling mechanics simulate physics-based movement found in game development and robotics, where objects have momentum and don't stop instantly. The dual optimization criteria (distance first, then lexicographic order) mirrors practical scenarios where you have a primary metric (cost, time) and a tiebreaker (user preference, alphabetical ordering). Mastering priority queue-based search with custom comparison functions is essential for many system design problems, from task scheduling to network routing protocols.

## Examples

**Example 1:**
- Input: `maze = [[0,0,0,0,0,0,0],[0,0,1,0,0,1,0],[0,0,0,0,1,0,0],[0,0,0,0,0,0,1]], ball = [0,4], hole = [3,5]`
- Output: `"dldr"`

## Constraints

- m == maze.length
- n == maze[i].length
- 1 <= m, n <= 100
- maze[i][j] is 0 or 1.
- ball.length == 2
- hole.length == 2
- 0 <= ballrow, holerow <= m
- 0 <= ballcol, holecol <= n
- Both the ball and the hole exist in an empty space, and they will not be in the same position initially.
- The maze contains **at least 2 empty spaces**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual Understanding</summary>

This is a shortest path problem with two criteria: minimize distance first, then lexicographic order. Unlike regular maze problems, the ball rolls until hitting a wall OR falling into the hole. You need to track both the distance traveled and the path string. When there's a tie in distance, choose the lexicographically smaller path.

</details>

<details>
<summary>🎯 Hint 2: Optimal Approach</summary>

Use Dijkstra's algorithm with a priority queue that orders by (distance, path_string). For each position, try all four directions in lexicographic order (d, l, r, u). Roll the ball until it hits a wall or the hole. If you reach the hole, record the path. If you reach a stopping position, add it to the queue if this path is better than any previously found path to that position.

</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>

1. Initialize priority queue with (distance=0, path="", row, col)
2. Keep a visited map storing best (distance, path) for each position
3. While queue not empty:
   - Pop state with minimum distance (and lexicographically smallest path if tied)
   - If already visited with better/equal path, skip
   - Try directions in order: down, left, right, up (lexicographic)
   - Roll ball in each direction until wall or hole
   - If hole reached, update result if better
   - Otherwise, add new state to queue if not visited or better
4. Return result or "impossible"

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Dijkstra with PQ | O(m * n * log(m * n)) | O(m * n) | Each cell processed once with heap operations |
| BFS with Queue | O(m * n * 4^k) | O(m * n) | May revisit states, k = max path length |
| DFS with Memoization | O(m * n * max_path) | O(m * n) | Explores all paths, inefficient |

## Common Mistakes

### Mistake 1: Not checking for hole during rolling
```python
# Wrong: Only checks hole at stopping positions
def findShortestWay(maze, ball, hole):
    m, n = len(maze), len(maze[0])
    heap = [(0, "", ball[0], ball[1])]

    while heap:
        dist, path, x, y = heapq.heappop(heap)

        for d, (dx, dy) in [('d', (1, 0)), ('l', (0, -1)), ('r', (0, 1)), ('u', (-1, 0))]:
            nx, ny, steps = x, y, 0
            # Wrong: doesn't check for hole while rolling
            while 0 <= nx + dx < m and 0 <= ny + dy < n and maze[nx + dx][ny + dy] == 0:
                nx += dx
                ny += dy
                steps += 1
```

```python
# Correct: Check for hole while rolling
def findShortestWay(maze, ball, hole):
    m, n = len(maze), len(maze[0])
    heap = [(0, "", ball[0], ball[1])]
    visited = {(ball[0], ball[1]): (0, "")}

    while heap:
        dist, path, x, y = heapq.heappop(heap)

        for d, (dx, dy) in [('d', (1, 0)), ('l', (0, -1)), ('r', (0, 1)), ('u', (-1, 0))]:
            nx, ny, steps = x, y, 0
            # Correct: check for hole during rolling
            while 0 <= nx + dx < m and 0 <= ny + dy < n and maze[nx + dx][ny + dy] == 0:
                nx += dx
                ny += dy
                steps += 1
                if [nx, ny] == hole:  # Stop at hole
                    break

            new_dist = dist + steps
            new_path = path + d
            # Process if reached hole or valid stopping position
```

### Mistake 2: Wrong comparison for lexicographic ordering
```python
# Wrong: Not comparing properly when distances are equal
def findShortestWay(maze, ball, hole):
    visited = {}
    # ...
    if (nx, ny) not in visited or new_dist < visited[(nx, ny)][0]:
        visited[(nx, ny)] = (new_dist, new_path)
        heapq.heappush(heap, (new_dist, new_path, nx, ny))
    # Missing: should also update if distance same but path lexicographically smaller
```

```python
# Correct: Compare both distance and path
def findShortestWay(maze, ball, hole):
    visited = {}
    # ...
    if (nx, ny) not in visited or \
       new_dist < visited[(nx, ny)][0] or \
       (new_dist == visited[(nx, ny)][0] and new_path < visited[(nx, ny)][1]):
        visited[(nx, ny)] = (new_dist, new_path)
        heapq.heappush(heap, (new_dist, new_path, nx, ny))
```

### Mistake 3: Processing directions in wrong order
```python
# Wrong: Not in lexicographic order
def findShortestWay(maze, ball, hole):
    # Wrong order: up, down, left, right
    for d, (dx, dy) in [('u', (-1, 0)), ('d', (1, 0)), ('l', (0, -1)), ('r', (0, 1))]:
        # This won't guarantee lexicographically smallest result
```

```python
# Correct: Process in lexicographic order
def findShortestWay(maze, ball, hole):
    # Correct order: d, l, r, u (lexicographic)
    for d, (dx, dy) in [('d', (1, 0)), ('l', (0, -1)), ('r', (0, 1)), ('u', (-1, 0))]:
        # Combined with proper heap ordering, ensures correct result
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| The Maze | Medium | Find if ball can reach destination (no hole) |
| The Maze II | Medium | Find shortest distance in maze (no lexicographic requirement) |
| Shortest Path in Grid with Obstacles Elimination | Hard | BFS with K obstacle eliminations |
| Minimum Cost to Make at Least One Valid Path | Hard | Dijkstra with direction change costs |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] After 1 day (spaced repetition)
- [ ] After 3 days (spaced repetition)
- [ ] After 1 week (spaced repetition)
- [ ] Before interview (final review)

**Completion Status**: ⬜ Not Started | 🟨 In Progress | ✅ Mastered

**Strategy**: See [Dijkstra's Algorithm](../strategies/patterns/shortest-path.md)
