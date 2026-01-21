---
id: F028
slug: counting-divisors
title: Counting Divisors
difficulty: foundation
topics: ["math", "prime-factorization", "divisors", "number-theory"]
patterns: []
estimated_time_minutes: 15
prerequisites: ["programming-basics"]
---

# Counting Divisors

## Problem

Given a positive integer n, count how many positive divisors it has.

A **divisor** (or factor) of n is a positive integer that divides n evenly (with no remainder).

**Example**: The divisors of 12 are {1, 2, 3, 4, 6, 12}, so d(12) = 6.

The divisor count function is commonly written as d(n), τ(n) (tau), or σ₀(n).

## Why This Matters

Counting divisors connects to fundamental algorithms and mathematics:

**1. Prime Factorization Formula**: The elegant formula d(n) = ∏(aᵢ + 1) from prime factorization is a cornerstone of number theory. It transforms a counting problem into a product.

**2. Highly Composite Numbers**: Numbers with many divisors appear in:
- Optimal scheduling (find times divisible by many periods)
- Cryptographic analysis (smooth numbers)
- Efficient lookup table sizing

**3. The √n Optimization**: The technique of checking only up to √n (since divisors come in pairs) is widely applicable to factor-related problems.

**4. Multiplicative Functions**: d(n) is multiplicative: if gcd(a,b) = 1, then d(ab) = d(a) × d(b). This property enables efficient computation.

**5. Interview Applications**:
- Finding pairs with specific divisor counts
- Optimizing nested loops
- Number theory components of harder problems

## Examples

**Example 1:**

- Input: `n = 12`
- Output: `6`
- Explanation: Divisors of 12: {1, 2, 3, 4, 6, 12}

**Example 2:**

- Input: `n = 1`
- Output: `1`
- Explanation: Only divisor of 1 is 1 itself.

**Example 3:**

- Input: `n = 7`
- Output: `2`
- Explanation: 7 is prime, so only divisors are 1 and 7.

**Example 4:**

- Input: `n = 36`
- Output: `9`
- Explanation: Divisors: {1, 2, 3, 4, 6, 9, 12, 18, 36}

## Constraints

- 1 <= n <= 10^9
- Return d(n), the number of positive divisors

## Think About

1. What's the naive way to count divisors, and why is it slow?
2. How can you use the pairing of divisors to speed this up?
3. What's special about perfect square divisors?
4. How does prime factorization help?

---

## Approach Hints

<details>
<summary>Hint 1: Naive and √n Approaches</summary>

**Naive approach (O(n)):**
```
count_divisors_naive(n):
    count = 0
    for i from 1 to n:
        if n mod i == 0:
            count += 1
    return count
```

**√n optimization:**

Key insight: Divisors come in pairs (d, n/d).
- If d divides n, then n/d also divides n
- d and n/d are both ≤ √n only when d = √n

```
count_divisors_sqrt(n):
    count = 0
    i = 1
    while i * i <= n:
        if n mod i == 0:
            if i * i == n:
                count += 1  # Perfect square: count once
            else:
                count += 2  # Count both i and n/i
        i += 1
    return count
```

**Example: n = 12**
- i=1: 12%1=0, 1≠12, count += 2 → (1, 12)
- i=2: 12%2=0, 2≠6, count += 2 → (2, 6)
- i=3: 12%3=0, 3≠4, count += 2 → (3, 4)
- i=4: 4*4=16 > 12, exit
- Total: 6

**Time complexity**: O(√n)

</details>

<details>
<summary>Hint 2: Prime Factorization Formula</summary>

**The divisor count formula:**

If n = p₁^a₁ × p₂^a₂ × ... × pₖ^aₖ (prime factorization), then:

d(n) = (a₁ + 1) × (a₂ + 1) × ... × (aₖ + 1)

**Why this works:**

Any divisor of n has the form p₁^b₁ × p₂^b₂ × ... × pₖ^bₖ where 0 ≤ bᵢ ≤ aᵢ.

For each prime pᵢ with exponent aᵢ, we have (aᵢ + 1) choices for bᵢ: 0, 1, 2, ..., aᵢ.

Total divisors = product of choices.

**Example: n = 12 = 2² × 3¹**
- d(12) = (2 + 1) × (1 + 1) = 3 × 2 = 6 ✓

**Example: n = 36 = 2² × 3²**
- d(36) = (2 + 1) × (2 + 1) = 3 × 3 = 9 ✓

**Example: n = 60 = 2² × 3¹ × 5¹**
- d(60) = (2 + 1) × (1 + 1) × (1 + 1) = 3 × 2 × 2 = 12

</details>

<details>
<summary>Hint 3: Factorization-Based Implementation</summary>

**Algorithm:**
1. Factor n by trial division
2. For each prime factor, count its exponent
3. Multiply (exponent + 1) for each prime

```
count_divisors_factorization(n):
    if n == 1:
        return 1

    count = 1

    # Handle factor of 2
    exponent = 0
    while n mod 2 == 0:
        exponent += 1
        n = n / 2
    count *= (exponent + 1)

    # Handle odd factors
    factor = 3
    while factor * factor <= n:
        exponent = 0
        while n mod factor == 0:
            exponent += 1
            n = n / factor
        count *= (exponent + 1)
        factor += 2

    # If n > 1, it's a prime factor with exponent 1
    if n > 1:
        count *= 2  # (1 + 1) for this prime

    return count
```

