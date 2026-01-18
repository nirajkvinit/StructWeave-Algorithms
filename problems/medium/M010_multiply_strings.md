---
id: M010
old_id: F043
slug: multiply-strings
title: Multiply Strings
difficulty: medium
category: medium
topics: ["string", "math", "simulation"]
patterns: ["digit-by-digit-processing"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M001", "E030", "M066"]
prerequisites: ["string-manipulation", "basic-arithmetic"]
strategy_ref: ../strategies/fundamentals/math-operations.md
---

# Multiply Strings

## Problem

You're given two non-negative integers represented as strings, and you need to return their product as a string. The catch? You cannot use built-in BigInteger libraries or convert the strings directly to integers using standard parsing functions. This forces you to implement multiplication from scratch, simulating the grade-school algorithm: multiply each digit of the first number by each digit of the second, keeping track of carries and position offsets. For instance, multiplying "123" by "56" involves computing 123×6 and 123×5 (shifted one position left), then adding them together to get "6888". Important insight: the product of an m-digit number and an n-digit number has at most m+n digits, so you can preallocate an array of that size. Handling carries correctly and avoiding leading zeros in the output are key challenges. Edge cases include multiplying by "0" and handling numbers of vastly different lengths.

```
Example visualization:
  123
×  56
-----
  738  (123 × 6)
 615   (123 × 5, shifted left)
-----
 6888
```

## Why This Matters

This is exactly how programming languages implement arbitrary-precision arithmetic when numbers exceed native integer sizes. Java's BigInteger, Python's unlimited integers, and financial libraries all use variants of this digit-by-digit approach. Cryptographic systems like RSA require multiplying numbers with hundreds or thousands of digits, making efficient implementation critical for security. Financial applications need exact decimal arithmetic to avoid floating-point errors that could cost millions in trading systems or billing errors. Understanding positional number systems and carry propagation is fundamental to computer arithmetic and number theory. This problem teaches you to work with data in non-native formats, a skill applicable to custom encodings, packed data structures, and network protocols. The position-mapping technique (digit at position i times digit at position j contributes to positions i+j and i+j+1) is an elegant insight that simplifies implementation. It's a medium-frequency interview question that tests your ability to simulate algorithms precisely and handle edge cases like zero and carry overflow.

## Examples

**Example 1:**
- Input: `num1 = "2", num2 = "3"`
- Output: `"6"`

**Example 2:**
- Input: `num1 = "123", num2 = "456"`
- Output: `"56088"`
- Explanation: 123 × 456 = 56,088

**Example 3:**
- Input: `num1 = "999", num2 = "999"`
- Output: `"998001"`
- Explanation: 999 × 999 = 998,001

## Constraints

- 1 <= num1.length, num2.length <= 200
- num1 and num2 consist of digits only.
- Both num1 and num2 do not contain any leading zero, except the number 0 itself.

## Think About

1. How do you multiply numbers by hand? Can you simulate that process?
2. What's the maximum length of the product given input lengths m and n?
3. How do you handle carries across multiple positions?
4. Can you avoid string reversal operations?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Length of the product</summary>

When multiplying two numbers:
- `num1` with m digits
- `num2` with n digits

The product has **at most m + n digits**.

```
Examples:
99 × 99 = 9801        (2 + 2 = 4 digits, but result is 4 digits)
10 × 10 = 100         (2 + 2 = 4 digits, but result is 3 digits)
999 × 999 = 998001    (3 + 3 = 6 digits)
```

**Key insight:** Create a result array of size `m + n` to hold all possible digits.

**Think about:** Why is m + n the upper bound? Can the product ever be longer?

</details>

<details>
<summary>🎯 Hint 2: Position mapping</summary>

When you multiply digit at position `i` in num1 by digit at position `j` in num2, the result contributes to positions `i + j` and `i + j + 1` in the product.

```
Indexes (from right, 0-based):
  num1:  1 2 3   (indices: 2,1,0)
  num2:  5 6     (indices: 1,0)

  3 (i=0) × 6 (j=0) → contributes to positions [0, 1]
  3 (i=0) × 5 (j=1) → contributes to positions [1, 2]
  2 (i=1) × 6 (j=0) → contributes to positions [1, 2]
  2 (i=1) × 5 (j=1) → contributes to positions [2, 3]
  1 (i=2) × 6 (j=0) → contributes to positions [2, 3]
  1 (i=2) × 5 (j=1) → contributes to positions [3, 4]
```

**Position formula:**
- High digit position: `i + j`
- Low digit position: `i + j + 1`

</details>

<details>
<summary>📝 Hint 3: Multiplication algorithm</summary>

```
def multiply(num1, num2):
    if num1 == "0" or num2 == "0":
        return "0"

    m, n = len(num1), len(num2)
    result = [0] * (m + n)

    # Process from right to left (least significant first)
    for i in range(m - 1, -1, -1):
        for j in range(n - 1, -1, -1):
            # Multiply single digits
            digit1 = int(num1[i])
            digit2 = int(num2[j])
            product = digit1 * digit2

            # Positions in result array
            pos_low = i + j + 1
            pos_high = i + j

            # Add to existing value (accumulate)
            total = product + result[pos_low]

            # Update positions with carry
            result[pos_low] = total % 10
            result[pos_high] += total // 10

    # Convert to string, skip leading zeros
    result_str = ''.join(map(str, result))
    return result_str.lstrip('0') or '0'
```

**Key steps:**
1. Create result array of size m+n
2. Multiply each digit pair, accumulate at correct positions
3. Handle carries as you go
4. Convert to string, remove leading zeros

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **Grade-school multiplication** | **O(m × n)** | **O(m + n)** | Simple, direct simulation |
| Karatsuba algorithm | O(n^1.58) | O(n) | Faster for very large numbers |
| FFT-based multiplication | O(n log n) | O(n) | Optimal but complex to implement |

**Why grade-school wins:**
- Simple to implement and understand
- No overhead for small/medium inputs
- Sufficient for constraint m, n ≤ 200

**Time breakdown:**
- Outer loop: m iterations
- Inner loop: n iterations
- Each iteration: O(1) work
- Total: O(m × n)

**Space breakdown:**
- Result array: O(m + n)
- Variables: O(1)
- No recursion stack

---

## Common Mistakes

### 1. Forgetting to handle "0" input
```python
# WRONG: Returns "" or "00" for zero input
def multiply(num1, num2):
    # ... multiplication logic ...
    return result.lstrip('0')  # Empty string if all zeros!

# CORRECT: Early return for zero
def multiply(num1, num2):
    if num1 == "0" or num2 == "0":
        return "0"
    # ... rest of logic ...
```

### 2. Incorrect position calculation
```python
# WRONG: Off-by-one errors
for i in range(m):
    for j in range(n):
        pos = i + j  # Missing the +1 for low position

# CORRECT: Two positions (high and low)
for i in range(m - 1, -1, -1):
    for j in range(n - 1, -1, -1):
        pos_high = i + j
        pos_low = i + j + 1
```

### 3. Not accumulating previous values
```python
# WRONG: Overwrites previous products
result[pos] = digit1 * digit2

# CORRECT: Add to existing value
total = digit1 * digit2 + result[pos_low]
result[pos_low] = total % 10
result[pos_high] += total // 10
```

### 4. Leading zeros not handled
```python
# WRONG: Returns "0056088" for 123 × 456
result_str = ''.join(map(str, result))
return result_str

# CORRECT: Strip leading zeros
result_str = ''.join(map(str, result))
return result_str.lstrip('0') or '0'  # or '0' handles all-zero case
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Add two strings** | Addition instead | Simpler: single pass with carry |
| **Subtract strings** | Subtraction | Handle borrow, ensure num1 >= num2 |
| **Divide strings** | Division | Use long division algorithm |
| **Power of string** | num1^num2 | Repeated multiplication or fast exponentiation |
| **Factorial as string** | n! | Multiply 1×2×3×...×n using string multiplication |

**String addition variation:**
```python
def addStrings(num1, num2):
    i, j = len(num1) - 1, len(num2) - 1
    carry = 0
    result = []

    while i >= 0 or j >= 0 or carry:
        digit1 = int(num1[i]) if i >= 0 else 0
        digit2 = int(num2[j]) if j >= 0 else 0

        total = digit1 + digit2 + carry
        result.append(str(total % 10))
        carry = total // 10

        i -= 1
        j -= 1

    return ''.join(reversed(result))
```

---

## Visual Walkthrough

```
Multiply "123" × "56"

Step 1: Initialize result array
  Indices:  [0] [1] [2] [3] [4]
  Result:   [ 0   0   0   0   0 ]  (size = 3 + 2 = 5)

Step 2: Process each digit pair

i=2, j=1: num1[2]='3', num2[1]='6'
  product = 3 × 6 = 18
  pos_low = 2+1+1 = 4, pos_high = 2+1 = 3
  result[4] = 18 % 10 = 8
  result[3] += 18 // 10 = 1
  Result: [0, 0, 0, 1, 8]

i=2, j=0: num1[2]='3', num2[0]='5'
  product = 3 × 5 = 15
  pos_low = 2+0+1 = 3, pos_high = 2+0 = 2
  total = 15 + result[3] = 15 + 1 = 16
  result[3] = 16 % 10 = 6
  result[2] += 16 // 10 = 1
  Result: [0, 0, 1, 6, 8]

i=1, j=1: num1[1]='2', num2[1]='6'
  product = 2 × 6 = 12
  pos_low = 1+1+1 = 3, pos_high = 1+1 = 2
  total = 12 + result[3] = 12 + 6 = 18
  result[3] = 18 % 10 = 8
  result[2] += 18 // 10 = 1 → result[2] = 2
  Result: [0, 0, 2, 8, 8]

i=1, j=0: num1[1]='2', num2[0]='5'
  product = 2 × 5 = 10
  pos_low = 1+0+1 = 2, pos_high = 1+0 = 1
  total = 10 + result[2] = 10 + 2 = 12
  result[2] = 12 % 10 = 2
  result[1] += 12 // 10 = 1
  Result: [0, 1, 2, 8, 8]

i=0, j=1: num1[0]='1', num2[1]='6'
  product = 1 × 6 = 6
  pos_low = 0+1+1 = 2, pos_high = 0+1 = 1
  total = 6 + result[2] = 6 + 2 = 8
  result[2] = 8 % 10 = 8
  result[1] += 8 // 10 = 0 → result[1] = 1
  Result: [0, 1, 8, 8, 8]

i=0, j=0: num1[0]='1', num2[0]='5'
  product = 1 × 5 = 5
  pos_low = 0+0+1 = 1, pos_high = 0+0 = 0
  total = 5 + result[1] = 5 + 1 = 6
  result[1] = 6 % 10 = 6
  result[0] += 6 // 10 = 0
  Result: [0, 6, 8, 8, 8]

Step 3: Convert to string
  "06888" → lstrip('0') → "6888"
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles single digit numbers
- [ ] Handles numbers with different lengths
- [ ] Handles "0" as input (returns "0")
- [ ] No leading zeros in output
- [ ] Large numbers (200 digits)

**Code Quality:**
- [ ] Correct result array size (m + n)
- [ ] Proper position calculation (i+j and i+j+1)
- [ ] Accumulates values correctly (doesn't overwrite)
- [ ] Clean carry propagation

**Interview Readiness:**
- [ ] Can explain grade-school multiplication in 2 minutes
- [ ] Can code solution in 15 minutes
- [ ] Can discuss time/space complexity
- [ ] Can handle addition/subtraction variations

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement string addition variation
- [ ] Day 14: Explain position mapping clearly
- [ ] Day 30: Compare with Karatsuba algorithm

---

**Strategy**: See [Math Operations Pattern](../../strategies/fundamentals/math-operations.md)
