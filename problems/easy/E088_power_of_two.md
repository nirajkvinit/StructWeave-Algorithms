---
id: E088
old_id: I031
slug: power-of-two
title: Power of Two
difficulty: easy
category: easy
topics: ["bit-manipulation", "math"]
patterns: ["bit-tricks"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E087", "E095", "M010"]
prerequisites: ["bitwise-operations", "binary-representation", "powers"]
strategy_ref: ../strategies/patterns/bit-manipulation.md
---
# Power of Two

## Problem

Given an integer `n`, return `true` if it is a power of two, otherwise return `false`.

An integer `n` is a **power of two** if there exists an integer `x` such that `n == 2^x`.

**Examples to clarify:**
- 1 = 2^0 → power of two
- 2 = 2^1 → power of two
- 4 = 2^2 → power of two
- 16 = 2^4 → power of two
- 3 → NOT a power of two
- 0 → NOT a power of two (no x satisfies 2^x = 0)
- Negative numbers → NOT powers of two

The straightforward approach would be to keep dividing by 2 until you hit 1 or an odd number. But there's a brilliant **one-line bit manipulation trick** that solves this in O(1) time.

**Key insight:** Powers of two have exactly one bit set in their binary representation:
- 1 = `0001`
- 2 = `0010`
- 4 = `0100`
- 8 = `1000`
- 16 = `10000`

Notice anything special? There's always exactly one 1-bit. This property leads to an elegant solution.

## Why This Matters

This problem introduces **bit manipulation techniques**, essential for:

- **Low-level optimization** - Checking powers of two is common in memory allocation, alignment, and cache sizing
- **Binary arithmetic tricks** - The `n & (n-1)` pattern appears in many algorithms
- **Interview fundamentals** - Tests whether you understand binary representation beyond just decimal
- **Performance-critical code** - Bit operations are often faster than division or logarithms

Powers of two appear constantly in computing: memory sizes (256MB, 512GB), hash table capacities, buffer sizes, and bitwise flags. The bit manipulation pattern you learn here (`n & (n-1)` removes the rightmost set bit) is reusable in many other problems like counting set bits and finding single numbers.

## Examples

**Example 1:**
- Input: `n = 1`
- Output: `true
**Explanation: **2⁰ = 1`

**Example 2:**
- Input: `n = 16`
- Output: `true
**Explanation: **2⁴ = 16`

**Example 3:**
- Input: `n = 3`
- Output: `false`

## Constraints

- -2³¹ <= n <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Binary Representation Pattern</summary>

Think about how powers of two look in binary representation. What's special about numbers like 1 (1), 2 (10), 4 (100), 8 (1000), 16 (10000)? Each has exactly one bit set to 1. What does this tell you about detecting powers of two?

</details>

<details>
<summary>🎯 Hint 2: Bit Manipulation Trick</summary>

Consider what happens when you subtract 1 from a power of two. For example: 8 is 1000 in binary, and 7 is 0111. What happens when you perform a bitwise AND between n and n-1? This operation has a special property for powers of two.

</details>

<details>
<summary>📝 Hint 3: Complete Solution Pattern</summary>

Optimal O(1) approach:
1. First check: n must be positive (negative numbers and 0 are not powers of two)
2. Second check: Use the bit trick: `n & (n - 1) == 0`
   - Powers of two have exactly one bit set
   - Subtracting 1 flips all bits after that set bit
   - ANDing them gives 0

Alternative approaches:
- Loop dividing by 2 until n becomes 1 (O(log n))
- Count set bits and verify exactly one is set (O(log n))

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Divide by 2 Loop | O(log n) | O(1) | Keep dividing until 1 or odd number |
| Count Set Bits | O(log n) | O(1) | Verify exactly one bit is set |
| **Bit Manipulation** | **O(1)** | **O(1)** | Single operation: `n > 0 && (n & (n-1)) == 0` |
| Logarithm Check | O(1) | O(1) | Use log₂(n) and check if integer (watch for float precision) |

**Optimal approach:** Bit manipulation is fastest and most elegant.

## Common Mistakes

**Mistake 1: Forgetting to check for negative numbers and zero**

```python
# Wrong - returns true for 0 and negative numbers
def isPowerOfTwo(n):
    return (n & (n - 1)) == 0
# isPowerOfTwo(0) returns True (wrong!)
# isPowerOfTwo(-16) might behave unexpectedly
```

```python
# Correct
def isPowerOfTwo(n):
    return n > 0 and (n & (n - 1)) == 0
```

**Mistake 2: Integer overflow in loop approach**

```python
# Wrong - infinite loop risk or overflow
def isPowerOfTwo(n):
    if n <= 0:
        return False
    power = 1
    while power < n:
        power *= 2  # Can overflow for large n!
    return power == n
```

```python
# Correct - divide instead of multiply
def isPowerOfTwo(n):
    if n <= 0:
        return False
    while n % 2 == 0:
        n //= 2
    return n == 1
```

**Mistake 3: Floating point precision issues**

```python
# Wrong - floating point errors
import math
def isPowerOfTwo(n):
    if n <= 0:
        return False
    log_val = math.log2(n)
    return log_val == int(log_val)  # Risky due to float precision!
```

```python
# Correct - stick to integer operations
def isPowerOfTwo(n):
    return n > 0 and (n & (n - 1)) == 0
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Power of Three | Easy | Check if n = 3^x (can't use same bit trick) |
| Power of Four | Easy | Powers of two where exponent is even |
| Count Set Bits | Easy | Count number of 1s in binary representation |
| Reverse Bits | Easy | Reverse the bit pattern of a number |
| Add Binary | Easy | Add two binary strings |

## Practice Checklist

- [ ] **Day 1:** Solve using bit manipulation trick
- [ ] **Day 3:** Implement alternative loop-based approach
- [ ] **Day 7:** Solve without looking at previous solution
- [ ] **Day 14:** Solve Power of Three and Power of Four variations
- [ ] **Day 30:** Explain bit manipulation approach to someone else

**Strategy**: See [Bit Manipulation Pattern](../strategies/patterns/bit-manipulation.md)
