---
id: M086
old_id: I016
slug: combination-sum-iii
title: Combination Sum III
difficulty: medium
category: medium
topics: ["backtracking", "recursion"]
patterns: ["backtrack-combination"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M039", "M040", "M377"]
prerequisites: ["backtracking", "recursion", "combinatorics"]
---
# Combination Sum III

## Problem

Identify every possible set containing exactly `k` digits that total to `n`, where you may only select from digits `1` through `9`, and no digit can be repeated in a combination. For example, `[1,2,4]` is valid if k=3 and n=7, but `[1,1,5]` is invalid because 1 appears twice. You must provide all such valid sets as output. Each unique set should appear exactly once in the result, and the order of sets in the output doesn't matter, though within each set, maintaining ascending order helps avoid duplicates. The constraint that digits come from 1-9 creates natural boundaries: the minimum possible sum with k digits is 1+2+...+k, and the maximum is (10-k)+(11-k)+...+9. If n falls outside this range, no valid combinations exist. Edge cases include k=1 (just return n if 1<=n<=9), n being impossible to achieve with k distinct digits, and multiple valid combinations with the same sum requiring systematic enumeration to avoid missing any.

## Why This Matters

This problem teaches backtracking, a fundamental technique for exploring all possible solutions to combinatorial problems. Cryptography uses combination generation to test key possibilities within constrained search spaces. In game development, generating valid dice roll combinations or card hands with specific properties relies on similar logic. Chemistry simulations enumerate molecular structures with fixed atom counts and valence constraints. Operations research applies combination enumeration to resource allocation problems where you must select k resources from a limited pool to meet a target objective. Network design uses it to find all possible k-node subgraphs meeting connectivity requirements. The pruning techniques you learn here, like abandoning paths when the sum already exceeds n, are essential for making backtracking practical on larger problems. This problem exemplifies the generate-and-test paradigm while teaching you to eliminate invalid candidates early, a critical optimization strategy in constraint satisfaction problems, puzzle solvers, and exhaustive search algorithms.

## Examples

**Example 1:**
- Input: `k = 3, n = 7`
- Output: `[[1,2,4]]`
- Explanation: 1 + 2 + 4 = 7
There are no other valid combinations.

**Example 2:**
- Input: `k = 3, n = 9`
- Output: `[[1,2,6],[1,3,5],[2,3,4]]`
- Explanation: 1 + 2 + 6 = 9
1 + 3 + 5 = 9
2 + 3 + 4 = 9
There are no other valid combinations.

**Example 3:**
- Input: `k = 4, n = 1`
- Output: `[]`
- Explanation: There are no valid combinations.
Using 4 different numbers in the range [1,9], the smallest sum we can get is 1+2+3+4 = 10 and since 10 > 1, there are no valid combination.

## Constraints

- 2 <= k <= 9
- 1 <= n <= 60

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Backtracking Framework</summary>

This is a classic backtracking/combination problem. You need to:
1. Try adding each digit from 1-9 to your current combination
2. Recursively build combinations until you have k digits
3. Check if the sum equals n
4. Backtrack by removing the last digit and trying the next one

The key constraint is you can only use each digit once, and you must use exactly k digits.

</details>

<details>
<summary>🎯 Hint 2: Pruning Opportunities</summary>

You can optimize backtracking with early termination:
- **Sum too large**: If current sum already exceeds n, stop exploring
- **Not enough digits**: If even using all remaining largest digits can't reach n, stop
- **Too many digits used**: If we already have k digits but sum != n, this path fails
- **Digit ordering**: Start from a minimum value (previous digit + 1) to avoid duplicates

</details>

<details>
<summary>📝 Hint 3: Backtracking Template</summary>

Pseudocode:
```
def backtrack(start, path, current_sum):
    // Base case: found valid combination
    if len(path) == k and current_sum == n:
        result.append(path.copy())
        return

    // Base case: invalid path
    if len(path) == k or current_sum > n:
        return

    // Try each digit from start to 9
    for digit in range(start, 10):
        path.append(digit)
        backtrack(digit + 1, path, current_sum + digit)
        path.pop()  // Backtrack

// Start from digit 1
backtrack(1, [], 0)
```

Time: O(C(9,k)) where C is combination, at most 9 choose k combinations
Space: O(k) for recursion depth

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (all subsets) | O(2^9 × k) | O(k) | Generate all 2^9 subsets, filter by size and sum |
| **Backtracking with Pruning** | **O(C(9,k))** | **O(k)** | Only explore valid combinations, optimal for this constraint |
| Dynamic Programming | O(n × k × 9) | O(n × k) | Overkill for small input space, DP not ideal here |
| Iterative Combinations | O(C(9,k)) | O(k) | Similar to backtracking but iterative, harder to implement |

## Common Mistakes

**Mistake 1: Not avoiding duplicates properly**

```python
# Wrong - Can produce duplicate combinations
def combinationSum3(k, n):
    result = []

    def backtrack(path, current_sum):
        if len(path) == k and current_sum == n:
            result.append(path[:])
            return

        for digit in range(1, 10):  # Wrong! Always starts from 1
            if digit not in path:  # Expensive check
                path.append(digit)
                backtrack(path, current_sum + digit)
                path.pop()
    # This generates [1,2,3] and [2,1,3] as different paths
```

```python
# Correct - Use start parameter to ensure ordering
def combinationSum3(k, n):
    result = []

    def backtrack(start, path, current_sum):
        if len(path) == k and current_sum == n:
            result.append(path[:])
            return

        for digit in range(start, 10):  # Start from 'start'
            path.append(digit)
            backtrack(digit + 1, path, current_sum + digit)
            path.pop()

    backtrack(1, [], 0)
    return result
```

**Mistake 2: Not pruning when sum exceeds target**

```python
# Wrong - Continues exploration even when sum is too large
def combinationSum3(k, n):
    result = []

    def backtrack(start, path, current_sum):
        if len(path) == k:
            if current_sum == n:  # Only checks at the end
                result.append(path[:])
            return  # Wastes time exploring impossible paths

        for digit in range(start, 10):
            path.append(digit)
            backtrack(digit + 1, path, current_sum + digit)
            path.pop()
```

```python
# Correct - Prune early when sum exceeds target
def combinationSum3(k, n):
    result = []

    def backtrack(start, path, current_sum):
        if len(path) == k and current_sum == n:
            result.append(path[:])
            return

        if len(path) >= k or current_sum >= n:  # Early termination
            return

        for digit in range(start, 10):
            path.append(digit)
            backtrack(digit + 1, path, current_sum + digit)
            path.pop()

    backtrack(1, [], 0)
    return result
```

**Mistake 3: Forgetting to copy the path when adding to result**

```python
# Wrong - All results point to same list object
def combinationSum3(k, n):
    result = []
    path = []

    def backtrack(start, current_sum):
        if len(path) == k and current_sum == n:
            result.append(path)  # Wrong! Adds reference, not copy
            return

        for digit in range(start, 10):
            path.append(digit)
            backtrack(digit + 1, current_sum + digit)
            path.pop()
    # result will contain multiple references to same list
```

```python
# Correct - Create a copy when adding to result
def combinationSum3(k, n):
    result = []

    def backtrack(start, path, current_sum):
        if len(path) == k and current_sum == n:
            result.append(path[:])  # or path.copy() or list(path)
            return

        for digit in range(start, 10):
            path.append(digit)
            backtrack(digit + 1, path, current_sum + digit)
            path.pop()

    backtrack(1, [], 0)
    return result
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Combination Sum | Medium | Use unlimited instances of candidates, different target |
| Combination Sum II | Medium | Each number used at most once, duplicates in input |
| Combination Sum IV | Medium | Count number of combinations (DP problem) |
| Letter Combinations of Phone Number | Medium | Similar backtracking pattern, different domain |
| Subsets | Medium | Generate all possible subsets (no sum constraint) |

## Practice Checklist

- [ ] Day 1: Solve using basic backtracking
- [ ] Day 2: Add pruning optimizations (early termination)
- [ ] Day 7: Re-solve from scratch, ensure no duplicate combinations
- [ ] Day 14: Solve Combination Sum II (handles duplicates in input)
- [ ] Day 30: Implement iteratively using bit manipulation or explicit stack

**Strategy**: See [Backtracking Patterns](../strategies/patterns/backtracking.md)
