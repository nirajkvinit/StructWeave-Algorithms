---
id: M451
old_id: A306
slug: similar-string-groups
title: Similar String Groups
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
---
# Similar String Groups

## Problem

Imagine you have a collection of words that are all anagrams of each other. Two words in this collection are considered "similar" if they're either identical, or if you can make them identical by swapping exactly two characters in one of the words.

For example, "tars" and "rats" are similar because swapping positions 0 and 2 in "tars" (the 't' and 'r') gives you "rats". Similarly, "rats" and "arts" are also similar (swap the 'r' and 'a').

Here's the interesting part: similarity creates connections between words. Even though "tars" and "arts" aren't directly similar to each other, they belong to the same group because they're both similar to "rats". Think of it like a social network where friendships create groups.

Given an array of strings where all words are anagrams of each other, your task is to determine how many distinct similarity groups exist. Each group consists of words where every word is similar to at least one other word in that group.

## Why This Matters

This problem mirrors real-world clustering scenarios like grouping similar user profiles, detecting duplicate records in databases, or identifying related documents. The underlying concept of forming groups based on relationships is fundamental to social network analysis, where you might need to identify communities of connected users. It also appears in spell-checking systems that group variations of misspelled words, and in fraud detection where you cluster related transactions. The union-find data structure you'll use here is the backbone of Kruskal's algorithm for minimum spanning trees and is essential for efficiently managing dynamic connectivity in large datasets.

## Examples

**Example 1:**
- Input: `strs = ["tars","rats","arts","star"]`
- Output: `2`

**Example 2:**
- Input: `strs = ["omv","ovm"]`
- Output: `1`

## Constraints

- 1 <= strs.length <= 300
- 1 <= strs[i].length <= 300
- strs[i] consists of lowercase letters only.
- All words in strs have the same length and are anagrams of each other.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a graph connectivity problem. Each string is a node, and edges exist between similar strings. The number of groups equals the number of connected components. Union-Find (Disjoint Set Union) is ideal for tracking these groups efficiently.
</details>

<details>
<summary>🎯 Main Approach</summary>
First, create a helper function to check if two strings are similar (differ by at most one swap). Then, use Union-Find to group strings: iterate through all pairs, and if they're similar, union them. Finally, count the number of distinct root parents, which gives the number of groups.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The similarity check can be optimized: count positions where strings differ. If differences == 0 (identical) or differences == 2 (and swapping those two positions makes them equal), they're similar. Early exit if differences exceed 2 for efficiency.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (DFS/BFS) | O(n^2 * m) where m = string length | O(n) | Check all pairs, build graph, traverse |
| Union-Find | O(n^2 * m * α(n)) | O(n) | α(n) is inverse Ackermann, nearly constant |
| Optimal (Union-Find with path compression) | O(n^2 * m) | O(n) | With path compression and union by rank |

## Common Mistakes

1. **Incorrect similarity check**
   ```python
   # Wrong: Not handling the "at most 2 swaps" correctly
   def is_similar(s1, s2):
       diff_count = sum(c1 != c2 for c1, c2 in zip(s1, s2))
       return diff_count <= 2  # Missing swap validation!

   # Correct: Verify the swap makes them equal
   def is_similar(s1, s2):
       diffs = [(i, s1[i], s2[i]) for i in range(len(s1)) if s1[i] != s2[i]]
       if len(diffs) == 0:
           return True
       if len(diffs) == 2:
           return diffs[0][1] == diffs[1][2] and diffs[0][2] == diffs[1][1]
       return False
   ```

2. **Not implementing Union-Find correctly**
   ```python
   # Wrong: No path compression or union by rank
   class UnionFind:
       def find(self, x):
           while parent[x] != x:
               x = parent[x]
           return x  # Slow without path compression

   # Correct: Path compression
   class UnionFind:
       def find(self, x):
           if parent[x] != x:
               parent[x] = self.find(parent[x])  # Path compression
           return parent[x]
   ```

3. **Inefficient pair checking**
   ```python
   # Wrong: Checking each pair multiple times
   for i in range(n):
       for j in range(n):
           if is_similar(strs[i], strs[j]):  # Checks i,j and j,i

   # Correct: Check each pair once
   for i in range(n):
       for j in range(i + 1, n):
           if is_similar(strs[i], strs[j]):
               uf.union(i, j)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Similar Strings with K Swaps | Hard | Allow up to k swaps instead of 1 |
| Word Ladder | Medium | Change one character at a time, all intermediate must be valid |
| Accounts Merge | Medium | Group by common elements (emails) |
| Number of Islands | Medium | 2D grid connectivity problem |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Union-Find](../../prerequisites/union-find.md)
