---
id: E070
old_id: F171
slug: excel-sheet-column-number
title: Excel Sheet Column Number
difficulty: easy
category: easy
topics: ["string", "math"]
patterns: ["base-conversion"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E068", "E171", "M029"]
prerequisites: ["strings", "base-conversion", "math"]
strategy_ref: ../strategies/fundamentals/math-techniques.md
---
# Excel Sheet Column Number

## Problem

Convert an Excel column title to its corresponding column number. This is the reverse of problem E068.

**Excel column mapping:**
- A → 1, B → 2, ..., Z → 26
- AA → 27, AB → 28, ..., AZ → 52
- BA → 53, BB → 54, ..., ZZ → 702
- AAA → 703, ...

**The key insight:** Excel columns use a base-26 number system where A=1, B=2, ..., Z=26. Each position represents a power of 26, just like decimal uses powers of 10.

**Think of it like this:**
```
Decimal "123" = 1×10² + 2×10¹ + 3×10⁰ = 100 + 20 + 3 = 123

Excel "ZY" = 26×26¹ + 25×26⁰ = 26×26 + 25×1 = 676 + 25 = 701
             (Z=26)    (Y=25)
```

**Processing approach:**
```
For "AB":
- Start: result = 0
- See 'A' (value 1): result = 0×26 + 1 = 1
- See 'B' (value 2): result = 1×26 + 2 = 28
```

The algorithm processes left to right, multiplying the current result by 26 (shifting left one position in base-26) and adding the new digit's value.

## Why This Matters

This problem teaches **positional number system conversion** - understanding how different bases work beyond just base-10 (decimal) and base-2 (binary). The pattern appears in:
- **URL shorteners**: Converting base-62 strings to integers (A-Z, a-z, 0-9)
- **Custom ID systems**: Encoding sequential IDs with alphabetic characters
- **Data serialization**: Compact representation of numeric data
- **Spreadsheet software**: Any application using Excel-like column naming

Understanding base conversion is fundamental to computer science - it's how we represent numbers in binary, hexadecimal, and custom encoding schemes.

## Examples

**Example 1:**
- Input: `columnTitle = "A"`
- Output: `1`

**Example 2:**
- Input: `columnTitle = "AB"`
- Output: `28`

**Example 3:**
- Input: `columnTitle = "ZY"`
- Output: `701`

## Constraints

- 1 <= columnTitle.length <= 7
- columnTitle consists only of uppercase English letters.
- columnTitle is in the range ["A", "FXSHRXW"].

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Base-26 Number System</summary>

Excel columns work like a base-26 number system where:
- A = 1, B = 2, ..., Z = 26 (not 0-25!)
- AA = 27, AB = 28, ..., AZ = 52
- BA = 53, BB = 54, ..., ZZ = 702

Think about how we convert from other bases to decimal:
- Binary "101" = 1×2² + 0×2¹ + 1×2⁰ = 5
- Hexadecimal "1A" = 1×16¹ + 10×16⁰ = 26

Can you apply the same principle here with base-26?

</details>

<details>
<summary>🎯 Hint 2: Process from Left to Right</summary>

For a multi-character string like "ZY":
1. Start with result = 0
2. For each character from left to right:
   - Multiply current result by 26 (shift left in base-26)
   - Add the value of current character (A=1, B=2, ..., Z=26)

Example "ZY":
- Start: result = 0
- 'Z': result = 0×26 + 26 = 26
- 'Y': result = 26×26 + 25 = 676 + 25 = 701

The key insight: Each position represents a power of 26, just like decimal uses powers of 10.

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithm</summary>

```
1. Initialize result = 0
2. For each character in columnTitle (left to right):
   a. Get value of character: val = char - 'A' + 1
      ('A' = 1, 'B' = 2, ..., 'Z' = 26)
   b. Update result: result = result * 26 + val
3. Return result
```

Example walkthrough for "AB":
- 'A': result = 0×26 + 1 = 1
- 'B': result = 1×26 + 2 = 28

Example walkthrough for "ZY":
- 'Z': result = 0×26 + 26 = 26
- 'Y': result = 26×26 + 25 = 701

Time: O(n) where n is string length
Space: O(1)
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(26ⁿ) | O(1) | Generate all titles until match |
| **Base-26 Conversion** | **O(n)** | **O(1)** | Single pass through string, optimal |

## Common Mistakes

### 1. Using 0-Based Character Values
```python
# WRONG: Treating A as 0
result = 0
for char in columnTitle:
    result = result * 26 + (ord(char) - ord('A'))
# Gives A=0, B=1, but we need A=1, B=2

# CORRECT: Treating A as 1
result = 0
for char in columnTitle:
    result = result * 26 + (ord(char) - ord('A') + 1)
```

### 2. Processing Right to Left with Powers
```python
# WRONG (inefficient): Calculate powers explicitly
result = 0
n = len(columnTitle)
for i, char in enumerate(columnTitle):
    val = ord(char) - ord('A') + 1
    result += val * (26 ** (n - 1 - i))  # Expensive power calculation

# CORRECT: Process left to right, multiply as you go
result = 0
for char in columnTitle:
    result = result * 26 + (ord(char) - ord('A') + 1)
```

### 3. Integer Overflow (Language-Specific)
```python
# WRONG: Not considering overflow in languages with fixed integer size
# For very long strings, result could overflow

# CORRECT: In Python, integers are arbitrary precision
# In other languages, use long/BigInteger if needed
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Column Title from Number | Reverse problem (E068) | Use division and modulo with -1 adjustment |
| 0-indexed columns | A=0, B=1, etc. | Use standard base-26 without +1 |
| Different alphabet size | Use k letters instead of 26 | Change base from 26 to k |
| Case-insensitive | Accept lowercase | Convert to uppercase first |

## Practice Checklist

**Correctness:**
- [ ] Handles single letter (A-Z)
- [ ] Handles two letters (AA-ZZ)
- [ ] Handles maximum length (7 characters)
- [ ] Correctly computes A=1, Z=26
- [ ] Correctly computes AA=27, AB=28
- [ ] Handles ZY=701 example

**Interview Readiness:**
- [ ] Can explain base-26 conversion
- [ ] Can code solution in 5 minutes
- [ ] Can trace through example (ZY→701)
- [ ] Can explain difference from standard base conversion
- [ ] Can solve reverse problem (E068)

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve reverse problem (E068)
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Mathematical Techniques](../../strategies/fundamentals/math-techniques.md)
