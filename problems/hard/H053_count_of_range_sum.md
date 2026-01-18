---
id: H053
old_id: I126
slug: count-of-range-sum
title: Count of Range Sum
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Count of Range Sum

## Problem

You are provided with an integer array `nums` along with two boundary integers `lower` and `upper`. Your task is to determine how many contiguous subarray sums fall within the range `[lower, upper]` (boundaries included).

A range sum `S(i, j)` represents the total of all elements from index `i` to index `j` (where `i <= j`) in the array `nums`.

## Why This Matters

Arrays form the cornerstone of computational problem-solving. Working through this challenge enhances your skills in processing ordered data structures effectively.

## Examples

**Example 1:**
- Input: `nums = [-2,5,-1], lower = -2, upper = 2`
- Output: `3`
- Explanation: Three valid subarrays exist: indices [0,0] with sum -2, indices [2,2] with sum -1, and indices [0,2] with sum 2.

**Example 2:**
- Input: `nums = [0], lower = 0, upper = 0`
- Output: `1`

## Constraints

- 1 <= nums.length <= 10⁵
- -2³¹ <= nums[i] <= 2³¹ - 1
- -10⁵ <= lower <= upper <= 10⁵
- The answer is **guaranteed** to fit in a **32-bit** integer.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Convert the problem using prefix sums: range sum S(i,j) = prefix[j] - prefix[i-1]. The question becomes: for each j, count how many i < j satisfy lower <= prefix[j] - prefix[i] <= upper, which is equivalent to prefix[j] - upper <= prefix[i] <= prefix[j] - lower.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use merge sort with counting during merge phase. While merging two sorted halves, for each element in the right half, count how many elements in left half fall within the required range. The merge sort maintains sorted order while the counting window slides efficiently using two pointers.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
During the merge phase, maintain two pointers for the range bounds. For each prefix[j] in right half, move left pointer to find first prefix[i] >= prefix[j] - upper, and right pointer to find first prefix[i] > prefix[j] - lower. The count is (right - left). Use long integers to avoid overflow.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(n) | Check all subarray pairs |
| Prefix Sum + Binary Search Tree | O(n log n) | O(n) | Insert and query range in BST |
| Merge Sort with Counting | O(n log n) | O(n) | Optimal approach with simpler implementation |

## Common Mistakes

1. **Integer overflow with prefix sums**
   ```python
   # Wrong: Using int, may overflow
   prefix_sum = 0
   for num in nums:
       prefix_sum += num

   # Correct: Use larger integer type
   prefix_sum = 0  # Python handles big integers automatically
   # In other languages, use long/int64
   ```

2. **Incorrect range counting logic**
   ```python
   # Wrong: Counting prefix values directly
   count = 0
   for i in range(j):
       if lower <= prefix[j] - prefix[i] <= upper:
           count += 1

   # Correct: Looking for prefix[i] in transformed range
   # Find i where prefix[j] - upper <= prefix[i] <= prefix[j] - lower
   left = bisect_left(sorted_prefix, prefix[j] - upper)
   right = bisect_right(sorted_prefix, prefix[j] - lower)
   count += right - left
   ```

3. **Not handling merge sort indexing correctly**
   ```python
   # Wrong: Forgetting that indices are from different subarrays
   while j < len(right):
       count += len(left)  # Overcounting

   # Correct: Use two pointers to track range bounds
   t = i
   r = i
   for j in range(mid, end):
       while t < mid and prefix[t] < prefix[j] - upper:
           t += 1
       while r < mid and prefix[r] <= prefix[j] - lower:
           r += 1
       count += r - t
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Count of Smaller Numbers After Self | Hard | Similar merge sort counting technique |
| Reverse Pairs | Hard | Count pairs where nums[i] > 2 * nums[j] |
| Count Subarrays With Fixed Bounds | Hard | Different constraint type on subarrays |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Merge Sort](../../strategies/patterns/divide-and-conquer.md)
