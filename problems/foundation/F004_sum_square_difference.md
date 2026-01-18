---
id: F004
euler_id: 6
slug: sum-square-difference
title: Sum Square Difference
difficulty: foundation
topics: ["math", "formulas", "arithmetic-series"]
patterns: []
estimated_time_minutes: 8
prerequisites: ["programming-basics"]
---

# Sum Square Difference

## Problem

Find the difference between the square of the sum and the sum of squares for the first n natural numbers. That is, compute (1+2+...+n)² - (1²+2²+...+n²).

For example, for the first 10 natural numbers:
- Sum of numbers: 1 + 2 + ... + 10 = 55
- Square of sum: 55² = 3025
- Sum of squares: 1² + 2² + ... + 10² = 385
- Difference: 3025 - 385 = 2640

## Why This Matters

This problem demonstrates the power of mathematical formulas over brute-force computation. The sum of first n numbers is n(n+1)/2, and sum of squares is n(n+1)(2n+1)/6. Recognizing when closed-form solutions exist turns O(n) problems into O(1).

These arithmetic series formulas appear frequently in:
- **Algorithm analysis**: Summing loops like `for i in range(n)`
- **Physics**: Distance calculations with constant acceleration
- **Probability**: Expected values in discrete distributions
- **Combinatorics**: Counting problems

The ability to recognize and derive such formulas is a hallmark of mathematical maturity in computer science.

## Examples

**Example 1:**

- Input: `n = 10`
- Output: `2640`
- Explanation: (1+2+...+10)² - (1²+2²+...+10²) = 55² - 385 = 3025 - 385 = 2640

**Example 2:**

- Input: `n = 5`
- Output: `170`
- Explanation: (1+2+3+4+5)² - (1²+2²+3²+4²+5²) = 15² - 55 = 225 - 55 = 170

## Constraints

- 1 <= n <= 10^6

## Think About

1. What's the simplest approach that works?
2. Can you identify a mathematical pattern or formula?
3. What are the bounds of your search space?
4. How can you verify your answer?

---

## Approach Hints

<details>
<summary>Hint 1: Getting Started</summary>

The brute force approach:
1. Compute sum_of_numbers = 1 + 2 + ... + n
2. Compute square_of_sum = sum_of_numbers²
3. Compute sum_of_squares = 1² + 2² + ... + n²
4. Return square_of_sum - sum_of_squares

This works but requires O(n) time to compute the sums by iteration.

</details>

<details>
<summary>Hint 2: Key Insight</summary>

Use mathematical formulas for constant time computation:

**Sum of first n natural numbers:** 1 + 2 + ... + n = n × (n+1) / 2

**Sum of squares:** 1² + 2² + ... + n² = n × (n+1) × (2n+1) / 6

These formulas have been known since ancient times and can be proven by mathematical induction.

</details>

<details>
<summary>Hint 3: Optimization</summary>

Complete O(1) solution:
```
sum_of_numbers = n * (n + 1) // 2
square_of_sum = sum_of_numbers * sum_of_numbers
sum_of_squares = n * (n + 1) * (2 * n + 1) // 6
return square_of_sum - sum_of_squares
```

**Derivation of sum of squares formula:**
Can be proven by induction or by noting that:
Σ k² = Σ k(k+1) - Σ k = Σ k² + Σ k - Σ k

There's a beautiful visual proof using 3D pyramid stacking!

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Brute Force (Loop) | O(n) | O(1) | Simple iteration, slow for large n |
| Optimal (Formula) | O(1) | O(1) | Instant for any n, requires math knowledge |

---

## Key Concept

**Arithmetic series formulas**

The formula for sum of first n natural numbers can be visualized:
```
1 + 2 + 3 + ... + n
n + (n-1) + (n-2) + ... + 1
------------------------
(n+1) + (n+1) + ... + (n+1)  [n times]
= n(n+1)

So the sum = n(n+1) / 2
```

The sum of squares formula is more complex but follows from:
- Telescoping sums
- Polynomial expansion
- Or visual cube-stacking proofs

**Why (square of sum) > (sum of squares)?**

By the Cauchy-Schwarz inequality, for positive numbers:
(a₁ + a₂ + ... + aₙ)² ≥ n(a₁² + a₂² + ... + aₙ²)

The difference captures the "interaction terms": when you square a sum, you get cross products like 2×1×2, 2×1×3, etc., which don't appear in the sum of squares.

---

## Common Mistakes

1. **Integer overflow**: For n = 10^6, the square of sum is approximately 10^18, which exceeds 32-bit integers. Use 64-bit integers (long in Java, long long in C++, Python handles automatically).

2. **Integer division issues**: In some languages, `n * (n+1) / 2` with integers truncates. Ensure at least one of n or (n+1) is even before dividing, or use appropriate casting.

3. **Wrong formula**: Sum of squares is NOT n²(n+1)²/4. That's the square of the sum formula. The correct formula includes (2n+1)/6.

4. **Sign error**: Return (square of sum) - (sum of squares), not the other way around. The result is always positive for n ≥ 1.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Sum of cubes | Compute sum of n³ | Use formula: [n(n+1)/2]² (square of sum!) |
| Range [a, b] | Sum from a to b instead of 1 to n | Formula(b) - Formula(a-1) |
| Arithmetic progression | Sum of (a + kd) for k=0..n | Use AP sum formula |

**Interesting fact:** Sum of cubes equals the square of sum of natural numbers!
1³ + 2³ + ... + n³ = (1 + 2 + ... + n)² = [n(n+1)/2]²

---

## Practice Checklist

**Correctness:**

- [ ] Handles basic cases (n = 5, 10)
- [ ] Handles edge cases (n = 1, n = 1000000)
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

**Euler Reference:** [Problem 6](https://projecteuler.net/problem=6)

**Next Step:** After mastering this, try [F005: Large Sum](./F005_large_sum.md)
