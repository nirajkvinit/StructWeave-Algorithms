---
id: E083
old_id: I017
slug: contains-duplicate
title: Contains Duplicate
difficulty: easy
category: easy
topics: ["array", "hash-table"]
patterns: ["hash-set"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E084", "E136", "E217"]
prerequisites: ["hash-set", "array-traversal"]
strategy_ref: ../strategies/data-structures/hash-tables.md
---
# Contains Duplicate

## Problem

Given an array of integers `nums`, determine whether any value appears at least twice in the array. Return `true` if any value appears more than once, and return `false` if every element is distinct.

The challenge here is efficiency: you could compare every pair of elements, but that would take too long for large arrays. The key question is: **"Have I seen this number before?"** As you scan through the array, you need a fast way to check if the current number has already appeared.

Think about what data structure allows you to check membership in constant time. That's your clue to solving this efficiently in a single pass through the array.

## Why This Matters

This problem introduces **hash-based deduplication**, one of the most practical patterns in programming:

- **Data validation** - Checking for duplicate usernames, email addresses, or IDs
- **Database operations** - Enforcing uniqueness constraints
- **Stream processing** - Detecting repeated events or transactions in real-time
- **Cache management** - Tracking which items you've already processed

The hash set pattern you learn here appears in countless interview questions and production systems. It's also a gateway to understanding time-space tradeoffs: you can solve this with O(1) space by sorting first, or with O(n) space using a hash set for faster O(n) time.

## Examples

**Example 1:**
- Input: `nums = [1,2,3,1]`
- Output: `true`

**Example 2:**
- Input: `nums = [1,2,3,4]`
- Output: `false`

**Example 3:**
- Input: `nums = [1,1,1,3,3,4,3,2,4,2]`
- Output: `true`

## Constraints

- 1 <= nums.length <= 10⁵
- -10⁹ <= nums[i] <= 10⁹

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

The key question is: have we seen this number before? A data structure that efficiently tracks "seen" elements and checks membership in constant time would be ideal. Think about what structure allows O(1) lookup.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use a hash set to track numbers as you iterate through the array. For each number, check if it's already in the set. If yes, you've found a duplicate. If no, add it to the set and continue. This gives O(n) time and O(n) space. Alternatively, sort the array first and check adjacent elements.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**Hash Set Approach:**
1. Create empty set seen = {}
2. For each num in nums:
   - If num in seen:
     - Return true (duplicate found)
   - Add num to seen
3. Return false (no duplicates)

**Sort Approach:**
1. Sort nums
2. Check if nums[i] == nums[i+1] for any i
3. Return result

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Compare each pair of elements |
| **Hash Set** | **O(n)** | **O(n)** | Optimal for single pass |
| Sorting | O(n log n) | O(1)* | *O(1) if in-place sort; trades time for space |
| Set Length | O(n) | O(n) | Compare len(set) with len(list) |

## Common Mistakes

**Mistake 1: Using Nested Loops**

```python
# Wrong: O(n²) time complexity
def containsDuplicate(nums):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] == nums[j]:
                return True
    return False
```

```python
# Correct: O(n) with hash set
def containsDuplicate(nums):
    seen = set()
    for num in nums:
        if num in seen:
            return True
        seen.add(num)
    return False
```

**Mistake 2: Creating Full Set First**

```python
# Wrong: Not optimal - creates full set unnecessarily
def containsDuplicate(nums):
    return len(set(nums)) < len(nums)
    # Works but doesn't short-circuit on first duplicate
```

```python
# Correct: Early termination on first duplicate
def containsDuplicate(nums):
    seen = set()
    for num in nums:
        if num in seen:
            return True  # Exit immediately
        seen.add(num)
    return False
```

**Mistake 3: Modifying Input Without Consideration**

```python
# Wrong: Modifies input array (side effect)
def containsDuplicate(nums):
    nums.sort()  # Modifies original array
    for i in range(len(nums) - 1):
        if nums[i] == nums[i + 1]:
            return True
    return False
```

```python
# Correct: Either use hash set or copy before sorting
def containsDuplicate(nums):
    # Option 1: Hash set (better)
    return len(nums) != len(set(nums))

    # Option 2: Sort a copy if needed
    # sorted_nums = sorted(nums)
    # check adjacent in sorted_nums
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Contains Duplicate II | Find duplicate within k distance | Easy |
| Contains Duplicate III | Find duplicate within value and index range | Hard |
| Find All Duplicates | Return all duplicates in array | Medium |
| Single Number | Find the one non-duplicate element | Easy |
| Missing Number | Find missing number in sequence | Easy |

## Practice Checklist

- [ ] Day 1: Solve using hash set approach
- [ ] Day 2: Solve using sorting approach
- [ ] Day 3: Compare time/space tradeoffs of both solutions
- [ ] Week 1: Solve Contains Duplicate II variant
- [ ] Week 2: Explain when to use each approach
- [ ] Month 1: Apply hash set pattern to other problems

**Strategy**: See [Hash Table Pattern](../strategies/data-structures/hash-tables.md)
