---
id: M303
old_id: A113
slug: maximum-length-of-pair-chain
title: Maximum Length of Pair Chain
difficulty: medium
category: medium
topics: ["array", "greedy", "sorting", "dynamic-programming"]
patterns: ["greedy", "sorting"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M300", "E435", "M452"]
prerequisites: ["E435", "M300"]
---
# Maximum Length of Pair Chain

## Problem

You have an array of `n` pairs where each `pairs[i] = [lefti, righti]` represents an interval with `lefti < righti` (the left value is always strictly smaller than the right value).

You can form a chain by linking pairs together, but there's a rule: pair `p2 = [c, d]` can follow pair `p1 = [a, b]` only if `b < c` - meaning the right value of the first pair must be strictly less than the left value of the second pair. Think of these like time intervals that can't overlap: if one meeting ends at 3pm (right value), the next meeting must start after 3pm (left value greater than 3).

Find the maximum number of pairs you can link together in a single chain. You can select any subset of pairs and arrange them in any order to maximize the chain length.

For example, with pairs `[[1,2], [2,3], [3,4]]`, you can chain `[1,2]` and `[3,4]` (since 2 < 3), giving you a chain of length 2. You can't include `[2,3]` in this chain because `2 < 2` is false and `3 < 3` is false - there's no way to fit it with the others.

## Why This Matters

This is a classic activity selection problem that appears in real-world scheduling: maximizing meeting attendance when meetings conflict, optimizing task scheduling on machines, or planning event participation. The greedy solution teaches you to recognize when locally optimal choices lead to globally optimal outcomes - a powerful pattern that doesn't always work but is elegant when it does. Understanding both the greedy approach (optimal but requires proof) and the dynamic programming alternative (more general but slower) helps you choose the right tool for interval-based optimization problems in interviews and production systems.

## Examples

**Example 1:**
- Input: `pairs = [[1,2],[2,3],[3,4]]`
- Output: `2`
- Explanation: The longest chain is [1,2] -> [3,4].

**Example 2:**
- Input: `pairs = [[1,2],[7,8],[4,5]]`
- Output: `3`
- Explanation: The longest chain is [1,2] -> [4,5] -> [7,8].

## Constraints

- n == pairs.length
- 1 <= n <= 1000
- -1000 <= lefti < righti <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Recognize the Greedy Opportunity</summary>

This problem is similar to the interval scheduling maximization problem. The key insight is that a greedy approach works optimally here.

Consider sorting the pairs. What's the best sorting strategy?
- Sort by left endpoint? No, this doesn't help much
- Sort by right endpoint? Yes! This is the key

**Intuition**: Always pick the pair with the smallest right endpoint among available choices. This leaves maximum room for future pairs to be added to the chain.

After sorting by right endpoint, greedily select pairs that don't overlap.

</details>

<details>
<summary>Hint 2: Implement Greedy Selection</summary>

Algorithm:
1. Sort pairs by their right endpoint (second element)
2. Initialize chain with first pair, track its right endpoint as `current_end`
3. For each subsequent pair `[left, right]`:
   - If `left > current_end`, we can add this pair to the chain
   - Update `current_end = right`
   - Increment chain length

Why this works: By always choosing the pair that ends earliest, we maximize the number of non-overlapping intervals we can select.

Time complexity: O(n log n) for sorting, O(n) for selection = O(n log n) total.

</details>

<details>
<summary>Hint 3: Alternative DP Approach (Less Efficient)</summary>

You can also solve this with dynamic programming, similar to Longest Increasing Subsequence:

1. Sort pairs by left endpoint (or right, both work for DP)
2. Define `dp[i]` = maximum chain length ending at pair `i`
3. For each pair `i`, check all previous pairs `j` where `pairs[j][1] < pairs[i][0]`
4. `dp[i] = max(dp[j] + 1)` for all valid `j`
5. Answer is `max(dp)`

Time complexity: O(n²)

This is less efficient than greedy but demonstrates that the problem has optimal substructure. The greedy approach is superior here.

**Interview tip**: Mention both approaches but implement greedy for optimal solution.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy + Sorting | O(n log n) | O(1) | Optimal, sort by right endpoint |
| Dynamic Programming | O(n²) | O(n) | Works but slower |
| Brute Force | O(2ⁿ) | O(n) | Try all subsets, TLE |

**Recommended**: Greedy approach with sorting by right endpoint.

## Common Mistakes

1. **Sorting by wrong endpoint**
```python
# Wrong: Sorting by left endpoint doesn't guarantee optimal solution
pairs.sort(key=lambda x: x[0])
count = 1
current_end = pairs[0][1]
for i in range(1, len(pairs)):
    if pairs[i][0] > current_end:
        count += 1
        current_end = pairs[i][1]
# May miss optimal solution

# Correct: Sort by right endpoint
pairs.sort(key=lambda x: x[1])
count = 1
current_end = pairs[0][1]
for i in range(1, len(pairs)):
    if pairs[i][0] > current_end:
        count += 1
        current_end = pairs[i][1]
```

2. **Using >= instead of > for comparison**
```python
# Wrong: Allowing equal endpoints
if pairs[i][0] >= current_end:  # Wrong! Need strict inequality
    count += 1

# Correct: Strict inequality required
if pairs[i][0] > current_end:  # pairs[i][1] must be strictly less
    count += 1
    current_end = pairs[i][1]
```

3. **Modifying input when not allowed**
```python
# Wrong: Sorting input array without considering if it's allowed
def findLongestChain(pairs):
    pairs.sort(key=lambda x: x[1])  # Modifies input!

# Correct: Create sorted copy if needed
def findLongestChain(pairs):
    sorted_pairs = sorted(pairs, key=lambda x: x[1])
    # Or verify problem allows input modification
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Non-overlapping Intervals | Medium | Minimum removals to make non-overlapping (E435) |
| Weighted Pair Chain | Hard | Each pair has a weight, maximize total weight |
| K-Chain Maximum | Hard | Find max length of exactly k chains |
| Circular Pair Chain | Hard | Pairs on a circle, chain wraps around |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Understand why greedy works (activity selection proof)
- [ ] Implement greedy solution sorting by right endpoint
- [ ] Test with edge cases (all overlapping, no overlapping, single pair)
- [ ] Implement alternative DP solution for comparison
- [ ] Trace through example to verify greedy correctness
- [ ] Compare to E435 (Non-overlapping Intervals) problem
- [ ] Review after 1 day: Can you recall which endpoint to sort by?
- [ ] Review after 1 week: Implement without looking at notes
- [ ] Review after 1 month: Solve the weighted variation

**Strategy**: See [Greedy Pattern](../strategies/patterns/greedy-algorithms.md)
