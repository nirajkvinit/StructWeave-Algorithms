---
id: E084
old_id: I019
slug: contains-duplicate-ii
title: Contains Duplicate II
difficulty: easy
category: easy
topics: ["array", "hash-table", "sliding-window"]
patterns: ["sliding-window"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E083", "H220", "E217"]
prerequisites: ["hash-map", "sliding-window"]
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Contains Duplicate II

## Problem

Given an integer array `nums` and an integer `k`, return `true` if there are two distinct indices `i` and `j` in the array such that `nums[i] == nums[j]` and the absolute difference between `i` and `j` is at most `k`.

This is a **proximity-constrained duplicate detection** problem. Unlike simply finding any duplicate, you need to find two equal values that are close together - within `k` positions of each other.

**Example to clarify:**
- `nums = [1,2,3,1], k = 3`: The two 1s are at indices 0 and 3, which are exactly 3 positions apart (|3-0| = 3 ≤ 3), so return `true`.
- `nums = [1,2,3,1,2,3], k = 2`: The two 1s are at indices 0 and 3, which are 3 positions apart (|3-0| = 3 > 2), so return `false`.

Think of this as maintaining a **sliding window** of the last `k` elements. As you process each new element, you only care whether it matches something in your recent history.

**Watch out for:**
- Not updating the index when you see the same number again
- Keeping track of elements that are too far away
- Edge case when `k = 0` (no duplicates can satisfy this)

## Why This Matters

This teaches the **sliding window pattern**, one of the most versatile techniques in algorithms:

- **Fraud detection** - Finding duplicate transactions within a time window
- **Rate limiting** - Tracking requests from the same IP within recent history
- **Streaming analytics** - Detecting repeated events in a time-bounded buffer
- **Cache invalidation** - Maintaining recently accessed items

The pattern of "tracking recent elements while discarding old ones" appears in countless real-world systems. This problem also demonstrates a key optimization principle: instead of checking all previous elements, maintain only the relevant subset.

## Examples

**Example 1:**
- Input: `nums = [1,2,3,1], k = 3`
- Output: `true`

**Example 2:**
- Input: `nums = [1,0,1,1], k = 1`
- Output: `true`

**Example 3:**
- Input: `nums = [1,2,3,1,2,3], k = 2`
- Output: `false`

## Constraints

- 1 <= nums.length <= 10⁵
- -10⁹ <= nums[i] <= 10⁹
- 0 <= k <= 10⁵

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

Think of maintaining a sliding window of at most k elements. As you process each element, you need to check if you've seen it recently (within the last k positions). What data structure helps track recent elements efficiently?

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use a hash map to store the most recent index of each number. As you iterate, check if the current number exists in the map and if its previous index is within k distance. If the window size exceeds k, you can either remove old elements or simply update indices. A hash set with sliding window also works.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**Hash Map Approach:**
1. Create map index_map = {}
2. For each position i and value num:
   - If num in index_map and i - index_map[num] <= k:
     - Return true
   - Update index_map[num] = i
3. Return false

**Sliding Window with Set:**
1. Create set window = {}
2. For each position i:
   - If nums[i] in window: return true
   - Add nums[i] to window
   - If window size > k: remove nums[i-k]
3. Return false

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(nk) | O(1) | Check k previous elements for each |
| **Hash Map** | **O(n)** | **O(min(n,k))** | Store most recent index |
| Sliding Window Set | O(n) | O(min(n,k)) | Maintain window of size k |

## Common Mistakes

**Mistake 1: Not Checking Distance Constraint**

```python
# Wrong: Only checks if duplicate exists, not distance
def containsNearbyDuplicate(nums, k):
    return len(nums) != len(set(nums))
```

```python
# Correct: Check distance between duplicates
def containsNearbyDuplicate(nums, k):
    index_map = {}
    for i, num in enumerate(nums):
        if num in index_map and i - index_map[num] <= k:
            return True
        index_map[num] = i
    return False
```

**Mistake 2: Not Updating Index After Check**

```python
# Wrong: Doesn't update to most recent index
def containsNearbyDuplicate(nums, k):
    index_map = {}
    for i, num in enumerate(nums):
        if num in index_map and i - index_map[num] <= k:
            return True
        if num not in index_map:  # Bug: should always update
            index_map[num] = i
    return False
```

```python
# Correct: Always update to current index
def containsNearbyDuplicate(nums, k):
    index_map = {}
    for i, num in enumerate(nums):
        if num in index_map and i - index_map[num] <= k:
            return True
        index_map[num] = i  # Update every time
    return False
```

**Mistake 3: Inefficient Window Management**

```python
# Wrong: Doesn't maintain window size
def containsNearbyDuplicate(nums, k):
    window = set()
    for num in nums:
        if num in window:
            return True
        window.add(num)
        # Missing: remove elements outside window
    return False
```

```python
# Correct: Maintain sliding window of size k
def containsNearbyDuplicate(nums, k):
    window = set()
    for i, num in enumerate(nums):
        if num in window:
            return True
        window.add(num)
        if len(window) > k:  # Keep window size <= k
            window.remove(nums[i - k])
    return False
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Contains Duplicate III | Check value difference <= t and index <= k | Hard |
| Max Sum Subarray Size K | Find max sum in window of size k | Easy |
| Longest Substring K Distinct | Longest substring with k distinct chars | Medium |
| Fruit Into Baskets | Pick from at most 2 types in window | Medium |
| Subarrays with K Different | Count subarrays with k distinct integers | Hard |

## Practice Checklist

- [ ] Day 1: Solve using hash map with index tracking
- [ ] Day 2: Implement sliding window with set approach
- [ ] Day 3: Compare both solutions and analyze tradeoffs
- [ ] Week 1: Solve without hints, handle edge cases
- [ ] Week 2: Try Contains Duplicate III (harder variant)
- [ ] Month 1: Master sliding window pattern for various problems

**Strategy**: See [Sliding Window Pattern](../strategies/patterns/sliding-window.md)
