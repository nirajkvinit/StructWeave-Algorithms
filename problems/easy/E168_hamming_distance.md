---
id: E168
old_id: I260
slug: hamming-distance
title: Hamming Distance
difficulty: easy
category: easy
topics: ["bit-manipulation", "math"]
patterns: ["bit-counting", "xor-operation"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E191", "E477", "E762"]
prerequisites: ["binary-representation", "xor-operation", "bit-manipulation"]
strategy_ref: ../strategies/fundamentals/bit-manipulation.md
---
# Hamming Distance

## Problem

The Hamming distance between two integers measures how many positions differ when you compare their binary representations bit by bit. For example, comparing 1 (binary: 0001) and 4 (binary: 0100) shows that two bit positions differ: the second and fourth positions from the right.

Given two integers `x` and `y`, calculate their Hamming distance. To do this, you need to convert both numbers to binary, align them (padding with leading zeros if necessary so they have the same length), and count how many positions have different bits. For instance, if one number has a 1 in position 3 and the other has a 0 in position 3, that counts as one difference.

The key to solving this efficiently lies in recognizing that the XOR operation naturally identifies differing bits. When you XOR two bits, the result is 1 if they differ and 0 if they match. So XORing two numbers produces a result where each 1-bit represents a position where the original numbers differed. This transforms the problem into simply counting the number of 1-bits in the XOR result—a common bit manipulation task with several clever solutions.

## Why This Matters

Hamming distance is fundamental to error detection and correction codes used in telecommunications, storage systems, and networking. In information theory, it measures the minimum number of bit flips needed to change one codeword into another, which is crucial for designing codes that can detect or correct transmission errors. DNA sequence analysis uses Hamming distance to measure genetic similarity between sequences. In machine learning, it's used for feature comparison in binary classification and nearest-neighbor algorithms.

This problem introduces essential bit manipulation techniques that appear throughout systems programming and optimization. The XOR operation is particularly powerful for detecting differences, and you'll encounter it in problems involving finding unique elements, detecting parity, and implementing checksums. Learning to count set bits efficiently—whether through Brian Kernighan's algorithm or built-in popcount instructions—is a fundamental skill that applies to hash functions, compression algorithms, and performance-critical code.

## Examples

**Example 1:**
- Input: `x = 1, y = 4`
- Output: `2`
- Explanation: Comparing binary representations:
1 in binary: 0 0 0 1
4 in binary: 0 1 0 0
The second and fourth bit positions differ, giving a Hamming distance of 2.

**Example 2:**
- Input: `x = 3, y = 1`
- Output: `1`

## Constraints

- 0 <= x, y <= 2³¹ - 1

## Think About

1. What makes this problem challenging?
   - Understanding how to compare individual bits efficiently
   - Converting integers to binary representation
   - Counting differing bit positions without manual conversion

2. Can you identify subproblems?
   - Converting integers to binary strings
   - Comparing bit by bit
   - Counting differences across all positions

3. What invariants must be maintained?
   - Both numbers are non-negative 32-bit integers
   - Bit positions are indexed from right (LSB) to left (MSB)
   - Leading zeros in binary representation don't affect the count

4. Is there a mathematical relationship to exploit?
   - XOR operation produces 1 where bits differ, 0 where they match
   - Counting 1s in XOR result gives the Hamming distance
   - Bit manipulation is more efficient than string conversion

## Approach Hints

### Hint 1: String Conversion Approach
Convert both integers to binary strings (padded to same length), then iterate through each character position and count the differences.

**Key insight**: String comparison makes the logic straightforward to understand.

**Limitations**: Time O(32) but with string conversion overhead; Space O(1) for fixed 32-bit integers but string operations add overhead.

### Hint 2: XOR and Bit Counting
Use the XOR operation (x ^ y) which produces 1s in positions where bits differ. Then count the number of 1s in the result.

**Key insight**: XOR naturally identifies differing bits in a single operation.

**How to implement**:
- Compute xorResult = x ^ y
- Count the number of 1 bits in xorResult
- Use a loop to check each bit: (xorResult >> i) & 1
- Or use built-in popcount/bit count functions

### Hint 3: Brian Kernighan's Algorithm
After computing XOR, use Brian Kernighan's technique to count set bits efficiently. This algorithm clears the rightmost set bit in each iteration.

**Key insight**: n & (n-1) removes the lowest set bit from n.

**Optimization strategy**:
- xorResult = x ^ y
- count = 0
- while xorResult > 0:
  - count++
  - xorResult = xorResult & (xorResult - 1)
- Runs only k iterations where k is the number of set bits

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| String Conversion | O(32) = O(1) | O(32) = O(1) | Convert to binary strings, compare character by character |
| XOR + Bit Shifting | O(32) = O(1) | O(1) | Check all 32 bits of XOR result |
| XOR + Brian Kernighan | O(k) | O(1) | k is number of differing bits (1 to 32), average case better |
| Built-in Popcount | O(1) | O(1) | Language-specific optimized bit count (uses CPU instructions) |

## Common Mistakes

### Mistake 1: Not handling different binary string lengths
```
// Wrong - assumes both numbers have same binary length
binX = x.toString(2)
binY = y.toString(2)
for (let i = 0; i < binX.length; i++) {
    if (binX[i] !== binY[i]) count++
}

// Why it fails: If x=1 (binary "1") and y=4 (binary "100")
// Comparing without padding gives wrong result

// Correct - pad to same length or use XOR
maxLen = Math.max(binX.length, binY.length)
binX = binX.padStart(maxLen, '0')
binY = binY.padStart(maxLen, '0')
```

### Mistake 2: Incorrect bit extraction
```
// Wrong - doesn't isolate the bit properly
for (let i = 0; i < 32; i++) {
    if ((x >> i) !== (y >> i)) count++
}

// Why it fails: Compares entire shifted numbers, not individual bits
// Example: (5 >> 1) = 2, (4 >> 1) = 2, but bit 0 differs

// Correct - extract and compare individual bits
for (let i = 0; i < 32; i++) {
    if (((x >> i) & 1) !== ((y >> i) & 1)) count++
}
```

### Mistake 3: Off-by-one error in Brian Kernighan's algorithm
```
// Wrong - doesn't handle the last bit correctly
xorResult = x ^ y
while (xorResult > 0) {
    if (xorResult & 1) count++
    xorResult >>= 1
}
// This works but is not Brian Kernighan's algorithm

// Correct Brian Kernighan implementation
xorResult = x ^ y
while (xorResult) {
    count++
    xorResult &= (xorResult - 1)  // Clear rightmost set bit
}
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Total Hamming Distance | Find sum of Hamming distances between all pairs in array | Medium |
| Minimum Hamming Distance | Find pair with minimum Hamming distance in array | Medium |
| Hamming Distance in Range | Count numbers within range having specific Hamming distance | Medium |
| K-bit Different Numbers | Generate all numbers differing by exactly k bits | Medium |
| Binary String Hamming | Apply to binary strings instead of integers | Easy |
| Weighted Hamming Distance | Different bit positions have different weights | Hard |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] First attempt (understand the problem)
- [ ] Implement string conversion approach
- [ ] Implement XOR with bit shifting
- [ ] Implement Brian Kernighan's algorithm
- [ ] Test with edge cases (0, equal numbers, max int)
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Solve without hints
- [ ] Explain solution to someone else
- [ ] Complete in under 10 minutes

**Strategy**: See [Bit Manipulation Fundamentals](../strategies/fundamentals/bit-manipulation.md)
