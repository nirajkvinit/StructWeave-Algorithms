---
id: E119
old_id: I121
slug: coin-change
title: Coin Change
difficulty: easy
category: easy
topics: ["array"]
patterns: ["backtrack-combination", "dp-1d"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E117", "M015", "M016"]
prerequisites: ["arrays", "dynamic-programming", "greedy-algorithms"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Coin Change

## Problem

Imagine you're building a cash register system that needs to give change using the fewest coins possible. Given an array `coins` containing different coin denominations and a target `amount` representing a dollar value, determine the minimum number of coins needed to make that exact amount.

For example, with coins of denominations [1, 2, 5] and a target amount of 11, you could use eleven 1-cent coins, but the optimal solution uses just three coins: 5 + 5 + 1. Your task is to find this minimum count.

You have an unlimited supply of each coin denomination. If it's impossible to make the exact amount using the available coins, return -1. For instance, if you only have 2-cent coins and need to make 3 cents, there's no valid combination.

Note that this problem is trickier than it might first appear. A greedy approach (always choosing the largest coin first) doesn't work for all coin systems. For coins [1, 3, 4] and amount 6, the greedy approach gives 4+1+1=3 coins, but the optimal solution is 3+3=2 coins. This is why dynamic programming is the key to solving this correctly.

## Why This Matters

The coin change problem is a classic dynamic programming challenge that appears in financial software, vending machine logic, and currency exchange systems. It teaches you to recognize when greedy algorithms fail and why you need to consider all possibilities through dynamic programming. This problem is one of the most frequently asked interview questions because it tests your ability to break down a complex problem into smaller subproblems and build up a solution systematically. The techniques you learn here apply to resource allocation, optimization problems, and making change in any currency system worldwide.

## Examples

**Example 1:**
- Input: `coins = [1,2,5], amount = 11`
- Output: `3`
- Explanation: The amount 11 can be formed using three coins: 5 + 5 + 1

**Example 2:**
- Input: `coins = [2], amount = 3`
- Output: `-1`
- Explanation: It's impossible to form 3 using only coins of value 2

**Example 3:**
- Input: `coins = [1], amount = 0`
- Output: `0`
- Explanation: Zero coins are needed to make an amount of 0

## Constraints

- The coins array contains between 1 and 12 elements
- Each coin value is at least 1 and at most 2³¹ - 1
- The target amount ranges from 0 to 10⁴

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Hint 1: Intuition (Beginner)
Think about building up to the target amount. To make amount 11, you need to know the minimum coins for smaller amounts first. For example, if you use a coin of value 5, you need the minimum coins to make 11-5=6. This suggests breaking the problem into smaller subproblems. Can you see why greedy (always picking the largest coin) doesn't always work?

### Hint 2: Optimization (Intermediate)
Use dynamic programming with a 1D array where dp[i] represents the minimum coins needed to make amount i. For each amount from 1 to target, try using each coin and take the minimum. The recurrence is: dp[i] = min(dp[i], dp[i-coin] + 1) for each valid coin. Initialize dp[0] = 0 and all other positions to infinity.

### Hint 3: Implementation Details (Advanced)
Create a DP array of size amount+1, initialized with amount+1 (representing impossible). Set dp[0]=0 as base case. For each value i from 1 to amount, iterate through each coin c. If i >= c, update dp[i] = min(dp[i], dp[i-c] + 1). After processing, return dp[amount] if it's not the impossible value, else return -1. Time: O(amount * coins), Space: O(amount).

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Dynamic Programming (Bottom-up) | O(amount * n) | O(amount) | n = number of coin types |
| DP with memoization (Top-down) | O(amount * n) | O(amount) | Recursion + cache |
| Greedy (incorrect) | O(n log n) | O(1) | Doesn't work for all cases |
| BFS approach | O(amount * n) | O(amount) | Level-by-level exploration |

## Common Mistakes

### Mistake 1: Using Greedy Algorithm
```python
# Wrong: Greedy doesn't always give optimal solution
def coinChange(coins, amount):
    coins.sort(reverse=True)
    count = 0
    for coin in coins:
        count += amount // coin  # Takes largest coins first
        amount %= coin
    return count if amount == 0 else -1
# Fails for coins=[1,3,4], amount=6 (greedy: 4+1+1=3, optimal: 3+3=2)
```
**Fix:** Use dynamic programming to consider all possibilities.

### Mistake 2: Wrong DP Initialization
```python
# Wrong: Initializing with 0 or wrong values
def coinChange(coins, amount):
    dp = [0] * (amount + 1)  # Should be infinity!
    dp[0] = 0
```
**Fix:** Initialize with amount+1 or float('inf') to represent impossible amounts, except dp[0]=0.

### Mistake 3: Not Checking Validity
```python
# Wrong: Not validating the final answer
def coinChange(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    # ... DP logic ...
    return dp[amount]  # Might return infinity!
```
**Fix:** Check if dp[amount] is still infinity before returning; if so, return -1.

## Variations

| Variation | Description | Difficulty | Key Difference |
|-----------|-------------|------------|----------------|
| Coin Change II | Count number of combinations | Medium | Count ways instead of minimum |
| Minimum Coin Sum | Minimize total value used | Medium | Different optimization target |
| Coin Change with Limit | Limited coins per denomination | Medium | Add coin count constraint |
| Perfect Squares | Special case with square numbers | Medium | Coins are perfect squares |

## Practice Checklist

Study Plan:
- [ ] Day 1: Understand why greedy fails, write recursive solution
- [ ] Day 3: Implement bottom-up DP, handle edge cases
- [ ] Day 7: Optimize space if possible, solve without hints
- [ ] Day 14: Implement top-down DP, compare approaches
- [ ] Day 30: Speed solve (< 15 minutes), explain to someone

Key Mastery Indicators:
- Can explain why greedy approach fails
- Correctly initialize and update DP array
- Handle impossible cases (return -1)
- Understand the recurrence relation

**Strategy**: See [Dynamic Programming](../strategies/patterns/dynamic-programming.md)
