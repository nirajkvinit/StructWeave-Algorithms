---
id: E126
old_id: I149
slug: intersection-of-two-arrays-ii
title: Intersection of Two Arrays II
difficulty: easy
category: easy
topics: ["array", "hash-table", "two-pointers", "sorting"]
patterns: ["frequency-counting"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E125", "E001", "E020"]
prerequisites: ["hash-table", "sorting", "two-pointers"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Intersection of Two Arrays II

## Problem

Given two integer arrays `nums1` and `nums2`, return an array containing their common elements, where each element appears as many times as it shows up in both input arrays. The frequency of each element in the output should match the minimum frequency of that element across both arrays.

This is different from a simple set intersection where each element appears only once. Here, if the value 2 appears three times in nums1 and twice in nums2, your result should contain 2 exactly twice (the minimum of 3 and 2). You're finding a multiset intersection where frequencies matter.

For example, with nums1 = [1, 2, 2, 1] and nums2 = [2, 2], the value 2 appears twice in both arrays, so it should appear twice in the result: [2, 2]. If nums1 = [4, 9, 5] and nums2 = [9, 4, 9, 8, 4], then 9 appears once in nums1 (limiting factor) and 4 appears once in nums1, giving [4, 9] or [9, 4] as valid outputs.

The order of elements in the result doesn't matter, but the count of each element must be correct. Be careful not to use sets, which would lose all frequency information.

## Why This Matters

Frequency-aware intersections appear in data analysis (finding common items with counts), inventory management (matching available stock across warehouses), and search ranking (counting shared keywords with multiplicity). This problem teaches you to track element frequencies using hash maps, a technique essential for counting problems, anagram detection, and frequency analysis. It also demonstrates trade-offs between hash-based O(n+m) solutions and sorting-based approaches that save memory. The problem is highly practical because many real-world datasets contain duplicates, and you often need to preserve frequency information rather than treating data as sets. It's a top interview question because it tests your understanding of hash tables, frequency counting, and the difference between set and multiset operations.

## Examples

**Example 1:**
- Input: `nums1 = [1,2,2,1], nums2 = [2,2]`
- Output: `[2,2]`
- Explanation: The value 2 appears twice in both arrays, so it appears twice in the result.

**Example 2:**
- Input: `nums1 = [4,9,5], nums2 = [9,4,9,8,4]`
- Output: `[4,9]`
- Explanation: 4 appears at least once in both arrays, and 9 appears at least once in both arrays. The answer [9,4] is also valid.

## Constraints

- 1 <= nums1.length, nums2.length <= 1000
- 0 <= nums1[i], nums2[i] <= 1000

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Hash Table Frequency Count
Think about counting how often each number appears in both arrays. What data structure is ideal for tracking frequency?

**Key Steps:**
1. Count frequency of each element in the first array
2. Iterate through second array and check counts
3. Collect elements that appear in both with proper frequency

**When to use:** When you need a straightforward O(n+m) solution with O(n) extra space.

### Intermediate Approach - Two Pointers
If arrays were sorted, could you use two pointers to find common elements?

**Key Steps:**
1. Sort both arrays if not already sorted
2. Use two pointers, one for each array
3. Advance pointers based on comparison

**When to use:** When minimizing space is important, or arrays are already sorted (O(1) extra space after sorting).

### Advanced Approach - Space-Optimized Follow-up
What if one array is much smaller than the other? Which array should you use for the hash table?

**Key Steps:**
1. Use the smaller array for the frequency map
2. Iterate through the larger array
3. Handle edge cases where arrays have very different sizes

**When to use:** When dealing with memory constraints or very large arrays.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash Table | O(n + m) | O(min(n, m)) | n, m are array lengths; best for unsorted |
| Two Pointers (after sort) | O(n log n + m log m) | O(1) or O(n + m) | Depends on sorting algorithm; best if pre-sorted |
| Brute Force | O(n * m) | O(1) | Not recommended; nested loops |

## Common Mistakes

### Mistake 1: Not handling duplicates correctly
```python
# Wrong - using a set loses frequency information
def intersect(nums1, nums2):
    set1 = set(nums1)
    set2 = set(nums2)
    return list(set1 & set2)  # Missing: [2,2] becomes [2]
```

**Why it's wrong:** Sets only track presence, not frequency. For nums1=[2,2,1], nums2=[2,2], the answer should be [2,2], not [2].

**Fix:** Use a hash table/dictionary to count frequencies, then output elements according to minimum frequency.

### Mistake 2: Modifying hash map incorrectly
```python
# Wrong - not decrementing count
def intersect(nums1, nums2):
    count = {}
    for num in nums1:
        count[num] = count.get(num, 0) + 1
    result = []
    for num in nums2:
        if num in count:
            result.append(num)  # Missing: decrement count
    return result
```

**Why it's wrong:** Without decrementing, you'll add the same element more times than it appears in nums1.

**Fix:** Decrement the count after adding to result, and only add if count > 0.

### Mistake 3: Two pointer approach without sorting
```python
# Wrong - using two pointers on unsorted arrays
def intersect(nums1, nums2):
    i, j = 0, 0
    result = []
    while i < len(nums1) and j < len(nums2):
        if nums1[i] == nums2[j]:  # Won't work if unsorted
            result.append(nums1[i])
            i += 1
            j += 1
    return result
```

**Why it's wrong:** Two pointer technique only works on sorted arrays. Unsorted arrays will miss many intersections.

**Fix:** Sort both arrays first, or use the hash table approach instead.

## Variations

| Variation | Difficulty | Description | Key Difference |
|-----------|-----------|-------------|----------------|
| Intersection I | Easy | Return unique elements only | Use sets instead of frequency counting |
| Sorted Array Intersection | Easy | Both arrays pre-sorted | Can skip sorting step; use two pointers directly |
| K-Array Intersection | Medium | Find intersection of k arrays | Generalize hash map or merge k arrays |
| Intersection with Stream | Medium | nums2 is a data stream | Cannot store entire nums2; process incrementally |

## Practice Checklist

Track your progress and spaced repetition:

- [ ] Initial attempt (after reading problem)
- [ ] Reviewed approach hints
- [ ] Implemented hash table solution
- [ ] Implemented two pointer solution
- [ ] All test cases passing
- [ ] Reviewed common mistakes
- [ ] Revisit after 1 day
- [ ] Revisit after 3 days
- [ ] Revisit after 1 week
- [ ] Can explain solution clearly to others

**Strategy Guide:** For pattern recognition and detailed techniques, see [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
