---
id: M225
old_id: A003
slug: next-greater-element-ii
title: Next Greater Element II
difficulty: medium
category: medium
topics: ["array", "monotonic-stack"]
patterns: []
estimated_time_minutes: 30
frequency: high
related_problems: ["E189", "M739", "M556"]
prerequisites: ["stack", "monotonic-stack", "circular-array"]
strategy_ref: ../strategies/patterns/monotonic-stack.md
---
# Next Greater Element II

## Problem

Given an integer array `nums` that wraps around circularly, find the next greater number for each element. In a circular array, the element after the last position connects back to the first element, forming a continuous loop.

For each value at position `i`, the next greater number is the first element larger than `nums[i]` when searching to the right in circular fashion. If no such larger value exists anywhere in the array, use `-1` for that position.

Here's what "circular" means: After checking all elements to the right of position `i`, continue searching from the beginning of the array up to position `i-1`. For example, in array [3, 8, 4, 1, 2], for element 2 at the last position, we wrap around and search [3, 8, 4, 1] to find the next greater element, which is 3.

A monotonic stack is the key to solving this efficiently. Without it, you'd need O(n²) comparisons checking every element against all others. With a monotonic decreasing stack, you can solve it in O(n) time by processing each element at most twice.

Return an array where each position contains the next greater element for the corresponding position in the input array.

## Why This Matters

The monotonic stack pattern is a powerful technique appearing in diverse applications: stock price analysis (finding the next day with higher price), task scheduling (finding the next task with higher priority), and compiler design (parsing expressions with operator precedence). Understanding circular arrays is essential for buffer management in operating systems, round-robin scheduling algorithms, and circular queue implementations. This problem builds the foundation for more complex scenarios like finding next greater elements in linked lists, handling temperature forecasts with wrapping weeks, or analyzing cyclic time-series data. The ability to recognize when a monotonic stack can reduce O(n²) to O(n) is a valuable optimization skill applicable across many domains.

## Examples

**Example 1:**
- Input: `nums = [1,2,1]`
- Output: `[2,-1,2]`
- Explanation: For the first 1, moving right we find 2 which is greater. For 2, no larger value exists in the entire array. For the second 1, we wrap around circularly and find 2.

**Example 2:**
- Input: `nums = [1,2,3,4,3]`
- Output: `[2,3,4,-1,4]`

## Constraints

- 1 <= nums.length <= 10⁴
- -10⁹ <= nums[i] <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual Understanding</summary>

The circular nature means you need to check elements that come before each position. A monotonic stack is perfect for this - it maintains elements in decreasing order and helps find the next greater element efficiently. To handle the circular aspect, you can simulate going through the array twice by using modulo arithmetic.

</details>

<details>
<summary>🎯 Hint 2: Optimal Approach</summary>

Use a monotonic decreasing stack. Iterate through the array twice (using index % n for circular behavior). For each element, pop all smaller elements from the stack and set their next greater element to the current element. Push the current index onto the stack. Initialize result array with -1 for elements with no next greater element.

</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>

1. Initialize result array with -1 values and empty stack
2. Iterate i from 0 to 2*n - 1 (to handle circular):
   - Calculate actual index: idx = i % n
   - While stack not empty and nums[stack.top()] < nums[idx]:
     - Pop index from stack
     - Set result[popped_index] = nums[idx]
   - If i < n, push idx onto stack (only first pass)
3. Return result array

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Monotonic Stack | O(n) | O(n) | Each element pushed/popped once, stack size at most n |
| Brute Force | O(n²) | O(1) | Check all elements after each position circularly |
| Two-Pass with Stack | O(n) | O(n) | First pass left-to-right, second pass handles circular |

## Common Mistakes

### Mistake 1: Not handling circular array properly
```python
# Wrong: Only checks elements to the right, not circular
def nextGreaterElements(nums):
    n = len(nums)
    result = [-1] * n
    stack = []

    for i in range(n):
        while stack and nums[stack[-1]] < nums[i]:
            result[stack.pop()] = nums[i]
        stack.append(i)

    return result  # Missing: doesn't wrap around
```

```python
# Correct: Iterate twice to handle circular nature
def nextGreaterElements(nums):
    n = len(nums)
    result = [-1] * n
    stack = []

    # Iterate twice for circular behavior
    for i in range(2 * n):
        idx = i % n
        while stack and nums[stack[-1]] < nums[idx]:
            result[stack.pop()] = nums[idx]

        if i < n:  # Only push indices on first pass
            stack.append(idx)

    return result
```

### Mistake 2: Pushing indices on both passes
```python
# Wrong: Pushes indices during second pass too
def nextGreaterElements(nums):
    n = len(nums)
    result = [-1] * n
    stack = []

    for i in range(2 * n):
        idx = i % n
        while stack and nums[stack[-1]] < nums[idx]:
            result[stack.pop()] = nums[idx]

        stack.append(idx)  # Wrong: should only push on first pass

    return result
```

```python
# Correct: Only push indices during first pass
def nextGreaterElements(nums):
    n = len(nums)
    result = [-1] * n
    stack = []

    for i in range(2 * n):
        idx = i % n
        while stack and nums[stack[-1]] < nums[idx]:
            result[stack.pop()] = nums[idx]

        if i < n:  # Correct: only first n elements
            stack.append(idx)

    return result
```

### Mistake 3: Storing values instead of indices in stack
```python
# Wrong: Stores values, can't update result array properly
def nextGreaterElements(nums):
    n = len(nums)
    result = [-1] * n
    stack = []

    for i in range(2 * n):
        idx = i % n
        while stack and stack[-1] < nums[idx]:  # Stack has values
            val = stack.pop()
            # Problem: can't determine which index to update!
            result[?] = nums[idx]

        stack.append(nums[idx])
```

```python
# Correct: Store indices to update result array
def nextGreaterElements(nums):
    n = len(nums)
    result = [-1] * n
    stack = []

    for i in range(2 * n):
        idx = i % n
        while stack and nums[stack[-1]] < nums[idx]:
            popped_idx = stack.pop()  # Index, not value
            result[popped_idx] = nums[idx]  # Can update correctly

        if i < n:
            stack.append(idx)  # Store index

    return result
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Next Greater Element I | Easy | Find next greater for subset elements |
| Daily Temperatures | Medium | Find days until warmer temperature |
| Next Greater Element III | Medium | Find next greater permutation of number's digits |
| Online Stock Span | Medium | Calculate stock price span using monotonic stack |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] After 1 day (spaced repetition)
- [ ] After 3 days (spaced repetition)
- [ ] After 1 week (spaced repetition)
- [ ] Before interview (final review)

**Completion Status**: ⬜ Not Started | 🟨 In Progress | ✅ Mastered

**Strategy**: See [Monotonic Stack Pattern](../strategies/patterns/monotonic-stack.md)
