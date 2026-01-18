---
id: E181
old_id: I293
slug: target-sum
title: Target Sum
difficulty: easy
category: easy
topics: ["array", "dynamic-programming", "backtracking"]
patterns: ["dynamic-programming", "subset-sum"]
estimated_time_minutes: 15
frequency: high
related_problems:
  - M072  # Partition Equal Subset Sum
  - M073  # Ones and Zeroes
  - M074  # Coin Change
prerequisites:
  - Dynamic programming
  - Subset sum problem
  - Memoization
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Target Sum

## Problem

You're given an integer array `nums` and a target integer value `target`. Your goal is to construct expressions by assigning either a plus sign `'+'` or a minus sign `'-'` in front of every element in the array, then evaluating the entire expression. For instance, if `nums = [2, 1]`, you could create `"+2-1"` (which equals 1) or `"+2+1"` (which equals 3) or `"-2+1"` (which equals -1), and so on.

The challenge is to count how many distinct ways you can assign these signs to produce expressions that evaluate exactly to your target value. Each element must receive exactly one sign, and the expression includes all elements in sequence. Think of it as partitioning the array into two groups: elements you add and elements you subtract, where the difference between the two groups equals your target.

Note that the order of elements is fixed, so the key decision is whether each element contributes positively or negatively to the sum. With `n` elements, there are 2^n possible sign assignments to consider, though clever techniques can avoid checking all of them.

## Why This Matters

This problem bridges several fundamental concepts in algorithm design. At its core, it transforms what looks like a counting problem into a classic subset sum challenge, demonstrating how reformulating a problem can reveal optimal solutions. The transformation insight is particularly valuable: recognizing that assigning signs is equivalent to partitioning the array into positive and negative subsets, where `sum(positive) - sum(negative) = target`.

This pattern appears frequently in resource allocation problems (budgeting where some items are income, others expenses), signal processing (combining positive and negative amplitudes), and combinatorial optimization. The problem teaches the critical skill of recognizing when a seemingly complex counting task reduces to a well-studied problem structure. It's also commonly featured in technical interviews to assess dynamic programming understanding, especially the optimization from exponential backtracking to polynomial-time DP through mathematical insight.

## Examples

**Example 1:**
- Input: `nums = [1,1,1,1,1], target = 3`
- Output: `5`
- Explanation: Five different symbol assignments produce a sum of 3:
-1 + 1 + 1 + 1 + 1 = 3
+1 - 1 + 1 + 1 + 1 = 3
+1 + 1 - 1 + 1 + 1 = 3
+1 + 1 + 1 - 1 + 1 = 3
+1 + 1 + 1 + 1 - 1 = 3

**Example 2:**
- Input: `nums = [1], target = 1`
- Output: `1`

## Constraints

- 1 <= nums.length <= 20
- 0 <= nums[i] <= 1000
- 0 <= sum(nums[i]) <= 1000
- -1000 <= target <= 1000

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Hint
Use backtracking to try all 2^n combinations of + and - signs. For each element, recursively try both adding and subtracting it. Count solutions that reach the target. This gives correct results but has exponential time complexity.

### Intermediate Hint
Recognize this as a subset sum variant. If you assign + to subset P and - to subset N, then sum(P) - sum(N) = target and sum(P) + sum(N) = sum(nums). Solving these equations gives sum(P) = (target + sum(nums)) / 2. Now find the count of subsets with this sum using DP.

### Advanced Hint
Transform to 0/1 knapsack: find number of subsets that sum to (target + total) / 2. Use DP array where dp[i] = number of ways to achieve sum i. Iterate through nums, update dp array backwards to avoid using same element twice. Handle edge cases: if (target + total) is odd or target > total, return 0.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Backtracking) | O(2^n) | O(n) | Try all combinations of signs |
| Recursion + Memoization | O(n * sum) | O(n * sum) | Cache (index, current_sum) states |
| 2D DP (Subset Sum) | O(n * sum) | O(n * sum) | Count subsets for each sum |
| 1D DP Optimized | O(n * sum) | O(sum) | Space-optimized subset sum |

## Common Mistakes

### Mistake 1: Not checking for impossible cases
```python
# Wrong: Not validating if solution is possible
def findTargetSumWays(nums, target):
    total = sum(nums)
    # Missing: check if (target + total) is odd or target > total
    subset_sum = (target + total) // 2
    # Proceed with DP...
```

**Issue**: If (target + total) is odd, no integer solution exists. If abs(target) > total, it's impossible to reach.

**Fix**: Add validation: `if (target + total) % 2 != 0 or abs(target) > total: return 0`.

### Mistake 2: Updating DP array in wrong direction
```python
# Wrong: Updating DP array forward
def findTargetSumWays(nums, target):
    # ... setup
    for num in nums:
        for i in range(num, subset_sum + 1):  # Wrong direction!
            dp[i] += dp[i - num]
```

**Issue**: Updating forward causes the same element to be used multiple times in one iteration.

**Fix**: Iterate backwards: `for i in range(subset_sum, num - 1, -1):` to ensure each element is used only once.

### Mistake 3: Not handling zeros correctly
```python
# Wrong: Standard subset sum doesn't handle zeros properly
def findTargetSumWays(nums, target):
    # If target is 0 and there are multiple zeros,
    # each zero can be + or -, giving 2^(count of zeros) ways
    # Standard DP might miss this
```

**Issue**: Zeros contribute 2^k ways where k is the count of zeros, since each can have + or -.

**Fix**: Count zeros separately and multiply result by 2^(zero_count), or ensure DP initialization accounts for this.

## Variations

| Variation | Difficulty | Description |
|-----------|----------|-------------|
| Partition Equal Subset Sum | Medium | Check if array can be partitioned into two equal-sum subsets |
| Last Stone Weight II | Medium | Minimize the difference between two subset sums |
| Target Sum with Multiply/Divide | Hard | Use +, -, *, / operators to reach target |
| Expression Add Operators | Hard | Add +, -, * between digits to form target |
| Maximum Target Sum | Medium | Find maximum target achievable with given constraints |

## Practice Checklist

Track your progress on this problem:

**First Attempt**
- [ ] Solved independently (30 min time limit)
- [ ] Implemented DP solution
- [ ] All test cases passing
- [ ] Analyzed time and space complexity

**Spaced Repetition**
- [ ] Day 1: Resolve from memory
- [ ] Day 3: Solve with 1D DP optimization
- [ ] Week 1: Implement without hints
- [ ] Week 2: Solve Partition Equal Subset Sum
- [ ] Month 1: Teach subset sum transformation to someone else

**Mastery Goals**
- [ ] Can explain transformation to subset sum
- [ ] Can handle edge cases (all zeros, impossible target, negative numbers)
- [ ] Can derive the formula (target + total) / 2
- [ ] Can solve in under 20 minutes

**Strategy**: See [Dynamic Programming Patterns](../strategies/patterns/dynamic-programming.md)
