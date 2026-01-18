---
id: M198
old_id: I245
slug: arithmetic-slices-ii-subsequence
title: Arithmetic Slices II - Subsequence
difficulty: medium
category: medium
topics: ["array", "sliding-window"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/patterns/sliding-window.md
frequency: low
related_problems: ["E244", "M197", "M096"]
prerequisites: ["dynamic-programming", "hash-table", "arithmetic-sequences"]
---
# Arithmetic Slices II - Subsequence

## Problem

You are provided with an integer array `nums`, and your task is to calculate how many arithmetic subsequences can be formed from this array. An arithmetic sequence is one where the difference between consecutive elements remains constant throughout. For example, `[1, 3, 5, 7, 9]` is arithmetic with a common difference of 2, and `[7, 7, 7, 7]` is arithmetic with a difference of 0.

The critical requirement is that sequences must contain at least three elements. So while `[2, 4]` has a consistent difference, it doesn't count because it's too short. A subsequence is formed by selecting elements from the array while maintaining their original order, but they don't need to be consecutive. For instance, from the array `[1, 2, 1, 2, 4, 1, 5, 10]`, you can extract the subsequence `[2, 5, 10]` by picking elements at indices 1, 6, and 7.

Here's what makes this challenging: unlike subarrays (which must be contiguous), subsequences allow you to skip elements, creating exponentially more possibilities. You need to efficiently count all valid arithmetic subsequences without actually generating them all, which would be too slow. Edge cases include arrays with all identical elements (which form many arithmetic sequences with difference 0), arrays with negative numbers, and arrays where multiple different arithmetic sequences overlap.

## Why This Matters

This problem models pattern recognition in time series data, which is fundamental to algorithmic trading, fraud detection, and sensor data analysis. Financial algorithms scan stock price movements looking for arithmetic patterns (prices increasing by roughly constant amounts) to predict trends and generate trading signals. Network security systems analyze packet arrival times and sizes to detect arithmetic patterns that might indicate coordinated attacks or data exfiltration. The dynamic programming approach you'll develop tracking partial sequences and extending them is the same technique used in bioinformatics to find conserved motifs in DNA sequences and in music analysis software that identifies rhythmic patterns across non-consecutive notes. Manufacturing quality control uses this to detect systematic drift in measurements over time (deviations forming arithmetic patterns). The hash map optimization for tracking differences is applicable to any counting problem where you need to aggregate by category without sorting, appearing in database query optimization, log analysis, and metrics aggregation systems.

## Examples

**Example 1:**
- Input: `nums = [2,4,6,8,10]`
- Output: `7`
- Explanation: The arithmetic subsequences are:
[2,4,6]
[4,6,8]
[6,8,10]
[2,4,6,8]
[4,6,8,10]
[2,4,6,8,10]
[2,6,10]

**Example 2:**
- Input: `nums = [7,7,7,7,7]`
- Output: `16`
- Explanation: Since all elements are identical (difference of 0), every subsequence with 3 or more elements is arithmetic.

## Constraints

- 1  <= nums.length <= 1000
- -2³¹ <= nums[i] <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding Subsequences vs Subarrays</summary>

Unlike contiguous subarrays, subsequences allow you to skip elements while maintaining order. For each pair of elements, think about how many valid arithmetic sequences end at those two positions. The key insight is that if you know elements i and j form an arithmetic pair with difference d, you can extend any existing sequence ending at i with the same difference d by adding j.

</details>

<details>
<summary>🎯 Hint 2: Dynamic Programming State Design</summary>

Use a DP approach where dp[i][diff] represents the count of arithmetic subsequences of length >= 2 ending at index i with difference diff. For each position j > i, calculate the difference diff = nums[j] - nums[i]. If there are k sequences ending at i with this difference, you can extend all of them by adding nums[j], creating k new sequences of length >= 3.

</details>

<details>
<summary>📝 Hint 3: Implementation Strategy</summary>

```
For each index j from 0 to n-1:
    Create a hash map for position j
    For each previous index i from 0 to j-1:
        diff = nums[j] - nums[i]
        count_at_i = dp[i][diff] or 0

        Add count_at_i to result (these are valid sequences >= 3)
        dp[j][diff] += count_at_i + 1

Return total result
```

The "+1" accounts for the new 2-element sequence [nums[i], nums[j]].

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Generate All) | O(2^n * n) | O(1) | Generate all subsequences, check each |
| Dynamic Programming | O(n²) | O(n²) | Hash map for each position |
| Optimized DP | O(n²) | O(n²) | Same, but practical optimizations |

**Recommended approach:** Dynamic Programming with hash maps (O(n²) time, O(n²) space)

## Common Mistakes

### Mistake 1: Counting 2-element sequences
**Wrong:**
```python
# Counting pairs as valid arithmetic sequences
def countArithmeticSlices(nums):
    count = 0
    for i in range(len(nums)):
        for j in range(i+1, len(nums)):
            count += 1  # Wrong: needs at least 3 elements
    return count
```

**Correct:**
```python
def countArithmeticSlices(nums):
    n = len(nums)
    result = 0
    dp = [dict() for _ in range(n)]

    for j in range(n):
        for i in range(j):
            diff = nums[j] - nums[i]
            count_at_i = dp[i].get(diff, 0)

            result += count_at_i  # Only count sequences >= 3
            dp[j][diff] = dp[j].get(diff, 0) + count_at_i + 1

    return result
```

### Mistake 2: Not handling duplicates correctly
**Wrong:**
```python
# Assuming all elements are unique
def countArithmeticSlices(nums):
    if len(set(nums)) != len(nums):
        return 0  # Wrong: duplicates can form valid sequences
```

**Correct:**
```python
# Duplicates with diff=0 form valid sequences
# Example: [7,7,7,7,7] has 16 valid subsequences
# The DP approach handles this naturally
```

### Mistake 3: Integer overflow with differences
**Wrong:**
```python
# Not handling large value differences
diff = nums[j] - nums[i]  # Might overflow in some languages
```

**Correct:**
```python
# In Python, integers don't overflow
# In C++/Java, use long/long long for differences
diff = long(nums[j]) - long(nums[i])  # Safe from overflow
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Arithmetic Slices (contiguous) | Easy | Only count contiguous subarrays |
| Longest Arithmetic Subsequence | Medium | Find maximum length instead of count |
| Arithmetic Slices with target difference | Medium | Count sequences with specific difference |
| K-length Arithmetic Subsequence | Hard | Count sequences of exact length k |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Reviewed DP state design
- [ ] Implemented without hints
- [ ] Handled edge cases (all same, 2 elements, negatives)
- [ ] Optimized space if possible
- [ ] Tested with custom cases
- [ ] Reviewed after 1 day
- [ ] Reviewed after 1 week
- [ ] Could explain solution to others
- [ ] Comfortable with variations

**Strategy**: See [Array Pattern](../strategies/patterns/sliding-window.md)
