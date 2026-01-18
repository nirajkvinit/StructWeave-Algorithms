---
id: M126
old_id: I099
slug: longest-increasing-subsequence
title: Longest Increasing Subsequence
difficulty: medium
category: medium
topics: ["array", "dynamic-programming", "binary-search"]
patterns: ["dp-1d", "binary-search"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M118", "M127", "E258"]
prerequisites: ["dynamic-programming", "binary-search", "subsequence"]
---
# Longest Increasing Subsequence

## Problem

You're given an integer array `nums` (like [10,9,2,5,3,7,101,18]), and your task is to find the length of the longest increasing subsequence it contains. A subsequence is a sequence derived from the array by selecting some elements (possibly none) while maintaining their relative order from the original array - crucially, the elements don't need to be contiguous or adjacent. For example, [2,5,7,101] is a valid subsequence of the array above because these elements appear in this order in the original, even though they're not next to each other.

The "increasing" requirement means each element in your subsequence must be strictly greater than (not equal to) the previous one. So if you pick the element 5, the next element you pick must be greater than 5. In the example [10,9,2,5,3,7,101,18], one valid longest increasing subsequence is [2,3,7,101], which has length 4. Another valid one would be [2,5,7,101], also length 4. Notice that [2,3,7,18] is also valid - there can be multiple subsequences of the same maximum length. You just need to return the length, not the actual subsequence itself.

An important edge case is an array with all identical elements like [7,7,7,7,7], which has a longest increasing subsequence of length 1 (just picking any single element). Another edge case is a strictly decreasing array like [5,4,3,2,1], which also has a maximum length of 1. Empty arrays or single-element arrays have well-defined answers too. The challenge is finding this length efficiently - the naive approach of checking all possible subsequences would be exponentially slow.

## Why This Matters

This problem models sequence optimization scenarios that appear frequently in data analysis, version control, and scheduling systems. Stock trading algorithms analyze price sequences to identify sustained upward trends for optimal buy-hold periods. Version control systems like Git identify the longest common subsequences between file versions to minimize diff sizes and understand code evolution. Bioinformatics applications find longest increasing subsequences in DNA sequence analysis to detect evolutionary patterns and gene mutations. Scheduling systems optimize task ordering by finding the longest chain of dependent tasks that must execute sequentially. Search engines rank results by finding the longest increasing subsequence of relevance scores when merging results from multiple sources. The problem has two classic solutions: a dynamic programming approach in O(n²) time that's intuitive but slower, and a clever binary search approach in O(n log n) time using patience sorting that maintains the smallest possible tail element for each subsequence length, enabling efficient extension.

## Examples

**Example 1:**
- Input: `nums = [10,9,2,5,3,7,101,18]`
- Output: `4`
- Explanation: One valid longest subsequence is [2,3,7,101] with length 4.

**Example 2:**
- Input: `nums = [0,1,0,3,2,3]`
- Output: `4`

**Example 3:**
- Input: `nums = [7,7,7,7,7,7,7]`
- Output: `1`

## Constraints

- 1 <= nums.length <= 2500
- -10⁴ <= nums[i] <= 10⁴

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

Think about building the longest increasing subsequence incrementally. For each number, you can either extend an existing subsequence or start a new one. The key insight is that at each position, you need to know the length of the longest subsequence ending at that position.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Two main approaches: (1) Dynamic Programming where `dp[i]` = length of longest increasing subsequence ending at index i. For each i, check all j < i where nums[j] < nums[i]. (2) Binary Search with patience sorting - maintain an array of smallest tail elements for all increasing subsequences of each length, use binary search to find where current element fits.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**DP Approach O(n²):**
```
1. Create dp array where dp[i] = LIS length ending at i
2. Initialize all dp[i] = 1 (each element is a subsequence)

3. For i from 1 to n-1:
   - For j from 0 to i-1:
     - If nums[j] < nums[i]:
       - dp[i] = max(dp[i], dp[j] + 1)

4. Return max(dp)
```

**Binary Search Approach O(n log n):**
```
1. Create tails array (stores smallest tail for each length)
2. Initialize length = 0

3. For each num in nums:
   - Binary search in tails[0:length] for position
   - If num > all elements in tails:
     - Append to tails, length += 1
   - Else:
     - Replace first element >= num with num

4. Return length
```

Key insight for binary search: We want smallest possible tail for each length to maximize future extensions.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Recursion | O(2^n) | O(n) | Try include/exclude each element |
| **DP Bottom-Up** | **O(n²)** | **O(n)** | Classic DP solution |
| DP + Binary Search | O(n log n) | O(n) | Optimal time complexity |
| Patience Sorting | O(n log n) | O(n) | Same as binary search approach |

## Common Mistakes

### Mistake 1: Confusing subsequence with subarray

**Wrong:**
```python
def lengthOfLIS(nums):
    # Wrong: looks for contiguous increasing subarray
    max_len = 1
    current_len = 1

    for i in range(1, len(nums)):
        if nums[i] > nums[i-1]:
            current_len += 1
            max_len = max(max_len, current_len)
        else:
            current_len = 1

    return max_len
# Fails for [10,9,2,5,3,7] -> returns 2, should return 3 ([2,3,7])
```

**Correct:**
```python
def lengthOfLIS(nums):
    if not nums:
        return 0

    dp = [1] * len(nums)

    for i in range(1, len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)

    return max(dp)
```

### Mistake 2: Not handling non-strictly increasing (allowing duplicates)

**Wrong:**
```python
def lengthOfLIS(nums):
    dp = [1] * len(nums)

    for i in range(1, len(nums)):
        for j in range(i):
            # Wrong: allows equal values (should be strictly increasing)
            if nums[j] <= nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)

    return max(dp)
# For [7,7,7,7] -> returns 4, should return 1
```

**Correct:**
```python
def lengthOfLIS(nums):
    dp = [1] * len(nums)

    for i in range(1, len(nums)):
        for j in range(i):
            # Strictly increasing: use <, not <=
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)

    return max(dp)
```

### Mistake 3: Incorrect binary search implementation

**Wrong:**
```python
def lengthOfLIS(nums):
    tails = []

    for num in nums:
        # Wrong: uses Python's bisect which doesn't handle our case correctly
        idx = bisect.bisect_left(tails, num)
        if idx == len(tails):
            tails.append(num)
        else:
            tails[idx] = num  # Should be bisect_left for first >= num

    return len(tails)
# This actually works, but the logic is unclear
```

**Correct:**
```python
import bisect

def lengthOfLIS(nums):
    tails = []

    for num in nums:
        # Find leftmost position where num can be placed
        idx = bisect.bisect_left(tails, num)

        if idx == len(tails):
            tails.append(num)
        else:
            tails[idx] = num  # Replace to keep smallest tail

    return len(tails)

# Or with manual binary search for clarity:
def lengthOfLIS(nums):
    tails = []

    for num in nums:
        left, right = 0, len(tails)
        while left < right:
            mid = (left + right) // 2
            if tails[mid] < num:
                left = mid + 1
            else:
                right = mid

        if left == len(tails):
            tails.append(num)
        else:
            tails[left] = num

    return len(tails)
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Print LIS | Return the actual subsequence, not just length | Medium |
| Number of LIS | Count how many LIS exist | Medium |
| Longest Decreasing Subsequence | Find longest strictly decreasing subsequence | Easy |
| Russian Doll Envelopes | 2D version with width and height constraints | Hard |
| Maximum Length of Pair Chain | Similar concept with intervals | Medium |

## Practice Checklist

- [ ] Solve using O(n²) DP approach
- [ ] Solve using O(n log n) binary search approach
- [ ] Handle edge cases (empty array, all same values, sorted array)
- [ ] Reconstruct the actual LIS, not just length
- [ ] **Day 3**: Re-solve without looking at solution
- [ ] **Week 1**: Solve Number of LIS variation
- [ ] **Week 2**: Explain both approaches to someone
- [ ] **Month 1**: Solve Russian Doll Envelopes

**Strategy**: See [Dynamic Programming Patterns](../strategies/patterns/dynamic-programming.md)
