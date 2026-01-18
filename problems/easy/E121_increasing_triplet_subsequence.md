---
id: E121
old_id: I133
slug: increasing-triplet-subsequence
title: Increasing Triplet Subsequence
difficulty: easy
category: easy
topics: ["array"]
patterns: ["greedy", "two-pointers"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E001", "M142", "M300"]
prerequisites: ["arrays", "greedy-algorithms", "subsequences"]
strategy_ref: ../strategies/patterns/greedy.md
---
# Increasing Triplet Subsequence

## Problem

Given an integer array `nums`, find whether three positions exist where the values are in strictly increasing order. Specifically, you need to determine if there are indices i, j, and k where i < j < k (positions increase from left to right) and nums[i] < nums[j] < nums[k] (values also increase).

The key word here is "subsequence" which means the three elements don't need to be consecutive or adjacent in the array. As long as their positions and values both increase, they form a valid triplet. For example, in the array [2, 1, 5, 0, 4, 6], the subsequence at indices 3, 4, 5 with values 0, 4, 6 forms a valid increasing triplet.

Return `true` if such a triplet exists anywhere in the array, `false` otherwise. The challenge is to solve this efficiently in O(n) time using only O(1) extra space, rather than checking all possible triplet combinations which would take O(n^3) time.

The elegant solution uses a greedy approach that tracks potential candidates as you scan through the array. You maintain the smallest value seen so far, and the smallest "middle" value that comes after it, updating them strategically to maximize your chances of finding a larger third value.

## Why This Matters

This problem teaches the powerful greedy strategy of maintaining just enough information to make optimal local decisions. It appears in stock trading algorithms (finding profitable buy-hold-sell patterns), trend analysis (detecting upward movements), and data stream processing (identifying patterns in real-time). The O(1) space solution demonstrates how clever variable updates can replace expensive data structures. This is a highly popular interview question because it tests your ability to see beyond brute force, understand the difference between subsequences and subarrays, and apply greedy thinking. The techniques you learn here extend to finding k-increasing subsequences and solving the classic Longest Increasing Subsequence problem.

## Examples

**Example 1:**
- Input: `nums = [1,2,3,4,5]`
- Output: `true`
- Explanation: Multiple valid triplets exist since the array is sorted in ascending order.

**Example 2:**
- Input: `nums = [5,4,3,2,1]`
- Output: `false`
- Explanation: No increasing triplet can be found in this descending sequence.

**Example 3:**
- Input: `nums = [2,1,5,0,4,6]`
- Output: `true`
- Explanation: Indices (3, 4, 5) form a valid triplet with values 0 < 4 < 6.

## Constraints

- 1 <= nums.length <= 5 * 10⁵
- -2³¹ <= nums[i] <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Hint 1: Intuition (Beginner)
To find an increasing triplet, you need to track potential candidates as you scan through the array. Think about keeping track of the smallest number you've seen so far, and the smallest "second" number that comes after it. If you ever find a third number larger than both, you've found your triplet. The key insight is that you can update these candidates greedily.

### Hint 2: Optimization (Intermediate)
Maintain two variables: first (smallest number so far) and second (smallest number that comes after first and is greater than first). As you iterate, if you find a number smaller than first, update first. If you find a number between first and second, update second. If you find a number greater than second, you've found the triplet. This runs in O(n) time with O(1) space.

### Hint 3: Implementation Details (Advanced)
Initialize first and second to infinity. For each number: if num <= first, update first = num; else if num <= second, update second = num; else return true (found triplet). The clever part is that even if first gets updated after second, the triplet still exists because the old first-second pair remains in the array at earlier positions. Return false if loop completes without finding a triplet.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy two-variable | O(n) | O(1) | Optimal solution, single pass |
| Brute force (3 loops) | O(n^3) | O(1) | Check all triplet combinations |
| LIS with DP | O(n^2) | O(n) | Overkill for this problem |
| Binary search approach | O(n log n) | O(n) | Not necessary for triplet |

## Common Mistakes

### Mistake 1: Misunderstanding Subsequence vs Subarray
```python
# Wrong: Checking consecutive elements only
def increasingTriplet(nums):
    for i in range(len(nums) - 2):
        if nums[i] < nums[i+1] < nums[i+2]:  # Requires consecutive!
            return True
    return False
```
**Fix:** Subsequence doesn't require consecutive elements, just maintaining order.

### Mistake 2: Not Updating Variables Correctly
```python
# Wrong: Incorrect update logic
def increasingTriplet(nums):
    first = second = float('inf')
    for num in nums:
        if num < first:
            first = num
            second = float('inf')  # Wrong! Don't reset second
```
**Fix:** Only update first without resetting second; old first-second pair still exists in array.

### Mistake 3: Returning Early Incorrectly
```python
# Wrong: Checking conditions in wrong order
def increasingTriplet(nums):
    first = second = float('inf')
    for num in nums:
        if num > second:  # Should check this last
            return True
        if num < first:
            first = num
```
**Fix:** Check num > second first (found triplet), then update first and second in correct order.

## Variations

| Variation | Description | Difficulty | Key Difference |
|-----------|-------------|------------|----------------|
| Longest Increasing Subsequence | Find length of LIS | Medium | Full DP solution needed |
| K-Increasing Subsequence | Find k-element increasing subsequence | Medium | Generalize to k variables |
| Decreasing Triplet | Find decreasing instead of increasing | Easy | Flip comparison operators |
| Count Increasing Triplets | Count all such triplets | Medium | Need to track counts, not just existence |

## Practice Checklist

Study Plan:
- [ ] Day 1: Understand subsequence concept, implement brute force
- [ ] Day 3: Implement greedy two-variable solution, trace examples
- [ ] Day 7: Understand why updating first doesn't break solution
- [ ] Day 14: Solve variations, generalize to k elements
- [ ] Day 30: Speed solve (< 10 minutes), explain invariant

Key Mastery Indicators:
- Can explain why O(1) space solution works
- Understand difference between subsequence and subarray
- Explain why updating first variable doesn't invalidate second
- Handle edge cases (arrays with < 3 elements)

**Strategy**: See [Greedy Algorithms](../strategies/patterns/greedy.md)
