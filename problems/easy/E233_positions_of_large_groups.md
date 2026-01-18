---
id: E233
old_id: A297
slug: positions-of-large-groups
title: Positions of Large Groups
difficulty: easy
category: easy
topics: ["string", "two-pointers"]
patterns: ["two-pointers-same"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["two-pointers", "string-traversal"]
related_problems: ["E028", "E058", "M003"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Positions of Large Groups

## Problem

You're given a string `s` containing only lowercase letters. Your task is to find all consecutive groups of the same character that have 3 or more characters, and return their starting and ending positions.

A **group** is any consecutive sequence of identical characters. For example, in the string "abbxxxxzyy", the groups are "a" (length 1), "bb" (length 2), "xxxx" (length 4), "z" (length 1), and "yy" (length 2). Among these, only "xxxx" qualifies as a **large group** because it has 3 or more characters.

Each group should be represented as an interval `[start, end]` where both indices are inclusive (meaning the character at position `end` is part of the group). The groups in your answer should be sorted by their starting position, which happens naturally if you scan left to right.

For instance, if the string is "abcdddeeeeaabbbcd", you'd identify "ddd" at positions [3,5], "eeee" at positions [6,9], and "bbb" at positions [12,14]. Single characters and pairs don't count, no matter how many times they appear separately.

## Why This Matters

This problem teaches the two-pointer technique for string segmentation, a fundamental pattern used in parsing, tokenization, and run-length encoding. Run-length encoding compresses data by representing consecutive identical values as "value, count" pairs, which is crucial in image compression (think of long runs of the same pixel color), data compression, and file format design.

The pattern of "find consecutive groups with a property" appears constantly in real-world applications: identifying repeated patterns in log files, detecting duplicates in sorted data streams, analyzing DNA sequences for repeated nucleotides, and processing time-series data for consecutive events. For example, finding periods of sustained high temperature or consecutive trading days with stock increases.

Two-pointer techniques allow you to process data in a single pass with O(1) extra space, making them essential for streaming data where you can't store everything in memory. This skill is valuable for interview problems involving string processing, array segmentation, and sequence analysis.

## Examples

**Example 1:**
- Input: `s = "abbxxxxzzy"`
- Output: `[[3,6]]`
- Explanation: "xxxx" is the only large group with start index 3 and end index 6.

**Example 2:**
- Input: `s = "abc"`
- Output: `[]`
- Explanation: We have groups "a", "b", and "c", none of which are large groups.

**Example 3:**
- Input: `s = "abcdddeeeeaabbbcd"`
- Output: `[[3,5],[6,9],[12,14]]`
- Explanation: The large groups are "ddd", "eeee", and "bbb".

## Constraints

- 1 <= s.length <= 1000
- s contains lowercase English letters only.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Single Pass with Counting
Iterate through the string while keeping track of the current character and how many times it repeats consecutively. When the character changes, check if the previous group was large (3+ characters). How do you track the start position of each group?

### Tier 2: Two-Pointer Technique
Use two pointers: one marking the start of a group and one scanning ahead to find where the group ends. When you find a different character, calculate the group length. If it's at least 3, record the interval [start, end]. Then move the start pointer to begin the next group.

### Tier 3: Edge Cases
Don't forget to check the last group in the string - your loop might end before processing it. Also consider strings with all identical characters, strings with no large groups, and strings with multiple consecutive large groups.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Single Pass Counting | O(n) | O(k) | k = number of large groups found |
| Two Pointers (Optimal) | O(n) | O(k) | Visit each character once |
| Groupby (Python) | O(n) | O(k) | Using itertools.groupby for cleaner code |

Where n = length of string, k = number of large groups

## Common Mistakes

### Mistake 1: Forgetting the Last Group
```python
# Wrong: Doesn't process the last group
def largeGroupPositions(s):
    result = []
    start = 0
    for i in range(1, len(s)):
        if s[i] != s[i-1]:
            if i - start >= 3:
                result.append([start, i-1])
            start = i
    # Missing: check the final group!
    return result

# Correct: Process last group after loop
if len(s) - start >= 3:
    result.append([start, len(s)-1])
return result
```

### Mistake 2: Off-by-One in Interval
```python
# Wrong: Incorrect end index
def largeGroupPositions(s):
    result = []
    start = 0
    for i in range(1, len(s)):
        if s[i] != s[i-1]:
            if i - start >= 3:
                result.append([start, i])  # Should be i-1!
            start = i
    return result

# Correct: End index is inclusive
result.append([start, i-1])
```

### Mistake 3: Wrong Large Group Condition
```python
# Wrong: Uses > instead of >=
def largeGroupPositions(s):
    result = []
    start = 0
    for i in range(1, len(s)):
        if s[i] != s[i-1]:
            if i - start > 3:  # Should be >= 3
                result.append([start, i-1])
            start = i
    return result

# Correct: Large group is 3 or more
if i - start >= 3:
    result.append([start, i-1])
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| K-Size Groups | Easy | Find all groups of exactly k consecutive identical characters. |
| Largest Group Only | Easy | Return only the interval of the largest consecutive group. |
| Groups of Any Size | Easy | Return intervals for all groups (not just large ones). |
| Count Large Groups | Easy | Return count of large groups instead of their positions. |
| Non-Overlapping Groups | Medium | Find maximum number of large groups with no overlap after deletions. |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Solved with single-pass approach
- [ ] Handled edge case: last group is large
- [ ] Handled edge case: entire string is one large group
- [ ] Handled edge case: no large groups exist
- [ ] Handled edge case: multiple large groups back-to-back
- [ ] Tested with minimum length string
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Can explain approach to someone else

**Strategy**: See [Two Pointers Patterns](../strategies/patterns/two-pointers.md)
