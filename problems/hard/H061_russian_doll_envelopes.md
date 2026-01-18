---
id: H061
old_id: I153
slug: russian-doll-envelopes
title: Russian Doll Envelopes
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Russian Doll Envelopes

## Problem

You have a collection of envelopes represented as a 2D array `envelopes` where each `envelopes[i] = [wi, hi]` contains the width and height dimensions.

An envelope can be nested inside another envelope only when both its width and height are strictly smaller than the outer envelope's corresponding dimensions.

Determine *the longest chain of envelopes that can be nested inside each other (Russian doll style)*.

**Note:** Envelopes must be used in their given orientation and cannot be rotated.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `envelopes = [[5,4],[6,4],[6,7],[2,3]]`
- Output: `3`
- Explanation: You can nest up to `3` envelopes: start with [2,3], place it in [5,4], then place that in [6,7].

**Example 2:**
- Input: `envelopes = [[1,1],[1,1],[1,1]]`
- Output: `1`
- Explanation: All envelopes are identical, so no nesting is possible.

## Constraints

- 1 <= envelopes.length <= 10⁵
- envelopes[i].length == 2
- 1 <= wi, hi <= 10⁵

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a 2D extension of the Longest Increasing Subsequence (LIS) problem. After sorting envelopes by width, you need to find the longest increasing subsequence based on height. However, when widths are equal, you must sort heights in descending order to prevent treating same-width envelopes as nestable.
</details>

<details>
<summary>🎯 Main Approach</summary>
Sort envelopes by width ascending, but when widths are equal, sort by height descending. Then apply the classic LIS algorithm on the heights using binary search with patience sorting. This works because the descending height order ensures that envelopes with equal width cannot be selected consecutively in the LIS.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use binary search to maintain a "tails" array where tails[i] represents the smallest height that can end an increasing subsequence of length i+1. This optimizes from O(n²) dynamic programming to O(n log n). The bisect_left function helps find the position to update in the tails array.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force DP | O(n²) | O(n) | Check all pairs for nesting relationship |
| Optimal (Binary Search + LIS) | O(n log n) | O(n) | Sort once, then apply efficient LIS with binary search |

## Common Mistakes

1. **Sorting heights in wrong order when widths are equal**
   ```python
   # Wrong: sorting heights ascending when widths are equal
   envelopes.sort(key=lambda x: (x[0], x[1]))
   # This incorrectly allows envelopes with same width to nest

   # Correct: sort heights descending when widths are equal
   envelopes.sort(key=lambda x: (x[0], -x[1]))
   # Prevents same-width envelopes from being consecutive in LIS
   ```

2. **Checking both dimensions in LIS**
   ```python
   # Wrong: comparing both width and height during LIS
   if envelopes[i][0] > tails[-1][0] and envelopes[i][1] > tails[-1][1]:
       tails.append(envelopes[i])

   # Correct: only compare heights after proper sorting
   heights = [h for w, h in envelopes]
   # Then run LIS on heights array only
   ```

3. **Not handling duplicate envelopes**
   ```python
   # Wrong: assuming all envelopes are unique
   # If [[3,3],[3,3]] exists, result should be 1, not 2

   # Correct: the descending height sort handles this
   # Both [3,3] will be adjacent but won't form increasing sequence
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Longest Increasing Subsequence | Medium | 1D version, direct LIS application |
| Box Stacking | Hard | 3D version with rotation allowed |
| Maximum Height by Stacking Cuboids | Hard | 3D with all dimension orderings considered |
| Largest Divisible Subset | Medium | Similar DP pattern but with divisibility |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
