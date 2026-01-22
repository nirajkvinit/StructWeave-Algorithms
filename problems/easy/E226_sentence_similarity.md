---
id: E226
old_id: A201
slug: sentence-similarity
title: Sentence Similarity
difficulty: easy
category: easy
topics: ["array", "hash-table"]
patterns: ["complement-search"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["hash-table", "array-traversal"]
related_problems: ["E001", "E229", "M001"]
strategy_ref: ../prerequisites/hash-table.md
---
# Sentence Similarity

## Problem

You're given two sentences represented as arrays of words, along with a list of word pairs that define similarity relationships. Your task is to determine if these two sentences are equivalent based on word-by-word comparison.

A **similar pair** is written as `[word1, word2]` and means these two words can be used interchangeably in this context. For example, if `["great", "fine"]` is in your similar pairs list, then "great" and "fine" are considered equivalent.

Two sentences are equivalent when three conditions are met. First, they must have the same length (same number of words). Second, at each position, the words must either be identical or form a similar pair from your list. Third, and this is important: similarity relationships are not transitive. If "a" is similar to "b", and "b" is similar to "c", you cannot assume "a" is similar to "c" unless that pair is explicitly listed.

Keep in mind that any word is automatically similar to itself, even if it's not in the pairs list. Also, the order matters: you're comparing words position by position, not looking for the words anywhere in the sentence.

## Why This Matters

This problem models real-world scenarios like synonym matching in search engines, translation systems where words have equivalences, and natural language processing tasks. It teaches you to efficiently handle lookup operations using hash tables, a fundamental technique that appears in database indexing, caching systems, and dictionary implementations.

The non-transitivity aspect is particularly interesting because it mirrors real-world similarity: just because A resembles B and B resembles C doesn't always mean A resembles C. This appears in context-dependent word meanings, relationship graphs with limited edges, and permission systems where access rights don't chain automatically.

Hash-based lookups are one of the most frequently tested patterns in technical interviews because they demonstrate your ability to optimize from O(n) to O(1) operations, a skill that separates efficient code from slow code in production systems.

## Examples

**Example 1:**
- Input: `sentence1 = ["great","acting","skills"], sentence2 = ["fine","drama","talent"], similarPairs = [["great","fine"],["drama","acting"],["skills","talent"]]`
- Output: `true`
- Explanation: Both sentences contain three words, and each position has matching or equivalent words according to the provided pairs.

**Example 2:**
- Input: `sentence1 = ["great"], sentence2 = ["great"], similarPairs = []`
- Output: `true`
- Explanation: Identical words are always considered equivalent.

**Example 3:**
- Input: `sentence1 = ["great"], sentence2 = ["doubleplus","good"], similarPairs = [["great","doubleplus"]]`
- Output: `false`
- Explanation: The sentences have different lengths, so they cannot be equivalent.

## Constraints

- 1 <= sentence1.length, sentence2.length <= 1000
- 1 <= sentence1[i].length, sentence2[i].length <= 20
- sentence1[i] and sentence2[i] consist of English letters.
- 0 <= similarPairs.length <= 1000
- similarPairs[i].length == 2
- 1 <= xi.length, yi.length <= 20
- xi and yi consist of lower-case and upper-case English letters.
- All the pairs (xi, yi) are **distinct**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Brute Force
Think about the simplest way to check word similarity. For each word pair at position i, you need to verify if they're identical or appear as a similar pair. How would you check if a pair exists in the similarPairs list? What data structure requires checking every element?

### Tier 2: Optimized
Consider organizing the similar pairs for faster lookup. What data structure allows you to check if a word pair exists in constant time? How would you structure the data to quickly answer: "Are word A and word B similar?"

### Tier 3: Edge Cases & Efficiency
What happens when sentences have different lengths? How do you handle the case where a word is similar to itself? Can you build your lookup structure once and reuse it? Think about bidirectional relationships - if (a, b) is in similarPairs, does that mean both (a, b) and (b, a) are valid?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Linear Search) | O(n * p) | O(1) | Check each word pair against all p similarPairs |
| Hash Set (Optimal) | O(n + p) | O(p) | Build hash set once, check pairs in O(1) |
| Hash Map (Bidirectional) | O(n + p) | O(p) | Store both (a,b) and (b,a) for symmetric lookup |

Where n = sentence length, p = number of similar pairs

## Common Mistakes

### Mistake 1: Forgetting Length Check
```python
# Wrong: Doesn't check if sentences have same length
def areSimilar(s1, s2, pairs):
    for i in range(len(s1)):  # May crash if len(s2) < len(s1)
        if s1[i] != s2[i] and (s1[i], s2[i]) not in pairs:
            return False
    return True

# Correct: Check lengths first
def areSimilar(s1, s2, pairs):
    if len(s1) != len(s2):
        return False
    # ... rest of logic
```

### Mistake 2: Missing Bidirectional Check
```python
# Wrong: Only checks (s1[i], s2[i]) but not (s2[i], s1[i])
pair_set = set(tuple(p) for p in pairs)
for i in range(len(s1)):
    if s1[i] != s2[i] and (s1[i], s2[i]) not in pair_set:
        return False

# Correct: Store both directions
pair_set = set()
for a, b in pairs:
    pair_set.add((a, b))
    pair_set.add((b, a))
```

### Mistake 3: Inefficient Repeated Lookups
```python
# Wrong: Searches through entire list for each word pair
for i in range(len(s1)):
    if s1[i] != s2[i]:
        found = False
        for pair in similarPairs:  # O(p) for each position
            if pair == [s1[i], s2[i]] or pair == [s2[i], s1[i]]:
                found = True
                break
        if not found:
            return False
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Sentence Similarity II | Medium | Similar pairs have transitive property (if a~b and b~c, then a~c). Requires Union-Find. |
| Case-Insensitive Similarity | Easy | Words are similar if they match case-insensitively. Convert to lowercase. |
| K-Similar Sentences | Medium | Sentences are k-similar if at most k word pairs need to be similar (not identical). |
| Weighted Similarity Score | Medium | Each similar pair has a weight. Return similarity score instead of boolean. |
| Multi-Language Similarity | Hard | Words can be similar across different languages with translation pairs. |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Solved with brute force approach
- [ ] Optimized to O(n + p) time with hash set
- [ ] Handled edge case: different length sentences
- [ ] Handled edge case: empty similarPairs
- [ ] Handled edge case: words similar to themselves
- [ ] Tested with bidirectional pairs
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Can explain approach to someone else

**Strategy**: See [Hash Table Patterns](../prerequisites/hash-table.md)
