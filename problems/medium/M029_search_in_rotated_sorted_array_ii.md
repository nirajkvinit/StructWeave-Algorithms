---
id: M029
old_id: F081
slug: search-in-rotated-sorted-array-ii
title: Search in Rotated Sorted Array II
difficulty: medium
category: medium
topics: ["array", "binary-search"]
patterns: ["binary-search"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M007", "M029", "M151"]
prerequisites: ["binary-search", "rotated-array"]
strategy_ref: ../strategies/patterns/binary-search.md
---
# Search in Rotated Sorted Array II

## Problem

You are given a sorted array that has been rotated at an unknown pivot point, and this array may contain duplicate elements. Your task is to determine whether a target value exists in the array. A rotated array means that some portion of the array has been shifted to the beginning. For example, the sorted array [1,2,3,4,5,6,7] might be rotated to become [4,5,6,7,1,2,3] if rotated at pivot index 3.

Unlike the version without duplicates, the presence of duplicate values complicates the search. In a standard rotated sorted array, you can always determine which half of the array is properly sorted by comparing the middle element with the endpoints. However, when nums[left] equals nums[mid] equals nums[right], you cannot determine which half is sorted. For instance, in the array [1,3,1,1,1], the left and right halves look identical from the endpoints.

To handle this, you must combine binary search with linear scanning when duplicates obscure the sorted structure. In the average case when duplicates don't create ambiguity, the algorithm runs in O(log n) time. However, in the worst case (such as an array of all identical elements with one different value), the algorithm degrades to O(n) time because you must incrementally skip duplicate endpoints.

## Why This Matters

This problem illustrates how real-world complications can disrupt elegant theoretical algorithms. While binary search on a rotated array without duplicates achieves perfect O(log n) performance, adding duplicates forces you to accept worst-case linear time. This trade-off appears in production systems where data contains noise or repeated values. Database indexes may contain many duplicate keys, forcing index scans to degrade from logarithmic to linear in specific cases. Distributed systems that shard data across nodes may encounter scenarios where duplicate boundaries complicate the search. Understanding when and why algorithms degrade is crucial for setting realistic performance expectations. This problem is a favorite in technical interviews because it tests your ability to handle edge cases, reason about worst-case scenarios, and adapt binary search to imperfect conditions while still optimizing for the average case.

## Examples

**Example 1:**
- Input: `nums = [2,5,6,0,0,1,2], target = 0`
- Output: `true`

**Example 2:**
- Input: `nums = [2,5,6,0,0,1,2], target = 3`
- Output: `false`

## Constraints

- 1 <= nums.length <= 5000
- -10⁴ <= nums[i] <= 10⁴
- nums is guaranteed to be rotated at some pivot.
- -10⁴ <= target <= 10⁴

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

A rotated sorted array has two sorted segments. In the standard problem without duplicates, you can always determine which half is sorted by comparing endpoints. Duplicates complicate this because multiple elements can have the same value, making it unclear which half to search.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use modified binary search. At each step, determine which half is sorted by comparing mid with endpoints. When duplicates make this ambiguous (left == mid == right), you must linearly skip duplicates at the boundaries. This degrades worst-case time to O(n) but maintains O(log n) average case.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

Pseudocode approach:
1. Initialize left = 0, right = n - 1
2. While left <= right:
   - Calculate mid
   - If nums[mid] == target, return true
   - If nums[left] == nums[mid] == nums[right], increment left and decrement right
   - Else if left half is sorted (nums[left] <= nums[mid]):
     - Check if target is in left half range
     - Adjust pointers accordingly
   - Else right half is sorted:
     - Check if target is in right half range
     - Adjust pointers accordingly
3. Return false

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Linear Search | O(n) | O(1) | Simple scan, always works |
| **Binary Search (Average)** | **O(log n)** | **O(1)** | When duplicates don't obscure sorted halves |
| **Binary Search (Worst)** | **O(n)** | **O(1)** | When array is all duplicates like [1,1,1,1,1] |

## Common Mistakes

### 1. Not handling duplicates at boundaries
```python
# WRONG: Doesn't handle when left == mid == right
mid = (left + right) // 2
if nums[mid] == target:
    return True
if nums[left] <= nums[mid]:  # Ambiguous with duplicates
    # ...

# CORRECT: Handle duplicate boundary case
if nums[left] == nums[mid] == nums[right]:
    left += 1
    right -= 1
    continue
```

### 2. Incorrect sorted half detection
```python
# WRONG: Using < instead of <=
if nums[left] < nums[mid]:  # Misses single-element segment
    # ...

# CORRECT: Use <= for proper sorted half detection
if nums[left] <= nums[mid]:
    if nums[left] <= target < nums[mid]:
        right = mid - 1
    else:
        left = mid + 1
```

### 3. Wrong range boundary checks
```python
# WRONG: Inclusive range on both ends causes issues
if nums[left] <= target <= nums[mid]:  # Wrong boundary
    right = mid

# CORRECT: Proper exclusive upper bound
if nums[left] <= target < nums[mid]:
    right = mid - 1
else:
    left = mid + 1
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| No duplicates | All elements unique | Can use pure O(log n) binary search without degradation |
| Find minimum element | Return min instead of search | Similar logic, focus on finding rotation point |
| Find rotation count | Count rotations | Find index of minimum element |
| Multiple rotations | Rotated k times where k unknown | Same approach works, rotation count doesn't matter |

## Practice Checklist

- [ ] Handles empty/edge cases (single element, all duplicates, no rotation)
- [ ] Can explain approach in 2 min
- [ ] Can code solution in 20 min
- [ ] Can discuss time/space complexity
- [ ] Understands why duplicates degrade worst-case to O(n)

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Binary Search Pattern](../../strategies/patterns/binary-search.md)
