---
id: M097
old_id: I043
slug: shortest-word-distance
title: Shortest Word Distance
difficulty: medium
category: medium
topics: ["array", "string", "two-pointers"]
patterns: ["two-pointers"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E243", "M244", "M245"]
prerequisites: ["array-traversal", "two-pointers", "index-tracking"]
---
# Shortest Word Distance

## Problem

You have an array of strings called `wordsDict` that represents a sequence of words (think of it as a document or sentence), along with two different words `word1` and `word2` that both appear somewhere in this array. Your task is to find the shortest distance between any occurrence of these two words, where distance is measured as the difference between their array indices. For example, if `word1` appears at index 3 and `word2` appears at indices 1 and 7, the minimum distance would be 2 (between positions 1 and 3). Both words might appear multiple times in the array, so you need to consider all possible pairs of positions and find the minimum. The challenge is to do this efficiently in a single pass through the array, rather than storing all positions and comparing every possible pair, which would be wasteful both in time and space. Think about how tracking just the most recent position of each word as you scan can give you enough information to compute the answer.

## Why This Matters

This problem models text proximity analysis, which is fundamental to search engines and document processing systems. When you search Google for two terms, the ranking algorithm considers how close together those terms appear in documents, giving higher relevance scores to pages where your search terms are near each other. Natural language processing tools use word distance to identify relationships and extract meaning from text. In DNA sequence analysis, bioinformatics algorithms find the minimum distance between gene markers to understand genetic relationships. E-commerce recommendation systems analyze product description text to find related items based on how frequently certain keywords appear together. Log file analysis tools search for error patterns by measuring the distance between specific log entries. Mastering efficient array traversal with state tracking, as required here, is a foundational skill for building performant text processing systems.

## Examples

**Example 1:**
- Input: `wordsDict = ["practice", "makes", "perfect", "coding", "makes"], word1 = "coding", word2 = "practice"`
- Output: `3`

**Example 2:**
- Input: `wordsDict = ["practice", "makes", "perfect", "coding", "makes"], word1 = "makes", word2 = "coding"`
- Output: `1`

## Constraints

- 2 <= wordsDict.length <= 3 * 10⁴
- 1 <= wordsDict[i].length <= 10
- wordsDict[i] consists of lowercase English letters.
- word1 and word2 are in wordsDict.
- word1 != word2

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

The minimum distance will always be between consecutive occurrences of the two words. You don't need to compare every pair of indices. Think about tracking the most recent position where you saw each word as you scan through the array.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use a single pass with two pointers to track the last seen indices of word1 and word2. As you iterate through the array, when you encounter either word, update its last seen index. If you've seen both words at least once, calculate the distance between their last seen indices and update the minimum distance.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

```
index1 = -1
index2 = -1
minDistance = infinity

for i in range(len(wordsDict)):
  if wordsDict[i] == word1:
    index1 = i
  elif wordsDict[i] == word2:
    index2 = i

  # If both words have been seen, calculate distance
  if index1 != -1 and index2 != -1:
    minDistance = min(minDistance, abs(index1 - index2))

return minDistance
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(n) | Store all indices, compare all pairs |
| Hash Map Storage | O(n) | O(n) | Store all occurrences, find min distance |
| **Single Pass Two Pointers** | **O(n)** | **O(1)** | Track last seen indices only |

## Common Mistakes

### Mistake 1: Comparing all pairs of indices
```python
# Wrong - O(n²) time complexity
indices1 = [i for i, word in enumerate(wordsDict) if word == word1]
indices2 = [i for i, word in enumerate(wordsDict) if word == word2]
min_dist = float('inf')
for i1 in indices1:
    for i2 in indices2:
        min_dist = min(min_dist, abs(i1 - i2))

# Correct - O(n) single pass
index1, index2 = -1, -1
min_dist = float('inf')
for i, word in enumerate(wordsDict):
    if word == word1:
        index1 = i
    elif word == word2:
        index2 = i
    if index1 != -1 and index2 != -1:
        min_dist = min(min_dist, abs(index1 - index2))
return min_dist
```

### Mistake 2: Not checking if both words have been seen
```python
# Wrong - may cause error or incorrect result
for i, word in enumerate(wordsDict):
    if word == word1:
        index1 = i
    elif word == word2:
        index2 = i
    min_dist = min(min_dist, abs(index1 - index2))  # Error if either is -1

# Correct - check both are valid
if index1 != -1 and index2 != -1:
    min_dist = min(min_dist, abs(index1 - index2))
```

### Mistake 3: Using unnecessary abs() when you know the order
```python
# Less efficient - unnecessary abs() call
min_dist = min(min_dist, abs(index1 - index2))

# More efficient - but abs() is clearer and safe
# Only optimize if profiling shows it matters
min_dist = min(min_dist, abs(index1 - index2))  # Keep it simple
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Shortest Word Distance II | Medium | Multiple queries, preprocessing with hash map |
| Shortest Word Distance III | Medium | word1 and word2 might be the same |
| Minimum Index Sum of Two Lists | Easy | Find common strings with minimum index sum |
| K Closest Points | Medium | Similar idea of tracking distances |

## Practice Checklist

- [ ] Implement brute force O(n²) solution
- [ ] Implement optimal O(n) single pass
- [ ] Test with words at beginning and end
- [ ] Test with words adjacent to each other
- [ ] Test with multiple occurrences of same word
- [ ] Handle edge case with only two words total
- [ ] Implement Shortest Word Distance II (multiple queries)

**Spaced Repetition Schedule:**
- Day 1: Initial attempt, understand two-pointer tracking
- Day 3: Implement without hints
- Day 7: Solve Shortest Word Distance II variant
- Day 14: Solve Shortest Word Distance III (same word case)
- Day 30: Speed solve under 10 minutes

**Strategy**: See [Two Pointers](../strategies/patterns/two-pointers.md)
