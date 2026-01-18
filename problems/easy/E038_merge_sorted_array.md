---
id: E038
old_id: F088
slug: merge-sorted-array
title: Merge Sorted Array
difficulty: easy
category: easy
topics: ["array", "binary-search", "divide-and-conquer"]
patterns: []
estimated_time_minutes: 15
frequency: high
related_problems: ["E001", "M001", "M021"]
prerequisites: ["two-pointers", "in-place-modification"]
strategy_ref: ../../strategies/patterns/two-pointers.md
---
# Merge Sorted Array

## Problem

You are given two sorted arrays of integers: `nums1` and `nums2`. Your task is to merge `nums2` into `nums1` such that the resulting array is also sorted in non-decreasing order. Here's the twist: `nums1` has been pre-allocated with extra space at the end to accommodate all elements from both arrays.

Specifically, `nums1` has a length of `m + n`, where the first `m` elements contain the actual values to merge, and the remaining `n` positions are filled with zeros as placeholders. The array `nums2` contains `n` elements. You need to modify `nums1` in place—meaning you cannot allocate a new array for the result.

**Key details:**
- `nums1` has total length `m + n`, with meaningful data in positions 0 to m-1
- `nums2` has length `n`, with all positions containing meaningful data
- Both arrays are already sorted before merging
- You must modify `nums1` directly without using extra space for another array
- The zeros at the end of `nums1` are placeholders, not part of the data to merge

**Example visualization:**
```
nums1 = [1, 2, 3, 0, 0, 0]  (m = 3)
nums2 = [2, 5, 6]            (n = 3)

After merge:
nums1 = [1, 2, 2, 3, 5, 6]
```

## Why This Matters

Merging sorted arrays is a fundamental operation that appears in merge sort, external sorting algorithms for large datasets, and database query optimization. This specific variant—merging in place—is particularly valuable because it teaches you to think creatively about using available space efficiently. The technique of filling arrays from the end rather than the beginning is a common optimization pattern that reduces time complexity by avoiding expensive shift operations. This problem also appears frequently in technical interviews as it tests your understanding of two-pointer techniques and in-place array manipulation.

## Examples

**Example 1:**
- Input: `nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3`
- Output: `[1,2,2,3,5,6]`
- Explanation: The arrays we are merging are [1,2,3] and [2,5,6].
The result of the merge is [1,2,2,3,5,6] with the underlined elements coming from nums1.

**Example 2:**
- Input: `nums1 = [1], m = 1, nums2 = [], n = 0`
- Output: `[1]`
- Explanation: The arrays we are merging are [1] and [].
The result of the merge is [1].

**Example 3:**
- Input: `nums1 = [0], m = 0, nums2 = [1], n = 1`
- Output: `[1]`
- Explanation: The arrays we are merging are [] and [1].
The result of the merge is [1].
Note that because m = 0, there are no elements in nums1. The 0 is only there to ensure the merge result can fit in nums1.

## Constraints

- nums1.length == m + n
- nums2.length == n
- 0 <= m, n <= 200
- 1 <= m + n <= 200
- -10⁹ <= nums1[i], nums2[j] <= 10⁹

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Direction of Merge</summary>

If you start merging from the beginning (index 0), you'll need to shift elements, which is expensive. Is there a way to avoid shifting?

Think about where the extra space is located in nums1. Can you fill from the end instead of the beginning?

</details>

<details>
<summary>🎯 Hint 2: Three Pointers Strategy</summary>

Use three pointers:
- One pointing to the last element of the actual data in nums1 (index m-1)
- One pointing to the last element of nums2 (index n-1)
- One pointing to the last position in nums1 (index m+n-1)

Compare elements from the end of both arrays and place the larger one at the end position. This way, you never overwrite unprocessed elements.

</details>

<details>
<summary>📝 Hint 3: Merge Algorithm</summary>

