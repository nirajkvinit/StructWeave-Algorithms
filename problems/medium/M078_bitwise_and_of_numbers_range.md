---
id: M078
old_id: I001
slug: bitwise-and-of-numbers-range
title: Bitwise AND of Numbers Range
difficulty: medium
category: medium
topics: ["bit-manipulation"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["M062", "E136", "M137"]
prerequisites: ["bit-manipulation", "binary-representation", "bitwise-operations"]
---
# Bitwise AND of Numbers Range

## Problem

Given two integers left and right representing a range [left, right], compute the bitwise AND of all integers in this range. The bitwise AND operation compares corresponding bits of numbers and produces 1 only when both bits are 1. For example, 5 AND 7 compares their binary representations (101 AND 111 = 101). The challenge is that iterating through every number in the range is too slow for large ranges - if left=1 and right=2,147,483,647, you cannot loop through billions of numbers. Instead, think about the binary representation: as you count upward from left to right, bits toggle from 0 to 1 repeatedly. Once any bit position has seen both 0 and 1 within the range, the AND result for that bit must be 0. The answer is actually the common binary prefix shared by left and right. Consider edge cases like when left equals right (answer is just that number), when they differ by one, and when the range is enormous.

## Why This Matters

Bitwise range operations appear in network engineering, memory management, and compiler optimization. Network routers use this pattern to compute subnet masks and determine common network prefixes when aggregating IP address ranges. Memory allocators employ bitwise operations to find common alignment boundaries when coalescing free memory blocks. Compiler optimizers use bit analysis to determine which bits in a variable's range are guaranteed to be 0 or 1, enabling dead code elimination and strength reduction. Database query optimizers apply similar logic when computing bitmap indices over ranges of values. The insight that range operations can be solved by examining boundaries rather than iterating through elements is profound and applies to many domains - interval trees, range queries, and segment trees all leverage this principle. Understanding how bits behave across consecutive integers teaches you to think in binary patterns, a skill essential for low-level optimization, cryptography, and systems programming.

## Examples

**Example 1:**
- Input: `left = 5, right = 7`
- Output: `4`

**Example 2:**
- Input: `left = 0, right = 0`
- Output: `0`

**Example 3:**
- Input: `left = 1, right = 2147483647`
- Output: `0`

## Constraints

- 0 <= left <= right <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Binary Pattern Analysis</summary>

When performing AND across a range of consecutive integers, consider what happens in the binary representation. As numbers increase, different bit positions flip from 0 to 1. Once a bit position has both 0 and 1 values in the range, what will the AND result be for that position?

</details>

<details>
<summary>🎯 Hint 2: Common Prefix Strategy</summary>

The answer is the common binary prefix of the left and right boundaries. Think about why this is true: if left and right differ at a certain bit position, then the range must contain numbers with both 0 and 1 at that position, making the AND result 0 for that bit and all lower bits.

</details>

<details>
<summary>📝 Hint 3: Bit Shifting Algorithm</summary>

Pseudocode approach:
1. Initialize a shift counter to 0
2. While left != right:
   - Right shift both left and right by 1
   - Increment shift counter
3. Left shift the final left value by shift amount
4. This gives you the common prefix with trailing zeros

Alternative: Use bit manipulation to find the leftmost common bits directly by removing the rightmost differing bits.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n) | O(1) | Iterate through all numbers in range, performing AND. Fails for large ranges (Example 3) |
| Bit Shifting | O(log n) | O(1) | Shift until left equals right, at most 32 iterations for 32-bit integers |
| **Common Prefix** | **O(log n)** | **O(1)** | Find matching prefix bits efficiently, optimal for understanding bit patterns |
| Brian Kernighan | O(log n) | O(1) | Clear rightmost set bit of right until it's <= left, elegant bit manipulation |

## Common Mistakes

**Mistake 1: Attempting to iterate through the entire range**

```python
# Wrong - Times out for large ranges
def rangeBitwiseAnd(left, right):
    result = left
    for num in range(left + 1, right + 1):
        result &= num
    return result
```

```python
# Correct - Use bit manipulation
def rangeBitwiseAnd(left, right):
    shift = 0
    while left != right:
        left >>= 1
        right >>= 1
        shift += 1
    return left << shift
```

**Mistake 2: Not handling edge cases properly**

```python
# Wrong - Doesn't handle when left == right
def rangeBitwiseAnd(left, right):
    shift = 0
    while left < right:  # Should be !=
        left >>= 1
        right >>= 1
        shift += 1
    return left << shift
```

```python
# Correct - Use != comparison
def rangeBitwiseAnd(left, right):
    shift = 0
    while left != right:
        left >>= 1
        right >>= 1
        shift += 1
    return left << shift
```

**Mistake 3: Forgetting integer overflow considerations**

```python
# Wrong - May have issues with bit operations
def rangeBitwiseAnd(left, right):
    # Not considering that left << shift might overflow in some languages
    return left << shift
```

```python
# Correct - Python handles big integers, but be aware in other languages
def rangeBitwiseAnd(left, right):
    shift = 0
    while left != right:
        left >>= 1
        right >>= 1
        shift += 1
    # In languages like Java/C++, ensure shift doesn't exceed 31
    return left << shift
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Bitwise OR of Range | Medium | Find OR of all numbers in range (all bits that appear as 1) |
| Bitwise XOR of Range | Medium | Find XOR of consecutive integers (has a pattern every 4 numbers) |
| Count Set Bits in Range | Medium | Count total 1-bits in all numbers from left to right |
| Range AND Queries | Hard | Answer multiple range AND queries efficiently |
| Maximum AND Value | Hard | Find maximum bitwise AND of any two numbers in array |

## Practice Checklist

- [ ] Day 1: Solve using bit shifting approach
- [ ] Day 2: Solve using Brian Kernighan's algorithm (clear rightmost bit)
- [ ] Day 7: Re-solve from scratch, optimize for clarity
- [ ] Day 14: Solve the Bitwise OR variation
- [ ] Day 30: Teach the solution to someone else or write explanation

**Strategy**: See [Bit Manipulation Patterns](../strategies/patterns/bit-manipulation.md)
