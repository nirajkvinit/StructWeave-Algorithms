---
id: M533
old_id: A422
slug: delete-columns-to-make-sorted-ii
title: Delete Columns to Make Sorted II
difficulty: medium
category: medium
topics: ["array", "string"]
patterns: []
estimated_time_minutes: 30
---
# Delete Columns to Make Sorted II

## Problem

Imagine you have a spreadsheet where you need to delete certain columns to ensure the rows appear in alphabetical order when read left to right. The challenge is to remove as few columns as possible.

You have an array of `n` strings `strs`, all with identical length. Each string represents a row in a table, and each character position represents a column.

You can select column indices to delete, removing characters at those positions from every string. For example, with `strs = ["abcdef","uvwxyz"]` and deletion indices `{0, 2, 3}`, the result is `["bef", "vyz"]`.

Your goal is to find the minimum number of columns to delete such that the resulting strings are in **lexicographic order** (i.e., `strs[0] <= strs[1] <= strs[2] <= ... <= strs[n - 1]`).

For instance:
- With `["ca", "bb", "ac"]`, deleting column 0 gives `["a", "b", "c"]`, which is sorted (minimum 1 deletion)
- With `["xc", "yb", "za"]`, the strings are already in order row-wise, so no deletions needed

Return *the minimum number of deletions required*.

## Why This Matters

Column deletion to maintain sorted order mirrors real-world data cleaning tasks. Consider a database export where you need to remove corrupted columns while preserving data integrity, or a spreadsheet where certain fields cause sorting conflicts. This problem teaches greedy optimization and state tracking - the key insight is that once two rows are "sorted" relative to each other by an earlier column, you can ignore their relationship in future columns. This concept appears in data validation, ETL pipelines, and maintaining sorted invariants in distributed systems.

## Examples

**Example 1:**
- Input: `strs = ["ca","bb","ac"]`
- Output: `1`
- Explanation: Deleting column 0 yields ["a", "b", "c"], which is lexicographically sorted. At least 1 deletion is needed.

**Example 2:**
- Input: `strs = ["xc","yb","za"]`
- Output: `0`
- Explanation: The strings are already in lexicographic order row-wise. No deletions needed. Note that individual rows don't need to be sorted internally.

**Example 3:**
- Input: `strs = ["zyx","wvu","tsr"]`
- Output: `3`
- Explanation: All columns must be deleted.

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
Process columns left to right. Track which row pairs are already "sorted" (row i < row j due to previous columns). For unsorted pairs, check if the current column maintains or violates the ordering. If it violates, delete the column.
</details>

<details>
<summary>Main Approach</summary>
Use a greedy column-by-column approach. Maintain a set of "unsorted" row pairs that need the current or future columns to determine their order. For each column, check if any unsorted pair has strs[i][col] > strs[j][col] (violation). If yes, delete the column. Otherwise, keep it and update the unsorted set: remove pairs where strs[i][col] < strs[j][col] (now sorted).
</details>

<details>
<summary>Optimization Tip</summary>
Instead of tracking all n*(n-1)/2 pairs, only track consecutive pairs initially. Once a consecutive pair is sorted by some column, all pairs spanning it are also sorted. This reduces the pairs we need to track from O(n²) to O(n).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n² × m) | O(n²) | Check all pairs for each column |
| Optimal (Track Unsorted Pairs) | O(n × m) | O(n) | Only track consecutive unsorted pairs |

## Common Mistakes

1. **Not tracking which pairs are already sorted**
   ```python
   # Wrong: Rechecking all pairs every column
   for col in range(len(strs[0])):
       for i in range(len(strs) - 1):
           if strs[i][col] > strs[i+1][col]:
               deletions += 1
               break

   # Correct: Track and update sorted pairs
   unsorted = set(range(len(strs) - 1))
   for col in range(len(strs[0])):
       delete = False
       for i in unsorted:
           if strs[i][col] > strs[i+1][col]:
               delete = True
               break
       if not delete:
           unsorted = {i for i in unsorted
                      if strs[i][col] == strs[i+1][col]}
   ```

2. **Incorrect update of unsorted set**
   ```python
   # Wrong: Not removing pairs that are now sorted
   if strs[i][col] < strs[i+1][col]:
       # Should remove from unsorted but forgot
       pass

   # Correct: Update unsorted to only include equal pairs
   new_unsorted = set()
   for i in unsorted:
       if strs[i][col] == strs[i+1][col]:
           new_unsorted.add(i)
   unsorted = new_unsorted
   ```

3. **Early termination when unsorted is empty**
   ```python
   # Wrong: Continuing even when all pairs are sorted
   # Wastes time checking remaining columns

   # Correct: Early exit when all sorted
   if not unsorted:
       return deletions  # No need to check more columns
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Delete Columns to Make Sorted I | Easy | Delete if any column is unsorted, simpler |
| Delete Columns to Make Sorted III | Hard | Minimize deletions using DP, non-greedy |
| Minimum Deletions to Make String Balanced | Medium | Similar greedy tracking concept |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
