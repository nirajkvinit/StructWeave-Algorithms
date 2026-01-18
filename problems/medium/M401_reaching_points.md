---
id: M401
old_id: A247
slug: reaching-points
title: Reaching Points
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Reaching Points

## Problem

Given two coordinate points in 2D space - a starting point `(sx, sy)` and a target point `(tx, ty)` - determine whether you can transform the starting point into the target point using a specific set of operations.

At any point `(x, y)`, you have exactly two transformation choices. You can either:
- Replace it with `(x, x + y)` - adding the y-coordinate to the x-coordinate
- Replace it with `(x + y, y)` - adding the x-coordinate to the y-coordinate

For example, starting at `(1, 1)`, you could move to `(1, 2)` or `(2, 1)`. From `(1, 2)`, you could then reach `(1, 3)` or `(3, 2)`, and so on. Notice that both coordinates always increase or stay the same - you can never move backwards.

The challenge lies in the constraint values: coordinates can be as large as one billion. This makes forward exploration impractical, since you'd face exponential branching at each step. The key insight is that working backwards from the target is much more efficient, as it eliminates branching choices.

Return `true` if a sequence of transformations can convert `(sx, sy)` into `(tx, ty)`, otherwise return `false`.

## Why This Matters

This problem teaches the power of reverse thinking in algorithm design. Many mathematical and computational problems become dramatically simpler when approached backwards rather than forwards. This technique appears in puzzle solving, theorem proving, and state space search.

The problem also reinforces modulo arithmetic optimization, which is essential for handling large numbers efficiently. Similar patterns appear in GCD calculations, number theory problems, and competitive programming scenarios where naive approaches timeout due to scale.

Interviewers use this to assess whether candidates can recognize when brute force won't work and pivot to a more elegant mathematical approach.

## Examples

**Example 1:**
- Input: `sx = 1, sy = 1, tx = 3, ty = 5`
- Output: `true`
- Explanation: One series of moves that transforms the starting point to the target is:
(1, 1) -> (1, 2)
(1, 2) -> (3, 2)
(3, 2) -> (3, 5)

**Example 2:**
- Input: `sx = 1, sy = 1, tx = 2, ty = 2`
- Output: `false`

**Example 3:**
- Input: `sx = 1, sy = 1, tx = 1, ty = 1`
- Output: `true`

## Constraints

- 1 <= sx, sy, tx, ty <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Working backwards from the target to the start is much more efficient than working forwards. At the target (tx, ty), if tx > ty, the previous point must have been (tx - ty, ty) or some multiple. If ty > tx, it must have been (tx, ty - tx). This eliminates one choice at each step.
</details>

<details>
<summary>🎯 Main Approach</summary>
Start from (tx, ty) and work backwards to (sx, sy). At each step, if tx > ty, subtract ty from tx (potentially multiple times using modulo). If ty > tx, subtract tx from ty. Continue until you reach (sx, sy) or determine it's impossible. The key insight is using modulo to handle large differences efficiently instead of subtracting one at a time.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
When tx >> ty (or vice versa), use modulo operation to reduce tx to tx % ty in one step instead of repeatedly subtracting. This handles cases where the values differ by billions efficiently. Also check if (tx - sx) % sy == 0 or (ty - sy) % sx == 0 in the final step to avoid TLE.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Forward BFS/DFS | O(2^(tx+ty)) | O(2^(tx+ty)) | Exponential - will timeout |
| Backward Subtraction | O(max(tx, ty)) | O(1) | Still too slow for large values |
| Optimal Backward Modulo | O(log(max(tx, ty))) | O(1) | Similar to Euclidean GCD algorithm |

## Common Mistakes

1. **Working forward from source**
   ```python
   # Wrong: Exponential branching
   def reachingPoints(sx, sy, tx, ty):
       if sx == tx and sy == ty:
           return True
       if sx > tx or sy > ty:
           return False
       return (reachingPoints(sx + sy, sy, tx, ty) or
               reachingPoints(sx, sy + sx, tx, ty))

   # Correct: Work backwards with modulo
   def reachingPoints(sx, sy, tx, ty):
       while tx >= sx and ty >= sy:
           if tx == sx and ty == sy:
               return True
           if tx > ty:
               if ty > sy:
                   tx %= ty
               else:
                   return (tx - sx) % sy == 0
           else:
               if tx > sx:
                   ty %= tx
               else:
                   return (ty - sy) % sx == 0
       return False
   ```

2. **Forgetting modulo optimization**
   ```python
   # Wrong: Repeated subtraction causes TLE
   while tx > sx and ty > sy:
       if tx > ty:
           tx -= ty  # Too slow when tx >> ty
       else:
           ty -= tx

   # Correct: Use modulo for large differences
   while tx > sx and ty > sy:
       if tx > ty:
           tx %= ty if ty > sy else ty
       else:
           ty %= tx if tx > sx else tx
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Fibonacci-like sequence check | Medium | Similar backward reasoning |
| Water jug problem | Medium | Two-operation state space search |
| GCD calculation | Easy | Same modulo reduction pattern |
| Broken calculator | Medium | Limited operations, backward thinking |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Mathematical Reasoning](../../strategies/patterns/math-patterns.md)
