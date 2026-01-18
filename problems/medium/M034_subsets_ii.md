---
id: M034
old_id: F090
slug: subsets-ii
title: Subsets II
difficulty: medium
category: medium
topics: ["array"]
patterns: ["backtrack-combination"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M078", "M034", "M040"]
prerequisites: ["backtracking", "duplicate-handling", "sorting"]
strategy_ref: ../strategies/patterns/backtracking.md
---
# Subsets II

## Problem

Given an array that may contain duplicate elements, generate all possible subsets (also called the power set). A subset is any combination of elements from the array, including the empty set and the full set itself. For example, if the input is [1,2,2], valid subsets include [], [1], [2], [1,2], [2,2], and [1,2,2] - but crucially, you should not include [2] twice or [1,2] twice even though there are two 2's in the input. The challenge is handling duplicates: if you naively generate all subsets, you'll create duplicates in your output when the input has repeated values. For instance, choosing the first 2 and choosing the second 2 would both produce the subset [2], which should appear only once in the result. You need a strategy to systematically skip duplicate subsets while ensuring you still generate all unique combinations, including those that use repeated elements multiple times like [2,2].

## Why This Matters

Subset generation with duplicate handling is fundamental to combinatorial search problems found in configuration management, feature selection in machine learning, and optimization problems where you explore solution spaces. This pattern appears when generating test case combinations, selecting representative samples from datasets with repeated values, or finding all ways to partition resources where some resources are identical. The technique of sorting first and then skipping duplicates during backtracking is a critical pattern that extends to permutation generation, combination problems, and even some dynamic programming scenarios. In interviews, this problem tests your ability to modify standard backtracking templates to handle constraints - a skill that's essential for tackling harder combinatorial problems. Understanding when to skip versus when to include duplicate elements prevents exponential blowup in search spaces.

## Examples

**Example 1:**
- Input: `nums = [1,2,2]`
- Output: `[[],[1],[1,2],[1,2,2],[2],[2,2]]`

**Example 2:**
- Input: `nums = [0]`
- Output: `[[],[0]]`

## Constraints

- 1 <= nums.length <= 10
- -10 <= nums[i] <= 10

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

The key challenge is handling duplicates. If you sort the array first, all duplicate values will be adjacent. When backtracking, if you skip choosing an element at position i, you should also skip all subsequent duplicate values to avoid generating duplicate subsets.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use backtracking with duplicate detection. Sort the array first. During backtracking, for each position, if the current element equals the previous element and you didn't use the previous element, skip the current one. This ensures each unique subset is generated exactly once.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

Pseudocode approach:
1. Sort nums array
2. result = []
3. current = []
4. Define backtrack(start):
   - Add copy of current to result
   - For i from start to len(nums):
     - If i > start and nums[i] == nums[i-1]: continue (skip duplicates)
     - Add nums[i] to current
     - Recurse: backtrack(i + 1)
     - Remove nums[i] from current
5. Call backtrack(0)
6. Return result

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Bit Manipulation with Set | O(n * 2^n) | O(n * 2^n) | Generate all, use set to deduplicate |
| **Backtracking with Skip** | **O(n * 2^n)** | **O(n)** | Optimal, avoids generating duplicates |

## Common Mistakes

### 1. Not sorting array first
```python
# WRONG: Can't detect adjacent duplicates if not sorted
def subsetsWithDup(nums):
    result = []
    def backtrack(start, current):
        result.append(current[:])
        for i in range(start, len(nums)):
            if i > start and nums[i] == nums[i-1]:  # Won't work if unsorted
                continue

# CORRECT: Sort first
def subsetsWithDup(nums):
    nums.sort()  # Essential for duplicate detection
    result = []
    # ... backtracking
```

### 2. Wrong duplicate skip condition
```python
# WRONG: Skips first occurrence of duplicate
if i > 0 and nums[i] == nums[i-1]:  # Should be i > start
    continue

# CORRECT: Only skip duplicates within same level
if i > start and nums[i] == nums[i-1]:
    continue
```

### 3. Not making a copy when adding to result
```python
# WRONG: All subsets point to same list
result.append(current)  # current will be modified later

# CORRECT: Add a copy
result.append(current[:])
# or
result.append(list(current))
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Subsets without duplicates | No duplicates in input | Remove duplicate skip logic, no need to sort |
| K-size subsets with duplicates | Only subsets of size k | Add size check in backtracking |
| Subset sum with duplicates | Find subsets summing to target | Add sum tracking, skip duplicates same way |
| Permutations with duplicates | Order matters | Use different skip condition, track used elements |

## Practice Checklist

- [ ] Handles empty/edge cases (single element, all duplicates, no duplicates)
- [ ] Can explain approach in 2 min
- [ ] Can code solution in 15 min
- [ ] Can discuss time/space complexity
- [ ] Understands why sorting is necessary

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Backtracking Pattern](../../strategies/patterns/backtracking.md)
