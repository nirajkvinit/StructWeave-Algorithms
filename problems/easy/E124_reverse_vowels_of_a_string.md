---
id: E124
old_id: I144
slug: reverse-vowels-of-a-string
title: Reverse Vowels of a String
difficulty: easy
category: easy
topics: ["string"]
patterns: ["two-pointers"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E123", "E125", "E001"]
prerequisites: ["strings", "two-pointers", "sets"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Reverse Vowels of a String

## Problem

Given a string `s`, reverse only the vowel characters while keeping all other characters in their original positions. A vowel is any of these letters: 'a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U'. Note that both lowercase and uppercase vowels should be considered, and they may appear multiple times throughout the string.

For example, in the string "hello", the vowels are 'e' and 'o' at positions 1 and 4. Reversing just these vowels gives "holle" where 'o' moves to position 1 and 'e' moves to position 4, while 'h', 'l', 'l' stay in their original positions.

This is a twist on the classic string reversal problem. Instead of reversing the entire string, you selectively reverse only certain characters. The challenge is doing this efficiently in a single pass through the string using the two-pointer technique.

The solution adapts the two-pointer approach: start with pointers at both ends, but only swap when both pointers point to vowels. When a pointer points to a consonant, skip it by advancing that pointer. This ensures vowels are swapped with other vowels while consonants remain untouched.

## Why This Matters

This problem teaches conditional two-pointer manipulation, where you selectively process certain elements based on criteria. It appears in text processing systems, data sanitization pipelines, and string transformation utilities. The pattern of "move pointers based on conditions" is crucial for solving problems like partition algorithms, removing elements in-place, and various filtering operations. It's a popular interview question because it tests whether you can adapt the basic two-pointer pattern with conditional logic. You'll also practice efficient character lookup using sets, string immutability handling, and case-sensitive character matching, which are fundamental skills for text processing in any language.

## Examples

**Example 1:**
- Input: `s = "hello"`
- Output: `"holle"`
- Explanation: The vowels 'e' and 'o' swap positions

**Example 2:**
- Input: `s = "algoprac"`
- Output: `"alogprac"`
- Explanation: The vowels 'a', 'o', 'a' are reversed to 'a', 'o', 'a'

## Constraints

- 1 <= s.length <= 3 * 10⁵
- s consist of **printable ASCII** characters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Hint 1: Intuition (Beginner)
This is similar to reversing a string, but you only swap vowels. Use the two-pointer technique: one pointer starts at the beginning, another at the end. Move both pointers inward. When both pointers point to vowels, swap them. When a pointer points to a consonant, skip it by moving that pointer. Continue until the pointers meet.

### Hint 2: Optimization (Intermediate)
Convert the string to a mutable array (strings are immutable in many languages). Create a set of vowels for O(1) lookup: {'a','e','i','o','u','A','E','I','O','U'}. Use left and right pointers. Advance left while s[left] is not a vowel. Advance right while s[right] is not a vowel. When both point to vowels, swap and move both pointers. This is O(n) time with O(n) space for the array.

### Hint 3: Implementation Details (Advanced)
Initialize vowels = set('aeiouAEIOU'), convert s to list (for mutability), left=0, right=len(s)-1. While left < right: if s[left] not in vowels, increment left; elif s[right] not in vowels, decrement right; else swap s[left] and s[right], increment left, decrement right. Return ''.join(s). Each character is visited at most once, giving O(n) time complexity.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Two pointers with set lookup | O(n) | O(n) | Convert to array for mutability |
| Collect vowels then reconstruct | O(n) | O(n) | Extract vowels, reverse, rebuild string |
| Two-pass approach | O(n) | O(n) | Find vowel positions, then swap |
| Brute force (find all vowels) | O(n^2) | O(n) | Inefficient repeated searching |

## Common Mistakes

### Mistake 1: Forgetting Case Sensitivity
```python
# Wrong: Only checking lowercase vowels
def reverseVowels(s):
    vowels = set('aeiou')  # Missing uppercase!
    # ... logic ...
```
**Fix:** Include both cases: vowels = set('aeiouAEIOU').

### Mistake 2: String Immutability
```python
# Wrong: Trying to modify string directly (in many languages)
def reverseVowels(s):
    left, right = 0, len(s) - 1
    # ...
    s[left], s[right] = s[right], s[left]  # Error in Python!
```
**Fix:** Convert to list first: s = list(s), then join at the end.

### Mistake 3: Not Advancing Both Pointers Correctly
```python
# Wrong: Forgetting to advance pointers after swap
def reverseVowels(s):
    # ...
    if s[left] in vowels and s[right] in vowels:
        s[left], s[right] = s[right], s[left]
        # Forgot to advance left and right!
```
**Fix:** After swapping, increment left and decrement right to continue.

## Variations

| Variation | Description | Difficulty | Key Difference |
|-----------|-------------|------------|----------------|
| Reverse Consonants | Reverse only consonants | Easy | Flip the condition |
| Reverse Alphanumeric | Reverse only letters and digits | Easy | Different character set |
| Move Vowels to End | Rearrange vowels to end | Easy | Partitioning instead of reversing |
| Count Vowel Swaps | Count swaps needed | Easy | Counting instead of performing |

## Practice Checklist

Study Plan:
- [ ] Day 1: Implement two-pointer solution with vowel set
- [ ] Day 3: Handle case sensitivity, test edge cases
- [ ] Day 7: Solve consonant/alphanumeric variations
- [ ] Day 14: Optimize space if possible, solve without hints
- [ ] Day 30: Speed solve (< 10 minutes), explain pattern

Key Mastery Indicators:
- Can identify vowels including both cases
- Use set for O(1) vowel lookup
- Apply two-pointer technique with conditional advancement
- Handle string immutability in different languages

**Strategy**: See [Two Pointers](../strategies/patterns/two-pointers.md)
