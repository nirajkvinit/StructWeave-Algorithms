---
id: F022
slug: coprime-pairs
title: Coprime Pairs
difficulty: foundation
topics: ["math", "gcd", "counting", "number-theory"]
patterns: []
estimated_time_minutes: 15
prerequisites: ["programming-basics"]
---

# Coprime Pairs

## Problem

Two positive integers are **coprime** (or relatively prime) if their greatest common divisor (GCD) is 1. This means they share no common factors other than 1.

**Examples of coprime pairs**: (3, 5), (8, 15), (14, 25)
**Examples of non-coprime pairs**: (4, 6) with GCD=2, (9, 12) with GCD=3

Given a positive integer n, count the number of integers from 1 to n-1 that are coprime to n.

**Bonus**: This count has a name—it's called **Euler's totient function φ(n)** (phi of n).

## Why This Matters

Coprimality and Euler's totient function are central to cryptography and number theory:

**1. RSA Cryptography**: The security of RSA depends on Euler's theorem, which uses φ(n). The encryption exponent e must be coprime to φ(n), and the decryption key d satisfies e × d ≡ 1 (mod φ(n)).

**2. Euler's Theorem**: For any a coprime to n: a^φ(n) ≡ 1 (mod n). This generalizes Fermat's little theorem and is used in:
- Modular exponentiation
- Computing modular inverses
- Primality testing

**3. Reduced Residue Systems**: The φ(n) numbers coprime to n form a group under multiplication mod n. This structure is fundamental in abstract algebra.

**4. Counting Problems**: "How many fractions k/n are in lowest terms?" Answer: φ(n).

**5. Formula Discovery**: While brute force works, discovering the formula φ(n) = n × ∏(1 - 1/p) for prime factors p teaches multiplicative function properties.

## Examples

**Example 1:**

- Input: `n = 9`
- Output: `6`
- Explanation: Numbers coprime to 9: {1, 2, 4, 5, 7, 8}. GCD(3, 9) = 3 ≠ 1, GCD(6, 9) = 3 ≠ 1.

**Example 2:**

- Input: `n = 10`
- Output: `4`
- Explanation: Numbers coprime to 10: {1, 3, 7, 9}. Numbers 2, 4, 5, 6, 8 share factors with 10.

**Example 3:**

- Input: `n = 1`
- Output: `1`
- Explanation: By convention, φ(1) = 1 (the empty product of conditions is satisfied by 1).

**Example 4:**

- Input: `n = 13` (prime)
- Output: `12`
- Explanation: For prime p, φ(p) = p - 1. Every number from 1 to 12 is coprime to 13.

## Constraints

- 1 <= n <= 10^6
- Return φ(n), the count of integers in [1, n-1] coprime to n

## Think About

1. How do you check if two numbers are coprime?
2. What's φ(p) for a prime p?
3. What's φ(p^k) for a prime power?
4. Can you express φ(n) using n's prime factorization?

---

## Approach Hints

<details>
<summary>Hint 1: Brute Force with GCD</summary>

**Direct approach:**

```
phi_brute_force(n):
    if n == 1:
        return 1
    count = 0
    for i from 1 to n - 1:
        if gcd(i, n) == 1:
            count += 1
    return count
```

**Using Euclidean GCD:**
```
gcd(a, b):
    while b != 0:
        a, b = b, a mod b
    return a
```

**Example: φ(12)**
- Check 1: gcd(1, 12) = 1 ✓
- Check 2: gcd(2, 12) = 2 ✗
- Check 3: gcd(3, 12) = 3 ✗
- Check 4: gcd(4, 12) = 4 ✗
- Check 5: gcd(5, 12) = 1 ✓
- Check 6: gcd(6, 12) = 6 ✗
- Check 7: gcd(7, 12) = 1 ✓
- Check 8: gcd(8, 12) = 4 ✗
- Check 9: gcd(9, 12) = 3 ✗
- Check 10: gcd(10, 12) = 2 ✗
- Check 11: gcd(11, 12) = 1 ✓
- Result: φ(12) = 4

**Time complexity**: O(n log n) — n GCD calls, each O(log n)

</details>

<details>
<summary>Hint 2: Formula Using Prime Factorization</summary>

**Key formulas:**

1. **For prime p**: φ(p) = p - 1
   (All numbers 1 to p-1 are coprime to p)

2. **For prime power p^k**: φ(p^k) = p^k - p^(k-1) = p^(k-1) × (p - 1)
   (Exclude multiples of p: there are p^(k-1) of them)

3. **Multiplicative property**: If gcd(a, b) = 1, then φ(a × b) = φ(a) × φ(b)

**General formula**: For n = p₁^a₁ × p₂^a₂ × ... × pₖ^aₖ:

φ(n) = n × (1 - 1/p₁) × (1 - 1/p₂) × ... × (1 - 1/pₖ)

Or equivalently:
φ(n) = n × ∏(1 - 1/pᵢ) for each distinct prime factor pᵢ

**Example: φ(12) where 12 = 2² × 3**
- φ(12) = 12 × (1 - 1/2) × (1 - 1/3)
- φ(12) = 12 × (1/2) × (2/3)
- φ(12) = 12 × 2/6 = 4 ✓

</details>

<details>
<summary>Hint 3: Efficient Implementation</summary>

