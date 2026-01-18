---
id: M424
old_id: A272
slug: split-array-with-same-average
title: Split Array With Same Average
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Split Array With Same Average

## Problem

Given an integer array `nums`, determine whether you can partition its elements into two non-empty subsets where both subsets have identical averages.

The average of a subset is calculated as the sum of its elements divided by the number of elements. For example, if subset A contains [1, 4, 5, 8], its average is (1+4+5+8)/4 = 18/4 = 4.5.

At first glance, this seems like a simple partition problem, but there's a mathematical constraint that makes it interesting. If two subsets have the same average, they must also have the same average as the original array. This means you're looking for a subset whose average equals the total array's average. Additionally, the subset must satisfy a specific relationship between its size and sum.

The key insight is transforming this from an average problem into a subset sum problem. If subset A has k elements and the total array has n elements with total sum S, then for the averages to match, the sum of subset A must equal k × S / n. This only works when k × S is divisible by n, which provides an important optimization opportunity.

Return `true` if such a partition exists, otherwise return `false`. Note that both subsets must be non-empty, so you can't put all elements in one subset.

## Why This Matters

This problem showcases how mathematical reasoning can transform a seemingly difficult problem into a tractable one. The technique of converting between different problem formulations (average equality to subset sum) is valuable in optimization problems, financial modeling, and resource allocation scenarios. The meet-in-the-middle optimization technique used here is also important for handling problems with exponential search spaces, appearing in cryptography (meet-in-the-middle attacks) and subset sum variants. Understanding when to apply mathematical properties to prune search spaces is a critical skill for technical interviews and algorithm design.

## Examples

**Example 1:**
- Input: `nums = [1,2,3,4,5,6,7,8]`
- Output: `true`
- Explanation: One valid partition is [1,4,5,8] and [2,3,6,7], where both subsets average to 4.5.

**Example 2:**
- Input: `nums = [3,1]`
- Output: `false`

## Constraints

- 1 <= nums.length <= 30
- 0 <= nums[i] <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
If two subsets have the same average, then: sum(A)/len(A) = sum(B)/len(B) = total_sum/n. This means sum(A) = len(A) × total_sum/n. So you need to find a subset of size k where sum equals k × total_sum/n. This transforms the problem into a subset sum problem with a specific target for each possible subset size.
</details>

<details>
<summary>Main Approach</summary>
Use dynamic programming with subset sums. For each possible subset size k (from 1 to n/2, since if A works, B automatically works), calculate the target sum = k × total_sum/n. Use DP to track all possible sums achievable with exactly k elements. If the target sum is achievable for any valid k, return true. Optimize by only checking subset sizes where k × total_sum is divisible by n (to avoid fractional averages).
</details>

<details>
<summary>Optimization Tip</summary>
Since n ≤ 30, you can use meet-in-the-middle approach. Split the array into two halves, generate all possible (size, sum) pairs for each half, then check if any combination from both halves gives the required average. Also, you only need to check k up to n/2 because if subset A has the average, so does complement B. Early termination: if all elements are equal, return false (unless you can split them into equal-sized subsets).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(2^n) | O(2^n) | Check all possible partitions |
| DP Subset Sum | O(n² × sum) | O(n × sum) | For each size k, track possible sums |
| Optimal (Meet in Middle) | O(2^(n/2) × n) | O(2^(n/2)) | Split array, check combinations |

## Common Mistakes

1. **Not checking divisibility condition**
   ```python
   # Wrong: Target may not be an integer
   for k in range(1, n//2 + 1):
       target = k * total_sum / n
       if can_make_sum(nums, k, target):
           return True

   # Correct: Only check when target is integer
   for k in range(1, n//2 + 1):
       if (k * total_sum) % n != 0:
           continue
       target = (k * total_sum) // n
       if can_make_sum(nums, k, target):
           return True
   ```

2. **Not optimizing subset size search**
   ```python
   # Wrong: Checking all k from 1 to n-1
   for k in range(1, n):
       # Check if subset of size k works

   # Correct: Only check k up to n/2
   for k in range(1, n//2 + 1):
       # If k works, n-k also works (complement)
   ```

3. **Integer overflow with large sums**
   ```python
   # Wrong: Not considering that sum can be large
   total_sum = sum(nums)  # Could be up to 30 × 10^4

   # Correct: Python handles big integers, but in other languages:
   # Be careful with k * total_sum multiplication
   if k * total_sum % n != 0:
       continue
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Partition Equal Subset Sum | Medium | Split into two equal-sum subsets |
| Partition to K Equal Sum Subsets | Hard | Split into k subsets with equal sums |
| Tallest Billboard | Hard | Maximize height while keeping two subsets balanced |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming - Subset Sum](../../strategies/patterns/dynamic-programming.md)
