---
id: E244
old_id: A341
slug: walking-robot-simulation
title: Walking Robot Simulation
difficulty: easy
category: easy
topics: ["array", "simulation", "hash-table"]
patterns: ["simulation", "hash-set"]
estimated_time_minutes: 15
frequency: low
prerequisites: ["array-traversal", "hash-set-basics", "coordinate-systems"]
related_problems: ["E054", "M289", "M885"]
strategy_ref: ../strategies/patterns/simulation.md
---
# Walking Robot Simulation

## Problem

Imagine a robot positioned at the origin `(0, 0)` on an infinite 2D grid, initially facing north (toward positive Y direction). The robot receives a sequence of commands that control its movement and rotation. Your task is to simulate the robot's journey and determine the maximum squared Euclidean distance from the origin that the robot reaches at any point during its execution.

There are three types of commands the robot can receive:
- `-2`: Turn 90 degrees counterclockwise (left turn). For example, if facing north, turn to face west.
- `-1`: Turn 90 degrees clockwise (right turn). For example, if facing north, turn to face east.
- `1 <= k <= 9`: Move forward `k` units in the current direction, one unit at a time.

Here's the important constraint: the grid contains obstacles at specific coordinates given in the `obstacles` array, where each `obstacles[i] = (xi, yi)` marks a blocked position. When the robot attempts to move into an obstacle, it stops at its current position and immediately proceeds to the next command without moving. This means you must check for obstacles at each individual step, not just at the final destination after k steps.

The coordinate system works as follows: North is positive Y, East is positive X, South is negative Y, and West is negative X. Note that an obstacle might exist even at the starting position `(0, 0)`, though the robot can still be there initially.

The squared Euclidean distance is simply `x² + y²`. For instance, if the robot reaches position `(3, 4)`, the squared distance is `3² + 4² = 25`. You return the maximum such value encountered throughout the entire simulation.

## Why This Matters

Simulation problems are fundamental to robotics, game development, and autonomous systems. This problem teaches state management (tracking position and orientation), coordinate transformations (handling different directions), and efficient spatial queries (detecting obstacles). These skills directly apply to pathfinding algorithms used in GPS navigation, robot motion planning in warehouses and factories, game engine physics simulations, and drone flight control systems. The hash set optimization technique you'll learn here is a critical pattern for achieving O(1) lookups in spatial queries, which appears in collision detection, ray tracing, and geographic information systems. Understanding how to validate movement step-by-step (rather than jumping to the destination) is essential for realistic physics simulations and ensuring safe robot navigation in real-world environments.

## Examples

**Example 1:**
- Input: `commands = [4,-1,3], obstacles = []`
- Output: `25`
- Explanation: Starting from (0, 0):
1. Advance northward 4 positions reaching (0, 4)
2. Execute right turn
3. Advance eastward 3 positions reaching (3, 4)
The maximum distance achieved is at (3, 4), with squared distance 3² + 4² = 25.

**Example 2:**
- Input: `commands = [4,-1,4,-2,4], obstacles = [[2,4]]`
- Output: `65`
- Explanation: Starting from (0, 0):
1. Advance northward 4 positions reaching (0, 4)
2. Execute right turn
3. Attempt to advance eastward 4 positions but encounter obstacle at (2, 4), stopping at (1, 4)
4. Execute left turn
5. Advance northward 4 positions reaching (1, 8)
The maximum distance achieved is at (1, 8), with squared distance 1² + 8² = 65.

**Example 3:**
- Input: `commands = [6,-1,-1,6], obstacles = []`
- Output: `36`
- Explanation: Starting from (0, 0):
1. Advance northward 6 positions reaching (0, 6)
2. Execute right turn
3. Execute another right turn (now facing south)
4. Advance southward 6 positions returning to (0, 0)
The maximum distance achieved is at (0, 6), with squared distance 6² = 36.

## Constraints

- 1 <= commands.length <= 10⁴
- commands[i] is either -2, -1, or an integer in the range [1, 9].
- 0 <= obstacles.length <= 10⁴
- -3 * 10⁴ <= xi, yi <= 3 * 10⁴
- The answer is guaranteed to be less than 2³¹.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1 - Conceptual Foundation
Track the robot's position (x, y) and direction. Represent directions as an array of coordinate changes: North (0, 1), East (1, 0), South (0, -1), West (-1, 0). Use an index (0-3) to track current direction. Turning right increments the index, turning left decrements it (with wraparound using modulo 4).

### Hint 2 - Obstacle Handling
Store obstacles in a hash set for O(1) lookup. Convert each obstacle to a string key like "x,y" or use tuple hashing. When moving forward, advance one unit at a time, checking for obstacles before each step. If an obstacle is encountered, stop moving for that command and proceed to the next command.

