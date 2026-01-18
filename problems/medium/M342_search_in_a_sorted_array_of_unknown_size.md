---
id: M342
old_id: A169
slug: search-in-a-sorted-array-of-unknown-size
title: Search in a Sorted Array of Unknown Size
difficulty: medium
category: medium
topics: ["array", "binary-search"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems:
  - E033_binary_search.md
  - M117_search_in_rotated_sorted_array.md
  - M132_find_first_and_last_position_of_element_in_sorted_array.md
prerequisites:
  - binary-search
  - exponential-search
  - array-manipulation
strategy_ref: ../strategies/patterns/binary-search.md
---
# Search in a Sorted Array of Unknown Size

## Problem

This is an interactive problem where you search for a target value in a sorted array whose size is unknown to you. The twist is that you cannot access the array directly or query its length. Instead, you must use a restricted interface called `ArrayReader` that provides a single method: `ArrayReader.get(i)`.

Here's how the interface works. When you call `get(i)` with index `i` (using 0-based indexing), it behaves as follows:
- If `i` is within the array bounds, it returns the element at position `i`
- If `i` exceeds the array boundaries, it returns a sentinel value of `2³¹ - 1` (2147483647, the maximum 32-bit integer)

The array is sorted in strictly increasing order and contains distinct elements. Given a target value, your task is to find its index in this hidden array, returning `-1` if the target doesn't exist.

The challenge is achieving this in `O(log n)` time complexity without knowing the array length upfront. A naive approach of finding the array length first by checking each index sequentially would take O(n) time, which violates the requirement. You'll need to combine exponential search to find boundaries with binary search to locate the target efficiently.

## Why This Matters

This problem mirrors real-world scenarios where you search in data structures of unknown size, such as searching infinite streams, paginated API results, or distributed databases where querying the total size is expensive. The exponential search technique you'll learn is used in database query optimizers and file systems. More importantly, this problem teaches you to adapt classic algorithms when assumptions change. Instead of applying binary search directly, you must first establish boundaries, demonstrating how fundamental patterns can be composed to solve complex constraints.

## Examples

**Example 1:**
- Input: `secret = [-1,0,3,5,9,12], target = 9`
- Output: `4`
- Explanation: The value 9 is located at index 4.

**Example 2:**
- Input: `secret = [-1,0,3,5,9,12], target = 2`
- Output: `-1`
- Explanation: The value 2 is absent from the array.

## Constraints

- 1 <= secret.length <= 10⁴
- -10⁴ <= secret[i], target <= 10⁴
- secret is sorted in a strictly increasing order.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Find the Search Boundary with Exponential Growth</summary>

Since you don't know the array length, you can't directly binary search. First, find a valid right boundary:

Start with `left = 0`, `right = 1`.
While `reader.get(right) < target`:
    - Double right: `right *= 2`

This exponential growth finds a boundary in O(log n) time. When `reader.get(right) >= target` or equals the sentinel value (2³¹ - 1), you know the target (if it exists) is in range [left, right].

This is called "exponential search" or "galloping search."
</details>

<details>
<summary>Hint 2: Standard Binary Search Within Bounds</summary>

Once you have the boundary [left, right], perform standard binary search:

```
while left <= right:
    mid = left + (right - left) // 2
    value = reader.get(mid)

    if value == target:
        return mid
    elif value > target or value == 2^31 - 1:
        right = mid - 1
    else:
        left = mid + 1

return -1  # Not found
```

Key insight: Treat the sentinel value (2³¹ - 1) as "greater than target" to shrink the search space.
</details>

<details>
<summary>Hint 3: Handle Edge Cases</summary>

Consider these scenarios:
- Target is at index 0: exponential search still works
- Target is larger than all elements: will encounter sentinel values
- Array length is 1: right boundary quickly found

The sentinel value (2³¹ - 1) is guaranteed to be larger than any valid array element, making it safe to treat as "infinity."
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Linear Search | O(n) | O(1) | Check each index sequentially until found or sentinel |
| Exponential Search + Binary Search | O(log n) | O(1) | Find boundary in O(log n), then binary search in O(log n) |
| Guess High Boundary | O(log n) | O(1) | Start with large right (e.g., 10000), but less efficient |

## Common Mistakes

### Mistake 1: Linear Search for Boundary
```python
# DON'T: Find boundary linearly
class Solution:
    def search(self, reader: 'ArrayReader', target: int) -> int:
        # Problem: linear scan to find length
        right = 0
        while reader.get(right) != 2**31 - 1:
            right += 1

        # Then binary search
        left = 0
        while left <= right:
            # ... binary search logic
        return -1
# Problem: O(n) time to find length, violates requirement
```

**Why it's wrong:** Incrementing `right` one at a time takes O(n) time, which violates the O(log n) requirement.

**Fix:** Use exponential growth: `right *= 2` each iteration.

### Mistake 2: Not Handling Sentinel Value in Binary Search
```python
# DON'T: Ignore sentinel value during binary search
class Solution:
    def search(self, reader: 'ArrayReader', target: int) -> int:
        left, right = 0, 10000

        while left <= right:
            mid = (left + right) // 2
            value = reader.get(mid)

            # Problem: not checking if value == 2^31 - 1
            if value == target:
                return mid
            elif value < target:
                left = mid + 1
            else:
                right = mid - 1
        return -1
# Problem: May search beyond array bounds unnecessarily
```

**Why it's wrong:** When `value == 2³¹ - 1`, it means we're out of bounds. We should treat this as "too far right" and shrink the range.

**Fix:** Check `if value == target: return mid; elif value > target or value == 2**31 - 1: right = mid - 1`.

### Mistake 3: Integer Overflow in Exponential Search
```python
# DON'T: Allow right to overflow
class Solution:
    def search(self, reader: 'ArrayReader', target: int) -> int:
        left, right = 0, 1

        # Problem: right can overflow and become negative
        while reader.get(right) < target:
            right *= 2  # Can overflow with large arrays!

        # Binary search
        # ...
        return -1
# Problem: In languages like Java/C++, this causes overflow
```

**Why it's wrong:** Doubling `right` can cause integer overflow in statically typed languages, leading to negative values.

**Fix:** Check `if right > 10^4: break` or use `right = min(right * 2, 10^4)` based on constraints.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Find Minimum in Unknown Sorted Array | Locate minimum without knowing length | Medium |
| Search in 2D Unknown Matrix | Extend to 2D sorted matrix of unknown size | Hard |
| Find Peak Element in Unknown Array | Find local maximum without knowing bounds | Medium |
| Unbounded Binary Search | General technique for searching unbounded ranges | Medium |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Implemented exponential search for boundary finding
- [ ] Applied binary search within found bounds
- [ ] Handled sentinel value (2³¹ - 1) correctly
- [ ] Tested edge cases: target at index 0, not found, large arrays
- [ ] Analyzed time/space complexity
- [ ] **Day 1-3:** Revisit and implement without reference
- [ ] **Week 1:** Solve unbounded binary search variations
- [ ] **Week 2:** Apply to infinite stream problems

**Strategy**: See [Array Pattern](../strategies/patterns/binary-search.md)
