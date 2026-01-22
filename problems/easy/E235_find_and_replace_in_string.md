---
id: E235
old_id: A300
slug: find-and-replace-in-string
title: Find And Replace in String
difficulty: easy
category: easy
topics: ["string", "array"]
patterns: ["string-manipulation", "sorting"]
estimated_time_minutes: 15
frequency: low
prerequisites: ["string-slicing", "sorting", "array-traversal"]
related_problems: ["E028", "E014", "M833"]
strategy_ref: ../prerequisites/string.md
---
# Find And Replace in String

## Problem

You are given a string `s` (using 0-based indexing) and a list of replacement operations to perform on it. Each operation is defined by three parallel arrays of equal length `k`: `indices`, `sources`, and `targets`. Think of these as instructions that say "at this position, if you find this substring, replace it with that substring."

Here's how each operation works. For operation number `i`, you first check whether the substring `sources[i]` actually exists at position `indices[i]` in the original string `s`. This verification step is crucial because the replacement only happens if there's an exact match. If the substring doesn't match at that position, you skip this operation entirely and leave the string unchanged at that location. However, if the substring does match, you replace it with `targets[i]`.

For example, consider `s = "abcd"` with `indices[i] = 0`, `sources[i] = "ab"`, and `targets[i] = "eee"`. You verify that "ab" exists at position 0 (it does), so you replace "ab" with "eee", resulting in "eeecd".

An important constraint to understand: all replacements are applied based on positions in the original string, not the modified string. The operations don't affect each other's indexing because they reference the original positions. The test cases guarantee that no two replacement operations will overlap, meaning you'll never have a situation where replacing one substring would interfere with another.

What makes this problem interesting is managing multiple potentially independent string transformations. You need to process them in the right order to avoid index shifting issues. If you naively replace from left to right, each replacement changes the length of the string, which invalidates all subsequent indices. Sorting the operations is the key insight that unlocks an elegant solution.

## Why This Matters

String manipulation with conditional replacements appears throughout text processing applications. This exact pattern shows up in template engines (replacing placeholders with values), code refactoring tools (renaming variables), search-and-replace in text editors, and internationalization systems (translating text segments).

The problem teaches an important algorithmic principle: when you have position-dependent operations, processing order matters. The technique of sorting operations to avoid index shifting is used in collaborative editing systems (like Google Docs), where multiple edits need to be merged, and in version control diff algorithms that apply patches to files.

From a technical interview perspective, this problem tests your ability to handle edge cases systematically (non-matching sources, different-length replacements, boundary positions) and recognize when sorting can simplify a seemingly complex problem. The sorting insight transforms what looks like a complicated state-management problem into a straightforward single-pass solution.

Understanding this pattern prepares you for more complex string transformation problems in compiler design (lexical analysis and token replacement), natural language processing (pattern matching and substitution), and data sanitization (replacing sensitive information with placeholders).


**Diagram:**

Example 1: Basic replacement
```
Original string: "abcd"
indices = [0, 2]
sources = ["a", "cd"]
targets = ["eee", "ffff"]

Step 1: Check index 0
  Position: 0
  Source: "a" matches at position 0
  Replace "a" with "eee"

Step 2: Check index 2
  Position: 2
  Source: "cd" matches at position 2
  Replace "cd" with "ffff"

Result: "eeebffff"
```

Example 2: Non-matching source (skip operation)
```
Original string: "abcd"
indices = [0, 2]
sources = ["ab", "ec"]
targets = ["eee", "ffff"]

Step 1: Check index 0
  Position: 0
  Source: "ab" matches at position 0
  Replace "ab" with "eee"

Step 2: Check index 2
  Position: 2
  Source: "ec" does NOT match at position 2 (actual: "cd")
  Skip this operation

Result: "eeecd"
```


## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Constraints

