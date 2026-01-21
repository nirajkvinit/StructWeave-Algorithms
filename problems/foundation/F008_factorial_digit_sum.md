---
id: F008
euler_id: 20
slug: factorial-digit-sum
title: Factorial Digit Sum
difficulty: foundation
topics: ["math", "factorial", "big-integers", "digit-sum"]
patterns: []
estimated_time_minutes: 10
prerequisites: ["programming-basics"]
---

# Factorial Digit Sum

## Problem

Find the sum of the digits in n! (n factorial).

Factorial is defined as the product of all positive integers up to n: n! = n × (n-1) × (n-2) × ... × 2 × 1. For example, 5! = 5 × 4 × 3 × 2 × 1 = 120.

Your task is to compute the factorial of a given number, then sum all the digits in the result. For instance, 10! = 3,628,800, and the digit sum is 3 + 6 + 2 + 8 + 8 + 0 + 0 = 27.

Factorials grow extremely fast - 100! has 158 digits - so you'll need to work with very large numbers.

## Why This Matters

Factorials are fundamental to combinatorics and probability. They represent the number of ways to arrange n distinct objects (permutations). You'll encounter factorials when calculating:
- Permutations: How many ways to order a deck of cards? 52!
- Combinations: How many ways to choose k items from n? n! / (k! × (n-k)!)
- Probability: What's the chance of a specific poker hand?
- Taylor series: Mathematical functions can be approximated using factorial terms

This problem reinforces big integer concepts and digit manipulation. Factorials grow much faster than exponentials - while 2^100 has about 31 digits, 100! has 158 digits. Understanding growth rates helps you estimate computational complexity and predict whether an approach will scale.

The digit sum operation itself appears in various algorithms:
- **Divisibility rules**: A number is divisible by 9 if its digit sum is divisible by 9
- **Check digits**: Used in ISBN, credit card numbers, and barcodes for error detection
- **Digital signatures**: Hash functions often involve digit-like operations on large numbers
- **Number theory**: Digital roots and properties of numbers in different bases

## Examples

**Example 1:**

- Input: `n = 10`
- Output: `27`
- Explanation: 10! = 3,628,800, digit sum = 3 + 6 + 2 + 8 + 8 + 0 + 0 = 27

**Example 2:**

- Input: `n = 5`
- Output: `3`
- Explanation: 5! = 120, digit sum = 1 + 2 + 0 = 3

**Example 3:**

- Input: `n = 1`
- Output: `1`
- Explanation: 1! = 1, digit sum = 1

## Constraints

- 1 <= n <= 100
- n! can have over 150 digits for n = 100

## Think About

1. What's the simplest approach that works?
2. How can you compute factorial for large n?
3. Should you use iterative or recursive factorial computation?
4. How can you verify your answer?

---

## Approach Hints

<details>
<summary>Hint 1: Getting Started</summary>

First, compute the factorial. You can do this iteratively:

```
factorial = 1
for i in range(1, n + 1):
    factorial *= i
```

Or use a built-in function (Python has `math.factorial`):
```
import math
factorial = math.factorial(n)
```

Python's integers automatically handle arbitrary precision, so this works even for n = 100.

For other languages:
- Java: Use `BigInteger` and multiply in a loop
- C++: Use GMP library or implement your own big integer class
- JavaScript: Use BigInt with iterative multiplication

</details>

<details>
<summary>Hint 2: Key Insight</summary>

Once you have the factorial, extract and sum the digits. Same two approaches as in F006:

**String approach (cleaner):**
```
digit_sum = sum(int(digit) for digit in str(factorial))
```

**Modulo approach (more mathematical):**
```
digit_sum = 0
temp = factorial
while temp > 0:
    digit_sum += temp % 10
    temp //= 10
```

The string approach is typically preferred for readability.

</details>

<details>
<summary>Hint 3: Optimization</summary>

For this problem, the straightforward approach is optimal. Computing 100! takes only milliseconds on modern computers.

