---
id: M023
old_id: F063
slug: unique-paths-ii
title: Unique Paths II
difficulty: medium
category: medium
topics: ["array", "matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Unique Paths II

## Problem

A robot starts at the top-left corner of an m x n grid and wants to reach the bottom-right corner. The robot can only move either down or right at any point in time. However, some cells in the grid contain obstacles that the robot cannot pass through.

The grid is represented as a 2D array where each cell contains either 0 or 1. A value of 0 means the cell is free and passable, while a value of 1 indicates an obstacle that blocks the path. If the starting position or ending position contains an obstacle, there are zero possible paths.

Your task is to count the total number of unique paths the robot can take from the top-left to the bottom-right, navigating around any obstacles. A path is considered unique based on the sequence of cells visited. Since the robot can only move right or down, each path represents a different combination of moves.

**Diagram:**

Example 1: 3×3 grid with one obstacle

```
Grid (0 = free, 1 = obstacle):
[0, 0, 0]
[0, 1, 0]  ← obstacle at (1,1)
[0, 0, 0]

Start (top-left) → → → Finish (bottom-right)
```

Example 2: 3×3 grid with obstacle at start

```
Grid:
[0, 1, 0]  ← obstacle at (0,1)
[0, 0, 0]
[0, 0, 0]

Paths must navigate around the obstacle.
```


## Why This Matters

This problem extends the fundamental grid path-counting problem by introducing obstacles, making it significantly more practical. In robotics path planning, autonomous vehicles must navigate around static obstacles like buildings, barriers, or restricted zones. Game developers use similar algorithms to calculate AI movement options on tile-based maps where certain tiles are impassable terrain. The key insight is learning how to modify dynamic programming solutions to handle conditional states. When a cell contains an obstacle, its path count becomes zero, which propagates through the DP table and automatically excludes all paths that would have passed through that cell. This problem appears frequently in technical interviews because it tests your ability to adapt a known solution pattern to handle constraints, demonstrating both problem-solving flexibility and understanding of how DP state transitions work.

## Constraints

- m == obstacleGrid.length
- n == obstacleGrid[i].length
- 1 <= m, n <= 100
- obstacleGrid[i][j] is 0 or 1.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?
