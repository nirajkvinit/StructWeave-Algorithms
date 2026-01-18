---
id: M289
old_id: A094
slug: minimum-factorization
title: Minimum Factorization
difficulty: medium
category: medium
topics: ["math", "greedy"]
patterns: ["greedy-digit-construction"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E203", "M133", "M417"]
prerequisites: ["prime-factorization", "greedy-algorithms", "number-theory"]
---
# Minimum Factorization

## Problem

You're given a positive integer `num`, and your task is to find the smallest number `x` such that the product of `x`'s digits equals `num`. For instance, if `num = 48`, you need to find digits that multiply to 48. The number 68 works because 6 × 8 = 48, and 68 is the smallest such number (both 86 and 268 also work, but they're larger).

The constraints add complexity:
- You can only use digits 2-9 in your answer (digit 1 doesn't help since 1 is the multiplicative identity, and digit 0 would make the product 0)
- If the result would exceed 2³¹ - 1 (the 32-bit signed integer limit), return 0
- If it's impossible to represent `num` as a product of single digits, return 0

When is it impossible? If `num` contains prime factors larger than 7. For example, `num = 11` is impossible because 11 is prime and greater than 9. Similarly, `num = 14 = 2 × 7` is possible, but `num = 22 = 2 × 11` is not (since 11 can't be expressed as a product of digits 2-9).

The key insight is using a greedy approach: to minimize the resulting number, use larger digits when possible (fewer digits means a smaller number). Start with 9 and work down to 2, extracting each factor as many times as possible. For `num = 48 = 2⁴ × 3`:
- 48 ÷ 9 = not divisible
- 48 ÷ 8 = 6, so we can use digit 8, leaving 6
- 6 ÷ 6 = 1, so we can use digit 6, done
- Digits: [8, 6] → arrange in ascending order to minimize: "68"

Special case: `num = 1` should return 1 (not 0), since the product of zero digits is conventionally 1.

## Why This Matters

This problem combines number theory (prime factorization), greedy algorithms, and constraint satisfaction - a trio frequently appearing in algorithmic challenges. It teaches you to think about the relationship between factorization and digit representation, which is relevant to cryptography, hash function design, and optimization problems with discrete choices. The greedy strategy of choosing the largest possible factors mirrors real-world resource allocation where you want to minimize some cost (here, the number of digits). Understanding when a problem has no solution (detecting large prime factors) is equally important as finding optimal solutions, a skill applicable to constraint satisfaction problems in AI and operations research.

## Examples

**Example 1:**
- Input: `num = 48`
- Output: `68`
- Explanation: 6 * 8 = 48. We use digits from 9 down to 2, taking 8 and 6.

**Example 2:**
- Input: `num = 15`
- Output: `35`
- Explanation: 3 * 5 = 15. Using digits 3 and 5 in ascending order gives 35.

**Example 3:**
- Input: `num = 1`
- Output: `1`
- Explanation: 1 has no factors, so return 1 itself.

## Constraints

- 1 <= num <= 2³¹ - 1

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Greedy Digit Selection</summary>

To minimize the resulting number, you want fewer digits, which means using larger digit factors. Start from 9 and work down to 2, greedily dividing `num` by each digit as many times as possible. If `num` has a prime factor greater than 7 (like 11 or 13), it's impossible to represent it using only single digits 2-9, so return 0. The special case `num == 1` should return 1.

</details>

<details>
<summary>Hint 2: Build the Result</summary>

As you find factors (digits), collect them and arrange them in ascending order to get the smallest number. For example, if you find factors [8, 6], arrange as "68". You can collect digits in a list, then sort and concatenate them. Don't forget to check if the result fits within 32-bit signed integer range (2^31 - 1).

</details>

<details>
<summary>Hint 3: Edge Cases and Validation</summary>

Handle special cases: if `num == 1`, return 1 immediately. If after trying all digits 2-9, `num` is still greater than 1, it means `num` has prime factors greater than 7, making it impossible (return 0). Also verify that the constructed result doesn't exceed `2^31 - 1` before returning it.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy Factorization | O(log num) | O(log num) | Iterate through digits 9 to 2; space for storing result digits |
| Brute Force Generation | O(10^k) | O(1) | k is number of digits in result; highly inefficient |
| Dynamic Programming | O(num * log num) | O(num) | Overkill for this problem; not recommended |

## Common Mistakes

1. **Not handling the num == 1 case**
```python
# Wrong: doesn't special-case 1
def smallestFactorization(num):
    if num < 10:
        return num  # This incorrectly returns 1 for num=1
    # ... rest of logic

# Correct: explicitly handle num == 1
def smallestFactorization(num):
    if num == 1:
        return 1
    if num < 10:
        return 0  # Can't factorize primes 2-9 into smaller digits
```

2. **Building result in wrong order**
```python
# Wrong: appends digits in reverse order
def smallestFactorization(num):
    result = ""
    for digit in range(9, 1, -1):
        while num % digit == 0:
            result += str(digit)  # "96" instead of "69" for num=54
            num //= digit

# Correct: collect then sort
def smallestFactorization(num):
    digits = []
    for d in range(9, 1, -1):
        while num % d == 0:
            digits.append(d)
            num //= d
    return int(''.join(map(str, sorted(digits))))
```

3. **Not checking 32-bit overflow**
```python
# Wrong: doesn't validate result size
def smallestFactorization(num):
    # ... build result ...
    return result  # Could exceed 2^31 - 1

# Correct: check before returning
def smallestFactorization(num):
    # ... build result ...
    if result > 2**31 - 1:
        return 0
    return result
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Maximum Factorization | Find the largest number whose digit product equals `num` | Medium |
| K-Digit Factorization | Find factorization using exactly `k` digits | Hard |
| Digit Product Path | Find shortest path in digit graph where edges multiply | Hard |
| Prime Digit Product | Restrict to prime digits only (2, 3, 5, 7) | Medium |

## Practice Checklist

- [ ] Implement greedy factorization from 9 to 2
- [ ] Handle edge case: num == 1
- [ ] Handle edge case: num is prime (2-9)
- [ ] Handle edge case: num has large prime factors (return 0)
- [ ] Check for 32-bit overflow
- [ ] Test with num = 48, 15, 1, 18, 100
- [ ] **Review in 24 hours**: Re-implement from memory
- [ ] **Review in 1 week**: Solve without hints
- [ ] **Review in 2 weeks**: Explain why greedy works
