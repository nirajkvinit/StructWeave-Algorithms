---
id: E201
old_id: A084
slug: can-place-flowers
title: Can Place Flowers
difficulty: easy
category: easy
topics: ["array", "greedy"]
patterns: ["greedy", "simulation"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E055", "M134", "M135"]
prerequisites: ["array-traversal", "greedy-strategy", "boundary-conditions"]
strategy_ref: ../strategies/patterns/greedy.md
---
# Can Place Flowers

## Problem

Imagine a long flowerbed represented as a sequence of plots, where each plot is either empty (0) or contains a flower (1). There's a gardening rule you must follow: flowers need space, so no two flowers can be planted in adjacent plots - they must have at least one empty plot between them.

You're given an array `flowerbed` representing the current state of the flowerbed, along with an integer `n` indicating how many new flowers you want to plant. Your task is to determine whether it's possible to plant all `n` new flowers while respecting the spacing rule. Return `true` if you can successfully plant all the flowers, `false` otherwise.

The key insight here is recognizing valid planting positions. A plot at index `i` is valid for planting if three conditions are met: the plot itself is empty (flowerbed[i] == 0), the plot to its left is empty or doesn't exist (you're at the start), and the plot to its right is empty or doesn't exist (you're at the end). Pay careful attention to these boundary cases - the first and last positions follow slightly different rules.

This is a greedy problem: whenever you find a valid position, you should plant immediately. There's no benefit to skipping a valid position and planting later, because planting early never reduces future opportunities. If a position is valid now, it's optimal to use it.

## Why This Matters

This problem teaches the greedy algorithmic paradigm, where making the locally optimal choice at each step leads to a globally optimal solution. The pattern appears in resource allocation (placing servers with minimum spacing requirements), task scheduling (events that need buffer time), memory management (allocating blocks with alignment constraints), and layout systems (positioning UI elements with padding rules).

Understanding when greedy algorithms work is crucial for interview success. This problem is particularly valuable because it combines greedy strategy with careful boundary condition handling - a common source of bugs even for experienced programmers. The single-pass O(n) solution demonstrates how simulation can be both simple and efficient when done correctly.

The spacing constraint pattern extends to harder problems like job scheduling with cooldown periods, string manipulation with deletion rules, and game state problems with movement restrictions.

## Examples

**Example 1:**
- Input: `flowerbed = [1,0,0,0,1], n = 1`
- Output: `true`

**Example 2:**
- Input: `flowerbed = [1,0,0,0,1], n = 2`
- Output: `false`

## Constraints

- 1 <= flowerbed.length <= 2 * 10⁴
- flowerbed[i] is 0 or 1.
- There are no two adjacent flowers in flowerbed.
- 0 <= n <= flowerbed.length

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Understanding Planting Conditions
A flower can be planted at position i if:
- The current position is empty (flowerbed[i] == 0)
- The left neighbor is empty or doesn't exist (edge case)
- The right neighbor is empty or doesn't exist (edge case)

How do you check these three conditions together?

### Hint 2: Greedy Strategy
Should you try to plant flowers as soon as possible, or should you plan ahead?
- If a position is valid for planting, is there any benefit to skipping it?
- Does planting early ever prevent you from planting more flowers later?

Consider a greedy approach: plant as soon as you find a valid position.

### Hint 3: Handling Edge Cases
Pay special attention to boundary positions:
- Position 0: What if there's no left neighbor?
- Last position: What if there's no right neighbor?
- Single element array: What conditions must be met?

Can you write conditions that handle these cases without separate logic?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy Single Pass | O(n) | O(1) | Check each position once; optimal |
| Count Gaps | O(n) | O(1) | Calculate capacity of each gap; same efficiency |
| Backtracking | O(2^n) | O(n) | Try all combinations; impractical |

## Common Mistakes

### Mistake 1: Not Checking All Three Conditions
```python
# Wrong: Only checks current position
def canPlaceFlowers(flowerbed, n):
    count = 0
    for i in range(len(flowerbed)):
        if flowerbed[i] == 0:
            flowerbed[i] = 1  # Doesn't check neighbors!
            count += 1
    return count >= n
```
**Why it's wrong:** Violates the adjacency constraint. Must check that neighbors are also empty.

**Correct approach:** Check `flowerbed[i] == 0` AND left neighbor is 0 or doesn't exist AND right neighbor is 0 or doesn't exist.

### Mistake 2: Index Out of Bounds on Boundary Checks
```python
# Wrong: May cause array index error
def canPlaceFlowers(flowerbed, n):
    count = 0
    for i in range(len(flowerbed)):
        if flowerbed[i-1] == 0 and flowerbed[i] == 0 and flowerbed[i+1] == 0:
            # Crashes when i=0 or i=len-1
            flowerbed[i] = 1
            count += 1
```
**Why it's wrong:** Accessing i-1 when i=0 wraps around to last element; accessing i+1 when i=len-1 causes IndexError.

**Correct approach:** Use `(i == 0 or flowerbed[i-1] == 0)` and `(i == len(flowerbed)-1 or flowerbed[i+1] == 0)`.

### Mistake 3: Not Updating Array After Planting
```python
# Wrong: Doesn't mark position as planted
def canPlaceFlowers(flowerbed, n):
    count = 0
    for i in range(len(flowerbed)):
        left = (i == 0 or flowerbed[i-1] == 0)
        right = (i == len(flowerbed)-1 or flowerbed[i+1] == 0)
        if flowerbed[i] == 0 and left and right:
            count += 1
            # Forgot: flowerbed[i] = 1
    return count >= n
```
**Why it's wrong:** Without updating the array, subsequent positions might incorrectly appear valid.

**Correct approach:** Set `flowerbed[i] = 1` immediately after planting to update the state.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Minimum spacing k | No two flowers within k positions | Medium |
| Maximum flowers possible | Return max flowers that can be planted | Easy |
| 2D garden planting | Extend to 2D grid with 4 neighbors | Medium |
| Weighted flowers | Each position has value, maximize total | Medium |
| Circular flowerbed | First and last positions are adjacent | Medium |

## Practice Checklist

Practice this problem until you can confidently complete these tasks:

- [ ] Day 1: Solve with greedy approach (20 min)
- [ ] Day 3: Implement handling all edge cases correctly (15 min)
- [ ] Day 7: Solve without looking at notes (10 min)
- [ ] Day 14: Explain why greedy works for this problem
- [ ] Day 30: Solve a variation (circular flowerbed)

**Strategy**: See [Greedy Algorithms](../strategies/patterns/greedy.md)
