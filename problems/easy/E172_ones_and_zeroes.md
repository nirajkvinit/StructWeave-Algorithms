---
id: E172
old_id: I273
slug: ones-and-zeroes
title: Ones and Zeroes
difficulty: easy
category: easy
topics: ["array", "dynamic-programming", "string"]
patterns: ["backtrack-combination", "knapsack", "2d-dp"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E416", "E494", "E518"]
prerequisites: ["dynamic-programming", "knapsack-problem", "subset-selection"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Ones and Zeroes

## Problem

You're given an array of binary strings (strings containing only '0' and '1' characters) and two budget constraints: m zeros and n ones. Your goal is to select the maximum number of strings from the array such that the total count of zeros across all selected strings doesn't exceed m, and the total count of ones doesn't exceed n.

Think of this as a resource allocation problem where each string "costs" a certain number of zeros and ones to include. For example, the string "10011" costs 3 zeros and 2 ones. You want to maximize how many strings you can afford given your budgets. Note that once you select a string, you cannot select it again - each string can be used at most once.

The challenge here is managing two constraints simultaneously. Unlike simpler problems where you might just worry about total size or weight, here you need to track two separate resource limits. This makes it a 2-dimensional variation of the classic knapsack problem, where traditionally you'd optimize for one constraint.

## Why This Matters

This problem introduces you to multi-dimensional dynamic programming through the lens of the famous 0/1 knapsack problem. The knapsack pattern appears frequently in resource allocation scenarios: optimizing budget across multiple departments, selecting projects with time and money constraints, or choosing features to implement given development resources and deadlines. Understanding how to extend classic DP patterns from 1D to 2D constraints is a fundamental skill for tackling complex optimization problems. This problem is particularly valuable for interviews at companies focusing on resource optimization, scheduling systems, or constraint satisfaction problems.

## Examples

**Example 1:**
- Input: `strs = ["10","0001","111001","1","0"], m = 5, n = 3`
- Output: `4`
- Explanation: The maximum subset is {"10", "0001", "1", "0"} with 5 zeros and 3 ones, giving size 4.
Smaller valid subsets exist like {"0001", "1"} and {"10", "1", "0"}.
{"111001"} cannot be included as it alone has 4 ones, exceeding the limit of 3.

**Example 2:**
- Input: `strs = ["10","0","1"], m = 1, n = 1`
- Output: `2`
- Explanation: The maximum subset is {"0", "1"}, which has size 2.

## Constraints

- 1 <= strs.length <= 600
- 1 <= strs[i].length <= 100
- strs[i] consists only of digits '0' and '1'.
- 1 <= m, n <= 100

## Think About

1. What makes this problem challenging?
   - Managing two constraints simultaneously (zeros and ones)
   - Finding the optimal subset among exponentially many possibilities
   - Recognizing this as a variant of the 0/1 knapsack problem
   - Balancing between maximizing count and staying within limits

2. Can you identify subproblems?
   - For each string, decide whether to include it or not
   - Track remaining capacity for both zeros and ones
   - Count zeros and ones in each binary string
   - Find maximum subset size given constraints

3. What invariants must be maintained?
   - Total zeros used cannot exceed m
   - Total ones used cannot exceed n
   - Each string can be used at most once
   - Goal is to maximize the count of selected strings

4. Is there a mathematical relationship to exploit?
   - This is a 2D knapsack problem with two weight constraints
   - DP state: dp[i][j] = max strings using at most i zeros and j ones
   - Recurrence: dp[i][j] = max(dp[i][j], 1 + dp[i-zeros][j-ones])

## Approach Hints

### Hint 1: Brute Force - Try All Subsets
Generate all possible subsets of the string array. For each subset, count the total zeros and ones. If both are within limits (zeros <= m, ones <= n), update the maximum subset size.

**Key insight**: There are 2^n possible subsets to check.

**Limitations**: Time complexity O(2^n * L) where n is number of strings and L is average string length. Exponential and impractical for n > 20.

### Hint 2: Recursive with Memoization
For each string, recursively decide to include or exclude it. Track remaining capacity for zeros and ones. Memoize based on current index and remaining capacities.

**Key insight**: Many subproblems overlap and can be cached.

**How to implement**:
- Function: solve(index, remainingZeros, remainingOnes)
- For each string, count its zeros and ones
- Try including: 1 + solve(index+1, remainingZeros-zeros, remainingOnes-ones)
- Try excluding: solve(index+1, remainingZeros, remainingOnes)
- Return maximum of both choices

### Hint 3: 2D Dynamic Programming
Use a 2D DP table where dp[i][j] represents the maximum number of strings that can be formed with at most i zeros and j ones. Process each string and update the DP table backwards to avoid using the same string multiple times.

**Key insight**: Process strings one by one, updating DP table for all valid (zeros, ones) combinations.

**Optimization strategy**:
- Initialize dp[m+1][n+1] with all zeros
- For each string, count its zeros and ones
- Update DP table backwards: for i from m down to zeros, for j from n down to ones
- dp[i][j] = max(dp[i][j], 1 + dp[i-zeros][j-ones])
- Answer: dp[m][n]

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (All subsets) | O(2^len(strs) * L) | O(len(strs)) | L is average string length, exponential time |
| Recursive with Memoization | O(len(strs) * m * n) | O(len(strs) * m * n) | 3D memoization table |
| 2D DP (Optimal) | O(len(strs) * m * n) | O(m * n) | Process each string, update 2D table |
| Space-Optimized DP | O(len(strs) * m * n) | O(m * n) | Same time, optimized space using single 2D array |

## Common Mistakes

### Mistake 1: Updating DP table in forward direction
```
// Wrong - processes same string multiple times
for (str of strs) {
    [zeros, ones] = countZerosOnes(str)
    for (let i = zeros; i <= m; i++) {
        for (let j = ones; j <= n; j++) {
            dp[i][j] = Math.max(dp[i][j], 1 + dp[i-zeros][j-ones])
        }
    }
}

// Why it fails: Forward iteration allows using the same string multiple times
// Example: str="01" with m=2, n=2 might count it twice

// Correct - iterate backwards to ensure each string used once
for (let i = m; i >= zeros; i--) {
    for (let j = n; j >= ones; j--) {
        dp[i][j] = Math.max(dp[i][j], 1 + dp[i-zeros][j-ones])
    }
}
```

### Mistake 2: Not counting zeros and ones correctly
```
// Wrong - assumes fixed count or miscounts
zeros = str.count('0')  // Some languages don't have this
ones = str.length - zeros

// Why it might fail: Implementation-dependent
// Better to explicitly count both for clarity

// Correct - explicitly count both
zeros = 0
ones = 0
for (char of str) {
    if (char === '0') zeros++
    else if (char === '1') ones++
}
```

### Mistake 3: Incorrect boundary conditions
```
// Wrong - doesn't check if there's enough capacity
for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
        dp[i][j] = Math.max(dp[i][j], 1 + dp[i-zeros][j-ones])
    }
}

// Why it fails: When i < zeros or j < ones, accessing dp[-1] or invalid index
// Leads to array out of bounds or incorrect results

// Correct - only update when there's sufficient capacity
for (let i = m; i >= zeros; i--) {
    for (let j = n; j >= ones; j--) {
        // Now i >= zeros and j >= ones guaranteed
        dp[i][j] = Math.max(dp[i][j], 1 + dp[i-zeros][j-ones])
    }
}
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Minimize unused capacity | Find subset minimizing (m - usedZeros) + (n - usedOnes) | Medium |
| Exactly m zeros and n ones | Use exactly m zeros and n ones instead of at most | Medium |
| K different characters | Extend to k different character types with k constraints | Hard |
| Weighted strings | Each string has a value, maximize total value within constraints | Medium |
| Minimum cost subset | Minimize cost while selecting at least k strings | Hard |
| Multiple knapsacks | Distribute strings across multiple (m, n) knapsacks | Hard |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] First attempt (understand the problem)
- [ ] Recognize as 2D knapsack problem
- [ ] Implement recursive solution
- [ ] Add memoization to recursion
- [ ] Implement iterative 2D DP solution
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Solve without hints
- [ ] Explain solution to someone else
- [ ] Complete in under 25 minutes

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