**Key insights:**
- Iterative factorial is O(n) time, O(1) space (not counting the result)
- Recursive factorial is O(n) time, O(n) space (call stack)
- Use iterative for large n to avoid stack overflow

The digit sum operation is O(d) where d is the number of digits in n!. The number of digits in n! is approximately:
```
digits ≈ log10(n!) ≈ n × log10(n) - n × log10(e) + 0.5 × log10(2πn)
```

For n = 100, this is about 158 digits, so the digit sum is very fast.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Iterative factorial | O(n × d) | O(d) | d = digits in result; efficient and simple |
| Built-in factorial | O(n × d) | O(d) | Same complexity, cleaner code |
| Recursive factorial | O(n × d) | O(n + d) | Extra space for call stack; avoid for large n |

**Note:** The multiplication cost grows with the size of numbers, so each multiplication isn't O(1) but rather O(d) where d is current digit count. Total time is more precisely O(n × average_digit_count).

---

## Key Concept

**Factorial and Digit Sum**

**Factorial growth** is one of the fastest-growing mathematical functions. Compare:
- 10! = 3,628,800 (7 digits)
- 20! = 2,432,902,008,176,640,000 (19 digits)
- 50! ≈ 3.04 × 10^64 (65 digits)
- 100! ≈ 9.33 × 10^157 (158 digits)

Factorials grow faster than exponentials. While 2^n is exponential, n! is "super-exponential." This is why factorial-time algorithms (O(n!)) are only feasible for very small n (typically n <= 10-12).

**Stirling's approximation** gives us an estimate:
```
n! ≈ √(2πn) × (n/e)^n
```

Taking log10 of both sides tells us the number of digits in n!.

**Digit operations** like summing are fundamental building blocks. They appear in:
- Checksum algorithms (Luhn algorithm for credit cards)
- Hash functions
- Number theory problems
- Base conversion
- Digital root calculations

Understanding how to efficiently manipulate digits - whether through string operations or arithmetic (modulo and division) - is essential for computational mathematics.

---

## Common Mistakes

1. **Using standard integers**: Forgetting that factorials exceed even 64-bit integers very quickly. 21! already overflows a signed 64-bit integer. Always use big integer types or languages with arbitrary precision.

2. **Stack overflow with recursion**: Recursive factorial can cause stack overflow for large n. Use iterative approach or ensure your language optimizes tail recursion.

3. **Off-by-one in factorial**: Computing factorial from 2 to n-1 instead of 1 to n, or from 1 to n+1. The factorial of n should multiply all integers from 1 to n inclusive.

4. **String to int conversion**: When using string approach, forgetting to convert each character to integer before summing: `sum(int(d) for d in str(fact))` not `sum(str(fact))`.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Product of digits | Multiply instead of sum | Initialize product = 1, multiply each digit |
| Power digit sum | Compute b^n instead of n! | Same digit extraction: F006 |
| Trailing zeros in n! | Count zeros at end | Count factors of 5 in n! (mathematical formula) |
| Last k digits of n! | Find last k digits | Use modular arithmetic: compute factorial mod 10^k |
| Digital root | Sum until single digit | Iterate: while result >= 10, sum digits again |

---

## Practice Checklist

**Correctness:**

- [ ] Handles basic cases (Examples 1-3)
- [ ] Handles edge cases (n = 1, n = 100)
- [ ] Produces correct output format (single integer)

**Understanding:**

- [ ] Can explain factorial growth rate
- [ ] Understands why big integers are necessary
- [ ] Can estimate number of digits in n! for given n

**Mastery:**

- [ ] Solved without hints
- [ ] Can explain to someone else
- [ ] Implemented both iterative and using built-in factorial

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Explain the concept
- [ ] Day 14: Compare with power digit sum (F006)

---

**Euler Reference:** [Problem 20](https://projecteuler.net/problem=20)

**Next Step:** After mastering this, try [F009: Smallest Multiple](./F009_smallest_multiple.md)
