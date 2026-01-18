---
id: E093
old_id: I038
slug: product-of-array-except-self
title: Product of Array Except Self
difficulty: easy
category: easy
topics: ["array", "prefix-sum"]
patterns: ["prefix-product", "suffix-product"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E001", "E088", "M025"]
prerequisites: ["arrays", "prefix-sum", "space-optimization"]
strategy_ref: ../strategies/patterns/prefix-sum.md
---
# Product of Array Except Self

## Problem

Given an integer array `nums`, create a result array `answer` where each element `answer[i]` equals the product of all elements in `nums` except `nums[i]`. Think of it as asking: "What's the product of everything to my left, times everything to my right?"

Here's what makes this problem interesting: you must solve it in O(n) time complexity without using division. The no-division constraint prevents the simple approach of computing the total product and dividing by each element. Additionally, you need to handle a subtle edge case: if `nums` contains zeros, division would fail anyway.

The problem guarantees that all products fit within a 32-bit integer, so you don't need to worry about overflow. However, you do need to think carefully about how to compute "everything except me" efficiently. A naive approach would use nested loops to multiply all elements except position i for each position, giving O(n²) time. Your challenge is to find the linear solution.

One more constraint to consider: while you can use the output array without counting it against space complexity, you should aim for O(1) extra space beyond that. This means avoiding additional large arrays and building the result cleverly.

## Why This Matters

This problem introduces the powerful prefix-suffix pattern, which appears throughout algorithm design. The core idea of precomputing cumulative values from both directions enables efficient solutions to many array problems. You'll see this pattern in range query problems, stock trading algorithms, and sliding window techniques.

Understanding this problem builds intuition for how preprocessing can transform difficult problems into simple ones. Instead of recalculating products repeatedly, you build up intermediate results that can be reused. This trade-off between time and space, and the optimization of building results in-place, are fundamental skills for system design.

The problem is extremely common in interviews at companies like Google, Facebook, and Amazon, often used to assess your ability to think beyond the obvious solution. It also demonstrates why certain constraints matter: the no-division rule isn't arbitrary - it teaches you to solve problems without relying on shortcuts that fail on edge cases. In real applications, this pattern appears in analytics pipelines, database query optimization, and numerical computing.

## Examples

**Example 1:**
- Input: `nums = [1,2,3,4]`
- Output: `[24,12,8,6]`

**Example 2:**
- Input: `nums = [-1,1,0,-3,3]`
- Output: `[0,0,9,0,0]`

## Constraints

- 2 <= nums.length <= 10⁵
- -30 <= nums[i] <= 30
- The product of any prefix or suffix of nums is **guaranteed** to fit in a **32-bit** integer.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Breaking Down the Product</summary>

For each position i, the product of all elements except nums[i] can be split into two parts: the product of all elements to the left of i, and the product of all elements to the right of i. How can you efficiently compute these left and right products for all positions?

</details>

<details>
<summary>🎯 Hint 2: Prefix and Suffix Products</summary>

Use two passes through the array. In the first pass, calculate prefix products (product of all elements before each index). In the second pass, calculate suffix products (product of all elements after each index) and combine them with prefix products. You can optimize space by building the result directly instead of using separate arrays.

</details>

<details>
<summary>📝 Hint 3: Space-Optimized Implementation</summary>

Optimal O(n) time, O(1) extra space (output array doesn't count):

Pass 1 - Build prefix products in result array:
```
result[0] = 1
for i from 1 to n-1:
    result[i] = result[i-1] * nums[i-1]
```

Pass 2 - Multiply by suffix products:
```
suffix = 1
for i from n-1 down to 0:
    result[i] *= suffix
    suffix *= nums[i]
```

Example: [1,2,3,4]
- After prefix: [1, 1, 2, 6] (products before each index)
- After suffix: [24, 12, 8, 6] (multiplied by products after each index)

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Nested Loop) | O(n²) | O(1) | Calculate product for each position separately |
| Division Trick | O(n) | O(1) | Total product / nums[i], but fails with zeros |
| Prefix + Suffix Arrays | O(n) | O(n) | Store both arrays separately |
| **Space-Optimized** | **O(n)** | **O(1)** | Build directly in result array, O(1) extra space |

**Note:** Output array doesn't count toward space complexity.

**Optimal approach:** Space-optimized prefix/suffix is best - meets all constraints elegantly.

## Common Mistakes

**Mistake 1: Using division (violates constraint)**

```python
# Wrong - uses division and fails with zeros
def productExceptSelf(nums):
    total = 1
    for num in nums:
        total *= num
    return [total // num for num in nums]  # Breaks with 0!
```

```python
# Correct - no division needed
def productExceptSelf(nums):
    n = len(nums)
    result = [1] * n
    # Build prefix products
    for i in range(1, n):
        result[i] = result[i-1] * nums[i-1]
    # Multiply by suffix products
    suffix = 1
    for i in range(n-1, -1, -1):
        result[i] *= suffix
        suffix *= nums[i]
    return result
```

**Mistake 2: Not handling zeros correctly**

```python
# Wrong - division approach fails with zeros
def productExceptSelf(nums):
    total = 1
    for num in nums:
        total *= num  # If any num is 0, total is 0
    return [total // num if num != 0 else ??? for num in nums]
```

```python
# Correct - prefix/suffix naturally handles zeros
def productExceptSelf(nums):
    # Zeros automatically propagate correctly
    # through prefix and suffix products
```

**Mistake 3: Using extra space unnecessarily**

```python
# Wrong - uses O(n) extra space
def productExceptSelf(nums):
    n = len(nums)
    left = [1] * n
    right = [1] * n
    result = [1] * n

    for i in range(1, n):
        left[i] = left[i-1] * nums[i-1]
    for i in range(n-2, -1, -1):
        right[i] = right[i+1] * nums[i+1]
    for i in range(n):
        result[i] = left[i] * right[i]
    return result
```

```python
# Correct - O(1) extra space
def productExceptSelf(nums):
    n = len(nums)
    result = [1] * n
    # Build prefix in result
    for i in range(1, n):
        result[i] = result[i-1] * nums[i-1]
    # Multiply by suffix on the fly
    suffix = 1
    for i in range(n-1, -1, -1):
        result[i] *= suffix
        suffix *= nums[i]
    return result
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Product of Array Except Self (with division) | Easy | Division allowed, simpler but must handle zeros |
| Maximum Product Subarray | Medium | Find contiguous subarray with maximum product |
| Subarray Product Less Than K | Medium | Count subarrays where product < k |
| Range Sum Query - Immutable | Easy | Similar prefix sum concept but with addition |

## Practice Checklist

- [ ] **Day 1:** Implement with separate prefix and suffix arrays
- [ ] **Day 3:** Optimize to O(1) extra space
- [ ] **Day 7:** Solve without looking at previous solution
- [ ] **Day 14:** Handle edge cases (zeros, negative numbers) correctly
- [ ] **Day 30:** Solve "Maximum Product Subarray" variation

**Strategy**: See [Prefix Sum Pattern](../strategies/patterns/prefix-sum.md)
