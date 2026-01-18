---
id: H114
old_id: A459
slug: subarrays-with-k-different-integers
title: Subarrays with K Different Integers
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Subarrays with K Different Integers

## Problem

You are given an integer array `nums` and an integer `k`. Count how many **good subarrays** exist in `nums`.

A **good array** contains exactly `k` distinct integers.

	- As an example, `[1,2,3,1,2]` contains `3` unique integers: `1`, `2`, and `3`.

A **subarray** consists of consecutive elements from an array.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `nums = [1,2,1,2,3], k = 2`
- Output: `7`
- Explanation: Subarrays formed with exactly 2 different integers: [1,2], [2,1], [1,2], [2,3], [1,2,1], [2,1,2], [1,2,1,2]

**Example 2:**
- Input: `nums = [1,2,1,3,4], k = 3`
- Output: `3`
- Explanation: Subarrays formed with exactly 3 different integers: [1,2,1,3], [2,1,3], [1,3,4].

## Constraints

- 1 <= nums.length <= 2 * 10⁴
- 1 <= nums[i], k <= nums.length

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
"Exactly K distinct" is hard to count directly, but you can transform it: subarrays with exactly K distinct = (subarrays with at most K distinct) - (subarrays with at most K-1 distinct). This transforms a hard problem into two easier sliding window problems.
</details>

<details>
<summary>🎯 Main Approach</summary>
Create a helper function that counts subarrays with at most K distinct integers using a sliding window technique. Use a hash map to track character frequencies in the current window. Expand the window by moving right pointer, shrink when distinct count exceeds K. For each valid window position, all subarrays ending at right are valid (right - left + 1 subarrays).
</details>

<details>
<summary>⚡ Optimization Tip</summary>
In the "at most K" helper function, when you expand the window to position right, the number of new subarrays is (right - left + 1), representing all subarrays ending at right with any starting position from left to right. Sum these values across all positions.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(k) | Check all subarrays, track distinct count |
| Sliding Window | O(n) | O(k) | Two passes with at-most-K helper |
| Optimal | O(n) | O(k) | Each element visited at most twice per pass |

## Common Mistakes

1. **Trying to Count Exactly K Directly**
   ```python
   # Wrong: Direct sliding window for exactly K is complex
   while right < n:
       # Hard to know when to shrink window
       if distinct_count == k:
           count += 1  # Missing many valid subarrays

   # Correct: Use the at-most-K transformation
   def atMostK(k):
       # Count all subarrays with at most k distinct
   return atMostK(k) - atMostK(k - 1)
   ```

2. **Incorrect Subarray Counting**
   ```python
   # Wrong: Only counting one subarray per window
   if len(freq) <= k:
       count += 1

   # Correct: Count all subarrays ending at right
   while len(freq) > k:
       # shrink window
   count += right - left + 1
   ```

3. **Not Handling Frequency Map Properly**
   ```python
   # Wrong: Not removing zero-frequency entries
   freq[nums[left]] -= 1
   left += 1
   # freq still contains nums[left-1] with count 0

   # Correct: Remove entries with zero frequency
   freq[nums[left]] -= 1
   if freq[nums[left]] == 0:
       del freq[nums[left]]
   left += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Longest Substring with K Distinct | Medium | Find max length instead of count |
| Subarrays with Bounded Maximum | Medium | Different constraint on subarray values |
| Count Number of Nice Subarrays | Medium | Different counting criteria (odd numbers) |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Sliding Window Pattern](../../strategies/patterns/sliding-window.md)
