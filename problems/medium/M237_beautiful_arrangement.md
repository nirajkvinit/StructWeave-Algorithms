---
id: M237
old_id: A024
slug: beautiful-arrangement
title: Beautiful Arrangement
difficulty: medium
category: medium
topics: ["backtracking", "bit-manipulation", "dynamic-programming"]
patterns: ["backtrack-permutation", "bitmask-dp"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - M046_permutations
  - M047_permutations_ii
  - M526_beautiful_arrangement_ii
prerequisites:
  - M046_permutations
  - E021_merge_two_sorted_lists
strategy_ref: ../strategies/patterns/backtracking.md
---
# Beautiful Arrangement

## Problem

Given a positive integer `n`, count how many "beautiful" permutations you can create using the numbers from 1 to `n`.

A permutation is **beautiful** if for every position `i` (using 1-based indexing from 1 to `n`), at least one of these conditions is true:
- The number at position `i` is divisible by `i`, OR
- The position `i` is divisible by the number at position `i`

For example, with `n = 2`, the permutation `[1,2]` is beautiful because position 1 has value 1 (1 is divisible by 1), and position 2 has value 2 (2 is divisible by 2). The permutation `[2,1]` is also beautiful because position 1 has value 2 (1 is divisible by 2), and position 2 has value 1 (2 is divisible by 1). Both permutations satisfy the constraints, so the answer is 2.

The brute force approach of generating all n! permutations and checking each one becomes impossibly slow even for `n = 15` (over 1.3 trillion permutations). The key to solving this efficiently is backtracking with aggressive pruning: as you build the permutation position by position, only try numbers that satisfy the beautiful condition for the current position. This eliminates massive branches of invalid permutations before they're fully explored.

An advanced optimization: fill positions from `n` down to 1 instead of 1 to `n`. Why? Larger position numbers have stricter divisibility constraints (fewer valid choices), so making hard decisions first prunes the search space more effectively. For even better performance, dynamic programming with bitmasks can memoize repeated states, reducing complexity from O(k) explored permutations to O(2^n × n).

## Why This Matters

This problem is a masterclass in backtracking optimization, demonstrating how constraint checking during generation (rather than after) can reduce exponential search spaces dramatically. The techniques learned here apply directly to N-Queens, Sudoku solvers, graph coloring, and other constraint satisfaction problems. The choice between forward and backward position filling illustrates a key optimization principle: make the most constrained decisions first to maximize pruning. The bitmask DP approach shows how memoization can optimize even backtracking problems when subproblems overlap. These patterns appear frequently in competitive programming and combinatorial optimization tasks. Understanding when backtracking suffices versus when DP is needed, and how to combine them, is essential for tackling complex search problems efficiently.

## Examples

**Example 1:**
- Input: `n = 2`
- Output: `2
Explanation:
Arrangement [1,2] is beautiful:
    - Position 1 has value 1: 1 is divisible by 1
    - Position 2 has value 2: 2 is divisible by 2
Arrangement [2,1] is beautiful:
    - Position 1 has value 2: 1 is divisible by 2
    - Position 2 has value 1: 2 is divisible by 1`

**Example 2:**
- Input: `n = 1`
- Output: `1`

## Constraints

- 1 <= n <= 15

## Approach Hints

<details>
<summary>Hint 1: Backtracking with Early Pruning</summary>

Generate permutations using backtracking, but prune invalid branches early:

```python
def isBeautiful(pos, val):
    return val % pos == 0 or pos % val == 0

def backtrack(position, used, n):
    if position > n:
        return 1  # Found valid arrangement

    count = 0
    for num in range(1, n + 1):
        if not used[num] and isBeautiful(position, num):
            used[num] = True
            count += backtrack(position + 1, used, n)
            used[num] = False

    return count
```

Key optimization: Fill positions left-to-right, only trying numbers that satisfy the beautiful condition for current position.

</details>

<details>
<summary>Hint 2: Optimized Backtracking - Fill from Back</summary>

Interesting insight: Fill positions from `n` down to `1` instead of `1` to `n`.

Why? Larger positions have fewer divisibility constraints:
- Position n: Only 1, 2, and n's divisors work
- Position 1: Any number works (since any number % 1 == 0)

By filling stricter positions first, you prune the search tree more aggressively.

Compare branches explored:
- Forward (1→n): Many branches fail late
- Backward (n→1): Fewer branches generated initially

This can reduce runtime significantly!

</details>

<details>
<summary>Hint 3: Bitmask Dynamic Programming</summary>

For advanced optimization, use DP with bitmask to avoid recomputing states:

State: `dp[mask][pos]` = number of beautiful arrangements using numbers in `mask` for positions 1 to `pos`

But there's a simpler formulation:
`dp[mask]` = number of ways to arrange numbers represented in bitmask

```python
def countArrangement(n):
    dp = {}

    def solve(mask, pos):
        if pos > n:
            return 1
        if mask in dp:
            return dp[mask]

        count = 0
        for num in range(1, n + 1):
            if not (mask & (1 << num)) and (num % pos == 0 or pos % num == 0):
                count += solve(mask | (1 << num), pos + 1)

        dp[mask] = count
        return count

    return solve(0, 1)
```

This memoizes repeated subproblems, converting O(n!) to O(2ⁿ × n).

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (All Perms) | O(n!) | O(n) | Generate all, check each |
| Backtracking with Pruning | O(k) | O(n) | k < n!, depends on pruning effectiveness |
| Backward Backtracking | O(k') | O(n) | k' < k, better pruning |
| Bitmask DP | O(2ⁿ × n) | O(2ⁿ) | Memoization prevents recalculation |

## Common Mistakes

### Mistake 1: Generating All Permutations First
```python
# WRONG: Generates all n! permutations, then filters
def countArrangement(n):
    from itertools import permutations

    def isBeautiful(perm):
        for i in range(1, n + 1):
            if perm[i-1] % i != 0 and i % perm[i-1] != 0:
                return False
        return True

    count = 0
    for perm in permutations(range(1, n + 1)):
        if isBeautiful(perm):
            count += 1
    return count
    # O(n! × n) - way too slow even for n=15!

# CORRECT: Backtrack with pruning
def countArrangement(n):
    def backtrack(pos, used):
        if pos > n:
            return 1
        count = 0
        for num in range(1, n + 1):
            if not used[num] and (num % pos == 0 or pos % num == 0):
                used[num] = True
                count += backtrack(pos + 1, used)
                used[num] = False
        return count

    return backtrack(1, [False] * (n + 1))
```

### Mistake 2: Not Checking Divisibility Correctly
```python
# WRONG: Uses AND instead of OR
def countArrangement(n):
    def backtrack(pos, used):
        if pos > n:
            return 1
        count = 0
        for num in range(1, n + 1):
            # Wrong: requires BOTH conditions (should be AT LEAST ONE)
            if not used[num] and num % pos == 0 and pos % num == 0:
                used[num] = True
                count += backtrack(pos + 1, used)
                used[num] = False
        return count

    return backtrack(1, [False] * (n + 1))
    # Returns 0 or very small values

# CORRECT: Uses OR (at least one condition must hold)
def countArrangement(n):
    def backtrack(pos, used):
        if pos > n:
            return 1
        count = 0
        for num in range(1, n + 1):
            if not used[num] and (num % pos == 0 or pos % num == 0):  # OR!
                used[num] = True
                count += backtrack(pos + 1, used)
                used[num] = False
        return count

    return backtrack(1, [False] * (n + 1))
```

### Mistake 3: Off-by-One in Position Indexing
```python
# WRONG: Uses 0-based indexing for positions
def countArrangement(n):
    def backtrack(pos, used):
        if pos == n:  # Wrong: should be pos > n or pos == n + 1
            return 1
        count = 0
        for num in range(1, n + 1):
            if not used[num] and (num % (pos + 1) == 0 or (pos + 1) % num == 0):
                used[num] = True
                count += backtrack(pos + 1, used)
                used[num] = False
        return count

    return backtrack(0, [False] * (n + 1))
    # Confusing 0-based and 1-based indexing

# CORRECT: Consistent 1-based indexing
def countArrangement(n):
    def backtrack(pos, used):
        if pos > n:  # Clear termination condition
            return 1
        count = 0
        for num in range(1, n + 1):
            if not used[num] and (num % pos == 0 or pos % num == 0):
                used[num] = True
                count += backtrack(pos + 1, used)
                used[num] = False
        return count

    return backtrack(1, [False] * (n + 1))  # Start at position 1
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| Beautiful Arrangement II | Construct array with specific differences | Medium |
| Print All Beautiful Arrangements | Return actual arrangements, not just count | Medium |
| K-Beautiful Arrangement | At least k positions satisfy the condition | Hard |
| Maximum Beautiful Value | Each number has a value, maximize sum | Hard |
| Beautiful Arrangement with Constraints | Additional position-value constraints | Hard |

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Practice Checklist

- [ ] Solve using basic backtracking (Day 1)
- [ ] Optimize with backward position filling (Day 1)
- [ ] Implement bitmask DP version (Day 3)
- [ ] Compare runtime of forward vs backward filling (Day 3)
- [ ] Solve related: Permutations (Day 7)
- [ ] Solve without looking at notes (Day 14)
- [ ] Teach the pruning optimization techniques (Day 30)

**Strategy**: See [Backtracking Pattern](../strategies/patterns/backtracking.md)
