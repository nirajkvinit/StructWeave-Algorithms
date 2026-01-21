---
id: F019
euler_id: 34
slug: digit-factorials
title: Digit Factorials
difficulty: foundation
topics: ["math", "digit-manipulation", "factorial"]
patterns: []
estimated_time_minutes: 12
prerequisites: ["programming-basics"]
---

# Digit Factorials

## Problem

Find all numbers that equal the sum of the factorials of their digits, then return the sum of those numbers. For example, 145 equals 1! + 4! + 5! = 1 + 24 + 120 = 145.

Note that single-digit numbers 1 and 2 are trivial cases (1! = 1, 2! = 2) and should be excluded from the sum. Your task is to find all non-trivial numbers with this property and compute their sum.

Recall that n! (n factorial) is the product of all positive integers from 1 to n:
- 0! = 1
- 1! = 1
- 2! = 2
- 3! = 6
- 4! = 24
- 5! = 120
- etc.

## Why This Matters

This problem reinforces bound analysis techniques from the previous problem (F011) while introducing the concept of precomputation for efficiency. Since factorials grow extremely fast (9! = 362,880), we can establish a tight upper bound on our search space.

The key mathematical insight: a d-digit number has value at least 10^(d-1), but the maximum digit factorial sum is d × 9!. For d=8, we have 10^7 = 10,000,000 but 8 × 362,880 = 2,903,040, meaning no 8-digit solutions exist. This gives us a computable upper bound around 2.5 million.

Precomputing factorials 0! through 9! is a classic space-time tradeoff. Since we only need 10 values that never change, storing them avoids millions of repeated calculations. This pattern of precomputing small, reusable lookup tables appears frequently in dynamic programming, combinatorics, and optimization problems.

## Examples

**Example 1:**

- Input: (none - problem asks for sum of all such numbers)
- Output: `40730`
- Explanation: The numbers are 145 and 40585. Their sum is 145 + 40585 = 40730 (excluding 1 and 2).

**Example 2:**

- Input: `number = 145`
- Output: `true`
- Explanation: 1! + 4! + 5! = 1 + 24 + 120 = 145 ✓

## Constraints

- Search numbers from 3 upward (exclude 1 and 2)
- Upper bound approximately 2,540,160 (7 × 9!)
- Each digit's factorial is 0! through 9!

## Think About

1. What's the largest factorial you need to compute? Why only up to 9!?
2. How can you avoid computing factorials repeatedly?
3. What's the upper bound for your search? When does d × 9! fall below 10^(d-1)?
4. Why are 1 and 2 excluded from the final sum?

---

## Approach Hints

<details>
<summary>Hint 1: Precompute Factorials</summary>

Since you're only working with digits 0-9, precompute factorials once:

```
factorials = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880]
```

This array stores i! at index i for i = 0 to 9.

Why precompute? Each number you check requires extracting digits and looking up factorials. For millions of numbers, computing factorials from scratch would be wasteful.

</details>

<details>
<summary>Hint 2: Finding the Upper Bound</summary>

A d-digit number is at least 10^(d-1). The maximum digit factorial sum is d × 9! = d × 362,880.

Find where 10^(d-1) > d × 362,880:

- 6 digits: 6 × 362,880 = 2,177,280 (6-digit range: 100,000 - 999,999) ✓
- 7 digits: 7 × 362,880 = 2,540,160 (7-digit range: 1,000,000 - 9,999,999) ✓
- 8 digits: 8 × 362,880 = 2,903,040, but 10^7 = 10,000,000 ✗

Upper bound: approximately 2,540,160 (or 7 × 9!)

</details>

<details>
<summary>Hint 3: Complete Algorithm</summary>

```
1. Precompute factorials: fact = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880]

2. Set upper_bound = 7 × 362880 = 2540160

3. Initialize result_sum = 0

4. For each number n from 3 to upper_bound:
   a. Extract digits of n
   b. Compute sum = Σ fact[digit] for each digit
   c. If sum equals n, add n to result_sum

5. Return result_sum
```

Note: Start from 3 to exclude trivial cases 1 and 2.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| No Precomputation | O(U × d × k) | O(1) | U = upper bound, d = digits, k = factorial computation |
| With Precomputation | O(U × d) | O(10) | Store 10 factorials, O(1) lookup per digit |
| Optimized Bound | O(2.5M × 6) | O(10) | Tight bound reduces search space |

**Why Precomputation Wins:**

- Factorial lookup: O(1) vs O(k) for computing k!
- Only 10 values to store (factorials 0! through 9!)
- Reused millions of times across the search

---

## Key Concept

**Precomputation and Lookup Tables**

When a small set of values is reused many times, precomputing them once and storing in a lookup table is far more efficient than recomputing on demand.

For this problem:
- **Values needed:** 0!, 1!, 2!, ..., 9! (only 10 values)
- **Usage frequency:** Every number checked requires 2-7 digit lookups
- **Total searches:** ~2.5 million numbers
- **Total lookups:** ~15 million (6 digits avg × 2.5M numbers)

Precomputation cost: 10 factorial calculations
Lookup cost: O(1) per access

Without precomputation: 15 million factorial calculations
With precomputation: 10 calculations + 15 million O(1) lookups

This pattern appears in:
- Dynamic programming (memoization tables)
- Combinatorics (Pascal's triangle, binomial coefficients)
- Prime sieves (precompute all primes up to n)
- Trigonometric calculations (lookup tables for sin/cos)

---

## Common Mistakes

1. **Computing factorials inside the loop**: Factorials are expensive to compute. Always precompute 0! through 9!.

2. **Wrong upper bound**: Using arbitrary cutoffs like 1 million or 10 million. Derive the bound mathematically.

3. **Including 1 and 2**: These are trivial cases. Most problem statements exclude them from the final sum.

4. **Integer overflow**: In some languages, 9! = 362,880 fits in int, but intermediate sums might overflow. Use appropriate data types.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Check single number | Given n, is it a digit factorial number? | Extract digits, compute sum, compare to n |
| Return the numbers | Output list instead of sum | Collect numbers in array, return array |
| Include 1 and 2 | Don't exclude trivial cases | Start search from 1, include in sum |
| Largest such number | Find maximum only | Track max during iteration instead of summing |

---

## Practice Checklist

**Correctness:**

- [ ] Handles basic case (finds 145 and 40585)
- [ ] Excludes trivial cases (1 and 2)
- [ ] Computes correct upper bound
- [ ] Produces correct sum (40730)

**Understanding:**

- [ ] Can explain why factorials grow fast
- [ ] Understands the bound derivation
- [ ] Knows why precomputation is beneficial
- [ ] Can explain the mathematical constraint

**Mastery:**

- [ ] Solved without hints
- [ ] Can derive upper bound for different factorial problems
- [ ] Implemented efficient precomputation
- [ ] Can explain to someone else

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Explain precomputation concept
- [ ] Day 14: Compare with F011 (digit powers)

---

**Euler Reference:** [Problem 34](https://projecteuler.net/problem=34)

**Next Step:** After mastering this, try [F020: Digital Root](./F020_digital_root.md)
