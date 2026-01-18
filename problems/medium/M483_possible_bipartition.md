---
id: M483
old_id: A353
slug: possible-bipartition
title: Possible Bipartition
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Possible Bipartition

## Problem

Imagine you're organizing a large group activity where participants need to be split into exactly two teams. You have `n` people numbered from `1` to `n`, but there's a complication: some pairs of people have conflicts and cannot be on the same team together.

You're given an array `dislikes` where each entry `dislikes[i] = [ai, bi]` indicates that person `ai` and person `bi` have a mutual conflict (think of it as a two-way disagreement, so if person 1 dislikes person 2, then person 2 also dislikes person 1).

Your challenge is to determine whether it's possible to divide all `n` people into two groups such that no two people with a conflict end up in the same group. Both groups can be any size (including empty, though having everyone in one group wouldn't satisfy the constraints).

Return `true` if such a valid division exists, and `false` if there's no way to separate everyone while respecting all the conflict constraints.

## Why This Matters

This problem is a classic application of graph bipartition, which appears in numerous real-world scenarios. Think of scheduling tasks on two processors where certain tasks can't run simultaneously, assigning students to two discussion groups when some students shouldn't be together, or dividing a network into two subnetworks while respecting connection constraints. The underlying principle appears in conflict resolution systems, resource allocation, task scheduling, and even in compiler optimization where variables need to be assigned to registers. Understanding graph coloring and bipartition detection is foundational for solving constraint satisfaction problems, which are ubiquitous in operations research, artificial intelligence, and system design. The algorithm you develop here directly applies to detecting odd cycles in graphs, a fundamental concept in graph theory.

## Examples

**Example 1:**
- Input: `n = 4, dislikes = [[1,2],[1,3],[2,4]]`
- Output: `true`
- Explanation: One valid partitioning is {1,4} and {2,3}.

**Example 2:**
- Input: `n = 3, dislikes = [[1,2],[1,3],[2,3]]`
- Output: `false`
- Explanation: Each person dislikes both others, making it impossible to separate them into just two groups.

## Constraints

- 1 <= n <= 2000
- 0 <= dislikes.length <= 10⁴
- dislikes[i].length == 2
- 1 <= ai < bi <= n
- All the pairs of dislikes are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a graph bipartition problem - can you color the graph with 2 colors such that no two connected nodes have the same color? Build a graph where edges represent dislikes. A valid bipartition exists if and only if the graph is bipartite (contains no odd-length cycles). Use graph coloring to detect this.
</details>

<details>
<summary>🎯 Main Approach</summary>
Build an adjacency list from the dislikes array. Use BFS or DFS to color the graph: assign color 0 to a starting node, color 1 to all its neighbors, color 0 to their neighbors, etc. If you ever try to color a node that's already colored with the opposite color, the graph is not bipartite. Handle disconnected components by checking all unvisited nodes.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use BFS with a queue or DFS with recursion - both work equally well. Track colors in an array (or dict) where color[i] is -1 (unvisited), 0 (group 0), or 1 (group 1). For each unvisited node, start a new BFS/DFS. The time complexity is O(V + E) where V is the number of people and E is the number of dislikes.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(2^n) | O(n) | Try all possible group assignments |
| BFS Graph Coloring | O(V + E) | O(V + E) | V = people, E = dislikes |
| DFS Graph Coloring | O(V + E) | O(V + E) | Same as BFS, different traversal |

## Common Mistakes

1. **Not handling disconnected components**
   ```python
   # Wrong: Only checking from person 1
   if not bfs(1, graph, colors):
       return False
   return True

   # Correct: Check all unvisited nodes
   colors = [-1] * (n + 1)
   for i in range(1, n + 1):
       if colors[i] == -1:
           if not bfs(i, graph, colors):
               return False
   return True
   ```

2. **Building graph incorrectly**
   ```python
   # Wrong: Only adding one direction of the edge
   graph[a].append(b)

   # Correct: Undirected graph needs both directions
   graph[a].append(b)
   graph[b].append(a)
   ```

3. **Incorrect color assignment**
   ```python
   # Wrong: Not alternating colors properly
   for neighbor in graph[node]:
       colors[neighbor] = colors[node]

   # Correct: Neighbors must have opposite color
   for neighbor in graph[node]:
       next_color = 1 - colors[node]
       if colors[neighbor] == -1:
           colors[neighbor] = next_color
       elif colors[neighbor] != next_color:
           return False
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Is Graph Bipartite? | Medium | Same problem with different framing |
| Divide Nodes Into Maximum Number of Groups | Hard | Partition into multiple groups, not just two |
| Satisfiability of Equality Equations | Medium | Union-find instead of graph coloring |
| Course Schedule | Medium | Detect cycles in directed graph (different from bipartite) |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Graph Bipartition](../../strategies/patterns/graph-patterns.md)
