---
id: E227
old_id: A202
slug: asteroid-collision
title: Asteroid Collision
difficulty: easy
category: easy
topics: ["array", "stack"]
patterns: ["stack-simulation"]
estimated_time_minutes: 15
frequency: high
prerequisites: ["stack", "simulation"]
related_problems: ["E020", "E155", "M150"]
strategy_ref: ../prerequisites/stack.md
---
# Asteroid Collision

## Problem

You're given an array of integers representing asteroids arranged in a line, where each asteroid moves at the same speed. The value of each integer tells you two things: its absolute value represents the asteroid's size (mass), and its sign indicates the direction it's traveling (positive means moving right, negative means moving left).

When two asteroids collide, the smaller one explodes and disappears. If both asteroids are the same size, both explode. However, asteroids only collide if they're moving toward each other. Two asteroids moving in the same direction will never meet, and a left-moving asteroid behind a right-moving one will never catch up.

Your task is to determine which asteroids remain after all collisions have occurred. Note that the order of asteroids in your answer matters. Important edge case: asteroids can trigger chain reactions where one collision leads to another, and then another, until no more collisions are possible.

For example, if you have asteroids `[10, 2, -5]`, the -5 (moving left) first collides with 2 (moving right), destroying the 2. Then -5 continues and collides with 10, which destroys the -5, leaving only `[10]`.

## Why This Matters

This problem teaches stack-based simulation, a pattern that appears frequently in problems involving sequential processing with potential backtracking. Stacks are used in expression evaluation, syntax parsing, undo operations in editors, browser history management, and function call management in programming languages.

The collision mechanics mirror real-world scenarios like packet collision detection in networks, event processing where later events can cancel earlier ones, and financial systems where transactions can reverse or modify previous transactions. Understanding when and how to use a stack versus an array is a fundamental algorithmic skill.

This is a high-frequency interview problem because it tests your ability to handle stateful iteration, recognize when removing previous elements is necessary, and manage edge cases in sequential processing. The pattern of "process forward while potentially looking backward" appears in many interview and production scenarios.

## Examples

**Example 1:**
- Input: `asteroids = [5,10,-5]`
- Output: `[5,10]`
- Explanation: The asteroid with mass 10 collides with and destroys the asteroid with mass 5 (traveling left). The two rightward-moving asteroids never meet.

**Example 2:**
- Input: `asteroids = [8,-8]`
- Output: `[]`
- Explanation: Both asteroids have equal mass and destroy each other upon collision.

**Example 3:**
- Input: `asteroids = [10,2,-5]`
- Output: `[10]`
- Explanation: First, asteroids with mass 2 and 5 collide, leaving only the one with mass 5 traveling left. Then this collides with the mass 10 asteroid, which survives.

## Constraints

- 2 <= asteroids.length <= 10⁴
- -1000 <= asteroids[i] <= 1000
- asteroids[i] != 0

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Understanding Collisions
Start by identifying when collisions happen. Two asteroids only collide if one is moving right and the other is moving left, AND the right-moving one comes before the left-moving one. What data structure helps you keep track of asteroids you've seen so far while processing new ones?

### Tier 2: Simulation Strategy
Think about processing asteroids one by one from left to right. When you encounter a left-moving asteroid (negative), it might collide with previous right-moving asteroids (positive). How would you handle multiple successive collisions? What structure naturally supports adding and removing from one end?

### Tier 3: Collision Resolution
When a collision occurs, compare absolute values to determine the outcome. After destroying one or both asteroids, the surviving left-moving asteroid might collide with the previous asteroid in your data structure. How do you continue checking for collisions until no more are possible? When do you stop checking and add the current asteroid?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Array) | O(n²) | O(n) | Each asteroid may trigger checking all previous ones |
| Stack (Optimal) | O(n) | O(n) | Each asteroid pushed/popped at most once |
| Two Pointers | O(n²) | O(n) | Requires multiple passes to handle chain collisions |

Where n = number of asteroids

## Common Mistakes

### Mistake 1: Not Handling Chain Collisions
```python
# Wrong: Only checks one collision, misses chain reactions
def asteroidCollision(asteroids):
    stack = []
    for ast in asteroids:
        if ast > 0:
            stack.append(ast)
        elif stack and stack[-1] > 0:  # Only checks once
            if abs(ast) > stack[-1]:
                stack.pop()
                stack.append(ast)
            elif abs(ast) < stack[-1]:
                pass  # current destroyed
            else:
                stack.pop()  # both destroyed
    return stack

# Correct: Continue colliding while possible
while stack and stack[-1] > 0 and ast < 0:
    if abs(ast) > stack[-1]:
        stack.pop()
        continue
    # ... handle other cases
```

### Mistake 2: Forgetting Same-Direction Asteroids
```python
# Wrong: Doesn't handle left-moving asteroids when no collision possible
def asteroidCollision(asteroids):
    stack = []
    for ast in asteroids:
        if ast > 0:
            stack.append(ast)
        # Missing: what if ast < 0 and stack is empty or stack[-1] < 0?
    return stack

# Correct: Add left-moving asteroids when no collision
if not stack or stack[-1] < 0:
    stack.append(ast)
```

### Mistake 3: Incorrect Collision Logic
```python
# Wrong: Compares values instead of absolute values
if ast < stack[-1]:  # Should use abs(ast) > stack[-1]
    stack.pop()

# Correct: Compare magnitudes
if abs(ast) > stack[-1]:
    stack.pop()
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Asteroid Collision II | Medium | Asteroids can move at different speeds. Track time of collisions. |
| 3D Asteroid Field | Hard | Asteroids move in 3D space with vector velocities. Detect all collisions. |
| Weighted Collisions | Medium | Collision outcome depends on mass AND velocity (momentum = mass × velocity). |
| Elastic Collisions | Hard | Asteroids bounce off each other instead of being destroyed. |
| Collision Count | Easy | Return number of collisions instead of final state. |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Solved with stack-based simulation
- [ ] Handled edge case: all asteroids moving same direction
- [ ] Handled edge case: alternating directions
- [ ] Handled edge case: chain collisions (3+ asteroids)
- [ ] Handled edge case: equal mass collisions
- [ ] Tested with single asteroid
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Can explain approach to someone else

**Strategy**: See [Stack Patterns](../prerequisites/stack.md)
