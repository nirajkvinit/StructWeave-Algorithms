---
id: H001
old_id: F004
slug: median-of-two-sorted-arrays
title: Median of Two Sorted Arrays
difficulty: hard
category: hard
topics: ["binary-search", "divide-and-conquer", "array"]
patterns: ["binary-search-on-answer", "partition-based"]
estimated_time_minutes: 45
frequency: high
related_problems: ["M026", "H015", "M358"]
prerequisites: ["binary-search-basics", "median-concept", "array-partitioning"]
strategy_ref: ../strategies/patterns/binary-search.md
---

# Median of Two Sorted Arrays

## Problem

Given two sorted arrays `nums1` and `nums2`, return the median of the combined sorted array. The algorithm must run in **O(log(m+n))** time complexity.

```
Visualization:
nums1 = [1, 3, 8]
nums2 = [7, 9, 10, 11]

Merged (conceptually): [1, 3, 7, 8, 9, 10, 11]
                                 ↑
                              Median = 8

Key insight: We don't need to actually merge!
We need to find the correct partition point.
```

## Why This Matters

This problem is considered one of the most difficult "classic" interview problems because it combines:
- **Binary search on non-obvious search space**: Searching for a partition, not an element
- **Constraint reasoning**: The O(log(m+n)) requirement eliminates simple approaches
- **Edge case complexity**: Empty arrays, single elements, different lengths

**Real-world applications:**
- Distributed systems finding median across partitioned data
- Database query optimization for sorted index merging
- Real-time analytics on streaming sorted data

## Examples

**Example 1:**
- Input: `nums1 = [1,3], nums2 = [2]`
- Output: `2.00000`
- Explanation: merged = [1,2,3], median is 2.

**Example 2:**
- Input: `nums1 = [1,2], nums2 = [3,4]`
- Output: `2.50000`
- Explanation: merged = [1,2,3,4], median is (2 + 3) / 2 = 2.5.

**Example 3:**
- Input: `nums1 = [], nums2 = [1]`
- Output: `1.00000`
- Explanation: One array is empty; median is the single element.

**Example 4:**
- Input: `nums1 = [2], nums2 = []`
- Output: `2.00000`

## Constraints

- nums1.length == m
- nums2.length == n
- 0 <= m <= 1000
- 0 <= n <= 1000
- 1 <= m + n <= 2000
- -10⁶ <= nums1[i], nums2[i] <= 10⁶

## Think About

1. Why does the O(log(m+n)) requirement make merge-then-find infeasible?
2. What defines a "correct" partition of two arrays?
3. If you partition both arrays, how do you verify the partition is at the median?
4. Why binary search on the smaller array?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Why O(log) means binary search</summary>

The constraint O(log(m+n)) is a strong hint:
- O(m+n) merge-and-find is too slow
- O(log) means we must halve the search space each step
- This screams "binary search" - but on what?

**Key insight:** We're not searching for a value. We're searching for a **partition position**.

If the combined array has `m+n` elements, the median is at position `(m+n)/2` (or the average of positions `(m+n)/2` and `(m+n)/2 + 1` for even total).

</details>

<details>
<summary>🎯 Hint 2: The partition concept</summary>

Imagine cutting both arrays so that:
- Left half has exactly `(m+n+1)/2` elements total
- All elements in left half ≤ all elements in right half

```
nums1:  [1, 3 | 8, 9]      partition at index 2
nums2:  [2, 4, 5 | 7]      partition at index 3

Left side: [1, 3, 2, 4, 5]  →  5 elements
Right side: [8, 9, 7]       →  3 elements

For valid partition:
- max(left_nums1) ≤ min(right_nums2)  →  3 ≤ 7 ✓
- max(left_nums2) ≤ min(right_nums1)  →  5 ≤ 8 ✓
```

If both conditions hold, we found the correct partition!
Median = max(left side) for odd, or average of max(left) and min(right) for even.

</details>

<details>
<summary>📝 Hint 3: Binary search algorithm</summary>

```
Ensure nums1 is the smaller array (swap if needed)
m, n = len(nums1), len(nums2)
half_len = (m + n + 1) // 2

low, high = 0, m  # Binary search on nums1's partition point

while low <= high:
    partition1 = (low + high) // 2
    partition2 = half_len - partition1  # Derived from partition1

    # Get the 4 boundary elements (use -∞ and +∞ for edges)
    left1 = nums1[partition1 - 1] if partition1 > 0 else -infinity
    right1 = nums1[partition1] if partition1 < m else +infinity
    left2 = nums2[partition2 - 1] if partition2 > 0 else -infinity
    right2 = nums2[partition2] if partition2 < n else +infinity

    if left1 <= right2 and left2 <= right1:
        # Found valid partition!
        if (m + n) is odd:
            return max(left1, left2)
        else:
            return (max(left1, left2) + min(right1, right2)) / 2
    elif left1 > right2:
        high = partition1 - 1  # Move partition1 left
    else:
        low = partition1 + 1   # Move partition1 right
```

