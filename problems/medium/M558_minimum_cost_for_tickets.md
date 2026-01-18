---
id: M558
old_id: A450
slug: minimum-cost-for-tickets
title: Minimum Cost For Tickets
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Minimum Cost For Tickets

## Problem

You're planning train travel for specific days during the year and want to minimize ticket costs by choosing the right combination of passes. You have a `days` array containing all the days you need to travel (represented as integers from 1 to 365), and three ticket options with different durations and costs.

The three ticket types available are:

**1-Day Pass**: Costs `costs[0]` dollars
- Valid for exactly 1 day of travel

**7-Day Pass**: Costs `costs[1]` dollars
- Valid for 7 consecutive days starting from purchase day
- Example: Buy on day 5, covers days 5-11 inclusive

**30-Day Pass**: Costs `costs[2]` dollars
- Valid for 30 consecutive days starting from purchase day
- Example: Buy on day 10, covers days 10-39 inclusive

Key details:
- You only pay when you buy a pass (not per use)
- A single pass can cover multiple travel days within its duration
- You can buy passes on non-travel days to cover future travel days
- The challenge: find the minimum total cost to cover all your planned travel days

Example scenario:
```
days = [1, 4, 6, 7, 8, 20]
costs = [2, 7, 15]  // [1-day, 7-day, 30-day]

Smart strategy:
- Buy 1-day pass for day 1: $2
- Buy 7-day pass on day 4 (covers days 4-10): $7 (covers days 4,6,7,8)
- Buy 1-day pass for day 20: $2
Total: $11

Naive strategy (all 1-day passes): 6 × $2 = $12 (more expensive!)
```

## Why This Matters

Cost optimization with duration-based purchasing options models real-world decision-making across many domains. Transportation systems like airlines, trains, and rental cars offer daily, weekly, and monthly rates requiring optimal selection. Cloud computing services charge by hour, month, or year with volume discounts - developers must optimize costs for variable workload patterns. Software subscription services offer monthly or annual plans requiring break-even analysis. Event venues price by hour, day, or week for rental periods. Cellular data plans bundle usage in daily, weekly, monthly packages. Gym memberships, parking passes, and equipment rentals all follow similar pricing structures. The dynamic programming challenge mirrors real financial decisions: when should you commit to longer, cheaper-per-day options versus flexible short-term purchases? Understanding optimal cost strategies helps in budgeting, resource planning, and automated purchasing systems.

## Examples

**Example 1:**
- Input: `days = [1,4,6,7,8,20], costs = [2,7,15]`
- Output: `11`
- Explanation: An optimal purchasing strategy: Buy a single-day pass for $2 on day 1. Buy a 7-day pass for $7 on day 3 (covers days 3-9, including travel days 4,6,7,8). Buy a single-day pass for $2 on day 20. Total cost: $11.

**Example 2:**
- Input: `days = [1,2,3,4,5,6,7,8,9,10,30,31], costs = [2,7,15]`
- Output: `17`
- Explanation: An optimal strategy: Purchase a 30-day pass for $15 on day 1 (covers days 1-30, including all travel days through day 30). Purchase a single-day pass for $2 on day 31. Total cost: $17.

## Constraints

- 1 <= days.length <= 365
- 1 <= days[i] <= 365
- days is in strictly increasing order.
- costs.length == 3
- 1 <= costs[i] <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a dynamic programming problem. For each travel day, you have three choices: buy a 1-day, 7-day, or 30-day pass. The minimum cost to cover all days up to day i depends on the minimum cost to cover days before buying each pass type.
</details>

<details>
<summary>Main Approach</summary>
Use DP where dp[i] = minimum cost to cover days[0] through days[i]. For each day, try all three pass options: (1) dp[i-1] + costs[0], (2) dp[j] + costs[1] where days[j] is 7 days before, (3) dp[k] + costs[2] where days[k] is 30 days before. Take the minimum of these three options.
</details>

<details>
<summary>Optimization Tip</summary>
You only need to track costs for actual travel days, not all 365 days. Use a set to check if a day is a travel day. Alternatively, iterate through the days array and use two pointers to track which previous day is 7/30 days before the current day.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| DP (all days) | O(365) = O(1) | O(365) = O(1) | DP array for all days in year |
| Optimal (travel days only) | O(n) | O(n) | n = number of travel days (≤ 365) |

## Common Mistakes

1. **Not considering overlapping pass coverage**
   ```python
   # Wrong: Greedy choice - always buying 1-day passes
   total = len(days) * costs[0]

   # Correct: DP considers all options and overlaps
   dp = [float('inf')] * len(days)
   for i in range(len(days)):
       # Try 1-day pass
       dp[i] = min(dp[i], dp[i-1] + costs[0] if i > 0 else costs[0])
       # Try 7-day and 30-day passes...
   ```

2. **Incorrect window boundary calculation**
   ```python
   # Wrong: Simple subtraction without checking valid indices
   dp[i] = min(dp[i-1] + costs[0],
               dp[i-7] + costs[1],
               dp[i-30] + costs[2])

   # Correct: Find the actual day index that's outside pass coverage
   j = i
   while j >= 0 and days[i] - days[j] < 7:
       j -= 1
   cost_7day = (dp[j] if j >= 0 else 0) + costs[1]
   ```

3. **Not handling edge cases**
   ```python
   # Wrong: Assuming at least 30 days of travel
   dp[i] = min(dp[i-1] + costs[0], ...)

   # Correct: Handle cases where i-1, j, k might be negative
   if i == 0:
       dp[i] = min(costs[0], costs[1], costs[2])
   else:
       # Calculate with boundary checks
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Coin Change | Medium | Unlimited coins, exact amount target |
| Climbing Stairs | Easy | Fixed step sizes, simpler DP |
| House Robber | Medium | Non-adjacent selection constraint |
| Best Time to Buy/Sell Stock with Cooldown | Medium | State machine DP with cooldown periods |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
