---
id: M396
old_id: A241
slug: minimize-max-distance-to-gas-station
title: Minimize Max Distance to Gas Station
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Minimize Max Distance to Gas Station

## Problem

You are given a sorted array of positions representing existing gas stations along a one-dimensional highway, and an integer `k` representing the number of new gas stations you can add. Your goal is to place these `k` stations strategically to minimize the maximum distance between any two consecutive stations.

You can place new stations at any location along the highway, including fractional positions (like 2.5 or 10.75). The question asks: what is the smallest possible value for the maximum gap after optimally placing all `k` stations? Your answer should be accurate to within `10⁻⁶`.

For example, with stations at `[1,2,3,4,5,6,7,8,9,10]` and `k=9`, the initial gaps are all size 1. By placing one new station in the middle of each gap, you create gaps of size 0.5, so the answer is 0.5.

The challenge is avoiding the greedy approach of repeatedly finding the largest gap and splitting it, which would require a priority queue with O(k log n) complexity. Instead, use binary search on the answer itself: guess a maximum distance D, then check if you can place `k` stations such that no gap exceeds D. For a gap of length L, you need `ceil(L/D) - 1` stations to ensure all resulting segments are at most D. If the total stations needed is less than or equal to `k`, then D is achievable; try a smaller value. Otherwise, try a larger D.

## Why This Matters

This problem exemplifies the powerful "binary search on the answer" technique, where instead of searching for a position in an array, you search for the optimal value of the solution itself. This pattern appears in resource allocation problems like "Koko Eating Bananas" (minimize eating speed), "Capacity to Ship Packages" (minimize ship capacity), and "Split Array Largest Sum" (minimize maximum subarray sum). In practical terms, this models real-world optimization problems like placing cell towers to minimize coverage gaps, scheduling checkpoints along routes to minimize maximum travel distances, or distributing servers geographically to minimize maximum latency. The floating-point binary search technique you learn here is essential for continuous optimization problems that don't have discrete integer solutions.

## Examples

**Example 1:**
- Input: `stations = [1,2,3,4,5,6,7,8,9,10], k = 9`
- Output: `0.50000`

**Example 2:**
- Input: `stations = [23,24,36,39,46,56,57,65,84,98], k = 1`
- Output: `14.00000`

## Constraints

- 10 <= stations.length <= 2000
- 0 <= stations[i] <= 10⁸
- stations is sorted in a **strictly increasing** order.
- 1 <= k <= 10⁶

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use binary search on the answer. For a given maximum distance D, you can determine if k stations are sufficient by calculating how many stations are needed in each gap to ensure no gap exceeds D.
</details>

<details>
<summary>🎯 Main Approach</summary>
Binary search on the maximum distance from 0 to the largest gap. For each candidate distance, check if you can distribute k stations such that no gap exceeds this distance. The number of stations needed in a gap of length L is ceil(L / D) - 1.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Set the search precision to 1e-6 as specified in the problem. Use floating-point binary search with the condition right - left > 1e-6. Avoid integer division errors by using proper ceiling calculation.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Greedy (Priority Queue) | O(k log n) | O(n) | Repeatedly add station to largest gap |
| Binary Search | O(n log(max_gap / ε)) | O(1) | ε = 1e-6 precision requirement |
| Optimal | O(n log(max_gap / ε)) | O(1) | Binary search on answer space |

## Common Mistakes

1. **Incorrect Station Count Calculation**
   ```python
   # Wrong: Off-by-one error in calculating needed stations
   gap = stations[i+1] - stations[i]
   needed = int(gap / max_dist)

   # Correct: Use ceiling and subtract 1
   import math
   gap = stations[i+1] - stations[i]
   needed = math.ceil(gap / max_dist) - 1
   ```

2. **Using Integer Binary Search**
   ```python
   # Wrong: Integer binary search for floating-point answer
   left, right = 0, max(gaps)
   while left < right:
       mid = (left + right) // 2

   # Correct: Floating-point binary search with precision
   left, right = 0.0, max(gaps)
   while right - left > 1e-6:
       mid = (left + right) / 2.0
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Koko Eating Bananas | Medium | Similar binary search on answer pattern |
| Capacity to Ship Packages | Medium | Binary search to minimize maximum capacity |
| Split Array Largest Sum | Hard | Minimize maximum sum across subarrays |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Binary Search on Answer](../../strategies/patterns/binary-search.md)
