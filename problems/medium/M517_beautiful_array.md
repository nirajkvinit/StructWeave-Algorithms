---
id: M517
old_id: A399
slug: beautiful-array
title: Beautiful Array
difficulty: medium
category: medium
topics: ["array"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
---
# Beautiful Array

## Problem

Imagine you're designing a security system that generates access codes with a special mathematical property: no code in the sequence can be guessed by looking at the codes on either side of it. Specifically, if someone sees two codes, they shouldn't be able to predict a code between them using their arithmetic average.

An array `nums` of length `n` is considered beautiful when it satisfies these strict conditions:

1. It contains each integer from `1` to `n` exactly once (it's a permutation)
2. For any triplet of positions where `i < k < j`, the middle element `nums[k]` is never the arithmetic mean of `nums[i]` and `nums[j]`

Mathematically: there should be no positions `i < k < j` where `2 × nums[k] == nums[i] + nums[j]`.

Given an integer `n`, construct and return any valid beautiful array of length `n`. At least one solution is guaranteed to exist for every valid input.

Example of the constraint:
- `[2, 1, 4, 3]` is beautiful because checking all triplets:
  - Position (0,1,2): `2×1 ≠ 2+4` ✓
  - Position (0,1,3): `2×1 ≠ 2+3` ✓
  - Position (0,2,3): `2×4 ≠ 2+3` ✓
  - And so on...

## Why This Matters

This problem introduces divide-and-conquer thinking with a mathematical twist, teaching you to exploit number theory properties to solve seemingly impossible constraints. The technique has applications in cryptography (generating sequences with low correlation), signal processing (creating pseudo-random sequences), and distributed systems (generating IDs that avoid predictable patterns). The insight that odd+even can never equal 2×anything (since one side is odd, making equality impossible) demonstrates how mathematical properties can dramatically simplify algorithm design. This type of invariant-based reasoning appears in security protocols, error-correcting codes, and data structures like skip lists. Learning to recognize when mathematical properties can replace brute-force searching is a critical skill for advanced algorithm design.

## Examples

**Example 1:**
- Input: `n = 4`
- Output: `[2,1,4,3]`

**Example 2:**
- Input: `n = 5`
- Output: `[3,1,2,5,4]`

## Constraints

- 1 <= n <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The constraint means no element can be the average of elements surrounding it. Key insight: if you separate odd and even numbers, odd+even can never equal 2*anything (since one side is odd, the other even, sum is odd). Build recursively by putting all odds before all evens.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use divide and conquer. For a beautiful array of size n, create two beautiful arrays: one with odd numbers, one with even. The property holds because 2*(odd or even) is always even, but odd+even is always odd - they can never be equal. Transform [1..k] by doubling (evens) or 2x-1 (odds).
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Start with base case [1]. To build size n: take beautiful array for n/2, transform elements as 2*x-1 for odds, then append 2*x for evens. The linear transformation preserves the beautiful property. Use memoization or build iteratively from size 1 upward.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Backtracking | O(n! × n) | O(n) | Try all permutations, too slow |
| Divide & Conquer | O(n log n) | O(n log n) | Build recursively with transformations |
| Optimal | O(n log n) | O(n) | Iterative doubling approach |

## Common Mistakes

1. **Not understanding the odd/even separation property**
   ```python
   # Wrong: Random arrangement hoping it works
   def beautifulArray(self, n):
       import random
       arr = list(range(1, n + 1))
       while not self.isBeautiful(arr):
           random.shuffle(arr)
       return arr  # Extremely slow and wrong approach

   # Correct: Use odd/even divide and conquer
   def beautifulArray(self, n):
       if n == 1:
           return [1]
       # Odds: transform beautiful array for (n+1)//2
       odds = [2*x - 1 for x in self.beautifulArray((n + 1) // 2)]
       # Evens: transform beautiful array for n//2
       evens = [2*x for x in self.beautifulArray(n // 2)]
       return odds + evens
   ```

2. **Incorrect transformation or base case**
   ```python
   # Wrong: Transformation doesn't preserve beautiful property
   def beautifulArray(self, n):
       if n == 1:
           return [1]
       smaller = self.beautifulArray(n - 1)
       return smaller + [n]  # Bug: just appending doesn't work

   # Correct: Proper linear transformation
   def beautifulArray(self, n):
       memo = {1: [1]}

       def helper(n):
           if n in memo:
               return memo[n]
           # Odd transformation: 2x-1 keeps beautiful property
           odds = [2*x - 1 for x in helper((n + 1) // 2)]
           # Even transformation: 2x keeps beautiful property
           evens = [2*x for x in helper(n // 2)]
           memo[n] = odds + evens
           return memo[n]

       return helper(n)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Perfect Squares | Medium | Mathematical properties of numbers |
| Next Permutation | Medium | Permutation manipulation |
| Global and Local Inversions | Medium | Inversions instead of arithmetic mean |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Divide and Conquer](../../strategies/patterns/divide-and-conquer.md)
