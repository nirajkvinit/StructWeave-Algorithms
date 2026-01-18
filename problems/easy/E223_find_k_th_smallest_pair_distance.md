---
id: E223
old_id: A186
slug: find-k-th-smallest-pair-distance
title: Find K-th Smallest Pair Distance
difficulty: easy
category: easy
topics: ["array", "sorting", "binary-search"]
patterns: ["binary-search-on-answer", "two-pointer"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - E220_binary_search
  - M719_find_kth_smallest_pair_distance
  - H378_kth_smallest_element_in_sorted_matrix
prerequisites:
  - Binary search concepts
  - Sorting algorithms
  - Counting techniques
strategy_ref: ../strategies/patterns/binary-search.md
---
# Find K-th Smallest Pair Distance

## Problem

Given an integer array `nums` and an integer `k`, you need to find the `kth` smallest **distance** among all possible pairs of elements. The **distance** between two numbers is defined as the absolute difference between them: `|a - b|`.

To clarify with an example: if `nums = [1, 3, 1]`, the possible pairs are `(1,3)`, `(1,1)`, and `(3,1)` from the second element. Their distances are 2, 0, and 2 respectively. When sorted, the distances are `[0, 2, 2]`, so the 1st smallest distance is 0, and the 2nd smallest is 2.

The brute-force approach would be to generate all `n(n-1)/2` pairs, compute their distances, sort them, and pick the kth element. However, with up to 10,000 elements, this creates up to 50 million pairs, making the approach too slow. The key insight is that you don't need to generate all pairs explicitly. Instead, you can **binary search on the answer**: guess a distance value and efficiently count how many pairs have distance less than or equal to that guess.

An important optimization: sorting the array first doesn't change pair distances (absolute difference is symmetric) but enables efficient counting. Once sorted, for any right endpoint, you can use a sliding window or two pointers to count how many left endpoints form pairs with distance ≤ target, achieving linear time counting instead of quadratic.

Your task is to return the `kth` smallest distance value among all possible pairs `nums[i]` and `nums[j]` where `0 <= i < j < nums.length`.

## Why This Matters

This problem introduces the powerful "binary search on answer space" technique, which transforms problems from "find the kth element" to "count how many elements are ≤ x." This pattern appears in numerous domains: finding thresholds in machine learning (hyperparameter tuning), capacity planning in distributed systems (minimum server resources needed), and optimization problems (minimize maximum load).

Real-world applications include network latency analysis (finding the 95th percentile latency between server pairs), genomics (finding similar DNA sequences within a distance threshold), and recommendation systems (finding user similarity scores). The two-pointer counting technique you'll use here is fundamental to sliding window algorithms and appears in problems involving sorted data.

From an algorithmic perspective, this problem connects three major techniques: sorting for preprocessing, binary search for efficient search, and two pointers for linear-time counting. The time complexity improvement from O(n² log n²) (brute force) to O(n log n + n log W) where W is the range of distances showcases how choosing the right abstraction matters more than micro-optimizations.

Interviewers love this problem because it requires creative thinking to realize you can binary search on distances rather than array indices. It tests whether you can identify when a problem fits the "monotonic function" pattern needed for binary search: if count(distance ≤ x) ≥ k, then count(distance ≤ x+1) ≥ k as well. This monotonicity property is the key that unlocks binary search.

## Examples

**Example 1:**
- Input: `nums = [1,3,1], k = 1`
- Output: `0`
- Explanation: All possible pairs and their distances:
(1,3) -> 2
(1,1) -> 0
(3,1) -> 2
The smallest distance is 0 from pair (1,1).

**Example 2:**
- Input: `nums = [1,1,1], k = 2`
- Output: `0`

**Example 3:**
- Input: `nums = [1,6,1], k = 3`
- Output: `5`

## Constraints

- n == nums.length
- 2 <= n <= 10⁴
- 0 <= nums[i] <= 10⁶
- 1 <= k <= n * (n - 1) / 2

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Initial Direction
The brute force approach would generate all pairs and sort their distances. But there's a smarter way: instead of searching for the kth smallest distance directly, can you binary search on the possible distance values and count how many pairs have distance <= mid?

### Tier 2 Hint - Key Insight
Sort the array first. Binary search on the distance value (not the array indices). For each candidate distance `mid`, count how many pairs have distance <= `mid`. If count >= k, the answer is <= mid; otherwise it's > mid. Use two pointers to efficiently count pairs with distance <= mid.

### Tier 3 Hint - Implementation Details
Sort `nums`. Binary search range is `[0, max(nums) - min(nums)]`. For each `mid`, use two pointers: for each `right` pointer, move `left` pointer until `nums[right] - nums[left] <= mid`, then add `right - left` to count. If `count >= k`, search left half; otherwise search right half.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Binary search + counting | O(n log n + n log W) | O(1) or O(n) | W = max distance, sorting takes O(n log n) |
| Brute force with heap | O(n² log k) | O(k) | Generate all pairs, maintain min heap of size k |
| Brute force with sort | O(n² log n²) | O(n²) | Generate and sort all distances |

**Optimization notes:**
- Sorting enables efficient pair counting with two pointers
- Binary search on answer reduces search space logarithmically
- Cannot avoid O(n log n) due to sorting requirement

## Common Mistakes

### Mistake 1: Binary searching on indices instead of distance values
```python
# Wrong - searching array indices
left, right = 0, len(nums) - 1
while left < right:
    mid = (left + right) // 2
    # This doesn't make sense for this problem!

# Correct - search on distance values
nums.sort()
left, right = 0, nums[-1] - nums[0]
while left < right:
    mid = (left + right) // 2
    count = count_pairs(nums, mid)
    # ...
```

### Mistake 2: Inefficient pair counting
```python
# Wrong - O(n²) counting for each binary search iteration
def count_pairs(nums, max_dist):
    count = 0
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[j] - nums[i] <= max_dist:
                count += 1
    return count

# Correct - O(n) counting with two pointers
def count_pairs(nums, max_dist):
    count = 0
    left = 0
    for right in range(len(nums)):
        while nums[right] - nums[left] > max_dist:
            left += 1
        count += right - left
    return count
```

### Mistake 3: Incorrect binary search termination
```python
# Wrong - can miss the exact kth distance
if count >= k:
    right = mid - 1  # Should be right = mid

# Correct - preserve potential answer
if count >= k:
    right = mid
else:
    left = mid + 1
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Kth largest pair distance | Easy | Find kth largest instead of smallest |
| Count pairs with distance <= k | Easy | Return count instead of finding kth |
| Kth smallest sum | Medium | Find kth smallest sum of pairs instead of distance |
| Kth smallest in matrix | Hard | 2D version with sorted rows and columns |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve independently without hints (30 min time limit)
- [ ] Implement binary search on answer
- [ ] Implement efficient pair counting
- [ ] Test with duplicate values

**Spaced Repetition**
- [ ] Day 1: Solve again from scratch
- [ ] Day 3: Solve kth largest variation
- [ ] Week 1: Explain why sorting helps
- [ ] Week 2: Optimize counting function further

**Mastery Validation**
- [ ] Can explain binary search on answer technique
- [ ] Can prove two-pointer counting correctness
- [ ] Solve in under 15 minutes
- [ ] Implement without referring to notes

**Strategy**: See [Binary Search Pattern](../strategies/patterns/binary-search.md)
