---
id: M137
old_id: I123
slug: wiggle-sort-ii
title: Wiggle Sort II
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["E180", "M075", "M215"]
prerequisites: ["sorting", "quickselect", "array-manipulation", "median"]
---
# Wiggle Sort II

## Problem

You have an integer array `nums` that you need to rearrange into a specific "wiggle" pattern. In this pattern, each element alternates between being smaller and larger than its neighbors, creating a wave-like sequence: `nums[0] < nums[1] > nums[2] < nums[3] > nums[4] < nums[5]...` The pattern starts with the first element being strictly less than the second element, then the second strictly greater than the third, and so on.

Let's clarify with an example. If you start with `[1,5,1,1,6,4]`, one valid wiggle arrangement would be `[1,6,1,5,1,4]`: the value 1 is less than 6, then 6 is greater than 1, then 1 is less than 5, then 5 is greater than 1, then 1 is less than 4. Notice that we're using strict inequalities (< and >), not less-than-or-equal. This becomes tricky when the array contains duplicate values. You can't just sort and alternate because if you have many duplicates, they might end up adjacent to each other, violating the strict inequality requirement. The naive approach of sorting and simple interleaving fails on arrays like `[1,1,2,2,3,3]` where duplicates would become neighbors. You need a strategy to maximize separation between equal values. The problem guarantees a valid solution always exists for any input, and there might be multiple correct answers. Your algorithm should efficiently produce any one valid wiggle arrangement.

## Why This Matters

Wiggle sort teaches you advanced array manipulation techniques that appear in many real-world scenarios. Signal processing uses similar rearrangement patterns to minimize consecutive similar values and reduce signal artifacts. Load balancing systems alternate between high and low workloads to prevent resource spikes. Data visualization libraries space out similar data points to create clearer charts. The algorithmic techniques here, particularly using quickselect to find the median in linear time and virtual indexing to avoid copying arrays, are broadly applicable optimization patterns. Quickselect (selecting the kth smallest element without full sorting) is crucial for percentile calculations in analytics systems and for optimization algorithms that need approximate middle values. The virtual indexing technique, where you map logical positions to physical positions without moving data, appears in cache-oblivious algorithms and memory-efficient data structures. This problem also teaches you to handle edge cases systematically: dealing with duplicates, handling odd versus even length arrays, and maintaining strict inequalities rather than allowing equality are all skills that transfer to robust software engineering.

## Examples

**Example 1:**
- Input: `nums = [1,5,1,1,6,4]`
- Output: `[1,6,1,5,1,4]`
- Explanation: Another valid arrangement would be [1,4,1,5,1,6]

**Example 2:**
- Input: `nums = [1,3,2,2,3,1]`
- Output: `[2,3,1,3,1,2]`

## Constraints

- Array length is between 1 and 5 * 10⁴
- Each element value is between 0 and 5000
- A valid wiggle arrangement is guaranteed to exist

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Sorting and Interleaving</summary>

The simplest approach is to sort the array, then interleave elements from the two halves. Split sorted array into smaller and larger halves, then place them alternately. However, this fails when there are many duplicates. To handle duplicates, reverse the halves before interleaving to maximize separation.
</details>

<details>
<summary>🎯 Hint 2: Median and Partitioning</summary>

Find the median using quickselect (O(n) average). Partition array around median: all elements < median on left, all > median on right. Then use virtual indexing to place elements: smaller elements at even indices (from right to left), larger elements at odd indices (from right to left). This ensures duplicates are maximally separated.
</details>

<details>
<summary>📝 Hint 3: Three-Way Partitioning with Index Mapping</summary>

Advanced O(n) time, O(1) space solution:
1. Find median using quickselect
2. Use virtual indexing: map logical index i to physical index (1 + 2*i) % (n|1)
   - This creates pattern: odd indices first, then even indices
3. Three-way partition around median using mapped indices
4. Elements < median go to end, > median go to start, = median in middle

