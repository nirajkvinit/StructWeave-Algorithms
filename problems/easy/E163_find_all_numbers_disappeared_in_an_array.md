---
id: E163
old_id: I247
slug: find-all-numbers-disappeared-in-an-array
title: Find All Numbers Disappeared in an Array
difficulty: easy
category: easy
topics: ["array", "hash-table"]
patterns: ["index-marking", "in-place-modification"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E161", "E287", "E448"]
prerequisites: ["array-indexing", "in-place-algorithms"]
strategy_ref: ../strategies/patterns/array-manipulation.md
---
# Find All Numbers Disappeared in an Array

## Problem

You are given an array `nums` containing `n` integers, where each value is guaranteed to fall between `1` and `n` inclusive. This special property creates an interesting constraint: the values themselves can serve as array indices (with a small adjustment). Your task is to identify which numbers from the range `1` to `n` are completely missing from the array.

For instance, if you have an array of length 5, it should ideally contain all numbers from 1 to 5. However, some numbers might appear multiple times while others are absent. You need to return all the missing numbers. Note that the array may contain duplicates, which means some positions in the range `1` to `n` won't be represented at all.

The challenge becomes more interesting when you consider space constraints. While you could use extra data structures to track which numbers you've seen, can you solve this by cleverly using the array itself as your tracking mechanism? Think about how the relationship between array values and array indices might help you mark which numbers are present.

## Why This Matters

This problem appears frequently in technical interviews because it tests a crucial skill: recognizing when the input itself can be repurposed as auxiliary storage. In production systems, in-place algorithms are valuable when memory is limited or when processing large datasets that don't fit in RAM. This pattern of using index-value relationships appears in various real-world scenarios: detecting duplicate user IDs in logs, finding gaps in sequential transaction numbers, or identifying missing packet sequence numbers in network protocols.

The index-marking technique you'll learn here is a foundational pattern that extends to many similar problems involving permutations, cycles, and missing elements. Mastering this approach builds intuition for transforming constraints into advantages, a key problem-solving skill that separates average solutions from elegant ones. Additionally, this problem reinforces understanding of array bounds, modular arithmetic for wraparound indices, and the subtle distinction between mutating data in-place versus preserving original values.

## Examples

**Example 1:**
- Input: `nums = [4,3,2,7,8,2,3,1]`
- Output: `[5,6]`

**Example 2:**
- Input: `nums = [1,1]`
- Output: `[2]`

## Constraints

- n == nums.length
- 1 <= n <= 10⁵
- 1 <= nums[i] <= n

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Hash Set Comparison
**Hint**: Create a set of all numbers 1 to n, then remove numbers present in array.

**Key Ideas**:
- Create set with numbers 1 through n
- Iterate through nums, remove each from set
- Remaining numbers in set are missing
- Convert set to list and return

**Why This Works**: Direct set difference operation, easy to understand.

### Intermediate Approach - Boolean Array Marking
**Hint**: Use a separate boolean array to track which numbers are present.

**Optimization**:
- Create boolean array of size n+1, initially all False
- For each num in nums, set seen[num] = True
- Iterate 1 to n, collect indices where seen[i] is False

**Trade-off**: O(n) time and space, clearer than set operations.

### Advanced Approach - In-Place Negative Marking
**Hint**: Use the array itself as a hash map by negating values at indices corresponding to seen numbers.

**Key Insight**:
- For each number x in array, mark index (x-1) by negating nums[x-1]
- After marking, positive values indicate missing numbers
- Index i+1 is missing if nums[i] > 0

**Why This is Optimal**: O(n) time, O(1) space (excluding output), meets problem constraints.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (check each 1..n) | O(n^2) | O(1) | Search array for each number |
| Hash Set | O(n) | O(n) | Extra space for set |
| Boolean Array | O(n) | O(n) | Clear logic, extra array |
| In-Place Marking | O(n) | O(1) | Optimal, uses negative marking |

## Common Mistakes

### Mistake 1: Not using absolute value when marking
```
# WRONG - Using value directly without abs()
for num in nums:
    index = num - 1  # num might already be negative!
    nums[index] = -abs(nums[index])
```
**Why it fails**: If num was already negated in previous iteration, index calculation is wrong.

**Correct approach**: Always use `abs(num)` to get original value: `index = abs(num) - 1`.

### Mistake 2: Checking wrong sign when finding missing numbers
```
# WRONG - Looking for negative values
for i in range(len(nums)):
    if nums[i] < 0:  # Should be > 0
        result.append(i + 1)
```
**Why it fails**: Negative values indicate numbers that ARE present, not missing.

**Correct approach**: Missing numbers correspond to indices with positive values after marking.

### Mistake 3: Off-by-one index mapping
```
# WRONG - Using num as index directly
for num in nums:
    nums[num] = -abs(nums[num])  # Should be nums[num-1]
# or
for i in range(len(nums)):
    if nums[i] > 0:
        result.append(i)  # Should be i+1
```
**Why it fails**: Numbers are 1 to n, but indices are 0 to n-1, need mapping.

**Correct approach**: Map number x to index (x-1), and index i back to number (i+1).

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Find All Duplicates | Find numbers appearing twice instead of missing | Easy |
| Find Single Missing Number | Only one number is missing | Easy |
| First Missing Positive | Find smallest positive missing number | Hard |
| Missing Number in Arithmetic Progression | Missing number forms arithmetic sequence | Easy |
| Find Two Missing Numbers | Exactly two numbers missing | Medium |

## Practice Checklist

Track your progress as you master this problem:

- [ ] **Day 1**: Solve with hash set approach (allow 15 mins)
- [ ] **Day 2**: Implement in-place negative marking solution
- [ ] **Day 3**: Code without reference, verify index mapping
- [ ] **Week 2**: Test edge cases: all present, all missing, single element
- [ ] **Week 4**: Solve "Find All Duplicates" variation
- [ ] **Week 8**: Speed drill - solve in under 10 minutes

**Strategy**: See [Array Manipulation Patterns](../strategies/patterns/array-manipulation.md) for in-place marking techniques.
