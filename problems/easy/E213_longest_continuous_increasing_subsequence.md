---
id: E213
old_id: A141
slug: longest-continuous-increasing-subsequence
title: Longest Continuous Increasing Subsequence
difficulty: easy
category: easy
topics: ["array", "sliding-window"]
patterns: ["sliding-window", "greedy"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["array-traversal", "sliding-window"]
related_problems: ["E674", "M300", "M152"]
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Longest Continuous Increasing Subsequence

## Problem

You're given an unsorted integer array and need to find the length of the longest contiguous subarray where each element is strictly greater than the previous one. The key word here is "contiguous" - elements must be adjacent in the original array. You cannot skip elements like you could in the classic Longest Increasing Subsequence problem.

For example, in [1, 3, 5, 4, 7], the longest contiguous increasing sequence is [1, 3, 5] with length 3. Even though [1, 3, 5, 7] would be longer, it's not contiguous because the value 4 interrupts the sequence between 5 and 7. Note "strictly greater than" means nums[i] < nums[i+1], not nums[i] <= nums[i+1]. Equal consecutive values break the sequence.

Edge cases to consider: in an array where all elements are equal like [2, 2, 2, 2], no element is strictly greater than its predecessor, so the longest valid sequence has length 1 (any single element). In an entirely increasing array like [1, 2, 3, 4, 5], the answer is the entire length.

The challenge is to track when sequences start and end as you scan through the array, maintaining the maximum length seen so far. A greedy single-pass approach works because once a sequence breaks, you can immediately reset your counter - there's no need to look back.

## Why This Matters

This problem introduces the sliding window and greedy algorithm patterns, which appear throughout computer science. In stock trading systems, you might track the longest period of consecutive price increases. In network monitoring, you detect the longest streak of successful requests. In data analysis, you identify trends by finding continuous growth periods. The problem teaches you to recognize when a greedy approach works - specifically, when the optimal solution can be built by making locally optimal choices (resetting the counter when the sequence breaks). It also differentiates between contiguous and non-contiguous subsequences, an important distinction in algorithm design. Many interview questions test this pattern: maximum subarray sum (Kadane's algorithm), longest substring without repeating characters, and stock buy/sell problems all share the pattern of tracking streaks with resets. Understanding this simple version prepares you for those more complex variants.

## Examples

**Example 1:**
- Input: `nums = [1,3,5,4,7]`
- Output: `3`
- Explanation: The subarray [1,3,5] has length 3 and represents the longest stretch of consecutive increasing values. While [1,3,5,7] forms an increasing pattern, it doesn't qualify since the value 4 interrupts the continuity between 5 and 7.

**Example 2:**
- Input: `nums = [2,2,2,2,2]`
- Output: `1`
- Explanation: Since all values are identical, no element is strictly greater than its predecessor. Therefore, the longest valid subarray contains just a single element, giving a length of 1.

## Constraints

- 1 <= nums.length <= 10⁴
- -10⁹ <= nums[i] <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Track Current Streak
Iterate through the array maintaining a counter for the current increasing sequence length. When you find nums[i] > nums[i-1], increment the counter. When the sequence breaks (nums[i] <= nums[i-1]), reset the counter to 1. Track the maximum counter value seen throughout. What's the time complexity?

### Hint 2: Sliding Window Perspective
Think of this as a sliding window problem where the window expands when elements are increasing and resets when the sequence breaks. Maintain left and right pointers or just track the current window size. The window automatically resets when the increasing condition fails.

### Hint 3: Single Pass with State
You only need two variables: current length of the increasing sequence, and maximum length seen so far. Start with both at 1. For each element after the first, compare with previous: if greater, increment current length and update max; if not, reset current to 1. This is an O(n) greedy approach.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Single Pass (Greedy) | O(n) | O(1) | Optimal solution |
| Sliding Window | O(n) | O(1) | Same as greedy, different perspective |
| Dynamic Programming | O(n) | O(n) | Overkill for this problem |
| Two Pointers | O(n) | O(1) | Another valid approach |

## Common Mistakes

### Mistake 1: Not resetting counter correctly
```
// Wrong: Not resetting to 1 when sequence breaks
int current = 1, maxLen = 1;
for (int i = 1; i < nums.length; i++) {
    if (nums[i] > nums[i-1]) {
        current++;
        maxLen = Math.max(maxLen, current);
    } else {
        current = 0;  // Wrong! Should be 1, not 0
    }
}
```
**Why it's wrong**: When the sequence breaks, the current element starts a new potential sequence of length 1, not 0.

**Correct approach**: Reset current to 1 when nums[i] <= nums[i-1].

### Mistake 2: Forgetting to update maximum
```
// Wrong: Only updating max inside the if statement
int current = 1, maxLen = 1;
for (int i = 1; i < nums.length; i++) {
    if (nums[i] > nums[i-1]) {
        current++;
        maxLen = Math.max(maxLen, current);  // Only here
    } else {
        current = 1;
        // Missing: should update maxLen here too if needed
    }
}
```
**Why it's wrong**: This is actually correct for this problem, but the pattern is fragile. Better to update maxLen outside the if-else to ensure you never miss a potential maximum.

**Correct approach**: Update maxLen after the if-else to ensure you never miss a potential maximum.

### Mistake 3: Using >= instead of > for comparison
```
// Wrong: Allowing equal values to continue sequence
if (nums[i] >= nums[i-1]) {  // Should be strictly greater
    current++;
}
```
**Why it's wrong**: The problem requires "strictly greater than", so equal values should break the sequence.

**Correct approach**: Use `nums[i] > nums[i-1]` for strict inequality.

## Variations

| Variation | Difference | Difficulty Increase |
|-----------|------------|---------------------|
| Longest increasing subsequence (LIS) | Not necessarily contiguous | Hard (requires DP or binary search) |
| Longest non-decreasing subarray | Allow equal values (>=) | None (change one character) |
| Longest decreasing subarray | Find decreasing instead of increasing | None (reverse comparison) |
| Longest alternating subarray | Elements alternate up/down | Medium (track state) |
| Count all increasing subarrays | Count all, not just longest | Medium (combinatorics) |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solve using greedy single-pass
- [ ] Implement sliding window variant
- [ ] Handle edge cases (length 1, all equal, all increasing)
- [ ] Implement without bugs on first try
- [ ] Explain why greedy works
- [ ] Test with [1,3,5,4,7], [2,2,2,2,2]
- [ ] Solve in under 10 minutes
- [ ] Compare with LIS problem
- [ ] Revisit after 3 days (spaced repetition)
- [ ] Revisit after 1 week (spaced repetition)
- [ ] Solve non-decreasing variation
- [ ] Solve Longest Increasing Subsequence (M300)

**Strategy**: See [Sliding Window Pattern](../strategies/patterns/sliding-window.md)
