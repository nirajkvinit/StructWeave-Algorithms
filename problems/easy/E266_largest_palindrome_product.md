---
id: E266
euler_id: 4
slug: largest-palindrome-product
title: Largest Palindrome Product
difficulty: easy
category: easy
topics: ["math", "palindromes"]
patterns: []
estimated_time_minutes: 20
frequency: low
related_problems: ["E005", "M125"]
prerequisites: ["math-basics"]
---

# Largest Palindrome Product

## Problem

Find the largest palindrome that can be created by multiplying two n-digit numbers together.

A palindrome number reads the same backward as forward. For example, 9009 is a palindrome (reads as 9009 from both directions), as is 12321.

For n = 2, you're looking at products of two-digit numbers (10 through 99). The largest palindrome from multiplying two 2-digit numbers is 9009 = 91 × 99.

For n = 3, you're looking at products of three-digit numbers (100 through 999). You need to find which product of two 3-digit numbers gives the largest palindromic result.

## Why This Matters

This problem combines number theory with optimization. The naive approach of checking all products is feasible but inefficient, teaching the importance of search space reduction. Rather than generating all products and filtering, you can generate palindromes in descending order and check if they can be factored into two n-digit numbers.

Palindrome checking appears frequently in algorithm problems and has practical applications in data validation, error detection (palindromic sequences in DNA), and even license plate verification systems. The problem also demonstrates the power of working backward: instead of generating products hoping they're palindromes, generate palindromes and verify they're products.

Understanding factorization constraints (both factors must be n-digit numbers) teaches you to add validation criteria to optimization problems, a pattern common in constraint satisfaction problems and operations research.

## Examples

**Example 1:**

- Input: `n = 2`
- Output: `9009`
- Explanation: The largest palindrome from products of two 2-digit numbers is 9009 = 91 × 99. Other palindromes like 8008 = 88 × 91 are smaller.

**Example 2:**

- Input: `n = 1`
- Output: `9`
- Explanation: The largest palindrome from products of single-digit numbers (1-9) is 9 = 3 × 3 or 9 = 1 × 9.

**Example 3:**

- Input: `n = 3`
- Output: `906609`
- Explanation: 906609 = 913 × 993 is the largest palindrome from products of 3-digit numbers.

## Constraints

- 1 <= n <= 4
- Both factors must be exactly n digits (leading zeros not allowed)
- Return the palindrome value, not the factors

## Think About

1. How many products of two n-digit numbers exist?
2. How can you check if a number is a palindrome?
3. Should you generate all products and filter, or search more intelligently?
4. If you search from larger to smaller values, can you stop early?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Brute force approach</summary>

Generate all products of two n-digit numbers and check each for palindrome property.

**For n = 2:**
```
Range: 10 to 99 (90 values)
Products: 90 × 90 = 8100 products to check
Check each: is it a palindrome?
Track maximum
```

**Complexity:** O(d²) where d = 10^n - 10^(n-1) (the count of n-digit numbers)

**Optimization:** Start from the largest numbers and work down. Once you find a palindrome, you can prune some branches.

</details>

<details>
<summary>🎯 Hint 2: Palindrome checking</summary>

**Method 1 - String comparison:**
```
def is_palindrome(num):
    s = str(num)
    return s == s[::-1]
```

**Method 2 - Numeric reversal:**
```
def is_palindrome(num):
    original = num
    reversed_num = 0
    while num > 0:
        reversed_num = reversed_num * 10 + (num % 10)
        num //= 10
    return original == reversed_num
```

Both work, but string method is simpler and sufficiently efficient for this problem.

</details>

<details>
<summary>📝 Hint 3: Optimize search order</summary>

**Key insight:** Start from the largest possible products.

