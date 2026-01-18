---
id: M262
old_id: A056
slug: subarray-sum-equals-k
title: Subarray Sum Equals K
difficulty: medium
category: medium
topics: ["array", "hash-table", "prefix-sum"]
patterns: ["prefix-sum", "hash-map"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E001_two_sum", "M523_continuous_subarray_sum", "M525_contiguous_array", "M974_subarray_sums_divisible_by_k"]
prerequisites: ["hash-table", "prefix-sum", "array-traversal"]
---
# Subarray Sum Equals K

## Problem

Given an integer array `nums` and a target integer `k`, count how many contiguous subarrays have a sum exactly equal to `k`. A subarray is a continuous, non-empty sequence of elements within an array - for example, in `[1,2,3,4]`, the sequence `[2,3]` is a subarray, but `[1,3]` is not because it skips element 2.

The challenge here involves efficiently checking all possible subarrays without using nested loops that would be too slow for large arrays. A naive approach of checking every possible starting and ending position would take O(n²) time, which becomes impractical when the array contains thousands of elements. The key insight involves using prefix sums (cumulative sums from the start) combined with a hash map to achieve O(n) time complexity.

Important considerations: the array can contain negative numbers, zeros, and duplicate values. This means you cannot use early termination tricks like stopping when the sum exceeds `k`. Multiple different subarrays might have the same sum, and you need to count all of them.

## Why This Matters

The prefix sum technique is a powerful pattern that appears across numerous array problems, from range sum queries to finding subarrays with specific properties. This problem frequently appears in technical interviews at major tech companies because it tests your ability to optimize brute-force solutions using hash maps and mathematical insights. Beyond interviews, understanding cumulative sums and efficient counting is valuable for data analysis tasks like financial calculations (running balances), statistics (moving averages), and database query optimization.

## Examples

**Example 1:**
- Input: `nums = [1,1,1], k = 2`
- Output: `2`

**Example 2:**
- Input: `nums = [1,2,3], k = 3`
- Output: `2`

## Constraints

- 1 <= nums.length <= 2 * 10⁴
- -1000 <= nums[i] <= 1000
- -10⁷ <= k <= 10⁷

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding Prefix Sums</summary>

The key insight is that if we know the cumulative sum up to index `i` and up to index `j`, then the sum of the subarray from `i+1` to `j` is `prefix_sum[j] - prefix_sum[i]`.

If `prefix_sum[j] - prefix_sum[i] = k`, then `prefix_sum[i] = prefix_sum[j] - k`. This means we're looking for how many times we've seen a prefix sum equal to `current_sum - k`.

This transforms the problem from checking all pairs of indices to a single pass with a hash map.
</details>

<details>
<summary>Hint 2: Hash Map Pattern</summary>

Use a hash map to store the frequency of each prefix sum encountered so far. As you iterate through the array:

1. Calculate the running cumulative sum
2. Check if `cumulative_sum - k` exists in the hash map
3. If yes, add its frequency to the result (these are all valid subarrays ending at current index)
4. Update the hash map with the current cumulative sum

Don't forget to initialize the hash map with `{0: 1}` to handle subarrays starting from index 0.
</details>

<details>
<summary>Hint 3: Implementation Pattern</summary>

```python
# Pseudocode:
count = 0
cumsum = 0
prefix_count = {0: 1}  # Important: handle subarrays from start

for num in nums:
    cumsum += num

    # Check if there's a prefix sum that makes current subarray equal k
    if (cumsum - k) in prefix_count:
        count += prefix_count[cumsum - k]

    # Update frequency of current prefix sum
    prefix_count[cumsum] = prefix_count.get(cumsum, 0) + 1

return count
```

The initialization `{0: 1}` handles cases where the subarray starts from index 0.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash Map + Prefix Sum | O(n) | O(n) | Optimal solution |
| Brute Force (nested loops) | O(n²) | O(1) | Check all subarray pairs |
| Prefix Sum Array + Nested Loop | O(n²) | O(n) | Slightly better but still slow |

## Common Mistakes

1. **Forgetting to initialize hash map with {0: 1}**
```python
# Wrong: Missing initial state
prefix_count = {}
for num in nums:
    cumsum += num
    if cumsum - k in prefix_count:
        count += prefix_count[cumsum - k]

# Correct: Initialize with zero sum
prefix_count = {0: 1}  # Handles subarrays from start
```

2. **Updating hash map before checking**
```python
# Wrong: Updates before checking, counts subarray with itself
for num in nums:
    cumsum += num
    prefix_count[cumsum] = prefix_count.get(cumsum, 0) + 1
    if cumsum - k in prefix_count:  # Wrong order
        count += prefix_count[cumsum - k]

# Correct: Check first, then update
for num in nums:
    cumsum += num
    if cumsum - k in prefix_count:
        count += prefix_count[cumsum - k]
    prefix_count[cumsum] = prefix_count.get(cumsum, 0) + 1
```

3. **Not handling negative numbers**
```python
# Wrong assumption: Assuming we can break early
if cumsum > k:
    break  # Wrong! Array has negative numbers

# Correct: Process entire array since negatives can reduce sum
for num in nums:  # Must check all elements
    cumsum += num
    # ...
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Subarray Sum Divisible by K | Medium | Count subarrays with sum divisible by k |
| Continuous Subarray Sum | Medium | Sum is multiple of k with length >= 2 |
| Max Subarray Sum | Easy | Find maximum sum instead of count |
| Subarray Product Equals K | Medium | Product instead of sum |

## Practice Checklist

- [ ] Solve using hash map and prefix sum
- [ ] Handle edge case: k = 0
- [ ] Handle edge case: all negative numbers
- [ ] Handle edge case: single element array
- [ ] **Day 3**: Solve again without hints
- [ ] **Week 1**: Solve "Continuous Subarray Sum" variation
- [ ] **Week 2**: Solve from memory in under 15 minutes

**Strategy**: See [Prefix Sum Pattern](../strategies/patterns/prefix-sum.md)
