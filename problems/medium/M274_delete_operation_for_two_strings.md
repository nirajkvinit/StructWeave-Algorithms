---
id: M274
old_id: A071
slug: delete-operation-for-two-strings
title: Delete Operation for Two Strings
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["M072", "M583", "M712"]
prerequisites: ["dynamic-programming", "lcs", "string-manipulation"]
---
# Delete Operation for Two Strings

## Problem

Given two strings word1 and word2, find the minimum number of character deletions needed to make both strings identical. You can delete characters from either string, one at a time, until both strings become the same.

For example, given "sea" and "eat", you could delete 's' from "sea" to get "ea", then delete 't' from "eat" to also get "ea". That's 2 deletions total. The key insight is that the characters you keep (not delete) must appear in the same order in both strings. In this example, you're keeping "ea" which appears in that order in both original strings.

This problem is fundamentally about finding the longest common subsequence (LCS) between the two strings. A subsequence maintains relative order but doesn't require characters to be consecutive. Once you know the longest sequence of characters that appear in both strings in the same order, you know which characters to keep. Everything else must be deleted.

The minimum deletions equals (length of word1 - LCS length) plus (length of word2 - LCS length), because you delete all characters not in the LCS from both strings. Note that this is different from edit distance, which allows insertions and replacements. Here, you can only delete.


## Why This Matters

This problem introduces you to the Longest Common Subsequence pattern, one of the most fundamental dynamic programming algorithms. LCS appears in diff tools (comparing file versions), DNA sequence alignment in bioinformatics, version control systems, and plagiarism detection. Understanding LCS gives you a template for solving a whole class of string comparison problems.

The technique of transforming "minimize operations to make equal" into "maximize common elements" is a powerful problem-solving pattern. This same thinking applies to string distance metrics, sequence alignment, and optimization problems where you want to preserve as much commonality as possible while changing the rest.

## Examples

**Example 1:**
- Input: `word1 = "sea", word2 = "eat"`
- Output: `2`
- Explanation: Delete 's' from "sea" to get "ea", then delete 't' from "eat" to get "ea".

**Example 2:**
- Input: `word1 = "algoprac", word2 = "etco"`
- Output: `4`

## Constraints

- 1 <= word1.length, word2.length <= 500
- word1 and word2 consist of only lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Relationship to Longest Common Subsequence (LCS)</summary>

The key insight: If you find the longest common subsequence between the two strings, the characters NOT in the LCS are the ones you need to delete.

Example: `word1 = "sea"`, `word2 = "eat"`
- LCS = "ea" (length 2)
- Characters to delete from word1: "s" (1 character)
- Characters to delete from word2: "t" (1 character)
- Total deletions: `(3 - 2) + (3 - 2) = 2`

Formula: `deletions = (len(word1) - lcs_length) + (len(word2) - lcs_length)`

Or simplified: `deletions = len(word1) + len(word2) - 2 * lcs_length`
</details>

<details>
<summary>Hint 2: Finding LCS with Dynamic Programming</summary>

The LCS problem is solved using a 2D DP table where `dp[i][j]` represents the length of LCS for `word1[0...i-1]` and `word2[0...j-1]`.

Recurrence relation:
```
If word1[i-1] == word2[j-1]:
    dp[i][j] = dp[i-1][j-1] + 1
Else:
    dp[i][j] = max(dp[i-1][j], dp[i][j-1])
```

Base case: `dp[0][j] = 0` and `dp[i][0] = 0` (empty string has LCS of 0 with anything)
</details>

<details>
<summary>Hint 3: Complete Solution Strategy</summary>

**Approach 1: Via LCS**
```python
def minDistance(word1, word2):
    m, n = len(word1), len(word2)

    # Build LCS DP table
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i-1] == word2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])

    lcs_length = dp[m][n]
    return m + n - 2 * lcs_length
```

**Approach 2: Direct DP (without computing LCS explicitly)**
Define `dp[i][j]` as minimum deletions needed to make `word1[0...i-1]` and `word2[0...j-1]` equal.

```python
def minDistance(word1, word2):
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    # Base cases
    for i in range(m + 1):
        dp[i][0] = i  # Delete all characters from word1
    for j in range(n + 1):
        dp[0][j] = j  # Delete all characters from word2

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i-1] == word2[j-1]:
                dp[i][j] = dp[i-1][j-1]  # No deletion needed
            else:
                dp[i][j] = min(dp[i-1][j] + 1,    # Delete from word1
                               dp[i][j-1] + 1)     # Delete from word2

    return dp[m][n]
```

Both approaches are O(m × n) time and space.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| LCS-based DP | O(m × n) | O(m × n) | Compute LCS then calculate deletions |
| Direct DP | O(m × n) | O(m × n) | Count deletions directly |
| Space-Optimized DP | O(m × n) | O(min(m, n)) | Use rolling array, only keep 2 rows |

## Common Mistakes

### Mistake 1: Confusing with Edit Distance
```python
# WRONG: Using Edit Distance logic (allows insert/replace/delete)
def minDistance(word1, word2):
    # Edit distance allows 3 operations, but we only have DELETE
    # Don't use the full edit distance formula!

    # This problem is simpler: ONLY deletions allowed
    # Edit distance: min(delete, insert, replace)
    # This problem: only delete from word1 OR delete from word2
```
**Why it's wrong:** Edit Distance (Levenshtein) allows insertion, deletion, and substitution. This problem ONLY allows deletion, which is a simpler constraint.

### Mistake 2: Incorrect base case in direct DP
```python
# WRONG: Not initializing base cases properly
def minDistance(word1, word2):
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    # Missing initialization!
    # dp[i][0] should be i (delete all i characters from word1)
    # dp[0][j] should be j (delete all j characters from word2)

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            # ... logic ...
```
**Why it's wrong:** Without proper base cases, the DP table builds incorrect values. When one string is empty, you must delete all characters from the other string.

### Mistake 3: Off-by-one indexing error
```python
# WRONG: Incorrect index mapping between dp table and strings
def minDistance(word1, word2):
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            # WRONG: comparing dp indices instead of string indices
            if word1[i] == word2[j]:  # Should be word1[i-1] == word2[j-1]
                dp[i][j] = dp[i-1][j-1]
```
**Why it's wrong:** The DP table has dimensions `(m+1) × (n+1)` to include the empty string case. When accessing the strings, use `word1[i-1]` and `word2[j-1]`, not `word1[i]` and `word2[j]`.

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Longest Common Subsequence | Medium | Core subproblem of this task |
| Edit Distance | Medium | Allows insert, delete, replace operations |
| Minimum ASCII Delete Sum | Medium | Minimize sum of ASCII values deleted |
| Uncrossed Lines | Medium | LCS variant with different problem framing |

## Practice Checklist

- [ ] Solve using LCS approach (Day 1)
- [ ] Implement direct DP solution (Day 2)
- [ ] Optimize space complexity (Day 3)
- [ ] Compare with Edit Distance problem (Day 3)
- [ ] Review after 1 week (Day 8)
- [ ] Review after 2 weeks (Day 15)
- [ ] Solve without looking at hints (Day 30)
