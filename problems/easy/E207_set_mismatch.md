---
id: E207
old_id: A112
slug: set-mismatch
title: Set Mismatch
difficulty: easy
category: easy
topics: ["array", "hash-table", "math"]
patterns: ["hash-map", "mathematical"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["array-traversal", "hash-table", "summation"]
related_problems: ["E041", "M287", "M442"]
strategy_ref: ../prerequisites/hash-tables.md
---
# Set Mismatch

## Problem

Imagine you have a set of numbers from 1 to n, but there's been a data corruption issue. One number appears twice in your array, and another number is completely missing. Your task is to identify both: which number was duplicated and which number is absent.

The input array `nums` should theoretically contain each integer from 1 to n exactly once, where n is the length of the array. Due to corruption, exactly one number appears twice while another is missing entirely. For example, if nums = [1, 2, 2, 4], the number 2 appears twice (it's the duplicate) and the number 3 is missing.

Return an array of two integers: the first element should be the duplicate number, and the second should be the missing number. So for the example above, you'd return [2, 3].

There are multiple approaches with different trade-offs. You can use a hash set to track which numbers you've seen (O(n) space), use mathematical formulas involving sums (O(1) space but risk of overflow), or use the array indices themselves as markers by negating values (O(1) space, modifies array). Each approach teaches different problem-solving techniques that appear in many related problems.

## Why This Matters

This problem demonstrates multiple fundamental algorithmic techniques: hash-based detection, mathematical reasoning with arithmetic formulas, and index-based marking using the constraint that values are in range [1, n]. These patterns appear frequently in array manipulation problems, especially those involving detecting duplicates, finding missing elements, or validating data integrity.

The mathematical approach teaches an important lesson about using known formulas (like the sum of 1 to n equals n × (n+1) / 2) combined with observed data to deduce missing information. This reasoning appears in checksum algorithms, error detection codes, RAID storage systems, and data validation pipelines.

The index-marking technique is particularly valuable because it achieves O(1) space complexity by cleverly using the input array itself for bookkeeping. This space optimization pattern appears in many constrained memory problems and is a favorite interview topic for demonstrating mastery of array manipulation.

## Examples

**Example 1:**
- Input: `nums = [1,2,2,4]`
- Output: `[2,3]`

**Example 2:**
- Input: `nums = [1,1]`
- Output: `[1,2]`

## Constraints

- 2 <= nums.length <= 10⁴
- 1 <= nums[i] <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Hash Table Approach
Use a hash map or set to track which numbers you've seen. As you iterate through the array, if you encounter a number already in your set, that's the duplicate. After processing all numbers, iterate from 1 to n to find which number wasn't added to the set - that's the missing number. What are the time and space complexities?

### Hint 2: Mathematical Approach
Consider that you know the expected sum of numbers 1 to n (using the formula n*(n+1)/2) and you can calculate the actual sum of the array. The difference reveals information about the missing and duplicate numbers. You'll also need the sum of the unique values in the array. How can you combine these insights?

### Hint 3: In-Place Marking (Optimal Space)
Since all numbers are in the range [1, n], you can use array indices as markers. For each number, mark the corresponding index by negating the value at that index. When you encounter an index that's already negative, you've found the duplicate. After marking, any index with a positive value indicates the missing number. Remember to use absolute values when indexing.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash Set | O(n) | O(n) | Simple and clear, extra space for set |
| Sorting | O(n log n) | O(1) | Sort then scan for duplicate/missing |
| Mathematical | O(n) | O(1) | Uses sum formulas, risk of overflow |
| Index Marking | O(n) | O(1) | Optimal, modifies input array |
| XOR Bit Manipulation | O(n) | O(1) | Complex but elegant solution |

## Common Mistakes

### Mistake 1: Using mathematical approach without handling duplicates correctly
```
// Wrong: Simple difference doesn't give both numbers
expectedSum = n * (n + 1) / 2
actualSum = sum(nums)
missing = expectedSum - actualSum  // This is wrong!
```
**Why it's wrong**: The difference `expectedSum - actualSum` gives you `missing - duplicate`, not the individual values. You need additional information to separate them.

**Correct approach**: Use both sum and sum of squares, or combine with another technique to isolate both values.

### Mistake 2: Index marking without using absolute values
```
// Wrong: Not using absolute value for indexing
for (int num : nums) {
    if (nums[num - 1] < 0) {
        duplicate = num;
    } else {
        nums[num - 1] = -nums[num - 1];  // num might already be negative!
    }
}
```
**Why it's wrong**: After the first negation, `num` itself might be negative, leading to incorrect indexing.

**Correct approach**: Always use `abs(num)` when accessing indices: `nums[abs(num) - 1]`.

### Mistake 3: Not considering integer overflow in sum calculations
```
// Wrong: Using int for sum with large n
int expectedSum = n * (n + 1) / 2;  // May overflow
```
**Why it's wrong**: With n up to 10^4, the product n*(n+1) can exceed int limits (2^31 - 1).

**Correct approach**: Use long for intermediate calculations or apply the division before multiplication when possible.

## Variations

| Variation | Difference | Difficulty Increase |
|-----------|------------|---------------------|
| Find duplicate in array of n+1 elements | Only find duplicate, no missing number | None (simpler) |
| Find all duplicates in array | Multiple numbers appear twice | Medium (requires list output) |
| Find two missing numbers | Two numbers missing instead of one | Medium (more complex math) |
| Find duplicate and missing in stream | Numbers arrive in sequence | Hard (online algorithm) |
| K missing and K duplicates | Generalized to k numbers | Hard (requires different approach) |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solve using hash set approach
- [ ] Optimize to mathematical approach
- [ ] Implement index marking technique
- [ ] Handle edge cases (n=2, consecutive duplicates)
- [ ] Implement without bugs on first try
- [ ] Explain all three approaches clearly
- [ ] Test with [1,1], [2,2], [1,2,2,4]
- [ ] Solve in under 15 minutes
- [ ] Compare trade-offs between approaches
- [ ] Revisit after 3 days (spaced repetition)
- [ ] Revisit after 1 week (spaced repetition)
- [ ] Solve the "find all duplicates" variation

**Strategy**: See [Hash Table Patterns](../prerequisites/hash-tables.md)
