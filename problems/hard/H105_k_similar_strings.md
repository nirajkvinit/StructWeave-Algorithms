---
id: H105
old_id: A321
slug: k-similar-strings
title: K-Similar Strings
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# K-Similar Strings

## Problem

Two strings are considered k-similar when you can transform one into the other by performing exactly k character swaps, where each swap exchanges two characters at different positions.

You are given two strings `s1` and `s2` that contain the same characters (anagrams). Determine the minimum number of swaps required to transform `s1` into `s2`.

## Why This Matters

Understanding character-level transformations is crucial for text processing algorithms and helps develop systematic problem-solving approaches for string manipulation tasks.

## Examples

**Example 1:**
- Input: `s1 = "ab", s2 = "ba"`
- Output: `1`
- Explanation: A single swap of positions 0 and 1 transforms "ab" into "ba".

**Example 2:**
- Input: `s1 = "abc", s2 = "bca"`
- Output: `2`
- Explanation: Two swaps are needed: first swap positions to get "bac", then swap again to reach "bca".

## Constraints

- 1 <= s1.length <= 20
- s2.length == s1.length
- s1 and s2 contain only lowercase letters from the set {'a', 'b', 'c', 'd', 'e', 'f'}.
- s2 is an anagram of s1.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

This is a shortest path problem in the state space of string permutations. Each state is a string configuration, and each edge is a swap operation. Use BFS to find the minimum number of swaps. The key optimization is to only swap at the first mismatched position with a character that matches the target at that position - this pruning dramatically reduces the search space.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use BFS starting from s1. For each string state, find the leftmost position where it differs from s2. Then only try swapping this position with positions to the right that have the correct character for this position in s2. Add each resulting string to the queue if not visited. This greedy choice of always fixing the leftmost mismatch first ensures we explore states efficiently without missing the optimal solution.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Prune the search space aggressively: (1) Only generate swaps from the first mismatch position, (2) Only swap with positions that actually help (character at j equals target at i), (3) Prefer swaps that fix multiple positions simultaneously (when s1[j] == s2[i] AND s1[i] == s2[j]). These optimizations can reduce the branching factor significantly.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force BFS | O(n! * n) | O(n!) | Explore all permutations |
| Optimized BFS with Pruning | O(n^2 * k!) | O(n * k!) | k = number of mismatches, typically small |
| Bidirectional BFS | O(n^2 * k!/2) | O(n * k!) | Meet in the middle approach |

## Common Mistakes

1. **Trying all possible swaps without pruning**
   ```python
   # Wrong: Generate all n*(n-1)/2 possible swaps
   for i in range(len(s)):
       for j in range(i + 1, len(s)):
           new_s = swap(s, i, j)
           if new_s not in visited:
               queue.append((new_s, swaps + 1))

   # Correct: Only swap from first mismatch position
   i = 0
   while i < len(s) and s[i] == target[i]:
       i += 1
   if i == len(s):
       return swaps  # Found target
   # Only try swapping position i with valid positions j > i
   for j in range(i + 1, len(s)):
       if s[j] == target[i]:  # This swap helps
           new_s = swap(s, i, j)
           queue.append((new_s, swaps + 1))
   ```

2. **Not using visited set correctly**
   ```python
   # Wrong: Checking visited after adding to queue
   queue.append(new_state)
   if new_state in visited:
       continue

   # Correct: Check before adding to prevent duplicates
   if new_state not in visited:
       visited.add(new_state)
       queue.append((new_state, swaps + 1))
   ```

3. **Missing the double-fix optimization**
   ```python
   # Wrong: Not prioritizing swaps that fix both positions
   for j in range(i + 1, len(s)):
       if s[j] == target[i]:
           queue.append(swap(s, i, j))

   # Correct: Prioritize double fixes
   for j in range(i + 1, len(s)):
       if s[j] == target[i]:
           if s[i] == target[j]:  # Double fix!
               return swaps + 1  # Greedy choice
           queue.append(swap(s, i, j))
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| K-Similar with Costs | Hard | Different swap costs between positions |
| Adjacent Swaps Only | Medium | Can only swap adjacent characters |
| K-Similar with Reversals | Hard | Allow substring reversals in addition to swaps |
| Minimum Swaps to Sort | Medium | Make array sorted instead of matching target |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (already equal, single swap, no valid swaps)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [BFS Pattern](../../strategies/patterns/breadth-first-search.md)
