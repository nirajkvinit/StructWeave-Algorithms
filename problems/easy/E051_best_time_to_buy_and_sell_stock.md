---
id: E051
old_id: F121
slug: best-time-to-buy-and-sell-stock
title: Best Time to Buy and Sell Stock
difficulty: easy
category: easy
topics: ["array", "dynamic-programming"]
patterns: ["one-pass", "greedy"]
estimated_time_minutes: 15
frequency: high
related_problems: ["M122", "M123", "E053"]
prerequisites: ["arrays", "max-min-tracking", "greedy-algorithms"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Best Time to Buy and Sell Stock

## Problem

You have an array `prices` where `prices[i]` is the stock price on day `i`. Find the maximum profit you can achieve from **one buy** and **one sell**.

**The rules:**
- You must buy before you sell (can't sell then buy)
- You can only make one transaction (one purchase, one sale)
- If no profit is possible, return 0 (don't trade at all)

For example, with prices [7, 1, 5, 3, 6, 4]:
- Best move: buy on day 2 (price=1), sell on day 5 (price=6)
- Profit: 6 - 1 = 5

**Why you can't just find min and max:** You need to buy BEFORE you sell. In [7, 6, 4, 3, 1], the minimum is on the last day - but you can't sell before buying, so max profit is 0.

**Watch out for:** Prices can stay flat or constantly decrease. In those cases, return 0 - no trade is better than a loss.

## Why This Matters

This problem teaches the **track minimum, update maximum** pattern that appears throughout optimization problems. The same technique applies to finding maximum subarray sum (Kadane's algorithm), longest increasing subsequence, and many dynamic programming problems.

In real applications, this pattern powers stock trading algorithms, resource allocation systems, and scheduling optimizers. The ability to make optimal decisions with a single pass through data is crucial for real-time systems processing financial data or sensor readings.

## Examples

**Example 1:**
- Input: `prices = [7,1,5,3,6,4]`
- Output: `5`
- Explanation: Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.
Note that buying on day 2 and selling on day 1 is not allowed because you must buy before you sell.

**Example 2:**
- Input: `prices = [7,6,4,3,1]`
- Output: `0`
- Explanation: In this case, no transactions are done and the max profit = 0.

## Constraints

- 1 <= prices.length <= 10⁵
- 0 <= prices[i] <= 10⁴

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Buy Low, Sell High</summary>

The key insight: you want to buy at the lowest price seen so far, and sell at the current price if it gives maximum profit. As you iterate through prices, what information do you need to track? Think about what you'd want to remember from all previous days.

</details>

<details>
<summary>🎯 Hint 2: Single Pass Tracking</summary>

You can solve this in one pass by tracking:
1. The minimum price seen so far (potential buy point)
2. The maximum profit seen so far

At each price, you can:
- Calculate profit if you sold today (current price - min price)
- Update maximum profit if needed
- Update minimum price if current price is lower

Can you implement this in O(n) time and O(1) space?

</details>

<details>
<summary>📝 Hint 3: Implementation Blueprint</summary>

```
function maxProfit(prices):
    1. Initialize minPrice = infinity (or prices[0])
    2. Initialize maxProfit = 0

    3. For each price in prices:
         a. If price < minPrice:
              minPrice = price

         b. Calculate current profit = price - minPrice

         c. If current profit > maxProfit:
              maxProfit = current profit

    4. Return maxProfit
```

Note: You don't need to track when to buy/sell, just the maximum profit.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check all pairs (buy, sell) |
| **One Pass** | **O(n)** | **O(1)** | Track min price and max profit |
| Kadane's Algorithm | O(n) | O(1) | Transform to max subarray problem |

## Common Mistakes

### 1. Not tracking minimum price
```python
# WRONG: Comparing adjacent days only
def maxProfit(prices):
    max_profit = 0
    for i in range(1, len(prices)):
        profit = prices[i] - prices[i-1]
        max_profit = max(max_profit, profit)
    return max_profit
# Misses opportunities like [7,1,5] where buy on day 1, sell on day 2

# CORRECT: Track global minimum
def maxProfit(prices):
    min_price = float('inf')
    max_profit = 0
    for price in prices:
        min_price = min(min_price, price)
        max_profit = max(max_profit, price - min_price)
    return max_profit
```

### 2. Allowing negative profit
```python
# WRONG: Returning negative profit
def maxProfit(prices):
    min_price = prices[0]
    max_profit = -float('inf')  # Wrong initialization
    for price in prices[1:]:
        max_profit = max(max_profit, price - min_price)
        min_price = min(min_price, price)
    return max_profit
# Returns negative for decreasing array

# CORRECT: Initialize to 0 (no transaction)
def maxProfit(prices):
    min_price = float('inf')
    max_profit = 0  # At worst, no transaction
    for price in prices:
        min_price = min(min_price, price)
        max_profit = max(max_profit, price - min_price)
    return max_profit
```

### 3. Updating min_price after calculating profit
```python
# WRONG: Order matters!
def maxProfit(prices):
    min_price = prices[0]
    max_profit = 0
    for price in prices:
        min_price = min(min_price, price)  # Update min first
        max_profit = max(max_profit, price - min_price)  # Then calc profit
    return max_profit
# This gives profit = 0 when buying and selling same day

# CORRECT: Calculate profit first, then update min
def maxProfit(prices):
    min_price = float('inf')
    max_profit = 0
    for price in prices:
        max_profit = max(max_profit, price - min_price)
        min_price = min(min_price, price)
    return max_profit
# Or update min first but use previous min for profit
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Best Time II | Multiple transactions allowed | Greedy: sum all positive differences |
| Best Time III | At most 2 transactions | DP with 4 states (buy1, sell1, buy2, sell2) |
| Best Time IV | At most k transactions | DP with 2k states or optimized space |
| With cooldown | 1 day cooldown after sell | DP with 3 states (hold, sold, rest) |
| With fee | Transaction fee on each sale | Subtract fee from profit calculation |

## Practice Checklist

**Correctness:**
- [ ] Handles single element array (returns 0)
- [ ] Handles strictly decreasing prices (returns 0)
- [ ] Handles strictly increasing prices (returns last - first)
- [ ] Handles valley-peak pattern correctly
- [ ] No negative profit returned

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 5 minutes
- [ ] Can discuss why O(n) is optimal
- [ ] Can extend to Best Time II (unlimited transactions)

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve Best Time II variation
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Array Pattern](../../strategies/patterns/dynamic-programming.md)
