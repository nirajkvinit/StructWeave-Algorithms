---
id: M456
old_id: A312
slug: longest-mountain-in-array
title: Longest Mountain in Array
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Longest Mountain in Array

## Problem

Imagine you're looking at an elevation profile - a graph showing altitude changes along a path. A "mountain" in this profile is a section that goes strictly uphill for a while, reaches a peak, then goes strictly downhill. No plateaus allowed - every step up or down must be to a different altitude.

More formally, a mountain in an array is a contiguous section with at least 3 elements where:
- There's a peak somewhere in the middle (not at the edges)
- Everything before the peak is strictly increasing
- Everything after the peak is strictly decreasing

For example, in the array [2, 1, 4, 7, 3, 2, 5], the section [1, 4, 7, 3, 2] forms a mountain: it rises from 1 to 7, then falls to 2. The peak is 7.

Your task is to find the length of the longest mountain within the given array. If no valid mountain exists, return 0.

## Why This Matters

Pattern detection in sequential data is crucial across many domains. In stock market analysis, you identify bullish and bearish trends by finding "mountains" and "valleys" in price charts. In signal processing and audio analysis, finding peaks and troughs helps identify beats, syllables, or anomalies. Fitness trackers use similar algorithms to identify hills in your running route and calculate elevation gain. The broader skill of identifying local maxima/minima and their surrounding context appears in time series analysis, quality control (detecting production peaks and drops), and seismology (identifying earthquake signatures). This problem teaches you to efficiently track state transitions - a fundamental technique in state machine design and protocol validation.

## Examples

**Example 1:**
- Input: `arr = [2,1,4,7,3,2,5]`
- Output: `5`
- Explanation: The subarray [1,4,7,3,2] forms the longest mountain with 5 elements.

**Example 2:**
- Input: `arr = [2,2,2]`
- Output: `0`
- Explanation: No mountain pattern exists in this array.

## Constraints

- 1 <= arr.length <= 10⁴
- 0 <= arr[i] <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
A mountain has three parts: strictly increasing, a peak, and strictly decreasing. For each potential peak (where arr[i-1] < arr[i] > arr[i+1]), expand left while increasing and right while decreasing to find the full mountain length.
</details>

<details>
<summary>🎯 Main Approach</summary>
Iterate through the array looking for peaks (local maxima where arr[i] > arr[i-1] and arr[i] > arr[i+1]). For each peak, use two pointers to expand left and right as far as possible while maintaining the strictly increasing/decreasing pattern. Track the maximum mountain length found.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can solve this in one pass by tracking the current upward and downward streak lengths. When direction changes from up to down, you have a potential mountain. When direction changes from down to up, start a new mountain. This avoids redundant scanning.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Check all subarrays) | O(n^3) | O(1) | Too slow, check every subarray |
| Two-Pointer from Peaks | O(n) | O(1) | Each element visited at most twice |
| Optimal (Single Pass) | O(n) | O(1) | Track up/down streak in one pass |

## Common Mistakes

1. **Not requiring both increasing AND decreasing parts**
   ```python
   # Wrong: Accepting monotonic sequences
   if left_len > 0:  # Only increasing, no decreasing
       max_mountain = max(max_mountain, left_len)

   # Correct: Require both parts
   if left_len > 0 and right_len > 0:
       max_mountain = max(max_mountain, left_len + right_len + 1)
   ```

2. **Forgetting the strictly increasing/decreasing requirement**
   ```python
   # Wrong: Allowing equal adjacent elements
   while left >= 0 and arr[left] <= arr[left + 1]:
       left -= 1  # Should be strictly less, not <=

   # Correct: Strictly increasing/decreasing
   while left >= 0 and arr[left] < arr[left + 1]:
       left -= 1
   ```

3. **Off-by-one errors in peak detection**
   ```python
   # Wrong: Starting from index 0 or ending at n-1
   for i in range(len(arr)):
       if arr[i-1] < arr[i] > arr[i+1]:  # IndexError at boundaries!

   # Correct: Peak must be in interior
   for i in range(1, len(arr) - 1):
       if arr[i-1] < arr[i] and arr[i] > arr[i+1]:
           # Expand from peak
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Longest Bitonic Subsequence | Medium | Subsequence instead of subarray (elements needn't be contiguous) |
| Longest Valley in Array | Medium | Find deepest valley (decreasing then increasing) |
| Number of Mountains | Easy | Count all mountains instead of finding longest |
| Mountain Array Peak Index | Easy | Find any peak in mountain array |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Two Pointers](../../strategies/patterns/two-pointers.md)
