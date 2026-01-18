---
id: E008
old_id: F013
slug: roman-to-integer
title: Roman to Integer
difficulty: easy
category: easy
topics: ["string", "hash-table"]
patterns: ["lookup-table", "string-parsing"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E007", "E001", "M015"]
prerequisites: ["hash-map", "string-traversal"]
strategy_ref: ../../strategies/data-structures/hash-table.md
---
# Roman to Integer

## Problem

Convert a Roman numeral string into its integer value. Roman numerals use seven symbols: I=1, V=5, X=10, L=50, C=100, D=500, and M=1000. The input is guaranteed to be a valid Roman numeral in the range 1 to 3999.

Roman numerals are usually additive: "III" equals 3 (1+1+1), and "LVIII" equals 58 (50+5+3). However, subtraction rules apply in specific cases: a smaller value before a larger value means subtraction. For example, "IV" equals 4 (5-1), "IX" equals 9 (10-1), "XL" equals 40 (50-10), "XC" equals 90 (100-10), "CD" equals 400 (500-100), and "CM" equals 900 (1000-100).

The key challenge is determining when to add versus subtract as you scan through the string. For example, "MCMXCIV" equals 1994: M(1000) + CM(900) + XC(90) + IV(4). You need to recognize that when C appears before M, you subtract C instead of adding it.

## Why This Matters

This problem teaches pattern recognition and decision-making based on context (the next character). It reinforces the concept of lookahead in parsing, where you need to check what's coming next to decide how to process the current element. This pattern appears in tokenizers, parsers, and state machines throughout computer science.

The problem also demonstrates the complementary nature of encoding and decoding operations. Understanding both directions (integer to Roman in problem E007, and Roman to integer here) deepens your grasp of how representations work and helps you verify correctness by testing round-trip conversions. These skills apply directly to data serialization, protocol implementations, and format conversions in real systems.

## Examples

**Example 1:**
- Input: `s = "III"`
- Output: `3`
- Explanation: III = 3.

**Example 2:**
- Input: `s = "LVIII"`
- Output: `58`
- Explanation: L = 50, V= 5, III = 3.

**Example 3:**
- Input: `s = "MCMXCIV"`
- Output: `1994`
- Explanation: M = 1000, CM = 900, XC = 90 and IV = 4.

## Constraints

- 1 <= s.length <= 15
- s contains only the characters ('I', 'V', 'X', 'L', 'C', 'D', 'M').
- It is **guaranteed** that s is a valid roman numeral in the range [1, 3999].

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Addition vs Subtraction Rule</summary>

Roman numerals are usually additive (III = 1+1+1 = 3), but sometimes use subtraction:
- IV = 5-1 = 4 (I before V)
- IX = 10-1 = 9 (I before X)
- XL = 50-10 = 40 (X before L)

How can you detect when to subtract vs add? Look at the relationship between current symbol and the next symbol.

</details>

<details>
<summary>🎯 Hint 2: Compare Adjacent Symbols</summary>

Create a hash map for symbol values:
```
{'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}
```

Traverse the string and for each character:
- If its value is less than the next character's value, subtract it
- Otherwise, add it

Example: "MCMXCIV"
- M(1000) >= C(100): add 1000
- C(100) < M(1000): subtract 100
- M(1000) >= X(10): add 1000
- ...continuing this pattern...

</details>

<details>
<summary>📝 Hint 3: Left-to-Right Algorithm</summary>

**Pseudocode:**
```
1. Create symbol-to-value map
2. Initialize result = 0
3. For i from 0 to length-1:
   a. current_value = map[s[i]]
   b. If i+1 < length and current_value < map[s[i+1]]:
      - result -= current_value  (subtraction case)
   c. Else:
      - result += current_value  (addition case)
4. Return result
```

**Alternative approach (right-to-left):**
```
1. Start from right, track previous value
2. If current < previous: subtract
3. Else: add
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| String replacement | O(n) | O(n) | Replace "IV"→"IIII", then sum |
| **Left-to-right scan** | **O(n)** | **O(1)** | Single pass with constant map |
| Right-to-left scan | O(n) | O(1) | Alternative direction |
| Two-character lookup | O(n) | O(1) | Check pairs like "IV", "IX" first |

## Common Mistakes

### 1. Not handling subtraction cases
```python
# WRONG: Only adds values
result = sum(map[char] for char in s)
# "IV" gives 1+5=6 instead of 4

# CORRECT: Check if next symbol is larger
for i in range(len(s)):
    if i+1 < len(s) and map[s[i]] < map[s[i+1]]:
        result -= map[s[i]]
    else:
        result += map[s[i]]
```

### 2. Double-counting subtraction cases
```python
# WRONG: Subtracts current and adds next, but continues to process next
if map[s[i]] < map[s[i+1]]:
    result += map[s[i+1]] - map[s[i]]
# When i moves to i+1, adds it again!

# CORRECT: Either subtract current OR use right-to-left approach
if i+1 < len(s) and map[s[i]] < map[s[i+1]]:
    result -= map[s[i]]
else:
    result += map[s[i]]
```

### 3. Index out of bounds
```python
# WRONG: Accessing s[i+1] without checking bounds
for i in range(len(s)):
    if map[s[i]] < map[s[i+1]]:  # Crashes on last character
        result -= map[s[i]]

# CORRECT: Check bounds first
for i in range(len(s)):
    if i+1 < len(s) and map[s[i]] < map[s[i+1]]:
        result -= map[s[i]]
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Integer to Roman | Reverse conversion | See E007 problem |
| Validate Roman numeral | Check if valid | Add rules: no more than 3 consecutive same symbols, valid subtraction pairs only |
| Extended Roman (5000+) | Larger numbers | Add symbols with overline (V̅=5000, X̅=10000) |
| Parse multiple Romans | Extract all from text | Use regex or scanning to find Roman patterns |
| Roman arithmetic | Add/subtract Romans directly | Convert, compute, convert back |

## Practice Checklist

**Correctness:**
- [ ] Handles single character ("V" = 5)
- [ ] Handles additive cases ("III" = 3)
- [ ] Handles subtraction cases ("IV" = 4, "IX" = 9)
- [ ] Handles complex numbers ("MCMXCIV" = 1994)
- [ ] Handles edge cases (smallest "I"=1, largest in range)

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 8-10 minutes
- [ ] Can discuss complexity
- [ ] Can explain subtraction rule clearly
- [ ] Can compare left-to-right vs right-to-left approaches

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Hash Table Patterns](../../strategies/data-structures/hash-table.md)
