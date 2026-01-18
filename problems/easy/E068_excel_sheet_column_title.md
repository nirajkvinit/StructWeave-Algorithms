---
id: E068
old_id: F168
slug: excel-sheet-column-title
title: Excel Sheet Column Title
difficulty: easy
category: easy
topics: ["math", "string"]
patterns: ["base-conversion"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E070", "E171", "M029"]
prerequisites: ["modulo-arithmetic", "base-conversion"]
strategy_ref: ../strategies/fundamentals/math-techniques.md
---
# Excel Sheet Column Title

## Problem

Convert a positive integer to its corresponding Excel column title. Excel columns use the naming scheme:
- A, B, C, ..., Z (columns 1-26)
- AA, AB, AC, ..., AZ (columns 27-52)
- BA, BB, BC, ..., ZZ (columns 53-702)
- AAA, AAB, ... (columns 703+)

Given an integer `columnNumber`, return the Excel column title.

**The tricky part:** This looks like a base-26 number system, but it's NOT standard base conversion. Here's why:
- Standard base-26 uses digits 0-25
- Excel uses "digits" A-Z representing 1-26 (no zero!)

This means standard base conversion fails. For example:
- Number 26 should give "Z" (not "BA" or "10")
- Number 52 should give "AZ" (not "B0")

**The key insight:** Before taking the modulo operation, subtract 1 from the number to convert from Excel's 1-indexed system to a 0-indexed system that standard base conversion expects.

**Example conversions:**
```
1 → A
26 → Z (not BA!)
27 → AA
28 → AB
701 → ZY
```

## Why This Matters

This problem teaches **base conversion with a twist** - handling 1-indexed numbering systems. The core concept appears in:
- **Bijective base-k numeration**: Number systems without a zero digit
- **Custom encoding schemes**: Creating compact identifiers (like URL shorteners)
- **Spreadsheet implementations**: Any system mimicking Excel/Google Sheets column naming
- **ID generation**: Creating human-readable sequential IDs

The pattern of "adjust by 1 before modulo" is a fundamental trick for converting between 0-indexed and 1-indexed systems, appearing throughout algorithmic problem-solving.

## Examples

**Example 1:**
- Input: `columnNumber = 1`
- Output: `"A"`

**Example 2:**
- Input: `columnNumber = 28`
- Output: `"AB"`

**Example 3:**
- Input: `columnNumber = 701`
- Output: `"ZY"`

## Constraints

- 1 <= columnNumber <= 2³¹ - 1

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: It's Like Base Conversion, But Different</summary>

This looks like converting from base-10 to base-26, but there's a twist:
- Regular base-26 uses digits 0-25
- Excel uses "digits" A-Z (representing 1-26, not 0-25!)

There's **no zero** in Excel columns. This is the key insight.

Think about: What happens when you convert 26? In regular base-26 with 0-indexed, it would be "10". But Excel expects "Z" (not "AZ"). How do you handle this edge case?

</details>

<details>
<summary>🎯 Hint 2: Adjust Before Dividing</summary>

The problem with standard base conversion:
- 26 % 26 = 0, which would map to... nothing (or need special handling)
- We want 26 to map to 'Z'

The trick: Subtract 1 from the number before taking modulo:
- `(26 - 1) % 26 = 25` → maps to 'Z'
- `(27 - 1) % 26 = 0` → maps to 'A' (for "AA")

After getting the character, divide by 26 (integer division) to continue.

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithm</summary>

```
1. Initialize result = empty string
2. While columnNumber > 0:
   a. Adjust: columnNumber -= 1  (convert from 1-indexed to 0-indexed)
   b. Get character: char = 'A' + (columnNumber % 26)
   c. Prepend char to result (or append and reverse at end)
   d. Move to next digit: columnNumber = columnNumber // 26
3. Return result
```

Example walkthrough for 701:
- 701-1=700, 700%26=24 ('Y'), 700//26=26
- 26-1=25, 25%26=25 ('Z'), 25//26=0
- Result: "ZY"

Time: O(log₂₆ n), Space: O(log₂₆ n) for result string
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n) | O(n) | Count from 1, generate each title |
| **Base-26 Conversion** | **O(log n)** | **O(log n)** | Logarithmic in input size, optimal |

## Common Mistakes

### 1. Treating It Like Standard Base Conversion
```python
# WRONG: Standard base-26 (0-indexed)
result = ""
while columnNumber > 0:
    result = chr(ord('A') + columnNumber % 26) + result
    columnNumber //= 26
# Fails for 26: gives 'AA' instead of 'Z'

# CORRECT: Adjust for 1-indexed system
result = ""
while columnNumber > 0:
    columnNumber -= 1  # Key adjustment!
    result = chr(ord('A') + columnNumber % 26) + result
    columnNumber //= 26
```

### 2. Off-by-One in Character Mapping
```python
# WRONG: Incorrect mapping
char = chr(columnNumber % 26)  # Maps to wrong ASCII range

# CORRECT: Map to A-Z
char = chr(ord('A') + (columnNumber - 1) % 26)
```

### 3. Not Handling Multiples of 26
```python
# WRONG: Special case for 26
if columnNumber == 26:
    return "Z"
# This doesn't scale to 52, 78, etc.

# CORRECT: The -1 adjustment handles all multiples naturally
columnNumber -= 1
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Column Number from Title | Reverse problem (E070) | Parse string, multiply by 26 powers |
| 0-indexed columns | Start from A=0 | Use standard base-26 conversion |
| Different alphabet size | Use base-k instead of 26 | Change modulo and division base |
| Row+Column to cell | Given row and column | Combine row number + this algorithm |

## Practice Checklist

**Correctness:**
- [ ] Handles single letter (1-26)
- [ ] Handles two letters (27-702)
- [ ] Handles three letters (703+)
- [ ] Correctly handles multiples of 26 (26→Z, 52→AZ, etc.)
- [ ] Handles maximum input (2³¹-1)
- [ ] Builds string in correct order

**Interview Readiness:**
- [ ] Can explain why standard base conversion fails
- [ ] Can explain the -1 adjustment
- [ ] Can code solution in 8 minutes
- [ ] Can trace through example (701→ZY)
- [ ] Can solve reverse problem (E070)

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve reverse problem (E070)
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Mathematical Techniques](../../strategies/fundamentals/math-techniques.md)
