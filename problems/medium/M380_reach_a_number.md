---
id: M380
old_id: A221
slug: reach-a-number
title: Reach a Number
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Reach a Number

## Problem

You're standing at position `0` on an infinite number line. Your goal is to reach a target position using a sequence of moves with an interesting constraint: the distance you move grows with each step.

**Movement rules**:
- On your 1st move, you travel exactly 1 unit (left or right)
- On your 2nd move, you travel exactly 2 units (left or right)
- On your 3rd move, you travel exactly 3 units (left or right)
- On your `i`-th move, you travel exactly `i` units in your chosen direction

Each move is independent: you choose the direction (left or right), but the distance is predetermined by the move number. For example, to reach position 3, you could go right 1 unit (now at +1), then right 2 units (now at +3), taking 2 moves total.

Find the minimum number of moves required to reach exactly the target position.

Here's the key mathematical insight: if you make `n` moves all to the right, you'd reach position `1+2+3+...+n = n(n+1)/2`. To reach different positions, you need to flip some moves to go left instead of right. Flipping move `i` from right to left changes your final position by `-2i` (you lose `+i` and gain `-i`). The question becomes: what's the smallest `n` such that you can select which moves to flip and land exactly on target?

Important observation: by symmetry, reaching position `-target` takes the same number of moves as reaching `+target`, so you can work with `abs(target)` and simplify your solution.

The mathematical relationship: if `sum = n(n+1)/2 >= target` and `(sum - target)` is even, you can reach the target in `n` moves. Why even? Because you need to flip moves totaling exactly `(sum - target)/2`, and flipping requires selecting a subset of moves.

## Why This Matters

This problem teaches mathematical reasoning and problem reduction, showing how complex-seeming problems can be solved with number theory rather than search algorithms. The insight that "flipping a move changes position by -2i" transforms an exponential search space (2^n directional choices) into a simple arithmetic problem solvable in O(sqrt(target)) time. This pattern of converting search problems to mathematical formulas appears in optimization theory, game theory (analyzing move sequences), and algorithm design (recognizing when greedy/mathematical approaches beat search). Understanding how parity constraints limit your options is valuable for problems involving odd/even properties, binary representations, and modular arithmetic. Many interview problems that appear to require BFS or DFS actually have elegant mathematical solutions once you identify the right invariant or formula.

## Examples

**Example 1:**
- Input: `target = 2`
- Output: `3`
- Explanation: First move takes us from position 0 to position 1 (moving 1 unit right).
Second move takes us from position 1 to position -1 (moving 2 units left).
Third move takes us from position -1 to position 2 (moving 3 units right).

**Example 2:**
- Input: `target = 3`
- Output: `2`
- Explanation: First move takes us from position 0 to position 1 (moving 1 unit right).
Second move takes us from position 1 to position 3 (moving 2 units right).

## Constraints

- -10⁹ <= target <= 10⁹
- target != 0

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Instead of tracking direction choices, observe that if we take n steps all to the right, we reach sum = 1+2+...+n = n(n+1)/2. By flipping some steps to negative, we can reach different positions. The key insight: flipping step i changes our position by -2i. We need sum - target = 2 * (some subset of steps).
</details>

<details>
<summary>Main Approach</summary>
Take steps moving right until sum >= target. If (sum - target) is even, we can flip exactly those steps to reach target in n moves. If (sum - target) is odd, continue taking steps until the difference becomes even. This works because adding step (n+1) changes parity of the difference.
</details>

<details>
<summary>Optimization Tip</summary>
Handle negative targets by symmetry - just use abs(target). Also, when sum exceeds target with odd difference, you only need at most 2 more steps to make it even (since consecutive integers have opposite parity). This gives O(sqrt(target)) time complexity.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS/DFS | O(2^n) | O(2^n) | Explores all sign combinations, infeasible |
| Mathematical | O(sqrt(target)) | O(1) | Find n where n(n+1)/2 >= target |

## Common Mistakes

1. **Not handling negative targets**
   ```python
   # Wrong: Different logic for negative targets
   if target < 0:
       # complex handling

   # Correct: Use symmetry
   target = abs(target)  # same solution by symmetry
   ```

2. **Incorrect parity check**
   ```python
   # Wrong: Check if sum equals target
   if sum == target:
       return n

   # Correct: Check if difference is even
   if (sum - target) % 2 == 0:
       return n
   ```

3. **Infinite loop when difference stays odd**
   ```python
   # Wrong: May loop forever
   while sum < target:
       n += 1
       sum += n

   # Correct: Continue until difference is even
   while (sum - target) % 2 != 0:
       n += 1
       sum += n
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Moves to Reach Target | Medium | 2D grid movement instead of 1D line |
| Broken Calculator | Medium | Limited operations (multiply/subtract) |
| Nth Magical Number | Hard | Multiple step sizes with LCM |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Mathematical Thinking](../../strategies/fundamentals/math.md)
