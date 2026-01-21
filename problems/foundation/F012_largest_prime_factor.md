---
id: F012
euler_id: 3
slug: largest-prime-factor
title: Largest Prime Factor
difficulty: foundation
topics: ["math", "primes", "factorization"]
patterns: []
estimated_time_minutes: 12
prerequisites: ["programming-basics"]
---

# Largest Prime Factor

## Problem

Find the largest prime factor of a given positive integer. The prime factors of a number are the prime numbers that divide it exactly (with no remainder).

For example, the prime factors of 13,195 are 5, 7, 13, and 29 (since 13,195 = 5 × 7 × 13 × 29). The largest of these is 29.

Your task is to find the largest prime factor of very large numbers, such as 600,851,475,143.

## Why This Matters

Prime factorization is one of the most fundamental operations in number theory. Every positive integer greater than 1 can be expressed uniquely as a product of primes (the **Fundamental Theorem of Arithmetic**). This unique factorization is the foundation for:

- **Cryptography**: RSA encryption relies on the fact that multiplying two large primes is easy, but factoring their product is computationally hard. The security of RSA keys (used in HTTPS, SSH, etc.) depends on the difficulty of this problem.
- **GCD and LCM**: Computing greatest common divisor and least common multiple using prime factorizations
- **Divisor counting**: The number of divisors formula uses prime factorizations
- **Simplifying fractions**: Reducing fractions to lowest terms by finding common prime factors

This problem teaches an elegant algorithmic pattern: **repeatedly divide by the smallest factor**. By extracting factors from smallest to largest, you systematically break down a number into its prime components. The last factor extracted is guaranteed to be the largest prime factor.

The O(√n) time complexity demonstrates that you don't need to factor a number completely to answer questions about it—you only need to check up to the square root.

## Examples

**Example 1:**

- Input: `n = 13195`
- Output: `29`
- Explanation: 13195 = 5 × 7 × 13 × 29. The largest prime factor is 29.

**Example 2:**

- Input: `n = 600851475143`
- Output: `6857`
- Explanation: After factoring, 6857 is the largest prime factor.

## Constraints

- 2 <= n <= 10^12
- The answer will fit in a 64-bit signed integer

## Think About

1. Do you need to find all prime factors, or just the largest?
2. If you divide n by its smallest prime factor, what can you say about the result?
3. How high do you need to search for factors?
4. What happens when n becomes 1?

---

## Approach Hints

<details>
<summary>Hint 1: Trial Division</summary>

The simplest approach is trial division: try dividing n by each potential factor starting from 2.

**Key observations:**
1. If n is divisible by d, then d is a factor of n
2. Keep dividing n by d until n is no longer divisible by d (extract all powers of that factor)
3. The smallest factor you find is guaranteed to be prime (if it were composite, you would have found its smaller prime factors first)

**Example: Factoring 60**
- 60 ÷ 2 = 30 (factor: 2)
- 30 ÷ 2 = 15 (factor: 2)
- 15 ÷ 3 = 5 (factor: 3)
- 5 is prime, so it's the largest prime factor
- Result: 60 = 2² × 3 × 5, largest prime factor = 5

</details>

<details>
<summary>Hint 2: Optimizations</summary>

**Optimization 1: Stop at √n**
- If n has no factors up to √n, then n itself is prime
- Why? If n = a × b and both a, b > √n, then a × b > n (contradiction)
- So after dividing by all factors up to √n, whatever remains is either 1 or a prime > √n

**Optimization 2: Handle 2 separately**
- After checking divisibility by 2, only check odd numbers (3, 5, 7, 9, ...)
- This cuts the search space in half

**Optimization 3: Track the largest factor found**
- Keep track of the largest factor encountered
- If n itself becomes > 1 after the loop, then n is a prime factor larger than √original_n

