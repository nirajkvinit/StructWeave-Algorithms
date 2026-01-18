---
id: M236
old_id: A023
slug: contiguous-array
title: Contiguous Array
difficulty: medium
category: medium
topics: ["array", "hash-table", "prefix-sum"]
patterns: ["prefix-sum", "hash-map"]
estimated_time_minutes: 30
frequency: high
related_problems:
  - E525_contiguous_array
  - M560_subarray_sum_equals_k
  - M523_continuous_subarray_sum
prerequisites:
  - E001_two_sum
  - E053_maximum_subarray
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Contiguous Array

## Problem

Given a binary array containing only 0s and 1s, find the maximum length of a contiguous subarray with an equal number of 0s and 1s.

For example, in `[0,1,0]`, both `[0,1]` and `[1,0]` are valid balanced subarrays of length 2. The entire array `[0,1]` is balanced (one 0, one 1) and represents the longest such subarray with length 2.

The naive approach of checking all possible subarrays runs in O(n²) time: for each starting position, expand and count 0s and 1s until you find balance. This becomes too slow for arrays with up to 100,000 elements.

The elegant solution uses a clever transformation: treat every 0 as -1 and every 1 as +1. Now the problem becomes: find the longest subarray with sum equal to 0. For example, `[0,1,0,1]` transforms to `[-1,+1,-1,+1]`. A balanced subarray (equal 0s and 1s) will have sum 0 because the -1s and +1s cancel out.

