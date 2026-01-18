---
id: E202
old_id: A087
slug: valid-triangle-number
title: Valid Triangle Number
difficulty: easy
category: easy
topics: ["array", "two-pointers", "sorting"]
patterns: ["two-pointers", "sorting"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E125", "M015", "M016"]
prerequisites: ["sorting", "two-pointers", "triangle-inequality"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Valid Triangle Number

## Problem

You're given an array of positive integers representing potential side lengths. Your task is to count how many different combinations of three numbers from this array can form valid triangles.

For three lengths to form a valid triangle, they must satisfy the triangle inequality theorem, which states that the sum of any two sides must be greater than the third side. Formally, if you have three sides `a`, `b`, and `c`, all three of these conditions must hold: `a + b > c`, `a + c > b`, and `b + c > a`. However, there's a clever optimization: if you sort the three sides so that `a <= b <= c`, you only need to check whether `a + b > c`. If this holds, the other two inequalities are automatically satisfied.

The brute force approach of checking all possible triplets would have O(n³) complexity. The key insight is that sorting the array first lets you use the two-pointer technique to count valid triangles much more efficiently. By fixing the largest side and using two pointers to find pairs of smaller sides, you can achieve O(n²) complexity.

Note that different indices matter even if values are the same. For example, if the array is [2, 2, 3, 4], the two 2's at different positions count as different elements when forming triangles.

## Why This Matters

This problem combines geometric reasoning with algorithmic optimization, demonstrating how mathematical properties can dramatically simplify computation. The triangle inequality theorem appears in computer graphics (mesh validation, collision detection), network routing (triangle inequality in metric spaces), and location-based services (determining if three points can form a valid geographic triangle).

The two-pointer technique showcased here is essential for many array problems. After sorting, you fix one element and use two pointers to efficiently find pairs that satisfy a condition - this same pattern appears in 3Sum, container with most water, trapping rain water, and many other problems. Mastering this pattern is crucial for interview success.

Understanding when and how to reduce the number of conditions to check (from three inequalities to one) is a valuable problem-solving skill that extends to constraint satisfaction, optimization problems, and logical reasoning challenges.

## Examples

**Example 1:**
- Input: `nums = [2,2,3,4]`
- Output: `3`
- Explanation: Valid combinations are:
2,3,4 (using the first 2)
2,3,4 (using the second 2)
2,2,3

**Example 2:**
- Input: `nums = [4,2,3,4]`
- Output: `4`

## Constraints

- 1 <= nums.length <= 1000
- 0 <= nums[i] <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Triangle Inequality Theorem
For three sides to form a valid triangle, they must satisfy:
- a + b > c
- a + c > b
- b + c > a

If you sort the array first, can you reduce the number of conditions to check? (Hint: If a ≤ b ≤ c, only one inequality needs checking)

### Hint 2: Efficient Counting with Sorting
After sorting the array:
- Fix the largest side (rightmost element)
- Use two pointers to find pairs of smaller sides that can form a triangle
- When a + b > c (where c is fixed), how many valid triangles can you count?

If left and right pointers satisfy the inequality, all elements between them also work.

### Hint 3: Optimized Two-Pointer Approach
For a fixed largest side at index k:
- Start with left = 0, right = k - 1
- If nums[left] + nums[right] > nums[k], count all triangles and move right pointer
- Otherwise, move left pointer

Can you achieve O(n²) time complexity instead of O(n³)?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Sort + Two Pointers | O(n²) | O(log n) | Sort once, then O(n) for each fixed side; optimal |
| Brute Force (Three Loops) | O(n³) | O(1) | Check all triplets; too slow |
| Binary Search | O(n² log n) | O(log n) | Sort, then binary search for each pair; not optimal |

## Common Mistakes

### Mistake 1: Not Sorting First
```python
# Wrong: Checks all three inequalities for unsorted array
def triangleNumber(nums):
    count = 0
    for i in range(len(nums)):
        for j in range(i+1, len(nums)):
            for k in range(j+1, len(nums)):
                a, b, c = nums[i], nums[j], nums[k]
                if a+b>c and a+c>b and b+c>a:  # All 3 checks needed!
                    count += 1
    return count
```
**Why it's wrong:** While this works, it requires checking all three inequalities and has O(n³) complexity.

**Correct approach:** Sort first, then only check `nums[i] + nums[j] > nums[k]` where i < j < k.

### Mistake 2: Incorrect Triangle Counting
```python
# Wrong: Only counts one triangle when multiple exist
def triangleNumber(nums):
    nums.sort()
    count = 0
    for k in range(2, len(nums)):
        left, right = 0, k - 1
        while left < right:
            if nums[left] + nums[right] > nums[k]:
                count += 1  # Should count (right - left) triangles!
                right -= 1
            else:
                left += 1
```
**Why it's wrong:** When nums[left] + nums[right] > nums[k], all elements from left to right-1 can form triangles with right and k.

**Correct approach:** Add `(right - left)` to count, not just 1.

### Mistake 3: Wrong Pointer Movement
```python
# Wrong: Moves pointers incorrectly
def triangleNumber(nums):
    nums.sort()
    count = 0
    for k in range(2, len(nums)):
        left, right = 0, k - 1
        while left < right:
            if nums[left] + nums[right] > nums[k]:
                count += (right - left)
                left += 1  # Wrong pointer!
            else:
                right -= 1  # Wrong pointer!
```
**Why it's wrong:** When the sum is valid, should decrease right to explore more combinations. When invalid, should increase left.

**Correct approach:** If sum > k: `count += (right - left); right -= 1`. Otherwise: `left += 1`.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Count right triangles | Count only right-angled triangles (a²+b²=c²) | Medium |
| Maximum triangle perimeter | Find triplet with maximum sum | Medium |
| Valid quadrilateral number | Extend to 4 sides forming quadrilateral | Hard |
| Triangle with constraints | Sides must satisfy additional constraints | Medium |
| Minimum difference triangle | Find triplet with sides closest to each other | Medium |

## Practice Checklist

Practice this problem until you can confidently complete these tasks:

- [ ] Day 1: Solve with sort + two pointers (25 min)
- [ ] Day 3: Implement without looking at notes (20 min)
- [ ] Day 7: Solve efficiently, explain triangle inequality (15 min)
- [ ] Day 14: Explain why sorting simplifies the problem
- [ ] Day 30: Solve a variation (count right triangles)

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
