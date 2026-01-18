---
id: M334
old_id: A159
slug: top-k-frequent-words
title: Top K Frequent Words
difficulty: medium
category: medium
topics: ["array", "heap"]
patterns: ["heap-top-k"]
estimated_time_minutes: 30
frequency: high
related_problems:
  - id: E042
    title: Top K Frequent Elements
    difficulty: easy
  - id: M050
    title: Kth Largest Element in Array
    difficulty: medium
prerequisites:
  - Hash map usage
  - Heap/Priority queue
  - Sorting with custom comparators
strategy_ref: ../strategies/data-structures/heaps.md
---
# Top K Frequent Words

## Problem

Given an array of strings `words` and an integer `k`, return the `k` most frequently occurring words from the array.

The output must be sorted by two criteria:
1. **Primary**: Frequency in descending order (most frequent first)
2. **Tiebreaker**: Alphabetical order in ascending order (if two words have the same frequency, the lexicographically smaller word comes first)

For example, if both "love" and "hate" appear 3 times, "hate" should come before "love" in the result because 'h' comes before 'l' alphabetically.

Your solution should be as efficient as possible. While a simple sorting approach works, consider whether you can optimize using data structures like heaps, especially when `k` is much smaller than the total number of unique words.

## Why This Matters

Top-K selection problems appear constantly in real-world systems: finding trending hashtags on social media, identifying most searched queries, ranking product reviews by helpfulness, and selecting most active users. This problem teaches you the crucial trade-off between sorting (O(n log n)) and heap-based selection (O(n log k)), which becomes significant when processing millions of documents but only need the top 10 results. Understanding custom comparators and multi-key sorting is essential for database query optimization and search engine result ranking.

## Examples

**Example 1:**
- Input: `words = ["i","love","algoprac","i","love","coding"], k = 2`
- Output: `["i","love"]`
- Explanation: Both "i" and "love" appear twice, making them the most frequent. Since they have equal frequency, alphabetical ordering places "i" first.

**Example 2:**
- Input: `words = ["the","day","is","sunny","the","the","the","sunny","is","is"], k = 4`
- Output: `["the","is","sunny","day"]`
- Explanation: Frequencies are: "the" (4 occurrences), "is" (3), "sunny" (2), and "day" (1), giving us the top 4 in descending frequency order.

## Constraints

- 1 <= words.length <= 500
- 1 <= words[i].length <= 10
- words[i] consists of lowercase English letters.
- k is in the range [1, The number of **unique** words[i]]

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Counting Frequencies</summary>

The first step is straightforward: count how many times each word appears. Use a hash map (dictionary) to store word frequencies:

```
freq = {}
for word in words:
    freq[word] = freq.get(word, 0) + 1
```

Or use Python's `Counter` from the `collections` module:
```
from collections import Counter
freq = Counter(words)
```

Now you have a mapping from each word to its frequency. The challenge is selecting the top k words with the right ordering.

</details>

<details>
<summary>Hint 2: Using a Heap for Top K Selection</summary>

Use a min-heap of size k to efficiently find the top k frequent words. The heap should order elements by:
1. Frequency (ascending in min-heap, so lower frequencies get removed first)
2. Lexicographical order (descending, so later words get removed in case of ties)

In Python, use a tuple `(-frequency, word)` as the heap element:
- Negative frequency ensures higher frequencies have higher priority
- Python's heap compares tuples lexicographically, so if frequencies are equal, it compares words
- But we want alphabetically smaller words to win ties, so we need to negate the comparison or use a different approach

Actually, for a min-heap of size k, use `(frequency, -word)` won't work. Instead, use a max-heap by negating: `(-frequency, word)`.

</details>

<details>
<summary>Hint 3: Sorting Approach</summary>

A simpler alternative to heaps is to sort all unique words by the desired criteria:

```
from collections import Counter

freq = Counter(words)
# Sort by frequency (descending), then by word (ascending)
sorted_words = sorted(freq.keys(), key=lambda word: (-freq[word], word))
return sorted_words[:k]
```

This is clean and easy to understand:
- `-freq[word]` sorts by frequency in descending order
- `word` as the second key sorts alphabetically in ascending order for ties

Time complexity: O(n log n) where n is the number of unique words
Space complexity: O(n)

The heap approach is O(n log k) which is better when k is much smaller than n, but the sorting approach is often simpler to implement and understand.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Sort All Words | O(n log n) | O(n) | n = unique words; simple and clean |
| Min-Heap (size k) | O(n log k) | O(n) | Better when k << n; heap maintenance |
| Quick Select | O(n) average | O(n) | Expected linear time, complex implementation |

Note: n is the number of unique words, which is at most the length of the input array.

## Common Mistakes

### Mistake 1: Incorrect Sorting Criteria
```python
# WRONG: Sorting by frequency ascending instead of descending
def topKFrequent(words, k):
    freq = Counter(words)
    # Bug: freq[word] sorts ascending, need -freq[word] for descending
    sorted_words = sorted(freq.keys(), key=lambda word: (freq[word], word))
    return sorted_words[:k]
```

**Why it's wrong**: This sorts by frequency in ascending order, giving you the k least frequent words instead of the most frequent. Use `-freq[word]` to sort in descending order.

### Mistake 2: Wrong Alphabetical Order for Ties
```python
# WRONG: Sorting alphabetically in descending order for ties
def topKFrequent(words, k):
    freq = Counter(words)
    # Bug: -word doesn't work; need to negate frequency only
    sorted_words = sorted(freq.keys(), key=lambda word: (-freq[word], -word))
    return sorted_words[:k]
```

**Why it's wrong**: You can't negate a string. For ties in frequency, we want ascending alphabetical order, so just use `word` as the second key (not `-word`).

### Mistake 3: Not Handling Ties Correctly
```python
# WRONG: Only sorting by frequency
def topKFrequent(words, k):
    freq = Counter(words)
    # Bug: doesn't specify how to break ties
    sorted_words = sorted(freq.keys(), key=lambda word: -freq[word])
    return sorted_words[:k]
```

**Why it's wrong**: When multiple words have the same frequency, their relative order is undefined without a secondary sort key. The problem requires alphabetical ordering for ties, so you must include `word` as a second key.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Top K Frequent Elements (numbers) | Medium | Same problem but with integers instead of strings |
| K Closest Elements | Medium | Find k elements closest to a target value |
| Top K Frequent with Time Window | Hard | Maintain top k frequent in a sliding time window |
| Distributed Top K | Hard | Find top k across multiple machines |

## Practice Checklist

- [ ] **First attempt**: Solve independently (30 min time limit)
- [ ] **Implement sorting**: Use built-in sort with custom key
- [ ] **Try heap approach**: Implement min-heap solution for O(n log k)
- [ ] **Edge cases**: All same frequency, k = 1, single word
- [ ] **Spaced repetition**: Revisit after 3 days
- [ ] **Interview practice**: Explain trade-offs between sorting and heap
- [ ] **Variations**: Solve Top K Frequent Elements with numbers
- [ ] **Final review**: Solve again after 1 week without hints

**Strategy**: See [Heap Pattern](../strategies/data-structures/heaps.md)
