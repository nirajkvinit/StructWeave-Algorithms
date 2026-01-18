---
id: E132
old_id: I175
slug: wiggle-subsequence
title: Wiggle Subsequence
difficulty: easy
category: easy
topics: ["array", "dynamic-programming", "greedy"]
patterns: ["dp", "greedy"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["M300", "M152", "E053"]
prerequisites: ["dynamic-programming", "greedy-algorithms", "state-machines"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Wiggle Subsequence

## Problem

A wiggle sequence is one where consecutive differences alternate between positive and negative values. The first difference can start with either sign. Formally, a sequence `[a, b, c, d, ...]` is a wiggle sequence if the differences `(b-a, c-b, d-c, ...)` strictly alternate signs.

For example, `[1, 7, 4, 9, 2, 5]` is a wiggle sequence because its consecutive differences are `(6, -3, 5, -7, 3)`, which alternate between positive and negative. However, `[1, 4, 7, 2, 5]` fails because it has two consecutive positive differences at the start `(3, 3)`, and `[1, 7, 4, 5, 5]` fails because the final difference is zero.

A subsequence maintains the original element ordering while potentially removing some elements (or none). Any sequence with one or two distinct values automatically qualifies as a wiggle sequence. Given an integer array `nums`, find the length of the longest wiggle subsequence you can extract from it.

The key insight is that you don't need to track all possible subsequences. When building a wiggle sequence, at each position you only care whether you're currently looking for the next element to go up or down. This state-based thinking leads to an elegant greedy solution that runs in linear time with constant space.

## Why This Matters

This problem teaches you to recognize when greedy algorithms work correctly, a crucial skill since greedy approaches are faster than dynamic programming but only work for certain problems. The alternating pattern detection appears in signal processing (identifying peaks and troughs in waveforms), stock trading algorithms (detecting price momentum changes), and time-series analysis (finding trend reversals). The state machine concept you apply here (tracking whether you're looking for an increase or decrease) is fundamental to parsing, network protocol implementations, and game state management. Understanding both the DP and greedy solutions helps you recognize when optimal substructure allows for greedy optimization.

## Examples

**Example 1:**
- Input: `nums = [1,7,4,9,2,5]`
- Output: `6`
- Note: No elements need removal - the original sequence already alternates with differences (6, -3, 5, -7, 3)

**Example 2:**
- Input: `nums = [1,17,5,10,13,15,10,5,16,8]`
- Output: `7`
- Note: Multiple valid subsequences exist with length 7. One example is [1, 17, 10, 13, 10, 16, 8], producing differences (16, -7, 3, -3, 6, -8)

**Example 3:**
- Input: `nums = [1,2,3,4,5,6,7,8,9]`
- Output: `2`
- Note: The sequence only increases, so the longest wiggle is just two elements

## Constraints

- 1 <= nums.length <= 1000
- 0 <= nums[i] <= 1000

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Dynamic Programming with Two States
Track two different states: the longest wiggle ending with an up and ending with a down.

**Key Steps:**
1. Maintain two DP arrays: up[i] and down[i]
2. up[i] = longest wiggle ending at i with last difference positive
3. down[i] = longest wiggle ending at i with last difference negative
4. Update based on previous values

**When to use:** When you want to understand the state transition clearly. O(n) time and space.

### Intermediate Approach - Greedy Single Pass
Can you determine the answer by just tracking the current trend (going up or down)?

**Key Steps:**
1. Track whether we're looking for a peak or a valley
2. Count direction changes in the sequence
3. Skip consecutive elements with same trend
4. Handle duplicates carefully

**When to use:** This is the optimal O(n) time, O(1) space solution.

### Advanced Approach - Space-Optimized DP
Can you reduce the space complexity of the DP approach to O(1)?

**Key Steps:**
1. Use only two variables instead of arrays
2. Track current up and down lengths
3. Update in place based on current element comparison
4. Return maximum of the two values

**When to use:** When you want DP clarity with space optimization.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| DP with Arrays | O(n) | O(n) | Clear state transitions |
| Greedy | O(n) | O(1) | Optimal; count direction changes |
| Space-Optimized DP | O(n) | O(1) | DP logic with constant space |

## Common Mistakes

### Mistake 1: Not handling consecutive duplicates
```python
# Wrong - counting duplicates as valid transitions
def wiggleMaxLength(nums):
    if len(nums) < 2:
        return len(nums)
    count = 1
    for i in range(1, len(nums)):
        # Missing check for nums[i] == nums[i-1]
        if prev_diff <= 0 and nums[i] > nums[i-1]:
            count += 1
```

**Why it's wrong:** Consecutive equal values (no difference) shouldn't be counted as transitions in the wiggle sequence.

**Fix:** Skip elements where nums[i] == nums[i-1], or ensure difference is non-zero before counting.

### Mistake 2: Incorrect initialization
```python
# Wrong - starting count from 0
def wiggleMaxLength(nums):
    count = 0  # Wrong: should start from 1
    prev_diff = 0
    for i in range(1, len(nums)):
        diff = nums[i] - nums[i-1]
        if (diff > 0 and prev_diff <= 0) or (diff < 0 and prev_diff >= 0):
            count += 1
            prev_diff = diff
    return count
```

**Why it's wrong:** Every array has at least a wiggle subsequence of length 1 (the first element). Starting from 0 undercounts by 1.

**Fix:** Initialize count to 1, representing the first element always being included.

### Mistake 3: Updating prev_diff unconditionally
```python
# Wrong - updating prev_diff for all elements
def wiggleMaxLength(nums):
    count = 1
    prev_diff = 0
    for i in range(1, len(nums)):
        diff = nums[i] - nums[i-1]
        if (diff > 0 and prev_diff <= 0) or (diff < 0 and prev_diff >= 0):
            count += 1
        prev_diff = diff  # Wrong: should only update on valid transition
    return count
```

**Why it's wrong:** Updating prev_diff for every element (including plateaus) can cause you to miss actual transitions.

**Fix:** Only update prev_diff when you actually count a valid wiggle transition (direction change).

## Variations

| Variation | Difficulty | Description | Key Difference |
|-----------|-----------|-------------|----------------|
| Wiggle Sort | Medium | Rearrange array to form wiggle sequence | Modification instead of subsequence |
| Longest Mountain | Medium | Find longest subarray that's mountain-shaped | Contiguous subarray constraint |
| Wiggle Sort II | Medium | Wiggle sort with no adjacent duplicates | Additional constraints |
| Peak Valley Array | Medium | Maximize peaks and valleys in array | Optimization problem |

## Practice Checklist

Track your progress and spaced repetition:

- [ ] Initial attempt (after reading problem)
- [ ] Reviewed approach hints
- [ ] Implemented DP solution with states
- [ ] Implemented greedy solution
- [ ] Handled duplicate elements correctly
- [ ] All test cases passing
- [ ] Reviewed common mistakes
- [ ] Revisit after 1 day
- [ ] Revisit after 3 days
- [ ] Revisit after 1 week
- [ ] Can explain state transitions clearly

**Strategy Guide:** For pattern recognition and detailed techniques, see [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
