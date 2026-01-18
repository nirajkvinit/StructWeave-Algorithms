---
id: M033
old_id: F089
slug: gray-code
title: Gray Code
difficulty: medium
category: medium
topics: ["bit-manipulation"]
patterns: ["backtracking", "mathematical"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M078", "M089", "E136"]
prerequisites: ["bit-manipulation", "binary-representation"]
strategy_ref: ../strategies/patterns/bit-manipulation.md
---
# Gray Code

## Problem

Generate a sequence of n-bit binary numbers (represented as integers) where each consecutive pair of numbers differs by exactly one bit. This sequence is called Gray code or reflected binary code. For example, with n=2, you might generate [0,1,3,2] which in binary is [00,01,11,10] - notice that 00 and 01 differ only in the last bit, 01 and 11 differ only in the first bit, 11 and 10 differ only in the last bit, and 10 and 00 (wrapping around) differ only in the first bit. There are multiple valid Gray code sequences for any given n, as different orderings can satisfy the constraint. The key requirement is that the sequence must include all 2^n possible n-bit numbers exactly once, with adjacent numbers differing by a single bit flip. Note that "adjacent" includes the transition from the last number back to the first, making this a cyclic sequence.

## Why This Matters

Gray codes are crucial in hardware design and digital electronics because they prevent glitches when multiple bits change simultaneously. When a mechanical encoder rotates (like in robotics or industrial machinery), using Gray code ensures only one bit changes at each step, eliminating ambiguous intermediate states. This makes error detection and correction much simpler. The problem beautifully illustrates the relationship between recursion and bit manipulation, showing how a simple XOR operation can encode a complex pattern. Gray codes also appear in genetic algorithms, Karnaugh maps for circuit design, and certain compression algorithms. For technical interviews, this problem assesses your ability to recognize mathematical patterns and choose between iterative construction versus direct formula approaches - both are valid, demonstrating different problem-solving styles.

## Examples

**Example 1:**
- Input: `n = 2`
- Output: `[0,1,3,2]`
- Explanation: The binary representation of [0,1,3,2] is [00,01,11,10].
- 00 and 01 differ by one bit
- 01 and 11 differ by one bit
- 11 and 10 differ by one bit
- 10 and 00 differ by one bit
[0,2,3,1] is also a valid gray code sequence, whose binary representation is [00,10,11,01].
- 00 and 10 differ by one bit
- 10 and 11 differ by one bit
- 11 and 01 differ by one bit
- 01 and 00 differ by one bit

**Example 2:**
- Input: `n = 1`
- Output: `[0,1]`

## Constraints

- 1 <= n <= 16

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

Gray code has a beautiful recursive pattern. If you know the Gray code sequence for n-1 bits, you can generate the sequence for n bits by: (1) prefixing 0 to all n-1 codes, then (2) prefixing 1 to all n-1 codes in reverse order. For example, if n=1 gives [0,1], then n=2 gives [00,01] + [11,10] = [0,1,3,2].

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use the formula: Gray(i) = i XOR (i >> 1). This direct formula converts any binary number to its Gray code equivalent without needing to build the entire sequence recursively. Alternatively, build iteratively by reflecting and prefixing as described in Hint 1.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

Pseudocode approach (Formula method):
1. result = []
2. For i from 0 to 2^n - 1:
   - gray = i XOR (i >> 1)
   - Append gray to result
3. Return result

Pseudocode approach (Reflective method):
1. result = [0]
2. For bit_position from 0 to n-1:
   - Reverse current result
   - Add 2^bit_position to each reversed element
   - Append reversed elements to result
3. Return result

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Backtracking | O(n * 2^n) | O(2^n) | Try all permutations, check adjacency |
| **Formula (i XOR i>>1)** | **O(2^n)** | **O(1)** | Direct calculation, optimal |
| **Reflective Build** | **O(2^n)** | **O(1)** | Iterative construction, optimal |

## Common Mistakes

### 1. Not understanding the XOR formula
```python
# WRONG: Trying to manually construct bit by bit
gray = 0
for bit in range(n):
    # complex bit manipulation...

# CORRECT: Use simple XOR formula
for i in range(2 ** n):
    gray = i ^ (i >> 1)
    result.append(gray)
```

### 2. Incorrect reflection in iterative approach
```python
# WRONG: Not reversing the reflection
for i in range(n):
    size = len(result)
    for j in range(size):  # Forward order
        result.append(result[j] + (1 << i))

# CORRECT: Reverse order for reflection
for i in range(n):
    size = len(result)
    for j in range(size - 1, -1, -1):  # Reverse order
        result.append(result[j] + (1 << i))
```

### 3. Integer overflow for large n
```python
# WRONG: May overflow for n > 30 in some languages
total = 2 ** n  # Could overflow

# CORRECT: Use bit shift which is safer
total = 1 << n  # Equivalent but more explicit
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Decode Gray code | Convert Gray to binary | Use formula: binary = gray; while (gray >>= 1) binary ^= gray |
| K-ary Gray code | More than 2 symbols | Generalize reflection algorithm for base k |
| Verify Gray code | Check if sequence is valid | Verify each adjacent pair differs by exactly 1 bit |
| Cyclic requirement | Last must differ from first by 1 bit | Standard Gray code already satisfies this |

## Practice Checklist

- [ ] Handles empty/edge cases (n=1, n=16)
- [ ] Can explain approach in 2 min
- [ ] Can code solution in 15 min
- [ ] Can discuss time/space complexity
- [ ] Understands both formula and reflective approaches

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Bit Manipulation Pattern](../../strategies/patterns/bit-manipulation.md)
