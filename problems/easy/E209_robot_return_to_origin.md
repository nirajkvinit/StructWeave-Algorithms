---
id: E209
old_id: A124
slug: robot-return-to-origin
title: Robot Return to Origin
difficulty: easy
category: easy
topics: ["string", "simulation", "math"]
patterns: ["counting", "simulation"]
estimated_time_minutes: 15
frequency: low
prerequisites: ["string-traversal", "coordinate-geometry"]
related_problems: ["E657", "M489", "M874"]
strategy_ref: ../strategies/fundamentals/problem-solving.md
---
# Robot Return to Origin

## Problem

Imagine a robot sitting at coordinates (0, 0) on a 2D grid, like a character on a chessboard. The robot receives a string of movement commands, where each character tells it to move one unit in a specific direction. The four possible moves are: 'U' (up, increasing y-coordinate), 'D' (down, decreasing y-coordinate), 'L' (left, decreasing x-coordinate), and 'R' (right, increasing x-coordinate).

Your task is to determine whether the robot ends up back at (0, 0) after executing all the moves in sequence. For example, if the robot moves up then down ("UD"), it returns to origin. But if it moves left twice ("LL"), it ends up at (-2, 0), which is not the origin.

Each move has the same magnitude (one unit), and the robot doesn't rotate or change orientation - 'U' always means the same direction regardless of where the robot is or which way it's facing. The challenge is to track its position through all movements and verify if it completes a round trip.

Return true if the robot returns to the origin, otherwise return false.

## Why This Matters

This problem appears in robotics simulation, game development (tracking character movement), and GPS navigation systems where you need to determine if a path forms a closed loop. It's a common interview question because it tests your ability to model state changes and recognize when multiple approaches exist (coordinate tracking vs. counting). In production code, similar logic appears when validating user input commands, checking if a series of database transactions net to zero, or verifying that paired operations (like lock/unlock or push/pop) are balanced. The problem teaches you to think about symmetry and cancellation - concepts that extend to signal processing, vector mathematics, and state machine design. It's also an excellent introduction to simulation problems where you model real-world behavior in code.

## Examples

**Example 1:**
- Input: `moves = "UD"`
- Output: `true
**Explanation**: The robot moves up once, and then down once. All moves have the same magnitude, so it ended up at the origin where it started. Therefore, we return true.`

**Example 2:**
- Input: `moves = "LL"`
- Output: `false
**Explanation**: The robot moves left twice. It ends up two "moves" to the left of the origin. We return false because it is not at the origin at the end of its moves.`

## Constraints

- 1 <= moves.length <= 2 * 10⁴
- moves only contains the characters 'U', 'D', 'L' and 'R'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Simulation with Coordinates
Maintain two variables representing the robot's x and y coordinates, both starting at 0. Iterate through each character in the moves string: increment y for 'U', decrement y for 'D', increment x for 'R', decrement x for 'L'. After processing all moves, check if both coordinates are 0.

### Hint 2: Counting Approach
Think about what it means to return to origin: every upward movement must be canceled by a downward movement, and every rightward movement must be canceled by a leftward movement. Count occurrences of each direction and check if count('U') equals count('D') and count('R') equals count('L'). This avoids tracking coordinates.

### Hint 3: Mathematical Balance
The robot returns to origin if and only if the net displacement in both dimensions is zero. Instead of counting all four directions separately, you can maintain just two counters: vertical balance (U increases, D decreases) and horizontal balance (R increases, L decreases). Return true if both balances are zero.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Coordinate Simulation | O(n) | O(1) | Track x,y positions |
| Count All Directions | O(n) | O(1) | Count each of 4 directions |
| Balance Tracking | O(n) | O(1) | Track net vertical/horizontal movement |
| Hash Map Counting | O(n) | O(1) | Overkill but works, fixed alphabet size |

## Common Mistakes

### Mistake 1: Using wrong coordinate system
```
// Wrong: Confusing x/y axes or increment/decrement direction
switch (move) {
    case 'U': x++; break;  // Should be y++
    case 'R': y++; break;  // Should be x++
}
```
**Why it's wrong**: Mixing up horizontal (x) and vertical (y) movements leads to incorrect position tracking.

**Correct approach**: U/D affect y-axis (vertical), R/L affect x-axis (horizontal). Be consistent with coordinate system.

### Mistake 2: Incorrect counting comparison
```
// Wrong: Not comparing counts correctly
int up = 0, down = 0, left = 0, right = 0;
// ... count movements ...
return up == down || left == right;  // Should be AND not OR
```
**Why it's wrong**: Both conditions must be true simultaneously. Using OR means the robot could be at origin if only one dimension is balanced.

**Correct approach**: Use AND to ensure both horizontal and vertical positions are at origin.

### Mistake 3: Off-by-one in string iteration
```
// Wrong: Missing last character or starting from wrong index
for (int i = 0; i < moves.length() - 1; i++) {  // Missing last char!
    // process move
}
```
**Why it's wrong**: The loop should process all characters from index 0 to length-1 inclusive.

**Correct approach**: Use `i < moves.length()` or iterate through all characters properly.

## Variations

| Variation | Difference | Difficulty Increase |
|-----------|------------|---------------------|
| Distance from origin | Return final distance instead of boolean | None (simple calculation) |
| Multiple robots | Track multiple robots simultaneously | Medium (multiple coordinates) |
| Robot with obstacles | Grid has obstacles that block movement | Medium (collision detection) |
| Minimum moves to return | Find shortest path back to origin | Medium (pathfinding) |
| 3D robot movement | Add U/D for z-axis movement | None (one more dimension) |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solve using coordinate tracking
- [ ] Optimize to counting approach
- [ ] Implement balance tracking method
- [ ] Handle edge cases (single move, empty string)
- [ ] Implement without bugs on first try
- [ ] Explain why counting is sufficient
- [ ] Test with "UDLR", "UD", "LL"
- [ ] Solve in under 10 minutes
- [ ] Explain all three approaches
- [ ] Revisit after 3 days (spaced repetition)
- [ ] Revisit after 1 week (spaced repetition)
- [ ] Extend to return final coordinates

**Strategy**: See [Problem Solving Fundamentals](../strategies/fundamentals/problem-solving.md)
