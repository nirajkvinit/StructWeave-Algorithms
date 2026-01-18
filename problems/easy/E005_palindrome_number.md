---
id: E005
old_id: F009
slug: palindrome-number
title: Palindrome Number
difficulty: easy
category: easy
topics: ["math", "two-pointers"]
patterns: ["number-reversal", "digit-manipulation"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E007", "E234", "E125"]
prerequisites: ["math-basics", "modulo-division"]
---
# Palindrome Number

## Problem

Determine whether an integer is a palindrome without converting it to a string. A palindrome number reads the same forwards and backwards.

For example, `121` is a palindrome (reads as 121 from both directions), but `-121` is not (reads as -121 forward and 121- backward, which are different). Similarly, `10` is not a palindrome because reversed it becomes `01`, which equals 1, not 10.

The constraint is that you must solve this using only mathematical operations, without converting the integer to a string or array. This means you need to extract and compare digits using operations like modulo (%) and integer division (/).

A key insight: negative numbers are never palindromes because the minus sign only appears at the front, and numbers ending in zero (except zero itself) are never palindromes because leading zeros don't exist in integers.

## Why This Matters

This problem teaches fundamental number manipulation techniques using only mathematical operations. It develops:
- **Digit extraction**: Using modulo and division to process numbers
- **Space efficiency**: Solving without auxiliary data structures
- **Mathematical thinking**: Understanding number properties and symmetry

**Real-world applications:**
- Checksum validation in financial systems
- Data validation and error detection
- Pattern recognition in numerical analysis
- Embedded systems with memory constraints

## Examples

**Example 1:**
- Input: `x = 121`
- Output: `true`
- Explanation: 121 reads as 121 from left to right and from right to left.

**Example 2:**
- Input: `x = -121`
- Output: `false`
- Explanation: From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome.

**Example 3:**
- Input: `x = 10`
- Output: `false`
- Explanation: Reads 01 from right to left. Therefore it is not a palindrome.

## Constraints

- -2³¹ <= x <= 2³¹ - 1

## Think About

1. What makes negative numbers automatically not palindromes?
2. How can you extract individual digits from a number?
3. Do you need to reverse the entire number or just half of it?
4. How do you handle numbers ending in zero?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Quick eliminations</summary>

Before doing any computation, can you eliminate certain cases immediately?

**Think about:**
- Negative numbers: -121 becomes "121-" when reversed, so never palindromic
- Numbers ending in 0: 10 reversed is 01 = 1, not equal to 10 (except 0 itself)

These quick checks save computation time.

</details>

<details>
<summary>🎯 Hint 2: The half-reversal insight</summary>

You don't need to reverse the entire number. You only need to reverse **half** of it.

**Key insight:**
- For 12321: Compare first two digits (12) with last two reversed (21 reversed = 12)
- For 1221: Compare first two (12) with last two reversed (21 reversed = 12)

**How to extract digits:**
- Last digit: `x % 10`
- Remove last digit: `x = x / 10`
- Build reversed number: `reversed = reversed * 10 + digit`

**When to stop:** When the reversed half becomes >= the remaining original half.

</details>

<details>
<summary>📝 Hint 3: Half-reversal algorithm</summary>

```
function isPalindrome(x):
    # Special cases
    if x < 0 or (x % 10 == 0 and x != 0):
        return false

    reversed_half = 0

    # Reverse half the number
    while x > reversed_half:
        last_digit = x % 10
        reversed_half = reversed_half * 10 + last_digit
        x = x / 10

    # Even length: x == reversed_half (e.g., 1221: x=12, reversed=12)
    # Odd length: x == reversed_half / 10 (e.g., 12321: x=12, reversed=123)
    return x == reversed_half or x == reversed_half / 10
```

**Example trace for 12321:**
1. x=12321, reversed=0
2. x=1232, reversed=1 (extracted 1)
3. x=123, reversed=12 (extracted 2)
4. x=12, reversed=123 (extracted 3) → stop (x <= reversed)
5. Check: x(12) == reversed/10(12) → true

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| String Conversion | O(log n) | O(log n) | Violates constraint; easy to implement |
| Full Reversal | O(log n) | O(1) | Risk of overflow; processes all digits |
| **Half Reversal (Optimal)** | **O(log n)** | **O(1)** | No overflow risk; processes half digits |

**Why Half Reversal Wins:**
- Time: O(log n) - number of digits in the number
- Space: O(1) - only a few variables
- No overflow: Only reverses half the number
- Meets constraint: No string conversion

**Why log n?** A number with d digits has value ~10^d, so d = log₁₀(n).

---

## Common Mistakes

### 1. Not handling negative numbers
```
# WRONG: Doesn't handle negatives
if x == reverse(x):
    return True

# CORRECT: Check negative first
if x < 0:
    return False
```

### 2. Not handling numbers ending in zero
```
# WRONG: Thinks 10 might be palindrome
# (It's not: 10 reversed is 01 = 1)

# CORRECT: Special case for trailing zeros
if x % 10 == 0 and x != 0:
    return False
```

### 3. Integer overflow when reversing
```
# WRONG: Full reversal risks overflow
reversed = 0
temp = x
while temp > 0:
    reversed = reversed * 10 + temp % 10
    temp //= 10
# For large numbers, reversed might overflow!

# CORRECT: Only reverse half
while x > reversed:  # Stop at halfway point
    reversed = reversed * 10 + x % 10
    x //= 10
```

### 4. Wrong comparison for odd-length numbers
```
# WRONG: Only checks exact match
return x == reversed

# CORRECT: Handle both even and odd lengths
return x == reversed or x == reversed // 10
# Even: 1221 → x=12, reversed=12
# Odd: 12321 → x=12, reversed=123, need reversed//10
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **String conversion allowed** | Can use strings | Convert to string, compare with reverse |
| **Palindrome in any base** | Check base-k palindrome | Use base-k digit extraction |
| **Find next palindrome** | Return next palindromic number | Increment and check |
| **Count palindromes in range** | How many in [L, R]? | Iterate or use digit DP |
| **Largest palindrome product** | Product of two n-digit numbers | Generate palindromes, factor check |
| **Allow string conversion** | Removes math constraint | `return str(x) == str(x)[::-1]` |

**Variation: String conversion approach:**
```
def isPalindrome(x):
    if x < 0:
        return False
    s = str(x)
    return s == s[::-1]
```

**Variation: Full reversal (with overflow check):**
```
def isPalindrome(x):
    if x < 0 or (x % 10 == 0 and x != 0):
        return False

    original = x
    reversed = 0

    while x > 0:
        digit = x % 10
        # Check for overflow before multiplying
        if reversed > (2**31 - 1 - digit) // 10:
            return False  # Would overflow
        reversed = reversed * 10 + digit
        x //= 10

    return original == reversed
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles positive palindrome (Example 1: 121)
- [ ] Handles negative numbers (Example 2: -121)
- [ ] Handles numbers ending in 0 (Example 3: 10)
- [ ] Handles single digit (edge case: 0-9)
- [ ] No string conversion used

**Optimization:**
- [ ] Achieved O(log n) time
- [ ] Used O(1) space
- [ ] Only processes half the digits
- [ ] Avoids integer overflow

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 5 minutes
- [ ] Can explain why half-reversal works
- [ ] Can trace algorithm with examples
- [ ] Can discuss string vs math approaches

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve related problem (Reverse Integer)
- [ ] Day 14: Implement both approaches (string and math)
- [ ] Day 30: Quick review and complexity analysis

---

**Strategy**: See [Digit Manipulation](../../strategies/patterns/digit-manipulation.md) | [Math Fundamentals](../../strategies/fundamentals/math.md)
