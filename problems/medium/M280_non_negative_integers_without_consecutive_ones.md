---
id: M280
old_id: A082
slug: non-negative-integers-without-consecutive-ones
title: Non-negative Integers without Consecutive Ones
difficulty: medium
category: medium
topics: ["bit-manipulation", "dynamic-programming"]
patterns: ["digit-dp", "fibonacci"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - id: E070
    name: Climbing Stairs
    difficulty: easy
  - id: M100
    name: Fibonacci Number
    difficulty: medium
  - id: H010
    name: Count Different Palindromic Subsequences
    difficulty: hard
prerequisites:
  - concept: Binary representation
    level: basic
  - concept: Dynamic programming
    level: intermediate
  - concept: Fibonacci sequence
    level: basic
---
# Non-negative Integers without Consecutive Ones

## Problem

Given a positive integer n, count how many integers from 0 to n (inclusive) have binary representations without consecutive 1-bits. For example, the number 3 in binary is 11 (two consecutive ones), so it doesn't count. But 5 is 101 (no consecutive ones), so it counts.

The challenge is that n can be as large as 10^9, making it impossible to check each number individually. You need a mathematical approach that counts valid numbers without examining all of them. The key insight involves two observations: (1) for a fixed number of bits, the count of valid numbers follows a Fibonacci pattern, and (2) you can build the count for numbers up to n by processing n's bits from left to right.

For numbers with exactly k bits, the count follows f[k] = f[k-1] + f[k-2], similar to Fibonacci. Why? A k-bit number either ends in 0 (allowing any valid k-1 bit prefix) or ends in 01 (requiring the last two bits to be 01, with any valid k-2 bit prefix before that). This Fibonacci relationship lets you precompute counts quickly.

To count numbers up to n specifically, convert n to binary and process each bit position. At each position where n has a 1, you count all valid numbers that have 0 at that position (using your Fibonacci table), then continue with the assumption that position is 1. If you ever encounter two consecutive 1s in n itself, stop early since no larger valid number exists.


## Why This Matters

This problem introduces digit dynamic programming, a powerful technique for counting numbers with specific properties in a range. Digit DP appears in competition programming and in real-world scenarios like counting license plates, phone numbers, or IDs that satisfy certain constraints (no repeating digits, specific patterns, checksum requirements).

The Fibonacci connection teaches you to recognize mathematical patterns in seemingly unrelated problems. Understanding that "no consecutive ones" relates to Fibonacci deepens your pattern recognition skills. This same Fibonacci sequence appears in tiling problems, step-climbing variants, and many combinatorial counting scenarios.

Bit manipulation combined with DP is essential for low-level optimization, cryptography, and working with flags or permissions in systems programming. This problem builds your ability to think in binary and exploit structural properties of numbers rather than brute-forcing through possibilities.

## Examples

**Example 1:**
- Input: `n = 5`
- Output: `5`
- Explanation: Examining integers from 0 to 5 in binary:
0 : 0
1 : 1
2 : 10
3 : 11
4 : 100
5 : 101
Only the number 3 contains adjacent 1-bits in its binary form. The remaining five numbers meet the requirement.

**Example 2:**
- Input: `n = 1`
- Output: `2`

**Example 3:**
- Input: `n = 2`
- Output: `3`

## Constraints

- 1 <= n <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Fibonacci Connection for Fixed Bit Length</summary>

For numbers with exactly k bits, count valid numbers using a Fibonacci-like pattern:
- `f[k]` = count of k-bit numbers without consecutive 1s
- `f[1] = 2` (0, 1)
- `f[2] = 3` (00, 01, 10)
- `f[k] = f[k-1] + f[k-2]`

Why? For k-bit numbers:
- If last bit is 0: previous k-1 bits can be any valid pattern → f[k-1] ways
- If last bit is 1: previous bit must be 0, so previous k-2 bits can be any valid pattern → f[k-2] ways

```python
# Build Fibonacci-like table
fib = [0] * 32  # Enough for 10^9
fib[0] = 1  # empty
fib[1] = 2  # 0, 1
for i in range(2, 32):
    fib[i] = fib[i-1] + fib[i-2]
```
</details>

<details>
<summary>Hint 2: Digit DP Approach - Process Bits from Left to Right</summary>

Build the count by processing n's bits from most significant to least significant:
1. Convert n to binary representation
2. For each bit position, count valid numbers:
   - If n has 0 at position i: all smaller positions follow Fibonacci pattern
   - If n has 1 at position i: consider both 0 and 1 choices carefully

Use a flag to track if previous bit was 1 (to avoid consecutive 1s).

```python
def count(n):
    binary = bin(n)[2:]  # Remove '0b' prefix
    k = len(binary)
    result = 0
    prev_bit = 0

    for i in range(k):
        if binary[i] == '1':
            # Count numbers with 0 at position i
            result += fib[k - i - 1]

            if prev_bit == 1:
                # Found consecutive 1s in n itself
                return result
            prev_bit = 1
        else:
            prev_bit = 0

    return result + 1  # +1 for n itself
```
</details>

<details>
<summary>Hint 3: Complete Digit DP Implementation</summary>

Combine Fibonacci precomputation with bit-by-bit analysis:

```python
def findIntegers(n):
    # Step 1: Build Fibonacci table
    fib = [1, 2]  # fib[0]=1 (no bits), fib[1]=2 (0,1)
    for i in range(2, 32):
        fib.append(fib[-1] + fib[-2])

    # Step 2: Process n's bits
    binary = bin(n)[2:]
    k = len(binary)
    result = 0
    prev_bit = 0

    for i in range(k):
        if binary[i] == '1':
            # Add count when current bit is 0
            result += fib[k - i - 1]

            # Check if we have consecutive 1s
            if prev_bit == 1:
                return result
            prev_bit = 1
        else:
            prev_bit = 0

    # Add 1 to include n itself if valid
    return result + 1
```

**Key Insight**: The Fibonacci numbers count valid numbers with k bits. The digit DP part carefully counts how many valid numbers are ≤ n.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force | O(n × log n) | O(1) | Check each number's binary |
| Digit DP + Fibonacci | O(log n) | O(log n) | Process each bit of n |
| Optimal Solution | O(log n) | O(1) | In-place bit processing |

**Detailed Analysis:**
- **Time**: O(log n) - Process each of log n bits once
- **Space**: O(log n) for storing binary representation or Fibonacci array
- **Key Insight**: Instead of checking all n numbers, use mathematical pattern

## Common Mistakes

### Mistake 1: Brute force checking each number
```python
# Wrong: O(n × log n) - Too slow for n up to 10^9
count = 0
for i in range(n + 1):
    binary = bin(i)[2:]
    if '11' not in binary:
        count += 1

# Correct: O(log n) using digit DP
# Use Fibonacci + bit-by-bit analysis
```

### Mistake 2: Incorrect Fibonacci initialization
```python
# Wrong: Fibonacci starting values
fib = [1, 1]  # Should be [1, 2]

# Correct:
fib = [1, 2]  # fib[0]=1 (empty), fib[1]=2 (0,1)
```

### Mistake 3: Forgetting to handle the number n itself
```python
# Wrong: Not including n in the count
return result

# Correct: Add 1 if n is valid (no consecutive 1s)
return result + 1
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Consecutive Zeros | Count numbers without consecutive 0s in binary | Medium |
| K Consecutive Ones | Count numbers without k consecutive 1s | Hard |
| Digit DP on Decimal | Count numbers without consecutive equal digits | Medium |
| Binary Palindromes | Count palindromic binary numbers in range | Hard |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] **Initial Attempt** - Solve independently (30 min limit)
- [ ] **Solution Study** - If stuck, study one approach deeply
- [ ] **Implementation** - Code solution from scratch without reference
- [ ] **Optimization** - Achieve O(log n) time complexity
- [ ] **Edge Cases** - Test: n=1, n=2, powers of 2, numbers like 5 (101)
- [ ] **Variations** - Solve at least 2 related problems
- [ ] **Spaced Repetition** - Re-solve after: 1 day, 1 week, 1 month

**Mastery Goal**: Solve in < 25 minutes with optimal solution.

**Strategy**: See [Digit DP Pattern](../strategies/patterns/dynamic-programming.md) and [Bit Manipulation](../strategies/patterns/bit-manipulation.md)
