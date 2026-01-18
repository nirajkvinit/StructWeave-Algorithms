---
id: M532
old_id: A421
slug: array-of-doubled-pairs
title: Array of Doubled Pairs
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Array of Doubled Pairs

## Problem

Imagine you're organizing a collection of numbers into pairs where one number must be exactly double the other. For example, you could pair 3 with 6, or -2 with -4. The question is: can you pair up all the numbers in this special way?

Given an even-length integer array `arr`, determine if you can rearrange it so that every element at an odd index is exactly double the element at the preceding even index.

Formally, check if there exists an arrangement where `arr[2 * i + 1] = 2 * arr[2 * i]` for all `0 <= i < len(arr) / 2`.

For instance:
- `[4, -2, 2, -4]` can be paired as (-2, -4) and (2, 4), so return `true`
- `[3, 1, 3, 6]` cannot form valid pairs (we'd need two copies of 6 to pair with both 3s), so return `false`

Return `true` if such an arrangement is possible, `false` otherwise.

## Why This Matters

Pairing and matching problems appear frequently in resource allocation scenarios. Consider inventory management where you need to match products with their packaging (small boxes need double-sized shipping containers), or audio processing where you pair sound samples at different frequencies. This problem teaches greedy algorithms and the importance of processing order - by handling smaller values first, you ensure you don't "use up" values needed for later pairs. The technique of sorting by absolute value to handle negatives elegantly is also a useful pattern for mathematical problems.

## Examples

**Example 1:**
- Input: `arr = [3,1,3,6]`
- Output: `false`

**Example 2:**
- Input: `arr = [2,1,2,6]`
- Output: `false`

**Example 3:**
- Input: `arr = [4,-2,2,-4]`
- Output: `true`
- Explanation: Valid pairs exist: (-2, -4) and (2, 4), which can be arranged as [-2,-4,2,4] or [2,4,-2,-4].

## Constraints

- 2 <= arr.length <= 3 * 10⁴
- arr.length is even.
- -10⁵ <= arr[i] <= 10⁵

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Use a greedy approach: process numbers by absolute value from smallest to largest. For each number x, try to pair it with 2x. If we can't find enough 2x values to pair with all x values, return false. Use a counter to track available numbers.
</details>

<details>
<summary>Main Approach</summary>
Sort the array by absolute value. Use a frequency counter (dictionary or Counter). For each number x, if its count is 0, skip it (already used). Otherwise, check if we have enough 2x values available. If count[2x] < count[x], return false. Decrease both counts accordingly. Handle negative numbers correctly by sorting by absolute value.
</details>

<details>
<summary>Optimization Tip</summary>
The key insight for negatives: if x is negative, its double 2x is also negative and has larger absolute value. By processing from smallest absolute value, we ensure we try to pair smaller values before larger ones, which is the greedy strategy. For zero, it must pair with itself, so count must be even.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(n) | Try all possible pairings |
| Optimal (Greedy + Sort) | O(n log n) | O(n) | Sort by absolute value, use counter |

## Common Mistakes

1. **Not handling negative numbers correctly**
   ```python
   # Wrong: Sorting without considering absolute values
   arr.sort()  # [-4, -2, 2, 4] - wrong order
   for x in arr:
       if x * 2 not in counter:  # Looks for -8, -4, 4, 8
           return False

   # Correct: Sort by absolute value
   arr.sort(key=abs)  # [-2, 2, -4, 4] - correct order
   for x in arr:
       if counter[x] == 0:
           continue
       if counter[2 * x] < counter[x]:
           return False
   ```

2. **Not tracking counts properly**
   ```python
   # Wrong: Only checking existence, not count
   if 2 * x in counter:
       counter[2 * x] -= 1
   # What if we need multiple pairs?

   # Correct: Check if enough pairs exist
   if counter[2 * x] < counter[x]:
       return False
   counter[2 * x] -= counter[x]
   ```

3. **Special case for zero**
   ```python
   # Wrong: Not handling zero specially
   # Zero must pair with itself: 2 * 0 = 0

   # Correct: Zero needs even count
   if 0 in counter and counter[0] % 2 != 0:
       return False
   # Or handle in main loop since 2*0 = 0
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Array of Tripled Pairs | Medium | Pair with 3x instead of 2x |
| Divide Array in Sets of K Consecutive | Medium | Different pairing constraint |
| K-th Smallest Pair Distance | Hard | Different optimization on pairs |
| Valid Triangle Number | Medium | Three-way pairing with triangle inequality |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
