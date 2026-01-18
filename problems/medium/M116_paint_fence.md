---
id: M116
old_id: I075
slug: paint-fence
title: Paint Fence
difficulty: medium
category: medium
topics: ["dynamic-programming"]
patterns: ["state-machine-dp", "combinatorics"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E070", "E746", "M198"]
prerequisites: ["dynamic-programming", "combinatorics"]
---
# Paint Fence

## Problem

Consider a fence consisting of `n` posts that need to be painted using `k` color options. The painting must follow these constraints: each post receives exactly one color, and no sequence of three or more adjacent posts can share the same color. For example, with n=3 posts and k=2 colors (Red and Green), patterns like RRG and GGR are valid (only 2 consecutive same), but RRR is invalid (3 consecutive same). Calculate the total number of valid ways to paint this fence given `n` posts and `k` colors. This is a counting problem that requires tracking state as you build the solution. At each post, you need to know whether the previous two posts had the same color, because that constrains your current choices. This state-dependent counting is perfectly suited for dynamic programming, where you build up the answer by tracking how many ways end with "same color as previous" versus "different color from previous."


**Diagram:**

Example fence with n=3, k=2 (colors: Red, Green):
```
Valid patterns:
┌───┬───┬───┐
│ R │ R │ G │  ✓ (at most 2 consecutive same)
└───┴───┴───┘

┌───┬───┬───┐
│ R │ G │ R │  ✓ (no 3 consecutive same)
└───┴───┴───┘

┌───┬───┬───┐
│ G │ G │ R │  ✓ (at most 2 consecutive same)
└───┴───┴───┘

Invalid pattern:
┌───┬───┬───┐
│ R │ R │ R │  ✗ (3 consecutive same - not allowed)
└───┴───┴───┘
```


## Why This Matters

Scheduling problems with constraints appear in task planning where no job type can run three times consecutively on a machine to prevent overheating. Network packet routing uses similar logic to avoid sending too many consecutive packets of the same type to prevent congestion. DNA sequence generation in computational biology avoids long runs of the same nucleotide to maintain diversity. Color scheme generators for UI design ensure visual variety by limiting consecutive use of the same color. This problem teaches you state machine dynamic programming, where your DP state tracks not just position but also recent history (same vs different from previous). This pattern extends to stock trading strategies (can't buy/sell on consecutive days), game move planning (alternating player types), and any sequence generation with local constraints.

## Examples

**Example 1:**
- Input: `n = 1, k = 1`
- Output: `1`

**Example 2:**
- Input: `n = 7, k = 2`
- Output: `42`

## Constraints

- 1 <= n <= 50
- 1 <= k <= 10⁵
- The testcases are generated such that the answer is in the range [0, 2³¹ - 1] for the given n and k.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: State Definition</summary>

Think about the state at each post i. What matters for deciding how to paint post i+1? You need to know: (1) How many ways to paint up to post i, and (2) Whether posts i-1 and i have the same color. This suggests tracking two states: same[i] (posts i-1 and i same color) and diff[i] (posts i-1 and i different colors).

</details>

<details>
<summary>🎯 Hint 2: Recurrence Relations</summary>

For post i:
- If it's the same color as post i-1, it must be different from i-2 (to avoid 3 consecutive). So same[i] = diff[i-1] × 1.
- If it's different from post i-1, you have (k-1) color choices. So diff[i] = (same[i-1] + diff[i-1]) × (k-1).

Total ways for i posts: total[i] = same[i] + diff[i].

</details>

<details>
<summary>📝 Hint 3: Dynamic Programming Implementation</summary>

```
Base cases:
- For n=1: k ways (any color)
- For n=2: k² ways (any two colors, including same)
  - same[2] = k (both posts same color)
  - diff[2] = k × (k-1) (different colors)

Recurrence for i >= 3:
- same[i] = diff[i-1]
- diff[i] = (same[i-1] + diff[i-1]) × (k-1)
- total[i] = same[i] + diff[i]

Space optimization:
Only need previous two states, can use O(1) space with variables.
```

Alternative thinking: total[i] = total[i-1] × (k-1) + total[i-2] × (k-1).

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Try all) | O(k^n) | O(n) | Exponential, impractical |
| DP with Array | O(n) | O(n) | Standard DP approach |
| **DP with Variables** | **O(n)** | **O(1)** | Space-optimized, optimal |

## Common Mistakes

### Mistake 1: Not handling base cases correctly
```python
# Wrong: Incorrect base case for n=2
def numWays(n, k):
    if n == 1:
        return k
    same = k
    diff = k * (k - 1)
    for i in range(3, n + 1):
        same, diff = diff, (same + diff) * (k - 1)
    return same + diff

# Correct: Proper base case handling
def numWays(n, k):
    if n == 1:
        return k
    if n == 2:
        return k * k

    same = k
    diff = k * (k - 1)
    for i in range(3, n + 1):
        new_same = diff
        new_diff = (same + diff) * (k - 1)
        same, diff = new_same, new_diff
    return same + diff
```

### Mistake 2: Incorrect recurrence relation
```python
# Wrong: Not accounting for constraint properly
def numWays(n, k):
    if n == 1:
        return k
    dp = [0] * (n + 1)
    dp[1] = k
    dp[2] = k * k
    for i in range(3, n + 1):
        dp[i] = dp[i-1] * k  # Wrong! Allows 3+ consecutive
    return dp[n]

# Correct: Proper constraint enforcement
def numWays(n, k):
    if n == 1:
        return k
    if n == 2:
        return k * k

    # Post i same as i-1: must differ from i-2
    # Post i differs from i-1: (k-1) choices
    total_prev2 = k
    total_prev1 = k * k

    for i in range(3, n + 1):
        total_curr = total_prev1 * (k - 1) + total_prev2 * (k - 1)
        total_prev2, total_prev1 = total_prev1, total_curr

    return total_prev1
```

### Mistake 3: Using too much space
```python
# Suboptimal: Using arrays when only need last 2 values
def numWays(n, k):
    if n == 1: return k
    same = [0] * (n + 1)
    diff = [0] * (n + 1)
    same[1] = k
    diff[1] = 0
    same[2] = k
    diff[2] = k * (k - 1)
    for i in range(3, n + 1):
        same[i] = diff[i-1]
        diff[i] = (same[i-1] + diff[i-1]) * (k - 1)
    return same[n] + diff[n]

# Better: O(1) space with variables
def numWays(n, k):
    if n == 1: return k
    if n == 2: return k * k
    same, diff = k, k * (k - 1)
    for i in range(3, n + 1):
        same, diff = diff, (same + diff) * (k - 1)
    return same + diff
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| House Robber (no adjacent) | Medium | Similar constraint, different objective |
| Climbing stairs with k steps | Easy | Simpler recurrence |
| Paint fence (no 2 consecutive same) | Easy | Stricter constraint |
| Paint fence with costs | Medium | Add cost optimization |
| 2D grid painting | Hard | Extend to two dimensions |

## Practice Checklist

- [ ] **Day 0**: Solve using DP array approach (25 min)
- [ ] **Day 1**: Optimize to O(1) space with variables (20 min)
- [ ] **Day 3**: Code from memory, explain state transitions (18 min)
- [ ] **Day 7**: Solve variation with different constraint (no 2 consecutive) (22 min)
- [ ] **Day 14**: Derive mathematical formula instead of DP (30 min)
- [ ] **Day 30**: Speed run under time pressure (12 min)

**Strategy**: See [Dynamic Programming Patterns](../strategies/patterns/dynamic-programming.md)
