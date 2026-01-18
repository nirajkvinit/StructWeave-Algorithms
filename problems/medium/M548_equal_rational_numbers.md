---
id: M548
old_id: A439
slug: equal-rational-numbers
title: Equal Rational Numbers
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Equal Rational Numbers

## Problem

Repeating decimals are fascinating: `1/6 = 0.16666...` goes on forever. Mathematicians write this as `0.1(6)`, where parentheses indicate the repeating part. Even more interesting: `0.9(9)` (0.999...) is mathematically equal to exactly `1.0`!

You're given two strings `s` and `t`, each representing a non-negative rational number using parentheses notation for repeating decimals. Your task is to determine if these two strings represent the same mathematical value.

**String format:**
Each number can have up to three parts:

1. **Integer part only:** `"12"`, `"0"`, `"123"`

2. **Integer + decimal (non-repeating):** `"0.5"`, `"1."`, `"2.12"`, `"123.0001"`

3. **Integer + decimal + repeating part:** `"0.1(6)"`, `"1.(9)"`, `"123.00(1212)"`

The repeating part in parentheses continues infinitely:
- `0.1(6)` means 0.16666...
- `0.(52)` means 0.525252...
- `1.(9)` means 1.999... which equals 2.0

**Important insight:** The same number can be written multiple ways:
- `1/6 = 0.1(6) = 0.16(6) = 0.166(6)`
- All represent the same value: 0.16666...

## Why This Matters

Handling repeating decimals correctly is crucial in financial systems where precise arithmetic matters—rounding errors can compound over millions of transactions. Scientific computing libraries must represent rational numbers exactly to avoid accumulated floating-point errors in long calculations. Database systems storing fractions (like ingredient ratios in recipe applications or financial ratios in accounting software) need to compare values for equality without precision loss. This problem teaches fundamental string parsing, mathematical representation, and the critical difference between approximate floating-point arithmetic and exact rational arithmetic. The techniques apply to building calculators, spreadsheet formula evaluators, computer algebra systems, and any system where "equal" must mean mathematically equal, not just "close enough."

## Examples

**Example 1:**
- Input: `s = "0.(52)", t = "0.5(25)"`
- Output: `true`
- Explanation: Both strings represent 0.525252... when expanded.

**Example 2:**
- Input: `s = "0.1666(6)", t = "0.166(66)"`
- Output: `true`

**Example 3:**
- Input: `s = "0.9(9)", t = "1."`
- Output: `true`
- Explanation: The repeating decimal 0.999... is mathematically equal to 1. The string "1." correctly represents 1 with IntegerPart = "1" and an empty NonRepeatingPart.

## Constraints

- Each part consists only of digits.
- The <IntegerPart> does not have leading zeros (except for the zero itself).
- 1 <= <IntegerPart>.length <= 4
- 0 <= <NonRepeatingPart>.length <= 4
- 1 <= <RepeatingPart>.length <= 4

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Convert both strings to their decimal representation with sufficient precision, then compare. The key challenge is handling repeating decimals - you need to expand the repeating part enough times to ensure accurate comparison. Since the repeating part has max length 4 and non-repeating part has max length 4, expanding the repeating portion ~20 times gives sufficient precision.
</details>

<details>
<summary>Main Approach</summary>
Parse each string to extract three parts: integer part, non-repeating decimal part, and repeating decimal part. Concatenate them: integer + "." + non_repeating + (repeating * k) where k is large enough (e.g., 20). Convert to float and compare with small epsilon tolerance, or use string comparison after normalizing to same length.
</details>

<details>
<summary>Optimization Tip</summary>
Instead of float comparison, work with string decimals expanded to the same precision (e.g., 20+ decimal places). This avoids floating-point precision issues. Alternatively, use Python's Fraction class to represent the rational number exactly: for repeating decimal 0.abc(def), the formula is (abc + def/999...) / 1000... where 999... has same length as repeating part.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| String Expansion | O(1) | O(1) | Fixed max length strings (max 4+4+4 chars), expansion is constant |
| Fraction Conversion | O(1) | O(1) | Convert to exact fraction representation and compare |
| Optimal | O(1) | O(1) | All operations bounded by small constant string lengths |

## Common Mistakes

1. **Using float comparison without tolerance**
   ```python
   # Wrong: Floating point precision errors
   def to_decimal(s):
       # ... parse and convert ...
       return float(result)
   return to_decimal(s) == to_decimal(t)

   # Correct: Use epsilon tolerance or exact fraction
   from fractions import Fraction
   return Fraction(to_fraction(s)) == Fraction(to_fraction(t))
   ```

2. **Not expanding repeating part enough times**
   ```python
   # Wrong: Only 2 repetitions may not be enough
   result = integer + "." + non_repeating + repeating * 2

   # Correct: Expand enough for precision
   result = integer + "." + non_repeating + repeating * 20
   ```

3. **Incorrect fraction formula for repeating decimals**
   ```python
   # Wrong: Treating 0.1(6) as 0.16/10
   value = (int(integer) + float("0." + non_rep + rep) / 10)

   # Correct: Use proper repeating decimal formula
   # 0.1(6) = 1/10 + 6/90 = (9+6)/90 = 15/90 = 1/6
   if repeating:
       nines = int('9' * len(repeating))
       zeros = int('0' * len(non_repeating)) if non_repeating else 0
       numerator = int(non_repeating + repeating) - int(non_repeating or 0)
       denominator = nines * (10 ** len(non_repeating))
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Fraction to Decimal | Medium | Convert fraction to string with repeating notation |
| Compare Version Numbers | Medium | String comparison with numeric segments |
| Valid Number | Hard | Parse and validate numeric strings |
| String to Integer (atoi) | Medium | Parse integer from string |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (no repeating part, no non-repeating part, 0.9(9)=1.0)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days
