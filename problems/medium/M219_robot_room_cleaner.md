---
id: M219
old_id: I288
slug: robot-room-cleaner
title: Robot Room Cleaner
difficulty: medium
category: medium
topics: []
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M220", "M223", "M057"]
prerequisites: ["dfs", "backtracking", "graph-traversal"]
---
# Robot Room Cleaner

## Problem

You control a robot located somewhere inside a room represented as an `m x n` grid, where `0` represents walls (impassable) and `1` represents empty spaces (traversable). The robot starts at an unknown position in an empty cell, initially facing upward.

Here's the critical constraint: you have no map of the room and don't know the robot's starting position or orientation. You can only interact with the robot through a limited API that provides four operations:

```
interface Robot {
  // Move forward one cell if possible
  // Returns true if moved, false if blocked by wall
  boolean move();

  // Rotate 90 degrees counterclockwise (no position change)
  void turnLeft();

  // Rotate 90 degrees clockwise (no position change)
  void turnRight();

  // Clean the current cell
  void clean();
}
```

Your goal is to clean every accessible cell in the room. This is essentially a blind graph traversal problem - you must explore and map the room simultaneously while ensuring every reachable cell gets cleaned exactly once.

The solution requires tracking visited cells using relative coordinates (treating your start position as (0,0)), implementing systematic exploration (DFS or BFS), and crucially, backtracking - after exploring in one direction, the robot must return to its previous position and orientation to explore other directions. The backtracking step (turn 180 degrees, move forward, turn 180 degrees again) is essential for systematic exploration.

Edge cases to consider: rooms can be as large as 100×200 cells, contain complex wall patterns, and all boundaries are guaranteed to be walls (preventing the robot from escaping).

## Why This Matters

This problem models real-world robotics scenarios like autonomous vacuum cleaners (Roomba), warehouse robots, or drones exploring unknown environments. The challenge of navigating and mapping without global positioning appears in SLAM (Simultaneous Localization and Mapping), a core problem in robotics and autonomous vehicles. The backtracking technique you'll implement here is fundamental to depth-first exploration when you need to return to previous states - it appears in maze solving, web crawling, game tree exploration, and any scenario where you systematically explore a state space. This problem also teaches you to work with limited APIs and maintain virtual coordinate systems, skills essential when interfacing with hardware, external services, or abstracted systems where you have restricted access to underlying state.

## Examples

**Example 1:**
- Input: `room = [[1]], row = 0, col = 0`
- Output: `Robot cleaned all rooms.`

## Constraints

- m == room.length
- n == room[i].length
- 1 <= m <= 100
- 1 <= n <= 200
- room[i][j] is either 0 or 1.
- 0 <= row < m
- 0 <= col < n
- room[row][col] == 1
- All the empty cells can be visited from the starting position.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual Understanding</summary>

This is a blind graph traversal problem. Since you don't know the room layout or starting position, you need to explore systematically using DFS or BFS. The key is maintaining virtual coordinates relative to your starting position and tracking which cells you've visited to avoid cleaning the same cell twice.

</details>

<details>
<summary>🎯 Hint 2: Optimal Approach</summary>

Use DFS with backtracking. Treat the starting position as (0, 0) and maintain a set of visited coordinates. For each cell, try all four directions in a consistent order (e.g., up, right, down, left). After exploring each direction, backtrack by turning around (180 degrees) and moving back, then turning to face the next direction.

</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>

1. Create a visited set and direction array [(0,1), (1,0), (0,-1), (-1,0)] for up, right, down, left
2. Implement a DFS function that takes current coordinates and direction
3. Clean current cell and mark as visited
4. For each of 4 directions:
   - Calculate next cell coordinates
   - If not visited and robot can move, recursively clean that cell
   - Backtrack: turn 180 degrees, move back, turn to original direction
   - Turn right to face next direction
5. Start DFS from (0, 0) facing up

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| DFS with Backtracking | O(N - M) | O(N - M) | N = total cells, M = obstacles; visit each accessible cell once |
| BFS Approach | O(N - M) | O(N - M) | Similar complexity but harder to implement with backtracking |
| Random Walk | O(∞) | O(N - M) | May revisit cells indefinitely without visited tracking |

