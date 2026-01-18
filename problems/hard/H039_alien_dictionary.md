---
id: H039
old_id: I068
slug: alien-dictionary
title: Alien Dictionary
difficulty: hard
category: hard
topics: []
patterns: ["backtrack-permutation"]
estimated_time_minutes: 45
---
# Alien Dictionary

## Problem

An extraterrestrial language employs standard English letters, but their alphabetical sequence remains a mystery.

You receive a collection of strings `words` from this language's lexicon. The assertion is that these strings follow **dictionary order** according to this language's character ranking.

Should this assertion prove false—meaning the arrangement in `words` doesn't match any valid letter ordering—output `"".`

In all other cases, output *a string containing each distinct letter from the alien language, arranged in **dictionary order** based on the language's character precedence*. When multiple valid orderings exist, *you may output* **whichever one you prefer***.

## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Examples

**Example 1:**
- Input: `words = ["wrt","wrf","er","ett","rftt"]`
- Output: `"wertf"`

**Example 2:**
- Input: `words = ["z","x"]`
- Output: `"zx"`

**Example 3:**
- Input: `words = ["z","x","z"]`
- Output: `""`
- Explanation: The order is invalid, so return `""`.

## Constraints

- 1 <= words.length <= 100
- 1 <= words[i].length <= 100
- words[i] consists of only lowercase English letters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a topological sort problem in disguise. Build a directed graph where edge from char A to char B means A comes before B in alien alphabet. Extract ordering rules by comparing adjacent words in the dictionary. Use DFS or BFS to find topological ordering. If a cycle exists, the order is invalid.
</details>

<details>
<summary>Main Approach</summary>
1. Build adjacency graph by comparing adjacent words: find first differing character, add edge from char in word1 to char in word2. 2. Track in-degree for each character (BFS) or visited states (DFS). 3. Perform topological sort: BFS using queue (start with 0 in-degree) or DFS with post-order traversal. 4. Detect cycles: if sorted result doesn't include all characters, cycle exists. 5. Return sorted characters as string.
</details>

<details>
<summary>Optimization Tip</summary>
Important edge cases: if longer word is prefix of shorter word and appears first, it's invalid (e.g., ["abc", "ab"]). Also, only compare characters at the first position where words differ - don't create edges for subsequent positions. Use a set for edges to avoid duplicate edges.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| DFS Topological Sort | O(N + E) | O(N + E) | N=chars in all words, E=edges in graph |
| BFS Topological Sort | O(N + E) | O(N + E) | Using in-degree array and queue |
| Optimal | O(C) | O(1) | C=total characters, at most 26 unique chars |

## Common Mistakes

1. **Creating edges from all character positions**
   ```python
   # Wrong: Only first difference matters per word pair
   for i in range(min(len(w1), len(w2))):
       if w1[i] != w2[i]:
           graph[w1[i]].add(w2[i])  # Creates too many edges

   # Correct: Stop after first difference
   for i in range(min(len(w1), len(w2))):
       if w1[i] != w2[i]:
           graph[w1[i]].add(w2[i])
           break
   ```

2. **Not detecting invalid prefix case**
   ```python
   # Wrong: Missing invalid case where longer comes before shorter
   if len(w1) < len(w2):
       # process normally

   # Correct: Check if w1 is prefix of w2 but comes after
   if w1.startswith(w2) and len(w1) > len(w2):
       return ""  # Invalid ordering
   ```

3. **Incorrect cycle detection**
   ```python
   # Wrong: Not properly detecting cycles in DFS
   if node in visited:
       return True  # Doesn't distinguish visiting vs visited

   # Correct: Track visiting (in current path) vs visited (done)
   if node in visiting:
       return True  # Cycle detected
   if node in visited:
       return False
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Course Schedule | Medium | Basic topological sort without graph building |
| Course Schedule II | Medium | Return topological order |
| Sequence Reconstruction | Medium | Check if unique topological order exists |
| Sort Items by Groups | Hard | Topological sort with grouping constraints |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Topological Sort](../../strategies/patterns/topological-sort.md)
