---
id: E017
old_id: F027
slug: remove-element
title: Remove Element
difficulty: easy
category: easy
topics: ["array", "two-pointers"]
patterns: ["two-pointers", "in-place"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E001", "E026", "M283"]
prerequisites: ["two-pointers", "in-place-modification", "array-traversal"]
strategy_ref: ../../strategies/patterns/two-pointers.md
---
# Remove Element

## Problem

Given an array and a target value, remove all instances of that value from the array in-place. An in-place operation means you must modify the original array without creating a new one. Return the new length of the array after removal.

The key constraint is that you cannot use extra space for another array. Instead, you need to reorganize the existing array so all elements not equal to the target value are moved to the front. What happens to the elements beyond the new length does not matter - they can be anything.

For example, if you have `[3, 2, 2, 3]` and need to remove `3`, you might end up with `[2, 2, _, _]` where the underscores represent any values. Your function returns `2` (the new length), and only the first 2 elements are guaranteed to be correct. The challenge is efficiently performing this filtering without extra memory.

## Why This Matters

This problem teaches the two-pointer technique for in-place array modification, a fundamental pattern that appears throughout systems programming, embedded software, and performance-critical applications where memory is constrained.

Understanding in-place algorithms is essential for scenarios like filtering log streams in real-time systems, removing invalid data in sensor arrays with limited memory, and implementing memory-efficient data processing pipelines. The pattern you learn here extends to problems like removing duplicates, partitioning arrays, and implementing stable filtering operations, making it a foundational skill for efficient algorithm design.

## Examples

**Example 1:**
- Input: `nums = [3,2,2,3], val = 3`
- Output: `2, nums = [2,2,_,_]`
- Explanation: Your function should return k = 2, with the first two elements of nums being 2.
It does not matter what you leave beyond the returned k (hence they are underscores).

**Example 2:**
- Input: `nums = [0,1,2,2,3,0,4,2], val = 2`
- Output: `5, nums = [0,1,4,0,3,_,_,_]`
- Explanation: Your function should return k = 5, with the first five elements of nums containing 0, 0, 1, 3, and 4.
Note that the five elements can be returned in any order.
It does not matter what you leave beyond the returned k (hence they are underscores).

## Constraints

- 0 <= nums.length <= 100
- 0 <= nums[i] <= 50
- 0 <= val <= 100

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: In-Place Modification</summary>

You need to modify the array in-place without creating a new array. Think about maintaining two pointers:
- One that scans through all elements (read pointer)
- One that tracks where to place the next valid element (write pointer)

When do you advance each pointer? What condition determines if an element should be kept?

</details>

<details>
<summary>🎯 Hint 2: Two-Pointer Technique</summary>

Use a slow pointer (write index) and fast pointer (read index):
- Fast pointer scans every element
- When fast pointer finds an element != val, copy it to slow pointer position
- Increment slow pointer only when you copy an element
- Return slow pointer as the new length

This effectively "compresses" the array, moving all valid elements to the front.

</details>

<details>
<summary>📝 Hint 3: Two-Pointer Algorithm</summary>

**Pseudocode (Approach 1 - Two Pointers):**
```
1. Initialize write = 0
2. For read from 0 to n-1:
   a. If nums[read] != val:
      - nums[write] = nums[read]
      - write++
3. Return write
```

**Pseudocode (Approach 2 - Swap with End):**
```
1. Initialize left = 0, right = n - 1
2. While left <= right:
   a. If nums[left] == val:
      - Swap nums[left] with nums[right]
      - right--
   b. Else:
      - left++
3. Return left
```

Approach 2 is better when elements to remove are rare (fewer swaps).

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Create new array | O(n) | O(n) | Not in-place |
| **Two pointers (copy)** | **O(n)** | **O(1)** | Each element examined once |
| Two pointers (swap) | O(n) | O(1) | Better when val is rare |

## Common Mistakes

### 1. Creating a new array instead of in-place
```python
# WRONG: Uses extra space
result = []
for num in nums:
    if num != val:
        result.append(num)
return len(result)

# CORRECT: Modifies nums in-place
write = 0
for read in range(len(nums)):
    if nums[read] != val:
        nums[write] = nums[read]
        write += 1
return write
```

### 2. Not returning the correct length
```python
# WRONG: Returns original array length
for i in range(len(nums)):
    if nums[i] != val:
        # ... move elements ...
return len(nums)

# CORRECT: Returns new length (write pointer position)
write = 0
for read in range(len(nums)):
    if nums[read] != val:
        nums[write] = nums[read]
        write += 1
return write  # This is the new length
```

### 3. Overcomplicating with element shifting
```python
# WRONG: Shifting elements is O(n²)
i = 0
while i < len(nums):
    if nums[i] == val:
        for j in range(i, len(nums)-1):
            nums[j] = nums[j+1]
    else:
        i += 1

# CORRECT: Simple two-pointer approach is O(n)
write = 0
for read in range(len(nums)):
    if nums[read] != val:
        nums[write] = nums[read]
        write += 1
```

### 4. Trying to maintain relative order when not needed
```python
# UNNECESSARY: Problem doesn't require maintaining order
# This works but does extra work:
for i in range(len(nums)):
    if nums[i] != val:
        # carefully preserve order

# SIMPLER: Order doesn't matter
# Just copy or swap elements efficiently
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Remove duplicates | Remove duplicates instead of value | Compare with previous element |
| Remove range | Remove all elements in [a, b] | Check if element in range |
| Keep only k occurrences | Allow up to k copies of val | Count occurrences while copying |
| Move zeros to end | Specific value (0) goes to end | Two pointers, non-zeros to front |
| Stable removal | Maintain relative order | Use copy approach (already stable) |

## Practice Checklist

**Correctness:**
- [ ] Handles empty array
- [ ] Handles array with no elements to remove
- [ ] Handles array with all elements to remove
- [ ] Handles single element array
- [ ] Returns correct new length
- [ ] First k elements are correct (order doesn't matter)

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 5-7 minutes
- [ ] Can discuss complexity
- [ ] Can explain why this is O(1) space
- [ ] Can compare copy vs swap approaches

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Two Pointers Pattern](../../strategies/patterns/two-pointers.md)
