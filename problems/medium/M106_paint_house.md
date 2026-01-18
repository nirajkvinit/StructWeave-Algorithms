---
id: M106
old_id: I056
slug: paint-house
title: Paint House
difficulty: medium
category: medium
topics: ["dynamic-programming"]
patterns: ["dp-state-machine", "optimization"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E198", "M213", "M265"]
prerequisites: ["dynamic-programming", "state-machines", "optimization"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Paint House

## Problem

Imagine you're managing a neighborhood where every house must be painted one of three colors: red, blue, or green. However, there's a homeowners association rule that no two adjacent houses can have the same color. Each house has different costs for each color, given in a matrix where `costs[i][j]` represents the cost to paint house `i` with color `j`. Your goal is to find the minimum total cost to paint all houses while respecting the adjacency constraint. This is a classic dynamic programming problem because the optimal choice for each house depends on the choice made for the previous house. You can't just greedily pick the cheapest color for each house independently because that might violate the adjacent color rule or lead to more expensive choices later. Think about how the minimum cost to paint house `i` with red depends on the minimum cost to paint house `i-1` with blue or green. Edge cases include a single house (just pick the cheapest color), houses where all colors cost the same, and scenarios where alternating between two colors is optimal.

## Why This Matters

This problem models real-world resource allocation under constraints. Urban planning uses similar algorithms for zoning decisions where adjacent zones have compatibility rules. In manufacturing, production line scheduling employs this pattern when consecutive stations can't perform certain operations back-to-back due to machine constraints. Wireless network frequency allocation uses the same logic to assign frequencies to adjacent cell towers without interference. Cloud infrastructure planning applies this when allocating resources across availability zones with anti-affinity rules. The state machine DP pattern you'll learn here is fundamental for sequence optimization problems with local constraints, from gene sequencing in bioinformatics to speech recognition in natural language processing. Understanding how to optimize sequential decisions with dependencies is essential for system design and algorithm optimization.

## Examples

**Example 1:**
- Input: `costs = [[17,2,17],[16,16,5],[14,3,19]]`
- Output: `10`
- Explanation: Paint house 0 into blue, paint house 1 into green, paint house 2 into blue.
Minimum cost: 2 + 5 + 3 = 10.

**Example 2:**
- Input: `costs = [[7,6,2]]`
- Output: `2`

## Constraints

- costs.length == n
- costs[i].length == 3
- 1 <= n <= 100
- 1 <= costs[i][j] <= 20

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: State Definition</summary>

For each house, you have 3 choices of color. The constraint is that adjacent houses can't have the same color. Think about tracking the minimum cost to paint houses 0...i where house i is painted color c. How does this relate to the previous house?

</details>

<details>
<summary>🎯 Hint 2: Transition Logic</summary>

If house i is painted red, then house i-1 must have been painted blue or green. The minimum cost for house i in red is: costs[i][red] + min(dp[i-1][blue], dp[i-1][green]). Apply similar logic for blue and green.

</details>

<details>
<summary>📝 Hint 3: Algorithm Design</summary>

Pseudocode approach:
```
# Approach 1: DP with O(n) space
n = len(costs)
if n == 0: return 0

dp = [[0] * 3 for _ in range(n)]
dp[0] = costs[0]  # Base case: first house

for i in range(1, n):
    dp[i][0] = costs[i][0] + min(dp[i-1][1], dp[i-1][2])  # Red
    dp[i][1] = costs[i][1] + min(dp[i-1][0], dp[i-1][2])  # Blue
    dp[i][2] = costs[i][2] + min(dp[i-1][0], dp[i-1][1])  # Green

return min(dp[n-1])

# Approach 2: Space-optimized O(1)
prev_red, prev_blue, prev_green = costs[0]

for i in range(1, n):
    curr_red = costs[i][0] + min(prev_blue, prev_green)
    curr_blue = costs[i][1] + min(prev_red, prev_green)
    curr_green = costs[i][2] + min(prev_red, prev_blue)

    prev_red, prev_blue, prev_green = curr_red, curr_blue, curr_green

return min(prev_red, prev_blue, prev_green)
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(3^n) | O(n) | Try all color combinations |
| DP with Array | O(n) | O(n) | 2D DP table with 3 colors |
| **Space-Optimized DP** | **O(n)** | **O(1)** | Only track previous row, optimal |

Where n is the number of houses.

## Common Mistakes

**Mistake 1: Not considering previous color constraint**
```python
# Wrong: Doesn't prevent adjacent houses from having same color
def min_cost(costs):
    n = len(costs)
    dp = [[0] * 3 for _ in range(n)]
    dp[0] = costs[0]

    for i in range(1, n):
        for c in range(3):
            dp[i][c] = costs[i][c] + min(dp[i-1])  # Wrong!

    return min(dp[n-1])
```

```python
# Correct: Exclude same color from previous house
def min_cost(costs):
    n = len(costs)
    dp = [[0] * 3 for _ in range(n)]
    dp[0] = costs[0]

    for i in range(1, n):
        dp[i][0] = costs[i][0] + min(dp[i-1][1], dp[i-1][2])
        dp[i][1] = costs[i][1] + min(dp[i-1][0], dp[i-1][2])
        dp[i][2] = costs[i][2] + min(dp[i-1][0], dp[i-1][1])

    return min(dp[n-1])
```

**Mistake 2: Modifying input array incorrectly**
```python
# Wrong: Modifies costs in place but uses wrong values
def min_cost(costs):
    for i in range(1, len(costs)):
        costs[i][0] += min(costs[i-1][1], costs[i-1][2])
        costs[i][1] += min(costs[i-1][0], costs[i-1][2])  # Uses updated costs[i-1][0]!
        costs[i][2] += min(costs[i-1][0], costs[i-1][1])  # Uses updated costs[i-1][0] and costs[i-1][1]!

    return min(costs[-1])
```

```python
# Correct: Save previous values before modifying
def min_cost(costs):
    for i in range(1, len(costs)):
        prev_0, prev_1, prev_2 = costs[i-1]
        costs[i][0] += min(prev_1, prev_2)
        costs[i][1] += min(prev_0, prev_2)
        costs[i][2] += min(prev_0, prev_1)

    return min(costs[-1])
```

**Mistake 3: Wrong base case handling**
```python
# Wrong: Doesn't handle single house case
def min_cost(costs):
    if not costs:
        return 0

    # Missing: if len(costs) == 1: return min(costs[0])

    for i in range(1, len(costs)):
        # ... transition logic

    return min(costs[-1])
```

```python
# Correct: Proper base case (though loop handles it automatically)
def min_cost(costs):
    if not costs:
        return 0

    # Single house case is automatically handled by the loop
    # since range(1, 1) produces empty sequence

    for i in range(1, len(costs)):
        prev = costs[i-1][:]
        costs[i][0] += min(prev[1], prev[2])
        costs[i][1] += min(prev[0], prev[2])
        costs[i][2] += min(prev[0], prev[1])

    return min(costs[-1])
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| House Robber | Rob houses without alerting adjacent alarms | Medium |
| Paint House II | k colors instead of 3 | Hard |
| Paint Fence | Paint fence posts with k colors, at most 2 adjacent same | Medium |
| Maximum Profit | Maximize instead of minimize with constraints | Medium |
| Circular Houses | First and last houses are adjacent | Medium |

## Practice Checklist

- [ ] Initial attempt (Day 0)
- [ ] Reviewed DP state transitions (Day 0)
- [ ] Implemented space-optimized version (Day 0)
- [ ] First spaced repetition (Day 1)
- [ ] Second spaced repetition (Day 3)
- [ ] Third spaced repetition (Day 7)
- [ ] Fourth spaced repetition (Day 14)
- [ ] Can explain state machine approach (Day 14)
- [ ] Can code without references (Day 30)
- [ ] Interview-ready confidence (Day 30)

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
