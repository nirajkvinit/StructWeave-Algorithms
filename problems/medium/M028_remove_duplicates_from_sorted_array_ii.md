---
id: M028
old_id: F080
slug: remove-duplicates-from-sorted-array-ii
title: Remove Duplicates from Sorted Array II
difficulty: medium
category: medium
topics: ["array", "binary-search"]
patterns: ["two-pointers-same"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E001", "M028", "M031"]
prerequisites: ["two-pointers", "in-place-modification"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Remove Duplicates from Sorted Array II

## Problem

Given a sorted array of integers, remove duplicate elements in-place such that each unique element appears at most twice. The relative order of elements must be maintained. After removing duplicates, return the new length k of the array. The first k elements of the array should contain the result, while the contents beyond position k do not matter.

For example, if the input is [1,1,1,2,2,3], the output should be k=5 with the first five elements being [1,1,2,2,3]. The value at index 5 and beyond can be anything since they fall outside the valid result range.

The challenge is to perform this modification in-place using only O(1) extra space. You cannot allocate a new array. Instead, you must use a two-pointer technique where one pointer scans through the array while another pointer tracks the position where the next valid element should be placed. The key insight is that for any element at position i, you can determine if it should be kept by comparing it with the element at position i-2. If they differ, the current element is either a new value or at most the second occurrence, so it should be kept.

## Why This Matters

This problem demonstrates a fundamental pattern for in-place array manipulation that appears throughout data processing systems. When processing large datasets that won't fit in memory, streaming algorithms must modify data in-place rather than allocating additional space. Log aggregation systems often need to compress duplicate entries while preserving a few occurrences for analysis. The two-pointer technique used here generalizes to many problems: you can easily adapt the solution to allow at most k occurrences by comparing with the element at position write-k instead of write-2. This problem is popular in coding interviews because it tests your ability to work within memory constraints, handle off-by-one errors carefully, and generalize a solution pattern. Understanding the relationship between the write pointer and the comparison position is key to solving an entire family of array deduplication problems.

## Examples

**Example 1:**
- Input: `nums = [1,1,1,2,2,3]`
- Output: `5, nums = [1,1,2,2,3,_]`
- Explanation: Your function should return k = 5, with the first five elements of nums being 1, 1, 2, 2 and 3 respectively.
It does not matter what you leave beyond the returned k (hence they are underscores).

**Example 2:**
- Input: `nums = [0,0,1,1,1,1,2,3,3]`
- Output: `7, nums = [0,0,1,1,2,3,3,_,_]`
- Explanation: Your function should return k = 7, with the first seven elements of nums being 0, 0, 1, 1, 2, 3 and 3 respectively.
It does not matter what you leave beyond the returned k (hence they are underscores).

## Constraints

- 1 <= nums.length <= 3 * 10⁴
- -10⁴ <= nums[i] <= 10⁴
- nums is sorted in **non-decreasing** order.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

Since the array is sorted, all duplicates appear consecutively. You can process the array in a single pass, keeping track of how many times the current element has appeared. The key challenge is deciding when to keep an element versus when to skip it.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use a two-pointer technique: one pointer (slow) tracks the position where the next valid element should be placed, while another pointer (fast) scans through the array. For each element at the fast pointer, check if it should be included based on the "at most two occurrences" rule.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

Pseudocode approach:
1. Initialize a write pointer at index 0
2. For each element in the array:
   - If write pointer < 2, always include the element (first two elements always valid)
   - Otherwise, compare current element with element at (write - 2)
   - If different, include current element at write position
   - Increment write pointer when element is included
3. Return write pointer as the new length

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Extra Array | O(n) | O(n) | Create new array, copy valid elements |
| Hash Map Count | O(n) | O(n) | Track counts, rebuild array |
| **Two Pointers** | **O(n)** | **O(1)** | Single pass, in-place modification |

## Common Mistakes

### 1. Off-by-one errors with the comparison index
```python
# WRONG: Comparing with wrong index
if nums[i] != nums[write - 1]:  # Only checks previous element
    nums[write] = nums[i]

# CORRECT: Compare with element two positions back
if write < 2 or nums[i] != nums[write - 2]:
    nums[write] = nums[i]
    write += 1
```

### 2. Not handling first two elements correctly
```python
# WRONG: Applying same rule to all elements
for i in range(len(nums)):
    if nums[i] != nums[write - 2]:  # Fails for i=0,1
        nums[write] = nums[i]

# CORRECT: Special case for first two positions
write = 0
for num in nums:
    if write < 2 or num != nums[write - 2]:
        nums[write] = num
        write += 1
```

### 3. Modifying array while using it for comparison
```python
# WRONG: Overwriting values needed for comparison
for i in range(len(nums)):
    if nums[i] != nums[i - 2]:  # nums[i-2] might be modified
        nums[write] = nums[i]

# CORRECT: Compare with write pointer position
if write < 2 or nums[i] != nums[write - 2]:
    nums[write] = nums[i]
    write += 1
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| At most k occurrences | Allow up to k duplicates | Change condition to `write < k` or `nums[i] != nums[write - k]` |
| Remove all duplicates | Keep only unique elements | Check `nums[i] != nums[write - 1]` instead |
| Unsorted array | No sorted guarantee | Use hash map to track counts, requires O(n) space |
| Return duplicate-free array | Need new array | Cannot modify in-place, must allocate new array |

## Practice Checklist

- [ ] Handles empty/edge cases (array length 1, 2, all same elements)
- [ ] Can explain approach in 2 min
- [ ] Can code solution in 15 min
- [ ] Can discuss time/space complexity
- [ ] Can adapt to "at most k occurrences" variation

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Two Pointers Pattern](../../strategies/patterns/two-pointers.md)
