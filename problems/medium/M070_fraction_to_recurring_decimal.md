---
id: M070
old_id: F166
slug: fraction-to-recurring-decimal
title: Fraction to Recurring Decimal
difficulty: medium
category: medium
topics: ["math", "hash-table", "string"]
patterns: ["hash-map"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M069", "E001", "M071"]
prerequisites: ["hash-map", "long-division", "string-building"]
strategy_ref: ../strategies/patterns/hash-map.md
---
# Fraction to Recurring Decimal

## Problem

Given two integers representing a numerator and denominator, return the fraction's decimal string representation. If the decimal part repeats, enclose the repeating part in parentheses. For example, 1/2 becomes "0.5", 2/1 becomes "2", and 4/333 becomes "0.(012)" where "012" repeats infinitely. You must handle negative numbers correctly (the result is negative if exactly one input is negative), avoid integer overflow when the inputs are at the 32-bit integer boundaries, and detect when the decimal repeats. The key insight is that you're simulating long division: compute the integer part first, then repeatedly take the remainder, multiply by 10, and divide to get each decimal digit. A repeating decimal occurs when you see the same remainder twice during this process, because from that point the division cycle repeats. You need a hash map to track each remainder and the position where it occurred in the result string, so when you encounter a repeated remainder, you know where to insert the opening parenthesis. Edge cases include exact divisions (remainder becomes zero), results that are pure integers (no decimal part), negative numbers, and zero numerator.

## Why This Matters

Decimal conversion with repeat detection appears in financial calculators that display exact fractional representations of interest rates or investment returns, showing "0.(3)" instead of "0.3333..." for 1/3. Computer algebra systems like Mathematica or Wolfram Alpha need to convert rational numbers to displayable decimal forms while preserving precision information by marking repeats. Educational math software teaches long division by showing the step-by-step process and highlighting when patterns repeat. Currency conversion with exchange rates that don't divide evenly needs to display results accurately with repeat notation for regulatory compliance. Scientific calculators implement this to show precise rational number results. Spreadsheet applications converting between fraction and decimal formats need repeat detection for exact representation. The long division simulation teaches you about cycle detection in sequences, a fundamental technique that appears in detecting loops in linked lists, finding patterns in pseudo-random number generators, cryptographic analysis, and any algorithm processing sequential data where states might repeat. The hash map approach to cycle detection is a core algorithmic pattern.

## Examples

**Example 1:**
- Input: `numerator = 1, denominator = 2`
- Output: `"0.5"`

**Example 2:**
- Input: `numerator = 2, denominator = 1`
- Output: `"2"`

**Example 3:**
- Input: `numerator = 4, denominator = 333`
- Output: `"0.(012)"`

## Constraints

- -2³¹ <= numerator, denominator <= 2³¹ - 1
- denominator != 0

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Long Division Simulation</summary>

This is essentially performing long division manually. Compute the integer part first (numerator / denominator), then repeatedly multiply the remainder by 10 and divide to get each decimal digit. The challenge is detecting when the pattern repeats.

</details>

<details>
<summary>🎯 Hint 2: Detecting Cycles with Hash Map</summary>

A repeating decimal occurs when you encounter the same remainder twice during long division. Use a hash map to store each remainder and the position where it occurred. When you see a remainder you've seen before, you've found the start of the repeating cycle.

Map: remainder → position in result string

</details>

<details>
<summary>📝 Hint 3: Edge Cases and Sign Handling</summary>

Handle edge cases carefully:
1. Sign: Determine if result is negative (XOR of signs)
2. Zero: If numerator is 0, return "0"
3. Integer result: If remainder becomes 0, no repeating part
4. Overflow: Use long/64-bit integers to avoid overflow when computing

Pseudocode:
```
1. Handle sign and convert to positive values
2. Compute integer part
3. If no remainder, return integer part
4. Build decimal part:
   - Track remainders in map: remainder → position
   - For each step: remainder = (remainder * 10) % denominator
   - If remainder seen before, insert parentheses
   - If remainder is 0, done
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Generate All Digits) | O(∞) | O(∞) | May never terminate for repeating decimals |
| **Optimal (Hash Map Cycle Detection)** | **O(denominator)** | **O(denominator)** | At most denominator unique remainders |

## Common Mistakes

### 1. Integer Overflow

```python
# WRONG: Can overflow with 32-bit integers
def fractionToDecimal(numerator, denominator):
    remainder = numerator % denominator
    remainder *= 10  # May overflow!

# CORRECT: Use 64-bit integers or handle carefully
def fractionToDecimal(numerator, denominator):
    numerator = abs(numerator)
    denominator = abs(denominator)
    # Python handles big integers automatically
```

### 2. Not Handling Sign Correctly

```python
# WRONG: Incorrect sign handling
def fractionToDecimal(numerator, denominator):
    if numerator < 0 or denominator < 0:
        sign = "-"

# CORRECT: XOR logic for sign
def fractionToDecimal(numerator, denominator):
    sign = "-" if (numerator < 0) ^ (denominator < 0) else ""
    numerator = abs(numerator)
    denominator = abs(denominator)
```

### 3. Forgetting Integer-Only Results

```python
# WRONG: Always adds decimal point
def fractionToDecimal(numerator, denominator):
    result = str(numerator // denominator) + "."
    # ... always includes decimal

# CORRECT: Check if there's a remainder
def fractionToDecimal(numerator, denominator):
    integer_part = numerator // denominator
    remainder = numerator % denominator
    if remainder == 0:
        return str(integer_part)
```

### 4. Incorrect Parenthesis Placement

```python
# WRONG: Adds parentheses at wrong position
seen[remainder] = len(result)  # After adding digit

# CORRECT: Record position before adding
seen[remainder] = len(result)
result.append(str(digit))
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Fixed Precision | Show only N decimal places | Limit loop iterations |
| Scientific Notation | Return in scientific notation (e.g., 1.5e-3) | Calculate exponent separately |
| Base Conversion | Convert to different base (not base 10) | Adjust division base |
| Simplify First | Reduce fraction before converting | Use GCD to simplify numerator/denominator |

## Practice Checklist

- [ ] Handles empty/edge cases (zero, negative numbers, integer results)
- [ ] Can explain approach in 2 min (long division + hash map for cycle detection)
- [ ] Can code solution in 25 min
- [ ] Can discuss time/space complexity (O(d) time and space where d is denominator)
- [ ] Handles overflow and sign correctly

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Hash Map Pattern](../../strategies/patterns/hash-map.md)
