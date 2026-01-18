---
id: E031
old_id: F067
slug: add-binary
title: Add Binary
difficulty: easy
category: easy
topics: ["string", "math", "bit-manipulation"]
patterns: ["carry-simulation"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E002", "E066", "E415"]
prerequisites: ["strings", "binary-arithmetic"]
strategy_ref: ../../strategies/fundamentals/string-manipulation.md
---
# Add Binary

## Problem

Given two binary strings (strings containing only '0' and '1' characters), compute their sum and return the result as a binary string. The input strings represent non-negative integers in base-2 (binary) notation, and neither string contains leading zeros except for the number zero itself.

For example, adding the binary strings "11" (which is 3 in decimal) and "1" (which is 1 in decimal) should produce "100" (which is 4 in decimal). The challenge is to perform this addition without converting to decimal, instead simulating the digit-by-digit addition process similar to how you would add numbers by hand.

In binary addition, the rules are simpler than decimal: 0+0=0, 0+1=1, 1+0=1, and 1+1=10 (which means write 0 and carry 1). You need to handle strings of different lengths and manage the carry that propagates from right to left. After processing both strings completely, there might still be a remaining carry that becomes the leftmost digit of the result.

The strings can be quite long (up to 10,000 characters each), so an efficient digit-by-digit approach is necessary.

## Why This Matters

Binary arithmetic is fundamental to computer science since computers operate on binary numbers at the hardware level. This problem teaches you how to implement arithmetic operations when you can't rely on built-in conversion functions, which is essential for understanding how CPUs perform calculations and how to implement arbitrary-precision arithmetic.

Real-world applications include implementing BigInteger libraries (used in cryptography for handling enormous numbers), building computer architecture simulators, creating custom numeric types for specialized hardware, and understanding how overflow and carry flags work in assembly language programming.

The carry propagation pattern you learn here extends to adding numbers in any base and appears in problems involving linked lists and digit manipulation.

## Examples

**Example 1:**
- Input: `a = "11", b = "1"`
- Output: `"100"`

**Example 2:**
- Input: `a = "1010", b = "1011"`
- Output: `"10101"`

## Constraints

- 1 <= a.length, b.length <= 10⁴
- a and b consist only of '0' or '1' characters.
- Each string does not contain leading zeros except for the zero itself.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Simulating Addition by Hand</summary>

Think about how you add numbers by hand - you start from the rightmost digit and work left, carrying over when the sum exceeds the base. Binary addition is simpler: 0+0=0, 0+1=1, 1+1=10 (carry 1).

Key insight: How do you handle strings of different lengths? What happens when you reach the end of the shorter string?

</details>

<details>
<summary>🎯 Hint 2: Working Backwards with Carry</summary>

Start from the rightmost characters of both strings and work backwards. Keep track of:
- Current position in each string
- Carry value (0 or 1)
- Result being built

At each step: sum = digit_from_a + digit_from_b + carry

Think: When do you stop? What if there's still a carry after processing both strings?

</details>

<details>
<summary>📝 Hint 3: Implementation Algorithm</summary>

```
Algorithm:
1. Initialize:
   - i = len(a) - 1, j = len(b) - 1
   - carry = 0
   - result = []

2. While i >= 0 OR j >= 0 OR carry > 0:
   - digit_a = int(a[i]) if i >= 0 else 0
   - digit_b = int(b[j]) if j >= 0 else 0
   - total = digit_a + digit_b + carry
   - result.append(str(total % 2))  # Binary digit
   - carry = total // 2              # Carry for next iteration
   - i--, j--

3. Reverse result and join to string

Example: a="11", b="1"
Step 1: 1+1+0=2 → digit=0, carry=1
Step 2: 1+0+1=2 → digit=0, carry=1
Step 3: 0+0+1=1 → digit=1, carry=0
Result: [0,0,1] → "100"
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Convert to Int | O(n + m) | O(max(n,m)) | May overflow for large inputs |
| **Bitwise** | **O(max(n,m))** | **O(max(n,m))** | Simulate addition, no overflow risk |
| Built-in Functions | O(n + m) | O(max(n,m)) | Using bin() and int() conversions |

## Common Mistakes

### 1. Not Handling Different Lengths
```python
# WRONG: Assumes both strings same length
for i in range(len(a)-1, -1, -1):
    sum = int(a[i]) + int(b[i]) + carry  # Fails if b shorter!

# CORRECT: Handle different lengths
i, j = len(a)-1, len(b)-1
while i >= 0 or j >= 0 or carry:
    digit_a = int(a[i]) if i >= 0 else 0
    digit_b = int(b[j]) if j >= 0 else 0
    # ...
```

### 2. Forgetting Final Carry
```python
# WRONG: Stop when both strings exhausted
while i >= 0 or j >= 0:
    # process digits
# If carry=1 here, it's lost!

# CORRECT: Continue while carry exists
while i >= 0 or j >= 0 or carry:
    # process digits
```

### 3. Building Result in Wrong Order
```python
# WRONG: Appending creates reversed result
result = ""
while ...:
    result += str(digit)  # "001" instead of "100"

# CORRECT: Build reversed then reverse back
result = []
while ...:
    result.append(str(digit))
return ''.join(reversed(result))
# OR prepend: result = str(digit) + result (less efficient)
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Add Two Numbers (Linked List) | Input as linked lists | Same carry logic, different data structure |
| Multiply Strings | Multiplication instead of addition | Use grade-school multiplication algorithm |
| Add Hexadecimal | Base 16 instead of 2 | Change modulo to 16, handle A-F digits |

## Practice Checklist

**Correctness:**
- [ ] Handles same length strings
- [ ] Handles different length strings
- [ ] Handles carry propagation
- [ ] Handles final carry (e.g., "1" + "1" = "10")
- [ ] Returns correct string format
- [ ] No leading zeros in result

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 15 minutes
- [ ] Can discuss complexity
- [ ] Can explain binary addition rules

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations (multiply strings)
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [String Manipulation](../../strategies/fundamentals/string-manipulation.md)
