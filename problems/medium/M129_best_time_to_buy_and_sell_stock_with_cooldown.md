---
id: M129
old_id: I108
slug: best-time-to-buy-and-sell-stock-with-cooldown
title: Best Time to Buy and Sell Stock with Cooldown
difficulty: medium
category: medium
topics: ["array", "dynamic-programming"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/patterns/dynamic-programming.md
frequency: high
related_problems: ["E078", "M046", "M047"]
prerequisites: ["dynamic-programming", "state-machine", "array-traversal"]
---
# Best Time to Buy and Sell Stock with Cooldown

## Problem

You're designing a stock trading strategy where you receive an array `prices` representing the stock price on each day (so `prices[i]` is the price on day i). Your goal is to determine the maximum profit you can achieve by making as many buy-sell transactions as you want - you can buy and sell the stock multiple times over the time period. However, there are two important constraints that make this trickier than simply buying low and selling high.

First, you cannot hold multiple shares simultaneously. You must sell any stock you're holding before you can buy again - no concurrent positions allowed. Second, and more importantly, after you sell stock on any day, you must wait through a mandatory one-day cooldown period before you can buy again. For example, if you sell on day 5, the earliest you can buy is day 7 (day 6 is the cooldown). This cooldown period prevents you from making back-to-back transactions and forces you to think carefully about timing.

Consider the example `prices = [1,2,3,0,2]`. An optimal strategy is: buy on day 0 (price 1), sell on day 1 (price 2, profit +1), cooldown on day 2, buy on day 3 (price 0), sell on day 4 (price 2, profit +2), for a total profit of 3. Notice you can't buy on day 2 even though the price is higher, because you're forced to cooldown after selling on day 1. Edge cases include single-day arrays (no transactions possible, profit is 0), arrays with only decreasing prices (best strategy is don't buy at all), and arrays with oscillating prices where you need to carefully choose which peaks and valleys to trade on considering the cooldown constraint.

## Why This Matters

This problem models state-dependent decision making that appears throughout algorithmic trading, resource scheduling, and optimization under constraints. Automated trading systems implement sophisticated strategies with cooldown periods, margin requirements, and position limits that create complex state dependencies between actions. Task scheduling systems allocate resources where certain operations require mandatory waiting periods or setup times between executions, like CPU context switches or database connection pooling. Energy management systems optimize when to charge and discharge batteries with cooldown constraints to prevent degradation. Manufacturing systems schedule machine operations where tools need cooldown or calibration periods between production runs. Video game AI plans action sequences where abilities have cooldown timers preventing immediate reuse. The algorithmic approach uses dynamic programming with state machines, tracking multiple states simultaneously: holding stock, not holding stock and able to buy (resting), and not holding stock but in cooldown. The key insight is modeling valid state transitions: you can only buy from the rest state, selling enters cooldown, and cooldown transitions to rest, creating recurrence relations that efficiently compute optimal profit without exploring the exponential space of all possible transaction sequences.

## Examples

**Example 1:**
- Input: `prices = [1,2,3,0,2]`
- Output: `3`
- Explanation: Optimal transaction sequence: [buy, sell, cooldown, buy, sell]

**Example 2:**
- Input: `prices = [1]`
- Output: `0`

## Constraints

- 1 <= prices.length <= 5000
- 0 <= prices[i] <= 1000

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: State Machine Modeling</summary>

Think of this as a state machine problem. At any given day, you can be in one of three states: holding a stock, not holding a stock and able to buy, or not holding a stock but in cooldown. Each state transitions to specific other states based on your actions (buy, sell, or rest).
</details>

<details>
<summary>🎯 Hint 2: Dynamic Programming States</summary>

Define three DP arrays:
- `held[i]` = max profit on day i while holding stock
- `sold[i]` = max profit on day i after selling stock (enters cooldown)
- `rest[i]` = max profit on day i while not holding stock and not in cooldown

The cooldown constraint means: if you sell on day i, you cannot buy on day i+1.
</details>

<details>
<summary>📝 Hint 3: State Transitions</summary>

Recurrence relations:
1. `held[i] = max(held[i-1], rest[i-1] - prices[i])` (keep holding or buy today)
2. `sold[i] = held[i-1] + prices[i]` (must have held stock yesterday to sell today)
3. `rest[i] = max(rest[i-1], sold[i-1])` (continue resting or cooldown from yesterday's sale)

Base cases: `held[0] = -prices[0]`, `sold[0] = 0`, `rest[0] = 0`
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (All Paths) | O(3^n) | O(n) | Try all buy/sell/rest combinations |
| DP with 3 States | O(n) | O(n) | Track held/sold/rest arrays |
| **DP Space Optimized** | **O(n)** | **O(1)** | **Only need previous day's states** |
| State Machine DP | O(n) | O(1) | Cleaner variable naming |

## Common Mistakes

### Mistake 1: Forgetting Cooldown After Selling

```python
# WRONG: Allowing immediate buy after sell
def maxProfit(prices):
    hold, nothold = -prices[0], 0
    for price in prices[1:]:
        hold = max(hold, nothold - price)  # Can't buy immediately after sell!
        nothold = max(nothold, hold + price)
    return nothold
```

```python
# CORRECT: Track cooldown state explicitly
def maxProfit(prices):
    if not prices:
        return 0

    held = -prices[0]
    sold = 0
    rest = 0

    for price in prices[1:]:
        prev_held = held
        prev_sold = sold
        prev_rest = rest

        held = max(prev_held, prev_rest - price)  # Can only buy from rest
        sold = prev_held + price
        rest = max(prev_rest, prev_sold)

    return max(sold, rest)
```

### Mistake 2: Incorrect State Transition Order

```python
# WRONG: Updating states in wrong order causes dependency issues
def maxProfit(prices):
    held, sold, rest = -prices[0], 0, 0
    for price in prices[1:]:
        held = max(held, rest - price)
        rest = max(rest, sold)  # Using current sold instead of previous!
        sold = held + price
    return max(sold, rest)
```

```python
# CORRECT: Save previous values before updating
def maxProfit(prices):
    held, sold, rest = -prices[0], 0, 0
    for price in prices[1:]:
        new_held = max(held, rest - price)
        new_sold = held + price
        new_rest = max(rest, sold)

        held, sold, rest = new_held, new_sold, new_rest
    return max(sold, rest)
```

### Mistake 3: Not Handling Single Day Case

```python
# WRONG: Assumes at least 2 days
def maxProfit(prices):
    held = -prices[0]
    sold = held + prices[1]  # IndexError if len(prices) == 1
    return max(sold, 0)
```

```python
# CORRECT: Handle edge cases
def maxProfit(prices):
    if len(prices) <= 1:
        return 0

    held, sold, rest = -prices[0], float('-inf'), 0
    for price in prices[1:]:
        held, sold, rest = (
            max(held, rest - price),
            held + price,
            max(rest, sold)
        )
    return max(sold, rest)
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| No Cooldown | Unlimited transactions | Simpler 2-state DP |
| K Transactions | Limited to k transactions | Add transaction counter dimension |
| Transaction Fee | Fee charged per transaction | Subtract fee from profit |
| 2-Day Cooldown | Cooldown lasts 2 days | Extend rest state tracking |
| Multiple Stocks | Can hold multiple stocks | Track quantity in state |
| Min Transactions | Minimize number of transactions for target profit | Reverse optimization goal |

## Practice Checklist

- [ ] Day 1: Implement 3-state DP solution
- [ ] Day 2: Optimize to O(1) space
- [ ] Day 3: Solve without hints
- [ ] Day 7: Draw state machine diagram
- [ ] Day 14: Speed test - solve in 20 minutes
- [ ] Day 30: Solve related stock problems

**Strategy**: See [Array Pattern](../strategies/patterns/dynamic-programming.md)
