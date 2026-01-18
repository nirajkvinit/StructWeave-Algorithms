---
id: M267
old_id: A064
slug: maximum-vacation-days
title: Maximum Vacation Days
difficulty: medium
category: medium
topics: ["dynamic-programming", "graph", "dfs"]
patterns: ["dp-2d", "memoization"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M062_unique_paths", "M120_triangle", "M931_minimum_falling_path_sum"]
prerequisites: ["dynamic-programming", "2d-dp", "graph-traversal"]
---
# Maximum Vacation Days

## Problem

You have the opportunity to travel among `n` cities over `k` weeks, strategically choosing locations each week to maximize your total vacation days. This is a dynamic programming problem involving constrained movement through a graph where edges represent available flights.

Here's how the system works: you start in city 0 on Monday of week 1. Each Monday, you can either stay in your current city or fly to any directly connected city (if a flight exists). The flight connectivity is given by an `n x n` matrix `flights`, where `flights[i][j] = 1` means you can fly from city `i` to city `j`, and `flights[i][j] = 0` means no direct flight exists. Note that you cannot fly from a city to itself (`flights[i][i] = 0`).

Each city offers different vacation opportunities each week, represented by an `n x k` matrix `days`. The value `days[i][j]` tells you how many vacation days city `i` offers during week `j`. Any days you're in a city beyond the vacation days count as work days (which you want to minimize). Importantly, the Monday you spend flying counts as part of the destination city's week, and flight time is negligible (doesn't reduce vacation days).

Your goal is to find the maximum total vacation days you can accumulate over all `k` weeks by optimally choosing which city to be in each week.

## Why This Matters

This problem combines graph traversal with dynamic programming optimization, a pattern that appears in many real-world scenarios like route planning with time-dependent rewards (airline miles optimization, ride-sharing surge pricing), resource allocation over time (project scheduling, investment portfolios), and multi-stage decision problems (chess engines evaluating move sequences). The 2D DP state space technique you learn here - tracking "best outcome at time T in state S" - is fundamental to solving finite-horizon optimization problems in operations research, game theory, and planning algorithms. This type of problem frequently appears in technical interviews testing both graph and DP skills simultaneously.

## Examples

**Example 1:**
- Input: `flights = [[0,1,1],[1,0,1],[1,1,0]], days = [[1,3,1],[6,0,3],[3,3,3]]`
- Output: `12`
- Explanation: One of the best strategies is:
1st week : fly from city 0 to city 1 on Monday, and play 6 days and work 1 day.
(Although you start at city 0, we could also fly to and start at other cities since it is Monday.)
2nd week : fly from city 1 to city 2 on Monday, and play 3 days and work 4 days.
3rd week : stay at city 2, and play 3 days and work 4 days.
Ans = 6 + 3 + 3 = 12.

**Example 2:**
- Input: `flights = [[0,0,0],[0,0,0],[0,0,0]], days = [[1,1,1],[7,7,7],[7,7,7]]`
- Output: `3`
- Explanation: Since there are no flights that enable you to move to another city, you have to stay at city 0 for the whole 3 weeks.
For each week, you only have one day to play and six days to work.
So the maximum number of vacation days is 3.
Ans = 1 + 1 + 1 = 3.

**Example 3:**
- Input: `flights = [[0,1,1],[1,0,1],[1,1,0]], days = [[7,0,0],[0,7,0],[0,0,7]]`
- Output: `21`
- Explanation: One of the best strategies is:
1st week : stay at city 0, and play 7 days.
2nd week : fly from city 0 to city 1 on Monday, and play 7 days.
3rd week : fly from city 1 to city 2 on Monday, and play 7 days.
Ans = 7 + 7 + 7 = 21

## Constraints

- n == flights.length
- n == flights[i].length
- n == days.length
- k == days[i].length
- 1 <= n, k <= 100
- flights[i][j] is either 0 or 1.
- 0 <= days[i][j] <= 7

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Dynamic Programming State Definition</summary>

Define `dp[week][city]` as the maximum vacation days achievable by the end of `week` when you're in `city`.

The key transition: For each week and each city, you can either:
1. Stay in the current city (if you were there last week)
2. Fly from any city that has a flight connection to current city

Base case: Week 0, you start at city 0, so `dp[0][0]` is initialized based on city 0's vacation days.
</details>

<details>
<summary>Hint 2: State Transition Logic</summary>

For each week `w` and each city `j`:
```
dp[w][j] = max vacation days we can have being in city j at week w
         = max(dp[w-1][i] + days[j][w]) for all cities i where:
           - i == j (stay in same city), OR
           - flights[i][j] == 1 (can fly from i to j)
```

Also remember you start at city 0, so for week 0, you can potentially fly to any city from city 0 on the first Monday.

Process weeks sequentially, considering all cities for each week.
</details>

<details>
<summary>Hint 3: Implementation Pattern</summary>

```python
# Pseudocode:
def maxVacationDays(flights, days):
    n = len(flights)  # number of cities
    k = len(days[0])  # number of weeks

    # dp[week][city] = max vacation days at week in city
    dp = [[-1] * n for _ in range(k)]

    # Week 0: can start at city 0 or fly to any connected city
    for city in range(n):
        if city == 0 or flights[0][city] == 1:
            dp[0][city] = days[city][0]

    # Process each week
    for week in range(1, k):
        for curr_city in range(n):
            # Try coming from each possible previous city
            for prev_city in range(n):
                if dp[week-1][prev_city] == -1:
                    continue
                # Can stay (prev == curr) or fly (flights[prev][curr] == 1)
                if prev_city == curr_city or flights[prev_city][curr_city] == 1:
                    dp[week][curr_city] = max(
                        dp[week][curr_city],
                        dp[week-1][prev_city] + days[curr_city][week]
                    )

    return max(dp[k-1])
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| 2D DP | O(k * n²) | O(k * n) | k weeks, n cities, n² transitions |
| DFS + Memoization | O(k * n²) | O(k * n) | Recursion with memo, same complexity |
| Space-Optimized DP | O(k * n²) | O(n) | Only keep previous week's state |

## Common Mistakes

1. **Forgetting you can fly on the first week**
```python
# Wrong: Only initializing city 0 for week 0
dp[0][0] = days[0][0]

# Correct: Can fly from city 0 to connected cities on first Monday
for city in range(n):
    if city == 0 or flights[0][city] == 1:
        dp[0][city] = days[city][0]
```

2. **Not allowing staying in same city**
```python
# Wrong: Only checking flight connections
if flights[prev_city][curr_city] == 1:
    dp[week][curr_city] = max(...)

# Correct: Allow staying (prev == curr) or flying
if prev_city == curr_city or flights[prev_city][curr_city] == 1:
    dp[week][curr_city] = max(...)
```

3. **Using uninitialized DP values**
```python
# Wrong: Not checking if previous state was reachable
dp[week][curr] = max(dp[week][curr], dp[week-1][prev] + days[curr][week])

# Correct: Skip if previous state was unreachable
if dp[week-1][prev_city] == -1:
    continue
dp[week][curr] = max(dp[week][curr], dp[week-1][prev] + days[curr][week])
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Minimum Working Days | Medium | Minimize working days instead of maximizing vacation |
| Flight Costs | Hard | Each flight has a cost; maximize vacation - total cost |
| Multiple Flights Per Week | Hard | Allow multiple flights per week with constraints |
| Return to Origin | Hard | Must return to city 0 by end of k weeks |

## Practice Checklist

- [ ] Solve using 2D DP approach
- [ ] Handle edge case: no flights available
- [ ] Handle edge case: single city
- [ ] Optimize space to O(n) using rolling arrays
- [ ] **Day 3**: Solve again without hints
- [ ] **Week 1**: Implement DFS + memoization approach
- [ ] **Week 2**: Solve from memory in under 30 minutes

**Strategy**: See [2D Dynamic Programming](../strategies/patterns/dynamic-programming.md)
