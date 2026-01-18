---
id: E157
old_id: I233
slug: number-of-segments-in-a-string
title: Number of Segments in a String
difficulty: easy
category: easy
topics: ["string", "two-pointers"]
patterns: ["linear-scan", "state-tracking"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E162", "E001", "M050"]
prerequisites: ["string-iteration", "state-machines"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Number of Segments in a String

## Problem

Count how many separate word-like segments appear in a given string `s`.

A **segment** is defined as any sequence of consecutive non-space characters. In other words, a segment is what you'd typically think of as a "word" when reading text, separated by one or more space characters.

This seemingly simple task has several subtle edge cases that make it interesting. The string might have leading spaces ("  hello"), trailing spaces ("hello  "), or multiple consecutive spaces between words ("hello    world"). Your solution needs to handle all these cases correctly and count only the actual segments, not the spaces.

For example, "Hello, my name is John" has five segments: "Hello,", "my", "name", "is", and "John". Notice that punctuation stays attached to the word it's next to, since we're only splitting on spaces.

## Why This Matters

Segment counting is a fundamental building block in text processing systems. It's used in word count features (like those in Microsoft Word or Google Docs), search indexing (where documents need to be broken into searchable units), natural language processing pipelines (tokenization is often the first step), and log file analysis (parsing server logs often involves splitting on whitespace). This problem teaches you state machine thinking: you're either "inside" a segment or "outside" a segment, and you transition between these states as you scan the string. State machines are everywhere in computer science, from regex engines to network protocol handlers to lexical analyzers in compilers. Learning to track state cleanly while iterating is a skill that transfers to countless other problems.

## Examples

**Example 1:**
- Input: `s = "Hello, my name is John"`
- Output: `5`
- Explanation: There are five segments: ["Hello,", "my", "name", "is", "John"]

**Example 2:**
- Input: `s = "Hello"`
- Output: `1`

## Constraints

- 0 <= s.length <= 300
- s consists of lowercase and uppercase English letters, digits, or one of the following characters "!@#$%^&*()_+-=',.:".
- The only space character in s is ' '.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Built-in String Methods
**Hint**: Most programming languages have a split() function that handles consecutive spaces automatically.

**Key Ideas**:
- Split string by space character
- Filter out empty strings from the result
- Count remaining segments

**Why This Works**: Built-in methods handle edge cases like leading, trailing, and multiple consecutive spaces.

### Intermediate Approach - Single Pass with State Tracking
**Hint**: Track whether you're currently "inside" a segment or "outside" (in a space).

**Optimization**:
- Use a boolean flag to track if you're in a segment
- When transitioning from space to non-space, increment segment counter
- When transitioning from non-space to space, update flag but don't count

**Trade-off**: More control over logic, better for understanding state machines.

### Advanced Approach - Boundary Detection
**Hint**: Count the number of segment starts. A segment starts when current char is not a space and previous char is a space (or start of string).

**Key Insight**:
- Only increment counter when you find the beginning of a new segment
- Check: `(i == 0 || s[i-1] == ' ') && s[i] != ' '`
- This eliminates the need for state tracking

**Why This is Optimal**: O(n) time with minimal state, O(1) space, cleaner logic.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Built-in split() | O(n) | O(n) | Creates array of segments |
| State Machine | O(n) | O(1) | Single pass with flag |
| Boundary Detection | O(n) | O(1) | Single pass, no extra state |
| Character-by-character with array | O(n) | O(n) | Inefficient space usage |

## Common Mistakes

### Mistake 1: Not handling multiple consecutive spaces
```
# WRONG - Counts spaces between segments
count = 0
for i in range(len(s)):
    if s[i] == ' ':
        count += 1  # This counts spaces, not segments!
return count + 1  # Wrong for multiple spaces
```
**Why it fails**: "a  b" (two spaces) would count as 3 segments instead of 2.

**Correct approach**: Count segment starts, not space-to-segment transitions.

### Mistake 2: Forgetting edge cases (leading/trailing spaces)
```
# WRONG - Assumes no leading/trailing spaces
segments = s.split(' ')
return len(segments)  # Returns wrong count for " a b " -> 4 instead of 2
```
**Why it fails**: Split with single space creates empty strings for consecutive spaces.

**Correct approach**: Filter empty strings or use state-based counting.

### Mistake 3: Off-by-one errors with state tracking
```
# WRONG - Incorrect initial state
in_segment = True  # Should be False
count = 0
for char in s:
    if char != ' ' and not in_segment:
        count += 1
        in_segment = True
    elif char == ' ':
        in_segment = False
```
**Why it fails**: Starting with in_segment=True causes miscounting on first character.

**Correct approach**: Initialize state as "not in segment" (False or equivalent).

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Count Words with Custom Delimiters | Multiple delimiter characters (space, comma, etc.) | Easy |
| Maximum Segment Length | Return length of longest segment | Easy |
| Segment with Specific Pattern | Count segments matching a pattern (e.g., alphanumeric only) | Medium |
| K-length Segments | Count only segments with exactly K characters | Medium |
| Segment Frequency Analysis | Return frequency map of each segment | Medium |

## Practice Checklist

Track your progress as you master this problem:

- [ ] **Day 1**: Solve using built-in split() method (allow 10 mins)
- [ ] **Day 2**: Implement state machine approach from scratch
- [ ] **Day 3**: Code boundary detection solution without reference
- [ ] **Week 2**: Test with edge cases: "", " ", "  a  ", "a b c"
- [ ] **Week 4**: Solve with custom delimiter requirement
- [ ] **Week 8**: Speed drill - solve in under 5 minutes

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md) for state tracking techniques.
