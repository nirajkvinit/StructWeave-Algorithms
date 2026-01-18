---
id: M391
old_id: A234
slug: reorganize-string
title: Reorganize String
difficulty: medium
category: medium
topics: ["string"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
---
# Reorganize String

## Problem

Given a string containing lowercase letters, rearrange its characters so that no two adjacent characters are the same. If multiple valid arrangements exist, return any one of them. If no such arrangement is possible, return an empty string.

The challenge lies in determining whether a valid rearrangement exists before attempting to construct it. Consider a string like `"aab"` where you have two 'a's and one 'b'. You can interleave them as `"aba"` to avoid placing the two 'a's next to each other. However, with `"aaab"`, you have three 'a's but only one 'b' to separate them. Since you need at least two separators to keep three identical characters apart, this arrangement becomes impossible.

The key insight is mathematical: if any character appears more than `(n + 1) // 2` times in a string of length `n`, no valid rearrangement exists. For example, in a string of length 5, if any character appears more than 3 times, you cannot separate all occurrences. Once you verify feasibility, the strategy is to greedily place the most frequent characters first, always alternating to prevent adjacency.

## Why This Matters

This problem appears frequently in interview settings because it tests multiple skills: character frequency counting, greedy algorithm design, and understanding impossibility conditions. It has practical applications in task scheduling systems where you need to distribute recurring tasks with cooldown periods, or in data compression algorithms that avoid consecutive repeated symbols. The greedy approach with a priority queue mirrors strategies used in CPU scheduling and load balancing, where you repeatedly select the highest-priority item while managing constraints. Mastering this problem builds your ability to recognize when a greedy strategy is optimal and how to prove whether a solution exists before attempting to construct it.

## Examples

**Example 1:**
- Input: `s = "aab"`
- Output: `"aba"`

**Example 2:**
- Input: `s = "aaab"`
- Output: `""`

## Constraints

- 1 <= s.length <= 500
- s consists of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
If any character appears more than (n + 1) // 2 times, it's impossible to reorganize. Otherwise, always place the most frequent character first to avoid adjacency.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a max heap (priority queue) to always select the most frequent remaining character. After placing a character, temporarily hold it out of the heap for one iteration to prevent consecutive placement.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
First fill all even positions (0, 2, 4, ...) with the most frequent character, then fill odd positions with remaining characters. This avoids heap overhead for simple cases.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n!) | O(n) | Try all permutations |
| Heap-based | O(n log k) | O(k) | k is number of unique characters |
| Optimal | O(n) | O(k) | Fill even/odd positions greedily |

## Common Mistakes

1. **Not Checking Impossibility Condition**
   ```python
   # Wrong: Attempting to reorganize without validation
   while heap:
       char, count = heappop(heap)
       result.append(char)

   # Correct: Check if most frequent char exceeds limit
   max_freq = max(counter.values())
   if max_freq > (len(s) + 1) // 2:
       return ""
   ```

2. **Placing Same Character Consecutively**
   ```python
   # Wrong: Immediately re-adding character to heap
   char, count = heappop(heap)
   result.append(char)
   if count > 1:
       heappush(heap, (count - 1, char))

   # Correct: Hold previous character for one iteration
   char, count = heappop(heap)
   result.append(char)
   if prev:
       heappush(heap, prev)
   prev = (count - 1, char) if count > 1 else None
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Task Scheduler | Medium | Adding idle time between tasks with cooldown |
| Rearrange String k Distance Apart | Hard | Ensuring k minimum distance instead of 1 |
| Sort Characters by Frequency | Medium | Sorting by frequency without adjacency constraint |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
