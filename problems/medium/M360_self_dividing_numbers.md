---
id: M360
old_id: A195
slug: self-dividing-numbers
title: Self Dividing Numbers
difficulty: medium
category: medium
topics: ["math"]
patterns: ["digit-manipulation"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E009", "M007", "M258"]
prerequisites: ["modulo-operation", "digit-extraction"]
---
# Self Dividing Numbers

## Problem

A **self-dividing number** is a number that is evenly divisible by each of its own digits. For example, 128 is self-dividing because:
- 128 ÷ 1 = 128 (no remainder)
- 128 ÷ 2 = 64 (no remainder)
- 128 ÷ 8 = 16 (no remainder)

Similarly, single-digit numbers like 5 are self-dividing because 5 ÷ 5 = 1 with no remainder.

There's one important edge case: any number containing the digit 0 cannot be self-dividing, because division by zero is undefined. So 102 is automatically disqualified because it contains a 0, even though it's divisible by 1 and 2.

Given two integers `left` and `right`, return a list of all self-dividing numbers in the inclusive range `[left, right]`, in ascending order.

The straightforward approach is to check each number in the range: extract its digits one by one, verify none are zero, and confirm the original number is divisible by each digit. The key programming challenge is efficiently extracting digits from a number, which you can do either mathematically (using modulo and integer division) or by converting to a string and iterating through characters.

For example, with `left = 1, right = 22`, the self-dividing numbers are [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15, 22]. Notice that 10 is excluded (contains 0), 13 is excluded (13 % 3 = 1, not divisible), and 11 is included (11 % 1 = 0 for both digits).

## Why This Matters

This problem teaches digit manipulation, a fundamental skill for working with numerical data in competitive programming and interview questions. The technique of extracting digits using `n % 10` and `n // 10` appears in problems involving number reversal, palindrome checking, digit sum calculations, and number-to-string conversions. While the problem itself is straightforward, it builds muscle memory for iterative digit processing, which is essential for more complex problems like counting digit occurrences, validating credit card numbers (Luhn algorithm), or implementing mathematical operations without using strings.

## Examples

**Example 1:**
- Input: `left = 1, right = 22`
- Output: `[1,2,3,4,5,6,7,8,9,11,12,15,22]`

**Example 2:**
- Input: `left = 47, right = 85`
- Output: `[48,55,66,77]`

## Constraints

- 1 <= left <= right <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Digit Extraction Pattern</summary>

For each number in the range, extract its digits one by one:
1. Use modulo 10 to get the rightmost digit: `digit = num % 10`
2. Use integer division by 10 to remove the rightmost digit: `num = num // 10`
3. Repeat until all digits are processed

Check each digit:
- If the digit is 0, immediately reject the number (division by zero)
- If the original number is not divisible by the digit, reject it
- If all digits divide the number evenly, it's self-dividing

</details>

<details>
<summary>Hint 2: Helper Function Approach</summary>

Create a helper function `is_self_dividing(num)`:
```
1. Store original number in a variable
2. While num > 0:
   - Extract rightmost digit
   - Check if digit is 0 or if original % digit != 0
   - If either condition is true, return False
   - Remove rightmost digit
3. Return True if all checks pass
```

Then iterate through [left, right] and collect all numbers where the helper returns True.

</details>

<details>
<summary>Hint 3: String Conversion Alternative</summary>

Convert the number to a string to easily access each digit:
1. Convert number to string: `str(num)`
2. Check if '0' is in the string (early rejection)
3. For each character in the string, convert back to int and check divisibility
4. This approach is cleaner but slightly less efficient than pure math

Both approaches work fine given the small range constraint (max 10⁴).

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Digit extraction (math) | O(n * d) | O(1) | Where n = right - left + 1, d = average number of digits |
| String conversion | O(n * d) | O(d) | Extra space for string representation of each number |
| Brute force with optimization | O(n * d) | O(k) | Where k is the number of self-dividing numbers found |

For the given constraints (max 10⁴), d is at most 4, making this very efficient.

## Common Mistakes

**Mistake 1: Not handling zero digit**
```python
# Wrong - will cause division by zero error
def is_self_dividing(num):
    original = num
    while num > 0:
        digit = num % 10
        if original % digit != 0:  # Crashes when digit is 0!
            return False
        num //= 10
    return True

# Correct - check for zero first
def is_self_dividing(num):
    original = num
    while num > 0:
        digit = num % 10
        if digit == 0 or original % digit != 0:
            return False
        num //= 10
    return True
```

**Mistake 2: Modifying the number before checking all digits**
```python
# Wrong - loses the original number
def is_self_dividing(num):
    while num > 0:
        digit = num % 10
        if num % digit != 0:  # num is changing!
            return False
        num //= 10
    return True

# Correct - save original number
def is_self_dividing(num):
    original = num
    while num > 0:
        digit = num % 10
        if digit == 0 or original % digit != 0:
            return False
        num //= 10
    return True
```

**Mistake 3: Incorrect string to int conversion**
```python
# Wrong - comparing string to int
num_str = str(num)
for digit in num_str:
    if num % digit != 0:  # digit is a string!
        return False

# Correct - convert digit to int
num_str = str(num)
for digit_char in num_str:
    digit = int(digit_char)
    if digit == 0 or num % digit != 0:
        return False
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| Perfect numbers | Number equals sum of its proper divisors | Medium |
| Armstrong numbers | Number equals sum of cubes of its digits | Easy |
| Happy numbers | Iteratively sum squares of digits until reaching 1 | Easy |
| Prime numbers in range | Find all primes instead of self-dividing | Medium |

## Practice Checklist

- [ ] Solve with pure mathematical digit extraction
- [ ] Test edge cases: numbers with 0, single-digit numbers
- [ ] Implement string conversion approach
- [ ] Test with range containing no self-dividing numbers
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Compare performance of math vs string approach
- [ ] Handle range [1, 1] and [1, 10000]
- [ ] Explain why 0-containing numbers don't work
