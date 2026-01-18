---
id: E080
old_id: I004
slug: count-primes
title: Count Primes
difficulty: easy
category: easy
topics: ["math"]
patterns: ["sieve"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E204", "M650", "H866"]
prerequisites: ["prime-numbers", "array-marking"]
strategy_ref: ../strategies/patterns/mathematical.md
---
# Count Primes

## Problem

A **prime number** is a natural number greater than 1 that has no positive divisors other than 1 and itself. For example:
- 2, 3, 5, 7, 11, 13 are prime
- 4 (= 2×2), 6 (= 2×3), 8 (= 2×4), 9 (= 3×3) are not prime

Given an integer `n`, count how many prime numbers exist that are strictly less than `n`.

**Example:**
- For n = 10, the primes less than 10 are: 2, 3, 5, 7 (count = 4)
- For n = 15, the primes less than 15 are: 2, 3, 5, 7, 11, 13 (count = 6)

**The naive approach:** Check each number from 2 to n-1 for primality. For each candidate, test divisibility by all numbers from 2 to √candidate. This takes O(n × √n) time—too slow for n = 5,000,000.

**The key insight:** Instead of testing each number individually, use the **Sieve of Eratosthenes**, an ancient algorithm (250 BC) that marks all composite numbers. If you know a number `p` is prime, then all multiples of `p` (2p, 3p, 4p, ...) must be composite. This eliminates vast swaths of candidates efficiently.

**Watch out for:**
- You can start marking multiples at p² instead of 2p (smaller multiples were already marked)
- You only need to check primes up to √n as marking candidates
- Handle edge cases: n ≤ 2 returns 0

## Why This Matters

Prime number generation is fundamental across computer science:
- **Cryptography**: RSA encryption relies on the difficulty of factoring large primes
- **Hash tables**: Prime-sized hash tables minimize collisions
- **Random number generation**: Primes create better pseudo-random sequences
- **Distributed systems**: Consistent hashing uses prime numbers for even load distribution
- **Algorithm analysis**: Understanding the sieve teaches optimization through mathematical properties

The Sieve of Eratosthenes demonstrates how **mathematical insight transforms complexity**. The naive approach is O(n√n), but the sieve achieves O(n log log n)—a dramatic improvement. This pattern of "precompute everything, then query fast" appears throughout algorithm design.

## Examples

**Example 1:**
- Input: `n = 10`
- Output: `4`
- Explanation: There are 4 prime numbers less than 10, they are 2, 3, 5, 7.

**Example 2:**
- Input: `n = 0`
- Output: `0`

**Example 3:**
- Input: `n = 1`
- Output: `0`

## Constraints

- 0 <= n <= 5 * 10⁶

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

Testing each number individually for primality is slow. Instead, think about marking all composite (non-prime) numbers. If you know a number is prime, all its multiples cannot be prime. This is the foundation of the Sieve of Eratosthenes.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Create a boolean array where index i represents whether i is prime. Start with all numbers marked as potentially prime. For each prime p starting from 2, mark all multiples of p (p², p²+p, p²+2p, ...) as composite. Count remaining primes at the end. You can optimize by starting multiples at p² instead of 2p.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**Sieve of Eratosthenes:**
1. Create boolean array isPrime[n], initialize all to true
2. isPrime[0] = isPrime[1] = false
3. For p = 2 to sqrt(n):
   - If isPrime[p] is true:
     - Mark all multiples of p from p² to n as false
4. Count all remaining true values

Time: O(n log log n), Space: O(n)

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Trial Division | O(n × √n) | O(1) | Check each number individually |
| **Sieve of Eratosthenes** | **O(n log log n)** | **O(n)** | Optimal for counting primes |
| Segmented Sieve | O(n log log n) | O(√n) | Space-optimized for very large n |
| Wheel Factorization | O(n log log n) | O(n) | Constant factor improvement |

## Common Mistakes

**Mistake 1: Starting Multiples from 2p Instead of p²**

```python
# Wrong: Does unnecessary work
def countPrimes(n):
    if n <= 2:
        return 0
    isPrime = [True] * n
    isPrime[0] = isPrime[1] = False
    for p in range(2, int(n**0.5) + 1):
        if isPrime[p]:
            for multiple in range(2*p, n, p):  # Starts too early
                isPrime[multiple] = False
    return sum(isPrime)
```

```python
# Correct: Start from p² for efficiency
def countPrimes(n):
    if n <= 2:
        return 0
    isPrime = [True] * n
    isPrime[0] = isPrime[1] = False
    for p in range(2, int(n**0.5) + 1):
        if isPrime[p]:
            for multiple in range(p*p, n, p):  # Start from p²
                isPrime[multiple] = False
    return sum(isPrime)
```

**Mistake 2: Incorrect Loop Boundary**

```python
# Wrong: Goes too far, should stop at sqrt(n)
def countPrimes(n):
    if n <= 2:
        return 0
    isPrime = [True] * n
    isPrime[0] = isPrime[1] = False
    for p in range(2, n):  # Unnecessary iterations
        if isPrime[p]:
            for multiple in range(p*p, n, p):
                isPrime[multiple] = False
    return sum(isPrime)
```

```python
# Correct: Only need to check up to sqrt(n)
def countPrimes(n):
    if n <= 2:
        return 0
    isPrime = [True] * n
    isPrime[0] = isPrime[1] = False
    for p in range(2, int(n**0.5) + 1):  # sqrt(n) is sufficient
        if isPrime[p]:
            for multiple in range(p*p, n, p):
                isPrime[multiple] = False
    return sum(isPrime)
```

**Mistake 3: Not Handling Edge Cases**

```python
# Wrong: Crashes for n <= 2
def countPrimes(n):
    isPrime = [True] * n
    isPrime[0] = isPrime[1] = False  # Index error if n <= 1
    # ...
```

```python
# Correct: Handle edge cases first
def countPrimes(n):
    if n <= 2:
        return 0
    isPrime = [True] * n
    isPrime[0] = isPrime[1] = False
    for p in range(2, int(n**0.5) + 1):
        if isPrime[p]:
            for multiple in range(p*p, n, p):
                isPrime[multiple] = False
    return sum(isPrime)
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Nth Prime | Find the nth prime number | Medium |
| Prime Factorization | Find all prime factors of a number | Medium |
| Ugly Number II | Find nth number with only factors 2, 3, 5 | Medium |
| Perfect Squares | Count perfect squares less than n | Medium |
| Prime Palindrome | Find smallest prime palindrome >= n | Medium |

## Practice Checklist

- [ ] Day 1: Implement naive trial division approach
- [ ] Day 2: Implement Sieve of Eratosthenes
- [ ] Day 3: Optimize starting point to p² instead of 2p
- [ ] Week 1: Analyze why outer loop only needs sqrt(n)
- [ ] Week 2: Compare time complexity of different approaches
- [ ] Month 1: Study segmented sieve for space optimization

**Strategy**: See [Mathematical Patterns](../strategies/patterns/mathematical.md)
