---
id: M068
old_id: F161
slug: one-edit-distance
title: One Edit Distance
difficulty: medium
category: medium
topics: ["string", "two-pointers"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E001", "M069", "M070"]
prerequisites: ["string-manipulation", "two-pointers"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# One Edit Distance

## Problem

Given two strings, determine if they are exactly one edit distance apart. An edit distance is one of three operations: insert a character, delete a character, or replace a character. The key word is "exactly" - they must differ by precisely one edit, not zero edits (identical strings return false) and not two or more edits. For example, "ab" and "acb" are one edit apart (insert 'c'), "abc" and "adc" are one edit apart (replace 'b' with 'd'), and "abc" and "ab" are one edit apart (delete 'c'). However, "abc" and "abc" are zero edits apart so return false, and "abc" and "def" are three edits apart so also return false. The string lengths give you a hint about which operation is needed: if lengths are equal, you can only use replacement; if they differ by one, you need insertion or deletion; if they differ by more than one, they can't be one edit apart. You can solve this with a single pass through both strings using two pointers, allowing yourself to "skip" exactly one mismatch, and verifying the rest matches perfectly.

## Why This Matters

One-edit-distance checking powers the "Did you mean?" feature in search engines and spell checkers, suggesting corrections that are one typo away from what users typed. Version control systems use this to identify minimal changes between file revisions, highlighting single-character modifications in diff views. Database fuzzy matching finds near-duplicate records where data entry introduced one-character errors, crucial for customer deduplication and fraud detection. Natural language processing uses edit distance for word suggestion in autocomplete and autocorrect on mobile keyboards. DNA sequence analysis looks for single-nucleotide polymorphisms (SNPs) by comparing sequences that differ by one base pair. Code review tools highlight when variable renames or single-character fixes occurred. The algorithm teaches you to optimize the general edit distance problem (Levenshtein distance) for the special case where you know the distance is at most one, a pattern that appears in many algorithms: specializing general solutions for constrained inputs to achieve better performance.

## Examples

**Example 1:**
- Input: `s = "ab", t = "acb"`
- Output: `true`
- Explanation: We can insert 'c' into s to get t.

**Example 2:**
- Input: `s = "", t = ""`
- Output: `false`
- Explanation: We cannot get t from s by only one step.

## Constraints

- 0 <= s.length, t.length <= 10⁴
- s and t consist of lowercase letters, uppercase letters, and digits.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Length Difference Analysis</summary>

The length difference between the two strings tells you what type of edit is needed. If lengths differ by more than 1, they can't be one edit apart. Consider what each length difference means: equal lengths suggest replacement, difference of 1 suggests insertion or deletion.

</details>

<details>
<summary>🎯 Hint 2: Single Pass Strategy</summary>

You can solve this with a single pass through both strings simultaneously. Use two pointers to track positions in each string. When you find a mismatch, the way you handle it depends on the length difference. The key insight is that you should only encounter one difference.

</details>

<details>
<summary>📝 Hint 3: Case Analysis</summary>

Break into three cases:
1. Same length: check if exactly one character differs (replacement)
2. s is longer by 1: skip one character in s, rest must match (delete from s)
3. t is longer by 1: skip one character in t, rest must match (insert into s)

Track whether you've already used your one allowed edit.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Edit Distance DP) | O(m*n) | O(m*n) | Overkill - computes all edit distances |
| **Optimal (Two Pointers)** | **O(min(m,n))** | **O(1)** | Single pass, constant space |

## Common Mistakes

### 1. Using Full Edit Distance Algorithm

```python
# WRONG: Unnecessarily complex - uses full DP table
def isOneEditDistance(s, t):
    m, n = len(s), len(t)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    # ... full edit distance computation
    return dp[m][n] == 1  # Overkill!

# CORRECT: Simple two-pointer approach
def isOneEditDistance(s, t):
    if abs(len(s) - len(t)) > 1:
        return False
    # Single pass with mismatch tracking
```

### 2. Forgetting Edge Cases

```python
# WRONG: Doesn't handle equal strings
def isOneEditDistance(s, t):
    if len(s) == len(t):
        return sum(c1 != c2 for c1, c2 in zip(s, t)) == 1

# CORRECT: Explicitly reject equal strings
def isOneEditDistance(s, t):
    if s == t:  # Must be EXACTLY one edit apart
        return False
    # ... rest of logic
```

### 3. Not Handling Length Difference Properly

```python
# WRONG: Assumes s is always shorter
def isOneEditDistance(s, t):
    if len(s) > len(t):
        # Missing swap logic
        pass

# CORRECT: Ensure s is shorter or equal
def isOneEditDistance(s, t):
    if len(s) > len(t):
        return isOneEditDistance(t, s)  # Swap
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| K Edit Distance | Allow up to k edits | Use full DP or BFS with edit count |
| Return Edit Type | Return which edit (insert/delete/replace) | Track and return the operation type |
| Multiple Edit Sequences | Count all possible one-edit pairs | Generate all one-edit variations |
| Case Insensitive | Ignore case differences | Normalize strings before comparison |

## Practice Checklist

- [ ] Handles empty/edge cases (empty strings, equal strings)
- [ ] Can explain approach in 2 min (length check + two pointers)
- [ ] Can code solution in 15 min
- [ ] Can discuss time/space complexity (O(n) time, O(1) space)
- [ ] Handles all three edit types (insert, delete, replace)

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Two Pointers Pattern](../../strategies/patterns/two-pointers.md)
