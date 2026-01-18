---
id: M553
old_id: A445
slug: longest-turbulent-subarray
title: Longest Turbulent Subarray
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Longest Turbulent Subarray

## Problem

Imagine riding a roller coaster where the track alternates between going up and down. Given an integer array `arr`, find the length of the longest contiguous section where consecutive elements create this same alternating pattern of comparisons.

A subarray is **turbulent** when each pair of adjacent elements alternates the comparison direction. Think of it like a zigzag pattern:

**Pattern A:** greater than, less than, greater than, less than, ...
- Example: [9, 4, 10, 7] → 9 > 4 < 10 > 7 ✓

**Pattern B:** less than, greater than, less than, greater than, ...
- Example: [4, 9, 7, 10] → 4 < 9 > 7 < 10 ✓

The key insight: if `arr[k] > arr[k+1]`, then the next comparison must be `arr[k+1] < arr[k+2]` to continue the turbulent pattern. The pattern must be consistent throughout the subarray.

Note that arrays with equal consecutive elements like [5, 5, 3] cannot be turbulent because the comparison 5 = 5 breaks the alternating pattern.

## Why This Matters

Turbulent pattern detection is essential in signal processing for identifying oscillating behavior in time-series data. Financial trading algorithms use this to detect market volatility patterns and price swings, helping identify optimal buy/sell windows during alternating trends. Sensor data analysis in IoT devices looks for these zigzag patterns to detect mechanical vibrations, electrical interference, or anomalous behavior. In network monitoring, alternating packet latencies can indicate congestion or routing issues. Audio processing uses wave pattern analysis to detect beats and rhythms. Climate scientists analyze temperature and pressure readings for alternating trends. The ability to efficiently detect the longest consecutive alternating sequence is valuable for quality control systems, vibration analysis, and any domain requiring pattern recognition in sequential measurements.

## Examples

**Example 1:**
- Input: `arr = [9,4,2,10,7,8,8,1,9]`
- Output: `5`
- Explanation: The subarray [4,2,10,7,8] has length 5 with alternating pattern: 4 > 2 < 10 > 7 < 8.

**Example 2:**
- Input: `arr = [4,8,12,16]`
- Output: `2`

**Example 3:**
- Input: `arr = [100]`
- Output: `1`

## Constraints

- 1 <= arr.length <= 4 * 10⁴
- 0 <= arr[i] <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Track the current streak of alternating comparisons. For each position, compare arr[i] with arr[i-1]. If the comparison sign alternates from the previous comparison (> then <, or < then >), extend the streak. If not, restart the streak. Handle equal consecutive elements by resetting to length 1.
</details>

<details>
<summary>Main Approach</summary>
Use a single pass with state tracking. Maintain two variables: current_length and previous_comparison (1 for increasing, -1 for decreasing, 0 for equal). For each element: (1) Determine current comparison with previous element. (2) If current comparison is opposite of previous and not equal, increment length. (3) If equal, reset length to 1. (4) Otherwise, reset length to 2 (start new turbulent subarray with current pair). Track maximum length seen.
</details>

<details>
<summary>Optimization Tip</summary>
Use the compare function or sign function to normalize comparisons: cmp(a, b) returns -1, 0, or 1. This makes alternation checking cleaner: new_cmp should be -old_cmp for continuation. Edge case: when arr[i] == arr[i-1], current length becomes 1 since equal elements can't form turbulent subarray.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check all subarrays; inefficient |
| Single Pass with State | O(n) | O(1) | Track current and previous comparison |
| Optimal | O(n) | O(1) | One pass, constant space |

## Common Mistakes

1. **Not handling equal consecutive elements**
   ```python
   # Wrong: Continues streak when elements are equal
   if arr[i] != arr[i-1]:
       length += 1

   # Correct: Reset when equal
   if arr[i] == arr[i-1]:
       length = 1
   elif is_alternating:
       length += 1
   else:
       length = 2
   ```

2. **Forgetting to reset to 2 instead of 1**
   ```python
   # Wrong: Reset to 1 when pattern breaks
   if not is_alternating:
       length = 1

   # Correct: New subarray starts with current pair
   if not is_alternating:
       length = 2  # Current and previous element form new start
   ```

3. **Incorrect alternation check**
   ```python
   # Wrong: Checking absolute values instead of sign change
   if abs(arr[i] - arr[i-1]) != abs(arr[i-1] - arr[i-2]):
       length += 1

   # Correct: Check sign alternation
   curr_cmp = 1 if arr[i] > arr[i-1] else -1 if arr[i] < arr[i-1] else 0
   if curr_cmp != 0 and curr_cmp == -prev_cmp:
       length += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Longest Mountain in Array | Medium | Requires both increasing and decreasing sections |
| Wiggle Subsequence | Medium | Subsequence (non-contiguous) instead of subarray |
| Longest Consecutive Sequence | Medium | Different pattern: consecutive integers |
| Longest Arithmetic Subsequence | Medium | Constant difference instead of alternating |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved (O(n))
- [ ] Clean, readable code
- [ ] Handled all edge cases (equal elements, single element, all increasing/decreasing)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Sliding Window](../../strategies/patterns/sliding-window.md)
