---
id: E018
old_id: F028
slug: find-the-index-of-the-first-occurrence-in-a-string
title: Find the Index of the First Occurrence in a String
difficulty: easy
category: easy
topics: ["string", "string-matching"]
patterns: ["two-pointers", "string-matching", "sliding-window"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E001", "M028", "M214"]
prerequisites: ["string-traversal", "pattern-matching", "kmp-algorithm"]
strategy_ref: ../../strategies/patterns/string-matching.md
---
# Find the Index of the First Occurrence in a String

## Problem

Given two strings, a haystack and a needle, find the starting position of the first occurrence of the needle within the haystack. If the needle does not appear in the haystack, return `-1`.

This is the classic substring search problem. For example, searching for `"sad"` in `"sadbutsad"` should return `0` because the first occurrence starts at index 0 (even though it also appears at index 6). Searching for `"algop"` in `"algoprac"` returns `-1` because the needle never appears completely.

While many programming languages provide built-in functions for this task, understanding how to implement it yourself reveals important concepts about pattern matching efficiency. The naive approach of checking every possible position works but can be slow for long strings. The challenge is understanding when and how more sophisticated algorithms like KMP (Knuth-Morris-Pratt) can dramatically improve performance.

## Why This Matters

String searching is one of the most fundamental operations in computer science, appearing in text editors, search engines, DNA sequence analysis, plagiarism detection, and virus scanning. Every time you use Ctrl+F or search functionality, you are using a variant of this algorithm.

This problem introduces you to the tension between simplicity and efficiency in algorithm design. The straightforward sliding window approach is easy to implement and often sufficient, but understanding advanced algorithms like KMP or Boyer-Moore reveals how preprocessing patterns can eliminate redundant comparisons. This pattern of trading preprocessing time for faster searches appears throughout computer science, from database indexing to compiler optimization.

## Examples

**Example 1:**
- Input: `haystack = "sadbutsad", needle = "sad"`
- Output: `0`
- Explanation: "sad" occurs at index 0 and 6.
The first occurrence is at index 0, so we return 0.

**Example 2:**
- Input: `haystack = "algoprac", needle = "algop"`
- Output: `-1`
- Explanation: "algop" did not occur in "algoprac", so we return -1.

## Constraints

- 1 <= haystack.length, needle.length <= 10⁴
- haystack and needle consist of only lowercase English characters.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Sliding Window Pattern</summary>

Think of sliding the needle over the haystack, checking at each position if there's a match. For each starting position in haystack, compare the next 'needle.length' characters.

When can you skip positions? When do you know a position can't possibly be a match?

</details>

<details>
<summary>🎯 Hint 2: Naive String Matching</summary>

For a simple O(n×m) solution:
1. Iterate through haystack from index 0 to (haystack.length - needle.length)
2. At each position i, check if haystack[i:i+needle.length] matches needle
3. If match found, return i
4. If no match found after checking all positions, return -1

**Optimization opportunity:** You can use built-in string methods (like indexOf/find), but can you implement the logic yourself?

</details>

<details>
<summary>📝 Hint 3: Optimized Algorithms</summary>

**Naive Approach (Easy to implement):**
```
1. For i from 0 to (haystack.length - needle.length):
   a. matched = true
   b. For j from 0 to needle.length:
      - If haystack[i+j] != needle[j]:
        * matched = false
        * Break
   c. If matched:
      - Return i
2. Return -1
```

**KMP Algorithm (Optimal - O(n+m)):**
```
1. Build failure function (LPS array) for needle
2. Use two pointers to traverse haystack and needle
3. When mismatch occurs, use LPS to skip unnecessary comparisons
4. Return index when full match found
```

For interviews, naive approach is usually sufficient unless specifically asked for optimal.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| **Naive (sliding window)** | **O(n × m)** | **O(1)** | n = haystack length, m = needle length |
| Built-in indexOf/find | O(n × m) | O(1) | Implementation-dependent |
| KMP Algorithm | O(n + m) | O(m) | Optimal but complex to implement |
| Boyer-Moore | O(n/m) best, O(n×m) worst | O(m) | Good for large alphabets |
| Rabin-Karp | O(n + m) average | O(1) | Uses rolling hash |

## Common Mistakes

### 1. Not checking bounds correctly
```python
# WRONG: May check beyond haystack length
for i in range(len(haystack)):
    if haystack[i:i+len(needle)] == needle:
        return i
# When i = len(haystack)-1, slicing creates shorter string than needle

# CORRECT: Stop at right position
for i in range(len(haystack) - len(needle) + 1):
    if haystack[i:i+len(needle)] == needle:
        return i
return -1
```

### 2. Not handling edge cases
```python
# WRONG: Doesn't handle empty needle or needle longer than haystack
for i in range(len(haystack)):
    # ... search logic ...

# CORRECT: Handle edge cases
if not needle:
    return 0  # Or -1, depending on specification
if len(needle) > len(haystack):
    return -1
```

### 3. Inefficient character-by-character comparison with string slicing
```python
# INEFFICIENT: Creates new string for each comparison
for i in range(len(haystack) - len(needle) + 1):
    if haystack[i:i+len(needle)] == needle:  # O(m) substring creation
        return i

# MORE EFFICIENT: Manual character comparison (though above is cleaner)
for i in range(len(haystack) - len(needle) + 1):
    match = True
    for j in range(len(needle)):
        if haystack[i+j] != needle[j]:
            match = False
            break
    if match:
        return i
```

### 4. Not returning -1 when not found
```python
# WRONG: Returns None or throws error
for i in range(len(haystack) - len(needle) + 1):
    if haystack[i:i+len(needle)] == needle:
        return i
# Missing return -1

# CORRECT: Explicit return -1
for i in range(len(haystack) - len(needle) + 1):
    if haystack[i:i+len(needle)] == needle:
        return i
return -1
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Find all occurrences | Return list of all indices | Continue searching after finding match |
| Case insensitive | Ignore case | Convert both to lowercase before comparison |
| Find last occurrence | Return last index | Search from right to left or store last match |
| Wildcard matching | Allow '*' and '?' | Use dynamic programming |
| Regex matching | Full regex support | Use DFA/NFA or regex engine |
| Count occurrences | Return count instead of index | Count all matches, allow overlapping or not |

## Practice Checklist

**Correctness:**
- [ ] Handles needle at start of haystack
- [ ] Handles needle at end of haystack
- [ ] Handles needle in middle
- [ ] Handles needle not present
- [ ] Handles needle longer than haystack
- [ ] Handles empty needle (if applicable)
- [ ] Handles single character needle

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 7-10 minutes
- [ ] Can discuss complexity
- [ ] Can explain why naive is O(n×m)
- [ ] Can mention KMP as optimal solution (bonus)

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations (find all occurrences)
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [String Matching Algorithms](../../strategies/patterns/string-matching.md)
