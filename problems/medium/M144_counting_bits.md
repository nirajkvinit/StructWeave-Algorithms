---
id: M144
old_id: I137
slug: counting-bits
title: Counting Bits
difficulty: medium
category: medium
topics: ["bit-manipulation", "dynamic-programming"]
patterns: ["bit-counting", "dp-pattern"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E191", "E338", "M201"]
prerequisites: ["bit-manipulation", "binary-representation", "dynamic-programming"]
---
# Counting Bits

## Problem

Create an array of size `n + 1` where each position `i` contains the count of set bits (1s) in the binary representation of the number `i`. A set bit, also called a "1-bit," represents a position in the binary number where the bit value is 1 rather than 0. For example, the number 5 in binary is 101, which has two set bits (the first and third positions from the right).

For a given non-negative integer `n`, your array should cover all integers from 0 to `n` inclusive, with each element storing how many 1-bits appear in that index's binary form. The challenge is finding an efficient approach that avoids counting bits from scratch for each number. For instance, if `n = 5`, you'd return `[0, 1, 1, 2, 1, 2]` because: 0 has 0 ones (binary: 0), 1 has 1 one (binary: 1), 2 has 1 one (binary: 10), 3 has 2 ones (binary: 11), 4 has 1 one (binary: 100), and 5 has 2 ones (binary: 101).

The key insight is recognizing mathematical relationships between numbers and their binary representations. When you right-shift a number by one bit (equivalent to dividing by 2), you're removing the rightmost bit, and the number of 1s in the shifted number differs by at most one from the original. This observation allows you to build solutions using dynamic programming, where each number's bit count is computed from previously calculated values rather than counted from scratch.

## Why This Matters

Counting set bits is fundamental to low-level systems programming, compression algorithms, and cryptography. Network routers use bit counting in IP address subnet mask calculations to determine network routing. Database systems use bitmap indexes where counting set bits helps optimize query performance for large datasets with categorical data. Image processing algorithms count bits in binary masks to calculate areas of interest or object sizes in computer vision applications. Modern CPUs even have dedicated instructions like POPCNT for fast bit counting because it's so commonly needed. Understanding bit manipulation patterns and the dynamic programming relationship between numbers (like how `i` relates to `i >> 1`) is essential for writing efficient code in performance-critical applications, embedded systems, and competitive programming challenges.

## Examples

**Example 1:**
- Input: `n = 2`
- Output: `[0,1,1]`
- Explanation: Binary 0 has zero 1s, binary 1 has one 1, binary 10 has one 1.

**Example 2:**
- Input: `n = 5`
- Output: `[0,1,1,2,1,2]`
- Explanation: Count of 1-bits for 0-5: 0(0), 1(1), 10(1), 11(2), 100(1), 101(2).

## Constraints

- 0 <= n <= 10⁵

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Relationship Between Numbers</summary>

Look for patterns in binary representations. For example:
- 0 = 0b0 (0 ones)
- 1 = 0b1 (1 one)
- 2 = 0b10 (1 one)
- 3 = 0b11 (2 ones)
- 4 = 0b100 (1 one)
- 5 = 0b101 (2 ones)

Can you find a relationship between a number and a number you've already computed? Hint: What happens when you divide by 2 (shift right)?

</details>

<details>
<summary>🎯 Hint 2: Using Previously Computed Results</summary>

Key insight: `count[i] = count[i >> 1] + (i & 1)`

Why? When you right-shift a number (divide by 2), you remove the rightmost bit. The count of 1s in `i` equals:
- The count of 1s in `i >> 1` (all bits except the last)
- Plus 1 if the last bit is 1 (checked with `i & 1`)

This allows you to build results using dynamic programming.

</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>

**Approach 1: Right Shift DP**
```
1. Create result array of size n+1
2. result[0] = 0 (zero has no 1-bits)
3. For i from 1 to n:
   result[i] = result[i >> 1] + (i & 1)
4. Return result
```

**Approach 2: Last Set Bit DP**
```
1. Create result array of size n+1
2. result[0] = 0
3. For i from 1 to n:
   result[i] = result[i & (i - 1)] + 1
4. Return result
```

`i & (i - 1)` removes the rightmost 1-bit, so count is that number's count + 1.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Built-in) | O(n log n) | O(n) | Count bits for each number individually |
| Brian Kernighan's | O(n × k) | O(n) | k is number of set bits per number |
| **Right Shift DP** | **O(n)** | **O(n)** | **Use previous results, optimal** |
| Last Set Bit DP | O(n) | O(n) | Alternative DP formulation |

The DP approaches achieve O(n) time by reusing previously computed results rather than counting bits from scratch.

## Common Mistakes

### Mistake 1: Counting Bits from Scratch for Each Number

**Wrong Approach:**
```python
# Inefficient: counting bits individually
def count_bits(n):
    result = []
    for i in range(n + 1):
        count = 0
        num = i
        while num:  # Wrong: O(log n) per number
            count += num & 1
            num >>= 1
        result.append(count)
    return result
```

**Correct Approach:**
```python
# Use DP to build on previous results
def count_bits(n):
    result = [0] * (n + 1)
    for i in range(1, n + 1):
        result[i] = result[i >> 1] + (i & 1)  # Correct: O(1) per number
    return result
```

### Mistake 2: Wrong Bit Checking

**Wrong Approach:**
```python
# Using modulo instead of bitwise AND
def count_bits(n):
    result = [0] * (n + 1)
    for i in range(1, n + 1):
        result[i] = result[i // 2] + (i % 2)  # Works but slower
    return result
```

**Correct Approach:**
```python
# Use bitwise operations for efficiency
def count_bits(n):
    result = [0] * (n + 1)
    for i in range(1, n + 1):
        result[i] = result[i >> 1] + (i & 1)  # Correct: bitwise is faster
    return result
```

### Mistake 3: Not Initializing Base Case

**Wrong Approach:**
```python
# Missing initialization for 0
def count_bits(n):
    result = []
    for i in range(1, n + 1):  # Wrong: starts at 1, missing index 0
        result.append(result[i >> 1] + (i & 1))
    return result
```

**Correct Approach:**
```python
# Properly initialize array with base case
def count_bits(n):
    result = [0] * (n + 1)  # Correct: includes 0
    for i in range(1, n + 1):
        result[i] = result[i >> 1] + (i & 1)
    return result
```

## Variations

| Variation | Difference | Key Insight |
|-----------|------------|-------------|
| Hamming Weight | Count bits in single number | Use Brian Kernighan's algorithm |
| Hamming Distance | Count differing bits between two numbers | XOR then count bits |
| Total Hamming Distance | Sum of distances between all pairs | Count bit positions independently |
| Number of 1 Bits in Range | Count total 1s in range | Use digit DP or pattern analysis |
| Bitwise AND of Range | AND all numbers in range | Find common prefix |

## Practice Checklist

- [ ] Implement brute force solution (understand O(n log n))
- [ ] Implement right shift DP solution
- [ ] Implement last set bit DP solution
- [ ] Handle edge case: n = 0
- [ ] Handle edge case: n = 1
- [ ] Test with n = 16 (power of 2)
- [ ] Test with n = 15 (2^k - 1, all bits set)
- [ ] Verify pattern: powers of 2 always have count = 1
- [ ] Verify O(n) time complexity
- [ ] Code without looking at solution

**Spaced Repetition Schedule:**
- First review: 24 hours
- Second review: 3 days
- Third review: 1 week
- Fourth review: 2 weeks
- Fifth review: 1 month

**Strategy**: See [Bit Manipulation Patterns](../strategies/patterns/bit-manipulation.md)
