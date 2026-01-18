---
id: M074
old_id: F178
slug: best-time-to-buy-and-sell-stock-iv
title: Best Time to Buy and Sell Stock IV
difficulty: medium
category: medium
topics: ["array", "dynamic-programming"]
patterns: ["dp-states"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M072", "M073", "E001"]
prerequisites: ["dynamic-programming", "state-machine", "optimization"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Best Time to Buy and Sell Stock IV

## Problem

You are given an array of stock prices where prices[i] represents the price on day i, and an integer k representing the maximum number of transactions you can complete. A transaction consists of buying and then selling one share of stock, and you cannot hold multiple shares simultaneously (you must sell before buying again). Find the maximum profit you can achieve with at most k transactions. The challenge is handling different values of k - small k requires careful transaction tracking, while large k (greater than half the number of days) effectively allows unlimited transactions. Consider edge cases like k=0 (no transactions allowed), prices that only decrease (best profit is 0), and when k is larger than the number of possible transactions. This is a complex optimization problem that requires tracking multiple states: which transaction you're on, which day it is, and whether you're currently holding stock.

## Why This Matters

This problem models real-world portfolio optimization where regulatory constraints limit trading frequency. Hedge funds and algorithmic trading systems face similar constraints with Pattern Day Trader rules (limiting transactions to avoid penalties) and need to maximize returns within those bounds. Risk management systems use this dynamic programming pattern to optimize trade execution when transaction costs or regulatory limits apply. The state-machine thinking required here - tracking buy/sell states across multiple transactions - directly applies to workflow optimization, resource allocation with capacity constraints, and scheduling problems where you can only perform k actions. The technique of optimizing the algorithm based on input characteristics (handling large k differently) teaches important practical optimization skills used in production systems. Understanding when a problem simplifies under certain conditions is crucial for building efficient real-world applications.

## Examples

**Example 1:**
- Input: `k = 2, prices = [2,4,1]`
- Output: `2`
- Explanation: Buy on day 1 (price = 2) and sell on day 2 (price = 4), profit = 4-2 = 2.

**Example 2:**
- Input: `k = 2, prices = [3,2,6,5,0,3]`
- Output: `7`
- Explanation: Buy on day 2 (price = 2) and sell on day 3 (price = 6), profit = 6-2 = 4. Then buy on day 5 (price = 0) and sell on day 6 (price = 3), profit = 3-0 = 3.

## Constraints

- 1 <= k <= 100
- 1 <= prices.length <= 1000
- 0 <= prices[i] <= 1000

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: State Machine Thinking</summary>

At each day, you're in one of several states: you can hold stock (from transaction i) or not hold stock (completed transaction i). For k transactions, you need to track 2k states. What are the transitions between these states?

</details>

<details>
<summary>🎯 Hint 2: Dynamic Programming States</summary>

Define DP states:
- `buy[i][j]` = max profit after at most i transactions, currently holding stock on day j
- `sell[i][j]` = max profit after at most i transactions, not holding stock on day j

Transitions:
- `buy[i][j] = max(buy[i][j-1], sell[i-1][j-1] - prices[j])`
- `sell[i][j] = max(sell[i][j-1], buy[i][j-1] + prices[j])`

Special case: if k >= n/2, unlimited transactions (simplified problem).

</details>

<details>
<summary>📝 Hint 3: Space Optimization</summary>

The 2D DP can be optimized to 1D since we only need the previous day's values.

```python
# Space optimized approach
buy = [-float('inf')] * (k + 1)
sell = [0] * (k + 1)

for price in prices:
    for i in range(k, 0, -1):
        sell[i] = max(sell[i], buy[i] + price)
        buy[i] = max(buy[i], sell[i-1] - price)

return sell[k]
```

Time: O(n*k) or O(n) if k >= n/2
Space: O(k)

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (All Combinations) | O(n^k) | O(1) | Exponential - infeasible |
| 2D DP | O(n*k) | O(n*k) | Standard DP table |
| **1D DP (Optimized)** | **O(n*k)** | **O(k)** | Space optimized |
| **Special Case (k >= n/2)** | **O(n)** | **O(1)** | Greedy: unlimited transactions |

## Common Mistakes

### 1. Not Handling Large k

```python
# WRONG: Wastes computation when k is large
def maxProfit(k, prices):
    # Always use O(n*k) approach even if k >= len(prices)/2

# CORRECT: Optimize for large k
def maxProfit(k, prices):
    n = len(prices)
    if k >= n // 2:  # Effectively unlimited transactions
        return sum(max(0, prices[i+1] - prices[i])
                   for i in range(n-1))
    # ... else use DP
```

### 2. Incorrect State Initialization

```python
# WRONG: Wrong initial values
buy = [0] * (k + 1)  # Should be -infinity
sell = [0] * (k + 1)

# CORRECT: Can't hold stock initially without buying
buy = [-float('inf')] * (k + 1)
sell = [0] * (k + 1)
```

### 3. Wrong Update Order

```python
# WRONG: Updates buy before sell (uses updated sell value)
for i in range(1, k + 1):
    buy[i] = max(buy[i], sell[i-1] - price)
    sell[i] = max(sell[i], buy[i] + price)  # Uses new buy[i]!

# CORRECT: Update in reverse or use temporary variables
for i in range(k, 0, -1):
    sell[i] = max(sell[i], buy[i] + price)
    buy[i] = max(buy[i], sell[i-1] - price)
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Best Time to Buy/Sell Stock I | k = 1 | Simple one-pass tracking min price |
| Best Time to Buy/Sell Stock II | k = unlimited | Greedy: sum all positive differences |
| Best Time to Buy/Sell Stock III | k = 2 | DP with 2 transactions |
| With Cooldown | Must wait 1 day after sell | Add cooldown state to DP |
| With Transaction Fee | Pay fee per transaction | Subtract fee from sell transition |

## Practice Checklist

- [ ] Handles empty/edge cases (single day, k=0, all decreasing prices)
- [ ] Can explain approach in 2 min (DP with buy/sell states per transaction)
- [ ] Can code solution in 25 min
- [ ] Can discuss time/space complexity and optimization for large k
- [ ] Understands state transitions and initialization

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Dynamic Programming Pattern](../../strategies/patterns/dynamic-programming.md)
