---
id: M304
old_id: A114
slug: palindromic-substrings
title: Palindromic Substrings
difficulty: medium
category: medium
topics: ["string", "dynamic-programming"]
patterns: ["expand-around-center", "dynamic-programming"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E005", "M005", "M516"]
prerequisites: ["E125", "M005"]
---
# Palindromic Substrings

## Problem

Given a string `s`, count how many substrings are palindromes. A palindrome reads the same forwards and backwards (like "aba" or "racecar"), and a substring is any contiguous sequence of characters from the original string.

Important: count each occurrence separately. For instance, in the string "aaa", the substring "a" appears 3 times (at positions 0, 1, and 2), the substring "aa" appears 2 times (positions 0-1 and 1-2), and "aaa" appears once. That's a total of 6 palindromic substrings, even though there are only 2 unique palindromic patterns ("a" and "aa" and "aaa").

Every single character counts as a palindrome by itself. So the string "abc" has exactly 3 palindromic substrings: "a", "b", and "c". None of the longer substrings ("ab", "bc", "abc") are palindromes because they don't read the same backwards.

Note that you need to handle both odd-length palindromes (like "aba" with a single character center) and even-length palindromes (like "abba" with the center between the two 'b's). Missing either case will give you an incorrect count.

## Why This Matters

Palindrome detection is fundamental to string processing and appears in DNA sequence analysis (finding palindromic sequences in genetic code), text compression algorithms, and pattern matching. This problem teaches you the "expand around center" technique, an elegant approach that's more space-efficient than dynamic programming while still running in quadratic time. Understanding how to handle both odd and even length cases builds your ability to think about symmetry in data structures. The technique generalizes to other problems involving radial expansion from center points, and the counting aspect teaches careful enumeration - ensuring you count all instances without double-counting.

## Examples

**Example 1:**
- Input: `s = "abc"`
- Output: `3`
- Explanation: Three palindromic strings: "a", "b", "c".

**Example 2:**
- Input: `s = "aaa"`
- Output: `6`
- Explanation: Six palindromic strings: "a", "a", "a", "aa", "aa", "aaa".

## Constraints

- 1 <= s.length <= 1000
- s consists of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Expand Around Center Technique</summary>

Every palindrome has a center. The center can be:
- A single character (for odd-length palindromes like "aba")
- Between two characters (for even-length palindromes like "abba")

For a string of length n:
- There are n possible centers for odd-length palindromes
- There are n-1 possible centers for even-length palindromes
- Total: 2n-1 centers to check

For each center, expand outward while characters match, counting each palindrome found.

Time complexity: O(n²) - each expansion can go up to n steps.

</details>

<details>
<summary>Hint 2: Implement Expansion Helper Function</summary>

Create a helper function to expand around a center:

```python
def expand_around_center(s, left, right):
    count = 0
    while left >= 0 and right < len(s) and s[left] == s[right]:
        count += 1  # Found a palindrome
        left -= 1
        right += 1
    return count
```

Main algorithm:
```python
count = 0
for i in range(len(s)):
    # Odd-length palindromes (single character center)
    count += expand_around_center(s, i, i)
    # Even-length palindromes (between two characters)
    count += expand_around_center(s, i, i + 1)
```

This approach is intuitive and efficient with O(1) space.

</details>

<details>
<summary>Hint 3: Alternative DP Approach</summary>

You can also use 2D dynamic programming:

Define `dp[i][j]` = True if substring `s[i:j+1]` is a palindrome.

Base cases:
- `dp[i][i] = True` (single characters)
- `dp[i][i+1] = (s[i] == s[i+1])` (two characters)

Recurrence:
- `dp[i][j] = (s[i] == s[j]) and dp[i+1][j-1]`

Count all `dp[i][j]` that are True.

Time: O(n²), Space: O(n²)

The expand-around-center approach is generally preferred for better space complexity, but DP is useful if you need to query specific substrings later.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Expand Around Center | O(n²) | O(1) | Optimal space, recommended |
| Dynamic Programming | O(n²) | O(n²) | Useful if need to cache results |
| Brute Force | O(n³) | O(1) | Check all substrings, too slow |
| Manacher's Algorithm | O(n) | O(n) | Advanced, counts longest palindrome |

**Recommended**: Expand around center for balance of simplicity and efficiency.

## Common Mistakes

1. **Not handling both odd and even length palindromes**
```python
# Wrong: Only checking odd-length palindromes
count = 0
for i in range(len(s)):
    count += expand_around_center(s, i, i)
# Missing even-length palindromes like "aa"

# Correct: Check both cases
count = 0
for i in range(len(s)):
    count += expand_around_center(s, i, i)      # Odd
    count += expand_around_center(s, i, i + 1)  # Even
```

2. **Off-by-one errors in expansion**
```python
# Wrong: Not counting the initial center
def expand_around_center(s, left, right):
    count = 0
    while left >= 0 and right < len(s) and s[left] == s[right]:
        left -= 1
        right += 1
        count += 1  # Wrong position! Counts after moving
    return count

# Correct: Count before moving
def expand_around_center(s, left, right):
    count = 0
    while left >= 0 and right < len(s) and s[left] == s[right]:
        count += 1  # Count first
        left -= 1
        right += 1
    return count
```

3. **DP table initialization errors**
```python
# Wrong: Not initializing single characters
dp = [[False] * n for _ in range(n)]
for length in range(2, n + 1):  # Starts at length 2, missing length 1!
    for i in range(n - length + 1):
        j = i + length - 1
        dp[i][j] = ...

# Correct: Initialize all single characters first
dp = [[False] * n for _ in range(n)]
for i in range(n):
    dp[i][i] = True  # Single characters are palindromes
count = n  # Count all single characters
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Longest Palindromic Substring | Medium | Find the longest palindrome, not count (M005) |
| Palindrome Partitioning | Medium | Partition string into palindromic substrings |
| Longest Palindromic Subsequence | Medium | Non-contiguous characters (M516) |
| Count Distinct Palindromes | Hard | Count unique palindromic substrings |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Implement expand-around-center approach
- [ ] Handle both odd and even length palindromes correctly
- [ ] Test with edge cases (single character, all same, no palindromes except single chars)
- [ ] Implement alternative DP solution for comparison
- [ ] Trace through small example ("aaa") by hand
- [ ] Optimize space if using DP (row-by-row instead of full table)
- [ ] Review after 1 day: Can you recall both approaches?
- [ ] Review after 1 week: Implement without looking at notes
- [ ] Review after 1 month: Solve M005 (Longest Palindromic Substring)

**Strategy**: See [String Patterns](../strategies/patterns/string-manipulation.md)
