---
id: E141
old_id: I195
slug: rotate-function
title: Rotate Function
difficulty: easy
category: easy
topics: ["array", "math", "dynamic-programming"]
patterns: ["mathematical-pattern", "recurrence-relation"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - E189
  - M396
  - M1878
prerequisites:
  - array rotation
  - mathematical relationships
  - recurrence relations
strategy_ref: ../strategies/patterns/math-optimization.md
---
# Rotate Function

## Problem

Given an integer array `nums` of length `n`, consider what happens when you rotate the array clockwise by different amounts. Let `arrk` represent the array after rotating `nums` clockwise by `k` positions.

Define a **rotation function** `F` that computes a weighted sum for each rotation:
`F(k) = 0 * arrk[0] + 1 * arrk[1] + 2 * arrk[2] + ... + (n-1) * arrk[n-1]`

In other words, for rotation `k`, you multiply each element by its index position and sum everything together. Your task is to find the maximum value among all possible rotations: `F(0), F(1), F(2), ..., F(n-1)`.

**Example walkthrough:** For `nums = [4,3,2,6]`:
- F(0) uses the original array [4,3,2,6]: `(0*4) + (1*3) + (2*2) + (3*6) = 25`
- F(1) rotates once to get [6,4,3,2]: `(0*6) + (1*4) + (2*3) + (3*2) = 16`
- F(2) rotates twice to get [2,6,4,3]: `(0*2) + (1*6) + (2*4) + (3*3) = 23`
- F(3) rotates three times to get [3,2,6,4]: `(0*3) + (1*2) + (2*6) + (3*4) = 26` ← maximum

The naive approach of actually rotating the array `n` times and recalculating each sum would be O(n²). The challenge is to discover a mathematical relationship that lets you compute F(k+1) from F(k) without rebuilding the entire sum, achieving O(n) time complexity.

All test cases ensure the answer fits within a 32-bit signed integer.

## Why This Matters

This problem exemplifies a crucial optimization technique: deriving recurrence relations to avoid redundant computation. Instead of recalculating from scratch, you discover how consecutive states relate mathematically. This pattern appears in dynamic programming, sliding window algorithms, difference arrays, and many optimization problems.

The insight that rotating changes most indices by exactly +1 (contributing the sum of all elements) while one element's contribution drops significantly leads to an elegant O(n) solution. This type of mathematical pattern recognition is valuable in algorithm optimization, numerical computing, and anywhere you need to transform brute force solutions into efficient ones.

Understanding recurrence relations also helps with problems involving cumulative sums, prefix products, and state transitions where new values depend on previous calculations.

## Examples

**Example 1:**
- Input: `nums = [4,3,2,6]`
- Output: `26`
- Explanation: Computing each rotation:
  - F(0) = (0 * 4) + (1 * 3) + (2 * 2) + (3 * 6) = 0 + 3 + 4 + 18 = 25
  - F(1) = (0 * 6) + (1 * 4) + (2 * 3) + (3 * 2) = 0 + 4 + 6 + 6 = 16
  - F(2) = (0 * 2) + (1 * 6) + (2 * 4) + (3 * 3) = 0 + 6 + 8 + 9 = 23
  - F(3) = (0 * 3) + (1 * 2) + (2 * 6) + (3 * 4) = 0 + 2 + 12 + 12 = 26
  - Maximum is F(3) = 26

**Example 2:**
- Input: `nums = [100]`
- Output: `0`
- Explanation: F(0) = 0 * 100 = 0

## Constraints

- n == nums.length
- 1 <= n <= 10⁵
- -100 <= nums[i] <= 100

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Tier 1 Hint - Core Concept
The brute force approach (rotating array n times and computing each F(k)) is O(n²). Instead, find a mathematical relationship between consecutive rotations. When rotating from F(k) to F(k+1), notice which elements' indices change and by how much. Can you express F(k+1) in terms of F(k) without rebuilding the entire sum?

### Tier 2 Hint - Implementation Details
Derive the recurrence relation: when rotating from F(k) to F(k+1), the last element moves to the front. Every other element's index increases by 1. This means: `F(k+1) = F(k) + sum(all elements) - n * arr[n-1-k]`. Precompute the sum of all elements. Start with F(0), then iteratively compute F(1), F(2), ..., F(n-1) using the recurrence, tracking the maximum.

### Tier 3 Hint - Optimization Strategy
The key insight: `F(k+1) = F(k) + sum - n * nums[n-k-1]`. Why? When rotating right by one, all elements except the last get their multiplier increased by 1 (contributing `sum`), but the last element goes from multiplier `n-1` to `0` (losing `(n-1) * last_elem`, effectively `-n * last_elem + last_elem`, which is already in sum). Time: O(n), Space: O(1). Track max_value during iteration.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (rotate n times) | O(n²) | O(n) | Rotate array and compute F each time |
| Recurrence Relation | O(n) | O(1) | Derive F(k+1) from F(k) mathematically |
| DP Array | O(n) | O(n) | Store all F(k) values (unnecessary) |
| Memoization | O(n) | O(n) | Cache computed values (unnecessary) |

## Common Mistakes

### Mistake 1: Physically rotating the array
```python
# Inefficient - actually rotating array
def maxRotateFunction(nums):
    n = len(nums)
    max_val = float('-inf')

    for k in range(n):
        rotated = nums[-k:] + nums[:-k] if k > 0 else nums
        f_k = sum(i * rotated[i] for i in range(n))
        max_val = max(max_val, f_k)

    return max_val  # O(n²) time
```

**Why it's wrong:** Creates new arrays and recomputes sums each time. O(n²) is too slow.

**Fix:** Use mathematical recurrence relation.

### Mistake 2: Incorrect recurrence formula
```python
# Wrong - incorrect mathematical relationship
def maxRotateFunction(nums):
    n = len(nums)
    f_curr = sum(i * nums[i] for i in range(n))
    max_val = f_curr

    for k in range(1, n):
        # WRONG formula
        f_curr = f_curr + sum(nums) - nums[k]
        max_val = max(max_val, f_curr)

    return max_val
```

**Why it's wrong:** The recurrence formula is incorrect. Should be `F(k) + sum - n * nums[n-k]`.

**Fix:** Derive the correct mathematical relationship.

### Mistake 3: Integer overflow not considered
```python
# Potential issue - no overflow handling
def maxRotateFunction(nums):
    n = len(nums)
    total_sum = sum(nums)
    f_curr = sum(i * nums[i] for i in range(n))
    max_val = f_curr

    for k in range(1, n):
        f_curr += total_sum - n * nums[n - k]
        max_val = max(max_val, f_curr)  # Could overflow in some languages

    return max_val
```

**Why it's concerning:** In languages with fixed-size integers (C++, Java), multiplication could overflow. Problem states answer fits in 32-bit, but intermediate calculations might not.

**Fix:** Use appropriate data types (e.g., `long long` in C++).

## Variations

| Variation | Difference | Difficulty Δ |
|-----------|-----------|-------------|
| Rotate left instead of right | Reverse rotation direction | 0 |
| Different weight function | Use different coefficient pattern | 0 |
| K rotations only | Find max among first K rotations | 0 |
| Minimum rotation value | Find minimum instead of maximum | 0 |
| Rotation with queries | Answer Q queries for different K values | +1 |
| 2D rotation function | Apply to 2D matrix rotations | +1 |

## Practice Checklist

Track your progress on this problem:

- [ ] Derived the recurrence relation on paper
- [ ] Solved using mathematical approach (O(n))
- [ ] Verified formula with example walkthrough
- [ ] After 1 day: Re-derived formula from scratch
- [ ] After 1 week: Solved in < 15 minutes
- [ ] Explained mathematical insight to someone

**Strategy**: See [Math Optimization Pattern](../strategies/patterns/math-optimization.md)
