---
id: E035
old_id: F075
slug: sort-colors
title: Sort Colors
difficulty: easy
category: easy
topics: ["array", "two-pointers", "sorting"]
patterns: ["dutch-national-flag", "three-way-partitioning"]
estimated_time_minutes: 15
frequency: high
related_problems: ["M215", "M075", "E283"]
prerequisites: ["arrays", "two-pointers", "partitioning"]
strategy_ref: ../../strategies/patterns/two-pointers.md
---
# Sort Colors

## Problem

Given an array containing only the values 0, 1, and 2 (representing three different colors), sort the array in-place so all 0s come first, followed by all 1s, then all 2s. You must solve this without using the built-in sort function and with only constant extra space.

For example, the array [2, 0, 2, 1, 1, 0] should be rearranged to [0, 0, 1, 1, 2, 2]. The values represent colors (say, red=0, white=1, blue=2), hence the problem name, but you can simply think of it as sorting three distinct values.

The naive approach would be to count how many 0s, 1s, and 2s exist, then overwrite the array with the appropriate counts of each value. This works but requires two passes through the array. The challenge is to solve it in a single pass using a three-way partitioning technique.

The constraint is that you must modify the array in-place with O(1) extra space, which rules out approaches that create a new sorted array or use significant auxiliary data structures.

## Why This Matters

This problem teaches the Dutch National Flag algorithm, a classic partitioning technique invented by computer science pioneer Edsger Dijkstra. It's a fundamental building block for many sorting and partitioning algorithms, most notably appearing in QuickSort implementations.

Three-way partitioning is used in database query optimization (partitioning data into ranges), network packet routing (classifying packets by priority), data analysis (grouping categorical data), and memory management systems (segregating objects by type or size).

This is a frequent interview question because it tests your ability to manage multiple pointers simultaneously and think carefully about invariants (what conditions remain true as your algorithm progresses). The technique extends to k-way partitioning for more complex scenarios.

## Examples

**Example 1:**
- Input: `nums = [2,0,2,1,1,0]`
- Output: `[0,0,1,1,2,2]`

**Example 2:**
- Input: `nums = [2,0,1]`
- Output: `[0,1,2]`

## Constraints

- n == nums.length
- 1 <= n <= 300
- nums[i] is either 0, 1, or 2.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Counting vs Partitioning</summary>

Two main approaches exist:
1. Count how many 0s, 1s, and 2s, then overwrite the array
2. Partition the array in one pass using pointers

The counting approach is simple but requires two passes. Can you solve it in a single pass with constant space?

</details>

<details>
<summary>🎯 Hint 2: Dutch National Flag Algorithm</summary>

Use three pointers to partition the array into three regions:
- [0...low-1]: all 0s
- [low...mid-1]: all 1s
- [mid...high]: unprocessed
- [high+1...n-1]: all 2s

Process elements at `mid` and decide where to place them. The key insight: when you see a 0, swap it to the left; when you see a 2, swap it to the right; when you see a 1, just move forward.

</details>

<details>
<summary>📝 Hint 3: Three-Pointer Algorithm</summary>

```
Algorithm (Dutch National Flag):
1. Initialize three pointers:
   - low = 0 (boundary for 0s)
   - mid = 0 (current element)
   - high = len(nums) - 1 (boundary for 2s)

2. While mid <= high:
   - If nums[mid] == 0:
       swap(nums[low], nums[mid])
       low++
       mid++
   - Elif nums[mid] == 1:
       mid++  # Already in correct position
   - Else: (nums[mid] == 2)
       swap(nums[mid], nums[high])
       high--
       # Don't increment mid! Need to check swapped element

3. Array is now sorted

Example trace: [2,0,2,1,1,0]
Initial: low=0, mid=0, high=5
- nums[0]=2: swap with nums[5] → [0,0,2,1,1,2], high=4
- nums[0]=0: swap with nums[0] → [0,0,2,1,1,2], low=1, mid=1
- nums[1]=0: swap with nums[1] → [0,0,2,1,1,2], low=2, mid=2
- nums[2]=2: swap with nums[4] → [0,0,1,1,2,2], high=3
- nums[2]=1: mid++ → mid=3
- nums[3]=1: mid++ → mid=4
- mid > high, done
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Library Sort | O(n log n) | O(1) or O(n) | Not allowed by problem |
| Counting Sort | O(n) | O(1) | Two passes: count then fill |
| **Dutch National Flag** | **O(n)** | **O(1)** | Single pass, three pointers |

## Common Mistakes

### 1. Incrementing mid After Swap from Right
```python
# WRONG: Moving mid forward without checking swapped element
if nums[mid] == 2:
    swap(nums[mid], nums[high])
    high -= 1
    mid += 1  # BUG: Haven't checked what we swapped!

# CORRECT: Don't increment mid
if nums[mid] == 2:
    swap(nums[mid], nums[high])
    high -= 1
    # mid stays same to check swapped element
```

### 2. Wrong Loop Condition
```python
# WRONG: Using mid < high
while mid < high:  # Misses element at high!

# CORRECT: Include high position
while mid <= high:
```

### 3. Not Handling All Three Cases
```python
# WRONG: Only handling 0s and 2s
if nums[mid] == 0:
    # swap left
elif nums[mid] == 2:
    # swap right
# What about 1s?

# CORRECT: Handle all three values
if nums[mid] == 0:
    # swap left, increment both
elif nums[mid] == 1:
    mid += 1  # Already positioned
else:
    # swap right, don't increment mid
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Sort k Colors | k distinct values instead of 3 | Use counting sort or quicksort partitioning |
| Move Zeros to End | Only 0s and 1s | Two-pointer partition (simpler version) |
| Partition Around Pivot | Partition array around value | Similar three-way partition logic |

## Practice Checklist

**Correctness:**
- [ ] Handles already sorted array
- [ ] Handles reverse sorted array
- [ ] Handles all same elements
- [ ] Handles mixed elements
- [ ] Sorts in-place (no extra array)
- [ ] Single pass solution

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 15 minutes
- [ ] Can discuss complexity
- [ ] Can explain why mid doesn't increment for case 2

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations (move zeros)
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Two Pointers](../../strategies/patterns/two-pointers.md)
