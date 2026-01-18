---
id: E228
old_id: A211
slug: find-smallest-letter-greater-than-target
title: Find Smallest Letter Greater Than Target
difficulty: easy
category: easy
topics: ["array", "string", "binary-search"]
patterns: ["binary-search"]
estimated_time_minutes: 15
frequency: high
prerequisites: ["binary-search", "array-traversal"]
related_problems: ["E035", "E278", "M034"]
strategy_ref: ../strategies/patterns/binary-search.md
---
# Find Smallest Letter Greater Than Target

## Problem

You're given a sorted array of characters `letters` arranged in ascending alphabetical order, along with a target character. Your goal is to find the smallest character in the array that comes after the target in alphabetical order.

The array is sorted in **non-decreasing** order, meaning duplicate characters are allowed. For example, `["c", "c", "f", "j"]` is valid. This matters because you might have multiple copies of the same letter, but you only care about finding any character that's strictly greater than your target.

Here's the interesting twist: if no character in the array is greater than your target, wrap around and return the first character in the array. Think of it as a circular array where after checking 'z', you loop back to 'a'. For instance, if your array is `["a", "b", "c"]` and your target is 'z', you'd return 'a'.

Important: you're looking for the character strictly greater than the target, not equal to it. So if your target is 'c' and your array contains 'c', you need to find the next letter after 'c', not 'c' itself.

## Why This Matters

This problem is a classic application of binary search on sorted data, a fundamental technique that reduces search time from O(n) to O(log n). Binary search appears everywhere: finding values in databases with billions of rows, implementing auto-complete in search boxes, locating insertion points in sorted collections, and optimizing game algorithms.

The circular wrap-around aspect makes this problem particularly relevant to modular arithmetic and cyclic data structures, which appear in round-robin scheduling, circular buffers in operating systems, and time-based calculations (think 12-hour clocks wrapping from 12 back to 1).

This is a high-frequency interview problem because it tests whether you can recognize when to use binary search, implement it correctly with proper boundary handling, and manage edge cases. Many candidates struggle with off-by-one errors in binary search, making this an excellent skill differentiator.

## Examples

**Example 1:**
- Input: `letters = ["c","f","j"], target = "a"`
- Output: `"c"`
- Explanation: Looking for the next character after 'a', we find 'c' is the first character in the sorted array that comes after it alphabetically.

**Example 2:**
- Input: `letters = ["c","f","j"], target = "c"`
- Output: `"f"`
- Explanation: Since we need a character strictly greater than 'c', the answer is 'f'.

**Example 3:**
- Input: `letters = ["x","x","y","y"], target = "z"`
- Output: `"x"`
- Explanation: No character in the array comes after 'z' alphabetically, so we wrap around to the beginning of the array.

## Constraints

- 2 <= letters.length <= 10⁴
- letters[i] is a lowercase English letter.
- letters is sorted in **non-decreasing** order.
- letters contains at least two different characters.
- target is a lowercase English letter.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Linear Approach
The simplest solution is to scan through the array from left to right. Since the array is sorted, the first character you find that's greater than the target is your answer. What happens if you reach the end without finding such a character?

### Tier 2: Binary Search Foundation
The array is sorted - this is a strong hint for binary search. Think about what you're searching for: the leftmost position where a character is strictly greater than target. How would you adjust your search space based on comparing the middle element to target?

### Tier 3: Handling the Wrap-Around
Binary search will help you find the insertion point. But what if all characters are less than or equal to target? The problem says to wrap around to the first element. How can you handle this edge case elegantly? Can modulo arithmetic help?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Linear Scan | O(n) | O(1) | Check each element until finding answer |
| Binary Search (Optimal) | O(log n) | O(1) | Divide search space in half each iteration |
| Modified Linear | O(n) | O(1) | Scan and track smallest candidate |

Where n = length of letters array

## Common Mistakes

### Mistake 1: Not Handling Wrap-Around
```python
# Wrong: Returns nothing when target >= all letters
def nextGreatestLetter(letters, target):
    for letter in letters:
        if letter > target:
            return letter
    # Missing return statement!

# Correct: Return first element as wrap-around
def nextGreatestLetter(letters, target):
    for letter in letters:
        if letter > target:
            return letter
    return letters[0]
```

### Mistake 2: Using >= Instead of >
```python
# Wrong: Returns letter equal to target
def nextGreatestLetter(letters, target):
    left, right = 0, len(letters) - 1
    while left <= right:
        mid = (left + right) // 2
        if letters[mid] >= target:  # Should be strictly greater
            right = mid - 1
        else:
            left = mid + 1
    return letters[left % len(letters)]

# Correct: Strictly greater than
if letters[mid] > target:
    right = mid - 1
else:
    left = mid + 1
```

### Mistake 3: Incorrect Binary Search Bounds
```python
# Wrong: May return wrong answer due to incorrect initialization
def nextGreatestLetter(letters, target):
    left, right = 0, len(letters)
    result = letters[0]
    while left < right:  # Incorrect loop condition
        mid = (left + right) // 2
        if letters[mid] > target:
            result = letters[mid]
            right = mid
        else:
            left = mid + 1
    return result

# Correct: Use modulo for clean wrap-around
left = 0
right = len(letters) - 1
while left <= right:
    mid = (left + right) // 2
    if letters[mid] > target:
        right = mid - 1
    else:
        left = mid + 1
return letters[left % len(letters)]
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Find Smallest Number Greater | Easy | Same problem but with integers instead of characters. |
| Find K Smallest Greater | Medium | Find the k-th smallest character greater than target. |
| Circular Array Search | Medium | General binary search in a rotated sorted array with wrap-around. |
| Range Query Version | Medium | Given multiple targets, find next greater for each efficiently. |
| Bidirectional Search | Easy | Find both next greater and previous smaller character. |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Solved with linear scan O(n)
- [ ] Optimized to binary search O(log n)
- [ ] Handled edge case: target greater than all letters
- [ ] Handled edge case: target equals last letter
- [ ] Handled edge case: all letters are the same
- [ ] Handled edge case: two-letter array
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Can explain approach to someone else

**Strategy**: See [Binary Search Patterns](../strategies/patterns/binary-search.md)
