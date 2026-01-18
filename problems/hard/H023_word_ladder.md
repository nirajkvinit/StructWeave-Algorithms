---
id: H023
old_id: F127
slug: word-ladder
title: Word Ladder
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# Word Ladder

## Problem

Find the length of shortest transformation from one word to another.

## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Examples

**Example 1:**
- Input: `beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]`
- Output: `5`
- Explanation: One shortest transformation sequence is "hit" -> "hot" -> "dot" -> "dog" -> cog", which is 5 words long.

**Example 2:**
- Input: `beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]`
- Output: `0`
- Explanation: The endWord "cog" is not in wordList, therefore there is no valid transformation sequence.

## Constraints

- 1 <= beginWord.length <= 10
- endWord.length == beginWord.length
- 1 <= wordList.length <= 5000
- wordList[i].length == beginWord.length
- beginWord, endWord, and wordList[i] consist of lowercase English letters.
- beginWord != endWord
- All the words in wordList are **unique**.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Model this as an unweighted graph problem where each word is a node, and edges exist between words that differ by exactly one character. The shortest transformation sequence is the shortest path in this graph, which BFS finds efficiently.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use BFS starting from beginWord. For each word, generate all possible one-character transformations and check if they exist in the word list. Track visited words to avoid cycles. The level at which you reach endWord is your answer. Use a set for O(1) word lookups instead of iterating through the entire list.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Instead of comparing current word with all words in the list, generate all possible transformations by replacing each character with 'a'-'z' and check if they exist in the word set. This is O(26*L) instead of O(N*L) where N is the number of words and L is word length.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS with pattern generation | O(N * L² * 26) | O(N * L) | N words, L length, 26 letters; worst case visits all words |
| Bidirectional BFS | O(N * L² * 26) | O(N * L) | Better average case, meets in middle |

## Common Mistakes

1. **Using list instead of set for word lookups**
   ```python
   # Wrong: O(N) lookup time
   wordList = ["hot", "dot", "dog"]
   if neighbor in wordList:  # Linear search

   # Correct: O(1) lookup time
   word_set = set(wordList)
   if neighbor in word_set:  # Constant time
   ```

2. **Not validating end word existence**
   ```python
   # Wrong: Will waste time searching for impossible target
   def ladderLength(self, begin, end, wordList):
       queue = [begin]
       # Start BFS...

   # Correct: Early exit if impossible
   def ladderLength(self, begin, end, wordList):
       if end not in wordList:
           return 0
       # Continue...
   ```

3. **Counting transformations instead of words**
   ```python
   # Wrong: Off-by-one error
   return level  # Number of transformations

   # Correct: Return number of words in sequence
   return level + 1  # Include both start and end words
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Word Ladder II | Hard | Find all shortest paths, not just length |
| Minimum Genetic Mutation | Medium | Same problem with 8-character gene strings |
| Open the Lock | Medium | Transform 4-digit combinations with dead ends |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [BFS Graph Traversal](../../strategies/patterns/bfs.md)
