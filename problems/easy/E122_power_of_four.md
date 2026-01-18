---
id: E122
old_id: I141
slug: power-of-four
title: Power of Four
difficulty: easy
category: easy
topics: ["math", "bit-manipulation"]
patterns: ["mathematical", "bit-manipulation"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E120", "E028", "E191"]
prerequisites: ["bit-manipulation", "logarithms", "modular-arithmetic"]
strategy_ref: ../strategies/fundamentals/bit-manipulation.md
---
# Power of Four

## Problem

Given an integer `n`, determine whether it can be expressed as 4 raised to some integer power. In mathematical terms, check if there exists an integer `x` such that `n = 4^x`, where x can be any non-negative integer (0, 1, 2, 3, ...).

For example, 16 is a power of four (4^2), and 1 is also a power of four (4^0). However, numbers like 5 or 8 cannot be expressed this way. The number 8 is particularly interesting: it's a power of two (2^3), but not a power of four since 4^1 = 4 and 4^2 = 16, skipping 8 entirely.

This problem has an elegant bit manipulation solution. Since 4 = 2^2, any power of four is also a power of two. However, not all powers of two are powers of four. The distinguishing feature lies in the position of the single '1' bit: powers of four have their '1' bit at even positions (0, 2, 4, 6...) counting from the right, while other powers of two have it at odd positions.

There's also a clever mathematical trick: since 4 = 3 + 1, we know that 4^x - 1 is always divisible by 3 for any positive x. This gives us an alternative O(1) solution using modular arithmetic.

## Why This Matters

Power-checking problems are fundamental in computer science, appearing in algorithm complexity analysis, data structure sizing, and binary representations. This specific problem teaches bit manipulation techniques that are crucial for low-level programming, graphics programming, and optimization. The solution demonstrates multiple problem-solving paradigms: bit operations, mathematical properties, and the relationship between different bases. It's a popular interview question because it tests whether you understand that being a power of four is more restrictive than being a power of two, and whether you can think beyond iterative division to find elegant O(1) solutions. These skills apply to hash table sizing, memory allocation, and any system that works with power-of-two or power-of-four boundaries.

## Examples

**Example 1:**
- Input: `n = 16`
- Output: `true`
- Explanation: 16 can be written as 4^2

**Example 2:**
- Input: `n = 5`
- Output: `false`
- Explanation: No integer exponent makes 4^x equal to 5

**Example 3:**
- Input: `n = 1`
- Output: `true`
- Explanation: 1 can be written as 4^0

## Constraints

- -2³¹ <= n <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Hint 1: Intuition (Beginner)
First, a power of four must also be a power of two (since 4 = 2^2). So start by checking if n is a power of two using the trick: n > 0 and (n & (n-1)) == 0. But not all powers of two are powers of four. What distinguishes them? Look at the bit positions: powers of four have their single 1-bit at even positions (0, 2, 4, 6...), while other powers of two have 1-bits at odd positions.

### Hint 2: Optimization (Intermediate)
Combine two conditions: (1) n is a power of two, and (2) the 1-bit is at an even position. For condition 2, you can use a mask. The mask 0x55555555 in binary is 01010101...01010101 (alternating bits at even positions). If n is a power of four, n & 0x55555555 should equal n. Alternatively, check if (n-1) % 3 == 0, which works because 4^x - 1 is always divisible by 3.

### Hint 3: Implementation Details (Advanced)
Three O(1) approaches: (1) Bit manipulation: return n > 0 and (n & (n-1)) == 0 and (n & 0x55555555) == n. (2) Modulo trick: return n > 0 and (n & (n-1)) == 0 and (n-1) % 3 == 0. (3) Logarithm: check if log4(n) is an integer. The bit manipulation approach is cleanest and most efficient.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Bit manipulation (power of 2 + mask) | O(1) | O(1) | Check n & (n-1) and 0x55555555 mask |
| Modulo arithmetic | O(1) | O(1) | Check (n-1) % 3 == 0 |
| Iterative division by 4 | O(log n) | O(1) | Repeatedly divide by 4 |
| Logarithm calculation | O(1) | O(1) | Beware floating-point precision |

## Common Mistakes

### Mistake 1: Only Checking Power of Two
```python
# Wrong: Power of two is necessary but not sufficient
def isPowerOfFour(n):
    return n > 0 and (n & (n-1)) == 0  # Also returns True for 2, 8, 32...
```
**Fix:** Add additional check for bit position or modulo condition.

### Mistake 2: Wrong Bit Mask
```python
# Wrong: Using incorrect mask
def isPowerOfFour(n):
    return n > 0 and (n & (n-1)) == 0 and (n & 0xAAAAAAAA) == n
# 0xAAAAAAAA checks odd positions, should be 0x55555555 for even
```
**Fix:** Use 0x55555555 to check even bit positions (0, 2, 4, 6...).

### Mistake 3: Modulo Logic Error
```python
# Wrong: Checking n % 3 instead of (n-1) % 3
def isPowerOfFour(n):
    return n > 0 and (n & (n-1)) == 0 and n % 3 == 0
```
**Fix:** Check (n-1) % 3 == 0, because 4^x - 1 is divisible by 3, not 4^x itself.

## Variations

| Variation | Description | Difficulty | Key Difference |
|-----------|-------------|------------|----------------|
| Power of Two | Check if power of 2 | Easy | Only need n & (n-1) == 0 |
| Power of Three | Check if power of 3 | Easy | No bit manipulation trick available |
| Power of Eight | Check if power of 8 | Easy | Bit at positions 0, 3, 6, 9... |
| Count Set Bits | Count 1-bits in n | Easy | Related bit manipulation practice |

## Practice Checklist

Study Plan:
- [ ] Day 1: Understand power of two check, implement basic solution
- [ ] Day 3: Learn bit masking with 0x55555555, understand why it works
- [ ] Day 7: Implement modulo trick, compare approaches
- [ ] Day 14: Solve power of two/eight variations
- [ ] Day 30: Speed solve (< 5 minutes), explain bit patterns

Key Mastery Indicators:
- Explain why power of four implies power of two
- Understand 0x55555555 mask (even bit positions)
- Know modulo trick: (n-1) % 3 == 0
- Can derive similar solutions for other powers

**Strategy**: See [Bit Manipulation](../strategies/fundamentals/bit-manipulation.md)
