---
id: M438
old_id: A288
slug: shortest-distance-to-a-character
title: Shortest Distance to a Character
difficulty: medium
category: medium
topics: ["array", "string"]
patterns: []
estimated_time_minutes: 30
---
# Shortest Distance to a Character

## Problem

Given a string `s` and a character `c` that appears at least once in `s`, compute the shortest distance from each position in the string to the nearest occurrence of `c`.

Return an integer array where each element represents the minimum distance from that position to any `c` in the string. Distance is measured as the absolute difference between indices: `|i - j|` where `i` is the current position and `j` is any position containing character `c`.

For example, if you have the string `"lovealgoprac"` and character `'e'` (which appears at index 3), position 0 would have distance 3, position 1 would have distance 2, position 3 (where `'e'` is) would have distance 0, and position 5 would have distance 2. If `c` appears multiple times, each position uses the closest occurrence.

The challenge is computing these distances efficiently. A naive approach would scan the entire string for each position to find the nearest `c`, resulting in O(n²) time. However, you can solve this in O(n) time by recognizing that the nearest `c` for any position must be either to the left or to the right. By making two passes through the string (one left-to-right tracking the last seen `c`, and one right-to-left doing the same), you can compute both directions' distances and take the minimum.

## Why This Matters

Distance computation problems appear in various applications: finding the nearest service location in geospatial analysis, calculating edit distances in spell checking, identifying proximity to keywords in text search ranking, and measuring time to nearest event in time series analysis. This specific problem teaches you the two-pass bidirectional scanning technique, which is a powerful pattern for solving range-based queries on linear data structures. The same pattern applies to problems like trapping rainwater, finding the nearest smaller element, and computing visibility ranges. Learning to think bidirectionally helps you optimize many seemingly complex problems into linear time solutions.

## Examples

**Example 1:**
- Input: `s = "lovealgoprac", c = "e"`
- Output: `[3,2,1,0,1,2,3,4,5,6,7,8]`
- Explanation: Character 'e' is located at position 3 using zero-based indexing.
Position 0 finds its nearest 'e' at index 3, yielding distance abs(0 - 3) = 3.
Position 1 finds its nearest 'e' at index 3, yielding distance abs(1 - 3) = 2.
Position 4 finds its nearest 'e' at index 3, yielding distance abs(4 - 3) = 1.
Position 8 finds its nearest 'e' at index 3, yielding distance abs(8 - 3) = 5.

**Example 2:**
- Input: `s = "aaab", c = "b"`
- Output: `[3,2,1,0]`

## Constraints

- 1 <= s.length <= 10⁴
- s[i] and c are lowercase English letters.
- It is guaranteed that c occurs at least once in s.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The distance from any position to the nearest occurrence of character c depends on either the closest occurrence to the left or the closest occurrence to the right. You can track distances from both directions separately.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use two passes through the string: one left-to-right tracking the distance to the last seen target character, and one right-to-left doing the same. At each position, take the minimum of these two distances. Initialize with infinity for positions that haven't encountered the target character yet.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Instead of using infinity, you can initialize with a large number like len(s) since the maximum distance is bounded by the string length. Also, you can combine the two passes by storing intermediate results in the output array itself to save space.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(n) | For each position, scan entire string |
| Optimal (Two Pass) | O(n) | O(n) | Single pass in each direction |

## Common Mistakes

1. **Forgetting to handle edge positions**
   ```python
   # Wrong: Not accounting for positions before first occurrence
   for i in range(len(s)):
       if s[i] == c:
           last_pos = i
       result[i] = i - last_pos  # Crashes if last_pos uninitialized

   # Correct: Initialize with infinity or large value
   last_pos = float('-inf')
   for i in range(len(s)):
       if s[i] == c:
           last_pos = i
       result[i] = i - last_pos if last_pos != float('-inf') else float('inf')
   ```

2. **Not considering both directions**
   ```python
   # Wrong: Only checking left side
   last_pos = -1
   for i in range(len(s)):
       if s[i] == c:
           last_pos = i
       result[i] = abs(i - last_pos) if last_pos >= 0 else len(s)

   # Correct: Check both left and right, take minimum
   # First pass: left to right
   # Second pass: right to left
   # Take minimum at each position
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Nearest matching element in array | Easy | Same concept, different data structure |
| Distance to nearest zero in matrix | Medium | 2D version requires BFS or multi-directional passes |
| K closest elements to target | Medium | Requires sorting or heap-based approach |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Array Processing](../../prerequisites/arrays.md)
