---
id: E189
old_id: A009
slug: fibonacci-number
title: Fibonacci Number
difficulty: easy
category: easy
topics: ["math", "dynamic-programming", "recursion"]
patterns: ["fibonacci", "memoization", "space-optimization"]
estimated_time_minutes: 15
frequency: high
prerequisites: ["recursion", "dynamic-programming-basics", "space-optimization"]
related_problems: ["E070", "E509", "M198"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Fibonacci Number

## Problem

The Fibonacci sequence is one of the most famous number sequences in mathematics, where each number equals the sum of the two preceding numbers. The sequence starts with F(0) = 0 and F(1) = 1, and continues: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, and so on. Formally defined: F(n) = F(n-1) + F(n-2) for n > 1.

Given a non-negative integer `n`, compute and return the nth Fibonacci number, `F(n)`. For example, F(2) = 1 (since 0 + 1 = 1), F(3) = 2 (since 1 + 1 = 2), and F(10) = 55.

The straightforward recursive solution mirrors the mathematical definition beautifully but has a critical flaw: it recalculates the same values exponentially many times. For instance, computing F(5) requires computing F(4) and F(3), but F(4) also needs F(3), so F(3) gets computed twice. This redundancy grows exponentially, making naive recursion impractically slow even for modest values like n=40. The key insight is recognizing overlapping subproblems and either storing computed results (memoization) or building the solution iteratively from the bottom up—classic dynamic programming patterns.

## Why This Matters

Fibonacci numbers serve as the quintessential introduction to dynamic programming—one of the most powerful algorithmic paradigms for optimization problems. The sequence demonstrates overlapping subproblems (the hallmark of DP opportunities) in the clearest possible way, making it the perfect teaching example for understanding memoization and iterative optimization.

Beyond pedagogy, Fibonacci patterns appear surprisingly often in real systems: algorithm analysis (many recursive algorithms have Fibonacci-like recurrence relations), biological modeling (population growth, plant branching patterns), financial mathematics (Elliott Wave theory), computer graphics (golden ratio spirals), and data structure analysis (Fibonacci heaps, AVL tree heights). The problem teaches critical concepts: recognizing when recursion creates redundant work, understanding space-time trade-offs (memoization vs. iteration), and the powerful technique of maintaining only essential state (tracking just the last two values for O(1) space). Mastering this problem builds the foundation for solving hundreds of dynamic programming challenges involving optimal substructure and overlapping subproblems.

## Examples

**Example 1:**
- Input: `n = 2`
- Output: `1`
- Explanation: F(2) = F(1) + F(0) = 1 + 0 = 1.

**Example 2:**
- Input: `n = 3`
- Output: `2`
- Explanation: F(3) = F(2) + F(1) = 1 + 1 = 2.

**Example 3:**
- Input: `n = 4`
- Output: `3`
- Explanation: F(4) = F(3) + F(2) = 2 + 1 = 3.

## Constraints

- 0 <= n <= 30

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Recognizing Overlapping Subproblems
If you compute F(5) using recursion, how many times would F(3) be calculated? Draw a recursion tree to visualize. This redundancy is a key sign of what optimization technique?

### Hint 2: Space-Time Tradeoff
You can store all previously computed Fibonacci numbers, or just track the last two values. Which approach uses less memory? What do you actually need to compute F(n)?

### Hint 3: Iterative vs Recursive
Can you simulate the recursion using a loop? Start from F(0) and F(1), then build upward. How does this eliminate the redundant calculations?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Naive Recursion | O(2ⁿ) | O(n) | Exponential time, call stack depth n |
| Recursion + Memoization | O(n) | O(n) | Each subproblem computed once, stored |
| Iterative DP (Array) | O(n) | O(n) | Build array from 0 to n |
| Iterative (Two Variables) | O(n) | O(1) | Only track previous two values |
| Matrix Exponentiation | O(log n) | O(1) | Advanced technique using [[1,1],[1,0]]ⁿ |
| Golden Ratio Formula | O(1) | O(1) | Binet's formula, precision issues |

## Common Mistakes

### Mistake 1: Naive recursion without memoization
```python
# Wrong: Exponential time complexity
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)  # Recalculates same values many times
```
**Why it's wrong**: For n=30, this makes over 2 million function calls. Each F(k) is computed multiple times, leading to O(2ⁿ) complexity.

### Mistake 2: Using global memoization without cleanup
```python
# Wrong: Global state persists between calls
memo = {}
def fib(n):
    if n in memo:
        return memo[n]
    if n <= 1:
        return n
    memo[n] = fib(n - 1) + fib(n - 2)
    return memo[n]
# Problem: memo grows indefinitely across multiple calls
```
**Why it's wrong**: While memoization works, using global state can cause issues in testing or when the function is called multiple times with different inputs. Better to encapsulate.

### Mistake 3: Incorrect base case handling
```python
# Wrong: Doesn't handle F(0) correctly
def fib(n):
    if n == 1:
        return 1
    a, b = 1, 1  # Should be 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b
```
**Why it's wrong**: F(0) should return 0, not 1. Initial values should be (0, 1), not (1, 1).

## Variations

| Variation | Difficulty | Description |
|-----------|----------|-------------|
| Climbing Stairs | Easy | Count ways to climb n stairs (1 or 2 steps) |
| Tribonacci Number | Easy | F(n) = F(n-1) + F(n-2) + F(n-3) |
| Fibonacci With Modulo | Medium | Return F(n) % MOD to handle large n |
| K-Step Fibonacci | Medium | Can take up to k previous terms |
| House Robber | Medium | DP problem with Fibonacci-like recurrence |
| Matrix Exponentiation | Hard | Compute F(n) in O(log n) time |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Implement naive recursion (understand exponential growth)
- [ ] Implement iterative solution with two variables
- [ ] Handle base cases (n=0, n=1) correctly

**After 1 Day**
- [ ] Implement recursion with memoization (top-down DP)
- [ ] Implement iterative DP with array (bottom-up)
- [ ] Can you explain why memoization helps?

**After 1 Week**
- [ ] Solve in under 8 minutes with optimal O(n) time, O(1) space
- [ ] Implement using different approaches without reference
- [ ] Trace execution for small n values (draw recursion tree)

**After 1 Month**
- [ ] Solve Climbing Stairs variation
- [ ] Implement matrix exponentiation approach
- [ ] Identify Fibonacci pattern in other DP problems

## Strategy

**Pattern**: Dynamic Programming (Classic Introduction)
**Key Insight**: Overlapping subproblems can be eliminated by storing results. Only need last two values for O(1) space.

See [Dynamic Programming](../strategies/patterns/dynamic-programming.md) for more on recognizing and solving DP problems efficiently.