**Trace for n = 12:**
- Handle 2: 12 → 6 → 3 (exp=2), count = 1 × 3 = 3
- Handle 3: 3 → 1 (exp=1), count = 3 × 2 = 6
- n = 1, no remaining prime
- Result: 6 ✓

**Time complexity**: O(√n) for factorization
**Space complexity**: O(1)

</details>

---

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Naive | O(n) | O(1) | Check all 1 to n |
| √n direct | O(√n) | O(1) | Check pairs up to √n |
| Factorization | O(√n) | O(1) | Factor and apply formula |
| Sieve (all d(n) up to N) | O(N log N) | O(N) | For multiple queries |

**Which to use:**
- Single query: Factorization or √n direct (both O(√n))
- Many queries for small n: Precompute with sieve
- Very large n: Factorization (can early exit on prime factors)

**Sieve for divisor counts:**
```
divisor_sieve(N):
    d = [0] * (N + 1)
    for i from 1 to N:
        for j from i to N step i:
            d[j] += 1  # i divides j
    return d
```
This counts how many numbers divide each j.

---

## Key Concept

**Multiplicative Functions and Prime Factorization**

**Multiplicative function**: f is multiplicative if f(ab) = f(a) × f(b) whenever gcd(a, b) = 1.

**d(n) is multiplicative:**
- d(6) = d(2 × 3) = d(2) × d(3) = 2 × 2 = 4 ✓ (divisors: 1, 2, 3, 6)

**Why multiplicative functions are powerful:**
If f is multiplicative and n = p₁^a₁ × p₂^a₂ × ... × pₖ^aₖ, then:
f(n) = f(p₁^a₁) × f(p₂^a₂) × ... × f(pₖ^aₖ)

We only need to know f on prime powers!

**For d(n):**
- d(p^a) = a + 1 (divisors are 1, p, p², ..., p^a)
- Therefore: d(n) = ∏(aᵢ + 1)

**Other multiplicative functions:**

| Function | f(p^a) | Formula for n = ∏pᵢ^aᵢ |
|----------|--------|------------------------|
| d(n) - divisor count | a + 1 | ∏(aᵢ + 1) |
| σ(n) - divisor sum | (p^(a+1) - 1)/(p - 1) | ∏((pᵢ^(aᵢ+1) - 1)/(pᵢ - 1)) |
| φ(n) - Euler's totient | p^(a-1)(p - 1) | n × ∏(1 - 1/pᵢ) |

---

## Common Mistakes

1. **Counting √n twice**: When n is a perfect square, √n pairs with itself. Count it once, not twice.

2. **Missing the final prime**: After the loop, if n > 1, it's a prime factor. Multiply by 2 (exponent 1, so 1+1).

3. **Starting at 0**: Divisors are positive, so start i at 1.

4. **Integer overflow**: (exponent + 1) products can overflow for numbers with many small prime factors. Use 64-bit integers.

5. **Confusing d(n) with σ(n)**: d(n) counts divisors; σ(n) sums them. Different functions!

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Sum of divisors σ(n) | Sum instead of count | σ(p^a) = (p^(a+1) - 1)/(p - 1) |
| List all divisors | Return the divisors | Generate from factorization |
| Number with exactly k divisors | Find smallest with d(n) = k | k = ∏(aᵢ + 1); optimize exponents |
| Highly composite | Most divisors under N | Check candidates; use formula |
| Divisor count sieve | d(n) for all n ≤ N | Sieve approach O(N log N) |

**Smallest number with k divisors:**
- k = 6 = 6 × 1 = 3 × 2 = 2 × 3 = ...
- Options: p⁵ or p² × q or p × q²
- Smallest: 2² × 3 = 12 (exponents [2,1] give (3)(2) = 6)

**Highly composite numbers** (most divisors for their size):
1, 2, 4, 6, 12, 24, 36, 48, 60, 120, ...

---

## Practice Checklist

**Correctness:**

- [ ] Handles n = 1 (returns 1)
- [ ] Handles primes (returns 2)
- [ ] Handles perfect squares (e.g., 36 → 9)
- [ ] Handles composite numbers (e.g., 12 → 6)

**Understanding:**

- [ ] Can explain the √n optimization
- [ ] Knows the divisor count formula
- [ ] Understands why d(n) is multiplicative
- [ ] Can derive d(p^a) = a + 1

**Mastery:**

- [ ] Solved without hints
- [ ] Implemented factorization approach
- [ ] Can adapt to sum of divisors
- [ ] Can find number with exactly k divisors

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve (√n approach)
- [ ] Day 3: Implement factorization approach
- [ ] Day 7: Extend to sum of divisors
- [ ] Day 14: Find smallest number with exactly 12 divisors

---

**Next Step:** After mastering F021-F028, you're ready to explore [Easy problems](../easy/) or dive deeper into [Number Theory patterns](../../strategies/patterns/number-theory.md).
