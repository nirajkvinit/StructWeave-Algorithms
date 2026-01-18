---
id: H030
old_id: F164
slug: maximum-gap
title: Maximum Gap
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Maximum Gap

## Problem

Find the maximum difference between successive elements in a sorted array.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `nums = [3,6,9,1]`
- Output: `3`
- Explanation: The sorted form of the array is [1,3,6,9], either (3,6) or (6,9) has the maximum difference 3.

**Example 2:**
- Input: `nums = [10]`
- Output: `0`
- Explanation: The array contains less than 2 elements, therefore return 0.

## Constraints

- 1 <= nums.length <= 10⁵
- 0 <= nums[i] <= 10⁹

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The maximum gap must be at least ceiling((max-min)/(n-1)). Use bucket sort with this gap size as bucket width. The maximum gap cannot occur within a bucket (since bucket width is less than or equal to minimum possible max gap), so it must occur between the maximum of one bucket and minimum of the next non-empty bucket.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use bucket sort: create n-1 buckets with width = ceiling((max-min)/(n-1)). For each number, place it in bucket[(num-min)/width]. Track only min and max in each bucket (not all elements). The answer is the maximum difference between the min of a bucket and the max of the previous non-empty bucket.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You only need to store the minimum and maximum value in each bucket, not all values. This keeps space O(n) while achieving O(n) time. The pigeonhole principle guarantees the maximum gap is between buckets, not within them.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (sort) | O(n log n) | O(1) | Standard sorting then linear scan |
| Bucket Sort | O(n) | O(n) | Linear time with n buckets |
| Radix Sort | O(d*n) | O(n) | Where d is number of digits |

## Common Mistakes

1. **Using regular sorting (violates O(n) requirement)**
   ```python
   # Wrong: O(n log n) sorting
   def maximumGap(nums):
       if len(nums) < 2:
           return 0
       nums.sort()
       max_gap = 0
       for i in range(1, len(nums)):
           max_gap = max(max_gap, nums[i] - nums[i-1])
       return max_gap

   # Correct: O(n) bucket sort
   # Use bucket approach with calculated gap size
   ```

2. **Incorrect bucket size calculation**
   ```python
   # Wrong: Floor division might create too many buckets
   bucket_size = (max_val - min_val) // (n - 1)

   # Correct: Ceiling to ensure minimum gap size
   bucket_size = math.ceil((max_val - min_val) / (n - 1))
   # Or: bucket_size = (max_val - min_val - 1) // (n - 1) + 1
   ```

3. **Not handling edge cases**
   ```python
   # Wrong: Doesn't handle small arrays or all same values
   def maximumGap(nums):
       # Start bucket sort immediately

   # Correct: Handle edge cases
   def maximumGap(nums):
       if len(nums) < 2:
           return 0
       if max(nums) == min(nums):
           return 0
       # Continue with bucket sort
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Absolute Difference | Easy | Find minimum gap, not maximum |
| Contains Duplicate III | Hard | Check if gap exists within k indices and t value |
| Maximum Gap (with duplicates) | Medium | Handle duplicate values differently |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Bucket Sort Pattern](../../strategies/patterns/sorting.md)
