---
id: M348
old_id: A180
slug: subarray-product-less-than-k
title: Subarray Product Less Than K
difficulty: medium
category: medium
topics: ["array", "sliding-window"]
patterns: ["sliding-window"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E001", "M001", "M010"]
prerequisites: ["two-pointers", "sliding-window"]
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Subarray Product Less Than K

## Problem

Given an array of positive integers `nums` and an integer `k`, count how many contiguous subarrays have a product strictly less than `k`.

A subarray is a contiguous sequence of elements from the array. For example, in `[10, 5, 2, 6]`, some subarrays include `[10]`, `[5, 2]`, `[10, 5, 2]`, etc. You need to count all subarrays where multiplying all elements gives a result less than `k`.

The naive approach would be to check every possible subarray: there are n(n+1)/2 of them, leading to O(n²) time complexity. However, you can solve this more efficiently using a sliding window technique.

The key insight is that all elements are positive integers, which means the product only increases as you add more elements to a window. This monotonic property allows you to use two pointers: expand the right pointer to grow the window, and shrink from the left when the product becomes too large.

An important counting observation: when your window is `[left...right]` with a valid product, how many new subarrays does adding the element at `right` create? All subarrays ending at `right` and starting anywhere from `left` to `right` are valid. That's exactly `right - left + 1` subarrays. This is the key to achieving O(n) time complexity.

## Why This Matters

The sliding window pattern you'll learn here is ubiquitous in real-world applications: rate limiting systems (counting requests in time windows), streaming analytics (computing metrics over recent data), and network packet analysis. This specific problem teaches you to count all valid subarrays efficiently, a technique that appears in problems involving finding subarrays with specific properties (sum, average, distinct elements). Understanding when monotonic properties enable sliding window optimization is a key skill that separates O(n²) solutions from O(n) solutions in interviews and production systems.

## Examples

**Example 1:**
- Input: `nums = [10,5,2,6], k = 100`
- Output: `8`
- Explanation: Eight subarrays satisfy the condition with products below 100:
[10], [5], [2], [6], [10, 5], [5, 2], [2, 6], [5, 2, 6]
The subarray [10, 5, 2] is excluded because its product equals 100, which does not satisfy the strict inequality.

**Example 2:**
- Input: `nums = [1,2,3], k = 0`
- Output: `0`

## Constraints

- 1 <= nums.length <= 3 * 10⁴
- 1 <= nums[i] <= 1000
- 0 <= k <= 10⁶

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding the Problem</summary>

The key insight is that we need to count all contiguous subarrays, not find a single optimal subarray. For an array of length n, there are potentially n*(n+1)/2 subarrays. A brute force approach checking all pairs would be O(n²), but can we do better?

Consider using a sliding window approach where you maintain a window with product less than k. When the product becomes >= k, what should you do with the left pointer?
</details>

<details>
<summary>Hint 2: Sliding Window Strategy</summary>

Use two pointers (left and right) to maintain a valid window where the product is strictly less than k. When you expand the window by moving right, the product might exceed k. In that case, shrink from the left until the product becomes valid again.

The crucial counting insight: when you add a new element at position `right`, how many new valid subarrays end at that position? If your window is [left...right], then all subarrays ending at `right` and starting from any position between `left` and `right` are valid. That's exactly `right - left + 1` new subarrays.
</details>

<details>
<summary>Hint 3: Implementation Details</summary>

Initialize `left = 0`, `product = 1`, and `count = 0`. For each `right` from 0 to n-1:
1. Multiply `product` by `nums[right]`
2. While `product >= k` and `left <= right`, divide by `nums[left]` and increment `left`
3. Add `right - left + 1` to count (all subarrays ending at right)

Edge case: when k <= 1, no positive product can be less than k, so return 0 immediately. Also handle the division operation carefully to avoid divide-by-zero.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force | O(n²) | O(1) | Check all pairs of start/end indices |
| Sliding Window | O(n) | O(1) | Each element visited at most twice (once by right, once by left) |
| Optimal | O(n) | O(1) | Two-pointer sliding window with running product |

## Common Mistakes

**Mistake 1: Incorrectly counting subarrays**
```python
# Wrong - only counts windows, not all subarrays within window
def numSubarrayProductLessThanK(nums, k):
    count = 0
    left = 0
    product = 1
    for right in range(len(nums)):
        product *= nums[right]
        while product >= k and left <= right:
            product //= nums[left]
            left += 1
        if product < k:
            count += 1  # Only counts 1 instead of (right - left + 1)
    return count
```

**Mistake 2: Not handling edge cases**
```python
# Wrong - doesn't handle k <= 1
def numSubarrayProductLessThanK(nums, k):
    count = 0
    left = 0
    product = 1
    for right in range(len(nums)):
        product *= nums[right]
        # This loop never terminates when k <= 1 and nums has positive values
        while product >= k and left <= right:
            product //= nums[left]
            left += 1
        count += right - left + 1
    return count
```

**Mistake 3: Integer division instead of regular division**
```python
# Wrong - using integer division can cause precision issues
def numSubarrayProductLessThanK(nums, k):
    count = 0
    left = 0
    product = 1
    for right in range(len(nums)):
        product *= nums[right]
        while product >= k and left <= right:
            product //= nums[left]  # Integer division loses precision
            left += 1
        count += right - left + 1
    return count
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Subarray sum less than k | Medium | Use addition instead of multiplication, simpler arithmetic |
| Maximum length subarray with product < k | Medium | Track max length instead of count |
| Count subarrays with product in range [a, b] | Medium | Combine two sliding windows: count(< b) - count(< a) |
| Subarray product equals k | Hard | Cannot use sliding window; requires different approach (prefix products + hashmap) |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Practiced again (1 day later)
- [ ] Practiced again (3 days later)
- [ ] Practiced again (1 week later)
- [ ] Can solve in under 20 minutes
- [ ] Can explain solution clearly
- [ ] Implemented optimal solution
- [ ] Handled all edge cases
- [ ] Tested with custom test cases

**Strategy**: See [Sliding Window Pattern](../strategies/patterns/sliding-window.md)
