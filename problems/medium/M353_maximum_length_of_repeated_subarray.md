---
id: M353
old_id: A185
slug: maximum-length-of-repeated-subarray
title: Maximum Length of Repeated Subarray
difficulty: medium
category: medium
topics: ["array", "dynamic-programming", "binary-search", "rolling-hash"]
patterns: ["dp-2d", "string-matching"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E1143", "M583", "M072"]
prerequisites: ["dynamic-programming", "two-pointers"]
---
# Maximum Length of Repeated Subarray

## Problem

Given two integer arrays `nums1` and `nums2`, find the length of the longest contiguous subarray (consecutive sequence of elements) that appears in both arrays with identical values in the same order.

Think of this as finding the longest common "substring" but for arrays instead of strings. The key word is **contiguous**: the matching elements must appear consecutively in both arrays, though they can start at different positions. For example, if `nums1 = [1,2,3,2,1]` and `nums2 = [3,2,1,4,7]`, the subarray `[3,2,1]` appears in both (starting at index 2 in `nums1` and index 0 in `nums2`), giving us a length of 3.

This differs from the "longest common subsequence" problem, where elements don't need to be consecutive. Here, if there's even a single mismatch in the middle, the subarray breaks and you must start counting again. Edge cases to consider include arrays with no common elements (answer is 0), arrays that are completely identical (answer is their full length), and arrays with multiple overlapping matches at different positions.

The naive approach of checking every possible pair of subarrays would take O(n² × m²) time. You'll need to use dynamic programming to efficiently build up solutions to smaller subproblems. The insight is that if you know the longest common subarray ending at positions (i-1, j-1), you can easily compute the longest one ending at (i, j) based on whether those elements match.

## Why This Matters

This problem is foundational for understanding sequence alignment algorithms used in computational biology (DNA sequence matching), plagiarism detection systems, and file diff tools like Git. The dynamic programming pattern you learn here—tracking "longest ending here" rather than "longest overall"—is crucial for solving many optimization problems. It also teaches the important distinction between contiguous and non-contiguous matching, which has significant real-world implications for search engines, data deduplication, and pattern recognition systems.

## Examples

**Example 1:**
- Input: `nums1 = [1,2,3,2,1], nums2 = [3,2,1,4,7]`
- Output: `3`
- Explanation: The longest common contiguous subarray is [3,2,1].

**Example 2:**
- Input: `nums1 = [0,0,0,0,0], nums2 = [0,0,0,0,0]`
- Output: `5`
- Explanation: Both arrays are identical, so the entire sequence [0,0,0,0,0] is the longest common subarray.

## Constraints

- 1 <= nums1.length, nums2.length <= 1000
- 0 <= nums1[i], nums2[i] <= 100

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Brute Force to Understand the Problem</summary>

A brute force solution would check every possible subarray in nums1 against every possible subarray in nums2:
- For each starting position i in nums1 (n positions)
- For each starting position j in nums2 (m positions)
- Expand from (i, j) while elements match, tracking the maximum length

This gives O(n * m * min(n, m)) time complexity - too slow for the constraints, but helps us understand the structure.

Key observation: When we find a match at positions (i, j), we need to check if the match continues at (i+1, j+1). This suggests overlapping subproblems - a classic sign for dynamic programming.
</details>

<details>
<summary>Hint 2: Dynamic Programming Approach</summary>

Define `dp[i][j]` = length of the longest common subarray ending at `nums1[i-1]` and `nums2[j-1]`.

Recurrence relation:
- If `nums1[i-1] == nums2[j-1]`: `dp[i][j] = dp[i-1][j-1] + 1`
- Else: `dp[i][j] = 0` (subarray must be contiguous, so we reset)

Base case: `dp[0][j] = 0` and `dp[i][0] = 0` (no elements means no common subarray)

The answer is the maximum value in the entire dp table, not necessarily `dp[n][m]`.

Space optimization: Notice that `dp[i][j]` only depends on `dp[i-1][j-1]`, so we can use 1D array instead of 2D. Or even better, use two variables if we iterate diagonally.
</details>

<details>
<summary>Hint 3: Alternative Approaches</summary>

**Binary Search + Rolling Hash (Advanced):**
Binary search on the answer (length of common subarray from 1 to min(n, m)):
- For a given length `len`, use rolling hash to generate hashes of all subarrays of length `len` in both arrays
- Check if any hash appears in both sets
- If yes, try larger length; if no, try smaller length

Time: O((n + m) * log(min(n, m))), Space: O(n + m)

**Suffix Array (Advanced):**
Concatenate the arrays with a separator, build suffix array, then use LCP (longest common prefix) array to find the answer. This is overkill for this problem but useful to know.

For interview purposes, the DP solution is most appropriate.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force | O(n² * m²) | O(1) | Check all pairs of subarrays |
| DP (2D array) | O(n * m) | O(n * m) | Classic DP table |
| DP (1D array optimized) | O(n * m) | O(min(n, m)) | Space optimization |
| Binary Search + Rolling Hash | O((n+m) * log(min(n,m))) | O(n + m) | Advanced, constant-time hash comparison |

## Common Mistakes

**Mistake 1: Confusing with Longest Common Subsequence**
```python
# Wrong - this solves LCS (subsequence), not subarray
def findLength(nums1, nums2):
    n, m = len(nums1), len(nums2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if nums1[i-1] == nums2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                # Wrong: should be 0, not max(dp[i-1][j], dp[i][j-1])
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])

    return dp[n][m]  # Also wrong: should return max of entire table
```

**Mistake 2: Not resetting when elements don't match**
```python
# Wrong - doesn't reset to 0 when mismatch occurs
def findLength(nums1, nums2):
    n, m = len(nums1), len(nums2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    max_len = 0

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if nums1[i-1] == nums2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            # Missing else clause to set dp[i][j] = 0
            max_len = max(max_len, dp[i][j])

    return max_len
    # Works if dp initialized to 0, but conceptually incomplete
```

**Mistake 3: Returning wrong value**
```python
# Wrong - returns dp[n][m] instead of maximum
def findLength(nums1, nums2):
    n, m = len(nums1), len(nums2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if nums1[i-1] == nums2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = 0

    return dp[n][m]  # Wrong: longest subarray can end anywhere
    # Should return max(max(row) for row in dp)
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Longest Common Subsequence | Medium | Elements don't need to be contiguous |
| Minimum Window Substring | Hard | Find shortest substring containing all characters |
| Longest Repeating Substring | Medium | Find repeated subarray within single array |
| Maximum Length of Repeated Subarray (with K differences allowed) | Hard | Allow up to K mismatches |
| Find All Common Subarrays | Medium | Return all common subarrays, not just length |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Practiced again (1 day later)
- [ ] Practiced again (3 days later)
- [ ] Practiced again (1 week later)
- [ ] Can solve in under 25 minutes
- [ ] Can explain solution clearly
- [ ] Implemented DP solution correctly
- [ ] Optimized space to O(n) or O(m)
- [ ] Distinguished from LCS (subsequence) problem

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
