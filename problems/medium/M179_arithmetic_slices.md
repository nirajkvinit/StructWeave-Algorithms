---
id: M179
old_id: I212
slug: arithmetic-slices
title: Arithmetic Slices
difficulty: medium
category: medium
topics: ["array", "sliding-window", "dynamic-programming"]
patterns: ["sliding-window", "counting"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M413", "M446", "E643"]
prerequisites: ["sliding-window", "arithmetic-progression"]
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Arithmetic Slices

## Problem

An arithmetic sequence is a series of numbers where the difference between each consecutive pair of elements is constant. To qualify as an arithmetic sequence for this problem, you need at least three elements. For example, `[1, 3, 5, 7, 9]` is arithmetic with a common difference of 2, `[7, 7, 7, 7]` is arithmetic with a difference of 0 (constant values), and `[3, -1, -5, -9]` is arithmetic with a difference of -4. Your task is to count how many contiguous subarrays in a given array `nums` form valid arithmetic sequences.

Let's clarify what "contiguous subarray" means: it's a slice of consecutive elements from the original array, maintaining their order. For instance, if `nums = [1, 2, 3, 4]`, then `[1, 2, 3]`, `[2, 3, 4]`, and `[1, 2, 3, 4]` are all contiguous subarrays, but `[1, 2, 4]` is not (it skips the element 3). Now let's count the arithmetic subarrays: `[1, 2, 3]` has a constant difference of 1, `[2, 3, 4]` also has a difference of 1, and `[1, 2, 3, 4]` maintains that same difference throughout. So the answer is 3.

Here's a subtle point that trips people up: when you have a long arithmetic sequence, it contributes multiple subarrays. Consider `[1, 2, 3, 4, 5]` with a constant difference of 1. How many arithmetic subarrays does this contain? You have all subarrays of length 3: `[1,2,3]`, `[2,3,4]`, `[3,4,5]` (that's 3). Then subarrays of length 4: `[1,2,3,4]`, `[2,3,4,5]` (that's 2 more). Finally, the full array of length 5: `[1,2,3,4,5]` (that's 1 more). Total: 3 + 2 + 1 = 6 arithmetic subarrays. Notice the pattern: for an arithmetic sequence of length `n` (where `n ≥ 3`), the number of arithmetic subarrays is `(n-2) + (n-3) + ... + 1`, which equals `(n-2)(n-1)/2`. Edge case: if `nums = [1]` (a single element), there are no arithmetic subarrays because you need at least 3 elements, so the answer is 0. The array can have up to 5,000 elements, and values range from -1,000 to 1,000.

## Why This Matters

Recognizing patterns in sequences is fundamental to time series analysis, signal processing, and financial modeling. Stock market analysts look for trends by identifying periods where prices change at a consistent rate. Sensor data in IoT devices is analyzed for linear patterns that might indicate steady-state operation or predictable drift. In music theory and audio processing, detecting arithmetic progressions in frequencies helps identify harmonic relationships and musical scales. This problem teaches an important optimization technique: instead of checking every possible subarray (which would be O(n²) or O(n³)), you can count contributions dynamically as you extend arithmetic sequences. By tracking how many consecutive elements maintain the same difference, you can calculate the incremental contribution of each new element in constant time. This "incremental counting" pattern appears in many counting problems where you need to avoid redundant enumeration. It's also a great introduction to dynamic programming thinking: the count at position `i` depends on whether the pattern continues from position `i-1`, demonstrating how local decisions propagate to build a global answer. Understanding this technique helps with more complex problems involving substring/subarray counting with various constraints.

## Examples

**Example 1:**
- Input: `nums = [1,2,3,4]`
- Output: `3`
- Explanation: There are three valid arithmetic subarrays: [1, 2, 3] with difference 1, [2, 3, 4] with difference 1, and [1, 2, 3, 4] with difference 1

**Example 2:**
- Input: `nums = [1]`
- Output: `0`
- Explanation: A single element cannot form an arithmetic sequence since at least three elements are required

## Constraints

- 1 <= nums.length <= 5000
- -1000 <= nums[i] <= 1000

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Count consecutive arithmetic subsequences</summary>

Instead of checking all possible subarrays, think about extending arithmetic sequences. When you find three consecutive elements forming an arithmetic sequence, how many additional elements can you add while maintaining the same difference? Each extension creates multiple new subarrays.
</details>

<details>
<summary>🎯 Hint 2: Track the length of current arithmetic sequence</summary>

Keep track of how long the current arithmetic sequence is. If you have an arithmetic sequence of length k (where k >= 3), it contains (k-2) + (k-3) + ... + 1 arithmetic subarrays. For example, [1,2,3,4] has length 4, contributing 1+2 = 3 arithmetic subarrays.
</details>

<details>
<summary>📝 Hint 3: Dynamic programming or iterative approach</summary>

```
1. Initialize: count = 0, current_length = 0
2. For i from 2 to n-1:
   - If nums[i] - nums[i-1] == nums[i-1] - nums[i-2]:
     current_length += 1
     count += current_length
   - Else:
     current_length = 0
3. Return count

Key insight: Each new element extending the sequence
adds current_length new arithmetic subarrays
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Dynamic Programming | O(n) | O(1) | Single pass with counter |
| Brute Force | O(n³) | O(1) | Check all subarrays of all lengths |
| DP with Array | O(n) | O(n) | Store DP state at each position |

## Common Mistakes

### Mistake 1: Overcounting subarrays

```python
# Wrong: Counting each position multiple times
def count_arithmetic_wrong(nums):
    count = 0
    for i in range(len(nums) - 2):
        if nums[i+1] - nums[i] == nums[i+2] - nums[i+1]:
            count += 1  # Only counts slices of length 3!
    return count
```

```python
# Correct: Track cumulative contribution
def count_arithmetic_correct(nums):
    if len(nums) < 3:
        return 0

    count = 0
    current = 0

    for i in range(2, len(nums)):
        if nums[i] - nums[i-1] == nums[i-1] - nums[i-2]:
            current += 1
            count += current
        else:
            current = 0

    return count
```

### Mistake 2: Not resetting the counter when sequence breaks

```python
# Wrong: Continuing to count after sequence breaks
def count_arithmetic_wrong(nums):
    count = 0
    length = 0
    for i in range(2, len(nums)):
        if nums[i] - nums[i-1] == nums[i-1] - nums[i-2]:
            length += 1
            count += length
        # Missing: else: length = 0
    return count
```

```python
# Correct: Reset when arithmetic property breaks
def count_arithmetic_correct(nums):
    count = 0
    length = 0
    for i in range(2, len(nums)):
        if nums[i] - nums[i-1] == nums[i-1] - nums[i-2]:
            length += 1
            count += length
        else:
            length = 0  # Critical: reset on break
    return count
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Arithmetic Slices II (Subsequence) | Hard | Count arithmetic subsequences (not necessarily contiguous) - M446 |
| Longest Arithmetic Subsequence | Medium | Find the longest arithmetic subsequence |
| Arithmetic Progression Query | Medium | Handle range queries for arithmetic progressions |
| Geometric Slices | Medium | Count geometric progressions instead of arithmetic |

## Practice Checklist

- [ ] Day 1: Solve using the iterative counting approach (20-30 min)
- [ ] Day 2: Implement using dynamic programming with explicit DP array (25 min)
- [ ] Day 7: Re-solve with O(1) space optimization (15 min)
- [ ] Day 14: Solve the subsequence variation (M446) (30 min)
- [ ] Day 30: Explain why each extension adds current_length subarrays (10 min)

**Strategy**: See [Array Pattern](../strategies/patterns/sliding-window.md)
