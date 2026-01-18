---
id: E028
old_id: F058
slug: length-of-last-word
title: Length of Last Word
difficulty: easy
category: easy
topics: ["string"]
patterns: ["string-parsing"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E434", "E058", "E014"]
prerequisites: ["strings", "iteration"]
strategy_ref: ../../strategies/fundamentals/string-manipulation.md
---
# Length of Last Word

## Problem

Given a string containing words separated by spaces, find the length of the last word in the string. A word is defined as a maximal sequence of non-space characters.

For example, in the string "Hello World", the last word is "World" which has length 5. The string may contain trailing spaces (like "fly me   to   the moon  "), so you need to identify where the actual last word ends and ignore any spaces after it. The string may also have multiple consecutive spaces between words, but these don't affect which word is considered last.

Your task is to return the length of this final word as an integer. The input is guaranteed to contain at least one word.

## Why This Matters

This problem teaches fundamental string traversal techniques that appear throughout text processing systems. While the task seems simple, it introduces an important optimization pattern: working backwards from the end of a string when you only need information about the tail.

Real-world applications include parsing command-line arguments (finding the last parameter), analyzing log file entries (extracting the final field), and implementing text editors (word-based navigation). The reverse scanning technique you'll learn here is valuable for many string algorithms where you can avoid processing unnecessary data by starting from the end.

This is also a common interview warm-up problem that tests your attention to edge cases like trailing spaces and your ability to write clean, efficient code.

## Examples

**Example 1:**
- Input: `s = "Hello World"`
- Output: `5`
- Explanation: The last word is "World" with length 5.

**Example 2:**
- Input: `s = "   fly me   to   the moon  "`
- Output: `4`
- Explanation: The last word is "moon" with length 4.

**Example 3:**
- Input: `s = "luffy is still joyboy"`
- Output: `6`
- Explanation: The last word is "joyboy" with length 6.

## Constraints

- 1 <= s.length <= 10⁴
- s consists of only English letters and spaces ' '.
- There will be at least one word in s.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Starting from the End</summary>

Since you need the last word, why traverse the entire string? Think about starting from the end and working backwards. What are the two key steps you need to perform?

Key insight: Trailing spaces don't belong to any word - you need to skip them first.

</details>

<details>
<summary>🎯 Hint 2: Two-Phase Scan</summary>

Working from the end of the string:
1. First, skip all trailing spaces to find where the last word ends
2. Then, count characters until you hit another space (or the beginning)

This approach is O(n) but often finishes much faster since you start from the end.

</details>

<details>
<summary>📝 Hint 3: Backward Iteration Algorithm</summary>

```
Algorithm (Reverse Scan):
1. Start from index = len(s) - 1
2. Skip trailing spaces:
   while index >= 0 and s[index] == ' ':
       index--
3. Count word characters:
   length = 0
   while index >= 0 and s[index] != ' ':
       length++
       index--
4. Return length

Example trace for "  hello world  ":
         01234567890123
- Start at index 13 (last char)
- Skip spaces: index = 11 (at 'd')
- Count: 'd','l','r','o','w' = 5
- Hit space at index 6, stop
- Return 5
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Split and Count | O(n) | O(n) | Split into words array, return last word length |
| Strip and Split | O(n) | O(n) | s.strip().split()[-1] approach |
| **Reverse Scan** | **O(n)** | **O(1)** | Scan from end, no extra space |

## Common Mistakes

### 1. Not Handling Trailing Spaces
```python
# WRONG: Assumes no trailing spaces
def lengthOfLastWord(s):
    length = 0
    for i in range(len(s)-1, -1, -1):
        if s[i] != ' ':
            length += 1
        else:
            break  # Wrong if we haven't found word yet!
    return length

# CORRECT: Skip trailing spaces first
def lengthOfLastWord(s):
    i = len(s) - 1
    # Skip trailing spaces
    while i >= 0 and s[i] == ' ':
        i -= 1
    # Count word length
    length = 0
    while i >= 0 and s[i] != ' ':
        length += 1
        i -= 1
    return length
```

### 2. Inefficient String Operations
```python
# WRONG: Creating many intermediate strings
words = s.strip().split(' ')
words = [w for w in words if w]  # Remove empty strings
return len(words[-1])

# CORRECT: Direct scan without splits
# (see algorithm above)
```

### 3. Edge Case Mishandling
```python
# WRONG: Not checking bounds
for i in range(len(s)-1, -1, -1):
    if s[i] != ' ':
        # count characters
# What if s is all spaces? (Though constraints say at least one word)

# CORRECT: Always verify constraints and handle edge cases
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Length of First Word | Find first instead of last | Scan from beginning, skip leading spaces |
| Longest Word | Find max length word | Track max while scanning all words |
| Count Words | Count total words | Count transitions from space to non-space |

## Practice Checklist

**Correctness:**
- [ ] Handles single word
- [ ] Handles multiple words
- [ ] Handles leading spaces
- [ ] Handles trailing spaces
- [ ] Handles multiple spaces between words
- [ ] Returns correct integer

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 10 minutes
- [ ] Can discuss complexity
- [ ] Can explain why reverse scan is optimal

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations (first word, longest word)
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [String Manipulation](../../strategies/fundamentals/string-manipulation.md)