- 1 <= s.length <= 1000
- k == indices.length == sources.length == targets.length
- 1 <= k <= 100
- 0 <= indexes[i] < s.length
- 1 <= sources[i].length, targets[i].length <= 50
- s consists of only lowercase English letters.
- sources[i] and targets[i] consist of only lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Naive Sequential Replacement
One approach is to process replacements one by one. For each operation, check if the source matches at the given index in the original string. If yes, build a new string with the replacement. What's the problem with this approach? Each replacement creates a new string and shifts subsequent indices.

### Tier 2: Sort and Build
The key insight is that replacements are independent since they don't overlap. Sort the operations by index in descending order (right to left). This way, when you apply a replacement, it doesn't affect the indices of replacements to the left. Build the result string by processing from right to left.

### Tier 3: Forward Processing
Alternatively, sort by ascending index and build the result string from left to right. Keep track of the current position in the original string. For each replacement index, copy the unchanged portion before it, then apply the replacement if the source matches. Skip the source length and continue. Don't forget to append the remaining string after all replacements.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Naive Sequential | O(k × n) | O(n) | k replacements, each potentially recreates entire string |
| Sort Right-to-Left | O(n + k log k) | O(n) | Sort operations, build result once |
| Sort Left-to-Right (Optimal) | O(n + k log k) | O(n) | Sort operations, single pass through string |

Where n = length of string, k = number of operations

## Common Mistakes

### Mistake 1: Not Checking Source Match
```python
# Wrong: Applies replacement without verifying source matches
def findReplaceString(s, indices, sources, targets):
    result = []
    operations = sorted(zip(indices, sources, targets))
    pos = 0
    for idx, src, tgt in operations:
        result.append(s[pos:idx])
        result.append(tgt)  # Always replaces, doesn't check if src matches!
        pos = idx + len(src)
    result.append(s[pos:])
    return ''.join(result)

# Correct: Verify source matches before replacing
if s[idx:idx+len(src)] == src:
    result.append(tgt)
    pos = idx + len(src)
else:
    result.append(s[idx])
    pos = idx + 1
```

### Mistake 2: Index Shifting Issues
```python
# Wrong: Doesn't account for changing indices after replacements
def findReplaceString(s, indices, sources, targets):
    for i in range(len(indices)):
        idx = indices[i]
        if s[idx:idx+len(sources[i])] == sources[i]:
            # This changes s length, breaking subsequent indices
            s = s[:idx] + targets[i] + s[idx+len(sources[i]):]
    return s

# Correct: Process in order that prevents index shifts (right-to-left or use original indices)
operations = sorted(zip(indices, sources, targets), reverse=True)
for idx, src, tgt in operations:
    if s[idx:idx+len(src)] == src:
        s = s[:idx] + tgt + s[idx+len(src):]
```

### Mistake 3: Incorrect Position Tracking
```python
# Wrong: Doesn't handle skipped replacements correctly
def findReplaceString(s, indices, sources, targets):
    result = []
    operations = sorted(zip(indices, sources, targets))
    pos = 0
    for idx, src, tgt in operations:
        result.append(s[pos:idx])
        if s[idx:idx+len(src)] == src:
            result.append(tgt)
        pos = idx + len(src)  # Wrong: advances even if no match
    result.append(s[pos:])
    return ''.join(result)

# Correct: Only advance by source length if replacement happened
if s[idx:idx+len(src)] == src:
    result.append(tgt)
    pos = idx + len(src)
else:
    pos = idx  # Don't skip ahead if no replacement
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Overlapping Replacements | Medium | Handle cases where replacements can overlap (apply first match). |
| Case-Insensitive Matching | Easy | Match source patterns case-insensitively. |
| Regex Replacements | Hard | Allow regex patterns in sources instead of exact strings. |
| Multiple Passes | Medium | Apply replacements iteratively until no more matches. |
| Undo Replacements | Medium | Given result and operations, restore original string. |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Solved with sorted operations approach
- [ ] Handled edge case: no valid replacements
- [ ] Handled edge case: all replacements are invalid
- [ ] Handled edge case: replacement at start/end of string
- [ ] Handled edge case: target longer than source
- [ ] Handled edge case: empty source or target
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Can explain approach to someone else

**Strategy**: See [String Manipulation Patterns](../prerequisites/string.md)
