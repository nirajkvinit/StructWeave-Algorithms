---
id: F011
euler_id: 10
slug: summation-of-primes
title: Summation of Primes
difficulty: foundation
topics: ["math", "primes", "sieve"]
patterns: []
estimated_time_minutes: 15
prerequisites: ["programming-basics"]
---

# Summation of Primes

## Problem

Find the sum of all prime numbers below a given limit. A prime number is a natural number greater than 1 that has no positive divisors other than 1 and itself.

For example, the prime numbers below 10 are 2, 3, 5, and 7. Their sum is 2 + 3 + 5 + 7 = 17.

Your task is to compute this sum efficiently for limits up to 2 million.

## Why This Matters

This problem introduces the **Sieve of Eratosthenes**, one of the oldest and most elegant algorithms in mathematics, dating back to ancient Greece (circa 200 BCE). The sieve represents a fundamental algorithmic insight: sometimes it's more efficient to mark what you don't want (composite numbers) than to test what you do want (primes).

The sieve is essential for competitive programming and appears in problems involving:
- **Prime factorization**: Finding all prime factors of numbers in a range
- **Divisor counting**: Primes are the foundation of divisor formulas
- **Number theory**: Euler's totient function, multiplicative functions, etc.
- **Cryptography**: Generating large primes for RSA key pairs

Beyond primes, the sieve pattern appears in many domains:
- **Graph algorithms**: Marking visited nodes in BFS/DFS
- **Dynamic programming**: Marking computed states
- **Bit manipulation**: Setting/clearing bits in bitmasks

The time complexity O(n log log n) is remarkably efficient—almost linear—and demonstrates that clever marking strategies can outperform naive testing approaches.

## Examples

**Example 1:**

- Input: `limit = 10`
- Output: `17`
- Explanation: Primes below 10: 2, 3, 5, 7. Sum: 2 + 3 + 5 + 7 = 17.

**Example 2:**

- Input: `limit = 2000000`
- Output: `142913828922`
- Explanation: The sum of all 148,933 primes below 2 million is 142,913,828,922.

## Constraints

- 2 <= limit <= 2 × 10^6
- The sum may exceed 32-bit integers; use 64-bit integers or arbitrary precision

## Think About

1. Could you use the trial division approach from F017? What would the time complexity be?
2. Instead of testing each number for primality, what if you mark all composite numbers?
3. If you mark a number as composite, what does that tell you about its multiples?
4. Can you optimize by skipping some multiples?

---

## Approach Hints

<details>
<summary>Hint 1: Why Trial Division is Too Slow</summary>

The naive approach from F017 (trial division) would test each number n < limit for primality by checking divisors up to √n. For limit = 2,000,000, this would require:

- Testing 2,000,000 numbers
- Each test checks up to √n divisors
- Total: roughly O(n^(3/2)) operations

For n = 2 million, this is billions of operations—too slow!

**Better idea:** Instead of testing each number, mark all composites in a single pass.

</details>

<details>
<summary>Hint 2: The Sieve Algorithm</summary>

The Sieve of Eratosthenes works by **marking multiples** of each prime as composite:

1. Create a boolean array `is_prime[0..limit]`, initially all true
2. Mark is_prime[0] = is_prime[1] = false (0 and 1 are not prime)
3. For each number p from 2 to √limit:
   - If is_prime[p] is true (p is prime):
     - Mark all multiples of p (starting from p²) as composite
4. After the sieve, all numbers with is_prime[i] = true are primes
5. Sum them up

**Key insight:** When you mark multiples of p, start from p² because smaller multiples (p×2, p×3, ..., p×(p-1)) were already marked by smaller primes.

**Example for limit = 10:**
```
Initial:     [F, F, T, T, T, T, T, T, T, T]  (indices 0-9)
After p=2:   [F, F, T, T, F, T, F, T, F, T]  (marked 4, 6, 8)
After p=3:   [F, F, T, T, F, T, F, T, F, F]  (marked 9)
Primes: 2, 3, 5, 7
```

</details>

<details>
<summary>Hint 3: Implementation Details</summary>

```
Create boolean array is_prime[0..limit-1], all true
is_prime[0] = false
is_prime[1] = false

for p from 2 to sqrt(limit):
    if is_prime[p]:
        # Mark multiples of p starting from p²
        for multiple from p*p to limit-1 step p:
            is_prime[multiple] = false

# Sum all remaining primes
prime_sum = 0
for i from 2 to limit-1:
    if is_prime[i]:
        prime_sum += i

return prime_sum
```

