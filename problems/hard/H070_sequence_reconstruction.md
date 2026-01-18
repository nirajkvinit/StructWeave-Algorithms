---
id: H070
old_id: I243
slug: sequence-reconstruction
title: Sequence Reconstruction
difficulty: hard
category: hard
topics: ["array"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 45
---
# Sequence Reconstruction

## Problem

You receive an integer array `nums` containing `n` elements, which is a permutation of integers from `[1, n]`. Additionally, you're provided a 2D array `sequences` where each inner array represents a subsequence found within `nums`.

Your goal is to verify whether `nums` represents the unique shortest supersequence that contains all given subsequences. A supersequence with minimum length can potentially be constructed in multiple ways from the same set of subsequences.

Consider these examples:
- With `sequences = [[1,2],[1,3]]`, both `[1,2,3]` and `[1,3,2]` are valid minimal supersequences
- With `sequences = [[1,2],[1,3],[1,2,3]]`, only `[1,2,3]` works as the minimal supersequence (note that `[1,2,3,4]` would be a supersequence but not minimal)

Return `true` when `nums` is the unique minimal supersequence for the provided `sequences`, otherwise return `false`.

Note: A subsequence can be obtained from a sequence by removing zero or more elements while maintaining the relative order of remaining elements.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `nums = [1,2,3], sequences = [[1,2],[1,3]]`
- Output: `false`
- Explanation: Two different minimal supersequences exist: [1,2,3] and [1,3,2].
Both [**1**,**2**,3] and [**1**,3,**2**] contain the subsequence [1,2].
Both [**1**,2,**3**] and [**1**,**3**,2] contain the subsequence [1,3].
Therefore, nums is not uniquely determined.

**Example 2:**
- Input: `nums = [1,2,3], sequences = [[1,2]]`
- Output: `false`
- Explanation: The minimal supersequence would be [1,2], not [1,2,3].
The given nums is longer than necessary.

**Example 3:**
- Input: `nums = [1,2,3], sequences = [[1,2],[1,3],[2,3]]`
- Output: `true`
- Explanation: The sequence [1,2,3] is the only minimal supersequence.
[**1**,**2**,3] contains [1,2].
[**1**,2,**3**] contains [1,3].
[1,**2**,**3**] contains [2,3].
The ordering is uniquely determined by these constraints.

## Constraints

- n == nums.length
- 1 <= n <= 10⁴
- nums is a permutation of all the integers in the range [1, n].
- 1 <= sequences.length <= 10⁴
- 1 <= sequences[i].length <= 10⁴
- 1 <= sum(sequences[i].length) <= 10⁵
- 1 <= sequences[i][j] <= n
- All the arrays of sequences are **unique**.
- sequences[i] is a subsequence of nums.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a topological sort problem. Build a directed graph from the sequences where each adjacent pair (a, b) means a must come before b. For nums to be the unique shortest supersequence, its topological ordering must be unique - meaning at each step of Kahn's algorithm, there's exactly one node with in-degree 0.
</details>

<details>
<summary>🎯 Main Approach</summary>
Build a graph and in-degree count from all sequences. Use Kahn's algorithm (BFS topological sort) but track uniqueness: at each step, if the queue has more than one element, multiple valid orderings exist, so return false. Also verify that the topological order matches nums exactly. All elements in nums must appear in at least one sequence.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Before building the graph, verify that all numbers 1 to n appear in the sequences. Create the graph efficiently using sets to avoid duplicate edges (duplicate edges don't affect correctness but waste time). Early exit if at any point during topological sort you find multiple nodes with in-degree 0 or if the generated sequence doesn't match nums.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (generate all perms) | O(n!) | O(n) | Check if all perms satisfy constraints |
| Topological Sort (Kahn's) | O(n + e) | O(n + e) | e = total edges from all sequences |
| Optimal (with early termination) | O(n + e) | O(n + e) | Same but better constants from pruning |

## Common Mistakes

1. **Not checking for unique topological ordering**
   ```python
   # Wrong: just checking if topological sort produces nums
   result = topological_sort(graph)
   return result == nums

   # Correct: verify uniqueness during sorting
   queue = deque([node for node in range(1, n+1) if in_degree[node] == 0])
   while queue:
       if len(queue) > 1:  # Multiple valid next steps
           return False
       # Continue processing
   ```

2. **Not validating all elements appear**
   ```python
   # Wrong: assuming sequences cover all elements
   for seq in sequences:
       for i in range(len(seq)-1):
           graph[seq[i]].add(seq[i+1])

   # Correct: check coverage first
   appeared = set()
   for seq in sequences:
       appeared.update(seq)
   if appeared != set(nums):
       return False
   ```

3. **Handling duplicate edges inefficiently**
   ```python
   # Wrong: using list for adjacency (allows duplicates)
   graph[a].append(b)
   in_degree[b] += 1  # Counted multiple times

   # Correct: use set to avoid duplicate edges
   if b not in graph[a]:
       graph[a].add(b)
       in_degree[b] += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Course Schedule II | Medium | Topological sort without uniqueness check |
| Alien Dictionary | Hard | Build ordering from implicit constraints |
| Minimum Height Trees | Medium | Similar graph construction |
| Parallel Courses III | Hard | Topological sort with timing constraints |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Topological Sort](../../strategies/patterns/topological-sort.md)
