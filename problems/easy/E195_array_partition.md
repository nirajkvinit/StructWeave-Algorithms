---
id: E195
old_id: A057
slug: array-partition
title: Array Partition
difficulty: easy
category: easy
topics: ["array", "sorting", "greedy"]
patterns: ["sorting", "greedy-pairing"]
estimated_time_minutes: 15
frequency: low
prerequisites: ["sorting", "greedy-algorithm", "array-manipulation"]
related_problems: ["M912", "E088", "M215"]
strategy_ref: ../strategies/patterns/greedy-algorithms.md
---
# Array Partition

## Problem

You're given an array of `2n` integers, and you need to partition them into `n` pairs. From each pair, you take the minimum value. Your goal is to maximize the sum of these minimum values across all pairs.

The key insight is understanding what gets "wasted." When you pair two numbers, only the smaller one contributes to your sum, and the larger one is effectively discarded. So if you pair 1 with 100, you only get 1 in your sum, wasting 100. This suggests you want to minimize what gets wasted by pairing numbers strategically.

For example, with `[1, 4, 3, 2]`, you could pair (1,4) and (2,3), giving min(1,4) + min(2,3) = 1 + 2 = 3. Or you could pair (1,2) and (3,4), giving min(1,2) + min(3,4) = 1 + 3 = 4, which is better. The question is: what pairing strategy guarantees the maximum possible sum?

## Why This Matters

This problem introduces greedy algorithms, where you make locally optimal choices hoping they lead to a global optimum. The pattern appears in resource allocation (pairing tasks with processors to maximize throughput), scheduling (grouping jobs to minimize idle time), and matching algorithms (pairing candidates with positions to maximize total fit scores). The sorting-based optimization technique is fundamental to algorithm design and appears in interval scheduling, Huffman coding, and minimum spanning trees. Companies building optimization engines for logistics, finance, or operations research regularly solve variants of this problem. It's also popular in interviews because it tests your ability to recognize when a greedy approach works and requires proving why your strategy is optimal. The same thinking applies to problems involving load balancing, team formation, and auction mechanisms.

## Examples

**Example 1:**
- Input: `nums = [1,4,3,2]`
- Output: `4`
- Explanation: Possible pairing configurations:
1. (1, 4), (2, 3) -> min(1, 4) + min(2, 3) = 1 + 2 = 3
2. (1, 3), (2, 4) -> min(1, 3) + min(2, 4) = 1 + 2 = 3
3. (1, 2), (3, 4) -> min(1, 2) + min(3, 4) = 1 + 3 = 4
The maximum achievable sum is 4.

**Example 2:**
- Input: `nums = [6,2,6,5,1,2]`
- Output: `9`
- Explanation: Best pairing strategy: (2, 1), (2, 5), (6, 6), yielding min(2, 1) + min(2, 5) + min(6, 6) = 1 + 2 + 6 = 9.

## Constraints

- 1 <= n <= 10⁴
- nums.length == 2 * n
- -10⁴ <= nums[i] <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Greedy Intuition
When you pair two numbers (a, b) where a < b, the minimum is a and b is "wasted" (doesn't contribute to sum). How can you minimize the waste? What pairing strategy ensures the smallest possible values are wasted?

### Hint 2: Sorting Insight
If you sort the array, how should you form pairs to maximize the sum of minimums? Should you pair smallest with largest, or pair consecutive elements?

### Hint 3: Pattern Recognition
After sorting, which elements will contribute to the sum and which will be "wasted"? Can you identify a simple pattern based on indices?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Sort + Pair Consecutives | O(n log n) | O(1) or O(n) | Depends on sort implementation |
| Counting Sort (for limited range) | O(n + k) | O(k) | k = range of values (20001 here) |
| Brute Force All Pairings | O(n! / (2^n * n!)) | O(n) | Exponential - impractical |

## Common Mistakes

### Mistake 1: Pairing smallest with largest
```python
# Wrong: Pairs extremes together
def arrayPairSum(nums):
    nums.sort()
    result = 0
    left, right = 0, len(nums) - 1
    while left < right:
        result += min(nums[left], nums[right])  # Always nums[left]
        left += 1
        right -= 1
    return result
```
**Why it's wrong**: Pairing smallest with largest wastes the large values. For [1,2,3,4], this gives (1,4)+(2,3) = 1+2=3, but optimal is (1,2)+(3,4)=1+3=4.

### Mistake 2: Taking every element instead of alternating
```python
# Wrong: Adds all elements instead of just the minimums
def arrayPairSum(nums):
    nums.sort()
    return sum(nums)  # Should be sum of every other element
```
**Why it's wrong**: You sum ALL elements, not just the minimums from each pair. After sorting, you should sum elements at even indices (0, 2, 4, ...).

### Mistake 3: Incorrect indexing for alternating sum
```python
# Wrong: Off-by-one or wrong indices
def arrayPairSum(nums):
    nums.sort()
    return sum(nums[i] for i in range(1, len(nums), 2))  # Should start at 0
```
**Why it's wrong**: Starting at index 1 with step 2 gives indices [1,3,5,...] which are the larger elements in each pair. Should start at index 0 to get [0,2,4,...].

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Maximize Sum of Max in Pairs | Easy | Partition to maximize sum of maximums instead |
| K-Group Partition | Medium | Partition into groups of k, maximize sum of mins |
| Minimize Sum of Pairs | Easy | Find minimum possible sum of minimums |
| Optimal Pairing with Constraints | Medium | Additional constraints on which elements can pair |
| Array Partition with Costs | Medium | Each pairing has an associated cost |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve with sort + sum alternating elements
- [ ] Understand why pairing consecutives is optimal
- [ ] Test with examples: [1,4,3,2], [6,2,6,5,1,2]

**After 1 Day**
- [ ] Implement without looking at solution
- [ ] Can you prove why sorting and pairing consecutives is optimal?
- [ ] Code in under 5 lines

**After 1 Week**
- [ ] Solve in under 8 minutes
- [ ] Explain greedy choice property to someone
- [ ] Implement using one-liner with slicing

**After 1 Month**
- [ ] Solve maximize sum of max variation (prove different strategy)
- [ ] Implement counting sort version for O(n) time
- [ ] Apply greedy pairing pattern to other problems

## Strategy

**Pattern**: Greedy Algorithm with Sorting
**Key Insight**: Sort array and pair consecutive elements. This minimizes waste since each "wasted" value is as small as possible while still being larger than its pair.

See [Greedy Algorithms](../strategies/patterns/greedy-algorithms.md) for more on making locally optimal choices that lead to global optimality.
