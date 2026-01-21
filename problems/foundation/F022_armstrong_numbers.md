---
id: F022
slug: armstrong-numbers
title: Armstrong Numbers
difficulty: foundation
topics: ["math", "digit-manipulation", "number-theory"]
patterns: []
estimated_time_minutes: 12
prerequisites: ["programming-basics"]
---

# Armstrong Numbers

## Problem

An **Armstrong number** (also called narcissistic number or pluperfect digital invariant) is a number that equals the sum of its own digits each raised to the power of the number of digits.

**For an n-digit number**: The number equals d₁ⁿ + d₂ⁿ + ... + dₙⁿ, where dᵢ are the digits.

**Examples:**
- 153 is Armstrong: 1³ + 5³ + 3³ = 1 + 125 + 27 = 153 ✓
- 370 is Armstrong: 3³ + 7³ + 0³ = 27 + 343 + 0 = 370 ✓
- 9474 is Armstrong: 9⁴ + 4⁴ + 7⁴ + 4⁴ = 6561 + 256 + 2401 + 256 = 9474 ✓

Given a positive integer n, determine if it is an Armstrong number.

## Why This Matters

Armstrong numbers teach several important concepts:

**1. Digit Extraction**: Core skill for many number theory problems. You'll repeatedly use:
- `n % 10` to get the last digit
- `n / 10` to remove the last digit

**2. Counting Digits**: Determining the number of digits is needed before you can compute the sum—the exponent depends on the digit count.

**3. Exponentiation**: Computing dⁿ efficiently matters for large digit counts. While repeated multiplication works for small n, understanding exponentiation by squaring is valuable.

**4. Upper Bound Analysis**: For a d-digit number, the maximum sum is d × 9ᵈ. For large d, 9ᵈ grows much faster than 10ᵈ (the minimum d-digit number), so Armstrong numbers can only exist up to a certain size.

**5. Self-Reference in Mathematics**: Numbers defined by properties of their own representation (like Armstrong numbers, palindromes, and automorphic numbers) illustrate the interplay between numbers and their digit representations.

## Examples

**Example 1:**

- Input: `n = 153`
- Output: `true`
- Explanation: 3 digits. 1³ + 5³ + 3³ = 1 + 125 + 27 = 153 ✓

**Example 2:**

- Input: `n = 123`
- Output: `false`
- Explanation: 3 digits. 1³ + 2³ + 3³ = 1 + 8 + 27 = 36 ≠ 123

**Example 3:**

- Input: `n = 9`
- Output: `true`
- Explanation: 1 digit. 9¹ = 9 ✓ (All single digits are Armstrong)

**Example 4:**

- Input: `n = 9474`
- Output: `true`
- Explanation: 4 digits. 9⁴ + 4⁴ + 7⁴ + 4⁴ = 6561 + 256 + 2401 + 256 = 9474 ✓

## Constraints

- 1 <= n <= 10^8
- Return true if n is an Armstrong number, false otherwise

## Think About

1. How do you count the number of digits in a number?
2. How do you extract each digit?
3. How do you compute a digit raised to the power of the digit count?
4. Why are all single-digit numbers Armstrong numbers?

---

## Approach Hints

<details>
<summary>Hint 1: Counting Digits</summary>

**Method 1: Loop**
```
count_digits(n):
    count = 0
    while n > 0:
        count += 1
        n = n / 10  # integer division
    return count
```

**Method 2: String conversion**
```
count_digits(n):
    return length(str(n))
```

**Method 3: Logarithm (for n > 0)**
```
count_digits(n):
    return floor(log10(n)) + 1
```

**Example: n = 153**
- 153 / 10 = 15, count = 1
- 15 / 10 = 1, count = 2
- 1 / 10 = 0, count = 3
- Result: 3 digits

</details>

<details>
<summary>Hint 2: Computing Sum of Powered Digits</summary>

**Algorithm:**
1. Count digits to determine the exponent k
2. Extract each digit and compute digitᵏ
3. Sum all the powered digits
4. Compare sum with original number

```
sum_of_powered_digits(n, k):
    sum = 0
    while n > 0:
        digit = n mod 10
        sum += digit ^ k  # digit raised to power k
        n = n / 10
    return sum
```

**Example: n = 153, k = 3**
- digit = 3, sum = 27, n = 15
- digit = 5, sum = 27 + 125 = 152, n = 1
- digit = 1, sum = 152 + 1 = 153, n = 0
- Return 153

**Computing digit^k:**
```
power(base, exp):
    result = 1
    for i from 1 to exp:
        result *= base
    return result
```

Or use built-in: `pow(digit, k)` or `digit ** k`

</details>

<details>
<summary>Hint 3: Complete Solution</summary>

