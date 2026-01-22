---
id: M301
old_id: A109
slug: design-search-autocomplete-system
title: Design Search Autocomplete System
difficulty: medium
category: medium
topics: ["array", "string", "trie", "design"]
patterns: ["trie", "heap"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M208", "M211", "M677", "M642"]
prerequisites: ["M208", "E703"]
strategy_ref: ../prerequisites/tries.md
---
# Design Search Autocomplete System

## Problem

Build an autocomplete system similar to those found in modern search engines. Users type sentences character by character, and after each character, your system suggests the most relevant completions based on historical search data. When the user finishes a sentence (indicated by typing the special character `'#'`), that sentence gets added to the history for future suggestions.

The system starts with historical data: two arrays of equal length where `sentences[i]` contains a previously searched sentence and `times[i]` indicates how many times users have searched for that exact sentence. For example, if `sentences = ["i love coding", "island"]` and `times = [5, 3]`, it means "i love coding" was searched 5 times and "island" was searched 3 times.

As the user types each character (except `'#'`), return the top 3 most relevant suggestions that match what they've typed so far. Suggestions are ranked using these rules:
- First, sort by frequency (sentences searched more often rank higher)
- Break ties using alphabetical order (lexicographic ASCII order)
- Return fewer than 3 suggestions if fewer matches exist
- When `'#'` is entered, save the completed sentence to the history (incrementing its count if it already exists) and return an empty list

You need to implement the `AutocompleteSystem` class with two methods:
- `AutocompleteSystem(String[] sentences, int[] times)`: Initialize the system with historical search data
- `List<String> input(char c)`: Process each character the user types and return suggestions. If `c == '#'`, record the current sentence and reset for the next input; otherwise, return up to 3 matching sentences based on the prefix typed so far.

For example, if the user types "i" then "s", you'd return suggestions matching "i", then suggestions matching "is". If they type `'#'`, the sentence "is" gets saved to history.

## Why This Matters

Autocomplete systems power billions of daily searches across search engines, e-commerce sites, and mobile keyboards. This problem teaches you how to build prefix-based search efficiently using tries (prefix trees), a fundamental data structure for text processing. You'll combine multiple techniques: organizing data by common prefixes, maintaining frequency rankings, and managing stateful interactions across multiple function calls. These skills translate directly to building real search features, implementing code editors with intelligent suggestions, or creating command-line interfaces with tab completion. The pattern of maintaining state while processing sequential input also appears in parsers, text editors, and chat applications.

## Constraints

- n == sentences.length
- n == times.length
- 1 <= n <= 100
- 1 <= sentences[i].length <= 100
- 1 <= times[i] <= 50
- c is a lowercase English letter, a hash '#', or space ' '.
- Each tested sentence will be a sequence of characters c that end with the character '#'.
- Each tested sentence will have a length in the range [1, 200].
- The words in each input sentence are separated by single spaces.
- At most 5000 calls will be made to input.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Build a Trie with Frequency Information</summary>

A Trie (prefix tree) is perfect for autocomplete because it groups sentences by common prefixes. Each node in the trie can store:
- Character value
- Children nodes (26 letters + space)
- A list of (sentence, frequency) pairs that pass through this node

Alternatively, only store complete sentences at leaf nodes and traverse to collect matches. The key decision is whether to store sentence references at every node or just at terminal nodes.

**Optimization**: Store top-k sentences at each node during construction to avoid searching the entire subtree on each query. This trades space for query speed.

</details>

<details>
<summary>Hint 2: Track Current Input State</summary>

Maintain the current partial sentence being typed as an instance variable. Each call to `input()`:

1. **If c != '#'**:
   - Append `c` to current sentence
   - Navigate to the corresponding node in the trie
   - Collect all sentences with this prefix
   - Sort by frequency (descending), then lexicographically
   - Return top 3

2. **If c == '#'**:
   - Insert/update current sentence in the trie
   - Increment its frequency
   - Reset current sentence to empty
   - Return empty list

The tricky part is efficiently collecting matching sentences from the trie subtree.

</details>

<details>
<summary>Hint 3: Optimize Search with Heap or Pre-sorting</summary>

For each query, you need the top 3 results. Two approaches:

**Approach 1: Collect all, then sort**
- DFS through trie subtree to collect all matching sentences
- Sort by (frequency desc, sentence asc)
- Return first 3
- Time: O(m log m) where m is matches

**Approach 2: Use min-heap of size 3**
- Maintain a heap of top 3 candidates during DFS
- Only keep sentences better than current 3rd best
- Time: O(m log 3) = O(m)
- More complex but faster for many matches

**Approach 3: Pre-cache top-k at each node** (best)
- During trie construction, store top 3 sentences at each node
- On query, directly return the cached list
- Time: O(1) per query, but O(n²k) construction and O(nk) space

For interview constraints (n <= 100), approach 1 is simplest and sufficient.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Trie + Sort per Query | O(p + m log m) | O(N) | p=prefix length, m=matches, N=total chars |
| Trie + Min-Heap | O(p + m log k) | O(N) | k=3, better for many matches |
| Trie + Cached Top-K | O(p) | O(N × k) | Fastest queries, more space |

**Recommended**: Trie with sorting per query for balance of simplicity and performance.

## Common Mistakes

1. **Inefficient prefix matching**
```python
# Wrong: Checking all sentences on each input
def input(self, c):
    results = []
    for sentence in self.sentences:
        if sentence.startswith(self.current):
            results.append((sentence, self.freq[sentence]))
    # O(n × L) per query, very slow!

# Correct: Use trie to narrow search space
def input(self, c):
    self.current += c
    node = self.search_prefix(self.current)
    if not node:
        return []
    results = self.collect_from_subtree(node)
    # O(p + m) where p=prefix length, m=matches
```

2. **Incorrect sorting comparator**
```python
# Wrong: Only sorting by frequency
results.sort(key=lambda x: -x[1])  # Ignores lexicographic ties

# Correct: Sort by frequency desc, then lexicographically
results.sort(key=lambda x: (-x[1], x[0]))
```

3. **Not resetting state after '#'**
```python
# Wrong: Forgetting to clear current input
def input(self, c):
    if c == '#':
        self.update_trie(self.current)
        return []  # Forgot to reset self.current!

# Correct: Clear state for next sentence
def input(self, c):
    if c == '#':
        self.update_trie(self.current)
        self.current = ""  # Reset for next input
        return []
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Autocomplete with Typos | Hard | Suggest corrections for misspelled prefixes |
| Ranked Autocomplete | Hard | Combine frequency with relevance scores |
| Real-time Trending | Hard | Weight recent searches higher than old ones |
| Multi-field Autocomplete | Hard | Search across multiple fields (title, tags, etc.) |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Implement basic trie structure with insert and search
- [ ] Add frequency tracking to trie nodes
- [ ] Implement prefix search to collect matching sentences
- [ ] Add correct sorting (frequency desc, lexicographic asc)
- [ ] Handle '#' terminator correctly (update and reset)
- [ ] Test with edge cases (empty input, no matches, ties in frequency)
- [ ] Review after 1 day: Can you recall the trie structure?
- [ ] Review after 1 week: Implement without looking at notes
- [ ] Review after 1 month: Solve the typo-tolerant variation

**Strategy**: See [Array Pattern](../prerequisites/tries.md)
