---
id: E120
old_id: I125
slug: power-of-three
title: Power of Three
difficulty: easy
category: easy
topics: ["math"]
patterns: ["mathematical"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E122", "E028", "E058"]
prerequisites: ["logarithms", "modular-arithmetic", "bit-manipulation"]
strategy_ref: ../strategies/fundamentals/math-concepts.md
---
# Power of Three

## Problem

Given an integer `n`, determine whether it can be expressed as 3 raised to some integer power. In other words, check if there exists an integer `x` such that `n = 3^x`, where x can be any non-negative integer (0, 1, 2, 3, ...).

For example, 27 is a power of three because 3^3 = 27. Similarly, 1 is a power of three because 3^0 = 1. However, 0 is not a power of three (there's no integer x where 3^x = 0), and negative numbers cannot be powers of three either.

This seemingly simple problem has multiple elegant solutions ranging from iterative division to clever mathematical tricks. The most straightforward approach repeatedly divides by 3, but there's also a fascinating O(1) solution that exploits the fact that 3 is prime and works within the constraints of 32-bit integers.

## Why This Matters

Power checking problems are common in number theory, cryptography, and algorithm optimization. This specific problem teaches multiple problem-solving approaches: iterative methods, logarithms, and mathematical properties. The clever O(1) solution using the maximum power trick is a favorite interview question that tests whether you can think beyond the obvious iterative approach. It appears in systems that need to validate inputs (like checking if a data structure size is valid), in digital signal processing where powers of small primes have special properties, and in hash table sizing where power-of-two or power-of-three sizes offer performance benefits.

## Examples

**Example 1:**
- Input: `n = 27`
- Output: `true`
- Explanation: Since 27 equals 3 raised to the power of 3, the result is true

**Example 2:**
- Input: `n = 0`
- Output: `false`
- Explanation: Zero cannot be expressed as 3 raised to any integer power

**Example 3:**
- Input: `n = -1`
- Output: `false`
- Explanation: Negative one cannot be represented as any power of 3

## Constraints

- The input n falls within the range of a 32-bit signed integer: -2³¹ <= n <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Hint 1: Intuition (Beginner)
The simplest approach is to repeatedly divide n by 3. If n is a power of 3, you should eventually reach 1. If at any point n is not divisible by 3 (remainder exists), or if you reach a number less than 1, then n is not a power of 3. Don't forget to handle negative numbers and zero as special cases.

### Hint 2: Optimization (Intermediate)
Instead of iteration, you can use logarithms. If n = 3^x, then log3(n) = x. Calculate x = log(n)/log(3) and check if 3^x equals n. Be careful with floating-point precision. Alternatively, use the mathematical property: the largest power of 3 that fits in a 32-bit integer is 3^19 = 1162261467. If n is a power of 3, it must divide this number evenly.

### Hint 3: Implementation Details (Advanced)
Four approaches exist: (1) Iterative division by 3 with O(log n) time. (2) Logarithm calculation with precision checking. (3) Maximum power divisibility: check if 1162261467 % n == 0 (after validating n > 0). (4) Recursive division. The maximum power approach is O(1) and elegant but requires understanding that 3 is prime and all its powers divide the maximum power.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Iterative division | O(log n) | O(1) | Divide by 3 repeatedly |
| Logarithm calculation | O(1) | O(1) | Beware of floating-point precision |
| Maximum power trick | O(1) | O(1) | 1162261467 % n == 0, works for primes |
| Recursive division | O(log n) | O(log n) | Call stack overhead |

## Common Mistakes

### Mistake 1: Not Handling Edge Cases
```python
# Wrong: Missing checks for non-positive numbers
def isPowerOfThree(n):
    while n > 1:
        n = n / 3
    return n == 1  # Fails for n <= 0
```
**Fix:** Return false immediately for n <= 0 before any computation.

### Mistake 2: Floating-Point Precision Issues
```python
# Wrong: Direct logarithm comparison with floating-point
def isPowerOfThree(n):
    if n <= 0: return False
    x = math.log(n, 3)
    return x == int(x)  # Precision errors!
```
**Fix:** Use epsilon comparison: abs(x - round(x)) < 1e-10, or verify 3^round(x) == n.

### Mistake 3: Integer Division Error
```python
# Wrong: Using integer division incorrectly
def isPowerOfThree(n):
    while n > 1:
        if n % 3 != 0: return False
        n = n / 3  # Should use // for integer division
    return n == 1
```
**Fix:** Use integer division (n //= 3) to avoid floating-point representation.

## Variations

| Variation | Description | Difficulty | Key Difference |
|-----------|-------------|------------|----------------|
| Power of Two | Check if power of 2 | Easy | Can use bit manipulation: n & (n-1) == 0 |
| Power of Four | Check if power of 4 | Easy | Additional constraint on bit positions |
| Power of K | Check if power of arbitrary k | Easy | Generalize division/log approach |
| Find Exponent | Return the exponent x | Easy | Return the value instead of boolean |

## Practice Checklist

Study Plan:
- [ ] Day 1: Implement iterative division approach, handle edge cases
- [ ] Day 3: Implement logarithm approach, understand precision issues
- [ ] Day 7: Learn maximum power trick, understand why it works
- [ ] Day 14: Solve power of two/four variations, recognize patterns
- [ ] Day 30: Speed solve (< 5 minutes), explain all approaches

Key Mastery Indicators:
- Can implement at least two different approaches
- Handle edge cases (negative, zero, one) correctly
- Understand why maximum power trick works for primes
- Explain trade-offs between different methods

**Strategy**: See [Mathematical Concepts](../strategies/fundamentals/math-concepts.md)
