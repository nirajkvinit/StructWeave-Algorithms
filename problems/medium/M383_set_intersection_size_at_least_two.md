---
id: M383
old_id: A224
slug: set-intersection-size-at-least-two
title: Set Intersection Size At Least Two
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Set Intersection Size At Least Two

## Problem

You're given a collection of intervals, where each interval `[start, end]` represents all integers from `start` to `end` inclusive. For example, the interval `[3, 7]` contains the integers `{3, 4, 5, 6, 7}`.

Your task is to find the smallest possible set of integers (called a **containing set**) such that every interval has at least two numbers in common with your set. Think of it like providing coverage: each interval must "see" at least 2 of your chosen numbers.

For example, given intervals `[[1,3], [3,7], [8,9]]`:
- The set `{2, 3, 4, 8, 9}` works because:
  - Interval `[1,3]` contains both `2` and `3` from our set
  - Interval `[3,7]` contains both `3` and `4` from our set
  - Interval `[8,9]` contains both `8` and `9` from our set

The challenge is finding the minimum size of such a set. Simply picking all numbers from all intervals would work but would be wasteful. Can you be more strategic about which numbers to choose so that they provide "double coverage" efficiently?

Return the minimum number of elements needed in your containing set.

## Why This Matters

This is a classic greedy interval scheduling problem with applications in resource allocation, network design, and scheduling systems. Imagine assigning security checkpoints along highways (intervals) where each road segment needs at least two checkpoints, or selecting cache entries that serve multiple overlapping time windows. The greedy insight - choosing elements from interval endpoints to maximize future coverage - is a powerful pattern that appears in meeting room scheduling, task assignment, and data center optimization. This problem builds intuition for making locally optimal choices that lead to globally optimal solutions.

## Examples

**Example 1:**
- Input: `intervals = [[1,3],[3,7],[8,9]]`
- Output: `5`
- Explanation: Consider nums = [2, 3, 4, 8, 9].
No valid containing set exists with fewer than 5 elements.

**Example 2:**
- Input: `intervals = [[1,3],[1,4],[2,5],[3,5]]`
- Output: `3`
- Explanation: Consider nums = [2, 3, 4].
No valid containing set exists with fewer than 3 elements.

**Example 3:**
- Input: `intervals = [[1,2],[2,3],[2,4],[4,5]]`
- Output: `5`
- Explanation: Consider nums = [1, 2, 3, 4, 5].
No valid containing set exists with fewer than 5 elements.

## Constraints

- 1 <= intervals.length <= 3000
- intervals[i].length == 2
- 0 <= starti < endi <= 10⁸

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a greedy interval scheduling problem. Sort intervals by end point (then by start point for ties). Greedily choose the two largest values from each interval's end, which maximizes coverage of subsequent intervals. The key insight: choosing values at the end of an interval maximizes overlap with future intervals.
</details>

<details>
<summary>Main Approach</summary>
Sort intervals by (end, start). Use a list to track selected numbers. For each interval, check how many of the last 2 selected numbers fall within it. If fewer than 2, add the largest missing numbers from the interval's end (end-1, end or just end depending on need). This greedy choice ensures minimal total selections.
</details>

<details>
<summary>Optimization Tip</summary>
Instead of checking all selected numbers against each interval, only check the last 2 added (since intervals are sorted by end, only recent additions can intersect). Use a simple counter to track how many of the needed 2 elements are already covered, then add appropriately from the interval's end.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(2^n * n) | O(n) | Try all subsets of all possible values |
| Greedy | O(n log n) | O(n) | Sorting dominates; n = number of intervals |

## Common Mistakes

1. **Not sorting by end point**
   ```python
   # Wrong: Sort by start point or don't sort
   intervals.sort(key=lambda x: x[0])

   # Correct: Sort by end point for greedy strategy
   intervals.sort(key=lambda x: (x[1], x[0]))
   ```

2. **Choosing arbitrary values from interval**
   ```python
   # Wrong: Choose from start of interval
   if count < 2:
       nums.append(start)

   # Correct: Choose from end to maximize future coverage
   if count < 2:
       nums.append(end - 1)
       nums.append(end)
   ```

3. **Checking all selected numbers**
   ```python
   # Wrong: Check all previously selected numbers
   count = sum(1 for num in selected if start <= num <= end)

   # Correct: Only check last 2 (sufficient after sorting)
   count = 0
   if len(selected) >= 1 and start <= selected[-1] <= end:
       count += 1
   if len(selected) >= 2 and start <= selected[-2] <= end:
       count += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Number of Arrows to Burst Balloons | Medium | Need only 1 overlap per interval |
| Non-overlapping Intervals | Medium | Remove intervals instead of adding points |
| Interval List Intersections | Medium | Find intersections of two interval lists |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
