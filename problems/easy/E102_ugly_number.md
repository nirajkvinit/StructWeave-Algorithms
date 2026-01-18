---
id: E102
old_id: I062
slug: ugly-number
title: Ugly Number
difficulty: easy
category: easy
topics: ["math"]
patterns: ["mathematical"]
estimated_time_minutes: 15
frequency: low
related_problems: ["M264", "M313", "E204"]
prerequisites: ["prime-factorization", "modulo-arithmetic"]
strategy_ref: ../strategies/patterns/mathematical.md
---
# Ugly Number

## Problem

An "ugly number" is a positive integer whose only prime factors are 2, 3, and 5. In other words, an ugly number can be expressed as 2^a × 3^b × 5^c for some non-negative integers a, b, and c. For example, 6 = 2 × 3 is ugly, but 14 = 2 × 7 is not (because it has 7 as a prime factor).

Given an integer n, determine whether it's an ugly number. The key insight is that you don't need to find all prime factors of n. Instead, you can repeatedly divide n by 2, 3, and 5 as many times as possible. If you end up with 1, then n had only these factors and is ugly. If you end up with anything else, n had other prime factors.

Note that by definition, 1 is considered an ugly number (it has no prime factors, so vacuously all its prime factors are in the set {2, 3, 5}). Negative numbers and zero are not ugly numbers since the definition only applies to positive integers.

## Why This Matters

This problem teaches the fundamental technique of prime factorization through division, a concept central to number theory and cryptography. While checking divisibility seems simple, the pattern of "divide out all instances of specific factors" appears in many algorithms, including greatest common divisor (GCD) calculations, simplifying fractions, and analyzing number properties. The problem also demonstrates how to convert a mathematical definition into an algorithmic test. Understanding this pattern prepares you for more complex problems like finding the nth ugly number or generating sequences of numbers with specific factorization properties, which have applications in dynamic programming and algorithm optimization.

## Examples

**Example 1:**
- Input: `n = 6`
- Output: `true`
- Explanation: 6 = 2 × 3

**Example 2:**
- Input: `n = 1`
- Output: `true`
- Explanation: 1 has no prime factors, therefore all of its prime factors are limited to 2, 3, and 5.

**Example 3:**
- Input: `n = 14`
- Output: `false`
- Explanation: 14 is not ugly since it includes the prime factor 7.

## Constraints

- -2³¹ <= n <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Divide Out Valid Factors</summary>

An ugly number can only have prime factors 2, 3, and 5. The approach is to repeatedly divide n by these factors while possible. If after dividing out all 2's, 3's, and 5's you're left with 1, then n was an ugly number. If you're left with anything else, it had other prime factors.

</details>

<details>
<summary>🎯 Hint 2: Handle Edge Cases First</summary>

Before factorization, handle special cases: negative numbers and zero cannot be ugly (ugly numbers are defined as positive). Also, 1 is considered ugly by definition (it has no prime factors, so vacuously all its factors are 2, 3, or 5).

</details>

<details>
<summary>📝 Hint 3: Iterative Division</summary>

Pseudocode approach:
1. If n <= 0: return false
2. For each factor in [2, 3, 5]:
   - While n % factor == 0:
     - n = n / factor
3. Return n == 1

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Prime Factorization | O(n) | O(1) | Check all primes up to n |
| **Optimal (Divide by 2,3,5)** | **O(log n)** | **O(1)** | Each division cuts n by factor |
| Recursive | O(log n) | O(log n) | Call stack for each division |

## Common Mistakes

### Mistake 1: Not Handling Non-Positive Numbers

```python
# WRONG: Missing edge case for n <= 0
def isUgly(n):
    for factor in [2, 3, 5]:
        while n % factor == 0:  # Bug: modulo by zero if n=0, negative numbers pass
            n //= factor
    return n == 1
```

```python
# CORRECT: Handle edge cases first
def isUgly(n):
    if n <= 0:
        return False  # Ugly numbers are positive only
    for factor in [2, 3, 5]:
        while n % factor == 0:
            n //= factor
    return n == 1
```

### Mistake 2: Forgetting n = 1 Special Case

```python
# WRONG: Treating 1 incorrectly
def isUgly(n):
    if n <= 0:
        return False
    if n == 1:
        return False  # Bug: 1 should return True
    for factor in [2, 3, 5]:
        while n % factor == 0:
            n //= factor
    return n == 1
```

```python
# CORRECT: 1 is handled naturally by the algorithm
def isUgly(n):
    if n <= 0:
        return False
    # No special case needed: if n=1, loop doesn't execute, returns 1==1 ✓
    for factor in [2, 3, 5]:
        while n % factor == 0:
            n //= factor
    return n == 1
```

### Mistake 3: Inefficient Prime Factorization

```python
# WRONG: Checking all potential factors
def isUgly(n):
    if n <= 0:
        return False
    # Inefficient: checking factors 2 through n-1
    for i in range(2, n):
        if n % i == 0 and i not in [2, 3, 5]:
            return False  # O(n) time complexity
    return True
```

```python
# CORRECT: Only divide by 2, 3, 5 and check remainder
def isUgly(n):
    if n <= 0:
        return False
    for factor in [2, 3, 5]:
        while n % factor == 0:
            n //= factor  # O(log n) divisions
    return n == 1  # If only 2,3,5 factors, n reduces to 1
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Ugly Number II | Medium | Find the nth ugly number |
| Super Ugly Number | Medium | Generalize to arbitrary set of prime factors |
| Perfect Number | Easy | Check if sum of divisors equals number |
| Happy Number | Easy | Keep transforming until reaching 1 or cycle |

## Practice Checklist

- [ ] Day 1: Solve with iterative division (10 min)
- [ ] Day 2: Handle all edge cases (10 min)
- [ ] Day 7: Solve again, explain why it works (10 min)
- [ ] Day 14: Code from memory (5 min)
- [ ] Day 30: Solve Ugly Number II (medium variant) (20 min)

**Strategy**: See [Mathematical Pattern](../strategies/patterns/mathematical.md)
