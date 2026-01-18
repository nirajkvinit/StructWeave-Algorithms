---
id: E074
old_id: F179
slug: rotate-array
title: Rotate Array
difficulty: easy
category: easy
topics: ["array", "two-pointers"]
patterns: ["array-reversal"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E189", "M061", "M151"]
prerequisites: ["arrays", "in-place-algorithms"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Rotate Array

## Problem

Given an array `nums` and a non-negative integer `k`, rotate the array to the right by `k` positions. This means the last `k` elements should move to the front, and the first `n-k` elements should shift to the back.

For example, rotating `[1,2,3,4,5,6,7]` by `k=3` steps produces `[5,6,7,1,2,3,4]`. Notice how the last three elements (5, 6, 7) moved to the beginning.

**Important constraint:** Perform this rotation in-place, meaning you must modify the original array directly without allocating a new array (except for constant extra space like a few temporary variables).

**Watch out for:**
- When `k` is larger than the array length, rotating by `k` is the same as rotating by `k % n` (since a full rotation of `n` steps returns to the original position)
- When `k=0`, no rotation is needed
- When `k=n`, you complete one full rotation and return to the original arrangement

The challenge is finding an O(1) space solution rather than the obvious O(n) approach of creating a copy.

## Why This Matters

Array rotation appears in diverse practical scenarios:
- **Circular buffers**: Implementing efficient queue structures in operating systems and embedded systems
- **Image processing**: Rotating pixel matrices for image transformations
- **Cryptography**: Caesar cipher and other shift-based encryption schemes
- **Job scheduling**: Round-robin algorithms that cycle through tasks

This problem introduces the elegant reversal technique, a powerful pattern for in-place array transformations. Mastering this builds intuition for manipulating data without extra space, a critical skill for memory-constrained environments and performance optimization.

## Examples

**Example 1:**
- Input: `nums = [1,2,3,4,5,6,7], k = 3`
- Output: `[5,6,7,1,2,3,4]`
- Explanation: rotate 1 steps to the right: [7,1,2,3,4,5,6]
rotate 2 steps to the right: [6,7,1,2,3,4,5]
rotate 3 steps to the right: [5,6,7,1,2,3,4]

**Example 2:**
- Input: `nums = [-1,-100,3,99], k = 2`
- Output: `[3,99,-1,-100]`
- Explanation: rotate 1 steps to the right: [99,-1,-100,3]
rotate 2 steps to the right: [3,99,-1,-100]

## Constraints

- 1 <= nums.length <= 10⁵
- -2³¹ <= nums[i] <= 2³¹ - 1
- 0 <= k <= 10⁵

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: The Reversal Trick</summary>

Rotating right by k is equivalent to:
- Moving the last k elements to the front
- Shifting the first n-k elements to the back

There's an elegant solution using array reversal:
1. Reverse the entire array
2. Reverse the first k elements
3. Reverse the remaining n-k elements

Example: [1,2,3,4,5,6,7], k=3
- Reverse all: [7,6,5,4,3,2,1]
- Reverse first 3: [5,6,7,4,3,2,1]
- Reverse last 4: [5,6,7,1,2,3,4] ✓

Why does this work? Think about where each element ends up after each reversal.

</details>

<details>
<summary>🎯 Hint 2: Handle k > n</summary>

Important edge case: If k is larger than array length n, rotating by k is the same as rotating by k % n.

Example: [1,2,3], k=5
- k % n = 5 % 3 = 2
- Rotating by 5 = rotating by 2: [2,3,1]

Always normalize k: `k = k % n` before processing.

Also handle k=0 (no rotation needed) and n=1 (single element, no change).

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithms</summary>

**Reversal Algorithm (Optimal):**
```
1. Normalize: k = k % n
2. If k == 0: return (no rotation needed)
3. Reverse entire array: reverse(nums, 0, n-1)
4. Reverse first k elements: reverse(nums, 0, k-1)
5. Reverse last n-k elements: reverse(nums, k, n-1)

Helper function reverse(arr, start, end):
  while start < end:
    swap(arr[start], arr[end])
    start++, end--
```
Time: O(n), Space: O(1)

**Alternative: Cyclic Replacements:**
- Follow each element to its destination
- Continue until all elements moved
Time: O(n), Space: O(1), more complex

**Extra Space Approach:**
- Create new array
- Place each element at (i + k) % n
Time: O(n), Space: O(n)
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (k rotations) | O(n × k) | O(1) | Shift all elements k times |
| Extra Array | O(n) | O(n) | Copy to new array at correct positions |
| **Reversal (Optimal)** | **O(n)** | **O(1)** | Three reversals, in-place |
| Cyclic Replacements | O(n) | O(1) | Follow cycles, more complex to implement |

## Common Mistakes

### 1. Not Normalizing k
```python
# WRONG: Doesn't handle k > n
for _ in range(k):
    # Shift array right once
    # Very slow for large k!

# CORRECT: Normalize k first
k = k % len(nums)
if k == 0:
    return
# Then perform rotation
```

### 2. Using Extra Space (When In-Place Required)
```python
# WRONG: Creates new array (violates in-place requirement)
rotated = [0] * len(nums)
for i in range(len(nums)):
    rotated[(i + k) % len(nums)] = nums[i]
return rotated

# CORRECT: Use reversal trick in-place
k = k % len(nums)
reverse(nums, 0, len(nums) - 1)
reverse(nums, 0, k - 1)
reverse(nums, k, len(nums) - 1)
```

### 3. Incorrect Reversal Boundaries
```python
# WRONG: Off-by-one in reversal ranges
reverse(nums, 0, k)  # Should be k-1
reverse(nums, k+1, len(nums))  # Should start at k

# CORRECT: Proper inclusive ranges
reverse(nums, 0, k - 1)
reverse(nums, k, len(nums) - 1)
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Rotate left | Rotate in opposite direction | Same reversal, swap order of first/last reversals |
| Rotate 2D matrix | Rotate matrix 90 degrees | Transpose + reverse rows |
| Rotate by subarray | Rotate portion of array | Apply reversal to subrange |
| Circular array | Array wraps around naturally | Use modulo for indexing |

## Practice Checklist

**Correctness:**
- [ ] Handles k = 0 (no rotation)
- [ ] Handles k = n (full rotation, back to original)
- [ ] Handles k > n (normalizes with modulo)
- [ ] Handles n = 1 (single element)
- [ ] Handles k = 1 (simple rotation)
- [ ] Modifies array in-place
- [ ] Works with negative numbers

**Interview Readiness:**
- [ ] Can explain reversal trick
- [ ] Can code reversal solution in 8 minutes
- [ ] Can trace through example
- [ ] Can explain O(1) space complexity
- [ ] Can discuss alternative approaches

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve rotate left variation
- [ ] Day 14: Explain reversal trick to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Two Pointers Pattern](../../strategies/patterns/two-pointers.md)