Using prefix sums with this transformation, you can detect balanced subarrays in O(n) time. The key insight: if the cumulative sum at two different positions is the same, the subarray between those positions has sum 0 (meaning it's balanced). Store each prefix sum's first occurrence in a hash map, and when you see the same sum again, calculate the distance to get the subarray length.

Critical detail: initialize your hash map with `{0: -1}` to handle subarrays that start from index 0. This allows detecting cases where the prefix sum itself is 0, meaning everything from the beginning to the current position is balanced.

## Why This Matters

This problem demonstrates a powerful pattern called "balance transformation" where you convert a counting problem into a sum problem, then use prefix sums with hash maps for O(n) solution. The same technique appears in "Maximum Size Subarray Sum Equals K," "Subarray Sum Divisible by K," and problems involving balanced parentheses. In real applications, this pattern is used in time-series analysis (finding periods where metrics are balanced), network traffic analysis (equal incoming/outgoing packets), and financial systems (balanced debits/credits). The transformation insight is particularly valuable: many counting problems can be reframed as sum problems, which often have more efficient solutions. Understanding when and how to apply such transformations is a hallmark of advanced problem-solving.

## Examples

**Example 1:**
- Input: `nums = [0,1]`
- Output: `2`
- Explanation: The entire array [0, 1] has equal counts of 0 and 1.

**Example 2:**
- Input: `nums = [0,1,0]`
- Output: `2`
- Explanation: Either [0, 1] or [1, 0] represents the longest balanced subarray.

## Constraints

- 1 <= nums.length <= 10⁵
- nums[i] is either 0 or 1.

## Approach Hints

<details>
<summary>Hint 1: Transform to Balance Problem</summary>

Convert 0s to -1s. Now the problem becomes: Find the longest subarray with sum = 0!

Example:
- Original: `[0, 1, 0, 1, 1, 0]`
- Transformed: `[-1, 1, -1, 1, 1, -1]`
- Prefix sums: `[-1, 0, -1, 0, 1, 0]`

When prefix sum repeats, the subarray between those positions has sum 0 (equal 0s and 1s).

For instance, prefix[1] = 0 and prefix[3] = 0, so subarray from index 2 to 3 has sum 0.

</details>

<details>
<summary>Hint 2: Hash Map to Track First Occurrence</summary>

Use a hash map to store: `{prefix_sum: first_index_where_this_sum_occurred}`

Algorithm:
1. Initialize map with `{0: -1}` (sum 0 occurs before array starts)
2. Track running sum (treat 0 as -1, 1 as +1)
3. For each index:
   - If sum seen before: update max_length = current_index - stored_index
   - Else: store this sum with current index

Why store **first** occurrence? To maximize the subarray length!

</details>

<details>
<summary>Hint 3: Understanding the Hash Map Trick</summary>

Key insight: If `prefix[j] == prefix[i]`, then `sum(nums[i+1...j]) = 0`

Example walkthrough for `nums = [0,1,0,1]`:
```
Index:  -1   0   1   2   3
Nums:        0   1   0   1
As -1:      -1   1  -1   1
Prefix: 0   -1   0  -1   0
Map: {0:-1, -1:0}

i=0: sum=-1, not in map, store {-1: 0}
i=1: sum=0, in map at -1, length = 1-(-1) = 2
i=2: sum=-1, in map at 0, length = 2-0 = 2
i=3: sum=0, in map at -1, length = 3-(-1) = 4 ✓
```

The entire array from index 0 to 3 is balanced!

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force | O(n²) | O(1) | Check all subarrays |
| Prefix Sum Array | O(n²) | O(n) | Still check all pairs |
| Hash Map + Prefix Sum | O(n) | O(n) | Optimal solution |
| Optimized (in-place) | O(n) | O(n) | Hash map size proportional to unique sums |

## Common Mistakes

### Mistake 1: Not Initializing Map with {0: -1}
```python
# WRONG: Missing initial state
def findMaxLength(nums):
    sum_map = {}  # Missing {0: -1}!
    running_sum = 0
    max_len = 0

    for i, num in enumerate(nums):
        running_sum += 1 if num == 1 else -1

        if running_sum in sum_map:
            max_len = max(max_len, i - sum_map[running_sum])
        else:
            sum_map[running_sum] = i

    return max_len
    # Fails for [0,1]: doesn't detect that entire array is balanced

# CORRECT: Initialize with {0: -1}
def findMaxLength(nums):
    sum_map = {0: -1}  # Critical initialization!
    running_sum = 0
    max_len = 0

    for i, num in enumerate(nums):
        running_sum += 1 if num == 1 else -1

        if running_sum in sum_map:
            max_len = max(max_len, i - sum_map[running_sum])
        else:
            sum_map[running_sum] = i

    return max_len
```

### Mistake 2: Overwriting Previous Sum Indices
```python
# WRONG: Updates sum index every time
def findMaxLength(nums):
    sum_map = {0: -1}
    running_sum = 0
    max_len = 0

    for i, num in enumerate(nums):
        running_sum += 1 if num == 1 else -1

        if running_sum in sum_map:
            max_len = max(max_len, i - sum_map[running_sum])

        sum_map[running_sum] = i  # Always updates!

    return max_len
    # Reduces subarray length by moving the start point forward

# CORRECT: Only store first occurrence
def findMaxLength(nums):
    sum_map = {0: -1}
    running_sum = 0
    max_len = 0

    for i, num in enumerate(nums):
        running_sum += 1 if num == 1 else -1

        if running_sum in sum_map:
            max_len = max(max_len, i - sum_map[running_sum])
        else:  # Only store if not seen before!
            sum_map[running_sum] = i

    return max_len
```

### Mistake 3: Counting Instead of Transforming
```python
# WRONG: Trying to track counts separately (inefficient)
def findMaxLength(nums):
    max_len = 0
    for i in range(len(nums)):
        zeros = 0
        ones = 0
        for j in range(i, len(nums)):
            if nums[j] == 0:
                zeros += 1
            else:
                ones += 1
            if zeros == ones:
                max_len = max(max_len, j - i + 1)
    return max_len
    # O(n²) - works but too slow!

# CORRECT: Transform and use prefix sum
def findMaxLength(nums):
    sum_map = {0: -1}
    running_sum = 0
    max_len = 0

    for i, num in enumerate(nums):
        running_sum += 1 if num == 1 else -1

        if running_sum in sum_map:
            max_len = max(max_len, i - sum_map[running_sum])
        else:
            sum_map[running_sum] = i

    return max_len
    # O(n) - optimal!
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| Count Balanced Subarrays | Count all subarrays instead of finding longest | Medium |
| K Equal Parts | Find subarray with k different values equally distributed | Hard |
| Maximum Length with Sum K | Find longest subarray with specific sum | Medium |
| Balanced Parentheses | Similar concept with '(' and ')' | Medium |
| Equal 0s, 1s, and 2s | Three values instead of two | Hard |

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Practice Checklist

- [ ] Solve using hash map with prefix sum (Day 1)
- [ ] Understand the 0→-1 transformation (Day 1)
- [ ] Trace through example with {0: -1} initialization (Day 1)
- [ ] Compare with Subarray Sum Equals K (Day 3)
- [ ] Solve related: Continuous Subarray Sum (Day 7)
- [ ] Solve without looking at notes (Day 14)
- [ ] Teach the transformation technique (Day 30)

**Strategy**: See [Array Pattern](../strategies/patterns/sliding-window.md)
