---
id: M064
old_id: F154
slug: find-minimum-in-rotated-sorted-array-ii
title: Find Minimum in Rotated Sorted Array II
difficulty: medium
category: medium
topics: ["array", "binary-search"]
patterns: ["modified-binary-search"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M063", "M033", "M081"]
prerequisites: ["binary-search", "rotated-array", "duplicates"]
strategy_ref: ../strategies/patterns/binary-search.md
---
# Find Minimum in Rotated Sorted Array II

## Problem

This extends the rotated sorted array problem by allowing duplicate values, which creates ambiguous situations during binary search. Given a sorted array that may contain duplicates and has been rotated at an unknown pivot point, find the minimum element. The duplicates create cases where you can't definitively determine which half of the array contains the minimum just by comparing the middle element to the endpoints. For example, in [2, 2, 2, 0, 1], comparing the middle 2 with the right-most 1 tells you the minimum is in the right half, but in [1, 3, 5] versus [1, 1, 1, 1, 1], the same comparison yields different answers. When the middle element equals an endpoint, you can't safely eliminate half the search space. The worst case degrades to O(n) time when all elements are identical except one, like [2, 2, 2, 2, 2, 2, 1, 2], but you can still optimize for the average case. The challenge is modifying the binary search to handle the ambiguous cases while maintaining efficiency when duplicates are sparse.

## Why This Matters

Duplicate-tolerant rotated array searching appears in distributed caching systems where multiple servers might store the same values and the cache ring has duplicates due to replication, requiring efficient minimum-finding for cache eviction policies. Version control systems tracking file hashes need to find the earliest occurrence when the same file content appears multiple times in the history after merges and rebases. Sensor networks collecting redundant readings (like multiple temperature sensors reporting the same value) store data in circular buffers with duplicates, needing efficient queries for min/max values. Database query optimizers dealing with sorted indexes that allow duplicates must quickly find boundary values for range scans. Network routing tables with redundant paths store duplicate cost metrics, and finding the minimum cost requires handling the duplicates. The gradual degradation from O(log n) to O(n) teaches important lessons about algorithm robustness and worst-case analysis, which is critical when designing systems that must remain performant even with adversarial or pathological inputs.

## Examples

**Example 1:**
- Input: `nums = [1,3,5]`
- Output: `1`

**Example 2:**
- Input: `nums = [2,2,2,0,1]`
- Output: `0`

## Constraints

- n == nums.length
- 1 <= n <= 5000
- -5000 <= nums[i] <= 5000
- nums is sorted and rotated between 1 and n times.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Building on M063</summary>

This extends the previous problem by allowing duplicates. The core binary search approach remains the same, but duplicates create an ambiguous case: when `nums[mid] == nums[right]`, you can't determine which half contains the minimum.

</details>

<details>
<summary>🎯 Hint 2: Handling the Ambiguous Case</summary>

Three cases when comparing nums[mid] with nums[right]:
1. `nums[mid] > nums[right]`: minimum in right half (certain)
2. `nums[mid] < nums[right]`: minimum in left half including mid (certain)
3. `nums[mid] == nums[right]`: uncertain - can't eliminate either half safely

For case 3, the safe move is to decrement right by 1 (or increment left). This maintains correctness but may degrade to O(n) in worst case (all duplicates).

</details>

<details>
<summary>📝 Hint 3: Modified Binary Search</summary>

```
left = 0, right = len(nums) - 1

while left < right:
    mid = left + (right - left) // 2

    if nums[mid] > nums[right]:
        left = mid + 1
    elif nums[mid] < nums[right]:
        right = mid
    else:  # nums[mid] == nums[right]
        right -= 1  # Can't eliminate mid, but can eliminate right

return nums[left]
```

Why decrement right instead of increment left? Both work, but decrementing right is conventional.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Linear Scan | O(n) | O(1) | Simple but doesn't leverage sorted property |
| **Binary Search** | **O(log n) avg, O(n) worst** | **O(1)** | Worst case when all elements equal |

## Common Mistakes

### 1. Not Handling Duplicates Case
```python
# WRONG: Same as M063, doesn't handle nums[mid] == nums[right]
def findMin(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] > nums[right]:
            left = mid + 1
        else:
            right = mid
    return nums[left]
# Works but misses optimization opportunity, same as linear scan on [2,2,2,2,2]
```

```python
# CORRECT: Explicitly handle equality case
def findMin(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] > nums[right]:
            left = mid + 1
        elif nums[mid] < nums[right]:
            right = mid
        else:  # nums[mid] == nums[right]
            right -= 1
    return nums[left]
```

### 2. Decrementing Right Too Aggressively
```python
# WRONG: Skipping mid when equal
def findMin(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] > nums[right]:
            left = mid + 1
        elif nums[mid] < nums[right]:
            right = mid
        else:
            right = mid - 1  # Might skip minimum!
    return nums[left]
```

```python
# CORRECT: Only decrement right by 1 to stay safe
def findMin(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] > nums[right]:
            left = mid + 1
        elif nums[mid] < nums[right]:
            right = mid
        else:
            right -= 1  # Safe incremental reduction
    return nums[left]
```

### 3. Comparing with Left Instead of Right
```python
# WRONG: Comparing with nums[left]
def findMin(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] > nums[left]:  # Wrong comparison!
            left = mid + 1
        elif nums[mid] < nums[left]:
            right = mid
        else:
            left += 1
    return nums[left]
# Fails on many test cases
```

```python
# CORRECT: Compare with nums[right]
def findMin(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] > nums[right]:
            left = mid + 1
        elif nums[mid] < nums[right]:
            right = mid
        else:
            right -= 1
    return nums[left]
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Count duplicates of minimum | Find frequency of min | After finding min, count occurrences |
| Remove duplicates first | Unique elements only | Filter to unique, then apply M063 |
| Find maximum with duplicates | Find max instead of min | Maximum is just before minimum |
| K rotations with duplicates | Count rotations | Return final left index after search |

## Practice Checklist

- [ ] Handles all elements equal
- [ ] Handles mix of duplicates and unique values
- [ ] Handles array with duplicates at rotation point
- [ ] Handles single element
- [ ] Can explain worst-case O(n) scenario
- [ ] Can explain why decrement right by 1
- [ ] Can code solution in 12 min
- [ ] Can discuss time/space complexity

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Binary Search Pattern](../../strategies/patterns/binary-search.md)
