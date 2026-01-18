---
id: E004
old_id: F008
slug: string-to-integer-atoi
title: String to Integer (atoi)
difficulty: easy
category: easy
topics: ["string", "parsing"]
patterns: ["state-machine", "string-parsing"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E003", "E007", "E008"]
prerequisites: ["string-traversal", "overflow-handling", "ascii-values"]
strategy_ref: ../../strategies/patterns/string-parsing.md
---
# String to Integer (atoi)

## Problem

Implement a function similar to the C standard library's `atoi` function, which converts a string to a 32-bit signed integer. The function must handle several cases in sequence: leading whitespace, an optional sign (+ or -), numeric digits, and overflow clamping.

The conversion algorithm works as follows:
1. Skip any leading whitespace characters (spaces)
2. Check for an optional sign: exactly one '+' or '-' (or neither)
3. Read digits one at a time, building the integer value
4. Stop immediately upon encountering the first non-digit character
5. If the resulting value exceeds the 32-bit range, clamp it to the valid range

For example, "   -42" returns -42 (whitespace ignored, sign preserved). The string "4193 with words" returns 4193 (stops at the space). The string "words and 987" returns 0 (no leading digits found). If overflow occurs, return 2,147,483,647 for positive overflow or -2,147,483,648 for negative overflow.

Edge cases include multiple consecutive signs ("+-42" is invalid, stop at second sign), signs after whitespace ("  +  413" reads + then stops at the space), and strings starting with non-digit, non-sign characters.

## Why This Matters

This problem simulates parsing behavior found in compilers, interpreters, and data validation systems. It teaches state machine design, where the parser transitions through distinct states (skipping whitespace, reading sign, reading digits, stopped) based on the current character. Understanding how to process input character by character with clear rules for transitions is fundamental to building parsers, validators, and text processing pipelines.

The problem also reinforces overflow detection and input sanitization, critical skills for writing secure systems that accept user input. Real-world applications include configuration file parsing, command-line argument processing, and form validation in web applications.

## Examples

**Example 1:**
- Input: `s = "42"`
- Output: `42`
- Explanation: The underlined characters are what is read in, the caret is the current reader position.
Step 1: "42" (no characters read because there is no leading whitespace)
         ^
Step 2: "42" (no characters read because there is neither a '-' nor '+')
         ^
Step 3: "42" ("42" is read in)
           ^
The parsed integer is 42.
Since 42 is in the range [-2³¹, 2³¹ - 1], the final result is 42.

**Example 2:**
- Input: `s = "   -42"`
- Output: `-42`
- Explanation: Step 1: "   -42" (leading whitespace is read and ignored)
            ^
Step 2: "   -42" ('-' is read, so the result should be negative)
             ^
Step 3: "   -42" ("42" is read in)
               ^
The parsed integer is -42.
Since -42 is in the range [-2³¹, 2³¹ - 1], the final result is -42.

**Example 3:**
- Input: `s = "4193 with words"`
- Output: `4193`
- Explanation: Step 1: "4193 with words" (no characters read because there is no leading whitespace)
         ^
Step 2: "4193 with words" (no characters read because there is neither a '-' nor '+')
         ^
Step 3: "4193 with words" ("4193" is read in; reading stops because the next character is a non-digit)
             ^
The parsed integer is 4193.
Since 4193 is in the range [-2³¹, 2³¹ - 1], the final result is 4193.

## Constraints

- 0 <= s.length <= 200
- s consists of English letters (lower-case and upper-case), digits (0-9), ' ', '+', '-', and '.'.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: State Machine Thinking</summary>

This problem is about parsing a string with multiple rules. Think of it as a state machine with different states:
- Skipping whitespace
- Reading optional sign
- Reading digits
- Stopping (when non-digit encountered)

What conditions cause transitions between these states?

</details>

<details>
<summary>🎯 Hint 2: Sequential Processing</summary>

Process the string in order with these steps:
1. Skip all leading whitespaces
2. Check for an optional '+' or '-' sign (only one!)
3. Read digits and build the number
4. Stop at the first non-digit character
5. Handle overflow by clamping to 32-bit range

Key insight: Once you start reading digits, you can't go back to read more signs. Once you hit a non-digit, stop completely.

</details>

<details>
<summary>📝 Hint 3: Implementation Algorithm</summary>

**Pseudocode:**
```
1. Initialize: index = 0, sign = 1, result = 0
2. Skip whitespace:
   - While s[index] == ' ': index++
3. Check sign:
   - If s[index] == '-': sign = -1, index++
   - Else if s[index] == '+': index++
4. Build number:
   - While index < length and s[index] is digit:
     a. digit = int(s[index])
     b. Check overflow before updating:
        - If result > MAX_INT/10 or (result == MAX_INT/10 and digit > 7):
          return MAX_INT if sign == 1 else MIN_INT
     c. result = result * 10 + digit
     d. index++
5. Return sign * result
```

**Constants:** MAX_INT = 2³¹ - 1 = 2147483647, MIN_INT = -2³¹ = -2147483648

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| **Sequential Parsing** | **O(n)** | **O(1)** | Single pass through string |
| Regex + Conversion | O(n) | O(n) | Pattern matching overhead |

## Common Mistakes

### 1. Not handling multiple signs correctly
```python
# WRONG: Allows "+-42" or "--42"
for char in s:
    if char == '+' or char == '-':
        sign = -1 if char == '-' else 1

# CORRECT: Only one sign allowed, at specific position
# Skip whitespace first
# Then check for exactly one sign
if s[index] == '-':
    sign = -1
    index += 1
elif s[index] == '+':
    index += 1
```

### 2. Reading digits after encountering non-digit
```python
# WRONG: Continues after hitting non-digit
for char in s:
    if char.isdigit():
        result = result * 10 + int(char)

# CORRECT: Stop immediately at first non-digit
while index < len(s) and s[index].isdigit():
    result = result * 10 + int(s[index])
    index += 1
# Once we break, we're done
```

### 3. Incorrect overflow handling
```python
# WRONG: Checks after overflow happened
result = result * 10 + digit
if result > 2**31 - 1:
    return 2**31 - 1

# CORRECT: Check before operation
if result > (2**31 - 1) // 10:
    return 2**31 - 1 if sign == 1 else -2**31
if result == (2**31 - 1) // 10 and digit > 7:
    return 2**31 - 1 if sign == 1 else -2**31
```

### 4. Not trimming leading whitespace correctly
```python
# WRONG: Only removes one space
if s[0] == ' ':
    s = s[1:]

# CORRECT: Remove all leading spaces
index = 0
while index < len(s) and s[index] == ' ':
    index += 1
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Return 0 on invalid input | No partial parsing | Add validation flag |
| Parse floating point | Handle decimal point | Track decimal position, fractional part |
| Parse hex/octal | Different base | Check prefix (0x, 0o), use different base |
| Allow scientific notation | Handle 'e' or 'E' | Parse exponent separately |
| Multiple numbers in string | Extract all numbers | Continue parsing after first number |

## Practice Checklist

**Correctness:**
- [ ] Handles empty string
- [ ] Handles only whitespace
- [ ] Handles positive/negative numbers
- [ ] Handles no sign
- [ ] Handles words after number
- [ ] Handles overflow (clamps correctly)
- [ ] Handles leading zeros

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 12-15 minutes
- [ ] Can discuss complexity
- [ ] Can identify all edge cases
- [ ] Can explain state transitions

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [String Parsing Patterns](../../strategies/patterns/string-parsing.md)
