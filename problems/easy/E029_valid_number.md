---
id: E029
old_id: F065
slug: valid-number
title: Valid Number
difficulty: easy
category: easy
topics: ["string", "state-machine"]
patterns: ["finite-automaton"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E008", "E065", "M227"]
prerequisites: ["strings", "state-machines"]
strategy_ref: ../../strategies/patterns/state-machine.md
---
# Valid Number

## Problem

Given a string, determine whether it represents a valid numeric value. The string may represent an integer (like "123" or "-456"), a decimal number (like "0.5" or "-.3"), or a number in scientific notation (like "1e10" or "-2.5E-3").

A valid number follows these rules: It can optionally start with a sign (+ or -), followed by one or more digits and/or a decimal point, and optionally followed by an exponent marker (e or E) with an optional sign and required digits. However, there are important constraints: you must have at least one digit before or after a decimal point (so "." alone is invalid), and if an exponent is present, it must be followed by at least one digit.

Examples of valid numbers include: "2", "0.1", "1.", ".5", "3.14", "-90.5", "53.5e93", "-123.456e-789". Examples of invalid strings include: "abc", "e", ".", "1a", "1e", "--6", "+.", "99e2.5".

Your task is to write a function that returns true if the string represents a valid number, and false otherwise.

## Why This Matters

Number validation is a critical component of parsers, compilers, and data validation systems. This problem teaches you how to implement a finite state machine, which is fundamental to building robust text parsers and validators.

In real-world systems, you encounter this in JSON parsers (validating numeric fields), CSV file importers (validating data columns), form validation (checking user input), and configuration file readers. Understanding the state machine approach prepares you for building more complex parsers and understanding how programming language compilers work.

This problem is also a classic interview question that tests your ability to handle complex conditional logic systematically, rather than with a tangled mess of if-statements.

## Examples

**Example 1:**
- Input: `s = "0"`
- Output: `true`

**Example 2:**
- Input: `s = "e"`
- Output: `false`

**Example 3:**
- Input: `s = "."`
- Output: `false`

## Constraints

- 1 <= s.length <= 20
- s consists of only English letters (both uppercase and lowercase), digits (0-9), plus '+', minus '-', or dot '.'.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding Valid Number Formats</summary>

A valid number can be:
- Integer: "123", "-456", "+789"
- Decimal: "123.45", ".5", "5.", "-.5"
- Scientific: "1e10", "1.5e-3", "-2E+5"

What are the rules? You can have:
- Optional sign at start
- Digits before decimal, after decimal, or both (but at least one)
- Optional 'e'/'E' followed by optional sign and required digits

Key question: What makes ".e1" invalid but "1.e1" valid?

</details>

<details>
<summary>🎯 Hint 2: State Machine Approach</summary>

Model this as a finite state machine with states like:
- Start
- Sign seen
- Digit seen
- Decimal point seen
- Exponent seen
- Exponent sign seen
- Final (valid)

Each character transitions you between states. Some states are accepting (valid end states), others are not.

Think: What characters are valid from each state? When is a transition invalid?

</details>

<details>
<summary>📝 Hint 3: Flag-Based Algorithm</summary>

```
Track these flags while scanning:
- seen_digit: Have we seen at least one digit?
- seen_dot: Have we seen a decimal point?
- seen_exponent: Have we seen 'e' or 'E'?
- seen_digit_after_e: Digits after exponent?

For each character:
1. Digit (0-9):
   - Set seen_digit = true
   - If after exponent: seen_digit_after_e = true

2. Sign (+/-):
   - Valid only at start OR right after 'e'/'E'

3. Decimal point (.):
   - Can't have seen_dot or seen_exponent before
   - Set seen_dot = true

4. Exponent (e/E):
   - Must have seen_digit before
   - Can't have seen_exponent before
   - Set seen_exponent = true
   - Reset seen_digit tracking for exponent part

5. Other: Return false

Final check:
- Return seen_digit AND (if seen_exponent, must have seen_digit_after_e)
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Regex | O(n) | O(1) | Pattern: `^[+-]?((\d+\.?\d*)|(\.\d+))([eE][+-]?\d+)?$` |
| **Flag-Based** | **O(n)** | **O(1)** | Single pass with boolean flags |
| State Machine | O(n) | O(1) | Explicit state transitions |

## Common Mistakes

### 1. Not Validating Decimal Point Rules
```python
# WRONG: Allowing multiple dots or dot after exponent
if char == '.':
    seen_dot = True

# CORRECT: Check conditions
if char == '.':
    if seen_dot or seen_exponent:
        return False
    seen_dot = True
```

### 2. Forgetting Exponent Must Have Digits
```python
# WRONG: Not checking for digits after 'e'
if char == 'e' or char == 'E':
    if not seen_digit:
        return False
    seen_exponent = True
# "1e" would pass but should fail!

# CORRECT: Track digits after exponent
# At the end, verify:
if seen_exponent and not seen_digit_after_e:
    return False
```

### 3. Mishandling Sign Position
```python
# WRONG: Allowing sign anywhere
if char in ['+', '-']:
    continue  # Too permissive!

# CORRECT: Sign only valid at start or after 'e'
if char in ['+', '-']:
    if i > 0 and s[i-1] not in ['e', 'E']:
        return False
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Valid IPv4 Address | Different format rules | Check for 4 parts separated by '.', each 0-255 |
| Valid Hexadecimal | Allow 0-9, A-F | Modify character validation |
| Parse Number | Extract numeric value | Use similar validation + conversion logic |

## Practice Checklist

**Correctness:**
- [ ] Handles integers ("123", "-5")
- [ ] Handles decimals ("1.5", ".5", "5.")
- [ ] Handles scientific notation ("1e10", "1.5e-3")
- [ ] Rejects invalid formats ("e", ".", "1.2.3", "1e")
- [ ] Handles signs correctly
- [ ] Returns correct boolean

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 15 minutes
- [ ] Can discuss complexity
- [ ] Can list all valid number formats

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement state machine version
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [State Machine](../../strategies/patterns/state-machine.md)
