---
id: M349
old_id: A181
slug: best-time-to-buy-and-sell-stock-with-transaction-fee
title: Best Time to Buy and Sell Stock with Transaction Fee
difficulty: medium
category: medium
topics: ["array", "dynamic-programming"]
patterns: ["state-machine-dp"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E121", "M122", "M309", "M188"]
prerequisites: ["dynamic-programming", "state-machines"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Best Time to Buy and Sell Stock with Transaction Fee

## Problem

You're given an array `prices` where `prices[i]` represents the stock price on day `i`, and an integer `fee` representing a transaction fee charged on each completed trade. Find the maximum profit you can achieve through any number of buy and sell operations.

The constraints are:
- You can only hold at most one share of stock at any time. This means you must sell your current stock before buying again
- The transaction fee is charged once per complete buy-sell cycle (you can deduct it on either the buy or sell, but not both)
- You can perform as many transactions as you want, but each incurs the fee

This is a dynamic programming problem where you need to track states. At any point in time, you're in one of two states: either holding a share of stock, or not holding one. Each day, you can transition between these states (buy or sell) or stay in the same state (hold or wait).

The key challenge is deciding when to buy and sell to maximize profit after accounting for fees. Unlike the version without fees where you'd trade on every profitable opportunity, here you need to ensure the price difference exceeds the fee to make trading worthwhile.

Think of it as a state machine: you have a "hold" state and a "not holding" state, and each day you can transition or stay, with associated costs and profits for each action.

## Why This Matters

This problem models real-world trading scenarios where transaction costs significantly impact profitability, applicable to stock trading apps, cryptocurrency exchanges, and algorithmic trading systems. The state machine dynamic programming pattern you'll learn is fundamental to decision-making under constraints, appearing in resource allocation, inventory management, and game AI. Understanding how to model problems with states and transitions is crucial for technical interviews at quantitative trading firms and fintech companies, and the pattern extends to problems like house robber, scheduling with cooldown, and finite state machines.

## Examples

**Example 1:**
- Input: `prices = [1,3,2,8,4,9], fee = 2`
- Output: `8`
- Explanation: Optimal profit comes from:
- Purchase on day 0 at price 1
- Sell on day 3 at price 8
- Purchase on day 4 at price 4
- Sell on day 5 at price 9
Total calculation: ((8 - 1) - 2) + ((9 - 4) - 2) = 8.

**Example 2:**
- Input: `prices = [1,3,7,5,10,3], fee = 3`
- Output: `6`

## Constraints

- 1 <= prices.length <= 5 * 10⁴
- 1 <= prices[i] < 5 * 10⁴
- 0 <= fee < 5 * 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: State Machine Thinking</summary>

At any point in time, you can be in one of two states:
1. **Holding stock**: You bought stock and haven't sold it yet
2. **Not holding stock**: You either haven't bought or already sold

For each day, you need to track the maximum profit in each state. The key question: given the profit in each state yesterday, what's the maximum profit in each state today?

Think about the transitions: How do you move from "not holding" to "holding"? How do you move from "holding" to "not holding"? What are the costs associated with each transition?
</details>

<details>
<summary>Hint 2: Dynamic Programming States</summary>

Define two DP arrays (or variables for space optimization):
- `hold[i]`: Maximum profit on day i if we're holding stock
- `notHold[i]`: Maximum profit on day i if we're not holding stock

Recurrence relations:
- `hold[i] = max(hold[i-1], notHold[i-1] - prices[i])`
  - Either we already held from yesterday, or we buy today
- `notHold[i] = max(notHold[i-1], hold[i-1] + prices[i] - fee)`
  - Either we didn't hold yesterday, or we sell today and pay the fee

Initial state: `hold[0] = -prices[0]` (bought on day 0), `notHold[0] = 0` (did nothing)
</details>

<details>
<summary>Hint 3: Space Optimization</summary>

Notice that each day's state only depends on the previous day. You don't need to store the entire history - just maintain two variables:
- `hold`: current max profit while holding stock
- `notHold`: current max profit while not holding stock

Update them in each iteration. Be careful about the order of updates - you need to use the previous values, so consider using temporary variables or update in the correct order.

Final answer: `notHold` (we want to end without holding stock to maximize profit)
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Try all combinations) | O(2^n) | O(n) | Exponential - impractical |
| DP with 2D array | O(n) | O(n) | Store all states for all days |
| DP with state variables | O(n) | O(1) | Optimal - only track current state |

## Common Mistakes

**Mistake 1: Deducting fee on every transaction instead of just sell**
```python
# Wrong - deducts fee on both buy and sell
def maxProfit(prices, fee):
    hold = -prices[0] - fee  # Wrong: fee applied on buy
    notHold = 0
    for price in prices[1:]:
        hold = max(hold, notHold - price - fee)  # Wrong again
        notHold = max(notHold, hold + price - fee)  # And here
    return notHold
```

**Mistake 2: Updating states in wrong order**
```python
# Wrong - updates hold first, then uses updated hold value
def maxProfit(prices, fee):
    hold = -prices[0]
    notHold = 0
    for price in prices[1:]:
        hold = max(hold, notHold - price)  # Updates hold
        notHold = max(notHold, hold + price - fee)  # Uses NEW hold value
    return notHold
# Fix: Use temp variables or update in correct order
```

**Mistake 3: Forgetting to handle edge cases**
```python
# Wrong - doesn't handle single day or no profit scenarios
def maxProfit(prices, fee):
    if len(prices) < 2:  # Missing edge case check
        return 0
    hold = -prices[0]
    notHold = 0
    for price in prices[1:]:
        newHold = max(hold, notHold - price)
        newNotHold = max(notHold, hold + price - fee)
        hold, notHold = newHold, newNotHold
    return notHold  # Could be negative if fee > all price differences
    # Should return max(0, notHold) in some interpretations
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Best Time to Buy and Sell Stock (1 transaction) | Easy | Only one buy-sell allowed, simpler tracking |
| Best Time to Buy and Sell Stock II (unlimited) | Medium | No transaction fee, greedy works |
| Best Time to Buy and Sell Stock with Cooldown | Medium | Must wait 1 day after selling, 3 states needed |
| Best Time to Buy and Sell Stock IV (k transactions) | Hard | Limited transactions, need to track k states |
| With multiple fees (buy fee + sell fee) | Medium | Apply fees at both transitions |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Practiced again (1 day later)
- [ ] Practiced again (3 days later)
- [ ] Practiced again (1 week later)
- [ ] Can solve in under 25 minutes
- [ ] Can explain solution clearly
- [ ] Implemented optimal O(1) space solution
- [ ] Handled all edge cases
- [ ] Tested with fee > max price difference

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