## Common Mistakes

### Mistake 1: Not properly backtracking after exploring
```python
# Wrong: Robot gets lost without returning to previous position
def cleanRoom(robot):
    def dfs(x, y, direction):
        robot.clean()
        visited.add((x, y))
        for i in range(4):
            nx, ny = x + dirs[direction][0], y + dirs[direction][1]
            if (nx, ny) not in visited and robot.move():
                dfs(nx, ny, direction)
                # Missing: backtrack to return here!
            robot.turnRight()
            direction = (direction + 1) % 4
```

```python
# Correct: Properly backtrack after each exploration
def cleanRoom(robot):
    def go_back():
        robot.turnRight()
        robot.turnRight()
        robot.move()
        robot.turnRight()
        robot.turnRight()

    def dfs(x, y, direction):
        robot.clean()
        visited.add((x, y))
        for i in range(4):
            new_dir = (direction + i) % 4
            nx, ny = x + dirs[new_dir][0], y + dirs[new_dir][1]
            if (nx, ny) not in visited and robot.move():
                dfs(nx, ny, new_dir)
                go_back()  # Return to current cell
            robot.turnRight()

    dirs = [(-1, 0), (0, 1), (1, 0), (0, -1)]  # up, right, down, left
    visited = set()
    dfs(0, 0, 0)
```

### Mistake 2: Incorrect coordinate tracking
```python
# Wrong: Not updating direction properly
def cleanRoom(robot):
    def dfs(x, y):
        robot.clean()
        visited.add((x, y))
        # Always using same direction offsets regardless of robot orientation
        for dx, dy in [(-1,0), (0,1), (1,0), (0,-1)]:
            nx, ny = x + dx, y + dy
            if (nx, ny) not in visited and robot.move():
                dfs(nx, ny)
```

```python
# Correct: Track robot direction and adjust coordinates accordingly
def cleanRoom(robot):
    def dfs(x, y, direction):
        robot.clean()
        visited.add((x, y))
        for i in range(4):
            new_dir = (direction + i) % 4
            dx, dy = dirs[new_dir]
            nx, ny = x + dx, y + dy
            if (nx, ny) not in visited and robot.move():
                dfs(nx, ny, new_dir)
                go_back()
            robot.turnRight()

    dirs = [(-1, 0), (0, 1), (1, 0), (0, -1)]
    visited = set()
    dfs(0, 0, 0)
```

### Mistake 3: Moving before checking if cell is visited
```python
# Wrong: Robot moves into visited cells
def cleanRoom(robot):
    def dfs(x, y, direction):
        robot.clean()
        visited.add((x, y))
        for i in range(4):
            if robot.move():  # Moves before checking visited
                new_dir = (direction + i) % 4
                nx, ny = x + dirs[new_dir][0], y + dirs[new_dir][1]
                if (nx, ny) not in visited:
                    dfs(nx, ny, new_dir)
                go_back()
            robot.turnRight()
```

```python
# Correct: Check visited before moving
def cleanRoom(robot):
    def dfs(x, y, direction):
        robot.clean()
        visited.add((x, y))
        for i in range(4):
            new_dir = (direction + i) % 4
            nx, ny = x + dirs[new_dir][0], y + dirs[new_dir][1]
            if (nx, ny) not in visited and robot.move():  # Check first, then move
                dfs(nx, ny, new_dir)
                go_back()
            robot.turnRight()
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| The Maze | Medium | Find if ball can reach destination in maze |
| The Maze II | Medium | Find shortest path for ball in maze |
| The Maze III | Medium | Find lexicographically smallest shortest path |
| Word Search | Medium | DFS with backtracking on 2D grid |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] After 1 day (spaced repetition)
- [ ] After 3 days (spaced repetition)
- [ ] After 1 week (spaced repetition)
- [ ] Before interview (final review)

**Completion Status**: ⬜ Not Started | 🟨 In Progress | ✅ Mastered

**Strategy**: See [Backtracking Pattern](../strategies/patterns/backtracking.md)
