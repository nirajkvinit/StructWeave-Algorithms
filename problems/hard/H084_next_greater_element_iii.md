---
id: H084
old_id: A052
slug: next-greater-element-iii
title: Next Greater Element III
difficulty: hard
category: hard
topics: ["monotonic-stack"]
patterns: []
estimated_time_minutes: 45
strategy_ref: ../strategies/patterns/monotonic-stack.md
---
# Next Greater Element III

## Problem

You are given a positive integer `n`. Your task is to find the smallest number that contains the exact same digits as `n` but has a larger value. If such a number cannot be formed, return `-1`.

The result must be representable as a **32-bit signed integer**. If a valid answer exists but exceeds the 32-bit integer range, return `-1`.

## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Examples

**Example 1:**
- Input: `n = 12`
- Output: `21`

**Example 2:**
- Input: `n = 21`
- Output: `-1`

## Constraints

- 1 <= n <= 2³¹ - 1

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [Monotonic Stack Pattern](../strategies/patterns/monotonic-stack.md)

## Approach Hints

<details>
<summary>Key Insight</summary>
This is actually a permutation problem, not a stack problem. Find the next permutation of the digits. The key is to identify the rightmost position where you can make a swap that increases the number, then minimize the increase by rearranging the remaining digits.
</details>

<details>
<summary>Main Approach</summary>
Convert number to digit array. From right to left, find the first digit that is smaller than the digit to its right (pivot). Then find the smallest digit to the right of pivot that is larger than pivot, swap them, and sort the digits after the pivot position in ascending order to get the smallest possible increase.
</details>

<details>
<summary>Optimization Tip</summary>
The digits to the right of the pivot are already in descending order, so instead of sorting, just reverse them after the swap. Also, check for integer overflow before returning the result by comparing against 2^31 - 1.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n! * log n) | O(n) | Generate all permutations, sort, find next |
| Optimal | O(d) | O(d) | d = number of digits, typically ≤ 10 |

## Common Mistakes

1. **Misunderstanding the problem as a monotonic stack problem**
   ```python
   # Wrong: Using stack approach
   stack = []
   for digit in digits:
       while stack and stack[-1] < digit:
           # This doesn't solve next permutation

   # Correct: Use next permutation algorithm
   # Find pivot from right where digits[i] < digits[i+1]
   i = len(digits) - 2
   while i >= 0 and digits[i] >= digits[i + 1]:
       i -= 1
   ```

2. **Not checking for integer overflow**
   ```python
   # Wrong: Converting back without checking bounds
   result = int(''.join(map(str, digits)))
   return result  # May exceed 32-bit integer range

   # Correct: Check before returning
   result = int(''.join(map(str, digits)))
   return result if result <= 2**31 - 1 else -1
   ```

3. **Sorting instead of reversing after swap**
   ```python
   # Wrong: Unnecessary sorting
   digits[i], digits[j] = digits[j], digits[i]
   digits[i+1:] = sorted(digits[i+1:])  # O(d log d)

   # Correct: Just reverse (digits after pivot are descending)
   digits[i], digits[j] = digits[j], digits[i]
   digits[i+1:] = reversed(digits[i+1:])  # O(d)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Next Permutation | Medium | Same algorithm but on array of integers |
| Previous Permutation | Medium | Find previous permutation instead of next |
| Next Greater Element I/II | Medium | Actually uses monotonic stack, different problem |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Permutations](../../strategies/patterns/permutations.md)
