---
id: E224
old_id: A191
slug: find-pivot-index
title: Find Pivot Index
difficulty: easy
category: easy
topics: ["array", "prefix-sum"]
patterns: ["prefix-sum", "array-scan"]
estimated_time_minutes: 15
frequency: high
related_problems:
  - E001_two_sum
  - M238_product_of_array_except_self
  - M560_subarray_sum_equals_k
prerequisites:
  - Array iteration
  - Sum calculations
  - Mathematical reasoning
strategy_ref: ../strategies/patterns/prefix-sum.md
---
# Find Pivot Index

## Problem

Given an integer array `nums`, find the **pivot index** of the array. A **pivot index** is a position where the sum of all elements to its left equals the sum of all elements to its right. Importantly, the element at the pivot index itself is not included in either sum.

To handle boundary cases: when considering index 0 (the leftmost position), there are no elements to the left, so the left sum is treated as 0. Similarly, for the rightmost index, the right sum is 0. For example, if `nums = [2, 1, -1]`, index 0 is a pivot because the left sum is 0 and the right sum is `1 + (-1) = 0`.

If multiple valid pivot indices exist, return the **leftmost** (smallest index) one. If no pivot index exists, return `-1`. Note that the array can contain negative numbers, zero, and positive numbers, which means sums can increase, decrease, or stay the same as you traverse the array. This is important because it means you cannot use early termination strategies that assume monotonic sums.

Your task is to find and return the first (leftmost) valid pivot index, or `-1` if none exists.

## Why This Matters

The prefix sum pattern is one of the most versatile techniques in algorithm design, appearing in range query problems, subarray analysis, and computational geometry. This specific problem teaches you how to exploit mathematical relationships to avoid redundant computation, transforming a potentially O(n²) brute force solution into an elegant O(n) single-pass algorithm.

Real-world applications include load balancing (finding a split point where left servers have the same total load as right servers), financial analysis (finding a date where historical and future expected returns balance), time-series analysis (finding equilibrium points in sensor data), and even physics simulations (center of mass calculations). The technique of maintaining a running sum while deriving the complement from total sum is fundamental to many streaming algorithms.

From an interview perspective, this problem tests your ability to identify mathematical invariants: `left_sum + nums[i] + right_sum = total_sum` can be rearranged to `right_sum = total_sum - left_sum - nums[i]`. This algebraic manipulation eliminates the need to separately calculate right sums. It's a gateway problem to more complex prefix sum applications like finding subarrays with given sum or computing 2D range sums.

The pattern here generalizes beautifully: whenever you need to repeatedly query "what's the sum/product/XOR of elements in some range," consider precomputing prefix values. This problem is high-frequency in interviews because it's simple enough to explain quickly but rich enough to reveal whether candidates can think mathematically about data structures.

## Examples

**Example 1:**
- Input: `nums = [1,7,3,6,5,6]`
- Output: `3`
- Explanation: At position 3, the sum on the left (1 + 7 + 3 = 11) matches the sum on the right (5 + 6 = 11).

**Example 2:**
- Input: `nums = [1,2,3]`
- Output: `-1`
- Explanation: No position exists where left and right sums are equal.

**Example 3:**
- Input: `nums = [2,1,-1]`
- Output: `0`
- Explanation: At the first position, the left side is empty (sum = 0), and the right side totals to 1 + (-1) = 0.

## Constraints

- 1 <= nums.length <= 10⁴
- -1000 <= nums[i] <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Initial Direction
You could calculate left and right sums for each index separately, but that would be inefficient. Is there a mathematical relationship between the total sum, left sum, and right sum that you can exploit?

### Tier 2 Hint - Key Insight
If you know the total sum and the left sum at any position, you can calculate the right sum: `right_sum = total_sum - left_sum - nums[i]`. Iterate through the array once to get the total sum, then iterate again while maintaining a running left sum. Check at each position if left sum equals right sum.

### Tier 3 Hint - Implementation Details
Calculate `total = sum(nums)`. Initialize `left_sum = 0`. For each index `i`, compute `right_sum = total - left_sum - nums[i]`. If `left_sum == right_sum`, return `i`. Otherwise, update `left_sum += nums[i]` and continue. Return -1 if no pivot found.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Prefix sum (optimal) | O(n) | O(1) | Two passes: one for total, one for checking |
| Prefix sum array | O(n) | O(n) | Pre-compute all prefix sums in array |
| Brute force | O(n²) | O(1) | Calculate left and right sums for each index |

**Optimization notes:**
- Single pass is not possible (need total sum first)
- Two passes with O(1) space is optimal
- Can optimize by checking `2 * left_sum + nums[i] == total`

## Common Mistakes

### Mistake 1: Including pivot element in sums
```python
# Wrong - pivot element shouldn't be in either sum
right_sum = total - left_sum  # Missing - nums[i]

# Correct - exclude pivot element
right_sum = total - left_sum - nums[i]
```

### Mistake 2: Not handling negative numbers
```python
# Wrong - doesn't work with negatives
if left_sum > total:
    break  # Can have negative numbers!

# Correct - no early termination needed
# Just continue checking all indices
```

### Mistake 3: Updating left_sum before checking
```python
# Wrong - updates left_sum too early
for i in range(len(nums)):
    left_sum += nums[i]
    right_sum = total - left_sum
    if left_sum == right_sum:  # Already included nums[i]!
        return i

# Correct - check first, then update
for i in range(len(nums)):
    right_sum = total - left_sum - nums[i]
    if left_sum == right_sum:
        return i
    left_sum += nums[i]
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| All pivot indices | Easy | Return all valid pivot indices, not just first |
| Equilibrium with weights | Medium | Each element has a weight, find weighted equilibrium |
| 2D pivot point | Medium | Find point where all four quadrants have equal sum |
| Minimum operations to pivot | Hard | Min operations to make array have a pivot index |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve independently without hints (30 min time limit)
- [ ] Implement prefix sum approach
- [ ] Handle negative numbers correctly
- [ ] Test edge cases (single element, all equal)

**Spaced Repetition**
- [ ] Day 1: Solve again from scratch
- [ ] Day 3: Optimize using 2*left_sum formula
- [ ] Week 1: Solve all pivot indices variation
- [ ] Week 2: Explain mathematical relationship

**Mastery Validation**
- [ ] Can derive the right_sum formula
- [ ] Can explain why two passes are needed
- [ ] Solve in under 8 minutes
- [ ] Implement without referring to notes

**Strategy**: See [Prefix Sum Pattern](../strategies/patterns/prefix-sum.md)
