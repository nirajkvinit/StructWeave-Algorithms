---
id: F016
euler_id: 48
slug: self-powers
title: Self Powers
difficulty: foundation
topics: ["math", "modular-arithmetic", "big-integers"]
patterns: []
estimated_time_minutes: 10
prerequisites: ["programming-basics"]
---

# Self Powers

## Problem

Calculate the last k digits of the sum 1^1 + 2^2 + 3^3 + ... + n^n. Each term in this series is a number raised to the power of itself.

For instance, when n = 10, the series is 1^1 + 2^2 + 3^3 + 4^4 + 5^5 + 6^6 + 7^7 + 8^8 + 9^9 + 10^10 = 10,405,071,317. The last 10 digits of this sum would be "0405071317".

## Why This Matters

This problem introduces modular arithmetic, a cornerstone technique in computer science and mathematics. When you only need the last k digits of a number, you can compute everything modulo 10^k, which prevents integer overflow and dramatically improves performance.

Modular arithmetic is fundamental to modern cryptography—RSA encryption relies on modular exponentiation to encrypt and decrypt messages. It's also essential in hash functions, random number generation, and distributed systems (consistent hashing). The ability to compute partial results (like "last k digits") without computing the full value is a powerful optimization technique used throughout competitive programming and real-world systems.

This problem also teaches you that mathematical operations can be performed in modular space: (a + b) mod m = ((a mod m) + (b mod m)) mod m. This property extends to multiplication and exponentiation, making it possible to work with astronomically large numbers efficiently.

## Examples

**Example 1:**

- Input: `n = 10, k = 10`
- Output: `"0405071317"`
- Explanation: 1^1 + 2^2 + ... + 10^10 = 10,405,071,317. The last 10 digits are "0405071317".

**Example 2:**

- Input: `n = 5, k = 5`
- Output: `"03413"`
- Explanation: 1^1 + 2^2 + 3^3 + 4^4 + 5^5 = 1 + 4 + 27 + 256 + 3125 = 3413. Padded to 5 digits: "03413".

## Constraints

- 1 <= n <= 1000
- 1 <= k <= 10
- Output should be a string of exactly k digits (pad with leading zeros if necessary)

## Think About

1. What's the simplest approach that works?
2. Do you need to compute the full value of n^n, or just part of it?
3. How does modular arithmetic help with large numbers?
4. What's the relationship between "last k digits" and modulo 10^k?

---

## Approach Hints

<details>
<summary>Hint 1: Getting Started</summary>

The naive approach is to compute each term i^i, sum them all up, convert to a string, and extract the last k digits. Python's arbitrary-precision integers make this straightforward for small values of n.

However, as n grows, the numbers become enormous. For example, 1000^1000 has over 3000 digits! Computing the full value is wasteful when you only need the last 10 digits.

</details>

<details>
<summary>Hint 2: Key Insight - Modular Arithmetic</summary>

To find the last k digits of a number, compute the number modulo 10^k. For example, the last 3 digits of 12345 are 12345 mod 1000 = 345.

Crucially, modular arithmetic distributes over addition and multiplication:
- (a + b) mod m = ((a mod m) + (b mod m)) mod m
- (a * b) mod m = ((a mod m) * (b mod m)) mod m

This means you can compute each term i^i modulo 10^k, then sum them modulo 10^k, without ever dealing with the full gigantic numbers.

Python's built-in pow function supports three arguments: pow(base, exponent, modulus) computes (base^exponent) mod modulus efficiently.

</details>

<details>
<summary>Hint 3: Implementation Strategy</summary>

```
mod = 10^k
total = 0

for i from 1 to n:
    term = pow(i, i, mod)  # Compute i^i mod 10^k
    total = (total + term) mod mod

Convert total to string and pad with leading zeros to k digits
```

The key insight: by taking mod at each step, you keep all intermediate values small (less than 10^k), preventing overflow and improving performance.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Brute Force | O(n * log n) | O(d) | Compute full values; d = digits in result |
| Modular Arithmetic | O(n * log n) | O(1) | Only track last k digits; optimal |

**Time Complexity Note:** Computing i^i takes O(log i) time using fast exponentiation. Summing n terms gives O(n log n) overall.

**Why Modular Wins:** Even though both approaches have similar time complexity, the modular approach uses constant space and handles arbitrarily large n without overflow concerns.

---

## Key Concept

**Modular Arithmetic**

Modular arithmetic is "clock arithmetic"—numbers wrap around after reaching a certain value (the modulus). Just as 13 o'clock is 1 PM (13 mod 12 = 1), large numbers can be reduced to their remainder when divided by a modulus.

The magic of modular arithmetic is that you can perform operations (addition, multiplication, exponentiation) in "modular space" and get the same result as if you computed the full value and then took the modulus. This property is called **congruence** and is written as:

```
a ≡ b (mod m)  means  a mod m = b mod m
```

For this problem:
- We want the last k digits of a sum
- Last k digits = number mod 10^k
- We can compute each term mod 10^k and sum them mod 10^k
- Result: same last k digits, but we never exceed 10^k in size

**Real-world Application:** RSA encryption uses modular exponentiation with moduli having hundreds of digits. Without modular arithmetic, the intermediate values would be impossibly large to compute.

---

## Common Mistakes

1. **Integer Overflow in Languages with Fixed-Size Integers**: In languages like C++ or Java, i^i quickly exceeds even 64-bit integers. Always use modular exponentiation from the start, not just at the end.

2. **Forgetting to Pad with Leading Zeros**: If the result is 3413 and k = 10, the answer should be "0000003413", not "3413". Always format the output to exactly k digits.

3. **Not Using Modular Exponentiation**: Computing i^i fully and then taking mod 10^k defeats the purpose. Use built-in modular pow or implement fast exponentiation with mod at each step.

4. **Off-by-One Errors**: The series is 1^1 through n^n inclusive. Make sure your loop includes both endpoints.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Different exponent pattern | Compute 1^2 + 2^3 + 3^4 + ... + n^(n+1) | Same modular approach, adjust exponent |
| Multiple queries | Given q queries with different k values | Precompute full sum once, then extract different digit ranges |
| Alternating signs | Sum becomes 1^1 - 2^2 + 3^3 - 4^4 + ... | Handle negative mod carefully: result = (result + m) % m |

---

## Practice Checklist

**Correctness:**

- [ ] Handles basic cases (n=10, k=10)
- [ ] Handles edge cases (n=1, small k)
- [ ] Produces correct output format (padded to k digits)

**Understanding:**

- [ ] Can explain what modular arithmetic is
- [ ] Understands why we can compute mod at each step
- [ ] Can explain why this prevents overflow

**Mastery:**

- [ ] Solved without hints
- [ ] Can implement modular exponentiation from scratch
- [ ] Identified when modular arithmetic applies to other problems

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Explain the concept to someone
- [ ] Day 14: Implement without looking at code

---

**Euler Reference:** [Problem 48](https://projecteuler.net/problem=48)

**Next Step:** After mastering this, try [F017: 10001st Prime](F017_10001st_prime.md)
