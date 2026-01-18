---
id: E206
old_id: A110
slug: maximum-average-subarray-i
title: Maximum Average Subarray I
difficulty: easy
category: easy
topics: ["array", "sliding-window"]
patterns: ["sliding-window"]
estimated_time_minutes: 15
frequency: high
prerequisites: ["array-traversal", "basic-math"]
related_problems: ["E003", "M003", "M159"]
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Maximum Average Subarray I

## Problem

You're given an array of integers and a fixed window size `k`. Your task is to find a contiguous sequence of exactly `k` elements that has the highest average value, and return that maximum average.

A contiguous subarray means the elements must be adjacent in the original array - you can't skip elements or rearrange them. For example, in the array [1, 12, -5, -6, 50, 3] with k=4, one possible subarray is [12, -5, -6, 50], which has average (12 - 5 - 6 + 50) / 4 = 12.75.

The naive approach would be to examine every possible k-length subarray, calculate its sum, and track the maximum. However, this leads to redundant work because consecutive subarrays overlap significantly. For example, [1, 12, -5, -6] and [12, -5, -6, 50] share three elements. Instead of recalculating the sum from scratch, you can "slide" the window: remove the element leaving the window and add the element entering it.

This sliding window technique reduces time complexity from O(n × k) to O(n). Calculate the sum of the first k elements, then slide the window one position at a time, maintaining a running sum. Track the maximum sum throughout, and at the end, divide by k to get the maximum average. Note that you only need to divide once - working with sums during iteration avoids repeated floating-point operations.

## Why This Matters

The sliding window pattern is one of the most important array techniques for technical interviews, appearing in problems involving substrings, subarrays, and sequences. It transforms brute-force O(n²) or O(n × k) solutions into efficient O(n) solutions by eliminating redundant calculations.

This pattern is essential in real-world applications: network throughput analysis (maximum data rate over time windows), financial analytics (best performing stock period), sensor data processing (smoothing and peak detection), and video streaming (buffer management). Understanding when consecutive windows share data - and how to incrementally update - is key to performance optimization.

The problem also teaches important implementation details: avoiding premature division (for precision), handling array boundaries correctly (preventing off-by-one errors), and choosing appropriate data types (avoiding integer overflow). These details matter in production code and are frequently tested in interviews.

## Examples

**Example 1:**
- Input: `nums = [1,12,-5,-6,50,3], k = 4`
- Output: `12.75000`
- Explanation: Maximum average is (12 - 5 - 6 + 50) / 4 = 51 / 4 = 12.75

**Example 2:**
- Input: `nums = [5], k = 1`
- Output: `5.00000`

## Constraints

- n == nums.length
- 1 <= k <= n <= 10⁵
- -10⁴ <= nums[i] <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Brute Force Foundation
Think about calculating the sum of every possible k-length subarray. For each starting position, sum k consecutive elements and track the maximum. What's the time complexity? Consider how many subarrays exist and what operation you perform for each.

### Hint 2: Eliminate Redundancy
Notice that consecutive subarrays share k-1 elements. When moving from one window to the next, what changes? Instead of recalculating the entire sum, can you update it by adding one element and removing another? This is the sliding window technique.

### Hint 3: Optimal Implementation
Maintain a running sum as you slide the window. Start by calculating the sum of the first k elements. Then, for each subsequent position, subtract the element leaving the window and add the element entering. Track the maximum sum throughout, then convert to average at the end.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force | O(n * k) | O(1) | Calculate sum for each of n-k+1 windows |
| Sliding Window | O(n) | O(1) | Single pass with constant space |
| Prefix Sum | O(n) | O(n) | Preprocessing allows O(1) queries |

## Common Mistakes

### Mistake 1: Dividing prematurely in the loop
```
// Wrong: Performing division in each iteration
maxAvg = max(maxAvg, currentSum / k)  // Loses precision, unnecessary operations
```
**Why it's wrong**: Division is slower than addition/subtraction, and performing it n times is wasteful. Calculate average once at the end using the maximum sum.

**Correct approach**: Track maximum sum, divide only at the end.

### Mistake 2: Integer overflow for large arrays
```
// Wrong: Using int for sum accumulation
int sum = 0;
for (int i = 0; i < k; i++) {
    sum += nums[i];  // May overflow with large values
}
```
**Why it's wrong**: With nums[i] up to 10^4 and k up to 10^5, the sum can exceed int limits (2^31 - 1).

**Correct approach**: Use long or double for sum accumulation.

### Mistake 3: Off-by-one errors in window boundaries
```
// Wrong: Incorrect loop boundary
for (int i = k; i <= n; i++) {  // Should be i < n
    sum = sum - nums[i-k] + nums[i];
}
```
**Why it's wrong**: Array indexing goes from 0 to n-1. Using i <= n causes array out of bounds.

**Correct approach**: Loop while i < n, carefully manage window start/end indices.

## Variations

| Variation | Difference | Difficulty Increase |
|-----------|------------|---------------------|
| Minimum average subarray | Find minimum instead of maximum | None (same logic) |
| Maximum sum subarray (Kadany's) | k is not fixed, any length allowed | Medium (requires DP) |
| K-th largest average | Find k-th largest among all subarrays | Medium (requires heap/sorting) |
| Subarray closest to target average | Minimize distance to target | Medium (two-pointer/binary search) |
| Maximum average circular subarray | Array wraps around | Hard (handle circular case) |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solve using brute force (understand the problem)
- [ ] Optimize to sliding window approach
- [ ] Handle edge cases (k=1, k=n, single element)
- [ ] Implement without bugs on first try
- [ ] Explain time/space complexity clearly
- [ ] Code review: Check for integer overflow
- [ ] Test with negative numbers
- [ ] Solve in under 15 minutes
- [ ] Teach the solution to someone else
- [ ] Revisit after 3 days (spaced repetition)
- [ ] Revisit after 1 week (spaced repetition)
- [ ] Solve related problem with variable window size

**Strategy**: See [Sliding Window Pattern](../strategies/patterns/sliding-window.md)
