---
id: H087
old_id: A096
slug: k-inverse-pairs-array
title: K Inverse Pairs Array
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# K Inverse Pairs Array

## Problem

An **inverse pair** in an integer array `nums` is defined as any pair of indices `[i, j]` satisfying `0 <= i < j < nums.length` where the element at index `i` is greater than the element at index `j`.

Given integers `n` and `k`, calculate how many distinct permutations of numbers from `1` to `n` contain exactly `k` **inverse pairs**. Return the count **modulo** `10⁹ + 7` since the result may be very large.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `n = 3, k = 0`
- Output: `1`
- Explanation: When using numbers 1 through 3, only the arrangement [1,2,3] contains exactly 0 inverse pairs.

**Example 2:**
- Input: `n = 3, k = 1`
- Output: `2`
- Explanation: Two arrangements contain exactly 1 inverse pair: [1,3,2] and [2,1,3].

## Constraints

- 1 <= n <= 1000
- 0 <= k <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
When you insert the number n into a permutation of [1..n-1], its position determines how many new inverse pairs are created. If you place n at position i from the right, it creates i inverse pairs with numbers to its right. This observation leads to a DP recurrence relation.
</details>

<details>
<summary>Main Approach</summary>
Define dp[n][k] = number of permutations of [1..n] with exactly k inverse pairs. When building permutations of length n, consider where to place n: placing it at the rightmost position creates 0 inverse pairs, placing it one position left creates 1, etc. The recurrence is: dp[n][k] = sum(dp[n-1][k-j]) for j from 0 to min(k, n-1).
</details>

<details>
<summary>Optimization Tip</summary>
The naive DP is O(n^2 * k) which times out. Optimize using prefix sums to compute the range sum in O(1). Also, dp[n][k] can be computed from dp[n-1][k] and dp[n][k-1] using the relation: dp[n][k] = dp[n][k-1] + dp[n-1][k] - dp[n-1][k-n] (with boundary handling). This reduces to O(n * k).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n! * n^2) | O(n) | Generate all permutations, count inversions |
| Naive DP | O(n^2 * k) | O(n * k) | Direct recurrence without optimization |
| Optimized DP | O(n * k) | O(k) | Using prefix sum or recurrence optimization |

## Common Mistakes

1. **Using the naive DP recurrence without optimization**
   ```python
   # Wrong: O(n^2 * k) time complexity - TLE
   for i in range(1, n + 1):
       for j in range(k + 1):
           for p in range(min(j, i - 1) + 1):  # Inner loop is O(n)
               dp[i][j] = (dp[i][j] + dp[i-1][j-p]) % MOD

   # Correct: Use prefix sum or optimized recurrence
   for i in range(1, n + 1):
       for j in range(k + 1):
           dp[i][j] = (dp[i][j-1] + dp[i-1][j]) % MOD
           if j >= i:
               dp[i][j] = (dp[i][j] - dp[i-1][j-i]) % MOD
   ```

2. **Not handling modulo arithmetic correctly for subtraction**
   ```python
   # Wrong: Can produce negative results
   dp[i][j] = (dp[i][j-1] + dp[i-1][j] - dp[i-1][j-i]) % MOD
   # -1 % MOD in Python is MOD-1, but still conceptually wrong

   # Correct: Add MOD before taking modulo when subtracting
   dp[i][j] = (dp[i][j-1] + dp[i-1][j]) % MOD
   if j >= i:
       dp[i][j] = (dp[i][j] - dp[i-1][j-i] + MOD) % MOD
   ```

3. **Incorrect base case initialization**
   ```python
   # Wrong: Not initializing dp[i][0] correctly
   dp[0][0] = 1
   # Missing: dp[i][0] = 1 for all i

   # Correct: 0 inverse pairs means sorted order - exactly 1 way
   dp[0][0] = 1
   for i in range(1, n + 1):
       dp[i][0] = 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Count Inversions in Array | Medium | Count inversions in given array using merge sort |
| Global and Local Inversions | Hard | Different inversion definitions |
| Reverse Pairs | Hard | Count pairs where nums[i] > 2 * nums[j] |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
