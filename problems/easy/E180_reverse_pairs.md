---
id: E180
old_id: I292
slug: reverse-pairs
title: Reverse Pairs
difficulty: easy
category: easy
topics: ["array", "divide-and-conquer", "merge-sort"]
patterns: ["divide-and-conquer"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - M056  # Count of Smaller Numbers After Self
  - H010  # Count of Range Sum
  - E001  # Two Sum
prerequisites:
  - Merge sort
  - Divide and conquer
  - Binary indexed tree (advanced)
strategy_ref: ../strategies/patterns/divide-and-conquer.md
---
# Reverse Pairs

## Problem

Given an integer array, you need to count how many "reverse pairs" exist. A reverse pair is defined as a pair of indices (i, j) where i comes before j in the array (i < j), but the value at position i is more than twice the value at position j. In mathematical terms: nums[i] > 2 × nums[j].

For example, in [1,3,2,3,1], the pair (1,4) is a reverse pair because index 1 comes before index 4, and nums[1]=3 is greater than 2×nums[4]=2×1=2. Similarly (3,4) qualifies because nums[3]=3 > 2×1=2. The "more than twice" condition makes this different from simply counting inversions (where you'd just check nums[i] > nums[j]).

The naive approach of checking every pair takes O(n²) time, which becomes too slow for large arrays. The key insight is recognizing that when you sort parts of the array, you can count these pairs much more efficiently using the divide-and-conquer pattern, specifically by augmenting merge sort.

## Why This Matters

This problem teaches you how to enhance classic algorithms (merge sort) to solve counting problems efficiently. The technique of "count while you divide and conquer" is fundamental to many advanced algorithms and appears in computational geometry (counting point inversions), database query optimization (counting range queries), and statistical analysis (computing rank correlations). The specific pattern - counting cross-pairs between sorted halves before merging - is a powerful template that extends to many similar counting problems. Understanding how to leverage the sorted property of subarrays to accelerate counting from O(n) to O(log n) per element is a critical optimization skill. This problem also introduces you to handling numerical overflow carefully, an important consideration in production code.

## Examples

**Example 1:**
- Input: `nums = [1,3,2,3,1]`
- Output: `2`
- Explanation: Valid reverse pairs found:
Position (1, 4): nums[1] = 3, nums[4] = 1, where 3 > 2 * 1
Position (3, 4): nums[3] = 3, nums[4] = 1, where 3 > 2 * 1

**Example 2:**
- Input: `nums = [2,4,3,5,1]`
- Output: `3`
- Explanation: Valid reverse pairs found:
Position (1, 4): nums[1] = 4, nums[4] = 1, where 4 > 2 * 1
Position (2, 4): nums[2] = 3, nums[4] = 1, where 3 > 2 * 1
Position (3, 4): nums[3] = 5, nums[4] = 1, where 5 > 2 * 1

## Constraints

- 1 <= nums.length <= 5 * 10⁴
- -2³¹ <= nums[i] <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Hint
The brute force approach is to use two nested loops checking every pair (i, j) where i < j and nums[i] > 2 * nums[j]. Count all such pairs. This gives O(n²) time complexity but helps understand the problem pattern.

### Intermediate Hint
Use a modified merge sort approach. During the merge process, before actually merging, count the reverse pairs where elements from the left half are greater than 2 times elements from the right half. The key insight: when arrays are sorted, you can use two pointers to efficiently count valid pairs.

### Advanced Hint
Implement merge sort with pair counting. For each recursive call, first count cross-pairs (left half vs right half) using two pointers before merging. While left[i] > 2 * right[j], increment j and add count. Then perform standard merge. Time: O(n log n), Space: O(n) for merge operation.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Two Loops) | O(n²) | O(1) | Check all pairs directly |
| Merge Sort + Count | O(n log n) | O(n) | Count during merge operation |
| Binary Indexed Tree | O(n log n) | O(n) | Coordinate compression + BIT |
| Balanced BST | O(n log n) | O(n) | Insert and query for each element |

## Common Mistakes

### Mistake 1: Counting during merge instead of before
```python
# Wrong: Trying to count while merging sorted arrays
def reversePairs(nums):
    def mergeSort(arr):
        # ... split logic
        count = 0
        i = j = 0
        while i < len(left) and j < len(right):
            if left[i] > 2 * right[j]:
                count += len(left) - i  # Wrong timing!
                # ... merge logic
```

**Issue**: Counting must happen BEFORE merging, when you can use the sorted property efficiently. During merge, elements are being moved.

**Fix**: Separate counting phase before merging: count pairs first with two pointers, then merge separately.

### Mistake 2: Integer overflow with 2 * nums[j]
```python
# Wrong: Not handling overflow
def countPairs(left, right):
    count = 0
    j = 0
    for i in range(len(left)):
        while j < len(right) and left[i] > 2 * right[j]:
            # If right[j] is very large, 2 * right[j] may overflow
            j += 1
        count += j
```

**Issue**: When nums[j] is near the integer limit (2³¹ - 1), multiplying by 2 causes overflow.

**Fix**: Rearrange comparison: `left[i] // 2 > right[j]` or use proper overflow checks.

### Mistake 3: Not preserving array for merge
```python
# Wrong: Modifying array during counting
def mergeSort(nums, start, end):
    # ... count pairs
    # Wrong: counting modifies the array
    merge(nums, start, mid, end)
    # Now original structure is lost!
```

**Issue**: If counting modifies the array order, subsequent merge operations become incorrect.

**Fix**: Count first using read-only operations, then merge in a separate step with proper temporary arrays.

## Variations

| Variation | Difficulty | Description |
|-----------|----------|-------------|
| Count of Smaller After Self | Hard | Count elements smaller than current element to its right |
| Reverse Pairs (k multiplier) | Hard | Find pairs where nums[i] > k * nums[j] for given k |
| Count Inversions | Medium | Count pairs where nums[i] > nums[j] and i < j |
| Range Sum Query | Hard | Count range sums within a given interval |
| 2D Reverse Pairs | Hard | Extend to 2D matrix with row and column constraints |

## Practice Checklist

Track your progress on this problem:

**First Attempt**
- [ ] Solved independently (45 min time limit)
- [ ] Implemented merge sort approach
- [ ] All test cases passing
- [ ] Analyzed time and space complexity

**Spaced Repetition**
- [ ] Day 1: Resolve from memory
- [ ] Day 3: Solve with optimal approach
- [ ] Week 1: Implement without hints
- [ ] Week 2: Solve Count Inversions variation
- [ ] Month 1: Teach merge sort technique to someone else

**Mastery Goals**
- [ ] Can explain why merge sort works for counting
- [ ] Can handle edge cases (empty array, no pairs, overflow)
- [ ] Can extend to BIT or BST approach
- [ ] Can solve in under 35 minutes

**Strategy**: See [Divide and Conquer Patterns](../strategies/patterns/divide-and-conquer.md)
