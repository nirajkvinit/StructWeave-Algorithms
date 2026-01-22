---
id: E262
old_id: A428
slug: n-repeated-element-in-size-2n-array
title: N-Repeated Element in Size 2N Array
difficulty: easy
category: easy
topics: ["array", "hash-table"]
patterns: ["hash-set"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E001", "E169", "E217"]
prerequisites: ["arrays", "hash-set"]
strategy_ref: ../prerequisites/hash-tables.md
---
# N-Repeated Element in Size 2N Array

## Problem

You are given an array `nums` with a very specific structure. The array has exactly `2 * n` elements total, and it contains exactly `n + 1` unique values. Here's the interesting part: one of those unique values appears exactly `n` times (that's half the array), while each of the other `n` values appears exactly once.

For example, if `n = 3`, the array has length 6 and might look like `[1, 2, 3, 3, 3, 5]` where the number 3 appears 3 times (half the array) and the numbers 1, 2, and 5 each appear once. Your task is to identify and return the element that appears `n` times.

This special structure creates an interesting mathematical property: since the repeated element takes up half the array, you're guaranteed to find a duplicate within a very short distance. This insight can lead to both a simple hash set solution and a more space-efficient approach.

## Why This Matters

This problem demonstrates the pigeonhole principle - a fundamental concept in computer science and mathematics stating that if you have more pigeons than pigeonholes, at least one pigeonhole must contain multiple pigeons. This principle underlies hash collision detection, duplicate detection in distributed systems, and various optimization algorithms. The problem also shows when hash sets provide the clearest solution versus when mathematical properties enable constant space solutions. Understanding when to trade space for simplicity versus optimizing for space constraints is crucial in systems with memory limitations, embedded systems, and high-performance computing. The pattern of detecting duplicates efficiently appears in data deduplication, finding cycles in linked lists, and stream processing.

## Examples

**Example 1:**
- Input: `nums = [1,2,3,3]`
- Output: `3`

**Example 2:**
- Input: `nums = [2,1,2,5,3,2]`
- Output: `2`

**Example 3:**
- Input: `nums = [5,1,5,2,5,3,5,4]`
- Output: `5`

## Constraints

- 2 <= n <= 5000
- nums.length == 2 * n
- 0 <= nums[i] <= 10⁴
- nums contains n + 1 **unique** elements and one of them is repeated exactly n times.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Conceptual Foundation
- One element appears n times, all others appear exactly once
- With 2n elements total, the repeated element takes up half the array
- Any duplicate you find must be the n-repeated element
- This insight leads to a very simple solution

### Tier 2: Step-by-Step Strategy
- Track elements you've seen using a hash set
- As you iterate through the array, check if current element is in the set
- If yes, you've found the repeated element (return it immediately)
- If no, add it to the set and continue
- Guaranteed to find within first n+1 elements (pigeonhole principle)

### Tier 3: Implementation Details
- Initialize empty set: `seen = set()`
- For each `num` in `nums`:
  - If `num in seen`: return `num`
  - Add `num` to seen: `seen.add(num)`
- Alternative constant space: check nearby positions (within 3 positions guaranteed to find duplicate)

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash Set | O(n) | O(n) | Simple and optimal for general case |
| Check Nearby Positions | O(n) | O(1) | Uses pigeonhole principle, max distance = 3 |
| Sorting | O(n log n) | O(1) or O(n) | Overkill, adjacent duplicates after sort |
| Count Frequency | O(n) | O(n) | Hash map to count, then find n occurrences |

**Optimal Solution**: Hash set achieves O(n) time. For O(1) space, check positions within distance 3.

## Common Mistakes

### Mistake 1: Using hash map instead of hash set
```python
# Wrong: unnecessary counting
count = {}
for num in nums:
    count[num] = count.get(num, 0) + 1
    if count[num] == 2:  # Could return earlier!
        return num

# Correct: just track presence
seen = set()
for num in nums:
    if num in seen:
        return num
    seen.add(num)
```

### Mistake 2: Overcomplicating with frequency tracking
```python
# Wrong: counting all frequencies first
from collections import Counter
count = Counter(nums)
n = len(nums) // 2
for num, freq in count.items():
    if freq == n:
        return num

# Correct: return immediately on first duplicate
seen = set()
for num in nums:
    if num in seen:
        return num
    seen.add(num)
```

### Mistake 3: Not utilizing the constraint
```python
# Suboptimal: not using the fact that element appears exactly n times
# The simple hash set approach already works, but we can optimize space:

# O(1) space solution using distance constraint
def repeatedNTimes(nums):
    # Repeated element must appear within distance 3
    for i in range(len(nums)):
        for j in range(1, 4):  # Check next 3 positions
            if i + j < len(nums) and nums[i] == nums[i + j]:
                return nums[i]
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Find all elements appearing n times | Easy | Return list instead of single element |
| K-repeated element in size k*n array | Medium | Generalized version with parameter k |
| Find element appearing more than n times | Medium | Element can appear any number > n times |
| Minimum deletions to remove duplicates | Easy | Count how many to delete (n-1 copies) |
| Return index of repeated element | Easy | Track index in hash map |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solved independently on first attempt
- [ ] Completed within 15 minutes
- [ ] Used hash set for O(n) solution
- [ ] Recognized early return optimization
- [ ] Understood O(1) space solution using distance constraint
- [ ] Wrote bug-free code on first submission
- [ ] Explained solution clearly to someone else
- [ ] Solved without hints after 1 day
- [ ] Solved without hints after 1 week
- [ ] Identified time and space complexity correctly

**Spaced Repetition Schedule**: Review on Day 1, Day 3, Day 7, Day 14, Day 30

**Strategy**: See [Hash Tables](../prerequisites/hash-tables.md)
