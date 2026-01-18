---
id: H067
old_id: I209
slug: split-array-largest-sum
title: Split Array Largest Sum
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Split Array Largest Sum

## Problem

You have an array of integers `nums` and must partition it into exactly `k` continuous, non-empty segments. Your objective is to minimize the maximum sum among all segments.

Output the smallest possible value for the maximum segment sum.

Note: A subarray consists of consecutive elements from the original array.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `nums = [7,2,5,10,8], k = 2`
- Output: `18`
- Explanation: Multiple partitioning options exist. The optimal split creates segments [7,2,5] (sum=14) and [10,8] (sum=18), minimizing the maximum sum at 18.

**Example 2:**
- Input: `nums = [1,2,3,4,5], k = 2`
- Output: `9`
- Explanation: Among all possible two-way splits, [1,2,3] (sum=6) and [4,5] (sum=9) yields the minimum maximum sum of 9.

## Constraints

- 1 <= nums.length <= 1000
- 0 <= nums[i] <= 10⁶
- 1 <= k <= min(50, nums.length)

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Transform this into a binary search problem: instead of asking "what's the minimum possible maximum sum?", ask "can we split the array into k parts where no part exceeds target sum X?". Binary search on X from max(nums) to sum(nums). The answer is the smallest X for which splitting is possible.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use binary search on the answer space. For a given candidate maximum sum, use a greedy algorithm to check if it's possible to split the array into k or fewer subarrays where each sum doesn't exceed the candidate. Keep adding elements to the current subarray until adding the next would exceed the limit, then start a new subarray.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The validation function (checking if a target max sum is achievable) runs in O(n) time with a greedy scan. Combined with binary search over the range [max(nums), sum(nums)], total complexity is O(n log S) where S is the sum. Alternative DP solution exists but is O(n²k) which is slower for large inputs.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (try all splits) | O(n^k) | O(k) | Exponential in k |
| Dynamic Programming | O(n² * k) | O(n * k) | DP[i][j] = min max sum for first i elements in j subarrays |
| Optimal (Binary Search) | O(n log S) | O(1) | S = sum(nums), much faster than DP |

## Common Mistakes

1. **Wrong binary search bounds**
   ```python
   # Wrong: starting from 0 or 1
   left, right = 0, sum(nums)
   # Minimum possible max sum is max(nums), not 0

   # Correct: proper bounds
   left, right = max(nums), sum(nums)
   # Can't be smaller than largest element
   ```

2. **Incorrect validation logic**
   ```python
   # Wrong: not counting the last subarray
   def can_split(max_sum):
       count, current = 0, 0
       for num in nums:
           if current + num > max_sum:
               count += 1
               current = num

   # Correct: count the final subarray
   def can_split(max_sum):
       count, current = 1, 0  # Start with 1 subarray
       for num in nums:
           if current + num > max_sum:
               count += 1
               current = num
           else:
               current += num
       return count <= k
   ```

3. **Not handling edge case where element exceeds candidate**
   ```python
   # Wrong: assuming candidate is always valid
   current += num

   # Correct: handled by lower bound = max(nums)
   # Binary search ensures candidate >= any single element
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Capacity To Ship Packages Within D Days | Medium | Same algorithm, different context |
| Koko Eating Bananas | Medium | Binary search on rate instead of sum |
| Minimize Max Distance to Gas Station | Hard | Binary search on continuous values |
| Allocate Mailboxes | Hard | Similar partitioning with different objective |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Binary Search](../../strategies/patterns/binary-search.md)
