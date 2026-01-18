---
id: M007
old_id: F029
slug: divide-two-integers
title: Divide Two Integers
difficulty: medium
category: medium
topics: ["math", "bit-manipulation"]
patterns: ["bit-shifting", "exponential-search"]
estimated_time_minutes: 35
frequency: medium
related_problems: ["E013", "M050", "M166"]
prerequisites: ["bit-manipulation", "overflow-handling"]
strategy_ref: ../strategies/patterns/bit-manipulation.md
---
# Divide Two Integers

## Problem

Perform integer division of two numbers without using the multiplication (*), division (/), or modulo (%) operators. Given a dividend and divisor, return the quotient after truncating toward zero. For example, 10 divided by 3 gives 3 (the decimal 3.333... truncated). Division is fundamentally repeated subtraction: 10 ÷ 3 means "how many times can I subtract 3 from 10?" But naive subtraction is too slow for large numbers (imagine dividing 2 billion by 1). The key insight involves using bit manipulation to subtract larger chunks at once. Critical edge case: dividing -2³¹ by -1 would produce 2³¹, which exceeds the maximum 32-bit signed integer value. Handle sign combinations carefully: negative divided by negative is positive, but mixed signs produce negative results.

## Why This Matters

This problem mirrors how CPUs actually implement division when hardware dividers aren't available or are too slow. Embedded systems and microcontrollers often lack division instructions, requiring software implementations like this. Understanding bit shifting as multiplication/division by powers of two is fundamental to low-level programming and optimization. The overflow handling teaches you to think about integer limits, critical for writing robust financial or scientific software. This algorithmic approach (exponential search with bit shifting) appears in problems involving powers, logarithms, and binary search variations. Implementing arithmetic from first principles deepens your understanding of how high-level operations work under the hood. It's a challenging interview question that separates candidates who can only use built-in operators from those who understand how computers perform arithmetic. The problem tests bit manipulation skills, edge case handling, and the ability to optimize from O(n) to O(log²n).

## Examples

**Example 1:**
- Input: `dividend = 10, divisor = 3`
- Output: `3`
- Explanation: 10/3 = 3.33333.. which is truncated to 3.

**Example 2:**
- Input: `dividend = 7, divisor = -3`
- Output: `-2`
- Explanation: 7/-3 = -2.33333.. which is truncated to -2.

## Constraints

- -2³¹ <= dividend, divisor <= 2³¹ - 1
- divisor != 0

## Think About

1. How can you divide without using division, multiplication, or modulo?
2. What mathematical operation is division? (Hint: repeated subtraction)
3. How can bit shifting help you subtract larger multiples efficiently?
4. What edge cases involve integer overflow?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Division as repeated subtraction</summary>

Division is essentially counting how many times you can subtract the divisor from the dividend.

```
10 ÷ 3 = ?

10 - 3 = 7  (count: 1)
7 - 3 = 4   (count: 2)
4 - 3 = 1   (count: 3)
1 < 3, stop

Answer: 3
```

**The problem:** This takes O(n) time where n is the quotient. For `2^31 ÷ 1`, that's 2 billion iterations!

**Think about:**
- Can you subtract larger chunks at once?
- How can you efficiently find the largest multiple to subtract?

</details>

<details>
<summary>🎯 Hint 2: Exponential subtraction using bit shifts</summary>

Instead of subtracting `divisor` one at a time, subtract `divisor * 2^k` for the largest possible k.

**Key insight:** Left shift doubles a number:
- `3 << 1 = 6` (3 × 2)
- `3 << 2 = 12` (3 × 4)
- `3 << 3 = 24` (3 × 8)

```
43 ÷ 5 = ?

Step 1: Find largest power of 2
  5 << 0 = 5
  5 << 1 = 10
  5 << 2 = 20
  5 << 3 = 40  ✓ (largest ≤ 43)
  5 << 4 = 80  ✗ (too big)

Subtract: 43 - 40 = 3, quotient += 8 (2^3)

Step 2: Repeat with remainder
  3 < 5, stop

Answer: 8
```

