---
id: E003
old_id: F007
slug: reverse-integer
title: Reverse Integer
difficulty: easy
category: easy
topics: ["math", "overflow-handling"]
patterns: ["digit-manipulation"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E001", "E004", "E008"]
prerequisites: ["modulo-operator", "integer-overflow", "signed-integers"]
strategy_ref: ../../strategies/fundamentals/overflow-handling.md
---
# Reverse Integer

## Problem

Given a 32-bit signed integer, reverse its digits and return the result. If reversing the digits causes the value to overflow beyond the 32-bit signed integer range, return 0 instead.

For example, `123` becomes `321`, and `-123` becomes `-321`. Note that trailing zeros disappear when reversed: `120` becomes `21` (not `021`). The 32-bit signed integer range is from -2,147,483,648 to 2,147,483,647. If reversing produces a number outside this range, like reversing `1,463,847,412` to `2,147,483,641` (which exceeds the maximum), you must return 0.

The challenge is to handle the reversal and overflow detection without converting to a string and without using data types larger than 32 bits. This means you need to detect potential overflow before it actually happens during the digit-by-digit reconstruction.

## Why This Matters

This problem teaches digit manipulation using mathematical operations (modulo and division) rather than string conversion, a fundamental skill for low-level programming and systems that don't support dynamic types. It also introduces overflow detection, a critical concern in languages like C, C++, and Java where integer overflow can cause silent bugs or security vulnerabilities.

Learning to check for overflow before performing an operation, rather than after, is essential for writing robust code in memory-constrained environments, embedded systems, and performance-critical applications where you cannot afford the overhead of larger data types or exception handling.

## Examples

**Example 1:**
- Input: `x = 123`
- Output: `321`

**Example 2:**
- Input: `x = -123`
- Output: `-321`

**Example 3:**
- Input: `x = 120`
- Output: `21`

## Constraints

- -2³¹ <= x <= 2³¹ - 1

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Extract Digits</summary>

How do you extract individual digits from a number? Think about what mathematical operations give you:
- The last digit of a number
- The number without its last digit

Can you build the reversed number one digit at a time?

</details>

<details>
<summary>🎯 Hint 2: Build in Reverse with Overflow Check</summary>

You can extract digits using modulo (%) to get the last digit and division (/) to remove it. Build the result by multiplying by 10 and adding the new digit.

**Key challenge:** Before adding the next digit, how do you check if the result will overflow? Think about the maximum/minimum 32-bit integer values: 2³¹ - 1 = 2147483647 and -2³¹ = -2147483648.

</details>

<details>
<summary>📝 Hint 3: Overflow Detection Algorithm</summary>

**Pseudocode:**
```
1. Initialize result = 0
2. While x != 0:
   a. Extract last digit: digit = x % 10
   b. Check overflow BEFORE updating result:
      - If result > MAX_INT / 10, will overflow
      - If result == MAX_INT / 10 and digit > 7, will overflow
      - Apply similar check for negative overflow
   c. Update result: result = result * 10 + digit
   d. Remove last digit: x = x / 10
3. Return result
```

**Alternative approach:** Use a larger data type (like long/int64) to detect overflow after the fact.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| String conversion | O(log n) | O(log n) | Convert to string, reverse, convert back |
| **Mathematical (digit extraction)** | **O(log n)** | **O(1)** | Extract d digits where d = log₁₀(n) |

## Common Mistakes

### 1. Not handling overflow correctly
```python
# WRONG: Checking after overflow already happened
result = result * 10 + digit
if result > 2**31 - 1:
    return 0

# CORRECT: Check before overflow
if result > (2**31 - 1) // 10:
    return 0
if result == (2**31 - 1) // 10 and digit > 7:
    return 0
result = result * 10 + digit
```

### 2. Not preserving sign correctly
```python
# WRONG: Loses sign information
x = abs(x)
# ... reverse logic ...
return result

# CORRECT: Handle sign separately or use signed modulo
sign = -1 if x < 0 else 1
x = abs(x)
# ... reverse logic ...
return sign * result
```

### 3. Using string conversion without considering overflow
```python
# WRONG: String approach doesn't naturally handle overflow
reversed_str = str(x)[::-1]
return int(reversed_str)  # Might overflow

# CORRECT: Check bounds after conversion
reversed_str = str(abs(x))[::-1]
result = int(reversed_str)
if result > 2**31 - 1:
    return 0
return result if x > 0 else -result
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| No overflow constraint | Can use any integer size | Skip overflow checks |
| Return -1 on overflow | Different sentinel value | Change return value |
| Reverse only even digits | Conditional digit inclusion | Add filter when extracting digits |
| 64-bit integers | Larger range | Adjust overflow constants |
| Preserve leading zeros | "120" → "021" | Use string approach |

## Practice Checklist

**Correctness:**
- [ ] Handles positive numbers
- [ ] Handles negative numbers
- [ ] Handles numbers ending in zero
- [ ] Handles overflow (returns 0)
- [ ] Handles edge case x = 0

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 8-10 minutes
- [ ] Can discuss complexity
- [ ] Can explain overflow detection logic
- [ ] Can compare mathematical vs string approach

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Overflow Handling](../../strategies/fundamentals/overflow-handling.md)
