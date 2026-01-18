---
id: F008
euler_id: 25
slug: 1000-digit-fibonacci-number
title: 1000-digit Fibonacci Number
difficulty: foundation
topics: ["math", "fibonacci", "big-integers"]
patterns: []
estimated_time_minutes: 12
prerequisites: ["programming-basics"]
---

# 1000-digit Fibonacci Number

## Problem

Find the index of the first Fibonacci number that contains at least k digits.

The Fibonacci sequence is defined as:
- F(1) = 1
- F(2) = 1
- F(n) = F(n-1) + F(n-2) for n > 2

This produces the sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, ...

Your task is to find the position (index) in this sequence of the first number that has at least k digits. For example, the first Fibonacci number with 3 digits is 144, which is at index 12.

Note: In this problem, we use 1-based indexing, so F(1) = 1 is the first term, F(2) = 1 is the second term, and so on.

## Why This Matters

The Fibonacci sequence is one of the most famous mathematical sequences, appearing throughout nature, art, and computer science:
- **Nature**: Spiral patterns in shells, sunflower seeds, pinecones follow Fibonacci ratios
- **Golden ratio**: The ratio of consecutive Fibonacci numbers approaches φ (phi) ≈ 1.618
- **Algorithm analysis**: Fibonacci heap, Fibonacci search technique
- **Dynamic programming**: Classic teaching example for memoization
- **Recursion**: Standard example for understanding recursive algorithms

This problem combines sequence generation with big integers and size checking. It teaches you to:
1. Generate sequences efficiently without storing all previous values
2. Work with numbers that exceed standard integer limits
3. Determine the number of digits in a large number
4. Recognize when to stop iterating (early termination)

