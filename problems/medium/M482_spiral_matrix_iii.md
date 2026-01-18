---
id: M482
old_id: A352
slug: spiral-matrix-iii
title: Spiral Matrix III
difficulty: medium
category: medium
topics: ["array"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Spiral Matrix III

## Problem

Picture yourself programming a drone to survey a rectangular field by flying in an expanding spiral pattern. The field is a grid with dimensions `rows x cols`, and your drone starts at position `(rStart, cStart)` facing east.

Here's the interesting part: you need to follow a perfect clockwise spiral pattern, continuing the spiral even when the drone temporarily flies outside the field boundaries. The drone might leave the grid and come back later, but it must maintain the spiral trajectory at all times.

The spiral pattern works like this: move east, then turn right and move south, turn right and move west, turn right and move north, and repeat. With each complete rotation, the spiral expands outward. Your task is to record the coordinates of every cell within the grid in the exact order your drone first flies over them.

Return the sequence of grid coordinates in the order visited, continuing until all `rows * cols` cells within the field have been covered.

**Diagram:**

Example 1: rows = 1, cols = 4, rStart = 0, cStart = 0
```
Grid:  [0,0] [0,1] [0,2] [0,3]

Spiral path (showing order):
  1 → 2 → 3 → 4

Output: [[0,0],[0,1],[0,2],[0,3]]
```

Example 2: rows = 5, cols = 6, rStart = 1, cStart = 4
```
Grid visualization (numbers show visit order):

      0   1   2   3   4   5
  0 [ - ] [ - ] [ - ] [ - ] [2] [3]
  1 [ - ] [ - ] [ - ] [ - ] [1] [4]
  2 [ - ] [ - ] [ - ] [ - ] [8] [5]
  3 [ - ] [ - ] [ - ] [ - ] [7] [6]
  4 [ - ] [ - ] [ - ] [ - ] [ - ] [ - ]

Spiral pattern: Start at [1,4], move East→South→West→North→East...
Path continues in spiral even outside grid, returning to visit all cells
```


## Why This Matters

Spiral traversal patterns appear frequently in image processing, printer head movements, radar scanning systems, and robotic navigation. Understanding how to generate and follow spiral paths is essential for problems involving systematic grid exploration, such as memory-efficient matrix processing, sensor coverage optimization, or mapping algorithms for autonomous vehicles. This problem teaches you to maintain directional state, handle boundary conditions elegantly, and simulate physical movement patterns in code. The technique of continuing movement patterns beyond boundaries while selectively recording valid positions is particularly valuable in game development, pathfinding algorithms, and any system that needs to systematically cover a 2D space.

## Constraints

- 1 <= rows, cols <= 100
- 0 <= rStart < rows
- 0 <= cStart < cols

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Simulate the spiral movement pattern: East, South, West, North, and repeat. The spiral grows in a specific pattern: move 1 step east, 1 south, 2 west, 2 north, 3 east, 3 south, 4 west, 4 north... Notice the pattern: you increase the step count every two direction changes. Continue until you've collected all rows*cols cells.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use direction vectors for movement: East(0,1), South(1,0), West(0,-1), North(-1,0). Start at (rStart, cStart) and maintain a step counter. For each direction, take 'steps' moves in that direction, checking if each position is within bounds before adding it to the result. Increase steps after every two direction changes (after South and after North). Continue until result has rows*cols entries.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You don't need to track visited cells since you're following a spiral pattern that naturally visits each cell once. Just check bounds (0 <= r < rows and 0 <= c < cols) before adding coordinates. The pattern ensures you won't revisit cells even though you move outside the grid temporarily.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Direct Simulation | O(max(rows, cols)²) | O(rows * cols) | Spiral extends beyond grid |
| Optimal | O(max(rows, cols)²) | O(rows * cols) | Output size; cannot be avoided |

## Common Mistakes

1. **Not following the correct spiral pattern**
   ```python
   # Wrong: Incrementing steps after each direction
   for direction in directions:
       steps += 1
       for _ in range(steps):
           # Move in direction

   # Correct: Increment steps every TWO directions
   steps = 1
   direction_idx = 0
   for _ in range(rows * cols):
       for _ in range(2):  # Two directions per step size
           for _ in range(steps):
               # Move
           direction_idx = (direction_idx + 1) % 4
       steps += 1
   ```

2. **Stopping when going out of bounds**
   ```python
   # Wrong: The spiral must continue outside grid
   if not (0 <= r < rows and 0 <= c < cols):
       break

   # Correct: Continue spiral, but only record valid cells
   if 0 <= r < rows and 0 <= c < cols:
       result.append([r, c])
   # Keep moving regardless
   ```

3. **Incorrect direction order**
   ```python
   # Wrong: Random or incorrect direction sequence
   directions = [(1,0), (0,1), (-1,0), (0,-1)]

   # Correct: East, South, West, North (clockwise spiral)
   directions = [(0,1), (1,0), (0,-1), (-1,0)]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Spiral Matrix | Medium | Extract elements from filled matrix in spiral order |
| Spiral Matrix II | Medium | Fill empty matrix in spiral order |
| Diagonal Traverse | Medium | Zigzag diagonal pattern instead of spiral |
| Matrix Diagonal Sum | Easy | Sum diagonal elements |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Matrix Traversal](../../strategies/patterns/matrix-patterns.md)
