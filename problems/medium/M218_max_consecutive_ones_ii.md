---
id: M218
old_id: I286
slug: max-consecutive-ones-ii
title: Max Consecutive Ones II
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["E118", "M487", "E195"]
prerequisites: ["sliding-window", "two-pointers"]
---
# Max Consecutive Ones II

## Problem

Given a binary array `nums` containing only `0`s and `1`s, find the length of the longest sequence of consecutive `1`s you can create if you're allowed to flip at most one `0` to a `1`.

For example, in the array `[1,0,1,1,0]`, you could flip the `0` at index 1 to get `[1,1,1,1,0]`, creating four consecutive ones. Alternatively, flipping the `0` at index 4 gives `[1,0,1,1,1]`, producing only three consecutive ones. The optimal choice is flipping index 1 for a result of 4.

The key insight is that you're looking for the longest subarray containing at most one `0`. This is a classic sliding window problem: expand the window to the right while counting zeros, and when you encounter a second zero, shrink from the left until you're back to at most one zero. The maximum window size during this process is your answer.

Be mindful of edge cases: if the array contains no zeros, the answer is the entire array length. If the array is all zeros, the answer is 1 (flip any single zero). The array can be quite large (up to 100,000 elements), so an O(n) single-pass solution is essential - recomputing or sorting at each step would timeout.

## Why This Matters

This problem introduces the sliding window pattern with a constraint, a technique fundamental to countless interview and real-world problems. It appears in substring problems (longest substring with k distinct characters), time-series analysis (finding valid time windows), network packet analysis (detecting patterns in streams), and resource allocation (maximizing utilization within constraints). The pattern of maintaining a window invariant while processing streams is also foundational to two-pointers algorithms. Additionally, this specific problem mirrors data cleaning scenarios where you can fix a limited number of corrupted values and want to maximize the resulting clean sequence length - common in sensor data processing and error correction.

## Examples

**Example 1:**
- Input: `nums = [1,0,1,1,0]`
- Output: `4`
- Explanation: Flipping the 0 at index 1 yields [1,1,1,1,0], creating a run of 4 consecutive 1s. This is better than flipping the 0 at index 4, which only produces 3 consecutive 1s.

**Example 2:**
- Input: `nums = [1,0,1,1,0,1]`
- Output: `4`
- Explanation: Both possible flips (index 1 or index 4) result in a maximum of 4 consecutive 1s.

## Constraints

- 1 <= nums.length <= 10⁵
- nums[i] is either 0 or 1.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual Understanding</summary>

Think of this as a sliding window problem where you're maintaining a window that contains at most one 0. The key insight is that you can flip exactly one 0 to a 1, so your window can expand as long as it contains 0 or 1 zeros.

</details>

<details>
<summary>🎯 Hint 2: Optimal Approach</summary>

Use a two-pointer sliding window technique. Track the count of zeros in your current window. When you encounter more than one zero, shrink the window from the left until you have at most one zero again. Keep track of the maximum window size throughout.

</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>

1. Initialize left pointer at 0, zero_count at 0, and max_length at 0
2. Iterate with right pointer through the array
3. If nums[right] is 0, increment zero_count
4. While zero_count > 1, move left pointer right and decrement zero_count if nums[left] is 0
5. Update max_length with the current window size (right - left + 1)
6. Return max_length

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Sliding Window | O(n) | O(1) | Two pointers traverse array once |
| Brute Force | O(n²) | O(1) | Try flipping each 0 and count consecutive 1s |
| DP Approach | O(n) | O(n) | Track consecutive 1s with and without flip |

## Common Mistakes

### Mistake 1: Recounting the entire window after each move
```python
# Wrong: Inefficient recounting
def findMaxConsecutiveOnes(nums):
    max_len = 0
    for i in range(len(nums)):
        zeros = 0
        for j in range(i, len(nums)):
            if nums[j] == 0:
                zeros += 1
            if zeros <= 1:
                max_len = max(max_len, j - i + 1)
    return max_len
```

```python
# Correct: Maintain zero count incrementally
def findMaxConsecutiveOnes(nums):
    left = zero_count = max_len = 0
    for right in range(len(nums)):
        if nums[right] == 0:
            zero_count += 1
        while zero_count > 1:
            if nums[left] == 0:
                zero_count -= 1
            left += 1
        max_len = max(max_len, right - left + 1)
    return max_len
```

### Mistake 2: Not handling edge cases properly
```python
# Wrong: Doesn't handle all zeros or all ones
def findMaxConsecutiveOnes(nums):
    if not nums:
        return 0
    # Missing logic for when we should return length of array
    # (when array has 0 or 1 zeros)
```

```python
# Correct: Handles all cases naturally
def findMaxConsecutiveOnes(nums):
    left = zero_count = max_len = 0
    for right in range(len(nums)):
        if nums[right] == 0:
            zero_count += 1
        while zero_count > 1:
            if nums[left] == 0:
                zero_count -= 1
            left += 1
        max_len = max(max_len, right - left + 1)
    return max_len  # Works for all cases
```

### Mistake 3: Confusing the flip constraint
```python
# Wrong: Allows multiple flips
def findMaxConsecutiveOnes(nums):
    # Converting all zeros to ones - misunderstands problem
    return len(nums)
```

```python
# Correct: Enforces at most one flip
def findMaxConsecutiveOnes(nums):
    left = zero_count = max_len = 0
    for right in range(len(nums)):
        if nums[right] == 0:
            zero_count += 1
        while zero_count > 1:  # Ensures at most 1 zero in window
            if nums[left] == 0:
                zero_count -= 1
            left += 1
        max_len = max(max_len, right - left + 1)
    return max_len
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Max Consecutive Ones | Easy | Find longest consecutive 1s without any flips |
| Max Consecutive Ones III | Medium | Find longest consecutive 1s with at most K flips |
| Longest Substring with At Most K Distinct Characters | Medium | Similar sliding window with different constraint |
| Minimum Window Substring | Hard | Find minimum window containing all required characters |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] After 1 day (spaced repetition)
- [ ] After 3 days (spaced repetition)
- [ ] After 1 week (spaced repetition)
- [ ] Before interview (final review)

**Completion Status**: ⬜ Not Started | 🟨 In Progress | ✅ Mastered

**Strategy**: See [Sliding Window Pattern](../strategies/patterns/sliding-window.md)
