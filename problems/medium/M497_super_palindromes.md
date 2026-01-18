---
id: M497
old_id: A373
slug: super-palindromes
title: Super Palindromes
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
---
# Super Palindromes

## Problem

A super-palindrome is a special kind of number with a double palindrome property: the number itself reads the same forwards and backwards, AND its square root is also a palindrome.

For example:
- The number 1 is a super-palindrome because sqrt(1) = 1, and both are palindromes
- The number 4 is a super-palindrome because sqrt(4) = 2, both 4 and 2 are palindromes
- The number 9 is a super-palindrome because sqrt(9) = 3, both 9 and 3 are palindromes
- The number 121 is a super-palindrome because sqrt(121) = 11, both 121 and 11 are palindromes
- The number 676 is NOT a super-palindrome even though 676 is a palindrome, because sqrt(676) = 26, and 26 is not a palindrome

Given two numbers `left` and `right` (provided as strings to handle very large values), count how many super-palindromes exist in the range `[left, right]` inclusive.

The numbers can be extremely large (up to 10^18), so you need an efficient approach that doesn't check every single number in the range.

## Why This Matters

Cryptographic hash function design occasionally explores numbers with special mathematical properties for generating secure random seeds. Super-palindromes represent a subset of perfect squares with symmetry properties that can be useful in designing checksums or validation codes where the property "reversible and has a reversible square root" provides an additional layer of verification.

Pattern recognition in large number theory databases also benefits from efficient super-palindrome generation. When mathematicians catalog numbers with interesting properties (like the OEIS - Online Encyclopedia of Integer Sequences), they need algorithms that can quickly enumerate numbers meeting multiple simultaneous criteria across enormous ranges. The technique of "generate palindromes then filter" rather than "check every number" is a powerful optimization strategy applicable to many number theory search problems.

## Examples

**Example 1:**
- Input: `left = "4", right = "1000"`
- Output: `4`
- Explanation: The values 4, 9, 121, and 484 qualify as super-palindromes. Although 676 is itself a palindrome (26 * 26 = 676), it doesn't qualify because 26 is not palindromic.

**Example 2:**
- Input: `left = "1", right = "2"`
- Output: `1`

## Constraints

- 1 <= left.length, right.length <= 18
- left and right consist of only digits.
- left and right cannot have leading zeros.
- left and right represent integers in the range [1, 10¹⁸ - 1].
- left is less than or equal to right.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Instead of checking all numbers in the range [left, right], generate palindromes and square them. Since we need sqrt(x) to be a palindrome, generate palindromic numbers up to sqrt(right), square them, and check if the result is also a palindrome within the range. This dramatically reduces the search space.
</details>

<details>
<summary>🎯 Main Approach</summary>
Generate all palindromes up to 10^5 (since sqrt(10^18) ≈ 10^9, and we only need the first half to generate palindromes). For each palindrome, square it and check if: (1) the square is in range [left, right], and (2) the square is also a palindrome. Generate palindromes by mirroring digits: for length 1-9, create both odd-length (middle digit) and even-length palindromes.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can generate palindromes more efficiently by iterating through all numbers from 1 to 100000, and for each, create two palindromes: one by mirroring (even length) and one by mirroring without the last digit (odd length). For example, 123 generates 12321 and 1221.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(right) | O(1) | Check every number, too slow |
| Optimal (Generate) | O(sqrt(right)^0.5) | O(1) | Generate ~10^5 palindromes |

The optimal time is approximately O(10^5) regardless of the size of the range

## Common Mistakes

1. **Checking all numbers in range**
   ```python
   # Wrong: Iterating through huge range
   count = 0
   for num in range(left, right + 1):
       sqrt_num = int(num ** 0.5)
       if sqrt_num * sqrt_num == num:
           if is_palindrome(sqrt_num) and is_palindrome(num):
               count += 1
   # This is too slow for large ranges!

   # Correct: Generate palindromes first
   count = 0
   for i in range(1, 100000):
       for palindrome in generate_palindromes(i):
           squared = palindrome * palindrome
           if left <= squared <= right and is_palindrome(squared):
               count += 1
   ```

2. **Incorrect palindrome generation**
   ```python
   # Wrong: Only generating odd or even length palindromes
   def generate_palindrome(n):
       s = str(n)
       return int(s + s[::-1])  # Only even length!

   # Correct: Generate both odd and even length
   def generate_palindromes(n):
       s = str(n)
       palindromes = []
       palindromes.append(int(s + s[-2::-1]))  # Odd length
       palindromes.append(int(s + s[::-1]))     # Even length
       return palindromes
   ```

3. **Floating point precision issues**
   ```python
   # Wrong: Using float square root
   sqrt_num = int(num ** 0.5)
   if sqrt_num * sqrt_num == num:  # Might miss perfect squares

   # Correct: Generate palindromes directly, square them
   # No need to compute square roots at all
   squared = palindrome * palindrome
   if is_palindrome(str(squared)):
       count += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Palindrome Number | Easy | Check single number, no squaring |
| Palindrome Pairs | Hard | Find pairs that concatenate to palindrome |
| Super Ugly Number | Medium | Numbers with specific prime factors |
| Valid Palindrome | Easy | String palindrome with filtering |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Mathematical Patterns](../../strategies/patterns/math-patterns.md)
