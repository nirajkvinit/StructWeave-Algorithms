---
id: M347
old_id: A179
slug: minimum-ascii-delete-sum-for-two-strings
title: Minimum ASCII Delete Sum for Two Strings
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems:
  - M072_edit_distance.md
  - M145_longest_common_subsequence.md
  - M228_delete_operation_for_two_strings.md
prerequisites:
  - dynamic-programming
  - string-manipulation
  - longest-common-subsequence
---
# Minimum ASCII Delete Sum for Two Strings

## Problem

Given two strings `s1` and `s2`, find the minimum total ASCII value of characters you need to delete from both strings to make them equal.

This is a variant of the classic string similarity problem, but instead of counting the number of deletions, you're minimizing the cost based on ASCII values. Different characters have different deletion costs. For instance, deleting 'z' (ASCII 122) costs more than deleting 'a' (ASCII 97).

Your goal is to find which characters to keep and which to delete from each string so that both strings become identical, while minimizing the sum of ASCII values of all deleted characters. You can only delete characters, not insert or substitute them.

For example, with `s1 = "sea"` and `s2 = "eat"`, you could make them equal by:
- Deleting 's' from "sea" (cost 115) and 't' from "eat" (cost 116), leaving "ea" in both, total cost 231
- Or deleting 'e', 'a' from "sea" and 'e', 'a', 't' from "eat", leaving "s" vs "", but this would cost more

The problem requires dynamic programming. Think of it as finding the maximum ASCII sum of common characters you can keep (the longest common subsequence weighted by ASCII values), then deleting everything else.

## Why This Matters

This problem extends the classic longest common subsequence algorithm, which is foundational in computational biology for DNA sequence alignment, plagiarism detection systems, and version control diff algorithms. Adding weighted costs (ASCII values) teaches you how real-world problems often involve optimizing multiple objectives, not just minimizing count. This pattern appears in text similarity scoring, spell checkers that suggest corrections based on keyboard proximity costs, and data reconciliation systems that minimize the cost of transforming one dataset to match another.

## Examples

**Example 1:**
- Input: `s1 = "sea", s2 = "eat"`
- Output: `231`
- Explanation: Removing "s" from "sea" contributes ASCII value 115 to the total.
Removing "t" from "eat" contributes ASCII value 116 to the total.
Both strings become equal after these deletions, with a minimum total of 115 + 116 = 231.

**Example 2:**
- Input: `s1 = "delete", s2 = "leet"`
- Output: `403`
- Explanation: Removing "dee" from "delete" transforms it to "let",
contributing 100[d] + 101[e] + 101[e] to the sum.
Removing "e" from "leet" adds 101[e] to the sum.
Both strings become "let" with a total deletion cost of 100+101+101+101 = 403.
Alternative target strings like "lee" or "eet" would result in higher costs of 433 or 417 respectively.

## Constraints

- 1 <= s1.length, s2.length <= 1000
- s1 and s2 consist of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Relationship to Longest Common Subsequence</summary>

This problem is related to finding the Longest Common Subsequence (LCS):
- Characters in the LCS don't need to be deleted
- All other characters must be deleted

The optimal strategy: maximize the ASCII sum of the common subsequence (keep expensive characters), which minimizes deletion cost.

Key insight: Instead of finding LCS by length, find the maximum ASCII sum of common characters.

Total deletion cost = (sum of all ASCII in s1) + (sum of all ASCII in s2) - 2 × (max ASCII sum of common subsequence)
</details>

<details>
<summary>Hint 2: Dynamic Programming State Definition</summary>

Define `dp[i][j]` = maximum ASCII sum of common subsequence between s1[0...i-1] and s2[0...j-1]

Recurrence relation:
```
if s1[i-1] == s2[j-1]:
    dp[i][j] = dp[i-1][j-1] + ord(s1[i-1])  # Include this character
else:
    dp[i][j] = max(dp[i-1][j], dp[i][j-1])  # Skip from either string
```

Base cases:
- `dp[0][j] = 0` (no characters from s1)
- `dp[i][0] = 0` (no characters from s2)

Final answer: `sum(ord(c) for c in s1) + sum(ord(c) for c in s2) - 2 * dp[m][n]`
</details>