**Mathematical insight**: Fibonacci numbers grow exponentially at rate φ^n / √5 (Binet's formula). This means:
- The number of digits in F(n) is approximately n × log10(φ) ≈ n × 0.209
- To find the first k-digit Fibonacci number, we expect n ≈ k / 0.209 ≈ 4.78k
- For k = 1000, we'd expect n ≈ 4780

This exponential growth means we only need a few thousand iterations even for 1000-digit numbers.

## Examples

**Example 1:**

- Input: `k = 3`
- Output: `12`
- Explanation: F(12) = 144, the first Fibonacci number with 3 digits

**Example 2:**

- Input: `k = 2`
- Output: `7`
- Explanation: F(7) = 13, the first Fibonacci number with at least 2 digits

**Example 3:**

- Input: `k = 1`
- Output: `1`
- Explanation: F(1) = 1, which has 1 digit

## Constraints

- 1 <= k <= 1000
- You may assume the answer exists within a reasonable range

## Think About

1. What's the simplest approach that works?
2. Do you need to store all Fibonacci numbers, or just the last few?
3. How can you efficiently check the number of digits in a large number?
4. Can you estimate the answer before computing?

---

## Approach Hints

<details>
<summary>Hint 1: Getting Started</summary>

Generate Fibonacci numbers one at a time until you find one with at least k digits.

```
a, b = 1, 1
index = 1

while number_of_digits(a) < k:
    a, b = b, a + b
    index += 1

return index
```

You only need to keep track of the last two Fibonacci numbers at any time, not the entire sequence. This gives you O(1) space complexity.

</details>

<details>
<summary>Hint 2: Key Insight - Counting Digits</summary>

There are several ways to determine the number of digits in a number:

**Method 1: String conversion** (simplest)
```
num_digits = len(str(fib))
```

**Method 2: Logarithm** (mathematical)
```
import math
num_digits = int(math.log10(fib)) + 1 if fib > 0 else 1
```

**Method 3: Division counting**
```
temp, count = fib, 0
while temp > 0:
    temp //= 10
    count += 1
```

For large numbers in Python, string conversion is often fastest and most reliable. The logarithm method can have floating-point precision issues for very large numbers.

</details>

<details>
<summary>Hint 3: Optimization - Mathematical Approach</summary>

If you want an O(1) solution (very advanced), you can use Binet's formula:

```
F(n) = (φ^n - ψ^n) / √5
```

where φ = (1 + √5) / 2 (golden ratio) and ψ = (1 - √5) / 2.

For large n, F(n) ≈ φ^n / √5.

The number of digits in F(n) is:
```
digits(F(n)) = floor(n × log10(φ) - log10(√5)) + 1
```

So to find n where digits(F(n)) = k:
```
n ≈ (k - 1 + log10(√5)) / log10(φ)
```

However, due to floating-point precision, you'd still need to verify with the iterative method. The iterative approach is simpler and more reliable for this problem.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Iterative generation | O(n) | O(1) | n = index of answer; simple and efficient |
| Store all Fibonacci | O(n) | O(n) | Wasteful; unnecessary to store all |
| Mathematical formula | O(1) | O(1) | Tricky due to floating-point precision |

**Note:** Each Fibonacci number addition takes O(d) time where d is the number of digits. For n iterations with growing digit count, total time is closer to O(n × d_avg), but this is still very fast for k = 1000.

---

## Key Concept

**Fibonacci Growth and Digit Counting**

**Fibonacci sequence** is recursively defined but can be computed iteratively very efficiently. The key insight is that you only need the last two values to compute the next one - this is a sliding window over the sequence.

**Exponential growth**: Fibonacci numbers grow exponentially:
```
F(n) ≈ φ^n / √5 where φ ≈ 1.618
```

This means:
- F(10) = 55 (2 digits)
- F(20) = 6,765 (4 digits)
- F(30) = 832,040 (6 digits)
- F(50) ≈ 1.26 × 10^10 (11 digits)
- F(100) ≈ 3.54 × 10^20 (21 digits)

**Digit counting**: The number of digits in a positive integer n is floor(log10(n)) + 1. This is because:
- 1-9 have 1 digit: log10(1) = 0, log10(9) ≈ 0.95
- 10-99 have 2 digits: log10(10) = 1, log10(99) ≈ 1.99
- 100-999 have 3 digits: log10(100) = 2, log10(999) ≈ 2.99

For very large numbers, string conversion `len(str(n))` is often more reliable than logarithms due to floating-point precision limitations.

**Space efficiency**: By keeping only the last two values instead of all previous Fibonacci numbers, we reduce space from O(n) to O(1). This pattern - keeping only what's needed - is crucial for efficient algorithm design.

---

## Common Mistakes

1. **Off-by-one indexing**: Make sure you're using 1-based indexing as specified. F(1) = 1 is the first Fibonacci number, not F(0).

2. **Checking length too early**: Increment the index before checking the length, or you might return the index of the previous Fibonacci number.

3. **Integer overflow**: In languages without arbitrary precision, Fibonacci numbers overflow quickly. F(47) exceeds 32-bit integers, F(94) exceeds 64-bit integers.

4. **Logarithm edge cases**: `log10(0)` is undefined. Always check `if n > 0` when using logarithms, or handle n = 0 specially.

5. **Inefficient storage**: Storing all Fibonacci numbers in an array wastes memory. You only need the last two values.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| First even Fibonacci | Find first with k digits that's even | Same generation, add parity check: F002 |
| Sum of even Fibonacci | Sum all even Fibonacci below limit | Track sum while generating: F002 |
| Fibonacci at index n | Return F(n) | Same generation, stop at index n |
| Tribonacci | F(n) = F(n-1) + F(n-2) + F(n-3) | Keep last three values instead of two |
| Lucas numbers | Different initial values | Start with L(1) = 2, L(2) = 1 |
| Nth Fibonacci digit | Find digit at position n | Combine with Champernowne's constant: F014 |

---

## Practice Checklist

**Correctness:**

- [ ] Handles basic cases (Examples 1-3)
- [ ] Handles edge cases (k = 1, k = 1000)
- [ ] Uses correct 1-based indexing
- [ ] Produces correct output format (single integer)

**Understanding:**

- [ ] Can explain Fibonacci growth rate
- [ ] Understands why only two values need to be stored
- [ ] Can explain digit counting methods

**Mastery:**

- [ ] Solved without hints
- [ ] Can explain to someone else
- [ ] Understands connection to golden ratio
- [ ] Can estimate answer before computing

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Explain the concept
- [ ] Day 14: Implement alternative digit counting methods

---

**Euler Reference:** [Problem 25](https://projecteuler.net/problem=25)

**Next Step:** After mastering this, try [F009: Number Spiral Diagonals](F009_number_spiral_diagonals.md)
