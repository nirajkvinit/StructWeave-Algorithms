---
title: Number Theory Fundamentals
type: fundamentals
level: beginner
estimated_reading_time: 45
prerequisites: ["programming-basics"]
related_problems: ["F009", "F010", "F011", "F012", "F013", "F014", "F015", "F016", "F017"]
---

# Number Theory Fundamentals

> The mathematics of whole numbers—essential for algorithms, cryptography, and competitive programming.

Number theory is the branch of mathematics dealing with integers and their properties. While it may seem abstract, these concepts appear constantly in programming: from simplifying fractions to encrypting data to solving interview problems efficiently.

This guide covers the essential concepts you need before tackling number theory problems.

---

## Table of Contents

1. [Divisibility](#1-divisibility)
2. [GCD and HCF](#2-gcd-and-hcf)
3. [LCM (Least Common Multiple)](#3-lcm-least-common-multiple)
4. [Prime Numbers](#4-prime-numbers)
5. [Prime Factorization](#5-prime-factorization)
6. [Divisor Functions](#6-divisor-functions)
7. [Modular Arithmetic](#7-modular-arithmetic)
8. [Euler's Totient Function](#8-eulers-totient-function)
9. [Arithmetic Series](#9-arithmetic-series)
10. [Quick Reference](#10-quick-reference)
11. [Practice Path](#11-practice-path)

---

## 1. Divisibility

### What It Means

We say **a divides b** if b is a multiple of a—that is, b ÷ a leaves no remainder.

**Examples:**

```text
6 divides 18  ✓  because 18 = 6 × 3  (no remainder)
5 divides 18  ✗  because 18 = 5 × 3 + 3  (remainder 3)
```

### Checking Divisibility in Code

In programming, use the **modulo operator** (`%`):

```python
# "a divides b" is the same as "b % a == 0"

18 % 6  # → 0  (6 divides 18)
18 % 5  # → 3  (5 does NOT divide 18)

# Common patterns:
if n % 2 == 0:    # n is even
if n % 2 == 1:    # n is odd
if n % k == 0:    # n is divisible by k
```

### What Is Modulo? (The `%` Operator)

**`a mod b`** (written `a % b` in code) gives the **remainder** when a is divided by b.

```text
17 mod 5 = 2     because 17 = 5 × 3 + 2   → remainder is 2
20 mod 5 = 0     because 20 = 5 × 4 + 0   → divides evenly
7 mod 10 = 7     because 7 = 10 × 0 + 7   → when a < b, remainder is a
```

**The formula:**

```text
a mod b = a − (a ÷ b) × b       (where ÷ is integer division)

Example: 17 mod 5
         = 17 − (17 ÷ 5) × 5
         = 17 − 3 × 5
         = 17 − 15
         = 2
```

**Think of it as:** "What's left over after dividing as evenly as possible?"

```text
17 cookies shared among 5 people:
  Each person gets 3 cookies (17 ÷ 5 = 3)
  Cookies given out: 3 × 5 = 15
  Cookies left over: 17 − 15 = 2  ← this is 17 mod 5
```

Modulo appears throughout number theory: in the Euclidean algorithm for GCD, in modular arithmetic, and in cryptography.

### Why Divisibility Matters

Divisibility is the foundation for:

| Concept | How Divisibility Helps |
|---------|------------------------|
| **GCD/LCM** | Finding common factors between numbers |
| **Prime testing** | A prime has no divisors except 1 and itself |
| **Factorization** | Breaking numbers into prime components |
| **Modular arithmetic** | Working with remainders |

### Divisors of a Number

The **divisors** (or factors) of n are all positive integers that divide n.

```text
Divisors of 12: 1, 2, 3, 4, 6, 12
Divisors of 28: 1, 2, 4, 7, 14, 28
Divisors of 17: 1, 17  (prime — only 1 and itself)
```

**The Naive Approach (Slow):**

Check every number from 1 to n:

```python
def get_divisors_slow(n):
    divisors = []
    for i in range(1, n + 1):
        if n % i == 0:
            divisors.append(i)
    return divisors
```

For n = 1,000,000, this checks 1 million numbers. Can we do better?

**Key Insight: Divisors Come in Pairs**

When you find one divisor, you automatically find another:

```text
For n = 12:
  12 ÷ 1 = 12   →  pair: (1, 12)
  12 ÷ 2 = 6    →  pair: (2, 6)
  12 ÷ 3 = 4    →  pair: (3, 4)
```

Notice: once we reach 3, the "other half" of the pair (4) is smaller than 3. We've found all pairs!

**The Rule:** If `i` is a divisor of `n`, then `n ÷ i` is also a divisor. These pairs "meet in the middle" at √n (the **square root** of n).

```text
For n = 36:
  Small divisor → Large divisor
       1        →      36
       2        →      18
       3        →      12
       4        →       9
       6        →       6   ← they meet at √36 = 6
```

**Why √n? (The Square Root Bound)**

If n = a × b, then at least one of a or b must be ≤ √n.

```text
Proof by contradiction:
  Assume both a > √n AND b > √n
  Then a × b > √n × √n = n
  But we said a × b = n — contradiction!

  Therefore, at least one factor must be ≤ √n.
```

This means: once you've checked all numbers up to √n, you've found every divisor pair. No need to check beyond.

**The Optimized Approach (Square Root Optimization):**

Only check numbers up to √n. For each divisor found, add both it AND its pair:

```python
def get_divisors(n):
    divisors = []
    i = 1

    # Only go up to √n (i.e., while i² ≤ n)
    while i * i <= n:
        if n % i == 0:
            divisors.append(i)        # Add the small divisor
            if i != n // i:           # If pair is different...
                divisors.append(n // i)  # ...add the large divisor too
        i += 1

    return sorted(divisors)

# get_divisors(36) → [1, 2, 3, 4, 6, 9, 12, 18, 36]
```

**Why `if i != n // i`?**

For perfect squares, the middle pair is the same number twice:

```text
n = 36:  √36 = 6,  and 36 ÷ 6 = 6
         The pair (6, 6) would add 6 twice without this check.

n = 12:  √12 ≈ 3.46, so we check i = 1, 2, 3
         No pair is identical, so the check doesn't matter here.
```

**Time Complexity:** O(√n) — checking 1,000 numbers instead of 1,000,000 for n = 10⁶

---

## 2. GCD and HCF

### What Is GCD?

The **Greatest Common Divisor (GCD)**, also called **Highest Common Factor (HCF)**, is the largest positive integer that divides both numbers.

```text
GCD(12, 18) = 6
  Divisors of 12: 1, 2, 3, 4, 6, 12
  Divisors of 18: 1, 2, 3, 6, 9, 18
  Common: 1, 2, 3, 6
  Greatest: 6
```

**Note:** GCD and HCF are the same thing—different names used in different regions.

### The Euclidean Algorithm

The naive approach (list all divisors) is slow. The **Euclidean algorithm** is fast and elegant:

```text
GCD(a, b) = GCD(b, a mod b)
Base case: GCD(a, 0) = a
```

**Why it works:** Any common divisor of a and b also divides (a mod b).

#### Step-by-Step Example: GCD(48, 18)

```text
Step 1: GCD(48, 18)
        48 mod 18 = 12
        → GCD(18, 12)

Step 2: GCD(18, 12)
        18 mod 12 = 6
        → GCD(12, 6)

Step 3: GCD(12, 6)
        12 mod 6 = 0
        → GCD(6, 0)

Step 4: GCD(6, 0) = 6  ✓

Answer: GCD(48, 18) = 6
```

#### Summary Table

| Step | Dividend (a) | Divisor (b) | Remainder (a mod b) | Equation |
|------|--------------|-------------|---------------------|----------|
| 1    | 48           | 18          | 12                  | 48 = 18 × 2 + 12 |
| 2    | 18           | 12          | 6                   | 18 = 12 × 1 + 6 |
| 3    | 12           | 6           | 0                   | 12 = 6 × 2 + 0 |

**Key Rule:** When the remainder becomes 0, the divisor in that step is the GCD.

**The division equation:** Each step follows the form `a = b × q + r` where:
- a = dividend, b = divisor, q = quotient, r = remainder

#### Visual Trace

```text
GCD(48, 18)
    │
    ▼ 48 = 18×2 + 12
GCD(18, 12)
    │
    ▼ 18 = 12×1 + 6
GCD(12, 6)
    │
    ▼ 12 = 6×2 + 0
GCD(6, 0) = 6
```

### GCD Implementation

**Iterative (recommended):**

```python
def gcd(a, b):
    while b != 0:
        a, b = b, a % b
    return a
```

**Recursive:**

```python
def gcd(a, b):
    if b == 0:
        return a
    return gcd(b, a % b)
```

**Using built-in:**

```python
import math
math.gcd(48, 18)  # → 6

# Python 3.9+: GCD of multiple numbers
math.gcd(12, 18, 24)  # → 6
```

### Properties of GCD

```text
GCD(a, b) = GCD(b, a)                    Commutative
GCD(a, GCD(b, c)) = GCD(GCD(a, b), c)    Associative
GCD(a, 0) = a                            Identity
GCD(a, a) = a                            Self
GCD(a, 1) = 1                            One divides everything
GCD(a, b) = GCD(a - b, b) if a > b       Subtraction form (slower)
```

### GCD of Multiple Numbers

Use the associative property: GCD(a, b, c) = GCD(GCD(a, b), c)

```python
from functools import reduce

def gcd_of_array(arr):
    return reduce(gcd, arr)

# gcd_of_array([12, 18, 24]) → 6
```

**Optimization:** If GCD becomes 1, stop early—it can't get smaller.

### Coprime Numbers

Two numbers are **coprime** (or relatively prime) if GCD(a, b) = 1.

```text
GCD(8, 15) = 1  → 8 and 15 are coprime
GCD(8, 12) = 4  → 8 and 12 are NOT coprime
```

Coprime doesn't mean prime! 8 and 15 are both composite, but they're coprime.

### Time Complexity

The Euclidean algorithm runs in **O(log(min(a, b)))** time.

Worst case occurs with consecutive Fibonacci numbers (e.g., GCD(21, 13)).

---

## 3. LCM (Least Common Multiple)

### What Is LCM?

The **Least Common Multiple (LCM)** is the smallest positive integer divisible by both numbers.

```text
LCM(4, 6) = 12
  Multiples of 4: 4, 8, 12, 16, 20, 24...
  Multiples of 6: 6, 12, 18, 24, 30...
  Common: 12, 24, 36...
  Least: 12
```

### The GCD-LCM Relationship

The key formula connecting LCM and GCD:

```text
LCM(a, b) = (a × b) / GCD(a, b)
```

**Why it works:** a × b counts the common factors twice. Dividing by GCD removes the duplication.

#### Example: LCM(12, 18)

```text
GCD(12, 18) = 6
LCM(12, 18) = (12 × 18) / 6 = 216 / 6 = 36

Verify: 36 ÷ 12 = 3 ✓  and  36 ÷ 18 = 2 ✓
```

### LCM Implementation

```python
def lcm(a, b):
    return (a * b) // gcd(a, b)

# Better (avoids overflow):
def lcm_safe(a, b):
    return (a // gcd(a, b)) * b
```

### LCM of Multiple Numbers

Like GCD, LCM is associative: LCM(a, b, c) = LCM(LCM(a, b), c)

```python
def lcm_of_array(arr):
    return reduce(lcm, arr)

# lcm_of_array([4, 6, 8]) → 24
```

**Warning:** LCM can grow very large. LCM(1, 2, 3, ..., 20) = 232,792,560.

### Properties of LCM

```text
LCM(a, b) = LCM(b, a)                    Commutative
LCM(a, LCM(b, c)) = LCM(LCM(a, b), c)    Associative
LCM(a, 1) = a                            Identity
LCM(a, a) = a                            Self
LCM(a, b) × GCD(a, b) = a × b            Key relationship
```

### Real-World Applications

| Application | Example |
|-------------|---------|
| **Scheduling** | Event A every 3 days, Event B every 5 days. When do they coincide? LCM(3,5) = 15 days |
| **Fractions** | Adding 1/4 + 1/6 requires LCD = LCM(4,6) = 12 |
| **Gear ratios** | Gears with 12 and 18 teeth align after LCM(12,18) = 36 rotations of a tooth |
| **Music** | Rhythms of 3 and 4 beats sync every LCM(3,4) = 12 beats |

---

## 4. Prime Numbers

### What Are Primes?

A **prime number** is a natural number greater than 1 that has exactly two divisors: 1 and itself.

```text
Prime:     2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31...
Composite: 4, 6, 8, 9, 10, 12, 14, 15, 16, 18...
Special:   1 is neither prime nor composite
```

**Note:** 2 is the only even prime number.

### Checking if a Number is Prime (Trial Division)

To check if n is prime, test if any number from 2 to √n divides it.

```python
def is_prime(n):
    if n < 2:
        return False
    if n == 2:
        return True
    if n % 2 == 0:
        return False
    i = 3
    while i * i <= n:
        if n % i == 0:
            return False
        i += 2  # Only check odd numbers
    return True
```

**Why √n?** If n = a × b and both a,b > √n, then a × b > n. Contradiction. So at least one factor must be ≤ √n.

**Time complexity:** O(√n)

### The Sieve of Eratosthenes

To find **all primes up to n**, trial division on each number is slow. The **Sieve of Eratosthenes** is much faster.

**Algorithm:**

1. Create a boolean array of size n+1, all true
2. Mark 0 and 1 as not prime
3. For each prime p starting from 2:
   * Mark all multiples of p (from p²) as composite
4. Numbers still marked true are prime

#### Visual Example: Primes up to 30

```text
Initial:  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30
          T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T

After 2:  2  3  X  5  X  7  X  9  X 11  X 13  X 15  X 17  X 19  X 21  X 23  X 25  X 27  X 29  X

After 3:  2  3  X  5  X  7  X  X  X 11  X 13  X  X  X 17  X 19  X  X  X 23  X 25  X  X  X 29  X

After 5:  2  3  X  5  X  7  X  X  X 11  X 13  X  X  X 17  X 19  X  X  X 23  X  X  X  X  X 29  X

Primes:   2  3     5     7        11    13          17    19          23                29
```

#### Implementation

```python
def sieve_of_eratosthenes(n):
    if n < 2:
        return []

    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False

    p = 2
    while p * p <= n:
        if is_prime[p]:
            # Mark multiples of p starting from p²
            for multiple in range(p * p, n + 1, p):
                is_prime[multiple] = False
        p += 1

    return [i for i in range(n + 1) if is_prime[i]]

# sieve_of_eratosthenes(30) → [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
```

**Time complexity:** O(n log log n) — nearly linear
**Space complexity:** O(n)

### Prime Counting

The number of primes up to n is approximately n / ln(n).

| n | Actual primes | Approximation |
|---|---------------|---------------|
| 100 | 25 | 22 |
| 1,000 | 168 | 145 |
| 10,000 | 1,229 | 1,086 |
| 1,000,000 | 78,498 | 72,382 |

---

## 5. Prime Factorization

### The Fundamental Theorem of Arithmetic

Every integer greater than 1 can be uniquely expressed as a product of prime powers:

```text
n = p₁^a₁ × p₂^a₂ × ... × pₖ^aₖ
```

**Examples:**

```text
60 = 2² × 3 × 5
84 = 2² × 3 × 7
100 = 2² × 5²
360 = 2³ × 3² × 5
```

### Finding Prime Factorization

```python
def prime_factorization(n):
    factors = {}
    d = 2
    while d * d <= n:
        while n % d == 0:
            factors[d] = factors.get(d, 0) + 1
            n //= d
        d += 1
    if n > 1:  # Remaining prime factor
        factors[n] = 1
    return factors

# prime_factorization(360) → {2: 3, 3: 2, 5: 1}
# Meaning: 360 = 2³ × 3² × 5¹
```

**Time complexity:** O(√n)

### Using Prime Factorization for GCD and LCM

If you have prime factorizations:

* **GCD:** Take minimum power of each prime
* **LCM:** Take maximum power of each prime

**Example: GCD and LCM of 12 and 18**

```text
12 = 2² × 3¹
18 = 2¹ × 3²

GCD = 2^min(2,1) × 3^min(1,2) = 2¹ × 3¹ = 6
LCM = 2^max(2,1) × 3^max(1,2) = 2² × 3² = 36
```

---

## 6. Divisor Functions

### Counting Divisors: τ(n) or d(n)

The number of divisors of n can be computed from its prime factorization:

```text
If n = p₁^a₁ × p₂^a₂ × ... × pₖ^aₖ
Then τ(n) = (a₁ + 1) × (a₂ + 1) × ... × (aₖ + 1)
```

**Example: How many divisors does 360 have?**

```text
360 = 2³ × 3² × 5¹
τ(360) = (3+1) × (2+1) × (1+1) = 4 × 3 × 2 = 24 divisors
```

**Why this formula?** Each divisor is formed by choosing a power of each prime from 0 to its maximum. That's (aᵢ + 1) choices per prime.

### Sum of Divisors: σ(n)

The sum of all divisors of n:

```text
If n = p₁^a₁ × p₂^a₂ × ... × pₖ^aₖ
Then σ(n) = [(p₁^(a₁+1) - 1)/(p₁ - 1)] × [(p₂^(a₂+1) - 1)/(p₂ - 1)] × ...
```

**Simpler form for single prime power:**

```text
σ(p^a) = 1 + p + p² + ... + p^a = (p^(a+1) - 1) / (p - 1)
```

**Example: σ(12)**

```text
12 = 2² × 3¹

σ(2²) = 1 + 2 + 4 = 7 = (2³ - 1)/(2 - 1) = 7/1 = 7
σ(3¹) = 1 + 3 = 4 = (3² - 1)/(3 - 1) = 8/2 = 4

σ(12) = 7 × 4 = 28

Verify: 1 + 2 + 3 + 4 + 6 + 12 = 28 ✓
```

### Special Numbers Based on Divisor Sum

| Type | Definition | Examples |
|------|------------|----------|
| **Perfect** | σ(n) - n = n | 6, 28, 496 |
| **Abundant** | σ(n) - n > n | 12, 18, 20 |
| **Deficient** | σ(n) - n < n | 1, 2, 3, 4, 5, 7, 8, 9, 10 |
| **Amicable** | σ(a) - a = b and σ(b) - b = a | (220, 284) |

**Perfect number example:**

```text
Divisors of 6: 1, 2, 3, 6
Proper divisors (excluding 6): 1, 2, 3
Sum: 1 + 2 + 3 = 6 = the number itself ✓
```

---

## 7. Modular Arithmetic

### What Is It?

**Modular arithmetic** is "clock arithmetic"—numbers wrap around after reaching a certain value (the **modulus**).

```text
13 mod 12 = 1    (13 o'clock is 1 PM)
27 mod 12 = 3    (27 hours from midnight is 3 AM)
```

**Notation:** a ≡ b (mod m) means a and b have the same remainder when divided by m.

```text
17 ≡ 5 (mod 12)   because 17 mod 12 = 5 mod 12 = 5
23 ≡ 2 (mod 7)    because 23 mod 7 = 2 mod 7 = 2
```

### Why It Matters

1. **Prevent overflow:** Keep numbers small during computation
2. **Cryptography:** RSA, hashing, digital signatures
3. **Competitive programming:** "Output answer mod 10^9+7"
4. **Hash functions:** Distributing data across buckets

### Modular Arithmetic Properties

Modular arithmetic preserves addition, subtraction, and multiplication:

```text
(a + b) mod m = ((a mod m) + (b mod m)) mod m
(a - b) mod m = ((a mod m) - (b mod m) + m) mod m    # +m handles negatives
(a × b) mod m = ((a mod m) × (b mod m)) mod m
(a^n) mod m   = ((a mod m)^n) mod m
```

**Example: Find last 3 digits of 7^100**

Last 3 digits = number mod 1000

Use modular exponentiation (see below).

### Modular Exponentiation

Computing a^n mod m directly would overflow. Instead, use **binary exponentiation**:

```python
def pow_mod(base, exp, mod):
    result = 1
    base = base % mod
    while exp > 0:
        if exp % 2 == 1:  # If exp is odd
            result = (result * base) % mod
        exp = exp >> 1    # exp = exp // 2
        base = (base * base) % mod
    return result

# pow_mod(7, 100, 1000) → 1
# Last 3 digits of 7^100 are 001
```

**Time complexity:** O(log n) — exponentially faster than naive approach

**Python built-in:** `pow(base, exp, mod)` does this automatically.

### Modular Inverse

The **modular inverse** of a (mod m) is a number x such that:

```text
a × x ≡ 1 (mod m)
```

Written as a⁻¹ (mod m).

**Example:** What is 3⁻¹ (mod 7)?

```text
3 × x ≡ 1 (mod 7)
3 × 5 = 15 = 2×7 + 1 ≡ 1 (mod 7)
So 3⁻¹ ≡ 5 (mod 7)
```

**When does it exist?** a⁻¹ (mod m) exists if and only if GCD(a, m) = 1.

**Finding it:**

```python
# Method 1: Fermat's Little Theorem (only when m is prime)
# a^(-1) ≡ a^(m-2) (mod m)
def mod_inverse_fermat(a, m):
    return pow(a, m - 2, m)

# Method 2: Extended Euclidean Algorithm (works for any coprime a, m)
def extended_gcd(a, b):
    if a == 0:
        return b, 0, 1
    gcd, x1, y1 = extended_gcd(b % a, a)
    x = y1 - (b // a) * x1
    y = x1
    return gcd, x, y

def mod_inverse(a, m):
    gcd, x, _ = extended_gcd(a % m, m)
    if gcd != 1:
        return None  # Inverse doesn't exist
    return (x % m + m) % m
```

### Fermat's Little Theorem

If p is prime and GCD(a, p) = 1:

```text
a^(p-1) ≡ 1 (mod p)
```

**Useful for:** Finding modular inverses when modulus is prime.

```text
a^(-1) ≡ a^(p-2) (mod p)
```

---

## 8. Euler's Totient Function

### What Is Euler's Totient?

**Euler's totient function φ(n)** counts how many integers from 1 to n are **coprime** with n.

```text
φ(10) = 4
  Numbers 1-10: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
  Coprime with 10 (GCD = 1): 1, 3, 7, 9
  Count: 4
```

### Totient Formula

From prime factorization:

```text
φ(n) = n × (1 - 1/p₁) × (1 - 1/p₂) × ... × (1 - 1/pₖ)
```

Or equivalently:

```text
φ(n) = n × ∏(1 - 1/p) for all prime p dividing n
```

### Totient Examples

```text
φ(12) = ?
  12 = 2² × 3
  φ(12) = 12 × (1 - 1/2) × (1 - 1/3)
        = 12 × (1/2) × (2/3)
        = 12 × 1/3
        = 4

  Verify: Numbers 1-12 coprime with 12: 1, 5, 7, 11 → 4 numbers ✓

φ(p) = p - 1  for any prime p
  φ(7) = 6   (all numbers 1-6 are coprime with 7)

φ(p^k) = p^k - p^(k-1) = p^(k-1) × (p - 1)
  φ(8) = φ(2³) = 2² × (2-1) = 4
  Coprime with 8: 1, 3, 5, 7 → 4 numbers ✓
```

### Computing φ(n)

```python
def euler_totient(n):
    result = n
    p = 2
    while p * p <= n:
        if n % p == 0:
            # Remove all factors of p
            while n % p == 0:
                n //= p
            # Apply formula: result *= (1 - 1/p) = result - result/p
            result -= result // p
        p += 1
    if n > 1:  # n is a remaining prime factor
        result -= result // n
    return result

# euler_totient(12) → 4
# euler_totient(36) → 12
```

### Totient Properties

```text
φ(1) = 1
φ(p) = p - 1                    for prime p
φ(p^k) = p^(k-1) × (p - 1)      for prime power
φ(m × n) = φ(m) × φ(n)          if GCD(m, n) = 1 (multiplicative)
```

### Euler's Theorem

Generalization of Fermat's Little Theorem:

If GCD(a, n) = 1:

```text
a^φ(n) ≡ 1 (mod n)
```

**Application:** Finding modular inverses when modulus is not prime.

```text
a^(-1) ≡ a^(φ(n)-1) (mod n)   when GCD(a, n) = 1
```

---

## 9. Arithmetic Series

### Sum of First n Natural Numbers

```text
1 + 2 + 3 + ... + n = n(n+1)/2
```

**Visual proof (Gauss's trick):**

```text
S   =  1  +  2  +  3  + ... + n
S   =  n  + n-1 + n-2 + ... + 1
─────────────────────────────────
2S  = (n+1) + (n+1) + ... + (n+1)  [n terms]
2S  = n(n+1)
S   = n(n+1)/2
```

### Sum of First n Squares

```text
1² + 2² + 3² + ... + n² = n(n+1)(2n+1)/6
```

### Sum of First n Cubes

```text
1³ + 2³ + 3³ + ... + n³ = [n(n+1)/2]² = (1+2+...+n)²
```

### Arithmetic Progression

A sequence where each term differs by a constant **d**:

```text
a, a+d, a+2d, a+3d, ...
```

**nth term:** aₙ = a + (n-1)d

**Sum of n terms:** Sₙ = n/2 × (first + last) = n/2 × (2a + (n-1)d)

### Sum of Multiples

Sum of all multiples of k up to n:

```text
k + 2k + 3k + ... + mk = k(1 + 2 + ... + m) = k × m(m+1)/2
```

where m = n // k (count of multiples)

**Example:** Sum of multiples of 3 below 100

```text
m = 99 // 3 = 33    (33 multiples: 3, 6, 9, ..., 99)
Sum = 3 × 33 × 34 / 2 = 1683
```

---

## 10. Quick Reference

### Essential Formulas

| Formula | Description |
|---------|-------------|
| `GCD(a, b) = GCD(b, a mod b)` | Euclidean algorithm |
| `LCM(a, b) = (a × b) / GCD(a, b)` | LCM from GCD |
| `LCM(a, b) × GCD(a, b) = a × b` | Product relationship |
| `τ(n) = ∏(aᵢ + 1)` | Divisor count from prime factorization |
| `1 + 2 + ... + n = n(n+1)/2` | Sum of natural numbers |
| `a^(p-1) ≡ 1 (mod p)` | Fermat's Little Theorem (p prime) |
| `a^φ(n) ≡ 1 (mod n)` | Euler's Theorem (GCD(a,n) = 1) |

### Algorithm Complexities

| Algorithm | Time | Space |
|-----------|------|-------|
| GCD (Euclidean) | O(log min(a,b)) | O(1) |
| Prime test (trial division) | O(√n) | O(1) |
| Sieve of Eratosthenes | O(n log log n) | O(n) |
| Prime factorization | O(√n) | O(log n) |
| Modular exponentiation | O(log exp) | O(1) |
| Euler's totient | O(√n) | O(1) |

### Common Gotchas

| Issue | Solution |
|-------|----------|
| Integer overflow in LCM | Compute `(a // gcd) * b` instead of `(a * b) // gcd` |
| Negative mod results | Use `((a % m) + m) % m` |
| GCD(0, 0) undefined | Handle as special case |
| Sieve memory for large n | Use segmented sieve |
| Modular division | Multiply by modular inverse instead |

---

## 11. Practice Path

### Foundation Problems Sequence

Start with these problems in order:

| Problem | Concept | Prerequisite |
|---------|---------|--------------|
| [F001](../problems/foundation/F001_multiples_of_3_or_5.md) | Modulo, loops | None |
| [F009](../problems/foundation/F009_smallest_multiple.md) | LCM, GCD | Divisibility |
| [F010](../problems/foundation/F010_10001st_prime.md) | Prime testing | Primes concept |
| [F011](../problems/foundation/F011_summation_of_primes.md) | Sieve | F010 |
| [F012](../problems/foundation/F012_largest_prime_factor.md) | Factorization | F010 |
| [F013](../problems/foundation/F013_gcd_of_array.md) | GCD reduction | F009 |
| [F014](../problems/foundation/F014_coprime_pairs.md) | Totient | F013 |
| [F015](../problems/foundation/F015_highly_divisible_triangular_number.md) | Divisor formula | F012 |
| [F016](../problems/foundation/F016_counting_divisors.md) | τ(n) | F015 |
| [F017](../problems/foundation/F017_perfect_numbers.md) | σ(n) | F016 |
| [F028](../problems/foundation/F028_self_powers.md) | Modular exponentiation | F001 |

### Recommended Learning Order

```text
Week 1: Divisibility Basics
├── Read: Sections 1-3 (Divisibility, GCD, LCM)
├── Solve: F001, F009
└── Practice: Implement GCD/LCM from scratch

Week 2: Prime Numbers
├── Read: Sections 4-5 (Primes, Factorization)
├── Solve: F010, F011, F012
└── Practice: Implement sieve, factorization

Week 3: Divisor Functions
├── Read: Section 6 (Divisor Functions)
├── Solve: F015, F016, F017
└── Practice: Implement divisor counting

Week 4: Modular Arithmetic
├── Read: Sections 7-8 (Modular, Totient)
├── Solve: F013, F014, F028
└── Practice: Implement modular exponentiation
```

### Self-Assessment Checklist

**Fundamentals:**

* [ ] Can implement Euclidean GCD without looking it up
* [ ] Can derive LCM from GCD
* [ ] Can test primality efficiently
* [ ] Can generate primes with a sieve

**Intermediate:**

* [ ] Can factor a number into primes
* [ ] Can count divisors from factorization
* [ ] Can compute modular exponentiation
* [ ] Understand when modular inverse exists

**Advanced:**

* [ ] Can compute Euler's totient
* [ ] Can solve linear Diophantine equations
* [ ] Can apply Chinese Remainder Theorem
* [ ] Can optimize with number theory insights

---

## Summary

Number theory provides the mathematical foundation for many algorithms:

1. **GCD/LCM** — Essential for fractions, scheduling, cryptography
2. **Primes** — Building blocks of integers, key to factorization
3. **Modular arithmetic** — Keeps numbers manageable, enables cryptography
4. **Divisor functions** — Counting and summing factors efficiently
5. **Euler's totient** — Counting coprimes, generalizing Fermat

Master these concepts, and you'll have the tools to solve a wide range of problems efficiently.

---

**Next Steps:**

* Start with [F009: Smallest Multiple](../problems/foundation/F009_smallest_multiple.md) to apply GCD/LCM
* Try [F010: 10001st Prime](../problems/foundation/F010_10001st_prime.md) to practice primality testing
* Explore [Number Theory Drill](../practice/math-drills/number-theory-drill.md) for advanced challenges

---

*"The integers are the building blocks of mathematics. Understanding their structure unlocks efficient solutions to countless problems."*
