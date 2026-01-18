---
id: M313
old_id: A126
slug: split-array-into-consecutive-subsequences
title: Split Array into Consecutive Subsequences
difficulty: medium
category: medium
topics: ["array", "greedy", "hash-table"]
patterns: ["greedy-choice", "frequency-map"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E846", "M659", "M128"]
prerequisites: ["hash-maps", "greedy-algorithms"]
---
# Split Array into Consecutive Subsequences

## Problem

Given a sorted array `nums` in non-decreasing order, determine whether you can partition all elements into one or more subsequences where each subsequence forms a consecutive sequence of at least 3 elements.

A valid consecutive subsequence means each element is exactly 1 greater than the previous. For example, `[1,2,3]` or `[4,5,6,7]` are valid, but `[1,3,5]` or `[2,3]` (too short) are not. The elements must maintain their relative order from the original array, though you can skip elements when forming subsequences.

The key challenge is deciding whether each number should extend an existing subsequence or start a new one. Making the wrong choice early can leave you with numbers that cannot form valid sequences. For instance, if you have `[1,2,3,3,4,5]`, starting a new sequence `[3,4,5]` when you encounter the first 3 is fine, but you must ensure the second 3 can also form or extend a valid sequence.

This is a greedy problem where local decisions must align with global feasibility. Return `true` if such a complete partitioning is possible, `false` otherwise.

## Why This Matters

This problem demonstrates greedy algorithms applied to sequence partitioning, a pattern common in scheduling and resource allocation. Video streaming systems use similar logic to partition video chunks into consecutive sequences for smooth playback. Database systems employ comparable strategies when partitioning time-series data into consecutive intervals for efficient range queries. The greedy insight that extending existing sequences is superior to creating new ones appears in network packet reassembly, where packets arriving out of order must be grouped into consecutive sequences. Understanding when greedy choices lead to optimal solutions builds intuition for proving algorithm correctness using exchange arguments, a crucial skill for designing efficient algorithms in constraint-satisfaction problems.

## Examples

**Example 1:**
- Input: `nums = [1,2,3,3,4,5]`
- Output: `true`
- Explanation: nums can be split into the following subsequences:
[**1**,**2**,**3**,3,4,5] --> 1, 2, 3
[1,2,3,**3**,**4**,**5**] --> 3, 4, 5

**Example 2:**
- Input: `nums = [1,2,3,3,4,4,5,5]`
- Output: `true`
- Explanation: nums can be split into the following subsequences:
[**1**,**2**,**3**,3,**4**,4,**5**,5] --> 1, 2, 3, 4, 5
[1,2,3,**3**,4,**4**,5,**5**] --> 3, 4, 5

**Example 3:**
- Input: `nums = [1,2,3,4,4,5]`
- Output: `false`
- Explanation: It is impossible to split nums into consecutive increasing subsequences of length 3 or more.

## Constraints

- 1 <= nums.length <= 10⁴
- -1000 <= nums[i] <= 1000
- nums is sorted in **non-decreasing** order.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Greedy Strategy - Extend Existing Sequences</summary>

The greedy approach prioritizes extending existing subsequences over starting new ones. When you encounter a number `x`:
1. First, try to append it to an existing subsequence ending at `x-1`
2. Only if that's not possible, try to start a new subsequence (which requires `x+1` and `x+2` to be available)
3. If neither option works, return false

This greedy choice is optimal because extending sequences uses fewer numbers than creating new ones.

</details>

<details>
<summary>Hint 2: Two Hash Maps for Tracking</summary>

Use two hash maps:
- `freq`: counts available occurrences of each number
- `need`: tracks how many subsequences need a specific number next

Algorithm:
```
For each number x in nums:
  if freq[x] == 0: skip (already used)
  if need[x] > 0:
    # Extend existing sequence
    need[x] -= 1
    need[x+1] += 1
    freq[x] -= 1
  elif freq[x] > 0 and freq[x+1] > 0 and freq[x+2] > 0:
    # Start new sequence
    freq[x] -= 1
    freq[x+1] -= 1
    freq[x+2] -= 1
    need[x+3] += 1
  else:
    return false
return true
```

</details>

<details>
<summary>Hint 3: Understanding the Greedy Choice</summary>

Why is extending better than starting new? Consider nums = [1,2,3,3,4,5]:
- If we start [3,4,5] when seeing the first 3, we're left with [1,2,3] which works
- But what if we have [1,2,3,4,4]? We can't form two length-3 sequences
- By extending [1,2,3] to [1,2,3,4], we leave the second 4 free to potentially start [4,5,6]

The greedy choice maximizes flexibility for future numbers.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy with Hash Maps | O(n) | O(n) | Single pass, two hash maps for tracking |
| Brute Force Backtracking | O(2^n) | O(n) | Try all possible partitions (TLE) |
| Priority Queue | O(n log n) | O(n) | Track sequences by end value |

## Common Mistakes

**Mistake 1: Not Prioritizing Extension Over Creation**
```python
# WRONG: Starting new sequences without checking extension
def isPossible(nums):
    freq = Counter(nums)

    for x in nums:
        if freq[x] == 0:
            continue
        # Wrong: always trying to start new sequence first
        if freq[x] > 0 and freq[x+1] > 0 and freq[x+2] > 0:
            freq[x] -= 1
            freq[x+1] -= 1
            freq[x+2] -= 1
        # This leads to suboptimal choices

# CORRECT: Always extend first, create only if necessary
def isPossible(nums):
    freq = Counter(nums)
    need = defaultdict(int)

    for x in nums:
        if freq[x] == 0:
            continue
        if need[x] > 0:  # Extend first (greedy choice)
            need[x] -= 1
            need[x+1] += 1
            freq[x] -= 1
        elif freq[x+1] > 0 and freq[x+2] > 0:  # Create only if can't extend
            freq[x] -= 1
            freq[x+1] -= 1
            freq[x+2] -= 1
            need[x+3] += 1
        else:
            return False
    return True
```

**Mistake 2: Modifying Frequency Before Checking**
```python
# WRONG: Checking availability after modifying frequency
if freq[x] > 0:
    freq[x] -= 1
    if freq[x+1] > 0 and freq[x+2] > 0:  # May give wrong result
        freq[x+1] -= 1
        freq[x+2] -= 1

# CORRECT: Check availability before modifying
if freq[x] > 0 and freq[x+1] > 0 and freq[x+2] > 0:
    freq[x] -= 1
    freq[x+1] -= 1
    freq[x+2] -= 1
```

**Mistake 3: Not Handling Duplicates Correctly**
```python
# WRONG: Processing each element without checking if already used
def isPossible(nums):
    freq = Counter(nums)
    for x in set(nums):  # Wrong: loses duplicate information
        # ... logic

# CORRECT: Process in order, check frequency
def isPossible(nums):
    freq = Counter(nums)
    need = defaultdict(int)

    for x in nums:  # Process in given order
        if freq[x] == 0:  # Skip if already consumed
            continue
        # ... rest of logic
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Minimum Subsequence Length K | Allow subsequences of any length >= k | Easy |
| Count Valid Splits | Count the number of valid partitions | Hard |
| Maximum Subsequences | Maximize the number of valid subsequences | Medium |
| Non-Consecutive Subsequences | Allow gaps in consecutive values | Medium |
| Weighted Subsequences | Minimize total cost of partitioning | Hard |

## Practice Checklist

- [ ] First attempt (30 min)
- [ ] Understand greedy: extend before create
- [ ] Implement two hash map approach
- [ ] Trace through: [1,2,3,3,4,5]
- [ ] Test edge cases: all same number, impossible split
- [ ] Verify why greedy works (optimal substructure)
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Attempt variation: count valid splits

**Strategy**: See [Greedy Pattern](../strategies/patterns/greedy-algorithms.md)
