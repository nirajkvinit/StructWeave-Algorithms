---
id: E253
old_id: A384
slug: reverse-only-letters
title: Reverse Only Letters
difficulty: easy
category: easy
topics: ["string", "two-pointers"]
patterns: ["two-pointers"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - E125_valid_palindrome.md
  - E344_reverse_string.md
prerequisites:
  - "Two pointer technique"
  - "Character classification"
  - "String manipulation"
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Reverse Only Letters

## Problem

You're given a string `s` that contains a mix of English letters (both uppercase and lowercase) and non-alphabetic characters like numbers, punctuation, and special symbols. Your task is to transform the string following a specific selective reversal rule: keep all non-alphabetic characters in their exact original positions, but reverse the order of all English letters among themselves. For instance, with "ab-cd", the hyphen stays at position 2, while the letters get reversed to give "dc-ba". The letters 'a', 'b', 'c', 'd' become 'd', 'c', 'b', 'a', but the hyphen remains anchored at index 2. Another example: "a-bC-dEf-ghIj" becomes "j-Ih-gfE-dCba" where every hyphen stays put, but the letters reverse while preserving their case (uppercase remains uppercase, lowercase remains lowercase). You need to handle all ASCII characters in the range [33, 122], which includes digits, punctuation, lowercase letters, and uppercase letters. Return the transformed string.

## Why This Matters

Selective string manipulation with constraints is a common pattern in text processing, data sanitization, and format preservation tasks. This problem teaches you to apply transformations to specific character classes while maintaining structural integrity, a skill essential in parsing formatted data, implementing text editors with find-replace features, or processing user input where certain positions must remain fixed. The two-pointer technique with conditional advancement (skip non-target characters) is the core pattern here, which extends to problems involving palindrome checking with ignored characters, string matching with wildcards, and DNA sequence analysis where you process specific nucleotides while ignoring markers. In interviews, this problem assesses your ability to handle multiple conditions elegantly and your understanding of character classification methods. The pattern also appears in real-world scenarios like formatting phone numbers (keep separators, rearrange digits) or processing chemical formulas (rearrange elements, preserve structural symbols).

## Examples

**Example 1:**
- Input: `s = "ab-cd"`
- Output: `"dc-ba"`

**Example 2:**
- Input: `s = "a-bC-dEf-ghIj"`
- Output: `"j-Ih-gfE-dCba"`

## Constraints

- 1 <= s.length <= 100
- s consists of characters with ASCII values in the range [33, 122].
- s does not contain '\"' or '\\'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Problem Understanding
This is a constrained reversal problem. Imagine having two separate tasks: reversing letters and keeping non-letters in place. How can you combine these?

Think about using two pointers - one from each end - and skipping over non-letter characters.

### Tier 2 Hint - Solution Strategy
Use the two-pointer technique with character filtering:
1. Convert string to a mutable structure (like list/array)
2. Place one pointer at start, one at end
3. Move left pointer forward until it finds a letter
4. Move right pointer backward until it finds a letter
5. Swap these letters and continue
6. Stop when pointers meet

### Tier 3 Hint - Implementation Details
```
Pseudocode:
chars = list(s)
left, right = 0, len(s) - 1

while left < right:
    if not is_letter(chars[left]):
        left += 1
    elif not is_letter(chars[right]):
        right -= 1
    else:
        swap(chars[left], chars[right])
        left += 1
        right -= 1

return ''.join(chars)
```

Use `isalpha()` or check if character is in 'a-z' or 'A-Z'.

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Two pointers in-place | O(n) | O(n) | String to list conversion needed in most languages |
| Extract, reverse, rebuild | O(n) | O(n) | Extract letters, reverse them, rebuild string |
| Stack-based | O(n) | O(n) | Push letters to stack, pop while rebuilding |

## Common Mistakes

### Mistake 1: Reversing entire string first
```python
# Wrong: Reverses non-letters too
result = s[::-1]
# Then tries to fix non-letter positions... complex!
```
**Why it's wrong**: Reversing everything first makes it harder to restore non-letters to original positions. Better to only swap letters.

### Mistake 2: Not handling character case properly
```python
# Wrong: Converting to lowercase
if chars[left].lower().isalpha():
    # ... but this changes the actual case
```
**Why it's wrong**: `isalpha()` works for both cases without modification. Don't change case during checking.

### Mistake 3: Incorrect pointer movement
```python
# Wrong: Moving both pointers unconditionally
while left < right:
    if not chars[left].isalpha():
        left += 1
    if not chars[right].isalpha():  # Missing 'elif'
        right -= 1
    # Both pointers might move when only one should
```
**Why it's wrong**: Use `elif` to ensure only one pointer moves per iteration when skipping non-letters.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Reverse only vowels | Easy | Reverse only vowels, keep consonants and non-letters in place |
| Reverse words but keep special chars | Medium | Reverse each word individually, keep special chars in place |
| Reverse by character type | Medium | Reverse letters, reverse digits separately |
| Reverse with character classes | Medium | Multiple character classes, each reversed independently |
| In-place without conversion | Hard | True in-place reversal if string is mutable |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Reviewed solution and understood all approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 3 days
- [ ] Practiced again after 1 week
- [ ] Can explain the solution clearly to others
- [ ] Solved all variations above

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
