---
id: M477
old_id: A345
slug: nth-magical-number
title: Nth Magical Number
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Nth Magical Number

## Problem

Imagine numbers have special properties. In this problem, a positive integer is considered **magical** when it's evenly divisible by at least one of two given values: `a` or `b`.

For example, if a=2 and b=3, the magical numbers in order are: 2, 3, 4, 6, 8, 9, 10, 12, 14, 15, 16, 18... (any number divisible by 2 OR 3).

Given three integers `n`, `a`, and `b`, find the `n`th magical number in ascending order. Since the result can be enormous, **return the answer modulo** `10⁹ + 7`.

**Key insight**: The sequence of magical numbers follows a predictable pattern based on the mathematical relationship between `a` and `b`.

## Why This Matters

This problem models scheduling systems where tasks repeat at different intervals (finding the nth time when at least one of two periodic events occurs), LCD refresh rate calculations in display technology (synchronizing multiple refresh frequencies), and network packet timing analysis. The binary search with inclusion-exclusion principle technique applies to distributed systems synchronization, where you need to find when multiple periodic processes align, job scheduling in operating systems with different time slices, and timing analysis in real-time embedded systems.

## Examples

**Example 1:**
- Input: `n = 1, a = 2, b = 3`
- Output: `2`

**Example 2:**
- Input: `n = 4, a = 2, b = 3`
- Output: `6`

## Constraints

- 1 <= n <= 10⁹
- 2 <= a, b <= 4 * 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use binary search on the answer. For any number x, you can count how many magical numbers ≤ x using inclusion-exclusion principle: count = x//a + x//b - x//lcm(a,b). The nth magical number is the smallest x where this count equals n. Binary search provides an efficient way to find this x.
</details>

<details>
<summary>🎯 Main Approach</summary>
Binary search on the range [min(a,b), n * min(a,b)]. For each candidate x, count magical numbers ≤ x using: count = x//a + x//b - x//lcm(a,b), where lcm(a,b) = a*b/gcd(a,b). If count < n, search right; if count ≥ n, search left. The answer is the smallest x where count(x) ≥ n and x is divisible by either a or b.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Pre-compute lcm = a * b // gcd(a, b) using math.gcd. The binary search runs in O(log(n * min(a,b))) iterations. Each iteration does O(1) work. Total time: O(log(n * max(a,b))). Handle the modulo (10^9 + 7) only at the final result to avoid overflow issues.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Simulation | O(n) | O(1) | Too slow for large n |
| Binary Search | O(log(n * max(a,b))) | O(1) | Optimal approach |

## Common Mistakes

1. **Not using inclusion-exclusion principle**
   ```python
   # Wrong: Double counting multiples of lcm(a,b)
   count = x // a + x // b

   # Correct: Subtract multiples of lcm to avoid double counting
   count = x // a + x // b - x // lcm
   ```

2. **Wrong LCM calculation**
   ```python
   # Wrong: LCM without using GCD
   lcm = a * b  # This might overflow and is incorrect

   # Correct: Use GCD to calculate LCM
   import math
   lcm = a * b // math.gcd(a, b)
   ```

3. **Not ensuring result is magical**
   ```python
   # Wrong: Returning x that isn't divisible by a or b
   return left

   # Correct: Ensure the result is actually magical
   while left % a != 0 and left % b != 0:
       left -= 1
   return left % (10**9 + 7)
   # Or adjust binary search to only consider multiples
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Ugly Number II | Medium | Multiple factors (2, 3, 5) with different approach |
| Kth Smallest in Multiplication Table | Hard | 2D binary search problem |
| K-th Smallest Prime Fraction | Medium | Binary search with counting |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Binary Search](../../strategies/patterns/binary-search.md)
