---
id: F026
slug: perfect-numbers
title: Perfect Numbers
difficulty: foundation
topics: ["math", "divisors", "number-theory"]
patterns: []
estimated_time_minutes: 12
prerequisites: ["programming-basics"]
---

# Perfect Numbers

## Problem

A **perfect number** is a positive integer that equals the sum of its proper divisors (all positive divisors excluding the number itself).

**Example**: 6 is perfect because its proper divisors are 1, 2, 3, and 1 + 2 + 3 = 6.

Given a positive integer n, determine if it is a perfect number.

**Bonus**: Find all perfect numbers up to a given limit.

## Why This Matters

Perfect numbers connect to deep mathematics and practical programming skills:

**1. Ancient Mathematics**: Perfect numbers were studied by Pythagoras (500 BCE) and Euclid (300 BCE). Euclid proved that if 2^p - 1 is prime (a Mersenne prime), then 2^(p-1) × (2^p - 1) is perfect.

**2. Divisor Sum Function σ(n)**: The sum-of-divisors function is fundamental in number theory:
- σ(n) = sum of all divisors of n (including n)
- Proper divisor sum = σ(n) - n
- A number is perfect when σ(n) = 2n

**3. Classification of Numbers**:
- **Perfect**: σ(n) = 2n (equals its proper divisors)
- **Deficient**: σ(n) < 2n (most numbers)
- **Abundant**: σ(n) > 2n (e.g., 12: 1+2+3+4+6 = 16 > 12)

**4. Efficient Divisor Finding**: This problem teaches the √n optimization—checking divisors only up to √n since divisors come in pairs.

**5. Open Problems**:
- Are there any odd perfect numbers? (Unknown—none found, not proven impossible)
- Are there infinitely many even perfect numbers? (Unknown—depends on Mersenne primes)

## Examples

**Example 1:**

- Input: `n = 6`
- Output: `true`
- Explanation: Divisors of 6 are 1, 2, 3, 6. Proper divisors: 1 + 2 + 3 = 6. ✓

**Example 2:**

- Input: `n = 28`
- Output: `true`
- Explanation: Proper divisors: 1, 2, 4, 7, 14. Sum = 1 + 2 + 4 + 7 + 14 = 28. ✓

**Example 3:**

- Input: `n = 12`
- Output: `false`
- Explanation: Proper divisors: 1, 2, 3, 4, 6. Sum = 16 ≠ 12. (Abundant)

**Example 4:**

- Input: `n = 1`
- Output: `false`
- Explanation: 1 has no proper divisors (sum = 0).

## Constraints

- 1 <= n <= 10^8
- Return true if n is a perfect number, false otherwise

## Think About

1. How do you efficiently find all divisors of a number?
2. Why do divisors come in pairs, and how does this help?
3. What's special about the divisor √n?
4. How many perfect numbers exist below 10^8?

---

## Approach Hints

<details>
<summary>Hint 1: Finding Divisors Efficiently</summary>

**Naive approach** (O(n)):
```
sum_proper_divisors(n):
    sum = 0
    for i from 1 to n - 1:
        if n mod i == 0:
            sum += i
    return sum
```

**Optimization insight**: Divisors come in pairs.

If d divides n, then n/d also divides n.
- 28 ÷ 2 = 14, so both 2 and 14 are divisors
- 28 ÷ 4 = 7, so both 4 and 7 are divisors

**Optimized approach** (O(√n)):
```
sum_proper_divisors(n):
    if n == 1:
        return 0
    sum = 1  # 1 is always a proper divisor for n > 1
    i = 2
    while i * i <= n:
        if n mod i == 0:
            sum += i
            if i != n / i:  # Don't double-count perfect squares
                sum += n / i
        i += 1
    return sum
```

**Why check i * i <= n?**
- For any divisor d > √n, there's a corresponding divisor n/d < √n
- We find both when we find the smaller one

</details>

<details>
<summary>Hint 2: Complete Solution</summary>

```
is_perfect(n):
    if n <= 1:
        return false

    sum = 1  # 1 is always a proper divisor
    i = 2
    while i * i <= n:
        if n mod i == 0:
            sum += i
            if i * i != n:  # Not a perfect square
                sum += n / i
        i += 1

    return sum == n
```

**Tracing for n = 28:**
- Start: sum = 1
- i = 2: 28 % 2 == 0 → sum += 2 + 14 = 17
- i = 3: 28 % 3 ≠ 0
- i = 4: 28 % 4 == 0 → sum += 4 + 7 = 28
- i = 5: 5 * 5 = 25 < 28, but 28 % 5 ≠ 0
- i = 6: 6 * 6 = 36 > 28, exit loop
- sum = 28 = n ✓

**Finding all perfect numbers up to N:**
```
find_all_perfect(N):
    result = []
    for n from 2 to N:
        if is_perfect(n):
            result.append(n)
    return result
```

</details>

<details>
<summary>Hint 3: Using the Euclid-Euler Formula</summary>

**Theorem (Euclid)**: If 2^p - 1 is prime, then 2^(p-1) × (2^p - 1) is perfect.

