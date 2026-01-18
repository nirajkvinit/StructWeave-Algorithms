---
id: E065
old_id: F162
slug: find-peak-element
title: Find Peak Element
difficulty: easy
category: easy
topics: ["array", "binary-search"]
patterns: ["binary-search", "divide-and-conquer"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["M162", "M852", "H1901"]
prerequisites: ["binary-search", "array-basics"]
strategy_ref: ../strategies/patterns/binary-search.md
---
# Find Peak Element

## Problem

A **peak element** in an array is an element that is strictly greater than its neighbors. Given an array of integers where no two adjacent elements are equal, find the index of any peak element.

For elements at the array boundaries:
- The first element (index 0) is a peak if it's greater than the second element
- The last element (index n-1) is a peak if it's greater than the second-to-last element
- Think of elements "outside" the array as negative infinity

Return the index of any peak you find - the problem guarantees at least one peak exists.

**Example patterns:**
```
[1,2,3,1]     → index 2 (value 3 is > both neighbors 2 and 1)
[1,2,1,3,5,6,4] → index 1 or 5 (both 2 and 6 are peaks)
[5,4,3,2,1]   → index 0 (first element, since 5 > 4)
```

**The challenge:** Can you find a peak in O(log n) time? The array is not sorted, but binary search still works here through clever reasoning about the "slope" at each position.

## Why This Matters

This problem demonstrates a powerful insight: **binary search works on more than just sorted arrays**. The key is identifying a property you can use to eliminate half the search space.

Here, that property is simple: "If I'm going uphill, there must be a peak ahead." This appears in:
- Finding local extrema in signal processing
- Identifying turning points in time series data
- Bitonic array search (arrays that increase then decrease)

Understanding this broadens your binary search intuition beyond "find element in sorted array" to "efficiently navigate decision spaces where you can reason about which direction contains your answer."

## Examples

**Example 1:**
- Input: `nums = [1,2,3,1]`
- Output: `2`
- Explanation: 3 is a peak element and your function should return the index number 2.

**Example 2:**
- Input: `nums = [1,2,1,3,5,6,4]`
- Output: `5`
- Explanation: Your function can return either index number 1 where the peak element is 2, or index number 5 where the peak element is 6.

## Constraints

- 1 <= nums.length <= 1000
- -2³¹ <= nums[i] <= 2³¹ - 1
- nums[i] != nums[i + 1] for all valid i.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding Peak Elements</summary>

A peak element is greater than its neighbors. For edge elements:
- First element is a peak if it's greater than the second
- Last element is a peak if it's greater than the second-to-last

Key insight: The problem GUARANTEES a solution exists. Why? Think about the edges: if you keep going uphill, you must eventually reach a peak (or the end of the array).

Can you find a peak in O(n)? Can you do better?

</details>

<details>
<summary>🎯 Hint 2: Binary Search Approach</summary>

While the array isn't sorted, binary search still works here!

At any position mid:
- If `nums[mid] < nums[mid+1]`: There must be a peak on the right (going uphill)
- If `nums[mid] > nums[mid+1]`: There must be a peak on the left or at mid (going downhill or at peak)

Why does this work? If we move toward the higher neighbor, we're guaranteed to find a peak because:
1. We can't go uphill forever (array is finite)
2. When uphill stops, that's a peak

This allows O(log n) solution!

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithm</summary>

**Binary Search Approach:**
```
1. Initialize left = 0, right = n - 1
2. While left < right:
   a. mid = left + (right - left) // 2
   b. If nums[mid] < nums[mid + 1]:
      - Peak must be on right side
      - left = mid + 1
   c. Else (nums[mid] > nums[mid + 1]):
      - Peak could be mid or on left side
      - right = mid
3. Return left (or right, they're equal)
```

Time: O(log n), Space: O(1)

**Linear Scan (simpler but slower):**
```
1. For i from 0 to n-1:
   a. Check if nums[i] is greater than both neighbors
   b. If yes, return i
2. Return n-1 (last element)
```

Time: O(n), Space: O(1)

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Linear Scan | O(n) | O(1) | Simple but slower |
| **Binary Search** | **O(log n)** | **O(1)** | Optimal; treat as search problem |

## Common Mistakes

### 1. Not Handling Edge Cases in Binary Search
```python
# WRONG: May access out of bounds
while left < right:
    mid = (left + right) // 2
    if nums[mid] < nums[mid + 1]:  # What if mid = n-1?
        left = mid + 1

# CORRECT: Ensure right boundary allows mid+1 access
while left < right:
    mid = left + (right - left) // 2
    if nums[mid] < nums[mid + 1]:
        left = mid + 1
    else:
        right = mid
```

### 2. Wrong Binary Search Update
```python
# WRONG: Can cause infinite loop
if nums[mid] < nums[mid + 1]:
    left = mid  # Should be mid + 1
else:
    right = mid - 1  # Could skip the peak at mid

# CORRECT: Proper boundary updates
if nums[mid] < nums[mid + 1]:
    left = mid + 1
else:
    right = mid  # Keep mid as candidate
```

### 3. Not Checking Single Element Array
```python
# WRONG: Assumes array has multiple elements
if nums[0] > nums[1]:
    return 0

# CORRECT: Handle single element
if len(nums) == 1:
    return 0
# Or use binary search which handles it naturally
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Find All Peaks | Return all peaks, not just one | Linear scan, check each position |
| Minimum Peak | Find peak with minimum value | Find all peaks, return minimum |
| Peak in 2D Array | 2D matrix instead of array | Binary search on rows/columns |
| Bitonic Array | Array increases then decreases | Same binary search approach |

## Practice Checklist

**Correctness:**
- [ ] Handles single element array
- [ ] Handles two element array
- [ ] Handles all increasing array
- [ ] Handles all decreasing array
- [ ] Handles multiple peaks correctly
- [ ] Returns valid index (not value)

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code binary search solution in 12 minutes
- [ ] Can explain why binary search works here
- [ ] Can discuss edge cases

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Binary Search Pattern](../../strategies/patterns/binary-search.md)
