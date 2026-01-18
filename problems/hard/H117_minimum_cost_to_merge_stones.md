---
id: H117
old_id: A467
slug: minimum-cost-to-merge-stones
title: Minimum Cost to Merge Stones
difficulty: hard
category: hard
topics: ["dynamic-programming"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 45
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Minimum Cost to Merge Stones

## Problem

You have `n` stone piles arranged in a line. Pile `i` contains `stones[i]` stones.

Each move allows you to combine exactly `k` **adjacent** piles into a single pile. The cost of merging is the sum of all stones in those `k` piles.

Find the minimum total cost needed to merge all piles into one single pile. Return `-1` if merging all piles into one is impossible.

## Why This Matters

Dynamic programming optimizes overlapping subproblems. This problem teaches you to identify and exploit repeated computation.

## Examples

**Example 1:**
- Input: `stones = [3,2,4,1], k = 2`
- Output: `20`
- Explanation: We start with [3, 2, 4, 1].
We merge [3, 2] for a cost of 5, and we are left with [5, 4, 1].
We merge [4, 1] for a cost of 5, and we are left with [5, 5].
We merge [5, 5] for a cost of 10, and we are left with [10].
The total cost was 20, and this is the minimum possible.

**Example 2:**
- Input: `stones = [3,2,4,1], k = 3`
- Output: `-1`
- Explanation: After any merge operation, there are 2 piles left, and we can't merge anymore.  So the task is impossible.

**Example 3:**
- Input: `stones = [3,5,1,2,6], k = 3`
- Output: `25`
- Explanation: We start with [3, 5, 1, 2, 6].
We merge [5, 1, 2] for a cost of 8, and we are left with [3, 8, 6].
We merge [3, 8, 6] for a cost of 17, and we are left with [17].
The total cost was 25, and this is the minimum possible.

## Constraints

- n == stones.length
- 1 <= n <= 30
- 1 <= stones[i] <= 100
- 2 <= k <= 30

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
First check if merging is possible: starting with n piles, each merge reduces pile count by (k-1). To reach 1 pile, we need (n-1) to be divisible by (k-1). If not, return -1 immediately. This is a crucial mathematical constraint.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use interval DP with 3D state: dp[i][j][p] = minimum cost to merge stones[i:j+1] into exactly p piles. Base case: dp[i][i][1] = 0 (one pile, no merge needed). Transition: split the range at different positions and combine results. Final step: merge p piles into 1 pile costs sum(stones[i:j+1]).
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use prefix sums to calculate range sums in O(1). Also note that you only need to track p from 1 to k (we only create k piles or merge k piles into 1). The transition is: dp[i][j][1] = dp[i][j][k] + sum[i:j+1], and dp[i][j][p] = min(dp[i][mid][1] + dp[mid+1][j][p-1]) for all valid mid points.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Recursion | O(k^n) | O(n) | Exponential; try all merge sequences |
| DP with Memoization | O(n³ * k) | O(n² * k) | 3D DP table |
| Optimal DP | O(n³) | O(n² * k) | With prefix sum optimization |

## Common Mistakes

1. **Not Checking Merge Possibility**
   ```python
   # Wrong: Attempting DP without feasibility check
   dp = [[[float('inf')] * (k + 1) for _ in range(n)] for _ in range(n)]
   # Could waste computation on impossible cases

   # Correct: Check mathematical constraint first
   if (n - 1) % (k - 1) != 0:
       return -1
   # Then proceed with DP
   ```

2. **Incorrect DP Transition**
   ```python
   # Wrong: Not considering all valid splits
   for mid in range(i, j):
       dp[i][j][1] = min(dp[i][j][1], dp[i][mid][1] + dp[mid+1][j][1])

   # Correct: Merge k piles first, then reduce to 1
   for mid in range(i, j, k - 1):  # Step by k-1
       dp[i][j][1] = min(dp[i][j][1], dp[i][mid][1] + dp[mid+1][j][k-1])
   dp[i][j][1] += sum(stones[i:j+1])
   ```

3. **Not Using Prefix Sums**
   ```python
   # Wrong: Recomputing range sums repeatedly
   cost = sum(stones[i:j+1])  # O(n) each time

   # Correct: Precompute prefix sums
   prefix = [0]
   for stone in stones:
       prefix.append(prefix[-1] + stone)
   cost = prefix[j+1] - prefix[i]  # O(1)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Cost to Merge Two Piles (k=2) | Medium | Simpler case; standard interval DP |
| Burst Balloons | Hard | Similar interval DP but different merge rules |
| Stone Game Variations | Medium-Hard | Competitive game theory instead of optimization |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming Patterns](../../strategies/patterns/dynamic-programming.md)
