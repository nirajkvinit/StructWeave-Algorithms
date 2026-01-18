---
id: E129
old_id: I167
slug: largest-divisible-subset
title: Largest Divisible Subset
difficulty: easy
category: easy
topics: ["array", "dynamic-programming", "sorting"]
patterns: ["backtrack-combination", "dp"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["M300", "E128", "E001"]
prerequisites: ["dynamic-programming", "sorting", "divisibility"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Largest Divisible Subset

## Problem

Given an array `nums` of unique positive integers, find the largest subset where every pair of elements has a divisibility relationship. Specifically, for any two elements in your result (call them `answer[i]` and `answer[j]`), one must evenly divide the other. In mathematical terms, either `answer[i] % answer[j] == 0` or `answer[j] % answer[i] == 0` must be true.

For example, the subset `[1, 2, 4, 8]` is valid because 2 divides 1 (well, technically 2 is divisible by 1), 4 is divisible by 2, and 8 is divisible by 4. The subset `[2, 4, 5]` would be invalid because 4 and 5 have no divisibility relationship.

The key insight is that divisibility is transitive when numbers are sorted. If you sort the array and find that `c` is divisible by `b`, and `b` is divisible by `a`, then `c` is automatically divisible by `a`. This transitivity property transforms what seems like a complex subset problem into a dynamic programming challenge similar to finding the Longest Increasing Subsequence. If there are multiple valid subsets with the same maximum length, you can return any one of them.

## Why This Matters

This problem bridges number theory and dynamic programming, teaching you to recognize when mathematical properties can simplify algorithmic complexity. The divisibility subset pattern appears in scheduling problems (finding compatible time slots where durations divide evenly), resource allocation (distributing items in proportional quantities), and modular arithmetic systems used in cryptography. The technique of sorting first to enable transitivity is a powerful strategy you'll reuse in interval problems, dependency resolution, and graph algorithms. Understanding how to track not just optimal values but also reconstruct the actual solution (via parent pointers) is essential for many optimization problems in production systems.

## Examples

**Example 1:**
- Input: `nums = [1,2,3]`
- Output: `[1,2]`
- Explanation: Another valid answer would be [1,3].

**Example 2:**
- Input: `nums = [1,2,4,8]`
- Output: `[1,2,4,8]`

## Constraints

- 1 <= nums.length <= 1000
- 1 <= nums[i] <= 2 * 10⁹
- All the integers in nums are **unique**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Generate and Check All Subsets
Consider generating all possible subsets and checking each for the divisibility property.

**Key Steps:**
1. Generate all 2^n possible subsets
2. For each subset, check if all pairs satisfy divisibility
3. Track the largest valid subset

**When to use:** Only for understanding or very small inputs (n ≤ 15). Exponential time makes it impractical.

### Intermediate Approach - Dynamic Programming with Sorting
Think about this as similar to Longest Increasing Subsequence. If you sort first, what property emerges?

**Key Steps:**
1. Sort the array in ascending order
2. Use DP where dp[i] = length of largest divisible subset ending at i
3. Track parent pointers to reconstruct the subset
4. Key insight: if a % b == 0 and b % c == 0, then a % c == 0

**When to use:** This is the standard optimal solution - O(n²) time complexity.

### Advanced Approach - Optimized DP with Early Termination
Can you optimize the DP approach by pruning unnecessary checks?

**Key Steps:**
1. After sorting, leverage the transitivity property
2. For each element, only check elements it's divisible by
3. Use memoization and early exits
4. Build result efficiently using backtracking

**When to use:** When you want to squeeze out constant factor improvements on the DP solution.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force | O(2^n * n²) | O(n) | Generate all subsets; impractical |
| Dynamic Programming | O(n²) | O(n) | Optimal solution after sorting |
| DP with Optimization | O(n²) | O(n) | Same worst case, better average case |

## Common Mistakes

### Mistake 1: Not sorting the array first
```python
# Wrong - checking divisibility without sorting
def largestDivisibleSubset(nums):
    n = len(nums)
    dp = [1] * n  # Missing: nums.sort()
    for i in range(n):
        for j in range(i):
            if nums[i] % nums[j] == 0:
                dp[i] = max(dp[i], dp[j] + 1)
```

**Why it's wrong:** Without sorting, you can't rely on the transitivity property. For [4, 8, 2], you'd miss [2, 4, 8].

**Fix:** Always sort the array first. After sorting, if nums[i] is divisible by nums[j] where j < i, and nums[j] is in a valid subset, then nums[i] can extend that subset.

### Mistake 2: Not tracking the actual subset
```python
# Wrong - only tracking length, not the subset itself
def largestDivisibleSubset(nums):
    nums.sort()
    dp = [1] * len(nums)
    for i in range(len(nums)):
        for j in range(i):
            if nums[i] % nums[j] == 0:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)  # Returns length, not the subset!
```

**Why it's wrong:** The problem asks for the actual subset, not just its size.

**Fix:** Maintain a parent/predecessor array to track which element each position extends from, then backtrack to reconstruct the subset.

### Mistake 3: Incorrect divisibility check
```python
# Wrong - checking bidirectional divisibility
def largestDivisibleSubset(nums):
    nums.sort()
    for i in range(len(nums)):
        for j in range(i):
            # Wrong: checking both directions
            if nums[i] % nums[j] == 0 or nums[j] % nums[i] == 0:
                # This breaks the subset property
```

**Why it's wrong:** The subset requires that for ANY two elements, one must divide the other. After sorting, you only need to check if larger divides by smaller (nums[i] % nums[j] == 0).

**Fix:** Only check if nums[i] % nums[j] == 0 (larger divisible by smaller) after sorting.

## Variations

| Variation | Difficulty | Description | Key Difference |
|-----------|-----------|-------------|----------------|
| Count Divisible Subsets | Medium | Count all valid divisible subsets | Return count instead of subset |
| Largest GCD Subset | Medium | Subset where GCD of any two is > 1 | More complex divisibility rules |
| K-Divisible Subset | Hard | Find subset of size k with divisibility property | Additional constraint on size |
| Multiplicative Subset | Medium | Product of subset divisible by target | Different mathematical property |

## Practice Checklist

Track your progress and spaced repetition:

- [ ] Initial attempt (after reading problem)
- [ ] Reviewed approach hints
- [ ] Understood why sorting is necessary
- [ ] Implemented DP solution with parent tracking
- [ ] Successfully reconstructed the subset
- [ ] All test cases passing
- [ ] Reviewed common mistakes
- [ ] Revisit after 1 day
- [ ] Revisit after 3 days
- [ ] Revisit after 1 week
- [ ] Can explain transitivity property clearly

**Strategy Guide:** For pattern recognition and detailed techniques, see [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
