---
id: M230
old_id: A016
slug: coin-change-ii
title: Coin Change II
difficulty: medium
category: medium
topics: ["array", "dynamic-programming"]
patterns: ["backtrack-combination", "dp-1d", "unbounded-knapsack"]
estimated_time_minutes: 30
frequency: high
related_problems:
  - M322_coin_change
  - M039_combination_sum
  - M518_partition_equal_subset_sum
prerequisites:
  - E070_climbing_stairs
  - M139_word_break
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Coin Change II

## Problem

You have an unlimited supply of coins with various denominations given in the array `coins`. Your task is to count how many distinct combinations of these coins sum to a target `amount`. If it's impossible to make the amount, return 0.

The key word here is "combinations," not "permutations." For example, with coins [1,2] and amount 3, the combinations [1,2] and [2,1] count as the same combination because order doesn't matter. The valid combinations are: [1,1,1] and [1,2], giving an answer of 2.

This is a classic unbounded knapsack problem because you can use each coin unlimited times. The "unbounded" means there's no restriction on how many times you can pick the same coin denomination.

Here's what makes this problem tricky: The loop order matters significantly. If you iterate amounts in the outer loop and coins in the inner loop, you'll count permutations (different orderings as different). But if you iterate coins in the outer loop and amounts in the inner loop, you'll correctly count only combinations.

Why? When coins are in the outer loop, each coin type is processed completely before moving to the next coin type, ensuring each combination is counted only once regardless of the order in which coins were added.

The result is guaranteed to fit in a 32-bit integer.

## Why This Matters

This problem teaches the unbounded knapsack pattern with a critical lesson about counting combinations versus permutations. These concepts appear throughout computer science: making change in financial systems, resource allocation in operating systems (distributing unlimited resource types to meet quotas), inventory management (combining unlimited stock items to fill orders), and packet assembly in networking (combining data chunks to reach target sizes). Understanding the subtle difference between combination and permutation counting is crucial for many counting problems in interviews and real-world applications. The pattern also appears in compiler optimization (counting ways to tile instruction sequences) and game development (calculating possible item combinations to achieve stats). Mastering loop order's effect on counting is a fundamental skill for dynamic programming.

## Examples

**Example 1:**
- Input: `amount = 5, coins = [1,2,5]`
- Output: `4`
- Explanation: Four distinct combinations exist: 5, 2+2+1, 2+1+1+1, and 1+1+1+1+1

**Example 2:**
- Input: `amount = 3, coins = [2]`
- Output: `0`
- Explanation: Using only denomination 2, it is impossible to form a total of 3.

**Example 3:**
- Input: `amount = 10, coins = [10]`
- Output: `1`

## Constraints

- 1 <= coins.length <= 300
- 1 <= coins[i] <= 5000
- All the values of coins are **unique**.
- 0 <= amount <= 5000

## Approach Hints

<details>
<summary>Hint 1: 2D DP - Building Up from Smaller Amounts</summary>

Think of a 2D table `dp[i][j]` where:
- `i` represents the first `i` coin types considered
- `j` represents the target amount
- `dp[i][j]` = number of ways to make amount `j` using first `i` coins

Base case: `dp[0][0] = 1` (one way to make 0: use no coins)

For each coin, you have two choices:
- Don't use this coin: `dp[i][j] = dp[i-1][j]`
- Use this coin (unlimited times): `dp[i][j] += dp[i][j-coin]`

The answer is `dp[n][amount]`.

</details>

<details>
<summary>Hint 2: 1D DP - Space Optimization</summary>

Notice that `dp[i][j]` only depends on `dp[i-1][j]` (previous row) and `dp[i][j-coin]` (current row, earlier column).

You can optimize to a 1D array `dp[amount+1]` where `dp[j]` = ways to make amount `j`.

Critical insight: Iterate coins in the OUTER loop and amounts in INNER loop. This ensures each combination is counted only once.

```
for coin in coins:
    for amount from coin to target:
        dp[amount] += dp[amount - coin]
```

Why does order matter? Try reversing the loops and see what happens!

</details>

