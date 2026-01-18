---
id: M365
old_id: A204
slug: sentence-similarity-ii
title: Sentence Similarity II
difficulty: medium
category: medium
topics: ["array", "union-find"]
patterns: ["graph-connectivity"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E734", "M200", "M547"]
prerequisites: ["union-find", "graph-traversal", "dfs"]
---
# Sentence Similarity II

## Problem

Given two sentences (represented as word arrays) and a list of word similarity pairs, determine if the sentences are equivalent under the similarity rules.

Two sentences are equivalent if they have the same length and each corresponding pair of words is equivalent. The tricky part is understanding what "equivalent" means here.

You're given a list of word pairs `similarPairs` where each pair `[xi, yi]` indicates that words `xi` and `yi` are similar. The key insight is that similarity is **transitive**: if "great" is similar to "good", and "good" is similar to "fine", then "great" is similar to "fine" even if no direct pair links them.

Think of this like a thesaurus with synonym chains. For example:
- "happy" ~ "glad" (similar)
- "glad" ~ "joyful" (similar)
- Therefore: "happy" ~ "joyful" (transitively similar)

So the sentence `["I", "am", "happy"]` would be equivalent to `["I", "am", "joyful"]` if we have the similarity chain above, even though "happy" and "joyful" aren't directly paired.

Additional rules:
- Every word is similar to itself (reflexive property)
- If A is similar to B, then B is similar to A (symmetric property)
- Combined with transitivity, these properties define an equivalence relation

For sentences to be equivalent:
1. They must have the same number of words
2. For each position `i`, `sentence1[i]` must be equivalent to `sentence2[i]` following the transitive similarity rules

## Why This Matters

This problem is fundamentally about detecting connectivity in a graph, disguised as a text comparison problem. The word pairs form a graph where words are nodes and similarity pairs are edges. Determining if two words are equivalent is the same as asking if they're in the same connected component.

This pattern appears everywhere in real applications: social network analysis (are two people connected through mutual friends?), compiler optimization (which variables reference the same memory?), image segmentation (which pixels belong to the same region?), and network routing (can a packet reach its destination?).

The Union-Find data structure you'll likely use here is a cornerstone of algorithm design, appearing in Kruskal's minimum spanning tree algorithm, cycle detection, and many clustering problems. Learning to recognize when a problem reduces to graph connectivity is a valuable skill that transfers across many domains.

## Examples

**Example 1:**
- Input: `sentence1 = ["great","acting","skills"], sentence2 = ["fine","drama","talent"], similarPairs = [["great","good"],["fine","good"],["drama","acting"],["skills","talent"]]`
- Output: `true`
- Explanation: Both sentences have three words. Each corresponding position contains equivalent words based on the provided pairs.

**Example 2:**
- Input: `sentence1 = ["I","love","algoprac"], sentence2 = ["I","love","onepiece"], similarPairs = [["manga","onepiece"],["platform","anime"],["algoprac","platform"],["anime","manga"]]`
- Output: `true`
- Explanation: Through transitivity, "algoprac" connects to "onepiece" via the chain: "algoprac" → "platform" → "anime" → "manga" → "onepiece". Combined with the matching first two words, the sentences are equivalent.

**Example 3:**
- Input: `sentence1 = ["I","love","algoprac"], sentence2 = ["I","love","onepiece"], similarPairs = [["manga","hunterXhunter"],["platform","anime"],["algoprac","platform"],["anime","manga"]]`
- Output: `false`
- Explanation: No transitive path connects "algoprac" to "onepiece" through the given pairs.

## Constraints

- 1 <= sentence1.length, sentence2.length <= 1000
- 1 <= sentence1[i].length, sentence2[i].length <= 20
- sentence1[i] and sentence2[i] consist of lower-case and upper-case English letters.
- 0 <= similarPairs.length <= 2000
- similarPairs[i].length == 2
- 1 <= xi.length, yi.length <= 20
- xi and yi consist of English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Graph Connectivity Problem</summary>

Think of words as nodes in a graph:
- Each similar pair `[a, b]` creates an undirected edge between nodes `a` and `b`
- Two words are equivalent if they are in the same connected component

For two sentences to be equivalent:
1. They must have the same length
2. For each position `i`, words at `sentence1[i]` and `sentence2[i]` must be in the same connected component

You can use DFS, BFS, or Union-Find to determine connectivity.

</details>

<details>
<summary>Hint 2: Union-Find (Disjoint Set Union)</summary>

Union-Find is optimal for this problem:

1. Build the union-find structure from all similar pairs:
   ```
   For each [word1, word2] in similarPairs:
     union(word1, word2)
   ```

2. Check sentence equivalence:
   ```
   If len(sentence1) != len(sentence2):
     return False

   For i in range(len(sentence1)):
     if find(sentence1[i]) != find(sentence2[i]):
       return False

   return True
   ```

Union-Find handles transitivity automatically through path compression.

</details>

<details>
<summary>Hint 3: DFS/BFS Alternative</summary>

Build an adjacency list graph from similar pairs:
```
graph = defaultdict(list)
for word1, word2 in similarPairs:
  graph[word1].append(word2)
  graph[word2].append(word1)
```

For each pair of words to check:
- Use DFS/BFS to see if you can reach one word from the other
- Cache results for efficiency (assign component IDs)

This is less efficient than Union-Find but conceptually simpler.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Union-Find | O(p * α(p) + n) | O(w) | p = pairs, n = sentence length, w = unique words, α is inverse Ackermann |
| DFS/BFS per query | O(n * (w + p)) | O(w + p) | For each word pair, may traverse entire graph |
| DFS with component labeling | O(w + p + n) | O(w + p) | One-time DFS to label components, then O(1) checks |

Union-Find is the most efficient approach for this problem.

## Common Mistakes

**Mistake 1: Not handling transitivity**
```python
# Wrong - only checks direct pairs
similar_set = set()
for a, b in similarPairs:
    similar_set.add((a, b))
    similar_set.add((b, a))

for i in range(len(sentence1)):
    if sentence1[i] != sentence2[i] and \
       (sentence1[i], sentence2[i]) not in similar_set:
        return False
# Misses transitive relationships!

# Correct - use Union-Find or graph traversal
```

**Mistake 2: Incorrect Union-Find implementation**
```python
# Wrong - no path compression or rank optimization
def find(x):
    while parent[x] != x:
        x = parent[x]
    return x
# Works but inefficient

# Correct - with path compression
def find(x):
    if parent[x] != x:
        parent[x] = find(parent[x])  # Path compression
    return parent[x]
```

**Mistake 3: Not initializing all words in Union-Find**
```python
# Wrong - only initializes words from similarPairs
parent = {}
for a, b in similarPairs:
    if a not in parent:
        parent[a] = a
    if b not in parent:
        parent[b] = b
# Missing words from sentences!

# Correct - initialize all words that need checking
for word in sentence1 + sentence2:
    if word not in parent:
        parent[word] = word
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| Sentence Similarity I | No transitivity (only direct pairs) | Easy |
| Accounts Merge | Merge accounts with common emails (Union-Find) | Medium |
| Number of Provinces | Count connected components in graph | Medium |
| Redundant Connection | Find edge that creates cycle in graph | Medium |

## Practice Checklist

- [ ] Solve with Union-Find approach
- [ ] Test with transitive chains: A→B→C→D
- [ ] Implement path compression and union by rank
- [ ] Test edge cases: empty similarPairs, identical sentences
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Implement DFS/BFS solution for comparison
- [ ] Explain why transitivity matters
- [ ] Handle case where words appear in pairs but not in sentences
