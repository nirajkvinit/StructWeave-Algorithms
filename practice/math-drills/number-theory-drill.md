---
title: Number Theory Drill
category: math-drills
difficulty: medium-hard
problem_count: 15
estimated_time_minutes: 300
---

# Number Theory Drill

> Master the mathematical foundations behind many algorithm problems

This drill covers essential number theory concepts that appear in competitive programming and quantitative interviews. Each section builds on previous concepts.

---

## Prerequisites

Before starting this drill, complete:
- Foundation problems F017-F020 (prime basics)
- Understand modular arithmetic fundamentals

---

## Section 1: Prime Properties

### Concepts

**Prime Testing**: A number n is prime if it has no divisors between 2 and sqrt(n).

**Prime Generation**: The Sieve of Eratosthenes marks composites, leaving primes.

### Problems

#### 1.1 Circular Primes

Find all primes below n where all rotations of the digits are also prime.

**Example**: 197 is circular because 197, 971, and 719 are all prime.

**Approach Hints:**
1. Generate all primes using a sieve
2. For each prime, generate all digit rotations
3. Check if all rotations are prime

**Key Insight**: Circular primes can only contain digits 1, 3, 7, 9 (except for 2 and 5).

---

#### 1.2 Truncatable Primes

Find primes that remain prime as you remove digits from left or right.

**Example**: 3797 is left-truncatable (3797, 797, 97, 7 all prime) and right-truncatable (3797, 379, 37, 3 all prime).

**Approach**: Build truncatable primes by extending known truncatable primes.

---

#### 1.3 Prime Digit Replacements

Find primes where replacing certain digits with the same digit yields prime families.

**Example**: 56**3 (where ** is same digit) yields primes for 0,1,2,5,6,7 (6 primes).

**Approach**: Generate primes, try all digit replacement patterns.

---

## Section 2: Divisors and Perfect Numbers

### Concepts

**Divisor Function**: d(n) = count of divisors, σ(n) = sum of divisors.

**Multiplicative Property**: For coprime a, b: d(ab) = d(a) × d(b).

### Problems

#### 2.1 Amicable Numbers

Find pairs where sum of proper divisors of each equals the other.

**Example**: 220 and 284 are amicable.
- Divisors of 220 (except 220): 1+2+4+5+10+11+20+22+44+55+110 = 284
- Divisors of 284 (except 284): 1+2+4+71+142 = 220

**Approach**: Compute divisor sums for all numbers, find pairs.

---

#### 2.2 Amicable Chains

Find the smallest member of the longest amicable chain.

**Example**: 12496 → 14288 → 15472 → 14536 → 14264 → 12496 (chain of 5).

**Approach**: Follow divisor sum chains, detect cycles.

---

#### 2.3 Abundant Numbers

A number n is abundant if σ(n) - n > n. Find all numbers that cannot be expressed as sum of two abundant numbers.

**Key Insight**: All integers greater than 28123 can be written as sum of two abundant numbers.

---

## Section 3: Modular Arithmetic

### Concepts

**Modular Exponentiation**: Compute a^b mod m efficiently using binary exponentiation.

**Fermat's Little Theorem**: If p is prime and gcd(a,p) = 1, then a^(p-1) ≡ 1 (mod p).

### Problems

#### 3.1 Large Power Last Digits

Find the last k digits of expressions like 2^7830457 + 3^7830457.

**Approach**: Use modular exponentiation with mod 10^k.

```
def pow_mod(base, exp, mod):
    result = 1
    base = base % mod
    while exp > 0:
        if exp % 2 == 1:
            result = (result * base) % mod
        exp = exp // 2
        base = (base * base) % mod
    return result
```

---

#### 3.2 Modular Inverse

Find x such that a × x ≡ 1 (mod m).

**Approach**: Use extended Euclidean algorithm or Fermat's theorem (if m is prime).

---

#### 3.3 Coin Partitions

Find the number of ways to partition n using coins of any denomination (1, 2, 3, ..., n).

**Key Formula**: Euler's partition function with pentagonal number theorem.

---

## Section 4: Totient Function

### Concepts

**Euler's Totient**: φ(n) = count of integers 1 to n that are coprime with n.

**Formula**: φ(n) = n × ∏(1 - 1/p) for each prime p dividing n.

### Problems

#### 4.1 Totient Maximum

Find n ≤ limit such that n/φ(n) is maximum.

**Key Insight**: Maximum is achieved when n is product of consecutive primes (2×3×5×7×...).

---

#### 4.2 Totient Permutation

Find n such that φ(n) is a permutation of n's digits and n/φ(n) is minimum.

**Key Insight**: n should be product of two primes close to sqrt(n).

---

#### 4.3 Counting Fractions

Count distinct reduced fractions a/b where a < b ≤ d.

**Answer**: Sum of φ(n) for n from 2 to d.

---

## Section 5: Special Number Types

### Concepts

**Figurate Numbers**: Triangular T(n) = n(n+1)/2, Pentagonal P(n) = n(3n-1)/2, Hexagonal H(n) = n(2n-1).

### Problems

#### 5.1 Pentagonal Numbers

Find the pair of pentagonal numbers P(j) and P(k) where P(j)+P(k) and P(k)-P(j) are both pentagonal, and D = P(k)-P(j) is minimized.

**Approach**: Generate pentagonal numbers, check differences.

---

#### 5.2 Triangular, Pentagonal, Hexagonal

Find numbers that are simultaneously triangular, pentagonal, and hexagonal.

**Key Insight**: Every hexagonal number is triangular. Find hexagonal numbers that are also pentagonal.

---

## Section 6: Advanced Challenges

#### 6.1 Prime Pair Sets

Find the smallest sum of a set of five primes where any two concatenate to form a prime.

**Approach**: Graph problem - find clique of size 5 in prime concatenation graph.

---

#### 6.2 Ordered Fractions

Find the numerator of the fraction immediately to the left of 3/7 in the sorted list of reduced fractions with denominator ≤ d.

**Approach**: Farey sequence properties or Stern-Brocot tree.

---

#### 6.3 Passcode Derivation

Given successful login attempts showing 3 digits each, find the shortest secret passcode.

**Approach**: Topological sort on digit ordering constraints.

---

## Self-Assessment

### Scoring

For each problem:
- **Solved optimally**: 3 points
- **Solved suboptimally**: 2 points
- **Solved with hints**: 1 point
- **Not solved**: 0 points

### Target Scores

| Level | Score | Interpretation |
|-------|-------|----------------|
| Beginner | 10-15 | Good start, review number theory basics |
| Intermediate | 20-30 | Solid understanding, ready for competitions |
| Advanced | 35-45 | Excellent, consider contest participation |

---

## Resources

### Formulas Reference

```
GCD: gcd(a, b) = gcd(b, a mod b)
LCM: lcm(a, b) = a × b / gcd(a, b)
Euler Totient: φ(p^k) = p^(k-1) × (p-1) for prime p
Divisor Count: d(p^k) = k + 1 for prime p
Sum of 1 to n: n(n+1)/2
Sum of 1² to n²: n(n+1)(2n+1)/6
```

### Related Foundation Problems

- F017: 10001st Prime
- F018: Summation of Primes (Sieve)
- F019: Largest Prime Factor
- F020: Highly Divisible Triangular

---

*"God made the integers, all else is the work of man."* — Leopold Kronecker
