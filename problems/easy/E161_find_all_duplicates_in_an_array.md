---
id: E161
old_id: I241
slug: find-all-duplicates-in-an-array
title: Find All Duplicates in an Array
difficulty: easy
category: easy
topics: ["array", "hash-table"]
patterns: ["index-marking", "in-place-modification"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E163", "E287", "E448"]
prerequisites: ["array-indexing", "in-place-algorithms"]
strategy_ref: ../strategies/patterns/array-manipulation.md
---
# Find All Duplicates in an Array

## Problem

You have an integer array `nums` containing `n` elements. Every value in the array is in the range `[1, n]`, and importantly, no number appears more than twice. Your task is to find all numbers that appear exactly twice and return them in any order.

The challenge here is achieving this with strict efficiency requirements: your solution must run in **O(n) time** (linear time) and use only **O(1) extra space** (constant additional memory beyond the output array).

Here's the clever insight that makes this possible: since all values are in the range [1, n] and the array has exactly n positions, you can use the array indices themselves as a makeshift hash table. When you encounter value `x`, you can use position `x-1` to mark that you've seen `x` before. The question is: how do you mark a position without losing the information already stored there? The answer is to use the sign of the number as a flag, negating values to indicate "visited" positions.

This is a classic example of an in-place algorithm that exploits constraints on the input data to avoid using extra memory.

## Why This Matters

In-place array manipulation with index-as-hash is a powerful technique for space-constrained environments like embedded systems, mobile devices, or when processing massive datasets that barely fit in memory. This exact pattern appears in cycle detection (finding duplicates and missing numbers), array rearrangement problems, and memory-efficient data deduplication. The technique of using the sign bit as a Boolean flag is common in low-level systems programming and bit manipulation algorithms. Understanding how to leverage problem constraints (values in range [1,n], each appears at most twice) to reduce space complexity from O(n) to O(1) is crucial for optimization interviews and real systems where memory is expensive or limited. This problem also teaches you defensive programming: always use `abs()` when reading potentially-negated values, handle restoration of modified data, and carefully manage state changes to avoid corrupting your traversal.

## Examples

**Example 1:**
- Input: `nums = [4,3,2,7,8,2,3,1]`
- Output: `[2,3]`
- Note: Both 2 and 3 appear twice in the array.

**Example 2:**
- Input: `nums = [1,1,2]`
- Output: `[1]`
- Note: Only 1 appears twice.

**Example 3:**
- Input: `nums = [1]`
- Output: `[]`
- Note: No duplicates exist.

## Constraints

- n == nums.length
- 1 <= n <= 10⁵
- 1 <= nums[i] <= n
- Each element in nums appears **once** or **twice**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Hash Set
**Hint**: Use a hash set to track which numbers you've seen before.

**Key Ideas**:
- Create empty set for tracking
- Iterate through array
- If number already in set, add to result
- Otherwise, add number to set

**Why This Works**: Direct tracking of seen elements, easy to understand and implement.

### Intermediate Approach - Sorting
**Hint**: Sort the array first, then duplicates will be adjacent.

**Optimization**:
- Sort array in-place
- Iterate through sorted array
- If nums[i] == nums[i-1], it's a duplicate
- Add to result (check not already added)

**Trade-off**: O(n log n) time from sorting, but O(1) extra space if sorting is allowed.

### Advanced Approach - Index as Hash (Negative Marking)
**Hint**: Since elements are in range [1,n], use the array itself as a hash map by marking visited indices.

**Key Insight**:
- For each number x, use index (x-1) as its "bucket"
- When visiting x, negate nums[x-1] to mark as seen
- If nums[x-1] is already negative, x is a duplicate
- Use absolute value when reading to handle negatives

**Why This is Optimal**: O(n) time, O(1) space, meets problem constraints perfectly.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (nested loops) | O(n^2) | O(1) | Check each element against all others |
| Hash Set | O(n) | O(n) | Extra space for set |
| Sorting | O(n log n) | O(1) | In-place sort, but modifies array |
| Index Marking (Negative) | O(n) | O(1) | Optimal, meets all constraints |

## Common Mistakes

### Mistake 1: Not using absolute value when indexing
```
# WRONG - Using number directly after it might be negated
for num in nums:
    index = num - 1  # If num was negated, index is wrong!
    if nums[index] < 0:
        result.append(num)
    else:
        nums[index] = -nums[index]
```
**Why it fails**: After negating numbers, subsequent iterations use negative values as indices.

**Correct approach**: Always use `abs(num)` to get the original value: `index = abs(num) - 1`.

### Mistake 2: Forgetting to restore array after marking
```
# WRONG - Leaves array in modified state
for num in nums:
    index = abs(num) - 1
    if nums[index] < 0:
        result.append(abs(num))
    else:
        nums[index] = -nums[index]
return result  # Array is now full of negative numbers!
```
**Why it fails**: If caller expects array unchanged, this violates contract.

**Correct approach**: Either document that array is modified, or restore by negating back at the end.

### Mistake 3: Adding duplicate to result multiple times
```
# WRONG - Adding each time we see the duplicate
for num in nums:
    index = abs(num) - 1
    if nums[index] < 0:
        result.append(abs(num))  # Might add same duplicate twice!
    nums[index] = -abs(nums[index])
```
**Why it fails**: For [4,3,2,7,8,2,3,1], adds 2 and 3 multiple times if they appear > 2 times.

**Correct approach**: Only negate once when first seeing duplicate, or use different marking.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Find All Numbers Disappeared | Find missing numbers instead of duplicates | Easy |
| Find Single Duplicate | Only one duplicate exists, return it | Easy |
| Find Duplicates with K Distance | Duplicates must be within k indices apart | Medium |
| Count Duplicates | Return count of duplicate numbers, not the numbers | Easy |
| Find All Triplicates | Numbers that appear exactly 3 times | Medium |

## Practice Checklist

Track your progress as you master this problem:

- [ ] **Day 1**: Solve with hash set approach (allow 15 mins)
- [ ] **Day 2**: Implement index marking with negative numbers
- [ ] **Day 3**: Code without reference, handle edge cases
- [ ] **Week 2**: Verify O(1) space solution works correctly
- [ ] **Week 4**: Solve "Find All Numbers Disappeared" variation
- [ ] **Week 8**: Speed drill - solve in under 10 minutes

**Strategy**: See [Array Manipulation Patterns](../strategies/patterns/array-manipulation.md) for in-place modification techniques.