**Theorem (Euler)**: Every even perfect number has this form.

**Known Mersenne primes** (primes of form 2^p - 1):
- p = 2: 2^2 - 1 = 3 → Perfect: 2^1 × 3 = 6
- p = 3: 2^3 - 1 = 7 → Perfect: 2^2 × 7 = 28
- p = 5: 2^5 - 1 = 31 → Perfect: 2^4 × 31 = 496
- p = 7: 2^7 - 1 = 127 → Perfect: 2^6 × 127 = 8128

**For small limits**, you can directly check these known values:
```
KNOWN_PERFECT = [6, 28, 496, 8128, 33550336]

is_perfect_fast(n):
    return n in KNOWN_PERFECT
```

**For generating perfect numbers:**
```
generate_perfect_numbers():
    # For each Mersenne prime exponent
    for p in [2, 3, 5, 7, 13, 17, 19, 31, ...]:
        if is_prime(2^p - 1):
            yield 2^(p-1) * (2^p - 1)
```

Only 51 Mersenne primes are known as of 2024, corresponding to 51 known perfect numbers.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Naive divisor check | O(n) | O(1) | Check all numbers 1 to n-1 |
| Optimized (√n) | O(√n) | O(1) | Check only up to √n |
| Lookup table | O(1) | O(k) | k = number of known perfects; limited |

**For finding all perfect numbers up to N:**
- Naive per number: O(N × N) = O(N²)
- Optimized per number: O(N × √N) = O(N^1.5)
- Using Euclid-Euler: O(log N) perfects, each O(√perfect) to verify

---

## Key Concept

**Divisor Pairs and the √n Bound**

**Core insight**: Every divisor d < √n has a corresponding divisor n/d > √n.

**Proof**: If d divides n and d < √n, then n/d > √n (otherwise d × (n/d) < √n × √n = n).

**Consequence**: We only need to check divisors up to √n to find all divisors.

**Visual for n = 36:**
```
d:     1   2   3   4   6   9   12  18  36
n/d:   36  18  12  9   6   4   3   2   1
         ↑   ↑   ↑   ↑   ↑
       pairs around √36 = 6
```

**Perfect square special case**: When n is a perfect square, √n pairs with itself. Count it only once!

**The sum-of-divisors formula**: For n = p₁^a₁ × p₂^a₂ × ... × pₖ^aₖ:

σ(n) = ∏((pᵢ^(aᵢ+1) - 1) / (pᵢ - 1))

**Example: σ(28) where 28 = 2² × 7¹**
- σ(28) = ((2³ - 1)/(2 - 1)) × ((7² - 1)/(7 - 1))
- σ(28) = (7/1) × (48/6) = 7 × 8 = 56
- Proper divisor sum = 56 - 28 = 28 ✓

---

## Common Mistakes

1. **Including n in the sum**: Perfect numbers equal the sum of *proper* divisors (excluding n itself). Don't add n to the sum.

2. **Forgetting n = 1**: The number 1 has no proper divisors (sum = 0), so it's not perfect.

3. **Double-counting perfect squares**: When i² = n, don't count i twice. Check `i * i != n` before adding `n / i`.

4. **Starting i at 1**: If you start the loop at i = 1, you'd add both 1 and n (via n/1). Start at i = 2 and initialize sum = 1.

5. **Integer overflow**: For large n, sum of divisors can overflow. Use 64-bit integers.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Abundant numbers | σ(n) - n > n | Same divisor sum, different comparison |
| Deficient numbers | σ(n) - n < n | Same divisor sum, different comparison |
| Almost perfect | σ(n) - n = n - 1 | Powers of 2 are almost perfect |
| Multiply perfect | σ(n) = k × n | k-perfect numbers (perfect when k=2) |
| Amicable pairs | σ(a) - a = b, σ(b) - b = a | Check pairs, e.g., (220, 284) |
| Count divisors | Return d(n), not σ(n) | Count instead of sum |

**Amicable pairs example:**
- 220: proper divisors sum to 284
- 284: proper divisors sum to 220
- These are "amicable" (friendly) numbers

---

## Practice Checklist

**Correctness:**

- [ ] Returns false for n = 1
- [ ] Correctly identifies 6 and 28 as perfect
- [ ] Correctly identifies 12 as not perfect
- [ ] Handles perfect squares correctly

**Understanding:**

- [ ] Can explain divisor pairing
- [ ] Understands why √n is the bound
- [ ] Knows the Euclid-Euler formula
- [ ] Can classify numbers as perfect/abundant/deficient

**Mastery:**

- [ ] Solved without hints
- [ ] Implemented O(√n) solution
- [ ] Can find all perfect numbers under N
- [ ] Understands connection to Mersenne primes

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Implement from memory
- [ ] Day 7: Find first 4 perfect numbers
- [ ] Day 14: Solve amicable pairs variation

---

**Next Step:** [F027 - Armstrong Numbers](F027_armstrong_numbers.md) — Explore numbers equal to the sum of their own digit powers