**Computing φ(n) via factorization:**

```
phi(n):
    result = n

    # Factor out all 2s
    if n mod 2 == 0:
        result -= result / 2  # Multiply by (1 - 1/2)
        while n mod 2 == 0:
            n = n / 2

    # Factor out odd primes
    p = 3
    while p * p <= n:
        if n mod p == 0:
            result -= result / p  # Multiply by (1 - 1/p)
            while n mod p == 0:
                n = n / p
        p += 2

    # If n > 1, then n is a prime factor
    if n > 1:
        result -= result / n

    return result
```

**Why this works:**
- For each prime factor p, we multiply result by (1 - 1/p) = (p-1)/p
- This is equivalent to: result = result - result/p
- We don't need the exponents—only distinct primes matter

**Time complexity**: O(√n)
**Space complexity**: O(1)

**For computing φ for all numbers 1 to N** (sieve approach):
```
phi_sieve(N):
    phi = [i for i in 0 to N]  # Initialize phi[i] = i
    for p from 2 to N:
        if phi[p] == p:  # p is prime
            for m from p to N step p:
                phi[m] -= phi[m] / p
    return phi
```

Time: O(N log log N), Space: O(N)

</details>

---

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute force (check all) | O(n log n) | O(1) | n GCD calls |
| Formula with factorization | O(√n) | O(1) | Factor n, apply formula |
| Sieve (all φ up to N) | O(N log log N) | O(N) | Similar to prime sieve |

**Why factorization is faster:**
- Only need distinct prime factors, not all coprimes
- Factorization takes O(√n)
- Formula application is O(number of distinct primes) = O(log n)

---

## Key Concept

**Euler's Totient Function φ(n)**

**Definition**: φ(n) = count of integers in [1, n] coprime to n.

**Key properties:**

1. **φ(1) = 1** (by convention)

2. **φ(p) = p - 1** for prime p

3. **φ(p^k) = p^(k-1) × (p - 1)** for prime power

4. **Multiplicative**: φ(mn) = φ(m) × φ(n) when gcd(m, n) = 1

5. **Product formula**: φ(n) = n × ∏(1 - 1/p) for primes p dividing n

6. **Divisor sum**: Σ(φ(d)) for all d dividing n equals n

**Applications:**

- **RSA**: Key generation uses φ(n) = (p-1)(q-1) for n = p × q
- **Euler's theorem**: a^φ(n) ≡ 1 (mod n) when gcd(a, n) = 1
- **Counting**: φ(n) fractions k/n with 1 ≤ k ≤ n are in lowest terms

**Values table:**

| n | φ(n) | Coprimes |
|---|------|----------|
| 1 | 1 | {1} |
| 2 | 1 | {1} |
| 6 | 2 | {1, 5} |
| 8 | 4 | {1, 3, 5, 7} |
| 10 | 4 | {1, 3, 7, 9} |
| 12 | 4 | {1, 5, 7, 11} |

---

## Common Mistakes

1. **Forgetting φ(1) = 1**: The problem asks for coprimes in [1, n-1], but φ(1) is conventionally 1.

2. **Including n itself**: We count integers coprime to n in the range [1, n-1], not [1, n].

3. **Not simplifying the formula**: Using φ(n) = n × ∏(1 - 1/p) requires careful integer arithmetic. Better to use result -= result/p to avoid fractions.

4. **Missing a prime factor**: When factoring, don't forget to check if the remaining n > 1 after the loop—it's a prime factor.

5. **Confusing with counting divisors**: φ(n) counts coprimes, not divisors. Very different!

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Sum of coprimes | Sum (not count) coprimes | Sum = n × φ(n) / 2 for n > 1 |
| Count coprime pairs in range | Pairs (i, j) with gcd = 1 | Use inclusion-exclusion or Möbius |
| φ for all n up to N | Compute array of φ values | Sieve of Eratosthenes style |
| Product of coprimes | Multiply all coprimes | Result ≡ -1 (mod n) for n > 4 |
| Primitive roots | Find generator of group | Related to φ(φ(n)) |

**Sum of coprimes formula:**
For n > 1, the sum of all integers in [1, n-1] coprime to n is:
Sum = n × φ(n) / 2

**Why?** Coprimes come in pairs: if gcd(k, n) = 1, then gcd(n-k, n) = 1, and k + (n-k) = n.

---

## Practice Checklist

**Correctness:**

- [ ] Handles n = 1 (returns 1)
- [ ] Handles prime n (returns n - 1)
- [ ] Handles prime power (e.g., 8 → 4)
- [ ] Handles composite (e.g., 12 → 4)

**Understanding:**

- [ ] Can compute GCD using Euclidean algorithm
- [ ] Understands the product formula
- [ ] Knows why φ is multiplicative
- [ ] Can derive φ(p^k) from first principles

**Mastery:**

- [ ] Solved without hints
- [ ] Implemented O(√n) solution
- [ ] Can explain Euler's theorem application
- [ ] Understands RSA connection

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve (brute force)
- [ ] Day 3: Implement formula-based solution
- [ ] Day 7: Derive and explain the product formula
- [ ] Day 14: Implement sieve for all φ up to N

---

**Next Step:** [F023 - Digital Root](F023_digital_root.md) — Explore repeated digit sums and modular arithmetic
