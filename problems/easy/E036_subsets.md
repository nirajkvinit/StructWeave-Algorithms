---
id: E036
old_id: F078
slug: subsets
title: Subsets
difficulty: easy
category: easy
topics: ["array"]
patterns: ["backtrack-combination"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E037", "M020", "M019"]
prerequisites: ["recursion", "backtracking", "combinatorics"]
strategy_ref: ../../strategies/patterns/backtracking.md
---
# Subsets

## Problem

Given a set of distinct integers, generate all possible subsets (also called the power set). A subset can contain any combination of the original elements, including the empty set and the full set itself.

For example, if the input is [1, 2, 3], the output should include eight subsets: the empty set [], three single-element sets [1], [2], [3], three two-element sets [1,2], [1,3], [2,3], and one three-element set [1,2,3]. The order of subsets in the result doesn't matter, and the order of elements within each subset doesn't matter.

The key mathematical insight is that for a set with n elements, there are exactly 2ⁿ subsets, because each element has two choices: either it's included in a particular subset, or it's not. This exponential growth means that for even moderate input sizes (n=10), you're generating over 1,000 subsets.

You can approach this problem in multiple ways: iteratively building up subsets, using recursion with backtracking to explore all choices, or using bit manipulation where each number from 0 to 2ⁿ-1 represents a different subset.

## Why This Matters

Subset generation is fundamental to combinatorial optimization and appears throughout computer science. This problem introduces backtracking, a crucial algorithmic technique for exploring all possible configurations of a problem.

Real-world applications include feature selection in machine learning (which subset of features produces the best model), network security (testing all possible combinations of security settings), test case generation (creating all combinations of input conditions), and shopping cart optimization (all possible item combinations within a budget).

This is one of the most common backtracking problems in technical interviews because it clearly demonstrates the "make a choice, explore, then undo" pattern that applies to many constraint satisfaction and optimization problems. Understanding this pattern prepares you for more complex problems like N-Queens, Sudoku solvers, and graph coloring.

## Examples

**Example 1:**
- Input: `nums = [1,2,3]`
- Output: `[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]`

**Example 2:**
- Input: `nums = [0]`
- Output: `[[],[0]]`

## Constraints

- 1 <= nums.length <= 10
- -10 <= nums[i] <= 10
- All the numbers of nums are **unique**.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Mathematical Perspective</summary>

For a set with n elements, how many total subsets exist? Each element has exactly two choices: either it's included in a subset or it's not. Think about what this means for the total number of possibilities.

Can you represent each subset as a binary decision for each element?

</details>

<details>
<summary>🎯 Hint 2: Iterative Building</summary>

Start with the empty subset `[]`. As you process each element, you can create new subsets by adding that element to all existing subsets.

For example, with `[1,2,3]`:
- Start: `[[]]`
- Add 1: `[[], [1]]`
- Add 2: `[[], [1], [2], [1,2]]`
- Add 3: `[[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]]`

</details>

<details>
<summary>📝 Hint 3: Backtracking Algorithm</summary>

Use a recursive backtracking approach:

```
function backtrack(start_index, current_subset):
    add current_subset to results

    for i from start_index to end of nums:
        include nums[i] in current_subset
        backtrack(i + 1, current_subset)
        remove nums[i] from current_subset (backtrack)
```

This explores all possibilities by making a choice, exploring consequences, and undoing the choice.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Iterative Building | O(n × 2^n) | O(2^n) | Build subsets incrementally |
| **Backtracking** | **O(n × 2^n)** | **O(n)** | **Recursive stack depth; 2^n subsets** |
| Bit Manipulation | O(n × 2^n) | O(1) | Treat each subset as binary number |

## Common Mistakes

### 1. Not Including Empty Subset
```python
# WRONG: Missing the empty subset
def subsets(nums):
    result = []
    # Starts from index 0, missing []
    backtrack(0, [], result)
    return result

# CORRECT: Always include empty subset first
def subsets(nums):
    result = [[]]  # Start with empty subset
    backtrack(0, [], result)
    return result
```

### 2. Modifying Shared Reference
```python
# WRONG: All results point to same list
def backtrack(start, current, result):
    result.append(current)  # Appending reference
    for i in range(start, len(nums)):
        current.append(nums[i])
        backtrack(i + 1, current, result)
        current.pop()

# CORRECT: Create copy of current subset
def backtrack(start, current, result):
    result.append(current[:])  # Append a copy
    for i in range(start, len(nums)):
        current.append(nums[i])
        backtrack(i + 1, current, result)
        current.pop()
```

### 3. Starting Index Error
```python
# WRONG: Allows duplicate subsets
def backtrack(current, result):
    result.append(current[:])
    for i in range(len(nums)):  # Always starts from 0
        current.append(nums[i])
        backtrack(current, result)
        current.pop()

# CORRECT: Use start index to avoid duplicates
def backtrack(start, current, result):
    result.append(current[:])
    for i in range(start, len(nums)):  # Start from 'start'
        current.append(nums[i])
        backtrack(i + 1, current, result)
        current.pop()
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Subsets II (with duplicates) | Array may contain duplicates | Sort array first, skip duplicate elements at same level |
| Subsets of size k | Only return subsets of specific size | Add condition to only add when len(current) == k |
| Subsets sum to target | Only include subsets summing to target | Track running sum, prune when sum > target |
| Lexicographic order | Return subsets in sorted order | Sort input, generate in order, or sort results |

## Practice Checklist

**Correctness:**
- [ ] Handles empty input
- [ ] Includes empty subset in result
- [ ] Generates exactly 2^n subsets
- [ ] No duplicate subsets
- [ ] Returns correct format (list of lists)

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 10 minutes
- [ ] Can discuss time/space complexity
- [ ] Can explain both iterative and recursive approaches
- [ ] Can handle follow-up about duplicates

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Backtracking](../../strategies/patterns/backtracking.md)