This reduces time from O(n) to O(log²n).

</details>

<details>
<summary>📝 Hint 3: Handling edge cases and overflow</summary>

**Critical edge cases:**

1. **Integer overflow:** `-2^31 ÷ -1 = 2^31` (exceeds max int!)
   - Solution: Return `2^31 - 1` (max int value)

2. **Sign handling:** Track result sign separately
   - Positive ÷ Positive = Positive
   - Negative ÷ Negative = Positive
   - Mixed signs = Negative

3. **Working with negatives:** Convert to positive to avoid overflow
   - But `-2^31` can't be negated! (abs would overflow)
   - Solution: Work with negative numbers throughout, or use long

```python
def divide(dividend, divisor):
    # Handle overflow case
    if dividend == -2**31 and divisor == -1:
        return 2**31 - 1

    # Determine sign
    negative = (dividend < 0) != (divisor < 0)

    # Work with positive values (use long to avoid overflow)
    dividend, divisor = abs(dividend), abs(divisor)

    quotient = 0
    while dividend >= divisor:
        temp_divisor, multiple = divisor, 1
        # Find largest multiple
        while dividend >= (temp_divisor << 1):
            temp_divisor <<= 1
            multiple <<= 1
        # Subtract it
        dividend -= temp_divisor
        quotient += multiple

    return -quotient if negative else quotient
```

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Repeated subtraction | O(n) | O(1) | n = quotient, too slow for large numbers |
| **Exponential search (bit shifting)** | **O(log²n)** | **O(1)** | Optimal without forbidden operations |
| Long division simulation | O(log n) | O(1) | Complex implementation |

**Where n is the quotient value**

**Why exponential search wins:**
- O(log²n) time: Outer loop runs log(n) times, inner loop also log(n)
- O(1) space: Only uses a few variables
- No forbidden operations (×, ÷, %)
- Handles overflow correctly

**Time breakdown:**
- Outer loop: Runs until dividend < divisor, max log(n) iterations
- Inner loop: Finds largest power of 2, max log(n) iterations per outer loop
- Total: O(log n × log n) = O(log²n)

**Why not O(log n)?**
- We reset the inner search each time instead of continuing
- More optimal algorithms exist but are more complex

---

## Common Mistakes

### 1. Integer overflow on edge case
```python
# WRONG: Overflow when dividend = -2^31, divisor = -1
def divide(dividend, divisor):
    return dividend // divisor  # Forbidden operation!

# Also wrong: Negating MIN_INT
abs(-2147483648)  # Overflows! Can't represent +2147483648 in 32-bit int

# CORRECT: Handle this case explicitly
if dividend == -2**31 and divisor == -1:
    return 2**31 - 1  # Return max int
```

### 2. Incorrect bit shift logic
```python
# WRONG: Not finding the largest multiple
while temp_divisor <= dividend:
    temp_divisor <<= 1  # This goes one step too far!
quotient += multiple

# CORRECT: Check before shifting
while dividend >= (temp_divisor << 1):
    temp_divisor <<= 1
    multiple <<= 1
# Now temp_divisor is the largest valid multiple
```

### 3. Sign handling errors
```python
# WRONG: Sign logic error
negative = dividend < 0 or divisor < 0  # Should be XOR, not OR!

# CORRECT: XOR to detect different signs
negative = (dividend < 0) != (divisor < 0)
# or
negative = (dividend < 0) ^ (divisor < 0)
```

