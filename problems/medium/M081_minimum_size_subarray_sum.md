---
id: M081
old_id: I009
slug: minimum-size-subarray-sum
title: Minimum Size Subarray Sum
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
frequency: high
related_problems: ["E209", "M560", "M862"]
prerequisites: ["sliding-window", "two-pointers", "prefix-sum"]
---
# Minimum Size Subarray Sum

## Problem

You receive an array `nums` containing positive integers and a positive integer `target`. Find the shortest contiguous sequence within the array whose elements sum to at least `target`. Return the length of this shortest sequence, or `0` if no such sequence exists. A contiguous sequence (or subarray) means consecutive elements without gaps, like taking a slice from the array. For example, in `[2,3,1,2,4,3]`, the subarray `[4,3]` is contiguous, while `[2,4,3]` is not. You're looking for the minimal length window that meets or exceeds the target sum. Note that since all numbers are positive, adding more elements always increases the sum, which is a key property you can exploit. Edge cases to consider include arrays where no valid subarray exists (sum of all elements is still less than target), arrays with a single large element that meets the target, and arrays where multiple subarrays of the same minimum length exist.

## Why This Matters

This problem directly models real-world scenarios like financial analysis, where you might need to find the shortest time period where cumulative sales reach a revenue target. It's also essential in data stream processing, where you need to identify the minimal buffer size to accumulate enough data for processing. Network engineers use similar techniques to determine the smallest packet window needed to achieve a bandwidth threshold. The sliding window pattern you'll learn here appears frequently in substring problems, signal processing, and time-series analysis. Mastering this technique gives you an O(n) solution to problems that initially seem to require O(n²) nested loops, making it invaluable for optimizing algorithms that process sequential data efficiently.

## Examples

**Example 1:**
- Input: `target = 7, nums = [2,3,1,2,4,3]`
- Output: `2`
- Explanation: The subarray [4,3] has the minimal length under the problem constraint.

**Example 2:**
- Input: `target = 4, nums = [1,4,4]`
- Output: `1`

**Example 3:**
- Input: `target = 11, nums = [1,1,1,1,1,1,1,1]`
- Output: `0`

## Constraints

- 1 <= target <= 10⁹
- 1 <= nums.length <= 10⁵
- 1 <= nums[i] <= 10⁴

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Sliding Window Intuition</summary>

Since all numbers are positive, if you have a valid subarray [i, j] with sum >= target, then any larger subarray containing it will also be valid. This suggests you can use a sliding window: expand when sum is too small, shrink when sum is large enough. The key insight is that the sum is monotonically increasing as you expand.

</details>

<details>
<summary>🎯 Hint 2: Two Pointer Strategy</summary>

Use two pointers (left and right) to maintain a window:
- Expand right to increase the sum until it reaches target
- Once sum >= target, try shrinking from left to find the minimum length
- Keep track of the minimum length seen so far
- Continue until right reaches the end

This works because all numbers are positive, so removing elements only decreases the sum.

</details>

<details>
<summary>📝 Hint 3: Sliding Window Algorithm</summary>

Pseudocode:
```
min_length = infinity
left = 0
current_sum = 0

for right from 0 to n-1:
    current_sum += nums[right]

    while current_sum >= target:
        min_length = min(min_length, right - left + 1)
        current_sum -= nums[left]
        left += 1

return min_length if min_length != infinity else 0
```

Time: O(n) - each element visited at most twice
Space: O(1) - only tracking pointers and sum

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check all subarrays, compute sum for each |
| Brute Force Optimized | O(n³) | O(1) | Three nested loops for start, end, and sum computation |
| **Sliding Window** | **O(n)** | **O(1)** | Each element added once, removed once. Optimal approach |
| Binary Search + Prefix Sum | O(n log n) | O(n) | Build prefix sum, binary search for each position |

## Common Mistakes

**Mistake 1: Trying to use sliding window with negative numbers**

```python
# Wrong - Sliding window doesn't work if array has negatives
# Problem guarantees positive integers, but common mistake
def minSubArrayLen(target, nums):
    # If nums had negatives, removing left element might increase sum!
    # Example: [-5, 8, 2] target=5, removing -5 makes it worse
    pass
```

```python
# Correct - Only works because all nums are positive
def minSubArrayLen(target, nums):
    min_len = float('inf')
    left = 0
    current_sum = 0

    for right in range(len(nums)):
        current_sum += nums[right]

        while current_sum >= target:
            min_len = min(min_len, right - left + 1)
            current_sum -= nums[left]
            left += 1

    return min_len if min_len != float('inf') else 0
```

**Mistake 2: Not updating minimum length before shrinking**

```python
# Wrong - Updates min_len after shrinking too much
def minSubArrayLen(target, nums):
    min_len = float('inf')
    left = 0
    current_sum = 0

    for right in range(len(nums)):
        current_sum += nums[right]

        while current_sum >= target:
            current_sum -= nums[left]
            left += 1

        min_len = min(min_len, right - left + 1)  # Wrong position!
```

```python
# Correct - Update min_len while sum is still valid
def minSubArrayLen(target, nums):
    min_len = float('inf')
    left = 0
    current_sum = 0

    for right in range(len(nums)):
        current_sum += nums[right]

        while current_sum >= target:
            min_len = min(min_len, right - left + 1)  # Before shrinking
            current_sum -= nums[left]
            left += 1

    return min_len if min_len != float('inf') else 0
```

**Mistake 3: Off-by-one errors in length calculation**

```python
# Wrong - Incorrect length calculation
def minSubArrayLen(target, nums):
    for right in range(len(nums)):
        current_sum += nums[right]
        while current_sum >= target:
            min_len = min(min_len, right - left)  # Missing +1!
            current_sum -= nums[left]
            left += 1
```

```python
# Correct - Proper inclusive range length
def minSubArrayLen(target, nums):
    for right in range(len(nums)):
        current_sum += nums[right]
        while current_sum >= target:
            min_len = min(min_len, right - left + 1)  # Correct
            current_sum -= nums[left]
            left += 1
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Maximum Size Subarray Sum Equals k | Medium | Find longest subarray with exact sum k (allows negatives) |
| Subarray Sum Equals K | Medium | Count number of subarrays with sum exactly k |
| Shortest Subarray with Sum at Least K | Hard | Same problem but array can have negative numbers |
| Minimum Window Substring | Hard | Find minimum window containing all characters |
| Longest Substring Without Repeating | Medium | Apply sliding window to string uniqueness |

## Practice Checklist

- [ ] Day 1: Solve using sliding window approach
- [ ] Day 2: Solve using binary search + prefix sum for comparison
- [ ] Day 7: Re-solve from scratch, focus on when to update min_len
- [ ] Day 14: Solve "Maximum Size Subarray Sum Equals k" variant
- [ ] Day 30: Explain why sliding window works here but not with negatives

**Strategy**: See [Sliding Window Pattern](../strategies/patterns/sliding-window.md)
