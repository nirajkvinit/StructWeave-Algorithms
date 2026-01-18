---
id: E107
old_id: I079
slug: wiggle-sort
title: Wiggle Sort
difficulty: easy
category: easy
topics: ["array", "greedy"]
patterns: ["greedy"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["M179", "M180", "E108"]
prerequisites: ["array-manipulation", "greedy-algorithms", "in-place-operations"]
strategy_ref: ../strategies/patterns/greedy.md
---
# Wiggle Sort

## Problem

Rearrange an array to create an alternating "wiggle" pattern where elements at even indices are less than or equal to their neighbors, and elements at odd indices are greater than or equal to their neighbors. Formally, nums[0] <= nums[1] >= nums[2] <= nums[3] >= nums[4], and so on.

The key insight is that you don't need global ordering (like sorting would provide). You only need local ordering: each element should satisfy its constraint relative to its immediate neighbors. This suggests a greedy approach: walk through the array and whenever you find a violation of the wiggle property, fix it immediately with a swap. The beautiful part is that fixing a local violation doesn't break previously satisfied conditions, so a single pass suffices.

For example, at even index i, you want nums[i] <= nums[i+1]. If this is violated (nums[i] > nums[i+1]), simply swap them. At odd index i, you want nums[i] >= nums[i+1]. If this is violated (nums[i] < nums[i+1]), swap. This greedy strategy works because each swap only affects the current and next position, and since you're moving forward, you never revisit fixed positions.

## Why This Matters

This problem teaches the power of greedy algorithms and local optimization. Many problems that seem to require global sorting can actually be solved more efficiently with local adjustments. The wiggle sort demonstrates a crucial problem-solving principle: when each element only needs to satisfy constraints relative to its neighbors (not all elements), greedy local fixes often work. This pattern appears in array rearrangement problems, scheduling tasks with constraints, and optimization problems where local decisions lead to global solutions. Understanding when greedy approaches succeed versus when they fail is a fundamental algorithmic skill. This problem also reinforces in-place array manipulation without extra space, a common interview requirement that tests your ability to modify data structures efficiently.

## Examples

**Example 1:**
- Input: `nums = [3,5,2,1,6,4]`
- Output: `[3,5,1,6,2,4]`
- Explanation: [1,6,2,5,3,4] is also accepted.

**Example 2:**
- Input: `nums = [6,6,5,6,3,8]`
- Output: `[6,6,5,6,3,8]`

## Constraints

- 1 <= nums.length <= 5 * 10⁴
- 0 <= nums[i] <= 10⁴
- It is guaranteed that there will be an answer for the given input nums.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Identify the Pattern</summary>

A wiggle pattern means peaks and valleys alternate. At even indices (0, 2, 4...), values should be less than or equal to their neighbors. At odd indices (1, 3, 5...), values should be greater than or equal to their neighbors. You only need to ensure each position satisfies its local constraint.

</details>

<details>
<summary>🎯 Hint 2: Greedy Local Swaps</summary>

You don't need to sort the entire array. Walk through the array and at each position, check if the wiggle condition is violated. If position i should be a peak (odd index) but is smaller than its neighbor, or should be a valley (even index) but is larger than its neighbor, simply swap with that neighbor. This greedy approach works because fixing local violations maintains previously satisfied conditions.

</details>

<details>
<summary>📝 Hint 3: One-Pass Solution</summary>

Pseudocode:
```
for i from 0 to n-2:
    if i is even:
        // Should be valley: nums[i] <= nums[i+1]
        if nums[i] > nums[i+1]:
            swap(nums[i], nums[i+1])
    else:
        // Should be peak: nums[i] >= nums[i+1]
        if nums[i] < nums[i+1]:
            swap(nums[i], nums[i+1])
```

This single pass ensures the wiggle property throughout the array.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Sort + Rearrange | O(n log n) | O(1) | Sort then interleave first/second halves |
| **Greedy Swap** | **O(n)** | **O(1)** | Optimal: One pass with local swaps maintains wiggle property |

## Common Mistakes

### Mistake 1: Unnecessary Sorting

**Wrong:**
```python
nums.sort()  # O(n log n) - overkill
# Then rearrange sorted elements
result = []
left, right = 0, len(nums) - 1
while left <= right:
    result.extend([nums[left], nums[right]])
    left += 1
    right -= 1
```

**Correct:**
```python
for i in range(len(nums) - 1):
    if i % 2 == 0:  # Even index - should be valley
        if nums[i] > nums[i + 1]:
            nums[i], nums[i + 1] = nums[i + 1], nums[i]
    else:  # Odd index - should be peak
        if nums[i] < nums[i + 1]:
            nums[i], nums[i + 1] = nums[i + 1], nums[i]
```

Sorting is unnecessary because we only need local ordering constraints, not global sorting.

### Mistake 2: Comparing with Both Neighbors

**Wrong:**
```python
# Trying to check both neighbors at once
if i > 0 and i < len(nums) - 1:
    if nums[i-1] >= nums[i] <= nums[i+1]:  # Complex logic
        # ... swap logic
```

**Correct:**
```python
# Only check forward neighbor
for i in range(len(nums) - 1):
    if (i % 2 == 0 and nums[i] > nums[i + 1]) or \
       (i % 2 == 1 and nums[i] < nums[i + 1]):
        nums[i], nums[i + 1] = nums[i + 1], nums[i]
```

Checking only the next neighbor is sufficient and simpler.

### Mistake 3: Creating New Array Instead of In-Place

**Wrong:**
```python
result = [0] * len(nums)
# ... populate result
return result  # Uses O(n) extra space
```

**Correct:**
```python
# Modify nums in-place
for i in range(len(nums) - 1):
    # ... swap elements in nums directly
# No return needed if modifying in-place
```

The problem requires in-place modification to avoid extra space usage.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Wiggle Sort II | No equal neighbors allowed: strict inequalities | Medium |
| Wiggle Subsequence | Find longest wiggle subsequence | Medium |
| 3-Way Wiggle | Pattern with 3 levels instead of 2 | Medium |
| K-Way Wiggle | Generalize to k different levels | Hard |
| Minimum Swaps | Find minimum swaps needed for wiggle sort | Medium |

## Practice Checklist

- [ ] Solve using greedy one-pass approach (10 min)
- [ ] Handle edge case: array with duplicates (5 min)
- [ ] Verify in-place modification works correctly (5 min)
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Try Wiggle Sort II for deeper understanding

**Strategy**: See [Greedy Pattern](../strategies/patterns/greedy.md)
