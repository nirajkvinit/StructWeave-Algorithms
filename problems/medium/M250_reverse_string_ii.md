---
id: M250
old_id: A038
slug: reverse-string-ii
title: Reverse String II
difficulty: medium
category: medium
topics: ["string", "two-pointers"]
patterns: ["two-pointers", "string-manipulation"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - E344_reverse_string.md
  - M151_reverse_words_in_a_string.md
  - E541_reverse_string_ii.md
prerequisites:
  - string slicing/indexing
  - two-pointer technique
  - in-place array manipulation
---
# Reverse String II

## Problem

Given a string s and an integer k, process the string in chunks of 2k characters at a time. For each chunk, reverse the first k characters and leave the next k characters unchanged. This creates an alternating pattern of reversed and non-reversed segments throughout the string.

For example, with s = "abcdefg" and k = 2, you divide into chunks of 2k = 4 characters: "abcd" and "efg". In the first chunk "abcd", reverse the first 2 characters to get "bacd". In the partial second chunk "efg", reverse the first 2 characters to get "fedg". Wait, that's wrong - let me clarify: in "efg" you reverse "ef" to get "fe", keeping "g" as is, giving final result "bacdfeg".

Edge cases matter here: if fewer than k characters remain at the end, reverse all of them (since they're "the first k" but there aren't k available). If between k and 2k characters remain, reverse exactly the first k and leave the rest. For instance, with s = "abcdefgh" and k = 3, you get chunks "abcdef" (reverse "abc" → "cbafef") and "gh" (reverse both since less than k → "hg"), giving "cbafefhg".

## Why This Matters

This problem teaches segmented string processing, where you apply different operations to alternating sections of data. This pattern appears in text formatting (alternating uppercase/lowercase sections), data encoding schemes (alternating compression and plaintext blocks), cryptography (processing data in block cipher modes), and batch processing systems where you alternate between transformation and validation phases. The skill of correctly handling partial segments at the end, where boundary conditions require special logic, is crucial for robust string manipulation in parsers, validators, and text transformation utilities. Understanding both in-place manipulation (with character arrays) and immutable string slicing strategies prepares you for working across different programming language paradigms.

## Examples

**Example 1:**
- Input: `s = "abcdefg", k = 2`
- Output: `"bacdfeg"`

**Example 2:**
- Input: `s = "abcd", k = 2`
- Output: `"bacd"`

## Constraints

- 1 <= s.length <= 10⁴
- s consists of only lowercase English letters.
- 1 <= k <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Process in 2k Chunks</summary>

The key is to iterate through the string in steps of `2k` characters. For each chunk:
- Start at position `i = 0, 2k, 4k, 6k, ...`
- Reverse characters from `i` to `min(i+k-1, len(s)-1)`
- Keep characters from `i+k` to `i+2k-1` unchanged

This ensures you're reversing every first half of each 2k segment.
</details>

<details>
<summary>Hint 2: Use String Slicing and Concatenation</summary>

Python strings are immutable, so build a result using slicing:
```python
for i in range(0, len(s), 2*k):
    # Reverse first k chars of this segment
    segment = s[i:i+k][::-1] + s[i+k:i+2*k]
```

This naturally handles the edge cases:
- If `i+k` exceeds length, `s[i:i+k]` just takes what's available
- If segment is shorter than 2k, slicing handles it gracefully
</details>

<details>
<summary>Hint 3: Convert to List for In-Place Reversal</summary>

For a more efficient approach (especially in languages like Java/C++), convert the string to a character array and reverse in-place using two pointers:

```python
chars = list(s)
for i in range(0, len(chars), 2*k):
    left = i
    right = min(i + k - 1, len(chars) - 1)
    while left < right:
        chars[left], chars[right] = chars[right], chars[left]
        left += 1
        right -= 1
return ''.join(chars)
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| String Slicing (Python) | O(n) | O(n) | Creates new strings for each slice |
| Character Array + Two Pointers | O(n) | O(n) | Array copy + in-place reversal |
| StringBuilder (Java) | O(n) | O(n) | More efficient than string concatenation |

## Common Mistakes

### Mistake 1: Incorrect Loop Step Size
```python
# Wrong: Steps by k instead of 2k
def reverseStr(s, k):
    result = []
    for i in range(0, len(s), k):  # Should be 2*k!
        result.append(s[i:i+k][::-1])
    return ''.join(result)

# Correct: Steps by 2k
def reverseStr(s, k):
    result = []
    for i in range(0, len(s), 2*k):
        result.append(s[i:i+k][::-1] + s[i+k:i+2*k])
    return ''.join(result)
```

### Mistake 2: Not Handling Remaining Characters Properly
```python
# Wrong: Ignores characters after last complete 2k segment
def reverseStr(s, k):
    result = ""
    for i in range(0, len(s), 2*k):
        if i + 2*k <= len(s):  # Only processes complete segments
            result += s[i:i+k][::-1] + s[i+k:i+2*k]
    return result

# Correct: Handles partial segments
def reverseStr(s, k):
    result = ""
    for i in range(0, len(s), 2*k):
        # Slicing automatically handles partial segments
        result += s[i:i+k][::-1] + s[i+k:i+2*k]
    return result
```

### Mistake 3: Off-by-One Errors in Two-Pointer Approach
```python
# Wrong: Incorrect right pointer initialization
def reverseStr(s, k):
    chars = list(s)
    for i in range(0, len(chars), 2*k):
        left = i
        right = i + k  # Wrong! Should be i + k - 1
        while left < right:
            chars[left], chars[right] = chars[right], chars[left]
            left += 1
            right -= 1
    return ''.join(chars)

# Correct: Right pointer at last character to reverse
def reverseStr(s, k):
    chars = list(s)
    for i in range(0, len(chars), 2*k):
        left = i
        right = min(i + k - 1, len(chars) - 1)
        while left < right:
            chars[left], chars[right] = chars[right], chars[left]
            left += 1
            right -= 1
    return ''.join(chars)
```

## Variations

| Variation | Difference | Complexity Impact |
|-----------|------------|-------------------|
| Reverse Every Kth Segment | No 2k grouping, just reverse every k chars | Simpler logic, same O(n) |
| Reverse Alternating Words | Reverse every other word in sentence | Need word boundary detection |
| Rotate String by K | Shift instead of reverse | Use slicing: `s[k:] + s[:k]` |
| Reverse Only Vowels | Selective reversal based on condition | Two-pointer with filtering |

## Practice Checklist

Track your progress with spaced repetition:

- [ ] First attempt (understand 2k segmentation)
- [ ] Implement string slicing solution
- [ ] Implement two-pointer in-place solution
- [ ] Test edge cases (k=1, k>len, len<2k)
- [ ] After 1 day: Solve without hints
- [ ] After 1 week: Solve in under 15 minutes
- [ ] Before interview: Explain trade-offs between approaches

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
