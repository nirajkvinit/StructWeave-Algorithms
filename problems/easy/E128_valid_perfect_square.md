---
id: E128
old_id: I166
slug: valid-perfect-square
title: Valid Perfect Square
difficulty: easy
category: easy
topics: ["binary-search", "math"]
patterns: ["binary-search"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E069", "E050", "E131"]
prerequisites: ["binary-search", "integer-overflow"]
strategy_ref: ../strategies/patterns/binary-search.md
---
# Valid Perfect Square

## Problem

Given a positive integer `num`, determine whether it's a perfect square without using any built-in square root functions. A perfect square is an integer that equals another integer multiplied by itself. For example, 16 is a perfect square because 4 × 4 = 16, while 14 is not because no whole number multiplied by itself equals 14.

You must return `true` if `num` is a perfect square, and `false` otherwise. The challenge lies in efficiently searching for the square root candidate. While you could test every number from 1 upward, this becomes extremely slow for large inputs. The constraint that `num` can be as large as 2³¹ - 1 (over 2 billion) makes a linear search impractical. Instead, recognize that you're searching through a sorted space of potential square roots, which immediately suggests binary search as the optimal approach.

Watch out for integer overflow when computing products. If you calculate `mid * mid` directly and `mid` is large, the product might exceed the maximum integer value and wrap around to a negative number, causing incorrect comparisons.

## Why This Matters

Binary search is one of the most powerful algorithmic patterns you'll encounter, appearing in countless problems beyond simple sorted array lookups. This problem teaches you to apply binary search to an implicit search space (numbers 1 to num) rather than an explicit array. You'll also confront a common pitfall in production code: integer overflow, which causes subtle bugs in financial calculations, timestamp arithmetic, and coordinate systems. Perfect square detection itself appears in number theory algorithms, cryptographic protocols (RSA key generation), computational geometry (distance calculations), and game development (collision detection using Pythagorean theorem).

## Examples

**Example 1:**
- Input: `num = 16`
- Output: `true`
- Explanation: The answer is true since 16 equals 4 multiplied by 4, where 4 is a whole number.

**Example 2:**
- Input: `num = 14`
- Output: `false`
- Explanation: The answer is false because 14 cannot be expressed as the product of any integer with itself (approximately 3.742 * 3.742).

## Constraints

- 1 <= num <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Linear Search
Start from 1 and check each number until you find one whose square equals num or exceeds it.

**Key Steps:**
1. Iterate from i = 1 upward
2. Check if i * i equals num
3. Stop if i * i > num (no solution)

**When to use:** For very small numbers or initial understanding, but not efficient for large inputs.

### Intermediate Approach - Binary Search
Think about searching in a sorted space. What's the range of possible square roots?

**Key Steps:**
1. Set search range from 1 to num
2. Use binary search to find the square root
3. Check if mid * mid equals num
4. Watch out for integer overflow with mid * mid

**When to use:** Standard approach for this problem - O(log n) time complexity.

### Advanced Approach - Newton's Method
Can you use calculus-based iteration to converge to the square root faster?

**Key Steps:**
1. Start with an initial guess (e.g., num/2)
2. Iteratively improve: x_new = (x + num/x) / 2
3. Stop when x * x equals num or convergence is achieved
4. Handle edge cases and precision

**When to use:** When you want to demonstrate mathematical optimization techniques (though binary search is simpler).

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Linear Search | O(√n) | O(1) | Too slow for large inputs |
| Binary Search | O(log n) | O(1) | Standard optimal solution |
| Newton's Method | O(log log n) | O(1) | Faster convergence but more complex |
| Math Trick (Odd Sum) | O(√n) | O(1) | Uses 1+3+5+...+(2k-1) = k² property |

## Common Mistakes

### Mistake 1: Integer overflow with mid * mid
```python
# Wrong - can overflow for large num
def isPerfectSquare(num):
    left, right = 1, num
    while left <= right:
        mid = (left + right) // 2
        if mid * mid == num:  # Overflow if mid is large!
            return True
        elif mid * mid < num:
            left = mid + 1
        else:
            right = mid - 1
    return False
```

**Why it's wrong:** When num is close to 2³¹ - 1, mid can be around 46340, and mid * mid can overflow integer limits.

**Fix:** Use num // mid == mid and num % mid == 0 instead of mid * mid == num, or use a smaller search range (right = min(num, 46340)).

### Mistake 2: Wrong binary search bounds
```python
# Wrong - search range too large
def isPerfectSquare(num):
    left, right = 0, num  # Should start at 1, not 0
    # Also, right can be optimized to num // 2 for num > 1
```

**Why it's wrong:** Starting left at 0 causes division by zero issues. Setting right to num is inefficient for large numbers since √num ≤ num/2 for num > 4.

**Fix:** Set left = 1 and right = min(num, num // 2 + 1) or just use num // 2 + 1 for num > 1.

### Mistake 3: Not handling edge cases
```python
# Wrong - missing edge case handling
def isPerfectSquare(num):
    # Missing: if num == 1: return True
    left, right = 1, num // 2
    while left <= right:
        # Binary search logic
```

**Why it's wrong:** When num = 1, right becomes 0, making left > right immediately, and the function incorrectly returns False.

**Fix:** Handle num = 1 (or num <= 1) as a special case at the start.

## Variations

| Variation | Difficulty | Description | Key Difference |
|-----------|-----------|-------------|----------------|
| Find Square Root | Easy | Return the integer part of √n | Similar approach, return floor value |
| Perfect Cube | Easy | Check if num is a perfect cube | Use cube root instead of square root |
| Kth Power | Medium | Check if num is a perfect kth power | Generalize to any power |
| Count Perfect Squares | Medium | Count perfect squares up to n | Iterate and count |

## Practice Checklist

Track your progress and spaced repetition:

- [ ] Initial attempt (after reading problem)
- [ ] Reviewed approach hints
- [ ] Implemented binary search solution
- [ ] Handled integer overflow edge cases
- [ ] Handled num = 1 edge case
- [ ] All test cases passing
- [ ] Reviewed common mistakes
- [ ] Revisit after 1 day
- [ ] Revisit after 3 days
- [ ] Revisit after 1 week
- [ ] Can explain binary search application clearly

**Strategy Guide:** For pattern recognition and detailed techniques, see [Binary Search Pattern](../strategies/patterns/binary-search.md)
