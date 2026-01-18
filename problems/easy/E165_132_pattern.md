---
id: E165
old_id: I255
slug: 132-pattern
title: 132 Pattern
difficulty: easy
category: easy
topics: ["array", "stack", "monotonic-stack"]
patterns: ["monotonic-stack", "pattern-matching"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E496", "M739", "M901"]
prerequisites: ["stack-operations", "monotonic-structures"]
strategy_ref: ../strategies/patterns/monotonic-stack.md
---
# 132 Pattern

## Problem

You are given an integer array `nums`, and your task is to detect a specific ordering pattern among three elements. A "132 pattern" exists when you can find three indices `i`, `j`, and `k` where `i < j < k` (they appear in this order from left to right) but their values follow a different ordering: `nums[i] < nums[k] < nums[j]`.

To visualize this, imagine the pattern name "132" refers to the relative sizes of the three numbers. If we label the smallest as "1", the largest as "3", and the middle as "2", we're looking for a sequence where the first number is smallest, the second (middle position) is largest, and the third is medium-sized. For example, the triplet [1, 4, 2] forms a 132 pattern because 1 < 2 < 4.

This problem is deceptively challenging. While a brute-force check of all possible triplets would work, it's inefficient. The key insight involves recognizing that you need to track both the minimum value seen so far (the "1") and potential middle values (the "3"), while looking for an appropriate "2" that fits between them. Consider whether processing the array from right to left might make it easier to maintain the necessary information as you scan.

## Why This Matters

Pattern detection in sequences is fundamental to many algorithmic problems, from stock price analysis (finding buy-low, sell-high-then-dip patterns) to time-series anomaly detection. The 132 pattern specifically appears in technical analysis of market trends, where traders look for price movements that indicate potential reversals. This problem teaches you to recognize when a monotonic stack—a stack that maintains elements in sorted order—can dramatically simplify sequential pattern matching.

Beyond the specific pattern, this problem develops your ability to think about scanning direction: sometimes processing data backward reveals structure that's hidden when going forward. The technique of maintaining auxiliary data structures while traversing (like tracking the maximum value that was "popped" from a stack) is a powerful pattern that extends to interval problems, range queries, and nested structure validation. Mastering this problem builds intuition for when stack-based solutions can replace expensive nested loops.

## Examples

**Example 1:**
- Input: `nums = [1,2,3,4]`
- Output: `false`
- Explanation: No 132 pattern exists in this sequence.

**Example 2:**
- Input: `nums = [3,1,4,2]`
- Output: `true`
- Explanation: A 132 pattern exists: [1, 4, 2].

**Example 3:**
- Input: `nums = [-1,3,2,0]`
- Output: `true`
- Explanation: Multiple 132 patterns exist: [-1, 3, 2], [-1, 3, 0], and [-1, 2, 0].

## Constraints

- n == nums.length
- 1 <= n <= 2 * 10⁵
- -10⁹ <= nums[i] <= 10⁹

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Brute Force Triple Loop
**Hint**: Check all possible triplets (i, j, k) where i < j < k.

**Key Ideas**:
- Three nested loops for indices i, j, k
- Check if nums[i] < nums[k] < nums[j]
- Return true if any valid triplet found
- Return false after checking all triplets

**Why This Works**: Exhaustive search guarantees finding pattern if it exists.

### Intermediate Approach - Track Minimum with Two Loops
**Hint**: For each j, track the minimum value to its left, then search right for valid k.

**Optimization**:
- Precompute min_left[j] = minimum value in nums[0...j-1]
- For each j, look for k where min_left[j] < nums[k] < nums[j]
- If found, return true
- Two passes: O(n) preprocessing + O(n^2) search

**Trade-off**: Better than O(n^3), easier to implement than optimal solution.

### Advanced Approach - Monotonic Stack from Right
**Hint**: Scan from right to left, use stack to track potential middle values, maintain max valid "3" value.

**Key Insight**:
- Scan right to left
- Maintain stack of decreasing values (potential k candidates)
- Track third (the "3" in 132) - maximum value that was popped
- For current element, if it's less than third, found pattern
- This ensures current < third < (something in stack)

**Why This is Optimal**: O(n) time, O(n) space, single pass with stack.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (3 loops) | O(n^3) | O(1) | Check all triplets |
| Min Array + 2 loops | O(n^2) | O(n) | Precompute minimums |
| Monotonic Stack | O(n) | O(n) | Optimal, single pass from right |
| Binary Search Tree | O(n log n) | O(n) | Maintain BST of right elements |

## Common Mistakes

### Mistake 1: Incorrect pattern ordering
```
# WRONG - Checking for 123 pattern instead of 132
for i in range(len(nums)):
    for j in range(i+1, len(nums)):
        for k in range(j+1, len(nums)):
            if nums[i] < nums[j] < nums[k]:  # This is 123, not 132!
                return True
```
**Why it fails**: 132 pattern means nums[i] < nums[k] < nums[j], not ascending order.

**Correct approach**: Check `nums[i] < nums[k] < nums[j]` with i < j < k.

### Mistake 2: Wrong direction for stack approach
```
# WRONG - Scanning left to right
stack = []
for num in nums:
    # This direction makes it hard to track the "3" value
    while stack and stack[-1] > num:
        stack.pop()
```
**Why it fails**: Left-to-right scan doesn't naturally identify the middle element.

**Correct approach**: Scan right-to-left, maintaining decreasing stack and tracking popped max.

### Mistake 3: Not updating third value correctly
```
# WRONG - Not tracking maximum popped value
third = float('-inf')
for num in reversed(nums):
    while stack and stack[-1] < num:
        stack.pop()  # Should update third here!
    if num < third:
        return True
    stack.append(num)
```
**Why it fails**: third should be the maximum value popped from stack, not arbitrary.

**Correct approach**: `while stack and stack[-1] < num: third = max(third, stack.pop())`.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| 123 Pattern | Find i < j < k with nums[i] < nums[j] < nums[k] | Easy |
| 321 Pattern | Find decreasing triplet | Easy |
| Count 132 Patterns | Return count instead of boolean | Hard |
| K-Pattern | Generalize to arbitrary pattern of length k | Hard |
| Longest 132 Pattern | Find longest subsequence with 132 pattern | Hard |

## Practice Checklist

Track your progress as you master this problem:

- [ ] **Day 1**: Solve with brute force O(n^3) approach (allow 20 mins)
- [ ] **Day 2**: Implement min-tracking O(n^2) optimization
- [ ] **Day 3**: Study monotonic stack solution thoroughly
- [ ] **Week 2**: Code monotonic stack from memory, verify logic
- [ ] **Week 4**: Solve related monotonic stack problems
- [ ] **Week 8**: Speed drill - solve in under 15 minutes

**Strategy**: See [Monotonic Stack Pattern](../strategies/patterns/monotonic-stack.md) for advanced stack techniques.
