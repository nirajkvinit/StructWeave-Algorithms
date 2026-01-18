---
id: M312
old_id: A123
slug: coin-path
title: Coin Path
difficulty: medium
category: medium
topics: ["array", "dynamic-programming"]
patterns: ["dp-path-reconstruction", "lexicographic-ordering"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M045", "M055", "M322"]
prerequisites: ["dynamic-programming", "path-reconstruction"]
---
# Coin Path

## Problem

Given a 1-indexed array `coins` of size `n` where each position contains either a cost value or -1 (indicating an unreachable position), and an integer `maxJump` representing your maximum jump distance, find the minimum-cost path from position 1 to position n.

You start at position 1 and need to reach position n by jumping forward. From position `i`, you can jump to any position `i + k` where `1 <= k <= maxJump` and `i + k <= n`. However, you can only land on positions where `coins[i] != -1`. Landing on position `i` costs `coins[i]` coins.

The twist is lexicographic ordering: if multiple paths achieve the minimum cost, return the lexicographically smallest path. A path is lexicographically smaller if, at the first position where paths differ, it has a smaller index value. For example, `[1,2,5]` is lexicographically smaller than `[1,3,5]` because 2 < 3 at the second position.

This dual optimization requirement makes the problem more challenging than standard minimum path problems. You must track both the minimum cost and the lexicographically smallest way to achieve it. Return the sequence of positions visited (as indices), or an empty array if no valid path exists.

## Why This Matters

This problem combines dynamic programming with path reconstruction and lexicographic ordering, a pattern that appears in route planning systems where multiple optimal routes exist and you need to apply tiebreaking rules. GPS navigation systems often face this: multiple routes with equal travel time require secondary criteria like fewer turns or lower toll costs. The lexicographic constraint teaches you to handle complex comparison logic while maintaining optimal substructure. This pattern also appears in compiler optimization where multiple instruction sequences have equal cost and you must choose based on register allocation preferences, and in database query optimizers that select among execution plans with identical cost estimates.

## Examples

**Example 1:**
- Input: `coins = [1,2,4,-1,2], maxJump = 2`
- Output: `[1,3,5]`

**Example 2:**
- Input: `coins = [1,2,4,-1,2], maxJump = 1`
- Output: `[]`

## Constraints

- 1 <= coins.length <= 1000
- -1 <= coins[i] <= 100
- coins[1] != -1
- 1 <= maxJump <= 100

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Dynamic Programming with Cost Tracking</summary>

Use DP to track the minimum cost to reach each position. Define `dp[i]` as the minimum cost to reach position i from position 1. Initialize `dp[1] = coins[1]` and all others to infinity. For each position i that is reachable (dp[i] < infinity and coins[i] != -1), try jumping to all positions j in range [i+1, min(i+maxJump, n)]. Update `dp[j] = min(dp[j], dp[i] + coins[j])` if coins[j] != -1.

</details>

<details>
<summary>Hint 2: Path Reconstruction with Lexicographic Order</summary>

After finding minimum costs, you need to reconstruct the path. The challenge is ensuring lexicographic minimality. Work backwards from position n:
1. Track which position we came from to reach each position with minimum cost
2. When multiple positions could be the previous step with the same cost, choose the smallest index (lexicographically smallest)
3. Store parent pointers during forward DP pass, but update only when cost improves OR when cost equals and new parent is smaller

</details>

<details>
<summary>Hint 3: Handling Lexicographic Ordering Correctly</summary>

The tricky part is lexicographic ordering. To get the smallest path:
- During backward reconstruction, among all positions that can reach position j with minimum cost, pick the smallest index
- Or during forward DP: when updating dp[j], if `new_cost < dp[j]` OR `new_cost == dp[j] AND i < parent[j]`, update both dp[j] and parent[j]

After DP, if dp[n] is still infinity, return empty array. Otherwise, reconstruct path by following parent pointers from n back to 1, then reverse.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| DP Forward Pass | O(n × maxJump) | O(n) | Check maxJump positions from each index |
| Path Reconstruction | O(n) | O(n) | Follow parent pointers backwards |
| Overall | O(n × maxJump) | O(n) | Dominated by DP computation |

## Common Mistakes

**Mistake 1: Not Handling Lexicographic Ordering**
```python
# WRONG: Only tracking cost, not lexicographic order
def cheapestJump(coins, maxJump):
    n = len(coins)
    dp = [float('inf')] * n
    dp[0] = coins[0]

    for i in range(n):
        if dp[i] == float('inf') or coins[i] == -1:
            continue
        for j in range(i + 1, min(i + maxJump + 1, n)):
            if coins[j] != -1:
                dp[j] = min(dp[j], dp[i] + coins[j])
                # Missing: need to track parent for lexicographic order

# CORRECT: Track parents and prefer smaller indices
def cheapestJump(coins, maxJump):
    n = len(coins)
    dp = [float('inf')] * n
    parent = [-1] * n
    dp[0] = coins[0]

    for i in range(n):
        if dp[i] == float('inf') or coins[i] == -1:
            continue
        for j in range(i + 1, min(i + maxJump + 1, n)):
            if coins[j] != -1:
                cost = dp[i] + coins[j]
                if cost < dp[j] or (cost == dp[j] and parent[j] > i):
                    dp[j] = cost
                    parent[j] = i
```

**Mistake 2: 0-Indexed vs 1-Indexed Confusion**
```python
# WRONG: Problem uses 1-indexed arrays, code uses 0-indexed
def cheapestJump(coins, maxJump):
    # Direct 0-indexed approach
    # Output path will be 0-indexed: [0, 2, 4]
    # Expected output is 1-indexed: [1, 3, 5]

# CORRECT: Convert between indexing systems
def cheapestJump(coins, maxJump):
    n = len(coins)
    # Work with 0-indexed internally
    # ... do DP ...
    # Convert path to 1-indexed before returning
    path = []  # reconstruct in 0-indexed
    return [p + 1 for p in path]  # Convert to 1-indexed
```

**Mistake 3: Not Checking Reachability**
```python
# WRONG: Not checking if destination is reachable
def cheapestJump(coins, maxJump):
    # ... do DP ...
    # Directly reconstruct path without checking
    path = []
    curr = n - 1
    while curr != -1:
        path.append(curr)
        curr = parent[curr]
    return path[::-1]  # May return partial/invalid path

# CORRECT: Check if destination is reachable
def cheapestJump(coins, maxJump):
    # ... do DP ...
    if dp[n-1] == float('inf'):
        return []  # Cannot reach destination

    # Now safe to reconstruct
    path = []
    curr = n - 1
    while curr != -1:
        path.append(curr + 1)  # Convert to 1-indexed
        curr = parent[curr]
    return path[::-1]
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Maximum Cost Path | Find path with maximum cost instead | Easy |
| K Shortest Paths | Find k lexicographically smallest minimum paths | Hard |
| Weighted Jump Costs | Each jump has variable cost based on distance | Medium |
| Bidirectional Search | Allow jumping backwards within constraints | Medium |
| Minimum Jumps | Minimize number of jumps instead of cost | Medium |

## Practice Checklist

- [ ] First attempt (30 min)
- [ ] Understand lexicographic ordering requirement
- [ ] Implement DP with parent tracking
- [ ] Handle 1-indexed vs 0-indexed conversion
- [ ] Test examples: [1,2,4,-1,2] with maxJump=2 and maxJump=1
- [ ] Test edge cases: unreachable destination, single element
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Attempt variation: minimum jumps problem

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
