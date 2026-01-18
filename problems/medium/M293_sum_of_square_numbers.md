---
id: M293
old_id: A100
slug: sum-of-square-numbers
title: Sum of Square Numbers
difficulty: medium
category: medium
topics: ["math", "two-pointers"]
patterns: ["two-pointers"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E001", "E203", "M133"]
prerequisites: ["two-pointers", "number-theory", "perfect-squares"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Sum of Square Numbers

## Problem

Given a non-negative integer `c`, determine whether you can write it as the sum of two perfect squares. That is, can you find integers `a` and `b` (possibly zero) such that `a² + b² = c`?

A perfect square is an integer that equals some integer multiplied by itself: 0, 1, 4, 9, 16, 25, 36, and so on. For example:
- `c = 5` returns true because `1² + 2² = 1 + 4 = 5`
- `c = 3` returns false because no two perfect squares sum to 3
- `c = 4` returns true because `0² + 2² = 0 + 4 = 4` (zero is allowed)
- `c = 2` returns true because `1² + 1² = 1 + 1 = 2` (a and b can be equal)

The challenge is doing this efficiently. A brute force approach checking all pairs would be too slow for large values of `c` (up to 2³¹ - 1). You need to narrow the search space: if `a² + b² = c`, then both `a` and `b` must be at most √c. This bounds your search but you still need a smart strategy to avoid checking all possible pairs.

## Why This Matters

This problem bridges mathematical insight with algorithmic efficiency. It's a classic application of the two-pointer technique to a mathematical domain rather than arrays. The problem connects to number theory (Fermat's theorem on sums of two squares states exactly which numbers can be expressed this way based on prime factorization), but the algorithmic approaches are practical for interviews. You'll encounter similar patterns in problems involving Pythagorean triplets, finding pairs with specific sums or products, or geometric problems involving distances. The key skill is recognizing when a mathematical constraint creates a bounded, searchable space where two pointers can efficiently find solutions.

## Examples

**Example 1:**
- Input: `c = 5`
- Output: `true`
- Explanation: 1² + 2² = 5

**Example 2:**
- Input: `c = 3`
- Output: `false`

**Example 3:**
- Input: `c = 4`
- Output: `true`
- Explanation: 0² + 2² = 4

**Example 4:**
- Input: `c = 2`
- Output: `true`
- Explanation: 1² + 1² = 2

## Constraints

- 0 <= c <= 2³¹ - 1

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Two Pointer Search Space</summary>

The search space is bounded: if `a² + b² = c`, then both `a` and `b` must be at most `√c`. Use two pointers: start with `left = 0` and `right = √c`. At each step, compute `sum = left² + right²`. If sum equals c, return true. If sum is too small, increment left. If sum is too large, decrement right. Continue until pointers meet.

</details>

<details>
<summary>Hint 2: Mathematical Optimization</summary>

For each potential value of `a` from 0 to √c, compute `b² = c - a²` and check if b is a perfect square. You can check if a number is a perfect square by computing its square root and verifying that squaring it gives the original number. This approach is O(√c) time but requires careful handling of floating point precision.

</details>

<details>
<summary>Hint 3: Edge Cases and Integer Overflow</summary>

Handle edge cases: c = 0 should return true (0² + 0² = 0). When computing a² or b², be careful of integer overflow for large values of c. Use `long` data type or check that `a <= √(2³¹ - 1)` before squaring. The two-pointer approach naturally avoids overflow if you compute squares carefully.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Two Pointers | O(√c) | O(1) | Search from 0 to √c with two pointers |
| Perfect Square Check | O(√c) | O(1) | For each a, check if c - a² is perfect square |
| Hash Set | O(√c) | O(√c) | Store all squares up to √c, then check complements |
| Fermat's Theorem | O(√c) | O(1) | Number theory approach using prime factorization |

## Common Mistakes

1. **Integer overflow when squaring**
```python
# Wrong: may overflow for large c
def judgeSquareSum(c):
    left, right = 0, int(c ** 0.5)
    while left <= right:
        sum_val = left * left + right * right  # May overflow
        if sum_val == c:
            return True

# Correct: use comparison to avoid repeated squaring
def judgeSquareSum(c):
    left, right = 0, int(c ** 0.5)
    while left <= right:
        current = left * left + right * right
        if current == c:
            return True
        elif current < c:
            left += 1
        else:
            right -= 1
    return False
```

2. **Floating point precision errors**
```python
# Wrong: floating point comparison
def judgeSquareSum(c):
    for a in range(int(c ** 0.5) + 1):
        b = (c - a * a) ** 0.5
        if b == int(b):  # Floating point comparison unreliable
            return True

# Correct: use integer comparison
def judgeSquareSum(c):
    for a in range(int(c ** 0.5) + 1):
        b_squared = c - a * a
        b = int(b_squared ** 0.5)
        if b * b == b_squared:  # Integer comparison
            return True
    return False
```

3. **Missing edge cases**
```python
# Wrong: doesn't handle c = 0
def judgeSquareSum(c):
    if c < 1:
        return False  # Wrong! 0 = 0² + 0²
    # ... rest of logic

# Correct: handle c = 0
def judgeSquareSum(c):
    if c == 0:
        return True
    left, right = 0, int(c ** 0.5)
    # ... two pointer logic
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Sum of Three Squares | Check if c can be expressed as a² + b² + d² | Medium |
| Sum of Four Squares | Check if c can be expressed as sum of 4 squares (always true by Lagrange) | Easy |
| Count Square Sum Pairs | Count all valid (a, b) pairs where a² + b² = c | Medium |
| K Square Sum | Check if c can be expressed as sum of k perfect squares | Hard |

## Practice Checklist

- [ ] Implement two-pointer solution
- [ ] Implement perfect square check solution
- [ ] Handle edge case: c = 0
- [ ] Handle edge case: c = 1
- [ ] Handle edge case: c = 2³¹ - 1 (large value)
- [ ] Test with perfect squares: c = 4, 9, 16
- [ ] Test with primes: c = 2, 3, 5, 7
- [ ] Verify no integer overflow
- [ ] **Review in 24 hours**: Re-implement from memory
- [ ] **Review in 1 week**: Solve without hints
- [ ] **Review in 2 weeks**: Explain Fermat's theorem approach

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
