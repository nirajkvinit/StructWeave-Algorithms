---
id: F003
euler_id: 5
slug: smallest-multiple
title: Smallest Multiple
difficulty: foundation
topics: ["math", "lcm", "gcd"]
patterns: []
estimated_time_minutes: 12
prerequisites: ["programming-basics"]
---

# Smallest Multiple

## Problem

Find the smallest positive number that is evenly divisible by all numbers from 1 to n. This is also known as the Least Common Multiple (LCM) of all numbers from 1 to n.

For example, the smallest number divisible by all numbers from 1 to 10 is 2520. It divides evenly by 1, 2, 3, 4, 5, 6, 7, 8, 9, and 10 without leaving any remainder.

## Why This Matters

LCM and GCD are fundamental number theory concepts used in cryptography, scheduling algorithms, and fraction arithmetic. The relationship LCM(a,b) = (a×b)/GCD(a,b) is a key insight. This problem also introduces the iterative application of a binary operation: computing LCM of multiple numbers by repeatedly applying LCM to pairs.

In real-world applications, LCM appears in:
- **Scheduling**: Finding when events with different periods coincide (tasks every 3 days, every 5 days, etc.)
- **Music**: Synchronizing rhythms with different beat patterns
- **Gear ratios**: Determining when rotating gears return to the same position

## Examples

**Example 1:**

- Input: `n = 10`
- Output: `2520`
- Explanation: 2520 is the smallest number divisible by 1, 2, 3, 4, 5, 6, 7, 8, 9, 10. For instance: 2520/7 = 360, 2520/8 = 315, etc.

**Example 2:**

- Input: `n = 5`
- Output: `60`
- Explanation: 60 = LCM(1,2,3,4,5). It's divisible by all numbers 1-5.

## Constraints

- 1 <= n <= 25

## Think About

1. What's the simplest approach that works?
2. Can you identify a mathematical pattern or formula?
3. What are the bounds of your search space?
4. How can you verify your answer?

---

## Approach Hints

<details>
<summary>Hint 1: Getting Started</summary>

LCM of multiple numbers can be computed iteratively: LCM(a, b, c) = LCM(LCM(a, b), c).

So you can compute: result = 1, then for each number from 1 to n, update result = LCM(result, number).

But how do you compute LCM of two numbers? That's where GCD comes in...

</details>

<details>
<summary>Hint 2: Key Insight</summary>

The relationship between LCM and GCD is: **LCM(a, b) = (a × b) / GCD(a, b)**

GCD (Greatest Common Divisor) can be computed efficiently using the Euclidean algorithm:
```
GCD(a, b) = GCD(b, a mod b)
```
Base case: GCD(a, 0) = a

This is one of the oldest algorithms in mathematics (circa 300 BCE) and runs in O(log(min(a,b))) time.

</details>

<details>
<summary>Hint 3: Optimization</summary>

Complete algorithm:
```
def gcd(a, b):
    while b != 0:
        a, b = b, a % b
    return a

def lcm(a, b):
    return (a * b) // gcd(a, b)

result = 1
for i in range(1, n + 1):
    result = lcm(result, i)
return result
```

**Important**: Compute a // gcd(a,b) first, then multiply by b to avoid overflow: `lcm(a,b) = (a // gcd(a,b)) * b`

Many languages have built-in GCD functions (Python: `math.gcd`, Java: `BigInteger.gcd`).

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Brute force (test multiples) | O(result × n) | O(1) | Very slow, impractical |
| Optimal (iterative LCM) | O(n log(max)) | O(1) | Fast, uses number theory |

The log factor comes from GCD computation via Euclidean algorithm.

---

## Key Concept

**LCM and GCD relationship**

The Euclidean algorithm for GCD is based on the principle: GCD(a, b) = GCD(b, a mod b).

**Why this works:** Any common divisor of a and b must also divide (a - kb) for any integer k. In particular, it divides the remainder a mod b.

**LCM formula derivation:**
- Let g = GCD(a, b), so a = g×m and b = g×n where GCD(m,n) = 1
- LCM must be divisible by both a and b
- The smallest such number is g×m×n = (a×b)/g

**Iterative LCM:** LCM is associative: LCM(a, b, c) = LCM(LCM(a,b), c), so we can compute it iteratively.

---

## Common Mistakes

1. **Integer overflow**: For n=20, LCM ≈ 232 million. For n=25, it's over 26 trillion. Use appropriate data types (long long in C++, BigInteger in Java, Python handles this automatically).

2. **Wrong formula order**: Computing `(a * b) // gcd(a,b)` can overflow. Better: `a // gcd(a,b) * b` computes the division first.

3. **Starting with LCM = 0**: Initialize result to 1, not 0. LCM(0, anything) = 0, which breaks the chain.

4. **Confusing LCM with product**: LCM(4, 6) = 12, not 24. You need to divide by GCD to avoid counting common factors multiple times.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| LCM of array | Given explicit array of numbers | Same algorithm, iterate through array |
| GCD of range | Find GCD(1..n) instead | Always equals 1 for n > 1 |
| LCM with constraints | Only include primes, or odd numbers | Filter before applying LCM |

---

## Practice Checklist

**Correctness:**

- [ ] Handles basic cases (n = 5, 10)
- [ ] Handles edge cases (n = 1, n = 25)
- [ ] Produces correct output format

**Understanding:**

- [ ] Can explain the mathematical insight
- [ ] Understands why the approach works
- [ ] Can estimate complexity without running code

**Mastery:**

- [ ] Solved without hints
- [ ] Can explain to someone else
- [ ] Identified optimization opportunities

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Explain the concept
- [ ] Day 14: Optimize if possible

---

**Euler Reference:** [Problem 5](https://projecteuler.net/problem=5)

**Next Step:** After mastering this, try [F004: Sum Square Difference](./F004_sum_square_difference.md)
