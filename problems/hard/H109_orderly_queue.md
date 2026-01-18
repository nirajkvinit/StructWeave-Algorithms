---
id: H109
old_id: A366
slug: orderly-queue
title: Orderly Queue
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# Orderly Queue

## Problem

You have a string `s` and an integer `k`. Each operation allows you to select any character from the first `k` positions and move it to the string's end.

Find the lexicographically minimal string achievable by performing this operation as many times as desired.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `s = "cba", k = 1`
- Output: `"acb"`
- Explanation: In the first move, we move the 1st character 'c' to the end, obtaining the string "bac".
In the second move, we move the 1st character 'b' to the end, obtaining the final result "acb".

**Example 2:**
- Input: `s = "baaca", k = 3`
- Output: `"aaabc"`
- Explanation: In the first move, we move the 1st character 'b' to the end, obtaining the string "aacab".
In the second move, we move the 3rd character 'c' to the end, obtaining the final result "aaabc".

## Constraints

- 1 <= k <= s.length <= 1000
- s consist of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

This problem has a beautiful mathematical property: if k=1, you can only rotate the string (move first character to end repeatedly), giving n possible arrangements. If k>=2, you can achieve any permutation of the string! With k=2, you can perform bubble sort by carefully selecting which of the first 2 characters to move, allowing any sorting.

</details>

<details>
<summary>🎯 Main Approach</summary>

Handle two cases: (1) If k=1, generate all n rotations of the string and return the lexicographically smallest one. (2) If k>=2, simply sort the string and return it. The key insight is recognizing that k>=2 gives you enough flexibility to rearrange characters in any order.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

For k=1, instead of generating all rotations explicitly and sorting them, find the lexicographically smallest rotation in O(n) time using a specialized algorithm (like minimum rotation algorithm). For k>=2, built-in sort is already optimal at O(n log n). The challenge is recognizing the problem's structure, not optimization.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Simulation | O(n^2) | O(n^2) | Try all operations, explore state space |
| K=1: All Rotations | O(n^2) | O(n) | Generate n rotations, compare |
| K=1: Optimal Rotation | O(n) | O(n) | Find min rotation with linear algorithm |
| K>=2: Sort | O(n log n) | O(n) | Recognize any permutation achievable |

## Common Mistakes

1. **Not recognizing the k>=2 case**
   ```python
   # Wrong: Trying to simulate operations for all k
   def orderly_queue(s, k):
       # Complex BFS/simulation to explore all states
       queue = deque([s])
       visited = {s}
       min_result = s
       while queue:
           current = queue.popleft()
           for i in range(k):
               # Move ith character to end...
               # This is unnecessary for k >= 2!

   # Correct: Handle k=1 and k>=2 separately
   def orderly_queue(s, k):
       if k == 1:
           # Only rotations possible
           return min(s[i:] + s[:i] for i in range(len(s)))
       else:
           # Any permutation possible
           return ''.join(sorted(s))
   ```

2. **Generating rotations inefficiently for k=1**
   ```python
   # Wrong: Creating new strings repeatedly
   rotations = []
   for i in range(len(s)):
       rotations.append(s[i:] + s[:i])  # O(n) per rotation
   return min(rotations)  # O(n^2) total

   # Correct: More efficient comparison (still O(n^2) but better constants)
   min_rotation = s
   for i in range(1, len(s)):
       rotation = s[i:] + s[:i]
       if rotation < min_rotation:
           min_rotation = rotation
   return min_rotation
   ```

3. **Not understanding why k>=2 allows any permutation**
   ```python
   # Wrong: Treating k=2 and k=3 differently
   if k == 2:
       # Special logic for k=2
   elif k == 3:
       # Different logic for k=3

   # Correct: Recognize k>=2 all behave the same
   if k >= 2:
       return ''.join(sorted(s))
   # Proof: with k=2, you can bubble sort by choosing
   # whether to move s[0] or s[1], effectively swapping them
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Orderly Queue with Cost | Hard | Each operation has a cost, minimize total |
| Circular Queue Sorting | Medium | Find minimum operations instead of result |
| K-Window Rearrangement | Medium | Can rearrange any k consecutive characters |
| Constrained String Sorting | Hard | Additional constraints on character positions |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (k=1, k=len(s), single character)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [String Manipulation Pattern](../../strategies/patterns/string-manipulation.md)
