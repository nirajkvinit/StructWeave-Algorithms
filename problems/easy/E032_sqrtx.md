---
id: E032
old_id: F069
slug: sqrtx
title: Sqrt(x)
difficulty: easy
category: easy
topics: ["math", "binary-search"]
patterns: ["binary-search-answer"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["M050", "M069", "E367"]
prerequisites: ["binary-search", "integer-operations"]
strategy_ref: ../../strategies/patterns/binary-search.md
---
# Sqrt(x)

## Problem

Given a non-negative integer x, compute and return the square root of x, rounded down to the nearest integer. In other words, find the largest integer whose square is less than or equal to x.

For example, if x = 8, the mathematical square root is approximately 2.828, so you should return 2 (the floor value). If x = 4, the square root is exactly 2, so return 2. You cannot use any built-in exponentiation or square root functions.

The key insight is that you're searching for a specific value in a sorted range. For any number x, its square root must be between 0 and x. You need to find the largest integer n where n² ≤ x. This is a classic "search for the answer" problem where the answer space is sorted.

The constraint is that x can be as large as 2³¹ - 1 (over 2 billion), so a naive approach of checking every number from 0 upward would be too slow. You need an efficient search strategy.

## Why This Matters

This problem introduces the "binary search on answer space" pattern, which is one of the most powerful algorithmic techniques for optimization problems. Rather than searching for a target in an array, you're searching for an answer that satisfies certain conditions.

Square root calculation is used extensively in graphics programming (distance calculations, vector normalization), game physics (collision detection), machine learning (Euclidean distance metrics), and financial modeling (volatility calculations). Understanding how to implement it efficiently teaches you about numerical algorithms and search space reduction.

This is also a popular interview question because it tests whether you can recognize when binary search applies to non-traditional scenarios beyond searching in sorted arrays.

## Examples

**Example 1:**
- Input: `x = 4`
- Output: `2`
- Explanation: The square root of 4 is 2, so we return 2.

**Example 2:**
- Input: `x = 8`
- Output: `2`
- Explanation: The square root of 8 is 2.82842..., and since we round it down to the nearest integer, 2 is returned.

## Constraints

- 0 <= x <= 2³¹ - 1

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Search Space Pattern</summary>

The answer must be somewhere between 0 and x. But you don't need to check every number - this is a search problem in a sorted range where you're looking for the largest number whose square doesn't exceed x.

Key insight: If mid² > x, is the answer to the left or right of mid?

</details>

<details>
<summary>🎯 Hint 2: Binary Search on Answer</summary>

Use binary search on the range [0, x]. For each candidate mid:
- If mid² = x, found exact answer
- If mid² < x, answer might be mid or larger (search right)
- If mid² > x, answer must be smaller (search left)

Think: How do you handle the case where no perfect square exists? You want the largest integer whose square ≤ x.

</details>

<details>
<summary>📝 Hint 3: Binary Search Implementation</summary>

```
Algorithm:
1. Handle edge cases: if x < 2, return x
2. Initialize: left=0, right=x, result=0
3. While left <= right:
   - mid = left + (right - left) // 2
   - square = mid * mid

   - If square == x:
       return mid
   - If square < x:
       result = mid  # Save potential answer
       left = mid + 1  # Search for larger
   - Else:
       right = mid - 1  # Search for smaller

4. Return result

Optimization: right can be min(x, 46340)
since 46340² = 2147395600 ≈ 2³¹

Example: x=8
- left=0, right=8
- mid=4, 4²=16>8 → right=3
- mid=1, 1²=1<8 → result=1, left=2
- mid=2, 2²=4<8 → result=2, left=3
- mid=3, 3²=9>8 → right=2
- left>right, return result=2
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Linear Search | O(√x) | O(1) | Check 1, 2, 3, ... until i² > x |
| **Binary Search** | **O(log x)** | **O(1)** | Search space halves each iteration |
| Newton's Method | O(log x) | O(1) | Faster convergence but complex |

## Common Mistakes

### 1. Integer Overflow in Square Calculation
```python
# WRONG: mid * mid can overflow for large mid
if mid * mid <= x:
    result = mid

# CORRECT: Use division to avoid overflow
if mid <= x // mid:  # Equivalent to mid² <= x
    result = mid
# OR use Python's unlimited integers (works in Python)
```

### 2. Wrong Binary Search Bounds Update
```python
# WRONG: Not saving the result when mid² < x
if mid * mid < x:
    left = mid + 1  # Lost potential answer!

# CORRECT: Save result before moving
if mid * mid < x:
    result = mid  # This could be the answer
    left = mid + 1
```

### 3. Incorrect Range Initialization
```python
# WRONG: Setting right = x/2 loses answers for small x
right = x // 2  # Fails for x=1, x=2, x=3

# CORRECT: Use full range or smart bound
right = x  # Safe
# OR right = min(x, 46340)  # Optimized
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Perfect Squares | Check if x is perfect square | Return true if result² == x |
| Nth Root | Find integer nth root | Binary search with mid^n comparison |
| Square Root with Precision | Return float to k decimals | Binary search on decimal range |

## Practice Checklist

**Correctness:**
- [ ] Handles x = 0
- [ ] Handles x = 1
- [ ] Handles perfect squares (4, 9, 16)
- [ ] Handles non-perfect squares (8, 10)
- [ ] Handles large values near 2³¹-1
- [ ] Returns correct integer

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 15 minutes
- [ ] Can discuss complexity
- [ ] Can explain overflow handling

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations (nth root)
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Binary Search](../../strategies/patterns/binary-search.md)
