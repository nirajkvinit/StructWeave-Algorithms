---
id: M445
old_id: A296
slug: consecutive-numbers-sum
title: Consecutive Numbers Sum
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Consecutive Numbers Sum

## Problem

Given a positive integer `n`, count how many different ways it can be expressed as the sum of **consecutive positive integers**.

For example, the number 9 can be expressed as:
- `9` (itself, a sequence of length 1)
- `4 + 5` (two consecutive integers)
- `2 + 3 + 4` (three consecutive integers)

That's three different ways, so the answer for `n = 9` would be 3.

Each unique sequence of consecutive positive integers that sums to `n` counts as one way. Note that sequences must use **consecutive** integers (no gaps allowed), and all integers must be **positive** (starting value must be at least 1). The sequence can have any length from 1 up to some maximum determined by the value of `n`.

Your task is to determine how many such valid sequences exist for a given `n`.

## Why This Matters

This problem demonstrates how mathematical insight can replace brute force computation. Instead of testing every possible sequence (which would be too slow), you'll derive a formula based on the arithmetic series sum. This pattern of converting computational problems into mathematical relationships appears throughout algorithm design: in cryptography (modular arithmetic), graphics (geometric transformations), and optimization (closed-form solutions). The problem also teaches you to recognize when iteration bounds can be derived mathematically—here, the maximum sequence length is approximately √(2n), a key insight that makes the solution efficient.

## Examples

**Example 1:**
- Input: `n = 5`
- Output: `2`
- Explanation: 5 = 2 + 3

**Example 2:**
- Input: `n = 9`
- Output: `3`
- Explanation: 9 = 4 + 5 = 2 + 3 + 4

**Example 3:**
- Input: `n = 15`
- Output: `4`
- Explanation: 15 = 8 + 7 = 4 + 5 + 6 = 1 + 2 + 3 + 4 + 5

## Constraints

- 1 <= n <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
For k consecutive numbers starting at x: x + (x+1) + ... + (x+k-1) = k*x + k*(k-1)/2 = n. Rearranging: n = k*x + k*(k-1)/2, so x = (n - k*(k-1)/2) / k. For valid sequence, x must be a positive integer.
</details>

<details>
<summary>🎯 Main Approach</summary>
Iterate through all possible sequence lengths k from 1 to sqrt(2*n). For each k, check if (n - k*(k-1)/2) is divisible by k and results in a positive integer. Count valid k values. The upper bound comes from the constraint that x >= 1, which gives k*(k-1)/2 < n, so k < sqrt(2*n).
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can rewrite the condition as: n must equal k*x + k*(k-1)/2 where x >= 1. This means (2*n - k*(k-1)) must be divisible by 2*k and positive. Alternatively, n - k*(k-1)/2 must be positive and divisible by k. Early termination when k*(k-1)/2 >= n.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n) | O(1) | Try all starting positions and lengths |
| Mathematical | O(√n) | O(1) | Iterate k from 1 to sqrt(2*n) |

## Common Mistakes

1. **Not deriving the mathematical formula**
   ```python
   # Wrong: Trying all possible sequences
   count = 0
   for start in range(1, n):
       current_sum = 0
       for length in range(1, n):
           current_sum += start + length - 1
           if current_sum == n:
               count += 1

   # Correct: Use formula to check validity
   count = 0
   k = 1
   while k * (k - 1) // 2 < n:
       if (n - k * (k - 1) // 2) % k == 0:
           count += 1
       k += 1
   ```

2. **Wrong loop termination condition**
   ```python
   # Wrong: Iterating up to n
   for k in range(1, n + 1):
       # This is too slow

   # Correct: Stop at sqrt(2*n)
   k = 1
   while k * (k - 1) // 2 < n:
       # Check validity
       k += 1
   # Or: for k in range(1, int((2*n)**0.5) + 2)
   ```

3. **Not checking for positive starting value**
   ```python
   # Wrong: Accepting x <= 0
   if (n - k * (k - 1) // 2) % k == 0:
       count += 1

   # Correct: Ensure x is positive
   numerator = n - k * (k - 1) // 2
   if numerator > 0 and numerator % k == 0:
       count += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Consecutive numbers product | Hard | Multiplication instead of sum |
| Even consecutive numbers sum | Medium | Different arithmetic sequence |
| Range sum queries | Medium | Precomputed prefix sums |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Mathematical Formulas](../../strategies/fundamentals/mathematics.md)
