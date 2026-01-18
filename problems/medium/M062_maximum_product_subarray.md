---
id: M062
old_id: F152
slug: maximum-product-subarray
title: Maximum Product Subarray
difficulty: medium
category: medium
topics: ["array", "dynamic-programming"]
patterns: ["dynamic-programming"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E053", "M152", "M238"]
prerequisites: ["array", "dynamic-programming", "kadanes-algorithm"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Maximum Product Subarray

## Problem

Given an integer array, find the contiguous subarray (containing at least one number) that has the largest product and return that product value. A contiguous subarray means the elements must be adjacent in the original array, like picking a continuous slice. This problem is trickier than finding the maximum sum subarray because multiplication has unique properties: a negative number times a negative number becomes positive, zero resets everything to zero, and a small positive number might be better kept separate than multiplied with others. For example, in the array [2, 3, -2, 4], the maximum product is 6 from the subarray [2, 3], not 24 which would require including the negative number. You need to track both the largest and smallest products as you scan through because the smallest (most negative) product can become the largest when multiplied by the next negative number. Edge cases include arrays with zeros (which break the chain), all negative numbers, and single elements.

## Why This Matters

This problem appears in financial analysis when calculating compound growth rates, where you multiply daily returns to find cumulative performance over periods and need to identify the best performing consecutive trading days. Signal processing uses maximum product subarrays to detect intervals of consistent amplification or attenuation in audio or sensor data. Manufacturing systems track quality metrics where products are multiplied, finding the best consecutive production runs without defects. Machine learning feature engineering creates interaction terms by multiplying feature values, and you want to find the strongest consecutive feature interactions. Bioinformatics applies this when analyzing probability sequences in DNA where probabilities multiply and you seek the most likely gene expression windows. The negative number handling teaches you to think about state transitions, a fundamental concept in dynamic programming that applies to route optimization, game theory, and resource allocation problems.

## Examples

**Example 1:**
- Input: `nums = [2,3,-2,4]`
- Output: `6`
- Explanation: [2,3] has the largest product 6.

**Example 2:**
- Input: `nums = [-2,0,-1]`
- Output: `0`
- Explanation: The result cannot be 2, because [-2,-1] is not a subarray.

## Constraints

- 1 <= nums.length <= 2 * 10⁴
- -10 <= nums[i] <= 10
- The product of any prefix or suffix of nums is **guaranteed** to fit in a **32-bit** integer.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Why Not Standard Kadane's?</summary>

Maximum sum subarray uses Kadane's algorithm, tracking just the maximum ending at each position. But with products, negative numbers create a challenge: a negative number can become positive when multiplied by another negative. You need to track both maximum AND minimum products.

</details>

<details>
<summary>🎯 Hint 2: Track Two Values</summary>

At each position, maintain:
- Maximum product ending here (could become minimum if we hit a negative)
- Minimum product ending here (could become maximum if we hit a negative)

When you encounter a negative number, these two values swap roles! The minimum becomes maximum and vice versa.

</details>

<details>
<summary>📝 Hint 3: Dynamic Programming Approach</summary>

**State:**
- `max_prod` = maximum product ending at current position
- `min_prod` = minimum product ending at current position
- `result` = global maximum

**Transition at each num:**
```
If num is negative, swap max_prod and min_prod
max_prod = max(num, max_prod * num)
min_prod = min(num, min_prod * num)
result = max(result, max_prod)
```

**Why swap?** Negative * large_negative = large_positive

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check all subarrays |
| **Dynamic Programming** | **O(n)** | **O(1)** | Track max/min at each position |
| Prefix/Suffix Products | O(n) | O(1) | Alternative approach scanning both directions |

## Common Mistakes

### 1. Only Tracking Maximum
```python
# WRONG: Doesn't handle negative numbers correctly
def maxProduct(nums):
    max_prod = result = nums[0]
    for num in nums[1:]:
        max_prod = max(num, max_prod * num)
        result = max(result, max_prod)
    return result
# Fails on [-2, 3, -4] - should return 24, but returns 3
```

```python
# CORRECT: Track both max and min
def maxProduct(nums):
    max_prod = min_prod = result = nums[0]
    for num in nums[1:]:
        if num < 0:
            max_prod, min_prod = min_prod, max_prod
        max_prod = max(num, max_prod * num)
        min_prod = min(num, min_prod * num)
        result = max(result, max_prod)
    return result
```

### 2. Not Resetting After Zero
```python
# WRONG: Continues product through zero
def maxProduct(nums):
    max_prod = min_prod = result = nums[0]
    for num in nums[1:]:
        temp = max_prod
        max_prod = max(num, max_prod * num, min_prod * num)
        min_prod = min(num, temp * num, min_prod * num)
        result = max(result, max_prod)
    return result
# Zero breaks the chain but logic includes it in product
```

```python
# CORRECT: Zero naturally resets the chain
def maxProduct(nums):
    max_prod = min_prod = result = nums[0]
    for num in nums[1:]:
        if num < 0:
            max_prod, min_prod = min_prod, max_prod
        max_prod = max(num, max_prod * num)
        min_prod = min(num, min_prod * num)
        result = max(result, max_prod)
    return result
# max(num, ...) naturally starts fresh at zero
```

### 3. Forgetting Edge Cases
```python
# WRONG: Doesn't initialize result
def maxProduct(nums):
    max_prod = min_prod = 1  # Wrong initialization!
    result = float('-inf')
    for num in nums:
        # ...
# Fails on single element array
```

```python
# CORRECT: Initialize with first element
def maxProduct(nums):
    max_prod = min_prod = result = nums[0]
    for num in nums[1:]:
        # ...
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Return indices | Find start and end of max subarray | Track indices alongside max/min products |
| K subarrays | Find K non-overlapping max products | Dynamic programming with K dimension |
| Negative count limit | At most K negative numbers | Track count of negatives in window |
| Circular array | Array is circular | Try breaking circle at each position |

## Practice Checklist

- [ ] Handles all positive numbers
- [ ] Handles all negative numbers
- [ ] Handles zeros in array
- [ ] Handles single element
- [ ] Handles alternating positive/negative
- [ ] Can explain why tracking min is necessary
- [ ] Can code solution in 15 min
- [ ] Can discuss time/space complexity

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Dynamic Programming Pattern](../../strategies/patterns/dynamic-programming.md)
