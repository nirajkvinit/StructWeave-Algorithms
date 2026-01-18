---
id: M098
old_id: I045
slug: shortest-word-distance-iii
title: Shortest Word Distance III
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems: ["E244", "M097", "M244"]
prerequisites: ["arrays", "two-pointers", "iteration"]
---
# Shortest Word Distance III

## Problem

You are provided with a string array `wordsDict` representing a sequence of words, along with two strings `word1` and `word2` that both appear in the array. Your task is to find the minimum distance (index difference) between any occurrence of these two words. Here's the twist that makes this problem interesting: `word1` and `word2` might actually be the same word. When they're different words, this is straightforward, but when they're identical, you're looking for the minimum distance between any two distinct occurrences of the same word in the array. For example, if `word1 = word2 = "makes"` and "makes" appears at indices 1 and 4, the answer is 3. You need to handle both cases: when the words are different (tracking two separate last-seen positions) and when they're the same (tracking the current and previous positions of the same word). The goal is to solve this in a single pass with constant extra space, making smart decisions about which positions to track as you scan through the array.

## Why This Matters

This problem extends text proximity analysis to handle edge cases that appear in real search and information retrieval systems. When users search for phrases like "New York" or repeated terms, search engines must handle both inter-word distances (between different words) and intra-word distances (between occurrences of the same word). Document similarity algorithms compare texts by analyzing how repeated keywords are distributed throughout. Plagiarism detection systems look for suspicious patterns where the same phrases appear at regular intervals. In code analysis tools, finding the distance between variable references (including multiple uses of the same variable) helps detect potential bugs like race conditions or uninitialized usage. Spam filters analyze email text for repeated words appearing too close together, which is a common spam pattern. Understanding how to elegantly handle the "same word" case alongside the "different words" case demonstrates careful edge-case thinking, which is crucial for robust software engineering.

## Examples

**Example 1:**
- Input: `wordsDict = ["practice", "makes", "perfect", "coding", "makes"], word1 = "makes", word2 = "coding"`
- Output: `1`

**Example 2:**
- Input: `wordsDict = ["practice", "makes", "perfect", "coding", "makes"], word1 = "makes", word2 = "makes"`
- Output: `3`

## Constraints

- 1 <= wordsDict.length <= 10⁵
- 1 <= wordsDict[i].length <= 10
- wordsDict[i] consists of lowercase English letters.
- word1 and word2 are in wordsDict.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Edge Case Handling</summary>

Consider how this problem differs from finding the distance between two different words. When word1 equals word2, you need to track two separate occurrences. How can you maintain positions of the last two occurrences efficiently?

</details>

<details>
<summary>🎯 Hint 2: Single Pass Strategy</summary>

You can solve this in one pass through the array. Track the most recent position(s) of each target word. When word1 and word2 are different, maintain one position for each. When they're the same, maintain two positions for the same word.

</details>

<details>
<summary>📝 Hint 3: Algorithm Design</summary>

Pseudocode approach:
```
if word1 == word2:
    track previous_position and current_position
    for each index where word matches:
        update min_distance using (current - previous)
        shift: previous = current, current = index
else:
    track pos1 and pos2 separately
    for each index:
        if matches word1: update pos1, compute distance with pos2
        if matches word2: update pos2, compute distance with pos1
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Find all occurrences, compare all pairs |
| HashMap Storage | O(n) | O(n) | Store all indices per word, then find minimum |
| **Optimal Single Pass** | **O(n)** | **O(1)** | Track last positions only, compute on-the-fly |

## Common Mistakes

**Mistake 1: Not handling identical words**
```python
# Wrong: Doesn't handle word1 == word2 case
def shortest_distance(words, word1, word2):
    pos1, pos2 = -1, -1
    min_dist = float('inf')
    for i, word in enumerate(words):
        if word == word1:
            pos1 = i
        if word == word2:
            pos2 = i
        if pos1 != -1 and pos2 != -1:
            min_dist = min(min_dist, abs(pos1 - pos2))
    return min_dist
```

```python
# Correct: Separate logic for identical words
def shortest_distance(words, word1, word2):
    if word1 == word2:
        prev = -1
        min_dist = float('inf')
        for i, word in enumerate(words):
            if word == word1:
                if prev != -1:
                    min_dist = min(min_dist, i - prev)
                prev = i
        return min_dist
    else:
        pos1, pos2 = -1, -1
        min_dist = float('inf')
        for i, word in enumerate(words):
            if word == word1:
                pos1 = i
                if pos2 != -1:
                    min_dist = min(min_dist, pos1 - pos2)
            elif word == word2:
                pos2 = i
                if pos1 != -1:
                    min_dist = min(min_dist, pos2 - pos1)
        return min_dist
```

**Mistake 2: Unnecessary absolute value calculations**
```python
# Wrong: Using abs() when we know the order
if pos1 != -1 and pos2 != -1:
    min_dist = min(min_dist, abs(pos1 - pos2))
```

```python
# Correct: Since i is always increasing, current - previous is always positive
if prev != -1:
    min_dist = min(min_dist, i - prev)  # i > prev guaranteed
```

**Mistake 3: Initializing with 0 instead of infinity**
```python
# Wrong: min_dist = 0 will always return 0
min_dist = 0
for i, word in enumerate(words):
    # ... calculations
    min_dist = min(min_dist, distance)
```

```python
# Correct: Initialize with infinity or max possible value
min_dist = float('inf')  # or len(words)
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Shortest Word Distance I | Find distance between two different words | Easy |
| Shortest Word Distance II | Design class for repeated queries | Medium |
| K Words Distance | Find minimum distance among k target words | Hard |
| Circular Array | Words wrap around (last connects to first) | Medium |
| Multiple Occurrences | Return all pairs with minimum distance | Medium |

## Practice Checklist

- [ ] Initial attempt (Day 0)
- [ ] Reviewed solution approach (Day 0)
- [ ] Implemented both cases (same/different words) (Day 0)
- [ ] First spaced repetition (Day 1)
- [ ] Second spaced repetition (Day 3)
- [ ] Third spaced repetition (Day 7)
- [ ] Fourth spaced repetition (Day 14)
- [ ] Can explain the edge case handling (Day 14)
- [ ] Can code without references (Day 30)
- [ ] Interview-ready confidence (Day 30)

**Strategy**: Track positions efficiently in a single pass to minimize distance calculations.
