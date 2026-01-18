---
id: M514
old_id: A394
slug: three-equal-parts
title: Three Equal Parts
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Three Equal Parts

## Problem

Imagine you're designing a cryptographic key splitter that needs to divide a binary key into three pieces such that each piece represents the same numerical value when interpreted as a binary number. This ensures redundancy while maintaining security—all three pieces must be present and valid to reconstruct the original key.

Given a binary array `arr` containing only zeros and ones, your task is to partition it into three non-empty, contiguous segments where each segment represents an identical binary number when interpreted from left to right.

If such a partition exists, return indices `[i, j]` where:
- The first segment spans from `arr[0]` through `arr[i]` (inclusive)
- The second segment spans from `arr[i + 1]` through `arr[j - 1]` (inclusive)
- The third segment spans from `arr[j]` through `arr[arr.length - 1]` (inclusive)
- When each segment is interpreted as a binary number, all three have the same decimal value
- The constraint `i + 1 < j` ensures all segments are non-empty

Return `[-1, -1]` if no valid partition exists.

Important notes about binary interpretation:
- `[1,0,1]` represents binary 101, which equals 5 in decimal
- Leading zeros are allowed, so `[0,1,1]` and `[1,1]` both represent binary 11 (decimal 3)
- `[0,0]` and `[0]` both represent binary 0 (decimal 0)

## Why This Matters

This problem combines binary number theory with array manipulation, mirroring challenges in data partitioning, load balancing, and distributed systems. In practice, similar techniques are used in blockchain systems to verify data integrity by comparing hash segments, in network packet splitting where payloads must be divided evenly, and in parallel processing where workloads need equal distribution. The concept of leading zeros teaches you to think about numerical equivalence versus string equality—a critical distinction in data validation, parsing, and encoding systems. Understanding how to efficiently partition data while maintaining semantic equivalence is fundamental to database sharding, file system chunking, and data replication strategies.

## Examples

**Example 1:**
- Input: `arr = [1,0,1,0,1]`
- Output: `[0,3]`

**Example 2:**
- Input: `arr = [1,1,0,1,1]`
- Output: `[-1,-1]`

**Example 3:**
- Input: `arr = [1,1,0,0,1]`
- Output: `[0,2]`

## Constraints

- 3 <= arr.length <= 3 * 10⁴
- arr[i] is 0 or 1

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
For three equal binary numbers, they must have the same number of 1s (since leading zeros don't matter). Count total 1s - if not divisible by 3, return [-1, -1]. Each part needs exactly ones_count/3 ones. Find where each third starts based on 1s positions.
</details>

<details>
<summary>🎯 Main Approach</summary>
Count total 1s. If zero, return [0, 2]. If not divisible by 3, impossible. Find the position of the (ones/3)th, (2*ones/3)th, and last 1. These mark starts of each part. Match patterns from these positions, accounting for trailing zeros which all parts must share equally.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The trailing zeros after the last 1 must appear in all three parts. Use this to determine split points. Work backwards from the last 1 to find where each part should end, ensuring all have the same bit pattern and sufficient trailing zeros.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(n) | Try all split points, compare binary values |
| Optimal | O(n) | O(1) | Count 1s, find split points, verify pattern match |

## Common Mistakes

1. **Not handling trailing zeros correctly**
   ```python
   # Wrong: Ignores trailing zeros distribution
   def threeEqualParts(self, arr):
       ones = sum(arr)
       if ones % 3 != 0:
           return [-1, -1]
       if ones == 0:
           return [0, 2]

       # Find first 1 of each third
       target = ones // 3
       # ... find positions ...
       return [i, j]  # Missing: check trailing zeros

   # Correct: Account for trailing zeros
   def threeEqualParts(self, arr):
       ones = sum(arr)
       if ones % 3 != 0:
           return [-1, -1]
       if ones == 0:
           return [0, 2]

       # Count trailing zeros after last 1
       trailing = 0
       for i in range(len(arr) - 1, -1, -1):
           if arr[i] == 1:
               break
           trailing += 1

       # Each part must have these trailing zeros
       # Find splits ensuring pattern match + trailing zeros
       # ... validation logic ...
   ```

2. **Comparing binary values instead of bit patterns**
   ```python
   # Wrong: Converting to integers may overflow or be slow
   def threeEqualParts(self, arr):
       for i in range(len(arr)):
           for j in range(i + 2, len(arr)):
               val1 = int(''.join(map(str, arr[:i+1])), 2)
               val2 = int(''.join(map(str, arr[i+1:j])), 2)
               val3 = int(''.join(map(str, arr[j:])), 2)
               if val1 == val2 == val3:
                   return [i, j]
       return [-1, -1]

   # Correct: Compare bit patterns directly
   def threeEqualParts(self, arr):
       # Find positions of each third's first 1
       # Compare patterns bit by bit
       # Match arr[start1+k] == arr[start2+k] == arr[start3+k]
       # for all k in pattern length
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Split Array into Consecutive Subsequences | Medium | Consecutive integers instead of binary |
| Partition Array for Maximum Sum | Medium | Maximize sum instead of equal parts |
| Partition Equal Subset Sum | Medium | Two equal parts by value |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Arrays](../../strategies/data-structures/arrays.md)
