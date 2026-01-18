---
id: M192
old_id: I232
slug: minimum-genetic-mutation
title: Minimum Genetic Mutation
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["M127", "M433", "E242"]
prerequisites: ["bfs", "graph-traversal", "string-manipulation"]
---
# Minimum Genetic Mutation

## Problem

Imagine working in a bioinformatics lab where genes are represented as strings containing exactly 8 characters. Each character must be one of the four nucleotides: `'A'`, `'C'`, `'G'`, or `'T'` (representing adenine, cytosine, guanine, and thymine). Your task is to transform `startGene` into `endGene` through a series of single-character mutations, similar to how viruses evolve over time.

Each mutation changes exactly one character in the gene string. For example, changing `"AACCGGTT"` to `"AACCGGTA"` counts as a single mutation. Here's the critical constraint: you can only use gene sequences that appear in a collection called `bank`, which represents all permissible intermediate evolutionary steps. This models how real genetic evolution only proceeds through viable gene sequences that can actually survive and reproduce.

Your task is to find the smallest number of mutations required to transform `startGene` into `endGene`, using only valid genes from `bank`. If the transformation is impossible (perhaps because the target gene or necessary intermediate steps are missing from the bank), return `-1`. The initial gene `startGene` is always considered valid, even if it doesn't appear in `bank`, representing your starting organism.

## Why This Matters

This problem models real bioinformatics challenges in computational biology and drug discovery. When researchers study how viruses like influenza or HIV evolve drug resistance, they need to understand the minimal evolutionary pathways between gene sequences. Pharmaceutical companies use similar algorithms to predict how pathogens might mutate, helping them design treatments that remain effective even as diseases evolve. The graph-based approach you'll develop here treating each valid gene as a node and mutations as edges is the same technique used in protein folding analysis, where scientists predict how changing one amino acid affects protein structure. Beyond biology, this pattern appears in spell-checkers (finding minimal edits to reach valid words), network routing protocols (finding shortest paths through valid intermediate hops), and state-space search in AI planning systems. The BFS strategy you'll employ guarantees finding the shortest transformation path, making it ideal for any domain where you need the minimal number of steps to reach a goal state.

## Examples

**Example 1:**
- Input: `startGene = "AACCGGTT", endGene = "AACCGGTA", bank = ["AACCGGTA"]`
- Output: `1`

**Example 2:**
- Input: `startGene = "AACCGGTT", endGene = "AAACGGTA", bank = ["AACCGGTA","AACCGCTA","AAACGGTA"]`
- Output: `2`

## Constraints

- 0 <= bank.length <= 10
- startGene.length == endGene.length == bank[i].length == 8
- startGene, endGene, and bank[i] consist of only the characters ['A', 'C', 'G', 'T'].

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual Understanding</summary>
This is a shortest path problem in disguise. Think of each valid gene as a node in a graph, and edges connect genes that differ by exactly one character. The problem asks for the shortest path from startGene to endGene using only nodes in the bank. BFS naturally finds shortest paths in unweighted graphs.
</details>

<details>
<summary>🎯 Hint 2: Graph Construction</summary>
You don't need to explicitly build the graph. For each gene, try mutating each of its 8 positions to each of the 4 possible characters. If the resulting gene is in the bank and hasn't been visited, it's a valid neighbor. Use BFS to explore level by level, tracking mutation count.
</details>

<details>
<summary>📝 Hint 3: BFS Algorithm</summary>
```
1. Convert bank to set for O(1) lookup
2. Initialize queue with (startGene, 0) and visited set
3. While queue is not empty:
   - Dequeue (current_gene, mutations)
   - If current_gene == endGene, return mutations
   - For each position i in [0, 7]:
     - For each nucleotide in ['A', 'C', 'G', 'T']:
       - Create mutated gene by changing position i
       - If mutated gene in bank and not visited:
         - Mark as visited
         - Enqueue (mutated_gene, mutations + 1)
4. Return -1 (no path found)
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| BFS with mutation generation | O(n * 8 * 4) | O(n) | n = bank size, 8 positions, 4 nucleotides |
| BFS with precomputed graph | O(n² * 8) | O(n²) | Build adjacency list, slower for small n |
| DFS with backtracking | O(4^8) worst case | O(8) | Explores invalid paths, inefficient |
| Bidirectional BFS | O(n * 8 * 4) | O(n) | Faster in practice, same asymptotic |

**Recommended approach**: BFS with on-the-fly mutation generation.

## Common Mistakes

**Mistake 1: Not converting bank to set**
```python
# Wrong: O(n) lookup for each mutation check
def minMutation(startGene, endGene, bank):
    if endGene not in bank:  # O(n) check
        return -1

    queue = [(startGene, 0)]
    visited = {startGene}

    while queue:
        gene, mutations = queue.pop(0)
        if gene == endGene:
            return mutations

        for i in range(8):
            for nucleotide in 'ACGT':
                mutated = gene[:i] + nucleotide + gene[i+1:]
                if mutated in bank and mutated not in visited:  # O(n) check
                    visited.add(mutated)
                    queue.append((mutated, mutations + 1))

    return -1
