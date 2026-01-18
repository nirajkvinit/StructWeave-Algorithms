---
id: E254
old_id: A389
slug: sort-array-by-parity-ii
title: Sort Array By Parity II
difficulty: easy
category: easy
topics: ["array", "sorting", "two-pointers"]
patterns: ["two-pointers"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - E251_sort_array_by_parity.md
  - E283_move_zeroes.md
prerequisites:
  - "Two pointer technique"
  - "Index manipulation"
  - "Parity checking"
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Sort Array By Parity II

## Problem

You're given an array `nums` with a special property: exactly half of its elements are even numbers and exactly half are odd numbers. Your task is to rearrange the array to satisfy a strict positioning rule based on indices. Specifically, all even numbers must occupy positions with even indices (0, 2, 4, 6, ...), and all odd numbers must occupy positions with odd indices (1, 3, 5, 7, ...). For example, given [4, 2, 5, 7], a valid output is [4, 5, 2, 7] where even numbers 4 and 2 are at indices 0 and 2, while odd numbers 5 and 7 are at indices 1 and 3. Since exactly half the numbers are even and the array length is even, the counts work out perfectly: if the array has length 2n, there are n even indices and n even numbers, plus n odd indices and n odd numbers. The relative order within the even or odd groups doesn't matter, so [2, 7, 4, 5] would also be valid for the same input. Return any valid arrangement that meets these parity-index alignment requirements.

## Why This Matters

This problem teaches index-aware array manipulation where the position of an element is as important as its value. Unlike simple partitioning where you just separate groups, here you must place elements at specific index positions based on a mathematical property (parity). This pattern appears frequently in memory-aligned data structures, interleaved array processing, and scheduling algorithms where even-odd positioning has semantic meaning (like alternating read-write operations in hardware). The two-pointer technique with index constraints extends your problem-solving toolkit beyond simple linear scans to cases where pointers advance by specific steps (2 instead of 1). In technical interviews, this problem distinguishes candidates who understand invariant maintenance - each iteration must preserve the property that correctly-placed elements remain untouched while only mismatched pairs get swapped. The problem also reinforces the importance of understanding problem constraints: recognizing that equal counts of evens and odds guarantees a solution exists simplifies your approach.

## Examples

**Example 1:**
- Input: `nums = [4,2,5,7]`
- Output: `[4,5,2,7]`
- Explanation: [4,7,2,5], [2,5,4,7], [2,7,4,5] would also have been accepted.

**Example 2:**
- Input: `nums = [2,3]`
- Output: `[2,3]`

## Constraints

- 2 <= nums.length <= 2 * 10⁴
- nums.length is even.
- Half of the integers in nums are even.
- 0 <= nums[i] <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Problem Understanding
Unlike sorting by parity where evens just need to be before odds, here each even number must be at an even index (0, 2, 4...) and each odd number at an odd index (1, 3, 5...).

Since exactly half are even and half are odd, and you need evens at even indices, the counts work out perfectly. How can you leverage this?

### Tier 2 Hint - Solution Strategy
Use two pointers approach:
- One pointer (`i`) scans even indices (0, 2, 4, ...)
- Another pointer (`j`) scans odd indices (1, 3, 5, ...)
- When `nums[i]` is odd and `nums[j]` is even, swap them
- Move pointers by 2 each time

This way, you only swap when there's a mismatch, placing numbers in their correct parity positions.

### Tier 3 Hint - Implementation Details
```
i = 0  # even index pointer
j = 1  # odd index pointer

while i < len(nums) and j < len(nums):
    if nums[i] % 2 == 0:  # even at even index, correct
        i += 2
    elif nums[j] % 2 == 1:  # odd at odd index, correct
        j += 2
    else:  # nums[i] is odd and nums[j] is even, swap
        swap(nums[i], nums[j])
        i += 2
        j += 2
```

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Two pointers | O(n) | O(1) | Optimal in-place solution |
| Separate arrays | O(n) | O(n) | Create even and odd arrays, then merge |
| Count and fill | O(n) | O(n) | Count positions, create new array |

## Common Mistakes

### Mistake 1: Sorting the array
```python
# Wrong: Sorting changes relative order unnecessarily
nums.sort()
# Then try to rearrange... overcomplicates
```
**Why it's wrong**: Sorting is O(n log n) and unnecessary. The two-pointer approach is O(n) and simpler.

### Mistake 2: Incrementing pointers by 1 instead of 2
```python
# Wrong: Should increment by 2 for even/odd indices
if nums[i] % 2 == 0:
    i += 1  # Should be i += 2
```
**Why it's wrong**: Even indices are 0, 2, 4, ... (increment by 2). Moving by 1 checks odd indices too.

### Mistake 3: Not handling all cases in the loop
```python
# Wrong: Missing case when both are correctly placed
while i < len(nums):
    if nums[i] % 2 == 1 and nums[j] % 2 == 0:
        swap(nums[i], nums[j])
    # Forgot to increment pointers in other cases!
```
**Why it's wrong**: Need to increment appropriate pointer even when no swap is needed. Must handle all three cases: correct even, correct odd, or swap.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Sort by parity | Easy | Just separate evens and odds, no index constraint (see E251) |
| K-way partitioning | Medium | Numbers divisible by k at indices divisible by k |
| Stable parity sort | Medium | Maintain relative order within even and odd groups |
| Minimum swaps to achieve parity | Medium | Count minimum swaps needed |
| Triplet parity arrangement | Medium | Three groups: divisible by 3, remainder 1, remainder 2 at respective indices |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Reviewed solution and understood all approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 3 days
- [ ] Practiced again after 1 week
- [ ] Can explain the solution clearly to others
- [ ] Solved all variations above

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
