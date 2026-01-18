---
id: M339
old_id: A165
slug: partition-to-k-equal-sum-subsets
title: Partition to K Equal Sum Subsets
difficulty: medium
category: medium
topics: ["array"]
patterns: ["backtrack-combination"]
estimated_time_minutes: 30
frequency: high
related_problems:
  - M216_subsets.md
  - M217_subsets_ii.md
  - H037_n_queens.md
prerequisites:
  - backtracking
  - recursion
  - subset-generation
---
# Partition to K Equal Sum Subsets

## Problem

You have an integer array `nums` and a positive integer `k`. Your task is to determine whether you can partition all the numbers in the array into exactly `k` non-empty groups such that each group has the exact same sum.

For example, if your array is `[4,3,2,3,5,2,1]` and `k=4`, you need to check if you can split these 7 numbers into 4 groups where each group's numbers add up to the same value. One valid partitioning would be: `[5]`, `[1,4]`, `[2,3]`, `[2,3]` - each sums to 5.

Important constraints:
- Every number must be used exactly once
- All `k` groups must be non-empty
- The sums must be exactly equal (not approximately equal)
- The order within each group doesn't matter
- If it's impossible to create such a partition, return `false`

Before you even start trying to partition, think about what conditions would make it impossible. For instance, if the total sum of all numbers isn't divisible by `k`, you know immediately it can't work.

## Why This Matters

Partitioning problems are foundational in resource allocation, load balancing across servers, dividing tasks among teams, and bin packing in logistics. This is an NP-complete problem (related to the famous Subset Sum problem), teaching you essential backtracking techniques with pruning - skills critical for constraint satisfaction problems in AI, scheduling algorithms, and optimization. Understanding when greedy approaches fail and why exhaustive search with smart pruning is necessary builds intuition for recognizing computationally hard problems in practice.

## Examples

**Example 1:**
- Input: `nums = [4,3,2,3,5,2,1], k = 4`
- Output: `true`
- Explanation: A valid partition exists: (5), (1, 4), (2,3), (2,3), where each subset totals 5.

**Example 2:**
- Input: `nums = [1,2,3,4], k = 3`
- Output: `false`

## Constraints

- 1 <= k <= nums.length <= 16
- 1 <= nums[i] <= 10⁴
- The frequency of each element is in the range [1, 4].

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Early Validation and Target Sum</summary>

Before attempting backtracking, validate the problem is solvable:
- Calculate total sum of all elements
- If total % k != 0, return false immediately
- Target sum per subset = total / k

Also optimize by sorting the array in descending order. This helps fail fast when large elements can't fit into remaining capacity.

If any single element exceeds the target sum, the partition is impossible.
</details>

<details>
<summary>Hint 2: Backtracking with Bucket Filling</summary>

Model this as filling k "buckets," each with capacity = target_sum:
- Try placing each number into one of the k buckets
- Backtrack when a bucket overflows
- When all numbers are placed successfully, return true

Key optimization: Use a boolean array to mark which numbers are already used. This avoids revisiting the same number multiple times.

Think of it as: "Can I distribute all numbers into k buckets without exceeding capacity?"
</details>

<details>
<summary>Hint 3: Pruning for Efficiency</summary>

Critical prunings to avoid exponential blowup:
1. **Sorted descending order**: Place large numbers first to fail fast
2. **Skip equivalent buckets**: If buckets[i] == buckets[j], don't try placing in both
3. **Early termination**: If placing a number in an empty bucket fails, backtrack immediately
4. **Memoization (advanced)**: Cache states using bitmask of used numbers

Without pruning, this becomes O(k^n) which is infeasible. With pruning, many branches are eliminated early.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (all partitions) | O(k^n) | O(n) | Try every way to distribute n items to k buckets |
| Backtracking with Pruning | O(k * 2^n) | O(n) | Each element: used or not; k buckets to try |
| Bitmask DP (Optimal) | O(2^n * n) | O(2^n) | Memoize states with bitmask; n ≤ 16 makes this feasible |

## Common Mistakes

### Mistake 1: Not Validating Total Sum First
```python
# DON'T: Start backtracking without basic validation
def canPartitionKSubsets(nums: List[int], k: int) -> bool:
    # Missing: total sum check
    target = sum(nums) // k  # Wrong if sum not divisible!

    def backtrack(index, buckets):
        # ... backtracking logic
        pass

    return backtrack(0, [0] * k)
# Problem: Will waste time on impossible cases
```

**Why it's wrong:** If sum(nums) % k != 0, no valid partition exists. Starting backtracking wastes computation.

**Fix:** Validate `sum(nums) % k == 0` before backtracking.

### Mistake 2: Inefficient Bucket Selection
```python
# DON'T: Try all k buckets even when identical
def canPartitionKSubsets(nums: List[int], k: int) -> bool:
    target = sum(nums) // k
    buckets = [0] * k

    def backtrack(index):
        if index == len(nums):
            return all(b == target for b in buckets)

        # Problem: tries all k buckets even when some are identical
        for i in range(k):
            if buckets[i] + nums[index] <= target:
                buckets[i] += nums[index]
                if backtrack(index + 1):
                    return True
                buckets[i] -= nums[index]
        return False

    return backtrack(0)
# Problem: Explores symmetric duplicate states
```

**Why it's wrong:** If buckets[0] == buckets[1] == 0, trying num in bucket 0 vs bucket 1 is identical, yet both are explored.

**Fix:** Add pruning: if buckets[i] == buckets[j] where j < i, skip bucket i.

### Mistake 3: Not Sorting for Early Termination
```python
# DON'T: Process numbers in original order
def canPartitionKSubsets(nums: List[int], k: int) -> bool:
    target = sum(nums) // k
    if sum(nums) % k != 0:
        return False

    # Missing: nums.sort(reverse=True)
    buckets = [0] * k

    def backtrack(index):
        # ... backtracking logic
        pass

    return backtrack(0)
# Problem: Small numbers tried first, delaying failure detection
```

**Why it's wrong:** Processing small numbers first allows many partial solutions to be explored before hitting a large number that doesn't fit.

**Fix:** Sort nums in descending order: `nums.sort(reverse=True)`. Large numbers fail fast if they don't fit.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Partition Equal Subset Sum | Special case where k = 2 (simpler DP solution possible) | Medium |
| Minimize Largest Sum | Partition into k subsets minimizing the maximum sum | Hard |
| Balanced Partition | Partition with minimum difference between largest and smallest subset sums | Hard |
| Weighted Partition | Elements have weights and values; maximize total value | Hard |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Implemented validation check (sum % k == 0)
- [ ] Added backtracking with bucket filling approach
- [ ] Applied pruning optimizations (sorting, skipping duplicates)
- [ ] Tested edge cases: k=1, k=n, impossible cases
- [ ] Analyzed time/space complexity
- [ ] **Day 1-3:** Revisit and implement bitmask DP version
- [ ] **Week 1:** Solve k=2 case with simpler DP
- [ ] **Week 2:** Apply to NP-complete partition problems

**Strategy**: See [Backtracking Pattern](../strategies/patterns/backtracking.md)
