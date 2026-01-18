---
id: M335
old_id: A160
slug: binary-number-with-alternating-bits
title: Binary Number with Alternating Bits
difficulty: medium
category: medium
topics: ["bit-manipulation"]
patterns: ["bit-tricks"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - id: E089
    title: Number of 1 Bits
    difficulty: easy
  - id: M100
    title: Power of Two
    difficulty: medium
prerequisites:
  - Bit manipulation basics
  - Bitwise operators (AND, OR, XOR, shift)
  - Binary number representation
---
# Binary Number with Alternating Bits

## Problem

Given a positive integer `n`, determine whether its binary representation contains alternating bits. A binary number has alternating bits if no two adjacent bit positions contain the same value - in other words, the bits must follow a pattern like `101010...` or `010101...`.

For example:
- The number 5 has binary representation `101`, which alternates perfectly: 1, 0, 1
- The number 7 has binary representation `111`, which fails because it has consecutive 1s
- The number 10 has binary representation `1010`, which alternates: 1, 0, 1, 0

Your task is to return `true` if the binary representation alternates, or `false` otherwise. While you could convert the number to a binary string and check each character, the problem is designed to test your bit manipulation skills - try to solve it using bitwise operations rather than string conversion.

## Why This Matters

Bit manipulation is fundamental to low-level programming, cryptography, compression algorithms, and hardware interfaces. This specific pattern - checking for alternating bits - appears in error detection codes like Manchester encoding used in network protocols, where transitions between 0 and 1 help synchronize clocks. The elegant XOR-based solution teaches you to think about mathematical properties of binary numbers rather than procedural iteration, a mindset crucial for optimizing performance-critical code in graphics engines, embedded systems, and high-frequency trading platforms.

## Examples

**Example 1:**
- Input: `n = 5`
- Output: `true`
- Explanation: 5 in binary is 101, which alternates between 1 and 0.

**Example 2:**
- Input: `n = 7`
- Output: `false`
- Explanation: 7 in binary is 111, which has consecutive 1s.

**Example 3:**
- Input: `n = 11`
- Output: `false`
- Explanation: 11 in binary is 1011, which contains consecutive 1s.

## Constraints

- 1 <= n <= 2³¹ - 1

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Check Each Adjacent Pair</summary>

The straightforward approach is to check each bit against the next bit. You can do this by:

1. Extract the last bit: `last_bit = n & 1`
2. Shift right to get the next bit: `n >>= 1`
3. Extract the new last bit: `current_bit = n & 1`
4. Compare: if `last_bit == current_bit`, return false
5. Repeat until n becomes 0

This works but requires a loop through all bits. Can you think of a more elegant approach using bit manipulation tricks?

</details>

<details>
<summary>Hint 2: XOR with Right-Shifted Version</summary>

A clever observation: if you XOR a number with its right-shifted version, alternating bits will produce all 1s.

For example:
- n = 5 = 101 in binary
- n >> 1 = 10 in binary
- n ^ (n >> 1) = 101 ^ 010 = 111

If the bits alternate, XOR gives you a number with all 1s (like 111, 1111, etc.).

How can you check if a number has all 1s? A number with all 1s plus 1 equals a power of 2:
- 111 + 1 = 1000
- 1111 + 1 = 10000

And a power of 2 has only one 1 bit, so `(xor_result + 1) & xor_result == 0`.

</details>

<details>
<summary>Hint 3: Complete Bit Manipulation Solution</summary>

Combine the ideas:

```
def hasAlternatingBits(n):
    xor_result = n ^ (n >> 1)
    # If bits alternate, xor_result is all 1s (like 111, 1111, etc.)
    # Check if xor_result is all 1s by checking if (xor_result + 1) is power of 2
    return (xor_result & (xor_result + 1)) == 0
```

Why this works:
1. XOR of n and n>>1 gives all 1s only if bits alternate
2. If xor_result is all 1s (e.g., 111), then xor_result + 1 is a power of 2 (e.g., 1000)
3. A number and its increment have no common bits only if the number is all 1s
4. `xor_result & (xor_result + 1) == 0` is true only when xor_result is all 1s

This elegant solution uses only a few bitwise operations with O(1) time and space.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| String Conversion | O(log n) | O(log n) | Convert to binary string, check characters |
| Bit-by-Bit Iteration | O(log n) | O(1) | Loop through each bit |
| XOR Trick | O(1) | O(1) | Constant time bitwise operations |

Note: log n refers to the number of bits in n.

## Common Mistakes

### Mistake 1: Converting to String
```python
# WRONG: Using string conversion (inefficient)
def hasAlternatingBits(n):
    binary = bin(n)[2:]  # Convert to binary string, skip '0b' prefix
    for i in range(len(binary) - 1):
        if binary[i] == binary[i + 1]:
            return False
    return True
```

**Why it's wrong**: While this works correctly, it's inefficient. It converts the number to a string, which takes O(log n) time and space. The problem is designed to test bit manipulation skills, so use bitwise operations instead.

### Mistake 2: Incorrect XOR Check
```python
# WRONG: Only checking if XOR result is non-zero
def hasAlternatingBits(n):
    xor_result = n ^ (n >> 1)
    # Bug: just checking non-zero doesn't verify all bits are 1
    return xor_result != 0
```

**Why it's wrong**: XOR of n and n>>1 will almost always be non-zero, but that doesn't mean the bits alternate. You need to verify that the XOR result consists of all 1s, not just any non-zero value.

### Mistake 3: Off-by-One in Bit Checking
```python
# WRONG: Not checking the last bit pair
def hasAlternatingBits(n):
    prev_bit = n & 1
    n >>= 1

    while n > 0:  # Bug: should be n > 0 or n >= 1, but loop body is wrong
        curr_bit = n & 1
        if prev_bit == curr_bit:
            return False
        prev_bit = curr_bit
        # Missing: n >>= 1

    return True
```

**Why it's wrong**: This loop doesn't shift n right in each iteration, so it checks the same bit repeatedly. You must include `n >>= 1` at the end of each iteration to move to the next bit.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Alternating Patterns (0101 or 1010) | Easy | Check if binary matches exactly one of two patterns |
| K-Alternating Bits | Medium | Check if bits alternate every k positions |
| Maximum Alternating Subsequence | Hard | Find longest subsequence with alternating bits |
| Convert to Alternating | Medium | Minimum flips to make binary alternating |

## Practice Checklist

- [ ] **First attempt**: Solve independently (20 min time limit)
- [ ] **Manual calculation**: Trace the XOR trick on paper for n=5,7,11
- [ ] **Implement iterative**: Code the bit-by-bit checking approach
- [ ] **Optimize with XOR**: Implement the O(1) bit trick solution
- [ ] **Spaced repetition**: Revisit after 3 days
- [ ] **Interview practice**: Explain the XOR trick clearly
- [ ] **Variations**: Solve Power of Two using similar technique
- [ ] **Final review**: Solve again after 1 week without hints

**Strategy**: See [Bit Manipulation Pattern](../strategies/patterns/bit-manipulation.md)