This ensures perfect wiggle property with optimal complexity.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Sort + Naive Interleave | O(n log n) | O(n) | Fails with duplicates |
| **Sort + Reverse Halves** | **O(n log n)** | **O(n)** | **Works with duplicates** |
| Median + Virtual Indexing | O(n) | O(1) | Most optimal, complex to implement |
| Quickselect + Partition | O(n) avg | O(1) | Advanced technique |

## Common Mistakes

### Mistake 1: Simple Interleaving Without Handling Duplicates

```python
# WRONG: Fails when array has many duplicates
def wiggleSort(nums):
    nums.sort()
    n = len(nums)
    mid = n // 2

    # Simple interleaving fails: [1,1,2,2,3,3] → [1,2,1,2,3,3] (invalid!)
    result = []
    for i in range(mid):
        result.append(nums[i])
        result.append(nums[mid + i])

    nums[:] = result
```

```python
# CORRECT: Reverse halves before interleaving
def wiggleSort(nums):
    nums.sort()
    n = len(nums)
    mid = (n + 1) // 2

    # Split and reverse both halves
    small = nums[:mid][::-1]
    large = nums[mid:][::-1]

    # Interleave: small[0], large[0], small[1], large[1], ...
    result = []
    for i in range(len(large)):
        result.append(small[i])
        result.append(large[i])

    if len(small) > len(large):
        result.append(small[-1])

    nums[:] = result
```

### Mistake 2: Not Handling Odd-Length Arrays Correctly

```python
# WRONG: Assumes even length array
def wiggleSort(nums):
    nums.sort()
    mid = len(nums) // 2

    small = nums[:mid][::-1]
    large = nums[mid:][::-1]

    # Crashes or gives wrong result for odd length!
    for i in range(mid):
        nums[2*i] = small[i]
        nums[2*i + 1] = large[i]
```

```python
# CORRECT: Handle both even and odd lengths
def wiggleSort(nums):
    nums.sort()
    n = len(nums)
    mid = (n + 1) // 2  # Ceiling division

    small = nums[:mid][::-1]
    large = nums[mid:][::-1]

    # Interleave with proper indexing
    for i in range(len(large)):
        nums[2*i] = small[i]
        nums[2*i + 1] = large[i]

    # Handle odd length: one extra element in small
    if len(small) > len(large):
        nums[-1] = small[-1]
```

### Mistake 3: In-Place Modification Without Copy

```python
# WRONG: Modifying array while reading from it
def wiggleSort(nums):
    nums.sort()
    n = len(nums)
    mid = (n + 1) // 2

    j, k = mid - 1, n - 1

    for i in range(n):
        if i % 2 == 0:
            nums[i] = nums[j]  # Overwriting values we need later!
            j -= 1
        else:
            nums[i] = nums[k]
            k -= 1
```

```python
# CORRECT: Use temporary array or proper indexing
def wiggleSort(nums):
    arr = sorted(nums)
    n = len(nums)
    mid = (n + 1) // 2

    # Read from sorted copy, write to original
    j, k = mid - 1, n - 1
    for i in range(n):
        if i % 2 == 0:
            nums[i] = arr[j]
            j -= 1
        else:
            nums[i] = arr[k]
            k -= 1
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| Wiggle Sort I | Adjacent pairs satisfy ≤ or ≥ (not strict) | Simpler, O(n) one-pass solution |
| K-Wiggle Sort | Pattern repeats every k elements | Generalize interleaving pattern |
| Descending Wiggle | Start with nums[0] > nums[1] < nums[2] | Reverse the pattern |
| Maximum Gap Wiggle | Maximize differences between peaks/valleys | Requires different partitioning |
| Wiggle with Duplicates | Minimize duplicate neighbors | Similar to current problem |
| Circular Wiggle | First and last elements also satisfy wiggle | Additional constraint on endpoints |

## Practice Checklist

- [ ] Day 1: Implement sort + reverse halves solution
- [ ] Day 2: Test with duplicate-heavy arrays
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement O(n) median + virtual indexing
- [ ] Day 14: Speed test - solve in 20 minutes
- [ ] Day 30: Compare all approaches' performance

**Strategy**: See [Array Patterns](../strategies/patterns/sorting.md)
