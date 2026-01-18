---
id: M492
old_id: A365
slug: bitwise-ors-of-subarrays
title: Bitwise ORs of Subarrays
difficulty: medium
category: medium
topics: ["array", "bit-manipulation"]
patterns: []
estimated_time_minutes: 30
---
# Bitwise ORs of Subarrays

## Problem

Given an array of integers, you need to find how many distinct values you can create by applying the bitwise OR operation across all possible contiguous subarrays.

For example, if you have the array `[1, 2, 4]`, you need to consider:
- Single elements: `[1]`, `[2]`, `[4]` with OR values 1, 2, 4
- Two elements: `[1,2]`, `[2,4]` with OR values 3, 6
- Three elements: `[1,2,4]` with OR value 7

The bitwise OR operation combines numbers by setting a bit to 1 if it's 1 in at least one of the numbers. So `1 | 2 = 3` (binary: `01 | 10 = 11`), and `1 | 2 | 4 = 7` (binary: `001 | 010 | 100 = 111`).

Your task is to count how many unique OR results exist across all these subarrays. For the array `[1,2,4]`, there are 6 unique values: `{1, 2, 3, 4, 6, 7}`.

Remember that a contiguous subsequence consists of consecutive elements from the array without gaps.

## Why This Matters

Network security systems use bitwise operations extensively for packet filtering and access control. When you set up firewall rules, each rule might set certain permission bits, and the final access decision is often determined by ORing multiple rule results together. Understanding how different combinations of bit patterns interact is crucial for security engineers analyzing rule coverage.

In image processing, bitwise OR operations combine multiple image masks to create composite filters. For example, when applying multiple effects to a photo, each effect might set different bits in a pixel's color channel, and the OR operation merges these effects. Knowing how many unique combinations are possible helps optimize rendering pipelines and predict memory requirements for filter caches.

## Examples

**Example 1:**
- Input: `arr = [0]`
- Output: `1`
- Explanation: There is only one possible result: 0.

**Example 2:**
- Input: `arr = [1,1,2]`
- Output: `3`
- Explanation: The possible subarrays are [1], [1], [2], [1, 1], [1, 2], [1, 1, 2].
These yield the results 1, 1, 2, 1, 3, 3.
There are 3 unique values, so the answer is 3.

**Example 3:**
- Input: `arr = [1,2,4]`
- Output: `6`
- Explanation: The possible results are 1, 2, 3, 4, 6, and 7.

## Constraints

- 1 <= arr.length <= 5 * 10⁴
- 0 <= arr[i] <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
While there are O(n²) subarrays, the number of unique OR results is surprisingly small - at most 32 * n. This is because OR operations can only set bits (never unset), and once all bits are set for a position, further ORs don't change the value. The key insight is that for each new element, you only need to OR it with previous results ending at the last position.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use dynamic programming with a set. For each position i, maintain a set of all possible OR values for subarrays ending at i-1. To compute results ending at i, OR the current element with each value in the previous set, plus the current element alone. The union of all these sets across all positions gives the answer.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The size of the set at each position is bounded by 32 (the number of bits in an integer), because OR can only increase or stay the same, and there are only 32 bits that can change from 0 to 1. This keeps the set small and operations efficient.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(n²) | Compute OR for all subarrays |
| Optimal | O(n * 32) = O(n) | O(n * 32) = O(n) | Use DP with bit manipulation insight |

Where n = array length, and 32 represents the max unique OR values per position

## Common Mistakes

1. **Computing all O(n²) subarrays explicitly**
   ```python
   # Wrong: Enumerate all subarrays inefficiently
   result = set()
   for i in range(len(arr)):
       for j in range(i, len(arr)):
           or_val = 0
           for k in range(i, j + 1):
               or_val |= arr[k]
           result.add(or_val)

   # Correct: Use DP to avoid redundant computation
   result = set()
   prev = set()
   for num in arr:
       curr = {num}
       for val in prev:
           curr.add(val | num)
       result.update(curr)
       prev = curr
   ```

2. **Not understanding the 32-bit constraint**
   ```python
   # Wrong: Thinking set can grow unbounded
   # This leads to thinking complexity is O(n²)

   # Correct: Recognize set size is bounded by 32
   # At most 32 different OR values per position
   # because integers have 32 bits, OR only sets bits
   # Once a bit is set, it stays set
   ```

3. **Incorrect OR accumulation**
   ```python
   # Wrong: Not preserving previous OR results
   result = set()
   for num in arr:
       result.add(num)  # Only single elements

   # Correct: OR current with all previous endings
   result = set()
   prev = set()
   for num in arr:
       curr = {num}
       for val in prev:
           curr.add(val | num)
       result.update(curr)
       prev = curr
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Maximum XOR of Two Numbers | Medium | XOR instead of OR, use Trie |
| Bitwise AND of Numbers Range | Medium | AND operation decreases values |
| Longest Subarray With Maximum Bitwise AND | Medium | Find longest subarray, not count unique |
| Count Subarray With Fixed Bounds | Hard | Different constraint, sliding window |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Bit Manipulation](../../strategies/patterns/bit-manipulation.md)
