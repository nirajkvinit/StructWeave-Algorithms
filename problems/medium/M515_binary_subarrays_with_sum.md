---
id: M515
old_id: A397
slug: binary-subarrays-with-sum
title: Binary Subarrays With Sum
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Binary Subarrays With Sum

## Problem

Imagine you're analyzing user activity logs where each action is marked as either significant (1) or routine (0). Your analytics system needs to identify all time windows where the number of significant actions equals exactly a target threshold—this helps detect patterns of user engagement.

Given a binary array `nums` (containing only 0s and 1s) and a target integer `goal`, count how many contiguous subarrays have elements that sum to exactly `goal`.

A subarray is a contiguous slice of the array. For example, in `[1,0,1,0,1]`, the subarray `[0,1,0]` has sum 1, and `[1,0,1]` has sum 2.

The key challenge: zeros complicate the count because they can extend subarrays without changing the sum. For instance, if you need sum 2 and find `[1,0,1]`, you can also include trailing zeros like `[1,0,1,0]` and `[1,0,1,0,0]`—each is a different valid subarray.

## Why This Matters

This problem is foundational for understanding sliding window techniques and prefix sum patterns, both critical in data stream processing and time-series analysis. Financial systems use similar logic to detect transaction patterns ("find all periods with exactly N high-value transactions"). Network monitoring tools analyze packet streams to identify traffic patterns. Web analytics platforms count user interactions within time windows. The prefix sum approach you'll learn here is essential for efficiently querying range sums in databases and is used in everything from image processing (counting pixels with certain properties) to genomics (finding DNA subsequences with specific characteristics). Mastering subarray counting with constraints prepares you for real-time analytics challenges where you can't afford to recalculate sums from scratch for every query.

## Examples

**Example 1:**
- Input: `nums = [1,0,1,0,1], goal = 2`
- Output: `4`
- Explanation: Four subarrays sum to 2:
  - [1,0,1] (indices 0-2)
  - [1,0,1,0] (indices 0-3)
  - [0,1,0,1] (indices 1-4)
  - [1,0,1] (indices 2-4)

**Example 2:**
- Input: `nums = [0,0,0,0,0], goal = 0`
- Output: `15`

**Example 3:**
- Input: `nums = [2,1,3], target = 6`
- Output: `1`

## Constraints

- 1 <= nums.length <= 3 * 10⁴
- nums[i] is either 0 or 1.
- 0 <= goal <= nums.length

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use prefix sums. If prefix_sum[j] - prefix_sum[i] = goal, then subarray from i+1 to j has sum goal. Track prefix sums in a hash map with their frequencies. For each position, check if (current_sum - goal) exists in the map.
</details>

<details>
<summary>🎯 Main Approach</summary>
Build a hash map of prefix sum frequencies. As you iterate, calculate running sum. The number of subarrays ending at current position with sum goal equals the frequency of (current_sum - goal) in the map. Add current_sum to the map and accumulate count.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Alternative approach: count(sum = goal) = count(sum ≤ goal) - count(sum ≤ goal-1). Use sliding window to count subarrays with sum at most k. This works well for binary arrays where window can expand/contract easily.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check all subarrays |
| Prefix Sum Hash Map | O(n) | O(n) | Store prefix sum frequencies |
| Sliding Window | O(n) | O(1) | AtMost(goal) - AtMost(goal-1) |
| Optimal | O(n) | O(1) | Sliding window with two passes |

## Common Mistakes

1. **Forgetting to initialize hash map with 0**
   ```python
   # Wrong: Missing base case for prefix sum = goal
   def numSubarraysWithSum(self, nums, goal):
       prefix_count = {}
       current_sum = 0
       count = 0
       for num in nums:
           current_sum += num
           if current_sum - goal in prefix_count:
               count += prefix_count[current_sum - goal]
           prefix_count[current_sum] = prefix_count.get(current_sum, 0) + 1
       return count  # Missing: case when current_sum == goal directly

   # Correct: Initialize with {0: 1}
   def numSubarraysWithSum(self, nums, goal):
       prefix_count = {0: 1}  # Base case
       current_sum = 0
       count = 0
       for num in nums:
           current_sum += num
           if current_sum - goal in prefix_count:
               count += prefix_count[current_sum - goal]
           prefix_count[current_sum] = prefix_count.get(current_sum, 0) + 1
       return count
   ```

2. **Not handling goal = 0 edge case properly**
   ```python
   # Wrong: Sliding window doesn't work correctly for goal=0
   def numSubarraysWithSum(self, nums, goal):
       return self.atMost(nums, goal) - self.atMost(nums, goal - 1)
       # Bug when goal=0: atMost(-1) is undefined

   # Correct: Handle goal=0 specially
   def numSubarraysWithSum(self, nums, goal):
       if goal == 0:
           # Count subarrays of only zeros
           count = 0
           zeros = 0
           for num in nums:
               if num == 0:
                   zeros += 1
               else:
                   count += zeros * (zeros + 1) // 2
                   zeros = 0
           count += zeros * (zeros + 1) // 2
           return count
       return self.atMost(nums, goal) - self.atMost(nums, goal - 1)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Subarray Sum Equals K | Medium | Not binary array, can have negatives |
| Count Number of Nice Subarrays | Medium | Count odd numbers instead of sum |
| Continuous Subarray Sum | Medium | Check if sum is multiple of k |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Prefix Sum](../../strategies/patterns/prefix-sum.md)