```
is_armstrong(n):
    original = n
    k = count_digits(n)
    sum = 0

    while n > 0:
        digit = n mod 10
        sum += pow(digit, k)
        n = n / 10

    return sum == original
```

**Optimization: Precompute powers**

Since digits are 0-9 and k ≤ 8 (for n ≤ 10^8), precompute dᵏ:

```
is_armstrong_optimized(n):
    original = n
    k = count_digits(n)

    # Precompute 0^k through 9^k
    powers = [pow(d, k) for d in 0 to 9]

    sum = 0
    while n > 0:
        digit = n mod 10
        sum += powers[digit]
        n = n / 10

    return sum == original
```

**To find all Armstrong numbers up to N:**
```
find_armstrong_numbers(N):
    result = []
    for n from 1 to N:
        if is_armstrong(n):
            result.append(n)
    return result
```

</details>

---

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Basic | O(d²) | O(1) | d = digits; d iterations × pow takes O(d) |
| Precompute powers | O(d) | O(10) | Precompute 0^d to 9^d |
| Find all up to N | O(N × log N) | O(1) | log₁₀(n) digits per number |

**Why the upper bound exists:**
- A d-digit number is at least 10^(d-1)
- Maximum sum of d-digit Armstrong: d × 9^d
- For d ≥ 60, d × 9^d < 10^(d-1), so no Armstrong numbers exist with 60+ digits

**All Armstrong numbers (in base 10):**
There are exactly 88 Armstrong numbers total:
1-9 (trivially), 153, 370, 371, 407, 1634, 8208, 9474, ...
The largest is 115,132,219,018,763,992,565,095,597,973,971,522,401 (39 digits).

---

## Key Concept

**Self-Referential Number Properties**

**Armstrong numbers** are defined by a relationship between a number and its own digit representation. This is a form of **self-reference**.

**Other self-referential number types:**

| Type | Property | Examples |
|------|----------|----------|
| Palindrome | Reads same forwards/backwards | 121, 1331 |
| Automorphic | n² ends in n | 5, 6, 25, 76 |
| Kaprekar | Special split property | 45, 297 |
| Armstrong | Sum of d^th power of digits | 153, 370 |
| Harshad | Divisible by digit sum | 18, 21 |

**Why digit manipulation matters:**

Many problems involve converting between:
- **Number** (mathematical value)
- **Representation** (digits in some base)

Operations:
```
Extracting digits:   n → [d₁, d₂, ..., dₖ]
Reconstructing:      [d₁, d₂, ..., dₖ] → n
Digit properties:    sum, product, reversal, etc.
```

**Base conversion insight:**
In base 10: n = Σ dᵢ × 10^(position)
Armstrong property is base-dependent—different bases have different Armstrong numbers.

---

## Common Mistakes

1. **Forgetting to save original n**: You modify n while extracting digits, but need the original for comparison.

2. **Using wrong power**: The exponent is the total digit count, not the digit's position.

3. **Off-by-one in digit count**: Make sure to count correctly; `log10(1000) = 3`, but 1000 has 4 digits.

4. **Single digits**: All single-digit numbers (1-9) are Armstrong numbers. Don't forget d¹ = d.

5. **Integer overflow**: For large numbers, d^k can overflow. Use appropriate integer types or check limits.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Armstrong in base b | Use base b digits | Extract digits with mod b |
| Sum of digit factorials | d! instead of d^k | Precompute 0! to 9! |
| Digit cubes sum | Always use k=3 | Fixed exponent (not digit count) |
| Perfect digit-to-digit invariant | Each digit raised to itself | 3435 = 3³ + 4⁴ + 3³ + 5⁵ |
| Next Armstrong | Find next Armstrong after n | Check candidates sequentially |

**Related: Digit factorial sum**
Numbers equal to sum of digit factorials:
- 145 = 1! + 4! + 5! = 1 + 24 + 120 = 145
- 40585 = 4! + 0! + 5! + 8! + 5! = 24 + 1 + 120 + 40320 + 120 = 40585

---

## Practice Checklist

**Correctness:**

- [ ] Handles single digits (1-9, all Armstrong)
- [ ] Handles 153 (true)
- [ ] Handles 123 (false)
- [ ] Handles 9474 (true, 4-digit)

**Understanding:**

- [ ] Can extract digits with mod/divide
- [ ] Understands why exponent equals digit count
- [ ] Knows there are finitely many Armstrong numbers
- [ ] Can count digits efficiently

**Mastery:**

- [ ] Solved without hints
- [ ] Can find all Armstrong numbers below N
- [ ] Understands the upper bound proof
- [ ] Can adapt to other bases

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Implement optimized version
- [ ] Day 7: Find all Armstrong numbers under 10000
- [ ] Day 14: Solve digit factorial variation

---

**Next Step:** After mastering this, try [F023: Number Spiral Diagonals](./F023_number_spiral_diagonals.md)
