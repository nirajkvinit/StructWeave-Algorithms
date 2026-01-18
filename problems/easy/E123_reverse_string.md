---
id: E123
old_id: I143
slug: reverse-string
title: Reverse String
difficulty: easy
category: easy
topics: ["array", "string"]
patterns: ["two-pointers"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E124", "E125", "E007"]
prerequisites: ["arrays", "two-pointers", "in-place-operations"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Reverse String

## Problem

Write a function that reverses a string, where the string is represented as an array of characters `s`. The key constraint is that you must modify the input array in-place, meaning you cannot allocate a new array or use extra memory beyond a constant amount (O(1) space).

For example, if given the character array ["h", "e", "l", "l", "o"], your function should transform it to ["o", "l", "l", "e", "h"] by modifying the original array directly. You cannot create a reversed copy and return it.

"In-place" means you work with the original array without creating additional data structures proportional to the input size. You can use a few variables for swapping and indexing, but that's it. This constraint makes the problem more interesting than simply calling a built-in reverse function.

The classic solution uses the two-pointer technique: place one pointer at the start and another at the end, swap the characters they point to, then move the pointers toward each other until they meet. This ensures each character is swapped exactly once, giving you O(n) time with O(1) space.

## Why This Matters

String reversal is a fundamental operation in text processing, appearing in palindrome checking, data format conversions, and string manipulation utilities. This problem teaches the two-pointer pattern, one of the most versatile techniques in algorithm design. You'll use this pattern for in-place array modifications, palindrome problems, and many optimization challenges. The in-place constraint is particularly important because it reflects real-world scenarios where memory is limited or when working with large datasets that cannot be duplicated. This is one of the most common interview warmup questions because it tests whether you understand the difference between creating new data structures versus modifying existing ones efficiently.

## Examples

**Example 1:**
- Input: `s = ["h","e","l","l","o"]`
- Output: `["o","l","l","e","h"]`
- Explanation: The characters are reversed in position

**Example 2:**
- Input: `s = ["H","a","n","n","a","h"]`
- Output: `["h","a","n","n","a","H"]`
- Explanation: The palindromic pattern becomes reversed

## Constraints

- 1 <= s.length <= 10⁵
- s[i] is a <a href="https://en.wikipedia.org/wiki/ASCII#Printable_characters" target="_blank">printable ascii character.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Hint 1: Intuition (Beginner)
Reversing in-place means swapping elements. The first character should swap with the last, the second with the second-to-last, and so on. Use two pointers starting at opposite ends of the array. Move them toward each other, swapping elements at each step, until they meet in the middle.

### Hint 2: Optimization (Intermediate)
Use two pointers: left starting at 0 and right starting at len(s)-1. While left < right, swap s[left] and s[right], then increment left and decrement right. This ensures each element is swapped exactly once. The algorithm stops when pointers meet or cross, achieving O(n/2) = O(n) time with O(1) space.

### Hint 3: Implementation Details (Advanced)
Initialize left=0, right=len(s)-1. Loop while left < right: swap s[left] with s[right] using a temporary variable or tuple unpacking (s[left], s[right] = s[right], s[left]). Increment left and decrement right. The loop runs n/2 times. No extra space needed beyond the pointers. Alternative: use recursion with same two-pointer approach, but this uses O(n) call stack space.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Two pointers (iterative) | O(n) | O(1) | Optimal solution, in-place |
| Recursion with two pointers | O(n) | O(n) | Call stack space |
| Create reversed copy | O(n) | O(n) | Violates in-place requirement |
| Using built-in reverse | O(n) | O(1) | s.reverse() in Python |

## Common Mistakes

### Mistake 1: Swapping All Elements
```python
# Wrong: Swapping beyond the midpoint
def reverseString(s):
    for i in range(len(s)):  # Should only go to len(s)//2
        s[i], s[len(s)-1-i] = s[len(s)-1-i], s[i]
# Swaps twice, ending up with original string!
```
**Fix:** Only iterate to the midpoint: range(len(s)//2).

### Mistake 2: Using Extra Space
```python
# Wrong: Creating a new array
def reverseString(s):
    reversed_s = s[::-1]  # Creates new array
    s = reversed_s  # Only reassigns local variable, doesn't modify original
```
**Fix:** Modify the input array in-place using swaps.

### Mistake 3: Incorrect Pointer Movement
```python
# Wrong: Not updating both pointers
def reverseString(s):
    left, right = 0, len(s) - 1
    while left < right:
        s[left], s[right] = s[right], s[left]
        left += 1  # Forgot to decrement right!
```
**Fix:** Update both pointers: left += 1 and right -= 1.

## Variations

| Variation | Description | Difficulty | Key Difference |
|-----------|-------------|------------|----------------|
| Reverse String II | Reverse every 2k characters | Easy | Chunking logic added |
| Reverse Words in String | Reverse word order | Medium | Tokenization required |
| Reverse Vowels Only | Reverse only vowel positions | Easy | Conditional swapping |
| Palindrome Check | Check if string equals reverse | Easy | Comparison instead of modification |

## Practice Checklist

Study Plan:
- [ ] Day 1: Implement two-pointer solution, understand in-place concept
- [ ] Day 3: Handle edge cases (empty, single char), optimize
- [ ] Day 7: Solve variations (reverse words, vowels only)
- [ ] Day 14: Implement recursive version, compare trade-offs
- [ ] Day 30: Speed solve (< 5 minutes), explain to someone

Key Mastery Indicators:
- Can implement without creating extra arrays
- Understand why only n/2 swaps are needed
- Handle odd and even length arrays correctly
- Recognize two-pointer pattern in similar problems

**Strategy**: See [Two Pointers](../strategies/patterns/two-pointers.md)