```
p1 = m - 1  # Last element in nums1's actual data
p2 = n - 1  # Last element in nums2
p = m + n - 1  # Last position in nums1

while p1 >= 0 and p2 >= 0:
    if nums1[p1] > nums2[p2]:
        nums1[p] = nums1[p1]
        p1 -= 1
    else:
        nums1[p] = nums2[p2]
        p2 -= 1
    p -= 1

# If nums2 has remaining elements, copy them
while p2 >= 0:
    nums1[p] = nums2[p2]
    p2 -= 1
    p -= 1
```

Note: If nums1 has remaining elements when p2 < 0, they're already in place!

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Copy to temp array | O(m + n) | O(m + n) | Extra space for merged result |
| Merge from start | O(m × n) | O(1) | Requires shifting elements |
| **Merge from end** | **O(m + n)** | **O(1)** | **Optimal: in-place, single pass** |

## Common Mistakes

### 1. Overwriting Unprocessed Elements
```python
# WRONG: Merging from the start overwrites data
def merge(nums1, m, nums2, n):
    p1, p2, p = 0, 0, 0
    while p1 < m and p2 < n:
        if nums1[p1] <= nums2[p2]:
            nums1[p] = nums1[p1]  # Overwrites nums1[p]!
            p1 += 1
        else:
            nums1[p] = nums2[p2]
            p2 += 1
        p += 1

# CORRECT: Merge from the end
def merge(nums1, m, nums2, n):
    p1, p2, p = m - 1, n - 1, m + n - 1
    while p1 >= 0 and p2 >= 0:
        if nums1[p1] > nums2[p2]:
            nums1[p] = nums1[p1]
            p1 -= 1
        else:
            nums1[p] = nums2[p2]
            p2 -= 1
        p -= 1
```

### 2. Forgetting Remaining Elements
```python
# WRONG: Doesn't handle remaining nums2 elements
def merge(nums1, m, nums2, n):
    p1, p2, p = m - 1, n - 1, m + n - 1
    while p1 >= 0 and p2 >= 0:
        # ... merge logic ...
    # Missing: copy remaining nums2 elements!

# CORRECT: Handle remaining elements
def merge(nums1, m, nums2, n):
    p1, p2, p = m - 1, n - 1, m + n - 1
    while p1 >= 0 and p2 >= 0:
        # ... merge logic ...
    # Copy any remaining nums2 elements
    while p2 >= 0:
        nums1[p] = nums2[p2]
        p2 -= 1
        p -= 1
```

### 3. Incorrect Comparison for Descending Merge
```python
# WRONG: Uses <= when merging from end
def merge(nums1, m, nums2, n):
    p1, p2, p = m - 1, n - 1, m + n - 1
    while p1 >= 0 and p2 >= 0:
        if nums1[p1] <= nums2[p2]:  # Should be >
            nums1[p] = nums1[p1]
            p1 -= 1

# CORRECT: Use > for descending placement
def merge(nums1, m, nums2, n):
    p1, p2, p = m - 1, n - 1, m + n - 1
    while p1 >= 0 and p2 >= 0:
        if nums1[p1] > nums2[p2]:
            nums1[p] = nums1[p1]
            p1 -= 1
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Merge k sorted arrays | Multiple arrays to merge | Use min-heap to track smallest element from each array |
| Return new array | Don't modify in-place | Allocate new array, merge from start |
| Merge linked lists | Lists instead of arrays | Two-pointer merge, adjust next pointers |
| Count inversions | Count swaps needed | Track when nums2 element is placed before nums1 element |
| Descending order | Merge into descending array | Reverse comparison logic |

## Practice Checklist

**Correctness:**
- [ ] Handles empty nums2 (n = 0)
- [ ] Handles empty nums1 data (m = 0)
- [ ] Correctly merges when all nums1 < all nums2
- [ ] Correctly merges when all nums2 < all nums1
- [ ] Handles duplicate values
- [ ] Modifies nums1 in-place

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 8 minutes
- [ ] Can discuss time/space complexity
- [ ] Can explain why merging from end is better
- [ ] Can handle follow-up about k arrays

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Two Pointers](../../strategies/patterns/two-pointers.md)
