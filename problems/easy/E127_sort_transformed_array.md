---
id: E127
old_id: I159
slug: sort-transformed-array
title: Sort Transformed Array
difficulty: easy
category: easy
topics: ["array", "sorting", "two-pointers", "math"]
patterns: ["two-pointers"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E001", "M001", "E128"]
prerequisites: ["quadratic-functions", "two-pointers", "sorting"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Sort Transformed Array

## Problem

Given a sorted array of integers `nums` and three coefficients `a`, `b`, and `c`, you need to transform each element using a quadratic function and return the results in sorted order. The transformation follows the formula `f(x) = ax² + bx + c`, where `x` represents each element in the original array.

A quadratic function creates a parabola when graphed. When `a` is positive, the parabola opens upward (shaped like a U), placing the minimum value at the vertex and maximum values at the ends. When `a` is negative, the parabola opens downward (shaped like an upside-down U), placing the maximum at the vertex and minimum values at the ends. When `a` equals zero, the function becomes linear (`f(x) = bx + c`), and the transformed values maintain a consistent increasing or decreasing pattern.

Understanding these mathematical properties is crucial because they allow you to avoid the naive approach of transforming all values and then sorting. Since the input array is already sorted, you can strategically use two pointers to build the sorted result in a single pass.

## Why This Matters

This problem combines mathematical reasoning with algorithmic optimization, teaching you to exploit inherent properties in data rather than applying brute force. Quadratic transformations appear frequently in computational geometry (calculating distances), physics simulations (projectile motion), and financial modeling (compound growth curves). The two-pointer pattern you practice here extends to numerous array problems where sorted input enables linear-time solutions. In technical interviews, demonstrating that you can recognize when mathematical properties unlock algorithmic shortcuts shows advanced problem-solving maturity beyond memorized patterns.

## Examples

**Example 1:**
- Input: `nums = [-4,-2,2,4], a = 1, b = 3, c = 5`
- Output: `[3,9,15,33]`

**Example 2:**
- Input: `nums = [-4,-2,2,4], a = -1, b = 3, c = 5`
- Output: `[-23,-5,1,7]`

## Constraints

- 1 <= nums.length <= 200
- -100 <= nums[i], a, b, c <= 100
- nums is sorted in **ascending** order.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Transform and Sort
The most straightforward solution: apply the transformation to each element, then sort the result.

**Key Steps:**
1. Create a new array to store transformed values
2. Apply f(x) = ax² + bx + c to each element
3. Sort the resulting array

**When to use:** Quick implementation, works for all cases, but not optimal (O(n log n)).

### Intermediate Approach - Two Pointers Based on Parabola Properties
Think about the shape of a parabola. Where are the extreme values located?

**Key Steps:**
1. Understand that if a > 0, parabola opens upward (min at vertex, max at ends)
2. If a < 0, parabola opens downward (max at vertex, min at ends)
3. If a = 0, it's a line (monotonic)
4. Use two pointers at array ends to build result

**When to use:** When you want optimal O(n) time complexity by exploiting array's sorted property.

### Advanced Approach - Mathematical Vertex Analysis
Can you determine the vertex of the parabola and use it to optimize pointer movement?

**Key Steps:**
1. Calculate vertex position: x = -b/(2a)
2. Determine fill direction based on parabola opening
3. Compare values at pointers and fill from appropriate end
4. Handle a = 0 as special linear case

**When to use:** When you need the most efficient solution with deep understanding of quadratic properties.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Transform and Sort | O(n log n) | O(n) | Simple but not optimal |
| Two Pointers | O(n) | O(n) | Optimal; exploits sorted input |
| Vertex Analysis | O(n) | O(n) | Most elegant; requires math understanding |

## Common Mistakes

### Mistake 1: Ignoring the parabola direction
```python
# Wrong - always filling from left to right
def sortTransformedArray(nums, a, b, c):
    result = []
    left, right = 0, len(nums) - 1
    while left <= right:
        result.append(transform(nums[left]))  # Wrong direction
        left += 1
    return result
```

**Why it's wrong:** When a > 0, the parabola opens upward, so maximum values are at the ends. You should fill the result from the right end, not left.

**Fix:** Check if a >= 0 to determine fill direction. If a >= 0, fill from right to left (largest first). If a < 0, fill from left to right (smallest first).

### Mistake 2: Not handling a = 0 case
```python
# Wrong - assuming quadratic always
def sortTransformedArray(nums, a, b, c):
    left, right = 0, len(nums) - 1
    result = [0] * len(nums)
    # Always comparing like parabola
    if transform(nums[left]) > transform(nums[right]):
        # This logic breaks when a = 0
```

**Why it's wrong:** When a = 0, the function is linear (f(x) = bx + c), not quadratic. The monotonic property differs.

**Fix:** Handle a = 0 separately. If b > 0, array is already sorted after transformation. If b < 0, reverse it.

### Mistake 3: Incorrect pointer comparison
```python
# Wrong - comparing indices instead of transformed values
def sortTransformedArray(nums, a, b, c):
    left, right = 0, len(nums) - 1
    result = []
    while left <= right:
        if left > right:  # Wrong comparison
            result.append(transform(nums[left]))
```

**Why it's wrong:** You need to compare the transformed values f(nums[left]) vs f(nums[right]), not the indices or original values.

**Fix:** Calculate both transformed values and compare them to decide which pointer to advance.

## Variations

| Variation | Difficulty | Description | Key Difference |
|-----------|-----------|-------------|----------------|
| Cubic Transformation | Medium | Use f(x) = ax³ + bx² + cx + d | More complex inflection points |
| Multiple Functions | Medium | Apply different functions to different ranges | Piecewise functions |
| Unsorted Input | Medium | Input array not sorted | Must sort first or use different approach |
| Find Kth Element | Medium | Return only kth element after transformation | Can optimize with quickselect |

## Practice Checklist

Track your progress and spaced repetition:

- [ ] Initial attempt (after reading problem)
- [ ] Reviewed approach hints
- [ ] Implemented transform-and-sort solution
- [ ] Implemented two-pointer solution
- [ ] Handled all cases (a > 0, a < 0, a = 0)
- [ ] All test cases passing
- [ ] Reviewed common mistakes
- [ ] Revisit after 1 day
- [ ] Revisit after 3 days
- [ ] Revisit after 1 week
- [ ] Can explain parabola properties clearly

**Strategy Guide:** For pattern recognition and detailed techniques, see [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