<details>
<summary>Hint 3: Understanding Combinations vs Permutations</summary>

This problem counts COMBINATIONS, not PERMUTATIONS. The order [1,2,2] and [2,1,2] are the same.

Key difference:
- **This problem (combinations)**: Iterate coins in outer loop → each coin processed once
- **Permutations**: Iterate amount in outer loop → coins can be reused in different orders

Example with amount=4, coins=[1,2]:
- Combinations (this problem): [2,2], [2,1,1], [1,1,1,1] = 3 ways
- Permutations: [2,2], [2,1,1], [1,2,1], [1,1,2], [1,1,1,1] = 5 ways

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| 2D DP | O(n × amount) | O(n × amount) | n = number of coin types |
| 1D DP (Optimized) | O(n × amount) | O(amount) | Space-optimized version |
| Recursion + Memo | O(n × amount) | O(n × amount) | Call stack + memoization |
| Backtracking (Brute) | O(amount^n) | O(amount) | Too slow, exponential |

## Common Mistakes

### Mistake 1: Wrong Loop Order (Counts Permutations Instead)
```python
# WRONG: Counts permutations, not combinations
def change(amount, coins):
    dp = [0] * (amount + 1)
    dp[0] = 1

    # Wrong: amount in outer loop
    for i in range(1, amount + 1):
        for coin in coins:
            if i >= coin:
                dp[i] += dp[i - coin]

    return dp[amount]
    # For amount=4, coins=[1,2]: returns 5 (includes [1,2,1] and [2,1,1] as different)

# CORRECT: Coins in outer loop for combinations
def change(amount, coins):
    dp = [0] * (amount + 1)
    dp[0] = 1

    # Correct: coins in outer loop
    for coin in coins:
        for i in range(coin, amount + 1):
            dp[i] += dp[i - coin]

    return dp[amount]
    # For amount=4, coins=[1,2]: returns 3 (correct)
```

### Mistake 2: Not Initializing Base Case
```python
# WRONG: Missing dp[0] = 1
def change(amount, coins):
    dp = [0] * (amount + 1)
    # Missing: dp[0] = 1

    for coin in coins:
        for i in range(coin, amount + 1):
            dp[i] += dp[i - coin]

    return dp[amount]
    # Always returns 0 because nothing gets added!

# CORRECT: Initialize base case
def change(amount, coins):
    dp = [0] * (amount + 1)
    dp[0] = 1  # One way to make 0: use no coins

    for coin in coins:
        for i in range(coin, amount + 1):
            dp[i] += dp[i - coin]

    return dp[amount]
```

### Mistake 3: Starting Inner Loop from 0 Instead of coin
```python
# WRONG: Accessing dp[negative index]
def change(amount, coins):
    dp = [0] * (amount + 1)
    dp[0] = 1

    for coin in coins:
        for i in range(0, amount + 1):  # Wrong: starts from 0
            if i >= coin:  # Need this check, but inefficient
                dp[i] += dp[i - coin]

    return dp[amount]

# CORRECT: Start from coin value
def change(amount, coins):
    dp = [0] * (amount + 1)
    dp[0] = 1

    for coin in coins:
        for i in range(coin, amount + 1):  # Correct: starts from coin
            dp[i] += dp[i - coin]

    return dp[amount]
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| Coin Change (Minimum Coins) | Find minimum coins instead of counting ways | Medium |
| Combination Sum IV | Count permutations instead of combinations | Medium |
| Perfect Squares | Special case with coins = [1,4,9,16,...] | Medium |
| Partition Equal Subset Sum | 0/1 knapsack variant | Medium |
| Target Sum | Add +/- signs to reach target | Medium |

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Practice Checklist

- [ ] Solve using 2D DP approach (Day 1)
- [ ] Solve using optimized 1D DP (Day 1)
- [ ] Verify understanding by trying wrong loop order (Day 1)
- [ ] Solve Coin Change I (minimum coins) variant (Day 3)
- [ ] Compare combinations vs permutations approach (Day 7)
- [ ] Solve without looking at notes (Day 14)
- [ ] Teach the solution to someone else (Day 30)

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
