---
id: F013
euler_id: 36
slug: double-base-palindromes
title: Double-base Palindromes
difficulty: foundation
topics: ["math", "palindromes", "base-conversion"]
patterns: []
estimated_time_minutes: 15
prerequisites: ["programming-basics"]
---

# Double-base Palindromes

## Problem

Find the sum of all numbers below a given limit n that are palindromic in both base 10 (decimal) and base 2 (binary). A palindrome reads the same forwards and backwards.

For example:
- 585 in decimal is "585" (palindrome ✓)
- 585 in binary is "1001001001" (palindrome ✓)
- Therefore, 585 is a double-base palindrome

Important: Palindromes in either base cannot have leading zeros. This means all valid binary palindromes represent odd numbers (since they must start and end with 1).

## Why This Matters

This problem combines string manipulation with number system fundamentals, reinforcing the concept that numbers are abstract quantities while their representations vary across bases.

Understanding base conversion is essential for:
- **Computer Science**: Binary, hexadecimal, and octal are fundamental to low-level programming, bit manipulation, and memory addressing
- **Cryptography**: Many algorithms rely on modular arithmetic and base transformations
- **Data Encoding**: URLs, Base64 encoding, and color codes use different bases

Palindrome checking is a common string operation with applications beyond recreational mathematics:
- **DNA Sequence Analysis**: Finding palindromic sequences (important for restriction enzymes)
- **Data Validation**: Credit card numbers, ISBNs, and identifiers often use palindromic or symmetric properties
- **Pattern Recognition**: Detecting symmetry in data structures

The constraint that binary palindromes can't have leading zeros provides a mathematical insight: all double-base palindromes must be odd (since binary representation must start and end with 1).

## Examples

**Example 1:**

- Input: `n = 10`
- Output: `25`
- Explanation: Double-base palindromes below 10 are 1, 3, 5, 7, 9. Sum = 1+3+5+7+9 = 25

**Example 2:**

- Input: `n = 1000000`
- Output: `872187`
- Explanation: Sum of all double-base palindromes below one million

**Example 3 (verification):**

- Input: `number = 585`
- Output: `true`
- Explanation:
  - Decimal: 585 → "585" (palindrome ✓)
  - Binary: 585 → "1001001001" (palindrome ✓)

## Constraints

- 1 <= n <= 10^6
- Leading zeros are not allowed in either base
- Single-digit numbers (1-9) are valid palindromes

## Think About

1. How do you convert a number to binary representation?
2. What's the simplest way to check if a string is a palindrome?
3. Why must all double-base palindromes be odd numbers?
4. Should you iterate through all numbers or only odd numbers?

---

## Approach Hints

<details>
<summary>Hint 1: Binary Conversion</summary>

Most languages provide built-in binary conversion:

**Python:**
```python
binary_string = bin(585)      # Returns '0b1001001001'
binary_string = bin(585)[2:]  # Remove '0b' prefix → '1001001001'

# OR
binary_string = format(585, 'b')  # Returns '1001001001' directly
```

**JavaScript:**
```javascript
let binary = (585).toString(2);  // '1001001001'
```

**Java:**
```java
String binary = Integer.toBinaryString(585);  // "1001001001"
```

</details>

<details>
<summary>Hint 2: Palindrome Checking</summary>

The simplest palindrome check compares a string with its reverse:

**Python:**
```python
def is_palindrome(s):
    return s == s[::-1]
```

**Two-pointer approach (any language):**
```python
def is_palindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        if s[left] != s[right]:
            return False
        left += 1
        right -= 1
    return True
```

</details>

<details>
<summary>Hint 3: Complete Algorithm</summary>

```
result = 0

for number from 1 to n-1:
    # Convert to decimal string
    decimal_str = str(number)

    # Convert to binary string (without '0b' prefix)
    binary_str = bin(number)[2:]  # or format(number, 'b')

    # Check if both are palindromes
    if is_palindrome(decimal_str) and is_palindrome(binary_str):
        result += number

return result
```

**Optimization:** Since binary palindromes can't have leading zeros, they must start and end with 1, meaning all double-base palindromes are odd. Iterate only through odd numbers:

```
for number in range(1, n, 2):  # Step by 2 (odd numbers only)
    ...
```

This halves the search space.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Check All Numbers | O(n × log n) | O(log n) | Check every number; log n for string length |
| Odd Numbers Only | O(n/2 × log n) | O(log n) | Skip even numbers (optimization) |
| Optimal | O(n × log n) | O(log n) | Binary conversion dominates |

**Breakdown:**
- Iterate through n numbers: O(n)
- Each number has ~log n digits in decimal and binary
- Palindrome check per base: O(log n)
- Total: O(n × log n)

**Space:**
- Storing decimal string: O(log₁₀ n)
- Storing binary string: O(log₂ n)
- Both are O(log n)

---

## Key Concept

**Base Conversion and Palindrome Checking**

A number is an abstract quantity; its representation depends on the base (radix) used:

- **Decimal (base 10)**: 585 = 5×10² + 8×10¹ + 5×10⁰
- **Binary (base 2)**: 1001001001₂ = 1×2⁹ + 0×2⁸ + ... + 1×2⁰

**Converting to binary:**
Repeatedly divide by 2 and collect remainders (or use built-in functions).

**Palindrome property:**
A string is a palindrome if it equals its reverse. The constraint "no leading zeros" in binary means:
- Binary representation must start with 1
- For palindrome, must also end with 1
- Therefore, the number is odd

This insight allows us to skip all even numbers, reducing search space by 50%.

**String reversal techniques:**
1. Built-in reverse: `s[::-1]` (Python)
2. Two-pointer scan: Compare s[0] with s[n-1], s[1] with s[n-2], etc.

---

## Common Mistakes

1. **Forgetting to remove '0b' prefix**: Python's `bin()` returns strings like '0b1001001001'. Strip the prefix with `[2:]` or use `format(n, 'b')`.

2. **Including even numbers**: Binary palindromes without leading zeros must be odd. Optimize by checking only odd numbers.

3. **Off-by-one error**: "Below n" means checking numbers from 1 to n-1, not 1 to n.

4. **Treating 0 as valid**: Zero is technically '0' in both bases (palindrome), but usually excluded by the range [1, n).

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Triple-base palindromes | Add base 8 or 16 | Convert to octal/hex, check palindrome in all bases |
| Largest such number | Find maximum only | Track max during iteration instead of summing |
| Count only | Return count, not sum | Increment counter instead of summing values |
| Check single number | Given n, is it double-base palindrome? | Convert to both bases, check both |
| Different base pairs | E.g., base 3 and base 7 | Implement custom base conversion |

---

## Practice Checklist

**Correctness:**

- [ ] Handles small inputs (n=10, sum=25)
- [ ] Handles large inputs (n=1000000)
- [ ] Correctly strips binary prefix ('0b')
- [ ] Uses correct range (1 to n-1)

**Understanding:**

- [ ] Can explain why double-base palindromes are odd
- [ ] Understands base conversion concept
- [ ] Can implement palindrome check from scratch
- [ ] Knows the time complexity and why

**Mastery:**

- [ ] Solved without hints
- [ ] Optimized to check only odd numbers
- [ ] Can explain binary representation
- [ ] Can handle variations (different bases)

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Explain base conversion to someone
- [ ] Day 14: Implement triple-base variation

---

**Euler Reference:** [Problem 36](https://projecteuler.net/problem=36)

**Next Step:** After mastering this, try [F014: Champernowne's Constant](F014_champernownes_constant.md)
