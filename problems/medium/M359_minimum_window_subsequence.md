---
id: M359
old_id: A194
slug: minimum-window-subsequence
title: Minimum Window Subsequence
difficulty: medium
category: medium
topics: ["string"]
patterns: ["sliding-window-variable"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M003", "M438", "M567"]
prerequisites: ["two-pointers", "string-matching"]
---
# Minimum Window Subsequence

## Problem

Given two strings `s1` and `s2`, find the shortest contiguous substring of `s1` that contains `s2` as a subsequence. Return this minimum window substring.

Let's clarify what "subsequence" means here: characters from `s2` must appear in the same order within your chosen substring of `s1`, but they don't need to be consecutive. For example, "bde" is a subsequence of "abcde" because 'b', 'd', and 'e' appear in that order, even though they're not adjacent.

The challenge is finding the **shortest** window in `s1` that contains all characters of `s2` in order. For instance, if `s1 = "abcdebdde"` and `s2 = "bde"`, there are multiple substrings of `s1` containing `s2` as a subsequence:
- "abcde" (length 5) - contains b, d, e in order
- "bcde" (length 4) - contains b, d, e in order (shorter!)
- "bdde" (length 4) - contains b, d, e in order
- "bdebdde" (length 7) - contains b, d, e in order (longer)

The answer is "bcde" because it's one of the shortest windows (length 4) and appears first in `s1`.

If no substring of `s1` contains `s2` as a subsequence, return an empty string `""`. When multiple windows have the same minimum length, return the leftmost one.

This differs from "minimum window substring" problems where all characters must appear (in any order). Here, the order matters, but characters can be spread out within the window. The naive approach would check every possible substring of `s1`, but with lengths up to 20,000, you need a more efficient strategy using two pointers or dynamic programming.

## Why This Matters

This problem models pattern matching in scenarios where exact position doesn't matter, only relative order—similar to fuzzy searching in text editors, DNA sequence alignment in bioinformatics, and log analysis where you're looking for events in a specific order within a time window. The two-pointer "expand and shrink" technique you learn here is essential for sliding window problems, which appear in stream processing, network packet analysis, and time-series data mining. Understanding the difference between "substring" (contiguous) and "subsequence" (ordered but non-contiguous) is fundamental to many string algorithms.

## Examples

**Example 1:**
- Input: `s1 = "abcdebdde", s2 = "bde"`
- Output: `"bcde"`
- Explanation: The substring "bcde" contains 'b', 'd', 'e' in order and appears before "bdde" (which has equal length). Note that "deb" doesn't work since the characters must appear in the required sequence.

**Example 2:**
- Input: `s1 = "jmeqksfrsdcmsiwvaovztaqenprpvnbstl", s2 = "u"`
- Output: `""`

## Constraints

- 1 <= s1.length <= 2 * 10⁴
- 1 <= s2.length <= 100
- s1 and s2 consist of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Two-Pointer Forward Scan</summary>

Use two pointers to scan `s1`:
1. Find a window where `s2` appears as a subsequence by matching all characters of `s2` in order
2. Once you find a valid window (matched all characters of `s2`), record its end position
3. This gives you a candidate window, but it might not be minimal

The key insight: after finding a valid window, you need to shrink it from the left to find the minimum window.

</details>

<details>
<summary>Hint 2: Backward Optimization</summary>

After finding a valid window ending at position `j`:
1. Move backward from `j` while trying to match `s2` in reverse order
2. This finds the latest starting position that still contains `s2` as a subsequence
3. The window from this starting position to `j` is the minimal window ending at `j`

Then continue searching for more windows by advancing the forward pointer.

</details>

<details>
<summary>Hint 3: Dynamic Programming Alternative</summary>

Create a DP table where `dp[i][j]` represents:
- The starting index of the minimum window in `s1[0...i]` that contains `s2[0...j]` as a subsequence
- Or -1 if no such window exists

Recurrence:
- If `s1[i] == s2[j]`: `dp[i][j] = dp[i-1][j-1]` (extend previous match)
- If `s1[i] != s2[j]`: `dp[i][j] = dp[i-1][j]` (carry forward)

Track the minimum window length throughout.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Two-pointer (forward + backward) | O(m * n) | O(1) | For each character in s1, may scan s2; worst case is when many matches exist |
| Dynamic Programming | O(m * n) | O(m * n) | DP table of size m × n where m = len(s1), n = len(s2) |
| Optimized DP | O(m * n) | O(n) | Use rolling array since only previous row needed |

Where m is the length of s1 and n is the length of s2.

## Common Mistakes

**Mistake 1: Not shrinking the window**
```python
# Wrong - finds first valid window but doesn't minimize it
i, j = 0, 0
for i in range(len(s1)):
    if s1[i] == s2[j]:
        j += 1
        if j == len(s2):
            return s1[start:i+1]  # Not minimal!

# Correct - shrink from the left after finding valid window
# After matching all of s2, go backward to find minimal start
```

**Mistake 2: Confusing substring with subsequence**
```python
# Wrong - looking for substring (consecutive characters)
if s2 in s1:
    return s2  # This is substring matching, not subsequence

# Correct - match characters in order but not necessarily consecutive
# Must check if s2 appears as subsequence within each window
```

**Mistake 3: Incorrect window comparison**
```python
# Wrong - updates result even when window is longer
if j == len(s2):
    result = s1[start:end+1]  # Always updates

# Correct - only update if window is smaller
if j == len(s2):
    if end - start + 1 < min_len:
        min_len = end - start + 1
        result = s1[start:end+1]
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| Minimum Window Substring | All characters must appear (not as subsequence) | Hard |
| Longest Repeating Character Replacement | Find longest substring with at most k replacements | Medium |
| Substring with Concatenation | Match concatenated words instead of subsequence | Hard |
| Is Subsequence | Just check if s2 is subsequence of s1 (yes/no) | Easy |

## Practice Checklist

- [ ] Solve with two-pointer approach (forward + backward scan)
- [ ] Test with edge cases: s2 not in s1, s2 longer than s1
- [ ] Implement DP solution for comparison
- [ ] Test with multiple valid windows of same length
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Optimize space complexity in DP approach
- [ ] Handle case where s2 appears at multiple positions
- [ ] Explain the difference between substring and subsequence