**Why search on smaller array?** Limits search space to O(log(min(m,n))).

</details>

---

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Merge and find median | O(m+n) | O(m+n) | Exceeds O(log) requirement |
| Two pointers to kth element | O(m+n) | O(1) | Still linear |
| Binary search (k elimination) | O(log(m+n)) | O(log(m+n)) | Recursive stack |
| **Binary search (partition)** | **O(log(min(m,n)))** | **O(1)** | Optimal |

**Why partition-based wins:**
- O(log(min(m,n))) ≤ O(log(m+n)) as required
- O(1) extra space (just variables)
- Iterative, no recursion overhead

---

## Common Mistakes

### 1. Off-by-one errors in partition indices
```python
# WRONG: Confusing partition index with element index
left1 = nums1[partition1]  # This is actually the RIGHT side!

# CORRECT: partition1 elements are on left, index partition1 is first right
left1 = nums1[partition1 - 1] if partition1 > 0 else float('-inf')
right1 = nums1[partition1] if partition1 < m else float('inf')
```

### 2. Not handling empty arrays
```python
# WRONG: Direct access without bounds check
left1 = nums1[partition1 - 1]  # Crashes if partition1 = 0

# CORRECT: Use infinity for out-of-bounds
left1 = nums1[partition1 - 1] if partition1 > 0 else float('-inf')
```

### 3. Binary searching on the larger array
```python
# WRONG: Wastes time and can cause invalid partition2
# If m > n, partition2 might become negative

# CORRECT: Always search on smaller array
if len(nums1) > len(nums2):
    nums1, nums2 = nums2, nums1
```

### 4. Incorrect median calculation for even/odd
```python
# WRONG: Always taking average
return (max_left + min_right) / 2

# CORRECT: Check parity
if (m + n) % 2 == 1:
    return max(left1, left2)  # Odd: just max of left
else:
    return (max(left1, left2) + min(right1, right2)) / 2
```

### 5. Wrong partition relationship
```python
# WRONG: Independent partitions
partition1 = some_value
partition2 = some_other_value  # No relationship!

# CORRECT: partition2 is derived from partition1
half_len = (m + n + 1) // 2
partition2 = half_len - partition1
```

---

## Visual Walkthrough

```
nums1 = [1, 3, 8, 9, 15]   (m=5)
nums2 = [7, 11, 18, 19, 21, 25]   (n=6)

Total = 11 elements, median is element at position 6 (1-indexed)
half_len = (5 + 6 + 1) // 2 = 6

Binary search on nums1 (smaller):
low=0, high=5

Iteration 1: partition1 = 2
├─ partition2 = 6 - 2 = 4
├─ Left side:  [1, 3] from nums1, [7, 11, 18, 19] from nums2
├─ Right side: [8, 9, 15] from nums1, [21, 25] from nums2
├─ Check: left1=3 ≤ right2=21 ✓, left2=19 ≤ right1=8 ✗
└─ 19 > 8, so move partition1 RIGHT: low = 3

Iteration 2: partition1 = 4
├─ partition2 = 6 - 4 = 2
├─ Left side:  [1, 3, 8, 9] from nums1, [7, 11] from nums2
├─ Right side: [15] from nums1, [18, 19, 21, 25] from nums2
├─ Check: left1=9 ≤ right2=18 ✓, left2=11 ≤ right1=15 ✓
└─ Valid partition found!

Median (odd total): max(left1=9, left2=11) = 11
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Find kth element** | Not just median | Modify half_len to k |
| **Three+ arrays** | Multiple sorted arrays | Generalize partition concept or use heap |
| **Unsorted arrays** | No sorting guarantee | Must sort first: O(n log n) |
| **Streaming median** | Continuous updates | Use two heaps (see Two Heaps pattern) |

---

## Practice Checklist

**Correctness:**
- [ ] Handles both arrays non-empty
- [ ] Handles one array empty
- [ ] Handles single elements
- [ ] Handles odd total length
- [ ] Handles even total length
- [ ] Handles negative numbers

**Algorithm Understanding:**
- [ ] Can explain partition concept without code
- [ ] Can derive partition2 from partition1
- [ ] Understands why we search smaller array
- [ ] Can trace through binary search steps

**Interview Readiness:**
- [ ] Can explain approach in 3 minutes
- [ ] Can code solution in 15 minutes
- [ ] Can discuss complexity confidently
- [ ] Can handle edge cases without hints

**Spaced Repetition Tracker:**
- [ ] Day 1: Study solution, understand partition
- [ ] Day 3: Implement from scratch
- [ ] Day 7: Code with edge cases
- [ ] Day 14: Explain to someone
- [ ] Day 30: Speed run (< 10 min)

---

**Strategy**: See [Binary Search Pattern](../../strategies/patterns/binary-search.md) | [Divide & Conquer](../../strategies/patterns/divide-and-conquer.md)