### Hint 3 - Implementation Strategy
Initialize position (0, 0), direction index 0 (North), and obstacle set. Define direction vectors [(0,1), (1,0), (0,-1), (-1,0)]. For each command: if -2, decrease direction index; if -1, increase direction index; otherwise, move k steps one at a time, checking obstacles. After each move, update maximum squared distance. Return the maximum at the end.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Simulation with Hash Set | O(n + m*k) | O(m) | n commands, m obstacles, k max steps per command |
| Simulation with List Search | O(n*k*m) | O(m) | Linear search in obstacles list - inefficient |
| Grid Marking | O(R*C + n*k) | O(R*C) | Mark grid cells, R*C is grid size - impractical |

## Common Mistakes

### Mistake 1: Moving All Steps at Once
```python
# INCORRECT: Moves k steps without checking obstacles incrementally
def robot_sim(commands, obstacles):
    x, y, d = 0, 0, 0
    directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
    obstacle_set = set(map(tuple, obstacles))

    for cmd in commands:
        if cmd == -2:
            d = (d - 1) % 4
        elif cmd == -1:
            d = (d + 1) % 4
        else:
            dx, dy = directions[d]
            # Wrong: jumps directly k steps
            new_x, new_y = x + dx * cmd, y + dy * cmd
            if (new_x, new_y) not in obstacle_set:
                x, y = new_x, new_y
```
**Why it's wrong:** An obstacle might be in the middle of the path. The robot must check each step individually and stop when hitting an obstacle, not just check the final destination.

**Correct approach:**
```python
# CORRECT: Moves one step at a time, checking obstacles
for cmd in commands:
    if cmd == -2:
        d = (d - 1) % 4
    elif cmd == -1:
        d = (d + 1) % 4
    else:
        dx, dy = directions[d]
        for _ in range(cmd):
            new_x, new_y = x + dx, y + dy
            if (new_x, new_y) not in obstacle_set:
                x, y = new_x, new_y
            else:
                break  # Stop at obstacle
```

### Mistake 2: Using List Instead of Set for Obstacles
```python
# INCORRECT: Linear search in obstacles list
def robot_sim(commands, obstacles):
    # obstacles is a list, not a set
    for _ in range(cmd):
        new_x, new_y = x + dx, y + dy
        if [new_x, new_y] not in obstacles:  # O(m) lookup each time
            x, y = new_x, new_y
```
**Why it's wrong:** Checking if a coordinate is in a list takes O(m) time. With many steps and obstacles, this becomes very slow (O(n*k*m) overall).

**Correct approach:**
```python
# CORRECT: Use set for O(1) lookup
obstacle_set = set(map(tuple, obstacles))
# Now lookup is O(1)
if (new_x, new_y) not in obstacle_set:
    x, y = new_x, new_y
```

### Mistake 3: Incorrect Direction Rotation
```python
# INCORRECT: Wrong direction rotation logic
directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]  # N, E, S, W
d = 0

if cmd == -2:  # Left turn
    d = (d + 1) % 4  # Wrong: should be -1
elif cmd == -1:  # Right turn
    d = (d - 1) % 4  # Wrong: should be +1
```
**Why it's wrong:** The direction array is ordered clockwise (N→E→S→W). Turning right (clockwise) should increment the index, turning left (counterclockwise) should decrement it.

**Correct approach:**
```python
# CORRECT: Proper rotation mapping
directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]  # N, E, S, W (clockwise)
d = 0

if cmd == -2:  # Left turn (counterclockwise)
    d = (d - 1) % 4  # Correct: decrease index
elif cmd == -1:  # Right turn (clockwise)
    d = (d + 1) % 4  # Correct: increase index
```

## Problem Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Robot Bounded in Circle | Medium | Determine if robot returns to origin after instructions |
| Robot Room Cleaner | Hard | Clean entire room with limited vision (DFS/BFS) |
| Spiral Matrix Walk | Medium | Walk grid in spiral pattern |
| Knight Movement Simulation | Medium | Simulate chess knight with different movement rules |
| Multi-Robot Collision Detection | Hard | Multiple robots moving simultaneously |

## Practice Checklist

- [ ] First solve: Implement simulation with proper obstacle checking
- [ ] Optimize: Use hash set for O(1) obstacle lookup
- [ ] Handle edge cases: No commands, all obstacles, starting on obstacle
- [ ] Review after 1 day: Explain direction rotation clearly
- [ ] Review after 1 week: Implement from scratch without hints
- [ ] Interview ready: Discuss optimization and extend to variations

## Strategy

**Pattern**: Simulation with State Management
- Master coordinate system transformations
- Learn efficient obstacle detection with hash sets
- Understand step-by-step movement validation

See [Simulation Pattern](../strategies/patterns/simulation.md) for the complete strategy guide.
