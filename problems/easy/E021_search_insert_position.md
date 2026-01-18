---
id: E021
old_id: F035
slug: search-insert-position
title: Search Insert Position
difficulty: easy
category: easy
topics: ["array", "binary-search"]
patterns: ["binary-search"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E020", "M074", "M153"]
prerequisites: ["binary-search-basics", "array-basics"]
strategy_ref: ../strategies/patterns/binary-search.md
---
# Search Insert Position

## Problem

Given a sorted array of distinct integers in ascending order and a target value, return the index where the target would be if it's in the array, or the index where it should be inserted to maintain sorted order if it's not present.

For example, with array [1,3,5,6] and target 5, return index 2 (where 5 is located). With the same array and target 2, return index 1 (where 2 should be inserted between 1 and 3). If the target is 7, return index 4 (after all existing elements). If the target is 0, return index 0 (before all elements).

This problem introduces the fundamental concept of binary search and the "lower bound" pattern - finding the first position where a value could be placed. Your algorithm must achieve O(log n) time complexity by repeatedly dividing the search space in half, rather than scanning linearly through the array.

## Why This Matters

This problem is the canonical introduction to binary search and the lower_bound concept. It teaches:
- **Binary search fundamentals**: Logarithmic search in sorted data
- **Lower bound technique**: Finding insertion points
- **Invariant maintenance**: Preserving sorted order

**Real-world applications:**
- Maintaining sorted collections (databases, priority queues)
- Auto-complete systems inserting new suggestions
- Version control systems inserting commits in timeline

## Examples

**Example 1:**
- Input: `nums = [1,3,5,6], target = 5`
- Output: `2`

**Example 2:**
- Input: `nums = [1,3,5,6], target = 2`
- Output: `1`

**Example 3:**
- Input: `nums = [1,3,5,6], target = 7`
- Output: `4`

## Constraints

- 1 <= nums.length <= 10⁴
- -10⁴ <= nums[i] <= 10⁴
- nums contains **distinct** values sorted in **ascending** order.
- -10⁴ <= target <= 10⁴

## Think About

1. If you find the target, where should you insert it?
2. If you don't find the target, what does the final position tell you?
3. Can binary search do more than just find elements?
4. What invariant does binary search maintain about left and right pointers?

---

## Approach Hints

<details>
<summary>💡 Hint 1: What happens at the end of binary search?</summary>

When binary search fails to find the target, the `left` and `right` pointers cross.

At that moment, `left` points to where the target **would be** if it were in the array.

**Think about:**
- If target = 5 and array is [1, 3, 7, 9], where do left/right end up?
- Try tracing through: the search narrows to between 3 and 7
- `left` will be at index 2 (where 7 is), which is the correct insertion point

**Key insight:** Standard binary search already gives you the answer! Just return `left` when not found.

</details>

<details>
<summary>🎯 Hint 2: The lower_bound pattern</summary>

This problem is asking for the **lower bound** of target: the first position where you could insert target to maintain sorted order.

Standard binary search template works perfectly:
- If `nums[mid] == target`, you found it at `mid`
- If search fails, `left` is the insertion point

**Modification:** When you find the target, you can return `mid` immediately (since inserting at an existing position is valid).

**Alternative:** Don't return early - let the search complete, then `left` will be the answer regardless.

</details>

<details>
<summary>📝 Hint 3: Binary search algorithm</summary>

```
left = 0
right = len(nums) - 1

while left <= right:
    mid = (left + right) // 2

    if nums[mid] == target:
        return mid        # Found exact match

    elif nums[mid] < target:
        left = mid + 1    # Target is in right half

    else:
        right = mid - 1   # Target is in left half

# Loop ends when left > right
# At this point, left is the insertion position
return left
```

**Why `left` is always correct:**
- Loop maintains: all elements before `left` are < target
- Loop maintains: all elements from `right+1` onward are >= target
- When `left > right`, `left` is the first position >= target

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Linear Scan | O(n) | O(1) | Simple but doesn't use sorted property |
| **Binary Search (Optimal)** | **O(log n)** | **O(1)** | Logarithmic search; standard approach |

**Why Binary Search Wins:**
- Exploits sorted property to halve search space each iteration
- O(log n) is dramatically better for large arrays (10⁴ elements → ~13 comparisons)
- Same complexity whether target exists or not

---

## Common Mistakes

### 1. Off-by-one errors in loop condition
```python
# WRONG: Misses single element case
while left < right:  # Should be <=
    ...

# CORRECT
while left <= right:
    ...
```

### 2. Incorrect midpoint calculation
```python
# WRONG: Can overflow in languages with fixed-size integers
mid = (left + right) / 2

# CORRECT: Prevents overflow
mid = left + (right - left) // 2
# OR
mid = (left + right) // 2  # Safe in Python
```

### 3. Returning wrong value when not found
```python
# WRONG: Returns -1 or right
if target not found:
    return -1  # Should return insertion position!

# CORRECT: Return left
return left
```

### 4. Not handling edge cases
```python
# Edge case: target smaller than all elements
nums = [1, 3, 5], target = 0  # Should return 0

# Edge case: target larger than all elements
nums = [1, 3, 5], target = 7  # Should return 3

# The algorithm handles these naturally - left ends at the right position
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Find exact position only** | Return -1 if not found | Return -1 instead of left after loop |
| **Rotated sorted array** | Array rotated at pivot | Find pivot first, search appropriate half |
| **Insert and return array** | Modify array in-place | Use list.insert(left, target) |
| **2D matrix** | Sorted matrix | Treat as 1D array via index mapping |
| **Find upper bound** | Last position to insert | Continue search even when equal |

**Upper Bound Variation (insert after all equal elements):**
```python
def upper_bound(nums, target):
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = (left + right) // 2

        if nums[mid] <= target:  # Note: <= instead of <
            left = mid + 1
        else:
            right = mid - 1

    return left
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles target found (Example 1)
- [ ] Handles target not found (Example 2)
- [ ] Handles target larger than all (Example 3)
- [ ] Handles target smaller than all
- [ ] Handles single element array

**Optimization:**
- [ ] Achieved O(log n) time complexity
- [ ] Used O(1) space
- [ ] No unnecessary comparisons

**Interview Readiness:**
- [ ] Can explain binary search invariants
- [ ] Can code solution in 3 minutes
- [ ] Can explain why `left` is the answer
- [ ] Can handle edge cases without hints

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement upper_bound variant
- [ ] Day 14: Solve related problem E020
- [ ] Day 30: Quick review

---

**Strategy**: See [Binary Search Pattern](../strategies/patterns/binary-search.md)
