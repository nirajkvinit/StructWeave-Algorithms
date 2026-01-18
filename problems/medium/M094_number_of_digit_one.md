---
id: M094
old_id: I033
slug: number-of-digit-one
title: Number of Digit One
difficulty: medium
category: medium
topics: ["math", "digit-dp"]
patterns: ["digit-dynamic-programming"]
estimated_time_minutes: 30
frequency: low
related_problems: ["H233", "M357", "E1067"]
prerequisites: ["digit-manipulation", "dynamic-programming", "math-patterns"]
---
# Number of Digit One

## Problem

You are provided with an integer `n`. Your task is to count how many times the digit `1` appears when you write out all integers from 0 to `n`. For example, if `n = 13`, you would write: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13. Counting all the `1`s, you find them in: 1 (one `1`), 10 (one `1`), 11 (two `1`s), 12 (one `1`), 13 (one `1`), giving a total of 6 occurrences. The naive approach of iterating through every number and counting `1`s works for small values, but becomes impossibly slow for large n (up to 1 billion). You need to find a mathematical pattern based on digit positions. Consider how many times `1` appears in the ones place across all numbers from 0 to 99, then in the tens place, then the hundreds place, and so on. The answer involves analyzing each digit position independently and summing the contributions.

## Why This Matters

This problem demonstrates digit dynamic programming, a technique used in analytics systems that need to compute statistics over large numerical ranges efficiently. For instance, Google Analytics might need to count how many page views had IDs containing certain digit patterns across billions of records. Credit card validation systems analyze digit patterns to detect potentially fraudulent sequences. In telecommunications, billing systems compute statistics over phone numbers and call durations within specific ranges. The mathematical approach here, which processes digits by position rather than iterating through all numbers, is essential for handling queries over massive numerical datasets. This same pattern-based counting technique extends to problems like counting valid passwords, analyzing numerical distributions, and optimizing database range queries.

## Examples

**Example 1:**
- Input: `n = 13`
- Output: `6`

**Example 2:**
- Input: `n = 0`
- Output: `0`

## Constraints

- 0 <= n <= 10⁹

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

Counting digit by digit for each number is too slow for n up to 10⁹. Think about patterns: how many times does '1' appear in the ones place from 0-99? In the tens place? Can you identify a mathematical pattern based on position and the current digit?

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use digit dynamic programming or mathematical formula. For each digit position (ones, tens, hundreds, etc.), count how many 1s appear in that position across all numbers from 0 to n. Consider three cases: when the digit at that position is 0, 1, or greater than 1. The count depends on digits to the left and right.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

```
count = 0
factor = 1  # current position (1, 10, 100, ...)

while factor <= n:
  higher = n // (factor * 10)
  current = (n // factor) % 10
  lower = n % factor

  if current == 0:
    count += higher * factor
  elif current == 1:
    count += higher * factor + lower + 1
  else:  # current > 1
    count += (higher + 1) * factor

  factor *= 10

return count
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n log n) | O(1) | Count 1s in each number, too slow |
| **Digit DP / Math** | **O(log n)** | **O(1)** | Process each digit position once |
| Recursive with Memo | O(log² n) | O(log n) | Digit DP with memoization |

## Common Mistakes

### Mistake 1: Iterating through all numbers (TLE)
```python
# Wrong - O(n log n) is too slow for n up to 10⁹
count = 0
for i in range(n + 1):
    count += str(i).count('1')
return count

# Correct - O(log n) mathematical approach
def countDigitOne(n):
    count = 0
    factor = 1
    while factor <= n:
        higher = n // (factor * 10)
        current = (n // factor) % 10
        lower = n % factor
        # Apply formula based on current digit
        if current == 0:
            count += higher * factor
        elif current == 1:
            count += higher * factor + lower + 1
        else:
            count += (higher + 1) * factor
        factor *= 10
    return count
```

### Mistake 2: Not handling the case when current digit is 1 correctly
```python
# Wrong - treating digit 1 same as other digits
if current >= 1:
    count += (higher + 1) * factor

# Correct - special case for digit 1
if current == 1:
    count += higher * factor + lower + 1
elif current > 1:
    count += (higher + 1) * factor
```

### Mistake 3: Integer overflow or incorrect division
```python
# Wrong - may miss last digit position
while factor < n:  # Should be <=
    # process

# Correct
while factor <= n:
    # process all positions including the highest
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Count Digit K | Medium | Count any digit k instead of just 1 |
| Digit Count in Range | Hard | Count 1s in range [L, R] |
| Numbers At Most N Given Digit Set | Hard | Count valid numbers from digit set |
| Numbers With Repeated Digits | Hard | Count numbers with at least one repeated digit |

## Practice Checklist

- [ ] Understand the mathematical pattern for each position
- [ ] Implement brute force for small n to verify
- [ ] Implement O(log n) digit DP solution
- [ ] Test with n = 0
- [ ] Test with n = 10, 100, 1000 (powers of 10)
- [ ] Test with n = 13 (example case)
- [ ] Test with large n close to 10⁹

**Spaced Repetition Schedule:**
- Day 1: Initial attempt, understand digit patterns
- Day 3: Implement mathematical formula
- Day 7: Solve for arbitrary digit k
- Day 14: Explain the three cases (0, 1, >1)
- Day 30: Speed solve under 25 minutes

**Strategy**: See [Digit Dynamic Programming](../strategies/patterns/digit-dp.md)
