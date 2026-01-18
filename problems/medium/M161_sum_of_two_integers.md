---
id: M161
old_id: I170
slug: sum-of-two-integers
title: Sum of Two Integers
difficulty: medium
category: medium
topics: ["bit-manipulation", "math"]
patterns: ["bitwise-operations"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E067", "M029", "E190"]
prerequisites: ["binary-representation", "bitwise-xor", "bitwise-and", "bit-shifting"]
---
# Sum of Two Integers

## Problem

You are provided with two integers `a` and `b`. Calculate and return their sum, but with a twist: you cannot use the addition (`+`) or subtraction (`-`) operators at all. Instead, you'll need to work at the bit level to simulate how computers actually perform addition under the hood. This means thinking about binary representations where numbers are sequences of 0s and 1s, and using bitwise operations like XOR (exclusive or), AND (both bits set), and bit shifting (moving bits left or right). For example, adding 2 (binary: 10) and 3 (binary: 11) should give you 5 (binary: 101), but you'll achieve this by manipulating individual bits. Edge cases to consider include negative numbers, zero values, and ensuring your solution works across different programming languages which may handle integer overflow differently.

## Why This Matters

This problem reveals how computers perform arithmetic at the hardware level, where dedicated circuits called adders use logic gates to combine bits. When you write high-level code like `a + b`, the processor ultimately executes something similar to what you'll implement here. Understanding this is essential for embedded systems programming, where you might work directly with hardware registers, or in cryptography implementations where bitwise operations provide both performance and security benefits. Digital circuit designers use these exact principles when building CPUs, and performance-critical applications like graphics engines or compression algorithms rely heavily on bit manipulation for speed. This problem also appears in technical interviews at companies building low-level systems (operating systems, compilers, database engines) because it tests whether you understand the fundamentals beneath abstraction layers.

## Examples

**Example 1:**
- Input: `a = 1, b = 2`
- Output: `3`

**Example 2:**
- Input: `a = 2, b = 3`
- Output: `5`

## Constraints

- -1000 <= a, b <= 1000

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: How Computers Add</summary>

Think about how addition works at the binary level in computer hardware. When you add two bits, there are two parts: the sum bit and the carry bit. For example, 1 + 1 = 10 in binary (sum=0, carry=1). Which bitwise operations can capture these two aspects?
</details>

<details>
<summary>🎯 Hint 2: XOR and AND Operations</summary>

The XOR operation gives you the sum without carry (1^1=0, 1^0=1, 0^1=1, 0^0=0). The AND operation identifies where carries occur (1&1=1 produces carry). The carry must be shifted left by one position because it affects the next higher bit. Keep applying these operations until there are no more carries.
</details>

<details>
<summary>📝 Hint 3: Iterative Algorithm</summary>

Pseudocode:
```
while b != 0:
    sum_without_carry = a XOR b
    carry = (a AND b) << 1

    a = sum_without_carry
    b = carry

return a
```

Note: In languages like Python with unlimited integer precision, handling negative numbers requires masking to simulate 32-bit integers.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Increment Loop | O(b) | O(1) | Increment a by 1, b times; very slow for large b |
| **Bit Manipulation** | **O(log max(a,b))** | **O(1)** | Number of iterations equals number of bits; optimal |

## Common Mistakes

**Mistake 1: Infinite loop with negative numbers (Python)**
```python
# Wrong: In Python, negative numbers cause infinite loop
def getSum(a, b):
    while b != 0:
        carry = (a & b) << 1
        a = a ^ b
        b = carry
    return a
# Python has unlimited precision, so negative carries never reach 0
```

```python
# Correct: Use masking for 32-bit simulation
def getSum(a, b):
    MASK = 0xFFFFFFFF
    MAX = 0x7FFFFFFF

    while b != 0:
        a, b = (a ^ b) & MASK, ((a & b) << 1) & MASK

    return a if a <= MAX else ~(a ^ MASK)
```

**Mistake 2: Not handling the carry correctly**
```python
# Wrong: Forgot to shift carry left
def getSum(a, b):
    while b != 0:
        carry = a & b  # Missing << 1
        a = a ^ b
        b = carry
```

**Mistake 3: Using addition in the loop**
```python
# Wrong: Defeats the purpose
def getSum(a, b):
    while b != 0:
        carry = (a & b) << 1
        a = a + (a ^ b)  # Using + operator!
        b = carry
```

## Variations

| Variation | Difference | Hint |
|-----------|-----------|------|
| Subtract without operator | Compute a - b | Use b's two's complement: a + (~b + 1) |
| Multiply without operator | Compute a * b | Repeated addition or bit shifting |
| Divide without operator | Compute a / b | Repeated subtraction or bit shifting |
| Negate without operator | Compute -a | Two's complement: ~a + 1 |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Attempted again after 1 day
- [ ] Attempted again after 3 days
- [ ] Attempted again after 1 week
- [ ] Attempted again after 2 weeks
