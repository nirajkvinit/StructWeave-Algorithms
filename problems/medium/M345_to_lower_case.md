---
id: M345
old_id: A176
slug: to-lower-case
title: To Lower Case
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems:
  - E026_valid_palindrome.md
  - M256_group_anagrams.md
  - E138_reverse_string.md
prerequisites:
  - string-manipulation
  - ascii-encoding
  - character-operations
---
# To Lower Case

## Problem

Given a string `s`, convert all uppercase letters to their lowercase equivalents and return the modified string.

While this might seem trivial at first glance (most languages have a built-in `.toLowerCase()` or `.lower()` method), the educational value lies in understanding how character encoding works under the hood. Each character in a string is represented by a numeric value according to the ASCII encoding standard.

In ASCII, uppercase letters 'A' through 'Z' have numeric values 65 through 90, while their lowercase counterparts 'a' through 'z' have values 97 through 122. Notice the pattern: each uppercase letter is exactly 32 values away from its lowercase version. For example, 'A' is 65 and 'a' is 97, with a difference of 32.

This relationship means you can convert a character by adding 32 to its ASCII value, but only if it's an uppercase letter. Characters that are already lowercase, digits, spaces, or punctuation should remain unchanged. You'll need to check if a character falls in the range 'A' to 'Z' before applying the conversion.

## Why This Matters

Understanding character encoding is fundamental for text processing, internationalization, and data validation. While you'll use built-in methods in production code, knowing how they work helps you debug encoding issues, implement case-insensitive comparisons efficiently, and understand why string operations behave differently across languages. This low-level knowledge becomes crucial when working with non-English text, implementing custom string transformations, or optimizing performance-critical text processing in systems where built-in methods aren't available.

## Examples

**Example 1:**
- Input: `s = "Hello"`
- Output: `"hello"`

**Example 2:**
- Input: `s = "here"`
- Output: `"here"`

**Example 3:**
- Input: `s = "LOVELY"`
- Output: `"lovely"`

## Constraints

- 1 <= s.length <= 100
- s consists of printable ASCII characters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: ASCII Value Relationship</summary>

In ASCII encoding:
- Uppercase letters: A-Z have values 65-90
- Lowercase letters: a-z have values 97-122
- The difference is exactly 32 for each letter pair

For example:
- 'A' = 65, 'a' = 97, difference = 32
- 'Z' = 90, 'z' = 122, difference = 32

To convert uppercase to lowercase: `lowercase = uppercase + 32`

You can check if a character is uppercase: `if 'A' <= char <= 'Z'`
</details>

<details>
<summary>Hint 2: Built-in Methods vs Manual Implementation</summary>

**Using built-in methods** (Python):
```python
return s.lower()
```

**Manual implementation** (educational):
```python
result = []
for char in s:
    if 'A' <= char <= 'Z':
        # Convert using ASCII arithmetic
        result.append(chr(ord(char) + 32))
    else:
        result.append(char)
return ''.join(result)
```

The built-in method is optimal in practice, but understanding the ASCII conversion teaches character manipulation fundamentals.
</details>

<details>
<summary>Hint 3: Bitwise Optimization (Advanced)</summary>

A clever bitwise trick exploits the fact that uppercase and lowercase letters differ only in the 6th bit (32 = 2^5):

```
'A' = 01000001 (65)
'a' = 01100001 (97)
     ↑ 6th bit

To convert uppercase to lowercase, set the 6th bit:
lowercase = uppercase | 0b00100000  (OR with 32)
```

This works because:
- For uppercase: sets the bit (converts to lowercase)
- For lowercase: bit already set (no change)
- For non-letters: doesn't corrupt the character

Most efficient in low-level languages.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Built-in `.lower()` | O(n) | O(n) | Optimal in practice; creates new string |
| Manual ASCII Conversion | O(n) | O(n) | Educational; same complexity as built-in |
| Bitwise OR with 32 | O(n) | O(n) | Most efficient in low-level languages |
| In-place (if allowed) | O(n) | O(1) | Only possible with mutable character arrays |

## Common Mistakes

### Mistake 1: Trying to Modify Immutable Strings
```python
# DON'T: Attempt in-place modification of immutable string
def toLowerCase(s: str) -> str:
    for i in range(len(s)):
        if 'A' <= s[i] <= 'Z':
            s[i] = chr(ord(s[i]) + 32)  # Error: strings are immutable!
    return s
# Problem: Raises TypeError in Python
```

**Why it's wrong:** In Python (and many languages), strings are immutable. You cannot modify individual characters.

**Fix:** Build a new string using a list and `''.join()`, or use built-in methods.

### Mistake 2: Incorrect ASCII Range Check
```python
# DON'T: Use wrong condition for uppercase detection
def toLowerCase(s: str) -> str:
    result = []
    for char in s:
        # Problem: wrong range or missing check
        if char.isupper():  # OK, but then don't use ASCII math
            result.append(char + 32)  # Wrong: can't add int to str
        else:
            result.append(char)
    return ''.join(result)
# Problem: Type error - adding int to string
```

**Why it's wrong:** If using `isupper()`, you should use `.lower()` method, not ASCII arithmetic. Mixing approaches causes type errors.

**Fix:** Be consistent: either use built-in methods throughout, or use ASCII conversion with `ord()`/`chr()`.

### Mistake 3: Not Handling Non-Letter Characters
```python
# DON'T: Convert all characters blindly
def toLowerCase(s: str) -> str:
    result = []
    for char in s:
        # Problem: converts everything, corrupting numbers/symbols
        result.append(chr(ord(char) + 32))
    return ''.join(result)
# Problem: Corrupts non-letter characters
```

**Why it's wrong:** Adding 32 to a digit like '5' (ASCII 53) gives 85 which is 'U'. Numbers and symbols get corrupted.

**Fix:** Check if character is uppercase before converting: `if 'A' <= char <= 'Z'`.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| To Upper Case | Convert all characters to uppercase | Easy |
| Toggle Case | Uppercase→lowercase, lowercase→uppercase | Easy |
| Title Case | Capitalize first letter of each word | Medium |
| Custom Case Mapping | Define custom character transformations | Medium |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Implemented using built-in method
- [ ] Implemented manual ASCII conversion
- [ ] Tried bitwise approach (optional)
- [ ] Tested edge cases: all uppercase, all lowercase, mixed with numbers/symbols
- [ ] Analyzed time/space complexity
- [ ] **Day 1-3:** Implement without reference
- [ ] **Week 1:** Solve toggle case and title case variations
- [ ] **Week 2:** Study Unicode and locale-aware case conversion

**Strategy**: See [String Pattern](../strategies/patterns/string-manipulation.md)
