---
id: M073
old_id: F176
slug: reverse-words-in-a-string-ii
title: Reverse Words in a String II
difficulty: medium
category: medium
topics: ["string", "two-pointers"]
patterns: ["two-pointers"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M068", "M069", "E001"]
prerequisites: ["string-manipulation", "two-pointers", "in-place-reversal"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Reverse Words in a String II

## Problem

Given a character array representing a sentence where words are separated by single spaces, reverse the order of the words in-place without using extra space. For example, transform "the sky is blue" into "blue is sky the" by rearranging characters within the original array. The constraint "in-place" means you can only use O(1) additional memory - no creating new arrays or strings. Each word is separated by exactly one space, with no leading or trailing spaces, simplifying boundary detection. Think about a two-step approach: what if you first reversed the entire array, then fixed each individual word? Consider edge cases like single-word inputs, single-character words, and arrays with just one character. This is a low-level string manipulation problem that operates directly on character arrays, which is how strings are stored in languages like C and Java.

## Why This Matters

In-place string manipulation is crucial in memory-constrained environments like embedded systems, microcontrollers, and mobile applications where allocating new buffers is expensive. Text editors and word processors use these techniques when implementing undo/redo functionality on large documents without duplicating content. Network protocol parsers reverse and reformat packet headers in-place to avoid allocation overhead in high-throughput scenarios. Command-line shells and terminal emulators manipulate input buffers directly using similar reversal techniques. The two-pointer reversal pattern you learn here applies broadly to array rotation, string permutation, and even linked list reversal problems. Understanding character-level manipulation helps you optimize string operations in performance-critical code paths and prepares you for systems programming where direct memory manipulation is required.

## Examples

**Example 1:**
- Input: `s = ["t","h","e"," ","s","k","y"," ","i","s"," ","b","l","u","e"]`
- Output: `["b","l","u","e"," ","i","s"," ","s","k","y"," ","t","h","e"]`

**Example 2:**
- Input: `s = ["a"]`
- Output: `["a"]`

## Constraints

- 1 <= s.length <= 10⁵
- s[i] is an English letter (uppercase or lowercase), digit, or space ' '.
- There is **at least one** word in s.
- s does not contain leading or trailing spaces.
- All the words in s are guaranteed to be separated by a single space.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Two-Step Reversal</summary>

Notice that reversing the entire array gives you words in correct order but each word is reversed. "the sky" → "yks eht". What if you reverse the entire array first, then reverse each individual word?

</details>

<details>
<summary>🎯 Hint 2: In-Place Two Pointers</summary>

Use two pointers to reverse:
1. Reverse entire array with left/right pointers
2. Reverse each word individually using two pointers to find word boundaries (spaces)

This achieves O(1) space since you only swap characters in the original array.

</details>

<details>
<summary>📝 Hint 3: Implementation Steps</summary>

```python
def reverseWords(s):
    # Step 1: Reverse entire array
    reverse(s, 0, len(s) - 1)

    # Step 2: Reverse each word
    start = 0
    for i in range(len(s)):
        if s[i] == ' ':
            reverse(s, start, i - 1)
            start = i + 1
    # Don't forget last word
    reverse(s, start, len(s) - 1)

def reverse(s, left, right):
    while left < right:
        s[left], s[right] = s[right], s[left]
        left += 1
        right -= 1
```

Time: O(n)
Space: O(1)

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Split + Reverse + Join | O(n) | O(n) | Creates new array/string |
| **Two-Pass Reversal** | **O(n)** | **O(1)** | Reverse all, then reverse each word |

## Common Mistakes

### 1. Using Extra Space

```python
# WRONG: Creates new data structures
def reverseWords(s):
    words = ''.join(s).split()
    words.reverse()
    result = ' '.join(words)
    return list(result)

# CORRECT: In-place reversal
def reverseWords(s):
    reverse(s, 0, len(s) - 1)
    # ... reverse each word in place
```

### 2. Forgetting Last Word

```python
# WRONG: Misses last word (no trailing space)
def reverseWords(s):
    reverse(s, 0, len(s) - 1)
    start = 0
    for i in range(len(s)):
        if s[i] == ' ':
            reverse(s, start, i - 1)
            start = i + 1
    # Missing: reverse(s, start, len(s) - 1)

# CORRECT: Handle last word after loop
def reverseWords(s):
    # ... loop
    reverse(s, start, len(s) - 1)
```

### 3. Off-by-One Errors

```python
# WRONG: Incorrect boundary
if s[i] == ' ':
    reverse(s, start, i)  # Should be i - 1

# CORRECT: Exclude the space
if s[i] == ' ':
    reverse(s, start, i - 1)
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Reverse String | Reverse entire string only | Single pass with two pointers |
| K-Group Reversal | Reverse every k characters | Track k-sized segments |
| Rotate Array | Rotate array by k positions | Use reversal trick: reverse 3 parts |
| Remove Extra Spaces | Handle multiple spaces between words | Two pointers to compact spaces |

## Practice Checklist

- [ ] Handles empty/edge cases (single word, single character)
- [ ] Can explain approach in 2 min (reverse all, then reverse each word)
- [ ] Can code solution in 15 min
- [ ] Can discuss time/space complexity (O(n) time, O(1) space)
- [ ] Correctly identifies word boundaries

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Two Pointers Pattern](../../strategies/patterns/two-pointers.md)