**Optimizations:**
- Start marking from p² (smaller multiples already marked)
- Only iterate p up to √limit (larger primes don't mark anything new in range)
- Optional: After checking 2, only check odd numbers (skip even)

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Trial Division | O(n^(3/2)) | O(1) | Too slow for large n |
| Sieve of Eratosthenes | O(n log log n) | O(n) | Fast; requires memory array |
| Segmented Sieve | O(n log log n) | O(√n) | Same time; memory-efficient for huge n |

**Why O(n log log n)?**

The sieve marks multiples of each prime p:
- p=2: marks n/2 numbers
- p=3: marks n/3 numbers
- p=5: marks n/5 numbers
- ...

Total marks: n × (1/2 + 1/3 + 1/5 + 1/7 + ...) where denominators are primes.

This sum of reciprocals of primes grows as log log n (a remarkable number theory result!), giving O(n log log n).

**Practical note:** For n = 2 million, log log n ≈ 3.3, so the algorithm is nearly O(n)—extremely fast!

---

## Key Concept

**Sieve of Eratosthenes**

The sieve is a **marking algorithm**: instead of testing primality, it marks composites and leaves primes unmarked.

**Core idea:**
1. If p is prime, then all multiples of p (except p itself) are composite
2. Mark these multiples to eliminate them from consideration
3. Any unmarked number must be prime (no smaller prime divides it)

**Why it works:**
- Every composite number has a prime factor ≤ √n
- By the time we finish sieving with primes up to √n, all composites are marked
- Unmarked numbers have no prime divisors ≤ √n, so they must be prime

**Historical note:** Eratosthenes (276-194 BCE), a Greek mathematician, invented this algorithm over 2,200 years ago. It's still the fastest method for finding all primes up to a limit!

**Visualizing the sieve:** Imagine writing all numbers 2 to n. Start with 2 (prime), cross out all its multiples (4, 6, 8, ...). The next uncrossed number is 3 (prime); cross out its multiples (9, 15, 21, ...). Continue with 5, 7, 11, etc. Whatever remains uncrossed are the primes.

---

## Common Mistakes

1. **Marking from p instead of p²**: Starting from p wastes time. Multiples p×2, p×3, ..., p×(p-1) were already marked by smaller primes. Always start from p².

2. **Iterating up to limit instead of √limit**: After √limit, no unmarked number will mark anything new. Stopping at √limit is safe and faster.

3. **Integer overflow in sum**: The sum of primes below 2 million exceeds 32 bits (1.4 × 10^11). Use `long long` in C++, `long` in Java, or Python's arbitrary precision integers.

4. **Off-by-one errors**: Make sure your array indices align with the numbers. If `is_prime[i]` represents number i, then the array size should be `limit`, and you sum from index 2 to limit-1.

5. **Memory allocation failure**: For very large limits (e.g., 10^9), allocating a boolean array might exceed memory. Consider a segmented sieve for such cases.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Count primes below limit | Return count, not sum | Count true values in is_prime array |
| List all primes | Return array of primes | Collect indices where is_prime[i] = true |
| Primes in range [L, R] | Find primes between L and R | Sieve up to R, filter to [L, R] or use segmented sieve |
| Sum of first n primes | Sum first n, not all below limit | Sieve, then sum first n primes found |
| Sieve with optimization | Skip even numbers entirely | Use array half the size, represent only odd numbers |

**Segmented Sieve (for limits > 10^8):**
- Divide range into segments of size √n
- Sieve each segment using primes found up to √n
- Reduces space complexity to O(√n)

---

## Practice Checklist

**Correctness:**

- [ ] Handles small cases (limit = 10 returns 17)
- [ ] Handles large cases (limit = 2,000,000)
- [ ] Correctly excludes 0 and 1 from primes
- [ ] Sum doesn't overflow (uses 64-bit integer)

**Understanding:**

- [ ] Can explain why we mark multiples starting from p²
- [ ] Understands why we only iterate up to √limit
- [ ] Can explain the O(n log log n) time complexity
- [ ] Can draw/visualize the sieve process

**Mastery:**

- [ ] Solved without hints
- [ ] Implemented the sieve from scratch
- [ ] Can optimize to skip even numbers
- [ ] Can explain when to use sieve vs. trial division

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement optimized version (odd-only)
- [ ] Day 14: Explain the algorithm to someone else

---

**Euler Reference:** [Problem 10](https://projecteuler.net/problem=10)

**Next Step:** After mastering this, try [F012: Largest Prime Factor](./F012_largest_prime_factor.md)
