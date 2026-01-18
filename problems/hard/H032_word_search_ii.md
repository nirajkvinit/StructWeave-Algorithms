---
id: H032
old_id: I012
slug: word-search-ii
title: Word Search II
difficulty: hard
category: hard
topics: ["string", "trie"]
patterns: []
estimated_time_minutes: 45
strategy_ref: ../strategies/data-structures/tries.md
---
# Word Search II

## Problem

Identify which words from a given list appear within a two-dimensional character grid.

Words are built by linking cells that touch horizontally or vertically. A single cell cannot be reused within the same word path.


**Diagram:**

```
Example grid searching for "oath" and "eat":

  o  a  a  n
  e  t  a  e
  i  h  k  r
  i  f  l  v

Path for "oath": o→a→t→h
Path for "eat":  e→a→t
```


## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Constraints

- m == board.length
- n == board[i].length
- 1 <= m, n <= 12
- board[i][j] is a lowercase English letter.
- 1 <= words.length <= 3 * 10⁴
- 1 <= words[i].length <= 10
- words[i] consists of lowercase English letters.
- All the strings of words are unique.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

**Strategy**: See [String Pattern](../strategies/data-structures/tries.md)

## Approach Hints

<details>
<summary>Key Insight</summary>
Running DFS for each word individually is wasteful. Build a Trie (prefix tree) from all words first. Then perform a single DFS traversal of the board while simultaneously traversing the Trie. This allows finding multiple words in one pass.
</details>

<details>
<summary>Main Approach</summary>
1. Build a Trie from all words in the dictionary. 2. For each cell in the board, start DFS if that character exists in Trie root. 3. During DFS, move to adjacent cells and corresponding Trie nodes simultaneously. 4. When reaching a word end marker in Trie, add word to results. 5. Mark visited cells temporarily during each DFS path.
</details>

<details>
<summary>Optimization Tip</summary>
Remove found words from the Trie during search to avoid duplicates and reduce search space. Also, prune Trie branches that become empty after word removal. Use board modification (temporarily changing cell value) instead of a separate visited set for better space efficiency.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (DFS per word) | O(w * m * n * 4^L) | O(L) | w=words, m*n=board, L=word length |
| Optimal (Trie + DFS) | O(m * n * 4^L) | O(w * L) | Single DFS pass, Trie stores all words |

## Common Mistakes

1. **Not handling duplicate results**
   ```python
   # Wrong: Same word found multiple times
   if trie_node.is_word:
       result.append(trie_node.word)

   # Correct: Remove word after finding it
   if trie_node.is_word:
       result.append(trie_node.word)
       trie_node.is_word = False  # Prevent duplicates
   ```

2. **Incorrect backtracking**
   ```python
   # Wrong: Forgetting to restore board state
   visited.add((i, j))
   dfs(i+1, j)
   # Missing: visited.remove((i, j))

   # Correct: Always restore state
   temp = board[i][j]
   board[i][j] = '#'  # Mark visited
   dfs(i+1, j)
   board[i][j] = temp  # Restore
   ```

3. **Not pruning empty Trie branches**
   ```python
   # Wrong: Keeping empty branches slows search
   trie_node.is_word = False

   # Correct: Remove empty leaf nodes
   if trie_node.is_word:
       trie_node.is_word = False
       if not trie_node.children:
           parent.remove_child(char)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Word Search | Medium | Find single word in grid |
| Boggle Game | Hard | Find all valid dictionary words |
| Crossword Puzzle | Hard | Fill grid with words that intersect |
| Word Squares | Hard | Arrange words to form valid word square |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Trie Data Structure](../../strategies/data-structures/tries.md)
