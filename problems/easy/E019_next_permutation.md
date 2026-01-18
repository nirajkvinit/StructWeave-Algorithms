---
id: E019
old_id: F031
slug: next-permutation
title: Next Permutation
difficulty: easy
category: easy
topics: ["array"]
patterns: ["two-pointers-opposite", "backtrack-permutation"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E046", "M020", "M165"]
prerequisites: ["arrays", "two-pointers"]
strategy_ref: ../../strategies/patterns/two-pointers.md
---
# Next Permutation

## Problem

Given an array of integers representing a permutation, rearrange the numbers into the next lexicographically larger permutation of those numbers. Lexicographic order means dictionary order - for example, [1,2,3] comes before [1,3,2], which comes before [2,1,3]. If the given arrangement is already the largest possible permutation (like [3,2,1]), wrap around and return the smallest permutation (like [1,2,3]).

For instance, if you have [1,2,3], the next permutation is [1,3,2]. If you have [3,2,1], there is no larger permutation, so you return [1,2,3]. The challenge is to perform this rearrangement in-place, modifying the original array without using extra space, and doing it efficiently in a single pass.

This isn't about generating all permutations - it's about finding the specific next one in sorted order. Think of it like incrementing a number: given 132, what's the next larger number using the same digits? It's 213.

## Why This Matters

This problem teaches a sophisticated in-place array manipulation technique that appears frequently in coding interviews and real systems. Understanding how to find the next permutation is foundational for:

- **Permutation algorithms**: Many combinatorial algorithms rely on generating permutations in lexicographic order, such as exploring all possible orderings of tasks or configurations.
- **Interview preparation**: This is a classic problem that tests your ability to identify patterns by examining examples, think through edge cases, and implement an elegant multi-step algorithm.
- **Optimization problems**: The technique of scanning from right to left to find a pivot point appears in many algorithm design scenarios, from string manipulation to game state transitions.

The algorithm itself is beautiful - it uses a two-pointer approach combined with pattern recognition to achieve O(n) time and O(1) space, demonstrating how careful analysis can lead to surprisingly efficient solutions.

## Examples

**Example 1:**
- Input: `nums = [1,2,3]`
- Output: `[1,3,2]`

**Example 2:**
- Input: `nums = [3,2,1]`
- Output: `[1,2,3]`

**Example 3:**
- Input: `nums = [1,1,5]`
- Output: `[1,5,1]`

## Constraints

- 1 <= nums.length <= 100
- 0 <= nums[i] <= 100

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding Lexicographic Order</summary>

Think about what makes one permutation "next" compared to another. Look at the rightmost elements first - when does a permutation become the "largest" possible with those digits? What pattern emerges when you examine the examples from right to left?

Key question: If you have [3,2,1], why is there no "next" permutation and we must return to [1,2,3]?

</details>

<details>
<summary>🎯 Hint 2: The Two-Phase Strategy</summary>

The solution involves identifying a pivot point and making a swap. First, scan from right to left to find where the ascending order breaks. Then, find the smallest element to the right that's larger than your pivot, swap them, and rearrange what's after the pivot.

Think: Why does reversing the suffix after the swap give you the next permutation?

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithm</summary>

```
1. Find pivot: Scan from right to left for first nums[i] < nums[i+1]
   - If no pivot found, array is descending → reverse entire array

2. Find swap candidate: From right, find first nums[j] > nums[pivot]

3. Swap nums[pivot] with nums[j]

4. Reverse elements from pivot+1 to end

Example [1,2,3]:
- Pivot at index 1 (value 2)
- Swap candidate at index 2 (value 3)
- Swap → [1,3,2]
- Nothing to reverse after position 2
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Generate All Permutations | O(n!) | O(n!) | Generate all, find current, return next |
| **Optimal (In-Place)** | **O(n)** | **O(1)** | Single pass to find pivot + swap + reverse |

## Common Mistakes

### 1. Sorting Instead of Reversing
```python
# WRONG: Sorting changes the order unnecessarily
nums[i+1:] = sorted(nums[i+1:])

# CORRECT: Reverse maintains smallest lexicographic order
nums[i+1:] = reversed(nums[i+1:])
```

### 2. Not Handling Edge Case
```python
# WRONG: Assuming pivot always exists
pivot = find_pivot()
swap(pivot, candidate)

# CORRECT: Check if array is already largest permutation
pivot = find_pivot()
if pivot == -1:
    reverse_entire_array()
    return
```

### 3. Finding Wrong Swap Candidate
```python
# WRONG: Taking the first element larger than pivot
for j in range(i+1, len(nums)):
    if nums[j] > nums[i]:
        swap(i, j)

# CORRECT: Find the rightmost element larger than pivot
for j in range(len(nums)-1, i, -1):
    if nums[j] > nums[i]:
        swap(i, j)
        break
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Previous Permutation | Find lexicographically smaller | Find pivot where nums[i] > nums[i+1], swap with largest smaller element, reverse suffix |
| k-th Permutation | Find k-th in sequence | Use factorial number system for direct calculation |
| Permutation Rank | Find position of permutation | Count smaller permutations using factorial decomposition |

## Practice Checklist

**Correctness:**
- [ ] Handles empty input
- [ ] Handles single element array
- [ ] Handles largest permutation (descending order)
- [ ] Handles duplicates correctly
- [ ] Returns correct format (in-place modification)

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 15 minutes
- [ ] Can discuss complexity analysis
- [ ] Can explain why reversing works

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations (previous permutation)
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Two Pointers](../../strategies/patterns/two-pointers.md)
