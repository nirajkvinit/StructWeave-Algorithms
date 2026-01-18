---
id: E183
old_id: I295
slug: next-greater-element-i
title: Next Greater Element I
difficulty: easy
category: easy
topics: ["array", "monotonic-stack", "hash-table"]
patterns: ["monotonic-stack"]
estimated_time_minutes: 15
frequency: high
related_problems:
  - M059  # Next Greater Element II
  - M060  # Next Greater Element III
  - M061  # Daily Temperatures
prerequisites:
  - Stack operations
  - Hash table
  - Array traversal
strategy_ref: ../strategies/patterns/monotonic-stack.md
---
# Next Greater Element I

## Problem

For any element `x` in an array, the next greater element is defined as the first element appearing to its right that has a strictly larger value. If no such element exists, the result is `-1`. For example, in the array `[4, 5, 2, 25]`, the next greater element for 4 is 5, for 5 is 25, for 2 is 25, and for 25 is -1.

You're given two distinct integer arrays `nums1` and `nums2`, where `nums1` is a subset of `nums2` (every element in `nums1` appears exactly once in `nums2`, and all values are unique within each array). Your task is to find the next greater element for each element of `nums1`, but the search is performed within the context of `nums2`.

Specifically, for each element `nums1[i]`, locate where it appears in `nums2`, then find the first element to its right in `nums2` that is greater. Return an array of results corresponding to each element in `nums1`. The challenge is to do this efficiently, since the naive approach of searching for each element individually would be quite slow for large arrays.

## Why This Matters

This problem introduces the monotonic stack pattern, one of the most elegant techniques for solving "next greater/smaller element" problems efficiently. Monotonic stacks maintain elements in a specific order (increasing or decreasing), enabling O(n) solutions to problems that initially seem to require O(n²) nested loops. This pattern is surprisingly common in real applications.

You'll find monotonic stack logic in stock market analysis (finding the next day with higher/lower prices), compiler design (evaluating expressions and handling operator precedence), histogram algorithms (calculating maximum rectangular areas), and temperature forecasting systems (determining when conditions will improve). The technique also appears in numerous interview settings because it tests whether candidates can recognize when a specialized data structure dramatically improves efficiency. The subset query aspect adds another layer, teaching hash map usage for O(1) lookups—a combination of patterns that models real-world scenarios where you preprocess a large dataset once, then answer many specific queries quickly.

## Examples

**Example 1:**
- Input: `nums1 = [4,1,2], nums2 = [1,3,4,2]`
- Output: `[-1,3,-1]`
- Explanation: For each element in nums1:
- Value 4 appears in nums2 = [1,3,4,2]. No element to its right is larger, result is -1.
- Value 1 appears in nums2 = [1,3,4,2]. The next larger element is 3.
- Value 2 appears in nums2 = [1,3,4,2]. No element to its right is larger, result is -1.

**Example 2:**
- Input: `nums1 = [2,4], nums2 = [1,2,3,4]`
- Output: `[3,-1]`
- Explanation: For each element in nums1:
- Value 2 appears in nums2 = [1,2,3,4]. The next larger element is 3.
- Value 4 appears in nums2 = [1,2,3,4]. No element to its right is larger, result is -1.

## Constraints

- 1 <= nums1.length <= nums2.length <= 1000
- 0 <= nums1[i], nums2[i] <= 10⁴
- All integers in nums1 and nums2 are **unique**.
- All the integers of nums1 also appear in nums2.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Hint
For each element in nums1, find its position in nums2, then scan to the right in nums2 to find the first greater element. Store results in an array. This brute force approach works but has O(m * n) complexity where m and n are the lengths of the arrays.

### Intermediate Hint
Use a hash map to preprocess nums2. Traverse nums2 from right to left, using a monotonic decreasing stack to find the next greater element for each value. Store these mappings in the hash map. Then for each element in nums1, simply look up its next greater element in the map.

### Advanced Hint
Build a monotonic stack solution: traverse nums2 backwards, maintaining a stack of candidates for "next greater". For each element, pop all smaller elements from stack (they won't be next greater for anyone), then the stack top is the answer. Push current element to stack. Store in HashMap. Query with nums1. Time: O(m + n), Space: O(n).

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Nested Loops) | O(m * n) | O(1) | For each nums1 element, scan nums2 |
| Hash Map + Linear Scan | O(m * n) | O(n) | Hash positions, scan right for each query |
| Monotonic Stack (Forward) | O(m + n) | O(n) | Process nums2 left-to-right with stack |
| Monotonic Stack (Backward) | O(m + n) | O(n) | Process nums2 right-to-left, cleaner logic |

## Common Mistakes

### Mistake 1: Stack direction confusion
```python
# Wrong: Processing left-to-right makes logic complex
def nextGreaterElement(nums1, nums2):
    stack = []
    next_greater = {}
    for num in nums2:  # Left to right
        # Complex: need to handle when to pop and what to store
        while stack and stack[-1] < num:
            next_greater[stack.pop()] = num
        stack.append(num)
```

**Issue**: While this works, processing right-to-left is more intuitive: the stack naturally maintains candidates for "next greater" from the right.

**Fix**: Process nums2 backwards for cleaner logic. Current element's answer is on stack top.

### Mistake 2: Not handling elements with no next greater
```python
# Wrong: Missing default value for elements without next greater
def nextGreaterElement(nums1, nums2):
    next_greater = {}
    stack = []
    for num in reversed(nums2):
        while stack and stack[-1] <= num:
            stack.pop()
        next_greater[num] = stack[-1]  # Error if stack is empty!
        stack.append(num)
```

**Issue**: When stack is empty, there's no next greater element. Accessing stack[-1] raises an error.

**Fix**: Use `next_greater[num] = stack[-1] if stack else -1`.

### Mistake 3: Forgetting that nums1 is a subset query
```python
# Wrong: Building result for all nums2 elements
def nextGreaterElement(nums1, nums2):
    # ... build next_greater map correctly
    return [next_greater[num] for num in nums2]  # Wrong!
```

**Issue**: The result should only include elements from nums1 in the order they appear in nums1, not all of nums2.

**Fix**: Return `[next_greater[num] for num in nums1]`.

## Variations

| Variation | Difficulty | Description |
|-----------|----------|-------------|
| Next Greater Element II | Medium | Array is circular, can wrap around to find next greater |
| Next Greater Element III | Medium | Find next greater number formed by rearranging digits |
| Daily Temperatures | Medium | Find how many days until warmer temperature |
| Previous Greater Element | Easy | Find first greater element to the left instead of right |
| Next Smaller Element | Easy | Find next smaller instead of next greater |

## Practice Checklist

Track your progress on this problem:

**First Attempt**
- [ ] Solved independently (20 min time limit)
- [ ] Implemented monotonic stack solution
- [ ] All test cases passing
- [ ] Analyzed time and space complexity

**Spaced Repetition**
- [ ] Day 1: Resolve from memory
- [ ] Day 3: Solve with backward traversal
- [ ] Week 1: Implement without hints
- [ ] Week 2: Solve Next Greater Element II
- [ ] Month 1: Teach monotonic stack pattern to someone else

**Mastery Goals**
- [ ] Can explain why monotonic stack works
- [ ] Can handle edge cases (no greater element, all equal, descending order)
- [ ] Can extend to circular array
- [ ] Can solve in under 15 minutes

**Strategy**: See [Monotonic Stack Patterns](../strategies/patterns/monotonic-stack.md)
