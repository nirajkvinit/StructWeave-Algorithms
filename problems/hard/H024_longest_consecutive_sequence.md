---
id: H024
old_id: F128
slug: longest-consecutive-sequence
title: Longest Consecutive Sequence
difficulty: hard
category: hard
topics: ["array", "binary-search", "sliding-window"]
patterns: []
estimated_time_minutes: 45
strategy_ref: ../strategies/patterns/binary-search.md
---
# Longest Consecutive Sequence

## Problem

Find the length of the longest consecutive elements sequence in O(n) time.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `nums = [100,4,200,1,3,2]`
- Output: `4`
- Explanation: The longest consecutive elements sequence is `[1, 2, 3, 4]`. Therefore its length is 4.

**Example 2:**
- Input: `nums = [0,3,7,2,5,8,4,6,0,1]`
- Output: `9`

## Constraints

- 0 <= nums.length <= 10⁵
- -10⁹ <= nums[i] <= 10⁹

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

**Strategy**: See [Array Pattern](../strategies/patterns/binary-search.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Convert the array to a set for O(1) lookups. For each number that could start a sequence (no number-1 exists in the set), count how long the consecutive sequence extends. This avoids redundant work by only starting counts from sequence beginnings.
</details>

<details>
<summary>🎯 Main Approach</summary>
Create a hash set from the array. Iterate through the array, and for each number, check if it's the start of a sequence (i.e., num-1 is not in the set). If it is, count consecutive numbers (num+1, num+2, ...) until you find a gap. Track the maximum length found.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The key to O(n) time is the "sequence start" check. By only counting from numbers where num-1 doesn't exist, each number is visited at most twice (once in the outer loop, once during counting), achieving linear time despite nested loops.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (sort) | O(n log n) | O(1) | Sort then scan for consecutive runs |
| Optimal (Hash Set) | O(n) | O(n) | Each element visited at most twice |

## Common Mistakes

1. **Not checking for sequence start**
   ```python
   # Wrong: Counts every number, causing O(n²) complexity
   for num in nums:
       current = num
       length = 1
       while current + 1 in num_set:
           current += 1
           length += 1
       max_length = max(max_length, length)

   # Correct: Only start counting from sequence beginnings
   for num in nums:
       if num - 1 not in num_set:  # Start of sequence
           current = num
           length = 1
           while current + 1 in num_set:
               current += 1
               length += 1
           max_length = max(max_length, length)
   ```

2. **Using list instead of set**
   ```python
   # Wrong: O(n) lookup time makes it O(n²) or worse
   if current + 1 in nums:  # Linear search

   # Correct: O(1) lookup time
   num_set = set(nums)
   if current + 1 in num_set:
   ```

3. **Not handling duplicates**
   ```python
   # Wrong: Set automatically handles duplicates, but logic might not
   # The set conversion handles this correctly
   num_set = set(nums)  # Duplicates removed automatically
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Binary Tree Longest Consecutive Sequence | Medium | Find consecutive sequence in tree paths |
| Longest Consecutive Sequence II | Hard | Allows subsequences, not just consecutive values |
| Maximum Consecutive Floors Without Special Floors | Medium | Similar logic with constraints |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Set Patterns](../../strategies/data-structures/hash-tables.md)