<details>
<summary>Hint 3: Alternative Direct DP Formulation</summary>

You can also define `dp[i][j]` directly as the minimum deletion cost to make s1[0...i-1] equal to s2[0...j-1]:

```
if s1[i-1] == s2[j-1]:
    dp[i][j] = dp[i-1][j-1]  # No deletion needed for matching chars
else:
    # Delete from s1 or s2, choose minimum
    dp[i][j] = min(dp[i-1][j] + ord(s1[i-1]),  # Delete from s1
                   dp[i][j-1] + ord(s2[j-1]))   # Delete from s2
```

Base cases:
- `dp[0][j] = sum(ord(s2[k]) for k in range(j))` (delete all of s2[0...j-1])
- `dp[i][0] = sum(ord(s1[k]) for k in range(i))` (delete all of s1[0...i-1])

This approach is more intuitive but equivalent.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| 2D DP (LCS variant) | O(m × n) | O(m × n) | m = len(s1), n = len(s2) |
| 2D DP (direct deletion cost) | O(m × n) | O(m × n) | Same complexity, different formulation |
| Space-Optimized DP | O(m × n) | O(min(m, n)) | Use rolling array, keep only previous row |
| Memoized Recursion | O(m × n) | O(m × n) | Recursive with cache |

## Common Mistakes

### Mistake 1: Confusing with Edit Distance
```python
# DON'T: Use edit distance logic without considering ASCII values
def minimumDeleteSum(s1: str, s2: str) -> int:
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        dp[i][0] = i  # Problem: should be ASCII sum, not count!

    for j in range(1, n + 1):
        dp[0][j] = j  # Problem: should be ASCII sum, not count!

    # ... rest of logic
# Problem: Treats all deletions equally instead of using ASCII values
```

**Why it's wrong:** This counts deletions instead of summing ASCII values. Character 'z' costs more to delete than 'a'.

**Fix:** Use `dp[i][0] = dp[i-1][0] + ord(s1[i-1])` for base cases.

### Mistake 2: Incorrect DP Transition
```python
# DON'T: Forget to choose minimum cost
def minimumDeleteSum(s1: str, s2: str) -> int:
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    # ... correct base cases

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                # Problem: doesn't take minimum of two deletion options
                dp[i][j] = dp[i-1][j] + ord(s1[i-1])
# Problem: Only considers deleting from s1, not s2
```

**Why it's wrong:** When characters don't match, you should choose the cheaper deletion: either delete from s1 or s2.

**Fix:** Use `dp[i][j] = min(dp[i-1][j] + ord(s1[i-1]), dp[i][j-1] + ord(s2[j-1]))`.

### Mistake 3: Wrong LCS to Deletion Cost Conversion
```python
# DON'T: Subtract LCS incorrectly
def minimumDeleteSum(s1: str, s2: str) -> int:
    # ... compute max_lcs_sum correctly

    # Problem: subtracts only once instead of twice
    total = sum(ord(c) for c in s1) + sum(ord(c) for c in s2)
    return total - max_lcs_sum  # Wrong: should be - 2 * max_lcs_sum
# Problem: Common characters counted in both strings, must subtract twice
```

**Why it's wrong:** Characters in the common subsequence appear in both strings' totals, so they must be subtracted twice.

**Fix:** Use `total - 2 * max_lcs_sum`.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Edit Distance | Minimum operations (insert/delete/replace) to transform s1 to s2 | Medium |
| Delete Operation for Two Strings | Minimum deletions (unweighted) to make strings equal | Medium |
| Minimum ASCII Delete for K Strings | Extend to k strings instead of 2 | Hard |
| Maximum ASCII Common Subsequence | Find common subsequence with maximum ASCII sum | Medium |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Understood relationship to LCS
- [ ] Implemented both DP formulations (LCS-based and direct)
- [ ] Optimized space to O(min(m,n))
- [ ] Tested edge cases: empty string, identical strings, no common characters
- [ ] Analyzed time/space complexity
- [ ] **Day 1-3:** Revisit and implement without reference
- [ ] **Week 1:** Solve standard LCS and edit distance problems
- [ ] **Week 2:** Study sequence alignment algorithms (Needleman-Wunsch)

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
