---
id: H022
old_id: F126
slug: word-ladder-ii
title: Word Ladder II
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# Word Ladder II

## Problem

Find all shortest transformation sequences from one word to another.

## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Examples

**Example 1:**
- Input: `beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]`
- Output: `[["hit","hot","dot","dog","cog"],["hit","hot","lot","log","cog"]]`
- Explanation: There are 2 shortest transformation sequences:
"hit" -> "hot" -> "dot" -> "dog" -> "cog"
"hit" -> "hot" -> "lot" -> "log" -> "cog"

**Example 2:**
- Input: `beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]`
- Output: `[]`
- Explanation: The endWord "cog" is not in wordList, therefore there is no valid transformation sequence.

## Constraints

- 1 <= beginWord.length <= 5
- endWord.length == beginWord.length
- 1 <= wordList.length <= 500
- wordList[i].length == beginWord.length
- beginWord, endWord, and wordList[i] consist of lowercase English letters.
- beginWord != endWord
- All the words in wordList are **unique**.
- The **sum** of all shortest transformation sequences does not exceed 10⁵.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a two-phase problem: first find the shortest path length using BFS (treating words as graph nodes), then use DFS/backtracking to construct all paths of that exact length. The key is to build a graph of parent-child relationships during BFS to guide the DFS reconstruction.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use BFS to explore transformations level by level, tracking all possible parents for each word. Once you reach the target, use DFS to backtrack from the end word to the start word using the parent relationships, constructing all valid paths. Pre-process the word list into a graph or use pattern matching (e.g., "h*t" pattern) for faster neighbor finding.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use bidirectional BFS to meet in the middle, reducing the search space significantly. Store intermediate transformations in a level-based structure to avoid revisiting words at the same level during BFS, which prevents finding suboptimal paths.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS + DFS | O(N * L² * 26 + P) | O(N * L + P) | N = word count, L = word length, P = total paths |
| Bidirectional BFS + DFS | O(N * L² * 26 + P) | O(N * L + P) | Better average case, meets in middle |

## Common Mistakes

1. **Using simple BFS without tracking all parents**
   ```python
   # Wrong: Only tracks one parent per word
   if neighbor not in visited:
       visited.add(neighbor)
       parent[neighbor] = current

   # Correct: Track all parents at same level
   if neighbor not in visited or level[neighbor] == current_level + 1:
       if neighbor not in parent:
           parent[neighbor] = []
       parent[neighbor].append(current)
   ```

2. **Not checking if end word is in word list**
   ```python
   # Wrong: Assuming end word exists
   def findLadders(self, begin, end, wordList):
       # Start BFS...

   # Correct: Validate input
   def findLadders(self, begin, end, wordList):
       if end not in wordList:
           return []
       # Continue with BFS...
   ```

3. **Inefficient neighbor generation**
   ```python
   # Wrong: Checking every word in list
   for word in wordList:
       if differByOne(current, word):
           neighbors.append(word)

   # Correct: Generate patterns or use character substitution
   for i in range(len(current)):
       for c in 'abcdefghijklmnopqrstuvwxyz':
           neighbor = current[:i] + c + current[i+1:]
           if neighbor in word_set:
               neighbors.append(neighbor)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Word Ladder (single shortest path length) | Hard | Only return length, not all paths |
| Minimum Genetic Mutation | Medium | Same concept with DNA sequences |
| Open the Lock | Medium | Transform dial combinations instead of words |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Graph BFS Patterns](../../strategies/patterns/bfs.md)
