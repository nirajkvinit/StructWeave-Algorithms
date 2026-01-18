---
id: E071
old_id: F172
slug: factorial-trailing-zeroes
title: Factorial Trailing Zeroes
difficulty: easy
category: easy
topics: ["math"]
patterns: ["factor-counting"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["M793", "E202", "E172"]
prerequisites: ["math", "number-theory"]
strategy_ref: ../strategies/fundamentals/math-techniques.md
---
# Factorial Trailing Zeroes

## Problem

Given an integer n, count how many trailing zeros are in n! (n factorial).

**What are trailing zeros?** The zeros at the end of a number:
- 120 has 1 trailing zero
- 1000 has 3 trailing zeros
- 5! = 120 has 1 trailing zero

**Where do trailing zeros come from?** Each trailing zero is created by a factor of 10, and 10 = 2 × 5.

**The key insight:** Don't compute the factorial! For n = 100, the factorial is a 158-digit number that will overflow any standard data type. Instead, count how many times 10 divides into n! by counting pairs of factors (2, 5).

**Critical observation:** In any factorial, there are always MORE factors of 2 than factors of 5:
- Every 2nd number contributes a factor of 2
- Only every 5th number contributes a factor of 5

Therefore, the number of trailing zeros = the number of times 5 appears as a factor in 1 × 2 × 3 × ... × n.

**But wait, there's more:** Numbers like 25 = 5² contribute TWO factors of 5. So we need to count:
- Multiples of 5: contribute one factor of 5
- Multiples of 25 (5²): contribute an additional factor of 5
- Multiples of 125 (5³): contribute another additional factor of 5
- And so on...

Total = ⌊n/5⌋ + ⌊n/25⌋ + ⌊n/125⌋ + ...

## Why This Matters

This problem teaches **mathematical optimization** - replacing brute force computation with analytical thinking. The pattern appears in:
- **Prime factorization analysis**: Counting specific prime factors in products
- **Combinatorial problems**: Finding divisibility without full computation
- **Number theory applications**: GCD, LCM calculations using prime factors
- **Algorithm optimization**: Recognizing when math can replace computation

This is a common interview pattern: "Don't do the obvious expensive computation - find a mathematical property to exploit." Understanding when to switch from computation to analysis is a crucial skill.

## Examples

**Example 1:**
- Input: `n = 3`
- Output: `0`
- Explanation: 3! = 6, no trailing zero.

**Example 2:**
- Input: `n = 5`
- Output: `1`
- Explanation: 5! = 120, one trailing zero.

**Example 3:**
- Input: `n = 0`
- Output: `0`

## Constraints

- 0 <= n <= 10⁴

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Where Do Trailing Zeros Come From?</summary>

Trailing zeros are created by factors of 10, and 10 = 2 × 5.

In any factorial, which is more abundant: factors of 2 or factors of 5?
- Every even number contributes at least one factor of 2
- Only every 5th number contributes a factor of 5

So the number of trailing zeros = number of times 10 is a factor = min(count of 2s, count of 5s).

Since we always have more 2s than 5s, we only need to count the factors of 5!

</details>

<details>
<summary>🎯 Hint 2: Count Factors of 5</summary>

Don't actually compute the factorial (it's huge and will overflow)!

Count how many times 5 appears as a factor in 1, 2, 3, ..., n:
- Numbers divisible by 5: 5, 10, 15, 20, 25, ... → ⌊n/5⌋ numbers
- Numbers divisible by 25 (5²): 25, 50, 75, ... → ⌊n/25⌋ numbers (contribute extra 5)
- Numbers divisible by 125 (5³): 125, 250, ... → ⌊n/125⌋ numbers (contribute another extra 5)
- And so on...

Total count = ⌊n/5⌋ + ⌊n/25⌋ + ⌊n/125⌋ + ...

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithm</summary>

```
1. Initialize count = 0
2. Initialize divisor = 5
3. While divisor <= n:
   a. count += n / divisor (integer division)
   b. divisor *= 5
4. Return count
```

**Alternative (avoid overflow):**
```
1. Initialize count = 0
2. While n >= 5:
   a. n = n / 5 (integer division)
   b. count += n
3. Return count
```

Example for n = 30:
- ⌊30/5⌋ = 6 (numbers: 5,10,15,20,25,30)
- ⌊30/25⌋ = 1 (number: 25 contributes extra 5)
- ⌊30/125⌋ = 0
- Total = 6 + 1 = 7 trailing zeros

Time: O(log₅ n), Space: O(1)
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Compute Factorial | O(n) | O(1) | Overflows quickly, impractical |
| Brute Force Count | O(n log n) | O(1) | Count factors of 5 in each number |
| **Count by Powers of 5** | **O(log n)** | **O(1)** | Optimal mathematical solution |

## Common Mistakes

### 1. Trying to Compute the Factorial
```python
# WRONG: Compute factorial then count zeros
factorial = 1
for i in range(1, n + 1):
    factorial *= i
# Overflows for n > ~20, extremely inefficient

# CORRECT: Count factors of 5 directly
count = 0
while n >= 5:
    n //= 5
    count += n
```

### 2. Only Counting Multiples of 5
```python
# WRONG: Only count n/5
return n // 5
# Misses extra factors from 25, 125, etc.

# CORRECT: Count all powers of 5
count = 0
divisor = 5
while divisor <= n:
    count += n // divisor
    divisor *= 5
return count
```

### 3. Integer Overflow When Multiplying Divisor
```python
# WRONG: divisor *= 5 can overflow
divisor = 5
while divisor <= n:
    count += n // divisor
    divisor *= 5  # Can overflow for large n

# CORRECT: Divide n instead
while n >= 5:
    n //= 5
    count += n
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Trailing zeros in base k | Count in different base | Count min of all prime factors of k |
| Factorial digit sum | Sum all digits in n! | Need big integer arithmetic |
| First non-zero digit | Find rightmost non-zero digit | More complex factor analysis |
| Count specific digit | Count occurrences of digit d | Different combinatorial approach |

## Practice Checklist

**Correctness:**
- [ ] Handles n = 0 correctly (0 zeros)
- [ ] Handles n < 5 correctly (0 zeros)
- [ ] Handles n = 5 correctly (1 zero)
- [ ] Handles multiples of 25 (extra factor of 5)
- [ ] Handles multiples of 125 (two extra factors)
- [ ] Handles maximum n = 10⁴

**Interview Readiness:**
- [ ] Can explain why we count factors of 5
- [ ] Can explain why we don't need factors of 2
- [ ] Can code solution in 5 minutes
- [ ] Can trace through example (n=30)
- [ ] Can explain logarithmic complexity

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Explain why we count powers of 5
- [ ] Day 14: Teach to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Mathematical Techniques](../../strategies/fundamentals/math-techniques.md)
