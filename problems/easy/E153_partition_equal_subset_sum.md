---
id: E153
old_id: I215
slug: partition-equal-subset-sum
title: Partition Equal Subset Sum
difficulty: easy
category: easy
topics: ["array", "dynamic-programming"]
patterns: ["dp-knapsack", "subset-sum", "backtracking"]
estimated_time_minutes: 15
frequency: high
related_problems: ["M322", "M518", "E001"]
prerequisites: ["dynamic-programming", "subset-sum", "dp-optimization"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Partition Equal Subset Sum

## Problem

Given an integer array, determine whether you can partition it into two subsets such that the sum of elements in both subsets is equal. Return true if such a partition exists, false otherwise.

The key insight is that if two subsets have equal sums, each subset must have sum equal to half of the total. First, calculate the total sum of all array elements. If this sum is odd, immediately return false because you cannot split an odd number into two equal integers. If the sum is even, the problem transforms into a classic question: "Can you find a subset of the array that sums to exactly total_sum / 2?"

This transformed problem is the subset sum problem, a fundamental question in computer science. You need to determine if any combination of array elements can sum to the target value. For example, with array `[1, 5, 11, 5]`, the total is 22, so target is 11. You can achieve 11 with subset `[1, 5, 5]`, meaning the remaining subset `[11]` also sums to 11, so return true.

The solution uses dynamic programming. Create a boolean array where `dp[i]` represents "can we achieve sum i using some subset of elements?" Initialize `dp[0] = true` (empty subset achieves sum 0). For each number in the array, update the DP table by marking all sums achievable by adding this number to previously achievable sums. Critical detail: update the DP array backwards (from target down to current number) to avoid using the same element multiple times in one iteration. If `dp[target]` becomes true, you've found a valid partition.

## Why This Matters

The subset sum problem is NP-complete, making it a cornerstone of computational complexity theory and a testing ground for algorithmic techniques. While no polynomial-time algorithm exists for the general case, the dynamic programming approach provides a pseudo-polynomial solution efficient for reasonable input sizes, demonstrating how DP can tackle problems that seem intractable by brute force.

This pattern appears throughout computer science and real-world applications: in resource allocation (dividing tasks equally among processors), load balancing (distributing network traffic evenly), financial portfolio balancing (splitting investments into equal-value groups), and cryptography (knapsack-based encryption schemes). The knapsack pattern underlies cutting stock problems in manufacturing, bin packing in logistics, and memory allocation in operating systems.

Interview questions favor this problem because it tests multiple advanced concepts: recognizing problem reduction (equal partition reduces to subset sum), dynamic programming table construction, understanding why backward iteration prevents element reuse, and space optimization techniques (1D vs 2D DP). The problem naturally extends to variations like partitioning into k equal subsets, minimizing partition difference, or counting valid partitions. Mastering this builds intuition for DP state design, optimization through early termination, and recognizing when exponential problems have pseudo-polynomial solutions based on input value ranges.

## Examples

**Example 1:**
- Input: `nums = [1,5,11,5]`
- Output: `true`
- Explanation: One valid partition is [1, 5, 5] with sum 11 and [11] with sum 11

**Example 2:**
- Input: `nums = [1,2,3,5]`
- Output: `false`
- Explanation: No matter how you divide the elements, you cannot create two groups with equal sums

## Constraints

- 1 <= nums.length <= 200
- 1 <= nums[i] <= 100

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Reduce to Subset Sum
First, calculate the total sum of all elements. If the sum is odd, immediately return false (can't split odd sum into two equal parts). Otherwise, the problem reduces to: "Can we find a subset with sum equal to total/2?" This is the classic subset sum problem. Use dynamic programming with a boolean array where `dp[i]` represents whether sum `i` is achievable.

**Key insight**: Two equal partitions mean each has sum = total/2. Finding one partition automatically gives the other.

### Intermediate Approach - DP with Boolean Array
Create a DP array of size `(total_sum // 2) + 1` initialized to false, except `dp[0] = true` (sum 0 is always achievable with empty set). For each number in the array, update the DP table backwards (right to left) to avoid using the same element twice. If `dp[target]` becomes true, return true.

**Key insight**: Process DP array backwards to ensure each element is considered only once per iteration.

### Advanced Approach - Space-Optimized DP with Early Exit
Use the same DP approach but optimize with early termination. As soon as `dp[target]` becomes true, return immediately. Additionally, you can use bitset operations in some languages for faster DP state updates. Consider sorting the array in descending order to potentially find a solution faster.

**Key insight**: Early exit when target is reached can significantly improve average-case performance.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Backtracking | O(2^n) | O(n) | Exponential, explores all subsets |
| DP (2D Table) | O(n × sum) | O(n × sum) | Classic DP approach |
| DP (1D Optimized) | O(n × sum) | O(sum) | Space-optimized version |
| DP with Bitset | O(n × sum/w) | O(sum/w) | w = word size, language dependent |

1D DP is the standard solution: pseudo-polynomial time, linear space in target sum.

## Common Mistakes

### Mistake 1: Not Checking for Odd Sum First
```python
# Wrong: Missing early termination for odd sum
def canPartition(nums):
    target = sum(nums) // 2  # Integer division
    dp = [False] * (target + 1)
    dp[0] = True
    # ... DP logic
```

**Why it fails**: For `[1, 2, 5]` with sum 8, target becomes 4, but you can achieve sum 4 with `[1, 2, 1]` (wrong). Odd total sum can't be split equally.

**Fix**: Check first: `if sum(nums) % 2 == 1: return False`.

### Mistake 2: Forward DP Update (Using Element Multiple Times)
```python
# Wrong: Updating DP array forward
def canPartition(nums):
    total = sum(nums)
    if total % 2 == 1:
        return False
    target = total // 2
    dp = [False] * (target + 1)
    dp[0] = True

    for num in nums:
        for i in range(num, target + 1):  # Forward iteration
            dp[i] = dp[i] or dp[i - num]  # Uses updated values

    return dp[target]
```

**Why it fails**: Forward iteration allows using the same element multiple times. For `[2]` with target 2, this incorrectly returns true by using 2 twice.

**Fix**: Iterate backwards: `for i in range(target, num - 1, -1): dp[i] = dp[i] or dp[i - num]`.

### Mistake 3: Incorrect DP Array Size
```python
# Wrong: DP array size doesn't include target
def canPartition(nums):
    target = sum(nums) // 2
    dp = [False] * target  # Missing +1
    dp[0] = True
    # ...
    return dp[target]  # Index out of bounds
```

**Why it fails**: Array of size `target` has indices 0 to target-1. Accessing `dp[target]` causes index error.

**Fix**: Size should be `target + 1`: `dp = [False] * (target + 1)`.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Partition to K Equal Subsets | Hard | Partition into k subsets with equal sum |
| Minimum Subset Sum Difference | Medium | Minimize difference between two partition sums |
| Target Sum with +/- Signs | Medium | Assign +/- to numbers to reach target sum |
| Count Partitions with Difference | Medium | Count partitions with specific sum difference |
| Multi-way Partition | Hard | Partition into multiple groups with constraints |

## Practice Checklist

Track your progress on this problem:

- [ ] **Day 0**: Understand subset sum reduction and solve with 1D DP (40 min)
- [ ] **Day 1**: Review why backward iteration is critical
- [ ] **Day 3**: Implement without looking at previous solution (25 min)
- [ ] **Day 7**: Solve and explain the time/space tradeoff (20 min)
- [ ] **Day 14**: Implement with early exit optimization (20 min)
- [ ] **Day 30**: Speed solve in under 15 minutes

**Strategy**: See [Dynamic Programming](../strategies/patterns/dynamic-programming.md)
