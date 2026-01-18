---
id: E108
old_id: I082
slug: move-zeroes
title: Move Zeroes
difficulty: easy
category: easy
topics: ["array", "two-pointers"]
patterns: ["two-pointers-same"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E027", "E026", "E107"]
prerequisites: ["two-pointers", "array-manipulation", "in-place-operations"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Move Zeroes

## Problem

Given an integer array, move all zeros to the end while maintaining the relative order of all non-zero elements. For example, [0, 1, 0, 3, 12] should become [1, 3, 12, 0, 0]. You must perform this operation in-place without creating a copy of the array.

This is a partitioning problem: separate the array into two groups (non-zeros first, zeros last) while preserving the order within the non-zero group. The key insight is to use two pointers: a "slow" pointer tracking where the next non-zero should go, and a "fast" pointer scanning through the array. When the fast pointer finds a non-zero element, swap it with whatever's at the slow pointer position, then advance the slow pointer. This ensures all non-zeros move to the front in their original order, with zeros naturally accumulating at the end.

The beauty of this approach is its efficiency: it makes a single pass through the array and performs minimal swaps. Even when you swap a non-zero with another non-zero (when they're already in the correct section), this doesn't break correctness, it just means you've swapped equal values.

## Why This Matters

This problem teaches the two-pointer technique for in-place array manipulation, one of the most important patterns in algorithm design. The "slow and fast pointer" variant appears in countless problems: removing duplicates, partitioning by criteria, and rearranging elements under constraints. Understanding how to partition an array while preserving relative order is fundamental for stable partitioning algorithms and appears in variants of quicksort and other algorithms. This problem also reinforces the importance of in-place modifications for space efficiency, a crucial consideration in embedded systems, memory-constrained environments, and large-scale data processing. The pattern extends to more complex scenarios like Dutch National Flag problem (three-way partitioning) and other stable partition problems, making this an excellent foundation for a family of array manipulation techniques.

## Examples

**Example 1:**
- Input: `nums = [0,1,0,3,12]`
- Output: `[1,3,12,0,0]`

**Example 2:**
- Input: `nums = [0]`
- Output: `[0]`

## Constraints

- 1 <= nums.length <= 10⁴
- -2³¹ <= nums[i] <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Partition Problem</summary>

Think of this as partitioning the array into two groups: non-zero elements (which should come first) and zero elements (which should come last). The relative order within the non-zero group must be preserved. What technique helps you partition arrays efficiently while maintaining order?

</details>

<details>
<summary>🎯 Hint 2: Two Pointer Strategy</summary>

Use two pointers: one to iterate through the array (fast pointer) and another to track the position where the next non-zero element should be placed (slow pointer). When you encounter a non-zero element with the fast pointer, swap it with the element at the slow pointer position and advance the slow pointer. This ensures all non-zeros move to the front in order.

</details>

<details>
<summary>📝 Hint 3: Single Pass Implementation</summary>

Pseudocode:
```
slow = 0  // Position for next non-zero element
for fast from 0 to n-1:
    if nums[fast] != 0:
        swap(nums[slow], nums[fast])
        slow++
// After loop, all non-zeros are at front, zeros at end
```

This approach makes exactly one pass and performs minimal swaps.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Create New Array | O(n) | O(n) | Copy non-zeros then append zeros - violates space constraint |
| Count & Overwrite | O(n) | O(1) | Two passes: collect non-zeros, then fill zeros |
| **Two Pointers** | **O(n)** | **O(1)** | Optimal: Single pass with in-place swaps, minimal operations |

## Common Mistakes

### Mistake 1: Using Extra Space

**Wrong:**
```python
result = []
for num in nums:
    if num != 0:
        result.append(num)
zeros = len(nums) - len(result)
result.extend([0] * zeros)
return result  # O(n) space - violates constraint
```

**Correct:**
```python
slow = 0
for fast in range(len(nums)):
    if nums[fast] != 0:
        nums[slow], nums[fast] = nums[fast], nums[slow]
        slow += 1
# nums modified in-place, O(1) space
```

The problem explicitly requires in-place modification with no extra array copies.

### Mistake 2: Shifting Elements Multiple Times

**Wrong:**
```python
# Remove zeros and shift left, then append zeros
i = 0
while i < len(nums):
    if nums[i] == 0:
        nums.pop(i)  # O(n) per removal
    else:
        i += 1
nums.extend([0] * count_zeros)  # Inefficient
```

**Correct:**
```python
slow = 0
for fast in range(len(nums)):
    if nums[fast] != 0:
        nums[slow], nums[fast] = nums[fast], nums[slow]
        slow += 1
```

Multiple shifts are inefficient. The two-pointer approach swaps elements exactly once.

### Mistake 3: Not Preserving Order

**Wrong:**
```python
left, right = 0, len(nums) - 1
while left < right:
    if nums[left] == 0:
        nums[left], nums[right] = nums[right], nums[left]
        right -= 1
    else:
        left += 1
# Breaks relative order of non-zero elements
```

**Correct:**
```python
slow = 0
for fast in range(len(nums)):
    if nums[fast] != 0:
        nums[slow], nums[fast] = nums[fast], nums[slow]
        slow += 1
# Maintains original order of non-zeros
```

Using left and right pointers reverses the order of elements. A single slow pointer preserves order.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Move to Front | Move zeros to front instead of end | Easy |
| Move Specific Value | Move all instances of value k to end | Easy |
| Stable Partition | Partition by condition while preserving order | Medium |
| K Colors Sort | Sort array with k distinct values in-place | Medium |
| Minimize Swaps | Move zeros with minimum number of swaps | Medium |

## Practice Checklist

- [ ] Solve using two pointers in one pass (10 min)
- [ ] Handle edge cases: all zeros, no zeros, single element (5 min)
- [ ] Verify order preservation of non-zero elements (5 min)
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Try solving "Remove Element" for similar pattern

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
