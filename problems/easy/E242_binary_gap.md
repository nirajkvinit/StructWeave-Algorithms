---
id: E242
old_id: A335
slug: binary-gap
title: Binary Gap
difficulty: easy
category: easy
topics: ["bit-manipulation", "math"]
patterns: ["bit-manipulation", "distance-tracking"]
estimated_time_minutes: 15
frequency: low
prerequisites: ["binary-representation", "bit-operations"]
related_problems: ["E191", "E190", "M137"]
strategy_ref: ../strategies/patterns/bit-manipulation.md
---
# Binary Gap

## Problem

Given a positive integer `n`, your task is to find the longest distance between any two consecutive `1` bits in its binary representation. If the number contains fewer than two `1` bits, return `0`.

First, let's clarify what we mean by binary representation. Every positive integer can be expressed as a sequence of `1`s and `0`s. For example, the number 22 in binary is `"10110"`. Now, two `1` bits are considered consecutive if there are no other `1` bits between them, though any number of `0` bits may separate them. The gap (or distance) between consecutive `1` bits is measured by counting the number of positions from one `1` to the next.

For instance, in binary `"1001"`, the two `1` bits are at positions 0 and 3, giving a gap of 3. In `"10110"` (the number 22), we have `1` bits at positions 0, 2, and 3. The gap between positions 0 and 2 is 2, and the gap between positions 2 and 3 is 1, so the maximum gap is 2.

Edge cases to consider: numbers that are powers of 2 (like 8 = `"1000"`) have only a single `1` bit and should return `0`. The challenge lies in efficiently identifying the positions of all `1` bits and tracking the maximum distance between consecutive ones.

## Why This Matters

Bit manipulation is a critical skill that appears in systems programming, performance optimization, and low-level algorithm design. This problem teaches you to think in binary, a fundamental requirement for understanding how computers represent and process data at the hardware level. The techniques you learn here directly apply to compression algorithms (where bit patterns are analyzed), network protocols (where flags and status bits are checked), embedded systems programming (where memory is precious), and cryptography (where bit-level operations are common). Additionally, the pattern of tracking positions and distances while processing sequential data appears in many algorithmic contexts beyond bit manipulation, making this a valuable exercise in state management and iterative processing.

## Examples

**Example 1:**
- Input: `n = 22`
- Output: `2`
- Explanation: Binary representation of 22 is "10110".
First consecutive pair: positions 1 and 3, gap = 2.
Second consecutive pair: positions 3 and 4, gap = 1.
Maximum gap is 2.

**Example 2:**
- Input: `n = 8`
- Output: `0`
- Explanation: Binary representation of 8 is "1000".
Only one `1` bit exists, so no pairs can be formed.

**Example 3:**
- Input: `n = 5`
- Output: `2`
- Explanation: Binary representation of 5 is "101", with a gap of 2.

## Constraints

- 1 <= n <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1 - Conceptual Foundation
You need to find positions of all `1` bits in the binary representation. Think about how to extract individual bits from a number. How can you check if the rightmost bit is 1? Once you find a `1` bit, how do you move to check the next bit?

### Hint 2 - Position Tracking
Keep track of the position of the previous `1` bit you found. When you encounter the next `1` bit, calculate the gap (current position - previous position). Update your maximum gap if this new gap is larger. Don't forget to update the previous position for the next iteration.

### Hint 3 - Implementation Strategy
Use a loop to check each bit position. You can either: (1) Convert n to binary string and iterate through characters, or (2) Use bit operations: check if (n & 1) equals 1, then right shift n by 1 each iteration. Track the current position, previous `1` position, and maximum gap seen.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Binary String Conversion | O(log n) | O(log n) | Convert to string, iterate through characters |
| Bit Manipulation | O(log n) | O(1) | Use bitwise operations without string conversion |
| Built-in Functions | O(log n) | O(log n) | Use bin() function in Python |

## Common Mistakes

### Mistake 1: Counting Zeros Instead of Positions
```python
# INCORRECT: Counts zeros between 1s, not the distance
def binary_gap(n):
    binary = bin(n)[2:]  # Remove '0b' prefix
    max_gap = 0
    zero_count = 0

    for char in binary:
        if char == '0':
            zero_count += 1
        else:  # char == '1'
            max_gap = max(max_gap, zero_count)
            zero_count = 0  # Reset count
    return max_gap
```
**Why it's wrong:** The gap is the distance between positions, not the count of zeros. For "1001" (positions 0,1,2,3), the gap is 3 (from position 0 to 3), not 2 (the zero count).

**Correct approach:**
```python
# CORRECT: Tracks positions and calculates distance
def binary_gap(n):
    binary = bin(n)[2:]
    max_gap = 0
    prev_pos = -1

    for i, char in enumerate(binary):
        if char == '1':
            if prev_pos != -1:
                max_gap = max(max_gap, i - prev_pos)
            prev_pos = i
    return max_gap
```

### Mistake 2: Off-by-One in Gap Calculation
```python
# INCORRECT: Miscalculates gap by adding or subtracting 1
def binary_gap(n):
    positions = []
    binary = bin(n)[2:]

    for i, char in enumerate(binary):
        if char == '1':
            positions.append(i)

    max_gap = 0
    for i in range(1, len(positions)):
        gap = positions[i] - positions[i-1] + 1  # Wrong: adds 1
        max_gap = max(max_gap, gap)
    return max_gap
```
**Why it's wrong:** If positions are at indices 0 and 3, the gap is 3 - 0 = 3, not 4. The difference already represents the distance.

**Correct approach:**
```python
# CORRECT: Direct subtraction without modification
def binary_gap(n):
    positions = [i for i, char in enumerate(bin(n)[2:]) if char == '1']

    if len(positions) < 2:
        return 0

    max_gap = 0
    for i in range(1, len(positions)):
        max_gap = max(max_gap, positions[i] - positions[i-1])
    return max_gap
```

### Mistake 3: Not Handling Single or No 1-Bits
```python
# INCORRECT: Assumes at least two 1-bits exist
def binary_gap(n):
    binary = bin(n)[2:]
    first = binary.index('1')
    last = binary.rindex('1')
    return last - first  # Wrong when only one 1-bit
```
**Why it's wrong:** When there's only one `1` bit, first == last, returning 0 is correct, but the logic doesn't properly handle the "maximum gap" concept. For multiple `1` bits, this only checks first and last, missing intermediate gaps.

## Problem Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Hamming Distance | Easy | Count differing bits between two numbers |
| Number of 1 Bits | Easy | Count total number of set bits |
| Binary Gap with Zeros | Medium | Find maximum consecutive zeros between any two 1s |
| Longest Consecutive Ones | Medium | Find longest sequence of consecutive 1s |
| Bit Distance in Array | Medium | Find maximum bit gap across multiple numbers |

## Practice Checklist

- [ ] First solve: Implement using string conversion
- [ ] Optimize: Solve using bitwise operations without string
- [ ] Handle edge cases: Powers of 2, numbers with single 1-bit
- [ ] Review after 1 day: Explain both string and bitwise approaches
- [ ] Review after 1 week: Implement bitwise version from scratch
- [ ] Interview ready: Extend to related bit manipulation problems

## Strategy

**Pattern**: Bit Manipulation with Distance Tracking
- Master binary representation analysis
- Learn position tracking in sequential processing
- Understand bit extraction techniques

See [Bit Manipulation Pattern](../strategies/patterns/bit-manipulation.md) for the complete strategy guide.
