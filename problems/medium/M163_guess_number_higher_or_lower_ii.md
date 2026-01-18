---
id: M163
old_id: I174
slug: guess-number-higher-or-lower-ii
title: Guess Number Higher or Lower II
difficulty: medium
category: medium
topics: ["dynamic-programming", "game-theory"]
patterns: ["minimax", "dp-2d"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E278", "M375", "M464"]
prerequisites: ["minimax-algorithm", "2d-dp", "game-theory", "memoization"]
---
# Guess Number Higher or Lower II

## Problem

This is a variation of the guessing game where wrong guesses cost you money. Imagine playing a game where someone picks a secret number between `1` and `n`, and you have to guess it. Each time you guess wrong, you pay an amount equal to your guess value, but you receive helpful feedback—either "higher" or "lower"—pointing you toward the answer. A correct guess wins immediately and costs nothing for that final guess. The catch is that you have a limited budget, and running out of money means you lose even if you haven't found the answer. Your challenge is to determine the minimum amount of money you need to guarantee you can win in the absolute worst-case scenario—meaning regardless of which number was picked and assuming the feedback always forces you down the most expensive path. For example, with `n = 10`, you need a strategy where even if luck works against you completely, you still have enough funds to identify any possible secret number. This requires thinking adversarially: what's the optimal guessing strategy that minimizes your maximum possible cost?


**Diagram:**

```
Example: n = 10
Decision tree for optimal strategy (showing worst-case costs):

                        Guess 7 (cost: 7)
                       /                 \
              1-6 range                  8-10 range
             /                                    \
      Guess 4 (cost: 4)                    Guess 9 (cost: 9)
      /            \                        /            \
  1-3 range      5-6 range              8 or 10       (found)

Total worst-case cost = 7 + 4 = 11 (if secret is in 1-3)
                     or 7 + 9 = 16 (if secret is 8 or 10)

Optimal strategy minimizes the maximum cost across all possibilities.

For n = 10, the minimum amount needed to guarantee a win is 16.
```


## Why This Matters

This problem teaches minimax strategy, a fundamental concept in game theory where you minimize your maximum loss against an adversarial opponent. This principle powers AI in games like chess, checkers, and Go, where the computer assumes the opponent will make optimal moves and plans accordingly. In cybersecurity, penetration testers use minimax thinking to find vulnerabilities by assuming attackers will exploit the worst-case breach points. Resource allocation problems in operations research apply this when planning for worst-case demand scenarios—hospitals determining bed capacity, logistics companies planning fleet sizes, or cloud providers allocating servers. Financial risk management uses minimax strategies for portfolio optimization, determining the safest investment mix under worst-case market conditions. Competitive gaming AI, algorithmic trading systems, and even contract negotiations rely on finding strategies that guarantee acceptable outcomes even when circumstances turn unfavorable. This problem is a simplified version of decision-making under adversarial uncertainty.

## Examples

**Example 1:**
- Input: `n = 1`
- Output: `0`
- Note: With only one option, you know the answer immediately without any wrong guesses

**Example 2:**
- Input: `n = 2`
- Output: `1`
- Note: Consider this strategy - guess 1 first:
    - If correct, you pay nothing
    - If wrong, you pay $1 and then know it must be 2
- The worst outcome costs $1

## Constraints

- 1 <= n <= 200

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Minimax Strategy</summary>

This is a classic minimax problem. For each possible guess x in range [i, j], you pay x and then face the worst case between [i, x-1] or [x+1, j]. You want to minimize the maximum cost. The adversary (fate) always picks the more expensive subproblem.
</details>

<details>
<summary>🎯 Hint 2: Dynamic Programming Formulation</summary>

Let dp[i][j] = minimum cost to guarantee a win for range [i, j]

For each range [i, j], try every possible guess k:
- Cost if you guess k = k + max(dp[i][k-1], dp[k+1][j])
- Take the minimum across all possible k values

Base cases:
- dp[i][i] = 0 (only one number, no cost)
- dp[i][i+1] = i (two numbers, guess the smaller one)
</details>

<details>
<summary>📝 Hint 3: Bottom-Up Implementation</summary>

Pseudocode:
```
function getMoneyAmount(n):
    dp = 2D array of size (n+2) x (n+2), initialized to 0

    // Process by increasing range length
    for length from 2 to n:
        for start from 1 to n - length + 1:
            end = start + length - 1
            dp[start][end] = infinity

            // Try each guess in range
            for guess from start to end:
                left_cost = dp[start][guess - 1]
                right_cost = dp[guess + 1][end]
                worst_case = guess + max(left_cost, right_cost)
                dp[start][end] = min(dp[start][end], worst_case)

    return dp[1][n]
```
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursive Brute Force | O(n!) | O(n) | Exponential due to trying all guess sequences |
| Memoization (Top-Down DP) | O(n³) | O(n²) | Cache results for each range |
| **Bottom-Up DP** | **O(n³)** | **O(n²)** | Three nested loops; most straightforward |

## Common Mistakes

**Mistake 1: Using binary search approach**
```python
# Wrong: Binary search minimizes average case, not worst case
def getMoneyAmount(n):
    cost = 0
    left, right = 1, n
    while left < right:
        mid = (left + right) // 2
        cost += mid  # This doesn't guarantee worst-case optimality
        left = mid + 1
    return cost
```

**Mistake 2: Not considering all possible guesses**
```python
# Wrong: Only checking middle values
def getMoneyAmount(n):
    dp = [[0] * (n + 1) for _ in range(n + 1)]
    for length in range(2, n + 1):
        for start in range(1, n - length + 2):
            end = start + length - 1
            mid = (start + end) // 2
            # Wrong: must try all guesses, not just middle
            dp[start][end] = mid + max(dp[start][mid-1], dp[mid+1][end])
```

```python
# Correct: Try all possible guesses
def getMoneyAmount(n):
    dp = [[0] * (n + 2) for _ in range(n + 2)]

    for length in range(2, n + 1):
        for start in range(1, n - length + 2):
            end = start + length - 1
            dp[start][end] = float('inf')

            for guess in range(start, end + 1):
                cost = guess + max(dp[start][guess - 1], dp[guess + 1][end])
                dp[start][end] = min(dp[start][end], cost)

    return dp[1][n]
```

**Mistake 3: Wrong base case handling**
```python
# Wrong: Not initializing boundary conditions properly
def getMoneyAmount(n):
    dp = [[0] * (n + 1) for _ in range(n + 1)]
    # Missing: proper array size and boundary handling
    # Should be (n+2) x (n+2) to handle out-of-bounds access
```

## Variations

| Variation | Difference | Hint |
|-----------|-----------|------|
| Minimize expected cost | Average case instead of worst case | Use probability-weighted DP |
| Limited guesses | Maximum k guesses allowed | Add dimension for remaining guesses |
| Non-uniform costs | Different cost per guess | Modify cost calculation in DP transition |
| Multi-player | Competitive guessing game | Extend to full game tree with alternating players |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Attempted again after 1 day
- [ ] Attempted again after 3 days
- [ ] Attempted again after 1 week
- [ ] Attempted again after 2 weeks
