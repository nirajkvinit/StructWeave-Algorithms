---
id: M374
old_id: A214
slug: largest-number-at-least-twice-of-others
title: Largest Number At Least Twice of Others
difficulty: medium
category: medium
topics: ["array"]
patterns: ["linear-scan"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - id: E172
    title: Third Maximum Number
    difficulty: easy
  - id: M088
    title: Kth Largest Element in an Array
    difficulty: medium
  - id: E132
    title: Find Peak Element
    difficulty: easy
prerequisites:
  - Array Traversal
  - Tracking Multiple Values
  - Comparison Operations
strategy_ref: ../strategies/fundamentals/arrays.md
---
# Largest Number At Least Twice of Others

## Problem

You have an array of integers `nums` that contains a unique largest value (no duplicates for the maximum). Your task is to verify whether this maximum element "dominates" all other elements in a specific way.

The dominance condition is: the maximum must be at least twice as large as every other element in the array. In mathematical terms, if `max` is the largest element and `x` is any other element, then `max >= 2 * x` must hold for all other elements.

If the maximum satisfies this dominance condition, return its index (position in the array). If it fails the condition for even one other element, return `-1`.

For example, in `[3, 6, 1, 0]`, the maximum is 6 at index 1. Check: `6 >= 2*3` (True), `6 >= 2*1` (True), `6 >= 2*0` (True). Since all comparisons pass, return 1. However, in `[1, 2, 3, 4]`, the maximum is 4, but `4 < 2*3`, so return `-1`.

Key insight: you only need to compare the maximum against the second-largest element. If the maximum is at least twice the second-largest, it automatically dominates all smaller elements too. This observation lets you solve the problem efficiently in a single pass.

## Why This Matters

This problem teaches you to identify when tracking multiple values simultaneously can simplify comparisons. The "dominant element" pattern appears in competitive analysis (checking if one option clearly outperforms all others), financial algorithms (detecting outliers in stock prices), and leaderboard systems (verifying if a leader has a commanding advantage). It reinforces the important technique of reducing complex multiple-element comparisons to simpler pairwise checks. While this specific problem is straightforward, the principle of finding relationships between ranked elements scales to more complex scenarios like finding k-dominant elements or maintaining running statistics in streaming data.

## Examples

**Example 1:**
- Input: `nums = [3,6,1,0]`
- Output: `1`
- Explanation: The maximum value is 6, located at position 1.
Checking the dominance condition: 6 >= 2*3, 6 >= 2*1, and 6 >= 2*0.
All comparisons pass, so we return 1.

**Example 2:**
- Input: `nums = [1,2,3,4]`
- Output: `-1`
- Explanation: The maximum is 4, but 4 < 2*3, failing the dominance requirement.

## Constraints

- 2 <= nums.length <= 50
- 0 <= nums[i] <= 100
- The largest element in nums is unique.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: What Do We Need to Track?</summary>

To verify if the maximum is at least twice every other element, we need to know:
1. The maximum value and its index
2. The second maximum value (the largest among the "other elements")

Key insight: If `max >= 2 * second_max`, then `max >= 2 * any_other_element` because all other elements are smaller than or equal to `second_max`.

This reduces the problem to finding the two largest elements in a single pass through the array.

</details>

<details>
<summary>Hint 2: Single Pass Solution</summary>

Track the maximum and second maximum values simultaneously:

```
max_val = -infinity
second_max = -infinity
max_idx = -1

for i, num in enumerate(nums):
    if num > max_val:
        second_max = max_val  # Old max becomes second max
        max_val = num
        max_idx = i
    elif num > second_max:
        second_max = num  # Update second max only
```

After the loop, check if `max_val >= 2 * second_max`. If yes, return `max_idx`, otherwise return `-1`.

</details>

<details>
<summary>Hint 3: Alternative Approach - Two Passes</summary>

While less efficient, a clearer approach:

1. **First pass**: Find the maximum value and its index
2. **Second pass**: Check if max is at least twice every other element

```python
max_idx = nums.index(max(nums))
max_val = nums[max_idx]

for i, num in enumerate(nums):
    if i != max_idx and max_val < 2 * num:
        return -1
return max_idx
```

This is O(n) time with two passes, but easier to understand and implement correctly.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (check all pairs) | O(n^2) | O(1) | Compare max with every element |
| Two Pass | O(n) | O(1) | Find max, then verify condition |
| Single Pass (track two largest) | O(n) | O(1) | Optimal - track max and second max |
| Sort-based | O(n log n) | O(1) or O(n) | Overkill for this problem |

## Common Mistakes

### Mistake 1: Only Checking Against Second Largest
```python
# Wrong: Only comparing to second largest without finding it correctly
def dominantIndex(nums):
    max_val = max(nums)
    nums_sorted = sorted(nums)
    second_max = nums_sorted[-2]
    # This is actually correct, but the mistake is thinking
    # you need to check against ALL elements, not just second max
    if max_val >= 2 * second_max:
        return nums.index(max_val)
    return -1
```

**Note:** This approach is actually correct but uses unnecessary sorting. The insight is that checking against the second maximum is sufficient.

### Mistake 2: Not Handling Edge Case with Index Update
```python
# Wrong: Not updating second_max correctly when finding new max
def dominantIndex(nums):
    max_val = second_max = -1
    max_idx = 0
    for i, num in enumerate(nums):
        if num > max_val:
            max_val = num
            max_idx = i
            # Forgot to update second_max!
        elif num > second_max:
            second_max = num
    # second_max might be -1 or incorrect
```

**Fix:** Update second_max when max changes:
```python
# Correct: Transfer old max to second_max
if num > max_val:
    second_max = max_val  # Key line!
    max_val = num
    max_idx = i
elif num > second_max:
    second_max = num
```

### Mistake 3: Comparing Against the Maximum Itself
```python
# Wrong: Including max in the comparison
def dominantIndex(nums):
    max_idx = nums.index(max(nums))
    max_val = nums[max_idx]
    for num in nums:  # Includes max_val itself!
        if max_val < 2 * num:
            return -1
    return max_idx
```

**Fix:** Skip the maximum element itself:
```python
# Correct: Exclude max_val from comparison
for i, num in enumerate(nums):
    if i != max_idx and max_val < 2 * num:
        return -1
return max_idx
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| K Times Larger Than Others | Max must be K times larger instead of 2x | Easy |
| Multiple Dominant Elements | Find all elements that dominate others | Medium |
| Dominant Element in Sliding Window | Check condition in subarrays of size k | Medium |
| 2D Dominant Element | Find element that dominates in a matrix | Medium |
| Dominant Pair | Find pair where one is 2x the other | Easy |

## Practice Checklist

- [ ] First attempt (within 30 minutes)
- [ ] Implement two-pass solution
- [ ] Optimize to single-pass solution
- [ ] Handle edge cases (array of size 2)
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Can explain why checking second max is sufficient
- [ ] Attempted K times larger variation

**Strategy**: See [Array Fundamentals](../strategies/fundamentals/arrays.md)
