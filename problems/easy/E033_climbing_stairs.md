---
id: E033
old_id: F070
slug: climbing-stairs
title: Climbing Stairs
difficulty: easy
category: easy
topics: ["dynamic-programming", "math"]
patterns: ["dp-1d", "fibonacci"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E746", "M062", "M070"]
prerequisites: ["dynamic-programming", "recursion"]
strategy_ref: ../../strategies/patterns/dynamic-programming.md
---
# Climbing Stairs

## Problem

You are climbing a staircase with n steps. Each time you climb, you can either take 1 step or 2 steps. Your task is to determine how many distinct ways you can reach the top.

For example, with n = 3 stairs, there are three different ways to climb: you could take three single steps (1+1+1), or one single step followed by one double step (1+2), or one double step followed by one single step (2+1). Note that the order matters, so 1+2 and 2+1 are counted as different sequences.

The key insight is that this problem has optimal substructure: to reach step n, you must have come from either step n-1 (by taking a 1-step) or step n-2 (by taking a 2-step). Therefore, the number of ways to reach step n is the sum of the ways to reach step n-1 and the ways to reach step n-2.

This creates a recurrence relation, but a naive recursive solution would recalculate the same values repeatedly, leading to exponential time complexity. You need to recognize the pattern and apply an efficient approach.

## Why This Matters

This is the classic introduction to dynamic programming, one of the most important algorithmic paradigms. The climbing stairs problem demonstrates how to identify overlapping subproblems and use previously computed results to build up to the final answer efficiently.

The exact same pattern appears in countless real-world scenarios: resource allocation problems (how many ways to distribute items), scheduling problems (how many valid sequences exist), and combinatorial counting in general. The Fibonacci connection you'll discover also appears in biological modeling, financial algorithms, and computer graphics.

This problem is extremely common in technical interviews because it tests your ability to recognize dynamic programming patterns and optimize from a naive recursive solution to an efficient iterative one. It's often used as a stepping stone to more complex DP problems.

## Examples

**Example 1:**
- Input: `n = 2`
- Output: `2`
- Explanation: There are two ways to climb to the top.
1. 1 step + 1 step
2. 2 steps

**Example 2:**
- Input: `n = 3`
- Output: `3`
- Explanation: There are three ways to climb to the top.
1. 1 step + 1 step + 1 step
2. 1 step + 2 steps
3. 2 steps + 1 step

## Constraints

- 1 <= n <= 45

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Building from Smaller Problems</summary>

To reach stair n, you must have come from either stair n-1 (taking a 1-step) or stair n-2 (taking a 2-step). How many ways exist to reach stair n based on this observation?

Key insight: This is a classic recurrence relation. Can you express ways(n) in terms of ways(n-1) and ways(n-2)?

</details>

<details>
<summary>🎯 Hint 2: The Fibonacci Connection</summary>

The recurrence is: ways(n) = ways(n-1) + ways(n-2)

With base cases: ways(1) = 1, ways(2) = 2

Notice anything familiar? This is the Fibonacci sequence! You can solve it with:
- Recursion (exponential time - slow)
- Memoization (linear time, linear space)
- Bottom-up DP (linear time, linear space)
- Space-optimized (linear time, constant space)

</details>

<details>
<summary>📝 Hint 3: Space-Optimized DP Algorithm</summary>

```
Algorithm (Space-Optimized):
1. Handle base cases:
   if n == 1: return 1
   if n == 2: return 2

2. Initialize:
   prev2 = 1  # ways(1)
   prev1 = 2  # ways(2)

3. For i from 3 to n:
   current = prev1 + prev2
   prev2 = prev1
   prev1 = current

4. Return prev1

Example trace for n=5:
i=3: current=2+1=3, prev2=2, prev1=3
i=4: current=3+2=5, prev2=3, prev1=5
i=5: current=5+3=8, prev2=5, prev1=8
Return 8

Fibonacci comparison:
n:     1  2  3  4  5  6
ways:  1  2  3  5  8  13
fib:   1  1  2  3  5  8
(ways(n) = fibonacci(n+1))
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Recursion | O(2ⁿ) | O(n) | Exponential branching, call stack |
| Memoization (Top-Down DP) | O(n) | O(n) | Cache results, recursion stack |
| Tabulation (Bottom-Up DP) | O(n) | O(n) | Array to store all subproblems |
| **Space-Optimized DP** | **O(n)** | **O(1)** | Only track last two values |
| Matrix Exponentiation | O(log n) | O(1) | Advanced technique |

## Common Mistakes

### 1. Exponential Recursion Without Memoization
```python
# WRONG: Recalculates same values many times
def climbStairs(n):
    if n <= 2:
        return n
    return climbStairs(n-1) + climbStairs(n-2)
# O(2ⁿ) - times out for large n!

# CORRECT: Add memoization
def climbStairs(n, memo={}):
    if n <= 2:
        return n
    if n in memo:
        return memo[n]
    memo[n] = climbStairs(n-1, memo) + climbStairs(n-2, memo)
    return memo[n]
```

### 2. Wrong Base Cases
```python
# WRONG: Incorrect base case
if n == 0: return 0
if n == 1: return 1  # Should be 1 way for 1 stair

# CORRECT: Proper base cases
if n == 1: return 1
if n == 2: return 2
```

### 3. Off-by-One in DP Array
```python
# WRONG: Confusion about array indexing
dp = [0] * n
dp[0] = 1
dp[1] = 2  # IndexError if n=1!

# CORRECT: Handle size properly
if n <= 2:
    return n
dp = [0] * (n + 1)
dp[1] = 1
dp[2] = 2
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Min Cost Climbing Stairs | Each stair has a cost | DP tracks minimum cost instead of count |
| k Steps Allowed | Can take 1 to k steps | Sum previous k values: dp[i] = sum(dp[i-k:i]) |
| Tribonacci Stairs | Can take 1, 2, or 3 steps | dp[i] = dp[i-1] + dp[i-2] + dp[i-3] |

## Practice Checklist

**Correctness:**
- [ ] Handles n = 1
- [ ] Handles n = 2
- [ ] Handles small n (3-10)
- [ ] Handles large n (up to 45)
- [ ] Returns correct integer count
- [ ] No integer overflow

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 10 minutes
- [ ] Can discuss all 4 approaches
- [ ] Can explain Fibonacci connection

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations (min cost)
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
