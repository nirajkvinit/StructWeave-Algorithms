---
id: M470
old_id: A333
slug: prime-palindrome
title: Prime Palindrome
difficulty: medium
category: medium
topics: ["string", "math"]
patterns: []
estimated_time_minutes: 30
---
# Prime Palindrome

## Problem

You're looking for a special kind of number: one that is both prime and palindromic. Starting from a given integer `n`, find the smallest number greater than or equal to `n` that satisfies both conditions.

Let's clarify what these terms mean:

**Prime number**: A number greater than 1 that has exactly two divisors: 1 and itself. The number 1 is not considered prime.
- Examples: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29...

**Palindrome**: A number that reads the same forwards and backwards.
- Examples: 7, 11, 101, 131, 151, 181, 191, 313, 353...

So you're searching for numbers that satisfy both properties: 2, 3, 5, 7, 11, 101, 131, 151, 181, 191, 313, 353, 373, 383, 727, 757, 787, 797, 919, 929...

Given an integer `n`, return the smallest prime palindrome that is greater than or equal to `n`. You can assume the answer will always exist and will be less than 2 × 10⁸.

## Why This Matters

This problem combines number theory with algorithmic optimization, teaching you to recognize mathematical patterns that dramatically reduce search space. Think about checksum algorithms that use prime numbers for hash table sizing, or cryptographic systems that need to generate primes with specific properties. The key insight - that even-length palindromes (except 11) are always divisible by 11 - demonstrates how mathematical reasoning can eliminate 50% of candidates instantly. This pattern of using domain knowledge to prune search space appears in database query optimization, compiler optimizations, and many algorithmic challenges. It teaches you to look for mathematical shortcuts rather than brute-forcing through possibilities.

## Examples

**Example 1:**
- Input: `n = 6`
- Output: `7`

**Example 2:**
- Input: `n = 8`
- Output: `11`

**Example 3:**
- Input: `n = 13`
- Output: `101`

## Constraints

- 1 <= n <= 10⁸

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
All even-length palindromes (except 11) are divisible by 11, so they can't be prime. This means you can skip checking even-length numbers entirely. Focus on odd-length palindromes. Also, if n falls in an even-length range, jump directly to the next odd-length range.
</details>

<details>
<summary>🎯 Main Approach</summary>
Iterate from n upward, checking each number for palindrome and prime properties. For efficiency: (1) If the current number has even length, skip to the next power of 10 (odd length); (2) Check palindrome first (faster); (3) Use optimized primality test checking divisors up to sqrt(num). Stop when you find the first number that is both palindrome and prime.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Skip even-length ranges entirely: if you're at a number like 1000-9999 (4 digits), jump to 10000 (5 digits). For primality testing, check if n is divisible by 2 or 3 first, then check numbers of form 6k±1 up to sqrt(n). This reduces primality checks significantly.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n * sqrt(n)) | O(log n) | Check every number from n |
| Skip Even Lengths | O(k * sqrt(k)) | O(log k) | k = result value, much smaller range |

## Common Mistakes

1. **Not skipping even-length palindromes**
   ```python
   # Wrong: Checking all palindromes including even-length
   while True:
       if is_palindrome(num) and is_prime(num):
           return num
       num += 1

   # Correct: Skip even-length ranges
   while True:
       if len(str(num)) % 2 == 0:
           num = 10 ** len(str(num))  # Jump to next odd length
       if is_palindrome(num) and is_prime(num):
           return num
       num += 1
   ```

2. **Inefficient primality check**
   ```python
   # Wrong: Checking all numbers up to n
   def is_prime(n):
       for i in range(2, n):
           if n % i == 0:
               return False
       return True

   # Correct: Check only up to sqrt(n)
   def is_prime(n):
       if n < 2:
           return False
       if n == 2:
           return True
       if n % 2 == 0:
           return False
       for i in range(3, int(n**0.5) + 1, 2):
           if n % i == 0:
               return False
       return True
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Palindrome Number | Easy | Only check palindrome, not prime |
| Count Primes | Medium | Count all primes up to n (Sieve) |
| Super Palindromes | Hard | Palindrome when squared |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Number Theory](../../strategies/fundamentals/math.md)
