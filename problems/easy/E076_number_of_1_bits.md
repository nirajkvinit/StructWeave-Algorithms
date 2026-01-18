---
id: E076
old_id: F181
slug: number-of-1-bits
title: Number of 1 Bits
difficulty: easy
category: easy
topics: ["bit-manipulation"]
patterns: ["complement-search"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E191", "E231", "E338"]
prerequisites: ["bitwise-operations", "binary-representation"]
strategy_ref: ../strategies/patterns/bit-manipulation.md
---
# Number of 1 Bits

## Problem

Given a 32-bit unsigned integer `n`, count how many bits are set to 1 in its binary representation. This is also known as the **Hamming weight** or **population count**.

For example:
- The number 11 in binary is `00000000000000000000000000001011`, which has three 1-bits
- The number 128 in binary is `00000000000000000000000010000000`, which has one 1-bit
- The number 4294967293 in binary is `11111111111111111111111111111101`, which has thirty-one 1-bits

**Your task:** Write a function that takes an unsigned integer and returns the number of 1-bits it contains.

**Key insight:** There's a clever bit manipulation trick that eliminates one set bit per iteration, making the algorithm run in time proportional to the number of 1-bits rather than the total number of bits (32).

## Why This Matters

Counting set bits appears throughout computer science and engineering:
- **Network engineering**: Calculating subnet masks in IP addressing (CIDR notation)
- **Data compression**: Analyzing bit patterns for encoding efficiency
- **Cryptography**: Hamming distance calculations for error detection and correction codes
- **Machine learning**: Computing similarity between binary feature vectors
- **Hardware design**: Parity checking and error detection in memory systems

Beyond applications, this introduces **Brian Kernighan's algorithm**, an elegant technique that leverages the relationship between a number and its predecessor (`n & (n-1)` clears the rightmost set bit). This pattern recurs in many bit manipulation problems.

## Examples

**Example 1:**
- Input: `n = 00000000000000000000000000001011`
- Output: `3`
- Explanation: The input binary string **00000000000000000000000000001011** has a total of three '1' bits.

**Example 2:**
- Input: `n = 00000000000000000000000010000000`
- Output: `1`
- Explanation: The input binary string **00000000000000000000000010000000** has a total of one '1' bit.

**Example 3:**
- Input: `n = 11111111111111111111111111111101`
- Output: `31`
- Explanation: The input binary string **11111111111111111111111111111101** has a total of thirty one '1' bits.

## Constraints

- The input must be a **binary string** of length 32.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

Think about how you can inspect each bit of the number. What operation lets you examine individual bits? Consider how you might isolate the rightmost bit and check if it's set.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

There are two main approaches: (1) Check each bit position one by one using bit shifting or masking, or (2) Use a clever trick that eliminates the rightmost set bit in each iteration. The second approach is more efficient when there are fewer set bits.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**Optimal Algorithm (Brian Kernighan's Algorithm):**
1. Initialize count = 0
2. While n is not zero:
   - Perform n = n & (n - 1) (this clears the rightmost set bit)
   - Increment count
3. Return count

This runs exactly as many iterations as there are set bits.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Check Each Bit | O(32) = O(1) | O(1) | Loop through all 32 bits |
| **Brian Kernighan** | **O(k)** | **O(1)** | k = number of set bits; optimal when k << 32 |
| Lookup Table | O(1) | O(256) | Pre-compute counts for byte values |

## Common Mistakes

**Mistake 1: Infinite Loop with Signed Numbers**

```python
# Wrong: Can cause infinite loop if n is negative
def hammingWeight(n):
    count = 0
    while n:
        if n & 1:
            count += 1
        n >>= 1  # Right shift on negative numbers in some languages
    return count
```

```python
# Correct: Treat as unsigned or use bit count limit
def hammingWeight(n):
    count = 0
    for i in range(32):  # Exactly 32 iterations
        if n & 1:
            count += 1
        n >>= 1
    return count
```

**Mistake 2: Not Understanding n & (n-1)**

```python
# Wrong: Trying to check each bit naively
def hammingWeight(n):
    count = 0
    while n > 0:
        if n % 2 == 1:  # Slower than bitwise operations
            count += 1
        n //= 2
    return count
```

```python
# Correct: Use Brian Kernighan's algorithm
def hammingWeight(n):
    count = 0
    while n:
        n &= n - 1  # Clear rightmost set bit
        count += 1
    return count
```

**Mistake 3: Forgetting Edge Cases**

```python
# Wrong: Doesn't handle 0
def hammingWeight(n):
    count = 0
    while n > 0:  # Will not enter loop for n = 0
        n &= n - 1
        count += 1
    return count
```

```python
# Correct: Works for all cases including 0
def hammingWeight(n):
    count = 0
    while n != 0:  # Or simply 'while n:'
        n &= n - 1
        count += 1
    return count
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Power of Two | Check if number has exactly one set bit | Easy |
| Number of Differing Bits | Count bits that differ between two numbers | Easy |
| Reverse Bits | Reverse the bit pattern | Easy |
| Count Total Bits | Count set bits from 0 to n | Medium |
| Parity Check | Determine if count is odd/even | Easy |

## Practice Checklist

- [ ] Day 1: Solve using bit-by-bit checking approach
- [ ] Day 2: Implement Brian Kernighan's algorithm
- [ ] Day 3: Try lookup table approach for optimization
- [ ] Week 1: Solve without hints, time yourself
- [ ] Week 2: Explain approach to someone else
- [ ] Month 1: Apply to related bit manipulation problems

**Strategy**: See [Bit Manipulation Pattern](../strategies/patterns/bit-manipulation.md)
