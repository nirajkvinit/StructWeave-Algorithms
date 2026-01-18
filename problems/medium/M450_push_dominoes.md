---
id: M450
old_id: A305
slug: push-dominoes
title: Push Dominoes
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
---
# Push Dominoes

## Problem

Imagine `n` dominoes standing vertically in a row. At time `t = 0`, some dominoes receive simultaneous pushes either to the **left** or to the **right**. The dominoes then fall according to simple physics rules.

**Physics Rules:**

1. Each second, a falling domino exerts force on its adjacent standing neighbor in the direction it's falling
2. A standing domino that receives **equal opposing forces** from both sides remains **upright** (the forces cancel out)
3. Once a domino starts falling or has fallen in a direction, it no longer changes direction
4. Falling dominoes don't exert force on other already-falling dominoes

**Input Format:**

The string `dominoes` represents the initial state:
- `dominoes[i] = 'L'`: the `ith` domino was pushed **leftward** (falling to the left)
- `dominoes[i] = 'R'`: the `ith` domino was pushed **rightward** (falling to the right)
- `dominoes[i] = '.'`: the `ith` domino is **standing** (received no initial push)

**Your Task:**

Simulate the physics and return a string representing the **final equilibrium state** where all dominoes have settled. Use the same character encoding (`'L'`, `'R'`, or `'.'`) to represent each domino's final state.

**Example Simulation:**

```
Input: ".L.R...LR..L.."

t=0:  . L . R . . . L R . . L . .
      ↑ ← ↑ → ↑ ↑ ↑ ← → ↑ ↑ ← ↑ ↑

t=1:  L L . R R . . L R . L L . .
      ← ← ↑ → → ↑ ↑ ← → ↑ ← ← ↑ ↑
      (leftmost '.' falls L due to 'L', rightmost '.' near 'L' starts falling L)

t=2:  L L . R R R . L R L L L . .
      ← ← ↑ → → → ↑ ← → ← ← ← ↑ ↑
      (forces propagate further)

Final: L L . R R R . L R L L L L .
       ← ← ↑ → → → ↑ ← → ← ← ← ← ↑
       (equilibrium reached—the domino at position 2 stays up due to balanced forces)
```

Key observations:
- The domino at position 2 stays standing because it's equidistant from an 'L' on the left and an 'R' on the right
- The domino at position 6 stays standing because it's surrounded by opposing forces

## Why This Matters

This problem teaches you to model **force propagation** and recognize patterns in **segment-based processing**. Instead of simulating timestep-by-timestep (potentially O(n²)), you can identify distinct segment types (like "R...L" or "L...R") and apply specific rules to each. This pattern appears in physics simulations, cellular automata, game development (collision detection), and even in text processing (bracket matching, syntax parsing). The two-pass force calculation technique you'll learn here generalizes to any problem involving bidirectional influence or pressure.

## Examples

**Example 1:**
- Input: `dominoes = "RR.L"`
- Output: `"RR.L"`
- Explanation: The first domino expends no additional force on the second domino.

## Constraints

- n == dominoes.length
- 1 <= n <= 10⁵
- dominoes[i] is either 'L', 'R', or '.'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Think of each 'R' as emitting a rightward force and each 'L' as emitting a leftward force. The final state of each domino depends on the net force acting on it. A domino equidistant from 'R' on the left and 'L' on the right remains standing due to balanced forces.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use two passes: one left-to-right to calculate rightward forces, and one right-to-left to calculate leftward forces. For each position, track the "distance" to the nearest R or L. Then combine both force arrays: if forces are equal, domino stays up; otherwise, it falls in the direction of the stronger (closer) force.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can solve this in one pass by identifying segments between force points (L/R). Process each segment type: "R...R", "L...L", "R...L", and "L...R" have distinct patterns. This avoids creating separate force arrays and directly builds the result.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Simulation | O(n * t) where t = time steps | O(n) | Too slow, simulates each second |
| Two-Pass Force Calculation | O(n) | O(n) | Calculate left and right forces separately |
| Optimal (Segment Processing) | O(n) | O(n) | One pass, process segments between forces |

## Common Mistakes

1. **Not handling balanced forces correctly**
   ```python
   # Wrong: Not checking for equal opposing forces
   if right_force[i] > 0:
       result[i] = 'R'
   elif left_force[i] > 0:
       result[i] = 'L'

   # Correct: Check for balance
   if right_force[i] == left_force[i]:
       result[i] = '.'
   elif right_force[i] > left_force[i]:
       result[i] = 'R'
   else:
       result[i] = 'L'
   ```

2. **Incorrect force decay calculation**
   ```python
   # Wrong: Not resetting force at new source
   for i in range(n):
       if dominoes[i] == 'R':
           force = 1  # Should reset to n, not 1
       force -= 1

   # Correct: Use distance from source
   force = n  # Reset to large value
   for i in range(n):
       if dominoes[i] == 'R':
           force = n
       elif dominoes[i] == 'L':
           force = 0
       else:
           force = max(force - 1, 0)
       right_force[i] = force
   ```

3. **Not considering segment boundaries**
   ```python
   # Wrong: Processing character by character without context
   for i in range(len(dominoes)):
       if dominoes[i] == '.':
           # Missing context of surrounding R/L

   # Correct: Identify and process segments
   segments = []  # Find R...L, L...R patterns
   for segment_type in segments:
       if segment_type == 'R...L':
           # Handle balanced region in middle
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Falling Dominoes (Circular) | Medium | Array is circular, end connects to start |
| Weighted Dominoes | Hard | Different dominoes have different force strengths |
| 2D Domino Grid | Hard | Dominoes can fall in 4 directions |
| Minimum Pushes to Target | Hard | Find minimum initial pushes for target state |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Two Pointers](../../strategies/patterns/two-pointers.md)
