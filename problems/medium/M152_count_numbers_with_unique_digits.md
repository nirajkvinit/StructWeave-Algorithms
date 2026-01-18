---
id: M152
old_id: I156
slug: count-numbers-with-unique-digits
title: Count Numbers with Unique Digits
difficulty: medium
category: medium
topics: ["math", "combinatorics", "dynamic-programming"]
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems: ["E046", "M020", "M151"]
prerequisites: ["combinatorics", "permutations", "mathematical-reasoning"]
---
# Count Numbers with Unique Digits

## Problem

Here's a counting puzzle that's more interesting than it first appears. Given a non-negative integer `n`, you need to count how many numbers in the range from `0` to `10ⁿ - 1` have all unique digits. In other words, you're counting numbers where no digit repeats. For example, the number 123 has unique digits (each digit appears once), but 121 does not (the digit 1 appears twice). When `n = 2`, you're looking at numbers from 0 to 99, and you need to exclude numbers like 11, 22, 33, 44, 55, 66, 77, 88, and 99 because they have repeated digits. The brute force approach of checking every single number would work but becomes painfully slow as `n` grows - when `n = 8`, you'd be checking 100 million numbers. The key insight is that this is actually a combinatorics problem in disguise: instead of checking numbers, you should think about constructing them. How many ways can you choose digits for each position while ensuring no digit is used twice? Important edge cases include `n = 0` (which should return 1, representing just the number 0), and the constraint that the first digit of a multi-digit number cannot be 0 (since we don't write numbers like 012).

## Why This Matters

This problem appears in database query optimization when generating unique identifiers or license keys with distinct characters - systems need to know how many valid codes are possible before exhausting the space. It's fundamental in cryptography for calculating keyspace sizes when keys must have unique symbols, helping security engineers determine how long it would take to brute-force a system. The combinatorial reasoning you develop here transfers directly to problems in genetics (counting valid DNA sequences with certain constraints), in manufacturing quality control (sampling strategies for batch testing), and in A/B testing frameworks where you need to calculate the number of unique experiment configurations. This problem also teaches you to recognize when mathematical formulas can replace brute-force iteration - a critical optimization skill that separates efficient algorithms from naive ones.

## Examples

**Example 1:**
- Input: `n = 2`
- Output: `91`
- Explanation: We need to count integers from 0 to 99 where all digits are unique. Numbers like 11, 22, 33, 44, 55, 66, 77, 88, and 99 have repeated digits and must be excluded.

**Example 2:**
- Input: `n = 0`
- Output: `1`

## Constraints

- 0 <= n <= 8

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Think Combinatorially</summary>
Instead of generating all numbers and checking for unique digits, think about constructing numbers with unique digits. How many ways can you choose digits for each position? Remember that the first digit cannot be 0 (except for the number 0 itself).
</details>

<details>
<summary>🎯 Hint 2: Count by Number of Digits</summary>
Break the problem into cases based on the number of digits:
- 1-digit numbers: How many? (includes 0)
- 2-digit numbers with unique digits: First digit has 9 choices (1-9), second has 9 choices (0-9 except first)
- 3-digit numbers: 9 × 9 × 8 choices
- Continue pattern...

Sum counts for all lengths from 1 to n digits.
</details>

<details>
<summary>📝 Hint 3: Mathematical Formula</summary>
For k-digit numbers with unique digits (k >= 2):
- First digit: 9 choices (1-9, cannot be 0)
- Second digit: 9 choices (0-9 except first)
- Third digit: 8 choices (0-9 except first two)
- kth digit: (11-k) choices

Count(k) = 9 × 9 × 8 × 7 × ... × (11-k)

Algorithm:
1. Start with count = 10 (all 1-digit numbers: 0-9)
2. For length = 2 to min(n, 10):
   - Compute unique_count = 9 (first digit)
   - For remaining positions: multiply by (11 - length)
   - Add to total count
3. Special case: n >= 10 means answer is same as n = 10 (only 10 digits available)
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(10ⁿ × n) | O(1) | Check each number up to 10ⁿ |
| **Mathematical** | **O(n)** | **O(1)** | Compute combinatorially, at most 10 iterations |

## Common Mistakes

**Mistake 1: Checking Every Number**
```python
# Wrong: O(10^n) - too slow for large n
def countNumbersWithUniqueDigits(n):
    count = 0
    for num in range(10 ** n):
        if len(set(str(num))) == len(str(num)):
            count += 1
    return count
```

**Correct Approach:**
```python
# Correct: O(n) mathematical solution
def countNumbersWithUniqueDigits(n):
    if n == 0:
        return 1

    # 1-digit numbers: 0-9
    count = 10

    # k-digit numbers for k = 2 to min(n, 10)
    unique_count = 9  # First digit: 1-9
    available = 9     # Remaining digits for second position

    for i in range(1, min(n, 10)):
        unique_count *= available
        count += unique_count
        available -= 1

    return count
```

**Mistake 2: Not Handling Edge Cases**
```python
# Wrong: Doesn't handle n = 0 or n > 10
def countNumbersWithUniqueDigits(n):
    count = 10
    unique_count = 9
    available = 9
    for i in range(1, n):  # Wrong when n = 0!
        unique_count *= available
        count += unique_count
        available -= 1
    return count

# Correct: Handle all edge cases
def countNumbersWithUniqueDigits(n):
    if n == 0:
        return 1
    if n >= 10:
        n = 10  # Only 10 unique digits available

    count = 10
    unique_count = 9
    available = 9

    for i in range(1, n):
        unique_count *= available
        count += unique_count
        available -= 1

    return count
```

**Mistake 3: Incorrect Counting Logic**
```python
# Wrong: Doesn't account for leading zeros properly
def countNumbersWithUniqueDigits(n):
    if n == 0:
        return 1
    count = 0
    for length in range(1, n + 1):
        # Wrong: allows 0 as first digit for multi-digit numbers
        perm = 10
        for i in range(1, length):
            perm *= (10 - i)
        count += perm
    return count

# Correct: First digit cannot be 0
def countNumbersWithUniqueDigits(n):
    if n == 0:
        return 1

    count = 10  # 1-digit numbers
    unique_count = 9  # First digit: 1-9
    available = 9     # Second digit: 0-9 except first

    for i in range(1, min(n, 10)):
        unique_count *= available
        count += unique_count
        available -= 1

    return count
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| Count with Repeated Digits | Count numbers with at least one repeated digit | Total numbers - unique digit numbers |
| Specific Range | Count unique digit numbers in range [L, R] | Apply formula for R minus formula for L-1 |
| K Unique Digits | Numbers with exactly k unique digits | More complex combinatorics with inclusion-exclusion |
| Base B System | Unique digits in base B number system | Replace 10 with B in calculations |
| Ascending Digits | Digits must be in ascending order | Different combinatorial problem |

## Practice Checklist

- [ ] Day 1: Implement mathematical solution
- [ ] Day 2: Derive formula from first principles
- [ ] Day 7: Solve "count with repeated digits" variation
- [ ] Day 14: Solve for specific range [L, R]
- [ ] Day 30: Solve without looking at hints

**Strategy**: See [Mathematical Reasoning](../strategies/fundamentals/mathematical-thinking.md)
