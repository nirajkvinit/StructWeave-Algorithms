---
id: E250
old_id: A370
slug: valid-permutations-for-di-sequence
title: Valid Permutations for DI Sequence
difficulty: easy
category: easy
topics: ["string", "dynamic-programming", "combinatorics"]
patterns: ["backtrack-permutation", "dp-counting"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - M019_generate_parentheses.md
  - M046_permutations.md
prerequisites:
  - "Dynamic programming basics"
  - "Permutation concepts"
  - "Modular arithmetic"
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Valid Permutations for DI Sequence

## Problem

You're given a string `s` of length `n` that contains only two character types: `'D'` (representing "Decrease") and `'I'` (representing "Increase"). Think of this string as a sequence of constraints that describe how adjacent numbers should relate to each other. Your task is to count how many valid permutations exist of the integers from 0 to n (inclusive, giving you n+1 numbers total) that satisfy these constraints. A permutation is valid when, for every position `i` in the string, the relationship between adjacent numbers matches the constraint: if `s[i] == 'D'`, then the number at position `i` must be greater than the number at position `i + 1`, and if `s[i] == 'I'`, the number at position `i` must be less than the number at position `i + 1`. For example, given "DI" (length 2), you need to arrange the numbers [0, 1, 2] such that the first number is greater than the second (D), and the second is less than the third (I). Since the answer can grow extremely large (factorial growth), return the count modulo 10^9 + 7 to keep the number manageable.

## Why This Matters

This problem bridges combinatorics, dynamic programming, and constraint satisfaction in a powerful way. While it appears to be about permutations, it teaches you to think in terms of relative rankings rather than absolute values, which is a critical insight for many optimization problems. The technique of tracking "how many smaller values remain" instead of "which specific values are used" appears frequently in interview scenarios involving arrangements, scheduling, and resource allocation. This problem is particularly valuable because it forces you to recognize when brute-force enumeration (trying all n! permutations) is completely infeasible, pushing you toward dynamic programming solutions. The modular arithmetic requirement also mirrors real-world systems where you need to prevent integer overflow in counting problems. Companies often ask variations of this during interviews to assess whether candidates can identify mathematical patterns and choose appropriate algorithmic paradigms.

## Examples

**Example 1:**
- Input: `s = "DID"`
- Output: `5`
- Explanation: The 5 valid permutations of (0, 1, 2, 3) are:
(1, 0, 3, 2)
(2, 0, 3, 1)
(2, 1, 3, 0)
(3, 0, 2, 1)
(3, 1, 2, 0)

**Example 2:**
- Input: `s = "D"`
- Output: `1`

## Constraints

- n == s.length
- 1 <= n <= 200
- s[i] is either 'I' or 'D'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Problem Understanding
Instead of thinking about absolute values, think about relative rankings. If you're placing `n+1` numbers, at each position you're choosing from the remaining available numbers.

The key insight: you don't need to track actual numbers, just how many smaller numbers remain to be placed.

### Tier 2 Hint - Solution Strategy
Use dynamic programming where `dp[i][j]` represents the number of ways to create a valid permutation for the first `i` characters where the value at position `i` has rank `j` among the remaining unused numbers.

Transitions depend on whether `s[i]` is 'I' or 'D':
- If 'I': sum counts where next rank is greater
- If 'D': sum counts where next rank is smaller

### Tier 3 Hint - Implementation Details
Define `dp[i][j]` = count of valid permutations for first `i` positions where position `i` uses the `j`-th smallest unused number.

Base case: `dp[0][0] = 1` (one way to place first number)

Transition:
- If `s[i-1] == 'I'`: `dp[i][j] = sum(dp[i-1][k])` for all `k <= j`
- If `s[i-1] == 'D'`: `dp[i][j] = sum(dp[i-1][k])` for all `k >= j`

Use prefix sums to optimize summations to O(1).

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| DP with prefix sum | O(n²) | O(n²) | Optimal approach using dynamic programming |
| DP naive transitions | O(n³) | O(n²) | Without prefix sum optimization |
| Backtracking | O(n! × n) | O(n) | Generate all permutations, too slow |
| Space-optimized DP | O(n²) | O(n) | Use rolling array, only keep previous row |

## Common Mistakes

### Mistake 1: Trying to generate actual permutations
```python
# Wrong: Generating all permutations is too slow
from itertools import permutations
count = 0
for perm in permutations(range(n+1)):
    if is_valid(perm, s):
        count += 1
```
**Why it's wrong**: For n=200, there are 201! permutations - far too many to enumerate.

### Mistake 2: Forgetting modulo in intermediate calculations
```python
# Wrong: Only applying modulo at the end
dp[i][j] = sum(dp[i-1][k] for k in range(j+1))
# ...
return dp[n][0] % MOD
```
**Why it's wrong**: Intermediate sums can overflow. Apply modulo at each step: `dp[i][j] = sum(...) % MOD`

### Mistake 3: Incorrect DP state definition
```python
# Wrong: Using actual values instead of ranks
dp[i][v] = count where position i has value v
```
**Why it's wrong**: The state space becomes complex when values are used vs. unused. Using ranks (relative positions) simplifies the problem.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Print one valid permutation | Easy | Instead of counting, return any valid permutation |
| Custom sequence constraints | Medium | Allow more constraint types (E for equal, etc.) |
| K-th permutation | Medium | Return the k-th valid permutation in lexicographic order |
| Minimum inversions | Medium | Among valid permutations, find one with minimum inversions |
| Circular DI sequence | Hard | String wraps around (first and last positions compared) |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Reviewed solution and understood all approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 3 days
- [ ] Practiced again after 1 week
- [ ] Can explain the solution clearly to others
- [ ] Solved all variations above

**Strategy**: See [Dynamic Programming Patterns](../strategies/patterns/dynamic-programming.md)
