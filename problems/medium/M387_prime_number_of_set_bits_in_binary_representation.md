---
id: M387
old_id: A229
slug: prime-number-of-set-bits-in-binary-representation
title: Prime Number of Set Bits in Binary Representation
difficulty: medium
category: medium
topics: ["bit-manipulation", "math"]
patterns: []
estimated_time_minutes: 30
---
# Prime Number of Set Bits in Binary Representation

## Problem

Count how many numbers in a range have a "prime number of 1-bits" in their binary representation. This combines two concepts: binary representation and prime numbers.

First, let's clarify **set bits** (also called "population count" or "Hamming weight"): this is the count of `1`s in a number's binary form. For example:
- `6` in binary is `110`, which has **2** set bits (two 1s)
- `7` in binary is `111`, which has **3** set bits (three 1s)
- `9` in binary is `1001`, which has **2** set bits (two 1s)

Your task: given a range `[left, right]`, count how many numbers have a **prime** number of set bits.

Recall that prime numbers are integers greater than 1 that have no positive divisors other than 1 and themselves: `{2, 3, 5, 7, 11, 13, 17, 19, ...}`. Note that 1 is NOT prime.

So for the range `[6, 10]`:
- `6 = 110` → 2 set bits → 2 is prime ✓
- `7 = 111` → 3 set bits → 3 is prime ✓
- `8 = 1000` → 1 set bit → 1 is NOT prime ✗
- `9 = 1001` → 2 set bits → 2 is prime ✓
- `10 = 1010` → 2 set bits → 2 is prime ✓

Result: 4 numbers have a prime number of set bits.

The challenge is doing this efficiently for potentially large ranges (up to 1 million).

## Why This Matters

Bit counting (population count) is a fundamental operation in systems programming, appearing in everything from cryptography to compression algorithms. Modern CPUs have dedicated instructions (like POPCNT) for counting set bits because it's so common in low-level operations like bitmap indexing, network protocols, and chess engines (counting pieces on a board). Combining bit manipulation with mathematical properties like primality teaches you to precompute small lookup tables for efficiency - a technique used in hash functions, checksum algorithms, and data structure optimizations. This problem is a gentle introduction to thinking about number properties in binary, essential for interview bit manipulation questions.

## Examples

**Example 1:**
- Input: `left = 6, right = 10`
- Output: `4`
- Explanation:
6  -> 110 (contains 2 set bits, and 2 is prime)
7  -> 111 (contains 3 set bits, and 3 is prime)
8  -> 1000 (contains 1 set bit, and 1 is not prime)
9  -> 1001 (contains 2 set bits, and 2 is prime)
10 -> 1010 (contains 2 set bits, and 2 is prime)
Total: 4 numbers with a prime count of set bits.

**Example 2:**
- Input: `left = 10, right = 15`
- Output: `5`
- Explanation:
10 -> 1010 (contains 2 set bits, and 2 is prime)
11 -> 1011 (contains 3 set bits, and 3 is prime)
12 -> 1100 (contains 2 set bits, and 2 is prime)
13 -> 1101 (contains 3 set bits, and 3 is prime)
14 -> 1110 (contains 3 set bits, and 3 is prime)
15 -> 1111 (contains 4 set bits, and 4 is not prime)
Total: 5 numbers with a prime count of set bits.

## Constraints

- 1 <= left <= right <= 10⁶
- 0 <= right - left <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
The maximum value is 10^6, which is less than 2^20 (1,048,576). Therefore, the maximum number of set bits is 20. Since we only need to check if counts {2, 3, 5, 7, 11, 13, 17, 19} are prime (all primes up to 20), we can precompute this small set and use O(1) lookup.
</details>

<details>
<summary>Main Approach</summary>
Precompute a set of primes up to 20: {2, 3, 5, 7, 11, 13, 17, 19}. For each number in range [left, right], count set bits using built-in popcount or Brian Kernighan's algorithm. Check if the count is in the prime set. Increment counter if true. Return the total count.
</details>

<details>
<summary>Optimization Tip</summary>
Use built-in bit counting functions (Python's bin(n).count('1'), Java's Integer.bitCount(), C++'s __builtin_popcount()) for O(1) counting. Since the prime set is tiny (8 elements), checking membership is effectively O(1). Total complexity is O(n) where n = right - left.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Prime Check | O(n * sqrt(b)) | O(1) | b = max bits, check primality each time |
| Precomputed Primes | O(n) | O(1) | n = right - left, optimal |

## Common Mistakes

1. **Computing primes inefficiently**
   ```python
   # Wrong: Check if count is prime each time using trial division
   def is_prime(n):
       for i in range(2, int(n**0.5) + 1):
           if n % i == 0:
               return False
       return n > 1

   # Correct: Precompute small set of primes up to 20
   primes = {2, 3, 5, 7, 11, 13, 17, 19}
   if bit_count in primes:
       result += 1
   ```

2. **Inefficient bit counting**
   ```python
   # Wrong: Convert to string and count
   bit_count = bin(num).count('1')  # works but slower

   # Correct: Use Brian Kernighan's algorithm or built-in
   def count_bits(n):
       count = 0
       while n:
           n &= n - 1  # clear lowest set bit
           count += 1
       return count
   ```

3. **Forgetting edge case: 1 is not prime**
   ```python
   # Wrong: Include 1 as prime
   primes = {1, 2, 3, 5, 7, 11, 13, 17, 19}

   # Correct: 1 is not prime, exclude it
   primes = {2, 3, 5, 7, 11, 13, 17, 19}
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Number of 1 Bits | Easy | Just count bits, no prime check |
| Counting Bits | Easy | Count bits for range 0 to n |
| Binary Watch | Easy | Count combinations with k set bits |
| Prime Number of Set Bits II | Medium | Larger range requiring Sieve of Eratosthenes |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Bit Manipulation](../../strategies/patterns/bit-manipulation.md)
