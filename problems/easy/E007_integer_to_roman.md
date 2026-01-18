---
id: E007
old_id: F012
slug: integer-to-roman
title: Integer to Roman
difficulty: easy
category: easy
topics: ["math", "string"]
patterns: ["greedy", "lookup-table"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E008", "E004", "M015"]
prerequisites: ["greedy-algorithm", "string-building"]
strategy_ref: ../../strategies/patterns/greedy.md
---
# Integer to Roman

## Problem

Convert an integer in the range 1 to 3999 into its Roman numeral representation. Roman numerals use seven symbols: I=1, V=5, X=10, L=50, C=100, D=500, and M=1000.

Roman numerals are typically written from largest to smallest, left to right. However, there are special subtraction cases to avoid repeating a symbol more than three times: 4 is written as IV (5 minus 1, not IIII), 9 as IX (10 minus 1), 40 as XL (50 minus 10), 90 as XC, 400 as CD, and 900 as CM.

For example, 58 converts to "LVIII" (50 + 5 + 3), and 1994 converts to "MCMXCIV" (1000 + 900 + 90 + 4). The challenge is to build the Roman numeral representation by greedily using the largest possible values at each step, including the subtraction pairs.

## Why This Matters

This problem introduces the greedy algorithm pattern, where making the locally optimal choice at each step (using the largest symbol possible) leads to the globally optimal solution. Understanding when greedy algorithms work and when they don't is fundamental to algorithm design.

The problem also appears in real-world scenarios involving numeral system conversions, formatting utilities, and historical document processing. More importantly, it teaches you to work with lookup tables and systematic enumeration of cases, skills that apply to currency formatting, unit conversions, and configuration-based transformations in production systems.

## Examples

**Example 1:**
- Input: `num = 3`
- Output: `"III"`
- Explanation: 3 is represented as 3 ones.

**Example 2:**
- Input: `num = 58`
- Output: `"LVIII"`
- Explanation: L = 50, V = 5, III = 3.

**Example 3:**
- Input: `num = 1994`
- Output: `"MCMXCIV"`
- Explanation: M = 1000, CM = 900, XC = 90 and IV = 4.

## Constraints

- 1 <= num <= 3999

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Understand Roman Numeral Rules</summary>

Roman numerals use these symbols:
- I=1, V=5, X=10, L=50, C=100, D=500, M=1000

But there are also subtraction cases:
- IV=4, IX=9, XL=40, XC=90, CD=400, CM=900

How can you represent a number using the largest symbols possible? What does "greedy" mean in this context?

</details>

<details>
<summary>🎯 Hint 2: Greedy Symbol Selection</summary>

Create a mapping of all possible symbols (including subtraction cases) in descending order:
```
[(1000, 'M'), (900, 'CM'), (500, 'D'), (400, 'CD'),
 (100, 'C'), (90, 'XC'), (50, 'L'), (40, 'XL'),
 (10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'), (1, 'I')]
```

For each value-symbol pair (starting from largest):
- Use it as many times as possible while num >= value
- Subtract value from num and append symbol to result

Why does greedy work here? Because larger symbols always give optimal representation.

</details>

<details>
<summary>📝 Hint 3: Greedy Algorithm</summary>

**Pseudocode:**
```
1. Create value-symbol pairs in descending order:
   values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
   symbols = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"]

2. Initialize result = ""
3. For each (value, symbol) pair:
   a. While num >= value:
      - Append symbol to result
      - Subtract value from num
   b. If num == 0, break early
4. Return result
```

**Example trace for 1994:**
- 1994 >= 1000: "M", num = 994
- 994 >= 900: "MCM", num = 94
- 94 >= 90: "MCMXC", num = 4
- 4 >= 4: "MCMXCIV", num = 0

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| **Greedy with lookup** | **O(1)** | **O(1)** | Fixed 13 symbols, max ~15 chars |
| Recursive | O(1) | O(1) | Same constants, more overhead |
| Mathematical calculation | O(1) | O(1) | Calculate each digit separately |

Note: O(1) because input is bounded (1-3999), so max iterations is constant.

## Common Mistakes

### 1. Missing subtraction cases
```python
# WRONG: Only handles additive cases
values = [1000, 500, 100, 50, 10, 5, 1]
symbols = ["M", "D", "C", "L", "X", "V", "I"]
# This gives "DCCCCXCXCIV" for 1994 instead of "MCMXCIV"

# CORRECT: Include all subtraction pairs
values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
symbols = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"]
```

### 2. Using wrong order
```python
# WRONG: Not in descending order
values = [1, 5, 10, 50, 100, 500, 1000]
# This processes smaller values first, giving wrong results

# CORRECT: Descending order for greedy to work
values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
```

### 3. Not using all available symbols efficiently
```python
# WRONG: Building IV as "IIII"
if num >= 1:
    result += "I" * num  # Gives "IIII" for 4

# CORRECT: Use lookup table
count = num // value
result += symbol * count
num -= value * count
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Roman to Integer | Reverse conversion | See E008 problem |
| Extended range (5000+) | Larger numbers | Add more symbols (V̅=5000, etc.) |
| Validate Roman numeral | Check if string is valid | Add validation rules |
| Minimal symbols | Fewest characters | Already optimal with greedy |
| Old Roman style | No subtraction rule | Remove subtraction pairs from table |

## Practice Checklist

**Correctness:**
- [ ] Handles small numbers (1-9)
- [ ] Handles numbers with subtraction (4, 9, 40, 90, 400, 900)
- [ ] Handles large numbers (1000-3999)
- [ ] Handles edge cases (1, 3999)
- [ ] Returns correct format (string of Roman numerals)

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 8-10 minutes
- [ ] Can discuss complexity
- [ ] Can explain why greedy works
- [ ] Can list all 13 value-symbol pairs from memory

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Greedy Algorithms](../../strategies/patterns/greedy.md)
