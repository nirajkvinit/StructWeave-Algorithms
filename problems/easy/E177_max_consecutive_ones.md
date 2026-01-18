---
id: E177
old_id: I284
slug: max-consecutive-ones
title: Max Consecutive Ones
difficulty: easy
category: easy
topics: ["array"]
patterns: ["sliding-window"]
estimated_time_minutes: 15
frequency: high
related_problems:
  - M051  # Max Consecutive Ones II
  - M052  # Max Consecutive Ones III
  - E024  # Longest Substring Without Repeating Characters
prerequisites:
  - Array traversal
  - Counter variables
  - Max tracking
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Max Consecutive Ones

## Problem

Given a binary array containing only 0s and 1s, find the length of the longest contiguous sequence of 1s. In other words, you're looking for the longest "streak" of consecutive 1s in the array.

For example, in the array [1,1,0,1,1,1], the longest run of consecutive 1s is at the end with three 1s in a row. The sequence [1,1] at the beginning is shorter, so it doesn't count. The key word here is "consecutive" - the 1s must be adjacent to each other with no 0s in between.

This is a fundamental pattern-recognition problem that teaches you to track running sequences in a single pass through data. You need to maintain two pieces of information: the current streak you're building, and the best (longest) streak you've seen so far. Every time you encounter a 0, the current streak resets, but you keep the memory of the longest streak.

## Why This Matters

This problem introduces the sliding window pattern, one of the most important algorithmic patterns for processing sequential data efficiently. The concept of maintaining a "current state" and "best state" while scanning through data appears constantly in data analysis, signal processing, and stream processing. Whether you're analyzing stock prices for the longest upward trend, monitoring sensor data for the longest stable period, or parsing log files for the longest error-free interval, you're using this same fundamental pattern. The problem also teaches optimal space usage - you can solve this with just two variables instead of storing all subsequences. This single-pass, constant-space pattern is essential for processing large datasets or streaming data.

## Examples

**Example 1:**
- Input: `nums = [1,1,0,1,1,1]`
- Output: `3`
- Explanation: The longest run of 1s appears at the end with three consecutive 1s.

**Example 2:**
- Input: `nums = [1,0,1,1,0,1]`
- Output: `2`
- Explanation: The longest sequence of consecutive 1s has length 2.

## Constraints

- 1 <= nums.length <= 10⁵
- nums[i] is either 0 or 1.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Hint
Use a single pass through the array. Keep track of the current consecutive count of 1's and the maximum count seen so far. When you encounter a 0, reset the current count but keep the maximum.

### Intermediate Hint
Implement a counter that increments for each 1 encountered and resets to 0 when a 0 is found. Maintain a separate variable to track the maximum consecutive count across the entire array. This achieves O(n) time with O(1) space.

### Advanced Hint
Recognize this as a basic sliding window pattern where the window collapses immediately upon encountering 0. Use two variables: current_count and max_count. The solution requires only one pass through the array with constant space complexity.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (All Subarrays) | O(n²) | O(1) | Check every subarray for consecutive 1's |
| Single Pass with Counter | O(n) | O(1) | Track current and max counts |
| Split and Count | O(n) | O(n) | Split by zeros, find max length |
| Optimal (One Pass) | O(n) | O(1) | Best approach for this problem |

## Common Mistakes

### Mistake 1: Not resetting the current count
```python
# Wrong: Forgetting to reset count on encountering 0
def findMaxConsecutiveOnes(nums):
    max_count = 0
    current = 0
    for num in nums:
        if num == 1:
            current += 1
            max_count = max(max_count, current)
        # Missing: reset current to 0 when num == 0
    return max_count
```

**Issue**: Current count continues accumulating across zeros, leading to incorrect results.

**Fix**: Add `else: current = 0` to reset the counter.

### Mistake 2: Not updating max_count correctly
```python
# Wrong: Only updating max at the end
def findMaxConsecutiveOnes(nums):
    max_count = 0
    current = 0
    for num in nums:
        if num == 1:
            current += 1
        else:
            current = 0
    return max(max_count, current)  # Too late!
```

**Issue**: Maximum is only checked after the loop, missing earlier sequences.

**Fix**: Update max_count inside the loop whenever current increases.

### Mistake 3: Off-by-one in final update
```python
# Wrong: Not checking final sequence
def findMaxConsecutiveOnes(nums):
    max_count = 0
    current = 0
    for i, num in enumerate(nums):
        if num == 1:
            current += 1
        else:
            max_count = max(max_count, current)
            current = 0
    # Missing: need to check current one more time
    return max_count
```

**Issue**: If array ends with 1's, the final sequence isn't compared to max_count.

**Fix**: Return `max(max_count, current)` to handle trailing 1's.

## Variations

| Variation | Difficulty | Description |
|-----------|----------|-------------|
| Max Consecutive Ones II | Medium | Find max consecutive 1's after flipping at most one 0 |
| Max Consecutive Ones III | Medium | Find max consecutive 1's after flipping at most K zeros |
| Longest Subarray After Deleting One | Medium | Find longest subarray of 1's after deleting exactly one element |
| Count Subarrays With All Ones | Medium | Count all subarrays that contain only 1's |
| Max Consecutive Characters | Easy | Find max consecutive occurrences of any character in a string |

## Practice Checklist

Track your progress on this problem:

**First Attempt**
- [ ] Solved independently (15 min time limit)
- [ ] Implemented O(n) time, O(1) space solution
- [ ] All test cases passing
- [ ] Analyzed time and space complexity

**Spaced Repetition**
- [ ] Day 1: Resolve from memory
- [ ] Day 3: Solve with optimal approach
- [ ] Week 1: Implement without hints
- [ ] Week 2: Solve Max Consecutive Ones II
- [ ] Month 1: Teach solution to someone else

**Mastery Goals**
- [ ] Can explain single-pass approach
- [ ] Can handle edge cases (all 0's, all 1's, empty array)
- [ ] Can extend to k flips variation
- [ ] Can solve in under 10 minutes

**Strategy**: See [Sliding Window Patterns](../strategies/patterns/sliding-window.md)
