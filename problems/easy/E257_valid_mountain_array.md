---
id: E257
old_id: A408
slug: valid-mountain-array
title: Valid Mountain Array
difficulty: easy
category: easy
topics: ["array"]
patterns: ["two-pointers", "array-traversal"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E026", "E053", "M005"]
prerequisites: ["arrays", "iteration"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Valid Mountain Array

## Problem

Imagine a mountain represented by an array of integers where values increase up to a peak, then decrease down the other side. Your task is to determine whether a given array `arr` represents a valid mountain pattern. A valid mountain array must satisfy several strict conditions: first, it must contain at least 3 elements (a mountain needs a left side, peak, and right side); second, there must exist exactly one peak at some index `i` where `0 < i < arr.length - 1` (the peak cannot be at the start or end); third, values must strictly increase from the start up to index `i`, meaning `arr[0] < arr[1] < ... < arr[i-1] < arr[i]` with no plateaus or decreases allowed; and fourth, values must strictly decrease from index `i` to the end, meaning `arr[i] > arr[i+1] > ... > arr[arr.length-1]` again with no plateaus. The word "strictly" is crucial - consecutive equal values like [1, 3, 3, 2] fail validation because the peak has a plateau. Similarly, arrays that only increase [1, 2, 3] or only decrease [3, 2, 1] are invalid because they lack either the ascending or descending portion. Return `true` if the array represents a valid mountain, `false` otherwise.

## Why This Matters

Pattern validation in sequential data is fundamental to signal processing, time-series analysis, and data quality verification. The mountain pattern specifically appears in detecting peaks in stock prices, sensor readings, network traffic spikes, and any domain where you need to identify rise-then-fall behavior. This problem teaches you to maintain state as you traverse an array, tracking phase transitions (from ascending to descending) and validating invariants (strict inequality, internal peak). The two-pointer technique with directional scanning - walking up from the left, then walking down to verify the descent - is a pattern that extends to many validation problems: palindrome checking, wave patterns, and multi-phase sequence verification. In interviews, this problem assesses your ability to handle edge cases systematically (arrays too short, all ascending, all descending, plateau at peak) and your understanding of boundary conditions (peak must be internal, not at edges). The strict inequality requirement also teaches attention to detail - a common mistake is using `<=` instead of `<`, which allows invalid plateaus.

## Examples

**Example 1:**
- Input: `arr = [2,1]`
- Output: `false`

**Example 2:**
- Input: `arr = [3,5,5]`
- Output: `false`

**Example 3:**
- Input: `arr = [0,3,2,1]`
- Output: `true`

## Constraints

- 1 <= arr.length <= 10⁴
- 0 <= arr[i] <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Conceptual Foundation
- A mountain has exactly one peak - not at the start or end
- Values must strictly increase before the peak (no plateaus)
- Values must strictly decrease after the peak (no plateaus)
- What happens if the array never increases? Or never decreases?

### Tier 2: Step-by-Step Strategy
- Start from the left and walk up while values are strictly increasing
- Track where you stopped - this is your potential peak
- Check if you actually moved (peak can't be at index 0)
- From the peak, walk down while values are strictly decreasing
- Check if you reached the end of the array
- Verify the peak isn't at the last position either

### Tier 3: Implementation Details
- Use a pointer `i` starting at 0
- While `i < len(arr) - 1` and `arr[i] < arr[i+1]`, increment `i`
- Check: `i > 0` and `i < len(arr) - 1` (peak not at edges)
- While `i < len(arr) - 1` and `arr[i] > arr[i+1]`, increment `i`
- Return `true` if `i == len(arr) - 1`, otherwise `false`

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Single Pass (Two Pointers) | O(n) | O(1) | Optimal solution, visit each element once |
| Find Peak then Validate | O(n) | O(1) | Three passes but still linear |
| Recursive Validation | O(n) | O(n) | Call stack overhead, not recommended |

**Optimal Solution**: Single pass with two phases (climb up, climb down) achieves O(n) time with O(1) space.

## Common Mistakes

### Mistake 1: Allowing equal consecutive values
```python
# Wrong: using <= instead of <
i = 0
while i < len(arr) - 1 and arr[i] <= arr[i+1]:  # Allows plateaus!
    i += 1

# Correct: strict inequality
i = 0
while i < len(arr) - 1 and arr[i] < arr[i+1]:  # Strict increase only
    i += 1
```

### Mistake 2: Not checking if peak is at boundaries
```python
# Wrong: not validating peak position
i = 0
while i < len(arr) - 1 and arr[i] < arr[i+1]:
    i += 1
while i < len(arr) - 1 and arr[i] > arr[i+1]:
    i += 1
return i == len(arr) - 1  # Missing boundary check!

# Correct: ensure peak is internal
if i == 0 or i == len(arr) - 1:
    return False
# Then continue with descending phase
```

### Mistake 3: Off-by-one errors in loop conditions
```python
# Wrong: accessing beyond array bounds
while i < len(arr) and arr[i] < arr[i+1]:  # arr[i+1] can be out of bounds!
    i += 1

# Correct: ensure i+1 is valid
while i < len(arr) - 1 and arr[i] < arr[i+1]:
    i += 1
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Find peak element index | Easy | Return peak position instead of boolean |
| Count number of peaks | Medium | Allow multiple mountains, count peaks |
| Longest mountain subarray | Medium | Find longest valid mountain subsequence |
| Allow plateaus at peak | Easy | Use <= for peak area only |
| Minimum removals to make mountain | Medium | Dynamic programming to find elements to remove |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solved independently on first attempt
- [ ] Completed within 15 minutes
- [ ] Used single-pass two-pointer approach
- [ ] Correctly validated peak at internal position
- [ ] Handled edge cases (length < 3, all increasing, all decreasing)
- [ ] Wrote bug-free code on first submission
- [ ] Explained solution clearly to someone else
- [ ] Solved without hints after 1 day
- [ ] Solved without hints after 1 week
- [ ] Identified time and space complexity correctly

**Spaced Repetition Schedule**: Review on Day 1, Day 3, Day 7, Day 14, Day 30

**Strategy**: See [Two Pointers](../strategies/patterns/two-pointers.md)
