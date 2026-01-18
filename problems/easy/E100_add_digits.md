---
id: E100
old_id: I058
slug: add-digits
title: Add Digits
difficulty: easy
category: easy
topics: ["math", "simulation"]
patterns: ["mathematical"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E202", "E258", "M050"]
prerequisites: ["modulo-arithmetic", "digital-root"]
strategy_ref: ../strategies/patterns/mathematical.md
---
# Add Digits

## Problem

Given a positive integer, repeatedly sum its individual digits until only a single digit remains. For example, if you start with 38, you first add 3 + 8 to get 11, then add 1 + 1 to get 2. The result is 2, a single digit.

This process, known as finding the "digital root," seems to require iteration, but there's a mathematical shortcut hiding beneath the surface. The straightforward approach of extracting digits with modulo and division operations works, but mathematicians discovered that repeatedly summing digits is equivalent to taking the number modulo 9 (with special handling for multiples of 9). This problem appears simple on the surface but rewards you for recognizing the underlying mathematical pattern.

Return the final single digit that results from this repeated summation process.

## Why This Matters

This problem teaches the powerful technique of replacing iterative algorithms with closed-form mathematical solutions. Understanding the digital root formula deepens your knowledge of modular arithmetic and number theory, concepts that appear in hash functions, checksums, and cryptographic algorithms. The pattern of "finding mathematical invariants" is a core problem-solving strategy in competitive programming and technical interviews. Additionally, this problem demonstrates how seemingly simple operations can hide elegant mathematical relationships, a mindset that helps you optimize code by recognizing when brute force can be replaced with a formula.

## Examples

**Example 1:**
- Input: `num = 38`
- Output: `2`
- Explanation: The process is
38 --> 3 + 8 --> 11
11 --> 1 + 1 --> 2
Since 2 has only one digit, return it.

**Example 2:**
- Input: `num = 0`
- Output: `0`

## Constraints

- 0 <= num <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Simulation Approach</summary>

The straightforward approach is to repeatedly extract digits, sum them, and repeat until only one digit remains. Extract digits using `num % 10` for the last digit and `num // 10` to remove it. This works but requires iteration. Think about whether there's a mathematical pattern.

</details>

<details>
<summary>🎯 Hint 2: Digital Root Formula</summary>

This problem is asking for the "digital root" of a number. There's a mathematical relationship: the digital root equals `1 + ((num - 1) % 9)` for positive numbers. This is because repeatedly summing digits is equivalent to taking num modulo 9. For example: 38 % 9 = 2, and 38 → 11 → 2.

</details>

<details>
<summary>📝 Hint 3: O(1) Mathematical Solution</summary>

Pseudocode approach:
1. If num == 0: return 0
2. If num % 9 == 0: return 9
3. Else: return num % 9

Or simplified: `num == 0 ? 0 : 1 + (num - 1) % 9`

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Simulation) | O(log n) | O(1) | Iterate until single digit |
| Recursive Simulation | O(log n) | O(log n) | Call stack depth |
| **Optimal (Digital Root)** | **O(1)** | **O(1)** | Mathematical formula |

## Common Mistakes

### Mistake 1: Infinite Loop in Simulation

```python
# WRONG: Loop condition never satisfied for single-digit input
def addDigits(num):
    while num >= 10:  # Bug: if num < 10 initially, skips loop
        total = 0
        while num > 0:
            total += num % 10
            num //= 10
        # Forgot to update num with total!
    return num  # Returns 0 instead of original single digit
```

```python
# CORRECT: Update num in each iteration
def addDigits(num):
    while num >= 10:
        total = 0
        while num > 0:
            total += num % 10
            num //= 10
        num = total  # Critical update
    return num
```

### Mistake 2: Wrong Digital Root Formula

```python
# WRONG: Not handling edge cases correctly
def addDigits(num):
    return num % 9  # Bug: returns 0 for 9, should return 9
```

```python
# CORRECT: Handle the edge case where num % 9 == 0
def addDigits(num):
    if num == 0:
        return 0
    return 9 if num % 9 == 0 else num % 9
# Or: return 0 if num == 0 else 1 + (num - 1) % 9
```

### Mistake 3: Not Understanding Why Digital Root Works

```python
# WRONG: Using digital root without understanding (same result, but no insight)
def addDigits(num):
    if num == 0:
        return 0
    return 1 + (num - 1) % 9  # Works, but why?
```

```python
# CORRECT: Understanding the mathematical principle
def addDigits(num):
    # Digital root theorem: repeatedly summing digits ≡ num (mod 9)
    # 38 ≡ 2 (mod 9), and 3+8=11 ≡ 2 (mod 9), and 1+1=2
    # Special case: multiples of 9 have digital root 9, not 0
    if num == 0:
        return 0
    return 9 if num % 9 == 0 else num % 9
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Happy Number | Easy | Keep squaring digits until 1 or cycle |
| Ugly Number | Easy | Check if only factors are 2, 3, 5 |
| Self Dividing Numbers | Easy | All digits divide the number |
| Sum of Digits in Base K | Easy | Convert to base k first, then sum digits |

## Practice Checklist

- [ ] Day 1: Solve with simulation (10 min)
- [ ] Day 2: Implement O(1) digital root solution (5 min)
- [ ] Day 7: Explain why digital root formula works (10 min)
- [ ] Day 14: Code both approaches from memory (5 min)
- [ ] Day 30: Solve related problem (Happy Number) (15 min)

**Strategy**: See [Mathematical Pattern](../strategies/patterns/mathematical.md)
