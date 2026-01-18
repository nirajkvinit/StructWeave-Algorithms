---
id: M557
old_id: A449
slug: triples-with-bitwise-and-equal-to-zero
title: Triples with Bitwise AND Equal To Zero
difficulty: medium
category: medium
topics: ["array", "bit-manipulation"]
patterns: []
estimated_time_minutes: 30
---
# Triples with Bitwise AND Equal To Zero

## Problem

Given an integer array `nums`, your task is to count how many combinations of three indices produce a bitwise AND of zero when you combine the values at those positions.

More specifically, count all ordered triples `(i, j, k)` where:
- Each index i, j, k is valid (between 0 and array length - 1)
- Indices can repeat - you could use the same index multiple times like (0, 0, 0) or (1, 1, 2)
- The bitwise AND of the three values equals zero: `nums[i] & nums[j] & nums[k] = 0`

The bitwise AND operation compares corresponding bits: a bit in the result is 1 only if that bit is 1 in all three numbers. For the result to be zero, every bit position must have at least one 0 across the three numbers.

Example visualization:
```
nums[0] = 2 → binary: 010
nums[1] = 1 → binary: 001
nums[2] = 3 → binary: 011

2 & 1 & 3 = 010 & 001 & 011 = 000 (zero!) ✓

Position 0: 0 or 1 or 1 = has a 0 → result bit = 0
Position 1: 1 or 0 or 1 = has a 0 → result bit = 0
Position 2: 0 or 0 or 0 = all 0s → result bit = 0
```

## Why This Matters

Bitwise AND operations for finding zero-conflict combinations appear throughout systems programming and optimization problems. Network security uses bitwise operations to check if access permissions conflict - finding combinations where permissions don't overlap (AND = 0) indicates independent access rights. Hardware circuit design analyzes logic gates where multiple signals must combine to produce zero output for certain states. Image processing applies bitmask operations to find pixel combinations with no common color channels. Compiler optimization identifies non-conflicting memory access patterns where bitwise resource flags AND to zero, enabling parallel execution. Database query optimization uses bitmap indices where AND operations help identify non-overlapping data partitions. Error detection systems check if multiple error flags combine to indicate specific failure modes. The computational challenge lies in efficiently counting these combinations across large datasets without exhaustive triple enumeration.

## Examples

**Example 1:**
- Input: `nums = [2,1,3]`
- Output: `12`
- Explanation: There are 12 index triples where the bitwise AND equals zero. For instance: (0,0,1) gives 2&2&1=0, (0,1,0) gives 2&1&2=0, (0,1,1) gives 2&1&1=0, (0,1,2) gives 2&1&3=0, and so on for 8 more valid triples.

**Example 2:**
- Input: `nums = [0,0,0]`
- Output: `27`

## Constraints

- 1 <= nums.length <= 1000
- 0 <= nums[i] < 2¹⁶

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
The brute force O(n³) solution is too slow. However, you can optimize by pre-computing all possible pairwise AND results (nums[i] & nums[j]) in O(n²), then for each pair result, count how many values k satisfy pair_result & nums[k] == 0.
</details>

<details>
<summary>Main Approach</summary>
Use a hash map to store frequency counts of all pairwise AND results: map[nums[i] & nums[j]] = count. Then iterate through each unique AND result and each array element k. If result & nums[k] == 0, add the frequency count to the answer. This reduces one nested loop.
</details>

<details>
<summary>Optimization Tip</summary>
Since values are < 2^16 (65536 possible values), you can use an array instead of a hash map for faster access. Pre-compute the pairwise AND frequencies, then for each frequency entry and each array element, check if their AND is zero and accumulate counts.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n³) | O(1) | Three nested loops, too slow for n=1000 |
| Optimal (Hash Map) | O(n² + k*n) | O(k) | k ≤ 2^16 distinct AND values; pre-compute pairs |

## Common Mistakes

1. **Triple counting instead of using pair frequencies**
   ```python
   # Wrong: Brute force O(n³) - too slow
   count = 0
   for i in range(len(nums)):
       for j in range(len(nums)):
           for k in range(len(nums)):
               if nums[i] & nums[j] & nums[k] == 0:
                   count += 1

   # Correct: Pre-compute pairs O(n²), then check O(k*n)
   pair_count = {}
   for i in range(len(nums)):
       for j in range(len(nums)):
           pair_and = nums[i] & nums[j]
           pair_count[pair_and] = pair_count.get(pair_and, 0) + 1

   count = 0
   for pair_and, freq in pair_count.items():
       for num in nums:
           if pair_and & num == 0:
               count += freq
   ```

2. **Not considering duplicate indices**
   ```python
   # Wrong: Treating as combinations rather than permutations
   # The problem allows i, j, k to be the same or different

   # Correct: Count all ordered triples including repeats
   # Each index can appear multiple times: (0,0,0), (0,0,1), etc.
   ```

3. **Incorrect bitwise operation**
   ```python
   # Wrong: Using OR instead of AND
   if nums[i] | nums[j] | nums[k] == 0:

   # Correct: Bitwise AND
   if nums[i] & nums[j] & nums[k] == 0:
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Count Pairs with AND = 0 | Easy | Only two elements instead of three |
| Bitwise ORs of Subarrays | Medium | Count distinct OR results |
| Maximum AND Value | Medium | Find maximum AND of any k elements |
| XOR Queries | Medium | Range XOR queries with prefix XOR |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Bit Manipulation](../../strategies/patterns/bit-manipulation.md)
