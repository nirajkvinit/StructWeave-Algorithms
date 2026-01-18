---
id: M409
old_id: A255
slug: rotated-digits
title: Rotated Digits
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Rotated Digits

## Problem

An integer is called "good" if when you rotate it 180 degrees, all its digits remain valid AND the resulting number is different from the original.

When rotated 180 degrees, digits transform according to these rules:
- `0`, `1`, `8` remain unchanged (they look the same upside down)
- `2` becomes `5`, and `5` becomes `2`
- `6` becomes `9`, and `9` becomes `6`
- `3`, `4`, `7` become invalid (they don't form recognizable digits when rotated)

For a number to be "good", two conditions must hold:
1. Every digit must be valid when rotated (no `3`, `4`, or `7`)
2. At least one digit must change (can't consist only of `0`, `1`, `8`)

For example, `2` is good: it rotates to `5` (different and valid). But `11` is not good: it rotates to `11` (unchanged). And `34` is not good: the `3` and `4` become invalid when rotated.

Given an integer `n`, count how many good integers exist in the range `[1, n]`.

## Why This Matters

This is a digit-level manipulation problem that teaches you to analyze numbers by their individual digits rather than their numeric value. This skill appears in problems involving number bases, digit patterns, palindromes, and validation rules.

The problem demonstrates constraint-based counting: determining membership in a set defined by multiple conditions. Similar logic appears in form validation, data cleaning, pattern matching, and rule-based filtering in real systems.

For larger values of n, this problem extends to digit dynamic programming - building valid numbers digit by digit while tracking state. This technique is fundamental for counting problems with digit-level constraints, appearing in competitive programming and numeric algorithms.

## Examples

**Example 1:**
- Input: `n = 10`
- Output: `4`
- Explanation: There are four good numbers in the range [1, 10] : 2, 5, 6, 9.
Note that 1 and 10 are not good numbers, since they remain unchanged after rotating.

**Example 2:**
- Input: `n = 1`
- Output: `0`

**Example 3:**
- Input: `n = 2`
- Output: `1`

## Constraints

- 1 <= n <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
A number is "good" only if: (1) all its digits are valid when rotated (no 3, 4, or 7), AND (2) at least one digit changes when rotated (must have at least one 2, 5, 6, or 9). Numbers containing only 0, 1, and 8 remain unchanged and are NOT good.
</details>

<details>
<summary>🎯 Main Approach</summary>
Iterate through all numbers from 1 to n. For each number, check each digit to ensure it's valid (0,1,2,5,6,8,9). Track whether any digit changes upon rotation (2,5,6,9). If all digits are valid AND at least one changes, count it as good. This is a digit-by-digit validation problem.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use digit DP for larger n values (though n <= 10^4 makes brute force viable). Categorize digits into three sets: invalid (3,4,7), same (0,1,8), and different (2,5,6,9). A number is good if it contains no invalid digits and at least one "different" digit. You can also use string manipulation to check digits efficiently.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n * log n) | O(1) | Check each number's digits, log n for digit count |
| Digit DP | O(log n) | O(log n) | Build numbers digit by digit with state tracking |
| Optimal | O(n) | O(1) | Single pass with digit validation |

## Common Mistakes

1. **Forgetting that unchanged numbers are not good**
   ```python
   # Wrong: Counting numbers with only 0, 1, 8 as good
   def is_good(n):
       valid = {'0','1','2','5','6','8','9'}
       return all(d in valid for d in str(n))

   # Correct: Must have at least one changing digit
   def is_good(n):
       valid = {'0','1','2','5','6','8','9'}
       changing = {'2','5','6','9'}
       s = str(n)
       return all(d in valid for d in s) and any(d in changing for d in s)
   ```

2. **Not handling invalid digits properly**
   ```python
   # Wrong: Only checking if digits change
   def is_good(n):
       changing = {'2','5','6','9'}
       return any(d in changing for d in str(n))

   # Correct: Check both valid AND changing
   def is_good(n):
       invalid = {'3','4','7'}
       changing = {'2','5','6','9'}
       s = str(n)
       if any(d in invalid for d in s):
           return False
       return any(d in changing for d in s)
   ```

3. **Inefficient string conversion multiple times**
   ```python
   # Wrong: Converting to string repeatedly
   for i in range(1, n+1):
       if all(d in valid for d in str(i)):
           if any(d in changing for d in str(i)):
               count += 1

   # Correct: Convert once and reuse
   for i in range(1, n+1):
       s = str(i)
       if all(d in valid for d in s) and any(d in changing for d in s):
           count += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Confusing Number | Easy | Check if single number is confusing when rotated |
| Strobogrammatic Number | Easy | Number looks same when rotated 180 degrees |
| Strobogrammatic Number II | Medium | Generate all n-digit strobogrammatic numbers |
| Confusing Number II | Hard | Count confusing numbers up to n with digit DP |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days
