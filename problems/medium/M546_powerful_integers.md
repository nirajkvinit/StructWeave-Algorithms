---
id: M546
old_id: A437
slug: powerful-integers
title: Powerful Integers
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Powerful Integers

## Problem

Imagine you have two magic multiplier numbers `x` and `y`. You can raise `x` to any non-negative power (like x⁰, x¹, x², x³...) and `y` to any non-negative power (like y⁰, y¹, y², y³...), then add them together. The results are called "powerful integers."

For example, with `x = 2` and `y = 3`:
- 2⁰ + 3⁰ = 1 + 1 = 2 (powerful!)
- 2¹ + 3⁰ = 2 + 1 = 3 (powerful!)
- 2² + 3¹ = 4 + 3 = 7 (powerful!)

Given three integers `x`, `y`, and `bound`, find all powerful integers (sums of the form x^i + y^j where i, j ≥ 0) that don't exceed `bound`.

Return these special numbers as a list. The order doesn't matter, and each value should appear only once.

## Why This Matters

This problem teaches the fundamentals of exponential growth and efficient enumeration, which appear throughout computer science. In cryptographic systems, powers of numbers modulo a prime are fundamental to algorithms like RSA and Diffie-Hellman key exchange. Hash table implementations often use powers of 2 for bucket sizing to enable fast bitwise operations. Database query optimizers use similar power-based calculations when estimating the cost of index lookups versus table scans. In scientific computing, identifying sums of powers appears in numerical analysis when approximating functions using Taylor series or when solving Diophantine equations. The duplicate elimination technique using sets is essential for recommendation systems, search result deduplication, and data warehousing ETL pipelines.

## Examples

**Example 1:**
- Input: `x = 2, y = 3, bound = 10`
- Output: `[2,3,4,5,7,9,10]`
- Explanation: 2 = 2⁰ + 3⁰
3 = 2¹ + 3⁰
4 = 2⁰ + 3¹
5 = 2¹ + 3¹
7 = 2² + 3¹
9 = 2³ + 3⁰
10 = 2⁰ + 3²

**Example 2:**
- Input: `x = 3, y = 5, bound = 15`
- Output: `[2,4,6,8,10,14]`

## Constraints

- 1 <= x, y <= 100
- 0 <= bound <= 10⁶

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
The key is recognizing that powers grow exponentially, so there's a finite number of power combinations to check. Once x^i or y^j exceeds bound, no larger powers need to be considered. Special case: when x=1 or y=1, the powers don't grow, so only check i=0 or j=0.
</details>

<details>
<summary>Main Approach</summary>
Use nested loops to generate all combinations of x^i + y^j. For the outer loop, iterate i while x^i < bound. For the inner loop, iterate j while x^i + y^j <= bound. Store results in a set to automatically handle duplicates. Handle edge cases where x or y equals 1 by only using the 0th power for those bases.
</details>

<details>
<summary>Optimization Tip</summary>
Use a set to avoid duplicate checking. For bases equal to 1, break after the first iteration since all higher powers equal 1. You can also optimize by calculating the upper bound for exponents: log(bound)/log(base), though simple iteration until exceeding bound is clearer and equally efficient given the constraints.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force with Set | O(log x(bound) * log y(bound)) | O(log x(bound) * log y(bound)) | Number of unique power combinations is limited by logarithmic growth |
| Optimal | O(log²(bound)) | O(log²(bound)) | Same as above; this is optimal as we must generate all valid combinations |

## Common Mistakes

1. **Not handling x=1 or y=1 edge cases**
   ```python
   # Wrong: Infinite loop when x=1
   i = 0
   while x**i <= bound:
       # x**i is always 1, never exceeds bound
       i += 1

   # Correct: Handle base=1 specially
   x_powers = [1] if x == 1 else []
   power = 1
   while power <= bound:
       x_powers.append(power)
       power *= x
   ```

2. **Forgetting to use a set for duplicates**
   ```python
   # Wrong: May have duplicate sums
   result = []
   for i in range(max_i):
       for j in range(max_j):
           result.append(x**i + y**j)

   # Correct: Use set to eliminate duplicates
   result = set()
   for i in range(max_i):
       for j in range(max_j):
           result.add(x**i + y**j)
   return list(result)
   ```

3. **Not checking bounds during addition**
   ```python
   # Wrong: Adding values that exceed bound
   if x**i <= bound and y**j <= bound:
       result.add(x**i + y**j)

   # Correct: Check the sum itself
   value = x**i + y**j
   if value <= bound:
       result.add(value)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Power of Three | Easy | Check if single number is power of 3 |
| Sum of Powers of 3 | Medium | Express number as sum of unique powers of 3 |
| Perfect Squares | Easy | Find all perfect squares up to bound |
| Sum of Square Numbers | Medium | Express as sum of two squares |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (x=1, y=1, bound=0)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days
