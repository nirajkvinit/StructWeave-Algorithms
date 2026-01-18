---
id: E247
old_id: A351
slug: uncommon-words-from-two-sentences
title: Uncommon Words from Two Sentences
difficulty: easy
category: easy
topics: ["hash-table", "string"]
patterns: ["frequency-counting"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - E001_two_sum.md
  - E020_valid_parentheses.md
prerequisites:
  - "Hash table operations"
  - "String splitting"
  - "Frequency counting"
strategy_ref: ../strategies/data-structures/hash-tables.md
---
# Uncommon Words from Two Sentences

## Problem

You are given two sentences `s1` and `s2`, where each sentence is a string containing words separated by single spaces. All words consist of lowercase alphabetic characters only. Your task is to find words that are uncommon between the two sentences.

Let's carefully define what makes a word "uncommon" in this context. A word qualifies as uncommon if it appears exactly once across both sentences combined. This means two things must be true: (1) the word appears exactly one time in one of the sentences, and (2) the word does not appear at all in the other sentence.

For example, if the word "apple" appears once in `s1` but also appears in `s2`, it's not uncommon. Similarly, if "banana" appears twice in `s1` and zero times in `s2`, it's not uncommon either because its total frequency is 2, not 1. A word is only uncommon when its total count across both sentences equals exactly 1.

This definition leads to an important insight: you can combine both sentences and simply look for words with a frequency of 1 in the combined text. Words appearing twice in one sentence, or once in each sentence, will have total frequency > 1 and thus won't qualify.

The order of words in your result doesn't matter, so you can return them in any sequence.

## Why This Matters

Frequency counting with hash tables is one of the most fundamental patterns in algorithm design, appearing across countless domains. This problem teaches you to use hash maps (dictionaries) for efficient O(1) lookups and updates, a technique essential for text analysis, data deduplication, caching systems, and many optimization problems. The skills you develop here apply directly to natural language processing (finding unique words, identifying stop words, computing term frequencies for search engines), log analysis (detecting unusual events), anomaly detection in data streams, DNA sequence analysis (identifying unique subsequences), and recommendation systems (finding items with specific occurrence patterns). Learning to recognize when frequency counting can simplify a problem is a key insight that will serve you in many algorithmic contexts, from finding majority elements to detecting duplicates to solving two-sum variants.

## Examples

**Example 1:**
- Input: `s1 = "this apple is sweet", s2 = "this apple is sour"`
- Output: `["sweet","sour"]`
- Explanation: Both "sweet" and "sour" appear once in their respective sentences and not in the other.

**Example 2:**
- Input: `s1 = "apple apple", s2 = "banana"`
- Output: `["banana"]`
- Explanation: "apple" appears twice in s1, so it doesn't qualify. "banana" appears once in s2 and not at all in s1.

## Constraints

- 1 <= s1.length, s2.length <= 200
- s1 and s2 consist of lowercase English letters and spaces.
- s1 and s2 do not have leading or trailing spaces.
- All the words in s1 and s2 are separated by a single space.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Problem Understanding
An uncommon word has a special property: it appears exactly once across both sentences combined. Think about how frequency counting can help you identify these words.

What happens if a word appears twice in one sentence or once in each sentence?

### Tier 2 Hint - Solution Strategy
Combine both sentences into one and count word frequencies. The key insight: a word is uncommon if and only if its total frequency across both sentences equals 1.

Consider using a hash table to track word frequencies. What data structure would be most efficient?

### Tier 3 Hint - Implementation Details
1. Split both sentences into words
2. Use a hash map to count frequency of each word across both sentences
3. Filter words where frequency equals exactly 1
4. Return the filtered words as a list

Alternative: Maintain separate counts for each sentence, then filter words appearing exactly once in one sentence and zero times in the other.

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Combined frequency map | O(n + m) | O(n + m) | n, m are lengths of s1, s2 |
| Separate maps | O(n + m) | O(n + m) | More complex logic, same complexity |
| Sorting approach | O(n log n + m log m) | O(n + m) | Less efficient, not recommended |

## Common Mistakes

### Mistake 1: Only checking if word exists in other sentence
```python
# Wrong: Doesn't account for duplicates within same sentence
result = []
for word in s1.split():
    if word not in s2.split():
        result.append(word)
```
**Why it's wrong**: "apple apple" in s1 and "" in s2 would include "apple" twice, but "apple" appears more than once so shouldn't be uncommon.

### Mistake 2: Treating sentences separately without combined frequency
```python
# Wrong: Missing the combined frequency check
count1 = Counter(s1.split())
count2 = Counter(s2.split())
result = [w for w in count1 if w not in count2]
```
**Why it's wrong**: Only finds words in s1 not in s2, but doesn't check if they appear exactly once in s1.

### Mistake 3: Not handling empty results
```python
# Incomplete: Should handle case where no uncommon words exist
freq = Counter((s1 + " " + s2).split())
# Missing: Check if result is empty
return [w for w in freq if freq[w] == 1]
```
**Why it's wrong**: While this works, good practice is to explicitly handle edge cases like both sentences being identical.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Most common uncommon word | Easy | Return only the longest uncommon word |
| K uncommon words | Medium | Find words appearing exactly k times |
| Case-insensitive comparison | Easy | Treat "Apple" and "apple" as same word |
| Multiple sentences | Medium | Find uncommon words across n sentences |
| Uncommon characters | Easy | Find characters appearing exactly once |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Reviewed solution and understood all approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 3 days
- [ ] Practiced again after 1 week
- [ ] Can explain the solution clearly to others
- [ ] Solved all variations above

**Strategy**: See [Hash Table Patterns](../strategies/data-structures/hash-tables.md)
