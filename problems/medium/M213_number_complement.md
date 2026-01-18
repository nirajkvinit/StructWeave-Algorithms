---
id: M213
old_id: I275
slug: number-complement
title: Number Complement
difficulty: medium
category: medium
topics: ["bit-manipulation"]
patterns: ["complement-search"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E191", "E231", "E476"]
prerequisites: ["bit-manipulation", "binary-representation", "bitwise-operators"]
---
# Number Complement

## Problem

An integer's complement is created by flipping every bit in its binary representation - changing each `0` to `1` and each `1` to `0`. However, there's an important detail: we only flip the bits that are actually part of the number's representation, not the infinite leading zeros.

For example, consider the number `5`. In binary, `5` is represented as `101` (three bits). When we compute its complement, we flip these three bits: `101` becomes `010`, which equals `2` in decimal. We don't consider the leading zeros that would exist in a fixed-width representation like 32-bit integers (00000000000000000000000000000101), because that would give us an entirely different result.

The challenge lies in determining how many bits to flip. Given an integer `num` in the range [1, 2^31 - 1], compute and return its complement. You'll need to identify the length of the binary representation (the position of the most significant bit) and then apply the bit flipping operation only to those relevant bits.

Think about the relationship between the number, its complement, and a mask of all 1s with the same bit length - this mathematical insight leads to an elegant solution using XOR operations.

## Why This Matters

Bit manipulation is fundamental to low-level programming, encryption, compression, and embedded systems where operations must be extremely fast and memory-efficient. The complement operation appears in two's complement arithmetic (how computers represent negative numbers), checksum calculations, and bitwise cryptography. This problem specifically teaches you to work with variable-length bit representations and demonstrates how XOR with an appropriate mask can perform complex transformations in constant time. These techniques are essential for problems involving bit fields, flags, permissions, and any scenario where you're packing multiple boolean values into single integers for efficiency.

## Examples

**Example 1:**
- Input: `num = 5`
- Output: `2`
- Explanation: Binary of 5 is 101, inverting gives 010, which equals 2.

**Example 2:**
- Input: `num = 1`
- Output: `0`
- Explanation: Binary of 1 is 1, inverting gives 0.

## Constraints

- 1 <= num < 2³¹

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: XOR with All Ones</summary>

The complement is essentially XOR-ing the number with a mask of all 1s of the same bit length. For example, 5 = 101 in binary (3 bits). Create a mask of 111 (which is 7), then 5 XOR 7 = 101 XOR 111 = 010 = 2. The challenge is finding the right mask length.

</details>

<details>
<summary>🎯 Hint 2: Find Bit Length</summary>

You need to find how many bits are in the number's binary representation. You can do this by finding the position of the most significant bit (MSB). Methods: (1) Use bit_length() if available, (2) Count by repeatedly dividing by 2, (3) Use logarithm: floor(log2(num)) + 1. Once you have the length, create a mask with that many 1s.

</details>

<details>
<summary>📝 Hint 3: Multiple Approaches</summary>

**Approach 1: Create mask directly**
```
def find_complement(num):
    # Find number of bits
    bit_len = num.bit_length()
    # Create mask: 2^bit_len - 1 gives all 1s
    mask = (1 << bit_len) - 1
    return num ^ mask
```

**Approach 2: Build mask iteratively**
```
def find_complement(num):
    mask = 0
    temp = num
    while temp:
        mask = (mask << 1) | 1
        temp >>= 1
    return num ^ mask
```

**Approach 3: Flip bit by bit**
```
def find_complement(num):
    result = 0
    power = 0
    while num:
        if num & 1 == 0:
            result |= (1 << power)
        num >>= 1
        power += 1
    return result
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| XOR with Mask | O(1) or O(log n) | O(1) | Depends on bit_length() implementation |
| Iterative Mask Building | O(log n) | O(1) | Loop through each bit |
| Bit-by-Bit Flip | O(log n) | O(1) | Process each bit individually |
| String Conversion | O(log n) | O(log n) | Convert to binary string, flip, convert back (inefficient) |

n = value of num

## Common Mistakes

**Mistake 1: Using NOT Operator Directly**

```python
# Wrong: NOT flips ALL 32/64 bits, including leading zeros
def find_complement(num):
    return ~num
# For num=5 (binary 101), ~5 gives -6, not 2!
```

```python
# Correct: XOR with appropriate mask
def find_complement(num):
    bit_len = num.bit_length()
    mask = (1 << bit_len) - 1
    return num ^ mask
```

**Mistake 2: Wrong Mask Calculation**

```python
# Wrong: Off-by-one in mask
def find_complement(num):
    mask = (1 << num) - 1  # Wrong! Should use bit_length, not num itself
    return num ^ mask
```

```python
# Correct: Mask based on bit length
def find_complement(num):
    bit_len = num.bit_length()
    mask = (1 << bit_len) - 1
    return num ^ mask
```

**Mistake 3: Not Handling Edge Cases**

```python
# Wrong: Doesn't handle num=1 correctly
def find_complement(num):
    result = 0
    power = 1
    while num > 0:  # For num=1, only one iteration
        if (num & 1) == 0:
            result += power
        power *= 2
        num >>= 1
    return result
# Works, but more complex than needed
```

```python
# Correct: Clean and handles all cases
def find_complement(num):
    bit_len = num.bit_length()
    mask = (1 << bit_len) - 1
    return num ^ mask
# For num=1: bit_len=1, mask=1, 1^1=0 ✓
```

## Variations

| Variation | Difference | Approach Change |
|-----------|-----------|-----------------|
| Flip Specific Bit Range | Flip bits from position i to j | Create mask with 1s only in range i-j |
| Two's Complement | Find negative representation | Use ~num + 1 (standard two's complement) |
| Toggle Every Kth Bit | Flip every kth bit only | Create custom mask pattern |
| Count Set Bits After Flip | Return count of 1s in complement | Use XOR then count bits |
| Largest Complement | Find largest num with same complement | Mathematical problem, analyze bit patterns |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Reviewed solution
- [ ] Implemented without hints (Day 1)
- [ ] Solved again (Day 3)
- [ ] Solved again (Day 7)
- [ ] Solved again (Day 14)
- [ ] Attempted all variations above

**Strategy**: See [Bit Manipulation](../strategies/patterns/bit-manipulation.md)
