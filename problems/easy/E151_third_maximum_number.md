---
id: E151
old_id: I213
slug: third-maximum-number
title: Third Maximum Number
difficulty: easy
category: easy
topics: ["array", "sorting"]
patterns: ["linear-scan", "top-k"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E215", "M215", "E414"]
prerequisites: ["array-traversal", "comparison", "edge-case-handling"]
strategy_ref: ../strategies/patterns/top-k-elements.md
---
# Third Maximum Number

## Problem

Given an integer array, find and return the third distinct maximum value. By "distinct," we mean unique values where duplicates are counted only once. If the array contains fewer than three distinct values, return the overall maximum value instead.

The challenge is to identify distinct maximums efficiently without necessarily sorting the entire array. For example, in `[2, 2, 3, 1]`, the distinct values are 3, 2, and 1. The first maximum is 3, second maximum is 2, and third maximum is 1, so the answer is 1. The duplicate 2s count as a single distinct value.

An important edge case is when you have fewer than three distinct values. For instance, `[1, 2]` has only two distinct values, so instead of returning some undefined "third" value, you return the maximum (2). Another critical consideration is handling negative numbers properly. If you initialize tracking variables to zero and all array values are negative, your logic might incorrectly return zero instead of the actual third maximum.

You could sort the array and scan for the third distinct value, which takes O(n log n) time. However, a more efficient approach maintains three variables tracking the first, second, and third maximum values as you scan through the array once. This achieves O(n) time with O(1) space. The implementation requires careful handling of duplicates (skip values already tracked) and proper initialization (use negative infinity or null to distinguish unset values from actual zeros in the array).

## Why This Matters

Finding top-k elements is a fundamental pattern in algorithm design with applications throughout computer science. In data analytics, you frequently need top performers (top sales, highest traffic pages, most frequent queries). In competitive gaming, leaderboards track top players. In recommendation systems, you identify top-rated items. Stream processing systems maintain running statistics like top queries per minute. This problem introduces the selection problem, related to quickselect and heap-based algorithms used in priority queues, event scheduling, and resource allocation.

The pattern generalizes to finding the kth largest element, which appears in median finding (k = n/2), percentile calculations, and statistical analysis. The trade-off between sorting (simple but O(n log n)) versus tracking k variables (efficient but more code) teaches you to recognize when optimization matters. Interview questions favor this problem because it has multiple valid approaches with different complexity profiles, tests edge case handling (negatives, fewer than k elements, duplicates), and extends naturally to follow-up questions about finding kth element for arbitrary k or handling streaming data. Understanding top-k patterns prepares you for heap operations, priority-based systems, and order statistics.

## Examples

**Example 1:**
- Input: `nums = [3,2,1]`
- Output: `1`
- Explanation: When sorted by distinct values in descending order: 3 (largest), 2 (second largest), 1 (third largest)

**Example 2:**
- Input: `nums = [1,2]`
- Output: `2`
- Explanation: Only two distinct values exist (2 and 1), so we return the largest value which is 2

**Example 3:**
- Input: `nums = [2,2,3,1]`
- Output: `1`
- Explanation: The distinct values in descending order are 3, 2, and 1. Duplicates are treated as a single value, so the third distinct maximum is 1

## Constraints

- 1 <= nums.length <= 10⁴
- -2³¹ <= nums[i] <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Sort and Find Unique
Sort the array in descending order, then iterate to find the third distinct maximum. Keep track of how many distinct values you've seen. Skip duplicates by comparing with the previous element. If you find three distinct values, return the third; otherwise, return the largest.

**Key insight**: Sorting simplifies finding distinct maximums, but costs O(n log n) time.

### Intermediate Approach - Three Variable Tracking
Maintain three variables (first_max, second_max, third_max) initialized to negative infinity or None. In a single pass through the array, update these variables when you encounter a value larger than any of them. Skip duplicates by checking if the current value equals any of the three tracked values.

**Key insight**: Only three values need tracking, making this O(1) space and O(n) time.

### Advanced Approach - Set-Based with Edge Cases
Use a set to automatically handle duplicates and track up to three maximum values. For each number in the array, add it to the set. If the set size exceeds 3, remove the minimum element. After processing all numbers, return the minimum of the set if it has 3 elements, otherwise return the maximum.

**Key insight**: Set operations naturally handle both uniqueness and maintaining top k elements.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Sort + Scan | O(n log n) | O(1) or O(n) | Depends on sorting algorithm used |
| Three Variables | O(n) | O(1) | Single pass, constant extra space |
| Set (bounded k=3) | O(n) | O(1) | Set size capped at 3, effectively constant |
| Heap (k=3) | O(n log 3) = O(n) | O(1) | Min-heap of size 3 |

Linear time with constant space is optimal for this problem.

## Common Mistakes

### Mistake 1: Not Handling Duplicates
```python
# Wrong: Counting duplicates as distinct values
def thirdMax(nums):
    nums.sort(reverse=True)
    if len(nums) < 3:
        return nums[0]
    return nums[2]  # Doesn't skip duplicates
```

**Why it fails**: For `[2, 2, 3, 1]`, returns 3 instead of 1. Position 2 is a duplicate, not the third distinct value.

**Fix**: Track distinct values: compare each element with previous and only increment count when different.

### Mistake 2: Incorrect Initialization with Zero
```python
# Wrong: Initializing with 0
def thirdMax(nums):
    first = second = third = 0  # Problem if array has negatives
    for num in nums:
        if num > first:
            third, second, first = second, first, num
        # ... rest
    return third if third != 0 else first
```

**Why it fails**: If all numbers are negative (e.g., `[-1, -2, -3]`), the variables stay at 0, which is wrong.

**Fix**: Use `float('-inf')` or None for initialization, handle None separately in return.

### Mistake 3: Not Checking if Third Max Exists
```python
# Wrong: Always returning third variable
def thirdMax(nums):
    first = second = third = float('-inf')
    for num in nums:
        if num > first:
            third, second, first = second, first, num
        elif num > second and num != first:
            third, second = second, num
        elif num > third and num not in [first, second]:
            third = num
    return third  # Wrong if less than 3 distinct values
```

**Why it fails**: For `[1, 2]`, returns `float('-inf')` instead of maximum (2).

**Fix**: Check if third_max was actually updated: `return third if third != float('-inf') else first`.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Kth Maximum Number | Medium | Generalize to find kth distinct maximum for any k |
| Third Minimum Number | Easy | Find third distinct minimum instead |
| Maximum in Subarray | Medium | Find third max in each subarray of size k |
| Top K Frequent Elements | Medium | Find k most frequent elements instead of max values |
| Running Third Maximum | Medium | Maintain third max as stream of numbers arrives |

## Practice Checklist

Track your progress on this problem:

- [ ] **Day 0**: Solve using sort approach (20 min)
- [ ] **Day 1**: Review edge cases (< 3 distinct, duplicates, all negatives)
- [ ] **Day 3**: Implement with three-variable tracking (20 min)
- [ ] **Day 7**: Solve without looking at previous solution (15 min)
- [ ] **Day 14**: Implement set-based approach and compare (20 min)
- [ ] **Day 30**: Speed solve in under 12 minutes

**Strategy**: See [Top-K Elements](../strategies/patterns/top-k-elements.md)
