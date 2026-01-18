---
id: E186
old_id: A004
slug: base-7
title: Base 7
difficulty: easy
category: easy
topics: ["math", "string"]
patterns: ["number-conversion", "iterative"]
estimated_time_minutes: 15
frequency: low
prerequisites: ["modulo-operation", "string-building", "negative-numbers"]
related_problems: ["E007", "E168", "M029"]
strategy_ref: ../strategies/fundamentals/mathematical-operations.md
---
# Base 7

## Problem

You're given an integer `num` in base 10 (our standard decimal system) and need to convert it to base 7, returning the result as a string. Base 7 is a numbering system that uses only the digits 0-6, where each position represents a power of 7 instead of a power of 10.

For example, the decimal number 100 equals "202" in base 7 because 100 = 2×7² + 0×7¹ + 2×7⁰ = 2×49 + 0×7 + 2×1 = 98 + 0 + 2 = 100. The conversion process involves repeatedly dividing by 7 and collecting remainders, which form the digits of the base-7 representation.

Your solution must handle both positive and negative numbers. For negative numbers, simply prepend a minus sign to the base-7 representation of the absolute value. Edge cases to consider include zero (which should return "0") and ensuring digits are collected in the correct order (from right to left, but displayed left to right).

## Why This Matters

Number base conversion is foundational to understanding how computers represent and manipulate data internally. While we think in base 10, computers operate in base 2 (binary), with frequent conversions to base 8 (octal), base 16 (hexadecimal), and occasionally other bases. Understanding the conversion algorithm teaches the relationship between division, modulo operations, and positional number systems—concepts critical for bitwise operations, encoding schemes, and low-level programming.

This problem also demonstrates an important pattern: extracting digits of a number in any base using repeated division and modulo. The same technique applies to checksums, digit manipulation puzzles, and parsing formatted numbers. In practical applications, base conversion appears in color code transformations (hex to RGB), encoding schemes (base64), hash visualizations, and legacy system interfaces that use unusual number representations. Mastering this builds intuition for how data representation works at a fundamental level, bridging the gap between mathematical theory and practical computation.

## Examples

**Example 1:**
- Input: `num = 100`
- Output: `"202"`

**Example 2:**
- Input: `num = -7`
- Output: `"-10"`

## Constraints

- -10⁷ <= num <= 10⁷

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Understanding Base Conversion
Consider how you normally convert numbers between bases. What mathematical operation extracts the rightmost digit in any base? Think about the relationship between division and modulo operations in base conversion.

### Hint 2: Building the Result
When converting to base 7, you repeatedly extract remainders. In what order do these remainders appear versus the final string? Should you build from left to right or right to left?

### Hint 3: Handling Edge Cases
How should you handle zero? How do you handle negative numbers differently from positive numbers? Should you process the sign separately or together with the digits?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Iterative Conversion | O(log₇(n)) | O(log₇(n)) | Number of iterations = digits in base 7 |
| String Reversal | O(log₇(n)) | O(log₇(n)) | Build backwards, then reverse |
| Recursive | O(log₇(n)) | O(log₇(n)) | Call stack depth equals number of digits |

## Common Mistakes

### Mistake 1: Incorrect handling of zero
```python
# Wrong: Returns empty string for zero
def convertBase7(num):
    if num == 0:
        return ""  # Should return "0"
    result = ""
    while num > 0:
        result = str(num % 7) + result
        num //= 7
    return result
```
**Why it's wrong**: Special case of zero must be handled explicitly. The while loop never executes when num is 0.

### Mistake 2: Sign handling after conversion
```python
# Wrong: Applies modulo to negative numbers
def convertBase7(num):
    result = ""
    while num != 0:
        result = str(num % 7) + result  # Negative % gives negative results
        num //= 7
    return result
```
**Why it's wrong**: In many languages, modulo of negative numbers produces negative remainders. Process the absolute value and prepend the sign afterward.

### Mistake 3: Building string in wrong order
```python
# Inefficient: Appending instead of prepending
def convertBase7(num):
    result = ""
    while num > 0:
        result += str(num % 7)  # Builds backwards
        num //= 7
    return result  # Missing reversal
```
**Why it's wrong**: Digits are extracted from least significant to most significant, so appending creates reversed output. Either prepend during construction or reverse at the end.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Convert to Any Base | Easy | Generalize to convert to any base 2-36 |
| Base Conversion (String to Int) | Easy | Convert base-7 string back to decimal |
| Base Conversion Between Any Bases | Medium | Convert from base A to base B directly |
| Negative Bases | Medium | Convert to negative bases like base -2 |
| Fractional Base Conversion | Hard | Handle decimal points in base conversion |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve with iterative approach (handle sign separately)
- [ ] Handle edge cases (0, negative numbers, single digit)
- [ ] Test with extreme values (-10⁷, 10⁷)

**After 1 Day**
- [ ] Implement without looking at previous solution
- [ ] Optimize space if using string reversal
- [ ] Can you explain the algorithm to someone?

**After 1 Week**
- [ ] Solve in under 10 minutes
- [ ] Implement recursive solution
- [ ] Generalize to convert to any base

**After 1 Month**
- [ ] Solve one variation problem
- [ ] Teach the concept to someone else
- [ ] Apply pattern to similar conversion problems

## Strategy

**Pattern**: Number Conversion
**Key Insight**: Repeatedly divide by the target base and collect remainders in reverse order.

See [Mathematical Operations](../strategies/fundamentals/mathematical-operations.md) for more on number manipulation techniques.
