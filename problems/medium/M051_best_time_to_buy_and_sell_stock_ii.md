---
id: M051
old_id: F122
slug: best-time-to-buy-and-sell-stock-ii
title: Best Time to Buy and Sell Stock II
difficulty: medium
category: medium
topics: ["array", "dynamic-programming", "greedy"]
patterns: ["greedy", "state-machine"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E121", "M052", "M309"]
prerequisites: ["array", "greedy-algorithms"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Best Time to Buy and Sell Stock II

## Problem

You're given an array of stock prices where each element represents the price of a stock on a particular day. Your goal is to maximize profit by buying and selling the stock multiple times. The key constraint is that you can only hold one share at a time, meaning you must sell before buying again. Unlike the classic single-transaction problem, you can make as many transactions as you want. For example, if prices are [7,1,5,3,6,4], you could buy at 1 and sell at 5 (profit 4), then buy at 3 and sell at 6 (profit 3), for a total profit of 7. The challenge is identifying the optimal strategy when unlimited transactions are allowed. Think about when it makes sense to buy and sell, and whether there's a pattern in capturing all profitable opportunities. Edge cases include prices that only decrease (no profit possible) and prices that only increase (one long transaction is optimal).

## Why This Matters

This problem models high-frequency trading strategies where algorithms execute multiple trades rapidly to capture small price movements. It's also relevant to understanding greedy algorithms, where making locally optimal choices (capturing every upward price movement) leads to a globally optimal solution. The insight that unlimited transactions allow you to decompose profit maximization into simpler subproblems appears in portfolio optimization and dynamic resource allocation. Mastering this helps you recognize when a complex-looking constraint (unlimited transactions) actually simplifies the problem rather than complicating it.

## Examples

**Example 1:**
- Input: `prices = [7,1,5,3,6,4]`
- Output: `7`
- Explanation: Buy on day 2 (price = 1) and sell on day 3 (price = 5), profit = 5-1 = 4.
Then buy on day 4 (price = 3) and sell on day 5 (price = 6), profit = 6-3 = 3.
Total profit is 4 + 3 = 7.

**Example 2:**
- Input: `prices = [1,2,3,4,5]`
- Output: `4`
- Explanation: Buy on day 1 (price = 1) and sell on day 5 (price = 5), profit = 5-1 = 4.
Total profit is 4.

**Example 3:**
- Input: `prices = [7,6,4,3,1]`
- Output: `0`
- Explanation: There is no way to make a positive profit, so we never buy the stock to achieve the maximum profit of 0.

## Constraints

- 1 <= prices.length <= 3 * 10⁴
- 0 <= prices[i] <= 10⁴

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Unlimited Transactions Insight</summary>

With unlimited transactions, you don't need to pick the absolute best buy/sell pair. Think about what happens to your profit if you can capture every single upward price movement. Can you collect all the profitable segments?

</details>

<details>
<summary>🎯 Hint 2: Greedy Observation</summary>

If price[i+1] > price[i], you can always buy at i and sell at i+1 to capture that profit. This is equivalent to "riding" every upward trend. The key insight: sum of individual gains = total gain, even if you combine multiple days into one transaction.

</details>

<details>
<summary>📝 Hint 3: Simple Greedy Algorithm</summary>

**Pseudocode approach:**
1. Initialize total_profit = 0
2. For each day i from 0 to n-2:
   - If prices[i+1] > prices[i]:
     - Add (prices[i+1] - prices[i]) to total_profit
3. Return total_profit

This works because: [1,3,5] gives same profit whether you buy at 1 and sell at 5, or buy at 1, sell at 3, buy at 3, sell at 5.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (All Combinations) | O(2^n) | O(n) | Try all possible buy/sell combinations |
| **Greedy (Sum All Gains)** | **O(n)** | **O(1)** | Optimal - capture every positive difference |
| Dynamic Programming | O(n) | O(1) | Overkill for this problem, same result |
| Peak-Valley Approach | O(n) | O(1) | Find valleys and peaks, more complex code |

## Common Mistakes

### 1. Overthinking with Complex DP
```python
# WRONG: Unnecessarily complex state machine
def maxProfit(prices):
    # Track: hold[i], sold[i], cooldown[i]...
    # Too complex for unlimited transactions!
    hold = [0] * len(prices)
    sold = [0] * len(prices)
    # ... many lines of complex logic

# CORRECT: Simple greedy approach
def maxProfit(prices):
    profit = 0
    for i in range(len(prices) - 1):
        if prices[i + 1] > prices[i]:
            profit += prices[i + 1] - prices[i]
    return profit
```

### 2. Trying to Track Actual Transactions
```python
# WRONG: Tracking buy/sell dates (unnecessary)
def maxProfit(prices):
    transactions = []
    buy_idx = 0
    for i in range(1, len(prices)):
        if prices[i] < prices[i-1]:
            transactions.append((buy_idx, i-1))
            buy_idx = i
    # Complex and error-prone

# CORRECT: Just accumulate profits
def maxProfit(prices):
    return sum(max(0, prices[i+1] - prices[i])
               for i in range(len(prices) - 1))
```

### 3. Not Handling Edge Cases
```python
# WRONG: Crashes on empty or single element
def maxProfit(prices):
    profit = 0
    for i in range(len(prices)):  # Will crash on prices[i+1]
        profit += max(0, prices[i+1] - prices[i])

# CORRECT: Proper bounds checking
def maxProfit(prices):
    if len(prices) <= 1:
        return 0
    profit = 0
    for i in range(len(prices) - 1):
        profit += max(0, prices[i+1] - prices[i])
    return profit
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| At Most 1 Transaction (E121) | Can only buy/sell once | Track minimum price and max profit so far |
| At Most 2 Transactions (M052) | Limited to 2 transactions | Use DP with state for transaction count |
| With Cooldown (M309) | Must wait 1 day after sell | State machine DP: hold, sold, cooldown |
| With Transaction Fee (M714) | Pay fee per transaction | Subtract fee from each profitable transaction |
| At Most K Transactions | Limited to k transactions | 2D DP with transaction count dimension |

## Practice Checklist

- [ ] Handles empty array and single element
- [ ] Can explain why greedy works in 2 min
- [ ] Can code solution in 5 min
- [ ] Can prove sum of gains = total gain
- [ ] Understands difference from single-transaction version

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Greedy Algorithms and Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
