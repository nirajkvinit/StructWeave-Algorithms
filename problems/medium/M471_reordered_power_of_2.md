---
id: M471
old_id: A336
slug: reordered-power-of-2
title: Reordered Power of 2
difficulty: medium
category: medium
topics: ["math"]
patterns: []
estimated_time_minutes: 30
---
# Reordered Power of 2

## Problem

Imagine you have a positive integer and you're wondering: could I rearrange its digits to form a power of 2? For example, the number 46 can be rearranged to make 64, which equals 2⁶. Similarly, 821 can become 128 (which is 2⁷).

Given an integer `n`, determine whether you can rearrange its digits to form a power of 2. The rearranged number cannot start with zero.

Return `true` if such a rearrangement is possible, otherwise return `false`.

**Powers of 2 refresher**: 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, and so on.

## Why This Matters

This problem appears in cryptography systems where power-of-2 checks validate encryption key sizes (128-bit, 256-bit, 2048-bit keys). It's also relevant in memory allocation algorithms where blocks must be powers of 2 for efficient address computation. The elegant solution teaches you to recognize when brute force (trying all permutations) can be replaced with a clever counting approach, a pattern that applies to password validation, anagram detection, and data deduplication systems.

## Examples

**Example 1:**
- Input: `n = 1`
- Output: `true`

**Example 2:**
- Input: `n = 10`
- Output: `false`

## Constraints

- 1 <= n <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Instead of generating all permutations of n's digits (factorial time), generate all powers of 2 within the valid range and check if they have the same digit count/frequency as n. Since n ≤ 10^9, there are only about 30 powers of 2 to check (2^0 to 2^29).
</details>

<details>
<summary>🎯 Main Approach</summary>
Count the frequency of each digit in n using a counter or array. Then iterate through all powers of 2 from 1 to 10^9 (there are only ~30 of them). For each power of 2, count its digit frequencies and compare with n's frequencies. If they match exactly, return true. If no match is found after checking all powers, return false.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a Counter or frequency array (size 10) to represent digit counts. This allows O(1) comparison instead of sorting. Also, you can pre-compute all powers of 2 up to 10^9, or generate them on the fly. Early termination: if the number of digits differs, skip the comparison.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Permutations | O(d! * d * log(max)) | O(d!) | d = digits, impractical |
| Count & Compare | O(log n) | O(1) | Only ~30 powers of 2 to check |

## Common Mistakes

1. **Generating permutations (too slow)**
   ```python
   # Wrong: Generate all permutations and check each
   from itertools import permutations
   def reorderedPowerOf2(n):
       for perm in permutations(str(n)):
           num = int(''.join(perm))
           if is_power_of_2(num):
               return True
       return False

   # Correct: Check digit frequency against powers of 2
   def reorderedPowerOf2(n):
       count_n = Counter(str(n))
       for i in range(30):
           if Counter(str(1 << i)) == count_n:
               return True
       return False
   ```

2. **Not handling leading zeros**
   ```python
   # Wrong: Allowing leading zeros in result
   if num[0] == '0' and len(num) > 1:
       continue  # This check is unnecessary here

   # Correct: Powers of 2 never have leading zeros
   # No special handling needed since we're checking against 2^i
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Power of Two | Easy | Check if number is already power of 2 |
| Power of Three | Easy | Check divisibility pattern |
| Permutation in String | Medium | Check if permutation exists in string |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Counting & Hashing](../../strategies/patterns/hash-table.md)