```

```python
# Correct: O(1) lookup using set
def minMutation(startGene, endGene, bank):
    bank_set = set(bank)  # Convert to set once
    if endGene not in bank_set:
        return -1

    queue = [(startGene, 0)]
    visited = {startGene}

    while queue:
        gene, mutations = queue.pop(0)
        if gene == endGene:
            return mutations

        for i in range(8):
            for nucleotide in 'ACGT':
                mutated = gene[:i] + nucleotide + gene[i+1:]
                if mutated in bank_set and mutated not in visited:  # O(1)
                    visited.add(mutated)
                    queue.append((mutated, mutations + 1))

    return -1
```

**Mistake 2: Forgetting to check if endGene is in bank**
```python
# Wrong: Tries to reach unreachable target
def minMutation(startGene, endGene, bank):
    bank_set = set(bank)
    # Missing check if endGene is in bank

    queue = [(startGene, 0)]
    visited = {startGene}

    while queue:
        gene, mutations = queue.pop(0)
        if gene == endGene:  # Will never reach if not in bank
            return mutations
        # ... rest of code

    return -1  # Wastes time exploring
```

```python
# Correct: Early return if endGene not in bank
def minMutation(startGene, endGene, bank):
    bank_set = set(bank)
    if endGene not in bank_set:  # Early exit
        return -1

    queue = [(startGene, 0)]
    visited = {startGene}

    while queue:
        gene, mutations = queue.pop(0)
        if gene == endGene:
            return mutations

        for i in range(8):
            for nucleotide in 'ACGT':
                mutated = gene[:i] + nucleotide + gene[i+1:]
                if mutated in bank_set and mutated not in visited:
                    visited.add(mutated)
                    queue.append((mutated, mutations + 1))

    return -1
```

**Mistake 3: Mutating to same character**
```python
# Wrong: Wastes cycles checking unchanged genes
def minMutation(startGene, endGene, bank):
    bank_set = set(bank)
    if endGene not in bank_set:
        return -1

    queue = [(startGene, 0)]
    visited = {startGene}

    while queue:
        gene, mutations = queue.pop(0)
        if gene == endGene:
            return mutations

        for i in range(8):
            for nucleotide in 'ACGT':  # Includes current character
                mutated = gene[:i] + nucleotide + gene[i+1:]
                if mutated in bank_set and mutated not in visited:
                    visited.add(mutated)
                    queue.append((mutated, mutations + 1))

    return -1
```

```python
# Correct: Skip if nucleotide is same as current
def minMutation(startGene, endGene, bank):
    bank_set = set(bank)
    if endGene not in bank_set:
        return -1

    queue = [(startGene, 0)]
    visited = {startGene}

    while queue:
        gene, mutations = queue.pop(0)
        if gene == endGene:
            return mutations

        for i in range(8):
            for nucleotide in 'ACGT':
                if nucleotide == gene[i]:  # Skip if no change
                    continue
                mutated = gene[:i] + nucleotide + gene[i+1:]
                if mutated in bank_set and mutated not in visited:
                    visited.add(mutated)
                    queue.append((mutated, mutations + 1))

    return -1
```

## Variations

| Variation | Difference | Key Insight |
|-----------|-----------|-------------|
| Word Ladder | Transform word to another | Same BFS approach, 26 letters instead of 4 |
| Gene with wildcards | Bank has * for any nucleotide | Match with regex or expand wildcards |
| Minimum cost mutations | Different costs per mutation | Use Dijkstra instead of BFS |
| All shortest paths | Return all minimum paths | Track parent pointers, reconstruct paths |
| K mutations allowed | Find if reachable in k steps | BFS with depth limit |

## Practice Checklist

Use spaced repetition to master this problem:

- [ ] Day 1: Solve using BFS with mutation generation
- [ ] Day 2: Optimize with bidirectional BFS
- [ ] Day 4: Implement without looking at notes
- [ ] Day 7: Solve and explain graph reduction
- [ ] Day 14: Solve variations (word ladder, cost-based)
- [ ] Day 30: Speed test - solve in under 12 minutes
