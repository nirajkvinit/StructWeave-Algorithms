---
id: E249
old_id: A363
slug: monotonic-array
title: Monotonic Array
difficulty: easy
category: easy
topics: ["array"]
patterns: ["single-pass"]
estimated_time_minutes: 15
frequency: medium
related_problems:
  - E088_merge_sorted_array.md
  - E121_best_time_to_buy_and_sell_stock.md
prerequisites:
  - "Array traversal"
  - "Comparison operations"
  - "Boolean logic"
strategy_ref: ../prerequisites/arrays.md
---
# Monotonic Array

## Problem

An array is considered monotonic if its elements consistently follow one direction: either entirely non-decreasing or entirely non-increasing throughout the sequence. Your task is to determine whether a given integer array `nums` exhibits this monotonic property.

Let's clarify the two types of monotonic behavior:

1. **Monotonic increasing (non-decreasing)**: For any two positions `i` and `j` where `i <= j`, we have `nums[i] <= nums[j]`. This means as you move from left to right through the array, values either stay the same or increase - they never decrease. For example, `[1, 2, 2, 3]` is monotonic increasing because 1 ≤ 2 ≤ 2 ≤ 3.

2. **Monotonic decreasing (non-increasing)**: For any two positions `i` and `j` where `i <= j`, we have `nums[i] >= nums[j]`. This means values either stay the same or decrease as you move left to right - they never increase. For example, `[6, 5, 4, 4]` is monotonic decreasing because 6 ≥ 5 ≥ 4 ≥ 4.

Notice that consecutive equal elements are allowed in both cases - "non-decreasing" means the values don't go down (but can stay flat), and "non-increasing" means they don't go up (but can stay flat).

An array fails to be monotonic if it changes direction at some point. For example, `[1, 3, 2]` first increases (1 to 3) then decreases (3 to 2), violating monotonicity. Your function should return `true` if the array is monotonic in either direction, and `false` if it violates both patterns.

Edge cases to consider: arrays with all equal elements are both monotonic increasing and monotonic decreasing. Single-element and empty arrays are trivially monotonic.

## Why This Matters

Monotonicity checking is a fundamental concept that appears in many algorithmic contexts and real-world applications. Sorted or nearly-sorted data enables powerful optimization techniques like binary search, so detecting monotonic sequences is often the first step in choosing an efficient algorithm. This property appears in time series analysis (detecting trends in stock prices, sensor readings, or user metrics), validating sorted data structures, analyzing algorithm correctness (checking if a sequence of values maintains expected invariants), and in dynamic programming (where optimal substructure often requires monotonic properties). The pattern of tracking state with boolean flags while traversing an array is a versatile technique used in many single-pass algorithms. Understanding monotonicity also builds intuition for related concepts like convexity in optimization and unimodal sequences, which are important in advanced algorithm design and mathematical programming.

## Examples

**Example 1:**
- Input: `nums = [1,2,2,3]`
- Output: `true`

**Example 2:**
- Input: `nums = [6,5,4,4]`
- Output: `true`

**Example 3:**
- Input: `nums = [1,3,2]`
- Output: `false`

## Constraints

- 1 <= nums.length <= 10⁵
- -10⁵ <= nums[i] <= 10⁵

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Problem Understanding
An array is monotonic if it's either entirely non-decreasing OR entirely non-increasing. Note that equal consecutive elements are allowed in both cases.

What happens when you encounter the first pair of unequal elements? How does this determine the direction the rest of the array must follow?

### Tier 2 Hint - Solution Strategy
Track two boolean flags: `increasing` and `decreasing`. Start both as `true`. As you traverse the array:
- If `nums[i] > nums[i-1]`, set `decreasing = false`
- If `nums[i] < nums[i-1]`, set `increasing = false`

At the end, return `increasing OR decreasing`. If both are false, the array changed direction.

### Tier 3 Hint - Implementation Details
Alternative single-pass approach:
1. Compare consecutive elements
2. Track whether you've seen any increases and any decreases
3. If you've seen both increases AND decreases, return false
4. Otherwise return true

Edge case: Arrays with 0 or 1 element are always monotonic.

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Two flags | O(n) | O(1) | Optimal, single pass with boolean tracking |
| Direction detection | O(n) | O(1) | Find first non-equal pair, then validate rest |
| Compare all pairs | O(n²) | O(1) | Inefficient, not recommended |

## Common Mistakes

### Mistake 1: Not handling equal consecutive elements
```python
# Wrong: Treats equal elements as breaking monotonicity
for i in range(1, len(nums)):
    if nums[i] == nums[i-1]:
        return False
```
**Why it's wrong**: `[1,2,2,3]` is monotonic increasing. Equal consecutive elements are allowed in monotonic arrays.

### Mistake 2: Early termination on first direction change
```python
# Wrong: Returns false on first increase/decrease
increasing = None
for i in range(1, len(nums)):
    if nums[i] > nums[i-1]:
        if increasing == False:
            return False
        increasing = True
```
**Why it's wrong**: Logic is flawed - should check if OPPOSITE direction was already established, and should initialize properly.

### Mistake 3: Only checking one direction
```python
# Wrong: Only checks if increasing, ignores decreasing
for i in range(1, len(nums)):
    if nums[i] < nums[i-1]:
        return False
return True
```
**Why it's wrong**: `[6,5,4,4]` is monotonic decreasing but this would return `False`.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Strictly monotonic | Easy | No equal consecutive elements allowed |
| Count direction changes | Easy | Return number of times direction changes |
| Longest monotonic subarray | Medium | Find longest contiguous monotonic subarray |
| Make monotonic with k changes | Medium | Minimum changes to make array monotonic |
| Bitonic array | Medium | Array increases then decreases (one peak) |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Reviewed solution and understood all approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 3 days
- [ ] Practiced again after 1 week
- [ ] Can explain the solution clearly to others
- [ ] Solved all variations above

**Strategy**: See [Array Fundamentals](../prerequisites/arrays.md)
