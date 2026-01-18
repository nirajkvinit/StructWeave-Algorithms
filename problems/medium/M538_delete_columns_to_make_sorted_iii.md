---
id: M538
old_id: A427
slug: delete-columns-to-make-sorted-iii
title: Delete Columns to Make Sorted III
difficulty: medium
category: medium
topics: ["array", "string"]
patterns: []
estimated_time_minutes: 30
---
# Delete Columns to Make Sorted III

## Problem

Imagine you have a spreadsheet where each row is a jumbled word, and you need to delete certain columns (letter positions) to make each word's remaining letters appear in alphabetical order. What's the minimum number of columns you need to remove?

You have an array of `n` strings `strs`, all with the same length. Each string represents a row.

You can choose column indices to delete, removing the character at each selected position from all strings. For example, with `strs = ["abcdef","uvwxyz"]` and deletion indices `{0, 2, 3}`, the result is `["bef", "vyz"]`.

Your goal is to find the minimum number of columns to delete so that each remaining string is sorted in non-decreasing lexicographic order. That is, for each string `strs[i]`, we need `strs[i][0] <= strs[i][1] <= ... <= strs[i][remaining_length - 1]`.

For example:
- With `["babca", "bbazb"]`, deleting columns 0, 1, and 4 gives `["bc", "az"]`
- Now each row is sorted: 'b' <= 'c' and 'a' <= 'z'
- Note: rows don't need to be sorted relative to each other, just internally

Return *the minimum number of deletions needed*.

## Why This Matters

This problem models text cleanup and pattern extraction scenarios. Consider redacting sensitive information from documents while maintaining readability (keeping letters in order), DNA sequence analysis where you extract subsequences that follow certain ordering properties, or log file processing where you filter timestamps while preserving chronological order within each entry. The problem teaches dynamic programming on sequences and the "longest increasing subsequence" pattern applied to a multi-string context. This technique appears in version control systems (finding common ordered subsequences between file versions) and data compression (identifying ordered patterns to preserve).

## Examples

**Example 1:**
- Input: `strs = ["babca","bbazb"]`
- Output: `3`
- Explanation: Deleting columns 0, 1, and 4 produces ["bc", "az"]. Each row is now sorted internally (strs[0][0] <= strs[0][1] and strs[1][0] <= strs[1][1]). Note that rows don't need to be sorted relative to each other.

**Example 2:**
- Input: `strs = ["edcba"]`
- Output: `4`
- Explanation: Deleting fewer than 4 columns leaves the row unsorted.

**Example 3:**
- Input: `strs = ["ghi","def","abc"]`
- Output: `0`
- Explanation: Each row is already sorted internally.

## Constraints

- n == strs.length
- 1 <= n <= 100
- 1 <= strs[i].length <= 100
- strs[i] consists of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is essentially finding the longest increasing subsequence of columns where "increasing" means each row remains sorted. Instead of deleting columns, think about finding the maximum number of columns to keep such that each row is sorted after keeping only those columns.
</details>

<details>
<summary>Main Approach</summary>
Use dynamic programming where dp[i] represents the maximum number of columns we can keep ending at column i. For each column i, check all previous columns j < i. If keeping columns j and i together maintains sorted order in all rows (strs[row][j] <= strs[row][i] for all rows), then dp[i] = max(dp[i], dp[j] + 1). The answer is total columns minus the maximum dp value.
</details>

<details>
<summary>Optimization Tip</summary>
When checking if two columns can be kept together, you need to verify that for every row, the character in column j is less than or equal to the character in column i. Early termination when finding a violation can save comparisons. The key optimization is recognizing this as a longest increasing subsequence variant.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(2^m × n × m) | O(1) | Try all deletion subsets, m = string length |
| Dynamic Programming | O(m² × n) | O(m) | Check all column pairs, validate across n rows |
| Optimal | O(m² × n) | O(m) | DP with column pair validation |

## Common Mistakes

1. **Confusing row sorting with column sorting**
   ```python
   # Wrong: Checking if columns are sorted vertically
   for j in range(len(strs)):
       if strs[j][i] > strs[j][i+1]:  # Wrong comparison
           delete_count += 1

   # Correct: Each row must be sorted horizontally
   for row in strs:
       if row[j] > row[i]:  # Can't keep both j and i
           break
   ```

2. **Not validating all rows when pairing columns**
   ```python
   # Wrong: Only checking first row
   if strs[0][j] <= strs[0][i]:
       dp[i] = max(dp[i], dp[j] + 1)

   # Correct: All rows must satisfy the condition
   valid = True
   for row in strs:
       if row[j] > row[i]:
           valid = False
           break
   if valid:
       dp[i] = max(dp[i], dp[j] + 1)
   ```

3. **Returning kept columns instead of deleted columns**
   ```python
   # Wrong: Returning maximum columns kept
   return max(dp)

   # Correct: Return columns deleted
   return len(strs[0]) - max(dp)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Delete Columns to Make Sorted (I) | Easy | Simple column-wise check, no row sorting requirement |
| Delete Columns to Make Sorted II | Medium | Greedy approach with lexicographic ordering between rows |
| Longest Increasing Subsequence | Medium | Classic DP pattern this problem is based on |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
