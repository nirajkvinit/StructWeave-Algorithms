---
id: M052
old_id: F123
slug: best-time-to-buy-and-sell-stock-iii
title: Best Time to Buy and Sell Stock III
difficulty: medium
category: medium
topics: ["array", "dynamic-programming"]
patterns: ["state-machine-dp", "bidirectional-scan"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E121", "M051", "H188"]
prerequisites: ["dynamic-programming", "state-machines"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Best Time to Buy and Sell Stock III

## Problem

You're given an array of stock prices over time, and your task is to find the maximum profit you can achieve by completing at most two buy-sell transactions. The restriction is that you cannot hold multiple shares simultaneously, so you must sell before buying again. This is more challenging than the unlimited-transaction version because you need to strategically choose which one or two transactions maximize your profit. For instance, with prices [3,3,5,0,0,3,1,4], the optimal strategy is buying at 0, selling at 3 (profit 3), then buying at 1 and selling at 4 (profit 3), totaling 6. You might also make just one transaction if that's more profitable, or even zero transactions if prices only decrease. The key challenge is efficiently determining the best way to split your capital across at most two non-overlapping transactions. Consider edge cases like arrays where a single transaction beats two transactions, or where making no transactions is optimal.

## Why This Matters

This problem reflects real-world portfolio management where investors face transaction limits due to fees, tax considerations, or regulatory constraints. Understanding how to optimally allocate a limited number of trades appears in quantitative finance, where algorithms must balance opportunity cost against transaction costs. The state machine approach used here (tracking buy/sell states) extends to modeling complex decision processes like inventory management, resource scheduling, and multi-stage optimization problems. This teaches you how to use dynamic programming to track multiple interacting constraints, a pattern that appears frequently in system design and algorithmic trading platforms.

## Examples

**Example 1:**
- Input: `prices = [3,3,5,0,0,3,1,4]`
- Output: `6`
- Explanation: Buy on day 4 (price = 0) and sell on day 6 (price = 3), profit = 3-0 = 3.
Then buy on day 7 (price = 1) and sell on day 8 (price = 4), profit = 4-1 = 3.

**Example 2:**
- Input: `prices = [1,2,3,4,5]`
- Output: `4`
- Explanation: Buy on day 1 (price = 1) and sell on day 5 (price = 5), profit = 5-1 = 4.
Note that you cannot buy on day 1, buy on day 2 and sell them later, as you are engaging multiple transactions at the same time. You must sell before buying again.

**Example 3:**
- Input: `prices = [7,6,4,3,1]`
- Output: `0`
- Explanation: In this case, no transaction is done, i.e. max profit = 0.

## Constraints

- 1 <= prices.length <= 10⁵
- 0 <= prices[i] <= 10⁵

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Divide and Conquer Thinking</summary>

With at most two transactions, you can think of dividing the array into two parts: one transaction in the left part, one in the right part. At each split point, what's the maximum profit you could achieve from both sides combined? How efficiently can you compute this for all possible splits?

</details>

<details>
<summary>🎯 Hint 2: State Machine Approach</summary>

Think of this as having four states:
- After first buy (spent money once)
- After first sell (gained profit once)
- After second buy (spent profit + more money)
- After second sell (final profit)

Each day, you can either stay in your current state or transition to the next state. Track the maximum profit for each state.

</details>

<details>
<summary>📝 Hint 3: Four-Variable DP</summary>

**Pseudocode approach:**
1. Initialize four states:
   - buy1 = -prices[0] (bought once)
   - sell1 = 0 (sold once)
   - buy2 = -prices[0] (bought twice)
   - sell2 = 0 (sold twice)
2. For each price:
   - buy1 = max(buy1, -price)
   - sell1 = max(sell1, buy1 + price)
   - buy2 = max(buy2, sell1 - price)
   - sell2 = max(sell2, buy2 + price)
3. Return sell2

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Try All Splits) | O(n²) | O(1) | Check all ways to split into two transactions |
| Bidirectional DP | O(n) | O(n) | Compute max profit from left and right, combine |
| **State Machine DP** | **O(n)** | **O(1)** | Optimal - track four states with four variables |
| General K Transactions | O(kn) | O(k) | Extends to k transactions, overkill for k=2 |

## Common Mistakes

### 1. Forgetting "At Most" Means 0, 1, or 2
```python
# WRONG: Forcing exactly 2 transactions
def maxProfit(prices):
    # Always tries to make 2 transactions even when 1 is better
    # For [1,2,3,4,5], might incorrectly split into two smaller profits

# CORRECT: Allow fewer transactions if better
def maxProfit(prices):
    # State machine naturally handles 0, 1, or 2 transactions
    # sell2 will contain max of all scenarios
```

### 2. Incorrect State Transition Order
```python
# WRONG: Using updated values in same iteration
def maxProfit(prices):
    for price in prices:
        sell1 = max(sell1, buy1 + price)  # Updates sell1
        buy2 = max(buy2, sell1 - price)   # Uses NEW sell1! Wrong!

# CORRECT: Use previous iteration's values or update in right order
def maxProfit(prices):
    for price in prices:
        # Update in reverse to use old values
        sell2 = max(sell2, buy2 + price)
        buy2 = max(buy2, sell1 - price)
        sell1 = max(sell1, buy1 + price)
        buy1 = max(buy1, -price)
```

### 3. Wrong Initial Values
```python
# WRONG: Initializing buy states to 0
buy1 = 0
buy2 = 0
# This means "free" stock, wrong!

# CORRECT: Initialize buy states to first purchase cost
buy1 = -prices[0]  # Spent money to buy first stock
buy2 = -prices[0]  # Could buy second immediately
sell1 = 0          # Haven't sold yet
sell2 = 0          # Haven't completed second transaction
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Exactly 2 Transactions | Must make 2 | More complex validation, rare requirement |
| At Most K Transactions (H188) | Generalize to k | 2D DP with k dimension or 2k states |
| With Transaction Fee | Pay fee per transaction | Subtract fee in sell transitions |
| With Cooldown | Must wait 1 day after sell | Add cooldown state between transactions |
| Different Assets | Different price arrays | Track separately, more complex state |

## Practice Checklist

- [ ] Handles arrays where 1 transaction is optimal
- [ ] Can explain state machine approach in 2 min
- [ ] Can code four-variable solution in 15 min
- [ ] Can discuss why bidirectional scan works
- [ ] Understands extension to k transactions

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [State Machine Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
