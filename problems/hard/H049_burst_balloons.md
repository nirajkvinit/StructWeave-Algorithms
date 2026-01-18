---
id: H049
old_id: I111
slug: burst-balloons
title: Burst Balloons
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Burst Balloons

## Problem

Consider a collection of `n` balloons arranged in a sequence, numbered from `0` through `n - 1`. Each balloon displays a numeric value, stored in the array `nums`. Your task is to pop every balloon in the collection.

When you pop the balloon at position `i`, you earn coins equal to the product `nums[i - 1] * nums[i] * nums[i + 1]`. For edge cases where `i - 1` or `i + 1` falls outside the array boundaries, assume a virtual balloon with value `1` exists at that position.

Determine the highest number of coins achievable through an optimal popping sequence.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `nums = [3,1,5,8]`
- Output: `167`
- Explanation: Starting with [3,1,5,8], pop balloons in this order: [3,5,8] -> [3,8] -> [8] -> []
  Coins earned: 3*1*5 + 3*5*8 + 1*3*8 + 1*8*1 = 167

**Example 2:**
- Input: `nums = [1,5]`
- Output: `10`

## Constraints

- n == nums.length
- 1 <= n <= 300
- 0 <= nums[i] <= 100

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>Key Insight</summary>
Instead of thinking about which balloon to burst first (where the problem dependencies are complex), think about which balloon to burst LAST in a range. When a balloon is the last one burst in a range [left, right], it can multiply with the boundaries without interference from intermediate balloons. This reverses the problem perspective and enables dynamic programming.
</details>

<details>
<summary>Main Approach</summary>
Add virtual balloons with value 1 at both ends of the array to handle boundaries. Use dynamic programming where dp[left][right] represents the maximum coins from bursting all balloons between left and right (exclusive). For each range, try every balloon k as the last one to burst, calculating: nums[left] × nums[k] × nums[right] + dp[left][k] + dp[k][right]. Build solutions from smaller ranges to larger ones.
</details>

<details>
<summary>Optimization Tip</summary>
Use bottom-up DP with careful iteration order: process ranges by increasing length. Start with length 2 (adjacent balloons with boundaries), then length 3, and so on. This ensures that when computing dp[left][right], all smaller subproblems dp[left][k] and dp[k][right] are already solved. Memoization with recursion also works but may hit recursion limits.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Try All Orders) | O(n!) | O(n) | Generate all permutations, simulate each |
| DFS with Memoization | O(n³) | O(n²) | Try each balloon as last burst in each range |
| Bottom-up DP | O(n³) | O(n²) | Optimal approach, iterative solution |

## Common Mistakes

1. **Thinking About First Balloon Instead of Last**
   ```python
   # Wrong: Forward thinking creates dependency issues
   def maxCoins(self, nums):
       # Try bursting balloons in sequence
       # This doesn't work because bursting changes the problem structure

   # Correct: Reverse thinking - which balloon to burst last
   def maxCoins(self, nums):
       nums = [1] + nums + [1]
       n = len(nums)
       dp = [[0] * n for _ in range(n)]
       for length in range(2, n):
           for left in range(n - length):
               right = left + length
               for k in range(left + 1, right):
                   dp[left][right] = max(dp[left][right],
                       nums[left] * nums[k] * nums[right] +
                       dp[left][k] + dp[k][right])
   ```

2. **Not Adding Virtual Boundaries**
   ```python
   # Wrong: Complex edge case handling for first and last balloons
   coins = nums[i-1] * nums[i] * nums[i+1] if 0 < i < n-1 else ...

   # Correct: Add 1's at boundaries
   nums = [1] + nums + [1]
   # Now all balloons have valid left and right neighbors
   ```

3. **Wrong DP State Definition**
   ```python
   # Wrong: dp[i] = max coins from bursting first i balloons
   # This doesn't capture dependencies between balloons

   # Correct: dp[left][right] = max coins from bursting balloons
   # between left and right (exclusive)
   dp = [[0] * n for _ in range(n)]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Cost to Merge Stones | Hard | Similar interval DP, minimize instead of maximize |
| Remove Boxes | Hard | Similar but with groups of same-colored boxes |
| Burst Balloons II | Hard | Add constraints on bursting order |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Interval DP Pattern](../../strategies/patterns/dynamic-programming.md)
