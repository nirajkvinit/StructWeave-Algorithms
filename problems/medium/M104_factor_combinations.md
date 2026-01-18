---
id: M104
old_id: I054
slug: factor-combinations
title: Factor Combinations
difficulty: medium
category: medium
topics: ["backtracking", "math"]
patterns: ["backtrack-combination"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M077", "M039", "M040"]
prerequisites: ["backtracking", "prime-factorization", "recursion"]
---
# Factor Combinations

## Problem

Given a positive integer, you need to find all the different ways you can break it down into a product of factors greater than 1. For example, the number 8 can be factored as `[2, 4]` (2 times 4 equals 8) or `[2, 2, 2]` (2 times 2 times 2 equals 8). Note that we exclude the trivial factorization of just the number itself, so `[8]` doesn't count. Your factors must all be at least 2 and at most n-1. The challenge is generating these combinations without duplicates like `[2, 3]` and `[3, 2]` being counted separately. Think about how backtracking can systematically explore factor choices while maintaining a sorted order to avoid duplicates. You only need to try factors up to the square root of the remaining number, since larger factors come in pairs. Edge cases include prime numbers (which have no factorizations beyond themselves) and the number 1 (which also has no valid factorizations).

## Why This Matters

Factorization algorithms are foundational in cryptography, particularly in RSA encryption where the security relies on the difficulty of factoring large numbers. In compiler optimization, expression factoring helps reduce redundant calculations by identifying common subexpressions. Database query optimizers use factorization to transform complex queries into more efficient forms. Number theoretic algorithms in competitive programming and mathematical software heavily rely on efficient factorization. The backtracking pattern you'll develop here applies broadly to generating all valid combinations under constraints, from generating valid parentheses combinations to solving Sudoku puzzles. Understanding how to prevent duplicate generation while exploring a solution space is a critical skill for any combinatorial problem.

## Examples

**Example 1:**
- Input: `n = 1`
- Output: `[]`

**Example 2:**
- Input: `n = 12`
- Output: `[[2,6],[3,4],[2,2,3]]`

**Example 3:**
- Input: `n = 37`
- Output: `[]`

## Constraints

- 1 <= n <= 10⁷

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Backtracking with Divisors</summary>

This is a combination problem where you build factor lists recursively. For a remaining product value, try all divisors starting from a minimum value (to avoid duplicates like [2,3] and [3,2]). When the remaining product becomes 1, you've found a valid combination.

</details>

<details>
<summary>🎯 Hint 2: Avoid Duplicates with Start Index</summary>

To prevent duplicate combinations, always explore divisors in non-decreasing order. Pass a "start" parameter that ensures the next factor is >= the previous factor. This way you get [2,2,3] but never [2,3,2] or [3,2,2].

</details>

<details>
<summary>📝 Hint 3: Algorithm Design</summary>

Pseudocode approach:
```
function getFactors(n):
    result = []
    backtrack(n, 2, [], result)
    return result

function backtrack(remaining, start, current, result):
    # Base case: found a complete factorization
    if remaining == 1:
        if len(current) > 1:  # Exclude single number n
            result.append(current.copy())
        return

    # Try all divisors from start to sqrt(remaining)
    for i from start to sqrt(remaining):
        if remaining % i == 0:
            current.append(i)
            backtrack(remaining / i, i, current, result)
            current.pop()

    # Include remaining number itself as last factor
    if remaining >= start:
        current.append(remaining)
        backtrack(1, remaining, current, result)
        current.pop()
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n!) | O(n) | Try all permutations of factors |
| **Backtracking** | **O(2^log n)** | **O(log n)** | Each prime factor can be split or kept, depth = number of prime factors |

The time complexity is hard to express precisely but relates to the number of ways to factorize n.

## Common Mistakes

**Mistake 1: Not preventing duplicate combinations**
```python
# Wrong: Generates duplicates like [2,3] and [3,2]
def get_factors(n):
    result = []

    def backtrack(remaining, current):
        if remaining == 1:
            if len(current) > 1:
                result.append(current[:])
            return

        for i in range(2, remaining):
            if remaining % i == 0:
                current.append(i)
                backtrack(remaining // i, current)
                current.pop()

    backtrack(n, [])
    return result
```

```python
# Correct: Use start index to maintain order
def get_factors(n):
    result = []

    def backtrack(remaining, start, current):
        if remaining == 1:
            if len(current) > 1:
                result.append(current[:])
            return

        for i in range(start, int(remaining**0.5) + 1):
            if remaining % i == 0:
                current.append(i)
                backtrack(remaining // i, i, current)
                current.pop()

        # Include remaining as last factor
        current.append(remaining)
        backtrack(1, remaining, current)
        current.pop()

    backtrack(n, 2, [])
    return result
```

**Mistake 2: Including n itself as a single factorization**
```python
# Wrong: Returns [[12]] for n=12
def backtrack(remaining, start, current):
    if remaining == 1:
        result.append(current[:])  # Should check len(current) > 1
        return
```

```python
# Correct: Only accept combinations with multiple factors
def backtrack(remaining, start, current):
    if remaining == 1:
        if len(current) > 1:  # Exclude single number
            result.append(current[:])
        return
```

**Mistake 3: Not optimizing loop bound**
```python
# Wrong: Iterates up to remaining (inefficient)
for i in range(start, remaining):
    if remaining % i == 0:
        # ... backtrack
```

```python
# Correct: Only iterate to sqrt(remaining), handle quotient separately
for i in range(start, int(remaining**0.5) + 1):
    if remaining % i == 0:
        current.append(i)
        backtrack(remaining // i, i, current)
        current.pop()

# Handle remaining as final factor
current.append(remaining)
backtrack(1, remaining, current)
current.pop()
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Prime Factorization | Find unique prime factors only | Easy |
| Unique Combinations | Generate all unique factor pairs (a,b) where a*b=n | Medium |
| Count Factorizations | Count number of ways instead of listing them | Medium |
| Factorization with K Factors | Find factorizations with exactly k factors | Medium |
| Factor Combinations Sum | Find combinations where sum equals target | Hard |

## Practice Checklist

- [ ] Initial attempt (Day 0)
- [ ] Reviewed backtracking template (Day 0)
- [ ] Implemented with duplicate prevention (Day 0)
- [ ] First spaced repetition (Day 1)
- [ ] Second spaced repetition (Day 3)
- [ ] Third spaced repetition (Day 7)
- [ ] Fourth spaced repetition (Day 14)
- [ ] Can explain why start index prevents duplicates (Day 14)
- [ ] Can code without references (Day 30)
- [ ] Interview-ready confidence (Day 30)

**Strategy**: Use backtracking with start index to generate factor combinations in non-decreasing order, avoiding duplicates and including both divisor and quotient paths.
