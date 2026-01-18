---
id: M284
old_id: A088
slug: add-bold-tag-in-string
title: Add Bold Tag in String
difficulty: medium
category: medium
topics: ["array", "string"]
patterns: ["interval-merge", "marking"]
estimated_time_minutes: 30
frequency: medium
related_problems:
  - id: E056
    name: Merge Intervals
    difficulty: easy
  - id: M100
    name: Insert Interval
    difficulty: medium
  - id: M200
    name: Bold Words in String
    difficulty: medium
prerequisites:
  - concept: Interval merging
    level: intermediate
  - concept: String searching
    level: basic
  - concept: Boolean array marking
    level: basic
---
# Add Bold Tag in String

## Problem

You have a text string `s` and a list of words to highlight. Your job is to add HTML bold tags (`<b>` and `</b>`) around every occurrence of these words in the text. However, there are special merging rules to avoid nested or adjacent tag pairs.

The task breaks down into two key challenges:

1. **Finding all matches**: Search through `s` and identify every position where any word from the `words` array appears. Note that words can overlap. For example, if `s = "aaabbb"` and `words = ["aa", "b"]`, the word "aa" matches at positions 0-1 and 1-2 (overlapping), while "b" matches at positions 3, 4, and 5.

2. **Merging bold regions**: When matches overlap or touch, they must share the same pair of bold tags rather than creating separate pairs. For instance:
   - Overlapping: "aa" at [0,1] and "aa" at [1,2] should create `<b>aaa</b>`, not `<b>aa</b><b>a</b>`
   - Adjacent: "b" at [3], [4], [5] should create `<b>bbb</b>`, not `<b>b</b><b>b</b><b>b</b>`
   - Final result: `<b>aaabbb</b>`

Think of it as painting characters bold. Once a character is marked bold, it stays bold. Then you need to identify the boundaries where bold regions start and end to place your tags correctly. A character that transitions from non-bold to bold needs a `<b>` tag before it. A bold character followed by a non-bold character needs a `</b>` tag after it.

## Why This Matters

This problem models text highlighting features found in search engines, text editors, and syntax highlighters. When you search on a webpage and results appear with highlighted query terms, similar logic merges overlapping matches. The interval merging pattern appears frequently in scheduling problems, calendar applications (merging overlapping meetings), and genomics (merging overlapping DNA sequence reads). Learning to mark positions and then process boundaries efficiently is a transferable skill. The problem also reinforces the difference between naive string manipulation (which creates nested tags) versus proper state tracking with a boolean array.

## Examples

**Example 1:**
- Input: `s = "abcxyz123", words = ["abc","123"]`
- Output: `"<b>abc</b>xyz<b>123</b>"`
- Explanation: The two strings from words appear as substrings: "abcxyz123".
We insert <b> before each matching substring and </b> after each one.

**Example 2:**
- Input: `s = "aaabbb", words = ["aa","b"]`
- Output: `"<b>aaabbb</b>"`
- Explanation: "aa" matches at two positions: "aaabbb" and "aaabbb".
"b" matches at three positions: "aaabbb", "aaabbb", and "aaabbb".
We insert <b> before each match and </b> after: "<b>aa</b><b>a</b><b>b</b><b>b</b><b>b</b>".
The first two <b></b> pairs overlap, so we merge them: "<b>aaa</b><b>b</b><b>b</b><b>b</b>".
Since all four sections are now consecutive, we merge them: "<b>aaabbb</b>".

## Constraints

- 1 <= s.length <= 1000
- 0 <= words.length <= 100
- 1 <= words[i].length <= 1000
- s and words[i] consist of English letters and digits.
- All the values of words are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Mark Bold Positions with Boolean Array</summary>

Create a boolean array to mark which positions in `s` should be bold:
1. Initialize `bold[i] = False` for all positions
2. For each word in `words`, find all occurrences in `s`
3. Mark positions as `True` for each occurrence

```python
def mark_bold_positions(s, words):
    n = len(s)
    bold = [False] * n

    for word in words:
        word_len = len(word)
        # Find all occurrences of word in s
        for i in range(n - word_len + 1):
            if s[i:i + word_len] == word:
                # Mark this range as bold
                for j in range(i, i + word_len):
                    bold[j] = True

    return bold
```

**Key Insight**: Boolean array naturally handles overlapping intervals by marking positions independently.
</details>

