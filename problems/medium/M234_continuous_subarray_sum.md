---
id: M234
old_id: A021
slug: continuous-subarray-sum
title: Continuous Subarray Sum
difficulty: medium
category: medium
topics: ["array", "hash-table", "math", "prefix-sum"]
patterns: ["prefix-sum", "hash-map"]
estimated_time_minutes: 30
frequency: high
related_problems:
  - E560_subarray_sum_equals_k
  - M523_continuous_subarray_sum
  - M974_subarray_sums_divisible_by_k
prerequisites:
  - E001_two_sum
  - E053_maximum_subarray
strategy_ref: ../strategies/patterns/prefix-sum.md
---
# Continuous Subarray Sum

## Problem

Given an integer array `nums` and an integer `k`, determine if there exists a contiguous subarray of length at least 2 whose sum is a multiple of `k`. Return `true` if such a subarray exists, otherwise return `false`.

Let's clarify the key terms: A **subarray** means consecutive elements (like `[2,4,6]` from index 1 to 3), not just any subset. A sum is a **multiple of k** if it can be expressed as `k × n` for some integer `n`. Notably, `0` is considered a multiple of any `k` (since `0 = k × 0`).

The naive approach of checking all possible subarrays takes O(n²) time, which is too slow for large inputs (up to 100,000 elements). The key breakthrough comes from combining two powerful techniques: prefix sums and modular arithmetic. Here's the insight: if two positions in the array have prefix sums with the same remainder when divided by `k`, the subarray between them has a sum divisible by `k`.

For example, with `nums = [23,2,4,6,7]` and `k = 6`, the prefix sums are `[23,25,29,35,42]`. Look at the remainders when divided by 6: `[5,1,5,5,0]`. Notice that indices 0 and 2 both have remainder 5, which means the subarray from index 1 to 2 (`[2,4]` with sum 6) is divisible by 6.

The tricky edge case: ensuring the subarray has length at least 2, which requires careful index tracking.

## Why This Matters

This problem demonstrates a critical pattern: transforming a sum range query into a hash table lookup using modular arithmetic. This technique appears in "Subarray Sum Equals K," "Count Subarrays with Score Less Than K," and many Codeforces problems involving range queries. Understanding prefix sum remainders is essential for competitive programming and appears in real applications like detecting patterns in time-series data, financial transaction analysis (finding periods where totals match specific criteria), and load balancing systems. The O(n) time with O(min(n,k)) space solution showcases how mathematical properties can dramatically optimize brute force approaches, a pattern you'll apply across many domains.

## Examples

**Example 1:**
- Input: `nums = [23,2,4,6,7], k = 6`
- Output: `true`
- Explanation: The subarray [2, 4] contains 2 elements and sums to 6, which is divisible by 6.

**Example 2:**
- Input: `nums = [23,2,6,4,7], k = 6`
- Output: `true`
- Explanation: The entire array [23, 2, 6, 4, 7] sums to 42, and since 42 = 7 * 6, it is divisible by 6.

**Example 3:**
- Input: `nums = [23,2,6,4,7], k = 13`
- Output: `false`

## Constraints

- 1 <= nums.length <= 10⁵
- 0 <= nums[i] <= 10⁹
- 0 <= sum(nums[i]) <= 2³¹ - 1
- 1 <= k <= 2³¹ - 1

## Approach Hints

<details>
<summary>Hint 1: Prefix Sum and Modular Arithmetic</summary>

Think about prefix sums: `prefix[i]` = sum of elements from index 0 to i.

For a subarray from index `i` to `j` to have sum divisible by `k`:
- `(prefix[j] - prefix[i-1]) % k == 0`
- Which means: `prefix[j] % k == prefix[i-1] % k`

Key insight: If two prefix sums have the same remainder when divided by `k`, the subarray between them is divisible by `k`!

Use a hash map to store: `{remainder: earliest_index_with_this_remainder}`

</details>

<details>
<summary>Hint 2: Hash Map to Track Remainders</summary>

Algorithm:
1. Initialize hash map with `{0: -1}` (remainder 0 seen at index -1)
2. Maintain running sum
3. For each index:
   - Calculate `remainder = (running_sum % k + k) % k` (handles negatives)
   - If remainder seen before AND distance >= 2, return true
   - Otherwise, store this remainder with current index

Why `{0: -1}`? So subarrays starting from index 0 work correctly!

</details>

<details>
<summary>Hint 3: Edge Cases to Handle</summary>

