---
id: E075
old_id: F180
slug: reverse-bits
title: Reverse Bits
difficulty: easy
category: easy
topics: ["bit-manipulation"]
patterns: ["bit-manipulation"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E007", "E191", "M201"]
prerequisites: ["bit-operations", "bitwise-operators"]
strategy_ref: ../strategies/fundamentals/bit-manipulation.md
---
# Reverse Bits

## Problem

Given a 32-bit unsigned integer `n`, reverse its bit pattern and return the resulting integer.

For example, the integer 43261596 has the binary representation:
```
00000010100101000001111010011100
```

Reversing this bit pattern gives:
```
00111001011110000010100101000000
```

Which equals 964176192 in decimal.

**Key points:**
- The input is a 32-bit unsigned integer (range: 0 to 2³²-1)
- You must reverse all 32 bits, including leading zeros
- The leftmost bit becomes the rightmost, and vice versa
- Return the resulting number as a 32-bit unsigned integer

**Think about:** How do you extract individual bits from a number? How can you build a new number by setting bits in reverse order?

## Why This Matters

Bit reversal is a fundamental operation in several domains:
- **Digital signal processing**: Fast Fourier Transform (FFT) algorithms rely heavily on bit-reversed indexing for efficient computation
- **Network protocols**: Endianness conversion when communicating between systems with different byte orders
- **Graphics programming**: Certain texture mapping and dithering techniques
- **Error detection**: Cyclic redundancy checks (CRC) use bit manipulation patterns

This problem builds your foundation in bit manipulation, teaching you to think at the binary level. These skills are essential for systems programming, embedded development, and performance-critical code optimization.

## Examples

**Example 1:**
- Input: `n = 00000010100101000001111010011100`
- Output: `964176192 (00111001011110000010100101000000)
**Explanation: **The input binary string **00000010100101000001111010011100** represents the unsigned integer 43261596, so return 964176192 which its binary representation is **00111001011110000010100101000000**.`

**Example 2:**
- Input: `n = 11111111111111111111111111111101`
- Output: `3221225471 (10111111111111111111111111111111)
**Explanation: **The input binary string **11111111111111111111111111111101** represents the unsigned integer 4294967293, so return 3221225471 which its binary representation is **10111111111111111111111111111111**.`

## Constraints

- The input must be a **binary string** of length 32

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Extract Bits One by One</summary>

To reverse bits, you need to:
1. Extract each bit from the input (from right to left)
2. Place it in the output (from left to right)

How to extract the rightmost bit of n?
- Use `n & 1` (AND with 1)
- This gives you the least significant bit

How to remove the rightmost bit after extracting?
- Use `n >> 1` (right shift by 1)

How to build the result?
- Start with result = 0
- For each extracted bit, shift result left by 1 and add the bit

</details>

<details>
<summary>🎯 Hint 2: Shift and Build</summary>

Process all 32 bits:
```
For i from 0 to 31:
  1. Extract rightmost bit of n: bit = n & 1
  2. Shift result left to make room: result = result << 1
  3. Add the extracted bit: result = result | bit
  4. Shift n right to process next bit: n = n >> 1
```

Think of it as moving bits one at a time from n (right to left) to result (left to right).

Example: n = 5 (00000101) for 8-bit
- i=0: bit=1, result=00000001, n=00000010
- i=1: bit=0, result=00000010, n=00000001
- i=2: bit=1, result=00000101, n=00000000
- Continue until i=7
- Result: 10100000 (reversed!)

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithm</summary>

**Bit-by-Bit Reversal:**
```
1. Initialize result = 0
2. For i from 0 to 31:
   a. Get rightmost bit of n: bit = n & 1
   b. Shift result left: result = result << 1
   c. Add bit to result: result = result | bit
   d. Shift n right: n = n >> 1
3. Return result
```

**Optimized Version:**
```
1. Initialize result = 0
2. For i from 0 to 31:
   result = (result << 1) | (n & 1)
   n >>= 1
3. Return result
```

Time: O(1) - always 32 iterations
Space: O(1)

**Advanced: Divide and Conquer (Optional)**
- Swap 16-bit halves
- Swap 8-bit quarters within each half
- Continue down to 1-bit swaps
Time: O(log n) operations, but still O(1) for fixed 32-bit
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| String Conversion | O(n) | O(n) | Convert to binary string, reverse, convert back |
| **Bit Manipulation** | **O(1)** | **O(1)** | Fixed 32 iterations, optimal |
| Divide & Conquer | O(1) | O(1) | Fewer operations, more complex |

Note: For fixed-width integers (32 bits), all approaches are technically O(1)

## Common Mistakes

### 1. Not Processing All 32 Bits
```python
# WRONG: Stops when n becomes 0
result = 0
while n > 0:
    result = (result << 1) | (n & 1)
    n >>= 1
# For n=4 (00000100), stops at 3rd iteration, missing leading zeros

# CORRECT: Always process exactly 32 bits
result = 0
for i in range(32):
    result = (result << 1) | (n & 1)
    n >>= 1
```

### 2. Signed vs Unsigned Integer Issues
```python
# WRONG: In some languages, treating result as signed
# Can cause negative numbers if leftmost bit is 1

# CORRECT: Ensure unsigned 32-bit integer
result = result & 0xFFFFFFFF  # Mask to 32 bits (language-specific)
```

### 3. Wrong Order of Operations
```python
# WRONG: Shift after adding bit
result = result | (n & 1)
result = result << 1  # Shifts one extra time at the end

# CORRECT: Shift before adding (except last iteration)
for i in range(32):
    result = (result << 1) | (n & 1)
    n >>= 1
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Reverse 16-bit | Different width | Change loop to 16 iterations |
| Reverse 64-bit | Larger width | Change loop to 64 iterations |
| Reverse byte order | Swap bytes not bits | Use byte masks (0xFF) and shift by 8 |
| Reverse specific range | Reverse only bits i to j | Extract range, reverse, merge back |

## Practice Checklist

**Correctness:**
- [ ] Handles all zeros (0 → 0)
- [ ] Handles all ones (2³²-1 → 2³²-1)
- [ ] Handles single bit set (1 → 2³¹)
- [ ] Processes all 32 bits (including leading zeros)
- [ ] Returns unsigned 32-bit result
- [ ] Works with example inputs

**Interview Readiness:**
- [ ] Can explain bit extraction (n & 1)
- [ ] Can explain bit shifting
- [ ] Can code solution in 7 minutes
- [ ] Can trace through 8-bit example
- [ ] Can discuss divide-and-conquer optimization

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve with divide-and-conquer
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Bit Manipulation](../../strategies/fundamentals/bit-manipulation.md)