<details>
<summary>Hint 2: Build Result String from Boolean Array</summary>

Traverse the boolean array and insert tags at boundaries:
- Insert `<b>` when transitioning from False to True
- Insert `</b>` when transitioning from True to False

```python
def build_result(s, bold):
    result = []

    for i in range(len(s)):
        # Opening tag: bold starts
        if bold[i] and (i == 0 or not bold[i-1]):
            result.append("<b>")

        result.append(s[i])

        # Closing tag: bold ends
        if bold[i] and (i == len(s) - 1 or not bold[i+1]):
            result.append("</b>")

    return "".join(result)
```

**Boundary Conditions**:
- Start: `i == 0` or previous position not bold
- End: `i == len(s) - 1` or next position not bold
</details>

<details>
<summary>Hint 3: Complete Solution with Optimized Search</summary>

```python
def addBoldTag(s, words):
    n = len(s)
    bold = [False] * n

    # Mark all bold positions
    for word in words:
        word_len = len(word)
        # Use Python's str.find() for efficiency
        start = 0
        while start < n:
            pos = s.find(word, start)
            if pos == -1:
                break
            # Mark range [pos, pos + word_len)
            for i in range(pos, pos + word_len):
                bold[i] = True
            start = pos + 1  # Continue searching from next position

    # Build result with tags
    result = []
    for i in range(n):
        if bold[i] and (i == 0 or not bold[i-1]):
            result.append("<b>")
        result.append(s[i])
        if bold[i] and (i == n - 1 or not bold[i+1]):
            result.append("</b>")

    return "".join(result)
```

**Optimization**: Use built-in string search methods and continue searching from next position to find overlapping occurrences.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Boolean Array Marking | O(n × m × k) | O(n) | n = len(s), m = len(words), k = avg word length |
| Interval Merge | O(n × m × k + I log I) | O(I) | I = number of intervals found |
| Optimized | O(n × m × k) | O(n) | Using str.find() for searching |

**Detailed Analysis:**
- **Time**: O(n × m × k) where:
  - n = length of string s
  - m = number of words
  - k = average word length
  - Each word requires O(n × k) substring comparisons
- **Space**: O(n) for boolean marking array
- **Key Insight**: Boolean array approach automatically merges overlapping intervals

## Common Mistakes

### Mistake 1: Not handling overlapping word occurrences
```python
# Wrong: Only finding first occurrence
pos = s.find(word)
if pos != -1:
    mark_bold(pos, pos + len(word))

# Correct: Find all occurrences
start = 0
while start < len(s):
    pos = s.find(word, start)
    if pos == -1:
        break
    mark_bold(pos, pos + len(word))
    start = pos + 1
```

### Mistake 2: Inserting tags inside bold regions
```python
# Wrong: Adding tags at every word boundary
for word in words:
    s = s.replace(word, f"<b>{word}</b>")
# This creates nested/overlapping tags

# Correct: Mark positions first, then add tags at boundaries
# Use boolean array approach
```

### Mistake 3: Incorrect boundary detection
```python
# Wrong: Not checking previous/next position
if bold[i]:
    result.append("<b>" + s[i] + "</b>")

# Correct: Check boundaries
if bold[i] and (i == 0 or not bold[i-1]):
    result.append("<b>")
result.append(s[i])
if bold[i] and (i == len(s)-1 or not bold[i+1]):
    result.append("</b>")
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Bold Words in String II | Support wildcards in word patterns | Hard |
| Multiple Tag Types | Support different tag types (bold, italic, underline) | Medium |
| Nested Tags | Handle tags that can be nested | Hard |
| Tag Minimization | Minimize total number of tags used | Medium |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] **Initial Attempt** - Solve independently (30 min limit)
- [ ] **Solution Study** - If stuck, study one approach deeply
- [ ] **Implementation** - Code solution from scratch without reference
- [ ] **Optimization** - Achieve O(n × m × k) solution
- [ ] **Edge Cases** - Test: empty words, overlapping words, consecutive words, entire string bold
- [ ] **Variations** - Solve at least 2 related problems
- [ ] **Spaced Repetition** - Re-solve after: 1 day, 1 week, 1 month

**Mastery Goal**: Solve in < 20 minutes with clean interval merging logic.

**Strategy**: See [Interval Patterns](../strategies/patterns/intervals.md) and [String Manipulation](../strategies/patterns/string-manipulation.md)