```
max_n_digit = 10^n - 1  # e.g., 99 for n=2
min_n_digit = 10^(n-1)  # e.g., 10 for n=2

largest_palindrome = 0

for i from max_n_digit down to min_n_digit:
    for j from i down to min_n_digit:  # Start from i to avoid duplicates
        product = i * j

        # Early termination: if i * i < largest_palindrome, stop
        if product < largest_palindrome:
            break

        if is_palindrome(product):
            largest_palindrome = max(largest_palindrome, product)
```

**Why start from i in inner loop?** To avoid checking both (91, 99) and (99, 91).

**Why break when product < largest_palindrome?** Since j is decreasing, all subsequent products with this i will be even smaller.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Brute Force (all products) | O(d²) | O(1) | Simple but checks all ~d² products |
| **Descending Search** | **O(d² / c)** | **O(1)** | Pruning reduces constants |
| Generate Palindromes | O(10^n) | O(1) | Generate candidates, test factorization |

Where d = 9 × 10^(n-1) (count of n-digit numbers)

**Why Descending Search is Practical:**

- For n=3: ~900 × 900 = 810,000 worst-case checks
- Early termination reduces this significantly
- Palindrome check is O(log product) ≈ O(n)

**Alternative approach:** Generate palindromes from largest to smallest, check if factorable into two n-digit numbers. This can be faster but more complex to implement.

---

## Common Mistakes

### 1. Checking all products in ascending order

```
# INEFFICIENT: Checks all products, finds max at end
for i in range(min_val, max_val + 1):
    for j in range(min_val, max_val + 1):
        product = i * j
        if is_palindrome(product):
            max_palindrome = max(max_palindrome, product)

# BETTER: Descend from max, break early
```

### 2. Not handling n-digit constraint properly

```
# WRONG: Includes single-digit factors for n=2
for i in range(1, 100):  # Starts from 1, not 10!

# CORRECT:
min_val = 10**(n-1)  # Ensures n-digit minimum
max_val = 10**n - 1   # Ensures n-digit maximum
```

### 3. Checking both (i,j) and (j,i) duplicates

```
# WASTEFUL: Checks 91×99 and 99×91 separately
for i in range(...):
    for j in range(...):  # Full range creates duplicates

# OPTIMIZED: Start inner loop from i
for i in range(max_val, min_val - 1, -1):
    for j in range(i, min_val - 1, -1):  # j starts at i
```

### 4. Incorrect palindrome check

```
# WRONG: Reversing integer incorrectly
reversed_num = int(str(num)[::-1])  # Loses leading zeros (not an issue here)

# SIMPLER AND CORRECT:
return str(num) == str(num)[::-1]
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Find the factors** | Return (a, b) not palindrome | Store factors when found |
| **Smallest palindrome product** | Minimum instead of maximum | Search ascending, same logic |
| **k factors instead of 2** | Product of k n-digit numbers | k nested loops (combinatorial) |
| **Palindrome sum** | Sum of two n-digit numbers | Simpler - smaller search space |
| **Other bases** | Binary/hex palindromes | Adapt conversion and check |

**Finding factors variant:**

```
for i from max down to min:
    for j from i down to min:
        if is_palindrome(i * j):
            return (i, j, i * j)
```

---

## Practice Checklist

**Correctness:**

- [ ] Handles n=1 (single digit)
- [ ] Handles n=2 (returns 9009)
- [ ] Handles n=3 (returns 906609)
- [ ] Both factors are exactly n digits

**Optimization:**

- [ ] Searches from largest products down
- [ ] Implements early termination pruning
- [ ] Avoids duplicate (i,j) and (j,i) checks

**Interview Readiness:**

- [ ] Can explain palindrome check in 1 minute
- [ ] Can code solution in 8 minutes
- [ ] Can discuss optimization strategies
- [ ] Identified edge cases (n=1, no valid palindrome)

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement alternative approach (generate palindromes)
- [ ] Day 14: Explain trade-offs to someone else
- [ ] Day 30: Quick review

---

**Strategy Reference:** See [Number Theory Guide](../../prerequisites/number-theory.md) | [String Manipulation](../../prerequisites/strings.md)