### 4. Not resetting the search
```python
# WRONG: Not resetting for next iteration
temp_divisor, multiple = divisor, 1
while dividend >= divisor:
    while dividend >= (temp_divisor << 1):
        temp_divisor <<= 1
        multiple <<= 1
    # Oops! temp_divisor keeps growing, never resets
    dividend -= temp_divisor
    quotient += multiple

# CORRECT: Reset inside outer loop
while dividend >= divisor:
    temp_divisor, multiple = divisor, 1  # Reset here!
    while dividend >= (temp_divisor << 1):
        temp_divisor <<= 1
        multiple <<= 1
    dividend -= temp_divisor
    quotient += multiple
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Allow multiplication** | Can use × | Simple: binary search or Newton's method |
| **Return remainder also** | Return quotient and remainder | Track remainder = dividend - (quotient × divisor) |
| **Floating point division** | Non-integer result | Continue subtracting fractional divisors |
| **Modulo operation** | Return remainder only | Subtract quotient × divisor from dividend |
| **Unsigned integers** | No negative numbers | Simpler, no sign handling needed |

**Return both quotient and remainder:**
```python
def divmod_custom(dividend, divisor):
    """Returns (quotient, remainder)"""
    # ... same logic to find quotient ...

    # Calculate remainder
    # remainder = dividend - (quotient * divisor)
    # But we can't use multiplication!

    # Alternative: Track it during subtraction
    quotient = 0
    original_dividend = dividend

    while dividend >= divisor:
        temp_divisor, multiple = divisor, 1
        while dividend >= (temp_divisor << 1):
            temp_divisor <<= 1
            multiple <<= 1
        dividend -= temp_divisor
        quotient += multiple

    remainder = dividend  # What's left is the remainder

    return (quotient, remainder)
```

---

## Visual Walkthrough

```
Example: 43 ÷ 5

Initial: dividend = 43, divisor = 5, quotient = 0

Iteration 1: Find largest multiple of 5 ≤ 43
  temp_divisor = 5, multiple = 1

  Check: 43 >= (5 << 1) = 10? Yes
    temp_divisor = 10, multiple = 2

  Check: 43 >= (10 << 1) = 20? Yes
    temp_divisor = 20, multiple = 4

  Check: 43 >= (20 << 1) = 40? Yes
    temp_divisor = 40, multiple = 8

  Check: 43 >= (40 << 1) = 80? No, stop

  Subtract: dividend = 43 - 40 = 3
  Add to quotient: quotient = 0 + 8 = 8

Iteration 2: Find largest multiple of 5 ≤ 3
  temp_divisor = 5, multiple = 1

  Check: 3 >= (5 << 1) = 10? No, stop immediately

  But 3 < 5, so we can't subtract at all
  Exit outer loop

Final: quotient = 8, remainder = 3
Result: 43 ÷ 5 = 8 remainder 3
```

**Edge case walkthrough: -2^31 ÷ -1**
```
dividend = -2147483648 (MIN_INT)
divisor = -1

Check overflow condition:
  dividend == -2^31 AND divisor == -1? YES

Return: 2^31 - 1 = 2147483647 (MAX_INT)

Why? Because:
  -2147483648 ÷ -1 = 2147483648
  But 2147483648 > MAX_INT (2147483647)
  So we clamp to MAX_INT
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles positive ÷ positive
- [ ] Handles negative ÷ negative
- [ ] Handles mixed signs
- [ ] Handles overflow case (-2^31 ÷ -1)
- [ ] Handles divisor = 1 and -1
- [ ] Handles dividend = 0

**Code Quality:**
- [ ] Clean bit shifting logic
- [ ] Proper sign handling (XOR)
- [ ] Overflow check at the start
- [ ] Resets temp_divisor in each iteration

**Interview Readiness:**
- [ ] Can explain why bit shifting works in 2 minutes
- [ ] Can code solution in 12 minutes
- [ ] Can discuss time complexity derivation
- [ ] Can handle "also return remainder" follow-up
- [ ] Can explain overflow edge case

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve with remainder variation
- [ ] Day 14: Explain bit shifting approach to someone
- [ ] Day 30: Quick review and edge case testing

---

**Strategy**: See [Bit Manipulation Pattern](../../strategies/patterns/bit-manipulation.md)
