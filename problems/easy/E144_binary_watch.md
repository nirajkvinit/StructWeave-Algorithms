---
id: E144
old_id: I200
slug: binary-watch
title: Binary Watch
difficulty: easy
category: easy
topics: ["backtracking", "bit-manipulation", "enumeration"]
patterns: ["brute-force-enumeration", "bit-counting"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - E401
  - M784
  - M1286
prerequisites:
  - bit counting (popcount)
  - binary representation
  - enumeration techniques
strategy_ref: ../strategies/patterns/bit-manipulation.md
---
# Binary Watch

## Problem

Imagine a watch that displays time using individual LEDs to represent binary digits instead of traditional numeric displays. The watch has 10 LEDs total, divided into two rows:

**Top row (Hours):** 4 LEDs representing values 8, 4, 2, 1 (reading left to right)
**Bottom row (Minutes):** 6 LEDs representing values 32, 16, 8, 4, 2, 1 (reading left to right)

Each LED can be either **on** (1) or **off** (0). To determine the time, you add up the values of the lit LEDs in each row. For example, if the hour LEDs show `0100`, that's 4 (only the LED worth 4 is on). If the minute LEDs show `110011`, that's 32+16+2+1 = 51.

**Visual representation:**
```
Binary Watch Display:

Hours (4 LEDs):    ○ ● ○ ○  →  0100 (binary) = 4 (decimal)
                   8 4 2 1

Minutes (6 LEDs):  ● ● ○ ○ ● ●  →  110011 (binary) = 51 (decimal)
                  32 16 8 4 2 1

Display: "4:51"

Legend: ● = LED on (1), ○= LED off (0)

In this example, 4 LEDs are turned on (shown as ●).
```

Given an integer `turnedOn` indicating how many LEDs are currently lit, return all possible times that the watch could display. Important constraints: hours range from 0-11 (not 0-15, even though 4 bits could represent up to 15), and minutes range from 0-59 (not 0-63, even though 6 bits could represent up to 63).

**Output format requirements:**
- Hours: no leading zero (e.g., `"1:00"` not `"01:00"`)
- Minutes: always two digits with leading zero if needed (e.g., `"10:02"` not `"10:2"`)
- Results can be in any order

The solution is straightforward enumeration since the total search space is only 12 × 60 = 720 possibilities.

## Why This Matters

This problem teaches bit manipulation fundamentals, specifically the bit counting operation (popcount), which appears frequently in algorithms involving sets, permutations, and optimization problems. Counting set bits is a building block for problems like Gray codes, subset generation, Hamming distance, and power set enumeration.

The problem also demonstrates when brute force enumeration is actually optimal - with a fixed small search space (720 iterations), clever optimizations would add complexity without improving performance. Recognizing when to use simple iteration versus sophisticated algorithms is an important engineering judgment.

Binary representation of decimal numbers is fundamental to computer science, appearing in memory addressing, bit flags, permissions systems, network masks, and low-level programming. Understanding how binary digits combine to form decimal values builds intuition for bit manipulation techniques used in compression, cryptography, and performance optimization.

## Examples

**Example 1:**
- Input: `turnedOn = 1`
- Output: `["0:01","0:02","0:04","0:08","0:16","0:32","1:00","2:00","4:00","8:00"]`

**Example 2:**
- Input: `turnedOn = 9`
- Output: `[]`

## Constraints

- 0 <= turnedOn <= 10

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Tier 1 Hint - Core Concept
Two main approaches: (1) Enumeration: iterate through all valid hours (0-11) and minutes (0-59), count the total number of 1-bits in their binary representations, and keep those matching `turnedOn`. (2) Backtracking: recursively select which LEDs to turn on and generate valid time combinations. The enumeration approach is simpler and more efficient.

### Tier 2 Hint - Implementation Details
Use bit counting (popcount). For each hour h in [0,11] and minute m in [0,59], count bits: `count_bits(h) + count_bits(m)`. If this equals `turnedOn`, add the formatted time string to results. For bit counting, use built-in functions or manual counting: `bin(n).count('1')` in Python, or `Integer.bitCount(n)` in Java. Format: `f"{h}:{m:02d}"` ensures minutes have leading zeros.

### Tier 3 Hint - Optimization Strategy
Brute force enumeration is optimal here: O(12 * 60) = O(1) constant time since the range is fixed. Space: O(1) if not counting output. Total possible outputs is small (can be precomputed). Alternative backtracking approach has higher complexity and is unnecessary. Edge case: `turnedOn = 0` gives `["0:00"]`, `turnedOn >= 9` gives empty result (max is 8 bits for 11:59 = 2+6=8 bits, but 11:59 needs only 6 bits).

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force Enumeration | O(1) | O(1) | Fixed 720 iterations (12*60) |
| Backtracking | O(C(10,k)) | O(k) | k = turnedOn, much slower |
| Precomputation | O(1) | O(1) | Store all results in lookup table |
| Bit Manipulation Only | O(1) | O(1) | Same as enumeration |

## Common Mistakes

### Mistake 1: Incorrect time formatting
```python
# Wrong - missing leading zero for minutes
def readBinaryWatch(turnedOn):
    result = []
    for h in range(12):
        for m in range(60):
            if bin(h).count('1') + bin(m).count('1') == turnedOn:
                result.append(f"{h}:{m}")  # Should be {m:02d}
    return result
```

**Why it's wrong:** Minutes need two digits with leading zero. "1:5" should be "1:05".

**Fix:** Use `f"{h}:{m:02d}"` for proper formatting.

### Mistake 2: Wrong LED count limits
```python
# Wrong - doesn't validate hour/minute ranges
def readBinaryWatch(turnedOn):
    result = []
    for h in range(16):  # WRONG - hours go 0-11, not 0-15
        for m in range(64):  # WRONG - minutes go 0-59, not 0-63
            if bin(h).count('1') + bin(m).count('1') == turnedOn:
                result.append(f"{h}:{m:02d}")
    return result
```

**Why it's wrong:** Hours have 4 bits but valid range is 0-11. Minutes have 6 bits but valid range is 0-59.

**Fix:** Use correct ranges: `range(12)` and `range(60)`.

### Mistake 3: Inefficient bit counting
```python
# Inefficient - counts bits manually in loop
def count_bits(n):
    count = 0
    while n:
        count += 1
        n &= n - 1  # Clear lowest bit
    return count

def readBinaryWatch(turnedOn):
    result = []
    for h in range(12):
        for m in range(60):
            if count_bits(h) + count_bits(m) == turnedOn:
                result.append(f"{h}:{m:02d}")
    return result
```

**Why it's inefficient:** While this works, built-in functions like `bin(n).count('1')` are simpler and often faster.

**Fix:** Use built-in bit counting functions.

## Variations

| Variation | Difference | Difficulty Δ |
|-----------|-----------|-------------|
| 24-hour format watch | Hours range 0-23 instead of 0-11 | 0 |
| Specific time range | Only return times in given range | 0 |
| Count valid times | Return count instead of list | 0 |
| Hexadecimal watch | Display in different base | +1 |
| LED constraints per section | Separate limits for hours/minutes | +1 |
| Minimize time value | Return smallest valid time | 0 |

## Practice Checklist

Track your progress on this problem:

- [ ] Solved using enumeration + bit counting
- [ ] Handled time formatting correctly (leading zeros)
- [ ] Verified edge cases (0 LEDs, 9+ LEDs)
- [ ] After 1 day: Re-solved from memory
- [ ] After 1 week: Solved in < 10 minutes
- [ ] Explained bit counting approach to someone

**Strategy**: See [Bit Manipulation Pattern](../strategies/patterns/bit-manipulation.md)
