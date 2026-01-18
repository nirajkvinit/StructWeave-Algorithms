---
id: M138
old_id: I124
slug: maximum-size-subarray-sum-equals-k
title: Maximum Size Subarray Sum Equals k
difficulty: medium
category: medium
topics: ["array", "hash-table", "prefix-sum"]
patterns: ["prefix-sum", "complement-search"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E001", "M001", "M209"]
prerequisites: ["hash-table", "prefix-sum", "array-traversal"]
---
# Maximum Size Subarray Sum Equals k

## Problem

You're given an array of integers `nums` and a target sum `k`, and your challenge is to find the longest contiguous subarray (a sequence of adjacent elements) whose elements sum to exactly `k`. A contiguous subarray means the elements must appear consecutively in the original array, you can't skip elements or rearrange them.

Let's build intuition with an example. Given `nums = [1, -1, 5, -2, 3]` and `k = 3`, let's consider different subarrays: `[1, -1, 5, -2]` sums to 1-1+5-2 = 3 with length 4, while `[5, -2]` also sums to 3 but has length only 2. The subarray `[-2, 3]` sums to 1, not 3, so it doesn't qualify. Your answer should be 4 since `[1, -1, 5, -2]` is the longest valid subarray. The brute force approach would be to check every possible subarray: for each starting position, try all possible ending positions, calculate the sum, and track the longest one that equals k. However, with arrays up to 200,000 elements long, this O(n²) approach is too slow. The key insight involves prefix sums: if you know the cumulative sum from the start of the array to position j, and you also know the cumulative sum to position i (where i < j), then the sum of elements between positions i+1 and j is simply `sum[j] - sum[i]`. This relationship lets you find subarrays with target sum much more efficiently using a hash table to remember previously seen prefix sums. If no subarray sums to k, return 0.

## Why This Matters

The prefix sum technique with hash table is a fundamental pattern that appears throughout technical interviews and real-world applications. Financial systems use this approach to find time periods where revenue or expenses meet specific targets, such as identifying quarters where profit equals a benchmark. Genomics research applies similar techniques to find DNA subsequences with particular nucleotide compositions. Web analytics use this pattern to identify user session segments with specific engagement metrics. The broader algorithmic lesson is about transforming problems through preprocessing: by computing prefix sums, you convert a question about subarray sums into a question about finding two prefix values with a specific difference, which hash tables can answer efficiently. This "convert and conquer" strategy appears in many optimization contexts. You're also learning when certain techniques don't work: this problem teaches you that sliding window, which works beautifully for subarray problems with all positive numbers, fails when negatives are present because the monotonic property breaks down. Recognizing which tool applies to which problem variant is crucial algorithmic maturity.

## Examples

**Example 1:**
- Input: `nums = [1,-1,5,-2,3], k = 3`
- Output: `4`
- Explanation: The contiguous sequence [1, -1, 5, -2] totals to 3 and has the maximum length of 4

**Example 2:**
- Input: `nums = [-2,-1,2,1], k = 1`
- Output: `2`
- Explanation: The sequence [-1, 2] sums to 1 and represents the longest such subarray with length 2

## Constraints

- Array size ranges from 1 to 2 * 10⁵
- Each array element is between -10⁴ and 10⁴
- Target sum k ranges from -10⁹ to 10⁹

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding the Subarray Sum Property</summary>

Consider how you can use cumulative sums. If you know the sum from index 0 to j is `sum_j`, and the sum from 0 to i is `sum_i`, what does `sum_j - sum_i` represent? This relationship can help you find subarrays with a specific sum without checking every possible subarray.

</details>

<details>
<summary>🎯 Hint 2: Storing Previous Sums</summary>

Use a hash table to remember prefix sums you've seen before and their earliest index. When you encounter a prefix sum, check if you've seen `prefix_sum - k` before. If yes, you've found a subarray that sums to k. The hash table allows constant-time lookups, making this approach efficient.

</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>

```
1. Initialize: hash_map = {0: -1}, prefix_sum = 0, max_length = 0
2. For each index i and element num in array:
   a. Add num to prefix_sum
   b. If (prefix_sum - k) exists in hash_map:
      - Calculate length = i - hash_map[prefix_sum - k]
      - Update max_length if this length is greater
   c. If prefix_sum not in hash_map:
      - Store hash_map[prefix_sum] = i (first occurrence only!)
3. Return max_length
```

Key insight: Only store the first occurrence of each prefix sum to maximize subarray length.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check all possible subarrays, calculate sums |
| Prefix Sum Array | O(n²) | O(n) | Precompute prefix sums, still check all pairs |
| **Hash Table + Prefix Sum** | **O(n)** | **O(n)** | **Single pass with constant-time lookups** |

The optimal approach achieves linear time by combining prefix sums with hash table lookups, eliminating the need to check every subarray pair.

## Common Mistakes

### Mistake 1: Updating Hash Map with Every Occurrence

**Wrong Approach:**
```python
# This updates the index every time, keeping the last occurrence
prefix_sum = 0
hash_map = {0: -1}
for i, num in enumerate(nums):
    prefix_sum += num
    hash_map[prefix_sum] = i  # Wrong: overwriting previous indices
    if prefix_sum - k in hash_map:
        max_length = max(max_length, i - hash_map[prefix_sum - k])
```

**Correct Approach:**
```python
# Only store the first occurrence to maximize length
prefix_sum = 0
hash_map = {0: -1}
max_length = 0
for i, num in enumerate(nums):
    prefix_sum += num
    if prefix_sum - k in hash_map:
        max_length = max(max_length, i - hash_map[prefix_sum - k])
    if prefix_sum not in hash_map:  # Correct: keep first occurrence
        hash_map[prefix_sum] = i
```

### Mistake 2: Forgetting to Initialize with {0: -1}

**Wrong Approach:**
```python
# Missing base case for subarrays starting from index 0
hash_map = {}  # Wrong: missing initialization
prefix_sum = 0
# Will miss cases where prefix_sum itself equals k
```

**Correct Approach:**
```python
# Initialize with 0: -1 to handle subarrays from start
hash_map = {0: -1}  # Correct: handles prefix_sum == k
prefix_sum = 0
# Now catches subarrays starting at index 0
```

### Mistake 3: Using Sliding Window Instead of Hash Table

**Wrong Approach:**
```python
# Sliding window doesn't work with negative numbers
# Cannot determine when to shrink window
left = 0
current_sum = 0
for right in range(len(nums)):
    current_sum += nums[right]
    while current_sum > k and left <= right:  # Wrong logic
        current_sum -= nums[left]
        left += 1
```

**Why It Fails:** Sliding window assumes monotonic behavior (adding elements increases sum, removing decreases). With negative numbers, this assumption breaks. The hash table approach handles all cases.

## Variations

| Variation | Difference | Key Insight |
|-----------|------------|-------------|
| Subarray Sum Equals K (count) | Count all subarrays instead of finding longest | Use hash table to count occurrences of each prefix sum |
| Maximum Subarray (Kadane's) | Find maximum sum, not specific target | Use dynamic programming without hash table |
| Minimum Size Subarray Sum | All positive numbers, find minimum length | Can use sliding window (monotonic property) |
| Subarray Sum Divisible by K | Sum divisible by k instead of equal | Use modulo arithmetic with hash table |
| Continuous Subarray Sum | At least length 2, multiple of k | Track prefix sum modulos with distance check |

## Practice Checklist

- [ ] Solve using brute force (understand O(n²) solution)
- [ ] Implement hash table + prefix sum solution
- [ ] Handle edge case: empty array result (return 0)
- [ ] Handle edge case: k = 0 with zeros in array
- [ ] Test with all negative numbers
- [ ] Test with all positive numbers
- [ ] Test with mixed positive/negative
- [ ] Verify time complexity is O(n)
- [ ] Verify space complexity is O(n)
- [ ] Code without looking at solution

**Spaced Repetition Schedule:**
- First review: 24 hours
- Second review: 3 days
- Third review: 1 week
- Fourth review: 2 weeks
- Fifth review: 1 month

**Strategy**: See [Prefix Sum Pattern](../strategies/patterns/prefix-sum.md)