Important edge cases:
1. **k = 0**: Division by zero! (But constraints say k >= 1)
2. **Negative remainders**: Use `(sum % k + k) % k` to normalize
3. **Subarray length >= 2**: Check `current_index - stored_index >= 2`
4. **Multiple occurrences of same remainder**: Only store the FIRST occurrence (to maximize distance)

Example: `nums = [0, 0], k = 1`
- At index 0: remainder = 0, already in map at -1, distance = 0 - (-1) = 1 < 2, continue
- At index 1: remainder = 0, already in map at -1, distance = 1 - (-1) = 2 >= 2, return true

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force | O(n²) | O(1) | Check all subarrays |
| Prefix Sum Array | O(n²) | O(n) | Still check all pairs |
| Hash Map + Prefix Sum | O(n) | O(min(n, k)) | Optimal solution |
| Optimized Hash Map | O(n) | O(k) | At most k different remainders |

## Common Mistakes

### Mistake 1: Not Checking Subarray Length >= 2
```python
# WRONG: Allows single-element subarrays
def checkSubarraySum(nums, k):
    remainder_map = {0: -1}
    running_sum = 0

    for i, num in enumerate(nums):
        running_sum += num
        remainder = running_sum % k

        if remainder in remainder_map:
            return True  # Wrong: doesn't check length!

        remainder_map[remainder] = i

    return False
    # Fails for nums = [5], k = 5

# CORRECT: Check distance >= 2
def checkSubarraySum(nums, k):
    remainder_map = {0: -1}
    running_sum = 0

    for i, num in enumerate(nums):
        running_sum += num
        remainder = running_sum % k

        if remainder in remainder_map:
            if i - remainder_map[remainder] >= 2:  # Check length!
                return True
        else:
            remainder_map[remainder] = i

    return False
```

### Mistake 2: Overwriting Previous Remainder Indices
```python
# WRONG: Updates remainder index every time
def checkSubarraySum(nums, k):
    remainder_map = {0: -1}
    running_sum = 0

    for i, num in enumerate(nums):
        running_sum += num
        remainder = running_sum % k

        if remainder in remainder_map and i - remainder_map[remainder] >= 2:
            return True

        remainder_map[remainder] = i  # Always updates!

    return False
    # Fails for nums = [1,2,3,4,5], k = 15
    # Should find [2,3,4,5] but keeps updating index

# CORRECT: Only store first occurrence
def checkSubarraySum(nums, k):
    remainder_map = {0: -1}
    running_sum = 0

    for i, num in enumerate(nums):
        running_sum += num
        remainder = running_sum % k

        if remainder in remainder_map:
            if i - remainder_map[remainder] >= 2:
                return True
        else:  # Only store if not seen before!
            remainder_map[remainder] = i

    return False
```

### Mistake 3: Not Handling Negative Remainders
```python
# WRONG: Python's % works fine, but not in all languages
def checkSubarraySum(nums, k):
    remainder_map = {0: -1}
    running_sum = 0

    for i, num in enumerate(nums):
        running_sum += num
        remainder = running_sum % k  # Could be negative in other languages!

        if remainder in remainder_map:
            if i - remainder_map[remainder] >= 2:
                return True
        else:
            remainder_map[remainder] = i

    return False

# BETTER: Normalize remainder (language-agnostic)
def checkSubarraySum(nums, k):
    remainder_map = {0: -1}
    running_sum = 0

    for i, num in enumerate(nums):
        running_sum += num
        remainder = ((running_sum % k) + k) % k  # Always positive!

        if remainder in remainder_map:
            if i - remainder_map[remainder] >= 2:
                return True
        else:
            remainder_map[remainder] = i

    return False
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| Subarray Sum Equals K | Sum equals k (not divisible by k) | Medium |
| Subarray Sums Divisible by K | Count subarrays (not just check existence) | Medium |
| Maximum Size Subarray Sum Equals k | Find maximum length | Medium |
| Continuous Subarray Sum (no length limit) | Allow single elements | Easy |
| Product Subarray Divisible by K | Product instead of sum | Hard |

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Practice Checklist

- [ ] Solve using hash map with prefix sum remainders (Day 1)
- [ ] Handle edge case: [0,0] with k=1 (Day 1)
- [ ] Understand why we store index -1 for remainder 0 (Day 1)
- [ ] Compare with Subarray Sum Equals K (Day 3)
- [ ] Solve Subarray Sums Divisible by K variant (Day 7)
- [ ] Solve without looking at notes (Day 14)
- [ ] Teach the modular arithmetic insight (Day 30)

**Strategy**: See [Prefix Sum Pattern](../strategies/patterns/prefix-sum.md)
