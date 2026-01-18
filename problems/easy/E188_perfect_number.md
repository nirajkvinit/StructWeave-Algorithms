---
id: E188
old_id: A007
slug: perfect-number
title: Perfect Number
difficulty: easy
category: easy
topics: ["math"]
patterns: ["divisor-enumeration", "mathematical-optimization"]
estimated_time_minutes: 15
frequency: low
prerequisites: ["divisibility", "sqrt-optimization", "mathematical-properties"]
related_problems: ["E204", "E231", "M050"]
strategy_ref: ../strategies/fundamentals/mathematical-operations.md
---
# Perfect Number

## Problem

A perfect number is a positive integer that equals the sum of its proper positive divisors (all divisors except the number itself). A divisor of `x` is any integer that divides `x` evenly, leaving no remainder. For example, the divisors of 28 are 1, 2, 4, 7, 14, and 28. The proper divisors (excluding 28 itself) are 1, 2, 4, 7, and 14, which sum to 28, making it a perfect number.

Given an integer `n`, determine whether it's a perfect number by finding all its proper divisors, calculating their sum, and checking if that sum equals `n`. Return `true` if it's perfect, `false` otherwise.

Perfect numbers are quite rare—there are only five known perfect numbers less than 100 million: 6, 28, 496, 8128, and 33,550,336. The naive approach of checking every number from 1 to n-1 works but is unnecessarily slow. A key insight can dramatically reduce the search space: divisors come in pairs. If `d` divides `n`, then `n/d` also divides `n`. This symmetry means you only need to check divisors up to √n, finding both members of each pair simultaneously and avoiding the redundant checks beyond the square root.

## Why This Matters

This problem introduces square root optimization, a fundamental technique for improving algorithms that involve divisor enumeration, factorization, or primality testing. The insight that divisors occur in pairs (d, n/d) is crucial for reducing time complexity from O(n) to O(√n)—a massive improvement for large numbers. This same pattern appears in prime checking, finding all factors, computing greatest common divisors, and cryptographic algorithms.

Beyond the algorithmic technique, perfect numbers have fascinated mathematicians for millennia, appearing in ancient Greek mathematics and connecting to deep number theory concepts (they're related to Mersenne primes). In practical computing, divisor enumeration appears in resource scheduling (finding valid time slot divisions), grid layout calculations (finding dimensions that fit constraints), and mathematical utilities. The problem teaches essential mathematical programming skills: avoiding unnecessary iterations, exploiting mathematical properties for optimization, and handling edge cases like 1 (not perfect, despite seeming to satisfy the definition trivially) and perfect squares (where you must avoid double-counting the square root).

## Examples

**Example 1:**
- Input: `num = 28`
- Output: `true`
- Explanation: 28 = 1 + 2 + 4 + 7 + 14
1, 2, 4, 7, and 14 are all divisors of 28.

**Example 2:**
- Input: `num = 7`
- Output: `false`

## Constraints

- 1 <= num <= 10⁸

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Finding All Divisors Efficiently
Do you need to check every number from 1 to num-1? Think about the relationship between divisors: if `a` divides `num`, what other number must also divide `num`? How can you use this to reduce the search space?

### Hint 2: Square Root Optimization
When checking divisibility, once you exceed a certain threshold, you're finding divisors you've already counted. What is this threshold? How can checking up to √num help you find all divisors?

### Hint 3: Avoiding Double Counting
When using the square root optimization, divisors come in pairs (i, num/i). When does a divisor pair to itself? How should you handle this case to avoid counting it twice?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force | O(n) | O(1) | Check all numbers from 1 to n-1 |
| Square Root Optimization | O(√n) | O(1) | Only check up to √n, pairs found together |
| Hardcoded Known Perfect Numbers | O(1) | O(1) | Only 5 perfect numbers exist under 10⁸ |

## Common Mistakes

### Mistake 1: Including the number itself in sum
```python
# Wrong: Includes num in the divisor sum
def checkPerfectNumber(num):
    divisor_sum = 0
    for i in range(1, num + 1):  # Should be range(1, num)
        if num % i == 0:
            divisor_sum += i
    return divisor_sum == num  # Will never be true
```
**Why it's wrong**: Perfect number definition requires sum of *proper* divisors (excluding the number itself). Including num makes the sum always exceed num.

### Mistake 2: Double counting in sqrt optimization
```python
# Wrong: Counts some divisors twice
def checkPerfectNumber(num):
    if num <= 1:
        return False
    divisor_sum = 0
    for i in range(1, int(num**0.5) + 1):
        if num % i == 0:
            divisor_sum += i
            divisor_sum += num // i  # Double counts when i² = num
    return divisor_sum == num
```
**Why it's wrong**: When i² = num (perfect square), both i and num/i are the same divisor but get added twice. Also, when i=1, we'd add both 1 and num (but num shouldn't be included).

### Mistake 3: Off-by-one in range
```python
# Wrong: Missing the last potential divisor
def checkPerfectNumber(num):
    if num <= 1:
        return False
    divisor_sum = 1
    for i in range(2, int(num**0.5)):  # Should include endpoint
        if num % i == 0:
            divisor_sum += i
            if i != num // i:
                divisor_sum += num // i
    return divisor_sum == num
```
**Why it's wrong**: Using `range(2, int(num**0.5))` excludes the square root itself when it's an integer divisor. Should be `range(2, int(num**0.5) + 1)`.

## Variations

| Variation | Difficulty | Description |
|-----------|----------|-------------|
| Find All Perfect Numbers in Range | Easy | List all perfect numbers up to n |
| Abundant Number | Easy | Sum of divisors > number |
| Deficient Number | Easy | Sum of divisors < number |
| Aliquot Sum | Easy | Calculate sum of proper divisors |
| Amicable Numbers | Medium | Pair of numbers where each is sum of other's divisors |
| Perfect Number Generation | Hard | Generate nth perfect number efficiently |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve with brute force O(n) approach
- [ ] Implement sqrt optimization correctly
- [ ] Handle edge cases (1, 2, perfect squares)

**After 1 Day**
- [ ] Implement without looking at previous solution
- [ ] Can you explain why sqrt optimization works?
- [ ] Avoid double-counting edge case

**After 1 Week**
- [ ] Solve in under 10 minutes
- [ ] Implement the O(1) hardcoded solution (research perfect numbers)
- [ ] Calculate time saved: O(√n) vs O(n) for num = 10⁸

**After 1 Month**
- [ ] Solve abundant/deficient number variation
- [ ] Implement divisor sum as reusable function
- [ ] Apply sqrt optimization to related problems

## Strategy

**Pattern**: Divisor Enumeration with Square Root Optimization
**Key Insight**: Divisors come in pairs (i, n/i). Only iterate up to √n and add both members of each pair.

See [Mathematical Operations](../strategies/fundamentals/mathematical-operations.md) for more on number theory and optimization techniques.
