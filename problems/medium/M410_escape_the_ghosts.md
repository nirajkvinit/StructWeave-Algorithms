---
id: M410
old_id: A256
slug: escape-the-ghosts
title: Escape The Ghosts
difficulty: medium
category: medium
topics: []
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Escape The Ghosts

## Problem

You're playing a game on an infinite 2D grid where you start at position `[0, 0]` and need to reach a target position `[xtarget, ytarget]`. Multiple ghosts also exist on this grid, each starting at a position given in the array `ghosts[i] = [xi, yi]`.

Each turn, both you and every ghost can move exactly one unit in any of the four cardinal directions (north, south, east, west) or stay in place. Importantly, all movements happen simultaneously - everyone moves at the same time.

You successfully escape if you reach the target position before any ghost can reach that same position. However, if you and a ghost arrive at the target simultaneously, or if a ghost arrives first, you fail.

Here's the key insight that simplifies this problem dramatically: you don't need to simulate the actual chase or worry about ghosts intercepting you along the path. What matters is only the race to the target position itself. Each entity (you and each ghost) will take the shortest possible path to the target, which is the Manhattan distance.

Manhattan distance between points `(x1, y1)` and `(x2, y2)` is `|x1 - x2| + |y1 - y2|` - the minimum number of moves needed when you can only move in cardinal directions.

Return `true` if you can guarantee reaching the target before all ghosts, `false` otherwise.

## Why This Matters

This problem teaches you to recognize when simulation is unnecessary. Many problems that initially seem to require complex pathfinding or game tree search can be reduced to simple distance calculations once you understand the underlying structure.

The Manhattan distance metric is fundamental in grid-based problems, city planning, logistics, and robotics. Understanding when to use Manhattan distance versus Euclidean distance (straight-line distance) is crucial for modeling real-world constraints.

This problem also demonstrates optimal strategy in adversarial scenarios. The optimal move for a ghost is to head directly toward the target, not to chase you. Recognizing when the optimal adversarial strategy is obvious simplifies many game theory problems.

## Examples

**Example 1:**
- Input: `ghosts = [[1,0],[0,3]], target = [0,1]`
- Output: `true`
- Explanation: You can reach the destination (0, 1) after 1 turn, while the ghosts located at (1, 0) and (0, 3) cannot catch up with you.

**Example 2:**
- Input: `ghosts = [[1,0]], target = [2,0]`
- Output: `false`
- Explanation: You need to reach the destination (2, 0), but the ghost at (1, 0) lies between you and the destination.

**Example 3:**
- Input: `ghosts = [[2,0]], target = [1,0]`
- Output: `false`
- Explanation: The ghost can reach the target at the same time as you.

## Constraints

- 1 <= ghosts.length <= 100
- ghosts[i].length == 2
- -10⁴ <= xi, yi <= 10⁴
- There can be **multiple ghosts** in the same location.
- target.length == 2
- -10⁴ <= xtarget, ytarget <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a Manhattan distance problem, not a pathfinding problem. You don't need to simulate movement. The key realization: if any ghost can reach the target in fewer steps than you (or the same number of steps), it can intercept you. The optimal strategy for a ghost is to head straight to the target - it doesn't need to chase you.
</details>

<details>
<summary>🎯 Main Approach</summary>
Calculate the Manhattan distance from your starting position [0,0] to the target. Then calculate the Manhattan distance from each ghost's position to the target. If any ghost's distance to the target is less than or equal to your distance to the target, you cannot escape. Otherwise, you can escape. Manhattan distance = |x1 - x2| + |y1 - y2|.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can short-circuit the check: as soon as you find one ghost that can reach the target in time, return false immediately. No need to check remaining ghosts. This gives early termination in worst cases where escape is impossible.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Simulation | O(d * g) | O(1) | d = distance to target, g = ghosts; unnecessary |
| Optimal (Manhattan Distance) | O(g) | O(1) | Single pass through ghosts array |

## Common Mistakes

1. **Trying to simulate actual movement**
   ```python
   # Wrong: Simulating step-by-step movement
   def can_escape(ghosts, target):
       pos = [0, 0]
       while pos != target:
           # move towards target
           # check if ghost catches you
           # Very complex and unnecessary

   # Correct: Compare Manhattan distances
   def can_escape(ghosts, target):
       my_dist = abs(target[0]) + abs(target[1])
       for gx, gy in ghosts:
           ghost_dist = abs(target[0] - gx) + abs(target[1] - gy)
           if ghost_dist <= my_dist:
               return False
       return True
   ```

2. **Using Euclidean distance instead of Manhattan distance**
   ```python
   # Wrong: Using Euclidean distance (diagonal movement)
   my_dist = math.sqrt(target[0]**2 + target[1]**2)

   # Correct: Manhattan distance (only cardinal directions)
   my_dist = abs(target[0]) + abs(target[1])
   ```

3. **Checking if ghost is on direct path instead of comparing distances**
   ```python
   # Wrong: Trying to check if ghost blocks your path
   def is_blocked(ghost, target):
       # Complex path checking logic

   # Correct: Just compare distances to target
   ghost_dist = abs(target[0] - gx) + abs(target[1] - gy)
   my_dist = abs(target[0]) + abs(target[1])
   if ghost_dist <= my_dist:
       return False
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Knight Moves | Medium | Different movement rules (L-shaped moves) |
| Reach a Number | Medium | Different movement constraints on number line |
| Race Car | Hard | Variable speed movement with acceleration |
| Escape the Spreading Fire | Hard | Time-varying obstacles spreading across grid |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Mathematical Insights](../../strategies/fundamentals/mathematical-thinking.md)
