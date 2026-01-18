---
id: E164
old_id: I250
slug: sort-characters-by-frequency
title: Sort Characters By Frequency
difficulty: easy
category: easy
topics: ["string", "hash-table", "sorting", "heap"]
patterns: ["frequency-counting", "bucket-sort"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E347", "E451", "M692"]
prerequisites: ["hash-maps", "sorting-algorithms"]
strategy_ref: ../strategies/patterns/sorting.md
---
# Sort Characters By Frequency

## Problem

Given a string `s`, your task is to reorganize its characters so that the most frequently appearing characters come first, followed by less frequent ones. Within characters that appear the same number of times, the order doesn't matter—any arrangement is acceptable.

To illustrate, if the character 'e' appears 3 times while 't' appears once, all occurrences of 'e' should be grouped together and appear before 't' in the result. Importantly, you must group identical characters together (you can't scatter them throughout the string), and the ordering is strictly by frequency in descending order.

This problem combines frequency counting with custom sorting. The key insight is that you're not just sorting the unique characters—you're actually reconstructing the entire string with all character occurrences. For example, if 'a' appears 4 times and has the highest frequency, the result should contain "aaaa" at the beginning, not just a single 'a'. Consider how you might efficiently count frequencies and then reconstruct the string in the proper order.

## Why This Matters

Frequency-based sorting is a fundamental operation in data compression algorithms like Huffman coding, where more frequent characters are assigned shorter bit codes. This same pattern appears in text analysis tools that identify the most common words in documents, search engines ranking terms by relevance, and log analysis systems that surface the most frequent error types. Understanding how to efficiently count and sort by frequency is essential for any system that processes text or needs to prioritize items by popularity.

The bucket sort optimization you can apply here demonstrates an important principle: when sorting by bounded integer keys (in this case, frequencies limited by string length), you can often achieve linear time complexity instead of the O(n log n) required by comparison-based sorts. This problem also reinforces the distinction between sorting keys versus reconstructing full output, a nuance that appears in many practical scenarios like generating frequency histograms or creating word clouds.

## Examples

**Example 1:**
- Input: `s = "tree"`
- Output: `"eert"`
- Explanation: The character 'e' occurs twice, whereas 'r' and 't' each occur once. Therefore, 'e' should come first. Both "eert" and "eetr" are valid outputs.

**Example 2:**
- Input: `s = "cccaaa"`
- Output: `"aaaccc"`
- Explanation: Since 'c' and 'a' both have equal frequency (three occurrences each), either "cccaaa" or "aaaccc" is acceptable. However, "cacaca" is invalid because identical characters must be grouped consecutively.

**Example 3:**
- Input: `s = "Aabb"`
- Output: `"bbAa"`
- Explanation: Both "bbAa" and "bbaA" are correct answers, but "Aabb" is not valid. Remember that uppercase and lowercase letters are distinct characters.

## Constraints

- 1 <= s.length <= 5 * 10⁵
- s consists of uppercase and lowercase English letters and digits.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Frequency Map + Sorting
**Hint**: Count character frequencies, then sort characters by their frequency.

**Key Ideas**:
- Build frequency map (char -> count)
- Sort characters by frequency in descending order
- Build result by repeating each char according to its count
- Return concatenated string

**Why This Works**: Direct implementation using standard sorting.

### Intermediate Approach - Heap/Priority Queue
**Hint**: Use a max heap to efficiently extract characters in frequency order.

**Optimization**:
- Count frequencies with hash map
- Insert (frequency, char) pairs into max heap
- Extract from heap and build result string
- Each character appears frequency times

**Trade-off**: O(n + k log k) where k is unique chars, better for large alphabets.

### Advanced Approach - Bucket Sort by Frequency
**Hint**: Since frequency is bounded by string length, use bucket sort for O(n) sorting.

**Key Insight**:
- Create buckets: index i contains chars with frequency i
- Count frequencies (O(n))
- Place each char in appropriate bucket (O(k))
- Iterate buckets from high to low, build result (O(n))
- No comparison-based sorting needed!

**Why This is Optimal**: O(n) time, O(n) space, optimal for this constraint.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Frequency + Sort | O(n + k log k) | O(n) | n = string length, k = unique chars |
| Max Heap | O(n + k log k) | O(n) | Same as sorting, but more overhead |
| Bucket Sort | O(n) | O(n) | Optimal, frequencies bounded by n |
| TreeMap (auto-sorted) | O(n log k) | O(n) | Language-dependent implementation |

## Common Mistakes

### Mistake 1: Incorrect sort comparator
```
# WRONG - Sorting by character instead of frequency
freq_map = Counter(s)
sorted_chars = sorted(freq_map.keys())  # Sorts alphabetically!
result = ''.join(char * freq_map[char] for char in sorted_chars)
```
**Why it fails**: Sorts characters alphabetically, not by frequency.

**Correct approach**: Sort by frequency: `sorted(freq_map.keys(), key=lambda x: freq_map[x], reverse=True)`.

### Mistake 2: Not handling ties correctly
```
# WRONG - Assuming specific order for same frequency
sorted_items = sorted(freq_map.items(), key=lambda x: x[1], reverse=True)
# But problem says any order is fine for ties
```
**Why it's not wrong but inefficient**: Problem allows any order for same frequency, but you might be over-constraining.

**Correct approach**: Accept that ties can be in any order, don't add unnecessary secondary sort keys.

### Mistake 3: Building string inefficiently
```
# WRONG - String concatenation in loop
result = ""
for char, freq in sorted_items:
    for _ in range(freq):
        result += char  # O(n^2) in some languages!
```
**Why it fails**: String concatenation can be O(n) per operation in immutable string languages.

**Correct approach**: Use string builder or join: `''.join(char * freq for char, freq in sorted_items)`.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Top K Frequent Elements | Return only K most frequent chars | Medium |
| Sort by Frequency then Alphabetically | Tie-breaking rule specified | Easy |
| Minimum Operations to Reach Frequency | Count swaps needed to achieve ordering | Medium |
| Frequency-based Encoding | Assign shorter codes to frequent chars | Medium |
| Group Anagrams by Frequency | Different grouping criteria | Medium |

## Practice Checklist

Track your progress as you master this problem:

- [ ] **Day 1**: Solve with frequency map + sorting (allow 20 mins)
- [ ] **Day 2**: Implement bucket sort optimization
- [ ] **Day 3**: Code without reference, verify O(n) complexity
- [ ] **Week 2**: Test edge cases: single char, all same, all unique
- [ ] **Week 4**: Solve "Top K Frequent Elements" variation
- [ ] **Week 8**: Speed drill - solve in under 12 minutes

**Strategy**: See [Sorting Patterns](../strategies/patterns/sorting.md) for bucket sort and frequency-based techniques.
