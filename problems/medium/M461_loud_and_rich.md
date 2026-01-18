---
id: M461
old_id: A318
slug: loud-and-rich
title: Loud and Rich
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Loud and Rich

## Problem

Imagine you're at a social gathering where everyone has two distinct characteristics: how wealthy they are and how quiet they are. You're given information about the wealth hierarchy among `n` people (numbered 0 through n-1), but the quietness levels are already known for everyone.

Here's what you have to work with:
- An array `richer` containing pairs `[ai, bi]` where person `ai` is definitely wealthier than person `bi`. These relationships are transitive - if Alex is richer than Bailey, and Bailey is richer than Charlie, then Alex is richer than Charlie.
- An array `quiet` where `quiet[i]` tells you how quiet person `i` is. Lower numbers mean quieter people. Each person has a unique quietness value.

Your challenge: For each person, find the quietest individual among all people who are at least as wealthy as them (including themselves).

For example, if you're looking at person 0, you need to consider person 0 and everyone who's wealthier than person 0, then identify who among that group is the quietest.

Return an array `answer` where `answer[x]` is the ID of the quietest person among everyone who has at least as much wealth as person `x`.

## Why This Matters

This problem mirrors real-world recommendation and ranking systems. Think of LinkedIn suggesting people to connect with based on professional networks, or social media platforms showing you influencers who might be relevant based on follower graphs. The wealth relationships form a directed acyclic graph (DAG), and you need to efficiently query transitive properties across this graph. This teaches you to handle hierarchical data where relationships cascade, a pattern common in organizational charts, dependency resolution systems, and knowledge graphs. The optimization challenge here is to avoid recomputing the same paths repeatedly when traversing these networks.

## Examples

**Example 1:**
- Input: `richer = [[1,0],[2,1],[3,1],[3,7],[4,3],[5,3],[6,3]], quiet = [3,2,5,4,6,1,7,0]`
- Output: `[5,5,2,5,4,5,6,7]`
- Explanation: For person 0, we trace the wealth chain upward: persons 1, 2, 3, 4, 5, and 6 are all wealthier. Among these (plus person 0), person 5 has the lowest quietness value.
For person 7, only person 7 is confirmed to have equal or greater wealth, so the answer is 7.
Similar logic applies to other positions.

**Example 2:**
- Input: `richer = [], quiet = [0]`
- Output: `[0]`

## Constraints

- n == quiet.length
- 1 <= n <= 500
- 0 <= quiet[i] < n
- All the values of quiet are **unique**.
- 0 <= richer.length <= n * (n - 1) / 2
- 0 <= ai, bi < n
- ai != bi
- All the pairs of richer are **unique**.
- The observations in richer are all logically consistent.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a graph problem where edges represent wealth relationships. For each person x, you need to find the quietest among all people who are richer than or equal to x. Build a directed graph where edge a→b means "a is richer than b". Then for each person, traverse upward (to richer people) and track the minimum quiet value.
</details>

<details>
<summary>🎯 Main Approach</summary>
Build a reverse graph where each person points to those who are richer. Use DFS with memoization: for each person, recursively find the quietest person among all richer people, then compare with current person. Cache results to avoid recomputation. The answer for person x is the minimum quiet value among x and all people reachable from x in the reverse graph.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use memoization (top-down DP) to cache the answer for each person. Once computed, answer[i] never changes. Start DFS from any person - if already computed, return immediately. This ensures each person is processed at most once, giving O(n + edges) time complexity.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n^2 + n × edges) | O(n + edges) | For each person, do full graph traversal |
| DFS with Memoization | O(n + edges) | O(n + edges) | Each node visited once, results cached |
| Topological Sort + DP | O(n + edges) | O(n + edges) | Process in order, similar efficiency |

## Common Mistakes

1. **Building graph in wrong direction**
   ```python
   # Wrong: Building forward graph (richer → poorer)
   graph = [[] for _ in range(n)]
   for a, b in richer:
       graph[a].append(b)  # a is richer than b

   # Correct: Build reverse graph (person → richer people)
   graph = [[] for _ in range(n)]
   for a, b in richer:
       graph[b].append(a)  # b points to richer person a
   ```

2. **Not using memoization**
   ```python
   # Wrong: Recomputing same person multiple times
   def dfs(person):
       quietest = person
       for richer_person in graph[person]:
           candidate = dfs(richer_person)  # Recomputes every time
           if quiet[candidate] < quiet[quietest]:
               quietest = candidate
       return quietest

   # Correct: Cache results
   answer = [-1] * n
   def dfs(person):
       if answer[person] != -1:
           return answer[person]
       quietest = person
       for richer_person in graph[person]:
           candidate = dfs(richer_person)
           if quiet[candidate] < quiet[quietest]:
               quietest = candidate
       answer[person] = quietest
       return quietest
   ```

3. **Forgetting to include the person themselves**
   ```python
   # Wrong: Only checking richer people
   quietest = float('inf')
   for richer_person in graph[person]:
       quietest = min(quietest, find_quietest(richer_person))

   # Correct: Person themselves might be quietest
   quietest = person
   for richer_person in graph[person]:
       candidate = find_quietest(richer_person)
       if quiet[candidate] < quiet[quietest]:
           quietest = candidate
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Course Schedule II | Medium | Topological sort without optimization criteria |
| Longest Increasing Path in Matrix | Hard | 2D grid instead of graph, maximize path length |
| Employee Importance | Easy | Simpler tree traversal without optimization |
| Network Delay Time | Medium | Weighted graph, finds maximum instead of minimum |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Graph DFS with Memoization](../../strategies/patterns/depth-first-search.md)
