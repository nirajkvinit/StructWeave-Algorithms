---
id: E061
old_id: F151
slug: reverse-words-in-a-string
title: Reverse Words in a String
difficulty: easy
category: easy
topics: ["string", "two-pointers"]
patterns: ["two-pointers", "string-manipulation"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E151", "E186", "M557"]
prerequisites: ["string-basics", "two-pointers"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Reverse Words in a String

## Problem

Given a string containing words separated by spaces, return a new string with the words in reverse order, separated by a single space.

A word is defined as a maximal sequence of non-space characters. The input string may contain:
- Leading spaces: "  hello world" → "world hello"
- Trailing spaces: "hello world  " → "world hello"
- Multiple spaces between words: "a  good   example" → "example good a"

Your output should have exactly one space between words, with no leading or trailing spaces.

For example:
- "the sky is blue" → "blue is sky the"
- "  hello world  " → "world hello" (trimmed)
- "a good   example" → "example good a" (single spaces)

Think of this as a two-step process: first identify where words are (handling variable spacing), then arrange them in reverse order.

**Watch out for:**
- Empty strings between multiple spaces are not words.
- You must reduce multiple consecutive spaces to a single space.
- Leading and trailing spaces must be removed entirely.

## Why This Matters

This problem teaches string parsing and manipulation patterns used in:
- Text editors implementing undo operations or line reversal
- Log file analysis (reading most recent entries first)
- Natural language processing (sentence structure manipulation)
- Command-line tools that process text streams

The technique of splitting on whitespace, processing tokens, and reconstructing output is fundamental to text processing. Combined with two-pointer approaches for in-place manipulation, these patterns appear in data cleaning, format conversion, and implementing text-based protocols.

## Examples

**Example 1:**
- Input: `s = "the sky is blue"`
- Output: `"blue is sky the"`

**Example 2:**
- Input: `s = "  hello world  "`
- Output: `"world hello"`
- Explanation: Your reversed string should not contain leading or trailing spaces.

**Example 3:**
- Input: `s = "a good   example"`
- Output: `"example good a"`
- Explanation: You need to reduce multiple spaces between two words to a single space in the reversed string.

## Constraints

- 1 <= s.length <= 10⁴
- s contains English letters (upper-case and lower-case), digits, and spaces ' '.
- There is **at least one** word in s.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Breaking Down the Problem</summary>

This problem has several requirements:
1. Reverse the order of words
2. Remove leading/trailing spaces
3. Reduce multiple spaces to single spaces

Can you solve each part separately? How would you identify where words start and end when there are multiple spaces?

Think about: what defines a "word" in this context?

</details>

<details>
<summary>🎯 Hint 2: Multiple Approaches</summary>

**Built-in approach (easy but may not be allowed):**
- Use split() to get words (automatically handles multiple spaces)
- Reverse the list of words
- Join with single space

**Manual approach (more challenging):**
1. Trim leading/trailing spaces
2. Extract words one by one (skip multiple spaces)
3. Build result by prepending each word

**In-place approach (O(1) extra space, for char arrays):**
1. Reverse entire string
2. Reverse each word individually
3. Clean up extra spaces

Which approach does your interviewer prefer? Always clarify constraints!

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithm (Built-in)</summary>

```
1. Split string by whitespace to get list of words
   (split() automatically handles multiple spaces)
2. Filter out empty strings (if any)
3. Reverse the list of words
4. Join words with single space
5. Return result
```

**Manual extraction:**
```
1. Initialize result = []
2. Initialize i = 0
3. While i < length:
   a. Skip spaces: while s[i] == ' ', i++
   b. Extract word: start = i
   c. While i < length and s[i] != ' ', i++
   d. Add s[start:i] to result
4. Reverse result array
5. Join with single space
```

Time: O(n), Space: O(n)

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| **Built-in Split/Reverse/Join** | **O(n)** | **O(n)** | Simplest; usually acceptable |
| Manual Word Extraction | O(n) | O(n) | More control over parsing |
| In-place (char array) | O(n) | O(1) | Only works if input is mutable char array |

## Common Mistakes

### 1. Not Handling Multiple Spaces
```python
# WRONG: split(' ') creates empty strings for multiple spaces
words = s.split(' ')  # "a  b" -> ['a', '', 'b']
result = ' '.join(reversed(words))  # "b  a" (extra space!)

# CORRECT: split() without argument handles multiple spaces
words = s.split()  # "a  b" -> ['a', 'b']
result = ' '.join(reversed(words))  # "b a"
```

### 2. Not Removing Leading/Trailing Spaces
```python
# WRONG: Doesn't trim input
words = s.split()
# split() handles this, but if manually parsing:

# WRONG: Manual parsing without trimming
i = 0  # Starts at leading space
while i < len(s):
    # Will include leading space in result

# CORRECT: Skip leading spaces first
i = 0
while i < len(s) and s[i] == ' ':
    i += 1
```

### 3. Inefficient String Concatenation
```python
# WRONG: O(n²) due to string immutability
result = ""
for word in reversed(words):
    result += word + " "  # Creates new string each time

# CORRECT: Use list and join (O(n))
result_list = []
for word in reversed(words):
    result_list.append(word)
result = ' '.join(result_list)
# Or simply: ' '.join(reversed(words))
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Reverse Characters | Reverse entire string | Simple two-pointer swap |
| Reverse Each Word | Keep word order, reverse letters | Split, reverse each word, join |
| Rotate Words | Move first k words to end | Split, slice and concatenate |
| In-place (char array) | O(1) space requirement | Reverse all, then reverse each word |

## Practice Checklist

**Correctness:**
- [ ] Handles single word
- [ ] Handles leading spaces
- [ ] Handles trailing spaces
- [ ] Handles multiple spaces between words
- [ ] Returns single space between words
- [ ] Preserves word order (reversed)

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 10 minutes
- [ ] Can discuss O(1) space approach
- [ ] Can explain why split() is used

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Two Pointers Pattern](../../strategies/patterns/two-pointers.md)
