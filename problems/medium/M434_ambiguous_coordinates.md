---
id: M434
old_id: A283
slug: ambiguous-coordinates
title: Ambiguous Coordinates
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
---
# Ambiguous Coordinates

## Problem

Imagine someone wrote down a 2D coordinate like `(1, 3)` or `(2, 0.5)`, then removed all the formatting by stripping out commas, decimal points, and spaces, leaving only the digits and parentheses. Given this compressed string, reconstruct all possible valid original coordinates.

For example, the string `"(123)"` could have originally been `(1, 23)`, `(12, 3)`, `(1.2, 3)`, or `(1, 2.3)`, among other possibilities. The string `"(205)"` might represent `(2, 0.5)`, `(20, 5)`, or `(2, 05)`. However, not all reconstructions are valid because coordinates must follow standard numeric formatting rules.

A valid coordinate number cannot have unnecessary leading zeros. This means `"00"`, `"01"`, `"001"`, or `"1.0"` are all invalid because they can be written with fewer digits (`"0"`, `"1"`, `"1"`, and `"1"` respectively). The only exception is the standalone `"0"`. Additionally, decimal numbers cannot start with a decimal point, so `.1` is invalid (must be `0.1`), and they cannot have trailing zeros, so `1.20` is invalid (must be `1.2`).

Your task is to try every possible way to split the digit string into two parts (x and y coordinates), then for each part, generate all valid number representations (with or without a decimal point), and combine them into formatted coordinate strings like `"(x, y)"` with exactly one space after the comma.

## Why This Matters

String parsing and validation problems are ubiquitous in data processing pipelines, API development, and input sanitization. This problem mirrors real scenarios like parsing malformed CSV data, reconstructing structured data from serialized formats, or validating user input against complex formatting rules. It teaches you to systematically enumerate possibilities (trying all split points and decimal positions) while applying multiple validation constraints simultaneously. The skills developed here apply directly to building parsers, validators, and data transformation tools in production systems.

## Examples

**Example 1:**
- Input: `s = "(123)"`
- Output: `["(1, 2.3)","(1, 23)","(1.2, 3)","(12, 3)"]`

**Example 2:**
- Input: `s = "(0123)"`
- Output: `["(0, 1.23)","(0, 12.3)","(0, 123)","(0.1, 2.3)","(0.1, 23)","(0.12, 3)"]`
- Explanation: Formats such as 0.0, 00, 0001, and 00.01 violate the validity rules.

**Example 3:**
- Input: `s = "(00011)"`
- Output: `["(0, 0.011)","(0.001, 1)"]`

## Constraints

- 4 <= s.length <= 12
- s[0] == '(' and s[s.length - 1] == ')'.
- The rest of s are digits.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
First, split the digit string into two parts (x and y coordinates). For each part, generate all valid number representations by trying to place a decimal point at different positions, respecting the rules about leading zeros and trailing zeros.
</details>

<details>
<summary>🎯 Main Approach</summary>
Try all possible split positions to divide digits into x and y coordinates. For each coordinate string, generate valid numbers: (1) the whole string as an integer (if no leading zeros except "0"), and (2) all decimal placements where the integer part has no leading zeros (except "0") and the fractional part has no trailing zeros.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Create a helper function that takes a digit string and returns all valid number representations. This separates concerns and makes the code cleaner. Validate each generated number against the rules: no leading zeros (except "0"), no trailing zeros after decimal, at least one digit before decimal.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Generate All Valid Numbers | O(n³) | O(n²) | n = string length, trying all splits and decimals |
| Optimal | O(n³) | O(n²) | Each position tried for split and decimal |

## Common Mistakes

1. **Allowing invalid leading zeros**
   ```python
   # Wrong: Accepting "01" or "001" as valid integers
   def is_valid(s):
       return True  # No validation

   # Correct: Reject leading zeros except for "0"
   def is_valid_integer(s):
       return s == "0" or (s[0] != '0')
   ```

2. **Allowing trailing zeros after decimal**
   ```python
   # Wrong: Accepting "1.20" or "0.100"
   valid_numbers.append(integer_part + '.' + fractional_part)

   # Correct: Reject trailing zeros in fractional part
   if fractional_part[-1] == '0':
       continue  # Skip this decimal placement
   ```

3. **Not handling edge cases for "0"**
   ```python
   # Wrong: Rejecting "0" or "0.5"
   if s[0] == '0':
       return []

   # Correct: Allow "0" as integer and "0.x" as decimal
   if s == "0":
       return ["0"]
   if s[0] == '0':
       # Only allow decimal form starting with "0."
       if len(s) > 1 and s[-1] != '0':
           return ["0." + s[1:]]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Restore IP Addresses | Medium | 4 parts with range constraints [0, 255] |
| Different Ways to Add Parentheses | Medium | Similar enumeration with operators |
| Valid Number | Hard | Complex validation rules for numbers |
| Decode Ways | Medium | Digit grouping with different constraints |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [String Processing](../../strategies/patterns/string-processing.md)
