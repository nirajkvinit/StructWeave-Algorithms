---
id: M495
old_id: A369
slug: numbers-at-most-n-given-digit-set
title: Numbers At Most N Given Digit Set
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Numbers At Most N Given Digit Set

## Problem

You're given a set of allowed digits (sorted in ascending order), and you need to figure out how many positive integers you can form using only those digits that don't exceed a given number `n`. You can reuse digits as many times as you want, and you can create numbers of any length.

For example, if your allowed digits are `['1', '3', '5', '7']` and `n = 100`:
- You can make all single-digit numbers: 1, 3, 5, 7 (4 numbers)
- You can make two-digit numbers: 11, 13, 15, 17, 31, 33, 35, 37, 51, 53, 55, 57, 71, 73, 75, 77 (16 numbers)
- But for three-digit numbers, you can't make anything because the smallest three-digit number you could make is 111, which exceeds 100

So you'd count all valid combinations up to 100.

Here's what makes it tricky: you need an efficient way to count these without actually generating and checking every single number, especially when `n` gets very large (up to 1 billion).

## Why This Matters

License plate generation systems face this exact problem. States need to know "how many license plates can we create using only the digits 0-9 and letters A-Z, with at most 7 characters, that don't exceed our allocation limit?" This helps them plan inventory, predict when they'll run out of available combinations, and determine pricing for vanity plates.

Security systems that generate PIN codes or access tokens also use this pattern. If your security policy requires PINs using only even digits (2,4,6,8) and they must be numerically less than a certain threshold for database indexing, you need to calculate the keyspace size to assess security strength. Understanding the combinatorics of restricted digit sets with upper bounds is crucial for capacity planning in numbering systems across telecommunications, inventory management, and cryptographic applications.

## Examples

**Example 1:**
- Input: `digits = ["1","3","5","7"], n = 100`
- Output: `20
**Explanation: **
The 20 numbers that can be written are:
1, 3, 5, 7, 11, 13, 15, 17, 31, 33, 35, 37, 51, 53, 55, 57, 71, 73, 75, 77.`

**Example 2:**
- Input: `digits = ["1","4","9"], n = 1000000000`
- Output: `29523
**Explanation: **
We can write 3 one digit numbers, 9 two digit numbers, 27 three digit numbers,
81 four digit numbers, 243 five digit numbers, 729 six digit numbers,
2187 seven digit numbers, 6561 eight digit numbers, and 19683 nine digit numbers.
In total, this is 29523 integers that can be written using the digits array.`

**Example 3:**
- Input: `digits = ["7"], n = 8`
- Output: `1`

## Constraints

- 1 <= digits.length <= 9
- digits[i].length == 1
- digits[i] is a digit from '1' to '9'.
- All the values in digits are **unique**.
- digits is sorted in **non-decreasing** order.
- 1 <= n <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Split the counting into two parts: (1) numbers with fewer digits than n (easy - use combinatorics), and (2) numbers with the same number of digits as n (harder - need digit DP to ensure we don't exceed n). For same-length numbers, process digit by digit from left to right.
</details>

<details>
<summary>🎯 Main Approach</summary>
First, count all numbers with fewer digits using the formula: k + k² + k³ + ... where k is the number of available digits. Then use digit DP for same-length numbers: at each position, try all digits less than n's digit at that position (gives valid numbers), plus recursively check if we can match n's digit exactly and continue to the next position.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
For numbers with fewer digits, use the geometric series formula: k(k^(d-1) - 1)/(k-1) where d is the number of digits in n and k is the size of the digit set. For same-length numbers, once you place a digit strictly less than n's digit, all remaining positions can use any digit.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n) | O(1) | Check every number up to n |
| Optimal (Digit DP) | O(d * k) | O(d) | d = digits in n, k = digit set size |

Where d is typically log₁₀(n), and k ≤ 9

## Common Mistakes

1. **Forgetting numbers with fewer digits**
   ```python
   # Wrong: Only counting same-length numbers
   def atMostNGivenDigitSet(digits, n):
       n_str = str(n)
       return count_same_length(digits, n_str)

   # Correct: Add numbers with fewer digits
   def atMostNGivenDigitSet(digits, n):
       n_str = str(n)
       k = len(digits)
       result = sum(k ** i for i in range(1, len(n_str)))  # Fewer digits
       result += count_same_length(digits, n_str)  # Same length
       return result
   ```

2. **Incorrect digit DP state transitions**
   ```python
   # Wrong: Not tracking tight bound correctly
   def dp(pos, tight):
       if not tight:
           return k ** (len(n_str) - pos)  # Wrong! Should be len - pos

   # Correct: Handle tight bound properly
   def dp(pos, tight):
       if pos == len(n_str):
           return 1
       limit = n_str[pos] if tight else '9'
       result = 0
       for d in digits:
           if d > limit:
               break
           result += dp(pos + 1, tight and d == limit)
       return result
   ```

3. **Not handling the case when digit equals n's digit**
   ```python
   # Wrong: Only counting digits strictly less than n's digit
   for d in digits:
       if d < n_str[pos]:
           count += k ** remaining_positions

   # Correct: Also handle equal case recursively
   for d in digits:
       if d < n_str[pos]:
           count += k ** remaining_positions
       elif d == n_str[pos]:
           count += dp(pos + 1, True)  # Continue with tight bound
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Count Numbers with Unique Digits | Medium | No repeated digits constraint |
| Non-negative Integers without Consecutive Ones | Hard | Binary with no consecutive 1s |
| Numbers with Repeated Digits | Hard | Opposite constraint - must have repeats |
| Rotated Digits | Medium | Digit transformation instead of selection |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Digit DP](../../strategies/patterns/dynamic-programming.md)
