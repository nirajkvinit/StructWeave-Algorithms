---
id: M123
old_id: I090
slug: word-pattern-ii
title: Word Pattern II
difficulty: medium
category: medium
topics: ["string", "backtracking", "hash-table"]
patterns: ["backtracking"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M124", "E258", "M118"]
prerequisites: ["backtracking", "hash-table", "string-matching"]
---
# Word Pattern II

## Problem

Imagine you're building a template matching system where you need to verify whether a string follows a specific pattern. You're given a `pattern` (like "abab") and a string `s` (like "redblueredblue"), and you need to determine if the string conforms to the pattern. Conformance means you can create a one-to-one mapping from each pattern character to a non-empty substring, such that replacing each character in the pattern with its mapped substring reconstructs the original string exactly.

The key constraint is one-to-one correspondence: each pattern character must map to exactly one unique substring, and each substring can only be mapped to by one pattern character. For example, if 'a' maps to "red", then no other character can map to "red", and 'a' cannot map to any other substring like "blue". The substrings must be non-empty (you can't map a character to an empty string), and the mapping must completely account for the entire string with no leftover characters. Think of this like a word substitution cipher where you're trying to determine if a coded message could have been generated from a template. Edge cases include patterns longer than the string (impossible to match), patterns with many repeated characters (limiting how substrings can be divided), and cases where multiple different valid mappings might exist.

## Why This Matters

This problem models template matching and pattern recognition scenarios that appear frequently in compiler design, data validation, and natural language processing. Text editors and IDEs use similar pattern matching logic for code snippet expansion, where typing a short pattern like "forl" expands to a full for-loop template. Configuration file parsers validate that input strings match expected patterns before extracting structured data. API routing systems match incoming request URLs against patterns like "/users/{id}/posts/{postId}" to extract path parameters. Regular expression engines perform more complex versions of this matching with wildcards and special characters. Natural language processing systems detect phrasal patterns in text to extract semantic relationships. The core algorithmic challenge is efficiently exploring the exponential space of possible substring divisions using backtracking with bidirectional constraint checking - you must ensure both that pattern characters don't map to multiple substrings and that substrings don't get claimed by multiple characters.

## Examples

**Example 1:**
- Input: `pattern = "abab", s = "redblueredblue"`
- Output: `true`
- Explanation: One possible mapping is as follows:
'a' -> "red"
'b' -> "blue"

**Example 2:**
- Input: `pattern = "aaaa", s = "asdasdasdasd"`
- Output: `true`
- Explanation: One possible mapping is as follows:
'a' -> "asd"

**Example 3:**
- Input: `pattern = "aabb", s = "xyzabcxzyabc"`
- Output: `false`

## Constraints

- 1 <= pattern.length, s.length <= 20
- pattern and s consist of only lowercase English letters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

This is a constraint satisfaction problem where you need to assign substrings to pattern characters. The challenge is that you don't know the length of each substring in advance. Think about how you would try different substring lengths for each pattern character and check if they lead to a valid complete mapping.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use backtracking to explore all possible mappings. For each character in the pattern, try assigning it different length substrings from the remaining portion of `s`. Maintain two mappings: pattern_char -> substring and substring -> pattern_char (for bidirectional uniqueness). Backtrack when you find a conflict or complete successfully when both pattern and string are exhausted.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**Backtracking Approach:**
```
1. Create two hash maps:
   - char_to_str: maps pattern char to substring
   - str_to_char: maps substring to pattern char

2. Define backtrack(p_idx, s_idx):
   - Base case: if p_idx == len(pattern):
     - Return true if s_idx == len(s) (all matched)
     - Return false otherwise

   - Get current pattern character: char = pattern[p_idx]

   - If char already mapped:
     - Check if s[s_idx:] starts with mapped substring
     - If yes, recurse: backtrack(p_idx+1, s_idx+len(mapping))
     - If no, return false

   - Else (char not mapped):
     - Try all possible substring lengths from s_idx:
       - For length in range(1, remaining_s_length + 1):
         - substr = s[s_idx : s_idx + length]
         - If substr not already mapped to another char:
           - Add mappings: char->substr, substr->char
           - If backtrack(p_idx+1, s_idx+length): return true
           - Remove mappings (backtrack)
     - Return false if no mapping works

3. Return backtrack(0, 0)
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Enumeration | O(n!) | O(n) | Try all partitions of s |
| **Backtracking with Pruning** | **O(n^m)** | **O(m+n)** | n=len(s), m=len(pattern), optimal |
| Dynamic Programming | O(n²m) | O(nm) | Possible but more complex |

## Common Mistakes

### Mistake 1: Not maintaining bidirectional mapping

**Wrong:**
```python
def wordPatternMatch(pattern, s):
    def backtrack(p_idx, s_idx, mapping):
        if p_idx == len(pattern):
            return s_idx == len(s)

        char = pattern[p_idx]
        if char in mapping:
            substr = mapping[char]
            if s[s_idx:].startswith(substr):
                return backtrack(p_idx+1, s_idx+len(substr), mapping)
            return False

        # Wrong: doesn't check if substring already maps to different char
        for end in range(s_idx+1, len(s)+1):
            substr = s[s_idx:end]
            mapping[char] = substr
            if backtrack(p_idx+1, end, mapping):
                return True
            del mapping[char]
        return False
```

**Correct:**
```python
def wordPatternMatch(pattern, s):
    def backtrack(p_idx, s_idx, char_to_str, str_to_char):
        if p_idx == len(pattern):
            return s_idx == len(s)

        char = pattern[p_idx]
        if char in char_to_str:
            substr = char_to_str[char]
            if s[s_idx:].startswith(substr):
                return backtrack(p_idx+1, s_idx+len(substr), char_to_str, str_to_char)
            return False

        # Try all possible substrings
        for end in range(s_idx+1, len(s)+1):
            substr = s[s_idx:end]
            # Check bidirectional uniqueness
            if substr in str_to_char:
                continue

            char_to_str[char] = substr
            str_to_char[substr] = char

            if backtrack(p_idx+1, end, char_to_str, str_to_char):
                return True

            del char_to_str[char]
            del str_to_char[substr]

        return False

    return backtrack(0, 0, {}, {})
```

### Mistake 2: Not pruning search space early

**Wrong:**
```python
def wordPatternMatch(pattern, s):
    def backtrack(p_idx, s_idx, char_to_str, str_to_char):
        # No early termination check
        if p_idx == len(pattern) and s_idx == len(s):
            return True
        if p_idx >= len(pattern) or s_idx >= len(s):
            return False

        # ... rest of code ...
        # Explores impossible cases unnecessarily
```

**Correct:**
```python
def wordPatternMatch(pattern, s):
    def backtrack(p_idx, s_idx, char_to_str, str_to_char):
        # Early termination
        if p_idx == len(pattern):
            return s_idx == len(s)

        # Pruning: not enough string left
        remaining_pattern = len(pattern) - p_idx
        remaining_string = len(s) - s_idx
        if remaining_string < remaining_pattern:
            return False  # Each char needs at least 1 character

        char = pattern[p_idx]
        # ... rest of backtracking logic ...
```

### Mistake 3: Inefficient substring generation

**Wrong:**
```python
def wordPatternMatch(pattern, s):
    def backtrack(p_idx, s_idx, mapping, used):
        # ... base cases ...

        char = pattern[p_idx]
        # Wrong: creates all possible substrings upfront
        all_substrings = []
        for i in range(s_idx, len(s)):
            for j in range(i+1, len(s)+1):
                all_substrings.append(s[i:j])

        for substr in all_substrings:
            # Many irrelevant substrings tested
            # ...
```

**Correct:**
```python
def wordPatternMatch(pattern, s):
    def backtrack(p_idx, s_idx, char_to_str, str_to_char):
        # ... base cases ...

        char = pattern[p_idx]

        if char in char_to_str:
            # Use existing mapping directly
            substr = char_to_str[char]
            if s[s_idx:s_idx+len(substr)] == substr:
                return backtrack(p_idx+1, s_idx+len(substr), char_to_str, str_to_char)
            return False

        # Only try substrings starting at current position
        for end in range(s_idx+1, len(s)+1):
            substr = s[s_idx:end]
            if substr not in str_to_char:
                # ... try mapping ...
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Word Pattern I | Pattern with space-separated words | Easy |
| Isomorphic Strings | Character-to-character mapping | Easy |
| Word Abbreviation | Match with abbreviated patterns | Medium |
| Regular Expression Matching | Add wildcard support (. and *) | Hard |
| Multiple Pattern Match | Match multiple patterns simultaneously | Hard |

## Practice Checklist

- [ ] Solve using backtracking with bidirectional mapping
- [ ] Add pruning optimizations
- [ ] Handle edge cases (empty pattern, longer pattern than string)
- [ ] Trace through example manually
- [ ] **Day 3**: Re-solve without looking at solution
- [ ] **Week 1**: Solve Word Pattern I variation
- [ ] **Week 2**: Explain backtracking approach to someone
- [ ] **Month 1**: Solve Regular Expression Matching

**Strategy**: See [Backtracking Patterns](../strategies/patterns/backtracking.md)