**Example: Factoring 600851475143**
- Divide by 2: Not divisible (it's odd)
- Divide by 3, 5, 7, ..., extracting factors
- Eventually n becomes a large prime
- That final prime is the largest prime factor

</details>

<details>
<summary>Hint 3: Implementation Pattern</summary>

```
largest_prime_factor = -1
original_n = n

# Handle factor 2
while n % 2 == 0:
    largest_prime_factor = 2
    n = n / 2

# Check odd factors from 3 to sqrt(n)
factor = 3
while factor * factor <= n:
    while n % factor == 0:
        largest_prime_factor = factor
        n = n / factor
    factor += 2  # Only check odd numbers

# If n > 1 after the loop, n itself is a prime factor
if n > 1:
    largest_prime_factor = n

return largest_prime_factor
```

**Why this works:**
- We extract factors from smallest to largest
- Each extracted factor is prime (composite factors would have been split earlier)
- If n > 1 remains, it's a prime larger than √original_n
- The last factor found (or n itself) is the largest

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Trial Division (all numbers) | O(n) | O(1) | Too slow for large n |
| Trial Division (up to √n) | O(√n) | O(1) | Optimal for single queries |
| Pollard's Rho | O(n^(1/4)) | O(1) | Advanced; for very large n |

**Why O(√n) is sufficient:**
- We divide n by each factor we find, so n decreases
- We only check factors up to √current_n
- After extracting small factors, n becomes small quickly
- In practice, much faster than the worst case

**Example timing:**
- For n = 600,851,475,143 (about 6 × 10^11)
- √n ≈ 775,000
- Check up to 775,000, but n shrinks with each division
- Completes in milliseconds

---

## Key Concept

**Prime Factorization by Trial Division**

Every composite number can be broken down into prime factors. The algorithm works by repeatedly extracting the smallest factor:

**Core insight:**
1. The smallest factor of a composite number is always prime
   - Why? If the smallest factor were composite, it would have a smaller prime factor, contradicting "smallest"
2. Divide out all occurrences of each factor before moving to the next
   - This ensures we extract factors completely (e.g., 2² from 12)
3. After extracting factors up to √n, if n > 1, then n is prime
   - Why? If n had a factor ≤ √n, we would have found it already

**Example: 84 = 2² × 3 × 7**
```
84 ÷ 2 = 42  (extract 2)
42 ÷ 2 = 21  (extract 2)
21 ÷ 3 = 7   (extract 3)
7 is prime   (largest prime factor)
```

**The √n bound:**
- If n = a × b and both a, b > √n, then a × b > n (impossible)
- So if n is composite, at least one factor is ≤ √n
- After dividing by all such factors, what remains must be prime or 1

**Why this matters for cryptography:**
- RSA uses products of two large primes (e.g., 1024-bit numbers)
- Factoring such products with trial division would take billions of years
- No efficient classical algorithm for factoring is known (quantum computers threaten this)

---

## Common Mistakes

1. **Not handling the case where n itself is prime**: After the loop, if n > 1, that n is the largest prime factor. Don't forget to check this!

2. **Testing all numbers up to n instead of √n**: This makes the algorithm O(n) instead of O(√n). Always use the condition `factor * factor <= n`.

3. **Not updating largest_prime_factor inside the while loop**: You must track the largest factor found so far. Update it each time you find a divisor.

4. **Integer overflow**: Be careful with `factor * factor` for large n. Use `factor <= sqrt(n)` or ensure your integers are large enough (64-bit).

5. **Infinite loop on even numbers**: After dividing by 2, make sure to start checking odd numbers (3, 5, 7, ...) and increment by 2, not by 1.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Find all prime factors | Return list of all prime factors | Collect factors in a list as you extract them |
| Count distinct prime factors | Return count of unique primes | Use a set to track distinct factors |
| Prime factorization with powers | Return pairs (prime, exponent) | Count how many times each prime divides n |
| Check if number is prime | Is n a prime? | If n > 1 after loop and no factors found, it's prime |
| Sum of prime factors | Return sum, not max | Sum the factors instead of tracking max |

**Example variation: All prime factors of 60**
```
60 ÷ 2 = 30 → factor 2
30 ÷ 2 = 15 → factor 2
15 ÷ 3 = 5  → factor 3
5 is prime  → factor 5
Result: [2, 2, 3, 5] or [(2, 2), (3, 1), (5, 1)]
```

---

## Practice Checklist

**Correctness:**

- [ ] Handles small cases (n = 13195 returns 29)
- [ ] Handles large cases (n = 600851475143)
- [ ] Handles prime inputs (n = 17 returns 17)
- [ ] Handles perfect squares (n = 49 returns 7)

**Understanding:**

- [ ] Can explain why we only check up to √n
- [ ] Understands why the smallest factor is always prime
- [ ] Can trace through the algorithm on paper

**Mastery:**

- [ ] Solved without hints
- [ ] Implemented without looking at code
- [ ] Can extend to find all prime factors
- [ ] Can explain the cryptographic relevance

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement variation (all factors with powers)
- [ ] Day 14: Explain the √n bound to someone

---

**Euler Reference:** [Problem 3](https://projecteuler.net/problem=3)

**Next Step:** After mastering this, try [F013: GCD of Array](./F013_gcd_of_array.md)
