---
id: F011
euler_id: 30
slug: digit-fifth-powers
title: Digit Fifth Powers
difficulty: foundation
topics: ["math", "digit-manipulation", "search-bounds"]
patterns: []
estimated_time_minutes: 15
prerequisites: ["programming-basics"]
---

# Digit Fifth Powers

## Problem

Find all numbers that can be written as the sum of the kth powers of their digits, then return the sum of those numbers. For example, when k=4, the number 1634 equals 1^4 + 6^4 + 3^4 + 4^4 = 1 + 1296 + 81 + 256 = 1634.

Your task is to find all such numbers for a given power k (typically k=5), excluding single-digit numbers (which trivially equal their own kth power). Once you've found all numbers with this property, sum them up.

Note: The problem asks you to find numbers where each digit is raised to the kth power, and the sum of these powered digits equals the original number itself.

## Why This Matters

This problem introduces the critical concept of search bound analysis - determining when to stop searching. A naive approach might search indefinitely, but mathematical reasoning reveals a natural upper limit.

A d-digit number has a minimum value of 10^(d-1), but the maximum sum of its digit powers is d × 9^k. When 10^(d-1) exceeds d × 9^k, no d-digit solutions can exist. For k=5, this happens around d=6, giving an upper bound of approximately 6 × 9^5 = 354,294. This analysis transforms an infinite search into a bounded, tractable problem.

Understanding how to derive tight bounds is essential in algorithm design, preventing wasted computation and ensuring solutions terminate. This technique appears in optimization problems, numerical methods, and competitive programming where efficiency separates accepted from time-limit-exceeded solutions.

## Examples

**Example 1:**

- Input: `k = 4`
- Output: `19316`
- Explanation: The numbers are 1634, 8208, and 9474. Their sum is 1634 + 8208 + 9474 = 19316.

**Example 2:**

- Input: `k = 5`
- Output: `443839`
- Explanation: Find all numbers where the sum of the 5th powers of digits equals the number itself, then sum those numbers.

## Constraints

- 3 <= k <= 6
- Exclude single-digit numbers (1-9)
- Each number found must have at least 2 digits

## Think About

1. What's the largest number you need to check? Can you derive an upper bound?
2. How do you efficiently extract digits from a number?
3. Should you precompute the powers 0^k through 9^k?
4. What makes this different from checking every number up to infinity?

---

## Approach Hints

<details>
<summary>Hint 1: Finding the Upper Bound</summary>

A d-digit number is at least 10^(d-1). The maximum sum of digit kth powers for a d-digit number is d × 9^k (all digits are 9).

When 10^(d-1) > d × 9^k, no d-digit solutions exist. Find the smallest d where this inequality holds - that's your cutoff.

For k=5: 9^5 = 59049. Check: 6 × 59049 = 354294 (6 digits), but 7 × 59049 = 413343 (still 6 digits, but 10^6 = 1000000 > 413343). So search up to about 354294.

</details>

<details>
<summary>Hint 2: Efficient Digit Extraction</summary>

Two approaches to extract digits:

**Method 1: Modulo arithmetic**
```
while n > 0:
    digit = n % 10
    sum += digit^k
    n = n // 10
```

**Method 2: String conversion**
```
for char in str(n):
    digit = int(char)
    sum += digit^k
```

Precompute powers: `powers = [i**k for i in range(10)]` to avoid repeated exponentiation.

</details>

<details>
<summary>Hint 3: Complete Algorithm</summary>

```
1. Compute upper bound (where 10^(d-1) > d × 9^k)
2. Precompute powers[i] = i^k for i in 0..9
3. For each number n from 10 to upper_bound:
   a. Extract digits of n
   b. Compute sum of powers[digit] for each digit
   c. If sum equals n, add to result list
4. Return sum of result list
```

Optimization: Start from 10 (exclude single digits 1-9 as specified in the problem).

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Brute Force (no bound) | O(∞) | O(1) | Never terminates |
| Bounded Search | O(U × log U) | O(1) | U = upper bound ≈ 6×9^k; log U for digit extraction |
| With Precomputation | O(U × d) | O(10) | Store powers 0^k to 9^k; d = avg digits |

---

## Key Concept

**Search Bound Analysis**

The key insight is recognizing when to stop searching based on mathematical constraints. For this problem:

- **Lower bound of d-digit number:** 10^(d-1)
- **Upper bound of digit power sum:** d × 9^k

When the lower bound exceeds the upper bound, no solutions exist for that digit count. This gives us a computable termination condition.

For k=5:
- 1 digit: max sum = 1 × 9^5 = 59,049 (but max 1-digit number is 9) ✗
- 2 digits: max sum = 2 × 59,049 = 118,098 ✓
- 3 digits: max sum = 3 × 59,049 = 177,147 ✓
- ...
- 6 digits: max sum = 6 × 59,049 = 354,294 ✓
- 7 digits: max sum = 7 × 59,049 = 413,343, but 10^6 = 1,000,000 ✗

Search space: [10, 354,294]

---

## Common Mistakes

1. **Searching indefinitely**: Not deriving an upper bound leads to infinite loops or arbitrary cutoffs.

2. **Including single-digit numbers**: The problem typically excludes 1-9 since they trivially equal themselves to any power. Read the problem statement carefully.

3. **Inefficient power computation**: Computing `digit**k` repeatedly inside loops. Precompute `powers = [i**k for i in range(10)]` once.

4. **Off-by-one in bounds**: Starting from 0 or 1 instead of 10 (first two-digit number).

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Different power k | k varies from 2 to 10 | Recompute upper bound for each k |
| Return the numbers, not sum | Output format changes | Collect numbers in list instead of summing |
| Include single digits | Don't exclude 1-9 | Start search from 1 or 2 |
| Largest such number | Find maximum only | Track max during iteration |

---

## Practice Checklist

**Correctness:**

- [ ] Handles basic cases (k=4, k=5)
- [ ] Excludes single-digit numbers
- [ ] Derives correct upper bound
- [ ] Produces correct sum

**Understanding:**

- [ ] Can explain why upper bound exists
- [ ] Understands the mathematical constraint
- [ ] Can derive bound for different k values
- [ ] Knows why precomputation helps

**Mastery:**

- [ ] Solved without hints
- [ ] Can explain bound derivation to someone else
- [ ] Identified optimization opportunities (precomputation)
- [ ] Can handle variations (different k values)

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Explain bound analysis concept
- [ ] Day 14: Optimize with different techniques

---

**Euler Reference:** [Problem 30](https://projecteuler.net/problem=30)

**Next Step:** After mastering this, try [F012: Digit Factorials](F012_digit_factorials.md)
