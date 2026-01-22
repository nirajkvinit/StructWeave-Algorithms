---
id: E009
old_id: F014
slug: longest-common-prefix
title: Longest Common Prefix
difficulty: easy
category: easy
topics: ["string", "array"]
patterns: ["vertical-scanning", "horizontal-scanning"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E014", "M208", "M211"]
prerequisites: ["strings-basics", "arrays-basics"]
---
# Longest Common Prefix

## Problem

Given an array of strings, find the longest prefix that all strings share. Return an empty string if no common prefix exists.

For example, given `["flower", "flow", "flight"]`, the longest common prefix is "fl" because all three strings start with these letters. Given `["dog", "racecar", "car"]`, there is no common prefix, so return "".

You can approach this problem in two ways: horizontal scanning (compare strings pairwise, updating the prefix as you go) or vertical scanning (compare character by character across all strings simultaneously). Vertical scanning often performs better because it can stop immediately when encountering the first position where characters differ.

Edge cases to consider: an empty array (no strings to compare), an array containing empty strings (which means the common prefix must be empty), and an array with a single string (that string is the prefix by default).

## Why This Matters

This problem teaches efficient string comparison strategies and character-level processing. It develops:
- **Early termination**: Stopping as soon as the answer is known
- **Vertical vs horizontal scanning**: Different iteration patterns
- **Edge case handling**: Empty strings and arrays

**Real-world applications:**
- File path processing and directory matching
- Auto-completion systems in search engines
- Command-line interface prefix matching
- DNS and URL canonicalization

## Examples

**Example 1:**
- Input: `strs = ["flower","flow","flight"]`
- Output: `"fl"`

**Example 2:**
- Input: `strs = ["dog","racecar","car"]`
- Output: `""`
- Explanation: There is no common prefix among the input strings.

## Constraints

- 1 <= strs.length <= 200
- 0 <= strs[i].length <= 200
- strs[i] consists of only lowercase English letters.

## Think About

1. What's the maximum possible length of the common prefix?
2. Should you compare strings horizontally (string by string) or vertically (character by character)?
3. When can you stop early and return the result?
4. How do you handle edge cases like empty strings or arrays?

---

## Approach Hints

<details>
<summary>💡 Hint 1: What's the natural approach?</summary>

The most intuitive approach is **horizontal scanning**: compare strings pairwise to build up the prefix.

**Think about:**
- Start with the first string as the initial prefix
- Compare it with the second string, update the prefix
- Compare updated prefix with the third string, and so on
- If prefix becomes empty at any point, you can stop

**Example:** `["flower", "flow", "flight"]`
1. prefix = "flower"
2. Compare with "flow": prefix becomes "flow"
3. Compare with "flight": prefix becomes "fl"

</details>

<details>
<summary>🎯 Hint 2: The vertical scanning insight</summary>

Instead of comparing entire strings, compare **character by character** across all strings.

**Strategy:**
- Look at the first character of all strings
- If they all match, it's part of the prefix
- Move to the second character, check all strings again
- Stop when you find a mismatch or reach the end of any string

**Benefits:**
- Can stop early if a mismatch is found
- Don't need to compare strings multiple times
- Natural for finding the shortest common part

**Example:** `["flower", "flow", "flight"]`
- Position 0: f, f, f → match
- Position 1: l, l, l → match
- Position 2: o, o, i → mismatch! Return "fl"

</details>

<details>
<summary>📝 Hint 3: Vertical scanning algorithm</summary>

```
function longestCommonPrefix(strings):
    if strings is empty:
        return ""

    # Use first string as reference
    for char_index from 0 to length of first string:
        current_char = first_string[char_index]

        # Check this character across all other strings
        for each string in strings (starting from second):
            # Check if we've reached end of current string
            # OR if character doesn't match
            if char_index >= length of string OR
               string[char_index] != current_char:
                return first_string[0:char_index]

    # If we get here, entire first string is the prefix
    return first_string
```

**Optimization:** Use the shortest string as reference to avoid bounds checking.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Horizontal Scanning | O(S) | O(1) | S = sum of all characters; compares pairwise |
| **Vertical Scanning** | **O(S)** | **O(1)** | Stops early on mismatch; cleaner logic |
| Divide & Conquer | O(S log n) | O(log n) | Recursion overhead; no practical benefit |
| Binary Search | O(S log m) | O(1) | m = min string length; overkill for this |

**Why Vertical Scanning:**
- Time: O(S) where S = sum of all characters (worst case)
- Space: O(1) excluding output
- Early termination: Stops at first mismatch
- Clear and simple implementation

**Best case:** O(n) when first character differs across strings (n = number of strings)

---

## Common Mistakes

### 1. Not handling empty array
```
# WRONG: Assumes array has elements
prefix = strs[0]  # Crashes if strs is empty

# CORRECT: Check first
if not strs:
    return ""
```

### 2. Not handling empty strings in array
```
# WRONG: Assumes all strings have characters
for i in range(len(strs[0])):  # What if strs[0] is ""?
    char = strs[0][i]

# CORRECT: Check bounds
if not strs or not strs[0]:
    return ""
```

### 3. Index out of bounds in vertical scanning
```
# WRONG: Doesn't check string length
for i in range(len(strs[0])):
    for s in strs:
        if s[i] != strs[0][i]:  # s might be shorter than strs[0]!
            return strs[0][:i]

# CORRECT: Check bounds first
for i in range(len(strs[0])):
    for s in strs:
        if i >= len(s) or s[i] != strs[0][i]:
            return strs[0][:i]
```

### 4. Inefficient string concatenation
```
# INEFFICIENT: Building string character by character
prefix = ""
for i in range(min_length):
    if all strings match at position i:
        prefix += strs[0][i]  # String concatenation is O(n) each time

# BETTER: Use slicing at the end
# Just find the index where mismatch occurs, then slice once
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Longest common suffix** | Find suffix instead | Scan from end backwards |
| **Case-insensitive** | Ignore case | Convert to lowercase before comparing |
| **K common prefix** | Find k-length prefix | Stop when prefix length reaches k |
| **Trie-based** | Use trie structure | Build trie, traverse until branch |
| **Multiple prefixes** | Find all common substrings | Use different algorithm (suffix array) |
| **Streaming input** | Strings arrive one at a time | Update prefix incrementally |

**Variation: Horizontal scanning approach:**
```
def longestCommonPrefix(strs):
    if not strs:
        return ""

    prefix = strs[0]

    for i in range(1, len(strs)):
        # Trim prefix until it matches beginning of strs[i]
        while not strs[i].startswith(prefix):
            prefix = prefix[:-1]  # Remove last character
            if not prefix:
                return ""

    return prefix
```

**Variation: Using min/max strings (optimization):**
```
def longestCommonPrefix(strs):
    if not strs:
        return ""

    # Alphabetically first and last strings
    # If these share a prefix, all strings in between do too
    s1 = min(strs)
    s2 = max(strs)

    for i, char in enumerate(s1):
        if char != s2[i]:
            return s1[:i]

    return s1
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles basic case (Example 1: "fl")
- [ ] Handles no common prefix (Example 2: "")
- [ ] Handles empty array edge case
- [ ] Handles array with single string
- [ ] Handles strings of different lengths

**Optimization:**
- [ ] Achieved O(S) time complexity
- [ ] Used O(1) extra space
- [ ] Implements early termination
- [ ] Avoids unnecessary string operations

**Interview Readiness:**
- [ ] Can explain vertical scanning in 2 minutes
- [ ] Can code solution in 5 minutes
- [ ] Can discuss horizontal vs vertical approaches
- [ ] Can explain time/space complexity
- [ ] Can handle follow-ups about edge cases

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve (vertical scanning)
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement horizontal scanning approach
- [ ] Day 14: Solve related problem (Longest Common Subsequence)
- [ ] Day 30: Quick review and complexity analysis

---

**Strategy**: See [String Processing](../../prerequisites/strings.md) | [Two Pointers Pattern](../../strategies/patterns/two-pointers.md)
