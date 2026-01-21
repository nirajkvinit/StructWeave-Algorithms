---
id: F001
euler_id: 1
slug: multiples-of-3-or-5
title: Multiples of 3 or 5
difficulty: foundation
topics: ["math", "loops", "modulo"]
patterns: []
estimated_time_minutes: 10
prerequisites: ["programming-basics"]
---

# Multiples of 3 or 5

## Problem

Find the sum of all positive integers below a given limit that are divisible by 3 or 5. For example, below 10, the multiples of 3 or 5 are 3, 5, 6, and 9, which sum to 23.

Think of this as collecting all numbers in a range that satisfy a certain divisibility condition. A number is divisible by 3 if it leaves no remainder when divided by 3 (we can check this using the modulo operator: `number % 3 == 0`). The same applies for 5.

## Why This Matters

This problem introduces fundamental programming concepts: iteration with loops, conditional logic with modulo operator, and accumulator patterns. These building blocks appear in virtually every algorithm. The mathematical insight here (inclusion-exclusion principle) also previews more advanced counting techniques.

In real-world applications, similar divisibility checks appear in scheduling systems (events every N days), data validation, and pagination logic. The optimization from O(n) to O(1) demonstrates the power of mathematical insight over brute force computation.

## Examples

**Example 1:**

- Input: `limit = 10`
- Output: `23`
- Explanation: Numbers divisible by 3 or 5 below 10 are: 3, 5, 6, 9. Their sum is 3 + 5 + 6 + 9 = 23.

**Example 2:**

- Input: `limit = 20`
- Output: `78`
- Explanation: Multiples of 3 or 5 below 20: 3, 5, 6, 9, 10, 12, 15, 18. Sum = 78.

## Constraints

- 1 <= limit <= 10^9

## Think About

1. What's the simplest approach that works?
2. Can you identify a mathematical pattern or formula?
3. What are the bounds of your search space?
4. How can you verify your answer?

---

## Approach Hints

<details>
<summary>Hint 1: Getting Started</summary>

Loop through all numbers from 1 to limit-1 and check divisibility. A number is divisible by n if `(number % n == 0)`. Keep a running sum of all numbers that are divisible by 3 OR divisible by 5.

Be careful: some numbers are divisible by both 3 AND 5 (like 15). Make sure you don't count them twice!

</details>

<details>
<summary>Hint 2: Key Insight</summary>

For really big numbers (like 1 billion), checking every single number is too slow. We can use math to skip the loop entirely!

**1. The Pattern**
The multiples of 3 below 10 are: 3, 6, 9.
Factor out the 3, and it becomes: `3 × (1 + 2 + 3)`.

Notice that concepts inside the parenthesis `(1 + 2 + 3)` are just numbers from 1 to *m*.
Here, ***m* is the count of multiples**, not the limit itself!

**How to find *m*:**
Subtract 1 from limit, divide by k, and **drop the decimal**.

- Python: `m = (limit - 1) // k`
- JavaScript: `const m = Math.floor((limit - 1) / k)`

*Example:* For limit 10, m is 3.

**Formula:**
Sum = `3 × (Sum of 1 to m)`
Sum = `3 × (m × (m + 1) / 2)`

*Example (Limit 10):*
m = 3.
Sum = `3 × (3 × 4 / 2) = 3 × 6 = 18`.

**2. The Overlap Problem**
If we sum all multiples of 3 and all multiples of 5, we have a problem: numbers like **15, 30, 45** are counted twice (once for 3, once for 5).

**3. The Solution**
To fix this, we subtract the duplicates.
`Final Answer = Sum(3) + Sum(5) - Sum(15)`

*Note: Sum(15) represents the sum of multiples of 15 (because 3 × 5 = 15).*

</details>

<details>
<summary>Hint 3: Optimization</summary>

Create a helper function to compute the sum of all multiples of k below n:

```
def sum_multiples(k, n):
    m = (n - 1) // k  # how many multiples of k exist below n
    return k * m * (m + 1) // 2
```

Then: `answer = sum_multiples(3, limit) + sum_multiples(5, limit) - sum_multiples(15, limit)`

This runs in O(1) time instead of O(n)!

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Brute Force (Loop) | O(n) | O(1) | Simple but slow for large n |
| Optimal (Formula) | O(1) | O(1) | Fast for any n, requires math insight |

---

## Key Concept

**Modulo operator and arithmetic series**

The modulo operator (%) gives the remainder after division. It's perfect for checking divisibility:

- `n % 3 == 0` means n is divisible by 3
- `n % 5 == 0` means n is divisible by 5

The arithmetic series formula: 1 + 2 + 3 + ... + n = n × (n+1) / 2 is one of the most useful formulas in computer science. It appears in complexity analysis, algorithm optimization, and many mathematical problems.

The inclusion-exclusion principle states: |A ∪ B| = |A| + |B| - |A ∩ B|. For our problem, we want multiples of 3 OR 5, so we add both but subtract their overlap (multiples of 15).

---

## Common Mistakes

1. **Double-counting multiples of 15**: Numbers like 15, 30, 45 are divisible by both 3 and 5. If you simply add sum(3) + sum(5), you count these twice. Fix: subtract sum(15).

2. **Off-by-one errors**: The problem says "below limit", not "up to and including limit". So for limit=10, check numbers 1 through 9, not 1 through 10.

3. **Integer overflow**: For very large limits (near 10^9), intermediate calculations might overflow. Use appropriate data types (long in Java, no issue in Python).

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Different divisors | Find multiples of 7 or 11 | Same formula, change k values and LCM |
| Three divisors | Multiples of 3, 5, or 7 | Inclusion-exclusion with 3 sets: A+B+C - AB - AC - BC + ABC |
| Range sum | Sum between two limits | sum(high) - sum(low) |

---

## Practice Checklist

**Correctness:**

- [ ] Handles basic cases (limit = 10, 20)
- [ ] Handles edge cases (limit = 1, limit = 1000000000)
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

**Euler Reference:** [Problem 1](https://projecteuler.net/problem=1)

**Next Step:** After mastering this, try [F002: Even Fibonacci Numbers](./F002_even_fibonacci_numbers.md)
