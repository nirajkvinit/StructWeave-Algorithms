---
id: H115
old_id: A463
slug: number-of-squareful-arrays
title: Number of Squareful Arrays
difficulty: hard
category: hard
topics: ["array"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 45
---
# Number of Squareful Arrays

## Problem

An array is called **squareful** when adding any two consecutive elements produces a **perfect square**.

Given an integer array `nums`, count how many permutations of `nums` are **squareful**.

Two permutations `perm1` and `perm2` are considered distinct if at least one position `i` exists where `perm1[i] != perm2[i]`.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `nums = [1,17,8]`
- Output: `2`
- Explanation: [1,8,17] and [17,8,1] are the valid permutations.

**Example 2:**
- Input: `nums = [2,2,2]`
- Output: `1`

## Constraints

- 1 <= nums.length <= 12
- 0 <= nums[i] <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a permutation generation problem with constraints. Model it as a graph where nodes are numbers and edges exist between numbers whose sum is a perfect square. A squareful array corresponds to a Hamiltonian path in this graph. Handle duplicates by counting each number's frequency.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use backtracking with a constraint: build the graph of valid adjacent pairs, then use DFS to generate permutations. At each step, only choose numbers that form a perfect square sum with the previous number. Track which numbers are used with a frequency counter to handle duplicates. Precompute which pairs of numbers can be adjacent.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Avoid duplicate permutations by using a frequency map instead of a visited array. When you have duplicate numbers like [2,2,2], only count unique permutations. Also, precompute perfect square checks with a helper function: int(sqrt(x))**2 == x.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Generate All Permutations | O(n! * n) | O(n) | Check each permutation afterward |
| Backtracking with Pruning | O(n! * n) | O(n²) | Prune invalid paths early |
| Optimal Graph DFS | O(n! * n) | O(n²) | With adjacency precomputation and deduplication |

## Common Mistakes

1. **Not Handling Duplicates**
   ```python
   # Wrong: Treating [2,2,2] as three different 2's
   visited = [False] * len(nums)
   # This generates duplicate permutations

   # Correct: Use frequency counter
   from collections import Counter
   counter = Counter(nums)
   def backtrack(path):
       for num in counter:
           if counter[num] > 0:
               counter[num] -= 1
               # Continue backtracking
   ```

2. **Inefficient Perfect Square Check**
   ```python
   # Wrong: Checking at every step
   def is_perfect_square(n):
       i = 0
       while i * i < n:
           i += 1
       return i * i == n

   # Correct: Use math.sqrt with integer check
   import math
   def is_perfect_square(n):
       root = int(math.sqrt(n))
       return root * root == n
   ```

3. **Not Precomputing Valid Edges**
   ```python
   # Wrong: Checking perfect square sum during backtracking
   if is_perfect_square(path[-1] + num):
       # Repeat computation many times

   # Correct: Build adjacency graph first
   graph = {num: [] for num in set(nums)}
   for i in set(nums):
       for j in set(nums):
           if is_perfect_square(i + j):
               graph[i].append(j)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Permutations with Constraints | Medium | Different adjacency rules |
| Hamiltonian Path in Graph | Hard | General graph path finding |
| Valid Arrangements of Pairs | Hard | Similar constraint-based permutation |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Backtracking Patterns](../../strategies/patterns/backtracking.md)
