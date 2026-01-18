---
id: M545
old_id: A436
slug: pancake-sorting
title: Pancake Sorting
difficulty: medium
category: medium
topics: ["array", "sorting"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
---
# Pancake Sorting

## Problem

Picture yourself flipping pancakes with a spatula. You can slide the spatula under any pancake in the stack and flip all the pancakes above it, reversing their order. Your goal is to sort the entire stack from smallest (top) to largest (bottom) using only this flipping operation.

More formally, you have an integer array `arr` that needs to be sorted using a special "flip" operation:

**Flip operation:**
- Choose a position `k` where `1 <= k <= arr.length`
- Reverse all elements from index `0` to index `k-1` (using 0-based indexing)

For example, with `arr = [3,2,1,4]`:
- Flipping with `k = 3` reverses the first three elements `[3,2,1]`
- Result: `arr = [1,2,3,4]`

Your task is to return a sequence of `k` values representing the flips needed to sort the array. Any valid solution using at most `10 * arr.length` flips is acceptable.

## Why This Matters

The pancake sorting problem is more than a whimsical puzzle—it's a model for real-world situations where you can only manipulate data in restricted ways. In bioinformatics, genome rearrangement problems involve reversing segments of DNA sequences, where understanding minimal flip sequences helps track evolutionary distances between species. In manufacturing robotics, robotic arms often need to reorder items on a conveyor belt using limited rotation operations. The problem also appears in network packet routing where data streams can only be reversed at certain nodes. Beyond practical applications, pancake sorting teaches crucial lessons about greedy algorithms, selection sort variants, and working within constrained operation sets—skills that transfer to embedded systems programming and hardware-level optimization where only specific primitive operations are available.

## Examples

**Example 1:**
- Input: `arr = [3,2,4,1]`
- Output: `[4,2,4,3]
**Explanation: **
Applying 4 flips with k values 4, 2, 4, and 3:
Initial: arr = [3, 2, 4, 1]
After k=4: arr = [1, 4, 2, 3]
After k=2: arr = [4, 1, 2, 3]
After k=4: arr = [3, 2, 1, 4]
After k=3: arr = [1, 2, 3, 4] (sorted).`

**Example 2:**
- Input: `arr = [1,2,3]`
- Output: `[]
**Explanation: **The array is already in sorted order, so no flips are necessary.
Alternative answers like [3, 3] are also valid.`

## Constraints

- 1 <= arr.length <= 100
- 1 <= arr[i] <= arr.length
- All integers in arr are unique (i.e. arr is a permutation of the integers from 1 to arr.length).

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The key strategy is to sort the array from right to left, placing the largest unsorted element in its correct position one at a time. To move an element to a specific position, you can: (1) flip it to the front, then (2) flip it to its target position. This is similar to selection sort but using only flip operations.
</details>

<details>
<summary>🎯 Main Approach</summary>
Iterate from the end of the array backward. For each position i (from n-1 down to 0): find the index of the maximum element in arr[0:i+1]. If it's not already at position i, perform two flips: first flip at (max_index + 1) to bring the max to the front, then flip at (i + 1) to move it to position i. Repeat until the entire array is sorted.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
If the maximum element is already at the front (index 0), you only need one flip to move it to its target position. If the maximum element is already at its target position, skip it entirely (no flips needed). This reduces the number of operations. The worst case is 2n flips, which is well under the 10n limit.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Selection Sort with Flips | O(n²) | O(n) | Find max in O(n), repeat n times |
| Optimal | O(n²) | O(n) | At most 2n flips, each flip is O(n) |

## Common Mistakes

1. **Using 1-indexed k instead of 0-indexed**
   ```python
   # Wrong: Flipping with 0-indexed k
   result.append(max_idx)  # Should be max_idx + 1
   arr[:max_idx] = arr[:max_idx][::-1]

   # Correct: k is 1-indexed in the problem
   k = max_idx + 1
   result.append(k)
   arr[:k] = arr[:k][::-1]
   ```

2. **Not skipping already-sorted elements**
   ```python
   # Wrong: Always performing two flips
   for i in range(n-1, 0, -1):
       max_idx = find_max(arr, i)
       flip(arr, max_idx + 1)
       flip(arr, i + 1)
   # Inefficient when element already in place

   # Correct: Skip if already in correct position
   for i in range(n-1, 0, -1):
       max_idx = find_max(arr, i)
       if max_idx != i:
           if max_idx != 0:
               flip(arr, max_idx + 1)
               result.append(max_idx + 1)
           flip(arr, i + 1)
           result.append(i + 1)
   ```

3. **Incorrect flip implementation**
   ```python
   # Wrong: Reversing from k instead of 0 to k-1
   arr[k:] = arr[k:][::-1]

   # Correct: Reverse first k elements (0-indexed)
   arr[:k] = arr[:k][::-1]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Reverse String | Easy | Simple single flip operation |
| Reverse Linked List II | Medium | Flip operation on linked list segment |
| Rotate Array | Medium | Multiple rotation operations |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Sorting](../../strategies/patterns/sorting.md)
