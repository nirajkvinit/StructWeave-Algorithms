---
id: H037
old_id: I044
slug: shortest-word-distance-ii
title: Shortest Word Distance II
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# Shortest Word Distance II

## Problem

Create a data structure that accepts a collection of strings during initialization and supports efficient lookups for the minimum index separation between any two distinct strings from that collection.

Your `WordDistance` class should provide:

	- `WordDistance(String[] wordsDict)` constructor that sets up the data structure using the provided string array `wordsDict`.
	- `int shortest(String word1, String word2)` method that computes the minimum index gap between `word1` and `word2` within the stored array `wordsDict`.

## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Constraints

- 1 <= wordsDict.length <= 3 * 10⁴
- 1 <= wordsDict[i].length <= 10
- wordsDict[i] consists of lowercase English letters.
- word1 and word2 are in wordsDict.
- word1 != word2
- At most 5000 calls will be made to shortest.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>Key Insight</summary>
Since shortest() will be called multiple times, preprocess the word list once during initialization. Store each word's positions in a hash map. For each query, use two pointers to find minimum distance between two sorted lists of indices.
</details>

<details>
<summary>Main Approach</summary>
In constructor: Build a hash map where key is word and value is list of indices where that word appears. In shortest(): Get the two index lists for word1 and word2. Use two pointers (i, j) to traverse both lists. At each step, calculate distance and update minimum. Move the pointer pointing to smaller index forward.
</details>

<details>
<summary>Optimization Tip</summary>
Since indices are stored in order of appearance, the lists are naturally sorted. This allows the two-pointer technique to work in O(m + n) time where m and n are the number of occurrences of each word. No need to sort or use additional data structures.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (No preprocessing) | O(n) per query | O(1) | Scan entire array for each query |
| Hash Map + Linear Scan | O(m * n) per query | O(n) | m, n = occurrences of two words |
| Optimal (Hash Map + Two Pointers) | O(m + n) per query | O(n) | Preprocessing O(n), query O(m+n) |

## Common Mistakes

1. **Not utilizing sorted property of index lists**
   ```python
   # Wrong: Checking all pairs of indices
   min_dist = float('inf')
   for i in list1:
       for j in list2:
           min_dist = min(min_dist, abs(i - j))

   # Correct: Two pointers on sorted lists
   i, j = 0, 0
   while i < len(list1) and j < len(list2):
       min_dist = min(min_dist, abs(list1[i] - list2[j]))
       if list1[i] < list2[j]:
           i += 1
       else:
           j += 1
   ```

2. **Inefficient storage during preprocessing**
   ```python
   # Wrong: Storing word-index pairs repeatedly
   self.words = [(word, i) for i, word in enumerate(wordsDict)]

   # Correct: Map each word to its index list
   self.positions = defaultdict(list)
   for i, word in enumerate(wordsDict):
       self.positions[word].append(i)
   ```

3. **Not handling edge cases in two pointers**
   ```python
   # Wrong: Moving both pointers simultaneously
   while i < len(list1) and j < len(list2):
       min_dist = min(min_dist, abs(list1[i] - list2[j]))
       i += 1
       j += 1

   # Correct: Move pointer with smaller value
   if list1[i] < list2[j]:
       i += 1
   else:
       j += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Shortest Word Distance | Easy | Single query, no preprocessing needed |
| Shortest Word Distance III | Medium | Words can be the same |
| Two Sum III - Data structure design | Easy | Similar preprocess pattern for different problem |
| Range Sum Query - Immutable | Easy | Preprocessing for range queries |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Map with Two Pointers](../../strategies/patterns/two-pointers.md)
