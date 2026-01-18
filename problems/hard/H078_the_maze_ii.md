---
id: H078
old_id: A005
slug: the-maze-ii
title: The Maze II
difficulty: hard
category: hard
topics: []
patterns: ["dp-2d"]
estimated_time_minutes: 45
---
# The Maze II

## Problem

A ball sits inside a `maze` composed of open cells (marked as `0`) and walls (marked as `1`). The ball moves by rolling in one of four cardinal directions: **up, down, left, or right**. Once it begins rolling in a direction, it continues until it collides with a wall. After stopping, the ball can select a new direction to roll.

You receive an `m x n` grid representing the `maze`, along with the ball's `start` coordinates and `destination` coordinates. The `start` is given as `[startrow, startcol]` and the `destination` as `[destinationrow, destinationcol]`. Calculate and return the minimum **distance** required for the ball to reach and stop at the destination. If reaching the destination is impossible, return `-1`.

The **distance** measurement counts the number of **empty cells** the ball traverses, excluding the starting position but including the destination position.

The maze perimeter consists entirely of walls.


**Diagram:**

```
Example 1: Initial state
┌─────────┐
│ 0 0 1 0 0│  S = Start [0,4]
│ 0 0 0 0 0│  D = Destination [4,4]
│ 0 0 0 1 0│
│ 1 1 0 1 1│
│ 0 0 0 0 S│
└─────────┘

Example 2: After rolling
┌─────────┐
│ 0 0 1 0 0│  The ball rolls until
│ 0 0 0 0 0│  it hits a wall, then
│ 0 0 0 1 0│  can choose a new direction
│ 1 1 0 1 1│
│ 0 0 0 0 D│
└─────────┘
```


## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Examples

**Example 1:**
- Input: `maze = [[0,0,0,0,0],[1,1,0,0,1],[0,0,0,0,0],[0,1,0,0,1],[0,1,0,0,0]], start = [4,3], destination = [0,1]`
- Output: `-1`

## Constraints

- m == maze.length
- n == maze[i].length
- 1 <= m, n <= 100
- maze[i][j] is 0 or 1.
- start.length == 2
- destination.length == 2
- 0 <= startrow, destinationrow < m
- 0 <= startcol, destinationcol < n
- Both the ball and the destination exist in an empty space, and they will not be in the same position initially.
- The maze contains **at least 2 empty spaces**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

This is a shortest path problem, but with a twist: you can't stop in the middle of rolling. The "nodes" in your graph are stopping positions (where the ball hits a wall), not every cell. From each stopping position, you can roll in 4 directions until hitting another wall.

Key difference from standard BFS: the edge weight is not always 1 - it's the distance traveled during that roll. This suggests using Dijkstra's algorithm instead of plain BFS.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use Dijkstra's algorithm with modified transitions:
1. Start from the starting position with distance 0
2. Use a min heap to always process the position with minimum distance
3. For each position, try rolling in all 4 directions:
   - Keep rolling until you hit a wall
   - Count the cells traveled
   - The stopping position is the new candidate
4. Update distance if you found a shorter path to that stopping position
5. If you reach the destination, return the distance
6. If heap is empty and destination not reached, return -1

The key modification: when exploring neighbors, simulate the full roll to find the actual stopping position.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Use a visited/distance map to avoid reprocessing positions with worse distances. Unlike standard Dijkstra where you might visit a node multiple times, here you only need to process each stopping position once if you always pick the minimum distance from the heap.

Also, you can terminate early as soon as you pop the destination from the heap - that's guaranteed to be the shortest distance.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS (wrong) | O(m × n) | O(m × n) | Doesn't work - need shortest path, not shortest hops |
| Dijkstra | O(m × n × log(m × n)) | O(m × n) | Each cell processed once, heap operations |
| Optimal | O(m × n × log(m × n)) | O(m × n) | Cannot improve - need to explore graph |

## Common Mistakes

1. **Using BFS instead of Dijkstra**
   ```python
   # Wrong: BFS finds minimum number of rolls, not minimum distance
   from collections import deque
   queue = deque([(start[0], start[1], 0)])
   visited = {(start[0], start[1])}
   while queue:
       x, y, dist = queue.popleft()
       if [x, y] == destination:
           return dist
       for dx, dy in directions:
           # Roll until hitting wall...
           queue.append((nx, ny, dist + 1))  # Wrong: should be dist + roll_distance

   # Correct: Use Dijkstra with actual distances
   import heapq
   heap = [(0, start[0], start[1])]
   distances = {(start[0], start[1]): 0}
   while heap:
       dist, x, y = heapq.heappop(heap)
       if [x, y] == destination:
           return dist
       for dx, dy in directions:
           # Roll and track actual distance traveled
           nx, ny, steps = roll(maze, x, y, dx, dy)
           new_dist = dist + steps
           if (nx, ny) not in distances or new_dist < distances[(nx, ny)]:
               distances[(nx, ny)] = new_dist
               heapq.heappush(heap, (new_dist, nx, ny))
   ```

2. **Stopping at every cell instead of walls**
   ```python
   # Wrong: Treating each cell as a valid stopping point
   for dx, dy in directions:
       nx, ny = x + dx, y + dy
       if 0 <= nx < m and 0 <= ny < n and maze[nx][ny] == 0:
           # Wrong: ball can't stop here unless it's a wall

   # Correct: Roll until hitting a wall
   def roll(maze, x, y, dx, dy):
       steps = 0
       while (0 <= x + dx < len(maze) and
              0 <= y + dy < len(maze[0]) and
              maze[x + dx][y + dy] == 0):
           x += dx
           y += dy
           steps += 1
       return x, y, steps  # Return stopping position and distance
   ```

3. **Not handling unreachable destination**
   ```python
   # Wrong: Not checking if destination was actually reached
   distances = dijkstra(maze, start)
   return distances.get(tuple(destination), -1)  # Wrong if destination not in distances

   # Correct: Return -1 if destination never added to distances
   while heap:
       dist, x, y = heapq.heappop(heap)
       if [x, y] == destination:
           return dist  # Found it
       # ... process neighbors ...
   return -1  # Exited loop without finding destination
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| The Maze (existence only) | Medium | Only check if destination reachable, not shortest |
| The Maze III | Hard | Find lexicographically smallest path |
| Sliding Puzzle | Hard | 2D state space sliding puzzle |
| Swim in Rising Water | Hard | Similar Dijkstra but with different edge weights |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (unreachable, start == destination)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dijkstra's Algorithm](../../strategies/patterns/shortest-path.md)
