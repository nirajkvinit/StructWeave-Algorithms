---
id: M388
old_id: A230
slug: partition-labels
title: Partition Labels
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
---
# Partition Labels

## Problem

Imagine cutting a string into pieces where each letter appears in exactly one piece. Your goal is to make as many cuts as possible while maintaining this constraint.

Given a string `s`, partition it into the maximum number of segments with this rule: **each character can only appear in one segment**. If the letter 'a' appears multiple times in the string, all occurrences of 'a' must be in the same segment.

For example, with `s = "ababcbacadefegdehijhklij"`:
- Notice 'a' appears at positions 0, 2, 4, 6, 8 (all in the first 9 characters)
- 'b' appears at positions 1, 3, 5 (also in the first 9 characters)
- 'c' appears at positions 4, 7 (in the first 9 characters)
- So we could cut after position 8: `"ababcbaca"` is a valid first segment

The challenge is determining where to make cuts to maximize the number of segments. A naive approach might create fewer, longer segments, but we want as many segments as possible.

Constraints:
- Segments must maintain their original order (no reordering)
- When concatenated, segments reconstruct the original string
- Return a list of segment lengths (not the segments themselves)

For the example above, the answer is `[9, 7, 8]` representing three segments of those lengths.

## Why This Matters

This problem teaches greedy algorithms through a practical lens: partitioning data while maintaining constraints. Similar logic appears in data streaming (segmenting logs by session boundaries), network packet analysis (grouping related packets), and file compression (identifying independent blocks). The core insight - tracking the rightmost occurrence of each element to determine partition boundaries - is a pattern that extends to memory management (tracking last use of cache lines), distributed systems (determining transaction boundaries), and compiler optimization (identifying independent code blocks). This is a favorite interview question because it tests your ability to find elegant greedy solutions.

## Examples

**Example 1:**
- Input: `s = "ababcbacadefegdehijhklij"`
- Output: `[9,7,8]`
- Explanation: The optimal segmentation is "ababcbaca", "defegde", "hijhklij".
Each character is confined to a single segment.
A segmentation like "ababcbacadefegde", "hijhklij" is suboptimal because it produces fewer segments.

**Example 2:**
- Input: `s = "eccbbbbdec"`
- Output: `[10]`

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
Track the last occurrence of each character in the string. A segment can only end at position i if all characters appearing before i don't appear anywhere after i.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a greedy approach: iterate through the string while maintaining a window that extends to the rightmost occurrence of any character seen so far. When the current position matches the window's end, you've found a valid partition point.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Precompute the last occurrence index for all characters in a single pass. Then make a second pass to determine partition points using a running maximum of last occurrences.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check all possible partitions |
| Optimal | O(n) | O(1) | Two passes with fixed-size (26) character map |

## Common Mistakes

1. **Incorrect Partition Validation**
   ```python
   # Wrong: Only checking if current char matches last occurrence
   if i == last[s[i]]:
       partitions.append(i)

   # Correct: Track the maximum last occurrence seen so far
   end = max(end, last[s[i]])
   if i == end:
       partitions.append(i - start + 1)
   ```

2. **Off-by-One Errors in Length Calculation**
   ```python
   # Wrong: Forgetting to add 1 for length
   partitions.append(i)

   # Correct: Calculate actual segment length
   partitions.append(i - start + 1)
   start = i + 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Merge Intervals | Medium | Merging overlapping ranges instead of partitioning |
| Group Anagrams | Medium | Character frequency analysis with grouping |
| Minimum Window Substring | Hard | Finding minimum window containing all target chars |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
